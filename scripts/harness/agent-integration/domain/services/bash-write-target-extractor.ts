/**
 * @layer domain
 * @unit agent-integration
 * @work-item-id WI-384
 *
 * BashWriteTargetExtractor ドメインサービス
 *
 * Bash コマンド文字列を静的解析し、書き込み対象となるファイルパスを抽出する。
 * Phase Gate フックが Bash 経由のファイル書き込みを検知して保護するための基盤。
 *
 * 副作用なし・純粋関数相当。対応パターンは以下:
 *   - リダイレクト `>` / `>>` / `>|` (clobber)
 *   - heredoc (`<<EOF > path`) — ヒアドキュメント**本文**はシェル構文解析の対象外
 *     (本文中の `<...>` をリダイレクトと誤認しないため。WI-362)
 *   - `tee` / `tee -a`
 *   - `sed -i` / `sed -i ''` (BSD)
 *   - `cp` / `mv` (宛先のみ)
 *   - `touch`
 *   - `dd of=<path>`
 *   - `install [opts] SRC... DEST` (coreutils, ファイル作成)
 *   - `rsync [opts] SRC... DEST`
 *   - `bash -c '...'` / `sh -c '...'` (ネストしたコマンドを再帰解析)
 *   - 複合コマンド (`&&`, `;`, `||`) とパイプ (`|`) 分割
 *   - ダブル/シングルクォート対応
 *   - `apply_patch` ヒアドキュメント (`*** Begin Patch` / `*** End Patch` ブロック内の
 *     `*** Update|Add|Delete File: <path>` 行) — Codex CLI 対応 (ISSUE-013 Wave 1)
 */

import { ApplyPatchWriteTargetExtractor } from './apply-patch-write-target-extractor.js';

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
      // `>|` (clobber redirect) は独立した 2 文字演算子として扱う
      if (ch === '>' && i + 1 < len && input[i + 1] === '|') {
        op = '>|';
        i += 2;
      } else if (i + 1 < len && input[i + 1] === ch && (ch === '>' || ch === '<' || ch === '|' || ch === '&')) {
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

/** ヒアドキュメント開始演算子で宣言された終端デリミタ */
type HeredocDelimiter = {
  /** クォート・エスケープを解除した終端語 */
  readonly word: string;
  /** `<<-` 形式か (終端行の先頭タブを無視する) */
  readonly allowIndent: boolean;
};

/** デリミタ語の終端となる文字 (空白およびシェル演算子) */
const DELIMITER_TERMINATORS = new Set([' ', '\t', ';', '&', '|', '<', '>', '(', ')']);

/**
 * 1 行から ヒアドキュメント開始演算子 (`<<WORD` / `<<-WORD` / `<<'WORD'`) を検出し、
 * 宣言順に終端デリミタを返す。
 *
 * クォート状態を追跡し、クォート内の `<<` は演算子として扱わない
 * (例: `echo "a << b" > out.txt` の `<<` はヒアドキュメントではない)。
 * `$( ... )` コマンド置換の内側ではクォート文脈がリセットされるため、
 * `git commit -m "$(cat <<'EOF'` のような入れ子も検出できる。
 * ヒアストリング `<<<` は本文を持たないため対象外。
 */
function findHeredocDelimiters(line: string): HeredocDelimiter[] {
  const found: HeredocDelimiter[] = [];
  const substitutionStack: ('none' | 'single' | 'double')[] = [];
  let quote: 'none' | 'single' | 'double' = 'none';
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (quote === 'single') {
      if (ch === "'") quote = 'none';
      i += 1;
      continue;
    }

    if (ch === '\\') {
      i += 2;
      continue;
    }

    if (ch === '$' && line[i + 1] === '(') {
      substitutionStack.push(quote);
      quote = 'none';
      i += 2;
      continue;
    }

    if (quote === 'double') {
      if (ch === '"') quote = 'none';
      i += 1;
      continue;
    }

    if (ch === "'") {
      quote = 'single';
      i += 1;
      continue;
    }

    if (ch === '"') {
      quote = 'double';
      i += 1;
      continue;
    }

    if (ch === ')' && substitutionStack.length > 0) {
      quote = substitutionStack.pop() ?? 'none';
      i += 1;
      continue;
    }

    if (ch === '<' && line[i + 1] === '<') {
      if (line[i + 2] === '<') {
        // ヒアストリング `<<<` は本文行を持たない
        i += 3;
        continue;
      }
      i += 2;
      let allowIndent = false;
      if (line[i] === '-') {
        allowIndent = true;
        i += 1;
      }
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i += 1;
      const word = readHeredocDelimiterWord(line, i);
      i = word.nextIndex;
      if (word.value.length > 0) {
        found.push({ word: word.value, allowIndent });
      }
      continue;
    }

    i += 1;
  }

  return found;
}

