---
id: WI-211
type: issue
severity: normal
status: drafted
affects: [documentation]
source: dogfood
---

# WI-211: Published dogfood should align personal status and Husky bootstrap behavior

> 起票日: 2026-05-22
> 起票経緯: `phasegate@0.160.16` publish 後の manual dogfooding で、personal mode と project install mode の広めの CLI / hook / skill smoke を実施したところ、scope contract が曖昧または不完全な挙動を確認した。

## 問題

### 1. personal install 後の `phasegate:status --json` が `.phasegate-local` を見ない

`phasegate install --personal --agent both --apply` 後、doctor / hooks は personal scope として動作するが、次は exit 2 になる。

```bash
npx --yes phasegate@latest phasegate:status --json
```

観測結果:

```json
{
  "status": "error",
  "errors": [
    {
      "code": "HARNESS_ERROR",
      "severity": "error",
      "message": "ENOENT: no such file or directory, open 'phasegate.config.json'"
    }
  ]
}
```

personal install は `.phasegate-local/phasegate.config.json` を runtime fallback として作成しているため、`phasegate:status` が personal scope で対応すべきか、非対応なら docs / CLI guidance で明示すべき。

### 2. fresh project install の `.husky/*` scripts は `.husky/_/husky.sh` 不在で単体実行できない

`phasegate install --agent both --with-husky --with-ci --apply` 後、`npx phasegate pre-commit` / `npx phasegate commit-msg` は成功する。一方、生成された `.husky/pre-commit` / `.husky/commit-msg` を fresh temp project で直接実行すると次で失敗する。

```text
./.husky/pre-commit: line 14: ./.husky/_/husky.sh: No such file or directory
./.husky/commit-msg: line 11: ./.husky/_/husky.sh: No such file or directory
```

`install --with-husky` が Husky bootstrap 済み repository を前提とするなら docs / doctor / setup plan に前提を明示すべき。fresh repository でも動かす contract なら `.husky/_/husky.sh` 相当の bootstrap を作るか、template から source 行を外す必要がある。

## 受け入れ基準

- [ ] personal install 後の `phasegate:status --json` が `.phasegate-local/phasegate.config.json` を読んで informational status を返す、または personal mode 非対応として明確な guidance を返す。
- [ ] personal install 後の status behavior が README / guide / setup artifacts に documented contract として反映される。
- [ ] project install `--with-husky` の fresh repository contract が明確になる。
- [ ] `--with-husky` が fresh repository 対応なら、生成 `.husky/pre-commit` / `.husky/commit-msg` / `.husky/pre-push` が `.husky/_/husky.sh` 不在でも実行できる。
- [ ] `--with-husky` が Husky bootstrap 既存前提なら、doctor / setup:agent / docs が `.husky/_/husky.sh` 不在を説明できる。
- [ ] 公開版 dogfood で personal status と project Husky scripts の最終 contract が確認済みになる。

## Dogfood Evidence

2026-05-22 に `phasegate@0.160.16` で確認した。

| Mode | Command | Result |
|---|---|---|
| personal | `phasegate:status --json` | exit 2。`phasegate.config.json` ENOENT。 |
| personal | `doctor --agent both --json`, hooks, skills, validators, reconcile/update-skills dry-run | success。 |
| project | `npx phasegate pre-commit`, `npx phasegate commit-msg <file>` | success。 |
| project | `./.husky/pre-commit`, `./.husky/commit-msg <file>` | exit 1。`.husky/_/husky.sh` missing。 |
| project | doctor, skills, hooks, validators/gates, setup/config, p2, session, baseline, scaffold dry-run, update-skills repair | success or expected validation failure for intentionally invalid skill-structure input. |

## 非スコープ

- WI-210 の shared skills deploy / doctor / reconcile repair contract の再変更。
- deprecated `init` path の再設計。
