# シナリオテストロジック: H13-01 — CI/CDテンプレート
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20

## 1. テスト構造（AAAパターン）

### SC-H13-01-001: aidlc-gateテンプレートをstandardプリセットで生成できること

```typescript
describe('GenerateCiTemplateUseCase', () => {
  describe('有効なtemplateTypeとpresetIdが渡された場合', () => {
    it('triggerCondition=pull_requestのCiTemplateが生成されること', async () => {
      // Arrange
      const context = {
        presetConfigPort: {
          getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }),
        },
        validatorIdRegistryPort: {
          listAll: vi.fn().mockResolvedValue(['v1', 'v2']),
        },
        templateRendererPort: {
          render: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', content: '...' }),
        },
      };
      const target = new GenerateCiTemplateUseCase(context);

      // Act
      const actual = await target.execute({ presetId: 'standard', templateType: 'aidlc-gate' });

      // Assert
      expect(actual.templateType).toBe('aidlc-gate');
      expect(actual.triggerCondition).toBe('pull_request');
      expect(actual.validationErrors).toHaveLength(0);
    });
  });
});
```

### SC-H13-01-004: 不正なtemplateTypeを入力した場合にエラーが返ること

```typescript
describe('不正なtemplateTypeが渡された場合', () => {
  it('HarnessError[]が返ること（INV-1違反）', async () => {
    // Arrange
    const context = {
      presetConfigPort: { getPreset: vi.fn() },
      validatorIdRegistryPort: { listAll: vi.fn().mockResolvedValue(['v1']) },
      templateRendererPort: { render: vi.fn() },
    };
    const target = new GenerateCiTemplateUseCase(context);

    // Act
    const actual = await target.execute({ presetId: 'standard', templateType: 'invalid' });

    // Assert
    expect(actual.validationErrors.length).toBeGreaterThan(0);
  });
});
```

### SC-H13-01-006: TemplateType×TriggerConditionの全3種マッピング（TemplateGeneratorユニットテスト）

```typescript
describe('TemplateGenerator', () => {
  describe('D6ルール: TemplateType×TriggerConditionマッピング', () => {
    it.each([
      ['aidlc-gate', 'pull_request'],
      ['consistency-check', 'schedule'],
      ['pre-commit', 'pre-commit'],
    ])('%sのtriggerConditionが%sであること', async (templateType, expectedTrigger) => {
      // Arrange
      const presetConfigPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
      const validatorIdRegistryPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
      const target = new TemplateGenerator({ presetConfigPort, validatorIdRegistryPort });

      // Act
      const actual = await target.generateConfig('standard', templateType as TemplateType);

      // Assert
      expect(actual.value?.triggerCondition).toBe(expectedTrigger);
    });
  });
});
```

## 2. モック戦略

| ポート | モック方針 |
|--------|-----------|
| PresetConfigPort | `getPreset()` → `{ failOnWarning: false/true }` |
| ValidatorIdRegistryPort | `listAll()` → `['v1', 'v2']` または `[]`（INV-2テスト用） |
| TemplateRendererPort | `render()` → `{ outputPath: '...', content: '...' }` |

## 3. アサーション方針

- `actual.templateType` / `actual.triggerCondition` でD6マッピングを確認
- `actual.validationErrors` の length で成功/失敗を判定
- `--dry-run` 時はTemplateRendererPort.render()が呼ばれないことを `not.toHaveBeenCalled()` で確認
- Handler層: exitCode=0（正常）、exitCode=1（UseCase失敗）、exitCode=2（引数不正）
