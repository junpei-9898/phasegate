---
id: WI-261
type: fix
severity: medium
status: implemented
affects: [quick-mode]
---

# WI-261: skills/ 配下の指示文書（.md）を docs カテゴリに分類する

<!-- @work-item-id WI-261 -->

> 起票日: 2026-07-15
> 経緯: `scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine.ts` の `categorizeFile()` は、`skills/**/SKILL.md` の**新規作成**を「domain/docs/config/test 以外の CREATE = feature」に分類する。しかし phasegate 自リポジトリの `quickMode.allowedCategories` は `[bugfix, docs, test, config]`（feature なし）であり、full mode session の `FULL_MODE_SESSION_ALLOWED_CATEGORIES`（`main.ts`、`[domain, application, infrastructure, presentation, config]`）にも feature がない。さらに `WriteTargetScope.fromPath`（agent-integration）は `skills/` パスに unit を割り当てないため設計文書バイパスも成立しない。結果、**skills/ 配下に新規 SKILL.md を作る正規経路が存在せず**、WI-256 のスキル新設 2 件がブロックされて中断した。

## 診断の要点

- `feature` は「常に拒否対象」カテゴリ（`allowedCategories` に設定不可）であり、`skills/` 配下の Markdown 新規作成が feature に落ちると必ず MIXED_CHANGES で full mode 必須になる。
- しかし `skills/` 配下の `.md` は実装コードではなく **指示文書（instruction-carrying docs）**であり、その品質・完全性は専用防御が担う:
  - skill-quality corpus 適合テスト
  - advisory allowlist pin
  - instruction-file integrity pin（WI-254）
  - L3-006 advisory injection scanner（WI-259）
- よって `skills/` 配下の Markdown はソースコードのフェーズゲート（story-implementor 必須）に載せるべきではなく、既存の `docs/` と同様に **docs カテゴリ**に分類するのが正しい設計。

## 承認済みの修正方針

`quick-mode-judgment-engine.ts` の `categorizeFile()` に、`skills/` 配下の `.md` ファイル（`SKILL.md` および `references/*.md` 等）を `docs` カテゴリに分類する判定を追加する。`skills/` 配下の**非 Markdown**（もし現れたら）は従来どおり feature/bugfix にフォールバックし fail-closed を維持する。`phasegate.config.json` は変更しない（分類側の修正で解決する）。

## 受け入れ条件

- **AC-1**: `skills/**/*.md`（SKILL.md / references/*.md 等）の CREATE が `docs` カテゴリに分類される。
- **AC-2**: `skills/` 配下の非 `.md` ファイルの CREATE は従来どおり `feature`（fail-closed 維持）。
- **AC-3**: 既存分類（`scripts/harness` ソース・`docs/`・config・test・domain・api）に回帰がない。
- **AC-4**: 実 hook シミュレーションで `skills/` 配下の新規 SKILL.md の Write が quick mode で通る（EXIT=0）。

## スコープ外

- `phasegate.config.json`（`quickMode.allowedCategories` 等）の変更。
- full mode session の許可カテゴリ（`FULL_MODE_SESSION_ALLOWED_CATEGORIES`）の変更。
- `WriteTargetScope.fromPath` の unit 割当変更。
- 指示文書向け専用防御（skill-quality / integrity pin / injection scanner）の変更。

## 検証

- quick-mode unit の全テスト green。
- `npx phasegate lint` 0 violations。
- story-reflection corpus 回帰 green。
- 実 hook シミュレーション before（EXIT=2, feature/MIXED_CHANGES）→ after（EXIT=0）。
