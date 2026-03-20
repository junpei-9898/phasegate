# ITテスト設計: phase-dependency-model

> **作成日**: 2026-03-13
> **対応ストーリー**: H02-01, H02-02, H02-03
> **前提ドキュメント**: `logical_design.md`（同ディレクトリ）, `docs/inception/phase-dependency-model/it_test_design_plan.md`, `docs/product/units/integration_contract.md`, `docs/principles/testing-rules.md`

---

## 1. 対象コンポーネント

### テスト対象

| 層 | コンポーネント | テストファイル |
|----|-------------|-------------|
| application (UseCase) | CheckPhaseGateUseCase | `check-phase-gate-usecase.test.ts` |
| application (UseCase) | BuildPhaseDependencyGraphUseCase | `build-phase-dependency-graph-usecase.test.ts` |
| application (UseCase) | GetPhaseInfoUseCase | `get-phase-info-usecase.test.ts` |
| application (UseCase) | ValidateCustomizationPolicyUseCase | `validate-customization-policy-usecase.test.ts` |
| application (UseCase) | RecordPhaseOverrideAuditUseCase | `record-phase-override-audit-usecase.test.ts` |
| application (サービス) | EvidenceBundleAssembler | `check-phase-gate-usecase.test.ts` 内で統合検証 |
| application (サービス) | PhaseInfoResolver | `get-phase-info-usecase.test.ts` 内で統合検証 |
| application (サービス) | PhaseGateResultMapper | `check-phase-gate-usecase.test.ts` 内で統合検証 |
| infrastructure | FileSystemArtifactExistenceChecker | `file-system-artifact-existence-checker.test.ts` |
| infrastructure | HarnessConfigPhaseConfigProvider | `harness-config-phase-config-provider.test.ts` |
| infrastructure | MarkdownPlanDocumentReader | `markdown-plan-document-reader.test.ts` |
| infrastructure | PhaseOverrideAuditLogger | `phase-override-audit-logger.test.ts` |
| presentation | CheckPhaseCommandHandler | `check-phase-command-handler.test.ts` |
| presentation | CheckReadyCommandHandler | `check-ready-command-handler.test.ts` |
| presentation | PhaseGateValidatorFacade | `phase-gate-validator-facade.test.ts` |
| presentation (Presenter) | PhaseInfoPresenter | `check-phase-command-handler.test.ts` 内で統合検証 |
| presentation (Presenter) | PhaseGateResultPresenter | `check-ready-command-handler.test.ts` 内で統合検証 |

### テスト除外

| 層 | コンポーネント | 除外理由 |
|----|-------------|---------|
| application (DTO) | customization-validation-result-dto.ts | TypeScript型定義のみで振る舞いを持たない。各DTOの構造正当性はUseCase経由の出力検証で間接的に検証する |
| application (DTO) | phase-dependency-graph-dto.ts | 同上 |
| application (DTO) | phase-gate-result-dto.ts | 同上 |
| application (DTO) | phase-info-dto.ts | 同上 |

---

## 2. テストファイル構成

```text
scripts/harness/__tests__/phase-dependency-model/
├── application/
│   ├── check-phase-gate-usecase.test.ts
│   ├── build-phase-dependency-graph-usecase.test.ts
│   ├── get-phase-info-usecase.test.ts
│   ├── validate-customization-policy-usecase.test.ts
│   └── record-phase-override-audit-usecase.test.ts
├── infrastructure/
│   ├── file-system-artifact-existence-checker.test.ts
│   ├── harness-config-phase-config-provider.test.ts
│   ├── markdown-plan-document-reader.test.ts
│   └── phase-override-audit-logger.test.ts
└── presentation/
    ├── check-phase-command-handler.test.ts
    ├── check-ready-command-handler.test.ts
    └── phase-gate-validator-facade.test.ts
```

### テスト規約

