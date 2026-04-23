// @layer test
// @unit biome-ast-engine
// @story ISSUE-014
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { LayerName, InvalidLayerNameError } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';
import {
  freezeArchitectureSpec,
  type ArchitectureSpec,
} from '../../../biome-ast-engine/domain/value-objects/architecture-spec.js';

const createLayerName = (value = 'domain'): LayerName => LayerName.fromString(value);

const ONION_SPEC: ArchitectureSpec = freezeArchitectureSpec({
  layers: ['domain', 'application', 'interface'],
  allowedDependencies: {
    domain: ['domain'],
    application: ['application', 'domain'],
    interface: ['interface', 'application', 'domain'],
  },
});

target('LayerName.fromString', () => {
  describe('正規レイヤー名を生成する', () => {
    context('"domain"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'domain';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('domain');
      });
    });

    context('"application"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'application';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('application');
      });
    });

    context('"infrastructure"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'infrastructure';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('infrastructure');
      });
    });

    context('"presentation"を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'presentation';

        // Act
        const actual = LayerName.fromString(input);

        // Assert
        expect(actual.toPathSegment()).toBe('presentation');
      });
    });

  });
});

target('LayerName.canDependOn', () => {
  describe('レイヤー依存方向を検証する', () => {
    context('domainがapplicationに依存する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const source = createLayerName('domain');
        const targetLayer = createLayerName('application');

        // Act
        const actual = source.canDependOn(targetLayer);

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('applicationがdomainに依存する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const source = createLayerName('application');
        const targetLayer = createLayerName('domain');

        // Act
        const actual = source.canDependOn(targetLayer);

        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});

target('LayerName.fromString (with ArchitectureSpec)', () => {
  describe('注入された spec に従ってレイヤー名を検証する', () => {
    context('onion spec で "interface" を指定した場合', () => {
      it('対応するLayerNameが生成される', () => {
        // Arrange
        const input = 'interface';

        // Act
        const actual = LayerName.fromString(input, ONION_SPEC);

        // Assert
        expect(actual.toString()).toBe('interface');
      });
    });

    context('clean(default) spec で "interface" を指定した場合', () => {
      it('InvalidLayerNameError がスローされる', () => {
        // Arrange
        const input = 'interface';

        // Act
        const act = () => LayerName.fromString(input);

        // Assert
        expect(act).toThrow(InvalidLayerNameError);
      });
    });

    context('onion spec で "infrastructure" を指定した場合', () => {
      it('spec に無いためエラーがスローされる', () => {
        // Arrange
        const input = 'infrastructure';

        // Act
        const act = () => LayerName.fromString(input, ONION_SPEC);

        // Assert
        expect(act).toThrow(InvalidLayerNameError);
      });
    });
  });
});

target('LayerName.canDependOn (with ArchitectureSpec)', () => {
  describe('注入された spec に従って依存方向を判定する', () => {
    context('onion spec で interface が domain に依存する場合', () => {
      it('trueを返す', () => {
        // Arrange
        const source = LayerName.fromString('interface', ONION_SPEC);
        const targetLayer = LayerName.fromString('domain', ONION_SPEC);

        // Act
        const actual = source.canDependOn(targetLayer);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('onion spec で domain が interface に依存する場合', () => {
      it('falseを返す', () => {
        // Arrange
        const source = LayerName.fromString('domain', ONION_SPEC);
        const targetLayer = LayerName.fromString('interface', ONION_SPEC);

        // Act
        const actual = source.canDependOn(targetLayer);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});

target('LayerName.toPathSegment', () => {
  describe('レイヤー名をパスセグメントとして返す', () => {
    context('domainの場合', () => {
      it('"domain"が返される', () => {
        // Arrange
        const sut = createLayerName('domain');

        // Act
        const actual = sut.toPathSegment();

        // Assert
        expect(actual).toBe('domain');
      });
    });
  });
});
