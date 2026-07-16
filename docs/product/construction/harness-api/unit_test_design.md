# ユニットテスト設計: harness-api

@story-id H09-01
@story-id H09-02
@story-id H09-03
@story-id H09-04
@work-item-id WI-025
@work-item-id WI-141
> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **最終更新**: 2026-04-24（ISSUE-025 skill setup の unit 観点を追加）
> **対応ストーリー**: H09-01〜H09-04
> **Wave**: 2（コア品質機構）
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象ドメインモデル

WI-141 では `commit-msg` / `bypass:audit` の境界に bypass trailer validation と audited range replay を追加する。`Bypass-Reason` / `Bypass-Evidence` / `Bypass-Owner` の完全性、report evidence の存在確認、non-bypassable blocker の拒否を unit test で検証する。

- 集約: なし（domain_model.md §2 §9-D1 集約降格方針）
- エンティティ: なし
- 値オブジェクト: CliCommandDefinition, HarnessApiResponse\<T\>, CheckReadyResult, PhaseInfo, CiCheckResult, DriftReportSummary, HarnessStatusSummary, ArtifactScanResult, LayerHealth, CommandInputSpec, ExitCodeSpec
- ドメインサービス: CommandRegistry, CommandDispatchService, StatusDerivationService

---

## 2. 値オブジェクトテストケース

### CliCommandDefinition

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CCD-001 | commandName=`phasegate:check-ready`, description=非空文字列, 有効なinputSpec/outputType/exitCodes | 正常に生成される |
| UT-CCD-002 | commandName=`phasegate:impact-analysis`（args指定あり）, 有効なinputSpec/outputType/exitCodes | 正常に生成される |
| UT-CCD-003 | commandName=空文字列 | エラーをスロー / 生成失敗 |
| UT-CCD-004 | commandName=`check-ready`（`harness:` プレフィックスなし） | エラーをスロー / 生成失敗 |
| UT-CCD-005 | commandName=`harness:`（プレフィックスのみ、コマンド名部分が空） | エラーをスロー / 生成失敗 |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-CCD-006 | 同一commandNameを持つ2つのCliCommandDefinition | 等価（値等価性） |
| UT-CCD-007 | 異なるcommandNameを持つ2つのCliCommandDefinition | 非等価 |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CCD-008 | 生成後にプロパティを変更しようとする | 生成済みインスタンスのcommandNameを変更 | 変更が反映されない（immutable） |
| UT-CCD-009 | commandName=`harness:1cmd`（`harness:` プレフィックスのコマンド名部分が数字始まり） | エラーをスロー / 生成失敗 |

---

### HarnessApiResponse\<T\>

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HAR-001 | status=`pass`, errors=[], 有効なsummary, data=任意 | 正常に生成される |
| UT-HAR-002 | status=`fail`, errors=[1件以上のHarnessError], 有効なsummary | 正常に生成される |
| UT-HAR-003 | status=`error`, errors=[1件以上のHarnessError], 有効なsummary | 正常に生成される |
| UT-HAR-004 | status=`pass`, data=省略（undefined） | 正常に生成される（dataは省略可能） |

#### 不変条件テスト（INV-3 / INV-4）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-HAR-005 | INV-3: passのときerrorsは空配列 | status=`pass`, errors=[HarnessError1件] | エラーをスロー / 生成失敗 |
| UT-HAR-006 | INV-4: failのときerrorsは1件以上 | status=`fail`, errors=[] | エラーをスロー / 生成失敗 |
| UT-HAR-007 | INV-4: errorのときerrorsは1件以上 | status=`error`, errors=[] | エラーをスロー / 生成失敗 |

#### 等値性テスト

| ケースID | 比較対象 | 期待結果 |
|---------|---------|---------|
| UT-HAR-008 | 同一status/errors/summary/dataを持つ2つのHarnessApiResponse | 等価（値等価性） |

---

