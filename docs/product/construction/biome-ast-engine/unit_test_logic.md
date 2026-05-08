# ユニットテストロジック設計: biome-ast-engine

@story-id H01-01
@story-id H01-02
@story-id H01-03
> 本書は `unit_test_design.md` に定義された 192 ケースのみを対象に、Vitest 実装時の疑似コードと補助設計を定義する。`coverage_report.md` が指摘する未設計項目は、ケースID未定義のため追加しない。

## 1. テストファイル構成

| ファイルパス | 対象モデル | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/rule-name.test.ts` | `RuleName` | 12 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/rule-type.test.ts` | `RuleType` | 8 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/layer-name.test.ts` | `LayerName` | 10 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/file-path.test.ts` | `FilePath` | 14 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/required-input.test.ts` | `RequiredInput` | 6 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/import-edge.test.ts` | `ImportEdge` | 8 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/import-cycle.test.ts` | `ImportCycle` | 6 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/layer-boundary.test.ts` | `LayerBoundary` | 10 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/source-module-snapshot.test.ts` | `SourceModuleSnapshot` | 16 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/rule-definition.test.ts` | `RuleDefinition` | 14 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/rule-violation.test.ts` | `RuleViolation` | 10 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/import-graph.test.ts` | `ImportGraph` | 18 |
| `scripts/harness/__tests__/unit/biome-ast-engine/value-objects/lint-report.test.ts` | `LintReport` | 10 |
| `scripts/harness/__tests__/unit/biome-ast-engine/rule-definition-registry.test.ts` | `RuleDefinitionRegistry` | 18 |
| `scripts/harness/__tests__/unit/biome-ast-engine/import-graph-builder.test.ts` | `ImportGraphBuilder` | 10 |
| `scripts/harness/__tests__/unit/biome-ast-engine/lint-runner.test.ts` | `LintRunner` | 22 |

## 2. 共通ヘルパー・ファクトリ

### 2.1 共通テスト構造

- すべてのテストは `target(対象)` → `describe(ふるまい)` → `context(前提条件)` → `it(期待値)` の階層で記述する。
- 成功系は `const actual = ...` を Act に置き、Assert で主期待値と不変条件を確認する。
- 例外系は `const act = () => ...` または `const act = async () => ...` を Act に置き、`expect(act).toThrow(...)` または `await expect(act).rejects.toThrow(...)` を使う。
- `beforeEach` で Arrange を隠蔽せず、各ケースの Arrange に必要最小限の準備を書く。

### 2.2 共通疑似コードテンプレート

```ts
target('RuleName.fromString', () => {
  describe('定義済みルール名を受け取りRuleNameを生成する', () => {
    context('"require-unit-comment"を指定した場合', () => {
      it('対応するRuleNameが生成される', () => {
        // Arrange
        const input = 'require-unit-comment';

        // Act
        const actual = RuleName.fromString(input);

        // Assert
        expect(actual.toString()).toBe('require-unit-comment');
      });
    });
  });
});
```

### 2.3 共通ファクトリ

| ヘルパー名 | 用途 | 主な初期値 |
|---|---|---|
| `createRuleName(value?)` | `RuleName` 生成 | 既定値 `require-unit-comment` |
| `createRuleType(value?)` | `RuleType` 生成 | 既定値 `BiomeNative` |
| `createLayerName(value?)` | `LayerName` 生成 | 既定値 `domain` |
| `createFilePath(value?)` | `FilePath` 生成 | 既定値 `biome-ast-engine/domain/example.ts` |
| `createRequiredInput(value?)` | `RequiredInput` 生成 | 既定値 `source-module-snapshots` |
| `createImportEdge(overrides?)` | `ImportEdge` 生成 | `from=a.ts`, `to=b.ts`, `importKind='value'` |
| `createImportCycle(paths?)` | `ImportCycle` 生成 | `[a.ts, b.ts]` |
| `createLayerBoundary(overrides?)` | `LayerBoundary` 生成 | `application -> domain, allowed=true` |
| `createSourceModuleSnapshot(overrides?)` | `SourceModuleSnapshot` 生成 | 件数系は正数、`declaredUnit='biome-ast-engine'`, `declaredLayer='domain'` |
| `createRuleDefinition(overrides?)` | `RuleDefinition` 生成 | `L1-001`, `enabled=true`, `severity='error'`, `requiredInputs=[source-module-snapshots]` |
| `createRuleViolation(overrides?)` | `RuleViolation` 生成 | `line=1`, `column=1`, `severity='error'` |
| `createImportGraph(overrides?)` | `ImportGraph` 生成 | `nodes=[a.ts,b.ts]`, `edges=[a->b]`, `rootNodes=[a.ts]` |
| `createLintReport(overrides?)` | `LintReport` 生成 | `durationMs=10`, `scannedFiles=2`, `violations=[]` |
| `createRegistry()` | `RuleDefinitionRegistry` 実体生成 | 8 ルールの標準定義を読み込む |
| `createLintRunner()` | `LintRunner` 実体生成 | `RuleDefinitionRegistry` と純粋ドメイン入力のみを使う |

### 2.4 補助アサーション

| ヘルパー名 | 用途 |
|---|---|
| `expectRuleNames(actual, expected)` | `RuleName[]` を `toString()` ベースで比較する |
| `expectViolation(actual, expectedRuleName, expectedPath)` | 違反 1 件の `ruleName` と `filePath` を確認する |
| `expectNoViolation(actual, ruleName)` | 特定 `ruleName` の違反が存在しないことを確認する |
| `expectGraphEdges(actual, expected)` | `from/to/importKind` の組でエッジ集合比較する |

## 3. テストケース詳細ロジック

### 3.1 `value-objects/rule-name.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-001 | `target('RuleName.fromString')` / `describe('定義済みルール名を受け取りRuleNameを生成する')` / `context('"require-unit-comment"を指定した場合')` / `it('対応するRuleNameが生成される')` | `input='require-unit-comment'` | `const actual = RuleName.fromString(input)` | `actual.toString()` が `require-unit-comment`。`actual.equals(createRuleName('require-unit-comment'))` が `true`。 |
| UT-BA-002 | 同上 / `context('"require-layer-comment"を指定した場合')` | `input='require-layer-comment'` | 同上 | `actual.toString()` が `require-layer-comment`。 |
| UT-BA-003 | 同上 / `context('"no-layer-violation"を指定した場合')` | `input='no-layer-violation'` | 同上 | `actual.toString()` が `no-layer-violation`。 |
| UT-BA-004 | 同上 / `context('"enforce-folder-structure"を指定した場合')` | `input='enforce-folder-structure'` | 同上 | `actual.toString()` が `enforce-folder-structure`。 |
| UT-BA-005 | 同上 / `context('"no-any-abuse"を指定した場合')` | `input='no-any-abuse'` | 同上 | `actual.toString()` が `no-any-abuse`。 |
| UT-BA-006 | `target('RuleName.fromString')` / `describe('定義済みルール名を受け取りRuleNameを生成する')` / `context('未定義のルール名を指定した場合')` / `it('InvalidRuleNameErrorがスローされる')` | `input='unknown-rule'` | `const act = () => RuleName.fromString(input)` | `expect(act).toThrow(InvalidRuleNameError)`。 |
| UT-BA-007 | `target('RuleName.equals')` / `describe('同一ルール名の等価性を判定する')` / `context('同じルール名の場合')` / `it('trueを返す')` | `left=createRuleName('require-unit-comment')`, `right=createRuleName('require-unit-comment')` | `const actual = left.equals(right)` | `actual` が `true`。 |
| UT-BA-008 | `target('RuleName.equals')` / `describe('同一ルール名の等価性を判定する')` / `context('異なるルール名の場合')` / `it('falseを返す')` | `left=createRuleName('require-unit-comment')`, `right=createRuleName('require-layer-comment')` | `const actual = left.equals(right)` | `actual` が `false`。 |
| UT-BA-009 | `target('RuleName.isMetadataRule')` / `describe('メタデータ関連ルールを判別する')` / `context('require-unit-commentの場合')` / `it('trueを返す')` | `sut=createRuleName('require-unit-comment')` | `const actual = sut.isMetadataRule()` | `actual` が `true`。 |
| UT-BA-010 | `target('RuleName.isMetadataRule')` / `describe('メタデータ関連ルールを判別する')` / `context('no-layer-violationの場合')` / `it('falseを返す')` | `sut=createRuleName('no-layer-violation')` | `const actual = sut.isMetadataRule()` | `actual` が `false`。 |
| UT-BA-011 | `target('RuleName.toString')` / `describe('ルール名の文字列表現を返す')` / `context('require-unit-commentの場合')` / `it('"require-unit-comment"が返される')` | `sut=createRuleName('require-unit-comment')` | `const actual = sut.toString()` | `actual` が `require-unit-comment`。 |
| UT-BA-012 | `target('RuleName.isImportGraphRule')` / `describe('importグラフ依存ルールを判別する')` / `context('no-layer-violationの場合')` / `it('trueを返す')` | `sut=createRuleName('no-layer-violation')` | `const actual = sut.isImportGraphRule()` | `actual` が `true`。 |

