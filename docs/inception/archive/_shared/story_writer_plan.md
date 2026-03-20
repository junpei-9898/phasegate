# ユーザーストーリー作成計画

> **ステータス**: 完了 — Phase 2実行済み（成果物: `docs/product/user_stories.md`）
> **作成日**: 2026-03-10
> **最終更新**: 2026-03-10（QA回答 Q1〜Q8を反映し、Epic/ストーリー追加）
> **入力文書**:
> - `docs/product/product_overview.md`
> - `docs/inception/_shared/v1_scope_requirements_risk.md`
> - `docs/inception/_shared/product_vision.md`
> - `docs/inception/_shared/gsd2_integration_analysis.md`（Q6参照）
> - `docs/inception/_shared/harness_bestpractice_gap_analysis.md`（Q6参照）
> - `docs/inception/_shared/hooks_engine_implementation_plan.md`（Q8: L0 FUSE参照）
> - `docs/inception/_shared/skill_system_v1_evolution_plan.md`（Q2: スキル強化参照）

---

## 1. スコープ

### 対象の要求文書

| 文書 | 内容 | 参照セクション |
|------|------|--------------|
| `product_overview.md` | GSDLC Harness v1の全体設計・アーキテクチャ・スコープ・非交渉要件 | §9 スコープと要件、§7 スキルシステム、§4 アーキテクチャ |
| `v1_scope_requirements_risk.md` | MVHスコープ定義・全要件一覧（REQ-*）・制約・リスク | §1 MVHスコープ、§2 要件一覧（2.1〜2.9） |
| `product_vision.md` | プロダクトビジョン・Core Value・5原則・非交渉要件 | §2 What This Is、§3 Core Value |

### 想定されるEpic一覧

| Epic ID | Epic名 | 概要 | 対応MVH | ストーリー数（予定） |
|---------|--------|------|---------|-------------------|
| E-01 | コンテキストエンジニアリング基盤 | context-priority.json導入、コンテキストバジェット定義、Fresh Context Protocolガイドライン策定 | MVH-01 | 4 |
| E-02 | Nyquist検証層 | requirement-test-matrix.json新設、phase-gate拡張、要件カバレッジ算出、影響分析コマンド | MVH-02 | 5 |
| E-03 | Quick Mode | quick_modeセクション追加、対象/対象外自動判定ロジック、harness:quick-checkコマンド | MVH-03 | 3 |
| E-04 | セッション継続性 | session-state.json永続化、harness:pause/resume、起動ルーティン標準化 | MVH-04 | 3 |
| E-05 | 品質ハーネス強化（Hooks拡張） | リンター設定保護Hook、Stop Hookテストゲート、無限ループ防止、ci-check統合 | MVH-05, MVH-06 | 4 |
| E-06 | ADR・ドキュメント管理基盤 | ADRテンプレート、初期10件ADR作成、ステータス管理 | MVH-07 | 3 |
| E-07 | ライフサイクル管理 | milestones.json/state.json導入、harness:progressコマンド、マイルストーン自動監査 | MVH-08 | 4 |
| E-08 | harness.config.json v2（設定統合） | orchestration/sessionセクション追加、デフォルトOFF、マイグレーションツール | MVH-09 | 4 |
| E-09 | 非交渉要件K1-K13回帰保証 | K1-K13回帰テスト整備、v0テスト仕様引き継ぎ+v1再実装のCIゲート化 | MVH-10 | 3 |
| E-10 | HarnessError拡充・AGENTS.md改善 | HarnessErrorへのADR参照+修正コード例統一、AGENTS.mdポインタ型移行 | product_overview §9.1 | 2 |
| E-11 | ESLint→Biome全面移行 | v0の4カスタムESLintルールをBiomeプラグインとして移植、PostToolUse Hook高速化、L1バリデータをBiomeベースに再構築 | product_overview §9.1, K3 | 4 |
| E-12 | FUSE Hooks Engine（L0 Pre-write enforcement） | FUSE-T/libfuseによるOS-levelファイルI/Oインターセプション、.harness-hooks.yml宣言的フック定義、PreWrite物理阻止、PostWrite自動検証 | product_overview §4, §13 | 5 |
| E-13 | 既存スキル強化 | story-implementor（Fresh Context+Atomic Commits）、test-coverage-checker（Nyquist統合）、implementation-readiness-checker（plan-checkerループ）の強化 | product_overview §7.2 | 3 |
| E-14 | v0テスト資産移行 | v0の143テスト仕様をv1で再実装。Biome移行に伴うテスト修正含む。scripts/harness配下を参照 | Q1回答 | 2 |

