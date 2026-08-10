# WI-390 Logical Design

<!-- @work-item-id WI-390 -->

## 1. Scope and ownership

| Unit / surface | 変更 |
|---|---|
| agent-integration | non-excludable trust roots、config direct-write block、safe guidance、rejection union propagation |
| installation | Husky runtime probe / doctor finding、PostToolUse template alignment |
| quick-mode | Markdown extension classification、`CATEGORY_NOT_ALLOWED` semantics |
| harness-api | invalid/missing config process contract regression |
| repository config | Biome single quote formatter contract |
| release surface | v0.340.0 pack / npm / GitHub Release / registry smoke |

新しい HTTP API や外部 endpoint はない。CLI output の加法変更は doctor finding ID と
`check-change-category.rejectionRule = CATEGORY_NOT_ALLOWED` である。

## 2. agent-integration

### LD-A1: trust-root pattern composition

`protected-file-list.ts` で `NON_EXCLUDABLE_PATTERNS` と `EXCLUDABLE_DEFAULT_PATTERNS` を分離する。
全 factory は前者を常に含み、`exclusions` は後者と additional patterns にだけ適用する。
空集合 fallback でも trust roots は失わない。

### LD-A2: guidance

config / Husky / agent instruction block は具体的な exclude recipe を返さない。
config は `config:plan` の supported intent、install/setup は managed command、それ以外は人間が agent hook 外で
review して編集することを案内する。`quick-implementor` 名は authorization には使用しない。

### LD-A3: config state contract

`invalid-config-fail-open.integration.test.ts` の config direct Write expectations を exit 2 / PROTECTED_FILE に反転する。
無関係 Bash、doctor、gated path の既存 expectations は維持する。ADR-038 を同一 change で更新する。

## 3. installation

### LD-I1: runtime probe

新しい domain Port `GitHooksRuntimeProbe` は `probe(projectRoot): Promise<HuskyRuntimeState>` を公開する。
infrastructure `GitCliHooksRuntimeProbeAdapter` は `git -C <root> config --get core.hooksPath` を引数配列で実行し、
path を正規化する。`.husky/_` の場合は `h` と shim entry の存在を filesystem で確認する。

### LD-I2: doctor check

`HuskyRuntimeInactiveCheck` は injected probe の state を `husky-runtime-inactive` finding に写像する。
severity は red、repair は `npx husky` または `npx phasegate setup:agent --apply --with-husky`。
`RunDoctorDiagnosticsUseCase.PERSONAL_SCOPED_OUT_CHECKS` に同 ID を追加する。

### LD-I3: PostToolUse scripts

root と bundled template の `analyze-errors-hook.sh` を同一 bytes に保つ。
Biome lint invocation を対象 path 付き PhaseGate lint へ置換する。formatter は project Biome config を使い、
self-repo `biome.json` に `javascript.formatter.quoteStyle = single` を設定する。

## 4. quick-mode

### LD-Q1: Markdown rule order

`categorizeFileByBuiltInRules` に `.md` / `.mdx` rule を追加する。config / API / test を先に、domain / docs path /
skills / CREATE fallback を後にする。override の non-downgradable domain/api semantics は built-in 結果に従い、
Markdown は built-in docs なので project override で昇格可能な従来規則を維持する。

### LD-Q2: rejection vocabulary

`classification.categorizedFiles.size` が1なら `CATEGORY_NOT_ALLOWED`、2以上なら `MIXED_CHANGES` を返す。
`RejectionRule` と quick-mode DTO、agent-integration Port / DTO / VO の union を加法拡張する。
NEW_DOMAIN / API_CONTRACT の評価順は不変とする。

## 5. release verification

1. targeted tests と full local gates。
2. `npm pack` した exact tarball で release-smoke。
3. single commit に v0.340.0 / CHANGELOG を含める。
4. branch push、draft PR、review checks、merge。
5. merge commit に `v0.340.0` tag、main + tag push。
6. `npm publish --auth-type=web`。
7. GitHub Release 作成。
8. registry fresh install から #47〜#50 の external behavior を再検証。

## 6. File plan

### New production files

- `scripts/harness/installation/domain/value-objects/husky-runtime-state.ts`
- `scripts/harness/installation/domain/ports/git-hooks-runtime-probe.ts`
- `scripts/harness/installation/infrastructure/adapters/git-cli-hooks-runtime-probe-adapter.ts`
- `scripts/harness/installation/application/checks/husky-runtime-inactive-check.ts`

### Modified production / config files

- `scripts/harness/agent-integration/domain/value-objects/protected-file-list.ts`
- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts`
- agent-integration rejection-rule transport types
- `scripts/harness/installation/{composition-root.ts,domain/check-id.ts,domain/repair-table.ts}`
- `scripts/harness/installation/application/usecases/run-doctor-diagnostics.ts`
- `scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts`
- quick-mode rejection-rule transport types
- `.claude/scripts/analyze-errors-hook.sh`
- `templates/.claude/scripts/analyze-errors-hook.sh`
- `biome.json`
- docs / CHANGELOG / package version / integrity pin as required
