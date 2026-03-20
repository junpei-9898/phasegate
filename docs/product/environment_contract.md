# 環境契約書（Environment Contract）

> **作成日**: 2026-03-13
> **対象Wave**: Wave 1〜Wave 3（全14Unit）
> **対象Unit**: config-foundation, harness-error, phase-dependency-model, traceability-model, adr-foundation, biome-ast-engine, validator-system, nyquist-validation, quick-mode, harness-api, agent-integration, skill-quality, ci-governance, regression-suite
> **前提**: `docs/inception/_shared/environment_design_plan.md`（Q1-Q5確定済み）
> **最終更新**: 2026-03-19（Wave 2+3追記）

---

## §1 マイグレーション台帳

v0アーカイブ契約からWave 1 v1環境へ移行するための差分を、以下のIDで追跡する。

| ID | マイグレーション | 対象 | v1契約 |
|----|------------------|------|--------|
| M-001 | パッケージマネージャ移行 | ルート運用 | npm運用を終了し、pnpmを正式採用する。`package-lock.json` は削除対象、`pnpm-lock.yaml` は Phase 2 初手で生成、`.npmrc` は `package-lock=false` を設定する。 |
| M-002 | ESLint依存パッケージ削除予定化 | `package.json` | `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/rule-tester`, `@typescript-eslint/utils` は削除予定として残置する。実削除は Biome パリティ確認完了後に行う。 |
| M-003 | ESLintテンプレート削除予定化 | `scripts/harness/templates/eslint.config.js` | v1では新規利用を禁止し、パリティ確認完了後に削除する。 |
| M-004 | ESLintルールディレクトリ削除予定化 | `scripts/harness/eslint-rules/` | v1では保守対象外とし、比較・移行用途に限定して残置する。実削除はパリティ確認完了後に行う。 |
| M-005 | 新規ランタイム依存追加 | `package.json` | `ajv`, `gray-matter`, `@biomejs/biome` を追加する。`@biomejs/biome` は `^1.5.0` を採用する。 |
| M-006 | 6 Unitディレクトリ新設 | `scripts/harness/` | `config-foundation`, `harness-error`, `phase-dependency-model`, `traceability-model`, `adr-foundation`, `biome-ast-engine` の6 Unitを4層構成で新設する。 |
| M-007 | Shared Kernel公開面新設 | `scripts/harness/shared-kernel/` | Shared Kernel は `harness-error.ts`, `harness-config.ts`, `story-id.ts` の3ファイルのみ新設する。 |
| M-008 | `harness.config.json` スキーマ移行 | `harness.config.json` | 現行 `version: "1.0"` から `HarnessConfigV2` 契約へ移行する。構造所有は config-foundation、意味論は各対応Unitが担う。 |
| M-009 | Biome設定新設 | `biome.json` | v1標準 lint/format 設定として新規作成する。対象は `scripts/harness/**/*.ts` とし、追加ビルド拡張は含めない。 |
| M-010 | 互換入口の縮退維持 | `scripts/harness/cli/`, `scripts/harness/core/`, `scripts/harness/validators/`, `scripts/harness/cli/ci-check.ts`, `scripts/harness/cli/detect-drift.ts`, `scripts/harness/cli/collect-lessons.ts`, `scripts/harness/cli/detect-dead-code.ts` | `enable.ts`, `disable.ts`, `check-phase.ts`, `check-ready.ts`, `ci-check.ts`, `detect-drift.ts`, `collect-lessons.ts`, `detect-dead-code.ts`, `core/config-loader.ts`, `core/error-reporter.ts`, `core/metadata-parser.ts`, `validators/metadata.ts`, `validators/phase-gate.ts` は v1内部実装へ委譲する薄い互換入口として残す。 |
| M-011 | Wave 2+3 Unitディレクトリ新設 | `scripts/harness/` | `validator-system`, `nyquist-validation`, `quick-mode`, `harness-api`, `agent-integration`, `skill-quality`, `ci-governance`, `regression-suite` の8Unitを4層構成で新設する |
| M-012 | Shared Kernel拡張 | `scripts/harness/shared-kernel/` | `harness-api.ts`（HarnessApiResponse<T> 公開入口）, `validator-system.ts`（ValidatorRegistry I/F + ValidationResult Contract）, `quick-mode.ts`（QuickModeDecision Contract）の3ファイルを追加する。合計6ファイル体制となる |
| M-013 | 新規ランタイム依存追加 | `package.json` | `fast-glob`, `micromatch`, `js-yaml` を dependencies に追加する |
| M-014 | Cross-Unit Contractスキーマディレクトリ新設 | `docs/contracts/` | `lesson-artifact.schema.json`（ci-governance所有）と `requirement-test-matrix.schema.json`（nyquist-validation所有）を格納するディレクトリを新設する |
| M-015 | 実行時データディレクトリ新設 | `.harness/` | ci-governanceが管理するエラー繰り返し検出用 `error-history.json` の格納先として `.harness/` ディレクトリを新設する |
| M-016 | Claude Code Hook登録 | `.claude/settings.json` | agent-integration の3フックを `tsx` 経由でhooks設定に登録する。実体は `scripts/harness/agent-integration/presentation/` 配下の `pre-tool-use-hook.ts`, `post-tool-use-hook.ts`, `stop-hook.ts` |
| M-017 | 回帰テストスイートディレクトリ新設 | `scripts/harness/__tests__/` | `regression/` サブディレクトリを新設し、regression-suiteの4テストスイートファイル（k-requirements, gng-gate, agent-independence, v0-migration）を格納する |
| M-018 | package.jsonスクリプト追加 | `package.json` | `harness:complete-check`, `harness:impact-analysis`, `harness:ci-template` の3スクリプトを新規追加する。既存スクリプト（harness:check-phase / harness:check-ready / harness:lint / harness:ci-check / harness:detect-drift）はWave 2実装完了まで互換入口を維持し、完了後にharness-api向けに切り替える |
| M-019 | ts-morph依存追加 | `package.json` | agent-integrationのImportAnalyzerPortアダプタで使用する `ts-morph` を devDependencies に追加する（TypeScript Compiler APIラッパー） |

