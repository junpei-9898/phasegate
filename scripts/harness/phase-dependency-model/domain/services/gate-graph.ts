/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { GateDefinition } from '../values/gate-definition.js';
import { GateName } from '../values/gate-name.js';

export interface GateGraphViolation {
  readonly code:
    | 'DUPLICATE_GATE_NAME'
    | 'UNKNOWN_DEPENDENCY'
    | 'LEVEL_ORDER_VIOLATION'
    | 'CYCLIC_DEPENDENCY';
  readonly message: string;
  readonly gateNames: readonly string[];
}

export class GateGraphValidationError extends Error {
  readonly violations: readonly GateGraphViolation[];

  constructor(violations: readonly GateGraphViolation[]) {
    super(violations.map((violation) => violation.message).join('\n'));
    this.name = 'GateGraphValidationError';
    this.violations = Object.freeze([...violations]);
  }
}

const toViolation = (
  code: GateGraphViolation['code'],
  message: string,
  gateNames: readonly string[],
): GateGraphViolation =>
  Object.freeze({
    code,
    message,
    gateNames: Object.freeze([...gateNames]),
  });

export class GateGraph {
  readonly gates: ReadonlyMap<string, GateDefinition>;

  private constructor(gates: ReadonlyMap<string, GateDefinition>) {
    this.gates = gates;
    Object.freeze(this);
  }

  static build(gates: GateDefinition[]): GateGraph {
    const violations: GateGraphViolation[] = [];
    const duplicateNames = new Set<string>();
    const gateMap = new Map<string, GateDefinition>();

    for (const gate of gates) {
      const name = gate.name.value;
      if (gateMap.has(name)) {
        duplicateNames.add(name);
        continue;
      }
      gateMap.set(name, gate);
    }

    for (const duplicateName of duplicateNames) {
      violations.push(
        toViolation(
          'DUPLICATE_GATE_NAME',
          `重複する GateName です: ${duplicateName}`,
          [duplicateName],
        ),
      );
    }

    for (const gate of gateMap.values()) {
      for (const dependencyName of gate.dependsOn) {
        const dependency = gateMap.get(dependencyName.value);
        if (!dependency) {
          violations.push(
            toViolation(
              'UNKNOWN_DEPENDENCY',
              `未知の dependsOn 参照です: ${gate.name.value} -> ${dependencyName.value}`,
              [gate.name.value, dependencyName.value],
            ),
          );
          continue;
        }

        if (dependency.level.value > gate.level.value) {
          violations.push(
            toViolation(
              'LEVEL_ORDER_VIOLATION',
              `レベル逆行です: ${gate.name.value} -> ${dependencyName.value}`,
              [gate.name.value, dependencyName.value],
            ),
          );
        }
      }
    }

    const graph = new Map<string, string[]>();
    for (const gate of gateMap.values()) {
      graph.set(gate.name.value, []);
    }
    for (const gate of gateMap.values()) {
      const neighbors = graph.get(gate.name.value);
      if (!neighbors) {
        continue;
      }
      for (const dependencyName of gate.dependsOn) {
        if (gateMap.has(dependencyName.value)) {
          neighbors.push(dependencyName.value);
        }
      }
    }

    for (const cycle of GateGraph.detectCycles(graph)) {
      violations.push(
        toViolation(
          'CYCLIC_DEPENDENCY',
          `循環依存が検出されました: ${cycle.join(' -> ')}`,
          cycle,
        ),
      );
    }

    if (violations.length > 0) {
      throw new GateGraphValidationError(violations);
    }

    return new GateGraph(gateMap);
  }

  resolveAncestors(name: GateName): GateName[] {
    const target = this.gates.get(name.value);
    if (!target) {
      return [];
    }

    const visited = new Set<string>();
    const ordered: GateName[] = [];

    const visit = (gate: GateDefinition): void => {
      for (const dependencyName of gate.dependsOn) {
        if (visited.has(dependencyName.value)) {
          continue;
        }

        const dependency = this.gates.get(dependencyName.value);
        if (!dependency) {
          continue;
        }

        visit(dependency);
        visited.add(dependencyName.value);
        ordered.push(dependencyName);
      }
    };

    visit(target);

    return ordered;
  }

  private static detectCycles(graph: ReadonlyMap<string, readonly string[]>): readonly string[][] {
    let index = 0;
    const indexMap = new Map<string, number>();
    const lowLinkMap = new Map<string, number>();
    const stack: string[] = [];
    const inStack = new Set<string>();
    const cycles: string[][] = [];

    const strongConnect = (node: string): void => {
      indexMap.set(node, index);
      lowLinkMap.set(node, index);
      index += 1;
      stack.push(node);
      inStack.add(node);

      for (const next of graph.get(node) ?? []) {
        if (!indexMap.has(next)) {
          strongConnect(next);
          lowLinkMap.set(node, Math.min(lowLinkMap.get(node) ?? 0, lowLinkMap.get(next) ?? 0));
          continue;
        }

        if (inStack.has(next)) {
          lowLinkMap.set(node, Math.min(lowLinkMap.get(node) ?? 0, indexMap.get(next) ?? 0));
        }
      }

      if ((lowLinkMap.get(node) ?? -1) !== (indexMap.get(node) ?? -1)) {
        return;
      }

      const component: string[] = [];
      let current = '';
      do {
        current = stack.pop() ?? '';
        if (current.length === 0) {
          break;
        }
        inStack.delete(current);
        component.push(current);
      } while (current !== node);

      if (component.length > 1) {
        cycles.push(component.sort());
        return;
      }

      const [single] = component;
      if ((graph.get(single) ?? []).includes(single)) {
        cycles.push(component);
      }
    };

    for (const node of graph.keys()) {
      if (!indexMap.has(node)) {
        strongConnect(node);
      }
    }

    return Object.freeze(cycles);
  }
}
