# TDD実装計画: B-7 ProtectedFileList 除外設定機能

## 1. スコープ

- **対象**: ProtectedFileList 除外設定（phasegate.config.json → hook 配線）
- **受け入れ基準**: `protectedFiles.exclude: ["tsconfig.json", "package.json"]` を phasegate.config.json に設定すると、pre-tool-use hook がこれらのファイルへの書き込みをブロックしなくなる
- **影響レイヤー**: Domain（VO + Port + Service）, Infrastructure（Adapter + Schema）, Config

## 2. 前提条件検証

- `implementation-readiness-checker` 相当のチェック:
  - `docs/product/construction/agent-integration/logical_design.md` ✅ 存在
  - `docs/product/construction/agent-integration/domain_model.md` ✅ 存在
  - `docs/product/environment_contract.md` ✅ 存在
  - `docs/inception/agent-integration/B-7/logical_design.md` ✅ 作成済み
  - `docs/inception/agent-integration/B-7/scenario_test_design.md` ✅ 作成済み

## 3. TDD実装順序（テストピラミッド準拠）

### 1. Unit テスト (RED → GREEN → REFACTOR)

| # | 対象 | テスト内容 | 実装内容 |
|---|------|----------|---------|
| U1 | ProtectedFileList | `createWithExclusions()` — 除外パターンがフィルタリングされること | 新規ファクトリメソッド |
| U2 | ProtectedFileList | `createWithExclusions()` — 除外対象外は残ること | （U1 と同一メソッド） |
| U3 | ProtectedFileList | `createWithExclusions()` — 全除外時に DEFAULT_PATTERNS フォールバック | フォールバックロジック |
| U4 | ProtectedFileList | `createWithAdditionalAndExclusions()` — 追加 + 除外が正しく合成されること | 統合ファクトリメソッド |
| U5 | AsyncHookToCliTranslator | 除外設定あり時に除外対象ファイルがブロックされないこと | translatePreToolUse 修正 |
| U6 | AsyncHookToCliTranslator | 除外設定あり時に除外対象外ファイルは引き続きブロックされること | （U5 と同一修正） |

**テストファイル**: `scripts/harness/__tests__/unit/agent-integration/protected-file-list.test.ts`（追記）、`hook-to-cli-translator.test.ts`（追記）

### 2. IT テスト (RED → GREEN → REFACTOR)

| # | 対象 | テスト内容 | 実装内容 |
|---|------|----------|---------|
| I1 | HarnessConfigConfigQueryAdapter | `protectedFiles.exclude` ありの fixture から除外リスト取得 | `getProtectedFileExclusions()` 実装 |
| I2 | HarnessConfigConfigQueryAdapter | `protectedFiles` セクションなしの fixture で空配列を返す | デフォルト処理 |

**テストファイル**: `scripts/harness/__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts`（追記）
**Fixture**: `harness-config-with-exclusions.json`（新規）

### 3. スキーマ + Config

| # | 対象 | 内容 |
|---|------|------|
| S1 | `harness-config-v2.schema.json` | `protectedFiles` セクション追加 |
| S2 | `phasegate.config.json` | `protectedFiles.exclude` 設定追加 |

## 4. 実装順序の詳細

```
Step 1: ProtectedFileList VO 拡張（U1-U4）
  1a. RED  — createWithExclusions テスト追加
  1b. GREEN — createWithExclusions 実装
  1c. RED  — createWithAdditionalAndExclusions テスト追加
  1d. GREEN — createWithAdditionalAndExclusions 実装

Step 2: ConfigQueryPort インターフェース拡張
  2a. getProtectedFileExclusions() をポートに追加

Step 3: AsyncHookToCliTranslator 修正（U5-U6）
  3a. RED  — 除外時ブロック回避テスト追加（モック使用）
  3b. GREEN — translatePreToolUse で除外リスト取得 + 統合ファクトリ使用

Step 4: HarnessConfigConfigQueryAdapter 実装（I1-I2）
  4a. Fixture 作成
  4b. RED  — 除外設定読み取りテスト追加
  4c. GREEN — getProtectedFileExclusions() 実装

Step 5: Schema + Config 更新（S1-S2）
  5a. harness-config-v2.schema.json に protectedFiles 追加
  5b. phasegate.config.json に protectedFiles.exclude 設定

Step 6: 全テスト GREEN 確認
  npm run test で全件 PASS
```

## 5. 変更ファイル一覧

### プロダクション（6 ファイル）

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `agent-integration/domain/value-objects/protected-file-list.ts` | 編集 | `createWithExclusions()`, `createWithAdditionalAndExclusions()` 追加 |
| `agent-integration/domain/ports/config-query-port.ts` | 編集 | `getProtectedFileExclusions()` 追加 |
| `agent-integration/domain/services/hook-to-cli-translator.ts` | 編集 | Step 1 で除外リスト適用 |
| `agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts` | 編集 | `getProtectedFileExclusions()` 実装 |
| `config-foundation/infrastructure/schemas/harness-config-v2.schema.json` | 編集 | `protectedFiles` スキーマ追加 |
| `phasegate.config.json` | 編集 | `protectedFiles.exclude` 設定 |

### テスト（3 ファイル）

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `__tests__/unit/agent-integration/protected-file-list.test.ts` | 編集 | U1-U4 テスト追加 |
| `__tests__/unit/agent-integration/hook-to-cli-translator.test.ts` | 編集 | U5-U6 テスト追加 + モック更新 |
| `__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts` | 編集 | I1-I2 テスト追加 |

### Fixture（1 ファイル）

| ファイル | 変更種別 |
|---------|---------|
| `__tests__/integration/agent-integration/fixtures/harness-config-with-exclusions.json` | 新規 |

## 6. リスク

| リスク | 対策 |
|--------|------|
| 既存テストの ConfigQueryPort モックに `getProtectedFileExclusions` がない | テスト内の `buildTranslatorPorts()` ビルダーにデフォルト値追加 |
| phasegate.config.json が schema 違反になる | `protectedFiles` は optional（required に含めない）ので既存 config は互換 |
| INV-4 違反 | 全除外時フォールバック実装で防止 |

## 7. QA（不明点・確認事項）

なし — 論理設計の QA で全て解決済み。
