# ISSUE-009: agent 非依存の書き込み権限ガード機構が未実装で、Codex 等の他 agent 配下でフェーズゲートが機能しない

> **⚠️ ステータス: DEFERRED（2026-04-23）** — Orchestration Engine（`docs/product/orchestration_product_overview.md`）の session-manager / worktree / `.session.lock` 契約が確定するまで実装を保留。下記「保留判断」セクション参照。
>
> **実装計画（策定済み・保留中）**: [implementation_plan.md](./implementation_plan.md)（2026-04-22 策定 / v1.2 / Claude + Codex スコープ / chmod 2 層防御 / Wave 0-4 / ~6d）

## 保留判断（2026-04-23）

### 背景

20 並列 agent 時代を想定した堅牢性要件を議論する中で、責務境界の誤りが判明した。

### 責務境界の再整理

| 観点 | Orchestration Engine（別パッケージ） | Quality Harness（guard-system） |
|---|---|---|
| 誰がいつどこで動かすか（worktree / session lifecycle） | ✅ | — |
| 並列 session のシリアル化（`.session.lock`） | ✅（§7.1 で宣言済） | — |
| クラッシュフォレンジック復元 | ✅ | — |
| 何を書けるか（OS 層 chmod） | — | ✅ |
| freeze/unfreeze（単一 session 内） | — | ✅ |
| atomic state I/O（単一 session の crash 耐性） | — | ✅ |

`docs/product/orchestration_product_overview.md` §7.1 で「`.session.lock` が 1 worktree につき 1 session をシリアル化する」ことが既に宣言されている。つまり **「同一 worktree 内で guard-system が他 session と競合する」ケースは orchestration が防ぐべき越境事象** であり、guard-system 側で ref-counted freeze / cross-process mutex（flock） / stale ref cleanup を重複実装するのは責務越境になる。

### 保留理由

1. **Orchestration Engine が未実装**（`orchestration_product_overview.md` L6: "Inception — 設計確定待ち"）。依存する契約が確定していない状態で guard-system を先行実装すると、後の契約変更で再設計が発生する可能性が高い
2. **現状の単一 agent（Claude Code）環境では既存 hook 機構で機能**しており、緊急性は P1 → P2 相当に低下。Codex で運用するメンテナが現れるまでは紳士協定で十分
3. **20 並列 agent の運用が現実化していない**。想定需要が確定してから orchestration → guard の順序で積む方が設計ブレが少ない

### 再開条件

以下のいずれかが満たされた時点で再評価:

- Orchestration Engine Phase 1（session-manager + `.session.lock` + worktree 契約）が実装完了し、guard-system から依存できる状態になった
- Codex / 他 agent で PhaseGate を運用したいという具体的なユーザー要求が発生した
- 単一 worktree 内で複数 agent が並列動作する運用パターンが顕在化した

### 再開時の手順

1. Orchestration Engine の session lock 契約（ファイルパス・取得/解放 API・crash detection 方式）を確認
2. implementation_plan.md v1.2 から orchestration 委譲部分（L1 ref-counted freeze / P2 flock / P3 sync debounce / P4 stale ref cleanup）を削除して v2.0 に改訂
3. 見積もりを v1.2 の 6d → 単一 session 前提の ~3d に圧縮して再提示
4. 本「ステータス: DEFERRED」セクションを「再開日: YYYY-MM-DD」に更新

---

## ステータス（起票時の記録・参考）

- **起票日**: 2026-04-19
- **実装計画策定日**: 2026-04-22（ISSUE-007 完遂直後、chmod ベース OS 層ガード方針で確定）
- **保留決定日**: 2026-04-23（Orchestration Engine との責務境界見直し）
- **発見契機**: メンテナから「codex CLI の hooks でも phasegate のフェーズゲートを効かせたい」要求。調査の結果、Codex hooks は experimental で `PreToolUse`/`PostToolUse` が **Bash 限定**（Write/Edit/MCP 等の非シェルツールは intercept 不可）であることが OpenAI 公式 docs で明記されており、現行 PhaseGate の防御は Claude Code 固有の `PreToolUse on Write/Edit` に依存しているため、Codex 配下では主要防御（設計文書未整備 Unit への書き込みブロック）が成立しないことが判明。
- **影響Unit**: agent_integration（`HandlePreToolUseUseCase` が Claude 固有 hook に結合）, validator_system（`L0-002: fuse-mount-status` が未実装スロットとして予約されたまま放置）, 新規 Unit: `guard-system`（本 issue で提案）
- **深刻度**: ~~P1~~ → **P2 に降格**（2026-04-23 時点。単一 agent 前提で現状は機能しているため）
- **優先度**: **保留**（Orchestration Engine Phase 1 完了後に再評価）