**合計: 14 Epic / 49 ストーリー候補**

### Epic間の依存関係

```
E-08 (設定統合) ← E-01, E-03, E-04, E-07 が設定セクションに依存
E-06 (ADR基盤) ← E-10 (HarnessError拡充) がADR参照先に依存
E-09 (K1-K13回帰) ← 全Epicと並行して継続的に検証（横断的Epic）
E-11 (Biome移行) ← E-05 (Hooks拡張), E-09 (K1-K13回帰) に影響。L1バリデータ基盤の変更
E-12 (FUSE Hooks) ← E-05 (Hooks拡張) の上位互換。E-08 (設定統合) に.harness-hooks.yml追加
E-13 (スキル強化) ← E-02 (Nyquist) と連動。Wave並列はPhase 2延期のため単一executor向けに限定
E-14 (v0テスト移行) ← E-11 (Biome移行) に依存。Biome移行完了後にテスト再実装
```

---

## 2. アクター分析

| アクター | 役割 | 主な関心事 |
|---------|------|-----------|
| **エンジニアリングチームリード** | AIエージェントを活用したプロダクション品質のソフトウェア開発を指揮。2-Phase Executionの人間ゲートで設計承認を行う意思決定者 | 品質と速度の両立、設計意図とコードの構造的整合性、プロジェクト進捗の可視化 |
| **AIエージェント（Executor）** | Claude Code, Codex等。設計・実装スキルを自律的に実行する主要な作業者 | フレッシュなコンテキスト（200K）、明確な設計文書、品質ゲートの自動遵守、セッション継続性 |
| **AIオーケストレーター** | Wave並列実行、セッション管理を担う制御層エージェント（※v1ではWave並列は未実装、セッション管理のみ） | Executor生成/破棄、コンテキストバジェット管理、セッション状態永続化 |
| **CI/CDシステム** | 自動検証パイプライン。L3バリデータ群を実行する非人間アクター | テストカバレッジ90%+、セキュリティ/パフォーマンス検出、Nyquist検証 |
| **ハーネス管理者（DevOps）** | harness.config.jsonの設定、プリセット選択、Hooks有効化/無効化を行う | Progressive Adoption、環境別設定、ハーネス自体の運用保守 |

### ストーリーでのアクター表記方針

- 「エンジニアリングチームリード」→ ストーリーでは **「開発者」** または **「品質管理者」** として記述（ロールを行為に合わせて使い分け）
- 「AIエージェント」→ ストーリーのアクターとしては扱わない（ツールの利用者である人間が主語）
- 「CI/CDシステム」→ **「品質管理者」** がCI/CD設定を行うストーリーとして記述
- 「ハーネス管理者」→ **「ハーネス管理者」** としてそのまま使用

---

## 3. ストーリー作成方針

### 粒度方針

- **1ストーリー = 1つの独立したユーザー価値を提供する単位**（1〜3日で完了可能）
- 複数の密結合な要件（例: REQ-QM-002/003/004）は1ストーリーに統合
- 大きな要件（例: REQ-AD-002の10件ADR作成）は必要に応じて分割を検討
- 非交渉要件（K1-K13）はアクター・責務軸で3グループに集約（個別ストーリーにすると粒度が細かすぎる）

### フォーマット

```markdown
## US-XXX: {ストーリータイトル}

**Epic**: E-XX {Epic名}

**As a** {アクター},
**I want to** {何を},
**so that** {なぜ}

### 受け入れ基準

- [ ] AC-1: ...
- [ ] AC-2: ...

### 対応要件
REQ-XX-XXX, ...

### 備考
（依存関係、v1スコープ制限、Phase 2拡張予定など）
```

