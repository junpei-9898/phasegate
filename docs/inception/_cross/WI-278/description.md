---
id: WI-278
type: chore
severity: medium
status: tested
affects: [traceability-model]
source: internal
---

# WI-278: traceability-model coverage_report の ❌ 格下げ 6 行への実テスト付与と誠実な ✅ 昇格

> 起票日: 2026-07-16
> 起票経緯: WI-270 の反ロンダリング訂正で `docs/product/construction/traceability-model/coverage_report.md` は 100% → 81.3%（⚠️）に格下げされ、6 行（§3 の VO 5 種 StoryId / ProjectRelativePath / MetadataTag / UnitReference / LayerReference と §2 AC 3.3-4）が ❌ となった。原因は「実在しないテストケース ID（`UT-TM-001〜041`, `IT-TM-105`）を カバー印 の根拠に引用した水増し」。本 WI はこれらの ❌ 行を、実在・pass するテストで誠実に裏付けて ✅ へ昇格することを目的とする。

## 背景

- `docs/product/construction/traceability-model/unit_test_design.md` は §3.1〜3.5 で `UT-TM-001〜041` を、上記 5 VO の各テストケースに**設計上割り当て済み**である。すなわち ID は「欠番」ではなく「設計されたが対応テストコードに ID マーカーが付与されていない」状態だった。
- 5 VO の単体テストファイルは実在し、全て pass する（`story-id.test.ts` / `project-relative-path.test.ts` / `metadata-tag.test.ts` / `unit-reference.test.ts` / `layer-reference.test.ts`）。しかし `// UT-TM-NNN` ID マーカーと file-level `@story` マーカーが欠落しており、requirement-test-matrix にも coverage_report にも紐づいていなかった。
- attestation ゲート（L2-016 形状 / L3-007 実在）は `<!-- @attestation <story-id> -->` を要求し、当該 story-id が matrix 上で `testReferences >= 1` に解決できることを fail-closed で検証する。

## スコープ

1. 5 VO テストファイルに、設計済み `UT-TM-001〜041` の ID マーカーと file-level `// @story H03-01` を付与する。設計にあるが現テストに欠けているケースは AAA・日本語テスト名で追加実装する（ソース修正なし）。
2. `coverage_report.md` の裏付け済み VO 行を、実 ID + `<!-- @attestation H03-01 -->` で ✅ 昇格し、headline を再計算する。
3. ソースに機能ギャップがある行（`ProjectRelativePath` の許可外ルート拒否 = UT-TM-015 相当）は誠実に ❌/未実装として残置し、テストを弱めない。
4. AC 3.3-4（nyquist トレーサビリティ）はソース側の統合テスト整備が必要で本 chore のスコープ外のため ❌ を維持する。

## 除外

- ソースコード（`scripts/harness/traceability-model/` 配下の非テスト）の機能追加・修正。
- AC 3.3-4 の nyquist 統合テスト新規実装（別 WI）。