### 3.2 `value-objects/rule-type.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-013 | `target('RuleType.fromString')` / `describe('ルール実行経路を生成する')` / `context('"BiomeNative"を指定した場合')` / `it('BiomeNative型のRuleTypeが生成される')` | `input='BiomeNative'` | `const actual = RuleType.fromString(input)` | `actual.isBiomeNative()` が `true`。`actual.toString()` が `BiomeNative`。 |
| UT-BA-014 | 同上 / `context('"ExternalAnalyzer"を指定した場合')` | `input='ExternalAnalyzer'` | 同上 | `actual.isExternalAnalyzer()` が `true`。 |
| UT-BA-015 | 同上 / `context('"RustPlugin"を指定した場合')` / `it('InvalidRuleTypeErrorがスローされる')` | `input='RustPlugin'` | `const act = () => RuleType.fromString(input)` | `expect(act).toThrow(InvalidRuleTypeError)`。 |
| UT-BA-016 | 同上 / `context('未定義の実行経路を指定した場合')` / `it('InvalidRuleTypeErrorがスローされる')` | `input='unknown'` | 同上 | 同上。 |
| UT-BA-017 | `target('RuleType.isBiomeNative')` / `describe('型判別メソッドの動作を検証する')` / `context('BiomeNative型の場合')` / `it('trueを返す')` | `sut=createRuleType('BiomeNative')` | `const actual = sut.isBiomeNative()` | `actual` が `true`。 |
| UT-BA-018 | `target('RuleType.isBiomeNative')` / `describe('型判別メソッドの動作を検証する')` / `context('ExternalAnalyzer型の場合')` / `it('falseを返す')` | `sut=createRuleType('ExternalAnalyzer')` | `const actual = sut.isBiomeNative()` | `actual` が `false`。 |
| UT-BA-019 | `target('RuleType.isExternalAnalyzer')` / `describe('型判別メソッドの動作を検証する')` / `context('ExternalAnalyzer型の場合')` / `it('trueを返す')` | `sut=createRuleType('ExternalAnalyzer')` | `const actual = sut.isExternalAnalyzer()` | `actual` が `true`。 |
| UT-BA-020 | `target('RuleType.equals')` / `describe('同一実行経路の等価性を判定する')` / `context('同じRuleTypeの場合')` / `it('trueを返す')` | `left=createRuleType('BiomeNative')`, `right=createRuleType('BiomeNative')` | `const actual = left.equals(right)` | `actual` が `true`。 |

### 3.3 `value-objects/layer-name.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-021 | `target('LayerName.fromString')` / `describe('正規レイヤー名を生成する')` / `context('"domain"を指定した場合')` / `it('対応するLayerNameが生成される')` | `input='domain'` | `const actual = LayerName.fromString(input)` | `actual.toPathSegment()` が `domain`。 |
| UT-BA-022 | 同上 / `context('"application"を指定した場合')` | `input='application'` | 同上 | `actual.toPathSegment()` が `application`。 |
| UT-BA-023 | 同上 / `context('"infrastructure"を指定した場合')` | `input='infrastructure'` | 同上 | `actual.toPathSegment()` が `infrastructure`。 |
| UT-BA-024 | 同上 / `context('"presentation"を指定した場合')` | `input='presentation'` | 同上 | `actual.toPathSegment()` が `presentation`。 |
| UT-BA-025 | 同上 / `context('v0語彙"port"を指定した場合')` / `it('InvalidLayerNameErrorがスローされる')` | `input='port'` | `const act = () => LayerName.fromString(input)` | `expect(act).toThrow(InvalidLayerNameError)`。 |
| UT-BA-026 | 同上 / `context('v0語彙"usecase"を指定した場合')` / `it('InvalidLayerNameErrorがスローされる')` | `input='usecase'` | 同上 | 同上。 |
| UT-BA-027 | 同上 / `context('v0語彙"controller"を指定した場合')` / `it('InvalidLayerNameErrorがスローされる')` | `input='controller'` | 同上 | 同上。 |
| UT-BA-028 | `target('LayerName.canDependOn')` / `describe('レイヤー依存方向を検証する')` / `context('domainがapplicationに依存する場合')` / `it('falseを返す')` | `source=createLayerName('domain')`, `targetLayer=createLayerName('application')` | `const actual = source.canDependOn(targetLayer)` | `actual` が `false`。 |
| UT-BA-029 | `target('LayerName.canDependOn')` / `describe('レイヤー依存方向を検証する')` / `context('applicationがdomainに依存する場合')` / `it('trueを返す')` | `source=createLayerName('application')`, `targetLayer=createLayerName('domain')` | `const actual = source.canDependOn(targetLayer)` | `actual` が `true`。 |
| UT-BA-030 | `target('LayerName.toPathSegment')` / `describe('レイヤー名をパスセグメントとして返す')` / `context('domainの場合')` / `it('"domain"が返される')` | `sut=createLayerName('domain')` | `const actual = sut.toPathSegment()` | `actual` が `domain`。 |

### 3.4 `value-objects/file-path.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-031 | `target('FilePath.fromWorkspaceRelative')` / `describe('プロジェクト相対パスを生成する')` / `context('正常な相対パスの場合')` / `it('FilePathが生成される')` | `input='biome-ast-engine/domain/rule.ts'` | `const actual = FilePath.fromWorkspaceRelative(input)` | `actual.fileName()` が `rule.ts`。 |
| UT-BA-032 | 同上 / `context('空文字の場合')` / `it('InvalidFilePathErrorがスローされる')` | `input=''` | `const act = () => FilePath.fromWorkspaceRelative(input)` | `expect(act).toThrow(InvalidFilePathError)`。 |
| UT-BA-033 | 同上 / `context('".."始まりの場合')` | `input='../outside.ts'` | 同上 | 同上。 |
| UT-BA-034 | 同上 / `context('絶対パスの場合')` | `input='/tmp/outside.ts'` | 同上 | 同上。 |
| UT-BA-035 | 同上 / `context('Windows drive letterの場合')` | `input='C:\\\\repo\\\\file.ts'` | 同上 | 同上。 |
| UT-BA-036 | 同上 / `context('"."のみの場合')` | `input='.'` | 同上 | 同上。 |
| UT-BA-037 | `target('FilePath.segments')` / `describe('パスセグメントを返す')` / `context('複数階層のパスの場合')` / `it('セグメント配列が正しく返される')` | `sut=createFilePath('biome-ast-engine/domain/rule.ts')` | `const actual = sut.segments()` | `actual` が `['biome-ast-engine', 'domain', 'rule.ts']`。 |
| UT-BA-038 | `target('FilePath.segments')` / `describe('パスセグメントを返す')` / `context('単一ファイル名の場合')` / `it('1要素の配列が返される')` | `sut=createFilePath('rule.ts')` | `const actual = sut.segments()` | `actual` が `['rule.ts']`。 |
| UT-BA-039 | `target('FilePath.fileName')` / `describe('ファイル名を返す')` / `context('複数階層のパスの場合')` / `it('末尾のファイル名が返される')` | `sut=createFilePath('biome-ast-engine/domain/rule.ts')` | `const actual = sut.fileName()` | `actual` が `rule.ts`。 |
| UT-BA-040 | `target('FilePath.extension')` / `describe('拡張子を返す')` / `context('.tsファイルの場合')` / `it('"ts"が返される')` | `sut=createFilePath('biome-ast-engine/domain/rule.ts')` | `const actual = sut.extension()` | `actual` が `ts`。 |
| UT-BA-041 | `target('FilePath.extension')` / `describe('拡張子を返す')` / `context('.test.tsファイルの場合')` / `it('"ts"が返される')` | `sut=createFilePath('biome-ast-engine/domain/rule.test.ts')` | `const actual = sut.extension()` | `actual` が `ts`。 |
| UT-BA-042 | `target('FilePath.startsWith')` / `describe('パスが指定セグメントで始まるかを判定する')` / `context('一致するセグメントの場合')` / `it('trueを返す')` | `sut=createFilePath('biome-ast-engine/domain/rule.ts')`, `prefix='biome-ast-engine'` | `const actual = sut.startsWith(prefix)` | `actual` が `true`。 |
| UT-BA-043 | `target('FilePath.startsWith')` / `describe('パスが指定セグメントで始まるかを判定する')` / `context('一致しないセグメントの場合')` / `it('falseを返す')` | `sut=createFilePath('biome-ast-engine/domain/rule.ts')`, `prefix='other-unit'` | `const actual = sut.startsWith(prefix)` | `actual` が `false`。 |
| UT-BA-044 | `target('FilePath.parent')` / `describe('親ディレクトリのパスを返す')` / `context('複数階層のパスの場合')` / `it('親ディレクトリが返される')` | `sut=createFilePath('biome-ast-engine/domain/rule.ts')` | `const actual = sut.parent()` | `actual.toString()` が `biome-ast-engine/domain`。 |

