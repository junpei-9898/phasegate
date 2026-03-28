# ITテストロジック設計: phase-dependency-model

## 1. テストファイル構成

| テストファイル | target | 対応ケースID |
|---|---|---|
| `scripts/harness/__tests__/phase-dependency-model/application/check-phase-gate-usecase.test.ts` | `CheckPhaseGateUseCase.execute` | IT-PD-001〜010 |
| `scripts/harness/__tests__/phase-dependency-model/application/check-phase-gate-usecase.test.ts` | `EvidenceBundleAssembler.assembleForLevel` | IT-PD-033〜037 |
| `scripts/harness/__tests__/phase-dependency-model/application/check-phase-gate-usecase.test.ts` | `PhaseGateResultMapper.toDto` | IT-PD-043〜045 |
| `scripts/harness/__tests__/phase-dependency-model/application/build-phase-dependency-graph-usecase.test.ts` | `BuildPhaseDependencyGraphUseCase.execute` | IT-PD-011〜016 |
| `scripts/harness/__tests__/phase-dependency-model/application/get-phase-info-usecase.test.ts` | `GetPhaseInfoUseCase.execute` | IT-PD-017〜023 |
| `scripts/harness/__tests__/phase-dependency-model/application/get-phase-info-usecase.test.ts` | `PhaseInfoResolver.resolve` | IT-PD-038〜042 |
| `scripts/harness/__tests__/phase-dependency-model/application/validate-customization-policy-usecase.test.ts` | `ValidateCustomizationPolicyUseCase.execute` | IT-PD-024〜028 |
| `scripts/harness/__tests__/phase-dependency-model/application/record-phase-override-audit-usecase.test.ts` | `RecordPhaseOverrideAuditUseCase.execute` | IT-PD-029〜032 |
| `scripts/harness/__tests__/phase-dependency-model/infrastructure/file-system-artifact-existence-checker.test.ts` | `FileSystemArtifactExistenceChecker.checkAll` | IT-PD-046〜050 |
| `scripts/harness/__tests__/phase-dependency-model/infrastructure/markdown-plan-document-reader.test.ts` | `MarkdownPlanDocumentReader.readEvidence` | IT-PD-051〜058 |
| `scripts/harness/__tests__/phase-dependency-model/infrastructure/harness-config-phase-config-provider.test.ts` | `HarnessConfigPhaseConfigProvider.getPlanningMode` / `getCustomizationPolicy` / `getReportingOutputDir` | IT-PD-059〜064 |
| `scripts/harness/__tests__/phase-dependency-model/infrastructure/phase-override-audit-logger.test.ts` | `PhaseOverrideAuditLogger.record` | IT-PD-065〜067 |
| `scripts/harness/__tests__/phase-dependency-model/presentation/check-phase-command-handler.test.ts` | `CheckPhaseCommandHandler.handle` | IT-PD-068〜072 |
| `scripts/harness/__tests__/phase-dependency-model/presentation/check-phase-command-handler.test.ts` | `PhaseInfoPresenter.present` | IT-PD-082〜084 |
| `scripts/harness/__tests__/phase-dependency-model/presentation/check-ready-command-handler.test.ts` | `CheckReadyCommandHandler.handle` | IT-PD-073〜077 |
| `scripts/harness/__tests__/phase-dependency-model/presentation/check-ready-command-handler.test.ts` | `PhaseGateResultPresenter.present` | IT-PD-085〜087 |
| `scripts/harness/__tests__/phase-dependency-model/presentation/phase-gate-validator-facade.test.ts` | `PhaseGateValidatorFacade.validate` | IT-PD-078〜081 |

共通ルールは全ファイルで固定する。

```ts
const target = describe;
const context = describe;

afterEach(() => {
  vi.restoreAllMocks();
});
```

各 `it()` は必ず日本語名にし、内部は `// Arrange` `// Act` `// Assert` の順で記述する。Act の戻り値は必ず `actual` に代入する。

## 2. テストヘルパー・シードデータ

### 2.1 共通ヘルパー

```ts
function createScope(partial?: { unitId?: string; storyId?: string }) {
  return {
    unitId: partial?.unitId ?? "phase-dependency-model",
    storyId: partial?.storyId,
  };
}

function createPhaseConfigProviderStub(seed?: {
  defaultPlanningMode?: "interactive" | "embedded-qa";
  perPhasePlanningMode?: Record<string, "interactive" | "embedded-qa">;
  customizationPolicy?: PhaseCustomizationPolicy;
  reportingOutputDir?: string;
}) {
  return {
    getPlanningMode: vi.fn(async (scope, nodeKey) => {
      if (seed?.perPhasePlanningMode?.[nodeKey]) {
        return PlanningMode.fromConfig(seed.perPhasePlanningMode[nodeKey]);
      }
      return PlanningMode.fromConfig(seed?.defaultPlanningMode ?? "embedded-qa");
    }),
    getCustomizationPolicy: vi.fn(async () => seed?.customizationPolicy ?? defaultPolicySeed()),
    getReportingOutputDir: vi.fn(async () => seed?.reportingOutputDir ?? "tmp/phase-audit"),
  };
}

function createArtifactExistenceCheckerStub(artifactStatuses: Record<string, boolean>) {
  return {
    checkAll: vi.fn(async (artifacts, scope) => new Map(
      artifacts.map((artifact) => [artifact.resolve(scope), artifactStatuses[artifact.resolve(scope)] ?? false]),
    )),
  };
}

function createPlanDocumentReaderStub(planEvidences: Record<string, PlanEvidence>) {
  return {
    readEvidence: vi.fn(async (artifactPath) => planEvidences[artifactPath] ?? new PlanEvidence(false, false, false)),
  };
}

function createAuditLoggerStub() {
  return {
    record: vi.fn(async () => undefined),
  };
}

function createCheckPhaseGateHarness(seed?: SeedOptions) {
  const phaseConfigProvider = createPhaseConfigProviderStub(seed?.config);
  const artifactExistenceChecker = createArtifactExistenceCheckerStub(seed?.artifactStatuses ?? {});
  const planDocumentReader = createPlanDocumentReaderStub(seed?.planEvidences ?? {});
  const auditLogger = createAuditLoggerStub();
  const evidenceBundleAssembler = new EvidenceBundleAssembler({
    artifactExistenceChecker,
    planDocumentReader,
    phaseConfigProvider,
  });
  const phaseGateResultMapper = new PhaseGateResultMapper();
  const sut = new CheckPhaseGateUseCase({
    phaseConfigProvider,
    evidenceBundleAssembler,
    phaseGateResultMapper,
    auditLogger,
  });

  return { sut, phaseConfigProvider, artifactExistenceChecker, planDocumentReader, auditLogger, evidenceBundleAssembler, phaseGateResultMapper };
}
```

### 2.2 Policy Seed

| Seed 名 | 内容 | 主な使用ケース |
|---|---|---|
| `defaultPolicySeed()` | `preset=default`, `rules=[]`, `overrideEnabled=false` | IT-PD-001, 002, 004, 011, 024 |
| `overridePolicySeed()` | `preset=custom`, 追加依存あり, `overrideEnabled=true` | IT-PD-003, 016, 029, 045, 062 |
| `warningOnlyPolicySeed()` | 重複追加依存など warning のみ発生する policy | IT-PD-025 |
| `nonRelaxableOverridePolicySeed()` | Level間依存の削除要求を含む policy | IT-PD-008, 014, 027 |
| `cyclicPolicySeed()` | 巡回依存を発生させる policy | IT-PD-009, 015, 028 |
| `unknownNodePolicySeed()` | 未知ノード参照を含む policy | IT-PD-026 |
| `defaultWithExtraRulePolicySeed()` | `preset=default` のまま追加依存のみ付与 | IT-PD-016, 061 |

### 2.3 Plan / Config / File Fixture

| Helper 名 | 目的 | 主な使用ケース |
|---|---|---|
| `buildAnsweredQaPlan()` | `## QA` 節に全回答がある Markdown を返す | IT-PD-051, 055, 056 |
| `buildUnansweredQaPlan()` | `A:` が空の Markdown を返す | IT-PD-052 |
| `buildPlanWithoutQa()` | QA 節なし Markdown を返す | IT-PD-053 |
| `buildBrokenQaHeadingPlan()` | QA 見出しが壊れた Markdown を返す | IT-PD-057 |
| `buildParenthesizedQaHeadingPlan()` | `## QA（設計判断の根拠）` 形式の Markdown を返す | IT-PD-058 |
| `writeTempFile(rootDir, relativePath, content)` | 一時ディレクトリ配下へ fixture を書く | IT-PD-046〜067 |
| `createHarnessConfigFixture(partial)` | `HarnessConfigV2` 相当のオブジェクトを生成する | IT-PD-059〜064 |
| `readJsonlLines(filePath)` | JSONL 監査ログの行数と payload を検証する | IT-PD-065〜066 |
| `expectIso8601(value)` | `generatedAt` の ISO8601 形式を検証する | IT-PD-030 |

### 2.4 Domain 実体の使い方

```ts
function createPhaseStructure(policy = defaultPolicySeed()) {
  return PhaseStructure.createDefault(policy);
}

function createSatisfiedEvidenceBundle(targetLevel: 1 | 2 | 3, scope: Scope, mode: "interactive" | "embedded-qa") {
  const structure = createPhaseStructure();
  const prerequisiteNodes = collectPrerequisiteNodes(structure, PhaseLevel.from(targetLevel));

  return {
    artifactStatuses: buildArtifactStatusMap(prerequisiteNodes, scope, true),
    planEvidences: buildPlanEvidenceMap(prerequisiteNodes, mode, "fulfilled"),
  };
}
```

`PhaseStructure`、`PhaseLevel`、`PlanningMode`、`PlanEvidence` などの domain 実体はすべて本物を使う。欠損や異常系は Port Stub の戻り値か config seed で発生させる。

## 3. UseCase統合テスト詳細ロジック

### 3.1 `check-phase-gate-usecase.test.ts`

