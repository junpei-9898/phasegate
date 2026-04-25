---
traceability:
  initial_creation: true
---

# ユニットテスト設計: traceability-model

@story-id H03-04
拡張: ISSUE-026 Phase A-2 で `parseWorkItemFrontmatter` に対するユニットテスト UT-TM-W01〜W08 を追加。
@story-id H03-05
拡張: ISSUE-026 Phase A-3 で gateway / usecase の WI frontmatter 統合テスト UT-TM-WV01〜WV04 を追加。
@story-id H03-06
拡張: ISSUE-026 Phase B-1 で WI layout migration dry-run planner / usecase のユニットテストを追加。
@story-id H03-07
拡張: ISSUE-026 Phase B-2 で WI migration CLI dry-run handler のユニットテストを追加。
@story-id H03-08
拡張: ISSUE-026 Phase B-3 で WI migration apply usecase / gateway / handler のユニットテストを追加。

> **作成日**: 2026-03-13
> **最終更新**: 2026-04-24（H03-08 / ISSUE-026 Phase B-3 migration apply テスト追加）
> **対応ストーリー**: H03-01, H03-02, H03-03, H03-04, H03-05, H03-06, H03-07, H03-08
> **前提ドキュメント**: `domain_model.md`、`logical_design.md`、`unit_test_design_plan.md`
> **テストフレームワーク**: Vitest 3.0.0

---

## 1. 対象ドメインモデル

### スコープ

traceability-model は集約・エンティティを持たない。`domain_model.md §2` に基づき、値オブジェクト + ドメインサービスを中心にテスト対象とする。Presentation層は CLI 入出力整形に限定して handler 単体で検証する。

### テスト対象一覧

| 分類 | コンポーネント | テストケース数 |
|------|-------------|-------------|
| 値オブジェクト | StoryId | 8 |
| 値オブジェクト | ProjectRelativePath | 12 |
| 値オブジェクト | MetadataTag | 10 |
| 値オブジェクト | UnitReference | 5 |
| 値オブジェクト | LayerReference | 6 |
| 値オブジェクト | StoryReference | 4 |
| 値オブジェクト | StoryIdAnnotation | 5 |
| 値オブジェクト | DesignDocumentFlags | 6 |
| 値オブジェクト | ChainLink | 5 |
| 値オブジェクト | TraceabilityChain | 9 |
| 値オブジェクト | MetadataValidationResult | 9 |
| ドメインサービス | MetadataValidator | 22 |
| ドメインサービス | StoryIdAliasResolver | 6 |
| ドメインサービス | TraceabilityChainBuilder | 8 |
| **合計** | **14ファイル** | **115件** |

### モック方針

- **Domain層の値オブジェクト**: モック禁止。全て実体を使用する
- **Domain層のドメインサービス**: コンストラクタ依存のPortのみモック化する
- **モック対象Port**: StoryCatalogPort、UnitDefinitionPort、MetadataReaderPort、DesignDocumentPort、InceptionPlanPort

---

## 2. テストファイル構成

```text
scripts/harness/__tests__/traceability-model/
└── domain/
    ├── story-id.test.ts
    ├── project-relative-path.test.ts
    ├── metadata-tag.test.ts
    ├── unit-reference.test.ts
    ├── layer-reference.test.ts
    ├── story-reference.test.ts
    ├── story-id-annotation.test.ts
    ├── design-document-flags.test.ts
    ├── chain-link.test.ts
    ├── traceability-chain.test.ts
    ├── metadata-validation-result.test.ts
    ├── metadata-validator.test.ts
    ├── story-id-alias-resolver.test.ts
    └── traceability-chain-builder.test.ts
```

全ファイル名はkebab-caseとする（テスト規約準拠）。

---

## 3. 値オブジェクトテストケース

