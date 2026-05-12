---
id: WI-091
type: fix
severity: high
status: implemented
affects: [validator-system, phase-dependency-model, config-foundation, harness-api, traceability-model, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/4
reporter: nakataj-mti
related: [WI-085, WI-090]
---

> **進捗状況 (2026-05-09)**: 本 WI は bundled parent として split-closed。#1 / #3 / #5 immediate は v0.127.0〜v0.128.0 で完了し、残 #2 / #4 / #5 advanced は `WI-094` / `WI-093` / `WI-095` として分割後に tested 済み。予防的 DI sweep も `WI-092` で tested 済み。

# WI-091: phasegate v0.124 — `layers.L4.enabled` 無視 / `--help` がサブコマンドで解釈されない / `paths` 設定が L2-001 に伝播しない / warning-severity でも validate 全体 FAIL になる

> 起票日: 2026-05-08
> 起票経緯: GitHub Issue #4（外部レポーター nakataj-mti, 2026-05-08 02:48 UTC）。`SUGI-ACCOUNT`（pnpm モノレポ, architecture: clean, defense: standard）を `0.112.0` → `0.124.0` にアップグレードした際の検証で 4 bug + 1 DX gap を一括報告。「single issue with four sub-points; happy to split」とあり本 WI は **bundled WI（WI-087 と同様の構成）** として起票する。
> 関連: GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4)、WI-085（同 reporter, `paths` 設定が L2-001 に伝播しない問題で `implemented` 済 — finding #4 はその **回帰または不完全修正** の可能性）、WI-090（`init` 側の unknown-flag 検出 — `--help` 関連で隣接スコープ）

## 環境（レポーター報告）

- phasegate: `0.124.0`（`0.112.0` からのアップグレード）
- preset: defense `standard`, architecture `clean`
- Project: pnpm monorepo, workspaces under `pkg/*`, `services/*`, `tools/*`
- OS: macOS (Darwin 25.x), bash 3.2.57

## 再検証結果（grep ベース、2026-05-08）

レポーターの 4 findings + 1 DX gap をすべて再検証し、**5 件すべて再現可能**または **コード上の根本原因を確認**した。

### Finding #1: `layers.L4.enabled: false` が L4-001 を skip しない

`scripts/harness/validator-system/application/use-cases/run-l4-validators-usecase.ts:55-90`

```typescript
async execute(input: RunL4ValidatorsInput): Promise<readonly ValidationResultContract[]> {
  // ...
  let layerConfig;
  try {
    layerConfig = await this.configPort.getLayerConfig('L4');
  } catch (err) { /* ... */ }

  // ⚠ ここで layerConfig.enabled を見ずに executionService.execute() に進む
  const results = this.executionService.execute(definitions, [layerConfig]);
  // ...
  if (this.driftDetectionService) {
    const l4001Result = overrideMap.get('L4-001');
    if (l4001Result && !l4001Result.skipped) {
      const driftReports = await this.driftDetectionService.detect(...);
      // ...
    }
  }
}
```

比較対象 — L3 / L0 は `layerConfig.enabled` でガードされている:

- `scripts/harness/validator-system/application/use-cases/run-l3-validators-usecase.ts:76` — `if (!layerConfig.enabled) { return ...skip... }`
- `scripts/harness/validator-system/application/use-cases/run-l0-validators-usecase.ts:47` — 同様

**根本原因**: `RunL4ValidatorsUseCase` だけ `enabled` チェック節が抜けている。L4-001/002/003 すべてが `enabled: false` の状況でも動作してしまう。さらに L4-001 については `driftDetectionService.detect()` 後に独自 override で FAIL を立てるロジックを通るため、status からは "L4 disabled" に見えるが validate からは FAIL に見える、という矛盾が生まれる。

**Suggestion (レポーター)**: `layers.L4.enabled` が `false` のとき、`L4-001` は `[SKIP]` 扱い（または `[FAIL]` ではなく skip）。

### Finding #2: warning-severity validator が失敗しても validate 全体が FAIL