- **AAAパターン**: 全テストケースで Arrange / Act / Assert を明記する
- **テストケース名は日本語**: 何も知らない開発者が読んでわかる表現にする
- **実行結果は `actual` に代入**: `const actual = ...` で統一する
- **describe/it構造**: `target` / `describe` / `context` / `it` パターンを使用する
- **ファイル名**: kebab-case で統一する
- **Domain実体はモック禁止**: PhaseStructure、値オブジェクト群は実体を使用する
- **Portのみモック可**: ArtifactExistenceCheckerPort, PlanDocumentReaderPort, PhaseConfigProviderPort, PhaseAuditLoggerPort は Fake/Stub を使用する

---

## 3. UseCaseテストケース

### 3.1 CheckPhaseGateUseCase

**テストファイル**: `check-phase-gate-usecase.test.ts`

**コンストラクタ依存（Fake化対象）**:

- `phaseConfigProvider: PhaseConfigProviderPort`（Stub）
- `evidenceBundleAssembler: EvidenceBundleAssembler`（Port経由でFake化。内部のArtifactExistenceCheckerPort, PlanDocumentReaderPort, PhaseConfigProviderPortをStub化）
- `auditLogger: PhaseAuditLoggerPort`（Stub）

**統合検証対象サービス**: EvidenceBundleAssembler, PhaseGateResultMapper

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-001 | 正常系 | 全前提成果物が存在しPlanEvidenceも充足している場合、passed=trueのPhaseGateResultDtoを返す | artifactStatuses全true、planEvidences全充足 → passed=true, blockers空 |
| IT-PD-002 | 正常系 | Level 1完了済みでLevel 2のgate判定を実行した場合、passed=trueを返す | Level 1ノードの成果物・plan証跡が全て充足 → Level 2 gate通過 |
| IT-PD-003 | 正常系 | override適用時にauditPayloadがある場合、auditLoggerのrecordが呼び出される | overrideEnabled=true + 追加依存適用 → auditLogger.record呼び出し確認 |
| IT-PD-004 | 正常系 | override適用がない場合、auditLoggerのrecordが呼び出されない | overrideEnabled=false → auditLogger.record未呼び出し確認 |
| IT-PD-005 | 異常系 | 前提成果物が欠損している場合、passed=falseでblockersに欠損理由が含まれる | artifactStatuses一部false → passed=false, blockers非空 |
| IT-PD-006 | 異常系 | PlanEvidenceのqaCompleteがfalseの場合、passed=falseを返す | embedded-qaモードでQA未回答 → passed=false |
| IT-PD-007 | 異常系 | PlanEvidenceのplanningModeMatchがfalseの場合、passed=falseを返す | interactiveモードでQA節なし → passed=false |
| IT-PD-008 | 異常系 | NonRelaxableDependencyOverrideErrorがPhaseStructure生成時に発生した場合、そのまま上位へ送出される | Level間依存の削除要求 → 例外伝播 |
| IT-PD-009 | 異常系 | CyclicPhaseDependencyErrorが発生した場合、そのまま上位へ送出される | 巡回依存を生むcustom rule → 例外伝播 |
| IT-PD-010 | 正常系 | PhaseGateResultDtoのtargetLevel, blockers, warnings, auditRecordedが正しく写像される | PhaseGateResultMapper経由のDTO変換結果検証 |

### 3.2 BuildPhaseDependencyGraphUseCase

**テストファイル**: `build-phase-dependency-graph-usecase.test.ts`

**コンストラクタ依存（Fake化対象）**:

- `phaseConfigProvider: PhaseConfigProviderPort`（Stub）

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-011 | 正常系 | デフォルトポリシーで全ノードと全依存のグラフDTOを返す | preset=default, rules空 → 全PhaseNodeと既定依存のDTO返却 |
| IT-PD-012 | 正常系 | includeArtifacts=trueの場合、ノードDTOに成果物パスが含まれる | includeArtifacts=true → nodes[].artifacts非undefined |
| IT-PD-013 | 正常系 | includeArtifacts未指定の場合、ノードDTOから成果物パスが省略される | includeArtifacts省略 → nodes[].artifacts=undefined |
| IT-PD-014 | 異常系 | NonRelaxableDependencyOverrideErrorがそのまま上位へ送出される | Level間依存の削除要求 → 例外伝播 |
| IT-PD-015 | 異常系 | CyclicPhaseDependencyErrorがそのまま上位へ送出される | 巡回依存を生むcustom rule → 例外伝播 |
| IT-PD-016 | 境界値 | カスタムルール適用後の有効依存がグラフのedgesに反映される | custom rule追加依存 → edges増加確認 |

