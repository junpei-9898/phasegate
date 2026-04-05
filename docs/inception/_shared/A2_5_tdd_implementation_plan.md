# TDD実装計画: A-2.5 Bash 経由書き込みのフェーズゲート対応

- **作成日**: 2026-04-05
- **関連**: configurable_phase_gate_plan.md §A-2.5
- **対象 Unit**: `agent-integration`

---

## 1. スコープ

A-2 実施中に判明した「Write/Edit がフェーズゲートでブロックされると agent が Bash (`cat > file`, heredoc 等) で迂回してファイル作成する」抜け穴を塞ぐ。

### 受け入れ基準

- `cat > scripts/harness/{unit}/foo.ts` のような Bash 書き込みが Write ツール同様にフェーズゲートでブロックされる
- 安全な Bash (`pnpm test`, `git status`, `ls`) は通過する
- 既存の Write/Edit 経路は変更なし（リグレッションなし）
- A-2 実施中の実際の迂回パターン（`cat <<EOF > path`）が回帰テストで再現ブロックされる

---

## 2. 前提条件検証

- 対象 Unit (`agent-integration`) の設計文書: ✅ 存在
  - `docs/product/construction/agent-integration/logical_design.md`
  - `docs/product/construction/agent-integration/domain_model.md`
- 既存テスト: ✅ グリーン
- 判定結果: ✅ 実装準備完了

---

## 3. アーキテクチャ設計

### 3.1 新設要素

#### ドメイン層（新規）

**`BashWriteTargetExtractor` ドメインサービス**
- 配置: `scripts/harness/agent-integration/domain/services/bash-write-target-extractor.ts`
- 責務: Bash command 文字列から書き込み先ファイルパスを抽出
- 入力: `string` (command)
- 出力: `readonly string[]` (抽出されたファイルパス群)
- 副作用なし、純粋関数

### 3.2 変更要素

#### プレゼンテーション層

**`pre-tool-use-hook.ts`**
- `tool_name === 'Bash'` の場合、`tool_input.command` から `BashWriteTargetExtractor` で抽出
- 抽出した `targetFilePaths` を既存の `HandlePreToolUseUseCase.execute()` に渡す
- Write/Edit 経路は無変更

#### 設定

**`.claude/settings.json`**
- `hooks.PreToolUse` の matcher に `Bash` を追加
- 既存 `deny-check.sh` と並列実行（両方通過で許可）

### 3.3 変更しない要素

- `HandlePreToolUseUseCase` 本体 — `targetFilePaths` を受け取る既存 API で十分
- `WriteTargetScope.fromPath()` — パスベース解決はそのまま利用
- Write/Edit 経路のロジック

---

## 4. Bash コマンド抽出仕様

### 4.1 対応パターン

| # | パターン | 例 | 抽出結果 |
|---|---------|----|---------|
| 1 | リダイレクト `>` | `echo x > foo.ts` | `foo.ts` |
| 2 | 追記リダイレクト `>>` | `echo x >> foo.ts` | `foo.ts` |
| 3 | `cat` + heredoc | `cat <<EOF > foo.ts\n...\nEOF` | `foo.ts` |
| 4 | `tee` | `echo x \| tee foo.ts` | `foo.ts` |
| 5 | `tee -a` | `echo x \| tee -a foo.ts` | `foo.ts` |
| 6 | `sed -i` | `sed -i 's/a/b/' foo.ts` | `foo.ts` |
| 7 | `sed -i ''` (BSD) | `sed -i '' 's/a/b/' foo.ts` | `foo.ts` |
| 8 | `cp` | `cp src.ts foo.ts` | `foo.ts` |
| 9 | `mv` | `mv src.ts foo.ts` | `foo.ts` |
| 10 | `touch` | `touch foo.ts` | `foo.ts` |
| 11 | 複合コマンド `&&` | `mkdir -p dir && echo x > dir/foo.ts` | `dir/foo.ts` |
| 12 | 複合コマンド `;` | `ls; echo x > foo.ts` | `foo.ts` |
| 13 | パイプ `\|` の右辺 | `cat src \| tee foo.ts` | `foo.ts` |
| 14 | クォート付きパス | `echo x > "path with spaces.ts"` | `path with spaces.ts` |
| 15 | シングルクォート | `echo x > 'foo.ts'` | `foo.ts` |