### 用語統一

- ストーリー内では `product_overview.md` で定義された用語を使用
- **「5層防御（L0-L4）」を採用**（Q8回答: product_overviewが正）。L0はFUSE Hooks EngineによるPre-write enforcement
- **「Biome AST解析」を採用**（Q7回答: 初めからBiome移行必須）。ESLintの4カスタムルールをBiomeプラグインとして移植
- セッション状態ファイルは `session-state.json`（JSON形式、Q4回答）
- ライフサイクル状態ファイルは `state.json`（JSON形式、Q4回答）
- Quick Modeの対象判定は**ツールによる自動判定+対象外なら拒否**（Q3回答）
- AGENTS.mdの改善は `gsd2_integration_analysis.md` / `harness_bestpractice_gap_analysis.md` の方針に準拠（Q6回答）

---

## 4. ストーリー一覧（ドラフト）

### E-01: コンテキストエンジニアリング基盤

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-001 | ハーネス管理者として、context-priority.jsonでドキュメント優先度を4段階で定義したい | REQ-CE-001 |
| US-002 | スキル開発者として、各SKILL.mdにコンテキストバジェットを明記したい | REQ-CE-002 |
| US-003 | 開発者として、Executor向けFresh Context Protocolガイドラインに従いたい | REQ-CE-003 |
| US-004 | 開発者として、Compact時に優先保持ファイルリストをAGENTS.mdから参照したい | REQ-CE-004 |

### E-02: Nyquist検証層

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-005 | 品質管理者として、requirement-test-matrix.jsonでAC→テストケースマッピングを定義したい | REQ-NQ-001 |
| US-006 | 開発者として、phase-gateにACマッピング完了チェックが含まれてほしい | REQ-NQ-002 |
| US-007 | 品質管理者として、test-coverage-checkerで要件カバレッジ（AC網羅率）を算出したい | REQ-NQ-003 |
| US-008 | 開発者として、harness:impact-analysisでUS変更時の影響テストを自動特定したい | REQ-NQ-004 |
| US-009 | オーケストレーターとして、実行前にVALIDATION.mdを自動生成したい | REQ-NQ-005 |

### E-03: Quick Mode

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-010 | ハーネス管理者として、quick_modeセクションでQuick Mode対象条件を定義したい | REQ-QM-001 |
| US-011 | 開発者として、Quick Modeで最小バリデータのみ実行しphase-gateをスキップしたい | REQ-QM-002, 003, 004 |
| US-012 | 開発者として、harness:quick-checkコマンドで軽量検証を実行したい | REQ-QM-005 |

### E-04: セッション継続性

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-013 | 開発者として、session-state.jsonにセッション状態を自動保存したい | REQ-SS-001 |
| US-014 | 開発者として、セッション開始時にharness:resumeで前回状態を復元したい | REQ-SS-002 |
| US-015 | 開発者として、Stop Hook/pause実行時にsession-state.jsonを自動更新したい | REQ-SS-003, 004 |

### E-05: 品質ハーネス強化（Hooks拡張）

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-016 | ハーネス管理者として、PreToolUse Hookでリンター設定ファイルの変更をブロックしたい | REQ-QH-001 |
| US-017 | 品質管理者として、Stop Hookにpnpm test全グリーンのテストゲートを追加したい | REQ-QH-002 |
| US-018 | ハーネス開発者として、Stop Hookテストゲートに無限ループ防止機構を実装したい | REQ-QH-003 |
| US-019 | 品質管理者として、Stop Hookにharness:ci-check実行を追加したい | REQ-QH-004 |

### E-06: ADR・ドキュメント管理基盤

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-020 | ハーネス管理者として、ADRテンプレートを整備したい | REQ-AD-001 |
| US-021 | ハーネス管理者として、初期10件のADRを作成したい | REQ-AD-002 |
| US-022 | ハーネス管理者として、ADRにステータス管理を付与したい | REQ-AD-003 |

