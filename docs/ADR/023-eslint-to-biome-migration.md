---
adr_id: "023"
title: "ESLint→Biome 全面移行"
status: Accepted
date: 2026-03-11
---

# ESLint→Biome 全面移行

## Context

v0 の L1 静的検査は ESLint に 4 つのカスタムルールを載せた構成だった。ESLint は JavaScript 実装であり、大規模コーパスに対する実行速度が遅く、フィードバックループの短縮を阻害していた。

> §12 Key Decision: eslint-to-biome

## Decision

L1 の静的検査エンジンを Rust 製の **Biome** へ全面移行する。

- v0 の 4 カスタムルールを Biome の AST ルールとして移植する。
- ESLint 由来のレガシー成果物（設定・依存）は能動的に拒否し、回帰を防止する。

## Consequences

- L1 エンジンは Biome となり、ADR-001 の 8 ルールを Biome AST 上で実行する。ESLint 比で 50-100 倍高速なフィードバックが得られる。
- `scripts/harness/biome-ast-engine/application/usecases/verify-eslint-removal-usecase.ts` が ESLint 成果物の残存を検出し、`LegacyEslintArtifactDetectedError` を throw して ESLint への回帰を機械的に防ぐ。

関連: ADR-001（4層防御モデル / L1 の 8 ルール）。
