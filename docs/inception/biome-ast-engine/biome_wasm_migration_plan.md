# Biome移行結果: ESLint完全除去 + Biome v2 アップグレード

> **作成日**: 2026-03-16
> **完了日**: 2026-03-16
> **対象Unit**: biome-ast-engine
> **対応Story**: H01-01, H01-02, H01-03
> **ステータス**: **Phase 2 完了**

---

## 1. 実行結果サマリ

### 完了した作業

| 項目 | 結果 |
|------|------|
| Biome アップグレード | v1.9.4 → **v2.4.7** |
| biome.json 作成 | Biome v2 形式で作成済み |
| ESLint ルール削除 | `scripts/harness/eslint-rules/` 完全削除（4ルール+テスト4ファイル） |
| ESLint テンプレート削除 | `scripts/harness/templates/eslint.config.js` 削除 |
| ESLint 依存パッケージ削除 | `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/rule-tester`, `@typescript-eslint/utils` 全削除（79パッケージ） |
| テスト | 162 passed / 1 failed（既知の `ci-check.test.ts` のみ） |
| `harness lint` 動作確認 | Biome v2 で正常動作（651違反検出） |

### GritQL L1-001/L1-002 のBiomeネイティブ化について

**結論: 現時点では実現不可。** Biome v2.4.7 の GritQL 実装はコメントパターンの検出（`comment()`, `contains`, 否定パターン）が「In progress / entirely untested」状態（[GitHub #2582](https://github.com/biomejs/biome/issues/2582)）。

L1-001/L1-002 はTS実装（LintRunner）で引き続き動作する。Biome の GritQL コメント対応が成熟した時点で再評価する。

---

## 2. 調査で判明した事実

### 2.1 Biome Plugin API の現状（2026年3月時点）

| 項目 | 状況 |
|------|------|
| Biome 最新安定版 | **v2.4.7** |
| カスタムルール手段 | **GritQL `.grit` ファイル** |
| Rust/WASM Plugin | Biomeチームは注力対象外。「将来的にサポートするかも」程度 |
| GritQL コメント対応 | **未完成**（In progress / entirely untested） |

**Rust/WASM 環境構築は不要。** Biome のカスタムルールは GritQL で書く。

参照:
- [Biome Linter Plugins 公式ドキュメント](https://biomejs.dev/linter/plugins/)
- [Biome v2.0 リリースノート](https://biomejs.dev/blog/biome-v2/)
- [Biome v2.4 リリースノート](https://biomejs.dev/blog/biome-v2-4/)
- [Biome 2026 ロードマップ](https://biomejs.dev/blog/roadmap-2026/)
- [GritQL 対応状況 GitHub #2582](https://github.com/biomejs/biome/issues/2582)

### 2.2 GritQL の能力と限界

**GritQLでできること:**
- ASTパターンマッチ（コードスニペットベース）
- キャプチャ変数（`$name`, `$args`）
- `register_diagnostic` による診断メッセージ登録
- `.grit` ファイルを `biome.json` の `plugins` セクションで参照

**GritQLでできないこと（2026年3月時点）:**
- コメントパターンの検出（`comment()` 未完成）
- ファイル間のimportグラフ解析
- 循環依存検出
- 構造的フィンガープリンティング
- 比率計算に基づく閾値判定

---

## 3. 現在のアーキテクチャ

```
[harness lint CLI]
  → ExecuteLintUseCase
    → BiomeCliExecutorAdapter（biome v2.4.7 check --reporter json）
    → TypeScriptSourceModuleAnalyzer（TS Compiler API）
      → SourceModuleSnapshot 生成
    → LintRunner（全8ルールをTS内で評価）
  → BuildHarnessErrorPayload
  → 結果出力（human / json）
```

**ESLint は完全除去。Biome v2 が標準 linter/formatter。8つの L1 ルールは TS 実装。**

### ルール別実装状況

| ルール | コード | 実装 | 動作 |
|--------|--------|------|------|
| require-unit-comment | L1-001 | TS（LintRunner） | ✅ |
| require-layer-comment | L1-002 | TS（LintRunner） | ✅ |
| no-layer-violation | L1-003 | TS（LintRunner） | ✅ |
| enforce-folder-structure | L1-004 | TS（LintRunner） | ✅ |
| no-any-abuse | L1-005 | TS（LintRunner） | ✅ |
| no-code-duplication | L1-006 | TS（LintRunner） | ✅ |
| no-ghost-file | L1-007 | TS（LintRunner） | ✅ |
| no-comment-flood | L1-008 | TS（LintRunner） | ✅ |

---

## 4. 削除されたファイル

### ESLint ルール（LintRunner で代替済み）
- `scripts/harness/eslint-rules/aidlc/require-unit-comment.ts`
- `scripts/harness/eslint-rules/aidlc/require-layer-comment.ts`
- `scripts/harness/eslint-rules/architecture/no-layer-violation.ts`
- `scripts/harness/eslint-rules/architecture/enforce-folder-structure.ts`

### ESLint テスト
- `scripts/harness/__tests__/eslint-rules/require-unit-comment.test.ts`
- `scripts/harness/__tests__/eslint-rules/require-layer-comment.test.ts`
- `scripts/harness/__tests__/eslint-rules/no-layer-violation.test.ts`
- `scripts/harness/__tests__/eslint-rules/enforce-folder-structure.test.ts`

### ESLint テンプレート
- `scripts/harness/templates/eslint.config.js`

### 削除された npm パッケージ（devDependencies）
- `eslint` ^10.0.3
- `@typescript-eslint/parser` ^8.56.1
- `@typescript-eslint/rule-tester` ^8.56.1
- `@typescript-eslint/utils` ^8.56.1

---

## 5. 今後の展望

| 項目 | 条件 | アクション |
|------|------|-----------|
| L1-001/L1-002 GritQL化 | Biome の GritQL コメント対応が安定 | `.grit` ファイル作成、LintRunner から除外 |
| L1-005 GritQL化 | GritQL で `any` 型パターンマッチが可能になった場合 | パターンマッチ部分のみGritQL、閾値判定はTS |
| Biome formatter 統合 | チームで合意 | `biome.json` の formatter 設定を有効化 |
