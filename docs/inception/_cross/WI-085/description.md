---
id: WI-085
type: fix
severity: normal
status: implemented
affects: [phase-dependency-model, config-foundation, validator-system, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/1
reporter: nakataj-mti
adr: ADR-016
---

# WI-085: phase-gate validator (L2-001) が `paths.designDocs` / `paths.inceptionDocs` 設定を尊重しない

> 起票日: 2026-05-07
> 起票経緯: GitHub Issue #1（外部レポーター nakataj-mti, 2026-05-07 04:55 UTC）
> 関連: GitHub Issue [#1](https://github.com/junpei-9898/phasegate/issues/1)

## 背景

`phasegate.config.json` の `paths.designDocs` / `paths.inceptionDocs` を `mydocs/...` などのデフォルト外パスに変更しても、L2-001（phase-gate validator）が要求する成果物パスは `docs/inception/...` / `docs/product/...` のままになる。`docs/guide/configuration.md:471` には「`paths` を変えれば全 validator / hook が解決する」旨が書かれており、ドキュメントと実装に齟齬がある。

外部レポーター（GitHub Issue #1, nakataj-mti）が報告し、起票者調査により `STANDARD_PHASE_NODES` 等の `path` が文字列リテラルでハードコードされていることまで特定済み。phasegate チームによる再検証で **報告内容が正確**であることを確認した。

## 再検証結果（grep ベース、2026-05-07）

### 1. ハードコードの存在

`scripts/harness/phase-dependency-model/domain/definitions/standard-phase-nodes.ts` 全 18 か所の `path:` フィールドが `'docs/inception/...'` / `'docs/product/...'` 文字列リテラル。`full-phase-nodes.ts` / `minimal-phase-nodes.ts` も同様。

### 2. プレースホルダ展開の制約

`scripts/harness/phase-dependency-model/domain/values/artifact.ts:6-8`

```ts
const ALLOWED_PLACEHOLDERS = new Set(['unit', 'storyId']);
```

`{designDocsRoot}` / `{inceptionDocsRoot}` のような **トップレベルパス展開は未実装**。

### 3. `docs/` 接頭辞の強制バリデーション

`scripts/harness/phase-dependency-model/domain/values/artifact.ts:48`

```ts
if (normalizedPath.length === 0 || !normalizedPath.startsWith('docs/')) {
  throw new InvalidArtifactPathError(args.path);
}
```

仮にユーザーが `phaseDependencies.preset: "custom"` + `gates[]` で迂回しようとしても、`mydocs/...` のような非 `docs/` 接頭辞は **Artifact 生成時点で拒否される**。つまり「(B) の文書化修正」だけでは利用者の正当な要求（design docs を別ディレクトリに置く）を満たせない。

### 4. `paths` config が `Artifact.resolve()` に到達していない

`scripts/harness/phase-dependency-model/application/services/evidence-bundle-assembler.ts:42-49` で `phaseConfigProvider` から `planningMode` のみ取得。`paths.designDocs` / `paths.inceptionDocs` は `Artifact.resolve(scope)` 呼び出しに渡されていない。`scope` 型も `{ unitId?: string; storyId?: string }` のみで、ルートパスを通す経路がない。

### 5. ドキュメントの記述

`docs/guide/configuration.md:471`:

> If you move your design documents to a non-default location, update `paths` accordingly so that all validators and hooks resolve files correctly.

`paths.designDocs` / `paths.inceptionDocs` が phase-gate validator のパス解決に反映されることを **明示的に約束**している。

## 既存の部分対応（参考）

`paths.designDocs` を実際に参照している箇所は存在するが、いずれも phase-gate validator（L2-001）の経路ではない:

- `scripts/harness/harness-api/infrastructure/adapters/file-system-artifact-scanner-adapter.ts:118`（harness-api の scanner）
- `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts:60`（agent runtime hook の `unitDir` 解決）

phase-gate validator 本体（`PhaseStructure` / `EvidenceBundleAssembler` / `Artifact`）には `paths.*` が一切流入していない。

## 本 WI でやること

### Phase 1: 方針確定（要 ADR）

GitHub Issue 起票者は (A)/(B) 両案を提示している:

- **(A)** `paths.designDocs` / `paths.inceptionDocs` でトップレベルパスを実際に置換する
- **(B)** ドキュメントを修正し「`paths.*` は storyReflection 専用、phase-gate ノードのパスを変えたい場合は custom preset + gates[] を使う」と明記する

phasegate チームの推奨は **(A)**。理由:

1. ドキュメント `configuration.md:471` の記述が利用者の合理的期待を形成している
2. `Artifact` の `docs/` 接頭辞強制があるため、(B) の "custom preset で置換" は実は現状動かない（追加で接頭辞バリデーション緩和が必要）
3. 28 スキル × 多数の path フィールドを `gates[]` でユーザーに書かせる UX は持続不可能

ADR を起票し、(A) 採用 + 互換性方針（既存 `docs/...` ハードコードを `{designDocsRoot}/...` プレースホルダに置換し、デフォルト値で旧挙動を再現）を確定する。

### Phase 2: 設計（`logical-designer` / `domain-designer` 推奨）

新プレースホルダ仕様:

| プレースホルダ | 解決元 | デフォルト |
|----------------|--------|------------|
| `{designDocsRoot}` | `paths.designDocs` | `docs/product/construction` |
| `{inceptionDocsRoot}` | `paths.inceptionDocs` | `docs/inception` |
| `{unit}` | `scope.unitId` | （変更なし） |
| `{storyId}` | `scope.storyId` | （変更なし） |

設計ポイント:

1. `Artifact` の `docs/` 接頭辞バリデーションを撤廃 or プレースホルダ評価後に移動
2. `Artifact.resolve()` シグネチャを `(scope, pathRoots)` に拡張、または `EvidenceBundleAssembler` 側で paths を展開してから `resolve` に渡す
3. `EvidenceBundleAssembler` が `phaseConfigProvider`（または新ポート）経由で `paths.designDocs` / `paths.inceptionDocs` を取得
4. `STANDARD_PHASE_NODES` / `FULL_PHASE_NODES` / `MINIMAL_PHASE_NODES` の path リテラルを `{inceptionDocsRoot}/_shared/product_overview_plan.md` 等に書き換え
5. `agent-integration` 配下の `phase-gate-query-adapter.ts` 等、既に `paths.designDocs` を参照している箇所と整合を取る

### Phase 3: 実装（`story-implementor` 推奨）

新ドメイン契約（`Artifact.resolve` シグネチャ変更）が含まれるため `story-implementor` 必須。

1. `Artifact` の placeholder 展開拡張 + バリデーション緩和
2. `EvidenceBundleAssembler` の paths 流入経路追加
3. 各 `*-phase-nodes.ts` のリテラル置換
4. テスト追加:
   - default paths で従来通り `docs/inception/...` を要求すること
   - `paths.inceptionDocs: "mydocs/inception"` で `mydocs/inception/...` を要求すること
   - `Artifact` が `docs/` 以外で始まるパス（プレースホルダ展開後）を許容すること

### Phase 4: ドキュメント整合

1. `docs/guide/configuration.md` に新プレースホルダの動作を明記
2. CHANGELOG に bug fix として記載（GitHub Issue #1 への参照付き）

### Phase 5: リリース

1. minor バージョン bump
2. `npm publish --auth-type=web`
3. GitHub Issue #1 にリリース版での修正完了コメントを投稿し close

## 受け入れ基準

- [ ] `paths.designDocs` / `paths.inceptionDocs` を変更すると L2-001 が要求する成果物パスが追従する
- [ ] デフォルト設定での挙動は v0.115.0 以前と完全互換
- [ ] `Artifact` がプレースホルダ展開後の任意ルートパス（`docs/` 以外）を許容する
- [ ] `STANDARD_PHASE_NODES` / `FULL_PHASE_NODES` / `MINIMAL_PHASE_NODES` の `path` リテラルが `{designDocsRoot}` / `{inceptionDocsRoot}` プレースホルダ経由になる
- [ ] 単体テストで「カスタム paths でのパス解決」「デフォルト paths での後方互換」両方が assert される
- [ ] `docs/guide/configuration.md` の記述と実装が一致する
- [ ] CHANGELOG に GitHub Issue #1 参照付きで記載
- [ ] GitHub Issue #1 にリリース版コメント + close 完了

## スコープ外

- L2 以外の validator（L1 / L3 / L4）への paths 設定の網羅的反映 — 既に各 validator が個別に `paths.*` を読んでいる箇所があるため、本 WI では L2-001 phase-gate に閉じる
- `paths.designDocs` 直下の Unit ディレクトリ命名規約変更
- skill ファイル（`.claude/skills/`）内の path 参照の動的化

## 関連

- `scripts/harness/phase-dependency-model/domain/values/artifact.ts:6-80`（プレースホルダ仕様 + `docs/` 接頭辞バリデーション）
- `scripts/harness/phase-dependency-model/domain/definitions/standard-phase-nodes.ts:29-`（ハードコード path）
- `scripts/harness/phase-dependency-model/domain/definitions/full-phase-nodes.ts`（同上）
- `scripts/harness/phase-dependency-model/domain/definitions/minimal-phase-nodes.ts`（同上）
- `scripts/harness/phase-dependency-model/application/services/evidence-bundle-assembler.ts:42-49`（paths 流入欠落点）
- `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts:125-138`（preset 解決）
- `scripts/harness/harness-api/infrastructure/adapters/file-system-artifact-scanner-adapter.ts:118`（既に paths を読んでいる箇所、整合確認用）
- `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts:60`（同上）
- `docs/guide/configuration.md:445-471`（ドキュメント記述）
- GitHub Issue [#1](https://github.com/junpei-9898/phasegate/issues/1)

## 参考

- 起票者の v0.112.0 環境での再現手順は GitHub Issue #1 本文を参照

## 進捗ログ

### Phase 1 完了 — 2026-05-07

[ADR-016: phase-gate validator のパス解決を `paths` config プレースホルダ化する](../../../ADR/ADR-016-paths-config-placeholder.md) を Accepted で起票。(A) 採用、`{designDocsRoot}` / `{inceptionDocsRoot}` を新設、`Artifact` の `docs/` 接頭辞バリデーションは撤廃。

### Phase 2 完了 — 2026-05-07

phase-dependency-model Unit の cross-cutting 設計を更新（cascade-updater パターン）:

- `docs/product/construction/phase-dependency-model/logical_design.md`
  - §2.2.2 Artifact: `path` の許可プレースホルダに `{designDocsRoot}` / `{inceptionDocsRoot}` 追加、`docs/` 接頭辞ルール撤廃、`resolve()` シグネチャ拡張
  - §2.5: `InvalidArtifactPathError` 条件を「許可外プレースホルダを含む」に修正
  - §3.1 ArtifactExistenceCheckerPort: `checkAll()` に `pathRoots` 引数追加
  - §3.3 PhaseConfigProviderPort: `getPathRoots()` 追加
  - §4.1.1 EvidenceBundleAssembler: `pathRoots` を取得して `Artifact.resolve` / `checkAll` に流す責務を追記
- `docs/product/construction/phase-dependency-model/domain_model.md`
  - INV-10 追加（プレースホルダ展開規約）
  - Class diagram の `PhaseConfigProviderPort` に `getPathRoots()` を追加

### Phase 3-pre 完了 — 2026-05-07

WI-085 スコープのテスト設計補完を完了:

- `docs/inception/_cross/WI-085/unit_test_design_plan.md` 起票（QA Q1〜Q3 推奨案で確定）
- `docs/inception/_cross/WI-085/it_test_design_plan.md` 起票（QA Q1〜Q2 推奨案で確定）
- `docs/product/construction/phase-dependency-model/unit_test_design.md` 更新
  - § 4.2 Artifact: 制約帰属コメント書き換え + UT-PD-049 意味反転 + 新規 UT-PD-169〜171 追加
  - § 6.2 Artifact.path 境界値: UT-PD-098/099 意味反転
  - § 6.5 ドメインエラー網羅性: UT-PD-110 条件記述更新
  - § 9.5 Artifact.resolve 連携: UT-PD-150〜152 シグネチャ拡張 + 新規 UT-PD-172〜177 追加
- `docs/product/construction/phase-dependency-model/it_test_design.md` 更新
  - § 4.1 EvidenceBundleAssembler: IT-PD-034 補足 + 新規 IT-PD-123〜125 追加
  - § 5.1 FileSystemArtifactExistenceChecker: IT-PD-048 シグネチャ反映 + 新規 IT-PD-126〜127 追加
  - § 5.3 HarnessConfigPhaseConfigProvider: 新規 IT-PD-128〜130 追加
- `docs/product/construction/phase-dependency-model/coverage_report.md` 更新（Artifact 仕様変更を反映、追加ケースを記録）

> Sonnet 委任 (`scripts/delegate-sonnet.sh`) は非対話セッションで Write 権限プロンプトをブロックされる事象が発生。Opus が直接 Edit ツールで diff を適用することで代替実施。

### Phase 5 follow-up — 2026-05-07 (v0.118.0)

v0.117.0 リリース後の dogfood 検証（`paths.designDocs: "mydocs/product/construction"` / `paths.inceptionDocs: "mydocs/inception"` で `npx phasegate validate --layer L2` を実行）で、ブロッカーテキストがデフォルトパスのまま追従しない事象を発見。原因は `validator-system` / `harness-api` 配下の adapter 3 箇所で `createPhaseDependencyModelModule({ rootDir })` が `phaseConfig` を渡していなかったため。`agent-integration/.../phase-gate-query-adapter.ts` と同等の config 流入経路を追加し v0.118.0 として再リリース。

修正対象:
- `scripts/harness/validator-system/infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.ts`
- `scripts/harness/harness-api/infrastructure/adapters/phase-dependency-model-query-adapter.ts` (queryAllStories / queryUnit 両メソッド)

検証結果:
- カスタム paths 設定時: `mydocs/inception/_shared/product_overview_plan.md` 等を要求 (期待通り)
- デフォルト復元後: ベースライン挙動 (`docs/product/units/{unit}_unit.md` リテラル維持) に戻る (後方互換 OK)

### Post-mortem — 2026-05-08 (WI-093)

v0.117.0〜v0.129.0 の WI-085 系修正では、`paths.inceptionDocs` と Level 2 construction 文書 (`{designDocsRoot}/{unit}/...`) の threading は完了していたが、Level 1 の product 直下文書 (`product_overview.md` / `user_stories.md` / `user_story_mapping.md` / `units/*.md`) と traceability-model の story catalog / construction root は `docs/product/...` hardcoded のまま残っていた。

WI-093 で `paths.designDocs` を construction root として扱い、その親を product root として導出する形に統一した。これにより `paths.designDocs: "mydocs/product/construction"` の場合、L2-001 blocker は `mydocs/product/product_overview.md` / `mydocs/product/user_stories.md` を参照し、traceability-model も `mydocs/product/user_stories.md` と `mydocs/product/construction/{unit}` を読む。