### 3.5 `value-objects/required-input.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-045 | `target('RequiredInput.fromString')` / `describe('ルール評価に必要な入力種別を生成する')` / `context('"source-module-snapshots"を指定した場合')` / `it('対応するRequiredInputが生成される')` | `input='source-module-snapshots'` | `const actual = RequiredInput.fromString(input)` | `actual.toString()` が `source-module-snapshots`。 |
| UT-BA-046 | 同上 / `context('"import-graph"を指定した場合')` | `input='import-graph'` | 同上 | `actual.toString()` が `import-graph`。 |
| UT-BA-047 | 同上 / `context('"biome-diagnostics"を指定した場合')` | `input='biome-diagnostics'` | 同上 | `actual.toString()` が `biome-diagnostics`。 |
| UT-BA-048 | 同上 / `context('"workspace-inventory"を指定した場合')` | `input='workspace-inventory'` | 同上 | `actual.toString()` が `workspace-inventory`。 |
| UT-BA-049 | 同上 / `context('未定義の入力種別を指定した場合')` / `it('エラーがスローされる')` | `input='unknown-input'` | `const act = () => RequiredInput.fromString(input)` | `expect(act).toThrow()`。 |
| UT-BA-050 | `target('RequiredInput.equals')` / `describe('同一入力種別の等価性を判定する')` / `context('同じ入力種別の場合')` / `it('trueを返す')` | `left=createRequiredInput('import-graph')`, `right=createRequiredInput('import-graph')` | `const actual = left.equals(right)` | `actual` が `true`。 |

### 3.6 `value-objects/import-edge.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-051 | `target('ImportEdge.create')` / `describe('import辺を生成する')` / `context('正常なfrom/toとimportKind"value"の場合')` / `it('value型のImportEdgeが生成される')` | `from=createFilePath('a.ts')`, `to=createFilePath('b.ts')`, `importKind='value'` | `const actual = ImportEdge.create({ from, to, importKind })` | `actual.isTypeOnly()` が `false`。`actual.from` と `actual.to` が入力と一致。 |
| UT-BA-052 | 同上 / `context('importKindが"type"の場合')` | `importKind='type'` | 同上 | `actual.isTypeOnly()` が `true`。 |
| UT-BA-053 | 同上 / `context('importKindが"dynamic"の場合')` | `importKind='dynamic'` | 同上 | `actual.importKind` が `dynamic`。 |
| UT-BA-054 | `target('ImportEdge.equals')` / `describe('等価性を判定する')` / `context('同一属性のImportEdgeの場合')` / `it('trueを返す')` | `left=createImportEdge()`, `right=createImportEdge()` | `const actual = left.equals(right)` | `actual` が `true`。 |
| UT-BA-055 | `target('ImportEdge.equals')` / `describe('等価性を判定する')` / `context('異なる属性のImportEdgeの場合')` / `it('falseを返す')` | `left=createImportEdge()`, `right=createImportEdge({ importKind: 'type' })` | `const actual = left.equals(right)` | `actual` が `false`。 |
| UT-BA-056 | `target('ImportEdge.isTypeOnly')` / `describe('type-only importを判別する')` / `context('importKindが"type"の場合')` / `it('trueを返す')` | `sut=createImportEdge({ importKind: 'type' })` | `const actual = sut.isTypeOnly()` | `actual` が `true`。 |
| UT-BA-057 | `target('ImportEdge.isTypeOnly')` / `describe('type-only importを判別する')` / `context('importKindが"value"の場合')` / `it('falseを返す')` | `sut=createImportEdge({ importKind: 'value' })` | `const actual = sut.isTypeOnly()` | `actual` が `false`。 |
| UT-BA-058 | `target('ImportEdge.touches')` / `describe('指定ファイルがエッジに含まれるかを判定する')` / `context('fromが一致する場合')` / `it('trueを返す')` | `sut=createImportEdge({ from: createFilePath('a.ts'), to: createFilePath('b.ts') })`, `targetPath=createFilePath('a.ts')` | `const actual = sut.touches(targetPath)` | `actual` が `true`。 |

### 3.7 `value-objects/import-cycle.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-059 | `target('ImportCycle.create')` / `describe('循環経路を生成する')` / `context('2ノード以上のパスの場合')` / `it('ImportCycleが生成される')` | `paths=[createFilePath('a.ts'), createFilePath('b.ts')]` | `const actual = ImportCycle.create(paths)` | `actual.includes(createFilePath('a.ts'))` が `true`。 |
| UT-BA-060 | `target('ImportCycle.create')` / `describe('循環経路を生成する')` / `context('1ノードのパスの場合')` / `it('InvalidImportCycleErrorがスローされる')` | `paths=[createFilePath('a.ts')]` | `const act = () => ImportCycle.create(paths)` | `expect(act).toThrow(InvalidImportCycleError)`。 |
| UT-BA-061 | `target('ImportCycle.create')` / `describe('循環経路を生成する')` / `context('空のパスの場合')` / `it('InvalidImportCycleErrorがスローされる')` | `paths=[]` | `const act = () => ImportCycle.create(paths)` | `expect(act).toThrow(InvalidImportCycleError)`。 |
| UT-BA-062 | `target('ImportCycle.includes')` / `describe('指定ファイルが循環経路に含まれるかを判定する')` / `context('経路に含まれるファイルの場合')` / `it('trueを返す')` | `sut=createImportCycle([createFilePath('a.ts'), createFilePath('b.ts')])`, `targetPath=createFilePath('b.ts')` | `const actual = sut.includes(targetPath)` | `actual` が `true`。 |
| UT-BA-063 | `target('ImportCycle.includes')` / `describe('指定ファイルが循環経路に含まれるかを判定する')` / `context('経路に含まれないファイルの場合')` / `it('falseを返す')` | `sut=createImportCycle([createFilePath('a.ts'), createFilePath('b.ts')])`, `targetPath=createFilePath('c.ts')` | `const actual = sut.includes(targetPath)` | `actual` が `false`。 |
| UT-BA-064 | `target('ImportCycle.firstEdge')` / `describe('循環経路の最初のエッジを返す')` / `context('3ノードの循環の場合')` / `it('最初の2ノードのタプルが返される')` | `sut=createImportCycle([createFilePath('a.ts'), createFilePath('b.ts'), createFilePath('c.ts')])` | `const actual = sut.firstEdge()` | `actual` が `[a.ts, b.ts]` に相当する 2 要素であることを確認する。 |

### 3.8 `value-objects/layer-boundary.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-065 | `target('LayerBoundary.create')` / `describe('レイヤー境界を生成する')` / `context('正常なsourceLayer/targetLayer/allowedの場合')` / `it('LayerBoundaryが生成される')` | `sourceLayer=createLayerName('application')`, `targetLayer=createLayerName('domain')`, `allowed=true` | `const actual = LayerBoundary.create({ sourceLayer, targetLayer, allowed })` | `actual.allows(sourceLayer, targetLayer)` が `true`。 |
| UT-BA-066 | 同上 / `context('sourceLayerとtargetLayerが同一の場合')` | `sourceLayer=createLayerName('domain')`, `targetLayer=createLayerName('domain')`, `allowed=true` | 同上 | 同一レイヤー境界も生成できることを確認する。 |
| UT-BA-067 | `target('LayerBoundary.standardMatrix')` / `describe('正規依存行列を生成する')` / `context('—')` / `it('横断契約に準拠した行列が返される')` | なし | `const actual = LayerBoundary.standardMatrix()` | 4 層間の境界が過不足なく含まれ、`domain/application/infrastructure/presentation` のみで構成される。 |
| UT-BA-068 | 同上 / `it('domainからの外向き依存がすべてallowed=falseである')` | なし | `const actual = LayerBoundary.standardMatrix()` | `sourceLayer=domain` かつ `targetLayer!=domain` の境界がすべて `allowed=false`。 |
| UT-BA-069 | 同上 / `it('applicationからdomainへの依存がallowed=trueである')` | なし | `const actual = LayerBoundary.standardMatrix()` | `application -> domain` の境界が `allowed=true`。 |
| UT-BA-070 | 同上 / `it('infrastructureからdomainへの依存がallowed=trueである')` | なし | `const actual = LayerBoundary.standardMatrix()` | `infrastructure -> domain` の境界が `allowed=true`。 |
| UT-BA-071 | 同上 / `it('infrastructureからpresentationへの依存がallowed=falseである')` | なし | `const actual = LayerBoundary.standardMatrix()` | `infrastructure -> presentation` の境界が `allowed=false`。 |
| UT-BA-072 | `target('LayerBoundary.allows')` / `describe('依存方向の許可を判定する')` / `context('許可された依存方向の場合')` / `it('trueを返す')` | `sut=createLayerBoundary({ sourceLayer: createLayerName('application'), targetLayer: createLayerName('domain'), allowed: true })` | `const actual = sut.allows(createLayerName('application'), createLayerName('domain'))` | `actual` が `true`。 |
| UT-BA-073 | `target('LayerBoundary.allows')` / `describe('依存方向の許可を判定する')` / `context('禁止された依存方向の場合')` / `it('falseを返す')` | `sut=createLayerBoundary({ sourceLayer: createLayerName('domain'), targetLayer: createLayerName('application'), allowed: false })` | `const actual = sut.allows(createLayerName('domain'), createLayerName('application'))` | `actual` が `false`。 |
| UT-BA-074 | `target('LayerBoundary.equals')` / `describe('等価性を判定する')` / `context('同一属性のLayerBoundaryの場合')` / `it('trueを返す')` | `left=createLayerBoundary()`, `right=createLayerBoundary()` | `const actual = left.equals(right)` | `actual` が `true`。 |

