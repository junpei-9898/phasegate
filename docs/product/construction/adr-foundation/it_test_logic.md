# ITテストロジック設計: adr-foundation

> **作成日**: 2026-03-14
> **対象ケース**: `docs/product/construction/adr-foundation/it_test_design.md` の `IT-AF-001` 〜 `IT-AF-126`
> **準拠ルール**: `docs/principles/testing-rules.md`
> **参照設計**: `docs/product/construction/adr-foundation/logical_design.md`, `docs/product/construction/adr-foundation/coverage_report.md`

`coverage_report.md` で追加推奨が示されている項目は、本書では扱わない。理由は、本タスクの制約が「`it_test_design.md` に存在するケースIDのみを実装ロジック化すること」であるため。

## 1. テストファイル構成

全テストファイルで以下の骨格を固定する。

```ts
const target = describe;
const context = describe;

target('対象クラスまたは関数', () => {
  describe('対象メソッド', () => {
    describe('ふるまい', () => {
      context('前提条件', () => {
        it('期待値', async () => {
          // Arrange
          // テストケース固有の入力、依存、fixtureをここで準備する

          // Act
          const actual = await sut.execute(input);

          // Assert
          expect(actual).toEqual(expected);
        });
      });
    });
  });
});
```

| ファイル | 対象ケース | 共有セットアップ |
| --- | --- | --- |
| `application/get-adr-by-ref-use-case.test.ts` | `IT-AF-001`〜`004` | `InMemoryAdrRepository`, `createAdrAggregate`, `GetAdrByRefUseCase` |
| `application/list-adrs-use-case.test.ts` | `IT-AF-005`〜`009` | `InMemoryAdrRepository`, Accepted/Proposed/Deprecated/Superseded の4状態ADR |
| `application/create-adr-template-use-case.test.ts` | `IT-AF-010`〜`014` | `InMemoryAdrRepository`, `DocumentParserSpy`, `CreateAdrTemplateUseCase` |
| `application/seed-initial-adrs-use-case.test.ts` | `IT-AF-015`〜`020` | `InMemoryAdrRepository`, `DocumentParserSpy`, `createSeedDefinitions(11件)` |
| `application/change-adr-status-use-case.test.ts` | `IT-AF-021`〜`028` | `InMemoryAdrRepository`, 状態遷移ごとのADR fixture |
| `application/validate-adr-frontmatter-use-case.test.ts` | `IT-AF-029`〜`032` | `InMemoryAdrRepository`, valid/invalid/superseded ADR fixture |
| `application/validate-all-adrs-use-case.test.ts` | `IT-AF-033`〜`037` | `InMemoryAdrRepository`, 複数ADR fixture, `HarnessError` 変換確認用ヘルパー |
| `application/search-archgate-mappings-use-case.test.ts` | `IT-AF-038`〜`042` | `InMemoryAdrRepository`, archgate あり/なしADR fixture |
| `application/adr-to-detail-dto-mapper.test.ts` | `IT-AF-043`〜`046` | `createAdrAggregate`, `toDetailDto` |
| `application/adr-to-list-item-dto-mapper.test.ts` | `IT-AF-047`〜`050` | `createAdrAggregate`, `toListItemDto` |
| `application/adr-validation-to-harness-error-mapper.test.ts` | `IT-AF-051`〜`054` | `createValidationResultDto`, `toHarnessErrors` |
| `infrastructure/file-system-adr-repository.test.ts` | `IT-AF-055`〜`068` | 一時ディレクトリ、fixtureコピー、実体 `GrayMatterAdrFrontmatterParser` / `AdrMarkdownDocumentParser` / `AdrMarkdownSerializer` |
| `infrastructure/gray-matter-adr-frontmatter-parser.test.ts` | `IT-AF-069`〜`076` | YAML fixture文字列、実体 `GrayMatterAdrFrontmatterParser` |
| `infrastructure/adr-markdown-document-parser.test.ts` | `IT-AF-077`〜`084` | Markdown fixture文字列、実体 `AdrMarkdownDocumentParser` |
| `infrastructure/adr-markdown-serializer.test.ts` | `IT-AF-085`〜`089` | `createAdrAggregate`, 実体 `AdrMarkdownSerializer` |
| `infrastructure/initial-adr-definitions.test.ts` | `IT-AF-090`〜`094` | 実体 `initialAdrDefinitions` |
| `presentation/adr-create-template.test.ts` | `IT-AF-095`〜`098` | `CreateAdrTemplateUseCaseStub`, `createCliIoDouble`, handler直呼び |
| `presentation/adr-seed-initial.test.ts` | `IT-AF-099`〜`102` | `SeedInitialAdrsUseCaseStub`, `createCliIoDouble`, handler直呼び |
| `presentation/adr-list.test.ts` | `IT-AF-103`〜`107` | `ListAdrsUseCaseStub`, `createCliIoDouble`, handler直呼び |
| `presentation/adr-show.test.ts` | `IT-AF-108`〜`111` | `GetAdrByRefUseCaseStub`, `createCliIoDouble`, handler直呼び |
| `presentation/adr-search-archgate.test.ts` | `IT-AF-112`〜`115` | `SearchArchgateMappingsUseCaseStub`, `createCliIoDouble`, handler直呼び |
| `presentation/adr-validate.test.ts` | `IT-AF-116`〜`121` | `ValidateAdrFrontmatterUseCaseStub`, `ValidateAllAdrsUseCaseStub`, `createCliIoDouble` |
| `presentation/adr-change-status.test.ts` | `IT-AF-122`〜`126` | `ChangeAdrStatusUseCaseStub`, `createCliIoDouble`, handler直呼び |

## 2. テストヘルパー・シードデータ

### 2.1 共通ヘルパー

- `createAdrAggregate(overrides)` は `AdrId`, `AdrFrontmatter`, `AdrBody`, `AdrValidationService` の実体を組み合わせて ADR 集約を生成する。`status`, `title`, `date`, `archgate`, `supersededBy`, `bodySections` を差し替え可能にする。
- `createArchgateMapping(entries)` は `validator_id` と `error_code` の組を配列で受け取り、`ArchgateMapping` 実体を返す。
- `createSeedDefinition(overrides)` は `SeedAdrDefinition` 1件を返し、`createSeedDefinitions()` は H05-02 の11件定義を既定値として返す。
- `createValidationResultDto(overrides)` は `AdrValidationResultDto` の `valid`, `adrRef`, `violations` を調整できるようにする。
- `createCliIoDouble()` は `stdoutLines`, `stderrLines`, `writeStdout`, `writeStderr` を持つテストダブルを返し、CLI handler の出力整形を文字列単位で検証可能にする。

### 2.2 `InMemoryAdrRepository`

`helpers/in-memory-adr-repository.ts` は Port 置換と呼び出し履歴記録を兼ねる。

- 保持状態: `items: ADR[]`, `savedItems: ADR[]`, `findByRefCalls: string[]`, `existsCalls: string[]`, `nextIdValue?: AdrId`
- 実装メソッド: `findById`, `findByRef`, `findAll`, `save`, `exists`, `nextId`
- `findAll({ statuses })` は引数があれば `AdrStatus.equals()` ベースで OR 条件フィルタする
- `save()` は同一 `AdrId` を置換しつつ `savedItems` に push する
- 例外注入用に `throwOnSave`, `throwOnFindAll`, `throwOnFindByRef` を持たせる

### 2.3 Infrastructure用 fixture / 一時ディレクトリ

