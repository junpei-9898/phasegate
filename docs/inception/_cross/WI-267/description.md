---
id: WI-267
type: chore
severity: high
status: drafted
affects: [validator-system]
---

# WI-267: ungated-legacy coverage_report 6 件の誠実返済 — 検証結果と honest stop

<!-- @work-item-id WI-267 -->

> 起票日: 2026-07-15
> 経緯: WI-258（L2-016 coverage-attestation-gating）で ✅ 主張には `<!-- @attestation <id> -->` が必須になった。既存 6 ファイルは `<!-- @coverage-gating: ungated-legacy -->` マーカーで免除中（常時 warning）。本 WI はこの 6 件を実テストで再検証し、可能な限りマーカーを外して誠実返済することを狙った。

## 結論（先出し）: 返済 0 件 — honest stop

**マーカーを 1 件も除去しなかった。** 除去は捏造なしには不可能と判明したため、捏造を避けて honest stop する。理由は 2 つ、いずれも単独で返済をブロックする:

1. **正規の attestation 発行・検証メカニズムが存在しない（設計上 L3 / 別 WI に繰延）。**
2. **6 件はいずれも「テスト実行」カバレッジではなく「テストロジック設計」カバレッジのレポートであり、そもそも attestation の対象になり得ない。加えて 6 件中 5 件は実在しないテストケース ID を ✅ 根拠として引用している（laundering）。**

## 1. attestation メカニズムの実態（設計・実装の確認）

ADR-030 §Decision.3.② と WI-258 inception・validator-system 実装を精読した結果:

- ADR-030 §Decision.3.② は「`phasegate:attest` を**拡張**し、coverage_report の主張を attestation で裏付ける」「✅ には attestation ID が必須」「**L3 が evidence を再実行**して真偽を確かめる（authoritative）」と定める。
- しかし WI-258 は明示的にスコープを縮小している（description §「attestation ID の解決」/ logical_design §Anti-laundering rationale）:
  - L2-016 は **参照の存在・形状（bare ✅ の遮断）のみ**を検証する。`file-system-coverage-attestation-gating-adapter.ts` は `/<!--\s*@attestation\b/` の有無を見るだけで、**`<id>` が実在レコードを指すか・pass しているかは一切検証しない**。
  - attestation レコードとの authoritative 突合（ID がレコードに実在し pass しているか）は **L3 / 別 WI に縮小**（=「L2-016 第 2 段の再実行検証」）。
- 既存 attestation 基盤（`scripts/harness/attestation/`）は **単一の ci-gate-run レコード**（`.harness/attestation.json`、`signature.attestationDigest` で封印、`acBoundScope` に story-id）。`ProduceAttestationInput` に coverage-report / AC-id パラメータは無く、**per-coverage-report / per-AC の ID を発行するコマンドも store も存在しない**。`package.json` に `phasegate:attest` script も無い。

### 帰結

正規に coverage_report の ✅ へ付与できる attestation `<id>` の**発行元が存在しない**。仮に `<!-- @attestation <id> -->` を手で書けば L2-016 は形状チェックのみなので warning は消えるが、その `<id>` は**何も指さない prose** であり、bare ✅ と同じ laundering になる。しかも fabricated ID を捕捉する第 2 段（L3 再実行）が未実装のため、誰にも検出されない。これは品質防御の意図的無効化に等しく、絶対に行わない。

## 2. 各 unit の ✅ 主張 実テスト再検証

6 件はいずれも **テストロジック「設計」フェーズ**の coverage_report（headline は全て「テストロジック設計に進む」＝テスト未実装時点の設計網羅率）。`✅` は「その AC に対応するテストケースが**設計済み**」の意味であって「実装済み・pass するテストが存在」ではない。harness-error §7 が典型: 「258 ケースを実装する」と将来形で明記。

各 unit で、レポートが ✅ 根拠として引用するテストケース ID が実テストファイルに実在するか（`grep -rl`）と、実スイートの pass 数を検証した。

