---
adr_id: "038"
title: "config 状態と操作クラスの許可ポリシー"
status: Accepted
date: 2026-07-18
---

# config 状態と操作クラスの許可ポリシー

<!-- @work-item-id WI-330 -->
<!-- @work-item-id WI-333 -->
<!-- @work-item-id WI-390 -->

## Context

GitHub #40 は「スキーマ違反の `phasegate.config.json` があると pre-tool-use hook が exit 2 で全ツールを遮断し、config を修復する経路自体が消える（自己修復デッドロック）」という障害だった。WI-314 で hook / doctor を fail-open にする応急処置を入れ、WI-323 で hook 側 adapter の JSON parse fail-open、WI-325 で `ConfigParseError` の導入（誤メッセージ修正）を行った。しかし、

- (a) doctor は config 不在・不正でも config 状態を diagnostics に含めず、他が揃っていれば GREEN を報告していた。
- (b) 「config がどの状態のとき、どの操作クラスが許可されるか」を定義した仕様書が存在せず、各修正がアドホックな穴埋めになっていた。
- (c) config **missing** 系のテストが欠落しており、missing 状態の実挙動は未検証だった。

WI-330 で許可表を実測に基づいて仕様化し、doctor に config 状態 check（`config-status`）を追加し、欠落マスをテストで固定した。

## Decision

### 1. config 状態は 4 値で分類する

`missing` / `invalid-json` / `invalid-schema` / `valid`。判定は config-foundation の実 load 経路（`FileSystemConfigRepository` の JSON parse + AJV schema 検証 + preset 解決）をそのまま使う。エラー型との対応:

| 状態 | 検出エラー型 | 定義箇所 |
|------|-------------|---------|
| missing | `ConfigNotFoundError` | `scripts/harness/config-foundation/infrastructure/repositories/file-system-config-repository.ts:12` |
| invalid-json | `ConfigParseError`（`ConfigPersistenceError` のサブクラス、WI-325） | 同ファイル `:41` |
| invalid-schema | `ConfigValidationError`（AJV 違反・未知 preset を含む） | `scripts/harness/config-foundation/domain/errors/config-validation-error.ts:9`、throw 箇所は `load-resolved-config-use-case.ts:71-99` |
| valid | —（load 成功） | — |

config の解決順は project 直下 `phasegate.config.json` → `.phasegate-local/phasegate.config.json`（personal install）で、CLI は cwd から上方探索する（`file-system-config-repository.ts:58-81` `findNearestConfig`）。

### 2. 許可表（config 状態 × 操作クラス）

2026-07-18 時点の**実測**（`invalid-config-fail-open.integration.test.ts` で固定。missing 列は WI-333 で fail-open 化）。○ = 許可 / ● = 意図したゲート判定で通過・遮断 / × = 遮断。

| 操作クラス ＼ config 状態 | valid | missing | invalid-json | invalid-schema |
|---|---|---|---|---|
| **config 自身への編集**（hook 経由 Write/Edit） | × protected-file block（WI-390 / ADR-041） | × protected-file block。bootstrap は managed CLI または人間の hook 外編集 | × protected-file block。hook / doctor 自体は fail-open | × protected-file block。doctor 完走後、人間が hook 外で修復 |
| **gated パス書込**（`scripts/harness/` 等、hook 経由） | ● phase-gate 判定（fail-closed） | ● 既定設定で phase-gate 判定（fail-closed 維持、WI-333） | ● 既定設定で phase-gate 判定（fail-closed 維持） | ● 既定設定で phase-gate 判定（fail-closed 維持） |
| **無関係パス書込**（hook 経由） | ○ | ○ fail-open（警告付き、WI-333） | ○ fail-open | ○ fail-open |
| **無関係 Bash**（書込抽出なし、hook 経由） | ○ | ○ fail-open（警告付き、WI-333） | ○ fail-open（警告付き） | ○ fail-open（警告付き） |
| **検査系コマンド**（`validate` / `ci-check` 等） | ○ 通常実行 | ○ fail-open（既定設定で実行、exit 0） | **○ fail-open（警告付き exit 0）【設計意図より緩い】** | × fail-closed（exit 2 + Recovery 手順） |
| **hook・doctor 起動** | ○ | ○ fail-open（doctor は `configStatus: missing` → warn。hook は警告 + 既定設定で完走、WI-333） | ○ fail-open（doctor は `configStatus: invalid-json` → red） | ○ fail-open（`CONFIG_FAIL_OPEN_COMMANDS`。doctor は `configStatus: invalid-schema` → red） |

コード根拠:

- **CLI dispatch 層の fail-open/fail-closed 分岐**: `scripts/harness/main.ts:1867` `CONFIG_FAIL_OPEN_COMMANDS = new Set(["hook", "doctor"])`、`main.ts:1869-1902` `loadResolvedConfig()` — `ConfigValidationError` は hook/doctor のみ fail-open・他は exit 2（`:1878-1889`）、`ConfigNotFoundError` は全コマンド silent fail-open（`:1891-1893`）、`ConfigParseError`（`instanceof ConfigPersistenceError`）は全コマンド警告付き fail-open（`:1894-1900`）。
- **hook 実行層の fail-open**: `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts` `loadConfig()` — JSON parse 失敗と `fs.readFileSync` の ENOENT（missing、WI-333）はいずれも警告 + 空 config（既定値）で続行。ENOENT **以外**の fs エラー（EACCES / EISDIR 等の真の異常）は従来どおり throw し、`scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` の outer catch で「実行エラー」exit 2 になる。fallback config path は `pre-tool-use-hook.ts:58-76` `findConfigPath()`（不在時は `startDir/phasegate.config.json` を返す）。
- **missing の gated パス fail-closed**: hook 側 config は既定値に縮退するが、gated パス書込は `phase-gate-query-adapter.ts` が config-foundation の `ConfigNotFoundError` を generic catch で「評価不能 = NOT passed」に落とすため、phase-gate block（フェーズゲート違反、exit 2）が維持される。
- **config 自身の non-excludable protection（WI-390）**: `phasegate.config.json` と personal config は ADR-041 の trust root pattern であり、`protectedFiles.exclude` より先に合成される。hook / doctor の config load fail-open と direct mutation authorization を分離し、agent Write/Edit は全 config 状態で block する。
- **doctor の config 状態可視化（WI-330 で追加)**: `scripts/harness/installation/infrastructure/adapters/config-status-probe-adapter.ts`（分類）、`installation/application/checks/config-status-check.ts`（missing → warn / invalid-* → red）、`installation/presentation/formatters/diagnostic-report-formatter.ts`（JSON `configStatus` フィールドと human `Config:` 行）。

### 3. 設計原則

1. **自己修復例外は復旧経路の保証であり、検査系の fail-closed は緩めない。** hook（エージェントのツール遮断点）と doctor（自己診断）は config がどんな状態でも起動・完走できなければならない。逆に `validate` / `ci-check` 等の検査系は、設定が壊れた状態の検査結果を「合格」として流通させないため fail-closed を原則とする。
2. **fail-open は必ず可視化とセットにする。** fail-open で既定設定に落ちた事実は stderr 警告（CLI/hook）と doctor の `configStatus` + `config-status` finding（missing = warn、invalid-* = red）で必ず表面化させる。「不正 config でも doctor GREEN」は本 ADR をもって仕様違反である。
3. **gated スコープの fail-closed は config 状態に依存しない。** config が壊れていても、gated パスへの書込は既定設定による phase-gate 判定で引き続きブロックされる（fail-open は「遮断の解除」ではなく「既定設定への縮退」）。
4. **config load fail-open は config mutation の許可を意味しない。** hook / doctor は missing / invalid config でも完走するが、agent hook 経由の config direct Write/Edit は ADR-041 の protected trust root として常に block する。復旧は managed command、または人間の hook 外編集で行う。 <!-- @work-item-id WI-390 -->

### 4. 既知ギャップ（本 ADR は現状を固定し、修正は別 WI）

| # | ギャップ | 現状 | あるべき姿 |
|---|---------|------|-----------|
| G1 | **missing 状態で pre-tool-use hook が全ツール遮断**（config 自身への Write も遮断 = 自己修復デッドロック復活） | **WI-333 で解消**: `harness-config-config-query-adapter.ts` `loadConfig()` が ENOENT を捕捉し「警告 + 既定値で続行」の fail-open。config 自身への Write / 無関係 Bash は exit 0、gated パス書込は既定設定の phase-gate 判定で fail-closed 維持（`invalid-config-fail-open.integration.test.ts` の WI-333 テストで固定） | invalid-json と同じ「警告 + 既定値で続行」 — 達成済み |
| G2 | **invalid-json の検査系が fail-open**（invalid-schema より緩い） | `ConfigParseError` が `ConfigPersistenceError` 経路で全コマンド fail-open（exit 0） | 検査系は invalid-schema と同様 fail-closed が原則に忠実。ただし挙動変更は breaking のため要判断 |

いずれも `scripts/harness/__tests__/integration/harness-api/invalid-config-fail-open.integration.test.ts` のテストで挙動を固定済み（G1 は fail-open 期待に反転済み）。挙動を修正する際はテストの期待値反転とこの表の更新を同一変更で行うこと。

## Consequences

- doctor は config 状態を常に報告する（JSON: `configStatus`、human: `Config:` 行、finding: `config-status`）。config 不在・不正のまま GREEN を報告することはなくなる（missing は warn、invalid-* は red で exit 1）。
- 許可表が仕様となったため、fail-open/fail-closed の変更は本 ADR の改訂を伴う。
- 経緯: WI-314（hook/doctor fail-open 化）→ WI-323（hook adapter の JSON parse fail-open）→ WI-325（`ConfigParseError` 導入）→ WI-330（本 ADR・doctor 可視化・missing 系テスト固定）→ WI-333（G1 解消: hook adapter の ENOENT fail-open、github#40 完全解消）。
- WI-390 / ADR-041 で、自己修復経路を「direct agent mutation」から managed CLI / human out-of-band edit へ移し、config 自身を non-excludable protected trust root に改訂した。hook / doctor 起動と無関係操作の fail-open は維持する。
