# ITテスト設計: adr-foundation

@story-id H05-01
@story-id H05-02
@story-id H05-03
> **作成日**: 2026-03-13
> **対象Unit**: adr-foundation
> **正規ソース**: `docs/product/construction/adr-foundation/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`
> **Phase 1計画**: `docs/inception/adr-foundation/it_test_design_plan.md`

---

## 1. 対象コンポーネント

### テスト対象層と方針

| 層 | テスト方針 | モック対象 | 実体使用 |
|----|-----------|----------|---------|
| application（UseCase） | In-memory Repository/ParserスタブでPort置換。ドメインオブジェクトは実体 | `AdrRepositoryPort`, `AdrDocumentParserPort`, `AdrFrontmatterParserPort` | ADR集約、値オブジェクト、AdrValidationService |
| application（Mapper） | ドメインオブジェクト実体からDTO変換を検証 | なし | 全ドメインオブジェクト |
| infrastructure | 実ファイルシステム・gray-matterを使用。一時ディレクトリで隔離 | なし | FileSystem, gray-matter |
| presentation | UseCaseをスタブ化。CLIハンドラは関数引数として検証（Q-IT-2） | UseCase | CLIハンドラ関数 |

### テスト対象コンポーネント一覧

| # | 層 | コンポーネント | テストファイル | ケース数 |
|---|---|---|---|---|
| 1 | application | GetAdrByRefUseCase | `application/get-adr-by-ref-use-case.test.ts` | 4 |
| 2 | application | ListAdrsUseCase | `application/list-adrs-use-case.test.ts` | 5 |
| 3 | application | CreateAdrTemplateUseCase | `application/create-adr-template-use-case.test.ts` | 5 |
| 4 | application | SeedInitialAdrsUseCase | `application/seed-initial-adrs-use-case.test.ts` | 6 |
| 5 | application | ChangeAdrStatusUseCase | `application/change-adr-status-use-case.test.ts` | 8 |
| 6 | application | ValidateAdrFrontmatterUseCase | `application/validate-adr-frontmatter-use-case.test.ts` | 4 |
| 7 | application | ValidateAllAdrsUseCase | `application/validate-all-adrs-use-case.test.ts` | 5 |
| 8 | application | SearchArchgateMappingsUseCase | `application/search-archgate-mappings-use-case.test.ts` | 5 |
| 9 | application | adr-to-detail-dto-mapper | `application/adr-to-detail-dto-mapper.test.ts` | 4 |
| 10 | application | adr-to-list-item-dto-mapper | `application/adr-to-list-item-dto-mapper.test.ts` | 4 |
| 11 | application | adr-validation-to-harness-error-mapper | `application/adr-validation-to-harness-error-mapper.test.ts` | 4 |
| 12 | infrastructure | FileSystemAdrRepository | `infrastructure/file-system-adr-repository.test.ts` | 14 |
| 13 | infrastructure | GrayMatterAdrFrontmatterParser | `infrastructure/gray-matter-adr-frontmatter-parser.test.ts` | 8 |
| 14 | infrastructure | AdrMarkdownDocumentParser | `infrastructure/adr-markdown-document-parser.test.ts` | 8 |
| 15 | infrastructure | AdrMarkdownSerializer | `infrastructure/adr-markdown-serializer.test.ts` | 5 |
| 16 | infrastructure | initial-adr-definitions | `infrastructure/initial-adr-definitions.test.ts` | 5 |
| 17 | presentation | adr-create-template | `presentation/adr-create-template.test.ts` | 4 |
| 18 | presentation | adr-seed-initial | `presentation/adr-seed-initial.test.ts` | 4 |
| 19 | presentation | adr-list | `presentation/adr-list.test.ts` | 5 |
| 20 | presentation | adr-show | `presentation/adr-show.test.ts` | 4 |
| 21 | presentation | adr-search-archgate | `presentation/adr-search-archgate.test.ts` | 4 |
| 22 | presentation | adr-validate | `presentation/adr-validate.test.ts` | 6 |
| 23 | presentation | adr-change-status | `presentation/adr-change-status.test.ts` | 5 |

**合計**: 119件

---

## 2. テストファイル構成

### ディレクトリ構造

