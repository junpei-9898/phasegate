# configurable phase gate — Phase B-4.5 配線修正計画

> **Phase 1（計画）** — ユーザー承認後に Phase 2（Codex による TDD 実装）へ進む。
> **Scope**: B-4 が残した配線ギャップを解消し、CLI / hook 経由でも `custom` preset の `gates[]` が有効に機能する状態にする。

## 1. 背景

B-5 着手時の前提調査で、Codex が以下の配線ギャップを発見した。B-4 で `gates[]` の JSON Schema 対応と phase-dependency-model の composition-root 対応は済んでいるが、**「設定ファイル → CLI / hook エントリ → phase-dependency-model」の経路で `gates` が途中で脱落**している。

### ギャップ連鎖（B-4 直後の状態）

| # | 層 | 状態 | 該当 |
|---|---|---|---|
| 1 | JSON Schema | ✅ `gates[]` 受理 | `harness-config-v2.schema.json:184` |
| 2 | config-foundation VO | ❌ `PhaseDependenciesConfig` VO に `gates` フィールド無し → 無視される | `phase-dependencies-config.ts` |
| 3 | main.ts マッパー | ❌ `toPhaseConfigSection` が `gates` を forward しない | `main.ts:255` |
| 4 | main.ts CLI 引数 | ❌ `check-phase-gate` が `--target-file` を受けない → `blocks` glob が発火しない | `main.ts:565` |
| 5 | phase-gate-query-adapter (hook) | ❌ `createPhaseDependencyModelModule({ rootDir })` のみ呼び、`phaseConfig` を渡さない | `phase-gate-query-adapter.ts:12` |

結果として **`custom` preset は `createPhaseDependencyModelModule` を直叩きするテストコードからしか動かない** 状態。実運用経路（CLI / Claude Code hook）では全て no-op。

## 2. 修正対象ファイル

| ファイル | Unit | Layer | 変更種別 |
|---|---|---|---|
| `scripts/harness/config-foundation/domain/value-objects/phase-dependencies-config.ts` | config-foundation | domain | 編集（`gates` フィールド追加） |
| `scripts/harness/config-foundation/` の `phase-dependencies-config` パース箇所 | config-foundation | infrastructure | 編集（`gates` の raw pass-through） |
| `scripts/harness/main.ts` | entry | - | 編集（mapper + CLI 引数） |
| `scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts` | agent-integration | infrastructure | 編集（config ロード + phaseConfig 渡し） |

**テストファイル**（追加/更新）:

| ファイル | 種別 |
|---|---|
| `__tests__/unit/config-foundation/phase-dependencies-config.test.ts` | 編集 or 新規（`gates` フィールド保持の UT） |
| `__tests__/integration/phase-dependency-model/main-check-phase-gate-custom.integration.test.ts` | 新規（main.ts 内部関数レベルで gates が通ることを検証） |
| `__tests__/integration/agent-integration/phase-gate-query-adapter-custom.integration.test.ts` | 新規（hook adapter が custom gates[] を通す IT） |

## 3. 修正設計

### 3.1 config-foundation: `PhaseDependenciesConfig` に `gates` 追加

**方針**: `gates` は config-foundation の VO では**構造検証せず raw pass-through**（`readonly unknown[]`）とする。gates の意味論（GateDefinition 値オブジェクト化、DAG 検証）は phase-dependency-model の `CustomGatesConfigParser` が担うため、config-foundation では「JSON schema で valid と判明した unknown 配列を保持するだけ」で十分。

```typescript
export interface PhaseDependenciesConfigProps {
  readonly preset: PhaseDependenciesPresetId;
  readonly override: boolean;
  readonly customRules: readonly CustomPhaseRuleProps[];
  readonly gates?: readonly unknown[]; // 追加
}

export class PhaseDependenciesConfig {
  // ...
  readonly gates: readonly unknown[]; // 追加

  constructor(props: PhaseDependenciesConfigProps) {
    // ...
    this.gates = Object.freeze(props.gates ?? []);
  }

  hasCustomGates(): boolean {  // 新設（optional）
    return this.gates.length > 0;
  }

  equals(other: PhaseDependenciesConfig): boolean {
    // ... 既存条件 + gates の deep equal
  }
}
```

- JSON schema 検証は既存 `harness-config-v2.schema.json` が担うため、VO 層での型検証は不要
- `equals` の deep equal は JSON.stringify ベースで OK（raw unknown なので参照等価は不可）

**パース箇所**: config を読み込む Gateway/Repository（`HarnessConfigRepository` 等、既存の parse ロジック）で `raw.phaseDependencies.gates` を forward する 1 行を追加。

### 3.2 main.ts `toPhaseConfigSection` 拡張

```typescript
function toPhaseConfigSection(resolvedConfig: HarnessConfigV2) {
  return {
    planningMode: resolvedConfig.planningMode,
    customization: {
      preset: toPhasePreset(resolvedConfig.phaseDependencies.preset),
      overrideEnabled: resolvedConfig.phaseDependencies.override,
      rules: resolvedConfig.phaseDependencies.customRules.map((r) => ({ ... })),
      gates: resolvedConfig.phaseDependencies.gates, // 追加
    },
    reportingOutputDir: resolvedConfig.reporting.outputDir,
  };
}
```

