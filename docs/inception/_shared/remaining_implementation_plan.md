# 残実装 一括 Wave 実装計画

> **作成日**: 2026-03-21
> **改訂日**: 2026-03-21（codex レビュー指摘 #1〜#6 対応 → 品質防衛バリデータ追加: L1-017/L1-018/L2-013 + スキル DoD 強化）
> **対象バージョン**: v1.2.0 以降
> **前提**: Wave 1（8 Unit）実装完了・全テストグリーン（v1.1.3）

---

## QA（設計判断の根拠）

**Q: なぜ Wave 2/3/Future を「一括 Wave」として計画するのか？**
A: Wave 1 完了後に全未実装機能の依存関係が確定しており、個別計画よりも全体の順序付けを統一したほうが作業効率が高い。また Unit 間スタブ補完（harness-api アダプタ差し替え等）が複数 Wave にまたがるため、全体俯瞰が必要。

**Q: harness-api（H09）を Wave 2B 先頭に置く根拠は？**
A: `agent-integration_unit.md` および `integration_contract.md` で「harness-api → agent-integration」の依存順序が明記されている。agent-integration は harness-api の CLI Command Registry / HarnessApiResponse DTO を消費するため、harness-api が先に完成している必要がある。

**Q: Future Phase（fuse-hooks-engine / phase2-extensions）を今回の計画に含める根拠は？**
A: ドメインロジック・インフラアダプタのスタブは実装済みでテスト通過済み。残作業は Extension Points 統合と OS レベルバインディングのみ。Wave 3C 完了後に着手可能な状態になるため、今回の計画に含めて順序を確定させる。

**Q: regression-suite H14 Phase A を Wave 3A/3B 並行トラックとして分離する根拠は？**
A: `regression_suite_unit.md` で「H14 Phase A は Wave 2 後半から先行着手可能」と明示されている。全 Unit 完了を待つ必要がなく、待機コストを無駄にしない。H15（v0 テスト資産移行）は全 Unit 完了後が前提のため Wave 3C に残す。

**Q: 実装順序の優先原則は何か？**
A: 下位 Unit から上位 Unit へ（依存方向に沿う）。具体的には「依存される Unit が先」「スタブ補完は依存先 Unit 完了直後に同 Wave 内で実施」「regression H14 Phase A は先行開始で並列活用」「regression H15 のみ最終確認として後置」。

**Q: L1-017/L1-018/L2-013 を Wave 2A validator-system に追加する根拠は？**
A: 全機能実装完了後も実動作バグが残存した根本原因分析から、3 つの構造的欠陥が特定された。①ITテストのモック化（境界未検証）②スタブ残存の見落とし③CLIレイヤーの検証欠如。これらはスキルルールだけでは人的漏れが防げないため、ハーネスの静的解析バリデータとして自動検出機構を追加する。L1-017/L1-018 は grep ベースで実装可能であり、validator-system と同 Wave での実装が効率的。L2-013 は設計文書参照が必要なため Should 優先度とする。

**Q: H12-07（スキル DoD・Tier1 強化）を Wave 3A に含める根拠は？**
A: H12-07 は L1-017/L1-018 の存在を前提とする（`npx harness lint` で新バリデータが PASS することを DoD に組み込む）。validator-system 完了（Wave 2A）後でなければ DoD の記述が意味を持たないため、スキル品質強化 Wave（Wave 3A）に配置する。

---

## 計画内容

### 全体像

```
Wave 2A（並行）: コアバリデータ本実装
  ├─ validator-system    （H08-01〜09 + スタブ 7 件差し替え）
  └─ nyquist-validation  （H07-01〜04 + スタブ 2 件差し替え）

Wave 2B: CLI 統合層実装
  └─ harness-api         （H09-01〜04 + 内部スタブ 5 件差し替え）
                          ※ validator-system + nyquist-validation 完了後

Wave 2C（並行）: 実行時統合
  ├─ quick-mode          （H10-01〜04）
  └─ agent-integration   （H11-01〜04）
                          ※ harness-api 完了後

Wave 3A（並行）: スキル品質拡張
  └─ skill-quality       （H12-01〜07 + スタブ 4 件差し替え）
                          ※ Wave 2C 完了後

Wave 3B（並行, 3A と同時開始可）: CI/運用拡張 + 回帰テスト先行
  ├─ ci-governance       （H13-01〜03 + スタブ 1 件差し替え）
  └─ regression H14      （H14-01〜03 / Phase A 先行着手）
                          ※ Wave 2C 完了後

Wave 3C: 回帰テスト完成（v1 MVH 完成）
  └─ regression H15      （H15-01〜02 + スタブ 1 件差し替え）
                          ※ Wave 3A + 3B 両方完了後

Future A: OS レベル強制
  └─ fuse-hooks-engine   （HF1-01〜05）
                          ※ Wave 3C 完了後

Future B（Future A と並行可）: L4 拡張
  └─ phase2-extensions   （HF2-01〜03）
                          ※ Wave 3C 完了後
```

