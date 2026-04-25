# シナリオテストロジック: H13-02 — 反復エラー自動エスカレーション
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H13-02-002: 3回目でescalated=trueになること

```typescript
describe('RecordErrorOccurrenceUseCase', () => {
  describe('同一エラーコードが閾値（3回）に到達した場合', () => {
    it('escalated=trueとEscalationActionが返ること', async () => {
      // Arrange
      const existingRepetition = ErrorRepetition.create('L1-001', 3);
      existingRepetition.increment();
      existingRepetition.increment(); // occurrenceCount=2

      const context = {
        errorRepetitionRepositoryPort: {
          findByCode: vi.fn().mockResolvedValue(existingRepetition),
          save: vi.fn().mockResolvedValue(undefined),
        },
        escalationExecutorPort: {
          execute: vi.fn().mockResolvedValue(undefined),
        },
      };
      const target = new RecordErrorOccurrenceUseCase(context);

      // Act
      const actual = await target.execute({ errorCode: 'L1-001', errorMessage: 'test error' });

      // Assert
      expect(actual.currentCount).toBe(3);
      expect(actual.escalated).toBe(true);
      expect(actual.escalationAction).not.toBeNull();
    });
  });
});
```

### SC-H13-02-004: escalated=trueのエラーをリセットできること

```typescript
describe('ResetRepetitionUseCase', () => {
  describe('escalated=trueかつconfirmedResolution=trueの場合', () => {
    it('リセットが成功してerrors=[]が返ること', async () => {
      // Arrange
      const escalatedRepetition = ErrorRepetition.create('L1-001', 3);
      // 3回incrementしてescalated=true状態を再現
      escalatedRepetition.increment();
      escalatedRepetition.increment();
      escalatedRepetition.increment();

      const context = {
        errorRepetitionRepositoryPort: {
          findByCode: vi.fn().mockResolvedValue(escalatedRepetition),
          save: vi.fn().mockResolvedValue(undefined),
        },
      };
      const target = new ResetRepetitionUseCase(context);

      // Act
      const actual = await target.execute({ errorCode: 'L1-001', confirmedResolution: true });

      // Assert
      expect(actual.success).toBe(true);
      expect(actual.errors).toHaveLength(0);
    });
  });
});
```

### SC-H13-02-007: ErrorRepetitionJsonRepository save→findByCode往復テスト（ファイルI/O）

```typescript
describe('ErrorRepetitionJsonRepository', () => {
  describe('save()後にfindByCode()で取得できること', () => {
    it('同一occurrenceCount/escalatedが返ること', async () => {
      // Arrange
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-governance-test-'));
      const target = new ErrorRepetitionJsonRepository(path.join(tmpDir, 'error-history.json'));
      const repetition = ErrorRepetition.create('L1-001', 3);
      repetition.increment();
      repetition.increment();
      repetition.increment(); // escalated=true

      // Act
      await target.save(repetition);
      const actual = await target.findByCode('L1-001');

      // Assert
      expect(actual?.occurrenceCount).toBe(3);
      expect(actual?.isEscalated()).toBe(true);
    });
  });
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| ErrorRepetitionRepositoryPort | `findByCode()` → null（初回）または既存インスタンス（N回目）; `save()` → void |
| EscalationExecutorPort | `execute()` → void（呼び出し確認のみ） |

### Stateful Mock（統合フローテスト用）

```typescript
// 状態を保持するモック（3回連続記録テスト用）
let storedRepetition: ErrorRepetition | null = null;
const statefulRepoMock = {
  findByCode: vi.fn().mockImplementation(async () => storedRepetition),
  save: vi.fn().mockImplementation(async (rep: ErrorRepetition) => { storedRepetition = rep; }),
};
```

## 3. アサーション方針

- `actual.escalated` で閾値到達を確認
- `actual.escalationAction` の非null/null でエスカレーション発動を確認
- `escalationExecutorPort.execute()` の呼び出し確認（escalated=true時のみ）
- reset後の再記録でoccurrenceCount=1から開始することを確認
- Handler層: exitCode=0（存在・成功）、exitCode=1（存在しない・エラー）
