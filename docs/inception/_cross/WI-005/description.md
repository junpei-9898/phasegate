---
id: WI-005
type: issue
severity: normal
status: tested
legacy_id: ISSUE-005
affects: [harness-api（pre-commit, check-phase, detect-drift）, ci-governance（generate-template）, validator-system（layer filter, L4-001）, regression-suite（agent-guard）]
---

# ISSUE-005: 他PJ全機能検証で見つかった CLI / validator / regression の7件の不具合

## ステータス

- **状態**: ✅ **CLOSED** — Phase A〜D 全着地（2026-04-18）
- **起票日**: 2026-04-18
- **完了日**: 2026-04-18
- **リリース**: v0.40.0（Phase A） / v0.41.0（Phase B-1） / v0.42.0（Phase B-2） / v0.43.0（Phase C） / v0.44.0（Phase D）
- **発見契機**: phasegate v0.39.0 を他PJ（git履歴なしの fresh repo）に導入し、CLI全サブコマンド・15カテゴリの機能を網羅的に検証してもらった結果の FB
- **影響Unit**: harness-api（pre-commit, check-phase, detect-drift）, ci-governance（generate-template）, validator-system（layer filter, L4-001）, regression-suite（agent-guard）
- **深刻度**: P0（1件） / P1（3件） / P2（3件）の混在
- **優先度**: P0-1 の `pre-commit` クラッシュが `--with-husky` ユーザーを全員ブロックするため最優先

### 解決サマリ

| 項目 | 内容 | 着地バージョン | コミット |
|------|------|---------------|---------|
| P0-1 | `pre-commit` モジュール不在クラッシュ | v0.40.0 | `0a4358d` |
| P0-2 | `ci:generate-template --type` UX改善 | v0.40.0 | `0a4358d` |
| P1-3 | fresh repo での git 履歴 fallback | v0.41.0 | `4177aa3` |
| P1-4 | `validate --layer` フィルタ実装 | v0.41.0 | `4177aa3` |
| P1-5 | `detect-drift` と L4-001 の統合 | v0.42.0 | `f6c2102` |
| P2-6 | `check-phase` 引数パース修正 | v0.43.0 | `3bd9e9c` |
| P2-7 | regression 成果物の出力先変更 | v0.43.0 | `3bd9e9c` |
| P3-8 | L4-001 メタ見出しスキップ | v0.44.0 | `d00c1c9` |
| P3-9 | L4-001 Unit 推定ロジック改善 | v0.44.0 | `d00c1c9` |
| P3-10 | `render-errors` / `list-errors` 境界ドキュメント | v0.44.0 | `d00c1c9` |

検証コード上の spot check:
- `scripts/harness/core/` は廃止済み（P0-1 broken import の残存なし）
- `scripts/harness/validator-system/application/use-cases/run-full-validation-usecase.ts:35` で `targetLayers` 絞り込みが実装済み（P1-4）

## 問題の概要

ISSUE-004 で他PJ導入時のセットアップ問題は解消された（v0.32〜v0.37）。今回その続きとして、導入済みのクリーン環境で **CLI が提供する15カテゴリの機能全体** を試してもらった結果、ブロッキングな不具合1件・機能バグ3件・UX課題3件が検出された。

検証者からの定量評価:
- ✅ 正常動作確認: 15項目（L0-L4 validator統合、pointer-validator、freshness-checker、ADR、impact-analysis、complete-check、regression全スイート、status、hook ブロック）
- ❌ 要修正: 7件（本issueの対象）

## 確認された問題（severity 順）

### P0-1. `npx phasegate pre-commit` がモジュール不在でクラッシュ

**影響**: `init --with-husky` で配置された `.husky/pre-commit` が実行時に必ず落ちる。pre-commit 防御が事実上存在しない状態。

**再現**:
```bash
$ npx phasegate pre-commit
Fatal: Cannot find module '.../phasegate/scripts/harness/core/config-loader.js'
imported from '.../phasegate/scripts/harness/integrations/pre-commit.ts'
```

**根本原因**: `scripts/harness/integrations/pre-commit.ts:13-16` が存在しないモジュールを import している。

```typescript
import { loadConfig, isHarnessEnabled } from "../core/config-loader.js";
import { isExcludedPath } from "../core/metadata-parser.js";
import { createError, formatForHuman } from "../core/error-reporter.js";
```

実際には `scripts/harness/core/` ディレクトリ自体が存在せず、`loadConfig` / `isHarnessEnabled` / `isExcludedPath` / `formatForHuman` / `createError` のシンボルも harness 内のどこにも export されていない（grep 検証済み）。CA 再編時に `core/` を廃止した際、pre-commit.ts だけが追従漏れになったと推測される。

