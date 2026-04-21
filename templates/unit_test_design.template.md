---
traceability:
  initial_creation: true
---

# Unit テスト設計: {{unit}}

> **対応ストーリー**: <HXX-XX, HYY-YY>
> **作成日**: <YYYY-MM-DD>
> **Unit**: {{unit}}

---

## テストケース一覧

@story-id <HXX-XX>
### UT-{{unit}}-001: <ケース名>

**対象**: TODO: target クラス/関数
**Arrange**: TODO: 前提条件セットアップ
**Act**: TODO: 実行する操作
**Assert**: TODO: 検証内容
**期待結果**: TODO: 期待値

---

## カバレッジ方針

- 分岐カバレッジ 90% 以上
- ドメイン層のモック禁止
- 値オブジェクトの不変条件は個別にテスト

---

## テスト命名規約

- ケース名: 日本語で記述
- ファイル名: kebab-case（例: `user-entity.test.ts`）
- AAA パターン準拠
