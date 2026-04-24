---
traceability:
  initial_creation: true
---

# 論理設計: traceability-model

@story-id H03-04
拡張: ISSUE-026 Phase A-2 で `WorkItemFrontmatter` 型と専用 parser を infrastructure 層に追加（既存 `parseFrontmatterFlags` は据え置き・後方互換）。

> **作成日**: 2026-03-13
> **対応ストーリー**: H03-01, H03-02, H03-03, H03-04
> **モード**: Unit横断設計（Phase 2）
> **前提ドキュメント**: `logical_design_plan.md`、`domain_model.md`、`traceability_model_unit.md`、`integration_contract.md`

---

## 1. アーキテクチャ概要

### 1.1 層構成と責務

`cross_cutting_decisions.md §2` を優先契約とし、レイヤー語彙は `domain / application / infrastructure / presentation` のみを使用する。v0 archive の `port / usecase / controller` は本書では使用しない。

| 層 | 責務 | 主な構成要素 | 依存先 |
|----|------|-------------|--------|
| domain | StoryId / TraceabilityChain / MetadataTag 群の不変条件、L2 metadata の判定規則、逆引きチェーン構築ロジック | 値オブジェクト、ドメインサービス、ポートIF、定数 | なし |
| application | 実装・設計・テスト別の検証ユースケース、Legacy ID解決、チェーン/カバレッジ結果DTO化 | UseCase、DTO | domain |
| infrastructure | Markdown/TypeScript 解析、unit定義・story catalog 取得、設計文書/計画文書探索、既存validatorへの橋渡し | Parser、Gateway、Cache、Adapter | application, domain |
| presentation | 正規レイヤー語彙としてのみ扱う。本Unitでは Phase 1/2 の実装対象外で、外部公開は `index.ts` の薄い export 面に限定する | 実装なし | application, domain |

### 1.2 依存方向

```text
domain ← application ← infrastructure
```

```text
                      ┌──────────────────────────────┐
                      │ application/usecases         │
                      │ application/dto              │
                      └───────┬────────────────┬─────┘
                              │                │
                              v                ^
                ┌──────────────────────────┐   │
                │ domain                    │   │
                │ value-objects/services    │   │
                │ ports/constants           │   │
                └──────────────────────────┘   │
                              ^                │
                              │                │
                      ┌───────┴────────────────┘
                      │
                      v
          ┌────────────────────────────────────────┐
          │ infrastructure/parsers/gateways        │
          │ cache + legacy adapter                 │
          └────────────────────────────────────────┘
```

- `domain` は外部I/O、Node標準ライブラリ、Markdown構文、CLI入出力に依存しない。
- `application` は `domain/ports` にのみ依存して外部情報を取得する。
- `infrastructure` は `domain/ports` 実装に加え、既存 `scripts/harness/validators/metadata.ts` への移行アダプターを保持する。
- Presentation責務は `harness-api` / `validator-system` / `nyquist-validation` 側アダプターが担い、本Unitは `index.ts` から UseCase を公開する。

### 1.3 ディレクトリ構成（全ファイル一覧）

#### 実装ファイル

```text
scripts/harness/
├── shared-kernel/
│   └── story-id.ts
├── traceability-model/
│   ├── index.ts
│   ├── domain/
│   │   ├── constants/
│   │   │   ├── layer-names.ts
│   │   │   ├── metadata-tag-types.ts
│   │   │   └── traceability-link-types.ts
│   │   ├── value-objects/
│   │   │   ├── project-relative-path.ts
│   │   │   ├── story-id.ts
│   │   │   ├── metadata-tag.ts
│   │   │   ├── unit-reference.ts
│   │   │   ├── layer-reference.ts
│   │   │   ├── story-reference.ts
│   │   │   ├── story-id-annotation.ts
│   │   │   ├── design-document-flags.ts
│   │   │   ├── chain-link.ts
│   │   │   ├── traceability-chain.ts
│   │   │   └── metadata-validation-result.ts
│   │   ├── services/
│   │   │   ├── metadata-validator.ts
│   │   │   ├── story-id-alias-resolver.ts
│   │   │   └── traceability-chain-builder.ts
│   │   └── ports/
│   │       ├── story-catalog-port.ts
│   │       ├── unit-definition-port.ts
│   │       ├── metadata-reader-port.ts
│   │       ├── design-document-port.ts
│   │       └── inception-plan-port.ts
│   ├── application/
│   │   ├── dto/
│   │   │   ├── metadata-validation-input.ts
│   │   │   ├── metadata-validation-output.ts
│   │   │   ├── traceability-chain-output.ts
│   │   │   └── traceability-coverage-output.ts
│   │   └── usecases/
│   │       ├── validate-implementation-metadata-usecase.ts
│   │       ├── validate-design-story-annotations-usecase.ts
│   │       ├── validate-test-story-metadata-usecase.ts
│   │       ├── build-traceability-chain-usecase.ts
│   │       ├── verify-traceability-coverage-usecase.ts
│   │       └── resolve-legacy-story-id-usecase.ts
│   ├── infrastructure/
│   │   ├── parsers/
│   │   │   ├── source-metadata-parser.ts
│   │   │   ├── markdown-story-annotation-parser.ts
│   │   │   ├── frontmatter-flag-parser.ts
│   │   │   └── story-catalog-parser.ts
│   │   └── gateways/
│   │       ├── markdown-story-catalog-gateway.ts
│   │       ├── markdown-unit-definition-gateway.ts
│   │       ├── file-system-metadata-reader.ts
│   │       ├── markdown-design-document-gateway.ts
│   │       ├── file-system-inception-plan-gateway.ts
│   │       └── legacy-metadata-validator-adapter.ts
```

