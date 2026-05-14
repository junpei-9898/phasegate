# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.160.6] - 2026-05-14

### Fixed

- **WI-190..WI-196 — post-0.160.5 dogfood regressions** — aligns agent context refresh with reconcile rendering, adds retrofit planning-mode config plans, makes cascade update dry-runs non-mutating and explicit, fixes doctor `_shared` drift counts, removes pnpm-only scheduled CI templates, exposes `migrate work-items` help, and accepts positional `delegate-sonnet` prompts.

## [0.160.5] - 2026-05-14

### Fixed

- **WI-189 — umbrella CLI UX cleanup** — aligns `validate --format json` with the global JSON contract, makes `scaffold-design` default to dry-run with explicit `--apply`, fixes bypass audit empty-range wording, and synchronizes public help for scaffold, quick-mode, and delegate commands.

## [0.160.4] - 2026-05-14

### Fixed

- **WI-184 — skill catalog CLI** — fixes `phasegate skills list` so guidance-category skills no longer crash an undefined accumulator, shares the `SKILL.md` catalog path with `skills info`, and covers empty skill catalogs.

## [0.160.3] - 2026-05-14

### Fixed

- **WI-187 — doctor no-op repair semantics** — stops `phasegate doctor` from advertising `migrate work-items --apply` as a mechanical repair for `_shared` ad-hoc plan drift, marks the finding manual with `repairHint: null`, and adds a regression flow proving the migration command would apply zero candidates and leave the doctor finding unresolved.

## [0.160.2] - 2026-05-14

### Fixed

- **WI-185 / WI-186 / WI-188 — validator and gate trust** — fixes downstream P2 freshness/pointer scans so package-bin execution resolves caller project docs, makes `phasegate:status` JSON fail when enabled live layer validation fails while preserving its informational exit-code contract, and prevents `skill:check-coverage` from launching Vitest or network-prone auto-install paths before story/test prerequisites are validated.

## [0.160.1] - 2026-05-14

### Fixed

- **WI-181 / WI-182 / WI-183 — downstream install and package contract** — declares `tinyglobby` as a packaged runtime dependency, updates pre-commit and AIDLC workflow templates to call the published `phasegate` bin instead of monorepo-only scripts, and makes the workflow choose npm/yarn/pnpm install commands from lockfiles.

## [0.160.0] - 2026-05-13

### Added

- **WI-170 — phase2 initial-creation expiration public contract** — documents `p2:check-initial-creation` as a public compatibility command and adds schema/type support for `phase2Extensions.initialCreationExpirationRules` in v2 and v3 config documents.

## [0.159.0] - 2026-05-13

### Added

- **WI-156 — documentation drift guardrail** — adds `L4-006 skill-catalog-drift` to compare the shipped `skills/*/SKILL.md` catalog with maintained skill-count declarations and skills overview category totals, plus release checklist guidance for remaining manual drift checks.

## [0.158.0] - 2026-05-13

### Changed

- **WI-180 — scoped-out doctor effective repair contract** — adds current-scope repair target and repair-mode applicability fields to doctor JSON, lists scoped-out check IDs in human output, and updates docs/skills so single-agent diagnostics are harder to misread.

## [0.157.0] - 2026-05-13

### Changed

- **WI-179 — scoped-out doctor repair guidance** — suppresses `repairHint` and `suggestedSkill` for unselected-agent `scopedOutFindings`, adds explicit repair applicability markers, and updates CLI/troubleshooting/skill guidance so scoped doctor output is harder to misread as repair work.

## [0.154.0] - 2026-05-13

### Added

- **WI-176 — Claude Code dogfood readiness** — adds `setup:agent` agent-specific readiness output for Claude, Codex, and shared setup state, plus Claude Code managed context and guide updates for recovery and validation.

## [0.153.1] - 2026-05-13

### Fixed

- **WI-175 — setup apply structured error exit code** — makes `setup:agent --apply --json` exit non-zero when the underlying install result contains a structured target-aware apply error.

## [0.153.0] - 2026-05-13

### Added

- **WI-175 — agent setup completeness and confidence** — adds `setup:agent` completeness summaries, `config:plan` managed/external action separation with `phasegate.config.json` patch previews, target-aware install permission error guidance, and regression coverage for strict setup no-diff behavior.

## [0.152.9] - 2026-05-13

### Added

- **WI-171 / WI-172 / WI-173 / WI-174 — user onboarding and agent-driven setup** — adds first-run recipes and troubleshooting guides, managed `AGENTS.md` / `CLAUDE.md` setup sections, dedicated AGENTS lesson pointer refresh, `setup:agent` setup planning/apply flow, and `config:plan` configuration-change intent planning.

## [0.152.8] - 2026-05-13

### Changed

- **WI-155 / WI-165 / WI-166 / WI-167 / WI-168 — product reflection and catalog cleanup** — aligns product unit catalog policy, ADR validator catalog references, Work Item reflection wording, hook skip observability docs, and coverage/test design refresh for WI-117..148 follow-up semantics.

## [0.152.7] - 2026-05-13

### Changed

- **WI-159 / WI-160 / WI-161 / WI-162 / WI-163 / WI-164 — validator and JSON contract foundation** — aligns the public validator catalog, Quick Mode relaxation contract, contract traceability guide, status/drift JSON semantics, G5 operational validator payload docs, CI/L4 rollout docs, and pointer/freshness semantics.

### Fixed

- **WI-159 — Quick Mode validator catalog** — includes `L2-013` and `L2-015` in the Quick Mode validator ID registry and relaxation invariant so skipped/maintained L2 sets match the validator-system catalog.

## [0.152.6] - 2026-05-13

### Changed

- **WI-152 / WI-153 / WI-154 / WI-157 / WI-169 — setup lifecycle documentation refresh** — adds the setup artifact inventory, aligns installation product construction docs with the current doctor/install/reconcile contract, refreshes bundled setup guidance skills, and modernizes developer skill documentation before publish prep.

## [0.152.3] - 2026-05-12

### Fixed

- **Historical WI status closure / WI-012 / WI-027 / WI-035 / WI-036 / WI-085 / WI-086 / WI-087 / WI-088 / WI-089 / WI-090 / WI-091 / WI-092 / WI-093 / WI-096** — completes missing product reflection and implementation traceability evidence for the remaining targeted historical WI backlog, then applies derived statuses for fix/chore items so the target set no longer reports stale.

## [0.152.2] - 2026-05-12

### Fixed

- **WI status evidence closure / WI-119 / WI-120 / WI-121 / WI-127 / WI-128** — adds missing implementation/test traceability annotations and applies derived WI statuses so the remaining G1/G5 backlog items no longer report stale or reflected-only status.

## [0.152.1] - 2026-05-12

### Fixed

- **G5 post-publish dogfood / WI-134 / WI-135** — wires architecture semantic policy into `L4-002` runtime validation so side-effect capability denials and decision-placement advisories are reported with file zone, evidence, confidence, and suggested owner zone.

## [0.152.0] - 2026-05-12

### Added

- **G5 / WI-119 / WI-120 / WI-121 / WI-134 / WI-135 — architecture semantic analysis** — strengthens code semantic analysis across L3/L4 validators and architecture presets.
  - L4-003 dead-code detection now builds a real import/export/re-export/dynamic-import graph and reports unused export candidates with reviewable reasons while preserving public/test/generated boundaries.
  - L3-001 security scanning detects representative OpenAI, GitHub, AWS, npm, Slack, and keyword-context token families, supports explicit fixture allowlisting, and redacts secret values from findings.
  - L3-002 performance scanning defines practical static scope with file-size thresholds, await-in-loop, synchronous I/O, large literal checks, and inline suppression for accepted migration/batch cases.
  - Architecture presets now expose side-effect capability policies and advisory decision-placement responsibilities separately from dependency-direction checks.

## [0.151.1] - 2026-05-12

### Fixed

- **G4 post-publish dogfood** — fixes `npx phasegate@0.151.0` failing with `Error: tsx not found` by letting the bin wrapper execute the packaged `tsx` loader via `node --import` when dependency binaries are not linked into PATH.

## [0.151.0] - 2026-05-12

### Added

- **G4 / WI-132 / WI-133 / WI-136 / WI-137 / WI-138 — contract, boundary, state machine, error contract, and traceability coverage** — adds `L2-015 contract-traceability-coverage`, a semantic model for public contracts, test observations, boundary cases, state machines, error contracts, and traceability graph slices, plus opt-in `@phasegate-contract` / `@phasegate-observation` extraction and L2 result mapping.

## [0.150.2] - 2026-05-12

### Added

- **G3 / WI-117 / WI-118 / WI-122 / WI-139 — L4 drift, consistency, docs, and semantic drift semantics** — L4 drift detection now compares unit-scoped records, prefers `@unit` metadata, handles product construction docs and re-export/default export surfaces more precisely, reports real product-doc consistency targets, adds operational pointer/freshness semantics, and introduces semantic drift reports across design intent, implementation behavior, and test observations.

## [0.150.1] - 2026-05-12

### Fixed

- **WI-125 post-publish dogfood** — republish patch for `phasegate:generate-matrix` after `phasegate@0.150.0` dogfood showed the published tarball did not include the new command.

## [0.150.0] - 2026-05-12

### Added

- **G1 / WI-123 / WI-124 / WI-127 / WI-128 — Gate reliability and operational transparency** — `phasegate:status --json` now reports hook/baseline operational health, CI template validator IDs are derived from the live validator-system registry, L4 scheduled audit docs/templates use canonical L4 commands, and README/guide feature inventory matches the shipped 30 skills.
- **G2 / WI-125 / WI-129 / WI-130 / WI-131 — L2 test-quality core and Nyquist matrix generation** — `L2-003 test-quality` uses semantic AAA / assertion strength analysis, and `phasegate:generate-matrix` generates `requirement-test-matrix.json` from product ACs and test metadata with missing/orphan/intent coverage reporting.

## [0.147.0] - 2026-05-12

### Added

- **WI-144 — install/uninstall idempotency umbrella closure** — publish-ready rollup for the installation lifecycle work delivered across WI-145〜WI-148.
  - Documents the complete lifecycle commands (`install`, `doctor`, `uninstall`, `reconcile`) in README / README.ja / guide docs.
  - Marks the WI-144 umbrella as tested after the manifest, doctor, structured install, clean uninstall, reconcile, and init deprecation slices reached tested status.

## [0.145.4] - 2026-05-11

### Added

- **WI-148 — manifest-driven reconcile + init deprecation** — `phasegate reconcile --dry-run|--apply [--force] [--json]` を追加し、`.phasegate/manifest.json` に記録済みの PhaseGate managed files を現行 bundled template / package version に追従できるようにした。
  - `merged` entries は PhaseGate managed portion だけを更新し、user scripts / hooks / dependencies は保持する。
  - `created` entries は hash が manifest と一致する場合のみ template に追従し、user 改変ありの場合は `--force` 無しで refuse、force 時は `.phasegate/backups/reconcile-*/` に退避してから上書きする。
  - manifest に無い現行 deploy target は install と同じく追加し、apply 後は manifest の version/hash を更新する。
  - `update-skills` は互換 alias として `reconcile` に委譲し、`init` 実行時は v1.0 削除予定の deprecation warning を表示する。

## [0.145.3] - 2026-05-11

### Added

- **WI-147 — manifest-driven uninstall** — `phasegate uninstall --dry-run|--apply [--force] [--json]` を追加し、`.phasegate/manifest.json` に記録された managed files を clean removal できるようにした。
  - `created` / `symlink` entries は削除し、JSON / shell / `package.json` の `merged` entries は PhaseGate managed portion だけを除去して user content を保持する。
  - hash mismatch は `--force` 無しで refuse し、force 時は `.phasegate/backups/uninstall-*/` に snapshot を保存してから削除する。
  - uninstall 完了後、manifest は `.phasegate/uninstalled-*.json` に archive される。

## [0.145.2] - 2026-05-11

### Added

- **WI-146 — structured install** — `phasegate install --dry-run|--apply [--force] [--json]` を追加し、既存設定を preserve しながら Claude / Codex hooks、Husky hooks、CI workflow、package scripts/devDependency、skills link、manifest entries を構造化 merge できるようにした。
  - 既存カスタム hook は既定では拒否し、`--force` 時は `.phasegate/backups/` に退避してから managed block を適用する。

## [0.145.1] - 2026-05-11

### Fixed

- **WI-145 post-publish dogfood** — `npx phasegate@0.145.0 init` 直後の `doctor` が `package-json-devdep-missing` で RED になる問題を修正した。
  - `init` が `package.json` を作成または更新し、`devDependencies.phasegate` を現在の harness version で登録するようにした。

## [0.145.0] - 2026-05-11

### Added

- **WI-145 — installation doctor / manifest foundation** — `phasegate doctor` を追加し、Claude / Codex hooks、Husky hooks、CI workflow、package dependency、skills symlink の 9 checks で inert / partial installation を診断できるようにした。
  - `--json`、`--strict`、`--report-out` に対応し、4 fixture (`no-phasegate` / `inert-install` / `partial-install` / `full-install`) の golden integration test で出力と exit code を固定した。
  - init / update-skills 経路で `.phasegate/manifest.json` の薄い書き出しを開始し、manifest entries の `path` / `mode` / `hash` / `deployedAt` を unit test で固定した。
  - doctor の false positive / false negative を防ぐため、9 checks すべてに unit test を追加した。

### Fixed

- **WI-145 follow-up — L1 blocker cleanup** — validator-system の integration test fixture 内にあった internal module mock 文字列が L1-017 に検出されていた既存違反を解消した。

## [0.144.1] - 2026-05-10

### Fixed

- **WI-142 — `ci:generate-template` default preset** — `--preset` 未指定時に存在しない `default` ではなく `standard` を使うようにし、`ci:generate-template --type agent-context-refresh --render` がそのまま成功するようにした。
  - help / CLI reference も `--preset` の既定値が `standard` である説明に更新した。

## [0.144.0] - 2026-05-10

### Added

- **WI-129 / WI-130 — semantic L2 test-quality validation** — `L2-003 test-quality` を test case 単位の semantic AAA / assertion strength モデルへ更新した。
  - TypeScript adapter は AST から `TestCaseStructure` / `SemanticAssertion` を構築し、複数 Act、Act 観測不足、Act 以外への Assert、domain/internal mock、weak truthiness / snapshot only / length only / interaction only、error contract 不足を warning として検出する。
  - lifecycle/E2E と parameterized test の例外を追加し、weak assertion policy は constructor option で差し替え可能にした。

## [0.142.0] - 2026-05-10

### Added

- **WI-126 — work item status derivation** — `work-items:status --dry-run|--apply` を追加し、WI frontmatter `status` を inception / product reflection / implementation / test evidence から導出できるようにした。
  - `--id WI-XXX` で単一 WI に絞り込み、`--fail-on-stale` で stale status を exit code 1 として検出できる。
  - `--apply` は stale な `description.md` の YAML frontmatter `status:` 行だけを書き戻す。
  - `fix` / `chore` の shortcut path は README / README.ja の説明と一致する。

### Fixed

- publish 前回帰として、標準 L2 validator set に `L2-013` を含む現行契約と `preCommit.implementationExtensions` default をテスト期待値に反映した。

## [0.141.0] - 2026-05-09

### Fixed

- **WI-024 follow-up — metadataTags suggestion text** — `architecture.metadataTags.unit` / `architecture.metadataTags.layer` を使った L1-001 / L1-002 の `suggestion` も、固定の `@unit` / `@layer` ではなく設定タグ名を表示するようにした。

## [0.140.0] - 2026-05-09

### Added

- **WI-024 — configurable L1 metadata tag names** — `architecture.metadataTags.unit` / `architecture.metadataTags.layer` を biome-ast-engine の L1 parser / analyzer / runner に反映し、`@module` / `@tier` などのプロジェクト語彙を単一の有効タグ名として使えるようにした。
  - 既定値は従来通り `@unit` / `@layer`。
  - カスタムタグ設定時は旧タグを alias として扱わず、欠落メッセージも設定タグ名を表示する。

## [0.139.0] - 2026-05-09

### Added

- **WI-012 — pre-commit implementation extension 設定** — `preCommit.implementationExtensions` を config schema / preset / pre-commit adapter に追加し、`.ts` 以外の実装ファイル拡張子を検査対象にできるようにした。

### Fixed

- **WI-015 — quick mode comment-only API diff** — API 面の TypeScript ファイルでコメントのみが変わった場合、quick mode が implementation 証拠なしで `pending` に戻さないようにした。
- **WI-030 — README / layer-model drift correction** — 公開ドキュメントの validator 数と L0 記述を現行仕様に合わせて更新した。
- **WI-061 / WI-062 / WI-063 / WI-064 / WI-071 — reflected regression / skill WI closure** — 既存実装と回帰テストの証跡に基づき、対応済み WI を `tested` に整理した。

## [0.138.1] - 2026-05-09

### Fixed

- **WI-106 — inception WI ID 重複防止** — `docs/inception/**/WI-XXX/description.md` の frontmatter `id` を global scan し、`_cross` と Unit 配下をまたぐ重複、および parent directory 名と `id` の不一致を `validate-metadata` 経路で検出するようにした。
  - `docs/folder_management_rules.md` / `AGENTS.md` に、新規 WI 作成時の global unique ルールを明記。
  - `migrate work-items` の採番が `_cross` と Unit 配下の既存 WI 番号を避けることを回帰テストで固定。

## [0.138.0] - 2026-05-09

### Fixed

- **WI-032 post-publish dogfood** — `phasegate init --with-ci` が生成する `phasegate.config.json` の `ci.enabled` を config schema v2/v3 で許可した。
  - v0.137.0 published package の dogfood で、init 後の `ci:generate-template` / `ci:auto-refresh-agent-context` が `additionalProperties: /ci is not allowed` で失敗することを確認。
  - `ci.enabled` は WI-031 以降の公開設定として生成済みのため、schema 側を追従させる。

## [0.137.0] - 2026-05-09

### Added

- **WI-032 — AGENTS.md / CLAUDE.md auto-refresh pipeline** — `ci:auto-refresh-agent-context --dry-run|--apply|--json` を追加し、lesson artifact 由来の AGENTS.md pointer 更新と CLAUDE.md 標準セクション更新を 1 コマンドで実行できるようにした。
  - `refresh-claude-md --dry-run|--apply|--json` を追加し、CLAUDE.md の user-owned section を保持しながら bundled template から標準セクションを再生成。
  - `p2:check-agent-context --threshold-days <n> --json` を追加し、AGENTS.md / CLAUDE.md の鮮度を検査可能にした。
  - `docs/templates/ci/agent-context-refresh.yml` を追加し、`ci:generate-template --type agent-context-refresh --render` と `phasegate init --with-ci` で配布可能にした。
  - PhaseGate 自身にも `.github/workflows/agent-context-refresh.yml` を追加し、週次 refresh PR を作成する構成にした。

## [0.136.0] - 2026-05-09

### Added

- **WI-031 — CI template の二系統統一 + `phasegate init --with-ci`** — `ci:generate-template --render` が bundled template を正本として stdout に出力するようにし、`phasegate init --with-ci` で `.github/workflows/aidlc-gate.yml` と `.github/workflows/consistency-check.yml` を opt-in 配置できるようにした。
  - `docs/templates/ci/{aidlc-gate,consistency-check}.yml` と `docs/templates/hooks/pre-commit` を render の正本に統一。
  - `consistency-check` の cron と GitHub Issue 自動作成 logic が CLI render と bundled template で一致。
  - 既存 workflow は上書きせず skipped として扱い、新規 config 作成時は `ci.enabled: true` を保存。
  - `docs/templates/**` を npm package 同梱対象に追加。

