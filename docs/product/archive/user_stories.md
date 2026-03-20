# GSDLC Harness v1 — ユーザーストーリー一覧

> **ステータス**: 確定版
> **作成日**: 2026-03-10
> **入力**: `docs/inception/_shared/story_writer_plan.md`（Phase 1計画・承認済み）
> **合計**: 15 Epic / 55 ストーリー

---

## Epic一覧

| Epic ID | Epic名 | ストーリー数 |
|---------|--------|-------------|
| E-01 | コンテキストエンジニアリング基盤 | 4 |
| E-02 | Nyquist検証層 | 5 |
| E-03 | Quick Mode | 3 |
| E-04 | セッション継続性 | 3 |
| E-05 | 品質ハーネス強化（Hooks拡張） | 4 |
| E-06 | ADR・ドキュメント管理基盤 | 3 |
| E-07 | ライフサイクル管理 | 4 |
| E-08 | 設定ファイル分離（harness.config.json / orchestration.config.json） | 4 |
| E-09 | 非交渉要件K1-K13回帰保証 | 4 |
| E-10 | HarnessError拡充・AGENTS.md改善 | 2 |
| E-11 | ESLint→Biome全面移行 | 4 |
| E-12 | FUSE Hooks Engine（L0 Pre-write enforcement） | 5 |
| E-13 | 既存スキル強化 | 3 |
| E-14 | v0テスト資産移行 | 2 |
| E-15 | オーケストレーションコマンド定義 | 5 |

---

## E-01: コンテキストエンジニアリング基盤

### US-001: context-priority.jsonによるドキュメント優先度定義

**Epic**: E-01 コンテキストエンジニアリング基盤

**As a** ハーネス管理者,
**I want to** `.harness/context-priority.json`で各ドキュメントにcritical/important/reference/archiveの4段階優先度を定義したい,
**so that** AIエージェントのコンテキストウィンドウを効率的に配分し、コンテキスト腐敗を防止できる。

#### 受け入れ基準

- [ ] AC-1: `.harness/context-priority.json`ファイルが作成でき、JSONスキーマバリデーションに通過する
- [ ] AC-2: 各ドキュメントエントリにcritical/important/reference/archiveのいずれかの優先度を指定できる
- [ ] AC-3: `harness:status`コマンドで現在のコンテキスト優先度設定が表示される
- [ ] AC-4: 存在しないファイルパスが指定された場合、バリデーションエラーが発生する

#### 対応要件
REQ-CE-001

---

### US-002: SKILL.mdへのコンテキストバジェット明記

**Epic**: E-01 コンテキストエンジニアリング基盤

**As a** スキル開発者,
**I want to** 各SKILL.mdに参照すべきドキュメントの上限サイズ（コンテキストバジェット）を明記したい,
**so that** Executor起動時に適切な量のドキュメントのみをロードし、コンテキスト圧迫を防止できる。

#### 受け入れ基準

- [ ] AC-1: v0既存26スキルのSKILL.mdに`コンテキストバジェット`セクションが追加されている（v1新規7スキルは作成時に含める）
- [ ] AC-2: 各SKILL.mdにcritical/importantドキュメントの一覧と推定トークン数が記載されている
- [ ] AC-3: 合計推定トークン数が200Kの50%（100K）を超えるスキルに警告コメントが記載されている
- [ ] AC-4: SKILL.md構造検証バリデータが`コンテキストバジェット`セクションの存在をチェックする

#### 対応要件
REQ-CE-002

---

### US-003: Fresh Context Protocolガイドライン策定

**Epic**: E-01 コンテキストエンジニアリング基盤

**As a** 開発者,
**I want to** Executor向けFresh Context Protocol（200Kバジェット、優先度付きドキュメントロード）のガイドラインに従いたい,
**so that** 各Executorが常にフレッシュなコンテキストで作業し、品質の高いコードを生成できる。

#### 受け入れ基準

- [ ] AC-1: Fresh Context Protocolガイドラインドキュメントが作成されている
- [ ] AC-2: ガイドラインにExecutorごとの200Kコンテキストバジェット配分方針が記載されている
- [ ] AC-3: ガイドラインにcontext-priority.jsonに基づくドキュメントロード順序が定義されている
- [ ] AC-4: ガイドラインにCompact実行時の優先保持ルールが記載されている

#### 対応要件
REQ-CE-003

---

### US-004: Compact時の優先保持ファイル指示

**Epic**: E-01 コンテキストエンジニアリング基盤

**As a** 開発者,
**I want to** Compact時に優先保持すべきファイルリストをAGENTS.mdから参照したい,
**so that** コンテキスト圧縮時に重要な設計文書が失われず、作業の一貫性が維持される。

#### 受け入れ基準

- [ ] AC-1: AGENTS.mdにCompact時の優先保持ファイルリストへのポインタが記載されている
- [ ] AC-2: 優先保持リストがcontext-priority.jsonのcritical/importantエントリと連動している
- [ ] AC-3: AGENTS.md内のポインタが実在するファイルを参照している（pointer-validatorで検証可能）

#### 対応要件
REQ-CE-004

---

## E-02: Nyquist検証層

### US-005: requirement-test-matrix.jsonの新設

**Epic**: E-02 Nyquist検証層

**As a** 品質管理者,
**I want to** `product/construction/{unit}/requirement-test-matrix.json`でAC→テストケースマッピングを定義したい,
**so that** 要件とテストの双方向トレーサビリティが保証され、テスト漏れを機械的に検出できる。

#### 受け入れ基準

- [ ] AC-1: requirement-test-matrix.jsonのJSONスキーマが定義されている
- [ ] AC-2: スキーマにUser Story ID、AC ID、テストケースファイルパス、テスト種別（unit/it/scenario）のフィールドが含まれている
- [ ] AC-3: スキーマバリデーションが通過するサンプルファイルが作成されている
- [ ] AC-4: 無効なスキーマのファイルに対してバリデーションエラーが検出される

#### 対応要件
REQ-NQ-001

---

### US-006: phase-gateへのACマッピング完了チェック追加

**Epic**: E-02 Nyquist検証層

**As a** 開発者,
**I want to** phase-gateに「全AC→テストケースマッピング完了」チェックが含まれてほしい,
**so that** テストマッピングが不完全な状態で実装フェーズに進むことを防止できる。

#### 受け入れ基準

- [ ] AC-1: phase-gate.tsのcheckImplementationReadiness()にACマッピング完了チェックが追加されている
- [ ] AC-2: requirement-test-matrix.jsonに未マッピングのACが存在する場合、phase-gateが失敗する
- [ ] AC-3: 全ACがマッピング済みの場合、phase-gateが正常に通過する
- [ ] AC-4: phase-gate失敗時のHarnessErrorに未マッピングAC一覧が含まれる

#### 対応要件
REQ-NQ-002

---

### US-007: test-coverage-checkerでの要件カバレッジ算出

**Epic**: E-02 Nyquist検証層

**As a** 品質管理者,
**I want to** test-coverage-checkerで要件カバレッジ（AC網羅率）を算出したい,
**so that** コードカバレッジだけでなく、要件レベルでのテスト充足度を把握できる。

