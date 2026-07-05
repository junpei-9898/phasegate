# TDD実装計画: WI-094 (warning-severity validator 集計セマンティクス変更)

> **作成日**: 2026-05-08
> **WI**: WI-094 (cross-Unit, validator-system + config-foundation)
> **駆動 ADR**: ADR-017 (warning-severity validator の集計セマンティクス)

## 1. スコープ

### 対象ストーリー / 受け入れ基準
- WI-094 description.md「受け入れ基準」§全件
- ADR-017 Migration §1-4 (Phase 0 ADR は `docs/ADR/017-warning-severity-aggregation.md` に起票済み)

### 影響する層 (Clean Architecture)

| Unit | Layer | ファイル |
|------|-------|---------|
| validator-system | application | `aggregate-validation-results-usecase.ts` |
| validator-system | presentation | `human-validation-result-formatter.ts` / `agent-validation-result-formatter.ts` / `ci-validation-result-formatter.ts` |
| validator-system | composition | `index.ts` (createValidatorSystemModule)、`run-validators-handler.ts` |
| config-foundation | domain | `harness-config.ts` (HarnessConfigResolvedDocument 拡張)、新 VO `value-objects/validate-config.ts` |
| config-foundation | application | `validator-system-config-mapper.ts`、loader / defaults |
| presentation (root) | — | `main.ts:997-1008` (CLI flag と config 値の優先順位) |

### 多 Unit 影響について
本 WI は **validator-system + config-foundation の cross-Unit 改修**。story-implementor 規約上は単一 Unit が原則だが、ADR-017 で「config single source の精神に従い CLI flag のみだった項目を config まで持ち上げる」決定をしているため、両 Unit を一体で改修する必要がある。WI-085/WI-091/WI-092 と同種 (config-foundation → validator-system DI threading) の cross-Unit 改修パターンを踏襲する。

## 2. 前提条件検証

- `implementation-readiness-checker` 実行: 2026-05-08 (本セッション内)
- 判定結果: ✅ 実装準備完了 (validator-system / config-foundation 両 Unit で必須ファイル揃い)
- ADR-017 起票・承認: ✅ (本セッション内、Status: Accepted)

## 3. TDD実装順序

### Step 1: 集計ロジック改修 (validator-system / application)

**RED**:
- `__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts` に 4 ケース追加:
  1. `failOnWarning=false` + warning-only fail → `overallPassed=true` / `failedValidators=0` / `passedValidators=1`
  2. `failOnWarning=false` + error-severity fail → `overallPassed=false` / `failedValidators=1`
  3. `failOnWarning=false` + mixed (warning + error) fail → `overallPassed=false` / `failedValidators=1`
  4. `failOnWarning=true` + warning-only fail → `overallPassed=false` / `failedValidators=1`
- 既存テストで「warning-only fail を fail としてカウント」していたケースがあれば、ADR-017 新挙動に合わせて期待値を更新

**GREEN**:
- `aggregate-validation-results-usecase.ts:35-42` の `hasFail` 計算式を修正:
  ```ts
  const hasNonWarningError = result.errors.some((e) => e.severity !== 'warning');
  const hasWarnings = result.errors.some((e) => e.severity === 'warning');
  const isEmptyFail = !result.passed && result.errors.length === 0;
  const hasFail = !result.passed && (isEmptyFail || hasNonWarningError || (failOnWarning && hasWarnings));
  ```

**REFACTOR**:
- 命名整理 (必要に応じて変数を抽出)

### Step 2: ValidateConfig VO 追加 (config-foundation / domain)

**RED**:
- `__tests__/unit/config-foundation/value-objects/validate-config.test.ts` 新規作成:
  - `create({ failOnWarning: false })` で生成可能
  - `create({})` でデフォルト `failOnWarning=false`
  - 型不正 (`failOnWarning: 'true'`) で `ConfigValidationError`

**GREEN**:
- `scripts/harness/config-foundation/domain/value-objects/validate-config.ts` を `PathsConfig` パターンで新規作成
- `@unit config-foundation` / `@layer domain` メタデータ付与

### Step 3: HarnessConfig 拡張 (config-foundation / domain)

**RED**:
- 既存テスト (`harness-config.test.ts` / `harness-config-loader.test.ts` 等) に `validate.failOnWarning` の defaults / source/resolved 双方向の往復テストを追加

