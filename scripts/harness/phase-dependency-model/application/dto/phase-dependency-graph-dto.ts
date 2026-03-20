/**
 * @layer application
 * @unit phase-dependency-model
 */

export interface PhaseDependencyGraphNodeDto {
  readonly key: string;
  readonly level: 1 | 2 | 3;
  readonly skillName: string;
  readonly artifacts?: readonly string[];
}

export interface PhaseDependencyGraphEdgeDto {
  readonly from: string;
  readonly to: string;
  readonly type: 'requires' | 'recommends';
}

export interface PhaseDependencyGraphDto {
  readonly nodes: readonly PhaseDependencyGraphNodeDto[];
  readonly edges: readonly PhaseDependencyGraphEdgeDto[];
}
