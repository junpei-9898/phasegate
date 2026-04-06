// @layer test
import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { createFilePathPointer, createUrlPointer } from '../../../helpers/phase2-extensions-test-factories.js';
import { PointerResolutionService } from '../../../../phase2-extensions/domain/services/pointer-resolution-service.js';

target('UT-P2-009 PointerResolutionService', () => {
  let resolverPort: { resolve: ReturnType<typeof vi.fn> };
  let service: PointerResolutionService;

  beforeEach(() => {
    resolverPort = { resolve: vi.fn() };
    service = new PointerResolutionService(resolverPort);
  });

  context('resolve(pointers)', () => {
    it('実在するfile-pathポインタに対して isResolvable=true の結果が返る', async () => {
      // Arrange
      resolverPort.resolve.mockResolvedValue(true);
      const pointers = [createFilePathPointer({ target: 'docs/design.md' })];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual[0].isResolvable).toBe(true);
    });

    it('存在しないfile-pathポインタに対して isResolvable=false の結果が返る', async () => {
      // Arrange
      resolverPort.resolve.mockResolvedValue(false);
      const pointers = [createFilePathPointer({ target: 'docs/missing.md' })];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual[0].isResolvable).toBe(false);
    });

    it('URLポインタは PointerResolverPort を呼び出さず isResolvable=true を返す', async () => {
      // Arrange
      const pointers = [createUrlPointer()];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual[0].isResolvable).toBe(true);
      expect(resolverPort.resolve).not.toHaveBeenCalled();
    });
  });
});
