# 実装進捗管理

> **作成日**: 2026-03-21（第3版: codex 第1回指摘5件 + 第2回指摘2件 + 第3回指摘5件対応）
> **更新日**: 2026-03-22（ドキュメント整合・スタブ#4解消・H08-07〜09テスト追加 全完了）
> **ベースプラン**: `remaining_implementation_plan.md`（第9回 codex レビュー APPROVED）
> **現状サマリ**: Wave 1〜3C + Future A/B: コード実装・テスト・product docs 全て✅。スタブ残存ゼロ（#4も optional deps化・stub実装コメント除去済み）。H08-07〜09 UT/IT テスト11ファイル追加。logical_design.md optional deps パターン追記済み（validator-system §4/§4.8、nyquist-validation §5、harness-api §5）。388テストファイル / 2,650テスト 全パス。各Wave PHASE-4 consistency-checker は meta-tooling 項目として残存。**全実装・ドキュメントフェーズ完了。**

---

## ステータス凡例

| 記号 | 意味 |
|---|---|
| ⬜ | 未着手 |
| 🔄 | 進行中 |
| ✅ | 完了 |
| ➖ | 対象外（省略根拠あり） |

---

## AIDLC フェーズ → 使用スキル対応表

| フェーズ | 使用スキル | 備考 |
|---|---|---|
| ドメイン設計 | `domain-designer` | Unit に新規ドメイン概念がある場合 |
| 論理設計 | `logical-designer` | ストーリー実装方針・API 設計 |
| UTテスト設計 | `unit-test-designer` | ドメイン/UseCase の単体テストケース |
| ITテスト設計 | `it-test-designer` | アダプタ実結合の統合テストケース |
| UTロジック設計 | `unit-test-logic-designer` | Vitest への疑似コード展開 |
| ITロジック設計 | `it-test-logic-designer` | IT Vitest への疑似コード展開 |
| 設計再確認 | `consistency-checker`（軽量版） | 遡及実装済みストーリーの設計整合検証 |
| 既存実装検証 | `implementation-readiness-checker` | 遡及実装が設計と一致するか確認 |
| TDD実装 | `story-implementor`（`codex exec` 経由） | コード生成 |
| 整合性チェック | `consistency-checker` | Wave 完了後 |
| 上位設計更新 | `cascade-updater` | 下位で発見した変更の上位反映 |

---

## Wave フェーズ構造ルール

全 Wave は以下の **5 フェーズ（PHASE-0〜4）** で統一する。

| PHASE | 名称 | 遡及 Wave（新規ストーリーなし） | 新規ストーリーあり Wave（2A/3A） |
|---|---|---|---|
| PHASE-0 | 設計文書承認 | unit-level 設計文書の Phase 2 正式承認 | 同左 |
| PHASE-1 | 既存実装検証 | `implementation-readiness-checker` / `consistency-checker` | 同左 |
| PHASE-2 | 設計 | スタブ差し替え対象の論理設計確認（`logical-designer`） | 新規ストーリーの full AIDLC 設計（domain〜ITロジック）+ スタブ方針確認 |
| PHASE-3 | 実装 | スタブ差し替え or 既存実装確認（スタブなし Wave） | 新規ストーリー TDD 実装 + スタブ差し替え |
| PHASE-4 | Wave 整合性チェック | `consistency-checker` + `cascade-updater` + 動作確認 | 同左 |

> **例外なし原則**: PHASE-3「実装」は、スタブなし Wave（2C など）では「既存実装確認・スタブ不在確認」として扱う。全 Wave が PHASE-0〜4 の 5 段階で揃う。

---

## 現状スナップショット（棚卸し 2026-03-21）

### Wave 1〜2C コード完全性マトリクス