## 問題の概要

PhaseGate は CLAUDE.md で「AI 非依存の品質防御ツールキット」「5 層防御モデル（L0-L4）」を標榜しているが、実際には **ほぼ Claude Code 固有の hook 機構に依存** しており、以下の構造的欠陥を抱える:

1. **`scripts/harness/` 配下への書き込みブロックは Claude Code の `PreToolUse on Write/Edit` に依存**。`.claude/settings.json` で登録され、`scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` が Claude 固有の JSON スキーマ（`tool_name` / `tool_input.file_path`）で動作する
2. **Codex hooks の仕様調査結果**（OpenAI 公式 docs, 2026-04-19 時点）:
   - `PreToolUse` / `PostToolUse` は **Bash にしか対応していない**
   - `Write`, `WebSearch`, `MCP` 等の非シェルツールは intercept **不可**と明記
   - `permissionDecision` / `updatedInput` は "parsed but not supported yet" で fail-open
   - つまり **Codex に「logical_design.md が無い Unit に直接コードを書け」と指示すると PhaseGate は止められない**
3. **L0 層に「FUSE フック検証」のスロット（`L0-002: fuse-mount-status`）が予約されているが、実体は未実装**。メンテナは過去に macFUSE で物理マウントによる防御を試みたが、macOS のセキュリティ制約（kext 廃止・SIP・Endpoint Security の entitlement 要件）で動作せず、スロットだけが残っている
4. **既存の Bash 迂回検知（`BashWriteTargetExtractor`, pre-tool-use-hook.ts:104）は「Claude の Write がブロックされても Bash で迂回されないように」という二次防御**として設計されており、Codex 環境では **Bash 経路しか防御手段が無い逆転現象** になる

結果として、PhaseGate の「機械的に保証する」価値提案が Claude Code 配下でのみ成立し、他 agent（Codex / Cursor / Continue 等）配下では hook 越しの紳士協定に退化する。

## 確認された問題（severity 順）

### P1-1. agent 非依存の書き込み権限制御機構が存在しない

**影響**: Codex / Cursor / Continue 等、Claude 以外の agent 配下で PhaseGate を使うと、フェーズゲートの主要防御（設計文書未整備 Unit への Write/Edit ブロック）が成立しない。Quick Mode 扱いで運用するしかなく、Full Mode（新機能追加・API 契約変更・新ドメインモデル追加）は事実上禁止になる。

