---
id: WI-324
type: fix
source: verification-followup
severity: normal
status: implemented
---

# WI-324: L3-004 がフレッシュプロジェクトで fail-closed になりオンボーディングを阻害する

## Context

L3-004（requirement-test-matrix 検査）は matrix 不在を一律 fail-closed で扱うため、
phasegate 導入直後のフレッシュプロジェクト（story 未作成・matrix 未生成）でも
「AC網羅マトリクスが見つかりません」で FAIL し、オンボーディングを阻害していた。

該当: `scripts/harness/validator-system/infrastructure/adapters/nyquist-ac-coverage-policy-adapter.ts`
の matrix 不在分岐（旧 52-66 行）。

## 修正方針（裁定）

- **「matrix 不在 かつ story がゼロ」→ skipWithReason**（理由:
  「story 未作成のため L3-004 をスキップ（story 作成後に requirement-test-matrix を生成すると有効化されます）」）
- **「matrix 不在 だが story が存在する」→ 従来どおり fail-closed**
  （あるべき matrix が消えた事故を見逃さない）
- 「story がゼロ」の判定シグナルは traceability-model の StoryCatalog
  （`{productDocsRoot}/user_stories.md`）の登録 story 数。matrix 生成元
  （MarkdownRequirementSourceAdapter）と同じ user_stories.md を読むため、
  「matrix が本来存在しうるか」と一貫する。catalog 読み込み失敗時は判定不能として
  保守的に fail-closed へ倒す
- SKIP 表現は WI-317 の L3-003 coverage gate と同じ `ValidationResult.skipWithReason`
- `AcCoveragePolicyPort` の戻り値は optional フィールド（`skipped?` / `skipReason?`）で
  後方互換に拡張

## Acceptance Criteria

- [x] フレッシュプロジェクト（user_stories.md 不在・matrix 不在）で L3-004 が skipped=true / passed=true になる
- [x] user_stories.md は存在するが story ゼロ件・matrix 不在でも skipped=true になる
- [x] story が 1 件以上存在し matrix 不在の場合は従来どおり passed=false（fail-closed）のまま
- [x] SKIP は skipWithReason（WI-317 L3-003 と同じ表現）で返り、skipReason に有効化手順が含まれる
- [x] `AcCoveragePolicyPort` 拡張は optional で既存実装・既存モックを壊さない
- [x] 上記を固定する統合テスト（usecase モック 2 件 + CLI end-to-end 2 件 + 既存 fail-closed テストの skipped=false 追記）が green