### 3.9 `value-objects/source-module-snapshot.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-075 | `target('SourceModuleSnapshot.create')` / `describe('スナップショットを生成する')` / `context('正常な属性値の場合')` / `it('SourceModuleSnapshotが生成される')` | `props` に正常な `filePath`, 件数系正数, `declaredUnit`, `declaredLayer`, `imports` を設定 | `const actual = SourceModuleSnapshot.create(props)` | 生成成功し、`actual.filePath` と `actual.declaredLayer` が入力と一致する。 |
| UT-BA-076 | 同上 / `context('anyTypeCountが負数の場合')` / `it('エラーがスローされる')` | `props.anyTypeCount=-1` | `const act = () => SourceModuleSnapshot.create(props)` | `expect(act).toThrow()`。 |
| UT-BA-077 | 同上 / `context('typedNodeCountが負数の場合')` | `props.typedNodeCount=-1` | 同上 | 同上。 |
| UT-BA-078 | 同上 / `context('commentLineCountが負数の場合')` | `props.commentLineCount=-1` | 同上 | 同上。 |
| UT-BA-079 | 同上 / `context('logicalLineCountが負数の場合')` | `props.logicalLineCount=-1` | 同上 | 同上。 |
| UT-BA-080 | 同上 / `context('repeatedCommentBlocksが負数の場合')` | `props.repeatedCommentBlocks=-1` | 同上 | 同上。 |
| UT-BA-081 | 同上 / `context('declaredLayerが不正な値の場合')` | `props.declaredLayer='port'` | 同上 | `InvalidLayerNameError` など該当エラー型で失敗する。 |
| UT-BA-082 | 同上 / `context('declaredLayerがnullの場合')` / `it('SourceModuleSnapshotが生成される')` | `props.declaredLayer=null` | `const actual = SourceModuleSnapshot.create(props)` | `actual.hasLayerComment()` が `false`。 |
| UT-BA-083 | 同上 / `context('件数系属性がすべて0の場合')` / `it('SourceModuleSnapshotが生成される')` | 件数系をすべて `0` にする | `const actual = SourceModuleSnapshot.create(props)` | 生成成功し、`anyRatio()` と `commentDensity()` が数値で返ることを確認する。 |
| UT-BA-084 | `target('SourceModuleSnapshot.hasUnitComment')` / `describe('@unitコメントの有無を返す')` / `context('declaredUnitがnullの場合')` / `it('falseを返す')` | `sut=createSourceModuleSnapshot({ declaredUnit: null })` | `const actual = sut.hasUnitComment()` | `actual` が `false`。 |
| UT-BA-085 | `target('SourceModuleSnapshot.hasUnitComment')` / `describe('@unitコメントの有無を返す')` / `context('declaredUnitが設定されている場合')` / `it('trueを返す')` | `sut=createSourceModuleSnapshot({ declaredUnit: 'biome-ast-engine' })` | `const actual = sut.hasUnitComment()` | `actual` が `true`。 |
| UT-BA-086 | `target('SourceModuleSnapshot.hasLayerComment')` / `describe('@layerコメントの有無を返す')` / `context('declaredLayerがnullの場合')` / `it('falseを返す')` | `sut=createSourceModuleSnapshot({ declaredLayer: null })` | `const actual = sut.hasLayerComment()` | `actual` が `false`。 |
| UT-BA-087 | `target('SourceModuleSnapshot.hasLayerComment')` / `describe('@layerコメントの有無を返す')` / `context('declaredLayerが設定されている場合')` / `it('trueを返す')` | `sut=createSourceModuleSnapshot({ declaredLayer: createLayerName('domain') })` | `const actual = sut.hasLayerComment()` | `actual` が `true`。 |
| UT-BA-088 | `target('SourceModuleSnapshot.anyRatio')` / `describe('any型の使用比率を返す')` / `context('anyTypeCount=3, typedNodeCount=10の場合')` / `it('0.3が返される')` | `sut=createSourceModuleSnapshot({ anyTypeCount: 3, typedNodeCount: 10 })` | `const actual = sut.anyRatio()` | `actual` が `0.3`。 |
| UT-BA-089 | `target('SourceModuleSnapshot.commentDensity')` / `describe('コメント密度を返す')` / `context('commentLineCount=5, logicalLineCount=20の場合')` / `it('0.25が返される')` | `sut=createSourceModuleSnapshot({ commentLineCount: 5, logicalLineCount: 20 })` | `const actual = sut.commentDensity()` | `actual` が `0.25`。 |
| UT-BA-090 | `target('SourceModuleSnapshot.belongsToLayerDirectory')` / `describe('レイヤーディレクトリへの所属を判定する')` / `context('filePathにdeclaredLayerと一致するセグメントがある場合')` / `it('trueを返す')` | `sut=createSourceModuleSnapshot({ filePath: createFilePath('biome-ast-engine/domain/rule.ts'), declaredLayer: createLayerName('domain') })` | `const actual = sut.belongsToLayerDirectory()` | `actual` が `true`。 |

### 3.10 `value-objects/rule-definition.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-091 | `target('RuleDefinition.create')` / `describe('ルール定義を生成する')` / `context('正常な属性値の場合')` / `it('RuleDefinitionが生成される')` | 正常な `name`, `type`, `enabled`, `severity`, `errorCode`, `requiredInputs` を設定 | `const actual = RuleDefinition.create(props)` | 生成成功し、`actual.isEnabled()` が `true`。 |
| UT-BA-092 | 同上 / `context('errorCodeが"L1-001"の場合')` | `props.errorCode='L1-001'` | 同上 | 生成成功する。 |
| UT-BA-093 | 同上 / `context('errorCodeが"L1-008"の場合')` | `props.errorCode='L1-008'` | 同上 | 生成成功する。 |
| UT-BA-094 | 同上 / `context('errorCodeが"L1-000"の場合')` / `it('エラーがスローされる')` | `props.errorCode='L1-000'` | `const act = () => RuleDefinition.create(props)` | `expect(act).toThrow()`。 |
| UT-BA-095 | 同上 / `context('errorCodeが"L1-009"の場合')` | `props.errorCode='L1-009'` | 同上 | 同上。 |
| UT-BA-096 | 同上 / `context('errorCodeが"L2-001"の場合')` | `props.errorCode='L2-001'` | 同上 | 同上。 |
| UT-BA-097 | `target('RuleDefinition.withSeverity')` / `describe('severityを変更した新しいRuleDefinitionを返す')` / `context('"warning"に変更した場合')` / `it('severity="warning"の新インスタンスが返される')` | `sut=createRuleDefinition({ severity: 'error' })` | `const actual = sut.withSeverity('warning')` | `actual.severity` が `warning`。`sut !== actual`。 |
| UT-BA-098 | `target('RuleDefinition.withSeverity')` / `describe('severityを変更した新しいRuleDefinitionを返す')` / `context('—')` / `it('元のインスタンスは変更されない')` | `sut=createRuleDefinition({ severity: 'error' })` | `const actual = sut.withSeverity('warning')` | `sut.severity` は `error` のまま。`actual.severity` のみ `warning`。 |
| UT-BA-099 | `target('RuleDefinition.disable')` / `describe('無効化した新しいRuleDefinitionを返す')` / `context('有効なルールを無効化した場合')` / `it('enabled=falseの新インスタンスが返される')` | `sut=createRuleDefinition({ enabled: true })` | `const actual = sut.disable()` | `actual.isEnabled()` が `false`。`sut !== actual`。 |
| UT-BA-100 | `target('RuleDefinition.disable')` / `describe('無効化した新しいRuleDefinitionを返す')` / `context('—')` / `it('元のインスタンスは変更されない')` | `sut=createRuleDefinition({ enabled: true })` | `const actual = sut.disable()` | `sut.isEnabled()` は `true` のまま。 |
| UT-BA-101 | `target('RuleDefinition.usesInput')` / `describe('必要な入力種別を判定する')` / `context('requiredInputsに含まれるRequiredInputの場合')` / `it('trueを返す')` | `sut=createRuleDefinition({ requiredInputs: [createRequiredInput('import-graph')] })`, `input=createRequiredInput('import-graph')` | `const actual = sut.usesInput(input)` | `actual` が `true`。 |
| UT-BA-102 | `target('RuleDefinition.usesInput')` / `describe('必要な入力種別を判定する')` / `context('requiredInputsに含まれないRequiredInputの場合')` / `it('falseを返す')` | `sut=createRuleDefinition({ requiredInputs: [createRequiredInput('import-graph')] })`, `input=createRequiredInput('workspace-inventory')` | `const actual = sut.usesInput(input)` | `actual` が `false`。 |
| UT-BA-103 | `target('RuleDefinition.isEnabled')` / `describe('有効/無効を返す')` / `context('enabled=trueの場合')` / `it('trueを返す')` | `sut=createRuleDefinition({ enabled: true })` | `const actual = sut.isEnabled()` | `actual` が `true`。 |
| UT-BA-104 | `target('RuleDefinition.equals')` / `describe('等価性を判定する')` / `context('同一属性のRuleDefinitionの場合')` / `it('trueを返す')` | `left=createRuleDefinition()`, `right=createRuleDefinition()` | `const actual = left.equals(right)` | `actual` が `true`。 |