### 3.1 StoryId（8件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-001 | parse | HXX-XX形式の文字列からStoryIdを生成する | — | 正規形式の文字列からStoryIdが生成できること |
| UT-TM-002 | parse | HXX-XX形式の文字列からStoryIdを生成する | 前後に空白がある場合 | trimされた値でStoryIdが生成されること |
| UT-TM-003 | parse | HXX-XX形式の文字列からStoryIdを生成する | HXX-XX形式でない文字列の場合 | StoryIdFormatErrorが発生すること |
| UT-TM-004 | parse | HXX-XX形式の文字列からStoryIdを生成する | US-XXX形式の文字列の場合 | StoryIdFormatErrorが発生すること |
| UT-TM-005 | parse | HXX-XX形式の文字列からStoryIdを生成する | 空文字の場合 | StoryIdFormatErrorが発生すること |
| UT-TM-006 | getEpicNumber | StoryIdからエピック番号を取得する | — | 正しいエピック番号が返されること |
| UT-TM-007 | getStoryNumber | StoryIdからストーリー番号を取得する | — | 正しいストーリー番号が返されること |
| UT-TM-008 | equals | 2つのStoryIdの等価性を判定する | — | 同一値のインスタンス同士でtrueが返ること |

### 3.2 ProjectRelativePath（12件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-009 | create | プロジェクト相対パスを生成する | — | docs/配下の正規パスが生成できること |
| UT-TM-010 | create | プロジェクト相対パスを生成する | scripts/配下のパスの場合 | scripts/配下の正規パスが生成できること |
| UT-TM-011 | create | プロジェクト相対パスを生成する | 空文字の場合 | ProjectRelativePathErrorが発生すること |
| UT-TM-012 | create | プロジェクト相対パスを生成する | 絶対パスの場合 | ProjectRelativePathErrorが発生すること |
| UT-TM-013 | create | プロジェクト相対パスを生成する | ..によるルート脱出パスの場合 | ProjectRelativePathErrorが発生すること |
| UT-TM-014 | create | プロジェクト相対パスを生成する | バックスラッシュを含むパスの場合 | ProjectRelativePathErrorが発生すること |
| UT-TM-015 | create | プロジェクト相対パスを生成する | docs/とscripts/以外のパスの場合 | ProjectRelativePathErrorが発生すること |
| UT-TM-016 | join | パスセグメントを結合する | — | 結合後のProjectRelativePathが返されること |
| UT-TM-017 | dirname | 親ディレクトリパスを取得する | — | 正しい親ディレクトリのProjectRelativePathが返されること |
| UT-TM-018 | basename | ファイル名を取得する | — | 正しいファイル名が返されること |
| UT-TM-019 | extname | 拡張子を取得する | — | 正しい拡張子が返されること |
| UT-TM-020 | startsWith | パスの前方一致を判定する | — | 指定プレフィックスとの前方一致が正しく判定されること |

### 3.3 MetadataTag（10件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-021 | create | メタデータタグを生成する | typeが@unitの場合 | @unitタグが生成できること |
| UT-TM-022 | create | メタデータタグを生成する | typeが@layerの場合 | @layerタグが生成できること |
| UT-TM-023 | create | メタデータタグを生成する | typeが@story-idの場合 | @story-idタグが生成できること |
| UT-TM-024 | create | メタデータタグを生成する | typeが@storyの場合 | @storyタグが生成できること |
| UT-TM-025 | create | メタデータタグを生成する | 正規4種以外のtypeの場合 | エラーが発生すること |
| UT-TM-026 | create | メタデータタグを生成する | valueが空文字の場合 | エラーが発生すること |
| UT-TM-027 | create | メタデータタグを生成する | lineNumberが0の場合 | エラーが発生すること |
| UT-TM-028 | isUnitTag | タグ種別を判定する | — | @unitタグのみtrueを返すこと |
| UT-TM-029 | isLayerTag | タグ種別を判定する | — | @layerタグのみtrueを返すこと |
| UT-TM-030 | equals | 2つのMetadataTagの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

### 3.4 UnitReference（5件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-031 | resolved | Unit定義と照合済みの参照を生成する | — | resolved=trueかつconstructionRootが設定されたインスタンスが返ること |
| UT-TM-032 | unresolved | 未照合のUnit参照を生成する | — | resolved=falseかつconstructionRoot=nullのインスタンスが返ること |
| UT-TM-033 | isResolved | 照合状態を判定する | resolved=trueの場合 | trueが返ること |
| UT-TM-034 | isResolved | 照合状態を判定する | resolved=falseの場合 | falseが返ること |
| UT-TM-035 | equals | 2つのUnitReferenceの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

