# 論理設計: H03-05 WI frontmatter の L2 metadata validator 統合

@story-id H03-05
設計要素: `DesignDocumentPort.readWorkItemFrontmatter` (optional) + gateway 実装 + usecase 内での parse error → `L2-002` 変換。

- **対応ストーリー**: H03-05
- **対応 Issue**: ISSUE-026 (Phase A-3)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. 設計方針

### 1.1 port 拡張（optional member）

```ts
// scripts/harness/traceability-model/domain/ports/design-document-port.ts
export interface DesignDocumentPort {
  // ... 既存メンバー
  readWorkItemFrontmatter?(
    filePath: ProjectRelativePathLike,
  ): Promise<WorkItemFrontmatter | null>;
}
```

- **optional**（`?`）にする理由: 既存実装で readWorkItemFrontmatter を未実装のままでも TS コンパイルが通る（後方互換）
- 呼び出し側は `typeof port.readWorkItemFrontmatter === 'function'` で存在チェック

### 1.2 gateway 実装

```ts
// MarkdownDesignDocumentGateway（追加メソッド）
async readWorkItemFrontmatter(
  filePath: ProjectRelativePathLike,
): Promise<WorkItemFrontmatter | null> {
  const content = await this.getContent(filePath);
  return parseWorkItemFrontmatter(content);
}
```

- parser が throw する `WorkItemFrontmatterValidationError` はそのまま呼び出し側に伝播
- `getContent` で既存 cache を活用（`readStoryAnnotations` と同じ content source）

### 1.3 usecase 統合

```ts
// ValidateDesignStoryAnnotationsUseCase#execute 内
const baseErrors: TraceabilityHarnessError[] = [];
if (typeof this.designDocumentPort.readWorkItemFrontmatter === 'function') {
  try {
    await this.designDocumentPort.readWorkItemFrontmatter(filePath);
  } catch (error) {
    if (error instanceof WorkItemFrontmatterValidationError) {
      baseErrors.push({
        code: 'L2-002',
        severity: 'error',
        message: error.message,
        suggestion: 'frontmatter の id/type/severity/status 形式を確認してください',
        fix_example: '---\nid: WI-001\ntype: story\n---',
      });
    } else {
      throw error;
    }
  }
}

const storyResult = await this.validator.validateDesignDocument({...});
const mergedResult = baseErrors.length === 0
  ? storyResult
  : MetadataValidationResult.failure({
      errors: [...baseErrors, ...storyResult.errors],
      warnings: storyResult.warnings,
    });
```

- 既存の story-id 検証結果と merge
- parse 成功・frontmatter 不在（`null` 返却）は追加エラーを発生させない

## 2. 影響範囲

| ファイル | 変更種別 | 内容 |
|---------|--------|------|
| `domain/ports/design-document-port.ts` | 修正 | optional `readWorkItemFrontmatter` 追加 |
| `infrastructure/gateways/markdown-design-document-gateway.ts` | 修正 | `readWorkItemFrontmatter` 実装 |
| `application/usecases/validate-design-story-annotations-usecase.ts` | 修正 | 統合ロジック追加 |
| `__tests__/unit/traceability-model/validate-design-story-annotations-usecase.test.ts` | 修正 | UT-TM-WV04 追加 |
| `__tests__/integration/validator-system/adapters/markdown-design-document-adapter.test.ts` | 修正 | UT-TM-WV01〜WV03 追加（既存 IT 場所に寄せる） |

**影響外**:
- `parseWorkItemFrontmatter` 自体: 無変更
- `MetadataValidator`: 無変更（新エラー種別を発生させるのは usecase 側）
- 既存の storyId annotation 検証経路: 無変更
- `StoryReflectionChecker` / `@story-id` 処理: 無影響

## 3. テスト戦略

### Unit テスト（既存ファイルに追加）

- **UT-TM-WV04**: usecase が gateway の WI parse error を L2-002 として変換することを検証

### Integration テスト（既存ファイルに追加 or 新規）

- **UT-TM-WV01**: gateway が有効 frontmatter を読む
- **UT-TM-WV02**: gateway が frontmatter 不在で null を返す
- **UT-TM-WV03**: gateway が invalid frontmatter で throw する

tmp dir + writeFile で実 FS を使う（既存 integration test と同じパターン）。

## 4. 非機能要件

- 性能: 既存の `getContent` content cache を再利用、追加 I/O なし
- メモリ: WorkItemFrontmatter は小さな plain object、副作用なし