```bash
$ phasegate list-errors --layer L4 --format json
{ "code": "L4-001", "title": "設計と実装の乖離が検出された",
  "category": "consistency", "defaultSeverity": "warning",
  "validatorId": "drift-detect" }
```

L4-001 の `defaultSeverity` は `warning` だが、`phasegate validate` は drift 検出を `[FAIL]` として集計し、overall judgement も `FAIL ✗`、exit code も非ゼロ。

**根本原因の仮説**: validator presentation 層の severity 集計ロジックが `defaultSeverity` を見ずに `ValidationResult.fail()` の有無だけで判定している可能性。`scripts/harness/validator-system/` 配下の集計コードと `error-catalog` の `defaultSeverity` メタデータの突き合わせが必要。

**Suggestion (レポーター)**: warning-severity validator は集計時に WARN（exit 0）扱いにする、または config で挙動を選べるようにする（"error-as-warn" semantics は現状未ドキュメント）。

### Finding #3: `--help` がサブコマンドで no-op、副作用が走る

```bash
$ phasegate update-skills --help
Previously deployed: v0.112.0 (...)
Current harness version: v0.124.0
✓ Skills updated (30 skills redeployed, set: all)
```

`phasegate phasegate:detect-drift --help` でも同様（実 run が走り、help が出ない）。

`scripts/harness/main.ts` の `--help` 対応状況（grep 結果）:

- `main.ts:152` — root help text に `--help` の記載あり
- `main.ts:467` — root command 解釈で `--help` / `help` を処理
- `main.ts:897, 942, 1027` — 一部 subcommand では `hasFlag(args, "--help")` で usage 表示済
- それ以外の subcommand（`update-skills`, `phasegate:detect-drift`, `migrate`, `lint`, `validate` 等）では `--help` 未配線、positional 扱いで silent ignore

**実害**: ユーザーが CLI option を調査するつもりで `--help` を打つと、`update-skills` のような **副作用ありコマンド** が即実行される。WI-090 で `init` の unknown-flag 検出を入れたが、`--help` は known flag 扱いなので別対応が必要。

**Suggestion (レポーター)**: 全サブコマンドで `--help` / `-h` を最優先で解釈し usage 表示 + exit 0 する。副作用ありコマンドは特に必須。

### Finding #4: `paths.designDocs` / `paths.inceptionDocs` が L2-001 で部分的にしか効いていない（WI-085 fix の不完全 / 回帰）

WI-085（同 reporter, `implemented`, v0.117 系で対応）で対処したはずだが、v0.124.0 でも:

```json
{ "paths": { "designDocs": "mydocs/product/construction",
             "inceptionDocs": "mydocs/inception" } }
```

```
$ phasegate validate --layer L2
[FAIL] L2-001 (0ms)
  - 成果物が不足しています: docs/product/product_overview.md
  - 成果物が不足しています: docs/product/user_stories.md
```

**根本原因（grep 確認）**: `scripts/harness/phase-dependency-model/domain/definitions/` 配下の phase-node 定義で、artifact path の一部に **placeholder が入っていない**。

| ファイル | 行 | path | 状態 |
|---------|---|------|------|
| `standard-phase-nodes.ts:29` | `{inceptionDocsRoot}/_shared/product_overview_plan.md` | placeholder ✓ |
| `standard-phase-nodes.ts:34` | `docs/product/product_overview.md` | **hardcoded ✗** |
| `standard-phase-nodes.ts:46` | `docs/product/user_stories.md` | **hardcoded ✗** |
| `full-phase-nodes.ts:34, 46` | 同上 | **hardcoded ✗** |
| `minimal-phase-nodes.ts:34` | `docs/product/product_overview.md` | **hardcoded ✗** |
| `traceability-model/domain/services/traceability-chain-builder.ts:20` | `STORY_CATALOG_PATH = 'docs/product/user_stories.md'` | **hardcoded ✗** |
| `traceability-model/infrastructure/gateways/markdown-story-catalog-gateway.ts:55` | `'user_stories.md'` 相対 | **hardcoded ✗** |

