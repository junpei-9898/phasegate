/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-118
 */
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ConsistencyCheckService } from '../../../validator-system/domain/services/l4/consistency-check-service.js';

const createMockDesignDocumentPort = (layerAnnotations: Record<string, string> = { 'domain_model.md#layer:domain': 'layer:known', 'logical_design.md#layer:application': 'layer:known' }) => ({
  getLayerAnnotations: vi.fn().mockResolvedValue(layerAnnotations),
});

const createMockAdrReferencePort = (existingRefs: string[] = ['ADR-001']) => ({
  exists: vi.fn().mockImplementation(async (ref: string) => existingRefs.includes(ref)),
});

target('ConsistencyCheckService', () => {

  describe('check() — ConsistencyReport生成', () => {

    it('設計文書間でレイヤー記述が一致する場合mismatchPairs: []のConsistencyReportが返ること (UT-CCS-001)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort({ 'domain_model.md#layer:domain': 'layer:known', 'logical_design.md#layer:application': 'layer:known' });
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.hasMismatches()).toBe(false);
    });

    it('設計文書で未知のレイヤー語彙がある場合mismatchPairsに不整合ペアが含まれるConsistencyReportが返ること (UT-CCS-002)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort({ 'domain_model.md#layer:adapter': 'layer:unknown' });
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.hasMismatches()).toBe(true);
    });

    it('ADRへの参照が実在しない場合不整合として検出されること (UT-CCS-003)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort({ 'ADR-999': 'L2' });
      const adrPort = createMockAdrReferencePort([]);
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.hasMismatches()).toBe(true);
    });

    it('Unit 名不一致を location / expected / actual 付きで検出すること (UT-CCS-006)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort({ 'domain_model.md#unit:wrong-unit': 'unit:mismatch:validator-system' });
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      const actual = await sut.check();
      // Assert
      expect(actual.mismatchPairs[0]).toMatchObject({
        location: 'domain_model.md#unit:wrong-unit',
        expected: 'validator-system',
        actual: 'wrong-unit',
      });
    });
  });

  describe('check() — ポートインタラクション', () => {

    it('check()呼び出しでDesignDocumentPortとAdrReferencePortが両方呼び出されること (UT-CCS-004)', async () => {
      // Arrange
      const designPort = createMockDesignDocumentPort();
      const adrPort = createMockAdrReferencePort();
      const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
      // Act
      await sut.check();
      // Assert
      expect(designPort.getLayerAnnotations).toHaveBeenCalled();
    });

    context('DesignDocumentPortがエラーをthrowする場合', () => {
      it('適切なエラーが伝播すること (UT-CCS-005)', async () => {
        // Arrange
        const designPort = {
          getLayerAnnotations: vi.fn().mockRejectedValue(new Error('Port error')),
        };
        const adrPort = createMockAdrReferencePort();
        const sut = new ConsistencyCheckService({ designDocumentPort: designPort, adrReferencePort: adrPort });
        // Act
        const actual = sut.check();
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