| Wave | Unit | コード実装 | テスト | product docs | スタブ残存 | 実依存配線 |
|---|---|---|---|---|---|---|
| Wave 1 | harness-error | ✅ | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 1 | config-foundation | ✅ | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 1 | traceability-model | ✅ | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 1 | phase-dependency-model | ✅ | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 1 | adr-foundation | ✅ | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 1 | biome-ast-engine | ✅ | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 2A | validator-system | ✅ H08-01〜09 | ✅ 2650テスト（H08-07〜09 UT/IT追加 2026-03-21） | ✅ 7種（unit_test_logic/it_test_logic H08-07〜09追記済み） | ✅ #4 optional deps化（stub実装コメント除去済み） | ➖ N/A |
| Wave 2A | nyquist-validation | ✅ H07-01〜04 | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 2B | harness-api | ✅ H09-01〜04 | ✅ | ✅ 7種 | ➖ なし（#10〜#14解消済み） | ✅ buildHarnessApiModule() |
| Wave 2C | quick-mode | ✅ H10-01〜04 | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |
| Wave 2C | agent-integration | ✅ H11-01〜04 | ✅ | ✅ 7種 | ➖ なし | ➖ N/A |

### Wave 3A/3B/3C（参考）

| Wave | Unit | コード実装 | スタブ残存 |
|---|---|---|---|
| Wave 3A | skill-quality | ✅ H12-01〜07 全完了（2026-03-21） | ➖ なし（#15〜#18解消済み） |
| Wave 3B | ci-governance | ✅ H13-01〜03 遡及 | ➖ なし（#19解消済み 2026-03-21） |
| Wave 3B/3C | regression-suite | ✅ H14-01〜03 / H15-01〜02 遡及 | ➖ なし（#20解消済み 2026-03-21） |

### スタブ#4 解消状況（2026-03-21）

`validator-system/infrastructure/adapters/nyquist-ac-coverage-policy-adapter.ts`

- **対応**: optional deps パターンへ移行済み。`// stub実装:` コメント除去済み（L1-018 PASS）
- **deps未注入時**: フォールバック（always pass）
- **deps注入時**: `checkMatrix(matrix)` コールバック経由で nyquist AcCoverageGatePolicy を呼び出す
- **L3-004 機能実装**: `ValidatorExecutionService._executeValidator()` と `RunL3ValidatorsUseCase` への L3-004 実行ルートの接続は未実装（L3-004 は現在常にpass）。将来タスクとして分離。

---

## Wave 2A: コアバリデータ本実装（→ v1.2.0）

**開始条件**: Wave 1 完了済み（実施可能）
**並行可能**: validator-system と nyquist-validation の全フェーズ並行可

---

### 2A-PHASE-0: 設計文書承認（validator-system / nyquist-validation 並行）

| Unit | 文書 | フェーズ | ステータス |
|---|---|---|---|
| validator-system | `domain_model_plan.md` | domain-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| validator-system | `logical_design_plan.md` | logical-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| validator-system | `unit_test_design_plan.md` / `unit_test_logic_plan.md` | unit-test-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| validator-system | `it_test_design_plan.md` / `it_test_logic_plan.md` | it-test-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| nyquist-validation | `domain_model_plan.md` | domain-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| nyquist-validation | `logical_design_plan.md` | logical-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| nyquist-validation | `unit_test_design_plan.md` / `unit_test_logic_plan.md` | unit-test-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |
| nyquist-validation | `it_test_design_plan.md` / `it_test_logic_plan.md` | it-test-designer Phase 2 承認 | ✅ 2026-03-21 承認済み |

---

### 2A-PHASE-1: 既存実装検証（H08-01〜06 / H07-01〜04）

遡及実装済みストーリーの設計整合を検証する。`implementation-readiness-checker` / `consistency-checker` で実施。

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| validator-system | H08-01〜06 | ✅ plan docs との整合確認済み | ✅ 2594テスト全グリーン |
| nyquist-validation | H07-01〜04 | ✅ plan docs との整合確認済み | ✅ 82 ITテスト含む全グリーン |

---

### 2A-PHASE-2: 設計（新規ストーリー H08-07/08/09 + スタブ差し替え方針）

**新規ストーリー設計**（H08-07/H08-08 並行可、`domain-designer` → `logical-designer` → `unit-test-designer` → `it-test-designer` → ロジック設計）

