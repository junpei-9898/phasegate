---
id: WI-145
type: story
severity: high
status: drafted
affects: [harness-api, setup, agent-integration, ci-governance]
source: internal
---

# WI-145: Deployment manifest と silent-failure doctor — install/uninstall idempotency の土台

> 起票日: 2026-05-11
> 起票経緯: WI-144 (umbrella) の分割実装第 1 弾。F3 (`.phasegate/manifest.json`) と F2 (`phasegate doctor`) を 1 サイクルにまとめ、後続 WI (WI-146 install / WI-147 uninstall / WI-148 reconcile) の前提となる「deploy 先トラッキング基盤」と「既存導入 PJ への即時可視化手段」を同時に提供する。

## 背景

WI-144 で特定した 6 件の致命的 silent-failure (`.claude/settings.json` / `.codex/hooks.json` / `.husky/pre-commit` / `commit-msg` / `pre-push` / `.github/workflows/*.yml` の skip-on-exist) を放置すると、phasegate は `✓ Harness vX initialized` を返すのに 1 件もチェックが走らない inert installation が成立する。さらに deploy 先の manifest が `skills/.harness-version` 1 件しか無いため、後続の `uninstall` / `reconcile` も成立しない。

本 WI は以下を同時に解決する:

- **manifest (F3)**: deploy された全ファイルを `created` / `merged` の区別付きで `.phasegate/manifest.json` に記録する基盤を作る。これにより WI-146/WI-147/WI-148 が manifest を読んで動作できる。
- **doctor (F2)**: manifest が無い既存 PJ には heuristic で、manifest がある新 PJ には manifest ベースで silent-failure を検出する CLI を提供。即時に既存ユーザーが「インストール成功 / 機能無効」状態を発見できる。

両者を 1 サイクルにまとめる理由: manifest を書く側 (将来の install) と読む側 (doctor) を同じ logical_design で設計することで schema 整合性を担保するため。

## 本 WI でやること

### F3-1: Manifest schema 定義 (domain layer)

`.phasegate/manifest.json` の JSON schema を確定:

```json
{
  "version": "0.145.0",
  "installedAt": "2026-05-11T...",
  "entries": [
    { "path": ".claude/settings.json", "mode": "merged", "block": "phasegate-hooks", "hash": "sha256:..." },
    { "path": ".husky/pre-commit", "mode": "merged", "block": "phasegate-managed", "hash": "sha256:..." },
    { "path": "skills/cascade-updater", "mode": "created", "hash": "sha256:..." }
  ]
}
```

- `mode`: `"created"` (phasegate が新規作成) / `"merged"` (既存ファイルに managed block を追加)
- `block`: merged 時の block 識別子（uninstall 時の block 除去 key）
- `hash`: deploy 時点のコンテンツ hash（user 改変検出用）

### F3-2: Manifest I/O (infrastructure layer)

- `loadManifest(projectRoot)`: 既存 manifest を読む。無ければ `null`
- `saveManifest(projectRoot, manifest)`: atomic write (tmp → rename)
- `addEntry(manifest, entry)` / `removeEntry(manifest, path)`: in-memory 操作
- 既存 `init` / `update-skills` を本 manifest API に**最小限の改修**で書き込み対応させる（既存挙動は変えず、manifest 書き出しのみ追加）

### F3-3: Heuristic detectors (application layer, doctor の検査ロジック本体)

manifest が無い既存 PJ でも検出できる以下の検査を実装:

| Check | Heuristic | 重大度 |
|---|---|---|
| Claude hook installed | `.claude/settings.json` に `"npx phasegate hook"` を含む string が無い | red |
| Codex hook installed | `.codex/hooks.json` に `"npx phasegate hook"` を含む string が無い | red |
| Husky pre-commit | `.husky/pre-commit` に `phasegate lint` または `phasegate check-phase-gate` が無い | red |
| Husky commit-msg | `.husky/commit-msg` に `phasegate commit-msg` が無い | red |
| Husky pre-push | `.husky/pre-push` に `phasegate bypass:audit` が無い | warn |
| CI workflow | `.github/workflows/` に phasegate workflow file が無い | warn |
| Package devDep | `package.json` の `devDependencies` に `phasegate` が無い | red |
| Skill symlink (claude) | `.claude/skills` が phasegate `skills/` を指していない | red |
| Skill symlink (codex) | `.codex/skills` が phasegate `skills/` を指していない | red |

各 check は domain ports を介して呼ばれ、結果は `DiagnosticReport` value object に集約される。

### F2-1: `phasegate doctor` CLI (presentation layer)

- `npx phasegate doctor` で全 check を実行、red flag が 1 件でもあれば非ゼロ exit
- 出力形式は human (デフォルト) / json (`--json`)
- 各 red flag に対し **コピペ可能な修復コマンド** を併記（修復コマンド自体は未実装で OK。`# Run after WI-146 lands:` のような hint コメント付きで暫定 install command を示す）
- `--strict` で warn も非ゼロ exit に昇格

