# ユニットテストロジック設計: adr-foundation

@story-id H05-01
@story-id H05-02
@story-id H05-03
> **Unit ID**: adr-foundation
> **対象**: `unit_test_design.md` に定義された domain 層 139 ケース
> **前提**: `coverage_report.md` で未カバーとされた3件は UseCase / IT 対象であり、本書では追加しない

## 1. テストファイル構成

| ファイルパス | 対象モデル | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/adr-foundation/adr.test.ts` | ADR | 37 |
| `scripts/harness/__tests__/unit/adr-foundation/adr-id.test.ts` | AdrId | 12 |
| `scripts/harness/__tests__/unit/adr-foundation/adr-status.test.ts` | AdrStatus | 14 |
| `scripts/harness/__tests__/unit/adr-foundation/adr-frontmatter.test.ts` | AdrFrontmatter | 16 |
| `scripts/harness/__tests__/unit/adr-foundation/adr-body.test.ts` | AdrBody | 10 |
| `scripts/harness/__tests__/unit/adr-foundation/archgate-entry.test.ts` | ArchgateEntry | 10 |
| `scripts/harness/__tests__/unit/adr-foundation/archgate-mapping.test.ts` | ArchgateMapping | 12 |
| `scripts/harness/__tests__/unit/adr-foundation/superseded-by-ref.test.ts` | SupersededByRef | 5 |
| `scripts/harness/__tests__/unit/adr-foundation/adr-file-path.test.ts` | AdrFilePath | 10 |
| `scripts/harness/__tests__/unit/adr-foundation/adr-validation-service.test.ts` | AdrValidationService | 13 |

### 共通スイート骨子

```ts
import { describe, expect, it } from "vitest";

const target = describe;
const context = describe;

