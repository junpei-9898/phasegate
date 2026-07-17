---
adr_id: "017"
title: "warning-severity validator の集計セマンティクス"
status: Accepted
date: 2026-05-08
---

# warning-severity validator の集計セマンティクス

## Context

`phasegate validate` の集計ロジック (`aggregate-validation-results-usecase.ts:67`) は `overallPassed = failedValidators === 0` で総合判定するが、この判定は **error severity を考慮していない**。

その結果、`error catalog` 上で `defaultSeverity: warning` と宣言されている validator (L4-001 / L4-002 / L4-003) が fail を報告すると、warning-only にもかかわらず:

- 個別 validator: `[FAIL] L4-001`
- 総合判定: `FAIL ✗`
- exit code: 非ゼロ (1)

となる。GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4) (reporter: nakataj-mti, 2026-05-08) で報告され、reporter は plan-level workaround (「validate FAIL を許容、L4-001 false positive と plan に明記」) で凌いでいる。WI-091 finding #2 → WI-094 として起票。

### バグの実体（grep ベース、2026-05-08）

#### 1. 集計ロジックが severity を見ていない

`scripts/harness/validator-system/application/use-cases/aggregate-validation-results-usecase.ts:35-42`:

```ts
const hasWarnings = result.errors.some((e) => e.severity === 'warning');
const hasFail = !result.passed || (failOnWarning && hasWarnings);

if (hasFail) {
  failedValidators++;
} else {
  passedValidators++;
}
```

`failOnWarning` パラメータは存在するが、`!result.passed` を OR 第一項に置いているため、**warning-only validator が `ValidationResult.fail([warningError])` を返した瞬間に `failOnWarning` の値に関係なく `failedValidators++` が確定する**。`failOnWarning` 経路は実質デッドコード。

#### 2. exit code が overallPassed に直結

`scripts/harness/validator-system/presentation/handlers/report-validation-results-handler.ts:62`:

```ts
const exitCode = report.overallPassed ? 0 : 1;
```

`overallPassed` が severity を見ない以上、warning-only fail は必ず exit 1。

#### 3. `--fail-on-warning` CLI flag は通っているが効かない

`scripts/harness/main.ts:997`:

```ts
const failOnWarning = hasFlag(args, "--fail-on-warning");
```

CLI からは flag が `RunFullValidationInput.failOnWarning` まで伝搬しているが、(1) のバグにより default 挙動 (warning も fail) と `--fail-on-warning` 指定時の挙動が同一になっている。

#### 4. config からは設定不可

`phasegate.config.json` には `validate.failOnWarning` 相当のキーが存在しない。CLI flag のみ。CI スクリプトを書く側で都度 `--fail-on-warning` を付け外しする必要があり、config single source (ADR-007) の精神に反する。

### 検討した代替案

#### (A) warning-only fail は overall PASS / exit 0 を default にする（**採用**）

集計ロジックを修正し、validator が warning-only fail を返した場合は `failedValidators` にカウントしない。`failOnWarning: true` で従来挙動 (warning も fail) に opt-in。`validate.failOnWarning: boolean` を config schema に追加して持続的設定を可能にする。

#### (B) warning も exit 1 を default に保つ (CI 互換性優先)

既存挙動を維持し、`failOnWarning: false` で warning-only fail を許容できるようにする。default を変えないため移行コストはゼロだが、`defaultSeverity: warning` の宣言と「常に fail として扱う」実装の semantic 乖離は残る。

## Decision

**(A) を採用する。**

### 採用理由

1. **error catalog の宣言と実装を整合させる** — `defaultSeverity: warning` は「警告であって致命ではない」という宣言。実装側が常に fail として扱うのは catalog 宣言と矛盾しており、catalog を信頼できない状態を放置することは品質防御ツールとして自己矛盾
2. **L4 validator の位置付けと整合** — ADR-001 (4層防御モデル) で L4 は advisory/observability layer として位置付けられており、drift / dead-code / freshness は「気付きを与える」ことが目的。これらが CI を止めるのは過剰
3. **`failOnWarning: true` で旧挙動に opt-in 可能** — 厳格な CI を維持したい user は config flag または CLI flag で従来通りの挙動を選べる
4. **config single source (ADR-007) の精神** — CLI flag のみで設定可能だった項目を config に持ち上げることで、CI スクリプトと config の再現可能性を担保
5. **既存内部パラメータ名 `failOnWarning` と整合** — `AggregateResultsInput.failOnWarning` / `RunFullValidationInput.failOnWarning` / `ci-governance.PresetConfigAdapter.failOnWarning` が既に同名で通っている。schema 名と内部命名を揃えることで threading が単純

### 集計セマンティクス（修正後）

```ts
const hasNonWarningError = result.errors.some((e) => e.severity !== 'warning');
const hasWarnings = result.errors.some((e) => e.severity === 'warning');

// passed=false かつ errors=[] の防御的ケースは fail としてカウント（severity 判定不能のため安全側に倒す）
const isEmptyFail = !result.passed && result.errors.length === 0;

const hasFail =
  !result.passed &&
  (isEmptyFail || hasNonWarningError || (failOnWarning && hasWarnings));
```