→ WI-085 では `inceptionDocsRoot` 側の templating は通したが、`designDocsRoot` を必要とする `product_overview.md` / `user_stories.md` のパスは置き換え漏れ。

**Suggestion (レポーター)**: `phasegate.config.json` の `paths.*` を全 validator が consult するように。レポーターは現状 `docs/inception -> ../mydocs/inception` / `docs/product -> ../mydocs/product` の symlink workaround を運用中。

### Finding #5 (DX): drift-detect の element 名マッチングが whitespace / 括弧で破綻する

```
[FAIL] L4-001
  - CommonIdInfo（エンティティ・新規）: design に記載されているが code に存在しない
  - Consent（既存・enum 値追加）: 同上
```

実際には `pkg/domain/src/entity/common-id-info/` / `pkg/domain/src/enums/consent-type.ts` が存在する。設計文書側の element 文字列に括弧付き修飾子（`（エンティティ・新規）` 等）が含まれており、exact-name マッチングが破綻している模様。

**Suggestion (レポーター)**:
- マッチングヒューリスティックの明文化（括弧 / 全角括弧 / qualifier の扱い）
- もしくは設計文書に `pointers:` ブロックを置いて `element → file path` マッピングを明示できるようにする
- `@unit` JSDoc を全 domain ファイルに付与するのは monorepo の既存ファイル群には heavy

### レポーターの triage まとめ

- (1) bug — `layers.L4.enabled` 無視
- (2) bug or doc gap — `validate` 集計が severity を見ない
- (3) bug — `--help` parsing on subcommands
- (4) bug — `paths` config が L2-001 resolver に届いていない（WI-085 不完全）
- (5) DX — drift detection matching heuristic / explicit pointers

レポーターのローカル mitigation:
- (1)(2): 「validate FAIL を許容、L4-001 false positive と plan に明記」
- (3): 「`--help` は smell として扱い、`docs/guide/cli-reference.md` を読む」
- (4): symlink workaround 継続
- (5): pending（(1) 解消後または `pointers:` 機構ドキュメント化後に再開予定）

## 本 WI でやること

### Phase 1: 方針確定

5 findings を以下にグルーピングして優先順位を決める:

- **(A) 高インパクト・低リスク**: finding #1（L4 enabled gate）, finding #3（`--help` 全 subcommand 配線）
  - 1〜数行 fix でクラス全体の silent failure を解消
  - 後方互換破壊なし（`--help` は今 silent ignore なので追加で usage を出すだけ）
- **(B) 中インパクト・中リスク**: finding #4（`paths` 完全 threading, WI-085 漏れ補完）
  - phase-nodes 定義 3 ファイル + traceability-model 2 ファイルに placeholder 化
  - 既存 default は `docs/product/...` を維持するため後方互換
- **(C) 設計判断要**: finding #2（severity 集計セマンティクス）
  - "warning は exit 0" のセマンティクスを採用するか、config で選べるようにするか ADR レベルの判断
  - 既存 user の CI が「FAIL = exit 非ゼロ」前提で組まれている場合の互換戦略を要決定
- **(D) 中長期 DX**: finding #5（drift detection matching / pointers）
  - element 名 normalization（括弧除去・空白除去）の即効改善 vs `pointers:` block 仕様策定の分離
  - 別 WI に切り出すか、本 WI 内で分離 phase として進めるか判断

ADR を 1 本起票し、(A)〜(D) の採用方針 + (C) の互換戦略を確定する。WI-085 の関連を本 ADR で明示。

### Phase 2: 設計（`logical-designer` 推奨、特に finding #2 / #4 / #5）