### 4.2 抽出しないパターン（安全側）

| パターン | 例 | 理由 |
|---------|----|------|
| 読み取り | `cat foo.ts`, `less foo.ts` | 書き込みでない |
| ディレクトリ操作 | `mkdir dir`, `rmdir dir` | ファイルでない |
| 削除 | `rm foo.ts` | 書き込みでないが、別途考慮 |
| git コマンド | `git commit -m "..."` | git 自身の責務 |
| テスト実行 | `pnpm test` | 書き込みなし |

### 4.3 検出不能（本タスクスコープ外）

| パターン | 例 | 備考 |
|---------|----|------|
| eval 系 | `python -c "open('foo.ts','w').write('x')"` | command 文字列から書き込み先を抽出不可 |
| スクリプト実行 | `./deploy.sh` | スクリプト内容は事前解析不可 |
| エディタ | `vim foo.ts` | インタラクティブで挙動予測不可 |

これらは将来課題。L2/L4 バリデータで事後検証する方針で別途検討。

### 4.4 抽出アルゴリズム

```
1. command を複合コマンド区切り (`&&`, `;`, `||`) で分解
2. 各サブコマンドに対して:
   a. パイプ (`|`) で分解（右辺も独立処理）
   b. 各セグメントで以下の正規表現マッチング（優先順）:
      i.   heredoc: `<<\s*(\w+|'[^']+'|"[^"]+")\s*>\s*(PATH)`
      ii.  リダイレクト: `[>]{1,2}\s*(PATH)`
      iii. tee: `\btee(\s+-a)?\s+(PATH)`
      iv.  sed -i: `\bsed\s+-i(\s*'[^']*')?\s+.*?\s+(PATH)`
      v.   cp/mv: `\b(cp|mv)\s+.*?\s+(PATH)$` (末尾のみ)
      vi.  touch: `\btouch\s+(PATH)`
   c. PATH は以下のいずれか:
      - `"([^"]+)"` (double-quoted)
      - `'([^']+)'` (single-quoted)
      - `([^\s;&|<>]+)` (unquoted)
3. 抽出したパスをリストに集約、重複除去
```

---

## 5. TDD 実装順序

### Phase 2-1: BashWriteTargetExtractor ドメインサービス

**RED → GREEN → REFACTOR**

#### ユニットテストケース（Japanese, AAA）

```
describe('BashWriteTargetExtractor')
  describe('リダイレクト抽出')
    - `echo x > foo.ts` から foo.ts を抽出する
    - `echo x >> foo.ts` から foo.ts を抽出する
    - `cat > foo.ts` から foo.ts を抽出する
  describe('heredoc 抽出')
    - `cat <<EOF > foo.ts ... EOF` から foo.ts を抽出する
    - `cat <<'END' > foo.ts ... END` から foo.ts を抽出する
  describe('tee 抽出')
    - `echo x | tee foo.ts` から foo.ts を抽出する
    - `echo x | tee -a foo.ts` から foo.ts を抽出する
  describe('sed -i 抽出')
    - `sed -i 's/a/b/' foo.ts` から foo.ts を抽出する
    - `sed -i '' 's/a/b/' foo.ts` から foo.ts を抽出する (BSD)
  describe('cp/mv 抽出')
    - `cp src.ts foo.ts` から foo.ts を抽出する (destination のみ)
    - `mv src.ts foo.ts` から foo.ts を抽出する
  describe('touch 抽出')
    - `touch foo.ts` から foo.ts を抽出する
  describe('複合コマンド')
    - `mkdir -p dir && echo x > dir/foo.ts` から dir/foo.ts を抽出する
    - `ls; echo x > foo.ts` から foo.ts を抽出する
    - `cat src | tee foo.ts` から foo.ts を抽出する
  describe('クォート対応')
    - `echo x > "path with spaces.ts"` から "path with spaces.ts" を抽出する
    - `echo x > 'foo.ts'` から foo.ts を抽出する
  describe('抽出しないパターン')
    - `cat foo.ts` は空配列を返す (読み取りのみ)
    - `pnpm test` は空配列を返す
    - `git status` は空配列を返す
    - `ls -la` は空配列を返す
    - `mkdir dir` は空配列を返す (ディレクトリ)
    - `rm foo.ts` は空配列を返す (削除、別スコープ)
  describe('重複除去')
    - `echo x > foo.ts && echo y >> foo.ts` から foo.ts を 1 回だけ返す
  describe('複数ファイル抽出')
    - `echo x > a.ts && echo y > b.ts` から a.ts と b.ts を両方抽出する
