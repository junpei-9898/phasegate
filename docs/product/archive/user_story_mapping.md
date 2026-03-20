# ユーザーストーリーマッピング

> **作成日**: 2026-03-11
> **最終更新**: 2026-03-11
> **ストーリー数**: 55
> **Unit数**: 13
> **Wave数**: 4

---

## 1. Wave実行順序と依存制約

| Wave | Unit | 依存先Unit | 着手条件 |
|------|------|-----------|---------|
| 1 | config-foundation | なし | 即時着手可能 |
| 1 | adr-documentation | なし | 即時着手可能 |
| 1 | biome-toolchain | なし | 即時着手可能 |
| 2 | context-engineering | config-foundation | Wave 1完了後 |
| 2 | nyquist-validation | なし | Wave 1完了後（phase-gateは既存拡張） |
| 2 | quality-hooks | なし | Wave 1完了後 |
| 3 | session-lifecycle | config-foundation | Wave 1完了後 |
| 3 | quick-mode | config-foundation | Wave 1完了後 |
| 3 | harness-dx | adr-documentation | Wave 1完了後 |
| 3 | skill-enhancement | nyquist-validation, context-engineering | Wave 2完了後 |
| 3 | orchestration-commands | config-foundation, skill-enhancement | skill-enhancement完了後 |
| 4 | fuse-hooks-engine | config-foundation, quality-hooks | Wave 2完了後 |
| 4A | regression-suite (E-09: US-031~033,055) | biome-toolchain | E-11 Biome移行完了後に回帰テスト整備 |
| 4B | regression-suite (E-14: US-048~049) | biome-toolchain | E-11 Biome移行完了後にv0テスト移行 |

### 依存関係フロー

```
Wave 1: E-08 ──→ Wave 2: E-01, Wave 3: E-03/E-04/E-07/E-15
Wave 1: E-06 ──→ Wave 3: E-10
Wave 1: E-11 ──→ Wave 4A: E-09, Wave 4B: E-14
Wave 2: E-05 ──→ Wave 4B: E-12
Wave 2: E-02 ──→ Wave 3: E-13
Wave 3: E-13 ──→ Wave 3: E-15（スキル強化完了後にオーケストレーション定義）
```

---

## 2. Wave分割ロードマップ

### Wave 1: 基盤構築（11ストーリー）

> 他Epicの前提となるインフラ層。最優先で着手。

| Epic | ストーリー | 優先度 | 備考 |
|------|-----------|--------|------|
| E-08 設定統合 | US-027 orchestrationセクション追加 | Must | E-01/03/04/07の前提 |
| E-08 設定統合 | US-028 sessionセクション追加 | Must | E-01/03/04/07の前提 |
| E-08 設定統合 | US-029 GSD由来機能デフォルト無効化 | Must | Progressive adoption基盤 |
| E-08 設定統合 | US-030 v1→v2自動マイグレーション | Should | 既存利用者向け |
| E-06 ADR基盤 | US-020 ADRテンプレート整備 | Must | E-10の前提 |
| E-06 ADR基盤 | US-021 初期10件ADR作成 | Must | 技術的意思決定の形式知化 |
| E-06 ADR基盤 | US-022 ADRステータス管理 | Must | ADR運用基盤 |
| E-11 Biome移行 | US-036 カスタムESLintルール移植 | Must | E-14の前提、E-05/E-09に影響 |
| E-11 Biome移行 | US-037 PostToolUse Hook高速化 | Must | 開発ループ高速化 |
| E-11 Biome移行 | US-038 L1バリデータ再構築 | Must | AI生成コード品質基盤 |
| E-11 Biome移行 | US-039 CIパイプラインBiome統合 | Must | ESLint完全除去 |

### Wave 2: コア品質機構（13ストーリー）

> 品質ゲートとトレーサビリティの確立。Wave 1完了後に着手。