**GREEN**:
- `HarnessConfigSourceDocument` / `HarnessConfigResolvedDocument` に `validate: { failOnWarning: boolean }` を追加
- `HarnessConfig.reconstitute` / `pullDomainEvents` に `ValidateConfig` を組み込む
- defaults loader (`scripts/harness/config-foundation/infrastructure/...`) に `validate.failOnWarning: false` を追加
- Source → Resolved の merge ロジックで `validate` セクションを処理

### Step 4: マッパー拡張 (config-foundation / application)

**RED**:
- `__tests__/unit/config-foundation/validator-system-config-mapper.test.ts` に「`validate.failOnWarning` が validator-system config に伝搬する」テスト

**GREEN**:
- `validator-system-config-mapper.ts` の `toValidatorSystemConfig` で `validate.failOnWarning` を返り値に含める:
  ```ts
  return {
    project: { preset: resolvedConfig.project.preset },
    layers: { ... },
    validate: { failOnWarning: resolvedConfig.validate.failOnWarning },
  };
  ```

### Step 5: validator-system 受け取り側 (validator-system / composition + presentation)

**RED**:
- `__tests__/integration/validator-system/handlers/run-validators-handler.test.ts` に「config の `validate.failOnWarning=true` で warning-only fail が exit 1 になる」テスト
- `__tests__/integration/validator-system/handlers/run-validators-handler.test.ts` に「CLI flag が config 値を override する (CLI > config)」テスト

**GREEN**:
- `createValidatorSystemModule` の引数 (resolvedConfig) から `validate?.failOnWarning` を読み取り、`RunValidatorsHandler` または `RunFullValidationUseCase` のデフォルト値として注入
- `run-validators-handler.ts` の `execute` シグネチャ:
  - `failOnWarning` パラメータが指定された場合 (`!== undefined`) はそれを使用、それ以外は config 値
- `main.ts:997` で `hasFlag(args, "--fail-on-warning")` のみだと「flag 未指定」と「flag 指定で false」を区別できないため、`--fail-on-warning` / `--no-fail-on-warning` の双方を検知する形に拡張するか、handler 側のデフォルトを config 値にして CLI flag は明示的指定時のみ override

**REFACTOR**:
- CLI flag 解釈の整理 (e.g. `parseTriStateFlag(args, "--fail-on-warning", "--no-fail-on-warning")` ヘルパ)

### Step 6: Formatter 改修 (validator-system / presentation)

**RED**:
- `__tests__/unit/validator-system/formatters/human-validation-result-formatter.test.ts` (なければ新規) に「warning-only fail を `[WARN]` 表示」「error-severity fail を `[FAIL]` 表示」「mixed fail を `[FAIL]` 表示」テストを追加

**GREEN**:
- `human-validation-result-formatter.ts` で result 単位のラベルを severity ベースに分岐:
  ```ts
  const label = result.skipped
    ? '[SKIP]'
    : result.passed
      ? '[PASS]'
      : result.errors.some(e => e.severity !== 'warning')
        ? '[FAIL]'
        : '[WARN]';
  ```
- `agent-validation-result-formatter.ts` / `ci-validation-result-formatter.ts` で JSON 出力に既存 `severity` field 互換のまま `label` (or `state`) フィールドを追加。既存利用者の解析を壊さないため、新フィールドの追加に留める

### Step 7: 検証
- `pnpm test` 全 green
- `npx phasegate lint` (L1) で `@unit` / `@layer` メタデータ違反なし
- `npx phasegate validate --layer L2` PASS

## 4. 環境検証チェックリスト (事前実行結果)

- [x] Node.js v22.x: 既存 environment_contract.md 準拠
- [x] pnpm 10.30.1: 既存
- [x] `pnpm install` 完了 (現セッション開始時点で `git status` clean のため依存関係も整合済みと判断)
- [x] baseline `pnpm test --run` 実行中 (Phase 1 段階で起動済み、Phase 2 着手前に green を確認)
- [x] git status clean (current branch: main, 1e5e9f6)

## 5. QA (不明点・確認事項)

### [Question] Q1: CLI flag `--no-fail-on-warning` の追加について