```text
scripts/harness/__tests__/adr-foundation/
├── helpers/
│   └── in-memory-adr-repository.ts       # 共通テストヘルパー（Q-IT-1）
├── application/
│   ├── get-adr-by-ref-use-case.test.ts
│   ├── list-adrs-use-case.test.ts
│   ├── create-adr-template-use-case.test.ts
│   ├── seed-initial-adrs-use-case.test.ts
│   ├── change-adr-status-use-case.test.ts
│   ├── validate-adr-frontmatter-use-case.test.ts
│   ├── validate-all-adrs-use-case.test.ts
│   ├── search-archgate-mappings-use-case.test.ts
│   ├── adr-to-detail-dto-mapper.test.ts
│   ├── adr-to-list-item-dto-mapper.test.ts
│   └── adr-validation-to-harness-error-mapper.test.ts
├── infrastructure/
│   ├── file-system-adr-repository.test.ts
│   ├── gray-matter-adr-frontmatter-parser.test.ts
│   ├── adr-markdown-document-parser.test.ts
│   ├── adr-markdown-serializer.test.ts
│   └── initial-adr-definitions.test.ts
├── presentation/
│   ├── adr-create-template.test.ts
│   ├── adr-seed-initial.test.ts
│   ├── adr-list.test.ts
│   ├── adr-show.test.ts
│   ├── adr-search-archgate.test.ts
│   ├── adr-validate.test.ts
│   └── adr-change-status.test.ts
└── fixtures/
    └── docs/ADR/
        ├── template.md
        ├── 001-package-separation.md
        ├── 002-biome-migration.md
        └── invalid-superseded.md
```

### 共通テストヘルパー: `in-memory-adr-repository.ts`（Q-IT-1）

- `AdrRepositoryPort` を実装するIn-memoryスタブ
- 内部状態を `ADR[]` として保持する
- テストごとにコンストラクタまたはセッターで初期状態を設定する
- `findById`, `findByRef`, `findAll`, `save`, `exists`, `nextId` を全て実装する
- `findAll` は `statuses` フィルタに対応し、`template.md` 除外ロジックは持たない（Repositoryの責務）
- 全UseCaseテストファイルで共有し、テストファイルごとの個別実装を禁止する

---

## 3. UseCaseテストケース (8 UseCases)

### 3.1 GetAdrByRefUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-001 | `execute` | ADR参照を解決して詳細を返す | ADR-001形式で指定した場合 | 対応するADRの詳細DTOが返される |
| IT-AF-002 | `execute` | ADR参照を解決して詳細を返す | 001形式（数値のみ）で指定した場合 | ADR-001形式と同一のADRが取得される |
| IT-AF-003 | `execute` | ADR参照を解決して詳細を返す | 存在しないADR参照を指定した場合 | AdrNotFoundApplicationErrorがスローされる |
| IT-AF-004 | `execute` | ADR参照を解決して詳細を返す | archgate付きADRを指定した場合 | DTOにfrontmatter・body・archgate情報が正しくマッピングされる |

### 3.2 ListAdrsUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-005 | `execute` | ADR一覧とステータス別集計を返す | フィルタなしで実行した場合 | 全ADR一覧とsummaryが返される |
| IT-AF-006 | `execute` | ADR一覧とステータス別集計を返す | status=Acceptedでフィルタした場合 | Accepted状態のADRのみが返される |
| IT-AF-007 | `execute` | ADR一覧とステータス別集計を返す | 複数status（Accepted, Proposed）を指定した場合 | OR条件で絞り込まれた結果が返される |
| IT-AF-008 | `execute` | ADR一覧とステータス別集計を返す | 不正なstatus文字列を指定した場合 | InvalidAdrStatusErrorがスローされる |
| IT-AF-009 | `execute` | ADR一覧とステータス別集計を返す | ADRが0件の場合 | 空リストとsummary（全カウント0）が返される |