---

## Wave 2A: コアバリデータ本実装（並行）

### Unit: validator-system

**先頭 Unit。全スタブ補完の依存元。nyquist-validation と並行実行可。**

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H08-01 | L2 test-quality バリデータ | Must | AAA / actual 命名 / single-act / no-domain-mock 検出 |
| H08-02 | L3 security + performance バリデータ | Must | ハードコード秘密・SQL インジェクション・ループ内 await・N+1 検出 |
| H08-03 | L3 coverage バリデータ | Must | カバレッジ閾値検証（standard: 90% / strict: 95%） |
| H08-04 | L4 drift-detect バリデータ | Must | 設計↔コード双方向乖離検出 |
| H08-05 | L4 consistency-check バリデータ | Must | 文書間レイヤー整合性チェック |
| H08-06 | L4 dead-code バリデータ | Must | 未使用エクスポート・到達不能コード検出 |
| H08-07 | L1-017 ITテスト内部モック検出バリデータ | Must | `__tests__/integration/**` 内の内部パス（`../` / `./`）への `vi.mock` を検出し BLOCK |
| H08-08 | L1-018 スタブコメント残存検出バリデータ | Must | `src/**` 内の `// STUB` / `// stub` / `throw new NotImplementedError` を検出し BLOCK |
| H08-09 | L2-013 CLIコマンドE2Eテスト存在チェック | Should | presentation 層 CLI コマンド定義 ↔ `__tests__/e2e/**` の対応チェック・未カバー WARN |

**同 Wave 内スタブ差し替え（H08 完了後）:**

| アダプタファイル | 差し替え内容 | 関連ストーリー |
|---|---|---|
| `ast-performance-scanner-adapter.ts` | biome-ast-engine の ImportGraph 解析を使用 | H08-02 |
| `import-graph-source-analysis-adapter.ts` | biome-ast-engine の ImportGraph を使用 | H08-04 |
| `adr-foundation-reference-adapter.ts` | adr-foundation の公開 I/F を使用 | H08-01 |
| `nyquist-ac-coverage-policy-adapter.ts` | nyquist-validation の公開 I/F を使用（Wave 2A 完了時） | H08-01 |
| `phase-dependency-phase-gate-policy-adapter.ts` | phase-dependency-model の公開 I/F を使用 | H08-01 |
| `biome-ast-source-code-analyzer-adapter.ts` | biome-ast-engine の AST 解析 I/F を使用 | H08-02/H08-04 |
| `markdown-design-document-adapter.ts` | ファイルシステム上の設計 MD を直接読む実装に変更 | H08-04/H08-05 |

**Wave 2A validator-system 完了条件:**
- H08-01〜08 全テストグリーン（H08-09 は Should のため任意）
- 上記 7 件のスタブコメントが消えていること
- `npx harness validate --layer L1` で L1-017/L1-018 が有効になっていること

---

### Unit: nyquist-validation

**validator-system と並行可。harness-api H09-02/H09-03 の前提。**

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H07-01 | requirement-test-matrix.json 新設 | Must | `@story` メタデータから要件↔テストマッピング JSON を生成 |
| H07-02 | phase-gate AC マッピング完了チェック追加 | Must | AC カバレッジ判定ロジック本実装 |
| H07-03 | test-coverage-checker での要件カバレッジ算出 | Must | coverage 閾値と nyquist 結果の統合 |
| H07-04 | harness:impact-analysis HXX-XX コマンド | Should | 指定ストーリーに紐づくテストケース一覧を返却 |

**同 Wave 内スタブ差し替え（H07 完了後）:**

