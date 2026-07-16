# テストカバレッジレポート: nyquist-validation

@story-id H07-01
@story-id H07-02
@story-id H07-03
@story-id H07-04
> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H07-01〜H07-04
> **分析インプット**:
> - `docs/product/units/nyquist-validation_unit.md`（受け入れ基準）
> - `docs/product/construction/nyquist-validation/domain_model.md`
> - `docs/product/construction/nyquist-validation/logical_design.md`
> - `docs/product/construction/nyquist-validation/unit_test_design.md`
> - `docs/product/construction/nyquist-validation/it_test_design.md`
> - `docs/product/units/integration_contract.md`

---

## 1. サマリー

| 観点 | 評価 | 概要 |
|------|------|------|
| 受け入れ基準カバレッジ | 良好 | H07-01〜H07-04の全16AC中、15ACが直接または間接的にカバーされている。H07-01 AC-5（@storyメタデータ整合性定義）の明示的カバレッジに改善余地あり |
| ドメインロジックカバレッジ | 優秀 | INV-1〜INV-4の全不変条件が複数ケースでカバーされている。CoverageResult算出・AcCoverageGatePolicy・ImpactAnalysisServiceの各ドメインサービスのカバレッジも十分 |
| UseCaseカバレッジ | 優秀 | 4UseCase（ValidateMatrix / CheckAcCoverageGate / CalculateCoverage / AnalyzeImpact）の正常系・異常系が33ケースでカバーされている |
| APIカバレッジ | 良好 | 4ハンドラー・4アダプターが48ケースでカバーされている。終了コード2（実行エラー）経路のカバレッジに一部不足 |
| Engineering Perspective | 概ね良好（要改善2点） | TDD粒度・SOLID分離は良好。一部テスト設計スメルとドメイン表現の改善を推奨 |

**ユニットテスト総数**: 127ケース
**ITテスト総数**: 81ケース（UseCase: 33, Repository: 17, Handler: 21, シード設計: 10）
**合計**: 208ケース

---

## 2. 受け入れ基準カバレッジ詳細

### H07-01: requirement-test-matrix.json新設

#### AC定義と対応テスト（unit_definitionから推定）

| AC | AC内容（推定） | 対応ユニットテスト | 対応ITテスト | カバレッジ |
|----|-------------|----------------|------------|-----------|
| AC-1 | JSONスキーマ定義（必須フィールド・型チェック） | UT-RTM-001〜005, UT-ACM-001〜003, UT-TR-001〜003 | IT-REPO-AjvValidator-001 | 完全カバー |
| AC-2 | 無効なスキーマのバリデーションエラー検出 | UT-RTM-008〜017, UT-ACM-004〜009, UT-TR-004〜009 | IT-REPO-AjvValidator-002〜008, IT-UC-ValidateMatrix-004 | 完全カバー |
| AC-3 | スキーマバリデーション通過するサンプルファイル | UT-RTM-001〜003, UT-MVS-001, UT-MVS-003 | IT-UC-ValidateMatrix-001〜003 | 完全カバー |
| AC-4 | JSONスキーマバリデーションファイルI/O（read/write） | UT-RTM-021〜027（集約操作） | IT-REPO-FileAdapter-001〜008 | 完全カバー |
| AC-5 | @storyメタデータとの整合性定義 | UT-MVS-001〜008（StoryRegistryPort経由のstoryId整合性） | IT-REPO-StoryRegistry-001〜004, IT-UC-ValidateMatrix-006 | **部分カバー**: @storyアノテーション自体の整合性確認はvalidator-system L2-002の責務と明記されており、本Unitのスコープ（storyId一覧照合）はカバーされている。ただし、AC-5の「@storyメタデータとの整合性定義」に対して、MatrixValidationServiceとStoryRegistryPortが提供するstoryId照合以上の責務がある場合、明示的なテストが不足する可能性がある |

**H07-01カバレッジ判定**: 概ね完全（AC-5の責務境界を明確にすること推奨）