### 3.3 CreateAdrTemplateUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-010 | `execute` | 新規ADRテンプレートを生成する | タイトル未指定で実行した場合 | プレースホルダ付きテンプレートが生成される |
| IT-AF-011 | `execute` | 新規ADRテンプレートを生成する | タイトル・status・dateを指定した場合 | 指定値が反映されたカスタムテンプレートが生成される |
| IT-AF-012 | `execute` | 新規ADRテンプレートを生成する | includeArchgateExample=trueを指定した場合 | archgateサンプルが含まれたテンプレートが生成される |
| IT-AF-013 | `execute` | 新規ADRテンプレートを生成する | 既存ADRがある場合 | 次番号が正しく採番される |
| IT-AF-014 | `execute` | 新規ADRテンプレートを生成する | date不正形式を指定した場合 | InvalidAdrDateErrorがスローされる |

### 3.4 SeedInitialAdrsUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-015 | `execute` | 初期11件ADRを投入する | 11件定義を正常投入した場合 | created=11, skipped=0の結果が返される |
| IT-AF-016 | `execute` | 初期11件ADRを投入する | 既存ADRありでoverwrite=falseの場合 | 既存ADRがskippedに記録される |
| IT-AF-017 | `execute` | 初期11件ADRを投入する | 既存ADRありでoverwrite=trueの場合 | 既存ADRが上書きされcreatedに記録される |
| IT-AF-018 | `execute` | 初期11件ADRを投入する | 定義数が11件でない場合 | エラーがスローされる |
| IT-AF-019 | `execute` | 初期11件ADRを投入する | 不正なADR定義（バリデーション失敗）を含む場合 | AdrValidationErrorがスローされる |
| IT-AF-020 | `execute` | 初期11件ADRを投入する | 既存ADRとIDが衝突しoverwrite=falseの場合 | 衝突した件のみskippedに記録され他は正常に投入される |

### 3.5 ChangeAdrStatusUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-021 | `execute` | ADRのステータスを遷移する | Proposed状態のADRにapproveを実行した場合 | Acceptedに遷移し変更前後ステータスが返される |
| IT-AF-022 | `execute` | ADRのステータスを遷移する | Accepted状態のADRにdeprecateを実行した場合 | Deprecatedに遷移し変更前後ステータスが返される |
| IT-AF-023 | `execute` | ADRのステータスを遷移する | Accepted状態のADRにsupersedeを実行した場合 | Supersededに遷移しsuperseded_by付きで変更前後ステータスが返される |
| IT-AF-024 | `execute` | ADRのステータスを遷移する | Deprecated状態のADRにreproposeを実行した場合 | Proposedに遷移し変更前後ステータスが返される |
| IT-AF-025 | `execute` | ADRのステータスを遷移する | 存在しないADR参照を指定した場合 | AdrNotFoundApplicationErrorがスローされる |
| IT-AF-026 | `execute` | ADRのステータスを遷移する | supersede時にsupersededBy参照先が存在しない場合 | SupersededTargetNotFoundApplicationErrorがスローされる |
| IT-AF-027 | `execute` | ADRのステータスを遷移する | 許可されない遷移を実行した場合 | InvalidAdrStatusTransitionErrorがスローされる |
| IT-AF-028 | `execute` | ADRのステータスを遷移する | 正常遷移後 | Repositoryのsaveが呼び出され永続化される |

### 3.6 ValidateAdrFrontmatterUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-029 | `execute` | 単一ADRのfrontmatterを検証する | 正常なADRを指定した場合 | valid=trueの検証結果が返される |
| IT-AF-030 | `execute` | 単一ADRのfrontmatterを検証する | frontmatter不正のADRを指定した場合 | violationsを含む検証結果が返される |
| IT-AF-031 | `execute` | 単一ADRのfrontmatterを検証する | Superseded状態でsuperseded_by参照先が存在する場合 | 参照先の実在確認が行われvalid=trueが返される |
| IT-AF-032 | `execute` | 単一ADRのfrontmatterを検証する | 存在しないADR参照を指定した場合 | AdrNotFoundApplicationErrorがスローされる |

### 3.7 ValidateAllAdrsUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-033 | `execute` | 全ADRを一括検証する | 全ADRが正常な場合 | valid=true, errors空の検証結果が返される |
| IT-AF-034 | `execute` | 全ADRを一括検証する | 違反ADRが含まれる場合 | valid=false, errorsにHarnessError互換エラーが含まれる |
| IT-AF-035 | `execute` | 全ADRを一括検証する | failFast=trueで最初の致命違反がある場合 | 最初の違反で検証が打ち切られる |
| IT-AF-036 | `execute` | 全ADRを一括検証する | ADRが0件の場合 | valid=true（空結果）が返される |
| IT-AF-037 | `execute` | 全ADRを一括検証する | 違反ADRがある場合 | adr_refがHarnessError内に正しく埋め込まれる |