| アダプタファイル | 差し替え内容 | 関連ストーリー |
|---|---|---|
| `traceability-model-story-registry-adapter.ts` | traceability-model の公開 I/F を使用 | H07-01 |
| `config-foundation-coverage-threshold-adapter.ts` | config-foundation の coverageThreshold を参照 | H07-03 |

**Wave 2A nyquist-validation 完了条件:**
- H07-01〜04 全テストグリーン
- requirement-test-matrix.json が生成されること
- 上記 2 件のスタブコメントが消えていること

---

## Wave 2B: CLI 統合層実装

**Wave 2A（validator-system + nyquist-validation）両方完了後に開始。**

### Unit: harness-api

**agent-integration が依存する CLI Contract の提供元。先に完成させる。**

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H09-01 | harness:check-ready / harness:check-phase | Must | 全 story の Phase Gate 通過状態返却 / 指定 Unit の現在フェーズ返却 |
| H09-02 | harness:ci-check | Must | 全 L3 バリデータ順次実行・Pass/Fail 詳細＋HarnessError 一覧返却 |
| H09-03 | harness:detect-drift | Must | 設計↔コード双方向乖離レポート（`--json` フラグ対応） |
| H09-04 | harness:status（成果物駆動状態導出） | Must | FS 上の成果物存在から L1-L4 健全性・Phase Gate 状態・プリセット情報を導出 |

**同 Wave 内スタブ差し替え（H09 実装の一部として）:**

| アダプタファイル（harness-api 内） | 差し替え内容 | 関連ストーリー |
|---|---|---|
| `biome-ast-engine-lint-adapter.ts` | biome-ast-engine の正式 I/F に差し替え | H09-02 (`harness:lint`) |
| `validator-system-execution-adapter.ts` | validator-system の正式 I/F に差し替え（L1-L4 全バリデータ） | H09-02 (`harness:ci-check`, `harness:complete-check`) |
| `phase-dependency-model-query-adapter.ts` | phase-dependency-model の正式 I/F に差し替え | H09-01 (`harness:check-phase`) |
| `nyquist-validation-impact-analysis-adapter.ts` | nyquist-validation の正式 I/F に差し替え | H07-04（`harness:impact-analysis` の CLI エントリポイント配線） |
| `harness-config-query-adapter.ts` | `getPhaseGateSummary()` の wave2-pending を phase-dependency-model の正式 I/F に差し替え | H09-04 (`harness:status` の Phase Gate サマリー導出) |

**Wave 2B 完了条件:**
- H09-01: `npx harness harness:check-ready` / `harness:check-phase <unit>` が正常動作
- H09-02: `npx harness harness:ci-check` がフルモード（L3 全バリデータ）で動作
- H09-03: `npx harness harness:detect-drift` が JSON 出力対応で動作
- H09-04: `npx harness harness:status` が成果物駆動で L1-L4 健全性・Phase Gate サマリーを返却
- H07-04連動: `npx harness harness:impact-analysis <HXX-XX>` が正常動作
- harness-api 内スタブコメント 5 件が消えていること

---

## Wave 2C: 実行時統合（並行）

**Wave 2B（harness-api）完了後に開始。quick-mode と agent-integration は並行可。**

### Unit: quick-mode

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H10-01 | Quick Mode 設定（harness.config.json quickMode セクション） | Must | allowedCategories / maintainedLayers / relaxedGates スキーマ確定 |
| H10-02 | Quick Mode 判定エンジン | Must | コミット対象ファイルから Quick Mode 適用可否を判定するドメインサービス |
| H10-03 | Quick Mode バリデータ緩和実行 | Must | L3 は security のみ・phase-gate 緩和等の選択ロジック |
| H10-04 | quick-implementor スキル | Should | SKILL.md 作成・harness.config.json quickMode 連動 |

**Wave 2C quick-mode 完了条件:**
- H10-01〜04 全テストグリーン
- `harness.config.json` の quickMode セクションが有効化できること

---

### Unit: agent-integration

**harness-api の CLI Command Registry / HarnessApiResponse DTO を消費。Wave 2B 完了後に開始。**

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H11-01 | コア品質能力の CLI/FS フォールバック定義 | Must | エージェント非依存フォールバックの設計・ドキュメント化 |
| H11-02 | Claude Code PreToolUse Hook Adapter（リンター設定保護） | Must | `.biome.json` / `tsconfig.json` 変更阻止フック |
| H11-03 | Claude Code PostToolUse Hook Adapter（Biome 高速リント） | Must | ファイル保存後の Biome リント自動実行フック（`harness:lint --fast` を呼ぶ） |
| H11-04 | Claude Code Stop Hook Adapter（テストゲート + 無限ループ防止） | Must | セッション終了前の全テストグリーン強制・同一エラー繰り返し検出 |

