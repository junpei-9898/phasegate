---
id: WI-232
type: chore
severity: normal
status: drafted
affects: [docs]
---

# WI-232: l3-004 ratchet の stale な per-AC ギャップ記述を解決済みへ訂正

> 起票日: 2026-07-05
> 経緯: WI-225（H06-03 AC-4 source 修正）と WI-230/231（H05-02 per-AC binding）で既に閉じた 2 件の per-AC ギャップが、`l3-004-traceability-ratchet.md` では依然 OPEN として記述されたままだった。反ロンダリング原則（真であることのみ述べる）に基づき、解決済みへ訂正する。

## 背景

`docs/inception/_shared/l3-004-traceability-ratchet.md` の §6（既知の限界と残存 per-AC ギャップ）および R5 行・総括には、以下 2 件が未解決の per-AC ギャップとして記載されていた:

- **H06-03 AC-4**: `SeverityDowngradeViolationError` メッセージに ADR 参照が無い genuine な source ギャップ。→ 実際には手3a-1 / WI-225 / v0.169.0 で `severity-downgrade-violation-error.ts` に `根拠: ADR-021` を追加して解決済み（ADR-021 = `docs/ADR/021-severity-contract.md` 実在）。
- **H05-02 AC-1/2/3(/4)**: legacy ADR コーパス gate 不可視のため per-AC binding を deferred し「L3-005 スコープに含めない」と記載。→ 実際には WI-230（§12 Key Decisions 全 11 件を専用 ADR 起票）+ WI-231（`real-adr-corpus.it.test.ts` に `@ac H05-02-1/-2/-3/-4` 付与）/ v0.175.0-v0.176.0 で per-AC binding 済み。

現行 `phasegate.config.json` の `layers.L3.acBoundStories` = `["HF2-05", "H06-03", "H05-02"]` で 3 story とも fileFallbackOnly===0 の ac-bound。

## 作業内容（docs のみ）

`docs/inception/_shared/l3-004-traceability-ratchet.md` を訂正:

1. **R5 行**: 「§6 の既知 per-AC ギャップ… fileFallbackOnly として正直に露出」に「後日解決」注記を追加（R5 の歴史的意味＝advisory 追加時点は改変せず、後日解決の事実を追記）。
2. **§6 (b) H05-02 バレット見出し + 結論文**: 「✅ 解決済み（WI-230/231）」を明示。当初 WI-226 honest-partial からの経緯記録は保持しつつ、per-AC binding へ昇格し L3-005 スコープで fileFallbackOnly===0 となったことを記述。「L3-005 に含めない」旨の stale な結論を撤回。
3. **§6 (b) H06-03 AC-4 バレット**: 「✅ 解決済み（手3a-1 / WI-225 / v0.169.0）」を明示。ギャップが何だったか（歴史的記録）は保持し、`根拠: ADR-021` 追加による解決を明記。
4. **総括**: H06-03 AC-4 / H05-02 を「今後の個別対応対象」から外し解決済み exemplar として記述。

## 保持した一般的事実（over-claim 回避）

R4 の「336/336 linked」は「各 Story に ≥1 件のタグ付きテストが存在する」ことを意味し「各 AC が個別・意味論的に検証されている」ことは意味しない、という一般的限界はそのまま保持。名指し 2 例は先行して ac-bound 化された少数例にすぎず、**大多数の AC は依然 file-level（story-level）リンクのまま**であり、L3-005 スコープ外の全 AC の per-AC 検証は引き続き future work、と明記した。§6 (a)（ファイル単位トレーサ）・(b) H07/H09・(c) skill/markdown 系の記述は真のまま無変更。

## スコープ外

- `l3-005-ac-bound-ratchet.md`（既に正確）・scripts/harness/ source / tests / `phasegate.config.json` / ADR は一切変更しない。docs 訂正のみ。

## 検証

- ground truth を grep で確認: `severity-downgrade-violation-error.ts:9` に `根拠: ADR-021`、ADR-021 実在、`real-adr-corpus.it.test.ts` に `@ac H05-02-1/-2/-3/-4`、config acBoundStories 3 story。
