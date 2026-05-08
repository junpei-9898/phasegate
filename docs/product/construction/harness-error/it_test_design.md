# ITテスト設計: harness-error

@story-id H06-01
@story-id H06-02
@story-id H06-03
> **Unit ID**: harness-error
> **作成日**: 2026-03-13
> **正規ソース**: `docs/product/construction/harness-error/logical_design.md`
> **テスト規約参照**: `docs/principles/testing-rules.md`
> **Phase 1計画**: `docs/inception/harness-error/it_test_design_plan.md`

---

## 1. 対象コンポーネント

### テスト対象一覧

| 層 | コンポーネント | 実装ファイル | テストファイル |
|----|-------------|-------------|--------------|
| Application | CreateHarnessErrorUseCase | `application/usecases/create-harness-error-usecase.ts` | `create-harness-error-usecase.test.ts` |
| Application | NormalizeValidatorErrorsUseCase | `application/usecases/normalize-validator-errors-usecase.ts` | `normalize-validator-errors-usecase.test.ts` |
| Application | ValidateFixExampleUseCase | `application/usecases/validate-fix-example-usecase.ts` | `validate-fix-example-usecase.test.ts` |
| Application | ValidateAllFixExamplesUseCase | `application/usecases/validate-all-fix-examples-usecase.ts` | `validate-all-fix-examples-usecase.test.ts` |
| Application | AssertSeverityContractUseCase | `application/usecases/assert-severity-contract-usecase.ts` | `assert-severity-contract-usecase.test.ts` |
| Application | ListErrorDefinitionsUseCase | `application/usecases/list-error-definitions-usecase.ts` | `list-error-definitions-usecase.test.ts` |
| Application | HarnessErrorContractMapper | `application/mappers/harness-error-contract-mapper.ts` | `harness-error-contract-mapper.test.ts` |
| Infrastructure | FileSystemAdrExistenceCheckerAdapter | `infrastructure/adapters/file-system-adr-existence-checker-adapter.ts` | `file-system-adr-existence-checker-adapter.test.ts` |
| Infrastructure | TypeScriptSnippetSyntaxAdapter | `infrastructure/adapters/type-script-snippet-syntax-adapter.ts` | `type-script-snippet-syntax-adapter.test.ts` |
| Infrastructure | ValidatorExecutionFixExampleValidatorAdapter | `infrastructure/adapters/validator-execution-fix-example-validator-adapter.ts` | `validator-execution-fix-example-validator-adapter.test.ts` |
| Infrastructure | ValidatorRegistryBridgeAdapter | `infrastructure/adapters/validator-registry-bridge-adapter.ts` | `validator-registry-bridge-adapter.test.ts` |
| Infrastructure | LegacyErrorReporterAdapter | `infrastructure/adapters/legacy-error-reporter-adapter.ts` | `legacy-error-reporter-adapter.test.ts` |
| Infrastructure | buildErrorDefinitionRegistry | `infrastructure/registry/build-error-definition-registry.ts` | `build-error-definition-registry.test.ts` |
| Presentation | RenderHarnessErrorsHandler | `presentation/handlers/render-harness-errors-handler.ts` | `render-harness-errors-handler.test.ts` |
| Presentation | ValidateFixExampleHandler | `presentation/handlers/validate-fix-example-handler.ts` | `validate-fix-example-handler.test.ts` |
| Presentation | ListErrorDefinitionsHandler | `presentation/handlers/list-error-definitions-handler.ts` | `list-error-definitions-handler.test.ts` |
| Presentation | AssertSeverityContractHandler | `presentation/handlers/assert-severity-contract-handler.ts` | `assert-severity-contract-handler.test.ts` |
| Presentation | HumanHarnessErrorFormatter | `presentation/formatters/human-harness-error-formatter.ts` | `human-harness-error-formatter.test.ts` |
| Presentation | AgentHarnessErrorFormatter | `presentation/formatters/agent-harness-error-formatter.ts` | `agent-harness-error-formatter.test.ts` |
| Presentation | CiHarnessErrorFormatter | `presentation/formatters/ci-harness-error-formatter.ts` | `ci-harness-error-formatter.test.ts` |
| Shared Kernel | isHarnessError | `shared-kernel/harness-error.ts` | `harness-error-contract.test.ts` |
| Shared Kernel | HarnessErrorContract | `shared-kernel/harness-error.ts` | `harness-error-contract.test.ts` |
| Shared Kernel | shared-kernel再エクスポート | `shared-kernel/harness-error.ts` | `harness-error-contract.test.ts` |

### テスト方針サマリ

- **Application層**: Portのみモック使用可。Domain実体（値オブジェクト、ドメインサービス）はモック禁止
- **Infrastructure層**: 実ファイルシステム（一時ディレクトリ + cleanup）、実TypeScript Compiler API使用
- **Presentation層**: stdout/stderrキャプチャ、終了コード検証、Formatterはリテラル文字列一致（QA Q4）
- **Shared Kernel**: 契約テスト（`integration_contract.md` §2.1との構造的一致性検証）
- **全層共通**: AAAパターン、日本語テストケース名、Act結果は`actual`変数、`target`/`describe`/`context`/`it`構造

### テストケース合計

