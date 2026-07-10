# WI-251 論理設計: バッチコミット帰属の file-tag-scoped 精緻化

## 1. 変更対象

| ファイル | レイヤー | 変更内容 |
|---|---|---|
| `infrastructure/filesystem/file-system-story-reflection-adapter.ts` | infrastructure | `extractChangedPathsForStory` に file-tag-scoped 帰属フィルタを追加。複数 trailer コミット × `scripts/harness/*/{layer}/` 配下の changed path を、ファイル内容の `@work-item-id`/`@story` タグで絞り込む |

port（`story-reflection-file-system-port.ts`）・checker（`story-reflection-checker.ts`）・preset デフォルト（`full-story-reflection-defaults.ts`）は変更しない。`storyTouchesUnitLayer` のシグネチャ・意味論は不変で、内部の changed-paths 集合の算出精度のみを上げる。

## 2. 現行帰属ロジック（WI-246）

`fetchChangedPathsForStory(storyId)`:
```
git log --format=@@COMMIT@@\0%B\0 --name-only --grep "Work-Item:.*\bstoryId\b"
→ extractChangedPathsForStory(output, storyId):
    各 commitBlock について:
      body に Work-Item:.*\bstoryId\b が含まれる → 全 name-only パスを changedPaths に追加
```
バッチコミットでは body に複数 WI trailer があり storyId でマッチするため、そのコミットの全 changed paths が storyId に帰属してしまう（over-attribution）。

## 3. 精緻化ロジック（WI-251）

`extractChangedPathsForStory` の各 commitBlock について:

```
trailerWorkItems = body 内の Work-Item: 行から抽出した WI 集合
isMultiWorkItemCommit = trailerWorkItems.size >= 2

各 changedPath について:
  if not isMultiWorkItemCommit:
    帰属する（現行どおり）
  else if changedPath が scripts/harness/{unit}/{layer}/ 配下でない:
    帰属する（絞り込み対象外。判定は harness ソースパスに限定）
  else:
    tags = ファイル内容（rootDir/changedPath, HEAD）から抽出した @work-item-id / @story の WI 集合
    if tags が取得不能（ファイルが読めない/削除済み） または tags が空:
      帰属する（fail-closed）
    else:
      storyId ∈ tags のときのみ帰属する
```

- **絞り込みは `scripts/harness/{何らかの unit}/{layer}/` 配下のパスに限定**する。ドキュメント・fixture・設定等の非ソースパスは従来どおり無条件帰属（`storyTouchesUnitLayer` の prefix 判定は最終的に `scripts/harness/{unitId}/{layer}/` で行うため、非ソースパスの帰属有無は touch 結果に影響しないが、余計な file IO を避けるためソースパスのみタグ検査する）。
- **タグ抽出書式**: 行コメント/ブロックコメント両対応。`@work-item-id` と `@story` の直後に空白区切り・`/` 区切り・カンマ区切りで列挙される `WI-\d+` を集合化する。単語境界を守り WI-24 が WI-246 に誤マッチしないこと（既存 `storyTouchesUnitLayer` の trailer 判定と同じ厳密さ）。
- **HEAD 内容を使う**: git 履歴の当時の内容ではなく現在の内容を読む。所有 WI の帰属は最新のタグ状態で判断する（洗浄防止の観点で、タグは追記のみで消しづらい）。ファイルが HEAD で削除されている場合は読めず → fail-closed で帰属維持。
- **キャッシュ**: 既存の `changedPathsByStoryId`（storyId → Promise<Set>）構造は維持する。粒度変更は不要（帰属フィルタは storyId 依存なので既存キー粒度で正しくキャッシュされる）。ファイル内容読み取りが storyId をまたいで重複するが、コーパス規模では許容（必要なら将来 path→tags のメモ化を追加、本 WI では非対象）。

## 4. 単調性（monotonicity）保証

新ロジックは、複数 trailer コミット × ソースパス × タグ集合に自 WI を含まないファイルについてのみ帰属を**除去**する。それ以外（単一 trailer / 非ソースパス / タグ無し / タグに自 WI 含む / 読めない）はすべて現行と同じく帰属する。したがって任意の (storyId) の changedPaths 集合は現行の部分集合であり、`storyTouchesUnitLayer` の結果は true→false 方向にしか変わらない。よって violation 集合も部分集合となり added=0 が保証される（テストで実証）。

## 5. テスト設計（TDD — RED 先行）

adapter テスト（実 git fixture repo を tmp に生成。ドメイン層モック禁止規約に非抵触 — infrastructure adapter を実 git 相手に検証）。新規テストファイル `scripts/harness/__tests__/integration/phase-dependency-model/file-system-story-reflection-adapter-batch-attribution.it.test.ts`:

| # | ケース名（日本語） | Arrange | Assert |
|---|---|---|---|
| T1 | 複数WI trailerコミットで他WIタグのみのdomainファイルは自WIに帰属しない | 2 WI trailer コミット、domain ファイルに他 WI のみのタグ | storyTouchesUnitLayer(自WI, unit, "domain") = false |
| T2 | 複数WI trailerコミットで自WIタグを含むdomainファイルは帰属する | 同上、ファイルタグに自 WI を含む | storyTouchesUnitLayer(自WI, unit, "domain") = true |
| T3 | 複数WI trailerコミットでタグ無しdomainファイルはfail-closedで帰属する | 同上、ファイルにタグ無し | storyTouchesUnitLayer(自WI, unit, "domain") = true |
| T4 | 単一WI trailerコミットは従来どおり全changed pathを帰属する | 1 WI trailer コミット、他 WI タグのファイル | storyTouchesUnitLayer(自WI, unit, "domain") = true |

実コーパス回帰: 既存 `story-reflection-corpus.it.test.ts`（subset 判定）が green を維持（帰属は狭まる方向のため violation は減少のみ）。fixture は編集しない。

## 6. blast radius 実測手順

リポジトリ外 tsx スクリプトで、`docs/product/construction/` 配下の全 unit について現行 adapter / 新 adapter の blocking violations を before/after スナップショットし、`added=0`（新規要求 0）を機械的に確認する。removed（unit × WI × 文書）の一覧を最終報告に記録する。