**Wave 2C agent-integration 完了条件:**
- H11-01〜04 全テストグリーン
- `.claude/settings.json` の hooks 設定が動作確認できること

---

## Wave 3A: スキル品質拡張

**Wave 2C（quick-mode + agent-integration）両方完了後に開始。Wave 3B と並行可。**

### Unit: skill-quality

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H12-01 | story-implementor Atomic Git Commits + TDD 品質契約 | Must | 1 テスト赤→緑→リファクタ = 1 コミット強制、TDD サイクル検証 |
| H12-02 | test-coverage-checker Nyquist Validation 統合 | Must | `skill:check-coverage` コマンドに Nyquist 検証結果を統合 |
| H12-03 | implementation-readiness-checker Plan-Checker Loop 統合 | Must | plan 文書存在 + QA 完了チェックループ |
| H12-04 | Agent-Lesson System（lesson artifact 出力） | Must | `skill:collect-lessons` コマンド → `lessons.md` 生成 |
| H12-05 | Cascade Updater 拡張（Level 3 完了後の累積更新 + @story-id 自動付与） | Must | `skill:apply-cascade-update` コマンド拡張 |
| H12-06 | スキル SKILL.md 構造維持検証 | Must | `skill:validate-structure` の全スキル定期検証 CI 統合 |
| H12-07 | スキル DoD・Tier1 強化（L1-017/L1-018 連動） | Must | `story-implementor` DoD に「`npx harness lint` で L1-017/L1-018 PASS」を追加。`codex-delegator` Tier1 にスタブコメント grep を BLOCK 追加 |

**同 Wave 内スタブ差し替え（H12 完了後）:**

| アダプタファイル | 差し替え内容 | 関連ストーリー |
|---|---|---|
| `vitest-coverage-runner-adapter.ts` | Vitest API を使用したカバレッジ実行の本実装 | H12-02 |
| `composition-root.ts`（PlanCheckExecutorPort 仮実装） | `PlanCheckExecutorPort` の本実装配線（3 回ループ・閾値未達時エスカレーション）に差し替え | H12-03 |
| `l1-biome-validator-adapter.ts` | biome-ast-engine の正式 I/F を使用した L1 バリデータ本実装 | H12-01（Atomic commit 前の L1 バリデータ実行） |
| `l2-validator-system-adapter.ts` | validator-system の正式 I/F を使用した L2 バリデータ本実装 | H12-01（Atomic commit 前の L2 バリデータ実行） |

**Wave 3A 完了条件:**
- H12-01〜07 全テストグリーン
- `skill:check-coverage` / `skill:collect-lessons` / `skill:apply-cascade-update` が動作すること
- スタブ #15〜#18 がすべて本実装に差し替え済みであること:
  - `vitest-coverage-runner-adapter.ts` のスタブコメントが消えていること（stub #15）
  - H12-03: `composition-root.ts` の `PlanCheckExecutorPort` 本実装配線済み・3 回ループと閾値未達エスカレーションが動作すること（stub #16）
  - `l1-biome-validator-adapter.ts` のスタブコメントが消えていること（stub #17）
  - `l2-validator-system-adapter.ts` のスタブコメントが消えていること（stub #18）

---

## Wave 3B: CI/運用拡張 + 回帰テスト先行（並行）

**Wave 2C 完了後、Wave 3A と並行開始可。**

### Unit: ci-governance

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H13-01 | CI/CD テンプレート | Must | `aidlc-gate.yml` / `consistency-check.yml` / `.husky/pre-commit` 生成コマンド |
| H13-02 | 反復エラー自動エスカレーション | Should | 同一 HarnessError コード 3 回連続検出→エスカレーション通知 |
| H13-03 | AGENTS.md ポインタ型移行 | Should | `ci:migrate-agents-md` コマンド実装 |

**同 Wave 内スタブ差し替え（H13 完了後）:**