### CheckReadyResult

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CRR-001 | stories=[全passed=true], allPassed=true | 正常に生成される |
| UT-CRR-002 | stories=[一部passed=false], allPassed=false | 正常に生成される |
| UT-CRR-003 | stories=[] | 正常に生成される（空のcheck-ready結果） |

#### 不変条件テスト

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CRR-004 | allPassedはstories全件のpassedの論理積と整合 | stories=[passed=true, passed=false], allPassed=true | エラーをスロー / 生成失敗 |
| UT-CRR-005 | allPassedの双方向不変条件（逆方向） | stories=[passed=true, passed=true], allPassed=false | エラーをスロー / 生成失敗（全storyがpassedでもallPassed=falseは不正） |

---

### PhaseInfo

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-PHI-001 | unitId=`harness-error`, currentLevel=1, currentPhase=`construction`, completedGates=[] | 正常に生成される |
| UT-PHI-002 | unitId=`config-foundation`, currentLevel=4, completedGates=[`L1`,`L2`,`L3`] | 正常に生成される |
| UT-PHI-003 | unitId=空文字列 | エラーをスロー / 生成失敗 |
| UT-PHI-004 | currentLevel=0（正数でない） | エラーをスロー / 生成失敗 |

---

### CiCheckResult

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CCR-001 | validatorResults=[1件passed=true], allPassed=true | 正常に生成される |
| UT-CCR-002 | validatorResults=[複数, 一部passed=false], allPassed=false | 正常に生成される |

#### 不変条件テスト（INV-5 / INV-6）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CCR-003 | INV-5: validatorResultsは1件以上 | validatorResults=[] | エラーをスロー / 生成失敗 |
| UT-CCR-004 | INV-6: allPassed === validatorResults全件passed | validatorResults=[passed=true, passed=true], allPassed=false | エラーをスロー / 生成失敗 |
| UT-CCR-005 | INV-6: allPassed === validatorResults全件passed | validatorResults=[passed=true, passed=false], allPassed=true | エラーをスロー / 生成失敗 |
| UT-CCR-006 | INV-6（正常）: 全件passed=true, allPassed=true | validatorResults=[passed=true, passed=true], allPassed=true | 正常に生成される |

---

### DriftReportSummary

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-DRS-001 | drifts=[], totalCount=0 | 正常に生成される（乖離なし） |
| UT-DRS-002 | drifts=[2件のDriftItem], totalCount=2 | 正常に生成される |
| UT-DRS-005 | fromDrifts(drifts=3件, sampleLimit=2) | totalCount/rawDriftCount=3, drifts.length=2, truncated=true, categorySummaries/actionPlan が生成される。@work-item-id WI-114 |

#### 不変条件テスト（INV-7）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-DRS-003 | INV-7: totalCount === drifts.length | drifts=[2件], totalCount=3 | エラーをスロー / 生成失敗 |
| UT-DRS-004 | INV-7: totalCount === drifts.length | drifts=[2件], totalCount=0 | エラーをスロー / 生成失敗 |

---

### HarnessStatusSummary

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-HSS-001 | layers=[L1/L2/L3/L4の4件], 有効なphaseGateSummary/presetInfo/configSummary | 正常に生成される |
| UT-HSS-002 | layers=[]（空）| エラーをスロー / 生成失敗（4レイヤー必須） |
| UT-HSS-003 | layers=[L1/L2/L3の3件]（L4欠落） | エラーをスロー / 生成失敗 |
| UT-HSS-004 | layers=[L1/L2/L3/L4/L1の5件]（重複LayerId） | エラーをスロー / 生成失敗 |

---

