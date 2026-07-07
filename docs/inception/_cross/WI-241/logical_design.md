# WI-241 ストーリー論理設計: skill-kind taxonomy

@work-item-id WI-241

> Unit: skill-quality
> 対応 AC: H12-06-AC-2 / H12-06-AC-3

## 1. スコープ

`SkillStructureValidator` による SKILL.md 構造検証を、スキルの **kind** に応じて条件化する。これにより advisory 系スキルを捏造なしに正直に適合させ、H12-06-AC-2/AC-3（v0 既存 / v1 新規 SKILL.md が必須構造に適合することの検証）を真にカバーする。

## 2. コンポーネントと責務

| コンポーネント | 層 | 変更 | 責務 |
|--------------|-----|------|------|
| `SkillKind`（type） | domain/types | 新規 | `'lifecycle' \| 'advisory'` のユニオン型 |
| `SkillStructure`（VO） | domain/value-objects | 拡張 | `forKind(kind)` で kind 別の必須集合を返す。`default()` は `forKind('lifecycle')` エイリアス |
| `SkillStructureValidator`（domain service） | domain/services | 拡張 | frontmatter の `kind:` をスキャンし（未宣言=lifecycle）、`SkillStructure.forKind(kind)` で検証 |

## 3. 検証フロー（kind 条件化後）

```
validate(skillFilePath):
  raw ← reader.read(path)
  actualSections ← extractSections(raw)          # 既存ロジック（変更なし）
  kind ← extractKind(raw)                          # 新規: frontmatter の kind: をスキャン、未宣言なら 'lifecycle'
  structure ← SkillStructure.forKind(kind)         # kind に応じた必須集合
  missing ← structure.getMissingSections(actualSections)   # 既存ロジック（変更なし）
  missing.length === 0 ? passed : failed
```

### kind 抽出ルール（fail-closed）

- frontmatter（先頭 `---` 〜 次の `---`）内に `kind: advisory` があれば `advisory`。
- それ以外（`kind:` 未宣言、frontmatter 無し、`kind: lifecycle` 明示）はすべて `lifecycle`。
- すなわち **明示的に advisory を宣言しない限り厳格な 7 セクション集合が適用される（fail-closed）**。languageMetadata 抽出（`hasLanguageMetadata`）と同様の frontmatter 走査で実装する。

## 4. kind 別必須集合

| kind | 必須セクション | 件数 |
|------|--------------|------|
| lifecycle（既定） | frontmatter, languageMetadata, purpose, inputs, outputs, prerequisites, executionFlow | 7 |
| advisory | frontmatter, languageMetadata, purpose | 3 |

不変条件: advisory 必須集合 ⊆ lifecycle 必須集合（advisory は lifecycle の真部分集合）。

## 5. advisory 分類スキル（7 件）

`codex-delegator`, `engineering-perspective`, `implementation-readiness-checker`, `phasegate-config-doctor`, `phasegate-toolkit-guide`, `pointer-validator`, `skill-creator`。

各 SKILL.md frontmatter に `kind: advisory` を追記する（セクション捏造は行わない）。他 23 スキルは `kind:` 未宣言のまま lifecycle として扱われ、既存の 7 セクションを保持する。
