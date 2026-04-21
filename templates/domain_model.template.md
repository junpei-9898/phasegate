---
traceability:
  initial_creation: true
---

# ドメインモデル: {{unit}}

> **対応ストーリー**: <HXX-XX, HYY-YY>
> **作成日**: <YYYY-MM-DD>
> **Unit**: {{unit}}

---

## 集約 / エンティティ / 値オブジェクト

@story-id <HXX-XX>
### <集約名>

**責務**: TODO: この集約が持つ責務

**不変条件**:
- TODO: 不変条件 1
- TODO: 不変条件 2

**関連**:
- TODO: 他集約・エンティティへの参照

---

## ドメインサービス

@story-id <HXX-XX>
### <ドメインサービス名>

**責務**: TODO: このサービスが担う domain ロジック

**入出力**:
- 入力: TODO
- 出力: TODO

---

## ポート（依存反転インタフェース）

@story-id <HXX-XX>
### <Port 名>

**役割**: TODO: domain が infrastructure に求める契約

**メソッド**:
- `methodName(arg: Type): ReturnType` — TODO
