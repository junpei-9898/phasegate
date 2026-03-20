# ITテスト設計計画: adr-foundation

> **作成日**: 2026-03-13
> **対象Unit**: adr-foundation
> **正規ソース**: `docs/product/construction/adr-foundation/logical_design.md`
> **テスト規約**: `docs/principles/testing-rules.md`

---

## 1. スコープ

- 対象: adr-foundation Unitの論理設計（application層、infrastructure層、presentation層）
- テスト配置先: `scripts/harness/__tests__/adr-foundation/`

### テスト対象コンポーネント一覧

| 層 | コンポーネント | テストファイル |
|----|--------------|--------------|
| application | GetAdrByRefUseCase | `application/get-adr-by-ref-use-case.test.ts` |
| application | ListAdrsUseCase | `application/list-adrs-use-case.test.ts` |
| application | CreateAdrTemplateUseCase | `application/create-adr-template-use-case.test.ts` |
| application | SeedInitialAdrsUseCase | `application/seed-initial-adrs-use-case.test.ts` |
| application | ChangeAdrStatusUseCase | `application/change-adr-status-use-case.test.ts` |
| application | ValidateAdrFrontmatterUseCase | `application/validate-adr-frontmatter-use-case.test.ts` |
| application | ValidateAllAdrsUseCase | `application/validate-all-adrs-use-case.test.ts` |
| application | SearchArchgateMappingsUseCase | `application/search-archgate-mappings-use-case.test.ts` |
| application | adr-to-detail-dto-mapper | `application/adr-to-detail-dto-mapper.test.ts` |
| application | adr-to-list-item-dto-mapper | `application/adr-to-list-item-dto-mapper.test.ts` |
| application | adr-validation-to-harness-error-mapper | `application/adr-validation-to-harness-error-mapper.test.ts` |
| infrastructure | FileSystemAdrRepository | `infrastructure/file-system-adr-repository.test.ts` |
| infrastructure | GrayMatterAdrFrontmatterParser | `infrastructure/gray-matter-adr-frontmatter-parser.test.ts` |
| infrastructure | AdrMarkdownDocumentParser | `infrastructure/adr-markdown-document-parser.test.ts` |
| infrastructure | AdrMarkdownSerializer | `infrastructure/adr-markdown-serializer.test.ts` |
| infrastructure | initial-adr-definitions | `infrastructure/initial-adr-definitions.test.ts` |
| presentation | adr-create-template | `presentation/adr-create-template.test.ts` |
| presentation | adr-seed-initial | `presentation/adr-seed-initial.test.ts` |
| presentation | adr-list | `presentation/adr-list.test.ts` |
| presentation | adr-show | `presentation/adr-show.test.ts` |
| presentation | adr-search-archgate | `presentation/adr-search-archgate.test.ts` |
| presentation | adr-validate | `presentation/adr-validate.test.ts` |
| presentation | adr-change-status | `presentation/adr-change-status.test.ts` |

---

## 2. テスト対象分析

### Application層（UseCase）

| UseCase名 | 依存Port数 | テストケース概算 |
|-----------|----------|---------------|
| GetAdrByRefUseCase | 1（AdrRepositoryPort） | 約4件 |
| ListAdrsUseCase | 1（AdrRepositoryPort） | 約5件 |
| CreateAdrTemplateUseCase | 2（AdrRepositoryPort, AdrDocumentParserPort） | 約5件 |
| SeedInitialAdrsUseCase | 2（AdrRepositoryPort, AdrDocumentParserPort） | 約6件 |
| ChangeAdrStatusUseCase | 1（AdrRepositoryPort） | 約8件 |
| ValidateAdrFrontmatterUseCase | 1（AdrRepositoryPort） | 約4件 |
| ValidateAllAdrsUseCase | 1（AdrRepositoryPort） | 約5件 |
| SearchArchgateMappingsUseCase | 1（AdrRepositoryPort） | 約5件 |

**GetAdrByRefUseCase の主要テスト観点**:
- `ADR-001` 形式で正常取得しAdrDetailDtoが返る
- `001` 形式（数値のみ）で同一ADRが取得できる
- 存在しないADR参照でAdrNotFoundApplicationErrorがスローされる
- 返却DTOにfrontmatter/body/archgate情報が正しくマッピングされる

