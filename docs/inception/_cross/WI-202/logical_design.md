# WI-202 Logical Design

## Design Goals

- Quick Mode の実効許可範囲を `/quick-implementor` の説明、preset / workflow default、hook block guidance の 3 点で揃える。
- strict workflow でも軽微変更の正規経路が消えないようにし、block する場合は理由と復帰策を caller context に合わせる。
- protected file と PhaseGate の防御は維持し、単に broad allow で回避しない。

## Proposed Design

### 1. Quick Mode Scope Policy

`config-foundation` と `installation` は、Quick Mode category を以下のどちらかの明示方針に統一する。

| Option | 内容 | 判断 |
|---|---|---|
| A | strict workflow でも `bugfix/docs/test/config` を Quick Mode 許可カテゴリに含める | quick-implementor の advertised scope と一致。軽微変更の UX が最も自然。 |
| B | strict workflow は狭いカテゴリだけ許可し、quick-implementor SKILL.md に strict では事前緩和が必要と明記する | 防御は強いが、skill 名と利用者期待のずれが残る。 |

推奨は Option A。ただし `package.json` / `phasegate.config.json` のような protected file は file protection / managed CLI guidance で別途守る。

### 2. Workflow Default Alignment

`phasegate init --workflow strict` の生成 config は、preset JSON と公開 guide のいずれかに合わせる。現状の `["chore"]` は Quick Mode category enum (`bugfix/docs/test/config`) ともずれているため、少なくとも enum 外カテゴリを生成しない。

修正対象候補:

- install / init workflow default を生成する catalog or renderer
- `scripts/harness/config-foundation/infrastructure/presets/{minimal,standard,strict}.json`
- `docs/guide/configuration.md`
- `skills/quick-implementor/SKILL.md`

### 3. Caller Skill Context

pre-tool-use hook input に任意の caller skill context を追加する。

```typescript
interface PreToolUseHookInput {
  cwd?: string;
  tool_name?: string;
  caller_skill?: string;
  tool_input?: { ... };
}
```

Presentation adapter は `caller_skill` または将来の env var (`PHASEGATE_CALLER_SKILL`) を `HandlePreToolUseInput` に渡す。Application use case は `callerSkill?: string` を受け取り、block guidance の選択にのみ使う。判定そのものは従来どおり category / phase-gate / protected-file に委ねる。

### 4. Recovery Guidance

`buildFullModeRequiredBlockOutput` は caller skill と dominant category を見て message を切り替える。

| 条件 | guidance |
|---|---|
| `callerSkill === "quick-implementor"` かつ `dominantCategory` が quick-implementor advertised scope | `quickMode.allowedCategories` の方針確認、managed config path、または strict workflow の許可範囲外であることを案内 |
| `dominantCategory === "config"` かつ `phasegate.config.json` | `config:plan --intent quick-mode-relax --dry-run/--apply` guidance を返す |
| caller unknown | 現行互換で `/story-implementor` を案内 |

## Compatibility

- hook input の `caller_skill` は optional なので既存 hook payload は壊れない。
- caller context がない環境では現行の block semantics を維持する。
- Quick Mode default を広げる場合でも protected file check は full-mode check より前に残すため、保護対象の直接 Edit / Write は許可しない。
