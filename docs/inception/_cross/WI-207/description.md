---
id: WI-207
type: story
severity: high
status: tested
affects: [installation, documentation]
source: user-feedback
---

# WI-207: Personal / Local-Only install mode that does not mutate team-owned files

> 起票日: 2026-05-21
> 起票経緯: ユーザーからのフィードバック。「チームの PJ で個人的に phasegate を使いたいが、現状の `install` / `init` をそのまま走らせると `package.json` 等の team-owned ファイルが汚染される」。`README.md:490` の `init sets up files inside the project` と `scripts/harness/installation/application/usecases/run-install.ts:497` の hard-coded `package.json` target で確認済み。Codex hooks も `~/.codex/` 側に置けるドキュメント根拠があるのに、phasegate 側は project-local しか選べない。

## 問題

phasegate の公式導入経路 (`phasegate install`, `phasegate init`, `phasegate setup:agent --apply`) は team-owned ファイルを混ぜて書き換える前提で組まれており、「team PJ に個人だけが phasegate を導入する」ユースケースで以下が起きる:

1. **`package.json` が常に touch される**
   - `scripts/harness/installation/application/usecases/run-install.ts:497` で `{ path: "package.json", strategy: "package-json" }` が install targets に **無条件で含まれる**。`--agent` / `--skills` / `--workflow` / `--with-husky` / `--with-ci` のどの組み合わせでも除外する flag がない。
   - `scripts/harness/main.ts:123` の `ensurePhasegatePackageDependency` は `setup:agent --apply` 経路でも `devDependencies.phasegate` を勝手に追加する。
   - 既に WI-199 で「protected file として `--apply` を拒否する」mechanism は入っているが、これは個人利用者にとっては「install 自体が refuse される」結果になるだけで、汚さずに個人だけ使うための代替経路にはなっていない。

2. **install command が husky / CI を強制する**
   - `scripts/harness/main.ts:2080-2081` で `phasegate install` は `includeHusky: true, includeCi: true` を **ハードコード** している。`--with-husky` / `--with-ci` フラグの認識はあるが、true 以外に倒す手段がない。
   - 結果として `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`, `.github/workflows/phasegate-aidlc-gate.yml` が個人意図に関わらず team 側に書き込まれる。

3. **Codex hooks が project-local 固定**
   - install target は `.codex/hooks.json` のみ。`docs/guide/codex-integration.md:152` には `~/.codex/` に置けると明記されているのに、install/uninstall/reconcile は project root しか面倒を見ない。
   - 個人利用者は手動で `~/.codex/hooks.json` を作って同じ JSON を維持しなければならず、`phasegate reconcile` が変更を検知できない。

4. **生成物の git 追跡分離が手動**
   - phasegate は `.phasegate/`, `.claude/`, `.codex/`, `phasegate.config.json`, `skills/` 等の生成物を作るが、team の `.gitignore` を編集せずに個人だけ無視する仕組み (例: `.git/info/exclude` への自動追加) を提供しない。
   - team の `.gitignore` を編集すれば team policy 汚染、編集しなければ untracked file の山が team に commit される事故が起きやすい。

5. **AGENTS.md / CLAUDE.md の managed section**
   - `install` は `AGENTS.md` と `CLAUDE.md` に managed-section を merge する。既存ファイルがある team PJ では、個人利用でも team-owned agent context に phasegate 流儀が混ざる。

6. **product overview が個人/team の install policy 差を扱っていない**
   - `docs/inception/_shared/product_overview_plan.md:13-14` の Q1 は「全レベルの開発チーム」を対象としており、team PJ への個人混入ユースケースは明示的にスコープされていない。`docs/guide/setup-artifacts.md` も managed target / user-level settings の分類はあるが、「team-owned ファイルには触らない personal install」を商品上の選択肢として提示していない。

## 影響

- team PJ 上で個人が phasegate を試したいだけでも、初回 `install --apply` で `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, `.codex/hooks.json` が dirty になる。
- `npx phasegate@latest validate --layer L2` のような「一時利用」ガイドが README/設定 doc に存在しないため、ユーザーは uninstall 前提でフル install するか worktree に逃げるしかない。
- worktree 退避は重く、`reconcile` / `manifest.json` が worktree 単位になるため、本ブランチに戻すときに同じ汚染問題が再発する。
- WI-199 で `uninstall` の protected-file refuse を強化したことで、「うっかり入れて戻す」も `--force` 前提になり個人利用のハードルが上がっている。
- 結果として「phasegate を個人で試したい AI ユーザー」が team との衝突を恐れて評価をやめる、または team 標準化の合意なしに勝手に commit してしまうリスクが残る。

## 受け入れ基準

- [ ] `phasegate install --personal` (or equivalent intent) が `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*` などの team-owned ファイルを **plan にも apply にも一切含めない**。
- [ ] 同モードで Codex hooks を project-local (`.codex/hooks.json`) ではなく user-level (`~/.codex/hooks.json`) を target にする選択肢が存在する。または「Codex hook は手動 user-level 設定」を明示する planner output を返す。
- [ ] 同モードで phasegate 生成物 (`phasegate.config.json`, `.phasegate/`, `.codex/`, `.claude/`, `skills/`) を team `.gitignore` ではなく `.git/info/exclude` に登録するための公式 CLI / guidance がある。最低でも「team `.gitignore` を一切 touch しない」が保証される。
- [ ] 同モードでは Husky / CI workflow file を **生成しない**。`includeHusky` / `includeCi` を false に倒せる経路が `phasegate install` の CLI として存在する (現状 hard-coded `true`)。
- [ ] 同モードの設定ファイル parking 先として、project root の `phasegate.config.json` 以外 (例: `.phasegate-local/config.json` または `--config <path>` で指定する任意 path) を選べる。 既存 `phasegate.config.json` がある team PJ ではそれを変更しない。
- [ ] `phasegate uninstall` が personal mode で作った artifact を、team-owned ファイルに一切触らずに完全撤去できる。WI-199 の protected refuse と整合する。
- [ ] `phasegate doctor` / `setup:agent --json` が personal install を「team install と別カテゴリ」として表示し、`package.json` 等の team file が touch されていないことを確認可能なフィールドを返す。
- [ ] `README.md` / `docs/guide/installation.md` / `docs/guide/setup-artifacts.md` に personal mode の利用条件・制約・推奨運用 (worktree 比較含む) を明記する。`docs/inception/_shared/product_overview_plan.md` Q1 系を「個人 in team PJ」も含めるよう改訂する。
- [ ] regression test が「personal install --apply 後に team-owned ファイル (`package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, `.gitignore`) の bytes が変化していない」ことを固定する。
- [ ] regression test が「同モードの後で `phasegate uninstall --apply` を実行すると personal artifact のみが消え、上記 team-owned ファイルは変化しない」ことを固定する。