**ListAdrsUseCase の主要テスト観点**:
- フィルタなしで全ADR一覧とsummaryが返る
- statusフィルタ指定で絞り込みが機能する
- 複数status指定でOR絞り込みが機能する
- 不正なstatus文字列でInvalidAdrStatusErrorがスローされる
- ADRが0件の場合に空リストとsummary（全0）が返る

**CreateAdrTemplateUseCase の主要テスト観点**:
- タイトル未指定でプレースホルダ付きテンプレートが生成される
- タイトル・status・date指定でカスタムテンプレートが生成される
- includeArchgateExample=trueでarchgateサンプルが含まれる
- 次番号が正しく採番される
- date不正形式でInvalidAdrDateErrorがスローされる

**SeedInitialAdrsUseCase の主要テスト観点**:
- 11件定義の正常投入でcreated=11, skipped=0が返る
- 既存ADRありでoverwrite=falseの場合にskippedに記録される
- 既存ADRありでoverwrite=trueの場合に上書きされcreatedに記録される
- 定義数が11件でない場合にエラーがスローされる
- 不正なADR定義（バリデーション失敗）でAdrValidationErrorがスローされる
- 既存ADRとIDが衝突しoverwrite=falseの場合の挙動確認

**ChangeAdrStatusUseCase の主要テスト観点**:
- approve: Proposed→Acceptedで変更前後ステータスが返る
- deprecate: Accepted→Deprecatedで正常遷移
- supersede: Accepted→Supersededでsuperseded_by付きで正常遷移
- repropose: Deprecated→Proposedで正常遷移
- 存在しないADRでAdrNotFoundApplicationErrorがスローされる
- supersede時にsupersededBy参照先が存在しないとSupersededTargetNotFoundApplicationErrorがスローされる
- 不正遷移でInvalidAdrStatusTransitionErrorがスローされる
- 保存（adrRepository.save）が呼び出されることの確認

**ValidateAdrFrontmatterUseCase の主要テスト観点**:
- 正常ADRでvalid=trueが返る
- frontmatter不正のADRでviolationsが返る
- Superseded状態でsuperseded_by参照先の実在確認が行われる
- 存在しないADRでAdrNotFoundApplicationErrorがスローされる

**ValidateAllAdrsUseCase の主要テスト観点**:
- 全ADR正常でvalid=true, errors空が返る
- 違反ADRありでvalid=false, errorsにHarnessError互換エラーが含まれる
- failFast=trueで最初の致命違反で打ち切られる
- ADR0件でvalid=true（空結果）が返る
- adr_refがHarnessError内に正しく埋め込まれる

**SearchArchgateMappingsUseCase の主要テスト観点**:
- validatorId指定で一致するADRが返る
- errorCode指定で一致するADRが返る
- 両方指定でAND検索として機能する
- 条件未指定でArchgateSearchConditionRequiredErrorがスローされる
- archgateを持たないADRが結果から除外される

### Application層（Mapper）

| Mapper名 | テストケース概算 |
|-----------|---------------|
| adr-to-detail-dto-mapper | 約4件 |
| adr-to-list-item-dto-mapper | 約4件 |
| adr-validation-to-harness-error-mapper | 約4件 |

**adr-to-detail-dto-mapper の主要テスト観点**:
- ADR集約からAdrDetailDtoへ正しくマッピングされる（adrRef, title, status, date, body, filePath）
- archgate付きADRでarchgate情報がDTOに含まれる
- superseded_by付きADRでsupersededBy情報がDTOに含まれる
- archgate/supersededByが未設定のADRで該当フィールドがundefinedになる

**adr-to-list-item-dto-mapper の主要テスト観点**:
- ADR集約からAdrListItemDtoへ正しくマッピングされる（adrRef, title, status, date）
- archgate付きADRでhasArchgate=trueになる
- archgateなしADRでhasArchgate=falseになる
- superseded_by付きADRでsupersededByが設定される

**adr-validation-to-harness-error-mapper の主要テスト観点**:
- AdrValidationResultDtoからHarnessError互換エラー配列が生成される
- adr_refがHarnessError内に正しく埋め込まれる
- 違反なし（valid=true）で空配列が返る
- 複数違反がある場合にそれぞれがHarnessErrorへ変換される

