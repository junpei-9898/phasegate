---
id: WI-251
type: story
severity: normal
status: reflected
affects: [phase-dependency-model]
---

# WI-251: story-reflection ゲートのバッチコミット帰属精緻化（file-tag-scoped attribution）

> 起票日: 2026-07-10
> 経緯: WI-246 で story-reflection ゲートは layer-aware 化された。cross-WI の `domain_model.md` 反映要求は `FileSystemStoryReflectionAdapter.storyTouchesUnitLayer(storyId, unitId, layer)` が「`Work-Item: WI-NNN` trailer を持つコミットが `scripts/harness/{unit}/{layer}/` を触ったか」で条件化される。しかし複数 WI trailer を同梱するバッチコミット（例 `9044fbe`、WI-117/118/122/123/124/125/127/128/129/130/131/139 の 12 trailer）では、全 changed files が全 trailer WI に帰属してしまう。その結果、実際には WI-117/118/139 が所有する validator-system の domain ファイル（`consistency-check-service.ts`=WI-118, `drift-detection-service.ts`=WI-117, `semantic-drift-service.ts`=WI-139 等、各ファイル先頭の `@work-item-id` タグで確認可能）を根拠に、domain 層を一切書いていない WI-122/124/125/128/131 が「validator-system の domain を触った」と誤判定される。これにより domain_model.md 反映を強要される false-positive 違反が 12 件 validator-system に固着し（返済すると帰属捏造になるため返済不能）、別 WI（WI-248）のソース書き込みをブロックしている。

## 背景

WI-246 の source-touch 判定は「WI に紐付くコミットの changed paths 全体」を帰属集合とする。単一 WI trailer のコミットではこれは正しい（そのコミットの全変更はその WI の作業）。だが `.husky/commit-msg` は複数 `Work-Item:` trailer を許容するため、複数 WI をまとめたバッチコミットでは changed paths と WI の対応が失われ、帰属が過剰（over-attribution）になる。

各ソースファイル先頭には `@work-item-id WI-NNN`（`/` 区切りの複数指定あり）または `@story WI-NNN` 形式の帰属アノテーションが（追記のみで洗浄困難な形で）存在する。これを用いて、バッチコミットの changed path を「そのファイルが実際に帰属を主張する WI」へ絞り込める。

## 設計判断（承認済み・再審議不要）

1. **単一 trailer コミット**: 現行どおり全 changed paths を帰属（変更なし）。
2. **複数 trailer コミット**: `scripts/harness/{unit}/{layer}/` 配下の changed path について、そのファイルの**現在の内容（HEAD）**に帰属アノテーション（`@work-item-id WI-NNN` / `@story WI-NNN`）が存在するなら、`storyId` がそのファイルのタグ集合に含まれる場合のみ帰属する。
3. **fail-closed フォールバック**: ファイルにタグが無い / ファイルが既に削除されて読めない / 判定不能 → 帰属あり扱い（= 反映要求を維持）。ゲートを甘くする方向の不確実性を許さない。
4. **blast radius は除去のみ**: 帰属は狭まる方向にしか動かない設計であり、この変更で新規違反（added）が増えてはならない。テストと実測で実証する。

`storyTouchesUnitLayer` の port シグネチャは変更しない。精緻化は adapter 内部の changed-paths 帰属ロジック（`extractChangedPathsForStory`）に閉じる。checker / preset デフォルト（`full-story-reflection-defaults.ts`）は不変。

## 作業内容

1. `scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts` — `extractChangedPathsForStory` に、複数 trailer コミット × `scripts/harness/*/{layer}/` 配下パスに対する file-tag-scoped 帰属フィルタを追加。ファイル内容（HEAD）の `@work-item-id` / `@story` タグ集合に `storyId` が含まれるときのみ帰属、タグ無し/読めない場合は fail-closed で帰属維持。
2. TDD テスト（実 git fixture repo で adapter の帰属を検証）: (a) 複数 trailer × 他 WI タグのみのファイル → touch なし, (b) タグに自 WI を含む → touch あり, (c) タグ無しファイル → touch あり（fail-closed）, (d) 単一 trailer → 現行どおり帰属。
3. blast radius 実測: 全 unit の blocking violations を before/after でスナップショットし added=0 を機械的に確認。removed リストを記録。

## Acceptance Criteria

- AC-1: 複数 trailer コミットが触った `scripts/harness/{unit}/domain/` 配下ファイルは、そのファイルの `@work-item-id`/`@story` タグに含まれる WI にのみ source-touch 帰属される。
- AC-2: タグを持たない（または読めない）ファイルは fail-closed で帰属維持され、反映要求が緩まない。
- AC-3: 単一 trailer コミットの帰属挙動は WI-246 から変わらない。
- AC-4: 実コーパス（docs/inception/**）に対する blocking violations は、変更前の集合の部分集合（added=0）である。