### 3.11 `value-objects/rule-violation.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-105 | `target('RuleViolation.create')` / `describe('違反情報を生成する')` / `context('正常な属性値の場合')` / `it('RuleViolationが生成される')` | 正常な `filePath`, `line`, `column`, `ruleName`, `message`, `severity` を設定 | `const actual = RuleViolation.create(props)` | `actual.toContract()` の `ruleName` と `filePath` が入力と一致する。 |
| UT-BA-106 | 同上 / `context('lineが0の場合')` / `it('エラーがスローされる')` | `props.line=0` | `const act = () => RuleViolation.create(props)` | `expect(act).toThrow()`。 |
| UT-BA-107 | 同上 / `context('columnが0の場合')` | `props.column=0` | 同上 | 同上。 |
| UT-BA-108 | 同上 / `context('messageが空文字の場合')` | `props.message=''` | 同上 | 同上。 |
| UT-BA-109 | `target('RuleViolation.withFixExample')` / `describe('修正例を追加した新インスタンスを返す')` / `context('fixExampleを指定した場合')` / `it('fixExampleが設定された新インスタンスが返される')` | `sut=createRuleViolation()` | `const actual = sut.withFixExample('// fixed')` | `actual.toContract().fix_example` が `// fixed`。`sut !== actual`。 |
| UT-BA-110 | `target('RuleViolation.toContract')` / `describe('契約形式に変換する')` / `context('fixExampleがある場合')` / `it('fix_exampleを含むオブジェクトが返される')` | `sut=createRuleViolation().withFixExample('// fixed')` | `const actual = sut.toContract()` | `actual.fix_example` が存在する。 |
| UT-BA-111 | `target('RuleViolation.toContract')` / `describe('契約形式に変換する')` / `context('fixExampleがない場合')` / `it('fix_exampleを含まないオブジェクトが返される')` | `sut=createRuleViolation()` | `const actual = sut.toContract()` | `actual` に `fix_example` キーが含まれない。 |
| UT-BA-112 | `target('RuleViolation.equals')` / `describe('等価性を判定する')` / `context('同一属性のRuleViolationの場合')` / `it('trueを返す')` | `left=createRuleViolation()`, `right=createRuleViolation()` | `const actual = left.equals(right)` | `actual` が `true`。 |
| UT-BA-113 | `target('RuleViolation.equals')` / `describe('等価性を判定する')` / `context('異なる属性のRuleViolationの場合')` / `it('falseを返す')` | `left=createRuleViolation()`, `right=createRuleViolation({ line: 2 })` | `const actual = left.equals(right)` | `actual` が `false`。 |
| UT-BA-114 | `target('RuleViolation.create')` / `describe('違反情報を生成する')` / `context('line=1, column=1の最小許容値の場合')` / `it('RuleViolationが生成される')` | `props.line=1`, `props.column=1` | `const actual = RuleViolation.create(props)` | 最小許容値で生成成功する。 |

### 3.12 `value-objects/import-graph.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-115 | `target('ImportGraph.create')` / `describe('ImportGraphを生成する')` / `context('正常なノードとエッジの場合')` / `it('ImportGraphが生成される')` | `nodes=[a.ts,b.ts]`, `edges=[a->b]`, `rootNodes=[a.ts]` | `const actual = ImportGraph.create({ nodes, edges, rootNodes })` | `actual.outgoingEdgesOf(a.ts)` が 1 件。 |
| UT-BA-116 | 同上 / `context('rootNodesがnodesの部分集合でない場合')` / `it('エラーがスローされる')` | `rootNodes=[c.ts]`, `nodes=[a.ts,b.ts]` | `const act = () => ImportGraph.create({ nodes, edges, rootNodes })` | `expect(act).toThrow()`。 |
| UT-BA-117 | 同上 / `context('重複ノードが含まれる場合')` / `it('重複が除去されて生成される')` | `nodes=[a.ts,a.ts,b.ts]` | `const actual = ImportGraph.create({ nodes, edges, rootNodes })` | `actual.nodes` の一意件数が 2。 |
| UT-BA-118 | 同上 / `context('重複エッジが含まれる場合')` / `it('重複が除去されて生成される')` | `edges=[a->b,a->b]` | `const actual = ImportGraph.create({ nodes, edges, rootNodes })` | `actual.outgoingEdgesOf(a.ts)` が 1 件。 |
| UT-BA-119 | 同上 / `context('空のノードとエッジの場合')` / `it('空のImportGraphが生成される')` | `nodes=[]`, `edges=[]`, `rootNodes=[]` | `const actual = ImportGraph.create({ nodes, edges, rootNodes })` | `actual.nodes` と `actual.edges` が空配列。 |
| UT-BA-120 | `target('ImportGraph.detectCycles')` / `describe('循環依存を検出する')` / `context('A→B→A の循環が存在する場合')` / `it('ImportCycleの配列が返される')` | `graph=createImportGraph({ edges:[a->b,b->a] })` | `const actual = graph.detectCycles()` | `actual.length` が 1 以上。先頭循環が `a.ts`,`b.ts` を含む。 |
| UT-BA-121 | `target('ImportGraph.detectCycles')` / `describe('循環依存を検出する')` / `context('循環が存在しない場合')` / `it('空配列が返される')` | `graph=createImportGraph({ edges:[a->b] })` | `const actual = graph.detectCycles()` | `actual` が空配列。 |
| UT-BA-122 | `target('ImportGraph.detectCycles')` / `describe('循環依存を検出する')` / `context('A→B→C→Aの3ノード循環の場合')` / `it('3ノードのImportCycleが返される')` | `graph=createImportGraph({ edges:[a->b,b->c,c->a], nodes:[a,b,c] })` | `const actual = graph.detectCycles()` | 返却循環の少なくとも 1 件が `a,b,c` の 3 ノードを含む。 |
| UT-BA-123 | `target('ImportGraph.findLayerViolations')` / `describe('レイヤー違反を検出する')` / `context('禁止方向のimportが存在する場合')` / `it('違反エッジの配列が返される')` | `graph` に `domain -> application` エッジ、`boundaries=LayerBoundary.standardMatrix()` を設定 | `const actual = graph.findLayerViolations(boundaries)` | `actual` に `domain -> application` エッジが含まれる。 |
| UT-BA-124 | `target('ImportGraph.findLayerViolations')` / `describe('レイヤー違反を検出する')` / `context('許可方向のimportのみの場合')` / `it('空配列が返される')` | `graph` に `application -> domain` のみを設定 | `const actual = graph.findLayerViolations(boundaries)` | `actual` が空配列。 |
| UT-BA-125 | `target('ImportGraph.findGhostFiles')` / `describe('未参照ファイルを検出する')` / `context('importされていないファイルがある場合')` / `it('ゴーストファイルの配列が返される')` | `nodes=[entry.ts, orphan.ts]`, `edges=[]`, `rootNodes=[entry.ts]` | `const actual = graph.findGhostFiles({ ignorePatterns: [] })` | `actual` に `orphan.ts` が含まれる。 |
| UT-BA-126 | `target('ImportGraph.findGhostFiles')` / `describe('未参照ファイルを検出する')` / `context('ignorePatterns対象のファイルの場合')` / `it('除外されて返されない')` | `nodes=[entry.ts, generated.ts]`, `ignorePatterns=['generated']` | `const actual = graph.findGhostFiles({ ignorePatterns })` | `actual` に `generated.ts` が含まれない。 |
| UT-BA-127 | `target('ImportGraph.findGhostFiles')` / `describe('未参照ファイルを検出する')` / `context('rootNodesに含まれるファイルの場合')` / `it('ゴーストファイルとして報告されない')` | `rootNodes=[entry.ts]`, `nodes=[entry.ts]` | `const actual = graph.findGhostFiles({ ignorePatterns: [] })` | `actual` が空配列。 |
| UT-BA-128 | `target('ImportGraph.incomingCount')` / `describe('被参照数を返す')` / `context('複数のファイルから参照されている場合')` / `it('正しいカウントが返される')` | `graph` に `a->c`, `b->c` を設定 | `const actual = graph.incomingCount(c.ts)` | `actual` が `2`。 |
| UT-BA-129 | `target('ImportGraph.incomingCount')` / `describe('被参照数を返す')` / `context('参照されていないファイルの場合')` / `it('0が返される')` | `graph` に `a->b` のみを設定、対象は `c.ts` | `const actual = graph.incomingCount(c.ts)` | `actual` が `0`。 |
| UT-BA-130 | `target('ImportGraph.outgoingEdgesOf')` / `describe('指定ファイルからの出力エッジを返す')` / `context('出力エッジが存在する場合')` / `it('対応するImportEdge配列が返される')` | `graph` に `a->b`, `a->c` を設定 | `const actual = graph.outgoingEdgesOf(a.ts)` | `actual.length` が `2`。 |
| UT-BA-131 | `target('ImportGraph.outgoingEdgesOf')` / `describe('指定ファイルからの出力エッジを返す')` / `context('出力エッジが存在しない場合')` / `it('空配列が返される')` | `graph` に `a->b` のみを設定、対象は `c.ts` | `const actual = graph.outgoingEdgesOf(c.ts)` | `actual` が空配列。 |
| UT-BA-132 | `target('ImportGraph.detectCycles')` / `describe('循環依存を検出する')` / `context('自己参照（from === to）のエッジがある場合')` / `it('1メンバーのImportCycleとして報告される')` | `graph=createImportGraph({ nodes:[a.ts], edges:[a->a], rootNodes:[a.ts] })` | `const actual = graph.detectCycles()` | `actual.length` が 1 以上で、先頭循環が `a.ts` を含む自己循環として扱われる。 |

