# TDD実装計画: ISSUE-001 inception側フェーズゲート整備

## 1. スコープ

### 対象issue
ISSUE-001: inception側フェーズゲート整備 — storyId 提供時に Level 3 成果物のコンテキスト依存チェックを実施し、inception 内の設計順序を強制する。

### 受け入れ基準
1. `scope.storyId` 提供時、Level 3 ノードの成果物を `resolve(scope)` でパス解決し、解決済みパスの存在をチェック（INV-8）
2. `scope.storyId` 未提供時、Level 3 の `required=false` 成果物はスキップ（INV-9、既存動作維持）
3. issue パス（`docs/inception/{unit}/issues/{ISSUE-XXX}/`）を Level 3 スコープとして認識
4. 横断的 issue（`docs/inception/issues/`）は Level 1 として扱い、フェーズゲート非適用
5. CLI `--story ISSUE-001` で issue のフェーズゲートチェックが実行可能

### 影響する層とUnit

| Unit | Domain | Application | Infrastructure | Presentation |
|------|--------|-------------|----------------|--------------|
| phase-dependency-model | `checkPhaseGate()` scope追加 | `CheckPhaseGateUseCase` scope転送 | — | — |
| agent-integration | `WriteTargetScope` issueパス、`PhaseGateQueryResult` VO | `HandlePreToolUseUseCase` | `PhaseGateQueryAdapter` | — |

## 2. 前提条件検証

- `implementation-readiness-checker` 相当の前提条件: ✅ 全16ファイル存在確認済み（2026-03-28）
- 判定結果: ✅ 実装準備完了

## 3. TDD実装順序（テストピラミッド準拠）

### 1. Unitテスト (RED → GREEN → REFACTOR)

#### 1.1 phase-dependency-model Unit

| # | 対象 | テスト内容 | 実装内容 | ケースID |
|---|------|----------|---------|----------|
| 1a | PhaseStructure.checkPhaseGate | INV-9: scope未提供でLevel 3 required=false成果物スキップ | `checkPhaseGate()` に `scope?` パラメータ追加 | UT-PD-134〜135 |
| 1b | PhaseStructure.checkPhaseGate | scope.unitIdのみ提供でstoryId未提供と同一動作 | 同上 | UT-PD-136〜137 |
| 1c | PhaseStructure.checkPhaseGate | INV-8: scope.storyId提供でresolve(scope)実行、全存在→pass | コンテキスト依存チェックロジック | UT-PD-138〜142 |
| 1d | PhaseStructure.checkPhaseGate | 依存グラフブロック（未完了ノードの下流ブロック） | 依存チェック拡張 | UT-PD-143〜148 |
| 1e | Artifact.resolve連携 | プレースホルダ置換結果の検証 | 既存 — テスト追加のみ | UT-PD-150〜152 |

**実装詳細（phase-structure.ts の変更）:**
```
checkPhaseGate(targetLevel, evidence, scope?) の変更:
1. シグネチャに scope?: { unitId?: string; storyId?: string } を追加
2. scope.storyId 提供時の新ロジック:
   a. Level 3 ノード取得
   b. 各ノードの全 artifacts に対して resolve(scope) でパス解決
   c. 解決済みパスの存在を evidence.artifactStatuses で確認
   d. 未存在 → そのノードを「未完了」判定
   e. 未完了ノードに依存するノード → blockers に追加
3. scope.storyId 未提供時 → 既存動作（required=false スキップ）
```

#### 1.2 agent-integration Unit