### 3.3 GetPhaseInfoUseCase

**テストファイル**: `get-phase-info-usecase.test.ts`

**コンストラクタ依存（Fake化対象）**:

- `phaseConfigProvider: PhaseConfigProviderPort`（Stub）
- `evidenceBundleAssembler: EvidenceBundleAssembler`（Port経由でFake化）
- `phaseInfoResolver: PhaseInfoResolver`（実体使用・純粋計算）

**統合検証対象サービス**: PhaseInfoResolver

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-017 | 正常系 | Level 1成果物が全て存在する場合、currentLevel=2でcompletedNodesにLevel 1ノードが含まれる | Level 1全充足 → currentLevel=2, completedNodes=Level 1ノード群 |
| IT-PD-018 | 正常系 | Level 1とLevel 2の成果物が全て存在する場合、currentLevel=3を返す | Level 1+2全充足 → currentLevel=3 |
| IT-PD-019 | 正常系 | 何も完了していない場合、currentLevel=1でnextNodesにLevel 1起点ノードが含まれる | 全成果物なし → currentLevel=1, nextNodes=Level 1起点 |
| IT-PD-020 | 正常系 | storyId指定時に該当ストーリーのスコープで絞り込まれたPhaseInfoDtoを返す | storyId指定 → scope反映確認 |
| IT-PD-021 | 正常系 | blockersにphase-gate未充足の理由が含まれる | 一部成果物欠損 → blockers非空 |
| IT-PD-022 | 異常系 | PhaseConfigProviderPortの設定取得失敗時に例外が伝播される | getPlanningMode失敗 → 例外伝播 |
| IT-PD-023 | 異常系 | PlanDocumentReaderPort経由のplan文書解析失敗時に例外が伝播される | readEvidence失敗 → PlanDocumentParseError伝播 |

### 3.4 ValidateCustomizationPolicyUseCase

**テストファイル**: `validate-customization-policy-usecase.test.ts`

**コンストラクタ依存（Fake化対象）**:

- `phaseConfigProvider: PhaseConfigProviderPort`（Stub）

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-024 | 正常系 | デフォルトポリシーで例外なく構築された場合、valid=trueを返す | preset=default, rules空 → valid=true, errors空 |
| IT-PD-025 | 正常系 | warnings付きでvalid=trueを返す場合、warningsにメッセージが含まれる | 軽微な問題 → valid=true, warnings非空 |
| IT-PD-026 | 異常系 | InvalidCustomRuleErrorが発生した場合、errorsに変換されてvalid=falseを返す | 未知ノード参照 → valid=false, errors非空 |
| IT-PD-027 | 異常系 | NonRelaxableDependencyOverrideErrorが発生した場合、errorsに変換されてvalid=falseを返す | Level間依存の削除要求 → valid=false, errors非空 |
| IT-PD-028 | 異常系 | CyclicPhaseDependencyErrorが発生した場合、errorsに変換されてvalid=falseを返す | 巡回依存を生むcustom rule → valid=false, errors非空 |

### 3.5 RecordPhaseOverrideAuditUseCase

**テストファイル**: `record-phase-override-audit-usecase.test.ts`

**コンストラクタ依存（Fake化対象）**:

