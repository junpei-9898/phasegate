# TDD実装計画: H12-02 (ISSUE-007 Wave 2 / Phase A-2 baseline grandfather)

## 1. スコープ

### 対象ストーリー
ISSUE-007 Phase A-2 の受け入れ基準:

- [ ] pre-tool-use hook が baseline 内ファイルの編集で phase-gate をスキップする（ログに「grandfather」と明示）

加えて、同一仕組みで FULL_MODE_REQUIRED / STORY_REFLECTION もスキップする（後付け導入時の retrofit 痛点を解消するためには phase-gate 単独ではなく Write block 全般を grandfather する必要がある。`PROTECTED_FILE` のみ grandfather 対象外）。

### Wave 2 で扱わないもの
- HarnessError の suggestedSkill / scaffoldCommand / templatePath フィールド追加（Wave 3 / Phase B）
- `phasegate scaffold-design` CLI（Wave 4 / Phase C-1）
- `docs/guide/retrofit-adoption.md`（Wave 5 / Phase C-2）

### 影響する層
- **agent-integration Unit**:
  - domain: `BaselineGrandfatherQueryPort` 新規追加
  - domain: `ConfigQueryPort` に `getBaselineConfig()` メソッド追加（enabled + path）
  - application: `HandlePreToolUseUseCase` に grandfather 判定ロジック追加
  - infrastructure: `CiGovernanceBaselineGrandfatherAdapter` 新規（ci-governance の BaselineJsonRepositoryAdapter を内包）
  - infrastructure: `HarnessConfigConfigQueryAdapter` に baseline 読み出し実装追加
  - presentation: `pre-tool-use-hook.ts` で adapter 結線
- **ci-governance Unit**: 変更なし（Wave 1 の BaselineJsonRepositoryAdapter をそのまま再利用）

### Grandfather 対象の block reason

| Block reason | Grandfather skip | 根拠 |
|---|---|---|
| `PROTECTED_FILE` | ❌ しない | 保護ファイルは常に保護されるべき |
| `PHASE_GATE` | ✅ する | 既存ファイルの軽微な変更で logical_design を要求するのは retrofit の痛点 |
| `FULL_MODE_REQUIRED` | ✅ する | 既存の domain/api ファイル編集で Full mode を要求するのは retrofit の痛点 |
| `STORY_REFLECTION` | ✅ する | 既存ファイルに @story-id 要求は retrofit の痛点 |

## 2. 前提条件検証

- `docs/product/construction/agent-integration/logical_design.md` ✅ 存在
- Wave 1 の `BaselineJsonRepositoryAdapter` / `BaselineSnapshot` / `BaselineEntry` (v0.65.0) が cross-unit import 可能
- 既存の `HandlePreToolUseUseCase` は ISSUE-006 Story B で fullModeRequirementQueryPort を追加済み（同じ injection pattern を踏襲）

## 3. TDD 実装順序

### Step 1 — Unit テスト RED → GREEN → REFACTOR

配置: `scripts/harness/__tests__/unit/agent-integration/`

（Port / DTO 追加のみなので unit test は domain 側で最小限。主戦は integration test。）

### Step 2 — IT テスト RED → GREEN → REFACTOR

配置: `scripts/harness/__tests__/integration/agent-integration/`

#### 2.1 Adapter 単体 IT (IT-AI-BGF-*)

新規: `ci-governance-baseline-grandfather-adapter.test.ts`

| # | テスト ID | シナリオ |
|---|----------|--------|
| IT-1 | IT-AI-BGF-001 | baseline.json 無 → `allGrandfathered=false` |
| IT-2 | IT-AI-BGF-002 | config.baseline.enabled=false → `allGrandfathered=false`（baseline.json 有でも無視） |
| IT-3 | IT-AI-BGF-003 | enabled=true + baseline.json 有 + 全 paths が baseline 内 → `allGrandfathered=true` |
| IT-4 | IT-AI-BGF-004 | enabled=true + baseline.json 有 + 一部 paths が baseline 外 → `allGrandfathered=false`（all-or-nothing） |
| IT-5 | IT-AI-BGF-005 | targetFilePaths=[] → `allGrandfathered=false`（空入力は grandfather 対象外） |
| IT-6 | IT-AI-BGF-006 | baseline.json 不正 → 例外を投げず `allGrandfathered=false`（graceful degradation） |

#### 2.2 HandlePreToolUseUseCase 統合 IT (既存テストファイルに追記)

追記: `handle-pre-tool-use-usecase.test.ts`

| # | テスト ID | シナリオ |
|---|----------|--------|
| IT-7 | IT-AI-GF-001 | grandfathered=true + PHASE_GATE ブロッカー有 → `shouldBlock=false`（grandfather skip） |
| IT-8 | IT-AI-GF-002 | grandfathered=true + FULL_MODE_REQUIRED 検出 → `shouldBlock=false`（grandfather skip） |
| IT-9 | IT-AI-GF-003 | grandfathered=true + STORY_REFLECTION 違反 → `shouldBlock=false`（grandfather skip） |
| IT-10 | IT-AI-GF-004 | grandfathered=true + PROTECTED_FILE ブロック → `shouldBlock=true`（grandfather 対象外） |
| IT-11 | IT-AI-GF-005 | grandfathered=false + PHASE_GATE ブロック → 既存どおりブロック（regression） |
| IT-12 | IT-AI-GF-006 | baselineGrandfatherQueryPort 未注入 → 既存動作維持（backward compatible） |

#### 2.3 ConfigQueryPort 拡張 IT (既存テストファイルに追記)

追記: `harness-config-config-query-adapter.test.ts`

