/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  toSourceModuleSnapshot,
  type RawModuleData,
} from '../../../biome-ast-engine/infrastructure/mappers/source-module-snapshot-mapper.js';

const createRawModuleData = (overrides?: Partial<RawModuleData>): RawModuleData => ({
  filePath: 'biome-ast-engine/domain/example.ts',
  declaredUnit: 'biome-ast-engine',
  declaredLayer: 'domain',
  imports: [
    { from: 'biome-ast-engine/domain/a.ts', to: 'biome-ast-engine/domain/b.ts', importKind: 'value' },
  ],
  anyTypeCount: 2,
  typedNodeCount: 10,
  commentLineCount: 3,
  logicalLineCount: 20,
  repeatedCommentBlocks: 0,
  duplicationFingerprints: ['fp-1'],
  exportedSymbols: ['Foo', 'Bar'],
  isEntrypointCandidate: false,
  ...overrides,
});

target('toSourceModuleSnapshot', () => {
  describe('RawModuleDataをSourceModuleSnapshotに変換する', () => {
    context('基本的な入力の場合', () => {
      it('基本的な変換が正しく行われる', () => {
        // Arrange
        const raw = createRawModuleData();

        // Act
        const actual = toSourceModuleSnapshot(raw);

        // Assert
        expect(actual.filePath.toString()).toBe('biome-ast-engine/domain/example.ts');
        expect(actual.declaredUnit).toBe('biome-ast-engine');
        expect(actual.declaredLayer?.toString()).toBe('domain');
        expect(actual.anyTypeCount).toBe(2);
        expect(actual.typedNodeCount).toBe(10);
        expect(actual.commentLineCount).toBe(3);
        expect(actual.logicalLineCount).toBe(20);
        expect(actual.repeatedCommentBlocks).toBe(0);
        expect(actual.duplicationFingerprints).toEqual(['fp-1']);
        expect(actual.exportedSymbols).toEqual(['Foo', 'Bar']);
        expect(actual.isEntrypointCandidate).toBe(false);
      });
    });

    context('空の入力の場合', () => {
      it('空の入力でデフォルト値が設定される', () => {
        // Arrange
        const raw = createRawModuleData({
          declaredUnit: null,
          declaredLayer: null,
          imports: [],
          anyTypeCount: 0,
          typedNodeCount: 0,
          commentLineCount: 0,
          logicalLineCount: 0,
          repeatedCommentBlocks: 0,
          duplicationFingerprints: [],
          exportedSymbols: [],
          isEntrypointCandidate: false,
        });

        // Act
        const actual = toSourceModuleSnapshot(raw);

        // Assert
        expect(actual.declaredUnit).toBeNull();
        expect(actual.declaredLayer).toBeNull();
        expect(actual.imports).toHaveLength(0);
        expect(actual.anyTypeCount).toBe(0);
        expect(actual.typedNodeCount).toBe(0);
        expect(actual.duplicationFingerprints).toEqual([]);
        expect(actual.exportedSymbols).toEqual([]);
      });
    });

    context('複数のimportsがある場合', () => {
      it('imports配列が正しくマッピングされる', () => {
        // Arrange
        const raw = createRawModuleData({
          imports: [
            { from: 'biome-ast-engine/domain/a.ts', to: 'biome-ast-engine/domain/b.ts', importKind: 'value' },
            { from: 'biome-ast-engine/domain/a.ts', to: 'biome-ast-engine/domain/c.ts', importKind: 'type' },
            { from: 'biome-ast-engine/domain/a.ts', to: 'biome-ast-engine/infrastructure/d.ts', importKind: 'dynamic' },
          ],
        });

        // Act
        const actual = toSourceModuleSnapshot(raw);

        // Assert
        expect(actual.imports).toHaveLength(3);
        expect(actual.imports[0].importKind).toBe('value');
        expect(actual.imports[0].from.toString()).toBe('biome-ast-engine/domain/a.ts');
        expect(actual.imports[0].to.toString()).toBe('biome-ast-engine/domain/b.ts');
        expect(actual.imports[1].importKind).toBe('type');
        expect(actual.imports[1].to.toString()).toBe('biome-ast-engine/domain/c.ts');
        expect(actual.imports[2].importKind).toBe('dynamic');
        expect(actual.imports[2].to.toString()).toBe('biome-ast-engine/infrastructure/d.ts');
      });
    });
  });
});