**現状**（直接検証済み）:
- `.claude/settings.json:3-26` — `PreToolUse` が Write/Edit/Bash にのみ登録（Claude 固有）
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts:18-28` — 入力 JSON スキーマが Claude Code 固有（`tool_name` / `tool_input.file_path` / `tool_input.command`）
- `scripts/harness/validator-system/domain/value-objects/validator-definition.ts` — `L0-002: fuse-mount-status` がレジストリに定義されているが composition-root.ts:77 で未登録
- Codex hooks の公式仕様（https://developers.openai.com/codex/hooks）— `PreToolUse` / `PostToolUse` は Bash 限定、非シェルツール intercept 不可と明記

**根本原因**: PhaseGate の防御設計が「agent が hook 経由で行儀よく振る舞う」前提に立っており、OS レイヤでの強制機構を持たない。FUSE マウントによる物理的強制を試みたが macOS セキュリティ制約で撤退した履歴が残っている。

**修正案**: **Design-Doc-Driven Permission Guard（案G）** を新 Unit `guard-system` として実装

設計文書 `logical_design.md` + `domain_model.md` の存在と `scripts/harness/<unit>/` のファイルパーミッション（chmod）を機械的に連動させる。hook ではなく OS の権限ビットで強制するため、agent が何であろうと（Claude / Codex / 手動 / CI）EACCES で kernel が弾く。

**状態モデル**:

| 状態 | logical_design.md | domain_model.md | 対象 | perms |
|---|---|---|---|---|
| UNLOCKED | ✅ | ✅ | `scripts/harness/<unit>/**`（除 `__tests__/`） | 644/755 |
| LOCKED | ❌ or | ❌ | 同上 | 444/555 |
| ALWAYS_OPEN | — | — | `scripts/harness/<unit>/__tests__/**` | 644/755 |
| ROOT_OPEN | — | — | `scripts/harness/` 直下（main.ts 等） | 644/755 |

**アーキテクチャ**（既存 CA 層構造に沿う新 Unit）:

```
scripts/harness/guard-system/
├── domain/
│   ├── unit-guard-state.ts          (VO: UNLOCKED/LOCKED)
│   ├── perms-policy.ts              (純関数: state → perms)
│   └── unit-identifier.ts
├── application/
│   ├── ports/
│   │   ├── perms-applier-port.ts
│   │   ├── unit-discovery-port.ts
│   │   └── design-doc-query-port.ts (既存 PhaseGateQueryPort 再利用)
│   └── use-cases/
│       ├── reconcile-perms-usecase.ts
│       ├── get-guard-status-usecase.ts
│       └── unlock-unit-temp-usecase.ts (任意)
├── infrastructure/
│   ├── fs-perms-applier.ts
│   ├── fs-unit-discovery.ts
│   └── git-ignore-perms-helper.ts
└── presentation/
    ├── guard-cli.ts
    └── session-start-hook.ts
```

**reconciliation 発火点**:

| タイミング | 機構 | Claude | Codex |
|---|---|---|---|
| セッション開始 | SessionStart hook | `.claude/settings.json` | `.codex/hooks.json` |
| ユーザー入力ごと | UserPromptSubmit hook | ✅ | ✅ |
| git checkout/merge/pull 後 | `.git/hooks/post-{checkout,merge}` | ✅ | ✅ |
| 設計文書追加時 | fswatch daemon（任意） | ✅ | ✅ |
| CI 開始時 | `phasegate guard sync` を workflow に挿入 | ✅ | ✅ |
| 手動 | `npx phasegate guard sync` | ✅ | ✅ |

**CLI**:
```bash
npx phasegate guard sync              # 全 Unit を reconcile（冪等）
npx phasegate guard status            # LOCKED/UNLOCKED 一覧 + 根拠
npx phasegate guard unlock <unit> --ttl 10m  # 緊急一時解除（採用可否は判断事項）
npx phasegate guard doctor <path>     # なぜ書けないか説明
npx phasegate guard watch             # daemon mode (fswatch)
```

**chmod ポリシー**:
- LOCK: `chmod -R a-w <unit_dir>` → ファイル 444, ディレクトリ 555
- UNLOCK: `chmod -R u+w <unit_dir>` → 所有者 write 復活
- 実行ビットは保持、`__tests__/` はスキップ、シンボリックリンクは辿らない

**関連**:
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` — 既存 Claude 用 hook（維持。二重防御）
- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts` — ドメインロジック再利用元
- `scripts/harness/validator-system/` — L0-002 スロット

---

### P1-2. L0-002 スロットが予約状態で放置されており、design intent と実装が乖離

**影響**: `validator-id.ts` に `L0-002: fuse-mount-status` が定義されているが composition-root で未登録。FUSE 撤退の判断がコードに反映されておらず、将来のメンテナが「このスロットは何だったのか」を推測する必要がある。

**現状**:
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts` — `L0-002` 定義あり
- `scripts/harness/validator-system/infrastructure/composition-root.ts:77` — `L0-001` のみ登録
- テスト / ドキュメントに FUSE マウント相当の実体なし

**根本原因**: FUSE 実装を試みたが macOS セキュリティ制約で撤退した際、スロット削除 or 別機構への再定義の判断が保留された。

**修正案**: P1-1 の `guard-system` Unit 実装に伴い、以下いずれかを採る

- **案 A**: `L0-002` を削除し、新規に `L0-003: perms-guard-status` を `guard-system` Unit として追加
- **案 B**: `L0-002` を `perms-guard-status` に改名し、意味を「FUSE マウント状態」→「perms 整合状態」に再定義。追加で `L0-004: perms-guard-drift`（前回 sync 以降の外的変更検知）を追加

**案 B 推奨**: スロット番号の再利用は履歴整合性に乱れを生むが、新規番号を消費するより ADR で再定義の意思決定を明文化した方が筋が良い。

**関連**:
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts`
- `scripts/harness/validator-system/infrastructure/composition-root.ts`
- `docs/ADR/` — 再定義の意思決定記録を新規 ADR として起票

---

### P2-3. Codex hooks 用のアダプタ層が未整備

**影響**: P1-1 の `guard-system` で OS レイヤ防御を成立させても、Claude Code の既存 hook 機構（Stop hook で差分レビュー、UserPromptSubmit で policy gate 等）の価値は残る。これを Codex でも使えるようにするアダプタが無ければ、Codex 配下では guard-system 単独に防御が偏る。

**現状**:
- `.claude/settings.json` のみ存在。Codex 用の `.codex/hooks.json` 相当なし
- `scripts/harness/agent-integration/presentation/` の hook 実装が Claude Code の入力 JSON スキーマ前提

**根本原因**: agent-integration Unit の命名に反して、実装は単一 agent（Claude Code）用。

**修正案**:

1. `scripts/harness/agent-integration/presentation/codex-*.ts` を新設
2. Codex 入力 JSON → 既存 UseCase 入力へのマッピング層を追加
3. `$CLAUDE_PROJECT_DIR` / `$CLAUDE_FILE_PATHS` 等の環境変数を抽象化し、`process.cwd()` 等でフォールバック
4. Codex の `Stop` hook に git diff ベースの事後検証を実装（`decision: "block"` で継続プロンプト生成）
5. `.codex/hooks.json` のテンプレを `templates/` に配置（ISSUE-008 P2-4 と合流）

**関連**:
- `scripts/harness/agent-integration/` — Unit 全体の agent 非依存化
- ISSUE-008 P2-4 — `templates/` ディレクトリ実体化

---

### P2-4. `CLAUDE.md` の前提が agent 非依存原則と矛盾している

**影響**: CLAUDE.md:24-34 の「フェーズゲート必須ルール」は Claude Code 前提で書かれており、`story-implementor` / `quick-implementor` スキル使用を強制している。Codex 配下ではこれらのスキル自体が起動しないため、ルールが空文化する。

**現状**:
- `CLAUDE.md:24-28` — 「Write/Edit ツールがフェーズゲートでブロックされた際、Bash で迂回することは禁止」の記述。これは Claude 固有の hook ブロックを前提
- agent 非依存ルールが別途定義されていない

**根本原因**: ドキュメントが歴史的経緯で Claude 前提のまま残っている。

**修正案**: P1-1 完了後、CLAUDE.md / DEVELOPMENT.md を改訂

- 「agent が何であれ、`scripts/harness/<unit>/` への書き込みは OS レベルの perms で制御される」を第一原則として明記
- 「Claude Code 配下では追加で hook によるメッセージ表示・スキル誘導が行われる」を副次機構として位置付け
- Codex / 他 agent 利用時の運用手順を `docs/operations/` 配下に追加

**関連**:
- `CLAUDE.md` / `DEVELOPMENT.md` / `DEVELOPMENT.ja.md`

---

## 非対象（スコープ外）

- **macOS Endpoint Security API / kext ベースの実装再挑戦**: Apple からの特別 entitlement が必要で OSS 配布に向かない。撤退判断は維持。
- **DYLD_INSERT_LIBRARIES 等の syscall interpose**: SIP 制約・配布複雑性・Codex 実装言語（Rust）での成立性から採用しない。
- **Windows 対応**: 既存 PhaseGate も実質 Unix 前提。`phasegate guard` は Windows で warning 出して no-op。
- **chmod バイパス（root/sudo 実行）の防御**: 想定外。ドキュメントに warning を書くに留める。
- **agent 側の prompt engineering によるフェーズゲート遵守誘導**: 既存スキル（`story-implementor` 等）で Claude 向けには実装済。Codex 向けスキル整備は別 issue（ISSUE-008 の隣接領域）扱い。

## 受け入れ基準

- [ ] `scripts/harness/guard-system/` 新 Unit が CA 層構造で実装される（domain / application / infrastructure / presentation）
- [ ] `npx phasegate guard sync` で全 Unit の perms が設計文書存在状態と整合する
- [ ] `npx phasegate guard status` で LOCKED/UNLOCKED 一覧と根拠が出力される
- [ ] `npx phasegate guard doctor <path>` で書き込み不可の理由が親切に説明される
- [ ] SessionStart hook（Claude/Codex 双方）で `guard sync` が自動実行される
- [ ] `.git/hooks/post-{checkout,merge}` に `guard sync` が組み込まれる
- [ ] `L0-002` スロットが再定義（案 B）され、`L0-003: perms-guard-drift` が追加される
- [ ] Codex 環境で実際にフェーズゲート違反書き込みを試み、EACCES で弾かれることを E2E 検証する
- [ ] CLAUDE.md / DEVELOPMENT.md が agent 非依存原則に沿って改訂される
- [ ] `.codex/hooks.json` テンプレが `templates/` に配置される（ISSUE-008 P2-4 と合流）

## 推奨実装順

1. **Phase A（最優先 / 0.5d）**: domain 層 + application 層の純関数実装 + UT — perms policy / state 判定ロジック
2. **Phase B（1d）**: infrastructure 層 — fs-chmod walker / Unit discovery + IT
3. **Phase C（0.5d）**: presentation 層 — `phasegate guard` CLI + SessionStart hook
4. **Phase D（0.5d）**: hook 配線 — `.claude/settings.json` / `.codex/hooks.json` / git hooks
5. **Phase E（0.5d）**: L0-002 再定義 + L0-003 追加 + ADR 起票
6. **Phase F（0.5d）**: CLAUDE.md / DEVELOPMENT.md / DEVELOPMENT.ja.md 改訂
7. **Phase G（0.5d）**: Codex 環境 E2E 検証 + operations 手順書整備

**合計 ~4d**

## 設計判断が必要な未決事項

1. **粒度**: Unit 単位で十分か、ファイル単位（`@unit` アノテーション参照）まで踏み込むか → 初期版は **Unit 単位推奨**（シンプル・粒度的に十分）
2. **`unlock --ttl` の採用可否**: 緊急解除を許すか、一切認めないか → **初期版では採用しない**（穴になる。必要性が出てから追加）
3. **既存 Claude `PreToolUse` hook との棲み分け**: guard に一本化するか両立か → **両立推奨**。OS perms + hook の二重防御
4. **`__tests__/` always-open 方針**: 設計文書なし Unit のテストも書けて良いか → `quick-implementor` が test 追加 OK なので整合的。**維持**
5. **L0-002 の扱い**: 削除 or 再定義 → **案 B（再定義 + ADR）** 推奨

## 関連

- メンテナ要望（2026-04-19）「codex CLI の hooks で phasegate を動かしたい」
- Codex hooks 公式 docs: https://developers.openai.com/codex/hooks
- Claude Code hooks 公式 docs: https://docs.anthropic.com/en/docs/claude-code/hooks
- 既存 L0 FUSE 撤退履歴（メンテナ証言、2026-04-19）— macFUSE が macOS セキュリティで動作せず
- ISSUE-007（retrofit 導入障壁）と独立。本 issue は「導入後の防御を agent 非依存にする」を扱い、ISSUE-007 は「そもそも導入する障壁」を扱う
- ISSUE-008（メタデータ emit 欠落）と独立だが、`templates/` ディレクトリ整備（P2-4）で合流点あり
- `CLAUDE.md:24-34` — 現行フェーズゲート規約（本 issue で agent 非依存化の対象）
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts` — L0-002 未実装スロット
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` — Claude 固有 hook 実装（維持・並存）
