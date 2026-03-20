# ITテストロジック設計: biome-ast-engine

## 1. テストファイル構成

### 1.1 配置方針

- ルート: `scripts/harness/__tests__/biome-ast-engine/`
- `application/`, `infrastructure/`, `presentation/`, `fixtures/` を分離する
- テストファイル名はすべて kebab-case とし、`{component-name}.test.ts` に統一する
- `target` と `context` は `describe` のエイリアスを使う

### 1.2 テストファイル一覧

| レイヤー | テストファイル | 対象 |
|---|---|---|
| application | `resolve-enabled-rules-usecase.test.ts` | `ResolveEnabledRulesUseCase` |
| application | `analyze-import-graph-usecase.test.ts` | `AnalyzeImportGraphUseCase` |
| application | `execute-lint-usecase.test.ts` | `ExecuteLintUseCase` |
| application | `build-harness-error-payload-usecase.test.ts` | `BuildHarnessErrorPayloadUseCase` |
| application | `verify-eslint-removal-usecase.test.ts` | `VerifyEslintRemovalUseCase` |
| infrastructure | `biome-cli-executor-adapter.test.ts` | `BiomeCliExecutorAdapter` |
| infrastructure | `typescript-source-module-analyzer-adapter.test.ts` | `TypeScriptSourceModuleAnalyzerAdapter` |
| infrastructure | `node-workspace-file-adapter.test.ts` | `NodeWorkspaceFileAdapter` |
| infrastructure | `harness-config-provider-adapter.test.ts` | `HarnessConfigProviderAdapter` |
| infrastructure | `harness-error-formatter-adapter.test.ts` | `HarnessErrorFormatterAdapter` |
| infrastructure | `workspace-inventory-adapter.test.ts` | `WorkspaceInventoryAdapter` |
| infrastructure | `biome-diagnostic-mapper.test.ts` | `BiomeDiagnosticMapper` |
| infrastructure | `rule-violation-code-mapper.test.ts` | `RuleViolationCodeMapper` |
| infrastructure | `source-module-snapshot-mapper.test.ts` | `SourceModuleSnapshotMapper` |
| infrastructure | `unit-comment-parser.test.ts` | `UnitCommentParser` |
| infrastructure | `layer-comment-parser.test.ts` | `LayerCommentParser` |
| infrastructure | `comment-density-parser.test.ts` | `CommentDensityParser` |
| presentation | `harness-lint-command-handler.test.ts` | `HarnessLintCommandHandler` |
| presentation | `lint-command-parser.test.ts` | `LintCommandParser` |
| presentation | `lint-cli-presenter.test.ts` | `LintCliPresenter` |

### 1.3 共通テスト骨格

```ts
import { describe, expect, it, vi } from "vitest";
import { target, context } from "../helper/common-helper";

target("ResolveEnabledRulesUseCase.execute", () => {
  describe("L1設定に基づき有効ルールを解決する", () => {
    context("L1 enabled=trueかつ全ルールがerrorの場合", () => {
      it("8件のenabledRulesが返される", async () => {
        // Arrange
        // テストデータ、Portスタブ、SUT構築をここに集約する

        // Act
        const actual = await sut.execute(input);

        // Assert
        expect(actual).toEqual(expected);
      });
    });
  });
});
```

### 1.4 共通記述ルール

- すべての `it()` 名は `it_test_design.md` の期待値文言をそのまま使う
- `// Arrange`, `// Act`, `// Assert` を必ず明記する
- Act の戻り値または Promise は必ず `actual` に代入する
- 異常系は `const actual = sut.execute(...)` または `const actual = adapter.method(...)` とし、Assert で `await expect(actual).rejects...` を行う
- `beforeEach` で Arrange を隠さず、ケースごとの Arrange に寄せる

## 2. テストヘルパー・シードデータ

### 2.1 共通ヘルパー

| ヘルパー名 | 用途 |
|---|---|
| `target`, `context` | `describe` エイリアス |
| `createRuleConfigProviderStub()` | `RuleConfigProviderPort` スタブ生成 |
| `createClockPortStub(start, end)` | `ClockPort.now()` の固定値制御 |
| `createTempWorkspaceFromFixture()` | fixture workspace を一時ディレクトリへ複製 |
| `captureConsole()` | `stdout/stderr` の検証 |
| `createRuleViolationFixture()` | `RuleViolation` 実体の共通生成 |
| `createSourceModuleSnapshotFixture()` | `SourceModuleSnapshot` 実体の共通生成 |
| `createExecuteLintDependencies()` | `ExecuteLintUseCase` 用 Port モック束ね |

### 2.2 Fixture/シード一覧

| 配置 | 役割 | 主な使用ケース |
|---|---|---|
| `fixtures/application/metadata/missing-unit.ts` | `@unit` 欠落 | IT-BA-048, IT-BA-097〜100 |
| `fixtures/application/metadata/missing-layer.ts` | `@layer` 欠落 | IT-BA-049, IT-BA-101〜104 |
| `fixtures/application/layer-violation/invalid-domain-import.ts` | レイヤー違反 import | IT-BA-014, IT-BA-025 |
| `fixtures/application/layer-violation/valid-application-service.ts` | 正常 import | IT-BA-011〜014 |
| `fixtures/application/comment-flood/noisy-comments.ts` | コメント密度高 | IT-BA-052〜053, IT-BA-105〜110 |
| `fixtures/application/duplication/duplicate-a.ts` | 重複構造元 | IT-BA-055 |
| `fixtures/application/duplication/duplicate-b.ts` | 重複構造先 | IT-BA-055 |
| `fixtures/infrastructure/biome-json-report.json` | Biome JSON サンプル | IT-BA-045, IT-BA-083〜088 |
| `fixtures/infrastructure/package-with-eslint.json` | ESLint依存入り package.json | IT-BA-079〜082 |
| `fixtures/workspace/biome-ast-engine/` | ファイル列挙・readText 用 workspace | IT-BA-057〜064 |
| `fixtures/workspace/eslint-legacy/` | ESLint 残存検査用 workspace | IT-BA-033〜040, IT-BA-077〜082 |

### 2.3 共通スタブ初期値

```ts
function createRuleConfigProviderStub(l1Config?: Partial<L1Config>) {
  return {
    getL1Config: vi.fn().mockResolvedValue({
      enabled: true,
      rules: {},
      ...l1Config,
    }),
  };
}

function createClockPortStub(startMs: number, endMs = startMs) {
  return {
    now: vi.fn().mockReturnValueOnce(startMs).mockReturnValueOnce(endMs),
  };
}

function createConsoleCapture() {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  return { stdout, stderr };
}
```

### 2.4 共通SUT構築指針

- UseCase テストは Port だけを `vi.fn()` で差し替える
- `RuleDefinitionRegistry`, `ImportGraphBuilder`, `LintRunner` は常に実体を使う
- ファイルシステム依存は fixture を一時ディレクトリへコピーしてテスト後に削除する
- Presentation テストでは UseCase をモック化し、CLI 入出力と終了コードに絞る

## 3. UseCase統合テスト詳細ロジック

### 3.1 ResolveEnabledRulesUseCase

```ts
target("ResolveEnabledRulesUseCase.execute", () => {
  describe("L1設定に基づき有効ルールを解決する", () => {
    // RuleConfigProviderPort はケースごとに差し替える
    // RuleDefinitionRegistry は実体を使用する
  });
});
```

