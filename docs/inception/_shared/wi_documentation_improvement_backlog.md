---
traceability:
  initial_creation: true
---

# WI Documentation Improvement Backlog

作成日: 2026-05-12

## 目的

`docs/inception/_shared/wi_documentation_coverage_report.md` の調査結果を、正式に起票すべき WI 候補へ落とし込む。対象は README / DEVELOPMENT.md / docs/guide / skills / product docs / setup inventory の改善であり、既存 WI の単なる追記ではなく、PhaseGate の公開契約として保守すべき単位に分解する。

現時点の最大 WI は `WI-148` なので、新規起票する場合は `WI-149` 以降を使う。

## 追加調査: WI 切り方の再評価

ユーザー依頼に基づき、`WI-149..167` の切り方が本当に適切かを、6 サブエージェントで setup/config/install、validator/layer、CLI/public docs、skills/agent integration、product construction、schema/preset/quality guardrails に分けて再調査した。

結論:

1. `WI-149..167` の大枠は維持する。
2. ただし `WI-150`, `WI-152`, `WI-153`, `WI-156`, `WI-159`, `WI-161`, `WI-165`, `WI-166`, `WI-167` は scope / 受け入れ条件を強化する。
3. product 正本まで含めるなら、追加で `WI-168` と `WI-169` が必要。
4. `WI-170` は `p2:check-initial-creation` / `phase2Extensions.initialCreationExpirationRules` を公開設定として扱う場合だけ起票する。
5. 認知漏れだった品質向上ポイントは、Quick Mode validator 維持設定、doctor check coverage、manifest parse error、Codex / Claude hook coverage 差分、schema と実装の config key 差分、product unit / ADR 上位契約である。

## 起票方針

今回の改善は「ドキュメント修正」だけに見えるが、実態は次の 4 種類に分かれる。

1. 公開契約の不一致修正
   - 実装・product docs・guide・README の間で、コマンド名や設定意味が食い違っているもの。
   - これは P0 として独立 WI 化する。

2. 利用者が迷う表面の整理
   - README / CLI reference / installation guide / layer guide に、既に実装済みの利用方法が十分に出ていないもの。
   - 複数 WI の成果をまとめて公開面に反映する cross-cutting WI とする。

3. setup / doctor / skills の現行仕様への追従
   - install lifecycle, manifest, Codex hooks, Husky, guidance skill の責務境界。
   - これは PhaseGate 導入体験そのものなので、単なる README 修正に混ぜない。

4. 再発防止
   - CLI 名、skill 数、install target 名、doctor target 名、schema/config path などは今後も drift しやすい。
   - 一回の手修正で終わらせず、検出・棚卸しの仕組みを WI 化する価値がある。

## Must 起票

### WI-149: Public Documentation Contract Mismatch Remediation

- 配置: `docs/inception/_cross/WI-149/`
- type: `issue`
- severity: `high`
- 目的: 実装契約と公開ドキュメントが食い違っている P0 項目を一括で解消する。
- 対象:
  - `WI-093`: `paths.designDocs` と product root 導出の説明差分。
  - `WI-068`: plan checker の公開コマンド名不一致。
  - `WI-046`: `HarnessError` の `suggestedSkill`, `scaffoldCommand`, `templatePath` product docs 未反映。
  - `WI-041`: staged Markdown metadata validation が `phasegate pre-commit` に乗ることの公開説明不足。
- 主要成果物:
  - `docs/guide/configuration.md`
  - `docs/guide/cli-reference.md`
  - `docs/guide/hooks-integration.md`
  - `DEVELOPMENT.md`
  - `docs/product/construction/harness-error/*`
  - `docs/product/units/harness-error_unit.md`
- 受け入れ条件:
  - 上記 4 件について、実装・product docs・guide の説明が同じ名前・同じ意味で読める。
  - `skill:run-plan-checker` / `harness:skill-quality:plan-checker` のどちらを正とするかが決まっている。
  - 修正箇所に `@work-item-id WI-149` が付く。
- 依存:
  - なし。最優先で起票する。

### WI-150: Public CLI Catalog Consolidation

- 配置: `docs/inception/_cross/WI-150/`
- type: `issue`
- severity: `high`
- 目的: README / CLI reference / DEVELOPMENT.md に出る CLI 表面を、現在の実装・npm scripts・guide と揃える。
- 対象:
  - `phasegate:ci-check` と `ci-check` 表記揺れ。
  - `phasegate:check-ready`
  - `phasegate:detect-drift`
  - `phasegate:impact-analysis`
  - `ci-check --quick --fail-on-reject --dry-run --files`
  - regression-suite CLI
  - skill-quality CLI
  - `init --skills`, `--yes`, subcommand `--help` / `-h`, unknown flag suggestion
  - `phasegate:generate-matrix`
  - `emit-agent-rules`
  - `scaffold-wi`
  - `p2:check-initial-creation`
  - `hook session-start` / `hook user-prompt-submit`
  - `validate --fail-on-warning` / `--no-fail-on-warning` / `--no-l4`
  - setup lifecycle の `--json` variants (`install` / `reconcile` / `uninstall` / `doctor`)
- 主要成果物:
  - `README.md`
  - `DEVELOPMENT.md`
  - `docs/guide/cli-reference.md`
- 受け入れ条件:
  - README は入口として主要コマンドと参照先を示し、全列挙は CLI reference に寄せる。
  - CLI reference は npm script 名、binary subcommand、help 表示のどれを指すかを混同しない。
  - `package.json` scripts に存在しない `phasegate:*` command を「npm script」と誤読させない。
  - `scripts/harness/main.ts` help に載る公開 command は、public docs に載せるか internal / compatibility 扱いとして理由を明確にする。
  - regression-suite / skill-quality / quick CI の使い道が、初見でも辿れる。
