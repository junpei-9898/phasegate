// @unit ci-governance
// @layer application

import { DesignPhase } from '../../domain/value-objects/design-phase.js';
import type { TemplateRepositoryPort } from '../../domain/ports/template-repository-port.js';
import type { DesignDocWriterPort } from '../../domain/ports/design-doc-writer-port.js';
import type { ScaffoldDesignInput } from '../dto/scaffold-design-input.js';
import type { ScaffoldDesignOutput } from '../dto/scaffold-design-output.js';

const UNIT_PLACEHOLDER = /\{\{\s*unit\s*\}\}/g;

export class ScaffoldDesignUseCase {
  constructor(
    private readonly templates: TemplateRepositoryPort,
    private readonly writer: DesignDocWriterPort,
  ) {}

  async execute(input: ScaffoldDesignInput): Promise<ScaffoldDesignOutput> {
    if (!input.unit || input.unit.trim().length === 0) {
      throw new Error('--unit は必須です');
    }
    const phase = DesignPhase.create(input.phase);
    const unit = input.unit.trim();
    const force = input.force === true;

    const templatePath = this.templates.resolvePath(phase);
    const targetPath = this.writer.resolvePath(unit, phase);
    const alreadyExists = await this.writer.exists(unit, phase);

    if (alreadyExists && !force) {
      return {
        targetPath,
        templatePath,
        unit,
        phase: phase.value,
        written: false,
        alreadyExists: true,
        overwritten: false,
      };
    }

    const raw = await this.templates.read(phase);
    const rendered = raw.replace(UNIT_PLACEHOLDER, unit);
    await this.writer.write(unit, phase, rendered);

    return {
      targetPath,
      templatePath,
      unit,
      phase: phase.value,
      written: true,
      alreadyExists,
      overwritten: alreadyExists && force,
    };
  }
}
