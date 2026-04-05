# 論理設計計画: agent-integration
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20

## QA（設計判断の根拠）

### Q1: Adapter 層の責務範囲
- **Q**: agent-integration がバリデーション・CLI コマンド仕様まで持つか、薄い Adapter に限定するか？
- **A**: **薄い Adapter 層に限定**。バリデーションロジック・CLI コマンド仕様は harness-api が所有。
- **根拠**: Unit 境界の明確化。agent-integration は hook イベント → CLI コマンド変換のみ担当。

### Q2: ReentryGuard の状態管理方式
- **Q**: Stop Hook の無限ループ防止（stop_hook_active フラグ）をどこで管理するか？
- **A**: **agent-integration Unit 内の Entity**。inactive → active → inactive の状態遷移を Entity として表現。
- **根拠**: 状態ライフサイクルを持つためドメインモデル化が自然。

### Q3: HookEvent → CLI 変換の独立性
- **Q**: 変換ロジックをどこに配置するか？
- **A**: **HookToCliTranslator ドメインサービス**。HookEvent（VO）を HookTranslationResult（VO）に変換するドメインサービスとして独立。
- **根拠**: 変換は複数 HookEvent 種別を横断するため Entity でなくサービスが適切。

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
