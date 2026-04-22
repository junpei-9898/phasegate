// @unit agent-integration
// @layer presentation

import { buildSessionStartContext, collectPhasegateStatus } from './phasegate-status-context.js';

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

  const status = await collectPhasegateStatus(process.cwd());
  const additionalContext = buildSessionStartContext(status);

  const output = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  };

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`SessionStart hook error: ${String(error)}\n`);
  // SessionStart で失敗してもセッション継続できるよう exit 0
  process.exit(0);
});
