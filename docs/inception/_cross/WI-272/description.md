---
id: WI-272
type: fix
severity: high
status: drafted
affects: [docs]
source: internal
---

# WI-272: 配布テンプレート deny-check.sh の git allowlist 同期

> 起票日: 2026-07-15
> 起票経緯: WI-269 監査で、`templates/.claude/scripts/deny-check.sh`（consumer リポジトリへ配布されるテンプレート）に **WI-253 の git allowlist ロジックがそもそも入っていない**ことが判明した。symbolic-ref（WI-269）/ config（WI-271）の read/write 分離以前に、git の default-deny 自体が配布先に届いていない。

## 背景

live 版（`.claude/scripts/deny-check.sh`）は WI-253 で git サブコマンドを default-deny の allowlist 化し、WI-269 / WI-271 で `symbolic-ref` / `config` の read/write 分離ガードを重ねてきた。しかしテンプレート版はこれらの変更が一切同期されておらず、`phasegate install` で配布される consumer リポジトリでは deny パターン照合（settings.json ベース）しか働かない。

diff 精査の結果、テンプレート版と live 版の差分は git allowlist スタックの欠落**のみ**（純追加 2 ハンク）で、テンプレート固有のプレースホルダや PJ 名等の意図的差分は存在しない。共有部分（debug ログ、jq パース、segment 分割）は byte-identical だった。

## 本 WI でやること

1. git allowlist 一式（`GIT_ALLOWED_SUBCOMMANDS` + `extract_git_subcommand` + `check_git_allowlist` + `check_symbolic_ref` + `check_git_config`）と `check_segment` からのガード呼び出しをテンプレートに同期し、live 版（WI-271 完了後）と byte-identical にする。
2. drift 回帰テストを追加する: `scripts/harness/__tests__/integration/setup/deny-check-template-sync.test.ts`。byte 一致（現契約）+ allowlist セクション抽出比較 + ガード呼び出し存在確認の 3 段構え。live 版だけ更新してテンプレートを置き去りにすると fail する。
3. テンプレート版に対しても hook 直接呼び出しの deny/allow マトリクス（51 ケース）を実行し、live 版と同一の判定になることを実証する。

## integrity pin 対象化の判断

**pin 対象にしない。** 根拠:

- pin 対象の選定ロジックはコード側にある: `scripts/harness/ci-governance/domain/value-objects/integrity-target.ts` の `IntegrityTarget.defaultTargets()`。include glob は `skills/*/SKILL.md` / `.claude/settings.json` / `.claude/scripts/*.sh` / `.husky/*` / `docs/templates/agent-context/**` であり、`templates/**` は含まれない。現行基準は「self-repo で実行される指示搭載ファイル」（ADR-030 §Decision.3.①）で、テンプレートは配布物であり self-repo では実行されない。
- 対象 glob の変更は `scripts/harness/` ドメイン層の変更であり、quick-implementor（type: fix）のスコープ外。必要なら別 WI（story）で ADR-030 の対象基準ごと拡張すべき。
- 代替の改竄検知として本 WI の drift テストが機能する: テンプレートは pin 対象の live 版と byte 一致を強制されるため、テンプレート単独の改竄は L2/CI テストで fail する（live 版の改竄は integrity:verify で fail する）。

## 受け入れ基準

- [x] テンプレート版が live 版と byte-identical（`cmp` で確認）。
- [x] テンプレート版 hook に対する deny/allow マトリクス 51 ケースが live 版と同一結果（ALL PASS）。
- [x] drift 回帰テスト 4 ケースが green。
- [x] `phasegate.integrity.json` は変更不要（templates/** は pin 対象外）で、`integrity:verify` が exit 0 のまま。

## 関連

- WI-253: Invert agent git permissions to an allowlist（テンプレートに届いていなかった防御）
- WI-269: `symbolic-ref` read/write 分離（監査で本欠落が判明）
- WI-271: `config` read/write 分離（同期対象の live 版最終状態）
- ADR-030: instruction-file integrity pin の対象基準