| 層 | ケース数 |
|----|---------|
| Application | 53 |
| Infrastructure | 38 |
| Presentation | 38 |
| Shared Kernel | 12 |
| 回帰テスト（受け入れ基準横断） | 5 |
| **合計** | **146** |

---

## 2. テストファイル構成

```
scripts/harness/__tests__/unit/harness-error/
├── fixtures/
│   ├── adr/                                    # ADR fixture（frontmatter付き）
│   │   ├── ADR-001.md                          # 正常ADR
│   │   └── ADR-999-invalid-frontmatter.md      # frontmatter不一致ADR
│   ├── snippets/                               # TypeScript構文fixture
│   │   ├── valid-single-statement.ts           # 単一文正常
│   │   ├── valid-multi-statement.ts            # 複数文正常
│   │   ├── valid-function-definition.ts        # 関数定義正常
│   │   ├── invalid-syntax-error.ts             # 構文エラー
│   │   └── invalid-unclosed-bracket.ts         # 閉じ括弧不足
│   ├── legacy-errors/                          # 旧形式エラーオブジェクト
│   │   └── legacy-error-samples.ts             # error-reporter.ts型に基づくサンプル
│   ├── error-definitions/                      # 最小テスト定義（QA Q5）
│   │   ├── test-l1-definitions.ts              # L1代表定義 1-2件
│   │   ├── test-l2-definitions.ts              # L2代表定義 1-2件
│   │   ├── test-l3-definitions.ts              # L3代表定義 1-2件
│   │   └── test-l4-definitions.ts              # L4代表定義 1-2件
│   └── render-input/                           # Handler入力用JSON
│       ├── valid-errors.json                   # 正常HarnessErrorContract[]
│       ├── mixed-severity-errors.json          # error/warning混在
│       └── invalid-schema.json                 # スキーマ不正JSON
├── application/
│   ├── usecases/
│   │   ├── create-harness-error-usecase.test.ts
│   │   ├── normalize-validator-errors-usecase.test.ts
│   │   ├── validate-fix-example-usecase.test.ts
│   │   ├── validate-all-fix-examples-usecase.test.ts
│   │   ├── assert-severity-contract-usecase.test.ts
│   │   └── list-error-definitions-usecase.test.ts
│   └── mappers/
│       └── harness-error-contract-mapper.test.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── file-system-adr-existence-checker-adapter.test.ts
│   │   ├── type-script-snippet-syntax-adapter.test.ts
│   │   ├── validator-execution-fix-example-validator-adapter.test.ts
│   │   ├── validator-registry-bridge-adapter.test.ts
│   │   └── legacy-error-reporter-adapter.test.ts
│   └── registry/
│       └── build-error-definition-registry.test.ts
├── presentation/
│   ├── handlers/
│   │   ├── render-harness-errors-handler.test.ts
│   │   ├── validate-fix-example-handler.test.ts
│   │   ├── list-error-definitions-handler.test.ts
│   │   └── assert-severity-contract-handler.test.ts
│   └── formatters/
│       ├── human-harness-error-formatter.test.ts
│       ├── agent-harness-error-formatter.test.ts
│       └── ci-harness-error-formatter.test.ts
├── shared-kernel/
│   └── harness-error-contract.test.ts
└── regression/
    └── acceptance-criteria-regression.test.ts
```

---

## 3. UseCaseテストケース (6 UseCases + 1 Mapper)

### 3.1 CreateHarnessErrorUseCase

**モック対象**: `HarnessErrorFactory`（内部でPort依存）をDI。Portレベルのモック（`AdrExistenceCheckerPort`, `FixExampleValidatorPort`）を間接的にFactory経由で注入する。Domain実体（`ErrorCode`, `Severity`, `HarnessError`等）はモック禁止。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-001 | 有効な入力からHarnessErrorContractが生成される | 正常系 | execute()の戻り値がHarnessErrorContract構造を持つ |
| IT-HE-002 | 生成されたDTOのcodeがstring型で返される | 正常系 | actual.codeがstring型である |
| IT-HE-003 | 生成されたDTOのseverityが正しく投影される | 正常系 | actual.severityが入力に対応した値である |
| IT-HE-004 | 生成されたDTOがObject.freeze済みのreadonlyである | 正常系 | Object.isFrozen(actual)がtrueである |
| IT-HE-005 | adrRef付きの入力からadr_refフィールドを含むDTOが返される | 正常系 | actual.adr_refが入力値と一致する |
| IT-HE-006 | fixExample付きの入力からfix_exampleフィールドを含むDTOが返される | 正常系 | actual.fix_exampleが入力値と一致する |
| IT-HE-007 | 不正なcode文字列が渡された場合にドメインエラーが伝播する | 異常系 | InvalidErrorCodeErrorがthrowされる |
| IT-HE-008 | severity格下げが渡された場合にドメインエラーが伝播する | 異常系 | SeverityDowngradeViolationErrorがthrowされる |

### 3.2 NormalizeValidatorErrorsUseCase

