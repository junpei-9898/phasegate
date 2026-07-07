# WI-241 ストーリードメインモデル: skill-kind taxonomy

@work-item-id WI-241

> Unit: skill-quality

## 1. 補助型

| 型 | 定義 | 説明 |
|----|------|------|
| `SkillKind` | `'lifecycle' \| 'advisory'` | スキルの種別。構造要件の強度を決定する。SKILL.md frontmatter の `kind:` で宣言。未宣言は `lifecycle`（fail-closed） |

## 2. 値オブジェクト

### SkillStructure（拡張）

| メンバ | 型 | 説明 |
|-------|-----|------|
| `requiredSections` | `readonly SectionName[]` | 当該 kind の必須セクション（凍結） |
| `forKind(kind)` | `(SkillKind) => SkillStructure` | kind 別の必須集合を返すファクトリ。lifecycle=7 / advisory=3 の 2 インスタンスをキャッシュ（同一 kind は同一インスタンス） |
| `default()` | `() => SkillStructure` | `forKind('lifecycle')` のエイリアス（後方互換） |
| `getMissingSections(actual)` | `(readonly SectionName[]) => readonly SectionName[]` | 不足セクションを返す（ロジック変更なし） |

## 3. 不変条件（INV）

| INV ID | 不変条件 |
|--------|---------|
| INV-10 | SkillStructure: requiredSections は変更不可（VO 定数、`Object.freeze`）かつ 1 件以上 |
| INV-13 | SkillStructure: `forKind('lifecycle')` は 7 セクション、`forKind('advisory')` は 3 セクションを返す |
| INV-14 | SkillStructure: advisory 必須集合 ⊆ lifecycle 必須集合（真部分集合） |
| INV-15 | SkillStructure: 同一 kind への `forKind` 呼び出しは同一インスタンスを返す（キャッシュ） |

## 4. ドメインサービス

### SkillStructureValidator（拡張）

frontmatter の `kind:` を走査し（未宣言=`lifecycle`、fail-closed）、`SkillStructure.forKind(kind)` を用いて構造検証する。kind 抽出以外のロジック（セクション抽出・不足判定）は変更しない。
