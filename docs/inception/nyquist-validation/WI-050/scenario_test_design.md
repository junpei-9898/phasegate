# シナリオテスト設計: H07-04 — phasegate:impact-analysis HXX-XXコマンド

> **Unit ID**: nyquist-validation
> **ストーリーID**: H07-04
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

`ImpactAnalysisService` および `AnalyzeImpactUseCase` による指定ストーリーのテストケース逆引き機能。CLIエントリポイントはharness-apiが所有し、本Unitは実行ロジックを提供する。

- `phasegate:impact-analysis HXX-XX` コマンドの実行（正常時: 終了コード0、ストーリー未検出時: 終了コード1）
- 指定ストーリーIDに紐づくテストケース一覧をrequirement-test-matrix.jsonから特定・出力
- 存在しないストーリーID（HXX-XX形式）が指定された場合、適切なエラーメッセージを表示
- 出力にテスト種別（unit/it/scenario）とファイルパスを含める

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-NQ-04-001 | 存在するstoryIdを指定した場合 | storyId='H07-01' | exitCode=0、関連テストケース一覧（filePath, testType）が出力される |
| SC-NQ-04-002 | 存在しないstoryIdを指定した場合 | storyId='H99-99' | exitCode=1、StoryNotFoundErrorのメッセージが出力される |
| SC-NQ-04-003 | storyIdに複数のACが紐づく場合 | storyId='H07-01'（3AC） | 全AC分のTestReferenceが出力される |
| SC-NQ-04-004 | harness-apiのimpact-analysisアダプタが正しく委譲する場合 | harness-api経由でImpactAnalysisService呼び出し | AnalyzeImpactUseCaseの結果がCLI出力に変換される |

## 3. テスト配置
- `scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-service.test.ts`
- `scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-result.test.ts`
- `scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts`

## 4. 前提条件
- `MatrixFilePort` が実装されていること（FileSystemMatrixFileAdapter）
- requirement-test-matrix.jsonが存在すること
- storyIdがHXX-XX形式（例: H07-01）であること
