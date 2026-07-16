// @unit world-model
// @layer infrastructure
// @work-item-id WI-291

import type { TraceabilityWorldReadDto } from "../../../traceability-model/index.js";
import type { TraceabilityWorldReadFacadeContract } from "./traceability-design-fact-adapter.js";

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const mergePlainDtos = <T>(values: readonly (readonly T[])[]): readonly T[] => {
  const byProjection = new Map<string, T>();
  for (const value of values.flat()) {
    const key = JSON.stringify(value);
    if (!byProjection.has(key)) byProjection.set(key, value);
  }
  return [...byProjection.entries()].sort(([left], [right]) => compareStrings(left, right)).map(([, value]) => value);
};

export class TraceabilityWorldReadFacadeMerger implements TraceabilityWorldReadFacadeContract {
  constructor(private readonly facades: readonly TraceabilityWorldReadFacadeContract[]) {
    if (facades.length === 0) throw new Error("at least one traceability facade is required");
  }

  async read(): Promise<TraceabilityWorldReadDto> {
    const results = await Promise.all(this.facades.map((facade) => facade.read()));
    const unsupported = results.find((result) => result.schemaVersion !== "phasegate-traceability-world-read/v1");
    if (unsupported) return unsupported;
    return {
      schemaVersion: "phasegate-traceability-world-read/v1",
      units: mergePlainDtos(results.map((result) => result.units)),
      stories: mergePlainDtos(results.map((result) => result.stories)),
      acceptanceCriteria: mergePlainDtos(results.map((result) => result.acceptanceCriteria)),
      workItems: mergePlainDtos(results.map((result) => result.workItems)),
      testReferences: mergePlainDtos(results.map((result) => result.testReferences)),
      diagnostics: mergePlainDtos(results.map((result) => result.diagnostics)),
    };
  }
}
