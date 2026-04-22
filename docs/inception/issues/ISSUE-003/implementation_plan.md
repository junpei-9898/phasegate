# ISSUE-003 実装計画書

**参照元**: [ISSUE-003 issue_description.md](./issue_description.md)
**策定日**: 2026-04-23
**対象バージョン基準**: v0.74.0（ISSUE-007 Wave 9 完遂後）
**想定工数**: **~3〜4 人日**（Wave 1-5、段階 PR）
**スキル**: `quick-implementor`（refactoring、新機能追加なし）

---

## ⚠️ issue_description.md との齟齬（先に整理）

`rule-violation-code-mapper.ts:11-15` を実地確認した結果、issue_description.md の rule 定義 2 件が実際のコードと食い違う。本計画では **実際のコード定義** に従う。

| コード | issue_description の記述 | 実際の定義（`rule-violation-code-mapper.ts`） |
|---|---|---|
| L1-003 | no-layer-violation | `no-layer-violation` ✅ 一致 |
| L1-004 | enforce-folder-structure | `enforce-folder-structure` ✅ 一致 |
| L1-005 | no-any-abuse | `no-any-abuse` ✅ 一致 |
| L1-006 | ~~no-code-duplication~~ | **`no-ghost-file`**（arranged different rule） |
| L1-007 | ~~no-ghost-file~~ | **`no-comment-flood`**（issue description 誤り） |

→ 本計画完了時に issue_description.md も最新 rule コード定義に合わせて修正する（Wave 0 の副産物）。

---

## 現状スナップショット（2026-04-23 / v0.74.0 時点）

実測コマンド:
```bash
npx phasegate lint --json > /tmp/lint.json
node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/lint.json','utf8')); const c={}; r.errors.forEach(e=>c[e.code]=(c[e.code]||0)+1); console.log(r.errors.length, c)"
```

| ルール | 意味 | 件数 | ファイル数 | 起票時 → 現在 |
|---|---|---|---|---|
| **L1-003** `no-layer-violation` | 禁止された依存方向の import | 63 | 17 | 55 → 63（+8） |
| **L1-007** `no-comment-flood` | コメント密度が許容値超 | 48 | 48 | 43 → 48（+5） |
| **L1-006** `no-ghost-file` | どこからも import されない孤立ファイル | 32 | 32 | 31 → 32（+1） |
| **L1-004** `enforce-folder-structure` | `@layer` 宣言 vs 配置ディレクトリの不一致 | 12 | 12 | 12 → 12（±0） |
| **L1-005** `no-any-abuse` | `any` 型の過剰使用 | 4 | 4 | 4 → 4（±0） |
| **合計** | | **159** | | 145 → 159（+14） |

悪化の主因は ISSUE-007 Wave 1-9 で追加された `ci-governance/presentation/handlers/*.ts` / `harness-api/presentation/handlers/*.ts` 群（composition-root からの import が L1-003 にカウントされている）と、それらに付随する JSDoc 由来の L1-007。

---

## Wave 構成

### Wave 0 — 棚卸し & 分類（0.5d）

**目的**: 機械的修正で済む件と、アーキテクチャ判断を要する件を分離して、後続 Wave を確実化する。

**成果物**:

1. `/tmp/lint-issue003-inventory.md` — 各 violation を以下で分類:
   - **FIX**: 機械的修正可能（型注釈追加、宣言修正、コメント削除、ファイル削除）
   - **ALLOWLIST**: composition-root.ts / main.ts / vitest.config 等、rule 側で除外すべき false positive
   - **ARCHITECTURAL**: port 配置ミス、層間依存の再設計が必要（RFC 起票）
2. issue_description.md の rule コード定義修正（L1-006/L1-007 swap）
3. `phasegate.config.json` の biome-ast-engine rule 設定確認（allowlist 候補があるか）

