# ITテスト設計計画: harness-error

> **Unit ID**: harness-error
> **作成日**: 2026-03-13
> **正規ソース**: `docs/product/construction/harness-error/logical_design.md`
> **テスト規約参照**: `docs/principles/testing-rules.md`

---

## 1. スコープ

### 対象Unitの論理設計

harness-error Unitの論理設計は4層（Domain / Application / Infrastructure / Presentation）で構成される。ITテストはApplication層のUseCase、Infrastructure層のAdapter/Registry、Presentation層のHandler/Formatterを対象とする。

### テスト対象コンポーネント一覧

| 層 | コンポーネント | ファイル |
|----|-------------|---------|
| Application | CreateHarnessErrorUseCase | `application/usecases/create-harness-error-usecase.ts` |
| Application | NormalizeValidatorErrorsUseCase | `application/usecases/normalize-validator-errors-usecase.ts` |
| Application | ValidateFixExampleUseCase | `application/usecases/validate-fix-example-usecase.ts` |
| Application | ValidateAllFixExamplesUseCase | `application/usecases/validate-all-fix-examples-usecase.ts` |
| Application | AssertSeverityContractUseCase | `application/usecases/assert-severity-contract-usecase.ts` |
| Application | ListErrorDefinitionsUseCase | `application/usecases/list-error-definitions-usecase.ts` |
| Application | HarnessErrorContractMapper | `application/mappers/harness-error-contract-mapper.ts` |
| Infrastructure | FileSystemAdrExistenceCheckerAdapter | `infrastructure/adapters/file-system-adr-existence-checker-adapter.ts` |
| Infrastructure | TypeScriptSnippetSyntaxAdapter | `infrastructure/adapters/type-script-snippet-syntax-adapter.ts` |
| Infrastructure | ValidatorExecutionFixExampleValidatorAdapter | `infrastructure/adapters/validator-execution-fix-example-validator-adapter.ts` |
| Infrastructure | ValidatorRegistryBridgeAdapter | `infrastructure/adapters/validator-registry-bridge-adapter.ts` |
| Infrastructure | LegacyErrorReporterAdapter | `infrastructure/adapters/legacy-error-reporter-adapter.ts` |
| Infrastructure | buildErrorDefinitionRegistry | `infrastructure/registry/build-error-definition-registry.ts` |
| Presentation | RenderHarnessErrorsHandler | `presentation/handlers/render-harness-errors-handler.ts` |
| Presentation | ValidateFixExampleHandler | `presentation/handlers/validate-fix-example-handler.ts` |
| Presentation | ListErrorDefinitionsHandler | `presentation/handlers/list-error-definitions-handler.ts` |
| Presentation | AssertSeverityContractHandler | `presentation/handlers/assert-severity-contract-handler.ts` |
| Presentation | HumanHarnessErrorFormatter | `presentation/formatters/human-harness-error-formatter.ts` |
| Presentation | AgentHarnessErrorFormatter | `presentation/formatters/agent-harness-error-formatter.ts` |
| Presentation | CiHarnessErrorFormatter | `presentation/formatters/ci-harness-error-formatter.ts` |
| Shared Kernel | isHarnessError | `shared-kernel/harness-error.ts` |
| Shared Kernel | HarnessErrorContract | `shared-kernel/harness-error.ts` |
| Shared Kernel | shared-kernel再エクスポート | `shared-kernel/harness-error.ts` |

---

## 2. テスト対象分析

### Application層（UseCase）

| UseCase名 | 依存Port数 | テストケース概算 |
|-----------|----------|---------------|
| CreateHarnessErrorUseCase | 0（HarnessErrorFactory経由で間接依存） | 8 |
| NormalizeValidatorErrorsUseCase | 0（CreateHarnessErrorUseCase経由） | 10 |
| ValidateFixExampleUseCase | 1（FixExampleValidatorPort） | 8 |
| ValidateAllFixExamplesUseCase | 0（ValidateFixExampleUseCase経由） | 8 |
| AssertSeverityContractUseCase | 0（SeverityContractEnforcer経由） | 6 |
| ListErrorDefinitionsUseCase | 0（ErrorDefinitionRegistry経由） | 6 |
| HarnessErrorContractMapper | 0 | 4 |

### Infrastructure層（Adapter/Registry）

