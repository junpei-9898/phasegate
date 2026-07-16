// @unit world-model
// @layer infrastructure
// @work-item-id WI-290

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ExtractionDiagnostic } from "../../domain/entities/extraction-diagnostic.js";
import { PathKey } from "../../domain/value-objects/path-key.js";

export class OwnerProjectionError extends Error {
  readonly code: string;
  readonly payload: Readonly<Record<string, string | number | boolean | null | readonly string[]>>;

  constructor(
    code: string,
    message: string,
    payload: Record<string, string | number | boolean | null | readonly string[]> = {},
  ) {
    super(message);
    this.name = "OwnerProjectionError";
    this.code = code;
    this.payload = Object.freeze({ ...payload });
  }
}

export type OptionalJsonReadResult =
  | { readonly state: "present"; readonly value: unknown; readonly path: PathKey }
  | { readonly state: "not-present"; readonly diagnostic: ExtractionDiagnostic }
  | { readonly state: "invalid"; readonly diagnostic: ExtractionDiagnostic };

export const readOptionalJson = async (
  rootDir: string,
  relativePath: string,
  provider: string,
): Promise<OptionalJsonReadResult> => {
  const pathKey = PathKey.create(relativePath);
  let bytes: Uint8Array;
  try {
    bytes = await readFile(path.join(rootDir, relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        state: "not-present",
        diagnostic: ExtractionDiagnostic.create({
          code: "not-present",
          path: pathKey,
          payload: { provider },
        }),
      };
    }
    return {
      state: "invalid",
      diagnostic: ExtractionDiagnostic.create({
        code: "provider-read-failure",
        path: pathKey,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          provider,
        },
      }),
    };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return {
      state: "invalid",
      diagnostic: ExtractionDiagnostic.create({
        code: "invalid-utf8",
        path: pathKey,
        payload: { byteLength: bytes.byteLength, provider },
      }),
    };
  }
  try {
    return { state: "present", value: JSON.parse(text), path: pathKey };
  } catch (error) {
    return {
      state: "invalid",
      diagnostic: ExtractionDiagnostic.create({
        code: "provider-parse-failure",
        path: pathKey,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          provider,
        },
      }),
    };
  }
};

export const projectionDiagnostic = (pathKey: PathKey, provider: string, error: unknown): ExtractionDiagnostic => {
  if (error instanceof OwnerProjectionError) {
    return ExtractionDiagnostic.create({
      code: error.code,
      path: pathKey,
      payload: { ...error.payload, message: error.message, provider },
    });
  }
  return ExtractionDiagnostic.create({
    code: "provider-projection-failure",
    path: pathKey,
    payload: {
      message: error instanceof Error ? error.message : String(error),
      provider,
    },
  });
};

export const requireObject = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OwnerProjectionError("malformed-provider-document", `${field} must be an object`, { field });
  }
  return value as Record<string, unknown>;
};

export const requireArray = (value: unknown, field: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new OwnerProjectionError("malformed-provider-document", `${field} must be an array`, { field });
  }
  return value;
};

export const requireString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new OwnerProjectionError("malformed-provider-document", `${field} must be a string`, { field });
  }
  return value;
};

export const requireBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") {
    throw new OwnerProjectionError("malformed-provider-document", `${field} must be a boolean`, { field });
  }
  return value;
};

export const assertExactKeys = (value: Record<string, unknown>, allowed: readonly string[], field: string): void => {
  const unsupported = Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .sort();
  if (unsupported.length > 0) {
    throw new OwnerProjectionError(
      "unsupported-projection-field",
      `${field} contains unsupported fields: ${unsupported.join(", ")}`,
      { field, unsupported },
    );
  }
};