- 依存:
  - `WI-149` の command naming 決定後に着手するのが安全。

### WI-151: Layer Status Drift Semantics Guide

- 配置: `docs/inception/_cross/WI-151/`
- type: `issue`
- severity: `normal`
- 目的: L2 / L4 / status / drift の運用意味を、利用者が CI やローカル運用で誤用しない粒度まで公開 guide に出す。
- 対象:
  - `phasegate:status --json`
  - `phasegate:detect-drift --json`
  - `configurationState`
  - `cachedArtifactState`
  - `liveValidationState`
  - hook / baseline health
  - effective layer enablement
  - `L2-013 cli-e2e-test-existence`
  - `missing` と `limitation` の違い
  - L4 fail-on-warning の前提条件
- 主要成果物:
  - `README.md`
  - `docs/guide/cli-reference.md`
  - `docs/guide/layer-model.md`
  - 必要なら `docs/guide/configuration.md`
- 受け入れ条件:
  - JSON 出力の主要キーと、それを人間・CI・agent がどう使うかが説明されている。
  - L4 warning を失敗扱いにする条件が README からも分かる。
  - `L2-013` が layer guide の validator 表に載る。
- 依存:
  - `WI-150` と並行可能。ただし CLI 名は `WI-150` に合わせる。

### WI-152: PhaseGate Setup Artifact Inventory Documentation

- 配置: `docs/inception/_cross/WI-152/`
- type: `story`
- severity: `high`
- 目的: PhaseGate の「正しくセットアップされている状態」を、設定ファイル・hook・manifest・runtime state の棚卸しとして公開 docs に定義する。
- 対象:
  - `phasegate.config.json`
  - `package.json`
  - `preCommit.implementationExtensions`
  - `validate.failOnWarning`
  - `agentIntegration.stopHook.enforce`
  - `phaseDependencies.gates` / `phaseDependencies.storyReflection`
  - `protectedFiles.exclude` と実装側 `protectedFiles.patterns` の扱い
  - `baseline.enabled` / `baseline.path`
  - `quickMode.fullModeRequiredWhen.*`
  - `.claude/settings.json`
  - `.claude/settings.local.json`
  - `.claude/scripts/hook-config.json`
  - `.codex/hooks.json`
  - user/project Codex config
  - `.husky/*`
  - `.github/workflows/*`
  - `.phasegate/manifest.json`
  - `.phasegate/baseline.json`
  - `.phasegate/hook-skip-events.jsonl`
  - `.phasegate/backups/*`
  - `.phasegate/uninstalled-*.json`
  - `.phasegate/last-doctor-report.json`
  - active `.harness/*` artifacts
  - `AGENTS.md` / `CLAUDE.md`
- 主要成果物:
  - `docs/guide/installation.md`
  - `docs/guide/hooks-integration.md`
  - `docs/guide/configuration.md`
  - `docs/guide/retrofit-adoption.md`
  - 必要なら新規 `docs/guide/setup-artifacts.md`
- 受け入れ条件:
  - `phasegate.config.json`, `.claude/settings.json`, `.codex/hooks.json` だけ見れば足りる、という誤解がなくなる。
  - managed target / generated artifact / runtime state / legacy artifact / user-level setting が明確に分かれる。
  - `.github/workflows/phasegate-aidlc-gate.yml` と `.github/workflows/aidlc-gate.yml` の命名差分を解消または説明する。
  - `reporting.outputDir`, `reports`, `.harness/reports`, `reports/regression` の関係を説明する。
  - `.phasegate/last-doctor-report.json` は固定生成ではなく `doctor --report-out` 指定時の任意出力であることを誤解なく説明する。
- 依存:
  - `WI-145..148` の installation lifecycle 仕様。

### WI-153: Bundled Setup Guidance Skills Refresh

- 配置: `docs/inception/_cross/WI-153/`
- type: `issue`
- severity: `high`
- 目的: `/phasegate-config-doctor` と `/phasegate-toolkit-guide` を、doctor / install / reconcile / Codex / Husky / manifest を扱える現行 setup skill に更新する。
- 対象:
  - `skills/phasegate-config-doctor/SKILL.md`
  - `skills/phasegate-toolkit-guide/SKILL.md`
  - 必要なら `skills/README.md`
- 主要変更:
  - config-doctor は `phasegate doctor` report, `.phasegate/manifest.json`, `.phasegate/last-doctor-report.json`, `.claude/settings.json`, `.codex/hooks.json`, `.husky/*`, `.github/workflows/*` を読む手順を持つ。
  - config-doctor の「init 再実行」中心の助言を `install` / `reconcile` / `doctor` / `lint` 中心に改める。
  - config-doctor は `repairMode`, `repairHint`, `suggestedSkill`, manifest hash mismatch, reconcile / uninstall refuse を入力として扱う。
  - toolkit-guide は install lifecycle を独立カテゴリ化する。
  - toolkit-guide は `repairMode`, `repairHint`, `suggestedSkill` の読み方を説明する。
  - 両 skill の境界を「read-only docs 案内」と「doctor finding に基づく修復方針」に分ける。
  - 両 skill は `p2:check-initial-creation`, `validate.failOnWarning`, `agentIntegration.stopHook.enforce`, Codex `apply_patch` bypass と pre-commit backstop を setup 診断観点に含める。
- 受け入れ条件:
  - doctor が `suggestedSkill=phasegate-config-doctor` を出したとき、skill 側が実際にその相談を処理できる。
  - Codex hook feature flag と pre-commit backstop が setup 診断対象に入る。
  - 検証コマンドが L2 固定ではなく、変更内容ごとに `doctor`, `lint`, `phasegate:check-ready` などへ分岐する。
