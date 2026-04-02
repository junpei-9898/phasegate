# phasegate v1 スコープ・要件・制約・リスク分析書

> **ステータス**: Draft
> **作成日**: 2026-03-10
> **分析者**: 品質保証・リスク分析専門家
> **入力文書**:
> - `docs/inception/_shared/harness_bestpractice_gap_analysis.md`
> - `docs/inception/_shared/gsd2_integration_analysis.md`
> - `docs/inception/_shared/hooks_engine_implementation_plan.md`
> - `docs/00_harness_engineering_overview.md`

---

## 1. v1スコープ定義: MVH（Minimum Viable Harness）

### 1.1 スコープ判定基準

| 基準 | 説明 |
|------|------|
| **S1: Critical欠陥の解消** | v0でCriticalと評価されたギャップ（GAP-1, GAP-9）は必ずv1に含める |
| **S2: 非交渉要件の維持** | K1-K13は全て維持。欠損が発生する変更はv1スコープに含めない |
| **S3: 自己完結性** | npm外部パッケージ（GSD2.0等）に依存しない。概念のみ自前実装 |
| **S4: 実証可能性** | v1リリース時点で、実プロジェクトで動作検証できる状態であること |

### 1.2 v1 MVH スコープ（必須）

| ID | 機能 | 由来 | 根拠 |
|----|------|------|------|
| **MVH-01** | コンテキスト腐敗防止 | GAP-1 (Critical) | 597KB超の設計文書がコンテキスト圧迫。context-priority.json + SKILLごとのコンテキストバジェット定義 |
| **MVH-02** | Nyquist検証層 | GAP-9 (Critical) | 要件-テスト双方向トレーサビリティの欠如。requirement-test-matrix.json + phase-gate統合 |
| **MVH-03** | Quick Mode | GAP-6 (Important) | 1行修正にフル設計フロー強制は致命的なUX欠陥。スコープベースのゲート強度可変化 |
| **MVH-04** | セッション継続性 | GAP-4 (Important) | pause/resume未対応によるコンテキスト喪失。session-state.json + 起動ルーティン標準化 |
| **MVH-05** | リンター設定保護Hook | ギャップ2-2 | エージェントがリンター設定を変更してエラーを消す行為の防止 |
| **MVH-06** | Stop Hookテストゲート | ギャップ5-2 | 「完了」宣言時にテスト全グリーンを強制するゲート |
| **MVH-07** | ADR初期整備 | ギャップ1-1 | 最低10件のADR + テンプレート。archgateパターンの基盤 |
| **MVH-08** | ライフサイクル管理 | GAP-3 (Important) | マイルストーン定義 + 状態追跡。milestones.json + state.json |
| **MVH-09** | phasegate.config.json v2 | 統合分析§3.4 F5 | orchestrationセクション + sessionセクション追加。GSD由来設定の統合先 |
| **MVH-10** | 非交渉要件K1-K13の完全維持 | 統合分析§3.2 | 4層防御、Phase Gate、ESLint AST、テスト品質等13機能を損なわない |

### 1.3 Phase 2 延期スコープ（v1後）

| ID | 機能 | 延期理由 |
|----|------|----------|
| **P2-01** | Wave並列実行オーケストレーション | 設計複雑度が高く、フェーズゲートとの整合検証が必要。MVH-01〜04の安定後に着手 |
| **P2-02** | Brownfieldオンボーディング（harness:scan, harness:annotate） | 既存PJ向け機能。新規PJでのv1検証を優先 |
| **P2-03** | モデルコスト最適化（quality/balanced/budget） | Nice-to-have。機能的影響なし |
| **P2-04** | リサーチエージェント並列化 | GSD由来。MVHに含めない |
| **P2-05** | Hooks Engine（FUSE Daemon） | システム依存（FUSE-T/libfuse）が重く、v1のポータビリティを損なう |
| **P2-06** | UAT自動診断 | scenario-test基盤が先に必要 |
| **P2-07** | Oxlint + Biome導入 | パフォーマンス改善であり、機能欠陥ではない |