| # | テスト ID | シナリオ |
|---|----------|--------|
| IT-13 | IT-AI-HCC-BL-001 | config 未設定 → `{ enabled: false, path: '.phasegate/baseline.json' }`（既存設定を壊さない） |
| IT-14 | IT-AI-HCC-BL-002 | `baseline.enabled=true` + `baseline.path='.custom/path.json'` → その値を返す |

### Step 3 — Presentation 結線

- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` に adapter を注入
- 既存の `QuickModeFullModeRequirementAdapter` と同様の DI パターン

### Step 4 — grandfather ログ出力

grandfather skip 時は `process.stderr.write('[baseline] grandfather skip: ...')` でユーザーに可視化。hook は exit 0 だが stderr は Claude Code の hook UI に表示される（保存後に見える）。フォーマット:

```
[baseline] grandfather skip: phase-gate / full-mode / story-reflection
targets: scripts/harness/foo.ts, scripts/harness/bar.ts
```

## 4. 環境検証チェックリスト（事前実行結果）

- [x] Wave 1 v0.65.0 が commit / publish 済み
- [x] `scripts/harness/ci-governance/` の `BaselineJsonRepositoryAdapter` が cross-unit 参照可能
- [x] 既存 `pre-tool-use-hook.ts` の DI パターン（factory function 経由）を確認済み
- [x] ISSUE-006 Story B の `QuickModeFullModeRequirementAdapter` パターンを踏襲可能

## 5. QA（不明点・確認事項）

### [Question] Q1: grandfather 対象 block reason

PHASE_GATE 単独か、FULL_MODE_REQUIRED と STORY_REFLECTION も含むか?

**推奨案:** PHASE_GATE + FULL_MODE_REQUIRED + STORY_REFLECTION の 3 つすべて grandfather 対象。retrofit 痛点の核心は「既存ファイル編集で block」なので、block の種類を限定すると不完全になる。PROTECTED_FILE のみ grandfather 対象外。

[Answer]
（人間が回答を記入）

---

### [Question] Q2: All-or-nothing vs per-file grandfather

複数ファイル対象（Bash 経由の apply_patch 等）で、一部が baseline 内・一部が baseline 外のとき、どう扱う?

**推奨案:** **All-or-nothing**。全ファイルが baseline 内のときのみ grandfather。一部でも baseline 外なら通常通り block。理由:
- pre-tool-use hook の block 粒度が「tool 呼び出し全体」で per-file 制御不可
- 「baseline 外の新規ファイルが 1 つでも含まれる」なら設計整備を要求すべき
- 判定ロジックがシンプルで誤操作リスクが低い

[Answer]
（人間が回答を記入）

---

### [Question] Q3: baseline.enabled のデフォルト値

`phasegate.config.json.baseline` が未記述のとき `enabled` はデフォルト false / true どちらか?

**推奨案:** **false**（明示的 opt-in）。理由:
- 既存ユーザーへの影響ゼロ（破壊的変更なし）
- `.phasegate/baseline.json` が誤って commit されていても、config で enabled しない限り grandfather は発動しない
- retrofit 導入手順が「1. `phasegate baseline` 実行 → 2. config に `baseline.enabled: true` 追加」の 2 段階になり、明示的でわかりやすい

[Answer]
（人間が回答を記入）

---

### [Question] Q4: grandfather ログの出力先

stderr / stdout / JSON 構造 / 出さない？

**推奨案:** stderr に 1〜3 行の human-readable ログ。理由:
- Claude Code の hook は exit 0 でも stderr を拾って transcript に残す（要検証）
- JSON だと grep しにくい
- ログ出さないと「なぜ block されないか」が不透明で運用時に混乱する

出力例:
```
[baseline] grandfather skip (phase-gate): scripts/harness/foo.ts
```

[Answer]
（人間が回答を記入）

---

### [Question] Q5: Full Mode hook の自己ブロック問題

Wave 1 と同様、agent-integration Unit の新規ファイル（port / adapter）は FULL_MODE_REQUIRED hook によって自己ブロックされる。対策は?

**推奨案:** Wave 1 と同じ手順 — 一時的に `phasegate.config.json.quickMode.fullModeRequiredWhen.mixedCategories` を false に設定 → Wave 2 完了後に true に戻す。本件は ISSUE-006 の既知トレードオフ（hook が skill 識別不可）であり、Wave 2 自体がこの問題の将来的解決手段（baseline grandfather）を作っている構造。

**Wave 2 以降の未来像**: Wave 2 完了後に `phasegate baseline` を再実行して全ファイルを grandfather 登録 → `baseline.enabled: true` に設定 → 以降の Wave では hook の一時無効化が不要になる（自動 grandfather skip）。ただしこれはメンテナー自身の方針判断で、本 plan では保留。

[Answer]
（人間が回答を記入）

---

## 6. 前提条件・リスク

### リスク
- **R1**: agent-integration → ci-governance の cross-unit import が発生する。Clean Architecture 上は infrastructure 層の adapter が他 Unit の infrastructure を呼ぶ形で許容範囲（ISSUE-006 Story B で agent-integration → quick-mode と同じパターン）
- **R2**: baseline.json が 10000+ entry の場合、`snapshot.contains()` は `Set` ベースで O(1) なので問題なし。ただし毎回 JSON.parse するコストあり → process-level cache はしない（hook は短命プロセス）、OS page cache に頼る
- **R3**: grandfather 判定ミスで block すべきファイルを通してしまうリスク → 全 paths 必ず baseline 内であることを確認する all-or-nothing で保護

### 前提
- Wave 1 の BaselineJsonRepositoryAdapter / BaselineSnapshot / BaselineEntry 実装が正しく動作すること（Wave 1 の IT / unit tests で検証済み）

### スキル選択
story-implementor スコープ（新 port / adapter / domain タイプ変更あり）。

---

**承認後、Phase 2 実装を Step 2 から開始します。**