| アダプタファイル | 差し替え内容 | 関連ストーリー |
|---|---|---|
| `validator-id-registry-adapter.ts` | validator-system の Validator ID Registry を使用した本実装 | H13-01 |

**Wave 3B ci-governance 完了条件:**
- H13-01〜03 全テストグリーン
- `npx harness ci:generate-template` が 3 種テンプレートを生成できること
- `validator-id-registry-adapter.ts` のスタブコメントが消えていること

---

### regression-suite H14 Phase A（Wave 3B 並行トラック）

**`regression_suite_unit.md` に「Wave 2 後半から先行着手可能」と明記されているため Wave 3B で先行開始。**

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H14-01 | K1-K13 回帰テスト整備 | Must | 非交渉要件 K1-K13 の自動回帰テスト（`regression:run-k-requirements`） |
| H14-02 | K14-K15 回帰テスト + エージェント非依存ガード | Must | Phase Dependency Model・plan 文書必須の回帰テスト（`regression:run-k14-k15` / `regression:run-agent-guard`） |
| H14-03 | Go/No-Go Gate 品質側 3 条件回帰テスト | Must | GNG-4（yolo 不採用）/ GNG-5（2-Phase 維持）/ GNG-8（デフォルト OFF）（`regression:run-gng-gate`） |

**Wave 3B H14 完了条件:**
- H14-01〜03 全テストグリーン
- `npx harness regression:run-k-requirements` / `regression:run-k14-k15` / `regression:run-agent-guard` / `regression:run-gng-gate` が有意な結果を返すこと（stub「0/0 passed」ではないこと）

---

## Wave 3C: 回帰テスト完成（v1 MVH 完成）

**Wave 3A + Wave 3B 両方完了後に開始。**

### regression-suite H15

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| H15-01 | v0 143 テスト仕様の v1 再実装 | Must | v0 の 143 テスト仕様を v1 アーキテクチャで再実装（Vitest テストランナーアダプタ本実装含む） |
| H15-02 | v1 再実装テストの CI ゲート化 | Must | `regression:configure-ci-gate` コマンド本実装・CI パイプライン統合 |

**同 Wave 内スタブ差し替え（H15 完了後）:**

| アダプタファイル | 差し替え内容 | 関連ストーリー |
|---|---|---|
| `vitest-test-runner-adapter.ts` | Vitest API を使用したテスト実行・カバレッジ結果抽出の本実装 | H15-01 |

**Wave 3C 完了条件 = v1 MVH 完成条件:**
- H15-01〜02 全テストグリーン
- `npx harness regression:configure-ci-gate` が CI ゲートを設定できること
- `vitest-test-runner-adapter.ts` のスタブコメントが消えていること
- K1-K15 非交渉要件が全て回帰テストでカバーされていること

---

## Future A: OS レベル強制

**Wave 3C 完了後に開始。**

### Unit: fuse-hooks-engine

**ドメインロジック・スタブアダプタは実装済み・テスト通過済み。残作業は Extension Points 統合と FUSE バインディング。**

| ストーリー ID | タイトル | 優先度 | 残作業 |
|---|---|---|---|
| HF1-01 | .harness-hooks.yml 宣言的フック定義 | Must | `YamlHookConfigReaderAdapter` の `JSON.parse` を YAML パーサ（`js-yaml` 等）に変更 |
| HF1-02 | FUSE パススルー + PreWrite/PostWrite | Must | `FusePreWriteHandlerAdapter` に libfuse/fuse-t バインディング実装 |
| HF1-03 | PreRead Hook 機密ファイルブロック | Must | `FusePreReadHandlerAdapter` に FUSE バインディング実装 |
| HF1-04 | シェルラッパー PreBash/PostBash | Must | `ShellWrapperAdapter` の PATH override 実装 |
| HF1-05 | 完了ゲート Magic File + CLI | Must | `CompletionGateFileAdapter` を harness-api CommandRegistry に統合（Extension Point 利用） |

**利用する Extension Points（v1 側に確保済み）:**
- validator-system の L0 バリデータ登録インターフェース
- harness-api の CommandRegistry（`harness:complete` コマンド追加）
- config-foundation の `layers.L0` スキーマ拡張ポイント

**外部依存:**
- macOS: `fuse-t`（FUSE-T）
- Linux: `libfuse` + `node-fuse-bindings`

