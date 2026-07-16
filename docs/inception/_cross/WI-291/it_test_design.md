# WI-291 Integration Test Design: Composition と `world:inspect`

<!-- @work-item-id WI-291 -->

@story-id H17-06

## 1. Fixture / process boundary

WM-09 / 10のrepository-shaped fixtureをcopyしてworld-model composition rootを組み立てる。CLI E2Eは`main.ts`をsubprocess実行し、stdout / stderr / exit codeと実行前後のtracked fixture bytesを比較する。

## 2. Cases

| ID | 条件 | 期待 |
|---|---|---|
| IT-WM291-001 | minimal valid corpus + configなし | canonical defaultsでSnapshot、exit 0 |
| IT-WM291-002 | hard diagnostic fixture | trustworthy JSON data + exit 1 |
| IT-WM291-003 | invalid config | defaultsへfallbackせずexit 2 |
| IT-WM291-004 | human / JSON | stdout / stderr契約、schema `phasegate-world-cli/v1` |
| IT-WM291-005 |同一fixtureを2回inspect | JSON bytes一致、generatedAtなし |
| IT-WM291-006 |実repository corpus | node / edge / diagnostic countsとcorpusRootを表示 |
| IT-WM291-007 | main / known command | `world:inspect`の集合一致とhelp掲載 |
| IT-WM291-008 | read-only | corpus / declaration / report bytesとfile set不変 |
| IT-WM291-009 | provider import scan | public indexだけを利用、World `node:crypto` 0件 |

## 3. Verification

- world-model / harness-api targeted unit + integration
- CLI E2E
- L1 / L2 / check-ready
- `world:inspect --json`を同じcheckoutで2回実行しbyte compare
- WM-11承認後のCP-2でfull suite、matrix再生成、L2 / L3、integrity verify