---

## §2 サービス構成マニフェスト

### §2.1 Unit構成一覧

| Unit | 配置先パス | エントリポイント | CLIコマンド | 外部依存 | 設定ファイル |
|------|------------|------------------|-------------|----------|--------------|
| config-foundation | `scripts/harness/config-foundation/` | `scripts/harness/shared-kernel/harness-config.ts`, `scripts/harness/cli/enable.ts`, `scripts/harness/cli/disable.ts` | `harness:enable`, `harness:disable` | `ajv` | `harness.config.json`, `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json`, `scripts/harness/config-foundation/infrastructure/presets/*.json` |
| harness-error | `scripts/harness/harness-error/` | `scripts/harness/shared-kernel/harness-error.ts` | 単独トップレベルCLIなし。内部Presentationとして `render-harness-errors`, `validate-fix-example`, `list-error-definitions`, `assert-severity-contract` を持つ | `typescript`（Compiler API、devDependency） | `scripts/harness/harness-error/infrastructure/registry/*.ts` |
| phase-dependency-model | `scripts/harness/phase-dependency-model/` | `scripts/harness/cli/check-phase.ts`, `scripts/harness/cli/check-ready.ts`, `scripts/harness/validators/phase-gate.ts` | `harness:check-phase`, `harness:check-ready` | なし | `harness.config.json` |
| traceability-model | `scripts/harness/traceability-model/` | `scripts/harness/traceability-model/index.ts`, `scripts/harness/shared-kernel/story-id.ts` | 単独CLIなし | なし | なし |
| adr-foundation | `scripts/harness/adr-foundation/` | `scripts/harness/adr-foundation/index.ts` | 内部運用CLI: `adr:create-template`, `adr:seed-initial`, `adr:list`, `adr:show`, `adr:search-archgate`, `adr:validate`, `adr:change-status` | `gray-matter` | `docs/ADR/*.md`, `docs/ADR/template.md` |
| biome-ast-engine | `scripts/harness/biome-ast-engine/` | `scripts/harness/biome-ast-engine/index.ts`, `scripts/harness/biome-ast-engine/presentation/cli/harness-lint-command-handler.ts` | `harness:lint` | `@biomejs/biome`, `typescript`（Compiler API、devDependency） | `biome.json`, `harness.config.json`, `package.json`, `pnpm-lock.yaml` |
| validator-system | `scripts/harness/validator-system/` | `scripts/harness/shared-kernel/validator-system.ts` | harness-api経由（単独CLI所有なし）。内部Presentation: `run-l2-validators`, `run-l3-validators`, `run-l4-validators` | なし（biome-ast-engine, nyquist-validation, phase-dependency-model をポート経由参照） | `harness.config.json` |
| nyquist-validation | `scripts/harness/nyquist-validation/` | `scripts/harness/nyquist-validation/index.ts` | harness-api経由（単独CLIなし）。`harness:impact-analysis` はharness-api経由 | なし | `docs/contracts/requirement-test-matrix.schema.json`, `requirement-test-matrix.json`（プロジェクトルート） |
| quick-mode | `scripts/harness/quick-mode/` | `scripts/harness/shared-kernel/quick-mode.ts` | harness-api経由（単独CLIなし）。内部: `quick-mode-check` | なし | `harness.config.json` |
| harness-api | `scripts/harness/harness-api/` | `scripts/harness/shared-kernel/harness-api.ts` | `harness:check-ready`, `harness:check-phase`, `harness:ci-check`, `harness:detect-drift`, `harness:status`, `harness:lint`, `harness:complete-check`, `harness:impact-analysis` | なし（他Unit をポート経由参照） | `harness.config.json` |
| agent-integration | `scripts/harness/agent-integration/` | `scripts/harness/agent-integration/presentation/{pre-tool-use-hook,post-tool-use-hook,stop-hook}.ts` | Claude Code Hook（CLI直接呼び出しなし）。`.claude/settings.json`のhooks設定でtsx経由登録 | なし（biome-ast-engine AST解析はImportAnalyzerPortポート経由） | `harness.config.json`, `.claude/settings.json` |
| skill-quality | `scripts/harness/skill-quality/` | `scripts/harness/skill-quality/index.ts` | harness-api経由。内部: `harness:collect-lessons`（v0互換から移行） | なし | `harness.config.json`, `docs/contracts/lesson-artifact.schema.json` |
| ci-governance | `scripts/harness/ci-governance/` | `scripts/harness/ci-governance/index.ts` | `harness:ci-template` | `js-yaml` | `harness.config.json`, `docs/contracts/lesson-artifact.schema.json`, `.harness/error-history.json` |
| regression-suite | `scripts/harness/regression-suite/` | `scripts/harness/__tests__/regression/` | 単独CLIなし。Vitestテストスイート（k-requirements, gng-gate, agent-independence, v0-migration）として実行 | なし | `harness.config.json`, `scripts/harness/regression-suite/infrastructure/seeds/v0_v1_test_mapping.md` |