target("対象クラス名", () => {
  describe("対象メソッド名", () => {
    context("前提条件", () => {
      it("期待値", () => {
        // Arrange
        // Act
        // Assert
      });
    });
  });
});
```

## 2. 共通ヘルパー・ファクトリ

### 2.1 共通ファクトリ

| ヘルパー名 | 用途 |
|---|---|
| `createAdrId(value = "001")` | `AdrId` 実体を生成する。正常系の既定値は `"001"` |
| `createAdrStatus(value = "Proposed")` | `AdrStatus` 実体を生成する |
| `createSupersededByRef(value = "002")` | `SupersededByRef` 実体を生成する |
| `createArchgateEntry(params?)` | `validator_id` と `error_code` が妥当な `ArchgateEntry` を生成する |
| `createArchgateMapping(params?)` | `adr_id` と `enforced_by` を保持した `ArchgateMapping` を生成する |
| `createAdrFrontmatter(params?)` | 正常な `AdrFrontmatter` を生成し、必要なケースだけ差分を上書きする |
| `createAdrBody(params?)` | `context / decision / consequences / alternatives` を持つ `AdrBody` を生成する |
| `createAdrAggregate(params?)` | `ADR.create(...)` または `ADR.reconstitute(...)` を通して正常な `ADR` を生成する |
| `createValidationService()` | 実体の `AdrValidationService` を生成する |
| `createAdrFilePath(value?)` | 正常な `AdrFilePath` を生成する |

### 2.2 不正入力ビルダー

値オブジェクト単体の生成で先に失敗してしまうケースでは、集約やサービスの責務を直接検証できるよう、以下の「プリミティブ入力ビルダー」を使う。

| ビルダー名 | 用途 |
|---|---|
| `buildFrontmatterPrimitives(overrides?)` | `ADR.create` / `ADR.reconstitute` / `validateFrontmatter` 用の frontmatter 入力を組み立てる |
| `buildBodyPrimitives(overrides?)` | `ADR.create` / `ADR.reconstitute` / `validateBody` 用の body 入力を組み立てる |
| `buildArchgatePrimitives(overrides?)` | `archgate` の不正形式や重複を含む入力を組み立てる |
| `buildMalformedAdrDocument(overrides?)` | `ADR.reconstitute` 用の永続化済み文書入力を組み立てる |

### 2.3 共通 Assert ヘルパー

| ヘルパー名 | 用途 |
|---|---|
| `expectStatus(actual, expected)` | `actual.getStatus().equals(expected)` を確認する |
| `expectArchgate(actual, expected)` | `actual.getArchgate()?.equals(expected)` または `undefined` を確認する |
| `expectFrontmatterUnchanged(before, after)` | イミュータブル設計の確認に使う |
| `expectThrows(action, ErrorClass)` | 同期メソッドの例外種別を検証する |
| `expectPrimitives(actual, expectedSubset)` | `toPrimitives()` / `toSectionMap()` の形状を比較する |

### 2.4 データ設計ルール

- `AdrId` は `"001"`, `"002"`, `"010"` のように比較しやすい値で固定する
- `date` は `"2026-03-13"` を既定値とし、日付形式の境界値だけ `"2026-1-1"` を使う
- `validator_id` は `"phase-gate"`、`error_code` は `"L1-001"` を既定値とする
- `title` は `"Package Separation"` のような slug 化しやすい文字列を使う
- ドメインエンティティと値オブジェクトはモックしない。`AdrValidationService` も実体を使う

## 3. テストケース詳細ロジック

### 3.1 `adr.test.ts`

#### `create()` / `reconstitute()`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-001 | `frontmatter = createAdrFrontmatter()`、`body = createAdrBody()`、`service = createValidationService()` を用意する | `const actual = ADR.create(frontmatter, body, service)` | `actual` が `ADR` 実体であり、`getFrontmatter()` と `getBody()` が Arrange で渡した値と等価であることを確認する |
| UT-AF-002 | `archgate` を含む `frontmatter = createAdrFrontmatter({ archgate: createArchgateMapping() })` を用意する | `const actual = ADR.create(frontmatter, body, service)` | `actual.getArchgate()` が `ArchgateMapping` を返し、`enforced_by` が保持されることを確認する |
| UT-AF-003 | `buildFrontmatterPrimitives({ title: "" })` と正常な body 入力を用意する | `const action = () => ADR.create(frontmatterInput, bodyInput, service)` | `AdrValidationError` がスローされることを確認する |
| UT-AF-004 | `buildBodyPrimitives({ decision: "" })` のように必須セクションを欠落させる | `const action = () => ADR.create(frontmatterInput, bodyInput, service)` | `AdrBodySectionRequiredError` がスローされることを確認する |
| UT-AF-005 | `buildArchgatePrimitives({ enforced_by: [{ validator_id: "phase-gate", error_code: "X1-001" }] })` を組み込んだ frontmatter 入力を用意する | `const action = () => ADR.create(frontmatterInput, bodyInput, service)` | `InvalidArchgateErrorCodeError` がスローされることを確認する |
| UT-AF-006 | `buildArchgatePrimitives()` に同一の `(validator_id, error_code)` を2件入れる | `const action = () => ADR.create(frontmatterInput, bodyInput, service)` | `DuplicateArchgateEntryError` がスローされることを確認する |
| UT-AF-007 | `buildMalformedAdrDocument()` ではなく、完全に妥当な永続化済み文書入力を用意する | `const actual = ADR.reconstitute(document, service)` | `actual.toAdrRef()` が `"ADR-001"` を返し、frontmatter/body が復元されることを確認する |
| UT-AF-008 | `buildMalformedAdrDocument({ frontmatter: { status: "Invalid" } })` などの不正文書を用意する | `const action = () => ADR.reconstitute(document, service)` | `MalformedAdrDocumentError` がスローされることを確認する |

#### 状態遷移メソッド

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-009 | `sut = createAdrAggregate({ status: "Proposed" })` を用意する | `const actual = sut.approve()` | `actual` のステータスが `Accepted` に遷移し、元の `sut` が不変ならその点も確認する |
| UT-AF-010, UT-AF-011, UT-AF-012 | それぞれ `Accepted` / `Deprecated` / `Superseded` 状態の `sut` を用意する | `const action = () => sut.approve()` | すべて `InvalidAdrStatusTransitionError` がスローされることを確認する |
| UT-AF-013 | `sut = createAdrAggregate({ status: "Proposed" })` を用意する | `const actual = sut.deprecate()` | `actual` のステータスが `Deprecated` になることを確認する |
| UT-AF-014 | `sut = createAdrAggregate({ status: "Accepted" })` を用意する | `const actual = sut.deprecate()` | `actual` のステータスが `Deprecated` になることを確認する |
| UT-AF-015, UT-AF-016 | それぞれ `Superseded` / `Deprecated` 状態の `sut` を用意する | `const action = () => sut.deprecate()` | `InvalidAdrStatusTransitionError` がスローされることを確認する |
| UT-AF-017 | `sut = createAdrAggregate({ status: "Accepted" })`、`nextAdrId = createAdrId("002")` を用意する | `const actual = sut.supersede(nextAdrId)` | `actual.getStatus()` が `Superseded`、`actual.getFrontmatter().superseded_by` が `"ADR-002"` を指すことを確認する |
| UT-AF-018 | `sut = createAdrAggregate({ adrId: "001", status: "Accepted" })`、`sameAdrId = createAdrId("001")` を用意する | `const action = () => sut.supersede(sameAdrId)` | `SelfSupersedeNotAllowedError` がスローされることを確認する |
| UT-AF-019, UT-AF-020, UT-AF-021 | それぞれ `Proposed` / `Deprecated` / `Superseded` 状態の `sut` を用意する | `const action = () => sut.supersede(createAdrId("002"))` | `InvalidAdrStatusTransitionError` がスローされることを確認する |
| UT-AF-022 | `sut = createAdrAggregate({ status: "Deprecated" })` を用意する | `const actual = sut.repropose()` | `actual` のステータスが `Proposed` に戻ることを確認する |
| UT-AF-023, UT-AF-024, UT-AF-025 | それぞれ `Accepted` / `Proposed` / `Superseded` 状態の `sut` を用意する | `const action = () => sut.repropose()` | `InvalidAdrStatusTransitionError` がスローされることを確認する |

#### `updateBody()` / `replaceArchgate()` / getter

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-026 | `sut` と `newBody = createAdrBody({ decision: "new decision" })` を用意する | `const actual = sut.updateBody(newBody)` | `actual.getBody()` が `newBody` と等価であることを確認する |
| UT-AF-027 | `sut` と `buildBodyPrimitives({ consequences: "" })` を用意する | `const action = () => sut.updateBody(bodyInput)` | `AdrBodySectionRequiredError` がスローされることを確認する |
| UT-AF-028 | `sut` と正常な `newArchgate = createArchgateMapping()` を用意する | `const actual = sut.replaceArchgate(newArchgate)` | `actual.getArchgate()` が `newArchgate` と等価であることを確認する |
| UT-AF-029 | archgate 付き `sut` を用意する | `const actual = sut.replaceArchgate(undefined)` | `actual.getArchgate()` が `undefined` になることを確認する |
| UT-AF-030 | `sut` と不正 `error_code` を含む `archgateInput` を用意する | `const action = () => sut.replaceArchgate(archgateInput)` | `InvalidArchgateErrorCodeError` がスローされることを確認する |
| UT-AF-031 | `sut` と重複エントリを含む `archgateInput` を用意する | `const action = () => sut.replaceArchgate(archgateInput)` | `DuplicateArchgateEntryError` がスローされることを確認する |
| UT-AF-032 | 任意の正常 `sut` を用意する | `const actual = sut.getStatus()` | `actual.equals(createAdrStatus(sut の状態))` が `true` になることを確認する |
| UT-AF-033 | archgate 付き `sut` を用意する | `const actual = sut.getArchgate()` | `actual` が `ArchgateMapping` 実体であることを確認する |
| UT-AF-034 | archgate なし `sut` を用意する | `const actual = sut.getArchgate()` | `actual` が `undefined` であることを確認する |
| UT-AF-035 | 任意の `sut` を用意する | `const actual = sut.getFrontmatter()` | `actual` が `AdrFrontmatter` 実体であることを確認する |
| UT-AF-036 | 任意の `sut` を用意する | `const actual = sut.getBody()` | `actual` が `AdrBody` 実体であることを確認する |
| UT-AF-037 | `sut = createAdrAggregate({ adrId: "001" })` を用意する | `const actual = sut.toAdrRef()` | `actual` が `"ADR-001"` であることを確認する |

### 3.2 `adr-id.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-038 | 入力値 `"001"` を用意する | `const actual = AdrId.create("001")` | `actual.value` が `"001"`、`actual.toAdrRef()` が `"ADR-001"` であることを確認する |
| UT-AF-039 | 入力値 `"ADR-001"` を用意する | `const actual = AdrId.create("ADR-001")` | prefix が除去され、内部値が `"001"` に正規化されることを確認する |
| UT-AF-040, UT-AF-041, UT-AF-042, UT-AF-043 | 入力値を順に `"000"` / `"abc"` / `""` / `"01"` とする | `const action = () => AdrId.create(input)` | すべて生成エラーがスローされることを確認する |
| UT-AF-044 | 入力値 `"ADR-001"` を用意する | `const actual = AdrId.fromAdrRef("ADR-001")` | `actual.value` が `"001"` になることを確認する |
| UT-AF-045 | `sut = createAdrId("001")` を用意する | `const actual = sut.toNumber()` | `actual` が `1` であることを確認する |
| UT-AF-046 | `sut = createAdrId("001")` を用意する | `const actual = sut.toAdrRef()` | `actual` が `"ADR-001"` であることを確認する |
| UT-AF-047 | `left = createAdrId("001")`、`right = createAdrId("001")` を用意する | `const actual = left.equals(right)` | `actual` が `true` であることを確認する |
| UT-AF-048 | `left = createAdrId("001")`、`right = createAdrId("002")` を用意する | `const actual = left.equals(right)` | `actual` が `false` であることを確認する |
| UT-AF-049 | `left = createAdrId("001")`、`right = createAdrId("002")` を用意する | `const actual = left.compare(right)` | `actual` が負の値であることを確認し、昇順ソート契約に従うことを担保する |

