# Phasegate OSS公開 — タスクリスト

> 戦略書: [oss_public_release_strategy.md](./oss_public_release_strategy.md)
> 作成日: 2026-04-02
> 最終更新: 2026-04-02

---

## 凡例

- `[ ]` 未着手
- `[~]` 進行中
- `[x]` 完了
- `[—]` スキップ / 対象外

---

## Phase 0: リブランド（完了）

- [x] npm名 `phasegate` の空き確認
- [x] package.json の `"name"` を `"phasegate"` に変更
- [x] package.json の `"description"` を Phasegate に更新
- [x] devDependencies から自己参照 `gsdlc-harness` を削除
- [x] `harness.config.json` → `phasegate.config.json` にリネーム
- [x] `templates/harness.config.json` → `templates/phasegate.config.json` にリネーム
- [x] TSソースコード内の `harness.config.json` 参照を更新（28ファイル, 78箇所）
- [x] ドキュメント内の `GSDLC` → `Phasegate` を一括置換（268箇所）
- [x] ドキュメント内の `harness.config.json` → `phasegate.config.json` を一括置換（107ファイル）
- [x] テスト全パス確認（395ファイル / 2,848テスト）
- [x] GitHub リポジトリ名を `phasegate` に変更
- [x] `git remote set-url origin` を新URLに更新

---

## Phase 1: Pre-release準備（目標: 4週間）

### Week 1: 法的・メタデータ整備 → v0.10.0

#### 1-1. ライセンスファイル作成
- [ ] `LICENSE` ファイルを作成（Apache 2.0）
- [ ] package.json に `"license": "Apache-2.0"` を追加

#### 1-2. package.json メタデータ追加
- [ ] `"repository"` フィールド追加: `{ "type": "git", "url": "https://github.com/junpei-9898/phasegate.git" }`
- [ ] `"homepage"` フィールド追加: `"https://github.com/junpei-9898/phasegate#readme"`
- [ ] `"bugs"` フィールド追加: `{ "url": "https://github.com/junpei-9898/phasegate/issues" }`
- [ ] `"keywords"` 追加: `["quality", "clean-architecture", "ddd", "ai-agent", "governance", "phase-gate"]`
- [ ] `"engines"` 追加: `{ "node": ">=18.0.0" }`
- [ ] `"files"` を精密化（内部設計文書を除外、`docs/guide/` を含める）

#### 1-3. コミュニティファイル作成
- [ ] `CHANGELOG.md` 作成（Keep a Changelog形式、v0.1.0〜v0.9.0の主要変更をまとめる）
- [ ] `SECURITY.md` 作成（GitHub Security Advisories経由の報告先）
- [ ] `CODE_OF_CONDUCT.md` 作成（Contributor Covenant v2.1、英語）
- [ ] `CONTRIBUTING.md` 作成（開発ルール、PR手順、コミット規約）

#### 1-4. パッケージ除外設定
- [ ] `.npmignore` 作成（以下を除外）:
  - `docs/inception/`, `docs/product/construction/`, `docs/product/archive/`
  - `scripts/harness/__tests__/`
  - `*.result.json`, `reports/`, `.claude/`, `.harness/`
  - `CLAUDE.md`, `AGENTS.md`, `biome.json`, `pnpm-lock.yaml`
- [ ] `.gitignore` に `.env`, `*.tgz`, `coverage/` を追加

#### 1-5. セキュリティチェック
- [ ] `npm audit` 実行 — 依存脆弱性がないことを確認
- [ ] `gitleaks detect` 実行 — 全markdownにシークレットが混入していないことを確認
- [ ] `license-checker --production` — 全依存ライセンスが Apache 2.0 と互換であることを確認

#### 1-6. バージョンアップ・コミット・タグ
- [ ] `package.json` version を `0.10.0` に更新
- [ ] コミット・タグ `v0.10.0`
- [ ] push

---

### Week 2: ドキュメント再構成 → v0.11.0

#### 2-1. README 二言語化
- [ ] 現 `README.md` を `README.ja.md` にコピー・内容整理
- [ ] 英語 `README.md` を新規作成（200行以内）:
  - One-liner + badge（npm version, license, CI status）
  - What is Phasegate?（3行）
  - Quick Start（5ステップ以内、GIFアニメ推奨）
  - Key Features（5層防御モデルの図）
  - Skill Tiers テーブル（Core / Advanced / Infrastructure）
  - Documentation リンク集
  - Contributing リンク
  - License