### 3.5 LayerReference（6件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-036 | parse | レイヤー名からLayerReferenceを生成する | 正規語彙domainの場合 | valid=trueのLayerReferenceが返ること |
| UT-TM-037 | parse | レイヤー名からLayerReferenceを生成する | 正規語彙application/infrastructure/presentationの場合 | valid=trueのLayerReferenceが返ること |
| UT-TM-038 | parse | レイヤー名からLayerReferenceを生成する | legacy語彙usecaseの場合 | valid=falseのLayerReferenceが返ること |
| UT-TM-039 | parse | レイヤー名からLayerReferenceを生成する | legacy語彙port/controllerの場合 | valid=falseのLayerReferenceが返ること |
| UT-TM-040 | parse | レイヤー名からLayerReferenceを生成する | 正規語彙にもlegacy語彙にも属さない値の場合 | valid=falseのLayerReferenceが返ること |
| UT-TM-041 | equals | 2つのLayerReferenceの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

### 3.6 StoryReference（4件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-042 | resolved | 照合済みのStoryReferenceを生成する | — | resolved=trueかつparse済みStoryIdが設定されたインスタンスが返ること |
| UT-TM-043 | unresolved | 未照合のStoryReferenceを生成する | — | resolved=falseかつparse済みStoryIdが設定されたインスタンスが返ること |
| UT-TM-044 | isResolved | 照合状態を判定する | — | resolved属性に応じた真偽値が返ること |
| UT-TM-045 | equals | 2つのStoryReferenceの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

### 3.7 StoryIdAnnotation（5件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-046 | create | 設計文書のstory-idアノテーションを生成する | — | storyId・lineNumber・contextLine・standaloneLineが正しく設定されること |
| UT-TM-047 | create | 設計文書のstory-idアノテーションを生成する | lineNumberが0以下の場合 | エラーが発生すること |
| UT-TM-048 | isStandalone | 独立行判定を行う | standaloneLine=trueの場合 | trueが返ること |
| UT-TM-049 | isStandalone | 独立行判定を行う | standaloneLine=falseの場合 | falseが返ること |
| UT-TM-050 | equals | 2つのStoryIdAnnotationの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

### 3.8 DesignDocumentFlags（6件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-051 | requiresStoryIdAnnotation | story-id注釈の必須判定を行う | initialCreation=trueの場合 | falseが返ること |
| UT-TM-052 | requiresStoryIdAnnotation | story-id注釈の必須判定を行う | initialCreation=falseの場合 | trueが返ること |
| UT-TM-053 | allowsStoryIdOmission | story-id省略許可を判定する | initialCreation=trueの場合 | trueが返ること |
| UT-TM-054 | allowsStoryIdOmission | story-id省略許可を判定する | initialCreation=falseの場合 | falseが返ること |
| UT-TM-055 | equals | 2つのDesignDocumentFlagsの等価性を判定する | 同一フラグ値の場合 | trueが返ること |
| UT-TM-056 | equals | 2つのDesignDocumentFlagsの等価性を判定する | 異なるフラグ値の場合 | falseが返ること |

### 3.9 ChainLink（5件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-057 | create | チェーンリンクを生成する | 正規linkType（implementation-to-unit, unit-to-design, design-to-story, story-to-plan）の場合 | 各正規linkTypeでChainLinkが生成できること |
| UT-TM-058 | create | チェーンリンクを生成する | 正規4値以外のlinkTypeの場合 | エラーが発生すること |
| UT-TM-059 | create | チェーンリンクを生成する | from/toが欠落している場合 | エラーが発生すること |
| UT-TM-060 | isBroken | リンクの欠損判定を行う | resolved=falseの場合 | trueが返ること |
| UT-TM-061 | equals | 2つのChainLinkの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

> **注記**: linkTypeの正規リテラル値は `logical_design.md §2.2.9` を正規ソースとする。`domain_model.md` クラス図の短縮形（`"unit"`, `"design"`, `"story"`, `"inception"`）ではなく、正規4値（`implementation-to-unit`, `unit-to-design`, `design-to-story`, `story-to-plan`）を採用する。