| # | 対象 | テスト内容 | 実装内容 | ケースID |
|---|------|----------|---------|----------|
| 2a | WriteTargetScope.fromPath | Unit固有issueパス→level=3, storyId=issueId | `fromPath()` にissueパスマッチ追加 | UT-WTS-I001〜I003 |
| 2b | WriteTargetScope.fromPath | 横断的issueパス→level=1 | 同上 | UT-WTS-I010〜I012 |
| 2c | WriteTargetScope.fromPath | 既存USパス後方互換 | 既存ロジック維持 | UT-WTS-I020〜I021 |
| 2d | WriteTargetScope.fromPath | カスタムProjectPaths | パスマッチのカスタムパス対応 | UT-WTS-I030〜I031 |
| 2e | WriteTargetScope.fromPath | issueパス境界値 | エッジケース検証 | UT-WTS-I040〜I043 |
| 2f | WriteTargetScope.fromPath | WORK_ITEM_ID_PATTERN間接検証 | fromPath() 経由で正規表現マッチを検証 | UT-WTS-P001〜P015 |
| 2g | PhaseGateQueryResult | 生成/INV-12/アクセサ/不変性/等値性 | 新規VO作成（既に存在するが変更不要を確認） | UT-PGR-001〜043 |
| 2h | 境界値 | 各VOの境界ケース | — | UT-BV-015〜019 |

### 2. ITテスト (RED → GREEN → REFACTOR)

#### 2.1 phase-dependency-model Unit

| # | 対象 | テスト内容 | 実装内容 | ケースID |
|---|------|----------|---------|----------|
| 3a | CheckPhaseGateUseCase | scope転送、Level 3コンテキスト依存チェック | UseCase の scope 転送確認 | IT-PD-103〜109 |
| 3b | EvidenceBundleAssembler | Level 3 成果物の scope 解決 | Assembler の resolved パス収集確認 | IT-PD-110〜113 |
| 3c | CheckPhaseGateCommandHandler | CLI --story フラグのissue ID受付 | CLI presentation 層の確認 | IT-PD-114〜118 |
| 3d | FileSystemArtifactExistenceChecker | resolve済みパスの存在チェック | 一時ファイルシステムでの検証 | IT-PD-119〜122 |

#### 2.2 agent-integration Unit

| # | 対象 | テスト内容 | 実装内容 | ケースID |
|---|------|----------|---------|----------|
| 4a | HandlePreToolUseUseCase | issueパスでのフェーズゲート発火 | UseCase のissueパス対応 | 8件 |
| 4b | PhaseGateQueryAdapter | checkGate のissue ID転送 | Adapter の確認（既に存在） | 6件 |
| 4c | HarnessConfigConfigQueryAdapter | getProjectPaths | 既存テスト拡張 | 3件 |
| 4d | PreToolUseHookHandler | issueパスでのhook動作 | Presentation 層確認 | 3件 |
| 4e | Hook Flow Integration | E2E統合フロー | 統合確認 | 3件 |

## 4. 環境検証チェックリスト（事前実行結果）

- [x] pnpm install 完了
- [x] pnpm test 実行可能
- [x] harness.config.json 存在
- [x] 対象Unit のソースファイル存在

## 5. QA（不明点・確認事項）

### [Question] Q1: PhaseStructure.checkPhaseGate の scope 追加方式

**問題**: 現在の `checkPhaseGate(targetLevel, evidence)` に `scope?` を第3引数で追加するか、`evidence` オブジェクトに含めるか。

**分析**:
- `evidence` は `{ artifactStatuses, planEvidences, planningMode }` の構造で、ファイルシステムから集めた証跡データ。scope は「何を検証するかの指定」であり証跡ではない。
- `checkPhaseGate` は `EvidenceBundleAssembler` が組み立てた evidence を受け取るドメインメソッド。scope は Application 層が UseCase 入力から渡すパラメータ。
- ドメインモデル設計（§7 State Transitions）では `checkPhaseGate(targetLevel, evidence, scope?)` と明記。

**推奨案**: 第3引数として `scope?: { unitId?: string; storyId?: string }` を追加。ドメインモデル設計に準拠。

[Answer] 推奨案を採用。第3引数として追加。

### [Question] Q2: Level 3 コンテキスト依存チェックの実装箇所

**問題**: INV-8 のコンテキスト依存チェックを `collectMissingArtifactBlockers` 関数に組み込むか、`checkPhaseGate` メソッド内に新規ロジックとして追加するか。

