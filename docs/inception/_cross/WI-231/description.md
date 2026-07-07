---
id: WI-231
type: chore
severity: normal
status: tested
affects: [docs]
---

# WI-231: H05-02 AC-1/2/3/4 の per-AC binding ＋ L3-005 を H05-02 へ拡張（fully ac-bound）

> 起票日: 2026-07-05
> 経緯: WI-229 が明示追跡し WI-230 が UNBLOCK（ADR 起票）した「H05-02 §12 決定 gating」債務を、per-AC binding + L3-005 スコープ拡張で正規に返済する。

## 背景

WI-229 は `coverage_report.md` の over-claim を実態へ訂正し H05-02 AC-1 未達を明示追跡した。WI-230 は §12 Key Decisions 11 決定を全て専用 ADR として起票（ADR-022〜029 + 既存 ADR-007/008/010 に marker 付与）し、status ドリフトを整合させ、実コーパス membership 検証を UNBLOCK した。本 WI はその上で H05-02 を genuinely gated story へ昇格させる（AI 非依存の反ロンダリング原則: 各 `@ac` タグは真に当該 AC を検証するテストにのみ付与、各カバー宣言は真にカバー済みのもののみ）。

## 作業内容（test + config + docs）

### 1. AC-1 presence テスト追加（`real-adr-corpus.it.test.ts`）

新規 `it()`「§12 Key Decisions全11件が起票済みで各keyがdiscoverableかつschema-validなADRに解決する」（`@ac H05-02-1`）を追加。実 `docs/ADR/` の各 ADR raw markdown から `> §12 Key Decision: <key>` marker（正規表現 `/^>\s*§12 Key Decision:\s*(\S+)\s*$/m`）を収集し、11 canonical key 全件の実在をアサート（欠落時は欠落 key を名指しで fail）。さらに各 key が discovery（`FileSystemAdrRepository.findAll`）+ schema-valid（`validate-adr --all` payload の `valid===true`）な ADR に解決することを fail-closed で検証。in-code 配列ではなく実コーパスをアサートする。

### 2. AC-2/3/4 の per-AC binding（既存テストへタグ付与）

- `@ac H05-02-2` → conformance テスト（発見された全 ADR がテンプレート構造に準拠する）
- `@ac H05-02-3` → status テスト（全 ADR の status ∈ {Accepted, Proposed}）
- `@ac H05-02-4` → discovery テスト（canonical ADR を発見し frontmatter が解析可能）

各タグは、その AC を真に検証するテストの `it()` に付与している（tracer は直近先行 `it()` へ束縛）。

### 3. L3-005 スコープ拡張

`phasegate.config.json` → `layers.L3.acBoundStories`: `["HF2-05", "H06-03"]` → `["HF2-05", "H06-03", "H05-02"]`（既存順を保持し append）。H05-02 の全 AC が fileFallbackOnly===0 で L3-005 は fail-closed PASS。

### 4. coverage_report.md 再訂正（正直なカバー差し戻し）

WI-229 で未カバーへ反転した 8 決定行 + AC-3 status 行の計 9 行を「カバー」へ差し戻し、根拠として起票済み ADR（022〜029 / 007-008-010）+ AC-1 presence テスト + status テスト + §12/it_test_design 整合を明記。サマリー再計算（受け入れ基準 13→22 カバー、総合 58→67 カバー、82.9%→95.7%）。訂正履歴に第2訂正（WI-231, v0.176.0）を追記。

### 5. ratchet doc 更新

`l3-005-ac-bound-ratchet.md`: acBoundStories を [HF2-05, H06-03, H05-02] へ更新、R2/R3 を完了として記録。H05-02 の legacy blocker が正規化 v0.173.0 + ADR 起票 v0.175.0 で解消したことを記録。

## 検証

- `real-adr-corpus.it.test.ts`: 5 tests 全緑。AC-1 テストは marker を 1 件削除すると欠落 key を名指しで fail することを確認（anti-laundering: 真に検証している）。
- `phasegate:generate-matrix`: H05-02 の AC-1/2/3/4 が全て `binding:"ac"`、fileFallbackOnly===0。
- `validate --layer L3`: L3-005 PASS（3 story 全て fileFallbackOnly===0）、exit 0、L3-004 は不変で PASS。
- `phasegate:attest` + `verify-attestation`: acBoundScope = ["H05-02","H06-03","HF2-05"]（sorted）へ再導出、`granularity.traceability.level` は "file" のまま（over-claim なし）、verify exit 0。
- `npm run test`: 全緑。

## スコープ外

- `granularity.level` の "ac" 昇格（R4）は本 WI で行わない。level は "file" を維持し acBoundScope で正直な範囲を示す。
- `it_test_design.md` の UseCase 異常系 3 ケース補完は別タスク（coverage_report §7 の残タスク）。
