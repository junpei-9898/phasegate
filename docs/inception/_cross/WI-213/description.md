---
id: WI-213
type: issue
severity: high
status: tested
affects: [installation, harness-api, agent-integration, validator-system, skill-quality, documentation]
source: dogfood
---

# WI-213: personal install がコア防御 3 系統を deploy せず実用に耐えない

> 起票日: 2026-05-22
> 起票経緯: README.ja.md に personal install 手順を追記する作業中に、`install --personal --agent claude --apply` の deploy 範囲を `scripts/harness/installation/application/usecases/run-install.ts` で確認したところ、phasegate のコア防御（agent context / commit-time hook / 設計原則文書）が一切配置されず、宣伝されている「個人評価」用途すら満たせないことが判明した。

## 問題

`install --personal` は **「チーム共有ファイルに触れない」** という制約を達成する代わりに、**phasegate の「設計してから書け」を強制するコア機能 3 系統を deploy しない**。結果として personal install を実行した user は次のような状態になる:

- AI agent (Claude / Codex) は phasegate のメタデータ規約・skill 一覧・フェーズゲート禁則を **何も知らない**
- `apply_patch` 経由の編集を commit で捕まえる経路が **存在しない**
- 28 個の bundled skill のうち過半数が参照する `docs/folder_management_rules.md` / `docs/principles/` が **不在のまま実行される**

### Gap 1: `CLAUDE.md` / `AGENTS.md` が deploy されない（致命的）

`createPersonalTargets` (`scripts/harness/installation/application/usecases/run-install.ts:618-650`) は agent context markdown を一切作成しない。team install は `markdown-managed` 戦略で managed block を merge するが、personal install には対応戦略がない。

| 影響 | 内容 |
|---|---|
| agent への規約周知 | `@unit` / `@layer` メタデータ必須、`/story-implementor` から始める、`docs/folder_management_rules.md` 準拠 — 全て agent 側に伝わらない |
| skill 起動の自発性 | agent は skills/ の中身を見ても、それを「いつ呼ぶべきか」を判断できない |
| Quick vs Full mode の使い分け | agent context に依存しているため personal では機能しない |

### Gap 2: git hook（`.husky/*`）が deploy されない（致命的）

personal install は `.husky/pre-commit` / `commit-msg` / `pre-push` を作らない（team 共有を避けるため意図的）。代替として `.git/hooks/` (リポジトリローカル、commit されない) への deploy 経路も無い。

| 影響 | 内容 |
|---|---|
| commit-msg WI trailer 強制 | 完全に無効 |
| pre-commit L2 validator | 完全に無効 |
| Codex ネイティブ `apply_patch` 防御 | README.ja:367-372 では「pre-commit (L2) で commit 時に block」が正規ルートだが、personal install ではそれが消える |

### Gap 3: 設計原則文書 (`docs/principles/` / `docs/folder_management_rules.md`) が deploy されない（高）

`createPersonalTargets` は principles 文書も配置しない。一方、bundled skill の SKILL.md は明示的にこれらを参照している:

```text
skills/story-implementor/SKILL.md:325:  - **ファイル配置は `docs/folder_management_rules.md` に従うこと**
skills/domain-designer/SKILL.md:181:    - **ファイル配置は `docs/folder_management_rules.md` に従うこと**
skills/logical-designer/SKILL.md:183:    > **注意**: `docs/folder_management_rules.md` のルール準拠
```

`grep -l "docs/principles\|docs/folder_management_rules" skills/*/SKILL.md` で 20 個以上の skill が参照していることを確認済。

| 影響 | 内容 |
|---|---|
| skill 実行時のファイル配置判断 | 参照先 empty → skill が出力先を決められない |
| testing-rules / architecture-philosophy 参照 | personal では空ファイル参照になり skill ガイダンス失効 |

### Gap 4 (派生): `.phasegate-local/phasegate.config.json` が要求するパスが空（中）

`docs/templates/personal/phasegate-local-config.json` の中身を読むと:

```json
"paths": {
  "designDocs": "docs/product/construction",
  "inceptionDocs": "docs/inception"
}
```

— と team install と同じパスを要求しているが、personal install はこれらの directory を作らない。L2 phase-gate validator が「設計文書なし」で全 unit を block するか、parse error で fail する不整合状態になる。

## 受け入れ基準