Shared Kernel公開面は以下の**6ファイル**に拡張する（Wave 1の3ファイルに追記）：

```
scripts/harness/shared-kernel/
├── harness-error.ts       (Wave 1 既存)
├── harness-config.ts      (Wave 1 既存)
├── story-id.ts            (Wave 1 既存)
├── harness-api.ts         (Wave 2 新規: HarnessApiResponse<T>)
├── validator-system.ts    (Wave 2 新規: ValidatorRegistry I/F + ValidationResult)
└── quick-mode.ts          (Wave 2 新規: QuickModeDecision Contract)
```

### §2.2 統合ディレクトリ構造（確定版）

```text
GSDLC_HARNESS/
├── scripts/harness/
│   ├── config-foundation/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── harness-error/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── phase-dependency-model/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── traceability-model/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── adr-foundation/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── biome-ast-engine/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── validator-system/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── nyquist-validation/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── quick-mode/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── harness-api/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── agent-integration/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── skill-quality/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── ci-governance/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── regression-suite/
│       ├── domain/
│       ├── application/
│       └── infrastructure/
│   ├── shared-kernel/
│   │   ├── harness-error.ts       (Wave 1 既存)
│   │   ├── harness-config.ts      (Wave 1 既存)
│   │   ├── story-id.ts            (Wave 1 既存)
│   │   ├── harness-api.ts         (Wave 2 新規)
│   │   ├── validator-system.ts    (Wave 2 新規)
│   │   └── quick-mode.ts          (Wave 2 新規)
│   ├── core/              (v0既存)
│   ├── cli/               (v0既存 + 新規)
│   ├── validators/        (v0既存)
│   ├── eslint-rules/      (削除予定)
│   ├── templates/         (v0既存)
│   └── __tests__/
│       ├── unit/
│       │   ├── config-foundation/      (Wave 1)
│       │   ├── harness-error/          (Wave 1)
│       │   ├── phase-dependency-model/ (Wave 1)
│       │   ├── traceability-model/     (Wave 1)
│       │   ├── adr-foundation/         (Wave 1)
│       │   ├── biome-ast-engine/       (Wave 1)
│       │   ├── validator-system/       (Wave 2)
│       │   ├── nyquist-validation/     (Wave 2)
│       │   ├── quick-mode/             (Wave 2)
│       │   ├── harness-api/            (Wave 2)
│       │   ├── agent-integration/      (Wave 2)
│       │   ├── skill-quality/          (Wave 3)
│       │   ├── ci-governance/          (Wave 3)
│       │   └── regression-suite/       (Wave 3)
│       ├── integration/
│       │   └── (全14Unit対応)
│       ├── regression/                 (Wave 3 新規: regression-suite テストスイート)
│       │   ├── k-requirements.test.ts
│       │   ├── gng-gate.test.ts
│       │   ├── agent-independence.test.ts
│       │   └── v0-migration.test.ts
│       └── vitest.config.ts
├── docs/
│   ├── ADR/
│   └── contracts/          (Wave 2+3 新規)
│       ├── lesson-artifact.schema.json
│       └── requirement-test-matrix.schema.json
├── .harness/               (Wave 3 新規)
│   └── error-history.json
├── harness.config.json
├── biome.json
├── package.json
├── pnpm-lock.yaml
├── .npmrc
└── tsconfig.json
```