### 3.8 SearchArchgateMappingsUseCase

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-038 | `execute` | archgate情報からADRを検索する | validatorId指定で検索した場合 | 一致するADRの検索結果が返される |
| IT-AF-039 | `execute` | archgate情報からADRを検索する | errorCode指定で検索した場合 | 一致するADRの検索結果が返される |
| IT-AF-040 | `execute` | archgate情報からADRを検索する | validatorIdとerrorCodeの両方を指定した場合 | AND検索として両条件に一致する結果が返される |
| IT-AF-041 | `execute` | archgate情報からADRを検索する | 条件を未指定で実行した場合 | ArchgateSearchConditionRequiredErrorがスローされる |
| IT-AF-042 | `execute` | archgate情報からADRを検索する | archgateを持たないADRのみが存在する場合 | 空の検索結果が返される |

---

## 4. Application Mapperテストケース (3 Mappers)

### 4.1 adr-to-detail-dto-mapper

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-043 | `toDetailDto` | ADR集約からAdrDetailDtoへ変換する | 基本的なADRを変換した場合 | adrRef, title, status, date, body, filePathが正しくマッピングされる |
| IT-AF-044 | `toDetailDto` | ADR集約からAdrDetailDtoへ変換する | archgate付きADRを変換した場合 | archgate情報がDTOに含まれる |
| IT-AF-045 | `toDetailDto` | ADR集約からAdrDetailDtoへ変換する | superseded_by付きADRを変換した場合 | supersededBy情報がDTOに含まれる |
| IT-AF-046 | `toDetailDto` | ADR集約からAdrDetailDtoへ変換する | archgate/supersededByが未設定のADRを変換した場合 | 該当フィールドがundefinedになる |

### 4.2 adr-to-list-item-dto-mapper

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-047 | `toListItemDto` | ADR集約からAdrListItemDtoへ変換する | 基本的なADRを変換した場合 | adrRef, title, status, dateが正しくマッピングされる |
| IT-AF-048 | `toListItemDto` | ADR集約からAdrListItemDtoへ変換する | archgate付きADRを変換した場合 | hasArchgate=trueが設定される |
| IT-AF-049 | `toListItemDto` | ADR集約からAdrListItemDtoへ変換する | archgateなしADRを変換した場合 | hasArchgate=falseが設定される |
| IT-AF-050 | `toListItemDto` | ADR集約からAdrListItemDtoへ変換する | superseded_by付きADRを変換した場合 | supersededByが設定される |

### 4.3 adr-validation-to-harness-error-mapper

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-051 | `toHarnessErrors` | AdrValidationResultDtoからHarnessError互換エラー配列へ変換する | 違反ありの検証結果を変換した場合 | HarnessError互換のエラー配列が生成される |
| IT-AF-052 | `toHarnessErrors` | AdrValidationResultDtoからHarnessError互換エラー配列へ変換する | 違反ありの検証結果を変換した場合 | adr_refがHarnessError内に正しく埋め込まれる |
| IT-AF-053 | `toHarnessErrors` | AdrValidationResultDtoからHarnessError互換エラー配列へ変換する | 違反なし（valid=true）の検証結果を変換した場合 | 空配列が返される |
| IT-AF-054 | `toHarnessErrors` | AdrValidationResultDtoからHarnessError互換エラー配列へ変換する | 複数違反がある検証結果を変換した場合 | それぞれの違反が個別のHarnessErrorへ変換される |

---

## 5. Infrastructureテストケース (4 Adapters + initial-adr-definitions seed data)

### 5.1 FileSystemAdrRepository

