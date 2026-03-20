---
name: Wave 1 実装ステータス
description: Wave 1 TDD実装完了。全6Unit×4レイヤー個別実装 + Composition Root + CLI + E2E。
type: project
---

# Wave 1 実装ステータス

**最終更新**: 2026-03-16
**テスト結果**: 169ファイル / 1,345テスト — 全パス（E2E 10件含む）

## 完了済み: 個別レイヤー実装 (277ファイル)

| Unit | Domain | Application | Infrastructure | Presentation | 合計 |
|------|--------|-------------|---------------|-------------|------|
| config-foundation | 27 | 10 | 5 | 2 | 44 |
| harness-error | 27 | 15 | 10 | 6 | 58 |
| traceability-model | 22 | 10 | 9 | 1 | 42 |
| phase-dependency-model | 16 | 12 | 4 | 1 | 33 |
| adr-foundation | 13 | 20 | 5 | 2 | 40 |
| biome-ast-engine | 23 | 23 | 12 | 2 | 60 |

### 実装手法の経緯
- Wave 1-6 (Domain/Application): codex exec (gpt-5.4) 並列実行 — 成功
- Wave 7 (Infrastructure TM/PD/AF): codex exec 失敗 → Claude subagentにエスカレーション
- Wave 8 (Infrastructure BA + Presentation全6Unit): Claude subagent 並列3タスク
- 教訓: codexはシンプルなVO/UseCase向き。Port実装・I/O・複雑な依存はClaude subagentが適切

## 完了済み: 結線・統合タスク (2026-03-15)

### 1. Composition Root (全6Unit) ✅
各Unitに `composition-root.ts` を作成。ファクトリ関数でPort→Adapter結線を実施。
- `config-foundation/composition-root.ts` — `createConfigFoundationModule()`
- `harness-error/composition-root.ts` — `createHarnessErrorModule(rootDir)`
- `traceability-model/composition-root.ts` — `createTraceabilityModelModule(rootDir)`
- `phase-dependency-model/composition-root.ts` — `createPhaseDependencyModelModule(config)`
- `adr-foundation/composition-root.ts` — `createAdrFoundationModule(rootDir)`
- `biome-ast-engine/composition-root.ts` — `createBiomeAstEngineModule(rootDir)`

### 2. Barrel Exports (全6Unit) ✅
各Unitに `index.ts` を作成。外部公開APIの再エクスポート。

### 3. CLIエントリポイント ✅
- `scripts/harness/main.ts` — 全コマンドディスパッチャー
- `package.json` に `bin` フィールドと `harness` スクリプト追加
- 対応コマンド:
  - `harness enable-feature` / `harness disable-feature` / `harness list-features`
  - `harness render-errors` / `harness validate-fix` / `harness list-errors`
  - `harness validate-metadata`
  - `harness check-phase-gate`
  - `harness list-adrs` / `harness validate-adr`
  - `harness lint`

### 4. E2Eテスト ✅
- `__tests__/e2e/cli-harness.test.ts` — 10テストケース（実プロセス起動）
- ヘルプ表示、各コマンド動作、エラーハンドリングを検証

### 5. Unit間共有型の実行時結線 ✅
- 各Composition RootがUnit内部で完結する結線は完了
- Cross-unit結線を main.ts で実装完了

## 完了済み: 設定マイグレーション・Cross-unit結線 (2026-03-16)

### 6. 設定ファイルマイグレーション ✅
- `harness.config.json` をレガシーv1形式から HarnessConfigV2 source format に変換
- v1 固有フィールド(`version`, `architecture`, `naming`, `paths.source`)を除去
- `project.preset: "standard"` でプリセット解決が正常動作
- スキーマバリデーション通過を E2E テストで確認（`list-features` が exit 0 で成功）

### 7. Cross-unit 設定注入 ✅
- `main.ts` 起動時に `LoadResolvedConfigUseCase` で設定を先行解決
- `phase-dependency-model` に PhaseConfigSection を注入（planningMode, customization, reportingOutputDir）
- `biome-ast-engine` に L1 Config を注入（enabled, rules）
- 型安全なマッピング関数（`toPhaseConfigSection`, `toL1Config`）で変換
- CLI フラグ値も型ガード関数で安全に変換（`as` キャスト排除）