### E-07: ライフサイクル管理

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-023 | プロジェクトマネージャーとして、milestones.jsonでマイルストーンを管理したい | REQ-LC-001 |
| US-024 | プロジェクトマネージャーとして、state.jsonでプロジェクト状態を追跡したい | REQ-LC-002 |
| US-025 | 開発者として、harness:progressで進捗を可視化したい | REQ-LC-003 |
| US-026 | 品質管理者として、マイルストーン完了時に自動監査を実行したい | REQ-LC-004 |

### E-08: harness.config.json v2（設定統合）

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-027 | ハーネス管理者として、harness.config.json v2にorchestrationセクションを追加したい | REQ-CF-001 |
| US-028 | ハーネス管理者として、harness.config.json v2にsessionセクションを追加したい | REQ-CF-002 |
| US-029 | ハーネス管理者として、GSD由来機能をデフォルト無効にしたい | REQ-CF-003 |
| US-030 | ハーネス利用者として、harness:migrate-configでv1→v2自動マイグレーションしたい | REQ-CF-004 |

### E-09: 非交渉要件K1-K13回帰保証

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-031 | 品質管理者として、L0-L4全バリデータ（5層防御）・Phase Gate・Biome AST・テスト品質ルールのv1回帰テストを整備したい | REQ-K-001〜004 |
| US-032 | スキル開発者として、26スキル・2-Phase・Document Split・Cascade・Agent-Lessonのv1維持を保証したい | REQ-K-005〜009 |
| US-033 | 品質管理者として、Security/Performance・Drift Detection・Consistency・config単一原則のv1維持を保証したい | REQ-K-010〜013 |

### E-10: HarnessError拡充・AGENTS.md改善

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-034 | ハーネス開発者として、全バリデータのHarnessErrorにADR参照+修正コード例を統一付与したい | product_overview §9.1 |
| US-035 | ハーネス管理者として、AGENTS.mdを記述的情報からコマンド実行方式（ポインタ型）に移行したい | product_overview §9.1 |

### E-11: ESLint→Biome全面移行

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-036 | ハーネス開発者として、v0の4カスタムESLintルール（require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure）をBiomeプラグインとして移植したい | K3, product_overview §9.1 |
| US-037 | ハーネス開発者として、PostToolUse HookをBiomeベースに切り替え、フォーマット+リント実行を50-100倍高速化したい | harness_bestpractice_gap_analysis §2-1 |
| US-038 | ハーネス開発者として、L1バリデータ（editor層）をBiomeベースに再構築し、AI生成コードアンチパターン検出（any乱用/コード重複/ゴーストファイル/コメント洪水）を追加したい | product_overview §9.1 |
| US-039 | ハーネス開発者として、CIパイプラインでBiomeを使用してESLint相当の全チェックを実行したい | K3 |

### E-12: FUSE Hooks Engine（L0 Pre-write enforcement）

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-040 | ハーネス開発者として、.harness-hooks.ymlで宣言的にファイルI/Oフックを定義したい | hooks_engine_implementation_plan §6 |
| US-041 | ハーネス開発者として、FUSEパススルーファイルシステム+PreWrite/PostWriteハンドラを実装し、レイヤー違反ファイルの書き込みを物理的に阻止したい | hooks_engine_implementation_plan §5.1 |
| US-042 | ハーネス開発者として、PreRead Hookで機密ファイル（.env, *.key等）へのアクセスをブロックしたい | hooks_engine_implementation_plan §5.1 |
| US-043 | ハーネス開発者として、シェルラッパー（PATH override）でPreBash/PostBash Hookを実現し、破壊的コマンドをブロックしたい | hooks_engine_implementation_plan §5.2 |
| US-044 | ハーネス開発者として、完了ゲート（Magic File + CLI）でStop Hook相当のテスト通過強制をFUSE経由で実現したい | hooks_engine_implementation_plan §5.3 |

