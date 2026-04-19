---
traceability:
  initial_creation: true
---

# 論理設計: <Unit名>

> **対応ストーリー**: <HXX-XX, HYY-YY>
> **作成日**: <YYYY-MM-DD>
> **Unit**: <UNIT_NAME>

---

## 概要

<このUnitが解決するビジネス課題を 2〜3 行で記述>

---

## ドメインモデル

@story-id <HXX-XX>
### <集約 / エンティティ / 値オブジェクト名>

<不変条件・責務・関連の説明>

---

## ユースケース

@story-id <HXX-XX>
### UC-001: <ユースケース名>

**As a** <役割>
**I want to** <達成したいこと>
**So that** <得られる価値>

#### 事前条件
- <前提>

#### 基本フロー
1. <ステップ>

#### 例外フロー
- <エラーケース>

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

これらは `MetadataValidator.validateDesignDocument` で検証され、
ISSUE-008 Phase B-2 / B-3 以降は `npx phasegate validate-metadata` / pre-commit で自動チェックされる。
