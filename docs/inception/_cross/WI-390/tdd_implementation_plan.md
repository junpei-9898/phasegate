# TDD実装計画: WI-390

<!-- @work-item-id WI-390 -->

## 1. スコープ

- GitHub issue #47〜#50 を一つの security / diagnostics stabilization batch として修正する。
- 対象 Unit: agent-integration、installation、quick-mode、harness-api。
- 外部 API endpoint は追加しない。CLI contract は doctor finding と Quick Mode rejection rule を加法拡張する。
- 公開版 v0.340.0 の npm / GitHub publication と registry smoke までを完了条件に含める。

## 2. 前提条件検証

- `implementation-readiness-checker` 実行日: 2026-08-10
- product logical / unit test / IT test / coverage: 4 Unit とも存在。
- product unit / IT test logic: 4 Unit とも存在。
- `docs/product/environment_contract.md`: 存在。
- WI 固有 logical / domain / unit / IT / scenario design: 本 Phase 1 で作成。
- 判定結果: 設計反映完了後に実装準備完了。Phase 2 は人間承認と Full Mode session 開始後に実行する。

## 3. TDD実装順序

### 3.1 Unit RED → GREEN → REFACTOR

| 順序 | Test | Implementation |
|---|---|---|
| 1 | Protected trust-root exclusion invariants | ProtectedFileList pattern split |
| 2 | Markdown / rejection semantics | QuickModeJudgmentEngine + unions |
| 3 | Husky runtime state / check mapping | VO / Port / application check |
| 4 | protected guidance | safe recovery messages |

### 3.2 Integration RED → GREEN → REFACTOR

| 順序 | Test | Implementation |
|---|---|---|
| 5 | config state × direct Write process tests | non-excludable config protection / ADR-038 alignment |
| 6 | temp git doctor tests | Git CLI runtime probe / composition wiring |
| 7 | CLI category tests | CATEGORY_NOT_ALLOWED / Markdown public contract |
| 8 | PostToolUse shell tests | project-wide PhaseGate lint / formatter config |

### 3.3 E2E / release

| 順序 | Test | Implementation |
|---|---|---|
| 9 | full local gates | regression fixes only |
| 10 | packed tarball smoke | package contents / integrity pin |
| 11 | registry smoke | publish v0.340.0 |

## 4. 環境検証チェックリスト

- [x] Node / pnpm dependencies installed
- [x] GitHub CLI installed and authenticated
- [x] npm registry reachable (`npm view phasegate version`)
- [x] main synchronized with origin/main at v0.339.0
- [x] required product / environment documents exist
- [ ] Full Mode session begin for WI-390（Phase 2 開始時）
- [ ] npm identity / web authentication（publish 直前）

## 5. QA

未解決の仕様質問はない。以下を設計判断として採用する。

- config direct mutation は diff 内容を信頼せず全状態で block する。
- recovery は managed command と人間の hook 外編集に限定する。
- `.md` / `.mdx` は一律 docs、instruction surface は non-excludable protected で守る。
- release version は次 minor の v0.340.0。

## 6. 前提条件・リスク

- `biome.json` は protected file のため `quick-implementor` の config change 手順で変更する。
- ADR-038 の従来「config Write fail-open」期待を反転するため、同一 commit で ADR / tests / implementation を揃える。
- npm publish は security key 認証を使い、必ず `npm publish --auth-type=web`。OTP は使用しない。
- user-owned `.phasegate/hook-skip-events.jsonl` と `docs/inception/_shared/artifact.md` は stage / commit しない。

## 7. Phase 1 completion gate

- [x] WI 固有計画・設計を作成
- [x] product 反映対象を定義
- [x] ADR 改訂方針を定義
- [ ] 人間が本計画を承認
- [ ] Phase 2 implementation（承認前は開始しない）
