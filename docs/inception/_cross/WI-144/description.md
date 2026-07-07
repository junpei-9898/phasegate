---
id: WI-144
type: story
severity: high
status: tested
affects: []
source: internal
---

# WI-144: install/uninstall idempotency — 既存ファイルとの silent-skip 衝突で全 gate がバイパスされる問題を根絶する

> 起票日: 2026-05-11
> 起票経緯: 既に `package.json` / `.claude/` / `.codex/` / `.husky/` / `.github/workflows/` を持つ既存プロジェクトに `phasegate init` を入れると、`skill-deployer.ts` の全 deploy が「既存あれば silent skip」で済ませるため、phasegate は「インストール成功」を返すのに L0/L0.5 hook chain も pre-commit chain も CI workflow も一切刺さらない silent failure が起きる。結果、ユーザーは「phasegate を入れたのに gate を素通りする」「取り除こうにも何が phasegate 由来か判らず残骸が散る」状態に陥り、防御プリセットの真価が出ないまま運用 drift だけが進行する。本 WI は WI-143 (workflow enforcement) と独立に、setup/teardown layer そのものの根深い欠陥を構造的に解消する。

## 背景

`scripts/harness/setup/skill-deployer.ts` 全 658 行と `scripts/harness/main.ts:668-831` (init handler) を読み合わせた結果、`phasegate init --with-husky --with-ci --agent both` が触る 15 種類の deploy 先のうち、**6 種類が「既存あれば silent skip」** で衝突を回避している。skip された側に phasegate の hook chain / pre-commit chain / CI workflow が刺さらないため、phasegate は green を返すのに 1 件もチェックが走らない silent failure が成立する。さらに **uninstall command が存在せず**、deploy 先の manifest も `skills/.harness-version` 1 件のみのため、残り 14 種類の deploy 先は untracked で残る。

### A. silent-skip による「インストール成功 / 機能無効」の二重状態

`init` が touch する deploy 先と既存衝突時の挙動を網羅すると以下:

| Deploy target | 既存時 | 危険度 | 影響 |
|---|---|---|---|
| `phasegate.config.json` | skip | 低 | 意図通り |
| `skills/*/` (phasegate skill 群) | **全上書き** | 中 | 同名のユーザー skill があれば消える |
| `skills/.harness-version` | 上書き | 低 | manifest（意図通り） |
| `.claude/skills` symlink | skip (dir でも skip) | **高** | phasegate skill が認識されない |
| `.codex/skills` symlink | skip (dir でも skip) | **高** | 同上 |
| `.claude/scripts/` | **全上書き** (hook-config.json のみ preserve) | 中 | ユーザーカスタムスクリプト消失 |
| `.claude/settings.json` | skip | **致命** | hooks block が merge されず Claude hook 全無効 |
| `.codex/hooks.json` | skip | **致命** | hooks block が merge されず Codex hook 全無効 |
| `.husky/pre-commit` | skip | **致命** | L1/L2 chain が刺さらず pre-commit 防衛線無効 |
| `.husky/commit-msg` | skip | **致命** | Work-Item trailer 強制が無効 |
| `.husky/pre-push` | skip | **致命** | bypass audit が無効 |
| `.github/workflows/*.yml` | skip | **致命** | L3 CI gate が CI に乗らない |
| `docs/principles/*.md` | skip | 低 | 意図通り |
| `docs/folder_management_rules.md` | skip | 低 | 意図通り |
| `package.json` | **触らない** | 高 | `devDependencies.phasegate` も `scripts.phasegate:*` も自動追加されない |

「致命」が **6 件**。**いずれも warning も diagnostic も出ない**。ユーザーは `✓ Harness vX.Y.Z initialized` の成功メッセージを見るが、内部状態は「inert installation」(殻だけインストール) になっている。

### B. 既存ファイルへの merge 戦略が無い

`.claude/settings.json` には Claude hooks の標準 schema があり、`hooks.PreToolUse` / `PostToolUse` / `Stop` などの key に array で追加していけば既存 hook と phasegate hook を共存できる。同様に `.codex/hooks.json` も merge 可能。`.husky/pre-commit` も既存スクリプトの末尾に `npx phasegate ...` chain を追記すれば共存可能。`.github/workflows/aidlc-gate.yml` も別 file 名で追加すれば衝突しない。

