---
id: WI-270
type: fix
severity: high
status: drafted
affects: [validator-system]
---

# WI-270: laundering が確定した coverage_report 4 件の実態訂正

<!-- @work-item-id WI-270 -->

> 起票日: 2026-07-15
> 前提: WI-267（`docs/inception/_cross/WI-267/description.md`）が ungated-legacy な coverage_report 6 件を実テスト再検証し、4 unit で「実在しないテストケース ID を根拠にした ✅ 100% 主張」（laundering）を確定させた。本 WI はその 4 件の実態を正直に訂正する返済 WI である。skill-quality / ci-governance は既に自己訂正済みで、その訂正様式（fabricated ID 除去 + ⚠️/❌ 格下げ + 訂正履歴節）が本 WI の前例。

## 対象 4 unit と laundering の実態（WI-267 verdict）

| unit | 訂正前 headline | laundering 内容 |
|------|----------------|----------------|
| harness-error | ✅ 100%（総合 42/0） | 83%→100% の改善根拠 IT-HE-137〜146・UT-HE-112 が全て不在（実在は IT-HE-093 / UT-HE-127 まで）。加えて §2〜§6 の多数の cited ID が不在 |
| regression-suite | ✅ 100%（総合 55/0） | Infrastructure Adapter（IT-REPO-*）7 種・統合フロー（IT-API-*）4 種の cited ID が全て不在。UT-RS も一部不在 |
| phase-dependency-model | ✅ 100%（総合 43/0） | 100% 到達の根拠 UT-PD-115〜133・IT-PD-088〜102 が全て不在。UseCase 節の IT-PD-* も全滅 |
| traceability-model | ✅ 100%（総合 32/0） | 実在は UT-TM-042〜123 / IT-TM-001〜029 + IT-TM-106 のみ。UT-TM-001〜041・IT-TM-040〜105（106 除く）は不在。§2 逆引き・nyquist（IT-TM-105）・§3 の VO 節が全滅 |

## 検証手法

各レポートが ✅ 根拠として引用する全テストケース ID を、範囲表記（`〜` / `-`）を個別 ID に展開したうえで `grep -rlF "<ID>" scripts/harness/__tests__/` で全数照合した。実在するテストは以下の authoritative インベントリ（実 grep）を正本とする:

- harness-error: 実在 IT-HE-001〜093（欠番あり）/ UT-HE-001〜127（欠番あり）。IT-HE-094 以降・UT-HE-128 以降は不在。
- regression-suite: IT-REPO-* / IT-API-* prefix は 1 件も実在しない。実在は UT-RS-* と IT-UC-* の一部。
- phase-dependency-model: 実在 UT-PD は 114 まで、IT-PD は 067 まで（欠番あり）。UT-PD-115 以降・IT-PD-068 以降は不在。
- traceability-model: 実在 UT-TM-042〜123 / IT-TM-001〜029 + IT-TM-106。それ以外の TM ID は不在。

## 訂正方針（前例準拠・機械検証可能ルール）

1. **実在しない ID の引用を全行から除去する**（訂正後に再 grep して 0 件を確認）。テストコードは一切変更しない。
2. 各 cited 行のカバー状態を実態へ格下げする:
   - 実在する ID が 1 件も残らない行 → `❌`（実装テスト不在・設計のみ）。
   - 実在 ID が残るが、除去した fabricated ID が当該 AC/観点の主要根拠（Adapter/Handler/統合/回帰/100%到達の追加ケース）だった行 → `⚠️`（ドメイン/VO ロジックは実テスト済みだが、主張していた完全カバーは fabricated テストに依存していた）。
   - 実在 ID のみで当該行の主張が成立し、除去分が範囲端点等の軽微な欠番のみの行 → `✅` を維持（実 ID のみ残す）。
3. **headline の 100% を実態（✅ のみを分子とした数値）へ訂正**し、分母・分子の計算根拠を明記する。
4. 各ファイルに訂正履歴節を追記し `<!-- @work-item-id WI-270 -->` を付す（skill-quality の自己訂正様式に倣う）。
5. **ungated-legacy マーカーは 6 件とも維持**（attestation 発行機構が未実装のため。WI-267 §5 の結論に従う）。✅ を新規に「追加」しない。

## 実スイート pass 数（verbatim・全 exit 0、WI-267 と一致）

- harness-error: `Test Files 20 passed (20) / Tests 202 passed (202)`
- regression-suite: `Test Files 22 passed (22) / Tests 147 passed (147)`
- phase-dependency-model: `Test Files 42 passed (42) / Tests 347 passed (347)`
- traceability-model: `Test Files 40 passed (40) / Tests 272 passed (272)`

実スイートが pass するのは実在する UseCase/VO テストが通るためであり、レポートが ✅ 根拠に挙げた不在 ID とは無関係（WI-267 §2 の帰結どおり）。

## スコープ

- 本 WI は quick-implementor プロセスの **docs 訂正**（type: fix）。`scripts/harness/` のソース・テストは一切変更しない。
- 成果物 = 4 coverage_report の実態訂正 + 本 inception。
- 6 件の ungated-legacy マーカーは全保持（見える負債の正しい維持）。

## 検証コマンド

- `npx tsx scripts/harness/main.ts validate --layer L2` — L2-016 warning は 6 件のまま（返済 0・マーカー維持のため。総合判定 PASS が期待値）。
- 訂正後、各レポートに実在しない ID の引用が 1 件も残っていないことを再 grep で機械確認。

## 未解決事項（WI-267 から継承）

1. 正規 attestation 発行・検証メカニズムの新設（ADR-030 §Decision.3.② の `phasegate:attest` 拡張 + L3 再実行検証）。これが無い限りマーカー除去は原理的に不可能。
2. coverage_report の意味論是正（設計網羅率 vs 実行カバレッジ）。
3. 本 WI で ❌/⚠️ に格下げした AC への実テスト追加（後続 story-implementor フェーズ）。
