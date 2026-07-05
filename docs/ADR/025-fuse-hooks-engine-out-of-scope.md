---
adr_id: "025"
title: "FUSE Hooks Engine は v1 スコープ外"
status: Accepted
date: 2026-03-11
---

# FUSE Hooks Engine は v1 スコープ外

## Context

ファイルシステムレベル（FUSE ベース）で横断的にファイル操作を捕捉する Hooks Engine を横断基盤として検討した。しかし、Core Value（設計意図とコードの構造的整合性の機械的保証）は L1-L4 の防御層で維持可能であり、FUSE のような重い横断基盤を v1 に含める必然性はなかった。

> §12 Key Decision: fuse-out-of-scope

## Decision

FUSE Hooks Engine を v1 のスコープ外とし、横断基盤としては別途検討へ defer する。

## Consequences

- その後 L0 は FUSE ではなく **エージェントランタイムのフック + git フックのエンジン**（`agent-integration` ユニット + Husky）として実現された。詳細は `docs/guide/layer-model.md` §L0 を参照。
- FUSE 自体は依然として defer された選択肢のままであり、採用も棄却もされていない。
- L0 を後から追加する拡張パス（ADR-029）は、この defer を前提に設計された。

関連: ADR-001（4層防御モデル）、ADR-029（L0 4層→5層復帰パス）。
