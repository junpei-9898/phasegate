---
traceability:
  initial_creation: true
---

# WI Documentation Coverage Report

作成日: 2026-05-12

## 目的

全 WI が README / DEVELOPMENT.md / docs/guide / skills README / product docs に、利用方法・開発者運用・CLI・設定・hook・agent/skill の観点で適切に整理されているかを横断調査した。

対象は `docs/inception/**/WI-XXX/description.md` を持つ 147 WI。サブエージェントで分担調査し、容量上限で起動できなかった範囲はローカル検索で補完した。

## 調査分担

| 範囲 | 調査方法 | 状態 |
|---|---|---|
| `_cross/WI-001..036` | ローカル補完 | 容量エラーのため親エージェントで補完 |
| `_cross/WI-085..096` | サブエージェント | 完了 |
| `_cross/WI-106..118` | サブエージェント | 完了 |
| `_cross/WI-119..148` | ローカル補完 | 容量エラーのため親エージェントで補完 |
| `ci-governance`, `harness-api`, `harness-error`, `nyquist-validation` | サブエージェント | 完了 |
| `phase-dependency-model`, `quick-mode`, `regression-suite`, `skill-quality` | サブエージェント | 完了 |
| `traceability-model`, `validator-system`, `agent-integration` | ローカル補完 | スレッド上限のため親エージェントで補完 |

## 総評

README は導入・概念・主要 CLI の入口として整っており、`docs/guide/*` は多くの詳細を吸収している。特に installation lifecycle (`install` / `doctor` / `uninstall` / `reconcile`), Codex/Claude hooks, L0-L4, Quick Mode, work item taxonomy は公開面に反映済み。

一方で、WI の進行に対して README / DEVELOPMENT.md / guide の粒度が揃っていない領域が残る。重大度が高いのは、公開 CLI 名や設定意味が不一致な箇所、L4 / status / drift の運用意味が詳細 guide に偏っている箇所、skills README と DEVELOPMENT.md の skill 数・init オプションが古い箇所。

## 優先対応ギャップ

### P0: 公開ドキュメントと実装契約の不一致

1. `WI-093`: `docs/guide/configuration.md` の `paths.designDocs` 説明が古い。
   - 現状: product-wide artifacts は `paths.designDocs` の対象外で literal `docs/product` と説明している。
   - WI 側: `{designDocsRoot}/../...` として product root を導出する設計。
   - 更新候補: `docs/guide/configuration.md`

2. `WI-068`: plan checker の公開コマンド名が不一致。
   - `docs/inception/skill-quality/WI-068/scenario_test_design.md` は `skill:run-plan-checker` を期待。
   - `docs/product/construction/skill-quality/logical_design.md` は `harness:skill-quality:plan-checker` を記載。
   - `DEVELOPMENT.md` / `docs/guide/cli-reference.md` には `skill:run-plan-checker` がない。
   - 更新候補: 公開コマンドにするか internal-only にするかを決め、4 文書を揃える。

3. `WI-046`: HarnessError の追加フィールドが product docs に未反映。
   - `docs/guide/retrofit-adoption.md` は `suggestedSkill` を説明済み。
   - `docs/product/construction/harness-error/*` と `docs/product/units/harness_error_unit.md` は `suggestedSkill`, `scaffoldCommand`, `templatePath` を明確に扱っていない。

4. `WI-041`: staged Markdown metadata validation が `phasegate pre-commit` に乗ることが公開面で弱い。
   - 更新候補: `docs/guide/hooks-integration.md` または `docs/guide/cli-reference.md`

### P1: README / guide の CLI 表面不足

1. `WI-042`, `WI-044`, `WI-050`: README の CLI 表が不足。
   - 欠落候補: `phasegate:check-ready`, `phasegate:detect-drift`, `phasegate:impact-analysis`
   - 併せて README は `ci-check` と記載しており、`docs/guide/cli-reference.md` の `phasegate:ci-check` と命名を揃える必要がある。