一時ディレクトリ（`fs.mkdtempSync()` + afterAll/afterEachクリーンアップ）で実行する。fixtureファイルを一時ディレクトリにコピーしてからテストを実行する。

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-055 | `findById` | IDでADRを取得する | 存在するADRファイルを指定した場合 | ADR集約が復元される |
| IT-AF-056 | `findById` | IDでADRを取得する | 存在しないIDを指定した場合 | nullが返される |
| IT-AF-057 | `findByRef` | ADR参照でADRを取得する | ADR-001形式で指定した場合 | 対応するADRが取得される |
| IT-AF-058 | `findByRef` | ADR参照でADRを取得する | 001形式（数値のみ）で指定した場合 | ADR-001形式と同一のADRが取得される |
| IT-AF-059 | `findAll` | 全ADRを取得する | template.mdが含まれるディレクトリで実行した場合 | template.mdが結果から除外される |
| IT-AF-060 | `findAll` | 全ADRを取得する | statusフィルタを指定した場合 | 該当ステータスのADRのみが返される |
| IT-AF-061 | `save` | ADRをMarkdownファイルとして保存する | 新規ADRを保存した場合 | UTF-8・末尾改行付きでファイルが作成される |
| IT-AF-062 | `save` | ADRをMarkdownファイルとして保存する | タイトル変更によりファイル名がrenameされる場合 | 旧ファイルが存在しないこと（Q-IT-4） |
| IT-AF-063 | `save` | ADRをMarkdownファイルとして保存する | タイトル変更によりファイル名がrenameされる場合 | 新ファイル名でファイルが存在すること（Q-IT-4） |
| IT-AF-064 | `save` | ADRをMarkdownファイルとして保存する | タイトル変更によりファイル名がrenameされる場合 | 新ファイルの内容が期待通りであること（Q-IT-4） |
| IT-AF-065 | `exists` | ADRの存在を判定する | 存在するADRのIDを指定した場合 | trueが返される |
| IT-AF-066 | `exists` | ADRの存在を判定する | 存在しないADRのIDを指定した場合 | falseが返される |
| IT-AF-067 | `nextId` | 次のADR IDを採番する | 既存ADRがある場合 | 最大ID+1が返される |
| IT-AF-068 | `nextId` | 次のADR IDを採番する | ADRが0件の場合 | 001が返される |

### 5.2 GrayMatterAdrFrontmatterParser

fixtureファイル（`scripts/harness/__tests__/adr-foundation/fixtures/docs/ADR/`）を使用する。

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-069 | `parseFrontmatter` | YAML文字列からAdrFrontmatterを生成する | 正常なYAMLを入力した場合 | AdrFrontmatterが正しく生成される |
| IT-AF-070 | `parseFrontmatter` | YAML文字列からAdrFrontmatterを生成する | archgate付きYAMLを入力した場合 | archgate情報が正しくパースされる |
| IT-AF-071 | `parseFrontmatter` | YAML文字列からAdrFrontmatterを生成する | superseded_by付きYAMLを入力した場合 | superseded_by情報が正しくパースされる |
| IT-AF-072 | `parseFrontmatter` | YAML文字列からAdrFrontmatterを生成する | 不正YAML（必須フィールド欠落）を入力した場合 | エラーがスローされる |
| IT-AF-073 | `parseFrontmatter` | YAML文字列からAdrFrontmatterを生成する | errorCode不正形式を含むYAMLを入力した場合 | エラーがスローされる |
| IT-AF-074 | `serializeFrontmatter` | AdrFrontmatterからYAML文字列を生成する | 基本的なfrontmatterをシリアライズした場合 | 正しいキー順（adr_id, title, status, date, superseded_by, archgate）でYAMLが生成される |
| IT-AF-075 | `serializeFrontmatter` | AdrFrontmatterからYAML文字列を生成する | archgate付きfrontmatterをシリアライズした場合 | archgate情報が正しくYAMLにシリアライズされる |
| IT-AF-076 | 往復変換 | parse→serialize→parseでデータが保たれる | 正常なYAMLで往復変換した場合 | 元のデータと同一の結果が得られる |

### 5.3 AdrMarkdownDocumentParser

