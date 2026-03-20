# TDD実装計画: Wave 2 (5ユニット)

> **作成日**: 2026-03-19
> **対象ユニット**: validator-system, nyquist-validation, quick-mode, harness-api, agent-integration
> **フェーズ**: Phase 1（計画）

---

## 1. スコープ

### 対象ストーリー

| Unit | 対応ストーリー | 依存Wave 2 Unit |
|------|--------------|----------------|
| validator-system | H08-01〜H08-06 | なし |
| nyquist-validation | H07-01〜H07-04 | validator-system |
| quick-mode | H10-01〜H10-04 | なし（Wave 1 Portsのみ） |
| harness-api | H09-01〜H09-04 | validator-system, nyquist-validation, quick-mode |
| agent-integration | H06-01〜H06-05 | harness-api（CLI経由） |

### 影響する層

全ユニット共通: **Domain → Application → Infrastructure → Presentation**

### 実装先ディレクトリ

```
scripts/harness/
├── shared-kernel/                     # Wave 2 追加（Cross-Unit Contract再エクスポート）
│   ├── validator-system.ts            # ValidatorRegistry I/F + ValidationResult Contract
│   ├── nyquist-validation.ts          # ValidationGatewayContract
│   ├── quick-mode.ts                  # QuickModeConfig Contract
│   ├── harness-api.ts                 # HarnessApiResponse<T> 公開入口
│   └── agent-integration.ts           # HookConfig Contract
├── validator-system/                  # 新規作成
│   ├── domain/  application/  infrastructure/  presentation/
│   ├── index.ts
│   └── composition-root.ts
├── nyquist-validation/                # 新規作成
├── quick-mode/                        # 新規作成
├── harness-api/                       # 新規作成
└── agent-integration/                 # 新規作成
```

### テスト先ディレクトリ

```
scripts/harness/__tests__/
├── unit/
│   ├── validator-system/              # 新規作成
│   ├── nyquist-validation/            # 新規作成
│   ├── quick-mode/                    # 新規作成
│   ├── harness-api/                   # 新規作成
│   └── agent-integration/             # 新規作成
├── integration/
│   ├── validator-system/              # 新規作成
│   ├── nyquist-validation/            # 新規作成
│   ├── quick-mode/                    # 新規作成
│   ├── harness-api/                   # 新規作成
│   └── agent-integration/             # 新規作成
└── integration/fixtures/              # フィクスチャ追加
```

---

## 2. 前提条件検証

| 確認項目 | 状況 |
|---------|------|
| `logical_design.md`（全5件） | ✅ 存在 |
| `environment_contract.md` | ✅ 存在 |
| `unit_test_design.md`（全5件） | ✅ 存在 |
| `it_test_design.md`（全5件） | ✅ 存在 |
| `coverage_report.md`（全5件） | ✅ 存在 |
| `unit_test_logic.md`（全5件） | ✅ 存在 |
| `it_test_logic.md`（全5件） | ✅ 存在 |
| `scenario_test_design.md` | ⏭ CLI tool・スキップ（E2E不要） |
| `inception/{unit}/logical_design.md` | ⏭ Unit横断設計で代替（Wave 1 と同一運用） |
| shared-kernel ディレクトリ | ❌ 未作成（実装時に新規作成） |

**判定: ✅ 実装準備完了**

---

## 3. TDD実装順序（テストピラミッド準拠）

### 実装順序の根拠（Unit間依存）

```
validator-system ──────────────────────────────────────→ harness-api
nyquist-validation (uses validator-system) ────────────→ harness-api
quick-mode ─────────────────────────────────────────────→ harness-api
                                                          harness-api ─→ agent-integration
```

**実装フェーズ:**
1. **Phase A（並列可能）**: validator-system + quick-mode（相互依存なし）
2. **Phase B（Phase A完了後）**: nyquist-validation（validator-systemのInfra Portを使用）
3. **Phase C（Phase B完了後）**: harness-api（全3ユニットのShared Kernelを参照）
4. **Phase D（Phase C完了後）**: agent-integration（harness-api CLIを子プロセス起動）

### 各ユニット内TDDサイクル

各ユニット内は **Domain → Application → Infrastructure → Presentation** の順に RED→GREEN→REFACTOR：

