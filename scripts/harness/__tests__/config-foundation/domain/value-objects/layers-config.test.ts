import { describe, expect, it } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { LayersConfig } from '../../../../config-foundation/domain/value-objects/layers-config.js';
import { L1Config } from '../../../../config-foundation/domain/value-objects/l1-config.js';
import { L2Config } from '../../../../config-foundation/domain/value-objects/l2-config.js';
import { L3Config } from '../../../../config-foundation/domain/value-objects/l3-config.js';
import { L4Config } from '../../../../config-foundation/domain/value-objects/l4-config.js';
import { ConfigValidationError } from '../../../../config-foundation/domain/errors/config-validation-error.js';

function createDefaultL1(): L1Config {
  return new L1Config({ enabled: true, rules: { 'no-eval': 'error' } });
}

function createDefaultL2(): L2Config {
  return new L2Config({ enabled: true, validators: ['v1'] });
}

function createDefaultL3(coverageThreshold = 90): L3Config {
  return new L3Config({ enabled: true, validators: ['v1'], coverageThreshold });
}

function createDefaultL4(): L4Config {
  return new L4Config({ enabled: true, validators: ['v1'], schedule: '0 0 * * *' });
}

target('LayersConfig', () => {
  describe('生成する', () => {
    context('4レイヤーをすべて指定する場合', () => {
      it('生成できる', () => {
        // Arrange
        const L1 = createDefaultL1();
        const L2 = createDefaultL2();
        const L3 = createDefaultL3();
        const L4 = createDefaultL4();

        // Act
        const actual = new LayersConfig({ L1, L2, L3, L4 });

        // Assert
        expect(actual.L1).toBe(L1);
        expect(actual.L2).toBe(L2);
        expect(actual.L3).toBe(L3);
        expect(actual.L4).toBe(L4);
      });
    });

    context('L1が欠落している場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          L2: { enabled: true, validators: ['v1'] },
          L3: { enabled: true, validators: [], coverageThreshold: 90 },
          L4: { enabled: true, validators: [], schedule: 'daily' },
        };

        // Act
        const actual = () => LayersConfig.create(input as any);

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('L2が欠落している場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          L1: { enabled: true, rules: {} },
          L3: { enabled: true, validators: [], coverageThreshold: 90 },
          L4: { enabled: true, validators: [], schedule: 'daily' },
        };

        // Act
        const actual = () => LayersConfig.create(input as any);

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('L3が欠落している場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          L1: { enabled: true, rules: {} },
          L2: { enabled: true, validators: [] },
          L4: { enabled: true, validators: [], schedule: 'daily' },
        };

        // Act
        const actual = () => LayersConfig.create(input as any);

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });

    context('L4が欠落している場合', () => {
      it('生成に失敗する', () => {
        // Arrange
        const input = {
          L1: { enabled: true, rules: {} },
          L2: { enabled: true, validators: [] },
          L3: { enabled: true, validators: [], coverageThreshold: 90 },
        };

        // Act
        const actual = () => LayersConfig.create(input as any);

        // Assert
        expect(actual).toThrow(ConfigValidationError);
      });
    });
  });

  describe('等値性を判定する', () => {
    context('全レイヤーが同じ場合', () => {
      it('等しい', () => {
        // Arrange
        const left = new LayersConfig({
          L1: createDefaultL1(),
          L2: createDefaultL2(),
          L3: createDefaultL3(),
          L4: createDefaultL4(),
        });
        const right = new LayersConfig({
          L1: createDefaultL1(),
          L2: createDefaultL2(),
          L3: createDefaultL3(),
          L4: createDefaultL4(),
        });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('いずれかのレイヤーが異なる場合', () => {
      it('等しくない', () => {
        // Arrange
        const left = new LayersConfig({
          L1: createDefaultL1(),
          L2: createDefaultL2(),
          L3: createDefaultL3(90),
          L4: createDefaultL4(),
        });
        const right = new LayersConfig({
          L1: createDefaultL1(),
          L2: createDefaultL2(),
          L3: createDefaultL3(95),
          L4: createDefaultL4(),
        });

        // Act
        const actual = left.equals(right);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('レイヤーを取得する', () => {
    context('L1を指定する場合', () => {
      it('L1Configを返す', () => {
        // Arrange
        const L1 = createDefaultL1();
        const layersConfig = new LayersConfig({
          L1,
          L2: createDefaultL2(),
          L3: createDefaultL3(),
          L4: createDefaultL4(),
        });

        // Act
        const actual = layersConfig.get('L1');

        // Assert
        expect(actual).toBe(L1);
        expect(actual).toBeInstanceOf(L1Config);
      });
    });

    context('L4を指定する場合', () => {
      it('L4Configを返す', () => {
        // Arrange
        const L4 = createDefaultL4();
        const layersConfig = new LayersConfig({
          L1: createDefaultL1(),
          L2: createDefaultL2(),
          L3: createDefaultL3(),
          L4,
        });

        // Act
        const actual = layersConfig.get('L4');

        // Assert
        expect(actual).toBe(L4);
        expect(actual).toBeInstanceOf(L4Config);
      });
    });
  });
});
