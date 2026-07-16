// @unit world-model
// @layer infrastructure
// @work-item-id WI-289

import type { TraceabilityWorldReadDto } from "../../../traceability-model/index.js";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { WorldNode } from "../../domain/entities/world-node.js";
import type { WorldHashingPort } from "../../domain/ports/world-hashing-port.js";
import { CanonicalJsonSerializer } from "../../domain/services/canonical-json-serializer.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import type { TraceabilityDesignFactIndex } from "./design-fact-extraction.js";

export interface TraceabilityWorldReadFacadeContract {
  read(): Promise<TraceabilityWorldReadDto>;
}

export interface TraceabilityDesignFactAdapterDeps {
  readonly facade: TraceabilityWorldReadFacadeContract;
  readonly hashingPort: WorldHashingPort;
  readonly serializer?: CanonicalJsonSerializer;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const optionalPath = (sourcePaths: readonly string[]): PathKey | undefined => {
  if (sourcePaths.length === 0) return undefined;
  try {
    return PathKey.create([...sourcePaths].sort(compareStrings)[0]);
  } catch {
    return undefined;
  }
};

export class TraceabilityDesignFactAdapter {
  private readonly facade: TraceabilityWorldReadFacadeContract;
  private readonly hashingPort: WorldHashingPort;
  private readonly serializer: CanonicalJsonSerializer;

  constructor(deps: TraceabilityDesignFactAdapterDeps) {
    this.facade = deps.facade;
    this.hashingPort = deps.hashingPort;
    this.serializer = deps.serializer ?? new CanonicalJsonSerializer();
  }

  async read(): Promise<TraceabilityDesignFactIndex> {
    const dto = await this.facade.read();
    if (dto.schemaVersion !== "phasegate-traceability-world-read/v1") {
      return {
        workItemNodes: [],
        unitIdByDefinitionPath: new Map(),
        storyIdsBySourcePath: new Map(),
        workItemIdByDescriptionPath: new Map(),
        diagnostics: [
          ExtractionDiagnostic.create({
            code: "unsupported-provider-schema",
            payload: { provider: "traceability-model", schemaVersion: dto.schemaVersion },
          }),
        ],
      };
    }

    const workItemNodes = dto.workItems.map((workItem) =>
      WorldNode.workItem({
        workItemId: workItem.workItemId,
        digest: this.hashingPort.sha256(this.serializer.serialize(workItem)),
        attributes: {
          affects: [...workItem.affects].sort(compareStrings),
          descriptionPath: workItem.descriptionPath,
          legacyIds: [...workItem.legacyIds].sort(compareStrings),
          severity: workItem.severity,
          status: workItem.status,
          type: workItem.type,
        },
      }),
    );
    const unitIdByDefinitionPath = new Map(
      dto.units
        .map((unit) => [unit.definitionPath, unit.unitId] as const)
        .sort((left, right) => compareStrings(left[0], right[0])),
    );
    const storyIdsBySourcePath = new Map<string, readonly string[]>();
    for (const story of dto.stories) {
      const current = storyIdsBySourcePath.get(story.sourcePath) ?? [];
      storyIdsBySourcePath.set(story.sourcePath, [...current, story.storyId].sort(compareStrings));
    }
    const workItemIdByDescriptionPath = new Map(
      dto.workItems
        .map((workItem) => [workItem.descriptionPath, workItem.workItemId] as const)
        .sort((left, right) => compareStrings(left[0], right[0])),
    );
    const diagnostics = dto.diagnostics.map((entry) =>
      ExtractionDiagnostic.create({
        code: "provider-diagnostic",
        path: optionalPath(entry.sourcePaths),
        payload: {
          message: entry.message,
          provider: "traceability-model",
          providerCode: entry.code,
          sourcePaths: [...entry.sourcePaths].sort(compareStrings),
          subjectId: entry.subjectId,
        },
      }),
    );
    return {
      workItemNodes: workItemNodes.sort((left, right) => compareStrings(left.id.toString(), right.id.toString())),
      unitIdByDefinitionPath,
      storyIdsBySourcePath,
      workItemIdByDescriptionPath,
      diagnostics,
    };
  }
}
