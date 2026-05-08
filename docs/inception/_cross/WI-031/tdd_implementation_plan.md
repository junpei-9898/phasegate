# TDD実装計画: WI-031

@work-item-id WI-031

## 1. スコープ

**対象 WI**: WI-031（CI template の二系統統一 + `phasegate init --with-ci` による自動配置）
**Unit**: `ci-governance`, `harness-api`
**種別**: `story`
**目的**: bundled template と `ci:generate-template --render` の出力差分をなくし、`phasegate init --with-ci` で GitHub Actions workflow を opt-in 配置できるようにする。

### 受け入れ基準

- `ci:generate-template --type aidlc-gate --render` が bundled template と同等の YAML を出力する。
- `ci:generate-template --type consistency-check --render` が GitHub Issue 自動作成 logic を含む bundled template と同等の YAML を出力する。
- `ci:generate-template --type pre-commit --render` が bundled hook と同等の shell template を出力する。
- `phasegate init --with-ci` で `.github/workflows/aidlc-gate.yml` と `.github/workflows/consistency-check.yml` が配置される。
- 既存 workflow / hook がある場合は上書きせず skipped として扱う。
- `phasegate.config.json` 作成時に CI 配置の opt-in 状態をメタ情報として残す。
- README.md / README.ja.md の CLI 説明と CI/CD 説明が実装と一致する。

## 2. 現状確認

### 確認済みのギャップ

- `YamlTemplateRendererAdapter` は TypeScript 文字列結合で YAML を生成しており、`docs/templates/ci/*.yml` と別系統になっている。
- CLI handler は `render` 引数を受け取るが、現状は `RenderCiTemplateUseCase` を呼ばず、summary formatter の出力だけを返している。
- `consistency-check` の生成側 cron は `0 2 * * *`、bundled template は `0 9 * * 1` で一致しない。
- bundled `consistency-check.yml` には GitHub Issue 自動作成があるが、生成側にはない。
- `init` の既知 flag に `--with-ci` がなく、workflow 配置処理も存在しない。
- CI template の実体は現状 `docs/templates/ci/aidlc-gate.yml` と `docs/templates/ci/consistency-check.yml` にある。

### 事前に反映が必要な設計文書

WI-031 は `type: story` かつ `_cross` WI なので、実装前に少なくとも以下へ `@work-item-id WI-031` を追記して、今回の変更方針を product docs に反映する。

- `docs/product/construction/ci-governance/logical_design.md`
- `docs/product/construction/ci-governance/it_test_design.md`
- `docs/product/construction/harness-api/logical_design.md`
- `docs/product/construction/harness-api/it_test_design.md`

必要に応じて、config メタ情報の扱いを `docs/product/construction/config-foundation/logical_design.md` または既存の config 関連 product docs に追記する。ただし実装配置は `initHarnessConfig` を持つ `harness-api` 側の変更として扱う。

## 3. 実装方針

### 方針 A: template の正本をファイルに寄せる

`ci-governance` では `YamlTemplateRendererAdapter` の文字列組み立てをやめ、template ファイルを読み込んで返す。

- YAML workflow: `docs/templates/ci/{aidlc-gate,consistency-check}.yml`
- pre-commit hook: `docs/templates/hooks/pre-commit`
- 出力先:
  - `aidlc-gate` → `.github/workflows/aidlc-gate.yml`
  - `consistency-check` → `.github/workflows/consistency-check.yml`
  - `pre-commit` → `.husky/pre-commit`

変数置換はこの WI では最小限にする。cron や Issue 作成 logic は bundled template を正として固定し、preset による validator list の動的差し替えは既存 summary 出力側に残す。

### 方針 B: `--render` は rendered content を stdout に出す

`GenerateCiTemplateHandler` は `render=true` の場合に `RenderCiTemplateUseCase` を呼び、`content` を返す。

- render 成功: `exitCode=0`, `output=content`
- render 失敗: `exitCode=1`, `output` にエラー内容
- `--json` と `--render` の併用は既存仕様が曖昧なため、今回は JSON 形式で `outputPath`, `content`, `errors` を返すか、help に制約を明記する。実装時に既存 formatter との整合が高い方を採用する。

### 方針 C: `init --with-ci` は setup deployer に寄せる

`harness-api` では `main.ts` の `init` flag と `setup/skill-deployer.ts` の配置関数を拡張する。

- `KNOWN_INIT_FLAGS` に `--with-ci` を追加する。
- `deployCiWorkflows(harnessRoot, projectRoot)` を追加する。
- `.github/workflows/` を作成し、2 workflow をコピーする。
- 既存ファイルは上書きしない。
- `initHarnessConfig` に CI opt-in を渡せるようにし、新規作成時だけ `ci.enabled: true` 相当を保存する。
- 既存 config がある場合は勝手に破壊的更新しない。必要なら console に skipped を出す。