- 依存:
  - `WI-152` の inventory と同時進行可能。ただし用語は合わせる。

### WI-154: DEVELOPMENT And Skills README Modernization

- 配置: `docs/inception/_cross/WI-154/`
- type: `issue`
- severity: `high`
- 目的: 開発者向け docs の古い skill 数、init オプション、installation lifecycle、Nyquist / skill-quality wiring を現行仕様へ更新する。
- 対象:
  - `DEVELOPMENT.md`
  - `skills/README.md`
- 主要変更:
  - `28 skills` などの古い数値を現行に合わせる。
  - `init --skills core|aidlc|all` の扱いを現行仕様に合わせる。
  - installation unit / command dispatch の開発者向け説明を追加する。
  - operations skills と Claude/Codex skill link の扱いを整理する。
  - Nyquist / regression-suite / skill-quality CLI wiring を現行に合わせる。
  - `.claude/skills` / `.codex/skills` の symlink / directory / manifest / deploy target の実態を整理する。
- 受け入れ条件:
  - README / guide / DEVELOPMENT / skills README の間で skill 数・skill 名・setup 方針が矛盾しない。
  - 開発者が新しい skill を追加するときの docs 更新先が分かる。
- 依存:
  - `WI-150`, `WI-153` の結果に合わせる。

### WI-155: Product Traceability Reflection Cleanup

- 配置: `docs/inception/_cross/WI-155/`
- type: `issue`
- severity: `normal`
- 目的: product docs の `@work-item-id` 反映粒度を改善し、legacy annotation 依存を減らす。
- 対象:
  - `WI-037..050`: legacy `@story-id Hxx-xx` 中心の箇所。
  - `WI-072`: `CommitMessage.workItemId` / `Work-Item: WI-XXX` の `logical_design.md` 反映。
  - `WI-097..103`: agent-integration の product reflection 粒度。
- 主要成果物:
  - `docs/product/construction/ci-governance/*`
  - `docs/product/construction/harness-api/*`
  - `docs/product/construction/harness-error/*`
  - `docs/product/construction/nyquist-validation/*`
  - `docs/product/construction/skill-quality/logical_design.md`
  - `docs/product/construction/agent-integration/*`
- 受け入れ条件:
  - 新規追記は `@work-item-id` を使う。
  - legacy ID は履歴として残してよいが、現行 WI との対応が機械的に追える。
  - product docs に反映するだけで、ソース変更は原則しない。
- 依存:
  - `WI-149` の HarnessError product docs 修正と重複しやすい。`WI-149` で P0 を先に直し、こちらは残りの体系化に限定する。

### WI-156: Documentation Drift Guardrails

- 配置: `docs/inception/_cross/WI-156/`
- type: `story`
- severity: `high`
- 目的: 今回見つかった docs drift を、今後のリリース前に検出できる仕組みにする。
- 検出候補:
  - README / CLI reference に載る npm scripts と `package.json` の差分。
  - CLI reference の command 名と実 CLI help / command registry の差分。
  - install target 名と guide の workflow file 名の差分。
  - install / reconcile target registry と doctor checks と setup docs の差分。
  - skills README の skill 数と `skills/*/SKILL.md` 実数の差分。
  - `docs/guide/configuration.md` の主要 config key と schema/preset の差分。
  - `phasegate.config.json` sample / schema / preset JSON / README / guide の key 差分。
  - `protectedFiles.patterns` のような実装が読むが schema が許可しない config key。
  - `package.json` / `biome.json` / `tsconfig.json` の toolchain guardrail と docs の差分。
  - legacy-only docs reference の検出。
- 主要成果物:
  - 新規 validator または既存 L2/L4 validator 拡張。
  - `docs/guide/layer-model.md` または `docs/guide/cli-reference.md` への検証説明。
  - `DEVELOPMENT.md` への release-before checklist。
- 受け入れ条件:
  - 少なくとも command/script drift, install target drift, skill count drift のいずれかを自動検出できる。
  - 手動チェックに残すものと自動チェックにするものが明確に分かれる。
  - 失敗時の remediation が docs に書かれている。
- 依存:
  - `WI-149..154` の手修正後に着手する。先に guardrail を作ると、古い docs を正として固定する危険がある。

## Should 起票

### WI-157: Legacy Setup Artifact Retirement Guide

- 配置: `docs/inception/_cross/WI-157/`
- type: `issue`
- severity: `normal`
- 目的: `.harness-hooks.yml`, old Fuse hooks, `.harness/session-state.json`, `.harness/context-priority.json`, `README.ja.md` 参照など、旧構想の残存を現行 docs から分離する。
- 起票判断:
  - `WI-152` に含めてもよいが、legacy cleanup を雑に混ぜると install docs が読みにくくなる。
  - 実ファイル削除や archive docs 修正までやるなら独立 WI にする。
- 受け入れ条件:
  - 現行 setup に必要なものと、過去互換・archive のものが混ざらない。
  - `hooks:config validate` や `.harness-hooks.yml` の扱いが明確になる。

### WI-158: Reporting Output Path Contract Normalization

- 配置: `docs/inception/_cross/WI-158/`
- type: `issue`
- severity: `normal`
- 目的: `reporting.outputDir`, `reports`, `.harness/reports`, `reports/regression` の関係を contract として整理する。
- 起票判断:
  - docs だけでなく実装 fallback や tests の見直しが必要なら独立 WI にする。
  - docs で説明するだけなら `WI-152` に吸収可能。