### E-13: 既存スキル強化

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-045 | 開発者として、story-implementorにFresh Context Protocol（200Kバジェット、優先度付きドキュメントロード）とAtomic Git Commits（TDDサイクル単位の自動コミット）を追加したい | product_overview §7.2, skill_system_v1_evolution_plan §3.1 |
| US-046 | 品質管理者として、test-coverage-checkerにNyquist Validation Layer（要件→テスト双方向トレーサビリティ+requirement-test-matrix.json生成）を統合したい | product_overview §7.2, skill_system_v1_evolution_plan §3.2 |
| US-047 | 品質管理者として、implementation-readiness-checkerにPlan-Checker Loop（最大3回の自動検証→修正ループ+Nyquist coverageRate検証）を統合したい | product_overview §7.2, skill_system_v1_evolution_plan §3.3 |

### E-14: v0テスト資産移行

| Story ID | ストーリー概要 | 対応要件 |
|----------|--------------|---------|
| US-048 | ハーネス開発者として、v0の143テスト仕様をv1コードベースで再実装したい。scripts/harness配下のv0実装を参照し、Biome移行に伴う修正を含む | Q1回答 |
| US-049 | 品質管理者として、v1再実装テスト全143件がグリーンであることをCIゲートとして設定したい | Q1回答, REQ-K-001 |

**合計: 49ストーリー候補**

---

## 5. QA（不明点・確認事項）

### [Question] Q1: 既存143テストとv1コードベースの関係

v0の既存143テスト（バリデータ・CLIコマンド・Biomeルール）は「継承」と記載（product_overview 7.6節）。しかしGSDLC_HARNESSは新規リポジトリであり、v0テストの移行方針が不明確。

- (a) v0テストをそのままコピーし、v1で拡張する
- (b) v0テストの仕様のみ引き継ぎ、v1で再実装する
- (c) v0リポジトリのテストはそのまま維持し、v1では新規機能テストのみ書く

**推奨案:** (b) 仕様引き継ぎ+v1再実装。移行作業自体を明示的なストーリー（またはEpic）として定義すべき。

[Answer]
既存のテストや仕様は 'scripts/harness'配下を参照してください。実装コストが低い方を採用したいです。Biomeに移行することによっていくつかのテストは修正の必要が出てくるかもしれません。そういうテストは作り直す必要があると思うので仕様を引き継ぐBがいいかな

---

### [Question] Q2: 既存スキル強化のストーリー扱い

product_overviewで3スキル（story-implementor, test-coverage-checker, implementation-readiness-checker）の「強化」が予定されている（7.2節）。これらはv1ストーリーとして扱うべきか？

**推奨案:** 既存スキル強化は独立したストーリーとして扱い、新規スキルとは依存関係を注記しつつ分離する。ただし、wave-orchestrator依存の強化項目はPhase 2に明示的に延期する。

[Answer]
推奨案でOKです

---

### [Question] Q3: Quick Mode対象判定の主体

判定は誰が行うのか？ (a)設定ベース自動判定 (b)開発者の自己判断 (c)ツールが変更内容をスキャンして自動判定+対象外なら拒否

REQ-QM-003/004に「判定ロジックの自動テスト」とあるため(c)が想定されるが、product_overviewでは判定メカニズムが曖昧。

**推奨案:** (c) 自動判定+拒否。判定ロジック自体を1ストーリーとして切り出す（現在US-011に含む）。

[Answer]
c 

---

### [Question] Q4: セッション管理のファイル形式

product_overviewではSTATE.md/ROADMAP.md（Markdown+JSON構造化）、scope_requirementsではsession-state.json/state.json（純粋JSON）と記載が不一致。

**推奨案:** JSON形式を採用。Key Decisions（product_overview §16）で「JSON形式を採用。AIによる不適切編集リスクをMarkdown比で低減」と決定済み。

[Answer]
jsonでお願い

---

### [Question] Q5: HarnessErrorフォーマット拡充の適用範囲

既存の全バリデータ（8+3）に適用するのか、新規バリデータのみか？

**推奨案:** 既存全バリデータへ適用。影響が大きいため、独立ストーリー（US-034）として定義済み。

