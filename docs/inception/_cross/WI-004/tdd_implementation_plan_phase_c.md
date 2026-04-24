# TDD実装計画: ISSUE-004 Phase C — init 機能強化

## 1. スコープ

### 対象（ISSUE-004 「対処方針 → Phase C」）

1. **P1-4 対応**: `init` で `docs/principles/*.md` と `docs/folder_management_rules.md` を導入PJに自動配置
2. **P1-5 対応**: `init` で `templates/.husky/pre-commit` を配置（オプションフラグ `--with-husky`）
3. **README 同期**: Quick Start §3 の手動 `cp` 手順を削除（README.md / README.ja.md 両方）

### 影響範囲

| 層 | 対象ファイル |
|----|---|
| infrastructure | `scripts/harness/setup/skill-deployer.ts` — 新関数 `deployDesignDocs()` `deployHuskyHook()` を追加 |
| presentation | `scripts/harness/main.ts` — `init` ケースに新関数呼び出し + `--with-husky` フラグ解析 |
| docs | `README.md` / `README.ja.md` — Quick Start §3 削除 + §4 を §3 に繰り上げ |
| tests | `__tests__/unit/setup/skill-deployer.test.ts` — 新関数のユニットテスト追加 |
| tests | `__tests__/integration/setup/init-design-docs.integration.test.ts`（新規）— init 統合テスト |

### スコープ外

- `templates/phasegate.config.json` の dead code 削除 → Phase D
- `testing_rules.md` リンク切れ修正 → Phase D
- `--with-husky` 以外の対話的設定（P2-7）→ Optional・将来課題

---

## 2. 前提条件検証

| 項目 | 状態 | 備考 |
|---|---|---|
| 設計根拠文書 | ✅ 存在 | `docs/inception/_cross/WI-004/description.md`「対処方針 → Phase C」セクション |
| Phase B 完了 | ✅ 完了 | v0.35.0 リリース済み（commit `c26edab`） |
| 影響Unit logical_design | ❌ 不在 | `docs/product/construction/setup/` 配下が未整備（Phase B と同様の状況） |
| テスト基盤 | ✅ 存在 | `__tests__/unit/setup/skill-deployer.test.ts` が既存テストパターンを提供 |

**判定**: Phase B と同じく、ISSUE-004 issue_description.md を設計根拠とし、本計画書を補助設計として進める（QA Q1 で人間承認を得る）。

---

## 3. 設計判断

### D1: docs 配置先と既存ファイルの扱い

| 配置元 | 配置先 | 既存処理 |
|---|---|---|
| `docs/principles/architecture-philosophy.md` | `<projectRoot>/docs/principles/architecture-philosophy.md` | 既存ならスキップ |
| `docs/principles/model-routing.md` | `<projectRoot>/docs/principles/model-routing.md` | 既存ならスキップ |
| `docs/principles/testing-rules.md` | `<projectRoot>/docs/principles/testing-rules.md` | 既存ならスキップ |
| `docs/folder_management_rules.md` | `<projectRoot>/docs/folder_management_rules.md` | 既存ならスキップ |

**根拠**: `init` の既存方針（`settings.json` も `phasegate.config.json` も既存スキップ）と整合。利用者がカスタマイズした内容を上書きしない。

### D2: `--with-husky` のオプトインモデル

`.husky/pre-commit` 配置は**デフォルトで実行しない**。理由:

- husky 自体が利用者の選択（Lefthook/simple-git-hooks 等の代替あり）
- 利用者の既存 `.husky/pre-commit` が存在する可能性
- husky 未インストール環境で空ディレクトリだけ作ると混乱する

**フラグなし**: pre-commit は配置しない（Next steps で案内のみ）
**`--with-husky`**: `templates/.husky/pre-commit` を配置（既存ならスキップ）

### D3: 新関数のシグネチャ

```ts
// skill-deployer.ts に追加
export interface DeployDesignDocsResult {
  copiedFiles: string[];      // 実際にコピーしたファイル名
  skippedFiles: string[];     // 既存でスキップしたファイル名
}

export async function deployDesignDocs(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployDesignDocsResult>;

export interface DeployHuskyHookResult {
  created: boolean;           // 新規作成したか（既存ならfalse）
  path: string;               // 配置先絶対パス
}

export async function deployHuskyHook(
  harnessRoot: string,
  projectRoot: string,
): Promise<DeployHuskyHookResult>;
```

### D4: README 構成の繰り上げ

**Before:**
```
1. Install
2. Initialize
3. Copy design principles    ← 削除
4. Start the AIDLC
```

**After:**
```
1. Install
2. Initialize  ← 「This deploys 28 skills, design docs, and generates phasegate.config.json」と一文追加
3. Start the AIDLC
```