```

#### 実装ファイル

`scripts/harness/agent-integration/domain/services/bash-write-target-extractor.ts`

```typescript
// @unit agent-integration
// @layer domain

export class BashWriteTargetExtractor {
  extract(command: string): readonly string[] {
    // 1. Split compound commands
    // 2. For each sub-command, apply regex patterns
    // 3. Deduplicate and return
  }
}
```

---

### Phase 2-2: pre-tool-use-hook.ts の Bash 対応拡張

**RED → GREEN → REFACTOR**

#### 変更内容

```typescript
// 既存のターゲット抽出ロジックの後に追加
if (toolName === 'Bash' && typeof input.tool_input?.command === 'string') {
  const extractor = new BashWriteTargetExtractor();
  const bashTargets = extractor.extract(input.tool_input.command);
  targetFilePaths.push(...bashTargets.map(toRelative));
}
```

#### ユニットテストケース

既存の `pre-tool-use-hook.ts` には直接のユニットテストがない（統合テストで検証）。
そのため A-2.5-5（統合テスト）でカバーする。

---

### Phase 2-3: .claude/settings.json 更新

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/scripts/deny-check.sh" },
          { "type": "command", "command": "npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts" }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts" }
        ]
      }
    ],
    ...
  }
}
```

**変更点**: Bash matcher の hooks 配列に `pre-tool-use-hook.ts` を追加。既存 `deny-check.sh` と共存。

---

### Phase 2-4: 統合テスト

`scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts` に追加:

```
describe('Bash 経由書き込みのフェーズゲート')
  - cat > で protected path に書き込み → ブロックされる
  - heredoc で protected path に書き込み → ブロックされる (A-2 回帰)
  - 安全な Bash (pnpm test) → 通過する
  - git 系コマンド → 通過する
  - read-only Bash (cat, ls) → 通過する
```

---

## 6. 環境検証チェックリスト

- [x] pnpm install 正常完了
- [x] 既存テストグリーン
- [x] `.claude/settings.json` の現状バックアップ済み（git で管理）

## 7. QA（不明点・確認事項）

### [Question] Q1: `rm foo.ts` の扱い

削除コマンドは「書き込み」ではないが、protected path の破壊的変更という意味では同じレベルのリスク。今回のスコープに含めるか？

**推奨案:** **スコープ外**。今回の目的は「A-2 で発生した迂回の再発防止」であり、`rm` は agent が使っていなかった。別タスクで削除保護を設計する方が責務が明確。

### [Question] Q2: `deny-check.sh` との実行順序

現状の `deny-check.sh` は `.claude/settings.json` の `Permissions.deny` パターンをチェックする。これと `pre-tool-use-hook.ts` を Bash matcher で並列登録するが、順序はどうするか？

**推奨案:** **`deny-check.sh` を先に実行** → `pre-tool-use-hook.ts` を後に実行。理由: deny-check は単純な禁止パターン（`rm -rf`, `sudo` 等）のチェックで、フェーズゲートチェックより軽量かつ危険度が高い。deny で弾けばフェーズゲート評価は不要。

### [Question] Q3: 抽出不能な Bash パターン（`python -c`, `./script.sh`）の扱い

eval 系やユーザースクリプトは command 文字列から書き込み先を事前抽出できない。保守的に全ブロックすると誤検知が多すぎる。

**推奨案:** **本タスクでは検出不能として許可**。将来的に L2/L4 バリデータで事後検証（`git status` で新規ファイル検出 → フェーズゲート再評価）する方針で別途検討。ドキュメントに「既知の限界」として明記。

## 8. 前提条件・リスク

- **誤検知リスク**: 正規表現ベースの抽出は誤検知の可能性あり。例: `echo "foo > bar"` の `>` は文字列内。→ 対策: 単純な引用符内判定で除外
- **パフォーマンス**: 全 Bash コマンドで hook が発火するため、抽出ロジックは高速である必要あり（正規表現ベースで十分）
- **既存テスト影響**: settings.json 変更により既存の Bash コマンドテストが影響を受ける可能性 → 全体テスト実行で確認