### ArtifactScanResult

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ASR-001 | scannedPaths=[有効なパス群], foundArtifacts=[複数], derivedLayerHealth=[4件] | 正常に生成される |
| UT-ASR-002 | scannedPaths=[], foundArtifacts=[], derivedLayerHealth=[] | 正常に生成される（スキャン結果空） |
| UT-ASR-003 | foundArtifactsに存在する成果物タイプが含まれる | 各ArtifactPresenceのpresent=trueが正しく格納される | 正常に生成される |
| UT-ASR-004 | derivedLayerHealthが4件（L1〜L4対応） | 正常に生成される |

---

### LayerHealth

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LYH-001 | layerId=`L1`, enabled=true, lastResult=`pass` | 正常に生成される |
| UT-LYH-002 | layerId=`L4`, enabled=false, lastResult省略（undefined） | 正常に生成される |
| UT-LYH-003 | layerId=`L2`, enabled=true, lastResult=`unknown` | 正常に生成される |
| UT-LYH-006 | configurationState/cachedArtifactState/liveValidationState を指定 | 状態種別が混ざらず個別フィールドに保持される。@work-item-id WI-112 |

#### 制約テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-LYH-004 | layerId=`L5`（列挙外の値） | エラーをスロー / 生成失敗 |
| UT-LYH-005 | lastResult=`running`（列挙外の値） | エラーをスロー / 生成失敗 |

---

### CommandInputSpec

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CIS-001 | args=[], flags=[] | 正常に生成される（引数・フラグなし） |
| UT-CIS-002 | args=[{name: `unit`, type: `string`}], flags=[] | 正常に生成される |
| UT-CIS-003 | args=[], flags=[{name: `json`, type: `boolean`}] | 正常に生成される |

---

### ExitCodeSpec

#### 生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ECS-001 | pass=0, fail=1, error=2 | 正常に生成される（標準定義） |

#### 制約テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-ECS-002 | pass=1（0以外） | エラーをスロー / 生成失敗 |
| UT-ECS-003 | error=1（failと同値） | エラーをスロー / 生成失敗（exitCode値の一意性） |

---

## 3. ドメインサービステストケース

## 2.5 Setup / skill deployment

**対象**: `scripts/harness/setup/skill-deployer.ts`

#### `deploySkills`

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SET-001 | 空プロジェクト + skillSet=`core` | `skills/.harness-version` が project root に作成される |
| UT-SET-002 | 空プロジェクト + skillSet=`all` | 許可された skill ディレクトリが `skills/` 配下に配置される |

#### `deployAgentSkillLinks`

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SET-003 | `{ claude: true, codex: true }` | `.claude/skills` と `.codex/skills` の symlink が作成される |
| UT-SET-004 | 既に `../skills` を向く symlink が存在 | `created: false` で skip される |
| UT-SET-005 | 通常ディレクトリ/通常ファイルが既に存在 | 上書きせず skip される |

### CommandRegistry

#### 登録テスト（registerCommand）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CRG-001 | 有効なCliCommandDefinition（`phasegate:check-ready`）を登録 | 登録成功。listAll()で確認可能 |
| UT-CRG-002 | 異なる8コマンドを順番に登録 | 全件登録成功。listAll()で8件返却 |

#### 不変条件テスト（INV-1 / INV-2）

| ケースID | 不変条件 | 入力 | 期待結果 |
|---------|---------|------|---------|
| UT-CRG-003 | INV-1: 同一CommandName重複禁止 | `phasegate:check-ready`を2回registerCommand | 2回目でエラーをスロー |
| UT-CRG-004 | INV-2: harness:プレフィックス必須 | commandName=`ci-check`のDefinitionを登録 | エラーをスロー（プレフィックスなし） |
| UT-CRG-005 | INV-2: harness:プレフィックス必須 | commandName=空文字列 | エラーをスロー |

#### 検索テスト（findByName）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CRG-006 | 登録済みのcommandName=`phasegate:ci-check` | 対応するCliCommandDefinitionを返す |
| UT-CRG-007 | 未登録のcommandName=`harness:unknown-cmd` | エラーをスロー / undefinedを返す |

