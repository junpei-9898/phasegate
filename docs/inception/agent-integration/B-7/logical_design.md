# B-7 論理設計: ProtectedFileList 除外設定機能

## 1. 問題の本質

`ProtectedFileList` の `DEFAULT_PATTERNS` は `tsconfig.json`, `package.json` 等をハードコードで保護している。AI（Claude Code）側からこれらを編集する正当なケース（`quick-implementor` による設定変更等）でも、hook が一律ブロックするため、ユーザーが毎回手動で `sed` を実行する必要がある。

保護解除の設定手段が存在しないため、設定可能な除外メカニズムを追加する。

## 2. 対策の方針

### 2.1 phasegate.config.json に `protectedFiles` セクションを追加

既存の `harnesses` セクションと同階層に `protectedFiles` トップレベルキーを追加する。`harnesses` に入れない理由: 保護ファイルは hook だけでなく将来的に他の機能でも参照される可能性があり、概念的に独立している。

```jsonc
{
  // ... 既存キー ...
  "protectedFiles": {
    "exclude": ["tsconfig.json", "package.json"]
  }
}
```

### 2.2 DEFAULT_PATTERNS は維持、除外はフィルタリングで実現

`DEFAULT_PATTERNS` のハードコードは維持する（ドメインモデル D3 判断を尊重）。除外は `createWithExclusions()` ファクトリメソッドで DEFAULT_PATTERNS から除外パターンをフィルタリングする方式とする。

```
最終パターン = DEFAULT_PATTERNS - excludePatterns + additionalPatterns
```

### 2.3 ConfigQueryPort の拡張

既存の `getProtectedFilePatterns(): Promise<string[]>` は追加パターン用。新たに `getProtectedFileExclusions(): Promise<string[]>` を追加し、除外パターンを返す。

## 3. 変更対象と設計

### 3.1 harness-config-v2.schema.json（B-7-1）

`properties` に `protectedFiles` セクションを追加:

```json
"protectedFiles": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "exclude": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "uniqueItems": true
    }
  }
}
```

`required` 配列には追加しない（optional セクション）。

### 3.2 ProtectedFileList（B-7-2）

**対象ファイル**: `scripts/harness/agent-integration/domain/value-objects/protected-file-list.ts`

新規 static ファクトリメソッドを追加:

```typescript
static createWithExclusions(exclusions: string[]): ProtectedFileList {
  const filtered = DEFAULT_PATTERNS.filter(p => !exclusions.includes(p));
  if (filtered.length === 0) {
    // 全パターンが除外された場合 — INV-4 違反防止のため DEFAULT_PATTERNS をそのまま返す
    // → 安全側にフォールバック
    return new ProtectedFileList([...DEFAULT_PATTERNS]);
  }
  return new ProtectedFileList(filtered);
}
```

**設計判断**: 全パターン除外を許容すると INV-4（patterns >= 1）に違反する。セキュリティ上も全保護解除は危険なため、全除外の場合は DEFAULT_PATTERNS にフォールバックする。

また、追加パターンと除外を同時に扱う統合ファクトリも追加:

```typescript
static createWithAdditionalAndExclusions(
  additionalPatterns: string[],
  exclusions: string[],
): ProtectedFileList {
  const base = DEFAULT_PATTERNS.filter(p => !exclusions.includes(p));
  const allPatterns = [...base, ...additionalPatterns];
  if (allPatterns.length === 0) {
    return new ProtectedFileList([...DEFAULT_PATTERNS]);
  }
  return new ProtectedFileList(allPatterns);
}
```

### 3.3 ConfigQueryPort（B-7-3a）

**対象ファイル**: `scripts/harness/agent-integration/domain/ports/config-query-port.ts`

```typescript
export interface ConfigQueryPort {
  isHookEnabled(hookType: HookType): Promise<boolean>;
  getProtectedFilePatterns(): Promise<string[]>;
  getProtectedFileExclusions(): Promise<string[]>;  // 新規追加
  getProjectPaths(): ProjectPaths;
}
```

### 3.4 HarnessConfigConfigQueryAdapter（B-7-3b）

**対象ファイル**: `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts`

1. `HarnessConfigDocument` インターフェースに `protectedFiles` セクションを追加
2. `getProtectedFileExclusions()` を実装

```typescript
interface ProtectedFilesSection {
  exclude?: string[];
}

interface HarnessConfigDocument {
  harnesses?: HarnessesSection;
  project?: ProjectSection;
  protectedFiles?: ProtectedFilesSection;  // 新規
}

// ...
async getProtectedFileExclusions(): Promise<string[]> {
  const config = this.loadConfig();
  return config.protectedFiles?.exclude ?? [];
}
```

