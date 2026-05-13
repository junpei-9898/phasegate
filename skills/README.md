# Skills ディレクトリ

このディレクトリには、AIエージェントの共有スキル定義が含まれています。現在の配布対象は 30 skills です。公開一覧は `docs/guide/skills-overview.md`、setup lifecycle の管理対象は `docs/guide/setup-artifacts.md` を正とします。<!-- @work-item-id WI-154 -->

## ディレクトリ構成と同期

このディレクトリはスキルの**唯一の信頼できる情報源 (Single Source of Truth)** です。
`.claude` と `.codex` の両方の環境から同じスキルにアクセスできるように、`phasegate install` / `phasegate reconcile` は必要に応じて以下のシンボリックリンクを管理します：

- `.claude/skills` -> `./skills` (プロジェクトルートからの相対パス)
- `.codex/skills` -> `./skills` (プロジェクトルートからの相対パス)

技術的には、リンクは以下のように設定されています：
- `.claude/skills` -> `../skills`
- `.codex/skills` -> `../skills`

`.agent/skills` は旧 setup 由来の互換パスです。新規導入では管理対象にしません。<!-- @work-item-id WI-157 -->

## 新しいスキルの追加

新しいスキルを追加する場合は、この `skills` ディレクトリに直接追加してください。あわせて `docs/guide/skills-overview.md`、README の skill 数、必要なら `skills/phasegate-toolkit-guide/SKILL.md` の参照先を更新します。シンボリックリンクを通じて、対応エージェントから利用可能になります。<!-- @work-item-id WI-154 -->
