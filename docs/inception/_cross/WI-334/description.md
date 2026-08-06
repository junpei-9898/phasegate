---
id: WI-334
type: fix
severity: major
status: implemented
affects: [quick-mode]
source: dogfood WI-329 (gate classification gap)
---

# WI-334: CI workflow ファイルの change-category 分類の取りこぼし修正

<!-- @work-item-id WI-334 -->

## 背景

`.github/workflows/*.yml` の**新規作成**が `QuickModeJudgmentEngine.categorizeFile` の明示ルールに一致せず、フォールバック（CREATE → `feature`）に落ちて pre-tool-use hook にブロックされていた。

- `feature` は quick-mode で構成不能な拒否カテゴリ
- `.github/` は unit を持たないため、案内される story-implementor 経路も構造的に完遂不能（`deriveUnitIdFromPaths` が undefined）
- 一方 **MODIFY はフォールバックで `bugfix` 扱いで通る**ため、防御としても CREATE/MODIFY で不整合

さらに CLI（`check-change-category --paths`）と hook で changeKind 推定が割れていた: CLI は targetChanges なし → 無条件 MODIFY 既定、hook は beforeContent=null → CREATE。同一パスで CLI=bugfix / hook=feature に判定が分裂する。

## 修正

1. `.github/workflows/` 配下（および配下）の `.yml` / `.yaml` を `config` カテゴリに明示分類（CREATE でも `config`）。CI workflow は unit を持たない構成ファイルであり、内容レベルの防御は L3-006 injection scanner（WI-259）と integrity pin（WI-254）が担う（WI-261 の `skills/**/*.md` → `docs` 分類と同型）。`.github/` 全体には広げず、`workflows/` 外・非 yml/yaml は従来どおりフォールバック（fail-closed）を維持する
2. `ClassifyChangeCategoryUseCase` に `FileExistencePort`（fs 実装: `FsFileExistenceAdapter`）を追加し、targetChanges 引数自体が渡されない経路（CLI）はファイル存在チェックで CREATE/MODIFY を推定（存在しない → CREATE）。CLI と hook の判定を一致させる。hook は targetChanges を常に配列（空を含む）で渡すため推定対象外で、Bash 抽出ターゲットの従来挙動（MODIFY 既定）は変えない。port 未注入・存在チェック失敗時は従来どおり MODIFY 既定（安全側）
3. `docs/product/construction/quick-mode/logical_design.md` に CI workflow 分類と changeKind 推定の規定を追記