### 3.5 AsyncHookToCliTranslator.translatePreToolUse()（B-7-4）

**対象ファイル**: `scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts`

Step 1 の保護ファイルチェック部分を変更:

```typescript
// 変更前
const additionalPatterns = await this.configQueryPort.getProtectedFilePatterns();
const protectedFileList = ProtectedFileList.createWithAdditional(additionalPatterns);

// 変更後
const additionalPatterns = await this.configQueryPort.getProtectedFilePatterns();
const exclusions = await this.configQueryPort.getProtectedFileExclusions();
const protectedFileList = ProtectedFileList.createWithAdditionalAndExclusions(
  additionalPatterns,
  exclusions,
);
```

### 3.6 phasegate.config.json（B-7-5）

**対象ファイル**: `phasegate.config.json`

トップレベルに追加:

```json
"protectedFiles": {
  "exclude": ["tsconfig.json", "package.json"]
}
```

### 3.7 同期版 HookToCliTranslator への影響

同期版 `HookToCliTranslator`（テスト用）は `ConfigQueryPort` を使用しているため、新メソッドの追加に対応が必要。ただし同期版は UT 用のモックで使われるため、テスト側でスタブを更新するだけで済む。

## 4. 変更しないもの

| 項目 | 理由 |
|------|------|
| `DEFAULT_PATTERNS` の値 | ドメインモデル D3 判断を維持。除外はフィルタリングで対応 |
| `ProtectedFileList.matches()` のロジック | マッチングロジックは変更不要 |
| `HandlePreToolUseUseCase` | UseCase は translator に委譲するのみ。修正不要 |
| `pre-tool-use-hook.ts` | Hook エントリポイントは変更不要 |
| `PROTECTED_FILE_GUIDANCE` | ガイダンスメッセージは変更しない（除外されたファイルはそもそもブロックされない） |

## 5. 影響範囲

### 5.1 変更が必要なファイル

| ファイル | 変更内容 | レイヤー |
|---------|---------|---------|
| `config-foundation/.../harness-config-v2.schema.json` | `protectedFiles` スキーマ追加 | infrastructure |
| `agent-integration/.../protected-file-list.ts` | `createWithExclusions()`, `createWithAdditionalAndExclusions()` 追加 | domain |
| `agent-integration/.../config-query-port.ts` | `getProtectedFileExclusions()` 追加 | domain |
| `agent-integration/.../harness-config-config-query-adapter.ts` | `getProtectedFileExclusions()` 実装 | infrastructure |
| `agent-integration/.../hook-to-cli-translator.ts` | Step 1 で除外リスト適用 | domain |
| `phasegate.config.json` | `protectedFiles.exclude` 設定 | config |

### 5.2 テスト影響

| テストファイル | 影響 |
|-------------|------|
| `protected-file-list.test.ts` | 新規ファクトリメソッドのテスト追加 |
| `hook-to-cli-translator.test.ts` | ConfigQueryPort モック更新 + 除外シナリオテスト |
| `harness-config-config-query-adapter` IT | 除外設定読み取りテスト |

## 6. 不変条件への影響

| INV | 影響 | 対策 |
|-----|------|------|
| INV-4 (patterns >= 1) | 全パターン除外で空になるリスク | `createWithExclusions()` で全除外時は DEFAULT_PATTERNS にフォールバック |

## 7. QA

### [Question] Q1: `protectedFiles` をトップレベルに置くか `harnesses` 配下に置くか

**推奨案**: トップレベル。理由: 保護ファイルの概念は hook に限定されず、将来的に lint や CI でも参照される可能性がある。`harnesses` は hook 固有の設定セクション。

### [Question] Q2: 全パターン除外時の動作

全 DEFAULT_PATTERNS を除外した場合、INV-4 違反を避けるため DEFAULT_PATTERNS にフォールバックする。つまり「全保護解除」は不可能。

**推奨案**: フォールバック + stderr に警告出力。ユーザーが意図的に全解除しようとした場合に無言でフォールバックすると混乱するため。ただし、警告出力は translator のドメインロジックの責務外なので、VO は純粋にフォールバックのみ行い、警告は adapter 層で対応する。

### [Question] Q3: `required` 配列に `protectedFiles` を追加するか

スキーマの `required` 配列に含めると、既存の `phasegate.config.json` が即座に schema 違反になる。

**推奨案**: `required` に含めない。`protectedFiles` は optional とし、未指定時は現行動作（除外なし）を維持する。