#### IT-BA-001
- `context()`: `L1 enabled=trueかつ全ルールがerrorの場合`
- `it()`: `8件のenabledRulesが返される`
- `Arrange`: `getL1Config()` が `enabled: true` と 8 ルールすべて `error` を返すスタブを作る。`sut` を `RuleDefinitionRegistry` 実体で構築する。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.enabledRules` の件数が 8 件であること、`actual.skippedRules` が空配列であること、返却ルール名がレジストリの全ルール名と一致することを確認する。

#### IT-BA-002
- `context()`: `L1 enabled=falseの場合`
- `it()`: `全ルールがskippedRulesに含まれる`
- `Arrange`: `getL1Config()` が `enabled: false` を返すようにする。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.enabledRules` が空配列、`actual.skippedRules` が 8 ルールすべてを含むことを確認する。

#### IT-BA-003
- `context()`: `特定ルールがoffの場合`
- `it()`: `そのルールがskippedRulesに含まれる`
- `Arrange`: 例として `no-any-abuse: "off"`、その他は `error` を返す設定にする。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.enabledRules` に `no-any-abuse` が含まれないこと、`actual.skippedRules` に `no-any-abuse` が含まれることを確認する。

#### IT-BA-004
- `context()`: `特定ルールがwarningの場合`
- `it()`: `そのルールのseverityがwarningで返される`
- `Arrange`: 例として `no-comment-flood: "warning"` を返す設定にする。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.enabledRules` から `no-comment-flood` を取り出し、`severity === "warning"` であることを確認する。

#### IT-BA-005
- `context()`: `overrideRulesで上書きした場合`
- `it()`: `上書き後の設定が反映される`
- `Arrange`: Port 側では `no-ghost-file: "error"` を返し、入力 `overrideRules` では `no-ghost-file: "off"` を渡す。
- `Act`: `const actual = await sut.execute({ overrideRules: { "no-ghost-file": "off" } })`
- `Assert`: `no-ghost-file` が `skippedRules` 側に移ることを確認する。

#### IT-BA-006
- `context()`: `overrideRulesとPort設定が競合した場合`
- `it()`: `overrideRulesが優先される`
- `Arrange`: Port 側で `require-layer-comment: "warning"`、`overrideRules` で `require-layer-comment: "error"` を与える。
- `Act`: `const actual = await sut.execute({ overrideRules: { "require-layer-comment": "error" } })`
- `Assert`: `enabledRules` 内の `require-layer-comment` の `severity` が `error` になっていることを確認する。

#### IT-BA-007
- `context()`: `不正なルール名がある場合`
- `it()`: `UnknownRuleNameErrorがスローされる`
- `Arrange`: `getL1Config()` で `rules: { "unknown-rule": "error" }` を返す。
- `Act`: `const actual = sut.execute({})`
- `Assert`: `await expect(actual).rejects.toThrow(UnknownRuleNameError)` を確認する。

#### IT-BA-008
- `context()`: `不正なseverity値がある場合`
- `it()`: `InvalidRuleSeverityErrorがスローされる`
- `Arrange`: `getL1Config()` で `rules: { "no-any-abuse": "fatal" as never }` を返す。
- `Act`: `const actual = sut.execute({})`
- `Assert`: `await expect(actual).rejects.toThrow(InvalidRuleSeverityError)` を確認する。

### 3.2 AnalyzeImportGraphUseCase

```ts
target("AnalyzeImportGraphUseCase.execute", () => {
  describe("対象ファイルを解析しImportGraphを返す", () => {
    // WorkspaceFilePort, SourceModuleAnalyzerPort はスタブ
    // ImportGraphBuilder は実体
  });
});
```

#### IT-BA-009
- `context()`: `targetsを指定しない場合`
- `it()`: `全ファイルが解析対象になる`
- `Arrange`: `listSourceFiles(undefined)` が 3 件の `FilePath` を返す。`analyzeMany()` は 3 件の snapshot を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `workspaceFilePort.listSourceFiles` が引数なし相当で呼ばれ、`actual.files` が 3 件であることを確認する。

#### IT-BA-010
- `context()`: `targetsを指定した場合`
- `it()`: `指定ファイルのみが解析対象になる`
- `Arrange`: `targets` に 2 パスを与え、`listSourceFiles(targets)` がその 2 件のみ返すようにする。
- `Act`: `const actual = await sut.execute({ targets })`
- `Assert`: `workspaceFilePort.listSourceFiles` が `targets` を受け取ること、`actual.files` が 2 件であることを確認する。

#### IT-BA-011
- `context()`: `正常解析の場合`
- `it()`: `snapshots配列が返される`
- `Arrange`: 相互 import を持つ fixture から組み立てた snapshot 配列を `analyzeMany()` で返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.snapshots` が `analyzeMany()` の返却値と等価であることを確認する。

#### IT-BA-012
- `context()`: `正常解析の場合`
- `it()`: `importGraphが返される`
- `Arrange`: `ImportGraphBuilder` が graph を構築できる snapshot 群を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.importGraph` が定義され、ノード件数が snapshot 件数と一致することを確認する。

#### IT-BA-013
- `context()`: `正常解析の場合`
- `it()`: `files配列が返される`
- `Arrange`: `listSourceFiles()` が既知の `FilePath[]` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.files` が `listSourceFiles()` の返却ファイルと順序一致することを確認する。

#### IT-BA-014
- `context()`: `import関係を持つファイル群の場合`
- `it()`: `importGraphのedgesにimport関係が含まれる`
- `Arrange`: `valid-application-service.ts` が `invalid-domain-import.ts` を import する snapshot 群を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.importGraph.edges` に source/target が期待どおりの edge が 1 件以上含まれることを確認する。

#### IT-BA-015
- `context()`: `ファイルが存在しない場合`
- `it()`: `InvalidFilePathErrorがスローされる`
- `Arrange`: `workspaceFilePort.listSourceFiles()` を `InvalidFilePathError` reject にする。
- `Act`: `const actual = sut.execute({ targets: ["missing.ts"] })`
- `Assert`: `await expect(actual).rejects.toThrow(InvalidFilePathError)` を確認する。

#### IT-BA-016
- `context()`: `index.tsが含まれる場合`
- `it()`: `rootNodesにindex.tsが含まれる`
- `Arrange`: `index.ts` を `isEntrypointCandidate=true` にした snapshot 群を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.importGraph.rootNodes` に `index.ts` の `FilePath` が含まれることを確認する。

### 3.3 ExecuteLintUseCase

```ts
target("ExecuteLintUseCase.execute", () => {
  describe("設定解決からLintReport生成まで一括実行する", () => {
    // ResolveEnabledRulesUseCase, AnalyzeImportGraphUseCase, BiomeExecutorPort はスタブ
    // LintRunner, RuleDefinitionRegistry は実体
  });
});
```

#### IT-BA-017
- `context()`: `正常実行の場合`
- `it()`: `LintReportが返される`
- `Arrange`: `resolveEnabledRulesUseCase.execute()` は enabledRules を返し、`analyzeImportGraphUseCase.execute()` は files/snapshots/importGraph を返す。`biomeExecutorPort.executeCheck()` は resolve。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.report` が `LintReport` 実体であること、`violations` や `passedRules` を参照できることを確認する。

#### IT-BA-018
- `context()`: `正常実行の場合`
- `it()`: `checkedFilesが返される`
- `Arrange`: `AnalyzeImportGraphUseCase` が 2 件の `files` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.checkedFiles` が `files` と一致することを確認する。

#### IT-BA-019
- `context()`: `ClockPortを固定した場合`
- `it()`: `durationMsが正しく計算される`
- `Arrange`: `clockPort.now()` が `1000`, `1250` を順に返すようにする。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.report.durationMs === 250` を確認し、`clockPort.now` が 2 回呼ばれることも確認する。

#### IT-BA-020
- `context()`: `includeBiomeNative=trueの場合`
- `it()`: `BiomeExecutorPort.executeCheckが呼ばれる`
- `Arrange`: `input.includeBiomeNative = true` を渡す。
- `Act`: `const actual = await sut.execute({ includeBiomeNative: true })`
- `Assert`: `biomeExecutorPort.executeCheck` が解析済み `files` で 1 回呼ばれることを確認する。

