// @layer infrastructure
// @unit attestation
// index.ts — attestation Unit の公開バレルエクスポート

// Public DTO types
export type { AttestationDocument } from "./application/dto/attestation-document.js";
export type { VerifyAttestationOutput } from "./application/dto/verify-attestation-output.js";
export {
  hashUtf8,
  type Sha256Capability,
  type Sha256DigestString,
} from "./application/ports/sha256-capability.js";
export type { AttestationModule, AttestationModuleOptions } from "./composition-root.js";
// Composition Root
export { createAttestationModule, createSha256Capability } from "./composition-root.js";
export type { AttestHandlerArgs, AttestHandlerResult } from "./presentation/handlers/attest-handler.js";
// Presentation Handlers
export { AttestHandler } from "./presentation/handlers/attest-handler.js";
export type {
  VerifyAttestationHandlerArgs,
  VerifyAttestationHandlerResult,
} from "./presentation/handlers/verify-attestation-handler.js";
export { VerifyAttestationHandler } from "./presentation/handlers/verify-attestation-handler.js";