### 1.4 Phase 3 延期スコープ（中長期）

| ID | 機能 | 延期理由 |
|----|------|----------|
| **P3-01** | 動的スコープ管理（add/insert/remove phase） | AIDLCの固定フェーズ哲学と部分的に競合。慎重な設計が必要 |
| **P3-02** | archgateパターン（ADR + .rules.ts結合） | ADR整備（MVH-07）完了後に着手 |
| **P3-03** | ドキュメント鮮度チェック | drift-detector拡張。L4 Scheduled枠で実装 |
| **P3-04** | ポインタ検証バリデータ | AGENTS.md/CLAUDE.md内のリンク先存在チェック |
| **P3-05** | Context Monitor Hook | コンテキスト使用率リアルタイム監視 |
| **P3-06** | Hookマーケットプレイス | 共有Hookプリセット集。エコシステム成熟後 |

---

## 2. 要件一覧

### 2.1 コンテキストエンジニアリング要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-CE-001** | `.harness/context-priority.json`を導入し、各ドキュメントにcritical/important/reference/archiveの4段階優先度を定義できること | Must | 設定ファイルバリデーション |
| **REQ-CE-002** | 各SKILL.mdに参照すべきドキュメントの上限サイズ（コンテキストバジェット）を明記すること | Must | SKILL.md構造検証 |
| **REQ-CE-003** | story-implementor実行時、各Executorに対してフレッシュな200Kコンテキストを割り当てるガイドラインを策定すること | Must | ガイドラインドキュメント存在チェック |
| **REQ-CE-004** | コンテキスト優先度に基づき、Compact時に優先保持すべきファイルリストをAGENTS.mdで指示すること | Should | AGENTS.md内容検証 |

### 2.2 Nyquist検証層要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-NQ-001** | `product/construction/{unit}/requirement-test-matrix.json`を新設し、User StoryのAC -> テストケース（unit/it/scenario）のマッピングを定義できること | Must | JSONスキーマバリデーション |
| **REQ-NQ-002** | phase-gateに「全AC -> テストケースマッピング完了」チェックを追加すること | Must | phase-gate.ts拡張の自動テスト |
| **REQ-NQ-003** | test-coverage-checkerを拡張し、コードカバレッジに加え要件カバレッジ（AC網羅率）を算出すること | Must | カバレッジレポート出力検証 |
| **REQ-NQ-004** | `harness:impact-analysis US-XXX`コマンドを新設し、User Story変更時に影響テストケースを自動特定すること | Should | CLIコマンド実行テスト |
| **REQ-NQ-005** | Wave実行前にVALIDATION.mdを自動生成し、要件-テストマッピングの完全性を記録すること | Should | ファイル生成検証 |

### 2.3 Quick Mode要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-QM-001** | phasegate.config.jsonに`quick_mode`セクションを追加し、Quick Mode対象条件を定義できること | Must | 設定スキーマバリデーション |
| **REQ-QM-002** | Quick Modeでは、architecture/dependency/securityバリデータのみ実行し、phase-gateをスキップすること | Must | バリデータ実行ログ検証 |
| **REQ-QM-003** | Quick Mode対象を明確に定義すること: テストファイルのみの変更、docs配下の修正、typo修正、リファクタリング（既存テスト全グリーン前提） | Must | 対象判定ロジックの自動テスト |
| **REQ-QM-004** | Quick Mode対象外を明確に定義すること: 新規ドメインモデル追加、API契約変更、新機能追加 | Must | 除外判定ロジックの自動テスト |
| **REQ-QM-005** | `harness:quick-check`コマンドを新設し、Quick Mode用のバリデーション実行を提供すること | Must | CLIコマンド実行テスト |

