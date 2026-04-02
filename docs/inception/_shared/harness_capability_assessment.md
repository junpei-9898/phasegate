# Phasegate 機能棚卸し・価値評価

> **作成日**: 2026-03-25
> **目的**: ハーネスの「実際に動く機能」と「設計文書のみの機能」を棚卸しし、コアバリューの実現状況を評価する
> **動機**: pre-tool-use hookのフェーズゲート強制が機能していなかったことが発覚。「今まで実装した機能は一体何だったのか？」を明確にする

---

## 1. コアバリューの定義

Phasegateの存在意義は **「AIエージェントが設計プロセスをスキップして実装に入ることを機械的に防止し、設計→実装の品質フローを強制すること」** にある。

### コアバリューの3要素

| # | 要素 | 説明 |
|---|------|------|
| **V1** | フェーズゲート強制 | 設計文書なしでソースコードが書けない |
| **V2** | 設計順序制約の強制 | domain_model → logical_design → test_design の順序を破れない |
| **V3** | 品質の継続検証 | Lint、メタデータ、テスト品質、AC網羅性を自動検証 |

---

## 2. 実装済み機能の全体マップ

### 2.1 Unit一覧（19 Unit）

| # | Unit | 主要機能 | 実装状態 |
|---|------|---------|---------|
| 1 | **config-foundation** | phasegate.config.json の読み取り・スキーマ検証 | ✅ 完全動作 |
| 2 | **harness-error** | エラー定義カタログ・レンダリング | ✅ 完全動作 |
| 3 | **traceability-model** | ストーリーカタログ・メタデータ検証 | ✅ 完全動作 |
| 4 | **phase-dependency-model** | 15フェーズノード・17依存関係・checkPhaseGate() | ✅ 完全動作 |
| 5 | **adr-foundation** | ADR管理・検証 | ✅ 完全動作 |
| 6 | **biome-ast-engine** | Biome CLI連携・AST解析・Import Graph | ✅ 完全動作 |
| 7 | **validator-system** | 12バリデータ(L0-L4)・実行オーケストレーション | ⚠️ 部分動作（後述） |
| 8 | **quick-mode** | Quick Mode適格判定・緩和プロファイル | ✅ 完全動作 |
| 9 | **harness-api** | 高レベルAPI統合・ステータス導出 | ✅ 完全動作 |
| 10 | **ci-governance** | CIテンプレート生成・エラー反復追跡 | ✅ 完全動作 |
| 11 | **skill-quality** | TDDサイクル実行・カバレッジ検証・教訓収集 | ✅ 完全動作 |
| 12 | **regression-suite** | K要件・GnGゲート・エージェント独立性テスト | ✅ 完全動作 |
| 13 | **fuse-hooks-engine** | FUSE連携・.harness-hooks.yml・完了ゲート | ✅ 動作（L0無効時はフォールバック） |
| 14 | **phase2-extensions** | 文書鮮度チェック・ポインタ検証・E2Eテンプレート | ✅ 完全動作 |
| 15 | **nyquist-validation** | AC網羅性マトリクス・カバレッジ計算 | ✅ 完全動作 |
| 16 | **agent-integration** | pre/post-tool-use hook・保護ファイル・フェーズゲート | ⚠️ 重大課題あり（後述） |
| 17 | **shared-kernel** | Result型・共通VO | ✅ 完全動作 |
| 18 | **setup** | スキルデプロイ・初期化 | ✅ 完全動作 |
| 19 | **integrations** | pre-commitフック統合 | ✅ 完全動作 |

### 2.2 CLI コマンド（50+）

すべてのCLIコマンドは `npx harness <command>` で実行可能。主要コマンド群:

| カテゴリ | コマンド数 | 代表コマンド |
|---------|----------|------------|
| セットアップ | 2 | `init`, `update-skills` |
| 機能管理 | 3 | `enable-feature`, `disable-feature`, `list-features` |
| エラー管理 | 3 | `render-errors`, `validate-fix`, `list-errors` |
| コア検証 | 4 | `validate`, `lint`, `ci-check`, `check-phase-gate` |
| Harness API | 7 | `harness:status`, `harness:check-phase`, `harness:ci-check` 等 |
| ADR | 2 | `list-adrs`, `validate-adr` |
| CI統制 | 3 | `ci:generate-template`, `ci:migrate-agents-md`, `ci:check-repetition` |
| スキル品質 | 5 | `skill:execute-tdd-cycle`, `skill:check-coverage` 等 |
| 回帰テスト | 6 | `regression:run-k-requirements` 等 |
| FUSE Hooks | 2 | `hooks:config`, `hooks:gate-check` |
| Phase 2拡張 | 3 | `p2:check-freshness`, `p2:validate-pointers`, `p2:generate-e2e-template` |

