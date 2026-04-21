---
traceability:
  initial_creation: true
---

# 論理設計: {{unit}}

> **対応ストーリー**: <HXX-XX, HYY-YY>
> **作成日**: <YYYY-MM-DD>
> **Unit**: {{unit}}

---

## 概要

TODO: Unit `{{unit}}` が解決するビジネス課題を 2〜3 行で記述

---

## ドメインモデル

@story-id <HXX-XX>
### <集約 / エンティティ / 値オブジェクト名>

TODO: 不変条件・責務・関連の説明

---

## ユースケース

@story-id <HXX-XX>
### UC-001: <ユースケース名>

**As a** <役割>
**I want to** <達成したいこと>
**So that** <得られる価値>

#### 事前条件
- TODO: 前提

#### 基本フロー
1. TODO: ステップ

#### 例外フロー
- TODO: エラーケース

---

## 層構成（Clean Architecture）

```
domain/          : Entity / ValueObject / Port / Domain Service
application/     : UseCase / DTO
infrastructure/  : Gateway / Adapter
presentation/    : CLI Handler / Controller
```

---

## トレーサビリティメタデータの使い方

このテンプレートが emit する 2 種類のメタデータ:

### 1. YAML frontmatter (`initial_creation: true`)
- 文書の**新規作成時のみ**付与する
- `@story-id` インライン注釈が必須であることを示すフラグ
- 2 回目以降の改訂では frontmatter を削除（または `false` に変更）して構わない

### 2. `@story-id` インライン注釈
- ユーザーストーリーに紐づく設計要素の**直前に独立行で記述**
- 形式: `@story-id HXX-XX`
- ルール:
  - 独立行（他のテキストと混在させない）
  - 直後に設計要素（空行を挟まない）
  - `HXX-XX` は `docs/product/user_stories.md` に存在する ID
  - 複数ストーリー時は連続並列で並べ、最後の直後に設計要素
