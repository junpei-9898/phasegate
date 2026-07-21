---
id: WI-342
type: fix
severity: normal
status: drafted
affects: [harness-api]
source: bug sweep v0.292.0 (2026-07-21) Bug#7
---

# WI-342: validate --layer の不正値が黙って全レイヤー実行になる問題の修正

<!-- @work-item-id WI-342 -->

## 背景

main.ts の validate case で `--layer` が as cast のみで実行時検証がなく、`--layer L9` 等の不正値が黙って全レイヤー実行になる。同コマンドの `--format` は不正値に丁寧なエラーを出しており非対称。

## 修正

`--layer` 値を {L0, L2, L3, L4, all} に対して検証し、不正値は有効値一覧つきエラーで exit 2。`L1` 指定時は `npx phasegate lint` への案内を追加。ヘルプ表記も実有効値に整合。