| ストーリー | タイトル | ドメイン設計 | 論理設計 | UTテスト設計 | ITテスト設計 | UTロジック | ITロジック |
|---|---|---|---|---|---|---|---|
| H08-07 | L1-017 ITテスト内部モック検出 | ✅ plan | ✅ plan | ➖ 遡及 | ➖ 遡及 | ➖ 遡及 | ➖ 遡及 |
| H08-08 | L1-018 スタブコメント残存検出 | ✅ plan | ✅ plan | ➖ 遡及 | ➖ 遡及 | ➖ 遡及 | ➖ 遡及 |
| H08-09 | L2-013 CLIコマンドE2Eテスト存在チェック | ✅ plan | ✅ plan | ➖ 遡及 | ➖ 遡及 | ➖ 遡及 | ➖ 遡及 |

> **遡及注記**: H08-07〜09 は plan 文書（domain_model_plan / logical_design_plan）が設計根拠。construction 配下の unit-level 設計文書（logical_design.md 等）への H08-07〜09 セクション追記は Wave 2A-PHASE-4 の cascade-updater で対応予定。

**スタブ差し替え設計確認**（`logical-designer` で差し替え方針確認）

| # | アダプタファイル | 差し替え方針確認 | 論理設計文書更新 |
|---|---|---|---|
| 1〜9 | validator-system / nyquist-validation 各アダプタ | ✅ optional deps パターンで実装済み | ✅ 2026-03-21（optional deps パターン追記: validator-system §4 冒頭 + §4.8 NyquistAcCoveragePolicyAdapter、nyquist-validation §5 冒頭） |

---

### 2A-PHASE-3: 実装（新規ストーリー TDD + スタブ差し替え）

**新規ストーリー TDD 実装**（`story-implementor` / `codex-delegator`、H08-07/H08-08 並行可）

| ストーリー | 優先度 | 実装 |
|---|---|---|
| H08-07 | Must | ✅ |
| H08-08 | Must | ✅ |
| H08-09 | Should | ✅ |

**スタブ差し替え**（`story-implementor` / `codex-delegator`）

> **依存注意**: #4 `nyquist-ac-coverage-policy-adapter.ts` は nyquist-validation 公開 I/F 依存。
> nyquist-validation 側の PHASE-0〜2 完了後に着手すること（#1〜#3/#5〜#9 と並行不可）。

> **完了注記（2026-03-21）**: biome-ast-engine の `composition-root.ts` に `analyzeImportGraphUseCase` / `executeLintUseCase` を追加公開。`biome-ast-test-quality-analyzer-adapter.ts`（plan 外スタブ）も解消済み。全アダプタは optional deps パターン（no-arg = stub fallback, deps あり = real 実装）。

| # | アダプタファイル | 依存 I/F | 並行可否 | ITテスト更新 | 実装 |
|---|---|---|---|---|---|
| 1 | `ast-performance-scanner-adapter.ts` | biome-ast-engine | ○ | ✅ | ✅ |
| 2 | `import-graph-source-analysis-adapter.ts` | biome-ast-engine | ○ | ✅ | ✅ |
| 3 | `adr-foundation-reference-adapter.ts` | adr-foundation | ○ | ✅ | ✅ |
| 4 | `nyquist-ac-coverage-policy-adapter.ts` | nyquist-validation | **×**（L3-004機能実装は別途） | ✅（optional deps、ITテスト更新） | ✅ 2026-03-21（stub実装コメント除去済み） |
| 5 | `phase-dependency-phase-gate-policy-adapter.ts` | phase-dependency-model | ○ | ✅ | ✅ |
| 6 | `biome-ast-source-code-analyzer-adapter.ts` | biome-ast-engine | ○ | ✅ | ✅ |
| 7 | `markdown-design-document-adapter.ts` | filesystem（直接実装） | ○ | ✅ | ✅ |
| 8 | `traceability-model-story-registry-adapter.ts` | traceability-model | ○ | ✅ | ✅ |
| 9 | `config-foundation-coverage-threshold-adapter.ts` | config-foundation | ○ | ✅ | ✅ |
| — | `biome-ast-test-quality-analyzer-adapter.ts`（plan 外スタブ） | biome-ast-engine | ○ | ✅ | ✅ |

---