**モック対象**: `CreateHarnessErrorUseCase`が内部で使用するPortレベルのモック。UseCase間の依存は実体を使用する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-009 | 複数のValidatorIssueDraftが全てHarnessErrorContractに変換される | 正常系 | actual.errors.lengthが入力件数と一致する |
| IT-HE-010 | 結果がcode昇順でソートされる | 正常系 | actual.errorsがcode昇順で並んでいる |
| IT-HE-011 | 同一code内の順序が入力順で安定ソートされる | 正常系 | 同一codeの要素が入力順を維持している |
| IT-HE-012 | summaryのtotalが入力件数と一致する | 正常系 | actual.summary.totalが入力配列長と一致する |
| IT-HE-013 | summaryのerrors/warningsがseverityごとに正しく集計される | 正常系 | actual.summary.errors/warningsが期待値と一致する |
| IT-HE-014 | 結果がreadonly配列で返される | 正常系 | Object.isFrozen(actual.errors)がtrueである |
| IT-HE-015 | 空の入力配列に対して空結果とゼロサマリーが返される | 正常系（境界） | actual.errors.length===0かつsummary全フィールドが0 |
| IT-HE-016 | 1件のdraft変換失敗で全体が失敗する（部分成功なし） | 異常系 | 不正draftを含む入力で例外がthrowされる |
| IT-HE-017 | 先頭のdraftが正常で後続のdraftが異常の場合に全体が失敗する | 異常系 | 2件目以降の不正で全体が例外となる |
| IT-HE-018 | error/warning混在のdraftリストでsummaryが正しく計算される | 正常系 | errors/warnings各カウントが期待値と一致する |

### 3.3 ValidateFixExampleUseCase

**モック対象**: `FixExampleValidatorPort`。`ErrorDefinitionRegistry`は最小テスト定義fixtureで構築した実体を使用する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-019 | overrideFixExampleが指定された場合、それを使って検証される | 正常系 | モックPortに渡されたfixExampleがoverride値である |
| IT-HE-020 | overrideFixExample未指定時にdefaultFixExampleが使用される | 正常系 | モックPortに渡されたfixExampleが定義のdefault値である |
| IT-HE-021 | 検証成功時にpassed=trueの出力が返される | 正常系 | actual.passed===true |
| IT-HE-022 | 検証失敗時にpassed=falseとdiagnosticsが返される | 正常系 | actual.passed===falseかつactual.diagnostics.length>=1 |
| IT-HE-023 | 出力のvalidatorIdが定義のownerValidatorIdと一致する | 正常系 | actual.validatorIdが定義のownerValidatorIdと一致する |
| IT-HE-024 | 未登録コードが指定された場合にUnknownErrorDefinitionErrorをthrowする | 異常系 | UnknownErrorDefinitionErrorがthrowされる |
| IT-HE-025 | fix_exampleが解決できない場合にMissingFixExampleErrorをthrowする | 異常系 | MissingFixExampleErrorがthrowされる |
| IT-HE-026 | FixExampleValidatorPortの実行エラーが伝播する | 異常系 | Port由来の例外がそのままthrowされる |

### 3.4 ValidateAllFixExamplesUseCase

**モック対象**: `FixExampleValidatorPort`（`ValidateFixExampleUseCase`経由で間接利用）。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-027 | 全定義のfix_exampleが一括検証される | 正常系 | actual.results.lengthがレジストリの定義数と一致する |
| IT-HE-028 | layerフィルタが適用される | 正常系 | actual.resultsが指定layer定義のみ含む |
| IT-HE-029 | validatorIdフィルタが適用される | 正常系 | actual.resultsが指定validatorId定義のみ含む |
| IT-HE-030 | failFast=trueの場合、最初の失敗で打ち切られる | 正常系 | actual.results.lengthが失敗位置+1以下である |
| IT-HE-031 | failFast=falseの場合、全件検証される | 正常系 | actual.results.lengthが全対象件数と一致する |
| IT-HE-032 | summaryのtotal/passed/failedが正しく集計される | 正常系 | actual.summary各フィールドが期待値と一致する |
| IT-HE-033 | フィルタ条件に一致する定義がない場合にtotal=0で返される | 正常系（境界） | actual.summary.total===0 |
| IT-HE-034 | 単体検証で例外が発生した場合にその例外が伝播する | 異常系 | Port由来の例外がthrowされる |

### 3.5 AssertSeverityContractUseCase

**モック対象**: なし。`ErrorDefinitionRegistry`は最小テスト定義fixtureで構築した実体、`SeverityContractEnforcer`も実体を使用する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-035 | 格上げ（warning→error）が許容されeffectiveSeverityがerrorで返される | 正常系 | actual.effectiveSeverity==="error" |
| IT-HE-036 | 同一severity（error→error）が許容される | 正常系 | actual.effectiveSeverity==="error"かつactual.violated===false |
| IT-HE-037 | violated=falseが返される | 正常系 | actual.violated===false |
| IT-HE-038 | 格下げ（error→warning）でSeverityDowngradeViolationErrorをthrowする | 異常系 | SeverityDowngradeViolationErrorがthrowされる |
| IT-HE-039 | 未登録コードでUnknownErrorDefinitionErrorをthrowする | 異常系 | UnknownErrorDefinitionErrorがthrowされる |
| IT-HE-040 | 不正なcode文字列でInvalidErrorCodeErrorをthrowする | 異常系 | InvalidErrorCodeErrorがthrowされる |