補足:

- 上記は統合スケルトンであり、各Unitの詳細ファイル一覧は各 `logical_design.md` を正規ソースとする。
- `traceability-model` は論理設計どおり `presentation/` を持たない。
- `regression-suite` は `presentation/` を持たない。
- `core/`, `cli/`, `validators/` は互換入口として残すが、新規責務は各Unit配下へ寄せる。

### §2.3 `package.json`（確定版）

v1の `package.json` 契約は以下とする。`dependencies` はランタイム必須、`devDependencies` は開発・CI実行時依存とする。

```json
{
  "name": "gsdlc-harness",
  "version": "1.0.0",
  "description": "GSDLC Harness Engineering Toolkit - Governed Software Development Life Cycle",
  "private": true,
  "type": "module",
  "scripts": {
    "harness:status": "pnpm exec tsx scripts/harness/cli/status.ts",
    "harness:init": "pnpm exec tsx scripts/harness/cli/init.ts",
    "harness:enable": "pnpm exec tsx scripts/harness/cli/enable.ts",
    "harness:disable": "pnpm exec tsx scripts/harness/cli/disable.ts",
    "harness:check-phase": "pnpm exec tsx scripts/harness/cli/check-phase.ts",
    "harness:check-ready": "pnpm exec tsx scripts/harness/cli/check-ready.ts",
    "harness:lint": "pnpm exec tsx scripts/harness/biome-ast-engine/presentation/cli/harness-lint-command-handler.ts",
    "adr:create-template": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-create-template.ts",
    "adr:seed-initial": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-seed-initial.ts",
    "adr:list": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-list.ts",
    "adr:show": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-show.ts",
    "adr:search-archgate": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-search-archgate.ts",
    "adr:validate": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-validate.ts",
    "adr:change-status": "pnpm exec tsx scripts/harness/adr-foundation/presentation/cli/adr-change-status.ts",
    "harness:ci-check": "pnpm exec tsx scripts/harness/cli/ci-check.ts",
    "harness:detect-drift": "pnpm exec tsx scripts/harness/cli/detect-drift.ts",
    "harness:collect-lessons": "pnpm exec tsx scripts/harness/cli/collect-lessons.ts",
    "harness:detect-dead-code": "pnpm exec tsx scripts/harness/cli/detect-dead-code.ts",
    "harness:complete-check": "pnpm exec tsx scripts/harness/harness-api/presentation/handlers/complete-check-handler.ts",
    "harness:impact-analysis": "pnpm exec tsx scripts/harness/harness-api/presentation/handlers/impact-analysis-handler.ts",
    "harness:ci-template": "pnpm exec tsx scripts/harness/ci-governance/presentation/cli/ci-template-handler.ts",
    "test": "pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts",
    "test:regression": "pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts --project regression"
  },
  "dependencies": {
    "@biomejs/biome": "^1.5.0",
    "ajv": "^10.0.0",
    "fast-glob": "^3.3.0",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.0",
    "micromatch": "^4.0.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.0",
    "@types/micromatch": "^4.0.0",
    "@types/node": "^25.3.5",
    "@typescript-eslint/parser": "^8.56.1",
    "@typescript-eslint/rule-tester": "^8.56.1",
    "@typescript-eslint/utils": "^8.56.1",
    "eslint": "^10.0.3",
    "ts-morph": "^23.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

運用ルール:

- `typescript` は Q3に従い `devDependencies` のまま維持する。
- ESLint関連依存は Q4に従い削除予定として一時残置する。削除の追跡は M-002 で管理する。
- package script の実行形式は `pnpm exec tsx ...` に統一する。
- `harness:ci-check`, `harness:detect-drift`, `harness:collect-lessons`, `harness:detect-dead-code` は v0 互換入口であり、Wave 1 v1の設計対象外だが実行互換性のために残す。
- `harness:check-phase`, `harness:check-ready`, `harness:lint`, `harness:ci-check`, `harness:detect-drift` はWave 2実装完了まで互換入口を維持し、完了後にharness-api向けに切り替える。

### §2.4 `tsconfig.json`（確定版）

`tsconfig.json` は変更しない。現行設定のまま v1 配置方針をカバーする。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["scripts/harness/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### §2.5 `biome.json`（新規作成）

追加ビルド拡張を持たない v1 の Biome 設定契約を以下とする。

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "files": {
    "include": ["scripts/harness/**/*.ts"],
    "ignore": ["node_modules", "dist", "**/__tests__/fixtures/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true
  }
}
```

