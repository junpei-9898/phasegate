---
id: WI-345
type: fix
severity: high
status: drafted
affects: [quick-mode, agent-integration]
source: bug sweep v0.292.0 (2026-07-21) 既知残課題② / WI-334 の穴埋め
---

# WI-345: Bash 経路の新規ファイルが changeKind=MODIFY 既定で feature が bugfix にすり抜ける穴の修正

<!-- @work-item-id WI-345 -->

## 背景

hook は Bash 抽出ターゲットに targetChanges=[](非 undefined)を渡すため、WI-334 で導入したファイル存在ベースの CREATE/MODIFY 推定(targetChanges===undefined の CLI 経路限定)が働かず、Bash 経由の新規ファイル作成が MODIFY 既定 → bugfix フォールバックで通ってしまう。feature 相当の新規ソース作成が quick-mode をすり抜ける防御の穴(WI-334 は意図的に先送りした箇所)。

## 修正

WI-344 で抽出精度を正した上で、Bash 経路の抽出ターゲットにもファイル存在推定を適用し(存在しない → CREATE)、CLI/hook/Bash の 3 経路で changeKind 判定を統一する。存在チェック失敗時は従来どおり MODIFY 既定(安全側)。
