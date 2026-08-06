---
traceability:
  initial_creation: true
work_item: WI-367
---

# WI-367 / WI-368 / WI-369 Logical Design

<!-- @work-item-id WI-367, WI-368, WI-369 -->

## Scope

Unit: `ci-governance`（CLI dispatch のみ `harness-api` / `main.ts` に触れる）

GitHub issue #42 の 3 項目を 1 本の CLI サーフェス拡張として設計する。

| WI | 内容 |
|----|------|
| WI-367 | `templates list` / `templates show <name>` 新設 |
| WI-368 | inception plan テンプレート実体化 + `scaffold-inception` 新設 |
| WI-369 | `scaffold-design` の `paths.designDocs` 配線修正 |

---

## 1. ドメインモデル

### 1.1 `TemplateName`（値オブジェクト・新規）

テンプレート識別子。**ファイルパスではない**。

- 不変条件: `/^[a-z0-9][a-z0-9_-]*$/` に一致すること
- 拒否: 空文字 / `/` / `\` / `.` / `..` / 大文字 / 先頭記号
- 役割: path traversal の第一防壁。ただし**最終防壁ではない**
  （最終防壁は catalog readdir との完全一致照合）

### 1.2 `TemplateCatalogEntry`（値オブジェクト・新規）

`templates/` 配下に実在する 1 テンプレートの記述子。

| 属性 | 意味 |
|------|------|
| `name` | `TemplateName`（`<name>.template.<ext>` から導出） |
| `fileName` | readdir が返した実ファイル名 |

`show` の解決は「catalog に `name` 一致するエントリを探し、その `fileName` を
`templatesDir` に join する」形に限定する。ユーザー入力文字列が
パス構成要素になることは無い。

### 1.3 `InceptionDocKind`（値オブジェクト・新規）

scaffold 可能な inception / product 文書の種別。`DesignPhase` と同型。

| kind | テンプレート | 書き込み先（既定 paths） |
|------|------------|------------------------|
| `product-overview-plan` | `product_overview_plan.template.md` | `docs/inception/_shared/product_overview_plan.md` |
| `story-writer-plan` | `story_writer_plan.template.md` | `docs/inception/_shared/story_writer_plan.md` |
| `story-mapping-plan` | `story_mapping_plan.template.md` | `docs/inception/_shared/story_mapping_plan.md` |
| `unit-design-plan` | `unit_design_plan.template.md` | `docs/inception/_shared/unit_design_plan.md` |
| `product-overview` | `product_overview.template.md` | `docs/product/product_overview.md` |

書き込み先の解決規則:

- `_shared/*_plan.md` → `{inceptionDocs}/_shared/<file>`
- `product_overview.md` → `dirname({designDocs})/product_overview.md`
  （`STANDARD_PHASE_NODES` の `{designDocsRoot}/../product_overview.md` と同一規則）

### 1.4 不変条件（テンプレート ↔ ゲートの整合）

**plan テンプレートは QA セクション見出しを必ず含む。**

`MarkdownPlanDocumentReader` の `QA_SECTION_PATTERN`
（`/^##+\s*(?:\d+[.．]\s*)?Q[&＆]?A\b/m`）に一致する見出しを持たない plan
テンプレートは、planning mode `interactive` の evidence 判定を満たせず
「テンプレート = ゲート合格保証」が破れる。現行 construction 5 テンプレートが
`## QA` を持たない問題を再生産しないため、本 WI のテンプレートは
ラウンドトリップテストで機械検証する。

---

## 2. ポート / アダプタ

| ポート（domain） | アダプタ（infrastructure） | 責務 |
|-----------------|--------------------------|------|
| `TemplateCatalogPort` | `FileSystemTemplateCatalogAdapter` | `templates/` の readdir と本文読取 |
| `InceptionTemplateRepositoryPort` | `FileSystemInceptionTemplateRepositoryAdapter` | kind → テンプレート本文 |
| `InceptionDocWriterPort` | `FileSystemInceptionDocWriterAdapter` | kind → 書き込み先解決 / 存在判定 / 書き込み |

`FileSystemTemplateCatalogAdapter` は `harnessRoot` 基準。
`FileSystemInceptionDocWriterAdapter` は `baseDir` + 解決済み paths 基準。

---

## 3. ユースケース

### UC-001: テンプレート一覧（WI-367）

**As a** consumer プロジェクトのエージェント
**I want to** node_modules を Read せずに利用可能テンプレートを知りたい
**So that** 設計文書の雛形を正規手段で入手できる

- 事前条件: `harnessRoot/templates/` が存在する
- 基本フロー: catalog を readdir → name 昇順で stdout 出力
- 例外: ディレクトリ不在 → 空一覧 + 案内メッセージ（exit 0）

### UC-002: テンプレート表示（WI-367）

- 事前条件: `<name>` が catalog に存在する
- 基本フロー: catalog 照合 → 本文を stdout へそのまま出力（exit 0）
- 例外:
  - name 未指定 → usage + exit 2
  - `TemplateName` 不正（`../etc/passwd` 等）→ exit 2、パスは表示しない
  - catalog 不一致 → exit 2、利用可能な name 一覧を stderr に案内

### UC-003: inception 文書 scaffold（WI-368）

- 事前条件: kind が既知、テンプレートが存在する
- 基本フロー: dry-run は書き込み先とテンプレパスを提示（exit 0） →
  `--apply` で書き込み（exit 0）
- 例外:
  - 既存ファイル + `--force` 無し → exit 2（`scaffold-design` と同契約）
  - `--dry-run` と `--apply` の同時指定 → exit 2
  - 未知 kind → exit 2、許容値一覧を提示

### UC-004: scaffold-design の paths 追従（WI-369）

- `buildCiGovernance(baseDir, harnessRoot, paths?)` に解決済み paths を渡す
- `paths.designDocs` 未設定時は既定 `docs/product/construction` を維持（後方互換）

---

## 4. 層構成（Clean Architecture）

```
ci-governance/
  domain/value-objects/template-name.ts              (新規)
  domain/value-objects/template-catalog-entry.ts     (新規)
  domain/value-objects/inception-doc-kind.ts         (新規)
  domain/ports/template-catalog-port.ts              (新規)
  domain/ports/inception-template-repository-port.ts (新規)
  domain/ports/inception-doc-writer-port.ts          (新規)
  application/usecases/list-templates-usecase.ts     (新規)
  application/usecases/show-template-usecase.ts      (新規)
  application/usecases/scaffold-inception-usecase.ts (新規)
  application/dto/scaffold-inception-input.ts        (新規)
  application/dto/scaffold-inception-output.ts       (新規)
  infrastructure/adapters/file-system-template-catalog-adapter.ts              (新規)
  infrastructure/adapters/file-system-inception-template-repository-adapter.ts (新規)
  infrastructure/adapters/file-system-inception-doc-writer-adapter.ts          (新規)
  presentation/handlers/templates-handler.ts         (新規)
  presentation/handlers/scaffold-inception-handler.ts(新規)
  composition-root.ts                                (変更: paths 引数 + 新 handler)
```

`main.ts` は `case "templates"` / `case "scaffold-inception"` を追加し、
`known-harness-commands.ts` にソート順で 2 件追加する。

---

## 5. 影響範囲

| 対象 | 影響 |
|------|------|
| `main.ts` | dispatch に 2 case 追加、usage / HELP_TEXTS 追記 |
| `known-harness-commands.ts` | `scaffold-inception` / `templates` を追加（conformance テストが強制） |
| `composition-root.ts`（ci-governance） | 第 3 引数 `paths` を追加（省略時は現行動作） |
| `templates/` | plan/overview テンプレート 5 本を追加（integrity pin 対象外） |
| `skills/*/SKILL.md` | 4 スキルに取得手段のポインタを追記 → **integrity:pin 必須** |
| `docs/guide/cli-reference.md` | 新コマンド 2 件を追記 |

既存コマンドの契約変更は無い（純粋な追加 + `scaffold-design` の書き込み先修正のみ）。

---

## 6. Product Reflection Targets

実装後、以下へ `@work-item-id WI-367, WI-368, WI-369` を反映する。

- `docs/product/construction/ci-governance/logical_design.md`
- `docs/product/construction/ci-governance/domain_model.md`
