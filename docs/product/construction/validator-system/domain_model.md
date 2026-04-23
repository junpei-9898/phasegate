# ドメインモデル: validator-system

@story-id H08-01
@story-id H08-02
@story-id H08-03
@story-id H08-04
@story-id H08-05
@story-id H08-06
> **Unit ID**: validator-system
> **作成日**: 2026-03-19
> **最終更新**: 2026-03-19（Wave 2 初版）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H08-01〜H08-06
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| ValidatorDefinition | 値オブジェクト | バリデータの不変定義（validatorId/layer/rules/errorTemplate/externalPolicyRef?） |
| ValidatorId | 値オブジェクト | `L{n}-{nnn}` 形式のバリデータ識別子（L2-001〜L4-003） |
| ValidationResult | 値オブジェクト | バリデーション実行結果スナップショット（pass/fail + HarnessError[]） |
| ValidationRule | 値オブジェクト | ルール名・検証ロジック参照・エラーテンプレートの不変定義 |
| LayerConfig | 値オブジェクト | HarnessConfigV2から注入されるL2/L3/L4設定（enabled/閾値/Preset） |
| DriftReport | 値オブジェクト | 設計⇔コード乖離検出結果（direction/unitName/element/recommendation） |
| ConsistencyReport | 値オブジェクト | 文書間レイヤー整合性検証結果（mismatchPairs/checkTargets） |
| DeadCodeReport | 値オブジェクト | 未使用エクスポート/到達不能コード一覧 |
| ValidatorRegistry | ドメインサービス | 全バリデータ定義カタログ管理・選択実行インターフェース |
| ValidatorExecutionService | ドメインサービス | 順次実行・結果集約オーケストレーション |
| DriftDetectionService | ドメインサービス | 設計⇔コード双方向乖離検出（L4-001） |
| ConsistencyCheckService | ドメインサービス | 文書間レイヤー整合性検証（L4-002） |
| DeadCodeDetectionService | ドメインサービス | 未使用エクスポート・到達不能コード検出（L4-003） |

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | 全バリデータのValidationResult.errorsに使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | LayerConfigの構築元（layers.L2/L3/L4設定） | 読取専用 |
| StoryId | traceability-model | L2-002 metadataバリデータの検証対象storyId照合 | 読取専用 |

### 他Unitへ公開する契約（Cross-Unit Contract）

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| ValidatorRegistry インターフェース | harness-api, quick-mode | ValidatorId一覧（L2-001〜L4-003）+ 選択実行API |
| ValidationResult Contract | harness-api | `{ validatorId, passed, errors: HarnessError[] }` |

---

## 2. Aggregate Boundary

### 結論: 集約なし（ValidatorDefinition VOパターン）

Unit定義では「Validator（集約ルート）」と記載されていたが、横断契約§6の集約降格方針に従い集約を採用しない。

### なぜ集約にしないのか

| 概念 | 理由 |
|------|------|
| Validator（v0案） | enabled状態はHarnessConfigV2から導出される外部依存値。独立したライフサイクルを持たない。biome-ast-engineのRuleDefinitionと同等のVOパターンが先例として確立済み |
| ValidationResult | 実行結果スナップショット。永続化・状態遷移が不要 |
| DriftReport / ConsistencyReport / DeadCodeReport | 一回性の検出結果。永続化不要 |

### 採用パターン

`ValidatorDefinition`（VO）+ `ValidatorRegistry`（ドメインサービス）の組み合わせで、biome-ast-engineの`RuleDefinition`+`RuleDefinitionRegistry`パターンを踏襲する。Consumerは`ValidatorRegistry`を通じてバリデータを選択実行する。内部表現（VOかどうか）はConsumerから隠蔽される。

---

