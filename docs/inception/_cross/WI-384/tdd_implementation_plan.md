# TDD実装計画: WI-384 Codex native apply_patch hook

<!-- @work-item-id WI-384 -->

## 1. スコープ

対象は Codex rust-v0.124.0 以降が発火する native `apply_patch` の PreToolUse / PostToolUse を
Phasegate の既存 hook pipeline に接続する story である。

影響 Unit は `agent-integration`、`quick-mode`、`installation`。DB / network / UI / BFF / 新規 CLI
endpoint はない。agent-integration の domain parser と presentation adapter、quick-mode の application
input、installation の application check / lifecycle result と presentation formatter、config template、
公開 docs、integration / unit test を変更する。

受け入れ基準の正本は `description.md`、詳細設計は `logical_design.md` / `domain_model.md`、test case は
`unit_test_design.md` / `it_test_design.md` / `scenario_test_design.md` とする。

## 2. 前提条件検証

- `implementation-readiness-checker` 初回実行日時: 2026-08-08 02:55 JST
- 初回判定: ⛔ 新規 WI 固有の logical / domain / unit / IT / scenario / plan が未作成
- product 側確認: 3 Unit すべて logical / domain / unit test / IT test / coverage report が存在
- 推奨成果物: 3 Unit すべて unit / IT test logic が存在
- 環境契約: `docs/product/environment_contract.md` が存在
- Phase 1 反映後判定: ⚠️ 実装準備完了（必須成果物は全件存在、推奨
  `scenario_test_logic.md` のみ未作成）。`work-items:status` は 3 Unit の reflection を認識し
  `reflected` を導出した
- 実装開始判定: Phase 1 の人間承認までは開始不可

## 3. API と cross-unit contract

新規 public CLI API は追加しない。既存 command を拡張する。

| Surface | 拡張 |
|---|---|
| `phasegate hook pre-tool-use` | canonical `tool_name=apply_patch` raw patch payload |
| `phasegate hook post-tool-use` | canonical apply_patch event の既存 lint flow |
| `phasegate doctor` | stale matcher と trust/version notice |
| `phasegate install` / deprecated `init` | Codex target 配置時の trust/version notice |
| `phasegate reconcile` | matcher 更新時の re-trust notice |
| agent-integration → quick-mode | optional explicit `changeKind` in targetChanges |

## 4. TDD 実装順序

### Step 1: Agent integration domain RED → GREEN → REFACTOR

1. `ApplyPatchWriteTargetExtractor` の Update / Add / Delete / Move to / mixed / malformed boundary test を追加する。
2. existing Bash extractor regression test を先に固定する。
3. current private patch scan を新 domain service へ移し、`PatchWriteTarget` を返す。
4. Bash extractor を新 service に委譲し、path-only API と既存順序を維持する。

Domain object はモックせず実体で検証する。

### Step 2: changeKind contract RED → GREEN → REFACTOR

1. quick-mode classifier に explicit CREATE / MODIFY / DELETE 優先の test を追加する。
2. `FullModeTargetChange` と classifier input に optional `changeKind` を追加する。
3. explicit kind を第一情報源とし、既存 before/after / filesystem inference を fallback として残す。

### Step 3: PreToolUse integration RED → GREEN → REFACTOR

1. upstream の全必須 field を含む native payload fixture を追加する。
2. pre adapter で `apply_patch` raw command を parser に渡し、path と kind を構築する。
3. tool vocabulary を既存 internal Write semantics に normalize して use case へ合流させる。
4. Update / Add / Delete / Move to / mixed violation、stdout-empty allow、exit2+stderr deny を process integration で証明する。
5. command 欠落 / marker 無しは fail-closed とする。

### Step 4: PostToolUse and matcher wiring RED → GREEN

1. apply_patch PostToolUse payload が既存 lint / skip flow に入る test を追加する。
2. `.codex/hooks.json` と `templates/.codex/hooks.json` の両 matcher を `Bash|apply_patch` へ変更する。
3. root / template equivalence test を更新する。
4. template 変更と同一 commit で `corepack pnpm integrity:pin` 相当の正規 command を実行し、
   `phasegate.integrity.json` を更新する（実コマンドは package scripts / CLI help で再確認する）。

### Step 5: Doctor and lifecycle notices RED → GREEN → REFACTOR

1. Bash-only、片 event 欠落、別 entry の偽陽性、current config の doctor unit test を追加する。
2. `CodexHookMissingCheck` を event + phasegate command + canonical matcher token の構造判定へ強化する。
3. install/init/reconcile の Codex target 作成・更新 result に structured operator notice を加える。
4. doctor Codex scope に trust unverifiable advisory を加え、human / JSON 両 formatter を検証する。
5. minimum Codex version 0.124.0 と `/hooks` 再 trust を全 notice に含める。

### Step 6: Documentation and WI closure

1. `docs/guide/codex-integration.md` の setup / coverage / limitation / troubleshooting を現行 upstream 仕様へ更新する。
2. `README.md` / `README.ja.md` の Codex setup と coverage matrix を更新する。
3. WI-013 の「上流 fix 後の追従」に PR merge / release / WI-384 implementation version を記録する。
4. L2 pre-commit / CI を authoritative backstop として残し、hook trust skip の残存リスクを書く。

