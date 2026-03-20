import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { ImportEdge } from '../../../biome-ast-engine/domain/value-objects/import-edge.js';
import { ImportGraph } from '../../../biome-ast-engine/domain/value-objects/import-graph.js';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import { RuleDefinition } from '../../../biome-ast-engine/domain/value-objects/rule-definition.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { RuleType } from '../../../biome-ast-engine/domain/value-objects/rule-type.js';
import { RequiredInput } from '../../../biome-ast-engine/domain/value-objects/required-input.js';
import { SourceModuleSnapshot } from '../../../biome-ast-engine/domain/value-objects/source-module-snapshot.js';
import { LintRunner } from '../../../biome-ast-engine/domain/services/lint-runner.js';
import { RuleDefinitionRegistry, UnknownRuleNameError } from '../../../biome-ast-engine/domain/services/rule-definition-registry.js';

const createFilePath = (value: string): FilePath => FilePath.fromWorkspaceRelative(value);
const createLayerName = (value: 'domain' | 'application' | 'infrastructure' | 'presentation') =>
  LayerName.fromString(value);
const createRuleName = (value: string): RuleName => RuleName.fromString(value);
const createRuleType = (value: 'BiomeNative' | 'ExternalAnalyzer' = 'ExternalAnalyzer'): RuleType =>
  RuleType.fromString(value);
const createRequiredInput = (
  value: 'source-module-snapshots' | 'import-graph' | 'biome-diagnostics' | 'workspace-inventory'
): RequiredInput => RequiredInput.fromString(value);

const createImportEdge = (overrides?: {
  readonly from?: FilePath;
  readonly to?: FilePath;
  readonly importKind?: 'value' | 'type' | 'dynamic';
}): ImportEdge =>
  ImportEdge.create({
    from: overrides?.from ?? createFilePath('a.ts'),
    to: overrides?.to ?? createFilePath('b.ts'),
    importKind: overrides?.importKind ?? 'value',
  });

const createSourceModuleSnapshot = (overrides?: {
  readonly filePath?: FilePath;
  readonly declaredUnit?: string | null;
  readonly declaredLayer?: LayerName | null;
  readonly imports?: readonly ImportEdge[];
  readonly anyTypeCount?: number;
  readonly typedNodeCount?: number;
  readonly commentLineCount?: number;
  readonly logicalLineCount?: number;
  readonly repeatedCommentBlocks?: number;
  readonly duplicationFingerprints?: readonly string[];
  readonly isEntrypointCandidate?: boolean;
}): SourceModuleSnapshot =>
  SourceModuleSnapshot.create({
    filePath: overrides?.filePath ?? createFilePath('biome-ast-engine/domain/example.ts'),
    declaredUnit: overrides && 'declaredUnit' in overrides ? overrides.declaredUnit ?? null : 'biome-ast-engine',
    declaredLayer:
      overrides && 'declaredLayer' in overrides
        ? overrides.declaredLayer ?? null
        : createLayerName('domain'),
    imports: overrides?.imports ?? Object.freeze([]),
    anyTypeCount: overrides?.anyTypeCount ?? 0,
    typedNodeCount: overrides?.typedNodeCount ?? 10,
    commentLineCount: overrides?.commentLineCount ?? 1,
    logicalLineCount: overrides?.logicalLineCount ?? 10,
    repeatedCommentBlocks: overrides?.repeatedCommentBlocks ?? 0,
    duplicationFingerprints: overrides?.duplicationFingerprints ?? Object.freeze([]),
    exportedSymbols: Object.freeze([]),
    isEntrypointCandidate: overrides?.isEntrypointCandidate ?? false,
  });

const createImportGraph = (overrides?: {
  readonly nodes?: readonly FilePath[];
  readonly edges?: readonly ImportEdge[];
  readonly rootNodes?: readonly FilePath[];
}): ImportGraph =>
  ImportGraph.create({
    nodes:
      overrides?.nodes ??
      Object.freeze([createFilePath('biome-ast-engine/domain/example.ts')]),
    edges: overrides?.edges ?? Object.freeze([]),
    rootNodes: overrides?.rootNodes ?? Object.freeze([]),
  });