### 3.3 `adr-status.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-050, UT-AF-051, UT-AF-052, UT-AF-053 | 入力値を順に `"Proposed"` / `"Accepted"` / `"Deprecated"` / `"Superseded"` とする | `const actual = AdrStatus.create(input)` | 各入力に対応する `AdrStatus` が生成されることを確認する |
| UT-AF-054, UT-AF-055 | 入力値を `"proposed"` / `"Invalid"` とする | `const action = () => AdrStatus.create(input)` | `InvalidAdrStatusError` がスローされることを確認する |
| UT-AF-056 | 事前条件なし | `const actual = AdrStatus.proposed()` | `actual.equals(AdrStatus.create("Proposed"))` が `true` になることを確認する |
| UT-AF-057 | 事前条件なし | `const actual = AdrStatus.accepted()` | `actual.equals(AdrStatus.create("Accepted"))` が `true` になることを確認する |
| UT-AF-058 | `from = createAdrStatus("Proposed")`、`to = createAdrStatus("Accepted")` を用意する | `const actual = from.canTransitionTo(to)` | `actual` が `true` であることを確認する |
| UT-AF-059 | `from = createAdrStatus("Proposed")`、`to = createAdrStatus("Deprecated")` を用意する | `const actual = from.canTransitionTo(to)` | `actual` が `true` であることを確認する |
| UT-AF-060 | `from = createAdrStatus("Accepted")`、`to = createAdrStatus("Superseded")` を用意する | `const actual = from.canTransitionTo(to)` | `actual` が `true` であることを確認する |
| UT-AF-061 | `from = createAdrStatus("Proposed")`、`to = createAdrStatus("Superseded")` を用意する | `const actual = from.canTransitionTo(to)` | `actual` が `false` であることを確認する |
| UT-AF-062 | 同じ状態の `AdrStatus` を2つ用意する | `const actual = left.equals(right)` | `actual` が `true` であることを確認する |
| UT-AF-063 | `sut = createAdrStatus("Superseded")` を用意する | `const actual = sut.isSuperseded()` | `actual` が `true` であることを確認する |