### 3.13 `value-objects/lint-report.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-133 | `target('LintReport.create')` / `describe('レポートを生成する')` / `context('正常な属性値の場合')` / `it('LintReportが生成される')` | `violations=[error1, warning1]`, `durationMs=10`, `scannedFiles=2` | `const actual = LintReport.create(props)` | `actual.violationCount()` が `2`。 |
| UT-BA-134 | 同上 / `context('durationMsが負数の場合')` / `it('エラーがスローされる')` | `props.durationMs=-1` | `const act = () => LintReport.create(props)` | `expect(act).toThrow()`。 |
| UT-BA-135 | 同上 / `context('scannedFilesが負数の場合')` | `props.scannedFiles=-1` | 同上 | 同上。 |
| UT-BA-136 | 同上 / `context('durationMs=0, scannedFiles=0の最小許容値の場合')` / `it('LintReportが生成される')` | `props.durationMs=0`, `props.scannedFiles=0` | `const actual = LintReport.create(props)` | 0 値で生成成功する。 |
| UT-BA-137 | `target('LintReport.hasErrors')` / `describe('エラーの存在を判定する')` / `context('severity="error"の違反がある場合')` / `it('trueを返す')` | `sut=createLintReport({ violations:[createRuleViolation({ severity: 'error' })] })` | `const actual = sut.hasErrors()` | `actual` が `true`。 |
| UT-BA-138 | `target('LintReport.hasErrors')` / `describe('エラーの存在を判定する')` / `context('severity="warning"の違反のみの場合')` / `it('falseを返す')` | `sut=createLintReport({ violations:[createRuleViolation({ severity: 'warning' })] })` | `const actual = sut.hasErrors()` | `actual` が `false`。 |
| UT-BA-139 | `target('LintReport.errorCount')` / `describe('エラー件数を返す')` / `context('error2件warning1件の場合')` / `it('2が返される')` | `sut=createLintReport({ violations:[error1,error2,warning1] })` | `const actual = sut.errorCount()` | `actual` が `2`。 |
| UT-BA-140 | `target('LintReport.warningCount')` / `describe('warning件数を返す')` / `context('error2件warning1件の場合')` / `it('1が返される')` | `sut=createLintReport({ violations:[error1,error2,warning1] })` | `const actual = sut.warningCount()` | `actual` が `1`。 |
| UT-BA-141 | `target('LintReport.warningCount')` / `describe('warning件数を返す')` / `context('warningの違反がない場合')` / `it('0が返される')` | `sut=createLintReport({ violations:[error1,error2] })` | `const actual = sut.warningCount()` | `actual` が `0`。 |
| UT-BA-142 | `target('LintReport.violationCount')` / `describe('全違反件数を返す')` / `context('error2件warning1件の場合')` / `it('3が返される')` | `sut=createLintReport({ violations:[error1,error2,warning1] })` | `const actual = sut.violationCount()` | `actual` が `3`。 |

