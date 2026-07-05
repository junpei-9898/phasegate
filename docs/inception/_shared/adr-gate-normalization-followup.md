# ADR コーパス正規化 — 「看板 vs 実態」ギャップの追跡フォローアップ

> 対象: **phasegate の OWN リポジトリの `docs/ADR/` コーパス**。
> 作成日: 2026-07-05
> スタイル: `docs/inception/_shared/l3-004-traceability-ratchet.md` に倣った honesty record（正直な事実記録）。

---

## 1. Finding — adr-foundation バリデータの発見範囲は実態と看板が乖離している

`adr-foundation` の ADR 発見（discovery）は、ファイル名がフォルダ走査用の正規表現にマッチしたものだけを対象とする。

- **発見正規表現**: `^[0-9]{3}-[a-z0-9-]+\.md$`
  出典: `scripts/harness/adr-foundation/infrastructure/repositories/file-system-adr-repository.ts:16`
  （`FileSystemAdrRepository.listAdrFiles()` が `readdir` の結果をこのパターンで filter する。`template.md` は別途除外）。

この事実から、以下の 2 系統のギャップが存在する:

### (a) 18 件のレガシー ADR はそもそも発見されない（ファイル名不一致）

`docs/ADR/` の既存 ADR 18 件はすべて `ADR-NNN-slug.md`（例: `ADR-001-four-layer-defense-model.md`）という `ADR-` プレフィックス付き命名であり、発見正規表現 `^[0-9]{3}-...` に**マッチしない**。したがって `validate-adr` はこれら 18 件を **1 件も走査しない**（phantom = 存在するが検査対象外）。

### (b) 18 件のレガシー ADR は本文フォーマットもパーサ非対応（レガシー markdown-header 形式）

仮に発見されたとしても、レガシー 18 件は次のようなレガシー markdown-header 形式で書かれている:

```
# ADR-NNN: title

## Status

Accepted

## Context
...
## Decision
...
## Consequences
...
```

一方、パーサ（`RegexAdrFrontmatterParser` / `AdrMarkdownDocumentParser`）が期待するのは **canonical な YAML frontmatter** 形式である:

```
---
adr_id: "NNN"
title: "..."
status: Accepted
date: YYYY-MM-DD
---

# title

## Context / ## Decision / ## Consequences / ## Alternatives
```

加えて、レガシー 18 件はいずれも `## Alternatives` セクションを持たない（18/18 欠落）。

### (c) 純効果（net effect）— `validate-adr --all` は現状ほぼ 0 件を検査する phantom gate

上記 (a)(b) の結果、`validate-adr --all` はレガシーコーパスに対して実質的に**何も検査していない**（発見 0 → 検査 0）。すなわち「ADR ゲートが存在する」という看板に対し、実態は「レガシー 18 件は無検査」という乖離である。

本変更（2026-07-05）以降、genuinely 検査されるのは新規 2 件のみである:

- `docs/ADR/019-ai-independence-boundary.md`
- `docs/ADR/020-reverse-learning-forward-proposal.md`

これらは発見正規表現にマッチする `NNN-slug.md` 命名かつ canonical YAML frontmatter で書かれており、リポジトリを `docs/ADR/` に向けて `findAll()` すると発見数 = 2、両者とも frontmatter validation を PASS することを確認済み（`ADR-019` / `ADR-020` が `valid: true, violations: []`）。

### (d) 補足の別ギャップ — CLI の rootDir 配線（要別途調査）

本作業中に判明した別事象として、`scripts/harness/main.ts` の `validate-adr` ケースは `createAdrFoundationModule(rootDir)` に `rootDir = process.cwd()`（プロジェクトルート）を渡しており、`FileSystemAdrRepository` は `readdir(this.rootDir)` を**プロジェクトルート直下**に対して行う（`docs/ADR/` を join していない）。このためプロジェクトルートで実行した `npx phasegate validate-adr --all` は発見数 0（`results: []`）を返す。

- リポジトリを直接 `docs/ADR/` に向けた場合は 019/020 が正しく発見・検査されることを確認済み（発見機構そのものは正しい）。
- CLI が `docs/ADR/` を走査するよう rootDir を配線し直すべきか否かは、下記 Remediation とあわせて別途判断する（**本フォローアップの Finding に含める既知事項**。source 修正が必要なため 手0 の範囲外）。

## 2. Decision — option A を採用（今回）

- **新規 ADR はバリデータ準拠にする**: 今回ドラフトされた 2 件を `ADR-019-*.md` / `ADR-020-*.md` → `019-*.md` / `020-*.md` にリネームし、発見正規表現にマッチさせた（本文は canonical YAML frontmatter のまま無変更）。これにより新規 ADR は genuinely 検査対象となった。
- **コーパス全体の正規化は先送り**: レガシー 18 件の命名・フォーマット移行は本作業では実施しない。看板 vs 実態ギャップとして本ドキュメントに追跡登録する。

この判断はレガシー ADR の内容や他プロジェクトの設定を一切変更しない。新規 ADR を「本当に検査される状態」に置く最小変更に限定している。

## 3. Remediation plan（将来タスク — 別途スケジュール）

コーパス全体を fail-closed で検査可能な状態へ引き上げる。次のいずれかを選択する:

- **(i) 発見正規表現を緩める + フォーマット移行**:
  発見正規表現を `ADR-` プレフィックスを任意で許容する形（例: `^(?:ADR-)?[0-9]{3}-[a-z0-9-]+\.md$`）に緩和し、かつレガシー 18 件を canonical YAML frontmatter へ移行する（欠落している `## Alternatives` の追記を含む）。既存ファイル名は維持できる。
