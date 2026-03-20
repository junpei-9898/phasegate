# シナリオテストロジック: H13-03 — AGENTS.mdポインタ型移行
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H13-03-001: lesson artifactを読み取りAGENTS.mdへの移行が成功すること

```typescript
describe('MigrateAgentsMdUseCase', () => {
  describe('有効なlesson artifactと全PointerEntry実在の場合', () => {
    it('success=trueでaddedPointers=2・kpiMet=trueが返ること', async () => {
      // Arrange
      const artifacts: LessonArtifact[] = [
        { lessonId: '550e8400-e29b-41d4-a716-446655440001', source: 'story-implementor', content: 'Lesson 1', tags: ['best-practice'], timestamp: '2026-03-20T00:00:00Z' },
        { lessonId: '550e8400-e29b-41d4-a716-446655440002', source: 'domain-designer', content: 'Lesson 2', tags: ['anti-pattern'], timestamp: '2026-03-20T00:00:00Z' },
      ];
      const context = {
        lessonArtifactReaderPort: { readAll: vi.fn().mockResolvedValue(artifacts) },
        agentsMdPort: {
          read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
          write: vi.fn().mockResolvedValue({ before: 20, after: 8 }),
        },
        commandExistencePort: { exists: vi.fn().mockResolvedValue(true) },
        fileExistencePort: { exists: vi.fn().mockResolvedValue(true) },
        adrExistencePort: { exists: vi.fn().mockResolvedValue(true) },
      };
      const target = new MigrateAgentsMdUseCase(context);

      // Act
      const actual = await target.execute({ dryRun: false });

      // Assert
      expect(actual.success).toBe(true);
      expect(actual.addedPointers).toBe(2);
      expect(actual.kpiMet).toBe(true); // 8 <= 20 * 0.5 = 10
    });
  });
});
```

### SC-H13-03-002: dryRun=trueの場合はwrite()が呼ばれないこと

```typescript
describe('dryRun=trueが渡された場合', () => {
  it('AgentsMdPort.write()が呼び出されないこと', async () => {
    // Arrange
    const context = {
      lessonArtifactReaderPort: { readAll: vi.fn().mockResolvedValue([/* 1件 */]) },
      agentsMdPort: {
        read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
        write: vi.fn(),
      },
      commandExistencePort: { exists: vi.fn().mockResolvedValue(true) },
      fileExistencePort: { exists: vi.fn().mockResolvedValue(true) },
      adrExistencePort: { exists: vi.fn().mockResolvedValue(true) },
    };
    const target = new MigrateAgentsMdUseCase(context);

    // Act
    const actual = await target.execute({ dryRun: true });

    // Assert
    expect(actual.success).toBe(true);
    expect(context.agentsMdPort.write).not.toHaveBeenCalled();
  });
});
```

### SC-H13-03-005: 重複lessonIdで移行が中断されること

```typescript
describe('同一バッチ内に重複lessonIdがある場合', () => {
  it('success=falseでDUPLICATE_LESSON_IDエラーが返り、write()が呼ばれないこと', async () => {
    // Arrange
    const duplicateId = '550e8400-e29b-41d4-a716-446655440001';
    const artifacts: LessonArtifact[] = [
      { lessonId: duplicateId, source: 'story-implementor', content: 'Lesson 1', tags: ['best-practice'], timestamp: '2026-03-20T00:00:00Z' },
      { lessonId: duplicateId, source: 'domain-designer', content: 'Lesson 2 (duplicate)', tags: ['anti-pattern'], timestamp: '2026-03-20T00:00:01Z' },
    ];
    const context = {
      lessonArtifactReaderPort: { readAll: vi.fn().mockResolvedValue(artifacts) },
      agentsMdPort: { read: vi.fn(), write: vi.fn() },
      commandExistencePort: { exists: vi.fn() },
      fileExistencePort: { exists: vi.fn() },
      adrExistencePort: { exists: vi.fn() },
    };
    const target = new MigrateAgentsMdUseCase(context);

    // Act
    const actual = await target.execute({ dryRun: false });

    // Assert
    expect(actual.success).toBe(false);
    expect(actual.errors.some(e => e.code === 'DUPLICATE_LESSON_ID')).toBe(true);
    expect(context.agentsMdPort.write).not.toHaveBeenCalled();
  });
});
```

## 2. LessonAggregator ユニットテストロジック

```typescript
describe('LessonAggregator', () => {
  describe('aggregate()', () => {
    it('重複なしのLessonArtifact[]がPointerEntry[]に変換されること', () => {
      // Arrange
      const target = new LessonAggregator();
      const artifacts: LessonArtifact[] = [
        { lessonId: 'uuid-001', source: 'story-implementor', content: 'Lesson', tags: ['best-practice'], timestamp: '2026-03-20T00:00:00Z' },
      ];

      // Act
      const actual = target.aggregate(artifacts);

      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual.value).toHaveLength(1);
      expect(actual.value![0].key).toBe('lesson-uuid-001');
    });
  });
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| LessonArtifactReaderPort | `readAll()` → LessonArtifact[]（有効/重複含む） |
| AgentsMdPort | `read()` → 空AgentsMdPointer; `write()` → `{ before: N, after: M }` |
| CommandExistencePort | `exists()` → true/false |
| FileExistencePort | `exists()` → true/false |
| AdrExistencePort | `exists()` → true/false |

## 3. アサーション方針

- `actual.success` / `actual.errors` で成功/失敗を判定
- `actual.kpiMet` でKPI（行数50%以上削減）達成を確認: `linesAfter <= linesBefore * 0.5`
- `actual.addedPointers` で追加されたPointerEntry数を確認
- `agentsMdPort.write.not.toHaveBeenCalled()` でdryRun/エラー中断時のwrite()スキップを確認
- AgentsMdFileAdapterのファイルI/OテストはtmpDirを使用