- [ ] personal install 後に AI agent (Claude / Codex) が phasegate のメタデータ規約・skill 一覧・フェーズゲート禁則を agent context として読める。team の `CLAUDE.md` / `AGENTS.md` には触れない（user-scope `~/.claude/CLAUDE.md` への merge、`.claude/CLAUDE.local.md` などローカル経路を採用）。
- [ ] personal install 後に commit-time defense (commit-msg WI trailer / pre-commit L2 validator) が発火する。team の `.husky/*` は触らず、`.git/hooks/` (リポジトリ非追跡) など local-only 経路で deploy する。
- [ ] personal install で bundled skill の参照先 (`docs/folder_management_rules.md` / `docs/principles/*.md`) が `.phasegate-local/` 配下など local-only 領域に配置され、skill 実行時に解決される。team の `docs/` 直下には触れない。
- [ ] `.phasegate-local/phasegate.config.json` の `paths.designDocs` / `paths.inceptionDocs` が personal scope 用に local-only パス（例: `.phasegate-local/inception` / `.phasegate-local/product`）に切り替わる、または personal mode で該当 validator を skip する dispatch が入る。
- [ ] `install --personal --apply` 直後に `npx phasegate doctor --personal` が green（または既知の personal-only limitations だけが warning として出る）状態になる。
- [ ] README.ja / README / `docs/guide/installation.md` の personal install 説明が「team 共有ファイルには触らないが、機能等価のローカル代替が deploy される」という新コントラクトを反映する。
- [ ] integration test を追加して、personal install 後に CLAUDE 規約 / git hook / 設計原則文書がそれぞれ解決可能であることを担保する。

## 非スコープ

- team install が deploy するファイル（`CLAUDE.md` / `AGENTS.md` / `.husky/*` / `docs/principles/` / `docs/folder_management_rules.md` / `package.json` / `.github/workflows/*`）への直接書き込みは引き続き禁止。**personal install の不可侵契約は維持する**。
- L4 doc-freshness / pointer-validation の personal scope 対応（L4 は personal config で default `enabled: false` なので別件で扱う）。
- WI-211 で扱う `.husky/_/husky.sh` bootstrap 問題（あちらは team install の fresh repo 対応、本 WI は personal の local-only hook 経路）。
- WI-212 の多言語対応（言語非依存化は別軸）。

## Dogfood Evidence (2026-05-22)

ローカル `0.160.16` checkout で確認した。

| 観点 | 確認方法 | 観察結果 |
|---|---|---|
| `createPersonalTargets` の deploy 対象 | `scripts/harness/installation/application/usecases/run-install.ts:618-650` | `.phasegate-local/phasegate.config.json` / `.claude/settings.json` / `.codex/hooks.json` / `.claude/skills/` / `.codex/skills/` / `.git/info/exclude` のみ |
| `CLAUDE.md` / `AGENTS.md` の personal 配置 | 同上 | ❌ 配置経路なし |
| `.husky/*` の personal 配置 | 同上 | ❌ 配置経路なし。代替 `.git/hooks/` 経路もなし |
| `docs/principles/` / `docs/folder_management_rules.md` の personal 配置 | 同上 | ❌ 配置経路なし |
| skill の principles 文書依存 | `grep -l "docs/principles\|docs/folder_management_rules" skills/*/SKILL.md` | 20+ skill が参照 |
| personal config が要求するパスと実体の整合 | `docs/templates/personal/phasegate-local-config.json` | `paths.designDocs: docs/product/construction` を要求するが personal は配置しない |

## Published Dogfood Evidence (2026-05-22)

公開済み `phasegate@0.160.17` で downstream personal install を検証した。

| 観点 | 確認方法 | 観察結果 |
|---|---|---|
| registry version | `npm view phasegate version` | `0.160.17` |
| personal install apply | `/private/tmp/phasegate-published-wi213.07EAbx` で `npx phasegate@0.160.17 install --personal --agent both --apply --json` | `refused: []`。`.claude/CLAUDE.local.md` / `.codex/AGENTS.local.md` / `.git/hooks/pre-commit` / `.git/hooks/commit-msg` / `.phasegate-local/docs/*` が `changed` に含まれる |
| personal doctor | 同一 downstream で `npx phasegate@0.160.17 doctor --personal --agent both --json` | `overallStatus: green`, `findings: []`, `installationMode: personal` |
| local-only config paths | `.phasegate-local/phasegate.config.json` | `paths.designDocs: .phasegate-local/product/construction`, `paths.inceptionDocs: .phasegate-local/inception` |
| local hook executability | `ls -l .git/hooks/pre-commit .git/hooks/commit-msg` | 両方 executable (`-rwxr-xr-x`) |

## Related

- WI-207 / WI-208 / WI-209 — personal install の original 設計を入れた WI 群。本 WI はそれらの contract 拡張。
- WI-210 — team install / shared skills deploy の reconcile contract。personal の local skill copy 経路と整合性を取る。
- WI-211 — personal status / husky bootstrap の dogfood 起源 issue。本 WI と隣接する personal-scope 防御の話だが、focus が異なるので独立。
- **WI-214 — 本 WI の後続 WI**。本 WI で Gap 3（principles / folder_management_rules）を暫定的にハードコード（例: `.phasegate-local/principles/` 直書き）で実装した上で、WI-214 で `paths.principlesDocs` / `paths.folderRulesDoc` schema 拡張 + ハードコード解消 + README 追記を行う。本 WI が先、WI-214 が後の逐次運用。
