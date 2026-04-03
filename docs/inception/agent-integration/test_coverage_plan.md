# テストカバレッジ計画: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **Phase**: Phase 1（計画）
> **対応ストーリー**: H11-01〜H11-04

---

## 1. 目的

unit_test_design.md および it_test_design.md に記述されたテストケース設計を対象に、以下の4観点でカバレッジを検証する。

1. 受け入れ基準（AC）に対するテストケースのマッピング網羅性
2. ドメインロジック（不変条件・ビジネスルール・状態遷移）のカバー状況
3. UseCase正常系/異常系のカバー状況
4. APIカバレッジ（Hook Adapter 3本・統合フロー）

加えて、Engineering Perspective（ケント・ベック / マーティン・ファウラー / アンクル・ボブ / エリック・エヴァンス）の4視点で設計の品質を評価する。

---

## 2. インプット文書一覧

| 文書 | 役割 |
|------|------|
| `docs/product/units/agent_integration_unit.md` | 受け入れ基準（H11-01〜H11-04） |
| `docs/product/construction/agent-integration/domain_model.md` | エンティティ・VO・ドメインサービス・不変条件 |
| `docs/product/construction/agent-integration/logical_design.md` | 4層アーキテクチャ・UseCase・Infrastructure・Presentation設計 |
| `docs/product/construction/agent-integration/unit_test_design.md` | ユニットテストケース84件 |
| `docs/product/construction/agent-integration/it_test_design.md` | ITテストケース（UseCase・Adapter・Hook Adapter・統合フロー） |
| `docs/product/units/integration_contract.md` | CLI Contract・Shared Kernel型定義 |

---

## 3. 検証対象のAC一覧

### H11-01: CLI/FSフォールバック定義

- AC-1: L1-L4全バリデータがCLIコマンドから直接実行可能であることを検証するテスト
- AC-2: Claude Code Hookが無効な環境でも全バリデータが正常動作することを検証するテスト
- AC-3: coreモジュールが特定エージェントAPI（Claude Code Hook API等）をimportしていないことを検証するテスト
- AC-4: CLI/FSフォールバックの利用方法ドキュメント

### H11-02: PreToolUse Hook Adapter

- AC-5: `biome.json`（`.biome.json`含む）、`tsconfig.json`、`package.json`の変更をブロック
- AC-6: ブロック時に変更対象ファイル名を含むHarnessErrorを表示
- AC-7: ブロック対象外ファイルへの変更は正常に実行

### H11-03: PostToolUse Hook Adapter

- AC-8: 正規経路として `phasegate:lint --fast` を呼び出す
- AC-9: 500msタイムアウト内での完了を保証
- AC-10: Hook未使用時はCLI（`phasegate:lint`）で同等機能が実行可能
- AC-11: Hook実行テストの存在

### H11-04: Stop Hook Adapter

- AC-12: `phasegate:complete-check` を呼び出す（`pnpm test` + L1-L4全バリデータ）
- AC-13: `phasegate:complete-check` がfailを返した場合、エージェント完了を阻止
- AC-14: `stop_hook_active` フラグで再入を検出し、無限ループを防止
- AC-15: 再入検出時にStop Hookをスキップし、適切な警告メッセージを表示
- AC-16: Hook未使用時はCLI（`phasegate:complete-check`相当）で同等の完了チェックが実行可能

---

## 4. 検証スコープ

### 4.1 ユニットテスト（unit_test_design.md）

| コンポーネント | テストケース数 |
|-------------|-------------|
| ReentryGuard（エンティティ） | 11件（UT-RG-001〜031） |
| HookEvent（VO） | 8件（UT-HE-001〜021） |
| ProtectedFileList（VO） | 12件（UT-PFL-001〜041） |
| HookTranslationResult（VO） | 11件（UT-HTR-001〜031） |
| FallbackCapabilitySpec（VO） | 7件（UT-FCS-001〜021） |
| HookToCliTranslator（ドメインサービス） | 11件（UT-HTC-001〜030） |
| FallbackVerificationService（ドメインサービス） | 10件（UT-FVS-001〜030） |
| 境界値・異常系（横断） | 14件（UT-BV-001〜014） |

**合計: 84件**

### 4.2 ITテスト（it_test_design.md）

| 対象カテゴリ | テストケース数（概算） |
|-----------|-------------------|
| VerifyFallbackCapabilityUseCase | 6件 |
| HandlePreToolUseUseCase | 7件 |
| HandlePostToolUseUseCase | 6件 |
| HandleStopUseCase | 7件 |
| EnvFileReentryGuardStateAdapter | 10件 |
| HarnessConfigConfigQueryAdapter | 6件 |
| HarnessApiCliCommandRegistryAdapter | 4件 |
| TsMorphImportAnalyzerAdapter | 5件 |
| ChildProcessCliExecutorAdapter | 5件 |
| PreToolUse Hook Adapter（Presentation） | 7件 |
| PostToolUse Hook Adapter（Presentation） | 7件 |
| Stop Hook Adapter（Presentation） | 7件 |
| 統合フロー（Hook Flow Integration） | 5件 |

**合計: 約82件**

---

## 5. Engineering Perspective 評価観点

| 視点 | 評価観点 |
|------|---------|
| ケント・ベック | TDD適切性（Red-Green-Refactorサイクル前提の粒度、YAGNI、小さなステップ） |
| マーティン・ファウラー | テスト設計スメル（Test Method Too Long、テスト間依存、過剰セットアップ） |
| アンクル・ボブ | SOLID・責務分離（SRP、DIP、単一振る舞い検証） |
| エリック・エヴァンス | ドメイン表現（ユビキタス言語、ドメイン概念の正確な表現、責務分離） |

---

## 6. 成果物

| 成果物 | 配置先 |
|-------|-------|
| テストカバレッジレポート | `docs/product/construction/agent-integration/coverage_report.md` |

---

## 7. 完了条件

- [ ] 全ACに対するテストケースマッピング完了
- [ ] ドメインロジックカバレッジ詳細分析完了
- [ ] UseCaseカバレッジ詳細分析完了
- [ ] APIカバレッジ詳細分析完了
- [ ] Engineering Perspective 4視点評価完了
- [ ] coverage_report.md 作成完了
