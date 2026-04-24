---
id: WI-026
type: issue
severity: high
status: implemented
legacy_id: ISSUE-026
affects: [phase-dependency-model, agent-integration, traceability-model, validator-system, config-foundation, docs]
---

# ISSUE-026: inception の work item 表現が多系統併存しており、product 反映ゲートが機能不全を起こしている

@story-id H02-04
概要: ISSUE-026 の方針（work item taxonomy 一本化、WI-XXX）を Phase A〜D で段階導入する。本 issue が上位駆動文書、初期子タスクは H02-04（Phase A-1 parser 併存対応）。

## ステータス

- **状態**: 🔴 OPEN（2026-04-24 方針確定: work item 一本化採用）
- **起票日**: 2026-04-24
- **発見契機**: PhaseGate 自身の Codex ドッグフーディング中に、`docs/inception/issues/ISSUE-025/` を作成して設計を進めたあと、対応する `docs/product/construction/{unit}/` の更新を行わずに実装へ進められた
- **影響Unit**: phase-dependency-model, agent-integration, traceability-model, validator-system, config-foundation, docs
- **深刻度**: High
- **優先度**: P1

## 問題の概要

現状の PhaseGate は、`docs/inception/` 配下に **3 系統の work item 表現**が共存している:

1. `docs/inception/{unit}/{US-XXX}/` — Unit-scoped story
2. `docs/inception/{unit}/issues/{ISSUE-XXX}/` — Unit-scoped issue
3. `docs/inception/issues/{ISSUE-XXX}/` — Cross-unit issue

この 3 系統のうち **実装ブロックゲートが機能しているのは (1) US のみ**で、(2)(3) の issue 経路は以下の穴を生んでいる:

| 経路 | gate 発火 | 列挙対象 | 結果 |
|------|----------|---------|------|
| (1) `{unit}/{US-XXX}/` | Level 3 で fire | `US-XXX` が直下として列挙される | product 未反映で block ✅ |
| (2) `{unit}/issues/{ISSUE-XXX}/` | Level 3 で fire | `issues` 名までしか列挙されず中の `ISSUE-XXX` は素通り | 素通り ❌ |
| (3) `issues/{ISSUE-XXX}/` | Level 1 → reflection check は Level 3 のみ fire | - | 素通り ❌ |

さらに、**US にならない細かな修正**（typo・依存更新・軽微な refactor）を issue 経路で起票する運用が、上記ゲート穴と合流して、統一的な証跡管理と意思決定の可視化を困難にしている。

## なぜ問題か

### 1. product docs ハブモデルが崩れる

`docs/folder_management_rules.md` は `product/construction/{unit}/` を Unit の真実のソースとして維持することを前提としているが、inception だけ更新されて product が未更新のまま実装が進むと、実装が参照すべき正式設計と一時設計が乖離する。

### 2. taxonomy の fragmentation が根本原因

US / unit-scoped issue / cross-unit issue の 3 系統を **場所（ディレクトリ構造）で表現**しているため、PhaseGate はそれぞれ別のコードパスで扱わざるを得ず、機能差 ((1) のみ gate が効く) が生じている。本質的には「inception 上の work item」という 1 概念であり、違いは **種類 / 影響範囲 / severity** というメタデータのはずである。

### 3. US にならない小さな修正の扱いが未定義

typo 修正・依存更新・軽微な refactor など「直接ユーザー価値が届かない変更」を formal な US として起票するのは過剰だが、全く証跡を残さないと後から意思決定を追えない。現状は `quick-implementor` と `inception/issues/` 頼みで、両者とも上記ゲート穴に同居している。

## 現状の技術的ギャップ（コードレベル）

### 1. issue ディレクトリが story reflection の列挙対象に含まれない

`FileSystemStoryReflectionAdapter#listStoryDirectories()`（`file-system-story-reflection-adapter.ts:34-49`）は `docs/inception/{unit}/` 直下のディレクトリのみを列挙する。`issues/` 配下の `ISSUE-XXX` は enumerate されず、`docs/inception/{unit}/issues/{ISSUE-XXX}/logical_design.md` を作成しても反映チェックに乗らない。