### 2.4 セッション継続性要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-SS-001** | `.harness/session-state.json`にセッション状態を自動保存すること。含む情報: 現在のSkill、対象Unit/Story、完了済みステップ、次のアクション、作業メモ | Must | JSONスキーマバリデーション |
| **REQ-SS-002** | セッション開始時に`harness:resume`を自動実行し、前回の状態を復元・提案すること | Must | 起動ルーティンテスト |
| **REQ-SS-003** | Stop Hook実行時に自動的にsession-state.jsonを更新すること | Must | Stop Hook統合テスト |
| **REQ-SS-004** | `harness:pause`コマンドでセッション状態を明示的に保存し、次のアクションを記録できること | Should | CLIコマンド実行テスト |

### 2.5 品質ハーネス強化要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-QH-001** | PreToolUse Hookに設定ファイル保護ルールを追加し、`.eslintrc*`、`eslint.config.*`、`tsconfig.json`、`biome.json`、`package.json`の変更をブロックすること | Must | Hook実行テスト |
| **REQ-QH-002** | Stop Hookにテスト実行ゲートを追加し、`pnpm test`全グリーンを完了条件とすること | Must | Stop Hook統合テスト |
| **REQ-QH-003** | Stop Hookテストゲートに無限ループ防止機構（`stop_hook_active`フラグ）を実装すること | Must | 再入防止テスト |
| **REQ-QH-004** | Stop Hookに`harness:ci-check`実行を追加し、ハーネスバリデーション全通過を完了条件とすること | Should | Stop Hook統合テスト |

### 2.6 ADR・ドキュメント管理要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-AD-001** | ADRテンプレートを整備し、タイトル/ステータス/コンテキスト/決定/結果/代替案の構造を定義すること | Must | テンプレートファイル存在チェック |
| **REQ-AD-002** | 以下10件のADRを初期作成すること: (1)フェーズゲート採用理由 (2)4層防御モデル設計根拠 (3)ESLint AST解析選定 (4)2-Phase Execution設計 (5)inception/product分離設計 (6)phasegate.config.json統一設定 (7)DDD設計スキル群の設計哲学 (8)GSD2.0概念採用・npmパッケージ棄却 (9)Quick Mode導入とフェーズゲート緩和 (10)Nyquist検証層導入 | Must | ADRファイル存在・構造検証 |
| **REQ-AD-003** | ADRにステータス（Proposed/Accepted/Deprecated/Superseded）を付与し、機械的に有効性を判別可能にすること | Must | ADRフロントマター検証 |

### 2.7 ライフサイクル管理要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-LC-001** | `docs/inception/_shared/milestones.json`を導入し、マイルストーン定義（含まれるStory、完了条件）を管理すること | Must | JSONスキーマバリデーション |
| **REQ-LC-002** | `docs/inception/_shared/state.json`を導入し、現在のフェーズ・完了済みStory・残作業を追跡すること | Must | JSONスキーマバリデーション |
| **REQ-LC-003** | `harness:progress`コマンドを新設し、現在の進捗状態を可視化すること | Should | CLIコマンド実行テスト |
| **REQ-LC-004** | マイルストーン完了時の自動監査（`harness:audit-milestone`）を実装すること | Should | 監査ロジック自動テスト |

### 2.8 設定統合要件

| REQ-ID | 要件 | 優先度 | 検証方法 |
|--------|------|--------|----------|
| **REQ-CF-001** | phasegate.config.jsonをv2にバージョンアップし、`orchestration`セクションを追加すること | Must | 設定スキーマバリデーション |
| **REQ-CF-002** | phasegate.config.json v2に`session`セクションを追加し、stateFile/roadmapFileのパスを設定可能にすること | Must | 設定スキーマバリデーション |
| **REQ-CF-003** | GSD由来機能はphasegate.config.jsonでデフォルト無効（`enabled: false`）とし、Progressive adoptionを支援すること | Must | デフォルト値検証 |
| **REQ-CF-004** | v1設定からv2設定への自動マイグレーションツール（`harness:migrate-config`）を提供すること | Should | マイグレーション実行テスト |