---

### H07-02: phase-gate ACマッピング完了チェック追加

| AC | AC内容（推定） | 対応ユニットテスト | 対応ITテスト | カバレッジ |
|----|-------------|----------------|------------|-----------|
| AC-1 | AcCoverageGatePolicyがfail（未マッピングACあり） | UT-ACGP-005〜007, UT-BND-012 | IT-UC-CheckACGate-003〜004 | 完全カバー |
| AC-2 | AcCoverageGatePolicyがpass（全ACマッピング済み） | UT-ACGP-001〜004 | IT-UC-CheckACGate-001〜002 | 完全カバー |
| AC-3 | phase-gate失敗時のHarnessErrorに未マッピングAC一覧を含める | UT-ACGP-008〜010（errorsフィールド・codeフィールド検証） | IT-UC-CheckACGate-003〜004 | 完全カバー |
| AC-4 | validator-systemからAcCoverageGatePolicyを呼び出せること | UT-ACGP-001〜010（ポリシーインターフェース単体テスト） | IT-UC-CheckACGate-001〜008（UseCase経由） | 完全カバー |

**H07-02カバレッジ判定**: 完全

---

### H07-03: test-coverage-checkerでの要件カバレッジ算出

| AC | AC内容（推定） | 対応ユニットテスト | 対応ITテスト | カバレッジ |
|----|-------------|----------------|------------|-----------|
| AC-1 | AC網羅率（マッピング済みAC数/全AC数）算出 | UT-CCS-001〜009, UT-CVR-001〜014 | IT-UC-CalcCoverage-001〜008 | 完全カバー |
| AC-2 | AC網羅率が100%未満の場合、未カバーACの一覧をレポート | UT-CCS-006〜007, UT-CCS-002〜003 | IT-UC-CalcCoverage-007 | 完全カバー |
| AC-3 | コードカバレッジ閾値（standard: 90% / strict: 95%）との対比 | UT-CVR-009〜011（meetsThreshold）, UT-CCS-008〜009 | IT-REPO-Threshold-001〜005, IT-UC-CalcCoverage-002, IT-UC-CalcCoverage-005 | 完全カバー |

**H07-03カバレッジ判定**: 完全

---

### H07-04: phasegate:impact-analysis HXX-XXコマンド

| AC | AC内容（推定） | 対応ユニットテスト | 対応ITテスト | カバレッジ |
|----|-------------|----------------|------------|-----------|
| AC-1 | 正常時: 終了コード0、ストーリー未検出時: 終了コード1 | — | IT-API-AnalyzeImpactHandler-001〜003 | 完全カバー |
| AC-2 | 指定ストーリーIDに紐づくテストケース一覧を特定・出力 | UT-IAS-001〜003, UT-IAR-001〜009 | IT-UC-AnalyzeImpact-001〜004 | 完全カバー |
| AC-3 | 存在しないストーリーID指定時の適切なエラーメッセージ | UT-IAS-004（空ImpactAnalysisResult返却） | IT-API-AnalyzeImpactHandler-003（終了コード1） | 完全カバー |
| AC-4 | 出力にテスト種別（unit/it/scenario）とファイルパスを含める | UT-IAS-001〜002（directTests内TestReference確認） | IT-UC-AnalyzeImpact-001 | 完全カバー |

**H07-04カバレッジ判定**: 完全

---

### 受け入れ基準カバレッジ総括

| ストーリー | 判定 | 備考 |
|----------|------|------|
| H07-01 | 概ね完全 | AC-5の責務境界明確化を推奨 |
| H07-02 | 完全 | — |
| H07-03 | 完全 | — |
| H07-04 | 完全 | — |
| **全体** | **概ね完全（15/16 AC完全カバー）** | — |

---

## 3. ドメインロジックカバレッジ詳細

### 3.1 集約不変条件カバレッジ