**修正案**:
1. `pre-commit.ts` を現行の CA 構造（`harness-api` / `validator-system` の composition root）を使う実装に書き直し
2. もしくは既存の `ci-check` や `phasegate:complete-check` UseCase に pre-commit モードを薄く足してラップする
3. TDD で統合テスト（`.husky/pre-commit` 相当の起動シナリオ）を追加し、以後の再発を防ぐ

**関連コード**:
- `scripts/harness/integrations/pre-commit.ts:12-16` — 破綻した import
- `bin/phasegate` / `scripts/harness/main.ts` — `pre-commit` サブコマンドの dispatch 経路

---

### P0-2. `ci:generate-template --type` の有効値が発見不可能

**影響**: CLI ヘルプ・README・エラーメッセージのいずれも有効値を示さず、ユーザーが実行する手段が実質ゼロ。CI 統合の入口機能が使えない。

**再現**:
```bash
$ npx phasegate ci:generate-template --preset standard --type github-actions
❌ [CI_TEMPLATE_INVALID_TYPE] INV-1: Invalid templateType: github-actions

# 試した全ての値が INVALID_TYPE:
#   github-actions / github / githubactions / gitlab / gitlab-ci
#   circleci / circle / jenkins / travis
```

**根本原因**: 2つの問題が複合している。

1. **ヘルプが有効値を示さない**: `scripts/harness/main.ts:88` のヘルプは `--type <type>` とだけ書かれている
2. **`--type` は CI プラットフォーム名ではなく「テンプレート種別」**: 実際の有効値は `'aidlc-gate'` / `'consistency-check'` / `'pre-commit'` の3種（`scripts/harness/ci-governance/domain/aggregates/ci-template.ts:31-33`）。利用者は自然に CI プラットフォーム名（github-actions 等）を入れてしまうため、発見可能性がゼロ

さらに `--help` を渡すと `Preset not found: default` で落ちて help すら見られない（positional として解釈される副作用）。

**修正案**:
1. `main.ts:88` のヘルプを `--type <aidlc-gate|consistency-check|pre-commit>` に変更
2. `INVALID_TYPE` エラーメッセージに有効値リストを含める（ci-template.ts:31-33 のメッセージは既に有効値を明示しているが、usecase 側 `generate-ci-template-usecase.ts:29` のメッセージは `Invalid templateType: X` しか出さない → こちらも統一）
3. `--type` が未指定 or `--help` の時に有効値リストを表示する専用ブランチを追加
4. （任意）ci プラットフォーム名を誤って渡した時は「github-actions は無効な値です。`--type` は生成するテンプレートの **用途** を指定します」といった誤解解消メッセージを追加

**関連コード**:
- `scripts/harness/main.ts:88, 762-772`
- `scripts/harness/ci-governance/domain/aggregates/ci-template.ts:28-38`
- `scripts/harness/ci-governance/application/usecases/generate-ci-template-usecase.ts:20-33`

---

### P1-3. `ci-check --quick` / `p2:check-freshness` が git 履歴必須で fresh repo で fatal

**影響**: initial commit 前のPJで機能しない。phasegate を最初に導入するタイミングがまさに fresh repo なので、初回UXが悪い。

**再現**:
```bash
$ npx phasegate ci-check --quick
fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.
EXIT=2

$ npx phasegate p2:check-freshness --dry-run
# stderr に 34回:
# fatal: your current branch 'main' does not have any commits yet
# （最終結果自体は OK を返すが noise が激しい）
```

**根本原因**: git log / git diff HEAD をエラーハンドリングなしで呼んでいる箇所が複数ある。

**修正案**:
1. `git rev-parse --verify HEAD` などで事前に HEAD 有無をチェックし、無ければ以下に分岐:
   - `ci-check --quick`: 「初回コミット前のため、全ファイルを staged とみなしてチェック」するか、明示的エラーで exit 0（pre-commit 目的なら差分なしは skip が妥当）
   - `p2:check-freshness`: mtime ベースなので git なしでも動くはず。git diff の失敗は swallow する
2. エラーメッセージを「初回コミット前のリポジトリでは `--quick` は使用できません。`git commit -m 'initial'` 後に再実行してください」に差し替え

**関連コード**: `ci-check --quick` は `scripts/harness/quick-mode/` 配下、`p2:check-freshness` は `scripts/harness/phase2-extensions/` 配下の git 呼び出し箇所（要 grep）

---

### P1-4. `validate --layer <L2|L3|L4>` がフィルタされない

**影響**: レイヤー別実行が実現できていない。ユーザーが「L3 だけ走らせたい」と思っても L0 以外は全部同じ10 validators が走る。ヘルプとの期待ズレ。

**再現**:
- `validate --layer L0` → 1 validator（正しく絞られる）
- `validate --layer L2` → 10 validators
- `validate --layer L3` → 10 validators
- `validate --layer L4` → 10 validators
- `validate --layer all` → 10 validators