2. `WI-057`: README が `ci-check --quick --fail-on-reject --dry-run --files` を案内していない。
   - 詳細は `docs/guide/cli-reference.md` にあるため、README にはリンクまたは短い注記で十分。

3. `WI-061..065`: regression-suite コマンドが README にない。
   - `DEVELOPMENT.md` / `docs/guide/cli-reference.md` には反映済み。
   - README では全列挙ではなく「Regression commands は CLI reference 参照」でも可。

4. `WI-066..071`: skill-quality CLI が README にない。
   - 欠落候補: `skill:execute-tdd-cycle`, `skill:check-coverage`, `skill:collect-lessons`, `skill:apply-cascade-update`, `skill:validate-structure`

5. `WI-090`, `WI-091`: `init --skills`, `--yes`, subcommand `--help` / `-h`, unknown flag suggestion の案内が薄い。
   - 更新候補: `docs/guide/cli-reference.md`, 必要に応じて README

### P1: L4 / status / drift の運用意味の不足

1. `WI-107`, `WI-117`, `WI-118`: L4 fail-on-warning の前提条件が README では弱い。
   - `docs/guide/layer-model.md` には G3 advisory preconditions がある。
   - README の strict / L4 説明にも「warning を失敗化する前提」を短く追加すると誤用を避けられる。

2. `WI-112`, `WI-096`, `WI-123`: `phasegate:status --json` の状態意味が不足。
   - product docs は `configurationState`, `cachedArtifactState`, `liveValidationState`, hook/baseline health, effective layer enablement を扱う。
   - `README.md` / `docs/guide/cli-reference.md` は health summary 程度の説明に留まる。

3. `WI-114`: `phasegate:detect-drift --json` の compact report semantics が公開面で弱い。
   - product docs は category summary / severity / next action を扱う。
   - `README.md` / `docs/guide/cli-reference.md` に JSON の主要キーと用途を短く追加する。

4. `WI-110`, `WI-111`: `L2-013 cli-e2e-test-existence` が layer guide にない。
   - 更新候補: `docs/guide/layer-model.md` の L2 validator 表。
   - `missing` と `limitation` の違いも併記する。

### P1: WI taxonomy / legacy ID の説明不足

1. `WI-106`: WI ID の全 inception 横断一意性が README / CLI reference で弱い。
   - `docs/folder_management_rules.md` には明記済み。
   - README / `docs/guide/cli-reference.md` に `_cross` と unit 配下を跨いで一意であることを追加。

2. `WI-115`: legacy ID 解決の unit-scoped ambiguity behavior が guide に不足。
   - README は legacy annotations の互換を説明済み。
   - `docs/guide/cli-reference.md` / `docs/guide/configuration.md` は `@work-item-id` first, legacy compatibility, unit-scoped lookup, ambiguity behavior まで揃える。

### P1: installation / hooks / skills 周辺の陳腐化

1. `WI-086`, `WI-087`: monorepo auto-detection と Bash 3.2 portability が installation / hooks guide で弱い。
   - 更新候補: `README.md`, `docs/guide/installation.md`, `docs/guide/hooks-integration.md`

2. `WI-088`, `WI-089`, `WI-127`: `skills/README.md` が古い。
   - 現状は symlink 説明中心。
   - 30 skills、operations skills (`/phasegate-config-doctor`, `/phasegate-toolkit-guide`)、Claude/Codex links、貢献・追加の現行方針に更新する。

3. `WI-089`, `WI-090`: `DEVELOPMENT.md` が古い。
   - `28 skills` / `init --skills core|aidlc|all` が残る。
   - 現行 README / guide の 30 skills と WI-090 の scope に合わせる。

4. `WI-144..148`: installation lifecycle は README / installation guide / product docs に概ね反映済み。
   - 追加候補: `DEVELOPMENT.md` に installation unit / command dispatch の開発者向け節を追加。

