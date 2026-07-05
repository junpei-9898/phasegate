---
id: WI-230
type: chore
severity: normal
status: tested
affects: [docs, adr-foundation]
---

# WI-230: §12 Key Decisions の遡及 ADR 作成（ADR-022..029）＋ステータスドリフト整合

> 起票日: 2026-07-05
> 経緯: WI-229 が是正した「H05-02 §12 決定の ADR 不在」追跡債務のうち、8 決定の ADR 新規作成と status 整合を実施（documentation honesty follow-through）。

## 背景

WI-229 は `coverage_report.md` の over-claim を実態へ訂正し、§12 Key Decisions 11 決定のうち 8 決定が実 `docs/ADR/` に ADR として不在であること、および §12 と in-code 定義配列の status 不一致を documented gap として残した。本 WI はその追跡債務を、AI 非依存の反ロンダリング原則（各 ADR は §12 決定ログ＋実装証跡に基づき TRUE であること）を守って解消する。

## 作業内容（docs-only）

### 1. ADR-022..029 新規作成（遡及正規化、date 2026-03-11 / status Accepted）

§12 の "Last updated: 2026-03-11" を決定ログの日付として採用（legacy-ADR 正規化と同じ規約）。

- **ADR-022 パッケージ分離** — Quality Harness / Orchestration（marker `package-separation`）
- **ADR-023 ESLint→Biome 全面移行**（marker `eslint-to-biome`）。証跡: `biome-ast-engine/.../verify-eslint-removal-usecase.ts`（`LegacyEslintArtifactDetectedError`）
- **ADR-024 K1-K13 の品質ハーネス帰属**（marker `k-requirements-quality-ownership`）
- **ADR-025 FUSE Hooks Engine は v1 スコープ外**（marker `fuse-out-of-scope`）。HONEST EVOLUTION: L0 は FUSE ではなく hooks engine（`agent-integration` + Husky）で実現、FUSE は依然 defer
- **ADR-026 Nyquist 統合**（marker `nyquist-truths-artifacts`）。証跡: `validator-id.ts` L3-004=nyquist
- **ADR-027 成果物駆動の状態導出**（marker `artifact-driven-state`）。証跡: `harness-api/.../status-derivation-service.ts`
- **ADR-028 バリデータ無限ループ防止 — スタック検出**（marker `validator-stack-detection`）。証跡: `ci-governance` H13-02（RepetitionDetector 他）+ stop-hook ReentryGuard。§12 では当初 Pending → 実装済みのため Accepted
- **ADR-029 L0 4層→5層復帰パス**（marker `four-to-five-layer-path`）。HONEST EVOLUTION: 5層復帰は達成済み（`docs/guide/layer-model.md`）

各 ADR の `## Context` に machine-matchable な `> §12 Key Decision: <key>` 行を 1 行だけ埋め込み。

### 2. 既存 ADR への marker 付与

- ADR-007 → `config-file-separation`
- ADR-008 → `quick-mode-eligibility`
- ADR-010 → `harness-error-fix-example`

### 3. ステータスドリフト整合

- `harness_product_overview.md` §12: 決定 #10（スタック検出）Status を Pending → Decided（ci-governance H13-02 実装反映）。Last updated に整合ノートを追記。
- `construction/adr-foundation/it_test_design.md` IT-AF-094: #4 (FUSE)/#8 (Nyquist)/#11 (4→5 layer) を Proposed → Accepted（§12＋実装と一致させる）。#10 は Accepted のまま。

## 検証

- `validate-adr --all`: 29 件（001-029）全て PASS。
- `npm run test`: 547 files / 4123 tests 全緑（corpus test の membership floor は据え置きで成立、floor 拡張不要）。
- `tsc --noEmit`: エラーなし。

## FOLLOW-UP（別タスク）

- **ADR-001 の "four-layer-defense-model"（K1=4層）は出荷済みの 5層現実に遅れている。** ADR-029 で 5層復帰達成を明記したが、ADR-001 本体の見直しは別途行う。

## スコープ外

- 本 WI は H05-02 の AC-1 テスト（§12 marker の per-AC binding）追加・`@ac` タグ付与・`phasegate.config.json`/`acBoundStories` 変更を **行わない**。これらは次コミットのスコープ。
- 本 WI は AC-1 の実コーパス membership 検証を UNBLOCK するが、H05-02 gating そのものはまだ実施しない。