#### テストファイル

```text
scripts/harness/__tests__/traceability-model/
├── domain/
│   ├── story-id.test.ts
│   ├── project-relative-path.test.ts
│   ├── metadata-tag.test.ts
│   ├── unit-reference.test.ts
│   ├── layer-reference.test.ts
│   ├── story-reference.test.ts
│   ├── story-id-annotation.test.ts
│   ├── design-document-flags.test.ts
│   ├── chain-link.test.ts
│   ├── traceability-chain.test.ts
│   ├── metadata-validation-result.test.ts
│   ├── metadata-validator.test.ts
│   ├── story-id-alias-resolver.test.ts
│   └── traceability-chain-builder.test.ts
├── application/
│   ├── validate-implementation-metadata-usecase.test.ts
│   ├── validate-design-story-annotations-usecase.test.ts
│   ├── validate-test-story-metadata-usecase.test.ts
│   ├── build-traceability-chain-usecase.test.ts
│   ├── verify-traceability-coverage-usecase.test.ts
│   └── resolve-legacy-story-id-usecase.test.ts
├── infrastructure/
│   ├── source-metadata-parser.test.ts
│   ├── markdown-story-annotation-parser.test.ts
│   ├── frontmatter-flag-parser.test.ts
│   ├── story-catalog-parser.test.ts
│   ├── markdown-story-catalog-gateway.test.ts
│   ├── markdown-unit-definition-gateway.test.ts
│   ├── file-system-metadata-reader.test.ts
│   ├── markdown-design-document-gateway.test.ts
│   ├── file-system-inception-plan-gateway.test.ts
│   └── legacy-metadata-validator-adapter.test.ts
└── integration/
    ├── shared-kernel-story-id.integration.test.ts
    ├── metadata-validator-adapter.integration.test.ts
    └── traceability-chain.integration.test.ts
```

#### 併存・移行対象ファイル

| ファイル | 役割 |
|---------|------|
| `scripts/harness/shared-kernel/story-id.ts` | `StoryId` の唯一の公開面。`traceability-model/domain/value-objects/story-id.ts` を再エクスポートする |
| `scripts/harness/validators/metadata.ts` | validator-system 側の既存入口。`legacy-metadata-validator-adapter.ts` 経由で新UseCaseを呼ぶ薄いアダプターへ縮退する |
| `scripts/harness/core/metadata-parser.ts` | v0互換APIを維持する暫定Facade。内部実装は `SourceMetadataParser` に委譲する |

---

## 2. Domain層設計

### 2.1 集約ルート

#### 結論

traceability-model には集約ルートを置かない。`domain_model.md` の正規定義に従い、本Unitは永続化を伴うライフサイクル管理ではなく、ファイル解析結果に対する不変値と検証ロジックを扱うため、値オブジェクト + ドメインサービスで構成する。

#### 代替となる中心オブジェクト

- `StoryId`: Shared Kernel として公開される正規ストーリー識別子
- `TraceabilityChain`: 逆引きチェーンの検証スナップショット
- `MetadataValidationResult`: L2 metadata 判定の結果値

### 2.2 値オブジェクト群

#### 2.2.1 StoryId

| 属性 | 型 | 説明 |
|------|----|------|
| value | string | 正規化後の `HXX-XX` 文字列 |
| epicNumber | string | `H03-02` の `03` 部分 |
| storyNumber | string | `H03-02` の `02` 部分 |