- `createAdrTempDir()` で `fs.mkdtempSync(path.join(os.tmpdir(), 'adr-foundation-'))` を実行し、`docs/ADR` 相当ディレクトリを生成する。
- `copyAdrFixtures(tempDir, ['template.md', '001-package-separation.md', ...])` で fixture をケースごとに投入する。
- `readSavedMarkdown(tempDir, fileName)` で UTF-8 文字列を読み出し、末尾改行や rename 結果を検証する。
- `cleanupAdrTempDir(tempDir)` を `afterEach` で実行し、並列実行時の競合を避ける。

### 2.4 CLIハンドラ用スタブ

- 各 UseCase スタブは `execute = vi.fn()` を公開し、handler にコンストラクタ注入する。
- handler は `process.argv` を直接読まない純関数としてテストし、`IT-AF-119` だけエントリポイント近傍の `--json` 分岐を `argv` モック込みで確認する。
- 終了コードは `actual` に代入して検証し、`stdout` / `stderr` は `io.stdoutLines.join('\n')` で比較する。

## 3. UseCase統合テスト詳細ロジック

### 3.1 `GetAdrByRefUseCase`

共有Arrange:
- `acceptedAdr001`, `acceptedAdr002WithArchgate` を生成し `repo = new InMemoryAdrRepository([...])` を作る。
- `sut = new GetAdrByRefUseCase(repo)` とする。

- `IT-AF-001` 構造: `target('GetAdrByRefUseCase') > describe('execute') > describe('ADR参照を解決して詳細を返す') > context('ADR-001形式で指定した場合') > it('対応するADRの詳細DTOが返される')`。Arrange: `repo` に `acceptedAdr001` を入れる。Act: `const actual = await sut.execute({ adrRef: 'ADR-001' })`。Assert: `actual.adrRef`, `title`, `status`, `date`, `filePath` が `acceptedAdr001` の DTO 値と一致する。
- `IT-AF-002` 構造: 同一ふるまいの `context('001形式（数値のみ）で指定した場合') > it('ADR-001形式と同一のADRが取得される')`。Arrange: `acceptedAdr001` のみ保持する。Act: `const actual = await sut.execute({ adrRef: '001' })`。Assert: `actual.adrRef === 'ADR-001'` かつ `IT-AF-001` と同内容が返る。
- `IT-AF-003` 構造: `context('存在しないADR参照を指定した場合') > it('AdrNotFoundApplicationErrorがスローされる')`。Arrange: `repo` を空で生成する。Act: `const actual = () => sut.execute({ adrRef: 'ADR-999' })`。Assert: `await expect(actual()).rejects.toThrow(AdrNotFoundApplicationError)` を確認する。
- `IT-AF-004` 構造: `context('archgate付きADRを指定した場合') > it('DTOにfrontmatter・body・archgate情報が正しくマッピングされる')`。Arrange: `acceptedAdr002WithArchgate` に `archgate.enforced_by` を2件持たせる。Act: `const actual = await sut.execute({ adrRef: 'ADR-002' })`。Assert: `actual.archgate.enforcedBy` 件数、`validatorId`, `errorCode`, `body.context`, `body.decision` が集約から期待どおりへ写像される。

### 3.2 `ListAdrsUseCase`

共有Arrange:
- `acceptedAdr001`, `acceptedAdr002`, `proposedAdr003`, `deprecatedAdr004`, `supersededAdr005` を生成する。
- `sut = new ListAdrsUseCase(repo)` とする。

- `IT-AF-005` 構造: `context('フィルタなしで実行した場合') > it('全ADR一覧とsummaryが返される')`。Arrange: 5件全部を保持する `repo` を作る。Act: `const actual = await sut.execute({})`。Assert: `actual.items.length === 5`、`summary.total === 5`、各ステータス件数が 1/2 件など期待値どおりである。
- `IT-AF-006` 構造: `context('status=Acceptedでフィルタした場合') > it('Accepted状態のADRのみが返される')`。Arrange: 4状態混在の `repo` を作る。Act: `const actual = await sut.execute({ statuses: ['Accepted'] })`。Assert: `actual.items` が Accepted だけで、`every(item.status === 'Accepted')` が成立する。
- `IT-AF-007` 構造: `context('複数status（Accepted, Proposed）を指定した場合') > it('OR条件で絞り込まれた結果が返される')`。Arrange: 5件を保持する。Act: `const actual = await sut.execute({ statuses: ['Accepted', 'Proposed'] })`。Assert: 返却件数と `summary` が Accepted + Proposed に対応し、Deprecated/Superseded は含まれない。
- `IT-AF-008` 構造: `context('不正なstatus文字列を指定した場合') > it('InvalidAdrStatusErrorがスローされる')`。Arrange: `repo` は空でもよい。Act: `const actual = () => sut.execute({ statuses: ['Archived' as never] })`。Assert: `await expect(actual()).rejects.toThrow(InvalidAdrStatusError)` を確認する。
- `IT-AF-009` 構造: `context('ADRが0件の場合') > it('空リストとsummary（全カウント0）が返される')`。Arrange: 空の `repo` を作る。Act: `const actual = await sut.execute({})`。Assert: `actual.items` が空配列、`summary.total`, `accepted`, `proposed`, `deprecated`, `superseded` が全て0である。

### 3.3 `CreateAdrTemplateUseCase`

共有Arrange:
- `repo = new InMemoryAdrRepository()` に `nextIdValue` を指定できるようにする。
- `documentParserSpy.serializeDocument = vi.fn().mockReturnValue(serializedMarkdown)` を使う。
- `sut = new CreateAdrTemplateUseCase(repo, documentParserSpy)` とする。

- `IT-AF-010` 構造: `context('タイトル未指定で実行した場合') > it('プレースホルダ付きテンプレートが生成される')`。Arrange: `repo.nextIdValue = AdrId.create('001')`、`serializedMarkdown` に placeholder セクションを含める。Act: `const actual = await sut.execute({})`。Assert: `actual.markdown` に `Short decision title`, `## Context`, `## Decision`, `## Consequences`, `## Alternatives` が含まれ、`actual.recommendedPath` が `001-short-decision-title.md` 相当になる。
- `IT-AF-011` 構造: `context('タイトル・status・dateを指定した場合') > it('指定値が反映されたカスタムテンプレートが生成される')`。Arrange: `title = 'Package separation'`, `status = 'Accepted'`, `date = '2026-03-13'` を入力する。Act: `const actual = await sut.execute({ title, status, date })`。Assert: `actual.markdown` に指定 frontmatter 値が出力され、`serializeDocument` に渡した ADR も同値で構築される。
- `IT-AF-012` 構造: `context('includeArchgateExample=trueを指定した場合') > it('archgateサンプルが含まれたテンプレートが生成される')`。Arrange: `includeArchgateExample: true` を入力する。Act: `const actual = await sut.execute({ includeArchgateExample: true })`。Assert: `actual.markdown` に `archgate`, `validator_id`, `error_code` のサンプルが含まれる。
- `IT-AF-013` 構造: `context('既存ADRがある場合') > it('次番号が正しく採番される')`。Arrange: `repo.nextIdValue = AdrId.create('012')` にする。Act: `const actual = await sut.execute({ title: 'Validator stack detection' })`。Assert: `recommendedPath` と frontmatter の `adr_id` が `012` になる。
- `IT-AF-014` 構造: `context('date不正形式を指定した場合') > it('InvalidAdrDateErrorがスローされる')`。Arrange: `date = '2026/03/13'` を入力する。Act: `const actual = () => sut.execute({ date: '2026/03/13' })`。Assert: `await expect(actual()).rejects.toThrow(InvalidAdrDateError)` を確認する。

