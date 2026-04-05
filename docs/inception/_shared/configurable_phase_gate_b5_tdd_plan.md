# configurable phase gate — Phase B-5 TDD 実装計画

> **Phase 1（計画）** — ユーザー承認後に Phase 2（Codex による TDD 実装）へ進む。
> **Scope**: B-5-1 / B-5-2 / B-5-3（テスト追加のみ。プロダクションコード変更なし）

## 1. スコープ

`docs/inception/_shared/configurable_phase_gate_plan.md` §B-5 の 3 項目：

| # | 項目 | ステータス |
|---|---|---|
| B-5-1 | `GateGraph` DAG 検証の UT | **ほぼ完了**（8 ケース実装済み） |
| B-5-2 | `ResolveGateUseCase` の UT/IT | **ほぼ完了**（UT 7 + IT + storyAnnotation IT） |
| B-5-3 | `custom` プリセット E2E | **CLI spawn レベル未カバー**（コンポジション IT はあり） |

→ B-5 の実作業は **B-5-3 の CLI E2E 追加 + B-5-1/2 の軽微な抜け穴補強** が中心。

## 2. 既存カバレッジの棚卸し

### B-5-1 既存（`scripts/harness/__tests__/unit/phase-dependency-model/gate-graph.test.ts`）
1. 自己ループを循環依存として検出
2. 2ノード循環を検出
3. 長い循環依存を検出
4. 未知の dependsOn 参照を検出
5. レベル逆行を検出
6. 重複するゲート名を検出
7. 複数違反をまとめて報告
8. 祖先ゲートをトポロジカル順で返す

### B-5-2 既存
- `unit/phase-dependency-model/resolve-gate-usecase.test.ts`（UT 7 ケース）
  - 単一一致 / 複数一致 / 非一致で空返却 / 先行 requires トポソート / 必須 vs 推奨 / scope 展開 / dependsOn 経由
- `integration/phase-dependency-model/resolve-gate-usecase.integration.test.ts`
- `integration/phase-dependency-model/resolve-gate-usecase-story-annotation.integration.test.ts`（B-4）
- `integration/phase-dependency-model/composition-root-custom-preset.integration.test.ts`（B-4、2 ケース）

### B-5-3 既存
- `composition-root-custom-preset.integration.test.ts` — gates[] 〜 real verifier 〜 `CheckPhaseGateCommandHandler.execute()` 通過。
- **不足**: `spawnSync(main.ts)` による real CLI 経由の custom preset 動作確認。

## 3. 追加テスト一覧

### 3.1 B-5-1 補強（UT, 1 件）
**対象**: `scripts/harness/__tests__/unit/phase-dependency-model/gate-graph.test.ts`

追加ケース:
- **dependsOn が DAG を満たす健全な複数ゲート構成で違反ゼロを返すこと**
  - 理由: 現状「失敗系」と「祖先展開（単一チェーン）」しかなく、**複数チェーン合流時の健全系** が抜けている。
  - 例: A(L1) → B(L2), C(L1) → B(L2), B(L2) → D(L3)

### 3.2 B-5-2 補強（UT, 2 件）
**対象**: `scripts/harness/__tests__/unit/phase-dependency-model/resolve-gate-usecase.test.ts`

追加ケース:
- **glob 複数パターンで OR マッチングが効くこと**（`blocks: ['src/**/*.ts', 'lib/**/*.ts']` でどちらにマッチしても hit）
- **scope の storyId プレースホルダーが未展開時（`storyId` 無し呼び出し）は `{storyId}` を含む requires を警告として扱うこと**（※ 現実装の挙動を先に確認して合わせる）
  - → **Q1**: 未展開プレースホルダーの扱いが未定義なら現実装を読み、意図どおりかユーザー確認が必要。

### 3.3 B-5-3 新規 CLI E2E（1 ファイル）
**新規ファイル**: `scripts/harness/__tests__/e2e/custom-preset-cli.e2e.test.ts`

