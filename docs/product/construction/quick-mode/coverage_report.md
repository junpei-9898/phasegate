# テストカバレッジレポート: quick-mode

@story-id H10-01
@story-id H10-02
@story-id H10-03
> **作成日**: 2026-03-19
> **対象Unit**: quick-mode
> **対応ストーリー**: H10-01, H10-02, H10-03
> **Wave**: 2（コア品質機構）
> **参照計画**: `docs/inception/quick-mode/test_coverage_plan.md`

---

## 1. サマリー

| 観点 | テストケース総数 | カバー済み | 未カバー | カバレッジ率 |
|------|--------------|----------|---------|-----------|
| 受け入れ基準（AC） | 18項目 | 16項目 | 2項目 | 88.9% |
| ドメイン不変条件（INV） | 15項目 | 13項目 | 2項目 | 86.7% |
| UseCase（正常系/異常系） | 3 UseCase × 正常系+異常系 | 3/3 UseCase | 一部不足 | — |
| API（Handler/Formatter） | 4コンポーネント | 4/4 | 一部不足 | — |

### ユニットテストケース総数: 150件（13ファイル）
### ITテストケース総数: 約80件（UseCaseIT + AdapterIT + HandlerIT + FormatterIT）

**総合評価: B+ （実装可能水準。優先度Highの追加2件を推奨）**

---

## 2. 受け入れ基準カバレッジ詳細

### H10-01 Quick Mode設定

| AC | 内容 | カバーするテストケース | 判定 |
|----|------|---------------------|------|
| AC-01-1 | `allowedCategories` が設定可能 | UT-QMC-001, IT-REPO-Config-001, IT-REPO-Config-003 | COVERED |
| AC-01-2 | `maintainedLayers` が設定可能（デフォルト: L1, L2） | UT-QMC-008, IT-REPO-Config-001, IT-UC-Build-003 | COVERED |
| AC-01-3 | `relaxedGates` が設定可能（デフォルト: phase-gate, 2-phase-execution） | UT-QMC-010, IT-REPO-Config-001 | COVERED |
| AC-01-4 | JSONスキーマバリデーション通過 | IT-REPO-Config-001, IT-REPO-Config-003 | PARTIAL ※1 |

### H10-02 Quick Mode判定エンジン

| AC | 内容 | カバーするテストケース | 判定 |
|----|------|---------------------|------|
| AC-02-1 | 変更ファイルからQuick Mode対象/外を自動分類 | UT-JE-001〜UT-JE-008, IT-UC-Judge-001〜004 | COVERED |
| AC-02-2 | 混在変更拒否（MIXED_CHANGES） | UT-JE-011, UT-JE-012, IT-UC-Judge-005, IT-UC-Judge-008, UT-EDGE-011 | COVERED |
| AC-02-3 | 新ドメイン拒否（NEW_DOMAIN） | UT-JE-013, UT-JE-014, IT-UC-Judge-006 | COVERED |
| AC-02-4 | API契約変更拒否（API_CONTRACT） | UT-JE-015, UT-JE-016, IT-UC-Judge-007 | COVERED |
| AC-02-5 | 判定結果に適用可否と根拠を含める | UT-QME-001〜004, UT-JUC-010〜013, IT-UC-Judge-001 | COVERED |
| AC-02-6 | 境界ケースの自動テストが存在すること | UT-EDGE-001〜015, IT-UC-Judge-004, UT-JE-010 | COVERED |
| AC-02-7 | 評価順序: MIXED_CHANGES → NEW_DOMAIN → API_CONTRACT | UT-JE-017, UT-JE-018, UT-EDGE-011 | COVERED |

### H10-03 バリデータ緩和実行