## 3. Model Classification

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| ValidatorId | ✓ | ✓ | `L{n}-{nnn}` 形式。有効範囲: L2-001〜L4-003 |
| ValidatorDefinition | ✓ | ✓ | バリデータ不変定義。validatorId/layer/rules[]/enabledCondition/externalPolicyRef? |
| ValidationRule | ✓ | ✓ | ルール名・エラーテンプレート・fixExample |
| ValidationResult | ✓ | ✓ | passed: boolean, validatorId, errors: HarnessError[], durationMs: number |
| LayerConfig | ✓ | ✓ | layer: 'L2'\|'L3'\|'L4', enabled: boolean, thresholds: Record\<string, number\>, strictOnly: boolean |
| DriftReport | ✓ | ✓ | direction: 'design→code'\|'code→design', unitName, element, recommendation |
| ConsistencyReport | ✓ | ✓ | mismatchPairs: Array\<{expected, actual, location}\>, checkTargets: string[] |
| DeadCodeReport | ✓ | ✓ | unusedExports: string[], unreachableCode: Array\<{filePath, range}\> |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| ValidatorRegistry | 全ValidatorDefinitionのカタログ管理（L2-001〜L4-003の定義登録・ID検索・選択実行委譲） | — |
| ValidatorExecutionService | 指定ValidatorId[]の順次実行・ValidationResult[]集約 | ValidatorConfigPort（LayerConfig取得） |
| DriftDetectionService | 設計文書とソースコードの双方向乖離検出→DriftReport生成 | DesignDocumentPort, SourceCodeAnalyzerPort |
| ConsistencyCheckService | 設計文書間レイヤー整合性の検証→ConsistencyReport生成 | DesignDocumentPort |
| DeadCodeDetectionService | 未使用エクスポート・到達不能コード検出→DeadCodeReport生成 | SourceAnalysisPort |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用バリデータ |
|---------|------|--------------|
| ValidatorConfigPort | HarnessConfigV2からL2/L3/L4のLayerConfigを取得 | 全バリデータ |
| TestQualityAnalyzerPort | テストコードのAAAパターン・命名規約解析結果取得 | L2-003 (test-quality) |
| SecurityPatternScannerPort | ハードコード秘密・SQLインジェクションパターン検出 | L3-001 (security) |
| PerformanceScannerPort | バンドルサイズ・O(n²)ループ等のパフォーマンス問題検出 | L3-002 (performance) |
| CoverageReportPort | テストカバレッジレポート（JSON形式）読み取り | L3-003 (coverage) |
| AcCoveragePolicyPort | nyquist-validationのAcCoverageGatePolicyを取得 | L3-004 (nyquist) |
| PhaseGatePolicyPort | phase-dependency-modelのPhaseGate前提条件取得 | L2-001 (phase-gate) |
| MetadataPolicyPort | traceability-modelのメタデータ検証仕様取得 | L2-002 (metadata) |
| DesignDocumentPort | 設計文書（domain_model.md等）の構造化データ読み取り | L4-001, L4-002 |
| SourceCodeAnalyzerPort | 実装コードのAST解析結果（import一覧・エクスポート一覧）取得 | L4-001, L4-003 |
| SourceAnalysisPort | biome-ast-engineのImportGraph相当データ受け取り（疎結合） | L4-003 (dead-code) |
| AdrReferencePort | adr-foundationへのADR実在性確認 | L4-002 (consistency) |

---

## 5. Domain Rules and Invariants

### ValidatorId不変条件

- **INV-1**: ValidatorIdは `L{n}-{nnn}` 形式（正規表現: `/^L[2-4]-\d{3}$/`）
- **INV-2**: 有効範囲は L2-001〜L4-003 の10バリデータ

```
L2-001: phase-gate
L2-002: metadata
L2-003: test-quality
L3-001: security
L3-002: performance
L3-003: coverage
L3-004: nyquist
L4-001: drift-detect
L4-002: consistency-check
L4-003: dead-code
```

### ValidatorDefinition不変条件

- **INV-3**: `externalPolicyRef`を持つバリデータ（L2-001/L2-002/L3-004）はValidatorRegistryが実行時にポリシーを解決する
- **INV-4**: strictOnly=trueのLayerConfigが必要なバリデータ（L3-002のbundleSizeLimit, L4-003のdeadCodeGC）は、strictプリセット未設定時に自動スキップされる

### ValidationResult不変条件

- **INV-5**: passed=trueの場合、errors[]は空配列
- **INV-6**: HarnessError.codeフィールドにはValidatorId（"L2-003"等）を使用する
- **INV-7**: durationMs >= 0

### LayerConfig不変条件

- **INV-8**: enabled=falseのLayerConfigを持つバリデータはスキップされ、ValidationResultは`{ passed: true, errors: [], skipped: true }`を返す
- **INV-9**: thresholdsのキーはバリデータ固有の閾値名（例: coverageThreshold, bundleSizeLimit）

### DriftReport不変条件

- **INV-10**: directionは `'design→code'`（設計に存在するがコードにない）または `'code→design'`（コードに存在するが設計にない）のいずれか

---

## 6. Validator Catalog

### L2バリデータ（設計品質）

| ValidatorId | 名称 | 検証内容 | externalPolicyRef |
|-------------|------|---------|------------------|
| L2-001 | phase-gate | Phase Gate前提条件の充足確認 | PhaseGatePolicyPort |
| L2-002 | metadata | @unit/@layer/@story等のメタデータ完全性検証 | MetadataPolicyPort |
| L2-003 | test-quality | AAAパターン・命名規約・テスト独立性の検証 | — |

### L3バリデータ（品質特性）

| ValidatorId | 名称 | 検証内容 | externalPolicyRef |
|-------------|------|---------|------------------|
| L3-001 | security | ハードコード秘密・SQLインジェクション等のセキュリティパターン検出 | — |
| L3-002 | performance | バンドルサイズ・O(n²)ループ等のパフォーマンス問題検出 | — |
| L3-003 | coverage | テストカバレッジ閾値との対比（standard: 90% / strict: 95%） | — |
| L3-004 | nyquist | AC網羅率・要件カバレッジ検証 | AcCoveragePolicyPort |

### L4バリデータ（アーキテクチャ整合性）