### 3.4 `adr-frontmatter.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-064 | `adr_id`, `title`, `status`, `date` を揃えた正常入力を用意する | `const actual = AdrFrontmatter.create(input)` | すべてのフィールドが保持された `AdrFrontmatter` が生成されることを確認する |
| UT-AF-065 | `title: ""` の入力を用意する | `const action = () => AdrFrontmatter.create(input)` | 妥当性エラーがスローされることを確認する |
| UT-AF-066 | `date: "2026-1-1"` の入力を用意する | `const action = () => AdrFrontmatter.create(input)` | 日付形式エラーがスローされることを確認する |
| UT-AF-067 | `status: "Superseded"` かつ `superseded_by` 未指定の入力を用意する | `const action = () => AdrFrontmatter.create(input)` | `SupersededByRequiredError` 相当のエラーがスローされることを確認する |
| UT-AF-068 | `status: "Accepted"` かつ `superseded_by: "ADR-002"` の入力を用意する | `const actual = AdrFrontmatter.create(input)` | `actual.toPrimitives()` に `superseded_by` が含まれないことを確認する |
| UT-AF-069 | `archgate.adr_id` だけ `"002"` にした入力を用意する | `const action = () => AdrFrontmatter.create(input)` | `adr_id` 不一致エラーがスローされることを確認する |
| UT-AF-070 | 正常な `archgate` 付き入力を用意する | `const actual = AdrFrontmatter.create(input)` | `actual.archgate` が保持されることを確認する |
| UT-AF-071 | `sut = createAdrFrontmatter({ status: "Proposed" })` を用意する | `const actual = sut.transitionStatus(createAdrStatus("Accepted"))` | `actual.status` が `Accepted` になった新インスタンスであることを確認する |
| UT-AF-072 | `sut = createAdrFrontmatter({ status: "Proposed" })` を用意する | `const actual = sut.transitionStatus(createAdrStatus("Accepted"))` | `sut.status` は `Proposed` のままで、`actual !== sut` であることを確認する |
| UT-AF-073 | `sut = createAdrFrontmatter({ status: "Accepted" })` と不正遷移先 `Proposed` を用意する | `const action = () => sut.transitionStatus(createAdrStatus("Proposed"))` | `InvalidAdrStatusTransitionError` がスローされることを確認する |
| UT-AF-074 | `sut` と `supersededBy = createSupersededByRef("002")` を用意する | `const actual = sut.withSupersededBy(supersededBy)` | `actual` の `superseded_by` が設定された新インスタンスであることを確認する |
| UT-AF-075 | `sut` と `archgate = createArchgateMapping()` を用意する | `const actual = sut.withArchgate(archgate)` | `actual.archgate` が設定された新インスタンスであることを確認する |
| UT-AF-076 | archgate 付き `sut` を用意する | `const actual = sut.withArchgate(undefined)` | `actual.archgate` が未設定の新インスタンスになることを確認する |
| UT-AF-077 | `archgate` と `superseded_by` を持つ `sut` を用意する | `const actual = sut.toPrimitives()` | `adr_id`, `title`, `status`, `date`, `archgate`, `superseded_by` がプリミティブ値で返ることを確認する |
| UT-AF-078 | archgate なし `sut` を用意する | `const actual = sut.toPrimitives()` | `actual` に `archgate` キーが含まれないことを確認する |
| UT-AF-079 | superseded_by なし `sut` を用意する | `const actual = sut.toPrimitives()` | `actual` に `superseded_by` キーが含まれないことを確認する |

