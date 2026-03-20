/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { ImportGraph } from '../value-objects/import-graph.js';
import { SourceModuleSnapshot } from '../value-objects/source-module-snapshot.js';

export class ImportGraphBuilder {
  build(snapshots: readonly SourceModuleSnapshot[]): ImportGraph {
    const nodes = Object.freeze(snapshots.map((snapshot) => snapshot.filePath));
    const nodeSet = new Set(nodes.map((node) => node.toString()));
    const edges = Object.freeze(
      snapshots
        .flatMap((snapshot) => snapshot.imports)
        .filter(
          (edge) => nodeSet.has(edge.from.toString()) && nodeSet.has(edge.to.toString())
        )
    );
    const rootNodes = Object.freeze(
      snapshots
        .filter((snapshot) => {
          const filePath = snapshot.filePath.toString();
          return (
            snapshot.isEntrypointCandidate ||
            filePath.endsWith('/index.ts') ||
            filePath === 'index.ts' ||
            filePath.includes('/presentation/cli/') ||
            filePath.startsWith('presentation/cli/')
          );
        })
        .map((snapshot) => snapshot.filePath)
    );

    return ImportGraph.create({ nodes, edges, rootNodes });
  }
}
