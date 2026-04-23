// @unit biome-ast-engine
// @layer test
// @story ISSUE-014

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.ts';
import { createBiomeAstEngineModule } from '../../../biome-ast-engine/composition-root.ts';
import type { ArchitectureConfigInput } from '../../../biome-ast-engine/infrastructure/adapters/harness-config-provider-adapter.ts';
import type { LintReport } from '../../../biome-ast-engine/domain/value-objects/lint-report.ts';

let tmpDirs: string[] = [];

const createTmpDir = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `phasegate-dogfood-${prefix}-`));
  tmpDirs.push(dir);
  return dir;
};

const writeFixture = (rootDir: string, relPath: string, content: string): void => {
  const absPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
};

const layerViolations = (
  report: LintReport
): ReadonlyArray<{ filePath: string; message: string }> =>
  report.violations
    .filter((v) => v.ruleName.toString() === 'no-layer-violation')
    .map((v) => ({ filePath: v.filePath.toString(), message: v.message }));

const runLint = async (rootDir: string, architecture: ArchitectureConfigInput) => {
  const module = createBiomeAstEngineModule(rootDir, {
    l1Config: { enabled: true, rules: {} },
    architecture,
  });
  return await module.executeLintUseCase.execute({
    targets: ['src'],
    includeBiomeNative: false,
  });
};

const ONION_ARCH: ArchitectureConfigInput = Object.freeze({
  preset: 'onion',
  layers: Object.freeze(['domain', 'application', 'interface']),
  allowedDependencies: Object.freeze({
    domain: Object.freeze(['domain']),
    application: Object.freeze(['application', 'domain']),
    interface: Object.freeze(['interface', 'application', 'domain']),
  }),
});

const HEXAGONAL_ARCH: ArchitectureConfigInput = Object.freeze({
  preset: 'hexagonal',
  layers: Object.freeze(['core', 'ports', 'adapters']),
  allowedDependencies: Object.freeze({
    core: Object.freeze(['core']),
    ports: Object.freeze(['ports', 'core']),
    adapters: Object.freeze(['adapters', 'ports', 'core']),
  }),
});

const LAYERED_ARCH: ArchitectureConfigInput = Object.freeze({
  preset: 'layered',
  layers: Object.freeze(['presentation', 'business', 'data']),
  allowedDependencies: Object.freeze({
    presentation: Object.freeze(['presentation', 'business', 'data']),
    business: Object.freeze(['business', 'data']),
    data: Object.freeze(['data']),
  }),
});

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

target('preset dogfood — onion architecture', () => {
  describe('onion preset (domain / application / interface) を設定した場合', () => {
    context('interface → domain の import が行われた場合', () => {
      it('allowedDependencies に従い no-layer-violation が発生しない', async () => {
        // Arrange
        const rootDir = createTmpDir('onion-ok');
        writeFixture(
          rootDir,
          'src/domain/entity.ts',
          '// @unit sample\n// @layer domain\nexport const Value = 1;\n'
        );
        writeFixture(
          rootDir,
          'src/interface/controller.ts',
          "// @unit sample\n// @layer interface\nimport { Value } from '../domain/entity.js';\nexport const used = Value;\n"
        );

        // Act
        const actual = await runLint(rootDir, ONION_ARCH);

        // Assert
        expect(layerViolations(actual.report)).toHaveLength(0);
      });
    });

    context('domain → interface の import が行われた場合', () => {
      it('onion の依存方向違反として no-layer-violation が検出される', async () => {
        // Arrange
        const rootDir = createTmpDir('onion-bad');
        writeFixture(
          rootDir,
          'src/interface/controller.ts',
          '// @unit sample\n// @layer interface\nexport const ControllerFn = () => 1;\n'
        );
        writeFixture(
          rootDir,
          'src/domain/entity.ts',
          "// @unit sample\n// @layer domain\nimport { ControllerFn } from '../interface/controller.js';\nexport const Value = ControllerFn();\n"
        );

        // Act
        const actual = await runLint(rootDir, ONION_ARCH);

        // Assert
        const violations = layerViolations(actual.report);
        expect(violations.length).toBeGreaterThanOrEqual(1);
        expect(violations[0].filePath).toBe('src/domain/entity.ts');
        expect(violations[0].message).toContain('src/domain/entity.ts -> src/interface/controller.ts');
      });
    });
  });
});