**検証**:
- 5 rule × 17-48 files 全件を手 grep で確認
- composition-root.ts / main.ts / `__tests__/vitest.config*.ts` を allowlist 候補として特定

---

### Wave 1 — L1-005 機械修正（4 件、0.5h）

**対象ファイル**（4 件）:
```
scripts/harness/ci-governance/application/usecases/generate-ci-template-usecase.ts
scripts/harness/ci-governance/presentation/handlers/migrate-agents-md-handler.ts
scripts/harness/nyquist-validation/infrastructure/adapters/ajv-json-schema-validator-adapter.ts
scripts/harness/skill-quality/...（実際のファイルは Wave 0 で確定）
```

**手順**:
1. 各ファイルを Read して `any` の使用箇所を特定
2. 具体的な型に置換（`unknown` + 型 guard、interface 定義、ライブラリ型の import）
3. Vitest 実行で既存テスト green を確認
4. `npx phasegate lint --json` で L1-005 = 0 を確認

**リスク**: 低。型変更がビルドエラーを起こす可能性はあるが、件数 4 で局所的。

**commit**: `fix: v0.75.0 — ISSUE-003 Wave 1 (L1-005 no-any-abuse 4件解消)`

---

### Wave 2 — L1-004 機械修正（12 件、1-2h）

**対象**（Wave 0 で確定する 12 ファイル、Unit 横断）:
- ci-governance, harness-api, integrations, main.ts, quick-mode, regression-suite, setup, shared-kernel, skill-quality

**手順**:
1. 各ファイルの先頭コメント `// @layer X` とファイル配置ディレクトリを突き合わせ
2. 判断:
   - ディレクトリ側が正 → コメント修正
   - 宣言側が正 → ファイル移動（import 修正伴う）
3. composition-root.ts / main.ts は、Clean Architecture の composition-root パターン（4 層すべてを import する wiring 責務）として **Wave 0 の分類結果次第で allowlist 化** を検討

**リスク**: 中。ファイル移動が発生する場合、import 路径修正が広範になる可能性。

**commit**: `fix: v0.76.0 — ISSUE-003 Wave 2 (L1-004 enforce-folder-structure 12件解消)`

---

### Wave 3 — L1-007 コメント削減（48 件、0.5d）

**対象分布**（Unit 別）:
- harness-error: 13 件
- validator-system: 11 件
- ci-governance: 6 件
- agent-integration: 5 件
- biome-ast-engine / config-foundation: 3 件
- nyquist-validation / phase-dependency-model / quick-mode: 2 件
- setup: 1 件

**手順**:
1. Unit 単位で PR 分割（harness-error / validator-system / ci-governance が過半数）
2. 各ファイルで以下のパターンを削除:
   - 自明な JSDoc（`/** Returns the foo */` で関数名 `getFoo()` のような重複記述）
   - 「why なしの what」解説（`// Map errors to codes` で直下が `errors.map(...)` のような）
   - TODO 系で行き場のないもの
3. 残すコメント:
   - 非自明な invariant（「この順序を変えると X が壊れる」等）
   - 外部仕様参照（URL / spec number）

**基準**: CLAUDE.md 準拠（"Default to writing no comments. Only add one when the WHY is non-obvious"）

**リスク**: 中。削りすぎて WHY が消える可能性 → レビュー時に Git blame で経緯追跡が必要な箇所は保持する

**commit（Unit 単位）**:
- `fix: v0.77.0 — ISSUE-003 Wave 3-1 (L1-007 harness-error / validator-system / ci-governance)`
- `fix: v0.78.0 — ISSUE-003 Wave 3-2 (L1-007 agent-integration / biome-ast-engine / config-foundation / その他)`

---

### Wave 4 — L1-006 ghost file 整理（32 件、0.5-1d）

**対象分布**（Unit 別）:
- agent-integration / quick-mode: 6 件
- skill-quality: 4 件
- ci-governance / nyquist-validation / shared-kernel: 3 件
- `__tests__` / traceability-model: 2 件
- adr-foundation / config-foundation / main.ts: 1 件