### 2.9 非交渉要件（K1-K13維持）

| REQ-ID | 対象 | 要件 | 検証方法 |
|--------|------|------|----------|
| **REQ-K-001** | K1: 4層防御 | L1-L4の全バリデータが正常動作し続けること | 既存テストスイート全グリーン |
| **REQ-K-002** | K2: Phase Gate | phase-gate.tsのcheckImplementationReadiness()が維持されること | 既存テスト + Quick Mode除外テスト |
| **REQ-K-003** | K3: ESLint AST | dependency.tsのimportグラフ解析 + 循環依存検出が維持されること | 既存ESLintテスト |
| **REQ-K-004** | K4: テスト品質 | AAA/actual/single-act/no-domain-mockingルールが維持されること | 既存テスト品質テスト |
| **REQ-K-005** | K5: DDD設計スキル | 26スキルの入出力仕様が維持されること | SKILL.md構造検証 |
| **REQ-K-006** | K6: 2-Phase Execution | Plan -> Human Approval -> Executeフローが維持されること | CLAUDE.md検証 |
| **REQ-K-007** | K7: Document Split | inception/product分離が維持されること | folder_management_rules.md検証 |
| **REQ-K-008** | K8: Cascade Updater | 下位変更→上位設計への影響伝播が維持されること | 既存テスト |
| **REQ-K-009** | K9: Agent-Lesson | [Agent-Lesson]自動収集→AGENTS.md更新が維持されること | 既存テスト |
| **REQ-K-010** | K10: Security/Performance | シークレット・SQLインジェクション・N+1検出が維持されること | 既存テスト |
| **REQ-K-011** | K11: Drift Detection | 設計-実装乖離の双方向検出が維持されること | 既存テスト |
| **REQ-K-012** | K12: Consistency Checker | 文書間レイヤー整合性チェックが維持されること | 既存テスト |
| **REQ-K-013** | K13: phasegate.config.json | 単一設定ファイルの原則が維持されること（v2拡張は可） | 設定ファイル構造検証 |

---

## 3. 制約条件

### 3.1 Go/No-Go Gate（8つの絶対条件）

以下の条件を**1つでも満たせない場合**、v1リリースを中止する。

| Gate # | 条件 | 検証タイミング | 検証方法 |
|--------|------|--------------|----------|
| **GNG-1** | npmパッケージ非依存 | 設計レビュー + CI | package.jsonにGSD関連パッケージが存在しないこと |
| **GNG-2** | `.planning/`不使用 | CI | `.planning/`ディレクトリが存在しないこと |
| **GNG-3** | 設定ファイル統一 | 設計レビュー | GSD由来の設定がすべてphasegate.config.json内にあること |
| **GNG-4** | yolo/skip-permissions不採用 | コードレビュー | deny listとhooksが完全に維持されていること |
| **GNG-5** | 2-Phase Execution維持 | 全スキルSKILL.md検証 | 設計スキルの人間承認ゲートが存在すること |
| **GNG-6** | プロジェクトローカル実行 | CI | `~/.claude/`へのグローバル書き込みがないこと |
| **GNG-7** | 既存コマンド体系尊重 | UXレビュー | `/gsd:*`コマンドが露出していないこと |
| **GNG-8** | デフォルトOFF | phasegate.config.json検証 | GSD由来機能のデフォルト値がすべてfalse/disabledであること |

### 3.2 技術的制約

