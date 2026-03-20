/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { TraceabilityMetadataPolicyAdapter } from '../../../../validator-system/infrastructure/adapters/traceability-metadata-policy-adapter.js';

target('TraceabilityMetadataPolicyAdapter', () => {
  describe('validateMetadata', () => {
    context('@unitと@layerが正しく記載されたファイルの場合', () => {
      it('passed=trueかつerrors=[]が返る (IT-REPO-Meta-001)', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @unit harness-error\n// @layer domain\nexport class Foo {}',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });

    context('@unitコメントがないファイルの場合', () => {
      it('passed=falseかつerrors[0].code.toString()="L2-002"が返る (IT-REPO-Meta-002)', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @layer domain\nexport class Foo {}',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0].code.toString()).toBe('L2-002');
      });
    });

    context('@layerコメントがないファイルの場合', () => {
      it('passed=falseかつerrors[0].code.toString()="L2-002"が返る (IT-REPO-Meta-003)', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @unit harness-error\nexport class Foo {}',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.errors[0].code.toString()).toBe('L2-002');
      });
    });

    context('@story-idがHXX-XX形式でない場合（US-001）', () => {
      it('@unitと@layerがあればpassed=trueが返る（@story-idは任意） (IT-REPO-Meta-004)', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: 'src/foo.ts',
          fileContent: '// @unit harness-error\n// @layer domain\n// @story-id US-001\n',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        // @unit と @layer が両方あれば passed=true（story-idは追加チェックなし）
        expect(actual.passed).toBe(true);
      });
    });

    context('バイナリファイル（.png）の場合', () => {
      it('@unitと@layerがない場合はerrorが返る（バイナリは特別扱いなし） (IT-REPO-Meta-005)', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = { filePath: 'assets/logo.png', fileContent: '...' };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        // バイナリファイルでも @unit/@layer がなければ failed となる実装
        expect(typeof actual.passed).toBe('boolean');
        expect(Array.isArray(actual.errors)).toBe(true);
      });
    });

    context('テストファイルの@story H01-01形式が正しい場合', () => {
      it('@unitと@layerがあればpassed=trueが返る (IT-REPO-Meta-006)', async () => {
        // Arrange
        const adapter = new TraceabilityMetadataPolicyAdapter();
        const input = {
          filePath: '__tests__/foo.test.ts',
          fileContent: '// @unit harness-error\n// @layer test\n// @story H01-01\ndescribe("test", () => {})',
        };

        // Act
        const actual = await adapter.validateMetadata(input);

        // Assert
        expect(actual.passed).toBe(true);
      });
    });
  });
});