| Adapter名 | 操作数 | テストケース概算 |
|-----------|-------|---------------|
| FileSystemAdrExistenceCheckerAdapter | 1（exists） | 6 |
| TypeScriptSnippetSyntaxAdapter | 1（構文検証） | 6 |
| ValidatorExecutionFixExampleValidatorAdapter | 1（validate） | 8 |
| ValidatorRegistryBridgeAdapter | 1（validatorId→エントリポイント解決） | 4 |
| LegacyErrorReporterAdapter | 1（旧形式→ValidatorIssueDraft変換） | 8 |
| buildErrorDefinitionRegistry | 1（Registry構築） | 6 |

### Presentation層（CLI/Controller）

| コマンド/エンドポイント | メソッド | テストケース概算 |
|---------------------|--------|---------------|
| RenderHarnessErrorsHandler | execute | 8 |
| ValidateFixExampleHandler | execute | 6 |
| ListErrorDefinitionsHandler | execute | 5 |
| AssertSeverityContractHandler | execute | 5 |
| HumanHarnessErrorFormatter | format | 4 |
| AgentHarnessErrorFormatter | format | 4 |
| CiHarnessErrorFormatter | format | 4 |

### Shared Kernel契約テスト

| コンポーネント | 検証内容 | テストケース概算 |
|-------------|---------|---------------|
| isHarnessError() | 型ガード関数の適合/非適合判定 | 6 |
| HarnessErrorContract | integration_contract.md §2.1との構造的一致性 | 2 |
| shared-kernel/harness-error.ts | 再エクスポートの公開検証 | 4 |

**合計テストケース概算: 約142件**（Application: 50件、Infrastructure: 38件、Presentation: 42件、Shared Kernel契約: 12件）

---

## 3. テスト方針

### モック方針

- **Port（外部依存）のみモック使用可**: `FixExampleValidatorPort`、`AdrExistenceCheckerPort`のインターフェースに対してテストダブルを使用する
- **ドメイン実体はモック禁止**: `HarnessError`、`ErrorCode`、`Severity`、`ErrorDefinition`等の値オブジェクトおよびドメインサービスはすべて実体を使用する
- **UseCase間の依存**: `NormalizeValidatorErrorsUseCase`は`CreateHarnessErrorUseCase`に依存するが、ドメイン実体と同様に実体を使用する。PortレベルでのみテストダブルをDIする

### TypeScript Compiler APIの扱い

- TypeScript Compiler APIはInfrastructure層（`TypeScriptSnippetSyntaxAdapter`）に閉じ込められている
- テストではfixtureとしてTypeScriptコード片（正常構文/異常構文）を用意し、実際のts.createSourceFile()を呼び出して検証する
- fixture TSファイルは`__tests__/fixtures/`配下にkebab-caseで配置する

### AAAパターン

全テストケースで`// Arrange` / `// Act` / `// Assert`コメントを明示する。

### テストケース名は日本語

仕様としての表現力を持つ日本語で記述する。実装の詳細（クラス名、プロパティ名）は含めない。

### describe/it構造

`target` / `describe` / `context` / `it`パターンを使用する。

### Act結果の変数名

テスト実行結果は`actual`変数に代入する。

### ファイル名

kebab-caseを使用する（例: `create-harness-error-usecase.test.ts`）。

---

## 4. テスト対象の詳細

### 4.1 Application層

#### 4.1.1 CreateHarnessErrorUseCase

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 有効な入力からHarnessErrorContractが生成される | 正常系 |
| 2 | 生成されたDTOのcodeがstring型で返される | 正常系 |
| 3 | 生成されたDTOのseverityが正しく投影される | 正常系 |
| 4 | 生成されたDTOがObject.freeze済みのreadonlyである | 正常系 |
| 5 | adrRef付きの入力からadr_refフィールドを含むDTOが返される | 正常系 |
| 6 | fixExample付きの入力からfix_exampleフィールドを含むDTOが返される | 正常系 |
| 7 | 不正なcode文字列が渡された場合にドメインエラーが伝播する | 異常系 |
| 8 | severity格下げが渡された場合にドメインエラーが伝播する | 異常系 |