| AC | 内容 | カバーするテストケース | 判定 |
|----|------|---------------------|------|
| AC-03-1 | L1 全維持（全8ルール） | UT-VRP-001, UT-VRS-004, IT-UC-Build-001, IT-UC-Build-002 | COVERED |
| AC-03-2 | L2 選択実行（metadata/test-quality維持、phase-gateスキップ） | UT-VRP-002, UT-VRP-008〜011, UT-VRS-001〜003, IT-UC-Build-001 | COVERED |
| AC-03-3 | L3 securityのみ維持 | UT-VRP-003, UT-VRS-001, IT-UC-Build-001 | COVERED |
| AC-03-4 | L4 全スキップ | UT-VRP-001, UT-VRS-005, IT-UC-Build-001, IT-UC-Build-002 | COVERED |
| AC-03-5 | 2-Phase Execution緩和 | UT-VRP-001（phaseExecution.twoPhaseRequired=false）, IT-UC-Build-001, IT-UC-Build-002 | COVERED |
| AC-03-6 | eligible=falseの場合はプロファイルを生成しない | UT-QMD-002, UT-QMD-008, UT-BUC-004, IT-UC-Build-004, IT-UC-Build-005 | COVERED |

**※1 PARTIAL備考**: JSONスキーマバリデーション自体のスキーマ定義テスト（config-foundationのスキーマ検証）は本Unitの範囲外。quick-mode側のバリデーションロジック（QuickModeConfig.create()のバリデーション）はCOVERED。

---

## 3. ドメインロジックカバレッジ詳細

### 3拒否ルール（ハードコード不変条件）

| 不変条件 | 説明 | カバーするテストケース | 判定 |
|---------|------|---------------------|------|
| 評価順序固定 | MIXED_CHANGES→NEW_DOMAIN→API_CONTRACTの固定順 | UT-JE-017, UT-JE-018, UT-EDGE-011 | COVERED |
| allowedCategoriesで上書き不可 | 3拒否ルールはconfig設定で変更不可 | UT-JE-020, UT-QMC-003〜005（domain/api/featureをallowedに含む場合のエラー） | COVERED |
| domain/api/featureのallowedCategories設定不可 | QuickModeConfig生成時の二重防護 | UT-QMC-003, UT-QMC-004, UT-QMC-005, UT-EDGE-002, IT-REPO-Config-006 | COVERED |

### QuickModeEligibility 不変条件（INV-E1〜E3）

| 不変条件 | 説明 | カバーするテストケース | 判定 |
|---------|------|---------------------|------|
| INV-E1 | eligible=trueのときrejectionRule/rejectedFilesはundefined | UT-QME-001, UT-QME-010, UT-QME-011, UT-JUC-010, UT-JUC-011 | COVERED |
| INV-E2 | eligible=falseのときrejectedFiles.length >= 1 | UT-QME-003, UT-QME-004, UT-QME-012, UT-EDGE-006 | COVERED |
| INV-E3 | reasonは空文字でないこと | UT-QME-002, UT-QME-005, UT-EDGE-007, UT-JUC-013 | COVERED |

### ValidatorRelaxationProfile 不変条件（INV-P1〜P6）

| 不変条件 | 説明 | カバーするテストケース | 判定 |
|---------|------|---------------------|------|
| INV-P1 | levelDependencyRelaxedは常にfalse | UT-VRP-014, UT-VRS-007, IT-UC-Build-002 | COVERED |
| INV-P2 | l1.allは常にtrue（L1緩和禁止） | UT-VRP-001, UT-VRS-004, UT-BUC-005, IT-UC-Build-002 | COVERED |
| INV-P3 | l4.allは常にfalse（L4全スキップ） | UT-VRP-001, UT-VRS-005, UT-BUC-006, IT-UC-Build-002 | COVERED |
| INV-P4 | phaseExecution.twoPhaseRequiredは常にfalse | UT-VRP-001, UT-VRS-008, UT-BUC-007, IT-UC-Build-002 | COVERED |
| INV-P5 | l2.maintained∪l2.skipped = {L2-001, L2-002, L2-003} | UT-VRP-004, UT-VRP-005, UT-EDGE-008, IT-UC-Build-002 | COVERED |
| INV-P6 | l3.maintained∪l3.skipped = {L3-001, L3-002, L3-003, L3-004} | UT-VRP-006, UT-VRP-007, UT-EDGE-009, IT-UC-Build-002 | COVERED |