#### 全件取得テスト（listAll）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-CRG-008 | 3件登録後にlistAll() | 登録順または一定順序で3件返却 |

---

### CommandDispatchService

> ポート（ValidatorExecutionPort, PhaseGateQueryPort, BiomeLintPort, ImpactAnalysisPort, ArtifactScannerPort, ConfigQueryPort）はすべてモック化する。

#### ディスパッチ正常系

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-CDS-001 | commandName=`phasegate:check-ready`, args={}, flags={} | PhaseGateQueryPort.queryAllStories() → 全passed=true | HarnessApiResponse\<CheckReadyResult\>（status=`pass`, exitCode=0）を返す |
| UT-CDS-002 | commandName=`phasegate:check-ready` | PhaseGateQueryPort.queryAllStories() → 一部passed=false | HarnessApiResponse（status=`fail`, exitCode=1）を返す |
| UT-CDS-003 | commandName=`phasegate:check-phase`, args={unit: `harness-error`} | PhaseGateQueryPort.queryUnit(`harness-error`) → PhaseInfo | HarnessApiResponse\<PhaseInfo\>（status=`pass`, exitCode=0）を返す |
| UT-CDS-004 | commandName=`phasegate:ci-check` | ValidatorExecutionPort.runAllValidators() → L2/L3/L4 全passedまたはskipped=true | HarnessApiResponse\<CiCheckResult\>（status=`pass`, exitCode=0）を返す。@work-item-id WI-108 |
| UT-CDS-005 | commandName=`phasegate:detect-drift` | ValidatorExecutionPort.runDriftDetection() → DriftItem[]=[] | HarnessApiResponse\<DriftReportSummary\>（status=`pass`, exitCode=0）を返す |
| UT-CDS-006 | commandName=`phasegate:detect-drift` | ValidatorExecutionPort.runDriftDetection() → DriftItem[1件以上] | Advisory HarnessApiResponse（status=`pass`, exitCode=0, summary.warnings>=1）を返し、data.categorySummaries/actionPlan に category/severity/nextAction を含む。@work-item-id WI-107 @work-item-id WI-114 |
| UT-CDS-007 | commandName=`phasegate:lint` | BiomeLintPort.runLint() → pass | HarnessApiResponse（status=`pass`, data=undefined, exitCode=0）を返す |
| UT-CDS-008 | commandName=`phasegate:impact-analysis`, args={storyId: `H09-01`} | ImpactAnalysisPort.analyze(`H09-01`) → ImpactAnalysisResult | HarnessApiResponse\<ImpactAnalysisResult\>（status=`pass`, exitCode=0）を返す |

#### ExitCode決定ルールテスト

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-CDS-009 | commandName=`phasegate:status` | ArtifactScannerPort.scan() → ArtifactScanResult（正常）, ConfigQueryPort → 設定取得成功, lint/validator → live results | exitCode=0（statusコマンドはfail=1を返さない §9-D5）。data.layers に configurationState/cachedArtifactState/liveValidationState が含まれる。@work-item-id WI-112 |
| UT-CDS-010 | commandName=`phasegate:status` | ArtifactScannerPort.scan() → LayerHealth全件lastResult=`unknown` | exitCode=0（unknownでも正常取得＝exitCode=0 §9-D5） |

#### 異常系（ポートエラー・未登録コマンド）

| ケースID | 入力 | モック設定 | 期待結果 |
|---------|------|----------|---------|
| UT-CDS-011 | commandName=`phasegate:ci-check` | ValidatorExecutionPort.runAllValidators() → 例外スロー | HarnessApiResponse（status=`error`, errors=[1件以上], exitCode=2）を返す |
| UT-CDS-012 | commandName=`harness:unknown-command`（未登録） | — | エラーをスロー / HarnessApiResponse（status=`error`, exitCode=2）を返す |

---

### StatusDerivationService