### 3.6 ListErrorDefinitionsUseCase

**モック対象**: なし。`ErrorDefinitionRegistry`は最小テスト定義fixtureで構築した実体を使用する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-041 | フィルタなしで全定義がErrorDefinitionSummaryとして返される | 正常系 | actual.lengthがレジストリ全定義数と一致する |
| IT-HE-042 | layerフィルタが適用される | 正常系 | actual全要素のcodeが指定layerプレフィックスで始まる |
| IT-HE-043 | validatorIdフィルタが適用される | 正常系 | actual全要素が指定validatorIdに紐づく |
| IT-HE-044 | categoryフィルタが適用される | 正常系 | actual全要素のcategoryが指定値と一致する |
| IT-HE-045 | 条件に一致する定義がない場合に空配列が返される | 正常系（境界） | actual.length===0 |
| IT-HE-046 | 複数フィルタのAND条件が正しく適用される | 正常系 | layer+validatorId両条件を満たす結果のみ返される |
| IT-HE-137 | ErrorDefinitionRegistry取得失敗時に例外が呼び出し元へ伝播する | 異常系 | registry由来の例外が握り潰されずthrowされる |
| IT-HE-138 | ContractMapper由来の想定外例外が呼び出し元へ伝播する | 異常系 | mapper由来の例外が握り潰されずthrowされる |
| IT-HE-139 | 不正なlayerフィルタ値が渡された場合にバリデーションエラーが返される | 異常系 | 不正なlayer指定で適切なエラーがthrowされる |

### 3.7 HarnessErrorContractMapper

**モック対象**: なし。Domain実体のHarnessErrorを直接使用する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-047 | HarnessErrorからHarnessErrorContractへ全フィールドが正しく投影される | 正常系 | actual.code/severity/message/suggestion/adr_ref/fix_exampleが元のHarnessErrorと一致する |
| IT-HE-048 | adrRef=nullの場合にadr_refフィールドが省略される | 正常系 | actual.adr_refがundefinedである |
| IT-HE-049 | fixExample=nullの場合にfix_exampleフィールドが省略される | 正常系 | actual.fix_exampleがundefinedである |
| IT-HE-050 | 生成されたDTOがObject.freeze済みである | 正常系 | Object.isFrozen(actual)がtrueである |

---

## 4. Infrastructureテストケース (5 Adapters + 1 Registry)

### 4.1 FileSystemAdrExistenceCheckerAdapter

**テスト環境**: `fs.mkdtempSync()`で一時ディレクトリを作成し、`docs/ADR/`構造をfixture化する。テスト終了時にcleanupする。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-051 | docs/ADR/配下にファイル名一致するADRが存在する場合にtrueを返す | 正常系 | actual===true |
| IT-HE-052 | ファイル名一致かつfrontmatterのadr_idが一致する場合にtrueを返す | 正常系 | actual===true（frontmatter含む完全一致） |
| IT-HE-053 | ファイル名一致だがfrontmatterのadr_idが不一致の場合にfalseを返す | 異常系 | actual===false |
| IT-HE-054 | 対象ADRファイルが存在しない場合にfalseを返す | 正常系（境界） | actual===false |
| IT-HE-055 | docs/ADR/ディレクトリ自体が存在しない場合にfalseを返す | 異常系 | actual===false |
| IT-HE-056 | I/Oエラー発生時にadapter例外を返す | 異常系 | adapter固有の例外がthrowされる |

### 4.2 TypeScriptSnippetSyntaxAdapter

**テスト環境**: `__tests__/fixtures/snippets/`配下のTypeScriptコード片fixtureを使用する。実際の`ts.createSourceFile()`を呼び出して検証する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-057 | 有効な単一文のTypeScriptコード片で構文正常と判定される | 正常系 | actual.valid===true |
| IT-HE-058 | 有効な複数文のTypeScriptコード片で構文正常と判定される | 正常系 | actual.valid===true |
| IT-HE-059 | 関数定義を含むコード片で構文正常と判定される | 正常系 | actual.valid===true |
| IT-HE-060 | 構文エラーを含むコード片で構文失敗と判定される | 異常系 | actual.valid===falseかつdiagnostics.length>=1 |
| IT-HE-061 | 閉じ括弧不足のコード片で構文失敗と判定される | 異常系 | actual.valid===false |
| IT-HE-062 | 空文字列が渡された場合の挙動 | 異常系（境界） | 実装仕様に従い正常または異常が返される |

### 4.3 ValidatorExecutionFixExampleValidatorAdapter

**テスト環境**: L1バリデータをfixtureとして使用する（QA Q1）。Wave 1時点ではstubバリデータをfixture化し、validator-system完成前でもテスト可能にする。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-063 | 構文妥当かつvalidator通過でFixExampleValidationResult.success()が返される | 正常系 | actual.passed===trueかつactual.reason===null |
| IT-HE-064 | 構文不正の場合にfailure結果が返される | 異常系 | actual.passed===falseかつactual.diagnosticsに構文エラーが含まれる |
| IT-HE-065 | 構文正常だがvalidator再実行で違反が残る場合にfailure結果が返される | 異常系 | actual.passed===falseかつactual.reasonが非null |
| IT-HE-066 | fix_example適用後に対象コードの違反が消失していることが検証される | 正常系 | actual.passed===true（適用前NG→適用後OK） |
| IT-HE-067 | diagnosticsに構文エラーとvalidator失敗の両方が記録される | 異常系 | actual.diagnostics.length>=2 |
| IT-HE-068 | 未知のvalidatorIdが指定された場合のエラーハンドリング | 異常系 | adapter固有の例外がthrowされる |
| IT-HE-069 | validator再実行で他コードの警告が追加された場合にfailure結果が返される | 異常系 | actual.passed===false |
| IT-HE-070 | deterministicなfixtureに対して結果が再現可能である | 正常系 | 2回の実行で同一結果が返される |

