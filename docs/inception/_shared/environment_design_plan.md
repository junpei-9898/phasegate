# 環境設計計画（Wave 1 v1）

> **作成日**: 2026-03-13
> **対象Wave**: Wave 1（基盤構築）v1
> **対象Unit**: config-foundation, harness-error, phase-dependency-model, traceability-model, adr-foundation, biome-ast-engine

## 1. スコープ

対象6ユニットの環境要件を横断的に整理し、Phase 2で作成する環境契約の前提を固定する。

### 1.1 対象コンポーネント一覧

各Unitの論理設計から抽出した環境関連コンポーネント。

| Unit | 配置先 | 外部依存 | CLI/Presentation |
|------|--------|---------|-----------------|
| config-foundation | `scripts/harness/config-foundation/` | `ajv` | `harness:enable`, `harness:disable`、互換入口 `scripts/harness/cli/enable.ts` / `disable.ts` |
| harness-error | `scripts/harness/harness-error/` | `typescript`（TypeScript Compiler API） | トップレベルCLI所有なし。内部Presentation 4種（render / validate-fix-example / list-error-definitions / assert-severity-contract） |
| phase-dependency-model | `scripts/harness/phase-dependency-model/` | なし | `harness:check-phase`, `harness:check-ready`, `scripts/harness/validators/phase-gate.ts` 向けPresentation |
| traceability-model | `scripts/harness/traceability-model/` | なし | 単独Presentationなし。`index.ts` の公開面のみ |
| adr-foundation | `scripts/harness/adr-foundation/` | `gray-matter` | 内部運用CLI 7種（`adr-create-template`, `adr-seed-initial`, `adr-list`, `adr-show`, `adr-search-archgate`, `adr-validate`, `adr-change-status`） |
| biome-ast-engine | `scripts/harness/biome-ast-engine/` | `@biomejs/biome`, `typescript`（TypeScript Compiler API） | `harness:lint` |

## 2. 技術スタック確認

| レイヤー | 技術 | バージョン | 確認状況 |
|---------|------|-----------|---------|
| ランタイム | Node.js | 20+ LTS（計画値） | 要確認 |
| 言語 | TypeScript | `^5.0.0` | 既存 |
| テスト | Vitest | `^3.0.0` | 既存 |
| ビルド/実行 | tsx | `^4.0.0` | 既存 |
| 構文解析 | TypeScript Compiler API | `typescript` 同梱 | 既存利用 |
| スキーマ検証 | ajv | `^10.0.0`（候補） | 新規追加予定 |
| Frontmatter解析 | gray-matter | `^4.0.3`（候補） | 新規追加予定 |
| Lint/Format | `@biomejs/biome` | `^1.5.0`（推奨、Q2） | 新規追加予定 |
| パッケージマネージャ | pnpm | 8+ | 移行要判断（Q1） |

**現状差分**:
- `package.json` はまだ `eslint`, `@typescript-eslint/*` を保持しており、Wave 1 v1の論理設計と乖離している
- `package-lock.json` は存在するが、`pnpm-lock.yaml` は未作成
- `tsconfig.json` の `include: ["scripts/harness/**/*.ts"]` はv1の配置方針と整合している
- `harness.config.json` は `version: "1.0"` のテンプレートであり、`HarnessConfigV2` 構造へは未移行

## 3. 設計セクション方針

### 3.1 マイグレーション台帳

- archive版からv1のUnit構成へ合わせ、環境契約の対象を6 Unitへ更新する
- `scripts/harness/eslint-rules/` と `package.json` のESLint依存を、biome-ast-engine中心の構成へ段階移行する
- `harness.config.json` の現行テンプレートを `HarnessConfigV2` の構造契約へ移行する
- `package-lock.json` ベース運用から `pnpm-lock.yaml` ベース運用へ切り替えるかを明示する
- 互換入口として残すファイルと、v1で新設するディレクトリを区別して記録する

### 3.2 サービス構成マニフェスト

- 6 Unitごとに配置先、公開入口、外部依存、設定ファイル、Presentation境界を一覧化する
- Shared Kernelは `HarnessError`, `HarnessConfigV2`, `StoryId` の3型と、それぞれの再公開ファイルだけを記載する
- `scripts/harness/shared-kernel/harness-error.ts`
- `scripts/harness/shared-kernel/harness-config.ts`
- `scripts/harness/shared-kernel/story-id.ts`
- テスト配置は `scripts/harness/__tests__/{unit-name}/` を正とし、既存 `eslint-rules` テストは移行対象として扱う
- 既存互換入口として `scripts/harness/core/config-loader.ts`, `scripts/harness/core/error-reporter.ts`, `scripts/harness/core/metadata-parser.ts`, `scripts/harness/validators/metadata.ts` の扱いを明記する

### 3.3 認証・認可

- ローカル開発ツールキットであるため、認証・認可機構は追加しない
- 設定・ADR・メタデータの入出力は各Unitのinfrastructure境界経由に限定する
- CLI実行の終了コード規約は統合契約に合わせて `0 / 1 / 2` を採用する

### 3.4 シードデータ

- ADR初期11件（adr-foundation）
- Preset定義3種（config-foundation: `minimal` / `standard` / `strict`）
- ErrorDefinition Registry（harness-error: L0-L4定義）
- フェーズ既定ノード/依存定義（phase-dependency-model: `domain/definitions/` の静的定義）

### 3.5 フレームワーク・ランタイム制約集