- `auditLogger: PhaseAuditLoggerPort`（Stub）

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-029 | 正常系 | auditLoggerのrecordが正しいペイロードで呼び出される | scope, targetLevel, appliedRules, requestedOverride → record引数検証 |
| IT-PD-030 | 正常系 | generatedAtがISO8601形式で生成される | record呼び出し時のgeneratedAt → ISO8601形式検証 |
| IT-PD-031 | 異常系 | auditLogger失敗時にAuditLogWriteErrorとして上位へ送出される | record例外 → AuditLogWriteError伝播 |
| IT-PD-032 | 境界値 | appliedRulesが空配列の場合もrecordが呼び出される | appliedRules=[] → record呼び出し確認 |

---

## 4. Application Serviceテストケース

Application サービスは独立テストファイルを持たず、関連UseCaseテスト内で統合検証する。以下に各サービスの検証ポイントを記す。

### 4.1 EvidenceBundleAssembler

**検証場所**: `check-phase-gate-usecase.test.ts`

**コンストラクタ依存（Fake化対象）**:

- `artifactExistenceChecker: ArtifactExistenceCheckerPort`（Stub）
- `planDocumentReader: PlanDocumentReaderPort`（Stub）
- `phaseConfigProvider: PhaseConfigProviderPort`（Stub）

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-033 | 正常系 | 指定Levelの前提ノード全てに対してartifactStatuses・planEvidencesが収集される | assembleForLevel → 返却Mapのキー数がノード成果物数と一致 |
| IT-PD-034 | 正常系 | scope指定時にArtifactのプレースホルダが解決された上で存在判定される | unitId/storyId指定 → resolve後のパスで判定 |
| IT-PD-035 | 正常系 | PlanningModeがPhaseConfigProviderPortから取得されPlanEvidence判定に使用される | getPlanningMode呼び出し確認 + planningModeMatch反映 |
| IT-PD-036 | 異常系 | ArtifactExistenceCheckerPort失敗時に例外が伝播される | checkAll例外 → 上位伝播 |
| IT-PD-037 | 異常系 | PlanDocumentReaderPort失敗時に例外が伝播される | readEvidence例外 → 上位伝播 |

### 4.2 PhaseInfoResolver

**検証場所**: `get-phase-info-usecase.test.ts`

**コンストラクタ依存**: なし（純粋計算）

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-038 | 正常系 | 全ノードの成果物が存在する場合、最高Levelをcurrent levelとして返す | 全充足 → currentLevel=3 |
| IT-PD-039 | 正常系 | 一部ノードの成果物が欠損している場合、未完了ノードの直前Levelを返す | Level 2一部欠損 → currentLevel=2 |
| IT-PD-040 | 正常系 | completedNodesに完了済みノードキーのみが含まれる | ノード完了状態 → completedNodes検証 |
| IT-PD-041 | 正常系 | nextNodesに次に着手可能なノードキーが含まれる | 依存グラフと完了状態 → nextNodes検証 |
| IT-PD-042 | 境界値 | completedNodesが空の場合、currentLevel=1でnextNodesにLevel 1起点が含まれる | 何も完了していない → 初期状態検証 |

### 4.3 PhaseGateResultMapper

**検証場所**: `check-phase-gate-usecase.test.ts`

**コンストラクタ依存**: なし（DTO変換）

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-043 | 正常系 | passed=trueのPhaseGateResultがPhaseGateResultDtoに正しく変換される | passed, targetLevel, blockers空, warnings, auditRecorded |
| IT-PD-044 | 正常系 | passed=falseのPhaseGateResultがblockersを含むDtoに変換される | blockers非空, auditRecorded=false |
| IT-PD-045 | 正常系 | auditPayload存在時にauditRecorded=trueとなる | auditPayload非undefined → auditRecorded=true |

---

## 5. Infrastructureテストケース

Infrastructure層テストでは実ファイルシステムを使用する。一時ディレクトリ（`fs.mkdtempSync()` + cleanup）で検証する。

### 5.1 FileSystemArtifactExistenceChecker

**テストファイル**: `file-system-artifact-existence-checker.test.ts`

