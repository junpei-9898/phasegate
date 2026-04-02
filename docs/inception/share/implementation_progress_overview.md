# Phasegate — 実装進捗と今後のロードマップ

> **最終更新**: 2026-03-16
> **対象**: Wave 1 完了時点

---

## 1. 現在の状態サマリ

**Wave 1 で「ハーネスの骨格」が完成し、L1 lint が動作する状態になった。**

6つのコアUnit（ドメインモデル + ユースケース + インフラ + CLI）が実装され、`harness` コマンドで実行可能。`harness lint` は8つのL1ルールでコードを検査し違反を検出できる（500ファイルスキャン、671違反検出を確認済み）。次のステップは Biome v2 移行（GritQL化 + ESLint完全除去）。

### 一言でいうと

> **ハーネスの「枠組み」「データモデル」「L1 lint検査」が動作する。次は Biome v2 移行と ESLint 除去。**

---

## 2. 今なにができる状態なのか

### CLI で実行できるコマンドと動作状況

| コマンド | 動作 | 実用度 |
|---|---|---|
| `harness list-errors` | 18個のHarnessError定義を一覧表示（human/json） | **実用可能** |
| `harness render-errors` | HarnessError配列を人間/エージェント/CI向けにフォーマット | **実用可能** |
| `harness validate-fix` | fix_example のコード片がパース可能か検証 | **実用可能** |
| `harness list-features` | phasegate.config.json の機能トグル状態を表示 | **実用可能** |
| `harness enable-feature` / `disable-feature` | 機能トグルの切替・永続化 | **実用可能** |
| `harness check-phase-gate` | 指定レベルのPhase Gate通過判定 | **実用可能** — ただし検査対象ファイルのセットアップが必要 |
| `harness validate-metadata` | ファイルの @unit/@layer メタデータ検証 | **実用可能** — ただし対象ファイルを引数で指定する必要あり |
| `harness list-adrs` / `validate-adr` | ADR一覧表示・フロントマター検証 | **実用可能** |
| `harness lint` | Biome AST解析 + L1ルール8種 + インポートグラフ構築 | **実用可能** — 500ファイルスキャン、671違反検出確認済み |

### 設定システム

| 機能 | 状態 |
|---|---|
| `phasegate.config.json` v2スキーマ | **完成** — JSON Schemaバリデーション付き |
| 3プリセット（minimal / standard / strict） | **完成** — プリセット解決が動作 |
| config → 他Unit への Cross-unit 注入 | **完成** — phase-dependency-model, biome-ast-engine に注入済み |

### ドメインモデルとビジネスロジック

| ドメイン | 状態 | 含まれるロジック |
|---|---|---|
| HarnessError | **完成** | 18エラーコード定義（L1×8, L2×3, L3×4, L4×3）、重要度/カテゴリ/ADR参照/fix_example付き |
| Config Foundation | **完成** | プリセット解決、機能トグル、活性化ルール（bundleSizeLimit条件）、スキーマバリデーション |
| Traceability Model | **完成** | メタデータパーサー、ストーリーカタログ、デザインドキュメントゲートウェイ、トレーサビリティチェーン構築 |
| Phase Dependency Model | **完成** | Phase Gate判定、エビデンスバンドル組立、カスタマイズポリシー、監査ログ |
| ADR Foundation | **完成** | ADRパーサー（フロントマター/ID/ステータス）、バリデーション、一覧取得 |
| Biome AST Engine | **完成** | ルール定義レジストリ、インポートグラフ構築、Lint実行、ESLint残留検出 |

---

## 3. Product Overview との対応 — 何が実装済みで何が未実装か

### 3.1 4層防御モデル（K1）

```
          Product Overviewの定義                Wave 1 の実装状況
          ─────────────────                    ──────────────────

L1 EDITOR  8つのBiome ASTルール                 ルール定義レジストリ ✅
           (require-unit-comment等)             TS実装（LintRunner）  ✅ 8ルール全動作
           importグラフ解析                     ImportGraphBuilder   ✅ ドメインロジック完成
           循環依存検出                          LintRunner           ✅ ドメインロジック完成
                                                BiomeCLI連携         ✅ biome check統合済み
                                                GritQLネイティブ化   ⚠️  Biome v2移行で対応予定

L2 PRE-    phase-gate バリデータ                 CheckPhaseGateUseCase ✅
COMMIT     metadata バリデータ                   MetadataValidator     ✅
           test-quality バリデータ               ❌ 未実装
           git pre-commit Hook統合              ❌ 未統合

L3 CI      security バリデータ                   ❌ 未実装
           performance バリデータ                ❌ 未実装
           coverage バリデータ                   ❌ 未実装
           nyquist バリデータ                    ❌ 未実装

L4 SCHED   drift-detect バリデータ               ❌ 未実装
           consistency-check バリデータ          ❌ 未実装（スキルとしては存在）
           dead-code バリデータ                  ❌ 未実装
```

### 3.2 コアシステム

