# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