- 受け入れ条件:
  - 各 report 出力がどの config に従うか、固定パスなのか、legacy fallback なのかが分かる。
  - doctor / status / regression-suite の説明と矛盾しない。

## Product Construction 追加調査後の Must 起票

`docs/product/construction` 配下を追加調査した結果、WI-117..WI-139 は多くの Unit で `@work-item-id` reflection 自体は存在する一方、末尾追記に留まり、主設計・DTO・validator catalog・test design・coverage report が旧仕様と矛盾する箇所が残っている。PhaseGate の正本は product construction なので、README / guide だけでなく product docs 自体の再同期 WI が必要。

### WI-159: Validator Catalog And Execution Contract Reconciliation

- 配置: `docs/inception/_cross/WI-159/`
- type: `issue`
- severity: `high`
- 目的: `validator-system` product docs の validator catalog / invariant / default execution / coverage を、WI-117..139 後の実装契約に統一する。
- 対象:
  - `L2-013 cli-e2e-test-existence`
  - `L2-014 work-item-status-staleness`
  - `L2-015 contract-traceability-coverage`
  - `L4-004 doc-freshness`
  - `L4-005 pointer-validation`
  - skip / advisory / fail-on-warning の扱い
  - Quick Mode の `maintainedLayers` / maintained validators / skipped validators contract
  - `L2` layer shorthand と `L2-015` の Quick Mode 維持対象判断
- 主要成果物:
  - `docs/product/construction/validator-system/domain_model.md`
  - `docs/product/construction/validator-system/logical_design.md`
  - `docs/product/construction/validator-system/unit_test_design.md`
  - `docs/product/construction/validator-system/it_test_design.md`
  - `docs/product/construction/validator-system/coverage_report.md`
  - `docs/guide/layer-model.md`
- 受け入れ条件:
  - `ValidatorId` の有効範囲、L2/L3/L4 default execution、`validate --layer all` の skip 仕様が同じ表現で揃う。
  - `L4-004` / `L4-005` を invalid とする古い coverage / test description が残らない。
  - Quick Mode が layer shorthand を展開するのか validator id の完全一致だけを扱うのかが、実装・product docs・guide で一致する。
  - public guide にも `L2-013`, `L2-014`, `L2-015`, `L4-004`, `L4-005` が載る。
- 依存:
  - `WI-151` と強く関連。公開 guide 側は `WI-151`、product 正本側は本 WI に分ける。

### WI-160: Contract Traceability Coverage Guide And Product Expansion

- 配置: `docs/inception/_cross/WI-160/`
- type: `story`
- severity: `high`
- 目的: WI-132..WI-138 の G4 contract traceability を、product construction と public guide の両方で利用可能な仕様として展開する。
- 対象:
  - `L2-015 contract-traceability-coverage`
  - `@phasegate-contract`
  - `@phasegate-observation`
  - `PublicContract`
  - `BoundaryCase`
  - `ErrorContract`
  - `StateMachineModel`
  - `TraceabilityGraphSlice`
- 主要成果物:
  - `docs/product/construction/documentation/domain_model.md`
  - `docs/product/construction/documentation/logical_design.md`
  - `docs/product/construction/validator-system/*`
  - `docs/product/construction/traceability-model/*`
  - `docs/guide/layer-model.md`
  - `README.md`
  - 必要なら新規 `docs/guide/contract-traceability.md`
- 受け入れ条件:
  - annotation の書き方、behavior key / boundary key / observation key の意味、error/state/traceability findings の読み方が公開 docs から辿れる。
  - product construction の `documentation` Unit が annotation 名だけでなく semantic model を持つ。
  - `WI-133` の severity policy config 化を、実装済みなのか follow-up なのか明確化する。
- 依存:
  - `WI-159` の validator catalog 決定。

### WI-161: G5 Operational Validator Product Contract Reconciliation

- 配置: `docs/inception/_cross/WI-161/`
- type: `issue`
- severity: `high`
- 目的: WI-119 / WI-120 / WI-121 / WI-134 / WI-135 の G5 operational validator 仕様を、末尾 summary ではなく product construction の主設計へ統合する。
- 対象:
  - L3-001 security token family / redaction / allowlist / fixture policy
  - L3-002 performance smell / suppression / standard-vs-strict behavior
  - L3-002 hidden knobs: `largeLiteralEntries`, sync I/O, loop-await, suppression marker
  - L4-003 real import/export graph, re-export, wildcard export, dynamic import, public API boundary, generated/test/fixture exclusion
  - L4-002 side-effect capability boundary
  - L4-002 decision placement advisory
  - `architecture.capabilityPolicies` / `architecture.decisionPolicies` の recommended preset / override example
- 主要成果物:
  - `docs/product/construction/validator-system/*`
  - `docs/product/construction/biome-ast-engine/*`
  - `docs/product/construction/config-foundation/*`
  - `docs/product/construction/documentation/*`
  - `docs/guide/layer-model.md`
  - `docs/guide/configuration.md`
- 受け入れ条件:
  - `ArchitectureConfig` / presets が capability policy と decision responsibility を正式に持つのか、validator-side default policy なのかが明確。
  - dead-code graph の false positive boundary が product docs と coverage report に反映される。
  - L3 security/performance の report payload、suppression、redaction の読み方が public docs に出る。
  - performance/security/dead-code の report payload と config knobs が schema, config guide, product docs の間で矛盾しない。
- 依存:
  - `WI-159`。

### WI-162: L4 Status Drift And Semantic Payload Schema Reconciliation