/** `<<` 直後のデリミタ語を読む。クォート/バックスラッシュを解除した値を返す。 */
function readHeredocDelimiterWord(line: string, start: number): { value: string; nextIndex: number } {
  let value = '';
  let i = start;

  while (i < line.length) {
    const ch = line[i];

    if (ch === "'") {
      i += 1;
      while (i < line.length && line[i] !== "'") {
        value += line[i];
        i += 1;
      }
      i += 1;
      continue;
    }

    if (ch === '"') {
      i += 1;
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\' && i + 1 < line.length) {
          value += line[i + 1];
          i += 2;
          continue;
        }
        value += line[i];
        i += 1;
      }
      i += 1;
      continue;
    }

    if (ch === '\\' && i + 1 < line.length) {
      value += line[i + 1];
      i += 2;
      continue;
    }

    if (DELIMITER_TERMINATORS.has(ch)) break;

    value += ch;
    i += 1;
  }

  return { value, nextIndex: i };
}

/** 終端行判定 (`<<-` は先頭タブを無視し、行末の空白・CR は許容する) */
function isHeredocTerminator(line: string, delimiter: HeredocDelimiter): boolean {
  const candidate = delimiter.allowIndent ? line.replace(/^\t+/, '') : line;
  return candidate.trimEnd() === delimiter.word;
}

/**
 * ヒアドキュメント本文行を除去する。
 *
 * 本文はシェル構文ではなくデータであり、`Co-Authored-By: Claude <noreply@example.com>`
 * のような `<...>` をリダイレクトと誤解釈すると無関係なコマンドが誤ブロックされる (WI-362)。
 * 除去対象は**本文行と終端行のみ**で、開始演算子のある行はそのまま残すため
 * `cat <<EOF > path` の `> path` は従来どおり検出される (fail-closed 維持)。
 */