5. `WI-088`, `WI-089`, `WI-145`: bundled guidance skills 自体も update 対象。
   - `skills/phasegate-config-doctor/SKILL.md` は `phasegate.config.json` 診断に寄りすぎており、WI-145 doctor report の `suggestedSkill=phasegate-config-doctor` から呼ばれる hook / Husky / Codex / manifest 修復相談を扱えない。
   - `skills/phasegate-toolkit-guide/SKILL.md` は canonical docs への案内としては有効だが、install lifecycle (`install` / `doctor` / `uninstall` / `reconcile`), doctor finding, manifest, Codex feature flag, pre-commit backstop を専用カテゴリとして持っていない。
   - 両 skill の境界定義を「read-only setup Q&A は toolkit-guide」「doctor finding に基づく設定・hook merge 方針提案は config-doctor」に更新する。

### P2: product reflection の精度

1. `WI-037..050`: 一部 product docs が legacy `@story-id Hxx-xx` 中心で、`@work-item-id WI-XXX` が薄い。
   - legacy 互換上は許容だが、新規追記時は `@work-item-id` 併記が望ましい。

2. `WI-072`: `docs/product/construction/skill-quality/domain_model.md` と `unit_test_design.md` には反映があるが、`logical_design.md` に `CommitMessage.workItemId` / `Work-Item: WI-XXX` の短い設計説明がない。

3. `WI-097..103`: agent-integration product reflection は `WI-097` に偏っている。
   - `WI-098..103` の hook adapter / full-mode integration / session context などは guide には散在するが、product docs の `@work-item-id` 粒度を追加確認・補強する余地がある。

## 十分に整理されている領域

- `WI-051..054` phase-dependency-model: product docs と README / CLI reference の annotation behavior は概ね整合。
- `WI-055..060` quick-mode: README, DEVELOPMENT.md, configuration guide, quick-vs-full guide, CLI reference, quick-implementor skill に広く反映済み。
- `WI-085`, `WI-094`, `WI-095`: paths placeholder, warning aggregation, pointer syntax は guide / product docs に反映済み。
- `WI-104`, `WI-105`: retrofit baseline と scaffold-design は README / CLI reference / configuration / retrofit guide に十分反映済み。
- `WI-107`, `WI-108`, `WI-113`, `WI-116`: L4 advisory, ci-check, validate format, L4-004/L4-005 registration は概ね整理済み。ただし README への caveat 追加は推奨。
- `WI-124`, `WI-128`: live validator registry と L4 operational rollout は product docs / layer guide / README の feature inventory に反映済み。
- `WI-143..148`: WI-first workflow と installation lifecycle は README / installation guide / product docs に反映済み。

## 推奨更新順

1. P0 の不一致を修正する。
   - `docs/guide/configuration.md` (`WI-093`)
   - `WI-068` command naming の統一
   - `docs/product/construction/harness-error/*` / `docs/product/units/harness_error_unit.md` (`WI-046`)
2. README と CLI reference の命名・主要 CLI を揃える。
   - `phasegate:ci-check`, `phasegate:check-ready`, `phasegate:detect-drift`, `phasegate:impact-analysis`
   - `ci-check --quick`
   - `phasegate:status --json` / drift JSON semantics
3. `DEVELOPMENT.md` と `skills/README.md` の陳腐化を直す。
   - skill 数、`init --skills`、L0-L4 表現、installation lifecycle、Nyquist CLI wiring
4. L2 / L4 / WI taxonomy の運用 caveat を guide に追加する。
   - `L2-013`
   - WI ID global uniqueness
   - legacy ID unit-scoped ambiguity
   - fail-on-warning preconditions

## Guidance Skill 追加確認

ユーザー指摘に基づき、phasegate setup を支援する bundled guidance skills 2 件を追加確認した。

### `/phasegate-config-doctor`

現状の役割は `phasegate.config.json` の schema / project detection ベース診断であり、architecture preset, Quick Mode, baseline, Stop hook strict mode, hook-config を扱う。

更新した方がよい点:

1. `phasegate doctor` report 入力を扱う手順を追加する。
   - WI-145 では `claude-hook-missing`, `codex-hook-missing`, `husky-pre-commit-missing`, `husky-commit-msg-missing` の ai-assisted repair に `phasegate-config-doctor` が割り当てられている。
   - 現 skill は `.phasegate/manifest.json`, `.phasegate/last-doctor-report.json`, `.claude/settings.json`, `.codex/hooks.json`, `.husky/*`, `.github/workflows/*` を read 対象に含めていない。

2. `init` 再実行案内を `install` / `reconcile` 中心に更新する。
   - 現 skill は monorepo targetDirs や bash 3.2 script 更新で `phasegate init` 再実行を推奨している。
   - 現行 docs は既存 project では `install --dry-run` / `install --apply`、upgrade では `reconcile --dry-run` / `reconcile --apply` を正路としている。

3. `.codex/hooks.json` と Codex feature flag を診断対象に加える。
   - 現 skill の hook config 調査は `.claude/scripts/hook-config.json` 中心。
   - Codex は native `apply_patch` limitation と pre-commit backstop があるため、setup 診断で `.codex/hooks.json`, `.husky/pre-commit`, `codex features enable codex_hooks` の状態確認が必要。

4. 変更後検証を L2 固定からケース別にする。
   - config 変更だけなら `npx phasegate validate --layer L2` は妥当。
   - hook / manifest / install repair 後は `npx phasegate doctor`, `npx phasegate lint`, `npm run phasegate:check-ready` も候補に入れるべき。

### `/phasegate-toolkit-guide`

現状の役割は canonical docs の読み取り案内であり、L0-L4, presets, Quick/Full, hooks, config, CLI, installation, skills, Codex 統合を参照できる。基本構造は妥当。

更新した方がよい点:

1. install lifecycle を独立カテゴリにする。
   - 現 skill は「インストールと初期設定」で installation / retrofit guide を読むだけ。
   - `init` は legacy-compatible bootstrap、既存 project は `install`、upgrade は `reconcile`、削除は `uninstall`、検査は `doctor` という選択ルールを明示した方がよい。

2. doctor finding の読み方を追加する。
   - `repairMode: mechanical | ai-assisted | manual`
   - `repairHint`
   - `suggestedSkill`
   - これにより `phasegate doctor` の出力を受けたユーザーに、いつ `/phasegate-config-doctor` へ切り替えるべきか案内できる。

3. setup Q&A の代表質問を増やす。
   - 「phasegate doctor が red」
   - 「既存 Husky script と merge してよいか」
   - 「Codex で hook が効かない」
   - 「manifest hash mismatch で reconcile/uninstall が refuse された」

4. canonical docs の探索先に installation unit / product docs を追加するか検討する。
   - public guide に十分な説明があれば不要。
   - doctor report semantics などが guide に薄い間は `docs/product/construction/installation/*` への fallback pointer があると回答精度が上がる。

## PhaseGate 設定・状態ファイル棚卸し

ユーザー指摘に基づき、`phasegate.config.json`, `.claude/settings.json`, `.codex/hooks.json` 以外の setup 関連ファイルを追加調査した。結論として、PhaseGate の「適切なセットアップ」を診断するには、少なくとも以下を認識対象に含める必要がある。

### Canonical config / policy

| パス | 役割 | 診断観点 |
|---|---|---|
| `phasegate.config.json` | PhaseGate quality settings SSOT | schema, presets, paths, layers, quickMode, protectedFiles, baseline, agentIntegration |
| `package.json` | package scripts / `devDependencies.phasegate` | `install` が `phasegate:*` scripts と devDependency を merge。doctor は phasegate dependency 欠落を red とする |
| `biome.json` / `.biome.json` | L1 formatter / lint policy | protected file 対象。hook formatter と整合しているか確認 |
| `tsconfig.json` | TypeScript compiler policy | protected file 対象。analyze hook / tests / lint 前提として確認 |
| `pnpm-workspace.yaml` / `lerna.json` | workspace detection input | hook-config targetDirs 自動検出の根拠 |