### D5: フェーズゲートのリスク回避

`scripts/harness/setup/` は `docs/product/construction/setup/logical_design.md` が存在せず、新規ファイル作成は pre-tool-use hook でブロックされる可能性がある。Phase B と同じく **Codex CLI 経由** で実装することで、メインセッションのフェーズゲート影響を回避（Codex は phasegate hook の管理外）。

---

## 4. TDD実装順序

### Wave 1: skill-deployer.ts への関数追加（Codex 委任）

| # | 種別 | 対象 | テスト内容 / 実装内容 |
|---|---|---|---|
| 1 | RED | `__tests__/unit/setup/skill-deployer.test.ts` に `deployDesignDocs` テスト追加 | 4 ファイルが PJ にコピーされること / 既存ファイルがスキップされること |
| 2 | GREEN | `setup/skill-deployer.ts` に `deployDesignDocs` 実装 | `copyFile` をループで実行、既存は `fs.access` で判定してスキップ |
| 3 | RED | `__tests__/unit/setup/skill-deployer.test.ts` に `deployHuskyHook` テスト追加 | `templates/.husky/pre-commit` がコピーされ chmod 0755 / 既存はスキップ |
| 4 | GREEN | `setup/skill-deployer.ts` に `deployHuskyHook` 実装 | `copyFile` + `chmod` |

### Wave 2: main.ts init コマンドへ統合（Codex 委任）

| # | 種別 | 対象 | テスト内容 / 実装内容 |
|---|---|---|---|
| 5 | RED | `__tests__/integration/setup/init-design-docs.integration.test.ts`（新規） | `phasegate init --name X` で 4 ファイルが配置されること / `--with-husky` で `.husky/pre-commit` 配置 / フラグなしで `.husky/` 未生成 |
| 6 | GREEN | `main.ts` の `case 'init'` を更新 | `deployDesignDocs()` 呼び出し（常時）+ `--with-husky` で `deployHuskyHook()` 呼び出し / Next steps メッセージ更新 |

### Wave 3: README 同期（メインセッション直接編集、Phase Gate 影響なし）

| # | 種別 | 対象 | 内容 |
|---|---|---|---|
| 7 | edit | `README.md` | §3 削除 + §2 末尾に「Design docs are auto-deployed」追記 + §4 を §3 に繰り上げ |
| 8 | edit | `README.ja.md` | 同上の日本語版 |
| 9 | edit | `CHANGELOG.md` | v0.36.0 セクション追加 |
| 10 | edit | `package.json` | version 0.35.0 → 0.36.0 |

### Wave 4: 検証 + リリース（メインセッション）

| # | 内容 |
|---|---|
| 11 | 全テスト実行（`npm test`）green確認 |
| 12 | git add（Phase C 関連のみ）+ commit + tag v0.36.0 + push |

---

## 5. Codex 委任プロンプト雛形

### Wave 1 用プロンプト

```
TASK: skill-deployer.ts に init 機能拡張用の 2 関数を追加（TDD: RED→GREEN）

CONTEXT:
- Phasegate v0.36.0 で init を強化し、docs と husky を自動配置する
- ISSUE-004 Phase C の Wave 1
- 設計根拠: docs/inception/_cross/WI-004/tdd_implementation_plan_phase_c.md セクション 3 (D1, D3) と セクション 4 Wave 1

ALLOWED FILES (これ以外を作成・編集してはならない):
- scripts/harness/setup/skill-deployer.ts (新関数 2つを末尾に追加)
- scripts/harness/__tests__/unit/setup/skill-deployer.test.ts (テスト追加)

DO NOT:
- docs/ 配下に新ファイルを作成しない
- 他の Unit に触れない
- 既存関数の signature を変更しない

実装手順は計画書 Wave 1 の通り。テストは AAA パターン、日本語テスト名、actual 変数を使うこと。
```

### Wave 2 用プロンプト

```
TASK: main.ts の init コマンドに deployDesignDocs / deployHuskyHook 呼び出しを統合

CONTEXT:
- Wave 1 で追加した関数を init から呼ぶ
- ISSUE-004 Phase C の Wave 2
- 設計根拠: docs/inception/_cross/WI-004/tdd_implementation_plan_phase_c.md セクション 3 (D2, D4)

ALLOWED FILES:
- scripts/harness/main.ts (init ケースのみ修正、import 追加可)
- scripts/harness/__tests__/integration/setup/init-design-docs.integration.test.ts (新規)

DO NOT:
- docs/ 配下に新ファイルを作成しない
- init 以外のサブコマンドに触れない
- printUsage() の Setup セクションに --with-husky を追記する以外の usage 変更をしない
```

