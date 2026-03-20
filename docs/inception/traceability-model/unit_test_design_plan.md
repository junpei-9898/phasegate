# ユニットテスト設計計画: traceability-model

## 1. スコープ

- 対象Unit: traceability-model
- ドメインモデルに定義された値オブジェクト、ドメインサービスを対象とする
- 集約・エンティティは存在しない（domain_model.md §2で明示的に除外）
- テストファイル配置先: `scripts/harness/__tests__/traceability-model/domain/`

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | テストファイル |
|------|-------------|-------------|
| 値オブジェクト | StoryId | story-id.test.ts |
| 値オブジェクト | ProjectRelativePath | project-relative-path.test.ts |
| 値オブジェクト | MetadataTag | metadata-tag.test.ts |
| 値オブジェクト | UnitReference | unit-reference.test.ts |
| 値オブジェクト | LayerReference | layer-reference.test.ts |
| 値オブジェクト | StoryReference | story-reference.test.ts |
| 値オブジェクト | StoryIdAnnotation | story-id-annotation.test.ts |
| 値オブジェクト | DesignDocumentFlags | design-document-flags.test.ts |
| 値オブジェクト | ChainLink | chain-link.test.ts |
| 値オブジェクト | TraceabilityChain | traceability-chain.test.ts |
| 値オブジェクト | MetadataValidationResult | metadata-validation-result.test.ts |
| ドメインサービス | MetadataValidator | metadata-validator.test.ts |
| ドメインサービス | StoryIdAliasResolver | story-id-alias-resolver.test.ts |
| ドメインサービス | TraceabilityChainBuilder | traceability-chain-builder.test.ts |

---

## 2. テスト対象分析

### 集約

集約なし。domain_model.md §2「Aggregate Boundary」にて明示的に除外されている。traceability-modelは検証スナップショットを扱うドメインであり、値オブジェクト＋ドメインサービスで構成される。

### エンティティ

エンティティなし。全概念が不変・値等価性を持つ値オブジェクトとして定義されている。

### 値オブジェクト

| 値オブジェクト名 | 制約数 | テストケース概算 |
|----------------|-------|---------------|
| StoryId | 3（HXX-XX形式、trim、US-XXX拒否） | 8 |
| ProjectRelativePath | 5（空文字禁止、絶対パス禁止、..脱出禁止、バックスラッシュ禁止、docs/scripts配下制約） | 12 |
| MetadataTag | 4（type正規4種、value空文字禁止、lineNumber 1以上、filePath必須） | 10 |
| UnitReference | 2（resolved/unresolved生成、resolved=false時constructionRoot=null） | 5 |
| LayerReference | 2（正規語彙4種、legacy語彙拒否） | 6 |
| StoryReference | 2（resolved/unresolved生成、storyIdはparse済み） | 4 |
| StoryIdAnnotation | 3（storyId必須、lineNumber 1以上、standaloneLine判定） | 5 |
| DesignDocumentFlags | 3（requiresStoryIdAnnotation判定、allowsStoryIdOmission判定、equals） | 6 |
| ChainLink | 3（type正規4種、from/to必須、isBroken判定） | 5 |
| TraceabilityChain | 4（origin整合性、link順序、isComplete/getBrokenLinks/getResolvedLinks） | 9 |
| MetadataValidationResult | 2（valid=trueならerrors空、success/failure生成） | 5 |

### ドメインサービス

| サービス名 | メソッド数 | テストケース概算 |
|-----------|----------|---------------|
| MetadataValidator | 3（validateImplementation: 5件, validateDesignDocument: 5件, validateTest: 4件） | 22 |
| StoryIdAliasResolver | 2（isLegacyFormat, resolve） | 6 |
| TraceabilityChainBuilder | 1（build） | 8 |

---

## 3. テスト方針

### 正常系/異常系のバランス

- 値オブジェクト: 正常生成1-2件 + 異常系（制約違反）を網羅。異常系の比率が高い
- ドメインサービス: 正常系フロー1-2件 + 各検証項目の異常パターン

### 境界値テストの対象

| 対象 | 境界値 |
|------|--------|
| StoryId | 形式境界（`H00-00`最小、`H99-99`最大、桁数不足/超過） |
| ProjectRelativePath | 空文字、`/`始まり、`..`のみ、正規化後のエッジケース |
| MetadataTag.lineNumber | 0（不正）、1（最小正常値） |
| TraceabilityChain.links | 空配列、1要素、全resolved、全broken |

### テスト規約の適用

- **ドメイン実体のモック禁止**: 値オブジェクト（StoryId、ProjectRelativePath等）は全て実体を使用する。モック対象はPort（StoryCatalogPort、UnitDefinitionPort、MetadataReaderPort、DesignDocumentPort、InceptionPlanPort）のみ
- **AAAパターン**: Arrange / Act / Assert を明示コメントで記述。Actは1回、結果は`actual`に代入
- **テストケース名は日本語**: 仕様書としての表現力を重視
- **describe/it構造**: target/describe/context/itパターンを使用

### describe/it構造の例

```
target('parse', () => {
  describe('HXX-XX形式の文字列からStoryIdを生成する', () => {
    it('正規形式の文字列からStoryIdを生成できること', () => {});
    context('前後に空白がある場合', () => {
      it('trimされた値でStoryIdが生成されること', () => {});
    });
    context('HXX-XX形式でない文字列の場合', () => {
      it('StoryIdFormatErrorが発生すること', () => {});
    });
  });
});
```

---

## 4. テスト対象別の重点テストケース

### StoryId

