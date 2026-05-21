// @unit agent-integration
// @layer presentation
// @work-item-id WI-208

import {
  buildUserPromptSubmitContext,
  collectPhasegateStatus,
  collectRecentViolations,
  findConfigPath,
  projectRootForConfig,
} from './phasegate-status-context.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  try {
    await readStdin();
  } catch {
    // stdin が無くても続行
  }

  const cwd = process.cwd();
  const status = await collectPhasegateStatus(cwd);
  // 違反検知の起点は config が見つかったディレクトリ (= project root)。
  // config が無ければ cwd をそのまま使う。
  const configPath = await findConfigPath(cwd);
  const projectRoot = configPath !== null ? projectRootForConfig(configPath) : cwd;
  const violations = await collectRecentViolations(projectRoot, status);
  const additionalContext = buildUserPromptSubmitContext(status, violations);

  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  };

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`UserPromptSubmit hook error: ${String(error)}\n`);
  // UserPromptSubmit で失敗してもターン継続できるよう exit 0
  process.exit(0);
});
