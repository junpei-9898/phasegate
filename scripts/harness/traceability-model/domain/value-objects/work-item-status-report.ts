// @unit traceability-model
// @layer domain
// @work-item-id WI-126 / WI-140

import type {
  WorkItemFrontmatter,
  WorkItemStatus,
  WorkItemType,
} from "./work-item-frontmatter.js";

export interface WorkItemStatusEvidence {
  readonly hasRequiredInceptionArtifacts: boolean;
  readonly missingInceptionArtifacts: readonly string[];
  readonly reflectedUnits: readonly string[];
  readonly missingReflectionUnits: readonly string[];
  readonly implementationPaths: readonly string[];
  readonly testPaths: readonly string[];
  readonly missingImplementation: boolean;
  readonly missingTests: boolean;
  readonly validation: {
    readonly state: "passed" | "failed" | "not-run";
    readonly source: string;
    readonly blockingValidation: readonly string[];
  };
}

export interface WorkItemStatusInput {
  readonly descriptionPath: string;
  readonly directoryId: string;
  readonly ownerUnit: string | null;
  readonly frontmatter: WorkItemFrontmatter;
  readonly requiredInceptionArtifacts: readonly string[];
  readonly existingInceptionArtifacts: readonly string[];
  readonly affectedUnits: readonly string[];
  readonly productReflectionPaths: readonly string[];
  readonly implementationPaths: readonly string[];
  readonly testPaths: readonly string[];
}

export interface WorkItemStatusReport {
  readonly id: string;
  readonly type: WorkItemType;
  readonly descriptionPath: string;
  readonly currentStatus: WorkItemStatus;
  readonly derivedStatus: WorkItemStatus;
  readonly stale: boolean;
  readonly reason: string;
  readonly nextAction: string;
  readonly evidence: WorkItemStatusEvidence;
}

export interface WorkItemStatusApplyResult {
  readonly updated: readonly WorkItemStatusReport[];
  readonly unchanged: readonly WorkItemStatusReport[];
  readonly blocked: readonly WorkItemStatusReport[];
}