#### 受け入れ基準

- [ ] AC-1: test-coverage-checkerがrequirement-test-matrix.jsonを読み込み、AC網羅率を算出する
- [ ] AC-2: カバレッジレポートにAC網羅率（マッピング済みAC数/全AC数）が含まれる
- [ ] AC-3: AC網羅率が100%未満の場合、未カバーACの一覧がレポートに出力される
- [ ] AC-4: コードカバレッジ（90%閾値）と要件カバレッジの両方がレポートに含まれる

#### 対応要件
REQ-NQ-003

---

### US-008: harness:impact-analysisコマンドの新設

**Epic**: E-02 Nyquist検証層

**As a** 開発者,
**I want to** `harness:impact-analysis US-XXX`でUser Story変更時の影響テストケースを自動特定したい,
**so that** ストーリー変更の影響範囲を迅速に把握し、必要なテストを効率的に実行できる。

#### 受け入れ基準

- [ ] AC-1: `harness:impact-analysis US-XXX`コマンドが実行可能である
- [ ] AC-2: 指定されたUser Storyに紐づくテストケース一覧が出力される
- [ ] AC-3: 存在しないUS IDが指定された場合、適切なエラーメッセージが表示される
- [ ] AC-4: 出力にテスト種別（unit/it/scenario）が含まれる

#### 対応要件
REQ-NQ-004

#### 備考
優先度: Should

---

### US-009: VALIDATION.mdの自動生成

**Epic**: E-02 Nyquist検証層

**As a** 品質管理者,
**I want to** 実行前にVALIDATION.mdを自動生成し、要件-テストマッピングの完全性を記録したい,
**so that** 実行前の品質状態を記録として残し、監査可能にできる。

#### 受け入れ基準

- [ ] AC-1: VALIDATION.mdが`docs/inception/{unit}/{US}/validation.md`に自動生成される
- [ ] AC-2: VALIDATION.mdにrequirement-test-matrix.jsonからのマッピング状態が記載される
- [ ] AC-3: AC網羅率とテスト通過状態のサマリーが含まれる
- [ ] AC-4: 生成日時とバリデーション実行者（スキル名）が記録される

#### 対応要件
REQ-NQ-005

#### 備考
優先度: Should。v1ではWave並列は未実装のため、単一executor実行前のバリデーション記録として機能する。

---

## E-03: Quick Mode

### US-010: quick_modeセクションの定義

**Epic**: E-03 Quick Mode

**As a** ハーネス管理者,
**I want to** harness.config.jsonに`quick_mode`セクションでQuick Mode対象条件を定義したい,
**so that** Quick Modeの対象・対象外を明確に設定し、運用ポリシーに合わせてカスタマイズできる。

#### 受け入れ基準

- [ ] AC-1: harness.config.jsonに`quick_mode`セクションが追加されている
- [ ] AC-2: 対象条件（テストファイルのみの変更、docs配下の修正、typo修正、リファクタリング）が設定可能である
- [ ] AC-3: 対象外条件（新規ドメインモデル追加、API契約変更、新機能追加）が設定可能である
- [ ] AC-4: JSONスキーマバリデーションが通過する

#### 対応要件
REQ-QM-001

---

### US-011: Quick Modeでのバリデータ緩和実行とphase-gateスキップ

**Epic**: E-03 Quick Mode

**As a** 開発者,
**I want to** Quick ModeではL1全ルール維持 + L2選択実行（phase-gate緩和）+ L3 securityのみの構成で実行したい,
**so that** typo修正やテスト追加などの小規模変更を迅速に完了できる。

#### 受け入れ基準

- [ ] AC-1: Quick Mode実行時にL1全ルール（no-layer-violation, enforce-folder-structure等8ルール）が実行される
- [ ] AC-2: Quick Mode実行時にL2の`metadata`、`test-quality`バリデータが実行され、`phase-gate`はスキップされる
- [ ] AC-3: Quick Mode実行時にL3は`security`バリデータのみ実行される（performance, coverage, nyquistはスキップ）
- [ ] AC-4: Quick Mode対象の変更（テストファイルのみ、docs修正、typo修正、リファクタリング）が正しく判定される
- [ ] AC-5: Quick Mode対象外の変更（新規ドメインモデル追加、API契約変更、新機能追加）は拒否される
- [ ] AC-6: 対象判定ロジックの自動テストが存在する（対象/対象外の境界ケースを含む）
- [ ] AC-7: 混合的な変更（対象ファイル+対象外ファイルの同時変更）はQuick Mode対象外として拒否される

#### 対応要件
REQ-QM-002, REQ-QM-003, REQ-QM-004

---

### US-012: harness:quick-checkコマンドの新設

**Epic**: E-03 Quick Mode

**As a** 開発者,
**I want to** `harness:quick-check`コマンドでQuick Mode用のバリデーション実行をしたい,
**so that** Quick Mode対象の変更に対して、必要最小限の検証を手軽に実行できる。

#### 受け入れ基準

- [ ] AC-1: `harness:quick-check`コマンドが実行可能である
- [ ] AC-2: architecture/dependency/securityバリデータが実行される
- [ ] AC-3: バリデーション結果が成功/失敗のサマリーとして表示される
- [ ] AC-4: 失敗時にHarnessError形式でエラー詳細が出力される

#### 対応要件
REQ-QM-005

---

## E-04: セッション継続性

### US-013: session-state.jsonへのセッション状態自動保存

**Epic**: E-04 セッション継続性

**As a** 開発者,
**I want to** `.harness/session-state.json`にセッション状態を自動保存したい,
**so that** セッション中断時にも作業状態が失われず、再開時にスムーズに復帰できる。

#### 受け入れ基準

- [ ] AC-1: `.harness/session-state.json`にセッション状態がJSON形式で保存される
- [ ] AC-2: 保存情報に現在のSkill、対象Unit/Story、完了済みステップ、次のアクション、作業メモが含まれる
- [ ] AC-3: JSONスキーマバリデーションが通過する
- [ ] AC-4: スキル実行のステップ完了ごとに自動的に状態が更新される
- [ ] AC-5: session-state.json（セッション固有状態）とstate.json（プロジェクト状態、US-024）の責務分離がドキュメントに明記されている

#### 対応要件
REQ-SS-001

---

### US-014: harness:resumeによるセッション状態復元

**Epic**: E-04 セッション継続性

**As a** 開発者,
**I want to** セッション開始時に`harness:resume`で前回状態を復元したい,
**so that** セッション再開時に前回の作業位置と次のアクションを即座に把握できる。

#### 受け入れ基準

- [ ] AC-1: `harness:resume`コマンドが実行可能である
- [ ] AC-2: session-state.jsonから前回の進捗・次タスクが復元・表示される
- [ ] AC-3: 復元後に次のアクションが提案される
- [ ] AC-4: session-state.jsonが存在しない場合、「新規セッション」として適切に処理される
- [ ] AC-5: resume実行時に作業ディレクトリとGit状態（未コミット変更、ブランチ状態）が確認・表示される
- [ ] AC-6: resume実行時に疎通テスト（`pnpm test` サニティチェック）が実行され、失敗時に警告が表示される

