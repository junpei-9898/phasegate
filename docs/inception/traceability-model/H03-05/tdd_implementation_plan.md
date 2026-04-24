# TDD 実装計画: H03-05 WI frontmatter の L2 metadata validator 統合

@story-id H03-05
設計要素: H03-04 で追加した `parseWorkItemFrontmatter` を既存の設計文書メタデータ検証経路へ接続し、invalid WI frontmatter を `L2-002` として commit 前に検出する。

- **対応ストーリー**: H03-05
- **対応 Issue**: ISSUE-026 (Phase A-3)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. スコープ

### 1.1 対象ストーリー受け入れ基準

- `DesignDocumentPort` が optional `readWorkItemFrontmatter(filePath)` を提供できる
- `MarkdownDesignDocumentGateway` が設計文書 content cache を再利用して WI frontmatter を読める
- `ValidateDesignStoryAnnotationsUseCase` が WI frontmatter parse error を `MetadataValidationOutput.errors` の `L2-002` に変換する
- frontmatter 不在、または valid frontmatter の文書は既存 `@story-id` 検証結果だけで判定される

### 1.2 非対象

- WI frontmatter の存在強制
- WI type ごとの required artifact 判定
- `status: drafted/reflected` の自動更新
- `docs/inception/_cross` レイアウトと `affects` に基づく gate 判定

## 2. 影響する層

| 層 | 影響 | 変更ファイル |
|---|------|------------|
| domain | あり | `scripts/harness/traceability-model/domain/ports/design-document-port.ts` |
| application | あり | `scripts/harness/traceability-model/application/usecases/validate-design-story-annotations-usecase.ts` |
| infrastructure | あり | `scripts/harness/traceability-model/infrastructure/gateways/markdown-design-document-gateway.ts` |
| presentation | なし | - |
| テスト | あり | `scripts/harness/__tests__/unit/traceability-model/markdown-design-document-gateway.test.ts`, `validate-design-story-annotations-usecase.test.ts` |

## 3. TDD 実装順序

### Step 3.1 Gateway テスト RED

ファイル: `scripts/harness/__tests__/unit/traceability-model/markdown-design-document-gateway.test.ts`

- **UT-TM-WV01**: valid frontmatter を `WorkItemFrontmatter` として返す
- **UT-TM-WV02**: frontmatter 不在なら `null` を返す
- **UT-TM-WV03**: invalid frontmatter なら `WorkItemFrontmatterValidationError` を throw する

### Step 3.2 Usecase テスト RED

ファイル: `scripts/harness/__tests__/unit/traceability-model/validate-design-story-annotations-usecase.test.ts`

- **UT-TM-WV04**: `readWorkItemFrontmatter` が `WorkItemFrontmatterValidationError` を throw した場合、usecase は `L2-002` error を返し、既存 story annotation validation の結果と merge する

### Step 3.3 実装 GREEN

- `DesignDocumentPort` に optional `readWorkItemFrontmatter` を追加
- `MarkdownDesignDocumentGateway` に `readWorkItemFrontmatter` を追加し、`parseWorkItemFrontmatter` に委譲
- `ValidateDesignStoryAnnotationsUseCase` で optional method がある場合のみ呼び出す
- `WorkItemFrontmatterValidationError` だけを `L2-002` に変換し、それ以外は既存通り `DesignDocumentReadApplicationError` に包む

### Step 3.4 REFACTOR

- 既存 `readFrontmatterFlags` / `readStoryAnnotations` の順序と意味を変えない
- `readWorkItemFrontmatter` 未実装 port でも後方互換を保つ
- `MetadataValidator` には責務を増やさず、parser error の transport 変換のみ usecase で行う

## 4. 回帰確認

```bash
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/traceability-model/markdown-design-document-gateway.test.ts scripts/harness/__tests__/unit/traceability-model/validate-design-story-annotations-usecase.test.ts
pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/traceability-model/work-item-frontmatter-parser.test.ts
pnpm harness:status
```