### Agent hook config

| パス | 役割 | 診断観点 |
|---|---|---|
| `.claude/settings.json` | Claude Code hook / permissions | PhaseGate hook entries があるか、既存 hook と merge されているか、deny policy が壊れていないか |
| `.claude/settings.local.json` | Claude local override | user-local なので managed 対象外。ただし local override が hooks / permissions を変えている場合は診断時に読む価値がある |
| `.claude/scripts/hook-config.json` | legacy shell hook formatter/analyzer config | `targetDirs`, `formatter`, `formatterArgs`。monorepo / formatter detection の確認対象 |
| `.codex/hooks.json` | Codex project-local hooks | SessionStart / UserPromptSubmit / PreToolUse(Bash) / PostToolUse(Bash) / Stop の PhaseGate hooks |
| user-level `~/.codex/config.toml` or project `.codex/config.toml` | Codex hooks feature flag | repo 外の場合が多い。`codex_hooks = true` または `codex features enable codex_hooks` の確認が必要 |
| `.claude/skills` / `.codex/skills` | agent-facing skill symlink | `../skills` を指すか。doctor は symlink 不備を red とする |
| `skills/.harness-version` | deployed skill set / version metadata | `update-skills` / `reconcile` 互換経路の判断材料 |

### Git hook / CI config

| パス | 役割 | 診断観点 |
|---|---|---|
| `.husky/pre-commit` | local L1/L2/pre-commit gate | `phasegate pre-commit` または相当の managed block があるか |
| `.husky/commit-msg` | Work-Item trailer / bypass trailer validation | `phasegate commit-msg "$1"` があるか |
| `.husky/pre-push` | bypass audit backstop | `phasegate bypass:audit --base origin/main --head HEAD` があるか |
| `.github/workflows/phasegate-aidlc-gate.yml` | install-managed PR gate | `install` の現在の target。既存 `aidlc-gate.yml` / `ci.yml` との意味的重複も確認 |
| `.github/workflows/consistency-check.yml` | L4 scheduled audit | `ci:generate-template --type consistency-check` 由来。install target ではないが setup 完成度には関係 |
| `.github/workflows/agent-context-refresh.yml` | AGENTS.md / CLAUDE.md refresh | `init --with-ci` / template generation 文脈で確認 |

### PhaseGate runtime state

| パス | 役割 | 診断観点 |
|---|---|---|
| `.phasegate/manifest.json` | install / uninstall / reconcile の managed target registry | WI-145..148 の中核。存在、hash、entry mode (`created` / `merged` / `symlink`) を確認 |
| `.phasegate/baseline.json` | retrofit grandfather snapshot | `baseline.enabled` / `baseline.path` と整合するか。commit 対象 |
| `.phasegate/hook-skip-events.jsonl` | hook skip observability | WI-123。`phasegate:status --json` が skip counts / latest skip を読む |
| `.phasegate/backups/*` | force install / uninstall / reconcile backup | 通常は commit 対象外。hash mismatch / force repair の確認材料 |
| `.phasegate/uninstalled-*.json` | uninstall archive manifest | uninstall 済み履歴。再 install / cleanup 判断材料 |
| `.phasegate/last-doctor-report.json` | optional doctor report output | `doctor --report-out` 指定時のみ。skill が入力として読めると便利 |
| `.harness/completion-state.json` | legacy / runtime completion state | 古い completion / hook 系の状態。現行 setup 診断では優先度低だが、残存時は drift として見る余地あり |
| `.harness/error-history.json` | regression / repetition history | product docs 上は ci-governance の状態ファイル。現行 repo では `.harness/completion-state.json` が存在 |
| `.harness/reports/*` | reporting output | `reporting.outputDir` 既定値の出力先 |

### Harness-generated operational artifacts

