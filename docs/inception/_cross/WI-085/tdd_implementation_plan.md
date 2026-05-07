# TDD実装計画: WI-085

> 親 WI: [WI-085](description.md) — phase-gate validator paths config プレースホルダ化
> ADR: [ADR-016](../../../ADR/ADR-016-paths-config-placeholder.md)
> 対象 Unit: phase-dependency-model

## 1. スコープ

`paths.designDocs` / `paths.inceptionDocs` config が L2 phase-gate validator の成果物パス解決に流入するよう、ドメイン契約・アプリケーションサービス・インフラ実装を改修する。

### 受け入れ基準（description.md より）

- [ ] `paths.designDocs` / `paths.inceptionDocs` を変更すると L2-001 が要求する成果物パスが追従する
- [ ] デフォルト設定での挙動は v0.115.0 以前と完全互換
- [ ] `Artifact` がプレースホルダ展開後の任意ルートパス（`docs/` 以外）を許容する
- [ ] `STANDARD_PHASE_NODES` / `FULL_PHASE_NODES` / `MINIMAL_PHASE_NODES` の `path` リテラルが `{designDocsRoot}` / `{inceptionDocsRoot}` プレースホルダ経由になる
- [ ] 単体テストで「カスタム paths でのパス解決」「デフォルト paths での後方互換」両方が assert される

### 影響する層

| 層 | 影響箇所 |
|----|---------|
| Domain | `Artifact` (values) / `PhaseConfigProviderPort` (ports) / `ArtifactExistenceCheckerPort` (ports) / `*-phase-nodes.ts` (definitions) |
| Application | `EvidenceBundleAssembler` |
| Infrastructure | `FileSystemArtifactExistenceChecker`, `HarnessConfigPhaseConfigProvider` |
| Presentation | （変更なし） |

## 2. 前提条件検証

- `implementation-readiness-checker` 実行: 2026-05-07（本セッション）
- 判定: ⚠️ 必須ファイル揃いだがテスト設計ギャップあり → Phase 3-pre で `unit-test-designer` / `it-test-designer` 流儀でギャップ補完済み
- カバレッジ: `coverage_report.md` 100%（WI-085 追加分も反映済み）
- ✅ 実装準備完了

## 3. TDD実装順序

### Step 1: Artifact 単体テスト → 実装（Domain）

**RED**: `phase-structure.test.ts` に WI-085 関連ケースを追加/修正
- UT-PD-049 / 098 / 099 の意味反転（既存ケースの assert を許容方向へ）
- UT-PD-110 の error 条件記述更新（実装側の挙動が一致するよう）
- UT-PD-150 / 151 / 152 のシグネチャ拡張（`pathRoots` 引数あり/省略の両方）
- UT-PD-169 / 170 / 171 新規（`{designDocsRoot}` / `{inceptionDocsRoot}` 許容、許可外プレースホルダ拒否）
- UT-PD-172〜177 新規（resolve のカスタム/デフォルト pathRoots 展開、混在展開、未提供時 error）

**GREEN**: `scripts/harness/phase-dependency-model/domain/values/artifact.ts`
- `ALLOWED_PLACEHOLDERS` に `'designDocsRoot'` / `'inceptionDocsRoot'` 追加
- `Artifact.create` の `docs/` 接頭辞バリデーション削除（artifact.ts:48 の if 文を撤廃）
- `Artifact.resolve(scope, pathRoots?)` シグネチャ拡張
  - `pathRoots` 省略時のデフォルト: `{ designDocsRoot: 'docs/product/construction', inceptionDocsRoot: 'docs/inception' }`
  - `{designDocsRoot}` / `{inceptionDocsRoot}` を `pathRoots` の値で置換
  - 既存の `{unit}` / `{storyId}` 置換は維持

### Step 2: PhaseConfigProviderPort.getPathRoots → HarnessConfigPhaseConfigProvider 実装（Domain Port + Infra）

**RED**: `harness-config-phase-config-provider.test.ts` に IT-PD-128 / 129 / 130 を追加