### 3.4 `SeedInitialAdrsUseCase`

共有Arrange:
- `definitions = createSeedDefinitions()` で 11 件を生成する。
- `documentParserSpy.serializeDocument` は ADR ごとにユニークな Markdown を返す。
- `sut = new SeedInitialAdrsUseCase(repo, documentParserSpy)` とする。

- `IT-AF-015` 構造: `context('11件定義を正常投入した場合') > it('created=11, skipped=0の結果が返される')`。Arrange: `repo.exists()` を全件 `false` にする。Act: `const actual = await sut.execute({ definitions })`。Assert: `actual.created.length === 11`、`actual.skipped` は空、`repo.savedItems.length === 11` で `001`〜`011` が順番に保存される。
- `IT-AF-016` 構造: `context('既存ADRありでoverwrite=falseの場合') > it('既存ADRがskippedに記録される')`。Arrange: `001`, `002` だけ `exists=true` にする。Act: `const actual = await sut.execute({ definitions, overwrite: false })`。Assert: `actual.skipped` に `ADR-001`, `ADR-002`、`actual.created.length === 9`、既存2件は `save` されない。
- `IT-AF-017` 構造: `context('既存ADRありでoverwrite=trueの場合') > it('既存ADRが上書きされcreatedに記録される')`。Arrange: `001`, `002` を既存扱いにし `overwrite: true` を渡す。Act: `const actual = await sut.execute({ definitions, overwrite: true })`。Assert: `actual.created.length === 11`、`skipped` は空、`repo.savedItems` に `001`, `002` の再保存が含まれる。
- `IT-AF-018` 構造: `context('定義数が11件でない場合') > it('エラーがスローされる')`。Arrange: `definitions.slice(0, 10)` を作る。Act: `const actual = () => sut.execute({ definitions: shortDefinitions })`。Assert: `await expect(actual()).rejects.toThrow()` で件数不整合例外を確認する。
- `IT-AF-019` 構造: `context('不正なADR定義（バリデーション失敗）を含む場合') > it('AdrValidationErrorがスローされる')`。Arrange: 1件の `status` または本文必須セクションを壊す。Act: `const actual = () => sut.execute({ definitions: invalidDefinitions })`。Assert: `await expect(actual()).rejects.toThrow(AdrValidationError)` を確認し、異常発生時点以降の保存が止まることも併せて確認する。
- `IT-AF-020` 構造: `context('既存ADRとIDが衝突しoverwrite=falseの場合') > it('衝突した件のみskippedに記録され他は正常に投入される')`。Arrange: `005` のみ `exists=true` にする。Act: `const actual = await sut.execute({ definitions, overwrite: false })`。Assert: `actual.skipped` が `['ADR-005']`、`actual.created.length === 10`、`save` は 10 回だけ呼ばれる。

### 3.5 `ChangeAdrStatusUseCase`

共有Arrange:
- `proposedAdr001`, `acceptedAdr002`, `deprecatedAdr003`, `acceptedAdr004`, `acceptedAdr005` を用意する。
- `sut = new ChangeAdrStatusUseCase(repo)` とする。

- `IT-AF-021` 構造: `context('Proposed状態のADRにapproveを実行した場合') > it('Acceptedに遷移し変更前後ステータスが返される')`。Arrange: `repo` に `proposedAdr001` を保持する。Act: `const actual = await sut.execute({ adrRef: 'ADR-001', action: 'approve' })`。Assert: `actual.previousStatus === 'Proposed'`, `actual.currentStatus === 'Accepted'`, 保存後 ADR の status も `Accepted` になる。
- `IT-AF-022` 構造: `context('Accepted状態のADRにdeprecateを実行した場合') > it('Deprecatedに遷移し変更前後ステータスが返される')`。Arrange: `acceptedAdr002` を保持する。Act: `const actual = await sut.execute({ adrRef: 'ADR-002', action: 'deprecate' })`。Assert: 前後ステータスが `Accepted -> Deprecated` になる。
- `IT-AF-023` 構造: `context('Accepted状態のADRにsupersedeを実行した場合') > it('Supersededに遷移しsuperseded_by付きで変更前後ステータスが返される')`。Arrange: `acceptedAdr004` と後継 `acceptedAdr005` を保持し、`exists('005') = true` とする。Act: `const actual = await sut.execute({ adrRef: 'ADR-004', action: 'supersede', supersededBy: 'ADR-005' })`。Assert: `currentStatus === 'Superseded'`、`actual.supersededBy === 'ADR-005'`、保存後集約にも後継参照が残る。
- `IT-AF-024` 構造: `context('Deprecated状態のADRにreproposeを実行した場合') > it('Proposedに遷移し変更前後ステータスが返される')`。Arrange: `deprecatedAdr003` を保持する。Act: `const actual = await sut.execute({ adrRef: 'ADR-003', action: 'repropose' })`。Assert: `Deprecated -> Proposed` が返り、`supersededBy` は `undefined` のままである。
- `IT-AF-025` 構造: `context('存在しないADR参照を指定した場合') > it('AdrNotFoundApplicationErrorがスローされる')`。Arrange: 空 `repo` を使う。Act: `const actual = () => sut.execute({ adrRef: 'ADR-999', action: 'approve' })`。Assert: `await expect(actual()).rejects.toThrow(AdrNotFoundApplicationError)` を確認する。
- `IT-AF-026` 構造: `context('supersede時にsupersededBy参照先が存在しない場合') > it('SupersededTargetNotFoundApplicationErrorがスローされる')`。Arrange: 対象 ADR は存在するが `exists('099') = false` にする。Act: `const actual = () => sut.execute({ adrRef: 'ADR-004', action: 'supersede', supersededBy: 'ADR-099' })`。Assert: `await expect(actual()).rejects.toThrow(SupersededTargetNotFoundApplicationError)` を確認する。
- `IT-AF-027` 構造: `context('許可されない遷移を実行した場合') > it('InvalidAdrStatusTransitionErrorがスローされる')`。Arrange: `Accepted` ADR に `repropose` を実行する。Act: `const actual = () => sut.execute({ adrRef: 'ADR-002', action: 'repropose' })`。Assert: `await expect(actual()).rejects.toThrow(InvalidAdrStatusTransitionError)` を確認する。
- `IT-AF-028` 構造: `context('正常遷移後') > it('Repositoryのsaveが呼び出され永続化される')`。Arrange: `proposedAdr001` を保持し `save` を監視する。Act: `const actual = await sut.execute({ adrRef: 'ADR-001', action: 'approve' })`。Assert: `repo.savedItems` が1件以上で最後の保存対象が `Accepted`、`actual.currentStatus === 'Accepted'` である。

### 3.6 `ValidateAdrFrontmatterUseCase`

共有Arrange:
- `validAdr`, `invalidAdr`, `supersededAdr` を用意する。
- `sut = new ValidateAdrFrontmatterUseCase(repo)` とする。