target('preset dogfood — hexagonal architecture', () => {
  describe('hexagonal preset (core / ports / adapters) を設定した場合', () => {
    context('adapters → core の import が行われた場合', () => {
      it('allowedDependencies に従い no-layer-violation が発生しない', async () => {
        // Arrange
        const rootDir = createTmpDir('hex-ok');
        writeFixture(
          rootDir,
          'src/core/entity.ts',
          '// @unit sample\n// @layer core\nexport const Entity = 1;\n'
        );
        writeFixture(
          rootDir,
          'src/adapters/driving.ts',
          "// @unit sample\n// @layer adapters\nimport { Entity } from '../core/entity.js';\nexport const used = Entity;\n"
        );

        // Act
        const actual = await runLint(rootDir, HEXAGONAL_ARCH);

        // Assert
        expect(layerViolations(actual.report)).toHaveLength(0);
      });
    });

    context('core → adapters の import が行われた場合', () => {
      it('hexagonal の依存方向違反として no-layer-violation が検出される', async () => {
        // Arrange
        const rootDir = createTmpDir('hex-bad');
        writeFixture(
          rootDir,
          'src/adapters/driving.ts',
          '// @unit sample\n// @layer adapters\nexport const AdapterFn = () => 1;\n'
        );
        writeFixture(
          rootDir,
          'src/core/entity.ts',
          "// @unit sample\n// @layer core\nimport { AdapterFn } from '../adapters/driving.js';\nexport const Entity = AdapterFn();\n"
        );

        // Act
        const actual = await runLint(rootDir, HEXAGONAL_ARCH);

        // Assert
        const violations = layerViolations(actual.report);
        expect(violations.length).toBeGreaterThanOrEqual(1);
        expect(violations[0].filePath).toBe('src/core/entity.ts');
        expect(violations[0].message).toContain('src/core/entity.ts -> src/adapters/driving.ts');
      });
    });
  });
});

target('preset dogfood — layered architecture', () => {
  describe('layered preset (presentation / business / data) を設定した場合', () => {
    context('presentation → business → data の import が行われた場合', () => {
      it('allowedDependencies に従い no-layer-violation が発生しない', async () => {
        // Arrange
        const rootDir = createTmpDir('layered-ok');
        writeFixture(
          rootDir,
          'src/data/repository.ts',
          '// @unit sample\n// @layer data\nexport const Record = 1;\n'
        );
        writeFixture(
          rootDir,
          'src/business/service.ts',
          "// @unit sample\n// @layer business\nimport { Record } from '../data/repository.js';\nexport const process = Record;\n"
        );
        writeFixture(
          rootDir,
          'src/presentation/controller.ts',
          "// @unit sample\n// @layer presentation\nimport { process } from '../business/service.js';\nexport const handle = process;\n"
        );

        // Act
        const actual = await runLint(rootDir, LAYERED_ARCH);

        // Assert
        expect(layerViolations(actual.report)).toHaveLength(0);
      });
    });

    context('data → presentation の import が行われた場合', () => {
      it('layered の依存方向違反として no-layer-violation が検出される', async () => {
        // Arrange
        const rootDir = createTmpDir('layered-bad');
        writeFixture(
          rootDir,
          'src/presentation/controller.ts',
          '// @unit sample\n// @layer presentation\nexport const handle = () => 1;\n'
        );
        writeFixture(
          rootDir,
          'src/data/repository.ts',
          "// @unit sample\n// @layer data\nimport { handle } from '../presentation/controller.js';\nexport const Record = handle();\n"
        );

        // Act
        const actual = await runLint(rootDir, LAYERED_ARCH);

        // Assert
        const violations = layerViolations(actual.report);
        expect(violations.length).toBeGreaterThanOrEqual(1);
        expect(violations[0].filePath).toBe('src/data/repository.ts');
        expect(violations[0].message).toContain('src/data/repository.ts -> src/presentation/controller.ts');
      });
    });
  });
});