- 配置: `docs/inception/_cross/WI-162/`
- type: `issue`
- severity: `high`
- 目的: `phasegate:status --json`, `phasegate:detect-drift --json`, semantic drift, consistency findings の payload schema を product construction 正本へ落とし込む。
- 対象:
  - `HarnessStatusSummary.hookHealth`
  - `HarnessStatusSummary.baselineHealth`
  - `operationalWarnings`
  - drift `location`, precision source, unit resolution warning
  - consistency `expected` / `actual` / next action
  - semantic drift `DesignIntent` / `ImplementationBehavior` / `TestObservation`
  - `unitName + behaviorId` key
- 主要成果物:
  - `docs/product/construction/harness-api/domain_model.md`
  - `docs/product/construction/harness-api/logical_design.md`
  - `docs/product/construction/harness-api/it_test_design.md`
  - `docs/product/construction/validator-system/*`
  - `docs/guide/cli-reference.md`
  - `docs/guide/layer-model.md`
- 受け入れ条件:
  - JSON schema / handler flow / IT design が hook/baseline/status/drift payload を固定する。
  - L4-001 structural drift と WI-139 semantic drift の責務境界が説明される。
  - fail-on-warning の前提条件が payload の存在と結びつく。
- 依存:
  - `WI-151` と並行可能。

### WI-163: CI Template And L4 Rollout Product Construction Reconciliation

- 配置: `docs/inception/_cross/WI-163/`
- type: `issue`
- severity: `high`
- 目的: WI-124 / WI-128 の live validator registry, preset-aware CI generation, scheduled L4 rollout を ci-governance / setup / integrations の product construction に統合する。
- 対象:
  - `ci:generate-template`
  - live validator registry
  - preset-specific validator selection
  - `ci:generate-template --type consistency-check`
  - scheduled L4 cron / default-off / advisory policy
  - `p2:*` compatibility commands
- 主要成果物:
  - `docs/product/construction/ci-governance/*`
  - `docs/product/construction/setup/*`
  - `docs/product/construction/integrations/*`
  - `docs/product/construction/config-foundation/*`
- 受け入れ条件:
  - `listAll` / stub validator list 前提の古い Port / UT / IT / coverage が現行 registry contract と矛盾しない。
  - setup / integrations docs が generated CI の配線面を説明する。
  - scheduled L4 audit が live L4 surface / advisory policy / failOnWarning と一致することが test design で固定される。
- 依存:
  - `WI-159`。

### WI-164: Phase2 Pointer Freshness Contract Cleanup

- 配置: `docs/inception/_cross/WI-164/`
- type: `issue`
- severity: `high`
- 目的: WI-122 の doc freshness / pointer validation operational semantics を phase2-extensions の主モデル・DTO・test design に統合する。
- 対象:
  - pointer owner
  - semantic pointer type
  - pointer type 別 fail / warn / skip
  - external URL policy
  - stable docs vs stale docs
  - source document / next action
- 主要成果物:
  - `docs/product/construction/phase2-extensions/domain_model.md`
  - `docs/product/construction/phase2-extensions/logical_design.md`
  - `docs/product/construction/phase2-extensions/unit_test_design.md`
  - `docs/product/construction/phase2-extensions/it_test_design.md`
  - `docs/guide/layer-model.md`
- 受け入れ条件:
  - 旧 `file-path | url`, `allowedPointerTypes`, `failOnBroken` の説明と WI-122 の新 semantics が矛盾しない。
  - L4-004 / L4-005 report が owner / pointer type / source / severity / next action を持つことが設計される。
- 依存:
  - `WI-159`。

### WI-165: Product Coverage And Test Design Refresh

- 配置: `docs/inception/_cross/WI-165/`
- type: `issue`
- severity: `normal`
- 目的: WI-117..148 以降の product construction reflection が coverage report / IT design / test logic まで追随しているかを更新する。
- 対象:
  - `docs/product/construction/config-foundation/coverage_report.md`
  - `docs/product/construction/biome-ast-engine/coverage_report.md`
  - `docs/product/construction/traceability-model/coverage_report.md`
  - `docs/product/construction/phase-dependency-model/coverage_report.md`
  - `docs/product/construction/installation/*_test_design.md`
  - `docs/product/construction/harness-api/*_test_design.md`
  - `docs/product/construction/nyquist-validation/it_test_design.md`
  - `docs/product/construction/documentation/coverage_report.md` の要否
- 主要成果物:
  - product coverage reports
  - missing IT design rows for GenerateMatrixHandler / CLI / E2E flow
- 受け入れ条件:
  - coverage report が旧 Hxx / K3.5 だけでなく WI-117..148 の横断 reflection を評価する。
  - Nyquist matrix generation / intent coverage の CLI / end-to-end flow が IT design に載る。
  - installation lifecycle の install / doctor / uninstall / reconcile に残る stub / future / TODO 前提が、実装済みなのか follow-up なのか判別できる。
  - WI status `tested` と未チェック AC が読者に矛盾しない扱いになる。
- 依存:
  - `WI-159..164`, `WI-168..169` の後に実施するのが安全。

### WI-166: Agent Hook Skip Observability Product Reflection Completion

- 配置: `docs/inception/_cross/WI-166/`
- type: `issue`
- severity: `high`
- 目的: WI-123 の hook skip observability を agent-integration product docs に完全反映する。
- 対象:
  - `HookSkipEvent`
  - recording port
  - `.phasegate/hook-skip-events.jsonl` schema
  - best-effort failure behavior
  - PostToolUse / Stop hook tests
  - apply_patch bypass public docs backstop
  - SessionStart / UserPromptSubmit を含む Claude / Codex hook coverage 差分
  - setup docs / skills から hook skip events を診断に使う手順
