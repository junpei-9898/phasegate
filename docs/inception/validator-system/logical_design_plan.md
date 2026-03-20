---
# 論理設計計画: validator-system
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20
**対応Unit**: validator-system

## 1. スコープ
- 対象Unit: validator-system
- 影響するストーリー: H08-01, H08-02, H08-03, H08-04, H08-05, H08-06

## 2. 設計方針

L2-L4バリデータ全6種を「統一バリデータ実行インターフェース」で一元管理する設計を採用した。主要な設計判断は以下の通り。

- **ValidatorDefinition VOパターン（D1）**: バリデータ定義はライフサイクルを持たない値オブジェクトとして表現する。`validatorId`, `layer`, `enabled` はHarnessConfigV2から導出されるため、集約ルートを設けず不変VOとして扱う。
- **サブモジュール分離**: 6バリデータを `l2/`（test-quality）、`l3/`（security, performance, coverage）、`l4/`（drift-detect, consistency-check, dead-code）に内部分離し、テストスイートも独立させる。
- **HarnessError出力パイプライン統一**: 全バリデータのエラー出力はHarnessError型に統一。`code`フィールドにバリデータID（L2-003, L3-001等）を使用し、`fix_example`と`adr_ref`を付与する。
- **Preset連動制御**: strictプリセット限定機能（bundleSizeLimit: H08-02、deadCodeGC: H08-06）はconfig-foundationのPreset解決結果に基づく。バリデータ側でPreset判定ロジックを持たない。
- **biome-ast-engineとの責務分離**: L1バリデータ（Biomeプラグイン）はbiome-ast-engineが所有。本Unitは L2-L4 のみを担当し、L1結果は参照のみ行う。
- **UseCase単位対応**: 各ストーリー（H08-01〜H08-06）をUseCase1種に対応させ、Application層でのストーリー間の独立性を保つ。

## 3. 採用パターン
- アーキテクチャ: Hexagonal Architecture（Port & Adapter）
- 層構成: domain → application → infrastructure → presentation
- 依存方向: `domain <- application <- infrastructure` / `domain <- application <- presentation`
- 値オブジェクト8種（ValidatorId, ValidatorDefinition, ValidationRule, ValidationResult, LayerConfig, DriftReport, ConsistencyReport, DeadCodeReport）
- ドメインサービス5種（ValidatorRegistry, ValidatorExecutionService, DriftDetectionService, ConsistencyCheckService, DeadCodeDetectionService）
- ドメインポート12種（インフラ実装を抽象化）
- UseCase6種（H08-01〜H08-06対応）
- CLIハンドラー3種（RunValidatorsHandler, RunQuickModeHandler, ReportValidationResultsHandler）
- フォーマッター3種（human / agent / ci形式）

## 4. QA
なし（実装完了後の遡及記録のため）