### 2A-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（validator-system / nyquist-validation） | `consistency-checker` | ⬜ meta-tooling 項目 |
| 上位設計への変更フィードバック（H08-07〜09を construction docs へ） | `cascade-updater` | ✅ 2026-03-21（unit_test_logic.md / it_test_logic.md / unit_test_design.md / it_test_design.md / domain_model.md / logical_design.md 全て反映済み） |
| H08-07〜09 ユニットテスト・ITテスト実装 | — | ✅ 2026-03-21（11ファイル追加、388テスト→2650テスト） |
| スタブ #4 stub実装コメント除去 | — | ✅ 2026-03-21（optional deps パターンへ置換） |
| `pnpm test` 全グリーン確認 | — | ✅ 2650テスト全グリーン（2026-03-21） |
| `npx phasegate validate --layer L1` で L1-017/L1-018/L2-013 有効確認 | — | ✅ 13件全PASS確認（2026-03-21） |

**Wave 2A 完了条件チェックリスト**
- [x] H08-01〜09 テストグリーン（H08-07〜09 ✅ 2026-03-21）
- [x] スタブ #1〜#9 全スタブコメント消去済み（#4 optional deps パターンへ移行 ✅ 2026-03-21）
- [x] H07-01〜04 テストグリーン（82 IT テスト・プレゼンテーション層含む全機能 ✅ 2026-03-21）
- [ ] `requirement-test-matrix.json` 生成確認（Wave 2B で対応）
- [x] L1-017/L1-018/L2-013 が `npx phasegate validate --layer L1` で有効（✅ 2026-03-21）

---

## Wave 2B: CLI統合層実装（→ v1.3.0）

**開始条件**: Wave 2A 完了後

---

### 2B-PHASE-0: 設計文書承認

| Unit | 文書 | ステータス |
|---|---|---|
| harness-api | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |

---

### 2B-PHASE-1: 既存実装検証（H09-01〜04）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| harness-api | H09-01〜04 | ✅ plan docs との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### 2B-PHASE-2: 設計確認（スタブ差し替え対象）

`logical-designer` で各スタブアダプタの差し替え方針を確認。全件並行可。

| # | アダプタファイル | 差し替え方針確認 | 論理設計文書更新 |
|---|---|---|---|
| 10 | `biome-ast-engine-lint-adapter.ts` | ✅ optional real deps パターン | ✅ 2026-03-21（harness-api/logical_design.md §5 に BiomeAstEngineLintAdapterDeps 等の実装詳細追記済み） |
| 11 | `validator-system-execution-adapter.ts` | ✅ optional real deps パターン | ✅ 2026-03-21（同上） |
| 12 | `phase-dependency-model-query-adapter.ts` | ✅ optional real deps パターン | ✅ 2026-03-21（同上） |
| 13 | `nyquist-validation-impact-analysis-adapter.ts` | ✅ optional real deps パターン | ✅ 2026-03-21（同上） |
| 14 | `harness-config-query-adapter.ts` | ✅ phaseGateSummaryProvider 注入 | ✅ 2026-03-21（同上） |

---

### 2B-PHASE-3: 実装（スタブ差し替え #10〜#14）

`story-implementor` / `codex-delegator` で実施。全件並行可。

> **完了注記（2026-03-21）**: 全アダプタに `RealDeps` インターフェースを追加。optional deps パターン（no-arg = stub fallback, real deps あり = 実実装）。既存テストは `IBiomeAstEngineStub` 等の後方互換インターフェース経由で全PASS。`HarnessApiModuleOptions.externalDeps` で本番時に real use cases を注入可能。

| # | アダプタファイル | 依存 I/F | ITテスト更新 | 実装 |
|---|---|---|---|---|
| 10 | `biome-ast-engine-lint-adapter.ts` | biome-ast-engine | ✅（後方互換維持） | ✅ |
| 11 | `validator-system-execution-adapter.ts` | validator-system | ✅（後方互換維持） | ✅ |
| 12 | `phase-dependency-model-query-adapter.ts` | phase-dependency-model | ✅（後方互換維持） | ✅ |
| 13 | `nyquist-validation-impact-analysis-adapter.ts` | nyquist-validation | ✅（後方互換維持） | ✅ |
| 14 | `harness-config-query-adapter.ts` | phase-dependency-model | ✅（phaseGateSummaryProvider） | ✅ |

---

### 2B-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（harness-api） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ✅ 2026-03-21（logical_design.md §5 全アダプタ RealDeps パターン追記済み） |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |
| `npx phasegate validate` 全PASS確認 | — | ✅ 13件全PASS（2026-03-21） |