しかし現状は **全て「既存あれば skip」の二択ロジック**しかなく、structured merge も diff 提示も interactive prompt も無い。

### C. uninstall / cleanup command が存在しない

`grep "uninstall\|cleanup\|teardown\|remove.*phasegate" scripts/harness/main.ts` は 0 ヒット。`init` で deploy された 15 種類のうち、唯一トラッキングされているのは `skills/.harness-version` のみ。残り 14 種類 (hook scripts / settings.json hooks block / husky hooks / CI workflows / .codex / .claude/skills symlink / phasegate.config.json / design docs / principles) は manifest 化されていないため、**phasegate を取り除こうとしても何が phasegate 由来か機械的に判別できない**。手動で消すしかなく、消し漏れが残るとリポは「phasegate 残骸あり + phasegate 機能なし」のゾンビ状態になる。

### D. 再 init / バージョンアップ時の reconciliation が無い

`update-skills` は `skills/` の再 deploy しかしない。`.claude/settings.json` / `.husky/*` / `.github/workflows/*.yml` は **template 側が更新されても既存があれば skip** で追従しない。phasegate v0.143 で hook chain を変更しても、既存 PJ では skip され続けて旧版 chain のまま塩漬けになる。再 init で diff も出ないため、ユーザーは「template が更新されたこと」自体に気づかない。

### E. WI-143 との切り分け

WI-143 は「WI workflow が ad-hoc plan で迂回される drift」を狙う。本 WI (WI-144) はその **前段**: そもそも phasegate の hook / pre-commit / CI が刺さっていない silent failure を防ぐ。setup layer が壊れていると WI-143 の skill gatekeeping / agent preamble も意味を成さない。両者は独立に必要。

## 本 WI でやること

### F1. `phasegate install` (`init` の冪等版) — 既存ファイルへの structured merge

新規 subcommand `phasegate install` を導入し、`init` を deprecate（互換維持）。挙動:

- 各 deploy 先について「missing / phasegate-managed / user-customized」を判定:
  - `.claude/settings.json` / `.codex/hooks.json`: 既存 JSON を parse し、`hooks` block に phasegate command を array 追加 (`PreToolUse` / `PostToolUse` / `Stop` / `SessionStart` / `UserPromptSubmit` の各 matcher で既存 entries に append。重複は dedupe)。`permissions.deny` も union で merge。
  - `.husky/pre-commit` / `commit-msg` / `pre-push`: 既存 script の末尾に `# === phasegate managed (BEGIN) ===` / `# === phasegate managed (END) ===` で囲んだ block を追記。既存 block があれば差分置換。
  - `.github/workflows/*.yml`: 別 file 名 (`phasegate-*.yml` prefix) で配置（既存 workflow と coexist）。
  - `package.json`: `devDependencies.phasegate` を semver で追加、`scripts.phasegate:*` の helper エイリアスを追加。既存 `scripts` 値があれば触らず append のみ。
- すべての merge に `--dry-run` (diff 表示) / `--apply` (実行) を持たせる。
- `--force` で managed block を再生成（user customization も上書き、ただし backup を `.phasegate/backups/{timestamp}/` に取る）。

### F2. `phasegate doctor` (新規 command) — silent-failure 検出

WI-143 で提案した `doctor` を本 WI で**実装スコープに含める**（両 WI 連携）。本 WI の責任範囲は「inert installation の検出」:

- `.claude/settings.json` に `npx phasegate hook` が含まれていない → red flag
- `.codex/hooks.json` に `npx phasegate hook` が含まれていない → red flag
- `.husky/pre-commit` に `phasegate lint` / `phasegate check-phase-gate` chain が含まれていない → red flag
- `.husky/commit-msg` に `phasegate commit-msg` が含まれていない → red flag
- `.husky/pre-push` に `phasegate bypass:audit` が含まれていない → warn
- `.github/workflows/` に phasegate workflow が無い → warn
- `package.json` の `devDependencies` に `phasegate` が無い → red flag (npx で動いていても reproducible install されない)
- `.claude/skills` / `.codex/skills` が phasegate の `skills/` を指していない → red flag
- 各 red flag に対し **コピペ可能な修復コマンド** (`npx phasegate install --merge .claude/settings.json --apply` 等) を出力

