---
id: WI-217
type: issue
severity: high
status: tested
affects: [validator-system, config-foundation]
source: github#30
external_ref: https://github.com/junpei-9898/phasegate/issues/30
---

# WI-217: Personal install should validate inception/product consistency in local paths

> 起票日: 2026-05-26
> 起票経緯: GitHub Issue #30。personal install mode で `paths.inceptionDocs` / `paths.designDocs` を `.phasegate-local/**` に向けても、inception と product の対応欠落を標準 hook / CLI が検出できない。

## 問題

personal install は team-owned `docs/` を汚さず `.phasegate-local/**` で AIDLC を回すための mode だが、現状の L4 / hook / scaffold 経路には次の欠落がある。

1. `validate --layer L4` の L4-002 consistency-check が、personal inception に新規 WI があり product construction が空でも SKIP になる。
2. L4-004 doc-freshness が `paths.designDocs` を `.phasegate-local/product/construction` に設定していても、明示 scope なしではリポジトリルート `docs/**/*.md` をスキャンする。
3. `install --personal` が配置する `.git/hooks/pre-commit` は lint + L2 のみで、`.phasegate-local/inception` と `.phasegate-local/product/construction` の対応欠落を検査しない。
4. `scaffold-wi` は `docs/inception/{unit}/WI-XXX/description.md` 固定で、personal config の `paths.inceptionDocs` と PJ 固有 ID / 階層を扱えない。

このため、personal install 利用者は「inception に切った WI が product construction に反映されているか」を目視で守る必要があり、PhaseGate の中核である inception -> product の機械的ガードが personal sandbox では成立しない。

## 再現確認

2026-05-26 にローカル `0.160.20` checkout で確認した。

### 再現環境

```text
/private/tmp/phasegate-issue30-repro.ecnbFr
phasegate version: 0.160.20
setup command: /Users/jumpei/dev/PhaseGate/bin/phasegate install --personal --agent codex --apply --json
```

生成された `.phasegate-local/phasegate.config.json` は `paths.designDocs = ".phasegate-local/product/construction"`、`paths.inceptionDocs = ".phasegate-local/inception"`、`layers.L4.enabled = false`。再現のため L4 を true に変更した。

### Defect A-1: L4-002 が WI/product 欠落を検出しない

`.phasegate-local/inception/ID/ID-09/ID-09-02/description.md` を作り、`.phasegate-local/product/construction/` は空のまま実行した。

```text
$ /Users/jumpei/dev/PhaseGate/bin/phasegate validate --layer L4 --format human
=== バリデーション結果 ===
総合判定: PASS ✓
バリデータ: 6件 (合格:4 失敗:0 スキップ:2)

[PASS] L4-001 (0ms)
[SKIP] L4-002 (0ms)
[SKIP] L4-003 (0ms)
[PASS] L4-004 (0ms)
[PASS] L4-005 (0ms)
[PASS] L4-006 (0ms)
```

期待は「inception 側に `ID-09-02` があるが product construction 側に該当 `@work-item-id` 参照がない」ことを警告または失敗として返すこと。実際は L4-002 が SKIP し、L4 全体は PASS した。

### Defect A-2: L4-004 が `paths.designDocs` を scope に使わない

同じ personal config のまま、リポジトリルートに古い `docs/explanation/adr/ADR-0000-old.md` を作って mtime を 2025-01-01 にした。

```text
$ /Users/jumpei/dev/PhaseGate/bin/phasegate validate --layer L4 --format human
=== バリデーション結果 ===
総合判定: FAIL ✗
バリデータ: 6件 (合格:3 失敗:1 スキップ:2)

[PASS] L4-001 (0ms)
[SKIP] L4-002 (0ms)
[SKIP] L4-003 (0ms)
[FAIL] L4-004 (0ms)
  ⚠ docs/explanation/adr/ADR-0000-old.md is 510 days old
  → Review the document freshness threshold or update the design document.
[PASS] L4-005 (0ms)
[PASS] L4-006 (0ms)
```

`paths.designDocs` が `.phasegate-local/product/construction` を明示しているので、L4-004 の標準実行はその配下を対象にするべきだが、実際は root `docs/` 側の古い文書を見て FAIL した。

### Defect A-3: drift command は personal consistency 欠落を検出しない

```json
{"status":"pass","errors":[],"summary":{"totalChecks":1,"passed":1,"failed":0,"warnings":0},"data":{"drifts":[],"totalCount":0,"rawDriftCount":0,"sampleLimit":20,"truncated":false,"categorySummaries":[],"actionPlan":[]}}
```

`phasegate:detect-drift --json` は source metadata を前提にした drift 経路であり、personal inception/product 対応欠落の代替にはならない。

### Defect B: `scaffold-wi` が config path / ID format を無視する

同じ personal repo で `scaffold-wi ID issue` を実行した。

```text
Created /private/tmp/phasegate-issue30-repro.ecnbFr/docs/inception/ID/WI-001/description.md
```

期待は personal config の `paths.inceptionDocs` または明示オプションに従い `.phasegate-local/inception/...` へ生成できること。実際は root `docs/inception` と `WI-001` 固定のレイアウトに生成した。

## 受け入れ基準

- [ ] `validate --layer L4` の L4-002 が、`paths.inceptionDocs` と `paths.designDocs` を入力として読み、inception に存在する WI ID が product construction の `@work-item-id` に未反映なら検出する。
- [ ] L4-002 の SKIP 時は、入力不足・validator 無効・非対応 layout などの理由を human / agent / json の各形式で確認できる。
- [ ] L4-004 は明示 `paths.designDocs` がある場合、標準実行でその配下のみを freshness 対象にする。root `docs/` は fallback のみ。
- [ ] `install --personal` が配置する local pre-commit hook は `.phasegate-local/inception` または `.phasegate-local/product` の staged change に対して、inception/product 対応チェックを実行する。
- [ ] `scaffold-wi` は config の `paths.inceptionDocs` を尊重でき、少なくとも `--id <work-item-id>` と `--path-layout <layout>` 相当で `ID-09-02` のような PJ 固有 ID を生成できる。
- [ ] 既存の `WI-XXX` / `docs/inception/{unit}/{WI-XXX}` 既定挙動は後方互換として維持される。

## 非スコープ

- L4-001 / L4-003 の source metadata 前提を廃止すること。
- Jira など外部 issue tracker との同期。
- 全プロジェクト固有 ID 体系の完全な DSL 化。最初の実装は config と明示 CLI option で representative layout を扱えればよい。

## Related

- WI-085 / WI-093: `paths.designDocs` / `paths.inceptionDocs` の path root 解決。
- WI-207..WI-216: personal install の local-only artifact / agent context / skill deploy 改善。
- GitHub Issue #29: sandboxed agent からの template 到達性。personal install の fallback / package path 問題として隣接。