### 2.3 スキル（28スキル）

スキルは**AI/人間向けのプロンプト定義**（markdownファイル）。ランタイムコードではないが、AIDLC設計プロセスを構造化する重要な役割を果たす。

| カテゴリ | スキル数 | スキル名 |
|---------|---------|---------|
| アーキテクチャ・設計 | 6 | product-architect, unit-designer, domain-designer, logical-designer, environment-designer, uiux-designer |
| ストーリー管理 | 3 | story-writer, story-mapper, implementation-planner |
| テスト設計 | 6 | unit-test-designer, unit-test-logic-designer, it-test-designer, it-test-logic-designer, scenario-test-designer, scenario-test-logic-designer |
| 実装・品質 | 8 | implementation-readiness-checker, story-implementor, quick-implementor, test-coverage-checker, consistency-checker, cascade-updater, codebase-mapper, codex-delegator |
| サポート | 5 | mock-designer, doc-freshness-checker, pointer-validator, engineering-perspective, skill-creator |

---

## 3. 5層防御モデルの実態

### 3.1 レイヤー別の実装・動作状況

#### L0 — FUSEフック（ファイルシステムイベント監視）

| 項目 | 状態 |
|------|------|
| 有効化設定 | `layers.L0_fuse.enabled: false` |
| バリデータ | L0-001 (FUSE hook config), L0-002 (FUSE mount status) |
| 実行方法 | `npx harness validate --layer L0` |
| **実際の動作** | **無効。** fuse-nativeが必要。macOS/Linux向け。グレースフルフォールバックで無効時もエラーなし |
| **価値** | L0が有効なら、ファイルシステムレベルで書き込みを監視・ブロックできる。現状は未稼働 |

#### L1 — エディタ/ASTチェック

| 項目 | 状態 |
|------|------|
| 有効化設定 | `layers.L1_editor.enabled: true` ✅ |
| バリデータ | L1-017 (ITテスト内部モック検出), L1-018 (スタブコメント残留検出), L2-013 (CLIコマンドE2Eテスト存在) |
| 実行方法 | `npx harness lint` |
| **実際の動作** | **動作する。** Biome CLIを呼び出してAST解析を実行。Import Graph構築。ITテストでの`vi.mock()`使用を検出 |
| **価値** | コード品質の静的検証。ただし**能動的ブロックではなくレポート出力** |

#### L2 — Pre-commitチェック

| 項目 | 状態 |
|------|------|
| 有効化設定 | `layers.L2_precommit.enabled: true` ✅ |
| バリデータ | L2-001 (フェーズゲート), L2-002 (メタデータ), L2-003 (テスト品質) |
| 実行方法 | `npx harness validate --layer L2` / git commit時のpre-commitフック |
| **実際の動作** | **動作する。** コミット時にメタデータ(`@unit`, `@layer`)の存在を検証。フェーズゲートもvalidate経由で検証可能 |
| **価値** | **コミット時の品質ゲート。** ただしgit commit自体がClaude Code settings.jsonでdeny設定されているため、**AIエージェント利用時はpre-commitフックが発火しない** |

#### L3 — CIチェック

| 項目 | 状態 |
|------|------|
| 有効化設定 | `layers.L3_ci.enabled: true` ✅ |
| バリデータ | L3-001 (セキュリティパターン), L3-002 (パフォーマンス/strictOnly), L3-003 (テストカバレッジ), L3-004 (AC網羅性) |
| 実行方法 | `npx harness validate --layer L3` / `npx harness ci-check` |
| **実際の動作** | **動作する。** セキュリティパターンスキャン、AC-テストトレーサビリティ検証 |
| **価値** | CI/CD統合時の品質ゲート。ただし**CIパイプラインが未構築の場合は手動実行のみ** |

#### L4 — スケジュールチェック

| 項目 | 状態 |
|------|------|
| 有効化設定 | `layers.L4_scheduled.enabled: false` |
| バリデータ | L4-001 (ドリフト検出), L4-002 (整合性チェック), L4-003 (デッドコード/strictOnly) |
| 実行方法 | `npx harness validate --layer L4` / `npx harness harness:detect-drift` |
| **実際の動作** | **無効だが手動実行可能。** 設計文書とコードの乖離を検出、ADR参照の整合性チェック |
| **価値** | 長期的な設計-コード整合性の維持。定期実行の仕組みは未構築 |

### 3.2 防御レイヤーのギャップ分析

