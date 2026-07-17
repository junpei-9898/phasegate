// @unit traceability-model
// @layer application
// @work-item-id WI-305

export type DesignFragmentCorpusRole = "product" | "inception";
export type DesignFragmentChangeKind = "added" | "modified" | "deleted";

export interface ChangedDesignFragmentDto {
  readonly corpusRole: DesignFragmentCorpusRole;
  readonly declaredKey: string;
  readonly path: string;
  readonly changeKind: DesignFragmentChangeKind;
  readonly workItemIds: readonly string[];
  readonly reflectionTargets: readonly string[];
}

export interface DesignChangeReadDiagnosticDto {
  readonly code: string;
  readonly path: string | null;
}

export type DesignChangeReadResultDto =
  | {
      readonly state: "available";
      readonly fragments: readonly ChangedDesignFragmentDto[];
      readonly diagnostics: readonly DesignChangeReadDiagnosticDto[];
    }
  | {
      readonly state: "unavailable";
      readonly diagnostics: readonly DesignChangeReadDiagnosticDto[];
    };
