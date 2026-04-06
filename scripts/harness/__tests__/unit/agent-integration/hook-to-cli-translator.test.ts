// @unit agent-integration
// @layer domain
// @story H11-02

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import {
  HookToCliTranslator,
  AsyncHookToCliTranslator,
} from '../../../agent-integration/domain/services/hook-to-cli-translator.js';
import { CommandNotRegisteredError } from '../../../agent-integration/domain/services/hook-to-cli-translator.js';
import { PhaseGateQueryResult } from '../../../agent-integration/domain/value-objects/phase-gate-query-result.js';
import {
  createPreToolUseEvent,
  createPostToolUseEvent,
  createStopEvent,
  createProtectedFileList,
  createProjectPaths,
} from '../../helpers/test-helpers.js';

/** ポートモックビルダー */
const buildTranslatorPorts = (overrides: {
  isEnabled?: boolean;
  isActive?: boolean;
  commandExists?: boolean;
  protectedPatterns?: string[];
  protectedExclusions?: string[];
  relaxedGates?: string[];
  phaseGateResult?: { passed: boolean; blockers: string[]; warnings: string[] };
  projectPaths?: ReturnType<typeof createProjectPaths>;
} = {}) => {
  const {
    isEnabled = true,
    isActive = false,
    commandExists = true,
    protectedPatterns = ['biome.json', 'tsconfig.json'],
    protectedExclusions = [],
    relaxedGates = [],
    phaseGateResult = { passed: true, blockers: [], warnings: [] },
    projectPaths = createProjectPaths(),
  } = overrides;

  const configQueryPort = {
    isEnabled: vi.fn().mockReturnValue(isEnabled),
    isHookEnabled: vi.fn().mockResolvedValue(isEnabled),
    getProtectedFileList: vi.fn().mockReturnValue(
      protectedPatterns.length > 0
        ? createProtectedFileList(protectedPatterns)
        : createProtectedFileList(['__placeholder__']),
    ),
    getProtectedFilePatterns: vi.fn().mockResolvedValue(protectedPatterns),
    getProtectedFileExclusions: vi.fn().mockResolvedValue(protectedExclusions),
    getRelaxedGates: vi.fn().mockResolvedValue(relaxedGates),
    getProjectPaths: vi.fn().mockReturnValue(projectPaths),
  };
  const reentryGuardStatePort = {
    isActive: vi.fn().mockReturnValue(isActive),
  };
  const cliCommandRegistryPort = {
    has: vi.fn().mockReturnValue(commandExists),
    hasCommand: vi.fn().mockResolvedValue(commandExists),
    get: vi.fn().mockReturnValue(commandExists ? 'phasegate:lint' : undefined),
  };
  const phaseGateQueryPort = {
    checkGate: vi.fn().mockResolvedValue(
      PhaseGateQueryResult.create(
        phaseGateResult.passed,
        phaseGateResult.blockers,
        phaseGateResult.warnings,
      ),
    ),
  };

  return {
    configQueryPort,
    reentryGuardStatePort,
    cliCommandRegistryPort,
    phaseGateQueryPort,
  };
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
        expect(actual.blockMetadata?.reason).toBe('PROTECTED_FILE');
        expect(actual.blockMetadata?.blockedFilePath).toBe('biome.json');
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
      it('hook有効のとき cliCommand=phasegate:lint のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isEnabled: true });
        const sut = new HookToCliTranslator(ports);
        const event = createPostToolUseEvent({ affectedFilePaths: ['src/app.ts'] });
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.cliCommand).toBe('phasegate:lint');
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
      it('ReentryGuard非active時に cliCommand=phasegate:complete-check のHookTranslationResultを返すこと', () => {
        // Arrange
        const ports = buildTranslatorPorts({ isActive: false });
        const sut = new HookToCliTranslator(ports);
        const event = createStopEvent('sess-001');
        // Act
        const actual = sut.translate(event);
        // Assert
        expect(actual.shouldBlock).toBe(false);
        expect(actual.cliCommand).toBe('phasegate:complete-check');
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
        expect(actual).toThrow(CommandNotRegisteredError);
      });
    });

    describe('AsyncHookToCliTranslator Step 2: フェーズゲートチェックを行う', () => {
      context('スコープ外ファイル（src/index.ts）が変更対象の場合', () => {
        // UT-HTC-040
        it('WriteTargetScope.fromPath()がnullのとき フェーズゲートチェックをスキップしshouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts();
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({ targetFilePaths: ['src/index.ts'] });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).not.toHaveBeenCalled();
        });
      });

      context('フェーズゲートに合格している設計書配下ファイルが変更対象の場合', () => {
        // UT-HTC-041
        it('フェーズゲートがpassed=trueのとき shouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: true, blockers: [], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            targetFilePaths: ['docs/product/construction/agent-integration/logical_design.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });

      context('フェーズゲートに不合格の設計書配下ファイルが変更対象の場合', () => {
        // UT-HTC-042
        it('blockersがあるとき shouldBlock=trueとフェーズゲートメタデータを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: false, blockers: ['logical_design.md未作成'], warnings: ['推奨依存未充足'] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            targetFilePaths: ['docs/product/construction/agent-integration/logical_design.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(true);
          expect(actual.expectedExitCode).toBe(2);
          expect(actual.blockMetadata?.reason).toBe('PHASE_GATE');
          expect(actual.blockMetadata?.phaseGateBlockers).toEqual(['logical_design.md未作成']);
          expect(actual.blockMetadata?.phaseGateWarnings).toEqual(['推奨依存未充足']);
          expect(actual.blockMetadata?.unitId).toBe('agent-integration');
          expect(actual.blockMetadata?.scopeLevel).toBe(2);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });

      context('warningsのみ存在する設計書配下ファイルが変更対象の場合', () => {
        // UT-HTC-043
        it('passed=trueでwarningsがあっても shouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: true, blockers: [], warnings: ['unit_test_design.md推奨'] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            targetFilePaths: ['docs/product/construction/agent-integration/unit_test_logic.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });

      context('level:1の共有計画配下ファイルが変更対象の場合', () => {
        // UT-HTC-044
        it('level:1のWriteTargetScopeでcheckGateが呼ばれること', async () => {
          // Arrange
          const ports = buildTranslatorPorts();
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            targetFilePaths: ['docs/inception/_shared/product_overview_plan.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
          expect(ports.phaseGateQueryPort.checkGate.mock.calls[0]?.[0]).toMatchObject({ level: 1 });
        });
      });

      context('複数targetFilePathsのうちスコープ検出された1件が不合格の場合', () => {
        // UT-HTC-045
        it('最初に見つかったスコープのフェーズゲートが不合格なら shouldBlock=trueを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: false, blockers: ['domain_model.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            targetFilePaths: ['src/index.ts', 'docs/product/construction/agent-integration/domain_model.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(true);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });

      context('Readツールでフェーズゲート対象ファイルにアクセスする場合', () => {
        // UT-HTC-050 (BUG-03)
        it('toolName=Readのとき フェーズゲートチェックをスキップしshouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: false, blockers: ['logical_design.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Read',
            targetFilePaths: ['scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).not.toHaveBeenCalled();
        });
      });

      context('Grepツールでフェーズゲート対象ファイルにアクセスする場合', () => {
        // UT-HTC-051 (BUG-03)
        it('toolName=Grepのとき フェーズゲートチェックをスキップしshouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: false, blockers: ['domain_model.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Grep',
            targetFilePaths: ['scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).not.toHaveBeenCalled();
        });
      });

      context('Globツールでフェーズゲート対象ファイルにアクセスする場合', () => {
        // UT-HTC-052 (BUG-03)
        it('toolName=Globのとき フェーズゲートチェックをスキップしshouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts();
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Glob',
            targetFilePaths: ['scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).not.toHaveBeenCalled();
        });
      });

      context('Writeツールでフェーズゲート不合格ファイルに書き込む場合', () => {
        // UT-HTC-053 (BUG-03 — Writeは従来通りブロックされることを確認)
        it('toolName=Writeのとき フェーズゲートチェックが実行されshouldBlock=trueを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: false, blockers: ['logical_design.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Write',
            targetFilePaths: ['docs/product/construction/agent-integration/logical_design.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(true);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });

      context('Editツールでフェーズゲート不合格ファイルに書き込む場合', () => {
        // UT-HTC-054 (BUG-03 — Editは従来通りブロックされることを確認)
        it('toolName=Editのとき フェーズゲートチェックが実行されshouldBlock=trueを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            phaseGateResult: { passed: false, blockers: ['domain_model.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Edit',
            targetFilePaths: ['docs/product/construction/agent-integration/domain_model.md'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(true);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });

      context('__tests__配下のみが変更対象の場合', () => {
        // UT-HTC-046 / UT-BV-023
        it('__tests__配下のパスがすべてfromPath()でnullになるとき shouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts();
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            targetFilePaths: ['scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).not.toHaveBeenCalled();
        });
      });
    });

    describe('AsyncHookToCliTranslator Step 3: quickMode.relaxedGates によるフェーズゲートスキップ', () => {
      context('relaxedGatesに"phase-gate"が含まれている場合', () => {
        // UT-HTC-075
        it('フェーズゲートチェックをスキップしshouldBlock=falseを返すこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            relaxedGates: ['phase-gate'],
            phaseGateResult: { passed: false, blockers: ['logical_design.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Write',
            targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
          expect(ports.phaseGateQueryPort.checkGate).not.toHaveBeenCalled();
        });
      });

      context('relaxedGatesが空の場合', () => {
        // UT-HTC-076
        it('従来通りフェーズゲートチェックが実行されること', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            relaxedGates: [],
            phaseGateResult: { passed: false, blockers: ['logical_design.md未作成'], warnings: [] },
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({
            toolName: 'Write',
            targetFilePaths: ['scripts/harness/agent-integration/domain/value-objects/example.ts'],
          });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(true);
          expect(ports.phaseGateQueryPort.checkGate).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('AsyncHookToCliTranslator Step 1: 保護ファイル除外設定を適用する', () => {
      context('除外設定にtsconfig.jsonが含まれている場合', () => {
        // UT-HTC-070
        it('tsconfig.jsonへの書き込みがブロックされないこと', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            protectedPatterns: [],
            protectedExclusions: ['tsconfig.json'],
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({ targetFilePaths: ['tsconfig.json'] });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(false);
        });
      });

      context('除外設定にtsconfig.jsonが含まれていない場合', () => {
        // UT-HTC-071
        it('tsconfig.jsonへの書き込みが引き続きブロックされること', async () => {
          // Arrange
          const ports = buildTranslatorPorts({
            protectedPatterns: [],
            protectedExclusions: [],
          });
          const sut = new AsyncHookToCliTranslator({
            configQueryPort: ports.configQueryPort as any,
            reentryGuard: { isActive: vi.fn().mockReturnValue(false) } as any,
            cliCommandRegistryPort: ports.cliCommandRegistryPort,
            phaseGateQueryPort: ports.phaseGateQueryPort as any,
          });
          const event = createPreToolUseEvent({ targetFilePaths: ['tsconfig.json'] });

          // Act
          const actual = await sut.translate(event);

          // Assert
          expect(actual.shouldBlock).toBe(true);
        });
      });
    });
  });
});
