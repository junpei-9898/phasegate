# TDD実装計画: WI-385 Grok Build / Antigravity

<!-- @work-item-id WI-385 -->

## 1. スコープ

対象は Grok Build と Google Antigravity CLI の編集前 write intent を既存 PreToolUse pipeline に接続し、
install / init / setup / reconcile / doctor / docs を追従させる cross-cutting story である。

変更 Unit は agent-integration、installation、harness-api。DB / network / UI / BFF / Quick Mode domain / validator
registry は変更しない。新規 CLI endpoint はなく、既存 `hook pre-tool-use` と lifecycle command の入力 enum を拡張する。

## 2. 前提条件検証

- `implementation-readiness-checker` 初回実行日時: 2026-08-08 05:14 JST
- 初回判定: ⛔ WI-385 inception 必須成果物が未作成
- product 側: 3 Unit の logical / domain / unit test / IT test / coverage report は全件存在
- 推奨成果物: 3 Unit の unit / IT test logic は全件存在
- environment contract: `docs/product/environment_contract.md` 存在、DB migration / 常駐 service 不要
- Phase 1 反映後判定: ⚠️ 実装準備完了（必須成果物は全件存在、推奨
  `scenario_test_logic.md` のみ未作成）
- 推奨 `scenario_test_logic.md`: 未作成。詳細 process fixture と期待値は IT / scenario test design に記載済み
- 実装開始判定: 本 Phase 1 の人間承認までは開始不可

## 3. API / contract

| Surface | 変更 |
|---|---|
| `phasegate hook pre-tool-use` | 3 payload shapes、shape-derived deny renderer |
| install / init / setup:agent / doctor `--agent` | grok / antigravity / all。both は不変 |
| install / reconcile / uninstall | Antigravity named hook JSON ownership |
| doctor human / JSON | trust / CLI-only notice と structural findings |
| agent-integration internal DTO | normalized request + response profile。agent identity なし |

## 4. TDD 実装順序

### Step 1: payload normalizer RED → GREEN → REFACTOR

1. 3 runtime 形状の real payload fixture と ambiguous / unknown fixture を追加する。
2. presentation normalizer と application canonical DTO を追加する。
3. tool vocabulary / args candidate mapping を pure helper として実装する。
4. agent / model field が結果に影響しないことを固定する。

### Step 2: target extraction integration RED → GREEN → REFACTOR

1. Grok command / search_replace / write / patch の unit test を追加する。
2. Antigravity write / replace / multi replace / command の candidate test を追加する。
3. WI-384 patch extractor と既存 Bash extractor を再利用して targetChanges へ合流する。
4. truncated / extraction impossible を fail-closed にする。

### Step 3: response renderer と process deny RED → GREEN

1. profile ごとの stdout / stderr / exit exact test を追加する。
2. existing block reason を renderer へ渡し、flat camel は top-level + hookSpecificOutput、nested は top-level only とする。
3. allow は全 profile で stdout empty / exit 0 を維持する。
4. Claude / Codex process regression を同じ temp project fixture で実行する。

### Step 4: installation domain / application RED → GREEN → REFACTOR

1. `AgentTarget` selection の both / all / single target test を追加する。
2. Antigravity named hook JSON merge / reconcile / uninstall の ownership test を追加する。
3. `.claude` matcher coverage / timeout と `.agents` template を lifecycle target に接続する。
4. user-owned JSON と manifest / idempotency / backup の既存保証を維持する。

### Step 5: harness-api CLI wiring RED → GREEN

1. root help / subcommand help / invalid enum / default snapshot test を更新する。
2. install / init / setup:agent / doctor parse を共通 target contract に追従させる。
3. `both` の target snapshot が不変、`all` が重複 Grok hook を作らないことを証明する。

### Step 6: doctor / notices RED → GREEN → REFACTOR

1. Grok matcher / timeout、Antigravity schema / matcher / timeout check を追加する。
2. doctor scope matrix を claude / codex / both / grok / antigravity / all で固定する。
3. Grok trust と Antigravity CLI-only notice を human / JSON の双方へ加える。
4. repair mode の mechanical / ai-assisted / manual 分岐を既存方針に合わせる。