### 4.4 ValidatorRegistryBridgeAdapter

**テスト環境**: `infrastructure/registry/validator-entrypoints.ts`の静的マップを参照する。テスト対象はharness-error Unit所有エラー定義が参照するvalidator IDのみ。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-071 | harness-error Unit所有のエラー定義が参照するvalidatorIdからエントリポイントが解決される | 正常系 | actual（エントリポイント）が非nullである |
| IT-HE-072 | harness-error Unit所有の全ownerValidatorIdがvalidator-entrypoints.tsに登録済みである | 正常系 | 最小テスト定義の全ownerValidatorIdが解決可能 |
| IT-HE-073 | 未知のvalidatorIdに対してエラーが返される | 異常系 | adapter固有の例外がthrowされる |
| IT-HE-074 | 静的マップの内容がvalidator-entrypoints.tsと一致する | 正常系 | マップのキー集合がentrypoints定義と一致する |

### 4.5 LegacyErrorReporterAdapter

**テスト環境**: `scripts/harness/core/error-reporter.ts`の現行型定義をソースとするfixtureを`__tests__/fixtures/legacy-errors/`に用意する（QA Q2）。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-075 | 旧形式のエラーオブジェクトがValidatorIssueDraftに変換される | 正常系 | actualがValidatorIssueDraft構造を持つ |
| IT-HE-076 | 旧severity "info"がwarningにマップされる | 正常系 | actual.severity==="warning" |
| IT-HE-077 | 旧severity "error"がそのままerrorにマップされる | 正常系 | actual.severity==="error" |
| IT-HE-078 | 旧severity "warning"がそのままwarningにマップされる | 正常系 | actual.severity==="warning" |
| IT-HE-079 | 旧message.shortがdraftのmessageにマップされる | 正常系 | actual.messageが旧message.shortと一致する |
| IT-HE-080 | 旧resolution.fixSuggestionがdraftのsuggestionにマップされる | 正常系 | actual.suggestionが旧resolution.fixSuggestionと一致する |
| IT-HE-081 | 旧resolution.docLinksがsuggestionに圧縮される | 正常系 | actual.suggestionに旧docLinksの情報が含まれる |
| IT-HE-082 | 旧metadata.validatorがdraftのvalidatorIdにマップされる | 正常系 | actual.validatorIdが旧metadata.validatorと一致する |

### 4.6 buildErrorDefinitionRegistry

**テスト環境**: 各レベル（L1-L4）から1-2件の代表的な最小テスト定義をfixture化して使用する（QA Q5）。実データは使用しない。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-083 | l1〜l4の定義ファイルから統合されたErrorDefinitionRegistryが構築される | 正常系 | actualレジストリが全層の定義を含む |
| IT-HE-084 | 重複codeが検出された場合に起動時エラーをthrowする | 異常系 | 重複codeを含む入力で例外がthrowされる |
| IT-HE-085 | 欠落ADR（adrRefRequired=trueだがdefaultAdrRefがnull）が検出された場合にエラーをthrowする | 異常系 | ADR欠落定義を含む入力で例外がthrowされる |
| IT-HE-086 | 欠落defaultFixExample（fixExampleRequired=trueだがdefaultFixExampleがnull）が検出された場合にエラーをthrowする | 異常系 | fixExample欠落定義を含む入力で例外がthrowされる |
| IT-HE-087 | 構築後のレジストリが全層の定義を含んでいる | 正常系 | L1/L2/L3/L4各層の定義が1件以上取得可能 |
| IT-HE-088 | 定義が空の場合にも正常にレジストリが構築される | 正常系（境界） | 空配列入力で空レジストリが返される |

---

## 5. Presentationテストケース (4 Handlers + 3 Formatters)

### 5.1 RenderHarnessErrorsHandler

**テスト環境**: `--input <path>`テストではファイルシステムを使用する（QA Q3）。一時ディレクトリにfixture JSONファイルを配置し、ファイルパスを渡す。stdout/stderrのキャプチャユーティリティを共通ヘルパーとして用意する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-089 | --format humanでhuman形式のテキストがstdoutに出力される | 正常系 | stdoutにhuman形式の文字列が含まれる |
| IT-HE-090 | --format agentでagent形式のテキストがstdoutに出力される | 正常系 | stdoutにagent形式の文字列が含まれる |
| IT-HE-091 | --format ciでCI annotation JSONがstdoutに出力される | 正常系 | stdoutにJSON文字列が含まれる |
| IT-HE-092 | --fail-on-error指定かつerrorを含む場合に終了コード1が返される | 正常系 | actual.exitCode===1 |
| IT-HE-093 | --fail-on-error指定かつwarningのみの場合に終了コード0が返される | 正常系 | actual.exitCode===0 |
| IT-HE-094 | --fail-on-error未指定の場合にerrorを含んでも終了コード0が返される | 正常系 | actual.exitCode===0 |
| IT-HE-095 | 入力JSONがHarnessErrorContract[]として不正な場合に終了コード2が返される | 異常系 | actual.exitCode===2 |
| IT-HE-096 | JSON parse失敗時に終了コード2が返される | 異常系 | actual.exitCode===2 |