**判断マトリクス**:

| 種別 | 判断 | アクション |
|---|---|---|
| `__tests__/vitest.config.forks.ts` / `vitest.config.ts` | エントリポイント | **allowlist**（Vitest が直接読む） |
| `main.ts` | CLI エントリ | **allowlist**（node が直接実行） |
| `*-seeds.ts`（`adr-foundation/.../initial-adr-definitions.ts`） | 将来の import 候補 | composition-root で実際に呼ぶなら wiring、呼ばないなら削除 |
| その他未参照 | 過去の残骸 | **削除** |

**手順**:
1. Wave 0 の分類結果で「delete 候補」「allowlist 候補」を確定
2. allowlist は `phasegate.config.json` の `biome.ignore` 相当（or rule 側の entryPoints 設定）を拡張
3. delete は `git rm` → 影響ファイルの import 消滅確認

**リスク**: 中〜高。allowlist に入れるべきものを削除してしまうと runtime エラー。vitest config 等は特に慎重に。

**commit**: `fix: v0.79.0 — ISSUE-003 Wave 4 (L1-006 no-ghost-file 32件 allowlist/削除)`

---

### Wave 5 — L1-003 layer 違反解消（63 件、1-2d）

**根本分類**（Wave 0 で確定させる想定）:

| パターン | 件数見込み | 対応 |
|---|---|---|
| A. composition-root.ts → presentation/infrastructure | ~20-30 | **allowlist**（DI wiring の責務上、4 層 import は正当） |
| B. main.ts → 各 Unit の composition-root / domain / infrastructure | ~13 | **allowlist**（CLI エントリ） |
| C. port が infrastructure 配下に置かれている（`agent-integration/infrastructure/ports/cli-executor-port.ts`） | ~3-5 | **port を application/ports へ移動** |
| D. presentation/hook → infrastructure/adapters 直接依存 | ~15-20 | **アーキ判断要**: composition-root 経由に変更するか、pattern として許容するか（ADR 起票） |
| E. その他（traceability-model / quick-mode 等） | 残り | 個別対応 |

**手順**:
1. Wave 0 で全 63 件を A-E に分類
2. **Wave 5a**: A/B パターン → rule 側で allowlist 定義（composition-root.ts / main.ts の特例パス対応）
3. **Wave 5b**: C パターン → port 配置修正（機械的）
4. **Wave 5c**: D パターン → ADR 起票 + 修正方針決定（composition-root DI 徹底 or 緩和）
5. **Wave 5d**: E パターン → 個別修正

**リスク**: 高。
- A/B の allowlist 追加は rule 側の変更で、他プロジェクトにも波及する可能性
- D の修正は hook の起動経路変更を伴うので regression リスク

**commit（段階 PR）**:
- `fix: v0.80.0 — ISSUE-003 Wave 5a (L1-003 composition-root/main.ts allowlist)`
- `fix: v0.81.0 — ISSUE-003 Wave 5b (L1-003 port 配置修正)`
- `fix: v0.82.0 — ISSUE-003 Wave 5c (L1-003 hook→adapter 直接依存の ADR 起票 + 修正)`
- `fix: v0.83.0 — ISSUE-003 Wave 5d (L1-003 残件)`

---

## 受け入れ基準

- [ ] `npx phasegate lint --json` で L1-003/L1-004/L1-005/L1-006/L1-007 の violation 数が全て **0**
- [ ] 既存 Vitest テスト全て green（regression なし）
- [ ] 既存 E2E（`scripts/harness/__tests__/e2e/**`）全て green
- [ ] dogfood: `/tmp/phasegate-dogfood-v07X/` で一般プロジェクト動作確認
- [ ] Wave 5c で ADR が起票されており、hook→adapter の直接依存に対する方針が文書化されている
- [ ] issue_description.md の rule コード定義が実コードと整合している（Wave 0 の副産物）