### QuickModeDecision 不変条件（INV-D1〜D2）

| 不変条件 | 説明 | カバーするテストケース | 判定 |
|---------|------|---------------------|------|
| INV-D1 | eligible=falseのときrelaxationProfile===undefined | UT-QMD-002, UT-QMD-008, UT-EUC-001, IT-UC-Execute-002 | COVERED |
| INV-D2 | eligible=trueのときrelaxationProfile!==undefined | UT-QMD-001, UT-BUC-001, IT-UC-Execute-001 | COVERED |

### K要件対応不変条件（domain_model.md §5）

| 不変条件 | 説明 | カバーするテストケース | 判定 |
|---------|------|---------------------|------|
| INV-1 (K14) | Level間依存はQuick Modeでも絶対緩和しない | UT-JE-019 | PARTIAL ※2 |
| INV-2 (K14) | Quick Modeが緩和するのはLevel内の一部ゲートのみ | UT-JE-019（間接的）, UT-VRP-001 | PARTIAL ※2 |
| INV-3 (K14) | ValidatorRelaxationProfile.levelDependencyRelaxedは常にfalse | INV-P1と重複。COVERED | COVERED |

**※2 PARTIAL備考**: INV-1/INV-2はUT-JE-019で「判定結果にLevel間依存緩和の情報が含まれないこと」として抽象的にカバーされているが、Level間依存構造（例: L2がL1を必要とする関係）が実際に維持されているかを直接検証するテストケースが不足している。

### ChangeClassification分類ロジック

| 分類条件 | カバーするテストケース | 判定 |
|---------|---------------------|------|
| bugfix（domain/以外 MODIFY） | UT-JE-008, IT-UC-Judge-001 | COVERED |
| docs（docs/配下） | UT-JE-002, IT-UC-Judge-003（*.test.ts → test）, IT-UC-Judge-009 | COVERED |
| test（__tests__/配下 or *.test.ts） | UT-JE-003, IT-UC-Judge-003 | COVERED |
| config（*.config.json等） | UT-JE-004 | COVERED |
| feature（domain/port/以外 CREATE） | UT-JE-007, UT-JE-012 | COVERED |
| domain（domain/配下） | UT-JE-005, IT-UC-Judge-005 | COVERED |
| api（*port.ts / *adapter.ts） | UT-JE-006, IT-UC-Judge-007 | COVERED |
| 優先度（api > domain > feature > 他） | UT-CCLS-007, UT-CCLS-008, UT-JE-006（apiがdomainより優先） | COVERED |

---

## 4. UseCaseカバレッジ詳細

### JudgeQuickModeEligibilityUseCase

| テストシナリオ | UT対応 | IT対応 | 判定 |
|-------------|------|------|------|
| changedFiles省略 → ポート経由取得 | UT-JUC-001 | IT-UC-Judge-001 | COVERED |
| changedFiles明示指定 → ポート未呼出 | UT-JUC-002 | IT-UC-Judge-002 | COVERED |
| 空changedFiles → eligible=true | UT-JE-010, UT-EDGE-010 | IT-UC-Judge-004 | COVERED |
| allowedCategories内のみ → eligible=true | UT-JUC-003 | IT-UC-Judge-001, IT-UC-Judge-009 | COVERED |
| MIXED_CHANGESルール | UT-JUC-004 | IT-UC-Judge-005, IT-UC-Judge-008 | COVERED |
| NEW_DOMAINルール | UT-JUC-005 | IT-UC-Judge-006 | COVERED |
| API_CONTRACTルール | UT-JUC-006 | IT-UC-Judge-007 | COVERED |
| 不明なchangeKindエラー | UT-JUC-007 | — | PARTIAL ※3 |
| ConfigPortエラー伝播 | UT-JUC-008 | IT-UC-Judge-011 | COVERED |
| ChangedFilesPortエラー伝播 | UT-JUC-009 | IT-UC-Judge-010 | COVERED |
| 返り値がObject.freeze済み | UT-JUC-014 | IT-UC-Judge-012 | COVERED |