### 2. 横断 issue は Level 1 扱いで reflection 対象外

`WriteTargetScope.fromPath`（`write-target-scope.ts:81-83`）は `docs/inception/issues/{ISSUE-XXX}/` を Level 1 と判定し、`handle-pre-tool-use-usecase.ts:297` の `resolveStoryReflectionScope` は Level 3 のみ通すため、そもそも reflection check が fire しない。

### 3. 「@story-id がある」ことと「内容が反映された」ことが同一視されている

`fileContainsStoryAnnotation` は product 文書内の `@story-id` 出現を regex で確認するだけで、inception 側の設計カテゴリ文書の内容が実際に product に累積されたかは検証していない。

## 採用方針: work item (WI) 一本化

本 issue は **ゲートのバグ修正にとどまらず、work item taxonomy の統一**を採用する。US / ISSUE という名前空間を廃止し、`WI-XXX` に一本化する。

### 物理レイアウト

```
docs/inception/
├── {unit}/                      # 特定 Unit 所有の WI
│   └── {WI-XXX}/
│       ├── description.md       # 全 type 共通・必須（frontmatter 付き）
│       ├── logical_design.md    # type: story/issue/refactor 必須
│       ├── domain_model.md      # type: story/issue 必須
│       └── ...
├── _cross/                      # 所有 Unit が定まらない cross-cutting WI
│   └── {WI-XXX}/
└── _shared/                     # 従来通り（非 WI の横断計画）
```

- `docs/inception/issues/` と `docs/inception/{unit}/issues/` は **廃止**
- 既存 `US-XXX` / `ISSUE-XXX` は `WI-XXX` へリナンバリング（移行期間中は `legacy_id` で旧 ID を retain）

### WI frontmatter スキーマ

各 WI の `description.md` 先頭に以下の frontmatter を必須とする:

```yaml
---
id: WI-026
type: story | issue | fix | refactor | chore
affects: [phase-dependency-model, agent-integration]   # cross-unit のみ列挙。省略時は所有 Unit のみ
severity: trivial | normal | high
status: drafted | reflected | implemented | tested     # PhaseGate が自動更新
source: github#123 | slack | internal                  # 任意: 外部報告源
legacy_id: ISSUE-026                                   # 任意: 移行用エイリアス
---
```

### type による要求成果物の段階化

| type | 必要 inception 成果物 | 必要 product 反映 | PhaseGate 要件 |
|------|---------------------|-------------------|---------------|
| `story` | description + logical_design + domain_model + test 設計 (+ UIUX) | 全カテゴリ累積 | 既存 US gate 相当 |
| `issue` | description + logical_design + domain_model + 関係 test 設計 | 関係カテゴリ累積 | story と同等 |
| `refactor` | description + logical_design（構造変更の意図） | logical_design 更新 | 軽量 gate |
| `fix` | description.md + PR link | 関係カテゴリに `@work-item-id` 追記 | description + PR trailer |
| `chore` | description.md 1 行 + PR link | 不要 | description + PR trailer |

**これにより「US にならない修正」も `type: fix | chore` として同じ体系で起票・追跡可能になる。**

### アノテーション規約

- product 文書での反映宣言は **`@work-item-id WI-XXX`** に統一
- 移行期間中は `@story-id US-XXX` / `@issue-id ISSUE-XXX` を legacy として accept（`legacy_id` 経由で解決）
- ソースコード・テストの任意メタは `// @work-item-id WI-XXX`
- commit trailer は `Work-Item: WI-XXX`（`git log --grep='Work-Item: WI-026'` で一撃引き）

### cross-unit WI の扱い

- `_cross/{WI-XXX}/` 配下に置き、`affects` を必須にする
- `affects` に列挙された **全 Unit の construction 文書**に `@work-item-id` 反映が無ければ、いずれの Unit への Level 3 実装もブロック
- `type: story` かつ `_cross/` の場合は Level 1 product 文書（`product_overview.md` / `user_stories.md` 等）への反映も必要

### legacy 互換の判断（2026-04-25）