### 3.10 TraceabilityChain（9件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-062 | isComplete | チェーンの完全性を判定する | 全リンクがresolved=trueの場合 | trueが返ること |
| UT-TM-063 | isComplete | チェーンの完全性を判定する | 1件でもresolved=falseがある場合 | falseが返ること |
| UT-TM-064 | isComplete | チェーンの完全性を判定する | links空配列の場合 | trueが返ること |
| UT-TM-065 | getBrokenLinks | 欠損リンクを取得する | resolved=falseのリンクが存在する場合 | resolved=falseのリンクのみが返ること |
| UT-TM-066 | getResolvedLinks | 解決済みリンクを取得する | resolved=trueのリンクが存在する場合 | resolved=trueのリンクのみが返ること |
| UT-TM-067 | getResolvedLinks | 解決済みリンクを取得する | links空配列の場合 | 空配列が返ること |
| UT-TM-068 | create | TraceabilityChainを生成する | originがlinks[0].fromと整合しない場合 | エラーが発生すること |
| UT-TM-069 | create | TraceabilityChainを生成する | — | link typeの順序がimplementation-to-unit -> unit-to-design -> design-to-story -> story-to-planであること |
| UT-TM-070 | equals | 2つのTraceabilityChainの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

### 3.11 MetadataValidationResult（9件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-071 | success | 成功結果を生成する | — | valid=trueかつerrors空のインスタンスが返ること |
| UT-TM-072 | success | 成功結果を生成する | warningsを指定した場合 | valid=trueかつ指定warningsが保持されること |
| UT-TM-073 | failure | 失敗結果を生成する | — | valid=falseかつ指定errorsが保持されること |
| UT-TM-074 | failure | 失敗結果を生成する | warningsも指定した場合 | valid=falseかつerrorsとwarningsが両方保持されること |
| UT-TM-075 | hasErrors | エラー有無を判定する | errors非空の場合 | trueが返ること |
| UT-TM-076 | hasErrors | エラー有無を判定する | errors空の場合 | falseが返ること |
| UT-TM-077 | hasWarnings | 警告有無を判定する | warnings非空の場合 | trueが返ること |
| UT-TM-078 | hasWarnings | 警告有無を判定する | warnings空の場合 | falseが返ること |
| UT-TM-079 | equals | 2つのMetadataValidationResultの等価性を判定する | — | 同一属性のインスタンス同士でtrueが返ること |

---

## 4. ドメインサービステストケース

### 4.1 MetadataValidator（22件）

#### 4.1.1 validateImplementation（7件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-080 | validateImplementation | 実装ファイルのメタデータを検証する | @unitと@layerが両方正しい場合 | valid=trueが返ること |
| UT-TM-081 | validateImplementation | 実装ファイルのメタデータを検証する | @unitが欠落している場合 | エラーを含むMetadataValidationResultが返ること |
| UT-TM-082 | validateImplementation | 実装ファイルのメタデータを検証する | @layerが欠落している場合 | エラーを含むMetadataValidationResultが返ること |
| UT-TM-083 | validateImplementation | 実装ファイルのメタデータを検証する | @layerが正規語彙以外の場合 | L2-002エラーを含む結果が返ること |
| UT-TM-084 | validateImplementation | 実装ファイルのメタデータを検証する | @layerがlegacy語彙usecaseの場合 | L2-002エラーとして拒否されること |
| UT-TM-085 | validateImplementation | 実装ファイルのメタデータを検証する | @layerがlegacy語彙port/controllerの場合 | L2-002エラーとして拒否されること |
| UT-TM-086 | validateImplementation | 実装ファイルのメタデータを検証する | @unitの値がunit定義に存在しない場合 | エラーを含むMetadataValidationResultが返ること |

#### 4.1.2 validateDesignDocument（7件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-087 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | @story-idが1件以上あり全て独立行かつcatalog存在時 | valid=trueが返ること |
| UT-TM-088 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | frontmatter initial_creation=trueの場合 | @story-id欠落が許容されvalid=trueが返ること |
| UT-TM-089 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | frontmatter未設定で@story-idが欠落している場合 | エラーを含む結果が返ること |
| UT-TM-090 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | @story-idが独立行でない場合 | エラーを含む結果が返ること |
| UT-TM-091 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | @story-idの値がStoryCatalogに存在しない場合 | エラーを含む結果が返ること |
| UT-TM-092 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | annotations空配列でinitialCreation=falseの場合 | @story-id必須エラーが返ること |
| UT-TM-093 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | 複数の@story-idが全て正常な場合 | valid=trueが返ること |

