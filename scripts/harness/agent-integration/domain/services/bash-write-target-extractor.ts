/**
 * @layer domain
 * @unit agent-integration
 *
 * BashWriteTargetExtractor ドメインサービス
 *
 * Bash コマンド文字列を静的解析し、書き込み対象となるファイルパスを抽出する。
 * Phase Gate フックが Bash 経由のファイル書き込みを検知して保護するための基盤。
 *
 * 副作用なし・純粋関数相当。対応パターンは以下:
 *   - リダイレクト `>` / `>>`
 *   - heredoc (`<<EOF > path`)
 *   - `tee` / `tee -a`
 *   - `sed -i` / `sed -i ''` (BSD)
 *   - `cp` / `mv` (宛先のみ)
 *   - `touch`
 *   - 複合コマンド (`&&`, `;`, `||`) とパイプ (`|`) 分割
 *   - ダブル/シングルクォート対応
 */

/** 引数トークン (値とクォート種別) */
type Token = {
  readonly value: string;
  readonly quoted: 'none' | 'single' | 'double';
};

/** シェル風の簡易トークナイザ。クォート境界を尊重する。 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // 空白スキップ
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    // 演算子をそのままトークン化
    if (ch === '>' || ch === '<' || ch === '|' || ch === ';' || ch === '&') {
      let op = ch;
      if (i + 1 < len && input[i + 1] === ch && (ch === '>' || ch === '<' || ch === '|' || ch === '&')) {
        op = ch + ch;
        i += 2;
      } else {
        i += 1;
      }
      tokens.push({ value: op, quoted: 'none' });
      continue;
    }

    // ダブルクォート
    if (ch === '"') {
      let buf = '';
      i += 1;
      while (i < len && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < len) {
          buf += input[i + 1];
          i += 2;
        } else {
          buf += input[i];
          i += 1;
        }
      }
      i += 1; // closing quote
      tokens.push({ value: buf, quoted: 'double' });
      continue;
    }

    // シングルクォート
    if (ch === "'") {
      let buf = '';
      i += 1;
      while (i < len && input[i] !== "'") {
        buf += input[i];
        i += 1;
      }
      i += 1; // closing quote
      tokens.push({ value: buf, quoted: 'single' });
      continue;
    }

    // 通常トークン
    let buf = '';
    while (i < len) {
      const c = input[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') break;
      if (c === '>' || c === '<' || c === '|' || c === ';' || c === '&') break;
      if (c === '"' || c === "'") break;
      buf += c;
      i += 1;
    }
    if (buf.length > 0) {
      tokens.push({ value: buf, quoted: 'none' });
    }
  }

  return tokens;
}

const OPERATOR_SEPARATORS = new Set(['&&', '||', ';', '|']);

/** トークン列を複合・パイプ境界で分割 */
function splitByOperators(tokens: Token[]): Token[][] {
  const groups: Token[][] = [];
  let current: Token[] = [];
  for (const t of tokens) {
    if (t.quoted === 'none' && OPERATOR_SEPARATORS.has(t.value)) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      continue;
    }
    current.push(t);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** コマンドグループ先頭の環境変数代入 (`FOO=bar`) をスキップして実コマンドを返す */
function getCommandName(tokens: Token[]): string | undefined {
  for (const t of tokens) {
    if (t.quoted === 'none' && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t.value)) continue;
    return t.value;
  }
  return undefined;
}

/**
 * 1 コマンド分のトークン列から書き込み先を抽出する。
 * リダイレクト先はコマンド種別によらず検出する (全コマンド共通)。
 */
function extractFromSingleCommand(tokens: Token[]): string[] {
  const results: string[] = [];

  // 1) リダイレクト `>` / `>>` の右辺 (heredoc の `>` もこのパスで拾える)
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.quoted === 'none' && (t.value === '>' || t.value === '>>')) {
      const next = tokens[i + 1];
      if (next !== undefined) {
        results.push(next.value);
      }
    }
  }

  const cmd = getCommandName(tokens);
  if (cmd === undefined) return results;

  // コマンド別の特殊処理
  const baseName = cmd.split('/').pop() ?? cmd;

  if (baseName === 'tee') {
    // `tee [-a] FILE...`
    for (let i = 1; i < tokens.length; i += 1) {
      const t = tokens[i];
      if (t.quoted === 'none' && t.value.startsWith('-')) continue;
      if (t.quoted === 'none' && (t.value === '>' || t.value === '>>' || t.value === '|' || t.value === '<')) break;
      results.push(t.value);
    }
  } else if (baseName === 'sed') {
    // `sed -i [''] SCRIPT FILE` — `-i` の直後の空文字列 (BSD) はバックアップ拡張子
    const argTokens = tokens.slice(1);
    let inPlace = false;
    let skipBackupExt = false;
    const positionals: Token[] = [];
    for (let i = 0; i < argTokens.length; i += 1) {
      const t = argTokens[i];
      if (t.quoted === 'none' && t.value === '-i') {
        inPlace = true;
        skipBackupExt = true;
        continue;
      }
      if (t.quoted === 'none' && t.value.startsWith('-i')) {
        // -iBAK
        inPlace = true;
        continue;
      }
      if (t.quoted === 'none' && t.value.startsWith('-')) continue;
      if (skipBackupExt && t.quoted !== 'none' && t.value === '') {
        // BSD `sed -i ''` — 空文字はバックアップ拡張子扱いで無視
        skipBackupExt = false;
        continue;
      }
      skipBackupExt = false;
      positionals.push(t);
    }
    if (inPlace && positionals.length >= 2) {
      // 先頭はスクリプト、残りはファイル
      for (let i = 1; i < positionals.length; i += 1) {
        results.push(positionals[i].value);
      }
    }
  } else if (baseName === 'cp' || baseName === 'mv') {
    // 宛先は最後の非オプション引数
    const positionals: Token[] = [];
    for (let i = 1; i < tokens.length; i += 1) {
      const t = tokens[i];
      if (t.quoted === 'none' && t.value.startsWith('-')) continue;
      if (t.quoted === 'none' && (t.value === '>' || t.value === '>>' || t.value === '|' || t.value === '<')) break;
      positionals.push(t);
    }
    if (positionals.length >= 2) {
      results.push(positionals[positionals.length - 1].value);
    }
  } else if (baseName === 'touch') {
    for (let i = 1; i < tokens.length; i += 1) {
      const t = tokens[i];
      if (t.quoted === 'none' && t.value.startsWith('-')) continue;
      if (t.quoted === 'none' && (t.value === '>' || t.value === '>>' || t.value === '|' || t.value === '<')) break;
      results.push(t.value);
    }
  }

  return results;
}

export class BashWriteTargetExtractor {
  /**
   * Bash コマンド文字列から書き込み先ファイルパスを抽出する。
   * 副作用なし、純粋関数相当。
   *
   * @param command Bash コマンド文字列
   * @returns 書き込み先ファイルパスの配列 (重複除去済み・入力順)
   */
  extract(command: string): readonly string[] {
    if (typeof command !== 'string' || command.length === 0) {
      return Object.freeze([]);
    }

    const tokens = tokenize(command);
    const groups = splitByOperators(tokens);

    const collected: string[] = [];
    for (const group of groups) {
      const found = extractFromSingleCommand(group);
      for (const path of found) {
        collected.push(path);
      }
    }

    // 重複除去 (挿入順保持)
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of collected) {
      if (p.length === 0) continue;
      if (seen.has(p)) continue;
      seen.add(p);
      unique.push(p);
    }

    return Object.freeze(unique);
  }
}
