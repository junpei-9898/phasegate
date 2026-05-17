---
id: WI-204
type: issue
severity: high
status: tested
affects: [agent-integration, setup, quick-mode, skill-quality]
source: dogfood-feedback
---

# WI-204: config doctor cannot recover Quick Mode strict config blocks

> 起票日: 2026-05-17
> 起票経緯: dogfood feedback. `phasegate-config-doctor` の公式手順が `phasegate.config.json` の `Edit` を前提にしている一方、Quick Mode strict 化後は hook が config 編集そのものを Full Mode required として block し、復旧経路がなくなる。

## 問題

`phasegate-config-doctor` skill の Step 4 は、提案 diff を提示して `AskUserQuestion` で承認を取り、ユーザーが適用対象を確定したら `Edit` で `phasegate.config.json` を変更する、と定義している。

しかし `quick-mode-strict` intent などで `quickMode.allowedCategories` が `["chore"]` に絞られた環境では、`phasegate.config.json` 自体が `config` category と判定される。`config` が allowedCategories 外であるため、PreToolUse hook は `MIXED_CHANGES` により `FULL_MODE_REQUIRED` block を返す。

この状態で hook が案内する managed recovery は `phasegate config:plan --intent retrofit-bootstrap` だが、現行 `retrofit-bootstrap` は `quickMode.allowedCategories` を戻さない。`config:plan --help` にも `quick-mode-relax` のような対称 intent はなく、doctor skill の提案を安全に適用する公式経路がない。

## 再現確認

2026-05-17 に現行ローカル checkout で確認した。

### A. default config では直接 Edit は許可される

PhaseGate repo 自身の現在の `phasegate.config.json` は `quickMode.allowedCategories` に `config` を含む。この状態で `phasegate.config.json` の `Edit` event を PreToolUse hook に渡すと、Quick Mode allowed で exit 0 になる。

```text
phasegate: write allowed (Quick Mode, category=config)
```

したがって「常に `phasegate.config.json` Edit が拒否される」わけではない。

### B. strict 化後は doctor skill の Edit 経路が block される

一時プロジェクト `/private/tmp/phasegate-fb-repro` に `phasegate.config.json` を置き、`quickMode.allowedCategories` を `["chore"]` に変更した。

その cwd から、`phasegate.config.json` に `"docs"` を追加する `Edit` event を PreToolUse hook に渡すと、以下で exit 2 になった。

```text
Full mode 必須変更が検出されました: phasegate.config.json
カテゴリ: config
判定ルール: MIXED_CHANGES
理由: allowedCategories外のファイルが含まれています: phasegate.config.json
次のアクション: phasegate config:plan --intent retrofit-bootstrap --dry-run --json で差分を確認し、承認後に phasegate config:plan --intent retrofit-bootstrap --apply --json を実行してください。
```

### C. official intent に allowedCategories 緩和経路がない

`config:plan --help` の intents は以下だった。

```text
l4-strict, codex-hooks, ci-fail-on-warning, baseline-reset, quick-mode-strict, retrofit-bootstrap, planning-mode-relax
```

`quick-mode-strict` は `quickMode.allowedCategories` を `["chore"]` に置換する。`retrofit-bootstrap` と `planning-mode-relax` は planning / relaxedGates を変更するだけで、`allowedCategories` を `["bugfix", "docs", "test", "config"]` 等に戻さない。

### D. CWD 外 memory path も strict Quick Mode 判定で block される

同じ strict 一時プロジェクトの cwd から、CWD 外の `/Users/jumpei/.claude/projects/example/memory/finding.md` への `Write` event を渡すと、以下で exit 2 になった。

```text
Full mode 必須変更が検出されました: /Users/jumpei/.claude/projects/example/memory/finding.md
カテゴリ: bugfix
判定ルール: MIXED_CHANGES
理由: allowedCategories外のファイルが含まれています: /Users/jumpei/.claude/projects/example/memory/finding.md
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
```

PreToolUse hook は `input.cwd` 外の absolute path を target として保持し、そのまま Quick Mode category 判定に渡す。このため project-local protection ではなく user/runtime memory のような CWD 外 artifact にも PhaseGate の full-mode policy が及ぶ。