#### 4.1.3 validateTest（8件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-094 | validateTest | テストファイルのstoryメタデータを検証する | @storyが1件以上あり正規StoryIdとして解決可能な場合 | valid=trueが返ること |
| UT-TM-095 | validateTest | テストファイルのstoryメタデータを検証する | @storyタグが欠落している場合 | エラーを含む結果が返ること |
| UT-TM-096 | validateTest | テストファイルのstoryメタデータを検証する | @storyの値がStoryCatalogに存在しない場合 | エラーを含む結果が返ること |
| UT-TM-097 | validateTest | テストファイルのstoryメタデータを検証する | @storyの値がHXX-XX形式でない場合 | エラーを含む結果が返ること |
| UT-TM-098 | validateTest | テストファイルのstoryメタデータを検証する | 複数の@storyが全て正常な場合 | valid=trueが返ること |
| UT-TM-099 | validateTest | テストファイルのstoryメタデータを検証する | 複数の@storyのうち1件が不正な場合 | エラーを含む結果が返ること |
| UT-TM-100 | validateTest | テストファイルのstoryメタデータを検証する | tagsが空配列の場合 | @story必須エラーが返ること |
| UT-TM-101 | validateTest | テストファイルのstoryメタデータを検証する | @story以外のタグのみ存在する場合 | @story必須エラーが返ること |

### 4.2 StoryIdAliasResolver（6件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-102 | isLegacyFormat | レガシー形式を判定する | US-XXX形式の場合 | trueが返ること |
| UT-TM-103 | isLegacyFormat | レガシー形式を判定する | HXX-XX形式の場合 | falseが返ること |
| UT-TM-104 | isLegacyFormat | レガシー形式を判定する | どちらの形式にも該当しない場合 | falseが返ること |
| UT-TM-105 | resolve | レガシーIDを正規StoryIdに解決する | alias mapに存在するレガシーIDの場合 | 対応する正規StoryIdが返ること |
| UT-TM-106 | resolve | レガシーIDを正規StoryIdに解決する | alias mapに存在しないレガシーIDの場合 | nullが返ること |
| UT-TM-107 | resolve | レガシーIDを正規StoryIdに解決する | 空のalias mapの場合 | nullが返ること |

### 4.3 TraceabilityChainBuilder（8件）

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-108 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | 全リンクが解決可能な場合 | isComplete=trueのTraceabilityChainが返ること |
| UT-TM-109 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | construction文書が欠落している場合 | unit-to-designリンクがbrokenとなるチェーンが返ること |
| UT-TM-110 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | @story-idアノテーションが欠落している場合 | design-to-storyリンクがbrokenとなるチェーンが返ること |
| UT-TM-111 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | inception planが欠落している場合 | story-to-planリンクがbrokenとなるチェーンが返ること |
| UT-TM-112 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | @unitメタデータが欠落している場合 | implementation-to-unitリンクがbrokenとなるチェーンが返ること |
| UT-TM-113 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | 起点パスが不正な場合 | ProjectRelativePathErrorが発生すること |
| UT-TM-114 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | 複数の設計文書が存在する場合 | 各設計文書に対するリンクが全て構築されること |
| UT-TM-115 | build | 実装ファイル起点でトレーサビリティチェーンを構築する | 構築結果のlink typeの順序 | implementation-to-unit, unit-to-design, design-to-story, story-to-planの順序でリンクが並ぶこと |

---

## 5. 境界値・異常系

### 5.1 StoryId境界値

| 対象 | 境界値 | 期待動作 |
|------|--------|---------|
| StoryId形式 | `H00-00`（最小正規値） | 生成成功 |
| StoryId形式 | `H99-99`（最大正規値） | 生成成功 |
| StoryId形式 | `H1-1`（桁不足） | StoryIdFormatError |
| StoryId形式 | `H001-01`（桁超過） | StoryIdFormatError |
| StoryId形式 | `h01-01`（小文字H） | StoryIdFormatError |
| StoryId形式 | 数字のみ `0101` | StoryIdFormatError |

### 5.2 ProjectRelativePath境界値

| 対象 | 境界値 | 期待動作 |
|------|--------|---------|
| 空文字 | `""` | ProjectRelativePathError |
| 絶対パス | `/docs/product/x.md` | ProjectRelativePathError |
| ルート脱出 | `../outside/file.ts` | ProjectRelativePathError |
| 正規化後のエッジ | `docs/../scripts/x.ts` | 正規化後 `scripts/x.ts` として許容、または `docs/` 脱出として拒否（実装に依存） |
| `..`のみ | `..` | ProjectRelativePathError |
| バックスラッシュ混在 | `docs\product\x.md` | ProjectRelativePathError |

### 5.3 MetadataTag境界値