```
1. Domain Layer（Unit テスト RED→GREEN→REFACTOR）
   - Value Objects: 不変条件・型安全性
   - Domain Services: ビジネスロジック
   - Port interfaces: TypeScript interface 定義のみ（テスト対象なし）

2. Application Layer（Unit テスト RED→GREEN→REFACTOR）
   - UseCase: Ports をvi.fn()でモック
   - DTO / Mapper

3. Infrastructure Layer（IT テスト RED→GREEN→REFACTOR）
   - Adapter: vi.mock() で外部依存をスタブ
   - フィクスチャ活用

4. Presentation Layer（IT テスト RED→GREEN→REFACTOR）
   - CLI Handler: vi.spyOn(process.stdout.write) / vi.spyOn(process, 'exit')
   - Formatter: 純粋関数テスト

5. composition-root.ts + index.ts + shared-kernel/{unit}.ts 作成
```

### ユニット別規模見積もり

| Unit | 推定ソースファイル数 | Unit テスト件数 | IT テスト件数 |
|------|-------------------|--------------|--------------|
| validator-system | ~45 | ~120件 | ~105件 |
| nyquist-validation | ~35 | ~90件 | ~82件 |
| quick-mode | ~40 | ~100件 | ~87件 |
| harness-api | ~55 | ~90件 | ~103件 |
| agent-integration | ~45 | ~80件 | ~83件 |
| **合計** | **~220** | **~480件** | **~460件** |

---

## 4. テスト規約（全ユニット共通）

```typescript
// 命名: 日本語テスト名
// 構造: target() / context() / describe() / it()
// 変数: actual（result 禁止）
// パターン: AAA (Arrange / Act / Assert)
// モック: Ports のみ vi.fn() — Domain は実体使用
// テストヘルパー: scripts/harness/__tests__/helpers/test-helpers.ts
```

---

## 5. 環境検証チェックリスト

| 確認項目 | 方法 |
|---------|------|
| TypeScript コンパイル | `npx tsc --noEmit` |
| Vitest 実行 | `npx vitest run` |
| ts-morph 依存 | `package.json` に `ts-morph` があること（agent-integration用） |

---

## 6. QA（不明点・確認事項）

### [Question] Q1: shared-kernel ディレクトリの扱い

Wave 2 論理設計では `scripts/harness/shared-kernel/` への再エクスポートが定義されているが、Wave 1 ユニットは `{unit}/index.ts` を公開入口として使用しており `shared-kernel/` が存在しない。

**推奨案**: Wave 2 実装時に `scripts/harness/shared-kernel/` を新規作成し、Wave 2 の Cross-Unit Contract のみを配置する。Wave 1 ユニットの `index.ts` は変更しない。

[Answer]
（人間が回答を記入）

### [Question] Q2: Phase A 並列実装の可否

validator-system と quick-mode は相互依存がないため Agent tool 並列実行が可能。一方、1ユニット内でも domain → application → infrastructure の順序を守る必要がある（application が domain の型を参照するため）。

**推奨案**: 各ユニットを1つの Agent に担当させ、ユニット内はシリアル実行。validator-system と quick-mode を同時起動する。

[Answer]
（人間が回答を記入）

### [Question] Q3: 既存コード（scripts/harness/validators/, cli/, core/）との共存

現在 `scripts/harness/validators/`, `scripts/harness/cli/`, `scripts/harness/core/` に旧実装が存在する。Wave 2 の新実装は `scripts/harness/{unit}/` に作成するため物理的に競合しないが、`main.ts` や `integrations/` が旧実装を参照している。

**推奨案**: Wave 2 実装中は旧実装を触らない。新実装完了後に Composition Root 統合として別タスクで対処する（TDD 実装スコープ外）。

[Answer]
（人間が回答を記入）

---

## 7. 前提条件・リスク

| リスク | 対策 |
|--------|------|
| harness-api が最大規模（55ファイル・103 IT件） | Part 1/Part 2 に分割してAgent実行 |
| agent-integration が harness-api CLI を子プロセス起動 | IT テストでは UseCase を直接インスタンス化（子プロセス不要） |
| ts-morph が devDependencies に未登録の可能性 | 実装開始前に `package.json` 確認 |
| nyquist-validation のファイルシステムモック | `vi.mock("node:fs/promises")` でスタブ（実FS不使用） |
| Wave 2 unit 間の TypeScript 型参照 | Domain Portは interface のみなのでコンパイル依存なし。Adapter 実装は shared-kernel 経由でのみ参照 |

---

## 8. 次ステップ

Phase 1 計画承認後、以下の順序で Phase 2（TDD実装）を実行:

```
Phase A: validator-system + quick-mode（並列）
Phase B: nyquist-validation
Phase C: harness-api
Phase D: agent-integration
```

各ユニット内実装順序: **Domain → Application → Infrastructure → Presentation → composition-root**