#### 4.1.2 NormalizeValidatorErrorsUseCase

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 複数のValidatorIssueDraftが全てHarnessErrorContractに変換される | 正常系 |
| 2 | 結果がcode昇順でソートされる | 正常系 |
| 3 | 同一code内の順序が入力順で安定ソートされる | 正常系 |
| 4 | summaryのtotalが入力件数と一致する | 正常系 |
| 5 | summaryのerrors/warningsがseverityごとに正しく集計される | 正常系 |
| 6 | 結果がreadonly配列で返される | 正常系 |
| 7 | 空の入力配列に対して空結果とsummary={total:0,errors:0,warnings:0}が返される | 正常系（境界） |
| 8 | 1件のdraft変換失敗で全体が失敗する（部分成功なし） | 異常系 |
| 9 | 先頭のdraftが正常で後続のdraftが異常の場合に全体が失敗する | 異常系 |
| 10 | error/warning混在のdraftリストでsummaryが正しく計算される | 正常系 |

#### 4.1.3 ValidateFixExampleUseCase

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | overrideFixExampleが指定された場合、それを使って検証される | 正常系 |
| 2 | overrideFixExample未指定時にdefaultFixExampleが使用される | 正常系 |
| 3 | 検証成功時にpassed=trueの出力が返される | 正常系 |
| 4 | 検証失敗時にpassed=falseとdiagnosticsが返される | 正常系 |
| 5 | 出力のvalidatorIdが定義のownerValidatorIdと一致する | 正常系 |
| 6 | 未登録コードが指定された場合にUnknownErrorDefinitionErrorをthrowする | 異常系 |
| 7 | fix_exampleが解決できない場合にMissingFixExampleErrorをthrowする | 異常系 |
| 8 | FixExampleValidatorPortの実行エラーが伝播する | 異常系 |

#### 4.1.4 ValidateAllFixExamplesUseCase

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 全定義のfix_exampleが一括検証される | 正常系 |
| 2 | layerフィルタが適用される | 正常系 |
| 3 | validatorIdフィルタが適用される | 正常系 |
| 4 | failFast=trueの場合、最初の失敗で打ち切られる | 正常系 |
| 5 | failFast=falseの場合、全件検証される | 正常系 |
| 6 | summaryのtotal/passed/failedが正しく集計される | 正常系 |
| 7 | フィルタ条件に一致する定義がない場合にtotal=0で返される | 正常系（境界） |
| 8 | 単体検証で例外が発生した場合にその例外が伝播する | 異常系 |

#### 4.1.5 AssertSeverityContractUseCase

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 格上げ（warning→error）が許容されeffectiveSeverityがerrorで返される | 正常系 |
| 2 | 同一severity（error→error）が許容される | 正常系 |
| 3 | violated=falseが返される | 正常系 |
| 4 | 格下げ（error→warning）でSeverityDowngradeViolationErrorをthrowする | 異常系 |
| 5 | 未登録コードでUnknownErrorDefinitionErrorをthrowする | 異常系 |
| 6 | 不正なcode文字列でInvalidErrorCodeErrorをthrowする | 異常系 |

#### 4.1.6 ListErrorDefinitionsUseCase

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | フィルタなしで全定義がErrorDefinitionSummaryとして返される | 正常系 |
| 2 | layerフィルタが適用される | 正常系 |
| 3 | validatorIdフィルタが適用される | 正常系 |
| 4 | categoryフィルタが適用される | 正常系 |
| 5 | 条件に一致する定義がない場合に空配列が返される | 正常系（境界） |
| 6 | 複数フィルタのAND条件が正しく適用される | 正常系 |

#### 4.1.7 HarnessErrorContractMapper

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | HarnessErrorからHarnessErrorContractへ全フィールドが正しく投影される | 正常系 |
| 2 | adrRef=nullの場合にadr_refフィールドが省略される | 正常系 |
| 3 | fixExample=nullの場合にfix_exampleフィールドが省略される | 正常系 |
| 4 | 生成されたDTOがObject.freeze済みである | 正常系 |

### 4.2 Infrastructure層

#### 4.2.1 FileSystemAdrExistenceCheckerAdapter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | docs/ADR/配下にファイル名一致するADRが存在する場合にtrueを返す | 正常系 |
| 2 | ファイル名一致かつfrontmatterのadr_idが一致する場合にtrueを返す | 正常系 |
| 3 | ファイル名一致だがfrontmatterのadr_idが不一致の場合にfalseを返す | 異常系 |
| 4 | 対象ADRファイルが存在しない場合にfalseを返す | 正常系（境界） |
| 5 | docs/ADR/ディレクトリ自体が存在しない場合にfalseを返す | 異常系 |
| 6 | I/Oエラー発生時にadapter例外を返す | 異常系 |

