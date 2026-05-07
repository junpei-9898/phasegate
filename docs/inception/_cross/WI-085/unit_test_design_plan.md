# ユニットテスト設計計画: WI-085 phase-dependency-model 追補

> 親 WI: [WI-085](description.md) — phase-gate validator paths config プレースホルダ化
> ベース設計: `docs/product/construction/phase-dependency-model/unit_test_design.md`
> 採番起点: 既存最大 ID `UT-PD-168` の次から `UT-PD-169` 以降を採番

## 1. スコープ

WI-085 / ADR-016 に伴う `Artifact` 値オブジェクトの仕様変更に対するユニットテスト設計の **追補・修正** を行う。Unit 全体のテスト設計書きおこしではなく、既存 `unit_test_design.md` への差分追加。

### 対象（変更）コンポーネント

| 種別 | 対象 | 変更内容 |
|------|------|---------|
| 値オブジェクト | `Artifact` | placeholder 拡張・`docs/` 接頭辞撤廃・`resolve` シグネチャ拡張 |

`PhaseConfigProviderPort.getPathRoots()`, `ArtifactExistenceCheckerPort.checkAll(..., pathRoots)`, `EvidenceBundleAssembler.assembleForLevel` の paths 流入はいずれもポート/サービスであり、ユニットテストの対象は Application / Infrastructure 層の IT。本ファイルでは扱わない（→ `it_test_design.md` の WI-085 追補で扱う）。

## 2. テスト対象分析

### 値オブジェクト

| 値オブジェクト名 | 既存ケース数 | 修正ケース | 新規ケース | 合計増減 |
|----------------|-------------|-----------|-----------|---------|
| Artifact | 7 (UT-PD-047〜053) + 境界値 5 (UT-PD-095〜099) + resolve 3 (UT-PD-150〜152) | 修正/反転 5、削除 1 | 新規 +約 9 (UT-PD-169〜177) | +約 8 |

### 修正対象（既存ケース）

| 既存 ID | 既存内容 | WI-085 後の扱い |
|---------|---------|----------------|
| UT-PD-049 | `path が "docs/" で始まらない場合 → InvalidArtifactPathError` | **意味反転**: `path が "docs/" 以外で始まる場合 → 正常生成（バリデーション撤廃）` |
| UT-PD-098 | `"src/invalid.md" → InvalidArtifactPathError` | **意味反転**: `"src/invalid.md" → Artifact 正常生成` |
| UT-PD-099 | `"DOCS/upper.md" → InvalidArtifactPathError` | **意味反転**: `"DOCS/upper.md" → Artifact 正常生成` |
| UT-PD-110 | `InvalidArtifactPathError` 発火条件: 「path が空文字 or `docs/` 始まりでない or required=true で未解決 placeholder」 | **修正**: 「path が空文字 or 許可外 placeholder を含む or required=true で未解決 placeholder」 |
| UT-PD-150 | `Artifact.resolve(scope)` で `{unitId}` / `{storyId}` 展開 | **拡張**: `Artifact.resolve(scope, pathRoots)` シグネチャに合わせる（pathRoots 省略時の挙動を assert） |
| UT-PD-151 | 同上 | 同上（pathRoots 省略時の docs/inception 既定展開を assert） |
| UT-PD-152 | scope 未提供時の挙動 | 同上 |

### 新規ケース（採番案）

| 新 ID | 観点 | 入力 | 期待結果 |
|-------|------|------|---------|
| UT-PD-169 | Artifact.create with `{designDocsRoot}` placeholder | `path: '{designDocsRoot}/{unit}/domain_model.md'` | 正常生成 |
| UT-PD-170 | Artifact.create with `{inceptionDocsRoot}` placeholder | `path: '{inceptionDocsRoot}/{unit}/{storyId}/logical_design.md'` | 正常生成 |
| UT-PD-171 | Artifact.create with 許可外プレースホルダ | `path: '{unknownRoot}/foo.md'` | InvalidArtifactPathError |
| UT-PD-172 | Artifact.resolve with pathRoots: designDocsRoot 展開 | `path: '{designDocsRoot}/{unit}/domain_model.md'`, `scope: { unitId: 'phase-dependency-model' }`, `pathRoots: { designDocsRoot: 'mydocs/product', inceptionDocsRoot: 'mydocs/inception' }` | `'mydocs/product/phase-dependency-model/domain_model.md'` |
| UT-PD-173 | Artifact.resolve with pathRoots: inceptionDocsRoot 展開 | `path: '{inceptionDocsRoot}/{unit}/{storyId}/logical_design.md'`, `scope: { unitId: 'X', storyId: 'H02-01' }`, `pathRoots: { designDocsRoot: 'mydocs/product', inceptionDocsRoot: 'mydocs/inception' }` | `'mydocs/inception/X/H02-01/logical_design.md'` |
| UT-PD-174 | Artifact.resolve **pathRoots 省略時** デフォルト展開 (designDocsRoot) | `path: '{designDocsRoot}/{unit}/domain_model.md'`, `scope: { unitId: 'phase-dependency-model' }` | `'docs/product/construction/phase-dependency-model/domain_model.md'`（後方互換） |
| UT-PD-175 | Artifact.resolve **pathRoots 省略時** デフォルト展開 (inceptionDocsRoot) | `path: '{inceptionDocsRoot}/_shared/product_overview_plan.md'` | `'docs/inception/_shared/product_overview_plan.md'`（後方互換） |
| UT-PD-176 | Artifact.resolve 混在展開（root + unit + storyId 全種） | 全 placeholder 含むパス + scope + pathRoots | 全 placeholder が実値展開された絶対相対パス |
| UT-PD-177 | Artifact.resolve required=true で `{unit}` 未提供 | scope.unitId 未提供 | InvalidArtifactPathError（未解決 placeholder 残存検知の既存挙動） |