#### IT-BA-021
- `context()`: `includeBiomeNative=falseの場合`
- `it()`: `BiomeExecutorPort.executeCheckが呼ばれない`
- `Arrange`: `input.includeBiomeNative = false` を渡す。
- `Act`: `const actual = await sut.execute({ includeBiomeNative: false })`
- `Assert`: `biomeExecutorPort.executeCheck` が未呼び出しであり、`actual.report` は返ることを確認する。

#### IT-BA-022
- `context()`: `includeBiomeNativeを指定しない場合`
- `it()`: `BiomeExecutorPort.executeCheckが呼ばれる`
- `Arrange`: `includeBiomeNative` を未指定にする。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `biomeExecutorPort.executeCheck` が呼ばれることを確認する。

#### IT-BA-023
- `context()`: `BiomeCLI実行失敗の場合`
- `it()`: `BiomeExecutionFailedErrorがスローされる`
- `Arrange`: `biomeExecutorPort.executeCheck()` を `BiomeExecutionFailedError` reject にする。
- `Act`: `const actual = sut.execute({})`
- `Assert`: `await expect(actual).rejects.toThrow(BiomeExecutionFailedError)` を確認する。

#### IT-BA-024
- `context()`: `targetsを指定した場合`
- `it()`: `指定ファイルのみがcheckedFilesに含まれる`
- `Arrange`: `analyzeImportGraphUseCase.execute()` が `targets` 相当の 1 件だけ返す。
- `Act`: `const actual = await sut.execute({ targets: ["application/execute-lint-usecase.ts"] })`
- `Assert`: `actual.checkedFiles` が指定ファイル 1 件のみを含むことを確認する。

#### IT-BA-025
- `context()`: `違反がある場合`
- `it()`: `report.hasErrors()がtrueを返す`
- `Arrange`: `LintRunner` が `error` severity の違反を含む report を返せる snapshot/graph/rule 組み合わせを準備する。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.report.hasErrors() === true` を確認する。

#### IT-BA-026
- `context()`: `違反がない場合`
- `it()`: `report.hasErrors()がfalseを返す`
- `Arrange`: すべてのルールを満たす snapshot/graph を準備し、違反ゼロの report が返るようにする。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.report.hasErrors() === false` を確認する。

### 3.4 BuildHarnessErrorPayloadUseCase

```ts
target("BuildHarnessErrorPayloadUseCase.execute", () => {
  describe("RuleViolationをHarnessError形式に変換する", () => {
    // ViolationFormatterPort はスタブ
  });
});
```

#### IT-BA-027
- `context()`: `違反がある場合`
- `it()`: `L1-001〜L1-008のcodeが割り当てられる`
- `Arrange`: 8 ルール分の `RuleViolation[]` を作り、formatter スタブが 8 件の `HarnessError` を返すようにする。
- `Act`: `const actual = await sut.execute({ violations })`
- `Assert`: `actual.errors.map((error) => error.code)` が `L1-001`〜`L1-008` と一致することを確認する。

#### IT-BA-028
- `context()`: `違反が空の場合`
- `it()`: `空配列が返される`
- `Arrange`: `violations = []`、formatter は `[]` を返す。
- `Act`: `const actual = await sut.execute({ violations: [] })`
- `Assert`: `actual.errors` が空配列であることを確認する。

#### IT-BA-029
- `context()`: `fixExampleがある場合`
- `it()`: `fix_exampleが出力に含まれる`
- `Arrange`: `fixExample` を持つ違反 1 件を作り、formatter が `fix_example` 付きオブジェクトを返す。
- `Act`: `const actual = await sut.execute({ violations })`
- `Assert`: `actual.errors[0].fix_example` が定義されることを確認する。

#### IT-BA-030
- `context()`: `fixExampleがない場合`
- `it()`: `fix_exampleが出力に含まれない`
- `Arrange`: `fixExample` を持たない違反 1 件を使う。
- `Act`: `const actual = await sut.execute({ violations })`
- `Assert`: `actual.errors[0]` に `fix_example` プロパティが存在しないことを確認する。

#### IT-BA-031
- `context()`: `adr_refがある場合`
- `it()`: `adr_refが出力に含まれる`
- `Arrange`: `adrRef` を持つルール定義由来の違反を使う。
- `Act`: `const actual = await sut.execute({ violations })`
- `Assert`: `actual.errors[0].adr_ref` が期待値と一致することを確認する。

#### IT-BA-032
- `context()`: `複数違反がある場合`
- `it()`: `全違反が変換される`
- `Arrange`: 3 件以上の違反を与え、formatter が同数の配列を返す。
- `Act`: `const actual = await sut.execute({ violations })`
- `Assert`: `actual.errors` の件数と順序が入力違反配列に対応することを確認する。

### 3.5 VerifyEslintRemovalUseCase

```ts
target("VerifyEslintRemovalUseCase.execute", () => {
  describe("ESLint資産の残存を検査する", () => {
    // WorkspaceInventoryPort はスタブ
  });
});
```

#### IT-BA-033
- `context()`: `設定ファイルが残存している場合`
- `it()`: `hasLegacyArtifacts=trueが返される`
- `Arrange`: `findLegacyEslintArtifacts()` が `configFiles: [".eslintrc.cjs"]` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.hasLegacyArtifacts === true` を確認する。

#### IT-BA-034
- `context()`: `設定ファイルが残存している場合`
- `it()`: `configFilesに残存ファイル名が含まれる`
- `Arrange`: `configFiles` に `.eslintrc.cjs`, `eslint.config.js` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.configFiles` に両ファイル名が含まれることを確認する。

#### IT-BA-035
- `context()`: `package依存が残存している場合`
- `it()`: `hasLegacyArtifacts=trueが返される`
- `Arrange`: `packageDependencies: ["eslint"]` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.hasLegacyArtifacts === true` を確認する。

#### IT-BA-036
- `context()`: `package依存が残存している場合`
- `it()`: `packageDependenciesに依存名が含まれる`
- `Arrange`: `packageDependencies: ["eslint", "@typescript-eslint/parser"]` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.packageDependencies` に両依存が含まれることを確認する。

