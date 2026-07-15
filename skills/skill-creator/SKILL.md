---
name: skill-creator
kind: advisory
description: phasegate バンドルのスキルを新規作成・改訂するための著者向けガイド。phasegate 固有の frontmatter 契約・正規見出し（skill-structure バリデータ）・モデル委任レンダリング・カタログ登録・日本語規約を扱う。スキルを追加/編集する際に使用する。
model: opus
languages: [typescript]
---

# Skill Creator

## Purpose

phasegate バンドル（`skills/` ディレクトリ）に含まれるスキルを新規作成・改訂するための著者向けガイド。

> **スコープ注記**: 本スキルは **phasegate 自身のスキル束を編集する** ための内部ガイドである。Anthropic 汎用の skill-creator（`.skill` zip 配布・`name`/`description` のみの frontmatter）とは配信モデルも規約も異なる。phasegate のスキルは npm パッケージ `phasegate` に同梱され、`npx phasegate init` / `install` / `reconcile` がプロジェクトの `skills/` 配下へ本文を配置し、有効なエージェント（`.claude/skills/` / `.codex/skills/`）へ公開する。zip パッケージングは行わない。

汎用の skill-creator から引き継ぐ普遍的な設計原則（後述の「引き継ぐ汎用原則」）は有効だが、frontmatter・見出し・配信・言語規約については本ガイドの phasegate 規約が優先される。

## phasegate スキルの配信モデル

- **配布**: スキルは `skills/{skill-name}/SKILL.md` として npm パッケージに同梱される。consumer プロジェクトの `node_modules/phasegate/skills/` から `phasegate install` / `reconcile` がコピー配置する。
- **自ホストのパス前提を作らない**: consumer では phasegate 自リポジトリのパスは存在しない。`docs/principles/...` 等を参照する場合は必ず**二段ルックアップ**を記述する（後述）。
- **モデル委任レンダリング**: `renderSkillForModelDelegation`（`scripts/harness/setup/skill-deployer.ts`）が、consumer の `modelRouting.delegation` 設定に応じて配置時に SKILL.md を書き換える。委任 `"none"` の consumer 向けには以下が**厳密な文字列置換**で行われる:
  - `model:` / `review:` frontmatter 行を削除
  - 定型委任文とロール名（下記「結合文字列」）をメインセッション実行の表現へ置換

  したがって新規スキルは、Phase 2 の委任文・ロール表現を既存 29 スキルと**バイト単位で同一**の定型文で書くこと。独自の言い回しにするとレンダラーが検出できず、委任 `"none"` consumer で不整合が残る。

### 結合文字列（バイト単位で保持する定型文）

3 フェーズスキルの本文では以下を一字一句そのまま使う（レンダラーが exact-match で置換する）:

- Phase 2 定義行: `委任先モデルに委任して成果物を生成する（\`npx phasegate delegate-sonnet\` 経由）`
- ロール表現: `Opus が`（Phase 1/3 の主体）
- `委任先モデル` / `\`npx phasegate delegate-sonnet\`` の各出現

これらを言い換えたり、句読点・バッククォート・全角括弧を変えてはならない。

## frontmatter 契約

phasegate のスキル frontmatter は `name` / `description` に加えて、他 29 スキルで使われる以下のフィールドを持つ:

| フィールド | 用途 | 例 |
|-----------|------|-----|
| `name` | スキル名（ディレクトリ名と一致） | `unit-designer` |
| `description` | トリガー用の簡潔な説明（何を・いつ使うか） | 下記参照 |
| `model` | 実行モデル（委任先） | `sonnet` / `opus` |
| `review` | レビュー担当モデル（3 フェーズスキルで使用） | `opus` |
| `languages` | 対象言語（1 件以上の配列） | `[typescript]` |
| `kind` | 構造種別（advisory のみ明示。省略時は lifecycle） | `advisory` |