| unit | headline | 実スイート結果 (exit 0) | 引用 ID 実在性 | 検証結果 |
|------|----------|----------------------|--------------|---------|
| harness-error | ✅ 100% | Tests 202 passed (202) | 改善根拠 IT-HE-137〜146・UT-HE-112 が全て不在（実在は IT-HE-093 / UT-HE-127 まで） | **偽 / 検証不能** |
| regression-suite | ✅ 100% (55項目/195ケース) | Tests 147 passed (147) | IT-REPO-* / IT-API-* 計 23 件が全て不在。UT-RS 実在最大 156 vs 引用 174 | **偽** |
| phase-dependency-model | ✅ 100% | Tests 347 passed (347) | 引用 215 件中 115 件不在。100%到達の根拠 UT-PD-115〜133・IT-PD-088〜102 が全て不在 | **偽** |
| traceability-model | ✅ 100% | Tests 272 passed (272) | 引用 174 件中 78 件不在。§6 改善根拠 IT-TM-105 不在（UT-TM-001〜041 も全欠） | **偽** |
| skill-quality | ⚠️ 72.6%（自己訂正済） | Tests 209 passed (209) | 過去の偽 98.4% は WI-234/235/241 で訂正済。残 ✅ の UT-* domain ID の大半は annotation 不在（IT-UC-* / UT-SISkill-* のみ実在） | **一部真 / traceability 検証不能** |
| ci-governance | 自己訂正済（85%/92% + INV-10/AC-2/AC-4 ⚠️） | Tests 293 passed (293) | 引用 ID 全件実在（WI-247 remediation の WI031/032/182/183・real-corpus test 含む） | **真（訂正後の残 ✅ は実 pass テストで裏付け）** |

要点:
- **偽/検証不能 4 件（harness-error, regression-suite, phase-dependency-model, traceability-model）**: 実スイートは pass するが、それは実在する UseCase/VO テストが通るためであり、レポートが ✅ の根拠に挙げる Infrastructure Adapter / Handler / 「100%到達の追加ケース」の ID は**軒並み実在しない**。coverage-report-laundering（MEMORY: coverage-report-laundering-systemic）の実例。
- **skill-quality**: レポート本体が既に自己訂正済み（過去の偽 ✅ 98.4% を取消し）。実スイートは pass するが、残 ✅ の domain ID は annotation として存在せず ID→test の traceability は検証不能。
- **ci-governance**: 唯一、残 ✅ が全て実在・pass テストで裏付けられ、偽っていた分は既に ⚠️ へ格下げ済み。しかし後述の通りこれも「設計」カバレッジであり attestation 対象外。

## 3. なぜ ci-governance / skill-quality すら attest できないか

ci-governance の残 ✅ は「実在し pass するテスト」で裏付けられるが、**それでも attest できない**:

- レポートの ✅ は依然「テストロジック設計フェーズの設計網羅率」であり、attestation が封印する ci-gate-run（validator 実行結果）とは**カテゴリが異なる**。ci-run attestation の `<id>` を設計網羅 ✅ に貼るのは category error（実行証跡で設計主張を裏付けたことにする偽装）。
- そもそも §1 の通り per-coverage-report ID を発行する正規メカニズムが無い。

## 4. スコープと成果物

- 本 WI は**ドキュメント検証 chore**（quick-implementor プロセス）。ソースコード（`scripts/harness/`）は一切変更しない。
- 成果物 = 本 inception（6 unit の 真/偽/検証不能 内訳と honest-stop の根拠記録）。
- **6 件のマーカーは全て保持**（除去 0）。ungated-legacy warning は 6 件のまま。これは隠蔽ではなく「見える負債」の正しい維持。

## 5. 未解決事項（フォローアップ提案）

honest-stop により以下が open のまま。別 WI で扱うべき:

1. **正規 attestation 発行メカニズムの新設**（ADR-030 §Decision.3.② の「`phasegate:attest` 拡張」+ L2-016 第 2 段 = L3 再実行 authoritative 検証）。これが無い限り誠実返済は原理的に不可能。
2. **coverage_report の意味論の是正**: 現行 6 件は「設計網羅率」だが ✅ が「実装済み pass テスト」と誤読され得る。設計フェーズ成果物であることをレポート形式で明示するか、実行カバレッジへ置換する設計判断が必要。
3. **laundering 4 件（harness-error / regression-suite / phase-dependency-model / traceability-model）の実態修正**: 実在しないテスト ID を根拠にした ✅ を、skill-quality / ci-governance が既に行ったように実態（⚠️/❌ と実在 ID）へ訂正する返済 WI。本 WI では ✅ の除去・書換え自体を行っていない（検証と記録に留めた）。

## 検証コマンド

- `npx tsx scripts/harness/main.ts validate --layer L2` — L2-016 warning 件数 before=6 / after=6（返済 0 のため不変。総合判定 PASS）。
- 各 unit 実スイート: `npx vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/<unit> scripts/harness/__tests__/integration/<unit>`（結果は §2 表、全 exit 0）。