### F3. Deployment manifest (`.phasegate/manifest.json`)

`install` 実行時に **deploy したファイル一覧と「phasegate-managed / merged / created」種別**を記録:

```json
{
  "version": "0.144.0",
  "installedAt": "2026-05-11T...",
  "entries": [
    { "path": ".claude/settings.json", "mode": "merged", "block": "phasegate-hooks", "hash": "..." },
    { "path": ".husky/pre-commit", "mode": "merged", "block": "phasegate-managed", "hash": "..." },
    { "path": "skills/cascade-updater", "mode": "created", "hash": "..." },
    { "path": ".github/workflows/phasegate-aidlc-gate.yml", "mode": "created", "hash": "..." }
  ]
}
```

これにより、F4 の uninstall / F5 の reconcile が機械的に成立する。

### F4. `phasegate uninstall` (新規 command)

`.phasegate/manifest.json` を読み、各 entry を mode 別に処理:

- `created`: file を削除 (hash 一致を確認、改変があれば warn + backup)
- `merged`: managed block のみ削除（user 部分は保持）
- 空になった directory は cascade して削除 (`.claude/scripts/` 等)
- `.phasegate/backups/` に削除前 snapshot を取得
- `--dry-run` / `--apply` を両方提供
- 完了後 `manifest.json` を `.phasegate/uninstalled-{timestamp}.json` に rename

### F5. `phasegate reconcile` (新規 command, version upgrade 用)

manifest と現バージョンの template を比較:

- managed block の hash が変わっていれば update を提案
- user-customized 部分は触らず、managed block だけ更新
- `--apply` で実行
- 既存の `update-skills` は本 command に統合（互換 alias として残す）

### F6. `init` の deprecation 経路

`init` は当面残すが、内部実装は `install` に委譲。次の警告を 1 度出す:
```
⚠️  `phasegate init` is deprecated. Use `phasegate install` for idempotent setup.
   Existing files will be left untouched (legacy behavior). Run `phasegate doctor` to verify.
```

## 優先順位

1. **F3 (manifest)** — F4/F5 の土台。これ無しでは uninstall も reconcile も成立しない
2. **F2 (doctor)** — 既存ユーザーの silent-failure を即時可視化（最大レバレッジ）
3. **F1 (install with merge)** — 新規ユーザーの「インストール成功 / 機能無効」二重状態を根絶
4. **F4 (uninstall)** — 「取り除こうにも何が phasegate 由来か判らない」問題を解消
5. **F5 (reconcile)** — バージョンアップ追従
6. **F6 (init deprecation)** — 互換維持しつつ移行誘導

## 受け入れ基準

- [ ] `phasegate install --dry-run` が、各 deploy 先について「missing / will-merge / will-skip / will-overwrite」と diff を表示できる
- [ ] `phasegate install --apply` で既存 `.claude/settings.json` に phasegate hooks が **append** され、既存 entries が保持される
- [ ] 同様に既存 `.codex/hooks.json` / `.husky/pre-commit` / `commit-msg` / `pre-push` も merge される
- [ ] `phasegate install` が `package.json` に `devDependencies.phasegate` を追加する（既存があれば semver を update）
- [ ] `phasegate doctor` が `.claude/settings.json` に phasegate hooks が無い状態を非ゼロ exit で検出する
- [ ] `phasegate doctor` が `.husky/pre-commit` に phasegate chain が無い状態を非ゼロ exit で検出する
- [ ] `phasegate doctor` の出力にコピペ可能な修復コマンドが含まれる
- [ ] `.phasegate/manifest.json` が `install` 実行で生成され、deploy された全ファイルが entry として記録される（mode = created/merged の区別あり）
- [ ] `phasegate uninstall --dry-run` が `.phasegate/manifest.json` を読んで削除対象を列挙できる
- [ ] `phasegate uninstall --apply` が `created` entry を削除し、`merged` entry の managed block のみを削除する（user 部分は保持）
- [ ] uninstall 後、ユーザー自前の `.claude/settings.json` / `.husky/pre-commit` 等が動作する状態で残る
- [ ] `phasegate reconcile --dry-run` が template 更新を検出して diff を表示できる
- [ ] `phasegate init` 実行時に deprecation warning が出る（互換は維持）