**GREEN**:
- `scripts/harness/phase-dependency-model/domain/ports/phase-config-provider-port.ts`
  - `getPathRoots(): Promise<{ designDocsRoot: string; inceptionDocsRoot: string }>` 追加
- `scripts/harness/phase-dependency-model/infrastructure/.../harness-config-phase-config-provider.ts`
  - `getPathRoots()` 実装: `config.paths?.designDocs ?? 'docs/product/construction'` 等

### Step 3: ArtifactExistenceCheckerPort.checkAll → FileSystemArtifactExistenceChecker 実装（Port + Infra）

**RED**: `file-system-artifact-existence-checker.test.ts` に IT-PD-126 / 127 を追加。IT-PD-048 のシグネチャを拡張

**GREEN**:
- `scripts/harness/phase-dependency-model/domain/ports/artifact-existence-checker-port.ts`
  - `checkAll(artifacts, scope, pathRoots?)` シグネチャ拡張
- `scripts/harness/phase-dependency-model/infrastructure/filesystem/file-system-artifact-existence-checker.ts`
  - `pathRoots` 引数を受け、`Artifact.resolve(scope, pathRoots)` に渡す

### Step 4: EvidenceBundleAssembler の paths 流入（Application）

**RED**: `check-phase-gate-usecase.test.ts` 内に IT-PD-123 / 124 / 125 を追加。IT-PD-034 を拡張

**GREEN**:
- `scripts/harness/phase-dependency-model/application/services/evidence-bundle-assembler.ts`
  - `assembleForLevel` の冒頭で `await this.phaseConfigProvider.getPathRoots()` を 1 回呼ぶ
  - 取得した `pathRoots` を `artifact.resolve(scope, pathRoots)` および `checkAll(artifacts, scope, pathRoots)` に渡す

### Step 5: \*-phase-nodes.ts リテラル置換（Domain Definitions）

既存テスト（および追加された UT/IT）が後方互換でパスすることを保証しながら、以下の置換を 3 ファイル（`standard-phase-nodes.ts` / `full-phase-nodes.ts` / `minimal-phase-nodes.ts`）に適用:

| Before | After |
|--------|-------|
| `'docs/inception/_shared/...'` | `'{inceptionDocsRoot}/_shared/...'` |
| `'docs/inception/{unit}/...'` | `'{inceptionDocsRoot}/{unit}/...'` |
| `'docs/inception/{unit}/{storyId}/...'` | `'{inceptionDocsRoot}/{unit}/{storyId}/...'` |
| `'docs/product/construction/{unit}/...'` | `'{designDocsRoot}/{unit}/...'` |

**置換しない（Q1 で扱う）**:

- `'docs/product/product_overview.md'`
- `'docs/product/user_stories.md'`
- `'docs/product/user_story_mapping.md'`
- `'docs/product/units/{unit}_unit.md'`
- `'docs/product/units/integration_contract.md'`

これらは `docs/product/` 直下にあり、`paths.designDocs`（= `docs/product/construction`）の置換対象として表現できない。Q1 で扱い方を確定する。

### 統合検証

- `npm run test` 全 PASS
- `npm run test -- --coverage` でカバレッジ閾値（既存）を維持
- `npx phasegate lint`（L1 違反ゼロ）
- `npx phasegate validate --layer L2`（自分自身の L2 phase-gate でも構造維持）

## 4. 環境検証チェックリスト

- [ ] Vitest が走る (`npm run test`)
- [ ] Biome lint が走る (`npx phasegate lint`)
- [ ] phase-gate self-validation がパス (`npx phasegate validate --layer L2`)
- [ ] `phasegate.config.json` の `paths.designDocs` / `paths.inceptionDocs` を一時的に `mydocs/product/construction` / `mydocs/inception` に変えて手動再現確認（手動）

## 5. QA（不明点・確認事項）

### [Question] Q1: `docs/product/product_overview.md` 等の非 construction パス扱い

