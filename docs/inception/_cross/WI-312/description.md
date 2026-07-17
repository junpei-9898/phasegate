---
id: WI-312
type: issue
severity: high
status: drafted
affects: [ci-governance, regression-suite]
source: internal
---

# WI-312: Generate coverage before the authoritative CI gate

<!-- @work-item-id WI-312 -->

## 背景

production workflowは`pnpm test`の後にmatrix生成と`phasegate:ci-check`を実行するが、L3-003が読む`coverage/coverage-summary.json`を生成していなかった。clean GitHub Actions checkoutではcoverageThreshold=90に対してreport absentとなり、L3が正しくfail-closedする。ローカルPASSは過去のuntracked coverage artifactへの依存だった。bundled `aidlc-gate`にも同じcoverage生成漏れがある。

## 修正

- self-repo CIのtest stepを、`pnpm coverage`によるforks / threads suiteの計測付き単回実行と、coverage configが循環回避のため除外するE2E suiteの単回実行に置換する。
- package script冒頭のclean後はthreads coverage開始時にforks blobを保持し、両poolを実際のmerge inputにする。
- 既存`pnpm ci`は`coverage && test`で非E2E suiteまで再実行するため採用せず、4回相当のsuite実行を避ける。
- matrix、World derive二重一致、L3、attestation、integrityの順序は維持する。
- bundled `aidlc-gate`はlockfileに対応するpackage managerで`coverage` scriptを実行し、script不在やreport未生成をfail-closedの導入契約として扱う。

## 所要時間の判断

coverage実行はinstrumentationとblob mergeの追加コストを持つが、L3-003のauthoritative inputを生成するため省略できない。coverage後にplain full testを重ねず、coverage対象外E2Eだけを補完することで、全unit / integration suiteの二重実行を避ける。実測時間は着地報告に記録する。

## 受け入れ基準

- generated coverage / matrixが存在しないtracked-only checkoutからCI順序を実行し、L3-003を含むci-checkがexit 0になる。
- attestation v2のproduce `--require-pass`とverifyがexit 0になる。
- production workflowとbundled templateがtest / coverage生成をmatrixより前に置く。
- coverage summaryがforks / threads双方のblobをmergeして生成される。
- World derive二重一致、L3、attestation、integrityの既存順序を変更しない。

## 非目標

- L3-003のcoverageThreshold、report path、missing-report fail-closed semanticsの変更
- coverage reportのcommit、baseline / allowlist追加
- coverageとplain full suiteの重複実行による問題の隠蔽
