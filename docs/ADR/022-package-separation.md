---
adr_id: "022"
title: "パッケージ分離 — Quality Harness / Orchestration"
status: Accepted
date: 2026-03-11
---

# パッケージ分離 — Quality Harness / Orchestration

## Context

phasegate の品質ハーネスは、特定の AI エージェントやオーケストレーション基盤に依存せず、単独で品質防御を提供できるべきである（ADR-006「エージェント非依存」）。品質ハーネスとオーケストレーション（エージェントの起動・タスク割り当て・ワークフロー制御）を同一パッケージに結合すると、品質の移植性が損なわれ、オーケストレーション基盤を変更・撤去した際に品質防御も道連れになる。

> §12 Key Decision: package-separation

## Decision

品質ハーネスを担う **Quality-Harness パッケージ（本リポジトリ）** と、エージェント制御を担う **Orchestration パッケージ** を分離する。

- 品質設定は `phasegate.config.json` に、オーケストレーション設定は `orchestration.config.json` に置く（ADR-007）。
- 両パッケージは相互に所有し合わない。Quality-Harness は Orchestration の設定・コードを一切含まない。

## Consequences

- 本リポジトリには orchestration のコード・設定が意図的に不在である。この不在そのものが分離の証跡となる。
- 品質防御が特定のオーケストレーション基盤から独立して移植可能になる。
- 非交渉要件 K1-K13 は全て品質ハーネス側に帰属する（ADR-024）。オーケストレーション側へ品質責務が漏れない。

関連: ADR-006（エージェント非依存設計原則）、ADR-007（設定ファイルの Single Source of Truth と設定ファイル分離）、ADR-024（K1-K13 の品質ハーネス帰属）。