- `IT-AF-029` 構造: `context('正常なADRを指定した場合') > it('valid=trueの検証結果が返される')`。Arrange: `validAdr` を保持する。Act: `const actual = await sut.execute({ adrRef: 'ADR-001' })`。Assert: `actual.valid === true`、`actual.violations` は空、`actual.adrRef === 'ADR-001'` を確認する。
- `IT-AF-030` 構造: `context('frontmatter不正のADRを指定した場合') > it('violationsを含む検証結果が返される')`。Arrange: `invalidAdr` に `status=Superseded` かつ `superseded_by` 欠落などの違反を持たせる。Act: `const actual = await sut.execute({ adrRef: 'ADR-010' })`。Assert: `actual.valid === false`、`violations.length > 0`、各違反に `field`, `message`, `code` が入る。
- `IT-AF-031` 構造: `context('Superseded状態でsuperseded_by参照先が存在する場合') > it('参照先の実在確認が行われvalid=trueが返される')`。Arrange: `supersededAdr` と参照先 `acceptedAdr005` を同時に保持する。Act: `const actual = await sut.execute({ adrRef: 'ADR-004' })`。Assert: `actual.valid === true`、`repo.existsCalls` または `findByRef` 呼び出しで参照先確認が行われたことを検証する。
- `IT-AF-032` 構造: `context('存在しないADR参照を指定した場合') > it('AdrNotFoundApplicationErrorがスローされる')`。Arrange: 空 `repo` を使う。Act: `const actual = () => sut.execute({ adrRef: 'ADR-999' })`。Assert: `await expect(actual()).rejects.toThrow(AdrNotFoundApplicationError)` を確認する。

### 3.7 `ValidateAllAdrsUseCase`

共有Arrange:
- `validAdr001`, `validAdr002`, `invalidAdr003` を生成する。
- `sut = new ValidateAllAdrsUseCase(repo)` とする。

- `IT-AF-033` 構造: `context('全ADRが正常な場合') > it('valid=true, errors空の検証結果が返される')`。Arrange: 正常 ADR だけを `repo` に入れる。Act: `const actual = await sut.execute({})`。Assert: `actual.valid === true`、`actual.results.length === 件数`、`actual.errors` は空である。
- `IT-AF-034` 構造: `context('違反ADRが含まれる場合') > it('valid=false, errorsにHarnessError互換エラーが含まれる')`。Arrange: `invalidAdr003` を1件混ぜる。Act: `const actual = await sut.execute({})`。Assert: `actual.valid === false`、`errors.length > 0`、各 `errors[*]` が `code`, `message`, `metadata.adr_ref` を持つ。
- `IT-AF-035` 構造: `context('failFast=trueで最初の致命違反がある場合') > it('最初の違反で検証が打ち切られる')`。Arrange: 先頭に違反 ADR、後続にも違反 ADR を置く。Act: `const actual = await sut.execute({ failFast: true })`。Assert: `actual.results.length === 1` または後続 ADR の検証呼び出しが発生しないことを確認する。
- `IT-AF-036` 構造: `context('ADRが0件の場合') > it('valid=true（空結果）が返される')`。Arrange: 空 `repo` を使う。Act: `const actual = await sut.execute({})`。Assert: `actual.valid === true`、`results` と `errors` が空配列である。
- `IT-AF-037` 構造: `context('違反ADRがある場合') > it('adr_refがHarnessError内に正しく埋め込まれる')`。Arrange: `ADR-003` の違反 2 件を作る。Act: `const actual = await sut.execute({})`。Assert: `actual.errors.every((error) => error.metadata?.adr_ref === 'ADR-003')` または同等のプロパティ一致を確認する。

### 3.8 `SearchArchgateMappingsUseCase`

共有Arrange:
- `archgateAdr001`, `archgateAdr002`, `plainAdr003` を保持する `repo` を作る。
- `sut = new SearchArchgateMappingsUseCase(repo)` とする。

- `IT-AF-038` 構造: `context('validatorId指定で検索した場合') > it('一致するADRの検索結果が返される')`。Arrange: `validatorId = 'phase-gate'` に一致する entry を1件以上用意する。Act: `const actual = await sut.execute({ validatorId: 'phase-gate' })`。Assert: 返却結果の `validatorId` が全て一致し、該当 ADR だけが返る。
- `IT-AF-039` 構造: `context('errorCode指定で検索した場合') > it('一致するADRの検索結果が返される')`。Arrange: `errorCode = 'L1-001'` を複数 ADR に持たせる。Act: `const actual = await sut.execute({ errorCode: 'L1-001' })`。Assert: 全件の `errorCode` が `L1-001` で、`adrRef` は一致 ADR のみになる。
- `IT-AF-040` 構造: `context('validatorIdとerrorCodeの両方を指定した場合') > it('AND検索として両条件に一致する結果が返される')`。Arrange: 同じ `validatorId` だが `errorCode` が違う entry を混在させる。Act: `const actual = await sut.execute({ validatorId: 'architecture', errorCode: 'L2-014' })`。Assert: 両条件に一致する entry だけが返る。
- `IT-AF-041` 構造: `context('条件を未指定で実行した場合') > it('ArchgateSearchConditionRequiredErrorがスローされる')`。Arrange: `repo` は何件でもよい。Act: `const actual = () => sut.execute({})`。Assert: `await expect(actual()).rejects.toThrow(ArchgateSearchConditionRequiredError)` を確認する。
- `IT-AF-042` 構造: `context('archgateを持たないADRのみが存在する場合') > it('空の検索結果が返される')`。Arrange: `plainAdr003` のみ保持する。Act: `const actual = await sut.execute({ validatorId: 'phase-gate' })`。Assert: `actual` が空配列である。

### 3.9 `adr-to-detail-dto-mapper`

共有Arrange:
- `basicAdr`, `archgateAdr`, `supersededAdr` を用意する。
- `sut = { execute: toDetailDto }` のような関数参照で十分とする。

- `IT-AF-043` 構造: `context('基本的なADRを変換した場合') > it('adrRef, title, status, date, body, filePathが正しくマッピングされる')`。Arrange: `basicAdr` を生成する。Act: `const actual = toDetailDto(basicAdr)`。Assert: `adrRef`, `title`, `status`, `date`, `body`, `filePath` の各値が VO 由来の値と一致する。
- `IT-AF-044` 構造: `context('archgate付きADRを変換した場合') > it('archgate情報がDTOに含まれる')`。Arrange: `archgateAdr` に 2 件の `enforcedBy` を持たせる。Act: `const actual = toDetailDto(archgateAdr)`。Assert: `actual.archgate.enforcedBy.length === 2`、各 `validatorId`, `errorCode` が保持される。
- `IT-AF-045` 構造: `context('superseded_by付きADRを変換した場合') > it('supersededBy情報がDTOに含まれる')`。Arrange: `supersededAdr` に `ADR-005` を設定する。Act: `const actual = toDetailDto(supersededAdr)`。Assert: `actual.supersededBy === 'ADR-005'` になる。
- `IT-AF-046` 構造: `context('archgate/supersededByが未設定のADRを変換した場合') > it('該当フィールドがundefinedになる')`。Arrange: オプション項目なしの `basicAdr` を使う。Act: `const actual = toDetailDto(basicAdr)`。Assert: `actual.archgate === undefined`、`actual.supersededBy === undefined` を確認する。

### 3.10 `adr-to-list-item-dto-mapper`

共有Arrange:
- `basicAdr`, `archgateAdr`, `supersededAdr` を再利用する。

