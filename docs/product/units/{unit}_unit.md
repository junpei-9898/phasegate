# Unit Definition Placeholder

> **注意**: このファイルは Phase Gate の Level 1 `unit-designer` ノードが参照する `{unit}` placeholder パスのための stub です。
>
> 本来 `{unit}_unit.md` は各 Unit ごとに `docs/product/units/{unit-name}_unit.md` の形で存在します（例: `agent-integration_unit.md`、`phase-dependency-model_unit.md`）。
>
> 現行の `collectMissingArtifactBlockers()` ロジックは Level 1 スコープで `{unit}` placeholder を解決しないため、このファイルを literal path として存在させることで Phase Gate の存在チェックを通過させています。
>
> **将来の対応**: Phase Gate の Level 1 checking が placeholder を適切に処理するようになれば、このファイルは削除可能です。

## 既存の Unit 定義ファイル

実際の Unit 定義は以下に配置されています:

- `docs/product/units/agent_integration_unit.md`
- `docs/product/units/phase_dependency_model_unit.md`
- `docs/product/units/traceability_model_unit.md`
- `docs/product/units/biome_ast_engine_unit.md`
- その他すべての Unit 定義ファイル

## ステータス

- **作成日**: 2026-04-05
- **目的**: Phase Gate self-hosting 通過のための stub
- **削除条件**: Level 1 `unit-designer` の placeholder 解決バグ修正時