## 非スコープ

- 既存 ad-hoc plan の migration ロジック本体（WI-143 が扱う）
- skill 内容そのものの再設計
- L1/L2/L3 validator の挙動変更（本 WI は配線層のみを扱う）
- `phasegate-config-doctor` skill (config 値診断) の機能変更 — `phasegate doctor` CLI はその sibling として独立追加
- Windows での symlink fallback の挙動（既存 junction 対応は維持）

## 実装分割

本 WI は umbrella として保持し、実装は以下の 4 つの sub-WI に分割する (2026-05-11 決定):

- **WI-145** [先行] F3 manifest + F2 doctor — 土台 + 即時可視化
- **WI-146** [WI-145 後] F1 install with merge — 冪等な structured merge
- **WI-147** [WI-145 後] F4 uninstall — manifest-driven clean removal (WI-146 と並列実装可)
- **WI-148** [WI-146 後] F5 reconcile + F6 init deprecation — version upgrade 追従と互換移行

WI-144 自体は全 sub-WI が completed となった時点で completed に移行する。

## AI 委譲経路の組み込み (2026-05-11 追加方針)

`init` / `install` / `uninstall` / `reconcile` は **100% 機械的にやり切れない** という重要な制約がある。具体例:

- 既存 `.husky/pre-commit` に user 高度 custom logic がある時の merge 位置判定
- user 改変済み `.claude/settings.json` の保持/破棄
- deploy 先と既存設計の意味的整合性チェック
- 既存 CI workflow との依存関係解決
- 既存 phasegate hook の前後に追記された user 独自 logic との共存判断

これらを silent skip / silent overwrite で済ませると、本 WI のゴール (silent failure 根絶) が達成されない。そこで:

- WI-145 で `RepairMode = "mechanical" | "ai-assisted" | "manual"` と `SuggestedSkill` を **domain 第一級** として導入
- WI-146/147/148 はこれを再利用し、`ai-assisted` 判定の操作を refuse + skill 起動 hint 出力 (`--force` で強行可、backup 取得済み前提)
- skill 起動は user の judgement で行う (doctor は自動 invoke しない)
- 既存 skill (`phasegate-config-doctor`, `phasegate-toolkit-guide`, `skill-creator` 等) で足りない場合は `skill-creator` 経由で新 skill を生成する経路を hint に含める

本方針により、phasegate は「機械的にやれることはやる / やれないことは人間と AI の協議に委ねる」 hybrid な setup/teardown を提供する。

## 関連

- WI-145 / WI-146 / WI-147 / WI-148: 本 WI の分割実装
- WI-143: WI-first workflow enforcement (本 WI の後段で skill / agent preamble layer を担保)
- WI-141: Commit bypass audit (`.husky/pre-push` の bypass:audit chain は本 WI で merge 対象)
- `phasegate-config-doctor` skill: 本 WI の `doctor` CLI の sibling
- `scripts/harness/setup/skill-deployer.ts`: 本 WI の主たる改修対象
- `scripts/harness/main.ts` (`case "init"`, `case "update-skills"`): install/reconcile への置換点
- `scripts/harness/agent-integration/`: `.claude/settings.json` / `.codex/hooks.json` の merge ロジック配置先候補
- `scripts/harness/ci-governance/`: `.github/workflows/*.yml` の merge ロジック配置先候補
- `templates/.claude/settings.json` / `templates/.codex/hooks.json` / `docs/templates/hooks/*` / `docs/templates/ci/*.yml`: managed block の source-of-truth