### F2-3: AI 委譲経路の domain 構造化

`init` / `install` / `uninstall` / `reconcile` は 100% 機械的にやり切れない (例: 既存 husky に user 高度 custom logic がある時の merge 位置判定、user 改変済み `.claude/settings.json` の保持/破棄、deploy 先と既存設計の意味的整合性チェック)。本 WI で以下を **domain 第一級** として導入し、WI-146/147/148 が再利用する:

- `RepairMode = "mechanical" | "ai-assisted" | "manual"` value object
- `SuggestedSkill = { skillName, rationale, invokeCommand }` value object
- `RepairTable` (checkId → SuggestedSkill の静的マッピング、domain layer)
- 各 `HeuristicCheck` 内で `repairMode` を判定 (file 存在 / template 互換 / user 改変有無)
- doctor 出力 (human/json) に `repairMode` ラベルと skill 起動 hint を含める
- exit code: `repairMode != mechanical` finding が 1 件でも存在すれば warn 扱い (strict 時 fail)

doctor 自身は skill を自動起動しない (Q5 推奨案 a)。hint 提示までで、skill 起動は user の judgement で行う。

### F2-2: doctor の test fixtures

`scripts/harness/__tests__/integration/` 配下に以下の fixture を整備:

- `inert-install/` — settings.json 既存だが phasegate hook 無し（最も典型的な失敗ケース）
- `partial-install/` — claude のみ動作、codex 未配線
- `full-install/` — 全部正しく入っている
- `no-phasegate/` — phasegate 未導入

各 fixture に対する doctor 出力を golden 化。

## 受け入れ基準

- [ ] `.phasegate/manifest.json` schema が domain value object として定義され、JSON serialization round-trip が壊れない
- [ ] `loadManifest` が無い manifest に対し `null` を返し、壊れた JSON に対しては明確な error を投げる
- [ ] `saveManifest` が atomic (tmp → rename) で書き込み、書き込み中の crash で manifest が壊れない
- [ ] 既存 `init` / `update-skills` が `.phasegate/manifest.json` を書き出すようになる（既存ファイルの deploy 結果が manifest 化される）
- [ ] `npx phasegate doctor` が `inert-install` fixture に対し非ゼロ exit を返し、red flag 一覧を出力する
- [ ] `npx phasegate doctor` が `full-install` fixture に対しゼロ exit を返す
- [ ] `npx phasegate doctor --json` の出力が JSON schema に従う構造化レポートを返す
- [ ] doctor の各 red flag 出力に修復コマンドの hint が含まれる
- [ ] 各 heuristic check が単体テストでカバーされる（fixture 9 種類分）
- [ ] `DiagnosticFinding.repairMode` が `mechanical` / `ai-assisted` / `manual` の 3 値で各 check 内で判定される
- [ ] `ai-assisted` finding に対し `suggestedSkill.invokeCommand` 形式の skill 起動 hint が出力される（e.g. `invoke /phasegate-config-doctor`）
- [ ] `repairMode != mechanical` finding が 1 件でも存在する場合、doctor exit code が warn 扱いになる（`--strict` 時 fail）
- [ ] `RepairTable` (checkId → SuggestedSkill マッピング) が domain layer に静的テーブルとして実装され、9 種 check 全てに対し適切な skill 推奨が定義される
- [ ] manifest 関連の domain / application / infrastructure / presentation コードが Clean Architecture 依存方向を守る
- [ ] 全コードが phasegate L1/L2 を pass する（metadata / test-quality / phase-gate）

## 非スコープ

- F1 (`phasegate install` with structured merge) — WI-146 で実装
- F4 (`phasegate uninstall`) — WI-147 で実装
- F5 (`phasegate reconcile`) — WI-148 で実装
- F6 (`init` deprecation warning) — WI-148 で実装
- 既存の `init` 挙動変更（manifest 書き出しは追加のみ、deploy 挙動は変えない）
- doctor が検出した問題の自動修復（hint コマンドの出力までで、実行は WI-146 の install に委ねる）

## 関連

- WI-144: install/uninstall idempotency (本 WI の親 umbrella)
- WI-146: F1 install with merge (本 WI の manifest を書く側)
- WI-147: F4 uninstall (本 WI の manifest を読む側)
- WI-148: F5 reconcile + F6 init deprecation (本 WI の上に乗る)
- `scripts/harness/setup/skill-deployer.ts`: 既存 init/update-skills の manifest 書き出し改修点
- `scripts/harness/harness-api/`: `doctor` command 追加点
- `templates/.claude/settings.json` / `templates/.codex/hooks.json` / `docs/templates/hooks/*` / `docs/templates/ci/*.yml`: heuristic check の参照点
