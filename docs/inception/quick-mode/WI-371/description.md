---
id: WI-371
type: story
severity: high
status: drafted
affects: [quick-mode, config-foundation, agent-integration]
source: GitHub issue #43（#41 follow-up）
---

# WI-371: quickMode 分類ルールの config 化（categoryOverrides）+ allowedCategories の enum 検証 — 設計（Phase 1）

<!-- @work-item-id WI-371 -->

## 背景

`QuickModeJudgmentEngine.classify(changedFiles, _config?)` は `QuickModeConfig` を
受け取りながら未使用で、`categorizeFile` の分類テーブルは完全ハードコードだった。
そのため `results/**` / `notes/**` のようなプロジェクト固有のドキュメント置き場は
- 既存パスの MODIFY → `bugfix`（フォールバック）
- 未存在パスの CREATE → `feature`（フォールバック、`allowedCategories` に入れる手段が無い）

となり、恒久的に Full Mode 必須になっていた（issue #41 の実質的な発端）。

あわせて `quickMode.allowedCategories` は JSON schema 上ただの `string[]`、
`QuickModeConfig.create` も非空チェックのみで、`"typoo"` のような未知値が
無検証で通過していた（silent に「効かない設定」になる）。

## スコープ（実装 WI）

| WI | 内容 |
|----|------|
| WI-371 | 設計（本ドキュメント + product construction 反映） |
| WI-372 | `quickMode.categoryOverrides` の導入（domain / infrastructure / schema） |
| WI-373 | `allowedCategories` の ChangeCategory enum 検証（VO + schema + hook fail-closed） |
| WI-374 | 利用者ドキュメント（quick-vs-full-mode.md / configuration.md） |

## 設計判断サマリ

- **DD-1**: `categoryOverrides` は組み込みルールより**先**に評価する（ユーザー明示が優先）
- **DD-2**: ただし組み込み判定が `domain` / `api` のファイルは override で**降格できない**
  （リスク優先度の高い方を採用 = override は昇格のみ可能）
- **DD-3**: `domain` / `api` / `feature` を override の**キー**にするのは許可する
  （それらは既定 `allowedCategories` 外なので、割り当ては防御の**強化**にしかならない）
- **DD-4**: 複数カテゴリのパターンに同時マッチした場合はリスク優先度が最も高いカテゴリを採用
  （JSON のキー順に依存しない決定的な fail-closed 解決）
- **DD-5**: glob 実装は domain 層内の純粋実装（domain 層は repo 全体で外部 npm 依存ゼロ）
- **DD-6**: `judge()` の NEW_DOMAIN / API_CONTRACT 拒否ルールは override の影響を受けない
- **DD-7**: `allowedCategories` の未知値は `QuickModeConfigError` で拒否（正規化しない）。
  hook 経路が config 例外で fail-open しないよう、設定不正時は Full Mode 必須へ倒す

## 後方互換

- `categoryOverrides` 未設定時の分類結果は現行と完全一致（回帰テストで固定）
- `normalizeAllowedCategories`（WI-348 / `file-system-full-mode-session-query-adapter.ts`）は
  **変更しない**。`.phasegate/session.json` は config ではなく実行時セッション成果物であり、
  旧形式の正規化経路を壊さない