### BuildRelaxationProfileUseCase

| テストシナリオ | UT対応 | IT対応 | 判定 |
|-------------|------|------|------|
| eligible=true → プロファイル生成 | UT-BUC-001 | IT-UC-Build-001 | COVERED |
| デフォルト設定でのプロファイル内容確認 | UT-BUC-002, UT-BUC-005〜007 | IT-UC-Build-001, IT-UC-Build-002 | COVERED |
| カスタムmaintainedLayersでのプロファイル | UT-VRS-002, UT-VRS-003 | IT-UC-Build-003 | COVERED |
| eligible=false → QuickModeNotEligibleError | UT-BUC-004, UT-EDGE-012 | IT-UC-Build-004, IT-UC-Build-005 | COVERED |
| INV-P1〜P6全充足確認 | UT-BUC-003, UT-BUC-005〜007 | IT-UC-Build-002 | COVERED |
| ConfigPortエラー伝播 | UT-BUC-008 | IT-UC-Build-006 | COVERED |
| RegistryPortエラー伝播 | UT-BUC-009 | IT-UC-Build-007 | COVERED |

### ExecuteQuickCiCheckUseCase

| テストシナリオ | UT対応 | IT対応 | 判定 |
|-------------|------|------|------|
| eligible=false → relaxationProfile=undefined | UT-EUC-001 | IT-UC-Execute-002 | COVERED |
| eligible=false → BuildUseCase未呼出 | UT-EUC-002 | IT-UC-Execute-003 | COVERED |
| eligible=true + dryRun=false → validator指示実行 | UT-EUC-004 | IT-UC-Execute-001 | COVERED |
| eligible=true + dryRun=true → validator指示スキップ | UT-EUC-005 | IT-UC-Execute-004 | COVERED |
| dryRun=trueでもプロファイルは生成される | UT-EUC-006 | — | PARTIAL ※4 |
| changedFiles省略時の引数伝播 | UT-EUC-007 | — | PARTIAL ※4 |
| changedFiles明示指定時の引数伝播 | UT-EUC-008 | IT-UC-Execute-005 | COVERED |
| JudgeUseCase例外伝播 | UT-EUC-009 | IT-UC-Execute-006 | COVERED |
| BuildUseCase例外伝播 | UT-EUC-010 | IT-UC-Execute-007 | COVERED |

**※3 PARTIAL備考**: UT-JUC-007は「不明なchangeKind」のエラーをUTでカバーするが、IT（統合）レベルのテストが不在。実際にはAdapterレイヤーで変換済みのため低リスク。
**※4 PARTIAL備考**: IT-UC-Execute-004はdryRun=trueのvalidator指示スキップをカバー済みだが、dryRun=trueでプロファイルが生成されることを直接ITで確認するケースが不在。

---

## 5. APIカバレッジ詳細

### CiCheckQuickModeHandler

| テストシナリオ | ITケース | 判定 |
|-------------|---------|------|
| --fail-on-reject未指定 + eligible=false → 終了コード0 | IT-API-Handler-001 | COVERED |
| --fail-on-reject + eligible=false → 終了コード1 | IT-API-Handler-002 | COVERED |
| --fail-on-reject + eligible=true → 終了コード0 | IT-API-Handler-003 | COVERED |
| UseCase例外 → 終了コード2 | IT-API-Handler-004 | COVERED |
| --dry-run フラグ伝播 | IT-API-Handler-005 | COVERED |
| --dry-run未指定 → dryRun=false | IT-API-Handler-006 | COVERED |
| --files フラグ伝播 | IT-API-Handler-007 | COVERED |
| --files未指定 → changedFiles=undefined | IT-API-Handler-008 | COVERED |
| --format human → 人間可読出力 | IT-API-Handler-009 | COVERED |
| --format json → JSON出力 | IT-API-Handler-010 | COVERED |
| --format agent → エージェント向け詳細出力 | IT-API-Handler-011 | COVERED |
| --format未指定時のデフォルト（human） | — | UNCOVERED ※5 |

