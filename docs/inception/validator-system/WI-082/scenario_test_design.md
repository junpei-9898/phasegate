# シナリオテスト設計: H08-04 — L4 drift-detectバリデータ

> **Unit ID**: validator-system
> **ストーリーID**: H08-04
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

L4 drift-detectバリデータ（L4-001）の実行機能。

- 設計→コード方向の乖離検出（設計文書に定義されているがコードに実装されていない要素）
- コード→設計方向の乖離検出（コードに存在するが設計文書に定義されていない要素）
- `@unit` メタデータで参照されるUnitが設計文書に存在することを検証
- 設計文書の `@story-id HXX-XX` に対応するinception文書の存在を検証
- 乖離検出時のHarnessError（L4-001）に乖離の方向・対象要素・推奨アクションを含める

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-VS-04-001 | 設計とコードが一致している場合 | 設計文書とコード実装が整合している | passed=true |
| SC-VS-04-002 | 設計→コード方向の乖離がある場合 | 設計文書にあるがコードに実装がない要素 | passed=false、HarnessError(L4-001)に方向='design-to-code'と対象要素を含む |
| SC-VS-04-003 | コード→設計方向の乖離がある場合 | コードにあるが設計文書に定義がない要素 | passed=false、HarnessError(L4-001)に方向='code-to-design'と対象要素を含む |
| SC-VS-04-004 | @unitメタデータが不正な場合 | @unitで指定されたUnitが設計文書に存在しない | passed=false、推奨アクションを含むHarnessError |
| SC-VS-04-005 | 対応するinception文書が存在しない場合 | @story-id H99-01 に対応するinception文書なし | passed=false、HarnessError(L4-001)に対象文書パスを含む |

## 3. テスト配置
- `scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts`
- `scripts/harness/__tests__/unit/validator-system/drift-report.test.ts`
- `scripts/harness/__tests__/unit/validator-system/drift-detection-service.test.ts`

## 4. 前提条件
- `DesignDocumentPort` が実装されていること（MarkdownDesignDocumentAdapter）
- `SourceCodeAnalyzerPort` が実装されていること（BiomeAstSourceCodeAnalyzerAdapter）
- 設計文書が `docs/product/construction/{unit}/` 配下に存在すること
- inception文書が `docs/inception/{unit}/` 配下に存在すること
