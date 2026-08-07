---
id: WI-315
type: fix
severity: high
status: implemented
affects: [installation]
source: github#35
---

# WI-315: install/reconcile --apply が CLAUDE.md の user-section 記述を placeholder で上書きする

<!-- @work-item-id WI-315 -->

## 背景

`docs/templates/agent-context/CLAUDE.md.template.md` では `<!-- phasegate:user-section:start -->` 〜 `<!-- phasegate:user-section:end -->` が `<!-- phasegate:managed-section:start -->` 〜 `end` の**内側**に配置されている。`run-install.ts` の `mergeManagedMarkdown()` と `run-reconcile.ts` の `reconcileManagedMarkdown()` は managed block 全体をテンプレート由来の block で正規表現置換するため、block 内側にある user-section の既存本文が一切引き継がれず、`renderAgentContextTemplate()` が無条件に注入する placeholder（`Project-specific agent instructions go here.`）で上書き消失する（GitHub issue #35）。

AGENTS.md はテンプレート上 user-section が managed block の外にあるため保持され、CLAUDE.md とで挙動が非対称だった。

## 修正

- `run-install.ts` / `run-reconcile.ts` の managed markdown merge 経路に、既存ファイルから user-section 本文を抽出して新しい managed block の placeholder 部分へ再注入するローカルヘルパー（`extractUserSectionBody` / `restoreUserSection`）を追加
- user-section マーカーが既存ファイルに無い、または本文が空白のみの場合は従来どおり placeholder を使用（新規作成時の挙動は不変）
- managed block 内に user-section マーカーが無いテンプレート（AGENTS.md）では何もしない汎用実装とし、既存挙動を維持
- ユーザー本文が置換文字列に流入するようになったため、`String.replace` の `$` 特殊シーケンス解釈を避ける置換（replacer 関数）に変更
- 参考実装: `scripts/harness/ci-governance/domain/services/claude-md-composer.ts` の `extractUserSection`（cross-unit import は境界違反となるため installation 側にローカル実装）
- 統合テスト追加: install 再適用時の user-section 保持（issue 再現）、新規作成時の placeholder 注入（回帰）、AGENTS.md の user-section 保持（回帰）、reconcile 経路での保持