| Epic | ストーリー | 優先度 | 備考 |
|------|-----------|--------|------|
| E-01 コンテキスト基盤 | US-001 context-priority.json定義 | Must | E-08に依存 |
| E-01 コンテキスト基盤 | US-002 SKILL.mdコンテキストバジェット | Must | E-08に依存 |
| E-01 コンテキスト基盤 | US-003 Fresh Context Protocolガイドライン | Must | E-08に依存 |
| E-01 コンテキスト基盤 | US-004 Compact時優先保持ファイル指示 | Must | E-08に依存 |
| E-02 Nyquist検証層 | US-005 requirement-test-matrix.json新設 | Must | E-13と連動 |
| E-02 Nyquist検証層 | US-006 phase-gate ACマッピングチェック | Must | E-13と連動 |
| E-02 Nyquist検証層 | US-007 要件カバレッジ算出 | Must | E-13と連動 |
| E-02 Nyquist検証層 | US-008 impact-analysisコマンド | Should | |
| E-02 Nyquist検証層 | US-009 VALIDATION.md自動生成 | Should | |
| E-05 Hooks拡張 | US-016 PreToolUse Hookリンター設定保護 | Must | E-12の前提 |
| E-05 Hooks拡張 | US-017 Stop Hookテストゲート | Must | E-12の前提 |
| E-05 Hooks拡張 | US-018 無限ループ防止 | Must | E-12の前提 |
| E-05 Hooks拡張 | US-019 Stop Hook ci-check追加 | Should | |

### Wave 3: 拡張機能（20ストーリー）

> 開発体験とライフサイクル管理の強化。

| Epic | ストーリー | 優先度 | 備考 |
|------|-----------|--------|------|
| E-03 Quick Mode | US-010 quick_modeセクション定義 | Must | E-08に依存 |
| E-03 Quick Mode | US-011 最小バリデータ実行・phase-gateスキップ | Must | E-08に依存 |
| E-03 Quick Mode | US-012 harness:quick-checkコマンド | Must | E-08に依存 |
| E-04 セッション継続性 | US-013 session-state.json自動保存 | Must | E-08に依存 |
| E-04 セッション継続性 | US-014 harness:resumeセッション復元 | Must | E-08に依存 |
| E-04 セッション継続性 | US-015 Stop Hook/pause時自動更新 | Must | E-08に依存 |
| E-07 ライフサイクル | US-023 milestones.jsonマイルストーン管理 | Must | E-08に依存 |
| E-07 ライフサイクル | US-024 state.jsonプロジェクト状態追跡 | Must | E-08に依存 |
| E-07 ライフサイクル | US-025 harness:progress進捗可視化 | Should | |
| E-07 ライフサイクル | US-026 マイルストーン完了時自動監査 | Should | |
| E-10 HarnessError拡充 | US-034 HarnessError ADR参照+修正コード例 | Must | E-06に依存 |
| E-10 HarnessError拡充 | US-035 AGENTS.mdポインタ型移行 | Must | E-06に依存 |
| E-13 スキル強化 | US-045 story-implementor FCP+Atomic Commits | Must | E-02と連動 |
| E-13 スキル強化 | US-046 test-coverage-checker Nyquist統合 | Must | E-02と連動 |
| E-13 スキル強化 | US-047 implementation-readiness-checker Plan-Checker | Must | E-02と連動 |
| E-15 オーケストレーション | US-050 /gsdlc:init-project SKILL.md定義 | Must | E-08に依存 |
| E-15 オーケストレーション | US-051 /gsdlc:design SKILL.md定義 | Must | E-13に依存 |
| E-15 オーケストレーション | US-052 /gsdlc:plan SKILL.md定義 | Must | E-02, E-13に依存 |
| E-15 オーケストレーション | US-053 /gsdlc:execute 単一executor版 | Must | E-13に依存 |
| E-15 オーケストレーション | US-054 /gsdlc:verify SKILL.md定義 | Must | E-13に依存 |

### Wave 4: 高度機能（11ストーリー）

> OS-level enforcement、K1-K13回帰保証、v0資産移行。最後に着手。

#### Phase A: K1-K13回帰テスト設計（E-11 Biome移行完了後に整備）

| Epic | ストーリー | 優先度 | 備考 |
|------|-----------|--------|------|
| E-09 K1-K13回帰 | US-031 5層防御・Phase Gate回帰テスト | Must | 横断的。Biome移行後に整備 |
| E-09 K1-K13回帰 | US-032 スキル・2-Phase維持保証 | Must | 横断的 |
| E-09 K1-K13回帰 | US-033 Security/Drift/Consistency維持保証 | Must | 横断的 |
| E-09 K1-K13回帰 | US-055 Go/No-Go Gate 8条件回帰テスト | Must | 横断的。リリース絶対条件 |