### Step 7: docs / integrity / release

1. README / README.ja と integration guide / CLI reference / coverage matrix を実装済み事実へ更新する。
2. Antigravity の verified / unverified schema と IDE / desktop 制約、L2 backstop を明記する。
3. template 変更と同じ commit で正規 `phasegate integrity:pin` command を実行し verify する。
4. 1 commit = 1 version とし feature version を 1 回だけ更新する。hook bypass は使わない。

## 5. Test pyramid

| Level | 対象 | 証明 |
|---|---|---|
| Unit | shape detector、mapper、response renderer、AgentTarget、named JSON、doctor check | pure behavior、domain mock なし |
| Integration | real stdin process、install/reconcile/doctor、CLI enum、template | stdout/stderr/exit、filesystem、idempotency |
| Scenario | Grok trust、Antigravity CLI deny、upgrade / backstop | operator workflow と手動境界 |

全テストは Vitest、semantic AAA、日本語かつ重複しない `it()` 名、`actual` 変数、domain mock 禁止、
`@work-item-id WI-385` に従う。実装前に重複 test 名を検索し、新規 WCR-005 obligation を作らない。

## 6. 環境検証チェックリスト（Phase 1）

- [x] repository: `main` / HEAD `0dc7902c` / tag `v0.336.0`
- [x] Node.js: `v24.13.0`
- [x] package manager: `corepack pnpm 10.30.1`
- [x] required rules / ADR-006 / WI-384 / current implementation を確認
- [x] 3 Unit の product readiness files と environment contract を確認
- [x] L2 validation: 8 / 8 validator が overall pass、error 0。既存 legacy / adopted-legacy warning 580
- [x] harness readiness: `phasegate:check-ready --json` が pass（1 check / warning 0）
- [x] product reflection annotation: 3 Unit × 4 category と integration contract に WI-385 を確認
- [ ] `work-items:status --dry-run --id WI-385`: 60 秒超 stdout なしで終了せず中断。Phase 2 前に再検証
- [ ] Phase 2 開始前に user が本計画を承認
- [ ] Phase 2 は対象 Unit ごとに Full Mode session を開始・終了する
- [ ] Grok / Antigravity 実機 smoke はユーザー環境で実行する

## 7. Phase 2 変更予定（今回は変更禁止）

- `scripts/harness/agent-integration/` の pre-tool presentation normalizer / renderer / DTO と関連 tests
- `scripts/harness/installation/` の target selection / named JSON lifecycle / doctor checks / formatter と tests
- `scripts/harness/main.ts` の enum / help / dispatch wiring と harness-api tests
- `.claude/settings.json`, `templates/.claude/settings.json`, `templates/.agents/hooks.json`
- `phasegate.integrity.json`
- README.md / README.ja.md / docs/guide の Grok・Antigravity・CLI 文書
- package version / changelog（release workflow が要求する範囲）

## 8. リスク / 未検証事項

- Grok `write` tool input の canonical path key は実機未検証。
- Antigravity toolCall.args の正確な key、exit code 単独の意味、hook failure semantics は未文書化。
- Antigravity IDE v2.1.1 / desktop v2.5.0 の PreToolUse は未発火報告があり、Google の回答待ち。
- Grok project hook は trust 前に silent skip され、Phasegate は trust store を観測できない。
- Grok toolInput は 128 KiB で切り詰められ、patch / command の target 完全性が失われうる。
- `.claude/settings.json` を Grok と共有するため、phasegate 以外の user-owned Claude hook の Grok 挙動は
  Phasegate が保証しない。managed entry のみ doctor 対象とする。
- runtime timeout / crash 時の gap をローカル hook だけで閉じず、L2 pre-commit / CI backstop を維持する。
- self-repo の `work-items:status --id WI-385` が Phase 1 検証中に hang した。metadata / L2 / check-ready は
  pass しているが、derived status は Phase 2 前に再実行し、再現時は status 導出器の既存問題として切り分ける。

## 9. QA / 承認

未解決の設計質問はない。未検証 runtime schema は防御的 candidate + fail-closed + docs の検証状態で扱う。
Phase 2 開始承認だけを人間へ求め、今回はここで停止する。