### 3.14 `domain/rule-definition-registry.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-143 | `target('RuleDefinitionRegistry.getAll')` / `describe('全ルール定義を返す')` / `context('—')` / `it('8件のRuleDefinitionが返される')` | `sut=createRegistry()` | `const actual = sut.getAll()` | `actual.length` が `8`。 |
| UT-BA-144 | 同上 / `it('ルール名昇順でソートされている')` | `sut=createRegistry()` | `const actual = sut.getAll()` | `actual.map(name)` が文字列昇順。 |
| UT-BA-145 | 同上 / `it('全ルールのerrorCodeが一意である')` | `sut=createRegistry()` | `const actual = sut.getAll()` | `new Set(actual.map(errorCode)).size === actual.length`。 |
| UT-BA-146 | 同上 / `it('全ルールのRuleTypeがBiomeNativeまたはExternalAnalyzerである')` | `sut=createRegistry()` | `const actual = sut.getAll()` | 各 `rule.type` が 2 値のいずれか。 |
| UT-BA-147 | 同上 / `it('errorCodeがL1-001からL1-008の範囲内である')` | `sut=createRegistry()` | `const actual = sut.getAll()` | 全 `errorCode` が `L1-001..L1-008` に含まれる。 |
| UT-BA-148 | 同上 / `it('各ルールのrequiredInputsが空でない')` | `sut=createRegistry()` | `const actual = sut.getAll()` | すべての `requiredInputs.length > 0`。 |
| UT-BA-149 | `target('RuleDefinitionRegistry.resolveEnabled')` / `describe('L1設定に基づき有効ルールを解決する')` / `context('l1Enabled=falseの場合')` / `it('全ルールがskippedRulesに含まれる')` | `sut=createRegistry()`, `config={ l1Enabled:false, rules:{} }` | `const actual = sut.resolveEnabled(config)` | `actual.enabledRules` が空、`actual.skippedRules.length` が `8`。 |
| UT-BA-150 | 同上 / `context('l1Enabled=trueで設定なしの場合')` / `it('8件全てがenabledRulesに含まれる')` | `config={ l1Enabled:true, rules:{} }` | 同上 | `actual.enabledRules.length` が `8`。 |
| UT-BA-151 | 同上 / `context('特定ルールが"off"の場合')` / `it('そのルールがskippedRulesに含まれる')` | `config.rules={'require-unit-comment':'off'}` | 同上 | `skippedRules` に `require-unit-comment` が含まれ、`enabledRules` には含まれない。 |
| UT-BA-152 | 同上 / `context('特定ルールが"warning"の場合')` / `it('そのルールのseverityがwarningになる')` | `config.rules={'no-any-abuse':'warning'}` | 同上 | `enabledRules` 内の `no-any-abuse` の `severity` が `warning`。 |
| UT-BA-153 | 同上 / `context('特定ルールが"error"の場合')` / `it('そのルールのseverityがerrorになる')` | `config.rules={'no-any-abuse':'error'}` | 同上 | 対象ルールの `severity` が `error`。 |
| UT-BA-154 | 同上 / `context('未定義のルール名が設定にある場合')` / `it('UnknownRuleNameErrorがスローされる')` | `config.rules={'unknown-rule':'error'}` | `const act = () => sut.resolveEnabled(config)` | `expect(act).toThrow(UnknownRuleNameError)`。 |
| UT-BA-155 | 同上 / `context('不正なseverity値が設定にある場合')` / `it('InvalidRuleSeverityErrorがスローされる')` | `config.rules={'require-unit-comment':'critical'}` | `const act = () => sut.resolveEnabled(config)` | `expect(act).toThrow(InvalidRuleSeverityError)`。 |
| UT-BA-156 | 同上 / `context('enabledRulesとskippedRulesが排他的である場合')` / `it('両方にルールが重複しない')` | `config.rules={'require-unit-comment':'off','no-any-abuse':'warning'}` | `const actual = sut.resolveEnabled(config)` | `enabledRules` と `skippedRules` のルール名集合が交差しない。 |
| UT-BA-157 | `target('RuleDefinitionRegistry.getByName')` / `describe('指定ルール名のRuleDefinitionを返す')` / `context('存在するルール名の場合')` / `it('対応するRuleDefinitionが返される')` | `sut=createRegistry()`, `name=createRuleName('require-unit-comment')` | `const actual = sut.getByName(name)` | `actual.name.equals(name)` が `true`。 |
| UT-BA-158 | `target('RuleDefinitionRegistry.getByName')` / `describe('指定ルール名のRuleDefinitionを返す')` / `context('—')` / `it('返却されたRuleDefinitionのnameが指定したRuleNameと一致する')` | `sut=createRegistry()`, `name=createRuleName('no-layer-violation')` | `const actual = sut.getByName(name)` | `actual.name.equals(name)` が `true`。 |
| UT-BA-159 | `target('RuleDefinitionRegistry.getByName')` / `describe('指定ルール名のRuleDefinitionを返す')` / `context('存在しないルール名の場合')` / `it('UnknownRuleNameErrorがスローされる')` | `sut=createRegistry()`, `name={ toString: () => 'unknown-rule' } as RuleName` | `const act = () => sut.getByName(name)` | `expect(act).toThrow(UnknownRuleNameError)`。 |
| UT-BA-160 | `target('RuleDefinitionRegistry.getByName')` / `describe('8ルール全てを個別取得できる')` / `context('8つの正規ルール名それぞれの場合')` / `it('対応するRuleDefinitionが返される')` | `sut=createRegistry()`, `names=[8つの正規RuleName]` | `const actual = names.map((name) => sut.getByName(name))` | 8 件すべてが取得でき、`actual[i].name.equals(names[i])` が `true`。 |

### 3.15 `domain/import-graph-builder.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-161 | `target('ImportGraphBuilder.build')` / `describe('スナップショット群からImportGraphを構築する')` / `context('正常なスナップショット群の場合')` / `it('ノードとエッジが正しく構築される')` | `sut=new ImportGraphBuilder()`, `snapshots=[a imports b, b imports none]` | `const actual = sut.build(snapshots)` | `actual.nodes.length` が 2、`a->b` エッジが含まれる。 |
| UT-BA-162 | 同上 / `context('isEntrypointCandidate=trueのファイルがある場合')` / `it('rootNodesに含まれる')` | `snapshots` の 1 件を `isEntrypointCandidate=true` にする | 同上 | `actual.rootNodes` に対象 `filePath` が含まれる。 |
| UT-BA-163 | 同上 / `context('index.tsファイルがある場合')` / `it('rootNodesに既定で含まれる')` | `snapshots` に `.../index.ts` を含める | 同上 | `actual.rootNodes` に `index.ts` が含まれる。 |
| UT-BA-164 | 同上 / `context('presentation/cli配下のファイルがある場合')` / `it('rootNodesに既定で含まれる')` | `snapshots` に `presentation/cli/main.ts` を含める | 同上 | `actual.rootNodes` に当該ファイルが含まれる。 |
| UT-BA-165 | 同上 / `context('重複importがある場合')` / `it('エッジが重複除去される')` | 1 スナップショットに同一 import を 2 回入れる | 同上 | 重複エッジが 1 件に正規化される。 |
| UT-BA-166 | 同上 / `context('空のスナップショット配列の場合')` / `it('空のImportGraphが返される')` | `snapshots=[]` | `const actual = sut.build(snapshots)` | `actual.nodes`, `actual.edges`, `actual.rootNodes` が空。 |
| UT-BA-167 | 同上 / `context('複数ファイルが相互参照している場合')` / `it('双方向のエッジが構築される')` | `a imports b`, `b imports a` のスナップショットを作る | `const actual = sut.build(snapshots)` | `a->b` と `b->a` の両方が含まれる。 |
| UT-BA-168 | 同上 / `context('type-only importのみの場合')` / `it('importKind="type"のエッジが構築される')` | `imports` を `type` 指定で作る | `const actual = sut.build(snapshots)` | 生成エッジの `importKind` が `type`。 |
| UT-BA-169 | 同上 / `context('importsが空のスナップショットの場合')` / `it('ノードのみが登録されエッジは空である')` | `snapshots=[imports=[]]` | `const actual = sut.build(snapshots)` | ノードは 1 件、エッジは 0 件。 |
| UT-BA-170 | 同上 / `context('自己参照importがある場合')` / `it('from===toのエッジが構築される')` | `a.ts` が自身を import するスナップショットを作る | `const actual = sut.build(snapshots)` | `from===to` のエッジが 1 件含まれる。 |

### 3.16 `domain/lint-runner.test.ts`