ISSUE-026の完了条件では、旧 `docs/inception/issues/` / `{unit}/issues/` の物理レイアウトは廃止する。一方で、既存product文書に残る `@story-id` / `@issue-id` は、`WI-*` の `legacy_id` 経由で読み替える移行互換として維持する。

理由は、product文書の全アノテーションを一括置換すると履歴上の対応関係が読みにくくなり、既存US/H系ストーリーとの接続も壊しやすいためである。新規文書・新規実装では `@work-item-id WI-XXX` と `Work-Item: WI-XXX` を正とし、legacy annotationは既存資産の読み取り互換に限定する。

## フェーズごとのあるべき振る舞い (WI model)

### 共通前提

`WriteTargetScope.fromPath` は `docs/inception/{unit}/{WI-XXX}/` と `docs/inception/_cross/{WI-XXX}/` のいずれも **Level 3 + workItemId** として扱う。reflection check の列挙は `{unit}/` 直下のみでなく `_cross/` も走査する（`{unit}/issues/` と `docs/inception/issues/` の特殊分岐は削除）。

### Phase 0 — Product / 横断仕様

**対象**: `docs/product/product_overview.md` / `user_stories.md` / `user_story_mapping.md` / `units/*.md`

`_cross/{WI-XXX}/` かつ `type: story | issue` の WI について、戦略・スコープ・Unit 境界への影響があれば、上記いずれかに `@work-item-id WI-XXX` の反映が必要。未反映なら `affects` に列挙された全 Unit への Level 2/3 書き込みをブロック。

### Phase 1 — Inception（下書き・探索）

- WI ディレクトリ作成と `description.md` 編集は自由
- 設計カテゴリ文書（`logical_design.md` 等）が新規作成・実質更新された時点で「反映義務フラグ」が立つ（`status: drafted`）
- `type: fix | chore` は description.md のみで完結するため、反映義務は product の該当カテゴリへの `@work-item-id` 追記（`fix`）または不要（`chore`）
- `npm run phasegate:status` は未反映 WI と要求成果物を一覧表示

### Phase 2 — Product Construction（確定設計の累積）

**Unit 所有 WI**:
- inception の設計カテゴリ文書と同カテゴリの `docs/product/construction/{unit}/{category}.md` が `@work-item-id WI-XXX` を含み、かつ実質 diff を伴う（mtime 比較 + 空アノテーションのみ追加でない）

**cross-unit WI (`_cross/`)**:
- `affects` 全 Unit について上記を満たす
- `type: story` なら加えて Level 1 product 文書への反映も必要

Phase 2 が未完のまま Phase 3 に進むことをブロック。これが本 issue のコア要件。

### Phase 3 — Implementation (TDD)

**対象**: `scripts/harness/{unit}/(domain|application|infrastructure|presentation)/*.ts`

- 当該 Unit の open な WI のうち、inception → product 反映が未完了のものがあれば実装書き込みをブロック
- ソースファイルの `// @work-item-id WI-XXX`（任意）は product 側と整合していることを検証
- `_cross/` WI の `affects` に含まれる Unit は、当該 WI の Phase 0/2 反映が完了するまで実装ブロック

### Phase 4 — Test

**対象**: `scripts/harness/__tests__/(unit|integration)/**/*.test.ts`

- inception のみの test 設計に基づくテスト実装は pre-commit / CI で fail
- product 側の `unit_test_design.md` / `it_test_design.md` に該当 WI の反映があること
- テストファイルの `@work-item-id` から traceability-model が WI → test カバレッジを算出、未カバレッジ WI を可視化

## State Machine

各 WI は PhaseGate 内部で次の状態を持ち、未達状態では後続フェーズをブロックする:

```
DRAFTED       inception の必要成果物が type に応じて揃っている
  ↓ (Phase 0 / Phase 2 reflection)
REFLECTED     affects 全 Unit の product に @work-item-id 反映済み
  ↓ (Phase 3 implementation)
IMPLEMENTED   scripts/harness 配下に対応実装が存在し lint/type/test green
  ↓ (Phase 4 test)
TESTED        @work-item-id 付きテストが存在し green
```

