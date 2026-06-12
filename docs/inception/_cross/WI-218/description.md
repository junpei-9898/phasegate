---
id: WI-218
type: issue
severity: high
status: drafted
affects: [agent-integration, phase-dependency-model, traceability-model]
source: github#31
external_ref: https://github.com/junpei-9898/phasegate/issues/31
---

# WI-218: WI description edits must not be blocked by Level 3 phase gate

> 起票日: 2026-06-12
> 起票経緯: GitHub Issue #31。`docs/inception/_cross/{WI-XXX}/description.md` と unit-owned `docs/inception/{unit}/{WI-XXX}/description.md` の編集が、PreToolUse phase-gate で Level 3 書き込みとして扱われる。

## 問題

WI の `description.md` は work item の最上流成果物であり、AIDLC Phase 1 の入口である。にもかかわらず、現行の `WriteTargetScope.fromPath` は WI ディレクトリ配下のファイル種別を区別せず Level 3 scope として扱う。

その結果、エージェントが `description.md` に Context / Acceptance Criteria / 再現情報を追記しようとすると、下流の `domain_model.md` / `logical_design.md` / test design などが未作成であることを理由に phase-gate がブロックする。`description.md` を作るために `description.md` 後続の設計成果物が要求されるため、WI 起票・精緻化の通常フローがデッドロックする。

## 再現確認

2026-06-12 に current main で確認した。

```text
scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts
```

現行実装は次の分類を行う。

- `docs/inception/_cross/{WI-XXX}/...` は `WriteTargetScope { level: 3, unitId: "_cross", storyId: "WI-XXX" }`
- `docs/inception/{unit}/{WI-XXX}/...` は `WriteTargetScope { level: 3, unitId, storyId: "WI-XXX" }`

`description.md` の除外や Phase 1 scope への分類がないため、GitHub Issue #31 の報告と同じ挙動が再現する。既存の unit test も `_cross/WI-026/description.md` が Level 3 になることを現在の期待値として固定している。

## 期待されるふるまい

- WI の `description.md` 作成・編集は Phase 1 work として扱い、Level 3 実装ゲートに依存しない。
- WI ディレクトリ配下の下流設計成果物 (`logical_design.md`, `domain_model.md`, `unit_test_design.md`, `it_test_design.md` など) は、従来通り phase-gate / reflection の対象として扱う。
- `_cross` と unit-owned WI の両方で同じ分類規則を使う。
- エラー表示や recovery hint は、`description.md` 編集時に `phasegate session begin` や `/story-implementor` へ誤誘導しない。

## 受け入れ基準

- [ ] `WriteTargetScope.fromPath("docs/inception/_cross/WI-999/description.md", ...)` は Level 3 scope を返さない。
- [ ] `WriteTargetScope.fromPath("docs/inception/agent-integration/WI-999/description.md", ...)` は Level 3 scope を返さない。
- [ ] WI 配下の `logical_design.md` など description 以外の設計成果物は、従来通り WI scope を保持する。
- [ ] PreToolUse hook の Write/Edit event で WI `description.md` が phase-gate deadlock しない regression test がある。
- [ ] 既存の story-reflection 除外方針と矛盾しないことを product docs に `@work-item-id WI-218` 付きで反映する。

## 非スコープ

- WI ディレクトリ配下の全ファイルを phase-gate 対象外にすること。
- `phasegate session` の権限モデル全体を再設計すること。
- `_cross` WI の Phase 2 / Phase 3 reflection ルールを廃止すること。

## 関連

- GitHub Issue #31: https://github.com/junpei-9898/phasegate/issues/31
- WI-026: WI layout と `_cross/WI-XXX` scope の既存導入。
- `docs/folder_management_rules.md` Phase 1: WI directory 作成と `description.md` 編集は自由。