### 3.5 `adr-body.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-080 | `context`, `decision`, `consequences` を埋めた入力を用意する | `const actual = AdrBody.create(input)` | `AdrBody` が生成されることを確認する |
| UT-AF-081, UT-AF-082, UT-AF-083 | 必須項目を順に `context: ""` / `decision: ""` / `consequences: ""` にした入力を用意する | `const action = () => AdrBody.create(input)` | `AdrBodySectionRequiredError` がスローされることを確認する |
| UT-AF-084 | `alternatives` を省略した入力を用意する | `const actual = AdrBody.create(input)` | `actual.alternatives` が `undefined` であることを確認する |
| UT-AF-085 | `alternatives: "   "` の入力を用意する | `const action = () => AdrBody.create(input)` | `AdrBodySectionRequiredError` がスローされることを確認する |
| UT-AF-086 | `sut = createAdrBody()` を用意する | `const actual = sut.withAlternatives("案B")` | `actual.alternatives` が `"案B"` の新インスタンスであることを確認する |
| UT-AF-087 | alternatives 付き `sut` を用意する | `const actual = sut.withAlternatives(undefined)` | `actual.alternatives` が `undefined` の新インスタンスになることを確認する |
| UT-AF-088 | 全セクションを持つ `sut` を用意する | `const actual = sut.toSectionMap()` | `Context`, `Decision`, `Consequences`, `Alternatives` の4キーが返ることを確認する |
| UT-AF-089 | 同じ内容の `AdrBody` を2つ用意する | `const actual = left.equals(right)` | `actual` が `true` であることを確認する |