### 5.2 ValidateFixExampleHandler

**テスト環境**: UseCaseをモックし、Handler自体のCLI引数解析・出力制御・終了コード決定を検証する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-097 | --code指定時に単一コード検証が実行される | 正常系 | ValidateFixExampleUseCaseが呼ばれる |
| IT-HE-098 | --code未指定時に全件検証が実行される | 正常系 | ValidateAllFixExamplesUseCaseが呼ばれる |
| IT-HE-099 | 全件pass時に終了コード0が返される | 正常系 | actual.exitCode===0 |
| IT-HE-100 | 1件以上失敗時に終了コード1が返される | 異常系 | actual.exitCode===1 |
| IT-HE-101 | --fail-fast指定時に最初の失敗で停止する | 正常系 | UseCase呼び出し時にfailFast=trueが渡される |
| IT-HE-102 | 実行環境エラー時に終了コード2が返される | 異常系 | actual.exitCode===2 |

### 5.3 ListErrorDefinitionsHandler

**テスト環境**: UseCaseをモックし、Handler自体のCLI引数解析・出力形式・終了コード決定を検証する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-103 | フィルタなしで全定義がtable形式で出力される | 正常系 | stdoutにtable形式の出力が含まれる |
| IT-HE-104 | --format jsonでJSON形式で出力される | 正常系 | stdoutが有効なJSON文字列である |
| IT-HE-105 | 1件以上ヒット時に終了コード0が返される | 正常系 | actual.exitCode===0 |
| IT-HE-106 | 0件ヒット時に終了コード1が返される | 正常系（境界） | actual.exitCode===1 |
| IT-HE-107 | 実行エラー時に終了コード2が返される | 異常系 | actual.exitCode===2 |

### 5.4 AssertSeverityContractHandler

**テスト環境**: UseCaseをモックし、Handler自体のCLI引数解析・出力形式・終了コード決定を検証する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-108 | 契約順守時にeffective severityが出力され終了コード0が返される | 正常系 | actual.exitCode===0かつstdoutにseverityが含まれる |
| IT-HE-109 | 格下げ違反時に違反内容が出力され終了コード1が返される | 異常系 | actual.exitCode===1かつstdoutに違反情報が含まれる |
| IT-HE-110 | --format jsonでJSON形式の出力が返される | 正常系 | stdoutが有効なJSON文字列である |
| IT-HE-111 | --format textでテキスト形式の出力が返される | 正常系 | stdoutがテキスト形式である |
| IT-HE-112 | 実行エラー時に終了コード2が返される | 異常系 | actual.exitCode===2 |
| IT-HE-140 | 格下げ違反時に違反出力にcode・違反内容・ADR参照（ADR-xxx）が全て含まれる | 異常系 | actual.exitCode===1かつstdoutにcode、違反内容、ADR-xxx形式の参照が文字列一致で含まれる |
| IT-HE-141 | 格下げ違反時のADR参照がErrorDefinitionのdefaultAdrRefと一致する | 異常系 | stdout出力内のADR参照が対象ErrorDefinitionのdefaultAdrRefの値と一致する |

### 5.5 HumanHarnessErrorFormatter

**テスト環境**: `HarnessErrorContract[]`を直接入力する。出力はリテラル文字列との完全一致で検証する（QA Q4）。snapshot testingは使用しない。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-113 | 同一入力に対してdeterministicな文字列が返される | 正常系 | 2回の実行でactualが同一のリテラル文字列と一致する |
| IT-HE-114 | errorとwarningで視覚的に区別された出力が生成される | 正常系 | actualにerror/warningそれぞれの識別文字列がリテラル一致で含まれる |
| IT-HE-115 | adr_ref付きエラーでADR参照が含まれる | 正常系 | actualにADR参照文字列がリテラル一致で含まれる |
| IT-HE-116 | 空配列入力で空文字列が返される | 正常系（境界） | actual==="" |

### 5.6 AgentHarnessErrorFormatter

**テスト環境**: `HarnessErrorContract[]`を直接入力する。出力はリテラル文字列との完全一致で検証する（QA Q4）。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-117 | 同一入力に対してdeterministicな文字列が返される | 正常系 | 2回の実行でactualが同一のリテラル文字列と一致する |
| IT-HE-118 | fix_example付きエラーで修正コード例が含まれる | 正常系 | actualにfix_example文字列がリテラル一致で含まれる |
| IT-HE-119 | suggestion付きエラーで修正方針が含まれる | 正常系 | actualにsuggestion文字列がリテラル一致で含まれる |
| IT-HE-120 | 空配列入力で空文字列が返される | 正常系（境界） | actual==="" |