**Future A 完了条件:**
- HF1-01〜05 全テストグリーン
- `.harness-hooks.yml` 作成後に `npx harness hooks:config validate` が PASS すること
- FUSE マウント経由のファイル書き込みが PreWrite フックでインターセプトされること
- `npx harness hooks:gate-check --story <id>` が有意な結果を返すこと

---

## Future B: L4 拡張（Future A と並行可）

**Wave 3C 完了後に開始。**

### Unit: phase2-extensions

| ストーリー ID | タイトル | 優先度 | 実装内容 |
|---|---|---|---|
| HF2-01 | doc-freshness-checker（L4 拡張） | Should | 設計文書の最終更新日経過日数チェック。`harness.config.json` で閾値設定可。`npx harness p2:check-freshness` |
| HF2-02 | pointer-validator（L4 拡張） | Should | docs 内ファイルパス参照・AGENTS.md コマンドポインタの実在性検証。`npx harness p2:validate-pointers` |
| HF2-03 | E2E テスト戦略テンプレート（Playwright 統合） | Should | `npx harness p2:generate-e2e-template` コマンド・シードデータ管理・ページオブジェクトパターン |

**Future B 完了条件:**
- HF2-01〜03 全テストグリーン
- `p2:check-freshness` / `p2:validate-pointers` が実際の docs に対して有意な結果を返すこと
- `p2:generate-e2e-template` が Playwright テンプレートを生成できること

---

## 依存関係グラフ

```
Wave 1（完了）
└─ harness-error / biome-ast-engine / phase-dependency-model
   traceability-model / config-foundation / adr-foundation
          │
          ▼
Wave 2A（並行）
├─ validator-system（H08-01〜09 + スタブ 7 件）
└─ nyquist-validation（H07-01〜04 + スタブ 2 件）
          │
          ▼
Wave 2B
└─ harness-api（H09-01〜04 + 内部スタブ 5 件）
   ← validator-system + nyquist-validation の I/F を消費
          │
          ▼
Wave 2C（並行）
├─ quick-mode（H10-01〜04）
└─ agent-integration（H11-01〜04）
   ← harness-api の CLI Command Registry を消費
          │
          ▼
Wave 3A（並行）              Wave 3B（並行）
└─ skill-quality             ├─ ci-governance
   （H12-01〜07 + スタブ 4 件）  │  （H13-01〜03 + スタブ 1 件）
                              └─ regression H14 Phase A
                                 （H14-01〜03）
          │                           │
          └──────────┬────────────────┘
                     ▼
               Wave 3C
          └─ regression H15
             （H15-01〜02 + スタブ 1 件）
             = v1 MVH 完成
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     Future A               Future B
  fuse-hooks-engine      phase2-extensions
  （HF1-01〜05）          （HF2-01〜03）
```

---

## スタブ差し替え一覧（全体）

| # | アダプタファイル（パス省略） | Unit | 差し替え Wave | 依存 I/F |
|---|---|---|---|---|
| 1 | `ast-performance-scanner-adapter.ts` | validator-system | 2A | biome-ast-engine |
| 2 | `import-graph-source-analysis-adapter.ts` | validator-system | 2A | biome-ast-engine |
| 3 | `adr-foundation-reference-adapter.ts` | validator-system | 2A | adr-foundation |
| 4 | `nyquist-ac-coverage-policy-adapter.ts` | validator-system | 2A | nyquist-validation |
| 5 | `phase-dependency-phase-gate-policy-adapter.ts` | validator-system | 2A | phase-dependency-model |
| 6 | `biome-ast-source-code-analyzer-adapter.ts` | validator-system | 2A | biome-ast-engine |
| 7 | `markdown-design-document-adapter.ts` | validator-system | 2A | filesystem（直接実装） |
| 8 | `traceability-model-story-registry-adapter.ts` | nyquist-validation | 2A | traceability-model |
| 9 | `config-foundation-coverage-threshold-adapter.ts` | nyquist-validation | 2A | config-foundation |
| 10 | `biome-ast-engine-lint-adapter.ts` | harness-api | 2B | biome-ast-engine |
| 11 | `validator-system-execution-adapter.ts` | harness-api | 2B | validator-system |
| 12 | `phase-dependency-model-query-adapter.ts` | harness-api | 2B | phase-dependency-model |
| 13 | `nyquist-validation-impact-analysis-adapter.ts` | harness-api | 2B | nyquist-validation（H07-04 CLI 配線） |
| 14 | `harness-config-query-adapter.ts` | harness-api | 2B | phase-dependency-model（H09-04 Phase Gate サマリー） |
| 15 | `vitest-coverage-runner-adapter.ts` | skill-quality | 3A | Vitest API |
| 16 | `composition-root.ts`（PlanCheckExecutorPort 仮実装） | skill-quality | 3A | PlanCheckExecutorPort 本実装 |
| 17 | `l1-biome-validator-adapter.ts` | skill-quality | 3A | biome-ast-engine（H12-01 L1 バリデータ実行） |
| 18 | `l2-validator-system-adapter.ts` | skill-quality | 3A | validator-system（H12-01 L2 バリデータ実行） |
| 19 | `validator-id-registry-adapter.ts` | ci-governance | 3B | validator-system の Validator ID Registry |
| 20 | `vitest-test-runner-adapter.ts` | regression-suite | 3C | Vitest API |

