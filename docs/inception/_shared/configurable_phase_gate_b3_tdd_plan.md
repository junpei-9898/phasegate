# TDD実装計画: configurable_phase_gate_plan Phase B-3（アプリケーション層）

> **作成日**: 2026-04-05
> **対象計画書**: `docs/inception/_shared/configurable_phase_gate_plan.md` §B-3
> **対象 Unit**: phase-dependency-model（主）、agent-integration（従）
> **前提**: B-2 完了（`v0.20.0`、`49e9548`）

---

## 1. スコープ

### 対応計画書セクション
- B-3-1: `ResolveGateUseCase` 新設 — Write 対象パスを `blocks` glob でマッチング → 該当ゲート + 先行ゲートの `requires` チェック
- B-3-2: `HandlePreToolUseUseCase` に `custom` プリセット時の `gates[]` ベースチェック経路を統合

### 影響する層
- ✅ Application（`phase-dependency-model/application/usecases/resolve-gate-usecase.ts` 新設）
- ✅ Application DTO（`phase-dependency-model/application/dto/resolve-gate-result-dto.ts` 新設）
- ✅ Composition Root（`phase-dependency-model/composition-root.ts` に `ResolveGateUseCase` を配線）
- ⚠️ Presentation 軽微（`CheckPhaseGateCommandHandler` への入力拡張 or 別ハンドラー追加。Q2 参照）
- ❌ Domain（B-2 で完了済み。本フェーズでは変更なし）
- ❌ Infrastructure 実装（picomatch は B-4、本フェーズでは **スタブ `GlobMatcherPort`** のみ注入してテスト可能にする）

### 非スコープ
- B-4 インフラ層（`PicomatchGlobMatcher` 実装、`CustomGatesConfigParser`、`package.json` への picomatch 追加）
- B-5 E2E（`custom` プリセットの end-to-end 実体テストは B-5-3）
- B-6 ドキュメント
- `agent-integration` 側の破壊的 API 変更（最小侵襲で対応）
- JSON Schema ファイル本体への `gates[]` 実体追加（B-4）

---

## 2. 前提条件検証

| 項目 | 状態 |
|------|------|
| B-2 完了（`GateDefinition` / `GateGraph` / `PhaseStructure.fromGates`）| ✅ `49e9548` |
| `logical_design.md` §10.3 Application 層仕様 | ✅ 2026-04-05 追加済み |
| `domain_model.md` §11 GateGraph / GateDefinition | ✅ 2026-04-05 追加済み |
| `GlobMatcherPort` interface | ✅ B-2 で新設済み |
| `ArtifactExistenceCheckerPort` | ✅ 既存 |
| 既存 `CheckPhaseGateUseCase` / `HandlePreToolUseUseCase` | ✅ 動作確認済み |

**判定**: ✅ 実装準備完了

---

## 3. TDD実装順序

### 3.1 Unit テスト

配置: `scripts/harness/__tests__/unit/phase-dependency-model/`

| # | 対象 | テストファイル | 観点 |
|---|------|----------------|------|
| 1 | `ResolveGateUseCase.execute()` — 基本マッチ | `resolve-gate-usecase.test.ts` | 単一 glob `blocks` にマッチ → 該当ゲート 1 件が返る |
| 2 | 同 — 複数 glob マッチ | 同上 | 複数ゲートが同一パスにマッチ → 全件が返る |
| 3 | 同 — glob 非マッチ | 同上 | マッチゼロ → `matchedGates: []`、`missingRequirements: []` |
| 4 | 同 — `dependsOn` 解決 | 同上 | 該当ゲート X → 先行ゲート Y の `requires` も検査対象に含む（トポロジカル順） |
| 5 | 同 — `requires` 欠損 → `missingRequirements` | 同上 | `required: true` 欠損 → blocker、`required: false` 欠損 → warning |
| 6 | 同 — scope プレースホルダ展開 | 同上 | `{unit}` → `scope.unitId`、`{storyId}` → `scope.storyId` が `requires.path` に適用される |
| 7 | 同 — 空 `blocks` ゲート（passive） | 同上 | `blocks: []` のゲートは直接マッチはしないが `dependsOn` で参照された場合に検査される |

### 3.2 IT テスト