#### Phase B: FUSE Hooks Engine + v0テスト移行

| Epic | ストーリー | 優先度 | 備考 |
|------|-----------|--------|------|
| E-12 FUSE Hooks | US-040 .harness-hooks.yml宣言的フック定義 | Must | E-05+E-08に依存 |
| E-12 FUSE Hooks | US-041 FUSEパススルー+PreWrite/PostWrite | Must | 実験的要素あり |
| E-12 FUSE Hooks | US-042 PreRead Hook機密ファイルブロック | Must | |
| E-12 FUSE Hooks | US-043 シェルラッパーPreBash/PostBash | Must | |
| E-12 FUSE Hooks | US-044 完了ゲートMagic File+CLI | Must | |
| E-14 v0テスト移行 | US-048 v0 143テスト仕様v1再実装 | Must | E-11完了後 |
| E-14 v0テスト移行 | US-049 v1再実装テストCIゲート化 | Must | E-11完了後 |

### Waveサマリー

| Wave | ストーリー数 | Must | Should | 主要Epic |
|------|-------------|------|--------|---------|
| Wave 1 基盤構築 | 11 | 10 | 1 | E-08, E-06, E-11 |
| Wave 2 コア品質機構 | 13 | 10 | 3 | E-01, E-02, E-05 |
| Wave 3 拡張機能 | 20 | 18 | 2 | E-03, E-04, E-07, E-10, E-13, E-15 |
| Wave 4 高度機能 | 11 | 11 | 0 | E-09, E-12, E-14 |
| **合計** | **55** | **49** | **6** | |

---

## 3. ストーリー → Unit所属マッピング

| Story ID | Unit | Wave | 検証 |
|----------|------|:----:|:----:|
| US-001 | context-engineering | 2 | ✅ |
| US-002 | context-engineering | 2 | ✅ |
| US-003 | context-engineering | 2 | ✅ |
| US-004 | context-engineering | 2 | ✅ |
| US-005 | nyquist-validation | 2 | ✅ |
| US-006 | nyquist-validation | 2 | ✅ |
| US-007 | nyquist-validation | 2 | ✅ |
| US-008 | nyquist-validation | 2 | ✅ |
| US-009 | nyquist-validation | 2 | ✅ |
| US-010 | quick-mode | 3 | ✅ |
| US-011 | quick-mode | 3 | ✅ |
| US-012 | quick-mode | 3 | ✅ |
| US-013 | session-lifecycle | 3 | ✅ |
| US-014 | session-lifecycle | 3 | ✅ |
| US-015 | session-lifecycle | 3 | ✅ |
| US-016 | quality-hooks | 2 | ✅ |
| US-017 | quality-hooks | 2 | ✅ |
| US-018 | quality-hooks | 2 | ✅ |
| US-019 | quality-hooks | 2 | ✅ |
| US-020 | adr-documentation | 1 | ✅ |
| US-021 | adr-documentation | 1 | ✅ |
| US-022 | adr-documentation | 1 | ✅ |
| US-023 | session-lifecycle | 3 | ✅ |
| US-024 | session-lifecycle | 3 | ✅ |
| US-025 | session-lifecycle | 3 | ✅ |
| US-026 | session-lifecycle | 3 | ✅ |
| US-027 | config-foundation | 1 | ✅ |
| US-028 | config-foundation | 1 | ✅ |
| US-029 | config-foundation | 1 | ✅ |
| US-030 | config-foundation | 1 | ✅ |
| US-031 | regression-suite | 4A | ✅ |
| US-032 | regression-suite | 4A | ✅ |
| US-033 | regression-suite | 4A | ✅ |
| US-034 | harness-dx | 3 | ✅ |
| US-035 | harness-dx | 3 | ✅ |
| US-036 | biome-toolchain | 1 | ✅ |
| US-037 | biome-toolchain | 1 | ✅ |
| US-038 | biome-toolchain | 1 | ✅ |
| US-039 | biome-toolchain | 1 | ✅ |
| US-040 | fuse-hooks-engine | 4B | ✅ |
| US-041 | fuse-hooks-engine | 4B | ✅ |
| US-042 | fuse-hooks-engine | 4B | ✅ |
| US-043 | fuse-hooks-engine | 4B | ✅ |
| US-044 | fuse-hooks-engine | 4B | ✅ |
| US-045 | skill-enhancement | 3 | ✅ |
| US-046 | skill-enhancement | 3 | ✅ |
| US-047 | skill-enhancement | 3 | ✅ |
| US-048 | regression-suite | 4B | ✅ |
| US-049 | regression-suite | 4B | ✅ |
| US-050 | orchestration-commands | 3 | ✅ |
| US-051 | orchestration-commands | 3 | ✅ |
| US-052 | orchestration-commands | 3 | ✅ |
| US-053 | orchestration-commands | 3 | ✅ |
| US-054 | orchestration-commands | 3 | ✅ |
| US-055 | regression-suite | 4A | ✅ |

