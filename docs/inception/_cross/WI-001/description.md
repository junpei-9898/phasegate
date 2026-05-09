---
id: WI-001
type: issue
severity: normal
status: tested
legacy_id: ISSUE-001
affects: [agent-integration, phase-dependency-model]
---

# ISSUE-001: inception側のフェーズゲートが未整備のため、US/issueの設計プロセスをスキップできる

## ステータス

- **状態**: 🔴 **OPEN**（未着手、2026-04-23 監査で再確認。inception 内の設計プロセス順序 logical → test → tdd が強制されない構造的ギャップが残存）
- **優先度**: Medium
- **起票日**: 2026-03-28
- **更新日**: 2026-04-23
- **発見契機**: HF1-06 (FUSE/Hooks モード切替配線) の実装時
- **影響Unit**: agent-integration, phase-dependency-model
- **深刻度**: Medium — 設計プロセスのスキップが物理的にブロックされない

> **現在の状態 (2026-05-09)**: TESTED。`checkPhaseGate(..., scope)` が `scope.storyId` 付きの Level 3 成果物をコンテキスト依存で検証し、`check-phase-gate --story` から実行できる。`WriteTargetScope` は現行 WI layout (`docs/inception/{unit}/{WI-XXX}/`, `docs/inception/_cross/{WI-XXX}/`) を Level 3 scope として認識する。以下に残る `issues/` パス表記は起票当時の legacy 記録であり、現在の正本 layout では使わない。

## 実装・検証

- **実装証跡**:
  - `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts`
  - `scripts/harness/phase-dependency-model/application/usecases/check-phase-gate-usecase.ts`
  - `scripts/harness/phase-dependency-model/application/services/evidence-bundle-assembler.ts`
  - `scripts/harness/phase-dependency-model/presentation/cli/check-phase-gate-command-handler.ts`
  - `scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts`
  - `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts`
- **テスト証跡**:
  - `scripts/harness/__tests__/unit/phase-dependency-model/phase-structure.test.ts`
  - `scripts/harness/__tests__/unit/phase-dependency-model/check-phase-gate-usecase.test.ts`
  - `scripts/harness/__tests__/unit/agent-integration/write-target-scope.test.ts`
- **検証**: 2026-05-09 に上記 3 テストファイルを実行し、175 tests passed。

## 問題の概要

現在のフェーズゲートは `product` 配下の設計文書（Unit単位）の存在のみをチェックしている。`inception` 配下のUS/issueごとの設計プロセスにはフェーズゲートが適用されていないため、新しいUS/issueの設計文書を作成せずに実装に入ることが可能になっている。

## 設計モデルの整理

### ドキュメント階層と役割

```
docs/inception/{unit}/{US-XXX}/     一時設計（作業単位ごと）
docs/inception/{unit}/issues/{ISSUE-XXX}/  一時設計（バグ/不整合）
        ↓ 設計成果物の反映
docs/product/construction/{unit}/   正式設計（Unitの真実のソース）
        ↕ フェーズゲート
scripts/harness/{unit}/*.ts         実装ファイル
```

- **inception** = US/issue 単位の設計プロセス管理（一時的）
- **product** = Unit の正式設計ドキュメント（inception の成果物が反映され、常に最新状態を維持）
- **source** ↔ **product** の紐付けが重要（どのUS/issueかは不問）

### なぜソースファイルにUS/issueを紐付けないか

ソースファイルとUS/issueを直接紐付けると、PJのライフサイクルが進むほどにバグ修正やUS追加によって一つのソースファイルに紐づくドキュメント数が増大し続け、依存関係が複雑になる。

product 配下のドキュメントが常に正である状態（変更が入るたびに情報が更新され鮮度が保たれる）を維持することで、product docs をハブとして inception 配下の一時ドキュメントと実装が間接的に紐づく設計の方が管理しやすい。

## 再現手順

1. `fuse-hooks-engine` のように product 設計文書が全て揃っているUnitを対象にする
2. 新ストーリー HF1-06 の inception 設計文書を作成せずに `story-implementor` を実行
3. inception 側にフェーズゲートがないため、設計プロセスをスキップして実装に入れる
4. product docs は既存Unitのものが揃っているため、ソースファイルへの書き込みもブロックされない

