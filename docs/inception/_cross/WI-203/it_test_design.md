# WI-203 Integration Test Design: stop hook missing wrapper regression

<!-- @work-item-id WI-203 -->

## Test Strategy

`phasegate hook stop` を process 境界で実行し、project に `scripts/harness/cli/complete-check.ts` が存在しない状態でも canonical Complete Check 経路が使われることを確認する。adapter 単体の mock だけでは、今回の missing file regression を捕捉できないため、CLI integration test を必須にする。

## Cases

| ID | Scenario | Arrange | Act | Assert |
|----|----------|---------|-----|--------|
| IT-WI203-001 | strict mode の Stop Hook が missing wrapper だけを理由に block しないこと | temp project, `agentIntegration.stopHook.enforce=true`, `scripts/harness/cli/complete-check.ts` absent, Complete Check pass fixture | `phasegate hook stop` with stdin `{"session_id":"..."}` | stdout に missing wrapper 由来の `decision:block` が出ない。exit code は Complete Check result と一致する。 |
| IT-WI203-002 | Complete Check validation failure は strict mode block として残ること | temp project, enforce=true, canonical Complete Check が validation failure を返す fixture | `phasegate hook stop` | stdout に `{"decision":"block","reason":"Complete Check failed (exitCode=1)"}`。exit code 2。 |
| IT-WI203-003 | execution wiring failure は missing file を示すこと | adapter に存在しない command path を注入、または CLI 解決不能 fixture | `phasegate hook stop` | stderr/reason が missing command/path と recovery hint を含む。validation failure と区別できる。 |
| IT-WI203-004 | install dry-run が採用設計と一致すること | clean temp project | `phasegate install --dry-run --json` | Option A の場合は wrapper target が存在しないこと、Option B の場合は `scripts/harness/cli/complete-check.ts` が managed target に含まれること。 |
| IT-WI203-005 | reconcile dry-run が採用設計と一致すること | installed project with manifest | `phasegate reconcile --dry-run --json` | Option A/B の install target 方針と矛盾しないこと。 |

## Regression Evidence To Preserve

Current failing behavior:

```text
args: [ 'npx', 'tsx', 'scripts/harness/cli/complete-check.ts' ]
{"decision":"block","reason":"Complete Check failed (exitCode=1)"}
```

この文字列は regression test の failure message または fixture comment に残し、将来の adapter 変更で同じ wrapper path 依存が復活した場合に検知できるようにする。