## 4. TDD 実装順序

### Step 0: product docs 反映

- `ci-governance` の logical / integration test design に template 正本、render 仕様、比較テスト方針を追記する。
- `harness-api` の logical / integration test design に `init --with-ci` flag、配置先、上書き禁止、config メタ情報を追記する。

### Step 1: `ci-governance` render 経路

| # | テスト | 期待 |
|---|---|---|
| CG-1 | `YamlTemplateRendererAdapter` が `aidlc-gate` を render する | content が bundled `docs/templates/ci/aidlc-gate.yml` と一致する |
| CG-2 | `YamlTemplateRendererAdapter` が `consistency-check` を render する | content が bundled `docs/templates/ci/consistency-check.yml` と一致し、Issue 作成 logic を含む |
| CG-3 | `YamlTemplateRendererAdapter` が `pre-commit` を render する | content が bundled `docs/templates/hooks/pre-commit` と一致する |
| CG-4 | template ファイルが読めない | errors として扱える形にする、または adapter 例外を handler で安定出力する |

対象候補:

- `scripts/harness/ci-governance/infrastructure/adapters/yaml-template-renderer-adapter.ts`
- `scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts`
- 必要なら adapter 単体テストを `scripts/harness/__tests__/unit/ci-governance/` に追加する。

### Step 2: `ci:generate-template --render`

| # | テスト | 期待 |
|---|---|---|
| CG-5 | handler に `render=true` を渡す | `RenderCiTemplateUseCase.execute()` が呼ばれ、content が output になる |
| CG-6 | handler に `render=false` を渡す | 既存 summary 出力の挙動を維持する |
| CG-7 | CLI E2E で `--render` を指定する | stdout に workflow YAML または hook shell が出る |

対象候補:

- `scripts/harness/ci-governance/presentation/handlers/generate-ci-template-handler.ts`
- `scripts/harness/main.ts`
- `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts`
- `scripts/harness/__tests__/e2e/cli-harness.test.ts`

### Step 3: `init --with-ci`

| # | テスト | 期待 |
|---|---|---|
| HA-1 | `deployCiWorkflows()` を空 project に実行 | 2 workflow が作成される |
| HA-2 | 既存 workflow がある | 上書きされず skipped になる |
| HA-3 | `initHarnessConfig(..., { ciEnabled: true })` | 新規 config に CI opt-in メタ情報が入る |
| HA-4 | CLI flag validation | `init --with-ci` が unknown flag にならない |

対象候補:

- `scripts/harness/setup/skill-deployer.ts`
- `scripts/harness/main.ts`
- `scripts/harness/__tests__/unit/setup/skill-deployer.test.ts`
- `scripts/harness/__tests__/integration/harness-api/init-flag-validation.integration.test.ts`

### Step 4: README / help 更新

- `README.md` / `README.ja.md` の `init` と CI template 説明に `--with-ci` を追加する。
- `ci:generate-template --render` が stdout に rendered content を出すことを明記する。
- cron は bundled template と一致する値を記述する。

## 5. 検証計画

最小検証:

- `pnpm exec vitest scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts`
- `pnpm exec vitest scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts`
- `pnpm exec vitest scripts/harness/__tests__/unit/setup/skill-deployer.test.ts`
- `pnpm exec vitest scripts/harness/__tests__/integration/harness-api/init-flag-validation.integration.test.ts`

CLI 手動検証:

- `pnpm exec tsx scripts/harness/main.ts ci:generate-template --preset standard --type aidlc-gate --render`
- `pnpm exec tsx scripts/harness/main.ts ci:generate-template --preset standard --type consistency-check --render`
- `pnpm exec tsx scripts/harness/main.ts ci:generate-template --preset standard --type pre-commit --render`
- 一時ディレクトリで `pnpm exec tsx scripts/harness/main.ts init --with-ci --yes` 相当を実行し、`.github/workflows/{aidlc-gate,consistency-check}.yml` を確認する。

完了前検証:

- `pnpm harness:check-ready`
- 必要に応じて `pnpm test`

## 6. リスクと判断

- `docs/templates/ci` と npm package 配布時の同梱対象がずれると、render はローカルで動いても package 後に壊れる。`package.json` の `files` 設定を確認し、必要なら template を同梱対象へ追加する。
- `description.md` の旧記述では bundled path が `scripts/harness/templates/.github/workflows/` になっているが、現状の実体は `docs/templates/ci/`。実装は現状の実体を正とし、README もそれに合わせる。
- `--json --render` の仕様が曖昧。互換性を優先し、通常 render は raw content、JSON 指定時のみ structured output にするのが扱いやすい。
- config 既存時の自動更新は破壊的になり得るため、本 WI では新規 config のみ CI opt-in メタ情報を書き込む。