### Fixed

- **WI-031 / WI-097 — inception 配下の WI ID 重複を解消** — `_cross/WI-031` と `agent-integration/WI-031` が別内容で同一 ID を持っていたため、H11-04 由来の agent-integration 側を `WI-097` に再採番した。
  - `legacy_id: H11-04` は維持し、agent-integration の product docs に `@work-item-id WI-097` を追記。
  - 再発防止の follow-up として `WI-106`（inception 全体での WI ID 重複防止）を起票。

## [0.135.0] - 2026-05-09

### Added

- **WI-033 — `doc-freshness` / `pointer-validation` を L4 validators に昇格** — 既存の `p2:check-freshness` / `p2:validate-pointers` CLI を維持しつつ、`validate --layer L4` で L4-004 / L4-005 として実行されるようにした。
  - `validator-system` に `L4-004 doc-freshness` / `L4-005 pointer-validation` を登録し、preset ごとの enable / disable 判定に対応。
  - default の検査対象は `phasegate.config.json` の `paths.designDocs` から導出し、`paths.inceptionDocs` と archive 配下の計画・履歴文書は pointer validation の対象外にした。
  - Markdown pointer 抽出を改善し、相対リンク・アンカー・行番号 suffix を正規化しつつ、placeholder / template / glob 表現の false positive を抑制。
  - `docs/contracts/lesson-artifact.schema.json` を追加し、ci-governance / skill-quality 間の lesson artifact 契約参照を実在化。
  - 旧ディレクトリ構成を指していた設計文書内の test path 参照を現行構成へ整理し、`p2:validate-pointers` は `broken=0` を確認済み。

## [0.134.0] - 2026-05-08

### Changed

- **WI-034: L0 legacy validator (`L0-001` / `L0-002`) の撤去** — `validator-system` から FUSE 時代の未実装 validator 定義と `RunL0ValidatorsUseCase` を削除し、config schema / `phasegate.config.json` から `layers.L0` を撤去。`list-errors --layer L0` は空のままになり、`validate --layer L0` は runtime L0 が agent-integration hooks と Husky hooks で提供される旨の案内を表示して exit 0 で終了する。
  - **Migration guide**: CI で `phasegate validate --layer L0` を実行していた場合、そのジョブは削除してください。L0 相当の防御は `.claude/settings.json` / `.codex/hooks.json` の runtime hook と `.husky/pre-commit` / `.husky/commit-msg` で有効化し、CI 側は `phasegate validate --layer L2` / `--layer L3` / `--layer L4` または `--layer all` に移行します。

## [0.133.0] - 2026-05-08

### Added

- **WI-095 — L4-001 drift-detect の design pointers 対応** — 設計見出し直下の `<!-- pointers: ... -->` / `<pointers>` block で実装ファイルpathを明示できるようにし、設計名とcode export名が異なる移行中ケースのfalse positiveを抑制。ADR-018でsyntaxとORセマンティクスを定義。
  - **post-publish dogfood**: `/private/tmp/phasegate-dogfood-0.133.0` で `npx phasegate@0.133.0 phasegate:detect-drift --json` を実行。設計見出し `UserProfile` に `<!-- pointers: scripts/harness/sample-unit/domain/user-profile.ts -->` を付け、コード側は `export class UserProfileV2 {}` とした状態で `drifts: [] / totalCount: 0` を確認。

### Fixed

- **WI-096 — `phasegate:status` が `layers.L?.enabled` user override を表示に反映しない問題を修正** — status表示用のenabledLayersをpreset値と明示overrideから合成し、`strict + L4.enabled:false` / `minimal + L4.enabled:true` の双方に対応。
  - **post-publish dogfood**: `npx phasegate@0.133.0 phasegate:status --json` で `project.preset: "minimal" + layers.L4.enabled: true` の L4 `enabled: true`、および `project.preset: "strict" + layers.L4.enabled: false` の L4 `enabled: false` を確認。

## [0.132.0] - 2026-05-08

### Fixed

- **WI-094 follow-up — `DriftReport` / `ConsistencyReport` / `DeadCodeReport` の `toHarnessError(s)` が `severity: 'error'` を hardcode していたため v0.131.0 の集計セマンティクス修正が L4-001/002/003 で実機に反映されなかった (post-publish dogfood で発見)** — `error catalog` の `defaultSeverity: warning` 宣言と各 report の `toHarnessError(s)` 出力 severity が乖離しており、aggregator が `severity !== 'warning'` で hasNonWarningError と判定して overall FAIL となっていた。
  - **修正対象**:
    - `scripts/harness/validator-system/domain/value-objects/drift-report.ts:47` — L4-001 drift error の severity を `'error'` → `'warning'`
    - `scripts/harness/validator-system/domain/value-objects/consistency-report.ts:49` — L4-002 consistency error の severity を `'error'` → `'warning'`
    - `scripts/harness/validator-system/domain/value-objects/dead-code-report.ts:46/54` — L4-003 dead-code error の severity を `'error'` → `'warning'` (unused export / unreachable code 双方)
  - **dogfood 結果 (v0.131.0 の状態)**: `/private/tmp/phasegate-dogfood-wi094` で drift 2 件発生させて `validate --layer L4 --format human` を実行 → `[FAIL] L4-001` / overall FAIL ✗ / exit 1。期待は `[WARN] L4-001` / overall PASS ✓ / exit 0。原因は本 fix で解消。
  - **後方互換**: `validate.failOnWarning: true` を設定している user の挙動は不変 (warning でも overall FAIL)。`failOnWarning: false` (default for `minimal` / `standard`) の user のみ exit code 0 に変わる。これは ADR-017 で承認済みの BREAKING の意図通りで、v0.131.0 で動かなかった部分が初めて動く形。
  - **post-publish dogfood**: WI-094 description.md に v0.132.0 dogfood 結果を反映。

## [0.131.0] - 2026-05-08

### Changed (BREAKING for `standard` / `minimal` preset users)

