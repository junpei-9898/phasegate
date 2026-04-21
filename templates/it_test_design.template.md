---
traceability:
  initial_creation: true
---

# IT（Integration）テスト設計: {{unit}}

> **対応ストーリー**: <HXX-XX, HYY-YY>
> **作成日**: <YYYY-MM-DD>
> **Unit**: {{unit}}

---

## 結合スコープ

- TODO: 結合対象（UseCase + Repository、Handler + UseCase など）
- TODO: 外部依存（DB / API / FileSystem）の扱い

---

## テストケース一覧

@story-id <HXX-XX>
### IT-{{unit}}-001: <ケース名>

**対象**: TODO: 結合対象
**Arrange**: TODO: テンポラリ環境／フィクスチャ
**Act**: TODO: 実行する操作
**Assert**: TODO: 検証内容
**副作用検証**: TODO: 書き込み/ログ等の副作用確認

---

## テスト環境

- テンポラリディレクトリ: `fs.mkdtemp` ベース
- ネットワーク: 禁止（外部 API は fake/stub）
- クリーンアップ: afterEach で確実に破棄
