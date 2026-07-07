---
id: WI-212
type: issue
severity: normal
status: tested
affects: [validator-system, config-foundation, skill-quality]
source: github#28
external_ref: https://github.com/junpei-9898/phasegate/issues/28
---

# WI-212: 言語非依存な validator/skill 体系への拡張 — TS/Vitest 強結合箇所の plugin 化

> 起票日: 2026-05-22
> 起票経緯: GitHub Issue #28。kp-master (TypeScript モノレポ) で phasegate v0.160.11 を運用中のユーザーが Python/Go subproject 適用可能性を調査し、概念は疎結合だが実装が TypeScript/Vitest に強結合している箇所を複数発見した。

## 問題

phasegate の設計コンセプト (architecture preset / phase-gate / L4 文書 validator) は言語非依存だが、現状の v0.160.16 実装は以下の点で TypeScript/Vitest 専用になっている。Python/Go/Rust 等の subproject で再利用しようとすると validator が空振りするか dependency 不足で fail し、ユーザーが phasegate を TypeScript 専用ツールと誤解する。

### 再現確認 (v0.160.16 @ 2026-05-22)

| validator / 機能 | 実装上の言語結合点 | 確認方法 |
|---|---|---|
| L3-002 ループ内 await (performance) | `scripts/harness/validator-system/infrastructure/adapters/ast-performance-scanner-adapter.ts:7` が TypeScript Compiler API 前提 | `grep -n 'TypeScript Compiler API' scripts/harness/validator-system/infrastructure/adapters/` |
| L4-001 / L4-003 (skill catalog / source code analyzer) | `biome-ast-source-code-analyzer-adapter.ts:7` が TypeScript Compiler API を直接使用 | 同上 |
| biome-ast-engine (TypeScript-only AST analyzer) | `scripts/harness/biome-ast-engine/infrastructure/adapters/typescript-source-module-analyzer-adapter.ts` 自体が TypeScript 専用 | `find scripts/harness/biome-ast-engine -name 'typescript-*.ts'` |
| L3-003 coverage | `scripts/harness/skill-quality/infrastructure/adapters/vitest-coverage-runner-adapter.ts` が `vitest run --coverage` 固定。`@vitest/coverage-v8` 不在時のエラーメッセージは `npm install -D vitest @vitest/coverage-v8` を案内する | `cat scripts/harness/skill-quality/infrastructure/adapters/vitest-coverage-runner-adapter.ts` |
| IT test mock detection | `scripts/harness/validator-system/domain/services/it-test-mock-detection-service.ts:14-15` が `/^vitest$/` / `/^@vitest\//` を hardcode | `grep -n 'vitest' scripts/harness/validator-system/domain/services/it-test-mock-detection-service.ts` |
| `init --language` flag | 存在しない (`npx phasegate init` のオプションは `--name / --preset / --skills / --agent / --workflow / --with-husky / --with-ci / --yes` のみ) | `npx phasegate --help` |
| `project.languages` 等の宣言フィールド | `config-foundation` 配下に `language` / `languages` を含むコードなし | `grep -rn 'languages\b' scripts/harness/config-foundation/` |
| shipped skill の language タグ | `unit-test-designer` / `it-test-designer` の SKILL.md 等が Vitest / TypeScript 前提のテンプレを記述しており、frontmatter に `language` フィールドなし | `head -20 skills/unit-test-designer/SKILL.md` |

### 言語非依存に動く部分 (再利用可能)

- `architecture.preset` (clean / hexagonal / onion / layered / strict-ddd / flat / custom) の宣言と依存方向検証
- L4 validator 群 (drift-detect / consistency-check / pointer-validation / doc-freshness / skill-catalog-drift) — Markdown / 構造ベース
- Phase-gate / WI workflow — 設計文書の存在チェックが中心
- `paths.source` / `preCommit.implementationExtensions` の拡張子設定 (configurable)

## 受け入れ基準

- [ ] validator 群が `language: typescript | python | go | rust | ...` adapter 経由で動作するようになる (validator id ごとに対応 adapter を持つ / 非対応 validator は自動 skip + warn)
- [ ] `phasegate.config.json` に `project.languages: ["typescript"]` 等の宣言フィールドが追加され、validator dispatch / skill applicability に利用される
- [ ] shipped skill の frontmatter に `language` メタが追加され、別言語向け skill と共存できる構造になる
- [ ] `phasegate init --language <lang>` フラグが追加され、言語に応じた preset / skill / validator bootstrap が可能になる
- [ ] docs に "Supported languages" マトリクスが追加され、各 validator がどの言語に対応しているかをユーザーが採用判断できる形で示される
- [ ] 既存 TypeScript ユーザーの挙動が後方互換に保たれる (default language: typescript / 既存 config の暗黙解釈で同じ validator が走る)

## Dogfood Evidence (2026-05-22)

ローカル `0.160.16` checkout で確認した。

| 観点 | 観察結果 |
|---|---|
| `init --language` の有無 | ❌ flag 不在 (CLI `--help` 出力に該当オプション無し) |
| `project.languages` 設定 | ❌ `phasegate.config.json` schema 未対応、コードに `languages` 参照無し |
| `lint`/`validate` の言語切替 | ❌ オプション無し。常時 TypeScript 前提で走る |
| L3-002 / L4-001 / L4-003 AST validator | ❌ TypeScript Compiler API ハードコード (`ast-performance-scanner-adapter.ts:7` / `biome-ast-source-code-analyzer-adapter.ts:7`) |
| L3-003 coverage runner | ❌ Vitest 専用 (`vitest-coverage-runner-adapter.ts` が `vitest run --coverage` 実行 + `@vitest/coverage-v8` を要求) |
| IT test mock detection | ❌ `vitest` / `@vitest/*` を regex hardcode |
| L4 文書 validator 群 (drift / consistency / pointer / freshness / skill-catalog-drift) | ✅ 言語非依存に動作 (Markdown ベース) |
| architecture preset / phase-gate / WI workflow | ✅ 言語非依存 (構造ベース) |

## 提案 (Issue #28 から再掲)

1. validator の言語別 plugin 化: `validatorId` × `language adapter` の dispatch。非対応は skip + warn
2. `phasegate.config.json` に `project.languages: ["typescript"]` を追加 (default で TypeScript)
3. shipped skill の `language` frontmatter
4. `phasegate init --language` フラグ
5. docs に "Supported languages" マトリクス

## 非スコープ

- 既存 TypeScript validator の検出ロジック変更 (内部実装の改善は本 WI スコープ外)
- 個別言語 (Python / Go / Rust) 用 validator adapter の同時実装 — 本 WI は plugin 構造の整備までを担い、各言語 adapter は後続 WI で扱う
- Biome / ESLint 等 TypeScript エコシステム連携部分の機能追加

## Related

- WI-201 (#26) / WI-202 (#27) — config:plan / quick-implementor 関連の hook 改善で、本 WI と独立
- `docs/principles/architecture-philosophy.md` — architecture preset の言語非依存な思想を再確認すべき参照