### Infrastructure層（Adapter/Repository）

| Adapter名 | 操作数 | テストケース概算 |
|-----------|-------|---------------|
| FileSystemAdrRepository | 6（findById, findByRef, findAll, save, exists, nextId） | 約14件 |
| GrayMatterAdrFrontmatterParser | 2（parseFrontmatter, serializeFrontmatter） | 約8件 |
| AdrMarkdownDocumentParser | 2（parseDocument, serializeDocument） | 約8件 |
| AdrMarkdownSerializer | 1（serialize） | 約5件 |
| initial-adr-definitions | 1（定義配列提供） | 約4件 |

**FileSystemAdrRepository の主要テスト観点**:
- `findById`: 存在するADRファイルからADR集約が復元される
- `findById`: 存在しないIDでnullが返る
- `findByRef`: `ADR-001`と`001`の両方で同一ADRが取得できる
- `findAll`: `template.md`が除外される
- `findAll`: statusフィルタが機能する
- `save`: ADRがMarkdownファイルとしてUTF-8・末尾改行付きで保存される
- `save`: タイトル変更時にファイル名がrenameされる
- `exists`: 存在する/しないADRの判定
- `nextId`: 既存ADRの最大ID+1が返る
- `nextId`: ADR0件時に001が返る
- ファイル名規則違反のファイルでMalformedAdrDocumentErrorが返る

**GrayMatterAdrFrontmatterParser の主要テスト観点**:
- `parseFrontmatter`: 正常YAMLからAdrFrontmatterが生成される
- `parseFrontmatter`: archgate付きYAMLが正しくパースされる
- `parseFrontmatter`: superseded_by付きYAMLが正しくパースされる
- `parseFrontmatter`: 不正YAML（必須フィールド欠落）でエラー
- `parseFrontmatter`: errorCode不正形式でエラー
- `serializeFrontmatter`: AdrFrontmatterからYAML文字列が正しいキー順で生成される
- `serializeFrontmatter`: archgate付きfrontmatterのシリアライズ
- 往復変換（parse→serialize→parse）でデータが保たれる

**AdrMarkdownDocumentParser の主要テスト観点**:
- `parseDocument`: 正常Markdownからfrontmatterとbodyがパースされる
- `parseDocument`: 日本語見出し（コンテキスト/決定/結果/代替案）が受理される
- `parseDocument`: 必須セクション欠落でエラー
- `parseDocument`: H1タイトル行が除去される
- `serializeDocument`: ADR集約から正しいセクション順のMarkdownが生成される
- `serializeDocument`: Alternatives未設定時にセクションが省略される
- 往復変換（parse→serialize→parse）で内容が保たれる
- 日本語見出しで読み込み→英語見出しで保存の正規化

**AdrMarkdownSerializer の主要テスト観点**:
- H1タイトルが正しく出力される
- セクション順がContext→Decision→Consequences→Alternativesになる
- Alternatives未設定時にそのセクションが出力されない
- 末尾改行が1つだけ付与される
- slug生成がASCII lower-kebab-caseになる

**initial-adr-definitions の主要テスト観点**:
- 定義配列が正確に11件であること
- 各ADR定義のtitleが空でないこと
- 各ADR定義のstatusがAcceptedまたはProposedのいずれかであること
- 各ADR定義のdateがYYYY-MM-DD形式であること
- logical_design.md §5.5で定義された11件のタイトル・ステータスと一致すること（001: Package separation/Accepted, 002: Full migration from ESLint to Biome/Accepted, ..., 011: Temporary 4-layer definition with return path to 5-layer/Proposed）

### Presentation層（CLI/Controller）

| コマンド/エンドポイント | メソッド | テストケース概算 |
|---------------------|--------|---------------|
| adr-create-template | CLI引数解釈→CreateAdrTemplateUseCase | 約4件 |
| adr-seed-initial | CLI引数解釈→SeedInitialAdrsUseCase | 約4件 |
| adr-list | CLI引数解釈→ListAdrsUseCase | 約4件 |
| adr-show | CLI引数解釈→GetAdrByRefUseCase | 約4件 |
| adr-search-archgate | CLI引数解釈→SearchArchgateMappingsUseCase | 約4件 |
| adr-validate | CLI引数解釈→ValidateAdrFrontmatterUseCase/ValidateAllAdrsUseCase | 約5件 |
| adr-change-status | CLI引数解釈→ChangeAdrStatusUseCase | 約5件 |

