# ITテストロジック設計: harness-error

## 1. テストファイル構成
| ファイルパス | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/harness-error/__tests__/application/usecases/create-harness-error-usecase.test.ts` | CreateHarnessErrorUseCase | 8 |
| `scripts/harness/harness-error/__tests__/application/usecases/normalize-validator-errors-usecase.test.ts` | NormalizeValidatorErrorsUseCase | 10 |
| `scripts/harness/harness-error/__tests__/application/usecases/validate-fix-example-usecase.test.ts` | ValidateFixExampleUseCase | 8 |
| `scripts/harness/harness-error/__tests__/application/usecases/validate-all-fix-examples-usecase.test.ts` | ValidateAllFixExamplesUseCase | 8 |
| `scripts/harness/harness-error/__tests__/application/usecases/assert-severity-contract-usecase.test.ts` | AssertSeverityContractUseCase | 6 |
| `scripts/harness/harness-error/__tests__/application/usecases/list-error-definitions-usecase.test.ts` | ListErrorDefinitionsUseCase | 6 |
| `scripts/harness/harness-error/__tests__/application/mappers/harness-error-contract-mapper.test.ts` | HarnessErrorContractMapper | 4 |
| `scripts/harness/harness-error/__tests__/infrastructure/adapters/file-system-adr-existence-checker-adapter.test.ts` | FileSystemAdrExistenceCheckerAdapter | 6 |
| `scripts/harness/harness-error/__tests__/infrastructure/adapters/type-script-snippet-syntax-adapter.test.ts` | TypeScriptSnippetSyntaxAdapter | 6 |
| `scripts/harness/harness-error/__tests__/infrastructure/adapters/validator-execution-fix-example-validator-adapter.test.ts` | ValidatorExecutionFixExampleValidatorAdapter | 8 |
| `scripts/harness/harness-error/__tests__/infrastructure/adapters/validator-registry-bridge-adapter.test.ts` | ValidatorRegistryBridgeAdapter | 4 |
| `scripts/harness/harness-error/__tests__/infrastructure/adapters/legacy-error-reporter-adapter.test.ts` | LegacyErrorReporterAdapter | 8 |
| `scripts/harness/harness-error/__tests__/infrastructure/registry/build-error-definition-registry.test.ts` | buildErrorDefinitionRegistry | 6 |
| `scripts/harness/harness-error/__tests__/presentation/handlers/render-harness-errors-handler.test.ts` | RenderHarnessErrorsHandler | 8 |
| `scripts/harness/harness-error/__tests__/presentation/handlers/validate-fix-example-handler.test.ts` | ValidateFixExampleHandler | 6 |
| `scripts/harness/harness-error/__tests__/presentation/handlers/list-error-definitions-handler.test.ts` | ListErrorDefinitionsHandler | 5 |
| `scripts/harness/harness-error/__tests__/presentation/handlers/assert-severity-contract-handler.test.ts` | AssertSeverityContractHandler | 5 |
| `scripts/harness/harness-error/__tests__/presentation/formatters/human-harness-error-formatter.test.ts` | HumanHarnessErrorFormatter | 4 |
| `scripts/harness/harness-error/__tests__/presentation/formatters/agent-harness-error-formatter.test.ts` | AgentHarnessErrorFormatter | 4 |
| `scripts/harness/harness-error/__tests__/presentation/formatters/ci-harness-error-formatter.test.ts` | CiHarnessErrorFormatter | 4 |
| `scripts/harness/harness-error/__tests__/shared-kernel/harness-error-contract.test.ts` | isHarnessError / HarnessErrorContract / shared-kernel再エクスポート | 12 |

## 2. テストヘルパー・シードデータ
### 2.1 共通ヘルパー
- `createTestRegistry()`: `test-l1-definitions.ts` から `test-l4-definitions.ts` を束ねて最小 `ErrorDefinitionRegistry` 実体を返す。
- `buildCreateHarnessErrorInput(overrides?)`: `CreateHarnessErrorInput` の正常系初期値を返す。
- `buildValidatorIssueDraft(overrides?)`: `ValidatorIssueDraft` の代表値を返す。
- `buildValidateFixResult(overrides?)`: `ValidateFixExampleOutput` の handler 用ダミー出力を返す。
- `createTmpAdrFixture(files)`: 一時ディレクトリに `docs/ADR/` を作成し、ADR fixture を配置して返す。
- `createTmpJsonInput(payload)`: handler の `--input` 用 JSON ファイルを一時生成して返す。
- `captureOutput(run)`: `stdout` / `stderr` / `exitCode` を取得する。
- `expectReadonly(value)`: `Object.isFrozen(value)` と書き換え失敗を確認する補助関数。

### 2.2 Port / 外部境界のテストダブル
- `adrExistenceCheckerStub`: `vi.fn<(adrRef: AdrRef) => Promise<boolean>>()`
- `fixExampleValidatorStub`: `vi.fn<(input) => Promise<FixExampleValidationResult>>()`
- `validateFixExampleUseCaseMock`: `vi.fn()`
- `validateAllFixExamplesUseCaseMock`: `vi.fn()`
- `listErrorDefinitionsUseCaseMock`: `vi.fn()`
- `assertSeverityContractUseCaseMock`: `vi.fn()`

### 2.3 fixture / seed
- `__tests__/fixtures/adr/ADR-001.md`: frontmatter `adr_id: "001"` を持つ正常ADR。
- `__tests__/fixtures/adr/ADR-999-invalid-frontmatter.md`: ファイル名と frontmatter を意図的に不一致化したADR。
- `__tests__/fixtures/snippets/*.ts`: 単一文、複数文、関数定義、構文エラー、閉じ括弧不足、空文字の入力源。
- `__tests__/fixtures/legacy-errors/legacy-error-samples.ts`: 旧 `error-reporter.ts` 構造の代表サンプル。
- `__tests__/fixtures/error-definitions/test-l{1..4}-definitions.ts`: registry / usecase で共通利用する最小定義。
- `__tests__/fixtures/render-input/*.json`: handler の入力 JSON。

### 2.4 共通セットアップ擬似コード
```ts
function createApplicationDeps() {
  const registry = createTestRegistry();
  const adrExistenceCheckerStub = {
    exists: vi.fn().mockResolvedValue(true),
  };
  const fixExampleValidatorStub = {
    validate: vi.fn().mockResolvedValue(
      FixExampleValidationResult.success(),
    ),
  };

  const harnessErrorFactory = new HarnessErrorFactory({
    errorDefinitionRegistry: registry,
    adrExistenceChecker: adrExistenceCheckerStub,
    fixExampleValidator: fixExampleValidatorStub,
  });

  const contractMapper = new HarnessErrorContractMapper();
  const createHarnessErrorUseCase = new CreateHarnessErrorUseCase({
    harnessErrorFactory,
    contractMapper,
  });

  return {
    registry,
    adrExistenceCheckerStub,
    fixExampleValidatorStub,
    contractMapper,
    createHarnessErrorUseCase,
  };
}
```

## 3. UseCase統合テスト詳細ロジック
### 3.1 CreateHarnessErrorUseCase
```ts
target('CreateHarnessErrorUseCase.execute', () => {
  describe('単一draftをHarnessErrorContractへ変換する', () => {
    context('登録済みcodeと必須項目が妥当な場合', () => {
      // IT-HE-001
      it('有効な入力からHarnessErrorContractが生成される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput();

        // Act
        const actual = await createHarnessErrorUseCase.execute(input);

        // Assert
        expect(actual).toMatchObject({
          code: input.code,
          severity: 'error',
          message: input.message,
          suggestion: input.suggestion,
        });
      });

      // IT-HE-002
      it('生成されたDTOのcodeがstring型で返される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput();

        // Act
        const actual = await createHarnessErrorUseCase.execute(input);

        // Assert
        expect(typeof actual.code).toBe('string');
      });

      // IT-HE-003
      it('生成されたDTOのseverityが正しく投影される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput({ severity: 'warning', code: 'L1-002' });

        // Act
        const actual = await createHarnessErrorUseCase.execute(input);

        // Assert
        expect(actual.severity).toBe('warning');
      });

      // IT-HE-004
      it('生成されたDTOがObject.freeze済みのreadonlyである', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput();

        // Act
        const actual = await createHarnessErrorUseCase.execute(input);

        // Assert
        expectReadonly(actual);
      });
    });

    context('adrRefが指定される場合', () => {
      // IT-HE-005
      it('adrRef付きの入力からadr_refフィールドを含むDTOが返される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput({ adrRef: 'ADR-001' });

        // Act
        const actual = await createHarnessErrorUseCase.execute(input);

        // Assert
        expect(actual.adr_ref).toBe('ADR-001');
      });
    });

    context('fixExampleが指定される場合', () => {
      // IT-HE-006
      it('fixExample付きの入力からfix_exampleフィールドを含むDTOが返される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput({ fixExample: 'const fixed = true;' });

        // Act
        const actual = await createHarnessErrorUseCase.execute(input);

        // Assert
        expect(actual.fix_example).toBe('const fixed = true;');
      });
    });

    context('codeが正規形式ではない場合', () => {
      // IT-HE-007
      it('不正なcode文字列が渡された場合にドメインエラーが伝播する', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput({ code: 'L2-PHASE-GATE' });

        // Act
        const actual = createHarnessErrorUseCase.execute(input);

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });
    });

    context('定義severityの格下げを要求する場合', () => {
      // IT-HE-008
      it('severity格下げが渡された場合にドメインエラーが伝播する', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const input = buildCreateHarnessErrorInput({
          code: 'L1-001',
          severity: 'warning',
        });

        // Act
        const actual = createHarnessErrorUseCase.execute(input);

        // Assert
        await expect(actual).rejects.toThrow(SeverityDowngradeViolationError);
      });
    });
  });
});
```

### 3.2 NormalizeValidatorErrorsUseCase
```ts
target('NormalizeValidatorErrorsUseCase.execute', () => {
  describe('複数draftを一括正規化する', () => {
    context('全draftが正常に変換できる場合', () => {
      // IT-HE-009
      it('複数のValidatorIssueDraftが全てHarnessErrorContractに変換される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L2-010' }),
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L4-001' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.errors).toHaveLength(3);
      });

      // IT-HE-010
      it('結果がcode昇順でソートされる', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L4-001' }),
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L2-010' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.errors.map((error) => error.code)).toEqual([
          'L1-001',
          'L2-010',
          'L4-001',
        ]);
      });

      // IT-HE-011
      it('同一code内の順序が入力順で安定ソートされる', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001', message: '先頭' }),
          buildValidatorIssueDraft({ code: 'L1-001', message: '後続' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.errors.map((error) => error.message)).toEqual(['先頭', '後続']);
      });

      // IT-HE-012
      it('summaryのtotalが入力件数と一致する', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L1-002' }),
          buildValidatorIssueDraft({ code: 'L2-010' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.summary.total).toBe(3);
      });

      // IT-HE-013
      it('summaryのerrors/warningsがseverityごとに正しく集計される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001', severity: 'error' }),
          buildValidatorIssueDraft({ code: 'L1-002', severity: 'warning' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'warning' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.summary).toMatchObject({ total: 3, errors: 1, warnings: 2 });
      });

      // IT-HE-014
      it('結果がreadonly配列で返される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [buildValidatorIssueDraft({ code: 'L1-001' })];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expectReadonly(actual.errors);
      });

      // IT-HE-018
      it('error/warning混在のdraftリストでsummaryが正しく計算される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001', severity: 'error' }),
          buildValidatorIssueDraft({ code: 'L1-002', severity: 'warning' }),
          buildValidatorIssueDraft({ code: 'L2-010', severity: 'error' }),
          buildValidatorIssueDraft({ code: 'L4-001', severity: 'warning' }),
        ];

        // Act
        const actual = await sut.execute(drafts);

        // Assert
        expect(actual.summary).toMatchObject({ total: 4, errors: 2, warnings: 2 });
      });
    });

    context('入力が空配列の場合', () => {
      // IT-HE-015
      it('空の入力配列に対して空結果とゼロサマリーが返される', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });

        // Act
        const actual = await sut.execute([]);

        // Assert
        expect(actual).toMatchObject({
          errors: [],
          summary: { total: 0, errors: 0, warnings: 0 },
        });
      });
    });

    context('いずれかのdraft変換が失敗する場合', () => {
      // IT-HE-016
      it('1件のdraft変換失敗で全体が失敗する（部分成功なし）', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'INVALID' }),
          buildValidatorIssueDraft({ code: 'L2-010' }),
        ];

        // Act
        const actual = sut.execute(drafts);

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });

      // IT-HE-017
      it('先頭のdraftが正常で後続のdraftが異常の場合に全体が失敗する', async () => {
        // Arrange
        const { createHarnessErrorUseCase } = createApplicationDeps();
        const sut = new NormalizeValidatorErrorsUseCase({ createHarnessErrorUseCase });
        const drafts = [
          buildValidatorIssueDraft({ code: 'L1-001' }),
          buildValidatorIssueDraft({ code: 'L2-PHASE-GATE' }),
        ];

        // Act
        const actual = sut.execute(drafts);

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });
    });
  });
});
```

### 3.3 ValidateFixExampleUseCase
```ts
target('ValidateFixExampleUseCase.execute', () => {
  describe('単一定義のfix_exampleを検証する', () => {
    context('overrideFixExampleが指定される場合', () => {
      // IT-HE-019
      it('overrideFixExampleが指定された場合、それを使って検証される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = await sut.execute({
          code: 'L1-001',
          overrideFixExample: 'const overrideFix = true;',
        });

        // Assert
        expect(fixExampleValidatorStub.validate).toHaveBeenCalledWith(
          expect.objectContaining({
            validatorId: 'phase-gate',
            fixExample: expect.objectContaining({ value: 'const overrideFix = true;' }),
          }),
        );
        expect(actual.code).toBe('L1-001');
      });
    });

    context('overrideFixExampleが指定されない場合', () => {
      // IT-HE-020
      it('overrideFixExample未指定時にdefaultFixExampleが使用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = await sut.execute({ code: 'L1-001' });

        // Assert
        expect(fixExampleValidatorStub.validate).toHaveBeenCalledWith(
          expect.objectContaining({
            fixExample: expect.objectContaining({ value: registry.getDefinition(ErrorCode.create('L1-001')).defaultFixExample?.toString() }),
          }),
        );
        expect(actual.code).toBe('L1-001');
      });
    });

    context('validator検証が成功する場合', () => {
      // IT-HE-021
      it('検証成功時にpassed=trueの出力が返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = await sut.execute({ code: 'L1-001' });

        // Assert
        expect(actual.passed).toBe(true);
      });
    });

    context('validator検証が失敗する場合', () => {
      // IT-HE-022
      it('検証失敗時にpassed=falseとdiagnosticsが返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(
            FixExampleValidationResult.failure({
              reason: 'still failing',
              diagnostics: ['still failing'],
            }),
          ),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = await sut.execute({ code: 'L1-001' });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.diagnostics.length).toBeGreaterThanOrEqual(1);
      });
    });

    context('出力へ定義メタデータを投影する場合', () => {
      // IT-HE-023
      it('出力のvalidatorIdが定義のownerValidatorIdと一致する', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const definition = registry.getDefinition(ErrorCode.create('L1-001'));

        // Act
        const actual = await sut.execute({ code: 'L1-001' });

        // Assert
        expect(actual.validatorId).toBe(definition.ownerValidatorId);
      });
    });

    context('codeが未登録の場合', () => {
      // IT-HE-024
      it('未登録コードが指定された場合にUnknownErrorDefinitionErrorをthrowする', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = { validate: vi.fn() };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = sut.execute({ code: 'L1-999' });

        // Assert
        await expect(actual).rejects.toThrow(UnknownErrorDefinitionError);
      });
    });

    context('fix_exampleを解決できない場合', () => {
      // IT-HE-025
      it('fix_exampleが解決できない場合にMissingFixExampleErrorをthrowする', async () => {
        // Arrange
        const registry = createRegistryWithoutDefaultFixExample('L3-001');
        const fixExampleValidatorStub = { validate: vi.fn() };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = sut.execute({ code: 'L3-001' });

        // Assert
        await expect(actual).rejects.toThrow(MissingFixExampleError);
      });
    });

    context('Port実行自体が失敗する場合', () => {
      // IT-HE-026
      it('FixExampleValidatorPortの実行エラーが伝播する', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockRejectedValue(new Error('validator crashed')),
        };
        const sut = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });

        // Act
        const actual = sut.execute({ code: 'L1-001' });

        // Assert
        await expect(actual).rejects.toThrow('validator crashed');
      });
    });
  });
});
```

### 3.4 ValidateAllFixExamplesUseCase
```ts
target('ValidateAllFixExamplesUseCase.execute', () => {
  describe('複数定義のfix_exampleを一括検証する', () => {
    context('フィルタなしで全件処理する場合', () => {
      // IT-HE-027
      it('全定義のfix_exampleが一括検証される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual.results).toHaveLength(registry.getAllDefinitions().length);
      });

      // IT-HE-031
      it('failFast=falseの場合、全件検証される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi
            .fn()
            .mockResolvedValueOnce(FixExampleValidationResult.failure({ reason: 'first fail', diagnostics: ['first fail'] }))
            .mockResolvedValue(FixExampleValidationResult.success()),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({ failFast: false });

        // Assert
        expect(actual.results).toHaveLength(registry.getAllDefinitions().length);
      });

      // IT-HE-032
      it('summaryのtotal/passed/failedが正しく集計される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi
            .fn()
            .mockResolvedValueOnce(FixExampleValidationResult.success())
            .mockResolvedValueOnce(FixExampleValidationResult.failure({ reason: 'fail', diagnostics: ['fail'] }))
            .mockResolvedValue(FixExampleValidationResult.success()),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({ failFast: false });

        // Assert
        expect(actual.summary).toMatchObject({
          total: actual.results.length,
          passed: actual.results.filter((result) => result.passed).length,
          failed: actual.results.filter((result) => !result.passed).length,
        });
      });
    });

    context('layerフィルタを指定する場合', () => {
      // IT-HE-028
      it('layerフィルタが適用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({ layer: 'L1' });

        // Assert
        expect(actual.results.every((result) => result.code.startsWith('L1-'))).toBe(true);
      });
    });

    context('validatorIdフィルタを指定する場合', () => {
      // IT-HE-029
      it('validatorIdフィルタが適用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockResolvedValue(FixExampleValidationResult.success()),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({ validatorId: 'phase-gate' });

        // Assert
        expect(actual.results.every((result) => result.validatorId === 'phase-gate')).toBe(true);
      });
    });

    context('failFast=trueの場合', () => {
      // IT-HE-030
      it('failFast=trueの場合、最初の失敗で打ち切られる', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi
            .fn()
            .mockResolvedValueOnce(FixExampleValidationResult.success())
            .mockResolvedValueOnce(FixExampleValidationResult.failure({ reason: 'first fail', diagnostics: ['first fail'] }))
            .mockResolvedValue(FixExampleValidationResult.success()),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({ failFast: true });

        // Assert
        expect(actual.results.some((result) => result.passed === false)).toBe(true);
        expect(actual.results.length).toBeLessThan(registry.getAllDefinitions().length);
      });
    });

    context('フィルタ条件に一致する定義がない場合', () => {
      // IT-HE-033
      it('フィルタ条件に一致する定義がない場合にtotal=0で返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = { validate: vi.fn() };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = await sut.execute({ validatorId: 'unknown-validator' });

        // Assert
        expect(actual.summary).toMatchObject({ total: 0, passed: 0, failed: 0 });
      });
    });

    context('単体検証で例外が発生する場合', () => {
      // IT-HE-034
      it('単体検証で例外が発生した場合にその例外が伝播する', async () => {
        // Arrange
        const registry = createTestRegistry();
        const fixExampleValidatorStub = {
          validate: vi.fn().mockRejectedValue(new Error('bridge exploded')),
        };
        const validateFixExampleUseCase = new ValidateFixExampleUseCase({
          errorDefinitionRegistry: registry,
          fixExampleValidator: fixExampleValidatorStub,
        });
        const sut = new ValidateAllFixExamplesUseCase({
          errorDefinitionRegistry: registry,
          validateFixExampleUseCase,
        });

        // Act
        const actual = sut.execute({});

        // Assert
        await expect(actual).rejects.toThrow('bridge exploded');
      });
    });
  });
});
```

### 3.5 AssertSeverityContractUseCase
```ts
target('AssertSeverityContractUseCase.execute', () => {
  describe('severity契約を検証する', () => {
    context('格上げまたは同値要求の場合', () => {
      // IT-HE-035
      it('格上げ（warning→error）が許容されeffectiveSeverityがerrorで返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: registry,
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = await sut.execute({
          code: 'L1-002',
          requestedSeverity: 'error',
        });

        // Assert
        expect(actual.effectiveSeverity).toBe('error');
      });

      // IT-HE-036
      it('同一severity（error→error）が許容される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: registry,
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = await sut.execute({
          code: 'L1-001',
          requestedSeverity: 'error',
        });

        // Assert
        expect(actual).toMatchObject({
          effectiveSeverity: 'error',
          violated: false,
        });
      });

      // IT-HE-037
      it('violated=falseが返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: registry,
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = await sut.execute({
          code: 'L1-001',
          requestedSeverity: 'error',
        });

        // Assert
        expect(actual.violated).toBe(false);
      });
    });

    context('格下げ要求の場合', () => {
      // IT-HE-038
      it('格下げ（error→warning）でSeverityDowngradeViolationErrorをthrowする', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: registry,
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = sut.execute({
          code: 'L1-001',
          requestedSeverity: 'warning',
        });

        // Assert
        await expect(actual).rejects.toThrow(SeverityDowngradeViolationError);
      });
    });

    context('定義を取得できない場合', () => {
      // IT-HE-039
      it('未登録コードでUnknownErrorDefinitionErrorをthrowする', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: registry,
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = sut.execute({
          code: 'L1-999',
          requestedSeverity: 'error',
        });

        // Assert
        await expect(actual).rejects.toThrow(UnknownErrorDefinitionError);
      });
    });

    context('code形式が不正な場合', () => {
      // IT-HE-040
      it('不正なcode文字列でInvalidErrorCodeErrorをthrowする', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new AssertSeverityContractUseCase({
          errorDefinitionRegistry: registry,
          severityContractEnforcer: new SeverityContractEnforcer(),
        });

        // Act
        const actual = sut.execute({
          code: 'L2-PHASE-GATE',
          requestedSeverity: 'error',
        });

        // Assert
        await expect(actual).rejects.toThrow(InvalidErrorCodeError);
      });
    });
  });
});
```

### 3.6 ListErrorDefinitionsUseCase
```ts
target('ListErrorDefinitionsUseCase.execute', () => {
  describe('error definitionカタログを列挙する', () => {
    context('フィルタなしの場合', () => {
      // IT-HE-041
      it('フィルタなしで全定義がErrorDefinitionSummaryとして返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new ListErrorDefinitionsUseCase({ errorDefinitionRegistry: registry });

        // Act
        const actual = await sut.execute({});

        // Assert
        expect(actual).toHaveLength(registry.getAllDefinitions().length);
      });
    });

    context('layerフィルタを指定する場合', () => {
      // IT-HE-042
      it('layerフィルタが適用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new ListErrorDefinitionsUseCase({ errorDefinitionRegistry: registry });

        // Act
        const actual = await sut.execute({ layer: 'L1' });

        // Assert
        expect(actual.every((definition) => definition.code.startsWith('L1-'))).toBe(true);
      });
    });

    context('validatorIdフィルタを指定する場合', () => {
      // IT-HE-043
      it('validatorIdフィルタが適用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new ListErrorDefinitionsUseCase({ errorDefinitionRegistry: registry });

        // Act
        const actual = await sut.execute({ validatorId: 'phase-gate' });

        // Assert
        expect(actual.every((definition) => definition.validatorId === 'phase-gate')).toBe(true);
      });
    });

    context('categoryフィルタを指定する場合', () => {
      // IT-HE-044
      it('categoryフィルタが適用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new ListErrorDefinitionsUseCase({ errorDefinitionRegistry: registry });

        // Act
        const actual = await sut.execute({ category: 'architecture' });

        // Assert
        expect(actual.every((definition) => definition.category === 'architecture')).toBe(true);
      });
    });

    context('一致する定義がない場合', () => {
      // IT-HE-045
      it('条件に一致する定義がない場合に空配列が返される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new ListErrorDefinitionsUseCase({ errorDefinitionRegistry: registry });

        // Act
        const actual = await sut.execute({ layer: 'L4', validatorId: 'phase-gate' });

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('複数フィルタを組み合わせる場合', () => {
      // IT-HE-046
      it('複数フィルタのAND条件が正しく適用される', async () => {
        // Arrange
        const registry = createTestRegistry();
        const sut = new ListErrorDefinitionsUseCase({ errorDefinitionRegistry: registry });

        // Act
        const actual = await sut.execute({
          layer: 'L1',
          validatorId: 'phase-gate',
        });

        // Assert
        expect(
          actual.every((definition) =>
            definition.code.startsWith('L1-') && definition.validatorId === 'phase-gate',
          ),
        ).toBe(true);
      });
    });
  });
});
```

### 3.7 HarnessErrorContractMapper
```ts
target('HarnessErrorContractMapper.toReadonlyContract', () => {
  describe('HarnessErrorを公開DTOへ投影する', () => {
    context('全フィールドを持つHarnessErrorの場合', () => {
      // IT-HE-047
      it('HarnessErrorからHarnessErrorContractへ全フィールドが正しく投影される', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({
          code: 'L1-001',
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
          adrRef: 'ADR-001',
          fixExample: 'const fixed = true;',
        });

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expect(actual).toEqual({
          code: 'L1-001',
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
          adr_ref: 'ADR-001',
          fix_example: 'const fixed = true;',
        });
      });
    });

    context('adrRefがnullの場合', () => {
      // IT-HE-048
      it('adrRef=nullの場合にadr_refフィールドが省略される', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({ adrRef: null });

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expect(actual.adr_ref).toBeUndefined();
      });
    });

    context('fixExampleがnullの場合', () => {
      // IT-HE-049
      it('fixExample=nullの場合にfix_exampleフィールドが省略される', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({ fixExample: null });

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expect(actual.fix_example).toBeUndefined();
      });
    });

    context('生成結果の不変性を担保する場合', () => {
      // IT-HE-050
      it('生成されたDTOがObject.freeze済みである', () => {
        // Arrange
        const sut = new HarnessErrorContractMapper();
        const harnessError = createHarnessErrorEntity({});

        // Act
        const actual = sut.toReadonlyContract(harnessError);

        // Assert
        expectReadonly(actual);
      });
    });
  });
});
```

## 4. Adapter統合テスト詳細ロジック
### 4.1 Infrastructure: FileSystemAdrExistenceCheckerAdapter
```ts
target('FileSystemAdrExistenceCheckerAdapter.exists', () => {
  describe('docs/ADR配下のADR存在有無を判定する', () => {
    context('ファイル名とfrontmatterが一致するADRが存在する場合', () => {
      // IT-HE-051
      it('docs/ADR/配下にファイル名一致するADRが存在する場合にtrueを返す', async () => {
        // Arrange
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '001' }]);
        const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

        // Act
        const actual = await sut.exists(AdrRef.create('ADR-001'));

        // Assert
        expect(actual).toBe(true);
      });

      // IT-HE-052
      it('ファイル名一致かつfrontmatterのadr_idが一致する場合にtrueを返す', async () => {
        // Arrange
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '001' }]);
        const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

        // Act
        const actual = await sut.exists(AdrRef.create('ADR-001'));

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('ファイル名は一致するがfrontmatterが一致しない場合', () => {
      // IT-HE-053
      it('ファイル名一致だがfrontmatterのadr_idが不一致の場合にfalseを返す', async () => {
        // Arrange
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '999' }]);
        const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

        // Act
        const actual = await sut.exists(AdrRef.create('ADR-001'));

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('対象ADRファイルが存在しない場合', () => {
      // IT-HE-054
      it('対象ADRファイルが存在しない場合にfalseを返す', async () => {
        // Arrange
        const tmpDir = createTmpAdrFixture([]);
        const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

        // Act
        const actual = await sut.exists(AdrRef.create('ADR-001'));

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('docs/ADRディレクトリ自体が存在しない場合', () => {
      // IT-HE-055
      it('docs/ADR/ディレクトリ自体が存在しない場合にfalseを返す', async () => {
        // Arrange
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-error-it-'));
        const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

        // Act
        const actual = await sut.exists(AdrRef.create('ADR-001'));

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('I/O例外が発生する場合', () => {
      // IT-HE-056
      it('I/Oエラー発生時にadapter例外を返す', async () => {
        // Arrange
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '001' }]);
        vi.spyOn(fsPromises, 'readFile').mockRejectedValueOnce(new Error('EIO'));
        const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

        // Act
        const actual = sut.exists(AdrRef.create('ADR-001'));

        // Assert
        await expect(actual).rejects.toThrow('EIO');
      });
    });
  });
});
```

### 4.2 Infrastructure: TypeScriptSnippetSyntaxAdapter
```ts
target('TypeScriptSnippetSyntaxAdapter.validate', () => {
  describe('TypeScriptコード片の構文妥当性を判定する', () => {
    context('構文的に正しいコード片の場合', () => {
      // IT-HE-057
      it('有効な単一文のTypeScriptコード片で構文正常と判定される', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();
        const snippet = loadSnippetFixture('valid-single-statement.ts');

        // Act
        const actual = sut.validate(snippet);

        // Assert
        expect(actual.valid).toBe(true);
      });

      // IT-HE-058
      it('有効な複数文のTypeScriptコード片で構文正常と判定される', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();
        const snippet = loadSnippetFixture('valid-multi-statement.ts');

        // Act
        const actual = sut.validate(snippet);

        // Assert
        expect(actual.valid).toBe(true);
      });

      // IT-HE-059
      it('関数定義を含むコード片で構文正常と判定される', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();
        const snippet = loadSnippetFixture('valid-function-definition.ts');

        // Act
        const actual = sut.validate(snippet);

        // Assert
        expect(actual.valid).toBe(true);
      });

      // IT-HE-062
      it('空文字列が渡された場合の挙動', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();

        // Act
        const actual = sut.validate('');

        // Assert
        expect(actual).toMatchObject({
          valid: true,
          diagnostics: [],
        });
      });
    });

    context('構文的に誤ったコード片の場合', () => {
      // IT-HE-060
      it('構文エラーを含むコード片で構文失敗と判定される', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();
        const snippet = loadSnippetFixture('invalid-syntax-error.ts');

        // Act
        const actual = sut.validate(snippet);

        // Assert
        expect(actual.valid).toBe(false);
        expect(actual.diagnostics.length).toBeGreaterThanOrEqual(1);
      });

      // IT-HE-061
      it('閉じ括弧不足のコード片で構文失敗と判定される', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();
        const snippet = loadSnippetFixture('invalid-unclosed-bracket.ts');

        // Act
        const actual = sut.validate(snippet);

        // Assert
        expect(actual.valid).toBe(false);
      });
    });
  });
});
```

### 4.3 Infrastructure: ValidatorExecutionFixExampleValidatorAdapter
```ts
target('ValidatorExecutionFixExampleValidatorAdapter.validate', () => {
  describe('fix_example適用後のvalidator再実行を検証する', () => {
    context('構文もvalidator再実行も成功する場合', () => {
      // IT-HE-063
      it('構文妥当かつvalidator通過でFixExampleValidationResult.success()が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createPassingStubValidator(),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual).toMatchObject({ passed: true, reason: null });
      });

      // IT-HE-066
      it('fix_example適用後に対象コードの違反が消失していることが検証される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createTransitionStubValidator({
            before: [{ code: 'L1-001' }],
            after: [],
          }),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual.passed).toBe(true);
      });

      // IT-HE-070
      it('deterministicなfixtureに対して結果が再現可能である', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createPassingStubValidator(),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });
        const input = {
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        };

        // Act
        const actual = await sut.validate(input);
        const actualAgain = await sut.validate(input);

        // Assert
        expect(actualAgain).toEqual(actual);
      });
    });

    context('構文が不正な場合', () => {
      // IT-HE-064
      it('構文不正の場合にfailure結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createPassingStubValidator(),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const broken = ;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.diagnostics.some((diagnostic) => diagnostic.includes('構文'))).toBe(true);
      });
    });

    context('validator再実行で違反が残る場合', () => {
      // IT-HE-065
      it('構文正常だがvalidator再実行で違反が残る場合にfailure結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createFailingStubValidator(['still failing']),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.reason).not.toBeNull();
      });

      // IT-HE-067
      it('diagnosticsに構文エラーとvalidator失敗の両方が記録される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createFailingStubValidator(['validator failed']),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const broken = ;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.diagnostics.length).toBeGreaterThanOrEqual(2);
      });

      // IT-HE-069
      it('validator再実行で他コードの警告が追加された場合にfailure結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = createStubValidatorBridge({
          'phase-gate': createAdditionalWarningStubValidator(['L1-099']),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
      });
    });

    context('validatorIdを解決できない場合', () => {
      // IT-HE-068
      it('未知のvalidatorIdが指定された場合のエラーハンドリング', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map(),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = sut.validate({
          validatorId: 'unknown-validator',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});
```

### 4.4 Infrastructure: ValidatorRegistryBridgeAdapter
```ts
target('ValidatorRegistryBridgeAdapter.resolve', () => {
  describe('validatorIdから既存validatorエントリポイントを解決する', () => {
    context('登録済みvalidatorIdを指定する場合', () => {
      // IT-HE-071
      it('harness-error Unit所有のエラー定義が参照するvalidatorIdからエントリポイントが解決される', () => {
        // Arrange
        const entrypoints = createValidatorEntrypointsFixture();
        const sut = new ValidatorRegistryBridgeAdapter({ entrypoints });

        // Act
        const actual = sut.resolve('phase-gate');

        // Assert
        expect(actual).toBeDefined();
      });

      // IT-HE-072
      it('harness-error Unit所有の全ownerValidatorIdがvalidator-entrypoints.tsに登録済みである', () => {
        // Arrange
        const registry = createTestRegistry();
        const entrypoints = createValidatorEntrypointsFixture();
        const sut = new ValidatorRegistryBridgeAdapter({ entrypoints });
        const validatorIds = [...new Set(registry.getAllDefinitions().map((definition) => definition.ownerValidatorId))];

        // Act
        const actual = validatorIds.map((validatorId) => sut.resolve(validatorId));

        // Assert
        expect(actual.every(Boolean)).toBe(true);
      });

      // IT-HE-074
      it('静的マップの内容がvalidator-entrypoints.tsと一致する', () => {
        // Arrange
        const entrypoints = createValidatorEntrypointsFixture();
        const sut = new ValidatorRegistryBridgeAdapter({ entrypoints });

        // Act
        const actual = sut.getRegisteredValidatorIds();

        // Assert
        expect(actual).toEqual([...entrypoints.keys()]);
      });
    });

    context('未登録validatorIdを指定する場合', () => {
      // IT-HE-073
      it('未知のvalidatorIdに対してエラーが返される', () => {
        // Arrange
        const entrypoints = createValidatorEntrypointsFixture();
        const sut = new ValidatorRegistryBridgeAdapter({ entrypoints });

        // Act
        const actual = () => sut.resolve('unknown-validator');

        // Assert
        expect(actual).toThrow();
      });
    });
  });
});
```

### 4.5 Infrastructure: LegacyErrorReporterAdapter
```ts
target('LegacyErrorReporterAdapter.toDraft', () => {
  describe('旧形式HarnessErrorをValidatorIssueDraftへ写像する', () => {
    context('旧形式サンプルを正規draftへ変換する場合', () => {
      // IT-HE-075
      it('旧形式のエラーオブジェクトがValidatorIssueDraftに変換される', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({});

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual).toMatchObject({
          code: legacyError.code,
          message: legacyError.message.short,
          suggestion: expect.any(String),
          validatorId: legacyError.metadata.validator,
        });
      });

      // IT-HE-076
      it('旧severity "info"がwarningにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({ severity: 'info' });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.severity).toBe('warning');
      });

      // IT-HE-077
      it('旧severity "error"がそのままerrorにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({ severity: 'error' });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.severity).toBe('error');
      });

      // IT-HE-078
      it('旧severity "warning"がそのままwarningにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({ severity: 'warning' });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.severity).toBe('warning');
      });

      // IT-HE-079
      it('旧message.shortがdraftのmessageにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({ message: { short: 'short message' } });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.message).toBe('short message');
      });

      // IT-HE-080
      it('旧resolution.fixSuggestionがdraftのsuggestionにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({
          resolution: { fixSuggestion: 'do this', docLinks: [] },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.suggestion).toContain('do this');
      });

      // IT-HE-081
      it('旧resolution.docLinksがsuggestionに圧縮される', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({
          resolution: {
            fixSuggestion: 'do this',
            docLinks: ['https://example.com/adr'],
          },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.suggestion).toContain('https://example.com/adr');
      });

      // IT-HE-082
      it('旧metadata.validatorがdraftのvalidatorIdにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = buildLegacyHarnessError({
          metadata: { validator: 'phase-gate' },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.validatorId).toBe('phase-gate');
      });
    });
  });
});
```

### 4.6 Infrastructure: buildErrorDefinitionRegistry
```ts
target('buildErrorDefinitionRegistry', () => {
  describe('静的定義群からErrorDefinitionRegistryを構築する', () => {
    context('定義群が整合している場合', () => {
      // IT-HE-083
      it('l1〜l4の定義ファイルから統合されたErrorDefinitionRegistryが構築される', () => {
        // Arrange
        const definitions = createAllLayerDefinitionFixtures();

        // Act
        const actual = buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual.getAllDefinitions().length).toBe(definitions.flat().length);
      });

      // IT-HE-087
      it('構築後のレジストリが全層の定義を含んでいる', () => {
        // Arrange
        const definitions = createAllLayerDefinitionFixtures();

        // Act
        const actual = buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual.findByLayer('L1').length).toBeGreaterThanOrEqual(1);
        expect(actual.findByLayer('L2').length).toBeGreaterThanOrEqual(1);
        expect(actual.findByLayer('L3').length).toBeGreaterThanOrEqual(1);
        expect(actual.findByLayer('L4').length).toBeGreaterThanOrEqual(1);
      });

      // IT-HE-088
      it('定義が空の場合にも正常にレジストリが構築される', () => {
        // Arrange
        const definitions = [];

        // Act
        const actual = buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual.getAllDefinitions()).toEqual([]);
      });
    });

    context('起動時検証に失敗する場合', () => {
      // IT-HE-084
      it('重複codeが検出された場合に起動時エラーをthrowする', () => {
        // Arrange
        const definitions = createDuplicatedCodeDefinitions();

        // Act
        const actual = () => buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrow();
      });

      // IT-HE-085
      it('欠落ADR（adrRefRequired=trueだがdefaultAdrRefがnull）が検出された場合にエラーをthrowする', () => {
        // Arrange
        const definitions = createMissingAdrDefinitions();

        // Act
        const actual = () => buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrow();
      });

      // IT-HE-086
      it('欠落defaultFixExample（fixExampleRequired=trueだがdefaultFixExampleがnull）が検出された場合にエラーをthrowする', () => {
        // Arrange
        const definitions = createMissingFixExampleDefinitions();

        // Act
        const actual = () => buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrow();
      });
    });
  });
});
```

### 4.7 Presentation: RenderHarnessErrorsHandler
```ts
target('RenderHarnessErrorsHandler.handle', () => {
  describe('HarnessErrorContract配列を指定形式で出力する', () => {
    context('有効な入力JSONを受け取る場合', () => {
      // IT-HE-089
      it('--format humanでhuman形式のテキストがstdoutに出力される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([buildHarnessErrorContract({ severity: 'error' })]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human', input: inputPath, failOnError: false }),
        );

        // Assert
        expect(actual.stdout).toContain('L1-001');
      });

      // IT-HE-090
      it('--format agentでagent形式のテキストがstdoutに出力される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([buildHarnessErrorContract({ fix_example: 'const fixed = true;' })]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'agent', input: inputPath, failOnError: false }),
        );

        // Assert
        expect(actual.stdout).toContain('const fixed = true;');
      });

      // IT-HE-091
      it('--format ciでCI annotation JSONがstdoutに出力される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([buildHarnessErrorContract({ severity: 'warning' })]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'ci', input: inputPath, failOnError: false }),
        );

        // Assert
        expect(() => JSON.parse(actual.stdout)).not.toThrow();
      });

      // IT-HE-092
      it('--fail-on-error指定かつerrorを含む場合に終了コード1が返される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([buildHarnessErrorContract({ severity: 'error' })]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human', input: inputPath, failOnError: true }),
        );

        // Assert
        expect(actual.exitCode).toBe(1);
      });

      // IT-HE-093
      it('--fail-on-error指定かつwarningのみの場合に終了コード0が返される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([buildHarnessErrorContract({ severity: 'warning' })]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human', input: inputPath, failOnError: true }),
        );

        // Assert
        expect(actual.exitCode).toBe(0);
      });

      // IT-HE-094
      it('--fail-on-error未指定の場合にerrorを含んでも終了コード0が返される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([buildHarnessErrorContract({ severity: 'error' })]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human', input: inputPath, failOnError: false }),
        );

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('入力JSONが不正な場合', () => {
      // IT-HE-095
      it('入力JSONがHarnessErrorContract[]として不正な場合に終了コード2が返される', async () => {
        // Arrange
        const inputPath = createTmpJsonInput([{ code: 'L1-001', severity: 'info' }]);
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human', input: inputPath, failOnError: false }),
        );

        // Assert
        expect(actual.exitCode).toBe(2);
      });

      // IT-HE-096
      it('JSON parse失敗時に終了コード2が返される', async () => {
        // Arrange
        const inputPath = createTmpBrokenJsonInput('{ broken');
        const sut = new RenderHarnessErrorsHandler({
          humanFormatter: new HumanHarnessErrorFormatter(),
          agentFormatter: new AgentHarnessErrorFormatter(),
          ciFormatter: new CiHarnessErrorFormatter(),
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human', input: inputPath, failOnError: false }),
        );

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
```

### 4.8 Presentation: ValidateFixExampleHandler
```ts
target('ValidateFixExampleHandler.handle', () => {
  describe('CLI引数に応じて単体検証と全件検証を切り替える', () => {
    context('--codeが指定される場合', () => {
      // IT-HE-097
      it('--code指定時に単一コード検証が実行される', async () => {
        // Arrange
        const validateFixExampleUseCaseMock = {
          execute: vi.fn().mockResolvedValue(buildValidateFixResult({ passed: true })),
        };
        const validateAllFixExamplesUseCaseMock = { execute: vi.fn() };
        const sut = new ValidateFixExampleHandler({
          validateFixExampleUseCase: validateFixExampleUseCaseMock,
          validateAllFixExamplesUseCase: validateAllFixExamplesUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', format: 'human' }),
        );

        // Assert
        expect(validateFixExampleUseCaseMock.execute).toHaveBeenCalledWith({
          code: 'L1-001',
          overrideFixExample: undefined,
        });
        expect(actual.exitCode).toBe(0);
      });
    });

    context('--codeが指定されない場合', () => {
      // IT-HE-098
      it('--code未指定時に全件検証が実行される', async () => {
        // Arrange
        const validateFixExampleUseCaseMock = { execute: vi.fn() };
        const validateAllFixExamplesUseCaseMock = {
          execute: vi.fn().mockResolvedValue({
            results: [buildValidateFixResult({ passed: true })],
            summary: { total: 1, passed: 1, failed: 0 },
          }),
        };
        const sut = new ValidateFixExampleHandler({
          validateFixExampleUseCase: validateFixExampleUseCaseMock,
          validateAllFixExamplesUseCase: validateAllFixExamplesUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ layer: 'L1', format: 'json' }),
        );

        // Assert
        expect(validateAllFixExamplesUseCaseMock.execute).toHaveBeenCalled();
        expect(actual.exitCode).toBe(0);
      });

      // IT-HE-099
      it('全件pass時に終了コード0が返される', async () => {
        // Arrange
        const sut = new ValidateFixExampleHandler({
          validateFixExampleUseCase: { execute: vi.fn() },
          validateAllFixExamplesUseCase: {
            execute: vi.fn().mockResolvedValue({
              results: [buildValidateFixResult({ passed: true })],
              summary: { total: 1, passed: 1, failed: 0 },
            }),
          },
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human' }),
        );

        // Assert
        expect(actual.exitCode).toBe(0);
      });

      // IT-HE-100
      it('1件以上失敗時に終了コード1が返される', async () => {
        // Arrange
        const sut = new ValidateFixExampleHandler({
          validateFixExampleUseCase: { execute: vi.fn() },
          validateAllFixExamplesUseCase: {
            execute: vi.fn().mockResolvedValue({
              results: [buildValidateFixResult({ passed: false, diagnostics: ['failed'] })],
              summary: { total: 1, passed: 0, failed: 1 },
            }),
          },
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'human' }),
        );

        // Assert
        expect(actual.exitCode).toBe(1);
      });

      // IT-HE-101
      it('--fail-fast指定時に最初の失敗で停止する', async () => {
        // Arrange
        const validateAllFixExamplesUseCaseMock = {
          execute: vi.fn().mockResolvedValue({
            results: [buildValidateFixResult({ passed: false })],
            summary: { total: 1, passed: 0, failed: 1 },
          }),
        };
        const sut = new ValidateFixExampleHandler({
          validateFixExampleUseCase: { execute: vi.fn() },
          validateAllFixExamplesUseCase: validateAllFixExamplesUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ failFast: true, format: 'human' }),
        );

        // Assert
        expect(validateAllFixExamplesUseCaseMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({ failFast: true }),
        );
        expect(actual.exitCode).toBe(1);
      });
    });

    context('実行環境エラーが発生する場合', () => {
      // IT-HE-102
      it('実行環境エラー時に終了コード2が返される', async () => {
        // Arrange
        const sut = new ValidateFixExampleHandler({
          validateFixExampleUseCase: { execute: vi.fn().mockRejectedValue(new Error('runtime')) },
          validateAllFixExamplesUseCase: { execute: vi.fn() },
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', format: 'human' }),
        );

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
```

### 4.9 Presentation: ListErrorDefinitionsHandler
```ts
target('ListErrorDefinitionsHandler.handle', () => {
  describe('定義一覧をtableまたはjsonで出力する', () => {
    context('定義が1件以上ヒットする場合', () => {
      // IT-HE-103
      it('フィルタなしで全定義がtable形式で出力される', async () => {
        // Arrange
        const listErrorDefinitionsUseCaseMock = {
          execute: vi.fn().mockResolvedValue([
            buildErrorDefinitionSummary({ code: 'L1-001' }),
            buildErrorDefinitionSummary({ code: 'L2-010' }),
          ]),
        };
        const sut = new ListErrorDefinitionsHandler({
          listErrorDefinitionsUseCase: listErrorDefinitionsUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'table' }),
        );

        // Assert
        expect(actual.stdout).toContain('L1-001');
      });

      // IT-HE-104
      it('--format jsonでJSON形式で出力される', async () => {
        // Arrange
        const listErrorDefinitionsUseCaseMock = {
          execute: vi.fn().mockResolvedValue([
            buildErrorDefinitionSummary({ code: 'L1-001' }),
          ]),
        };
        const sut = new ListErrorDefinitionsHandler({
          listErrorDefinitionsUseCase: listErrorDefinitionsUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'json' }),
        );

        // Assert
        expect(() => JSON.parse(actual.stdout)).not.toThrow();
      });

      // IT-HE-105
      it('1件以上ヒット時に終了コード0が返される', async () => {
        // Arrange
        const listErrorDefinitionsUseCaseMock = {
          execute: vi.fn().mockResolvedValue([buildErrorDefinitionSummary({ code: 'L1-001' })]),
        };
        const sut = new ListErrorDefinitionsHandler({
          listErrorDefinitionsUseCase: listErrorDefinitionsUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'table' }),
        );

        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    context('定義が0件の場合', () => {
      // IT-HE-106
      it('0件ヒット時に終了コード1が返される', async () => {
        // Arrange
        const listErrorDefinitionsUseCaseMock = {
          execute: vi.fn().mockResolvedValue([]),
        };
        const sut = new ListErrorDefinitionsHandler({
          listErrorDefinitionsUseCase: listErrorDefinitionsUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'table' }),
        );

        // Assert
        expect(actual.exitCode).toBe(1);
      });
    });

    context('UseCase呼び出しが失敗する場合', () => {
      // IT-HE-107
      it('実行エラー時に終了コード2が返される', async () => {
        // Arrange
        const listErrorDefinitionsUseCaseMock = {
          execute: vi.fn().mockRejectedValue(new Error('runtime')),
        };
        const sut = new ListErrorDefinitionsHandler({
          listErrorDefinitionsUseCase: listErrorDefinitionsUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ format: 'table' }),
        );

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
```

### 4.10 Presentation: AssertSeverityContractHandler
```ts
target('AssertSeverityContractHandler.handle', () => {
  describe('severity契約確認結果をtextまたはjsonで出力する', () => {
    context('契約順守の場合', () => {
      // IT-HE-108
      it('契約順守時にeffective severityが出力され終了コード0が返される', async () => {
        // Arrange
        const assertSeverityContractUseCaseMock = {
          execute: vi.fn().mockResolvedValue({
            code: 'L1-001',
            effectiveSeverity: 'error',
            violated: false,
          }),
        };
        const sut = new AssertSeverityContractHandler({
          assertSeverityContractUseCase: assertSeverityContractUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', requestedSeverity: 'error', format: 'text' }),
        );

        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout).toContain('error');
      });

      // IT-HE-110
      it('--format jsonでJSON形式の出力が返される', async () => {
        // Arrange
        const assertSeverityContractUseCaseMock = {
          execute: vi.fn().mockResolvedValue({
            code: 'L1-001',
            effectiveSeverity: 'error',
            violated: false,
          }),
        };
        const sut = new AssertSeverityContractHandler({
          assertSeverityContractUseCase: assertSeverityContractUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', requestedSeverity: 'error', format: 'json' }),
        );

        // Assert
        expect(() => JSON.parse(actual.stdout)).not.toThrow();
      });

      // IT-HE-111
      it('--format textでテキスト形式の出力が返される', async () => {
        // Arrange
        const assertSeverityContractUseCaseMock = {
          execute: vi.fn().mockResolvedValue({
            code: 'L1-001',
            effectiveSeverity: 'error',
            violated: false,
          }),
        };
        const sut = new AssertSeverityContractHandler({
          assertSeverityContractUseCase: assertSeverityContractUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', requestedSeverity: 'error', format: 'text' }),
        );

        // Assert
        expect(actual.stdout).toContain('L1-001');
      });
    });

    context('格下げ違反の場合', () => {
      // IT-HE-109
      it('格下げ違反時に違反内容が出力され終了コード1が返される', async () => {
        // Arrange
        const assertSeverityContractUseCaseMock = {
          execute: vi.fn().mockRejectedValue(
            new SeverityDowngradeViolationError({
              code: 'L1-001',
              definedSeverity: 'error',
              requestedSeverity: 'warning',
              adrRef: 'ADR-001',
            }),
          ),
        };
        const sut = new AssertSeverityContractHandler({
          assertSeverityContractUseCase: assertSeverityContractUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', requestedSeverity: 'warning', format: 'text' }),
        );

        // Assert
        expect(actual.exitCode).toBe(1);
        expect(actual.stdout).toContain('ADR-001');
      });
    });

    context('想定外エラーの場合', () => {
      // IT-HE-112
      it('実行エラー時に終了コード2が返される', async () => {
        // Arrange
        const assertSeverityContractUseCaseMock = {
          execute: vi.fn().mockRejectedValue(new Error('runtime')),
        };
        const sut = new AssertSeverityContractHandler({
          assertSeverityContractUseCase: assertSeverityContractUseCaseMock,
        });

        // Act
        const actual = await captureOutput(() =>
          sut.handle({ code: 'L1-001', requestedSeverity: 'error', format: 'text' }),
        );

        // Assert
        expect(actual.exitCode).toBe(2);
      });
    });
  });
});
```

### 4.11 Presentation: HumanHarnessErrorFormatter
```ts
target('HumanHarnessErrorFormatter.format', () => {
  describe('開発者向けテキストへ整形する', () => {
    context('複数エラーを整形する場合', () => {
      // IT-HE-113
      it('同一入力に対してdeterministicな文字列が返される', () => {
        // Arrange
        const sut = new HumanHarnessErrorFormatter();
        const input = [
          buildHarnessErrorContract({ code: 'L1-001', severity: 'error' }),
          buildHarnessErrorContract({ code: 'L1-002', severity: 'warning' }),
        ];

        // Act
        const actual = sut.format(input);
        const actualAgain = sut.format(input);

        // Assert
        expect(actualAgain).toBe(actual);
      });

      // IT-HE-114
      it('errorとwarningで視覚的に区別された出力が生成される', () => {
        // Arrange
        const sut = new HumanHarnessErrorFormatter();
        const input = [
          buildHarnessErrorContract({ code: 'L1-001', severity: 'error' }),
          buildHarnessErrorContract({ code: 'L1-002', severity: 'warning' }),
        ];

        // Act
        const actual = sut.format(input);

        // Assert
        expect(actual).toContain('error');
        expect(actual).toContain('warning');
      });

      // IT-HE-115
      it('adr_ref付きエラーでADR参照が含まれる', () => {
        // Arrange
        const sut = new HumanHarnessErrorFormatter();
        const input = [buildHarnessErrorContract({ adr_ref: 'ADR-001' })];

        // Act
        const actual = sut.format(input);

        // Assert
        expect(actual).toContain('ADR-001');
      });
    });

    context('入力が空配列の場合', () => {
      // IT-HE-116
      it('空配列入力で空文字列が返される', () => {
        // Arrange
        const sut = new HumanHarnessErrorFormatter();

        // Act
        const actual = sut.format([]);

        // Assert
        expect(actual).toBe('');
      });
    });
  });
});
```

### 4.12 Presentation: AgentHarnessErrorFormatter
```ts
target('AgentHarnessErrorFormatter.format', () => {
  describe('AIエージェント向け詳細テキストへ整形する', () => {
    context('詳細フィールドを含むエラーを整形する場合', () => {
      // IT-HE-117
      it('同一入力に対してdeterministicな文字列が返される', () => {
        // Arrange
        const sut = new AgentHarnessErrorFormatter();
        const input = [buildHarnessErrorContract({ fix_example: 'const fixed = true;' })];

        // Act
        const actual = sut.format(input);
        const actualAgain = sut.format(input);

        // Assert
        expect(actualAgain).toBe(actual);
      });

      // IT-HE-118
      it('fix_example付きエラーで修正コード例が含まれる', () => {
        // Arrange
        const sut = new AgentHarnessErrorFormatter();
        const input = [buildHarnessErrorContract({ fix_example: 'const fixed = true;' })];

        // Act
        const actual = sut.format(input);

        // Assert
        expect(actual).toContain('const fixed = true;');
      });

      // IT-HE-119
      it('suggestion付きエラーで修正方針が含まれる', () => {
        // Arrange
        const sut = new AgentHarnessErrorFormatter();
        const input = [buildHarnessErrorContract({ suggestion: '修正する' })];

        // Act
        const actual = sut.format(input);

        // Assert
        expect(actual).toContain('修正する');
      });
    });

    context('入力が空配列の場合', () => {
      // IT-HE-120
      it('空配列入力で空文字列が返される', () => {
        // Arrange
        const sut = new AgentHarnessErrorFormatter();

        // Act
        const actual = sut.format([]);

        // Assert
        expect(actual).toBe('');
      });
    });
  });
});
```

### 4.13 Presentation: CiHarnessErrorFormatter
```ts
target('CiHarnessErrorFormatter.format', () => {
  describe('GitHub annotation JSONへ整形する', () => {
    context('1件以上のエラーを整形する場合', () => {
      // IT-HE-121
      it('同一入力に対してdeterministicなJSON文字列が返される', () => {
        // Arrange
        const sut = new CiHarnessErrorFormatter();
        const input = [buildHarnessErrorContract({ severity: 'error' })];

        // Act
        const actual = sut.format(input);
        const actualAgain = sut.format(input);

        // Assert
        expect(actualAgain).toBe(actual);
      });

      // IT-HE-122
      it('GitHub annotation形式のJSON構造で出力される', () => {
        // Arrange
        const sut = new CiHarnessErrorFormatter();
        const input = [buildHarnessErrorContract({ severity: 'error' })];

        // Act
        const actual = sut.format(input);

        // Assert
        expect(JSON.parse(actual)).toEqual([
          expect.objectContaining({
            annotation_level: expect.any(String),
            message: expect.any(String),
          }),
        ]);
      });

      // IT-HE-123
      it('severityがannotation levelに正しくマップされる', () => {
        // Arrange
        const sut = new CiHarnessErrorFormatter();
        const input = [
          buildHarnessErrorContract({ code: 'L1-001', severity: 'error' }),
          buildHarnessErrorContract({ code: 'L1-002', severity: 'warning' }),
        ];

        // Act
        const actual = JSON.parse(sut.format(input));

        // Assert
        expect(actual[0].annotation_level).toBe('error');
        expect(actual[1].annotation_level).toBe('warning');
      });
    });

    context('入力が空配列の場合', () => {
      // IT-HE-124
      it('空配列入力で空JSON配列が返される', () => {
        // Arrange
        const sut = new CiHarnessErrorFormatter();

        // Act
        const actual = sut.format([]);

        // Assert
        expect(actual).toBe('[]');
      });
    });
  });
});
```

### 4.14 Shared Kernel: isHarnessError
```ts
target('isHarnessError', () => {
  describe('公開契約の型ガードを提供する', () => {
    context('必須・任意フィールドが正しい場合', () => {
      // IT-HE-125
      it('HarnessErrorContractの全必須フィールドを持つオブジェクトに対してtrueを返す', () => {
        // Arrange
        const input = {
          code: 'L1-001',
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
        };

        // Act
        const actual = isHarnessError(input);

        // Assert
        expect(actual).toBe(true);
      });

      // IT-HE-126
      it('adr_ref、fix_exampleのオプショナルフィールドを含むオブジェクトに対してtrueを返す', () => {
        // Arrange
        const input = {
          code: 'L1-001',
          severity: 'warning',
          message: 'message',
          suggestion: 'suggestion',
          adr_ref: 'ADR-001',
          fix_example: 'const fixed = true;',
        };

        // Act
        const actual = isHarnessError(input);

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('構造または値が不正な場合', () => {
      // IT-HE-127
      it('codeフィールドが欠落したオブジェクトに対してfalseを返す', () => {
        // Arrange
        const input = {
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
        };

        // Act
        const actual = isHarnessError(input);

        // Assert
        expect(actual).toBe(false);
      });

      // IT-HE-128
      it('severityが"error"/"warning"以外の値を持つオブジェクトに対してfalseを返す', () => {
        // Arrange
        const input = {
          code: 'L1-001',
          severity: 'info',
          message: 'message',
          suggestion: 'suggestion',
        };

        // Act
        const actual = isHarnessError(input);

        // Assert
        expect(actual).toBe(false);
      });

      // IT-HE-129
      it('nullやundefinedに対してfalseを返す', () => {
        // Arrange
        const input = null;

        // Act
        const actual = isHarnessError(input);

        // Assert
        expect(actual).toBe(false);
      });

      // IT-HE-130
      it('空オブジェクト{}に対してfalseを返す', () => {
        // Arrange
        const input = {};

        // Act
        const actual = isHarnessError(input);

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 4.15 Shared Kernel: HarnessErrorContract構造的一致性
```ts
target('HarnessErrorContract contract', () => {
  describe('integration_contract.md §2.1 と一致する', () => {
    context('公開インターフェースの型互換を確認する場合', () => {
      // IT-HE-131
      it('HarnessErrorContractがintegration_contract.md §2.1のHarnessErrorインターフェース定義と構造的に一致する', () => {
        // Arrange
        type Expected = {
          readonly code: string;
          readonly severity: 'error' | 'warning';
          readonly message: string;
          readonly suggestion: string;
          readonly adr_ref?: string;
          readonly fix_example?: string;
        };

        // Act
        const actual = true;

        // Assert
        expectTypeOf<HarnessErrorContract>().toMatchTypeOf<Expected>();
        expect(actual).toBe(true);
      });

      // IT-HE-132
      it('HarnessErrorContractの全フィールドがreadonly修飾されている', () => {
        // Arrange
        const input = Object.freeze({
          code: 'L1-001',
          severity: 'error',
          message: 'message',
          suggestion: 'suggestion',
        }) satisfies HarnessErrorContract;

        // Act
        const actual = () => {
          (input as { code: string }).code = 'L1-002';
        };

        // Assert
        expect(Object.isFrozen(input)).toBe(true);
        expect(actual).toThrow();
      });
    });
  });
});
```

### 4.16 Shared Kernel: shared-kernel再エクスポート
```ts
target('scripts/harness/shared-kernel/harness-error.ts', () => {
  describe('公開入口として必要な型と関数だけを再エクスポートする', () => {
    context('公開APIをimportする場合', () => {
      // IT-HE-133
      it('scripts/harness/shared-kernel/harness-error.tsからHarnessErrorContract型がimport可能である', async () => {
        // Arrange
        const modulePath = '../../shared-kernel/harness-error';

        // Act
        const actual = await import(modulePath);

        // Assert
        expectTypeOf<typeof actual>().toHaveProperty('isHarnessError');
      });

      // IT-HE-134
      it('scripts/harness/shared-kernel/harness-error.tsからHarnessErrorSeverity型がimport可能である', async () => {
        // Arrange
        type Actual = import('../../shared-kernel/harness-error').HarnessErrorSeverity;

        // Act
        const actual = true;

        // Assert
        expectTypeOf<Actual>().toEqualTypeOf<'error' | 'warning'>();
        expect(actual).toBe(true);
      });

      // IT-HE-135
      it('scripts/harness/shared-kernel/harness-error.tsからisHarnessError関数がimport可能である', async () => {
        // Arrange
        const modulePath = '../../shared-kernel/harness-error';

        // Act
        const actual = await import(modulePath);

        // Assert
        expect(typeof actual.isHarnessError).toBe('function');
      });
    });

    context('内部ディレクトリを公開しない場合', () => {
      // IT-HE-136
      it('harness-error内部ディレクトリの直接importが公開されていないことの確認', async () => {
        // Arrange
        const publicModule = await import('../../shared-kernel/harness-error');

        // Act
        const actual = 'domain' in publicModule || 'application' in publicModule || 'infrastructure' in publicModule;

        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

## 5. モック戦略
- UseCase統合テストは Domain 実体を使用する。`ErrorCode`、`Severity`、`HarnessError`、`ErrorDefinitionRegistry`、`SeverityContractEnforcer` はモック化しない。
- UseCase統合テストで差し替えるのは外部境界のみとし、`AdrExistenceCheckerPort` と `FixExampleValidatorPort` を `vi.fn` で制御する。本UnitにRepositoryは存在しないため、Repositoryモックは発生しない。
- Infrastructure統合テストは原則として実体を使用する。`fs` 一時ディレクトリ、実 `typescript`、stub validator fixture を使い、ADR adapter のI/O故障注入ケースのみ外部APIを `spyOn` する。
- Presentation統合テストは Handler の責務に限定し、UseCase を `vi.fn` でモックする。Formatter は実体を使い、`captureOutput()` で `stdout` / `stderr` / `exitCode` を検証する。
- Shared Kernel 契約テストはモック禁止とし、`expectTypeOf` と runtime assertion の両方で公開契約を固定化する。
- `vi.mock` の用途は外部API境界と CLI 実行環境の故障注入に限定し、ドメインロジックや値オブジェクトには使わない。

## 6. テスト実行コマンド
```bash
pnpm test
```

```bash
pnpm test -- scripts/harness/harness-error/__tests__/application/usecases
```

```bash
pnpm test -- scripts/harness/harness-error/__tests__/infrastructure
```

```bash
pnpm test -- scripts/harness/harness-error/__tests__/presentation
```

```bash
pnpm test -- scripts/harness/harness-error/__tests__/shared-kernel/harness-error-contract.test.ts
```
