/**
 * @layer test
 * @unit validator-system
 * @story H08-01
 * @work-item-id WI-110
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { RunL1ValidatorsUseCase } from '../../../../validator-system/application/use-cases/run-l1-validators-usecase.js';
import { ValidationResultContractMapper } from '../../../../validator-system/application/mappers/validation-result-contract-mapper.js';
import type { ItTestFileAnalyzerPort, ItTestMockCall } from '../../../../validator-system/domain/ports/it-test-file-analyzer-port.js';
import type { SourceFileTextScannerPort, TextScanMatch } from '../../../../validator-system/domain/ports/source-file-text-scanner-port.js';

function makeItAnalyzerPort(calls: ItTestMockCall[]): ItTestFileAnalyzerPort {
  return { findMockCallsInItTests: async () => calls };
}
function makeScannerPort(matches: TextScanMatch[]): SourceFileTextScannerPort {
  return { scanForPattern: async () => matches };
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

  describe('L1/L2境界', () => {
    it('L1実行結果にL2-* validatorが混入しないこと', async () => {
      // Arrange
      const sut = new RunL1ValidatorsUseCase({
        itTestFileAnalyzerPort: makeItAnalyzerPort([]),
        sourceFileTextScannerPort: makeScannerPort([]),
        contractMapper: new ValidationResultContractMapper(),
      });
      // Act
      const actual = await sut.execute({ targetPaths: [] });
      // Assert
      expect(actual.some((r) => r.validatorId.startsWith('L2-'))).toBe(false);
    });
  });

});

// @story-id H08-07
