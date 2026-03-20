# 論理設計計画: agent-integration
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20

## 1. スコープ
- 対象Unit: agent-integration
- 影響するストーリー: H11-01, H11-02, H11-03, H11-04

## 2. 設計方針

`docs/product/construction/agent-integration/logical_design.md` より抽出した主要設計決定:

- **薄いAdapter層の原則**: 本Unitはhook/FSイベントをharness-api CLIコマンドに変換する薄いAdapter層に限定する。バリデーションロジックやCLIコマンド仕様はharness-apiが所有
- **ReentryGuard**: `stop_hook_active` フラグ管理によるStop Hook無限ループ防止。状態遷移（inactive→active→inactive）をエンティティとして維持
- **HookToCliTranslator**: HookEvent（PreToolUse/PostToolUse/Stop）をHookTranslationResult（CLIコマンド指定）に変換するドメインサービス
- **FallbackVerificationService**: coreモジュールのエージェント固有API非依存性をImportAnalyzerPortで検証
- **ProtectedFileList**: biome.json/.biome.json/tsconfig.json/package.json を保護対象とするデフォルトパターン（ドメイン層にハードコード）
- **PostToolUse 500msタイムアウト**: HookTranslationResultにtimeoutMs=500を宣言。制御はCliExecutorPortに委譲
- **infrastructure層にエージェント固有依存を閉じ込める**: domain/application層はClaude Code Hook APIを参照しない

## 3. 採用パターン
- Hexagonal Architecture (Port & Adapter)
- domain → application → infrastructure → presentation
- ポート定義: ReentryGuardStatePort / ImportAnalyzerPort / CliCommandRegistryPort / ConfigQueryPort / CliExecutorPort

## 4. QA
なし（遡及記録）