**根本原因**: `scripts/harness/validator-system/presentation/handlers/run-validators-handler.ts:45-111` は L0 と L1 のみ special-case で別 UseCase を呼び、L2/L3/L4/all/undefined は全て `runFullValidationUseCase.execute()` に落ちる。しかも `RunFullValidationUseCaseInput` には layer フィルタのフィールドが無い（`execute({ targetPaths, unitName, currentPhase, includeL4, failOnWarning })` のみ）。つまり **L2 と L3 を分ける機構が設計段階で欠落している**。

**修正案**:
1. `RunFullValidationUseCase` に `targetLayers: ('L2'|'L3'|'L4')[]` 入力を追加、指定レイヤーのみ実行
2. handler 側で `args.layer` を `targetLayers` にマップ（`L2` → `['L2']`、`all` → `['L2','L3','L4']` 等）
3. `includeL4` フラグは `targetLayers` に統合し deprecate
4. ドキュメント側の整合も確認（`validate --layer` の挙動説明）

**関連コード**:
- `scripts/harness/validator-system/presentation/handlers/run-validators-handler.ts:43-136`
- `scripts/harness/validator-system/application/use-cases/run-full-validation-usecase.ts`

---

### P1-5. `phasegate:detect-drift` と `validate --layer all`（L4-001）の判定が食い違う

**影響**: 同一リポジトリで「design↔code 乖離検出」を名乗る2つの機能が**逆の結果**を返す。ユーザーがどちらを信じるべきか分からない。

**再現**:
```bash
$ npx phasegate validate --layer all
# → L4-001 FAIL、103件の drift

$ npx phasegate phasegate:detect-drift --json
# → { "drifts": [], "totalCount": 0 }
```

**根本原因（推測）**: 両者が異なる検出アルゴリズム／検出対象を使っている。

- `L4-001` (`validator-system` 内) — 設計文書の見出しを全てコードの実装対象として扱い、対応する実装がない見出しを drift として報告（※ P2-8 の「見出し誤検出」問題も抱える）
- `phasegate:detect-drift` (`harness-api` 内) — 別の検出器で、検出条件がより保守的かも

**修正案**:
1. 両者の検出アルゴリズムを横並びでドキュメント化（どちらが何を見ているか）
2. 片方を他方の thin wrapper にするか、`phasegate:detect-drift` を `validate --layer L4` の alias にするのが本筋
3. 少なくとも両コマンドのヘルプに「類似機能との違い」を明記

**関連コード**:
- `scripts/harness/validator-system/` の L4-001 実装
- `scripts/harness/harness-api/` の `detect-drift` 実装（要 grep）

---

### P2-6. `phasegate:check-phase` の引数パースが `--json` / `--help` を positional として食う

**影響**: help が見られない。`--json` 付き呼び出しが `{"unitId":"--json"}` として処理される。

**再現**:
```bash
$ npx phasegate phasegate:check-phase --json
# → "unitId":"--json" として扱われる
```

**根本原因**: `phasegate:check-phase` の dispatch が `parsePositionalArgs` でフラグ除外指定を正しく行っていない、または positional を先に parse してから `--json` を `hasFlag` で拾っているが positional 解析がフラグ文字列を排除していない。

**修正案**:
1. `--json` `--help` `--unit` をフラグ除外リストに追加して positional から除く
2. `--help` 単独実行で使い方（unit ID の書式、省略時の挙動）を表示する専用ブランチを追加

**関連コード**: `scripts/harness/main.ts` の `phasegate:check-phase` case（要 grep で特定）

---

### P2-7. `regression:run-agent-guard` がリポジトリルートに成果物を書き出す

**影響**: 実行のたびに `agent-independence-result.json` がリポジトリ直下に生成される。`.gitignore` 対象外なので、何も知らないと `git status` に dirty が出続け、誤って commit する。

**再現**:
```bash
$ npx phasegate regression:run-agent-guard
# → 3/3 passed (正常)
$ ls -la agent-independence-result.json  # ← リポジトリ直下に生成される
```

**修正案**:
1. 出力先を `reports/regression/` 配下に移動（`phasegate.config.json` の `reporting.outputDir` を尊重）
2. デフォルト `.gitignore` テンプレート（`phasegate init` で配置）に `reports/` と `*-result.json` を追加
3. `--output` フラグで出力先をオーバーライドできるようにする

**関連コード**: `scripts/harness/regression-suite/` 配下の agent-guard ハンドラ

---

### 観察事項（本 ISSUE のスコープ外、将来対応検討）

#### P3-8. L4-001 の誤検出ノイズ（見出し全部を実装対象と解釈）

L4-001 は設計文書の **全ての見出し** を「コードに実装されるべき」と判定してしまう。`engineering-perspective 自己評価` のようなメタ見出しや議論用セクションまで drift として報告され、ノイズが多い。

