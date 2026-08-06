// @unit ci-governance
// @layer application
// @work-item-id WI-368

import type { InceptionDocWriterPort } from "../../domain/ports/inception-doc-writer-port.js";
import type { InceptionTemplateRepositoryPort } from "../../domain/ports/inception-template-repository-port.js";
import { InceptionDocKind } from "../../domain/value-objects/inception-doc-kind.js";
import type { ScaffoldInceptionInput } from "../dto/scaffold-inception-input.js";
import type { ScaffoldInceptionOutput } from "../dto/scaffold-inception-output.js";

export class ScaffoldInceptionUseCase {
  constructor(
    private readonly templates: InceptionTemplateRepositoryPort,
    private readonly writer: InceptionDocWriterPort,
  ) {}

  async execute(input: ScaffoldInceptionInput): Promise<ScaffoldInceptionOutput> {
    const kind = InceptionDocKind.create(input.kind);
    const dryRun = input.dryRun === true;
    const force = input.force === true;

    const templatePath = this.templates.resolvePath(kind);
    const targetPath = this.writer.resolvePath(kind);
    const alreadyExists = await this.writer.exists(kind);

    if (dryRun) {
      return {
        targetPath,
        templatePath,
        kind: kind.value,
        dryRun: true,
        written: false,
        alreadyExists,
        overwritten: false,
      };
    }

    if (alreadyExists && !force) {
      return {
        targetPath,
        templatePath,
        kind: kind.value,
        dryRun: false,
        written: false,
        alreadyExists: true,
        overwritten: false,
      };
    }

    const raw = await this.templates.read(kind);
    await this.writer.write(kind, raw);

    return {
      targetPath,
      templatePath,
      kind: kind.value,
      dryRun: false,
      written: true,
      alreadyExists,
      overwritten: alreadyExists && force,
    };
  }
}