| 対象 | 境界値 | 期待動作 |
|------|--------|---------|
| lineNumber | `0` | エラー |
| lineNumber | `1`（最小正常値） | 生成成功 |
| value | `""` | エラー |

### 5.4 TraceabilityChain境界値

| 対象 | 境界値 | 期待動作 |
|------|--------|---------|
| links | 空配列 `[]` | isComplete=true, getBrokenLinks=[],getResolvedLinks=[] |
| links | 全resolved | isComplete=true |
| links | 全broken | isComplete=false, getBrokenLinks=全件 |
| links | 1要素のみ | 単一リンクのチェーンとして正常動作 |

### 5.5 ChainLink linkTypeリテラル検証

| linkType値 | 期待動作 |
|-----------|---------|
| `implementation-to-unit` | 生成成功 |
| `unit-to-design` | 生成成功 |
| `design-to-story` | 生成成功 |
| `story-to-plan` | 生成成功 |
| `unit`（短縮形） | エラー |
| `design`（短縮形） | エラー |
| `unknown-type` | エラー |

---

## 6. テスト環境設定

### 6.1 フレームワーク

- **Vitest 3.0.0**: 共有設定ファイル `scripts/harness/__tests__/vitest.config.ts` を使用

### 6.2 テストヘルパー

- `target`, `context` は `describe` のエイリアスとして定義（`common-helper.ts` 提供）
- テスト構造は `target / describe / context / it` パターンに準拠

### 6.3 AAAパターン適用

全テストケースで以下の構造を遵守する。

```text
// Arrange
// ... テストデータ準備

// Act
const actual = ... // 実行は1回、結果は必ず actual に代入

// Assert
expect(actual)...
```

### 6.4 ドメインサービスのモック構成

| サービス | モック対象Port | モック方法 |
|---------|--------------|----------|
| MetadataValidator | UnitDefinitionPort, StoryCatalogPort | vi.fn()でメソッド単位モック |
| StoryIdAliasResolver | StoryCatalogPort | vi.fn()でgetAliasMap()モック |
| TraceabilityChainBuilder | MetadataReaderPort, UnitDefinitionPort, DesignDocumentPort, InceptionPlanPort | vi.fn()で全Portメソッドモック |

### 6.5 オブジェクトマザーパターン

TraceabilityChainBuilderのArrange複雑性を緩和するため、以下のオブジェクトマザーを推奨する。

| オブジェクトマザー | 生成対象 | 用途 |
|----------------|---------|------|
| StoryIdMother | StoryId | 正規/不正形式のStoryId生成 |
| ProjectRelativePathMother | ProjectRelativePath | docs/scripts配下の各種パス生成 |
| MetadataTagMother | MetadataTag | 各type別のタグ生成 |
| ChainLinkMother | ChainLink | resolved/broken各パターンのリンク生成 |
| PortMockMother | 全Port | デフォルトモック構成の一括生成 |

### 6.6 HarnessError型の前提

- `HarnessError` は harness-error Unitから提供される型定義を利用する
- 統合契約 §2.1 で型定義の先行確定が合意済み
- MetadataValidationResult のテストでは `HarnessError` の実体を使用する（モック禁止）

### 6.7 テストケース総数

| 分類 | ケース数 |
|------|---------|
| 値オブジェクト（11 VO） | 79件 |
| ドメインサービス（3サービス） | 36件 |
| **合計** | **115件** |

---

## 7. カバレッジ補完追記

`coverage_report.md` §5-§6 の未カバー項目に対応する追補ケース。既存ケースは変更せず、追加分のみを末尾に記載する。

### 7.1 MetadataValidator 追補ケース

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-116 | validateImplementation | 実装ファイルのメタデータを検証する | @unitの値がunit定義に存在しない場合 | errors[0].code==="L2-002" を満たすMetadataValidationResultが返ること |
| UT-TM-117 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | frontmatter未設定で@story-idが欠落している場合 | errors[0].code==="L2-002" かつ errors[0].fix_example に `@story-id H03-02` 形式の修正例を含むこと |
| UT-TM-118 | validateDesignDocument | 設計文書のstory-idアノテーションを検証する | @story-idが独立行だが次行が空行で設計要素の直前でない場合 | L2-002エラーを含む結果が返ること |
| UT-TM-119 | validateTest | テストファイルのstoryメタデータを検証する | @storyタグが欠落している場合 | errors[0].code==="L2-002" かつ errors[0].fix_example に `// @story H03-03` 形式の修正例を含むこと |

