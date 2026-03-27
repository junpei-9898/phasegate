# ドメインモデル設計計画: agent-integration（フェーズゲート統合拡張）

> **Unit ID**: agent-integration
> **作成日**: 2026-03-25
> **対応変更**: pre-tool-use hookのフェーズゲート強制チェックをphase-dependency-model統合版に再設計
> **前提**: 既存 `docs/product/construction/agent-integration/domain_model.md`（v2.1.0）

---

## 1. スコープ

### 対象Unit
- **agent-integration**: pre-tool-use hookのフェーズゲートチェック追加（主変更）
- **phase-dependency-model**: 既存APIを消費するのみ（変更なし）

### 変更の動機
現在のpre-tool-use hookは以下の問題を持つ：
1. ソースコードパス（`scripts/harness/{unit}/`）がハードコードされ、他PJで使えない
2. 設計文書への書き込み順序制約（domain_model → logical_design → test_design）がチェックされていない
3. `harness.config.json` の `project.paths` 設定が活用されていない
4. `phase-dependency-model` が既に持つ17の依存関係定義と `checkPhaseGate()` APIが未活用

### 境界
- agent-integration ドメイン層に新VO・新ポートを追加
- phase-dependency-model への変更は**なし**（既存公開APIを消費するのみ）
- validator-system の `PhaseDependencyPhaseGatePolicyAdapter` と同じ統合パターンを踏襲

---

## 2. 集約候補の分析

### 現在のドメインモデル構成

| 概念 | 分類 | 変更 |
|------|------|------|
| ReentryGuard | エンティティ | 変更なし |
| HookEvent | VO | 変更なし |
| ProtectedFileList | VO | 変更なし |
| HookTranslationResult | VO | 変更なし |
| FallbackCapabilitySpec | VO | 変更なし |
| HookToCliTranslator | ドメインサービス | 変更なし |
| FallbackVerificationService | ドメインサービス | 変更なし |
| ConfigQueryPort | ポート | **変更**: `checkDesignDocsExist()` 削除、`getProjectPaths()` 追加 |

### 追加する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| **WriteTargetScope** | 値オブジェクト（新規） | ファイルパスから推定されたフェーズゲートスコープ。`level: 1\|2\|3`, `unitId?: string`, `storyId?: string` を保持。`harness.config.json` の `project.paths` を使って動的にパス判定する |
| **ProjectPaths** | 値オブジェクト（新規） | `harness.config.json` の `project.paths` セクションを型安全に保持する。`source: string[]`, `docs.construction: string`, `docs.inception: string` |
| **PhaseGateQueryPort** | ポート（新規） | phase-dependency-model の `checkPhaseGate()` を呼び出す契約。`checkGate(scope: WriteTargetScope): Promise<PhaseGateQueryResult>` |

### 追加しない概念

| 却下候補 | 理由 |
|---------|------|
| PhaseGateResult（集約/エンティティ） | 結果はスナップショットでありライフサイクルがない。VOで十分 |
| WriteTargetClassifier（ドメインサービス） | WriteTargetScope.fromPath() の静的ファクトリメソッドで十分。サービス化は過剰 |

---

## 3. 設計方針

### WriteTargetScope のパス推定ロジック

`ProjectPaths` の設定値を使い、書き込み先ファイルパスからスコープを推定する：

| パスパターン | Level | unitId | storyId | 例 |
|------------|-------|--------|---------|---|
| `{source[n]}/{unitId}/...`（`__tests__/` 除く） | 3 | ✓ | — | `scripts/harness/validator-system/domain/foo.ts` |
| `{docs.construction}/{unitId}/...` | 2 | ✓ | — | `docs/product/construction/validator-system/logical_design.md` |
| `{docs.inception}/{unitId}/{storyId}/...` | 3 | ✓ | ✓ | `docs/inception/validator-system/HF1-01/scenario_test_plan.md` |
| `{docs.inception}/{unitId}/...`（storyIdなし） | 2 | ✓ | — | `docs/inception/validator-system/domain_model_plan.md` |
| `{docs.inception}/_shared/...` | 1 | — | — | `docs/inception/_shared/product_overview_plan.md` |
| `docs/product/product_overview.md` 等 | 1 | — | — | Level 1確定文書 |
| 上記いずれにも該当しない | null | — | — | チェック不要 |

