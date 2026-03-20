# ITテスト設計計画: skill-quality
**作成日**: 2026-03-20

## 1. スコープ
- 対象: skill-quality
- 対応ストーリー: H12-01, H12-02, H12-03, H12-04, H12-05, H12-06
- テストケース総数: ITテスト設計書（it_test_design.md）に記載の全テストケース

## 2. 構成

対象コンポーネント:
- **UseCase**: ExecuteTddCycleUseCase, CheckCoverageUseCase, RunPlanCheckerLoopUseCase, CollectLessonsUseCase, WriteLessonArtifactUseCase, ApplyCascadeUpdateUseCase, ValidateSkillStructureUseCase
- **Infrastructure Adapter**: GitCommitExecutorAdapter, L1BiomeValidatorAdapter, L2ValidatorSystemAdapter, FileSystemLessonSourceReaderAdapter, FileSystemLessonArtifactWriterAdapter, AjvLessonArtifactSchemaAdapter, FileSystemRequirementTestMatrixAdapter, ValidatorIdRegistryBridgeAdapter, HarnessConfigQueryAdapter, VitestCoverageRunnerAdapter, FileSystemSkillFileReaderAdapter
- **Presentation Handler**: ExecuteTddCycleHandler, CheckCoverageHandler, RunPlanCheckerLoopHandler, CollectLessonsHandler, ApplyCascadeUpdateHandler, ValidateSkillStructureHandler

テスト配置: `scripts/harness/__tests__/integration/skill-quality/`

主な設計方針:
- UseCaseテストは Port を vi.mock() でスタブ化
- Adapterテストは実ファイルシステム or fixtures 使用
- Handlerテストは UseCase モックでCLI入出力を検証

## 3. QA
なし（遡及記録）
