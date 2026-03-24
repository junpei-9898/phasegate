/**
 * @layer test
 * @unit validator-system
 * @story H08-07, H08-08, H08-09
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL1ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l1-validators-usecase.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import type { ItTestFileAnalyzerPort, ItTestMockCall } from '../../../../validator-system/domain/ports/it-test-file-analyzer-port.js';
import type { SourceFileTextScannerPort, TextScanMatch } from '../../../../validator-system/domain/ports/source-file-text-scanner-port.js';
import type { CliCommandRegistryPort } from '../../../../validator-system/domain/ports/cli-command-registry-port.js';
import type { E2eTestFileRegistryPort } from '../../../../validator-system/domain/ports/e2e-test-file-registry-port.js';

function makeItAnalyzerPort(calls: ItTestMockCall[]): ItTestFileAnalyzerPort {
  return { findMockCallsInItTests: async () => calls };
}
function makeScannerPort(matches: TextScanMatch[]): SourceFileTextScannerPort {
  return { scanForPattern: async () => matches };
}
function makeCliPort(commands: string[]): CliCommandRegistryPort {
  return { getRegisteredCommands: async () => commands };
}
function makeE2ePort(files: string[]): E2eTestFileRegistryPort {
  return { getE2eTestFiles: async () => files };
}

target('RunL1ValidatorsUseCase', () => {

  describe('L1-017: ITテスト内部モック検出', () => {

    context('内部モックを含むITテストファイルがある場合', () => {
      it('L1-017エラーを返すこと (IT-VS-UC-L1-01)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([{ filePath: 'it.test.ts', mockedModule: './service' }]),
          sourceFileTextScannerPort: makeScannerPort([]),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l1017 = actual.find((r) => r.validatorId === 'L1-017');
        expect(l1017?.passed).toBe(false);
        expect(l1017?.errors).toHaveLength(1);
      });
    });

    context('外部モジュールのみmockしている場合', () => {
      it('L1-017がpassを返すこと (IT-VS-UC-L1-02)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([{ filePath: 'it.test.ts', mockedModule: 'node:fs' }]),
          sourceFileTextScannerPort: makeScannerPort([]),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l1017 = actual.find((r) => r.validatorId === 'L1-017');
        expect(l1017?.passed).toBe(true);
      });
    });

  });

  describe('L1-018: スタブコメント残存検出', () => {

    context('スタブコメントを含むファイルがある場合', () => {
      it('L1-018エラーを返すこと (IT-VS-UC-L1-03)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([]),
          sourceFileTextScannerPort: makeScannerPort([
            { filePath: 'adapter.ts', lineNumber: 5, lineContent: '// stub実装: TODO' },
          ]),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l1018 = actual.find((r) => r.validatorId === 'L1-018');
        expect(l1018?.passed).toBe(false);
      });
    });

    context('スタブコメントがない場合', () => {
      it('L1-018がpassを返すこと (IT-VS-UC-L1-04)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([]),
          sourceFileTextScannerPort: makeScannerPort([]),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l1018 = actual.find((r) => r.validatorId === 'L1-018');
        expect(l1018?.passed).toBe(true);
      });
    });

  });

  describe('L2-013: CLIコマンドE2Eテスト存在チェック', () => {

    context('cliCommandRegistryPortとe2eTestFileRegistryPortが未注入の場合', () => {
      it('L2-013がskippedを返すこと (IT-VS-UC-L1-05)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([]),
          sourceFileTextScannerPort: makeScannerPort([]),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l2013 = actual.find((r) => r.validatorId === 'L2-013');
        expect(l2013?.skipped).toBe(true);
      });
    });

    context('E2Eテストが存在しないコマンドがある場合', () => {
      it('L2-013エラーを返すこと (IT-VS-UC-L1-06)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([]),
          sourceFileTextScannerPort: makeScannerPort([]),
          cliCommandRegistryPort: makeCliPort(['ci:check', 'lint']),
          e2eTestFileRegistryPort: makeE2ePort([]),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l2013 = actual.find((r) => r.validatorId === 'L2-013');
        expect(l2013?.passed).toBe(false);
      });
    });

    context('全コマンドにE2Eテストがある場合', () => {
      it('L2-013がpassを返すこと (IT-VS-UC-L1-07)', async () => {
        // Arrange
        const sut = new RunL1ValidatorsUseCase({
          itTestFileAnalyzerPort: makeItAnalyzerPort([]),
          sourceFileTextScannerPort: makeScannerPort([]),
          cliCommandRegistryPort: makeCliPort(['ci:check']),
          e2eTestFileRegistryPort: makeE2ePort(['/e2e/cli.test.ts ci:check']),
          contractMapper: new ValidationResultContractMapper(),
        });
        // Act
        const actual = await sut.execute({ targetPaths: [] });
        // Assert
        const l2013 = actual.find((r) => r.validatorId === 'L2-013');
        expect(l2013?.passed).toBe(true);
      });
    });

  });

});

// @story-id H08-07