fixtureファイルを使用する。

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-077 | `parseDocument` | Markdown全文からfrontmatterとbodyをパースする | 正常なMarkdownを入力した場合 | frontmatterとbodyが正しくパースされる |
| IT-AF-078 | `parseDocument` | Markdown全文からfrontmatterとbodyをパースする | 日本語見出し（コンテキスト/決定/結果/代替案）を含む場合 | 日本語セクション名が受理される |
| IT-AF-079 | `parseDocument` | Markdown全文からfrontmatterとbodyをパースする | 必須セクション（Context/Decision/Consequences）が欠落している場合 | エラーがスローされる |
| IT-AF-080 | `parseDocument` | Markdown全文からfrontmatterとbodyをパースする | H1タイトル行を含む場合 | H1タイトル行がbodyから除去される |
| IT-AF-081 | `serializeDocument` | ADR集約からMarkdown全文を生成する | 全セクションを含むADRを変換した場合 | Context→Decision→Consequences→Alternativesの順でMarkdownが生成される |
| IT-AF-082 | `serializeDocument` | ADR集約からMarkdown全文を生成する | Alternatives未設定のADRを変換した場合 | Alternativesセクションが省略される |
| IT-AF-083 | 往復変換 | parse→serialize→parseで内容が保たれる | 正常なMarkdownで往復変換した場合 | セクション内容の等価性が保たれる |
| IT-AF-084 | 正規化 | 日本語見出しで読み込み→英語見出しで保存する | 日本語見出しのMarkdownをparse後にserializeした場合 | 英語見出し（Context, Decision, Consequences, Alternatives）で出力される |

### 5.4 AdrMarkdownSerializer

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-085 | `serialize` | ADR集約からMarkdown文字列を生成する | 基本的なADRをシリアライズした場合 | H1タイトルが正しく出力される |
| IT-AF-086 | `serialize` | ADR集約からMarkdown文字列を生成する | 全セクションを含むADRをシリアライズした場合 | セクション順がContext→Decision→Consequences→Alternativesになる |
| IT-AF-087 | `serialize` | ADR集約からMarkdown文字列を生成する | Alternatives未設定のADRをシリアライズした場合 | Alternativesセクションが出力されない |
| IT-AF-088 | `serialize` | ADR集約からMarkdown文字列を生成する | 任意のADRをシリアライズした場合 | 末尾改行が1つだけ付与される |
| IT-AF-089 | `serialize` | ADR集約からMarkdown文字列を生成する | タイトルからslugを生成した場合 | ASCII lower-kebab-caseのslugが生成される |

### 5.5 initial-adr-definitions

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-090 | 定義配列 | 初期ADR定義が仕様通りに提供される | 定義配列を取得した場合 | 正確に11件の定義が含まれる |
| IT-AF-091 | 定義配列 | 初期ADR定義が仕様通りに提供される | 各定義を検証した場合 | 各ADR定義のtitleが空でない |
| IT-AF-092 | 定義配列 | 初期ADR定義が仕様通りに提供される | 各定義を検証した場合 | 各ADR定義のstatusがAcceptedまたはProposedのいずれかである |
| IT-AF-093 | 定義配列 | 初期ADR定義が仕様通りに提供される | 各定義を検証した場合 | 各ADR定義のdateがYYYY-MM-DD形式である |
| IT-AF-094 | 定義配列 | 初期ADR定義が仕様通りに提供される | 論理設計 §5.5の仕様と照合した場合 | 11件のタイトルとステータスが仕様一致する（001: Package separation/Accepted, 002: Full migration from ESLint to Biome/Accepted, 003: Quality harness owns K1-K13/Accepted, 004: FUSE Hooks Engine is out of v1 scope/Proposed, 005: HarnessError requires fix_example/Accepted, 006: Strict quick mode eligibility/Accepted, 007: Separate config files/Accepted, 008: Nyquist integration for truths and artifacts/Proposed, 009: Artifact-driven state derivation/Accepted, 010: Validator stack detection/Accepted, 011: Temporary 4-layer definition with return path to 5-layer/Proposed） |

---

## 6. Presentationテストケース (7 CLI handlers including adr-create-template + adr-seed-initial)

CLIハンドラは関数引数としてテストする（Q-IT-2）。UseCaseはスタブ化し、CLIハンドラ関数にパース済み引数オブジェクトとUseCaseスタブを渡す。`process.argv` のモックはエントリポイントテスト1件のみ（IT-AF-119）に限定する。

