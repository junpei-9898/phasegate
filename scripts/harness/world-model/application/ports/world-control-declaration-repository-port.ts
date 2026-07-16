// @unit world-model
// @layer application
// @work-item-id WI-294

import type { ConstraintRecord, MalformedConstraintDeclaration } from "../../domain/entities/constraint-record.js";
import type {
  AdoptionBaseline,
  SemanticDebtDeclaration,
  WorldWaiver,
} from "../../domain/entities/control-declarations.js";
import type { ExplicitConstraintRelation } from "../../domain/value-objects/explicit-constraint-relation.js";
import type { ExplicitNodeAlias } from "../../domain/value-objects/explicit-node-alias.js";

export interface WorldControlDiagnosticDto {
  readonly code: string;
  readonly path: string;
  readonly locator: string | null;
  readonly message: string;
}

export interface ConstraintDeclarationSet {
  readonly schemaVersion: "phasegate-world-constraints/v1";
  readonly records: readonly ConstraintRecord[];
  readonly malformedDeclarations: readonly MalformedConstraintDeclaration[];
  readonly aliases: readonly ExplicitNodeAlias[];
  readonly relations: readonly ExplicitConstraintRelation[];
  readonly diagnostics: readonly WorldControlDiagnosticDto[];
}

export type WorldControlReadResult<T> =
  | { readonly state: "absent"; readonly value: T; readonly diagnostics: readonly WorldControlDiagnosticDto[] }
  | { readonly state: "loaded"; readonly value: T; readonly diagnostics: readonly WorldControlDiagnosticDto[] }
  | { readonly state: "invalid"; readonly diagnostics: readonly WorldControlDiagnosticDto[] };

export type WorldControlReplaceResult =
  | { readonly state: "written"; readonly path: string }
  | { readonly state: "invalid"; readonly diagnostics: readonly WorldControlDiagnosticDto[] };

export interface ConstraintDeclarationRepositoryPort {
  load(): Promise<WorldControlReadResult<ConstraintDeclarationSet>>;
  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult>;
}

export interface AdoptionBaselineRepositoryPort {
  load(): Promise<WorldControlReadResult<AdoptionBaseline | null>>;
  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult>;
}

export interface WaiverDeclarationRepositoryPort {
  load(): Promise<WorldControlReadResult<readonly WorldWaiver[]>>;
  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult>;
}

export interface SemanticDebtRepositoryPort {
  load(): Promise<WorldControlReadResult<readonly SemanticDebtDeclaration[]>>;
  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult>;
}