## 原因分析

| # | Gap | 該当箇所 | 担当 Unit |
|---|-----|---------|-----------|
| 1 | `package.json` が install targets に無条件で入っている。 | `scripts/harness/installation/application/usecases/run-install.ts:497` `createTargets()` 末尾 | installation |
| 2 | `phasegate install` が `includeHusky: true, includeCi: true` を hard-code し、CLI から false に倒せない。 | `scripts/harness/main.ts:2080-2081` | harness-api, installation |
| 3 | `setup:agent --apply` が `ensurePhasegatePackageDependency` で必ず `devDependencies.phasegate` を加える。 | `scripts/harness/main.ts:123`, `:2110` | setup |
| 4 | Codex hooks の install target が project-local 固定。user-level (`~/.codex/hooks.json`) install / reconcile が無い。 | `createTargets` の codex 分岐 (`scripts/harness/installation/application/usecases/run-install.ts:452-462`) | installation |
| 5 | `.gitignore` を編集せずに個人だけ無視する経路がない。`.git/info/exclude` adapter が存在しない。 | installation 配下に対応するユースケース/adapter なし | installation |
| 6 | `phasegate.config.json` の置き場所が project root 固定 (`--config` flag が install/init に無い)。 | `scripts/harness/main.ts` install/init 分岐, `config-foundation` の path resolver | harness-api, config-foundation |
| 7 | `AGENTS.md` / `CLAUDE.md` の managed-section merge が install で必ず走る。personal mode で skip する分岐がない。 | `createTargets` の Claude/Codex 分岐 (`run-install.ts:443-462`) | installation |
| 8 | product overview / setup-artifacts doc が個人/team 区別を持たない。 | `docs/inception/_shared/product_overview_plan.md:13-14`, `docs/guide/setup-artifacts.md`, `docs/guide/installation.md`, `README.md` | documentation |

## スコープ

含む:

- `phasegate install` の new mode (flag 名は logical 設計で決定 — `--personal` / `--local-only` / `--mode personal` 等の候補から選ぶ)。
- 該当モード下での `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*` の **install target からの除外**。
- 該当モード下での Codex hook の user-level routing or 明示的な「手動 user-level 設定」guidance。
- 該当モード下での `.git/info/exclude` 経由の personal ignore 登録。
- 該当モード下での config 設置先の選択 (`--config <path>` または `.phasegate-local/`)。
- `phasegate uninstall` の対称対応。
- 該当モードの公式 doc (README / installation guide / setup-artifacts) と product overview の改訂。
- regression test (team-owned file の bytes 不変, personal uninstall の対称性)。

含まない:

- 既存 team install の挙動変更 (default は WI-199 までの挙動を維持)。
- Husky / CI template 自体の改訂。
- worktree-based 利用の自動化 (推奨運用としてドキュメントに残すのみ)。
- phasegate config の semantic 変更 (allowedCategories 体系等は WI-204 系で扱う)。

## 関連

- `docs/inception/_cross/WI-199/description.md`: `package.json` を protected file として `uninstall --apply` で refuse する。personal install の前提条件として整合性が必要。
- `docs/inception/_cross/WI-173/description.md`: 受け入れ基準で「repo managed artifact と user-level / local-only artifact を混同しない」と既に明記済み。personal mode はこの方針の延長で CLI に反映する位置づけ。
- `docs/inception/_cross/WI-175/description.md`: `config:plan --intent codex-hooks --json` が local files と user-level external action を別カテゴリで返す要件。personal mode の Codex routing と再利用可能。
- `docs/inception/_cross/WI-205/description.md`: Codex hooks feature flag を `hooks` に変更。personal mode の user-level guidance はこの新名称で揃える。
- `docs/inception/_shared/product_overview_plan.md` Q1 (主ターゲット定義): 個人 in team PJ の位置づけ追記が必要。
- `docs/guide/setup-artifacts.md`: managed target / generated artifact / runtime state / legacy / user-level settings の既存分類に「personal install 専用 artifact」を追加する根拠資料。
- `docs/guide/codex-integration.md:30, :152`: `~/.codex/` 配置の既存記述。personal mode の Codex routing 仕様の根拠。
- `scripts/harness/installation/application/usecases/run-install.ts`: install targets の hard-coded list。
- `scripts/harness/main.ts`: `install` / `setup:agent` の CLI 配線と `ensurePhasegatePackageDependency`。