### 6.1 adr-create-template

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-095 | `handler` | テンプレート生成コマンドを実行する | --title と --status を指定した場合 | テンプレートが生成され終了コード0が返される |
| IT-AF-096 | `handler` | テンプレート生成コマンドを実行する | 引数なし（デフォルト値）で実行した場合 | プレースホルダ付きテンプレートが生成され終了コード0が返される |
| IT-AF-097 | `handler` | テンプレート生成コマンドを実行する | --include-archgate-exampleを指定した場合 | archgateサンプル付きテンプレートが生成される |
| IT-AF-098 | `handler` | テンプレート生成コマンドを実行する | 無効なstatus値を指定した場合 | 終了コード2が返される |

### 6.2 adr-seed-initial

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-099 | `handler` | 初期ADR投入コマンドを実行する | 引数なしで実行した場合 | 11件ADRが投入され結果が表示され終了コード0が返される |
| IT-AF-100 | `handler` | 初期ADR投入コマンドを実行する | --overwriteを指定した場合 | 既存ADRが上書きされ終了コード0が返される |
| IT-AF-101 | `handler` | 初期ADR投入コマンドを実行する | 全件既存でスキップされた場合 | スキップ結果が表示され終了コード0が返される |
| IT-AF-102 | `handler` | 初期ADR投入コマンドを実行する | 定義不整合・保存失敗が発生した場合 | 終了コード2が返される |

### 6.3 adr-list

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-103 | `handler` | ADR一覧コマンドを実行する | 引数なしで実行した場合 | 全件一覧が表示され終了コード0が返される |
| IT-AF-104 | `handler` | ADR一覧コマンドを実行する | --status Acceptedを指定した場合 | フィルタ結果が表示される |
| IT-AF-105 | `handler` | ADR一覧コマンドを実行する | --jsonを指定した場合 | JSON形式で出力される |
| IT-AF-106 | `handler` | ADR一覧コマンドを実行する | 不正なstatus値を指定した場合 | 終了コード2が返される |
| IT-AF-107 | `handler` | ADR一覧コマンドを実行する | ADRが0件の場合 | 空一覧が表示され終了コード0が返される |

### 6.4 adr-show

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-108 | `handler` | ADR詳細表示コマンドを実行する | ADR-001を指定した場合 | 詳細が表示され終了コード0が返される |
| IT-AF-109 | `handler` | ADR詳細表示コマンドを実行する | --jsonを指定した場合 | JSON形式で出力される |
| IT-AF-110 | `handler` | ADR詳細表示コマンドを実行する | 存在しないADR参照を指定した場合 | 終了コード1が返される |
| IT-AF-111 | `handler` | ADR詳細表示コマンドを実行する | UseCase実行時に読み込みエラーが発生した場合 | 終了コード2が返される |

### 6.5 adr-search-archgate

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-112 | `handler` | archgate検索コマンドを実行する | --validator指定で実行した場合 | 一致結果が表示され終了コード0が返される |
| IT-AF-113 | `handler` | archgate検索コマンドを実行する | --error-code指定で実行した場合 | 一致結果が表示される |
| IT-AF-114 | `handler` | archgate検索コマンドを実行する | --jsonを指定した場合 | JSON形式で出力される |
| IT-AF-115 | `handler` | archgate検索コマンドを実行する | 条件を未指定で実行した場合 | 終了コード2が返される |

### 6.6 adr-validate

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-116 | `handler` | ADR検証コマンドを実行する | 単体ADR指定で違反なしの場合 | 終了コード0が返される |
| IT-AF-117 | `handler` | ADR検証コマンドを実行する | --allで全件検証し違反なしの場合 | 終了コード0が返される |
| IT-AF-118 | `handler` | ADR検証コマンドを実行する | 違反ありの場合 | 終了コード1が返される |
| IT-AF-119 | `handler` | ADR検証コマンドを実行する | --jsonを指定した場合 | JSON形式で出力される |
| IT-AF-120 | `handler` | ADR検証コマンドを実行する | 存在しないADR参照を指定した場合 | 終了コード1が返される |
| IT-AF-121 | `handler` | ADR検証コマンドを実行する | UseCase実行時にエラーが発生した場合 | 終了コード2が返される |