配置: `scripts/harness/__tests__/integration/phase-dependency-model/`

| # | 対象 | テストファイル | 観点 |
|---|------|----------------|------|
| 8 | `ResolveGateUseCase` + `FileSystemArtifactExistenceChecker`（実 FS） | `resolve-gate-usecase.integration.test.ts` | tmp ディレクトリに実ファイル配置 → 実在/非実在で blocker 判定が正しく切り替わる |

### 3.3 HandlePreToolUseUseCase 統合テスト

配置: `scripts/harness/__tests__/integration/agent-integration/`

| # | 対象 | テストファイル | 観点 |
|---|------|----------------|------|
| 9 | `custom` プリセット経路（phase-dependency-model 内部分岐） | 既存 `handle-pre-tool-use-usecase.test.ts` に追記 | `preset === 'custom'` 時、`PhaseGateQueryAdapter` 経由で `ResolveGateUseCase` が呼ばれ、結果が既存の `PHASE_GATE` ブロック形式で返る |

### 3.4 E2E

本フェーズでは **なし**。B-5-3 で実施。

### 3.5 実行方式

- **TDD 本体**: Codex CLI 経由（`feedback_codex_delegation.md` 準拠、`codex exec --dangerously-bypass-approvals-and-sandbox`）
- **レビュー**: Claude Code（メインセッション）が codex の出力を検証

---

## 4. 実装対象ファイル一覧

### 新規作成

```
scripts/harness/phase-dependency-model/application/
├── usecases/
│   └── resolve-gate-usecase.ts
└── dto/
    └── resolve-gate-result-dto.ts

scripts/harness/__tests__/unit/phase-dependency-model/
└── resolve-gate-usecase.test.ts

scripts/harness/__tests__/integration/phase-dependency-model/
└── resolve-gate-usecase.integration.test.ts
```

### 修正

```
scripts/harness/phase-dependency-model/composition-root.ts
  - ResolveGateUseCase を配線
  - preset === 'custom' 時は ResolveGateUseCase 経路、それ以外は従来の CheckPhaseGateUseCase 経路

scripts/harness/phase-dependency-model/presentation/cli/check-phase-gate-command-handler.ts
  - targetFilePath 入力を受け取れるよう拡張（後方互換: undefined 時は従来挙動）
  - Q2 参照

scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts
  - WriteTargetScope に加えて targetFilePath を渡せるよう checkGate シグネチャ拡張
  - Q3 参照

scripts/harness/agent-integration/domain/ports/phase-gate-query-port.ts
  - checkGate(scope, targetFilePath?) にシグネチャ拡張（後方互換: optional）

scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts
  - custom プリセット経路のテストを追記
```

---

## 5. 環境検証チェックリスト

- [ ] `npm run test` が既存全テストパス（ベースライン）
- [ ] `npx phasegate lint` パス
- [ ] `npx phasegate validate --layer L2` パス
- [ ] `npx tsc --noEmit` 新規ファイル起因エラーなし

事前実行: **Phase 2 冒頭で codex 側が実施**

---

## 6. QA（不明点・確認事項）

### [Question] Q1: `GlobMatcherPort` のスタブをどう用意するか

B-4 で picomatch 実装を追加するが、B-3 では `ResolveGateUseCase` のテスト/配線のために port 実装が必要。

**推奨案**: B-3 では `InMemoryGlobMatcher`（または `StringPrefixGlobMatcher`）というテスト/暫定用アダプタを `infrastructure/adapters/` に置く。`**` / `*` を最小限扱う簡易実装（picomatch 相当の完全性は不要、B-3 のテストケースがパスすれば十分）。B-4 で `PicomatchGlobMatcher` に置き換える。

- 配置: `scripts/harness/phase-dependency-model/infrastructure/adapters/in-memory-glob-matcher.ts`
- 実装範囲: `foo/**`、`foo/*.ts`、完全一致のみ。
- メタデータ: `@layer infrastructure`。
- B-4 で picomatch 実装追加後、composition-root の配線を差し替えるだけで済む。

[Answer] 承認（推奨案採用）

---

### [Question] Q2: `CheckPhaseGateCommandHandler` の拡張方針

現在 `checkPhaseGateCommandHandler.execute({targetLevel, unitId, storyId})` は level ベース。B-3 では `targetFilePath` も必要（`blocks` glob マッチのため）。