| 状態 | `failOnWarning=false` (default) | `failOnWarning=true` |
|------|---------------------------------|----------------------|
| `passed=true` (errors=[]) | PASS | PASS |
| `passed=false` + error-severity 含む | FAIL | FAIL |
| `passed=false` + warning-only | **PASS (新挙動)** | FAIL (従来挙動) |
| `passed=false` + errors=[] | FAIL (防御) | FAIL (防御) |

### Config schema 拡張

`phasegate.config.json` に `validate` セクションを新設:

```json
{
  "validate": {
    "failOnWarning": false
  }
}
```

- 型: `boolean`、default: `false`
- 旧挙動を維持したい user は `true` に設定
- CLI flag `--fail-on-warning` は config 値を override する（CLI > config の優先順位）

### Formatter での severity 表示

human/agent/ci formatter で `[FAIL]` と `[WARN]` を分離:

- `result.passed === false` かつ errors が **error severity を含む** → `[FAIL]`
- `result.passed === false` かつ errors が **warning-only** → `[WARN]`
- `result.passed === true` → `[PASS]`
- `result.skipped === true` → `[SKIP]`

これにより output から severity が一目で読める。CI 解析スクリプトの後方互換のため、`agent` / `ci` フォーマットでは `severity` フィールドが既に JSON に含まれている (現状)。`[WARN]` 表示は human フォーマットを主対象とする。

### 後方互換戦略

- **default 挙動の変更**: warning-only fail で exit 0 / overall PASS — これは BREAKING CHANGE
- **opt-in 経路**: `validate.failOnWarning: true` を config に追加するか、`--fail-on-warning` CLI flag で旧挙動を選べる
- **CHANGELOG**: `BREAKING` 認定で記載。ただし phasegate は `0.x` リリースのため、CLAUDE.md のバージョニングルールに従い minor bump (`0.130.0` → `0.131.0`) で出す（SemVer 上の major bump は phasegate `1.0.0` 到達時にまとめて宣言）
- **migration ガイド**: 「CI で warning も止めたかった user は `validate.failOnWarning: true` を設定する」を CHANGELOG / configuration.md に明記

## Consequences

### ポジティブ

- error catalog の `defaultSeverity` 宣言と実装挙動が一致し、catalog を信頼できる状態に戻る
- L4 advisory validator が CI を止めなくなり、drift / dead-code / freshness が日常的に観測しやすい運用形態になる
- `validate.failOnWarning` で CI 厳格度を config 経由で持続的に設定可能になり、CI スクリプト側の `--fail-on-warning` 散逸が解消
- formatter の `[WARN]` 表示で fail の severity が UX 上明確になる
- WI-091 reporter の plan-level workaround（false positive 注釈）が不要になる

### ネガティブ / トレードオフ

- **既存 user CI への BREAKING**: warning-only fail を error 同等に扱っていた user の CI が「PASS / exit 0」に変わる。silent regression 化のリスク
  - **緩和策**: CHANGELOG で BREAKING 認定 + migration ガイド明記。`validate.failOnWarning: true` で旧挙動に opt-in
- **回帰テスト負荷**: warning-only / error-only / mixed の 3 ケースを `aggregate-validation-results-usecase` の IT で網羅する必要
  - **緩和策**: 既存テストヘルパで 3 ケースは小コストで追加可能
- **config schema v3 拡張**: 新セクション `validate` の追加。schema migration は不要だが、config-foundation の defaults / mapper を更新
  - **緩和策**: `validate.failOnWarning` のみの新規追加。既存 schema を変えないため migration 不要

### スコープ外（本 ADR で扱わない）

- error severity 自体のカタログ変更 (L4-XXX を warning から error に変える等) — 別 WI
- `defense preset` (`project.preset: minimal/standard/strict`) ごとの `failOnWarning` default 切り替え — 現状全 preset で `false` default。preset ごとに切り替える必要が出たら別 ADR
- WI-091 finding #4 (paths threading / WI-093) / #5 (pointers / WI-095) — 別 WI
- exit code を `0` / `1` 以外 (`2` 等) に拡張 — 本 ADR は warning と error の二値判定のみ

## Migration

1. **集計ロジック改修** (`aggregate-validation-results-usecase.ts:35-42`):
   - `hasFail` 計算式を「Decision 集計セマンティクス」通りに変更
   - 既存テスト (`__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts`) を新挙動に合わせて更新
2. **回帰テスト追加**:
   - warning-only fail で `overallPassed=true` / exit 0 になること
   - error-severity fail で `overallPassed=false` / exit 1 になること
   - mixed (warning + error) で `overallPassed=false` / exit 1 になること
   - `failOnWarning=true` 時に warning-only でも `overallPassed=false` になること
3. **config schema 拡張**:
   - `HarnessConfigResolvedDocument` に `validate: { failOnWarning: boolean }` を追加
   - `config-foundation` の defaults / loader / mapper で新キーをハンドル
   - `toValidatorSystemConfig` で `validate.failOnWarning` を validator-system module に伝搬
   - `createValidatorSystemModule` 経由で `RunValidatorsHandler` に渡す
