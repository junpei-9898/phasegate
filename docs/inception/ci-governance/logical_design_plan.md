# 論理設計計画: ci-governance
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20

## 1. スコープ
- 対象Unit: ci-governance
- 影響するストーリー: H13-01, H13-02, H13-03

## 2. 設計方針

`docs/product/construction/ci-governance/logical_design.md` より抽出した主要設計決定:

- **3集約構成**: CiTemplate（永続化なし）/ ErrorRepetition（`.harness/error-history.json`永続化）/ AgentsMdPointer（AGENTS.md永続化）
- **CiTemplate永続化なし（D1）**: Preset設定から都度導出可能なため、リポジトリポートなし。TemplateRendererPortへYAML書き出しを委譲
- **TemplateType×TriggerConditionマッピングはTemplateGenerator責務（D6）**: aidlc-gate→pull_request、consistency-check→schedule、pre-commit→pre-commit のマッピングはドメインロジック
- **RepetitionDetectorのRepositoryPort直接注入（D2）**: ドメインサービスがErrorRepetitionRepositoryPortをコンストラクタ注入で受け取り、load/save責務を委譲
- **AgentsMdPointerはファイルI/OをAgentsMdPortに完全委譲（D3）**: Dead Pointer禁止（INV-9）はPointerValidatorドメインサービスが担保
- **LessonArtifact SchemaはJSONスキーマとしてCross-Unit Contract公開（D4）**: `docs/contracts/lesson-artifact.schema.json`。skill-qualityはci-governanceドメイン層を直接インポートしない
- **EscalationAction（VO）は宣言的定義のみ（D5）**: 実行はEscalationExecutorPort（インフラ層）に委譲
- **エスカレーション閾値デフォルト3回**: harness.config.json未設定時のデフォルト値

## 3. 採用パターン
- Hexagonal Architecture (Port & Adapter)
- domain → application → infrastructure → presentation
- ポート定義（計10本）: ValidatorIdRegistryPort / PresetConfigPort / ErrorRepetitionRepositoryPort / CommandExistencePort / FileExistencePort / AgentsMdPort / LessonArtifactReaderPort / AdrExistencePort / TemplateRendererPort / EscalationExecutorPort

## 4. QA
なし（遡及記録）
