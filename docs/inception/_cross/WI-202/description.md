---
id: WI-202
type: issue
severity: normal
status: tested
affects: [config-foundation, installation, agent-integration]
source: github#27
external_ref: https://github.com/junpei-9898/phasegate/issues/27
---

# WI-202: strict workflow Quick Mode scope diverges from quick-implementor guidance

> 起票日: 2026-05-15
> 起票経緯: GitHub Issue #27。`/quick-implementor` が扱えると宣言する軽微変更が、strict workflow の pre-tool-use hook で Full Mode 必須として block される。

## 問題

`skills/quick-implementor/SKILL.md` は `bugfix` / `docs` / `test` / `config` を適用可能カテゴリとして宣言している。一方、`phasegate init --workflow strict` は `quickMode.allowedCategories: ["chore"]` を生成し、preset 定義も `config` / `docs` / `test` を既定許可していない。

その結果、ユーザーが `/quick-implementor` で `.gitignore` 追記や設定変更のような軽微変更を依頼しても、pre-tool-use hook は `MIXED_CHANGES` として block する。さらに block message は caller skill を見ずに `/story-implementor` へ固定誘導するため、すでに正しい skill を起動しているユーザーや agent が別 skill へ追いやられる。

## 再現確認

2026-05-15 に現行ローカル `0.160.9` checkout で dogfood した。

```text
$ phasegate init --name issue27-init --workflow strict --agent codex --yes
✓ strict workflow configured (quickMode.relaxedGates: [], allowedCategories: ["chore"])
```

生成された `/private/tmp/phasegate-issue27-init/phasegate.config.json` は以下の Quick Mode 差分を持つ。

```json
{
  "project": { "name": "issue27-init", "preset": "standard" },
  "quickMode": {
    "allowedCategories": ["chore"],
    "relaxedGates": []
  }
}
```

同ディレクトリで `.gitignore` を分類すると Full Mode 必須になる。

```text
$ phasegate check-change-category --paths .gitignore --format json
{
  "dominantCategory": "bugfix",
  "fullModeRequired": true,
  "rejectionRule": "MIXED_CHANGES",
  "rejectionReason": "allowedCategories外のファイルが含まれています: .gitignore"
}
```

同じ対象を pre-tool-use hook に渡すと、issue 本文と同じ block UX が再現する。

```text
Full mode 必須変更が検出されました: .gitignore
カテゴリ: bugfix
判定ルール: MIXED_CHANGES
理由: allowedCategories外のファイルが含まれています: .gitignore
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  scaffold: npx phasegate scaffold-design --unit <unit-id> --phase logical
  テンプレ: templates/logical_design.template.md
```

補足: issue 本文は strict preset 既定を `["docs"]` と記載しているが、現 checkout の preset JSON は `["bugfix"]`、`init --workflow strict` の生成物は `["chore"]` だった。値の差分はあるが、`quick-implementor` が宣言する `docs` / `test` / `config` と strict workflow 許可カテゴリが一致しない点は再現している。

## 原因分析

| # | Crack | 該当箇所 | 担当 Unit |
|---|-------|---------|-----------|
| 1 | quick-implementor の advertised scope が `bugfix/docs/test/config` なのに、strict workflow 初期化は `chore` のみを許可する。 | `skills/quick-implementor/SKILL.md`, install/init workflow defaults | installation |
| 2 | preset 定義と公開ドキュメントの Quick Mode default が一致していない。docs は `bugfix/docs/test/config` を default と説明するが preset JSON は `bugfix` のみ。 | `scripts/harness/config-foundation/infrastructure/presets/*.json`, `docs/guide/configuration.md` | config-foundation |
| 3 | pre-tool-use full-mode block guidance は caller skill を識別せず、`/story-implementor` へ固定誘導する。 | `HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput` | agent-integration |
| 4 | hook input DTO に caller skill context がないため、`/quick-implementor` 起動中かどうかで guidance を出し分けられない。 | `PreToolUseHookInput`, `HandlePreToolUseInput` | agent-integration |

## 影響

- `/quick-implementor` で扱うべき小さな config/docs/test 系変更が strict workflow で失敗する。
- agent が hook block 後に unmanaged Bash write や hook bypass に流れやすくなる。
- human user は SKILL.md と `phasegate.config.json` / preset 定義を読み合わせないと実際の許可範囲を判断できない。
- `/story-implementor` 固定誘導により、軽微変更のための skill selection が混乱する。

## 受け入れ基準

- [x] strict workflow / strict preset の Quick Mode 許可カテゴリ方針が、`/quick-implementor` の advertised scope と明示的に整合する。
- [x] `phasegate init --workflow strict` の生成 config と guide / SKILL.md の説明が矛盾しない。
- [x] docs / test / config 代表例について、strict workflow / strict intent の許可・復旧挙動がテストで固定される。
- [x] pre-tool-use full-mode block guidance が caller skill context を受け取れる場合は quick-implementor 向けの復帰策を返す。
- [x] caller skill context がない場合の fallback は現行互換の `/story-implementor` 誘導を維持する。
- [x] protected file 防御は弱めない。`phasegate.config.json` は managed CLI path を案内する。

## 実装結果

2026-05-17 に `0.160.11` 向けで対応。

- `phasegate init --workflow strict` は `quickMode.allowedCategories: ["bugfix", "docs", "test", "config"]` / `relaxedGates: []` を生成する。
- `caller_skill` / `PHASEGATE_CALLER_SKILL` を optional context として受け取り、`quick-implementor` からの supported category block では `quick-mode-relax` 復旧を案内する。
- caller context がない block は従来どおり `/story-implementor` fallback を維持する。

検証:

- `unit/setup/skill-deployer.test.ts`
- `integration/agent-integration/handle-pre-tool-use-config-plan-guidance.test.ts`
- `integration/harness-api/cli-hook-dispatch.integration.test.ts`
- `e2e/cli-harness.test.ts`

## スコープ外

- hook bypass の全面的な禁止。
- `config:plan` の新 intent 追加。ただし復帰策として既存 intent を案内する設計は含めてよい。
- Claude Code / Codex が caller skill context を渡せない環境での完全な自動識別。