#### 4.2.2 TypeScriptSnippetSyntaxAdapter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 有効な単一文のTypeScriptコード片で構文正常と判定される | 正常系 |
| 2 | 有効な複数文のTypeScriptコード片で構文正常と判定される | 正常系 |
| 3 | 関数定義を含むコード片で構文正常と判定される | 正常系 |
| 4 | 構文エラーを含むコード片で構文失敗と判定される | 異常系 |
| 5 | 閉じ括弧不足のコード片で構文失敗と判定される | 異常系 |
| 6 | 空文字列が渡された場合の挙動 | 異常系（境界） |

#### 4.2.3 ValidatorExecutionFixExampleValidatorAdapter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 構文妥当かつvalidator通過でFixExampleValidationResult.success()が返される | 正常系 |
| 2 | 構文不正の場合にfailure結果が返される | 異常系 |
| 3 | 構文正常だがvalidator再実行で違反が残る場合にfailure結果が返される | 異常系 |
| 4 | fix_example適用後に対象コードの違反が消失していることが検証される | 正常系 |
| 5 | diagnosticsに構文エラーとvalidator失敗の両方が記録される | 異常系 |
| 6 | 未知のvalidatorIdが指定された場合のエラーハンドリング | 異常系 |
| 7 | validator再実行で他コードの警告が追加された場合にfailure結果が返される | 異常系 |
| 8 | deterministicなfixtureに対して結果が再現可能である | 正常系 |

#### 4.2.4 ValidatorRegistryBridgeAdapter

> **スコープ**: harness-error Unitが所有するエラー定義の`ownerValidatorId`に対応するvalidator IDのみをテスト対象とする。integration_contract.md §9の全16バリデータIDではなく、`infrastructure/registry/l1〜l4-error-definitions.ts`で参照されるvalidator IDの解決可能性を検証する。

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | harness-error Unit所有のエラー定義が参照するvalidatorIdからエントリポイントが解決される | 正常系 |
| 2 | harness-error Unit所有の全ownerValidatorIdがvalidator-entrypoints.tsに登録済みである | 正常系 |
| 3 | 未知のvalidatorIdに対してエラーが返される | 異常系 |
| 4 | 静的マップの内容がvalidator-entrypoints.tsと一致する | 正常系 |

#### 4.2.5 LegacyErrorReporterAdapter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 旧形式のエラーオブジェクトがValidatorIssueDraftに変換される | 正常系 |
| 2 | 旧`severity: "info"`が`warning`にマップされる | 正常系 |
| 3 | 旧`severity: "error"`がそのまま`error`にマップされる | 正常系 |
| 4 | 旧`severity: "warning"`がそのまま`warning`にマップされる | 正常系 |
| 5 | 旧`message.short`がdraftのmessageにマップされる | 正常系 |
| 6 | 旧`resolution.fixSuggestion`がdraftのsuggestionにマップされる | 正常系 |
| 7 | 旧`resolution.docLinks`がsuggestionに圧縮される | 正常系 |
| 8 | 旧`metadata.validator`がdraftのvalidatorIdにマップされる | 正常系 |

#### 4.2.6 buildErrorDefinitionRegistry

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | l1〜l4の定義ファイルから統合されたErrorDefinitionRegistryが構築される | 正常系 |
| 2 | 重複codeが検出された場合に起動時エラーをthrowする | 異常系 |
| 3 | 欠落ADR（adrRefRequired=trueだがdefaultAdrRefがnull）が検出された場合にエラーをthrowする | 異常系 |
| 4 | 欠落defaultFixExample（fixExampleRequired=trueだがdefaultFixExampleがnull）が検出された場合にエラーをthrowする | 異常系 |
| 5 | 構築後のレジストリが全層の定義を含んでいる | 正常系 |
| 6 | 定義が空の場合にも正常にレジストリが構築される | 正常系（境界） |

### 4.3 Presentation層

#### 4.3.1 RenderHarnessErrorsHandler

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `--format human`でhuman形式のテキストがstdoutに出力される | 正常系 |
| 2 | `--format agent`でagent形式のテキストがstdoutに出力される | 正常系 |
| 3 | `--format ci`でCI annotation JSONがstdoutに出力される | 正常系 |
| 4 | `--fail-on-error`指定かつerrorを含む場合に終了コード1が返される | 正常系 |
| 5 | `--fail-on-error`指定かつwarningのみの場合に終了コード0が返される | 正常系 |
| 6 | `--fail-on-error`未指定の場合にerrorを含んでも終了コード0が返される | 正常系 |
| 7 | 入力JSONがHarnessErrorContract[]として不正な場合に終了コード2が返される | 異常系 |
| 8 | JSON parse失敗時に終了コード2が返される | 異常系 |