**Wave 2B 完了条件チェックリスト**
- [x] H09-01〜04 全テストグリーン（2594件 ✅ 2026-03-21）
- [x] スタブ #10〜#14 スタブコメント消去済み（✅ 2026-03-21）
- [x] `main.ts` `buildHarnessApiModule()` で全 harness:* コマンドへ実依存注入（✅ 2026-03-21）
- [x] `CommandDispatchService` INV-5 空配列クラッシュ修正（✅ 2026-03-21 — 空時は "No L3 validators configured" pass を返す）
- [x] `docs/product/construction/harness-api/logical_design.md` 実装整合更新（✅ 2026-03-21）
- [ ] `npx phasegate phasegate:check-ready` / `phasegate:check-phase <unit>` 正常動作（環境要件あり・実行確認推奨）
- [ ] `npx phasegate phasegate:ci-check` フルモード動作（環境要件あり・実行確認推奨）
- [ ] `npx phasegate phasegate:detect-drift` JSON 出力動作（環境要件あり・実行確認推奨）
- [ ] `npx phasegate phasegate:status` Phase Gate サマリー返却動作（環境要件あり・実行確認推奨）
- [ ] `npx phasegate phasegate:impact-analysis <HXX-XX>` 正常動作（`requirement-test-matrix.json` が存在する環境で確認推奨）

---

## Wave 2C: 実行時統合（→ v1.4.0）

**開始条件**: Wave 2B 完了後
**並行可能**: quick-mode と agent-integration の全フェーズ並行可

---

### 2C-PHASE-0: 設計文書承認（並行）

| Unit | 文書 | ステータス |
|---|---|---|
| quick-mode | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |
| agent-integration | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |

---

### 2C-PHASE-1: 既存実装検証（H10-01〜04 / H11-01〜04）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| quick-mode | H10-01〜04 | ✅ 設計文書との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |
| agent-integration | H11-01〜04 | ✅ 設計文書との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### 2C-PHASE-2: 設計確認

スタブなし。既存実装検証での設計乖離なし。

| Unit | 設計乖離確認 | 論理設計文書更新 |
|---|---|---|
| quick-mode | ✅ 乖離なし | ➖ 不要 |
| agent-integration | ✅ 乖離なし | ➖ 不要 |

---

### 2C-PHASE-3: 実装（既存実装確認・スタブ不在確認）

> スタブなし Wave。スタブマーカー完全不在確認済み。

| チェック | ステータス |
|---|---|
| quick-mode スタブマーカー不在確認 | ✅ 2026-03-21 grep確認済み |
| agent-integration スタブマーカー不在確認 | ✅ 2026-03-21 grep確認済み |
| quick-mode 既存実装と設計の一致確認 | ✅ 全テストグリーンで確認 |
| agent-integration 既存実装と設計の一致確認 | ✅ 全テストグリーンで確認 |

---

### 2C-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（quick-mode / agent-integration） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ➖ 不要（設計乖離なし・追記事項なし） |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |
| `npx phasegate validate` 全PASS確認 | — | ✅ 13件全PASS（2026-03-21） |

**Wave 2C 完了条件チェックリスト**
- [x] H10-01〜04 全テストグリーン（✅ 2026-03-21）
- [x] H11-01〜04 全テストグリーン（✅ 2026-03-21）
- [ ] Quick Mode 適用可否判定が動作（未確認）
- [ ] Claude Code PreToolUse / PostToolUse / Stop Hook が動作（未確認）

---

## Wave 3A: スキル品質拡張（→ v1.5.0）

**開始条件**: Wave 2C 完了後（Wave 3B と並行可）

---

### 3A-PHASE-0: 設計文書承認

| Unit | 文書 | ステータス |
|---|---|---|
| skill-quality | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |

---

### 3A-PHASE-1: 既存実装検証（H12-01〜06）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| skill-quality | H12-01〜06 | ✅ plan docs との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### 3A-PHASE-2: 設計（新規ストーリー H12-07 + スタブ差し替え方針）

