---
id: WI-241
type: story
severity: normal
status: tested
affects: [skill-quality]
---

# WI-241: skill-kind taxonomy による SKILL.md 構造要件の kind 条件化

> 起票日: 2026-07-08
> 経緯: H12-06-AC-2/AC-3（v0 既存 / v1 新規 SKILL.md が必須構造に適合することの検証）は、実コーパス適合プローブで 7 スキルが必須 7 セクションに本質的に未適合であるため未カバーのまま据え置かれていた（`coverage_report.md` §2 H12-06 参照）。これらは advisory / read-only / thinking-framework / delegation-manager 系であり、inputs / outputs / prerequisites / executionFlow が本質的に存在しない。捏造でセクションを埋めることは反ロンダリング原則に反する。そこで **skill-kind taxonomy** を導入し、構造要件を kind に応じて条件化することで、全 30 スキルを正直に適合させ、AC-2/AC-3 を真にカバーする。

## 背景

`SkillStructure` は単一の必須 7 セクション集合（frontmatter / languageMetadata / purpose / inputs / outputs / prerequisites / executionFlow）を全スキルに一律適用していた。しかし 30 スキルには 2 つの本質的なカテゴリが存在する:

- **lifecycle**（既定・23 スキル） — AIDLC の設計/実装フェーズの成果物を生成する。inputs / outputs / prerequisites / executionFlow を本質的に持つ。
- **advisory**（7 スキル） — 助言 / read-only Q&A / 思考フレームワーク / 委任管理。固定の inputs / outputs / prerequisites / executionFlow を持たない。frontmatter / languageMetadata / purpose のみが本質的に必須。

## 設計判断（承認済み）

1. **2 つの kind**: `lifecycle`（既定）と `advisory`。SKILL.md frontmatter の `kind:` フィールドで宣言する。**未宣言は `lifecycle` 扱い（fail-closed）** — 明示的に `kind: advisory` を宣言しない限り、厳格な 7 セクション集合が適用される。
2. **lifecycle 必須集合** = 現行の完全 7 セクション（変更なし）。
3. **advisory 必須集合** = frontmatter / languageMetadata / purpose（languageMetadata を含む — 言語メタデータは全スキルで維持）。
4. **advisory に分類するスキル（7 件）**: `codex-delegator`, `engineering-perspective`, `implementation-readiness-checker`, `phasegate-config-doctor`, `phasegate-toolkit-guide`, `pointer-validator`, `skill-creator`。他 23 スキルは既定で lifecycle（frontmatter への `kind:` 追記なし）。

## 作業内容

1. `scripts/harness/skill-quality/domain/types/skill-kind.ts`（新規） — `SkillKind = 'lifecycle' | 'advisory'`。
2. `scripts/harness/skill-quality/domain/value-objects/skill-structure.ts` — `SkillStructure.forKind(kind)` を追加（lifecycle=7 / advisory=3 の 2 つの凍結インスタンスをキャッシュ）。`default()` は `forKind('lifecycle')` のエイリアスとして維持（既存呼び出し / テストへの波及回避）。advisory ⊆ lifecycle 不変条件を保持。
3. `scripts/harness/skill-quality/domain/services/skill-structure-validator.ts` — frontmatter の `kind:` を languageMetadata と同様にスキャンし、未宣言時は `lifecycle` を既定にして `SkillStructure.forKind(kind)` を使用。`getMissingSections` ロジックは変更なし。
4. `skills/<7 スキル>/SKILL.md` の frontmatter に `kind: advisory` を追記（セクション捏造は行わない）。
5. 実コーパス適合統合テスト（新規） — 実 `FileSystemSkillFileReaderAdapter` で全 30 スキルが宣言 kind の必須構造に適合することを検証（`@ac H12-06-AC-2` / `@ac H12-06-AC-3`）。

## 検証

- 全 30 スキルが宣言 kind の必須構造に適合する実コーパステストが green。
- lifecycle 23 スキルが 7 セクション全保有（anti-gutting）、advisory 7 スキルが 3 セット合格。
- kind 未宣言スキルは lifecycle 扱いで executionFlow 欠落なら不合格（fail-closed guard）。
- L2（L2-STORY-REFLECTION 含む）/ L3 / lint green。

## スコープ外

- 3 kind 目以降の追加、他 Unit のコード変更、防御プリセット / architecture preset の変更。