**生成ルール**

- 生成入口は `parse()` のみとする。
- 前後空白を除去後、`/^H[0-9]{2}-[0-9]{2}$/` に一致しない値は拒否する。
- v0 `US-XXX` は `StoryId` では受理しない。Legacy解決は `StoryIdAliasResolver` に委譲する。

**メソッド**

```ts
class StoryId {
  static parse(value: string): StoryId;
  static isValid(value: string): boolean;
  toString(): string;
  getEpicNumber(): string;
  getStoryNumber(): string;
  equals(other: StoryId): boolean;
}
```

**処理フロー**

1. 入力文字列を trim する。
2. 正規表現で `HXX-XX` 形式を検証する。
3. Epic番号とStory番号を抽出する。
4. 不変インスタンスを生成する。

**例外**

- `StoryIdFormatError`: 正規形式に一致しない場合

**不変条件**

- `value` は常に `HXX-XX`
- `epicNumber` / `storyNumber` は2桁数字

#### 2.2.2 ProjectRelativePath

| 属性 | 型 | 説明 |
|------|----|------|
| value | string | プロジェクトルートからの相対パス |

**生成ルール**

- 空文字、絶対パス、`..` によるルート脱出、バックスラッシュ混在を禁止する。
- 正規化後も `docs/` または `scripts/` 配下を外れる場合は不正とする。

**メソッド**

```ts
class ProjectRelativePath {
  static create(value: string): ProjectRelativePath;
  join(segment: string): ProjectRelativePath;
  dirname(): ProjectRelativePath;
  basename(): string;
  extname(): string;
  startsWith(prefix: string): boolean;
  toString(): string;
  equals(other: ProjectRelativePath): boolean;
}
```

**例外**

- `ProjectRelativePathError`: 相対パス規約違反

**不変条件**

- ルート外参照不可
- 正規化済みPOSIX形式で保持

#### 2.2.3 MetadataTag

| 属性 | 型 | 説明 |
|------|----|------|
| type | `@unit \| @layer \| @story-id \| @story` | タグ種別 |
| value | string | タグ値 |
| lineNumber | number | 抽出元行番号 |
| filePath | ProjectRelativePath | 抽出元ファイル |

**生成ルール**

- `type` は正規4種のみ許容する。
- `value` は空文字禁止。
- `lineNumber` は1以上。

**メソッド**

```ts
class MetadataTag {
  static create(args: {
    type: MetadataTagType;
    value: string;
    lineNumber: number;
    filePath: ProjectRelativePath;
  }): MetadataTag;
  isUnitTag(): boolean;
  isLayerTag(): boolean;
  isStoryIdTag(): boolean;
  isStoryTag(): boolean;
  equals(other: MetadataTag): boolean;
}
```

**バリデーションルール**

- `@unit`: kebab-case の unit 名
- `@layer`: 正規語彙 `domain/application/infrastructure/presentation`
- `@story-id`, `@story`: 値自体は文字列保持し、StoryId化はサービス側で行う

#### 2.2.4 UnitReference

| 属性 | 型 | 説明 |
|------|----|------|
| unitName | string | `@unit` に指定された値 |
| resolved | boolean | unit定義との照合結果 |
| constructionRoot | ProjectRelativePath \| null | `docs/product/construction/{unit}/` |

**メソッド**

```ts
class UnitReference {
  static resolved(unitName: string, constructionRoot: ProjectRelativePath): UnitReference;
  static unresolved(unitName: string): UnitReference;
  isResolved(): boolean;
  equals(other: UnitReference): boolean;
}
```

**不変条件**

- `resolved === false` のとき `constructionRoot === null`

#### 2.2.5 LayerReference

| 属性 | 型 | 説明 |
|------|----|------|
| layerName | string | `@layer` の値 |
| valid | boolean | 正規語彙一致可否 |

**メソッド**

```ts
class LayerReference {
  static parse(layerName: string): LayerReference;
  isValid(): boolean;
  toString(): string;
  equals(other: LayerReference): boolean;
}
```

**バリデーションルール**

- `domain/application/infrastructure/presentation` 以外は `valid = false`
- `port/usecase/controller` は legacy 語彙としてエラー対象

#### 2.2.6 StoryReference

| 属性 | 型 | 説明 |
|------|----|------|
| storyId | StoryId | 正規化後のStoryId |
| resolved | boolean | `user_stories.md` 照合結果 |

