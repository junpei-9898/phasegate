# Phasegate — OSS公開・収益化戦略書

- **作成日**: 2026-04-02
- **ステータス**: Draft
- **バージョン**: v1.0

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [市場ポジショニング](#2-市場ポジショニング)
3. [ライセンス戦略](#3-ライセンス戦略)
4. [公開モデル: 全公開 + 知識格差](#4-公開モデル-全公開--知識格差)
5. [ネーミング・ブランディング](#5-ネーミングブランディング)
6. [段階的リリース計画](#6-段階的リリース計画)
7. [コンサルティングファネル設計](#7-コンサルティングファネル設計)
8. [日本市場戦略](#8-日本市場戦略)
9. [グローバル展開パス](#9-グローバル展開パス)
10. [コミュニティ・マーケティング戦略](#10-コミュニティマーケティング戦略)
11. [資金調達（GitHub Sponsors）](#11-資金調達github-sponsors)
12. [6ヶ月ロードマップ](#12-6ヶ月ロードマップ)
13. [アンチパターン（避けるべきこと）](#13-アンチパターン避けるべきこと)
14. [成功指標（KPI）](#14-成功指標kpi)
15. [v2.0以降の展望](#15-v20以降の展望)

---

## 1. エグゼクティブサマリー

### 一言でいうと

**「Apache 2.0で全公開 + 日本語コンテンツで認知獲得 + 導入コンサルで収益化」**

コードを隠すな。知識で稼げ。このプロジェクトの真の価値はTypeScriptのコードではなく、「AI時代のソフトウェア品質をどう保証するか」という設計哲学と適用ノウハウにある。それはフォークできない。

### なぜ今か

- AI Coding Agent（Claude Code, Codex, Copilot, Cursor等）が急速に普及する2025-2026年
- 「AIに書かせたコードの品質をどう保証するか」は全チームが直面する未解決の課題
- **コードレベルでの構造的整合性強制をエージェント非依存で提供する**プロダクトは現時点で存在しない
- 「バイブコーディング」への反動として、構造化されたAI開発プロセスへの需要が急増

### 戦略の3本柱

| 柱 | 内容 |
|---|---|
| **全公開で採用最大化** | 28スキル・5層防御モデルをApache 2.0で完全公開 |
| **日本市場でニッチ支配** | 日本語ファーストのコンテンツ戦略で先行者利益を確保 |
| **導入コンサルで収益化** | ツールは無料、適用ノウハウは有料 |

---

## 2. 市場ポジショニング

### 競合マップ

```
                    設計レベル（高）
                         |
                  ★ Phasegate（本プロジェクト）
                         |
         ArchUnit -------|------- Speckit
                         |
プロセス寄り ------------|------------- コード寄り
                         |
         SonarQube ------|------- ESLint/Biome
                         |
                    コードレベル（低）
```

### 差別化メッセージ

| vs | 差別化 |
|---|---|
| **ESLint/Biome** | 「Lintは構文を守る。Phasegateは設計を守る。」 |
| **ArchUnit** | 「ArchUnitはテスト時に検査する。Phasegateはコードを書く前に防ぐ。」 |
| **Speckit** | 「SpeckitはAPI仕様を管理する。PhasegateはSDLC全体を統治する。」 |
| **BMAD/Taskmaster** | 「プロンプトベースのガイドラインではなく、機械的な強制。」 |

### ユニークな強み

1. **タイミングが完璧**: AI品質保証の需要が急増する市場に先行者として参入
2. **Self-hosting**: 本プロジェクト自身がこのツールで品質管理されている（最強のdogfooding）
3. **28スキルの知識壁**: スキル群の依存関係・実行順序・最適な組み合わせはコードだけでは把握できない
4. **日本市場の空白**: 日本語で使えるAI品質ガバナンスツールは存在しない
5. **Nyquist Validationの独自性**: 要件-テストのトレーサビリティを数理的に検証する概念は学術的にも新しい

---

## 3. ライセンス戦略

### 結論: Apache 2.0

| ライセンス | 採用障壁 | コンサル誘引力 | ソロ開発者との相性 | 日本企業受容性 |
|-----------|---------|-------------|-----------------|-------------|
| MIT | 最低 | 低（フォークされて終わり） | 中 | 高 |
| **Apache 2.0** | **最低** | **中〜高** | **最高** | **最高** |
| AGPL | 最高（企業が避ける） | 高（回避コンサル需要） | 低 | 最低 |
| BSL | 高 | 中 | 中 | 低（理解されにくい） |
| デュアル | 中 | 高 | 低（法務負荷） | 低 |

### Apache 2.0を選ぶ理由

1. **特許条項**: Contributorからの明示的な特許付与がある。日本の大企業法務部門がMIT以上に採用しやすい
2. **商用利用のハードルがゼロ**: 企業がプロダクションに入れやすい = 採用母数が最大化 = コンサル対象企業が増える
3. **AGPLは日本企業が最も嫌うライセンス**: 法務が理解できず「使用禁止」にされるケースが多い
4. **フォークリスクはこのプロジェクトでは低い**: 28スキル + 5層防御モデルの設計思想・運用知見はコードだけでは複製できない

### 絶対に避けるべきこと

- **ライセンス変更（Bait and Switch）**: Apache 2.0で公開した後にAGPL/BSLに変更するとコミュニティの信頼が壊滅する（HashiCorp, Redis, MongoDBの前例）

---

## 4. 公開モデル: 全公開 + 知識格差

### Open Core分割は**しない**

28スキルを「フリー版12 / 有料版16」に分割する戦略は以下の理由で失敗する:

- v0.9.0段階で有料ゲートを設けると採用が進まない
- スキルの分割基準が曖昧で、ユーザーに「出し惜しみ」と見える
- ソロ開発者が有料モジュールの保守・ライセンス管理・決済インフラを回すのは非現実的

### 推奨モデル: 「全スキル公開 + 適用知識の非対称性」

**Tier 0 — 完全無料・OSS**

- 28スキル全て
- 5層防御モデル (L0-L4) 全て
- `phasegate.config.json` によるプリセット (minimal / standard / strict)
- CLIツール、バリデータ、Phase Gate

**Tier 1 — コンサルが必要になるポイント（需要の源泉）**

| 商材 | 内容 | なぜ有料で売れるか |
|------|------|----------------|
| 既存プロジェクトへの段階的導入設計 | 「うちのコードベースにどう入れるの?」 | 50万行の既存コードへの適用はスキルだけでは不可能 |
| `@unit` / `@layer` のレトロフィット | 既存コードへのメタデータ付与戦略 | 大規模コードベースでは設計判断の連続 |
| DDD設計とharness-configの最適化 | 28スキルのうちどれをどの順で有効化すべきか | 依存関係の理解に経験が必要 |
| Nyquist Validation構築 | 要件-テストトレーサビリティの設計 | 企業固有の要件文書フォーマットへの対応 |
| CI/CDパイプラインへのL3統合 | GitHub Actions/GitLab CI等との統合 | インフラ固有の設定が必要 |
| チームへのAIDLCプロセス研修 | AI駆動開発プロセスの組織導入 | ツールだけでは文化は変わらない |

### なぜこのモデルが機能するか

28スキルは `product-architect` → `story-writer` → `unit-designer` → `domain-designer` → `logical-designer` → `story-implementor` という**順序と依存関係が複雑**。スキル単体は無料で使えるが、チーム全体のワークフローに統合するには設計判断が多数必要。ここがコンサルの商材になる。

**参考モデル — Tailwind CSS型**:
- ツールは全て無料
- ツールを使った成果物（テンプレートリポジトリ、設定プリセット、研修資料）を将来的に有料化
- 具体例: 「Phasegate対応のNext.jsスターターキット」「harness導入済みDDDボイラープレート」

---

## 5. ネーミング・ブランディング

### 決定事項（2026-04-02 確定）

旧名称「GSDLC Harness」から **Phasegate** にリブランド完了。

| 項目 | 値 |
|------|-----|
| **パッケージ名** | `phasegate`（npm名 空き確認済み・確保済み） |
| **Orchestration** | `@phasegate/conductor` |
| **設定ファイル** | `phasegate.config.json`（旧 `harness.config.json`） |
| **GitHub リポジトリ** | `junpei-9898/phasegate`（要手動リネーム） |

### 選定理由

- 最大の技術的差別化（フェーズゲート強制）を名前で直接伝える
- 英語圏でも日本語圏でも発音しやすい。「PG」と略せる
- 「Phasegate passed」「Phasegate blocked」がCLIログメッセージとして自然
- パッケージ名は英語、日本の香りはタグライン・ビジュアル・コンテンツで出す方針

### タグライン

```
メイン:   Phasegate — AIが書くコードに設計の意志を。
英語版:   Phasegate — Design-first enforcement for AI-assisted development
挑発版:   バイブコーディングの終わりに。
```

### ビジュアルアイデンティティ

- **モチーフ**: ゲート（関所）+ レイヤー構造。5層の水平線がゲートを形成するミニマルな図形
- **配色**: 深い藍色（#1B365D）+ 警告のアンバー（#F5A623）
- **フォント**: 等幅フォント系（ターミナルツールであることを視覚的に示す）

### リブランド実施状況（2026-04-02 完了）

| 対象 | 状態 |
|------|------|
| package.json `"name"` | `"phasegate"` に変更済み |
| `harness.config.json` → `phasegate.config.json` | リネーム済み（TS 28ファイル + MD 107ファイル更新） |
| ドキュメント内の GSDLC 参照 | 全て Phasegate に置換済み（268箇所） |
| `scripts/harness/` ディレクトリ名 | v2.0 で `scripts/phasegate/` に変更予定 |
| `bin/harness` CLI名 | v2.0 で `bin/phasegate` に変更予定 |
| GitHub リポジトリ名 | 未実施（手動で Settings から変更が必要） |

---

## 6. 段階的リリース計画

### 全体タイムライン

| フェーズ | 期間 | バージョン | ゴール |
|---|---|---|---|
| Phase 1: Pre-release | 4週間 | v0.10.0 - v0.12.0 | 公開可能な状態にする |
| Phase 2: Core Release | 2週間 | v1.0.0 | npm公開 + 全28スキル同梱 |
| Phase 3: Incremental | 隔週 | v1.1.0 - v1.6.0 | 機能拡張・エージェント統合 |
| Phase 4: Community | 継続 | v1.7.0+ | コントリビューション受付開始 |

### Phase 1: Pre-release準備（4週間）

#### Week 1: 法的・メタデータ整備（v0.10.0）

| 作業 | ファイル | 内容 |
|------|--------|------|
| ライセンス追加 | `LICENSE` | Apache 2.0 |
| 変更履歴 | `CHANGELOG.md` | Keep a Changelog形式。v0.1.0〜v0.9.0の主要変更 |
| セキュリティポリシー | `SECURITY.md` | 脆弱性報告先（GitHub Security Advisories） |
| 行動規範 | `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 |
| npm除外設定 | `.npmignore` | 内部設計文書・テスト・開発用ファイルを除外 |

#### Week 2: ドキュメント二層化（v0.11.0）

**425 Markdownファイルの分類方針**:

| カテゴリ | パス | 公開方針 |
|---|---|---|
| 公開: 原則・ADR | `docs/principles/`, `docs/ADR/` | Gitに含め npm にも同梱 |
| 公開: ガイド | `docs/guide/`（新規作成） | 同上 |
| 非公開: 内部設計 | `docs/inception/`, `docs/product/construction/` | Gitに残すが `.npmignore` で npm 除外 |

**READMEの再構成**:

```
README.md           — 英語、200行以内。Quick Start + 概要
README.ja.md        — 現在のREADMEを整理（日本語フル版）
docs/guide/
├── installation.md     — 詳細インストール手順
├── configuration.md    — phasegate.config.json リファレンス
├── cli-reference.md    — 全CLIコマンド
├── skills-overview.md  — 28スキルの概要と実行順序
├── layer-model.md      — L0-L4 5層防御モデル解説
└── hooks-integration.md — Claude Code Hooks 統合
```

#### Week 3: パッケージ構造の公開対応（v0.12.0）

**package.json の主要変更**:

```jsonc
{
  "name": "phasegate",                    // リブランド
  "version": "1.0.0-rc.1",
  "description": "AI-agnostic quality defense toolkit — enforces structural integrity between design intent and code",
  "license": "Apache-2.0",
  "repository": { "type": "git", "url": "https://github.com/junpei-9898/phasegate.git" },
  "keywords": ["quality", "clean-architecture", "ddd", "ai-agent", "governance", "phase-gate"],
  "engines": { "node": ">=18.0.0" },
  "files": [
    "bin/harness", "scripts/harness/**/*.ts", "scripts/harness/**/*.json",
    "skills/**", "templates/**",
    "docs/ADR/**", "docs/principles/**", "docs/guide/**",
    "LICENSE", "CHANGELOG.md"
  ]
  // devDependencies から自己参照を削除
}
```

**CLI公開用コマンド追加**:

```bash
npx phasegate init                          # 初期設定生成
npx phasegate init --preset minimal         # L1のみ
npx phasegate init --preset standard        # L1+L2
npx phasegate init --preset strict          # L1+L2+L3
npx phasegate --help / --version
npx phasegate skills list                   # 利用可能スキル一覧
npx phasegate skills info <name>            # スキル詳細表示
```

#### Week 4: セキュリティ・品質チェック

| 項目 | 目的 |
|------|------|
| `npm audit` | 依存脆弱性チェック |
| `gitleaks detect` | 425 markdownにシークレットが混入していないか |
| `license-checker --production` | 依存ライセンスの互換性確認 |
| `npm pack --dry-run` | 公開サイズ確認（目標: 5MB以下） |
| Node 18/20/22でテスト | 互換性確認 |

### Phase 2: v1.0.0 Core Release（2週間）

**v1.0.0 に含めるもの**:

```
phasegate@1.0.0
├── bin/harness                          # CLI エントリポイント
├── scripts/harness/                     # メインソース
├── skills/                              # 全28スキル（SKILL.md）
├── templates/phasegate.config.json
├── docs/
│   ├── ADR/
│   ├── principles/
│   └── guide/
├── LICENSE
├── CHANGELOG.md
├── README.md (英語)
└── README.ja.md (日本語)
```

**スキルのティア分離は v1.0 ではしない**。代わりに `phasegate.config.json` のプリセットで制御:

```jsonc
{
  "skillTiers": {
    "core": ["product-architect", "story-writer", "story-mapper", "unit-designer",
             "domain-designer", "logical-designer", "environment-designer",
             "scenario-test-designer", "it-test-designer", "unit-test-designer",
             "story-implementor"],
    "advanced": ["test-coverage-checker", "scenario-test-logic-designer",
                 "it-test-logic-designer", "unit-test-logic-designer",
                 "implementation-readiness-checker", "mock-designer",
                 "uiux-designer", "codebase-mapper", "engineering-perspective",
                 "codex-delegator"],
    "infrastructure": ["cascade-updater", "consistency-checker", "implementation-planner",
                       "pointer-validator", "doc-freshness-checker", "skill-creator",
                       "quick-implementor"]
  },
  "activeSkillTier": "core"   // "core" | "advanced" | "all"
}
```

### Phase 3: v1.x Incremental Releases（隔週）

| バージョン | 時期 | スコープ |
|---|---|---|
| v1.1.0 | +2w | `init` コマンド改善 + preset テンプレート充実 |
| v1.2.0 | +4w | Advanced スキルティアの `activeSkillTier: "advanced"` 対応 |
| v1.3.0 | +6w | L4 スケジュール検証の公開対応 |
| v1.4.0 | +8w | Cursor / Windsurf / Cline 統合ガイド + hooks テンプレート |
| v1.5.0 | +10w | `codex-delegator` スキル公開 |
| v1.6.0 | +12w | Plugin API v1（カスタムスキル・カスタムバリデータ） |

**Breaking Change ポリシー**:
- v1.x.x — Breaking Change 禁止
- v2.0.0 — Plugin Architecture、事前コンパイル、config v2 スキーマ

### Phase 4: Community Readiness

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   ├── feature_request.yml
│   └── skill_request.yml
├── PULL_REQUEST_TEMPLATE.md
├── FUNDING.yml
└── workflows/
    ├── ci.yml          # Node 18/20/22 マトリクステスト
    ├── publish.yml     # npm publish（release時）
    └── label-sync.yml  # ラベル自動管理
```

---

## 7. コンサルティングファネル設計

### 4段階の自然な導線

```
Stage 1: 発見     npx phasegate init → minimal プリセットで動く → 「いいじゃん」
    ↓
Stage 2: 壁      strict にしたら既存コードが通らない / 28スキルの順序がわからない
    ↓
Stage 3: 接触    GitHub Discussionsに質問 → 作者が丁寧に回答 → 信頼構築
    ↓
Stage 4: 有償化  「この規模だと導入支援が効率的です」→ コンサル契約
```

### コンサルティングメニュー

| メニュー | 価格帯 | 内容 |
|---------|--------|------|
| 導入コンサルティング | 50-100万円/週 | 既存プロジェクトへのharness導入設計 |
| AIDLC研修（1日） | 30-50万円 | チーム向けAI駆動開発プロセス研修 |
| カスタムスキル開発 | 個別見積 | 企業固有のバリデーションルール/スキル作成 |
| 月次レビュー | 10-20万円/月 | harness設定と品質メトリクスの定期レビュー |

---

## 8. 日本市場戦略

### なぜ日本市場を最優先にするか

1. **品質管理文化が根付いている**: ISO 9001、CMMI等への投資意欲が高い
2. **AI導入への不安が大きい**: 「AIに書かせたコードの品質保証」は経営層の最大の懸念
3. **日本語ドキュメントがあるだけで選定候補に残る**: 英語OSSの導入ハードルが高い
4. **外部コンサルへの依存度が高い**: SIer文化がコンサル需要を下支えする

### Phase 1: 日本語ファーストを維持（公開〜6ヶ月）

- READMEは日英バイリンガル（上部に英語、下部に日本語詳細）
- スキルの SKILL.md 内の説明は日本語のまま維持（差別化要因）
- 「AI駆動開発の品質保証」という日本語キーワードでSEO的に独占

### Phase 2: 日本のAI開発コミュニティへの浸透（3〜12ヶ月）

**Zenn/Qiitaでの連載**:

| # | タイトル | 狙い |
|---|---------|------|
| 1 | 「バイブコーディングで作ったプロダクトを、フェーズゲートで診断してみた」 | バズ狙い。Before/Afterのインパクト |
| 2 | 「Claude Codeが書いたコードの品質を5層で防御する」 | 具体的なツール紹介 |
| 3 | 「DDD/Clean Architectureを AIエージェントに強制させる方法」 | DDDコミュニティへのリーチ |
| 4 | 「Nyquist Validation: 要件とテストの数理的トレーサビリティ」 | 学術的な独自性の訴求 |
| 5 | 「28スキルで実現するAIDLCプロセスの全体像」 | 全体像の提示 |

**Zenn Book: 「AI開発の品質防御 — Phasegate実践ガイド」**:

```
第1章  なぜAI生成コードに品質保証が必要なのか（無料公開 — バイラルの起点）
第2章  5層防御モデルの設計思想
第3章  セットアップと最初のフェーズゲート
第4章  L0: Pre-tool-useフックで「書く前に守る」
第5章  L1: メタデータとAST検証
第6章  L2: Pre-commitで品質関門
第7章  L3: CIパイプラインとの統合
第8章  L4: 設計文書との構造整合性検証
第9章  28スキルの活用ガイド（主要10スキルを詳説）
第10章 自分のプロジェクトに導入する手順
```

### Phase 3: エンタープライズ接触（6〜18ヶ月）

1. セルフホスティング事例を徹底的に文書化
2. SIer/コンサル向けホワイトペーパー作成（note掲載）
3. ISMS/ISO 9001との対応表作成
4. 無料品質アセスメントサービスを3社限定で提供（事例獲得のため）

**ターゲット企業属性**:
- 従業員100-500人のWeb系自社開発企業
- AI Coding Agent導入済みだが「品質低下」を感じている
- CTO/VPoEがXで発信力のある企業（拡散効果）

---

## 9. グローバル展開パス

### タイミング

| マイルストーン | 施策 |
|---|---|
| Day 1 | 最低限の英語README（概要、Quick Start、Feature List） |
| Star 100 | ドキュメントサイトで日英並行 |
| Star 300 | dev.to に英語記事連載開始 |
| Star 500 | Hacker News Show HN投稿 |

### ターゲットコミュニティ

| Phase | プラットフォーム | 施策 |
|---|---|---|
| Star 100-500 | dev.to, Reddit (r/programming, r/ExperiencedDevs) | "AI coding quality"タグで記事連載 |
| Star 500+ | Hacker News | Show HN投稿（火-木の米国午前中） |
| Star 500+ | Discord (Cursor, Claude Code等のコミュニティ) | 自然に言及 |

---

## 10. コミュニティ・マーケティング戦略

### プラットフォーム選定

**Phase 1 (Month 1-3)**: GitHub Discussions のみ
- Categories: `Announcements`, `Q&A`, `Ideas`, `Show and Tell`
- 理由: 非同期、検索可能、SEOあり、ソロ運営負荷が低い

**Phase 2 (Star 100+, Month 4以降)**: Discord追加
- チャンネル: `#general`, `#help`, `#development`, `#showcase`

### コントリビュータファネル

```
[認知] Zenn記事/X → [試用] npm install → [質問] GH Discussions
  → [Issue報告] GH Issues → [修正提案] PR（good first issue）
  → [スキル追加] 独自スキルPR → [コアメンバー] Maintainer招待
```

**good first issue を常に5個以上オープンに保つ**:
- ドキュメントの誤字修正（最もハードルが低い）
- テストケースの追加（日本語命名なので日本語話者が有利）
- 新スキルの追加（self-containedなので既存コードの理解が最小限）
- エラーメッセージの改善

### セルフホスティング事例（最強のマーケティング資産）

文書化すべき内容:
- **導入前後の定量データ**: 設計逸脱の検出数、リバート率
- **AI エージェントのブロック事例**: フェーズゲートがブロックしたログのスクリーンショット
- **失敗と改善の記録**: pre-tool-use hookのRead toolブロックバグ等のリアルな開発日記
- **バージョン履歴との対応**: v0.5.0→v0.9.0の改善ストーリー

### X (Twitter) 運用

- **building in public** スタイルで日次投稿
- ハッシュタグ: `#phasegate` `#AI品質` `#AIDLC`
- harness自身をharnessで開発している「self-hosting」を繰り返し伝える

### カンファレンス登壇

**CfPタイトル案**:
- 「AIエージェントに設計を理解させる — フェーズゲートという解法」
- 「バイブコーディングは悪なのか？構造的品質保証で共存する方法」
- 「DDD/Clean Architectureを『ルール』から『機械的強制』へ」

**登壇ターゲット**:
- CloudNative Days、Developer Summit（デブサミ）、VS Code Conference Japan
- DDD Community JP、TSKaigi、Node学園
- 技術書典（Zenn Bookを物理本化）

---

## 11. 資金調達（GitHub Sponsors）

### Tier設計

| Tier | 月額 | 特典 | ターゲット |
|------|------|------|----------|
| Supporter | $5 | README記載、Sponsors badge | 個人開発者 |
| Backer | $25 | + GitHub Discussionsで優先回答 | 小チーム |
| Silver | $100 | + 月1回30分のオフィスアワー | 中規模チーム |
| Gold | $500 | + 四半期ごとのPhasegate設定レビュー + ロゴ掲載 | 企業 |
| Platinum | $2,000 | + 月1回1hコンサル + 機能リクエスト優先 | 大企業 |

> Sponsorsは「おまけ」。主たる収益はコンサルティング。Sponsorsは月$500-2,000を目指す程度。

---

## 12. 6ヶ月ロードマップ

### Month 1: 基盤構築

| 週 | 施策 |
|---|---|
| W1 | リブランド（Phasegate）、法的ファイル追加、README再構成 |
| W2 | npm publish (RC版)、Zenn記事第1弾「バイブコーディング×フェーズゲート」公開 |
| W3 | X運用開始。日次TIL投稿。GitHub Discussions有効化 |
| W4 | v1.0.0正式リリース。good first issue 5件作成 |

**KPI**: Star 30, Zenn記事 Like 50+, npm weekly downloads 20+

### Month 2: コンテンツ蓄積

| 週 | 施策 |
|---|---|
| W1-2 | Zenn Book 第1-3章公開 |
| W3 | Qiita記事「3大AIエージェント品質比較」公開 |
| W4 | セルフホスティング事例のブログ記事公開 |

**KPI**: Star 80, Zenn Book読者 200+, 初のexternal contributor PR

### Month 3: コミュニティ種まき

| 週 | 施策 |
|---|---|
| W1 | connpass勉強会「AI開発の品質ガバナンスを考える会」開催 |
| W2 | DDD/CA系勉強会でLT登壇（5-10分） |
| W3 | Zenn Book 第4-6章公開 |
| W4 | カンファレンスCfP投稿 |

**KPI**: Star 150, connpass参加者 30+, contributors 3+

### Month 4: 拡散フェーズ

| 週 | 施策 |
|---|---|
| W1 | Discord開設 |
| W2 | dev.to に英語記事第1弾公開 |
| W3 | Hacker News Show HN投稿 |
| W4 | Zenn Book 第7-10章公開（完結） |

**KPI**: Star 300, HN投稿 50+ points, 英語圏からの初Star

### Month 5: エンタープライズ接触

| 週 | 施策 |
|---|---|
| W1-2 | note記事「AI開発時代の品質ガバナンス」ホワイトペーパー公開 |
| W3 | 無料品質アセスメント3社募集開始 |
| W4 | カンファレンス登壇 |

**KPI**: Star 500, エンタープライズ問い合わせ 3+, npm weekly downloads 100+

### Month 6: 持続性の確保

| 週 | 施策 |
|---|---|
| W1 | Triage権限付与対象を選定 |
| W2 | ロードマップ v2.0 をGitHub Discussionsで公開議論 |
| W3 | 品質アセスメント事例をケーススタディ化 |
| W4 | 振り返り記事「ソロOSS 6ヶ月の数字と学び」公開 |

**KPI**: Star 800, contributors 10+, Discord members 50+, 月間npm downloads 500+

---

## 13. アンチパターン（避けるべきこと）

| # | やってはいけないこと | 理由 |
|---|---|---|
| 1 | **初期からのOpen Core分割** | 採用が進まず両方腐る |
| 2 | **SaaS化** | インフラ運用・顧客サポートはソロでは無理 |
| 3 | **早期の英語圏進出** | ESLint/Biome等と直接競合。まず日本でニッチ支配 |
| 4 | **過剰な機能追加** | 28スキルは十分。品質と安定性の向上に集中 |
| 5 | **企業向け営業活動** | ソロで営業は時間の無駄。インバウンドの流れを崩さない |
| 6 | **無料コンサルの長期化** | 「設定の書き方」→ 無料。「50人チームへの導入」→ 有料に誘導 |
| 7 | **ライセンス変更** | コミュニティの信頼が壊滅する |
| 8 | **金銭を払ってインフルエンサーに依頼** | 日本の技術コミュニティでは即信頼喪失 |
| 9 | **YouTube/ポッドキャスト** | 制作コストに対するリターンが低い。ソロでは持続不可能 |
| 10 | **書籍執筆（初期）** | 採用事例が3社以上できてから |

### ソロメンテナーの燃え尽き防止ルール

1. Issue対応は48時間以内に「反応」するが、「解決」の期限は設けない
2. PRレビューは週末にまとめて行う（平日は開発に集中）
3. 「Not Planned」ラベルを躊躇なく使う
4. 月1回の「メンテナンスウィーク」: 新機能を止めてIssue/PR消化に集中
5. Month 3までは「コンテンツ作成」に80%、コミュニティ対応は20%

---

## 14. 成功指標（KPI）

### 6ヶ月後の目標

| 指標 | 目標値 |
|------|--------|
| GitHub Stars | 800+ |
| npm weekly downloads | 500+ |
| Contributors | 10+ |
| Discord members | 50+ |
| Zenn Book読者 | 1,000+ |
| コンサル問い合わせ | 5+ |
| GitHub Sponsors MRR | $500+ |

### 12ヶ月後の目標

| 指標 | 目標値 |
|------|--------|
| GitHub Stars | 3,000+ |
| npm weekly downloads | 2,000+ |
| 導入企業（公開事例） | 3+ |
| コンサル年収 | 300万円+ |
| GitHub Sponsors MRR | $2,000+ |

---

## 15. v2.0以降の展望

Phase 3までの反応を見て以下を検討:

1. **事前コンパイル**: `tsx` ランタイム依存をなくし `dist/` にJSを同梱
2. **Plugin Architecture**: `@phasegate/skill-core`, `@phasegate/skill-advanced` のスコープドパッケージ分離
3. **設定スキーマ v2**: JSON Schemaで `phasegate.config.json` のバリデーション + IDE補完
4. **国際化 (i18n)**: エラーメッセージ・スキル記述の多言語対応
5. **Web Dashboard**: バリデーション結果の可視化UI
6. **有料テンプレートリポジトリ**: Phasegate導入済みのDDD/CAボイラープレート
7. **オンライン研修コース**: Udemy等でのAIDLCプロセス研修

---

## 付録A: スキルティア分類の詳細

### Core Tier（11スキル — 基本的なTDDワークフロー）

| # | スキル | AIDLCステップ | 役割 |
|---|--------|-------------|------|
| 1 | product-architect | Step 0 | ビジネス要求→プロダクト定義 |
| 2 | story-writer | Step 1.1 | ユーザーストーリー作成 |
| 3 | story-mapper | Step 1.5 | MVPスコープ整理 |
| 4 | unit-designer | Step 1.2 | Unit分割・統合契約 |
| 5 | domain-designer | Step 2.1 | DDDドメインモデル設計 |
| 6 | logical-designer | Step 2.2 | Hexagonal Architecture設計 |
| 7 | environment-designer | Step 2.2 | インフラ構成設計 |
| 8 | scenario-test-designer | Step 6 | E2Eテストケース設計 |
| 9 | it-test-designer | Step 8 | 統合テストケース設計 |
| 10 | unit-test-designer | Step 8 | ユニットテストケース設計 |
| 11 | story-implementor | Step 2.3-2.7 | TDD実装 |

### Advanced Tier（10スキル — 品質ゲート・最適化）

| # | スキル | 役割 |
|---|--------|------|
| 12 | test-coverage-checker | テストカバレッジ検証 |
| 13 | scenario-test-logic-designer | E2Eテスト実装ロジック設計 |
| 14 | it-test-logic-designer | ITテスト実装ロジック設計 |
| 15 | unit-test-logic-designer | UTテスト実装ロジック設計 |
| 16 | implementation-readiness-checker | 実装前準備状況検証 |
| 17 | mock-designer | UIモックアップ設計 |
| 18 | uiux-designer | 最終UI/UX定義 |
| 19 | codebase-mapper | Unit/Layer構造可視化 |
| 20 | engineering-perspective | 多視点コードレビュー |
| 21 | codex-delegator | Codex CLIへのタスク委任 |

### Infrastructure Tier（7スキル — ガバナンス・メンテナンス）

| # | スキル | 役割 |
|---|--------|------|
| 22 | cascade-updater | 下位発見→上位設計フィードバック |
| 23 | consistency-checker | レイヤー間整合性チェック |
| 24 | implementation-planner | 実装計画立案 |
| 25 | pointer-validator | 設計文書ファイルポインタ検証 |
| 26 | doc-freshness-checker | 設計文書鮮度チェック |
| 27 | skill-creator | カスタムスキル作成 |
| 28 | quick-implementor | 軽微変更用ad-hoc実装 |

---

## 付録B: Phase 1 チェックリスト

### Week 1: 法的・メタデータ
- [ ] `LICENSE` (Apache 2.0) 作成
- [ ] `CHANGELOG.md` 作成
- [ ] `SECURITY.md` 作成
- [ ] `CODE_OF_CONDUCT.md` 作成
- [ ] `.npmignore` 作成
- [ ] `.gitignore` 更新
- [ ] `package.json` に license, repository, homepage, bugs, keywords, engines 追加
- [x] devDependencies から自己参照を削除 *(2026-04-02 完了)*
- [ ] `npm audit` 実行
- [ ] `gitleaks detect` 実行

### Week 2: ドキュメント
- [ ] 現 README.md を README.ja.md にコピー・整理
- [ ] 英語 README.md 新規作成（~200行）
- [ ] `docs/guide/` ディレクトリ作成
- [ ] installation.md, configuration.md, cli-reference.md, skills-overview.md, layer-model.md, hooks-integration.md 作成

### Week 3: パッケージ
- [x] リブランド実施（`phasegate` に変更済み — 2026-04-02 完了）
- [ ] `npx phasegate init` コマンド実装
- [ ] `--help` / `--version` / `skills list` / `skills info` 実装
- [ ] `npm pack --dry-run` でサイズ確認
- [ ] 別ディレクトリでインストールテスト
- [ ] npm アカウント準備

### Week 4: セキュリティ・最終確認
- [ ] 全 markdown のシークレットスキャン
- [ ] ライセンス互換性チェック
- [ ] Node 18/20/22 でのテスト確認
- [ ] `npm publish --tag next` で RC 公開
- [ ] RC の動作検証