| 不変条件 | 条件内容 | カバーケース | 判定 |
|---------|---------|------------|------|
| INV-1 | 同一storyIdのStoryMappingは1つのみ | UT-RTM-006（重複storyId→DuplicateStoryMappingError）, UT-RTM-007（異なるstoryId→正常）, IT-UC-CheckACGate-008 | 完全 |
| INV-2 | AcMapping.acIdは `AC-{n}` 形式 | UT-RTM-008〜012（境界値）, UT-ACM-004〜009（各パターン）, UT-BND-001〜003 | 完全 |
| INV-3 | TestReference.testTypeは `unit\|it\|scenario` | UT-RTM-013〜017（全3種+境界値）, UT-TR-006〜009（不正値） | 完全 |
| INV-4 | TestReference.filePathは空文字でない | UT-RTM-018〜020, UT-TR-004〜005, UT-BND-011 | 完全 |

### 3.2 ドメインサービスカバレッジ

#### AcCoverageGatePolicy

| ルール | カバーケース | 判定 |
|--------|------------|------|
| 全AC TestRef存在→passed=true | UT-ACGP-001〜004（空matrix・空AcMapping含む） | 完全 |
| 未カバーAC存在→passed=false | UT-ACGP-005〜007（1件・複数件・部分未カバー） | 完全 |
| passed=trueのときerrors=空 | UT-ACGP-008 | 完全 |
| passed=falseのときerrors1件以上 | UT-ACGP-009 | 完全 |
| エラーcodeがL3-004 | UT-ACGP-010 | 完全 |

#### CoverageCalculationService

| ルール | カバーケース | 判定 |
|--------|------------|------|
| rate = coveredAcCount / totalAcCount | UT-CCS-001〜005（各比率） | 完全 |
| totalAcCount=0のときrate=1.0 | UT-CCS-004, UT-BND-006 | 完全 |
| uncoveredAcIds収集（複数ストーリー横断） | UT-CCS-006〜007 | 完全 |
| 境界値（1/1=1.0, 1/3=0.3333） | UT-CCS-008〜009 | 完全 |

#### ImpactAnalysisService

| ルール | カバーケース | 判定 |
|--------|------------|------|
| 直接マッピングのみ（v1） | UT-IAS-002（directMappingOnly=true） | 完全 |
| storyId未検出→空ImpactAnalysisResult | UT-IAS-004, UT-BND-014 | 完全 |
| 重複TestReference除去 | UT-IAS-005〜006（filePath+testType複合キー） | 完全 |
| directMappingOnly常にtrue | UT-IAS-007 | 完全 |

#### MatrixValidationService

| ルール | カバーケース | 判定 |
|--------|------------|------|
| storyId整合性（有効・無効・空registry） | UT-MVS-001〜004 | 完全 |
| 複数エラー一括収集 | UT-MVS-005 | 完全 |
| passed=trueのときvalidatedData非null | UT-MVS-006 | 完全 |
| passed=falseのときvalidatedData=null | UT-MVS-007 | 完全 |
| StoryRegistryPortエラー伝播 | UT-MVS-008 | 完全 |

**ドメインロジックカバレッジ総括**: 優秀（全不変条件・全ドメインサービスルールが網羅）

---

## 4. UseCaseカバレッジ詳細

### ValidateMatrixUseCase（H07-01）

| 分類 | ケース数 | カバー内容 | 判定 |
|------|---------|-----------|------|
| 正常系 | 3件（001〜003） | 有効matrix・failFast=true・全ACカバー済み | 完全 |
| スキーマエラー系 | 3件（004〜005, 010） | スキーマ違反・failFast=true打ち切り・複数エラー | 完全 |
| 整合性エラー系 | 2件（006〜007） | storyIdエラー・複合エラー | 完全 |
| I/Oエラー系 | 2件（008〜009） | ファイル不在・StoryRegistryPort失敗 | 完全 |
| **計** | **10件** | | **完全** |

### CheckAcCoverageGateUseCase（H07-02）

