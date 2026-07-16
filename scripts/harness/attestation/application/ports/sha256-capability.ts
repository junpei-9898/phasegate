// @unit attestation
// @layer application
// @work-item-id WI-286

/**
 * Unit境界を越えて受け渡すplain SHA-256 digest。
 *
 * 64桁lowercase hexのruntime invariantはproviderと各consumer-local VOが検証する。
 * attestation domainのDigestはこのpublic contractへ露出しない。
 */
export type Sha256DigestString = `sha256:${string}`;

/**
 * Raw bytesをSHA-256するattestation public capability。
 */
export interface Sha256Capability {
  hashBytes(bytes: Uint8Array): Sha256DigestString;
}

/**
 * Unicode normalizationを行わず、TextEncoderのUTF-8 bytesをpublic capabilityへ渡す。
 */
export function hashUtf8(capability: Sha256Capability, text: string): Sha256DigestString {
  return capability.hashBytes(new TextEncoder().encode(text));
}