```
想定フロー:
  L0(FUSE) → L1(Editor) → L2(Pre-commit) → L3(CI) → L4(Scheduled)
  ↑ リアルタイム                                    定期 ↑

実際のフロー（AIエージェント利用時）:
  L0 ❌ 無効
  L1 ⚠️ レポートのみ（ブロックなし）
  L2 ❌ git commitがdenyされているためpre-commitフック未発火
  L3 ⚠️ 手動実行のみ
  L4 ❌ 無効

→ AIエージェント利用時、能動的にブロックするレイヤーが存在しない
```

---

## 4. コアバリュー実現状況の評価

### V1: フェーズゲート強制 — ⚠️ 部分的に実装済み、重大なギャップあり

| 側面 | 状態 | 詳細 |
|------|------|------|
| phase-dependency-modelのロジック | ✅ 完全実装 | 15フェーズノード、17依存関係、`checkPhaseGate()` API |
| CLI経由のフェーズゲートチェック | ✅ 動作 | `npx harness check-phase-gate --level 2 --unit validator-system` |
| L2バリデータ経由のチェック | ✅ 動作 | `npx harness validate --layer L2` |
| **pre-tool-use hookによるリアルタイムブロック** | ⚠️ **ハードコード実装** | `scripts/harness/{unit}/` パスと `logical_design.md`, `domain_model.md` のみ。phase-dependency-model未連携 |
| **設計文書への書き込み順序制約** | ❌ **未実装** | domain_model → logical_design → test_design の順序チェックなし |
| **設定駆動（他PJ対応）** | ❌ **未対応** | パスがハードコード。phasegate.config.jsonのproject.paths未使用 |

**評価**: phase-dependency-modelの**ロジック層は完成**しているが、**強制層（pre-tool-use hook）との統合が不十分**。CLIコマンドとして使えるが、AIエージェントの書き込み操作をリアルタイムでブロックする仕組みが壊れている。

### V2: 設計順序制約の強制 — ❌ 未実装

| 側面 | 状態 | 詳細 |
|------|------|------|
| phase-dependency-modelの依存関係定義 | ✅ 完全 | 17の依存関係で文書順序を定義済み |
| pre-tool-use hookでの順序チェック | ❌ **未実装** | 現hookはソースコード書き込み時のみチェック。設計文書書き込みの順序は未検証 |
| スキルレベルの順序ガイダンス | ✅ スキル定義で明示 | 各スキルの「開始条件」に上位設計の存在を要求 |

**評価**: **設計文書間の順序制約はphase-dependency-modelに定義済みだが、強制手段がない。** スキルの「開始条件」は人間/AIが読むガイダンスであり、機械的強制ではない。

### V3: 品質の継続検証 — ✅ 概ね実現済み

| 側面 | 状態 | 詳細 |
|------|------|------|
| Lint (L1) | ✅ | Biome AST、ITテストモック検出、スタブ残留検出 |
| メタデータ検証 (L2) | ✅ | @unit, @layer, @storyアノテーションチェック |
| テスト品質 (L2) | ✅ | AAAパターン、テスト命名規則 |
| セキュリティスキャン (L3) | ✅ | SQLインジェクション、認証バイパスパターン |
| AC網羅性 (L3) | ✅ | 受入基準-テスト間のトレーサビリティ |
| ドリフト検出 (L4) | ✅ | 設計文書-コード間の乖離検出 |

**評価**: 品質検証の**ロジックは充実**している。ただし**実行タイミングの自動化**（CI統合、定期実行）は利用者に委ねられている。

---

## 5. 根本原因の分析

### なぜフェーズゲート強制が機能しなかったか

```
原因の連鎖:

1. pre-tool-use hookは登録済み（.claude/settings.json）
   → Write/Editのたびに発火する ✅

2. しかし hookのフェーズゲートチェックはハードコード
   → scripts/harness/{unit}/ への書き込みのみチェック
   → 設計文書（docs/）への書き込み順序はノーチェック ❌

3. phase-dependency-modelは完全に独立したCLI
   → npx harness check-phase-gate で手動実行可能
   → pre-tool-use hookからは呼ばれていない ❌

4. スキル（28個）はプロンプト定義
   → 「使うべき」と書いてあるが、使わなくても何も起きない
   → CLAUDE.mdに禁止事項として記載したが、これも「お願い」レベル ❌

5. git commitはdeny設定
   → pre-commitフック（L2）が発火する機会がない ❌

結論: 「設計→実装の品質フロー」を強制するのは
      pre-tool-use hook のみだが、ここが不十分だった
```