### 7.3 H03-05 L2 metadata validator への WI frontmatter 統合 (ISSUE-026 Phase A-3)

対象: `MarkdownDesignDocumentGateway#readWorkItemFrontmatter` / `ValidateDesignStoryAnnotationsUseCase#execute`

| ケース ID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-WV01 | `MarkdownDesignDocumentGateway#readWorkItemFrontmatter` | 有効 frontmatter を読む場合 | `id: WI-001 / type: story` がある design doc | `WorkItemFrontmatter` オブジェクトを返す |
| UT-TM-WV02 | 同上 | frontmatter 不在の場合 | frontmatter を持たない design doc | `null` を返す |
| UT-TM-WV03 | 同上 | invalid frontmatter の場合 | `type: broken` の design doc | `WorkItemFrontmatterValidationError` を throw |
| UT-TM-WV04 | `ValidateDesignStoryAnnotationsUseCase#execute` | gateway が WI frontmatter parse error を throw した場合 | port が invalid frontmatter を返す | `L2-002` コードの error が `MetadataValidationOutput.errors` に追加される |

### 7.4 H03-06 WI layout migration dry-run (ISSUE-026 Phase B-1)

対象: `WorkItemMigrationPlanner` / `PlanWorkItemMigrationUseCase` / `FileSystemWorkItemMigrationSourceGateway`

| ケース ID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-WM01 | `WorkItemMigrationPlanner#plan` | 旧issueレイアウトからWI migration planを生成する | cross-unit issueを渡した場合 | `_cross/WI-XXX` 配下の候補を返す |
| UT-TM-WM02 | 同上 | 同上 | unit-owned issueを渡した場合 | `{unit}/WI-XXX` 配下の候補を返す |
| UT-TM-WM03 | 同上 | 同上 | 移動先が既に存在する場合 | `conflict=true` を返す |
| UT-TM-WM04 | 同上 | 同上 | cross-unit issueで影響Unitを抽出できない場合 | affects不足warningを返す |
| UT-TM-WM05 | `PlanWorkItemMigrationUseCase#execute` | WI migration dry-run planを生成する | 旧issueディレクトリが存在する場合 | source portから取得したentryをmigration candidateに変換する |
| UT-TM-WM06 | `FileSystemWorkItemMigrationSourceGateway#listLegacyIssueDirectories` | 旧issueレイアウトを走査する | cross-unit issueとunit-owned issueがある場合 | 両方をlegacy issue entryとして返す |
| UT-TM-WM07 | 同上 | 同上 | 移動先が既に存在する場合 | `targetExists=true` を返す |

#### H-ID 検出拡張（WI-027 G2-1）

@work-item-id WI-027

| ケース ID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-WM19 | `WorkItemMigrationPlanner#plan` | H-ID 旧storyレイアウトからWI migration planを生成する | `H02-04` 形式の unit-owned entry を渡した場合 | `existingWorkItemIds` の空き番号の若い順に `WI-XXX` を割り当てる |
| UT-TM-WM20 | 同上 | 同上 | `existingWorkItemIds` に `WI-001..WI-027` が含まれる場合 | H-ID 1 件目に `WI-028` を割り当てる |
| UT-TM-WM21 | 同上 | 同上 | H-ID entry を渡した場合 | `frontmatterPreview` に `type: story` と `legacy_id: H02-04` が含まれる（`affects` は付かない） |
| UT-TM-WM22 | 同上 | 同上 | ISSUE-026 と H02-04 が混在し、ISSUE 由来が `WI-026` を埋める場合 | H02-04 への割当は `WI-026` を skip し次の空き番号を採用する |
| UT-TM-WM23 | `FileSystemWorkItemMigrationSourceGateway#listLegacyIssueDirectories` | 旧storyレイアウトを走査する | `{unit}/H02-04/` directory がある場合 | unit scope の legacy entry として `legacyId="H02-04"` で返す |
| UT-TM-WM24 | `FileSystemWorkItemMigrationSourceGateway#listExistingWorkItemIds` | 既存 WI directory を列挙する | `_cross/WI-001/` と `{unit}/WI-002/` が存在する場合 | 両方の WI ID を sort して返す |

### 7.5 H03-07 WI migration CLI dry-run (ISSUE-026 Phase B-2)

