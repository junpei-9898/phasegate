# ISSUE-009 実装計画書

> **⚠️ 2026-04-23: DEFERRED** — 本計画は Orchestration Engine（`docs/product/orchestration_product_overview.md`）の session-manager / `.session.lock` / worktree 契約と責務境界が重複することが判明し、保留中。詳細は [description.md](./description.md#保留判断2026-04-23) の「保留判断」セクション参照。再開時は v2.0 として orchestration 委譲部分（L1 ref-counted freeze / P2 flock / P3 sync debounce / P4 stale ref cleanup）を削除し、~3d に圧縮して再提示する。

**参照元**: [WI-009 description.md](./description.md)
**起票日**: 2026-04-22
**計画確定**: 2026-04-22（ISSUE-007 完遂直後 / v1.1 git lifecycle・snapshot 追記 / v1.2 構造的制約 L1-L4 を v1 スコープに吸収）
**保留決定**: 2026-04-23（Orchestration Engine との責務境界見直し）
**対象スコープ**: Claude Code + Codex 両対応（Cursor / Aider 等の hookless agent も chmod 層で自動防御）
**想定工数（v1.2 時点）**: ~6 人日（Wave 1-4、L1-L4 完全解消含む）
**想定工数（v2.0 再開時）**: ~3 人日（単一 session 前提、orchestration 委譲後）

---

## 計画の前提と設計思想

### 本計画が採用する防御モデル

```
┌────────────────────────────────────────────────────────────┐
│  L-1 (新設): guard-system                                  │
│    chmod ベースの OS 層ガード                               │
│    - kernel が enforce                                      │
│    - agent 非依存（Claude / Codex / Cursor / vim / 全て）   │
│    - 下限保証「不正な write は物理的に不可能」              │
├────────────────────────────────────────────────────────────┤
│  L0-L4 (既存): hooks / pre-commit / CI / metadata           │
│    actionable UX 層                                         │
│    - エラーメッセージの質を担保                             │
│    - scaffold CLI / suggestedSkill の提示                   │
│    - Full/Quick 判定などの粒度細かいロジック                │
└────────────────────────────────────────────────────────────┘
```

**置き換えではなく二層化**。chmod は下限保証、hook は UX。両方あって初めて「AI 非依存の品質防御」標語が実装と一致する。

### FUSE は採用しない

- macFUSE は macOS セキュリティ制約（kext 廃止 / SIP / Endpoint Security entitlement）で撤退済み
- chmod ベースのアプローチで同等の防御が成立
- Apple の特別 entitlement が必要な経路は OSS 配布と両立しない

### Windows は v1 スコープ外

- POSIX chmod 前提で進める
- Windows では `phasegate guard` は warning を出して no-op
- NTFS ACL 対応は将来の別 issue

---

## Agent 別の防御カバレッジと UX

| Agent | L-1 (chmod) | L0-L4 (hook/pre-commit) | 実効 UX |
|---|---|---|---|
| Claude Code | 🟢 OS enforce | 🟢 actionable 3 行を即時表示 | 最良（1 ターンで完結） |
| Codex | 🟢 OS enforce | 🟡 Bash 経路のみ hook が効く | 良（非 Bash 経路も chmod で物理的に止まる。sentinel + doctor で actionable に到達） |
| Cursor / Continue / Aider / 任意 LLM + スクリプト | 🟢 OS enforce | 🔴 hook 非対応 | 可（sentinel + AGENTS.md + `phasegate doctor` で 2-3 ターン以内に actionable 情報へ） |
| 人間が vim で直接編集 | 🟢 OS enforce | — | 可（同上） |

### hookless agent のための actionable UX 設計

**問題**: hook が走らないので EACCES だけでは原因が分からない。

**対策** (本計画で同時実装):

1. **sentinel ファイル配置**: LOCKED Unit dir に `PHASEGATE_LOCKED.md` を置く（読み取りは可）。内容に scaffold / suggestedSkill を含める
2. **AGENTS.md 生成**: `npx phasegate init` で AGENTS.md に「EACCES on src/ → run `npx phasegate guard doctor <path>`」を明記
3. **`phasegate guard doctor <path>` CLI**: hook が返すのと同じ actionable 3 行を CLI で提供

これにより hookless でも情報劣化を最小化（1 ターン追加程度に抑える）。

---

## Wave 分割（バージョン毎の着地単位）

| Wave | 版 | scope | 工数目安 | Phase 対応 |
|---|---|---|---|---|
| **Wave 1** | v0.75.0 | guard-system Unit の domain + application 純関数実装 | 0.5d | Phase A |
| **Wave 2** | v0.76.0 | infrastructure 層 + CLI（`guard sync` / `status` / `doctor`） | 1.5d | Phase B + C |
| **Wave 3** | v0.77.0 | hook 配線（`.claude/settings.json` / `.codex/hooks.json` / git hooks） + sentinel / AGENTS.md | 1d | Phase D |
| **Wave 4** | v0.78.0 | L0-002 再定義 + L0-003 追加 + ADR + docs 改訂 + Codex E2E 検証 | 1d | Phase E + F + G |

**合計 ~4d**。Wave 1-2 は backend だけなので単体テストで完結、Wave 3-4 は実環境 dogfood が必須。

---

## Wave 1: domain + application 純関数（v0.75.0）

### スコープ

- `scripts/harness/guard-system/` Unit 新設（CA 構造）
- domain 層: `UnitGuardState`（UNLOCKED/LOCKED VO）/ `PermsPolicy`（state → perms 写像）/ `UnitIdentifier`
- application 層: port 定義 + `ReconcilePermsUseCase` / `GetGuardStatusUseCase` / `DoctorUseCase`（infra stub で unit test）

### Deliverables

- `scripts/harness/guard-system/domain/` 一式
- `scripts/harness/guard-system/application/` 一式（ports + use cases）
- unit tests (Vitest, 日本語ケース名, AAA パターン)
- ドメイン層はモック禁止（CLAUDE.md 規約遵守）

### 事前条件

- `docs/product/construction/guard-system/logical_design.md` 作成
- `docs/product/construction/guard-system/domain_model.md` 作成
- `docs/product/construction/guard-system/unit_test_design.md` 作成
- phase-gate が guard-system の Write を通す状態に

### 受け入れ基準

- `ReconcilePermsUseCase` が「設計文書状態 → PermsPolicy の期待値」を純関数として返す
- edge cases をカバー: `__tests__/` always-open / `scripts/harness/` 直下ファイル / symlink スキップ / baseline grandfathered path
- unit test coverage 90%+

### リスク

- domain_model の粒度決定（Unit 単位 vs ファイル単位）—— **Unit 単位で進める**（issue_description の未決事項 #1 の推奨に従う）

---

## Wave 2: infrastructure + CLI + ref-counted freeze + snapshot + mv + parent-lock（v0.76.0）

### スコープ

- infrastructure: `FsPermsApplier`（chmod 実行） / `FsUnitDiscovery`（source dirs 列挙） / `GitIgnorePermsHelper`
- presentation: `npx phasegate guard sync / status / doctor / freeze / thaw / mv` CLI
- **perms snapshot**: `.phasegate/perms-snapshot.json` に guard 化直前の元 perms を保存。UNLOCK 時は固定値 (644/755) ではなくスナップショットから復元
- **ref-counted freeze/thaw API (L1 解消)**: `.phasegate/.guard-state.json` に `{ freezeRefs: { <session-id>: <timestamp> } }` を記録。複数 session の並行 freeze に耐える。TTL（デフォルト 10min）切れ ref は自動清掃で crash 耐性
- **mkdir 独占 (L2 解消)**: `project.paths.unitParentPaths` を新設（デフォルト `project.paths.source` と同じ）。これらを 555 化して agent による任意 mkdir を kernel レベルで禁止。新 Unit 作成は `guard sync` が唯一の mkdir 実行主体になる
- **`guard mv` CLI (L3 解消)**: Unit 境界を跨ぐ rename を「freeze 両端 → mv → sync」の atomic な単位で提供
- IT テスト（tmp dir で実 chmod）

### Deliverables

- `guard-system/infrastructure/` 一式
- `guard-system/presentation/guard-cli.ts`
- `.phasegate/perms-snapshot.json` 形式定義 + 保存 / 復元ロジック
- `.phasegate/.guard-state.json` の ref-counted freeze state
- `FreezeGuardUseCase` / `ThawGuardUseCase`（ref-counted、TTL 清掃付き）
- `GuardMvUseCase`（Unit 境界 mv）
- `ParentLockUseCase`（`unitParentPaths` の 555 化 + `guard sync` による mkdir 独占）
- `config-foundation` schema 拡張: `project.paths.unitParentPaths`（optional、デフォルト `paths.source`）
- IT tests（tmpdir + 実 chmod + stat 検証）
- main.ts への command 配線

### 受け入れ基準

- `npx phasegate guard sync` が冪等（2 回実行で perms 変化なし）
- `npx phasegate guard status --json` が LOCKED/UNLOCKED 一覧を構造化出力
- `npx phasegate guard doctor <path>` が ISSUE-007 Wave 9 の actionable 3 行（`suggestedSkill` / `scaffold` / `テンプレ`）を返す
- ErrorGuidanceQueryPort を再利用（重複実装しない）
- **perms snapshot**: ユーザーが事前に `chmod 444 src/payments/foo.ts` していた場合、UNLOCK 後も 444 に復元される（644 に上書きしない）
- **freeze / thaw (ref-counted)**:
  - Session A で freeze → Session B で freeze → Session A で thaw → まだ B 分が残るので LOCKED に戻らない → Session B で thaw → 初めて LOCKED 復帰
  - ref に 10 min TTL を超えた stale entry があれば自動削除（crash 耐性）
- **`guard mv`**: `phasegate guard mv src/unlocked/foo.ts src/locked-unit/foo.ts` で原子的な Unit 間移動
- **mkdir 独占**: agent が `mkdir src/newunit/` を生で試行すると `unitParentPaths` の 555 で EACCES
- snapshot の 2 回目以降の freeze で snapshot が破壊されないこと（重複 freeze 時の保護）

### リスク

- chmod 再帰時の symlink・`.git/` 除外ロジックが漏れると git 操作が詰まる
- `baseline.json` 登録ファイルは LOCKED にしない（ISSUE-007 との整合）
- snapshot が corrupt した場合のフェイルセーフ: `guard doctor --heal` で強制リセット（644/755 に戻す + 警告表示）
- **`unitParentPaths` が既存 PJ の structure と衝突する場合**: `src/` 直下にソースファイル（`src/index.ts` 等）がある PJ では 555 化が破綻する。解決: `guard.exclude[]` で対象ファイルを guard 対象外にする or `unitParentPaths` を子ディレクトリにずらす（例: `src/units/`）。retrofit-adoption.md で明記する必要あり

---

## Wave 3: hook 配線 + sentinel / AGENTS.md + git lifecycle（v0.77.0）

### スコープ

- `.claude/settings.json` / `.codex/hooks.json` 双方の SessionStart に `phasegate guard sync` 追加
- **git lifecycle hooks**:
  - `pre-checkout` / `pre-merge-commit` / `pre-rebase`: `guard freeze` で一時解除
  - `post-checkout` / `post-merge`: `guard sync` で再 lock（対象 Unit が branch 越しで変化しているため再計算）
  - `post-rewrite`（rebase/amend 後の cleanup）: `guard sync`
- sentinel ファイル `PHASEGATE_LOCKED.md` 自動配置（sync 時、LOCKED 化と同時に生成）
- `npx phasegate init` で AGENTS.md 更新（hookless agent 向けの `guard doctor` 誘導を追加）
- freeze/thaw の外的中断ガード: `pre-*` で freeze した後、`post-*` が走らずに thaw されないケースの復旧 — `phasegate guard doctor --heal` で検出

### Deliverables

- session-start-hook / stop-hook の guard 呼び出し配線
- sentinel ファイル生成ロジック（`ErrorGuidanceQueryPort` → md テンプレへの変換）
- AGENTS.md 生成 / 更新ロジック
- IT tests

### 受け入れ基準

- SessionStart 実行後、設計文書欠落 Unit dir が LOCKED 化される（実 chmod 検証）
- LOCKED dir 内に `PHASEGATE_LOCKED.md` が存在し、scaffold コマンドを含む
- `phasegate init` 後の `AGENTS.md` に hookless agent 向け注意書きがある
- **git checkout 操作自体が成功する**（LOCKED ファイルに対する checkout が EACCES で失敗しない）
- git checkout 後、新しい branch の設計文書状態に合わせて guard が再 sync される
- git merge / rebase / stash pop が LOCKED Unit を含んでいても成功する
- `pre-*` hook で freeze したが `post-*` が走らなかった場合の復旧手段がある

### リスク

- session-start が遅延すると最初の Write attempt までに chmod が間に合わない → phasegate 側で最短で発火させる
- session crash で perms が残る場合 → `phasegate guard doctor --fix` で復旧
- pre-hook で freeze した後に post-hook が走らないケース（git 操作が途中で cancel された等）→ 次回 `guard sync` 時の `perms-snapshot.json` の状態比較で自動検知、`phasegate guard doctor --heal` で復旧

---

## Wave 4: L0-002 再定義 / ADR / docs / Codex E2E + 既知の制約明記（v0.78.0）

### スコープ

- L0-002 を `perms-guard-status` に再定義（issue_description の案 B）
- L0-003 `perms-guard-drift` 追加（前回 sync 以降の外的 chmod を検知）
- 新規 ADR: `docs/ADR/ADR-014-os-layer-permission-guard.md`
- 既存 ADR-001 (L0 定義) 更新で FUSE → chmod 移行の理由を明記
- CLAUDE.md / DEVELOPMENT.md / DEVELOPMENT.ja.md 改訂（agent 非依存原則を第一原則に）
- `docs/guide/agent-compatibility.md` 新設（各 agent の対応状況）
- **`docs/guide/guard-troubleshooting.md` 新設** — 「EACCES を見たら `phasegate guard doctor`」を中核に据えたトラブルシュート集。人間 vim/VSCode ユーザー向け
- README / retrofit-adoption.md に guard troubleshooting への導線を追加
- Codex 環境で dogfood E2E 検証（実 CLI + 実 EACCES 確認）
- **既知の制約の明記**（下記 "既知の制約" セクション参照）

### Deliverables

- ADR-014 起票
- L0-002 / L0-003 定義 + composition-root 登録 + テスト
- ドキュメント改訂 diff
- Codex dogfood 検証レポート（retrofit-adoption.md 形式で会話内報告）

### 受け入れ基準

- ADR-014 に移行判断と trade-off（FUSE 撤退理由含む）が明記
- L0-002 / L0-003 validator が validator-system composition-root で登録されテストが通る
- Codex CLI から「設計文書無し Unit への Write 試行 → EACCES で block → `phasegate guard doctor` で actionable 情報」が成立する
- CLAUDE.md が「agent が何であれ OS 層の perms で一次制御される」を第一原則として記述

---

## 未決事項と推奨判断（issue_description の「設計判断が必要な未決事項」）

| # | 未決事項 | 推奨判断 | Wave |
|---|---|---|---|
| 1 | 粒度（Unit / ファイル） | **Unit 単位**（シンプルで十分） | Wave 1 |
| 2 | `unlock --ttl` 採用可否 | **初期版は不採用**（必要性顕在化で追加） | Wave 2 で保留 |
| 3 | 既存 Claude hook との棲み分け | **両立**（OS perms + hook の二重防御） | Wave 3 |
| 4 | `__tests__/` always-open | **維持**（quick-implementor と整合） | Wave 1 |
| 5 | L0-002 の扱い | **案 B: 再定義 + ADR** | Wave 4 |

追加の判断項目:

| # | 事項 | 推奨 |
|---|---|---|
| 6 | sentinel ファイル名 | **`PHASEGATE_LOCKED.md`**（lint 対象外、検索性高い） |
| 7 | AGENTS.md が既存の場合の merge | **末尾 append + マーカー `<!-- phasegate:guard-section -->`**。既存内容は保全 |
| 8 | chmod 対象外 path の設定可否 | **`phasegate.config.json` に `guard.exclude[]` を追加**（.git / node_modules / dist はデフォルト除外） |

---

## 受け入れ基準（最終状態、全 Wave 通過後）

issue_description.md の受け入れ基準を継承 + 本計画で追加:

- [ ] `scripts/harness/guard-system/` 新 Unit が CA 層構造で実装される
- [ ] `npx phasegate guard sync` で全 Unit の perms が設計文書存在状態と整合
- [ ] `npx phasegate guard status` で LOCKED/UNLOCKED 一覧と根拠を出力
- [ ] `npx phasegate guard doctor <path>` で書き込み不可の理由と scaffold コマンドを返す
- [ ] SessionStart hook (Claude / Codex 双方) で `guard sync` が自動実行
- [ ] `.git/hooks/pre-{checkout,merge-commit,rebase}` で `guard freeze`、対応する `post-*` で再 sync
- [ ] `L0-002` を `perms-guard-status` に再定義、`L0-003: perms-guard-drift` を追加
- [ ] Codex 環境で E2E 検証（EACCES で弾かれる + doctor で actionable 情報取得）
- [ ] CLAUDE.md / DEVELOPMENT.md / DEVELOPMENT.ja.md が agent 非依存原則に沿って改訂
- [ ] `.codex/hooks.json` テンプレ整備（既存 template を guard 配線で拡張）
- [ ] sentinel `PHASEGATE_LOCKED.md` が LOCKED dir に自動配置
- [ ] AGENTS.md に hookless agent 向けガイド（`guard doctor` 誘導）が追加
- [ ] ADR-014 が起票され、FUSE → chmod 移行の意思決定が明文化
- [ ] `.phasegate/perms-snapshot.json` に元 perms が保存され、UNLOCK 時に固定値でなく元値に復元される
- [ ] `docs/guide/guard-troubleshooting.md` が人間ユーザー向けの vim/VSCode トラブルシュートを網羅
- [ ] 既知の制約（下記）が `docs/guide/guard-troubleshooting.md` と README に明記

---

## 構造的制約の v1 解消（L1-L4）

当初「既知の制約」として受容予定だった 4 項目を **v1 で全て解消** する方針に変更（2026-04-22 v1.2）。

| 制約 | 解消策 | 実装 Wave | 追加コスト |
|---|---|---|---|
| L1. 並行 PhaseGate セッション | ref-counted freeze（`.phasegate/.guard-state.json`） | Wave 2 | +0.3d |
| L2. 新規 Unit 初回作成 | `unitParentPaths` を 555 化、`guard sync` が mkdir 独占 | Wave 2 | +0.5d |
| L3. Unit 境界を跨ぐ mv | `phasegate guard mv <src> <dst>` CLI | Wave 2 | +0.2d |
| L4. CI 環境 | ドキュメントと `.github/workflows/*.yml` へのステップ追加手順のみ（そもそも CI は read が主で LOCKED を踏まないケースが多数） | Wave 4 | +0.1d |

**合計追加**: +1.1d → **plan 全体 ~5d → ~6d**

v1 の哲学: "chmod の構造的限界は可能な限り OS 層で解消、OSS 配布と両立しない解法（FUSE/kext/syscall interpose）のみ明確に却下"。Trade-off は L2 の `unitParentPaths` による project structure 制約（`src/` 直下にソースファイルを置く PJ は retrofit-adoption.md の手順で対応）。

---

## 関連 issue / 依存

- **ISSUE-007（retrofit 導入障壁）**: 完了済み（v0.74.0）。本 issue は「retrofit 済み PJ の防御機構を agent 非依存にする」という独立スコープ
- **ISSUE-008（メタデータ emit 欠落）**: `templates/` ディレクトリ整備は完了済み。Wave 3 の sentinel 生成でテンプレート化の足回りを再利用
- **ISSUE-013（Codex 対応）**: integration レベルは完了、本 issue は防御レベルの補完
- **ISSUE-010（@story-id 103 件）**: 独立進行可能。本 issue と平行で着手可

---

## 変更履歴

| 日付 | 変更 |
|---|---|
| 2026-04-22 | 初版。ISSUE-007 Wave 9 完遂を受けて作成。4 Wave 構成で ~4d 見積 |
| 2026-04-22 (v1.1) | git 操作衝突 / 元 perms 保存 / 人間エディタ UX / 既知の制約 4 件（並行セッション / 新規 Unit 初回 / Unit 境界 mv / CI） を追加。工数 ~4d → **~5d** に改訂 |
| 2026-04-22 (v1.2) | 構造的制約 L1-L4 を v1 スコープに吸収（既知制約として受容 → 全解消）。Wave 2 に ref-counted freeze / `unitParentPaths` mkdir 独占 / `guard mv` CLI を追加。工数 ~5d → **~6d** に改訂 |
