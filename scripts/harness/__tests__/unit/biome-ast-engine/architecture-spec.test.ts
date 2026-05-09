// @layer test
// @unit biome-ast-engine
// @story H01-01
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  CLEAN_PRESET_SPEC,
  freezeArchitectureSpec,
  type ArchitectureSpec,
} from '../../../biome-ast-engine/domain/value-objects/architecture-spec.js';

target('CLEAN_PRESET_SPEC', () => {
  describe('既定の clean preset を定義する', () => {
    context('layers を確認する場合', () => {
      it('4 層(domain/application/infrastructure/presentation)が列挙される', () => {
        // Arrange

        // Act
        const actual = CLEAN_PRESET_SPEC.layers;

        // Assert
        expect(actual).toEqual(['domain', 'application', 'infrastructure', 'presentation']);
      });
    });

    context('allowedDependencies を確認する場合', () => {
      it('ADR-014 準拠(presentation→domain 許容)の依存行列が定義される', () => {
        // Arrange

        // Act
        const actual = CLEAN_PRESET_SPEC.allowedDependencies;

        // Assert
        expect(actual.domain).toEqual(['domain']);
        expect(actual.application).toEqual(['application', 'domain']);
        expect(actual.infrastructure).toEqual(['infrastructure', 'application', 'domain']);
        expect(actual.presentation).toEqual(['presentation', 'application', 'domain']);
      });
    });

    context('metadataTags を確認する場合', () => {
      it('既定タグとして @unit / @layer が定義される', () => {
        // Arrange

        // Act
        const actual = CLEAN_PRESET_SPEC.metadataTags;

        // Assert
        expect(actual).toEqual({ unit: '@unit', layer: '@layer' });
      });
    });

    context('layers 配列を書き換えようとした場合', () => {
      it('frozen のため書き換えが拒否される', () => {
        // Arrange
        const spec = CLEAN_PRESET_SPEC;

        // Act
        const act = () => {
          (spec.layers as string[]).push('extra');
        };

        // Assert
        expect(act).toThrow();
      });
    });
  });
});

target('freezeArchitectureSpec', () => {
  describe('任意の ArchitectureSpec を凍結する', () => {
    context('onion preset 相当の spec を渡した場合', () => {
      it('layers と allowedDependencies の両方が frozen になる', () => {
        // Arrange
        const input: ArchitectureSpec = {
          layers: ['domain', 'application', 'interface'],
          allowedDependencies: {
            domain: ['domain'],
            application: ['application', 'domain'],
            interface: ['interface', 'application', 'domain'],
          },
          metadataTags: {
            unit: '@module',
            layer: '@tier',
          },
        };

        // Act
        const actual = freezeArchitectureSpec(input);

        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
        expect(Object.isFrozen(actual.layers)).toBe(true);
        expect(Object.isFrozen(actual.allowedDependencies)).toBe(true);
        expect(Object.isFrozen(actual.allowedDependencies.interface)).toBe(true);
        expect(Object.isFrozen(actual.metadataTags)).toBe(true);
        expect(actual.metadataTags).toEqual({ unit: '@module', layer: '@tier' });
      });
    });
  });
});
