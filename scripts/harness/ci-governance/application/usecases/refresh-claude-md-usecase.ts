/**
 * @layer application
 * @unit ci-governance
 */

import type { AgentContextDocumentPort } from '../../domain/ports/agent-context-document-port.js';
import type { ClaudeMdComposer } from '../../domain/services/claude-md-composer.js';
import type { RefreshClaudeMdInput } from '../dto/refresh-claude-md-input.js';
import type { RefreshClaudeMdOutput } from '../dto/refresh-claude-md-output.js';

const CLAUDE_MD_PATH = 'CLAUDE.md';
const CLAUDE_MD_TEMPLATE_PATH = 'docs/templates/agent-context/CLAUDE.md.template.md';

const PHASEGATE_COMMANDS = [
  'phasegate init --with-ci',
  'phasegate ci:auto-refresh-agent-context --dry-run',
  'phasegate ci:auto-refresh-agent-context --apply',
  'phasegate refresh-claude-md --apply',
  'phasegate p2:check-agent-context',
  'phasegate phasegate:check-ready',
];

const PHASE_PRESETS = ['minimal', 'standard', 'full', 'custom'];

export class RefreshClaudeMdUseCase {
  constructor(
    private readonly documentPort: AgentContextDocumentPort,
    private readonly composer: ClaudeMdComposer,
  ) {}

  async execute(input: RefreshClaudeMdInput): Promise<RefreshClaudeMdOutput> {
    try {
      const [template, existing, skills] = await Promise.all([
        this.documentPort.readHarnessTemplate(CLAUDE_MD_TEMPLATE_PATH),
        this.documentPort.readProjectFile(CLAUDE_MD_PATH),
        this.documentPort.listHarnessSkillNames(),
      ]);
      const nextContent = this.composer.compose(template, existing, {
        commands: PHASEGATE_COMMANDS,
        skills,
        presets: PHASE_PRESETS,
      });
      const changed = existing !== nextContent;

      if (!input.dryRun && changed) {
        await this.documentPort.writeProjectFile(CLAUDE_MD_PATH, nextContent);
      }

      return {
        success: true,
        path: CLAUDE_MD_PATH,
        changed,
        applied: !input.dryRun && changed,
        preview: nextContent,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        path: CLAUDE_MD_PATH,
        changed: false,
        applied: false,
        preview: '',
        errors: [
          {
            code: 'AGENT_CONTEXT_CLAUDE_REFRESH_FAILED',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }
}
