// @unit world-model
// @layer domain
// @work-item-id WI-287
import { ExtractionDiagnostic } from "../entities/extraction-diagnostic.js";

export type TextNormalizationResult =
  | { readonly ok: true; readonly text: string; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly diagnostic: ExtractionDiagnostic };

export class TextContentNormalizer {
  normalize(bytes: Uint8Array): TextNormalizationResult {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      const text = decoded.replace(/\r\n?/g, "\n");
      return Object.freeze({
        ok: true,
        text,
        bytes: new TextEncoder().encode(text),
      });
    } catch {
      return Object.freeze({
        ok: false,
        diagnostic: ExtractionDiagnostic.create({
          code: "invalid-utf8",
          payload: { byteLength: bytes.byteLength },
        }),
      });
    }
  }
}