**背景**: `paths.designDocs` のデフォルトは `docs/product/construction` だが、Level 1 の product-architect / story-writer / story-mapper / unit-designer が出力する成果物 5 件は `docs/product/` 直下（`docs/product/product_overview.md` 等）にあり、`{designDocsRoot}/...` で置換すると `docs/product/construction/product_overview.md` という存在しないパスになる。

該当パス（grep 結果）:

- `docs/product/product_overview.md`（standard / full / minimal）
- `docs/product/user_stories.md`（standard / full）
- `docs/product/user_story_mapping.md`（full）
- `docs/product/units/{unit}_unit.md`（full）
- `docs/product/units/integration_contract.md`（full）

選択肢:

- **(α) リテラルのまま残す（推奨）** — 本 WI のスコープを `paths.designDocs` / `paths.inceptionDocs` に閉じる。description.md のスコープ外 §「skill ファイル内の path 参照の動的化」と並ぶ位置づけ。後で `paths.productDocs` を別 WI で追加することは可能
- **(β) 新プレースホルダ `{productDocsRoot}` を本 WI で同時導入** — `paths.productDocs` を config schema に追加し、デフォルト `docs/product`。整合性は最大化するが、config-foundation の schema v3 改修が伴いスコープが膨らむ
- **(γ) `{designDocsRoot}` のセマンティクスを `docs/product` に再定義し、construction パスを `{designDocsRoot}/construction/{unit}/...` に変更** — 既存 config の `paths.designDocs: "docs/product/construction"` 設定値の意味が変わるため破壊的変更。NG

**推奨案: (α)**。理由:

1. WI-085 の description.md / GitHub Issue #1 は `paths.designDocs` / `paths.inceptionDocs` の 2 つを問題にしている。「product 直下のパス」までスコープに含めるのは要求の拡大解釈
2. (β) は config-foundation schema 改修・既存 fixture / テストの広範な更新を伴い、本 WI の minor リリースの粒度を超える
3. リテラルのまま残しても、ユーザーが `docs/product/` を別の場所に移したい場合は別 WI で対処すれば済む（実害は限定的）
4. ADR-016 の Consequences §「スコープ外」に「Artifact.path のユーザー任意プレースホルダ拡張は本 ADR で扱わない」と明記済み。(α) は ADR と整合

[Answer] (α) 採用。リテラル維持で本 WI スコープを paths.designDocs / paths.inceptionDocs に閉じる。

### [Question] Q2: `Artifact.resolve` のデフォルト pathRoots 値の場所

**背景**: `pathRoots` 省略時のデフォルト値（`docs/product/construction` / `docs/inception`）はどこに置くか。

選択肢:

- **(a) `Artifact` クラス内のモジュールレベル定数として持つ（推奨）** — domain 内で完結、Application が常に渡す保証がない API（一部テスト/旧呼び出し）でも安全
- **(b) `Artifact.resolve` 呼び出し側（EvidenceBundleAssembler 等）で必ず注入する** — domain にデフォルト値を持たせず疎結合だが、`Artifact.resolve(scope)` の呼び出し点 6+ 箇所すべてに変更が波及

**推奨案: (a)**。理由:

1. デフォルト値は phasegate プロジェクトの「規約上の標準」であり、domain 知識として持つのが自然（既存 `phaseDependencies.preset` のデフォルト値も domain で持っている）
2. 後方互換: 既存の `artifact.resolve(scope)` 呼び出しが破壊されない
3. `paths` config の値が来ない経路（テストの一部、plan-document-reader など）でも合理的なデフォルトで動作する

[Answer] (a) 採用。Artifact 内のモジュールレベル定数 `DEFAULT_PATH_ROOTS = { designDocsRoot: 'docs/product/construction', inceptionDocsRoot: 'docs/inception' }` でデフォルト値を保持。

### [Question] Q3: `getPathRoots()` 戻り値の path 末尾正規化