| パス | 役割 | 診断観点 |
|---|---|---|
| `.harness/requirement-test-matrix.json` | Nyquist requirement/test matrix | `phasegate:generate-matrix` の既定出力。`phasegate:impact-analysis` / L3 Nyquist が読む |
| `docs/contracts/requirement-test-matrix.schema.json` | matrix schema | Nyquist matrix validation の契約。npm package 同梱と docs 配置を確認 |
| `docs/contracts/lesson-artifact.schema.json` | lesson artifact schema | skill-quality lesson artifact の契約 |
| `.harness/lesson-artifacts/{id}.json` | collected lessons | `skill:collect-lessons --write-artifact` 系の出力。cascade update / lesson collection の入力候補 |
| `.harness/coverage-summary.json` | skill-quality coverage summary | `VitestCoverageRunnerAdapter` が読む固定パス |
| `coverage/coverage-summary.json` | Istanbul/Vitest coverage summary | validator-system L3 coverage adapter の代表入力。CLI 引数で別 path もあり得る |
| `${reporting.outputDir}/phase-override-audit.jsonl` | phase override audit log | `reporting.outputDir` 既定は `reports`。phase-dependency-model が append |
| `reports/regression/{suiteId}-result.json` | regression suite result | regression-suite composition root の出力先。現行 repo に `reports/regression/*` が存在 |
| `k-requirements-result.json` / `gng-gate-result.json` | legacy/top-level regression result | 現行 repo に存在。新経路 `reports/regression/` への移行・残存確認対象 |
| `.harness/reports/*` / `reports/*` | general report output | config の `reporting.outputDir` と実際の出力場所が混在していないか確認 |

### Agent context / instruction files

| パス | 役割 | 診断観点 |
|---|---|---|
| `AGENTS.md` | agent instruction pointer / WI workflow rule | `ci:auto-refresh-agent-context`, `p2:check-agent-context`, `emit-agent-rules` の対象 |
| `CLAUDE.md` | Claude-specific standard section | `refresh-claude-md` / agent-context-refresh の対象 |
| `docs/templates/agent-context/CLAUDE.md.template.md` | CLAUDE.md template source | template と deployed `CLAUDE.md` の drift |

### Template sources bundled by PhaseGate

| パス | 役割 |
|---|---|
| `templates/.claude/settings.json` | Claude hook template |
| `templates/.claude/scripts/hook-config.json` | shell hook config template |
| `templates/.codex/hooks.json` | Codex hook template |
| `templates/.husky/*` / `docs/templates/hooks/*` | Husky hook templates |
| `docs/templates/ci/*.yml` / `scripts/harness/templates/.github/workflows/*.yml` | CI workflow templates |
| `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json` / `v3.schema.json` | config schema |
| `scripts/harness/config-foundation/infrastructure/presets/*.json` | defense preset definitions |

### Legacy / deprecated but still visible

| パス | 状態 | 扱い |
|---|---|---|
| `.harness-hooks.yml` | Fuse hooks era の legacy 設定。`DEVELOPMENT.md` / `docs/guide/cli-reference.md` に `hooks:config validate` が残る | 現行 L0 は agent runtime hooks + Husky。guidance skill では legacy として説明し、現行 setup の必須対象にはしない |
| `.harness/context-priority.json`, `.harness/session-state.json`, `.harness/roadmap.json` | archive docs に残る旧構想 | 現行 setup 診断対象外。存在した場合は旧残骸として扱う |
| `.harness/backups/*` | archive docs の旧 backup 位置 | 現行 force backup は `.phasegate/backups/*` |
| `README.ja.md` | 旧文書参照に残るが現行 repo には見当たらない | docs 参照の stale link 候補 |

### Install / doctor target matrix

実装コードから確認した現行 `phasegate install` / `doctor` の直接対象:

| Target | install | doctor | 備考 |
|---|---:|---:|---|
| `.claude/settings.json` | yes | yes | JSON merge。user customization がある場合も mechanical merge 可能だが、doctor は missing/custom を判定 |
| `.codex/hooks.json` | yes | yes | JSON merge。user-level Codex feature flag は repo 外なので別確認 |
| `.husky/pre-commit` | yes | yes | shell managed block。custom script は ai-assisted / force 判断 |
| `.husky/commit-msg` | yes | yes | Work-Item trailer enforcement |
| `.husky/pre-push` | yes | yes | bypass audit backstop。doctor severity は warn |
| `.github/workflows/phasegate-aidlc-gate.yml` | yes | broad check | doctor は `.github/workflows/` 内に phasegate / aidlc-gate / consistency-check があるかを見る |
| `package.json` | yes | yes | devDependency と `phasegate:*` scripts merge / reverse |
| `.claude/skills` | yes | yes | symlink to `../skills` |
| `.codex/skills` | yes | yes | symlink to `../skills` |
| `.phasegate/manifest.json` | written | loaded | manifest parse error も診断対象にすべき |

注意: README / guide では `.github/workflows/aidlc-gate.yml` と説明される箇所がある一方、WI-146 implementation target は `.github/workflows/phasegate-aidlc-gate.yml`。ドキュメント上はこの命名差分も確認対象。

### 認識漏れとして重要なもの

1. `.phasegate/manifest.json` は最重要。
   - `install`, `uninstall`, `reconcile` の正本で、これを見ない setup doctor は現行仕様を診断できない。

2. `.claude/scripts/hook-config.json` はまだ重要。
   - `.claude/settings.json` だけ見ても、formatter / targetDirs / bash 3.2 portability / monorepo 対応の判断が抜ける。

3. `.husky/*` と `package.json` は setup の一部。
   - Codex native `apply_patch` limitation の backstop は pre-commit なので、Codex setup では `.husky/pre-commit` の有無が特に重要。

4. user-level Codex config は repo 外にある。
   - `.codex/hooks.json` が正しくても `codex_hooks` feature flag が無効なら hook が動かない。skill では「確認コマンド / 確認事項」として扱う必要がある。

5. `.phasegate/baseline.json` と `.phasegate/hook-skip-events.jsonl` は運用状態。
   - 前者は phase-gate skip の正当性、後者は hook skip の観測性に関わる。`phasegate:status --json` の説明にも反映すべき。

6. `AGENTS.md` / `CLAUDE.md` は PhaseGate の実行設定ではないが、agent が WI-first workflow を守るための setup artifact。
   - `ci:auto-refresh-agent-context`, `p2:check-agent-context`, `refresh-claude-md` とセットで guidance skill の認識対象に含める。

7. `.harness/*` は一枚岩ではない。
   - 現行 active なものは `.harness/requirement-test-matrix.json`, `.harness/lesson-artifacts/*`, `.harness/coverage-summary.json`, `.harness/error-history.json`, `.harness/reports/*` など。
   - archive 由来の `.harness-hooks.yml`, `.harness/session-state.json`, `.harness/context-priority.json` は旧構想扱いで、存在すれば残骸として見る。

8. `reporting.outputDir` の既定と実出力が混在している。
   - `phasegate.config.json` 生成テンプレートは `reporting.outputDir: "reports"`。
   - 一部 composition/test は `.harness/reports` を既定 fallback とする。
   - setup / config doctor は `reports`, `.harness/reports`, `reports/regression` の使い分けを説明できる必要がある。

9. docs contract schemas も setup artifact。
   - `docs/contracts/requirement-test-matrix.schema.json` と `docs/contracts/lesson-artifact.schema.json` は runtime config ではないが、Nyquist / skill-quality の file contract なので、package/install/docs consistency 監査に含めるべき。

## 備考

今回の作業では既存の未コミット変更には触れず、このレポートのみを新規追加した。サブエージェント容量エラーにより一部範囲は親エージェントが同じ観点でローカル補完したため、必要なら次工程で P0/P1 の各項目を個別 WI として再調査・修正文書化する。