- `model:` / `review:` は委任 `"none"` consumer 向けレンダリングで**削除される**（前述）。委任前提のロール表現も同時に書き換わるため、両者は連動している。
- `languages:` は skill-structure バリデータが `languageMetadata` セクションとして検出する（値が非空の配列であること）。空配列や欠落は構造 FAIL になる。
- `description` はトリガーの主機構。何をするか＋いつ使うかを含める。「いつ使うか」を本文に書いても本文はトリガー後にしか読まれないため無意味。

## 正規見出し（skill-structure バリデータ）への適合

新規スキルは skill-structure バリデータ（`scripts/harness/skill-quality/domain/services/skill-structure-validator.ts`）に**必ず合格**する。バリデータはスキルの **kind** ごとに必須セクションを決める:

- **lifecycle**（既定・23 スキル）: `frontmatter` / `languageMetadata` / `purpose` / `inputs` / `outputs` / `prerequisites` / `executionFlow` の 7 セクションを全保有すること。
- **advisory**（allowlist の 7 スキル。本スキル含む）: `frontmatter` / `languageMetadata` / `purpose` の 3 セクションのみ必須。

### セクション名 → 見出しの対応（sectionMap）

バリデータは見出しテキストの **先頭一致（startsWith・小文字化後）** でセクションを認識する。使用可能な見出しプレフィックス:

| セクション | 認識される見出し（いずれか） |
|-----------|--------------------------|
| `purpose` | `Purpose` / `目的` |
| `inputs` | `Inputs` / `入力` / `必須インプット` / `任意インプット` / `推奨インプット` |
| `outputs` | `Outputs` / `出力` / `出力ファイル` |
| `prerequisites` | `Prerequisites` / `前提条件` / `前提条件チェック` |
| `executionFlow` | `executionFlow` / `実行フロー` / `⚠️ 2フェーズ実行ルール` / `⚠️ 3フェーズ実行ルール` |

`frontmatter` は先頭が `---` で始まること、`languageMetadata` は frontmatter 内の非空 `languages:` で検出される。見出しは接尾辞（例: `（plan）`）を付けても先頭一致するが、**上表のプレフィックスを崩さないこと**。

### kind の登録場所（allowlist / taxonomy）

- kind 型と必須セクションの定義: `scripts/harness/skill-quality/domain/types/skill-kind.ts` と `.../value-objects/skill-structure.ts`。
- **advisory allowlist の pin**: `scripts/harness/__tests__/integration/skill-quality/skill-corpus-conformance.test.ts` の `ADVISORY_SKILLS` 配列。ここに列挙された 7 件だけが `kind: advisory` を宣言でき、8 件目の自己宣言はテストが fail する。**advisory を増やす場合はこのテストの allowlist を意図的に更新すること**（lifecycle 要求の回避を防ぐ pin）。lifecycle スキルを追加する場合は allowlist 変更不要だが、7 セクションを全て満たす必要がある。

## カタログ登録（新規スキル追加時に必須）

新規スキルは SKILL.md を書くだけでは配信されない。以下のカタログ・件数 pin を必ず更新する:

1. `scripts/harness/setup/skill-deployer.ts` の `SKILL_CATEGORIES`（`core` / `aidlc` / `utility` / `guidance` のいずれかに追加）。ここに載らないスキルは `getSkillsForSet` の配信対象にならない。
2. `scripts/harness/installation/application/bundled-skill-selection.ts`（インストール時の選択ロジック）。
3. 件数 pin: `skills/README.md`（"30 skills" の記述）・`docs/guide/skills-overview.md`（"30 skills"）。スキル総数を変えたら両方を同期更新する。
4. advisory を追加する場合は前述の `skill-corpus-conformance.test.ts` の `ADVISORY_SKILLS` と、テスト内の件数期待値（`skills.length` / lifecycle・advisory の内訳）も更新する。

> なお `scripts/harness/` 配下のソース（`skill-deployer.ts` / `bundled-skill-selection.ts` 等）の変更はフェーズゲート対象であり、`quick-implementor` / `story-implementor` スキル経由で行う（CLAUDE.md 参照）。スキル本文（`skills/**` の docs）編集はゲート緩和対象。

## 著者ルール（phasegate リポジトリ規約）