#### 2-2. ガイドドキュメント作成
- [ ] `docs/guide/` ディレクトリ作成
- [ ] `docs/guide/installation.md` — 詳細インストール手順（バイリンガル）
- [ ] `docs/guide/configuration.md` — `phasegate.config.json` リファレンス（バイリンガル）
- [ ] `docs/guide/cli-reference.md` — 全CLIコマンド一覧（バイリンガル）
- [ ] `docs/guide/skills-overview.md` — 28スキルの概要と実行順序（バイリンガル）
- [ ] `docs/guide/layer-model.md` — L0-L4 5層防御モデル解説（バイリンガル）
- [ ] `docs/guide/hooks-integration.md` — Claude Code Hooks 統合ガイド（バイリンガル）

#### 2-3. バージョンアップ・コミット・タグ
- [ ] `package.json` version を `0.11.0` に更新
- [ ] コミット・タグ `v0.11.0`
- [ ] push

---

### Week 3: パッケージ公開対応 → v0.12.0

#### 3-1. CLI公開用コマンド実装
- [ ] `npx phasegate init` — `phasegate.config.json` + スキルテンプレート生成
- [ ] `npx phasegate init --preset minimal` — L1のみ有効の最小構成
- [ ] `npx phasegate init --preset standard` — L1+L2
- [ ] `npx phasegate init --preset strict` — L1+L2+L3
- [ ] `npx phasegate --help` — ヘルプ表示
- [ ] `npx phasegate --version` — バージョン表示
- [ ] `npx phasegate skills list` — 利用可能スキル一覧
- [ ] `npx phasegate skills info <name>` — スキル詳細表示

#### 3-2. パッケージサイズ確認
- [ ] `npm pack --dry-run` でサイズ確認（目標: 5MB以下）
- [ ] 別ディレクトリで `npm install ./phasegate-*.tgz` テスト
- [ ] `npx phasegate init` → `npx phasegate validate --layer L1` の一連の動作確認

#### 3-3. npm アカウント準備
- [ ] npmjs.com アカウント確認（または新規作成）
- [ ] `npm login` 実行
- [ ] 2FA 設定確認

#### 3-4. バージョンアップ・コミット・タグ
- [ ] `package.json` version を `0.12.0` に更新
- [ ] コミット・タグ `v0.12.0`
- [ ] push

---

### Week 4: セキュリティ・最終確認 → v1.0.0-rc.1

#### 4-1. 最終検証
- [ ] Node 18 でテスト通過確認
- [ ] Node 20 でテスト通過確認
- [ ] Node 22 でテスト通過確認
- [ ] `npm pack` でパッケージに不要ファイルが含まれていないことを確認

#### 4-2. RC版公開
- [ ] `npm publish --tag next` で RC版を npm に公開
- [ ] 別プロジェクトで `npm install phasegate@next` → 動作確認
- [ ] `npx phasegate init` → `npx phasegate validate --layer L1` 通過確認

#### 4-3. GitHub リポジトリ整備
- [ ] リポジトリ Description を更新: "AI-agnostic quality defense toolkit — enforces structural integrity between design intent and code"
- [ ] Topics を設定: `quality`, `clean-architecture`, `ddd`, `ai-agent`, `phase-gate`, `typescript`
- [ ] GitHub Discussions を有効化（Categories: Announcements, Q&A, Ideas, Show and Tell）

---

## Phase 2: v1.0.0 正式リリース（目標: Phase 1完了後 2週間）

#### 5-1. 正式リリース
- [ ] `package.json` version を `1.0.0` に更新
- [ ] `npm publish` で正式公開
- [ ] `git tag v1.0.0 && git push origin main --tags`
- [ ] GitHub Releases にリリースノート作成

#### 5-2. GitHub CI/CD 整備
- [ ] `.github/workflows/ci.yml` — Node 18/20/22 マトリクステスト + L1/L2 バリデーション
- [ ] `.github/workflows/publish.yml` — release 時に自動 `npm publish --provenance`
- [ ] `.github/ISSUE_TEMPLATE/bug_report.yml` — バグ報告テンプレート
- [ ] `.github/ISSUE_TEMPLATE/feature_request.yml` — 機能要望テンプレート
- [ ] `.github/ISSUE_TEMPLATE/skill_request.yml` — 新スキル提案テンプレート
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` — PRテンプレート
- [ ] `.github/FUNDING.yml` — GitHub Sponsors 設定

#### 5-3. good first issue 作成
- [ ] ドキュメント誤字修正系の Issue を 2件以上作成
- [ ] テストケース追加系の Issue を 2件以上作成
- [ ] エラーメッセージ改善系の Issue を 1件以上作成

---

## Phase 3: コンテンツ・コミュニティ（Month 1-3）

### Month 1: 認知獲得

#### 6-1. X (Twitter) 運用開始
- [ ] 技術アカウントの方針決定（個人 or プロジェクト専用）
- [ ] building in public スタイルで日次投稿開始
- [ ] ハッシュタグ: `#phasegate` `#AI品質` `#AIDLC`