- 依存方向は `domain ← application ← infrastructure`, `domain ← application ← presentation`
- Shared Kernelは3型のみ。各Unitは内部実装を直接importしない
- `@layer` に許容される値は `domain` / `application` / `infrastructure` / `presentation`
- Story IDは `HXX-XX`、ErrorCodeは `L{n}-{nnn}` を正規形式とする
- `phaseDependencies` と `planningMode` は config-foundationが構造を保持し、phase-dependency-modelが意味論を所有する
- biome-ast-engineのルール判定と harness-error / biome-ast-engine の TypeScript Compiler API 利用は infrastructure に閉じ込める
- ファイル命名は kebab-case、テストケース名は日本語、AAAパターン、ドメイン実体のモック禁止を適用する

### 3.6 環境検証チェックリスト

- 依存関係インストール検証
- `scripts/harness/{unit-name}` 新設ディレクトリ構成検証
- Shared Kernel公開面の存在検証
- `tsc --noEmit` による型チェック
- `@biomejs/biome` のlint/format実行検証
- `pnpm harness:lint` / `harness:check-phase` / `harness:check-ready` の動作検証
- `pnpm test` によるUnit別テスト実行検証
- `harness:enable` / `harness:disable` / ADR内部運用CLI群の起動検証

## 4. QA（不明点・確認事項）

### [Question] Q1: パッケージマネージャ移行タイミング

統合契約では pnpm が正とされている一方で、現在のワークスペースには `package-lock.json` が存在し、`pnpm-lock.yaml` は未作成である。さらに biome-ast-engine の論理設計は legacy 依存残存検査で `pnpm-lock.yaml` を参照する。

**推奨案:** Wave 1 v1の環境契約で pnpm を正式採用し、Phase 2 の初手で `pnpm-lock.yaml` を生成する。理由は、統合契約との整合性が取れ、biome-ast-engine の残存検査条件も満たせるため。

[Answer]
推奨案を採用する。pnpmを正式採用し、Phase 2初手でpnpm-lock.yamlを生成する。

### [Question] Q2: `@biomejs/biome` のバージョン固定方針

biome-ast-engine の論理設計は Biome CLI の標準診断収集を前提としている。archive版の厳密固定理由はv1の論理設計には存在しないため、exact固定を継続するか、セマンティックレンジへ緩和するかを決める必要がある。

**推奨案:** `^1.5.0` のセマンティックレンジを採用する。理由は、v1で必要なのはCLI JSON契約の安定吸収であり、バージョン互換性は infrastructure 側の adapter で扱うべきため。

[Answer]
推奨案を採用する。`^1.5.0`のセマンティックレンジとする。

### [Question] Q3: `typescript` の依存区分

harness-error と biome-ast-engine はどちらも TypeScript Compiler API を利用する。現在 `typescript` は `devDependencies` にあるが、CLI/CI実行時の依存として扱うため、`dependencies` へ移すべきかを決める必要がある。

**推奨案:** `typescript` は `devDependencies` のまま維持する。理由は、本リポジトリがローカル実行前提のツールキットであり、公開ライブラリとして配布しないため、開発・CI環境に同梱されていれば十分だから。

[Answer]
推奨案を採用する。typescriptはdevDependenciesのまま維持する。

### [Question] Q4: ESLint関連パッケージと旧ディレクトリの削除タイミング

現在の `package.json` には `eslint`, `@typescript-eslint/*` が残存し、`scripts/harness/eslint-rules/` も存在する。一方、biome-ast-engine は `VerifyEslintRemoval` を持ち、legacy残存を検査する前提で設計されている。

**推奨案:** 環境契約では「削除予定」を宣言し、実削除のトリガーは `harness:lint` と移行後テストのパリティ確認完了時点とする。理由は、先に削除すると比較基準を失い、後に削除すれば回帰確認を維持できるため。

[Answer]
推奨案を採用する。「削除予定」を宣言し、実削除はパリティ確認完了後とする。

### [Question] Q5: archive版のbiome拡張ビルド前提をv1環境契約から完全に外すか

archive版の環境契約には、v1の論理設計に存在しない biome 拡張ビルド前提と追加成果物が含まれている。v1のbiome-ast-engine論理設計は Biome CLI と TypeScript Compiler API のみを前提にしているため、旧前提を環境契約へ持ち込まない判断が必要である。

**推奨案:** v1環境契約では旧前提を完全に採用しない。biome-ast-engine は `@biomejs/biome` と TypeScript Compiler API だけで構成し、環境検証もその前提で定義する。

[Answer]
推奨案を採用する。v1環境契約からRust/WASM/Cargo関連を完全に除去する。

## 5. 前提条件・リスク

### 前提条件

- 6 Unitすべての `logical_design.md` が存在していること
- 6 Unitすべての `domain_model.md` が存在していること
- `cross_cutting_decisions.md` と `integration_contract.md` がWave 1 v1の正規契約として扱えること
- `docs/ADR/` は adr-foundation の出力先として利用可能であること

### リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| pnpm移行前に `VerifyEslintRemoval` を有効化すると lockfile 前提が満たせない | 高 | Q1回答を先に確定し、lockfile方針を環境契約で固定する |
| 旧ESLint構成が残ったまま新ディレクトリを導入すると、同一責務が二重化する | 高 | マイグレーション台帳に「残置」と「削除予定」を分けて記録する |
| Biome CLIのJSON出力差分が将来発生すると診断吸収部が壊れる | 中 | biome-ast-engine の infrastructure adapter にパース責務を閉じ込める |
| TypeScript Compiler API 利用箇所が複数Unitに分散し、実行時間と障害点が増える | 中 | harness-error / biome-ast-engine の fixture テストを独立させ、Application層から直接呼ばせない |
| `harness.config.json` が v1テンプレートのままだと `HarnessConfigV2` を前提とするUnit統合が進められない | 中 | config-foundation の構造契約と移行手順をPhase 2の先頭で固定する |
