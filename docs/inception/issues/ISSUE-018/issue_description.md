# ISSUE-018: agent-integration の `cli-executor-port.ts` が `infrastructure/ports/` に配置されており Port として location ミス

## ステータス

- **状態**: 🟢 **CLOSED (v0.81.0, 2026-04-23)** — ISSUE-021 bypass 経由で移動完了。L1-003 違反 3 件解消（12 → 9）
- **起票日**: 2026-04-23
- **発見契機**: ISSUE-003 Wave 4（v0.80.0）で `no-layer-violation` (L1-003) の ignorePatterns 拡張後も残った 3 件の違反を分析中に発覚
- **影響Unit**: agent-integration（主）
- **深刻度**: Medium — Port が Dependency Inversion Principle に反する位置に配置されており、Clean Architecture の構造整合性を損なう
- **優先度**: P3 — 実動作には影響ないが、ISSUE-003 の L1-003 残 3 件の根本原因

## 問題の概要

`scripts/harness/agent-integration/infrastructure/ports/cli-executor-port.ts` は名前の通り Port（抽象インターフェース）だが、`infrastructure/` レイヤーに配置されている。Clean Architecture の原則では Port は `application/ports/` または `domain/ports/` に置き、Adapter 側が `infrastructure/adapters/` で実装する。現配置では application usecase が infrastructure を import せざるを得ず L1-003 違反を引き起こす。

### 該当違反（v0.80.0 phasegate lint 出力）

```
scripts/harness/agent-integration/application/usecases/handle-post-tool-use-usecase.ts
  -> scripts/harness/agent-integration/infrastructure/ports/cli-executor-port.ts (2件)
scripts/harness/agent-integration/application/usecases/handle-stop-usecase.ts
  -> scripts/harness/agent-integration/infrastructure/ports/cli-executor-port.ts (1件)
```

## 修正案

**A. Port を `application/ports/` に移動**
- `scripts/harness/agent-integration/infrastructure/ports/cli-executor-port.ts` → `scripts/harness/agent-integration/application/ports/cli-executor-port.ts`
- ファイル先頭の `@layer infrastructure` → `@layer application`
- import path を参照する全ファイルを更新

**B. Adapter 実装の確認**
- `infrastructure/adapters/` 配下に `CliExecutorPort` を実装する adapter が存在するか確認
- 存在すれば import path のみ修正。存在しなければ本 issue 対象外（dead port の可能性あり）

### Acceptance criteria

- [ ] `cli-executor-port.ts` が `application/ports/` 配下に移動されている
- [ ] `@layer` メタデータが `application` に更新されている
- [ ] `handle-post-tool-use-usecase.ts` / `handle-stop-usecase.ts` の L1-003 違反（3件）が解消される
- [ ] Adapter 側の import path も同期更新されている
- [ ] 既存 3299 件のテストが全て green を維持

## 実装フェーズ

| Phase | 内容 | 見積り |
|---|---|---|
| A | ファイル移動 + `@layer` 修正 + import path 更新 | 0.5h |
| B | Adapter 参照検証 + テスト更新 | 0.5h |
| C | lint 確認（L1-003: 12 → 9） | 0.25h |

**合計見積り**: ~1.25h

**スコープ判断**: Port の移動は API 契約変更ではなく「ファイル配置変更」に該当。Quick Mode スコープで実施可能（bugfix + config 的）。ただし import path が他 Unit から参照されている場合は story-implementor 相当の慎重さで進める。

## 参照

- `scripts/harness/agent-integration/infrastructure/ports/cli-executor-port.ts`
- `scripts/harness/agent-integration/application/usecases/handle-post-tool-use-usecase.ts`
- `scripts/harness/agent-integration/application/usecases/handle-stop-usecase.ts`
- 関連 issue: ISSUE-003 Wave 4
