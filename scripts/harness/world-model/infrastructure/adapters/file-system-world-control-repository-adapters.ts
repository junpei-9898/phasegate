// @unit world-model
// @layer infrastructure
// @work-item-id WI-294
// @work-item-id WI-300

import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Module, { type ErrorObject } from "ajv/dist/2020.js";
import type {
  AdoptionBaselineRepositoryPort,
  ConstraintDeclarationRepositoryPort,
  ConstraintDeclarationSet,
  SemanticDebtRepositoryPort,
  WaiverDeclarationRepositoryPort,
  WorldControlDiagnosticDto,
  WorldControlReadResult,
  WorldControlReplaceResult,
} from "../../application/ports/world-control-declaration-repository-port.js";
import type {
  AdoptionBaseline,
  SemanticDebtDeclaration,
  WorldWaiver,
} from "../../domain/entities/control-declarations.js";
import { ArtifactKind } from "../../domain/value-objects/artifact-kind.js";
import { CorpusRole } from "../../domain/value-objects/corpus-role.js";
import { PathKey } from "../../domain/value-objects/path-key.js";
import { WorldNodeId } from "../../domain/value-objects/world-node-id.js";
import {
  InvalidControlDeclarationError,
  mapAdoptionBaselineDocument,
  mapConstraintDeclarationDocument,
  mapSemanticDebtDocument,
  mapWaiverDocument,
} from "./world-control-declaration-mapper.js";

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;

const CONTRACT_ROOT = fileURLToPath(new URL("../../../../../docs/contracts/", import.meta.url));
let temporarySequence = 0;

interface RepositoryOptions {
  readonly rootDir: string;
  readonly fileName?: string;
}

interface DeclarationSpec<T> {
  readonly fileName: string;
  readonly schemaFileName: string;
  readonly schemaVersion: string;
  readonly emptyValue: T;
  readonly map: (value: unknown) => T;
  readonly allowMalformedConstraintRecords?: boolean;
}

type RawReadResult =
  | { readonly state: "absent" }
  | { readonly state: "present"; readonly value: unknown }
  | { readonly state: "invalid"; readonly diagnostic: WorldControlDiagnosticDto };

const freezeDiagnostic = (
  code: string,
  fileName: string,
  message: string,
  locator: string | null = null,
): WorldControlDiagnosticDto => Object.freeze({ code, path: fileName, locator, message });

const schemaVersionOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>).schemaVersion
    : undefined;