| ID | 制約 | 理由 |
|----|------|------|
| **TC-01** | TypeScript + Node.js実行環境 | 既存ハーネスの技術スタックとの整合性 |
| **TC-02** | ESLintカスタムルール互換性維持 | v0の4つのカスタムルールを破壊しない |
| **TC-03** | PreCompact Hook再現不可 | エージェント内部イベントのため代替策（context-priority.json）で対応 |
| **TC-04** | SubagentStop Hook再現不可 | エージェント内部イベントのためAGENTS.md指示で対応 |
| **TC-05** | FUSE依存の回避（v1） | macOS FUSE-T/Linux libfuseのシステム依存はv1で取らない |
| **TC-06** | 既存テストスイート（143テスト）の全グリーン維持 | リグレッション防止 |

### 3.3 設計的制約

| ID | 制約 | 理由 |
|----|------|------|
| **DC-01** | folder_management_rules.md準拠 | GSD由来アーティファクトも`docs/inception/`配下に配置 |
| **DC-02** | GSD由来ファイルの命名規則: AIDLC既存規則に合わせる | roadmap.md、state.json等はAIDLC命名規則に従う |
| **DC-03** | 設計スキルはドキュメントのみ出力 | CLAUDE.md「コード生成禁止: 設計スキルはドキュメントのみ出力」を維持 |
| **DC-04** | 2フェーズ実行の遵守 | Phase 1（計画）-> 人間承認 -> Phase 2（実行）。同時実行禁止 |
| **DC-05** | 上位レイヤー存在チェック | 依存する設計文書が無ければ設計を開始しない |

---

## 4. リスクマトリクス

### 4.1 深刻度×発生確率マトリクス

```
発生確率
  高 │  R-03         R-06         R-01
     │  (複雑度爆発)  (学習曲線)   (哲学衝突)
     │
  中 │  R-07         R-04         R-02
     │  (テスト負債)  (設定肥大化)  (K要件破壊)
     │
  低 │  R-09         R-08         R-05
     │  (命名混乱)   (ドキュメント (Quick Mode
     │                配置混乱)    悪用)
     └──────────────────────────────────────
        低            中            高     深刻度
```

### 4.2 リスク詳細と軽減策

