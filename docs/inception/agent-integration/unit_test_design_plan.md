# ユニットテスト設計計画: agent-integration

> **作成日**: 2026-03-19
> **対象Unit**: agent-integration（Wave 2）
> **対応ストーリー**: H11-01〜H11-04
> **ステータス**: Phase 1 完了（Phase 2 実行承認済み）

---

## 1. スコープ

### 対象Unitのドメインモデル

`docs/product/construction/agent-integration/domain_model.md` に定義されたドメインモデルが対象。

agent-integrationは「薄いAdapter層」であり、以下の構成でテストを設計する：
- **エンティティ**: 1件（ReentryGuard）
- **値オブジェクト**: 4件（HookEvent、ProtectedFileList、HookTranslationResult、FallbackCapabilitySpec）
- **ドメインサービス**: 2件（HookToCliTranslator、FallbackVerificationService）

### テスト対象コンポーネント一覧

| コンポーネント | 種別 | 優先度 |
|-------------|------|-------|
| ReentryGuard | エンティティ | 高（状態遷移・不変条件あり） |
| HookEvent | 値オブジェクト（Union型） | 中（等値性・型判別） |
| ProtectedFileList | 値オブジェクト | 高（matches()ロジック・制約あり） |
| HookTranslationResult | 値オブジェクト | 高（不変条件INV-2/INV-3あり） |
| FallbackCapabilitySpec | 値オブジェクト | 中（制約INV-5あり） |
| HookToCliTranslator | ドメインサービス | 高（変換ルール6パターン） |
| FallbackVerificationService | ドメインサービス | 高（violation検出ロジック） |

---

## 2. テスト対象分析

### エンティティ

| エンティティ名 | ビジネスルール数 | テストケース概算 |
|--------------|---------------|---------------|
| ReentryGuard | 3（INV-1、activate/deactivate、isActive） | 10〜12件 |

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| HookEvent | 3（Union型: PreToolUse/PostToolUse/Stop） | 6〜8件 |
| ProtectedFileList | 2（INV-4: patterns 1件以上、matches()ロジック） | 10〜12件 |
| HookTranslationResult | 3（INV-2: shouldBlock=trueならcliCommandはundefined、INV-3: skipReasonありならcliCommandはundefined） | 10〜12件 |
| FallbackCapabilitySpec | 2（INV-5: supportedCommands 1件以上、noAgentApiImports） | 6〜8件 |

### ドメインサービス

| サービス名 | ビジネスルール数 | テストケース概算 |
|----------|---------------|---------------|
| HookToCliTranslator | 6（HookEvent種別ごとの変換ルール） | 12〜15件 |
| FallbackVerificationService | 3（importチェック、commandName存在確認、violation出力） | 8〜10件 |

**合計概算**: 62〜77件

---

## 3. テスト方針

### 正常系/異常系のバランス

- **ReentryGuard**: 状態遷移ロジックが核心であるため、正常遷移・異常遷移（二重activate）を均等にカバー
- **値オブジェクト**: 正常生成・制約違反（空リスト等）・不変条件違反を網羅
- **ドメインサービス**: 6パターンの変換ルール全てに正常系ケースを設計し、HOOK_DISABLED/REENTRY_DETECTEDのskipパターンも含む

### 境界値テストの対象

| 対象 | 境界値 |
|------|--------|
| ProtectedFileList.patterns | 空配列（エラー）、1件（最小有効）、複数件 |
| FallbackCapabilitySpec.supportedCommands | 空配列（エラー）、1件（最小有効） |
| HookTranslationResult.timeoutMs | undefined（省略）、500（PostToolUse固定値）、0以下（不正値） |
| ProtectedFileList.matches() | 完全一致、glob パターン一致、不一致、空パス |
| ReentryGuard | inactive→active（正常）、active→active（INV-1違反）、active→inactive（正常） |

### ケースID命名規則

`UT-{略称}-{連番3桁}` 形式を使用

| コンポーネント | 略称 |
|-------------|------|
| ReentryGuard | RG |
| HookEvent | HE |
| ProtectedFileList | PFL |
| HookTranslationResult | HTR |
| FallbackCapabilitySpec | FCS |
| HookToCliTranslator | HTC |
| FallbackVerificationService | FVS |

---

## 4. QA（不明点・確認事項）

### [Question] Q1: ProtectedFileList.matches()のglobパターン照合仕様

ドメインモデルではmatches()の実装詳細が記述されていない。globパターン（`*.json`等）のサポート有無が不明。

**推奨案**: domain_model.md §7 D3に「デフォルト保護対象パターン: `biome.json`, `.biome.json`, `tsconfig.json`, `package.json`」とあり、これらは完全一致パターンであることが示唆される。テスト設計では「完全一致パターン」と「globパターン（`**/*.json`等）」の両方をケースとして設計し、実装時に仕様を確定することとする。

[Answer]
（人間が回答を記入）

### [Question] Q2: HookTranslationResult生成時の不変条件違反の扱い

INV-2「shouldBlock=trueのときcliCommandはundefined」とINV-3「skipReasonがあるときcliCommandはundefined」の違反時に、コンストラクタがエラーをthrowするか、それとも生成を許可してバリデーションを別途行うか。

**推奨案**: ドメイン層の不変条件はコンストラクタで強制するのが典型パターン。HarnessErrorをthrowするテストケースを設計する。

[Answer]
（人間が回答を記入）

---

## 5. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 上位設計 | `domain_model.md` 存在確認済み。`logical_design.md` も参照済み |
| 外部依存 | ドメインサービスのテストではポート（ReentryGuardStatePort等）をモック対象とする |
| 不変条件INV-1〜INV-5 | 全不変条件に対して違反ケースを最低1件設計する |
| ドメインサービスのポート依存 | HookToCliTranslatorはConfigQueryPort・ReentryGuardStatePort・CliCommandRegistryPortに依存。これらはドメインサービステスト時にモックする |
| テストコード不生成 | 本設計はドキュメントのみ。テストコード生成は unit-test-generator に委譲 |