const formatAjvErrors = (errors: readonly ErrorObject[] | null | undefined): string =>
  (errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? error.keyword}`)
    .sort()
    .join("; ");

const relaxedConstraintEnvelopeSchema = (schema: Record<string, unknown>): Record<string, unknown> => {
  const copy = structuredClone(schema) as Record<string, unknown>;
  const properties = copy.properties as Record<string, unknown>;
  const constraints = properties.constraints as Record<string, unknown>;
  const aliases = properties.aliases as Record<string, unknown>;
  constraints.items = { type: "object" };
  aliases.items = { type: "object" };
  return copy;
};

class FileSystemWorldControlRepository<T> {
  constructor(
    private readonly options: RepositoryOptions,
    private readonly spec: DeclarationSpec<T>,
  ) {}

  async load(): Promise<WorldControlReadResult<T>> {
    const raw = await this.readRaw();
    if (raw.state === "absent") {
      return Object.freeze({ state: "absent", value: this.spec.emptyValue, diagnostics: Object.freeze([]) });
    }
    if (raw.state === "invalid") {
      return Object.freeze({ state: "invalid", diagnostics: Object.freeze([raw.diagnostic]) });
    }
    const admitted = await this.admit(raw.value, this.spec.allowMalformedConstraintRecords === true);
    if (admitted.state === "invalid") return admitted;
    return Object.freeze({
      state: "loaded",
      value: admitted.value,
      diagnostics: Object.freeze(this.isConstraintSet(admitted.value) ? [...admitted.value.diagnostics] : []),
    });
  }

  async replaceAtomically(document: unknown): Promise<WorldControlReplaceResult> {
    const admitted = await this.admit(document, false);
    if (admitted.state === "invalid") return admitted;
    const absolutePath = path.join(this.options.rootDir, this.spec.fileName);
    const temporaryPath = `${absolutePath}.${process.pid}-${temporarySequence++}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await rename(temporaryPath, absolutePath);
      return Object.freeze({ state: "written", path: this.spec.fileName });
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      return Object.freeze({
        state: "invalid",
        diagnostics: Object.freeze([
          freezeDiagnostic(
            "control-write-failure",
            this.spec.fileName,
            error instanceof Error ? error.message : String(error),
          ),
        ]),
      });
    }
  }

  private async readRaw(): Promise<RawReadResult> {
    let bytes: Uint8Array;
    try {
      bytes = await readFile(path.join(this.options.rootDir, this.spec.fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: "absent" };
      return {
        state: "invalid",
        diagnostic: freezeDiagnostic(
          "control-read-failure",
          this.spec.fileName,
          error instanceof Error ? error.message : String(error),
        ),
      };
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      return {
        state: "invalid",
        diagnostic: freezeDiagnostic("invalid-utf8", this.spec.fileName, "Control file is not valid UTF-8"),
      };
    }
    try {
      return { state: "present", value: JSON.parse(text) };
    } catch (error) {
      return {
        state: "invalid",
        diagnostic: freezeDiagnostic(
          "invalid-json",
          this.spec.fileName,
          error instanceof Error ? error.message : String(error),
        ),
      };
    }
  }

  private async admit(
    value: unknown,
    allowMalformedConstraintRecords: boolean,
  ): Promise<WorldControlReadResult<T> & { readonly state: "loaded" | "invalid" }> {
    const schemaVersion = schemaVersionOf(value);
    if (schemaVersion === undefined) {
      return this.invalid("missing-schema-version", "schemaVersion is required");
    }
    if (schemaVersion !== this.spec.schemaVersion) {
      return this.invalid(
        "unsupported-schema-version",
        `Expected ${this.spec.schemaVersion}, received ${String(schemaVersion)}`,
      );
    }
    let schema: Record<string, unknown>;
    try {
      schema = JSON.parse(await readFile(path.join(CONTRACT_ROOT, this.spec.schemaFileName), "utf8")) as Record<
        string,
        unknown
      >;
    } catch (error) {
      return this.invalid("schema-load-failure", error instanceof Error ? error.message : String(error));
    }
    const validationSchema = allowMalformedConstraintRecords ? relaxedConstraintEnvelopeSchema(schema) : schema;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(validationSchema);
    if (!validate(value)) {
      return this.invalid("malformed-control-document", formatAjvErrors(validate.errors));
    }
    try {
      return Object.freeze({ state: "loaded", value: this.spec.map(value), diagnostics: Object.freeze([]) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.invalid(
        error instanceof InvalidControlDeclarationError ? "malformed-control-document" : "control-mapping-failure",
        message,
      );
    }
  }

  private invalid(
    code: string,
    message: string,
  ): { readonly state: "invalid"; readonly diagnostics: readonly WorldControlDiagnosticDto[] } {
    return Object.freeze({
      state: "invalid",
      diagnostics: Object.freeze([freezeDiagnostic(code, this.spec.fileName, message)]),
    });
  }

  private isConstraintSet(value: T): value is T & ConstraintDeclarationSet {
    return typeof value === "object" && value !== null && "malformedDeclarations" in value;
  }
}

const emptyConstraints = (): ConstraintDeclarationSet =>
  Object.freeze({
    schemaVersion: "phasegate-world-constraints/v1",
    records: Object.freeze([]),
    malformedDeclarations: Object.freeze([]),
    aliases: Object.freeze([]),
    relations: Object.freeze([]),
    diagnostics: Object.freeze([]),
  });

export class FileSystemConstraintDeclarationRepositoryAdapter implements ConstraintDeclarationRepositoryPort {
  private readonly repository: FileSystemWorldControlRepository<ConstraintDeclarationSet>;

  constructor(options: RepositoryOptions) {
    const fileName = options.fileName ?? "phasegate.world-constraints.json";
    const artifactId = WorldNodeId.artifact(
      ArtifactKind.externalDeclaration(),
      CorpusRole.external(),
      PathKey.create(fileName),
    );
    this.repository = new FileSystemWorldControlRepository(options, {
      fileName,
      schemaFileName: "world-constraints.schema.json",
      schemaVersion: "phasegate-world-constraints/v1",
      emptyValue: emptyConstraints(),
      map: (value) => mapConstraintDeclarationDocument(value, artifactId),
      allowMalformedConstraintRecords: true,
    });
  }

  load(): Promise<WorldControlReadResult<ConstraintDeclarationSet>> {
    return this.repository.load();
  }

  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult> {
    return this.repository.replaceAtomically(document);
  }
}

export class FileSystemAdoptionBaselineRepositoryAdapter implements AdoptionBaselineRepositoryPort {
  private readonly repository: FileSystemWorldControlRepository<AdoptionBaseline | null>;

  constructor(options: RepositoryOptions) {
    this.repository = new FileSystemWorldControlRepository(options, {
      fileName: options.fileName ?? "phasegate.world-baseline.json",
      schemaFileName: "world-baseline.schema.json",
      schemaVersion: "phasegate-world-adoption-baseline/v1",
      emptyValue: null,
      map: mapAdoptionBaselineDocument,
    });
  }

  load(): Promise<WorldControlReadResult<AdoptionBaseline | null>> {
    return this.repository.load();
  }

  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult> {
    return this.repository.replaceAtomically(document);
  }
}

export class FileSystemWaiverDeclarationRepositoryAdapter implements WaiverDeclarationRepositoryPort {
  private readonly repository: FileSystemWorldControlRepository<readonly WorldWaiver[]>;

  constructor(options: RepositoryOptions) {
    this.repository = new FileSystemWorldControlRepository(options, {
      fileName: options.fileName ?? "phasegate.world-waivers.json",
      schemaFileName: "world-waivers.schema.json",
      schemaVersion: "phasegate-world-waivers/v1",
      emptyValue: Object.freeze([]),
      map: mapWaiverDocument,
    });
  }

  load(): Promise<WorldControlReadResult<readonly WorldWaiver[]>> {
    return this.repository.load();
  }

  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult> {
    return this.repository.replaceAtomically(document);
  }
}

export class FileSystemSemanticDebtRepositoryAdapter implements SemanticDebtRepositoryPort {
  private readonly repository: FileSystemWorldControlRepository<readonly SemanticDebtDeclaration[]>;

  constructor(options: RepositoryOptions) {
    this.repository = new FileSystemWorldControlRepository(options, {
      fileName: options.fileName ?? "phasegate.world-debts.json",
      schemaFileName: "world-debts.schema.json",
      schemaVersion: "phasegate-world-debts/v1",
      emptyValue: Object.freeze([]),
      map: mapSemanticDebtDocument,
    });
  }

  load(): Promise<WorldControlReadResult<readonly SemanticDebtDeclaration[]>> {
    return this.repository.load();
  }

  replaceAtomically(document: unknown): Promise<WorldControlReplaceResult> {
    return this.repository.replaceAtomically(document);
  }
}