| ID | リスク | 深刻度 | 発生確率 | リスクスコア | 軽減策 |
|----|--------|--------|----------|-------------|--------|
| **R-01** | **哲学の衝突**: GSD「速度優先」とAIDLC「品質優先」の設計判断が矛盾し、一貫性のないハーネスになる | 高 | 高 | **9 (Critical)** | (1) 統合分析書§5.2の哲学的トレードオフ解決方針を厳守 (2) 「品質ゲート付き速度最適化」を設計原則としてADR化 (3) 全PRでAIDLC品質基準との整合性レビューを必須化 |
| **R-02** | **非交渉要件(K1-K13)の意図しない破壊**: v1機能追加の副作用で既存バリデータやフェーズゲートが動作しなくなる | 高 | 中 | **6 (High)** | (1) 既存143テストの全グリーンをCIゲート化 (2) K要件ごとの回帰テスト追加（REQ-K-001〜013） (3) v1機能は既存コードの修正を最小化し、拡張ポイントで追加 |
| **R-03** | **複雑度の爆発**: 26スキル + 10件のMVH機能追加で、ハーネス自体が理解不能になる | 中 | 高 | **6 (High)** | (1) MVH機能を独立モジュールとして実装（既存コードとの結合度を最小化） (2) 各モジュールに独立したテストスイートを持たせる (3) 00_harness_engineering_overview.mdをv1対応で更新 |
| **R-04** | **設定ファイルの肥大化**: phasegate.config.json v2が複雑化し、設定ミスが多発する | 中 | 中 | **4 (Medium)** | (1) orchestration/sessionセクションにJSONスキーマバリデーションを適用 (2) デフォルト値を慎重に設計（GSD由来はデフォルトOFF） (3) `harness:validate-config`コマンドで設定の正当性チェック |
| **R-05** | **Quick Modeの悪用**: Quick Modeを本来フル設計フローが必要な変更に使用し、品質が劣化する | 高 | 低 | **3 (Medium)** | (1) Quick Mode対象外の明確な定義（REQ-QM-004） (2) Quick Mode使用時にもarchitecture/dependency/securityバリデータは必ず実行 (3) Quick Mode使用頻度の監視（L4 Scheduled） |
| **R-06** | **学習曲線の増大**: v1の新概念（コンテキストバジェット、Nyquist、Quick Mode等）が多すぎて採用障壁になる | 中 | 高 | **6 (High)** | (1) Quick Modeを入口としたProgressive Disclosure (2) 各機能の独立したガイドドキュメント (3) `harness:status`コマンドで現在有効な機能を一覧表示 |
| **R-07** | **テスト負債の増加**: v1新機能のテストが不十分で、将来のリファクタリングを阻害する | 中 | 高 | **6 (High)** | (1) 新機能ごとに最低10テストを必須とするルール (2) テストカバレッジ90%閾値の維持（CIゲート） (3) requirement-test-matrixをv1自身にも適用（dogfooding） |
| **R-08** | **ドキュメント配置の混乱**: GSD由来のアーティファクト（state.json、roadmap.md等）の配置場所が曖昧になる | 中 | 低 | **2 (Low)** | (1) folder_management_rules.mdをv1対応で更新 (2) GSD由来ファイルの配置ルールを明記したADR作成 (3) ファイル配置バリデータ（L1 enforce-folder-structure）の拡張 |
| **R-09** | **命名の混乱**: AIDLC用語とGSD用語が混在し、コード・ドキュメントの一貫性が失われる | 低 | 高 | **3 (Medium)** | (1) 用語集（glossary）の作成 (2) `/gsd:*`コマンドをv1で一切露出させない（GNG-7） (3) 全てAIDLC命名体系に統一 |
| **R-10** | **セッション状態の競合**: 複数エージェントが同時にsession-state.jsonを更新し、データ破損が発生する | 中 | 低 | **2 (Low)** | (1) session-state.jsonにロック機構を実装 (2) Wave並列実行はv1スコープ外のためリスクは限定的 (3) JSON更新をアトミック操作（temp file + rename）で実装 |

### 4.3 リスク対応優先順位

| 優先度 | リスクID | 対応カテゴリ |
|--------|---------|------------|
| **即座に対応** | R-01, R-02 | 設計原則の明文化 + CIゲート強化 |
| **設計時に対応** | R-03, R-06, R-07 | モジュール設計 + テスト計画 + ドキュメント |
| **実装時に対応** | R-04, R-05, R-09 | 設定スキーマ + バリデーション + 命名規則 |
| **監視で対応** | R-08, R-10 | 定期チェック + ログ監視 |

---

## 5. 成功指標

### 5.1 定量的成功基準（v1リリース時点）

| ID | 指標 | 目標値 | 測定方法 |
|----|------|--------|----------|
| **KPI-01** | 既存テストスイートの通過率 | **100%** (143/143テスト) | `pnpm test` |
| **KPI-02** | v1新規テスト数 | **80テスト以上** | テストファイル集計 |
| **KPI-03** | テストカバレッジ | **90%以上** （既存基準維持） | istanbul/nyc |
| **KPI-04** | Go/No-Go Gate通過 | **8/8 全通過** | GNG-1〜8の検証 |
| **KPI-05** | ADR作成数 | **10件以上** | `docs/ADR/`内のファイル数 |
| **KPI-06** | phasegate.config.json v2 JSONスキーマバリデーション | **エラー0件** | スキーマバリデーションテスト |
| **KPI-07** | 非交渉要件(K1-K13)の回帰テスト | **13/13 全通過** | REQ-K-001〜013の検証 |
| **KPI-08** | Quick Mode判定精度 | **対象/対象外の判定成功率95%以上** | Quick Mode判定テストスイート |
| **KPI-09** | コンテキストバジェット定義率 | **全26スキルの100%** | SKILL.md構造検証 |
| **KPI-10** | requirement-test-matrix.jsonのスキーマ準拠率 | **100%** | JSONスキーマバリデーション |