**背景**: `paths.designDocs: "docs/product/construction/"`（末尾スラッシュ付き）の場合の挙動。`Artifact.resolve` の置換ロジックは `{root}` を文字列置換するので、`{root}/foo.md` → `docs/product/construction//foo.md` になりうる。

選択肢:

- **(I) `HarnessConfigPhaseConfigProvider.getPathRoots` で末尾スラッシュを trim する（推奨）** — 防御的、ユーザー設定揺れを吸収
- **(II) trim しない（IT-PD-130 と整合: それ以上は config-foundation の責務）** — domain/infra 分離の純度高い

**推奨案: (I)**。理由:

1. infra 層で吸収するのが妥当（config の値が来る境界）。domain (`Artifact.resolve`) は「ルートが綺麗な相対パスである」前提に立てる
2. ユーザー設定揺れに対する防御として軽量。1〜2 行の trim 処理で済む
3. 既存の `harness-api/.../file-system-artifact-scanner-adapter.ts:118` も末尾スラッシュ trim はしていないが、Adapter のスコープが異なる（scanner なので path 結合はしない）。本 WI で導入する `getPathRoots` は Artifact resolve の入力なので結合される

[Answer] (I) 採用。HarnessConfigPhaseConfigProvider.getPathRoots() で `path.replace(/\/+$/, '')` 相当の末尾スラッシュ trim を実施。

## 6. 前提条件・リスク

### 前提
- ADR-016 / WI-085 description.md / logical_design.md / domain_model.md / unit_test_design.md / it_test_design.md がすべて WI-085 仕様で同期済み
- `phasegate.config.json` の `paths.designDocs: "docs/product/construction"`、`paths.inceptionDocs: "docs/inception"`（dogfood も同一）

### リスク
- **後方互換破壊**: デフォルト pathRoots を見落とすと既存テスト全体が RED。Step 1 で必ずデフォルト値展開のテスト (UT-PD-174/175) を先に通す
- **`*-phase-nodes.ts` 置換ミス**: 3 ファイル × 多数 path で機械的置換漏れ・過剰が起きうる。`docs/product/product_overview.md` 等は **意図的にリテラル維持**（Q1 (α) 採用時）であり、これも grep で検証
- **`StoryReflectionConfig` 等の `phaseConfigProvider` 既存メソッド**: `getPathRoots` 追加に伴いインターフェース実装側で不足メソッドエラーが出ないか要確認

### スコープ外
- L1 / L3 / L4 の paths 反映（description.md スコープ外）
- `paths.productDocs` 追加（Q1 (α) 採用時）
- skill ファイル内のリテラル path 動的化（description.md スコープ外）

## 7. 出力サマリ

実装変更ファイル（予定 7 ファイル + テスト 3 ファイル）:

- domain/values/artifact.ts
- domain/ports/phase-config-provider-port.ts
- domain/ports/artifact-existence-checker-port.ts
- domain/definitions/standard-phase-nodes.ts
- domain/definitions/full-phase-nodes.ts
- domain/definitions/minimal-phase-nodes.ts
- application/services/evidence-bundle-assembler.ts
- infrastructure/filesystem/file-system-artifact-existence-checker.ts
- infrastructure/.../harness-config-phase-config-provider.ts

テスト追加・修正:
- `__tests__/.../phase-structure.test.ts`（UT-PD-049/098/099/110/150〜152/169〜177）
- `__tests__/.../check-phase-gate-usecase.test.ts`（IT-PD-034/123〜125）
- `__tests__/.../file-system-artifact-existence-checker.test.ts`（IT-PD-048/126/127）
- `__tests__/.../harness-config-phase-config-provider.test.ts`（IT-PD-128〜130）

## 8. 次ステップ

- 本計画 + Q1〜Q3 のユーザー承認 → Phase 2（TDD 実装）
- 完了後 `npm run test` 全 PASS、`npx phasegate lint` 違反ゼロを確認
- description.md に Phase 3 完了ログ記載 → Phase 4（CHANGELOG / configuration.md）→ Phase 5（リリース）
