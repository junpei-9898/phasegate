/**
 * @layer domain
 * @unit ci-governance
 */

import type { CiTemplate } from '../aggregates/ci-template.js';

export interface TemplateRenderOutput {
  readonly outputPath: string;
  readonly content: string;
}

export interface TemplateRendererPort {
  render(ciTemplate: CiTemplate): Promise<TemplateRenderOutput>;
}