**メソッド**

```ts
class StoryReference {
  static resolved(storyId: StoryId): StoryReference;
  static unresolved(storyId: StoryId): StoryReference;
  isResolved(): boolean;
  equals(other: StoryReference): boolean;
}
```

**不変条件**

- `storyId` は常に `StoryId.parse()` 済み

#### 2.2.7 StoryIdAnnotation

| 属性 | 型 | 説明 |
|------|----|------|
| storyId | StoryId | 注釈されたストーリーID |
| lineNumber | number | 注釈行 |
| contextLine | string | 直後の設計要素行 |
| standaloneLine | boolean | 独立行として記載されているか |

**生成ルール**

- `@story-id HXX-XX` 形式の独立行のみ正常生成する。
- 行末に他文字がある場合は `standaloneLine = false` として記録し、検証は `MetadataValidator` で失敗させる。

**メソッド**

```ts
class StoryIdAnnotation {
  static create(args: {
    storyId: StoryId;
    lineNumber: number;
    contextLine: string;
    standaloneLine: boolean;
  }): StoryIdAnnotation;
  isStandalone(): boolean;
  equals(other: StoryIdAnnotation): boolean;
}
```

#### 2.2.8 DesignDocumentFlags

| 属性 | 型 | 説明 |
|------|----|------|
| initialCreation | boolean | 初回Unit横断設計として作成された文書か |
| annotationRequired | boolean | `@story-id` 必須か |

**生成ルール**

- frontmatter の以下を正規契約とする。

```yaml
---
traceability:
  initial_creation: true
---
```

- `initial_creation: true` の場合のみ `annotationRequired = false`
- frontmatter 未設定時は `annotationRequired = true`

**メソッド**

```ts
class DesignDocumentFlags {
  static create(initialCreation: boolean): DesignDocumentFlags;
  requiresStoryIdAnnotation(): boolean;
  allowsStoryIdOmission(): boolean;
  equals(other: DesignDocumentFlags): boolean;
}
```

#### 2.2.9 ChainLink

| 属性 | 型 | 説明 |
|------|----|------|
| type | `implementation-to-unit \| unit-to-design \| design-to-story \| story-to-plan` | リンク種別 |
| from | ProjectRelativePath | 起点 |
| to | ProjectRelativePath | 終点 |
| resolved | boolean | 終点の存在確認結果 |

**メソッド**

```ts
class ChainLink {
  static create(args: {
    type: ChainLinkType;
    from: ProjectRelativePath;
    to: ProjectRelativePath;
    resolved: boolean;
  }): ChainLink;
  isBroken(): boolean;
  equals(other: ChainLink): boolean;
}
```

#### 2.2.10 TraceabilityChain

| 属性 | 型 | 説明 |
|------|----|------|
| origin | ProjectRelativePath | 起点実装ファイル |
| links | readonly ChainLink[] | 構築済みリンク列 |

**メソッド**

```ts
class TraceabilityChain {
  static create(origin: ProjectRelativePath, links: readonly ChainLink[]): TraceabilityChain;
  isComplete(): boolean;
  getBrokenLinks(): readonly ChainLink[];
  getResolvedLinks(): readonly ChainLink[];
  equals(other: TraceabilityChain): boolean;
}
```

**処理フロー**

1. 受け取ったリンク列を不変配列として保持する。
2. `isComplete()` は `links.every((link) => link.resolved)` で判定する。
3. `getBrokenLinks()` は `resolved === false` のリンクのみ返す。

**不変条件**

- `origin` は `links[0].from` と整合する
- link type の順序は `implementation-to-unit -> unit-to-design -> design-to-story -> story-to-plan`

#### 2.2.11 MetadataValidationResult

| 属性 | 型 | 説明 |
|------|----|------|
| valid | boolean | エラーなしなら true |
| errors | readonly HarnessError[] | 失敗一覧 |
| warnings | readonly HarnessError[] | 警告一覧 |

**メソッド**

```ts
class MetadataValidationResult {
  static success(warnings?: readonly HarnessError[]): MetadataValidationResult;
  static failure(
    errors: readonly HarnessError[],
    warnings?: readonly HarnessError[],
  ): MetadataValidationResult;
  hasErrors(): boolean;
  hasWarnings(): boolean;
  equals(other: MetadataValidationResult): boolean;
}
```

**不変条件**

- `valid === true` のとき `errors.length === 0`
- `HarnessError` への変換責務は service/application で完結させる

### 2.3 ドメインサービス

