/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from './file-path.js';
import { ImportCycle } from './import-cycle.js';
import { ImportEdge } from './import-edge.js';
import { LayerBoundary } from './layer-boundary.js';
import { LayerName } from './layer-name.js';

type ImportGraphProps = {
  readonly nodes: readonly FilePath[];
  readonly edges: readonly ImportEdge[];
  readonly rootNodes: readonly FilePath[];
};

const uniqueFilePaths = (filePaths: readonly FilePath[]): readonly FilePath[] => {
  const map = new Map<string, FilePath>();

  for (const filePath of filePaths) {
    map.set(filePath.toString(), filePath);
  }

  return Object.freeze([...map.values()]);
};

const uniqueEdges = (edges: readonly ImportEdge[]): readonly ImportEdge[] => {
  const map = new Map<string, ImportEdge>();

  for (const edge of edges) {
    const key = `${edge.from.toString()}->${edge.to.toString()}:${edge.importKind}`;
    map.set(key, edge);
  }

  return Object.freeze([...map.values()]);
};

const escapeRegex = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

const globToRegex = (pattern: string): RegExp => {
  let output = '';

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];

    if (current === '*' && next === '*') {
      output += '.*';
      index += 1;
      continue;
    }

    if (current === '*') {
      output += '[^/]*';
      continue;
    }

    output += escapeRegex(current);
  }

  return new RegExp(`^${output}$`);
};

const matchesPattern = (value: string, pattern: string): boolean => {
  return globToRegex(pattern).test(value) || value.includes(pattern.replace(/\*/g, '').replace(/\//g, ''));
};

const canonicalCycleKey = (path: readonly string[]): string => {
  if (path.length === 0) {
    return '';
  }

  const rotations = path.map((_, index) => [...path.slice(index), ...path.slice(0, index)].join('->'));
  return rotations.sort()[0];
};

export class InvalidImportGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImportGraphError';
  }
}

export class ImportGraph {
  readonly nodes: readonly FilePath[];
  readonly edges: readonly ImportEdge[];
  readonly rootNodes: readonly FilePath[];

  private constructor(props: ImportGraphProps) {
    this.nodes = props.nodes;
    this.edges = props.edges;
    this.rootNodes = props.rootNodes;
  }

  static create(props: ImportGraphProps): ImportGraph {
    const nodes = uniqueFilePaths(props.nodes);
    const edges = uniqueEdges(props.edges);
    const rootNodes = uniqueFilePaths(props.rootNodes);
    const nodeMap = new Map(nodes.map((node) => [node.toString(), node]));

    for (const edge of edges) {
      if (!nodeMap.has(edge.from.toString()) || !nodeMap.has(edge.to.toString())) {
        throw new InvalidImportGraphError('ImportGraph edges must connect registered nodes');
      }
    }

    for (const rootNode of rootNodes) {
      if (!nodeMap.has(rootNode.toString())) {
        throw new InvalidImportGraphError('ImportGraph rootNodes must be a subset of nodes');
      }
    }

    return Object.freeze(new ImportGraph({ nodes, edges, rootNodes }));
  }

  detectCycles(): readonly ImportCycle[] {
    const adjacency = new Map<string, readonly string[]>();

    for (const node of this.nodes) {
      adjacency.set(node.toString(), Object.freeze([]));
    }

    for (const edge of this.edges) {
      const current = adjacency.get(edge.from.toString()) ?? [];
      adjacency.set(edge.from.toString(), Object.freeze([...current, edge.to.toString()]));
    }

    const nodeByString = new Map(this.nodes.map((node) => [node.toString(), node]));
    const cycles = new Map<string, ImportCycle>();

    for (const edge of this.edges) {
      if (edge.from.equals(edge.to)) {
        const key = `${edge.from.toString()}->${edge.to.toString()}`;
        cycles.set(key, ImportCycle.create([edge.from, edge.to]));
      }
    }

    const visit = (current: string, path: readonly string[]): void => {
      const neighbors = adjacency.get(current) ?? [];

      for (const neighbor of neighbors) {
        const existingIndex = path.indexOf(neighbor);

        if (existingIndex >= 0) {
          const cyclePath = path.slice(existingIndex);

          if (cyclePath.length >= 2) {
            const key = canonicalCycleKey(cyclePath);
            cycles.set(
              key,
              ImportCycle.create(cyclePath.map((item) => nodeByString.get(item) ?? FilePath.fromWorkspaceRelative(item)))
            );
          }

          continue;
        }

        visit(neighbor, [...path, neighbor]);
      }
    };

    for (const node of this.nodes) {
      visit(node.toString(), [node.toString()]);
    }

    return Object.freeze([...cycles.values()]);
  }

  findLayerViolations(
    boundaries: readonly LayerBoundary[],
    layerByFile: ReadonlyMap<string, LayerName>
  ): readonly ImportEdge[] {
    return Object.freeze(
      this.edges.filter((edge) => {
        const sourceLayer = layerByFile.get(edge.from.toString());
        const targetLayer = layerByFile.get(edge.to.toString());

        if (sourceLayer === undefined || targetLayer === undefined) {
          return false;
        }

        const boundary = boundaries.find(
          (item) => item.sourceLayer.equals(sourceLayer) && item.targetLayer.equals(targetLayer)
        );

        return boundary?.allowed === false;
      })
    );
  }

  findGhostFiles(ignorePatterns: readonly string[]): readonly FilePath[] {
    const rootNodeSet = new Set(this.rootNodes.map((node) => node.toString()));

    return Object.freeze(
      this.nodes.filter((node) => {
        if (rootNodeSet.has(node.toString())) {
          return false;
        }

        if (this.incomingCount(node) > 0) {
          return false;
        }

        return !ignorePatterns.some((pattern) => matchesPattern(node.toString(), pattern));
      })
    );
  }

  incomingCount(filePath: FilePath): number {
    return this.edges.filter((edge) => edge.to.equals(filePath)).length;
  }

  outgoingEdgesOf(filePath: FilePath): readonly ImportEdge[] {
    return Object.freeze(this.edges.filter((edge) => edge.from.equals(filePath)));
  }
}