- `IT-AF-047` 構造: `context('基本的なADRを変換した場合') > it('adrRef, title, status, dateが正しくマッピングされる')`。Arrange: `basicAdr` を使う。Act: `const actual = toListItemDto(basicAdr)`。Assert: 基本4項目が想定どおりである。
- `IT-AF-048` 構造: `context('archgate付きADRを変換した場合') > it('hasArchgate=trueが設定される')`。Arrange: `archgateAdr` を使う。Act: `const actual = toListItemDto(archgateAdr)`。Assert: `actual.hasArchgate === true` になる。
- `IT-AF-049` 構造: `context('archgateなしADRを変換した場合') > it('hasArchgate=falseが設定される')`。Arrange: `basicAdr` を使う。Act: `const actual = toListItemDto(basicAdr)`。Assert: `actual.hasArchgate === false` になる。
- `IT-AF-050` 構造: `context('superseded_by付きADRを変換した場合') > it('supersededByが設定される')`。Arrange: `supersededAdr` を使う。Act: `const actual = toListItemDto(supersededAdr)`。Assert: `actual.supersededBy === 'ADR-005'` になる。

### 3.11 `adr-validation-to-harness-error-mapper`

共有Arrange:
- `violationA`, `violationB` を持つ `validationResult` を `createValidationResultDto()` で生成する。

- `IT-AF-051` 構造: `context('違反ありの検証結果を変換した場合') > it('HarnessError互換のエラー配列が生成される')`。Arrange: 1件違反の `validationResult` を作る。Act: `const actual = toHarnessErrors(validationResult)`。Assert: `actual.length === 1`、`code`, `message`, `metadata` を持つ。
- `IT-AF-052` 構造: `context('違反ありの検証結果を変換した場合') > it('adr_refがHarnessError内に正しく埋め込まれる')`。Arrange: `adrRef = 'ADR-010'` を設定する。Act: `const actual = toHarnessErrors(validationResult)`。Assert: `actual[0].metadata.adr_ref === 'ADR-010'` になる。
- `IT-AF-053` 構造: `context('違反なし（valid=true）の検証結果を変換した場合') > it('空配列が返される')`。Arrange: `valid=true`, `violations=[]` の DTO を作る。Act: `const actual = toHarnessErrors(validResult)`。Assert: `actual` が空配列である。
- `IT-AF-054` 構造: `context('複数違反がある検証結果を変換した場合') > it('それぞれの違反が個別のHarnessErrorへ変換される')`。Arrange: 2件以上の違反を持つ DTO を作る。Act: `const actual = toHarnessErrors(validationResult)`。Assert: `actual.length === 違反件数`、各エラーの `code` と `message` が元違反に対応する。

## 4. Adapter統合テスト詳細ロジック

### 4.1 `FileSystemAdrRepository`

共有Arrange:
- 各ケースで `tempDir = createAdrTempDir()` を作り、`docs/ADR` 配下へ fixture をコピーする。
- `frontmatterParser = new GrayMatterAdrFrontmatterParser()`、`documentParser = new AdrMarkdownDocumentParser(frontmatterParser)`、`serializer = new AdrMarkdownSerializer()`、`sut = new FileSystemAdrRepository({ rootDir: tempDir, documentParser, serializer })` を実体で組み立てる。

- `IT-AF-055` 構造: `context('存在するADRファイルを指定した場合') > it('ADR集約が復元される')`。Arrange: `001-package-separation.md` を配置する。Act: `const actual = await sut.findById(AdrId.create('001'))`。Assert: `actual` が `null` でなく、`title`, `status`, `body` が fixture と一致する。
- `IT-AF-056` 構造: `context('存在しないIDを指定した場合') > it('nullが返される')`。Arrange: `001` だけ配置する。Act: `const actual = await sut.findById(AdrId.create('999'))`。Assert: `actual === null` になる。
- `IT-AF-057` 構造: `context('ADR-001形式で指定した場合') > it('対応するADRが取得される')`。Arrange: `001` fixture を配置する。Act: `const actual = await sut.findByRef('ADR-001')`。Assert: `actual?.getId().toString() === '001'` を確認する。
- `IT-AF-058` 構造: `context('001形式（数値のみ）で指定した場合') > it('ADR-001形式と同一のADRが取得される')`。Arrange: `001` fixture を配置する。Act: `const actual = await sut.findByRef('001')`。Assert: `IT-AF-057` と同じ ADR が返る。
- `IT-AF-059` 構造: `context('template.mdが含まれるディレクトリで実行した場合') > it('template.mdが結果から除外される')`。Arrange: `template.md` と `001.md`, `002.md` を配置する。Act: `const actual = await sut.findAll()`。Assert: `actual.length === 2`、`template.md` 相当 ADR が含まれない。
- `IT-AF-060` 構造: `context('statusフィルタを指定した場合') > it('該当ステータスのADRのみが返される')`。Arrange: Accepted と Proposed の fixture を混在させる。Act: `const actual = await sut.findAll({ statuses: [AdrStatus.accepted()] })`。Assert: 全件 `Accepted` だけになる。
- `IT-AF-061` 構造: `context('新規ADRを保存した場合') > it('UTF-8・末尾改行付きでファイルが作成される')`。Arrange: 新規 `ADR-012` 集約を作る。Act: `const actual = await sut.save(adr012)`。Assert: 保存ファイルが存在し UTF-8 で読め、文字列末尾が `\n` 1つで終わる。
- `IT-AF-062` 構造: `context('タイトル変更によりファイル名がrenameされる場合') > it('旧ファイルが存在しないこと（Q-IT-4）')`。Arrange: 既存 `001-package-separation.md` を読み込みタイトル変更後に保存する。Act: `const actual = await sut.save(renamedAdr001)`。Assert: 旧パスが `existsSync === false` になる。
- `IT-AF-063` 構造: 同一 context の `it('新ファイル名でファイルが存在すること（Q-IT-4）')`。Arrange: `IT-AF-062` と同じ。Act: `const actual = await sut.save(renamedAdr001)`。Assert: `001-new-title.md` が存在する。
- `IT-AF-064` 構造: 同一 context の `it('新ファイルの内容が期待通りであること（Q-IT-4）')`。Arrange: `IT-AF-062` と同じ。Act: `const actual = await sut.save(renamedAdr001)`。Assert: 新ファイルの H1, frontmatter, section 順が期待どおりである。
- `IT-AF-065` 構造: `context('存在するADRのIDを指定した場合') > it('trueが返される')`。Arrange: `001` fixture を配置する。Act: `const actual = await sut.exists(AdrId.create('001'))`。Assert: `actual === true` になる。
- `IT-AF-066` 構造: `context('存在しないADRのIDを指定した場合') > it('falseが返される')`。Arrange: `001` だけ配置する。Act: `const actual = await sut.exists(AdrId.create('999'))`。Assert: `actual === false` になる。
- `IT-AF-067` 構造: `context('既存ADRがある場合') > it('最大ID+1が返される')`。Arrange: `001`, `002`, `011` を配置する。Act: `const actual = await sut.nextId()`。Assert: `actual.toString() === '012'` になる。
- `IT-AF-068` 構造: `context('ADRが0件の場合') > it('001が返される')`。Arrange: `template.md` だけ置くか空ディレクトリを使う。Act: `const actual = await sut.nextId()`。Assert: `actual.toString() === '001'` になる。

### 4.2 `GrayMatterAdrFrontmatterParser`

共有Arrange:
- `sut = new GrayMatterAdrFrontmatterParser()` とする。
- YAML 文字列は inline fixture か `fixtures/docs/ADR/*.md` から切り出して使う。