- **本文は日本語**: SKILL.md 本文の説明散文は日本語で書く（他 29 スキルに合わせる）。見出しプレフィックスは上表の許容形（英/日どちらでも先頭一致すればよい）。
- **3 フェーズ実行パターン**（成果物を生成する AIDLC 系スキルに適用）: Phase 1（計画・Opus が承認を得る）→ Phase 2（委任先モデルに委任して成果物を生成する（`npx phasegate delegate-sonnet` 経由））→ Phase 3（Opus が成果物を検証し直接修正する）。見出しは `## ⚠️ 3フェーズ実行ルール` を使うと `executionFlow` として認識される。純粋な助言/検査系（advisory）ではこのパターンは不要。
- **`references/` サブディレクトリ**: 詳細テンプレート・schema・ドメイン知識は `skills/{skill-name}/references/*.md` に切り出し、SKILL.md からは「いつ読むか」を明記して参照する（progressive disclosure）。
- **`docs/principles` 参照の二段ルックアップ**: consumer では phasegate 自リポジトリのパスが無いため、原則文書を参照する際は既存スキルと同じ定型で書く: 「consumer プロジェクトでは `node_modules/phasegate/docs/principles/...`、phasegate 自リポジトリでは `docs/principles/...` を参照する」。
- **自ホストのパス前提を作らない**: 出力先や設計文書パスは `phasegate.config.json` の `paths` で consumer が上書きできる旨を注記する（既定値であることを明示）。
- **テスト規約への言及**: スキルが生成/検査するテストは Vitest・AAA パターン・日本語テストケース名・kebab-case ファイル名・ドメイン層モック禁止（`docs/principles/testing-rules.md`）に従う旨を、該当スキルでは案内する。

## 引き継ぐ汎用原則（phasegate でも有効）

- **Progressive disclosure（段階的開示）**: SKILL.md 本文は必須の手順・ワークフローに絞り、詳細は `references/` へ。本文は簡潔に保つ（目安 500 行未満）。参照は SKILL.md から一段の深さに留める。
- **簡潔な description でトリガー精度を上げる**: description に「何を・いつ」を凝縮する。冗長な本文説明よりトリガー語彙を優先。
- **`scripts/` で決定的処理を固定**: 毎回書き直す/決定的信頼性が要るコードは `skills/{skill-name}/scripts/` に置く（トークン効率・再現性）。※本スキル同梱の `scripts/*.py`（`init_skill.py` 等）は Anthropic 汎用版由来のヘルパーであり、phasegate の frontmatter 契約・カタログ登録は補わない。phasegate スキルの雛形は既存 lifecycle/advisory スキルの SKILL.md をコピーして作るのが確実。zip パッケージング（`package_skill.py`）は phasegate の npm 配信では使用しない。
- **適切な自由度**: 手順が壊れやすい/一貫性が重要な箇所は具体的な手順（低自由度）、判断が文脈依存な箇所はテキスト指示（高自由度）で書き分ける。

## 新規スキル作成の手順（phasegate）

1. **用途と例の確定** — どんな依頼でトリガーし、どんな成果物/助言を出すかを具体例で固める。
2. **kind の決定** — 成果物を生成する lifecycle か、助言/検査のみの advisory か。advisory なら allowlist 更新が要る。
3. **雛形の用意** — 同種の既存スキル（lifecycle は例えば `unit-designer`、advisory は `phasegate-config-doctor`）の SKILL.md を土台にコピーし、frontmatter・見出しを埋める。
4. **本文作成** — 日本語散文で。3 フェーズ系なら結合文字列をバイト単位で流用。詳細は `references/` へ切り出す。
5. **構造検証** — `npx vitest run scripts/harness/__tests__/integration/skill-quality`（corpus-conformance）で宣言 kind の必須セクションに合格することを確認。
6. **カタログ登録** — `SKILL_CATEGORIES` / `bundled-skill-selection.ts` / 件数 pin（README・skills-overview）を更新。
7. **反復** — 実タスクで使い、SKILL.md / references を改善する。