#### 2.3.1 MetadataValidator

**責務**

- H03-01: `@unit` / `@layer` の整合性検証
- H03-02: `@story-id` の存在・形式・独立行・初回作成免除判定
- H03-03: `@story` の存在・参照解決・チェーン欠損の集約

**コンストラクタ依存**

- `unitDefinitionPort: UnitDefinitionPort`
- `storyCatalogPort: StoryCatalogPort`

**メソッド**

```ts
class MetadataValidator {
  constructor(
    unitDefinitionPort: UnitDefinitionPort,
    storyCatalogPort: StoryCatalogPort,
  );

  validateImplementation(tags: readonly MetadataTag[]): MetadataValidationResult;
  validateDesignDocument(
    annotations: readonly StoryIdAnnotation[],
    flags: DesignDocumentFlags,
  ): MetadataValidationResult;
  validateTest(tags: readonly MetadataTag[]): MetadataValidationResult;
}
```

**処理フロー**

1. 実装検証では `@unit` と `@layer` を抽出し、欠落・値不正・unit未登録を判定する。
2. 設計文書検証では `flags.requiresStoryIdAnnotation()` を確認する。
3. 必須時は `@story-id` が1件以上あり、各注釈が独立行かつ catalog に存在することを検証する。
4. テスト検証では `@story` が1件以上あり、正規 StoryId として解決可能であることを検証する。
5. 違反ごとに `L2-002` の `HarnessError` を生成し、`fix_example` を埋める。

**例外**

- なし。業務上の不整合は `MetadataValidationResult` に返す。
- ポート障害は application 層で捕捉し `HarnessError` に変換する。

#### 2.3.2 StoryIdAliasResolver

**責務**

- v0 `US-XXX` を read-only で `HXX-XX` に解決する。
- Shared Kernel の `StoryId` を legacy 記法から分離する。

**コンストラクタ依存**

- `storyCatalogPort: StoryCatalogPort`

**メソッド**

```ts
class StoryIdAliasResolver {
  constructor(storyCatalogPort: StoryCatalogPort);
  isLegacyFormat(value: string): boolean;
  resolve(legacyId: string): StoryId | null;
}
```

**処理フロー**

1. `isLegacyFormat()` で `/^US-[0-9]{3}$/` を判定する。
2. `storyCatalogPort.getAliasMap()` から alias map を取得する。
3. 対応する正規IDがあれば `StoryId` を返す。
4. なければ `null` を返す。

**例外**

- なし。未解決は `null` 返却

#### 2.3.3 TraceabilityChainBuilder

**責務**

- 実装ファイル起点で `implementation -> construction -> story -> inception` のリンク群を構築する。
- 欠損は例外化せず `TraceabilityChain.getBrokenLinks()` で返せる形にする。

**コンストラクタ依存**

- `metadataReaderPort: MetadataReaderPort`
- `unitDefinitionPort: UnitDefinitionPort`
- `designDocumentPort: DesignDocumentPort`
- `inceptionPlanPort: InceptionPlanPort`

**メソッド**

```ts
class TraceabilityChainBuilder {
  constructor(
    metadataReaderPort: MetadataReaderPort,
    unitDefinitionPort: UnitDefinitionPort,
    designDocumentPort: DesignDocumentPort,
    inceptionPlanPort: InceptionPlanPort,
  );

  build(origin: ProjectRelativePath): TraceabilityChain;
}
```

**処理フロー**

1. `metadataReaderPort.readImplementationTags(origin)` で `@unit` を取得する。
2. `unitDefinitionPort.findConstructionRoot(unitName)` で construction root を解決し、`implementation-to-unit` link を作成する。
3. `designDocumentPort.listByUnit(unitName)` で設計文書一覧を取得し、`unit-to-design` link 群を作成する。
4. 各設計文書の `readStoryAnnotations()` を走査し、注釈ごとに `design-to-story` link を作成する。
5. 各 `StoryId` に対し `inceptionPlanPort.findPlanRoot(unitName, storyId)` を確認し、`story-to-plan` link を作成する。
6. 全linkを `TraceabilityChain` に束ねて返す。

**例外**

- `ProjectRelativePathError`: 起点パスが不正
- それ以外の欠損は `resolved = false` の link として返却

### 2.4 ドメインイベント

Wave 1 ではドメインイベントを発行しない。

| イベント | 属性 | 方針 |
|---------|------|------|
| なし | なし | `domain_model.md §8` に従い未導入。検証結果は値オブジェクト返却のみで扱う |

