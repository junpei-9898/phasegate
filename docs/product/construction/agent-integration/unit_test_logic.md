# ユニットテストロジック設計: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **Wave**: 2（品質検証レイヤー）
> **前提ドキュメント**:
> - `docs/product/construction/agent-integration/unit_test_design.md`
> - `docs/inception/agent-integration/unit_test_logic_plan.md`

---

## 1. テストファイル構成

| テストファイル | 対象クラス | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/agent-integration/reentry-guard.test.ts` | ReentryGuard（エンティティ） | 11 |
| `scripts/harness/__tests__/unit/agent-integration/hook-event.test.ts` | HookEvent（VO） | 8 |
| `scripts/harness/__tests__/unit/agent-integration/protected-file-list.test.ts` | ProtectedFileList（VO） | 12 |
| `scripts/harness/__tests__/unit/agent-integration/hook-translation-result.test.ts` | HookTranslationResult（VO） | 11 |
| `scripts/harness/__tests__/unit/agent-integration/fallback-capability-spec.test.ts` | FallbackCapabilitySpec（VO） | 7 |
| `scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts` | HookToCliTranslator（DS） | 11 |
| `scripts/harness/__tests__/unit/agent-integration/fallback-verification-service.test.ts` | FallbackVerificationService（DS） | 10 |

※境界値（UT-BV-*）は各ファイルに分散して記載（14件）

---

## 2. 共通ヘルパー・ファクトリ

`scripts/harness/__tests__/helpers/test-helpers.ts` に以下のファクトリ関数を追加する。

```typescript
import { describe } from 'vitest';

/**
 * テスト対象のメソッド/クラスを示すdescribeエイリアス
 */
export const target = describe;

/**
 * テストの前提条件を示すdescribeエイリアス
 */
export const context = describe;

// ── agent-integration ファクトリ ──────────────────────────────────

/**
 * PreToolUseEvent を生成するファクトリ
 * デフォルト: { hookType: 'pre-tool-use', toolName: 'Write', targetFilePaths: ['src/app.ts'] }
 */
export const createPreToolUseEvent = (
  overrides: Partial<{ hookType: string; toolName: string; targetFilePaths: string[] }> = {}
) =>
  PreToolUseEvent.create({
    hookType: 'pre-tool-use',
    toolName: 'Write',
    targetFilePaths: ['src/app.ts'],
    ...overrides,
  });

/**
 * PostToolUseEvent を生成するファクトリ
 * デフォルト: { hookType: 'post-tool-use', toolName: 'Write', affectedFilePaths: ['src/app.ts'] }
 */
export const createPostToolUseEvent = (
  overrides: Partial<{ hookType: string; toolName: string; affectedFilePaths: string[] }> = {}
) =>
  PostToolUseEvent.create({
    hookType: 'post-tool-use',
    toolName: 'Write',
    affectedFilePaths: ['src/app.ts'],
    ...overrides,
  });

/**
 * StopEvent を生成するファクトリ
 * デフォルト: { hookType: 'stop', sessionId: 'sess-001' }
 */
export const createStopEvent = (sessionId = 'sess-001') =>
  StopEvent.create({ hookType: 'stop', sessionId });

/**
 * ProtectedFileList を生成するファクトリ
 * デフォルト: { patterns: ['biome.json', 'tsconfig.json'] }
 */
export const createProtectedFileList = (patterns: string[] = ['biome.json', 'tsconfig.json']) =>
  ProtectedFileList.create({ patterns });

/**
 * HookTranslationResult を生成するファクトリ
 * デフォルト: { shouldBlock: false, cliArgs: [], expectedExitCode: 0 }
 */
export const createHookTranslationResult = (
  overrides: Partial<{
    shouldBlock: boolean;
    cliCommand: string;
    cliArgs: string[];
    expectedExitCode: number;
    skipReason: string;
    timeoutMs: number;
  }> = {}
) =>
  HookTranslationResult.create({
    shouldBlock: false,
    cliArgs: [],
    expectedExitCode: 0,
    ...overrides,
  });

/**
 * FallbackCapabilitySpec を生成するファクトリ
 * デフォルト: { supportedCommands: ['harness:lint'], noAgentApiImports: true }
 */