対象: `MigrateWorkItemsCommandHandler`

| ケース ID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-WM08 | `MigrateWorkItemsCommandHandler#execute` | WI migration dry-runを表示する | `--dry-run` が指定された場合 | human text に source / target / legacy id / next id を出力する |
| UT-TM-WM09 | 同上 | 同上 | `--json` が指定された場合 | JSON に candidates / warnings を出力する |
| UT-TM-WM10 | 同上 | 同上 | conflict candidate がある場合 | 終了コード1を返す |
| UT-TM-WM11 | 同上 | 同上 | `--dry-run` が指定されていない場合 | 終了コード2を返し、usecase を実行しない |
| UT-TM-WM12 | 同上 | 同上 | `--apply` 未配線で指定された場合 | 終了コード2を返し、usecase を実行しない |

### 7.6 H03-08 WI migration apply (ISSUE-026 Phase B-3)

対象: `ApplyWorkItemMigrationUseCase` / `FileSystemWorkItemMigrationApplyGateway` / `MigrateWorkItemsCommandHandler`

| ケース ID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-WM13 | `ApplyWorkItemMigrationUseCase#execute` | WI migration applyを実行する | conflict がない plan の場合 | 全 candidate を apply port へ渡す |
| UT-TM-WM14 | 同上 | 同上 | conflict がある plan の場合 | apply port を呼ばず blocked result を返す |
| UT-TM-WM15 | `FileSystemWorkItemMigrationApplyGateway#apply` | 旧issueディレクトリをWIへ移動する | `issue_description.md` を持つ cross issue の場合 | target に移動し `description.md` へ rename して frontmatter を付与する |
| UT-TM-WM16 | 同上 | 同上 | `description.md` を持つ unit issue の場合 | 同ファイルに frontmatter を付与し付随ファイルを保持する |
| UT-TM-WM17 | `MigrateWorkItemsCommandHandler#execute` | WI migration applyを実行する | `--apply` が指定された場合 | apply result を表示し終了コード0を返す |
| UT-TM-WM18 | 同上 | 同上 | `--apply --dry-run` が同時指定された場合 | 終了コード2を返し usecase を実行しない |

### 7.2 H03-04 WorkItem frontmatter parser (ISSUE-026 Phase A-2)

対象: `parseWorkItemFrontmatter(content: string): WorkItemFrontmatter | null`

| ケース ID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| UT-TM-W01 | `parseWorkItemFrontmatter` | frontmatter 不在の場合 | content の先頭が `---` で始まらない | `null` を返す |
| UT-TM-W02 | `parseWorkItemFrontmatter` | 最小構成（id + type のみ）の場合 | `id: WI-001` + `type: story` がある | `{ id: 'WI-001', type: 'story' }` が返る（未指定キーは undefined） |
| UT-TM-W03 | `parseWorkItemFrontmatter` | 完全構成の場合 | 全 7 フィールドが set されている | すべてのフィールドが反映された `WorkItemFrontmatter` を返す |
| UT-TM-W04 | `parseWorkItemFrontmatter` | `id` 形式が無効な場合 | `id: BROKEN` のように pattern に合致しない | `WorkItemFrontmatterValidationError` を throw |
| UT-TM-W05 | `parseWorkItemFrontmatter` | `type` が enum 外の場合 | `type: unknown` が指定されている | `WorkItemFrontmatterValidationError` を throw |
| UT-TM-W06 | `parseWorkItemFrontmatter` | `severity` が enum 外の場合 | `severity: critical` が指定されている | `WorkItemFrontmatterValidationError` を throw |
| UT-TM-W07 | `parseWorkItemFrontmatter` | `status` が enum 外の場合 | `status: done` が指定されている | `WorkItemFrontmatterValidationError` を throw |
| UT-TM-W08 | `parseWorkItemFrontmatter` | `id` / `type` が frontmatter に無い場合 | 他キーのみある | `WorkItemFrontmatterValidationError` を throw（id/type は必須） |
| UT-TM-W09 | `parseWorkItemFrontmatter` | legacy `id` パターンを受容する場合 | `id: H02-04` / `id: ISSUE-026` / `id: HF2-01` | いずれも正常に parse される |
| UT-TM-W10 | `parseWorkItemFrontmatter` | `affects` が string 配列の場合 | `affects: [a, b]` | `['a', 'b']` が返る |