| 分類 | ケース数 | カバー内容 | 判定 |
|------|---------|-----------|------|
| 正常系 | 2件（001〜002） | pass・matrix非null返却 | 完全 |
| 未カバーAC | 2件（003〜004） | 1件・複数件 | 完全 |
| バリデーションエラー | 2件（005〜006） | スキーマ違反・storyIdエラー | 完全 |
| I/Oエラー | 2件（007〜008） | ファイル不在・不変条件違反 | 完全 |
| **計** | **8件** | | **完全** |

### CalculateCoverageUseCase（H07-03）

| 分類 | ケース数 | カバー内容 | 判定 |
|------|---------|-----------|------|
| 正常系 | 4件（001〜004） | checkThreshold=false・充足・全網羅・空matrix | 完全 |
| 閾値未達 | 1件（005） | meetsThreshold=false | 完全 |
| エラー系 | 3件（006〜008） | CoverageThresholdPortエラー・uncoveredAcIds列挙・小数点表示 | 完全 |
| **計** | **8件** | | **完全** |

### AnalyzeImpactUseCase（H07-04）

| 分類 | ケース数 | カバー内容 | 判定 |
|------|---------|-----------|------|
| 正常系 | 4件（001〜004） | found=true・directMappingOnly・found=false・重複除去 | 完全 |
| エラー系 | 3件（005〜007） | storyId書式不正・ファイル不在・スキーマ違反 | 完全 |
| **計** | **7件** | | **完全** |

**UseCaseカバレッジ総括**: 優秀（33ケース、正常系・異常系・エッジケースが網羅的）

---

## 5. APIカバレッジ詳細

### 5.1 Infrastructure層（Adapter）カバレッジ

#### FileSystemMatrixFileAdapter

| 操作 | 正常系 | 異常系 | 判定 |
|------|--------|--------|------|
| read | 001（有効JSON） | 002（ファイル不在）, 003（不正JSON）, 004（空ファイル） | 完全 |
| write | 005（書き込み成功） | 006（権限エラー） | 完全 |
| 往復テスト | 008 | — | 完全 |
| アトミック書き込み | TX-001 | — | 完全 |
| 相対パス挙動明示 | 007 | — | 完全 |

#### TraceabilityModelStoryRegistryAdapter

| 操作 | 正常系 | 異常系 | 判定 |
|------|--------|--------|------|
| getValidStoryIds | 001（正常）, 002（空） | 003（エラー）, 004（フォールバック） | 完全 |

#### ConfigFoundationCoverageThresholdAdapter

| 操作 | 正常系 | 異常系 | 判定 |
|------|--------|--------|------|
| getThreshold | 001（standard）, 002（strict）, 003（minimal） | 004（設定失敗）, 005（未知preset） | 完全 |

#### AjvJsonSchemaValidatorAdapter

| 操作 | 正常系 | 異常系 | 判定 |
|------|--------|--------|------|
| validate | 001（有効JSON） | 002〜008（各バリデーションエラーパターン） | 完全 |

### 5.2 Presentation層（Handler）カバレッジ

#### ValidateMatrixHandler

| 分類 | ケース | 終了コード | 判定 |
|------|--------|-----------|------|
| 正常系 | 001（text）, 002（json） | 0 | 完全 |
| バリデーションエラー | 003（スキーマ）, 004（failFast） | 1 | 完全 |
| I/Oエラー | 005（ファイル不在） | 2 | 完全 |
| 引数エラー | 006（引数なし） | 2 | 完全 |

#### CheckAcCoverageGateHandler

| 分類 | ケース | 終了コード | 判定 |
|------|--------|-----------|------|
| 正常系 | 001（text）, 002（json） | 0 | 完全 |
| 未カバーAC | 003 | 1 | 完全 |
| I/Oエラー | 004 | 2 | **部分**: スキーマエラー（005）の終了コードが1で設計されているが、スキーマエラーは"実行失敗"ではなく"バリデーション失敗"のため終了コード2との区別が曖昧 |

#### CalculateCoverageHandler