const createRuleDefinition = (overrides?: {
  readonly name?: RuleName;
  readonly enabled?: boolean;
  readonly severity?: 'error' | 'warning';
  readonly requiredInputs?: readonly RequiredInput[];
  readonly config?: Readonly<Record<string, unknown>>;
  readonly errorCode?: string;
}): RuleDefinition =>
  RuleDefinition.create({
    name: overrides?.name ?? createRuleName('require-unit-comment'),
    type: createRuleType(),
    enabled: overrides?.enabled ?? true,
    severity: overrides?.severity ?? 'error',
    supportsAutofix: false,
    requiredInputs:
      overrides?.requiredInputs ?? Object.freeze([createRequiredInput('source-module-snapshots')]),
    config: overrides?.config ?? Object.freeze({}),
    errorCode: overrides?.errorCode ?? 'L1-001',
    description: 'description',
    suggestion: 'suggestion',
  });

const createLintRunner = (): LintRunner => new LintRunner(new RuleDefinitionRegistry());

const findViolationCount = (report: ReturnType<LintRunner['run']>, ruleName: string): number =>
  report.violations.filter((violation) => violation.ruleName.toString() === ruleName).length;

target('LintRunner.run', () => {
  describe('require-unit-commentの違反判定を実行する', () => {
    context('declaredUnitがnullの場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([createRuleDefinition()]);
        const snapshots = Object.freeze([createSourceModuleSnapshot({ declaredUnit: null })]);
        const graph = createImportGraph({
          nodes: Object.freeze([snapshots[0].filePath]),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'require-unit-comment')).toBeGreaterThan(0);
      });
    });

    context('declaredUnitが設定されている場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([createRuleDefinition()]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredUnit: 'biome-ast-engine' }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze([snapshots[0].filePath]),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'require-unit-comment')).toBe(0);
      });
    });
  });

  describe('require-layer-commentの違反判定を実行する', () => {
    context('declaredLayerがnullの場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('require-layer-comment'),
            errorCode: 'L1-002',
          }),
        ]);
        const snapshots = Object.freeze([createSourceModuleSnapshot({ declaredLayer: null })]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'require-layer-comment')).toBeGreaterThan(0);
      });
    });

    context('declaredLayerが設定されている場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('require-layer-comment'),
            errorCode: 'L1-002',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredLayer: createLayerName('domain') }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'require-layer-comment')).toBe(0);
      });
    });
  });

  describe('no-layer-violationの違反判定を実行する', () => {
    context('レイヤー違反importがある場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-layer-violation'),
            requiredInputs: Object.freeze([
              createRequiredInput('source-module-snapshots'),
              createRequiredInput('import-graph'),
            ]),
            config: Object.freeze({ ignorePatterns: Object.freeze(['**/shared-kernel/**']) }),
            errorCode: 'L1-003',
          }),
        ]);
        const domainFile = createFilePath('biome-ast-engine/domain/a.ts');
        const applicationFile = createFilePath('biome-ast-engine/application/b.ts');
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ filePath: domainFile, declaredLayer: createLayerName('domain') }),
          createSourceModuleSnapshot({
            filePath: applicationFile,
            declaredLayer: createLayerName('application'),
          }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze([domainFile, applicationFile]),
          edges: Object.freeze([createImportEdge({ from: domainFile, to: applicationFile })]),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-layer-violation')).toBeGreaterThan(0);
      });
    });

    context('正規の依存方向のみの場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-layer-violation'),
            requiredInputs: Object.freeze([
              createRequiredInput('source-module-snapshots'),
              createRequiredInput('import-graph'),
            ]),
            config: Object.freeze({ ignorePatterns: Object.freeze(['**/shared-kernel/**']) }),
            errorCode: 'L1-003',
          }),
        ]);
        const applicationFile = createFilePath('biome-ast-engine/application/a.ts');
        const domainFile = createFilePath('biome-ast-engine/domain/b.ts');
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: applicationFile,
            declaredLayer: createLayerName('application'),
          }),
          createSourceModuleSnapshot({ filePath: domainFile, declaredLayer: createLayerName('domain') }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze([applicationFile, domainFile]),
          edges: Object.freeze([createImportEdge({ from: applicationFile, to: domainFile })]),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-layer-violation')).toBe(0);
      });
    });
  });

  describe('enforce-folder-structureの違反判定を実行する', () => {
    context('declaredLayerとディレクトリが不一致の場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('enforce-folder-structure'),
            config: Object.freeze({ rootDir: 'scripts/harness', allowTestFixtures: true }),
            errorCode: 'L1-004',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('biome-ast-engine/application/usecase.ts'),
            declaredLayer: createLayerName('domain'),
          }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'enforce-folder-structure')).toBeGreaterThan(0);
      });
    });

    context('declaredLayerとディレクトリが一致する場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('enforce-folder-structure'),
            config: Object.freeze({ rootDir: 'scripts/harness', allowTestFixtures: true }),
            errorCode: 'L1-004',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('biome-ast-engine/domain/rule.ts'),
            declaredLayer: createLayerName('domain'),
          }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'enforce-folder-structure')).toBe(0);
      });
    });
  });

  describe('no-any-abuseの違反判定を実行する', () => {
    context('anyTypeCountが閾値超過の場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-any-abuse'),
            config: Object.freeze({ maxAnyCount: 1, maxAnyRatio: 0.4 }),
            errorCode: 'L1-005',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ anyTypeCount: 5, typedNodeCount: 10 }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-any-abuse')).toBeGreaterThan(0);
      });
    });

    context('anyTypeCountが閾値内の場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-any-abuse'),
            config: Object.freeze({ maxAnyCount: 5, maxAnyRatio: 0.5 }),
            errorCode: 'L1-005',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ anyTypeCount: 2, typedNodeCount: 10 }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-any-abuse')).toBe(0);
      });
    });
  });

  describe('no-code-duplicationの違反判定を実行する', () => {
    context('同一fingerprintがminOccurrences以上の場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-code-duplication'),
            config: Object.freeze({ minOccurrences: 2, minFingerprintSpan: 20 }),
            errorCode: 'L1-006',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('biome-ast-engine/domain/a.ts'),
            duplicationFingerprints: Object.freeze(['same']),
          }),
          createSourceModuleSnapshot({
            filePath: createFilePath('biome-ast-engine/domain/b.ts'),
            duplicationFingerprints: Object.freeze(['same']),
          }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze(snapshots.map((snapshot) => snapshot.filePath)),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-code-duplication')).toBeGreaterThan(0);
      });
    });

    context('重複がない場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-code-duplication'),
            config: Object.freeze({ minOccurrences: 2, minFingerprintSpan: 20 }),
            errorCode: 'L1-006',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            filePath: createFilePath('biome-ast-engine/domain/a.ts'),
            duplicationFingerprints: Object.freeze(['a']),
          }),
          createSourceModuleSnapshot({
            filePath: createFilePath('biome-ast-engine/domain/b.ts'),
            duplicationFingerprints: Object.freeze(['b']),
          }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze(snapshots.map((snapshot) => snapshot.filePath)),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-code-duplication')).toBe(0);
      });
    });
  });

  describe('no-ghost-fileの違反判定を実行する', () => {
    context('importされていないファイルがある場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-ghost-file'),
            requiredInputs: Object.freeze([createRequiredInput('import-graph')]),
            config: Object.freeze({
              entryPointPatterns: Object.freeze(['**/index.ts', '**/cli/**/*.ts']),
              ignorePatterns: Object.freeze(['**/*.test.ts', '**/*.spec.ts']),
            }),
            errorCode: 'L1-007',
          }),
        ]);
        const entryFile = createFilePath('entry.ts');
        const orphanFile = createFilePath('orphan.ts');
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ filePath: entryFile }),
          createSourceModuleSnapshot({ filePath: orphanFile }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze([entryFile, orphanFile]),
          rootNodes: Object.freeze([entryFile]),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-ghost-file')).toBeGreaterThan(0);
      });
    });

    context('全ファイルが参照されている場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-ghost-file'),
            requiredInputs: Object.freeze([createRequiredInput('import-graph')]),
            config: Object.freeze({
              entryPointPatterns: Object.freeze(['**/index.ts', '**/cli/**/*.ts']),
              ignorePatterns: Object.freeze(['**/*.test.ts', '**/*.spec.ts']),
            }),
            errorCode: 'L1-007',
          }),
        ]);
        const entryFile = createFilePath('entry.ts');
        const childFile = createFilePath('child.ts');
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ filePath: entryFile }),
          createSourceModuleSnapshot({ filePath: childFile }),
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze([entryFile, childFile]),
          edges: Object.freeze([createImportEdge({ from: entryFile, to: childFile })]),
          rootNodes: Object.freeze([entryFile]),
        });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-ghost-file')).toBe(0);
      });
    });
  });

  describe('no-comment-floodの違反判定を実行する', () => {
    context('commentDensityが閾値超過の場合', () => {
      it('違反が報告される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-comment-flood'),
            config: Object.freeze({ maxCommentRatio: 0.5, maxRepeatedBlocks: 1 }),
            errorCode: 'L1-008',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            commentLineCount: 8,
            logicalLineCount: 10,
            repeatedCommentBlocks: 0,
          }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-comment-flood')).toBeGreaterThan(0);
      });
    });

    context('commentDensityが閾値内の場合', () => {
      it('違反が報告されない', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('no-comment-flood'),
            config: Object.freeze({ maxCommentRatio: 0.5, maxRepeatedBlocks: 1 }),
            errorCode: 'L1-008',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({
            commentLineCount: 2,
            logicalLineCount: 10,
            repeatedCommentBlocks: 0,
          }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(findViolationCount(actual, 'no-comment-flood')).toBe(0);
      });
    });
  });

  describe('LintReportを構築する', () => {
    context('違反ゼロのルールがある場合', () => {
      it('passedRulesに含まれる', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition(),
          createRuleDefinition({
            name: createRuleName('require-layer-comment'),
            errorCode: 'L1-002',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredUnit: null, declaredLayer: createLayerName('domain') }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(actual.passedRules.map((rule) => rule.toString())).toContain('require-layer-comment');
      });
    });

    context('—', () => {
      it('passedRulesとskippedRulesが排他的である', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          createRuleDefinition({
            name: createRuleName('require-layer-comment'),
            errorCode: 'L1-002',
          }),
          createRuleDefinition({ enabled: false }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredUnit: 'biome-ast-engine' }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        const passedRules = new Set(actual.passedRules.map((rule) => rule.toString()));
        const skippedRules = new Set(actual.skippedRules.map((rule) => rule.toString()));
        const duplicates = [...passedRules].filter((ruleName) => skippedRules.has(ruleName));
        expect(duplicates).toEqual([]);
      });
    });

    context('—', () => {
      it('全violationsのruleNameがRuleDefinitionRegistryに登録済みである', () => {
        // Arrange
        const registry = new RuleDefinitionRegistry();
        const sut = new LintRunner(registry);
        const rules = Object.freeze([
          createRuleDefinition(),
          createRuleDefinition({
            name: createRuleName('require-layer-comment'),
            errorCode: 'L1-002',
          }),
        ]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredUnit: null, declaredLayer: null }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(actual.violations.every((violation) => registry.getByName(violation.ruleName))).toBe(true);
      });
    });

    context('durationMsが指定されている場合', () => {
      it('LintReportのdurationMsに正しく反映される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([] as RuleDefinition[]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredUnit: 'biome-ast-engine' }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 123 });

        // Assert
        expect(actual.durationMs).toBe(123);
      });
    });
  });

  describe('不正な入力を検出する', () => {
    context('空のrules配列の場合', () => {
      it('空のviolationsを持つLintReportが返される', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([] as RuleDefinition[]);
        const snapshots = Object.freeze([
          createSourceModuleSnapshot({ declaredUnit: 'biome-ast-engine' }),
        ]);
        const graph = createImportGraph({ nodes: Object.freeze([snapshots[0].filePath]) });

        // Act
        const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 });

        // Assert
        expect(actual.violations).toEqual([]);
        expect(actual.passedRules).toEqual([]);
        expect(actual.skippedRules).toEqual([]);
      });
    });

    context('rulesに未知のRuleNameが含まれる場合', () => {
      it('run()メソッド冒頭でUnknownRuleNameErrorがスローされる', () => {
        // Arrange
        const sut = createLintRunner();
        const rules = Object.freeze([
          {
            ...createRuleDefinition(),
            name: { toString: () => 'unknown-rule', equals: () => false } as RuleName,
          } as RuleDefinition,
        ]);
        const graph = createImportGraph({
          nodes: Object.freeze([] as FilePath[]),
          edges: Object.freeze([] as ImportEdge[]),
          rootNodes: Object.freeze([] as FilePath[]),
        });

        // Act
        const actual = () => sut.run({ rules, snapshots: Object.freeze([]), importGraph: graph, durationMs: 0 });

        // Assert
        expect(actual).toThrow(UnknownRuleNameError);
      });
    });
  });
});