**実装ポート**: ArtifactExistenceCheckerPort

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-046 | 正常系 | 存在するファイルに対してtrueを含むMapを返す | 一時ディレクトリにファイル作成 → checkAll → Map値true |
| IT-PD-047 | 正常系 | 存在しないファイルに対してfalseを含むMapを返す | ファイル未作成パス → checkAll → Map値false |
| IT-PD-048 | 正常系 | プレースホルダ解決後のパスで存在判定される | `{unit}` プレースホルダ → scope指定 → 解決済みパスで判定 |
| IT-PD-049 | 正常系 | required=falseの成果物もMapに含まれる | required=false → Map内に存在確認 |
| IT-PD-050 | 境界値 | storyId未指定で `{storyId}` プレースホルダを含む成果物はfalseを返す | storyId未指定 → false |

### 5.2 MarkdownPlanDocumentReader

**テストファイル**: `markdown-plan-document-reader.test.ts`

**実装ポート**: PlanDocumentReaderPort

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-051 | 正常系 | plan文書が存在しQA節ありで全回答済みの場合、exists=true, qaComplete=true, planningModeMatch=trueを返す | fixture: QA節完備 + embedded-qaモード |
| IT-PD-052 | 正常系 | plan文書が存在しQA節ありで未回答がある場合、qaComplete=falseを返す | fixture: QA節に空のA: → qaComplete=false |
| IT-PD-053 | 正常系 | plan文書が存在しQA節なしの場合、qaComplete=false, planningModeMatch判定はモード依存 | fixture: QA節なし → interactiveならplanningModeMatch=false |
| IT-PD-054 | 異常系 | plan文書が存在しない場合、PlanEvidence(false, false, false)を返す | ファイル不存在 → 全false |
| IT-PD-055 | 正常系 | interactiveモードの場合、QA節の存在がplanningModeMatchとなる | fixture: QA節あり + interactiveモード → planningModeMatch=true |
| IT-PD-056 | 正常系 | embedded-qaモードの場合、QA全回答済みがplanningModeMatchとなる | fixture: QA全回答 + embedded-qaモード → planningModeMatch=true |
| IT-PD-057 | 正常系 | 見出しが壊れている場合、exists=true, qaComplete=false, planningModeMatch=falseを返す | fixture: 不正Markdown → フォールバック |
| IT-PD-058 | 正常系 | `## QA（設計判断の根拠）` 形式の見出しを正しく検出する | fixture: 括弧付きQA見出し → QA節として認識 |

### 5.3 HarnessConfigPhaseConfigProvider

**テストファイル**: `harness-config-phase-config-provider.test.ts`

**実装ポート**: PhaseConfigProviderPort

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-059 | 正常系 | planningMode.defaultからデフォルトPlanningModeを取得できる | config fixture → getPlanningMode(scope無し) → PlanningMode検証 |
| IT-PD-060 | 正常系 | planningMode.perPhaseのscope指定でperPhase PlanningModeを取得できる | config fixture perPhase指定 → getPlanningMode(scope付き) |
| IT-PD-061 | 正常系 | phaseDependencies.customRulesからCustomRuleへ正規化される | config fixture customRules → getCustomizationPolicy → rules検証 |
| IT-PD-062 | 正常系 | phaseDependencies.presetとoverrideからPhaseCustomizationPolicyが正しく変換される | preset=custom, override=true → policy検証 |
| IT-PD-063 | 正常系 | reporting.outputDirの値が取得できる | config fixture → getReportingOutputDir → パス検証 |
| IT-PD-064 | 正常系 | quickMode.relaxedGatesはLevel間依存緩和として解釈されない | relaxedGates設定あり → nonRelaxableDependencies不変確認 |

### 5.4 PhaseOverrideAuditLogger

**テストファイル**: `phase-override-audit-logger.test.ts`

