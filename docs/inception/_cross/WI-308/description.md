---
id: WI-308
type: fix
severity: high
status: drafted
affects: [harness-api]
source: internal
---

# WI-308: CLI large stdout drain before exit

<!-- @work-item-id WI-308 -->

## 背景

`world.enabled:true`のself-repoではL2-017が604件のadopted-legacy warningを可視化するため、`validate --layer L2 --json`のstdoutが64 KiBを超える。`main.ts`のvalidate経路は`console.log`直後に`process.exit`しており、pipe接続時にNodeのstdout queueをdrainする前に終了してJSON末尾を切断した。World CLIは`process.exitCode`を設定してreturnするため同じ欠陥を持たない。

## 修正

- stdoutへ直接resultを出して即時exitするtop-level CLI経路をinventoryする。
- 共通のgraceful exit helperでstdout / stderr queueの完了を待ち、exit codeだけを設定してmainからreturnする。
- validateを含むdirect-output経路を同じhelperへ移し、個別commandの64 KiB回避にしない。
- self-repo L2 JSONが64 KiBを超えることをassertし、完全なsingle JSON documentとしてparseできるE2Eを固定する。
- CLI subprocessを起動する同E2E fileの全caseへ60秒timeoutを明示し、Vitest既定5秒への環境依存を残さない。

## 受け入れ基準

- `validate --layer L2 --format json`と`--json`が64 KiB超でも末尾まで出力され、`JSON.parse`できる。
- warning 604件を省略・truncateせず、validator semanticsとexit codeを変更しない。
- World CLIの既存read-only exit契約を維持する。
- direct output後に即時`process.exit`する同型経路を残さない。
- `cli-harness.test.ts`の全subprocess caseが明示60秒timeout下で通過する。

## 非目標

- L2-017 warningの件数削減、baseline変更、JSON schema変更
- validatorのblocking / severity policy変更
- subprocess test runnerのbuffer上限変更による問題の隠蔽