| ケースID | テスト構造 | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-BA-171 | `target('LintRunner.run')` / `describe('require-unit-commentの違反判定を実行する')` / `context('declaredUnitがnullの場合')` / `it('違反が報告される')` | `sut=createLintRunner()`, `rules=[require-unit-comment]`, `snapshots=[declaredUnit:null]`, `graph` は空または整合 | `const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 })` | `actual.violations` に `require-unit-comment` の違反が 1 件以上含まれる。 |
| UT-BA-172 | `target('LintRunner.run')` / `describe('require-unit-commentの違反判定を実行する')` / `context('declaredUnitが設定されている場合')` / `it('違反が報告されない')` | `snapshots=[declaredUnit:'biome-ast-engine']` | 同上 | `require-unit-comment` の違反が 0 件。 |
| UT-BA-173 | `target('LintRunner.run')` / `describe('require-layer-commentの違反判定を実行する')` / `context('declaredLayerがnullの場合')` / `it('違反が報告される')` | `rules=[require-layer-comment]`, `snapshots=[declaredLayer:null]` | 同上 | `require-layer-comment` の違反が含まれる。 |
| UT-BA-174 | `target('LintRunner.run')` / `describe('require-layer-commentの違反判定を実行する')` / `context('declaredLayerが設定されている場合')` / `it('違反が報告されない')` | `snapshots=[declaredLayer:domain]` | 同上 | 対象違反が 0 件。 |
| UT-BA-175 | `target('LintRunner.run')` / `describe('no-layer-violationの違反判定を実行する')` / `context('レイヤー違反importがある場合')` / `it('違反が報告される')` | `rules=[no-layer-violation]`, `graph` に `domain -> application` を含める | 同上 | `no-layer-violation` の違反が含まれる。 |
| UT-BA-176 | `target('LintRunner.run')` / `describe('no-layer-violationの違反判定を実行する')` / `context('正規の依存方向のみの場合')` / `it('違反が報告されない')` | `graph` を `application -> domain` のみで構成 | 同上 | 対象違反が 0 件。 |
| UT-BA-177 | `target('LintRunner.run')` / `describe('enforce-folder-structureの違反判定を実行する')` / `context('declaredLayerとディレクトリが不一致の場合')` / `it('違反が報告される')` | `rules=[enforce-folder-structure]`, `snapshot.filePath='.../application/usecase.ts'`, `declaredLayer='domain'` | 同上 | `enforce-folder-structure` の違反が含まれる。 |
| UT-BA-178 | `target('LintRunner.run')` / `describe('enforce-folder-structureの違反判定を実行する')` / `context('declaredLayerとディレクトリが一致する場合')` / `it('違反が報告されない')` | `filePath='.../domain/rule.ts'`, `declaredLayer='domain'` | 同上 | 対象違反が 0 件。 |
| UT-BA-179 | `target('LintRunner.run')` / `describe('no-any-abuseの違反判定を実行する')` / `context('anyTypeCountが閾値超過の場合')` / `it('違反が報告される')` | `rules=[no-any-abuse]`, `snapshot.anyTypeCount=5`, `typedNodeCount=10`, `rule.config.threshold=0.4` など超過条件を作る | 同上 | `no-any-abuse` の違反が含まれる。 |
| UT-BA-180 | `target('LintRunner.run')` / `describe('no-any-abuseの違反判定を実行する')` / `context('anyTypeCountが閾値内の場合')` / `it('違反が報告されない')` | 同条件で `anyRatio <= threshold` にする | 同上 | 対象違反が 0 件。 |
| UT-BA-181 | `target('LintRunner.run')` / `describe('no-code-duplicationの違反判定を実行する')` / `context('同一fingerprintがminOccurrences以上の場合')` / `it('違反が報告される')` | `rules=[no-code-duplication]`, `snapshots` に同一 `fingerprint` を持つモジュールを `minOccurrences` 件以上作る | 同上 | `no-code-duplication` の違反が含まれる。 |
| UT-BA-182 | `target('LintRunner.run')` / `describe('no-code-duplicationの違反判定を実行する')` / `context('重複がない場合')` / `it('違反が報告されない')` | `fingerprint` をすべて一意にする | 同上 | 対象違反が 0 件。 |
| UT-BA-183 | `target('LintRunner.run')` / `describe('no-ghost-fileの違反判定を実行する')` / `context('importされていないファイルがある場合')` / `it('違反が報告される')` | `rules=[no-ghost-file]`, `graph` に `orphan.ts` を未参照ノードとして含める | 同上 | `no-ghost-file` の違反が含まれる。 |
| UT-BA-184 | `target('LintRunner.run')` / `describe('no-ghost-fileの違反判定を実行する')` / `context('全ファイルが参照されている場合')` / `it('違反が報告されない')` | すべてのノードを `rootNodes` または参照対象にする | 同上 | 対象違反が 0 件。 |
| UT-BA-185 | `target('LintRunner.run')` / `describe('no-comment-floodの違反判定を実行する')` / `context('commentDensityが閾値超過の場合')` / `it('違反が報告される')` | `rules=[no-comment-flood]`, `snapshot.commentLineCount=8`, `logicalLineCount=10`, `threshold=0.5` など超過条件を作る | 同上 | `no-comment-flood` の違反が含まれる。 |
| UT-BA-186 | `target('LintRunner.run')` / `describe('no-comment-floodの違反判定を実行する')` / `context('commentDensityが閾値内の場合')` / `it('違反が報告されない')` | `commentDensity <= threshold` にする | 同上 | 対象違反が 0 件。 |
| UT-BA-187 | `target('LintRunner.run')` / `describe('LintReportを構築する')` / `context('違反ゼロのルールがある場合')` / `it('passedRulesに含まれる')` | `rules` に違反なしルールと違反ありルールを混在させる | 同上 | 違反 0 件のルール名が `actual.passedRules` に含まれる。 |
| UT-BA-188 | `target('LintRunner.run')` / `describe('LintReportを構築する')` / `context('—')` / `it('passedRulesとskippedRulesが排他的である')` | `rules` に実行対象と `enabled=false` ルールを混在させる | 同上 | `passedRules` と `skippedRules` の交差が空。 |
| UT-BA-189 | `target('LintRunner.run')` / `describe('LintReportを構築する')` / `context('—')` / `it('全violationsのruleNameがRuleDefinitionRegistryに登録済みである')` | `sut` と同じ `registry=createRegistry()` を用意し、複数違反を出す | 同上 | `actual.violations.every(v => registry.getByName(v.ruleName))` が真になる。 |
| UT-BA-190 | `target('LintRunner.run')` / `describe('LintReportを構築する')` / `context('durationMsが指定されている場合')` / `it('LintReportのdurationMsに正しく反映される')` | `durationMs=123` を渡す | 同上 | `actual.durationMs` が `123`。 |
| UT-BA-191 | `target('LintRunner.run')` / `describe('不正な入力を検出する')` / `context('空のrules配列の場合')` / `it('空のviolationsを持つLintReportが返される')` | `rules=[]`, `snapshots` は任意の正常データ | `const actual = sut.run({ rules, snapshots, importGraph: graph, durationMs: 10 })` | `actual.violations` が空、`actual.passedRules` と `actual.skippedRules` も空または設計値どおり。 |
| UT-BA-192 | `target('LintRunner.run')` / `describe('不正な入力を検出する')` / `context('rulesに未知のRuleNameが含まれる場合')` / `it('run()メソッド冒頭でUnknownRuleNameErrorがスローされる')` | `rules=[未知RuleNameを持つRuleDefinition風オブジェクト]` | `const act = () => sut.run({ rules, snapshots: [], importGraph: emptyGraph, durationMs: 0 })` | `expect(act).toThrow(UnknownRuleNameError)`。評価系ロジックに入る前に失敗することを、補助スパイを使わず返却なしで確認する。 |

## 4. モック戦略

| 対象 | 方針 | 詳細 |
|---|---|---|
| 値オブジェクト | モック禁止 | すべて実体を生成し、生成・比較・変換を直接検証する。 |
| ドメインサービス | モック禁止 | `RuleDefinitionRegistry`, `ImportGraphBuilder`, `LintRunner` は実体生成し、入力データだけを差し替える。 |
| 共有入力 | ファクトリで固定化 | `FilePath`, `LayerName`, `RuleDefinition`, `SourceModuleSnapshot` の既定値をヘルパーに集約し、各ケースでは差分だけを上書きする。 |
| 例外系 | 関数ラップで検証 | `const act = () => ...` / `const act = async () => ...` を使い、`actual` 変数は成功系のみに使う。 |
| 集合比較 | 文字列化比較 | `RuleName[]`, `FilePath[]`, `ImportEdge[]` は `toString()` または `from/to/importKind` のタプルに正規化して比較する。 |

## 5. 境界値テスト一覧

### 5.1 ケースIDを持つ境界値

| 対象 | 境界値 | ケースID | 期待結果 |
|---|---|---|---|
| `RuleName.fromString` | 正規値 5 件 / 未定義値 | UT-BA-001〜006 | 正規値は生成、未定義値は例外。 |
| `RuleType.fromString` | 2 正規値 / 廃止値 / 未定義値 | UT-BA-013〜016 | 正規値は生成、その他は例外。 |
| `LayerName.fromString` | 4 正規値 / v0 語彙 3 件 | UT-BA-021〜027 | 正規値は生成、v0 語彙は例外。 |
| `FilePath.fromWorkspaceRelative` | 空文字, `..` 始まり, 絶対パス, Windows パス, `.` | UT-BA-031〜036 | 不正パスは例外。 |
| `ImportCycle.create` | 0 件, 1 件, 2 件 | UT-BA-059〜061 | 0/1 は例外、2 は最小成功。 |
| `SourceModuleSnapshot.create` | 件数系 `-1` / `0` | UT-BA-076〜083 | 負数は例外、0 は生成可。 |
| `RuleDefinition.create` | `L1-001`, `L1-008`, `L1-000`, `L1-009`, `L2-001` | UT-BA-092〜096 | 範囲内のみ生成可。 |
| `RuleViolation.create` | `line=0`, `column=0`, `line=1,column=1` | UT-BA-106〜114 | 0 は例外、1 は最小成功。 |
| `ImportGraph.create` | 空グラフ, 重複ノード, 重複エッジ, 不正 root | UT-BA-116〜119 | 不正 root は例外、他は正規化。 |
| `ImportGraph.detectCycles` | 2 ノード循環, 3 ノード循環, 自己循環 | UT-BA-120, 122, 132 | すべて `ImportCycle` として返す。 |
| `LintReport.create` | `durationMs=-1`, `scannedFiles=-1`, `0/0` | UT-BA-134〜136 | 負数は例外、0 は成功。 |
| `RuleDefinitionRegistry.resolveEnabled` | `l1Enabled=false`, `off`, `warning`, `error`, 未知 rule, 不正 severity | UT-BA-149〜156 | 設定に応じて enabled/skipped/例外を分岐。 |
| `LintRunner.run` | 空 rules, 未知 rule | UT-BA-191〜192 | 空配列は空レポート、未知 rule は fail-fast。 |

### 5.2 `coverage_report.md` との整合メモ

- `coverage_report.md` が未カバーとしている `typedNodeCount=0` と `logicalLineCount=0` のゼロ除算ガード、および `RuleViolation.severity` 制約は、`unit_test_design.md` にケースIDが存在しないため本書では追加していない。
- 実装着手前にケース追加が必要になった場合は、まず `unit_test_design.md` 側でケースIDを採番してから本書を更新する。