### HumanQuickModeFormatter

| テストシナリオ | ITケース | 判定 |
|-------------|---------|------|
| eligible=true（承認）の出力形式 | IT-API-HumanFmt-001 | COVERED |
| eligible=false + MIXED_CHANGES の出力形式 | IT-API-HumanFmt-002 | COVERED |
| eligible=false + NEW_DOMAIN の出力形式 | IT-API-HumanFmt-003 | COVERED |
| eligible=false + API_CONTRACT の出力形式 | IT-API-HumanFmt-004 | COVERED |
| 決定論的出力（同一入力→同一出力） | IT-API-HumanFmt-005 | COVERED |
| 末尾改行の保証 | IT-API-HumanFmt-001（期待値に含まれる） | COVERED |

### AgentQuickModeFormatter

| テストシナリオ | ITケース | 判定 |
|-------------|---------|------|
| rejected Decision の rejectedFiles詳細出力 | IT-API-AgentFmt-001 | COVERED |
| approved Decision のスキップされたValidatorId出力 | IT-API-AgentFmt-002 | COVERED |
| approved Decision の維持されるValidatorId出力 | IT-API-AgentFmt-003 | COVERED |
| 決定論的出力 | IT-API-AgentFmt-004 | COVERED |
| eligible=true かつ relaxationProfile=undefined（異常系） | — | UNCOVERED ※6 |

### JsonQuickModeFormatter

| テストシナリオ | ITケース | 判定 |
|-------------|---------|------|
| approved Decision のJSON出力 | IT-API-JsonFmt-001, IT-API-JsonFmt-003 | COVERED |
| rejected Decision のJSON出力 | IT-API-JsonFmt-002 | COVERED |
| JSON.parseで構造再現可能 | IT-API-JsonFmt-003 | COVERED |
| 決定論的出力 | IT-API-JsonFmt-004 | COVERED |

**※5 UNCOVERED備考**: `--format`未指定時のデフォルト動作（humanが選択されること）を検証するITケースが不在。UT-レベルでも記載なし。
**※6 UNCOVERED備考**: AgentFormatterに対し、理論上ありえないが`eligible=true`かつ`relaxationProfile=undefined`のような異常データが渡された場合の防御テストが不在。

---

## 6. Engineering Perspective 評価

### ケント・ベック視点: TDD適切性

**評価: 良好 (A-)**

**強み:**
- テストケースが1機能1テストの粒度で定義されており、Red-Green-Refactorサイクルを想定した小さなステップでの実装が可能な設計になっている。特にUT-QMC-001〜014（QuickModeConfig）の14件は生成ルール→メソッド→不変条件の順で段階的にカバーしており、TDDでの実装順序と対応する。
- 値オブジェクトの不変条件テストは実装よりも先に仕様を確定させるTDDの「仕様書としてのテスト」の役割を果たしている。
- 境界値テスト（UT-EDGE-001〜015）は全て独立したケースとして定義されており、最小の失敗ユニットを特定できる。

**課題:**
- UT-JE-019（INV-1: Level間依存はQuick Modeでも緩和しない）の内容が「判定結果にLevel間依存緩和の情報が含まれないこと」と抽象的で、Red段階での失敗が何を意味するか不明瞭。「`ValidatorRelaxationProfile.levelDependencyRelaxed === false`を確認する」と言い換えれば十分で、現在の表現はYAGNI境界が曖昧。
- UT-EUC-004（validator-systemへの緩和指示が実行されること）はValidatorSystemへの実行Port呼び出しをテストするが、そのPortが`ExecuteQuickCiCheckUseCase`のコンストラクタ依存として論理設計（logical_design.md §4.4）に明記されていない。実装時に「どのPortをモックするか」が不明確になる可能性があり、TDDでの実装計画が揺れる。

### マーティン・ファウラー視点: テスト設計スメル

**評価: 良好 (B+)**