**実装ポート**: PhaseAuditLoggerPort

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-065 | 正常系 | payloadがJSONL形式で1行追記される | 一時ディレクトリ → record → ファイル内容が1行JSON |
| IT-PD-066 | 正常系 | 複数回recordで追記される | record 2回 → ファイル内容が2行 |
| IT-PD-067 | 異常系 | 書込失敗時に例外が送出される | 書込不可パス → record → 例外検証 |

---

## 6. Presentationテストケース

Presentation層テストでは UseCase を Stub 化し、引数パースと出力整形を検証する。

### 6.1 CheckPhaseCommandHandler

**テストファイル**: `check-phase-command-handler.test.ts`

**Stub化対象**: GetPhaseInfoUseCase

**統合検証対象Presenter**: PhaseInfoPresenter

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-068 | 正常系 | unit指定でGetPhaseInfoUseCaseが呼び出されテキスト形式で出力される | 引数パース → UseCase呼び出し → text出力 (exit code 0) |
| IT-PD-069 | 正常系 | --json指定でPhaseInfoDtoがJSON形式で出力される | --json → HarnessApiResponse形式出力 (exit code 0) |
| IT-PD-070 | 正常系 | --story指定でstoryIdがUseCaseのinputに渡される | --story H02-01 → input.storyId検証 |
| IT-PD-071 | 異常系 | 指定UnitまたはStoryが存在しない場合、exit code 1で終了する | UseCase例外 → exit code 1 |
| IT-PD-072 | 異常系 | 設定取得失敗時にexit code 2で終了する | PhaseConfigProviderPort例外 → exit code 2 |

### 6.2 CheckReadyCommandHandler

**テストファイル**: `check-ready-command-handler.test.ts`

**Stub化対象**: CheckPhaseGateUseCase

**統合検証対象Presenter**: PhaseGateResultPresenter

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-073 | 正常系 | 全scopeがreadyの場合、exit code 0でテキスト出力される | 全passed=true → exit code 0 |
| IT-PD-074 | 異常系 | 1件でも未充足がある場合、exit code 1で終了する | 1件passed=false → exit code 1 |
| IT-PD-075 | 正常系 | --json指定でPhaseGateResultDto[]がJSON形式で出力される | --json → HarnessApiResponse形式出力 |
| IT-PD-076 | 正常系 | --unit/--story指定で対象scopeが絞り込まれる | --unit指定 → CheckPhaseGateUseCase呼び出しscope検証 |
| IT-PD-077 | 異常系 | 設定取得失敗時にexit code 2で終了する | UseCase例外 → exit code 2 |

### 6.3 PhaseGateValidatorFacade

**テストファイル**: `phase-gate-validator-facade.test.ts`

**Stub化対象**: CheckPhaseGateUseCase

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-078 | 正常系 | gate通過時は空のHarnessError配列を返す | passed=true → HarnessError[] 空 |
| IT-PD-079 | 異常系 | gate失敗時にHarnessError配列にblockersが含まれる | passed=false → HarnessError[] 非空 |
| IT-PD-080 | 正常系 | storyId有りの場合、targetLevel=3で判定される | storyId指定 → CheckPhaseGateUseCase input.targetLevel=3 |
| IT-PD-081 | 正常系 | storyId無しの場合、targetLevel=2で判定される | storyId未指定 → CheckPhaseGateUseCase input.targetLevel=2 |

### 6.4 PhaseInfoPresenter

**検証場所**: `check-phase-command-handler.test.ts` 内で統合検証

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-082 | 正常系 | PhaseInfoDtoをテキスト形式に整形できる | currentLevel, completedNodes, nextNodes → 人間可読テキスト |
| IT-PD-083 | 正常系 | PhaseInfoDtoをJSON形式に整形できる | PhaseInfoDto → JSON文字列 |
| IT-PD-084 | 境界値 | completedNodesが空の場合でも正しく出力される | completedNodes=[] → 空一覧表示 |

### 6.5 PhaseGateResultPresenter

