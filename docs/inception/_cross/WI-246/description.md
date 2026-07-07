---
id: WI-246
type: feature
severity: normal
status: tested
affects: [phase-dependency-model]
---

# WI-246: 反映ゲートの layer-aware 化（source-touch 代理による domain_model 反映要求の条件化）

> 起票日: 2026-07-08
> 経緯: cross-WI の `domain_model.md` 反映要求は、WI が対象 unit の domain 層を一切変更していない場合でも発火する。ci-governance では 11 件、phase-dependency-model では 2 件の「反映すべきドメイン概念変更が存在しないのに domain_model.md への `@work-item-id` タグを要求する」false positive が pre-tool-use hook のソース編集ブロックとして固着していた。発火しないよう凍結・grandfather されたゲートは防御ではない。false positive の除去によりゲートを正直に再稼働させる。

## 背景

`StoryReflectionChecker` は cross-WI に対して `affects` 宣言（自己申告）のみを根拠に、`logical_design.md` と `domain_model.md` の両方への反映を一律要求する。しかし:

- `logical_design.md` は unit 全体（全レイヤー）の設計を写像するため、unit に影響した WI は常に反映すべき内容を持つ → **無条件要求は正当**
- `domain_model.md` は domain 層の概念・不変条件のみを写像するため、infrastructure/application/presentation のみを変更した WI には**反映すべき内容が存在しない** → 無条件要求はタグ捏造の圧力（反ロンダリング原則違反）を生む

また `affects:` キーが frontmatter に存在しない cross-WI は現行実装で「全 unit に影響」と解釈される（暗黙の over-reach）。

## 設計判断（承認済み・再審議不要）

1. **layer-aware ルール**: cross-WI の `domain_model.md` 反映要求は、その WI が実際に `scripts/harness/{unit}/domain/` 配下のソースファイルを変更した場合のみ発火する。`logical_design.md` 反映要求は無条件に維持。
2. **source-touch の機械検証**: 判定は自己申告（affects / 注釈）ではなく git コミット履歴で行う。`.husky/commit-msg` が全コミットに `Work-Item: WI-NNN` trailer を強制しているため、`git log --grep` で WI のコミット集合と変更ファイルパスを機械的に取得できる（履歴は追記のみで洗浄不能）。
3. **判定不能時は「touch なし」**: trailer を持つコミットが存在しない WI（trailer 強制以前の歴史的 WI）は「domain 層を触れていない」として扱う。この方向は要求の**除去のみ**に作用し、新規ブロックを生まない。将来の WI は trailer 強制により必ず判定可能。
4. **affects 空/未定義 = 影響なし（skip）**: frontmatter に `affects:` キーが無い・または空リストの cross-WI はどの unit にも反映要求を発火しない（現行の「全 unit に影響」の罠を修正）。現コーパスで挙動が変わる WI は 0 件（WI-242/244/245 が affects キーなしだが、いずれも description.md のみで反映要求は元々発火しない — 2026-07-08 再検証済み）。
5. **preset デフォルト（`full-story-reflection-defaults.ts`）は変更しない**。domain_model 判定は mapping の product パス末尾（`domain_model.md`）で行う。

## 作業内容

1. `scripts/harness/phase-dependency-model/domain/ports/story-reflection-file-system-port.ts` — port に `storyTouchesUnitLayer(storyId, unitId, layer)` を追加
2. `scripts/harness/phase-dependency-model/domain/services/story-reflection-checker.ts` — cross-WI × domain_model mapping のときのみ source-touch ガードを適用
3. `scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts` — git 履歴ベースの touch 判定実装 + `storyAffectsUnit` の affects 未定義=skip 修正
4. TDD テスト 4 種（anti-gutting guard / infra-only skip / affects 空 skip / 実コーパス回帰 baseline pin）
5. blast radius 実測: 変更は要求の除去のみ（追加 0・新規ブロック 0・green→red 反転 0）

## Acceptance Criteria

- AC-1: domain 層ソースを変更した cross-WI は、引き続き対象 unit の product `domain_model.md` への `@work-item-id` 反映を要求される（ゲートの骨抜き防止）
- AC-2: domain 層を変更していない cross-WI は `domain_model.md` 反映を要求されない。`logical_design.md` 反映要求は維持される
- AC-3: `affects:` が空/未定義の cross-WI はどの unit にも反映要求を発火しない
- AC-4: 実コーパス（docs/inception/**）に対する blocking violations は変更前の honest baseline を超えない（回帰テストで pin）