`spawnSync(main.ts, ['check-phase-gate', ...])` を使い、一時ディレクトリに `phasegate.config.json`（`preset: 'custom'` + `gates[]`）と実ファイルを置いて真の CLI 経由で検証する。

追加ケース:
1. **custom preset + gates[] が config から解決され、必須 requires 満足時に exit 0** を返すこと
2. **custom preset で gates[] の blocks にマッチし requires 欠損時に exit 1 + blocker メッセージ** を返すこと
3. **gates[] のスキーマ違反（`level: 99`）で config ロード段階で exit 2** を返すこと（fail-fast）

> ※ `cli-harness.test.ts` には append せず新規ファイルにする（E2E の論点分離 + ファイル肥大回避）。

## 4. 未決事項（承認必要）

### Q1: `{storyId}` 未展開時の挙動
B-5-2 補強案にある「scope プレースホルダー未展開」の扱い。
- **推奨**: 現実装を読み、意図通りなら明文化テスト化、意図不明なら Phase 2 で調査→決定。**いったんこの補強は見送り**、B-5 では B-5-1 補強 1 件 + B-5-3 CLI E2E 3 件のみに絞る。
- 理由: B-5 はテスト "追加" スコープで、挙動再定義を含めると B-5 が膨張する。未定義 behavior は B-6 ドキュメント化時に別途扱う。

### Q2: CLI E2E で `check-phase-gate` コマンドの現状引数を使えるか
`main.ts` の `check-phase-gate` が `--unit` / `--level` / `--target-file` 等を受け取れる必要がある。既存 E2E は `--level 99` 異常系しか覚えていないので、**Phase 2 冒頭で `main.ts` の `check-phase-gate` 引数仕様を Codex に読ませ、実行可能性を確認**させる。
- **推奨**: Codex 開始時の最初のステップで `main.ts` の該当ハンドラーを読ませ、正常系呼び出しが可能か判断。不可能なら pre-tool-use-hook 経由に切替（stdin JSON を流す）。
- **代替**: `pre-tool-use-hook.ts` を `spawnSync` 起動して stdin に JSON を流す方式。これなら本来の utility path（custom preset → 書き込みブロック）を最も忠実に再現できる。

### Q3: fixtures の配置
一時ディレクトリ（`mkdtempSync`）で config + 対象ファイルを都度生成する（既存 `cli-harness.test.ts` と同じ方式）。fixtures ディレクトリは作らない。
- **推奨**: 一時ディレクトリ方式で統一。

### Q4: 追加テストの実行時間
CLI E2E は spawn コスト重め。B-5-3 は 3 ケースに絞り、各ケース独立の一時ディレクトリ。既存 `cli-harness.test.ts` の timeout 90s 設定を踏襲。
- **推奨**: 3 ケースまでに抑え、spawn 単位で timeout 60s。

### Q5: テストファイル命名
既存 E2E は `cli-harness.test.ts` のみ。新規は `custom-preset-cli.e2e.test.ts`。
- **推奨**: `.e2e.test.ts` サフィックスで E2E 明示（既存との差別化）。他 E2E 追加時の命名パターンとしても機能。

### Q6: B-5-1 補強の必要性
「健全系 DAG」テストは本当に必要か。既存の「祖先展開」テストで部分的に担保されている。
- **推奨**: **追加する**。複数チェーン合流（diamond）は祖先展開だけでは捕捉できないパスで、将来 DAG ロジックのリグレッション検出に有効。

### Q7: テスト失敗時の debug hint
CLI E2E は失敗時の原因切り分けが難しい。stdout/stderr を expect メッセージに含めるか。
- **推奨**: `expect(actual.exitCode, actual.stderr).toBe(0)` 形式で常に stderr を含める（既存 `cli-harness.test.ts` 踏襲）。

## 5. ファイル変更計画