function stripHeredocBodies(command: string): string {
  if (!command.includes('<<')) return command;

  const lines = command.split('\n');
  const kept: string[] = [];
  const pending: HeredocDelimiter[] = [];

  for (const line of lines) {
    if (pending.length > 0) {
      // 本文行 / 終端行はいずれも構文解析対象から外す
      if (isHeredocTerminator(line, pending[0])) {
        pending.shift();
      }
      continue;
    }
    kept.push(line);
    for (const delimiter of findHeredocDelimiters(line)) {
      pending.push(delimiter);
    }
  }

  return kept.join('\n');
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

/** リダイレクト演算子の右辺を解釈し、fd 複製の場合は書き込み先なしとして扱う。 */
function getRedirectTarget(tokens: Token[], redirectIndex: number): string | undefined {
  const next = tokens[redirectIndex + 1];
  if (next === undefined) return undefined;

  if (next.quoted === 'none' && /^&\d+$/.test(next.value)) {
    return undefined;
  }

  if (next.quoted === 'none' && next.value === '&') {
    const afterAmpersand = tokens[redirectIndex + 2];
    if (afterAmpersand === undefined) return undefined;
    if (afterAmpersand.quoted === 'none' && /^\d+$/.test(afterAmpersand.value)) {
      return undefined;
    }
    // `>& file` は csh 形式の実ファイル書き込みとして安全側で抽出する。
    return afterAmpersand.value;
  }

  return next.value;
}

/**
 * 1 コマンド分のトークン列から書き込み先を抽出する。
 * リダイレクト先はコマンド種別によらず検出する (全コマンド共通)。
 */
function extractFromSingleCommand(tokens: Token[]): string[] {
  const results: string[] = [];

  // 1) リダイレクト `>` / `>>` / `>|` の右辺 (heredoc の `>` もこのパスで拾える)
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.quoted === 'none' && (t.value === '>' || t.value === '>>' || t.value === '>|')) {
      const target = getRedirectTarget(tokens, i);
      if (target !== undefined) {
        results.push(target);
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
      if (t.quoted === 'none' && (t.value === '>' || t.value === '>>' || t.value === '>|' || t.value === '|' || t.value === '<')) break;
      results.push(t.value);
    }
  } else if (baseName === 'dd') {
    // `dd of=<path>` — 出力ファイルは `of=` オペランド
    for (let i = 1; i < tokens.length; i += 1) {
      const t = tokens[i];
      if (t.value.startsWith('of=')) {
        const dest = t.value.slice('of='.length);
        if (dest.length > 0) results.push(dest);
      }
    }
  } else if (baseName === 'install') {
    // `install [opts] SRC... DEST` — 宛先は最後の非オプション引数 (coreutils はファイルを作成する)
    const positionals = collectPositionals(tokens);
    if (positionals.length >= 1) {
      // `install -d DIR...` はディレクトリ作成のみだが保護側に倒し全ディレクトリを対象化
      const isDirMode = tokens.some(
        (t) => t.quoted === 'none' && (t.value === '-d' || t.value === '--directory'),
      );
      if (isDirMode) {
        for (const p of positionals) results.push(p.value);
      } else if (positionals.length >= 2) {
        results.push(positionals[positionals.length - 1].value);
      } else {
        // SRC 省略で DEST のみ渡された不正形でも保護側に倒す
        results.push(positionals[positionals.length - 1].value);
      }
    }
  } else if (baseName === 'rsync') {
    // `rsync [opts] SRC... DEST` — 宛先は最後の非オプション引数
    const positionals = collectPositionals(tokens);
    if (positionals.length >= 2) {
      results.push(positionals[positionals.length - 1].value);
    }
  } else if (baseName === 'bash' || baseName === 'sh') {
    // `bash -c '<nested command>'` — ネストしたコマンドを再帰解析
    for (let i = 1; i < tokens.length; i += 1) {
      const t = tokens[i];
      if (t.quoted === 'none' && t.value === '-c') {
        const script = tokens[i + 1];
        if (script !== undefined) {
          for (const nested of extractFromCommandString(script.value)) {
            results.push(nested);
          }
        }
        break;
      }
    }
  }

  return results;
}

/** コマンド先頭 (cmd 名) を除いた非オプション位置引数を収集する。リダイレクト境界で停止。 */
function collectPositionals(tokens: Token[]): Token[] {
  const positionals: Token[] = [];
  for (let i = 1; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.quoted === 'none' && t.value.startsWith('-')) continue;
    if (t.quoted === 'none' && (t.value === '>' || t.value === '>>' || t.value === '>|' || t.value === '|' || t.value === '<')) break;
    positionals.push(t);
  }
  return positionals;
}

/** コマンド文字列を token 化 → 演算子分割 → 各コマンドから書き込み先を抽出する内部関数。 */
function extractFromCommandString(command: string): string[] {
  // ヒアドキュメント本文はデータなのでシェル構文解析の対象外にする (WI-362)。
  // apply_patch 抽出は元の command 文字列を直接走査するため影響を受けない。
  const tokens = tokenize(stripHeredocBodies(command));
  const groups = splitByOperators(tokens);
  const collected: string[] = [];
  for (const group of groups) {
    for (const path of extractFromSingleCommand(group)) {
      collected.push(path);
    }
  }
  // ネスト内の apply_patch heredoc も拾う
  const patchExtractor = new ApplyPatchWriteTargetExtractor();
  for (const target of patchExtractor.extract(command)) {
    collected.push(target.filePath);
  }
  return collected;
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

    // token 化 → 演算子分割 → 各コマンド抽出 + apply_patch ヒアドキュメント対応
    // (ISSUE-013 Wave 1)。bash -c '...' 等のネストコマンドは内部で再帰解析される。
    const collected = extractFromCommandString(command);

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