### 3.6 `archgate-entry.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-090 | `validator_id: "phase-gate"`、`error_code: "L1-001"` の入力を用意する | `const actual = ArchgateEntry.create(input)` | `ArchgateEntry` が生成されることを確認する |
| UT-AF-091, UT-AF-092, UT-AF-093 | `validator_id` を順に `""` / `"phaseGate"` / `"Phase-Gate"` にした入力を用意する | `const action = () => ArchgateEntry.create(input)` | `validator_id` 形式エラーがスローされることを確認する |
| UT-AF-094, UT-AF-095, UT-AF-096 | `error_code` を順に `"L5-001"` / `"L1-01"` / `"X1-001"` にした入力を用意する | `const action = () => ArchgateEntry.create(input)` | `InvalidArchgateErrorCodeError` がスローされることを確認する |
| UT-AF-097 | `sut = createArchgateEntry({ validator_id: "phase-gate" })` を用意する | `const actual = sut.matchesValidatorId("phase-gate")` | `actual` が `true` であることを確認する |
| UT-AF-098 | `sut = createArchgateEntry({ error_code: "L1-001" })` を用意する | `const actual = sut.matchesErrorCode("L1-001")` | `actual` が `true` であることを確認する |
| UT-AF-099 | 同じ内容の `ArchgateEntry` を2つ用意する | `const actual = left.equals(right)` | `actual` が `true` であることを確認する |

### 3.7 `archgate-mapping.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-100 | `enforced_by` 1件の入力を用意する | `const actual = ArchgateMapping.create(input)` | `ArchgateMapping` が生成され、1件保持されることを確認する |
| UT-AF-101 | `enforced_by` 2件以上の入力を用意する | `const actual = ArchgateMapping.create(input)` | すべての `ArchgateEntry` が保持されることを確認する |
| UT-AF-102 | `enforced_by: []` の入力を用意する | `const action = () => ArchgateMapping.create(input)` | 必須件数エラーがスローされることを確認する |
| UT-AF-103 | 同一エントリを重複させた入力を用意する | `const action = () => ArchgateMapping.create(input)` | `DuplicateArchgateEntryError` がスローされることを確認する |
| UT-AF-104 | `sut` 内に `"phase-gate"` のエントリを1件以上入れる | `const actual = sut.findByValidatorId("phase-gate")` | 一致エントリだけが配列で返ることを確認する |
| UT-AF-105 | `sut` に存在しない validator_id を指定する | `const actual = sut.findByValidatorId("consistency")` | `actual` が空配列であることを確認する |
| UT-AF-106 | `sut` 内に `"L1-001"` のエントリを入れる | `const actual = sut.findByErrorCode("L1-001")` | 一致エントリだけが配列で返ることを確認する |
| UT-AF-107 | `sut` に存在しない error_code を指定する | `const actual = sut.findByErrorCode("L2-999")` | `actual` が空配列であることを確認する |
| UT-AF-108 | `sut` に `("phase-gate", "L1-001")` を含める | `const actual = sut.hasEntry("phase-gate", "L1-001")` | `actual` が `true` であることを確認する |
| UT-AF-109 | `sut` に存在しない組み合わせを指定する | `const actual = sut.hasEntry("phase-gate", "L1-999")` | `actual` が `false` であることを確認する |
| UT-AF-110 | 複数エントリを持つ `sut` を用意する | `const actual = sut.toPrimitives()` | `enforced_by` が複数要素のプリミティブ配列になることを確認する |
| UT-AF-111 | 1件のみの `sut` を用意する | `const actual = sut.toPrimitives()` | `enforced_by.length` が `1` であることを確認する |

### 3.8 `superseded-by-ref.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-112 | `adrId = createAdrId("002")` を用意する | `const actual = SupersededByRef.create(adrId)` | `SupersededByRef` が生成されることを確認する |
| UT-AF-113 | `sut = createSupersededByRef("002")` を用意する | `const actual = sut.toAdrRef()` | `actual` が `"ADR-002"` であることを確認する |
| UT-AF-114 | 同じ `AdrId` を持つ `SupersededByRef` を2つ用意する | `const actual = left.equals(right)` | `actual` が `true` であることを確認する |
| UT-AF-115 | 異なる `AdrId` を持つ `SupersededByRef` を2つ用意する | `const actual = left.equals(right)` | `actual` が `false` であることを確認する |
| UT-AF-116 | `sut = createSupersededByRef("002")` を用意する | `const actual = sut.adrId.toAdrRef()` または同等アクセサを実行する | 内部保持している `AdrId` でも `"ADR-002"` が返ることを確認する |