#### 6-2. Zenn 記事 第1弾
- [ ] 「バイブコーディングで作ったプロダクトを、フェーズゲートで診断してみた」を公開
- [ ] README.md の Quick Start GIF アニメを作成・掲載

#### 6-3. GitHub Sponsors 開設
- [ ] `.github/FUNDING.yml` にスポンサー設定
- [ ] Tier設計（$5 / $25 / $100 / $500 / $2,000）を設定
- [ ] スポンサーページの説明文を記載

### Month 2: コンテンツ蓄積

#### 7-1. Zenn Book 着手
- [ ] 「AI開発の品質防御 — Phasegate実践ガイド」第1-3章を公開
- [ ] 第1章は無料公開（バイラルの起点）

#### 7-2. 技術記事連載
- [ ] Zenn/Qiita記事 #2「Claude Codeが書いたコードの品質を5層で防御する」
- [ ] セルフホスティング事例をブログ記事化

### Month 3: コミュニティ種まき

#### 8-1. 勉強会
- [ ] connpass で「AI開発の品質ガバナンスを考える会」を企画・開催
- [ ] DDD/CA系勉強会でLT登壇（5-10分）

#### 8-2. カンファレンス CfP
- [ ] DevSummit / CloudNative Days / TSKaigi 等のCfPに応募

#### 8-3. Zenn Book 継続
- [ ] 第4-6章を公開

---

## Phase 4: 拡散・エンタープライズ（Month 4-6）

### Month 4: 拡散

#### 9-1. Discord 開設
- [ ] Phasegate Discord サーバーを作成
- [ ] チャンネル: `#general`, `#help`, `#development`, `#showcase`

#### 9-2. 英語圏進出
- [ ] dev.to に英語記事第1弾を公開
- [ ] Hacker News Show HN 投稿（Star 300+ を目処に）

#### 9-3. Zenn Book 完結
- [ ] 第7-10章を公開（完結）

### Month 5: エンタープライズ接触

#### 10-1. ホワイトペーパー
- [ ] note記事「AI開発時代の品質ガバナンス」を公開

#### 10-2. 品質アセスメント
- [ ] 無料品質アセスメント3社を募集開始
- [ ] ISMS/ISO 9001との対応表を作成

#### 10-3. コンサルメニュー公開
- [ ] コンサルティングメニュー（導入コンサル / AIDLC研修 / カスタムスキル / 月次レビュー）を GitHub / 個人サイトに掲載

### Month 6: 持続性の確保

#### 11-1. コミュニティスケール
- [ ] 信頼できるコントリビュータに Triage 権限を付与
- [ ] CODEOWNERS を設定（スキルごとにメンテナーを分散）

#### 11-2. ロードマップ公開
- [ ] v2.0 ロードマップを GitHub Discussions で公開議論

#### 11-3. 振り返り
- [ ] 品質アセスメント事例を（許可を得て）ケーススタディ化
- [ ] 「ソロOSS 6ヶ月の数字と学び」記事を公開

---

## Phase 5: v2.0 準備（6ヶ月目以降）

- [ ] `scripts/harness/` → `scripts/phasegate/` ディレクトリリネーム（1,266ファイルのimportパス更新）
- [ ] `bin/harness` → `bin/phasegate` CLIコマンド名変更
- [ ] `npm run harness:*` → `npm run phasegate:*` スクリプト名変更
- [ ] `tsx` ランタイム依存をなくし `dist/` にJSを事前コンパイル
- [ ] Plugin Architecture 設計（`@phasegate/skill-core`, `@phasegate/skill-advanced`）
- [ ] `phasegate.config.json` v2 スキーマ（JSON Schema + IDE補完）
- [ ] 国際化 (i18n): エラーメッセージ・スキル記述の多言語対応

---

## 成功指標（KPI）

### 6ヶ月後

| 指標 | 目標値 |
|------|--------|
| GitHub Stars | 800+ |
| npm weekly downloads | 500+ |
| Contributors | 10+ |
| Discord members | 50+ |
| Zenn Book読者 | 1,000+ |
| コンサル問い合わせ | 5+ |
| GitHub Sponsors MRR | $500+ |

### 12ヶ月後

| 指標 | 目標値 |
|------|--------|
| GitHub Stars | 3,000+ |
| npm weekly downloads | 2,000+ |
| 導入企業（公開事例） | 3+ |
| コンサル年収 | 300万円+ |
| GitHub Sponsors MRR | $2,000+ |
