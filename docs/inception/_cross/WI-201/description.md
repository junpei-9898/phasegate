---
id: WI-201
type: issue
severity: normal
status: tested
affects: [config-foundation, installation, agent-integration, harness-api]
source: github#26
external_ref: https://github.com/junpei-9898/phasegate/issues/26
---

# WI-201: config:plan retrofit bootstrap lacks a managed apply path

> 起票日: 2026-05-15
> 起票経緯: GitHub Issue #26。`config:plan --intent retrofit-bootstrap` は patch operations を返すが、AI agent がその operations を PhaseGate-managed path で適用できない。

## 問題

`config:plan --intent retrofit-bootstrap --json` は `phasegate.config.json` 向けの operations を提示するが、同じ CLI surface に `--apply` がない。結果として agent は `Edit` / `Write` で `phasegate.config.json` を直接更新する必要があり、strict retrofit 相当の設定では pre-tool-use hook が `MIXED_CHANGES` として block する。

現在の block guidance は `/story-implementor` から設計フェーズを始める案内だけを返す。retrofit bootstrap の正規適用文脈では、設計文書を追加しても `phasegate.config.json` の relaxation は適用されないため、last-mile UX と運用 traceability が欠ける。

## 再現確認

2026-05-15 に現行ローカル `0.160.7` で確認した。

```text
$ pnpm exec tsx scripts/harness/main.ts config:plan --intent retrofit-bootstrap --json
configPatch.applicability = "applicable"
operations = [
  /planningMode/default,
  /phaseDependencies/override,
  /quickMode/relaxedGates
]

$ pnpm exec tsx scripts/harness/main.ts config:plan --intent retrofit-bootstrap --apply --json
Error: unknown flag '--apply'. Known flags: --intent, --dry-run, --json
```

strict 相当の一時 project で pre-tool-use hook も再現した。

```text
Full mode 必須変更が検出されました: phasegate.config.json
カテゴリ: config
判定ルール: MIXED_CHANGES
理由: allowedCategories外のファイルが含まれています: phasegate.config.json
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
```

## 影響

- retrofit bootstrap の最後の config apply が unmanaged edit / shell write に残る。
- agent から見ると `config:plan` の `diffExplanation` が言う managed command が存在しない。
- hook block の next action が retrofit bootstrap には誤誘導になる。

## 原因分析

`buildConfigPatchPreview` が `configPatch.after` まで完成形を構築しているのに、対応する apply write path が一度も実装されないまま preview だけリリースされたのが構造的な根本原因。それを補強するはずの hook 側 guidance と plan 側 commands も dry-run 前提のままで、4 Unit にまたがる crack が残った。

| # | Crack | 該当箇所 | 担当 Unit |
|---|-------|---------|-----------|
| 1 | CLI surface に `--apply` が無い。unknown flag として exit 2。 | `scripts/harness/main.ts:1978` (`KNOWN_CONFIG_PLAN_FLAGS = ["--intent", "--dry-run", "--json"]`) | harness-api |
| 2 | apply 側の write path / backup writer が未実装。case 節は `console.log` のみで終わる。 | `scripts/harness/main.ts:1212-1268` (`buildConfigPatchPreview`) / `main.ts:1977-1997` (case `config:plan`) | config-foundation |
| 3 | `managedTargets: ["phasegate.config.json"]` と宣言しているのに `commands` は dry-run しか案内せず、`diffExplanation` の「apply through PhaseGate managed commands」が空手形になっている。 | `scripts/harness/main.ts:1323-1330` (`retrofit-bootstrap` catalog entry) | installation |
| 4 | full-mode block guidance が `dominantCategory === "config"` で分岐せず `/story-implementor` に一律誘導。`PROTECTED_FILE_GUIDANCE` にも `phasegate.config.json` のエントリが無い。 | `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:228-263, 367-391` | agent-integration |

4 つの crack は `logical_design.md` の Design 箇条書き 4 項目と 1:1 対応しており、Unit 横断の cross WI として扱うのが妥当。

## 受け入れ基準

- [x] `config:plan --intent retrofit-bootstrap --apply --json` が dry-run と同じ plan をもとに `phasegate.config.json` を managed path で更新する。
- [x] apply 前に既存 config の backup または rollback evidence が残る。
- [x] `config:plan` の `commands` / human output が apply 可能な intent では `--apply` を案内する。
- [x] `config:plan --help` の Options が `--apply` を案内し、agent が managed apply path を発見できる。
- [x] pre-tool-use hook の full-mode block guidance が `phasegate.config.json` の config category では `config:plan --intent retrofit-bootstrap --dry-run` / `--apply` を候補として示す。
- [x] `Edit` / `Write` で protected-file 防御を弱めず、CLI managed apply path のみで bypass が成立する。

## 公開版ドッグフード

2026-05-15 に published `phasegate@0.160.8` から取得した tarball を `/private/tmp/phasegate-wi201-dogfood` に展開し、公開版 CLI のみで検証した。

- `npm view phasegate version` -> `0.160.8`
- `npm pack phasegate@0.160.8 --pack-destination /private/tmp/phasegate-wi201-dogfood` -> tarball 取得成功
- `/private/tmp/phasegate-wi201-dogfood/project` で `npm --cache /private/tmp/phasegate-wi201-dogfood/npm-cache install /private/tmp/phasegate-wi201-dogfood/phasegate-0.160.8.tgz` -> install 成功
- `npx phasegate --version` -> `phasegate v0.160.8`
- `npx phasegate init --name wi201-dogfood --preset standard --agent codex --yes` -> `phasegate.config.json` と Codex hooks を生成
- `npx phasegate config:plan --intent retrofit-bootstrap --json` -> `commands` に `phasegate config:plan --intent retrofit-bootstrap --apply --json` を含み、`configPatch.applicability = "applicable"`、operations は `/planningMode/default`, `/phaseDependencies/override`, `/quickMode/relaxedGates`
- `npx phasegate config:plan --intent retrofit-bootstrap --apply --json` -> exit 0、`applyResult.changed = true`、backup path `.phasegate/backups/phasegate.config.2026-05-15T01-47-29.064Z.json`、applied operations 3 件
- apply 後の `phasegate.config.json` は `planningMode.default = "manual"`, `phaseDependencies.override = true`, `quickMode.relaxedGates = ["phase-gate"]`
- backup file は apply 前の `planningMode.default = "interactive"`, `phaseDependencies.override = false`, `quickMode = {}` を保持
- `npx phasegate config:plan --intent codex-hooks --apply --json` -> exit 1、`refused = true`、`configPatch.applicability = "not-applicable"`
- `npx phasegate config:plan --intent retrofit-bootstrap --output x` -> exit 2、unknown flag として拒否
- `npx phasegate config:plan --intent quick-mode-strict --apply --json` で strict 相当にした後、`phasegate.config.json` への `Edit` payload を `npx phasegate hook pre-tool-use` に渡すと exit 2 で block。message は `config:plan --intent retrofit-bootstrap --dry-run --json` と `config:plan --intent retrofit-bootstrap --apply --json` を案内し、`/story-implementor` へ誤誘導しない。

2026-05-15 に help discoverability fix を含む published `phasegate@0.160.9` で追加確認した。

- `npm view phasegate version` -> `0.160.9`
- `npx phasegate@latest config:plan --help` -> Options に `--dry-run`, `--apply`, `--json`, `--help, -h` を表示
