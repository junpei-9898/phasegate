# ISSUE-001: Phase Gate が既存Unitへの新ストーリー追加時にストーリー単位のチェックをバイパスする

## ステータス

- **起票日**: 2026-03-28
- **発見契機**: HF1-06 (FUSE/Hooks モード切替配線) の実装時
- **影響Unit**: phase-dependency-model, agent-integration
- **深刻度**: Medium — 新Unit立ち上げ時のゲートは正常動作するが、既存Unitへの変更がすり抜ける

## 問題の概要

`pre-tool-use-hook` による Phase Gate は、既存Unitにソースコードを書き込む際、Unit単位の設計文書（`domain_model.md`, `logical_design.md`, `unit_test_design.md` 等）が存在すればLevel 3チェックをパスする。新ストーリー（US-XXX / HF1-XX 等）用のテスト設計やストーリー固有論理設計が未作成でもブロックされない。

## 再現手順

1. `fuse-hooks-engine` のように Level 2 設計文書が全て揃っているUnitを対象にする
2. 新ストーリー HF1-06 のテスト設計文書を作成せずに `story-implementor` を実行
3. `scripts/harness/fuse-hooks-engine/composition-root.ts` 等への Write/Edit が Phase Gate に**ブロックされない**
4. テスト設計なしで TDD 実装が完了してしまう

## 根本原因

### 1. ソースファイルパスから storyId を推定できない

`WriteTargetScope.fromPath()` (`agent-integration/domain/value-objects/write-target-scope.ts`) の挙動:

```
scripts/harness/fuse-hooks-engine/composition-root.ts
  → sourcePath "scripts/harness" にマッチ
  → unitId = "fuse-hooks-engine"（パスの最初のセグメント）
  → storyId = undefined（ソースパスにはストーリー情報がない）
  → level = 3, storyId なし
```

一方、inception ドキュメントへの書き込みでは storyId が検出される:

```
docs/inception/fuse-hooks-engine/HF1-06/logical_design.md
  → unitId = "fuse-hooks-engine", storyId = "HF1-06"
```

### 2. Phase Gate のチェック粒度がUnit単位

`PhaseGateQueryAdapter.checkGate(scope)` は `check-phase-gate --level 3 --unit fuse-hooks-engine` を実行するが、storyId が undefined のため:

- Level 1 成果物 → 存在チェック → パス
- Level 2 成果物 (domain_model.md, unit_test_design.md 等) → **Unit単位で既存** → パス
- Level 3 ストーリー固有成果物 → storyId なしのため**チェック対象外**

### 3. story-implementor スキルの指示だけに依存

テスト設計文書の事前作成チェックは `story-implementor` スキルのプロンプト内に記載されているが、CLI レベルの物理ブロックではない。AI がスキル内指示を省略すると、設計文書なしで実装が進行する。

## 影響範囲

| シナリオ | Phase Gate | 期待動作 | 実際の動作 |
|---|---|---|---|
| 新Unit（設計文書なし） | Level 2 文書不在 | ブロック | **ブロック** ✅ |
| 既存Unit + 新ストーリー（ソースコード変更） | Level 2 文書既存 | ブロック | **パス** ❌ |
| 既存Unit + バグ修正（quick-implementor） | Phase Gate 緩和 | パス | **パス** ✅ |
| inception ドキュメント書き込み | storyId 検出 | ストーリー単位チェック | **ストーリー単位チェック** ✅ |

## 考えられる対策案

### 案A: ソースファイルへの書き込み時にアクティブストーリーを推定する

ソースファイルの `@story` メタデータコメントや、直近のgitコミットメッセージ、または現在のセッションコンテキストからstoryIdを推定し、Phase Gate にストーリー単位のチェックを実行させる。

- **メリット**: ソースファイル書き込みでもストーリー単位のゲートが効く
- **デメリット**: 推定精度の問題、既存ファイル変更時にメタデータがない場合の挙動

### 案B: story-implementor スキル内でCLIチェックを実行する

`story-implementor` の Phase 2 開始前に `npx harness check-phase-gate --level 3 --unit {unit} --story {storyId}` を実行し、exit code 1 なら実装を中断する。スキルのプロンプト指示ではなく、実際のCLI呼び出しで強制する。

- **メリット**: 既存の Phase Gate インフラをそのまま活用
- **デメリット**: スキル内でのCLI呼び出しが必要、AI がスキル指示を省略する可能性は残る

### 案C: pre-tool-use-hook にセッション状態を導入する

`harness story:start --unit {unit} --story {storyId}` コマンドでアクティブストーリーを宣言し、以降のソースファイル書き込みでそのstoryIdを使用してPhase Gateチェックを実行する。

- **メリット**: 明示的で確実、ソースファイルパスに依存しない
- **デメリット**: 新しいCLIコマンドとセッション状態管理が必要

### 案D: Phase Gate チェックのトリガーを拡張する

ソースファイル書き込み時、storyId が不明な場合は「当該Unitの全未完了ストーリーのうち、最新のinception文書に対してPhase Gateを実行」する。

- **メリット**: 暗黙的に最新ストーリーのゲートが効く
- **デメリット**: 未完了ストーリーの判定ロジックが複雑

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

fuse-hooks-engine Unit には HF1-01〜05 用の設計文書が既に存在していたため、Phase Gate は全てパスし、ソースコードへの書き込みがブロックされなかった。