**adr-create-template の主要テスト観点**:
- `--title "Decision title" --status Proposed` 指定でテンプレートが生成され終了コード0
- 引数なし（デフォルト値）でプレースホルダ付きテンプレートが生成され終了コード0
- `--include-archgate-example` 指定でarchgateサンプル付きテンプレートが生成される
- 引数不正（無効なstatus指定等）で終了コード2

**adr-seed-initial の主要テスト観点**:
- 引数なしで11件ADRが投入され結果が表示され終了コード0
- `--overwrite` 指定で既存ADRが上書きされ終了コード0
- 全件既存でスキップされた場合に終了コード0
- 定義不整合・保存失敗で終了コード2

**adr-list の主要テスト観点**:
- 引数なしで全件一覧が表示され終了コード0
- `--status Accepted`でフィルタ結果が表示される
- `--json`でJSON形式出力になる
- 不正status指定で終了コード2

**adr-show の主要テスト観点**:
- `ADR-001`指定で詳細表示され終了コード0
- `--json`でJSON形式出力になる
- 存在しないADR指定で終了コード1
- 読み込み失敗で終了コード2

**adr-search-archgate の主要テスト観点**:
- `--validator`指定で一致結果が表示され終了コード0
- `--error-code`指定で一致結果が表示される
- `--json`でJSON形式出力になる
- 条件未指定で終了コード2

**adr-validate の主要テスト観点**:
- 単体ADR指定で違反なしの場合に終了コード0
- `--all`で全件検証・違反なしで終了コード0
- 違反ありで終了コード1
- `--json`でJSON形式出力になる
- 存在しないADR指定で終了コード1

**adr-change-status の主要テスト観点**:
- `ADR-001 approve`で変更成功し終了コード0
- `supersede --superseded-by ADR-002`で正常遷移
- `--json`でJSON形式出力になる
- ADR未検出で終了コード1
- 不正遷移で終了コード1

---

## 3. テスト方針

### Port（外部依存）のみモック使用可。ドメイン実体はモック禁止

- **Application層テスト**: `AdrRepositoryPort`, `AdrDocumentParserPort`, `AdrFrontmatterParserPort` はIn-memoryスタブを使用する。ドメインオブジェクト（ADR集約、値オブジェクト、AdrValidationService）は実体を使用する
- **Presentation層テスト**: UseCaseをスタブ化する。UseCaseはPortに依存するため外部依存扱いとする
- **Infrastructure層テスト**: 実ファイルシステムおよびgray-matterライブラリの実体を使用する

### gray-matterはInfrastructure層でPort経由のみ利用（テスト時はfixture .mdファイルで検証）

- `GrayMatterAdrFrontmatterParser` と `AdrMarkdownDocumentParser` のテストでは `scripts/harness/__tests__/adr-foundation/fixtures/docs/ADR/` 配下のfixtureファイルを使用する
- fixtureファイルには正常ADR、archgate付きADR、Superseded ADR、不正frontmatter ADRを含める

### ADR操作テストは一時ディレクトリ（fs.mkdtempSync + cleanup）で実行

- `FileSystemAdrRepository` のテストではファイルI/Oが発生するため、`fs.mkdtempSync()` で一時ディレクトリを作成し、テスト終了後に `afterAll` または `afterEach` でクリーンアップする
- fixtureファイルを一時ディレクトリにコピーしてからテストを実行する

### AAAパターン

- 全テストケースを Arrange / Act / Assert の3セクションで構成する
- 実行結果の変数名は `actual` に統一する

### テストケース名は日本語

- 全テストケース名を日本語で記述する
- 実装詳細（クラス名、プロパティ名）をテストケース名に含めない

### describe/it構造はtarget/describe/context/itパターン

- target: テスト対象のメソッドまたはUseCaseまたはCLIコマンド
- describe: ふるまいの説明
- context: 前提条件がある場合に記載
- it: 期待値

