/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { AdrFoundationReferenceAdapter } from '../../../../validator-system/infrastructure/adapters/adr-foundation-reference-adapter.js';

target('AdrFoundationReferenceAdapter', () => {
  describe('exists', () => {
    context('ADR参照を渡した場合', () => {
      it('booleanが返る (IT-REPO-AdrRef-001)', async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.exists('ADR-001');

        // Assert
        expect(typeof actual).toBe('boolean');
      });
    });

    context('存在しないADR参照を渡した場合', () => {
      it('falseが返る (IT-REPO-AdrRef-002)', async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.exists('ADR-999');

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('getMetadata', () => {
    context('ADR参照を渡した場合', () => {
      it('存在しないADRならnullが返る (IT-REPO-AdrRef-003)', async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.getMetadata('ADR-999');

        // Assert
        expect(actual).toBeNull();
      });
    });

    context('存在しないADR参照を渡した場合', () => {
      it('nullが返る (IT-REPO-AdrRef-004)', async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter();

        // Act
        const actual = await adapter.getMetadata('ADR-999');

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
