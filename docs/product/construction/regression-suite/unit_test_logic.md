# ユニットテストロジック設計: regression-suite

> **Unit ID**: regression-suite
> **作成日**: 2026-03-20
> **参照**: unit_test_design.md, domain_model.md

---

## 1. テストファイル構成

```text
scripts/harness/__tests__/unit/regression-suite/
├── aggregates/
│   └── v0-test-migration.test.ts          # UT-RS-001〜017
├── value-objects/
│   ├── suite-id.test.ts                   # UT-RS-020〜029
│   ├── regression-suite-definition.test.ts # UT-RS-030〜036
│   ├── k-requirement-test.test.ts          # UT-RS-040〜050
│   ├── gng-condition-test.test.ts          # UT-RS-055〜063
│   ├── agent-independence-test.test.ts     # UT-RS-068〜076
│   ├── migration-mapping.test.ts           # UT-RS-080〜083
│   ├── ci-gate-config.test.ts              # UT-RS-088〜099
│   ├── test-execution-summary.test.ts      # UT-RS-104〜113
│   ├── biome-modification-spec.test.ts     # UT-RS-118〜124
│   ├── v0-test-id.test.ts                  # UT-RS-130〜132
│   ├── coverage-rate.test.ts               # UT-RS-135〜139
│   └── import-violation.test.ts            # UT-RS-142〜144
└── services/
    ├── regression-runner.test.ts           # UT-RS-150〜156
    ├── migration-analyzer.test.ts          # UT-RS-160〜167
    └── import-guard-service.test.ts        # UT-RS-172〜177
```

---

## 2. 共通ヘルパー・ファクトリ

`scripts/harness/__tests__/helpers/test-helpers.ts` に追記する regression-suite ファクトリ関数群の疑似コード。

```typescript
// ---- regression-suite ファクトリ関数 ----

import { SuiteId } from '../../regression-suite/domain/value-objects/suite-id.js';
import { RegressionSuiteDefinition } from '../../regression-suite/domain/value-objects/regression-suite-definition.js';
import { KRequirementTest } from '../../regression-suite/domain/value-objects/k-requirement-test.js';
import { GngConditionTest } from '../../regression-suite/domain/value-objects/gng-condition-test.js';
import { AgentIndependenceTest } from '../../regression-suite/domain/value-objects/agent-independence-test.js';
import { MigrationMapping } from '../../regression-suite/domain/value-objects/migration-mapping.js';
import { CiGateConfig } from '../../regression-suite/domain/value-objects/ci-gate-config.js';
import { TestExecutionSummary } from '../../regression-suite/domain/value-objects/test-execution-summary.js';
import { BiomeModificationSpec } from '../../regression-suite/domain/value-objects/biome-modification-spec.js';
import { V0TestId } from '../../regression-suite/domain/value-objects/v0-test-id.js';
import { V1TestPath } from '../../regression-suite/domain/value-objects/v1-test-path.js';
import { CoverageRate } from '../../regression-suite/domain/value-objects/coverage-rate.js';
import { ImportViolation } from '../../regression-suite/domain/value-objects/import-violation.js';
import { TestFailureDetail } from '../../regression-suite/domain/value-objects/test-failure-detail.js';
import { V0TestMigration } from '../../regression-suite/domain/aggregates/v0-test-migration.js';

// SuiteId ファクトリ
export const createSuiteId = (
  raw: 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence' = 'k-requirements'
): SuiteId =>
  SuiteId.create(raw);

// V0TestId ファクトリ
export const createV0TestId = (
  path = 'scripts/__tests__/unit/harness-error.test.ts'
): V0TestId =>
  V0TestId.create(path);

// V1TestPath ファクトリ
export const createV1TestPath = (
  path = 'scripts/harness/__tests__/unit/harness-error/harness-error.test.ts'
): V1TestPath =>
  V1TestPath.create(path);

// BiomeModificationSpec ファクトリ
export const createBiomeModificationSpec = (
  overrides: Partial<{ targetApi: string; replacementApi: string; modificationReason: string }> = {}
): BiomeModificationSpec =>
  BiomeModificationSpec.create({
    targetApi: 'eslint-plugin-api',
    replacementApi: 'biome-lint-rule',
    modificationReason: 'ESLint固有APIをBiome対応APIに置換',
    ...overrides,
  });

// KRequirementTest ファクトリ
export const createKRequirementTest = (
  overrides: Partial<{ kNumber: string; targetUnit: string; verificationCondition: string }> = {}
): KRequirementTest =>
  KRequirementTest.create({
    kNumber: 'K1',
    targetUnit: 'validator-system',
    verificationCondition: 'ValidatorIdRegistryが正しく動作すること',
    ...overrides,
  });

// GngConditionTest ファクトリ
export const createGngConditionTest = (
  overrides: Partial<{ gngNumber: string; targetUnit: string; verificationCondition: string }> = {}
): GngConditionTest =>
  GngConditionTest.create({
    gngNumber: 'GNG-4',
    targetUnit: 'harness-api',
    verificationCondition: 'YOLO/skip-permissionsフラグが使用されないこと',
    ...overrides,
  });

// AgentIndependenceTest ファクトリ
export const createAgentIndependenceTest = (
  overrides: Partial<{
    targetModule: string;
    forbiddenPatterns: string[];
    allowedPaths: string[];
  }> = {}
): AgentIndependenceTest =>
  AgentIndependenceTest.create({
    targetModule: 'scripts/harness/regression-suite/domain/services/regression-runner.ts',
    forbiddenPatterns: ['@anthropic-ai/claude-code'],
    allowedPaths: [],
    ...overrides,
  });

// CoverageRate ファクトリ
export const createCoverageRate = (value = 90): CoverageRate =>
  CoverageRate.create(value);

// TestFailureDetail ファクトリ
export const createTestFailureDetail = (
  overrides: Partial<{ testCaseId: string; errorMessage: string; stackTrace?: string }> = {}
): TestFailureDetail =>
  TestFailureDetail.create({
    testCaseId: 'K1',
    errorMessage: 'assertion failed',
    stackTrace: undefined,
    ...overrides,
  });

// TestExecutionSummary ファクトリ
export const createTestExecutionSummary = (
  overrides: Partial<{
    passedCount: number;
    failedCount: number;
    skippedCount: number;
    totalCount: number;
    coverageRate: CoverageRate | null;
    failures: TestFailureDetail[];
  }> = {}
): TestExecutionSummary =>
  TestExecutionSummary.create({
    passedCount: 10,
    failedCount: 0,
    skippedCount: 0,
    totalCount: 10,
    coverageRate: createCoverageRate(90),
    failures: [],
    ...overrides,
  });

// CiGateConfig ファクトリ
export const createCiGateConfig = (
  overrides: Partial<{
    requiredSuiteIds: SuiteId[];
    coverageThreshold: number;
    executionMode: 'parallel' | 'sequential';
  }> = {}
): CiGateConfig =>
  CiGateConfig.create({
    requiredSuiteIds: [createSuiteId('k-requirements')],
    coverageThreshold: 90,
    executionMode: 'parallel',
    ...overrides,
  });

// ImportViolation ファクトリ
export const createImportViolation = (
  overrides: Partial<{ modulePath: string; forbiddenPackage: string; violationMessage: string }> = {}
): ImportViolation =>
  ImportViolation.create({
    modulePath: 'scripts/harness/regression-suite/domain/services/regression-runner.ts',
    forbiddenPackage: '@anthropic-ai/claude-code',
    violationMessage: 'Forbidden import detected: @anthropic-ai/claude-code',
    ...overrides,
  });

// RegressionSuiteDefinition ファクトリ
export const createRegressionSuiteDefinition = (
  overrides: Partial<{
    suiteId: SuiteId;
    testCases: KRequirementTest[] | GngConditionTest[] | AgentIndependenceTest[];
    description: string;
  }> = {}
): RegressionSuiteDefinition =>
  RegressionSuiteDefinition.create({
    suiteId: createSuiteId('k-requirements'),
    testCases: [createKRequirementTest()],
    description: 'K要件回帰テストスイート',
    ...overrides,
  });

// V0TestMigration（pending状態）ファクトリ
export const createV0TestMigration = (
  v0TestId: V0TestId = createV0TestId()
): V0TestMigration =>
  V0TestMigration.create(v0TestId);

// V0TestMigration（migrated状態）ファクトリ
export const createMigratedV0TestMigration = (
  v0TestId: V0TestId = createV0TestId(),
  v1TestPath: V1TestPath = createV1TestPath()
): V0TestMigration => {
  const migration = V0TestMigration.create(v0TestId);
  migration.migrate(v1TestPath);
  return migration;
};

// V0TestMigration（modified状態）ファクトリ
export const createModifiedV0TestMigration = (
  v0TestId: V0TestId = createV0TestId(),
  v1TestPath: V1TestPath = createV1TestPath(),
  biomeSpec: BiomeModificationSpec = createBiomeModificationSpec()
): V0TestMigration => {
  const migration = V0TestMigration.create(v0TestId);
  migration.migrateWithModification(v1TestPath, biomeSpec);
  return migration;
};

// V0TestMigration（skipped状態）ファクトリ
export const createSkippedV0TestMigration = (
  v0TestId: V0TestId = createV0TestId(),
  reason: 'out-of-scope' | 'orchestration-migrated' = 'out-of-scope'
): V0TestMigration => {
  const migration = V0TestMigration.create(v0TestId);
  migration.skip(reason);
  return migration;
};

// MigrationMapping ファクトリ（migrated状態のV0TestMigrationから生成）
export const createMigrationMapping = (): MigrationMapping =>
  createMigratedV0TestMigration().toMigrationMapping();
```