### 3.3 main.ts `check-phase-gate` CLI に `--target-file` 追加

```typescript
case 'check-phase-gate': {
  // ...
  const level = Number(parseFlag(args, '--level') ?? '1');
  const unitId = parseFlag(args, '--unit');
  const storyId = parseFlag(args, '--story');
  const targetFilePath = parseFlag(args, '--target-file'); // 追加
  const result = await mod.checkPhaseGateCommandHandler.execute({
    targetLevel: level,
    unitId,
    storyId,
    targetFilePath, // 追加
    json,
  });
  // ...
}
```

- `checkPhaseGateCommandHandler.execute` は既に `targetFilePath?: string` を受ける（B-4 で対応済）

### 3.4 `phase-gate-query-adapter.ts`（hook 経路）の config ロード

```typescript
import { loadResolvedConfig } from '../../../config-foundation/... '; // 既存ローダー再利用
import { toPhaseConfigSection } from '...'; // main.ts 内関数を export して共有 or 同等関数を再定義

export class PhaseGateQueryAdapter implements PhaseGateQueryPort {
  async checkGate(scope, targetFilePath?) {
    try {
      const resolvedConfig = await loadResolvedConfig({ rootDir: process.cwd() });
      const phaseConfig = resolvedConfig ? toPhaseConfigSection(resolvedConfig) : undefined;
      const { createPhaseDependencyModelModule } = await import('...');
      const mod = createPhaseDependencyModelModule({
        rootDir: process.cwd(),
        phaseConfig, // 追加
      });
      // ... 以降既存
    } catch {
      return PhaseGateQueryResult.create(true, [], ['phase-dependency-model not available']);
    }
  }
}
```

**検討点**: `toPhaseConfigSection` は現状 main.ts 内のモジュールプライベート関数。共有するには：
- (a) `config-foundation` に移動して export
- (b) agent-integration 内で同等関数を複製
- **推奨 (a)**: config-foundation の責務（resolved config → 各 unit 向けセクション抽出）に合致。main.ts も config-foundation から import する形に変わる。

### 3.5 Schema validation の fail-fast

`loadResolvedConfig` が既に AJV でスキーマ検証しているため、hook ルートでも (3.4) の変更だけで **`level: 99` のような invalid config は hook 起動時に例外 → catch 節で `phase-dependency-model not available` として通過**する。これは意図的に通過させたくない（invalid config は fail-fast したい）ので、catch 節を以下のように分岐：

```typescript
} catch (err) {
  if (err instanceof ConfigValidationError) { // AJV 由来を識別
    return PhaseGateQueryResult.create(false, [`Invalid phasegate.config.json: ${err.message}`], []);
  }
  return PhaseGateQueryResult.create(true, [], ['phase-dependency-model not available']);
}
```

## 4. テスト計画

### 4.1 UT（1 ファイル編集）
- `phase-dependencies-config.test.ts`:
  - `gates` を含む props で構築し保持されること
  - `gates` 省略時は空配列になること
  - `hasCustomGates()` の真偽判定
  - `equals` が `gates` の差を検出すること

### 4.2 IT（2 ファイル新規）
- `main-check-phase-gate-custom.integration.test.ts`:
  - `loadResolvedConfig` + `toPhaseConfigSection` + `createPhaseDependencyModelModule` を実データで連結し、custom preset + gates[] で `targetFilePath` マッチングが発火することを検証
  - これにより main.ts の CLI 呼び出し経路が real に通ることを保証

- `phase-gate-query-adapter-custom.integration.test.ts`:
  - hook 経由で custom gates[] が有効になることを検証
  - invalid config（level:99）で blocker を返すことを検証

### 4.3 E2E（B-5 本体に回す）
B-5 で `custom-preset-cli.e2e.test.ts` を追加。本計画（B-4.5）では IT レベルまで。

## 5. 未決事項（承認必要）

### Q1: `toPhaseConfigSection` の移設先
- **推奨 (a)**: `scripts/harness/config-foundation/application/` or `infrastructure/` に新設（`HarnessConfigMapper` 等）。main.ts / agent-integration 双方から import。
- 代替 (b): agent-integration 内で複製（DRY 違反）
- 代替 (c): main.ts から export（main はエントリ層、再利用前提の設計ではない）

### Q2: `gates` を VO で raw `unknown[]` にする vs 型付けする
- **推奨 (raw)**: phase-dependency-model の `GateDefinition.fromRaw` / `CustomGatesConfigParser` が型検証するため、config-foundation は二重検証しない。JSON schema の構造保証で十分。
- 代替: config-foundation にも `GateDefinitionRaw` 型を導入 → Unit 間に型の重複が生まれる

