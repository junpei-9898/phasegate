---
type: fix
source: exocortex-review P5 (github#40 恒久化)
---

# WI-330: config 状態の可視化と許可表の仕様化（GitHub #40 の恒久化）

## 問題

WI-314/323/325 で「不正 config でも hook / doctor は fail-open」の応急処置は済んでいたが、

1. doctor が config 不在・不正でも config 状態を報告せず、他の check が揃っていれば GREEN を報告する
2. 「config 状態 × 操作クラスで何が許可されるか」の仕様書が存在しない
3. config **missing** 系のテストが欠落している

## 対応

### doctor の config 状態可視化

- `config-status` check を新設（`installation/application/checks/config-status-check.ts`）
  - missing → **warn**（「既定設定の fail-open モードで動作中。`phasegate init` で生成できます」）
  - invalid-json / invalid-schema → **red**（意図した設定が適用されていない + 修復の一手）
  - valid → finding なし
- 状態分類は config-foundation の実 load 経路を使う probe adapter
  （`installation/infrastructure/adapters/config-status-probe-adapter.ts`）。
  project 直下 → `.phasegate-local/` の personal install の順で解決
- doctor JSON 出力に `configStatus`（missing / invalid-json / invalid-schema / valid）を追加、
  human 出力に `Config:` 行を追加
- 既存 fixture は「実インストール済み PJ には valid config が存在する」現実に合わせて
  valid config を追加（`no-phasegate` fixture のみ config-status warn を期待値に追加）

### 許可表の仕様化

- `docs/ADR/038-config-state-operation-permission-policy.md` を新設。
  4 状態 × 6 操作クラスの許可表を**実測**に基づき固定し、コード根拠（file:line）を付記
- `docs/guide/layer-model.md` の L0 節から ADR-038 への参照を追記

### テストで欠落マスを固定（実測結果）

`invalid-config-fail-open.integration.test.ts` に missing 系を追加:

- config missing + validate → **fail-open exit 0**（既定設定で PASS）
- config missing + doctor → configStatus missing + config-status warn finding
- config missing + pre-tool-use hook（無関係 Bash）→ **exit 2（現状固定・既知ギャップ）**
- config missing + config 自身への Write → **exit 2（現状固定・既知ギャップ = 自己修復デッドロック）**

## 発見された既知ギャップ（別 WI で修正すべき事項）

事前想定「無関係 Bash は全状態で素通し / config 自身への Write は全状態で許可」は
**missing 状態では成立していなかった**。
`harness-config-config-query-adapter.ts` の `readFileSync` ENOENT が未捕捉のまま
`hook-to-cli-translator.ts` の `getProtectedFilePatterns()` 呼び出しを素通りし、
`pre-tool-use-hook.ts` の outer catch で exit 2 になる（全ツール遮断 + 自己修復経路の閉塞）。
また invalid-json の検査系は invalid-schema と異なり fail-open（exit 0）で、原則より緩い。
詳細は ADR-038 §4（G1 / G2）。agent-integration は本 WI のスコープ外のため挙動は変更せず、
テスト名に【現状固定・既知ギャップ】と明示して固定した。

## テスト

- `scripts/harness/__tests__/unit/installation/checks/doctor-checks.test.ts` — config-status check 4 状態
- `scripts/harness/__tests__/integration/installation/doctor-handler.test.ts` — fixture golden 更新 +
  WI-330 config 状態診断（missing/invalid-json/invalid-schema/valid/personal install/human 出力）
- `scripts/harness/__tests__/integration/harness-api/invalid-config-fail-open.integration.test.ts` —
  missing 系 4 ケース追加（spawn 系は timeout 60000 明示）