#### 対応要件
REQ-SS-002

---

### US-015: Stop Hook/pause実行時のsession-state.json自動更新

**Epic**: E-04 セッション継続性

**As a** 開発者,
**I want to** Stop Hook実行時およびharness:pause実行時にsession-state.jsonを自動更新したい,
**so that** セッション中断のタイミングに関わらず、最新の作業状態が確実に記録される。

#### 受け入れ基準

- [ ] AC-1: Stop Hook実行時にsession-state.jsonが自動更新される
- [ ] AC-2: `harness:pause`コマンドでセッション状態が明示的に保存される
- [ ] AC-3: `harness:pause`実行時に次のアクションメモを記録できる
- [ ] AC-4: Stop Hook統合テストでsession-state.json更新が検証されている

#### 対応要件
REQ-SS-003, REQ-SS-004

---

## E-05: 品質ハーネス強化（Hooks拡張）

### US-016: PreToolUse Hookによるリンター設定保護

**Epic**: E-05 品質ハーネス強化（Hooks拡張）

**As a** ハーネス管理者,
**I want to** PreToolUse Hookでリンター設定ファイルの変更をブロックしたい,
**so that** AIエージェントがリンター設定を改変してエラーを消す行為を防止できる。

#### 受け入れ基準

- [ ] AC-1: PreToolUse Hookが`biome.json`、`tsconfig.json`、`package.json`の変更をブロックする
- [ ] AC-2: ブロック時に変更対象ファイル名を含むエラーメッセージが表示される
- [ ] AC-3: ブロック対象外のファイルへの変更は正常に実行される
- [ ] AC-4: Hook実行テストが存在する

#### 対応要件
REQ-QH-001

#### 備考
v1はBiomeネイティブのため、`.eslintrc*`/`eslint.config.*`は保護対象外（存在しない）。

---

### US-017: Stop Hookテストゲートの追加

**Epic**: E-05 品質ハーネス強化（Hooks拡張）

**As a** 品質管理者,
**I want to** Stop Hookに`pnpm test`全グリーンのテストゲートを追加したい,
**so that** エージェントが「完了」宣言する前にテスト全通過が保証される。

#### 受け入れ基準

- [ ] AC-1: Stop Hook実行時に`pnpm test`が自動実行される
- [ ] AC-2: テスト失敗時にStop Hookが失敗し、エージェントの完了が阻止される
- [ ] AC-3: テスト全グリーン時にStop Hookが正常終了する
- [ ] AC-4: Stop Hook統合テストが存在する

#### 対応要件
REQ-QH-002

---

### US-018: Stop Hookテストゲートの無限ループ防止

**Epic**: E-05 品質ハーネス強化（Hooks拡張）

**As a** ハーネス開発者,
**I want to** Stop Hookテストゲートに無限ループ防止機構（`stop_hook_active`フラグ）を実装したい,
**so that** テスト失敗→再試行→テスト失敗の無限ループを防止できる。

#### 受け入れ基準

- [ ] AC-1: `stop_hook_active`フラグが実装され、Stop Hook再入を検出できる
- [ ] AC-2: 再入検出時にStop Hookがスキップされ、適切な警告メッセージが表示される
- [ ] AC-3: Stop Hook正常終了時にフラグがリセットされる
- [ ] AC-4: 再入防止テストが存在する

#### 対応要件
REQ-QH-003

---

### US-019: Stop Hookへのharness:ci-check追加

**Epic**: E-05 品質ハーネス強化（Hooks拡張）

**As a** 品質管理者,
**I want to** Stop Hookに`harness:ci-check`実行を追加したい,
**so that** エージェント完了時にハーネスバリデーション全通過が保証される。

#### 受け入れ基準

- [ ] AC-1: Stop Hook内で`harness:ci-check`が`pnpm test`に続いて実行される
- [ ] AC-2: harness:ci-check失敗時にStop Hookが失敗する
- [ ] AC-3: 無限ループ防止機構（US-018）がharness:ci-checkにも適用される
- [ ] AC-4: Stop Hook統合テストが存在する

#### 対応要件
REQ-QH-004

#### 備考
優先度: Should

---

## E-06: ADR・ドキュメント管理基盤

### US-020: ADRテンプレートの整備

**Epic**: E-06 ADR・ドキュメント管理基盤

**As a** ハーネス管理者,
**I want to** ADRテンプレートを整備し、統一的な構造でADRを作成したい,
**so that** 技術的意思決定の記録が一貫した形式で蓄積され、後から参照・監査できる。

#### 受け入れ基準

- [ ] AC-1: `docs/ADR/`にADRテンプレートファイルが作成されている
- [ ] AC-2: テンプレートにタイトル/ステータス/コンテキスト/決定/結果/代替案の構造が含まれている
- [ ] AC-3: ステータスフィールドにProposed/Accepted/Deprecated/Supersededが設定可能である
- [ ] AC-4: テンプレートにフロントマター（YAML形式）が含まれ、機械的にステータスを判別可能である

#### 対応要件
REQ-AD-001

---

### US-021: 初期10件ADRの作成

**Epic**: E-06 ADR・ドキュメント管理基盤

**As a** ハーネス管理者,
**I want to** GSDLCの主要な技術的意思決定を初期10件のADRとして作成したい,
**so that** 設計判断の根拠が形式知として記録され、今後の意思決定の参照基盤となる。

#### 受け入れ基準

- [ ] AC-1: 以下のADRが`docs/ADR/`に作成されている（product_overview §16の全Key Decisionsをカバー）:
  - (1) フェーズゲート採用理由
  - (2) 5層防御モデル設計根拠
  - (3) Biome AST解析選定（ESLint→Biome全面移行）
  - (4) 2-Phase Execution設計
  - (5) inception/product分離設計
  - (6) harness.config.json統一設定
  - (7) DDD設計スキル群の設計哲学
  - (8) GSD2.0概念採用・npmパッケージ棄却
  - (9) Quick Mode導入とフェーズゲート緩和
  - (10) Nyquist検証層導入
  - (11) FUSE Hooks Engine横断基盤設計（レイヤーではなく横断基盤とした理由・オプショナル設計）
  - (12) 進捗記録のJSON構造化（STATE.md/ROADMAP.mdではなくJSON形式を採用した理由）
- [ ] AC-2: 各ADRがテンプレート構造（US-020）に準拠している
- [ ] AC-3: 各ADRのステータスが適切に設定されている（初期はProposedまたはAccepted）
- [ ] AC-4: 各ADRのフロントマターが機械的に解析可能である

#### 対応要件
REQ-AD-002

---

### US-022: ADRステータス管理の付与

**Epic**: E-06 ADR・ドキュメント管理基盤

**As a** ハーネス管理者,
**I want to** ADRにステータス管理を付与し、各ADRの有効性を機械的に判別したい,
**so that** 廃止・置換されたADRを参照するリスクを低減できる。

#### 受け入れ基準

- [ ] AC-1: 全ADRのフロントマターにstatusフィールドが含まれている
- [ ] AC-2: statusフィールドの値がProposed/Accepted/Deprecated/Supersededのいずれかである
- [ ] AC-3: Superseded状態のADRには後継ADRへの参照が含まれている
- [ ] AC-4: ADRフロントマターのバリデーションテストが存在する