4. **formatter 改修**:
   - `human-validation-result-formatter.ts` で warning-only fail を `[WARN]` 表示
   - `agent-validation-result-formatter.ts` / `ci-validation-result-formatter.ts` も整合 (既存 `severity` field との重複を整理)
5. **ドキュメント**:
   - `docs/guide/layer-model.md` に severity policy セクション追加
   - `docs/guide/configuration.md` に `validate.failOnWarning` 説明と migration ガイド
6. **CHANGELOG**: BREAKING CHANGE として記載 (GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4) 参照付き)
7. **dogfood**: drift 検出を意図的に発生させて exit code が `validate.failOnWarning` に従って切り替わることを確認

詳細な実装は WI-094 で進める。

## 関連

- **WI-094** — 本 ADR を駆動する Work Item。GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4) finding #2 に対応
- **WI-091** — WI-094 の親 Work Item。dogfood で finding #2 を検出
- **`scripts/harness/validator-system/application/use-cases/aggregate-validation-results-usecase.ts:35-42`** — 集計ロジックの修正対象
- **`scripts/harness/validator-system/presentation/handlers/report-validation-results-handler.ts:62`** — exit code 算出箇所
- **`scripts/harness/validator-system/domain/value-objects/error-catalog.ts`** — `defaultSeverity` 宣言の一次情報
- **`scripts/harness/main.ts:997-1008`** — CLI flag → handler への threading
- **`scripts/harness/config-foundation/domain/harness-config.ts`** — `HarnessConfigResolvedDocument` 拡張対象
- **`scripts/harness/config-foundation/application/mappers/validator-system-config-mapper.ts`** — `toValidatorSystemConfig` 拡張対象
- **ADR-007** — harness-config Single Source of Truth。本 ADR は `failOnWarning` を CLI flag のみから config まで持ち上げて ADR-007 の精神を強化
- **ADR-001** — 4 層防御モデル。L4 validator の advisory 位置付けが本決定の根拠

## Alternatives

本 ADR は既存本文の「検討した代替案」に代替案を記録済みである（正規化時に canonical `## Alternatives` として再掲）:

1. **(A) warning-only fail は overall PASS / exit 0 を default にする（採用）** — 集計ロジックを修正し warning-only fail を fail にカウントせず、`failOnWarning: true` で旧挙動へ opt-in。
2. **(B) warning も exit 1 を default に保つ（CI 互換性優先）** — default を変えず移行コストはゼロだが、`defaultSeverity: warning` 宣言と「常に fail」実装の semantic 乖離が残るため不採用。

採用理由の詳細は上記 Decision「採用理由」を参照。

## 追記 (WI-332, 2026-07-18): 実効判定の共有実装と全経路の経由

本 ADR の Decision（集計セマンティクス）自体は変更しない。実装配置に関する追記のみ。

github#38（`complete-check` だけが独自集約を持ち warning-only failure で exit 1 になった回帰。
WI-318 で修正）の恒久化として、WI-332 で「実効 severity 判定」を単一の共有実装に集約した:

- **共有実装（単一ソース）**: `scripts/harness/validator-system/domain/services/effective-severity-policy.ts` の `isEffectivelyPassed()`。本 ADR Decision の集計セマンティクス（skipped / passed=true は実質 pass、error 含みは fail、errors=[] は防御的に fail、warning-only は `failOnWarning=false` 既定で実質 pass）をそのまま実装する
- **全経路がこれを経由する**:
  - `validate` 集約 — `validator-system/application/use-cases/aggregate-validation-results-usecase.ts`（WI-332 で複製実装を削除し共有実装を参照）
  - `ci-check` / `complete-check` — `harness-api/domain/value-objects/ci-check-result.ts` の `CiCheckResult.fromResults()`（WI-318 で 2 コマンド共有化、WI-332 で複製実装を削除し共有実装を参照）
  - `pre-commit` / `commit-msg` / `bypass-audit` — `integrations/pre-commit.ts` の `buildReport()` / `classifyValidatorFailure()`（WI-332 で手動集約 `failed === 0` を共有実装経由に変更。pre-commit 経路には `validate.failOnWarning` の config 配線が無いため、既定値 `false` に固定）
- **例外**: `status` コマンドは「failure を表示しつつ常に exit 0」という独立契約のため、本判定の対象外
- **回帰防御**: `scripts/harness/__tests__/integration/validator-system/severity-aggregation-consistency.test.ts` が同一の validator 結果セット（全 pass / warning-only / error / mixed / errors=[] / skipped）を 3 経路（validate 集約・CiCheckResult・pre-commit 集約）に通し、実効判定の一致を assert する。どれかの経路が独自判定に戻るとこのテストが落ちる

新しい集約経路を追加する場合は、必ず `isEffectivelyPassed()` を経由し、上記横断テストに経路を追加すること（ADR-021 の格下げ禁止契約も併せて参照）。
