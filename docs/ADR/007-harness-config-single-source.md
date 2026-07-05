---
adr_id: "007"
title: "phasegate.config.json を品質設定の Single Source of Truth とする"
status: Accepted
date: 2026-03-24
---

# phasegate.config.json を品質設定の Single Source of Truth とする

## Context

品質設定が複数のファイル（ESLint 設定、テスト設定、CI 設定）に分散すると、設定間の矛盾が発生し、プリセット（minimal/standard/strict）の切り替えが困難になる。

## Decision

`phasegate.config.json` を品質設定の唯一の真実源とする。

### スキーマ構成（v2）

- `project.preset`: `"minimal"` | `"standard"` | `"strict"`
- `layers.L1-L4`: 各レイヤーの有効/無効とバリデータ設定
- `quickMode`: Quick Mode の適用条件
- `phaseDependencies`: Phase Dependency Model のカスタマイズ
- `harnesses`: 品質ハーネス固有設定（bundleSizeLimit 等）
- `paths`: 設計文書パス

### パッケージ分離

- `phasegate.config.json`: 品質設定のみ（Quality Harness 管轄）
- `orchestration.config.json`: オーケストレーション設定（別パッケージ管轄）

Ownership が完全に分離され、設定の混在を防止する。

## Consequences

- プリセット切り替えが1ファイルの変更で完結する
- JSON Schema によるバリデーション（`ValidateConfigUseCase`）で設定の整合性を保証
- オーケストレーション設定との混在が物理的に不可能

## 関連要件

K13（phasegate.config.json）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