- **(ii) 全 ADR をリネーム + フォーマット移行**:
  全 ADR を `NNN-slug.md` 命名に統一し、あわせてレガシー 18 件を canonical YAML frontmatter へ移行する（`## Alternatives` 追記を含む）。

いずれの場合も、移行完了後に:

- `validate-adr --all` を **コーパス全体で fail-closed**（発見漏れ・パース不能・frontmatter 不備をいずれも FAIL）にする。
- CLI の rootDir 配線（§1(d)）を、`docs/ADR/` を確実に走査するよう是正する。
- `validate-adr --all` をいずれかのゲート層（L2/L3）へ配線することを検討する。

**規模感**: これは対象約 18 ファイルの**境界の明確なミニプロジェクト**であり、手0（本作業）の一部ではない。別タスクとして個別にスケジュールすること。story-implementor / quick-implementor いずれのスコープに該当するかは、source（発見正規表現・CLI 配線）変更を伴うか否かで判断する（伴う場合は phase-gate 手順に従う）。

## 4. 現在の検査状態（正直な記録）

| 対象 | 命名 | フォーマット | 発見される？ | genuinely 検査される？ |
|------|------|-------------|-------------|----------------------|
| レガシー 18 件 | `ADR-NNN-slug.md` | markdown-header（`# ADR-NNN:` / `## Status`、`## Alternatives` 欠落） | いいえ | いいえ（phantom） |
| 新規 019 | `019-ai-independence-boundary.md` | canonical YAML frontmatter | はい | はい（PASS） |
| 新規 020 | `020-reverse-learning-forward-proposal.md` | canonical YAML frontmatter | はい | はい（PASS） |

**総括**: 本変更で新規 2 件は本当に検査される状態になったが、ADR コーパス全体の「ゲート看板」と「実検査範囲」の乖離（レガシー 18 件が無検査）は残存する。上記 Remediation を別タスクとして明示的に残す。

## 5. 正規化の完了記録（2026-07-05, v0.173.0）

上記 Remediation plan の **(ii) 全 ADR をリネーム + フォーマット移行** を実施し、レガシー 18 件を正規化した。phantom ADR 問題は解消済み。

### 実施内容

- **リネーム（`git mv`、履歴保持）**: `ADR-001-*.md` 〜 `ADR-018-*.md` を `001-*.md` 〜 `018-*.md` に改名（発見正規表現 `^[0-9]{3}-[a-z0-9-]+\.md$` に一致）。
- **YAML frontmatter 付与**: 各ファイルに canonical frontmatter（`adr_id` / `title` / `status` / `date`）を追加。
  - `title` は旧 H1 `# ADR-NNN: <Title>` から `ADR-NNN: ` プレフィックスを剥がして verbatim 採録。
  - `status` は旧 `## Status` セクションから抽出（18 件すべて **Accepted**。Superseded は 0 件のため `superseded_by` は不要）。
  - `date` は git の first-commit（author）日付を採用（`git log --diff-filter=A --follow`）。今日の日付でスタンプしていない。
  - `archgate` は 18 件いずれも本文に validator_id + error_code の enforcement mapping を明示していないため **省略**（捏造しない）。
- **`## Alternatives` セクション追加**: バリデータ要件（`adr-body.ts`）上、Alternatives は **optional** で、ヘッダを置く場合は非空本文が必要（空だと `AdrBodySectionRequiredError`）。
  - 016 / 017（本文に「検討した代替案」を記録） / 014（本文で 3 派を比較） / 018（YAML fenced metadata を明示的に不採用）の 4 件は、**本文が実際に記録している代替案を canonical `## Alternatives` として再掲**（再構成である旨を明記）。捏造なし。
  - 残り 14 件は代替案が原文に文書化されていないため、正直な注記（「当時、代替案は明示的に文書化されていない。本節は…遡及的正規化に伴い追加された。」）を記載。存在しない代替案は捏造していない。
- **既存本文の保全**: Context / Decision / Consequences および `## 関連要件` 等の追加セクションはすべて温存。実体の書き換えは行わず、frontmatter と `## Alternatives` の追加のみ。
- **クロスリファレンス更新**: `docs/ADR/ADR-NNN-*.md` を指す hard link を全て新パスに更新（README / CHANGELOG / docs/guide/* / docs/inception/_cross/WI-007,WI-014,WI-085,WI-094 / adr-foundation domain_model.md）。CHANGELOG の履歴記録（過去リリースが作成したファイル名の backtick 記録）は歴史的正確性のため保持。

### 検査状態（更新後）

| 対象 | 命名 | フォーマット | 発見される？ | genuinely 検査される？ |
|------|------|-------------|-------------|----------------------|
| 正規化済み 18 件（001..018） | `NNN-slug.md` | canonical YAML frontmatter | はい | はい（PASS） |
| 019 / 020 / 021 | `NNN-slug.md` | canonical YAML frontmatter | はい | はい（PASS） |

`validate-adr --all` は **21 件を発見し全件 PASS**（exit 0）。full test suite（547 files / 4123 tests）green。`real-adr-corpus.it.test.ts` は正規化後の現実（legacy 残存 0 / 18 件 discoverable）に合わせて更新した。

### 明示的に deferred（本作業のスコープ外）

- **H05-02 AC binding**: `@ac H05-02-N` タグの付与（§12 Key Decisions 全件の網羅検証）は本作業では実施しない。`real-adr-corpus.it.test.ts` は file-level `@story H05-02` のみを担持し、over-claim を回避する。別タスクとして残す。
- CLI の `validate-adr` を L2/L3 いずれかのゲート層へ常時配線する件は本作業の範囲外（Remediation §3 の残タスク）。