#### ベース疑似コード

```ts
target("CheckPhaseGateUseCase.execute", () => {
  describe("phase gate 判定を実行する", () => {
    context("前提条件ごとに phase gate の通過可否が変わる場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const scope = createScope({ storyId: "H02-01" });
        const targetLevel = PhaseLevel.from(3);
        const { sut, auditLogger } = createCheckPhaseGateHarness(seed);

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual).toMatchObject(expectedDto);
        expect(auditLogger.record).toHaveBeenCalledTimes(expectedAuditCount);
      });
    });
  });
});
```

#### `CheckPhaseGateUseCase.execute`

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-001 | `context("Level 3進行前提の成果物とplan証跡が全て揃っている場合")` `it("全前提成果物が存在しPlanEvidenceも充足している場合、passed=trueのPhaseGateResultDtoを返す")` | `createSatisfiedEvidenceBundle(3, scope, "embedded-qa")` を使い、policy は `defaultPolicySeed()` にする | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === true` `actual.targetLevel === 3` `actual.blockers=[]` `actual.auditRecorded=false` |
| IT-PD-002 | `context("Level 1だけ完了している状態でLevel 2判定を行う場合")` `it("Level 1完了済みでLevel 2のgate判定を実行した場合、passed=trueを返す")` | Level 1 ノードだけ `artifactStatuses=true` / `planEvidences=充足` にする | `sut.execute({ scope, targetLevel: PhaseLevel.from(2) })` | `actual.passed === true` `actual.targetLevel === 2` `actual.blockers=[]` |
| IT-PD-003 | `context("override適用で監査記録が必要な場合")` `it("override適用時にauditPayloadがある場合、auditLoggerのrecordが呼び出される")` | config provider が `overridePolicySeed()` を返し、追加依存を含む `PhaseStructure` が `auditPayload` を返す状態を作る | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.auditRecorded === true` `auditLogger.record` が 1 回呼ばれ、payload に `requestedOverride=true` と `appliedRules` が入る |
| IT-PD-004 | `context("override適用がない場合")` `it("override適用がない場合、auditLoggerのrecordが呼び出されない")` | IT-PD-001 と同じ成功シードを使い、`overrideEnabled=false` に固定する | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.auditRecorded === false` `auditLogger.record` が未呼び出し |
| IT-PD-005 | `context("前提成果物が一部欠損している場合")` `it("前提成果物が欠損している場合、passed=falseでblockersに欠損理由が含まれる")` | Level 2 または Level 1 必須成果物の 1 つを `false` にする | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === false` `actual.blockers` に欠損ファイルパスまたは nodeKey を含む |
| IT-PD-006 | `context("embedded-qaモードでQA未回答のplanがある場合")` `it("PlanEvidenceのqaCompleteがfalseの場合、passed=falseを返す")` | planning mode を `embedded-qa`、対象 plan の `PlanEvidence(true, false, false)` を返す | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === false` `actual.blockers` に QA 未回答理由を含む |
| IT-PD-007 | `context("interactiveモードでQA節が不足している場合")` `it("PlanEvidenceのplanningModeMatchがfalseの場合、passed=falseを返す")` | planning mode を `interactive`、対象 plan の `PlanEvidence(true, false, false)` を返す | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === false` `actual.blockers` に planning mode 不一致理由を含む |
| IT-PD-008 | `context("非緩和依存の削除を含むpolicyが渡された場合")` `it("NonRelaxableDependencyOverrideErrorがPhaseStructure生成時に発生した場合、そのまま上位へ送出される")` | config provider の `getCustomizationPolicy` が `nonRelaxableOverridePolicySeed()` を返す | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `await expect(...).rejects.toThrow(NonRelaxableDependencyOverrideError)` |
| IT-PD-009 | `context("巡回依存を含むpolicyが渡された場合")` `it("CyclicPhaseDependencyErrorが発生した場合、そのまま上位へ送出される")` | config provider の `getCustomizationPolicy` が `cyclicPolicySeed()` を返す | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `await expect(...).rejects.toThrow(CyclicPhaseDependencyError)` |
| IT-PD-010 | `context("Domain結果をDTOへ写像する場合")` `it("PhaseGateResultDtoのtargetLevel, blockers, warnings, auditRecordedが正しく写像される")` | warnings と blocker を両方含む `PhaseGateResult` を返すように evidence を調整する | `sut.execute({ scope, targetLevel: PhaseLevel.from(2) })` | `actual.targetLevel` `actual.blockers` `actual.warnings` `actual.auditRecorded` を個別検証する |

#### `EvidenceBundleAssembler.assembleForLevel`