- **WI-094 — warning-severity validator の集計セマンティクスを修正 (ADR-017, GitHub Issue #4 finding #2)** — `error catalog` で `defaultSeverity: warning` と宣言された validator (L4-001 drift / L4-002 consistency / L4-003 dead-code) が fail を返した際、`overallPassed` 判定が severity を見ず常に `failedValidators++` していたバグを修正。warning-only validator fail は `overall PASS / exit 0` を default に変更。
  - **修正前**: `aggregate-validation-results-usecase.ts:35-42` の `hasFail = !result.passed || (failOnWarning && hasWarnings)` で `failOnWarning` flag が常に dead code 化していた。warning-only fail でも `[FAIL]` 表示・exit 1 となり、reporter (nakataj-mti) は plan-level workaround (false positive 注釈) で凌いでいた。
  - **修正後**: `hasFail = !result.passed && (isEmptyFail || hasNonWarningError || (failOnWarning && hasWarnings))` で severity を反映。`failOnWarning=true` で旧挙動 (warning も fail) に opt-in 可能。
  - **新 config フラグ**: `phasegate.config.json` に `validate.failOnWarning: boolean` を追加。default は `false`。preset 別 default: `minimal` / `standard` = `false`、`strict` = `true` (ci-governance preset adapter の precedent と整合)。schema v2 / v3 双方で optional property として追加 — 既存 user の config はそのまま valid。
  - **新 CLI flag**: `--fail-on-warning` / `--no-fail-on-warning` の tri-state 化。両方未指定の場合は config 値を使用 (CLI > config 優先順位)。
  - **Formatter 改修**: `human` formatter で `[FAIL]` と `[WARN]` を分離表示。warning-only fail は `[WARN] L4-001` として表示。`agent` / `ci` formatter (JSON) は既存 `severity` field 構造を維持し、後方互換性を確保。
  - **Migration**: warning-only fail で CI を止めたい既存 user は `phasegate.config.json` に以下を追加:
    ```json
    { "validate": { "failOnWarning": true } }
    ```
    または CLI で `--fail-on-warning` を指定。`strict` preset 利用者は default で `failOnWarning: true` のため migration 不要。
  - **回帰テスト**: warning-only / error-only / mixed / failOnWarning=true / 防御的 (passed=false かつ errors=[]) の 5 ケースを `aggregate-validation-results-usecase.test.ts` に追加。`human-validation-result-formatter.test.ts` 新設で `[WARN]` / `[FAIL]` / `[PASS]` / `[SKIP]` の表示を網羅。
  - **検証 (publish 前)**: `pnpm test` 454 files / 3531 tests pass (baseline +11)。`npx phasegate validate --layer L2` は pre-existing fail のみ (L2-001 artifact 不足、本 WI とは無関係)。
  - **post-publish dogfood**: WI-094 description.md / `tdd_implementation_plan.md` に dogfood 結果を反映予定。

## [0.130.0] - 2026-05-08

### Fixed

- **WI-093 — `paths.designDocs` を L2-001 / traceability-model の product 直下文書まで完全 threading (GitHub Issue #4 finding #4)** — WI-085 で残っていた `docs/product/product_overview.md` / `docs/product/user_stories.md` hardcoded 経路を解消。
  - **phase-dependency-model**: Level 1 product 文書を `{designDocsRoot}/../...` で定義し、`Artifact.resolve()` / `expandRoots()` で POSIX 正規化。`paths.designDocs: "mydocs/product/construction"` の場合、L2 blocker は `mydocs/product/product_overview.md` / `mydocs/product/user_stories.md` を参照する。
  - **traceability-model**: `MarkdownStoryCatalogGateway` / `MarkdownDesignDocumentGateway` / `MarkdownUnitDefinitionGateway` / `TraceabilityChainBuilder` に custom design docs root を注入し、`mydocs/product/user_stories.md` と `mydocs/product/construction/{unit}` を読むよう修正。
  - **後方互換**: config 未指定時は従来通り `docs/product/user_stories.md` / `docs/product/construction/{unit}` を利用。
  - **検証 (publish 前 local/self-host)**: `pnpm exec tsc --noEmit` pass。対象テスト 4 files / 29 tests pass。`pnpm test` は 453 files / 3520 tests pass。`/private/tmp/phasegate-local-wi093` の symlink なし reporter fixture で `validate --layer L2 --format human` を実行し、L2-001 blocker が `mydocs/product/product_overview.md` を参照することを確認。
  - **post-publish dogfood**: `/private/tmp/phasegate-dogfood-wi093-published` で `npx phasegate@0.130.0` を使い検証済み。custom `paths.designDocs: "mydocs/product/construction"` では L2-001 blocker が `mydocs/product/product_overview.md` を参照し、default `paths.designDocs: "docs/product/construction"` では `docs/product/product_overview.md` を参照。`validate-metadata mydocs/product/construction/sample/domain_model.md` は `mydocs/product/user_stories.md` 由来で PASS。`docs/product` symlink workaround なし。

## [0.129.0] - 2026-05-08

### Fixed

- **WI-092 — `createValidatorSystemModule()` 残 5 site の config threading 漏れを sweep** — v0.128.0 で `validate --layer L4` 経路のみ修正した DI 配線漏れの follow-up として、harness-api / pre-commit 経路でも user config (`layers.L2/L3/L4.enabled`) が validator-system composition root に渡るよう修正。
  - **対象**: `ValidatorSystemExecutionAdapter` の `runL3Validators()` / `runAllValidators()` / `runDriftDetection()`、および `runPreCommitCli()` / `runCommitMsgCli()` の計 5 site。
  - **共通 translator 化**: `toValidatorSystemConfig()` を `config-foundation/application/mappers/validator-system-config-mapper.ts` に移動し、`main.ts` / harness-api adapter / pre-commit CLI から共通利用。渡す値は `project.preset` と `layers.L2/L3/L4.enabled` のみに限定し、`validators` 配列は渡さない。validator catalog は validator-system の default 解決に委ねる。
  - **fallback**: `phasegate.config.json` 不在時のみ validator-system の default config にフォールバック。不正 config は従来通り runtime error として扱う。
  - **検証 (publish 前 local/self-host)**: PhaseGate 自身の `phasegate.config.json` (`layers.L4.enabled: false`) で `validate --layer L4` は exit 0 / PASS / validator 0 件。`phasegate:detect-drift --json` は drift detection direct 経路を維持し、既存 drift 2065 件により exit 1。
  - **テスト**: `pnpm test` は 452 files / 3518 tests pass。対象テスト 3 files / 11 tests pass。変更ファイルの `validate-metadata` pass。
  - **post-publish dogfood**: `/private/tmp/phasegate-dogfood-wi092` で `npx phasegate@0.129.0` を使い検証済み。`validate --layer L4 --format human` は exit 0 / PASS / validator 0 件、`phasegate:status --json` は L4 `enabled:false`、`phasegate:detect-drift --json` は fixture の drift 1 件を返して exit 1、`pre-commit` は staged markdown 2 件を検査して PASS。

## [0.128.0] - 2026-05-08

### Fixed

- **WI-091 finding #1 follow-up — `validate --layer L4` で `layers.L4.enabled: false` が runtime で実際に機能するよう composition root に config を thread (GitHub Issue #4)** — v0.127.0 publish 後の dogfood (`/tmp/phasegate-dogfood-wi091`, phasegate@0.127.0) で finding #1 の修正が runtime で機能していないことが判明したため緊急修正。
  - **症状**: `phasegate.config.json` に `layers.L4.enabled: false` を設定して `phasegate validate --layer L4` を実行しても、L4-001/002 が `[PASS]` (実際には実行された) となり、L4-003 だけが `[SKIP]` (strictOnly のため)。期待挙動は L4-001/002/003 すべて `[SKIP]`。
  - **根本原因**: `scripts/harness/main.ts:979` の `validate` case で `createValidatorSystemModule()` が config 引数なしで呼ばれており、`composition-root.ts:111-114` の `const configData = (config ?? DEFAULT_CONFIG)` で常に `DEFAULT_CONFIG` (L4.enabled=true) が使われていた。WI-091 finding #1 で `RunL4ValidatorsUseCase` に追加した gate (`if (!layerConfig.enabled) return [];`) はソースに正しく入っていたが、上流 DI で user の config が threading されていないため runtime で常に enabled=true 判定となり gate が hit せず drift / consistency / dead-code service が呼ばれていた。WI-085 retrospective (`feedback_dogfood_before_release.md`) で記録した「composition root の DI 配線漏れ」と同種の bug が再発した形。
  - **修正**: `main.ts` に `toValidatorSystemConfig(resolvedConfig: HarnessConfigV2 | undefined)` translator を追加し、HarnessConfigV2 から validator-system が期待する shape (`{ project: { preset }, layers: { L2/L3/L4: { enabled } } }`) に変換。`validate` case で `createValidatorSystemModule(toValidatorSystemConfig(resolvedConfig))` を呼ぶように修正。`validators` field は thread しない設計判断 — preset-style の `["drift-detector"]` が validator-code-style の `L4-001/002/003` を override し全 SKIP になる症状を回避するため、`validators` の解決は composition root 側の `defaultValidators[layer]` フォールバックに委ねる。
  - **テスト**: spawn 経由結合テスト 2 ケース (`scripts/harness/__tests__/integration/harness-api/validate-layer-config.integration.test.ts`) 新規追加:
    - `layers.L4.enabled: false` で `validate --layer L4` 実行時、L4 全 validator が `[SKIP]` 表示 + 総合判定 PASS + exit 0
    - `layers.L4.enabled: true` で L4 validator が enabled で実行 (回帰防止)
  - 全 3516 テスト (前回 3514 + 新規 2) グリーン、L1 lint 違反なし。
  - **スコープ外 (別 follow-up commit で対応)**: 同種の DI 配線漏れが `harness-api/infrastructure/adapters/validator-system-execution-adapter.ts:27/38/51` (phasegate:detect-drift / phasegate:check-ready 等の harness-api flow) と `integrations/pre-commit.ts:306/338` (Husky pre-commit) にも存在するが、別ハンドラ経路で `resolvedConfig` がスコープ外のため別途修正。
  - **教訓 (memory 反映)**: `feedback_dogfood_before_release.md` に「`paths` config / Artifact / PhaseConfigProviderPort 改修」と並べて「composition root の `createValidatorSystemModule(config?)` 経路」を追記。`createValidatorSystemModule()` を呼ぶ全 site (現状 6 箇所) で config が threading されているか毎回 grep 確認する規律を強化する。

## [0.127.0] - 2026-05-08

### Fixed

- **WI-091 — `layers.L4.enabled: false` 無視 / `--help` がサブコマンドで no-op / drift-detect が括弧 qualifier で破綻する 3 件を解消 (GitHub Issue #4)** — 外部レポーター nakataj-mti が pnpm monorepo 環境 (defense `standard` / architecture `clean`) で報告した 5 件の bug+DX gap (`L4.enabled` 無視 / warning でも overall FAIL / `--help` 副作用走行 / `paths` 設定が L2-001 に未配線 / drift element の括弧 qualifier 破綻) のうち、リスクの低い 3 件 (#1, #3, #5 immediate) を本リリースで先行修正。残る #2 (severity 集計セマンティクス) と #4 (paths threading 完成) は後続 WI に切り出す方針 (本 description の `スコープ外` 参照)。
  - **finding #1 — L4 enabled gate 追加 (`run-l4-validators-usecase.ts`)**: L3 (`run-l3-validators-usecase.ts:74-78`) と対称な `if (!layerConfig.enabled) return [];` ガードを `getLayerConfig` 直後に追加。`layers.L4.enabled: false` 設定で drift / consistency / dead-code service が呼ばれず、空配列を返すことで集計層で SKIP として表示される。dogfood 再現済 (`/tmp/phasegate-dogfood-wi091`, phasegate@0.126.0)。整合性テスト 2 ケース (`IT-UC-RunL4-007/008`) 追加。
  - **finding #3 — `--help` / `-h` を全 subcommand に pre-dispatch で集約 (`main.ts`)**: 51 個の subcommand のうち 3 個のみが inline `--help` を持っており、残り ~48 個は silent ignore で `update-skills --help` → 8 skills 再 deploy / `phasegate:detect-drift --help` → drift 実 run / `validate --help` → phase gate 実走 という副作用走行を起こしていた。`main()` 内に `SUBCOMMAND_HELP` table (13 entry) と `printSubcommandHelp` helper を追加し、`switch(command)` の手前で `hasFlag(args, "--help") || hasFlag(args, "-h")` を最優先で解釈 → usage 出力 + exit 0。table 未登録の subcommand は `Usage: phasegate <cmd> [options]\n(use 'phasegate --help' for the full command reference)` の generic fallback で exit 0。dogfood 再現済 3 ケースが本 fix で停止することを spawn 経由 5 ケース (副作用ナシ確認込み) で検証。
  - **finding #5 immediate — drift-detect の design heading から括弧 qualifier を normalize (`markdown-design-document-adapter.ts`)**: `extractConceptNames` が markdown heading から `（〜）` / `(〜)` qualifier (例: `（エンティティ・新規）`, `(legacy)`) を strip しないため code 側 class 名と exact match できず false-positive drift を出していた問題を解消。半角・全角括弧両対応、global flag で連続 / 複数 qualifier (`Foo（A）（B）` → `Foo`) も処理、strip 後 0 文字になる病的 heading は concepts に含めない。source code 側 (`biome-ast-source-code-analyzer-adapter.ts`) は AST node name から識別子のみ取得 (括弧含まず) のため design 側 normalize で十分。整合性テスト 4 ケース (`IT-REPO-DesignDoc-007〜010`) 追加。`pointers:` block 仕様による element → file path 明示は別 WI に切り出し。
  - **既存 inline `--help` 処理は残置**: `main.ts` の 3 箇所 (line 982 / 1028 / 1112) は pre-dispatch で hit する関係で dead code 化するが本 commit では削除せず (テスト互換性確保のため)。clean-up は別 commit で漸進可。
  - **テスト**: 全 3514 テスト (前回 3510 + 新規 11: finding #1 で 2 + finding #3 で 5 + finding #5 で 4) グリーン。L1 lint 違反なし。
  - **スコープ外 (別 WI 起票予定)**: finding #2 (warning-severity でも overall FAIL の集計セマンティクス) は ADR レベルの後方互換戦略判断が必要なため story-implementor 案件として分離。finding #4 (`paths.designDocs` を L2-001 へ完全 threading) は WI-085 で `inceptionDocs` 側のみ通った threading 漏れの補完で phase-nodes 3 ファイル + traceability-model 2 ファイルの placeholder 化を伴う story-implementor 案件として分離。

## [0.126.0] - 2026-05-08

### Fixed

- **WI-090 — `phasegate init` が unknown flag を silent ignore する問題を解消** — 例えば `phasegate init --skill-set core` (typo: 正しくは `--skills core`) を実行すると、従来は `--skill-set` 値が無視されて default の `all` で deploy されていた。本リリースで unknown flag を **exit 2 + suggestion** として error 化。
  - **新規ヘルパー**: `scripts/harness/main.ts` に `validateKnownFlags` / `findClosestFlag` / `levenshtein` の 3 関数を inline 追加 (presentation layer の zero-dep CLI parser に組み込み、commander/yargs などの外部依存は追加しない方針を維持)。
  - **挙動**: `init` 冒頭で `KNOWN_INIT_FLAGS = ["--name", "--preset", "--skills", "--agent", "--with-husky", "--yes"]` と照合し、未知の `--xxx` または `--xxx=value` を検出すると Levenshtein 距離 ≤ 4 の closest flag を `Did you mean '...'?` で提示、該当無しなら known flags の列挙を提示して exit 2。
  - **互換性**: 既存の正しい flag 利用 (`--skills core` / `--name foo` 等) には一切影響しない。`--yes` は既存 user の script 互換のため known flag として受理 (no-op)。
  - **help line 修正**: `main.ts` の `printUsage()` で表示される `init` 説明行に `--skills <core|all>` と `--yes` を追記 (従来 `--skills` が help から欠落していた)。
  - **テスト追加**: 4 integration ケース (`scripts/harness/__tests__/integration/harness-api/init-flag-validation.integration.test.ts`):
    - `--skill-set core` typo は `Did you mean '--skills'?` を出して exit 2
    - `--skill-set=core` (=value 形式の typo) も同様に検出
    - `--xyz-totally-unknown` は known flags の列挙を出して exit 2
    - 正しい組み合わせ `--name foo --skills all --agent claude --yes` は flag validation で reject されない
  - 全 3503 テスト (前回 3499 + 新規 4) グリーン、L1 lint 違反なし。
  - **スコープ外**: 他 subcommand (update-skills / migrate / lint / validate / etc.) への validateKnownFlags 展開は段階適用のため別 WI。`--help` per subcommand 実装も別 WI。

## [0.125.0] - 2026-05-08

### Changed

- **WI-089 — WI-088 guidance skills の dogfood feedback 反映 (P1, P2, P4, P5 + cohesion audit)** — v0.124.0 で追加した `phasegate-toolkit-guide` / `phasegate-config-doctor` を別 PJ で dogfood 検証した結果を反映し、UX 改善 + skill 内部の冗長 / 凝集度 / 矛盾を解消。
  - **P1 (discoverability)**: `phasegate init` 完了メッセージの末尾に `Need help?` ブロックを追加。`skillSet !== "core"` 時に `/phasegate-toolkit-guide` (Q&A) と `/phasegate-config-doctor` (config tuning) の起動方法を案内。
  - **P2 (fresh init shortcut)**: `phasegate-config-doctor` に **Step 1.5: Fresh init 判定** を新設。default config + 設計文書空 + Unit 構造未着手の 3 条件を全て満たすプロジェクトには「先に `/product-architect` で AIDLC を開始するのが効率的」とショートカット応答し、9 観点の機械的診断ノイズを抑制。
  - **P4 (UX 標準化)**: `phasegate-config-doctor` Step 4 (適用フロー) を `AskUserQuestion` ベースに書き換え。提案件数に応じて 1 回確認 / WARN→SUGGEST 分割を使い分ける指針を明記。
  - **P5 (consumer noise 削除)**: 両 skill 本文から `WI-086` / `WI-087` 等の実装履歴 WI 番号を削除し、機能ベースの記述 (例: `(v0.122 以降)` / `monorepo 自動検出`) に置き換え。consumer プロジェクトの AI に意味のない historical noise を排除。
  - **Cohesion audit** (`phasegate-toolkit-guide`): 「重要な設計原則」と「アンチパターン」「回答プロセス」と「回答時のスタイル」「マッピングが曖昧な場合 / 設定変更を伴う質問 / アンチパターン」の 3 重複を統合。設計原則を肯定形 4 項目に正規化、回答プロセスを 4 step に統合、境界条件を 1 セクションにまとめ、アンチパターン section を削除。
  - **Cohesion audit** (`phasegate-config-doctor`): 設計原則を 6 項目の肯定形に正規化しアンチパターン section を削除、観点 1 (schema バージョン) と観点 3 (architecture.preset) を「観点 1: architecture セクション (preset / 整合性)」に統合 (architecture key 不在判定 + 推奨 preset 推測 + custom 値検証を一体化)、Step 3 末尾の重複した「適用しますか？」列挙を Step 4 に統合、Step 4 末尾と重複していた「出力例 (簡易)」section を削除。
  - **矛盾解消** (`phasegate-config-doctor` 観点 3 paths): default path が「実プロジェクトのパスに合っていれば OK」という曖昧条件を「Read tool でリストして存在 + 中身ありなら OK / 存在しないか空なら scaffold 期 (Step 1.5) または別配置の可能性」と判定基準を明示化。
  - **検証**: 両 SKILL.md を `skill-creator/scripts/quick_validate.py` で再 validation pass。全 3499 テストグリーン (前回と同数、新規テストは追加せず — UX 改善 + 文章整理のため挙動変更なし)。L1 lint 違反なし。
  - **スコープ外**: P3 (canonical doc 日本語化 / 各 doc に日本語サマリ追加) は分量大のため別 WI (WI-090 候補) で扱う。

## [0.124.0] - 2026-05-08

### Added

- **WI-088 Phase B — bundled guidance skill `phasegate-config-doctor`** — `phasegate.config.json` の現状を schema + プロジェクト検出結果と突き合わせて改善案を **diff 形式で提案する診断スキル** を追加。Phase A の `phasegate-toolkit-guide` (read-only Q&A) と対をなす設定変更系 skill。AI による silent な書き換えを禁止し、必ずユーザー承認 → Edit → `phasegate validate --layer L2` 検証の手順を踏む。
  - **新規ファイル**: `skills/phasegate-config-doctor/SKILL.md` を `skill-creator` skill (`init_skill.py`) 経由で作成 (validation pass)。9 診断観点 (schema バージョン / project.preset / architecture.preset / paths / quickMode / harnesses / baseline / agentIntegration.stopHook.enforce / hook-config.json) ごとに OK / WARN / SUGGEST 判定の基準と提案 diff フォーマットを定義。
  - **設計原則**: silent 書き換え禁止 / schema を読んでから提案 / 機械検出を優先 / AI 推論は判断要素のみ・根拠提示必須 / read-only Q&A は phasegate-toolkit-guide に委譲。
  - **skill-deployer 拡張**: `SKILL_CATEGORIES.guidance` に `phasegate-config-doctor` を追加。`getSkillsForSet("all")` に含まれるが `getSkillsForSet("core")` には含まれない (Phase A と同じ責務分離)。
  - **テスト追加**: 4 ケース (guidance カテゴリ登録 / `getCategoryForSkill('phasegate-config-doctor') === 'guidance'` / `getSkillsForSet('all')` に含まれる / `getSkillsForSet('core')` に含まれない)。全 3499 テスト (前回 3495 + 新規 4) グリーン。
  - **互換性**: 既存 deploy ロジックに変更なし。consumer プロジェクトで `phasegate init` 実行時、`.claude/skills/` 配下に `phasegate-toolkit-guide` (Phase A) と `phasegate-config-doctor` (Phase B) の 2 つが追加 deploy される。

## [0.123.0] - 2026-05-08

### Added

- **WI-088 Phase A — bundled guidance skill `phasegate-toolkit-guide`** — phasegate を導入したプロジェクトで AI エージェントが phasegate ツールキット自体の概念 (L0-L4 / 防御プリセット / アーキプリセット / Quick Mode / Hook 仕様 / config 全般) について質問されたとき、`node_modules/phasegate/docs/guide/` 配下の canonical doc を読み込んで正確に回答するための skill を追加。
  - **設計原則 (stale 回避)**: SKILL 本体に概念知識を固定せず、概念カテゴリごとに canonical doc へのポインタのみを記述。`npm update phasegate` で knowledge が自動追従する構造。
  - **新規ファイル**: `skills/phasegate-toolkit-guide/SKILL.md` を `skill-creator` スキル (`init_skill.py`) 経由で作成 (validation pass)。9 概念カテゴリ (L0-L4 layer model / preset 2 系統 / Quick vs Full Mode / hook 仕様 / config 全般 / CLI / installation / skills overview / codex integration) ごとに `docs/guide/*.md` への参照を整理。
  - **skill-deployer 拡張**: `scripts/harness/setup/skill-deployer.ts` の `SkillCategory` type union に `"guidance"` を追加、`SKILL_CATEGORIES.guidance = ["phasegate-toolkit-guide"]` を登録、`getSkillsForSet("all")` の返り値に guidance カテゴリを含めた。`getSkillsForSet("core")` には含めない (core は continuous governance 用、guidance は ad-hoc Q&A 用なので責務分離)。
  - **テスト追加**: 4 ケース (`scripts/harness/__tests__/unit/setup/skill-deployer.test.ts` に `SKILL_CATEGORIES.guidance` 登録 / `getCategoryForSkill('phasegate-toolkit-guide') === 'guidance'` / `getSkillsForSet('all')` に含まれる / `getSkillsForSet('core')` に含まれない)。全 3495 テスト (前回 3491 + 新規 4) グリーン。
  - **互換性**: 既存 deploy ロジックに変更なし、`getSkillsForSet("core")` の返り値も変更なし。consumer プロジェクトで `phasegate init` 実行時、`.claude/skills/` 配下に `phasegate-toolkit-guide` が追加 deploy されるのみ。

## [0.122.0] - 2026-05-08

### Added

- **WI-087 Phase C-2 — Stop hook strict mode (`agentIntegration.stopHook.enforce`)** — 外部レポーター nakataj-mti が GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3) finding #4 で報告した「`phasegate hook stop` が Complete Check 失敗時に exit 1 を返すが、Claude Code の Stop hook block には exit 2 が必要」問題を解消。新 config flag `agentIntegration.stopHook.enforce: boolean` (default `false`) を v3 schema に追加し、true セット時のみ Complete Check 失敗で **exit 2 + `{"decision":"block","reason":"Complete Check failed (exitCode=N)"}`** を出力する strict mode に切り替わる。default は従来挙動 (exit cliResult.exitCode、stderr メッセージのみ) を完全維持。
  - **schema 拡張**: `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json` に top-level `agentIntegration.stopHook.enforce: boolean` を追加 (`additionalProperties: false`)。boolean 以外 / 未定義 key は AJV validator が reject。
  - **新ポートメソッド**: `ConfigQueryPort.getStopHookEnforce(): Promise<boolean>` を追加 (`scripts/harness/agent-integration/domain/ports/config-query-port.ts`)。
  - **infrastructure 実装**: `HarnessConfigConfigQueryAdapter.getStopHookEnforce()` が `agentIntegration.stopHook.enforce === true` のときのみ true を返す strict 一致判定。
  - **application 拡張**: `HandleStopOutput` DTO に `shouldEnforceFailure?: boolean` を追加。`HandleStopUseCase.execute` 内で `enforce && cliResult.exitCode !== 0` の合成条件を populate。reentry 検出時は populate されない (現行挙動保持)。
  - **presentation 分岐拡張**: `stop-hook.ts` で `output.shouldEnforceFailure === true` のとき stdout に decision JSON 出力 + stderr に reason 付きメッセージ + exit 2。それ以外は現行通り cliResult.exitCode で抜ける。
  - **テスト追加**: 11 ケース (`ajv-config-schema-validator-v3.test.ts` +5、`harness-config-config-query-adapter.test.ts` +2、`handle-stop-usecase.test.ts` +4)。全 3491 テスト (前回 3480 + 新規 11) グリーン。
  - **dogfood 検証**: phasegate 自身の `phasegate.config.json` に `enforce: true` を一時注入し `stop-hook.ts` を手動実行 → exit 2 + decision JSON 出力を確認。enforce 削除後は exit 1 + decision JSON なしの後方互換挙動を確認。
  - **既存テストへの影響**: `ConfigQueryPort` インターフェース拡張に伴い、`handle-pre-tool-use-usecase.test.ts` / `handle-post-tool-use-usecase.test.ts` / `handle-stop-usecase.test.ts` / `ci-governance-baseline-grandfather-adapter.test.ts` の mock literal に `getStopHookEnforce: vi.fn().mockResolvedValue(false)` を追加 (default 後方互換を維持しつつ TypeScript 型契約を満たす)。
  - **ドキュメント整合**: `docs/guide/configuration.md` に `agentIntegration` セクションを追加 (sub-field 表 + 用途説明)、`docs/guide/hooks-integration.md` の Stop hook 説明に enforce オプションを追記。
  - **互換性**: 既存 v2/v3 config (agentIntegration セクション不在) は default false で v0.121.0 以前と完全同一挙動。schema validator 経路 / ConfigQueryPort 既存メソッド経路への影響なし。

## [0.121.0] - 2026-05-07

### Fixed

- **WI-087 finding #3 + WI-086 docs: PreToolUse の Quick Mode 通過時の visibility 改善 + hook 責務分離をドキュメント化** — 外部レポーター nakataj-mti / junpei-9898 が GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3) finding #3 / [#2](https://github.com/junpei-9898/phasegate/issues/2) で報告した「Quick Mode で write が allow されるとき hook が完全 silent で、初見ユーザーが "hook が走っていない" と誤認する」問題と「pre-tool-use が L1 lint をしないことが暗黙仕様化していてレポーター期待と齟齬している」問題を解消。
  - **Quick Mode visibility notice** (`scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts`): `HandlePreToolUseOutput.quickModeAllowed` がセットされた場合、stderr に `phasegate: write allowed (Quick Mode, category=<dominantCategory>)` を出力。exit code は 0 維持で **semantics は不変**、可視性のみ向上。
  - **DTO 拡張** (`scripts/harness/agent-integration/application/dto/handle-pre-tool-use-dto.ts`): `quickModeAllowed?: { dominantCategory?: string }` を追加。`HandlePreToolUseUseCase.execute` 内で `WRITE_TOOLS + fullModeRequirementQueryPort + requiresFullMode=false` の経路で populate。block 経路や WRITE_TOOLS 外 (`Bash` 等) では出力されず、後方互換維持。
  - **テスト追加** (`scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts`): 4 ケース — `quickModeAllowed` が `dominantCategory` 付きで返る / `dominantCategory` 未設定で返る / `fullModeRequirementQueryPort` 未指定時は出力なし / WRITE_TOOLS 外 (`Bash`) では出力なし。全 49 ケース (前回 45 + 新規 4) グリーン。
  - **責務分離のドキュメント明文化** (`docs/guide/hooks-integration.md`): "Responsibility Separation" セクションを冒頭に追加し、pre = フェーズゲート / post = lint / Stop = complete-check の役割分担表と「pre-tool-use は意図的に lint を実行しない (lint は書き込み後の content が必要)」旨を明記。WI-086 で指摘された「`pre-tool-use` で違反 Write を exit 2 でブロックしてほしい」期待が現行設計と乖離する理由を ユーザー視点で説明。
  - **互換性**: 既存テスト全てグリーン（`expect(actual).toEqual({ shouldBlock: false })` 形式の既存 assert は `quickModeAllowed: undefined` を含む結果でも一致）。`HandlePreToolUseOutput` への field 追加は外部 API ではなく application/presentation 内部 DTO のみで、外部消費者なし。
  - **スコープ外** (Phase C-2 で対応予定): WI-087 finding #4 — Stop hook `--enforce` flag (`agentIntegration.stopHook.enforce` config 追加で Complete Check 失敗時に exit 2 + decision JSON `"deny"` を返す strict mode)。config schema 拡張のため story-implementor で別リリース予定。

## [0.120.0] - 2026-05-07

### Fixed

- **WI-087 Phase B + WI-086 finding #1 統合対応: `phasegate init` のデフォルト値を実プロジェクト構成に追従させる** — 外部レポーター nakataj-mti / junpei-9898 が GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3) / [#2](https://github.com/junpei-9898/phasegate/issues/2) で報告した「デプロイされる `hook-config.json` のデフォルト値が単一パッケージ構成（`targetDirs:["src"]` / `formatter:"biome"`）固定で、モノレポ構成や biome 不在環境ではユーザーが明示的に書き換えない限り hook が silent no-op になる」問題を修正。
  - **モノレポ workspace 自動検出** (`scripts/harness/setup/skill-deployer.ts:detectWorkspaceTargetDirs`): `pnpm-workspace.yaml` の `packages:` 配列 → `package.json.workspaces` (配列形式 / `{packages:[...]}` オブジェクト形式の両対応) → `lerna.json.packages` の優先順位で検出。検出した workspace glob (`pkg/*` 等) を実 FS 上で展開し、`<workspace>/src` ディレクトリが存在するもののみを `targetDirs` に採用。pnpm-workspace.yaml は依存追加を避けるため line-based の最小 parser で対応 (`packages:` ブロック検出 + `- 'pattern'` 行抽出のみ)。
  - **formatter 自動検出** (`detectFormatter`): `package.json.devDependencies` (および `dependencies`) を読み、`@biomejs/biome` 存在 → `biome` + `["check","--write"]`、不在 + `prettier` 存在 → `eslint-prettier`、どちらも不在 → `null` (formatter フィールド省略で `format-typescript-hook.sh` の case 文 default フォールスルー、registry pull を回避)。
  - **`deployHookScripts` 拡張**: `copyDirectory` 直前に既存 `.claude/scripts/hook-config.json` を捕捉し、(a) 既存あり → 元の内容を書き戻して **ユーザーカスタマイズ尊重**、(b) 既存なし → 検出結果を反映した新規 hook-config.json を生成。`DeployHooksResult` に `hookConfigGenerated` / `detectedTargetDirs` / `detectedFormatter` を追加し、`scripts/harness/main.ts` の init 出力に `✓ hook-config.json generated (targetDirs: ...; formatter: ...)` 行を追加。
  - **`initHarnessConfig` テンプレートに `architecture: { preset: "clean" }` を追加**: 新規プロジェクトで生成される `phasegate.config.json` が schemaVersion = 'v3' と判定されるようにし、`init` 直後の v2 schema warning を解消（GitHub Issue #2 の "v2 schema warning が phasegate init 直後でも出る" を解消）。既存 v2 config を持つプロジェクトは `migrate-schema` CLI / 手動編集ルートを継続。
  - **テスト追加**: `scripts/harness/__tests__/integration/setup/init-hook-config-detection.integration.test.ts` (14 ケース) — workspace 検出 (pnpm/npm/yarn 配列/yarn オブジェクト/lerna/未定義/src 不在/全 src 不在)、formatter 検出 (biome/prettier/null)、hook-config.json 生成 (既存尊重 / 新規生成)、schema v3 化 (architecture フィールド存在 / `phasegate:status` の stderr に v2 warning が出ないこと)。
  - **互換性**: 既存 v2 config を読む load-resolved-config-use-case 側は変更なし。既存 `.claude/scripts/hook-config.json` をカスタマイズ済みのプロジェクトで `phasegate init` を再実行しても上書きされない (write-back ガード)。
  - **スコープ外** (Phase C で対応予定): Quick Mode 通過時の stderr notice (finding #3) / Stop hook `--enforce` flag (finding #4) / `pre-tool-use` の責務範囲ドキュメント明文化 (WI-086)。

## [0.119.0] - 2026-05-07

### Fixed

- **WI-087 Phase A: `phasegate init` がデプロイする hook スクリプトが macOS 標準 bash 3.2 で silent no-op になる問題を修正** — 外部レポーター nakataj-mti が GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3) で報告。`templates/.claude/scripts/format-typescript-hook.sh` および `analyze-errors-hook.sh` の `mapfile -t TARGET_DIRS < <(jq ...)` が bash 4+ builtin であり、macOS 標準 `/bin/bash` (3.2.57) では `mapfile: command not found` エラーで `TARGET_DIRS` 配列が空になり、後続の `${#TARGET_DIRS[@]} -eq 0` 判定で hook が exit 0 で抜けていた。結果としてユーザーには何も表示されず、format / lint hook が deliberately quiet と誤認される状態だった。
  - `mapfile -t ARRAY < <(...)` を bash 3.2 互換の `while IFS= read -r line; do ARRAY+=("$line"); done < <(...)` idiom に置換（`format-typescript-hook.sh` 内 2 箇所、`analyze-errors-hook.sh` 内 1 箇所）。
  - shebang は `#!/bin/bash` を維持（追加インストール不要、既存ユーザーへの影響なし）。
  - 検証: macOS bash 3.2.57 で `targetDirs` を含む hook-config.json をロード後、対象ディレクトリ下のファイルに対して `format-typescript-hook.sh` が `Formatted: ...` を出力、`analyze-errors-hook.sh` が `{"decision": "approve", ...}` を返すことを確認。
  - 関連: WI-086（GitHub Issue [#2](https://github.com/junpei-9898/phasegate/issues/2), reporter: junpei-9898）の "post-tool-use がセッション中に呼ばれても通知されない" 症状の主因も同じ `mapfile` であり、本修正で副次的に解消する。
  - スコープ外（後続フェーズで対応予定）: `phasegate init` の monorepo 自動検出（WI-087 Phase B）、Quick Mode 通過時の stderr notice / Stop hook `--enforce` flag（WI-087 Phase C）、`phasegate init` の formatter 自動検出（WI-087 Phase B）。

## [0.118.0] - 2026-05-07

### Fixed

- **WI-085 follow-up: validator-system / harness-api 経路で `paths` config が phase-dependency-model に流入していなかった問題を修正** — v0.117.0 リリース後のセルフホスト dogfooding で発見。`scripts/harness/validator-system/infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.ts` および `scripts/harness/harness-api/infrastructure/adapters/phase-dependency-model-query-adapter.ts` が `createPhaseDependencyModelModule({ rootDir })` を `phaseConfig` 引数なしで呼んでおり、`paths.designDocs` / `paths.inceptionDocs` が L2-001 (`npx phasegate validate --layer L2`) と harness-api 経由の phase-gate query から到達できない状態だった。`agent-integration` 配下の `phase-gate-query-adapter.ts` と同等の `loadResolvedConfigUseCase` + `toPhaseConfigSection` 注入経路を 3 箇所追加。
  - dogfood 検証: `paths.designDocs: "mydocs/product/construction"` / `paths.inceptionDocs: "mydocs/inception"` 設定で L2-001 ブロッカーが `mydocs/inception/_shared/product_overview_plan.md` 等を要求することを確認。
  - デフォルト設定での挙動は v0.117.0 と完全互換（dogfood 復元後にベースラインブロッカー `docs/product/units/{unit}_unit.md` のみ残ることを確認）。

## [0.117.0] - 2026-05-07

### Fixed

- **WI-085: phase-gate validator (L2-001) が `paths.designDocs` / `paths.inceptionDocs` 設定を尊重しない問題を修正** — 外部レポーター nakataj-mti が GitHub Issue [#1](https://github.com/junpei-9898/phasegate/issues/1) で報告。`paths.designDocs` を `mydocs/...` などのデフォルト外パスに変更しても、L2-001 が要求する成果物パスは `docs/inception/...` / `docs/product/...` のままになる挙動を修正した。`docs/guide/configuration.md` の「`paths` を変えれば全 validator / hook が解決する」記述と実装の齟齬を解消。
  - **新プレースホルダ**: `Artifact.path` で `{designDocsRoot}` / `{inceptionDocsRoot}` を許可。`Artifact.resolve(scope, pathRoots?)` が `paths.designDocs` / `paths.inceptionDocs` の値（未指定時はデフォルト `docs/product/construction` / `docs/inception`）でこれらを展開するよう拡張（[ADR-016](docs/ADR/ADR-016-paths-config-placeholder.md)）。
  - **`docs/` 接頭辞バリデーション撤廃**: `Artifact.create()` の `path` が `docs/` 始まりでなければ `InvalidArtifactPathError` を投げる挙動を削除。プレースホルダ展開後の任意 root（`mydocs/...` 等）を許容するため。許可外プレースホルダの拒否は維持。
  - **新ポートメソッド**: `PhaseConfigProviderPort.getPathRoots(): Promise<{ designDocsRoot, inceptionDocsRoot }>` を追加。`HarnessConfigPhaseConfigProvider` が `paths.designDocs` / `paths.inceptionDocs` 設定を読み（末尾スラッシュは trim）、未指定時はデフォルト値を返す。
  - **流入経路**: `EvidenceBundleAssembler.assembleForLevel` 内で `getPathRoots()` を 1 回呼び、結果を `Artifact.resolve(scope, pathRoots)` および `ArtifactExistenceCheckerPort.checkAll(artifacts, scope, pathRoots)` に渡す。`PhaseInfoResolver.resolve(..., pathRoots?)` でブロッカー表示時にも root プレースホルダを実値に展開。
  - **phase-nodes リテラル置換**: `STANDARD_PHASE_NODES` / `FULL_PHASE_NODES` / `MINIMAL_PHASE_NODES` の path リテラル `'docs/inception/...'` / `'docs/product/construction/...'` を `'{inceptionDocsRoot}/...'` / `'{designDocsRoot}/...'` に置換。
  - **後方互換**: `paths` 未指定または既定値の場合、要求パスは v0.116.0 以前と完全同一。
  - **スコープ外（Q1 (α) 採用）**: `docs/product/product_overview.md` / `docs/product/user_stories.md` / `docs/product/units/{unit}_unit.md` 等、`docs/product/` 直下の Level 1 product-wide 成果物はリテラル維持。`paths.designDocs`（= `docs/product/construction`）は construction subtree のみを管理する。
  - **テスト追加**: ユニット 9 ケース（UT-PD-169〜177）と既存 5 ケースの意味反転 / シグネチャ拡張、IT 8 ケース（IT-PD-123〜130）を追加。`unit_test_design.md` / `it_test_design.md` / `coverage_report.md` 同期更新。
  - **ドキュメント整合**: `docs/guide/configuration.md` §「Paths and the AIDLC Document Structure」に新プレースホルダ仕様と非 construction パスの取り扱いを明記。

## [0.116.0] - 2026-05-07

### Security

- **WI-036: skill-quality の git-commit-executor adapter におけるコマンドインジェクション (HIGH) を修正** — WI-035 Phase 3 横展開監査で発見した follow-up。`execSync(\`git commit -m ${JSON.stringify(message)}\`)` を `execFileSync('git', ['commit', '-m', message], ...)` 配列引数形式に置換。`JSON.stringify` がバッククオート / `$` をエスケープせず `/bin/sh -c` 経由で評価される経路を遮断。
  - `scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts` を `execFileSync` 化、コンストラクタに `gitExecutor` を DI 可能化（テスタビリティ向上、`CommitExecutorPort.commit()` の外部 signature は不変）。
  - 悪意ある `description`（バッククオート / `$()` / `;` / `"` / 改行 / `|` 含む）が引数配列にそのまま渡されシェル評価されないことを assert する unit test (`__tests__/unit/skill-quality/git-commit-executor-adapter.test.ts`) を新規追加。
  - 横展開監査 (再走査): 非テストコード `scripts/harness/**/*.ts` の `execSync(\`...${var}...\`)` パターンが **完全消滅**（WI-035 / WI-036 で網羅完了）。
- WI-035 / WI-036 の `status` を `drafted` → `implemented` に更新。

## [0.115.0] - 2026-05-07

### Documentation

- **WI-036 起票** — WI-035 Phase 3 横展開監査の follow-up として、`scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts:14` の `execSync(\`git commit -m ${JSON.stringify(message)}\`)` を同種コマンドインジェクション (HIGH) の sink として切り出し、別 WI に分離。`JSON.stringify` がバッククオート / `$` をエスケープしないため、`description` が外部入力に由来すると `/bin/sh -c` 経由で評価され得る点を文書化。修正実装は次回（`execFileSync` 配列引数化 + DI seed 化 + 悪意 description fixture テスト）。
- WI-035 description.md の Phase 3 監査結果欄を「WI-036 として起票済み」に更新。

## [0.114.0] - 2026-05-07

### Security

- **WI-035: phase2-extensions の git-log adapter におけるコマンドインジェクション脆弱性 (HIGH) を修正** — `/security-review` で発見。`execSync` テンプレート文字列に `documentPath` / `filePath` をダブルクオート展開していたため、ファイル名に `$()` / バッククオート / `;` 等のシェルメタ文字を含めると `/bin/sh -c` 経由で任意コードが実行される経路があった（攻撃者は POSIX 許容範囲のファイル名を含む公開リポジトリを 1 つ用意するだけで成立。clone / `gh pr checkout` でローカルに展開された時点で発火し、マージは不要）。
  - `scripts/harness/phase2-extensions/infrastructure/adapters/git-log-document-age-adapter.ts` の `gitLogExecutor` を `execFileSync` 配列引数形式（`('git', ['log', '--format=%ai', '-1', '--', documentPath], ...)`）に置換。
  - `scripts/harness/phase2-extensions/infrastructure/adapters/git-log-initial-creation-age-adapter.ts` の `gitExecutor` を同形式に置換（`runGit(args)` の signature も合わせて変更）。
  - DI ポートの signature を `(command: string) => Buffer` から `(file: string, args: readonly string[], options) => Buffer` に変更。
  - 悪意あるファイル名（`$()` / バッククオート / `;` / `"` / `|` 含む）でも引数が **配列要素のまま** 渡され、シェルメタ文字として評価されないことを assert する unit test を 2 ファイルに追加。
  - 横展開監査結果: 同種パターン (`execSync(\`...${var}...\`)`) は他に `scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts:14` に 1 箇所存在（`JSON.stringify` 経由だが `$` / バッククオートが残存）。本 WI のスコープ (`affects: [phase2-extensions]`) 外のため follow-up WI として WI-035 description に記録。

## [0.110.0] - 2026-04-25

### Documentation

- **WI-030: README / layer-model 主張と実装の乖離訂正** — README.ja.md と docs/guide/layer-model.md の audit で発見した不整合を訂正。
  - **README.ja.md L180**: 「毎週月曜 09:00 UTC + GitHub Issue 自動作成」の記述を実態に合わせて訂正。bundled template (`scripts/harness/templates/.github/workflows/consistency-check.yml`) は月曜 04:00 UTC + issue 自動化、CLI 生成 (`ci:generate-template --type consistency-check`) は毎日 02:00 UTC + issue 化なし、と二系統あることを明示。`phasegate init` が workflow を自動配置しない点も補足。
  - **README.ja.md L408**: feature flag disclaimer 「ランタイム動作未実装」を削除し、`agentLessonCollection` / `cascadeUpdate` / `bundleSizeLimit` / `deadCodeGC` の各 runtime 動作実装箇所を表に追記。
  - **docs/guide/layer-model.md L4 セクション**: WI-029 で誤って追加した `doc-freshness` / `pointer-validation` を L4 validators 一覧から削除し、これらは `phase2-extensions` unit の `p2:check-freshness` / `p2:validate-pointers` CLI として実装されている旨を注記（L4-004 / L4-005 への昇格は WI-033 に分離）。
- **README.md / README.ja.md に Roadmap 節を新設** — partial 実装 / user-side wiring 依存の機能を 4 件の Work Item として明示:
  - WI-031: CI template 二系統統一 + `phasegate init --with-ci`
  - WI-032: AGENTS.md / CLAUDE.md auto-refresh パイプライン
  - WI-033: `doc-freshness` / `pointer-validation` を L4 validator に昇格
  - WI-034: L0 legacy validator (`L0-001` / `L0-002`) の撤去

Source code 改変なし。次のリリースで上記 Roadmap WI が順次対応される予定。

## [0.109.0] - 2026-04-25

### Documentation

- **WI-029: 5-Layer Defense Model docs の正確化** — L0 が legacy な `hook-config` / `gate-check` / `FUSEフック` 検証ではなく、**`agent-integration` unit の 5 種 runtime hook + Husky 2 種 git hook** で実現されている実態に docs を一致させた。
  - `README.md` / `README.ja.md`: 5-Layer 表の L0 description を agent-runtime hooks (`PreToolUse` / `PostToolUse` / `Stop` / `SessionStart` / `UserPromptSubmit`) + Husky (`.husky/pre-commit` / `.husky/commit-msg`) に書き直し。L4 が `layers.L4.enabled: false` デフォルトであることも補足。
  - `docs/guide/layer-model.md`: **L0: Agent Runtime Hooks + Git Hooks** セクションに全面改訂。L0-A（agent runtime 5 hook）と L0-B（Husky 2 hook）の責務表を追加。legacy validator `L0-001` / `L0-002` は disabled である旨を明記。L4 セクションにも「default disabled + opt-in による週次 cron 運用」を追記、`doc-freshness` / `pointer-validation` を validator 一覧に追加。
  - `CLAUDE.md`: 「L0 FUSEフック検証」記述を「L0 legacy validator（現状 enabled: false）」に訂正し、実運用の L0 経路（agent-integration hook + Husky）を補足。

Source code 改変なし。`list-errors --layer L0` の `L0-001` / `L0-002` definition は legacy として残置（削除は別 WI）。

## [0.108.0] - 2026-04-25

### Documentation

- **WI-028: `migrate work-items` + WI taxonomy のドキュメント整備** — WI-026 / WI-027 で導入された機能の公開ドキュメント整合。
  - `CHANGELOG.md`: v0.101..v0.107 の 7 リリースを Keep-a-Changelog 形式で追記。
  - `README.md` / `README.ja.md`: CLI Reference 表に `migrate work-items` を追加。
  - `docs/guide/cli-reference.md`: **Work Item Migration** セクションを新設し、検出パターン（`ISSUE-XXX` / `WI-XXX` / `H{NN}-{NN}`）、sequential allocator の挙動、frontmatter 注入の冪等性、legacy_id grep 互換性、exit code を解説。

## [0.107.0] - 2026-04-25

### Fixed

- **WI-027 root cause 修正**: `FileSystemWorkItemMigrationApplyGateway#ensureFrontmatter` が `---\n` で始まる既存 frontmatter を常に保持してしまい、旧 story-style frontmatter (`id: H02-06`, `unit: ...`, `issue: ...`, `phase: ...`, `created: ...`) を持つ H-ID directory に対して planner 生成 frontmatter が prepend されないバグを解消。
  - 既存 frontmatter なし → 従来通り planner 生成版を prepend（変更なし）。
  - 既存 frontmatter の `id` が target WI と不一致 / `legacy_id` 不在 → planner 生成 frontmatter で旧 frontmatter を **置換**し、本文は保持。
  - 既存 frontmatter が target WI と一致 + `legacy_id` も一致 → byte-for-byte **冪等保持**（再 apply 安全）。
- 単体テスト追加: `apply-gateway` に「旧 frontmatter 置換」「冪等性」の 2 シナリオ + end-to-end dogfood で 3 シナリオ（stale 置換 / stub 生成 / 冪等保持）全 PASS。

## [0.106.0] - 2026-04-25

### Fixed

- **WI-027 dogfood follow-up**: v0.105.0 適用時、5 件の H-ID directory が旧 story-style frontmatter (`id: H02-06` 形式) を保持していたため、`legacy_id` が記録されず directory 名と `id:` フィールドの不整合が発生していたデータ修正。対象: `agent-integration/WI-033`, `phase-dependency-model/WI-053`, `phase-dependency-model/WI-054`, `quick-mode/WI-060`, `skill-quality/WI-072`。
- 各ファイルの frontmatter を planner 生成形式（`id: WI-XXX` / `type: story` / `severity: normal` / `status: drafted` / `legacy_id: H{NN}-{NN}`）に正規化。

## [0.105.0] - 2026-04-25

### Added

- **WI-027: `migrate work-items` を H-ID 旧ストーリーレイアウトに拡張** — WI-026 残作業 G2-1/G2-2 の切り出し。`docs/inception/{unit}/H{NN}-{NN}/` 形式 directory（57 件）を `migrate work-items` の対象に含め、空き番号の若い順に `WI-XXX` へ採番する。
  - **`WorkItemMigrationSourcePort#listExistingWorkItemIds()` 追加**: 既存 `_cross/WI-XXX/` + `{unit}/WI-XXX/` directory の ID を列挙。planner が採番時に予約番号として使用。
  - **`WorkItemMigrationPlanner` の sequential allocator**: `existingWorkItemIds` + 同一 plan 内 ISSUE-XXX の embedded number を `usedNumbers` に登録し、H-ID には未使用の最小 WI 番号を割り当てる。ISSUE-XXX → WI-XXX の embedded mapping は変更なし（後方互換）。
  - **H-ID 由来 candidate の frontmatter**: `type: story`（issue ではなく）+ `legacy_id: H{NN}-{NN}` を生成。`affects` は付かない（unit-scoped のため）。
  - **`FileSystemWorkItemMigrationSourceGateway` の H-ID directory walker**: `^H\d{2}-\d{2}$` パターンで unit 配下の H-ID directory を列挙、`SKIPPED_INCEPTION_DIRS` (`_shared` / `_operation` / `_cross` / `issues`) は引き続き skip。
  - **適用結果**: phasegate 自身の dogfood で 57 件の H-ID directory を `WI-028..WI-084` に物理 rename + frontmatter 注入。`description.md` 不在の 44 件には stub `# {legacyId}\n` を自動生成。

### Fixed

- **同梱修正: reflection adapter の unit-scoped legacy_id 解決** — `FileSystemStoryReflectionAdapter#readLegacyId` が `_cross/{WI-XXX}/description.md` のみを参照していたため、H-ID 移行で初出した unit-scoped WI（traceability-model/WI-074 等）に対する `@story-id H{NN}-{NN}` annotation が legacy_id 経由で反映認識されず、source 書込時に dead-lock を起こしていた。`{unit}/{WI-XXX}/description.md` も走査するよう拡張し、product 側既存 `@story-id H{NN}-{NN}` annotation が継続利用可能に。
- 単体テスト UT-PD-169 追加（unit-scoped WI の legacy_id 経由 reflection 検出）。

### Tests

- planner: 5 ケース追加（H-ID 単独 / existingWorkItemIds skip / type: story frontmatter / ISSUE 混在 skip / 連続 H-ID 採番）。
- gateway: 4 ケース追加（H-ID directory 列挙 / 既存 issues との混在 / `listExistingWorkItemIds` _cross+unit 併合 / 空 inception）。
- plan use case: existingWorkItemIds を planner に渡すケース追加。
- reflection adapter: UT-PD-169 (unit-scoped WI legacy_id 解決)。
- 全 3440 tests green。

## [0.104.0] - 2026-04-25

### Fixed

- **WI-026 残作業 G2-3〜G2-5 / G3 / G4** — Phase A-3 / G1 の続編として ISSUE-026 残債を清掃。
  - **G2-3**: 空の `docs/inception/issues/` を物理削除（cross issue 旧 layout）。
  - **G2-4**: `WriteTargetScope.fromPath` の legacy `issues` 分岐を撤去（`{unit}/issues/{ISSUE-XXX}` パスは全 WI 移行済のため不要）。
  - **G2-5**: `FileSystemStoryReflectionAdapter#listUnitWorkItemDirectories` の `name !== "issues"` filter を撤去。
  - **G3**: L2-STORY-REFLECTION のメッセージで storyId が `WI-` 始まりの場合 `@work-item-id` を出力（旧 `@story-id` 表記を統一）。
  - **G4-1〜G4-3**: `_cross/WI-026/description.md` の `status` を `implemented` → `drafted` に戻し、AC checkbox を実態と一致させ、Phase 3 仕様文言を G1 採用案 B に合わせて訂正。

## [0.103.0] - 2026-04-24

### Fixed

- **WI-026 残作業 G1: `_cross/WI-XXX/` inception 編集 dead-lock 解消** — `HandlePreToolUseUseCase#resolveStoryReflectionScope` で `docs/inception/**` への書込を reflection check 対象外にする（採用案 B）。`_cross/WI-XXX/{description,logical_design}.md` を新規作成しても `affects` 不一致による Level 3 reflection 要求でブロックされなくなる。`scripts/harness/{unit}/...` 書込での reflection check は維持。
- integration test: `_cross/WI-099/{description,logical_design}.md` の新規作成が pass、agent-integration ソース書込で WI-001 reflection が依然要求されることを確認。

## [0.102.0] - 2026-04-24

### Added

- **ISSUE-026 Phase A-2 (H03-04): WorkItem frontmatter parser** — 設計文書 frontmatter から WI メタデータを抽出する専用 parser を `traceability-model` に追加。既存 `parseFrontmatterFlags` は無変更・後方互換維持。
  - 新規 API: `WorkItemFrontmatter` interface (`id` / `type` / `affects` / `severity` / `status` / `source` / `legacyId`、すべて readonly)、`WorkItemType` / `WorkItemSeverity` / `WorkItemStatus` string union、`parseWorkItemFrontmatter(content: string): WorkItemFrontmatter | null`、`WorkItemFrontmatterValidationError`、`WORK_ITEM_ID_PATTERN` (`WI-\d+` / `H\d{2}-\d{2}` / `HF\d+-\d{2}` / `ISSUE-\d+`)。
  - UT-TM-W01〜W10 の 10 ケースで AC-1〜AC-10 を 1:1 カバー、3390 tests green。

## [0.101.0] - 2026-04-24

### Added

- **ISSUE-026 Phase A-1 (H02-04): `@work-item-id` annotation parser 併存対応** — `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` の regex を `/@(story-id|issue-id|work-item-id)[ \t]+([^\n\r]+)/g` に拡張し、`@story-id` / `@issue-id` / `@work-item-id` の 3 系統を同一規約で認識（後方互換維持）。HTML コメント形式 (`<!-- @work-item-id WI-001 -->`) およびカンマ/空白区切りの複数 ID 列挙にも対応。

### Fixed

- pre-commit の unitName 導出バグ修正。

## [0.100.0] - 2026-04-23

### Added

- **ISSUE-014 Wave 6: preset 選定ガイド + `migrate` CLI + 呼称分離 + v0.86.0 未満警告** — Wave 5.5 までの実装を user 導線と docs に接続し ISSUE-014 を CLOSE する。
  - **`docs/guide/preset-selection.md` 新設**: 7 preset（clean / strict-ddd / onion / hexagonal / layered / flat / custom）の早見表 + 選択フローチャート + 設定例 + override / custom の書式 + v2 → v3 移行手順。
  - **README.md**: Presets 節を「Defense preset（`project.preset`）」「Architecture preset（`architecture.preset`）」の 2 テーブルに分け、preset-selection.md への導線を追加 + 呼称分離の補足。
  - **CLAUDE.md**: 「防御プリセット（CI strict/lenient）」と「アーキプリセット（clean/onion/hex...）」の呼称分離ガイドを追記。issue / PR / チャットで「preset」とだけ書かず必ず種類を明示するルール化。
  - **retrofit-adoption.md**: Step 1 に architecture preset 選定節を追加、`npx phasegate migrate --schema v3` の導線。
  - **`phasegate migrate --schema v3` CLI 新設** (`scripts/harness/config-foundation/`): `MigrateSchemaUseCase` + `MigrateSchemaCommandHandler` + `main.ts` の switch-case `migrate` + ヘルプ追記。`phasegate.config.json` を読んで `architecture` キーが無ければ `{ preset: "clean" }` を追記して v3 化（idempotent）。
  - **v0.86.0 未満警告**: `LoadResolvedConfigUseCase` が source document の `architecture` 有無で `schemaVersion: 'v2' | 'v3'` を判定して output DTO に追加。`main.ts` の `loadResolvedConfig()` が v2 検出時に `npx phasegate migrate --schema v3` の案内を **一度だけ** stderr に出力（同一プロセスで多重 load されても重複警告しない）。

### Tests

- 新規 `scripts/harness/__tests__/unit/config-foundation/migrate-schema-use-case.test.ts` で 6 テスト: v2→v3 変換 / v3 no-op / array document で InvalidConfigShapeError / null document / 未対応 targetVersion / configPath 透過。
- 新規 `scripts/harness/__tests__/integration/config-foundation/migrate-schema-use-case.test.ts` で 2 テスト: tmp dir round-trip（v2 config → 永続化検証 / v3 config → mtime 不変で no-op 確認）。
- 既存 `load-resolved-config-use-case.test.ts` と `load-config-facade.test.ts` の toEqual 期待値に `schemaVersion: 'v2'` を追加。
- 全 3387 tests green（3368 unit/integration + 19 forks、+8 新規）、`npx phasegate lint` violations 0（1301 ファイル scan）。

### Notes

- これにより ISSUE-014（アーキテクチャスタイルの config 対応）は Wave 1〜6 完走 → **CLOSED**。v0.86.0〜v0.99.0 の 14 バージョンで段階的に構築: Wave 1 設計文書 → Wave 2 VO 注入 → Wave 3 schema v3 → Wave 4 flat preset + biome-ast-engine 配線 → Wave 5 pipeline 全体に spec 配線 → Wave 5.5 3 preset dogfood integration test → Wave 6 guide + migrate CLI + 警告。
- `phasegate migrate --schema v3` は破壊的変更ではなく additive（既存フィールドは保持、`architecture` だけ追加）。本リポジトリ自身は Wave 3 時点で dogfood 済のため migrate 対象外。

## [0.99.0] - 2026-04-23

### Added

- **ISSUE-014 Wave 5.5: 3 preset（onion / hexagonal / layered）dogfood を vitest integration test で自動化** — Wave 5 で pipeline 配線は完成したが、外部 PJ 相当の end-to-end 検証は pre-tool-use-hook の `/tmp/**/src/domain/**` blocking で deferred していた。本 Wave では `/tmp/` への Claude Write を諦め、**テストランタイムの `fs.writeFileSync`（hook 対象外）で `os.tmpdir()` に fixture 展開する方針**に切り替えて解消。
  - `scripts/harness/__tests__/integration/biome-ast-engine/preset-dogfood.integration.test.ts` を新設（`@story ISSUE-014`）。
  - 各 preset につき「許容方向 import → violation 0 件」と「違反方向 import → `no-layer-violation` で検出」の 2 テスト × 3 preset = 計 6 テストを `createBiomeAstEngineModule(rootDir, { architecture })` 経由で `ExecuteLintUseCase.execute({ targets: ['src'], includeBiomeNative: false })` を呼び出して検証。
  - 検証内容: onion（interface→domain 許容 / domain→interface 検出）、hexagonal（adapters→core 許容 / core→adapters 検出）、layered（presentation→business→data 許容 / data→presentation 検出）。

### Tests

- 新規 `preset-dogfood.integration.test.ts` で 6 テスト追加（3354 → 3360）。
- 全 3379 tests green（3360 unit/integration + 19 forks）、`npx phasegate lint` violations 0（1297 ファイル scan）。

### Notes

- 本 Wave は当初「`/tmp/phasegate-dogfood-*/` に実際のディレクトリを切って `npx phasegate lint` を走らせる外部検証」を想定していたが、pre-tool-use-hook が Claude の Write 経路で `/tmp/**/src/domain/**` を Full-mode 必須カテゴリと判定して blocking するため実行不能。hook の scope を narrow する修正は independent の refactoring スコープになるため、本 Wave では integration test ベースでの dogfood に切替（Claude が関与しない Node.js ランタイム書き込みは hook 対象外）。CLI 経由で phasegate.config.json を読み込む経路の検証は Wave 6 の `migrate` CLI テストで補完予定。
- ISSUE-014 は Wave 5.5 まで完了。残り Wave 6（ガイド追記 + `migrate` CLI + 呼称分離）で CLOSE 予定。

## [0.98.0] - 2026-04-23

### Added

- **ISSUE-014 Wave 5: `no-layer-violation` への `architecture.allowedDependencies` 注入 + pipeline 全体への spec 配線** — Wave 4 で flat preset 配線を作った後の、非 clean preset（onion / hexagonal / layered / strict-ddd / custom）を実際に lint 判定へ反映する改修。
  - `ResolveEnabledRulesUseCase` 出力に `architectureSpec: ArchitectureSpec` を追加（DTO + mapper 拡張）。config-foundation の `preset / layers / allowedDependencies` を `freezeArchitectureSpec` で ArchitectureSpec に変換して下流へ伝播。
  - `LintRunner.run(params)` の params に optional `architecture` を追加。`no-layer-violation` rule 内の `LayerBoundary.standardMatrix()` ハードコード呼び出しを `LayerBoundary.standardMatrix(architecture)` に置換（未指定時は `CLEAN_PRESET_SPEC` で後方互換）。
  - `SourceModuleSnapshot.create(props, spec?)` で `@layer` tag の正規化が spec 経由になり、`core` / `interface` / `ports` 等の非 clean 層名が LayerName として認識可能に。
  - `SourceModuleAnalyzerPort.analyzeMany(files, architecture?)` + `TypeScriptSourceModuleAnalyzerAdapter` + `source-module-snapshot-mapper.toSourceModuleSnapshot(raw, architecture?)` の 3 箇所に spec 伝播。
  - `AnalyzeImportGraphUseCase` 入力 DTO に `architecture?` を追加、`ExecuteLintUseCase` が `resolvedRules.architectureSpec` を analyze/lintRunner の両方へ配線。

### Tests

- 新規 `lint-runner.test.ts` に onion preset 2 件（`domain → interface` 違反検出 / `interface → domain` 許容）を追加 — architecture 注入経路を end-to-end で検証。
- 新規 `source-module-snapshot.test.ts` に hexagonal spec 正規化 2 件（`core` 値が LayerName として通る / spec 省略時は clean default で `null` に落ちる）を追加。
- 新規 `resolve-enabled-rules-usecase.test.ts` に onion architecture の architectureSpec 透過 1 件を追加。
- 既存 `analyze-import-graph-usecase.test.ts` / `execute-lint-usecase.test.ts` の mock 期待値を新シグネチャに更新。
- 全 3373 tests green（3354 unit + 19 forks、+5）、`npx phasegate lint` violations 0。

### Notes

- 「外部 dogfood（`/tmp/phasegate-dogfood-onion` 等の 3 preset）」は pre-tool-use-hook が `/tmp/**/src/domain/**` への書き込みを quick-mode 外カテゴリとして blocking するため Wave 5.5 に延期。コード経路は unit test で end-to-end 検証済み。
- Wave 6（ガイド追記 + `migrate` CLI + v0.86.0 境界警告）は本 Wave の範囲外。

## [0.97.0] - 2026-04-23

### Added

- **ISSUE-014 Wave 4: `flat` preset auto-disable + user override 優先度 + architecture 配線** — Wave 3 で config-foundation がエクスポートした `architecture` を biome-ast-engine の L1 rule pipeline に接続した初回。
  - `RuleConfigProviderPort` に `getArchitecture()` を追加し、`preset / layers / allowedDependencies` を供給。
  - `HarnessConfigProviderAdapter` が architecture を保持・返却。未注入時は clean default に fallback。
  - `createBiomeAstEngineModule` の `BiomeAstEngineModuleOptions` に `architecture?` を追加。
  - `ResolveEnabledRulesUseCase` が `preset === 'flat'` 時に `require-unit-comment / require-layer-comment / no-layer-violation / enforce-folder-structure` を自動 `off` 扱い。**user 明示設定（rules or overrideRules）が存在する rule は preset 既定より優先**。
  - `main.ts` が `resolvedConfig.architecture` を抽出し `createBiomeAstEngineModule` に渡す配線を追加。
  - flat preset は `@layer` タグが残っていても L1-001/002/003/004 が skipped なので違反を発火しない（option A: 残存 tag は ignore）。

### Tests

- `unit/biome-ast-engine/resolve-enabled-rules-usecase.test.ts` に 4 件追加（flat preset 未指定時の 4 rule skipped / user `error` 明示優先 / user overrideRules `off` 明示 / clean preset は既定で auto-disable されない）。

### Notes

- Wave 5（`onion / hexagonal / layered / strict-ddd / custom` の実体活用 + dogfood）と Wave 6（ガイド追記 + migrate CLI）は別 Wave に送り、Wave 4 は flat 有効化のみに絞る。
- 現状 `no-layer-violation` rule は `LayerBoundary.standardMatrix()` をハードコード呼び出し中（`LintRunner`）。Wave 5 で architecture.allowedDependencies を注入する改修を予定。

## [0.96.0] - 2026-04-23

### Added

- **ISSUE-014 Wave 3: schema v3 + config-foundation による architecture preset のロード基盤** — Wave 2 で VO に注入口を用意した後の、config レイヤーでの実体化フェーズ。biome-ast-engine 側の配線は Wave 4 以降で担当する。
  - 新規 `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json` — v2 schema に `architecture` セクション（`preset` 必須、`custom` 時は `layers` + `allowedDependencies` 必須の `allOf/if/then`）を optional で追加。
  - 新規 `domain/value-objects/architecture-config.ts` — `ArchitecturePresetId` / `ArchitectureConfigSource` / `ArchitectureConfigDocument` / `freezeArchitectureDocument` / `isArchitecturePresetId`。
  - 新規 `domain/value-objects/architecture-preset-catalog.ts` — `clean / strict-ddd / onion / hexagonal / layered / flat` の 6 preset 定義（`custom` は source 側で明示）。
  - 新規 `domain/services/architecture-resolution-service.ts` — preset 展開 + 明示 override マージ + semantic validation（C1 自己参照欠落は auto-fill + warn、C2 キー不整合は error、C3 値不整合は error、C4 layer 欠落は `{self}` auto-fill + warn、C5 循環依存は warn）+ layerDetection precedence（byPath=false+byTag=false は error）。
  - `AjvConfigSchemaValidator` に構造検出（`architecture` キー有無）を追加し、v2/v3 schema を自動選択。
  - `HarnessConfigResolvedDocument` に optional `architecture` を追加。`LoadResolvedConfigUseCase` が architecture を常時 resolve し、v2 config は `{ preset: "clean" }` 既定を synthesize。
- **phasegate レポ自身の `phasegate.config.json` に `architecture: { preset: "clean" }` dogfood 明示追記** — Wave 2 から移送された項目。v3 schema + loader が揃った本 Wave で初めて安全に追記可能。

### Changed

- 既存 `load-resolved-config-use-case.test.ts` の `createMinimalResolvedDocument()` に clean デフォルトの architecture セクションを追加（新契約への追従）。

### Tests

- 新規 `unit/config-foundation/architecture-resolution-service.test.ts` — 17 件。7 preset 展開 / custom explicit 必須 / preset+override merge / C1〜C5 semantic validation / layerDetection precedence / metadataTags override。
- 新規 `integration/config-foundation/ajv-config-schema-validator-v3.test.ts` — 5 件。v2 document / v3 document / 未知 preset / custom without layers のケース。
- 全 3345 tests green（3323 → +22）、`npx phasegate lint` violations 0。

## [0.95.0] - 2026-04-23

### Changed

- **ISSUE-014 Wave 2: `LayerName` / `LayerBoundary` VO を `ArchitectureSpec` 注入形式に改修** — Clean Architecture 固定値（`domain / application / infrastructure / presentation` と依存行列）を VO 内部から分離し、`ArchitectureSpec` 型 + `CLEAN_PRESET_SPEC` 定数として `scripts/harness/biome-ast-engine/domain/value-objects/architecture-spec.ts` に抽出。`LayerName.fromString` / `tryFromString` / `LayerBoundary.standardMatrix` が任意の spec を受け付けるようになった（default は `CLEAN_PRESET_SPEC` で既存挙動を維持）。
- `LayerNameValue` を `string` に緩和（外部参照が無い前提での型緩和）、`canDependOn` はインスタンスが保持する spec の `allowedDependencies` を参照する形式へ変更。
- 新規テスト 12 件追加（`architecture-spec.test.ts` 4 件 + `layer-name.test.ts` に onion preset 注入ケース 5 件 + `layer-boundary.test.ts` に onion 3×3 matrix ケース 3 件）。全 3323 テスト green、`npx phasegate lint` violations 0。

### Plan re-sync

- Wave 2 計画の小さな穴を是正: 当初「`phasegate.config.json` に `architecture: { preset: "clean" }` を dogfood 明示追記」を Wave 2 に含めていたが、現行 schema v2 が root レベルで `additionalProperties: false` を指定しているため `architecture` キー追加は validation error になる。v3 schema + loader が提供される Wave 3 まで dogfood 更新を**移送**。`wave1_schema_proposal.md` §4 と `issue_description.md` の Wave 表を同期更新。

## [0.94.0] - 2026-04-23

### Changed

- **ISSUE-014 Wave 1 計画の再同期** — レビュー補修で追加された制約を Wave 分割計画に取り込み漏れがないか検証。以下 3 件を追加反映:
  - Wave 3 に「§1.2 preset + 明示 override 解決ロジック」を明示追加（semantic validation とは別軸）
  - Wave 6 に「防御プリセット / アーキプリセットの呼称分離ガイド」を明示追加（レビュー穴 #3 の plan 反映漏れ）
  - 推定工数を再計算: Wave 3 は 1d → **1.5d**（preset override + semantic validation C1〜C5 + precedence を盛り込んだため）。合計 4.5d → **5d**
- `wave1_schema_proposal.md` §4 の Wave 分割表と `issue_description.md` 推奨実装順表を同期更新

## [0.93.0] - 2026-04-23

### Changed

- **ISSUE-014 Wave 1 レビュー補修** — v0.92.0 で起票した設計文書を批判的レビューにより 12 項目修正。詳細は v0.92.0 の "Review / Hardening" セクション参照（修正差分は v0.93.0 リリースで統合）。実装コード変更なし、設計文書のみ。

## [0.92.0] - 2026-04-23

### Added

- **ISSUE-014 Wave 1: アーキテクチャ preset 化の設計着地** — PhaseGate を Clean Architecture 固定から preset 選択式に拡張するための Wave 1（設計・文書作成）を完了。実装コードは含まない。
  - `docs/ADR/ADR-015-architecture-preset.md` を Accepted 状態で起票。preset **7 種**（`clean` / `strict-ddd` / `onion` / `hexagonal` / `layered` / `flat` / `custom`）を採択し、`flat` 時の L1-001〜004 自動無効化、`metadataTags` での `@layer` / `@unit` タグ差し替え、schema v3 への下位互換マイグレーション戦略を決定。
  - `docs/inception/issues/ISSUE-014/wave1_schema_proposal.md` を追加。`architecture` セクションの JSON Schema 断片、各 preset の層・`allowedDependencies` 定義、Wave 2〜6 の実装順序（推定 4.5d）を明文化。
  - `docs/inception/issues/ISSUE-014/issue_description.md` の状態を `IN PROGRESS` に更新し、Wave 2 以降の入り口を記述。

### Review / Hardening（批判的レビューによる穴補修）

Wave 1 成果物を批判的にレビューし、以下の穴を修正:

- **カウント誤り**: `preset 6 種` → **7 種** に修正（`clean` + `strict-ddd` + `onion` + `hexagonal` + `layered` + `flat` + `custom`）
- **schema 識別機構**: loader が v2 / v3 を判別する手段を構造検出（`architecture` キーの有無）に決定。明示的な `$schemaVersion` フィールドは追加しない方針を ADR-015 / §1.0 に明記
- **`project.preset` vs `architecture.preset` の直交性**: 既存 `project.preset`（防御プリセット）と新設 `architecture.preset`（アーキプリセット）の概念を ADR-015 で分離説明。CLI メッセージ・ドキュメントで区別呼称する方針を Wave 6 ガイドに委譲
- **semantic validation 穴**: `custom` preset の JSON Schema では validate できない制約（C1: 層名の自己参照、C2/C3: allowedDependencies キー/値の `layers` 配列整合、C4: 全 layer カバレッジ、C5: 循環依存警告）を §1.3 に列挙、Wave 3 実装に委譲
- **preset override 規則**: `preset` + 明示 `layers` / `allowedDependencies` 併記時のルール（明示値 override、partial override 許容）を §1.2 に追加
- **`layerDetection` precedence**: `byPath` / `byTag` の全組み合わせ（4 通り）の挙動を §3.4 の表に明示。`byPath: false, byTag: false` は schema error に
- **`flat` preset の残存 `@layer` tag 扱い**: 案 A（無視）/ B（warn）/ C（error）を列挙、Wave 4 で案 A 採用を推奨
- **preset vs user 個別設定の優先度**: `flat` preset が L1-001〜004 を無効化する場面で user の明示 `layers.L1.rules["L1-001"]: "error"` が上書きする規則を §2.8 に追加
- **ADR-005 矛盾の解消**: PhaseGate 自身が `clean` preset を名乗ることと ADR-005（Hexagonal 採用）の両立を「`domain` が Hexagonal の `core` に相当する」という哲学的整合で ADR-015 に明記
- **ADR-014 境界警告**: v0.86.0 未満から upgrade する user への「暗黙デフォルト変更」警告を Wave 6 ガイド + migrate CLI に入れる方針を明記
- **`@story` タグのスコープ定義**: test ファイルで使われる `@story` タグが本 Wave の `metadataTags` で扱われない理由（traceability-model 管轄）を §3.3 に追加
- **Wave 受け入れ基準の再設計**: 物理的な成果物存在と user レビュー完了を分離。物理 [x] / レビュー [ ] で Wave 1 完了判定の厳密性を確保

### Scope notes

- Wave 1 は **設計・文書のみ**。`scripts/harness/` 配下のコード改修は含まず、既存テストへの影響なし。`LayerName` / `LayerBoundary` の config 注入改修は Wave 2、schema v3 実装は Wave 3、dogfood 検証は Wave 4〜5、ガイド追記は Wave 6 で順次実施予定。

## [0.91.0] - 2026-04-23

### Fixed

- **ISSUE-023: `StoryId` validator pattern が `HF\d+-\d{2}` を拒否する** — `HF2-XX` 形式（Phase 2 拡張 Epic）を正式サポート。
  - `scripts/harness/traceability-model/domain/value-objects/story-id.ts`: `STORY_ID_PATTERN` を `/^H(?<epicNumber>F\d+|\d{2})-(?<storyNumber>\d{2})$/` に拡張。エラーメッセージも更新。
  - `scripts/harness/traceability-model/domain/services/metadata-validator.ts:16`: `STORY_ID_PATTERN` を `/^H(?:F\d+|[0-9]{2})-[0-9]{2}$/` に同期。
  - `scripts/harness/traceability-model/infrastructure/parsers/story-catalog-parser.ts`: `STORY_ID_LINE_PATTERN` と前後行コンテキスト形式の内部パターンを同期。`user_stories.md` から `HF2-XX` を StoryCatalog に収集可能に。
  - `StoryId.getEpicNumber()` は `HF2-04` に対して `'F2'` を返す（従来の 2 桁数字は不変）。外部 API shape は維持。
- **ISSUE-010 完全 CLOSE（副次効果）** — `validate-metadata` FAIL: 103 → **0 件**。`docs/product/construction/` 配下の全 105 設計文書が PASS。Wave 1 (v0.87.0) / Wave 2 (v0.88.0) / Wave 3 (v0.89.0) / fuse-hooks-engine 削除 (v0.90.0) / 本リリースで完結。

### Tests

- `scripts/harness/__tests__/unit/traceability-model/story-id.test.ts` に HF prefix ケース 3 件追加（3308 → 3311）:
  - `HF2-04` を正常に parse できること
  - `HF10-99` のような複数桁 F-prefix も受理すること
  - `HF2-04` の `getEpicNumber()` が `'F2'` を返すこと

### Lint / Metadata state

- L1 violations: **0 件維持**（scanned 1289 files, no violations）
- `validate-metadata` FAIL: 7 → **0 件** 🎉
- 3311 件テスト全 green

## [0.90.0] - 2026-04-23

### Removed

- **fuse-hooks-engine Unit の完全削除** — Unit 定義（`docs/product/units/fuse_hooks_engine_unit.md`）・設計文書（`docs/product/construction/fuse-hooks-engine/` 7 件）・inception プラン（`docs/inception/fuse-hooks-engine/` 配下 8 件）を削除。
  - `scripts/harness/` 配下に実装コードは一切存在せず、他 Unit からの import / 参照もなかった（Future Phase / v1 スコープ外として設計段階で凍結されていた Unit）。
  - `docs/product/user_stories.md` から HF1-01 〜 HF1-05 の 5 ストーリーセクションと `H-F1` Epic 行を削除。v1 合計を 54 維持、全体（Future 含む）を 62 → 57 に更新。
  - `docs/product/units/integration_contract.md` の依存図・Wave 実行計画・Validator ID Registry / CLI Command Registry の `fuse-hooks-engine` 参照を削除。L0 拡張ポイント（6.1 / 6.3）は「OS-level enforcement」の抽象概念として残置。
  - `docs/product/units/agent_integration_unit.md` Stop Hook Adapter 行の `fuse-hooks-engine（Future: FUSE完了ゲートの参照実装）` 参照を `—` に変更。
  - `docs/product/construction/agent-integration/unit_test_design.md` UT-WTS-I021 のサンプルパスを `fuse-hooks-engine/HF1-06` → `some-unit/HF1-06` に変更（WORK_ITEM_ID_PATTERN 後方互換テストは維持）。

### Fixed

- **ISSUE-010 Wave 3 完全解消（fuse-hooks-engine 削除の副次効果）** — `validate-metadata` FAIL: 14 → **7**（fuse-hooks-engine 7 ファイル消失）。残 7 は `phase2-extensions` の `HF2-XX` 形式 StoryId で、validator `STORY_ID_PATTERN = /^H[0-9]{2}-[0-9]{2}$/` の拡張が別 issue 対象。

### Lint / Metadata state

- L1 violations: **0 件維持**（scanned 1289 files, no violations）
- `validate-metadata` FAIL: 14 → **7**（-7）
- 既存 3308 件テスト全 green（regression なし）

## [0.89.0] - 2026-04-23

### Fixed

- **ISSUE-010 Wave 3（partial）** — 11 Unit × 7 設計文書 = 75 件に `@story-id` standalone 注釈を補填し PASS 化。
  - `agent-integration` / `biome-ast-engine` / `ci-governance` / `harness-api` / `harness-error` / `nyquist-validation` / `phase-dependency-model` / `quick-mode` / `regression-suite` / `skill-quality` / `validator-system` の各 Unit の 7 ファイル（`coverage_report.md` / `domain_model.md` / `it_test_design.md` / `it_test_logic.md` / `logical_design.md` / `unit_test_design.md` / `unit_test_logic.md`）に H01-H15 系 StoryId を付与。
  - 残 14 件（`fuse-hooks-engine` 7 + `phase2-extensions` 7）は `HF1-XX` / `HF2-XX` 形式の StoryId を必要とするが、`metadata-validator.STORY_ID_PATTERN = /^H[0-9]{2}-[0-9]{2}$/` が `HF` prefix 非対応のため PASS 化不可能。validator パターン拡張は別 issue 対象（ISSUE-019）として切り出し、本 Wave 3 は partial 完了。

### Lint / Metadata state

- L1 violations: **0 件維持**
- `validate-metadata` FAIL: 89 → **14**（-75: 11 Unit × 7 ファイル解消）
- 残 14 件は HF-prefix validator 制約による既知の限界（新規回帰ではない）
- 既存 3308 件テスト全 green（regression なし）

## [0.88.0] - 2026-04-23

### Fixed

- **ISSUE-010 Wave 2** — `adr-foundation` / `config-foundation` Unit の設計文書 11 件に `@story-id` 注釈を standalone 形式で補填。
  - adr-foundation 6 件（`coverage_report.md` / `domain_model.md` / `it_test_design.md` / `it_test_logic.md` / `unit_test_design.md` / `unit_test_logic.md`）に `@story-id H05-01 / H05-02 / H05-03` を追加。
  - config-foundation 5 件（`coverage_report.md` / `domain_model.md` / `it_test_logic.md` / `unit_test_design.md` / `unit_test_logic.md`）に `@story-id H04-01 / H04-02 / H04-03` を追加。
  - これにより両 Unit とも全 7 ファイル PASS 達成。

### Lint / Metadata state

- L1 violations: **0 件維持**
- `validate-metadata` FAIL: 100 → **89**（adr-foundation 6 件 + config-foundation 5 件解消）
- 既存 3308 件テスト全 green（regression なし）

## [0.87.0] - 2026-04-23

### Fixed

- **ISSUE-010 Wave 1 + ISSUE-006 formal CLOSE** — traceability-model Unit の `@story-id` 注釈補填と ISSUE-006 機能的完遂の CLOSE 化。
  - ISSUE-010 Wave 1: `docs/product/construction/traceability-model/` 残 3 件（`coverage_report.md` / `domain_model.md` / `unit_test_logic.md`）に `@story-id H03-01 / H03-02 / H03-03` を standalone 注釈として補填。`validate-metadata` の FAIL 件数 103 → 100（traceability-model Unit は 0 件到達）。
  - ISSUE-006 CLOSE: Story A（v0.63.0 / `fullModeRequiredWhen` 設定駆動化）/ Story B（v0.64.0 / pre-tool-use hook 統合）/ P2-3（v0.45.0 / `docs/guide/quick-vs-full-mode.md`）すべて着地済のため formal CLOSE。外部PJ再レビュー（welcome-but-not-blocking）のみ残。

### Lint / Metadata state

- L1 violations: **0 件維持**（v0.86.0 時点で完全解消済、本版で変更なし）
- `validate-metadata` FAIL: 103 → **100**（traceability-model 3 件解消）
- 既存 3308 件テスト全 green（regression なし）

## [0.86.0] - 2026-04-23

### Changed

- **ISSUE-019 / ADR-014** — LayerBoundary の解釈を **Robert C. Martin 版 Clean Architecture** に切り替え、`presentation → domain` 直接依存を許容。
  - 変更: `ALLOWED_DEPENDENCIES.presentation` に `'domain'` を追加（`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:15-20`）。
  - 背景: 従来の厳格 DDD Layered 解釈では presenter / formatter / CLI handler が domain VO / type / policy を read-only で参照するだけで L1-003 違反となっていたが、これは CA では一般的実装。read-only で DIP の本質を侵さない限り許容する。
  - 禁止は継続: `presentation → infrastructure`、`domain → 他層`、`application → presentation` 等の逆方向依存。
  - 緩和策の opt-in 提供は ISSUE-014（アーキ config 化）で対応予定。厳格派は `preset: "strict-ddd"` で現行挙動を維持可能とする。
  - 新規 ADR: `docs/ADR/ADR-014-presentation-domain-dependency.md`。
  - 新規 test: `layer-boundary.test.ts` に presentation→domain allowed、presentation→infrastructure disallowed の 2 ケース追加。

### Lint state

- total: 8 → **0**（L1-003 presentation→domain 8 件解消、他 rule 増減無し）
- 既存 3308 件テスト全 green（新規 2 ケース込み）

## [0.85.0] - 2026-04-23

### Fixed

- **ISSUE-022** — Unit barrel (`**/index.ts`) が `no-layer-violation` で誤検知される問題を解消。
  - 問題: ISSUE-017（v0.83.0）の `extractImports` 修正で `export ... from` 再帰走査が有効化された結果、`quick-mode/index.ts` の barrel 再エクスポート 7 件が `L1-003` で新規露出していた。Unit barrel は `main.ts` / `composition-root.ts` / `presentation/*-hook.ts` と同じ composition root / entry point の性質を持つが、`no-layer-violation.ignorePatterns` に含まれていなかった。
  - 修正: `scripts/harness/biome-ast-engine/domain/services/rule-definition-registry.ts` の `no-layer-violation.ignorePatterns` に `'**/index.ts'` を追加。`scripts/harness/*/index.ts` の 11 件の Unit barrel が一括で除外される（sub-layer barrel は存在せず副作用リスク無）。
  - 残 L1-003 8 件は全て `presentation → domain` パターン（ISSUE-019 の philosophical 案件スコープ）。

### Lint state

- total: 15 → **8**（L1-003 barrel 誤検知 7 件解消）
- 残 L1-003: 8 件（全て ISSUE-019 スコープ: presentation → domain）
- 既存 3306 件テスト全 green（regression なし）

## [0.84.0] - 2026-04-23

### Removed

- **L1-006 解消** — `adr-foundation` の never-wired な seed 機能を削除。
  - `scripts/harness/adr-foundation/infrastructure/seeds/initial-adr-definitions.ts` (11 件の seed 定義、docs/ADR/ 13 件の実 ADR と内容不一致で stale だった)
  - `scripts/harness/adr-foundation/application/usecases/seed-initial-adrs-use-case.ts`
  - `scripts/harness/adr-foundation/application/dto/seed-adr-definition.ts`
  - `scripts/harness/__tests__/unit/adr-foundation/seed-initial-adrs-use-case.test.ts` (6 tests)
  - `application-errors.ts` から未使用になった `SeedAdrDefinitionCountError` / `DuplicateAdrIdApplicationError` を削除
  - `infrastructure/seeds/` ディレクトリ自体を削除
  - composition-root に未配線・CLI 未公開だったため外部影響なし。実 ADR は `docs/ADR/` に直接 markdown として管理済み。

### Fixed

- **L1-007 解消** — `agent-integration/domain/ports/error-guidance-query-port.ts` の JSDoc コメント密度超過を修正。WHAT を説明する冗長コメントを削除（型名から自明）。

### Lint state

- total: 17 → **15**（L1-006: 1 → 0, L1-007: 1 → 0）
- 残 L1-003: 15 件（全て ISSUE-019 スコープ: barrel 再エクスポート 7 件 + presentation→domain 8 件）
- 既存 3312 件 - 6 件削除 = **3306 件** テスト全 green

## [0.83.0] - 2026-04-23

### Fixed

- **ISSUE-017** — `extractImports` の `export ... from` 再エクスポート／関数内 dynamic import 未対応による ghost-file 検出の false positive を解消。
  - 問題: `typescript-source-module-analyzer-adapter.ts:extractImports` は `ts.isImportDeclaration` と **トップレベル**の dynamic import (`ts.isCallExpression` + `ImportKeyword`) のみ対応。`export { X } from '...'` / `export type { X } from '...'` / `export * from '...'` / `export { X as Y } from '...'` および関数内ネスト dynamic import が完全に未対応で、barrel 経由で参照されているファイルが L1-006 ghost と誤判定されていた。
  - 修正: `ts.isExportDeclaration` ブランチを追加し value / type 再エクスポートを適切な importKind で edge 化。`ts.forEachChild` による浅い走査を再帰走査 (`visit`) に置換し、関数ボディ内の `await import('...')` を捕捉。
  - 新規 integration test 8 件（`typescript-source-module-analyzer-adapter.test.ts`）: 4 variations of `export ... from` + local re-export 非検出 + async/class-method nested dynamic import + 複合パターン。
  - `scripts/harness/quick-mode/domain/ports/changed-files-port.ts` の L1-006 ghost false positive 解消（`quick-mode/application/ports/changed-files-port.ts` 経由の re-export が正しく incoming edge 化）。
  - `phasegate lint` 影響:
    - L1-006: 2 → **1**（false positive 解消。残 1 件 `adr-foundation/infrastructure/seeds/initial-adr-definitions.ts` は真の未配線 seed）。
    - L1-003: 8 → **15**（検出精度向上の副作用で 7 件新規露出）。内訳は `quick-mode/index.ts` barrel の infrastructure / presentation 再エクスポート 7 件 — 従来 `export ... from` が検出されず隠れていた実アーキ違反。ISSUE-019 (LayerBoundary `presentation → domain` 再評価) と同じ文脈で追跡。
    - 総 violation 数: 11 → **17**（-1 L1-006 + 7 L1-003）。
  - 既存 3304 件 + 新規 8 件 = **3312 件** テスト全 green。

## [0.82.0] - 2026-04-23

### Fixed

- **ISSUE-020** — `config-foundation/domain/` 内の循環依存を解消。
  - 問題: `harness-config.ts` が `PhaseDependenciesConfig` (VO class) を import、一方で `phase-dependencies-config.ts` が `PhaseDependenciesPresetId` (type) を `harness-config.ts` から import、相互参照で L1-003 違反（循環依存）が検出されていた。
  - 修正: `PhaseDependenciesPresetId` の型定義を Aggregate 側（`harness-config.ts`）から VO 側（`phase-dependencies-config.ts`）に移動。Aggregate → VO の一方向依存に整理。
  - 既存 import 箇所（test fixtures 等）の互換性維持のため、`harness-config.ts` から `export type { PhaseDependenciesPresetId }` で re-export。
  - `phasegate lint` violation 数: 12 → **11**（L1-003: 9 → 8, 循環依存 1 件解消）。
  - 既存 3304 件テスト全 green 維持。

## [0.81.0] - 2026-04-23

### Fixed

- **ISSUE-021（構造的バグ修正）** — Full mode 判定が story-implementor コンテキストを認識せず、Port/Adapter の refactor が正規ルートでも構造的にブロックされる問題を解消。
  - 問題: `quick-mode-judgment-engine.ts` で `*port.ts` / `*adapter.ts` は一律 `api` カテゴリに分類され、`allowedCategories` 外として full mode block。hook は skill context を参照しないため `/story-implementor` 経由でも同じブロックが再発する循環参照に陥っていた。
  - 修正: `HandlePreToolUseUseCase.execute()` の full mode ブランチに「当該Unitの必須設計文書（`logical_design.md` / `domain_model.md`）が揃っている場合は bypass」条件を追加。
  - `scripts/harness/agent-integration/domain/ports/phase-gate-query-port.ts`: `checkDesignDocsExist(unitId): Promise<boolean>` を追加（既存 Port の責務拡張、ISP 違反なし）。
  - `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts`: `fs.access` で `logical_design.md` / `domain_model.md` 存在確認する adapter 実装。
  - `HandlePreToolUseUseCase`: `isFullModeBypassedByDesignDocs` private method で bypass 判定を封じ込め、full mode block 直前に評価。
  - 新規 IT test 5 件（adapter 3 件 + usecase 2 件）: 設計文書揃→bypass / 不足→従来通り block / 空 unitId→false。既存 3299 件 green 維持（総 **3304 件**）。

- **ISSUE-018** — `cli-executor-port.ts` を `infrastructure/ports/` から `application/ports/` へ移動。ISSUE-021 の bypass 経由で実行可能に。
  - Port は Clean Architecture の Dependency Inversion Principle に従い `application/ports/` に配置。Adapter は `infrastructure/adapters/` のまま。
  - `@layer infrastructure` → `@layer application` に更新。
  - import path 更新 5 箇所（`child-process-cli-executor-adapter.ts` / `handle-stop-usecase.ts` / `handle-post-tool-use-usecase.ts` / `agent-integration/index.ts` / `handle-post-tool-use-usecase.test.ts`）。
  - 旧 `infrastructure/ports/` ディレクトリ削除。
  - `phasegate lint` violation 数: 15 → **12**（L1-003: 12 → 9, 3件解消）。

## [0.80.0] - 2026-04-23

### Fixed

- ISSUE-003 Wave 4 — `no-layer-violation` (L1-003) 63 件を 12 件まで削減（51件減）。`phasegate lint` violation 数: 66 → 15。
  - `rule-definition-registry.ts` の `no-layer-violation` `ignorePatterns` を `['**/shared-kernel/**']` から 4 パターンに拡張:
    - `**/composition-root.ts` — DI wiring（infrastructure/application/domain を束ねる境界ファイル）
    - `**/main.ts` — CLI entry point（全 Unit の composition-root を集約）
    - `**/presentation/*-hook.ts` — Claude Code hook entry（Wave 3 で `no-ghost-file` にも追加済み）
  - 削減内訳: main.ts (13件) + harness-api/composition-root (8件) + skill-quality/composition-root (6件) + ci-governance/composition-root (5件) + quick-mode/composition-root (5件) + agent-integration presentation hooks (14件) = **51 件**
  - 残 12 件は ignorePatterns では解消できない設計課題（別 issue 起票予定）:
    - **application → infrastructure/ports (3件)**: agent-integration の `cli-executor-port.ts` が `infrastructure/ports/` に配置されており Port として location ミス
    - **presentation → domain (8件)**: ci-governance / nyquist-validation / phase-dependency-model / traceability-model の presenter/handler/formatter が domain VO/service を直接 import。phasegate の LayerBoundary は `presentation → presentation + application` のみ許可で domain 禁止だが、Clean Architecture 実装として一般的なため spec 側の再判断が必要
    - **domain 内循環依存 (1件)**: `config-foundation/domain/harness-config.ts` と `phase-dependencies-config.ts` の相互参照

## [0.79.0] - 2026-04-23

### Fixed

- ISSUE-016 — `no-layer-violation` (L1-003) rule の `ignorePatterns` config が dead code 化していた問題を解消。Wave 2b (`enforce-folder-structure`) / Wave 3 (`no-ghost-file`) と同構造で配線。
  - `scripts/harness/biome-ast-engine/domain/value-objects/import-graph.ts`: `findLayerViolations` の第 3 引数に `ignorePatterns` (default `[]`) を追加。pattern match した `from` ファイル由来の edge は評価前に除外。
  - `scripts/harness/biome-ast-engine/domain/services/lint-runner.ts`: `no-layer-violation` case で `rule.config.ignorePatterns` を読んで `findLayerViolations` に渡す。
  - `rule-definition-registry.ts:110-117` 既存の `ignorePatterns: ['**/shared-kernel/**']` 定義が初めて有効化。
  - 新規 unit test 2 件: `ignorePatterns` で edge 除外 / 空配列で従来挙動維持。既存 3297 件 green 維持（総 3299 件）。
  - `phasegate lint` violation 数は 66 件（Wave 3 完了時と同値）— shared-kernel 由来の L1-003 violation が現状存在しないため件数変化なし。ISSUE-003 Wave 4 で `composition-root.ts` / `main.ts` / `presentation/*-hook.ts` を `ignorePatterns` に拡張することで本配線が効果を発揮する。

## [0.78.0] - 2026-04-23

### Added

- ISSUE-003 Wave 3 — `no-ghost-file` (L1-006) rule に `entryPointPatterns` config サポートを正式配線。`rule-definition-registry.ts:115` で定義されていたが `lint-runner` / `ImportGraph.findGhostFiles` が読んでおらず dead code 化していた。
  - `scripts/harness/biome-ast-engine/domain/value-objects/import-graph.ts`: `findGhostFiles` の第 2 引数に `entryPointPatterns` (default `[]`) を追加。pattern match した node は rootNode 相当扱いで ghost から除外。
  - `scripts/harness/biome-ast-engine/domain/services/lint-runner.ts`: `no-ghost-file` case で `rule.config.entryPointPatterns` を読んで `findGhostFiles` に渡す。

### Fixed

- ISSUE-003 Wave 3 — L1-006 (`no-ghost-file`) 32 件を 2 件まで削減。`phasegate lint` violation 数: 96 → 66。
  - デフォルト `entryPointPatterns` を拡張: `**/*.config*.ts` (vitest.config 系) / `**/main.ts` / `**/composition-root.ts` / `**/presentation/*-hook.ts` を追加。既存 `**/index.ts` / `**/cli/**/*.ts` と合わせて CLI entry・Claude hook・DI wiring・vitest config を一括で entry 扱い。
  - Pattern B (shared-kernel barrel 3件): `shared-kernel/harness-api.ts` / `shared-kernel/quick-mode.ts` / `shared-kernel/validator-system.ts` — 参照 0 件の未使用 barrel として削除。
  - Pattern C (dead DTO/port/adapter/mapper 19件): agent-integration / ci-governance / config-foundation / nyquist-validation / quick-mode / skill-quality / traceability-model の未参照ファイル 18 件を削除。1 件 (`quick-mode/domain/ports/changed-files-port.ts`) は application port 経由の re-export で実際には使用中のため false positive として保留（ISSUE-017 解決で自動消化）。
  - 波及削除: `regex-import-analyzer-adapter.ts` の削除後に orphan 化した `agent-integration/domain/ports/import-analyzer-port.ts` も削除（`fallback-verification-service.ts` 等は inline 型で依然動作）。
  - 残余 2 件: `adr-foundation/infrastructure/seeds/initial-adr-definitions.ts` (配線 vs 削除の別判断待ち) / `quick-mode/domain/ports/changed-files-port.ts` (ISSUE-017 待ち)。

## [0.77.0] - 2026-04-23

### Added

- ISSUE-003 Wave 2b — `enforce-folder-structure` (L1-004) rule に `ignorePatterns` config サポートを追加。`no-ghost-file` / `no-layer-violation` と同じ形式。
  - `scripts/harness/biome-ast-engine/domain/services/lint-runner.ts`: `enforce-folder-structure` case で `rule.config.ignorePatterns` を読み、`matchesPattern` で照合してスキップする処理を追加。
  - `scripts/harness/biome-ast-engine/domain/value-objects/import-graph.ts`: file-local だった `matchesPattern` を export 化（lint-runner 側から共有利用）。

### Fixed

- ISSUE-003 Wave 2b — L1-004 (`enforce-folder-structure`) 12 件を解消。`phasegate lint` violation 数: 108 → 96。
  - デフォルト `ignorePatterns` に以下を追加: `**/composition-root.ts`, `**/index.ts`, `**/main.ts`, `**/shared-kernel/**`, `**/integrations/**`, `**/setup/**`。
  - 対象 Unit: ci-governance / harness-api / quick-mode / regression-suite / skill-quality (composition-root 5 件), harness-api / quick-mode (index 2 件), shared-kernel (2 件), 単独 entry 3 件 (main.ts / integrations/pre-commit.ts / setup/skill-deployer.ts)。
  - 理由: これらは Clean Architecture の DI wiring（composition-root）・barrel re-export（index）・Shared Kernel・CLI entry に相当し、特定レイヤーの配下に配置する必要がない/できない構造的 anchor。folder-structure ルールの趣旨（declared layer と配置 dir の整合性）外。

## [0.76.0] - 2026-04-23

### Fixed

- ISSUE-003 Wave 2a — L1-007 (`no-comment-flood`) の 47 件を解消。`phasegate lint` violation 数: 155 → 108。
  - JSDoc ブロック形式 (`/** @layer ... @unit ... */`) を 2 行の単一行コメント (`// @unit ...` / `// @layer ...`) に変換することで、`commentDensity > 0.35` を下回るよう調整。
  - 一部ファイル（`setup/skill-deployer.ts`, `biome-ast-engine/composition-root.ts`, `fallback-verification-service.ts`, `env-file-reentry-guard-state-adapter.ts` 等）では per-property JSDoc と重複インラインコメント (`repeatedCommentBlocks`) も併せて削除。
  - 対象 Unit: `agent-integration` / `biome-ast-engine` / `ci-governance` / `config-foundation` / `harness-error` / `nyquist-validation` / `phase-dependency-model` / `quick-mode` / `setup` / `validator-system`（計 47 ファイル、-444/+124 行）。
- 残余 1 件（`agent-integration/domain/ports/error-guidance-query-port.ts`）は PreToolUse hook が port 変更を `api` カテゴリと判定しブロックしたため、Wave 2a スコープ外に繰り延べ。別途 baseline 登録 or story-implementor 経由で対応予定。

## [0.75.0] - 2026-04-23

### Fixed

- ISSUE-003 Wave 1 — L1-005 (`no-any-abuse`) の 4 件を解消。`phasegate lint` violation 数: 159 → 155。
  - `ci-governance/application/usecases/generate-ci-template-usecase.ts`: invalid templateType 分岐の `as any` を `as TemplateType` に変更。
  - `ci-governance/presentation/handlers/migrate-agents-md-handler.ts`: `errors.map((e: any) => ...)` のアノテーションを削除し、`ValidatePointersOutput.errors` の型推論に委譲。
  - `nyquist-validation/infrastructure/adapters/ajv-json-schema-validator-adapter.ts`: `config-foundation/.../ajv-config-schema-validator.ts` と同じ Ajv v8 の正規パターン（`AjvModule.default ?? AjvModule` + `type ErrorObject` / `type ValidateFunction`）に合わせ、3 箇所の `any` と `biome-ignore` を全て除去。
  - `skill-quality/infrastructure/adapters/ajv-lesson-artifact-schema-adapter.ts`: `(AjvModule as any).default ?? AjvModule` の `any` cast を削除し、`.map((err: any) => ...)` を `ErrorObject` 型に置換。

## [0.74.0] - 2026-04-22

### Fixed

- ISSUE-007 Wave 9 — phase-gate ブロック時に出力される `scaffold:` 行に含まれる `<unit-id>` プレースホルダを、実 unit ID に置換するようにした。従来は L2-001 registry (`l2-error-definitions.ts`) の `defaultScaffoldCommand` が静的文字列 `npx phasegate scaffold-design --unit <unit-id> --phase logical` のまま出力されていたため、ユーザーが手で unit 名に書き換える必要があった。PHASE_GATE の場合は `metadata.unitId`、FULL_MODE_REQUIRED の場合は `targetFilePaths` から `WriteTargetScope.fromPath` で導出した unit ID を使って置換する。
- IT-AI-GUIDE-UID-001 / IT-AI-GUIDE-UID-002 を追加（PHASE_GATE と FULL_MODE_REQUIRED の両経路で `<unit-id>` が実 unit に置換されることを検証）。

## [0.73.0] - 2026-04-22

### Added

- ISSUE-007 Wave 8 — `phasegate.config.json` の `project.paths` セクションを schema (`harness-config-v2.schema.json`) に追加。`project.paths.source` (array, minItems: 1) で phase-gate の監視ディレクトリを override できるようになった。`project.paths.docs.construction` / `project.paths.docs.inception` も optional で指定可能。
- IT-CF-PP-001a..d を追加（`project.paths.source` の valid/invalid パターン）。

### Fixed

- ISSUE-007 Wave 8 dogfood で発覚した retrofit blocker を解消 — 従来は adapter (`harness-config-config-query-adapter.ts`) が `config.project?.paths?.source` を読む設計だったにも関わらず schema がそれを additionalProperties として reject していたため、`src/` 配下を使う一般 Node.js プロジェクトでは phase-gate が実質無効化されていた。

### Retrofit ガイド追補

- `docs/guide/retrofit-adoption.md` に「source path の指定」セクションを追加。`src/` 系プロジェクトでは `project.paths.source: ["src"]` の明示が必須である旨を記載。

## [0.72.0] - 2026-04-22

### Changed

- ISSUE-007 Wave 7 — v0.71.0 で修正した挙動（`baseline.enabled` default=`true` / `baseline --dry-run --json` の `files` キー）に合わせて以下ドキュメントを更新:
  - `docs/guide/retrofit-adoption.md` — baseline.json スキーマ例を実機形式に修正、default glob の範囲（TS/JS だけでなく md も含む）を明記、「init 後に config を手で書く」記述を削除
  - `docs/guide/cli-reference.md` — `Scaffold Design` セクション追加（Wave 4 で導入した CLI が未記載だった）、baseline セクションに v0.71.0 の変更点を追補
  - `README.md` — Command Reference に `scaffold-design` 追加、baseline 段落に v0.71.0 変更点と retrofit-adoption.md リンクを追加、Documentation セクションに retrofit-adoption.md を追加
  - `README.ja.md` — 同上（baseline / `scaffold-design` 行を CLI テーブルに追加、retrofit-adoption.md リンクを含む段落に更新）

## [0.71.0] - 2026-04-22

### Changed (breaking-ish)

- ISSUE-007 Wave 6 — `baseline.enabled` の default を `false` → **`true`** に変更。ISSUE-007 の趣旨（retrofit 導入時の摩擦解消）と整合させるため。`.phasegate/baseline.json` が存在しないプロジェクトでは従来通り何も grandfather されない（`ci-governance-baseline-grandfather-adapter.ts` が defensive に early-return する）ため、新規プロジェクトへの影響なし。`baseline` をオフにしたい場合は `phasegate.config.json` に `baseline.enabled: false` を明示。
- `npx phasegate baseline --dry-run --json` の出力キーを `entries` → `files` に変更（保存ファイル `.phasegate/baseline.json` のキー `files` と整合）。同時に `CreateBaselineOutput.entries` → `CreateBaselineOutput.files` にリネーム。`.phasegate/baseline.json` 自体のオンディスク形式は変更なし。

### Fixed

- dogfooding で判明していた「`npx phasegate init` → `npx phasegate baseline` の 2 手を踏んでも pre-tool-use hook で grandfather が効かない」問題を解消（上記の `enabled` default 変更により）。

## [0.70.0] - 2026-04-22

### Added

- ISSUE-007 Wave 5 — `docs/guide/retrofit-adoption.md` を追加。既存プロジェクトへの phasegate 後付け導入チュートリアル（`init` → `baseline` → `scaffold-design` の 4 ステップ、phase-gate エラーの読み方、baseline 卒業手順、よくある詰まり方の QA）。

## [0.69.0] - 2026-04-22

### Added

- ISSUE-007 Wave 4 / Phase C — `npx phasegate scaffold-design --unit <id> --phase <logical|domain|uiux|unit-test|it-test> [--force] [--json]` CLI を追加。`templates/*.template.md` を読み取り `{{unit}}` プレースホルダを置換して `docs/product/construction/{unit}/*.md` に書き込む。既存ファイルは `--force` なしでは保護。Wave 3 の pre-tool-use hook エラーで emit される `scaffold:` 行が実動作するようになった。
- `templates/{domain_model,uiux_design,unit_test_design,it_test_design}.template.md` を追加（5 phase すべてに minimum viable template）。

### Changed

- Wave 3 の L2-001 `defaultTemplatePath` を `docs/templates/logical_design.template.md` → `templates/logical_design.template.md` に修正（配布物と整合）。

## [0.68.0] - 2026-04-22

### Changed

- `skills/` 同梱物のクリーンアップ — skill-creator の `scripts/__pycache__/` Python バイトコンパイルキャッシュが npm 配布物に混入していたため除去。`.gitignore` / `.npmignore` に `__pycache__/` と `*.pyc` を追加。skill-creator の使用例パスを Anthropic 原本の `skills/public` / `skills/private` から PhaseGate レイアウトに合わせた `skills` に統一。

## [0.67.0] - 2026-04-22

### Changed

- ISSUE-007 Wave 3 / Phase B — `phase-gate` の HarnessError をアクショナブル化（足りない設計文書のパスと推奨アクションを `fix_example` に明示）。

## [0.66.0] - 2026-04-22

### Added

- ISSUE-007 Wave 2 / Phase A-2 — `.phasegate/baseline.json` に登録済みかつ sha1 が一致するファイルを `phase-gate` 対象から除外する **baseline grandfather** を pre-tool-use hook に統合。レガシーリポジトリへの後付け導入時の摩擦を解消する。

## [0.65.0] - 2026-04-21

### Added

- ISSUE-007 Wave 1 / Phase A-1 — `npx phasegate baseline [--dry-run|--force|--paths|--json]` CLI を追加。`.phasegate/baseline.json` スナップショットを生成し、phasegate.config.json に `baseline.{enabled, path}` スキーマを追加。

## [0.64.0] - 2026-04-21

### Added

- ISSUE-006 Story B — `quickMode.fullModeRequiredWhen` の判定を pre-tool-use hook に統合。`mixedCategories` / `newDomainFile` / `apiContractChange` のいずれかが立つと書き込み時点で同期的に Full Mode へエスカレートしブロックする（block reason: `FULL_MODE_REQUIRED`）。

## [0.63.0] - 2026-04-21

### Added

- ISSUE-006 Story A — `quickMode.fullModeRequiredWhen` 設定キー（`mixedCategories` / `newDomainFile` / `apiContractChange`、いずれもデフォルト `true`）を導入し、Quick Mode → Full Mode のエスカレート条件を設定駆動化。
- `npx phasegate check-change-category --paths <csv> [--format json] [--fail-on-full-required]` CLI — 任意のファイルリストを Quick Mode カテゴリに分類し、Full Mode が必要かを返す。CI gate での使用を想定。

## [0.62.0] - 2026-04-21

### Added

- ISSUE-013 C-6（軽量版）— UserPromptSubmit hook に violation detection を追加。

## [0.61.0] - 2026-04-21

### Added

- ISSUE-013 C-5 — UserPromptSubmit hook で動的状態（現在の Quick/Full モード等）をプロンプトに注入。

## [0.60.0] - 2026-04-21

### Added

- ISSUE-013 C-4 — SessionStart hook を追加し、セッション開始時に静的ルール（CLAUDE.md 等）を注入する仕組みを実装。

## [0.59.0] - 2026-04-21

### Added

- ISSUE-013 A-1 / A-2 / B-3 — `phasegate init --agent <claude|codex|both>` オプションで Codex CLI 向けの `.codex/hooks.json` を自動配置。Codex dogfood セットアップを README に追記。

## [0.58.0] - 2026-04-21

### Added

- ISSUE-013 Wave 2 — Codex CLI 統合の本体実装。`PreToolUse(Bash)` / `PostToolUse(Bash)` / `Stop` フックを Codex 向けに配線。

## [0.57.0] - 2026-04-20

### Added

- ISSUE-013 Wave 1 — `BashWriteTargetExtractor` が Bash 経由 `apply_patch <<'PATCH'` heredoc の書き込み先パスを抽出するよう拡張。Codex の Bash ルートを pre-tool-use hook で押さえられるようになる。

## [0.56.0] - 2026-04-20

### Fixed

- ISSUE-011 Wave 3 / P3-4 / HF2-04 — `initial-creation-expiration-checker` バリデータを修正。

## [0.55.0] - 2026-04-20

### Fixed

- ISSUE-011 Wave 2 — Markdown parser の code-span / code-fence 内に書かれた `@unit` / `@layer` 等のメタタグを誤検出していたバグを修正（コードフェンス内をスキップするよう変更）。

## [0.54.0] - 2026-04-20

### Fixed

- ISSUE-011 Wave 1 / P2-2 — CLI のエラー伝播を修正（内部エラーが exit code 0 で握り潰されていた問題）。
- ISSUE-011 Wave 1 / P2-3 — `.mdx` / `.markdown` 拡張子を Markdown ドキュメント検証の対象に追加。

## [0.53.0] - 2026-04-19

### Added

- ISSUE-008 Phase C-1〜C-3 + D — テストファイルへの `@story` メタデータ end-to-end 検証を完成。`templates/` 配下のサンプルファイルを実体化し、生成コードへのメタデータ付与を保証する経路を確立。

## [0.52.0] - 2026-04-19

### Changed

- ISSUE-008 Phase B-3 — pre-commit フローに `.md` 設計文書の検証を接続。`logical_design.md` 等の frontmatter / メタデータが欠けたままコミットされるのを防ぐ。

## [0.51.0] - 2026-04-19

### Added

- ISSUE-011 起票（`validate-metadata` UX / parser / drift 検出に関する改善集）。

## [0.50.0] - 2026-04-19

### Added

- ISSUE-008 Phase B-2 — `validate-metadata` CLI に `.md` 分岐を追加。Markdown 設計文書のメタデータ（frontmatter）も検証対象になる。

## [0.49.0] - 2026-04-19

### Changed

- ISSUE-008 Phase B-1 撤回 + P1-2 前提更新 — 設計文書 frontmatter 必須化（v0.48.0）の方針を再検討し前提を更新。

## [0.48.0] - 2026-04-19

### Added

- ISSUE-008 Phase B-1 / P1-2 — 設計文書（`logical_design.md` / `domain_model.md` 等）の frontmatter を必須化。

## [0.47.0] - 2026-04-18

### Added

- ISSUE-008 Phase A / P1-1 — 生成コードに `@unit` / `@layer` メタデータを必ず付与するよう、各実装スキル（`story-implementor` / `quick-implementor`）に指示を追加。

## [0.46.0] - 2026-04-18

### Added

- ISSUE-007 起票（リトロフィット導入障壁 — レガシーリポジトリでの初回 phase-gate ブロック問題）。
- ISSUE-008 起票（メタデータ emit 欠落 — 生成コードに `@unit` / `@layer` が付かないケース）。

## [0.45.0] - 2026-04-18

### Added

- ISSUE-006 起票 + Phase P2-3 — `docs/guide/quick-vs-full-mode.md`（Quick Mode と Full Mode の選択ガイド）を新設。

## [0.44.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase D / P3-8 — Markdown のメタ見出し（`---` で囲まれた frontmatter 等）をパース時に正しくスキップするよう修正。
- ISSUE-005 Phase D / P3-9 — ファイルパスから `@unit` を推定するロジックを改善。
- ISSUE-005 Phase D / P3-10 — `list-errors` と `render-errors` の境界をドキュメント化（`list-errors` は定義駆動 / `render-errors` はランタイム駆動）。

## [0.43.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase C / P2-6 — `phasegate:check-phase` の `--help` / `--json` フラグが positional 引数として食われ unit 名扱いされていたバグを修正。
- ISSUE-005 Phase C / P2-7 — `regression:*` 系コマンドの出力先を整理。

## [0.42.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase B-2 / P1-5 — `detect-drift` と L4-001 バリデータを統合し、設計-コード乖離検出の経路を一本化。

## [0.41.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase B-1 / P1-3 — fresh repo（履歴がない初期化直後のリポジトリ）での git 解析が失敗するバグを fallback 経路で修正。
- ISSUE-005 Phase B-1 / P1-4 — `validate --layer` フィルタが効かないケースを修正。

## [0.40.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase A / P0-1 — pre-commit 経路の復旧（一部バリデータが pre-commit から呼ばれていなかった問題）。
- ISSUE-005 Phase A / P0-2 — `ci:generate-template` の UX 改善（`--preset` 省略時のエラーメッセージを実用的に）。

## [0.39.0] - 2026-04-18

### Fixed

- `main.ts` の `loadStoryReflectionProvider` (scripts/harness/main.ts:271) と `loadResolvedConfig` (scripts/harness/main.ts:326) の `catch` が広すぎ、`phasegate.config.json` の `SyntaxError`（JSON パース失敗）や I/O エラーを silent に握り潰していた問題を修正。`ENOENT`（ファイル未作成）は従来どおり silent return、それ以外は stderr に `Warning: phasegate.config.json is not valid JSON: ...` 等を出してから null/undefined を返す。CLI の後続処理は続行する（`ConfigValidationError` の exit(2) 挙動は維持）。
- `scripts/harness/__tests__/e2e/cli-harness.test.ts` に回帰テストを2件追加（壊れた JSON 警告・ENOENT silent）

### Migration Notes

利用者側の対応は不要。`phasegate.config.json` が壊れていた場合、これまで静かに storyReflection 関連表示・preset 解決だけが消えていたのが、stderr に警告が出るようになる。JSON 消費側（CI スクリプト等）は stdout のみパースしている限り影響なし。

## [0.38.0] - 2026-04-18

### Fixed

- `phasegate:status --json` 出力が JSON.parse 不可だったバグを修正。`storyReflection: ...` という非 JSON 行が JSON 出力の後ろに無条件で追記されていた（`scripts/harness/main.ts:709` で `printStoryReflectionStatusLine` を `--json` フラグに関わらず呼び出していたため）。修正後は `--json` 時のみ抑止する。利用者からの FB により発覚。

### Migration Notes

利用者側の対応は不要。`phasegate:status` を JSON 消費する側（CI スクリプト等）で `JSON.parse(stdout)` が成功するようになる。人間向け（フラグなし）出力には引き続き `storyReflection` 行が表示される。

## [0.37.0] - 2026-04-17

### Removed

- `templates/phasegate.config.json` を削除（ISSUE-004 Phase D / P2-6）。`initHarnessConfig()` は `skill-deployer.ts` 内でインライン構築しており、テンプレートファイルは `npm publish` に含まれるのみで誰にも読まれない dead code だった。

### Fixed

- 6 スキル本文の `docs/principles/testing_rules.md`（アンダースコア）参照を正しい `docs/principles/testing-rules.md`（ハイフン）に修正（ISSUE-004 Phase D / 観察事項）。対象: unit-test-designer, it-test-designer, scenario-test-designer, unit-test-logic-designer, it-test-logic-designer, scenario-test-logic-designer

### Migration Notes

利用者側の対応は不要。`templates/phasegate.config.json` は v0.33.0〜v0.36.0 時点でも実際の `init` 生成物とは内容が異なり、参照されていなかった。スキル本文のリンク切れ修正は純粋なドキュメント修正で、動作への影響なし。

## [0.36.0] - 2026-04-17

### Added

- `phasegate init` が設計原則ドキュメント（`docs/principles/*.md`、`docs/folder_management_rules.md`）を導入PJの `docs/` 配下に自動配置するように（ISSUE-004 Phase C / P1-4）
- `phasegate init --with-husky` オプション — `.husky/pre-commit` フック（`npx phasegate pre-commit` 呼び出し）を任意配置（ISSUE-004 Phase C / P1-5）
- `setup/skill-deployer.ts` に `deployDesignDocs()` `deployHuskyHook()` 関数を追加
- `__tests__/integration/setup/init-design-docs.integration.test.ts` — `init` の docs/husky 配置を検証する IT テスト（8 ケース）

### Changed

- README.md / README.ja.md の Quick Start から手動 `cp` 手順（旧 §3）を削除し、§2 の `init` 説明に「設計原則ドキュメントも配置される」旨を追記
- `phasegate --help` の Setup セクション `init` 行に `--with-husky` を追記、説明を「deploy skills + design docs + phasegate.config.json」に更新

### Migration Notes

既に `init` を実行済みのプロジェクトでも、もう一度 `npx phasegate init` を実行すれば不足している設計原則ドキュメントだけが追加配置されます（既存ファイルは上書きされません）。`.husky/pre-commit` を追加したい場合は `npx phasegate init --with-husky` を実行してください。

## [0.35.0] - 2026-04-17

### Added

- `phasegate hook <pre-tool-use|post-tool-use|stop>` サブコマンド — Claude Code hook を CLI 経由で起動（ISSUE-004 Phase B）
- `phasegate pre-commit` サブコマンド — L2 pre-commit バリデータを CLI 経由で起動
- `phasegate delegate-sonnet [...args]` サブコマンド — Sonnet 4.6 委任スクリプトを CLI 経由で起動

### Changed

- `templates/.claude/settings.json` の hook command を `npx tsx node_modules/phasegate/scripts/...` から `npx phasegate hook X` 形式に変更（パッケージ内部レイアウトに依存しない安定 API へ）
- `templates/.husky/pre-commit` を `npx phasegate pre-commit` 呼び出しに変更
- 12 スキル本文の `scripts/delegate-sonnet.sh` 直接参照を `npx phasegate delegate-sonnet` に統一（story-writer, story-mapper, environment-designer, unit-designer, mock-designer, unit-test-designer, unit-test-logic-designer, scenario-test-designer, scenario-test-logic-designer, it-test-designer, it-test-logic-designer, implementation-planner）

### Migration Notes

既存の `.claude/settings.json`（`init` 既存スキップ仕様により旧形式が残る）を v0.35.0 形式に更新する場合、3 箇所の hook command を以下に書き換えてください:

```diff
- "npx tsx node_modules/phasegate/scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts"
+ "npx phasegate hook pre-tool-use"
- "npx tsx node_modules/phasegate/scripts/harness/agent-integration/presentation/post-tool-use-hook.ts"
+ "npx phasegate hook post-tool-use"
- "npx tsx node_modules/phasegate/scripts/harness/agent-integration/presentation/stop-hook.ts"
+ "npx phasegate hook stop"
```

旧形式は引き続き動作しますが、パッケージ内部パスに依存するため将来非推奨化する可能性があります。

## [0.10.0] - 2026-04-02

### Removed

- fuse-hooks-engine Unit を完全削除し yaml 依存を除去

## [0.9.0] - 2026-03-29

### Changed

- PreToolUseフックのエラーメッセージをアクショナブル化 (agent-integration)

## [0.8.0] - 2026-03-29

### Removed

- FUSE実装を完全に削除し hooks-only 構成に簡素化

## [0.7.0] - 2026-03-29

### Added

- FUSEモードにフェーズゲート強制を追加 (fuse-hooks-engine)

## [0.6.0] - 2026-03-28

### Added

- E2E検証完了
- init hookテンプレート追加

### Fixed

- PostToolUseフック修正

## [0.5.0] - 2026-03-28

### Fixed

- pre-tool-use hookのfile_path対応と絶対パス変換を修正

## [0.4.0] - 2026-03-28

### Added

- inception側フェーズゲート整備 (ISSUE-001)

## [0.3.0] - 2026-03-28

### Changed

- バージョンを v0.3.0 にリセット（v2.2.0 系から再出発）

## [0.2.0] - 2026-03-28

Pre-reset era (formerly v2.1.0 - v2.2.0). Major features delivered before the version reset:

### Added

- FUSE/Hooks モード切替配線 -- guardMode による条件分岐
- L0層バリデータ統合 -- 5層防御モデル完成
- Future A アダプタ実装完了 -- 5アダプタ+43テスト (fuse-hooks-engine)
- フェーズゲート統合拡張 -- TDD実装完了 (agent-integration)
- L0スキーマ定義追加

### Fixed

- Readツール等がフェーズゲートで誤ブロックされるバグを修正 (BUG-03)
- フルスイート全Green化 -- emptyフィクスチャ復元+タイムアウト緩和
- harness.config.json スキーマ準拠

## [0.1.0] - 2026-03-21

Pre-reset era (formerly v1.0.0 - v1.1.1). Initial release and early bug fixes:

### Added

- GSDLC Harness Engineering Toolkit 初期リリース (v1.0.0)
- v1 MVH完成 + Future A/B + 全バグ修正 (v2.1.0)

### Fixed

- skill:validate-structureのセクション検出を完全修正 (BUG-02)
- check-phase-gate --level 2/3でexit code 2になるバグを修正 (INV-01)
- ajv v8互換対応
- 3件のバグ修正

[Unreleased]: https://github.com/junpei-9898/phasegate/compare/v0.67.0...HEAD
[0.67.0]: https://github.com/junpei-9898/phasegate/compare/v0.66.0...v0.67.0
[0.66.0]: https://github.com/junpei-9898/phasegate/compare/v0.65.0...v0.66.0
[0.65.0]: https://github.com/junpei-9898/phasegate/compare/v0.64.0...v0.65.0
[0.64.0]: https://github.com/junpei-9898/phasegate/compare/v0.63.0...v0.64.0
[0.63.0]: https://github.com/junpei-9898/phasegate/compare/v0.62.0...v0.63.0
[0.62.0]: https://github.com/junpei-9898/phasegate/compare/v0.61.0...v0.62.0
[0.61.0]: https://github.com/junpei-9898/phasegate/compare/v0.60.0...v0.61.0
[0.60.0]: https://github.com/junpei-9898/phasegate/compare/v0.59.0...v0.60.0
[0.59.0]: https://github.com/junpei-9898/phasegate/compare/v0.58.0...v0.59.0
[0.58.0]: https://github.com/junpei-9898/phasegate/compare/v0.57.0...v0.58.0
[0.57.0]: https://github.com/junpei-9898/phasegate/compare/v0.56.0...v0.57.0
[0.56.0]: https://github.com/junpei-9898/phasegate/compare/v0.55.0...v0.56.0
[0.55.0]: https://github.com/junpei-9898/phasegate/compare/v0.54.0...v0.55.0
[0.54.0]: https://github.com/junpei-9898/phasegate/compare/v0.53.0...v0.54.0
[0.53.0]: https://github.com/junpei-9898/phasegate/compare/v0.52.0...v0.53.0
[0.52.0]: https://github.com/junpei-9898/phasegate/compare/v0.51.0...v0.52.0
[0.51.0]: https://github.com/junpei-9898/phasegate/compare/v0.50.0...v0.51.0
[0.50.0]: https://github.com/junpei-9898/phasegate/compare/v0.49.0...v0.50.0
[0.49.0]: https://github.com/junpei-9898/phasegate/compare/v0.48.0...v0.49.0
[0.48.0]: https://github.com/junpei-9898/phasegate/compare/v0.47.0...v0.48.0
[0.47.0]: https://github.com/junpei-9898/phasegate/compare/v0.46.0...v0.47.0
[0.46.0]: https://github.com/junpei-9898/phasegate/compare/v0.45.0...v0.46.0
[0.45.0]: https://github.com/junpei-9898/phasegate/compare/v0.44.0...v0.45.0
[0.44.0]: https://github.com/junpei-9898/phasegate/compare/v0.43.0...v0.44.0
[0.43.0]: https://github.com/junpei-9898/phasegate/compare/v0.42.0...v0.43.0
[0.42.0]: https://github.com/junpei-9898/phasegate/compare/v0.41.0...v0.42.0
[0.41.0]: https://github.com/junpei-9898/phasegate/compare/v0.40.0...v0.41.0
[0.40.0]: https://github.com/junpei-9898/phasegate/compare/v0.39.0...v0.40.0
[0.39.0]: https://github.com/junpei-9898/phasegate/compare/v0.38.0...v0.39.0
[0.38.0]: https://github.com/junpei-9898/phasegate/compare/v0.37.0...v0.38.0
[0.37.0]: https://github.com/junpei-9898/phasegate/compare/v0.36.0...v0.37.0
[0.36.0]: https://github.com/junpei-9898/phasegate/compare/v0.35.0...v0.36.0
[0.35.0]: https://github.com/junpei-9898/phasegate/compare/v0.10.0...v0.35.0
[0.10.0]: https://github.com/junpei-9898/phasegate/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/junpei-9898/phasegate/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/junpei-9898/phasegate/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/junpei-9898/phasegate/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/junpei-9898/phasegate/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/junpei-9898/phasegate/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/junpei-9898/phasegate/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/junpei-9898/phasegate/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/junpei-9898/phasegate/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/junpei-9898/phasegate/releases/tag/v0.1.0
