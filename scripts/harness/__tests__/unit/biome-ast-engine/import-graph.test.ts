// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { FilePath } from '../../../biome-ast-engine/domain/value-objects/file-path.js';
import { ImportEdge } from '../../../biome-ast-engine/domain/value-objects/import-edge.js';
import { ImportGraph } from '../../../biome-ast-engine/domain/value-objects/import-graph.js';
import { LayerBoundary } from '../../../biome-ast-engine/domain/value-objects/layer-boundary.js';
import { LayerName } from '../../../biome-ast-engine/domain/value-objects/layer-name.js';

const createFilePath = (value: string): FilePath => FilePath.fromWorkspaceRelative(value);
const createLayerName = (value: 'domain' | 'application' | 'infrastructure' | 'presentation') =>
  LayerName.fromString(value);

const createImportEdge = (overrides?: {
  readonly from?: FilePath;
  readonly to?: FilePath;
  readonly importKind?: 'value' | 'type' | 'dynamic';
}): ImportEdge =>
  ImportEdge.create({
    from: overrides?.from ?? createFilePath('a.ts'),
    to: overrides?.to ?? createFilePath('b.ts'),
    importKind: overrides?.importKind ?? 'value',
  });

const createImportGraph = (overrides?: {
  readonly nodes?: readonly FilePath[];
  readonly edges?: readonly ImportEdge[];
  readonly rootNodes?: readonly FilePath[];
}): ImportGraph =>
  ImportGraph.create({
    nodes: overrides?.nodes ?? Object.freeze([createFilePath('a.ts'), createFilePath('b.ts')]),
    edges: overrides?.edges ?? Object.freeze([createImportEdge()]),
    rootNodes: overrides?.rootNodes ?? Object.freeze([createFilePath('a.ts')]),
  });

const sortEdgeStrings = (edges: readonly ImportEdge[]): readonly string[] =>
  Object.freeze(
    [...edges].map((edge) => `${edge.from.toString()}->${edge.to.toString()}:${edge.importKind}`).sort()
  );