適用原則:

- `plugins` は空または省略とし、追加プラグイン契約は持たない。
- `files.include` は `scripts/harness/**/*.ts` のみを対象とする。
- `files.ignore` は `node_modules`, `dist`, `__tests__/fixtures` を除外対象とする。

---

## §3 認証・認可アーキテクチャ

本ハーネスはローカル開発ツールキットであり、サーバープロセスや外部公開APIを持たない。そのため v1 でも認証・認可機構は導入しない。

- 設定ファイル読取は config-foundation の infrastructure 経由で行う。
- ADRファイル読取は adr-foundation の infrastructure 経由で行う。
- エラー整形、フェーズ判定、トレーサビリティ検証はすべてローカル実行を前提とする。
- 全CLIの終了コードは統合契約に従い `0 / 1 / 2` を採用する。

---

## §4 シードデータ定義

| 種別 | 所有Unit | 配置先 | 内容 |
|------|----------|--------|------|
| ADR初期11件 | adr-foundation | `scripts/harness/adr-foundation/infrastructure/seeds/initial-adr-definitions.ts` | `docs/ADR/001-011` を生成する初期定義。 |
| Preset定義3種 | config-foundation | `scripts/harness/config-foundation/infrastructure/presets/` | `minimal.json`, `standard.json`, `strict.json` を保持する。 |
| ErrorDefinition Registry | harness-error | `scripts/harness/harness-error/infrastructure/registry/` | `l1-error-definitions.ts` から `l4-error-definitions.ts` までの定義と `validator-entrypoints.ts` を保持する。 |
| Phase既定定義 | phase-dependency-model | `scripts/harness/phase-dependency-model/domain/definitions/` | `default-phase-nodes.ts` と `default-phase-dependencies.ts` により 3層フェーズ構造を保持する。 |
| LessonArtifact JSONスキーマ | ci-governance | `docs/contracts/lesson-artifact.schema.json` | skill-qualityが出力するlesson artifactの型定義スキーマ。Cross-Unit Contract。 |
| RequirementTestMatrix JSONスキーマ | nyquist-validation | `docs/contracts/requirement-test-matrix.schema.json` | nyquist-validationが管理するrequirement-test-matrix.jsonのJSONスキーマ。 |
| ErrorRepetition初期状態 | ci-governance | `.harness/error-history.json` | `{ "repetitions": [] }` を初期値として格納する空のエラー繰り返し履歴。 |
| V0→V1テストマッピング | regression-suite | `scripts/harness/regression-suite/infrastructure/seeds/v0_v1_test_mapping.md` | v0テスト→v1テストパスのマッピング表。移行完了済みv0テスト一覧。 |