```ts
target("EvidenceBundleAssembler.assembleForLevel", () => {
  describe("phase gate 判定用の証跡束を収集する", () => {
    context("Port の戻り値を前提ノード単位で束ねる場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const scope = createScope({ storyId: "H02-01" });
        const structure = createPhaseStructure();
        const sut = createCheckPhaseGateHarness(seed).evidenceBundleAssembler;

        // Act
        const actual = await sut.assembleForLevel({
          structure,
          scope,
          targetLevel: PhaseLevel.from(3),
        });

        // Assert
        expect(actual.artifactStatuses).toBeInstanceOf(Map);
        expect(actual.planEvidences).toBeInstanceOf(Map);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-033 | `context("前提ノード全ての証跡を収集する場合")` `it("指定Levelの前提ノード全てに対してartifactStatuses・planEvidencesが収集される")` | Level 3 の前提ノード集合に対して全 artifact / 全 plan を stub 返却する | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `actual.artifactStatuses.size` が前提 artifact 数と一致し、`actual.planEvidences.size` が plan artifact 数と一致する |
| IT-PD-034 | `context("scope付きでプレースホルダを解決する場合")` `it("scope指定時にArtifactのプレースホルダが解決された上で存在判定される")` | `scope = { unitId, storyId }` を渡し、stub 側で解決済みパスを観測できるようにする | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `artifactExistenceChecker.checkAll` に渡された artifact から `docs/inception/phase-dependency-model/H02-01/...` の解決済みパスが使われる |
| IT-PD-035 | `context("planning mode を plan 判定へ渡す場合")` `it("PlanningModeがPhaseConfigProviderPortから取得されPlanEvidence判定に使用される")` | `phaseConfigProvider.getPlanningMode` を nodeKey ごとに返す stub にし、interactive ノードだけ QA 節必須にする | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `phaseConfigProvider.getPlanningMode` の呼び出し回数と nodeKey を検証し、`planEvidences` に mode 反映済み値が入る |
| IT-PD-036 | `context("成果物存在判定でPortが失敗する場合")` `it("ArtifactExistenceCheckerPort失敗時に例外が伝播される")` | `artifactExistenceChecker.checkAll` を reject させる | `assembleForLevel({ structure, scope, targetLevel: 2 })` | `await expect(...).rejects.toThrow(seedError)` |
| IT-PD-037 | `context("plan読取でPortが失敗する場合")` `it("PlanDocumentReaderPort失敗時に例外が伝播される")` | `planDocumentReader.readEvidence` を reject させる | `assembleForLevel({ structure, scope, targetLevel: 2 })` | `await expect(...).rejects.toThrow(seedError)` |

#### `PhaseGateResultMapper.toDto`

```ts
target("PhaseGateResultMapper.toDto", () => {
  describe("domain の phase gate 結果を DTO に変換する", () => {
    context("PhaseGateResult を CLI/validator 向け DTO に変換する場合", () => {
      it("...日本語ケース名...", () => {
        // Arrange
        const sut = new PhaseGateResultMapper();
        const phaseGateResult = new PhaseGateResult(...);

        // Act
        const actual = sut.toDto({ phaseGateResult, targetLevel: PhaseLevel.from(3) });

        // Assert
        expect(actual).toMatchObject(expectedDto);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-043 | `context("通過結果をDTOに変換する場合")` `it("passed=trueのPhaseGateResultがPhaseGateResultDtoに正しく変換される")` | `PhaseGateResult(true, [], ["warning-1"], undefined)` を作る | `toDto(...)` | `actual.passed === true` `actual.blockers=[]` `actual.warnings=["warning-1"]` `actual.auditRecorded=false` |
| IT-PD-044 | `context("阻害結果をDTOに変換する場合")` `it("passed=falseのPhaseGateResultがblockersを含むDtoに変換される")` | `PhaseGateResult(false, ["missing logical_design.md"], [], undefined)` を作る | `toDto(...)` | `actual.passed === false` `actual.blockers` に blocker が入る |
| IT-PD-045 | `context("監査付き結果をDTOに変換する場合")` `it("auditPayload存在時にauditRecorded=trueとなる")` | `auditPayload` 付き `PhaseGateResult` を作る | `toDto(...)` | `actual.auditRecorded === true` |

### 3.2 `build-phase-dependency-graph-usecase.test.ts`

#### ベース疑似コード

```ts
target("BuildPhaseDependencyGraphUseCase.execute", () => {
  describe("phase dependency graph を構築する", () => {
    context("customization policy に応じて有効依存を作る場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const phaseConfigProvider = createPhaseConfigProviderStub({ customizationPolicy: defaultPolicySeed() });
        const sut = new BuildPhaseDependencyGraphUseCase({ phaseConfigProvider });

        // Act
        const actual = await sut.execute({ includeArtifacts: true });

        // Assert
        expect(actual.nodes.length).toBeGreaterThan(0);
        expect(actual.edges.length).toBeGreaterThan(0);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-011 | `context("デフォルトpolicyでグラフを構築する場合")` `it("デフォルトポリシーで全ノードと全依存のグラフDTOを返す")` | provider から `defaultPolicySeed()` を返す | `execute({ includeArtifacts: true })` | `actual.nodes` が全 `PhaseNode` 数と一致し、`actual.edges` が既定依存数と一致する |
| IT-PD-012 | `context("成果物一覧も返す場合")` `it("includeArtifacts=trueの場合、ノードDTOに成果物パスが含まれる")` | IT-PD-011 と同じ seed | `execute({ includeArtifacts: true })` | `actual.nodes.every(node => node.artifacts !== undefined)` |
| IT-PD-013 | `context("成果物一覧を省略する場合")` `it("includeArtifacts未指定の場合、ノードDTOから成果物パスが省略される")` | IT-PD-011 と同じ seed | `execute({})` | `actual.nodes.every(node => node.artifacts === undefined)` |
| IT-PD-014 | `context("非緩和依存を削除するpolicyが渡る場合")` `it("NonRelaxableDependencyOverrideErrorがそのまま上位へ送出される")` | `nonRelaxableOverridePolicySeed()` を返す | `execute({ includeArtifacts: false })` | `await expect(...).rejects.toThrow(NonRelaxableDependencyOverrideError)` |
| IT-PD-015 | `context("巡回依存を含むpolicyが渡る場合")` `it("CyclicPhaseDependencyErrorがそのまま上位へ送出される")` | `cyclicPolicySeed()` を返す | `execute({ includeArtifacts: false })` | `await expect(...).rejects.toThrow(CyclicPhaseDependencyError)` |
| IT-PD-016 | `context("追加依存が有効依存へ反映される場合")` `it("カスタムルール適用後の有効依存がグラフのedgesに反映される")` | `defaultWithExtraRulePolicySeed()` を返す | `execute({ includeArtifacts: false })` | `actual.edges` に追加依存 edge が含まれ、既定依存より件数が増える |

### 3.3 `get-phase-info-usecase.test.ts`

#### ベース疑似コード

```ts
target("GetPhaseInfoUseCase.execute", () => {
  describe("phase 情報を取得する", () => {
    context("現時点の完了状態から currentLevel と nextNodes を解決する場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const scope = createScope({ storyId: "H02-01" });
        const phaseInfoResolver = new PhaseInfoResolver();
        const evidenceBundleAssembler = createGetPhaseInfoHarness(seed).evidenceBundleAssembler;
        const sut = createGetPhaseInfoHarness(seed).sut;

        // Act
        const actual = await sut.execute({ scope });

        // Assert
        expect(actual.currentLevel).toBe(expectedLevel);
        expect(actual.completedNodes).toEqual(expectedCompletedNodes);
        expect(actual.nextNodes).toEqual(expectedNextNodes);
      });
    });
  });
});
```

#### `GetPhaseInfoUseCase.execute`

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-017 | `context("Level 1 が全完了している場合")` `it("Level 1成果物が全て存在する場合、currentLevel=2でcompletedNodesにLevel 1ノードが含まれる")` | Level 1 の全 artifact / plan を充足させ、Level 2 以降は未充足にする | `sut.execute({ scope })` | `actual.currentLevel === 2` `actual.completedNodes` に Level 1 ノードキーが入る |
| IT-PD-018 | `context("Level 1 と Level 2 が全完了している場合")` `it("Level 1とLevel 2の成果物が全て存在する場合、currentLevel=3を返す")` | Level 1 と Level 2 を充足させる | `sut.execute({ scope })` | `actual.currentLevel === 3` |
| IT-PD-019 | `context("何も完了していない場合")` `it("何も完了していない場合、currentLevel=1でnextNodesにLevel 1起点ノードが含まれる")` | 全 artifact / plan を未存在にする | `sut.execute({ scope })` | `actual.currentLevel === 1` `actual.nextNodes` に `1:product-architect` を含む |
| IT-PD-020 | `context("storyId 指定で対象を絞り込む場合")` `it("storyId指定時に該当ストーリーのスコープで絞り込まれたPhaseInfoDtoを返す")` | `scope.storyId = "H02-01"` を指定し、Level 3 artifact の resolved path が storyId を含む状態にする | `sut.execute({ scope })` | `phaseConfigProvider.getPlanningMode` や plan/evidence 読取に storyId 付き scope が渡る |
| IT-PD-021 | `context("欠損理由も返す場合")` `it("blockersにphase-gate未充足の理由が含まれる")` | Level 2 の必須成果物 1 件だけ欠損させる | `sut.execute({ scope })` | `actual.blockers` に欠損理由が含まれる |
| IT-PD-022 | `context("設定取得が失敗する場合")` `it("PhaseConfigProviderPortの設定取得失敗時に例外が伝播される")` | `phaseConfigProvider.getPlanningMode` を reject させる | `sut.execute({ scope })` | `await expect(...).rejects.toThrow(seedError)` |
| IT-PD-023 | `context("plan文書解析が失敗する場合")` `it("PlanDocumentReaderPort経由のplan文書解析失敗時に例外が伝播される")` | `planDocumentReader.readEvidence` を `PlanDocumentParseError` で reject させる | `sut.execute({ scope })` | `await expect(...).rejects.toThrow(PlanDocumentParseError)` |

#### `PhaseInfoResolver.resolve`

```ts
target("PhaseInfoResolver.resolve", () => {
  describe("証跡状態から phase 情報を導出する", () => {
    context("完了済みノードと次着手ノードを計算する場合", () => {
      it("...日本語ケース名...", () => {
        // Arrange
        const structure = createPhaseStructure();
        const sut = new PhaseInfoResolver();
        const evidence = createResolvedEvidence(seed);

        // Act
        const actual = sut.resolve({ structure, evidence });

        // Assert
        expect(actual.currentLevel).toBe(expectedLevel);
        expect(actual.completedNodes).toEqual(expectedCompletedNodes);
        expect(actual.nextNodes).toEqual(expectedNextNodes);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-038 | `context("全ノード完了時の現フェーズを解決する場合")` `it("全ノードの成果物が存在する場合、最高Levelをcurrent levelとして返す")` | Level 1〜3 全て完了した evidence を組む | `resolve({ structure, evidence })` | `actual.currentLevel === 3` |
| IT-PD-039 | `context("途中レベルで欠損がある場合")` `it("一部ノードの成果物が欠損している場合、未完了ノードの直前Levelを返す")` | Level 2 の一部ノードだけ未完了にする | `resolve({ structure, evidence })` | `actual.currentLevel === 2` |
| IT-PD-040 | `context("completedNodes を抽出する場合")` `it("completedNodesに完了済みノードキーのみが含まれる")` | 完了ノードと未完了ノードが混在する evidence を作る | `resolve({ structure, evidence })` | `actual.completedNodes` が完了ノードキーだけで構成される |
| IT-PD-041 | `context("nextNodes を抽出する場合")` `it("nextNodesに次に着手可能なノードキーが含まれる")` | 依存解決済みの未完了ノードを 2 件だけ作る | `resolve({ structure, evidence })` | `actual.nextNodes` に依存充足済み未完了ノードのみが入る |
| IT-PD-042 | `context("初期状態を解決する場合")` `it("completedNodesが空の場合、currentLevel=1でnextNodesにLevel 1起点が含まれる")` | 全未完了 evidence を使う | `resolve({ structure, evidence })` | `actual.currentLevel === 1` `actual.completedNodes=[]` `actual.nextNodes` に Level 1 起点のみが入る |

### 3.4 `validate-customization-policy-usecase.test.ts`

#### ベース疑似コード

```ts
target("ValidateCustomizationPolicyUseCase.execute", () => {
  describe("customization policy を検証する", () => {
    context("policy を PhaseStructure へ適用できるか判定する場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const phaseConfigProvider = createPhaseConfigProviderStub({ customizationPolicy: seedPolicy });
        const sut = new ValidateCustomizationPolicyUseCase({ phaseConfigProvider });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.valid).toBe(expectedValid);
        expect(actual.errors).toEqual(expectedErrors);
        expect(actual.warnings).toEqual(expectedWarnings);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-024 | `context("デフォルトpolicyが有効な場合")` `it("デフォルトポリシーで例外なく構築された場合、valid=trueを返す")` | `defaultPolicySeed()` を返す | `execute()` | `actual.valid === true` `actual.errors=[]` |
| IT-PD-025 | `context("warning のみが発生する場合")` `it("warnings付きでvalid=trueを返す場合、warningsにメッセージが含まれる")` | `warningOnlyPolicySeed()` を返す | `execute()` | `actual.valid === true` `actual.warnings.length > 0` |
| IT-PD-026 | `context("未知ノード参照を含む場合")` `it("InvalidCustomRuleErrorが発生した場合、errorsに変換されてvalid=falseを返す")` | `unknownNodePolicySeed()` を返す | `execute()` | `actual.valid === false` `actual.errors` に unknown node 文言を含む |
| IT-PD-027 | `context("非緩和依存の削除要求を含む場合")` `it("NonRelaxableDependencyOverrideErrorが発生した場合、errorsに変換されてvalid=falseを返す")` | `nonRelaxableOverridePolicySeed()` を返す | `execute()` | `actual.valid === false` `actual.errors` に non-relaxable 文言を含む |
| IT-PD-028 | `context("巡回依存を含む場合")` `it("CyclicPhaseDependencyErrorが発生した場合、errorsに変換されてvalid=falseを返す")` | `cyclicPolicySeed()` を返す | `execute()` | `actual.valid === false` `actual.errors` に cyclic 文言を含む |

### 3.5 `record-phase-override-audit-usecase.test.ts`

#### ベース疑似コード

```ts
target("RecordPhaseOverrideAuditUseCase.execute", () => {
  describe("override 監査ログを記録する", () => {
    context("監査payloadを Port へ受け渡す場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const auditLogger = createAuditLoggerStub();
        const sut = new RecordPhaseOverrideAuditUseCase({ auditLogger });
        const input = buildAuditInput();

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(actual).toBeUndefined();
        expect(auditLogger.record).toHaveBeenCalledWith(expectedPayload);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-029 | `context("標準的なoverride監査を記録する場合")` `it("auditLoggerのrecordが正しいペイロードで呼び出される")` | `scope`, `targetLevel`, `appliedRules`, `requestedOverride=true` を含む input を作る | `execute(input)` | `auditLogger.record` 引数の `scope` `targetLevel` `appliedRules` `requestedOverride` を検証する |
| IT-PD-030 | `context("generatedAt を usecase 側で補完する場合")` `it("generatedAtがISO8601形式で生成される")` | `vi.useFakeTimers().setSystemTime()` で固定時刻にする | `execute(input)` | `auditLogger.record.mock.calls[0][0].generatedAt` を `expectIso8601` で検証する |
| IT-PD-031 | `context("Port 書込が失敗する場合")` `it("auditLogger失敗時にAuditLogWriteErrorとして上位へ送出される")` | `auditLogger.record` を reject させる | `execute(input)` | `await expect(...).rejects.toThrow(AuditLogWriteError)` |
| IT-PD-032 | `context("適用ルールが空配列の場合")` `it("appliedRulesが空配列の場合もrecordが呼び出される")` | `appliedRules=[]` の input を作る | `execute(input)` | `auditLogger.record` が 1 回呼ばれ、`appliedRules=[]` が保持される |

## 4. Adapter統合テスト詳細ロジック

### 4.1 Infrastructure Adapter

#### 4.1.1 `file-system-artifact-existence-checker.test.ts`

```ts
target("FileSystemArtifactExistenceChecker.checkAll", () => {
  describe("成果物ファイルの存在を判定する", () => {
    context("一時ディレクトリ上の docs ファイルを走査する場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new FileSystemArtifactExistenceChecker({ projectRoot: tempRoot });
        const scope = createScope({ storyId: "H02-01" });
        const artifacts = buildArtifactsForCase(tempRoot);

        // Act
        const actual = await sut.checkAll(artifacts, scope);

        // Assert
        expect(actual.get(resolvedPath)).toBe(expectedExists);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-046 | `context("対象ファイルが存在する場合")` `it("存在するファイルに対してtrueを含むMapを返す")` | 一時ディレクトリへ対象ファイルを作成する | `checkAll(artifacts, scope)` | `actual.get(path) === true` |
| IT-PD-047 | `context("対象ファイルが存在しない場合")` `it("存在しないファイルに対してfalseを含むMapを返す")` | ファイルを作成しない | `checkAll(artifacts, scope)` | `actual.get(path) === false` |
| IT-PD-048 | `context("プレースホルダを含む成果物を判定する場合")` `it("プレースホルダ解決後のパスで存在判定される")` | `{unit}` を含む `Artifact` を作り、解決後パスにだけファイルを置く | `checkAll(artifacts, createScope({ unitId: "phase-dependency-model" }))` | `actual.get(resolvedPath) === true` |
| IT-PD-049 | `context("required=false の成果物も収集する場合")` `it("required=falseの成果物もMapに含まれる")` | `required=false` の `Artifact` を含める | `checkAll(artifacts, scope)` | `actual.has(optionalArtifactPath) === true` |
| IT-PD-050 | `context("storyId 未指定で story 成果物を判定する場合")` `it("storyId未指定で {storyId} プレースホルダを含む成果物はfalseを返す")` | `{storyId}` を含む `Artifact` を作り、scope から storyId を省く | `checkAll(artifacts, createScope())` | `actual.get(unresolvedStoryArtifactPath) === false` |

#### 4.1.2 `markdown-plan-document-reader.test.ts`

```ts
target("MarkdownPlanDocumentReader.readEvidence", () => {
  describe("plan Markdown から PlanEvidence を抽出する", () => {
    context("QA節の有無と回答状態を判定する場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new MarkdownPlanDocumentReader({ projectRoot: tempRoot });
        const filePath = writeTempFile(tempRoot, relativePath, markdown);

        // Act
        const actual = await sut.readEvidence({
          artifactPath: filePath,
          planningMode,
        });

        // Assert
        expect(actual).toEqual(expectedPlanEvidence);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-051 | `context("QA節があり全回答済みのplanを読む場合")` `it("plan文書が存在しQA節ありで全回答済みの場合、exists=true, qaComplete=true, planningModeMatch=trueを返す")` | `buildAnsweredQaPlan()` を書き込み、planning mode を `embedded-qa` にする | `readEvidence({ artifactPath, planningMode })` | `actual === new PlanEvidence(true, true, true)` |
| IT-PD-052 | `context("QA節に未回答があるplanを読む場合")` `it("plan文書が存在しQA節ありで未回答がある場合、qaComplete=falseを返す")` | `buildUnansweredQaPlan()` を書き込み、planning mode を `embedded-qa` にする | `readEvidence(...)` | `actual.exists === true` `actual.qaComplete === false` |
| IT-PD-053 | `context("QA節が存在しないplanを読む場合")` `it("plan文書が存在しQA節なしの場合、qaComplete=false, planningModeMatch判定はモード依存")` | `buildPlanWithoutQa()` を書き込み、planning mode を `interactive` にする | `readEvidence(...)` | `actual.exists === true` `actual.qaComplete === false` `actual.planningModeMatch === false` |
| IT-PD-054 | `context("plan文書自体が存在しない場合")` `it("plan文書が存在しない場合、PlanEvidence(false, false, false)を返す")` | ファイルを作成しない | `readEvidence(...)` | `actual === new PlanEvidence(false, false, false)` |
| IT-PD-055 | `context("interactive モードの適合性を判定する場合")` `it("interactiveモードの場合、QA節の存在がplanningModeMatchとなる")` | `buildAnsweredQaPlan()` を書き込み、planning mode を `interactive` にする | `readEvidence(...)` | `actual.planningModeMatch === true` |
| IT-PD-056 | `context("embedded-qa モードの適合性を判定する場合")` `it("embedded-qaモードの場合、QA全回答済みがplanningModeMatchとなる")` | `buildAnsweredQaPlan()` を書き込み、planning mode を `embedded-qa` にする | `readEvidence(...)` | `actual.planningModeMatch === true` |
| IT-PD-057 | `context("QA 見出しが壊れている場合")` `it("見出しが壊れている場合、exists=true, qaComplete=false, planningModeMatch=falseを返す")` | `buildBrokenQaHeadingPlan()` を書き込み、planning mode を `interactive` にする | `readEvidence(...)` | `actual.exists === true` `actual.qaComplete === false` `actual.planningModeMatch === false` |
| IT-PD-058 | `context("括弧付き QA 見出しを読む場合")` `it("## QA（設計判断の根拠）形式の見出しを正しく検出する")` | `buildParenthesizedQaHeadingPlan()` を書き込む | `readEvidence(...)` | `actual.exists === true` `actual.planningModeMatch === true` |

#### 4.1.3 `harness-config-phase-config-provider.test.ts`

```ts
target("HarnessConfigPhaseConfigProvider", () => {
  describe("HarnessConfigV2 を phase dependency model の意味論に変換する", () => {
    context("planningMode / phaseDependencies / reporting を読む場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const config = createHarnessConfigFixture(partial);
        const sut = new HarnessConfigPhaseConfigProvider({ config });

        // Act
        const actual = await sut.someMethod(input);

        // Assert
        expect(actual).toEqual(expectedValue);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-059 | `context("default planning mode を取得する場合")` `it("planningMode.defaultからデフォルトPlanningModeを取得できる")` | `planningMode.default="embedded-qa"` の config を作る | `getPlanningMode(scopeWithoutSpecificNode)` | `actual.equals(PlanningMode.fromConfig("embedded-qa")) === true` |
| IT-PD-060 | `context("perPhase planning mode を取得する場合")` `it("planningMode.perPhaseのscope指定でperPhase PlanningModeを取得できる")` | `perPhase["2:it-test-designer"]="interactive"` を含む config を作る | `getPlanningMode(scope, "2:it-test-designer")` | `actual.equals(PlanningMode.fromConfig("interactive")) === true` |
| IT-PD-061 | `context("customRules を CustomRule に正規化する場合")` `it("phaseDependencies.customRulesからCustomRuleへ正規化される")` | `defaultWithExtraRulePolicySeed()` 相当の config を作る | `getCustomizationPolicy()` | `actual.rules[0]` が `CustomRule` 実体であり、`targetPhase` と `action` が config と一致する |
| IT-PD-062 | `context("preset と override を policy に変換する場合")` `it("phaseDependencies.presetとoverrideからPhaseCustomizationPolicyが正しく変換される")` | `preset="custom"` `override=true` を含む config を作る | `getCustomizationPolicy()` | `actual.preset === "custom"` `actual.overrideEnabled === true` |
| IT-PD-063 | `context("監査出力先を取得する場合")` `it("reporting.outputDirの値が取得できる")` | `reporting.outputDir="tmp/reports/phase-audit"` を含む config を作る | `getReportingOutputDir()` | `actual === "tmp/reports/phase-audit"` |
| IT-PD-064 | `context("quickMode の relaxedGates が phase dependency に影響しない場合")` `it("quickMode.relaxedGatesはLevel間依存緩和として解釈されない")` | `quickMode.relaxedGates=["phase-gate"]` を含む config を作り、その policy で `PhaseStructure.createDefault()` を呼べるようにする | `const actual = await sut.getCustomizationPolicy()` 後に `PhaseStructure.createDefault(actual)` | `Level 1→2, 2→3 の非緩和依存が残り、例外なく構築される` |

#### 4.1.4 `phase-override-audit-logger.test.ts`

```ts
target("PhaseOverrideAuditLogger.record", () => {
  describe("override 監査ログを JSONL で追記する", () => {
    context("出力ディレクトリに書込可能な場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new PhaseOverrideAuditLogger({ outputDir: tempRoot });
        const payload = buildAuditPayload();

        // Act
        const actual = await sut.record(payload);

        // Assert
        expect(actual).toBeUndefined();
        expect(readJsonlLines(logFilePath)).toEqual(expectedLines);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-065 | `context("初回の監査ログを書き込む場合")` `it("payloadがJSONL形式で1行追記される")` | 空の一時ディレクトリを用意する | `record(payload)` | 生成されたログファイルが 1 行で、JSON.parse した値が payload と一致する |
| IT-PD-066 | `context("複数回の監査ログを書き込む場合")` `it("複数回recordで追記される")` | 同じ logger に対し payload を 2 回渡す | `await record(payload1)` `await record(payload2)` | ログファイルが 2 行になり、1 行目と 2 行目の内容がそれぞれ一致する |
| IT-PD-067 | `context("出力先が書込不能な場合")` `it("書込失敗時に例外が送出される")` | 書込権限のないパス、または存在しない親ディレクトリを用意する | `record(payload)` | `await expect(...).rejects.toThrow()` |

### 4.2 Presentation Adapter

#### 4.2.1 `check-phase-command-handler.test.ts`

```ts
target("CheckPhaseCommandHandler.handle", () => {
  describe("check-phase CLI 入力を解釈して phase 情報を返す", () => {
    context("GetPhaseInfoUseCase が成功する場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const usecase = createGetPhaseInfoUseCaseStub(dtoOrError);
        const presenter = new PhaseInfoPresenter();
        const sut = new CheckPhaseCommandHandler({ usecase, presenter });

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(actual.exitCode).toBe(expectedExitCode);
        expect(actual.stdout).toContain(expectedText);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-068 | `context("text形式でphase情報を返す場合")` `it("unit指定でGetPhaseInfoUseCaseが呼び出されテキスト形式で出力される")` | usecase stub が `PhaseInfoDto` を返す。argv は `["--unit", "phase-dependency-model"]` | `handle(argv)` | `usecase.execute` が unit 指定で呼ばれ、`actual.exitCode === 0`、`actual.stdout` がテキスト形式になる |
| IT-PD-069 | `context("JSON形式でphase情報を返す場合")` `it("--json指定でPhaseInfoDtoがJSON形式で出力される")` | argv に `--json` を含める | `handle(argv)` | `actual.exitCode === 0` `JSON.parse(actual.stdout)` が `HarnessApiResponse<PhaseInfoDto>` になる |
| IT-PD-070 | `context("story指定をusecase入力へ渡す場合")` `it("--story指定でstoryIdがUseCaseのinputに渡される")` | argv に `--story H02-01` を含める | `handle(argv)` | `usecase.execute` の引数 `scope.storyId === "H02-01"` |
| IT-PD-071 | `context("対象unitまたはstoryが不正な場合")` `it("指定UnitまたはStoryが存在しない場合、exit code 1で終了する")` | usecase stub を `NotFoundError` で reject させる | `handle(argv)` | `actual.exitCode === 1` `actual.stderr` に not found 文言を含む |
| IT-PD-072 | `context("設定取得が失敗した場合")` `it("設定取得失敗時にexit code 2で終了する")` | usecase stub を config error で reject させる | `handle(argv)` | `actual.exitCode === 2` `actual.stderr` に config error 文言を含む |

#### 4.2.2 `check-ready-command-handler.test.ts`

```ts
target("CheckReadyCommandHandler.handle", () => {
  describe("check-ready CLI 入力を解釈して readiness 判定を返す", () => {
    context("CheckPhaseGateUseCase が結果配列を返す場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub(dtoListOrError);
        const presenter = new PhaseGateResultPresenter();
        const sut = new CheckReadyCommandHandler({ usecase, presenter });

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(actual.exitCode).toBe(expectedExitCode);
        expect(actual.stdout ?? actual.stderr).toContain(expectedFragment);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-073 | `context("全scopeがreadyの場合")` `it("全scopeがreadyの場合、exit code 0でテキスト出力される")` | `passed=true` の DTO 配列を返す usecase stub を用意する | `handle(argv)` | `actual.exitCode === 0` `actual.stdout` に READY 相当メッセージを含む |
| IT-PD-074 | `context("未充足scopeが含まれる場合")` `it("1件でも未充足がある場合、exit code 1で終了する")` | 1 件だけ `passed=false` の DTO を含む配列を返す | `handle(argv)` | `actual.exitCode === 1` `actual.stdout` に blocker 表示を含む |
| IT-PD-075 | `context("JSON形式で判定結果を返す場合")` `it("--json指定でPhaseGateResultDto[]がJSON形式で出力される")` | argv に `--json` を含める | `handle(argv)` | `actual.exitCode === 0` `JSON.parse(actual.stdout)` が `HarnessApiResponse<PhaseGateResultDto[]>` になる |
| IT-PD-076 | `context("scopeを unit / story で絞り込む場合")` `it("--unit/--story指定で対象scopeが絞り込まれる")` | argv に `--unit phase-dependency-model --story H02-01` を含める | `handle(argv)` | `usecase.execute` 引数の scope が unit/story で絞り込まれる |
| IT-PD-077 | `context("設定取得が失敗した場合")` `it("設定取得失敗時にexit code 2で終了する")` | usecase stub を config error で reject させる | `handle(argv)` | `actual.exitCode === 2` `actual.stderr` に config error 文言を含む |

#### 4.2.3 `phase-gate-validator-facade.test.ts`

```ts
target("PhaseGateValidatorFacade.validate", () => {
  describe("validator から phase gate 判定を実行する", () => {
    context("変更ファイルとscopeから targetLevel を導出する場合", () => {
      it("...日本語ケース名...", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub(dtoOrError);
        const sut = new PhaseGateValidatorFacade({ usecase });

        // Act
        const actual = await sut.validate(input);

        // Assert
        expect(actual).toEqual(expectedHarnessErrors);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-078 | `context("gate が通過する場合")` `it("gate通過時は空のHarnessError配列を返す")` | usecase stub が `passed=true` DTO を返す | `validate({ changedFiles, scope })` | `actual` が空配列 |
| IT-PD-079 | `context("gate が失敗する場合")` `it("gate失敗時にHarnessError配列にblockersが含まれる")` | usecase stub が `passed=false` と blocker 付き DTO を返す | `validate({ changedFiles, scope })` | `actual.length > 0` かつ `actual[0].message` に blocker 文言を含む |
| IT-PD-080 | `context("storyId が指定されている場合")` `it("storyId有りの場合、targetLevel=3で判定される")` | input に `scope.storyId="H02-01"` を入れる | `validate(input)` | `usecase.execute` の引数 `targetLevel === 3` |
| IT-PD-081 | `context("storyId が指定されていない場合")` `it("storyId無しの場合、targetLevel=2で判定される")` | input から storyId を省く | `validate(input)` | `usecase.execute` の引数 `targetLevel === 2` |

#### 4.2.4 `PhaseInfoPresenter.present`

```ts
target("PhaseInfoPresenter.present", () => {
  describe("PhaseInfoDto を text / json に整形する", () => {
    context("出力形式に応じて整形を切り替える場合", () => {
      it("...日本語ケース名...", () => {
        // Arrange
        const sut = new PhaseInfoPresenter();
        const dto = buildPhaseInfoDto();

        // Act
        const actual = sut.present({ dto, format });

        // Assert
        expect(actual).toContain(expectedFragment);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-082 | `context("text形式で整形する場合")` `it("PhaseInfoDtoをテキスト形式に整形できる")` | `currentLevel`, `completedNodes`, `nextNodes` が埋まった DTO を作る | `present({ dto, format: "text" })` | `actual` に currentLevel と node 一覧が人間可読で含まれる |
| IT-PD-083 | `context("json形式で整形する場合")` `it("PhaseInfoDtoをJSON形式に整形できる")` | DTO を作る | `present({ dto, format: "json" })` | `JSON.parse(actual)` が DTO を包むレスポンスになる |
| IT-PD-084 | `context("completedNodes が空の場合")` `it("completedNodesが空の場合でも正しく出力される")` | `completedNodes=[]` の DTO を作る | `present({ dto, format: "text" })` | `actual` に空一覧用の見出しと `0件` または同等表現が含まれる |

#### 4.2.5 `PhaseGateResultPresenter.present`

```ts
target("PhaseGateResultPresenter.present", () => {
  describe("PhaseGateResultDto を text / json に整形する", () => {
    context("通過結果と阻害結果で文面を切り替える場合", () => {
      it("...日本語ケース名...", () => {
        // Arrange
        const sut = new PhaseGateResultPresenter();
        const dto = buildPhaseGateResultDto();

        // Act
        const actual = sut.present({ dto, format });

        // Assert
        expect(actual).toContain(expectedFragment);
      });
    });
  });
});
```

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-085 | `context("通過結果をtext整形する場合")` `it("passed=trueのPhaseGateResultDtoをテキスト形式に整形できる")` | `passed=true` DTO を作る | `present({ dto, format: "text" })` | `actual` に通過メッセージが含まれる |
| IT-PD-086 | `context("阻害結果をtext整形する場合")` `it("passed=falseのPhaseGateResultDtoをテキスト形式に整形しblockersが表示される")` | blocker 2 件を含む `passed=false` DTO を作る | `present({ dto, format: "text" })` | `actual` に blocker 文言が列挙される |
| IT-PD-087 | `context("json形式で整形する場合")` `it("PhaseGateResultDtoをJSON形式に整形できる")` | DTO を作る | `present({ dto, format: "json" })` | `JSON.parse(actual)` が DTO を包むレスポンスになる |

## 5. モック戦略

| 対象 | 方針 | 理由 |
|---|---|---|
| `PhaseStructure` / 値オブジェクト | 実体を使う | domain の正規意味論をITで崩さないため |
| `ArtifactExistenceCheckerPort` | UseCaseテストでは Stub、Infrastructure テストでは実装実体 | UseCase では制御容易性を優先し、Adapter テストでは FS I/O を実検証するため |
| `PlanDocumentReaderPort` | UseCaseテストでは Stub、Infrastructure テストでは実装実体 | QA節判定の異常系をピンポイントで再現するため |
| `PhaseConfigProviderPort` | Stub または config fixture 実体 | policy / mode / reporting をケース単位で切り替えるため |
| `PhaseAuditLoggerPort` | UseCaseテストでは Stub、Infrastructure テストでは実装実体 | 監査 payload の内容と JSONL 永続化を分離して検証するため |
| `GetPhaseInfoUseCase` / `CheckPhaseGateUseCase` | Presentation テストでは Stub | CLI の責務を入力パースと出力整形に限定するため |

テスト内で避けることを明示する。

| 禁止事項 | 実施しない理由 |
|---|---|
| domain 実体の `vi.mock()` | DDD の整合性検証が弱くなる |
| `beforeEach` に巨大な Arrange を寄せること | AAA が崩れ、ケースごとの差分が読めなくなる |
| Act 結果を `result` に代入すること | テスト規約違反 |
| 英語の `it()` 名 | テスト規約違反 |

## 6. テスト実行コマンド

全件実行:

```bash
pnpm test -- scripts/harness/__tests__/phase-dependency-model
```

UseCase系のみ実行:

```bash
pnpm test -- scripts/harness/__tests__/phase-dependency-model/application
```

Adapter系のみ実行:

```bash
pnpm test -- scripts/harness/__tests__/phase-dependency-model/infrastructure
pnpm test -- scripts/harness/__tests__/phase-dependency-model/presentation
```

個別ファイル実行:

```bash
pnpm test -- scripts/harness/__tests__/phase-dependency-model/application/check-phase-gate-usecase.test.ts
pnpm test -- scripts/harness/__tests__/phase-dependency-model/infrastructure/markdown-plan-document-reader.test.ts
pnpm test -- scripts/harness/__tests__/phase-dependency-model/presentation/check-ready-command-handler.test.ts
```

監査ログや一時ディレクトリを使う Adapter テストは、Vitest の `afterEach` で必ずクリーンアップを実行する前提で実装する。

---

## ISSUE-001追加分

> **対応Issue**: ISSUE-001（inception側フェーズゲート整備）
> **参照設計**: `docs/inception/issues/ISSUE-001/logical_design.md` セクション3.1, 3.2, 3.4
> **対応ケースID**: IT-PD-103〜122（20件）

### 7. 追加テストヘルパー・シードデータ

#### 7.1 scope関連ヘルパー

```ts
function createScopeWithStory(storyId: string, unitId = "agent-integration") {
  return createScope({ unitId, storyId });
}

function createScopeWithoutStory(unitId = "agent-integration") {
  return createScope({ unitId });
}
```

#### 7.2 Level 3 成果物 resolve ヘルパー

```ts
/**
 * Level 3 成果物の解決済みパスを生成する。
 * storyId が US ID の場合: docs/inception/{unitId}/{storyId}/...
 * storyId が issue ID の場合: docs/inception/{unitId}/issues/{storyId}/...
 */
function resolveLevel3ArtifactPath(
  unitId: string,
  storyId: string,
  artifactName: string,
): string {
  const isIssueId = storyId.startsWith("ISSUE-");
  if (isIssueId) {
    return `docs/inception/${unitId}/issues/${storyId}/${artifactName}`;
  }
  return `docs/inception/${unitId}/${storyId}/${artifactName}`;
}

function buildLevel3ResolvedArtifactStatuses(
  unitId: string,
  storyId: string,
  overrides?: Record<string, boolean>,
): Record<string, boolean> {
  const artifacts = [
    "logical_design.md",
    "scenario_test_design.md",
    "scenario_test_logic.md",
    "tdd_implementation_plan.md",
  ];
  const statuses: Record<string, boolean> = {};
  for (const artifact of artifacts) {
    const path = resolveLevel3ArtifactPath(unitId, storyId, artifact);
    statuses[path] = overrides?.[artifact] ?? true;
  }
  return statuses;
}
```

#### 7.3 Seed 組み合わせ

| Seed 名 | 内容 | 主な使用ケース |
|---|---|---|
| `level3AllPresentSeed(unitId, storyId)` | Level 1/2 全充足 + Level 3 resolve済み全存在 | IT-PD-104, 107 |
| `level3LogicalMissingSeed(unitId, storyId)` | Level 1/2 全充足 + Level 3 logical_design.md 不在 | IT-PD-105, 108 |
| `level3ScenarioMissingSeed(unitId, storyId)` | Level 1/2 全充足 + Level 3 scenario_test_design.md 不在 | IT-PD-106 |
| `noScopeSeed()` | Level 1/2 全充足 + scope なし（Level 3 required=false スキップ） | IT-PD-103, 109 |

### 8. ISSUE-001 UseCase統合テスト詳細ロジック

#### 8.1 `check-phase-gate-usecase.test.ts`（IT-PD-103〜109）

既存の `CheckPhaseGateUseCase.execute` target 内に `describe("ISSUE-001: scope パラメータによるLevel 3コンテキスト依存チェック")` を追加する。

##### ベース疑似コード

```ts
target("CheckPhaseGateUseCase.execute", () => {
  // ... 既存ケース (IT-PD-001〜010) ...

  describe("ISSUE-001: scope パラメータによるLevel 3コンテキスト依存チェック", () => {
    context("scope 未提供でLevel 3チェックを実行する場合", () => {
      it("scope未提供でLevel 3チェックを実行した場合、Level 3のrequired=false成果物はスキップされpassed=trueを返す", async () => {
        // Arrange
        const scope = undefined;
        const targetLevel = PhaseLevel.from(3);
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            // Level 1/2 の成果物のみ true にする
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
          },
          planEvidences: buildSatisfiedLevel1And2PlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });

    context("scope.storyId 提供時に全Level 3成果物が存在する場合", () => {
      it("scope.storyId提供時にLevel 3チェックを実行し全成果物が存在する場合、passed=trueを返す", async () => {
        // Arrange
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const targetLevel = PhaseLevel.from(3);
        const level3Statuses = buildLevel3ResolvedArtifactStatuses("agent-integration", "H11-05");
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            ...level3Statuses,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });

    context("scope.storyId 提供時に logical_design.md が不在の場合", () => {
      it("scope.storyId提供時にLevel 3チェックを実行しlogical_design.mdが不在の場合、passed=falseでblockersにlogical_design.md不足が含まれる", async () => {
        // Arrange
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const targetLevel = PhaseLevel.from(3);
        const level3Statuses = buildLevel3ResolvedArtifactStatuses(
          "agent-integration", "H11-05",
          { "logical_design.md": false },
        );
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            ...level3Statuses,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.blockers.length).toBeGreaterThan(0);
        expect(actual.blockers.some(b => b.includes("logical_design.md"))).toBe(true);
      });
    });

    context("scope.storyId 提供時に scenario_test_design.md が不在の場合", () => {
      it("scope.storyId提供時にLevel 3チェックを実行しscenario_test_design.mdが不在の場合、passed=falseを返す", async () => {
        // Arrange
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const targetLevel = PhaseLevel.from(3);
        const level3Statuses = buildLevel3ResolvedArtifactStatuses(
          "agent-integration", "H11-05",
          { "scenario_test_design.md": false },
        );
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            ...level3Statuses,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.blockers.some(b => b.includes("scenario_test_design.md"))).toBe(true);
      });
    });

    context("scope.storyId に issue ID を指定した場合", () => {
      it("scope.storyIdにissue ID（ISSUE-001）を指定した場合、US IDと同一のチェック動作をする", async () => {
        // Arrange
        const scope = createScopeWithStory("ISSUE-001", "phase-dependency-model");
        const targetLevel = PhaseLevel.from(3);
        const level3Statuses = buildLevel3ResolvedArtifactStatuses("phase-dependency-model", "ISSUE-001");
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            ...level3Statuses,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });

    context("scope.storyId に issue ID を指定し Level 3 成果物が不在の場合", () => {
      it("scope.storyIdにissue ID（ISSUE-001）を指定しLevel 3成果物が不在の場合、passed=falseを返す", async () => {
        // Arrange
        const scope = createScopeWithStory("ISSUE-001", "phase-dependency-model");
        const targetLevel = PhaseLevel.from(3);
        const level3Statuses = buildLevel3ResolvedArtifactStatuses(
          "phase-dependency-model", "ISSUE-001",
          { "logical_design.md": false },
        );
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            ...level3Statuses,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.blockers.length).toBeGreaterThan(0);
      });
    });

    context("scope.unitId のみ提供（storyId 未提供）でLevel 3チェックを実行する場合", () => {
      it("scope.unitIdのみ提供でLevel 3チェックを実行した場合、Level 3のrequired=false成果物はスキップされる", async () => {
        // Arrange
        const scope = createScopeWithoutStory("agent-integration");
        const targetLevel = PhaseLevel.from(3);
        const { sut } = createCheckPhaseGateHarness({
          config: { customizationPolicy: defaultPolicySeed() },
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
          },
          planEvidences: buildSatisfiedLevel1And2PlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await sut.execute({ scope, targetLevel });

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.blockers).toEqual([]);
      });
    });
  });
});
```

##### ケース別詳細

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-103 | `context("scope 未提供でLevel 3チェックを実行する場合")` `it("scope未提供でLevel 3チェックを実行した場合、Level 3のrequired=false成果物はスキップされpassed=trueを返す")` | `scope=undefined`、Level 1/2 の artifactStatuses 全 true、Level 3 成果物は artifactStatuses に含めない（required=false でスキップ） | `sut.execute({ scope: undefined, targetLevel: PhaseLevel.from(3) })` | `actual.passed === true` `actual.blockers === []` |
| IT-PD-104 | `context("scope.storyId 提供時に全Level 3成果物が存在する場合")` `it("scope.storyId提供時にLevel 3チェックを実行し全成果物が存在する場合、passed=trueを返す")` | `scope={ unitId:'agent-integration', storyId:'H11-05' }`、Level 1/2 全充足 + Level 3 resolve 済み全パスを `true` で stub | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === true` `actual.blockers === []` |
| IT-PD-105 | `context("scope.storyId 提供時に logical_design.md が不在の場合")` `it("scope.storyId提供時にLevel 3チェックを実行しlogical_design.mdが不在の場合、passed=falseでblockersにlogical_design.md不足が含まれる")` | IT-PD-104 と同じ scope だが `logical_design.md` の resolve 済みパスを `false` にする | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === false` `actual.blockers` に `logical_design.md` の欠損理由を含む |
| IT-PD-106 | `context("scope.storyId 提供時に scenario_test_design.md が不在の場合")` `it("scope.storyId提供時にLevel 3チェックを実行しscenario_test_design.mdが不在の場合、passed=falseを返す")` | IT-PD-104 と同じ scope だが `scenario_test_design.md` の resolve 済みパスを `false` にする | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === false` `actual.blockers` に `scenario_test_design.md` の欠損理由を含む |
| IT-PD-107 | `context("scope.storyId に issue ID を指定した場合")` `it("scope.storyIdにissue ID（ISSUE-001）を指定した場合、US IDと同一のチェック動作をする")` | `scope={ unitId:'phase-dependency-model', storyId:'ISSUE-001' }`、Level 3 resolve 済みパスが `docs/inception/phase-dependency-model/issues/ISSUE-001/...` で全 true | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === true` `actual.blockers === []` |
| IT-PD-108 | `context("scope.storyId に issue ID を指定し Level 3 成果物が不在の場合")` `it("scope.storyIdにissue ID（ISSUE-001）を指定しLevel 3成果物が不在の場合、passed=falseを返す")` | IT-PD-107 と同じ scope だが `logical_design.md` の resolve 済みパスを `false` にする | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === false` `actual.blockers.length > 0` |
| IT-PD-109 | `context("scope.unitId のみ提供（storyId 未提供）でLevel 3チェックを実行する場合")` `it("scope.unitIdのみ提供でLevel 3チェックを実行した場合、Level 3のrequired=false成果物はスキップされる")` | `scope={ unitId:'agent-integration' }` storyId 未指定、Level 1/2 全充足、Level 3 は required=false でスキップ | `sut.execute({ scope, targetLevel: PhaseLevel.from(3) })` | `actual.passed === true` `actual.blockers === []` |

#### 8.2 `check-phase-gate-usecase.test.ts` — EvidenceBundleAssembler（IT-PD-110〜113）

既存の `EvidenceBundleAssembler.assembleForLevel` target 内に `describe("ISSUE-001: Level 3 成果物の scope 解決")` を追加する。

##### ベース疑似コード

```ts
target("EvidenceBundleAssembler.assembleForLevel", () => {
  // ... 既存ケース (IT-PD-033〜037) ...

  describe("ISSUE-001: Level 3 成果物の scope 解決", () => {
    context("storyId 提供時に Level 3 成果物の解決済みパスを収集する場合", () => {
      it("storyId提供時にassembleForLevelがLevel 3成果物の解決済みパスをartifactStatusesに含める", async () => {
        // Arrange
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const structure = createPhaseStructure();
        const resolvedLogicalDesignPath = resolveLevel3ArtifactPath(
          "agent-integration", "H11-05", "logical_design.md",
        );
        const { evidenceBundleAssembler, artifactExistenceChecker } = createCheckPhaseGateHarness({
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            [resolvedLogicalDesignPath]: true,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await evidenceBundleAssembler.assembleForLevel({
          structure,
          scope,
          targetLevel: PhaseLevel.from(3),
        });

        // Assert
        expect(actual.artifactStatuses.has(resolvedLogicalDesignPath)).toBe(true);
      });
    });

    context("storyId 未提供時に Level 3 required=false 成果物をスキップする場合", () => {
      it("storyId未提供時にassembleForLevelがLevel 3のrequired=false成果物をartifactStatusesに含めない", async () => {
        // Arrange
        const scope = createScopeWithoutStory("agent-integration");
        const structure = createPhaseStructure();
        const { evidenceBundleAssembler } = createCheckPhaseGateHarness({
          artifactStatuses: buildSatisfiedLevel1And2ArtifactStatuses(),
          planEvidences: buildSatisfiedLevel1And2PlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await evidenceBundleAssembler.assembleForLevel({
          structure,
          scope,
          targetLevel: PhaseLevel.from(3),
        });

        // Assert
        const level3Keys = [...actual.artifactStatuses.keys()].filter(k => k.includes("{storyId}"));
        expect(level3Keys).toEqual([]);
      });
    });

    context("issue ID 提供時に issue パス構造で成果物パスを解決する場合", () => {
      it("issue ID提供時にassembleForLevelがissueパス構造で成果物パスを解決する", async () => {
        // Arrange
        const scope = createScopeWithStory("ISSUE-001", "phase-dependency-model");
        const structure = createPhaseStructure();
        const resolvedIssuePath = resolveLevel3ArtifactPath(
          "phase-dependency-model", "ISSUE-001", "logical_design.md",
        );
        const { evidenceBundleAssembler } = createCheckPhaseGateHarness({
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            [resolvedIssuePath]: true,
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await evidenceBundleAssembler.assembleForLevel({
          structure,
          scope,
          targetLevel: PhaseLevel.from(3),
        });

        // Assert
        expect(actual.artifactStatuses.has(resolvedIssuePath)).toBe(true);
      });
    });

    context("storyId 提供時に ArtifactExistenceCheckerPort が解決済みパスで呼ばれる場合", () => {
      it("storyId提供時にArtifactExistenceCheckerPortのcheckAllが解決済みパスで呼び出される", async () => {
        // Arrange
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const structure = createPhaseStructure();
        const { evidenceBundleAssembler, artifactExistenceChecker } = createCheckPhaseGateHarness({
          artifactStatuses: {
            ...buildSatisfiedLevel1And2ArtifactStatuses(),
            ...buildLevel3ResolvedArtifactStatuses("agent-integration", "H11-05"),
          },
          planEvidences: buildSatisfiedAllLevelPlanEvidences("embedded-qa"),
        });

        // Act
        const actual = await evidenceBundleAssembler.assembleForLevel({
          structure,
          scope,
          targetLevel: PhaseLevel.from(3),
        });

        // Assert
        expect(artifactExistenceChecker.checkAll).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              resolve: expect.any(Function),
            }),
          ]),
          expect.objectContaining({ storyId: 'H11-05' }),
        );
        // 出力の artifactStatuses から間接検証: 全キーがプレースホルダーを含まない
        const allKeys = [...actual.artifactStatuses.keys()];
        expect(allKeys.every((k: string) => !k.includes('{storyId}'))).toBe(true);
      });
    });
  });
});
```

##### ケース別詳細

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-110 | `context("storyId 提供時に Level 3 成果物の解決済みパスを収集する場合")` `it("storyId提供時にassembleForLevelがLevel 3成果物の解決済みパスをartifactStatusesに含める")` | `scope={ unitId:'agent-integration', storyId:'H11-05' }`、stub に `docs/inception/agent-integration/H11-05/logical_design.md` を true で返す | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `actual.artifactStatuses.has("docs/inception/agent-integration/H11-05/logical_design.md") === true` |
| IT-PD-111 | `context("storyId 未提供時に Level 3 required=false 成果物をスキップする場合")` `it("storyId未提供時にassembleForLevelがLevel 3のrequired=false成果物をartifactStatusesに含めない")` | `scope={ unitId:'agent-integration' }` storyId 未指定 | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `actual.artifactStatuses` のキーに `{storyId}` プレースホルダーを含むパスがないこと |
| IT-PD-112 | `context("issue ID 提供時に issue パス構造で成果物パスを解決する場合")` `it("issue ID提供時にassembleForLevelがissueパス構造で成果物パスを解決する")` | `scope={ unitId:'phase-dependency-model', storyId:'ISSUE-001' }`、stub に `docs/inception/phase-dependency-model/issues/ISSUE-001/logical_design.md` を true で返す | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `actual.artifactStatuses.has("docs/inception/phase-dependency-model/issues/ISSUE-001/logical_design.md") === true` |
| IT-PD-113 | `context("storyId 提供時に ArtifactExistenceCheckerPort が解決済みパスで呼ばれる場合")` `it("storyId提供時にArtifactExistenceCheckerPortのcheckAllが解決済みパスで呼び出される")` | `scope={ unitId:'agent-integration', storyId:'H11-05' }`、Level 3 全成果物を resolve 済みパスで stub | `assembleForLevel({ structure, scope, targetLevel: 3 })` | `artifactExistenceChecker.checkAll` が scope 付きで呼び出され、出力の `artifactStatuses` の全キーがプレースホルダーを含まないこと（出力結果からの間接検証） |

#### 8.3 Presentation: check-phase-gate コマンド（IT-PD-114〜118）

##### 8.3.1 `check-ready-command-handler.test.ts` / `check-phase-command-handler.test.ts`

既存の `CheckReadyCommandHandler.handle` / `CheckPhaseCommandHandler.handle` target 内に `describe("ISSUE-001: --story フラグの issue ID / US ID 受付")` を追加する。

##### ベース疑似コード

```ts
target("CheckReadyCommandHandler.handle", () => {
  // ... 既存ケース (IT-PD-073〜077) ...

  describe("ISSUE-001: --story フラグの issue ID / US ID 受付", () => {
    context("--story に issue ID を指定した場合", () => {
      it("--storyフラグにissue ID（ISSUE-001）を指定した場合、CheckPhaseGateUseCaseにscope.storyId='ISSUE-001'が渡される", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub([{ passed: true, blockers: [], warnings: [], auditRecorded: false, targetLevel: 3 }]);
        const presenter = new PhaseGateResultPresenter();
        const sut = new CheckReadyCommandHandler({ usecase, presenter });
        const argv = ["--unit", "agent-integration", "--story", "ISSUE-001"];

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(usecase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: expect.objectContaining({ storyId: "ISSUE-001" }),
          }),
        );
      });
    });

    context("--story に US ID を指定した場合", () => {
      it("--storyフラグにUS ID（H11-05）を指定した場合、CheckPhaseGateUseCaseにscope.storyId='H11-05'が渡される", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub([{ passed: true, blockers: [], warnings: [], auditRecorded: false, targetLevel: 3 }]);
        const presenter = new PhaseGateResultPresenter();
        const sut = new CheckReadyCommandHandler({ usecase, presenter });
        const argv = ["--unit", "agent-integration", "--story", "H11-05"];

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(usecase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: expect.objectContaining({ storyId: "H11-05" }),
          }),
        );
      });
    });

    context("--story フラグ未指定の場合", () => {
      it("--storyフラグ未指定の場合、CheckPhaseGateUseCaseにscope.storyIdが渡されない", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub([{ passed: true, blockers: [], warnings: [], auditRecorded: false, targetLevel: 3 }]);
        const presenter = new PhaseGateResultPresenter();
        const sut = new CheckReadyCommandHandler({ usecase, presenter });
        const argv = ["--unit", "agent-integration"];

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(usecase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: expect.objectContaining({ storyId: undefined }),
          }),
        );
      });
    });

    context("--story 指定で gate 通過の場合", () => {
      it("--story指定でgate通過時にexit code 0で終了する", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub([{ passed: true, blockers: [], warnings: [], auditRecorded: false, targetLevel: 3 }]);
        const presenter = new PhaseGateResultPresenter();
        const sut = new CheckReadyCommandHandler({ usecase, presenter });
        const argv = ["--unit", "agent-integration", "--story", "ISSUE-001"];

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context("--story 指定で gate 失敗の場合", () => {
      it("--story指定でgate失敗時にexit code 1で終了しblockersが表示される", async () => {
        // Arrange
        const usecase = createCheckPhaseGateUseCaseStub([{
          passed: false,
          blockers: ["missing logical_design.md"],
          warnings: [],
          auditRecorded: false,
          targetLevel: 3,
        }]);
        const presenter = new PhaseGateResultPresenter();
        const sut = new CheckReadyCommandHandler({ usecase, presenter });
        const argv = ["--unit", "agent-integration", "--story", "ISSUE-001"];

        // Act
        const actual = await sut.handle(argv);

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout ?? actual.stderr).toContain("logical_design.md");
      });
    });
  });
});
```

##### ケース別詳細

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-114 | `context("--story に issue ID を指定した場合")` `it("--storyフラグにissue ID（ISSUE-001）を指定した場合、CheckPhaseGateUseCaseにscope.storyId='ISSUE-001'が渡される")` | usecase stub が `passed=true` DTO を返す。argv は `["--unit", "agent-integration", "--story", "ISSUE-001"]` | `handle(argv)` | `usecase.execute` 引数の `scope.storyId === "ISSUE-001"` |
| IT-PD-115 | `context("--story に US ID を指定した場合")` `it("--storyフラグにUS ID（H11-05）を指定した場合、CheckPhaseGateUseCaseにscope.storyId='H11-05'が渡される")` | usecase stub が `passed=true` DTO を返す。argv は `["--unit", "agent-integration", "--story", "H11-05"]` | `handle(argv)` | `usecase.execute` 引数の `scope.storyId === "H11-05"` |
| IT-PD-116 | `context("--story フラグ未指定の場合")` `it("--storyフラグ未指定の場合、CheckPhaseGateUseCaseにscope.storyIdが渡されない")` | usecase stub が `passed=true` DTO を返す。argv は `["--unit", "agent-integration"]` | `handle(argv)` | `usecase.execute` 引数の `scope.storyId === undefined` |
| IT-PD-117 | `context("--story 指定で gate 通過の場合")` `it("--story指定でgate通過時にexit code 0で終了する")` | usecase stub が `passed=true` DTO を返す。argv に `--story ISSUE-001` を含む | `handle(argv)` | `actual.exitCode === 0` |
| IT-PD-118 | `context("--story 指定で gate 失敗の場合")` `it("--story指定でgate失敗時にexit code 1で終了しblockersが表示される")` | usecase stub が `passed=false` + blockers 付き DTO を返す。argv に `--story ISSUE-001` を含む | `handle(argv)` | `actual.exitCode === 1` `actual.stdout` または `actual.stderr` に blocker 文言を含む |

#### 8.4 Infrastructure: FileSystemArtifactExistenceChecker（IT-PD-119〜122）

既存の `FileSystemArtifactExistenceChecker.checkAll` target 内に `describe("ISSUE-001: resolve 済みパスの存在チェック")` を追加する。

##### ベース疑似コード

```ts
target("FileSystemArtifactExistenceChecker.checkAll", () => {
  // ... 既存ケース (IT-PD-046〜050) ...

  describe("ISSUE-001: resolve 済みパスの存在チェック", () => {
    context("resolve 済みパスに対してファイルが存在する場合", () => {
      it("resolve済みパス（プレースホルダーなし）に対してファイルが存在する場合、trueを返す", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new FileSystemArtifactExistenceChecker({ projectRoot: tempRoot });
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const resolvedPath = "docs/inception/agent-integration/H11-05/logical_design.md";
        writeTempFile(tempRoot, resolvedPath, "# Logical Design");
        const artifacts = [createArtifact({ path: resolvedPath, required: true })];

        // Act
        const actual = await sut.checkAll(artifacts, scope);

        // Assert
        expect(actual.get(resolvedPath)).toBe(true);
      });
    });

    context("resolve 済みパスに対してファイルが存在しない場合", () => {
      it("resolve済みパス（プレースホルダーなし）に対してファイルが存在しない場合、falseを返す", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new FileSystemArtifactExistenceChecker({ projectRoot: tempRoot });
        const scope = createScopeWithStory("H11-05", "agent-integration");
        const resolvedPath = "docs/inception/agent-integration/H11-05/logical_design.md";
        // ファイルを作成しない
        const artifacts = [createArtifact({ path: resolvedPath, required: true })];

        // Act
        const actual = await sut.checkAll(artifacts, scope);

        // Assert
        expect(actual.get(resolvedPath)).toBe(false);
      });
    });

    context("issue パス構造の resolve 済みパスに対してファイルが存在する場合", () => {
      it("issueパス構造（issues/ISSUE-001/）のresolve済みパスに対してファイルが存在する場合、trueを返す", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new FileSystemArtifactExistenceChecker({ projectRoot: tempRoot });
        const scope = createScopeWithStory("ISSUE-001", "phase-dependency-model");
        const resolvedPath = "docs/inception/phase-dependency-model/issues/ISSUE-001/logical_design.md";
        writeTempFile(tempRoot, resolvedPath, "# ISSUE-001 Logical Design");
        const artifacts = [createArtifact({ path: resolvedPath, required: true })];

        // Act
        const actual = await sut.checkAll(artifacts, scope);

        // Assert
        expect(actual.get(resolvedPath)).toBe(true);
      });
    });

    context("resolve 済みとプレースホルダー付きが混在する場合", () => {
      it("resolve済みパスとプレースホルダー付きパスが混在するArtifactリストに対して正しく判定される", async () => {
        // Arrange
        const tempRoot = createTempDir();
        const sut = new FileSystemArtifactExistenceChecker({ projectRoot: tempRoot });
        const scope = createScopeWithStory("H11-05", "agent-integration");

        const resolvedPath = "docs/inception/agent-integration/H11-05/logical_design.md";
        writeTempFile(tempRoot, resolvedPath, "# Logical Design");

        const unresolvedPath = "docs/inception/{unit}/{storyId}/scenario_test_design.md";

        const artifacts = [
          createArtifact({ path: resolvedPath, required: true }),
          createArtifact({ path: unresolvedPath, required: false }),
        ];

        // Act
        const actual = await sut.checkAll(artifacts, scope);

        // Assert
        expect(actual.get(resolvedPath)).toBe(true);
        const unresolvedResolved = unresolvedPath
          .replace("{unit}", "agent-integration")
          .replace("{storyId}", "H11-05");
        expect(actual.get(unresolvedResolved)).toBe(false);
      });
    });
  });
});
```

##### ケース別詳細

| ケースID | `context()` と `it()` | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PD-119 | `context("resolve 済みパスに対してファイルが存在する場合")` `it("resolve済みパス（プレースホルダーなし）に対してファイルが存在する場合、trueを返す")` | 一時ディレクトリに `docs/inception/agent-integration/H11-05/logical_design.md` を作成する | `checkAll(artifacts, scope)` | `actual.get(resolvedPath) === true` |
| IT-PD-120 | `context("resolve 済みパスに対してファイルが存在しない場合")` `it("resolve済みパス（プレースホルダーなし）に対してファイルが存在しない場合、falseを返す")` | resolve 済みパスにファイルを作成しない | `checkAll(artifacts, scope)` | `actual.get(resolvedPath) === false` |
| IT-PD-121 | `context("issue パス構造の resolve 済みパスに対してファイルが存在する場合")` `it("issueパス構造（issues/ISSUE-001/）のresolve済みパスに対してファイルが存在する場合、trueを返す")` | 一時ディレクトリに `docs/inception/phase-dependency-model/issues/ISSUE-001/logical_design.md` を作成する | `checkAll(artifacts, scope)` | `actual.get(resolvedPath) === true` |
| IT-PD-122 | `context("resolve 済みとプレースホルダー付きが混在する場合")` `it("resolve済みパスとプレースホルダー付きパスが混在するArtifactリストに対して正しく判定される")` | resolved（required=true、ファイル存在）と unresolved（required=false、プレースホルダー付き、resolve後のファイル不在）を混在させる | `checkAll(artifacts, scope)` | resolved パスは `true`、unresolved の resolve 後パスは `false` |

### 9. ISSUE-001 テストファイル構成サマリー

| テストファイル | target | 対応ケースID |
|---|---|---|
| `check-phase-gate-usecase.test.ts` | `CheckPhaseGateUseCase.execute` | IT-PD-103〜109 |
| `check-phase-gate-usecase.test.ts` | `EvidenceBundleAssembler.assembleForLevel` | IT-PD-110〜113 |
| `check-ready-command-handler.test.ts` | `CheckReadyCommandHandler.handle` | IT-PD-114〜118 |
| `file-system-artifact-existence-checker.test.ts` | `FileSystemArtifactExistenceChecker.checkAll` | IT-PD-119〜122 |