**推奨案（2 択）**:
- **(a) 既存ハンドラに optional `targetFilePath` 追加**: 最小侵襲。`preset === 'custom'` のときのみ `ResolveGateUseCase` にルーティング、それ以外は従来通り。
- (b) 別ハンドラ `ResolveGateCommandHandler` 新設: 関心の分離は綺麗だが、composition-root / adapter 側の分岐ロジックが増える。

**推奨は (a)**。内部分岐で十分、外部 API の肥大化を避ける。

[Answer] 承認（推奨案採用 (a)）

---

### [Question] Q3: `PhaseGateQueryPort.checkGate` のシグネチャ拡張

`agent-integration` 側の `PhaseGateQueryPort` は現在 `checkGate(scope: WriteTargetScope)`。`targetFilePath` を渡すにはシグネチャ変更が必要。

**推奨案**: `checkGate(scope: WriteTargetScope, targetFilePath?: string)` に optional 引数追加。既存呼び出し（`HookToCliTranslator`）側は引数を追加するだけで後方互換を維持。`targetFilePath` は `HookEvent.targetFilePaths[0]` から取得。

[Answer] 承認（推奨案採用）

---

### [Question] Q4: `ResolveGateUseCase` の戻り値設計

`CheckPhaseGateUseCase` は `PhaseGateResultDto` を返す。`ResolveGateUseCase` の戻り値を同じ DTO に合わせるか、専用 DTO を作るか。

**推奨案**: **専用 DTO (`ResolveGateResultDto`)** を新設。理由:
- `matchedGates` / `missingRequirements` など `ResolveGateUseCase` 固有情報を失わずに Presentation に渡せる
- Composition root の分岐点で `ResolveGateResultDto → PhaseGateResultDto` に変換する Mapper を置けば、既存の `CheckPhaseGateCommandHandler` 出力形式を保てる
- mapper は `phase-gate-result-mapper.ts` に `mapFromResolve()` メソッドを追加する形で統合

[Answer] 承認（推奨案採用）

---

### [Question] Q5: `dependsOn` 先行ゲートの `requires` 評価範囲

該当ゲート X の先行 Y の `requires` を評価する際、Y の `blocks` 条件は無視して常に評価するか、それとも Y が別の書き込み対象にもマッチしている場合のみか。

**推奨案**: **常に評価**。`dependsOn` の意味論は「X を通過するには Y の `requires` も満たされている必要がある」であり、Y の `blocks` とは独立。Y の `blocks` は「Y 自身の直接発火条件」であり、X の検査では無関係。

[Answer] 承認（推奨案採用）

---

### [Question] Q6: `{unit}` / `{storyId}` プレースホルダ解決の責務

`requires.path` 内の `{unit}` / `{storyId}` プレースホルダを展開する責務は `ResolveGateUseCase` 内で行うか、それとも `GateDefinition.fromRaw()` の時点で展開済みにするか。

**推奨案**: **`ResolveGateUseCase` 内で展開**。理由:
- `GateDefinition` は config ロード時の静的定義、scope は実行時の動的情報
- 展開ロジックを UseCase に集約することで、同一ゲート定義を異なる scope で再評価可能（複数 unit / 複数 story 対応）
- シンプルな文字列 replace（`path.replace('{unit}', scope.unitId)`）で十分

[Answer] 承認（推奨案採用）

---

## 7. 前提条件・リスク

### 前提条件
- `GateDefinition` / `GateGraph` は B-2 で完成済み、変更しない
- `CheckPhaseGateUseCase` 経路（non-custom）は変更せず後方互換維持
- Codex CLI が利用可能
- Phase Gate は本計画ファイル（`_shared/`）配下の計画更新とソースコード書き込みを許可する

### リスク
| リスク | 軽減策 |
|--------|--------|
| `InMemoryGlobMatcher` の簡易実装が本番 picomatch と乖離 | B-3 のテストは文字列完全一致 + `foo/**` パターンのみに絞る。E2E は B-5-3 で本番実装で検証 |
| `PhaseGateQueryPort` シグネチャ変更で既存テスト多数破損 | optional 引数として追加、既存呼び出しは変更不要 |
| Composition-root 分岐ロジックの肥大化 | `preset === 'custom'` ガードのみ、1 関数内に収める |
| Codex による scope 越境 | 編集対象を `scripts/harness/phase-dependency-model/` + `agent-integration/infrastructure/adapters/` + `agent-integration/domain/ports/phase-gate-query-port.ts` + 対応テストに限定 |

