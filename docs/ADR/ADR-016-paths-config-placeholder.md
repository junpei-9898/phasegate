# ADR-016: phase-gate validator のパス解決を `paths` config プレースホルダ化する

## Status

Accepted — 2026-05-07

## Context

`phasegate.config.json` には `paths.designDocs` / `paths.inceptionDocs` という設定が存在し、`docs/guide/configuration.md:471` には次の記述がある:

> If you move your design documents to a non-default location, update `paths` accordingly so that all validators and hooks resolve files correctly.

しかし実装では、L2-001（phase-gate validator）の経路で `paths.*` 設定が反映されず、利用者が `paths.designDocs: "mydocs/product/construction"` 等を設定しても **要求される成果物パスは `docs/inception/...` / `docs/product/...` のまま** となる。外部レポーター（GitHub Issue [#1](https://github.com/junpei-9898/phasegate/issues/1), nakataj-mti, 2026-05-07）が報告し、phasegate チームによる再検証で報告内容が正確であることを確認した（WI-085）。

### バグの実体（grep ベース、2026-05-07）

#### 1. ハードコードされたパスリテラル

`scripts/harness/phase-dependency-model/domain/definitions/standard-phase-nodes.ts` 全 18 か所の `path:` フィールドが `'docs/inception/...'` / `'docs/product/...'` 文字列リテラル。`full-phase-nodes.ts` / `minimal-phase-nodes.ts` も同様の構造。

#### 2. プレースホルダ展開の制約

`scripts/harness/phase-dependency-model/domain/values/artifact.ts:6`:

```ts
const ALLOWED_PLACEHOLDERS = new Set(['unit', 'storyId']);
```

`{designDocsRoot}` / `{inceptionDocsRoot}` のような **トップレベルパス展開は未実装**。

#### 3. `docs/` 接頭辞の強制バリデーション

`scripts/harness/phase-dependency-model/domain/values/artifact.ts:48`:

```ts
if (normalizedPath.length === 0 || !normalizedPath.startsWith('docs/')) {
  throw new InvalidArtifactPathError(args.path);
}
```

仮にユーザーが `phaseDependencies.preset: "custom"` + `gates[]` で迂回しようとしても、`mydocs/...` のような非 `docs/` 接頭辞は **Artifact 生成時点で拒否される**。

#### 4. `paths` config が `Artifact.resolve()` に到達していない

`scripts/harness/phase-dependency-model/application/services/evidence-bundle-assembler.ts:42-49` で `phaseConfigProvider` から `planningMode` のみ取得。`paths.designDocs` / `paths.inceptionDocs` は `Artifact.resolve(scope)` 呼び出しに渡されていない。`scope` 型も `{ unitId?: string; storyId?: string }` のみで、ルートパスを通す経路がない。

#### 5. 部分対応箇所との不整合

`paths.designDocs` を実際に参照している箇所は存在するが、いずれも phase-gate validator（L2-001）の経路ではない:

- `scripts/harness/harness-api/infrastructure/adapters/file-system-artifact-scanner-adapter.ts:118`（harness-api の scanner）
- `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts:60`（agent runtime hook の `unitDir` 解決）

phase-gate validator 本体（`PhaseStructure` / `EvidenceBundleAssembler` / `Artifact`）には `paths.*` が一切流入していない。同一 config に対して validator 経路ごとに挙動が乖離している状態。

### 検討した代替案

#### (A) `paths.designDocs` / `paths.inceptionDocs` でトップレベルパスを実際に置換する（**採用**）

phase-gate validator のパスリテラルを `{designDocsRoot}` / `{inceptionDocsRoot}` プレースホルダ化し、`paths` config の値で展開する。`Artifact` の `docs/` 接頭辞バリデーションはプレースホルダ展開後に実施するか撤廃する。

#### (B) ドキュメントを修正し「`paths.*` は storyReflection 専用」と明記する

`paths.designDocs` / `paths.inceptionDocs` は phase-gate ノードのパスには影響しないと documentation を改訂し、「ノードのパスを変えたい場合は `phaseDependencies.preset: "custom"` + `gates[]` で個別に上書きする」ことを推奨する。

## Decision

**(A) を採用する。** phase-gate validator のパス解決にプレースホルダ展開機構を導入し、`paths.designDocs` / `paths.inceptionDocs` 設定を反映させる。

### 採用理由

1. **ドキュメントが利用者の合理的期待を形成済み** — `docs/guide/configuration.md:471` の記述により「`paths` を変えれば全 validator / hook が解決する」ことが約束されている。実装をドキュメントに合わせる方が修正の方向性として正しい
2. **(B) は現状コードでは動作しない** — `Artifact.create()` に `docs/` 接頭辞バリデーション (artifact.ts:48) が存在するため、`gates[]` で `mydocs/...` を指定しても `InvalidArtifactPathError` で拒否される。(B) を採るには結局接頭辞バリデーションの緩和が必要で、(A) と実装コストの大半が重複する
3. **UX 上の持続可能性** — 28 スキル × 多数の path フィールドを利用者が `gates[]` で個別に書き直す UX は持続不可能。デフォルトを変えるという軽量な操作で済む (A) の方が retrofit-adoption（既存 PJ への phasegate 導入）ユースケースに適合する
4. **既存の部分対応箇所との整合** — `harness-api` / `agent-integration` 配下の adapter 群は既に `paths.designDocs` を読んでいる。phase-gate validator だけが取り残されている形であり、(A) は不整合を解消する

### 新プレースホルダ仕様

| プレースホルダ | 解決元 | デフォルト | 既存挙動との関係 |
|----------------|--------|------------|---|
| `{designDocsRoot}` | `paths.designDocs` | `docs/product/construction` | 新設 |
| `{inceptionDocsRoot}` | `paths.inceptionDocs` | `docs/inception` | 新設 |
| `{unit}` | `scope.unitId` | （変更なし） | 既存 |
| `{storyId}` | `scope.storyId` | （変更なし） | 既存 |

### `Artifact` バリデーションの取り扱い

`docs/` 接頭辞バリデーション (artifact.ts:48) は **撤廃する**。理由:

- `{designDocsRoot}` / `{inceptionDocsRoot}` のデフォルト値が `docs/...` なので、デフォルト挙動では引き続き `docs/` 配下に展開される
- 利用者が意図的に `mydocs/...` を選択した場合、それを拒否する正当性がない（`paths` 設定の存在意義そのもの）
- プレースホルダ展開後の文字列を再度 `docs/` 接頭辞で検査すると、`paths.*` の独自値が `Artifact` 生成時に未展開のまま検査される時系列問題が発生するため、**展開後の検査も行わない**
- 代替の防御として、`paths.designDocs` / `paths.inceptionDocs` 自体の妥当性は config-foundation の schema validation（既存）で担保する

### `EvidenceBundleAssembler` の paths 流入経路

`PhaseConfigProviderPort` に新メソッド `getPathRoots()` を追加し、`paths.designDocs` / `paths.inceptionDocs` を取得する。`EvidenceBundleAssembler.assembleForLevel()` 内で paths を取得し、`scope` に追加するか別引数で `Artifact.resolve()` に渡す（具体形は logical-designer フェーズで確定）。

### 後方互換戦略

- `paths` 未指定または既定値（`docs/product/construction` / `docs/inception`）の場合、要求パスは v0.115.0 以前と完全に同一
- 既存の `gates[]` でパスを上書きしているユーザーは、上書き値がそのまま使われる挙動を維持する（プレースホルダを含まないリテラルパスはそのまま resolve される）
- `Artifact` の `docs/` 接頭辞バリデーション撤廃は **緩和方向の変更**であり、既存の正常な config を破壊しない

## Consequences

### ポジティブ

- ドキュメント `configuration.md:471` の記述と実装が一致し、利用者の合理的期待が満たされる
- `paths.designDocs` / `paths.inceptionDocs` が validator 経路（L2-001 phase-gate, harness-api scanner, agent-integration hook）で一貫して解釈される
- retrofit-adoption（ISSUE-007）で既存 PJ がドキュメント配置規約を保ったまま phasegate を被せられるようになり、適用範囲が拡大
- 28 スキル × 多数の path フィールドに `gates[]` で介入させる UX 負担が解消される

### ネガティブ / トレードオフ

- **ドメイン契約変更**: `Artifact.resolve()` のシグネチャが拡張されるため、phase-dependency-model の domain 層に破壊的変更が入る
  - **緩和策**: 内部 API のみであり、phasegate-cli 利用者には影響しない。テストで後方互換を assert する
- **`docs/` 接頭辞バリデーション撤廃の緩み**: 任意の文字列パスを許容することで、typo 等の誤設定を `Artifact.create()` 段階で検出できなくなる
  - **緩和策**: `paths.designDocs` / `paths.inceptionDocs` の妥当性は config-foundation の schema validation で検査済み。プレースホルダを含まないリテラル path（`gates[]` 経由）の typo は実行時の `artifactExistenceChecker` で「ファイルが存在しない」として検出される
- **新プレースホルダの命名選定**: `{designDocsRoot}` / `{inceptionDocsRoot}` は `paths` config キー名と微妙に異なる（`designDocs` vs `designDocsRoot`）
  - **判断**: 既存プレースホルダ `{unit}` / `{storyId}` も config キー名そのままではないため整合的。`Root` suffix で「ルートディレクトリ」であることを明示する方が利用者にとって意味が明確

### スコープ外（本 ADR で扱わない）

- L2 以外の validator（L1 / L3 / L4）への paths 設定の網羅的反映 — 既に各 validator が個別に `paths.*` を読んでいる箇所があるため、本 ADR は L2-001 phase-gate に閉じる
- `paths.designDocs` 直下の Unit ディレクトリ命名規約変更
- skill ファイル（`.claude/skills/`）内の path 参照の動的化
- `Artifact.path` のユーザー任意プレースホルダ拡張（`{customRoot}` 等）— 本 ADR で導入する 2 個のプレースホルダで現状のニーズは満たされる

## Migration

1. **ドメイン層**: `Artifact` の `ALLOWED_PLACEHOLDERS` に `designDocsRoot` / `inceptionDocsRoot` を追加し、`docs/` 接頭辞バリデーションを撤廃。`Artifact.resolve()` シグネチャに path roots を渡す経路を追加
2. **ドメイン定義**: `STANDARD_PHASE_NODES` / `FULL_PHASE_NODES` / `MINIMAL_PHASE_NODES` の path リテラルを `{inceptionDocsRoot}/...` / `{designDocsRoot}/...` に書き換え
3. **アプリケーション層**: `PhaseConfigProviderPort` に `getPathRoots()` を追加。`EvidenceBundleAssembler` 等で paths を取得して `Artifact.resolve()` に渡す
4. **インフラ層**: `PhaseConfigProviderPort` 実装で `paths.designDocs` / `paths.inceptionDocs` を `getPathRoots()` から返すように接続
5. **テスト**:
   - default paths で従来通り `docs/inception/...` を要求すること
   - `paths.inceptionDocs: "mydocs/inception"` で `mydocs/inception/...` を要求すること
   - `Artifact` が `docs/` 以外で始まるパス（プレースホルダ展開後）を許容すること
6. **ドキュメント**: `docs/guide/configuration.md` に新プレースホルダの動作を明記
7. **CHANGELOG**: bug fix として記載（GitHub Issue [#1](https://github.com/junpei-9898/phasegate/issues/1) への参照付き）

詳細な設計は WI-085 Phase 2（`logical-designer`）で `docs/product/construction/phase-dependency-model/logical_design.md` 等に記録する。

## 関連

- **WI-085** — 本 ADR を駆動する Work Item。GitHub Issue [#1](https://github.com/junpei-9898/phasegate/issues/1) に対応
- **`scripts/harness/phase-dependency-model/domain/values/artifact.ts:6-80`** — プレースホルダ仕様 + `docs/` 接頭辞バリデーション、本 ADR の改修対象
- **`scripts/harness/phase-dependency-model/domain/definitions/standard-phase-nodes.ts:29-`** — ハードコード path（`full-phase-nodes.ts` / `minimal-phase-nodes.ts` も同様）
- **`scripts/harness/phase-dependency-model/application/services/evidence-bundle-assembler.ts:42-49`** — paths 流入欠落点、本 ADR の改修対象
- **`scripts/harness/phase-dependency-model/domain/ports/phase-config-provider-port.ts`** — `getPathRoots()` 追加対象
- **`scripts/harness/harness-api/infrastructure/adapters/file-system-artifact-scanner-adapter.ts:118`** — 既に paths を読んでいる先行箇所、整合確認用
- **`scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts:60`** — 同上
- **`docs/guide/configuration.md:445-471`** — 利用者の期待を形成しているドキュメント記述
- **ADR-007** — harness-config を Single Source of Truth とする決定。本 ADR は ADR-007 の精神（config から validator を駆動する）を phase-gate validator に拡張するもの