**強み:**
- テストケース名が日本語で記述されており、context/it構造も明確。ITテストの表形式記述（シナリオ/入力/モック設定/期待結果）は本質を見やすくする良い設計。
- UT-CC-008（'docs'/'test'/'config'の場合はfalseが返ること）のように複数値を1ケースにまとめているケースがあるが、これらは同等クラスのメンバーとして扱え適切なコンパクト化。
- IT-UC-Build-002は「INV-P1〜INV-P6をすべて満たすこと」を1ケースで検証するが、これは統合テスト（IT）レベルでのスモーク的確認であり、各不変条件のUT（UT-VRP-001〜007）が別途存在しているため責務分担は適切。

**課題:**
- **Test Method Too Long リスク**: IT-UC-Build-001の期待結果が非常に長い（維持IDリスト全体の列挙）。実装時にこれを1つのassert blockに詰め込むと可読性が下がる。Split into targeted assertions（`actual.l2.maintained`は別のit節で検証するなど）を検討すべき。
- **Fixture重複リスク**: `quick-mode-decision-approved.fixture.ts`と`quick-mode-decision-rejected.fixture.ts`が複数のFormatter ITテストで共有される設計は良い。一方でIT-UC-Judge系のテストが都度モック設定を記述しており、判定エンジンの「デフォルト設定」インラインデータが各ケースで重複している。共通Fixtureへの昇格が推奨される。
- UT-CCLS系のテストは「`classify()`の返り値を通じた振る舞いを検証する」とあるが、ChangeClassificationが直接インスタンス化できないため`classify()`への入力配列の構築コードがセットアップに集中しやすい。テスト名から「Engineのclassifyを通じた検証」であることが明記されているのは好ましい。

### アンクル・ボブ視点: SOLID・責務分離

**評価: 優秀 (A)**

**強み:**
- **SRP（単一責務）の遵守**: UT（ドメインVO+Service、UseCase）とIT（Adapter、Handler、Formatter）の責務分離が明確。UT-JUC（UseCase単体）ではPortのみをモックし、Domainサービスを実体で使う方針（unit_test_design.md §1「モック方針」）は適切なSRP適用。
- **DIP（依存性逆転原則）の体現**: ChangedFilesPort / QuickModeConfigPort / ValidatorIdRegistryPort が全てインターフェースとして定義され、UseCase ITテストでPortをvi.fn()でモック可能な設計。`port`という語彙がテストケースにも一貫して現れている。
- **OCP遵守の検証**: ValidatorSystemValidatorIdRegistryAdapterの静的定義テスト（IT-REPO-Registry-001〜006）は「validator-system正式Registryへの差し替え」という開放/閉鎖原則の前提を契約レベルで担保している。
- UT-EUC-002（eligible=falseのときBuildUseCaseが呼ばれないこと）はUseCaseの分離（H10-01 UseCase完了後にH10-02 UseCase起動）の単一責務分担を明示的にテストしている点が優れている。

**課題:**
- UT-EUC-004（validator-systemへの緩和指示が実行されること）はExecuteQuickCiCheckUseCaseの責務に「validator-systemへの直接指示」が含まれることを前提とするが、logical_design.md §4.4の処理フロー4（`dryRun=false`の場合はrelaxationProfileをvalidator-systemの緩和実行インターフェースへ渡す）の「validator-systemの緩和実行インターフェース」に対応するPortが論理設計の依存リストに明記されていない。SRP・DIPを維持するためにはこのPortの明示が必要であり、テスト設計が論理設計の不備を先行して露わにしている。

### エリック・エヴァンス視点: ドメイン表現

**評価: 優秀 (A)**