### 3.9 `adr-file-path.test.ts`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-117 | 入力値 `"docs/ADR/001-some-title.md"` を用意する | `const actual = AdrFilePath.create(path)` | `AdrFilePath` が生成されることを確認する |
| UT-AF-118 | 入力値 `"docs/ADR/template.md"` を用意する | `const action = () => AdrFilePath.create(path)` | template 専用ファイルは ADR 実体パスとして不正であるためエラーがスローされることを確認する |
| UT-AF-119 | 入力値 `"invalid/path.md"` を用意する | `const action = () => AdrFilePath.create(path)` | パス形式エラーがスローされることを確認する |
| UT-AF-120 | 入力値 `"docs/ADR/001-some-title.txt"` を用意する | `const action = () => AdrFilePath.create(path)` | 拡張子エラーがスローされることを確認する |
| UT-AF-121 | 入力値 `"docs/ADR/title-only.md"` を用意する | `const action = () => AdrFilePath.create(path)` | basename 先頭形式エラーがスローされることを確認する |
| UT-AF-122 | `adrId = createAdrId("001")` と title を用意する | `const actual = AdrFilePath.fromAdr(adrId, "Package Separation")` | `actual.toString()` が `docs/ADR/001-*.md` パターンに一致することを確認する |
| UT-AF-123 | `sut = createAdrFilePath("docs/ADR/001-some-title.md")` を用意する | `const actual = sut.getAdrId()` | `actual.equals(createAdrId("001"))` が `true` であることを確認する |
| UT-AF-124 | `sut = createAdrFilePath("docs/ADR/001-some-title.md")` を用意する | `const actual = sut.toString()` | `actual` が元のパス文字列と一致することを確認する |
| UT-AF-125 | 同じパスの `AdrFilePath` を2つ用意する | `const actual = left.equals(right)` | `actual` が `true` であることを確認する |
| UT-AF-126 | 異なるパスの `AdrFilePath` を2つ用意する | `const actual = left.equals(right)` | `actual` が `false` であることを確認する |

### 3.10 `adr-validation-service.test.ts`

#### `validateFrontmatter()`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-127 | `service = createValidationService()` と正常な frontmatter 入力を用意する | `const action = () => service.validateFrontmatter(input)` | 例外がスローされないことを確認する |
| UT-AF-128 | 必須項目を欠落させた frontmatter 入力を用意する | `const action = () => service.validateFrontmatter(input)` | `AdrValidationError` がスローされることを確認する |
| UT-AF-129 | `status: "Superseded"` かつ `superseded_by` 未指定の frontmatter 入力を用意する | `const action = () => service.validateFrontmatter(input)` | `SupersededByRequiredError` がスローされることを確認する |
| UT-AF-130 | `archgate.adr_id` と `frontmatter.adr_id` が異なる入力を用意する | `const action = () => service.validateFrontmatter(input)` | `AdrValidationError` がスローされることを確認する |
| UT-AF-131 | `archgate.enforced_by[*].error_code = "X1-001"` の入力を用意する | `const action = () => service.validateFrontmatter(input)` | `InvalidArchgateErrorCodeError` がスローされることを確認する |
| UT-AF-132 | 重複エントリを含む archgate 入力を用意する | `const action = () => service.validateFrontmatter(input)` | `DuplicateArchgateEntryError` がスローされることを確認する |

#### `validateBody()`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-133 | `service` と正常な body 入力を用意する | `const action = () => service.validateBody(input)` | 例外がスローされないことを確認する |
| UT-AF-134 | `context` / `decision` / `consequences` のいずれかを空文字にした入力を用意する | `const action = () => service.validateBody(input)` | `AdrBodySectionRequiredError` がスローされることを確認する |
| UT-AF-135 | `alternatives: "   "` の入力を用意する | `const action = () => service.validateBody(input)` | `AdrBodySectionRequiredError` がスローされることを確認する |
| UT-AF-136 | `alternatives` 未指定の入力を用意する | `const action = () => service.validateBody(input)` | 例外がスローされないことを確認する |

#### `validateArchgate()`

| ケースID | Arrange | Act | Assert |
|---|---|---|---|
| UT-AF-137 | `service` と正常な `ArchgateMapping` または同等プリミティブ入力を用意する | `const action = () => service.validateArchgate(input)` | 例外がスローされないことを確認する |
| UT-AF-138 | 不正 `error_code` を含む入力を用意する | `const action = () => service.validateArchgate(input)` | `InvalidArchgateErrorCodeError` がスローされることを確認する |
| UT-AF-139 | 重複エントリを含む入力を用意する | `const action = () => service.validateArchgate(input)` | `DuplicateArchgateEntryError` がスローされることを確認する |

## 4. モック戦略

