// @layer test
// @unit config-foundation
// @story ISSUE-014
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ArchitectureResolutionService } from '../../../config-foundation/domain/services/architecture-resolution-service.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

target('ArchitectureResolutionService.resolve', () => {
  describe('preset 未指定の場合に clean を既定適用する', () => {
    context('source が undefined の場合', () => {
      it('clean preset の layers / allowedDependencies / 既定 metadataTags / 既定 layerDetection を返す', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve(undefined);

        // Assert
        expect(actual.document.preset).toBe('clean');
        expect(actual.document.layers).toEqual([
          'domain',
          'application',
          'infrastructure',
          'presentation',
        ]);
        expect(actual.document.allowedDependencies.presentation).toEqual([
          'presentation',
          'application',
          'domain',
        ]);
        expect(actual.document.metadataTags).toEqual({ layer: '@layer', unit: '@unit' });
        expect(actual.document.layerDetection).toEqual({ byPath: true, byTag: true });
        expect(actual.warnings).toEqual([]);
      });
    });
  });

  describe('7 種の preset を正しく展開する', () => {
    context('strict-ddd preset', () => {
      it('presentation → domain 禁止の厳格行列を返す', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({ preset: 'strict-ddd' });

        // Assert
        expect(actual.document.allowedDependencies.presentation).toEqual([
          'presentation',
          'application',
        ]);
      });
    });

    context('onion preset', () => {
      it('3 層(domain/application/interface)が返される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({ preset: 'onion' });

        // Assert
        expect(actual.document.layers).toEqual(['domain', 'application', 'interface']);
      });
    });

    context('hexagonal preset', () => {
      it('core/ports/adapters の 3 層が返される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({ preset: 'hexagonal' });

        // Assert
        expect(actual.document.layers).toEqual(['core', 'ports', 'adapters']);
      });
    });

    context('layered preset', () => {
      it('controller/service/repository の 3 層が返される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({ preset: 'layered' });

        // Assert
        expect(actual.document.layers).toEqual(['controller', 'service', 'repository']);
      });
    });

    context('flat preset', () => {
      it('layers 空配列 / allowedDependencies 空 Object が返される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({ preset: 'flat' });

        // Assert
        expect(actual.document.layers).toEqual([]);
        expect(actual.document.allowedDependencies).toEqual({});
      });
    });
  });

  describe('custom preset は explicit 指定が必須', () => {
    context('custom で layers / allowedDependencies 未指定の場合', () => {
      it('ConfigValidationError がスローされる', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const act = () => sut.resolve({ preset: 'custom' });

        // Assert
        expect(act).toThrow(ConfigValidationError);
      });
    });

    context('custom で layers と allowedDependencies を完全指定した場合', () => {
      it('正常に解決される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'custom',
          layers: ['ui', 'core'],
          allowedDependencies: {
            ui: ['ui', 'core'],
            core: ['core'],
          },
        });

        // Assert
        expect(actual.document.layers).toEqual(['ui', 'core']);
        expect(actual.document.allowedDependencies.ui).toEqual(['ui', 'core']);
      });
    });
  });

  describe('preset + 明示 override を適用する', () => {
    context('clean preset に layers のみ override した場合', () => {
      it('layers が差し替わり allowedDependencies は preset 既定を維持', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'clean',
          layers: ['domain', 'application', 'infrastructure', 'presentation'],
        });

        // Assert
        expect(actual.document.allowedDependencies.presentation).toEqual([
          'presentation',
          'application',
          'domain',
        ]);
      });
    });
  });

  describe('semantic validation (C1〜C5) を行う', () => {
    context('C2: allowedDependencies のキーが layers に存在しない場合', () => {
      it('ConfigValidationError がスローされる', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const act = () =>
          sut.resolve({
            preset: 'custom',
            layers: ['domain', 'application'],
            allowedDependencies: {
              domain: ['domain'],
              application: ['application', 'domain'],
              unknown: ['unknown'],
            },
          });

        // Assert
        expect(act).toThrow(/C2/);
      });
    });

    context('C3: allowedDependencies の値が layers に存在しない場合', () => {
      it('ConfigValidationError がスローされる', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const act = () =>
          sut.resolve({
            preset: 'custom',
            layers: ['domain', 'application'],
            allowedDependencies: {
              domain: ['domain'],
              application: ['application', 'domain', 'ghost'],
            },
          });

        // Assert
        expect(act).toThrow(/C3/);
      });
    });

    context('C1: 自己参照を欠く allowedDependencies を渡した場合', () => {
      it('自己参照が自動補完され warning が記録される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'custom',
          layers: ['a', 'b'],
          allowedDependencies: {
            a: ['b'],
            b: ['b'],
          },
        });

        // Assert
        expect(actual.document.allowedDependencies.a).toContain('a');
        expect(actual.warnings.some((w) => w.includes('C1'))).toBe(true);
      });
    });

    context('C4: 一部 layer が allowedDependencies に未登場の場合', () => {
      it('自己参照のみで自動補完され warning が記録される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'custom',
          layers: ['a', 'b'],
          allowedDependencies: {
            a: ['a'],
          },
        });

        // Assert
        expect(actual.document.allowedDependencies.b).toEqual(['b']);
        expect(actual.warnings.some((w) => w.includes('C4'))).toBe(true);
      });
    });

    context('C5: 循環依存 (a→b かつ b→a) を持つ config の場合', () => {
      it('解決は成功するが warning が記録される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'custom',
          layers: ['a', 'b'],
          allowedDependencies: {
            a: ['a', 'b'],
            b: ['b', 'a'],
          },
        });

        // Assert
        expect(actual.warnings.some((w) => w.includes('C5'))).toBe(true);
      });
    });
  });

  describe('layerDetection precedence を検証する', () => {
    context('byPath / byTag の両方が false の場合', () => {
      it('ConfigValidationError がスローされる', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const act = () =>
          sut.resolve({
            preset: 'clean',
            layerDetection: { byPath: false, byTag: false },
          });

        // Assert
        expect(act).toThrow(ConfigValidationError);
      });
    });

    context('byPath = false だが byTag = true の場合', () => {
      it('正常に解決され layerDetection が反映される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'clean',
          layerDetection: { byPath: false, byTag: true },
        });

        // Assert
        expect(actual.document.layerDetection).toEqual({ byPath: false, byTag: true });
      });
    });
  });

  describe('metadataTags を差し替える', () => {
    context('layer / unit タグを社内規約で差し替えた場合', () => {
      it('resolved document に反映される', () => {
        // Arrange
        const sut = new ArchitectureResolutionService();

        // Act
        const actual = sut.resolve({
          preset: 'clean',
          metadataTags: { layer: '@tier', unit: '@module' },
        });

        // Assert
        expect(actual.document.metadataTags).toEqual({ layer: '@tier', unit: '@module' });
      });
    });
  });
});