| システム | Product Overviewの定義 | Wave 1 状態 |
|---|---|---|
| **HarnessError** (K5相当) | 全バリデータがADR参照+fix_example付きで統一フォーマット出力 | ✅ 定義完成。ただしfix_exampleの充実度はバリデータ実装に依存 |
| **Traceability Model** (K3.5) | 実装→Unit→設計→US→計画の逆引きチェーン | ✅ ドメインモデル+ゲートウェイ完成。バリデータ（L1/L2/L3/L4）との統合は未 |
| **Phase Dependency Model** (K2, K14) | 3層フェーズ構造の機械的強制 | ✅ ドメインモデル+UseCase完成。pre-commitへの統合は未 |
| **phasegate.config.json v2** (K13) | 品質設定のSingle Source of Truth | ✅ 完成。スキーマ+プリセット+バリデーション+Cross-unit注入 |
| **2-Phase Execution** (K6) | 設計スキルのPhase 1→承認→Phase 2 | ⚠️ スキルシステム側で実装済み（ハーネス外） |
| **Quick Mode** | 軽微変更向けのハーネス緩和 | ❌ 未実装 |
| **Nyquist Validation** | 要件→テスト双方向トレーサビリティ | ❌ 未実装 |
| **Cascade Updater** (K8) | 下位変更→上位設計への影響伝播 | ⚠️ スキルとして存在。バリデータ統合は未 |
| **Agent-Lesson System** (K9) | エージェントの学習ログ収集 | ❌ 未実装 |

### 3.3 CI/CD統合

| 成果物 | 状態 |
|---|---|
| `aidlc-gate.yml`（PR検証ワークフロー） | ❌ 未作成 |
| `consistency-check.yml`（週次整合性チェック） | ❌ 未作成 |
| `.husky/pre-commit` テンプレート | ❌ 未作成 |
| リンター設定保護Hook | ❌ 未作成 |
| Stopフックテストゲート | ❌ 未作成 |

---

## 4. アーキテクチャ品質

Wave 1 で確立されたアーキテクチャ基盤:

- **Hexagonal Architecture**: 全6Unit × 4レイヤー（domain/application/infrastructure/presentation）
- **277ファイル / 1,345テスト** — 全パス
- **Composition Root パターン**: Unit単位のファクトリ関数でPort→Adapter結線
- **Barrel Exports**: Unit単位の公開API定義
- **Cross-unit Wiring**: config-foundation の解決済み設定を他Unitに型安全に注入
- **CLIエントリポイント**: 11コマンドを統一ディスパッチャーで提供

---

## 5. 今後のロードマップ

### Wave 2: Biome v2 移行 + ESLint 完全除去（最優先）

Biome v2（GritQL プラグイン対応）への移行とESLint依存の完全除去。Rust/WASM は不要（Biome v2 では GritQL `.grit` ファイルでカスタムルールを定義）。

| タスク | 内容 | 依存 |
|---|---|---|
| Biome v2 アップグレード | `@biomejs/biome` v1.9.4 → v2.4+、`biome.json` v2形式作成 | なし |
| GritQL ルール作成 | L1-001（require-unit-comment）、L1-002（require-layer-comment）を `.grit` ファイルで定義 | Biome v2 |
| LintRunner/Adapter 統合 | BiomeNative結果 + TS評価結果の統合、L1-003〜L1-008はTS実装を維持 | Biome v2 |
| ESLint 完全除去 | `scripts/harness/eslint-rules/` 削除、ESLint依存パッケージ削除 | 上記全て |
| パリティテスト | 移行前後で `harness lint` の検出結果が同等であることを確認 | 上記全て |

> 詳細: `docs/inception/biome-ast-engine/biome_wasm_migration_plan.md`

### Wave 3: L2 Pre-commit統合

| タスク | 内容 |
|---|---|
| phase-gate バリデータ統合 | `CheckPhaseGateUseCase` をpre-commitフローに組み込み |
| metadata バリデータ統合 | `MetadataValidator` をpre-commitフローに組み込み |
| test-quality バリデータ新規実装 | AAA, actual命名, single-act等のテスト品質ルール |
| `.husky/pre-commit` テンプレート | git hookとしてL2バリデータを自動実行 |

### Wave 4: L3 CIバリデータ

| タスク | 内容 |
|---|---|
| security バリデータ | ハードコード秘密、SQLインジェクション検出 |
| performance バリデータ | ループ内await、N+1クエリ、bundleSizeLimit |
| coverage バリデータ | テストカバレッジ閾値検証 |
| nyquist バリデータ | 要件→テスト双方向トレーサビリティ + requirement-test-matrix.json |
| `aidlc-gate.yml` | PR検証ワークフローテンプレート |

### Wave 5: L4 Scheduled + 横断機能

| タスク | 内容 |
|---|---|
| drift-detect バリデータ | 設計⇔コード双方向乖離検出 |
| consistency-check バリデータ | 文書間整合性チェック |
| dead-code バリデータ | 未使用エクスポート、到達不能コード |
| Quick Mode | ハーネス緩和ルールの実装 |
| Agent-Lesson System | エージェント学習ログ収集基盤 |
| `consistency-check.yml` | 週次スケジュールワークフロー |

---

## 6. 既知の問題

| 問題 | 影響 | 対応方針 |
|---|---|---|
| ~~`harness lint` で `Invalid LayerName: usecase`~~ | ~~lintコマンド全体が動作不可~~ | **解決済み** — `LayerName.tryFromString()` で未知レイヤーをnull扱い |
| Biome v1.9.4 → v2.4+ 未移行 | GritQLプラグインが利用不可 | Wave 2 で対応 |
| ESLint レガシールールが残存 | `scripts/harness/eslint-rules/` が不要なまま残っている | Wave 2 で完全除去 |
| L1-001/L1-002 が Biome ネイティブでない | エディタ保存時のリアルタイム検出不可 | Wave 2 で GritQL 化 |
| pre-commit Hook未統合 | commit時の自動品質チェック不可 | Wave 3 で対応 |
| fix_example の実データ不足 | エラー定義にfix_exampleが空のものあり | バリデータ実装と並行して充実 |