[Answer]
全バリデータへ適用です。

---

### [Question] Q6: AGENTS.md改善の具体像

「コマンド実行方式」の具体的なイメージが不明確。バリデータ一覧を`harness:status`実行で動的取得する意味か？

**推奨案:** ポインタ型（「詳細は`harness:status`を実行せよ」形式）への移行。具体的な構造はストーリー実装計画（Phase 3）で設計する。

[Answer]
docs/inception/_shared 配下にいくつか参考にできるファイルを追加しておいたので、そこを調査して適切な仕様に寄せてください。

---

### [Question] Q7: ESLint→Biome移行のPhase境界

K3非交渉要件に「Biome AST解析（v0 ESLintから移行）」と記載があるが、product_overview §9.1ではBiome移行はPhase 2延期。v1時点ではESLint維持でよいか？

**推奨案:** v1ではESLint維持。K3は「ESLint AST解析の維持」として扱い、Biome移行はPhase 2ストーリーとして記録する。

[Answer]
初めからbiome移行が必須です。

---

### [Question] Q8: 防御モデルの層数（v1時点）

K1で「5層防御（L0-L4）」、product_visionでは「4層防御（L1-L4）」と不一致。L0（FUSE）はPhase 2延期のため、v1ストーリーではL1-L4のみを対象とするか？

**推奨案:** v1は4層（L1-L4）。L0はFUSE依存でありPhase 2スコープ。

[Answer]
product_overviewの方が正なので5層防御側を採用してください。

---

## 6. 前提条件・リスク

### 前提条件

- v0リポジトリ（ALIDL_HARNESS）は参照可能な状態で存在し続ける。特にscripts/harness配下のv0実装を参照する
- TypeScript + Node.js + pnpm が技術スタック（TC-01）
- **Biomeを初めから採用**（ESLintからの移行ではなく、v1はBiomeネイティブで構築）
- **5層防御（L0-L4）を採用**。L0はFUSE Hooks EngineによるPre-write enforcement
- Claude Codeを第一ターゲットのAIエージェントとして開発
- 新規プロジェクト（Greenfield）でのv1検証を優先（Brownfield対応はPhase 2延期）
- 単一開発者（または小規模チーム）による開発（Wave並列はPhase 2延期）
- story-mapperスキルが後工程で優先順位付け・MVP分類を行う
- 既存26スキルのSKILL.mdはv0から移行済みまたは移行予定
- GSD2.0のnpmパッケージには一切依存しない（GNG-1）
- v0の143テスト仕様はv1で再実装（B方式）。Biome移行によるテスト修正を含む

### リスク

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| ストーリー総数の肥大化（現時点で35候補） | story-mapper工程での優先順位付けが困難に | 粒度を「1〜3日で完了可能」に統一。Epicレベルで管理 |
| v0→v1移行ストーリーの欠落 | v1開発開始後に移行作業が発覚しスケジュール遅延 | Q1の回答を踏まえ、必要に応じて「v0資産移行」Epicを追加 |
| Phase 2延期機能との依存関係の見落とし | Fresh Context ProtocolがWave未実装で効果限定 | v1スコープを「単一executor向け」に限定し、Wave対応はPhase 2に明示分離 |
| product_overviewとscope_requirementsの文書間不整合 | ACが曖昧になり実装時に手戻り発生 | QA回答を得た上でACに具体的数値・ファイル形式を明記 |
| Quick Mode判定のエッジケース | リファクタリング+API変更時に誤判定→品質劣化 | 判定ストーリーのACに境界ケースを含める |
| 既存スキル強化とPhase 2新規スキルの依存 | 強化ストーリーの完了定義が不明確に | 各強化ストーリーに「v1スコープの完了定義」と「Phase 2拡張予定」を明記 |

---

> **完了**: Phase 2を実行し、US-001〜US-049の全49ストーリーをWho/What/Why形式で詳細記述した。成果物は `docs/product/user_stories.md` に配置。次のステップはstory-mapperスキルによるMVP分類・優先順位付け。