- `type: chore` は DRAFTED = 完結扱い（product 反映不要、PR trailer のみ）
- `type: fix` は DRAFTED → REFLECTED（@work-item-id の product 追記） → IMPLEMENTED の簡略パス
- `type: story | issue | refactor` はフル状態遷移

## 実装ステップ（段階導入）

1. **Phase A: スキーマ + validator（既存互換性維持）**
   - WI frontmatter の JSON schema を config-foundation に追加
   - L2 metadata validator で frontmatter 妥当性を検証（`@story-id` / `@issue-id` legacy 併存）
   - `@work-item-id` パーサを `FileSystemStoryReflectionAdapter` に追加

2. **Phase B: 物理レイアウト統一（既存 docs のマイグレーション）**
   - `docs/inception/issues/*` → `docs/inception/_cross/*` へ移動し `WI-XXX` にリナンバリング + `legacy_id` 付与
   - `docs/inception/{unit}/issues/*` → `docs/inception/{unit}/*` へフラット化 + 同様のリナンバリング
   - マイグレーションスクリプト `npx phasegate migrate work-items` を提供

3. **Phase C: gate ロジック刷新**
   - `listStoryDirectories` → `listWorkItems` にリネーム、`_cross/` も走査
   - `WriteTargetScope.fromPath` から `{unit}/issues/` と `docs/inception/issues/` の分岐を削除
   - `resolveStoryReflectionScope` を `type` と `affects` を加味した判定に刷新

4. **Phase D: trivial path の提供**
   - `quick-implementor` を WI-aware 化（`type: fix | chore` に特化）
   - PR trailer `Work-Item: WI-XXX` を CI が検証（commit lint）

## 受け入れ基準

- [x] 全 work item が `docs/inception/{unit}/{WI-XXX}/` または `docs/inception/_cross/{WI-XXX}/` に統一される
- [x] `docs/inception/issues/` と `docs/inception/{unit}/issues/` が廃止される
- [x] WI frontmatter（`id` / `type` / `severity` / `affects`）が L2 metadata validator で検証される
- [x] `type: story | issue | refactor` の WI について、`affects` 全 Unit の product 反映未完時に Level 3 書き込みがブロックされる
- [x] `type: fix | chore` は description.md + PR trailer だけで証跡が残る軽量パスを提供する
- [x] `@work-item-id` アノテーション（新）と `@story-id` / `@issue-id`（legacy）の両方で反映検出ができる
- [x] `FileSystemStoryReflectionAdapter` が全 WI を uniform に列挙する（`_cross/` 含む、`{unit}/issues/` 特殊分岐なし）
- [x] `WriteTargetScope.fromPath` が `_cross/{WI-XXX}/` と `{unit}/{WI-XXX}/` を Level 3 として扱う
- [x] `git log --grep='Work-Item: WI-XXX'` で WI-ID に紐づく全コミットを遡れる
- [x] 移行スクリプト `npx phasegate migrate work-items` が実行でき、`legacy_id` で旧 ID の grep 互換が保たれる
- [x] Codex / Claude Code の両方で、少なくとも commit 前には未反映状態を fail にできる
- [x] hook / metadata validator / consistency validator の責務分担が docs と実装で一致する
- [x] 回帰テストで `story | issue | refactor | fix | chore` の各 type を検証する

## 非対象

- Codex native `apply_patch` の hook 非対応そのものの解消
- Cascade Updater の全文自動要約・自動編集アルゴリズムの完成
- product docs の文言差分まで完全自動比較する高度な意味解析
- GitHub Issues との自動双方向同期（`source: github#123` は参照のみ、同期は手動）

## 関連

- [docs/folder_management_rules.md](/Users/jumpei/dev/PhaseGate/docs/folder_management_rules.md:56)
- [docs/product/product_overview.md](/Users/jumpei/dev/PhaseGate/docs/product/product_overview.md:36)
- [docs/product/user_stories.md](/Users/jumpei/dev/PhaseGate/docs/product/user_stories.md:201)
- [file-system-story-reflection-adapter.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.ts:29)
- [write-target-scope.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts:71)
- [handle-pre-tool-use-usecase.ts](/Users/jumpei/dev/PhaseGate/scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:288)
