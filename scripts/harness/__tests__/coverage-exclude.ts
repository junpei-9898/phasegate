// @layer test
/**
 * L3-003 カバレッジゲート用の除外リスト（分母補正）。
 *
 * ここに列挙するのは「別ティア（e2e サブプロセス / hook プロセス）で実質的に
 * テストされているが in-process カバレッジには一切寄与しない」エントリポイント／
 * 配線ファイルのみ。ドメイン層・アプリケーション層・ビジネスロジックを持つ
 * インフラアダプタは絶対に除外しない（バーを下げる行為になるため）。
 *
 * 各グロブの根拠:
 * - main.ts               : CLI ディスパッチのエントリポイント。e2e テストが
 *                           tsx サブプロセスで起動して検証する（in-process 0%）。
 * - agent-integration/presentation/** : 5 種 hook のエントリポイント。
 *                           .claude/.codex から別プロセスとして起動される。
 * - agent-integration/infrastructure/adapters/{full-mode-session-query,
 *   harness-error-guidance,harness-api-cli-command-registry}-adapter.ts :
 *                           上記 hook エントリポイントからのみ import される
 *                           サブプロセス専用アダプタ（他の consumer は無し）。
 * - integrations/pre-commit.ts : .husky/pre-commit から起動されるプロセス
 *                           エントリポイント。
 * - **\/index.ts          : 純粋な re-export バレル（@layer barrel）。ロジック無し。
 * - **\/presentation/cli/**, **\/presentation/handlers/** :
 *                           argv をパースし usecase を呼び出力を整形するだけの
 *                           薄い CLI ディスパッチアダプタ。main.ts 経由の
 *                           e2e サブプロセススイートで網羅的に実行される。
 *
 * NOTE: presentation/formatters/** は除外しない（多くが in-process で
 * 直接テストされており 90%+ を維持しているため、除外はバー引き下げに当たる）。
 */
export const L3_003_COVERAGE_EXCLUDE: readonly string[] = [
  // 計測対象外（テスト・fixture）
  'scripts/harness/__tests__/**',
  '**/*.test.ts',

  // --- エントリポイント / サブプロセス専用（分母補正） ---
  'scripts/harness/main.ts',
  'scripts/harness/agent-integration/presentation/**',
  'scripts/harness/agent-integration/infrastructure/adapters/file-system-full-mode-session-query-adapter.ts',
  'scripts/harness/agent-integration/infrastructure/adapters/harness-error-guidance-adapter.ts',
  'scripts/harness/agent-integration/infrastructure/adapters/harness-api-cli-command-registry-adapter.ts',
  'scripts/harness/integrations/pre-commit.ts',
  'scripts/harness/**/index.ts',
  'scripts/harness/**/presentation/cli/**',
  'scripts/harness/**/presentation/handlers/**',
];
