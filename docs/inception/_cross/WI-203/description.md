---
id: WI-203
type: issue
severity: high
status: tested
affects: [agent-integration, installation, harness-api]
source: github#unassigned
---

# WI-203: stop hook strict mode invokes unmanaged complete-check wrapper

> 起票日: 2026-05-16
> 起票経緯: 外部 issue 報告。`agentIntegration.stopHook.enforce: true` で `phasegate hook stop` が `scripts/harness/cli/complete-check.ts` を参照し、install/reconcile がそのファイルを生成しないため strict mode で block する。

## 問題

`phasegate hook stop` は Stop Hook の Complete Check として `phasegate:complete-check` を実行する設計になっている。しかし実プロセス境界の `ChildProcessCliExecutorAdapter` は command name を `scripts/harness/cli/{slug}.ts` に変換するため、`phasegate:complete-check` は `npx tsx scripts/harness/cli/complete-check.ts` として spawn される。

現在の package / install target / reconcile target には `scripts/harness/cli/complete-check.ts` が存在せず、生成対象にも含まれない。そのため `agentIntegration.stopHook.enforce: true` の環境では missing module による exit 1 が Complete Check failure として扱われ、ユーザーには実際の missing file が見えない `Complete Check failed (exitCode=1)` だけが返る。

## 再現確認

2026-05-16 に現行ローカル `0.160.9` checkout で dogfood した。

```text
$ /Users/jumpei/dev/PhaseGate/node_modules/.bin/tsx /Users/jumpei/dev/PhaseGate/scripts/harness/main.ts init --name hook-stop-repro --agent codex --yes
✓ Harness v0.160.9 initialized (agent: codex)
```

生成された `/private/tmp/phasegate-hook-stop-repro/phasegate.config.json` に以下を追加した。

```json
{
  "agentIntegration": {
    "stopHook": {
      "enforce": true
    }
  }
}
```

その後、Stop Hook を直接実行すると issue 本文と同じ block が再現した。

```text
$ printf '{"session_id":"repro-session"}' | /Users/jumpei/dev/PhaseGate/node_modules/.bin/tsx /Users/jumpei/dev/PhaseGate/scripts/harness/main.ts hook stop
{"decision":"block","reason":"Complete Check failed (exitCode=1)"}
Complete Check失敗 (exitCode=1) — strict mode により turn を block します
```

`NODE_DEBUG=child_process` 付きでは内部 spawn が以下であることを確認した。

```text
args: [ 'npx', 'tsx', 'scripts/harness/cli/complete-check.ts' ]
file: 'npx'
```

同じ一時プロジェクトでは対象 wrapper は存在しない。

```text
$ test -e scripts/harness/cli/complete-check.ts
exit 1
```

`install --dry-run --json` / `reconcile --dry-run --json` の出力を `scripts/harness/cli/complete-check.ts|complete-check` で検索しても該当はなかった。

## 原因分析

| # | Crack | 該当箇所 | 担当 Unit |
|---|-------|---------|-----------|
| 1 | domain/application は `phasegate:complete-check` を canonical command として扱うが、infrastructure adapter が legacy file wrapper path に変換している。 | `ChildProcessCliExecutorAdapter.resolveCommand` | agent-integration |
| 2 | Stop Hook presentation は adapter stderr をユーザーに露出せず、exit code だけで strict block reason を作るため missing module の原因が隠れる。 | `stop-hook.ts` | agent-integration |
| 3 | install/reconcile の managed targets に `scripts/harness/cli/complete-check.ts` が含まれていない。 | `run-install.ts`, `run-reconcile.ts` | installation |
| 4 | public CLI には `phasegate phasegate:complete-check` が存在するため、wrapper path ではなく main CLI dispatch を直接呼ぶ経路が成立する。 | `scripts/harness/main.ts`, harness-api command registry | harness-api |

## 影響

- `agentIntegration.stopHook.enforce: true` の project で turn end が常に block される可能性がある。
- `phasegate phasegate:complete-check` 自体が pass しても Stop Hook では missing wrapper により失敗するため、ユーザーが原因を切り分けにくい。
- install/reconcile の dry-run に修復対象が出ないため、ユーザーは `phasegate install --apply` で直る問題か project-specific extension なのか判断できない。

## 受け入れ基準

- [ ] Stop Hook の Complete Check 実行経路が、存在しない `scripts/harness/cli/complete-check.ts` に依存しない。
- [ ] `phasegate hook stop` は `phasegate:complete-check` が実行可能な通常プロジェクトで missing wrapper を理由に失敗しない。
- [ ] `agentIntegration.stopHook.enforce: true` のとき、実際の Complete Check failure と execution wiring failure が区別できる message / reason を返す。
- [ ] install/reconcile が wrapper を管理する設計を採る場合は、dry-run/apply/reconcile の managed target と package contents に `scripts/harness/cli/complete-check.ts` が含まれる。
- [ ] wrapper を管理しない設計を採る場合は、adapter が canonical CLI (`phasegate phasegate:complete-check` または `scripts/harness/main.ts phasegate:complete-check`) にフォールバックする。
- [ ] `phasegate doctor` または guide が、project-specific complete-check extension を要求する設計かどうかを明示する。
- [ ] regression test が `phasegate hook stop` strict mode の missing wrapper 再発を固定する。

## スコープ外

- Complete Check 自体の lint / validator policy 変更。
- `agentIntegration.stopHook.enforce` の default 値変更。
- Claude Code / Codex の hook event schema 変更。