#### IT-BA-037
- `context()`: `残存がない場合`
- `it()`: `hasLegacyArtifacts=falseが返される`
- `Arrange`: `configFiles: []`, `packageDependencies: []` を返す。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.hasLegacyArtifacts === false` を確認する。

#### IT-BA-038
- `context()`: `残存がない場合`
- `it()`: `configFilesとpackageDependenciesが空配列で返される`
- `Arrange`: 残存ゼロの返却値を使う。
- `Act`: `const actual = await sut.execute({})`
- `Assert`: `actual.configFiles` と `actual.packageDependencies` がどちらも空配列であることを確認する。

#### IT-BA-039
- `context()`: `failOnLegacyArtifacts=trueで残存ありの場合`
- `it()`: `LegacyEslintArtifactDetectedErrorがスローされる`
- `Arrange`: 残存あり返却値を使い、入力で `failOnLegacyArtifacts: true` を渡す。
- `Act`: `const actual = sut.execute({ failOnLegacyArtifacts: true })`
- `Assert`: `await expect(actual).rejects.toThrow(LegacyEslintArtifactDetectedError)` を確認する。

#### IT-BA-040
- `context()`: `failOnLegacyArtifacts=falseで残存ありの場合`
- `it()`: `エラーはスローされずDTOが返される`
- `Arrange`: 残存あり返却値を使い、`failOnLegacyArtifacts: false` を渡す。
- `Act`: `const actual = await sut.execute({ failOnLegacyArtifacts: false })`
- `Assert`: `actual.hasLegacyArtifacts === true` かつ例外が出ないことを確認する。

## 4. Adapter統合テスト詳細ロジック

### 4.1 Infrastructure Adapter

#### 4.1.1 BiomeCliExecutorAdapter

```ts
target("BiomeCliExecutorAdapter.executeCheck", () => {
  describe("Biome CLIをサブプロセスで実行する", () => {
    // fixture ファイルを一時ディレクトリに配置し、実Biome CLIまたは process runner stub を使う
  });
});
```

##### IT-BA-041
- `context()`: `正常なTSファイルの場合`
- `it()`: `エラーなく完了する`
- `Arrange`: 正常な TypeScript fixture 1 件を一時 workspace に配置し、`sut` を実CLI実行可能な状態で構築する。
- `Act`: `const actual = adapter.executeCheck([filePath])`
- `Assert`: `await expect(actual).resolves.toBeUndefined()` を確認する。

##### IT-BA-042
- `context()`: `Biome診断エラーがある場合`
- `it()`: `BiomeExecutionFailedErrorがスローされる`
- `Arrange`: Biome が違反を返す fixture を用意する。
- `Act`: `const actual = adapter.executeCheck([invalidFilePath])`
- `Assert`: `await expect(actual).rejects.toThrow(BiomeExecutionFailedError)` を確認する。

##### IT-BA-043
- `context()`: `CLIが見つからない場合`
- `it()`: `BiomeExecutionFailedErrorがスローされる`
- `Arrange`: `node-process-runner` 相当を差し替え、`ENOENT` を返す stub にする。
- `Act`: `const actual = adapter.executeCheck([filePath])`
- `Assert`: `await expect(actual).rejects.toThrow(BiomeExecutionFailedError)` を確認する。

##### IT-BA-044
- `context()`: `非0終了コードの場合`
- `it()`: `BiomeExecutionFailedErrorがスローされる`
- `Arrange`: プロセス実行結果を `exitCode: 1` にする。
- `Act`: `const actual = adapter.executeCheck([filePath])`
- `Assert`: `await expect(actual).rejects.toThrow(BiomeExecutionFailedError)` を確認する。

##### IT-BA-045
- `context()`: `JSON出力が不正な場合`
- `it()`: `BiomeExecutionFailedErrorがスローされる`
- `Arrange`: `stdout` に壊れた JSON 文字列を返すようにする。
- `Act`: `const actual = adapter.executeCheck([filePath])`
- `Assert`: `await expect(actual).rejects.toThrow(BiomeExecutionFailedError)` を確認する。

##### IT-BA-046
- `context()`: `複数ファイルを指定した場合`
- `it()`: `全ファイルが検査対象となる`
- `Arrange`: 正常ファイルを 2 件以上渡す。
- `Act`: `const actual = await adapter.executeCheck([fileA, fileB])`
- `Assert`: process runner 呼び出し引数に両パスが含まれること、例外なく完了することを確認する。

#### 4.1.2 TypeScriptSourceModuleAnalyzerAdapter

```ts
target("TypeScriptSourceModuleAnalyzerAdapter.analyzeMany", () => {
  describe("TSファイル群をAST解析する", () => {
    // fixture TS を Compiler API で解析する
  });
});
```

##### IT-BA-047
- `context()`: `import宣言があるファイルの場合`
- `it()`: `imports配列が正しく抽出される`
- `Arrange`: import 宣言を持つ fixture を読み込む。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].imports` に import 先 path と kind が含まれることを確認する。

##### IT-BA-048
- `context()`: `@unitコメントがあるファイルの場合`
- `it()`: `declaredUnitが正しく抽出される`
- `Arrange`: `// @unit biome-ast-engine` を持つ fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].declaredUnit === "biome-ast-engine"` を確認する。

##### IT-BA-049
- `context()`: `@layerコメントがあるファイルの場合`
- `it()`: `declaredLayerが正しく抽出される`
- `Arrange`: `// @layer domain` を持つ fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].declaredLayer.toString() === "domain"` を確認する。

##### IT-BA-050
- `context()`: `any型を含むファイルの場合`
- `it()`: `anyTypeCountが正しくカウントされる`
- `Arrange`: `any` 型を 1 箇所以上含む fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].anyTypeCount` が期待件数と一致することを確認する。

##### IT-BA-051
- `context()`: `型注釈を持つファイルの場合`
- `it()`: `typedNodeCountが正しくカウントされる`
- `Arrange`: 型注釈を複数持つ fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].typedNodeCount` が 0 より大きく、期待値と一致することを確認する。

##### IT-BA-052
- `context()`: `コメントが多いファイルの場合`
- `it()`: `commentLineCount/logicalLineCountが正しくカウントされる`
- `Arrange`: `noisy-comments.ts` を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].commentLineCount` と `actual[0].logicalLineCount` が fixture の行構成どおりであることを確認する。

##### IT-BA-053
- `context()`: `重複コメントブロックがあるファイルの場合`
- `it()`: `repeatedCommentBlocksが正しくカウントされる`
- `Arrange`: 同一コメントブロックを反復する fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].repeatedCommentBlocks` が期待件数と一致することを確認する。

