# Architecture Preset Selection Guide

phasegate の `phasegate.config.json` には `architecture.preset` を通じて「そのプロジェクトが採用しているアーキテクチャスタイル」を明示する。L1-003 (`no-layer-violation`) / L1-004 (`enforce-folder-structure`) はこの preset を参照して層名と依存方向を判定する。

preset の選択が正しくないと、本来合法な import が violation として検出される / 本来検出されるべき違反が通過する等の誤判定が発生する。本ガイドは preset 選択の判断基準と実例を示す。

---

## 用語の整理（呼称の混同を避ける）

phasegate には 2 系統の「プリセット」概念があり、役割が異なる:

| 系統 | 概念 | 設定キー | 例 |
|------|------|---------|----|
| **防御プリセット** | L3 CI で検査強度を選ぶ | `ci.preset` | `strict` / `lenient` |
| **アーキプリセット** | L1 の層構造と依存方向を定義 | `architecture.preset` | `clean` / `onion` / `hexagonal` / `layered` / `flat` / `strict-ddd` / `custom` |

本ガイドの対象は **アーキプリセット**。CI 強度の選定は `docs/guide/configuration.md` を参照。

---

## 7 preset の早見表

| preset | 層構成 | 典型的な採用対象 |
|--------|--------|------------------|
| `clean` (default) | `domain / application / infrastructure / presentation` | Clean Architecture / AIDLC フルハーネス構成 |
| `strict-ddd` | `clean` + 循環依存禁止を厳格化 | DDD 重視の新規 PJ |
| `onion` | `domain / application / interface` | Onion Architecture |
| `hexagonal` | `core / ports / adapters` | Hexagonal / Ports-and-Adapters |
| `layered` | `presentation / business / data` | 古典的 3 層レイヤード |
| `flat` | 層分割なし | 小規模スクリプト・CLI ツール / retrofit 導入初期 |
| `custom` | `layers` + `allowedDependencies` を明示指定 | どの既成プリセットにも当てはまらない PJ |

各 preset の詳細な層行列は `docs/inception/issues/ISSUE-014/wave1_schema_proposal.md §1.2` を参照。

---

## 選択フロー

```
1. 既存 PJ か新規 PJ か？
   ├─ 新規 → Q2 へ
   └─ 既存 → retrofit-adoption.md を先に参照 / 初期は `flat` でも可

2. DDD / Clean Architecture を明示採用している？
   ├─ はい → Q3 へ
   └─ いいえ → Q4 へ

3. 4 層分離（domain / application / infrastructure / presentation）を守っている？
   ├─ はい → `clean`（循環依存も潰したい場合は `strict-ddd`）
   └─ いいえ → カスタム Q5 へ

4. フレームワーク構造に寄せている？
   ├─ Onion (3 層 domain/application/interface) → `onion`
   ├─ Hexagonal (core/ports/adapters) → `hexagonal`
   ├─ MVC / 古典 3 層 (presentation/business/data) → `layered`
   ├─ 小規模スクリプト / 層概念なし → `flat`
   └─ それ以外 → `custom`

5. `custom` を選ぶ場合、`layers` と `allowedDependencies` を明示指定する（例は後述）。
```

---

## 設定例

### `clean`（default、省略可）

```json
{
  "$schema": "./node_modules/phasegate/schemas/harness-config-v3.schema.json",
  "architecture": { "preset": "clean" },
  "l1": { "enabled": true, "rules": {} }
}
```

### `onion`

```json
{
  "architecture": { "preset": "onion" },
  "l1": { "enabled": true, "rules": {} }
}
```

ソースファイルの `@layer` タグは `domain` / `application` / `interface` のいずれかを使用する。

### `hexagonal`

```json
{
  "architecture": { "preset": "hexagonal" },
  "l1": { "enabled": true, "rules": {} }
}
```

`@layer core` / `@layer ports` / `@layer adapters`。

### `flat`（層分割なし）

```json
{
  "architecture": { "preset": "flat" },
  "l1": { "enabled": true, "rules": {} }
}
```

`flat` を指定すると L1-001 (`require-unit-comment`) / L1-002 (`require-layer-comment`) / L1-003 / L1-004 が user 明示なき限り auto-disable される。

### `custom`（明示指定）

```json
{
  "architecture": {
    "preset": "custom",
    "layers": ["model", "service", "controller", "view"],
    "allowedDependencies": {
      "model":      ["model"],
      "service":    ["service", "model"],
      "controller": ["controller", "service", "model"],
      "view":       ["view", "controller"]
    }
  }
}
```

`custom` では `layers` と `allowedDependencies` の両方が必須（片方欠けると config 検証で error）。

---

## override（preset に部分的な上書きを掛ける）

preset を base にして一部の `allowedDependencies` のみ書き換えたい場合:

```json
{
  "architecture": {
    "preset": "clean",
    "allowedDependencies": {
      "presentation": ["presentation", "application"]
    }
  }
}
```

上書きしなかった層（`domain` / `application` / `infrastructure`）は preset 既定のまま。

詳細な semantic validation ルール（C1 自己参照 auto-fill / C2 キー不整合 error / C3 値不整合 error / C4 layer 欠落 auto-fill / C5 循環依存 warn）は `docs/inception/issues/ISSUE-014/wave1_schema_proposal.md §1.3` を参照。

---

## 既存 v2 config からの移行

v0.86.0 より前の `phasegate.config.json` には `architecture` キーが無い。phasegate は後方互換で v2 も読めるが、**v3 への明示アップグレードを推奨**する:

```bash
npx phasegate migrate --schema v3
```

このコマンドは `phasegate.config.json` に `architecture: { preset: "clean" }` を追記して v3 化する（既に `architecture` がある場合は no-op）。

---

## 参照

- `docs/inception/issues/ISSUE-014/wave1_schema_proposal.md` — 設計提案とプリセット詳細
- `docs/inception/issues/ISSUE-014/issue_description.md` — issue 背景
- `docs/ADR/ADR-015-architecture-preset.md` — アーキ設計決定
- `docs/guide/retrofit-adoption.md` — 既存 PJ への後付け導入
- `docs/guide/configuration.md` — 他の config 項目