**分析**:
- `collectMissingArtifactBlockers` は `node.requiredArtifacts()` のみチェックするヘルパー。Level 3 成果物は `required: false` のため、この関数のフィルタを変更すると既存動作への影響が大きい。
- 新規ロジック（scope提供時のLevel 3チェック）は、既存の required チェックとは異なる意味論（コンテキスト依存）を持つ。
- 論理設計 §3.1 では「新たにスコープ解決可能な場合のコンテキスト依存チェックを追加する」と明記。`Artifact.required` の意味は変えない。

**推奨案**: `checkPhaseGate` 内に新規セクションとして追加。`collectMissingArtifactBlockers` は変更しない。

[Answer] 推奨案を採用。既存関数は変更せず、新規ロジックとして追加。

### [Question] Q3: agent-integration の WriteTargetScope・PhaseGateQueryResult は変更が必要か

**問題**: git status を見ると、これらのファイルは既に A (Added) ステータス。既存実装を確認した結果:
- `WriteTargetScope.fromPath()`: 現状のコードを確認する必要がある（issue パスマッチが既に含まれているか）
- `PhaseGateQueryResult`: 既にVO実装が存在し、INV-12 含めて完成済み
- `PhaseGateQueryAdapter`: 既に実装が存在

**分析**: git status で `A` (Added) のファイルは前回のコミット以降に新規追加されたもの。コード読み取りの結果:
- `write-target-scope.ts` (136行): `fromPath()` の実装を確認する必要あり — issue パスのマッチロジックが含まれているかどうか
- `phase-gate-query-result.ts` (67行): 完成済み、テスト追加のみ
- `phase-gate-query-adapter.ts` (32行): 完成済み、テスト追加のみ

**推奨案**: 既存実装のテスト充実が主スコープ。`WriteTargetScope.fromPath()` に issue パスマッチが未実装の場合のみコード変更が必要。

[Answer] 推奨案を採用。既存実装を精査し、不足分のみ実装。

## 6. 前提条件・リスク

### リスク
1. **phase-dependency-model の checkPhaseGate シグネチャ変更**: 既存テスト 1459行（phase-structure.test.ts）への影響。scope はオプショナルなので後方互換は維持される。
2. **agent-integration の WriteTargetScope**: 既存テスト 504行（write-target-scope.test.ts）との整合性。issue パスは新規追加なので既存テストへの影響なし。
3. **CheckPhaseGateUseCase の scope 転送**: UseCase から Domain への scope 転送パスが正しいことを IT で検証必要。

### 実装順序の根拠
1. **phase-dependency-model Domain 層を最初に**: checkPhaseGate の scope 対応がコア変更。これが完了しないと IT テストが書けない。
2. **agent-integration Domain 層を次に**: WriteTargetScope の issue パスマッチが UseCase テストの前提。
3. **Application/IT テストは Domain 完了後**: Port mock を使った UseCase テストは Domain の型・シグネチャが確定してから。

## 7. 実装計画サマリ

```
Phase 2 実装順序:

[Step 1] phase-dependency-model UT (RED→GREEN→REFACTOR)
  → PhaseStructure.checkPhaseGate に scope? 追加
  → INV-8/INV-9 テスト + 実装

[Step 2] agent-integration UT (RED→GREEN→REFACTOR)
  → WriteTargetScope.fromPath() issue パスマッチ追加/確認
  → PhaseGateQueryResult テスト追加
  → WORK_ITEM_ID_PATTERN 間接検証テスト追加

[Step 3] phase-dependency-model IT (RED→GREEN→REFACTOR)
  → CheckPhaseGateUseCase scope転送テスト
  → EvidenceBundleAssembler Level 3 resolve テスト
  → CLI handler / FileSystem テスト

[Step 4] agent-integration IT (RED→GREEN→REFACTOR)
  → HandlePreToolUseUseCase issueパステスト
  → PhaseGateQueryAdapter テスト
  → Hook統合テスト

[Step 5] 全テスト GREEN 確認
  → pnpm test
```