#### 4.3.2 ValidateFixExampleHandler

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `--code`指定時に単一コード検証が実行される | 正常系 |
| 2 | `--code`未指定時に全件検証が実行される | 正常系 |
| 3 | 全件pass時に終了コード0が返される | 正常系 |
| 4 | 1件以上失敗時に終了コード1が返される | 異常系 |
| 5 | `--fail-fast`指定時に最初の失敗で停止する | 正常系 |
| 6 | 実行環境エラー時に終了コード2が返される | 異常系 |

#### 4.3.3 ListErrorDefinitionsHandler

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | フィルタなしで全定義がtable形式で出力される | 正常系 |
| 2 | `--format json`でJSON形式で出力される | 正常系 |
| 3 | 1件以上ヒット時に終了コード0が返される | 正常系 |
| 4 | 0件ヒット時に終了コード1が返される | 正常系（境界） |
| 5 | 実行エラー時に終了コード2が返される | 異常系 |

#### 4.3.4 AssertSeverityContractHandler

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 契約順守時にeffective severityが出力され終了コード0が返される | 正常系 |
| 2 | 格下げ違反時に違反内容が出力され終了コード1が返される | 異常系 |
| 3 | `--format json`でJSON形式の出力が返される | 正常系 |
| 4 | `--format text`でテキスト形式の出力が返される | 正常系 |
| 5 | 実行エラー時に終了コード2が返される | 異常系 |

#### 4.3.5 HumanHarnessErrorFormatter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 同一入力に対してdeterministicな文字列が返される | 正常系 |
| 2 | errorとwarningで視覚的に区別された出力が生成される | 正常系 |
| 3 | adr_ref付きエラーでADR参照が含まれる | 正常系 |
| 4 | 空配列入力で空文字列が返される | 正常系（境界） |

#### 4.3.6 AgentHarnessErrorFormatter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 同一入力に対してdeterministicな文字列が返される | 正常系 |
| 2 | fix_example付きエラーで修正コード例が含まれる | 正常系 |
| 3 | suggestion付きエラーで修正方針が含まれる | 正常系 |
| 4 | 空配列入力で空文字列が返される | 正常系（境界） |

#### 4.3.7 CiHarnessErrorFormatter

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | 同一入力に対してdeterministicなJSON文字列が返される | 正常系 |
| 2 | GitHub annotation形式のJSON構造で出力される | 正常系 |
| 3 | severityがannotation levelに正しくマップされる | 正常系 |
| 4 | 空配列入力で空JSON配列が返される | 正常系（境界） |

### 4.4 Shared Kernel契約テスト

> **正規ソース**: `logical_design.md` §7（Shared Kernel公開設計）、`integration_contract.md` §2.1（HarnessError型）

#### 4.4.1 isHarnessError() 型ガード関数

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | HarnessErrorContractの全必須フィールド（code, severity, message, suggestion）を持つオブジェクトに対してtrueを返す | 正常系 |
| 2 | adr_ref、fix_exampleのオプショナルフィールドを含むオブジェクトに対してtrueを返す | 正常系 |
| 3 | codeフィールドが欠落したオブジェクトに対してfalseを返す | 異常系 |
| 4 | severityが"error"/"warning"以外の値を持つオブジェクトに対してfalseを返す | 異常系 |
| 5 | nullやundefinedに対してfalseを返す | 異常系（境界） |
| 6 | 空オブジェクト`{}`に対してfalseを返す | 異常系（境界） |

#### 4.4.2 HarnessErrorContract構造的一致性

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | HarnessErrorContractがintegration_contract.md §2.1のHarnessErrorインターフェース定義と構造的に一致する（code: string, severity: "error"\|"warning", message: string, suggestion: string, adr_ref?: string, fix_example?: string） | 正常系（契約検証） |
| 2 | HarnessErrorContractの全フィールドがreadonly修飾されている | 正常系（不変性契約） |

#### 4.4.3 shared-kernel/harness-error.ts 再エクスポート検証

