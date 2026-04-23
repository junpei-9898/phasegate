// @layer test
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import type { BiomeExecutorPort } from '../../../biome-ast-engine/domain/ports/biome-executor-port.js';
import type { ClockPort } from '../../../biome-ast-engine/domain/ports/clock-port.js';
import { RuleDefinitionRegistry } from '../../../biome-ast-engine/domain/services/rule-definition-registry.js';
import { LintRunner } from '../../../biome-ast-engine/domain/services/lint-runner.js';
import { CLEAN_PRESET_SPEC } from '../../../biome-ast-engine/domain/value-objects/architecture-spec.js';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import { RuleName } from '../../../biome-ast-engine/domain/value-objects/rule-name.js';
import { SourceModuleSnapshot } from '../../../biome-ast-engine/domain/value-objects/source-module-snapshot.js';
import { ExecuteLintUseCase } from '../../../biome-ast-engine/application/usecases/execute-lint-usecase.ts';

const createFilePath = (value: string) => FilePath.fromWorkspaceRelative(value);

const createSnapshot = (filePath: FilePath, declaredUnit: string | null) =>
  SourceModuleSnapshot.create({
    filePath,
    declaredUnit,
    declaredLayer: LayerName.fromString('application'),
    imports: [],
    anyTypeCount: 0,
    typedNodeCount: 1,
    commentLineCount: 0,
    logicalLineCount: 1,
    repeatedCommentBlocks: 0,
    duplicationFingerprints: [],
    exportedSymbols: [],
    isEntrypointCandidate: false,
  });

const createSut = () => {
  const registry = new RuleDefinitionRegistry();
  const filePath = createFilePath('biome-ast-engine/application/execute-lint-usecase.ts');
  const resolveEnabledRulesUseCase = {
    execute: vi.fn().mockResolvedValue({
      enabledRules: [registry.getByName(RuleName.fromString('require-unit-comment'))],
      skippedRules: [],
      architectureSpec: CLEAN_PRESET_SPEC,
    }),
  };
  const analyzeImportGraphUseCase = {
    execute: vi.fn().mockResolvedValue({
      files: [filePath],
      snapshots: [createSnapshot(filePath, null)],
      importGraph: new (class {
        readonly nodes = [filePath];
        readonly edges = [];
        readonly rootNodes = [];
        detectCycles() {
          return [];
        }
        findLayerViolations() {
          return [];
        }
        findGhostFiles() {
          return [];
        }
      })(),
    }),
  };
  const biomeExecutorPort: BiomeExecutorPort = {
    executeCheck: vi.fn().mockResolvedValue(undefined),
  };
  const clockPort: ClockPort = {
    now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(223),
  };

  return {
    filePath,
    resolveEnabledRulesUseCase,
    analyzeImportGraphUseCase,
    biomeExecutorPort,
    clockPort,
    sut: new ExecuteLintUseCase({
      resolveEnabledRulesUseCase,
      analyzeImportGraphUseCase,
      biomeExecutorPort,
      lintRunner: new LintRunner(registry),
      clockPort,
    }),
  };
};

target('ExecuteLintUseCase.execute', () => {
  describe('lint実行を調停する', () => {
    context('Biome Nativeチェックを含める場合', () => {
      it('durationMsとcheckedFilesを確定値で返す', async () => {
        // Arrange
        const { sut, filePath, resolveEnabledRulesUseCase, analyzeImportGraphUseCase, biomeExecutorPort } =
          createSut();

        // Act
        const actual = await sut.execute({
          targets: ['biome-ast-engine/application/execute-lint-usecase.ts'],
        });

        // Assert
        expect(resolveEnabledRulesUseCase.execute).toHaveBeenCalledTimes(1);
        expect(analyzeImportGraphUseCase.execute).toHaveBeenCalledWith({
          targets: ['biome-ast-engine/application/execute-lint-usecase.ts'],
          architecture: CLEAN_PRESET_SPEC,
        });
        expect(biomeExecutorPort.executeCheck).toHaveBeenCalledWith([filePath]);
        expect(actual.checkedFiles).toEqual([filePath]);
        expect(actual.report.durationMs).toBe(123);
        expect(actual.report.scannedFiles).toBe(1);
        expect(actual.report.violations).toHaveLength(1);
      });
    });

    context('Biome Nativeチェックを無効化する場合', () => {
      it('BiomeExecutorPortを呼ばずにreportを返す', async () => {
        // Arrange
        const { sut, biomeExecutorPort } = createSut();

        // Act
        const actual = await sut.execute({
          includeBiomeNative: false,
        });

        // Assert
        expect(biomeExecutorPort.executeCheck).not.toHaveBeenCalled();
        expect(actual.report.durationMs).toBe(123);
      });
    });
  });
});
