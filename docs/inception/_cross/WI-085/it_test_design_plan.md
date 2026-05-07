# IT テスト設計計画: WI-085 phase-dependency-model 追補

> 親 WI: [WI-085](description.md) — phase-gate validator paths config プレースホルダ化
> ベース設計: `docs/product/construction/phase-dependency-model/it_test_design.md`
> 採番起点: 既存最大 ID `IT-PD-122` の次から `IT-PD-123` 以降を採番

## 1. スコープ

WI-085 / ADR-016 によって導入される **paths config 流入経路** を IT レベルで検証する。具体的には:

- `EvidenceBundleAssembler` の `getPathRoots()` 呼び出しと resolve / checkAll への流入
- `FileSystemArtifactExistenceChecker.checkAll(..., pathRoots)` でのパス解決
- `HarnessConfigPhaseConfigProvider.getPathRoots()` の `paths.designDocs` / `paths.inceptionDocs` 取得
- 統合シナリオ: カスタム paths 設定下での L2 phase-gate 動作

## 2. テスト対象分析

### Application Service

| Service | 既存ケース | 新規ケース | 修正ケース |
|---------|----------|----------|----------|
| EvidenceBundleAssembler | IT-PD-033〜037 | +3 (IT-PD-123〜125) | IT-PD-034 微修正 |

### Infrastructure

| 実装 | 既存ケース | 新規ケース | 修正ケース |
|------|----------|----------|----------|
| FileSystemArtifactExistenceChecker | IT-PD-046〜050 | +2 (IT-PD-126〜127) | IT-PD-048 シグネチャ反映 |
| HarnessConfigPhaseConfigProvider | IT-PD-059〜064 | +3 (IT-PD-128〜130) | — |

## 3. 修正/新規ケース詳細

### 3.1 EvidenceBundleAssembler 系（§ 4.1 への追補）

#### 修正

| ID | Before | After |
|----|--------|-------|
| IT-PD-034 | `scope指定時にArtifactのプレースホルダが解決された上で存在判定される` | 同左に「`pathRoots` も `phaseConfigProvider.getPathRoots()` 経由で取得され resolve/checkAll に流入する」点を追記 |

#### 新規

| ID | カテゴリ | テストケース名 | 検証内容 |
|----|--------|-------------|---------|
| IT-PD-123 | 正常系 | カスタム paths 設定時に `Artifact.resolve` がカスタム root で展開される | `phaseConfigProvider.getPathRoots()` Stub が `{ designDocsRoot: 'mydocs/product', inceptionDocsRoot: 'mydocs/inception' }` を返す → assembleForLevel 後の `artifactStatuses` キーが `mydocs/...` 系 |
| IT-PD-124 | 正常系 | デフォルト paths 設定時に従来通り `docs/inception` / `docs/product/construction` で解決される（後方互換） | Stub が default 値を返す → `artifactStatuses` キーが `docs/inception/...` / `docs/product/construction/...` |
| IT-PD-125 | 正常系 | `getPathRoots` が `assembleForLevel` 内で 1 回だけ呼ばれる（無駄な再呼び出しなし） | spy で呼び出し回数 = 1 を assert |

### 3.2 FileSystemArtifactExistenceChecker（§ 5.1 への追補）

#### 修正

| ID | Before | After |
|----|--------|-------|
| IT-PD-048 | `プレースホルダ解決後のパスで存在判定される（{unit} プレースホルダ → scope 指定 → 解決済みパスで判定）` | `checkAll(artifacts, scope, pathRoots?)` シグネチャに合わせる。`pathRoots` 省略時はデフォルト値（`docs/product/construction` / `docs/inception`）で展開されることを assert に追加 |

#### 新規

| ID | カテゴリ | テストケース名 | 検証内容 |
|----|--------|-------------|---------|
| IT-PD-126 | 正常系 | `pathRoots` 引数で指定したカスタム root 配下のファイルを判定対象とする | 一時 `mydocs/inception/{unit}/...` ファイルを作成し pathRoots を渡す → checkAll 結果 true |
| IT-PD-127 | 正常系 | `pathRoots` 省略時はデフォルト `docs/inception` / `docs/product/construction` 配下を判定対象とする（後方互換） | 一時 `docs/...` ファイル → pathRoots 未指定 → true |