**検証場所**: `check-ready-command-handler.test.ts` 内で統合検証

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-085 | 正常系 | passed=trueのPhaseGateResultDtoをテキスト形式に整形できる | passed=true → 通過メッセージ |
| IT-PD-086 | 正常系 | passed=falseのPhaseGateResultDtoをテキスト形式に整形しblockersが表示される | passed=false + blockers → 阻害理由表示 |
| IT-PD-087 | 正常系 | PhaseGateResultDtoをJSON形式に整形できる | PhaseGateResultDto → JSON文字列 |

---

## 7. テスト環境設定

### 7.1 テストフレームワーク

- **Vitest 3.0.0**: 共有設定 `scripts/harness/__tests__/vitest.config.ts` を使用する

### 7.2 一時ディレクトリ管理

Infrastructure層テストでは以下のパターンでファイルシステムを使用する:

- **作成**: `fs.mkdtempSync(path.join(os.tmpdir(), 'phase-dep-'))` でテスト毎に一時ディレクトリを作成する
- **クリーンアップ**: `afterEach` / `afterAll` で一時ディレクトリを再帰削除する
- **fixture配置**: テスト用Markdownファイル（QA節あり/なし/壊れたフォーマット等）を一時ディレクトリ内に動的生成する

### 7.3 Fixture方針

| 対象 | fixture内容 | 配置方式 |
|------|-----------|---------|
| MarkdownPlanDocumentReader | QA節完備/QA未回答/QA節なし/見出し壊れ/括弧付きQA見出し | テスト内で一時ファイル動的生成 |
| HarnessConfigPhaseConfigProvider | HarnessConfigV2のJSON fixture | テスト内でオブジェクト構築 or 一時ファイル |
| FileSystemArtifactExistenceChecker | 成果物ファイル有無 | テスト内で一時ファイル動的生成 |
| PhaseOverrideAuditLogger | 出力先ディレクトリ | 一時ディレクトリ使用 |

### 7.4 モック方針まとめ

| 層 | モック対象 | モック手段 | Domain実体 |
|----|----------|----------|-----------|
| application (UseCase) | 4 Port（ArtifactExistenceCheckerPort, PlanDocumentReaderPort, PhaseConfigProviderPort, PhaseAuditLoggerPort） | Fake/Stub | PhaseStructure, 値オブジェクト群は実体使用 |
| application (サービス) | Port経由で間接Fake化 | UseCase経由 | PhaseInfoResolverは実体（純粋計算） |
| infrastructure | なし（実ファイルシステム使用） | — | Artifact, PlanEvidence等は実体使用 |
| presentation | UseCase | Stub | — |

### 7.5 前提条件

- domain層の実装が完了していること（ITテストはdomain実体を使用するため）
- `shared-kernel/harness-config.ts` の HarnessConfigV2 ローダが利用可能であること
- テスト用のMarkdownファイル（QA節あり/なし/壊れたフォーマット等）は各テスト内でfixture化すること

### 7.6 リスク

- MarkdownPlanDocumentReaderのテストは、QA節の検出ロジックが軽量パース（AST不使用）のため、fixtureファイルのバリエーションを十分に用意する必要がある
- HarnessConfigPhaseConfigProviderのテストは、`shared-kernel/harness-config.ts` の実装に依存するため、shared-kernelのインターフェースが先行確定している必要がある
- PhaseOverrideAuditLoggerのテストは、ファイルシステム操作を伴うため、CI環境での一時ディレクトリの権限に注意すること

---

## 8. カバレッジギャップ補強ケース

> 以下のケースは `coverage_report.md` セクション5・6で特定された未カバー項目を補うために追加する。

### 8.1 AC-PD-04: changedFilesに実装コードが含まれる場合の設計文書・plan文書不足拒否