##### IT-BA-054
- `context()`: `export宣言があるファイルの場合`
- `it()`: `exportedSymbolsが正しく抽出される`
- `Arrange`: `export class`, `export const`, `export type` を含む fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([filePath])`
- `Assert`: `actual[0].exportedSymbols` に宣言名が含まれることを確認する。

##### IT-BA-055
- `context()`: `構造フィンガープリントが生成可能なファイルの場合`
- `it()`: `duplicationFingerprintsが抽出される`
- `Arrange`: `duplicate-a.ts`, `duplicate-b.ts` を解析対象に含める。
- `Act`: `const actual = await adapter.analyzeMany([fileA, fileB])`
- `Assert`: どちらの snapshot にも `duplicationFingerprints.length > 0` であることを確認する。

##### IT-BA-056
- `context()`: `index.tsの場合`
- `it()`: `isEntrypointCandidateがtrueで返される`
- `Arrange`: `index.ts` fixture を使う。
- `Act`: `const actual = await adapter.analyzeMany([indexFilePath])`
- `Assert`: `actual[0].isEntrypointCandidate === true` を確認する。

#### 4.1.3 NodeWorkspaceFileAdapter

```ts
target("NodeWorkspaceFileAdapter", () => {
  describe("ワークスペースのソースファイルを扱う", () => {
    // fixture workspace を temp dir に展開する
  });
});
```

##### IT-BA-057
- `context()`: `targetsを指定しない場合`
- `it()`: `配下の.ts/.tsx/.mts/.ctsが返される`
- `Arrange`: 複数拡張子を含む temp workspace を用意する。
- `Act`: `const actual = await adapter.listSourceFiles()`
- `Assert`: `actual` に 4 拡張子のファイルが含まれることを確認する。

##### IT-BA-058
- `context()`: `node_modules/dist/coverage等がある場合`
- `it()`: `除外される`
- `Arrange`: 除外対象ディレクトリ配下にも TS ファイルを配置する。
- `Act`: `const actual = await adapter.listSourceFiles()`
- `Assert`: 返却ファイルに除外ディレクトリ配下のパスが含まれないことを確認する。

##### IT-BA-059
- `context()`: `__fixtures__がある場合`
- `it()`: `除外される`
- `Arrange`: `__fixtures__/dummy.ts` を配置する。
- `Act`: `const actual = await adapter.listSourceFiles()`
- `Assert`: `actual` に `__fixtures__` 配下ファイルが含まれないことを確認する。

##### IT-BA-060
- `context()`: `targetsを指定した場合`
- `it()`: `指定パスに一致するファイルのみ返される`
- `Arrange`: 3 ファイル中 1 ファイルだけにマッチする `targets` を与える。
- `Act`: `const actual = await adapter.listSourceFiles(targets)`
- `Assert`: 返却件数が 1 件で、該当ファイルだけを含むことを確認する。

##### IT-BA-061
- `context()`: `返却されるファイルパスの場合`
- `it()`: `プロジェクト相対パスのFilePath形式で返される`
- `Arrange`: workspace ルートを固定し、絶対パス入力から `FilePath` を組み立てさせる。
- `Act`: `const actual = await adapter.listSourceFiles()`
- `Assert`: 各 `actual[i].value` が絶対パスではなくプロジェクト相対パスであることを確認する。

##### IT-BA-062
- `context()`: `存在するファイルの場合`
- `it()`: `ファイル内容が文字列で返される`
- `Arrange`: 既知内容の fixture ファイルを置く。
- `Act`: `const actual = await adapter.readText(filePath)`
- `Assert`: `actual` が fixture 内容と完全一致することを確認する。

##### IT-BA-063
- `context()`: `存在しないファイルの場合`
- `it()`: `エラーがスローされる`
- `Arrange`: 未作成パスを `FilePath` 化して渡す。
- `Act`: `const actual = adapter.readText(missingFilePath)`
- `Assert`: `await expect(actual).rejects.toThrow()` を確認する。

##### IT-BA-064
- `context()`: `存在するファイルの場合`
- `it()`: `trueが返される`
- `Arrange`: 既存ファイルを 1 件用意する。
- `Act`: `const actual = await adapter.exists(filePath)`
- `Assert`: `actual === true` を確認する。

#### 4.1.4 HarnessConfigProviderAdapter

```ts
target("HarnessConfigProviderAdapter.getL1Config", () => {
  describe("L1設定を取得する", () => {
    // config-foundation 公開Facadeまたは同等のスタブを使う
  });
});
```

##### IT-BA-065
- `context()`: `正常なharness.config.jsonがある場合`
- `it()`: `enabled/rulesが返される`
- `Arrange`: `layers.L1.enabled` と `layers.L1.rules` を持つ設定 fixture を返すスタブを用意する。
- `Act`: `const actual = await adapter.getL1Config()`
- `Assert`: `actual.enabled` と `actual.rules` が設定値どおりであることを確認する。

##### IT-BA-066
- `context()`: `layers.L1が未定義の場合`
- `it()`: `既定値{ enabled: true, rules: {} }が返される`
- `Arrange`: `layers` に `L1` を含まない設定を返す。
- `Act`: `const actual = await adapter.getL1Config()`
- `Assert`: `actual` が既定値と一致することを確認する。

##### IT-BA-067
- `context()`: `harness.config.jsonが存在しない場合`
- `it()`: `既定値が返される`
- `Arrange`: 設定読取 API を「未存在」扱いで返す。
- `Act`: `const actual = await adapter.getL1Config()`
- `Assert`: `actual.enabled === true` かつ `actual.rules` が空オブジェクトであることを確認する。

##### IT-BA-068
- `context()`: `L1.rulesに8ルール全てが定義されている場合`
- `it()`: `全ルール設定が返される`
- `Arrange`: 8 ルールすべてを `error/warning/off` 混在で定義した設定を返す。
- `Act`: `const actual = await adapter.getL1Config()`
- `Assert`: `Object.keys(actual.rules)` が 8 件で、すべてのルール名を含むことを確認する。

##### IT-BA-069
- `context()`: `L1.rulesが部分的に定義されている場合`
- `it()`: `定義済みルールの設定のみ返される`
- `Arrange`: 2 ルールだけ定義した設定を返す。
- `Act`: `const actual = await adapter.getL1Config()`
- `Assert`: `actual.rules` にその 2 ルールだけが含まれることを確認する。

##### IT-BA-070
- `context()`: `L1.enabledがfalseの場合`
- `it()`: `enabled=falseが返される`
- `Arrange`: `enabled: false` を返す。
- `Act`: `const actual = await adapter.getL1Config()`
- `Assert`: `actual.enabled === false` を確認する。

#### 4.1.5 HarnessErrorFormatterAdapter

```ts
target("HarnessErrorFormatterAdapter.format", () => {
  describe("RuleViolationをHarnessError互換形式に変換する", () => {
    // RuleViolation と RuleDefinition は実体を使う
  });
});
```

##### IT-BA-071
- `context()`: `require-unit-commentの違反がある場合`
- `it()`: `code=L1-001が設定される`
- `Arrange`: `ruleName=require-unit-comment` の違反を 1 件作る。
- `Act`: `const actual = await adapter.format([violation])`
- `Assert`: `actual[0].code === "L1-001"` を確認する。

##### IT-BA-072
- `context()`: `8ルール各々の違反がある場合`
- `it()`: `対応するL1-001〜L1-008のcodeが設定される`
- `Arrange`: 8 ルール分の違反を作る。
- `Act`: `const actual = await adapter.format(violations)`
- `Assert`: 8 件の `code` が対応表どおりであることを確認する。

##### IT-BA-073
- `context()`: `fixExampleがある場合`
- `it()`: `fix_exampleが出力に含まれる`
- `Arrange`: `fixExample` を持つ違反を使う。
- `Act`: `const actual = await adapter.format([violation])`
- `Assert`: `actual[0].fix_example` が定義されることを確認する。

##### IT-BA-074
- `context()`: `fixExampleがない場合`
- `it()`: `fix_exampleが出力に含まれない`
- `Arrange`: `fixExample` なしの違反を使う。
- `Act`: `const actual = await adapter.format([violation])`
- `Assert`: `actual[0]` に `fix_example` がないことを確認する。

##### IT-BA-075
- `context()`: `suggestionが標準値の場合`
- `it()`: `標準suggestionが出力に含まれる`
- `Arrange`: ルール定義に標準 `suggestion` を持つ違反を使う。
- `Act`: `const actual = await adapter.format([violation])`
- `Assert`: `actual[0].suggestion` がルール定義の標準 suggestion と一致することを確認する。

##### IT-BA-076
- `context()`: `severityがwarningの場合`
- `it()`: `severity=warningが出力に設定される`
- `Arrange`: `severity="warning"` の違反を作る。
- `Act`: `const actual = await adapter.format([violation])`
- `Assert`: `actual[0].severity === "warning"` を確認する。

#### 4.1.6 WorkspaceInventoryAdapter

```ts
target("WorkspaceInventoryAdapter.findLegacyEslintArtifacts", () => {
  describe("ESLint残存を検出する", () => {
    // eslint-legacy fixture を temp dir へ展開して検査する
  });
});
```

##### IT-BA-077
- `context()`: `.eslintrc.cjsが存在する場合`
- `it()`: `configFilesに含まれる`
- `Arrange`: temp workspace に `.eslintrc.cjs` を置く。
- `Act`: `const actual = await adapter.findLegacyEslintArtifacts()`
- `Assert`: `actual.configFiles` に `.eslintrc.cjs` が含まれることを確認する。

##### IT-BA-078
- `context()`: `eslint.config.jsが存在する場合`
- `it()`: `configFilesに含まれる`
- `Arrange`: temp workspace に `eslint.config.js` を置く。
- `Act`: `const actual = await adapter.findLegacyEslintArtifacts()`
- `Assert`: `actual.configFiles` に `eslint.config.js` が含まれることを確認する。

##### IT-BA-079
- `context()`: `package.jsonにeslint依存がある場合`
- `it()`: `packageDependenciesに含まれる`
- `Arrange`: `package-with-eslint.json` を workspace の `package.json` として置く。
- `Act`: `const actual = await adapter.findLegacyEslintArtifacts()`
- `Assert`: `actual.packageDependencies` に `eslint` が含まれることを確認する。

##### IT-BA-080
- `context()`: `package.jsonに@typescript-eslint依存がある場合`
- `it()`: `packageDependenciesに含まれる`
- `Arrange`: `@typescript-eslint/parser` 等を含む `package.json` を使う。
- `Act`: `const actual = await adapter.findLegacyEslintArtifacts()`
- `Assert`: `actual.packageDependencies` に `@typescript-eslint/` 系依存が含まれることを確認する。

##### IT-BA-081
- `context()`: `ESLint関連が一切ない場合`
- `it()`: `空の結果が返される`
- `Arrange`: 設定ファイルも依存もない workspace を作る。
- `Act`: `const actual = await adapter.findLegacyEslintArtifacts()`
- `Assert`: `actual.configFiles` と `actual.packageDependencies` が空配列であることを確認する。

##### IT-BA-082
- `context()`: `複数のESLint設定ファイルと依存が残存している場合`
- `it()`: `全てが検出される`
- `Arrange`: `.eslintrc.cjs`, `eslint.config.js`, `eslint`, `@typescript-eslint/parser` をすべて含む workspace を作る。
- `Act`: `const actual = await adapter.findLegacyEslintArtifacts()`
- `Assert`: `configFiles` と `packageDependencies` が全項目を漏れなく含むことを確認する。

### 4.2 Mapper / Parser

#### 4.2.1 BiomeDiagnosticMapper

```ts
target("BiomeDiagnosticMapper.map", () => {
  describe("Biome JSON診断をRuleViolationに変換する", () => {
    // biome-json-report.json を読み込んで map する
  });
});
```

##### IT-BA-083
- `context()`: `正常なBiome JSON出力の場合`
- `it()`: `RuleViolation配列が返される`
- `Arrange`: 正常な JSON オブジェクトを fixture から読み込む。
- `Act`: `const actual = mapper.map(parsedJson)`
- `Assert`: `actual` が配列であり、先頭要素が `RuleViolation` 互換構造を持つことを確認する。

##### IT-BA-084
- `context()`: `複数診断を含むJSON出力の場合`
- `it()`: `全診断がRuleViolationに変換される`
- `Arrange`: 診断 2 件以上の JSON を使う。
- `Act`: `const actual = mapper.map(parsedJson)`
- `Assert`: `actual.length` が診断件数と一致することを確認する。

##### IT-BA-085
- `context()`: `不正なJSON構造の場合`
- `it()`: `エラーがスローされる`
- `Arrange`: 必須フィールド欠落のオブジェクトを渡す。
- `Act`: `const actual = Promise.resolve().then(() => mapper.map(invalidJson))`
- `Assert`: `await expect(actual).rejects.toThrow()` を確認する。

##### IT-BA-086
- `context()`: `診断が空の場合`
- `it()`: `空配列が返される`
- `Arrange`: 診断配列が空の JSON を用意する。
- `Act`: `const actual = mapper.map(emptyJson)`
- `Assert`: `actual` が空配列であることを確認する。

##### IT-BA-087
- `context()`: `filePath/line/columnが含まれる診断の場合`
- `it()`: `RuleViolationの位置情報が正しく設定される`
- `Arrange`: 位置情報を持つ診断を使う。
- `Act`: `const actual = mapper.map(parsedJson)`
- `Assert`: `actual[0].filePath`, `line`, `column` が診断値と一致することを確認する。

##### IT-BA-088
- `context()`: `severity情報が含まれる診断の場合`
- `it()`: `RuleViolationのseverityが正しく設定される`
- `Arrange`: `warning` または `error` 診断を使う。
- `Act`: `const actual = mapper.map(parsedJson)`
- `Assert`: `actual[0].severity` が診断の severity と一致することを確認する。

#### 4.2.2 RuleViolationCodeMapper

```ts
target("RuleViolationCodeMapper.toErrorCode", () => {
  describe("ルール名をL1コードに変換する", () => {});
});
```

##### IT-BA-089
- `context()`: `require-unit-commentの場合`
- `it()`: `L1-001が返される`
- `Arrange`: 入力ルール名に `require-unit-comment` を用意する。
- `Act`: `const actual = mapper.toErrorCode("require-unit-comment")`
- `Assert`: `actual === "L1-001"` を確認する。

##### IT-BA-090
- `context()`: `8ルール各々の場合`
- `it()`: `L1-001〜L1-008が正しく返される`
- `Arrange`: 8 ルール名を配列で持つ。
- `Act`: `const actual = ruleNames.map((ruleName) => mapper.toErrorCode(ruleName))`
- `Assert`: `actual` が `["L1-001", ..., "L1-008"]` と一致することを確認する。

##### IT-BA-091
- `context()`: `未定義ルール名の場合`
- `it()`: `エラーがスローされる`
- `Arrange`: `unknown-rule` を入力する。
- `Act`: `const actual = Promise.resolve().then(() => mapper.toErrorCode("unknown-rule"))`
- `Assert`: `await expect(actual).rejects.toThrow()` を確認する。

##### IT-BA-092
- `context()`: `空文字の場合`
- `it()`: `エラーがスローされる`
- `Arrange`: `""` を入力する。
- `Act`: `const actual = Promise.resolve().then(() => mapper.toErrorCode(""))`
- `Assert`: `await expect(actual).rejects.toThrow()` を確認する。

#### 4.2.3 SourceModuleSnapshotMapper

```ts
target("SourceModuleSnapshotMapper.map", () => {
  describe("AST抽出結果をSourceModuleSnapshotに変換する", () => {});
});
```

##### IT-BA-093
- `context()`: `全属性が揃った抽出結果の場合`
- `it()`: `全フィールドが正しく設定されたSourceModuleSnapshotが返される`
- `Arrange`: imports, metadata, counts, exports, fingerprints をすべて含む抽出結果 DTO を作る。
- `Act`: `const actual = mapper.map(rawAnalysisResult)`
- `Assert`: 各フィールドが DTO の値と一致することを確認する。

##### IT-BA-094
- `context()`: `declaredUnit/declaredLayerがnullの場合`
- `it()`: `null値が保持されたSourceModuleSnapshotが返される`
- `Arrange`: `declaredUnit=null`, `declaredLayer=null` の DTO を作る。
- `Act`: `const actual = mapper.map(rawAnalysisResult)`
- `Assert`: `actual.declaredUnit === null` かつ `actual.declaredLayer === null` を確認する。

##### IT-BA-095
- `context()`: `数値属性が0の場合`
- `it()`: `0値が正しく設定される`
- `Arrange`: `anyTypeCount`, `typedNodeCount`, `commentLineCount`, `logicalLineCount`, `repeatedCommentBlocks` をすべて 0 にする。
- `Act`: `const actual = mapper.map(rawAnalysisResult)`
- `Assert`: 各数値フィールドが 0 を保持することを確認する。

##### IT-BA-096
- `context()`: `不正なdeclaredLayerが含まれる場合`
- `it()`: `InvalidLayerNameErrorがスローされる`
- `Arrange`: `declaredLayer="usecase"` を含む DTO を作る。
- `Act`: `const actual = Promise.resolve().then(() => mapper.map(rawAnalysisResult))`
- `Assert`: `await expect(actual).rejects.toThrow(InvalidLayerNameError)` を確認する。

#### 4.2.4 UnitCommentParser

```ts
target("UnitCommentParser.parse", () => {
  describe("ソースコードから@unitを抽出する", () => {});
});
```

##### IT-BA-097
- `context()`: `正規コメント // @unit biome-ast-engine がある場合`
- `it()`: `"biome-ast-engine"が抽出される`
- `Arrange`: 正規 `@unit` コメント付きソース文字列を用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === "biome-ast-engine"` を確認する。

##### IT-BA-098
- `context()`: `@unitコメントがない場合`
- `it()`: `nullが返される`
- `Arrange`: `@unit` を含まないソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === null` を確認する。