**強み:**
- **ユビキタス言語の一貫使用**: テストケース名に「Quick Mode判定エンジン」「3拒否ルール」「緩和プロファイル」「allowedCategories外」など、ドメインモデルで定義されたユビキタス言語が一貫して使用されている。`eligible=true/false`、`rejectionRule`、`relaxationProfile`といったドメイン用語もそのまま登場する。
- **3拒否ルールのドメイン概念の正確な表現**: UT-JE-011〜018はMIXED_CHANGES / NEW_DOMAIN / API_CONTRACTの3ルールを個別に特定したケースIDとして表現しており、ドメインの「防波堤」概念をテスト設計レベルで正確に体現している。特にUT-JE-020（「3拒否ルールはallowedCategoriesで上書きできない」）は「Quick Mode適用条件の緩和圧力への防波堤」というドメイン設計判断（domain_model.md D2）をそのままテストとして表現している点が優れている。
- **ドメイン不変条件とアプリケーション層の適切な分離**: INV-E1〜E3はQuickModeEligibilityのVOテスト（UT層）で検証し、UseCaseレベルではその結果（eligible=true/falseの振る舞い）を検証するという分離が守られている。UT-BUC-004（eligible=falseのQuickModeNotEligibleError）はUseCaseの責務として正確に表現されている。

**課題:**
- UT-CCLS-009（「全ファイルがallowed内（'bugfix'のみ）の場合、dominantCategoryが拒否対象を示さないこと」）の期待値表現が曖昧。ドメイン語彙としては「dominantCategoryがnullであること」または「hasAnyRejectable()=falseであること」と明記すべき。現状の「拒否対象を示さないこと」は実装者に解釈の余地を与える。
- IT-UC-Judge-006のコメント「（MIXED_CHANGESより先に判定されないことを確認）」が括弧書きになっており、テストの主目的が「NEW_DOMAINではなくMIXED_CHANGESが先に拒否される」ことなのに、ケースIDはJudge-006（「NEW_DOMAIN拒否」のシナリオ名）となっている。ドメインの「評価順序」概念を正確に表現するためには、Judge-006は「MIXED_CHANGES評価順序確認：domainファイルCREATEの場合」として再命名すべき。

### Engineering Perspective 総合判定

| 視点 | 評価 | 主な強み | 主な課題 |
|------|------|---------|---------|
| ケント・ベック（TDD適切性） | A- | 1機能1テストの粒度、段階的カバー | validator-system Portのモック設計が不明確 |
| マーティン・ファウラー（テスト設計スメル） | B+ | context/it構造が明確、Fixture共有設計 | IT-UC-Build-001の長いassert、デフォルト設定の重複 |
| アンクル・ボブ（SOLID・責務分離） | A | Port/Adapterのモック方針明確、UseCase分離テスト | validator-system実行PortのDIP担保不足 |
| エリック・エヴァンス（ドメイン表現） | A | ユビキタス言語の一貫使用、3拒否ルールの正確な表現 | CCLS-009の曖昧な期待値、Judge-006のケースID不一致 |

**総合判定: B+ （実装進行に支障なし。Highリスク指摘事項を実装着手前に解決することを推奨）**

---

## 7. 未カバー項目一覧（優先度付き）

| 項目 | 内容 | 優先度 | 理由 |
|------|------|--------|------|
| UNC-001 | validator-system実行PortのDIP担保テスト | High | UT-EUC-004がモック対象Portを特定できない設計バグ。実装前に論理設計（§4.4）の更新とテスト修正が必要 |
| UNC-002 | --format未指定時のデフォルト（human）動作確認 | High | CiCheckQuickModeHandlerの基本動作に関わる。現状 IT-API-Handler-009〜011 は明示指定のみ |
| UNC-003 | INV-1/INV-2の具体的検証（Level間依存構造の維持確認） | Medium | UT-JE-019の抽象的表現を「levelDependencyRelaxed === false」の具体的アサーションに置換すべき |
| UNC-004 | IT-UC-Execute-004に対応するdryRun=trueでのプロファイル生成確認 | Medium | UT-EUC-006でカバー済みだがIT統合レベルのカバーなし |
| UNC-005 | UT-CC-008の'docs'/'test'/'config'の個別ケース分割 | Low | 現状1ケースに3値をまとめているが、将来のメンテナンス性向上のため分割推奨 |
| UNC-006 | AgentFormatterへの異常データ（eligible=true + relaxationProfile=undefined）の防御テスト | Low | 通常ルートでは発生しないが、設計上不正なデータが渡った場合の挙動が未定義 |
| UNC-007 | ChangeClassification.equals()の境界値テスト（空のcategorizedMapの等価比較） | Low | UT-CCLS-010は「同一の分類結果」のみで空Mapの等価性が未確認 |

