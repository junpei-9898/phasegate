# ユニットテストロジック計画: ci-governance
**作成日**: 2026-03-20

## 1. スコープ
- 対象: ci-governance unit
- テストパターン: AAAパターン（Arrange/Act/Assert）、日本語テスト名、`actual` 変数

## 2. テストファイル構成

### VO・集約テストの共通パターン

各テストファイルは以下の構造を採用:

```typescript
describe('{クラス名}', () => {
  describe('{正常/異常/境界値}系', () => {
    it('{期待動作の日本語説明}', () => {
      // Arrange
      const context = { /* 依存ポートモック */ };
      const target = {クラス名}.create(/* 入力 */);

      // Act
      const actual = target.{メソッド}(/* 引数 */);

      // Assert
      expect(actual).{マッチャー};
    });
  });
});
```

### 主要テストロジック要点

| テスト対象 | 重点テストロジック |
|-----------|-----------------|
| TemplateConfig | `targetValidatorIds=[]` でエラーをスロー（INV-2）。`equals()` が順序非依存で比較 |
| EscalationAction | `formatMessage()` でテンプレートのプレースホルダー置換（`{errorCode}`, `{count}`）を検証 |
| CiTemplate | `withConfig()` 後に `isConfigured()=true`。`withConfig()` は新インスタンスを返す（イミュータブル） |
| ErrorRepetition | `increment()` 3回でescalated=true（threshold=3）。`reset()` はescalated=trueかつresetOnResolution=true時のみ |
| AgentsMdPointer | `addPointer()` で同一keyは `CiGovernanceDomainError`（INV-8）。`replacePointer()` は存在しないkeyを新規追加 |
| TemplateGenerator | TemplateType×TriggerConditionマッピング: aidlc-gate→pull_request、consistency-check→schedule、pre-commit→pre-commit（D6ルール） |
| RepetitionDetector | stateful mock（ErrorRepetitionRepositoryPort）でoccurrenceCount状態遷移を追跡 |
| LessonAggregator | ポート依存なし（VO変換のみ）。同一lessonId重複でResult.fail(DUPLICATE_LESSON_ID) |

## 3. QA
なし（遡及記録）