シードデータ運用ルール:

- ADRテンプレート `docs/ADR/template.md` は参照テンプレートであり、一覧・採番の対象外とする。
- Presetは deep merge 時に配列を連結せず、上書き元の配列で置換する。
- ErrorDefinition Registry は `L{n}-{nnn}` 正規形式のみを受け入れる。
- Phase既定定義は Level間依存と TDD最低保証を非緩和制約として保持する。

---

## §5 フレームワーク・ランタイム制約集

| ID | 制約 |
|----|------|
| C-1 | 全Unitはヘキサゴナルアーキテクチャの依存方向 `domain ← application ← infrastructure`, `domain ← application ← presentation` を厳守する。 |
| C-2 | 実装ファイルには `@unit` と `@layer` のメタデータを必須とし、`@layer` に許可される値は `domain`, `application`, `infrastructure`, `presentation` のみとする。 |
| C-3 | ErrorCodeの正規形式は `L{n}-{nnn}` とする。意味名コードや `L2-PHASE-GATE` 形式は許容しない。 |
| C-4 | ESLintは最終的に完全廃止する。ただし Q4 に従い、v1契約時点では比較用途のため削除予定状態で一時残置し、新規実装・新規設定追加は禁止する。 |
| C-5 | `gray-matter` は adr-foundation の infrastructure で frontmatter 解析にのみ使用し、他Unitから直接利用しない。 |
| C-6 | `ajv` は config-foundation の infrastructure に限定して使用し、domain/application/presentation へ持ち込まない。 |
| C-7 | TypeScript Compiler API は harness-error と biome-ast-engine の infrastructure に限定して使用する。 |
| C-8 | ファイル名は kebab-case とし、v1 Unit名も `config-foundation` などの kebab-case を正規とする。 |
| C-9 | Biome CLI の実行は biome-ast-engine infrastructure のサブプロセス実行に限定し、domain/application/presentation から直接CLIを起動しない。 |
| C-10 | テストは `scripts/harness/__tests__/{unit-name}/` 配下へ配置し、AAA、`actual` 命名、日本語テスト名、ドメインモック禁止を適用する。 |
| C-11 | Shared Kernelは `HarnessError`, `HarnessConfigV2`, `StoryId` の3型だけを公開し、他Unitは内部実装ディレクトリを直接importしない。 |
| C-12 | `traceability-model` は単独Presentation層を持たない。外部公開は `index.ts` と `shared-kernel/story-id.ts` のみとする。 |
| C-13 | `harness.config.json` は移行完了後に `HarnessConfigV2` を唯一の構造契約とし、`phaseDependencies` と `planningMode` の意味論は対応Unit側が所有する。 |
| C-14 | `fast-glob` は validator-system, nyquist-validation, harness-api の infrastructure 層のファイルスキャン用途に限定し、domain/application/presentation 層から直接利用しない。 |
| C-15 | `js-yaml` は ci-governance の infrastructure 層に限定して使用し、他Unit から直接利用しない。 |
| C-16 | `ts-morph` は agent-integration の infrastructure 層（ImportAnalyzerPort実装）に限定して使用し、他Unit から直接利用しない。 |
| C-17 | `docs/contracts/` 配下の JSON スキーマは Cross-Unit Contract として扱い、所有Unit の domain 層が正規ソースとなる。消費Unitはスキーマファイルを経由して参照し、所有Unitのドメイン層を直接 import しない。 |
| C-18 | `.harness/` ディレクトリは ci-governance の infrastructure 層のみが読み書きを行う。他Unitは直接ファイルアクセスせず、ポートインターフェース経由でアクセスする。 |
| C-19 | agent-integration のフックは `scripts/harness/agent-integration/presentation/` 配下の TypeScript ファイルを `tsx` で直接実行する形式で `.claude/settings.json` に登録する。シェルラッパーは不要。 |
| C-20 | ReentryGuard の状態は環境変数または tmpファイル（`ReentryGuardStatePort` 実装）でのみ管理し、domain 層に状態を持たせない。 |
| C-21 | regression-suite のテストスイートは `scripts/harness/__tests__/regression/` に配置し、通常の Unit テスト（`__tests__/unit/`）や統合テスト（`__tests__/integration/`）と区別する。Vitest の workspace 設定で個別に管理する。 |
| C-22 | harness-api はトップレベルCLIコマンドの唯一のオーナーであり、8コマンド（check-ready / check-phase / ci-check / detect-drift / status / lint / complete-check / impact-analysis）の presentation 層（handler）を所有する。他Unitは harness-api から呼ばれる薄い境界として presentation 層を持つことができるが、トップレベルの package.json スクリプトを持たない。 |

