# シナリオテスト設計: H08-02 — L3 security+performanceバリデータ

> **Unit ID**: validator-system
> **ストーリーID**: H08-02
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

L3 securityバリデータ（L3-001）およびL3 performanceバリデータ（L3-002）の実行機能。

- ハードコードされた秘密情報（APIキー、パスワード等）の検出
- SQLインジェクションパターンの検出
- ループ内awaitの検出
- N+1クエリパターンの検出
- bundleSizeLimit（strictプリセットのみ）の検証
- 各ルール違反時のHarnessError（L3-001/L3-002）に `adr_ref` + `fix_example` を含める

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-VS-02-001 | L3バリデータ実行でハードコード秘密情報なしの場合 | セキュリティパターンなしのソースコード | passed=true、errors=[] |
| SC-VS-02-002 | APIキーがハードコードされたコードを検出する場合 | APIキーを含むソースコードパス | passed=false、HarnessError(L3-001)含む |
| SC-VS-02-003 | ループ内awaitパターンを検出する場合 | for-awaitパターンを含むソースコード | passed=false、HarnessError(L3-002)含む |
| SC-VS-02-004 | N+1クエリパターンを検出する場合 | ループ内DBアクセスパターンを含むコード | passed=false、HarnessError(L3-002)含む |
| SC-VS-02-005 | strictプリセット時にbundleSizeLimitを検証する場合 | preset='strict', バンドルサイズ超過 | passed=false、HarnessError(L3-001)含む |
| SC-VS-02-006 | standardプリセット時にbundleSizeLimitをスキップする場合 | preset='standard' | bundleSizeLimitチェックなし、passed=true |

## 3. テスト配置
- `scripts/harness/__tests__/integration/validator-system/usecases/run-l3-validators-usecase.test.ts`
- `scripts/harness/__tests__/integration/validator-system/adapters/` 配下のセキュリティ・パフォーマンスアダプタテスト

## 4. 前提条件
- `SecurityPatternScannerPort` が実装されていること（FileSystemSecurityPatternScannerAdapter）
- `PerformanceScannerPort` が実装されていること（AstPerformanceScannerAdapter）
- `HarnessConfigV2` からPreset情報が取得可能であること