- `H01-01`等の正規形式でStoryIdが生成できること
- 前後空白がtrimされること
- `getEpicNumber()`/`getStoryNumber()`が正しい部分文字列を返すこと
- `US-001`形式が拒否されること（StoryIdFormatError）
- 空文字、数字のみ、`H1-1`（桁不足）、`H001-01`（桁超過）が拒否されること
- `equals()`が値等価性で判定すること
- `isValid()`が静的に形式判定できること

### ProjectRelativePath

- `docs/product/construction/xxx/yyy.md`等の正規パスが生成できること
- 空文字が拒否されること
- 絶対パス（`/docs/...`）が拒否されること
- `..`によるルート脱出が拒否されること
- バックスラッシュ混在が拒否されること
- `docs/`、`scripts/`配下以外のパスが拒否されること
- `join()`、`dirname()`、`basename()`、`extname()`、`startsWith()`が正しく動作すること

### MetadataValidator

#### validateImplementation

- `@unit`が欠落している場合にエラーを返すこと
- `@layer`が正規語彙（domain/application/infrastructure/presentation）以外の場合にL2-002エラーを返すこと
- `@layer usecase`等のlegacy語彙がL2-002として拒否されること
- `@unit`の値がunit定義に存在しない場合にエラーを返すこと
- `@unit`と`@layer`が両方正しい場合にvalid=trueを返すこと

#### validateDesignDocument

- frontmatter `initial_creation: true`のとき`@story-id`欠落が許容されること
- frontmatter未設定時に`@story-id`欠落がエラーとなること
- `@story-id`が独立行でない場合（standaloneLine=false）にエラーを返すこと
- `@story-id`の値がStoryCatalogに存在しない場合にエラーを返すこと
- `@story-id`が1件以上あり全て独立行かつcatalog存在時にvalid=trueを返すこと

#### validateTest

- `@story`タグが1件以上あり正規StoryIdとして解決可能な場合にvalid=trueを返すこと
- `@story`タグが欠落している場合にエラーを返すこと
- `@story`の値がStoryCatalogに存在しない場合にエラーを返すこと
- `@story`の値がHXX-XX形式でない場合にエラーを返すこと

### ChainLink

- 正規4値（`implementation-to-unit`, `unit-to-design`, `design-to-story`, `story-to-plan`）のlinkTypeでChainLinkが生成できること
- 正規4値以外のlinkTypeが拒否されること
- from/toが必須であること（欠落時エラー）
- `isBroken()`がresolved=falseのときtrueを返すこと
- `equals()`が値等価性で判定すること

> **注記**: linkTypeの正規リテラル値はlogical_design.md §2.2.9を正規ソースとする。domain_model.mdのクラス図では短縮形（`"unit"`, `"design"`, `"story"`, `"inception"`）が使われているが、実装ではlogical_design.mdの正規4値を採用する。

### TraceabilityChain

- 全リンクがresolved=trueの場合に`isComplete()`がtrueを返すこと
- 1件でもresolved=falseがある場合に`isComplete()`がfalseを返すこと
- `getBrokenLinks()`がresolved=falseのリンクのみ返すこと
- `getResolvedLinks()`がresolved=trueのリンクのみ返すこと
- links空配列の場合に`isComplete()`がtrueを返すこと（リンクなし=欠損なし）
- links空配列の場合に`getResolvedLinks()`が空配列を返すこと
- originがlinks[0].fromと整合しない場合にエラーとなること
- link typeの順序が`implementation-to-unit -> unit-to-design -> design-to-story -> story-to-plan`であること
- `equals()`が値等価性で判定すること

### DesignDocumentFlags

- `initialCreation=true`の場合に`requiresStoryIdAnnotation()`がfalseを返すこと
- `initialCreation=false`の場合に`requiresStoryIdAnnotation()`がtrueを返すこと
- `initialCreation=true`の場合に`allowsStoryIdOmission()`がtrueを返すこと
- `initialCreation=false`の場合に`allowsStoryIdOmission()`がfalseを返すこと
- `equals()`が同一フラグ値のインスタンス同士でtrueを返すこと
- `equals()`が異なるフラグ値のインスタンス同士でfalseを返すこと

### TraceabilityChainBuilder

- 全リンクが解決可能な場合にisComplete=trueのチェーンが返ること
- construction文書が欠落している場合にbroken linkが返ること
- annotation欠落の場合にbroken linkが返ること
- inception plan欠落の場合にbroken linkが返ること
- 起点パスが不正な場合にProjectRelativePathErrorが発生すること

### StoryIdAliasResolver

- `US-001`形式がlegacyとして判定されること
- `H01-01`形式がlegacyでないと判定されること
- alias mapに存在するlegacy IDが正規StoryIdに解決されること
- alias mapに存在しないlegacy IDがnullを返すこと

---

## 5. QA（不明点・確認事項）

なし。domain_model.mdとlogical_design.mdの記述で十分なテスト設計が可能。

---

## 6. 前提条件・リスク

### 前提条件

- テストフレームワーク: Vitest 3.0.0
- ドメインサービスのテストではPort（StoryCatalogPort、UnitDefinitionPort、MetadataReaderPort、DesignDocumentPort、InceptionPlanPort）をモック化して使用する
- HarnessError型はharness-error Unitから提供される型定義が利用可能であること

### リスク

| リスク | 影響 | 緩和策 |
|--------|------|--------|
| HarnessError型の定義がWave 1内で未確定の場合 | MetadataValidationResultのテストが書けない | 型定義の先行確定（統合契約§2.1で合意済み） |
| TraceabilityChainBuilderの依存Port数が4つと多い | テストのArrangeが複雑化する | オブジェクトマザーパターンでモック生成を簡略化 |

### テストケース総数概算

- 値オブジェクト: 79件
- ドメインサービス: 36件
- **合計: 約115件**