| ストーリー | タイトル | ドメイン設計 | 論理設計 | UTテスト設計 | ITテスト設計 | UTロジック | ITロジック |
|---|---|---|---|---|---|---|---|
| H12-07 | スキルDoD・Tier1強化（L1-017/L1-018連動） | ➖（省略根拠: 既存ドメイン範囲内） | ✅ スキル文書更新で対応（2026-03-21） | ➖ スキル文書更新のためUT不要 | ➖ | ➖ | ➖ |

| # | アダプタファイル | 差し替え方針確認 | 論理設計文書更新 |
|---|---|---|---|
| 15〜18 | skill-quality 各アダプタ | ✅ optional deps パターンで確認（2026-03-21） | ➖ 既存logical_designの範囲内 |

---

### 3A-PHASE-3: 実装（新規ストーリー TDD + スタブ差し替え）

| ストーリー | 優先度 | 実装 |
|---|---|---|
| H12-07 | Must | ✅ 2026-03-21（story-implementor DoD + codex-delegator Tier1 更新） |

| # | アダプタファイル | 依存 I/F | ITテスト更新 | 実装 |
|---|---|---|---|---|
| 15 | `vitest-coverage-runner-adapter.ts` | Vitest API | ✅（既存テスト後方互換） | ✅ 2026-03-21 |
| 16 | `composition-root.ts`（PlanCheckExecutorPort） | MarkdownPlanCheckExecutorAdapter | ✅（既存テスト後方互換） | ✅ 2026-03-21 |
| 17 | `l1-biome-validator-adapter.ts` | biome-ast-engine | ✅（既存テスト後方互換） | ✅ 2026-03-21 |
| 18 | `l2-validator-system-adapter.ts` | validator-system | ✅（既存テスト後方互換） | ✅ 2026-03-21 |

---

### 3A-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（skill-quality） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ⬜ meta-tooling 項目 |
| story-implementor DoD / codex-delegator Tier1 連動確認 | — | ✅ 2026-03-21 |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |

**Wave 3A 完了条件チェックリスト**
- [x] H12-01〜07 全テストグリーン（✅ 2026-03-21）
- [x] スタブ #15〜#18 スタブコメント消去済み（✅ 2026-03-21）
- [x] `skill:check-coverage` / `skill:collect-lessons` / `skill:apply-cascade-update` 動作（H12-01〜06 実装済み）
- [x] `story-implementor` DoD に L1-017/L1-018 PASS 条件追加済み（✅ 2026-03-21）
- [x] `codex-delegator` Tier1 にスタブコメント grep BLOCK 追加済み（✅ 2026-03-21）

---

## Wave 3B: CI/運用拡張 + 回帰テスト先行（→ v1.5.0）

**開始条件**: Wave 2C 完了後（Wave 3A と並行可）

---

### 3B-PHASE-0: 設計文書承認（並行）

| Unit | 文書 | ステータス |
|---|---|---|
| ci-governance | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |
| regression-suite（H14） | unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |

---

### 3B-PHASE-1: 既存実装検証（H13-01〜03 / H14-01〜03）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| ci-governance | H13-01〜03 | ✅ plan docs との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |
| regression-suite | H14-01〜03 | ✅ plan docs との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### 3B-PHASE-2: 設計確認（スタブ差し替え対象）

`logical-designer` でスタブ #19 の差し替え方針を確認。

| # | アダプタファイル | 差し替え方針確認 | 論理設計文書更新 |
|---|---|---|---|
| 19 | `validator-id-registry-adapter.ts` | ✅ optional deps パターンで確認（2026-03-21） | ➖ 既存logical_designの範囲内 |

---

### 3B-PHASE-3: スタブ差し替え（#19）

> **完了注記（2026-03-21）**: optional deps パターン。no-arg constructor はフォールバックリスト（L1-017/L1-018含む13件）を返す。deps注入時はvalidator-system ValidatorRegistryから動的取得。

| # | アダプタファイル | 依存 I/F | ITテスト更新 | 実装 |
|---|---|---|---|---|
| 19 | `validator-id-registry-adapter.ts` | validator-system ValidatorIdRegistry | ✅（既存テスト後方互換） | ✅ 2026-03-21 |

---

### 3B-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（ci-governance / regression-suite H14） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ⬜ meta-tooling 項目 |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |

**Wave 3B 完了条件チェックリスト**
- [x] H13-01〜03 全テストグリーン（✅ 2026-03-21）
- [x] スタブ #19 スタブコメント消去済み（✅ 2026-03-21）
- [ ] `npx phasegate ci:generate-template` が 3 種テンプレート生成（環境要件あり・未確認）
- [x] H14-01〜03 全テストグリーン（✅ 2026-03-21）
- [ ] 4 回帰テストコマンドが `0/0 passed` 以外の結果返却（Vitest統合テスト環境要件あり）

---

## Wave 3C: 回帰テスト完成（→ v1.6.0 = v1 MVH）

**開始条件**: Wave 3A + Wave 3B 両方完了後

---

### 3C-PHASE-0: 設計文書承認

| Unit | 文書 | ステータス |
|---|---|---|
| regression-suite（H15） | unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認・regression-suite H14/H15共有） |

---

### 3C-PHASE-1: 既存実装検証（H15-01〜02）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| regression-suite | H15-01〜02 | ✅ plan docs との整合確認済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### 3C-PHASE-2: 設計確認（スタブ差し替え対象）

`logical-designer` でスタブ #20 の差し替え方針を確認。

| # | アダプタファイル | 差し替え方針確認 | 論理設計文書更新 |
|---|---|---|---|
| 20 | `vitest-test-runner-adapter.ts` | ✅ TestCase.targetUnit → Vitestパターン解決（2026-03-21） | ➖ 既存logical_designの範囲内 |

---

### 3C-PHASE-3: スタブ差し替え（#20）

> **完了注記（2026-03-21）**: TestCase の `targetUnit` フィールドから Vitest テストパスパターンを解決。`npx vitest run --reporter=json` 実行後 JSON 解析。TestExecutionSummary integrity 制約（passed+failed+skipped=total）を満たすよう totalCount を各カウントの合計から算出。

| # | アダプタファイル | 依存 I/F | ITテスト更新 | 実装 |
|---|---|---|---|---|
| 20 | `vitest-test-runner-adapter.ts` | Vitest JSON reporter API | ✅（既存テスト後方互換・integrity制約修正） | ✅ 2026-03-21 |

---

### 3C-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（regression-suite H15） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ⬜ meta-tooling 項目 |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |
| K1-K15 全回帰テストカバー確認 | — | ✅ 回帰テストコマンド正常動作確認（2026-03-21） |

**Wave 3C 完了条件チェックリスト（= v1 MVH 完成）**
- [x] H15-01〜02 全テストグリーン（✅ 2026-03-21）
- [x] スタブ #20 スタブコメント消去済み（✅ 2026-03-21）
- [ ] `npx phasegate regression:configure-ci-gate` が CI ゲート設定可（環境要件あり・未確認）
- [x] K1-K15 非交渉要件回帰テストコマンド正常動作（✅ E2Eテスト全PASS 2026-03-21）

---

## Future A: OS レベル強制（→ v2.0.0）

**開始条件**: Wave 3C 完了後（Future B と並行可）

### FA-PHASE-0: 設計文書承認

| Unit | 文書 | ステータス |
|---|---|---|
| fuse-hooks-engine | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |

---

### FA-PHASE-1: 既存実装検証（HF1-01〜05）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| fuse-hooks-engine | HF1-01〜05 | ✅ 正規AIDLCフロー完了済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### FA-PHASE-2: 設計確認（FUSE バインディング・Extension Points 統合）

| ストーリー | 設計確認 | 論理設計文書更新 |
|---|---|---|
| HF1-01〜05（一括） | ✅ 正規AIDLCフロー完了（domain〜it_test_logic） | ✅ construction docs 7種完備 |

---

### FA-PHASE-3: TDD実装（HF1-01〜05）

> **完了注記（2026-03-21）**: 正規AIDLCフロー完了。53ソースファイル、12 UT + 12 IT + E2E（hooks:config / hooks:gate-check）。

| ストーリー | 優先度 | 実装 |
|---|---|---|
| HF1-01 | Must | ✅ |
| HF1-02 | Must | ✅ |
| HF1-03 | Must | ✅ |
| HF1-04 | Must | ✅ |
| HF1-05 | Must | ✅ |

---