## 根本原因

### 1. inception 配下にフェーズゲートが適用されていない

現在のフェーズゲートは以下のみをチェックする:
- ソースファイル書き込み時 → `product` 配下の設計文書（Unit単位）の存在

以下がチェックされていない:
- inception のUS/issue内での設計プロセス順序（論理設計 → テスト設計 → 実装計画）
- inception の設計完了前に product docs を更新することの防止

### 2. story-implementor スキルの指示だけに依存

テスト設計文書の事前作成チェックは `story-implementor` スキルのプロンプト内に記載されているが、CLI レベルの物理ブロックではない。AI がスキル内指示を省略すると、設計文書なしで実装が進行する。

### 3. issue の管理構造が未定義

バグ修正や不整合の対応は `quick-implementor` で行われるが、既存USで定義されている振る舞いに関わるバグ/不整合の場合、適切な設計プロセスを経るべきケースがある。現在は issue の inception 管理構造自体が存在しない。

## 影響範囲

| シナリオ | 期待動作 | 実際の動作 |
|---|---|---|
| 新Unit（product 設計文書なし） | ソースへの書き込みをブロック | **ブロック** ✅ |
| 既存Unit + 新US（inception 設計未完了） | inception 設計プロセスを強制 | **スキップ可能** ❌ |
| 既存Unit + issue（設計が必要なバグ修正） | inception 設計プロセスを強制 | **管理構造なし** ❌ |
| 既存Unit + 軽微バグ修正（quick-implementor） | Phase Gate 緩和でパス | **パス** ✅ |

## 対策方針

### 採用: inception 側のフェーズゲート整備

以下の2つを実施する:

#### 1. inception の管理構造拡張

- US: `docs/inception/{unit}/{US-XXX}/` （現行通り）
- issue: `docs/inception/{unit}/issues/{ISSUE-XXX}/` （新規追加）
- US/issue 両方に同等のフェーズゲートを適用

#### 2. inception 内フェーズゲートの実装

inception のUS/issue単位で設計プロセスの順序を強制する:

| Phase | 成果物 | ゲート |
|-------|--------|--------|
| Level 1 | 論理設計（`logical_design.md`） | 必須 |
| Level 2 | テスト設計（`unit_test_design.md`, `it_test_design.md`等） | 必須 |
| Level 3 | 実装計画（`tdd_implementation_plan.md`） | product docs 更新後に許可 |

これにより:
1. US/issue それぞれに inception 内のフェーズゲートが適用される
2. inception のフェーズゲートを通過 → product docs が更新される
3. ソースファイルへの書き込みは product docs の存在でゲート（現行通り、Unit単位でOK）

### 却下した案

| 案 | 却下理由 |
|----|---------|
| ソースファイルにUS/issue IDを紐付け | 依存関係が増大し続ける。PJライフサイクルが進むほど管理不能に |
| セッション状態でアクティブストーリーを追跡 | 新しい状態管理が必要。product docs ハブモデルで不要 |
| ソースファイルから storyId を推定 | 推定精度の問題。そもそもソース↔US紐付けが不要 |

## 関連ファイル

- `scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts` — Scope検出ロジック
- `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts` — Phase Gate呼び出し
- `scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts` — AsyncHookToCliTranslator
- `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts` — Phase Gate判定ロジック
- `.claude/skills/story-implementor` — テスト設計チェックのプロンプト指示

## 発見時の経緯

HF1-06 (FUSE/Hooks モード切替配線) を `story-implementor` で実装した際、以下のAIDLCステップをスキップして実装が完了した:

1. `implementation-readiness-checker` — 未実行
2. `unit-test-designer` / `it-test-designer` / `scenario-test-designer` — HF1-06用のテスト設計文書を未作成
3. `test-coverage-checker` — 未実行

fuse-hooks-engine Unit には既存ストーリー用の product 設計文書が揃っていたため、ソースコードへの書き込みがブロックされなかった。inception 側にフェーズゲートがないため、設計プロセス自体がスキップ可能だった。