---

## 8. 推奨追加ケース

### 追加推奨ケース（優先度High）

#### ADD-001: validator-system実行Port依存の明確化

**対象**: `logical_design.md §4.4` の更新 + `unit_test_design.md` の修正

**内容**: `ExecuteQuickCiCheckUseCase` に `ValidatorExecutionPort`（または同等のインターフェース）を追加し、UT-EUC-004のモック対象を明確にする。

```markdown
| UT-EUC-004-revised | execute | H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す
  | eligible=trueかつdryRun=falseの場合
  | validatorExecutionPort.executeWithProfileが呼ばれること（relaxationProfileを引数に持つこと） |
```

#### ADD-002: --format未指定時のデフォルト動作テスト

**対象**: `it_test_design.md §4` に追加

```markdown
| IT-API-Handler-012 | `--quick` のみ（--format未指定） | eligible=true | `usecase.execute()` → approved Decision
  | stdout出力が人間可読形式（HumanFormatterの出力形式）と一致すること |
```

### 追加推奨ケース（優先度Medium）

#### ADD-003: INV-1/INV-2具体的検証への置換

**対象**: `unit_test_design.md §4.1` UT-JE-019の修正

```markdown
| UT-JE-019-revised | judge | 3拒否ルールをMIXED_CHANGES→NEW_DOMAIN→API_CONTRACTの順で評価する
  | 任意の有効なChangedFile[]とQuickModeConfigが渡された場合
  | 生成されたValidatorRelaxationProfile（eligible=trueの場合）のlevelDependencyRelaxedがfalseであること |
```

#### ADD-004: dryRun=trueでのプロファイル生成確認（IT）

**対象**: `it_test_design.md §2` ExecuteQuickCiCheckUseCaseに追加

```markdown
| IT-UC-Execute-008 | dryRun=trueかつeligible=trueのとき、relaxationProfileが含まれるDecisionContractが返ること
  | `{ changedFiles: undefined, dryRun: true }`
  | eligible=true設定 + デフォルトプロファイル設定
  | `{ eligibility: { eligible: true }, relaxationProfile: { levelDependencyRelaxed: false, ... } }` |
```

### 追加推奨ケース（優先度Low）

#### ADD-005: UT-CCLS-009の期待値明確化

**対象**: `unit_test_design.md §3.4` UT-CCLS-009の期待値修正

現在: 「dominantCategoryが拒否対象を示さないこと」
修正後: 「dominantCategoryがnullであること（hasAnyRejectable()=false）」

#### ADD-006: IT-UC-Judge-006のケースIDと説明の整合修正

**対象**: `it_test_design.md §2` IT-UC-Judge-006の修正

「domain/配下CREATEファイル」のシナリオは「NEW_DOMAIN拒否」ではなく「MIXED_CHANGES評価順序確認」として再命名し、NEW_DOMAIN専用ケースを追加する必要がある。

---

## 9. 次のアクション

### 実装着手前（必須）

1. **[High] `logical_design.md §4.4` の修正**: `ExecuteQuickCiCheckUseCase` のコンストラクタ依存に `ValidatorExecutionPort`（または相当インターフェース）を追加する。これにより UT-EUC-004 のモック対象が確定する。
2. **[High] `unit_test_design.md` / `it_test_design.md` への追加ケース反映**: ADD-001（UT-EUC-004修正）とADD-002（IT-API-Handler-012追加）を反映する。

### 実装中（推奨）

3. **[Medium] IT-UC-Judge-006のリネームと専用NEW_DOMAINケースの追加**: UT-JE-013/014 とのトレーサビリティ整合のため。
4. **[Medium] UT-JE-019の具体的アサーションへの置換**（ADD-003）: 実装者の解釈ぶれを防ぐ。

### 実装完了後（任意）

5. **[Low] ADD-005〜006**: ドメイン表現の精度向上。次回テスト設計更新時に対応。