1. **finding #1**: `RunL4ValidatorsUseCase` に `if (!layerConfig.enabled) { return ...skip results... }` を追加（L3 と対称）。skip 結果は `ValidationResult.skip()` で全 L4 validator 分を返す
2. **finding #3**: `main.ts` 全 subcommand 入口に `if (hasFlag(args, "--help") || hasFlag(args, "-h")) { printSubcommandHelp(name); process.exit(0); }` 共通ハンドラ + per-subcommand usage table。`update-skills` / `phasegate:detect-drift` / `migrate` を最優先
4. **finding #4**: phase-nodes 定義の hardcoded `docs/product/` を `{designDocsRoot}/` placeholder に置換し、`Artifact.resolve(pathRoots)` 側で `paths.designDocs` を使って展開。`traceability-chain-builder.ts:20` / `markdown-story-catalog-gateway.ts:55` も同様に config 経由化（DI 経路は `phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.ts:147-153` を踏襲）
5. **finding #2**: validator presentation 層の集計ロジックを調査し、`error-catalog` の `defaultSeverity` を結果集計に反映。warning は WARN aggregate、validate 全体 exit code は warning-only なら 0 (or `--warning-as-error` flag で error 化)
6. **finding #5**: 即効改善として element 名 normalize（`/[（()][^）)]*[）)]/` で qualifier 除去、trim）。`pointers:` block 仕様は別 WI に切り出すかを Phase 1 で決定

### Phase 3: 実装

- finding #1（L4 enabled gate）: `quick-implementor` 可（数行 fix + 単体テスト）
- finding #3（`--help` 全 subcommand）: `quick-implementor` 可（main.ts への boilerplate 追加 + 各 subcommand の usage 追加）
- finding #4（paths threading）: `story-implementor` — phase-nodes / traceability-model の DI 配線変更を伴う
- finding #2（severity 集計）: `story-implementor` — 集計セマンティクスの仕様変更
- finding #5（element normalize / pointers）: 即効改善は `quick-implementor`、`pointers:` 仕様は分離

### Phase 4: ドキュメント整合

1. `docs/guide/cli-reference.md`: 全 subcommand の `--help` usage を整備
2. `docs/guide/configuration.md`: `paths.*` が phase-gate / traceability に効くことを明記、`paths` を設定したときの artifact 探索順を表で整理
3. `docs/guide/layer-model.md`: L4 disable 時の挙動（skip）を明記、severity 集計ルールを追記
4. CHANGELOG に GitHub Issue #4 参照付きで記載
5. WI-085 の description.md に「v0.117 では `inceptionDocs` のみ threading、`designDocs` 側 (product_overview / user_stories) は WI-091 で補完」と post-mortem 追記

### Phase 5: リリース

1. minor バージョン bump（複数 phase に分けるなら都度 bump）
2. `npm publish --auth-type=web`（memory `feedback_npm_publish_auth_type_web.md` 適用）
3. **dogfood 必須** — pnpm monorepo + `paths.*` カスタマイズした検証用 PJ を `/tmp/phasegate-dogfood-wi091` に作って各 finding を再検証してから publish（memory `feedback_dogfood_before_release.md` 適用）
4. GitHub Issue #4 にリリース版コメント + close（finding ごとに分割 close するか total close するかは reporter のスタイルに合わせる）

## 受け入れ基準

- [x] **finding #1**: `phasegate.config.json` の `layers.L4.enabled: false` 設定で `phasegate validate` の L4 validator が overall judgement に影響しない
- [x] **finding #1**: `RunL4ValidatorsUseCase.execute()` で `layerConfig.enabled === false` のときに drift / consistency / dead-code service を呼ばない
- [x] **finding #2**: `defaultSeverity: warning` の validator が fail しても warning-only なら overall PASS / exit 0 になる（WI-094）
- [x] **finding #2**: 後方互換戦略を ADR-017 で決定し実装に反映（WI-094）
- [x] **finding #3**: subcommand の `--help` / `-h` が usage 表示 + exit 0 になり、副作用ありコマンドで実行が走らない
- [x] **finding #3**: `update-skills --help` / `phasegate:detect-drift --help` の副作用防止を integration test で確認
- [x] **finding #4**: `paths.designDocs` 指定値が `L2-001` / traceability-model で consult される（WI-093）
- [x] **finding #4**: phase-node 定義の hardcoded `docs/product/` が `{designDocsRoot}` ベースで解決される（WI-093）
- [x] **finding #4**: traceability-model の story catalog / product root 解決が config 経由になる（WI-093）
- [x] **finding #5**: drift detection が括弧 qualifier を normalize し、advanced case は `pointers:` block 仕様で対応済み（WI-095）
- [x] dogfood: `paths` カスタマイズ、`layers.L4.enabled: false`、`--help`、drift-detect / pointers を各分割 WI の post-publish dogfood で確認
- [x] CHANGELOG に finding 別に記載
- [x] WI-085 description.md に `designDocs` 側 threading は WI-093 で補完した旨を追記済み