#### 対応要件
REQ-AD-003

---

## E-07: ライフサイクル管理

### US-023: milestones.jsonによるマイルストーン管理

**Epic**: E-07 ライフサイクル管理

**As a** プロジェクトマネージャー,
**I want to** `docs/inception/_shared/milestones.json`でマイルストーンを管理したい,
**so that** プロジェクトの節目と各マイルストーンに含まれるStoryを構造的に把握できる。

#### 受け入れ基準

- [ ] AC-1: `docs/inception/_shared/milestones.json`が作成可能である
- [ ] AC-2: JSONスキーマにマイルストーン名、含まれるStory ID一覧、完了条件が定義されている
- [ ] AC-3: JSONスキーマバリデーションが通過する
- [ ] AC-4: 存在しないStory IDがマイルストーンに含まれる場合、バリデーションエラーが発生する

#### 対応要件
REQ-LC-001

---

### US-024: state.jsonによるプロジェクト状態追跡

**Epic**: E-07 ライフサイクル管理

**As a** プロジェクトマネージャー,
**I want to** `docs/inception/_shared/state.json`で現在のフェーズ・完了済みStory・残作業を追跡したい,
**so that** プロジェクトの現在地と残作業を正確に把握できる。

#### 受け入れ基準

- [ ] AC-1: `docs/inception/_shared/state.json`が作成可能である
- [ ] AC-2: JSONスキーマに現在のフェーズ、完了済みStory ID一覧、進行中Story、残作業が定義されている
- [ ] AC-3: JSONスキーマバリデーションが通過する
- [ ] AC-4: Story完了時にstate.jsonが更新される仕組みが定義されている
- [ ] AC-5: state.jsonから人間向けビュー`state.md`が生成される仕組みが定義されている
- [ ] AC-6: state.json（プロジェクト状態）と`.harness/session-state.json`（セッション固有状態）の責務分離が明確に定義されている

#### 対応要件
REQ-LC-002

---

### US-025: harness:progressコマンドによる進捗可視化

**Epic**: E-07 ライフサイクル管理

**As a** 開発者,
**I want to** `harness:progress`コマンドで進捗を可視化したい,
**so that** 現在の開発進捗とマイルストーン達成状況を一目で確認できる。

#### 受け入れ基準

- [ ] AC-1: `harness:progress`コマンドが実行可能である
- [ ] AC-2: milestones.jsonとstate.jsonの情報を組み合わせた進捗サマリーが表示される
- [ ] AC-3: 各マイルストーンの完了率（完了Story数/全Story数）が表示される
- [ ] AC-4: milestones.jsonまたはstate.jsonが存在しない場合、適切なエラーメッセージが表示される

#### 対応要件
REQ-LC-003

#### 備考
優先度: Should

---

### US-026: マイルストーン完了時の自動監査

**Epic**: E-07 ライフサイクル管理

**As a** 品質管理者,
**I want to** マイルストーン完了時に自動監査（`harness:audit-milestone`）を実行したい,
**so that** マイルストーン内の全Storyの品質基準達成を確認してからマイルストーンを完了できる。

#### 受け入れ基準

- [ ] AC-1: `harness:audit-milestone`コマンドが実行可能である
- [ ] AC-2: マイルストーン内の全StoryのACが満たされているか検証される
- [ ] AC-3: テストカバレッジ（90%閾値）が維持されているか検証される
- [ ] AC-4: 監査結果がサマリーとして出力される（合格/不合格、項目別詳細）

#### 対応要件
REQ-LC-004

#### 備考
優先度: Should

---

## E-08: 設定ファイル分離（harness.config.json / orchestration.config.json）

### US-027: orchestration.config.jsonの新設

**Epic**: E-08 設定ファイル分離（harness.config.json / orchestration.config.json）

**As a** ハーネス管理者,
**I want to** `orchestration.config.json`を新設し、オーケストレーション設定をharness.config.jsonから完全分離したい,
**so that** Wave実行、モデルルーティング、コンテキスト戦略などのオーケストレーション設定を独立管理できる。

#### 受け入れ基準

- [ ] AC-1: `orchestration.config.json`が作成可能であり、JSONスキーマが定義されている
- [ ] AC-2: スキーマにmode/parallelization/modelProfile/contextStrategy/commitStrategy/autoSupervisor/budgetCeilingの設定項目が含まれている
- [ ] AC-3: JSONスキーマバリデーションが通過する
- [ ] AC-4: GSD由来の設定項目がデフォルトで無効（`enabled: false`）になっている
- [ ] AC-5: orchestration.config.jsonはharness.config.jsonのプリセット値を読み取るが、harness.config.jsonへの書き込みは行わない

#### 対応要件
REQ-CF-001

---

### US-028: orchestration.config.jsonへのsessionセクション追加

**Epic**: E-08 設定ファイル分離（harness.config.json / orchestration.config.json）

**As a** ハーネス管理者,
**I want to** orchestration.config.jsonにsessionセクションを追加したい,
**so that** セッション状態ファイルとロードマップファイルのパスを設定で管理できる。

#### 受け入れ基準

- [ ] AC-1: orchestration.config.jsonに`session`セクションが追加されている
- [ ] AC-2: sessionセクションにstateFile/roadmapFile/sessionStateFileのパス設定が含まれている
- [ ] AC-3: デフォルト値が設定されている（stateFile: `docs/inception/_shared/state.json`, sessionStateFile: `.harness/session-state.json`等）
- [ ] AC-4: JSONスキーマバリデーションが通過する

#### 対応要件
REQ-CF-002

---

### US-029: GSD由来機能のデフォルト無効化

**Epic**: E-08 harness.config.json v2（設定統合）

**As a** ハーネス管理者,
**I want to** GSD由来機能をデフォルトで無効にしたい,
**so that** 既存プロジェクトへの影響なくProgressive adoptionを実現できる。

#### 受け入れ基準

- [ ] AC-1: orchestration.config.json内のGSD由来設定項目がデフォルトで`enabled: false`である
- [ ] AC-2: orchestration.config.jsonのsessionセクション内のGSD由来設定項目がデフォルトで`enabled: false`である
- [ ] AC-3: デフォルト値検証テストが存在する
- [ ] AC-4: `harness:enable <feature>`コマンドで個別機能を有効化できる
- [ ] AC-5: `harness:disable <feature>`コマンドで個別機能を無効化できる
- [ ] AC-6: 有効化/無効化可能な機能名一覧が`harness:enable --list`で表示される
- [ ] AC-7: 存在しない機能名が指定された場合、利用可能な機能名一覧を含むエラーメッセージが表示される

#### 対応要件
REQ-CF-003

---

### US-030: harness:migrate-configによるv1→v2自動マイグレーション

**Epic**: E-08 harness.config.json v2（設定統合）

**As a** ハーネス利用者,
**I want to** `harness:migrate-config`でv1設定からv2設定へ自動マイグレーションしたい,
**so that** 既存のv1設定を手動で書き換えることなく、v2フォーマットに移行できる。