---

## §6 環境検証チェックリスト

### §6.1 前提環境

- [ ] Node.js 20系LTS が利用可能である
- [ ] `pnpm` が利用可能である
- [ ] `corepack enable` 済み、または同等の pnpm 実行環境が整っている
- [ ] プロジェクトルートが `GSDLC_HARNESS` である

### §6.2 依存インストール

- [ ] `.npmrc` に `package-lock=false` が設定されている
- [ ] `package-lock.json` が削除対象として扱われている
- [ ] `pnpm install` が成功する
- [ ] `pnpm-lock.yaml` が生成または更新される
- [ ] `dependencies` に `ajv`, `gray-matter`, `@biomejs/biome` が存在する

### §6.3 ディレクトリ構成

- [ ] `scripts/harness/config-foundation/` が4層で存在する
- [ ] `scripts/harness/harness-error/` が4層で存在する
- [ ] `scripts/harness/phase-dependency-model/` が4層で存在する
- [ ] `scripts/harness/traceability-model/` に `domain/`, `application/`, `infrastructure/` が存在し、`presentation/` が存在しない
- [ ] `scripts/harness/adr-foundation/` が4層で存在する
- [ ] `scripts/harness/biome-ast-engine/` が4層で存在する
- [ ] `scripts/harness/shared-kernel/` に3ファイルが存在する
- [ ] `scripts/harness/__tests__/` に6 Unit分のテストディレクトリと `vitest.config.ts` が存在する
- [ ] `docs/ADR/` が存在する
- [ ] `biome.json` が存在する
- [ ] `scripts/harness/validator-system/` が4層で存在する
- [ ] `scripts/harness/nyquist-validation/` が4層で存在する
- [ ] `scripts/harness/quick-mode/` が4層で存在する
- [ ] `scripts/harness/harness-api/` が4層で存在する
- [ ] `scripts/harness/agent-integration/` が4層で存在する
- [ ] `scripts/harness/skill-quality/` が4層で存在する
- [ ] `scripts/harness/ci-governance/` が4層で存在する
- [ ] `scripts/harness/regression-suite/` に `domain/`, `application/`, `infrastructure/` が存在する
- [ ] `scripts/harness/shared-kernel/` に6ファイルが存在する（harness-error.ts, harness-config.ts, story-id.ts, harness-api.ts, validator-system.ts, quick-mode.ts）
- [ ] `docs/contracts/` に `lesson-artifact.schema.json` と `requirement-test-matrix.schema.json` が存在する
- [ ] `.harness/error-history.json` が存在する（初期値 `{"repetitions":[]}` またはそれ以降の状態）
- [ ] `scripts/harness/__tests__/regression/` に4スイートファイルが存在する

### §6.4 型チェック

- [ ] `pnpm exec tsc --noEmit` が成功する
- [ ] `tsconfig.json` の `include` が `scripts/harness/**/*.ts` を対象としている

### §6.5 Lint/Format

- [ ] `pnpm exec biome check scripts/harness` が成功する
- [ ] `biome.json` の `files.include` が `scripts/harness/**/*.ts` である
- [ ] `biome.json` の ignore 対象に `node_modules`, `dist`, `__tests__/fixtures` が含まれる

### §6.6 テスト