| ValidatorId | 名称 | 検証内容 | externalPolicyRef |
|-------------|------|---------|------------------|
| L4-001 | drift-detect | 設計文書とコード実装の双方向乖離検出 | — |
| L4-002 | consistency-check | 設計文書間（domain_model.md等）のレイヤー整合性検証 | AdrReferencePort |
| L4-003 | dead-code | 未使用エクスポート・到達不能コード検出（strictプリセット限定でGC推奨） | — |

---

## 7. サブモジュール構造

```
validator-system/
├── domain/
│   ├── value-objects/
│   │   ├── validator-id.ts           # L{n}-{nnn} 形式VOとValidatorId一覧定数
│   │   ├── validator-definition.ts   # バリデータ不変定義VO
│   │   ├── validation-rule.ts        # ルール定義VO
│   │   ├── validation-result.ts      # 実行結果スナップショットVO
│   │   ├── layer-config.ts           # L2/L3/L4設定VO
│   │   ├── drift-report.ts           # 乖離検出結果VO
│   │   ├── consistency-report.ts     # 整合性検証結果VO
│   │   └── dead-code-report.ts       # 未使用コード検出結果VO
│   ├── services/
│   │   ├── validator-registry.ts     # カタログ管理・選択実行（全10定義を保持）
│   │   ├── validator-execution-service.ts  # 順次実行・結果集約
│   │   ├── l4/
│   │   │   ├── drift-detection-service.ts
│   │   │   ├── consistency-check-service.ts
│   │   │   └── dead-code-detection-service.ts
│   └── ports/
│       ├── validator-config-port.ts
│       ├── test-quality-analyzer-port.ts
│       ├── security-pattern-scanner-port.ts
│       ├── performance-scanner-port.ts
│       ├── coverage-report-port.ts
│       ├── ac-coverage-policy-port.ts
│       ├── phase-gate-policy-port.ts
│       ├── metadata-policy-port.ts
│       ├── design-document-port.ts
│       ├── source-code-analyzer-port.ts
│       ├── source-analysis-port.ts
│       └── adr-reference-port.ts
```

---

## 8. Data Flow

```
[ConsumerからのValidatorId[]指定]
         ↓
ValidatorRegistry.select(validatorIds[])
         ↓
ValidatorConfigPort → LayerConfig（enabled/thresholds/strictOnly）
         ↓
enabled=falseはスキップ → ValidationResult{skipped: true}
         ↓
enabled=trueバリデータ → 各Analyzerポート呼び出し
         ↓
（L2-001）PhaseGatePolicyPort → 前提条件チェック
（L2-002）MetadataPolicyPort → メタデータ完全性チェック
（L2-003）TestQualityAnalyzerPort → AAAパターンチェック
（L3-001）SecurityPatternScannerPort → セキュリティパターン検出
（L3-002）PerformanceScannerPort → パフォーマンス問題検出
（L3-003）CoverageReportPort → カバレッジ閾値比較
（L3-004）AcCoveragePolicyPort → AC網羅率検証
（L4-001）DesignDocumentPort+SourceCodeAnalyzerPort → 乖離検出 → DriftReport
（L4-002）DesignDocumentPort+AdrReferencePort → 整合性検証 → ConsistencyReport
（L4-003）SourceAnalysisPort → 未使用コード検出 → DeadCodeReport
         ↓
ValidationResult[] → ValidatorExecutionService.aggregate()
         ↓
[HarnessError[]形式の統合レポート → harness-api]
```

---

## 9. 設計判断記録

### D1: ValidatorをVOに降格した理由

Unit定義の「Validator（集約ルート）」をValidatorDefinition VOに変更。enabled状態はHarnessConfigV2から導出される外部依存値であり独立ライフサイクルを持たない。biome-ast-engineのRuleDefinition VOパターンの先例に従い、ValidatorRegistry（ドメインサービス）がカタログ管理を担当する設計を採用した。ConsumerはValidatorRegistryを通じてバリデータを選択実行するインターフェースを使用し、内部表現はConsumerから隠蔽される。

### D2: externalPolicyRefパターン

L2-001（phase-gate）/L2-002（metadata）/L3-004（nyquist）は他Unit定義のポリシーを実行する「他Unit定義ロジックを本Unitが実行する」パターン。ValidatorDefinition内の`externalPolicyRef?: string`フィールドで宣言的に記録し、ValidatorRegistryが実行時にPortを通じてポリシーを解決する。

### D3: L4バリデータのDomain/Infraレイヤー分離

drift-detect（L4-001）はMarkdownパースと比較ロジックを伴う。ドメイン層は「何を比較するか（比較ルール・乖離の定義）」を持ち、実際のファイル読み取りとMarkdownパースはインフラ層のPortが担当する。DesignDocumentPortとSourceCodeAnalyzerPortを定義することでドメイン層はデータ構造の比較ロジックのみを持つ設計を維持する。

### D4: DeadCodeDetectionServiceとbiome-ast-engine疎結合

dead-code検出（L4-003）はimportグラフ解析を伴うが、biome-ast-engineのImportGraphを直接importするのではなく、SourceAnalysisPortを通じて構造化データを受け取ることで依存を疎結合に保つ。
