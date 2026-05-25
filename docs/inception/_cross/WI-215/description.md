---
id: WI-215
type: issue
severity: high
status: tested
affects: [installation, documentation, agent-integration]
source: dogfood
---

# WI-215: personal install の agent context 配置が Claude Code / Codex の読み込み仕様とずれている

> 起票日: 2026-05-25
> 起票経緯: `phasegate install --personal --agent claude --apply` が作る `.claude/CLAUDE.local.md` は Claude Code が自動読み込みする名称/配置なのか、という確認から発見。続けて Codex 側も調査したところ、`.codex/AGENTS.local.md` も Codex の既定 discovery では読み込まれないことが分かった。

## 問題

WI-213 で personal install の core defenses として local-only agent context を追加したが、作成先が実際の agent runtime discovery と一致していない。

| Agent | 現行 personal target | 仕様/実測上の問題 |
|---|---|---|
| Claude Code | `.claude/CLAUDE.local.md` | Claude Code の local instruction は project root の `CLAUDE.local.md`。project instruction は `CLAUDE.md` または `.claude/CLAUDE.md`。`.claude/CLAUDE.local.md` は公式の読み込み先として確認できない。 |
| Codex | `.codex/AGENTS.local.md` | Codex は `AGENTS.override.md`, `AGENTS.md`, `project_doc_fallback_filenames` の順に各ディレクトリで最大 1 ファイルを読む。`AGENTS.local.md` は既定 fallback ではなく、`.codex/` 配下も project root から cwd への探索経路に含まれない。 |

結果として、personal install 直後でも agent が PhaseGate の WI workflow / metadata / no-design-no-code instructions を読めない可能性が高い。`doctor --personal` が green でも、実際の prompt context には入っていない false green になる。

## 調査結果

### Claude Code

Claude Code 公式 docs では、project instruction は `./CLAUDE.md` または `./.claude/CLAUDE.md`、local instruction は `./CLAUDE.local.md` と説明されている。また cwd から上に辿って各 directory の `CLAUDE.md` / `CLAUDE.local.md` を読む。`.claude/CLAUDE.local.md` は該当しない。

Reference: https://code.claude.com/docs/en/memory

### Codex

Codex 公式 docs では、Codex は起動時に instruction chain を作る。global scope では `$CODEX_HOME` (`~/.codex` default) の `AGENTS.override.md` または `AGENTS.md` を読む。project scope では project root から cwd まで各 directory で `AGENTS.override.md`, `AGENTS.md`, `project_doc_fallback_filenames` の順に最大 1 ファイルを読む。

Reference: https://developers.openai.com/codex/guides/agents-md

`AGENTS.local.md` は既定名として出てこない。さらに `.codex/AGENTS.local.md` は、cwd が repo root の通常利用では project root から cwd までの探索経路に含まれない。

### 実測

ローカル Codex CLI `0.133.0` で一時 repo を作り、以下 4 ファイルに sentinel を置いた。

- `AGENTS.md`: `ROOT_AGENTS_SENTINEL`
- `AGENTS.local.md`: `ROOT_AGENTS_LOCAL_SENTINEL`
- `.codex/AGENTS.md`: `DOT_CODEX_AGENTS_SENTINEL`
- `.codex/AGENTS.local.md`: `DOT_CODEX_AGENTS_LOCAL_SENTINEL`

`codex debug prompt-input "probe"` の model-visible input には `ROOT_AGENTS_SENTINEL` だけが入り、他 3 つは入らなかった。つまり現行 personal Codex target の `.codex/AGENTS.local.md` は読み込まれない。

## 影響

- personal install の最重要目的である「team-owned files を汚さず、個人だけ PhaseGate の agent guidance を有効化する」が満たせない。
- `.claude/settings.json` / `.codex/hooks.json` / `.git/hooks/*` は動いても、agent 自身は WI workflow や PhaseGate のドキュメント配置規約を知らないまま作業を開始する。
- `docs/guide/installation.md` / README の personal install 説明が、実際には読み込まれない local context を「作る」と案内している。
- `doctor --personal` / integration tests が agent context の存在だけを見ており、runtime-visible かを検証できていない。

## 受け入れ基準

- [x] Claude personal install の context target を、Claude Code が自動読み込みする local-only 配置へ変更する。候補は `.claude/CLAUDE.md` または root `CLAUDE.local.md`。team-owned `CLAUDE.md` は引き続き変更しない。
- [x] Codex personal install の context target を、Codex が自動読み込みする local-only 配置へ変更する。候補は root `AGENTS.override.md`, root `AGENTS.md` absent-only, `CODEX_HOME=$(pwd)/.codex` 前提の `.codex/AGENTS.md`, または config fallback を含む方式。既存 team `AGENTS.md` を不可視化しないことを設計で担保する。
- [x] 既存 personal installs の reconcile / reinstall で、旧 `.claude/CLAUDE.local.md` / `.codex/AGENTS.local.md` から新 target へ移行できる。
- [x] `.git/info/exclude` の personal managed block に、新しい root-local filenames が必要なら追加する。team `.gitignore` は触らない。
- [x] `doctor --personal --agent claude|codex|both` が、単なるファイル存在ではなく「agent runtime が読む path に context がある」ことを検査する。
- [x] integration test で `codex debug prompt-input` 相当の検証を入れ、personal Codex context sentinel が model-visible prompt に入ることを確認する。
- [x] Claude 側も可能なら `/memory` または docs-backed path check 相当の検証を入れ、`.claude/CLAUDE.local.md` のような non-discovered path を green にしない。
- [x] README / docs/guide/installation.md / docs/guide/setup-artifacts.md / docs/guide/codex-integration.md を、新しい personal context topology に合わせて更新する。

## 実装メモ

- Claude personal context は `.claude/CLAUDE.md` に変更した。
- Codex personal context は `AGENTS.md` が未存在または PhaseGate managed の場合だけ root `AGENTS.md` に配置する。既存 non-managed `AGENTS.md` は上書きせず、`doctor --personal --agent codex` が `codex-context-missing` を red/manual として報告する。
- `codex debug prompt-input "probe"` により、空 repo personal install 後の root `AGENTS.md` が model-visible prompt に含まれることを確認した。
- Publish 後の npm registry dogfood は `0.160.19` publish 完了後に実施する。

## 非スコープ

- team install の `AGENTS.md` / `CLAUDE.md` managed-section merge の再設計。
- Codex hooks の native `apply_patch` 非 interception 問題。
- Codex user-level hook feature enablement の自動化。
- Claude Code / Codex 本体の discovery 仕様変更への依存実装。

## Related

- WI-207: personal install mode 導入。team-owned files を plan/apply から除外する契約。
- WI-208: personal sandbox install。agent runtime artifacts の自動初期化を追加。
- WI-209: personal runtime artifacts を symlink ではなく real files/directories に変更。
- WI-213: personal install core defenses。`.claude/CLAUDE.local.md` / `.codex/AGENTS.local.md` を追加した直接の先行 WI。
- WI-214: personal docs path mapping。local-only docs 配置の設定化。