- `IT-AF-069` 構造: `context('正常なYAMLを入力した場合') > it('AdrFrontmatterが正しく生成される')`。Arrange: `adr_id`, `title`, `status`, `date` を持つ YAML を作る。Act: `const actual = sut.parseFrontmatter(yaml)`。Assert: 各 VO 値が YAML と一致する。
- `IT-AF-070` 構造: `context('archgate付きYAMLを入力した場合') > it('archgate情報が正しくパースされる')`。Arrange: `archgate.enforced_by` を2件持つ YAML を作る。Act: `const actual = sut.parseFrontmatter(yaml)`。Assert: `actual.archgate?.enforcedBy.length === 2`、順序も保持される。
- `IT-AF-071` 構造: `context('superseded_by付きYAMLを入力した場合') > it('superseded_by情報が正しくパースされる')`。Arrange: `status: Superseded` と `superseded_by: ADR-005` を含める。Act: `const actual = sut.parseFrontmatter(yaml)`。Assert: `actual.supersededBy?.toString() === 'ADR-005'` になる。
- `IT-AF-072` 構造: `context('不正YAML（必須フィールド欠落）を入力した場合') > it('エラーがスローされる')`。Arrange: `title` なしの YAML を作る。Act: `const actual = () => sut.parseFrontmatter(yaml)`。Assert: `expect(actual).toThrow()` で必須欠落例外を確認する。
- `IT-AF-073` 構造: `context('errorCode不正形式を含むYAMLを入力した場合') > it('エラーがスローされる')`。Arrange: `error_code: INVALID` を含める。Act: `const actual = () => sut.parseFrontmatter(yaml)`。Assert: `expect(actual).toThrow()` で error_code 形式違反を確認する。
- `IT-AF-074` 構造: `context('基本的なfrontmatterをシリアライズした場合') > it('正しいキー順（adr_id, title, status, date, superseded_by, archgate）でYAMLが生成される')`。Arrange: 基本 VO を作る。Act: `const actual = sut.serializeFrontmatter(frontmatter)`。Assert: キーの出現順が仕様どおりで、未設定項目は必要なときだけ出る。
- `IT-AF-075` 構造: `context('archgate付きfrontmatterをシリアライズした場合') > it('archgate情報が正しくYAMLにシリアライズされる')`。Arrange: `archgate` を持つ frontmatter を作る。Act: `const actual = sut.serializeFrontmatter(frontmatter)`。Assert: `validator_id`, `error_code` が配列順のまま文字列化される。
- `IT-AF-076` 構造: `context('正常なYAMLで往復変換した場合') > it('元のデータと同一の結果が得られる')`。Arrange: archgate と superseded_by を含む YAML を作る。Act: `const actual = sut.parseFrontmatter(sut.serializeFrontmatter(sut.parseFrontmatter(yaml)))`。Assert: 最初に parse した VO と等価である。

### 4.3 `AdrMarkdownDocumentParser`

共有Arrange:
- `frontmatterParser = new GrayMatterAdrFrontmatterParser()`、`sut = new AdrMarkdownDocumentParser(frontmatterParser)` とする。
- Markdown fixture は H1 + section blocks を含めて作る。

- `IT-AF-077` 構造: `context('正常なMarkdownを入力した場合') > it('frontmatterとbodyが正しくパースされる')`。Arrange: 標準英語見出しを持つ Markdown を作る。Act: `const actual = sut.parseDocument(markdown)`。Assert: `actual.frontmatter` と `actual.body` の各セクションが分離される。
- `IT-AF-078` 構造: `context('日本語見出し（コンテキスト/決定/結果/代替案）を含む場合') > it('日本語セクション名が受理される')`。Arrange: 日本語見出し Markdown を作る。Act: `const actual = sut.parseDocument(markdown)`。Assert: `body.context`, `decision`, `consequences`, `alternatives` が正しく入る。
- `IT-AF-079` 構造: `context('必須セクション（Context/Decision/Consequences）が欠落している場合') > it('エラーがスローされる')`。Arrange: `Consequences` 欠落 Markdown を作る。Act: `const actual = () => sut.parseDocument(markdown)`。Assert: `expect(actual).toThrow()` で本文不備例外を確認する。
- `IT-AF-080` 構造: `context('H1タイトル行を含む場合') > it('H1タイトル行がbodyから除去される')`。Arrange: `# Package separation` を含む Markdown を作る。Act: `const actual = sut.parseDocument(markdown)`。Assert: `body.context` などに H1 の文字列が残らない。
- `IT-AF-081` 構造: `context('全セクションを含むADRを変換した場合') > it('Context→Decision→Consequences→Alternativesの順でMarkdownが生成される')`。Arrange: 4セクションを持つ ADR を作る。Act: `const actual = sut.serializeDocument(adr)`。Assert: 文字列中の section 出現順が `Context`, `Decision`, `Consequences`, `Alternatives` になる。
- `IT-AF-082` 構造: `context('Alternatives未設定のADRを変換した場合') > it('Alternativesセクションが省略される')`。Arrange: `alternatives` を持たない ADR を作る。Act: `const actual = sut.serializeDocument(adr)`。Assert: `actual` に `## Alternatives` が含まれない。
- `IT-AF-083` 構造: `context('正常なMarkdownで往復変換した場合') > it('セクション内容の等価性が保たれる')`。Arrange: 標準 Markdown を作る。Act: `const actual = sut.parseDocument(sut.serializeDocument(ADR.reconstitute(...)))` または `parse -> serialize -> parse` を行う。Assert: 各セクション本文と frontmatter 値が等価である。
- `IT-AF-084` 構造: `context('日本語見出しのMarkdownをparse後にserializeした場合') > it('英語見出し（Context, Decision, Consequences, Alternatives）で出力される')`。Arrange: 日本語見出し Markdown を作る。Act: `const actual = sut.serializeDocument(ADR.reconstitute(...parsed...))`。Assert: 出力が英語見出しのみで構成される。

### 4.4 `AdrMarkdownSerializer`

共有Arrange:
- `sut = new AdrMarkdownSerializer()` とする。
- 生成 ADR は `createAdrAggregate()` を使い、タイトルに slug 変換差分が出るものを含める。

- `IT-AF-085` 構造: `context('基本的なADRをシリアライズした場合') > it('H1タイトルが正しく出力される')`。Arrange: `title = 'Package separation'` の ADR を作る。Act: `const actual = sut.serialize(adr)`。Assert: 先頭に `# Package separation` が出力される。
- `IT-AF-086` 構造: `context('全セクションを含むADRをシリアライズした場合') > it('セクション順がContext→Decision→Consequences→Alternativesになる')`。Arrange: 4セクションすべてを持つ ADR を作る。Act: `const actual = sut.serialize(adr)`。Assert: 各 section の位置インデックスが昇順である。
- `IT-AF-087` 構造: `context('Alternatives未設定のADRをシリアライズした場合') > it('Alternativesセクションが出力されない')`。Arrange: `alternatives` なし ADR を作る。Act: `const actual = sut.serialize(adr)`。Assert: `actual.markdown` または相当文字列に `## Alternatives` が含まれない。
- `IT-AF-088` 構造: `context('任意のADRをシリアライズした場合') > it('末尾改行が1つだけ付与される')`。Arrange: 任意 ADR を作る。Act: `const actual = sut.serialize(adr)`。Assert: 文字列末尾が `\n` で終わり、`\n\n` では終わらない。
- `IT-AF-089` 構造: `context('タイトルからslugを生成した場合') > it('ASCII lower-kebab-caseのslugが生成される')`。Arrange: `title = 'Full migration from ESLint to Biome'` の ADR を作る。Act: `const actual = sut.serialize(adr)`。Assert: ファイルパスまたは slug が `full-migration-from-eslint-to-biome` になる。

### 4.5 `initial-adr-definitions`

共有Arrange:
- `actualDefinitions = initialAdrDefinitions` をそのまま読み込む。