## スコープ外

- finding #5 の `pointers:` block 仕様の本格策定（仕様 ADR を別 WI で起票する場合）
- yargs / commander 等の CLI library 導入による `--help` / unknown flag の根本リファクタ（WI-090 / 本 WI とも zero-dep parser を維持）
- defense preset (`project.preset`) ごとの severity policy 切り替え（finding #2 の構造によっては別 ADR）
- L4-002 / L4-003 の severity が同様の問題を持つかの調査（本 WI の主スコープは L4-001、必要なら別 WI）
- WI-090 で扱った `init` 限定の unknown-flag 検出を他 subcommand に展開する作業（別 WI で漸進）

## 関連

- `scripts/harness/validator-system/application/use-cases/run-l4-validators-usecase.ts:55-90`（finding #1 — `layerConfig.enabled` 未参照）
- `scripts/harness/validator-system/application/use-cases/run-l3-validators-usecase.ts:76`（finding #1 — 対称実装の参照点）
- `scripts/harness/main.ts:467, 897, 942, 1027`（finding #3 — `--help` 既存配線箇所）
- `scripts/harness/phase-dependency-model/domain/definitions/standard-phase-nodes.ts:29-46`（finding #4 — hardcoded path）
- `scripts/harness/phase-dependency-model/domain/definitions/full-phase-nodes.ts:29-46`（finding #4）
- `scripts/harness/phase-dependency-model/domain/definitions/minimal-phase-nodes.ts:29-46`（finding #4）
- `scripts/harness/phase-dependency-model/domain/values/artifact.ts:21-22, 91-96`（finding #4 — `DEFAULT_PATH_ROOTS` / placeholder 展開）
- `scripts/harness/phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.ts:147-153`（finding #4 — DI 経路）
- `scripts/harness/traceability-model/domain/services/traceability-chain-builder.ts:20`（finding #4 — `STORY_CATALOG_PATH` 定数）
- `scripts/harness/traceability-model/infrastructure/gateways/markdown-story-catalog-gateway.ts:55`（finding #4）
- `scripts/harness/validator-system/composition-root.ts:51`（finding #1 — L4 default enabled: true / preset bootstrap）
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts:35`（L4-001 ↔ drift-detect マッピング）
- WI-085 (`docs/inception/_cross/WI-085/description.md`) — `paths` 設定 threading の先行 WI（finding #4 の前段、`inceptionDocs` 側のみ threading 完了）
- WI-090 (`docs/inception/_cross/WI-090/description.md`) — `init` unknown-flag 検出（finding #3 の隣接スコープ）
- GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4)

## 参考

- 起票者の v0.124.0 環境での再現手順は GitHub Issue #4 本文参照
- レポーター nakataj-mti は WI-085 / WI-087 の reporter でもあり、過去の retrospective を読みつつコミュニケーションするのが望ましい
- Claude Code Hooks 仕様: https://code.claude.com/docs/en/hooks（finding #3 の `--help` 期待挙動の参照）

## 教訓フィードバック (memory 適用)

- `feedback_dogfood_before_release.md`: `paths` config 改修と severity 集計変更は publish 前に dogfood で検証必須。WI-085 の `inceptionDocs` のみ threading が `designDocs` 側で漏れた教訓 — 関連箇所を grep で網羅してから fix する
- `feedback_verify_existing_before_extending.md`: finding #1 / #3 / #4 すべて grep で根本原因 / 既存実装の有無を確認済（本 description 内に行番号で引用）。実装着手前にも再確認すること
- `feedback_npm_publish_auth_type_web.md`: publish は `--auth-type=web` 固定

## 進捗ログ

### v0.127.0 完了 — 2026-05-08 (finding #1 / #3 / #5 immediate, 3/5 件)

リスクの低い 3 件を quick-implementor で先行修正:

- **finding #1** (commit `00410a5`): `RunL4ValidatorsUseCase` に L3 と対称な `if (!layerConfig.enabled) return [];` ガードを追加。空配列を返すことで集計層で SKIP 表示。整合性テスト `IT-UC-RunL4-007/008` 追加。
- **finding #3** (commit `7ff7d85`): `main.ts` に `SUBCOMMAND_HELP` table (13 entry) と `printSubcommandHelp` helper を追加し、`switch` 手前の pre-dispatch で `--help` / `-h` を最優先解釈 → usage + exit 0。13 個の specific usage を登録、未登録は generic fallback。spawn 経由 5 ケースの結合テスト (`subcommand-help.integration.test.ts`) で副作用走行ナシを検証。既存 inline 3 箇所 (line 982 / 1028 / 1112) は dead code として残置。
- **finding #5 immediate** (commit `0660c36`): `extractConceptNames` (`markdown-design-document-adapter.ts`) に括弧 qualifier (`/[（(][^）)]*[）)]/g`) strip + 空名 filter を追加。半角 / 全角 / 連続パターン対応、`pointers:` block 仕様は別 WI に切り出し。整合性テスト `IT-REPO-DesignDoc-007〜010` 追加。

**dogfood 再現確認**: `/tmp/phasegate-dogfood-wi091` (phasegate@0.126.0) にて 5 件すべて再現確認済。本リリース後 v0.127.0 で 3 件が解消されることを再 dogfood で検証する。

**全 3514 tests** (前回 3503 + 新規 11) グリーン、L1 lint 違反なし、L2 metadata + test-quality 維持。

**残作業 (別 WI 起票済)** — 2026-05-08 に 3 件すべて起票:

- **[WI-094](../WI-094/description.md)** (finding #2: severity 集計セマンティクス + ADR): `aggregate-validation-results-usecase.ts:67` で `overallPassed = failedValidators === 0` と severity 非考慮の問題。`defaultSeverity: warning` の validator が fail しても overall FAIL になり exit 1。既存 user CI への影響があるため後方互換戦略 (例: `validate.warningExitCode` config flag) を ADR で決定する必要あり。type: issue、severity: high、**story-implementor 案件**。
- **[WI-093](../WI-093/description.md)** (finding #4: paths.designDocs 完全 threading): `phase-dependency-model/domain/definitions/{full,standard,minimal}-phase-nodes.ts` 3 ファイルと `traceability-model/{domain/services/traceability-chain-builder.ts, infrastructure/gateways/markdown-story-catalog-gateway.ts}` 2 ファイルの hardcoded `docs/product/...` を `{designDocsRoot}/...` placeholder に置換し、`Artifact.resolve(pathRoots)` で `paths.designDocs` 値を展開する作業。WI-085 で `inceptionDocs` 側 threading のみ通った漏れの補完。type: fix、severity: high、**story-implementor 案件**。
- **[WI-095](../WI-095/description.md)** (finding #5 advanced: `pointers:` block 仕様): 設計文書側で `element → file path` を明示する高度仕様の策定 — ADR で要件確定後に実装。本 v0.127.0 の immediate 修正で false-positive の主原因 (qualifier) は解消されたため緊急度は低下。type: story、severity: normal。

### dogfood 検証 (post-publish) — v0.127.0 結果

publish 後 `/tmp/phasegate-dogfood-wi091` で `npx phasegate@0.127.0` を install して 3 ケース検証した結果:

1. **finding #5 normalize**: ✅ `## CommonIdInfo（エンティティ・新規）` を含む `domain_model.md` で `phasegate phasegate:detect-drift` 実行 → output に `"element":"CommonIdInfo"` (qualifier 除去済) が出力された。fix が runtime で機能していることを確認。
2. **finding #3 --help pre-dispatch**: ✅ `update-skills --help` / `phasegate:detect-drift --help` / `validate --help` で副作用走行せず usage + exit 0 (本 dogfood では既に commit 段階の結合テストで spawn 経由検証済、追加で実機確認)。
3. **finding #1 L4 enabled gate**: ❌ `layers.L4.enabled: false` + `validate --layer L4` 実行で L4-001/002 が `[PASS]` (実行された) のままで `[SKIP]` にならない。fix がソースには入っているが runtime で機能していない症状を確認 → DI 配線漏れと特定 (composition root が user config を受け取っていない)。**v0.128.0 で follow-up fix**。