#### 受け入れ基準

- [ ] AC-1: `harness:migrate-config`コマンドが実行可能である
- [ ] AC-2: v1形式のharness.config.jsonからv2形式のharness.config.json + orchestration.config.jsonに自動分離される
- [ ] AC-3: 品質設定はharness.config.jsonに保持され、オーケストレーション設定はorchestration.config.jsonに分離される
- [ ] AC-4: マイグレーション前にバックアップファイルが作成される
- [ ] AC-5: マイグレーション後の両ファイルがそれぞれのJSONスキーマバリデーションに通過する

#### 対応要件
REQ-CF-004

#### 備考
優先度: Should

---

## E-09: 非交渉要件K1-K13回帰保証

### US-031: 5層防御・Phase Gate・Biome AST・テスト品質の回帰テスト整備

**Epic**: E-09 非交渉要件K1-K13回帰保証

**As a** 品質管理者,
**I want to** L1-L4全バリデータ（4層防御）・Phase Gate・Biome AST解析・テスト品質ルールのv1回帰テストを整備したい,
**so that** v1機能追加の副作用でコア品質機構が破壊されないことを継続的に検証できる。

#### 受け入れ基準

- [ ] AC-1: L1-L4各レイヤーのバリデータ正常動作を検証する回帰テストが存在する
- [ ] AC-2: phase-gate.tsのcheckImplementationReadiness()の回帰テストが存在する
- [ ] AC-3: Biome AST解析（importグラフ解析+循環依存検出）の回帰テストが存在する
- [ ] AC-4: テスト品質ルール（AAA/actual/single-act/no-domain-mocking）の回帰テストが存在する
- [ ] AC-5: 全回帰テストがCIゲートに組み込まれている
- [ ] AC-6: K3.5 @unit/@layerメタデータ強制（require-unit-comment/require-layer-comment）の回帰テストが存在する

#### 対応要件
REQ-K-001, REQ-K-002, REQ-K-003, REQ-K-003.5, REQ-K-004

---

### US-032: スキル・2-Phase・Document Split・Cascade・Agent-Lessonの維持保証

**Epic**: E-09 非交渉要件K1-K13回帰保証

**As a** スキル開発者,
**I want to** 26スキル・2-Phase Execution・Document Split・Cascade Updater・Agent-Lesson Systemのv1維持を保証したい,
**so that** v0で確立した設計方法論と開発ワークフローがv1で確実に継承される。

#### 受け入れ基準

- [ ] AC-1: v0既存26スキルのSKILL.mdが所定の構造を維持していることを検証するテストが存在する（v1新規7スキルは別途構造検証）
- [ ] AC-2: 2-Phase Execution（Plan→Human Approval→Execute）フローの検証テストが存在する
- [ ] AC-3: inception/product分離（Document Split）の検証テストが存在する
- [ ] AC-4: Cascade Updater（下位変更→上位設計影響伝播）の回帰テストが存在する
- [ ] AC-5: Agent-Lesson System（[Agent-Lesson]自動収集→AGENTS.md更新）の回帰テストが存在する

#### 対応要件
REQ-K-005, REQ-K-006, REQ-K-007, REQ-K-008, REQ-K-009

---

### US-033: Security/Performance・Drift Detection・Consistency・config単一原則の維持保証

**Epic**: E-09 非交渉要件K1-K13回帰保証

**As a** 品質管理者,
**I want to** Security/Performance検出・Drift Detection・Consistency Checker・harness.config.json単一原則のv1維持を保証したい,
**so that** セキュリティ・パフォーマンス・整合性に関するv0の品質基準がv1で低下しない。

#### 受け入れ基準

- [ ] AC-1: Security検出（ハードコード秘密、SQLインジェクション）の回帰テストが存在する
- [ ] AC-2: Performance検出（ループ内await、N+1、bundleSizeLimit）の回帰テストが存在する
- [ ] AC-3: Drift Detection（設計-実装乖離の双方向検出）の回帰テストが存在する
- [ ] AC-4: Consistency Checker（文書間レイヤー整合性チェック）の回帰テストが存在する
- [ ] AC-5: 設定ファイル分離原則（harness.config.json + orchestration.config.json）の検証テストが存在する

#### 対応要件
REQ-K-010, REQ-K-011, REQ-K-012, REQ-K-013

---

### US-055: Go/No-Go Gate 8条件の回帰テスト整備

**Epic**: E-09 非交渉要件K1-K13回帰保証

**As a** 品質管理者,
**I want to** Go/No-Go Gate 8条件（product_overview §9.2）の全てを自動検証する回帰テストを整備したい,
**so that** v1リリース判定の絶対条件が継続的に満たされていることを機械的に保証できる。

#### 受け入れ基準

- [ ] AC-1: GNG-1「npmパッケージ非依存」の検証テスト（package.jsonにGSD関連パッケージが存在しないこと）が存在する
- [ ] AC-2: GNG-2「`.planning/`不使用」の検証テスト（`.planning/`ディレクトリが存在しないこと）が存在する
- [ ] AC-3: GNG-3「設定ファイル分離」の検証テスト（品質設定がharness.config.json、オーケストレーション設定がorchestration.config.jsonにあること）が存在する
- [ ] AC-4: GNG-4「yolo/skip-permissions不採用」の検証テスト（deny listとhooksが完全維持）が存在する
- [ ] AC-5: GNG-5「2-Phase Execution維持」の検証テスト（設計スキルの人間承認ゲート存在）が存在する
- [ ] AC-6: GNG-6「プロジェクトローカル実行」の検証テスト（`~/.claude/`へのグローバル書き込みがないこと）が存在する
- [ ] AC-7: GNG-7「既存コマンド体系尊重」の検証テスト（`/gsd:*`コマンドが露出していないこと）が存在する
- [ ] AC-8: GNG-8「デフォルトOFF」の検証テスト（GSD由来機能のデフォルト値がfalse/disabled）が存在する
- [ ] AC-9: 全8条件の検証テストがCIゲートに組み込まれている

#### 対応要件
product_overview §9.2 Go/No-Go Gate

---

## E-10: HarnessError拡充・AGENTS.md改善

### US-034: 全バリデータHarnessErrorのADR参照+修正コード例統一付与

**Epic**: E-10 HarnessError拡充・AGENTS.md改善

**As a** ハーネス開発者,
**I want to** 全バリデータのHarnessErrorにADR参照と修正コード例を統一的に付与したい,
**so that** AIエージェントがエラー発生時に自律的に修正方法を理解し、自己修正率を向上できる。

#### 受け入れ基準

- [ ] AC-1: 全バリデータ（standard 8: architecture/dependency/security/phase-gate/test-quality/layer-violation/folder-structure/format + strict 3: bundleSize/agentLesson/deadCode + v1新規: nyquist-ac-mapping等）のHarnessErrorに`adr_ref`フィールドが付与されている
- [ ] AC-2: 全バリデータのHarnessErrorに`fix_example`フィールドが付与されている
- [ ] AC-3: HarnessErrorの構造が`{code, severity, suggestion, adr_ref, fix_example}`に統一されている
- [ ] AC-4: 各バリデータのHarnessError出力テストが更新されている