- `IT-AF-090` 構造: `context('定義配列を取得した場合') > it('正確に11件の定義が含まれる')`。Arrange: 実体配列を読み込む。Act: `const actual = initialAdrDefinitions`。Assert: `actual.length === 11` になる。
- `IT-AF-091` 構造: `context('各定義を検証した場合') > it('各ADR定義のtitleが空でない')`。Arrange: 実体配列を使う。Act: `const actual = initialAdrDefinitions`。Assert: `actual.every((definition) => definition.title.trim().length > 0)` を確認する。
- `IT-AF-092` 構造: `context('各定義を検証した場合') > it('各ADR定義のstatusがAcceptedまたはProposedのいずれかである')`。Arrange: 実体配列を使う。Act: `const actual = initialAdrDefinitions`。Assert: 全件の `status` が許可2値のどちらかである。
- `IT-AF-093` 構造: `context('各定義を検証した場合') > it('各ADR定義のdateがYYYY-MM-DD形式である')`。Arrange: 実体配列を使う。Act: `const actual = initialAdrDefinitions`。Assert: 全件の `date` が `/^\d{4}-\d{2}-\d{2}$/` に一致する。
- `IT-AF-094` 構造: `context('論理設計 §5.5の仕様と照合した場合') > it('11件のタイトルとステータスが仕様一致する')`。Arrange: 仕様期待値マップを `{ '001': { title, status }, ... }` で定義する。Act: `const actual = initialAdrDefinitions`。Assert: 11件それぞれの `title` と `status` が論理設計表と一致する。

### 4.6 Presentation adapter

共通方針:
- handler は `({ args, io, useCases }) => Promise<number>` 形式の純関数として扱う。
- `actual` は常に終了コードを指す。
- 出力検証は `io.stdoutLines` と `io.stderrLines` を使い、JSON 出力時は `JSON.parse(io.stdoutLines.join('\n'))` で構造比較する。

#### 4.6.1 `adr-create-template`

- `IT-AF-095` 構造: `context('--title と --status を指定した場合') > it('テンプレートが生成され終了コード0が返される')`。Arrange: `CreateAdrTemplateUseCaseStub.execute` を成功 DTO 返却にし、`args = { title: 'Package separation', status: 'Accepted' }` を渡す。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`execute` が指定値で呼ばれ、`stdout` に推奨パスと Markdown が出力される。
- `IT-AF-096` 構造: `context('引数なし（デフォルト値）で実行した場合') > it('プレースホルダ付きテンプレートが生成され終了コード0が返される')`。Arrange: スタブ返却 DTO に placeholder を入れる。Act: `const actual = await handler({ args: {}, io, useCase })`。Assert: `actual === 0`、`execute` に空入力が渡り、`stdout` に placeholder が含まれる。
- `IT-AF-097` 構造: `context('--include-archgate-exampleを指定した場合') > it('archgateサンプル付きテンプレートが生成される')`。Arrange: スタブ返却 Markdown に `archgate` サンプルを含める。Act: `const actual = await handler({ args: { includeArchgateExample: true }, io, useCase })`。Assert: `actual === 0`、出力文字列に `validator_id` と `error_code` が含まれる。
- `IT-AF-098` 構造: `context('無効なstatus値を指定した場合') > it('終了コード2が返される')`。Arrange: `args = { status: 'Archived' }` を渡す。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 2`、`execute` は呼ばれず、`stderr` に入力不正メッセージが出る。

#### 4.6.2 `adr-seed-initial`

- `IT-AF-099` 構造: `context('引数なしで実行した場合') > it('11件ADRが投入され結果が表示され終了コード0が返される')`。Arrange: スタブ返却を `{ created: ['ADR-001', ... 'ADR-011'], skipped: [] }` にする。Act: `const actual = await handler({ args: {}, io, useCase })`。Assert: `actual === 0`、`stdout` に created 件数と ADR ref 一覧が出る。
- `IT-AF-100` 構造: `context('--overwriteを指定した場合') > it('既存ADRが上書きされ終了コード0が返される')`。Arrange: `args = { overwrite: true }` を渡す。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`execute` が `overwrite: true` で呼ばれる。
- `IT-AF-101` 構造: `context('全件既存でスキップされた場合') > it('スキップ結果が表示され終了コード0が返される')`。Arrange: スタブ返却を `{ created: [], skipped: ['ADR-001', ...] }` にする。Act: `const actual = await handler({ args: {}, io, useCase })`。Assert: `actual === 0`、`stdout` に skipped 件数が出る。
- `IT-AF-102` 構造: `context('定義不整合・保存失敗が発生した場合') > it('終了コード2が返される')`。Arrange: `execute` を reject させる。Act: `const actual = await handler({ args: {}, io, useCase })`。Assert: `actual === 2`、`stderr` に失敗内容が出る。

#### 4.6.3 `adr-list`

- `IT-AF-103` 構造: `context('引数なしで実行した場合') > it('全件一覧が表示され終了コード0が返される')`。Arrange: スタブ返却を `items` 2件、`summary` 付きにする。Act: `const actual = await handler({ args: {}, io, useCase })`。Assert: `actual === 0`、`stdout` にタイトル行と各 ADR の行が出る。
- `IT-AF-104` 構造: `context('--status Acceptedを指定した場合') > it('フィルタ結果が表示される')`。Arrange: `args = { status: ['Accepted'] }` とし、スタブ返却を Accepted のみにする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`execute` が `statuses: ['Accepted']` 相当で呼ばれる。
- `IT-AF-105` 構造: `context('--jsonを指定した場合') > it('JSON形式で出力される')`。Arrange: スタブ返却 DTO を用意し `args = { json: true }` とする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`JSON.parse(stdout)` が DTO と一致する。
- `IT-AF-106` 構造: `context('不正なstatus値を指定した場合') > it('終了コード2が返される')`。Arrange: `args = { status: ['Archived'] }` を渡す。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 2`、`execute` は呼ばれず `stderr` にエラーが出る。
- `IT-AF-107` 構造: `context('ADRが0件の場合') > it('空一覧が表示され終了コード0が返される')`。Arrange: スタブ返却を空 `items` と0集計にする。Act: `const actual = await handler({ args: {}, io, useCase })`。Assert: `actual === 0`、`stdout` に空状態メッセージが出る。

#### 4.6.4 `adr-show`

- `IT-AF-108` 構造: `context('ADR-001を指定した場合') > it('詳細が表示され終了コード0が返される')`。Arrange: 詳細 DTO を返すスタブを作る。Act: `const actual = await handler({ args: { adrRef: 'ADR-001' }, io, useCase })`。Assert: `actual === 0`、`stdout` に `title`, `status`, `Context` 本文が出る。
- `IT-AF-109` 構造: `context('--jsonを指定した場合') > it('JSON形式で出力される')`。Arrange: DTO を返し `args = { adrRef: 'ADR-001', json: true }` とする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`JSON.parse(stdout)` が DTO と一致する。
- `IT-AF-110` 構造: `context('存在しないADR参照を指定した場合') > it('終了コード1が返される')`。Arrange: `execute` を `AdrNotFoundApplicationError` で reject させる。Act: `const actual = await handler({ args: { adrRef: 'ADR-999' }, io, useCase })`。Assert: `actual === 1`、`stderr` に未検出文言が出る。
- `IT-AF-111` 構造: `context('UseCase実行時に読み込みエラーが発生した場合') > it('終了コード2が返される')`。Arrange: `execute` を一般例外で reject させる。Act: `const actual = await handler({ args: { adrRef: 'ADR-001' }, io, useCase })`。Assert: `actual === 2`、`stderr` に実行エラーが出る。