| ファイル | 種別 | 変更内容 |
|---|---|---|
| `__tests__/unit/phase-dependency-model/gate-graph.test.ts` | 編集 | 健全 DAG 複数チェーン合流ケース追加 |
| `__tests__/e2e/custom-preset-cli.e2e.test.ts` | 新規 | CLI spawn 経由の custom preset 3 ケース |

**編集禁止**:
- `scripts/harness/` 配下のプロダクションコード全般（B-5 はテストのみ）
- `docs/` 配下（B-6 スコープ）
- `package.json`
- 既存のテストファイル（gate-graph.test.ts を除く）

## 6. 完了条件

1. B-5-1 補強ケース追加（1 件）
2. B-5-3 CLI E2E 新規ファイル追加（3 ケース）
3. `npm run test` 全件 PASS（現行 2991 件 → 2995 件）※ C-1 の onTaskUpdate timeout は既存ベースライン
4. `configurable_phase_gate_plan.md` の B-5-1/2/3 を `[x]` にマーク（別コミット可）
5. バージョン: v0.22.0 → v0.23.0（CLAUDE.md バージョニングルール準拠）

## 7. Codex 実行プロンプト骨子

```
Phase B-5 のテスト追加。
scripts/harness/ プロダクションコードは一切変更禁止。

## 対象
1. scripts/harness/__tests__/unit/phase-dependency-model/gate-graph.test.ts に1ケース追加
2. scripts/harness/__tests__/e2e/custom-preset-cli.e2e.test.ts を新規作成（3ケース）

## 前提調査（最初に必ず実行）
- scripts/harness/main.ts の check-phase-gate コマンド受付実装を読み、
  正常系で --unit / --level / --target-file 等を受けて終了コードを返すか確認する。
  - 不可能なら agent-integration/presentation/pre-tool-use-hook.ts の
    stdin JSON 方式に切替（input: {tool_name:'Write', tool_input:{file_path:'...'}, cwd:'...'}）
- scripts/harness/__tests__/integration/phase-dependency-model/composition-root-custom-preset.integration.test.ts を読み、
  同じ phase config を構築できるようにする

## TDD 順序
1. gate-graph.test.ts: 「複数チェーン合流 DAG で違反ゼロ」ケースを追加し、RED→GREEN を確認
2. custom-preset-cli.e2e.test.ts を新規作成:
   - 3 ケースを順次 RED→GREEN で追加
   - 一時ディレクトリに phasegate.config.json + 対象ファイルを配置
   - spawnSync(tsx, main.ts, [...]) で CLI 起動
   - stdout/stderr/exitCode を検証

## 制約
- Bash 経由のファイル書き込み（cat >, tee, sed -i 等）は禁止。Write / Edit ツールのみ使用
- docs/ 配下編集禁止
- package.json 編集禁止
- プロダクションコード編集禁止（テストファイルのみ）
- 既存テストファイル編集は gate-graph.test.ts のみ（他の既存テスト編集禁止）

## 完了条件
- npm run test 全件 PASS（onTaskUpdate timeout は既存ベースライン OK）
- 追加テストケースが全て新規ファイルの末尾 or 指定箇所に配置されている
```

## 8. 未決事項サマリ（承認待ち）

| # | 論点 | 推奨 |
|---|---|---|
| Q1 | `{storyId}` 未展開の挙動テスト | **見送り**（B-5 スコープ外） |
| Q2 | CLI エントリ（check-phase-gate vs pre-tool-use-hook） | **Codex 開始時に main.ts を読んで判断** |
| Q3 | fixtures 配置 | **一時ディレクトリ** |
| Q4 | 実行時間 | **3 ケース / spawn timeout 60s** |
| Q5 | ファイル命名 | **`.e2e.test.ts` サフィックス新規** |
| Q6 | DAG 健全系補強 | **追加** |
| Q7 | E2E debug hint | **expect に stderr 含める** |

**ユーザー承認項目**:
- Q1〜Q7 推奨案でよいか
- ファイル変更計画（§5）でよいか
- Codex プロンプト骨子（§7）でよいか
