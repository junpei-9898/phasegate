# WI-203 Logical Design: stop hook complete-check execution path

<!-- @work-item-id WI-203 -->

## 方針

Stop Hook は project-local の未生成 wrapper に依存せず、PhaseGate が公開している canonical command を実行する。修正案は二択だが、既存設計との整合性は adapter 側で command name を canonical CLI dispatch に解決する案が高い。

## Option A: adapter fallback to canonical CLI

`ChildProcessCliExecutorAdapter` は `phasegate:*` command を `scripts/harness/cli/{slug}.ts` へ変換しない。少なくとも `phasegate:complete-check` は、現在実行中 package の `scripts/harness/main.ts phasegate:complete-check` または installed `phasegate phasegate:complete-check` を直接呼ぶ。

期待される性質:

- install/reconcile target を増やさずに既存 package contents だけで動く。
- `phasegate:lint` など他 command の互換影響を調査して段階的に適用できる。
- Stop Hook の failure reason は実 Complete Check failure に近づく。

## Option B: install managed wrapper

`scripts/harness/cli/complete-check.ts` を package template として追加し、install/reconcile が project に生成する。

期待される性質:

- 現在の adapter 変換規則を維持できる。
- project-specific extension point として説明しやすい。

リスク:

- 生成された wrapper と package version の drift 管理が必要になる。
- `tsx` devDependency など project 側 dependency 前提が増える。
- wrapper が extension point なのか mandatory managed file なのかを doctor/docs で明確化する必要がある。

## 推奨

第一候補は Option A。`phasegate:complete-check` は harness-api の public command なので、Stop Hook は file wrapper ではなく public command dispatch に接続する方が責務境界に合う。Option B を採る場合は install/reconcile/doctor/docs/package files を同時に更新する。

## Error UX

strict mode の block reason は、Complete Check の exit code だけでなく execution wiring failure を区別できる contract にする。

例:

```json
{"decision":"block","reason":"Complete Check execution failed: missing scripts/harness/cli/complete-check.ts"}
```

ただし実 Complete Check が validation failure を返した場合は、従来の `Complete Check failed (exitCode=N)` を維持する。
