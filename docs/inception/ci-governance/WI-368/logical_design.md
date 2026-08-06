---
traceability:
  initial_creation: true
work_item: WI-368
---

# WI-368 Logical Design（inception テンプレート実体化 + scaffold-inception）

<!-- @work-item-id WI-368 -->

Unit: `ci-governance`

> 3 WI 共通の設計は `docs/inception/ci-governance/WI-367/logical_design.md` を参照。
> 本文書は WI-368 固有部分を記述する。

## 1. スコープ

L2 の Level-1 フェーズゲートを塞ぐ文書のテンプレート実体化と scaffold 経路。

| kind | テンプレート | 書き込み先（既定 paths） |
|------|------------|------------------------|
| `product-overview-plan` | `product_overview_plan.template.md` | `{inceptionDocs}/_shared/product_overview_plan.md` |
| `product-overview` | `product_overview.template.md` | `dirname({designDocs})/product_overview.md` |
| `story-writer-plan` | `story_writer_plan.template.md` | `{inceptionDocs}/_shared/story_writer_plan.md` |
| `story-mapping-plan` | `story_mapping_plan.template.md` | `{inceptionDocs}/_shared/story_mapping_plan.md` |
| `unit-design-plan` | `unit_design_plan.template.md` | `{inceptionDocs}/_shared/unit_design_plan.md` |

### 非スコープ（段階投入）

`user_stories.md` / `user_story_mapping.md` / `units/{unit}_unit.md` /
`units/integration_contract.md` と unit スコープの plan 文書（Level-2 ゲート）。

## 2. なぜ `scaffold-design` の拡張ではないか

`DesignPhase` は `--unit` 必須を前提に `{designDocs}/{unit}/{file}` を解決する。
`_shared/*_plan.md` と product 直下の `product_overview.md` は unit 軸を持たないため、
同じ VO に混ぜると「unit 必須なのに unit を使わない phase」という不整合な
不変条件になる。書き込み先の解決規則が異なる以上、VO とコマンドを分離する。

## 3. コンポーネント

```
domain/value-objects/inception-doc-kind.ts          — 5 kind + relativeTargetPath(roots)
domain/ports/inception-template-repository-port.ts  — kind → テンプレート本文
domain/ports/inception-doc-writer-port.ts           — kind → 解決 / 存在 / 書き込み
application/usecases/scaffold-inception-usecase.ts  — dry-run / exists / force 分岐
application/dto/scaffold-inception-{input,output}.ts
infrastructure/adapters/file-system-inception-template-repository-adapter.ts
infrastructure/adapters/file-system-inception-doc-writer-adapter.ts
presentation/handlers/scaffold-inception-handler.ts — exit code 契約
```

`ScaffoldDesignUseCase` と同じ dry-run / alreadyExists / force の分岐を kind 軸で持つ。
`{{unit}}` プレースホルダ置換は行わない（unit 軸を持たないため）。

## 4. 不変条件: テンプレート = ゲート合格保証

plan テンプレートは `MarkdownPlanDocumentReader` の QA セクション検出パターン
（`/^##+\s*(?:\d+[.．]\s*)?Q[&＆]?A\b/m`）に一致する見出しを必ず含む。

**逆向きの不変条件も同時に持つ**: `[Answer]` の直後は空行のみとし、
`planningMode: "embedded-qa"` では scaffold 直後の文書が**通らない**。
`[Answer]` 直下にプレースホルダ文言（例: 「（人間が回答を記入）」）を置くと
`countAnswers` がそれを回答本文として数え、**テンプレートが人間の承認証跡を
偽造する**。実装時に実際にこの罠を踏んで検出した（IT-CG-RT-005 が回帰を防ぐ）。

## 5. 影響範囲

| 対象 | 影響 |
|------|------|
| `main.ts` | `case "scaffold-inception"` 追加、usage / HELP_TEXTS 追記 |
| `known-harness-commands.ts` | `scaffold-inception` をソート順で追加 |
| `templates/` | 5 テンプレート追加（integrity pin 対象外） |
| `skills/{product-architect,story-writer,story-mapper,unit-designer}/SKILL.md` | 取得手段のポインタ追記 → **integrity:pin 必須** |
| `docs/guide/cli-reference.md` | Scaffold Inception 節を追加 |

## 6. Product Reflection Targets

- `docs/product/construction/ci-governance/logical_design.md`
- `docs/product/construction/ci-governance/domain_model.md`
- `docs/product/construction/harness-api/logical_design.md`