### 6.7 adr-change-status

| ケースID | target | describe | context | it（期待値） |
|----------|--------|----------|---------|-------------|
| IT-AF-122 | `handler` | ステータス変更コマンドを実行する | ADR-001 approveを指定した場合 | 変更成功し終了コード0が返される |
| IT-AF-123 | `handler` | ステータス変更コマンドを実行する | supersede --superseded-by ADR-002を指定した場合 | 正常遷移し終了コード0が返される |
| IT-AF-124 | `handler` | ステータス変更コマンドを実行する | --jsonを指定した場合 | JSON形式で出力される |
| IT-AF-125 | `handler` | ステータス変更コマンドを実行する | 存在しないADR参照を指定した場合 | 終了コード1が返される |
| IT-AF-126 | `handler` | ステータス変更コマンドを実行する | 不正な遷移を指定した場合 | 終了コード1が返される |

---

## 7. テスト環境設定

### 7.1 前提条件

| 項目 | 内容 |
|------|------|
| テストフレームワーク | Vitest 3.0.0 |
| テスト構造ヘルパー | `target`, `context` エイリアスが利用可能であること |
| Node.js | 20以上（`node:fs/promises`, `node:path` 利用） |
| 外部ライブラリ | gray-matter（devDependencies） |
| fixtureファイル | `scripts/harness/__tests__/adr-foundation/fixtures/docs/ADR/` に配置 |
| vitest設定 | 共有設定 `scripts/harness/__tests__/adr-foundation/vitest.config.ts` を使用 |

### 7.2 fixtureファイル一覧

| ファイル名 | 用途 |
|-----------|------|
| `template.md` | `findAll`/`nextId` での除外検証用 |
| `001-package-separation.md` | 正常ADR（Accepted, archgateなし）の読み込み検証用 |
| `002-biome-migration.md` | 正常ADR（Accepted, archgate付き想定）の読み込み検証用 |
| `invalid-superseded.md` | 不正Superseded ADR（superseded_by欠落）の検証用 |

### 7.3 テスト規約の適用

| 規約 | 適用方法 |
|------|---------|
| テストファイル名はkebab-case | 全テストファイルが `{component-name}.test.ts` 形式 |
| テストケース名は日本語 | 全it()の記述を日本語で統一 |
| 実装の詳細をテストケース名に含めない | クラス名・プロパティ名ではなくふるまいで記述 |
| AAAパターン | 全テストケースをArrange/Act/Assertの3セクションで構成 |
| 実行結果は `actual` 変数 | Act結果を `actual` に代入し、Assertで検証 |
| describe/it構造 | target/describe/context/itパターンを使用 |
| ドメインオブジェクトのモック禁止 | ADR集約・値オブジェクト・AdrValidationServiceは実体を使用 |
| Port（外部依存）のみモック可 | AdrRepositoryPort等はIn-memoryスタブを使用 |

### 7.4 一時ディレクトリ管理（Infrastructure層）

- `FileSystemAdrRepository` のテストでは `fs.mkdtempSync()` で一時ディレクトリを作成する
- fixtureファイルを一時ディレクトリにコピーしてからテストを実行する
- テスト終了後に `afterAll` または `afterEach` でクリーンアップする
- テストごとに独立した一時ディレクトリを使用し、並列実行時の競合を排除する

### 7.5 リスク管理

| # | リスク | 軽減策 |
|---|-------|--------|
| R-IT-1 | FileSystemAdrRepositoryでファイルI/O競合によるFlakyテスト | テストごとに独立した一時ディレクトリを使用 |
| R-IT-2 | gray-matterバージョンアップでYAMLパース挙動変更 | gray-matterバージョン固定、パース結果のスナップショット検討 |
| R-IT-3 | Presentation層でprocess.exit()モックが不安定 | CLIハンドラを関数として分離し戻り値で終了コードを表現（Q-IT-2） |
| R-IT-4 | SeedInitialAdrsUseCaseの11件分fixture準備コスト | ObjectMotherヘルパーでSeedAdrDefinitionを生成 |
| R-IT-5 | 日本語見出し→英語見出し往復変換での完全一致困難 | セクション内容の等価性で検証し、空行・インデント差異は許容 |
