# ユニットテスト設計計画: validator-system

> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H08-01〜H08-06
> **ステータス**: 承認済み（ユーザー承認済みのためPhase 2即実行）

---

## 1. スコープ

### 対象Unit

`validator-system` ドメイン層の値オブジェクト8種 + ドメインサービス5種

### テスト対象コンポーネント一覧

| コンポーネント種別 | ファイル | テスト対象 |
|----------------|---------|---------|
| 値オブジェクト | `domain/value-objects/validator-id.ts` | ValidatorId |
| 値オブジェクト | `domain/value-objects/validator-definition.ts` | ValidatorDefinition |
| 値オブジェクト | `domain/value-objects/validation-rule.ts` | ValidationRule |
| 値オブジェクト | `domain/value-objects/validation-result.ts` | ValidationResult |
| 値オブジェクト | `domain/value-objects/layer-config.ts` | LayerConfig |
| 値オブジェクト | `domain/value-objects/drift-report.ts` | DriftReport |
| 値オブジェクト | `domain/value-objects/consistency-report.ts` | ConsistencyReport |
| 値オブジェクト | `domain/value-objects/dead-code-report.ts` | DeadCodeReport |
| ドメインサービス | `domain/services/validator-registry.ts` | ValidatorRegistry |
| ドメインサービス | `domain/services/validator-execution-service.ts` | ValidatorExecutionService |
| ドメインサービス | `domain/services/l4/drift-detection-service.ts` | DriftDetectionService |
| ドメインサービス | `domain/services/l4/consistency-check-service.ts` | ConsistencyCheckService |
| ドメインサービス | `domain/services/l4/dead-code-detection-service.ts` | DeadCodeDetectionService |

---

## 2. テスト対象分析

### 集約

集約なし（ValidatorDefinition VOパターン採用。`domain_model.md §2` 参照）

### エンティティ

エンティティなし（全コンポーネントが値オブジェクトまたはドメインサービス）

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| ValidatorId | 2（INV-1: 形式制約, INV-2: 有効範囲） | 15ケース |
| ValidatorDefinition | 3（INV-3: externalPolicyRef, INV-4: strictOnly, layerId一致） | 12ケース |
| ValidationRule | 1（ruleName等価性） | 6ケース |
| ValidationResult | 4（INV-5: pass/errors, INV-6: ErrorCode, INV-7: durationMs, INV-8: skip） | 18ケース |
| LayerConfig | 3（INV-8: enabled=false, INV-9: thresholds, strictOnly制御） | 12ケース |
| DriftReport | 2（INV-10: direction, toHarnessError変換） | 8ケース |
| ConsistencyReport | 1（hasMismatches等価性） | 7ケース |
| DeadCodeReport | 1（hasDeadCode等価性） | 7ケース |

### ドメインサービス

| サービス名 | ビジネスルール数 | テストケース概算 |
|-----------|---------------|---------------|
| ValidatorRegistry | 4（登録・検索・重複禁止・レイヤーフィルタ） | 15ケース |
| ValidatorExecutionService | 4（enabled判定・strictOnly判定・順次実行・エラーキャッチ） | 14ケース |
| DriftDetectionService | 2（双方向検出・DriftReport生成） | 8ケース |
| ConsistencyCheckService | 2（不整合検出・ConsistencyReport生成） | 7ケース |
| DeadCodeDetectionService | 2（未使用エクスポート検出・到達不能コード検出） | 7ケース |

**合計概算**: 約136ケース

---

## 3. テスト方針

### 正常系/異常系のバランス

- 値オブジェクト: 正常系60% / 異常系（バリデーション失敗）40%
- ドメインサービス: 正常系50% / 異常系（例外・スキップ）50%
- ドメインサービスのPortはモック利用（テスト規約「モックオブジェクトは外部依存に対してのみ利用する」準拠）

### 境界値テストの対象

- `ValidatorId`: L2-001（最小有効値）, L4-003（最大有効値）, L5-001（範囲外）, L2-000（連番下限）, L2-004（L2レイヤー範囲外）
- `ValidationResult.durationMs`: 0（境界値）, -1（無効値）
- `LayerConfig.thresholds`: 0（下限）, 100（上限）, 101（超過）

### テスト規約遵守事項（`docs/principles/testing-rules.md`）

- テストケース名は全て日本語
- AAAパターンで記述
- `actual` 変数に実行結果を代入
- `target()` / `describe()` / `context()` / `it()` 構造
- ファイル名はkebab-case

---

## 4. QA（不明点・確認事項）

なし（ドメインモデル・論理設計から十分な情報が得られているため）

---

## 5. 前提条件・リスク

- `ValidatorExecutionService` のドメインサービステストでは、10種のPortをすべてモックする必要がある。テストヘルパーでモック生成を共通化することを推奨する
- `DriftDetectionService` / `ConsistencyCheckService` / `DeadCodeDetectionService` の詳細実行ロジックは論理設計の後半部分に記載があるが、ドメインモデルに定義された責務・出力型（DriftReport等）でユニットテスト設計は完結できる
- Port実装（Infraアダプタ）のテストはユニットテスト設計スコープ外（インテグレーションテストで担保）