---

## 6. 環境検証チェックリスト（事前実行）

- [x] Phase B 後の templates/.husky/pre-commit が `npx phasegate pre-commit` を呼ぶ形式（v0.35.0 で確認済み）
- [x] docs/principles/ に 3 ファイル存在: architecture-philosophy.md, model-routing.md, testing-rules.md
- [x] docs/folder_management_rules.md 存在
- [x] package.json の `files` に docs/principles/** と docs/folder_management_rules.md が含まれる（v0.34.0 で対応済み）
- [x] templates/.husky/pre-commit が package.json `files` の `templates/**` で出荷される

---

## 7. QA（不明点・確認事項）

### [Question] Q1: 設計根拠を ISSUE-004 + 本計画書とすることの承認

Phase B と同様、`docs/product/construction/setup/logical_design.md` 等の正規設計文書は不在。代わりに ISSUE-004 issue_description.md（Phase C セクション）と本計画書を設計根拠として進めたい。

**推奨案**: 承認（Phase B 前例踏襲）

[Answer]
承認（2026-04-17 ユーザー承認）。

### [Question] Q2: `--with-husky` のデフォルト値

D2 の通り「フラグなしでは husky 配置しない」を推奨。理由は husky 自体が利用者の選択肢であり、勝手に作ると既存ワークフローを壊す可能性があるため。

**推奨案**: デフォルト OFF、明示的 `--with-husky` で ON（D2 通り）

[Answer]
承認（2026-04-17 ユーザー承認）。

### [Question] Q3: 既存ファイルがある場合の通知

`docs/principles/testing-rules.md` などが既に存在する場合、`init` は静かにスキップして OK か、警告を出すべきか。

**推奨案**: コンソールに「  docs/principles/testing-rules.md already exists, skipped」（先頭2スペース、settings.json と同じトーン）。エラーにはしない。

[Answer]
承認（2026-04-17 ユーザー承認）。

### [Question] Q4: README §2 の追記文言

英版: "This deploys 28 skills, design principles docs, and generates `phasegate.config.json`."
日版: 「28 のスキル、設計原則ドキュメント、`phasegate.config.json` を配置します。」

**推奨案**: 上記文言で統一

[Answer]
承認（2026-04-17 ユーザー承認）。

---

## 8. 前提条件・リスク

### リスク

| # | リスク | 緩和策 |
|---|---|---|
| R1 | Codex がスコープ外（docs/ や他Unit）を編集する | プロンプトで ALLOWED FILES と DO NOT を明示。実装後 `git diff --stat` で検証 |
| R2 | フェーズゲート pre-tool-use hook が新規ファイル作成をブロック | Codex CLI 経由で実装（メインセッションの hook 影響外） |
| R3 | husky 未インストール環境で `--with-husky` を指定 | `init` は配置のみ、実行は利用者責務。Next steps で案内 |
| R4 | docs ファイル名変更時に init が壊れる | 関数内で `docs/principles/` をディレクトリスキャンする実装にすれば追従可能 |

### 前提

- Phase B (v0.35.0) の templates/.husky/pre-commit が正しく更新済み
- Codex CLI v0.118.0 が利用可能
- npm pack で docs/principles/** と docs/folder_management_rules.md が出荷される（v0.34.0 で対応済み）

---

## 9. ファイル変更サマリー（予測）

| ファイル | 変更種別 | 行数（概算） |
|---|---|---|
| `scripts/harness/setup/skill-deployer.ts` | +60 | 2 関数追加 |
| `scripts/harness/main.ts` | +12 | init ケース内 + import |
| `scripts/harness/__tests__/unit/setup/skill-deployer.test.ts` | +120 | 8 テストケース程度 |
| `scripts/harness/__tests__/integration/setup/init-design-docs.integration.test.ts` | +100 | 新規（3 テストケース） |
| `README.md` | -8/+2 | §3 削除、§2 追記、§4→§3 |
| `README.ja.md` | -8/+2 | 同上 |
| `CHANGELOG.md` | +20 | v0.36.0 セクション |
| `package.json` | ±1 | version 0.35.0 → 0.36.0 |

---

## 10. 完了条件

- [ ] Wave 1〜4 全実行完了
- [ ] 全テスト green（既存 3002 件 + 新規 11 件 = 3013 件想定）
- [ ] `npx phasegate init` で docs/principles/*.md と docs/folder_management_rules.md が配置される（手動検証）
- [ ] `npx phasegate init --with-husky` で .husky/pre-commit が配置される（手動検証）
- [ ] README §3 削除済み、§2 追記済み（英日両方）
- [ ] v0.36.0 リリース（tag + push）
