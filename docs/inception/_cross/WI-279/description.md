---
id: WI-279
type: chore
severity: medium
status: drafted
affects: [harness-error]
---

# WI-279: harness-error coverage_report の ❌ 3 行への実テスト追加と誠実な ✅ 昇格

<!-- @work-item-id WI-279 -->

> 起票日: 2026-07-16
> 前提: WI-270 が harness-error の coverage_report を「カバー印 100%（水増し）」→ **⚠️ 92.9%（39/42）** へ実態訂正し、3 行を ❌ へ格下げた（§3.2-4 / §3.3-4 / Severity「生成後は不変」）。旧引用 IT-HE-137〜146 / UT-HE-112 は捏造で、実在は IT-HE-093 / UT-HE-127 まで。WI-275 で attestation 返済済み・ungated-legacy マーカー除去済みのため、新 ✅ には実在テスト + `<!-- @attestation <story-id> -->` が必須（L2-016 が形状、L3-007 が matrix 上の実在を検証）。

## スコープ

WI-270 が ❌ へ格下げた 3 行について、実在し pass する実テストで裏付けられる行のみを ✅ へ誠実に昇格する。ソース修正はスコープ外。テストを弱めての強制 green は禁止。

### 昇格した 2 行

1. **§3.3-4「契約違反時のエラーメッセージに違反内容と根拠（ADR参照）を含める」** → ✅ `UT-HE-128` `@attestation H06-03`。`severity-contract-enforcer.test.ts` の既存 pass テスト（`SeverityDowngradeViolationError` メッセージが default/requested severity と `ADR-021` を含む）を UT-HE-128 として採番・引用。ソース `severity-downgrade-violation-error.ts` が AC を満たす。
2. **Severity「生成後は不変」** → ✅ `UT-HE-129` / `UT-HE-130` `@attestation H06-03`。`severity.test.ts` に凍結インスタンスへの `value`/`rank` 再代入が `TypeError` となり元値保持されることを検証する実テストを新規追加。ソース `severity.ts` の `create()` が `Object.freeze(instance)` を実行。

### ❌ 残置 1 行（ソース側フィーチャ欠落・修正はスコープ外）

3. **§3.2-4「fix_example 更新時にバリデーションが自動実行」** → ❌ 残置。`.github/workflows/ci.yml` に fix_example 用 `paths` トリガー・`ValidateAllFixExamplesUseCase` 起動ジョブが存在しない（`pnpm test` は vitest 全体を回すだけ）。フィーチャ未実装のため、テストを弱めて強制 green にすることは反ロンダリング方針に反する。CI 設定側の実装完成後に契約テストを追加して昇格する。

## ID 採番方針

捏造範囲（IT-HE-137〜146 / UT-HE-112）を再利用しない。実在 UT-HE の最大 127 の直後（UT-HE-128 / 129 / 130）を採番した。

## headline

⚠️ 92.9%（39/42）→ ⚠️ 97.6%（41/42）。受け入れ基準 11/13→12/13、ドメインロジック 22/23→23/23、UseCase 6/6 不変。

## 検証

- harness-error unit+integration スイート: 202 passed → 204 passed（全 green）。
- matrix 再生成後 `validate --layer L2` PASS / `--layer L3`（L3-007 含む）PASS。
- `npx phasegate lint` 0 violations。
