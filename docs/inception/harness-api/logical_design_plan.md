# 論理設計計画: harness-api
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20
**対応Unit**: harness-api

## 1. スコープ
- 対象Unit: harness-api
- 影響するストーリー: H09-01, H09-02, H09-03, H09-04

## 2. 設計方針

`docs/product/construction/harness-api/logical_design.md` に記録された主要設計判断:

- **薄いCLI契約レイヤー**: harness-apiは実行ロジックを持たない。CLIの入出力変換・ディスパッチ・終了コード管理に責務を限定し、実行委譲先（validator-system / biome-ast-engine / phase-dependency-model等）にPort経由で委譲する
- **CliCommandを集約にしない**: CliCommandのライフサイクルは初期登録のみで実行時に状態変化しない。biome-ast-engine RuleDefinition VO / validator-system ValidatorDefinition VOと同等のVOパターンを踏襲（domain_model.md D1）
- **CommandRegistry一元管理**: 全CLIコマンド名の定義権限はharness-apiが所有。INV-1（名前一意性）をCommandRegistryドメインサービスが担保
- **StatusDerivationService独立化**: H09-04のArtifactScanResult → LayerHealth[] → HarnessStatusSummary変換はCommandDispatchServiceから分離した独立ドメインサービスとして実装（domain_model.md D2）
- **HarnessApiResponse\<T\>をgenericに**: `{ status, errors[], summary, data?: T }` の共通envelopeでコマンド別payloadを型安全に表現（domain_model.md D3）
- **ExitCode規約統一**: 0（pass）/ 1（fail/未検出）/ 2（error）の3値を全8コマンドで統一。phasegate:statusのみ0/2のみ（Fail状態が正常な表示結果のため）
- **成果物駆動の状態導出**: phasegate:statusはDBやステートファイルではなく、ファイルシステム上の成果物の存在から状態を導出（domain_model.md D5 / K13）

## 3. 採用パターン
- Hexagonal Architecture（Port & Adapter）
- domain → application → infrastructure → presentation
- ドメインサービス3本: CommandRegistry（コマンド一元管理）、CommandDispatchService（実行委譲）、StatusDerivationService（成果物駆動状態導出）
- 6本のポート: ValidatorExecutionPort / PhaseGateQueryPort / BiomeLintPort / ImpactAnalysisPort / ArtifactScannerPort / ConfigQueryPort
- Cross-Unit Contract DTO: HarnessApiResponse\<T\> は `scripts/harness/shared-kernel/harness-api.ts` から再エクスポート

## 4. QA
なし（実装完了後の遡及記録）