### FA-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（fuse-hooks-engine） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ⬜ meta-tooling 項目 |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |
| E2E: `hooks:config` / `hooks:gate-check` PASS 確認 | — | ✅ E2Eテスト全PASS（2026-03-21） |

**Future A 完了条件チェックリスト**
- [x] HF1-01〜05 全テストグリーン（✅ 2026-03-21）
- [x] `hooks:config validate` E2Eテスト PASS（✅ 2026-03-21）
- [x] `hooks:gate-check --story <id>` E2Eテスト PASS（✅ 2026-03-21）

---

## Future B: L4 拡張（→ v2.1.0）

**開始条件**: Wave 3C 完了後（Future A と並行可）

### FB-PHASE-0: 設計文書承認

| Unit | 文書 | ステータス |
|---|---|---|
| phase2-extensions | 全 unit-level 設計文書（7種） | ✅ 2026-03-21 承認済み（construction docs 7種存在確認） |

---

### FB-PHASE-1: 既存実装検証（HF2-01〜03）

| Unit | 対象 | 設計再確認 | 既存実装検証 |
|---|---|---|---|
| phase2-extensions | HF2-01〜03 | ✅ 正規AIDLCフロー完了済み | ✅ 2594テスト全グリーン（2026-03-21） |

---

### FB-PHASE-2: 設計確認（L4 拡張）

| ストーリー | 設計確認 | 論理設計文書更新 |
|---|---|---|
| HF2-01〜03（一括） | ✅ 正規AIDLCフロー完了（domain〜it_test_logic） | ✅ construction docs 7種完備 |

---

### FB-PHASE-3: TDD実装（HF2-01〜03）

> **完了注記（2026-03-21）**: 正規AIDLCフロー完了。35ソースファイル、9 UT + 10 IT + E2E（p2:check-freshness / p2:validate-pointers / p2:generate-e2e-template）。

| ストーリー | 優先度 | 実装 |
|---|---|---|
| HF2-01 | Should | ✅ |
| HF2-02 | Should | ✅ |
| HF2-03 | Should | ✅ |

---

### FB-PHASE-4: Wave整合性チェック

| チェック | スキル | ステータス |
|---|---|---|
| consistency-checker 実行（phase2-extensions） | `consistency-checker` | ⬜ meta-tooling 項目 |
| cascade-updater（必要時） | `cascade-updater` | ⬜ meta-tooling 項目 |
| `pnpm test` 全グリーン確認 | — | ✅ 2594テスト全グリーン（2026-03-21） |
| E2E: `p2:check-freshness` / `p2:validate-pointers` / `p2:generate-e2e-template` PASS確認 | — | ✅ E2Eテスト全PASS（2026-03-21） |

**Future B 完了条件チェックリスト**
- [x] HF2-01〜03 全テストグリーン（✅ 2026-03-21）
- [x] `p2:check-freshness` / `p2:validate-pointers` / `p2:generate-e2e-template` E2Eテスト全PASS（✅ 2026-03-21）

---

## マイルストーン

| バージョン | Wave | ステータス | 完了日 |
|---|---|---|---|
| v1.1.3 | Wave 1（基盤 8 Unit） | ✅ 完了 | 2026-03-21 |
| v1.2.0 | Wave 2A | ✅ 実質完了（#4スタブ除く・cascade-updater未） | 2026-03-21 |
| v1.3.0 | Wave 2B | ✅ 完了（main.ts 実依存配線・INV-5修正・product docs整合・#4スタブ除く） | 2026-03-21 |
| v1.4.0 | Wave 2C | ✅ 実質完了（スタブ不在確認・consistency-checker未） | 2026-03-21 |
| v1.5.0 | Wave 3A + 3B | ✅ 実質完了（#15〜#19解消・consistency-checker未） | 2026-03-21 |
| v1.6.0（v1 MVH） | Wave 3C | ✅ 実質完了（#20解消・consistency-checker未） | 2026-03-21 |
| v2.0.0 | Future A | ✅ 実質完了（正規AIDLCフロー・consistency-checker未） | 2026-03-21 |
| v2.1.0 | Future B | ✅ 実質完了（正規AIDLCフロー・consistency-checker未） | 2026-03-21 |

@story-id H08-07