| 分類 | ケース | 終了コード | 判定 |
|------|--------|-----------|------|
| 正常系 | 001（text）, 002（閾値充足）, 003（json） | 0 | 完全 |
| 閾値未達 | 004 | 1 | 完全 |
| I/Oエラー | 005 | 2 | 完全 |
| スキーマエラー+閾値チェック | 006 | 2 | **確認事項**: CheckAcCoverageGateHandler-005と異なり終了コード2で設計されているため、終了コード設計の一貫性を確認要 |

#### AnalyzeImpactHandler

| 分類 | ケース | 終了コード | 判定 |
|------|--------|-----------|------|
| 正常系 | 001（text）, 002（json） | 0 | 完全 |
| storyId未検出 | 003 | 1 | 完全 |
| エラー系 | 004（書式不正）, 005（ファイル不在）, 006（引数なし） | 2 | 完全 |

**APIカバレッジ総括**: 良好（81ケース。終了コード設計の一貫性に軽微な確認事項あり）

---

## 6. Engineering Perspective 評価

### ケント・ベック視点: TDD適切性

**評価**: 良好（軽微な改善推奨）

#### 強み

- **適切なテスト粒度**: UT-RTM-001〜027の集約テスト、UT-ACM-001〜014のAcMappingテスト、UT-TR-001〜012のTestReferenceテストなど、ドメインモデルの構成要素単位に細分化されており、Red-Green-Refactorサイクルを小さなステップで回せる設計になっている
- **不変条件の独立テスト**: INV-1〜INV-4がそれぞれ独立したテストケース群（UT-RTM-006〜020）でカバーされており、1つの不変条件をグリーンにするためのサイクルが独立している
- **YAGNI遵守**: v1スコープ（直接マッピングのみ）が`directMappingOnly: true`フラグで明示され、間接影響分析のテストがスコープ外として除外されている。UT-IAS-007で将来拡張ポイントの確認はしているが、実装不要な機能のテストは含まれていない

#### 改善推奨

- **UT-RTM-008〜020の冗長性**: INV-2の不変条件テスト（acId形式）がRequirementTestMatrix集約レベル（UT-RTM-008〜012）とAcMappingレベル（UT-ACM-004〜009）の両方に存在する。RequirementTestMatrix集約はAcMappingの生成を委譲しているため、集約レベルでは代表値テスト（UT-RTM-008: `AC-0`, UT-RTM-009: `AC-01`のみ）に絞り、UT-RTM-010〜012はAcMappingのテストへ統合することで、Red-Green-Refactorのステップを明確化できる
- **UT-BND-001〜015の役割**: 横断境界値テスト群は既存のコンポーネント別テストと重複するものが多い（例: UT-BND-001はUT-ACM-001と同等）。重複を整理し、横断テストに本来の境界値テスト（コンポーネント別テストでカバーされていない組み合わせ）のみを残すと、テスト総数を削減しつつカバレッジを維持できる

---

### マーティン・ファウラー視点: テスト設計スメル

**評価**: 概ね良好（2点の設計スメルを指摘）

#### 強み

- **テスト間の独立性**: unit_test_design.mdの全ケースは、モックを`StoryRegistryPort`, `CoverageThresholdPort`, `MatrixFilePort`に限定している。これにより各テストが外部状態に依存せず、実行順序非依存の設計になっている
- **セットアップの明確性**: AAAパターン準拠、`actual`変数への代入、target/context/describe/it構造が規約として明記されており、テストの本質的なアサーションが埋もれない構造になっている
- **ITテストのモック分離**: UseCaseテストではポート全体をモック、Adapterテストでは`node:fs/promises`・外部Unit依存をモックと、テスト対象層ごとにモックレベルが明確に設計されている

#### 指摘: Test Method Too Long リスク（中程度）