---

## 既知のリスクと緩和策

| リスク | 深刻度 | 緩和策 |
|---|---|---|
| Wave 5a の allowlist 追加が rule semantics を薄めて他プロジェクトの L1-003 検知を弱める | 高 | composition-root.ts / main.ts のパス **正確指定**（ワイルドカード禁止）。dogfood で他 PJ でも同じ除外が必要か検証 |
| Wave 3 のコメント削除で WHY コメントを誤削除 | 中 | レビュー時 Git blame 確認。CLAUDE.md の「non-obvious WHY」基準に照らして二重チェック |
| Wave 4 で entrypoint を誤削除して runtime エラー | 中 | `npm test` / `npx phasegate lint` / `npx phasegate validate` を削除前後で実行。CI 通過確認 |
| Wave 5c の hook→adapter 直接依存解消が hook 起動経路の regression を起こす | 中 | agent-integration IT テストで pre-tool-use hook の E2E を通す。Claude Code / Codex 両環境で dogfood |
| v0.75.0 から v0.83.0 まで 5 版跨ぎの連続 publish が発生 | 低 | 各 Wave 完了時に CHANGELOG 更新 + tag + `npm publish --auth-type=web` |

---

## 見積り内訳

| Wave | 見積り | 累積 |
|---|---|---|
| Wave 0（棚卸し） | 0.5d | 0.5d |
| Wave 1（L1-005 x4） | 0.5h | 0.6d |
| Wave 2（L1-004 x12） | 1-2h | 0.8d |
| Wave 3（L1-007 x48） | 0.5d | 1.3d |
| Wave 4（L1-006 x32） | 0.5-1d | 1.8-2.3d |
| Wave 5（L1-003 x63） | 1-2d | 2.8-4.3d |
| **合計** | | **~3-4d** |

---

## 設計判断が必要な未決事項

1. **composition-root.ts / main.ts の allowlist 採否**
   - 採用: L1-003 を 20-30 件削減できる。Clean Architecture の正当パターンを rule が正しく認識する
   - 不採用: rule の厳格性を保つ代わり、すべての composition を別機構（DI コンテナ等）に移す大規模リファクタが必要
   - **推奨**: 採用（ADR 起票で意思決定を明文化）

2. **L1-006 の seed ファイル（`adr-foundation/.../initial-adr-definitions.ts`）の扱い**
   - wiring: composition-root で実際に呼ぶ（実質機能追加）
   - 削除: 将来使う予定があるなら git history に残して削除
   - **推奨**: Wave 0 でメンテナに確認

3. **Wave 5c の hook→adapter 直接依存の正当性**
   - 緩和: 現在の pattern を正当と認める（composition-root → hook instantiation → 内部で adapter 直接参照）
   - 厳格化: hook に adapter を constructor 注入、presentation から infrastructure を隠蔽
   - **推奨**: ADR 起票後にメンテナ判断

4. **段階 PR の粒度**
   - Wave 単位: 5 回 publish
   - Rule 単位: 4 rule × 1 PR = 4 回 publish（Wave 3/4/5 を複数 PR 分割）
   - **推奨**: Wave 単位（CHANGELOG 追跡性が高い）

---

## 参照

- `scripts/harness/biome-ast-engine/infrastructure/mappers/rule-violation-code-mapper.ts:11-15` — rule コード↔意味マッピング実体
- `scripts/harness/biome-ast-engine/domain/services/rule-definition-registry.ts` — rule 定義
- `docs/principles/architecture-philosophy.md` — Clean Architecture 4 層方針
- `CLAUDE.md` — コメント方針（"Default to writing no comments"）
- ISSUE-007 Wave 1-9 — L1-003 悪化の主因（`ci-governance/presentation/handlers/*.ts` 等の追加）