---

## 3. Domain層ポート設計

全ポートは `scripts/harness/traceability-model/domain/ports/` に配置する。

### 3.1 StoryCatalogPort

```ts
interface StoryCatalogPort {
  getAllStoryIds(): Promise<readonly StoryId[]>;
  getAliasMap(): Promise<ReadonlyMap<string, StoryId>>;
  exists(storyId: StoryId): Promise<boolean>;
}
```

### 3.2 UnitDefinitionPort

```ts
interface UnitDefinitionPort {
  getAllUnitNames(): Promise<readonly string[]>;
  exists(unitName: string): Promise<boolean>;
  findConstructionRoot(unitName: string): Promise<ProjectRelativePath | null>;
}
```

### 3.3 MetadataReaderPort

```ts
interface MetadataReaderPort {
  readImplementationTags(filePath: ProjectRelativePath): Promise<readonly MetadataTag[]>;
  readTestTags(filePath: ProjectRelativePath): Promise<readonly MetadataTag[]>;
}
```

### 3.4 DesignDocumentPort

```ts
interface DesignDocumentPort {
  listByUnit(unitName: string): Promise<readonly ProjectRelativePath[]>;
  readStoryAnnotations(
    filePath: ProjectRelativePath,
  ): Promise<readonly StoryIdAnnotation[]>;
  readFrontmatterFlags(filePath: ProjectRelativePath): Promise<DesignDocumentFlags>;
}
```

### 3.5 InceptionPlanPort

```ts
interface InceptionPlanPort {
  exists(unitName: string, storyId: StoryId): Promise<boolean>;
  findPlanRoot(
    unitName: string,
    storyId: StoryId,
  ): Promise<ProjectRelativePath | null>;
}
```

### 3.6 ポート設計ルール

- ポート境界で `string` の生パスを渡さず、`ProjectRelativePath` / `StoryId` に正規化してから扱う。
- ファイルI/OやMarkdown解析失敗は infrastructure で `Error` として受け、application で `HarnessError` に変換する。
- 参照系ポートに書き込み責務は持たせない。

---

## 4. Application層設計

### 4.1 DTO

| DTO | 主な属性 | 用途 |
|-----|---------|------|
| `MetadataValidationInput` | `filePaths`, `failOnWarning`, `format` | 共通入力 |
| `MetadataValidationOutput` | `filePath`, `valid`, `errors`, `warnings` | file単位のL2 metadata結果 |
| `TraceabilityChainOutput` | `origin`, `complete`, `links`, `brokenLinks` | 逆引きチェーン表示用 |
| `TraceabilityCoverageOutput` | `totalFiles`, `completeChains`, `incompleteChains`, `results` | H03-03 のカバレッジ集計 |

### 4.2 ValidateImplementationMetadataUseCase

**入力**

- `filePaths: readonly ProjectRelativePath[]`

**出力**

- `Promise<readonly MetadataValidationOutput[]>`

**コンストラクタ依存**

- `metadataReaderPort: MetadataReaderPort`
- `validator: MetadataValidator`

**処理フロー**

1. 各ファイルから `readImplementationTags()` でタグを取得する。
2. `validator.validateImplementation(tags)` を実行する。
3. 結果を `MetadataValidationOutput` に整形する。
4. 1件でも invalid があれば呼び出し側アダプターで異常終了コードへ変換する。

**例外**

- `MetadataReadApplicationError`: 読み込み失敗

### 4.3 ValidateDesignStoryAnnotationsUseCase

**入力**

- `filePaths: readonly ProjectRelativePath[]`

**出力**

- `Promise<readonly MetadataValidationOutput[]>`

**コンストラクタ依存**

- `designDocumentPort: DesignDocumentPort`
- `validator: MetadataValidator`

**処理フロー**

1. `readFrontmatterFlags()` で初回作成フラグを取得する。
2. `readStoryAnnotations()` で注釈一覧を取得する。
3. `validator.validateDesignDocument(annotations, flags)` を実行する。
4. 結果DTOを返す。

**例外**

- `DesignDocumentReadApplicationError`

### 4.4 ValidateTestStoryMetadataUseCase

**入力**

- `filePaths: readonly ProjectRelativePath[]`

**出力**

- `Promise<readonly MetadataValidationOutput[]>`

**コンストラクタ依存**

- `metadataReaderPort: MetadataReaderPort`
- `validator: MetadataValidator`

**処理フロー**

1. 各テストファイルから `readTestTags()` で `@story` を抽出する。
2. `validator.validateTest(tags)` を実行する。
3. 結果DTOを返す。

