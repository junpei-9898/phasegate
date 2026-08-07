---
id: WI-331
type: fix
severity: medium
status: implemented
affects: [installation, ci-governance]
source: exocortex-review P9 (github#35 根本修正)
---

# WI-331: CLAUDE.md テンプレートの user-section を managed block の外側へ移設する（github#35 根本修正）

<!-- @work-item-id WI-331 -->

## 背景

GitHub issue #35（install/reconcile --apply が CLAUDE.md のユーザー記述を消す）は WI-315 で「managed block 置換時に既存 user-section 本文を抽出して再注入する」対症療法を実装済み。しかし根本原因は **CLAUDE.md テンプレートだけ user-section が managed block の内側に nest されている**構造にある。AGENTS.md テンプレートは user-section が managed block の外側にあり、block 置換の影響を構造的に受けない。

## 修正

### テンプレート構造修正

`docs/templates/agent-context/CLAUDE.md.template.md` の「## User Section + user-section マーカー + placeholder」を `<!-- phasegate:managed-section:end -->` の後ろ（外側）へ移動し、AGENTS.md と対称の構造にした。「## Agent Context Refresh」を含む他の内容は managed section 内に残す。

### install / reconcile の構造検出型・冪等 migration

`run-install.ts` の `mergeManagedMarkdown()` / `run-reconcile.ts` の `reconcileManagedMarkdown()` に、manifest フラグに依存しない構造検出型 migration を実装:

- 既存ファイルの user-section が **managed block の内側**（旧構造）→ 本文を抽出し、user-section を含まない新 managed block で置換した上で、block の直後（外側）に「## User Section + マーカー + 本文」を移設。本文は byte 同値で保持
- 既に **外側**に user-section がある（新構造）→ managed block 置換のみ。user-section には触れず二重化もしない
- user-section マーカーが存在しないファイル → 従来挙動（block 置換のみ）
- 同じ入力での再実行はファイル内容を変化させない（冪等）
- WI-315 の `extractUserSectionBody` / `restoreUserSection` は「managed block 内に user-section マーカーを持つ旧テンプレート block への再注入」という旧構造移行機構として存続

### ci:auto-refresh-agent-context 経路

`claude-md-composer.ts` の `compose()` はテンプレート全体を再レンダリングして既存ファイルの user-section 本文を差し込むため、新テンプレート採用により旧構造ファイルも refresh 時に自動的に新構造へ移行される。あわせて:

- `{{PHASEGATE_USER_SECTION}}` の置換を replacer 関数に変更し、user 本文中の `$` シーケンス（`$&` 等）の substitution 解釈を防止（WI-315 と同種のバグの composer 経路版）
- 空行 collapse（`\n{3,}` → `\n\n`）を user 本文注入の**前**に適用し、user 本文の空行を byte 同値で保持

### テスト

- install --apply 再実行 / reconcile --apply / refresh --apply の全書き込み経路で user-section 本文の byte 同値保持を assert
- 旧構造 → 新構造 migration（install / reconcile / refresh）と 2 回目適用の byte 同値（冪等性）を固定
- `$&` 等の $ シーケンスを含む user 本文の保持（WI-315 回帰）
- 既存テストの期待値を新構造（user-section が managed-section:end より後ろ）に追随

## 影響ファイル

- `docs/templates/agent-context/CLAUDE.md.template.md`
- `scripts/harness/installation/application/usecases/run-install.ts`
- `scripts/harness/installation/application/usecases/run-reconcile.ts`
- `scripts/harness/ci-governance/domain/services/claude-md-composer.ts`
- `scripts/harness/__tests__/integration/installation/install-handler.test.ts`
- `scripts/harness/__tests__/integration/installation/reconcile-handler.test.ts`
- `scripts/harness/__tests__/integration/ci-governance/refresh-agent-context-usecase.test.ts`