非 placeholder の純リテラル path（例: `mydocs/foo.md`）は (UT-PD-098/099 の意味反転) で網羅されるため新規追加不要。

## 3. テスト方針

- **AAAパターン (Arrange / Act / Assert)** 既存と同一
- **テストケース名は日本語**
- 既存 ID の意味反転 (UT-PD-049/098/099) は ID を維持して内容のみ書き換え（履歴上の id 連続性保持）
- 新規ケースは UT-PD-169 から連番
- **後方互換確認** (UT-PD-174/175) は WI-085 の最重要 assert — 既存ハードコードパスと同一文字列が出力されることを必ず assert
- ファイル: `phase-structure.test.ts` 内の Artifact 群に集約（既存方針継承）

## 4. QA（不明点・確認事項）

### [Question] Q1: `pathRoots` 引数のオプショナル化は妥当か

**背景**: ADR-016 の Migration §1 で `Artifact.resolve()` シグネチャに `pathRoots` を追加することが決まっているが、引数を必須にするか optional にするかは未決定。`logical_design.md §2.2.2` では `pathRoots?:` (optional) として記述済み。

**推奨案**: **optional とする**。理由:

1. `Artifact` 単体テスト・一部の解決経路（plan 文書 reader 等）で pathRoots を持たない呼び出しが既存しており、デフォルト値展開の方が破壊的影響が小さい
2. デフォルト `{ designDocsRoot: 'docs/product/construction', inceptionDocsRoot: 'docs/inception' }` を `Artifact.resolve` 内部で持つことで、後方互換テスト (UT-PD-174/175) が成立する
3. 必須化すると既存呼び出し全箇所の改修が必要で、本 WI のスコープが膨らむ

[Answer] 推奨案で進める（pathRoots は optional、未指定時はデフォルト値で展開）

### [Question] Q2: 許可外プレースホルダ検知のタイミング

**背景**: `Artifact.create` で許可外 placeholder（例: `{unknownRoot}`）を弾くか、`resolve` 時に弾くか。

**推奨案**: **`create` 時に弾く（既存挙動継承）**。理由:

- 既存の `ALLOWED_PLACEHOLDERS` セットチェックは `create` 時。WI-085 では set に 2 個追加するだけでこの挙動を維持できる
- `create` 時に弾くことで設定ミスが早期検知され、CI 出力で明示される
- 新ケース UT-PD-171 はこの挙動を assert する

[Answer] 推奨案で進める（`create` 時に許可外 placeholder を弾く）

### [Question] Q3: `pathRoots` の値検証は Artifact 側で行うか

**背景**: `pathRoots.designDocsRoot` が空文字 / 不正値のときのエラーハンドリング責務。

**推奨案**: **Artifact では検査しない**。理由:

- `paths.designDocs` / `paths.inceptionDocs` の値検証は config-foundation の schema validation（既存）で済む。Artifact がさらに検査するのは責務重複
- `pathRoots` は信頼できる入力（PhaseConfigProvider 実装が config-foundation 経由で取得済み）と仮定
- ADR-016 Consequences §「`docs/` 接頭辞バリデーション撤廃の緩み」で「`paths.*` の妥当性は config-foundation で担保」と明記済み

[Answer] 推奨案で進める（Artifact では pathRoots 値検証なし。空文字でも展開される）

## 5. 前提条件・リスク

### 前提
- ADR-016 が Accepted（確認済み）
- `logical_design.md §2.2.2` / `domain_model.md INV-10` が WI-085 仕様で更新済み（確認済み）
- 既存 phase-structure.test.ts のテストインフラ（`createArtifact` ヘルパ等）が新ケースで再利用可能

### リスク
- 既存 ID UT-PD-049/098/099 の意味反転は履歴トレースで「assert が真逆になった」点に注意が要る。CHANGELOG / WI-085 で明記する
- UT-PD-150〜152 のシグネチャ変更により、テストロジック層 (`unit_test_logic.md`) も後続で更新が必要（cascade）

## 6. 出力ファイル

- 修正先: `docs/product/construction/phase-dependency-model/unit_test_design.md`
- 計画 (本ファイル): `docs/inception/_cross/WI-085/unit_test_design_plan.md`

## 7. 次ステップ

- 本計画を承認後、Phase 2 で `unit_test_design.md` を編集
- 続いて IT 側を `it-test-designer` skill (it_test_design_plan.md) で同様処理
- 完了後 `test-coverage-checker` を再実行してカバレッジ 100% 維持を確認