### PhaseGateQueryPort の設計

既存の `PhaseDependencyPhaseGatePolicyAdapter`（validator-system）と同じ動的importパターンを使用：
- `await import('../../../phase-dependency-model/composition-root.js')` で疎結合を維持
- `checkPhaseGateCommandHandler.execute({ targetLevel, unitId, storyId })` を呼び出し
- exitCode 0 → passed, exitCode 1 → failed（blockers返却）

### ConfigQueryPort の変更

- `checkDesignDocsExist(unitId)` を**削除**（ハードコード実装の除去）
- `getProjectPaths(): Promise<ProjectPaths>` を**追加**（config駆動のパス解決）

---

## 4. QA（不明点・確認事項）

### [Question] Q1: phaseGate.enforceOnWrite のデフォルト値

フェーズゲートの書き込み前チェックはデフォルトで有効にすべきか？
- 有効（true）→ 新規PJでも最初からゲート強制。ただし設計文書がない初期状態では何も書けなくなる
- 無効（false）→ 明示的に有効化が必要。既存PJへの影響なし

**推奨案**: `true`。ハーネスの存在意義は品質強制。ただし `quickMode.relaxedGates` に `"pre-write-phase-gate"` を追加すれば緩和可能。Level 1はゲートチェックなし（前提条件なし）なので、最初のドキュメント作成はブロックされない。

[Answer]

### [Question] Q2: パフォーマンス — checkPhaseGate()のレイテンシ

pre-tool-use hookは毎回のWrite/Editで発火する。`checkPhaseGate()` はファイルシステムを走査する。許容範囲か？

**推奨案**: `WriteTargetScope.fromPath()` がnullを返した場合（スコープ外）は `checkPhaseGate()` を呼ばない。スコープ内の場合のみ実行。Phase-dependency-model のファイル走査は軽量（existsチェックのみ）なので実用上問題ないと想定。

[Answer]

### [Question] Q3: テストファイルへの書き込みの扱い

`__tests__/` 配下のテストファイルへの書き込みはフェーズゲートチェック対象外としてよいか？
テスト設計文書（`it_test_design.md` 等）は対象にするが、テスト実装コード（`.test.ts`）は対象外とする。

**推奨案**: `__tests__/` 配下は対象外。テストコードの書き込みまでゲートすると TDD の Red フェーズで書き込みがブロックされる。

[Answer]

### [Question] Q4: `docs/principles/` への書き込みとの関係

既存の `ProtectedFileList` が `docs/principles/` をブロックしている。フェーズゲートチェックとの優先順位は？

**推奨案**: 既存の保護ファイルチェックが先（shouldBlock=true で即return）。フェーズゲートは保護ファイルチェックを通過した後に実行。現在の実装順序をそのまま維持。

[Answer]

---

## 5. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| **前提** | phase-dependency-model の公開API（`createPhaseDependencyModelModule`, `checkPhaseGateCommandHandler`）は安定しており、Breaking Changeなし |
| **前提** | `harness.config.json` の `project.paths` セクションは全PJで設定されている |
| **リスク** | storyIdの推定精度 — `docs/inception/{unit}/{storyId}/` のstoryIdはディレクトリ名から推定するため、命名規則に依存 |
| **リスク** | 循環依存 — agent-integration → phase-dependency-model の依存追加。動的importで疎結合を維持するが、テスト時のモック戦略が必要 |
| **緩和策** | `PhaseGateQueryPort` をドメインポートとして定義し、インフラ層の動的importで実装。ユニットテストではモック注入 |
