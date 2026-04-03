/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * TemplateRendererPort実装（YAML書き出し）
 */

import type { TemplateRendererPort, TemplateRenderOutput } from '../../domain/ports/template-renderer-port.js';
import type { CiTemplate } from '../../domain/aggregates/ci-template.js';

const OUTPUT_PATH_MAP: Record<string, string> = {
  'aidlc-gate': '.github/workflows/aidlc-gate.yml',
  'consistency-check': '.github/workflows/consistency-check.yml',
  'pre-commit': '.husky/pre-commit',
};

export class YamlTemplateRendererAdapter implements TemplateRendererPort {
  async render(ciTemplate: CiTemplate): Promise<TemplateRenderOutput> {
    const outputPath = OUTPUT_PATH_MAP[ciTemplate.templateType] ?? '';
    const content = this.generateContent(ciTemplate);
    return { outputPath, content };
  }

  private generateContent(ciTemplate: CiTemplate): string {
    const { templateType, config } = ciTemplate;

    if (!config) {
      return `# ${templateType} template (not configured)`;
    }

    if (templateType === 'pre-commit') {
      return [
        '#!/bin/sh',
        '. "$(dirname "$0")/_/husky.sh"',
        '',
        `npx phasegate lint --validators ${config.targetValidatorIds.join(',')}`,
      ].join('\n');
    }

    return [
      `name: ${templateType}`,
      `on:`,
      `  ${config.triggerCondition === 'pull_request' ? 'pull_request' : 'schedule'}:`,
      config.triggerCondition === 'schedule' ? '    - cron: "0 2 * * *"' : '',
      `jobs:`,
      `  validate:`,
      `    runs-on: ubuntu-latest`,
      `    steps:`,
      `      - uses: actions/checkout@v4`,
      `      - run: npx phasegate lint --validators ${config.targetValidatorIds.join(',')}`,
    ].filter((l) => l !== '').join('\n');
  }
}