- **IT-UC-ValidateMatrix-007**: スキーマエラーと整合性エラーの複合シナリオで、`errors.length === 2`, `schemaErrors.length === 1`, `integrityErrors.length === 1`の3アサーションが1ケースに含まれる。これは2つの独立した振る舞い（スキーマエラー収集・整合性エラー収集）を1ケースに混在させており、フォーラー的には分割を推奨する。ただし、この複合ケースは統合結果を検証する目的として合理的な範囲内であり、強制改善レベルではない
- **IT-REPO-FileAdapter-TX-001**: トランザクションテスト（アトミック書き込み検証）は期待結果の記述（「元ファイルが残ること」）が実装詳細に依存している。Falseの場合の具体的な検証方法（writeが中断された際のファイル状態確認）が曖昧で、テストが複雑化するリスクがある

#### 指摘: Setup過剰リスク（軽度）

- **IT-UC-ValidateMatrix系のモック設定**: ValidateMatrixUseCaseのテストではMatrixFilePort, AjvValidator, MatrixValidationServiceの3つのモック設定が必要で、特にIT-UC-ValidateMatrix-007ではすべてのモックが複雑な振る舞いを返す必要がある。テストフィクスチャ（validatedData等）の共有ヘルパーを事前に設計しておくことで、個々のテストケースのArrangeフェーズを簡潔に保てる

---

### アンクル・ボブ視点: SOLID・責務分離

**評価**: 良好

#### SRP（単一責任原則）: ユニット/ITテストの責務分離

- **適切な分離**: Domain層（RequirementTestMatrix集約・値オブジェクト・ドメインサービス）はすべてunit_test_design.mdでカバーされ、Application層（UseCase）・Infrastructure層（Adapter）・Presentation層（Handler）はit_test_design.mdでカバーされている。責務分離は明確に実現されている
- **MatrixValidationServiceの位置**: MatrixValidationServiceはDomainサービスとして定義されているが、StoryRegistryPort（外部Unit依存）をモックする必要がある。これはDomainサービスとしては珍しいポート依存であり、テスト設計上は適切にモックが設定されている（UT-MVS-*）。ただし、ドメインサービスがポートに依存することへの意識的な判断が設計判断記録（D5）に記載されており、SOLID観点での意図的な設計であることが確認できる

#### DIP（依存性逆転原則）: インターフェース設計

- **適切なポート設計**: MatrixFilePort, StoryRegistryPort, CoverageThresholdPortの3ポートがDomain層に定義され、Infrastructure層のアダプターが実装する構造は、DIPに完全に準拠している
- **AcCoverageGatePolicyのインターフェース**: `shared-kernel/nyquist-validation.ts`から公開されるインターフェースとしてvalidator-systemが消費する設計は、DIPの模範的な実践例である
- **テスト設計へのDIP反映**: UseCaseテストでポートインターフェースをモックしてビジネスロジックを独立してテストする設計は、DIPが正しく実装された結果として適切にテスト可能な状態を示している

#### 各テストケースの単一振る舞いテスト

- **概ね良好**: UT-ACGP-001〜010はAcCoverageGatePolicyの1つのメソッド`check()`の異なるシナリオをテストしており、各ケースが単一の振る舞いを検証している
- **軽微な課題**: IT-UC-CheckACGate-002（`matrix instanceof RequirementTestMatrix`の型確認）はビジネスロジックの振る舞いよりも型/構造の確認に近く、UseCase層のテストとしては若干目的が混在している

---

### エリック・エヴァンス視点: ドメイン表現

**評価**: 良好（1点の改善を推奨）

#### ユビキタス言語の使用

- **適切なドメイン用語**: テストケース名（UT-ACGP-001: 「全ACにTestReferenceが1件以上ある」等）はドメインの概念語（AC, TestReference, StoryMapping, CoverageResult）を使用している。日本語表記のテスト名規約と組み合わさり、ドメインエキスパートが読めるレベルの記述になっている
- **集約境界の適切な表現**: RequirementTestMatrix集約の不変条件テスト（INV-1〜4）が「storyId重複禁止」「AC-{n}形式」等のビジネスルール名で記述されており、ユビキタス言語が維持されている