**例外**

- `MetadataReadApplicationError`

### 4.5 BuildTraceabilityChainUseCase

**入力**

- `origin: ProjectRelativePath`

**出力**

- `Promise<TraceabilityChainOutput>`

**コンストラクタ依存**

- `builder: TraceabilityChainBuilder`

**処理フロー**

1. `builder.build(origin)` を呼ぶ。
2. `TraceabilityChain` を外部アダプター向け DTO に写像する。
3. `complete = chain.isComplete()` を計算する。

**例外**

- `TraceabilityChainBuildError`: 起点ファイル不正やポート障害

### 4.6 VerifyTraceabilityCoverageUseCase

**入力**

- `filePaths: readonly ProjectRelativePath[]`

**出力**

- `Promise<TraceabilityCoverageOutput>`

**コンストラクタ依存**

- `buildTraceabilityChainUseCase: BuildTraceabilityChainUseCase`

**処理フロー**

1. 入力ファイルごとに `BuildTraceabilityChainUseCase` を実行する。
2. 完全チェーン数、不完全チェーン数、broken link総数を集計する。
3. H03-03 の「カバレッジ検証」用サマリーを返す。

**例外**

- `TraceabilityCoverageApplicationError`

### 4.7 ResolveLegacyStoryIdUseCase

**入力**

- `legacyId: string`

**出力**

- `Promise<StoryId | null>`

**コンストラクタ依存**

- `resolver: StoryIdAliasResolver`

**処理フロー**

1. `resolver.isLegacyFormat(legacyId)` を確認する。
2. legacy 形式であれば `resolver.resolve(legacyId)` を返す。
3. 非legacy形式なら `null` を返す。

**例外**

- なし

---

## 5. Infrastructure層設計

### 5.1 SourceMetadataParser

**役割**

- TypeScript/TSX/JS/JSX の行コメントまたはJSDocから `@unit` / `@layer` / `@story` を抽出する。

**実装方針**

- ASTではなく行指向パーサーを採用する。
- 正規表現はタグごとに固定し、行番号を必ず保持する。
- 実装ファイルとテストファイルで許容タグを分ける。

### 5.2 MarkdownStoryAnnotationParser

**役割**

- Markdown本文から `@story-id HXX-XX` の独立行を抽出する。

**実装方針**

- 行頭/行末空白を除去して独立行判定する。
- 次行の見出し・表・箇条書きを `contextLine` として保持する。
- `standaloneLine = false` の場合も情報は捨てず、validatorに渡す。

### 5.3 FrontmatterFlagParser

**役割**

- 設計文書先頭の YAML frontmatter から `traceability.initial_creation` を抽出する。

**実装方針**

- frontmatter がなければ `DesignDocumentFlags.create(false)` を返す。
- フラグ値は真偽値のみ許容する。
- YAMLパース失敗は application に例外伝播し、呼び出し側アダプターで異常終了へ変換する。

### 5.4 StoryCatalogParser

**役割**

- `docs/product/user_stories.md` から正規 StoryId 一覧と `旧US` 対応表を抽出する。

**実装方針**

- `HXX-XX` 行を正規IDとして収集する。
- `旧US:` 行または列がある場合は alias map に格納する。
- パーサーは Markdown 構造に依存しすぎず、表形式・見出し形式の両方に耐える実装にする。

### 5.5 MarkdownStoryCatalogGateway

**実装ポート**

- `StoryCatalogPort`

**実装方針**

- `user_stories.md` を起動時にロードし、mtime 変化時のみ再読み込みする。
- `getAllStoryIds()` と `getAliasMap()` はキャッシュされた不変値を返す。

### 5.6 MarkdownUnitDefinitionGateway

**実装ポート**

- `UnitDefinitionPort`

**実装方針**

- `docs/product/units/*_unit.md` を走査し、`Unit ID:` 行から unit 名を抽出する。
- `findConstructionRoot(unitName)` は `docs/product/construction/{unitName}` の相対パスを返す。

### 5.7 FileSystemMetadataReader

**実装ポート**

- `MetadataReaderPort`

**実装方針**

- `SourceMetadataParser` を利用し、ファイル種別別に必要タグを抽出する。
- 読み取り対象拡張子は `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts` とする。
- 存在しないファイルは `MetadataReadInfrastructureError` を投げる。

### 5.8 MarkdownDesignDocumentGateway

**実装ポート**

- `DesignDocumentPort`