### 5.7 CiHarnessErrorFormatter

**テスト環境**: `HarnessErrorContract[]`を直接入力する。出力はリテラル文字列との完全一致で検証する（QA Q4）。GitHub annotation形式のJSON構造を期待する。

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-121 | 同一入力に対してdeterministicなJSON文字列が返される | 正常系 | 2回の実行でactualが同一のリテラルJSON文字列と一致する |
| IT-HE-122 | GitHub annotation形式のJSON構造で出力される | 正常系 | actualをパースした結果がannotation構造を持つことをリテラル一致で検証する |
| IT-HE-123 | severityがannotation levelに正しくマップされる | 正常系 | error→"error"、warning→"warning"のマッピングがリテラル一致する |
| IT-HE-124 | 空配列入力で空JSON配列が返される | 正常系（境界） | actual==="[]" |

---

## 6. Shared Kernel契約テスト

> **正規ソース**: `logical_design.md` §7（Shared Kernel公開設計）、`integration_contract.md` §2.1（HarnessError型）

### 6.1 isHarnessError() 型ガード関数

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-125 | HarnessErrorContractの全必須フィールドを持つオブジェクトに対してtrueを返す | 正常系 | actual===true（code, severity, message, suggestion全て有） |
| IT-HE-126 | adr_ref、fix_exampleのオプショナルフィールドを含むオブジェクトに対してtrueを返す | 正常系 | actual===true |
| IT-HE-127 | codeフィールドが欠落したオブジェクトに対してfalseを返す | 異常系 | actual===false |
| IT-HE-128 | severityが"error"/"warning"以外の値を持つオブジェクトに対してfalseを返す | 異常系 | actual===false |
| IT-HE-129 | nullやundefinedに対してfalseを返す | 異常系（境界） | actual===false |
| IT-HE-130 | 空オブジェクト{}に対してfalseを返す | 異常系（境界） | actual===false |

### 6.2 HarnessErrorContract構造的一致性

> `integration_contract.md` §2.1: `{ code: string, severity: "error" | "warning", message: string, suggestion: string, adr_ref?: string, fix_example?: string }`

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-131 | HarnessErrorContractがintegration_contract.md §2.1のHarnessErrorインターフェース定義と構造的に一致する | 正常系（契約検証） | 全必須フィールド（code, severity, message, suggestion）とオプショナルフィールド（adr_ref, fix_example）の型が一致する |
| IT-HE-132 | HarnessErrorContractの全フィールドがreadonly修飾されている | 正常系（不変性契約） | Object.freeze済みインスタンスのプロパティ書き換えが失敗する |

### 6.3 shared-kernel/harness-error.ts 再エクスポート検証

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-133 | scripts/harness/shared-kernel/harness-error.tsからHarnessErrorContract型がimport可能である | 正常系 | import文が型エラーなく解決される |
| IT-HE-134 | scripts/harness/shared-kernel/harness-error.tsからHarnessErrorSeverity型がimport可能である | 正常系 | import文が型エラーなく解決される |
| IT-HE-135 | scripts/harness/shared-kernel/harness-error.tsからisHarnessError関数がimport可能である | 正常系 | import文が関数として解決され、typeof actual==="function" |
| IT-HE-136 | harness-error内部ディレクトリの直接importが公開されていないことの確認 | 正常系（カプセル化検証） | domain/、application/等の直接importが失敗するか、shared-kernel経由でのみ公開されていることを確認する |

---

## 8. 回帰テスト: 受け入れ基準横断検証

> **目的**: 最小fixtureによる個別検証ではカバーできない「全定義横断」の受け入れ基準を回帰テストとして保証する。
> **テストファイル**: `regression/acceptance-criteria-regression.test.ts`
> **テスト環境**: `buildErrorDefinitionRegistry`で構築した実レジストリ（最小テスト定義ではなく全定義）を使用する。全ErrorDefinitionを走査して検証する。

### 8.1 §3.1-2: L1-L4全バリデータ出力のHarnessErrorフォーマット統一

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-142 | 全ErrorDefinitionを走査し、各レイヤー代表validatorの出力がNormalizeValidatorErrorsUseCaseでHarnessErrorContract構造に正規化される | 回帰 | L1-L4各層の代表validator出力をNormalizeValidatorErrorsUseCaseへ流し込み、全結果がisHarnessError()===trueとなること |
| IT-HE-143 | 全ErrorDefinitionのコードがL{n}-{nnn}形式に準拠している | 回帰 | registryの全定義のcodeがErrorCode形式検証を通過すること |

### 8.2 §3.1-3: 全定義のadrRef付与保証

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-144 | 全ErrorDefinitionを走査し、adrRefRequired=trueの定義にdefaultAdrRefが必ず存在する | 回帰 | registryの全定義に対して、adrRefRequired===trueの場合にdefaultAdrRefが非nullであること |

### 8.3 §3.1-4: 全定義のfixExample付与保証

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-145 | 全ErrorDefinitionを走査し、fixExampleRequired=trueの定義にdefaultFixExampleが必ず存在する | 回帰 | registryの全定義に対して、fixExampleRequired===trueの場合にdefaultFixExampleが非nullであること |

### 8.4 §3.2-4: fix_example更新時のCIバリデーション自動起動

