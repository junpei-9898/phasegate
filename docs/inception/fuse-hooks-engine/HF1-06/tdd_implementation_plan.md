# TDD実装計画: HF1-06 FUSE/Hooksモード切替配線

## 1. スコープ

### 対象ストーリー
**HF1-06**: phasegate.config.json の設定により FUSE モードと Claude Code Hooks モードを切り替え可能にする。FUSE モード選択時は実際に fuse-native でマウントが起動し、ファイルI/Oインターセプトが動作する状態にする。

### 受け入れ基準
1. `phasegate.config.json` に `guardMode: "fuse" | "hooks" | "auto"` を追加し、スキーマバリデーションが通ること
2. `harness fuse:mount` CLIコマンドでFUSEマウントが起動すること
3. `harness fuse:unmount` CLIコマンドでFUSEアンマウントが実行されること
4. `harness fuse:status` で現在のモード・マウント状態が表示されること
5. `guardMode: "auto"` の場合、FUSE利用可能なら FUSE、不可なら hooks にフォールバック
6. `.harness-hooks.yml` が存在しない場合、`harness fuse:mount` 時にデフォルト設定を生成すること
7. `composition-root.ts` が guardMode に応じて FUSE アダプタ or Fallback アダプタを配線すること

### 影響する層
- **Infrastructure**: composition-root.ts の配線拡張
- **Presentation**: main.ts に fuse:mount / fuse:unmount / fuse:status コマンド追加、FuseDaemonHandler 新設
- **Config**: phasegate.config.json スキーマ拡張、HarnessConfigV2 型拡張

### 影響しない層（変更不要）
- **Domain**: FUSEMount, HookEvaluationService 等は既存のまま
- **Application**: EvaluateHookEventUseCase 等は既存のまま
- **Infrastructure adapters**: FusePreWrite/ReadHandlerAdapter, FallbackPreRead/WriteAdapter は既存のまま

## 2. 前提条件検証
- `implementation-readiness-checker` 実行日時: 2026-03-28 08:30（本計画作成時に手動検証）
- 判定結果: ✅ 実装準備完了（上位設計文書すべて存在）

## 3. TDD実装順序（テストピラミッド準拠）

### 1. Unitテスト (RED → GREEN → REFACTOR)

| # | 対象 | テスト内容 | 実装内容 |
|---|------|----------|---------|
| U1 | GuardMode型 | `"fuse"`, `"hooks"`, `"auto"` のみ受容、不正値は拒否 | `domain/types/guard-mode.ts` 型定義（既存 config-foundation に追加） |
| U2 | HarnessConfigV2Like拡張 | `guardMode` プロパティの存在確認 | config-foundation の HarnessConfigV2 型に `guardMode` 追加 |

### 2. ITテスト (RED → GREEN → REFACTOR)

| # | 対象 | テスト内容 | 実装内容 |
|---|------|----------|---------|
| I1 | harness-config-v2.schema.json | `guardMode` 付きconfigがバリデーション通過 | スキーマに `guardMode` プロパティ追加 |
| I2 | composition-root.ts | guardMode="fuse" → FusePreWriteHandlerAdapter が配線される | composition-root.ts の条件分岐 |
| I3 | composition-root.ts | guardMode="hooks" → FallbackPreReadAdapter が配線される | 同上 |
| I4 | composition-root.ts | guardMode="auto" + FUSE不可 → Fallback配線 | FUSE利用可否チェック + フォールバック |
| I5 | FuseDaemonHandler | mount → FUSEMount.status='mounted' | presentation/handlers/fuse-daemon-handler.ts |
| I6 | FuseDaemonHandler | unmount → FUSEMount.status='unmounted' | 同上 |
| I7 | FuseDaemonHandler | status → JSON出力 | 同上 |
| I8 | .harness-hooks.yml生成 | デフォルトYAML生成が正しい構造を持つ | infrastructure/adapters 内のYAMLテンプレート生成 |

### 3. E2E/シナリオテスト (RED → GREEN → REFACTOR)

| # | 対象 | テスト内容 | 実装内容 |
|---|------|----------|---------|
| E1 | CLI `fuse:status` | guardMode=hooks → "mode: hooks" が出力される | main.ts のコマンドディスパッチ |
| E2 | CLI `fuse:mount` | FUSE不可環境 → フォールバックメッセージ | エラーハンドリング |