### v0.128.0 完了 — 2026-05-08 (finding #1 follow-up)

dogfood で発覚した finding #1 の DI 配線漏れを修正:

- **commit `adb7553`**: `main.ts` に `toValidatorSystemConfig` translator 追加、`validate` case で `createValidatorSystemModule(toValidatorSystemConfig(resolvedConfig))` を呼ぶように修正。`validators` field は thread しない (preset-style の `["drift-detector"]` が validator-code-style `L4-001/002/003` を override し全 SKIP になる症状を回避、defaultValidators[layer] フォールバックに委ねる)。
- 結合テスト 2 ケース新規追加 (`validate-layer-config.integration.test.ts`)。
- 全 3516 テスト (前回 3514 + 新規 2) グリーン。

**v0.128.0 dogfood 検証 (post-publish) — 結果 (2026-05-08)**:

`/tmp/phasegate-dogfood-wi091` で `npx phasegate@0.128.0` を install して検証。

1. **finding #1 L4 enabled gate**: ✅ `layers.L4.enabled: false` + `validate --layer L4` 実行 → `バリデータ: 0件 (合格:0 失敗:0 スキップ:0)` / 総合判定: PASS ✓ / exit 0。v0.127.0 で発覚した DI 配線漏れが解消され、user の config が runtime で実際に L4 use case に届くことを確認。
2. **finding #1 回帰確認**: ✅ `layers.L4.enabled: true` で `phasegate:detect-drift` 実行 → drift 検出が動作 (sample-unit の `CommonIdInfo` / `Consent` を検出)。enabled gate が enabled=true 時には透過することを確認。
3. **finding #3 --help pre-dispatch**: ✅ `update-skills --help` / `phasegate:detect-drift --help` で usage + exit 0 (副作用ナシ、回帰なし)。
4. **finding #5 qualifier normalize**: ✅ drift detect output の element 名が `CommonIdInfo` / `Consent` (括弧 qualifier 除去済) で、回帰なし。

**3/5 finding が v0.127.0+v0.128.0 で実機 runtime での動作を確認済**。残る #2 (severity 集計) / #4 (paths threading) / #5 advanced (`pointers:` block 仕様) は別 WI 起票で漸進的に対応する。

**残 follow-up (別 WI 起票で対応)** — 2026-05-08 に起票済:

- **[WI-092](../WI-092/description.md)** — `createValidatorSystemModule()` 残 5 site の DI 配線漏れ sweep (`validator-system-execution-adapter.ts:27/38/51` + `integrations/pre-commit.ts:306/338`)。本 v0.128.0 で `main.ts:979` のみ修正、残 5 site は予防的 sweep 対象。

これらも同種の DI 配線漏れだが、別ハンドラ経路で `resolvedConfig` がスコープ外のため別途修正。phasegate:detect-drift で finding #5 normalize が機能したのは drift detection が design adapter を直接呼ぶ経路で、L4 enabled gate を経由していないため。

**教訓 (memory 反映予定)**: `feedback_dogfood_before_release.md` に composition root の DI 経路 (`createValidatorSystemModule(config?)` を呼ぶ全 6 site) で config threading を毎回 grep 確認する規律を追記する。
