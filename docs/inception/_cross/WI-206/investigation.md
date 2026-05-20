# Investigation: `/story-implementor` full-mode route gap

<!-- @work-item-id WI-206 -->

## 調査環境

| 項目 | 値 |
|---|---|
| 日付 | 2026-05-20 |
| リポジトリ | `/Users/jumpei/dev/PhaseGate` |
| phasegate version | `0.160.11` |
| 現在の `quickMode.allowedCategories` | `["bugfix", "docs", "test", "config"]` |
| dogfood 対象 Unit | `integrations` |
| dogfood 対象 Unit の product docs | `logical_design.md` のみ存在。`domain_model.md` は未作成 |

## 実機 dogfood 結果

### A. `domain` file は Quick Mode allowed 外として判定される

```bash
pnpm exec tsx scripts/harness/main.ts check-change-category \
  --paths scripts/harness/integrations/domain/value-objects/dogfood-probe.ts,phasegate.config.json \
  --format json
```

結果:

```json
{
  "dominantCategory": "domain",
  "perFile": [
    {
      "path": "scripts/harness/integrations/domain/value-objects/dogfood-probe.ts",
      "category": "domain"
    },
    {
      "path": "phasegate.config.json",
      "category": "config"
    }
  ],
  "fullModeRequired": true,
  "rejectionRule": "MIXED_CHANGES",
  "rejectionReason": "allowedCategories外のファイルが含まれています: scripts/harness/integrations/domain/value-objects/dogfood-probe.ts"
}
```

`config` は allowed だが、同じ変更集合に `domain` が含まれると dominant category は `domain` になり、`MIXED_CHANGES` で Full Mode 必須になる。

### B. PreToolUse hook でも under-designed Unit は block される

前回 dogfood で、`scripts/harness/integrations/domain/value-objects/dogfood-probe.ts` への `Edit` event を PreToolUse hook に渡したところ exit 2 で block された。

観測された guidance:

```text
Full mode 必須変更が検出されました: scripts/harness/integrations/domain/value-objects/dogfood-probe.ts
カテゴリ: domain
判定ルール: MIXED_CHANGES
理由: allowedCategories外のファイルが含まれています: scripts/harness/integrations/domain/value-objects/dogfood-probe.ts
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  scaffold: npx phasegate scaffold-design --unit integrations --phase logical
  テンプレ: templates/logical_design.template.md
```

この guidance は、対象 Unit の不足 artifact が `domain_model.md` である状況でも `--phase logical` を案内する。`integrations` には既に `docs/product/construction/integrations/logical_design.md` が存在するため、現状メッセージは不足 artifact と一致していない。

### C. 設計文書が揃う Unit は ISSUE-021 bypass で救済される

現行 `HandlePreToolUseUseCase` には、`fullModeResult.requiresFullMode` の場合でも `checkDesignDocsExist(unitId)` が true なら block しない処理がある。

該当コメント:

```text
ISSUE-021: 当該Unitの必須設計文書が揃っている場合は full mode block を bypass
（hook がスキルコンテキストを参照できない構造的ギャップへの対処）
```

既存 integration test も以下を固定している。

| 条件 | 期待 |
|---|---|
| `checkDesignDocsExist` が true | `requiresFullMode=true` でも `shouldBlock=false` |
| `checkDesignDocsExist` が false | 従来通り `FULL_MODE_REQUIRED` |

したがって、今回の問題は「全 domain edit が必ず詰む」ではなく、「hook が参照できる product docs がまだ揃っていない Unit では、案内された `/story-implementor` route だけでは詰みを解消できない」と整理するのが正確。

### D. `/story-implementor` skill は guide-only

`skills/story-implementor/SKILL.md` は前提条件チェック、計画作成、TDD 実装、メタデータ付与、検証を指示する markdown guide である。調査範囲では以下が見つからなかった。

- `phasegate session begin --mode full` のような session 昇格 command。
- `.phasegate/session.json` 等の TTL marker を作成する手順。
- `quickMode.allowedCategories` を一時変更して restore する managed preamble。
- `PHASEGATE_FULL_MODE` を hook に解釈させる実装。
- `caller_skill=story-implementor` を full-mode 許可として扱う実装。

`pre-tool-use-hook.ts` は `caller_skill` または `PHASEGATE_CALLER_SKILL` を読み取るが、`HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput` の特殊処理は `quick-implementor` guidance に限られている。`story-implementor` を名乗っても domain edit が許可されるわけではない。

### E. `PHASEGATE_FULL_MODE=1` は現行コードから参照されない

`scripts/harness` と story skill の検索範囲では `PHASEGATE_FULL_MODE` の参照は見つからなかった。したがって、GEERM 側で観測された「`PHASEGATE_FULL_MODE=1` を立てても不変」は現行実装と整合する。