**実装方針**

- `docs/product/construction/{unit}/` 配下の `.md` を列挙する。
- `domain_model.md` / `logical_design.md` / `unit_test_design.md` など全設計文書を対象にする。
- `readStoryAnnotations()` と `readFrontmatterFlags()` を同一ファイルキャッシュから供給する。

### 5.9 FileSystemInceptionPlanGateway

**実装ポート**

- `InceptionPlanPort`

**実装方針**

- 正規パスは `docs/inception/{unit}/{storyId}/` とする。
- `findPlanRoot()` はディレクトリがあればその相対パスを返し、なければ `null`
- 最低1つの `*_plan.md` が存在することを `exists()` で保証する。

### 5.10 LegacyMetadataValidatorAdapter

**役割**

- 既存 `scripts/harness/validators/metadata.ts` と `scripts/harness/core/metadata-parser.ts` から新UseCase群への段階移行を支える。

**実装方針**

- 既存 `runMetadataCheck()` の入出力を維持しつつ、内部では `ValidateImplementationMetadataUseCase` / `ValidateDesignStoryAnnotationsUseCase` / `ValidateTestStoryMetadataUseCase` を使う。
- 旧 `HarnessError` 形式から統合契約上の `HarnessError` へ変換する。
- v0 `@layer usecase` 等は `L2-002` として正規語彙違反を報告する。

---

## 6. Presentation層設計

本Unitは単体でPresentation層を持たない。外部公開は `index.ts` の薄いexport面に限定する。

CLI/CI/Hookのプレゼンテーション責務は以下のUnit側アダプターで扱う:
- `harness-api`: CLI統合
- `validator-system`: バリデータ統合
- `nyquist-validation`: CI統合

本Unitが外部に提供するのはApplication層のUseCaseのみであり、UseCase呼び出しの入口はPresentation層ではなく上記Unitのアダプターが担う。

---

## 7. テスト方針

### 7.1 層別テスト方針

| 層 | 主対象 | 方針 |
|----|--------|------|
| domain | StoryId、MetadataTag、TraceabilityChain、MetadataValidator、StoryIdAliasResolver、TraceabilityChainBuilder | 不変条件、形式検証、broken link生成、legacy別名解決を検証する |
| application | 6 UseCase | ポート協調、DTO整形、例外→終了コード変換の前段を検証する |
| infrastructure | 各Parser/Gateway/Adapter | fixtureベースで Markdown/TypeScript の抽出精度とキャッシュ挙動を検証する |
| integration | shared-kernel export、legacy adapter、実装→設計→計画チェーン | 実ファイルfixtureを用いた end-to-end 疎通を検証する |

### 7.2 テスト規約適用

- AAAパターンで記述する。
- Actは1回に限定し、結果は必ず `actual` に代入する。
- テストケース名は日本語で記述する。
- Domain実体はモックしない。モック対象は `StoryCatalogPort`、`UnitDefinitionPort` 等の外部依存のみに限定する。

### 7.3 重点テストケース

- `StoryId.parse` が `HXX-XX` 以外を拒否すること
- `StoryIdAliasResolver` が `US-XXX` を `HXX-XX` に解決できること
- `MetadataValidator` が `@layer usecase` を `L2-002` として拒否すること
- `MetadataValidator` が frontmatter `traceability.initial_creation: true` のときのみ `@story-id` 欠落を許容すること
- `TraceabilityChainBuilder` が construction 文書欠落、annotation欠落、inception plan 欠落をそれぞれ broken link として返すこと
- `LegacyMetadataValidatorAdapter` が既存 `scripts/harness/validators/metadata.ts` の入口から新UseCaseを呼び出せること
- `shared-kernel/story-id.ts` が `StoryId` だけを再エクスポートし、legacy resolver を公開しないこと

### 7.4 フィクスチャ方針

- `scripts/harness/__tests__/fixtures/traceability-model/` を新設し、`docs/product/construction/` と `docs/inception/` の最小構造を再現する。
- 初回設計文書fixtureと累積更新fixtureを分け、frontmatterあり/なしを両方用意する。
- legacy alias fixtureでは `旧US` 列を含む `user_stories.md` 断片を保持する。

### 7.5 回帰観点

- `scripts/harness/core/metadata-parser.ts` の既存テストを壊さないこと
- `scripts/harness/validators/metadata.ts` の既存呼び出し契約を維持すること
- `shared-kernel/story-id.ts` の import path を固定し、他Unitが `traceability-model` 内部実装へ直接依存しないこと
