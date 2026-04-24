# TDD実装計画: ISSUE-013 Wave 1

## 1. スコープ

**対象**: ISSUE-013 Wave 1 — `BashWriteTargetExtractor` に `apply_patch` ヒアドキュメント構文対応を追加

**受け入れ基準（issue_description.md Wave 1 より引用）**:
- [ ] `BashWriteTargetExtractor` が `apply_patch` ヒアドキュメント構文から下記を抽出できる
  - `*** Update File: <path>`
  - `*** Add File: <path>`
  - `*** Delete File: <path>`
- [ ] 既存の tee/sed/cp/mv/touch 抽出ロジックとの統合テスト追加
- [ ] Unit test: `apply_patch` 単体、複合コマンド（`&&` 区切り）、quote 内 `apply_patch` の各ケース

**影響する層**:
- Domain 層のみ
  - `scripts/harness/agent-integration/domain/services/bash-write-target-extractor.ts`
  - `scripts/harness/__tests__/unit/agent-integration/bash-write-target-extractor.test.ts`
- Application / Infrastructure / Presentation 層は非変更（純粋関数の内部ロジック拡張のみ）

**非スコープ**（Wave 2 以降）:
- Codex 向け presentation アダプタ（`codex-pre-tool-use-hook.ts` 等）
- CLI コマンド `phasegate hook codex-pre-tool-use` 等の追加
- `templates/.codex/hooks.json` テンプレート追加
- ドキュメント（`docs/guide/codex-integration.md`）

## 2. 前提条件検証

- `implementation-readiness-checker` 実行: スキップ（合意済み）
- 判定根拠:
  - `BashWriteTargetExtractor` は既存純粋関数であり、新規 VO/Entity/UseCase 導入なし
  - `agent-integration` Unit の上位設計文書（`logical_design.md` / `domain_model.md` / `unit_test_design.md` 他）は全て存在確認済み
  - 既存テストは AAA パターンで 20+ ケース整備済み、同スタイルで追加可能
  - ISSUE-013 本文の Wave 1 受け入れ基準が具体的で、追加実装の範囲が機械的に決まる

## 3. TDD実装順序

### 1. Unitテスト (RED → GREEN → REFACTOR)

本 Wave は純粋関数の内部ロジック拡張のため、ITテスト / E2E テストは不要。

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `BashWriteTargetExtractor` | `apply_patch` heredoc 構文からのパス抽出 | heredoc body をスキャンする `apply_patch` 検出ロジック |

**実行方式**: メインセッションで直接実行（コンテキスト節約）

#### テストケース一覧

下記を `bash-write-target-extractor.test.ts` に追加:

```
describe('apply_patch 抽出', () => {
  - `apply_patch <<'EOF' ... *** Update File: foo.ts ... EOF` から foo.ts を抽出する
  - `apply_patch <<'EOF' ... *** Add File: new.ts ... EOF` から new.ts を抽出する
  - `apply_patch <<'EOF' ... *** Delete File: old.ts ... EOF` から old.ts を抽出する
  - 1 つの apply_patch 内で複数ファイルを更新するケース (Update + Add + Delete 混在)
  - *** Begin Patch / *** End Patch マーカーを含む完全な形式
  - quote 違い: <<EOF (unquoted) でも抽出できる
  - quote 違い: <<"EOF" (double-quoted) でも抽出できる
  - パスにスペースを含むケース: *** Update File: path with spaces.ts
  - 末尾の余計な空白をトリムする: *** Update File: foo.ts  (trailing space)
});

describe('apply_patch 複合コマンド', () => {
  - `cd /tmp && apply_patch <<'EOF' ... EOF` から抽出する
  - `apply_patch <<'EOF' ... EOF && echo done` から抽出する
});

describe('apply_patch と既存抽出の統合', () => {
  - `apply_patch <<'EOF' ... *** Update File: a.ts ... EOF && echo x > b.ts` から a.ts, b.ts を抽出する
  - `echo start > log.txt && apply_patch <<'EOF' ... *** Add File: new.ts ... EOF` から log.txt, new.ts を抽出する
});

describe('apply_patch 抽出しないパターン', () => {
  - heredoc マーカー無しの `*** Update File: foo.ts` を含むコメント文字列は抽出しない
    (例: echo '*** Update File: foo.ts' は抽出しない)
  - apply_patch コマンドではない通常のシェルで `***` 記号を含むテキストは抽出しない
});
```

#### 実装方針

**マッチ戦略**: 「`*** Begin Patch` マーカーを含む範囲」を apply_patch ブロックとして扱い、その範囲内で `*** (Update|Add|Delete) File: <path>` を抽出する。

理由:
- `apply_patch` コマンド名ベースの検出だと、alias やフルパス（`/usr/local/bin/apply_patch`）で取りこぼす
- `*** Begin Patch` ... `*** End Patch` の構造マーカーは OpenAI の apply_patch 規約で固定
- マーカーがあれば高確率で本物の patch、偶発的に一致するケース（`echo '*** Begin Patch'` 等）は誤検出でも保護側に倒れるので許容