#### 対応要件
product_overview §9.1

---

### US-035: AGENTS.mdのポインタ型移行

**Epic**: E-10 HarnessError拡充・AGENTS.md改善

**As a** ハーネス管理者,
**I want to** AGENTS.mdを記述的情報からコマンド実行方式（ポインタ型）に移行したい,
**so that** AGENTS.mdの肥大化を防ぎ、常に最新の情報を動的に取得できるようにする。

#### 受け入れ基準

- [ ] AC-1: AGENTS.mdの記述的バリデータ一覧が`harness:status`実行へのポインタに置換されている
- [ ] AC-2: AGENTS.mdにADR参照リンクが追加されている
- [ ] AC-3: AGENTS.mdのサイズが移行前と比較して削減されている
- [ ] AC-4: ポインタが参照する先（コマンド、ファイル）が実在することが検証可能である

#### 対応要件
product_overview §9.1

#### 備考
`gsd2_integration_analysis.md`および`harness_bestpractice_gap_analysis.md`の方針に準拠。

---

## E-11: ESLint→Biome全面移行

### US-036: v0カスタムESLintルールのBiomeプラグイン移植

**Epic**: E-11 ESLint→Biome全面移行

**As a** ハーネス開発者,
**I want to** v0の4カスタムESLintルール（require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure）をBiomeプラグインとして移植したい,
**so that** Biomeネイティブ環境でv0と同等のアーキテクチャ強制力を維持できる。

#### 受け入れ基準

- [ ] AC-1: require-unit-commentルールがBiomeプラグインとして実装されている
- [ ] AC-2: require-layer-commentルールがBiomeプラグインとして実装されている
- [ ] AC-3: no-layer-violationルール（importグラフ解析+循環依存検出）がBiomeプラグインとして実装されている
- [ ] AC-4: enforce-folder-structureルールがBiomeプラグインとして実装されている
- [ ] AC-5: 各プラグインにv0 ESLintルールと同等のテストケースが存在する
- [ ] AC-6: @unit/@layerメタデータの付与漏れがv0 ESLintルールと同等の精度で検出されること（K3.5維持保証）

#### 対応要件
K3, K3.5, product_overview §9.1

---

### US-037: PostToolUse HookのBiomeベース高速化

**Epic**: E-11 ESLint→Biome全面移行

**As a** ハーネス開発者,
**I want to** PostToolUse HookをBiomeベースに切り替え、フォーマット+リント実行を高速化したい,
**so that** エージェントのコード生成ごとの検証ループが高速化され、開発効率が向上する。

#### 受け入れ基準

- [ ] AC-1: PostToolUse HookがBiome（`biome check`/`biome format`）を使用してフォーマット+リントを実行する
- [ ] AC-2: ESLint実行時と比較して処理時間が大幅に短縮されている
- [ ] AC-3: v0のformat-typescript-hook.shと同等の機能がBiomeで実現されている
- [ ] AC-4: Hook実行テストが存在する

#### 対応要件
harness_bestpractice_gap_analysis §2-1

---

### US-038: L1バリデータのBiomeベース再構築

**Epic**: E-11 ESLint→Biome全面移行

**As a** ハーネス開発者,
**I want to** L1バリデータ（editor層）をBiomeベースに再構築し、AI生成コードアンチパターン検出を追加したい,
**so that** Biomeの高速性を活かしつつ、AI特有のコード品質問題を検出できる。

#### 受け入れ基準

- [ ] AC-1: L1バリデータがBiome AST解析をベースに動作する
- [ ] AC-2: any型の乱用を検出するルールが実装されている
- [ ] AC-3: コード重複（jscpd相当）を検出するルールが実装されている
- [ ] AC-4: ゴーストファイル（参照されないファイル）を検出するルールが実装されている
- [ ] AC-5: コメント洪水（過剰なコメント）を検出するルールが実装されている

#### 対応要件
product_overview §9.1

---

### US-039: CIパイプラインのBiome統合

**Epic**: E-11 ESLint→Biome全面移行

**As a** ハーネス開発者,
**I want to** CIパイプラインでBiomeを使用してESLint相当の全チェックを実行したい,
**so that** CI/CDでもBiomeベースの品質チェックが一貫して適用される。

#### 受け入れ基準

- [ ] AC-1: CIパイプライン（aidlc-gate.yml相当）でBiomeによるリント+フォーマットチェックが実行される
- [ ] AC-2: US-036の4カスタムルールがCIで実行される
- [ ] AC-3: ESLint関連の設定ファイル・依存パッケージがプロジェクトから除去されている
- [ ] AC-4: CI失敗時のエラー出力がHarnessError形式に準拠している

#### 対応要件
K3

---

## E-12: FUSE Hooks Engine（L0 Pre-write enforcement）

### US-040: .harness-hooks.ymlによる宣言的フック定義

**Epic**: E-12 FUSE Hooks Engine（L0 Pre-write enforcement）

**As a** ハーネス開発者,
**I want to** `.harness-hooks.yml`で宣言的にファイルI/Oフックを定義したい,
**so that** FUSE Hooks Engineのルールをコードではなく設定ファイルで管理でき、保守性を高められる。

#### 受け入れ基準

- [ ] AC-1: `.harness-hooks.yml`のスキーマが定義されている
- [ ] AC-2: PreWrite/PostWrite/PreRead/PreBash/OnCompleteの各フック種別が定義可能である
- [ ] AC-3: 各フックにファイルパターン（glob）とアクション（block/allow/run）が設定可能である
- [ ] AC-4: YAMLスキーマバリデーションが通過する
- [ ] AC-5: 無効なフック定義に対してバリデーションエラーが検出される

#### 対応要件
hooks_engine_implementation_plan §6

---

### US-041: FUSEパススルーファイルシステム+PreWrite/PostWriteハンドラ実装

**Epic**: E-12 FUSE Hooks Engine（L0 Pre-write enforcement）

**As a** ハーネス開発者,
**I want to** FUSEパススルーファイルシステムにPreWrite/PostWriteハンドラを実装し、レイヤー違反ファイルの書き込みを物理的に阻止したい,
**so that** AIエージェントの種類やプロンプト遵守度に依存しない、決定論的なガバナンスを実現できる。

#### 受け入れ基準

- [ ] AC-1: FUSE-T（macOS）/libfuse（Linux）を使用したパススルーファイルシステムが実装されている
- [ ] AC-2: PreWriteハンドラがレイヤー違反ファイルの書き込みをEPERM（Permission denied）で拒否する
- [ ] AC-3: PreWriteハンドラが設計文書なしの実装コード書き込みを拒否する
- [ ] AC-4: PostWriteハンドラがファイル書き込み直後にバリデータを自動起動する
- [ ] AC-5: FUSE未使用時にL1-L4で同等ルールが適用されるフォールバックが動作する

#### 対応要件
hooks_engine_implementation_plan §5.1

---

### US-042: PreRead Hookによる機密ファイルアクセスブロック

**Epic**: E-12 FUSE Hooks Engine（L0 Pre-write enforcement）