検証者コメント:
> L4-001 は見出しを全て「コードに実装してください」と言ってくるので、engineering-perspective 自己評価 みたいなメタ見出しや議論用セクションまで実装対象として誤検出する。ノイズが多い。

**対応方針（案）**:
- 見出しに frontmatter 相当の `<!-- @drift-check: skip -->` マーカーを許容
- あるいは「実装対象」と明示するマーカー（`## @impl`）でホワイトリスト方式に反転

#### P3-9. L4-001 の `unit: unknown` 表示が多すぎる

報告行に `unit: unknown` が多数出て、drift を特定の Unit に紐づけられない。対応すべき Unit が分からないので修正着手できない。

**対応方針（案）**:
- 設計文書のパス（`docs/product/construction/<unit>/...`）から Unit を推定するフォールバック実装
- それでも unknown になる場合は「どのパターンで拾えなかったか」の hint を表示

#### P3-10. `render-errors` はランタイム蓄積がないと diff 比較できない

検証者コメント:
> render-errors は runtime エラー履歴しか出さないため、テストデータなしでは差分を比較できない。list-errors --format json で定義を引く方が比較に向いている。

→ `render-errors` と `list-errors` の機能境界をドキュメントで明確化すべき。

## 検証手順

1. 空プロジェクトで `npm install --save-dev phasegate@0.39.0`
2. `npx phasegate init --with-husky`
3. 以下を実行し、FB通りの症状を確認:
   ```bash
   npx phasegate pre-commit                                   # P0-1: Fatal
   npx phasegate ci:generate-template --type github-actions   # P0-2: INVALID_TYPE
   npx phasegate ci:generate-template --help                  # P0-2: Preset not found: default
   git init && npx phasegate ci-check --quick                 # P1-3: fatal ambiguous HEAD
   npx phasegate validate --layer L3                          # P1-4: 10 validators 実行（1でない）
   npx phasegate validate --layer all && npx phasegate phasegate:detect-drift --json  # P1-5: 結果食い違い
   npx phasegate phasegate:check-phase --json                 # P2-6: unitId=--json
   npx phasegate regression:run-agent-guard && ls agent-independence-result.json  # P2-7: ルートに生成
   ```

## 対処方針（提案）

### Phase A — P0 緊急修正（v0.40.0）

1. **P0-1**: `pre-commit.ts` を現行 CA 構造で書き直し。`__tests__/integration/` に husky 起動相当の統合テストを追加
2. **P0-2**: `--type` の有効値をヘルプ・エラーメッセージに明示。`--help` が正しく help を返すように引数パースを修正
3. v0.40.0 リリース

### Phase B — P1 バグ修正（v0.41.0〜v0.42.0）

4. **P1-3**: fresh repo での git 依存の fallback を全箇所に実装
5. **P1-4**: `RunFullValidationUseCase` に `targetLayers` 入力を追加、layer フィルタを実装
6. **P1-5**: `phasegate:detect-drift` と `L4-001` の検出アルゴリズムを統一（片方を他方の alias にする方針を推奨）

### Phase C — P2 UX改善（v0.43.0）

7. **P2-6**: `phasegate:check-phase` の引数パースをフラグ除外付きに修正、`--help` ブランチ追加
8. **P2-7**: regression 成果物の出力先を `reports/` 配下に変更、`.gitignore` テンプレを整備

### Phase D — P3 ノイズ削減（v0.44.0以降）

9. **P3-8**: L4-001 にメタ見出しスキップ機構を導入
10. **P3-9**: L4-001 の Unit 推定ロジックを改善
11. **P3-10**: `render-errors` と `list-errors` の機能境界をドキュメント化

## 関連

- ISSUE-004 — 他PJ導入セットアップ問題（前提）。P0-1 の `pre-commit` クラッシュは ISSUE-004 Phase B で `npx phasegate pre-commit` CLI 化した際の動作確認漏れの可能性が高い
- `scripts/harness/integrations/pre-commit.ts` — P0-1 修正対象
- `scripts/harness/ci-governance/` — P0-2 修正対象
- `scripts/harness/validator-system/` — P1-4, P1-5, P3-8, P3-9 修正対象
- `scripts/harness/regression-suite/` — P2-7 修正対象

## 検証者クレジット

本 ISSUE は外部PJの検証者による15カテゴリ網羅検証に基づく。特に:
- 「✅ 正常動作」15項目の同時確認により **多くの機能が正しく動いていること** の裏付けが得られた点
- 「❌ 要修正」7項目で **優先度付き指摘** をいただいた点

が特に価値が高かった。今後も同種の全カテゴリ検証を定期的に（リリース毎／四半期毎に）実施する運用を検討したい。