### 機能のレイヤー構造

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  レイヤー3: AIスキル（プロンプト定義）
  → 28スキルが設計プロセスをガイド
  → 強制力: なし（ガイダンスのみ）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  レイヤー2: 検証ロジック（CLI実行）
  → 12バリデータ、50+コマンド
  → 強制力: 手動実行 or CI統合時のみ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  レイヤー1: リアルタイム強制（pre-tool-use hook）  ← ★ ここが壊れていた
  → AIエージェントの書き込みを即座にブロック
  → 強制力: 自動（Write/Editのたびに発火）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  レイヤー0: 設定・基盤
  → phasegate.config.json、Shared Kernel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**問題の本質**: レイヤー2（検証ロジック）は豊富に実装されていたが、レイヤー1（リアルタイム強制）がレイヤー2を適切に呼び出していなかった。つまり**「知識はあるが行動に反映されていない」状態**。

---

## 6. 機能ごとの価値評価サマリ

### 十分に価値を発揮している機能

| 機能 | 価値 | 理由 |
|------|------|------|
| phase-dependency-model | **高** | 17の依存関係モデルは正確で再利用可能。API設計も良好 |
| validator-system | **高** | 12バリデータの実行基盤が完成。新バリデータの追加が容易 |
| config-foundation | **高** | Single Source of Truthとしてのconfig設計が堅実 |
| biome-ast-engine | **高** | AST解析とImport Graph構築は実用的 |
| 28スキル定義 | **中〜高** | AIDLC設計プロセスの標準化に貢献。ただし強制力なし |
| harness-error | **中** | エラーカタログは網羅的だが、利用場面が限定的 |
| nyquist-validation | **中** | AC網羅性チェックは価値あるが、CI統合が前提 |
| traceability-model | **中** | メタデータ検証は動作するが、@storyの記入率に依存 |

### 価値を発揮しきれていない機能

| 機能 | 問題 | 解決に必要なこと |
|------|------|----------------|
| pre-tool-use hook (agent-integration) | phase-dependency-model未連携、ハードコード | **今回の再設計で解決予定** |
| L0 FUSE hooks | 無効状態 | fuse-native導入 or 代替メカニズム |
| L4 定期チェック | 無効状態・実行手段なし | cron/スケジューラー統合 |
| pre-commit (L2) | git commitがdenyされてて発火しない | AIエージェントフロー向けの代替トリガー |
| Quick Mode | 判定ロジックは完成だがCI未統合 | CI統合 |

---

## 7. 結論と次のアクション

### 今あるもの（資産）

1. **堅牢な検証ロジック** — phase-dependency-modelの17依存関係、12バリデータ、28スキル
2. **クリーンアーキテクチャ基盤** — 19 Unitが適切に分離、ポート/アダプタパターンで疎結合
3. **CLIツールキット** — 50+コマンドで検証を手動実行可能
4. **設定駆動の設計** — phasegate.config.jsonでプロジェクトごとのカスタマイズ可能

### 欠けているもの（ギャップ）

1. **❌ リアルタイム強制の統合** — pre-tool-use hook → phase-dependency-model → checkPhaseGate() のパイプラインが未完成
2. **❌ 設計文書の書き込み順序強制** — domain_model → logical_design → test_design の順序チェック
3. **❌ 設定駆動のパス解決** — project.pathsを使った動的パス推定
4. **❌ CI/CD統合** — GitHub Actions等のパイプラインでL3/L4を自動実行
5. **❌ 定期実行** — L4のドリフト検出・デッドコード検出の自動化

### 今回の再設計の位置づけ

```
domain_model_phase_gate_integration_plan.md（Phase 1完了）で提案した:
- WriteTargetScope（新VO）: ファイルパスからスコープを動的推定
- PhaseGateQueryPort（新ポート）: phase-dependency-model統合
- ProjectPaths（新VO）: phasegate.config.jsonのpaths設定活用

これが実装されると:
  ギャップ1 ✅ リアルタイム強制の統合 → 解決
  ギャップ2 ✅ 設計文書の書き込み順序強制 → 解決
  ギャップ3 ✅ 設定駆動のパス解決 → 解決
  ギャップ4 ❌ CI/CD統合 → 別タスク
  ギャップ5 ❌ 定期実行 → 別タスク
```

### ハーネスの真の価値

**ハーネスの実装済み機能は「無駄」ではない。** 検証ロジック（脳）は完成しているが、それを自動的に発動させるトリガー（反射神経）が不十分だった。今回のpre-tool-use hook再設計は、「脳と反射神経を繋ぐ」作業である。
