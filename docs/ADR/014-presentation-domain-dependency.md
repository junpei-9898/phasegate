---
adr_id: "014"
title: "presentation → domain 直接依存を許容する（Robert C. Martin 版 Clean Architecture 準拠）"
status: Accepted
date: 2026-04-23
---

# presentation → domain 直接依存を許容する（Robert C. Martin 版 Clean Architecture 準拠）

## Context

ADR-005 で採用した Hexagonal Architecture の派生で、phasegate の L1-003 `no-layer-violation` は当初 **presentation layer は presentation + application にしか依存できない**という厳格 DDD Layered 解釈を採用していた（`scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:ALLOWED_DEPENDENCIES`）。

しかしこの解釈では、Clean Architecture 実装として一般的な以下のパターンが全て L1-003 違反として flag される:

- Presenter が Domain VO の値を読み取って表示用文字列に整形する
- Formatter が Domain Service（policy 系）の判定を呼んで整形する
- CLI handler が Domain Type（discriminated union 等）を switch して分岐する

ISSUE-019 で監査した時点で 8 件の違反が存在し、いずれも「read-only で VO/type/policy を display/format する」パターンで、Dependency Inversion Principle の本質（domain が外部の詳細に依存しない）は侵していなかった。

### 哲学的立場の整理

| 派 | `presentation → domain` | 出典 |
|---|---|---|
| **Robert C. Martin 版 Clean Architecture** | ✅ 許容 | presenter は "Interface Adapters" ring にあり、Entity/VO は Enterprise Business Rules として全 ring から参照可能 |
| **厳格 DDD Layered** | ❌ 禁止 | presentation は application 経由で DTO を受け取り、domain を直接触らない |
| **phasegate 旧実装** | ❌ 禁止 | 厳格 DDD 派を採用（実装時の暗黙判断） |

## Decision

`ALLOWED_DEPENDENCIES.presentation` に `'domain'` を追加し、**Robert C. Martin 版 Clean Architecture の解釈を phasegate 標準とする**:

```typescript
const ALLOWED_DEPENDENCIES = {
  domain:         ['domain'],
  application:    ['application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
  presentation:   ['presentation', 'application', 'domain'],  // domain を追加
};
```

### 許容される具体パターン

- presenter/formatter が Domain VO を read-only で取得して表示用文字列に変換
- CLI handler が Domain Type を参照して分岐
- formatter が Domain Service の pure method（副作用なし）を呼んで判定

### 依然として禁止されるパターン

- presentation → infrastructure の直接依存（DB/CLI/FS 直叩き）
- presentation から domain VO の mutation（domain は read-only で扱う）
- domain → presentation / application / infrastructure の逆方向依存（Dependency Inversion の核）

`infrastructure → domain` と `application → domain` の既存許容は維持。

## Consequences

### ポジティブ

- 既存 8 件の false positive が解消（L1-003 が 8 → 0 件）
- phasegate を他 PJ に導入したとき、Robert Martin 流 CA を採用している PJ で摩擦が激減
- `domain VO の直接 read` を presentation で許容する CA 一般的実装が lint を通るようになる

### ネガティブ / トレードオフ

- 厳格 DDD 派（presentation → application → domain を強制したい PJ）では緩すぎる
  - **緩和策**: ISSUE-014（アーキテクチャスタイル config 化）で `preset: "strict-ddd"` を選択肢として提供予定。厳格派は opt-in できる
- presenter が domain mutation を行うリスクは残る
  - **緩和策**: domain VO を immutable（`readonly` + `Object.freeze`）に保つ既存 ADR-009（DDD Tactical Patterns）の規約で抑止

### スコープ外（本 ADR で扱わない）

- application → presentation などの逆方向（Dependency Inversion 違反）の許容は検討対象外
- domain から他層への依存の許容は検討対象外
- preset による選択的緩和（`strict-ddd` / `classic-ca` / `custom` 等）は ISSUE-014 の範疇

## 関連

- `scripts/harness/biome-ast-engine/domain/value-objects/layer-name.ts:15-20` — ALLOWED_DEPENDENCIES 実体
- `scripts/harness/biome-ast-engine/domain/value-objects/layer-boundary.ts:31-45` — standardMatrix
- ADR-005 (Hexagonal Architecture 採用) — 本 ADR はその依存方向規則の一部緩和
- ADR-009 (DDD Tactical Patterns) — domain immutability 規約で mutation リスクを抑止
- ISSUE-019 (LayerBoundary 再評価) — 本 ADR で CLOSED
- ISSUE-014 (architecture style config) — preset 化での opt-in 厳格派提供を予定

## Alternatives

本 ADR は既存本文で 3 つのアーキテクチャ解釈を比較しており（正規化時に canonical `## Alternatives` として再掲）:

1. **Robert C. Martin 版 Clean Architecture（採用）** — `presentation → domain` の read-only 依存を許容する。
2. **厳格 DDD Layered** — `presentation` は `application` 経由でのみ `domain` に触れる。read-only の VO/type/policy 参照まで false positive として弾くため不採用（ただし将来 `strict-ddd` preset で opt-in 提供予定）。
3. **phasegate 旧実装（厳格 DDD 派）** — 実装時の暗黙判断。本 ADR で置き換える。

比較の詳細は上記 Context「哲学的立場の整理」および Decision を参照。