#### 4.6.5 `adr-search-archgate`

- `IT-AF-112` 構造: `context('--validator指定で実行した場合') > it('一致結果が表示され終了コード0が返される')`。Arrange: 検索結果 DTO を返すスタブを作り `args = { validator: 'phase-gate' }` とする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`stdout` に `ADR-xxx` と `validator_id` が出る。
- `IT-AF-113` 構造: `context('--error-code指定で実行した場合') > it('一致結果が表示される')`。Arrange: `args = { errorCode: 'L1-001' }` とする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`execute` が `errorCode` 付きで呼ばれる。
- `IT-AF-114` 構造: `context('--jsonを指定した場合') > it('JSON形式で出力される')`。Arrange: DTO 配列を返し `args = { validator: 'phase-gate', json: true }` とする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`JSON.parse(stdout)` が DTO 配列と一致する。
- `IT-AF-115` 構造: `context('条件を未指定で実行した場合') > it('終了コード2が返される')`。Arrange: `args = {}` を渡す。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 2`、`execute` は呼ばれず `stderr` に条件不足が出る。

#### 4.6.6 `adr-validate`

- `IT-AF-116` 構造: `context('単体ADR指定で違反なしの場合') > it('終了コード0が返される')`。Arrange: 単体 UseCase スタブを `valid=true` 返却にする。Act: `const actual = await handler({ args: { adrRef: 'ADR-001' }, io, validateOneUseCase, validateAllUseCase })`。Assert: `actual === 0`、単体 UseCase だけが呼ばれる。
- `IT-AF-117` 構造: `context('--allで全件検証し違反なしの場合') > it('終了コード0が返される')`。Arrange: 全件 UseCase スタブを `valid=true` 返却にする。Act: `const actual = await handler({ args: { all: true }, io, validateOneUseCase, validateAllUseCase })`。Assert: `actual === 0`、全件 UseCase だけが呼ばれる。
- `IT-AF-118` 構造: `context('違反ありの場合') > it('終了コード1が返される')`。Arrange: 単体または全件 UseCase が `valid=false` と `errors` を返す。Act: `const actual = await handler({ args: { all: true }, io, ... })`。Assert: `actual === 1`、`stdout` または `stderr` に違反一覧が出る。
- `IT-AF-119` 構造: `context('--jsonを指定した場合') > it('JSON形式で出力される')`。Arrange: `process.argv` 近傍の受け口を `['node', 'adr-validate', '--all', '--json']` へ差し替え、UseCase スタブは DTO を返す。Act: `const actual = await entrypoint()` または handler 呼び出しを行う。Assert: `actual === 0`、`stdout` が妥当な JSON である。
- `IT-AF-120` 構造: `context('存在しないADR参照を指定した場合') > it('終了コード1が返される')`。Arrange: 単体 UseCase を `AdrNotFoundApplicationError` で reject させる。Act: `const actual = await handler({ args: { adrRef: 'ADR-999' }, io, ... })`。Assert: `actual === 1`、`stderr` に未検出文言が出る。
- `IT-AF-121` 構造: `context('UseCase実行時にエラーが発生した場合') > it('終了コード2が返される')`。Arrange: UseCase を一般例外で reject させる。Act: `const actual = await handler({ args: { all: true }, io, ... })`。Assert: `actual === 2`、`stderr` に実行エラーが出る。

#### 4.6.7 `adr-change-status`

- `IT-AF-122` 構造: `context('ADR-001 approveを指定した場合') > it('変更成功し終了コード0が返される')`。Arrange: 変更結果 DTO を返すスタブを作る。Act: `const actual = await handler({ args: { adrRef: 'ADR-001', action: 'approve' }, io, useCase })`。Assert: `actual === 0`、`stdout` に `Proposed -> Accepted` が出る。
- `IT-AF-123` 構造: `context('supersede --superseded-by ADR-002を指定した場合') > it('正常遷移し終了コード0が返される')`。Arrange: 変更結果 DTO に `supersededBy: 'ADR-002'` を入れる。Act: `const actual = await handler({ args: { adrRef: 'ADR-001', action: 'supersede', supersededBy: 'ADR-002' }, io, useCase })`。Assert: `actual === 0`、`execute` に `supersededBy` が渡り出力にも表示される。
- `IT-AF-124` 構造: `context('--jsonを指定した場合') > it('JSON形式で出力される')`。Arrange: DTO を返し `args = { adrRef: 'ADR-001', action: 'approve', json: true }` とする。Act: `const actual = await handler({ args, io, useCase })`。Assert: `actual === 0`、`JSON.parse(stdout)` が DTO と一致する。
- `IT-AF-125` 構造: `context('存在しないADR参照を指定した場合') > it('終了コード1が返される')`。Arrange: `execute` を `AdrNotFoundApplicationError` で reject させる。Act: `const actual = await handler({ args: { adrRef: 'ADR-999', action: 'approve' }, io, useCase })`。Assert: `actual === 1`、`stderr` に未検出文言が出る。
- `IT-AF-126` 構造: `context('不正な遷移を指定した場合') > it('終了コード1が返される')`。Arrange: `execute` を `InvalidAdrStatusTransitionError` で reject させる。Act: `const actual = await handler({ args: { adrRef: 'ADR-002', action: 'repropose' }, io, useCase })`。Assert: `actual === 1`、`stderr` に状態遷移違反が出る。

## 5. モック戦略

| 対象 | 方針 |
| --- | --- |
| Domainオブジェクト (`ADR`, `AdrId`, `AdrStatus`, `AdrFrontmatter`, `AdrBody`, `ArchgateMapping`, `AdrValidationService`) | 実体を使う。モック化しない。 |
| Application UseCase テスト | `AdrRepositoryPort`, `AdrDocumentParserPort` のみスタブ化する。戻り値と呼び出し履歴を制御できる軽量テストダブルに留める。 |
| Mapper テスト | モックを使わず、入力 ADR 実体と戻り DTO の変換結果のみを見る。 |
| Infrastructure テスト | FileSystem, parser, serializer は実体を使う。I/O は一時ディレクトリで隔離し、外部システム依存は持ち込まない。 |
| Presentation テスト | UseCase の `execute` だけをスタブ化する。CLI の入出力は `createCliIoDouble()` で捕捉し、`process.argv` モックは `IT-AF-119` のみに限定する。 |

モック実装ルール:

- `beforeEach` に Arrange を逃がさない。各 `it()` の `// Arrange` でケース固有の依存を作る。
- Act の返り値は必ず `const actual = ...` に代入する。
- `vi.clearAllMocks()` はスタブの呼び出し履歴リセットに限定し、テストデータ自体は毎ケース再生成する。
- 例外系では `const actual = () => sut.execute(...)` の関数化までは許容し、`result` 変数名は使わない。

## 6. テスト実行コマンド

全件実行:

```bash
pnpm test
```

adr-foundation のみ実行:

```bash
pnpm vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/adr-foundation
```

UseCase 単体ファイル実行:

```bash
pnpm vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/adr-foundation/application/get-adr-by-ref-use-case.test.ts
```

Infrastructure 単体ファイル実行:

```bash
pnpm vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/adr-foundation/infrastructure/file-system-adr-repository.test.ts
```

Presentation 単体ファイル実行:

```bash
pnpm vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/adr-foundation/presentation/adr-validate.test.ts
```