`main.ts:997` の現状コード:
```ts
const failOnWarning = hasFlag(args, "--fail-on-warning");
```

これは「flag が指定されたら true、未指定なら false」となっており、config 値との優先順位を表現できない (flag 未指定と「明示的に false」が区別できない)。

**選択肢:**
- (A) `--no-fail-on-warning` を追加し、tri-state (`--fail-on-warning` → true、`--no-fail-on-warning` → false、未指定 → config 値) にする
- (B) CLI flag 指定時は常に `true`、解除は config 経由のみ (現状互換、ただし「config で true でも CLI で false に上書きしたい」ケース不可)
- (C) `--fail-on-warning=true|false` 形式の値付き flag に拡張 (CLI 既存解釈との整合に手間)

**推奨案**: (A) tri-state 化。実装コストは低 (helper を 1 つ追加)、user の自由度が高く、CLI > config の優先順位を素直に表現できる。

[Answer] (A) を採用

### [Question] Q2: agent / ci formatter での `[WARN]` 露出の度合い

`human-validation-result-formatter` は label を `[WARN]` に切り替えるが、`agent` / `ci` formatter (機械可読) の JSON は既に各 error に `severity` field を持っているため、ラベルとしての WARN 露出は冗長になる可能性がある。

**選択肢:**
- (A) human のみ `[WARN]` 表示、agent/ci は無変更 (既存 JSON 互換性最優先)
- (B) agent/ci にも result-level の `state: "warned"` 等を追加 (新フィールド)

**推奨案**: (A)。既存 JSON 解析スクリプトを壊さないため、ラベル変更は human に限定。`severity` field は既に各 error に存在するため、result-level state は派生的に算出可能で冗長

[Answer] (A) を採用

### [Question] Q3: `coverageThreshold` のような既存 layer config 内に `failOnWarning` を入れる選択

ADR-017 では `validate: { failOnWarning: boolean }` を新セクションとして追加するが、既存の `layers.L2 / L3 / L4` 内に layer ごとの `failOnWarning` を持たせる選択肢もある (layer-by-layer で warning policy を変える user ニーズが将来出る可能性)。

**選択肢:**
- (A) `validate.failOnWarning: boolean` (グローバル、ADR-017 案)
- (B) `layers.L4.failOnWarning: boolean` (layer 別)、global は別途
- (C) 両方サポート (global default + layer override)

**推奨案**: (A)。WI-094 の現行ニーズはグローバル制御で足りる。layer-by-layer 化は YAGNI。将来必要なら別 ADR で拡張可能 (互換的に追加できる)

[Answer] (A) を採用

## 6. 前提条件・リスク

- **既存 user CI への BREAKING**: warning-only fail を error 同等扱いしていた user は exit 0 に変わる。CHANGELOG で migration ガイド明記が mandatory (Phase 4)
- **`failedValidators` 集計値の semantic 変更**: warning-only fail は `failedValidators` にカウントされなくなる。出力の数値を解析している scripts に影響可能性 — 出力を解析する代表的経路 (agent / ci formatter) は `errors[].severity` で同じ情報を取れるため実害は限定的
- **`overallPassed` の定義変更**: 同上。AggregatedValidationReport を消費する後続コード (story-reflection / cascade-update / generate-ci-template 等) で `overallPassed` を「全 fail がない」と解釈している箇所がないか grep で確認
- **テスト工数**: 既存テストで warning-only fail を fail として assert している箇所の更新が必要。`__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts` を中心に grep で全件特定する

## 7. 教訓フィードバック (memory 適用)

- `feedback_dogfood_before_release.md`: publish 前に「warning-only / error-only / mixed / failOnWarning=true / 未設定」の 5 ケースで `validate` 実行して exit code を目視確認する
- `feedback_verify_existing_before_extending.md`: `failOnWarning` パラメータは既に存在したが死んでいた (集計ロジックのバグで効かなかった)。code grep で実装の有無だけでなく「効いているか」まで確認する習慣を継続

---

**Phase 1 完了条件**:
- [x] 計画ファイルを `docs/inception/_cross/WI-094/tdd_implementation_plan.md` に出力
- [x] 環境検証チェックリストを記載
- [x] QA セクションに不明点 + 推奨案を提示
- [ ] **人間による承認** (本ドキュメント承認後に Phase 2 着手)
