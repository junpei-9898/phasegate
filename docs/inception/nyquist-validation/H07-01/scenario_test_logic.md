# シナリオテストロジック設計: H07-01

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-20
> **対応テストケース**: SC-NQ-01-001〜SC-NQ-01-007

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のAAAパターンテスト構造ヘルパー
- `vi.fn().mockResolvedValue(...)` — StoryRegistryPortのスタブ化
- `createStoryRegistryPort(validStoryIds)` — テスト内ローカルファクトリ

## 2. テストケース疑似コード

```typescript
// SC-NQ-01-001: 有効なmatrixデータ
target('MatrixValidationService', () => {
  describe('storyId整合性テスト', () => {
    // UT-MVS-001
    it('validStoryIds=["H07-01"] で rawData の storyId="H07-01" のとき passed=true', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-01', acMappings: [] }] };

      // Act
      const actual = await sut.validate(rawData);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.validatedData).not.toBeNull();
    });

    // SC-NQ-01-002: 未登録storyId
    // UT-MVS-002
    it('未登録storyId="H07-99" のとき passed=false、errors に未登録エラー含む', async () => {
      // Arrange
      const port = createStoryRegistryPort(['H07-01']);
      const sut = new MatrixValidationService({ storyRegistryPort: port });
      const rawData = { storyMappings: [{ storyId: 'H07-99', acMappings: [] }] };

      // Act
      const actual = await sut.validate(rawData);

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.errors).toHaveLength(1);
    });
  });
});

// SC-NQ-01-004: AC IDフォーマット違反
target('AcMapping', () => {
  it('AC IDが "invalid-format" のとき InvalidAcIdFormatError がthrowされる', () => {
    // Arrange + Act
    const actual = () => AcMapping.create({ acId: 'invalid-format', testReferences: [] });
    // Assert
    expect(actual).toThrow(InvalidAcIdFormatError);
  });
});

// SC-NQ-01-007: filePath空文字
target('TestReference', () => {
  it('filePathが空文字のとき EmptyFilePathError がthrowされる', () => {
    // Arrange + Act
    const actual = () => TestReference.create({ filePath: '', testType: 'unit' });
    // Assert
    expect(actual).toThrow(EmptyFilePathError);
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/matrix-validation-service.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/ac-mapping.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/test-reference.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/
```