##### IT-BA-099
- `context()`: `不正なフォーマット // @unit の場合`
- `it()`: `nullが返される`
- `Arrange`: ユニット名欠落のコメントを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === null` を確認する。

##### IT-BA-100
- `context()`: `複数の@unitコメントがある場合`
- `it()`: `最初の値が抽出される`
- `Arrange`: 異なる `@unit` コメントを 2 行以上並べる。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: 先頭のユニット名だけが返ることを確認する。

#### 4.2.5 LayerCommentParser

```ts
target("LayerCommentParser.parse", () => {
  describe("ソースコードから@layerを抽出する", () => {});
});
```

##### IT-BA-101
- `context()`: `正規コメント // @layer domain がある場合`
- `it()`: `"domain"が抽出される`
- `Arrange`: 正規 `@layer` コメント付きソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === "domain"` を確認する。

##### IT-BA-102
- `context()`: `@layerコメントがない場合`
- `it()`: `nullが返される`
- `Arrange`: `@layer` を含まないソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === null` を確認する。

##### IT-BA-103
- `context()`: `不正なフォーマット // @layer の場合`
- `it()`: `nullが返される`
- `Arrange`: レイヤー名欠落コメントを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === null` を確認する。

##### IT-BA-104
- `context()`: `v0語彙（port/usecase/controller）が指定された場合`
- `it()`: `nullが返される`
- `Arrange`: `// @layer usecase` 等を含むソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual === null` を確認する。