| ID | テストケース名 | 種別 | 検証内容 |
|----|--------------|------|---------|
| IT-HE-146 | fix_example関連ファイルの変更時にValidateAllFixExamplesUseCase相当のジョブがトリガーされる契約を検証する | 契約テスト | CI設定（GitHub Actions workflow等）のpathsトリガーにfix_example関連パスが含まれており、対応するジョブがValidateAllFixExamplesUseCaseを実行する構成であること |

---

## 9. テスト環境設定

### 9.1 テストフレームワーク

- **Vitest 3.0.0**（共有設定: `scripts/harness/__tests__/vitest.config.ts`）
- `target`/`context`ヘルパーが`describe`のエイリアスとして提供されている前提

### 9.2 一時ディレクトリ戦略

- `fs.mkdtempSync(os.tmpdir() + path.sep + 'harness-error-it-')`で一時ディレクトリを生成する
- 各テストスイートの`afterAll`（または`afterEach`）でcleanup（`fs.rmSync(tmpDir, { recursive: true })`）
- FileSystemAdrExistenceCheckerAdapter、RenderHarnessErrorsHandlerの`--input <path>`テストで使用

### 9.3 fixture管理

| fixture種別 | 配置先 | 命名規則 |
|------------|--------|---------|
| ADR fixture | `__tests__/fixtures/adr/` | `ADR-{nnn}.md` |
| TypeScriptコード片 | `__tests__/fixtures/snippets/` | `{valid\|invalid}-{description}.ts` |
| 旧形式エラーオブジェクト | `__tests__/fixtures/legacy-errors/` | `legacy-error-samples.ts` |
| 最小テスト定義 | `__tests__/fixtures/error-definitions/` | `test-l{n}-definitions.ts` |
| Handler入力JSON | `__tests__/fixtures/render-input/` | `{description}.json` |

### 9.4 最小テスト定義（QA Q5）

`buildErrorDefinitionRegistry`および各UseCaseテストで使用するfixtureは、実データではなく各レベル（L1-L4）から代表的な定義を1-2件抽出した最小セットとする。

```
test-l1-definitions.ts  → L1-001（代表）, L1-002（代表）
test-l2-definitions.ts  → L2-001（代表）
test-l3-definitions.ts  → L3-001（代表）
test-l4-definitions.ts  → L4-001（代表）
```

これにより実データの変更頻度に左右されず、テストの保守コストを低減する。

### 9.5 stubバリデータ（QA Q1）

`ValidatorExecutionFixExampleValidatorAdapter`のITテストでは、Wave 1時点でL1（構文レベル）のバリデータを対象とする。最小限のstubバリデータをfixture化し、validator-system完成前でもテスト可能にする。

### 9.6 旧形式スキーマソース（QA Q2）

`LegacyErrorReporterAdapter`のテストデータは`scripts/harness/core/error-reporter.ts`の現行型定義を正として作成する。旧形式の型定義をテスト側にスナップショットとして保持し、変更時に検知する。

### 9.7 モック方針サマリ

| 層 | モック対象 | モック禁止対象 |
|----|----------|-------------|
| Application（UseCase） | `AdrExistenceCheckerPort`, `FixExampleValidatorPort`（Port層のインターフェース） | `ErrorCode`, `Severity`, `HarnessError`, `ErrorDefinition`, `ErrorDefinitionRegistry`, `SeverityContractEnforcer`（Domain実体） |
| Infrastructure（Adapter） | なし（実I/O使用） | — |
| Presentation（Handler） | UseCase（Handlerから呼ばれるUseCase） | Formatter（実体使用） |
| Presentation（Formatter） | なし（`HarnessErrorContract[]`直接入力） | — |
| Shared Kernel | なし | — |

### 9.8 stdout/stderrキャプチャ

Presentation層のHandler ITテストでは、stdout/stderr/終了コードのキャプチャが必要となる。共通ヘルパーとして`captureOutput(fn: () => Promise<void>): Promise<{ stdout: string; stderr: string; exitCode: number }>`を用意する。

### 9.9 リスク管理

| # | リスク | 影響度 | 軽減策 |
|---|-------|-------|-------|
| R1 | ValidatorExecutionFixExampleValidatorAdapterは実際のvalidator実行を伴い、Wave 1時点で対象validatorが未完成の場合にテスト実行不可 | 高 | L1 stubバリデータfixtureで対応（QA Q1） |
| R2 | FileSystemAdrExistenceCheckerAdapterはdocs/ADR/配下のファイル構造に依存 | 中 | 一時ディレクトリにfixture ADRファイルを作成するsetup/teardown |
| R3 | LegacyErrorReporterAdapterは既存error-reporter.tsの型定義に依存し、v1移行中に旧形式が変更される可能性 | 中 | 旧形式の型定義をテスト側にスナップショットとして保持し変更時検知 |
| R4 | NormalizeValidatorErrorsUseCaseの全件失敗原子性は大量draftでパフォーマンスに影響する可能性 | 低 | ITテストでは10件程度の代表的ケースに限定 |
| R5 | Presentation層のHandler ITテストはstdout/stderr/終了コードのキャプチャが必要 | 中 | 共通キャプチャヘルパーを用意 |