### 5.2 定性的成功基準

| ID | 基準 | 評価方法 |
|----|------|----------|
| **QS-01** | v0のCriticalギャップ（GAP-1, GAP-9）が構造的に解消されていること | ギャップ分析の再実施 |
| **QS-02** | Quick Modeにより、typo修正・テスト追加が5分以内に完了できること | タイムボックス計測 |
| **QS-03** | セッション中断→再開時に、前回の作業状態が正確に復元されること | 手動シナリオテスト |
| **QS-04** | GSD2.0の概念が自然にAIDLCフローに統合され、UXの一貫性が保たれていること | UXレビュー |
| **QS-05** | v1のハーネス自体がv1のルール（dogfooding）に準拠していること | 自己適用検証 |

### 5.3 リリース判定フロー

```
1. KPI-01〜10の全指標が目標値を達成
   │
2. Go/No-Go Gate (GNG-1〜8) の全通過
   │
3. 定性的成功基準(QS-01〜05)のレビュー承認
   │
4. ギャップ分析の再実施 → Criticalギャップが0件
   │
5. v1リリース承認
```

---

## 6. 要件トレーサビリティサマリー

### v0問題点 -> v1要件 -> 検証指標の対応

| v0問題点 | 深刻度 | v1要件ID | MVH ID | 成功指標 |
|----------|--------|---------|--------|----------|
| コンテキスト腐敗防止なし | Critical | REQ-CE-001〜004 | MVH-01 | KPI-09 |
| Nyquist検証層なし | Critical | REQ-NQ-001〜005 | MVH-02 | KPI-10 |
| 実行オーケストレーションなし | Important | - (P2延期) | - | - |
| セッション継続性なし | Important | REQ-SS-001〜004 | MVH-04 | QS-03 |
| Quick Modeなし | Important | REQ-QM-001〜005 | MVH-03 | KPI-08, QS-02 |
| ライフサイクル管理なし | Important | REQ-LC-001〜004 | MVH-08 | KPI-06 |
| Brownfieldオンボーディング未対応 | Important | - (P2延期) | - | - |
| ADRが空 | - | REQ-AD-001〜003 | MVH-07 | KPI-05 |
| E2Eテスト戦略テンプレートなし | - | - (P2延期) | - | - |
| リンター設定保護Hookなし | - | REQ-QH-001 | MVH-05 | KPI-01 |
| Stop Hookにテストゲートなし | - | REQ-QH-002〜004 | MVH-06 | KPI-01 |

---

## Appendix A: 用語定義

| 用語 | 定義 |
|------|------|
| **MVH** | Minimum Viable Harness。v1で必須実装するハーネス機能の最小セット |
| **コンテキスト腐敗** | 長時間セッションでの情報劣化。古い/不正確な情報がエージェントの判断を歪める現象 |
| **Nyquist検証層** | 要件（AC）とテストケースの双方向トレーサビリティを保証する検証メカニズム |
| **Quick Mode** | 小規模変更（typo修正等）に対してフェーズゲートを緩和する実行モード |
| **Phase Gate** | 設計文書の存在をコードレベルで強制する品質ゲート機構 |
| **Go/No-Go Gate** | v1リリースの絶対条件。1つでも未達ならリリース中止 |
| **Progressive Adoption** | GSD由来機能をデフォルトOFFで提供し、段階的に有効化する導入戦略 |
| **context-priority.json** | ドキュメントの優先度（critical/important/reference/archive）を定義する設定ファイル |
| **requirement-test-matrix.json** | User StoryのACとテストケースの対応関係を定義するトレーサビリティファイル |
| **session-state.json** | セッション状態（現在のSkill、完了ステップ、次のアクション等）を永続化するファイル |