---

## ストーリー数・規模サマリ

| Wave | Unit / トラック | Must | Should/Could | スタブ差し替え |
|---|---|---|---|---|
| 2A | validator-system + nyquist-validation | 11 | 2 | 9 件 |
| 2B | harness-api | 4 | 0 | 5 件 |
| 2C | quick-mode + agent-integration | 7 | 1 | 0 件 |
| 3A | skill-quality | 7 | 0 | 4 件 |
| 3B | ci-governance + regression H14 | 4 | 2 | 1 件 |
| 3C | regression H15 | 2 | 0 | 1 件 |
| Future A | fuse-hooks-engine | 5 | 0 | 0 件（既存スタブを本実装化） |
| Future B | phase2-extensions | 0 | 3 | 0 件 |
| **合計** | **9 Unit** | **40** | **8** | **20 件** |

---

## バージョニング計画

| リリース | Wave | 完了条件（受け入れ基準） |
|---|---|---|
| **v1.2.0** | Wave 2A | H07-01〜04 + H08-01〜08 全テストグリーン（H08-09 は Should）。スタブ #1〜#9 差し替え完了。validator-system + nyquist-validation の全ユニットテスト・統合テストがパスし、`requirement-test-matrix.json` が生成されること。L1-017/L1-018 が `npx harness validate --layer L1` で有効化されていること |
| **v1.3.0** | Wave 2B | H09-01〜04 全テストグリーン。スタブ #10〜#14 差し替え完了。`harness:check-ready` / `harness:check-phase <unit>` / `harness:ci-check`（フルモード）/ `harness:detect-drift` / `harness:status`（Phase Gate サマリー含む）/ `harness:impact-analysis <HXX-XX>` が全て正常動作 |
| **v1.4.0** | Wave 2C | H10-01〜04 + H11-01〜04 全テストグリーン。Quick Mode 適用可否判定が動作。Claude Code PreToolUse / PostToolUse / Stop Hook が動作 |
| **v1.5.0** | Wave 3A + 3B | H12-01〜07 + H13-01〜03 + H14-01〜03 全テストグリーン。スタブ #15〜#19 差し替え完了。`skill:check-coverage` / `skill:collect-lessons` / CI テンプレート 3 種生成 / `regression:run-k-requirements`・`regression:run-k14-k15`・`regression:run-agent-guard`・`regression:run-gng-gate` が全て有意な結果（stub 「0/0 passed」以外）を返すこと。`story-implementor` DoD / `codex-delegator` Tier1 が L1-017/L1-018 と連動していること |
| **v1.6.0** | Wave 3C | H15-01〜02 全テストグリーン。スタブ #20（`vitest-test-runner-adapter.ts`）差し替え完了。K1-K15 回帰テスト全パス。**v1 MVH 完成** |
| **v2.0.0** | Future A | HF1-01〜05 全テストグリーン。FUSE マウント動作確認。`hooks:config validate` / `hooks:gate-check` 動作。**5 層防御達成** |
| **v2.1.0** | Future B | HF2-01〜03 全テストグリーン。`p2:check-freshness` / `p2:validate-pointers` / `p2:generate-e2e-template` 動作 |

---

## 承認

- [x] 人間承認済み（品質防衛バリデータ追加・スキル DoD 強化を含む改訂版）（第9回 codex レビュー APPROVED: 2026-03-21）

@story-id H08-07