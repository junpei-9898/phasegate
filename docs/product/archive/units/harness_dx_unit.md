# Unit定義: harness-dx

> **Unit ID**: harness-dx
> **作成日**: 2026-03-10
> **Wave**: 3（拡張機能）
> **対応Epic**: E-10 HarnessError拡充・AGENTS.md改善

---

## 1. 概要

ハーネスの開発者体験（DX）を向上させるUnit。全バリデータのHarnessErrorにADR参照と修正コード例を統一付与し、AGENTS.mdを記述的情報からポインタ型（コマンド実行方式）に移行する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-034 | 全バリデータHarnessErrorのADR参照+修正コード例統一付与 | Must |
| US-035 | AGENTS.mdのポインタ型移行 | Must |

---

## 3. 機能要件

### 3.1 HarnessErrorフォーマット拡充

- 全バリデータ（8+3）のHarnessErrorに`adr_ref`フィールド付与
- 全バリデータのHarnessErrorに`fix_example`フィールド付与
- 統一構造: `{ code, severity, suggestion, adr_ref, fix_example }`
- 各バリデータのHarnessError出力テスト更新

### 3.2 AGENTS.mdポインタ型移行

- バリデータ一覧を`harness:status`実行へのポインタに置換
- ADR参照リンク追加
- AGENTS.mdサイズ削減
- ポインタ参照先の実在性検証

---

## 4. データモデル概要

- **HarnessError**: `{ code: string, severity: "error"|"warning", suggestion: string, adr_ref: string, fix_example: string }`
- **AGENTS.md**: ポインタ型構造（コマンド参照 + ADRリンク）

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| adr-documentation | データ | ADRファイル群（adr_refの参照先） |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| データ型 | HarnessError統一フォーマット | 全Unit（バリデータ出力） |
| ドキュメント | AGENTS.md（ポインタ型） | 外部利用者（AIエージェント） |