### テストケース名の例

```
target('execute', () => {
  describe('ADR参照を解決して詳細を返す', () => {
    context('ADR-001形式で指定した場合', () => {
      it('対応するADRの詳細DTOが返される', () => {});
    });
    context('存在しないADR参照を指定した場合', () => {
      it('AdrNotFoundApplicationErrorがスローされる', () => {});
    });
  });
});
```

---

## 4. QA（不明点・確認事項）

| # | 質問 | 影響 |
|---|------|------|
| Q-IT-1 | Application層UseCaseテストで使用するIn-memory Repositoryは共通テストヘルパーとして提供するか、各テストファイルで個別実装するか | テスト実装の共通化方針 |

[Answer] 共通テストヘルパーとして提供する。`__tests__/adr-foundation/helpers/in-memory-adr-repository.ts` に配置し、全UseCaseテストで再利用する。テストごとに初期状態は個別設定する。

| Q-IT-2 | Presentation層テストでのCLI引数パースは `process.argv` のモックか、それとも関数引数としてのテストか | テスト手法の選択 |

[Answer] 関数引数としてのテストを採用する。CLIハンドラは引数をパース済みのオブジェクトとして受け取る設計にし、`process.argv` のモックは最小限（エントリポイントテスト1件のみ）にする。テストの安定性と可読性を優先する。

| Q-IT-3 | `ValidateAllAdrsUseCase` が内部で `ValidateAdrFrontmatterUseCase` 相当のロジックを呼ぶとあるが、実装時にUseCaseを直接呼び出すか、ロジックを共通化するか | テストの粒度と重複の判断 |

[Answer] `ValidateAllAdrsUseCase` がコンストラクタ依存として `AdrValidationService`（ドメインサービス）を受け取り、個別バリデーションロジックはドメインサービスに委譲する。`ValidateAdrFrontmatterUseCase` も同じドメインサービスを使う。テストではドメインサービスの検証はUT側で行い、IT側はUseCaseの組み立てとPort呼び出しに集中する。

| Q-IT-4 | `FileSystemAdrRepository.save()` のrename動作テストで、既存ファイルの存在確認と新ファイル生成の原子性はどこまで検証するか | テストの詳細度 |

[Answer] 以下の3点を検証する: (1) 旧ファイル名が存在しないこと、(2) 新ファイル名でファイルが存在すること、(3) 新ファイルの内容が期待通りであること。ファイルシステムレベルの原子性（途中クラッシュ時の整合性）はテストスコープ外とする。

---

## 5. 前提条件・リスク

### 前提条件

- テストフレームワークは Vitest 3.0.0 を使用する
- `target`, `context` ヘルパーが利用可能であること
- fixtureファイルが `scripts/harness/__tests__/adr-foundation/fixtures/docs/ADR/` に配置されること
- gray-matter パッケージがdevDependenciesに含まれること
- `node:fs/promises`, `node:path` が利用可能であること（Node.js 20）

### リスク

| # | リスク | 影響 | 軽減策 |
|---|-------|------|--------|
| R-IT-1 | FileSystemAdrRepositoryのテストでファイルI/O競合が発生し、CI環境でFlakyテストになる | テスト信頼性低下 | テストごとに独立した一時ディレクトリを使用し、並列実行時の競合を排除する |
| R-IT-2 | gray-matterのバージョンアップでYAMLパース挙動が変わり、Infrastructure層テストが壊れる | 回帰バグ | gray-matterのバージョンを固定し、パース結果のスナップショットテストを検討する |
| R-IT-3 | Presentation層テストが終了コードの検証に依存し、process.exit()のモックが不安定になる | テスト実装の複雑化 | CLIハンドラを関数として分離し、戻り値で終了コードを表現する設計を推奨する |
| R-IT-4 | SeedInitialAdrsUseCaseのテストで11件分のfixture準備コストが高い | テスト保守コスト増大 | テストヘルパー（ObjectMother）でSeedAdrDefinitionを生成する |
| R-IT-5 | 日本語見出し→英語見出し正規化の往復変換テストで、元のMarkdownフォーマットとの完全一致が困難 | テストのアサーション精度 | セクション内容の等価性で検証し、空行やインデントの差異は許容する |