### Q3: 既存の `customRules` との関係
- 現状: `phaseDependencies.customRules[]`（A 系の既存機能）と `phaseDependencies.gates[]`（B 系の新機能）が**並存**する Schema。customRules は既存の preset カスタマイズ用、gates は custom preset 専用。
- **推奨**: 両者を並存させたまま（B-4.5 では互換性を維持）。将来の統廃合は別 ADR で。

### Q4: Invalid config 時のフォールバック動作
- **推奨**: hook 経由で invalid config を検出したら **blocker として返す**（fail-fast）。現状の "通過させる" は debugging 時に危険。
- 代替: warning として通過させる（現状の挙動維持）

### Q5: 既存テスト（A 系 customRules）への影響
- `PhaseDependenciesConfig` に `gates` フィールドを追加すると、構築しているテストコードが型エラーになる可能性
- **対処**: `gates?: readonly unknown[]` と optional にし、デフォルト `[]` を constructor で設定 → 既存テストは無変更で通る

### Q6: バージョニング
- **推奨**: v0.22.0 → v0.23.0（B-4.5 単独コミット）
- B-5 は v0.23.0 → v0.24.0 へ

### Q7: 段階コミット
- **推奨**: B-4.5 を 1 コミットで（config-foundation / main.ts / agent-integration を同時）。分割すると中間状態で型不整合が発生する。

## 6. Codex 実行プロンプト骨子

```
Phase B-4.5 配線修正。CLI / hook 経由で custom preset の gates[] が有効に動作する状態にする。

## 背景
B-4 で gates[] の JSON schema と phase-dependency-model の composition-root 対応は済んだが、
「設定ファイル → CLI/hook → phase-dependency-model」の経路で gates が途中で脱落している。
詳細は docs/inception/_shared/configurable_phase_gate_b4_5_wiring_fix_plan.md 参照。

## 修正対象ファイル（この5ファイルのみ編集可）
1. scripts/harness/config-foundation/domain/value-objects/phase-dependencies-config.ts
2. scripts/harness/config-foundation/(新設) application/mappers/phase-config-section-mapper.ts
3. scripts/harness/config-foundation の既存 config 読み込み gateway（gates の forward 追加）
4. scripts/harness/main.ts（toPhaseConfigSection を外部 mapper 呼び出しに置換 + --target-file 引数）
5. scripts/harness/agent-integration/infrastructure/adapters/phase-gate-query-adapter.ts

## 前提調査（最初に必ず実施）
- config-foundation の config 読み込みフロー（raw JSON → HarnessConfigV2）を特定
- loadResolvedConfig / HarnessConfigRepository 等の実体を読む
- toPhaseConfigSection の現在の呼び出し箇所を grep
- invalid config 時の例外型（AJV / ConfigValidationError 等）を特定

## TDD 順序
1. config-foundation: PhaseDependenciesConfig に gates フィールド追加 → UT 更新
2. config-foundation: parser/gateway で gates を forward → 既存テストが通ることを確認
3. config-foundation or shared: PhaseConfigSectionMapper を新設 → UT
4. main.ts: toPhaseConfigSection を mapper 呼び出しに置換 + --target-file 引数追加
5. main-check-phase-gate-custom.integration.test.ts 新規 → RED → GREEN
6. phase-gate-query-adapter: config ロード + phaseConfig 渡し + invalid 時 blocker
7. phase-gate-query-adapter-custom.integration.test.ts 新規 → RED → GREEN
8. npm run test 全件 PASS 確認

## 制約
- Bash によるファイル書き込み禁止（Write/Edit のみ）
- docs/ 編集禁止（計画書は読んで良い）
- package.json 編集禁止
- domain 層に新規 VO 追加する場合は既存の naming convention 踏襲
- B-5 で追加予定の custom-preset-cli.e2e.test.ts は本タスクでは作らない

## 完了条件
1. 対象 5 ファイル（+ 新規 mapper）修正完了
2. UT/IT 追加（計 3 ファイル）
3. npm run test 全件 PASS（現行 2991 件 → 約 2996 件前後）
4. git diff --stat を最終報告に含める
5. 既存の A 系テスト（customRules）が無変更で通ることを明記
```

## 7. ファイル変更サマリ

**プロダクション**: 5 ファイル（うち 1 新規）
**テスト**: 3 ファイル（うち 2 新規）

## 8. 未決事項サマリ（承認待ち）

| # | 論点 | 推奨 |
|---|---|---|
| Q1 | `toPhaseConfigSection` の移設先 | config-foundation に新設 mapper |
| Q2 | gates の型 | raw `unknown[]`（二重検証しない） |
| Q3 | customRules との関係 | 並存維持 |
| Q4 | Invalid config 時の挙動 | blocker として返す（fail-fast） |
| Q5 | 既存テストへの影響 | optional + default `[]` で無変更互換 |
| Q6 | バージョン | v0.23.0 |
| Q7 | 段階コミット | 単一コミット |

**ユーザー承認項目**:
- Q1〜Q7 推奨案でよいか
- §2 の修正対象ファイル範囲でよいか
- §6 Codex プロンプト骨子でよいか