**As a** ハーネス開発者,
**I want to** PreRead Hookで機密ファイル（.env, *.key等）へのアクセスをブロックしたい,
**so that** AIエージェントが機密情報を読み取ってコンテキストに含めるリスクを排除できる。

#### 受け入れ基準

- [ ] AC-1: PreRead Hookが`.env`、`*.key`、`*.pem`等の機密ファイルへの読み取りをブロックする
- [ ] AC-2: ブロック対象ファイルパターンが`.harness-hooks.yml`で設定可能である
- [ ] AC-3: ブロック時に適切なエラーメッセージが返される
- [ ] AC-4: ブロック対象外のファイルへの読み取りは正常に実行される
- [ ] AC-5: FUSE未使用時にClaude Code PreToolUse Hookで同等の機密ファイルアクセスブロックが提供される

#### 対応要件
hooks_engine_implementation_plan §5.1

---

### US-043: シェルラッパーによるPreBash/PostBash Hook実現

**Epic**: E-12 FUSE Hooks Engine（L0 Pre-write enforcement）

**As a** ハーネス開発者,
**I want to** シェルラッパー（PATH override）でPreBash/PostBash Hookを実現し、破壊的コマンドをブロックしたい,
**so that** `rm -rf`や`git push --force`等の破壊的コマンドをOS-levelで阻止できる。

#### 受け入れ基準

- [ ] AC-1: シェルラッパーがPATH overrideで主要コマンド（rm, git等）をインターセプトする
- [ ] AC-2: PreBash Hookが破壊的コマンド（`rm -rf /`、`git push --force`等）をブロックする
- [ ] AC-3: ブロック対象コマンドが`.harness-hooks.yml`で設定可能である
- [ ] AC-4: ブロック対象外のコマンドは正常に実行される
- [ ] AC-5: FUSE未使用時にClaude Code deny-check.shで同等の保護が提供される

#### 対応要件
hooks_engine_implementation_plan §5.2

---

### US-044: 完了ゲート（Magic File + CLI）によるStop Hook相当のFUSE実現

**Epic**: E-12 FUSE Hooks Engine（L0 Pre-write enforcement）

**As a** ハーネス開発者,
**I want to** 完了ゲート（Magic File + CLI）でStop Hook相当のテスト通過強制をFUSE経由で実現したい,
**so that** エージェントの完了宣言をOS-levelで検証し、テスト未通過での完了を物理的に阻止できる。

#### 受け入れ基準

- [ ] AC-1: Magic File（`.harness/DONE`等）への書き込みをトリガーとして完了ゲートが起動する
- [ ] AC-2: 完了ゲートが`pnpm test`全グリーンを検証する
- [ ] AC-3: テスト未通過時にMagic Fileへの書き込みがEPERMで拒否される
- [ ] AC-4: CLI（`harness:complete`）でも同等の完了ゲートが実行可能である
- [ ] AC-5: FUSE未使用時にClaude Code Stop Hookで同等の完了ゲートが動作する

#### 対応要件
hooks_engine_implementation_plan §5.3

---

## E-13: 既存スキル強化

### US-045: story-implementorへのFresh Context Protocol+Atomic Git Commits追加

**Epic**: E-13 既存スキル強化

**As a** 開発者,
**I want to** story-implementorにFresh Context Protocol（200Kバジェット、優先度付きドキュメントロード）とAtomic Git Commits（TDDサイクル単位の自動コミット）を追加したい,
**so that** 実装時に常にフレッシュなコンテキストで作業し、TDDの各サイクルが独立したコミットとして記録される。

#### 受け入れ基準

- [ ] AC-1: story-implementorのSKILL.mdにFresh Context Protocolの手順が記載されている
- [ ] AC-2: Executor起動時にcontext-priority.jsonに基づくドキュメントロードが実行される
- [ ] AC-3: TDDサイクルのGreen到達時（テスト通過時）およびRefactor完了時にAtomic commitが生成される
- [ ] AC-4: コミットメッセージに`feat(unit/US):`プレフィックスが付与される
- [ ] AC-5: v1スコープでは単一executor向けの実装とする（Wave並列はPhase 2延期）

#### 対応要件
product_overview §7.2, skill_system_v1_evolution_plan §3.1

---

### US-046: test-coverage-checkerへのNyquist Validation Layer統合

**Epic**: E-13 既存スキル強化

**As a** 品質管理者,
**I want to** test-coverage-checkerにNyquist Validation Layer（要件→テスト双方向トレーサビリティ+requirement-test-matrix.json生成）を統合したい,
**so that** コードカバレッジに加えて要件カバレッジも一元的にチェックできる。

#### 受け入れ基準

- [ ] AC-1: test-coverage-checkerがrequirement-test-matrix.jsonを生成または更新する
- [ ] AC-2: 要件→テスト方向のトレーサビリティ（全ACにテストが紐づいているか）を検証する
- [ ] AC-3: テスト→要件方向のトレーサビリティ（全テストがACに紐づいているか）を検証する
- [ ] AC-4: coverage_report.mdに要件カバレッジ（AC網羅率）が含まれる
- [ ] AC-5: AC網羅率の閾値を設定可能である

#### 対応要件
product_overview §7.2, skill_system_v1_evolution_plan §3.2

---

### US-047: implementation-readiness-checkerへのPlan-Checker Loop統合

**Epic**: E-13 既存スキル強化

**As a** 品質管理者,
**I want to** implementation-readiness-checkerにPlan-Checker Loop（最大3回の自動検証→修正ループ+Nyquist coverageRate検証）を統合したい,
**so that** 実装計画の品質を自動的に検証・改善し、実装開始前の準備完了度を高められる。

#### 受け入れ基準

- [ ] AC-1: implementation-readiness-checkerが最大3回の検証→修正ループを実行する
- [ ] AC-2: 各ループでNyquist coverageRate（AC網羅率）を検証する
- [ ] AC-3: coverageRateが閾値未満の場合、不足箇所を指摘して修正を促す
- [ ] AC-4: 3回のループで閾値を達成できない場合、人間へのエスカレーションが行われる
- [ ] AC-5: ループの実行履歴がログとして記録される

#### 対応要件
product_overview §7.2, skill_system_v1_evolution_plan §3.3

---

## E-14: v0テスト資産移行

### US-048: v0の143テスト仕様のv1再実装

**Epic**: E-14 v0テスト資産移行

**As a** ハーネス開発者,
**I want to** v0の143テスト仕様をv1コードベースで再実装したい,
**so that** v0で確立した品質基準がv1でも維持され、リグレッションが防止される。

#### 受け入れ基準

- [ ] AC-1: v0のscripts/harness配下のテスト仕様が分析され、移行対象リストが作成されている
- [ ] AC-2: 各テスト仕様がv1コードベースで再実装されている
- [ ] AC-3: Biome移行に伴い修正が必要なテストが特定され、修正されている
- [ ] AC-4: 再実装された全テストが`pnpm test`で実行可能である
- [ ] AC-5: v0テスト仕様とv1テスト実装の対応表が作成されている

#### 対応要件
Q1回答

---

### US-049: v1再実装テストのCIゲート化

**Epic**: E-14 v0テスト資産移行