**結果**: 全55ストーリーが13 Unitのいずれかに所属。漏れなし。

---

## 4. Unit別設計ステップ進捗

各Unitの設計ステップ（Phase 2: Unit横断設計）の進捗状況。

> **凡例**: ✅ 完了 / 🔄 進行中 / ⏳ 未着手 / ➖ 対象外

### Wave 1: 基盤構築

| 設計ステップ | config-foundation | adr-documentation | biome-toolchain |
|-------------|:-----------------:|:-----------------:|:---------------:|
| Step 3: ドメインモデル | ✅ | ✅ | ✅ |
| Step 4: 論理設計 | ⏳ | ⏳ | ⏳ |
| Step 5: テストケース設計 | ⏳ | ⏳ | ⏳ |
| Step 6: テストロジック設計 | ⏳ | ⏳ | ⏳ |

### Wave 2: コア品質機構

| 設計ステップ | context-engineering | nyquist-validation | quality-hooks |
|-------------|:-------------------:|:------------------:|:-------------:|
| Step 3: ドメインモデル | ⏳ | ⏳ | ⏳ |
| Step 4: 論理設計 | ⏳ | ⏳ | ⏳ |
| Step 5: テストケース設計 | ⏳ | ⏳ | ⏳ |
| Step 6: テストロジック設計 | ⏳ | ⏳ | ⏳ |

### Wave 3: 拡張機能

| 設計ステップ | session-lifecycle | quick-mode | harness-dx | skill-enhancement | orchestration-commands |
|-------------|:-----------------:|:----------:|:----------:|:-----------------:|:---------------------:|
| Step 3: ドメインモデル | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Step 4: 論理設計 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Step 5: テストケース設計 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Step 6: テストロジック設計 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### Wave 4: 高度機能

| 設計ステップ | fuse-hooks-engine | regression-suite |
|-------------|:-----------------:|:----------------:|
| Step 3: ドメインモデル | ⏳ | ⏳ |
| Step 4: 論理設計 | ⏳ | ⏳ |
| Step 5: テストケース設計 | ⏳ | ⏳ |
| Step 6: テストロジック設計 | ⏳ | ⏳ |

---

## 5. 非交渉要件（K1-K13）との整合

| K# | 要件 | 担当Unit | 検証方法 |
|----|------|---------|---------|
| K1 | 5層防御モデル（L0-L4） | fuse-hooks-engine (L0), biome-toolchain (L1), 既存 (L2-L4) | regression-suite |
| K2 | Phase Gate | nyquist-validation (ACチェック追加), 既存 | regression-suite |
| K3 | Biome AST解析 | biome-toolchain | regression-suite |
| K3.5 | @unit/@layerメタデータ | biome-toolchain (Biomeルール移植) | regression-suite |
| K4 | テスト品質ルール | 既存維持 | regression-suite |
| K5 | DDD設計スキル群 | 既存維持 | regression-suite |
| K6 | 2-Phase Execution | 既存維持 | regression-suite |
| K7 | Document Split | 既存維持 | regression-suite |
| K8 | Cascade Updater | 既存維持 | regression-suite |
| K9 | Agent-Lesson System | 既存維持 | regression-suite |
| K10 | Security/Performance検出 | 既存維持 | regression-suite |
| K11 | Drift Detection | 既存維持 | regression-suite |
| K12 | Consistency Checker | 既存維持 | regression-suite |
| K13 | harness.config.json | config-foundation (v2拡張) | regression-suite |