- [ ] `pnpm test` が成功する
- [ ] Unitテスト、統合テスト、fixtureベーステストが `scripts/harness/__tests__/` に集約されている

### §6.7 CLIコマンド

- [ ] `pnpm harness:enable --list` が機能一覧を返す
- [ ] `pnpm harness:disable --list` が機能一覧を返す
- [ ] `pnpm harness:check-phase <unit>` が終了コード規約どおりに動作する
- [ ] `pnpm harness:check-ready --json` が `HarnessApiResponse` 互換の出力を返す
- [ ] `pnpm harness:lint --json` が `HarnessApiResponse` 互換の出力を返す
- [ ] `pnpm adr:list` が `docs/ADR/` の一覧を返す
- [ ] `pnpm adr:validate --all` が違反時に終了コード1を返せる
- [ ] harness-error は単独トップレベルCLIを持たない契約どおり、上位CLI/CIから内部handlerとしてのみ利用される
- [ ] traceability-model は単独CLIを持たない契約どおり、`index.ts` 公開面のみを提供する
- [ ] `pnpm harness:status --json` が `HarnessApiResponse` 互換の出力を返す
- [ ] `pnpm harness:complete-check --json` が `HarnessApiResponse` 互換の出力を返す
- [ ] `pnpm harness:impact-analysis --story <storyId>` が `ImpactAnalysisResult` 互換の出力を返す
- [ ] `pnpm harness:ci-template --list` がCIテンプレート一覧を返す
- [ ] `.claude/settings.json` に agent-integration の3フック（PreToolUse/PostToolUse/Stop）が登録されている

---

## §7 CI/CDパイプライン定義

Wave 1 v1 の CI/CD は Node.js + pnpm 前提で定義する。追加ツールチェーンや別系統ビルド工程は含めない。

```yaml
name: aidlc-gate-v1

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm exec tsc --noEmit

      - name: Biome check
        run: pnpm exec biome check scripts/harness

      - name: Unit and integration tests
        run: pnpm test

      - name: Regression tests
        run: pnpm test:regression
```

CI運用原則:

- lockfile は `pnpm-lock.yaml` を唯一の正とする。
- `biome check` は `scripts/harness` を対象とし、fixture除外は `biome.json` に委譲する。
- `pnpm test` は `scripts/harness/__tests__/vitest.config.ts` を使用する。
- `pnpm test:regression` は `scripts/harness/__tests__/vitest.config.ts` の `regression` プロジェクト設定を使用する。`package.json` の scripts に `"test:regression": "pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts --project regression"` を追加する。

---

## §8 ローカル開発環境セットアップ

### §8.1 初回セットアップ

1. Node.js 20系LTSを導入する。
2. `corepack enable` を実行し、pnpm を利用可能にする。
3. プロジェクトルートで `pnpm install` を実行する。
4. `package-lock.json` を削除対象として扱い、`pnpm-lock.yaml` を生成する。
5. `.npmrc` に `package-lock=false` を設定する。
6. `pnpm exec tsc --noEmit` を実行して型検証する。
7. `pnpm exec biome check scripts/harness` を実行して lint/format 契約を確認する。
8. `pnpm test` を実行してテストを確認する。

### §8.2 日常開発フロー

1. 変更対象Unitの `logical_design.md` と横断契約を確認する。
2. `scripts/harness/{unit-name}/` または `shared-kernel/` の契約境界内で実装する。
3. 必要なCLIを個別実行する。
4. 変更後に `pnpm exec tsc --noEmit` を実行する。
5. 変更後に `pnpm exec biome check scripts/harness` を実行する。
6. 変更後に `pnpm test` を実行する。
7. ADRを伴う変更では `pnpm adr:list` と `pnpm adr:validate --all` を確認する。

### §8.3 日常開発で利用する主要コマンド

```bash
pnpm install
pnpm harness:enable <feature>
pnpm harness:disable <feature>
pnpm harness:check-phase <unit>
pnpm harness:check-ready --json
pnpm harness:lint --json
pnpm harness:complete-check --json
pnpm harness:impact-analysis --story <storyId>
pnpm harness:ci-template --list
pnpm adr:list
pnpm adr:validate --all
pnpm exec tsc --noEmit
pnpm exec biome check scripts/harness
pnpm test
pnpm test:regression
```
