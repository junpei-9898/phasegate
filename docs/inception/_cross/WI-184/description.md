---
id: WI-184
type: issue
severity: normal
status: tested
affects: [skill-quality]
source: github#9
external_ref: https://github.com/junpei-9898/phasegate/issues/9
---

# WI-184: `phasegate skills list` crashes with undefined push

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #9 の再現確認。

## 再現結果

```text
$ bin/phasegate skills list
Fatal: Cannot read properties of undefined (reading 'push')
```

## 問題

- `--help` に掲載されている command が即時 fatal error になる。
- skill catalog を CLI から列挙できない。

## 受け入れ基準

- [x] `phasegate skills list` が exit 0 で available skills を列挙する。
- [x] skill が 0 件の project でも undefined accumulator で落ちない。
- [x] `skills info <name>` と同じ catalog source を利用する regression test がある。

## 検証結果

- `pnpm exec tsx scripts/harness/main.ts skills list`: exit 0。`Available skills (30)`、`[Guidance]`、`/phasegate-config-doctor` を確認。
- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/unit/setup/skill-deployer.test.ts scripts/harness/__tests__/e2e/cli-harness.test.ts`: 2 files / 80 tests passed。

## 実装方針

- `skills list` の category accumulator に `guidance` を追加し、`getCategoryForSkill()` が返す全 category を受けられるようにする。
- `skills list` と `skills info <name>` は `scripts/harness/setup/skill-deployer.ts` の catalog helper を共有する。`list` は `skills/*/SKILL.md` の存在を catalog source とし、`info` は同じ helper が返す `SKILL.md` path を読む。
- `skills` directory が無い場合は空 catalog として扱い、exit 0 で `Available skills (0)` を出す。