| # | テスト観点 | 種別 |
|---|----------|------|
| 1 | `scripts/harness/shared-kernel/harness-error.ts`からHarnessErrorContract型がimport可能である | 正常系 |
| 2 | `scripts/harness/shared-kernel/harness-error.ts`からHarnessErrorSeverity型がimport可能である | 正常系 |
| 3 | `scripts/harness/shared-kernel/harness-error.ts`からisHarnessError関数がimport可能である | 正常系 |
| 4 | harness-error内部ディレクトリ（domain/、application/等）の直接importが公開されていないことの確認 | 正常系（カプセル化検証） |

---

## 4. QA（不明点・確認事項）

| # | 質問 | 影響 |
|---|------|------|
| Q1 | ValidatorExecutionFixExampleValidatorAdapterのITテストで使用するfixtureのvalidatorはWave 1時点でどのvalidatorを対象とするか（L1/L2/L3のいずれか） | fixture準備の範囲 |

[Answer] Wave 1時点ではL1（構文レベル）のvalidatorを対象とする。最小限のstubバリデータをfixture化し、validator-system完成前でもテスト可能にする。

| Q2 | LegacyErrorReporterAdapterの旧形式入力のスキーマは`scripts/harness/core/error-reporter.ts`の現行型定義を正とするか | テストデータの設計 |

[Answer] 採用する。`scripts/harness/core/error-reporter.ts`の現行型定義を旧形式スキーマの正とする。テストデータはこの型定義に基づいて作成する。

| Q3 | RenderHarnessErrorsHandlerの`--input <path>`オプションのITテストではファイルシステムを使うか、stdinモックを使うか | テストの実装方式 |

[Answer] ファイルシステムを使用する。テンポラリディレクトリにfixture JSONファイルを配置し、`--input <path>`でファイルパスを渡す。ファイルI/Oを含めた統合テストとして実施する。

| Q4 | Formatterの「deterministic」の検証方法は、snapshot testingかリテラル一致か | Assertionの記述方法 |

[Answer] リテラル一致を採用する。snapshot testingは変更検知には有用だが、意図しない変更を承認するリスクがある。Formatterの出力は構造化されているため、リテラル文字列との一致検証で十分に表現可能。

| Q5 | buildErrorDefinitionRegistryのITテストで、l1〜l4の定義ファイルの実データを使うか、テスト用の最小定義を用意するか | テストデータの管理 |

[Answer] テスト用の最小定義を用意する。実データは変更頻度が高く、テストの保守コストが増大する。各レベル（L1-L4）から代表的な定義を1-2件抽出した最小セットをfixture化する。

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワークはVitest 3.0.0を使用する
- `target`/`context`ヘルパーが`describe`のエイリアスとして提供されている
- TypeScript Compiler APIが`typescript`パッケージ経由で利用可能である
- fixtureファイルは`__tests__/fixtures/`配下にkebab-caseで配置する
- 一時ディレクトリのテストには`fs.mkdtempSync()` + cleanup パターンを使用する
- `scripts/harness/core/error-reporter.ts`が既存実装として参照可能である

### リスク

| # | リスク | 影響度 | 軽減策 |
|---|-------|-------|-------|
| R1 | ValidatorExecutionFixExampleValidatorAdapterは実際のvalidator実行を伴うため、Wave 1時点で対象validatorが未完成の場合にテストが実行できない | 高 | 最小限のstubバリデータをfixture化し、validator-system完成前でもテスト可能にする |
| R2 | FileSystemAdrExistenceCheckerAdapterはdocs/ADR/配下のファイル構造に依存するため、テスト環境のセットアップが必要 | 中 | 一時ディレクトリにfixture ADRファイルを作成するsetup/teardownを用意する |
| R3 | LegacyErrorReporterAdapterは既存`error-reporter.ts`の型定義に依存するが、v1移行中に旧形式が変更される可能性がある | 中 | 旧形式の型定義をテスト側にスナップショットとして保持し、変更時に検知する |
| R4 | NormalizeValidatorErrorsUseCaseの全件失敗原子性は、大量draftでのパフォーマンスに影響する可能性がある | 低 | ITテストでは10件程度の代表的なケースに限定し、パフォーマンステストはCI統合時に別途実施する |
| R5 | Presentation層のHandler ITテストはstdout/stderr/終了コードのキャプチャが必要であり、テストインフラの準備が必要 | 中 | stdout/stderrのキャプチャユーティリティを共通ヘルパーとして用意する |