**実装場所**:
- `bash-write-target-extractor.ts` の `extract()` 本体に、既存の token ベース抽出の後に「raw command 文字列に対する apply_patch スキャン」を追加する
- ヒアドキュメント body は既存 tokenizer では扱いにくいので、正規表現で raw 文字列から直接抽出する

**正規表現**:
```typescript
// Begin〜End Patch 区間を先に切り出してから File 行を抽出
const APPLY_PATCH_BLOCK = /\*\*\*\s*Begin\s+Patch([\s\S]*?)\*\*\*\s*End\s+Patch/g;
const APPLY_PATCH_FILE_LINE = /^\*\*\*\s+(?:Update|Add|Delete)\s+File:\s*(.+?)\s*$/gm;
```

**重複除去**: 既存の `Set` ベースの重複除去ロジックをそのまま活用する。

## 4. 環境検証チェックリスト

- [ ] `npm run test -- bash-write-target-extractor` が緑（既存 + 新規テストすべて PASS）
- [ ] `npx phasegate lint` で L1-001 / L1-002 違反が無い
- [ ] `npx phasegate validate --layer L2` で metadata 検証 PASS

## 5. QA（不明点・確認事項）

### [Question] Q1: `*** End Patch` マーカーが欠けている不完全な apply_patch 本文の扱い

Codex が途中で中断した場合や、テスト用の途切れた文字列で `*** Begin Patch` のみ存在するケースでは、「End Patch まで到達しない」状態が起きうる。このとき:

- **案 A**: `*** Begin Patch` から command 末尾までをブロックとして扱い、File 行を抽出する
- **案 B**: `*** End Patch` が見つからなければブロック自体を無視する

**推奨案**: **案 A**（保護側に倒す）。phase-gate 本来の目的は「書き込みを取りこぼさないこと」であり、誤検出（偽陽性）は書き込みをブロックするだけなのでユーザーに影響が小さい。一方、取りこぼし（偽陰性）は phase-gate の責務を果たせない。

[Answer]
（人間が回答を記入）

---

### [Question] Q2: `apply_patch` の heredoc クォート形式の網羅範囲

heredoc には `<<EOF` / `<<'EOF'` / `<<"EOF"` / `<<-EOF` (tab indent) 等のバリエーションがある。すべて対応する必要があるか？

- **案 A**: 「`*** Begin Patch` マーカー検出ベース」のため、heredoc クォート形式は意識不要（マーカーがあれば抽出）
- **案 B**: heredoc 記法を明示的にパースする

**推奨案**: **案 A**。マーカーベース検出の副次的な利点として、heredoc 表記バリエーションに依存しなくなる。テストは代表的な 2-3 形式で十分。

[Answer]
（人間が回答を記入）

---

### [Question] Q3: `echo '*** Update File: foo.ts'` のような偶発的文字列の扱い

quote 内で `*** Update File:` パターンを含むが、実際には apply_patch ではない文字列。

- **案 A**: `*** Begin Patch` / `*** End Patch` ブロック内に限定して抽出するため、偶発的文字列は自動的に除外される
- **案 B**: 全文スキャンし、偶発的一致も抽出（誤検出だが保護側に倒す）

**推奨案**: **案 A**（Begin/End ブロックに限定）。誤検出の頻度が抑えられ、ユーザー体験が良い。Q1 の案 A と整合させる（End が欠けている場合は command 末尾までをブロックとみなす）。

[Answer]
（人間が回答を記入）

## 6. 前提条件・リスク

### 前提条件
- Codex の `apply_patch` ヒアドキュメント構文が OpenAI 規約に従う（`*** Begin Patch` / `*** End Patch` 囲い、`*** (Update|Add|Delete) File:` 行頭）
- Wave 2 で Codex 実環境からの stdin JSON を採取するが、Wave 1 は issue 本文に記載の構文仕様のみで実装可能

### リスク
- **apply_patch 構文の非公式性**: OpenAI 側で構文変更があった場合、正規表現の更新が必要
  - 緩和策: 正規表現を 1 箇所に集約し、CHANGELOG で追従
- **heredoc 内の複雑ケース**: 変数展開 `${FILE}` を含むパス等は抽出対象外とする（静的解析で解決不能、動的実行時のみ判明）
  - 緩和策: テストで「変数展開パスは抽出されない」ことを明示的に確認

### 対象外（後続 Wave で対応）
- `apply_patch` ペイロードパーサをより厳密化（例: `@@` ヘッダ検証、diff コンテキスト検証）
- Codex 実機での stdin JSON スキーマ確認（Wave 2 の PoC で実施）

---

## 承認フロー

1. 人間がこの計画をレビュー
2. `[Question]` に `[Answer]` を記入（推奨案でよければ「Q1-3 すべて推奨案で」と一言でも可）
3. Phase 2 実装開始
