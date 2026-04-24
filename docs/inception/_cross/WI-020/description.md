---
id: WI-020
type: issue
severity: normal
status: drafted
legacy_id: ISSUE-020
affects: [config-foundation（主）]
---

# ISSUE-020: `config-foundation/domain/harness-config.ts` と `phase-dependencies-config.ts` の循環依存

## ステータス

- **状態**: 🟢 **CLOSED (v0.82.0, 2026-04-23)** — `PhaseDependenciesPresetId` 型を Aggregate 側から VO 側へ移動。Aggregate → VO の一方向依存に整理し循環解消。L1-003 違反 9 → 8
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003 Wave 4（v0.80.0）で L1-003 違反残 12 件中 1 件が domain 内循環依存として検出
- **影響Unit**: config-foundation（主）
- **深刻度**: Low — 実動作は機能しているが、循環依存は保守性とビルド順序の安定性を損なう
- **優先度**: P3 — 設計整合性のリファクタ案件

## 問題の概要

`phasegate lint` v0.80.0 で以下の循環が検出:

```
scripts/harness/config-foundation/domain/harness-config.ts
  -> scripts/harness/config-foundation/domain/value-objects/phase-dependencies-config.ts
```

相互参照になっている可能性大。具体的にどちらが「親」でどちらが「子」概念なのか設計判断が必要。

### 想定される状態（要実機確認）

- `harness-config.ts` (Aggregate Root) が `PhaseDependenciesConfig` を含む
- `phase-dependencies-config.ts` (Value Object) が `HarnessConfig` の型 or 定数を参照している
- 結果として循環

## 修正案

**A. 共通型を separate file に抽出**
- 両者が依存している共通の型/定数を `config-foundation/domain/value-objects/` に独立ファイルとして切り出す
- Aggregate → VO の一方向依存に整理

**B. VO 側の依存を削除**
- `phase-dependencies-config.ts` が `HarnessConfig` に依存している箇所を特定
- 不要な依存であれば削除、必要なら型を VO 側にローカル定義

### Acceptance criteria

- [ ] `config-foundation` domain 内の循環依存が解消される
- [ ] `phasegate lint` で該当 violation が消える（L1-003: 12 → 11）
- [ ] 既存 3299 件のテストが全て green を維持

## 実装フェーズ

| Phase | 内容 | 見積り |
|---|---|---|
| A | 循環依存箇所の特定（grep + import 解析） | 0.25h |
| B | 共通型の抽出 or VO 側 dependency 削除 | 0.5h |
| C | テスト確認 + lint 確認 | 0.25h |

**合計見積り**: ~1h

## 参照

- `scripts/harness/config-foundation/domain/harness-config.ts`
- `scripts/harness/config-foundation/domain/value-objects/phase-dependencies-config.ts`
- 関連 issue: ISSUE-003 Wave 4