- 主要成果物:
  - `docs/product/construction/agent-integration/domain_model.md`
  - `docs/product/construction/agent-integration/logical_design.md`
  - `docs/product/construction/agent-integration/unit_test_design.md`
  - `docs/product/construction/agent-integration/it_test_design.md`
  - `docs/product/construction/agent-integration/coverage_report.md`
- 受け入れ条件:
  - logical_design 1 段落だけでなく domain / test / coverage に WI-123 が追える。
  - harness-api の status schema と同じ hook skip record を参照する。
  - public operational docs でも `.phasegate/hook-skip-events.jsonl` の目的、限界、改善アクションが辿れる。
- 依存:
  - `WI-162` と整合する。

### WI-167: Product Unit Boundary And Catalog Cleanup

- 配置: `docs/inception/_cross/WI-167/`
- type: `issue`
- severity: `normal`
- 目的: `docs/product/construction/docs` と `docs/product/construction/documentation` の併存に加え、product unit catalog / unit docs の所有境界を整理する。
- 対象:
  - `docs/product/construction/docs/*`
  - `docs/product/construction/documentation/*`
  - `docs/product/units/*`
  - `docs/product/environment_contract.md`
  - hyphen / underscore の unit file 二重定義
  - `{unit}_unit.md` placeholder
  - 旧 Unit 数・旧 validator registry 参照
- 受け入れ条件:
  - `docs` Unit が現役、legacy、alias のどれか明確になる。
  - metadata / story reflection が二重 Unit を誤解しない。
  - WI-127..139 の product reflection 所有者が説明可能。
  - `docs/product/units/*` が product construction の実 Unit 境界と矛盾しない。
- 依存:
  - なし。product docs cleanup として独立可能。

### WI-168: Product Unit / Integration Contract / ADR Registry Reconciliation

- 配置: `docs/inception/_cross/WI-168/`
- type: `issue`
- severity: `high`
- 目的: product construction 本体を直しても上位 contract が旧仕様を再導入しないよう、Unit catalog / integration contract / environment contract / ADR registry を現行実装へ同期する。
- 対象:
  - `docs/product/units/integration_contract.md`
  - `docs/product/units/validator-system_unit.md`
  - `docs/product/environment_contract.md`
  - `docs/ADR/*`
  - validator ID registry / archgate /旧 CLI /旧 Unit 数の記述
- 受け入れ条件:
  - 上位 product contract が `L2-001..L4-003` だけを正とする古い validator catalog を残さない。
  - ADR と product unit docs が、現行 CLI / validator / installation lifecycle と矛盾しない。
  - `WI-159` の Unit 内正本化と責務が分離され、再発防止の参照先が明確になる。
- 依存:
  - `WI-159` と並行可能。ただし validator catalog 名称は `WI-159` に合わせる。

### WI-169: Installation Lifecycle Product Construction Completion

- 配置: `docs/inception/_cross/WI-169/`
- type: `issue`
- severity: `high`
- 目的: WI-145..148 の install / doctor / uninstall / reconcile を product construction 正本へ完全に戻し、setup 品質を public docs / skills だけでなく product docs から説明可能にする。
- 対象:
  - `docs/product/construction/installation/*`
  - `docs/product/construction/harness-api/*`
  - `docs/product/construction/setup/*`
  - `docs/product/construction/integrations/*`
  - `docs/product/construction/agent-integration/*`
  - `docs/product/construction/ci-governance/*`
  - doctor checks: `wi-workflow-drift`, manifest parse error, report-out behavior, repair table
- 受け入れ条件:
  - doctor check 数、repairMode / repairHint / suggestedSkill、manifest parse error の扱いが product docs と実装で一致する。
  - install / reconcile が実際に管理する target と docs が説明する target が一致する。
  - `future`, `stub`, `wrapper`, `TODO` が残る場合は、実装済み仕様か follow-up かが明確。
- 依存:
  - `WI-152`, `WI-153` と語彙を合わせる。

### WI-170: Initial Creation Expiration Configuration Contract