target('ImportGraph.create', () => {
  describe('ImportGraphを生成する', () => {
    context('正常なノードとエッジの場合', () => {
      it('ImportGraphが生成される', () => {
        // Arrange
        const nodes = Object.freeze([createFilePath('a.ts'), createFilePath('b.ts')]);
        const edges = Object.freeze([createImportEdge()]);
        const rootNodes = Object.freeze([createFilePath('a.ts')]);

        // Act
        const actual = ImportGraph.create({ nodes, edges, rootNodes });

        // Assert
        expect(actual.outgoingEdgesOf(createFilePath('a.ts'))).toHaveLength(1);
      });
    });

    context('rootNodesがnodesの部分集合でない場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const nodes = Object.freeze([createFilePath('a.ts'), createFilePath('b.ts')]);
        const edges = Object.freeze([createImportEdge()]);
        const rootNodes = Object.freeze([createFilePath('c.ts')]);

        // Act
        const actual = () => ImportGraph.create({ nodes, edges, rootNodes });

        // Assert
        expect(actual).toThrow();
      });
    });

    context('重複ノードが含まれる場合', () => {
      it('重複が除去されて生成される', () => {
        // Arrange
        const nodes = Object.freeze([
          createFilePath('a.ts'),
          createFilePath('a.ts'),
          createFilePath('b.ts'),
        ]);

        // Act
        const actual = ImportGraph.create({
          nodes,
          edges: Object.freeze([createImportEdge()]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Assert
        expect(actual.nodes).toHaveLength(2);
      });
    });

    context('重複エッジが含まれる場合', () => {
      it('重複が除去されて生成される', () => {
        // Arrange
        const edge = createImportEdge();
        const edges = Object.freeze([edge, edge]);

        // Act
        const actual = ImportGraph.create({
          nodes: Object.freeze([createFilePath('a.ts'), createFilePath('b.ts')]),
          edges,
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Assert
        expect(actual.outgoingEdgesOf(createFilePath('a.ts'))).toHaveLength(1);
      });
    });

    context('空のノードとエッジの場合', () => {
      it('空のImportGraphが生成される', () => {
        // Arrange
        const nodes = Object.freeze([] as FilePath[]);
        const edges = Object.freeze([] as ImportEdge[]);
        const rootNodes = Object.freeze([] as FilePath[]);

        // Act
        const actual = ImportGraph.create({ nodes, edges, rootNodes });

        // Assert
        expect(actual.nodes).toEqual([]);
        expect(actual.edges).toEqual([]);
      });
    });
  });
});

target('ImportGraph.detectCycles', () => {
  describe('循環依存を検出する', () => {
    context('A→B→A の循環が存在する場合', () => {
      it('ImportCycleの配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([createFilePath('a.ts'), createFilePath('b.ts')]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
            createImportEdge({ from: createFilePath('b.ts'), to: createFilePath('a.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.detectCycles();

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual[0].includes(createFilePath('a.ts'))).toBe(true);
        expect(actual[0].includes(createFilePath('b.ts'))).toBe(true);
      });
    });

    context('循環が存在しない場合', () => {
      it('空配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([createFilePath('a.ts'), createFilePath('b.ts')]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.detectCycles();

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('A→B→C→Aの3ノード循環の場合', () => {
      it('3ノードのImportCycleが返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('a.ts'),
            createFilePath('b.ts'),
            createFilePath('c.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
            createImportEdge({ from: createFilePath('b.ts'), to: createFilePath('c.ts') }),
            createImportEdge({ from: createFilePath('c.ts'), to: createFilePath('a.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.detectCycles();

        // Assert
        expect(
          actual.some(
            (cycle) =>
              cycle.includes(createFilePath('a.ts')) &&
              cycle.includes(createFilePath('b.ts')) &&
              cycle.includes(createFilePath('c.ts'))
          )
        ).toBe(true);
      });
    });

    context('自己参照（from === to）のエッジがある場合', () => {
      it('1メンバーのImportCycleとして報告される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([createFilePath('a.ts')]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('a.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.detectCycles();

        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual[0].includes(createFilePath('a.ts'))).toBe(true);
      });
    });
  });
});

target('ImportGraph.findLayerViolations', () => {
  describe('レイヤー違反を検出する', () => {
    context('禁止方向のimportが存在する場合', () => {
      it('違反エッジの配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('domain/a.ts'),
            createFilePath('application/b.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({
              from: createFilePath('domain/a.ts'),
              to: createFilePath('application/b.ts'),
            }),
          ]),
          rootNodes: Object.freeze([createFilePath('domain/a.ts')]),
        });
        const boundaries = LayerBoundary.standardMatrix();
        const layerByFile = new Map<string, LayerName>([
          ['domain/a.ts', createLayerName('domain')],
          ['application/b.ts', createLayerName('application')],
        ]);

        // Act
        const actual = graph.findLayerViolations(boundaries, layerByFile);

        // Assert
        expect(sortEdgeStrings(actual)).toEqual(['domain/a.ts->application/b.ts:value']);
      });
    });

    context('許可方向のimportのみの場合', () => {
      it('空配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('application/a.ts'),
            createFilePath('domain/b.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({
              from: createFilePath('application/a.ts'),
              to: createFilePath('domain/b.ts'),
            }),
          ]),
          rootNodes: Object.freeze([createFilePath('application/a.ts')]),
        });
        const boundaries = LayerBoundary.standardMatrix();
        const layerByFile = new Map<string, LayerName>([
          ['application/a.ts', createLayerName('application')],
          ['domain/b.ts', createLayerName('domain')],
        ]);

        // Act
        const actual = graph.findLayerViolations(boundaries, layerByFile);

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});

target('ImportGraph.findGhostFiles', () => {
  describe('未参照ファイルを検出する', () => {
    context('importされていないファイルがある場合', () => {
      it('ゴーストファイルの配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([createFilePath('entry.ts'), createFilePath('orphan.ts')]),
          edges: Object.freeze([] as ImportEdge[]),
          rootNodes: Object.freeze([createFilePath('entry.ts')]),
        });

        // Act
        const actual = graph.findGhostFiles(Object.freeze([]));

        // Assert
        expect(actual.map((item) => item.toString())).toEqual(['orphan.ts']);
      });
    });

    context('ignorePatterns対象のファイルの場合', () => {
      it('除外されて返されない', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([createFilePath('entry.ts'), createFilePath('generated.ts')]),
          edges: Object.freeze([] as ImportEdge[]),
          rootNodes: Object.freeze([createFilePath('entry.ts')]),
        });

        // Act
        const actual = graph.findGhostFiles(Object.freeze(['generated']));

        // Assert
        expect(actual.map((item) => item.toString())).not.toContain('generated.ts');
      });
    });

    context('rootNodesに含まれるファイルの場合', () => {
      it('ゴーストファイルとして報告されない', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([createFilePath('entry.ts')]),
          edges: Object.freeze([] as ImportEdge[]),
          rootNodes: Object.freeze([createFilePath('entry.ts')]),
        });

        // Act
        const actual = graph.findGhostFiles(Object.freeze([]));

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});

target('ImportGraph.incomingCount', () => {
  describe('被参照数を返す', () => {
    context('複数のファイルから参照されている場合', () => {
      it('正しいカウントが返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('a.ts'),
            createFilePath('b.ts'),
            createFilePath('c.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('c.ts') }),
            createImportEdge({ from: createFilePath('b.ts'), to: createFilePath('c.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.incomingCount(createFilePath('c.ts'));

        // Assert
        expect(actual).toBe(2);
      });
    });

    context('参照されていないファイルの場合', () => {
      it('0が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('a.ts'),
            createFilePath('b.ts'),
            createFilePath('c.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.incomingCount(createFilePath('c.ts'));

        // Assert
        expect(actual).toBe(0);
      });
    });
  });
});

target('ImportGraph.outgoingEdgesOf', () => {
  describe('指定ファイルからの出力エッジを返す', () => {
    context('出力エッジが存在する場合', () => {
      it('対応するImportEdge配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('a.ts'),
            createFilePath('b.ts'),
            createFilePath('c.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('c.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.outgoingEdgesOf(createFilePath('a.ts'));

        // Assert
        expect(actual).toHaveLength(2);
      });
    });

    context('出力エッジが存在しない場合', () => {
      it('空配列が返される', () => {
        // Arrange
        const graph = createImportGraph({
          nodes: Object.freeze([
            createFilePath('a.ts'),
            createFilePath('b.ts'),
            createFilePath('c.ts'),
          ]),
          edges: Object.freeze([
            createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') }),
          ]),
          rootNodes: Object.freeze([createFilePath('a.ts')]),
        });

        // Act
        const actual = graph.outgoingEdgesOf(createFilePath('c.ts'));

        // Assert
        expect(actual).toEqual([]);
      });
    });
  });
});
