---
adr_id: "013"
title: "storyReflection ゲート（inception → product 反映の機械強制）"
status: Accepted
date: 2026-04-05
---

# storyReflection ゲート（inception → product 反映の機械強制）

## Context

AIDLC では US/issue ごとの設計文書が `docs/inception/{unit}/{storyId}/` 配下に作成され、Unit ごとに累積される設計文書が `docs/product/construction/{unit}/` に反映される。従来この反映は cascade-updater スキルに委ねられていたが、**手動運用のため抜け落ちが発生**し、以下の問題が顕在化した。

- inception の US-XXX 設計が存在するのに product 文書へ反映されず、Unit 全体の設計整合性が崩れる
- 実装ファイルの `@unit` → `docs/product/construction/{unit}/` のトレーサビリティが未反映 US に対して欠落する
- cascade-updater の実行有無をレビュー時に目視確認する必要があり、ヒューマンエラーが避けられない

Phase Gate（L2-001）は設計文書の**存在**を検証するが、inception と product の**整合性**（「inception にあるものが product にも反映されているか」）は検証範囲外だった。実装段階でこの欠落がブロックされなければ、設計の単一源としての product 文書が信頼できなくなる。

## Decision

`phaseDependencies.storyReflection` を導入し、**実装着手時（`src/` / `scripts/harness/` への Write/Edit）に inception → product 反映を機械的に検証**する。現行の新規 reflection は `@work-item-id WI-XXX` を正とし、既存の `@story-id HXX-XX` / `@story-id US-XXX` は WI frontmatter の `legacy_id` 経由で履歴として解決する。<!-- @work-item-id WI-155 -->

### 設計原則

configurable_phase_gate_plan.md §4 から引用:

- **ハードコードされたデフォルトはプリセットとして残す（後方互換）**
- **Phase Gate / L2-002 / storyReflection / cascade-updater の 4 系統がプリセット単位で連動**
- storyReflection の対象は **product に累積更新される設計文書のみ**（テスト設計は US 単位で inception に閉じるため対象外）
- config 省略時はプリセットのデフォルト mappings が自動適用（**ゼロコンフィグ**）
- cascade-updater は storyReflection ゲート通過の**唯一の標準手段**

### プリセット別デフォルト

| プリセット | storyReflection | デフォルト mappings |
|-----------|-----------------|--------------------|
| `full` | 必須 | `logical_design.md` + `domain_model.md` required、`uiux_design.md` optional |
| `standard` | 必須 | `logical_design.md` required、`domain_model.md` optional |
| `minimal` | 無効 | — |
| `custom` | 任意 | config で明示指定 |

`minimal` で storyReflection を無効にする理由: Phase 3 ゲートなしの状態で story 反映を強制するのは矛盾するため。

### チェックロジック

```
発火条件: src/{unit}/* または scripts/harness/{unit}/* への Write/Edit
  1. WriteTargetScope から unitId を解決（@unit 複数ユニット対応）
  2. docs/inception/{unit}/ 配下の storyId ディレクトリを列挙
  3. 各 storyId × 各 mapping について:
     - inception ファイルが存在する AND mapping.required == true
     - → product ファイル内に @story-id {storyId} が含まれているか検証
     - 含まれていない → ブロック
```

### エラーメッセージフォーマット

`HandlePreToolUseUseCase.blockReason: 'STORY_REFLECTION'` で返されるブロックメッセージは以下の形式とする（configurable_phase_gate_plan.md §4.3 より）:

```
[L2-STORY-REFLECTION] docs/product/construction/order/logical_design.md に
@story-id US-002 が反映されていません。

inception/order/US-002/logical_design.md は存在しますが、
対応する product 文書に US-002 の設計が含まれていません。

修正方法:
  1. cascade-updater を実行して product 文書を更新
  2. または手動で logical_design.md に @story-id US-002 を追加

参照: ADR-013
```

### 関連コンポーネント

- `PhaseConfigProviderPort.getStoryReflectionConfig()` — プリセット + config から有効な mappings を解決
- `FileSystemStoryReflectionAdapter` — inception ディレクトリ列挙と product 文書内 `@work-item-id` / legacy `@story-id` 検索
- `HandlePreToolUseUseCase` — src/ への Write 発火時に storyReflection チェックを呼び出し、未反映ならブロック
- Quick Mode (`relaxedGates: ["phase-gate"]`) 時は storyReflection も緩和される（§4.6）

## Consequences

### Positive

- inception → product 反映の欠落が実装着手時点で機械的にブロックされる
- cascade-updater の実行が事実上必須化され、手動運用の抜け漏れが排除される
- config 省略時もプリセットデフォルトで動作するため、既存ユーザーはゼロコンフィグで恩恵を受ける
- `@unit` 複数ユニット対応と組み合わせ、共有インフラファイルでも全 Unit の反映状態が検証される

### Negative / Trade-off

- 実装着手時に反映漏れがあると Write/Edit がブロックされるため、cascade-updater 実行の手間が増える
- `full` プリセットでは `domain_model.md` も required のため、軽微な変更でも反映が必要になる場合がある → `standard` または `custom` で緩和可能
- `minimal` ではこの保証が得られない（プロトタイプ段階の試行錯誤を優先するトレードオフ）

## 関連要件・文書

- configurable_phase_gate_plan.md §4（Phase A: プリセット拡充 + storyReflection）
- ADR-007（phasegate.config.json — Single Source of Truth）
- ADR-008（Quick Mode）— storyReflection も `relaxedGates` で緩和される
- ADR-012（2-Phase Execution）— storyReflection は Phase 2 完了の事後条件に相当
- `docs/folder_management_rules.md` — inception / product の累積更新フロー

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