#### 4.2.6 CommentDensityParser

```ts
target("CommentDensityParser.parse", () => {
  describe("コメント密度と重複ブロックを算出する", () => {});
});
```

##### IT-BA-105
- `context()`: `コメントが多いソースの場合`
- `it()`: `正しいcommentLineCountが返される`
- `Arrange`: 行コメント多数の fixture を読み込む。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual.commentLineCount` が手計算値と一致することを確認する。

##### IT-BA-106
- `context()`: `コメントが多いソースの場合`
- `it()`: `正しいlogicalLineCountが返される`
- `Arrange`: 同じ fixture を使う。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual.logicalLineCount` が空行・コメントのみ行を除いた期待値と一致することを確認する。

##### IT-BA-107
- `context()`: `同一コメントが反復している場合`
- `it()`: `repeatedCommentBlocksが正しく算出される`
- `Arrange`: 同じコメントブロックが複数回現れるソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual.repeatedCommentBlocks` が期待件数と一致することを確認する。

##### IT-BA-108
- `context()`: `コメントがないソースの場合`
- `it()`: `commentLineCount=0が返される`
- `Arrange`: コメントゼロのソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual.commentLineCount === 0` を確認する。

##### IT-BA-109
- `context()`: `ブロックコメント（/* */）がある場合`
- `it()`: `ブロックコメントの行数がカウントされる`
- `Arrange`: 複数行ブロックコメントを含むソースを用意する。
- `Act`: `const actual = parser.parse(sourceText)`
- `Assert`: `actual.commentLineCount` にブロックコメント行数が加算されていることを確認する。

##### IT-BA-110
- `context()`: `空ファイルの場合`
- `it()`: `commentLineCount=0, logicalLineCount=0が返される`
- `Arrange`: 空文字列を渡す。
- `Act`: `const actual = parser.parse("")`
- `Assert`: `actual.commentLineCount === 0` かつ `actual.logicalLineCount === 0` を確認する。

### 4.3 Presentation

#### 4.3.1 HarnessLintCommandHandler

```ts
target("HarnessLintCommandHandler.execute", () => {
  describe("harness:lintコマンドを実行する", () => {
    // UseCase はモック、stdout/stderr は capture する
  });
});
```

##### IT-BA-111
- `context()`: `違反なし・ESLint残存なしの場合`
- `it()`: `終了コード0が返される`
- `Arrange`: parser は正常引数 DTO、`executeLintUseCase` は違反なし report、`verifyEslintRemovalUseCase` は残存なし DTO、formatter/presenter は成功出力を返す。
- `Act`: `const actual = await handler.execute(argv)`
- `Assert`: `actual === 0` を確認する。

##### IT-BA-112
- `context()`: `ルール違反がある場合`
- `it()`: `終了コード1が返される`
- `Arrange`: `executeLintUseCase` が `hasErrors() === true` の report を返す。
- `Act`: `const actual = await handler.execute(argv)`
- `Assert`: `actual === 1` を確認する。

##### IT-BA-113
- `context()`: `ESLint残存がある場合`
- `it()`: `終了コード1が返される`
- `Arrange`: `verifyEslintRemovalUseCase` が `hasLegacyArtifacts=true` を返す。
- `Act`: `const actual = await handler.execute(argv)`
- `Assert`: `actual === 1` を確認する。

##### IT-BA-114
- `context()`: `設定読取失敗の場合`
- `it()`: `終了コード2が返される`
- `Arrange`: `executeLintUseCase.execute()` を設定読取系例外 reject にする。
- `Act`: `const actual = await handler.execute(argv)`
- `Assert`: `actual === 2` を確認する。

##### IT-BA-115
- `context()`: `BiomeCLI実行失敗の場合`
- `it()`: `終了コード2が返される`
- `Arrange`: `executeLintUseCase.execute()` を `BiomeExecutionFailedError` reject にする。
- `Act`: `const actual = await handler.execute(argv)`
- `Assert`: `actual === 2` を確認する。

##### IT-BA-116
- `context()`: `--jsonフラグが指定された場合`
- `it()`: `HarnessApiResponse形式のJSONが出力される`
- `Arrange`: parser が `json: true` を返す。presenter は JSON 文字列を返す。
- `Act`: `const actual = await handler.execute(["--json"])`
- `Assert`: `stdout` に JSON 文字列が書き込まれること、終了コードが 0 または 1 の期待値であることを確認する。

##### IT-BA-117
- `context()`: `--targetフラグが指定された場合`
- `it()`: `対象ファイルが限定される`
- `Arrange`: parser が `targets` を含む DTO を返す。
- `Act`: `const actual = await handler.execute(["--target", "application/execute-lint-usecase.ts"])`
- `Assert`: `executeLintUseCase.execute` が同じ `targets` を受け取ることを確認する。

##### IT-BA-118
- `context()`: `--skip-eslint-removal-checkが指定された場合`
- `it()`: `VerifyEslintRemovalUseCaseが呼ばれない`
- `Arrange`: parser が `skipEslintRemovalCheck: true` を返す。
- `Act`: `const actual = await handler.execute(["--skip-eslint-removal-check"])`
- `Assert`: `verifyEslintRemovalUseCase.execute` が未呼び出しであることを確認する。

##### IT-BA-119
- `context()`: `不正フラグが指定された場合`
- `it()`: `Usageが出力され終了コード2が返される`
- `Arrange`: parser が Usage エラーを throw または error DTO を返す。
- `Act`: `const actual = await handler.execute(["--unknown"])`
- `Assert`: `stderr` または `stdout` に Usage 文言が含まれ、`actual === 2` であることを確認する。

##### IT-BA-120
- `context()`: `不正フラグが指定された場合`
- `it()`: `UseCaseが呼び出されない`
- `Arrange`: IT-BA-119 と同じ異常入力を使う。
- `Act`: `const actual = await handler.execute(["--unknown"])`
- `Assert`: `executeLintUseCase.execute`, `verifyEslintRemovalUseCase.execute`, `buildHarnessErrorPayloadUseCase.execute` が未呼び出しであることを確認する。

#### 4.3.2 LintCommandParser

```ts
target("LintCommandParser.parse", () => {
  describe("CLI引数を解釈する", () => {});
});
```