### F. `phasegate.config.json` edit block は現在の repo では再現しない

PhaseGate repo 自身の `phasegate.config.json` は `quickMode.allowedCategories` に `config` を含む。この状態で `phasegate.config.json` 単体の `Edit` event を PreToolUse hook に渡すと、前回 dogfood では以下で許可された。

```text
phasegate: write allowed (Quick Mode, category=config)
```

この点は GEERM 報告の「`phasegate.config.json` 自体も `category=config` で hook に弾かれる」とは条件が異なる。`config` が allowed 外の strict 設定では WI-204 と同じ recovery 問題になり得るが、現行 PhaseGate repo の default dogfood では再現しない。

### G. `config:plan --intent quick-mode-relax` は現行 repo では no-op

現行 repo の `quickMode.allowedCategories` はすでに `["bugfix", "docs", "test", "config"]` であり、前回 dogfood の `quick-mode-relax` dry-run は before/after が同一だった。GEERM 報告の「逆方向に狭める」挙動はこの checkout では再現しなかった。

## 類似問題

| 類似 gap | 内容 | 既存証跡 |
|---|---|---|
| skill guide と hook state の非連動 | skill の markdown 手順を守っても、hook が読める state が変わらない | WI-001、WI-206 |
| config recovery route の詰み | hook が config edit を block すると、manual edit 前提の skill が機能しない | WI-204 |
| guidance の不足 artifact 不一致 | `integrations` では `domain_model.md` が不足しているが、Full Mode guidance は generic に `--phase logical` を出す | WI-206 |
| baseline による dogfood の見えにくさ | baselined file は full-mode / story-reflection が grandfather skip され、問題を隠すことがある | hook stderr の `[baseline] grandfather skip` |

## 結論

upstream feedback の核心である「`/story-implementor` route には hook 通過に結び付く自動 mechanism がない」は、現行 PhaseGate repo のコード調査と dogfood で再現・確認できた。

ただし現行実装には ISSUE-021 の設計文書 bypass があるため、問題は `domain/application/infrastructure` 編集全般ではなく、特に以下の条件で顕在化する。

- 対象 Unit の product `logical_design.md` / `domain_model.md` が揃っていない。
- inception 側の story docs は作ったが、product docs へ `@work-item-id` 付き反映がまだない。
- skill は実行したが、hook が参照できる session / marker / effective config がない。

## 推奨対応

1. `phasegate session begin --mode full --unit <unit> --work-item WI-XXX --reason <text> --duration 1h` のような TTL 付き session 昇格 command を追加する。
2. hook は `.phasegate/session.json` 等を読み、期限、対象 Unit、対象 layer、reason、work item を検証した上で full-mode-required edit を許可する。
3. `/story-implementor` Phase 2 開始時に session 昇格を実行し、完了時または stop hook で session を閉じる。
4. product docs が不足している場合は、不足 artifact を特定して `scaffold-design --phase domain` 等の正しい phase を案内する。
5. `caller_skill` は guidance 分岐には使ってよいが、許可条件として使う場合は skill 名だけでなく session marker と WI/product docs を組み合わせる。
6. `PHASEGATE_FULL_MODE` を公式にしないなら、guide / error message から期待させない。公式にするなら hook 側に明示実装し、監査情報を残す。

## Upstream issue draft

```markdown
**Title**: `/story-implementor` route has no automated mechanism to pass PreToolUse hook (Full-mode required)

**Version**: phasegate 0.160.11

**Summary**:
When a domain-layer file Edit is rejected by `quickMode.allowedCategories`, phasegate suggests `/story-implementor` as the normal route. However, the skill is a markdown guide only. It does not create a session marker, environment state, effective config, or WI approval state that the PreToolUse hook can use to allow the later domain edit.

The current code has a partial mitigation: if the target unit already has required product design docs, the full-mode block can be bypassed. But for under-designed units, or for work that only created inception docs and has not reflected them into product docs yet, following `/story-implementor` still returns to the same `FULL_MODE_REQUIRED` block at implementation time.

**Observed**:
- `scripts/harness/integrations/domain/value-objects/dogfood-probe.ts` is classified as `domain`.
- `domain` is outside the current allowed categories, so `fullModeRequired=true` with `MIXED_CHANGES`.
- The hook suggests `/story-implementor` and `scaffold-design --phase logical`, even though the unit already has `logical_design.md` and is missing `domain_model.md`.

**Expected**:
Provide an automated route such as `phasegate session begin --mode full`, WI/product-doc driven auto-allow, or a story-implementor preamble that creates hook-visible state. The route should let users pass the hook without manually widening `quickMode.allowedCategories` and remembering to restore it.
```
