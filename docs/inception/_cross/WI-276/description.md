---
id: WI-276
type: chore
severity: medium
status: drafted
affects: [phase-dependency-model]
---

# WI-276: phase-dependency-model の ❌ 格下げ行への実テスト追加と誠実な昇格

<!-- @work-item-id WI-276 -->

> 起票日: 2026-07-16
> 前提: WI-270（`docs/inception/_cross/WI-270/description.md`）が `docs/product/construction/phase-dependency-model/coverage_report.md` の laundering を訂正し、headline を 100% → 68.4%（❌）へ格下げした。旧レポートが根拠に引用した `UT-PD-115〜133` / `IT-PD-088〜102` は捏造 ID で実在しない。WI-275 で同レポートは attestation 返済済み（ungated-legacy マーカー除去）で、新規 ✅ には実在テスト + `<!-- @attestation <story-id> -->` が必須（L2-016 が形状、L3-007 が matrix 実在性を fail-closed 検証）。

## スコープ

quick-implementor（type: chore）。**テスト追加 + coverage_report のドキュメント訂正のみ**。`scripts/harness/` 配下の非テストソースは一切変更しない。

## 調査結果（実ソース照合）

❌ 12 行を実ソース・実テストと突き合わせた結果、大半は「実テストは存在するが捏造 ID で引用され cross-reference が切れていた」ギャップであると判明した。ただし公開 API 経由でテスト不能な 1 行は ❌ のまま残す。

| ❌ 行 | 実態 | 対応 |
|------|------|------|
| AC-PD-03（Level 内上流設計未完了で下流拒否） | 実テスト UT-PD-143〜146 が Level 3 intra-level ブロックを実証済み。cross-ref のみ欠落 | 確認テスト UT-PD-200〜201 追加 + 既存 ID 再束縛して ✅ 昇格 |
| AC-PD-04（設計/plan なしの実装拒否） | 実テスト UT-PD-007〜016 が前提成果物・plan・QA ブロックを実証済み | 確認テスト UT-PD-202〜203 追加 + 既存 ID 再束縛して ✅ 昇格 |
| AC-PD-08（両 Planning Mode で inception plan 成果物を前提化） | UT-PD-013〜016 が interactive/embedded-qa の QA/Q&A 前提を実証済み | 確認テスト UT-PD-204 追加 + 既存 ID 再束縛して ✅ 昇格 |
| AC-PD-11（config.phaseDependencies を読み取り意味論へ正規化） | `harness-config-phase-config-provider.test.ts`（@story H02-01）が preset/policy 正規化を実証。rules 正規化のみ未カバー | 確認テスト（config→policy rules 正規化）UT-PD-205 追加 → ✅ 昇格 |
| AC-PD-12（customRules による依存追加） | UT-PD-025/029〜031 と validate-customization-policy-usecase.test.ts が追加依存適用を実証済み | 確認テスト UT-PD-206 追加 + 既存 ID 再束縛して ✅ 昇格 |
| AC-PD-13（既定依存削除に override:true 必須） | applyCustomization の override 意味論。実 API は override=false で `InvalidCustomRuleError`、非緩和依存で `NonRelaxableDependencyOverrideError`（設計文書の `OverrideRequiredError` は実在しない） | 実 API 準拠の新テスト UT-PD-207〜209 追加 → ✅ 昇格 |
| §4 UseCase 全 5 種 | 5 UseCase の実 unit テストは全て存在し pass（4 件は @story 付き、record-phase-override-audit のみ @story 欠落） | record 用 test に `@story H02-03` 付与。既存実 ID を再束縛して ✅ 昇格 |
| domain: PhaseDependency「recommends は phase-gate 失敗要因にしない」 | checkPhaseGate の recommends→warning 分岐は実在するが、**public API（createDefault / fromGates / applyCustomization）はいずれも `type: 'requires'` のみ生成し、`recommends` エッジを PhaseStructure へ注入する経路が存在しない**。default/standard/minimal/full 定義にも recommends エッジは 1 件も無い | **❌ のまま残置**。公開 API 経由の誠実な実テストが書けない（テストを弱めない）。ソース seam 追加は本 WI スコープ外 |

## 追加テスト

- `phase-structure.test.ts` に実 API 準拠の確認テスト（UT-PD-200〜209）を追加（AAA / 日本語名 / ドメインモデルのモック無し）。捏造範囲 115〜133 は再利用せず、既存最大（177）と重複しない 200 番台を採番。
- `record-phase-override-audit-usecase.test.ts` に `@story H02-03` を付与し matrix 可視化。

## 昇格結果（headline 再計算）

- 分子（✅ 行）: AC 9 → 15、domain 17 → 17（recommends 行は ❌ 維持）、UseCase 0 → 5。
- 分母: AC 15 + domain 18 + UseCase 5 = 38。
- ✅ 合計 = 15 + 17 + 5 = 37。**68.4%（26/38）→ 97.4%（37/38）**。残 ❌ は recommends 1 行のみ。

## 未解決事項

- recommends-not-blocker 行（domain）: 公開 API に recommends エッジ注入経路が無いため実テスト不能。誠実に ❌ 維持。将来 seam を設ける story WI で解消する。

## 検証コマンド

- `vitest run --config scripts/harness/__tests__/vitest.config.ts phase-dependency-model` — 全 green（before/after 件数を報告）。
- `phasegate:generate-matrix` 再生成後、`validate --layer L2` PASS / `validate --layer L3` で L3-007 が新 attestation 込みで PASS（L3-004/L3-005 も維持）。
- `npx phasegate lint` 0 violations。