### 3.3 HarnessConfigPhaseConfigProvider（§ 5.3 への追補）

#### 新規

| ID | カテゴリ | テストケース名 | 検証内容 |
|----|--------|-------------|---------|
| IT-PD-128 | 正常系 | `paths.designDocs` / `paths.inceptionDocs` 設定時に `getPathRoots()` がそれを返す | config fixture `paths: { designDocs: 'mydocs/product', inceptionDocs: 'mydocs/inception' }` → `{ designDocsRoot: 'mydocs/product', inceptionDocsRoot: 'mydocs/inception' }` |
| IT-PD-129 | 正常系 | `paths` 未指定時に `getPathRoots()` がデフォルト値を返す（後方互換） | config fixture に `paths` セクションなし → `{ designDocsRoot: 'docs/product/construction', inceptionDocsRoot: 'docs/inception' }` |
| IT-PD-130 | 正常系 | `paths.designDocs` のみ指定時、`inceptionDocsRoot` はデフォルトに fallback する | partial fixture → `inceptionDocsRoot: 'docs/inception'` |

## 4. テスト方針

- **AAAパターン (Arrange / Act / Assert)** 既存と同一
- **テストケース名は日本語**
- 新規ケースは IT-PD-123 から連番
- ファイルシステム検証は既存と同様 `fs.mkdtempSync()` + cleanup を使用
- IT-PD-128/129/130 は config fixture を直接構築（既存方針と一貫）

## 5. QA（不明点・確認事項）

### [Question] Q1: `getPathRoots` の戻り値型に正規化を含めるか

**背景**: `paths.designDocs` が末尾スラッシュ付き (`'mydocs/product/'`) で渡された場合の正規化責務。

**推奨案**: **正規化しない**。理由:
- `paths.designDocs` は config-foundation 側で文字列 trim 等の標準処理を済ませた値が渡る前提（既存 harness-api scanner も同様の前提で動作）
- 正規化を入れると `Artifact.resolve` 内のリテラル結合 (`${root}/${rest}`) で重複スラッシュが生じる可能性。本 WI のスコープ外
- 末尾スラッシュ問題が顕在化したら別 issue で対処

[Answer] 推奨案で進める（正規化なし。config-foundation 側で trim 済みと仮定）

### [Question] Q2: IT-PD-125 (1 回だけ呼ばれる assert) は過剰か

**背景**: `getPathRoots` が `assembleForLevel` 内で複数回呼ばれてもバグではないが、毎ループ呼び出されると `paths` 取得コストが線形になる。

**推奨案**: **`getPathRoots` は assembleForLevel 開始時に 1 度だけ呼ぶ実装とし、IT-PD-125 で spy assert する**。理由:
- パフォーマンスの予防的検査（既存 IT-PD-035 の `getPlanningMode` も同様の単一呼び出し前提）
- ただし engineering-perspective 観点で「過剰検査」とみなす場合は削除候補

[Answer] 推奨案で進める（IT-PD-125 を入れて spy で 1 回呼び出しを assert）

## 6. 前提条件・リスク

### 前提
- ADR-016 / WI-085 logical_design 更新済み
- unit_test_design.md は WI-085 追補が先に終わっている（Artifact 単体テストが固まってから IT 設計）

### リスク
- IT-PD-128〜130 は HarnessConfigPhaseConfigProvider の実装側で `paths` パース経路の追加が必要。Phase 3 実装時に config-foundation の既存 path 取得 utility を再利用する想定

## 7. 出力ファイル

- 修正先: `docs/product/construction/phase-dependency-model/it_test_design.md`
- 計画 (本ファイル): `docs/inception/_cross/WI-085/it_test_design_plan.md`

## 8. 次ステップ

- 本計画承認後、Phase 2 で `it_test_design.md` を編集
- 完了後 `test-coverage-checker` を再実行してカバレッジ確認 → `story-implementor` へ
