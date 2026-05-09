---
id: WI-012
type: issue
severity: normal
status: tested
legacy_id: ISSUE-012
affects: [harness-api, config-foundation]
---

# ISSUE-012: pre-commit フィルタの拡張子設定化（実装言語の網羅対応）

## ステータス

- **状態**: ✅ **TESTED**（`preCommit.implementationExtensions` を追加し、pre-commit の実装ファイル判定を設定化）
- **優先度**: P3
- **起票日**: 2026-04-19
- **発見契機**: ISSUE-008 Phase B-3 着手時の調査で、実装メタデータ検証ロジック（軽量/リッチ両方）が既に言語非依存（正規表現ベース）である一方、pre-commit の staged ファイルフィルタだけが `.ts` 固定でハードコードされている事実を確認
- **影響Unit**: harness-api（pre-commit エントリ）, validator-system（任意: ポート拡張の余地あり）
- **深刻度**: P3（機能的な欠陥ではなく拡張性の課題。現状 TypeScript 中心の利用想定では運用可）
- **優先度**: P3 — 他言語プロジェクトでの導入要望が顕在化した段階で着手

## 問題の概要

`scripts/harness/integrations/pre-commit.ts:67` の以下のフィルタが `.ts` ファイル固定:

```typescript
const tsFiles = stagedFiles.filter((f) => f.endsWith('.ts'));
```

一方で検証ロジックの中身は言語非依存:

- **軽量 validator** (`TraceabilityMetadataPolicyAdapter`): `@unit\s+\S+` / `@layer\s+\S+` / `@story-id\s+H\d{2}-\d{2}` の正規表現マッチのみ。コメント構文（`//`, `#`, `--` 等）を問わない
- **リッチ validator** (`MetadataValidator.validateImplementation`): `.md` 以外は全て implementation UseCase に流れる設計。拡張子依存ロジックは持たない

つまり Python (`# @unit foo`) / Go (`// @unit foo`) / Rust / Java / Ruby / PHP / C# などの実装ファイルは、**フィルタさえ通せば既存の検証ロジックがそのまま動作する**。

## 影響範囲

- 他言語をメインにするプロジェクトが phasegate を導入した際、pre-commit が実装ファイルを検出できず検証スキップ扱いになる
- ISSUE-008 Phase B-2 / B-3 で整備した `validate-metadata` CLI は `.py` 等も既に検証可能（CLI 側は拡張子フィルタを持たない）が、**pre-commit 自動実行経路では検出されない非対称**が発生

## 修正案

### 案 A: `phasegate.config.json` で拡張子集合を設定可能化（推奨）

```json
{
  "preCommit": {
    "implementationExtensions": [".ts", ".tsx"]
  }
}
```

デフォルトは `[".ts", ".tsx"]` を維持（後方互換）。他言語プロジェクトは `[".py", ".go"]` 等に差し替え。

**利点**:
- pre-commit.ts の変更は 1 箇所（`.ts` 固定 → 設定値参照）
- 既存ユーザーへの影響ゼロ
- テスト側は別枠（`.test.ts` / `.spec.ts` 等）として分離設定可能にもなる

**欠点**:
- config schema 変更と ajv 検証追加が必要

### 案 B: 拡張子集合をハードコードで拡張

`.ts` 固定 → `['.ts', '.tsx', '.py', '.go', '.rs', ...]` の Set にハードコード。

**利点**: 実装最速
**欠点**: プロジェクトごとに不要な拡張子まで全部検証対象になり、ノイズが増える

### 案 C: 拡張子ではなく「path pattern」で設定（将来の案）

glob パターン（例: `src/**/*.py`）で指定。より柔軟だが過剰仕様。

**推奨**: **案 A**。案 B は設定表現力が足りず、案 C は現時点の要件には過剰。

## 受け入れ基準

- [x] `phasegate.config.json` に `preCommit.implementationExtensions: string[]` を追加（デフォルト `[".ts"]`）
- [x] `pre-commit.ts` のフィルタが config 参照に変更される
- [x] 既存テスト（`.ts` のみ対象の挙動）が後方互換で維持される
- [x] 新規テスト: config に `.py` を追加した際、staged `.py` ファイルが検証対象になること
- [x] config の ajv schema に VALID / INVALID ケースを追加
- [x] ドキュメント更新: `docs/guide/` 配下に「他言語プロジェクトでの導入手順」を追記

### 完了証跡（2026-05-09）

- `pnpm exec vitest run scripts/harness/__tests__/unit/harness-api/pre-commit.test.ts scripts/harness/__tests__/integration/config-foundation/ajv-config-schema-validator.test.ts scripts/harness/__tests__/unit/config-foundation/preset-resolution-service.test.ts` — 3 files / 57 tests passed
- `pnpm exec tsc --noEmit` — passed

## 非対象（スコープ外）

- **L1 Biome AST ルールの他言語対応**: Biome 自体の制約（TS/JS/JSX/TSX/CSS/JSON のみ）。本 issue は L2 pre-commit 経路のみ対象
- **`@unit` / `@layer` アノテーション構文の言語別バリエーション**: 現在の `// @unit` 形式がコメント構文の違いで読めない言語（Python の `# @unit`, SQL の `-- @unit` 等）は存在するが、正規表現は構文を問わないため実害なし。「`// @unit`」表記を必須にしないという運用ルールの明文化は docs/principles/ 側で別途検討
- **L3 CI / L4 scheduled 検証の言語拡張**: これらは GitHub Actions / scheduled job のスクリプト側で独立に判定している。本 issue は pre-commit のみ

## 関連

- **ISSUE-008 Phase B-3**: 本 issue の起票契機。Phase B-3 では `.md` 追加に専念し、他言語対応は本 issue に分離
- `scripts/harness/integrations/pre-commit.ts:67` — 主修正対象
- `scripts/harness/validator-system/infrastructure/adapters/traceability-metadata-policy-adapter.ts:18-20` — 既に言語非依存であることを確認済み
- `scripts/harness/traceability-model/presentation/cli/validate-metadata-command-handler.ts` — CLI 側は既に言語非依存（`.md` 以外は全て implementation 扱い）

## 推奨実装順

1. **Wave 1**: `phasegate.config.json` schema 拡張 + 型定義追加
2. **Wave 2**: `pre-commit.ts` のフィルタ置き換え + テスト追加
3. **Wave 3**: ドキュメント整備（多言語サポートガイド）

各 Wave は独立の PR として起票可能。Wave 1-2 は 1 PR に同梱しても良い軽微な規模。
