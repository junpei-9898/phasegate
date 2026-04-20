/**
 * @layer presentation
 * @unit agent-integration
 *
 * UserPromptSubmit Hook Adapter (ISSUE-013 Wave 3 / C-5)
 *
 * Codex CLI の UserPromptSubmit 時 (ユーザーが prompt を送信する毎) に、
 * 最新の phase-gate 状態を簡潔に `hookSpecificOutput.additionalContext` として注入する。
 *
 * SessionStart と異なり毎ターン発火するため、運用ルールの再掲は省いて
 * 「現在の保護ファイル数」「ブロック中 Unit 数と内訳」のみを通知する。
 * ルール本体は SessionStart hook で既に injection 済みの前提。
 *
 * 出力スキーマ (Codex 公式):
 *   {
 *     "hookSpecificOutput": {
 *       "hookEventName": "UserPromptSubmit",
 *       "additionalContext": "<developer context を string で>"
 *     }
 *   }
 */

import { buildUserPromptSubmitContext, collectPhasegateStatus } from './phasegate-status-context.js';

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
  const additionalContext = buildUserPromptSubmitContext(status);

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
