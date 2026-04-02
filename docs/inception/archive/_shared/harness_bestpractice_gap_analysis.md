# ハーネスエンジニアリング ベストプラクティス ギャップ分析

> **参照記事**: [Claude Code / Codex ユーザーのための誰でもわかるHarness Engineeringベストプラクティス](https://nyosegawa.github.io/posts/harness-engineering-best-practices-2026/)
> **分析日**: 2026-03-09
> **対象PJ**: ALIDL_HARNESS (AIDLC Harness Engineering Toolkit)

---

## エグゼクティブサマリー

本PJはハーネスエンジニアリングの多くの要素を既に設計・実装済みであり、記事が推奨するベストプラクティスの骨格は概ね備えている。しかし、**記事が特に強調する7つの領域**のうち、いくつかの領域で重要なギャップが存在する。

### 総合評価

| 領域 | 記事の推奨 | PJ現状 | ギャップ |
|:-----|:----------|:-------|:--------|
| 1. リポジトリ衛生 | ⭐⭐⭐ | 🔶 部分対応 | **中〜大** |
| 2. 決定論的ツール | ⭐⭐⭐ | ✅ 概ね対応 | **小〜中** |
| 3. AGENTS.md/CLAUDE.md設計 | ⭐⭐⭐ | 🔶 部分対応 | **中** |
| 4. 計画と実行の分離 | ⭐⭐⭐ | ✅ 対応済み | **なし** |
| 5. E2Eテスト戦略 | ⭐⭐⭐ | ❌ 未対応 | **大** |
| 6. セッション間の状態管理 | ⭐⭐⭐ | 🔶 部分対応 | **中** |
| 7. プラットフォーム戦略 | ⭐⭐⭐ | 🔶 部分対応 | **小** |

---

## 1. リポジトリ衛生: 腐敗を前提に設計する

### ✅ PJが既に対応している点
- **ESLintカスタムルール4つ**で構造的制約を実行可能なコードとして表現
- **11バリデータ**（L1-L4）で品質を機械的に検証
- **`.claude/settings.json`のPermissions.deny**で機密ファイル・危険な操作をブロック

### ❌ 未対応・ギャップ

#### 1-1. ADRが空 — 意思決定の履歴が保存されていない
- **記事の推奨**: ADRは不変原則により腐敗しにくく、エージェントが安全に参照できる。ステータス（Accepted/Superseded/Deprecated）で有効性を構造的に判別可能
- **PJ現状**: `docs/ADR/` ディレクトリは存在するが空
- **影響**: アーキテクチャ決定の「なぜ」が記録されず、エージェントが過去の判断を理解できない

> [!IMPORTANT]
> **推奨アクション**: 既存の設計判断（フェーズゲート採用理由、レイヤー構成の根拠、ESLint選定理由等）を遡ってADRとして記録する。最低限5〜10件のADRを作成し、テンプレートを整備する。

#### 1-2. 記述的ドキュメントが大量に存在 — 腐敗リスク
- **記事の推奨**: 「現在のシステムはこうなっている」という説明文書はリポジトリに置くべきでない。テストとADRで代替する
- **PJ現状**: `docs/harness_design/` に14ファイル・合計597KB超の設計ドキュメントが存在。`00_harness_engineering_overview.md`（9KB）も概要説明文書
- **影響**: コードの進化に追いつけず腐敗した場合、エージェントがそれを最新の真実として採用するリスク

> [!WARNING]
> **推奨アクション**: 長期的には記述的ドキュメントをテスト・ADR・型定義に段階的に置換する。短期的にはドキュメントにタイムスタンプとステータス（Active/Deprecated）を明記し、腐敗を検知可能にする。

#### 1-3. ガベージコレクションプロセスの不在
- **記事の推奨**: バックグラウンドで逸脱を検知しリファクタリングPRを開くCodexタスクを定期実行。ただし検査基準は決定論的ルールに依拠させる
- **PJ現状**: L4にdrift-detector（設計-実装乖離検出）、dead-code-detectorはあるが、ドキュメント腐敗の自動検出や定期的なリポジトリクリーニングは未実装

> **推奨アクション**: drift-detectorの拡張としてドキュメント鮮度チェック機能を追加する。最終更新日から一定期間経過したドキュメントを警告対象にする。

---

## 2. 決定論的ツールとアーキテクチャガードレール

### ✅ PJが既に対応している点
- **PostToolUse Hook**: `.claude/settings.json`にWrite|Editトリガーの自動フォーマット・エラー分析Hookを設定済み
- **PreToolUse Hook**: deny-check.shで危険コマンドをブロック
- **Stop Hook**: 完了時のサウンド通知
- **ESLintカスタムルール**: `require-unit-comment`, `require-layer-comment`, `no-layer-violation`, `enforce-folder-structure`
- **Pre-commit統合**: `integrations/pre-commit.ts`で全8バリデーター登録
- **Permissions.deny**: git操作・rm -rf等の制限

### ❌ 未対応・ギャップ

#### 2-1. リンター速度の最適化 — ESLintからOxlint+Biomeへの移行検討
- **記事の推奨**: PostToolUse Hookはms〜秒単位で完了する必要があり、Rust製ツール（Oxlint+Biome）はESLint+Prettierより50〜100倍高速。PostToolUseはOxlintでリント→Biomeでフォーマット、CIでESLintという使い分け
- **PJ現状**: ESLint（Node.js製）のみ使用。Biome/Oxlintは未導入
- **影響**: PostToolUse Hookでの実行速度がボトルネックになる可能性

> **推奨アクション**: Phase 1としてOxlint+Biomeを導入しPostToolUse Hookの高速化を図る。ESLintカスタムルールはプリコミットとCIに残す。

#### 2-2. リンター設定保護Hookが未設定
- **記事の推奨**: エージェントがリンターエラーに直面した場合、コードを修正する代わりにリンター設定を変更してエラーを消す行為が頻繁に観察される。PreToolUseフックで設定ファイルの変更をブロックする
- **PJ現状**: `docs/principles/**`への書き込みは禁止されているが、ESLint設定・tsconfig.json等の設定ファイルへの変更を防ぐHookは未設定

> **推奨アクション**: PreToolUse Hookに設定ファイル保護ルールを追加。`.eslintrc`, `eslint.config`, `tsconfig.json`, `package.json`等のlint/build設定ファイルの変更をブロックする。

#### 2-3. エラーメッセージの修正指示化が不十分
- **記事の推奨**: カスタムリンターのエラーメッセージに「何が間違っているか」「なぜこのルールがあるか（ADR参照）」「具体的な修正手順」を含めるべき
- **PJ現状**: エラーコード（`HARNESS-PG-001`等）と「AGENT INSTRUCTION」セクションは存在するが、ADRへの参照や具体的な修正コード例は不足

> **推奨アクション**: 既存バリデータのエラーメッセージを拡充し、ADR参照＋修正コード例を含むフォーマットに統一する。

#### 2-4. ADRと実行可能ルールの結合（archgateパターン）が未実装
- **記事の推奨**: 各ADRにコンパニオンの`.rules.ts`ファイルを持たせ、アーキテクチャ決定を実行可能なチェックとしてエンコードする
- **PJ現状**: ADR自体が未作成のため、結合もなし

> **推奨アクション**: ADR作成と同時にarchgateパターンの導入を検討する。

#### 2-5. AI生成コード固有のアンチパターン検出が限定的
- **記事の推奨**: `any`乱用、コード重複、ゴーストファイル、コメント洪水、セキュリティ脆弱性の検出
- **PJ現状**: securityバリデータでシークレット・SQLインジェクション等は検出するが、`any`乱用・コード重複・ゴーストファイル・コメント洪水の専用検出は未実装

> **推奨アクション**: `@typescript-eslint/no-explicit-any` をerrorレベルで強制。jscpd等でコード重複検出を追加。

#### 2-6. プリコミットフックのバイパス防止
- **記事の推奨**: `git commit --no-verify`の実行を禁止し、エージェントがGitフックをバイパスすることを構造的に不可能にする。Lefthook推奨
- **PJ現状**: `Permissions.deny`で`git commit*`を全面禁止しているため実質的にバイパスは不可能（ただし、これはコミット自体を禁止しているだけで、Lefthookのような柔軟な制御ではない）

> **推奨アクション**: Lefthookの導入を検討し、人間には柔軟性・エージェントには厳格性という二重基準を実現する。

---

## 3. AGENTS.md / CLAUDE.mdをポインタとして設計する

### ✅ PJが既に対応している点
- **AGENTS.md（57行）**: ポインタ型で設計されており、コマンド一覧・バリデータ一覧・エラー対処手順を簡潔に記載
- **CLAUDE.md（17行）**: 必読ドキュメントへのポインタと4つの共通ルールのみ
- **サイズ**: 記事推奨の「50行以下」に概ねフィット

### ❌ 未対応・ギャップ

#### 3-1. AGENTS.mdに記述的情報が混在している
- **記事の推奨**: 書くべきものはルーティング指示・禁止事項（ADR参照付き）・ビルド/テスト/デプロイコマンドのみ。システムの現状説明やスタック解説は書かない
- **PJ現状**: AGENTS.mdは概ねポインタ型だが、バリデータ一覧表は「現状説明」に近い。パッケージ管理の指示やADR参照リンクも不足

> **推奨アクション**: AGENTS.mdからバリデータ一覧を削除し、`pnpm harness:status` コマンドの実行で確認する方式に変更。ADRへの参照リンクを追加する。

#### 3-2. ポインタ腐敗検知の仕組みがない
- **記事の推奨**: ポインタが指すファイルパスが存在しなくなれば404に相当するエラーが起きる。壊れたポインタは騒がしく失敗するため検知可能
- **PJ現状**: AGENTS.md/CLAUDE.mdのリンク先の存在を検証するチェックがない

> **推奨アクション**: ポインタ検証バリデータを新設し、AGENTS.md/CLAUDE.md内のファイルパス参照の存在チェックを自動実行する。

---

## 4. 計画と実行を分離する

### ✅ PJが対応済みの点（ギャップなし）
- **2フェーズ実行**: CLAUDE.mdに「Phase 1（計画）→ 人間承認 → Phase 2（実行）。同時実行禁止」を明記
- **Skills設計**: 全スキルが計画→承認→実行フローを前提に設計
- **フェーズゲート機構**: `phase-gate`バリデータが設計→実装の順序を強制
- **タスク粒度**: AIDLCのUnit/Story分割で実質的にタスク粒度を管理

> この領域は本PJの最も強い領域であり、記事の推奨をほぼ完全に満たしている。

---

## 5. E2Eテスト戦略: エージェントにアプリの「目」を与える

### ❌ 未対応（最大のギャップ）

#### 5-1. ブラウザ自動化ツールの不在
- **記事の推奨**: エージェントがPuppeteer MCP等を使って実際にUIを操作し、人間ユーザーと同じ視点で検証する。Anthropicの実験で性能が劇的に改善
- **PJ現状**: ハーネスツールキット自体はCLIベースで、ブラウザ自動化は設計対象外。ただし、AIDLCの対象プロジェクト（このハーネスを適用するプロジェクト）に対するE2Eテスト戦略のガイダンスやテンプレートも未整備

> [!CAUTION]
> **推奨アクション**: ハーネスツールキット自体のテストではなく、**ハーネスが適用されるプロジェクトのためのE2Eテスト戦略テンプレート**を追加する。Playwright CLI / puppeteer-mcp-server の導入ガイド、アクセシビリティツリーの活用パターン、Stop Hookでのテスト通過強制テンプレートを含める。

#### 5-2. Stop Hookでのテスト完了ゲートが未設定
- **記事の推奨**: エージェントが「完了」を宣言した際に自動でテスト実行し、テストが通るまでエージェントを止めさせない
- **PJ現状**: Stop Hookはサウンド通知のみ（`afplay /System/Library/Sounds/Glass.aiff`）

> [!IMPORTANT]
> **推奨アクション**: Stop Hookにテスト実行ゲートを追加する。`pnpm test`の全グリーンを完了条件にするHookテンプレートを作成する。

---

## 6. セッション間の状態管理を設計する

### ✅ PJが既に対応している点
- **Skills**: 各スキルのSKILL.mdが入出力を明確に定義しており、セッション間の引き継ぎは設計ドキュメントを介して行われる
- **folder_management_rules.md**: ドキュメント配置を厳密にルール化

### ❌ 未対応・ギャップ

#### 6-1. 起動ルーチンが標準化されていない
- **記事の推奨**: 各セッション開始時にエージェントが作業ディレクトリ確認→Gitログ読み取り→次タスク選択→疎通テストを実行
- **PJ現状**: CLAUDE.mdで「必読ドキュメントを参照せよ」とは指示しているが、体系的な起動ルーチンは定義されていない

> **推奨アクション**: CLAUDE.mdに起動ルーチン（初期チェックリスト）を追加するか、専用のWorkflow（`.agent/workflows/startup.md`）を作成する。

#### 6-2. 進捗記録の標準フォーマットが未定義
- **記事の推奨**: 進捗記録にはMarkdownよりJSON。モデルがJSON形式のデータを不適切に編集する可能性はMarkdownより低い
- **PJ現状**: 実装計画は`harness_remaining_implementation_plan.md`のようなMarkdown形式。JSON形式の進捗記録は未使用

> **推奨アクション**: 短期プロジェクトの進捗管理にはJSON形式のテンプレートを検討する。ただし、AIDLCの設計ドキュメントベースのアプローチとの整合性を考慮する。

---

## 7. プラットフォーム固有のハーネス戦略

### ✅ PJが既に対応している点
- **Claude Code Hooks**: `.claude/settings.json`でPreToolUse/PostToolUse/Stopフックを設定済み
- **AGENTS.md + CLAUDE.md**: 両方を管理しており、Codex/Claude Codeの両方に対応
- **Skills**: SKILL.mdフォーマットを活用
- **`.codex`ディレクトリ**: Codex用の設定ディレクトリが存在

### ❌ 未対応・ギャップ

#### 7-1. ハイブリッド戦略のガイダンス不足
- **記事の推奨**: Claude Codeで計画・設計 → Codexで並列実行 → Claude Codeでレビュー・改善のハイブリッド構成。共通ハーネスレイヤーとプラットフォーム固有レイヤーを分離
- **PJ現状**: codex-delegatorスキルは存在するが、PJ内にハイブリッド運用のガイダンスドキュメントがない

> **推奨アクション**: 既存のcodex-delegatorスキルの利用ガイドラインを含む、ハイブリッド運用戦略ドキュメントを作成する。

---

## アンチパターンチェック

記事が列挙する5つのアンチパターンに対する現状:

| アンチパターン | PJ現状 | 評価 |
|:-------------|:-------|:-----|
| プロンプトだけに頼る | Hooksとバリデータで仕組み化 | ✅ 回避済み |
| リポジトリに説明文書を蓄積 | harness_design/に597KB超の設計文書 | ⚠️ 要注意 |
| AGENTS.md/CLAUDE.mdを巨大にする | 合計74行で収まっている | ✅ 回避済み |
| エージェント専用インフラを構築 | 開発者インフラとして汎用設計 | ✅ 回避済み |
| ハーネスなしでスケール | ハーネス先行で進めている | ✅ 回避済み |

---

## GSD2.0 ギャップ分析（コンテキストエンジニアリング視点）

### 分析対象9領域

以下は、GSD2.0が提供する機能のうち、AIDLC_HARNESSが「欠いている」または「弱い」領域の構造的分析である。

---

### GAP-1: コンテキスト腐敗防止（Context Rot Prevention）

**GSD2.0のアプローチ**:
- サブエージェント毎に新鮮な200Kコンテキストを割り当て
- Wave単位で並列実行し、各Waveで新しいコンテキストを生成
- `CONTEXT.md` にコンテキスト優先度を明示的に管理

**AIDLC_HARNESS現状**:
- コンテキスト管理の仕組みは **存在しない**
- 597KB超の設計ドキュメントが無秩序にコンテキストに投入されるリスク
- `PreCompact` Hookの再現は「不可能」と `hooks_engine_implementation_plan.md` で明記
- CLAUDE.mdは17行で軽量だが、Skills実行時に大量ドキュメントを読み込む設計

**ギャップ深刻度**: **Critical**

**AIDLCとの競合**: なし。コンテキスト管理はAIDLC原則と直交する概念

**推奨アクション**:
1. **コンテキスト優先度ファイル（`.harness/context-priority.json`）を導入**
   - 各ドキュメントの優先度（critical / important / reference / archive）を定義
   - CompactやAgent起動時に、優先度順でコンテキストを投入するガイドラインを策定
2. **Skills実行時のコンテキストバジェットをSKILL.mdに明記**
   - 各スキルが参照すべきドキュメントの上限サイズを定義
   - 不要ドキュメントの参照を構造的に防止
3. **ドキュメント要約レイヤーの導入**
   - 大量の設計書から、エージェントが必要とする情報のみを抽出する要約ドキュメントを自動生成
   - L4 Scheduledジョブとして実装可能

---

### GAP-2: 実行オーケストレーション（Wave-based Parallel Execution）

**GSD2.0のアプローチ**:
- タスクを依存関係に基づいてWaveにグルーピング
- Wave内は並列実行、Wave間は直列
- 4並列の研究者、planner+checkerループ、並列実行者

**AIDLC_HARNESS現状**:
- **直列実行のみ**: Skills（26個）はすべてシーケンシャルに実行される
- フェーズゲートが逐次実行を強制する設計（Step 0→1→2→...→8）
- 同一Unit内の複数Story並列実装の仕組みは存在するが、オーケストレーション機構は未定義
- `codex-delegator`スキルが並列実行の原始的手段として存在

**ギャップ深刻度**: **Important**

**AIDLCとの競合**: **部分的に競合**
- AIDLCのフェーズゲートは「設計→実装の順序を物理的に強制」する思想であり、Wave内の自由な並列化とは本質的に緊張関係がある
- ただし、同一フェーズ内の並列化（例: 複数Unitのdomain-designerを同時実行）は競合しない

**推奨アクション**:
1. **同一フェーズ内の並列オーケストレーションを設計**
   - Unit間で独立するタスク（domain-designer for Unit A と domain-designer for Unit B）の並列実行
   - フェーズ境界（Step N → Step N+1）はゲートとして維持
2. **Wave定義ファイルの導入**
   - `inception/_shared/execution-waves.json` にWave構成を定義
   - 依存関係グラフからWaveを自動算出するCLIツール `harness:plan-waves`
3. **codex-delegatorの強化**
   - 現在の単純なタスク委譲から、Wave定義に基づく構造化された並列委譲へ拡張

---

### GAP-3: プロジェクトライフサイクル管理（Milestone Cycles, Roadmap Tracking）

**GSD2.0のアプローチ**:
- `new-project → discuss → plan → execute → verify → complete-milestone → new-milestone` のライフサイクル
- `ROADMAP.md`（XML形式のタスク定義）で全体進捗を管理
- `STATE.md` でプロジェクト状態を追跡
- マイルストーン完了時の監査→バージョニング→次マイルストーンの開始

**AIDLC_HARNESS現状**:
- **ライフサイクル管理機構は存在しない**
- ドキュメントフロー（Phase 1: 全体設計 → Phase 2: Unit横断設計 → Phase 3: Story実装）が暗黙的なライフサイクル
- `harness_remaining_implementation_plan.md` がロードマップ代替だが、Markdown形式で機械的な進捗追跡ができない
- マイルストーンの概念がなく、User Story単位の完了管理のみ

**ギャップ深刻度**: **Important**

**AIDLCとの競合**: なし。AIDLC設計プロセスの上位にライフサイクル管理を被せることは自然

**推奨アクション**:
1. **マイルストーン定義ファイルの導入**
   - `inception/_shared/milestones.json` にマイルストーン、含まれるStory、完了条件を定義
   - マイルストーン完了時の自動監査（`harness:audit-milestone`）を実装
2. **STATE.mdの採用（修正版）**
   - GSD2.0のSTATE.mdコンセプトを採用するが、JSON形式で実装（`harness/state.json`）
   - 現在のフェーズ、完了済みStory、残作業をコマンド（`harness:state`）で更新・参照
3. **ロードマップのJSON化**
   - 現在のMarkdown実装計画をJSON形式に移行
   - `harness:roadmap` コマンドで進捗可視化

---

### GAP-4: セッション継続性（Pause/Resume）

**GSD2.0のアプローチ**:
- `pause-work` コマンドで STATE.md に現在の進捗・次のタスク・コンテキスト要約を保存
- `resume-work` コマンドで STATE.md を読み込み、中断箇所から再開
- セッション間で状態が完全に引き継がれる

**AIDLC_HARNESS現状**:
- **明示的なpause/resume機構は存在しない**
- 設計ドキュメント（`inception/`, `product/`）が暗黙的な状態保存先として機能
- ただし「今何をしていたか」「次に何をすべきか」の記録は手動
- Skills単位の入出力は明確だが、セッション横断の状態追跡は未定義

**ギャップ深刻度**: **Important**

**AIDLCとの競合**: なし。むしろAIDLCの設計ドキュメントベースのアプローチと補完的

**推奨アクション**:
1. **セッション状態ファイルの導入**
   - `.harness/session-state.json` にセッション状態を自動保存
   - 含む情報: 現在のSkill、対象Unit/Story、完了済みステップ、次のアクション、作業メモ
2. **起動ルーチンの標準化**（既存ギャップ6-1と統合）
   - セッション開始時に `harness:resume` を自動実行
   - session-state.json → 次のアクション提案 → 人間承認 → 作業再開
3. **Stop Hookへのセッション保存ロジック追加**
   - エージェント完了時に自動的に session-state.json を更新
   - 現在の既存Stop Hook（サウンド通知）に追加

---

### GAP-5: 動的スコープ管理（Add/Insert/Remove Phases Dynamically）

**GSD2.0のアプローチ**:
- `add-phase`, `insert-phase`, `remove-phase` コマンドでワークフローを動的に変更
- 実行中にフェーズの追加・挿入・削除が可能
- 柔軟なワークフロー変更を支援

**AIDLC_HARNESS現状**:
- **フェーズは固定的**: Step 0→1→2→3→4→5→6→7→8の固定順序
- フェーズゲートの設定は `phasegate.config.json` で静的に定義
- `harness:enable` / `harness:disable` でバリデータの有効/無効は切替可能だが、フェーズの追加・挿入はできない
- 設計プロセスの変更にはconfig/SKILL.mdの手動修正が必要

**ギャップ深刻度**: **Nice-to-have**

**AIDLCとの競合**: **部分的に競合**
- AIDLCの強みは「固定された設計プロセスによる品質保証」にあり、動的な変更はこの強みを損なうリスク
- ただし、プロジェクトの成熟度に応じたフェーズの省略（既にdomain_modelがあるUnitではdomain-designerをスキップ）は合理的

**推奨アクション**:
1. **フェーズスキップ機構の導入**（追加・挿入よりも優先度が高い）
   - 既に成果物が存在するフェーズの自動スキップ
   - `phasegate.config.json` の `phase_gate.skip_if_exists: true` フラグ
2. **プリセットベースのフェーズ構成**
   - `minimal`（domain-designer + story-implementorのみ）、`standard`（現在の全フェーズ）、`strict`（レビューフェーズ追加）のプリセット
   - 既存のプリセット機構（`scripts/harness/core/presets/`）を活用

---

### GAP-6: Quick Mode（アドホックタスク）

**GSD2.0のアプローチ**:
- `quick` コマンドで全計画プロセスをバイパス
- 小さなバグ修正やリファクタリングに最適化
- 計画オーバーヘッドなしで即座に実行

**AIDLC_HARNESS現状**:
- **全タスクがフルフェーズゲートを通過する必要がある**
- 1行のタイポ修正でもdomain_model.md→logical_design.md→...の存在が必要
- `[skip-harness]` コミットメッセージキーワードによるバイパスは設計済みだが、構造化されていない

**ギャップ深刻度**: **Important**

**AIDLCとの競合**: **直接競合** — フェーズゲートはAIDLCの核心原則

**推奨アクション**:
1. **タスクスコープによるゲート強度の可変化**
   - `phasegate.config.json` に `quick_mode` セクションを追加
   - Quick Modeでは一部バリデータ（architecture, dependency, security）のみ実行し、phase-gateをスキップ
2. **Quick Mode対象の明確化**
   - 対象: テストファイルのみの変更、docs配下の修正、typo修正、リファクタリング（既存テストが全グリーン前提）
   - 対象外: 新規ドメインモデル追加、API契約変更、新機能追加
3. **Quick Mode用のCLIコマンド**
   - `harness:quick-check` — phase-gateを除いたバリデータのみ実行
   - 既存の `harness:check-ready` との使い分けを明確化

---

### GAP-7: モデルコスト最適化（Model Profiles）

**GSD2.0のアプローチ**:
- `quality` / `balanced` / `budget` の3プロファイル
- Agent役割に応じてモデルを使い分け（研究者はbalanced、プランナーはquality、実行者はbudget等）
- `config.json` でプロジェクト単位の設定

**AIDLC_HARNESS現状**:
- **モデル選択の仕組みは存在しない**
- Skills間でモデルの使い分けは未定義
- `.claude/settings.json` にモデル指定の設計なし

**ギャップ深刻度**: **Nice-to-have**

**AIDLCとの競合**: なし。運用最適化の領域であり設計原則とは無関係

**推奨アクション**:
1. **SKILL.mdへのモデルヒント追加**（低コスト実装）
   - 各SKILL.mdに推奨モデルクラス（quality/balanced/budget）をメタデータとして記載
   - product-architect、domain-designer → quality（設計品質が重要）
   - story-implementor → balanced（実装速度と品質のバランス）
   - テスト系スキル → budget（定型的な作業）
2. **codex-delegator経由の自動モデル選択**
   - SKILL.mdのモデルヒントに基づき、Codexタスク委譲時にモデルを自動選択

---

### GAP-8: Brownfield オンボーディング（既存プロジェクトへの導入支援）

**GSD2.0のアプローチ**:
- `map-codebase` コマンドで4並列マッパー（stack, architecture, conventions, concerns）がプロジェクトを分析
- 分析結果をCONTEXT.mdに記録し、以降のタスクで参照

**AIDLC_HARNESS現状**:
- **`harness:init`** コマンドは存在するが、設定ファイル生成のみ
- 既存コードベースの自動分析機能は未実装
- Brownfieldプロジェクトへの導入は手動でメタデータ（`@unit`, `@layer`）を付与する必要あり
- `phasegate.config.json` のプリセット（minimal/standard/strict）が段階的導入を支援するが、コードベース分析は含まない

**ギャップ深刻度**: **Important**

**AIDLCとの競合**: なし。Brownfield対応はAIDLC普及の前提条件

**推奨アクション**:
1. **`harness:scan` コマンドの新設**
   - 既存コードベースをスキャンし、以下を自動検出:
     - レイヤー構造（controller/usecase/model/infrastructure）の推定
     - モジュール境界（Unitの候補）の推定
     - 既存テストのカバレッジとパターン分析
     - 依存関係グラフの生成
   - 結果を `harness-scan-report.json` に出力
2. **メタデータ自動付与ツール**
   - `harness:annotate` コマンドで、scan結果に基づき `@unit`/`@layer` コメントを自動挿入
   - 人間によるレビュー→承認→適用の2フェーズ

---

### GAP-9: Nyquist Validation Layer（要件-テストマッピング）

**GSD2.0のアプローチ**:
- テストケースを要件にマッピングし、コード実装前にテストカバレッジの十分性を検証
- 「コードが書かれる前にテスト設計が要件を網羅しているか」を保証
- 要件変更時にテストギャップを自動検出

**AIDLC_HARNESS現状**:
- **部分的に対応**: test-coverage-checker スキルが存在し、テスト設計の網羅性を検証
- `product/construction/{unit}/coverage_report.md` でカバレッジを管理
- ただし、**要件（User Story）とテストケースの双方向トレーサビリティ**は未実装
- CIの90%カバレッジ閾値はコードレベルのカバレッジであり、要件レベルのカバレッジではない

**ギャップ深刻度**: **Critical**

**AIDLCとの競合**: なし。むしろAIDLCのテスト設計先行アプローチと完全に整合

**推奨アクション**:
1. **要件-テストトレーサビリティマトリクスの導入**
   - `product/construction/{unit}/requirement-test-matrix.json` を新設
   - 各User StoryのAcceptance Criteria → テストケース（unit/it/scenario）のマッピング
   - フェーズゲートに「全AC → テストケースマッピング完了」チェックを追加
2. **test-coverage-checker の拡張**
   - コードカバレッジ（行/分岐）に加え、要件カバレッジ（AC網羅率）を算出
   - 未カバーのACを自動検出し、テスト設計の不足を報告
3. **要件変更時の影響分析**
   - User Story変更時に、影響を受けるテストケースを自動特定
   - `harness:impact-analysis US-XXX` コマンドの新設

---

## 推奨アクション優先順位（MVHアプローチ）

記事のMVH（Minimum Viable Harness）に準拠した段階的実施計画:

### 🔴 Phase 1: 今週中（高優先度）

1. **ADRの初期作成**（5〜10件）
   - フェーズゲート採用理由、レイヤー構成根拠、ESLint選定等
   - テンプレートの整備
2. **Stop Hookにテストゲートを追加**
   - `pnpm test`全グリーンを完了条件に設定
   - 無限ループ防止の`stop_hook_active`フラグ実装
3. **リンター設定保護Hookの追加**
   - `.eslintrc`, `tsconfig.json`, `package.json`等の変更ブロック
4. **コンテキスト優先度ファイルの導入** [NEW: GAP-1]
   - `.harness/context-priority.json` を作成
   - CLAUDE.md/SKILL.mdからの参照を設定

### 🟡 Phase 2: 2〜4週間以内（中優先度）

5. **Oxlint + Biomeの導入**
   - PostToolUse Hookの高速化
   - ESLintはCIに残す
6. **起動ルーチンの標準化 + セッション状態管理** [NEW: GAP-4]
   - `.harness/session-state.json` の導入
   - Workflow/CLAUDE.mdに起動チェックリストを追加
7. **Quick Mode の実装** [NEW: GAP-6]
   - `harness:quick-check` コマンドの新設
   - タスクスコープによるゲート強度の可変化
8. **E2Eテスト戦略テンプレートの作成**
   - Playwright CLI / puppeteer-mcp-server の導入ガイド
   - Stop Hookでのテスト通過強制テンプレート
9. **エラーメッセージの拡充**
   - ADR参照 + 修正コード例を含むフォーマットに統一
10. **要件-テストトレーサビリティマトリクスの導入** [NEW: GAP-9]
    - requirement-test-matrix.json フォーマット策定
    - フェーズゲートへの統合

### 🟢 Phase 3: 1〜3ヶ月（低優先度）

11. **Wave実行オーケストレーションの設計** [NEW: GAP-2]
    - 同一フェーズ内の並列化設計
    - `harness:plan-waves` CLIの実装
12. **マイルストーンベースのライフサイクル管理** [NEW: GAP-3]
    - milestones.json + state.json の導入
    - `harness:audit-milestone` コマンド
13. **Brownfieldオンボーディングツール** [NEW: GAP-8]
    - `harness:scan` + `harness:annotate` コマンドの実装
14. **archgateパターンの導入**（ADRとリンタールールの結合）
15. **AI生成コードアンチパターン検出の追加**
16. **ドキュメント鮮度チェック機能**
17. **ポインタ検証バリデータの新設**
18. **ハイブリッド運用戦略ドキュメントの作成**
19. **Lefthookの導入検討**
20. **SKILL.mdへのモデルプロファイル追加** [NEW: GAP-7]

---

## GSD2.0 ギャップ サマリーテーブル

| # | 領域 | 深刻度 | AIDLC競合 | 推奨 Phase | GSD2.0対応機能 |
|:--|:-----|:------|:---------|:----------|:-------------|
| GAP-1 | コンテキスト腐敗防止 | **Critical** | なし | Phase 1 | Fresh 200K context, CONTEXT.md |
| GAP-2 | Wave実行オーケストレーション | Important | 部分的 | Phase 3 | Wave grouping, 4 parallel executors |
| GAP-3 | ライフサイクル管理 | Important | なし | Phase 3 | ROADMAP.md, STATE.md, milestones |
| GAP-4 | セッション継続性 | Important | なし | Phase 2 | pause-work / resume-work |
| GAP-5 | 動的スコープ管理 | Nice-to-have | 部分的 | Phase 3 | add/insert/remove phases |
| GAP-6 | Quick Mode | Important | 直接競合 | Phase 2 | quick command |
| GAP-7 | モデルコスト最適化 | Nice-to-have | なし | Phase 3 | quality/balanced/budget profiles |
| GAP-8 | Brownfieldオンボーディング | Important | なし | Phase 3 | map-codebase, 4 parallel mappers |
| GAP-9 | Nyquist検証層 | **Critical** | なし | Phase 2 | Test-to-requirement mapping |

---

## まとめ

本PJは記事が推奨するハーネスエンジニアリングのベストプラクティスの**約60〜70%を対応済み**であり、特に「計画と実行の分離」「フェーズゲート」「多層防御（L1-L4）」「Hooks活用」は十分に成熟している。

GSD2.0との比較で特定された**9つのギャップ**のうち、**2つがCritical**（コンテキスト腐敗防止、Nyquist検証層）であり、早急な対応が推奨される。

最も重要な発見:
1. **コンテキスト腐敗防止（GAP-1）**: 597KB超の設計ドキュメントがエージェントのコンテキストを圧迫するリスク。GSD2.0のサブエージェント+新鮮コンテキスト戦略を参考に、コンテキスト優先度管理とドキュメント要約レイヤーを導入すべき
2. **Nyquist検証層（GAP-9）**: AIDLCのテスト設計先行アプローチは強みだが、要件-テスト間の双方向トレーサビリティが欠如。GSD2.0のNyquist概念を採用し、要件カバレッジの機械的な検証を実現すべき
3. **Quick Mode（GAP-6）**: フェーズゲートの強みを維持しつつ、アドホックタスクへの柔軟性を確保する設計が必要。GSD2.0のquickモードをAIDLC原則と両立させる工夫（スコープベースのゲート強度可変化）が鍵

記事が述べるように「すべてを一度に導入する必要はない」。上記のMVHアプローチに従い、Phase 1の4項目から着手することを推奨する。
