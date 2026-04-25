# シナリオテスト設計: H07-01 — requirement-test-matrix.json新設

> **Unit ID**: nyquist-validation
> **ストーリーID**: H07-01
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

`ValidateMatrixUseCase` による requirement-test-matrix.json のスキーマバリデーションおよびstoryId整合性検証機能。

- JSONスキーマ定義: User Story ID / AC ID / テストケースファイルパス / テスト種別（unit/it/scenario）のフィールドを含む
- スキーマバリデーションが通過するサンプルファイルの作成
- 無効なスキーマのファイルに対するバリデーションエラー検出
- `@story` メタデータ（H03-03）との整合性定義（storyIdがtraceability-model登録済みであることの検証）

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-NQ-01-001 | 有効なrequirement-test-matrix.jsonのバリデーション | 正しいスキーマのmatrixデータ | passed=true、validatedData=入力データ |
| SC-NQ-01-002 | 未登録のstoryIdが含まれる場合 | storyId='H07-99'（未登録） | passed=false、errors に H07-99未登録のHarnessError |
| SC-NQ-01-003 | 複数の登録済みstoryIdが含まれる場合 | storyId='H07-01','H07-02'（両方登録済み） | passed=true |
| SC-NQ-01-004 | AC IDのフォーマットが無効の場合 | acId='invalid-format' | passed=false、InvalidAcIdFormatError |
| SC-NQ-01-005 | 重複するstoryIdが含まれる場合 | 同一storyIdが2エントリ | passed=false、DuplicateStoryMappingError |
| SC-NQ-01-006 | テスト種別が無効な場合 | testType='invalid' | passed=false、InvalidTestTypeError |
| SC-NQ-01-007 | filePathが空文字の場合 | filePath='' | passed=false、EmptyFilePathError |

## 3. テスト配置
- `scripts/harness/__tests__/unit/nyquist-validation/requirement-test-matrix.test.ts`
- `scripts/harness/__tests__/unit/nyquist-validation/matrix-validation-service.test.ts`
- `scripts/harness/__tests__/unit/nyquist-validation/ac-mapping.test.ts`
- `scripts/harness/__tests__/unit/nyquist-validation/test-reference.test.ts`
- `scripts/harness/__tests__/unit/nyquist-validation/story-mapping.test.ts`

## 4. 前提条件
- `StoryRegistryPort` が実装されていること（TraceabilityModelStoryRegistryAdapter）
- `docs/contracts/requirement-test-matrix.schema.json` が存在すること
- ajvでのJSONスキーマバリデーションが実行可能であること