**テストファイル**: `phase-gate-validator-facade.test.ts`, `check-ready-command-handler.test.ts`

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-088 | 異常系 | changedFilesに実装コードが含まれ設計文書が未整備の場合、PhaseGateValidatorFacadeがblockersを返す | changedFiles=[src/foo.ts], Level 2設計文書なし → HarnessError[]にblocker含む |
| IT-PD-089 | 異常系 | changedFilesに実装コードが含まれplan文書が未整備の場合、CheckReadyCommandHandlerがexit code 1で終了する | changedFiles=[src/foo.ts], plan文書なし → exit code 1 + blockerメッセージ |
| IT-PD-090 | 正常系 | changedFilesに実装コードが含まれ設計文書・plan文書が全て整備されている場合、gate通過する | changedFiles=[src/foo.ts], 全設計文書・plan整備 → passed=true |

### 8.2 AC-PD-03: Level内上流設計未完了時の下流設計拒否

**テストファイル**: `check-phase-gate-usecase.test.ts`

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-091 | 異常系 | Level 2内でdomain_model.md未整備のままlogical_design.mdへ進もうとした場合、passed=falseを返す | Level 2内上流成果物欠損 → passed=false, blockersにdomain_model.md不足 |
| IT-PD-092 | 異常系 | Level 2内でdomain_model.md未整備のままテスト設計へ進もうとした場合、passed=falseを返す | Level 2内上流成果物欠損 → passed=false, blockersにdomain_model.md不足 |

### 8.3 AC-PD-08: モード別inception/*_plan.md成果物処理

**テストファイル**: `check-phase-gate-usecase.test.ts`

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-093 | 正常系 | interactiveモードで対象ノードのplan成果物パスがinception/配下に解決される | interactiveモード + plan成果物パス → inception/{unit}/*_plan.mdとして解決確認 |
| IT-PD-094 | 正常系 | embedded-qaモードで対象ノードのplan成果物パスがinception/配下に解決される | embedded-qaモード + plan成果物パス → inception/{unit}/*_plan.mdとして解決確認 |
| IT-PD-095 | 異常系 | interactiveモードでinception/配下のplan成果物が存在しない場合、passed=falseを返す | interactiveモード + plan成果物不存在 → passed=false, blockersにplan成果物不足 |

### 8.4 AC-PD-13: relaxable依存のoverride境界比較

**テストファイル**: `validate-customization-policy-usecase.test.ts`

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-096 | 異常系 | 緩和可能な依存をoverride=falseで削除しようとした場合、valid=falseを返す | 緩和可能依存 + override=false → valid=false, errorsにoverride必要メッセージ |
| IT-PD-097 | 正常系 | 緩和可能な依存をoverride=trueで削除した場合、valid=trueを返す | 緩和可能依存 + override=true → valid=true, warnings非空（監査記録） |
| IT-PD-098 | 異常系 | 非緩和依存（Level間依存）をoverride=trueで削除しようとした場合、valid=falseを返す | Level間依存 + override=true → valid=false, errorsにNonRelaxableメッセージ |

### 8.5 PhaseDependency recommends: phase-gate blockerにならない検証

**テストファイル**: `check-phase-gate-usecase.test.ts`

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-099 | 正常系 | requires依存が全て充足しrecommends依存のみ未充足の場合、passed=trueを返す | requires全充足 + recommends未充足 → passed=true |
| IT-PD-100 | 正常系 | recommends依存が未充足の場合、warningsにrecommends未充足の警告が含まれる | recommends未充足 → warnings非空にrecommends警告含む |

### 8.6 PhaseCustomizationPolicy: preset=default + customRules併用時の追加依存解釈

**テストファイル**: `validate-customization-policy-usecase.test.ts`, `build-phase-dependency-graph-usecase.test.ts`

| ケースID | カテゴリ | テストケース名 | 検証内容 |
|---------|---------|-------------|---------|
| IT-PD-101 | 正常系 | preset=defaultかつcustomRulesで依存追加を指定した場合、既定依存が維持されたまま追加依存が適用される | preset=default + customRules追加 → 既定依存維持 + edges増加 |
| IT-PD-102 | 正常系 | preset=defaultかつcustomRulesで依存追加を指定した場合、既定依存の削除は行われない | preset=default + customRules → 既定依存のedgesが減少しないことを確認 |