- `ADR`, `AdrId`, `AdrStatus`, `AdrFrontmatter`, `AdrBody`, `ArchgateEntry`, `ArchgateMapping`, `SupersededByRef`, `AdrFilePath` はすべて実体を使う
- `AdrValidationService` も実体を生成して使う。domain 層のため spy / stub は作らない
- 不正系はモックで強制せず、プリミティブ入力ビルダーで不正値そのものを作る
- 例外検証は `expect(() => action()).toThrow(ErrorClass)` で行い、Act 結果が正常に返るケースだけ `const actual = ...` を使う
- getter / equals / toPrimitives 系は依存差し替えを行わず、最小構成の実体を都度生成する
- `beforeEach` で Arrange を共有しない。各 `it` に閉じた AAA を維持する

## 5. 境界値テスト一覧

| 観点 | 境界値 | 対応ケースID | 期待結果 |
|---|---|---|---|
| AdrId 最小値 | `"001"` | UT-AF-038 | 正常生成 |
| AdrId 禁止値 | `"000"` | UT-AF-040 | エラー |
| AdrId 桁不足 | `"01"` | UT-AF-043 | エラー |
| AdrId 非数字 | `"abc"` | UT-AF-041 | エラー |
| AdrId 空文字 | `""` | UT-AF-042 | エラー |
| ADR 参照正規化 | `"ADR-001"` | UT-AF-039, UT-AF-044, UT-AF-046 | `"001"` または `"ADR-001"` に正規化 |
| AdrStatus 有効境界 | `Proposed / Accepted / Deprecated / Superseded` | UT-AF-050, UT-AF-051, UT-AF-052, UT-AF-053 | 正常生成 |
| AdrStatus 大文字小文字 | `"proposed"` | UT-AF-054 | エラー |
| Superseded 必須条件 | `status=Superseded` かつ `superseded_by` なし | UT-AF-067, UT-AF-129 | エラー |
| superseded_by 正規化 | `status=Accepted` かつ `superseded_by` あり | UT-AF-068 | `superseded_by` 除去 |
| 日付形式 | `"2026-03-13"` / `"2026-1-1"` | UT-AF-064, UT-AF-066 | 正常 / エラー |
| AdrBody 必須セクション | `context / decision / consequences` 空文字 | UT-AF-081, UT-AF-082, UT-AF-083, UT-AF-134 | エラー |
| alternatives 任意 | 未指定 / 空白のみ | UT-AF-084, UT-AF-085, UT-AF-136, UT-AF-135 | 正常 / エラー |
| validator_id 形式 | `phase-gate` / `phaseGate` / `Phase-Gate` / `""` | UT-AF-090, UT-AF-091, UT-AF-092, UT-AF-093 | 正常 / エラー |
| error_code レイヤ境界 | `"L1-001"` / `"L5-001"` | UT-AF-090, UT-AF-094 | 正常 / エラー |
| error_code 桁境界 | `"L1-001"` / `"L1-01"` | UT-AF-090, UT-AF-095 | 正常 / エラー |
| error_code prefix | `"L1-001"` / `"X1-001"` | UT-AF-090, UT-AF-096 | 正常 / エラー |
| Archgate 重複 | 同一 `(validator_id, error_code)` 2件 | UT-AF-006, UT-AF-031, UT-AF-103, UT-AF-132, UT-AF-139 | エラー |
| Archgate 件数下限 | `enforced_by = []` | UT-AF-102 | エラー |
| 状態遷移境界 | Proposed→Accepted, Proposed→Deprecated, Accepted→Superseded, Deprecated→Proposed | UT-AF-009, UT-AF-013, UT-AF-017, UT-AF-022 | 正常遷移 |
| 状態遷移禁止 | Proposed→Superseded など遷移表外 | UT-AF-010, UT-AF-011, UT-AF-012, UT-AF-015, UT-AF-016, UT-AF-019, UT-AF-020, UT-AF-021, UT-AF-023, UT-AF-024, UT-AF-025, UT-AF-073 | エラー |
| 自己 supersede | `currentAdrId === newAdrId` | UT-AF-018 | エラー |
| AdrFilePath 正常形式 | `docs/ADR/001-some-title.md` | UT-AF-117 | 正常生成 |
| AdrFilePath 禁止形式 | `docs/ADR/template.md` / `.txt` / 不正パス / 先頭3桁なし | UT-AF-118, UT-AF-119, UT-AF-120, UT-AF-121 | エラー |