##### IT-BA-121
- `context()`: `引数なしの場合`
- `it()`: `既定値（全体検査、テキスト出力、ESLint検査あり）が返される`
- `Arrange`: `argv = []` を用意する。
- `Act`: `const actual = parser.parse(argv)`
- `Assert`: `actual.targets === undefined`, `actual.json === false`, `actual.skipEslintRemovalCheck === false` を確認する。

##### IT-BA-122
- `context()`: `--jsonフラグが指定された場合`
- `it()`: `json=trueが返される`
- `Arrange`: `argv = ["--json"]`
- `Act`: `const actual = parser.parse(argv)`
- `Assert`: `actual.json === true` を確認する。

##### IT-BA-123
- `context()`: `--target path1 path2が指定された場合`
- `it()`: `targetsにpath1/path2が含まれる`
- `Arrange`: `argv = ["--target", "path1", "path2"]`
- `Act`: `const actual = parser.parse(argv)`
- `Assert`: `actual.targets` が `["path1", "path2"]` と一致することを確認する。

##### IT-BA-124
- `context()`: `--skip-eslint-removal-checkが指定された場合`
- `it()`: `skipEslintRemovalCheck=trueが返される`
- `Arrange`: `argv = ["--skip-eslint-removal-check"]`
- `Act`: `const actual = parser.parse(argv)`
- `Assert`: `actual.skipEslintRemovalCheck === true` を確認する。

##### IT-BA-125
- `context()`: `不正なフラグが指定された場合`
- `it()`: `Usageエラーが返される`
- `Arrange`: `argv = ["--unknown"]`
- `Act`: `const actual = Promise.resolve().then(() => parser.parse(argv))`
- `Assert`: `await expect(actual).rejects.toThrow(/Usage/)` を確認する。

##### IT-BA-126
- `context()`: `複数フラグを組み合わせた場合`
- `it()`: `全フラグが正しく解釈される`
- `Arrange`: `argv = ["--json", "--target", "path1", "path2", "--skip-eslint-removal-check"]`
- `Act`: `const actual = parser.parse(argv)`
- `Assert`: `json=true`, `targets=["path1", "path2"]`, `skipEslintRemovalCheck=true` をすべて確認する。

#### 4.3.3 LintCliPresenter

```ts
target("LintCliPresenter.format", () => {
  describe("実行結果を出力文字列に変換する", () => {});
});
```

##### IT-BA-127
- `context()`: `テキスト出力で違反ありの場合`
- `it()`: `違反件数と代表違反が含まれる`
- `Arrange`: 違反 3 件以上の `LintReport` と `HarnessError[]` を用意する。
- `Act`: `const actual = presenter.format({ output: "text", ...payload })`
- `Assert`: `actual` に違反件数と代表違反メッセージが含まれることを確認する。

##### IT-BA-128
- `context()`: `テキスト出力で違反なしの場合`
- `it()`: `成功メッセージが含まれる`
- `Arrange`: 違反ゼロの payload を用意する。
- `Act`: `const actual = presenter.format({ output: "text", ...payload })`
- `Assert`: `actual` に成功メッセージが含まれることを確認する。

##### IT-BA-129
- `context()`: `JSON出力の場合`
- `it()`: `HarnessApiResponse envelopeが出力される`
- `Arrange`: `json=true` の payload を用意する。
- `Act`: `const actual = presenter.format({ output: "json", ...payload })`
- `Assert`: `JSON.parse(actual)` が `status`, `errors`, `summary`, `data` を持つことを確認する。

##### IT-BA-130
- `context()`: `JSON出力の場合`
- `it()`: `status/errors/summary/dataの各属性が正しく設定される`
- `Arrange`: `errors`, `report summary`, `checkedFiles` を明示した payload を用意する。
- `Act`: `const actual = presenter.format({ output: "json", ...payload })`
- `Assert`: parse 結果の各属性値が入力 payload と一致することを確認する。

##### IT-BA-131
- `context()`: `ESLint残存結果が含まれる場合`
- `it()`: `残存ファイル情報が出力に含まれる`
- `Arrange`: `verifyEslintRemovalOutput.configFiles` に `.eslintrc.cjs` を含める。
- `Act`: `const actual = presenter.format({ output: "text", ...payload })`
- `Assert`: `actual` に ESLint 残存ファイル名が含まれることを確認する。

##### IT-BA-132
- `context()`: `スキップルールがある場合`
- `it()`: `スキップルール一覧が出力に含まれる`
- `Arrange`: `report.skippedRules` に 1 件以上入れた payload を用意する。
- `Act`: `const actual = presenter.format({ output: "text", ...payload })`
- `Assert`: `actual` にスキップルール一覧が含まれることを確認する。

## 5. モック戦略

### 5.1 基本方針

| 対象 | 方針 | 備考 |
|---|---|---|
| Port | モック可 | `vi.fn()` を使う |
| ドメイン VO/サービス | モック禁止 | 実体を使う |
| `RuleDefinitionRegistry` | 実体固定 | UseCase / Formatter で共通 |
| `ImportGraphBuilder` | 実体固定 | `AnalyzeImportGraphUseCase` で使用 |
| `LintRunner` | 実体固定 | `ExecuteLintUseCase` で使用 |
| `ClockPort` | 固定値スタブ | `durationMs` の確定用 |
| CLI 出力 | spy/capture | `stdout/stderr` 検証 |
| ファイルシステム | fixture + temp dir | 実プロジェクトは触らない |
| Biome CLI | 実CLI優先 | 異常分岐は process runner 差し替え可 |

### 5.2 UseCase別モック一覧

| コンポーネント | モック対象 | 実体対象 |
|---|---|---|
| `ResolveEnabledRulesUseCase` | `RuleConfigProviderPort` | `RuleDefinitionRegistry` |
| `AnalyzeImportGraphUseCase` | `WorkspaceFilePort`, `SourceModuleAnalyzerPort` | `ImportGraphBuilder` |
| `ExecuteLintUseCase` | `ResolveEnabledRulesUseCase`, `AnalyzeImportGraphUseCase`, `BiomeExecutorPort`, `ClockPort` | `LintRunner`, `RuleDefinitionRegistry` |
| `BuildHarnessErrorPayloadUseCase` | `ViolationFormatterPort` | なし |
| `VerifyEslintRemovalUseCase` | `WorkspaceInventoryPort` | なし |
| `HarnessLintCommandHandler` | 各 UseCase, Presenter, Parser | なし |

### 5.3 共通ファクトリ方針

- `createRuleDefinitionRegistry()` で毎回新しい実体を生成し、テスト間状態共有を防ぐ
- `createRuleViolationFixture(ruleName, overrides)` で 8 ルールの違反を最短で作れるようにする
- `createLintReportFixture({ violations, skippedRules, durationMs })` を用意し、Presentation テストの入力を単純化する
- `createTempWorkspaceFromFixture("workspace/eslint-legacy")` のように fixture 名だけで temp dir を作れるようにする

### 5.4 AAA徹底ポイント

- Arrange では SUT 構築とケース固有データだけを書く
- Act は 1 回だけにし、戻り値または Promise を `actual` に格納する
- Assert は「戻り値」「依存呼び出し」「出力副作用」の順で読むと追えるように並べる

## 6. テスト実行コマンド

### 6.1 全体実行

```bash
npm test
```

```bash
npx vitest run --config scripts/harness/__tests__/vitest.config.ts
```

### 6.2 UseCase単位

```bash
npx vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/biome-ast-engine/application/execute-lint-usecase.test.ts
```

### 6.3 Infrastructure単位

```bash
npx vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/biome-ast-engine/infrastructure/biome-cli-executor-adapter.test.ts
```

### 6.4 Presentation単位

```bash
npx vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/biome-ast-engine/presentation/harness-lint-command-handler.test.ts
```

### 6.5 開発中のウォッチ実行

```bash
npx vitest --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/biome-ast-engine/presentation/lint-cli-presenter.test.ts
```
