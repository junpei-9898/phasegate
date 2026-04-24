# ドメインモデル: H02-04 `@work-item-id` アノテーション併存対応

@story-id H02-04
設計要素: domain モデル追加なし（infrastructure 層単体の parser 振る舞い拡張）。port signature は据え置き。

- **対応ストーリー**: H02-04
- **Unit**: phase-dependency-model
- **作成日**: 2026-04-24

## 1. ドメイン観点での位置付け

本ストーリーは **infrastructure レイヤー単独の振る舞い変更**であり、domain モデルそのものへの追加・変更は発生しない。

- `StoryReflectionChecker`（domain/services）は `StoryReflectionFileSystemPort` の `fileContainsStoryAnnotation(productPath, storyId)` を呼び出すのみ
- port の signature は据え置きのため、domain 側のコントラクトは変化しない
- `StoryReflectionConfig` / `StoryReflectionMapping` / `StoryReflectionResult` 等の value object 群も無影響

## 2. 意味論の拡張（実装詳細としての）

`fileContainsStoryAnnotation` が検出する「アノテーション」の定義を以下に拡張する:

```
annotation := ("@story-id" | "@issue-id" | "@work-item-id") WS+ idList
idList     := id ((WS | ",")+ id)*
id         := [A-Za-z0-9_-]+   // 例: US-001, H02-04, ISSUE-026, WI-026
```

- 大文字小文字は既存挙動に倣って **case-sensitive**
- 同一行に複数アノテーション種別が混在しても、それぞれ独立に抽出できること
- HTML コメント終端 `-->` の除去ルールは既存通り維持

この拡張は domain では表現されず、adapter 内部の実装詳細に留まる。

## 3. 後方互換性の扱い

- 既存の domain model（`StoryReflectionViolation` 等）は `storyId` をそのまま保持する
- ID 種別（`US-XXX` / `H02-XX` / `ISSUE-XXX` / `WI-XXX`）による区別は本ストーリーでは行わない
- ID 種別ごとの振る舞い差異が必要になった時点で、別ストーリーで value object を導入する（本ストーリー非対象）