---

## 3. テストケース詳細ロジック

### 3.1 V0TestMigration（集約ルート）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/aggregates/v0-test-migration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { V0TestMigration } from '../../../../regression-suite/domain/aggregates/v0-test-migration.js';
import {
  createV0TestId,
  createV1TestPath,
  createBiomeModificationSpec,
} from '../../../helpers/test-helpers.js';

target('V0TestMigration', () => {

  // UT-RS-001
  describe('create: 有効なV0TestIdで生成する場合', () => {
    context('v0TestId が有効な相対パスの場合', () => {
      it('migrationStatus=pending・v1TestPath=null・biomeModificationSpec=null・skipReason=null で生成される', () => {
        // Arrange
        const v0TestId = createV0TestId('scripts/__tests__/unit/harness-error.test.ts');

        // Act
        const actual = V0TestMigration.create(v0TestId);

        // Assert
        expect(actual.migrationStatus).toBe('pending');
        expect(actual.v1TestPath).toBeNull();
        expect(actual.biomeModificationSpec).toBeNull();
        expect(actual.skipReason).toBeNull();
        expect(actual.v0TestId.value).toBe('scripts/__tests__/unit/harness-error.test.ts');
      });
    });
  });

  // UT-RS-002
  describe('create: v0TestId が空文字列の場合', () => {
    context('空文字列が渡された場合', () => {
      it('エラーをスロー / 生成失敗', () => {
        // Arrange / Act / Assert
        expect(() => V0TestMigration.create(createV0TestId(''))).toThrow();
      });
    });
  });

  // UT-RS-003
  describe('migrate: pending状態から正常遷移する場合', () => {
    context('pending状態のV0TestMigration に有効なV1TestPath を渡した場合', () => {
      it('migrationStatus=migrated・v1TestPath が設定される・biomeModificationSpec=null', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const v1TestPath = createV1TestPath();

        // Act
        migration.migrate(v1TestPath);
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('migrated');
        expect(actual.v1TestPath).not.toBeNull();
        expect(actual.v1TestPath?.value).toBe(v1TestPath.value);
        expect(actual.biomeModificationSpec).toBeNull();
      });
    });
  });

  // UT-RS-004
  describe('migrate: migrated状態での二重migrate呼び出し禁止（INV-1）', () => {
    context('migrated状態のV0TestMigration にmigrate を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act / Assert
        expect(() => migration.migrate(createV1TestPath())).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-005
  describe('migrate: modified状態でのmigrate呼び出し禁止（INV-1）', () => {
    context('modified状態のV0TestMigration にmigrate を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrateWithModification(createV1TestPath(), createBiomeModificationSpec());

        // Act / Assert
        expect(() => migration.migrate(createV1TestPath())).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-006
  describe('migrate: skipped状態でのmigrate呼び出し禁止（INV-1）', () => {
    context('skipped状態のV0TestMigration にmigrate を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.skip('out-of-scope');

        // Act / Assert
        expect(() => migration.migrate(createV1TestPath())).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-007
  describe('migrateWithModification: pending状態から正常遷移する場合（INV-2, INV-4, INV-5）', () => {
    context('pending状態のV0TestMigration に有効なV1TestPath と BiomeModificationSpec を渡した場合', () => {
      it('migrationStatus=modified・v1TestPath が設定される・biomeModificationSpec が設定される', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const v1TestPath = createV1TestPath();
        const biomeSpec = createBiomeModificationSpec();

        // Act
        migration.migrateWithModification(v1TestPath, biomeSpec);
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('modified');
        expect(actual.v1TestPath).not.toBeNull();
        expect(actual.biomeModificationSpec).not.toBeNull();
        expect(actual.biomeModificationSpec?.targetApi).toBe(biomeSpec.targetApi);
      });
    });
  });

  // UT-RS-008
  describe('migrateWithModification: migrated状態での呼び出し禁止（INV-2）', () => {
    context('migrated状態のV0TestMigration に migrateWithModification を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act / Assert
        expect(() =>
          migration.migrateWithModification(createV1TestPath(), createBiomeModificationSpec())
        ).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-009
  describe('migrateWithModification: modified後にbiomeModificationSpecがnullでないこと（INV-5）', () => {
    context('migrateWithModification を呼び出した後', () => {
      it('biomeModificationSpec が非null であること', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const biomeSpec = createBiomeModificationSpec();

        // Act
        migration.migrateWithModification(createV1TestPath(), biomeSpec);
        const actual = migration;

        // Assert
        expect(actual.biomeModificationSpec).not.toBeNull();
        expect(actual.biomeModificationSpec?.replacementApi).toBe(biomeSpec.replacementApi);
      });
    });
  });

  // UT-RS-010
  describe("skip: pending状態から skip('out-of-scope') は正常遷移する（INV-3）", () => {
    context("pending状態のV0TestMigration に skip('out-of-scope') を呼び出した場合", () => {
      it("migrationStatus=skipped・skipReason='out-of-scope'・v1TestPath=null", () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());

        // Act
        migration.skip('out-of-scope');
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('skipped');
        expect(actual.skipReason).toBe('out-of-scope');
        expect(actual.v1TestPath).toBeNull();
      });
    });
  });

  // UT-RS-011
  describe("skip: pending状態から skip('orchestration-migrated') は正常遷移する", () => {
    context("pending状態のV0TestMigration に skip('orchestration-migrated') を呼び出した場合", () => {
      it("migrationStatus=skipped・skipReason='orchestration-migrated'", () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());

        // Act
        migration.skip('orchestration-migrated');
        const actual = migration;

        // Assert
        expect(actual.migrationStatus).toBe('skipped');
        expect(actual.skipReason).toBe('orchestration-migrated');
      });
    });
  });

  // UT-RS-012
  describe('skip: migrated状態での skip 呼び出し禁止（INV-3）', () => {
    context('migrated状態のV0TestMigration に skip を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act / Assert
        expect(() => migration.skip('out-of-scope')).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-013
  describe('skip: skipped状態での skip 呼び出し禁止（INV-3）', () => {
    context('skipped状態のV0TestMigration に skip を呼び出した場合', () => {
      it('MigrationAlreadyCompletedError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.skip('out-of-scope');

        // Act / Assert
        expect(() => migration.skip('out-of-scope')).toThrow('MigrationAlreadyCompletedError');
      });
    });
  });

  // UT-RS-014
  describe('toMigrationMapping: migrated状態で正常返却する（INV-4）', () => {
    context('migrated状態のV0TestMigration に toMigrationMapping を呼び出した場合', () => {
      it("MigrationMapping が返される。migrationStatus='migrated'", () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.migrate(createV1TestPath());

        // Act
        const actual = migration.toMigrationMapping();

        // Assert
        expect(actual.migrationStatus).toBe('migrated');
        expect(actual.v0TestId).not.toBeNull();
        expect(actual.v1TestPath).not.toBeNull();
      });
    });
  });

  // UT-RS-015
  describe('toMigrationMapping: modified状態で正常返却する（INV-4）', () => {
    context('modified状態のV0TestMigration（biomeModificationSpec付き）に toMigrationMapping を呼び出した場合', () => {
      it('MigrationMapping が返される。biomeModification が含まれる', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        const biomeSpec = createBiomeModificationSpec();
        migration.migrateWithModification(createV1TestPath(), biomeSpec);

        // Act
        const actual = migration.toMigrationMapping();

        // Assert
        expect(actual.migrationStatus).toBe('modified');
        expect(actual.biomeModification).not.toBeNull();
        expect(actual.biomeModification?.targetApi).toBe(biomeSpec.targetApi);
      });
    });
  });

  // UT-RS-016
  describe('toMigrationMapping: pending状態で呼び出すとエラー', () => {
    context('pending状態のV0TestMigration に toMigrationMapping を呼び出した場合', () => {
      it('InvalidMigrationStateError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());

        // Act / Assert
        expect(() => migration.toMigrationMapping()).toThrow('InvalidMigrationStateError');
      });
    });
  });

  // UT-RS-017
  describe('toMigrationMapping: skipped状態で呼び出すとエラー', () => {
    context('skipped状態のV0TestMigration に toMigrationMapping を呼び出した場合', () => {
      it('InvalidMigrationStateError をスロー', () => {
        // Arrange
        const migration = V0TestMigration.create(createV0TestId());
        migration.skip('out-of-scope');

        // Act / Assert
        expect(() => migration.toMigrationMapping()).toThrow('InvalidMigrationStateError');
      });
    });
  });
});
```

---

### 3.2 SuiteId（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/suite-id.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { SuiteId } from '../../../../regression-suite/domain/value-objects/suite-id.js';

target('SuiteId', () => {

  // UT-RS-020
  describe("create: raw='k-requirements' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        // Arrange / Act
        const actual = SuiteId.create('k-requirements');
        // Assert
        expect(actual.value).toBe('k-requirements');
      });
    });
  });

  // UT-RS-021
  describe("create: raw='gng-gate' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        // Arrange / Act
        const actual = SuiteId.create('gng-gate');
        // Assert
        expect(actual.value).toBe('gng-gate');
      });
    });
  });

  // UT-RS-022
  describe("create: raw='v0-migration' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        // Arrange / Act
        const actual = SuiteId.create('v0-migration');
        // Assert
        expect(actual.value).toBe('v0-migration');
      });
    });
  });

  // UT-RS-023
  describe("create: raw='agent-independence' の場合", () => {
    context('有効なSuiteId文字列が渡された場合', () => {
      it('正常に生成される', () => {
        // Arrange / Act
        const actual = SuiteId.create('agent-independence');
        // Assert
        expect(actual.value).toBe('agent-independence');
      });
    });
  });

  // UT-RS-024
  describe("create: raw='unknown-suite' の場合（INV-7）", () => {
    context('無効なSuiteId文字列が渡された場合', () => {
      it('InvalidSuiteIdError をスロー', () => {
        // Arrange / Act / Assert
        expect(() => SuiteId.create('unknown-suite' as never)).toThrow('InvalidSuiteIdError');
      });
    });
  });

  // UT-RS-025
  describe("create: raw='' の場合", () => {
    context('空文字列が渡された場合', () => {
      it('InvalidSuiteIdError をスロー', () => {
        // Arrange / Act / Assert
        expect(() => SuiteId.create('' as never)).toThrow('InvalidSuiteIdError');
      });
    });
  });

  // UT-RS-026
  describe("create: raw='K-REQUIREMENTS'（大文字）の場合", () => {
    context('大文字のSuiteId文字列が渡された場合', () => {
      it('InvalidSuiteIdError をスロー', () => {
        // Arrange / Act / Assert
        expect(() => SuiteId.create('K-REQUIREMENTS' as never)).toThrow('InvalidSuiteIdError');
      });
    });
  });

  // UT-RS-027
  describe("equals: SuiteId('k-requirements') と SuiteId('k-requirements') を比較する場合", () => {
    context('同一値のSuiteIdを比較した場合', () => {
      it('等価（値等価性）', () => {
        // Arrange
        const a = SuiteId.create('k-requirements');
        const b = SuiteId.create('k-requirements');
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // UT-RS-028
  describe("equals: SuiteId('k-requirements') と SuiteId('gng-gate') を比較する場合", () => {
    context('異なる値のSuiteIdを比較した場合', () => {
      it('非等価', () => {
        // Arrange
        const a = SuiteId.create('k-requirements');
        const b = SuiteId.create('gng-gate');
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-RS-029
  describe('immutable: 生成後の value プロパティへの直接変更は反映されない', () => {
    context('Object.freeze により生成後の変更は反映されない', () => {
      it('変更が反映されない（immutable）', () => {
        // Arrange
        const suiteId = SuiteId.create('k-requirements');
        // Act
        // strict モードでは TypeError がスローされることもあるが、いずれにせよ値は変わらない
        try { (suiteId as Record<string, unknown>)['value'] = 'gng-gate'; } catch (_) { /* no-op */ }
        const actual = suiteId.value;
        // Assert
        expect(actual).toBe('k-requirements');
      });
    });
  });
});
```

---

### 3.3 RegressionSuiteDefinition（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/regression-suite-definition.test.ts`

```typescript
target('RegressionSuiteDefinition', () => {

  // UT-RS-030
  describe('create: 有効なsuiteId・testCases 1件・description で生成する場合', () => {
    it('正常に生成される', () => {
      // Arrange
      const suiteId = createSuiteId('k-requirements');
      const testCases = [createKRequirementTest()];
      // Act
      const actual = createRegressionSuiteDefinition({ suiteId, testCases, description: 'K要件テスト' });
      // Assert
      expect(actual.suiteId.value).toBe('k-requirements');
      expect(actual.testCases).toHaveLength(1);
    });
  });

  // UT-RS-031
  describe('create: testCases に複数のKRequirementTest を渡す場合', () => {
    it('正常に生成される', () => {
      // Arrange
      const testCases = [
        createKRequirementTest({ kNumber: 'K1' }),
        createKRequirementTest({ kNumber: 'K2' }),
        createKRequirementTest({ kNumber: 'K3' }),
      ];
      // Act
      const actual = createRegressionSuiteDefinition({ testCases });
      // Assert
      expect(actual.testCases).toHaveLength(3);
    });
  });

  // UT-RS-032
  describe('create: testCases=[] の場合（INV-6）', () => {
    it('EmptyTestCasesError をスロー', () => {
      // Arrange / Act / Assert
      expect(() => createRegressionSuiteDefinition({ testCases: [] })).toThrow('EmptyTestCasesError');
    });
  });

  // UT-RS-033
  describe('create: testCases が空配列（INV-6 重複確認）', () => {
    it('EmptyTestCasesError をスロー', () => {
      // Arrange / Act / Assert
      expect(() => RegressionSuiteDefinition.create({
        suiteId: createSuiteId(),
        testCases: [],
        description: 'desc',
      })).toThrow('EmptyTestCasesError');
    });
  });

  // UT-RS-034
  describe('immutable: 生成後にtestCasesの変更が反映されない', () => {
    it('変更が反映されない（ReadonlyArray）', () => {
      // Arrange
      const definition = createRegressionSuiteDefinition();
      const originalLength = definition.testCases.length;
      // Act
      try {
        (definition.testCases as unknown[]).push(createKRequirementTest({ kNumber: 'K15' }));
      } catch (_) { /* no-op */ }
      // Assert
      expect(definition.testCases.length).toBe(originalLength);
    });
  });

  // UT-RS-035
  describe('equals: 同一suiteId/testCasesを持つ2つのRegressionSuiteDefinition を比較する場合', () => {
    it('等価（値等価性）', () => {
      // Arrange
      const a = createRegressionSuiteDefinition();
      const b = createRegressionSuiteDefinition();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });
  });

  // UT-RS-036
  describe('equals: 異なるsuiteIdを持つ2つのRegressionSuiteDefinition を比較する場合', () => {
    it('非等価', () => {
      // Arrange
      const a = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
      const b = createRegressionSuiteDefinition({ suiteId: createSuiteId('gng-gate'), testCases: [createGngConditionTest()] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.4 KRequirementTest（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/k-requirement-test.test.ts`

```typescript
target('KRequirementTest', () => {

  // UT-RS-040
  describe("create: kNumber='K1'・targetUnit='validator-system'・verificationCondition=非空文字列", () => {
    it('正常に生成される', () => {
      // Arrange / Act
      const actual = createKRequirementTest({ kNumber: 'K1', targetUnit: 'validator-system', verificationCondition: '有効な検証条件' });
      // Assert
      expect(actual.kNumber).toBe('K1');
      expect(actual.targetUnit).toBe('validator-system');
    });
  });

  // UT-RS-041
  describe("create: kNumber='K15' の場合（最大値）", () => {
    it('正常に生成される', () => {
      const actual = createKRequirementTest({ kNumber: 'K15' });
      expect(actual.kNumber).toBe('K15');
    });
  });

  // UT-RS-042
  describe("create: kNumber='K3.5' の場合（小数点を含む番号）", () => {
    it('正常に生成される', () => {
      const actual = createKRequirementTest({ kNumber: 'K3.5' });
      expect(actual.kNumber).toBe('K3.5');
    });
  });

  // UT-RS-043
  describe("create: kNumber='K16' の場合（INV-11）", () => {
    it('InvalidKNumberError をスロー', () => {
      expect(() => createKRequirementTest({ kNumber: 'K16' })).toThrow('InvalidKNumberError');
    });
  });

  // UT-RS-044
  describe("create: kNumber='K0' の場合", () => {
    it('InvalidKNumberError をスロー', () => {
      expect(() => createKRequirementTest({ kNumber: 'K0' })).toThrow('InvalidKNumberError');
    });
  });

  // UT-RS-045
  describe("create: kNumber='' の場合", () => {
    it('InvalidKNumberError をスロー', () => {
      expect(() => createKRequirementTest({ kNumber: '' })).toThrow('InvalidKNumberError');
    });
  });

  // UT-RS-046
  describe("create: targetUnit='' の場合（非空文字列必須）", () => {
    it('エラーをスロー', () => {
      expect(() => createKRequirementTest({ targetUnit: '' })).toThrow();
    });
  });

  // UT-RS-047
  describe("create: verificationCondition='' の場合（非空文字列必須）", () => {
    it('エラーをスロー', () => {
      expect(() => createKRequirementTest({ verificationCondition: '' })).toThrow();
    });
  });

  // UT-RS-048
  describe("create: kNumber='k1'（小文字）の場合", () => {
    it('InvalidKNumberError をスロー', () => {
      expect(() => createKRequirementTest({ kNumber: 'k1' })).toThrow('InvalidKNumberError');
    });
  });

  // UT-RS-049
  describe('equals: 同一kNumber/targetUnit/verificationConditionを持つ2つのKRequirementTest を比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createKRequirementTest();
      const b = createKRequirementTest();
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-050
  describe('equals: kNumberのみ異なる2つのKRequirementTest を比較する場合', () => {
    it('非等価', () => {
      const a = createKRequirementTest({ kNumber: 'K1' });
      const b = createKRequirementTest({ kNumber: 'K2' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

### 3.5 GngConditionTest（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/gng-condition-test.test.ts`

```typescript
target('GngConditionTest', () => {

  // UT-RS-055
  describe("create: gngNumber='GNG-4'・targetUnit・verificationCondition=非空文字列", () => {
    it('正常に生成される', () => {
      const actual = createGngConditionTest({ gngNumber: 'GNG-4' });
      expect(actual.gngNumber).toBe('GNG-4');
    });
  });

  // UT-RS-056
  describe("create: gngNumber='GNG-5' の場合", () => {
    it('正常に生成される', () => {
      const actual = createGngConditionTest({ gngNumber: 'GNG-5' });
      expect(actual.gngNumber).toBe('GNG-5');
    });
  });

  // UT-RS-057
  describe("create: gngNumber='GNG-8' の場合", () => {
    it('正常に生成される', () => {
      const actual = createGngConditionTest({ gngNumber: 'GNG-8' });
      expect(actual.gngNumber).toBe('GNG-8');
    });
  });

  // UT-RS-058
  describe("create: gngNumber='GNG-1' の場合（INV-12 スコープ外）", () => {
    it('InvalidGngNumberError をスロー', () => {
      expect(() => createGngConditionTest({ gngNumber: 'GNG-1' })).toThrow('InvalidGngNumberError');
    });
  });

  // UT-RS-059
  describe("create: gngNumber='GNG-9' の場合（INV-12 スコープ外）", () => {
    it('InvalidGngNumberError をスロー', () => {
      expect(() => createGngConditionTest({ gngNumber: 'GNG-9' })).toThrow('InvalidGngNumberError');
    });
  });

  // UT-RS-060
  describe("create: gngNumber='' の場合", () => {
    it('InvalidGngNumberError をスロー', () => {
      expect(() => createGngConditionTest({ gngNumber: '' })).toThrow('InvalidGngNumberError');
    });
  });

  // UT-RS-061
  describe("create: gngNumber='gng-4'（小文字）の場合", () => {
    it('InvalidGngNumberError をスロー', () => {
      expect(() => createGngConditionTest({ gngNumber: 'gng-4' })).toThrow('InvalidGngNumberError');
    });
  });

  // UT-RS-062
  describe('equals: 同一gngNumber/targetUnit/verificationConditionを持つ2つのGngConditionTest を比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createGngConditionTest();
      const b = createGngConditionTest();
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-063
  describe('equals: gngNumberのみ異なる2つのGngConditionTest を比較する場合', () => {
    it('非等価', () => {
      const a = createGngConditionTest({ gngNumber: 'GNG-4' });
      const b = createGngConditionTest({ gngNumber: 'GNG-5' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

### 3.6 AgentIndependenceTest（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/agent-independence-test.test.ts`

```typescript
target('AgentIndependenceTest', () => {

  // UT-RS-068
  describe("create: 有効なtargetModule・forbiddenPatterns=['@anthropic-ai/claude-code']・allowedPaths=[]", () => {
    it('正常に生成される', () => {
      const actual = createAgentIndependenceTest();
      expect(actual.forbiddenPatterns).toHaveLength(1);
      expect(actual.forbiddenPatterns[0]).toBe('@anthropic-ai/claude-code');
    });
  });

  // UT-RS-069
  describe("create: forbiddenPatterns=['@anthropic-ai/claude-code', 'claude-sdk']（複数パターン）", () => {
    it('正常に生成される', () => {
      const actual = createAgentIndependenceTest({ forbiddenPatterns: ['@anthropic-ai/claude-code', 'claude-sdk'] });
      expect(actual.forbiddenPatterns).toHaveLength(2);
    });
  });

  // UT-RS-070
  describe('create: allowedPaths=省略（デフォルト空配列）', () => {
    it('正常に生成される', () => {
      const actual = createAgentIndependenceTest({ allowedPaths: [] });
      expect(actual.allowedPaths).toHaveLength(0);
    });
  });

  // UT-RS-071
  describe('create: forbiddenPatterns=[] の場合（INV-10）', () => {
    it('EmptyForbiddenPatternsError をスロー', () => {
      expect(() => createAgentIndependenceTest({ forbiddenPatterns: [] })).toThrow('EmptyForbiddenPatternsError');
    });
  });

  // UT-RS-072
  describe("create: targetModule='' の場合（非空文字列必須）", () => {
    it('エラーをスロー', () => {
      expect(() => createAgentIndependenceTest({ targetModule: '' })).toThrow();
    });
  });

  // UT-RS-073
  describe('create: forbiddenPatternsが空配列（INV-10 重複確認）', () => {
    it('EmptyForbiddenPatternsError をスロー', () => {
      expect(() => AgentIndependenceTest.create({
        targetModule: 'scripts/harness/x.ts',
        forbiddenPatterns: [],
        allowedPaths: [],
      })).toThrow('EmptyForbiddenPatternsError');
    });
  });

  // UT-RS-074
  describe('immutable: 生成後にforbiddenPatternsの変更が反映されない', () => {
    it('変更が反映されない（ReadonlyArray）', () => {
      const test = createAgentIndependenceTest();
      const originalLength = test.forbiddenPatterns.length;
      try {
        (test.forbiddenPatterns as unknown[]).push('new-pattern');
      } catch (_) { /* no-op */ }
      expect(test.forbiddenPatterns.length).toBe(originalLength);
    });
  });

  // UT-RS-075
  describe('equals: 同一targetModule/forbiddenPatterns/allowedPathsを持つ2つのAgentIndependenceTest を比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createAgentIndependenceTest();
      const b = createAgentIndependenceTest();
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-076
  describe('equals: forbiddenPatternsのみ異なる2つのAgentIndependenceTest を比較する場合', () => {
    it('非等価', () => {
      const a = createAgentIndependenceTest({ forbiddenPatterns: ['@anthropic-ai/claude-code'] });
      const b = createAgentIndependenceTest({ forbiddenPatterns: ['@anthropic-ai/claude-code', 'claude-sdk'] });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

### 3.7 MigrationMapping（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/migration-mapping.test.ts`

```typescript
target('MigrationMapping', () => {

  // UT-RS-080
  describe('toMigrationMapping: migrated状態のV0TestMigrationからMigrationMappingを生成する場合', () => {
    it("MigrationMapping 生成。migrationStatus='migrated'・biomeModification=null", () => {
      // Arrange
      const migration = createMigratedV0TestMigration();
      // Act
      const actual = migration.toMigrationMapping();
      // Assert
      expect(actual.migrationStatus).toBe('migrated');
      expect(actual.biomeModification).toBeNull();
    });
  });

  // UT-RS-081
  describe('toMigrationMapping: modified状態のV0TestMigration（biomeModificationSpec付き）からMigrationMappingを生成する場合', () => {
    it("MigrationMapping 生成。migrationStatus='modified'・biomeModification が設定される", () => {
      // Arrange
      const migration = createModifiedV0TestMigration();
      // Act
      const actual = migration.toMigrationMapping();
      // Assert
      expect(actual.migrationStatus).toBe('modified');
      expect(actual.biomeModification).not.toBeNull();
    });
  });

  // UT-RS-082
  describe('toMigrationMapping: pending/skippedのV0TestMigrationから呼び出した場合（不変条件）', () => {
    context('pending状態の場合', () => {
      it('InvalidMigrationStateError をスロー', () => {
        const migration = createV0TestMigration();
        expect(() => migration.toMigrationMapping()).toThrow('InvalidMigrationStateError');
      });
    });
    context('skipped状態の場合', () => {
      it('InvalidMigrationStateError をスロー', () => {
        const migration = createSkippedV0TestMigration();
        expect(() => migration.toMigrationMapping()).toThrow('InvalidMigrationStateError');
      });
    });
  });

  // UT-RS-083
  describe('equals: 同一v0TestId/v1TestPath/migrationStatusを持つ2つのMigrationMapping を比較する場合', () => {
    it('等価（値等価性）', () => {
      // Arrange
      const v0TestId = createV0TestId();
      const migA = V0TestMigration.create(v0TestId);
      const migB = V0TestMigration.create(v0TestId);
      const v1Path = createV1TestPath();
      migA.migrate(v1Path);
      migB.migrate(v1Path);
      // Act
      const a = migA.toMigrationMapping();
      const b = migB.toMigrationMapping();
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });
  });
});
```

---

### 3.8 CiGateConfig（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/ci-gate-config.test.ts`

```typescript
target('CiGateConfig', () => {

  // UT-RS-088
  describe("create: requiredSuiteIds=[SuiteId('k-requirements')]・coverageThreshold=90・executionMode='parallel'", () => {
    it('正常に生成される', () => {
      const actual = createCiGateConfig();
      expect(actual.coverageThreshold).toBe(90);
      expect(actual.executionMode).toBe('parallel');
    });
  });

  // UT-RS-089
  describe('create: coverageThreshold=1（最小値: 0より大きい）', () => {
    it('正常に生成される', () => {
      const actual = createCiGateConfig({ coverageThreshold: 1 });
      expect(actual.coverageThreshold).toBe(1);
    });
  });

  // UT-RS-090
  describe('create: coverageThreshold=100（最大値）', () => {
    it('正常に生成される', () => {
      const actual = createCiGateConfig({ coverageThreshold: 100 });
      expect(actual.coverageThreshold).toBe(100);
    });
  });

  // UT-RS-091
  describe('create: coverageThreshold=0 の場合（INV-8）', () => {
    it('InvalidCoverageThresholdError をスロー', () => {
      expect(() => createCiGateConfig({ coverageThreshold: 0 })).toThrow('InvalidCoverageThresholdError');
    });
  });

  // UT-RS-092
  describe('create: coverageThreshold=101 の場合（INV-8）', () => {
    it('InvalidCoverageThresholdError をスロー', () => {
      expect(() => createCiGateConfig({ coverageThreshold: 101 })).toThrow('InvalidCoverageThresholdError');
    });
  });

  // UT-RS-093
  describe('create: coverageThreshold=-1 の場合（INV-8）', () => {
    it('InvalidCoverageThresholdError をスロー', () => {
      expect(() => createCiGateConfig({ coverageThreshold: -1 })).toThrow('InvalidCoverageThresholdError');
    });
  });

  // UT-RS-094
  describe("create: executionMode='sequential' の場合", () => {
    it('正常に生成される', () => {
      const actual = createCiGateConfig({ executionMode: 'sequential' });
      expect(actual.executionMode).toBe('sequential');
    });
  });

  // UT-RS-095
  describe('create: coverageThreshold=0（INV-8 重複確認）', () => {
    it('InvalidCoverageThresholdError をスロー', () => {
      expect(() => CiGateConfig.create({
        requiredSuiteIds: [createSuiteId()],
        coverageThreshold: 0,
        executionMode: 'parallel',
      })).toThrow('InvalidCoverageThresholdError');
    });
  });

  // UT-RS-096
  describe("isRequired: requiredSuiteIds=['k-requirements'] で isRequired(SuiteId('k-requirements')) を呼ぶ場合", () => {
    it('true を返す', () => {
      const config = createCiGateConfig({ requiredSuiteIds: [createSuiteId('k-requirements')] });
      const actual = config.isRequired(createSuiteId('k-requirements'));
      expect(actual).toBe(true);
    });
  });

  // UT-RS-097
  describe("isRequired: requiredSuiteIds=['k-requirements'] で isRequired(SuiteId('gng-gate')) を呼ぶ場合", () => {
    it('false を返す', () => {
      const config = createCiGateConfig({ requiredSuiteIds: [createSuiteId('k-requirements')] });
      const actual = config.isRequired(createSuiteId('gng-gate'));
      expect(actual).toBe(false);
    });
  });

  // UT-RS-098
  describe('equals: 同一requiredSuiteIds/coverageThreshold/executionModeを持つ2つのCiGateConfig を比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createCiGateConfig();
      const b = createCiGateConfig();
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-099
  describe('equals: coverageThresholdのみ異なる2つのCiGateConfig を比較する場合', () => {
    it('非等価', () => {
      const a = createCiGateConfig({ coverageThreshold: 80 });
      const b = createCiGateConfig({ coverageThreshold: 90 });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

### 3.9 TestExecutionSummary（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/test-execution-summary.test.ts`

```typescript
target('TestExecutionSummary', () => {

  // UT-RS-104
  describe('create: passedCount=10・failedCount=2・skippedCount=1・totalCount=13', () => {
    it('正常に生成される', () => {
      const actual = createTestExecutionSummary({ passedCount: 10, failedCount: 2, skippedCount: 1, totalCount: 13 });
      expect(actual.passedCount).toBe(10);
      expect(actual.totalCount).toBe(13);
    });
  });

  // UT-RS-105
  describe('create: passedCount=0・failedCount=0・skippedCount=0・totalCount=0（全件なし）', () => {
    it('正常に生成される', () => {
      const actual = createTestExecutionSummary({ passedCount: 0, failedCount: 0, skippedCount: 0, totalCount: 0 });
      expect(actual.totalCount).toBe(0);
    });
  });

  // UT-RS-106
  describe('create: coverageRate=CoverageRate(90)・failures=[]（カバレッジあり）', () => {
    it('正常に生成される', () => {
      const actual = createTestExecutionSummary({ coverageRate: createCoverageRate(90), failures: [] });
      expect(actual.coverageRate?.value).toBe(90);
    });
  });

  // UT-RS-107
  describe('create: passedCount=5・failedCount=3・skippedCount=0・totalCount=9（合計不一致）（INV-9）', () => {
    it('TestCountIntegrityError をスロー', () => {
      expect(() =>
        createTestExecutionSummary({ passedCount: 5, failedCount: 3, skippedCount: 0, totalCount: 9 })
      ).toThrow('TestCountIntegrityError');
    });
  });

  // UT-RS-108
  describe('create: failedCount=2・failures=[TestFailureDetail 1件]（failuresとfailedCountの不一致）（INV-9）', () => {
    it('TestCountIntegrityError をスロー', () => {
      expect(() =>
        createTestExecutionSummary({
          passedCount: 9,
          failedCount: 2,
          skippedCount: 0,
          totalCount: 11,
          failures: [createTestFailureDetail()], // 1件だがfailedCount=2
        })
      ).toThrow('TestCountIntegrityError');
    });
  });

  // UT-RS-109
  describe('create: passedCount+failedCount+skippedCount≠totalCount（INV-9 重複確認）', () => {
    it('TestCountIntegrityError をスロー', () => {
      expect(() =>
        TestExecutionSummary.create({
          passedCount: 3, failedCount: 2, skippedCount: 1, totalCount: 7, // 3+2+1=6≠7
          coverageRate: null, failures: [],
        })
      ).toThrow('TestCountIntegrityError');
    });
  });

  // UT-RS-110
  describe('isPassedGate: coverageRate=90・threshold=90 の場合', () => {
    it('true を返す', () => {
      const summary = createTestExecutionSummary({ coverageRate: createCoverageRate(90) });
      expect(summary.isPassedGate(90)).toBe(true);
    });
  });

  // UT-RS-111
  describe('isPassedGate: coverageRate=89・threshold=90 の場合', () => {
    it('false を返す', () => {
      const summary = createTestExecutionSummary({ coverageRate: createCoverageRate(89) });
      expect(summary.isPassedGate(90)).toBe(false);
    });
  });

  // UT-RS-112
  describe('isPassedGate: failedCount=0・coverageRate=100 の場合', () => {
    it('true を返す', () => {
      const summary = createTestExecutionSummary({
        passedCount: 10, failedCount: 0, skippedCount: 0, totalCount: 10,
        coverageRate: createCoverageRate(100), failures: [],
      });
      expect(summary.isPassedGate(90)).toBe(true);
    });
  });

  // UT-RS-113
  describe('equals: 同一passedCount/failedCount/skippedCount/totalCountを持つ2つのTestExecutionSummary を比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createTestExecutionSummary();
      const b = createTestExecutionSummary();
      expect(a.equals(b)).toBe(true);
    });
  });
});
```

---

### 3.10 BiomeModificationSpec（値オブジェクト）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/value-objects/biome-modification-spec.test.ts`

```typescript
target('BiomeModificationSpec', () => {

  // UT-RS-118
  describe("create: targetApi='eslint-specific-api'・replacementApi='biome-api'・modificationReason=非空文字列", () => {
    it('正常に生成される', () => {
      const actual = createBiomeModificationSpec();
      expect(actual.targetApi).toBe('eslint-plugin-api');
      expect(actual.replacementApi).toBe('biome-lint-rule');
    });
  });

  // UT-RS-119
  describe("create: targetApi='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() => createBiomeModificationSpec({ targetApi: '' })).toThrow();
    });
  });

  // UT-RS-120
  describe("create: replacementApi='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() => createBiomeModificationSpec({ replacementApi: '' })).toThrow();
    });
  });

  // UT-RS-121
  describe("create: modificationReason='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() => createBiomeModificationSpec({ modificationReason: '' })).toThrow();
    });
  });

  // UT-RS-122
  describe("create: targetApi と replacementApi が同値（'api-x' = 'api-x'）の場合", () => {
    it('エラーをスロー（targetApi !== replacementApi 必須）', () => {
      expect(() => createBiomeModificationSpec({ targetApi: 'api-x', replacementApi: 'api-x' })).toThrow();
    });
  });

  // UT-RS-123
  describe('equals: 同一targetApi/replacementApi/modificationReasonを持つ2つのBiomeModificationSpec を比較する場合', () => {
    it('等価（値等価性）', () => {
      const a = createBiomeModificationSpec();
      const b = createBiomeModificationSpec();
      expect(a.equals(b)).toBe(true);
    });
  });

  // UT-RS-124
  describe('equals: targetApiのみ異なる2つのBiomeModificationSpec を比較する場合', () => {
    it('非等価', () => {
      const a = createBiomeModificationSpec({ targetApi: 'api-x' });
      const b = createBiomeModificationSpec({ targetApi: 'api-y' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

### 3.11 補助型（V0TestId / CoverageRate / ImportViolation）

**テストファイル**: 各 `value-objects/*.test.ts`

```typescript
// V0TestId: scripts/harness/__tests__/unit/regression-suite/value-objects/v0-test-id.test.ts

target('V0TestId', () => {

  // UT-RS-130
  describe("create: path='scripts/__tests__/unit/harness-error.test.ts' の場合", () => {
    it('正常に生成される', () => {
      const actual = createV0TestId('scripts/__tests__/unit/harness-error.test.ts');
      expect(actual.value).toBe('scripts/__tests__/unit/harness-error.test.ts');
    });
  });

  // UT-RS-131
  describe("create: path=''（空文字列）の場合", () => {
    it('エラーをスロー', () => {
      expect(() => V0TestId.create('')).toThrow();
    });
  });

  // UT-RS-132
  describe("create: path='invalid-path'（`scripts/__tests__/` プレフィックスなし）の場合", () => {
    it('エラーをスロー', () => {
      expect(() => V0TestId.create('invalid-path')).toThrow();
    });
  });
});

// CoverageRate: scripts/harness/__tests__/unit/regression-suite/value-objects/coverage-rate.test.ts

target('CoverageRate', () => {

  // UT-RS-135
  describe('create: value=90 の場合', () => {
    it('正常に生成される', () => {
      const actual = createCoverageRate(90);
      expect(actual.value).toBe(90);
    });
  });

  // UT-RS-136
  describe('create: value=0 の場合（最小値）', () => {
    it('正常に生成される', () => {
      const actual = createCoverageRate(0);
      expect(actual.value).toBe(0);
    });
  });

  // UT-RS-137
  describe('create: value=100 の場合（最大値）', () => {
    it('正常に生成される', () => {
      const actual = createCoverageRate(100);
      expect(actual.value).toBe(100);
    });
  });

  // UT-RS-138
  describe('create: value=-1 の場合', () => {
    it('エラーをスロー', () => {
      expect(() => CoverageRate.create(-1)).toThrow();
    });
  });

  // UT-RS-139
  describe('create: value=101 の場合', () => {
    it('エラーをスロー', () => {
      expect(() => CoverageRate.create(101)).toThrow();
    });
  });
});

// ImportViolation: scripts/harness/__tests__/unit/regression-suite/value-objects/import-violation.test.ts

target('ImportViolation', () => {

  // UT-RS-142
  describe("create: 有効なmodulePath・forbiddenPackage='@anthropic-ai/claude-code'・violationMessage=非空文字列", () => {
    it('正常に生成される', () => {
      const actual = createImportViolation();
      expect(actual.forbiddenPackage).toBe('@anthropic-ai/claude-code');
    });
  });

  // UT-RS-143
  describe("create: modulePath='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() => createImportViolation({ modulePath: '' })).toThrow();
    });
  });

  // UT-RS-144
  describe("create: forbiddenPackage='' の場合", () => {
    it('エラーをスロー', () => {
      expect(() => createImportViolation({ forbiddenPackage: '' })).toThrow();
    });
  });
});
```

---

### 3.12 RegressionRunner（ドメインサービス）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/services/regression-runner.test.ts`

```typescript
import { vi, beforeEach } from 'vitest';
import type { SuiteRegistryPort } from '../../../../regression-suite/domain/ports/suite-registry-port.js';
import type { TestRunnerPort } from '../../../../regression-suite/domain/ports/test-runner-port.js';
import type { ConfigQueryPort } from '../../../../regression-suite/domain/ports/config-query-port.js';
import type { CiGateResultWriterPort } from '../../../../regression-suite/domain/ports/ci-gate-result-writer-port.js';
import { RegressionRunner } from '../../../../regression-suite/domain/services/regression-runner.js';

target('RegressionRunner', () => {
  let suiteRegistryPort: SuiteRegistryPort;
  let testRunnerPort: TestRunnerPort;
  let configQueryPort: ConfigQueryPort;
  let ciGateResultWriterPort: CiGateResultWriterPort;
  let importGuardService: { verify: ReturnType<typeof vi.fn> };
  let runner: RegressionRunner;

  beforeEach(() => {
    suiteRegistryPort = { getDefinition: vi.fn() };
    testRunnerPort = { runSuite: vi.fn() };
    configQueryPort = { getCoverageThreshold: vi.fn().mockResolvedValue(90) };
    ciGateResultWriterPort = { write: vi.fn().mockResolvedValue(undefined) };
    importGuardService = { verify: vi.fn().mockResolvedValue([]) };
    runner = new RegressionRunner(suiteRegistryPort, testRunnerPort, configQueryPort, ciGateResultWriterPort, importGuardService);
  });

  // UT-RS-150
  describe("execute: k-requirementsスイートを実行してTestExecutionSummaryを返す場合", () => {
    context("suiteId='k-requirements'・CiGateConfig(threshold=90) を指定した場合", () => {
      it('SuiteRegistryPortとTestRunnerPortが各1回呼ばれる。TestExecutionSummaryが返される', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({ suiteId: createSuiteId('k-requirements') });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
          coverageRate: createCoverageRate(95), failures: [],
        });

        // Act
        const actual = await runner.execute(createSuiteId('k-requirements'), createCiGateConfig());

        // Assert
        expect(suiteRegistryPort.getDefinition).toHaveBeenCalledTimes(1);
        expect(testRunnerPort.runSuite).toHaveBeenCalledTimes(1);
        expect(actual.passedCount).toBe(1);
      });
    });
  });

  // UT-RS-151
  describe("execute: agent-independenceスイートではImportGuardServiceが呼ばれる場合", () => {
    context("suiteId='agent-independence' を指定した場合", () => {
      it('ImportGuardService.verify() が各AgentIndependenceTestに対して呼ばれる', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest();
        const definition = createRegressionSuiteDefinition({
          suiteId: createSuiteId('agent-independence'),
          testCases: [agentTest],
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);

        // Act
        await runner.execute(createSuiteId('agent-independence'), createCiGateConfig());

        // Assert
        expect(importGuardService.verify).toHaveBeenCalledTimes(1);
        expect(importGuardService.verify).toHaveBeenCalledWith(agentTest);
      });
    });
  });

  // UT-RS-152
  describe("execute: gng-gateスイートを実行してTestExecutionSummaryを返す場合", () => {
    context("suiteId='gng-gate' を指定した場合", () => {
      it('TestRunnerPortが呼ばれる。TestExecutionSummaryが返される', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition({
          suiteId: createSuiteId('gng-gate'),
          testCases: [createGngConditionTest()],
        });
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
          coverageRate: null, failures: [],
        });

        // Act
        const actual = await runner.execute(createSuiteId('gng-gate'), createCiGateConfig());

        // Assert
        expect(testRunnerPort.runSuite).toHaveBeenCalledTimes(1);
        expect(actual).not.toBeNull();
      });
    });
  });

  // UT-RS-153
  describe("execute: CiGateResultWriterPortに結果が書き出される場合", () => {
    context('任意のsuiteId・正常なTestExecutionSummary が返った場合', () => {
      it('CiGateResultWriterPort.write() が1回呼ばれる', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition();
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
          coverageRate: null, failures: [],
        });

        // Act
        await runner.execute(createSuiteId('k-requirements'), createCiGateConfig());

        // Assert
        expect(ciGateResultWriterPort.write).toHaveBeenCalledTimes(1);
      });
    });
  });

  // UT-RS-154
  describe("execute: CoverageRateがcoverageThresholdを下回る場合にno-goと判定する場合", () => {
    context('coverageRate=80・threshold=90 の場合', () => {
      it('isPassedGate=false のTestExecutionSummaryが返される', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition();
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockResolvedValue({
          passedCount: 1, failedCount: 0, skippedCount: 0, totalCount: 1,
          coverageRate: createCoverageRate(80), failures: [],
        });

        // Act
        const actual = await runner.execute(createSuiteId('k-requirements'), createCiGateConfig({ coverageThreshold: 90 }));

        // Assert
        expect(actual.isPassedGate(90)).toBe(false);
      });
    });
  });

  // UT-RS-155
  describe("execute: SuiteRegistryPortがnullを返したときSuiteDefinitionNotFoundErrorをスロー", () => {
    context('SuiteRegistryPort.getDefinition が null を返す場合', () => {
      it('SuiteDefinitionNotFoundError をスロー', async () => {
        // Arrange
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(null);

        // Act / Assert
        await expect(runner.execute(createSuiteId('k-requirements'), createCiGateConfig()))
          .rejects.toThrow('SuiteDefinitionNotFoundError');
      });
    });
  });

  // UT-RS-156
  describe("execute: TestRunnerPortが例外をスローしたときTestRunnerPortErrorを伝播する", () => {
    context('TestRunnerPort.runSuite が Error をスローする場合', () => {
      it('TestRunnerPortError をスロー', async () => {
        // Arrange
        const definition = createRegressionSuiteDefinition();
        vi.mocked(suiteRegistryPort.getDefinition).mockResolvedValue(definition);
        vi.mocked(testRunnerPort.runSuite).mockRejectedValue(new Error('runner error'));

        // Act / Assert
        await expect(runner.execute(createSuiteId('k-requirements'), createCiGateConfig()))
          .rejects.toThrow('TestRunnerPortError');
      });
    });
  });
});
```

---

### 3.13 MigrationAnalyzer（ドメインサービス）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/services/migration-analyzer.test.ts`

```typescript
import { vi, beforeEach } from 'vitest';
import type { V0SpecReaderPort } from '../../../../regression-suite/domain/ports/v0-spec-reader-port.js';
import type { MigrationMappingRepositoryPort } from '../../../../regression-suite/domain/ports/migration-mapping-repository-port.js';
import { MigrationAnalyzer } from '../../../../regression-suite/domain/services/migration-analyzer.js';

target('MigrationAnalyzer', () => {
  let v0SpecReaderPort: V0SpecReaderPort;
  let migrationMappingRepositoryPort: MigrationMappingRepositoryPort;
  let analyzer: MigrationAnalyzer;

  beforeEach(() => {
    v0SpecReaderPort = { readAll: vi.fn() };
    migrationMappingRepositoryPort = { save: vi.fn(), findAll: vi.fn(), findById: vi.fn() };
    analyzer = new MigrationAnalyzer(v0SpecReaderPort, migrationMappingRepositoryPort);
  });

  // UT-RS-160
  describe('analyzeAll: V0SpecReaderPortから全V0TestIdを読み取り分析する場合', () => {
    context('V0SpecReaderPort が V0TestId[] 3件を返す場合', () => {
      it('3件のV0TestMigrationが返される', async () => {
        // Arrange
        const ids = [createV0TestId('scripts/__tests__/a.test.ts'), createV0TestId('scripts/__tests__/b.test.ts'), createV0TestId('scripts/__tests__/c.test.ts')];
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await analyzer.analyzeAll();

        // Assert
        expect(actual).toHaveLength(3);
      });
    });
  });

  // UT-RS-161
  describe("analyzeAll: v1スコープ外のテストは skip('out-of-scope') に遷移する場合", () => {
    context('分析対象がv1スコープ外と判定された場合', () => {
      it("V0TestMigration の migrationStatus が 'skipped' であること", async () => {
        // Arrange
        const outOfScopeId = createV0TestId('scripts/__tests__/out-of-scope.test.ts');
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([outOfScopeId]);
        // analyzer はスコープ外判定ロジックを持つ。テストではスコープ外ファイルパターンを注入するか
        // テスト専用設定で全件スコープ外と判定させる
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await analyzer.analyzeAll({ outOfScopePattern: ['out-of-scope'] });

        // Assert
        expect(actual[0].migrationStatus).toBe('skipped');
        expect(actual[0].skipReason).toBe('out-of-scope');
      });
    });
  });

  // UT-RS-162
  describe("analyzeAll: オーケストレーション移管済みは skip('orchestration-migrated') に遷移する場合", () => {
    context('分析対象がオーケストレーション移管済みと判定された場合', () => {
      it("V0TestMigration の migrationStatus が 'skipped'・skipReason='orchestration-migrated' であること", async () => {
        // Arrange
        const orchId = createV0TestId('scripts/__tests__/orchestration.test.ts');
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([orchId]);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await analyzer.analyzeAll({ orchestrationPattern: ['orchestration'] });

        // Assert
        expect(actual[0].migrationStatus).toBe('skipped');
        expect(actual[0].skipReason).toBe('orchestration-migrated');
      });
    });
  });

  // UT-RS-163
  describe('analyzeAll: Biome修正不要なテストは migrate(v1TestPath) に遷移する場合', () => {
    context('分析対象がBiome修正不要と判定された場合', () => {
      it("V0TestMigration の migrationStatus が 'migrated' であること", async () => {
        // Arrange
        const normalId = createV0TestId('scripts/__tests__/unit/normal.test.ts');
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([normalId]);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await analyzer.analyzeAll({ biomeModificationRequired: false });

        // Assert
        expect(actual[0].migrationStatus).toBe('migrated');
        expect(actual[0].v1TestPath).not.toBeNull();
      });
    });
  });

  // UT-RS-164
  describe('analyzeAll: Biome修正必要なテストは migrateWithModification() に遷移する場合', () => {
    context('分析対象がBiome修正必要と判定された場合', () => {
      it("BiomeModificationSpecが生成されV0TestMigrationのmigrationStatusが 'modified' であること", async () => {
        // Arrange
        const biomeId = createV0TestId('scripts/__tests__/unit/eslint-api.test.ts');
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([biomeId]);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        const actual = await analyzer.analyzeAll({ biomeModificationRequired: true });

        // Assert
        expect(actual[0].migrationStatus).toBe('modified');
        expect(actual[0].biomeModificationSpec).not.toBeNull();
      });
    });
  });

  // UT-RS-165
  describe('analyzeAll: 全件をMigrationMappingRepositoryPortに保存する場合', () => {
    context('3件の分析対象がある場合', () => {
      it('MigrationMappingRepositoryPort.save() が3回呼ばれる', async () => {
        // Arrange
        const ids = [
          createV0TestId('scripts/__tests__/a.test.ts'),
          createV0TestId('scripts/__tests__/b.test.ts'),
          createV0TestId('scripts/__tests__/c.test.ts'),
        ];
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue(ids);
        vi.mocked(migrationMappingRepositoryPort.save).mockResolvedValue(undefined);

        // Act
        await analyzer.analyzeAll();

        // Assert
        expect(migrationMappingRepositoryPort.save).toHaveBeenCalledTimes(3);
      });
    });
  });

  // UT-RS-166
  describe('analyzeAll: V0SpecReaderPortが失敗したときV0SpecReadErrorをスロー', () => {
    context('V0SpecReaderPort.readAll() が例外をスローする場合', () => {
      it('V0SpecReadError をスロー', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockRejectedValue(new Error('read error'));

        // Act / Assert
        await expect(analyzer.analyzeAll()).rejects.toThrow('V0SpecReadError');
      });
    });
  });

  // UT-RS-167
  describe('analyzeAll: MigrationMappingRepositoryPortが失敗したときMigrationPersistenceErrorをスロー', () => {
    context('MigrationMappingRepositoryPort.save() が例外をスローする場合', () => {
      it('MigrationPersistenceError をスロー', async () => {
        // Arrange
        vi.mocked(v0SpecReaderPort.readAll).mockResolvedValue([createV0TestId()]);
        vi.mocked(migrationMappingRepositoryPort.save).mockRejectedValue(new Error('persist error'));

        // Act / Assert
        await expect(analyzer.analyzeAll()).rejects.toThrow('MigrationPersistenceError');
      });
    });
  });
});
```

---

### 3.14 ImportGuardService（ドメインサービス）

**テストファイル**: `scripts/harness/__tests__/unit/regression-suite/services/import-guard-service.test.ts`

```typescript
import { vi, beforeEach } from 'vitest';
import type { ImportAnalyzerPort } from '../../../../regression-suite/domain/ports/import-analyzer-port.js';
import { ImportGuardService } from '../../../../regression-suite/domain/services/import-guard-service.js';

target('ImportGuardService', () => {
  let importAnalyzerPort: ImportAnalyzerPort;
  let service: ImportGuardService;

  beforeEach(() => {
    importAnalyzerPort = { analyzeImports: vi.fn() };
    service = new ImportGuardService(importAnalyzerPort);
  });

  // UT-RS-172
  describe('verify: 禁止パターンに一致しないimportは空配列を返す場合', () => {
    context("forbiddenPatterns=['@anthropic-ai/claude-code']・ImportAnalyzerPortがimportなしを返す場合", () => {
      it('ImportViolation[] = [] を返す', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest();
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue([]);

        // Act
        const actual = await service.verify(agentTest);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // UT-RS-173
  describe("verify: 禁止パターンに一致するimportはImportViolationとして返す場合", () => {
    context("ImportAnalyzerPortが '@anthropic-ai/claude-code' のimportを検出する場合", () => {
      it('ImportViolation 1件が返される', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest();
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code']);

        // Act
        const actual = await service.verify(agentTest);

        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].forbiddenPackage).toBe('@anthropic-ai/claude-code');
      });
    });
  });

  // UT-RS-174
  describe('verify: allowedPathsに含まれるパスの禁止パターン一致はスキップする場合', () => {
    context("targetModule が allowedPaths に含まれるAdapter層パスで・禁止パターンに一致するimportがある場合", () => {
      it('ImportViolation[] = [] を返す（Adapter層の例外的許容）', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest({
          targetModule: 'scripts/harness/regression-suite/infrastructure/adapters/biome-ast-import-analyzer-adapter.ts',
          forbiddenPatterns: ['@anthropic-ai/claude-code'],
          allowedPaths: ['infrastructure/adapters/'],
        });
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code']);

        // Act
        const actual = await service.verify(agentTest);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });

  // UT-RS-175
  describe('verify: allowedPathsに含まれないパスの禁止パターン一致は違反として報告する場合', () => {
    context("targetModule が allowedPaths に含まれないdomain層パスで・禁止パターンに一致するimportがある場合", () => {
      it('ImportViolation 1件が返される', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest({
          targetModule: 'scripts/harness/regression-suite/domain/services/regression-runner.ts',
          forbiddenPatterns: ['@anthropic-ai/claude-code'],
          allowedPaths: ['infrastructure/adapters/'],
        });
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code']);

        // Act
        const actual = await service.verify(agentTest);

        // Assert
        expect(actual).toHaveLength(1);
      });
    });
  });

  // UT-RS-176
  describe('verify: 複数の禁止パターンがある場合はすべて検出する場合', () => {
    context("forbiddenPatterns=['@anthropic-ai/claude-code', 'claude-sdk']・両方のimportを検出する場合", () => {
      it('ImportViolation 2件が返される', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest({
          forbiddenPatterns: ['@anthropic-ai/claude-code', 'claude-sdk'],
        });
        vi.mocked(importAnalyzerPort.analyzeImports).mockResolvedValue(['@anthropic-ai/claude-code', 'claude-sdk']);

        // Act
        const actual = await service.verify(agentTest);

        // Assert
        expect(actual).toHaveLength(2);
      });
    });
  });

  // UT-RS-177
  describe('verify: ImportAnalyzerPortが失敗したときImportAnalysisPortErrorをスロー', () => {
    context('ImportAnalyzerPort.analyzeImports() が例外をスローする場合', () => {
      it('ImportAnalysisPortError をスロー', async () => {
        // Arrange
        const agentTest = createAgentIndependenceTest();
        vi.mocked(importAnalyzerPort.analyzeImports).mockRejectedValue(new Error('analysis error'));

        // Act / Assert
        await expect(service.verify(agentTest)).rejects.toThrow('ImportAnalysisPortError');
      });
    });
  });
});
```
