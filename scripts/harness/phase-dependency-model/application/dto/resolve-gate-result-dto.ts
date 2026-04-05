// @unit phase-dependency-model
// @layer application

export interface ResolveGateFindingDto {
  readonly gateName: string;
  readonly path: string;
  readonly reason: string;
}

export interface ResolveGateResultDto {
  readonly matchedGates: readonly string[];
  readonly blockers: readonly ResolveGateFindingDto[];
  readonly warnings: readonly ResolveGateFindingDto[];
}
