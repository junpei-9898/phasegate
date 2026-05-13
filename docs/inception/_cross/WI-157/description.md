---
id: WI-157
type: issue
severity: normal
status: tested
affects: [documentation, setup, agent-integration]
source: internal
---

# WI-157: Legacy Setup Artifact Retirement Guide

> 起票日: 2026-05-12
> 起票経緯: 旧 setup artifact と現行 setup artifact の混在を整理するため。

## スコープ

- `.harness-hooks.yml`
- old Fuse hooks
- `.harness/session-state.json`
- `.harness/context-priority.json`
- `README.ja.md` 参照
- `hooks:config validate` の扱い

## 受け入れ基準

- [x] 現行 setup に必要なものと、過去互換・archive のものが混ざらない。
- [x] `.harness-hooks.yml` や old hook config の扱いが明確になる。
- [x] 実ファイル削除や archive docs 修正が必要な場合は、影響範囲が説明される。

## 反映

- `docs/guide/setup-artifacts.md`
- `docs/guide/hooks-integration.md`
- `docs/guide/cli-reference.md`
- `DEVELOPMENT.md`
- `skills/README.md`

## 依存

`WI-152` に吸収可能。ただし legacy cleanup を独立して扱う場合は本 WI で実施する。
