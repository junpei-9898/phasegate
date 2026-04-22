# ISSUE-019: phasegate の LayerBoundary が `presentation → domain` を禁止している仕様判断を再評価すべき

## ステータス

- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003 Wave 4（v0.80.0）で L1-003 違反の残 12 件のうち 8 件が `presentation/*.ts → domain/*.ts` であることを確認。現行 phasegate の LayerBoundary 定義では `presentation` layer は `presentation + application` にしか依存できず、domain は禁止されている
- **影響Unit**: biome-ast-engine（LayerBoundary 定義主体）
- **深刻度**: Low〜Medium — 実害は「Clean Architecture 実装として一般的な presenter → domain VO の読み取りが L1-003 で flag される」。phasegate を他プロジェクトに導入した際も同様の摩擦が起きる
- **優先度**: P3 — 仕様判断案件。即座の修正というより議論と ADR が必要

## 問題の概要

`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:15-20` の `ALLOWED_DEPENDENCIES`:

```typescript
const ALLOWED_DEPENDENCIES: Readonly<Record<LayerNameValue, readonly LayerNameValue[]>> = {
  domain: Object.freeze(['domain']),
  application: Object.freeze(['application', 'domain']),
  infrastructure: Object.freeze(['infrastructure', 'application', 'domain']),
  presentation: Object.freeze(['presentation', 'application']),  // ← domain が無い
};
```

`presentation → domain` は許可されていない。

### 該当違反（v0.80.0 phasegate lint 出力の内訳）

| from | to | count |
|---|---|---|
| `phase-dependency-model/presentation/cli/story-reflection-status-presenter.ts` | `domain/values/story-reflection-config.ts` / `story-reflection-result.ts` / `phase-customization-policy.ts` | 3 |
| `ci-governance/presentation/handlers/generate-ci-template-handler.ts` | `domain/types/template-type.ts` | 1 |
| `ci-governance/presentation/handlers/scaffold-design-handler.ts` | `domain/value-objects/design-phase.ts` | 1 |
| `nyquist-validation/presentation/formatters/agent-matrix-formatter.ts` | `domain/services/ac-coverage-gate-policy.ts` | 1 |
| `nyquist-validation/presentation/formatters/human-matrix-formatter.ts` | `domain/services/ac-coverage-gate-policy.ts` | 1 |
| `traceability-model/presentation/cli/validate-metadata-command-handler.ts` | `domain/value-objects/project-relative-path.ts` | 1 |

**合計 8 件**。いずれも「presenter / formatter / CLI handler が domain VO/Service を直接読んで format/display する」パターンで、Clean Architecture 実装として一般的。

### 議論すべき論点

1. **Robert C. Martin 版 Clean Architecture** では presentation layer は Entity / VO / Domain Service を直接参照してよい（Interface Adapters ring に presenter が位置するため）
2. **DDD 版 Layered Architecture** では presentation → application → domain が standard で、presentation → domain の直接参照は議論あり（両論あり）
3. **phasegate の現行 spec** は DDD 厳格派の解釈を採用しているが、これが全ユーザーの期待と一致するかは別問題

### 選択肢

**A. LayerBoundary を緩めて `presentation → domain` を許可**
- `ALLOWED_DEPENDENCIES.presentation` に `'domain'` を追加
- 既存 8 件の違反が自動消化
- phasegate 導入先でも同じ緩和が適用される
- ADR として philosophy 変更を記録

**B. LayerBoundary 定義を config 化（ISSUE-014 と合流）**
- 既に起票済みの ISSUE-014「アーキテクチャスタイルの config 対応」と統合
- preset として `strict` / `clean-arch-classic` / `ddd-layered` を提供
- 既存ユーザーは strict を維持、新規ユーザーは選択可

**C. 既存コードを DTO mapping 経由に refactor**
- domain VO を application layer で DTO 化して presentation に渡す
- presentation は DTO のみを触る
- 8 件の違反全て refactor（見積り ~4h）
- 設計純度は最高だが工数大きく、他ユーザーへの強制は厳しい

## 修正案（推奨）

**選択肢 A または B**。本リポジトリ内での摩擦だけでなく、phasegate 導入先でも同じ判断が必要。ISSUE-014（アーキテクチャスタイル config 対応）と合流させて B を採用するのが体系的。

### Acceptance criteria（選択肢 B の場合）

- [ ] ISSUE-014 の config 設計に LayerBoundary preset が含まれる
- [ ] 既存 8 件の violation に対する回答（preset 変更 / config override / refactor）が明確
- [ ] `docs/ADR/` に philosophy 変更の記録

## 参照

- `scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:15-20`（ALLOWED_DEPENDENCIES）
- `scripts/harness/biome-ast-engine/domain/value-objects/layer-boundary.ts:31-45`（standardMatrix）
- `docs/principles/architecture-philosophy.md`（現行 philosophy）
- 関連 issue: ISSUE-003 Wave 4, ISSUE-014（アーキテクチャスタイル config 化）
