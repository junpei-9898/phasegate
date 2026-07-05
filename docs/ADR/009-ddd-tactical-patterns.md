---
adr_id: "009"
title: "DDD 戦術パターン（Entity/VO/Aggregate）の採用"
status: Accepted
date: 2026-03-24
---

# DDD 戦術パターン（Entity/VO/Aggregate）の採用

## Context

品質ハーネスのドメインモデルは複数の概念（バリデータ、エラー、設定、トレーサビリティ）を含む。これらの概念を適切にモデリングし、不変条件を強制するための構造化手法が必要である。

## Decision

DDD 戦術パターンを全 Unit のドメイン層に適用する。

### 適用パターン

| パターン | 適用例 |
|---------|-------|
| **Value Object** | `ErrorCode`, `Severity`, `ValidatorId`, `RuleName`, `FilePath`, `AdrRef` |
| **Entity** | `ErrorDefinition`, `RuleDefinition`, `HookDefinition` |
| **Aggregate** | `LintReport`, `ValidationResult`, `HarnessConfig` |
| **Domain Service** | `DriftDetectionService`, `ConsistencyCheckService`, `LintRunner` |
| **Port（インターフェース）** | `SecurityPatternScannerPort`, `PerformanceScannerPort` |

### Value Object の設計原則

- 不変（`Object.freeze` または `readonly`）
- ファクトリメソッド（`create`/`fromString`）でバリデーション
- 等値比較（`equals`）をサポート
- 無効な値はコンストラクタで即座に拒否

## Consequences

- ドメインの不変条件がコンパイル時に強制される
- 型安全な値オブジェクトにより、文字列の誤用が防止される
- domain-designer スキルにより一貫したパターンで設計可能

## 関連要件

K5（DDD設計スキル群）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