> StatusDerivationServiceは純粋計算処理のためポートへの依存はない。ArtifactScanResultとPresetInfo/ConfigSummaryを直接入力として渡す。

#### 正常系（LayerHealth導出）

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SDS-001 | ArtifactScanResult（L1の設計文書・テストファイル・メタデータ全て存在） | L1のLayerHealth.lastResult=`pass` |
| UT-SDS-002 | ArtifactScanResult（L2の成果物が存在しない） | L2のLayerHealth.lastResult=`unknown` |
| UT-SDS-003 | ArtifactScanResult（L3一部存在・一部不在） | L3のLayerHealth.lastResult=`unknown`（全て揃わない場合はunknown） |
| UT-SDS-004 | ArtifactScanResult（L1〜L4全て存在） + 全レイヤーenabled=true | HarnessStatusSummaryのlayers=4件、全てlastResult=`pass` |
| UT-SDS-009 | ArtifactScanResult（L2成果物なし） + liveValidationByLayer.L2=`pass` | L2は cachedArtifactState=`missing` かつ liveValidationState=`pass`、lastResult=`pass` |

#### enabled反映テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SDS-005 | configでL4.enabled=false, L4の成果物は存在 | LayerHealth（layerId=L4）.enabled=false が反映される |
| UT-SDS-006 | configでL1〜L4全てenabled=true | 全LayerHealth.enabled=true |

#### HarnessStatusSummary生成テスト

| ケースID | 入力 | 期待結果 |
|---------|------|---------|
| UT-SDS-007 | 有効なArtifactScanResult + 有効なPresetInfo/ConfigSummary | HarnessStatusSummaryが正常に生成される（layers 4件、presetInfo/configSummaryが正しく格納） |
| UT-SDS-008 | ArtifactScanResult.derivedLayerHealthが空 | HarnessStatusSummary.layersが空のまま生成される（またはエラー） |

---

## 4. 境界値・異常系（横断）

| ケースID | 対象 | 入力 | 期待結果 |
|---------|------|------|---------|
| UT-BND-001 | CommandName | `harness:` のみ（名前部分が空） | CliCommandDefinitionの生成でエラー |
| UT-BND-002 | CommandName | `HARNESS:check-ready`（大文字プレフィックス） | CliCommandDefinitionの生成でエラー（プレフィックスは小文字固定） |
| UT-BND-003 | HarnessApiResponse.errors | status=`pass`, errors=[空のHarnessErrorオブジェクト配列1件] | INV-3違反でエラー |
| UT-BND-004 | CiCheckResult.validatorResults | validatorResults=[0件] | INV-5違反でエラー |
| UT-BND-005 | DriftReportSummary | drifts=[3件], totalCount=3（正常境界） | 正常に生成される |
| UT-BND-006 | DriftReportSummary | drifts=[3件], totalCount=4 | INV-7違反でエラー |
| UT-BND-007 | LayerHealth.lastResult | lastResult=`fail`（有効値確認） | 正常に生成される |
| UT-BND-008 | ExitCodeSpec | pass=0, fail=1, error=2（全て有効値） | 正常に生成される |
| UT-BND-009 | CommandRegistry.findByName | 1件も登録されていない状態でfindByName | エラーをスロー / 未登録として扱われる |
| UT-BND-010 | CommandDispatchService | commandName=`phasegate:complete-check` | ValidatorExecutionPort + BiomeLintPort 両方に委譲される（完全チェック） |
| UT-BND-011 | StatusDerivationService | ArtifactScanResultの全成果物present=false | 全LayerHealth.lastResult=`unknown` |
| UT-BND-012 | PhaseInfo.currentLevel | currentLevel=-1（負数） | エラーをスロー / 生成失敗 |

---

## 5. テストケース総数サマリー

