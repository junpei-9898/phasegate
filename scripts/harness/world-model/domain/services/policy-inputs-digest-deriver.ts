// @unit world-model
// @layer domain
// @work-item-id WI-295

import type { AdoptionBaseline, SemanticDebtDeclaration, WorldWaiver } from "../entities/control-declarations.js";
import type { WorldHashingPort } from "../ports/world-hashing-port.js";
import type { Sha256Digest } from "../value-objects/sha256-digest.js";
import type { CanonicalJsonObject, CanonicalJsonSerializer } from "./canonical-json-serializer.js";

export interface PolicyInputsDigestInput {
  readonly baseline: AdoptionBaseline | null;
  readonly waivers: readonly WorldWaiver[];
  readonly semanticDebts: readonly SemanticDebtDeclaration[];
  readonly policyAsOfDate: string | null;
}

export interface PolicyInputsDigestDerivation {
  readonly digest: Sha256Digest;
  readonly preimage: CanonicalJsonObject;
  readonly canonicalBytes: Uint8Array;
  readonly resolvedPolicyAsOfDate: string | null;
}

const compareStrings = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const requireCalendarDate = (value: string | null): string => {
  if (value === null) throw new Error("policyAsOfDate is required when waivers exist");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("policyAsOfDate must be YYYY-MM-DD");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error("policyAsOfDate must be a valid calendar date");
  }
  return value;
};

export class PolicyInputsDigestDeriver {
  constructor(
    private readonly serializer: CanonicalJsonSerializer,
    private readonly hashingPort: WorldHashingPort,
  ) {}

  derive(input: PolicyInputsDigestInput): PolicyInputsDigestDerivation {
    const waivers = [...input.waivers].sort((left, right) => compareStrings(left.waiverId, right.waiverId));
    const semanticDebts = [...input.semanticDebts].sort((left, right) => compareStrings(left.debtId, right.debtId));
    const resolvedPolicyAsOfDate = waivers.length === 0 ? null : requireCalendarDate(input.policyAsOfDate);
    const preimage: CanonicalJsonObject = {
      schemaVersion: "phasegate-world-policy-inputs/v1",
      adoptionBaseline: input.baseline?.toCanonicalValue() ?? null,
      waivers: waivers.map((waiver) => waiver.toCanonicalValue()),
      semanticDebts: semanticDebts.map((debt) => debt.toCanonicalValue()),
      policyAsOfDate: resolvedPolicyAsOfDate,
    };
    const canonicalBytes = this.serializer.serialize(preimage);
    return Object.freeze({
      digest: this.hashingPort.sha256(canonicalBytes),
      preimage: Object.freeze(preimage),
      canonicalBytes,
      resolvedPolicyAsOfDate,
    });
  }
}