#### 集約境界の適切性

- **良好**: unit_test_design.mdでは、RequirementTestMatrix集約の境界（storyMappings内のStoryMapping→AcMapping→TestRefの階層）を越えるテストはUseCaseレイヤーのITテストで行われている。ユニットテストは各ドメインオブジェクト単体を対象としており、集約をまたぐ検証はUseCase層に委ねられている

#### 指摘: ドメイン不変条件テストとアプリケーション層テストの混在確認

- **UT-CVR-001〜004（CoverageResultの生成テスト）**: テストケース説明に「`CoverageCalculationService.calculate`経由で生成」と記載されており、値オブジェクトのテストがドメインサービスの振る舞いに依存している。CoverageResultはImmutable VOであるため、その不変条件テスト（constructorの入力バリデーション）は直接ファクトリメソッドを呼ぶべきで、ドメインサービスを経由する必要はない。この設計はCoverageResultのファクトリがCoverageCalculationServiceからしか呼ばれない場合に合理的だが、VOの独立性を保つためにCoverageResult.createのような公開ファクトリを通じた直接テストを推奨する
- **UT-IAS-004の記述**: 「storyId未検出の場合、例外なし・空ImpactAnalysisResultが返される」は正しいドメイン表現だが、BDD的に「storyIdがmatrixに存在しないシナリオ」として記述すると、ドメインの語彙（ImpactAnalysisResultのisPresentなど）との対応がより明確になる

---

### Engineering Perspective 総合判定

| 視点 | 評価 | 主な判定根拠 |
|------|------|------------|
| ケント・ベック（TDD適切性） | 良好 / 軽微改善推奨 | 粒度・YAGNI・ステップ設計は適切。UT-RTM不変条件テストの集約/VO間重複を整理推奨 |
| マーティン・ファウラー（スメル） | 概ね良好 / 2点指摘 | IT-UC-ValidateMatrix-007の複合アサーション・Adapter TX-001の検証曖昧さ |
| アンクル・ボブ（SOLID） | 良好 | Domain/Application/Infrastructure/Presentation層の責務分離とDIPが正しく反映されている |
| エリック・エヴァンス（ドメイン） | 良好 / 1点改善推奨 | CoverageResultの直接VO生成テスト欠如、Service経由のみの構造は改善余地あり |
| **総合** | **良好（実装着手可能）** | 重大なBLOCK事項なし。改善推奨事項は実装前に確認を推奨 |

**Engineering Perspective BLOCK判定**: なし（実装着手可能）

---

## 7. 未カバー項目一覧（優先度付き）

| 優先度 | 項目 | 対象 | 理由 | 推奨対応 |
|--------|------|------|------|---------|
| P1（高） | H07-01 AC-5: @storyメタデータ整合性定義の境界確認 | MatrixValidationService | storyId照合が唯一の整合性チェックか、domain_model.md §5 D5の責務境界がテスト設計に正確に反映されているかを明示すべき | UT-MVS-009を追加して「@storyアノテーション整合性はvalidator-system L2-002の責務であり本UnitではstoryId一覧照合のみを行う」という責務境界を明示するテストを追加する |
| P2（中） | CheckAcCoverageGateHandler終了コード設計 | IT-API-CheckACGateHandler-005 | スキーマエラーの終了コードが1（Fail）か2（Error）か設計上不一致の可能性 | integration_contract.md §3.3の終了コード規約（1=Fail/対象未検出、2=実行エラー）に基づき、スキーマバリデーションエラーがFail（1）かError（2）かを設計文書で明確化し、HandlerテストとUseCaseテストで整合させる |
| P2（中） | CoverageResultの直接VO生成テスト | UT-CVR-001〜004 | CoverageCalculationService.calculate経由のみでVOを生成しており、VOの独立した制約テストが欠如 | CoverageResult.create()またはCoverageResult.fromCounts()のような直接生成ファクトリのテストを追加し、VOの不変条件（rate範囲・coveredAcCount≦totalAcCount）を独立してテストする |
| P3（低） | UT-BND-*の重複整理 | 横断境界値テスト | UT-BND-001〜015の15ケース中8ケースが既存コンポーネント別テストと重複 | 重複するケース（UT-BND-001, 004, 005, 007, 008, 009）を削除し、横断テストには複数コンポーネントをまたぐ境界値組み合わせのみを残す |
| P3（低） | IT-REPO-FileAdapter-TX-001の検証方法明確化 | FileSystemMatrixFileAdapter | アトミック書き込みの検証方法が曖昧（「元ファイルが残ること」の確認手段） | 中断シナリオの具体的な実現方法（一時ファイル経由のアトミック書き込みなど）を論理設計に追記し、テスト検証方法を具体化する |

