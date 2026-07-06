---
id: WI-233
type: chore
severity: normal
status: tested
affects: [docs]
---

# WI-233: ADR-001 を 5層防御の現実と整合（AMEND）＋誤解を招く slug を改名

> 起票日: 2026-07-07
> 経緯: ADR-029（L0 4層→5層復帰パス）/ WI-230 で、ADR-001 が「K1（4層防御モデル）」という v1 時点の層数を前提に記述されたまま残っており、shipped 済みの 5層（L0-L4）現実と乖離している点がフォローアップとして flag された。反ロンダリング原則（真であることのみ・追記のみ）に基づき、supersede ではなく AMEND で整合を取る。

## 背景

`docs/ADR/001-four-layer-defense-model.md`（当時の slug）は、L1（Editor-Time）で Biome AST による 8 ルール強制を定める ADR である。その Decision 本体は現行でも不変だが、

- title / slug が「4層防御モデル」を名乗り、実際の中心的決定（L1-Biome 8 ルール強制）を隠していた。
- 「関連要件」に v1 時点の「K1（4層防御モデル）」がそのまま残り、L0 追加後の 5層（L0-L4）現実と乖離していた。

## 作業内容（docs のみ）

1. **AMEND（forward-pointer 注記）**: Consequences 直後に日付付き補記（2026-07-05）を追加し、K1 の「4層」が v1 時点の層数であること、その後 L0（FUSE は defer、hooks engine として実現）が加わり 5層（L0-L4）へ復帰したこと、経緯は ADR-025（FUSE Hooks Engine は v1 スコープ外）/ ADR-029（L0 4層→5層復帰パス）を参照すること、本 ADR の決定（L1 の 8 ルールを Biome AST で強制）は現行で不変であることを明記。「関連要件」の K1 行にも `（現在は 5層 L0-L4、ADR-029 参照）` を注記。
2. **status は Accepted を維持（supersede は却下）**: ADR-001 の中心的決定は現行の L1-Biome 8 ルール強制そのものであり、依然として有効。Superseded にマークするとコーパスの AC-3 status テスト（status ∈ {Accepted, Proposed} を要求）が破綻するため、supersede は不採用とした。決定内容が変わらない以上、AMEND（追記）が正しい正規化手段。
3. **誤解を招く slug の改名**: `001-four-layer-defense-model.md` → `001-l1-biome-editor-time-enforcement.md`。id は prefix `001-` により保持（`validate-adr` は id 001 として引き続き発見可能）。
4. **live inbound リンク sweep**: 現行の live 参照は全て更新済み。`adr-gate-normalization-followup.md:21` の legacy 形式参照（`ADR-001-four-layer-defense-model.md`）は、正規化前の phantom-ADR 問題を説明する**歴史的記録**（CHANGELOG 履歴と同じ扱い）のため意図的に保持。

これにより ADR-029 / WI-230 で flag されたフォローアップを閉じる。

## スコープ外

- ADR-001 の adr_id / status / Decision 本体は変更しない（§12 マーカーも付与しない）。scripts/harness/ source / tests / `phasegate.config.json` は一切変更しない。docs のみ。

## 検証

- `npx tsx scripts/harness/main.ts validate-adr --all` が 29/29 pass、ADR-001 が id 001 として発見可能なこと。
- `npm run test` green（`real-adr-corpus.it.test.ts` の membership floor が '001' を pin、status ∈ {Accepted, Proposed} を assert、いずれも成立）。
