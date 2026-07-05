---
adr_id: "005"
title: "Hexagonal Architecture（Ports & Adapters）の採用"
status: Accepted
date: 2026-03-24
---

# Hexagonal Architecture（Ports & Adapters）の採用

## Context

Quality Harness はエージェント非依存であり、外部システム（ファイルシステム、Biome CLI、Git、テストランナー）との結合を疎に保つ必要がある。また、各バリデータのビジネスロジック（ドメイン層）をインフラストラクチャの詳細から独立させることで、テスタビリティと移植性を確保したい。

## Decision

全 Unit に Hexagonal Architecture（Ports & Adapters パターン）を適用する。

```
domain/          — Entity, VO, Service, Port（インターフェース）
application/     — UseCase, DTO, Mapper
infrastructure/  — Port の実装（Adapter）、外部システム接続
presentation/    — CLI コマンド、フォーマッター
```

### 依存方向の規則

- `domain` は他のどのレイヤーにも依存しない
- `application` は `domain` にのみ依存する
- `infrastructure` は `domain` の Port を実装する
- `presentation` は `application` の UseCase を呼び出す

この規則は L1-003 `no-layer-violation` ルールにより機械的に強制される。

## Consequences

- ドメインロジックが外部依存から完全に独立する
- Port を差し替えることでテスト時にモックが容易
- L1 バリデータが import グラフ解析でレイヤー違反を自動検出

## 関連要件

K1（4層防御、L1-003）、K5（DDD設計スキル群）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