- 配置: `docs/inception/_cross/WI-170/`
- type: `issue`
- severity: `normal`
- 起票条件: `p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を公開設定として扱う判断をした場合に起票する。
- 目的: `initial_creation:true` の長期放置検出を、CLI / config schema / guide / product docs の同じ契約として説明する。
- 対象:
  - `p2:check-initial-creation`
  - `phase2Extensions.initialCreationExpirationRules`
  - config schema
  - `docs/guide/cli-reference.md`
  - `docs/guide/configuration.md`
  - phase2 / documentation product docs
- 受け入れ条件:
  - config key が schema に存在しないまま docs だけで推奨されない。
  - command が公開 CLI なのか internal maintenance command なのかが明確。
  - `initial_creation:true` を残すべき新規 docs と、expire すべき長期 docs の判断基準が説明される。
- 依存:
  - `WI-150`, `WI-156`。

## Agent-Driven Setup 追加起票

ユーザーの理想状態は、「`init` 後に agent が repo 状態を読み、必要な質問を行い、回答に基づいて最適な PhaseGate 設定を自動で完了する。その後も agent に自然言語で依頼すれば、PhaseGate 設定を安全に変更できる」ことである。

これは README / guide の改善だけでは到達しない。`WI-149..170` は正しい仕様・公開契約・product 正本を整える土台であり、agent-driven setup experience を実現するには、次の WI を追加する。

### WI-171: First-Time User Onboarding And Recipe Guide

- 配置: `docs/inception/_cross/WI-171/`
- type: `story`
- severity: `high`
- 目的: PhaseGate 初見ユーザーが、人間として読んでも、agent に依頼しても、初回導入から運用開始まで迷わない導線を作る。
- 対象:
  - first-run path: `init` -> `doctor` -> `install` / `reconcile` -> `check-ready` -> `validate`
  - 新規 repo / 既存 repo retrofit / CI-only / agent hook enabled / strict validation rollout の分岐
  - first success checklist
  - doctor finding から suggestedSkill / repairHint / next command へ進む導線
  - CLI catalog を使う前の「どの順番で使うか」の説明
  - README 入口、`docs/guide/getting-started.md`, `docs/guide/recipes.md`, `docs/guide/troubleshooting.md`
- 主要成果物:
  - `README.md`
  - 新規または更新 `docs/guide/getting-started.md`
  - 新規または更新 `docs/guide/recipes.md`
  - 新規または更新 `docs/guide/troubleshooting.md`
  - 必要なら `docs/guide/installation.md` / `docs/guide/hooks-integration.md`
- 受け入れ条件:
  - README から 5 分以内に「次に実行する command」と「成功状態」が分かる。
  - 初回導入時の分岐が、利用者の回答可能な質問として表現されている。
  - `doctor` finding / error code / `suggestedSkill` / `repairHint` の読み方が、初心者向けの troubleshooting から辿れる。
  - 全機能の網羅表ではなく、first-run / daily-use / CI-use / agent-use の recipe として読める。
- 依存:
  - `WI-149`, `WI-150`, `WI-152`, `WI-153` の用語と command catalog に合わせる。

### WI-172: Agent-Driven PhaseGate Setup Orchestrator

- 配置: `docs/inception/_cross/WI-172/`
- type: `story`
- severity: `high`
- 目的: `phasegate init` 後に agent が repo 状態を診断し、必要な質問と推奨設定を提示し、回答に基づいて PhaseGate 設定を自動完了できる体験を設計・実装する。
- 対象:
  - repo 状態検出: package manager, CI provider, existing hooks, agent type, monorepo shape, existing `phasegate.config.json`, existing `.claude` / `.codex` / `.husky` / `.github` files
  - setup intent classification: minimal, recommended, strict, CI-only, agent-hooks, retrofit
  - interactive question set: project preset, validation strictness, hook installation, CI rollout, baseline adoption, L4 fail-on-warning, Codex / Claude integration
  - generated plan: config changes, hook changes, workflow changes, skill deployment changes, backup / rollback information
  - execution path: write config, run install / reconcile, run doctor, run check-ready, summarize next actions
  - dry-run / apply / confirm modes
  - integration with `phasegate-config-doctor` and `phasegate-toolkit-guide`
- 主要成果物:
  - 新規 CLI または既存 CLI 拡張: 例 `phasegate setup:agent` / `phasegate init --interactive-agent`
  - setup orchestration design in product construction
  - `docs/guide/getting-started.md` / `docs/guide/installation.md` / `docs/guide/hooks-integration.md`
  - skills update: `skills/phasegate-config-doctor/SKILL.md`, `skills/phasegate-toolkit-guide/SKILL.md`
- 受け入れ条件:
  - agent が `init` 後に repo 状態を読み、足りない情報だけを質問できる。
  - 質問への回答から、`phasegate.config.json`, hooks, workflows, skills, baseline などの変更案を生成できる。
  - 適用前に差分・理由・リスク・rollback path を説明できる。
  - 適用後に `doctor` / `check-ready` 相当の検証を実行し、完了・警告・追加質問を区別して報告できる。
  - 非対話 CI や human-only 利用者向けに、同じ判断を docs / JSON plan / dry-run で確認できる。
- 依存:
  - `WI-152`, `WI-153`, `WI-156`, `WI-169`, `WI-171`。

### WI-173: Agent Configuration Change Workflow

- 配置: `docs/inception/_cross/WI-173/`
- type: `story`
- severity: `high`
- 目的: 初回 setup 後も、利用者が agent に自然言語で依頼すれば、PhaseGate 設定を安全に変更・検証・説明できる workflow を確立する。
- 対象:
  - configuration change intents:
    - validation strictness change
    - L4 rollout / fail-on-warning change
    - CI template regeneration
    - Codex / Claude hook enablement
    - baseline reset / adoption
    - protected file policy change
    - quick mode policy change
    - report output path change
  - intent -> config path / command / validation mapping
  - change safety: backup, diff explanation, managed target boundaries, user-local setting boundaries
  - post-change validation: doctor, lint, validate layer, check-ready, generated workflow diff
  - rollback / recovery guidance
  - docs and skills guidance for agent operators
- 主要成果物:
  - `docs/guide/configuration.md`
  - `docs/guide/recipes.md`
  - `docs/guide/troubleshooting.md`
  - `docs/guide/hooks-integration.md`
  - `skills/phasegate-config-doctor/SKILL.md`
  - `skills/phasegate-toolkit-guide/SKILL.md`
  - 必要なら config change planner / validator extension
- 受け入れ条件:
  - 「L4 を厳しめにして」「Codex hook を有効にして」「CI では warning を fail にして」などの依頼から、agent が変更対象と検証手順を選べる。
  - repo managed artifact と user-level / local-only artifact を混同しない。
  - agent が変更前後の差分、理由、残るリスク、確認済み検証を説明できる。
  - 設定変更後に drift guardrail または doctor によって、docs / schema / install target / runtime state の不整合を検出できる。
- 依存:
  - `WI-152`, `WI-153`, `WI-156`, `WI-171`, `WI-172`。

## 起票しない方がよいもの

次は独立 WI にしない方がよい。

1. README にコマンドを 1 行追加するだけの WI
   - `WI-150` に束ねる。

2. `phasegate-config-doctor` と `phasegate-toolkit-guide` を別々の WI にすること
   - 2 つは境界定義が重要なので、同じ WI で設計した方がよい。

3. `WI-037..050` の legacy annotation を全置換する WI
   - 履歴の対応関係を壊すリスクがある。`@work-item-id` の追記・補強に留める。

4. `.claude/settings.local.json` を managed target にする WI
   - user-local override なので、読む対象にはしても install / doctor の managed target にしない。

5. user-level `~/.codex/config.toml` を repo 内管理する WI
   - repo 外のユーザー設定なので、skill / docs で確認方法を案内するに留める。

6. サブエージェントが提示した `WI-157` などの番号をそのまま使うこと
   - 本 backlog では既に `WI-157` / `WI-158` を Should 起票に割り当て済み。追加調査で出た候補は `WI-159` 以降へリナンバーする。

7. Quick Mode の `L2-015` 維持対象判断だけを独立 WI にすること
   - validator catalog / execution contract の一部なので `WI-159` に吸収する。

8. `architecture.capabilityPolicies` / `decisionPolicies` の docs 追記だけを独立 WI にすること
   - G5 operational validator の設定契約なので `WI-161` に吸収する。

9. `.claude/skills` / `.codex/skills` の link 形態だけを独立 WI にすること
   - setup skill / DEVELOPMENT / product installation の境界に関わるため、`WI-153`, `WI-154`, `WI-169` へ分担する。

10. agent-driven setup を README の手順追記だけで済ませること
   - `init` 後に agent が質問・提案・設定適用・検証まで行う体験は、docs 導線だけでは実現しない。`WI-171` は人間向け導線、`WI-172` / `WI-173` は agent が実行可能な setup / change workflow として分ける。

## 推奨順序

1. `WI-149`
   - 公開契約の P0 不一致を潰す。

2. `WI-150`, `WI-151`
   - CLI 表面と運用 semantics を揃える。

3. `WI-152`, `WI-153`
   - setup inventory と guidance skills を同じ語彙に揃える。

4. `WI-154`
   - DEVELOPMENT / skills README を現行仕様に戻す。

5. `WI-155`
   - product traceability を後追いで体系化する。

6. `WI-156`
   - drift guardrail を導入する。

7. 必要なら `WI-157`, `WI-158`
   - legacy cleanup と report path normalization を独立して処理する。

8. `WI-159`, `WI-160`
   - product construction の validator catalog と G4 contract traceability を正本として揃える。

9. `WI-161`, `WI-162`, `WI-163`, `WI-164`
   - G5 operational validators、status/drift payload、CI/L4 rollout、pointer/freshness semantics を product docs の主設計へ統合する。

10. `WI-168`, `WI-169`
   - product 上位 contract / ADR registry と installation lifecycle product docs を再同期する。

11. `WI-166`, `WI-167`
   - agent hook skip reflection と product Unit catalog 境界を補正する。

12. `WI-165`
   - product coverage report / IT design を最後に更新し、前段の正本化を検証対象へ反映する。

13. 条件付きで `WI-170`
   - `p2:check-initial-creation` と `phase2Extensions.initialCreationExpirationRules` を公開設定にする場合のみ起票する。

14. `WI-171`
   - 初見ユーザー向けの getting started / recipe / troubleshooting 導線を作る。

15. `WI-172`
   - `init` 後に agent が repo 状態を読み、質問・推奨・設定適用・検証まで進める setup orchestrator を作る。

16. `WI-173`
   - 初回 setup 後の自然言語による PhaseGate 設定変更を、安全な workflow として扱えるようにする。

## 最小セット

予算や時間を絞るなら、最低限は以下の 5 本でよい。

1. `WI-149`: P0 不一致修正
2. `WI-150`: CLI catalog consolidation
3. `WI-152`: setup artifact inventory docs
4. `WI-153`: bundled setup guidance skills refresh
5. `WI-156`: documentation drift guardrails

この 5 本で、利用者が踏む地雷と再発しやすい drift の大半を潰せる。`WI-151`, `WI-154`, `WI-155` は品質を上げるが、上記 5 本よりは後でよい。

ただし、`docs/product/construction` を正本として整える目的まで含めるなら、最小セットは次の 8 本に増える。

1. `WI-149`: P0 不一致修正
2. `WI-150`: CLI catalog consolidation
3. `WI-152`: setup artifact inventory docs
4. `WI-153`: bundled setup guidance skills refresh
5. `WI-156`: documentation drift guardrails
6. `WI-159`: validator catalog / execution contract reconciliation
7. `WI-160`: contract traceability coverage guide and product expansion
8. `WI-161`: G5 operational validator product contract reconciliation

product 正本の矛盾を放置したまま README / guide だけ直すと、PhaseGate の reflection model と逆向きになる。公開 docs 改善と並行して、少なくとも `WI-159..161` は起票する。

上位 product contract / installation lifecycle まで含めて正本性を回復するなら、最小セットはさらに `WI-168` と `WI-169` を加えた 10 本に増える。これは README / guide の改善ではなく、product 正本が旧 validator catalog・旧 CI target・旧 installation stub を再導入しないための最低限である。

さらに、理想状態を「初めに `init` した後は agent が必要な質問を行い、回答に基づいて最適な PhaseGate 設定を自動完了し、その後も agent への自然言語指示で設定を安全に変更できる」に置くなら、追加で次の 3 本を必須にする。

1. `WI-171`: First-time onboarding / recipes / troubleshooting
2. `WI-172`: Agent-driven setup orchestrator
3. `WI-173`: Agent configuration change workflow

この 3 本は `WI-149..170` の代替ではない。`WI-149..170` が正しい仕様と正本を整え、`WI-171..173` がそれを利用者体験と agent 実行能力へ変換する。