export const createFallbackCapabilitySpec = (
  overrides: Partial<{ supportedCommands: string[]; noAgentApiImports: boolean }> = {}
) =>
  FallbackCapabilitySpec.create({
    supportedCommands: ['harness:lint'],
    noAgentApiImports: true,
    ...overrides,
  });
```

補足:
- `result` は使わず、Act の返り値は必ず `actual` に代入する。
- ポートモックは `vi.fn()` で生成し、`.mockReturnValue()` / `.mockResolvedValue()` で戻り値を設定する。
- エンティティ・VO はモック不使用（実体を直接生成）。

---

## 3. テストケース詳細ロジック

### 3.1 `reentry-guard.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ReentryGuard } from '../../../agent-integration/domain/entities/ReentryGuard';
import { HarnessError } from '../../../harness-error/HarnessError';

target('ReentryGuard', () => {
  describe('初期状態を取得する', () => {
    // UT-RG-001
    it('新規インスタンスのisActive()がfalseであること', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('activate()が呼ばれた場合', () => {
    // UT-RG-010
    it('isActive()がtrueに変わること', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      sut.activate();
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('active状態でdeactivate()が呼ばれた場合', () => {
    // UT-RG-011
    it('isActive()がfalseに戻ること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      sut.deactivate();
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('inactive状態でdeactivate()が呼ばれた場合', () => {
    // UT-RG-012
    it('isActive()がfalseのままであること（冪等性）', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      sut.deactivate(); // 例外なし
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('active状態でisActive()が呼ばれた場合', () => {
    // UT-RG-013
    it('trueを返すこと', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('inactive状態でisActive()が呼ばれた場合', () => {
    // UT-RG-014
    it('falseを返すこと', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('active状態でactivate()が呼ばれた場合（INV-1違反）', () => {
    // UT-RG-020
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      const actual = () => sut.activate();
      // Assert
      expect(actual).toThrow(HarnessError);
    });

    // UT-RG-021
    it('エラーメッセージに「二重activate」または「ReentryGuard」等の識別情報が含まれること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      let caughtError: HarnessError | undefined;
      // Act
      try {
        sut.activate();
      } catch (e) {
        caughtError = e as HarnessError;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/二重activate|ReentryGuard/);
    });
  });

  context('activate → deactivate → activate のシーケンスの場合', () => {
    // UT-RG-030
    it('2回目のactivate()が成功しisActive()がtrueになること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      sut.deactivate();
      // Act
      sut.activate();
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('activate → activate のシーケンスの場合', () => {
    // UT-RG-031
    it('2回目のactivate()でHarnessErrorがthrowされること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      const actual = () => sut.activate();
      // Assert
      expect(actual).toThrow(HarnessError);
    });
  });
});
```

---

### 3.2 `hook-event.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import {
  HookEvent,
  PreToolUseEvent,
  PostToolUseEvent,
  StopEvent,
} from '../../../agent-integration/domain/value-objects/HookEvent';
import { HarnessError } from '../../../harness-error/HarnessError';
import { createPreToolUseEvent, createPostToolUseEvent, createStopEvent } from '../../helpers/test-helpers';

target('HookEvent', () => {
  describe('各Unionバリアントを生成する', () => {
    // UT-HE-001
    it('hookType=pre-tool-useのときPreToolUseEventが生成されること', () => {
      // Arrange
      const input = { hookType: 'pre-tool-use' as const, toolName: 'Write', targetFilePaths: ['src/index.ts'] };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(PreToolUseEvent);
    });

    // UT-HE-002
    it('hookType=post-tool-useのときPostToolUseEventが生成されること', () => {
      // Arrange
      const input = { hookType: 'post-tool-use' as const, toolName: 'Write', affectedFilePaths: ['src/index.ts'] };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(PostToolUseEvent);
    });

    // UT-HE-003
    it('hookType=stopのときStopEventが生成されること', () => {
      // Arrange
      const input = { hookType: 'stop' as const, sessionId: 'sess-001' };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(StopEvent);
    });
  });

  describe('等値性を検証する', () => {
    // UT-HE-010
    it('同一プロパティを持つ2つのPreToolUseEventが等値であること', () => {
      // Arrange
      const a = createPreToolUseEvent({ targetFilePaths: ['src/index.ts'] });
      const b = createPreToolUseEvent({ targetFilePaths: ['src/index.ts'] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HE-011
    it('hookTypeが異なる2つのHookEventが非等値であること', () => {
      // Arrange
      const a = createPreToolUseEvent();
      const b = createStopEvent();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });

    // UT-HE-012
    it('targetFilePathsの順序が異なる2つのPreToolUseEventが非等値であること', () => {
      // Arrange
      const a = createPreToolUseEvent({ targetFilePaths: ['src/a.ts', 'src/b.ts'] });
      const b = createPreToolUseEvent({ targetFilePaths: ['src/b.ts', 'src/a.ts'] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('未定義のhookTypeが渡された場合', () => {
    // UT-HE-020
    it('HarnessErrorまたは型エラーがthrowされること', () => {
      // Arrange
      const input = { hookType: 'unknown' };
      // Act
      const actual = () => HookEvent.create(input as never);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('PreToolUseEventのtargetFilePathsが空配列の場合', () => {
    // UT-HE-021
    it('生成が成功すること（空配列は許容）', () => {
      // Arrange
      const input = { hookType: 'pre-tool-use' as const, toolName: 'Write', targetFilePaths: [] };
      // Act
      const actual = HookEvent.create(input);
      // Assert
      expect(actual).toBeInstanceOf(PreToolUseEvent);
    });
  });
});
```

---

### 3.3 `protected-file-list.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ProtectedFileList } from '../../../agent-integration/domain/value-objects/ProtectedFileList';
import { HarnessError } from '../../../harness-error/HarnessError';
import { createProtectedFileList } from '../../helpers/test-helpers';

target('ProtectedFileList', () => {
  describe('正常なpatternsからProtectedFileListを生成する', () => {
    // UT-PFL-001
    it('2件のpatternsで生成が成功すること', () => {
      // Arrange
      const patterns = ['biome.json', 'tsconfig.json'];
      // Act
      const actual = ProtectedFileList.create({ patterns });
      // Assert
      expect(actual).toBeInstanceOf(ProtectedFileList);
    });

    // UT-PFL-002
    it('1件のpatterns（最小有効）で生成が成功すること', () => {
      // Arrange
      const patterns = ['biome.json'];
      // Act
      const actual = ProtectedFileList.create({ patterns });
      // Assert
      expect(actual).toBeInstanceOf(ProtectedFileList);
    });
  });

  context('patternsが空配列の場合（INV-4違反）', () => {
    // UT-PFL-010
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const patterns: string[] = [];
      // Act
      const actual = () => ProtectedFileList.create({ patterns });
      // Assert
      expect(actual).toThrow(HarnessError);
    });

    // UT-PFL-011
    it('エラーメッセージに「patternsは1件以上」等の識別情報が含まれること', () => {
      // Arrange
      const patterns: string[] = [];
      let caughtError: HarnessError | undefined;
      // Act
      try {
        ProtectedFileList.create({ patterns });
      } catch (e) {
        caughtError = e as HarnessError;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/patternsは1件以上|patterns.*1件/);
    });
  });

  target('matches()', () => {
    describe('完全一致のfilePathをマッチする', () => {
      // UT-PFL-020
      it('patterns=["biome.json"]でfilePath="biome.json"のときtrueを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('biome.json');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-PFL-021
      it('patterns=["biome.json"]でfilePath="tsconfig.json"のときfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('tsconfig.json');
        // Assert
        expect(actual).toBe(false);
      });

      // UT-PFL-022
      it('複数patternsのうち1件一致するfilePathのときtrueを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['.biome.json', 'tsconfig.json', 'package.json']);
        // Act
        const actual = sut.matches('package.json');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-PFL-023
      it('パスプレフィックスがある場合に完全一致しないためfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('src/biome.json');
        // Assert
        expect(actual).toBe(false);
      });
    });

    describe('globパターンでマッチする', () => {
      // UT-PFL-024
      it('patterns=["**/*.json"]でfilePath="src/config.json"のときtrueを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['**/*.json']);
        // Act
        const actual = sut.matches('src/config.json');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-PFL-025
      it('patterns=["**/*.json"]でfilePath="src/config.ts"のときfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['**/*.json']);
        // Act
        const actual = sut.matches('src/config.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });

    context('filePathが空文字の場合（境界値）', () => {
      // UT-PFL-030 / UT-BV-011
      it('falseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('');
        // Assert
        expect(actual).toBe(false);
      });
    });

    context('filePathが大文字の場合（境界値）', () => {
      // UT-PFL-031 / UT-BV-012
      it('大文字小文字を区別してfalseを返すこと', () => {
        // Arrange
        const sut = createProtectedFileList(['biome.json']);
        // Act
        const actual = sut.matches('BIOME.JSON');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe('等値性を検証する', () => {
    // UT-PFL-040
    it('同一patternsを持つ2つのProtectedFileListが等値であること', () => {
      // Arrange
      const a = createProtectedFileList(['biome.json', 'tsconfig.json']);
      const b = createProtectedFileList(['biome.json', 'tsconfig.json']);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-PFL-041
    it('パターン順序が異なる2つのProtectedFileListが非等値であること', () => {
      // Arrange
      const a = createProtectedFileList(['biome.json', 'tsconfig.json']);
      const b = createProtectedFileList(['tsconfig.json', 'biome.json']);
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.4 `hook-translation-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { HookTranslationResult } from '../../../agent-integration/domain/value-objects/HookTranslationResult';
import { HarnessError } from '../../../harness-error/HarnessError';
import { createHookTranslationResult } from '../../helpers/test-helpers';

target('HookTranslationResult', () => {
  describe('正常系で生成する', () => {
    // UT-HTR-001
    it('shouldBlock=trueのブロック結果が生成されること', () => {
      // Arrange
      const input = { shouldBlock: true, cliArgs: [], expectedExitCode: 1 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.shouldBlock).toBe(true);
      expect(actual.expectedExitCode).toBe(1);
    });

    // UT-HTR-002
    it('cliCommandとtimeoutMs指定で生成されること', () => {
      // Arrange
      const input = {
        shouldBlock: false,
        cliCommand: 'harness:lint',
        cliArgs: ['--fast'],
        expectedExitCode: 0,
        timeoutMs: 500,
      };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.cliCommand).toBe('harness:lint');
      expect(actual.timeoutMs).toBe(500);
    });

    // UT-HTR-003
    it('skipReason=HOOK_DISABLEDで生成されること', () => {
      // Arrange
      const input = { shouldBlock: false, skipReason: 'HOOK_DISABLED' as const, cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.skipReason).toBe('HOOK_DISABLED');
    });

    // UT-HTR-004
    it('skipReason=REENTRY_DETECTEDで生成されること', () => {
      // Arrange
      const input = { shouldBlock: false, skipReason: 'REENTRY_DETECTED' as const, cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.skipReason).toBe('REENTRY_DETECTED');
    });

    // UT-HTR-005
    it('timeoutMs省略時にundefinedになること', () => {
      // Arrange
      const input = { shouldBlock: false, cliCommand: 'harness:complete-check', cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = HookTranslationResult.create(input);
      // Assert
      expect(actual.timeoutMs).toBeUndefined();
    });
  });

  context('shouldBlock=trueかつcliCommandが指定されている場合（INV-2違反）', () => {
    // UT-HTR-010 / UT-BV-005
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const input = { shouldBlock: true, cliCommand: 'harness:lint', cliArgs: [], expectedExitCode: 0 };
      // Act
      const actual = () => HookTranslationResult.create(input);
      // Assert
      expect(actual).toThrow(HarnessError);
    });

    // UT-HTR-011
    it('エラーメッセージに「shouldBlock=trueのときcliCommandは設定不可」等の識別情報が含まれること', () => {
      // Arrange
      const input = { shouldBlock: true, cliCommand: 'harness:lint', cliArgs: [], expectedExitCode: 0 };
      let caughtError: HarnessError | undefined;
      // Act
      try {
        HookTranslationResult.create(input);
      } catch (e) {
        caughtError = e as HarnessError;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/shouldBlock.*true.*cliCommand|cliCommand.*設定不可/);
    });
  });

  context('skipReasonがあるかつcliCommandが指定されている場合（INV-3違反）', () => {
    // UT-HTR-020 / UT-BV-006
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const input = {
        shouldBlock: false,
        skipReason: 'HOOK_DISABLED' as const,
        cliCommand: 'harness:lint',
        cliArgs: [],
        expectedExitCode: 0,
      };
      // Act
      const actual = () => HookTranslationResult.create(input);
      // Assert
      expect(actual).toThrow(HarnessError);
    });

    // UT-HTR-021
    it('エラーメッセージに「skipReasonがある場合cliCommandは設定不可」等の識別情報が含まれること', () => {
      // Arrange
      const input = {
        shouldBlock: false,
        skipReason: 'HOOK_DISABLED' as const,
        cliCommand: 'harness:lint',
        cliArgs: [],
        expectedExitCode: 0,
      };
      let caughtError: HarnessError | undefined;
      // Act
      try {
        HookTranslationResult.create(input);
      } catch (e) {
        caughtError = e as HarnessError;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/skipReason.*cliCommand|cliCommand.*設定不可/);
    });
  });

  describe('等値性を検証する', () => {
    // UT-HTR-030
    it('同一フィールドを持つ2つのHookTranslationResultが等値であること', () => {
      // Arrange
      const a = createHookTranslationResult({ cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0 });
      const b = createHookTranslationResult({ cliCommand: 'harness:lint', cliArgs: ['--fast'], expectedExitCode: 0 });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HTR-031
    it('cliArgsの内容が異なる2つのHookTranslationResultが非等値であること', () => {
      // Arrange
      const a = createHookTranslationResult({ cliArgs: ['--fast'] });
      const b = createHookTranslationResult({ cliArgs: ['--full'] });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.5 `fallback-capability-spec.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { FallbackCapabilitySpec } from '../../../agent-integration/domain/value-objects/FallbackCapabilitySpec';
import { HarnessError } from '../../../harness-error/HarnessError';
import { createFallbackCapabilitySpec } from '../../helpers/test-helpers';

target('FallbackCapabilitySpec', () => {
  describe('正常系で生成する', () => {
    // UT-FCS-001
    it('supportedCommands 1件・noAgentApiImports=trueで生成されること', () => {
      // Arrange
      const input = { supportedCommands: ['harness:lint'], noAgentApiImports: true };
      // Act
      const actual = FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual).toBeInstanceOf(FallbackCapabilitySpec);
    });

    // UT-FCS-002
    it('supportedCommands 2件・noAgentApiImports=falseで生成されること', () => {
      // Arrange
      const input = { supportedCommands: ['harness:lint', 'harness:complete-check'], noAgentApiImports: false };
      // Act
      const actual = FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual.supportedCommands).toHaveLength(2);
      expect(actual.noAgentApiImports).toBe(false);
    });

    // UT-FCS-003
    it('supportedCommands 1件（最小有効）で生成されること', () => {
      // Arrange
      const input = { supportedCommands: ['harness:lint'], noAgentApiImports: true };
      // Act
      const actual = FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual.supportedCommands).toHaveLength(1);
    });
  });

  context('supportedCommandsが空配列の場合（INV-5違反）', () => {
    // UT-FCS-010 / UT-BV-003
    it('HarnessErrorがthrowされること', () => {
      // Arrange
      const input = { supportedCommands: [], noAgentApiImports: true };
      // Act
      const actual = () => FallbackCapabilitySpec.create(input);
      // Assert
      expect(actual).toThrow(HarnessError);
    });

    // UT-FCS-011
    it('エラーメッセージに「supportedCommandsは1件以上」等の識別情報が含まれること', () => {
      // Arrange
      const input = { supportedCommands: [], noAgentApiImports: true };
      let caughtError: HarnessError | undefined;
      // Act
      try {
        FallbackCapabilitySpec.create(input);
      } catch (e) {
        caughtError = e as HarnessError;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/supportedCommandsは1件以上|supportedCommands.*1件/);
    });
  });

  describe('等値性を検証する', () => {
    // UT-FCS-020
    it('同一フィールドを持つ2つのFallbackCapabilitySpecが等値であること', () => {
      // Arrange
      const a = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: true });
      const b = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: true });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-FCS-021
    it('noAgentApiImportsが異なる2つのFallbackCapabilitySpecが非等値であること', () => {
      // Arrange
      const a = createFallbackCapabilitySpec({ noAgentApiImports: true });
      const b = createFallbackCapabilitySpec({ noAgentApiImports: false });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.6 `hook-to-cli-translator.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { HookToCliTranslator } from '../../../agent-integration/domain/services/HookToCliTranslator';
import { HarnessError } from '../../../harness-error/HarnessError';
import {
  createPreToolUseEvent,
  createPostToolUseEvent,
  createStopEvent,
  createProtectedFileList,
} from '../../helpers/test-helpers';

/** ポートモックビルダー */
const buildTranslatorPorts = (overrides: {
  isEnabled?: boolean;
  isActive?: boolean;
  commandExists?: boolean;
  protectedPatterns?: string[];
} = {}) => {
  const {
    isEnabled = true,
    isActive = false,
    commandExists = true,
    protectedPatterns = ['biome.json', 'tsconfig.json'],
  } = overrides;

  const configQueryPort = {
    isEnabled: vi.fn().mockReturnValue(isEnabled),
    getProtectedFileList: vi.fn().mockReturnValue(createProtectedFileList(protectedPatterns)),
  };
  const reentryGuardStatePort = {
    isActive: vi.fn().mockReturnValue(isActive),
  };
  const cliCommandRegistryPort = {
    has: vi.fn().mockReturnValue(commandExists),
    get: vi.fn().mockReturnValue(commandExists ? 'harness:lint' : undefined),
  };

  return { configQueryPort, reentryGuardStatePort, cliCommandRegistryPort };
};

target('HookToCliTranslator', () => {
  target('translate()', () => {
    describe('PreToolUseEventを変換する', () => {
      // UT-HTC-001
      it('protectedファイルに一致するtargetFilePathsのとき shouldBlock=true を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ protectedPatterns: ['biome.json'] });
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: ['biome.json'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(true);
        expect(actual.cliCommand).toBeUndefined();
      });

      // UT-HTC-002
      it('protectedファイルに一致しないtargetFilePathsのとき shouldBlock=false を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ protectedPatterns: ['biome.json'] });
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
      });

      // UT-HTC-003
      it('targetFilePathsの1件がprotectedに一致するとき shouldBlock=true を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ protectedPatterns: ['biome.json'] });
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: ['src/app.ts', 'biome.json'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(true);
      });

      // UT-HTC-004 / UT-BV-008
      it('targetFilePathsが空配列のとき shouldBlock=false を返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts();
        const sut = new HookToCliTranslator(ports);
        const event = createPreToolUseEvent({ targetFilePaths: [] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
      });
    });

    describe('PostToolUseEventを変換する', () => {
      // UT-HTC-010
      it('hook有効のとき cliCommand=harness:lint のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: true });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent({ affectedFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.cliCommand).toBe('harness:lint');
        expect(actual.expectedExitCode).toBe(0);
      });

      // UT-HTC-011 / UT-BV-009
      it('hook無効のとき skipReason=HOOK_DISABLED のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: false });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent({ affectedFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.skipReason).toBe('HOOK_DISABLED');
      });
    });

    describe('StopEventを変換する', () => {
      // UT-HTC-020
      it('ReentryGuard非active時に cliCommand=harness:complete-check のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isActive: false });
        const sut = new HookToCliTranslator(ports);
        const event = createStopEvent('sess-001');
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.cliCommand).toBe('harness:complete-check');
        expect(actual.cliArgs).toEqual([]);
        expect(actual.expectedExitCode).toBe(0);
      });

      // UT-HTC-021 / UT-BV-010
      it('ReentryGuard active時に skipReason=REENTRY_DETECTED のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isActive: true });
        const sut = new HookToCliTranslator(ports);
        const event = createStopEvent('sess-001');
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.skipReason).toBe('REENTRY_DETECTED');
      });
    });

    context('CliCommandRegistryPortに未登録コマンドが指定された場合', () => {
      // UT-HTC-030
      it('HarnessErrorがthrowされること（コマンド未登録エラー）', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: true, commandExists: false });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent();
        // Act
        const actual = () => sut.translate(event);
        // Assert
        expect(actual).toThrow(HarnessError);
      });
    });
  });
});
```

---

### 3.7 `fallback-verification-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { FallbackVerificationService } from '../../../agent-integration/domain/services/FallbackVerificationService';
import { HarnessError } from '../../../harness-error/HarnessError';
import { createFallbackCapabilitySpec } from '../../helpers/test-helpers';

/** ポートモックビルダー */
const buildVerificationPorts = (overrides: {
  detectedImports?: string[];
  registeredCommands?: string[];
} = {}) => {
  const { detectedImports = [], registeredCommands = ['harness:lint', 'harness:complete-check'] } = overrides;

  const importAnalyzerPort = {
    detectAgentApiImports: vi.fn().mockReturnValue(detectedImports),
  };
  const cliCommandRegistryPort = {
    has: vi.fn((cmd: string) => registeredCommands.includes(cmd)),
  };

  return { importAnalyzerPort, cliCommandRegistryPort };
};

target('FallbackVerificationService', () => {
  target('verify()', () => {
    describe('正常系でviolationsなしを返す', () => {
      // UT-FVS-001
      it('エージェントAPIのimportなし・全コマンド登録済みのとき violations=[] を返すこと', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: [], registeredCommands: ['harness:lint'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: true });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(0);
      });

      // UT-FVS-002
      it('noAgentApiImports=falseのとき importチェックをスキップし violations=[] を返すこと', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: ['@anthropic-ai/claude-code'], registeredCommands: ['harness:lint'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ supportedCommands: ['harness:lint'], noAgentApiImports: false });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    describe('importチェックのviolationを検出する', () => {
      // UT-FVS-010
      it('@anthropic-ai/claude-codeのimportを検出したとき violations に1件以上含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: ['module-a:@anthropic-ai/claude-code'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ noAgentApiImports: true });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual[0]).toBeInstanceOf(HarnessError);
      });

      // UT-FVS-011
      it('複数モジュールでエージェントAPI使用時にモジュールごとに violations が追加されること', () => {
        // Arrange
        const ports = buildVerificationPorts({
          detectedImports: ['module-a:@anthropic-ai/claude-code', 'module-b:@anthropic-ai/claude-code'],
        });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ noAgentApiImports: true });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(2);
      });

      // UT-FVS-012 / UT-BV-014
      it('noAgentApiImports=falseのとき importチェックがスキップされ violations=[] であること', () => {
        // Arrange
        const ports = buildVerificationPorts({ detectedImports: ['module-a:@anthropic-ai/claude-code'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({ noAgentApiImports: false });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    describe('commandName存在確認のviolationを検出する', () => {
      // UT-FVS-020
      it('harness:unknownが未登録のとき violations に1件のHarnessErrorが含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({ registeredCommands: ['harness:lint'] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({
          supportedCommands: ['harness:lint', 'harness:unknown'],
          noAgentApiImports: false,
        });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0]).toBeInstanceOf(HarnessError);
      });

      // UT-FVS-021
      it('全コマンド未登録のとき violations に2件のHarnessErrorが含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({ registeredCommands: [] });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({
          supportedCommands: ['harness:lint', 'harness:complete-check'],
          noAgentApiImports: false,
        });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual).toHaveLength(2);
      });
    });

    describe('複合violationを検出する', () => {
      // UT-FVS-030
      it('importあり・コマンド未登録のとき複数種別の violations が含まれること', () => {
        // Arrange
        const ports = buildVerificationPorts({
          detectedImports: ['module-a:@anthropic-ai/claude-code'],
          registeredCommands: [],
        });
        const sut = new FallbackVerificationService(ports);
        const spec = createFallbackCapabilitySpec({
          supportedCommands: ['harness:unknown'],
          noAgentApiImports: true,
        });
        // Act
        const actual = sut.verify(spec);
        // Assert
        expect(actual.length).toBeGreaterThanOrEqual(2);
        // importエラーとcommandエラーの両方が含まれる
        expect(actual.every((v) => v instanceof HarnessError)).toBe(true);
      });
    });
  });
});
```

---

## 4. モック戦略

### 4.1 エンティティ・VO のモック方針

エンティティ（ReentryGuard）と値オブジェクト（HookEvent、ProtectedFileList、HookTranslationResult、FallbackCapabilitySpec）は **モック不使用**。
実体を直接 `new` またはファクトリメソッド（`.create()`）で生成する。

### 4.2 HookToCliTranslator のポートモック

| ポート | モック対象メソッド | 設定方法 |
|---|---|---|
| `ConfigQueryPort` | `isEnabled(hookType)` | `vi.fn().mockReturnValue(true/false)` |
| `ConfigQueryPort` | `getProtectedFileList()` | `vi.fn().mockReturnValue(createProtectedFileList(...))` |
| `ReentryGuardStatePort` | `isActive()` | `vi.fn().mockReturnValue(true/false)` |
| `CliCommandRegistryPort` | `has(command)` | `vi.fn().mockReturnValue(true/false)` |
| `CliCommandRegistryPort` | `get(command)` | `vi.fn().mockReturnValue(commandStr/undefined)` |

- `ProtectedFileList.matches()` は VO の実体を使用（micromatch ライブラリへの依存はポートではないため）
- 各テストで独立したモックインスタンスを生成し、テスト間の状態汚染を防ぐ

### 4.3 FallbackVerificationService のポートモック

| ポート | モック対象メソッド | 設定方法 |
|---|---|---|
| `ImportAnalyzerPort` | `detectAgentApiImports()` | `vi.fn().mockReturnValue(string[])` |
| `CliCommandRegistryPort` | `has(command)` | `vi.fn((cmd) => registeredCommands.includes(cmd))` |

- `FallbackVerificationService.verify()` は **例外をスローしない** 設計。違反は `HarnessError[]` として収集して返す。
- 複合 violation テストでは importエラーと commandエラーが **両方** 含まれることを検証する。

---

## 5. 境界値テスト一覧

| ケースID | テストファイル | 対象 | 入力 | 期待結果 |
|---------|---|---|---|---|
| UT-BV-001 | `protected-file-list.test.ts` | ProtectedFileList | `patterns: []`（空配列） | HarnessError（INV-4違反） |
| UT-BV-002 | `protected-file-list.test.ts` | ProtectedFileList | `patterns: ['a']`（1件） | 生成成功（最小有効） |
| UT-BV-003 | `fallback-capability-spec.test.ts` | FallbackCapabilitySpec | `supportedCommands: []`（空配列） | HarnessError（INV-5違反） |
| UT-BV-004 | `fallback-capability-spec.test.ts` | FallbackCapabilitySpec | `supportedCommands: ['cmd']`（1件） | 生成成功（最小有効） |
| UT-BV-005 | `hook-translation-result.test.ts` | HookTranslationResult | `shouldBlock: true` かつ `cliCommand: 'harness:lint'` | HarnessError（INV-2違反） |
| UT-BV-006 | `hook-translation-result.test.ts` | HookTranslationResult | `skipReason: 'HOOK_DISABLED'` かつ `cliCommand: 'harness:lint'` | HarnessError（INV-3違反） |
| UT-BV-007 | `reentry-guard.test.ts` | ReentryGuard | active状態で `activate()` | HarnessError（INV-1違反） |
| UT-BV-008 | `hook-to-cli-translator.test.ts` | HookToCliTranslator | `targetFilePaths: []`（空配列）の PreToolUseEvent | `shouldBlock: false`（ブロックしない） |
| UT-BV-009 | `hook-to-cli-translator.test.ts` | HookToCliTranslator | HOOK_DISABLEDの PostToolUseEvent | `skipReason: 'HOOK_DISABLED'` |
| UT-BV-010 | `hook-to-cli-translator.test.ts` | HookToCliTranslator | ReentryGuard active時の StopEvent | `skipReason: 'REENTRY_DETECTED'` |
| UT-BV-011 | `protected-file-list.test.ts` | `ProtectedFileList.matches()` | `filePath: ''`（空文字） | `false` |
| UT-BV-012 | `protected-file-list.test.ts` | `ProtectedFileList.matches()` | `filePath: 'BIOME.JSON'`（大文字） | `false`（大文字小文字を区別する） |
| UT-BV-013 | `hook-translation-result.test.ts` | HookTranslationResult | `timeoutMs: 0` | 実装依存（設計上は不正値として扱うことを推奨） |
| UT-BV-014 | `fallback-verification-service.test.ts` | FallbackVerificationService | `noAgentApiImports: false` でimportあり | importチェックスキップ（violations なし） |

---

## 6. テスト実行コマンド

```bash
# agent-integration ユニットテスト全件実行
npx vitest run scripts/harness/__tests__/unit/agent-integration

# ファイル別実行
npx vitest run scripts/harness/__tests__/unit/agent-integration/reentry-guard.test.ts
npx vitest run scripts/harness/__tests__/unit/agent-integration/hook-event.test.ts
npx vitest run scripts/harness/__tests__/unit/agent-integration/protected-file-list.test.ts
npx vitest run scripts/harness/__tests__/unit/agent-integration/hook-translation-result.test.ts
npx vitest run scripts/harness/__tests__/unit/agent-integration/fallback-capability-spec.test.ts
npx vitest run scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts
npx vitest run scripts/harness/__tests__/unit/agent-integration/fallback-verification-service.test.ts

# ウォッチモード（TDD実装時）
npx vitest scripts/harness/__tests__/unit/agent-integration
```