---

## 8. 推奨追加ケース

### 8.1 P1推奨追加: MatrixValidationServiceの責務境界テスト

```
UT-MVS-009: MatrixValidationServiceは@storyアノテーション整合性チェックを行わないこと
  シナリオ: テストファイルに@story H07-01アノテーションがあっても、MatrixValidationServiceの責務外
  期待結果: MatrixValidationServiceはstoryId一覧照合のみを行い、@storyアノテーション検証は行わない（validator-system L2-002の責務）
  目的: H07-01 AC-5における責務境界の明確化
```

### 8.2 P2推奨追加: CoverageResultの直接生成テスト

```
UT-CVR-015: CoverageResult.create(totalAcCount=4, coveredAcCount=4, rate=1.0, uncoveredAcIds=[]) → 正常生成
UT-CVR-016: CoverageResult.create(totalAcCount=4, coveredAcCount=5, ...) → エラー（coveredAcCount > totalAcCount）
UT-CVR-017: CoverageResult.create(totalAcCount=4, coveredAcCount=2, rate=0.7, ...) → エラー（rate不一致）
  目的: CoverageResultの不変条件を独立してテストし、ドメインサービス（CoverageCalculationService）との結合を排除
```

### 8.3 P2推奨追加: 終了コード一貫性テスト

```
IT-API-CheckACGateHandler-005-revised: スキーマバリデーションエラーの場合の終了コードを明示（1か2かを設計上確定させる）
IT-API-CalcCoverageHandler-006-revised: スキーマバリデーションエラーの終了コードがCheckACGateHandlerと一致することを確認するクロスハンドラーテスト（またはコメントで設計根拠を明示）
```

---

## 9. 次のアクション

| アクション | 優先度 | 担当フェーズ |
|-----------|--------|------------|
| H07-01 AC-5の責務境界を論理設計に明示し、UT-MVS-009を追加する | P1 | unit-test-logic-designer着手前 |
| CheckAcCoverageGateHandlerとCalculateCoverageHandlerの終了コード設計一貫性をlogical_designに明記する | P2 | unit-test-logic-designer着手前 |
| CoverageResultの直接生成ファクトリ（UT-CVR-015〜017相当）をunit_test_design.mdに追記する | P2 | unit-test-logic-designer着手前 |
| UT-BND重複整理（15ケース→7ケース相当に削減）をunit_test_design.mdに反映する | P3 | unit-test-logic-designer着手前（任意） |
| unit-test-logic-designer: 上記改善反映後に疑似コード設計を実施する | — | 次フェーズ |
| it-test-logic-designer: it_test_design.mdに基づきITテストの疑似コード設計を実施する | — | 次フェーズ |
| story-implementor: H07-01からH07-04の順にTDD実装を実施する | — | 次フェーズ以降 |

## WI-155: Traceability Reflection Coverage

@work-item-id WI-155

Coverage report interpretation keeps H story IDs as requirement identifiers while using Work Item IDs for product reflection. WI-125/WI-131 matrix generation and intent coverage are traceable through `@work-item-id`; legacy annotations remain accepted only as source evidence for tests and historical requirement rows.
