---
adr_id: "038"
title: "config 状態と操作クラスの許可ポリシー"
status: Accepted
date: 2026-07-18
---

# config 状態と操作クラスの許可ポリシー

<!-- @work-item-id WI-330 -->

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

2026-07-18 時点の**実測**（`invalid-config-fail-open.integration.test.ts` で固定）。○ = 許可 / ● = 意図したゲート判定で通過・遮断 / × = 遮断。

| 操作クラス ＼ config 状態 | valid | missing | invalid-json | invalid-schema |
|---|---|---|---|---|
| **config 自身への編集**（hook 経由 Write/Edit） | ○ fail-open（既定では保護対象外。`protectedFiles.patterns` に含めた場合のみ CLI 誘導 block） | **×【既知ギャップ】exit 2** | ○ fail-open | ○ fail-open |
| **gated パス書込**（`scripts/harness/` 等、hook 経由） | ● phase-gate 判定（fail-closed） | **× exit 2（phase-gate 判定に到達せず ENOENT で遮断）** | ● 既定設定で phase-gate 判定（fail-closed 維持） | ● 既定設定で phase-gate 判定（fail-closed 維持） |
| **無関係パス書込**（hook 経由） | ○ | **×【既知ギャップ】exit 2** | ○ fail-open | ○ fail-open |
| **無関係 Bash**（書込抽出なし、hook 経由） | ○ | **×【既知ギャップ】exit 2** | ○ fail-open（警告付き） | ○ fail-open（警告付き） |
| **検査系コマンド**（`validate` / `ci-check` 等） | ○ 通常実行 | ○ fail-open（既定設定で実行、exit 0） | **○ fail-open（警告付き exit 0）【設計意図より緩い】** | × fail-closed（exit 2 + Recovery 手順） |
| **hook・doctor 起動** | ○ | ○ 起動可（doctor は `configStatus: missing` → warn。hook は起動後に上記 × に落ちる） | ○ fail-open（doctor は `configStatus: invalid-json` → red） | ○ fail-open（`CONFIG_FAIL_OPEN_COMMANDS`。doctor は `configStatus: invalid-schema` → red） |

コード根拠:

- **CLI dispatch 層の fail-open/fail-closed 分岐**: `scripts/harness/main.ts:1867` `CONFIG_FAIL_OPEN_COMMANDS = new Set(["hook", "doctor"])`、`main.ts:1869-1902` `loadResolvedConfig()` — `ConfigValidationError` は hook/doctor のみ fail-open・他は exit 2（`:1878-1889`）、`ConfigNotFoundError` は全コマンド silent fail-open（`:1891-1893`）、`ConfigParseError`（`instanceof ConfigPersistenceError`）は全コマンド警告付き fail-open（`:1894-1900`）。
- **hook 実行層の fail-open**: `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts:79-101` `loadConfig()` — JSON parse 失敗は警告 + 空 config（既定値）で続行（`:90-98`）。ただし `fs.readFileSync` の ENOENT（missing）はそのまま throw する（`:88`）。
- **missing の遮断経路（既知ギャップ）**: 上記 throw が `scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts:224`（`translatePreToolUse` → `getProtectedFilePatterns()`）を素通りし、`scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts:213-216` の outer catch で「実行エラー」exit 2 になる。fallback config path は `pre-tool-use-hook.ts:58-76` `findConfigPath()`（不在時は `startDir/phasegate.config.json` を返す）。
- **config 自身が gated/protected でない根拠**: 既定の保護パターンに `phasegate.config.json` は含まれない（`scripts/harness/agent-integration/domain/value-objects/protected-file-list.ts:17-27` `DEFAULT_PATTERNS`）。ユーザーが `protectedFiles.patterns` で保護した場合のみ CLI 誘導付き block（`handle-pre-tool-use-usecase.ts:480-495`）。
- **doctor の config 状態可視化（WI-330 で追加)**: `scripts/harness/installation/infrastructure/adapters/config-status-probe-adapter.ts`（分類）、`installation/application/checks/config-status-check.ts`（missing → warn / invalid-* → red）、`installation/presentation/formatters/diagnostic-report-formatter.ts`（JSON `configStatus` フィールドと human `Config:` 行）。

### 3. 設計原則

1. **自己修復例外は復旧経路の保証であり、検査系の fail-closed は緩めない。** hook（エージェントのツール遮断点）と doctor（自己診断）は config がどんな状態でも起動・完走できなければならない。逆に `validate` / `ci-check` 等の検査系は、設定が壊れた状態の検査結果を「合格」として流通させないため fail-closed を原則とする。
2. **fail-open は必ず可視化とセットにする。** fail-open で既定設定に落ちた事実は stderr 警告（CLI/hook）と doctor の `configStatus` + `config-status` finding（missing = warn、invalid-* = red）で必ず表面化させる。「不正 config でも doctor GREEN」は本 ADR をもって仕様違反である。
3. **gated スコープの fail-closed は config 状態に依存しない。** config が壊れていても、gated パスへの書込は既定設定による phase-gate 判定で引き続きブロックされる（fail-open は「遮断の解除」ではなく「既定設定への縮退」）。

### 4. 既知ギャップ（本 ADR は現状を固定し、修正は別 WI）

| # | ギャップ | 現状 | あるべき姿 |
|---|---------|------|-----------|
| G1 | **missing 状態で pre-tool-use hook が全ツール遮断**（config 自身への Write も遮断 = 自己修復デッドロック復活） | exit 2（`readFileSync` ENOENT が未捕捉） | invalid-json と同じ「警告 + 既定値で続行」。修正箇所は `harness-config-config-query-adapter.ts` の ENOENT 捕捉（agent-integration、WI-330 スコープ外） |
| G2 | **invalid-json の検査系が fail-open**（invalid-schema より緩い） | `ConfigParseError` が `ConfigPersistenceError` 経路で全コマンド fail-open（exit 0） | 検査系は invalid-schema と同様 fail-closed が原則に忠実。ただし挙動変更は breaking のため要判断 |

いずれも `scripts/harness/__tests__/integration/harness-api/invalid-config-fail-open.integration.test.ts` の「【現状固定】」テストで挙動を固定済み。挙動を修正する際はテストの期待値反転とこの表の更新を同一変更で行うこと。

## Consequences

- doctor は config 状態を常に報告する（JSON: `configStatus`、human: `Config:` 行、finding: `config-status`）。config 不在・不正のまま GREEN を報告することはなくなる（missing は warn、invalid-* は red で exit 1）。
- 許可表が仕様となったため、fail-open/fail-closed の変更は本 ADR の改訂を伴う。
- 経緯: WI-314（hook/doctor fail-open 化）→ WI-323（hook adapter の JSON parse fail-open）→ WI-325（`ConfigParseError` 導入）→ WI-330（本 ADR・doctor 可視化・missing 系テスト固定）。
