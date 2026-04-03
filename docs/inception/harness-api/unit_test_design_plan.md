# ユニットテスト設計計画: harness-api

> **作成日**: 2026-03-19
> **対象Unit**: harness-api（Wave 2）
> **対応ストーリー**: H09-01〜H09-04
> **ステータス**: 承認済み（ユーザー承認により即Phase 2実行）

---

## 1. スコープ

対象UnitはWave 2の`harness-api`。CLIコマンド定義・レスポンスenvelopeルール・ExitCode決定・ステータス導出を担うドメイン層の値オブジェクトとドメインサービスが対象。

集約は存在しない（横断契約§6 集約降格方針により`CliCommand`はVOに降格済み）。

### テスト対象コンポーネント一覧

| 種別 | コンポーネント名 | ファイル |
|------|---------------|---------|
| VO | CliCommandDefinition | domain/value-objects/cli-command-definition.ts |
| VO | HarnessApiResponse\<T\> | domain/value-objects/harness-api-response.ts |
| VO | CheckReadyResult | domain/value-objects/check-ready-result.ts |
| VO | PhaseInfo | domain/value-objects/phase-info.ts |
| VO | CiCheckResult | domain/value-objects/ci-check-result.ts |
| VO | DriftReportSummary | domain/value-objects/drift-report-summary.ts |
| VO | HarnessStatusSummary | domain/value-objects/harness-status-summary.ts |
| VO | ArtifactScanResult | domain/value-objects/artifact-scan-result.ts |
| VO | LayerHealth | domain/value-objects/layer-health.ts |
| VO | CommandInputSpec | domain/value-objects/command-input-spec.ts |
| VO | ExitCodeSpec | domain/value-objects/exit-code-spec.ts |
| ドメインサービス | CommandRegistry | domain/services/command-registry.ts |
| ドメインサービス | CommandDispatchService | domain/services/command-dispatch-service.ts |
| ドメインサービス | StatusDerivationService | domain/services/status-derivation-service.ts |

---

## 2. テスト対象分析

### 集約

集約なし（domain_model.md §2 §9-D1参照）。

### エンティティ

エンティティなし。

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| CliCommandDefinition | 3（commandName形式、immutable、値等価性） | 6 |
| HarnessApiResponse\<T\> | 2（INV-3: pass→errors空、INV-4: fail/error→errors非空） | 8 |
| CheckReadyResult | 1（allPassedの整合性） | 4 |
| PhaseInfo | 2（unitId非空、currentLevel正数） | 4 |
| CiCheckResult | 2（INV-5: validatorResults非空、INV-6: allPassedの整合性） | 6 |
| DriftReportSummary | 1（INV-7: totalCount整合性） | 4 |
| HarnessStatusSummary | 1（layers 4件構成） | 4 |
| ArtifactScanResult | 1（foundArtifactsとderivedLayerHealthの整合性） | 4 |
| LayerHealth | 2（LayerId列挙、lastResult列挙） | 5 |
| CommandInputSpec | 1（args/flags配列型） | 3 |
| ExitCodeSpec | 1（定数値 0/1/2） | 3 |

### ドメインサービス

| サービス名 | ビジネスルール数 | テストケース概算 |
|-----------|---------------|---------------|
| CommandRegistry | 2（INV-1: 名前一意性、INV-2: harness:プレフィックス） | 8 |
| CommandDispatchService | 4（8コマンドディスパッチ、ExitCode決定、ポートエラー処理、未登録コマンド処理） | 12 |
| StatusDerivationService | 3（成果物あり→pass、成果物なし→unknown、config反映） | 8 |

**概算合計**: 79ケース

---

## 3. テスト方針

### 正常系/異常系のバランス

- VO: 正常生成 3割、制約違反（不変条件）5割、等値性検証 2割
- ドメインサービス: 正常フロー 4割、異常系（不変条件違反・ポートエラー）4割、境界値 2割

### 境界値テストの対象

| 対象 | 境界値 |
|------|-------|
| CommandName | 空文字列、`harness:` のみ、プレフィックスなし文字列 |
| HarnessApiResponse.errors[] | 空配列（pass時）、1件（fail/error時最小）|
| CiCheckResult.validatorResults[] | 空配列（INV-5違反）、1件（最小正常）|
| DriftReportSummary.totalCount | 0（乖離なし正常）、totalCount != drifts.length（INV-7違反）|
| LayerHealth.lastResult | undefined（enabled=false時）、'pass'/'fail'/'unknown'各値 |
| ExitCodeSpec | 0/1/2以外の値での生成試行 |

### モック戦略

- ドメインサービス（CommandDispatchService）のポートはすべてモック化
- StatusDerivationServiceは純粋計算処理のためポートは不要（ArtifactScanResultを直接渡す）
- CommandRegistryは外部依存なし（モック不要）

---

## 4. QA（不明点・確認事項）

QAなし。ドメインモデル§5の不変条件が明確に定義されているため、テスト設計上の不明点はない。

---

## 5. 前提条件・リスク

- **前提**: `harness-error` の `HarnessError` 型が利用可能であること
- **前提**: TypeScript strict mode での型検査に基づくテスト設計
- **リスク**: `CommandDispatchService` の8コマンドディスパッチテストは各ポートをモックする必要があるため、ドメイン層テストとして境界を明確にすること（ポートインタフェースのモック実装はテスト設計には含めない）
- **注意**: `phasegate:status` コマンドのExitCodeは 0/2 のみ（fail=1を返さない設計 §9-D5）

---

## 6. 計画承認

ユーザーにより承認済み。Phase 2を即実行する。