| カテゴリ | テストケース数 |
|---------|--------------|
| CliCommandDefinition（VO） | 8 |
| HarnessApiResponse\<T\>（VO） | 8 |
| CheckReadyResult（VO） | 4 |
| PhaseInfo（VO） | 4 |
| CiCheckResult（VO） | 6 |
| DriftReportSummary（VO） | 4 |
| HarnessStatusSummary（VO） | 4 |
| ArtifactScanResult（VO） | 4 |
| LayerHealth（VO） | 5 |
| CommandInputSpec（VO） | 3 |
| ExitCodeSpec（VO） | 3 |
| CommandRegistry（ドメインサービス） | 8 |
| CommandDispatchService（ドメインサービス） | 12 |
| StatusDerivationService（ドメインサービス） | 8 |
| 境界値・異常系（横断） | 12 |
| **合計** | **93** |

---

## 6. テスト規約準拠チェック

以下の規約（docs/principles/testing-rules.md）に準拠して設計した。

| 規約 | 本設計での対応 |
|------|-------------|
| テストケース名は日本語で記述 | 期待結果カラムは日本語で記述。実装時のit()名称も日本語とする |
| AAAパターン | 実装時にArrange/Act/Assertを明示する（本設計ではケース仕様のみ） |
| actualに代入 | 実装時に `const actual = ...` を用いる |
| モックは外部依存にのみ利用 | CommandDispatchServiceのポートはモック化。CommandRegistryとStatusDerivationServiceはモック不要 |
| target/describe/context/it構造 | 実装時に使用するhelperエイリアスで構造化する |
| ファイル名はkebab-case | テストファイル名は `cli-command-definition.test.ts` 等のkebab-caseとする |

---

## 7. 次ステップ

1. **test-coverage-checker** でこのテストケース設計の網羅性（不変条件カバレッジ・ドメインロジックカバレッジ）を検証する
2. **unit-test-logic-designer** で各ケースの疑似コードロジックを設計する
3. **story-implementor** でTDD実装（RED → GREEN → Refactor）を行う
<!-- @work-item-id WI-012 -->
## WI-012: pre-commit extension configuration

| Case | Target | Expected |
|---|---|---|
| WI012-UT-001 | `runPreCommit` | `.py` is ignored when `implementationExtensions` is omitted. |
| WI012-UT-002 | `runPreCommit` | `.py` is passed to L2 validators when `implementationExtensions` contains `".py"`. |
| WI012-UT-003 | `runPreCommit` | Existing `.ts` behavior remains unchanged. |
# WI-186 health verdict regression

<!-- @work-item-id WI-186 -->

| ID | 観点 | 入力 | 期待結果 |
| --- | --- | --- | --- |
| UT-WI186-001 | status live failure verdict | L1 live validation fails in standard preset | response `status=fail`, `exitCode=0`, L1 `lastResult=fail` |
| UT-WI186-002 | status live pass verdict | all enabled live states pass | response `status=pass`, `exitCode=0` |

## WI-291 World inspect command catalog tests

<!-- @work-item-id WI-291 -->

@story-id H17-06

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-WM291-API-001 | known command | canonical catalog | `world:inspect`を含みunique / sorted |
| UT-WM291-API-002 | scope boundary | canonical catalog | `world:pin` / `world:derive`をまだ含まない |
| UT-WM291-API-003 | help transport | `world:inspect --help` | read-only、format flag、exit contractを表示 |

## WI-296 World command catalog tests

<!-- @work-item-id WI-296 -->

@story-id H17-10

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-WM296-API-001 | known command | catalog | inspect / pin / deriveを含みunique / sorted |
| UT-WM296-API-002 | dispatch conformance | main case labels | catalogと集合一致 |
| UT-WM296-API-003 | help | root / pin / derive | mutation flagとformat contractを表示 |

## WI-300 Config dispatch tests

<!-- @work-item-id WI-300 -->

dedicated mapperの完全DTOがWorld compositionへ渡ること、config不在fallback、invalid config exit 2、`enabled:false`でもknown command / dispatch集合が不変であることを検証する。
