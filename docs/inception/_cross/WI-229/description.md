---
id: WI-229
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-229: coverage_report.md の誤った網羅主張（H05-02 §12 決定 8/11 の ADR 不在）を訂正する

> 起票日: 2026-07-05
> 経緯: `docs/product/construction/adr-foundation/coverage_report.md` の H05-02「§12 Key Decision」行が、実態と乖離した「カバー」主張を掲げていたことの是正（documentation honesty correction）。

## 背景（何が誤っていたか）

`coverage_report.md` は H05-02 の「§12 Key Decisions」11 決定を、それぞれ ADR として作成済み＝**すべて「カバー」**と記載していた。根拠として各行に IT-AF-015 / IT-AF-090 / IT-AF-094 を引用していた。

しかしこれらのテストは `SeedInitialAdrsUseCase` の in-code「初期11件ADR定義配列」を fixture/mock/論理設計 §5.5 の仕様と照合するのみで、**実 `docs/ADR/` コーパスに当該 11 決定を記録した ADR が実在すること**を一切アサートしない。すなわち「防御プリセットの網羅」を装いつつ、実コーパスの成果物（AC の求める outcome）を検証していない over-claim だった。

補足: SeedInitialAdrsUseCase と IT-AF-015/090/094 は現状 `scripts/harness/` に実装が存在せず、`it_test_design.md` の設計定義のみ。実在するのは `real-adr-corpus.it.test.ts` だが、同ファイルは自身のコメントで H05-02 AC-1/2/3 への per-AC binding を明示的に scope 外と宣言している。

## 検証結果（§12 権威ソース × 実コーパス突合）

権威ソース: `docs/product/harness_product_overview.md` §12「Key Decisions」（11 行）。実コーパス: `docs/ADR/001-021`（全 Accepted）。

- **カバー済み（3/11、実 ADR として記録あり）**:
  - #5 HarnessError に fix_example 必須化 → **ADR-010**（専用）
  - #6 Quick Mode 適用条件の厳格定義 → **ADR-008**（専用）
  - #7 設定ファイル分離（phasegate.config.json / orchestration.config.json）→ **ADR-007** の「パッケージ分離」サブセクションに fold（専用 ADR ではない）
- **未カバー（8/11、ADR 不在＝要作成）**: #1 パッケージ分離（Quality Harness/Orchestration のパッケージ境界。ADR-007 は設定ファイル分離のみ記録）／#2 ESLint→Biome 全面移行／#3 K1-K13 全て品質ハーネス側帰属／#4 FUSE Hooks Engine は v1 スコープ外（`grep -rli fuse docs/ADR/` = 0 件）／#8 Nyquist 統合（GSD-2 Truths/Artifacts。ADR-003 は L3 validator を定義するが統合決定は未記録）／#9 成果物駆動の状態導出／#10 スタック検出／#11 L0→4層一時定義→5層復帰パス

## ステータス不一致（AC-3 のギャップ）

§12 と in-code 定義配列（IT-AF-094 が照合する 論理設計 §5.5 の想定）で、どの決定が決着済みかが食い違う:

| 決定 | §12 Status | in-code 配列 status |
|------|-----------|--------------------|
| #4 FUSE スコープ外 | Decided | Proposed |
| #8 Nyquist 統合 | Decided | Proposed |
| #10 スタック検出 | **Pending** | Accepted |
| #11 L0→5層復帰 | Decided | Proposed |

AC-3 の「Decided→Accepted / 検討中→Proposed」写像を一貫適用できないため、AC-3 も未達（ギャップ）。

## 作業内容（docs-only）

1. `coverage_report.md` §2 の H05-02 §12 決定 8 行を「カバー」→「未カバー」に訂正し、対応テストケース欄を「IT-AF-015/090/094 は SeedInitialAdrs のロジックのみ検証。docs/ADR/ に当該決定を記録した ADR は不在」等の正直な記述へ差し替え。
2. カバー済み 3 行（#5/#6/#7）は「カバー」を維持しつつ、根拠を実 ADR（ADR-010 / ADR-008 / ADR-007-fold）＋実コーパス conformance 経路へ訂正（#7 は fold であることを明示）。
3. AC-3（status 写像）行を「カバー」→「未カバー」に訂正し、ステータス不一致を documented gap として記録。
4. §1 サマリーを再計算: 受け入れ基準 22/1（95.7%）→ 13/10（56.5%）、総合 67/3（95.7%）→ 58/12（82.9%）。9 行が反転（§12 決定 8 + AC-3 status 1）。
5. §5 未カバー項目一覧に H05-02 AC-1／AC-3 のセクションを追加、§7 次のアクションを訂正後の現実（8 ADR 作成 + status 整合）に更新。

## 結論・追跡債務

- **H05-02 AC-1 は未達**。8 件の ADR を新規作成する必要がある（#10 は §12 が Pending のため先に決定の確定要）。
- **H05-02 AC-3 は未達**。§12 と in-code 配列の status を（§12 を正として）整合させる必要がある。
- 本 WI は誤った網羅主張を実態へ合わせただけであり、**品質ゲートは一切緩めていない**。未達は追跡債務として明示的に残す。ADR の新規作成・テスト実装・ゲート変更は本 WI のスコープ外（別タスクへ deferred）。

## スコープ外（deferred）

- 未記録 8 決定の ADR 新規作成。
- §12 決定 membership を実コーパスに対して検証するテストの追加（`real-adr-corpus.it.test.ts` 拡張 / per-AC binding 昇格）。
- `phasegate.config.json` / `acBoundStories` の変更、`@ac` タグ付与。