**注**: E2E で実際の FUSE マウントテストはCI環境での FUSE-T/libfuse 可用性に依存するため、FUSE利用不可時のフォールバック動作のみをE2Eで検証する。実FUSEマウントは手動検証で確認する。

## 4. 環境検証チェックリスト（事前実行結果）
- [x] `fuse-native` パッケージがoptional dependencyとして存在 (`package.json` line 38)
- [x] 既存テスト全Green (`npm run test` → 397 passed)
- [x] FUSEMount エンティティ実装済み (`fuse-hooks-engine/domain/entities/fuse-mount.ts`)
- [x] FusePreWrite/ReadHandlerAdapter 実装済み
- [x] EvaluateHookEventUseCase の mountStatus ルーティング実装済み
- [ ] FUSE-T がローカル環境にインストールされているか → 手動確認必要

## 5. QA（不明点・確認事項）

### [Question] Q1: guardMode の配置場所
`phasegate.config.json` のどのセクションに `guardMode` を配置するか？

**推奨案**: トップレベルの `harnesses` セクション内に追加する。理由: ハーネス機能のオン/オフ設定が既にここに集約されているため。

```json
{
  "harnesses": {
    "guardMode": "auto",
    "agentLessonCollection": false,
    ...
  }
}
```

[Answer]
推奨案を採用。`harnesses.guardMode` としてトップレベルの harnesses セクション内に配置する。

### [Question] Q2: FUSE-T のインストール確認
ローカル環境に FUSE-T (`brew install fuse-t`) はインストール済みですか？未インストールの場合、`guardMode: "auto"` は常に hooks にフォールバックします。

[Answer]
インストール済み（2026-03-28）。

### [Question] Q3: .harness-hooks.yml のデフォルト内容
`hooks_engine_implementation_plan.md` に詳細な `.harness-hooks.yml` サンプルがありますが、デフォルト生成時はフル版（preWrite/postWrite/preRead/preBash/onComplete すべて）で良いですか？それともミニマル版（preWrite + preRead のみ）が望ましいですか？

**推奨案**: ミニマル版（preWrite の保護ファイルブロック + preRead の機密ファイルブロックのみ）。理由: 初回はシンプルに動作確認できる状態が望ましく、postWrite のリント実行等は別途有効化する方が安全。

[Answer]
フル版（preWrite/postWrite/preRead/preBash/onComplete すべて）を採用。

## 6. 前提条件・リスク

| リスク | 影響 | 対応 |
|--------|------|------|
| FUSE-T 未インストール | `fuse:mount` 失敗 | `guardMode: "auto"` のフォールバックで hooks モードに自動切替 |
| `fuse-native` のネイティブビルド失敗 | optional dep のため npm install は通るが runtime で失敗 | try-catch + フォールバック |
| CI環境では FUSE 不可 | テスト実行に制約 | FUSE依存テストは条件付きスキップ (`process.env.FUSE_AVAILABLE`) |

## 7. ファイル変更一覧（予定）

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `phasegate.config.json` | `harnesses.guardMode: "auto"` 追加 |
| `harness-config-v2.schema.json` | `harnesses` に `guardMode` enum 追加 |
| `config-foundation/domain/harness-config.ts` | `HarnessConfigV2` 型に `guardMode` 追加 |
| `fuse-hooks-engine/composition-root.ts` | guardMode に応じた配線分岐 |
| `main.ts` | `fuse:mount`, `fuse:unmount`, `fuse:status` コマンド追加 |

### 新規
| ファイル | 内容 |
|---------|------|
| `fuse-hooks-engine/presentation/handlers/fuse-daemon-handler.ts` | mount/unmount/status CLIハンドラー |
| `fuse-hooks-engine/infrastructure/adapters/default-hooks-yaml-generator.ts` | デフォルト .harness-hooks.yml 生成 |
| `__tests__/unit/fuse-hooks-engine/guard-mode.test.ts` | GuardMode 型テスト |
| `__tests__/integration/fuse-hooks-engine/fuse-mode-switching.test.ts` | 配線切替テスト |
| `__tests__/integration/e2e-verification/fuse-cli-e2e.test.ts` | CLI E2Eテスト |
