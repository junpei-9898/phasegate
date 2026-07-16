---
id: WI-268
type: story
severity: high
status: tested
affects: [validator-system]
---

# WI-268: attestation レコードの L3 再検証（ADR-030 §Decision.3.② 第2段・L3 authoritative）

<!-- @work-item-id WI-268 -->

> 起票日: 2026-07-15
> 経緯: WI-258（L2-016）で coverage_report の ✅ 主張に `<!-- @attestation <id> -->` を必須化したが、現状は **参照の存在・形状のみ**を検証している（fast-path）。ADR-030 §Decision.1 の信頼モデル（trust root = L3 CI の再検証）に従い、attestation が指す内容が **本当に実行され PASS したか** を L3 で authoritative に突合するゲートが未実装だった。本 WI は構想時から「stage 2」として予定されていた L3 再検証を実装する。

## スコープ（本 WI で landed）

新 L3 validator **L3-007（coverage-attestation-verification）** を追加する。`docs/product/construction/*/coverage_report.md` の各 `<!-- @attestation <id> -->` 参照を、CI で再生成される requirement-test-matrix（`.harness/requirement-test-matrix.json`）に対して authoritative に突合し、**解決不能な参照（存在しないテストスコープを指す等）を fail-closed で FAIL** とする。

### 突合 vs 再実行のトレードオフ判断

CI では `phasegate:ci-check` の前段で `pnpm test`（全テスト実行）＋ `phasegate:generate-matrix`（テスト corpus からマトリクス再生成）が走る。したがって:

- **素朴な「attestation が指すテストの再実行」は二重実行になる**（防御強度に見合わないコスト）。
- 代わりに **「attestation id が指すスコープが、本ランのテスト corpus から再生成された matrix 上に実在し、テスト参照を 1 件以上持つ」ことの突合**を採る。matrix は本ランのテスト corpus を機械的に走査して生成されるため、「attest されたスコープが現に tracked なテストで裏付けられている」ことを二重実行なしに再検証できる。
- これは L3-004/L3-005 が確立した「matrix を authoritative な evidence 源として突合する」パターンの踏襲であり、実装コスト（低）と防御強度（attestation の空手形＝存在しないテストを指す参照を遮断）のバランスが最良と判断した。

### attestation id → 検証対象の解決

- **id フォーマット = story-id**（例 `H05-02`）。coverage_report の ✅ は特定 story の AC 達成を主張するため、attest 対象は story スコープとする。
- 解決規則: matrix `stories[]` の中に `storyId === <id>` が存在し、その story の `storyMappings[]`（または `acMappings[]`）配下に `testReferences` を **1 件以上**持つこと。存在しない／テスト参照 0 件 → FAIL（fail-closed）。
- **現行レコードとの後方互換**: 現在 coverage_report 内に **実 `<!-- @attestation <id> -->` 参照は 0 件**（全 6 ゲート対象は `ungated-legacy` マーカー）であり、移行対象は無い。よって id フォーマットを story-id と定義しても既存資産を壊さない（additive-safe）。

### 免除セマンティクス（既存維持）

- `<!-- @coverage-gating: ungated-legacy -->` マーカー付きファイルは L3-007 でも対象外（L2-016 と同一の免除セマンティクスを維持）。
- 参照を 1 件も持たない coverage_report は検査対象が無く PASS。

## default-ON / fail-closed の位置づけ

- L3-007 は **default-ON かつ fail-closed**（error tier）。L2-016（bare ✅ 遮断）の authoritative 相棒であり、advisory ではない。
- ただし現 corpus には実 attestation 参照が 0 件のため、導入直後は「検証対象なし → PASS」で緑。将来 ungated-legacy を返済して実 id を付与した時点から突合が効く。
- matrix 不在・parse 不能は fail-closed で FAIL（L3-005 と同規約）。ただし **検査対象の参照が 1 件も無ければ matrix を読みに行かず PASS**（無関係な PJ で matrix 不在でも緑になるよう最小副作用に留める）。

## スコープ外

- attestation レコード（`.harness/attestation.json`）そのものの署名検証は既存 `phasegate:verify-attestation` の責務であり変更しない。
- per-AC 粒度の突合（story 内の個別 AC への binding 検証）は L3-005 の責務であり本 WI では踏み込まない。L3-007 は「参照 id が tracked なテスト evidence に解決できるか」に徹する。
- 実 attestation 参照の付与（ungated-legacy 返済）は別 WI。

## 検証

- targeted テスト green（domain service / adapter / usecase override / 実 corpus 統合）。
- `npx phasegate lint` 0 violations。
- `npx tsx scripts/harness/main.ts validate --layer L2` / `--layer L3` が L3-007 込みで PASS（現 corpus は参照 0 件ゆえ緑）。
- 偽 attestation（存在しない story を指す）を一時的に作って FAIL することの実証（実証後は除去）。
- l0-validator-e2e（T-042）の registry 期待リスト更新。
