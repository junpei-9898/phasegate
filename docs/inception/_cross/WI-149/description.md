---
id: WI-149
type: issue
severity: high
status: reflected
affects: [documentation]
source: internal
---

# WI-149: Public Documentation Contract Mismatch Remediation

> 起票日: 2026-05-12
> 起票経緯: `docs/inception/_shared/wi_documentation_improvement_backlog.md` の Must 起票候補を正式 WI 化する。

## 背景

PhaseGate の実装契約、product docs、README / guide / DEVELOPMENT.md の間で、公開名や設定意味が食い違っている箇所がある。初見ユーザーと agent が同じ契約を参照できるよう、P0 の不一致を先に解消する。

## スコープ

- `WI-093`: `paths.designDocs` と product root 導出の説明差分。
- `WI-068`: plan checker の公開コマンド名不一致。
- `WI-046`: `HarnessError` の `suggestedSkill`, `scaffoldCommand`, `templatePath` product docs 未反映。
- `WI-041`: staged Markdown metadata validation が `phasegate pre-commit` に乗ることの公開説明不足。

## 主要成果物

- `docs/guide/configuration.md`
- `docs/guide/cli-reference.md`
- `docs/guide/hooks-integration.md`
- `DEVELOPMENT.md`
- `docs/product/construction/harness-error/*`
- `docs/product/units/harness_error_unit.md`

## 受け入れ基準

- [x] 上記 4 件について、実装・product docs・guide の説明が同じ名前・同じ意味で読める。
- [x] `skill:run-plan-checker` / `harness:skill-quality:plan-checker` のどちらを正とするかが決まっている。
- [x] 修正箇所に `@work-item-id WI-149` が付く。

## 依存

なし。最優先で扱う。