**As a** 品質管理者,
**I want to** v1再実装テスト全143件がグリーンであることをCIゲートとして設定したい,
**so that** v0から引き継いだ品質基準が継続的に維持されることを自動保証できる。

#### 受け入れ基準

- [ ] AC-1: CIパイプラインにv1再実装テスト全件実行のステップが追加されている
- [ ] AC-2: 1件でもテスト失敗があればCIが失敗する
- [ ] AC-3: テスト実行結果のサマリー（通過数/失敗数/全体数）がCI出力に含まれる
- [ ] AC-4: テストカバレッジ90%閾値がv1再実装テストにも適用される

#### 対応要件
Q1回答, REQ-K-001

---

## E-15: オーケストレーションコマンド定義

### US-050: /gsdlc:init-project オーケストレーションSKILL.md定義

**Epic**: E-15 オーケストレーションコマンド定義

**As a** 開発者,
**I want to** `/gsdlc:init-project`コマンドのオーケストレーションSKILL.mdを定義し、Phase 0（プロジェクト基盤構築）の実行フローを標準化したい,
**so that** プロジェクト初期化時にproduct-architect→story-writer→unit-designer→story-mapperが正しい順序で実行される。

#### 受け入れ基準

- [ ] AC-1: `/gsdlc:init-project`のSKILL.mdが作成され、実行フロー（product-architect→story-writer→unit-designer→story-mapper）が定義されている
- [ ] AC-2: 各スキル間のゲート条件（前スキルの出力が次スキルの入力として利用可能であること）が定義されている
- [ ] AC-3: research-coordinatorはv1スコープ外（Phase 2延期）として明記され、v1ではスキップされる
- [ ] AC-4: 2-Phase Execution（Phase 1計画→人間承認→Phase 2実行）がフローに組み込まれている
- [ ] AC-5: コンテキストバジェットセクションがSKILL.mdに含まれている（US-002準拠）

#### 対応要件
product_overview §5 Phase 0, §6.1

#### 備考
v1ではresearch-coordinatorを除く逐次実行。Phase 2でresearch-coordinator統合予定。

---

### US-051: /gsdlc:design オーケストレーションSKILL.md定義

**Epic**: E-15 オーケストレーションコマンド定義

**As a** 開発者,
**I want to** `/gsdlc:design <unit>`コマンドのオーケストレーションSKILL.mdを定義し、Phase 1（Unit設計）のスキル実行順序を標準化したい,
**so that** domain-designer→logical-designer→test-designers→uiux-designer→readiness-checkerが2-Phase Executionで正しく実行される。

#### 受け入れ基準

- [ ] AC-1: `/gsdlc:design`のSKILL.mdが作成され、実行フロー（domain-designer→logical-designer→test-designers→uiux-designer→readiness-checker）が定義されている
- [ ] AC-2: 各スキルが2-Phase Execution（計画→人間承認→実行）で実行されることが定義されている
- [ ] AC-3: readiness-checker（implementation-readiness-checker）がゲートとして機能し、不合格時のフローが定義されている
- [ ] AC-4: 出力先が`docs/product/construction/{unit}/`であることが明記されている
- [ ] AC-5: コンテキストバジェットセクションがSKILL.mdに含まれている（US-002準拠）

#### 対応要件
product_overview §5 Phase 1, §6.1

---

### US-052: /gsdlc:plan オーケストレーションSKILL.md定義

**Epic**: E-15 オーケストレーションコマンド定義

**As a** 開発者,
**I want to** `/gsdlc:plan <unit>`コマンドのオーケストレーションSKILL.mdを定義し、Phase 2（実装計画）のフローを標準化したい,
**so that** implementation-planner→Plan-Check Loop→Nyquist Validationが正しい順序で実行される。

#### 受け入れ基準

- [ ] AC-1: `/gsdlc:plan`のSKILL.mdが作成され、実行フロー（implementation-planner→consistency-checker→nyquist-validator）が定義されている
- [ ] AC-2: Plan-Check Loop（最大3回）の自動検証→修正フローが定義されている（US-047連携）
- [ ] AC-3: Nyquist Validation（要件→テストマッピング完全性検証）がフローに含まれている（US-005〜007連携）
- [ ] AC-4: 出力にVALIDATION.md（US-009）の生成が含まれている
- [ ] AC-5: コンテキストバジェットセクションがSKILL.mdに含まれている（US-002準拠）

#### 対応要件
product_overview §5 Phase 2, §6.1

---

### US-053: /gsdlc:execute オーケストレーション定義（単一executor版）

**Epic**: E-15 オーケストレーションコマンド定義

**As a** 開発者,
**I want to** `/gsdlc:execute <unit>`コマンドのオーケストレーション定義を作成し、v1単一executor版の実行フローを標準化したい,
**so that** pre-flight→story-implementor→post-waveバリデーションが正しい順序で実行される。

#### 受け入れ基準

- [ ] AC-1: `/gsdlc:execute`のSKILL.mdが作成され、単一executor版の実行フロー（pre-flight→story-impl→post-wave）が定義されている
- [ ] AC-2: Pre-flightゲート（harness:check-ready、全storyのPhase Gate通過確認）がフローに含まれている
- [ ] AC-3: story-implementorがFresh Context Protocol（US-045）に基づいて実行されることが定義されている
- [ ] AC-4: Post-waveバリデーション（L2 harness validators実行）がフローに含まれている
- [ ] AC-5: v1では単一executor逐次実行であることが明記され、Wave並列はPhase 2拡張として記載されている
- [ ] AC-6: コンテキストバジェットセクションがSKILL.mdに含まれている（US-002準拠）

#### 対応要件
product_overview §5 Phase 3, §6.1

#### 備考
v1では単一executor逐次実行。Phase 2でwave-orchestratorによるWave並列実行に拡張予定。

---

### US-054: /gsdlc:verify オーケストレーション定義

**Epic**: E-15 オーケストレーションコマンド定義

**As a** 品質管理者,
**I want to** `/gsdlc:verify <unit>`コマンドのオーケストレーション定義を作成し、Phase 4（検証・整合）のフローを標準化したい,
**so that** consistency-checker→drift-detector→cascade-updater→lesson-collector→状態更新が正しい順序で実行される。

#### 受け入れ基準

- [ ] AC-1: `/gsdlc:verify`のSKILL.mdが作成され、実行フロー（consistency-checker→drift-detector→test-coverage-checker→cascade-updater→lesson-collector）が定義されている
- [ ] AC-2: test-coverage-checker（90%+閾値）の実行がフローに含まれている
- [ ] AC-3: cascade-updaterによる`product/`設計文書の累積更新がフローに含まれている
- [ ] AC-4: lesson-collectorによるAGENTS.md更新がフローに含まれている
- [ ] AC-5: state.json / milestones.jsonの進捗反映がフローに含まれている
- [ ] AC-6: コンテキストバジェットセクションがSKILL.mdに含まれている（US-002準拠）

#### 対応要件
product_overview §5 Phase 4, §6.1

---

## Epic間の依存関係・Wave分割ロードマップ

→ **[user_story_mapping.md](user_story_mapping.md)** を参照
