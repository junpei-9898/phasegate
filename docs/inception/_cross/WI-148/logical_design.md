---
traceability:
  initial_creation: true
work_item: WI-148
---

# WI-148 logical design: reconcile + init deprecation

## Scope

`phasegate reconcile --dry-run|--apply [--force] [--json]` を追加し、`.phasegate/manifest.json` に記録済みの PhaseGate-managed target を現行 package bundled template へ追従させる。既存 `update-skills` は破壊せず reconcile alias として残す。`phasegate init` は既存 deploy 挙動を維持しつつ deprecation warning を出す。

## Application flow

1. `ReconcileHandler` が CLI flags を `RunReconcileUseCase` input に変換する。
2. `RunReconcileUseCase` は manifest を読む。manifest が無い場合は manual finding を返し、書き込みは行わない。
3. manifest entry と現行 target table (`.claude/settings.json`, `.codex/hooks.json`, Husky hooks, CI workflow, `package.json`, agent skills symlink) を突き合わせる。
4. entry hash と current file hash が一致する場合は mechanical に bundled template へ追従する。
5. entry hash と current file hash が異なる場合は user 改変ありとして `ai-assisted` にし、`--force` 無しでは refuse する。`--force` 時は `.phasegate/backups/reconcile-*` に退避してから更新する。
6. manifest に無い現行 target は install と同じく追加配置する。
7. apply 成功時は manifest の `version` と entry hash を現行 version / current content hash に更新する。

## Strategy

- JSON: `phasegate` を含む hook entries を managed entry とみなし、user hook entries を保持したまま template hook entries へ置換する。permissions deny は template 由来を最新 template に寄せる。
- shell: `# === phasegate managed (BEGIN) ===` から `END` までの managed block のみ置換する。block 無しの既存 shell は ai-assisted とする。
- package.json: `phasegate:*` scripts と `devDependencies.phasegate` を current version に更新し、user scripts / dependencies は保持する。
- created YAML: user 改変が無い場合は bundled template へ上書きし、改変ありは force 必須とする。
- symlink: `.claude/skills` / `.codex/skills` が無ければ `../skills` symlink を作る。

## CLI compatibility

`update-skills` は `reconcile` handler に委譲する。旧 flags (`--skills`, `--agent`) は reconcile の責務外になったため受け付けず、未知 flag として明示的に失敗させる。

## Product reflection

@work-item-id WI-148
- `scripts/harness/installation/application/usecases/run-reconcile.ts`
- `scripts/harness/installation/presentation/cli/reconcile-handler.ts`
- `scripts/harness/installation/composition-root.ts`
- `scripts/harness/main.ts`