## 原因分析

| # | Gap | 該当箇所 | 担当 Unit |
|---|-----|---------|-----------|
| 1 | `phasegate-config-doctor` Step 4 が `Edit phasegate.config.json` を公式適用手順として残しているが、strict Quick Mode では hook がその Edit を block する。 | `skills/phasegate-config-doctor/SKILL.md` | skill-quality |
| 2 | hook の config block guidance が `retrofit-bootstrap` を案内するが、この intent は `quickMode.allowedCategories` を緩和しないため復旧にならない。 | `HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput`, `scripts/harness/main.ts` | agent-integration, setup |
| 3 | `config:plan` に `quick-mode-relax` / `quick-mode-default` のような `allowedCategories` 緩和 intent がない。 | `ConfigChangeIntent`, `buildConfigPatchPreview`, `buildConfigChangePlan` | setup, quick-mode |
| 4 | PreToolUse hook が CWD 外 absolute path を project-local policy の対象から除外しないため、Claude/Codex memory など runtime artifact まで full-mode block される。 | `pre-tool-use-hook.ts` path normalization, `QuickModeFullModeRequirementAdapter` | agent-integration |

## 影響

- `quick-mode-strict` 適用後に `phasegate-config-doctor` を使って Quick Mode を戻そうとしても、doctor の公式 `Edit` 経路では目的地に到達できない。
- hook が案内する `retrofit-bootstrap` は実際の blocked change (`allowedCategories` 緩和) と一致しないため、ユーザーが案内通りに進めても復旧できない。
- strict config のプロジェクトでは CWD 外 memory / runtime state 書き込みも block され、エージェントの学習記録や補助状態保存が PhaseGate の設計フローに巻き込まれる。

## 受け入れ基準

- [x] `phasegate-config-doctor` の適用手順が、direct `Edit` ではなく managed `config:plan --apply` を優先するか、hook と整合した明示的な例外条件を持つ。
- [x] `quickMode.allowedCategories` を安全に標準/緩和方向へ戻す official intent がある。
- [x] `phasegate.config.json` の Full Mode block guidance が、blocked change の種類に合った intent を案内する。
- [x] `quick-mode-strict` 適用後でも、承認済みの managed command で `allowedCategories` に `docs` / `config` などを再追加できる。
- [x] CWD 外 absolute path への user/runtime artifact 書き込みは、project-local PhaseGate policy の対象外にするか、対象にする場合は明示的な allowlist / denylist / guidance を持つ。
- [x] regression test が strict `allowedCategories` 環境での config recovery と CWD 外 memory path の挙動を固定する。

## 実装結果

2026-05-17 に `0.160.11` 向けで対応。

- `config:plan --intent quick-mode-relax` を追加し、`quickMode.allowedCategories` を `["bugfix", "docs", "test", "config"]` に戻せる managed apply path を用意した。
- `phasegate.config.json` の Full Mode block guidance は `retrofit-bootstrap` ではなく `quick-mode-relax` の dry-run/apply を案内する。
- `phasegate-config-doctor` は managed intent がある変更では `config:plan` を優先し、直接 `Edit` を hook-compatible な範囲に限定する。
- PreToolUse hook は `input.cwd` から config を解決し、CWD 外 absolute write target は project-local policy 対象から除外する。
- `phasegate.config.json` は Edit payload snippet が comment-only に見える場合でも `config` category に分類する。

検証:

- `unit/quick-mode/domain/services/quick-mode-judgment-engine.test.ts`
- `integration/agent-integration/handle-pre-tool-use-config-plan-guidance.test.ts`
- `integration/harness-api/cli-hook-dispatch.integration.test.ts`
- `e2e/cli-harness.test.ts`
- local smoke: strict config 後の `phasegate.config.json` Edit hook が `quick-mode-relax` guidance で block

## スコープ外

- Quick Mode のカテゴリ体系そのものの再設計。
- `quick-mode-strict` intent の廃止。
- `phasegate.config.json` を常時 protected file にするかどうかの policy 決定。ただし本 WI では hook guidance と recovery path の整合性を扱う。
