/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { RequiredInput } from '../value-objects/required-input.js';
import { RuleDefinition } from '../value-objects/rule-definition.js';
import { RuleName } from '../value-objects/rule-name.js';
import { RuleType } from '../value-objects/rule-type.js';

type RuleSetting = 'error' | 'warning' | 'off';

type ResolveEnabledInput = {
  readonly l1Enabled: boolean;
  readonly rules: Readonly<Record<string, RuleSetting | string>>;
};

const REQUIRED_INPUT = {
  sourceModuleSnapshots: RequiredInput.fromString('source-module-snapshots'),
  importGraph: RequiredInput.fromString('import-graph'),
  biomeDiagnostics: RequiredInput.fromString('biome-diagnostics'),
  workspaceInventory: RequiredInput.fromString('workspace-inventory'),
} as const;

const EXTERNAL_ANALYZER = RuleType.fromString('ExternalAnalyzer');

const createCatalogEntry = (
  name: string,
  errorCode: string,
  requiredInputs: readonly RequiredInput[],
  config: Readonly<Record<string, unknown>>,
  description: string,
  suggestion: string
): RuleDefinition =>
  RuleDefinition.create({
    name: RuleName.fromString(name),
    type: EXTERNAL_ANALYZER,
    enabled: true,
    severity: 'error',
    supportsAutofix: false,
    requiredInputs,
    config,
    errorCode,
    description,
    suggestion,
  });

export class UnknownRuleNameError extends Error {
  constructor(value: string) {
    super(`Unknown rule name: ${value}`);
    this.name = 'UnknownRuleNameError';
  }
}

export class InvalidRuleSeverityError extends Error {
  constructor(value: string) {
    super(`Invalid rule severity: ${value}`);
    this.name = 'InvalidRuleSeverityError';
  }
}

export class RuleDefinitionRegistry {
  private readonly catalog: ReadonlyMap<string, RuleDefinition>;

  constructor() {
    const definitions = Object.freeze([
      createCatalogEntry(
        'enforce-folder-structure',
        'L1-004',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots]),
        Object.freeze({ rootDir: 'scripts/harness', allowTestFixtures: true }),
        'フォルダ構造がレイヤーと一致していることを検証する',
        '宣言レイヤーと配置ディレクトリを一致させる'
      ),
      createCatalogEntry(
        'no-any-abuse',
        'L1-005',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots]),
        Object.freeze({ maxAnyCount: 0, maxAnyRatio: 0.05 }),
        '過剰なany使用を検出する',
        '型注釈を追加してanyを削減する'
      ),
      createCatalogEntry(
        'no-code-duplication',
        'L1-006',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots]),
        Object.freeze({ minOccurrences: 2, minFingerprintSpan: 20 }),
        '重複コードを検出する',
        '共通化または抽象化を行う'
      ),
      createCatalogEntry(
        'no-comment-flood',
        'L1-008',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots]),
        Object.freeze({ maxCommentRatio: 0.35, maxRepeatedBlocks: 1, minLogicalLines: 15 }),
        'コメント過多を検出する',
        '不要なコメントを整理し自己説明的なコードへ改善する'
      ),
      createCatalogEntry(
        'no-ghost-file',
        'L1-007',
        Object.freeze([REQUIRED_INPUT.importGraph]),
        Object.freeze({
          entryPointPatterns: Object.freeze(['**/index.ts', '**/cli/**/*.ts']),
          ignorePatterns: Object.freeze(['**/*.test.ts', '**/*.spec.ts']),
        }),
        '未参照ファイルを検出する',
        '参照されないファイルを削除またはエントリポイントとして扱う'
      ),
      createCatalogEntry(
        'no-layer-violation',
        'L1-003',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots, REQUIRED_INPUT.importGraph]),
        Object.freeze({ ignorePatterns: Object.freeze(['**/shared-kernel/**']) }),
        'レイヤー違反を検出する',
        '依存方向をアーキテクチャ方針に合わせる'
      ),
      createCatalogEntry(
        'require-layer-comment',
        'L1-002',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots]),
        Object.freeze({}),
        '@layerコメントの存在を検証する',
        'ファイル先頭に@layerコメントを追加する'
      ),
      createCatalogEntry(
        'require-unit-comment',
        'L1-001',
        Object.freeze([REQUIRED_INPUT.sourceModuleSnapshots]),
        Object.freeze({}),
        '@unitコメントの存在を検証する',
        'ファイル先頭に@unitコメントを追加する'
      ),
    ]);

    this.catalog = new Map(definitions.map((definition) => [definition.name.toString(), definition]));
  }

  getAll(): readonly RuleDefinition[] {
    return Object.freeze(
      [...this.catalog.values()].sort((left, right) =>
        left.name.toString().localeCompare(right.name.toString())
      )
    );
  }

  resolveEnabled(input: ResolveEnabledInput): {
    enabledRules: readonly RuleDefinition[];
    skippedRules: readonly RuleName[];
  } {
    const definitions = this.getAll();

    for (const ruleName of Object.keys(input.rules)) {
      if (!this.catalog.has(ruleName)) {
        throw new UnknownRuleNameError(ruleName);
      }
    }

    if (!input.l1Enabled) {
      return {
        enabledRules: Object.freeze([]),
        skippedRules: Object.freeze(definitions.map((definition) => definition.name)),
      };
    }

    const enabledRules: RuleDefinition[] = [];
    const skippedRules: RuleName[] = [];

    for (const definition of definitions) {
      const setting = input.rules[definition.name.toString()];

      if (setting === undefined) {
        enabledRules.push(definition);
        continue;
      }

      if (setting === 'off') {
        skippedRules.push(definition.name);
        continue;
      }

      if (setting !== 'error' && setting !== 'warning') {
        throw new InvalidRuleSeverityError(setting);
      }

      enabledRules.push(definition.withSeverity(setting));
    }

    return {
      enabledRules: Object.freeze(enabledRules),
      skippedRules: Object.freeze(skippedRules),
    };
  }

  getByName(name: RuleName): RuleDefinition {
    const definition = this.catalog.get(name.toString());

    if (definition === undefined) {
      throw new UnknownRuleNameError(name.toString());
    }

    return definition;
  }
}