### Step 7: Verification

1. 対象 unit / integration tests を実行する。
2. `corepack pnpm test`、`corepack pnpm harness:check-ready`、`npx phasegate lint`、
   `npx phasegate validate --layer L2` を実行する。
3. World derive / obligation check で duplicate `it()` 名由来を含む新規 WCR-005 がないことを確認する。
4. integrity verify で template pin が一致することを確認する。
5. Codex CLI 0.144.5 実機で `/hooks` re-trust 後、native apply_patch allow / deny を smoke test する。

## 5. Test pyramid

| Level | Target | Primary proof |
|---|---|---|
| Unit | patch parser、quick-mode kind precedence、doctor structural check | pure behavior / no domain mock |
| Integration | real stdin payload、hook process exit/stdout/stderr、install/reconcile/doctor format | Unit 結線と runtime contract |
| Scenario | stale install upgrade、native pre-edit deny、mixed patch + Bash regression | operator workflow |

すべて Vitest、semantic AAA、日本語かつ重複しない `it()` 名、`actual` 変数、domain mock 禁止に従う。
テストファイルには `@work-item-id WI-384` を付ける。WCR-005 obligation を新規発生させない。

## 6. 環境検証チェックリスト（Phase 1 事前結果）

- [x] repository: `main` / HEAD `64f070c3` / tag `v0.335.0`
- [x] Node.js: `v24.13.0`
- [x] package manager: bare `pnpm` は PATH に無いが `corepack pnpm 10.30.1` が利用可能
- [x] Codex CLI: `0.144.5`（minimum `0.124.0` 以上）
- [x] database migration / external service: 本 story は不要
- [x] environment contract: 存在確認済み
- [x] metadata validation: WI / product reflection / WI-013 の更新 21 文書が PASS
- [x] harness readiness: IPC 不要の `node --import tsx ... phasegate:check-ready --json` で PASS
- [x] WI status: 正規 `work-items:status --apply --id WI-384` で `reflected` に同期
- [ ] Phase 2 開始前に user が本計画を承認
- [ ] Phase 2 は変更する Unit ごとに `session begin --mode full --unit <unit> --work-item WI-384`
  を開始し、Unit 切替時に前 session を終了する

`corepack pnpm harness:check-ready` は script 内で bare `pnpm` を再呼出しするため PATH 不在で失敗し、
`tsx` CLI は sandbox の IPC socket 作成が `EPERM` になった。いずれも同一 entrypoint を
`node --import tsx` で実行して代替検証済みであり、product / WI readiness の failure ではない。
UIUX は CLI / hook integration のため非該当、DB migration と常駐 service も非該当である。

## 7. 変更予定ファイル群

### Source / tests（Phase 2 まで変更禁止）

- `scripts/harness/agent-integration/domain/services/` の patch parser と Bash extractor
- `scripts/harness/agent-integration/domain/ports/full-mode-requirement-query-port.ts`
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts`
- `scripts/harness/agent-integration/presentation/post-tool-use-hook.ts`（必要なら metadata のみ。parser 変更なし）
- `scripts/harness/quick-mode/application/usecases/classify-change-category-usecase.ts`
- `scripts/harness/installation/application/checks/codex-hook-missing-check.ts`
- install / reconcile result と handler、doctor formatter の notice 経路
- 関連 unit / integration tests

### Config / docs（Phase 2）

- `.codex/hooks.json`
- `templates/.codex/hooks.json`
- `phasegate.integrity.json`
- `docs/guide/codex-integration.md`
- `README.md`
- `README.ja.md`
- `docs/inception/_cross/WI-013/description.md`

## 8. 前提条件・リスク

- Codex non-managed command hook は definition hash 単位で trust される。matcher update 後、再 trust まで
  runtime が hook を skip しうる。Phasegate は trust store を直接検査できない。
- local hook は fast-path で、L2 pre-commit と L3 CI backstop を撤去しない。
- raw patch から完全な before/after content を再構築しないため、Update の comments-only 判定は既存 path
  heuristic へ安全側 fallback する。
- template 変更で integrity pin obligation が発生する。pin 更新漏れは Phase 2 を未完了とする。
- output schema に notice を加える場合は加法的変更とし、既存 exit code / plan fields を壊さない。
- `permissionDecision: "ask"` は runtime が fail open、`allow` は `updatedInput` 必須なので生成しない。

## 9. QA

未解決の仕様質問はない。canonical matcher、parser reuse、DELETE forwarding、doctor criteria、trust notice
はいずれも本計画の推奨案で確定可能な範囲であり、Phase 2 開始承認だけを人間へ求める。

## 10. Phase 2 release boundary

Phase 2 は 1 commit = 1 version の規約に従い、`package.json` を minor bump して同じ version tag を付ける。
commit / tag / push は Phase 1 では行わない。hook bypass (`--no-verify`) は使用しない。

## 承認

この文書の承認後にのみ Phase 2 を開始する。今回はここで停止する。
