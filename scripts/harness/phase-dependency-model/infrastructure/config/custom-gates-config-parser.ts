// @unit phase-dependency-model
// @layer infrastructure

import { GateGraph } from '../../domain/services/gate-graph.js';
import { GateDefinition } from '../../domain/values/gate-definition.js';

export interface CustomGatesConfigParseResult {
  readonly gates: readonly GateDefinition[];
  readonly graph: GateGraph;
}

export class CustomGatesConfigParser {
  parse(raw: readonly unknown[]): CustomGatesConfigParseResult {
    const gates = Object.freeze(raw.map((entry) => GateDefinition.fromRaw(entry)));
    const graph = GateGraph.build([...gates]);

    return Object.freeze({
      gates,
      graph,
    });
  }
}
