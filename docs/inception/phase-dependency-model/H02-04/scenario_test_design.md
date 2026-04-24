# シナリオテスト設計: H02-04 `@work-item-id` アノテーション併存対応

@story-id H02-04
設計要素: parser 単体拡張のためシナリオ E2E テストは対象外。手動検証シナリオ S-1〜S-4 を定義しユニットテスト（UT-PD-153〜157）に落とし込む。

- **対応ストーリー**: H02-04
- **Unit**: phase-dependency-model
- **作成日**: 2026-04-24

## 1. シナリオテスト対象

本ストーリーは `FileSystemStoryReflectionAdapter` 単一クラスの parser 拡張であり、UI を伴わないため **シナリオテスト（E2E）は対象外**。既存の IT テスト（`scripts/harness/__tests__/integration/phase-dependency-model/`）も、検査対象が reflection フロー全体のため、parser 単体の挙動はユニットテストで十分に担保できる。

## 2. 代替: 手動検証シナリオ

本ストーリーの実装後、以下を手動で確認することで後方互換性を確信できる:

### S-1: 既存 `@story-id` の検出が退行していないこと
1. `npm run test -- file-system-story-reflection-adapter.test` を実行
2. 既存 3 テストケース（`@story-id US-001` 単一 / `@story-id US-001, US-002, US-003` カンマ区切り / HTML コメント形式）が全て green であること

### S-2: `@work-item-id` の新規検出
1. 一時ディレクトリで `docs/product/construction/order/logical_design.md` に `<!-- @work-item-id WI-001 -->` を書く
2. `adapter.fileContainsStoryAnnotation(path, 'WI-001')` が `true` を返す
3. `adapter.fileContainsStoryAnnotation(path, 'WI-999')` が `false` を返す

### S-3: `@issue-id` の新規検出
1. `docs/product/construction/order/logical_design.md` に `@issue-id ISSUE-026` を書く
2. `adapter.fileContainsStoryAnnotation(path, 'ISSUE-026')` が `true` を返す

### S-4: 混在シナリオ
1. 1 ファイル内に `@story-id H02-04` と `@work-item-id WI-001` を両方記述
2. いずれの ID も検出できる
3. 検出はアノテーション種別をまたいで独立に機能する

## 3. 正式な検証

これらのシナリオは全てユニットテスト（`file-system-story-reflection-adapter.test.ts`）に AC として落とし込み、回帰網に組み込む。手動検証は実装完了後の spot-check に留める。