---

## 8. Phase 2 実行時の codex プロンプト骨子

```
以下を TDD で実装せよ（RED → GREEN → REFACTOR）:

対象 Unit: phase-dependency-model（主）、agent-integration（従）
スコープ: configurable_phase_gate_plan.md §B-3

参照文書:
- docs/product/construction/phase-dependency-model/domain_model.md §11
- docs/product/construction/phase-dependency-model/logical_design.md §10.3
- docs/inception/_shared/configurable_phase_gate_b3_tdd_plan.md（本計画）

編集対象ディレクトリ（これ以外は編集禁止）:
- scripts/harness/phase-dependency-model/application/
- scripts/harness/phase-dependency-model/infrastructure/adapters/in-memory-glob-matcher.ts（新規のみ）
- scripts/harness/phase-dependency-model/composition-root.ts
- scripts/harness/phase-dependency-model/presentation/cli/check-phase-gate-command-handler.ts
- scripts/harness/agent-integration/domain/ports/phase-gate-query-port.ts
- scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts
- scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts（targetFilePath pass-through のみ）
- scripts/harness/__tests__/unit/phase-dependency-model/resolve-gate-usecase.test.ts
- scripts/harness/__tests__/integration/phase-dependency-model/resolve-gate-usecase.integration.test.ts
- scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts

実装順:
1. ResolveGateResultDto 型定義
2. resolve-gate-usecase.test.ts（RED）+ resolve-gate-usecase.ts（GREEN）
   - 基本マッチ / 複数マッチ / 非マッチ / dependsOn 解決 / requires 欠損 / scope 展開 / passive gate
3. in-memory-glob-matcher.ts（テスト用簡易実装、B-4 で picomatch に差し替え予定）
4. composition-root.ts に ResolveGateUseCase を配線（preset==='custom' 分岐）
5. check-phase-gate-command-handler.ts に targetFilePath optional 引数を追加
6. PhaseGateQueryPort / PhaseGateQueryAdapter に targetFilePath optional 引数を追加
7. hook-to-cli-translator.ts で HookEvent.targetFilePaths[0] を adapter に渡す
8. resolve-gate-usecase.integration.test.ts（実 FS）
9. handle-pre-tool-use-usecase.test.ts に custom 経路のテストを追記

全新規ファイルに以下メタデータ必須:
// @unit phase-dependency-model（または agent-integration）
// @layer application / infrastructure / domain のいずれか

テストケース名は日本語、AAA パターン、Vitest、ドメイン層モック禁止。

完了条件:
- npm run test が全件パス
- npx phasegate lint パス
- 既存テストのリグレッションなし

禁止事項:
- docs/ 以下の編集（本計画ファイル以外）
- package.json の編集
- picomatch の追加（B-4 スコープ）
- domain 層の変更（B-2 で完了済み）
- scripts/harness/agent-integration/domain/ports/phase-gate-query-port.ts 以外の agent-integration/domain/ 編集
```

---

## 9. Phase 1 完了条件

- [x] 計画ファイルを出力（本ファイル）
- [x] 環境検証チェックリスト記載（事前実行は Phase 2 冒頭）
- [x] QA Q1〜Q6 を記載し推奨案を提示
- [ ] **人間の承認待ち** ← ここで止まる
- [ ] 実装コードはまだ書いていない ✅

---

## 10. 次のアクション

ユーザーが本計画を承認した場合:

1. §8 の codex プロンプトで Codex CLI に TDD 実装を委任
2. 実装完了後、Claude Code がレビュー（配置・メタデータ・テスト全件パス）
3. レビュー通過後、TaskList の B-3 タスクを `completed`
4. `configurable_phase_gate_plan.md` の B-3-1/2 を `[x]` に更新
5. `package.json` v0.20.0 → v0.21.0、コミット + タグ
6. 次の Phase B-4（インフラ層: picomatch + config パーサ）に進む
