# ITテストロジック計画: ci-governance
**作成日**: 2026-03-20

## 1. スコープ
- 対象: ci-governance unit
- テストパターン: AAAパターン、Vitest vi.fn() / vi.spyOn() によるポートモック、ファイルI/OはtmpDir内実ファイル

## 2. テストファイル構成

### ITテスト共通パターン

```typescript
describe('{UseCase/Adapter名}', () => {
  describe('{正常系/異常系/統合フロー}', () => {
    it('{期待動作の日本語説明}', async () => {
      // Arrange
      const context = {
        portA: { method: vi.fn().mockResolvedValue(/* モック戻り値 */) },
        portB: { method: vi.fn().mockResolvedValue(/* モック戻り値 */) },
      };
      const target = new {UseCase}(context);

      // Act
      const actual = await target.execute(/* 入力DTO */);

      // Assert
      expect(actual.field).toBe(/* 期待値 */);
      expect(context.portA.method).toHaveBeenCalledWith(/* 期待引数 */);
    });
  });
});
```

### 主要ITテストロジック要点

| テスト対象 | 重点テストロジック |
|-----------|-----------------|
| ErrorRepetitionJsonRepository | tmpDirに実ファイルを作成してsave→findByCode往復テスト。スキーマ不正JSONでHarnessErrorをスロー |
| AgentsMdFileAdapter | tmpDir内AGENTS.mdのwrite→read往復テスト。`write()` が `{ before: N, after: M }` を返すことを確認 |
| LessonArtifactFileReaderAdapter | tmpDir/lessonsに `*.lesson.json` を配置してreadAll()テスト。lessonsディレクトリ不在で空配列 |
| MigrateAgentsMdUseCase | `dryRun=true` 時はAgentsMdPort.write()が呼ばれないことを `not.toHaveBeenCalled()` で確認 |
| 反復エラー検出統合フロー | stateful mock（ErrorRepetitionRepositoryPort）で3回連続記録→3回目でescalated=trueを追跡 |
| AGENTS.md移行統合フロー | Dead Pointer検出時はwrite()がスキップ。HarnessError.codeがDUPLICATE_LESSON_IDで型安全に伝播 |

### シードデータ

- ErrorRepetition用: `{ code: 'L1-001', occurrenceCount: 2, threshold: 3, escalated: false }` 形式のerror-history.json
- LessonArtifact用: `{ lessonId: 'UUID', source: 'story-implementor', content: '...', tags: ['best-practice'], timestamp: 'ISO8601' }` 形式の.lesson.json
- AGENTS.md用: 移行前20行以上のインライン記述ファイル（KPI 50%削減検証用）

## 3. QA
なし（遡及記録）
