// @unit world-model
// @layer application
// @work-item-id WI-305

export interface PinnedDesignEndpointDto {
  readonly constraintId: string;
  readonly endpoint: "claimant" | "premise";
  readonly nodeId: string;
  readonly corpusRole: "product" | "inception";
  readonly declaredKey: string;
}

export type PinnedDesignEndpointReadResultDto =
  | {
      readonly state: "available";
      readonly endpoints: readonly PinnedDesignEndpointDto[];
      readonly diagnosticCodes: readonly string[];
    }
  | { readonly state: "unavailable"; readonly diagnosticCodes: readonly string[] };
