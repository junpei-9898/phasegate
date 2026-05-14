/**
 * @layer infrastructure
 * @unit ci-governance
 * @work-item-id WI-182 / WI-183
 * @work-item-id WI-194
 *
 * TemplateRendererPort実装（YAML書き出し）
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TemplateRendererPort, TemplateRenderOutput } from '../../domain/ports/template-renderer-port.js';
import type { CiTemplate } from '../../domain/aggregates/ci-template.js';

const OUTPUT_PATH_MAP: Record<string, string> = {
  'aidlc-gate': '.github/workflows/aidlc-gate.yml',
  'consistency-check': '.github/workflows/consistency-check.yml',
  'pre-commit': '.husky/pre-commit',
  'agent-context-refresh': '.github/workflows/agent-context-refresh.yml',
};

const TEMPLATE_PATH_MAP: Record<string, string> = {
  'aidlc-gate': 'docs/templates/ci/aidlc-gate.yml',
  'consistency-check': 'docs/templates/ci/consistency-check.yml',
  'pre-commit': 'docs/templates/hooks/pre-commit',
  'agent-context-refresh': 'docs/templates/ci/agent-context-refresh.yml',
};

export class YamlTemplateRendererAdapter implements TemplateRendererPort {
  constructor(private readonly harnessRoot: string = process.cwd()) {}

  async render(ciTemplate: CiTemplate): Promise<TemplateRenderOutput> {
    const outputPath = OUTPUT_PATH_MAP[ciTemplate.templateType] ?? '';
    const templatePath = TEMPLATE_PATH_MAP[ciTemplate.templateType];
    const content = templatePath === undefined
      ? `# ${ciTemplate.templateType} template (not configured)`
      : await readFile(join(this.harnessRoot, templatePath), 'utf-8');
    return { outputPath, content };
  }
}
