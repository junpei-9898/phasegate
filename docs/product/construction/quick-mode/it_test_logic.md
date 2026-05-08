# ITテストロジック設計: quick-mode

@story-id H10-01
@story-id H10-02
@story-id H10-03
> **作成日**: 2026-03-19
> **対象Unit**: quick-mode
> **参照計画**: `docs/inception/quick-mode/it_test_logic_plan.md`
> **参照設計**: `docs/product/construction/quick-mode/it_test_design.md`

---

## 1. テストファイル構成

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/quick-mode/usecases/judge-quick-mode-eligibility-usecase.test.ts` | JudgeQuickModeEligibilityUseCase | 12 |
| `scripts/harness/__tests__/integration/quick-mode/usecases/build-relaxation-profile-usecase.test.ts` | BuildRelaxationProfileUseCase | 7 |
| `scripts/harness/__tests__/integration/quick-mode/usecases/execute-quick-ci-check-usecase.test.ts` | ExecuteQuickCiCheckUseCase | 8 |
| `scripts/harness/__tests__/integration/quick-mode/git-diff-changed-files-adapter.test.ts` | GitDiffChangedFilesAdapter | 10 |
| `scripts/harness/__tests__/integration/quick-mode/harness-config-quick-mode-config-adapter.test.ts` | HarnessConfigQuickModeConfigAdapter | 7 |
| `scripts/harness/__tests__/integration/quick-mode/validator-system-validator-id-registry-adapter.test.ts` | ValidatorSystemValidatorIdRegistryAdapter | 6 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/ci-check-quick-mode-handler.test.ts` | CiCheckQuickModeHandler | 12 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/human-quick-mode-formatter.test.ts` | HumanQuickModeFormatter | 5 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/agent-quick-mode-formatter.test.ts` | AgentQuickModeFormatter | 4 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/json-quick-mode-formatter.test.ts` | JsonQuickModeFormatter | 4 |

---

## 2. テストヘルパー・シードデータ

### 2.1 共通ファクトリ・ヘルパー

各テストファイルでインライン定義する共通ファクトリ関数。

```typescript
// デフォルトの QuickModeConfig を生成する
function createDefaultQuickModeConfig() {
  return {
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L3-001'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  };
}

// eligible=true の QuickModeDecisionContract を生成する
function createApprovedDecision() {
  return {
    eligibility: {
      eligible: true,
      reason: 'すべてのファイルが許可カテゴリ内です',
    },
    relaxationProfile: {
      levelDependencyRelaxed: false,
      l1: { all: true },
      l2: {
        maintained: ['L2-002', 'L2-003'],
        skipped: ['L2-001'],
      },
      l3: {
        maintained: ['L3-001'],
        skipped: ['L3-002', 'L3-003', 'L3-004'],
      },
      l4: { all: false },
      phaseExecution: { twoPhaseRequired: false },
    },
  };
}

// eligible=false の QuickModeDecisionContract を生成する
function createRejectedDecision(rule = 'MIXED_CHANGES') {
  return {
    eligibility: {
      eligible: false,
      reason: `${rule} ルールにより拒否されました`,
      rejectionRule: rule,
      rejectedFiles: [{ filePath: 'src/domain/vo.ts', changeKind: 'MODIFY' }],
    },
    relaxationProfile: undefined,
  };
}

// 全 ValidatorId 一覧（18件）
const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
  'L2-001', 'L2-002', 'L2-003',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003',
];
```

### 2.2 Portモックパターン

```typescript
// ChangedFilesPort モック（bugfix 相当の単一ファイル）
const mockChangedFilesPort = {
  getChangedFiles: vi.fn().mockResolvedValue([
    { filePath: 'src/foo.ts', changeKind: 'MODIFY' },
  ]),
};

// QuickModeConfigPort モック（デフォルト設定）
const mockQuickModeConfigPort = {
  getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
};

// ValidatorIdRegistryPort モック（全18件）
const mockValidatorIdRegistryPort = {
  getAllValidatorIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
};

// 各テスト前に呼び出し記録をリセットする
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 2.3 fixtureファイル一覧

配置先: `scripts/harness/__tests__/integration/quick-mode/fixtures/`

| ファイル名 | 内容 | 用途 |
|---|---|---|
| `git-diff-fixture-modify.txt` | `"M\tscripts/harness/quick-mode/domain/value-objects/changed-file.ts\n"` | IT-REPO-Git-001 |
| `git-diff-fixture-add.txt` | `"A\tsrc/new-feature.ts\n"` | IT-REPO-Git-002 |
| `git-diff-fixture-delete.txt` | `"D\tsrc/old-feature.ts\n"` | IT-REPO-Git-003 |
| `git-diff-fixture-rename.txt` | `"R100\tsrc/old.ts\tsrc/new.ts\n"` | IT-REPO-Git-004 |
| `git-diff-fixture-mixed.txt` | `"M\tsrc/a.ts\nA\tsrc/b.ts\nD\tsrc/c.ts\n"` | IT-REPO-Git-005 |
| `harness-config-with-quickmode.json` | quickModeセクションを含む phasegate.config.json | IT-REPO-Config-001, 003 |
| `harness-config-without-quickmode.json` | quickModeセクションなしの phasegate.config.json | IT-REPO-Config-002 |
| `harness-config-invalid-quickmode.json` | allowedCategoriesに'domain'を含む／空配列のphasegate.config.json | IT-REPO-Config-006, 007 |
| `quick-mode-decision-approved.fixture.ts` | eligible=trueのQuickModeDecisionContract固定値（`createApprovedDecision()` 出力） | Formatter系テスト共通 |
| `quick-mode-decision-rejected.fixture.ts` | eligible=false（MIXED_CHANGES）のQuickModeDecisionContract固定値 | Formatter系テスト共通 |

---

## 3. UseCaseテスト詳細ロジック

### 3.1 JudgeQuickModeEligibilityUseCase（12件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/usecases/judge-quick-mode-eligibility-usecase.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { JudgeQuickModeEligibilityUseCase } from '../../../../scripts/harness/quick-mode/application/usecases/judge-quick-mode-eligibility-usecase';
import { QuickModeJudgmentEngine } from '../../../../scripts/harness/quick-mode/domain/services/quick-mode-judgment-engine';

target('JudgeQuickModeEligibilityUseCase', () => {

  describe('allowedCategoriesのみのファイル変更でeligible=trueが返る', () => {
    context('changedFilesPortからファイルを取得する場合', () => {
      // IT-UC-Judge-001
      it('bugfix相当のMODIFYファイルでeligible=trueが返る', async () => {
        // Arrange
        const mockChangedFilesPort = {
          getChangedFiles: vi.fn().mockResolvedValue([
            { filePath: 'src/foo.ts', changeKind: 'MODIFY' },
          ]),
        };
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: mockChangedFilesPort,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({ changedFiles: undefined });

        // Assert
        expect(actual.eligible).toBe(true);
        expect(actual.reason).toBeTruthy();
      });
    });

    context('changedFilesを明示指定する場合', () => {
      // IT-UC-Judge-002
      it('changedFilesを明示指定したとき、ポートを呼ばずに入力値で判定する', async () => {
        // Arrange
        const mockChangedFilesPort = {
          getChangedFiles: vi.fn(),
        };
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: mockChangedFilesPort,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({
          changedFiles: [{ filePath: 'docs/README.md', changeKind: 'MODIFY' }],
        });

        // Assert
        expect(actual.eligible).toBe(true);
        expect(mockChangedFilesPort.getChangedFiles).not.toHaveBeenCalled();
      });

      // IT-UC-Judge-003
      it('テストファイルのみの変更でeligible=trueが返る', async () => {
        // Arrange
        const mockChangedFilesPort = {
          getChangedFiles: vi.fn().mockResolvedValue([
            { filePath: 'src/foo.test.ts', changeKind: 'MODIFY' },
          ]),
        };
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: mockChangedFilesPort,
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({ changedFiles: undefined });

        // Assert
        expect(actual.eligible).toBe(true);
      });

      // IT-UC-Judge-004
      it('空のchangedFilesリストでeligible=trueが返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() },
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({ changedFiles: [] });

        // Assert
        expect(actual.eligible).toBe(true);
      });
    });
  });

  describe('3拒否ルールによる異常系', () => {
    context('domain/配下のMODIFYファイルが含まれる場合', () => {
      // IT-UC-Judge-005
      it('MIXED_CHANGES拒否が返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() },
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({
          changedFiles: [{
            filePath: 'scripts/harness/quick-mode/domain/value-objects/changed-file.ts',
            changeKind: 'MODIFY',
          }],
        });

        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
        expect(actual.rejectedFiles.length).toBeGreaterThanOrEqual(1);
      });

      // IT-UC-Judge-006
      it('domain/配下のCREATEファイルはMIXED_CHANGESが先に検出される', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() },
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({
          changedFiles: [{
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }],
        });

        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // IT-UC-Judge-007
      it('port.tsファイルの変更でMIXED_CHANGESまたはAPI_CONTRACT拒否が返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() },
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({
          changedFiles: [{
            filePath: 'scripts/harness/quick-mode/domain/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }],
        });

        // Assert
        expect(actual.eligible).toBe(false);
        expect(['MIXED_CHANGES', 'API_CONTRACT']).toContain(actual.rejectionRule);
        expect(actual.rejectedFiles.length).toBeGreaterThanOrEqual(1);
      });

      // IT-UC-Judge-008
      it('allowedCategories内ファイルとdomain/配下ファイルが混在するとMIXED_CHANGES拒否が返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() },
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({
          changedFiles: [
            { filePath: 'docs/README.md', changeKind: 'MODIFY' },
            { filePath: 'scripts/harness/quick-mode/domain/services/engine.ts', changeKind: 'MODIFY' },
          ],
        });

        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // IT-UC-Judge-009
      it('bugfixとdocs混在（両方allowedCategories内）でeligible=trueが返る', async () => {
        // Arrange
        const mockQuickModeConfigPort = {
          getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
        };
        const engine = new QuickModeJudgmentEngine();
        const usecase = new JudgeQuickModeEligibilityUseCase({
          changedFilesPort: { getChangedFiles: vi.fn() },
          quickModeConfigPort: mockQuickModeConfigPort,
          judgmentEngine: engine,
        });

        // Act
        const actual = await usecase.execute({
          changedFiles: [
            { filePath: 'src/util.ts', changeKind: 'MODIFY' },
            { filePath: 'docs/guide.md', changeKind: 'MODIFY' },
          ],
        });

        // Assert
        expect(actual.eligible).toBe(true);
      });
    });
  });

  describe('Portエラーの伝播', () => {
    // IT-UC-Judge-010
    it('changedFilesPortがエラーを投げた場合、UseCaseがそのエラーを伝播する', async () => {
      // Arrange
      const mockChangedFilesPort = {
        getChangedFiles: vi.fn().mockRejectedValue(new Error('git error')),
      };
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const engine = new QuickModeJudgmentEngine();
      const usecase = new JudgeQuickModeEligibilityUseCase({
        changedFilesPort: mockChangedFilesPort,
        quickModeConfigPort: mockQuickModeConfigPort,
        judgmentEngine: engine,
      });

      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined })).rejects.toThrow('git error');
    });

    // IT-UC-Judge-011
    it('quickModeConfigPortがエラーを投げた場合、UseCaseがそのエラーを伝播する', async () => {
      // Arrange
      const mockChangedFilesPort = {
        getChangedFiles: vi.fn().mockResolvedValue([
          { filePath: 'src/foo.ts', changeKind: 'MODIFY' },
        ]),
      };
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockImplementation(() => {
          throw new Error('config error');
        }),
      };
      const engine = new QuickModeJudgmentEngine();
      const usecase = new JudgeQuickModeEligibilityUseCase({
        changedFilesPort: mockChangedFilesPort,
        quickModeConfigPort: mockQuickModeConfigPort,
        judgmentEngine: engine,
      });

      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined })).rejects.toThrow('config error');
    });
  });

  describe('出力DTO形式', () => {
    // IT-UC-Judge-012
    it('返却されるDTOがObject.freeze済みで不変であること', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const engine = new QuickModeJudgmentEngine();
      const usecase = new JudgeQuickModeEligibilityUseCase({
        changedFilesPort: { getChangedFiles: vi.fn() },
        quickModeConfigPort: mockQuickModeConfigPort,
        judgmentEngine: engine,
      });

      // Act
      const actual = await usecase.execute({ changedFiles: [] });

      // Assert
      expect(Object.isFrozen(actual)).toBe(true);
    });
  });
});
```

---

### 3.2 BuildRelaxationProfileUseCase（7件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/usecases/build-relaxation-profile-usecase.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { BuildRelaxationProfileUseCase } from '../../../../scripts/harness/quick-mode/application/usecases/build-relaxation-profile-usecase';
import { ValidatorRelaxationService } from '../../../../scripts/harness/quick-mode/domain/services/validator-relaxation-service';

target('BuildRelaxationProfileUseCase', () => {

  describe('eligible=trueのeligibilityからプロファイルを生成する', () => {
    // IT-UC-Build-001
    it('eligible=trueのeligibilityを渡すとデフォルト緩和プロファイルが生成される', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act
      const actual = await usecase.execute({
        eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' },
      });

      // Assert
      expect(actual.levelDependencyRelaxed).toBe(false);
      expect(actual.l1.all).toBe(true);
      expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
      expect(actual.l2.skipped).toEqual(expect.arrayContaining(['L2-001']));
      expect(actual.l3.maintained).toEqual(expect.arrayContaining(['L3-001']));
      expect(actual.l3.skipped).toEqual(expect.arrayContaining(['L3-002', 'L3-003', 'L3-004']));
      expect(actual.l4.all).toBe(false);
      expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
    });

    // IT-UC-Build-002
    it('返却されるDTOがINV-P1〜INV-P6の不変条件をすべて満たすこと', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act
      const actual = await usecase.execute({
        eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' },
      });

      // Assert: INV-P1
      expect(actual.levelDependencyRelaxed).toBe(false);
      // INV-P2
      expect(actual.l1.all).toBe(true);
      // INV-P3
      expect(actual.l4.all).toBe(false);
      // INV-P4
      expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      // INV-P5: l2.maintained ∪ l2.skipped = {L2-001,L2-002,L2-003}
      const l2All = [...actual.l2.maintained, ...actual.l2.skipped].sort();
      expect(l2All).toEqual(['L2-001', 'L2-002', 'L2-003'].sort());
      // INV-P6: l3.maintained ∪ l3.skipped = {L3-001,L3-002,L3-003,L3-004}
      const l3All = [...actual.l3.maintained, ...actual.l3.skipped].sort();
      expect(l3All).toEqual(['L3-001', 'L3-002', 'L3-003', 'L3-004'].sort());
    });

    // IT-UC-Build-003
    it('カスタムmaintainedLayers設定でプロファイルが正しく生成される', async () => {
      // Arrange
      const customConfig = {
        allowedCategories: ['bugfix', 'docs', 'test', 'config'],
        maintainedLayers: ['L1', 'L2-001', 'L2-002', 'L2-003', 'L3-001'],
        relaxedGates: ['L3-002', 'L3-003', 'L3-004', 'L4'],
      };
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockReturnValue(customConfig),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act
      const actual = await usecase.execute({
        eligibility: { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' },
      });

      // Assert
      expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-001', 'L2-002', 'L2-003']));
      expect(actual.l2.skipped).toEqual([]);
      expect(actual.l3.maintained).toEqual(expect.arrayContaining(['L3-001']));
    });
  });

  describe('eligible=falseのeligibilityを渡した場合の異常系', () => {
    // IT-UC-Build-004
    it('eligible=falseのeligibilityを渡すとQuickModeNotEligibleErrorが投げられる', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn(),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn(),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act & Assert
      await expect(usecase.execute({
        eligibility: {
          eligible: false,
          reason: 'MIXED_CHANGES ルールにより拒否されました',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
        },
      })).rejects.toThrow();
    });

    // IT-UC-Build-005
    it('eligible=falseの場合、PortのgetQuickModeConfigは呼ばれないこと', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn(),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn(),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act
      try {
        await usecase.execute({
          eligibility: {
            eligible: false,
            reason: '拒否',
            rejectionRule: 'MIXED_CHANGES',
            rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
          },
        });
      } catch {
        // エラーは期待通り
      }

      // Assert
      expect(mockQuickModeConfigPort.getQuickModeConfig).not.toHaveBeenCalled();
    });
  });

  describe('Portエラーの伝播', () => {
    // IT-UC-Build-006
    it('quickModeConfigPortがエラーを投げた場合、そのエラーが伝播する', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockImplementation(() => {
          throw new Error('config not found');
        }),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn().mockReturnValue(ALL_VALIDATOR_IDS),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act & Assert
      await expect(usecase.execute({
        eligibility: { eligible: true, reason: 'ok' },
      })).rejects.toThrow('config not found');
    });

    // IT-UC-Build-007
    it('validatorIdRegistryPortがエラーを投げた場合、そのエラーが伝播する', async () => {
      // Arrange
      const mockQuickModeConfigPort = {
        getQuickModeConfig: vi.fn().mockReturnValue(createDefaultQuickModeConfig()),
      };
      const mockValidatorIdRegistryPort = {
        getAllValidatorIds: vi.fn().mockImplementation(() => {
          throw new Error('registry error');
        }),
      };
      const relaxationService = new ValidatorRelaxationService();
      const usecase = new BuildRelaxationProfileUseCase({
        quickModeConfigPort: mockQuickModeConfigPort,
        validatorIdRegistryPort: mockValidatorIdRegistryPort,
        relaxationService,
      });

      // Act & Assert
      await expect(usecase.execute({
        eligibility: { eligible: true, reason: 'ok' },
      })).rejects.toThrow('registry error');
    });
  });
});
```

---

### 3.3 ExecuteQuickCiCheckUseCase（8件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/usecases/execute-quick-ci-check-usecase.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { ExecuteQuickCiCheckUseCase } from '../../../../scripts/harness/quick-mode/application/usecases/execute-quick-ci-check-usecase';

target('ExecuteQuickCiCheckUseCase', () => {

  describe('正常系：判定とプロファイル生成が連携する', () => {
    // IT-UC-Execute-001
    it('eligible=trueかつdryRun=falseで判定+プロファイル生成が実行される', async () => {
      // Arrange
      const approvedEligibility = { eligible: true, reason: 'すべてのファイルが許可カテゴリ内です' };
      const defaultProfile = createApprovedDecision().relaxationProfile;
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(approvedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockResolvedValue(defaultProfile),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
      });

      // Act
      const actual = await usecase.execute({ changedFiles: undefined, dryRun: false });

      // Assert
      expect(actual.eligibility.eligible).toBe(true);
      expect(actual.relaxationProfile).toBeDefined();
      expect(actual.relaxationProfile.levelDependencyRelaxed).toBe(false);
    });

    // IT-UC-Execute-002
    it('eligible=falseのとき、relaxationProfile=undefinedのDecisionContractが返る', async () => {
      // Arrange
      const rejectedEligibility = {
        eligible: false,
        reason: 'MIXED_CHANGES ルールにより拒否されました',
        rejectionRule: 'MIXED_CHANGES',
        rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
      };
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(rejectedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
      });

      // Act
      const actual = await usecase.execute({ changedFiles: undefined, dryRun: false });

      // Assert
      expect(actual.eligibility.eligible).toBe(false);
      expect(actual.relaxationProfile).toBeUndefined();
    });

    // IT-UC-Execute-003
    it('eligible=falseのとき、buildUseCaseは呼ばれないこと', async () => {
      // Arrange
      const rejectedEligibility = {
        eligible: false,
        reason: '拒否',
        rejectionRule: 'MIXED_CHANGES',
        rejectedFiles: [],
      };
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(rejectedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
      });

      // Act
      await usecase.execute({ changedFiles: undefined, dryRun: false });

      // Assert
      expect(mockBuildUseCase.execute).not.toHaveBeenCalled();
    });

    // IT-UC-Execute-004
    it('dryRun=trueのとき、validator-systemへの実行指示がスキップされる', async () => {
      // Arrange
      const approvedEligibility = { eligible: true, reason: 'ok' };
      const defaultProfile = createApprovedDecision().relaxationProfile;
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(approvedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockResolvedValue(defaultProfile),
      };
      const mockValidatorExecutionPort = {
        executeWithProfile: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
        validatorExecutionPort: mockValidatorExecutionPort,
      });

      // Act
      await usecase.execute({ changedFiles: undefined, dryRun: true });

      // Assert
      expect(mockValidatorExecutionPort.executeWithProfile).not.toHaveBeenCalled();
    });

    // IT-UC-Execute-005
    it('changedFilesを明示指定したとき、judgeUseCaseに正しく渡される', async () => {
      // Arrange
      const changedFiles = [{ filePath: 'src/foo.ts', changeKind: 'MODIFY' }];
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue({
          eligible: false,
          reason: '拒否',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [],
        }),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
      });

      // Act
      await usecase.execute({ changedFiles, dryRun: false });

      // Assert
      expect(mockJudgeUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ changedFiles }),
      );
    });

    // IT-UC-Execute-008
    it('eligible=trueかつdryRun=trueのとき、relaxationProfile含むDecisionContractが返り、実行Portは呼ばれない', async () => {
      // Arrange
      const approvedEligibility = { eligible: true, reason: 'ok' };
      const defaultProfile = createApprovedDecision().relaxationProfile;
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue(approvedEligibility),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockResolvedValue(defaultProfile),
      };
      const mockValidatorExecutionPort = {
        executeWithProfile: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
        validatorExecutionPort: mockValidatorExecutionPort,
      });

      // Act
      const actual = await usecase.execute({ changedFiles: undefined, dryRun: true });

      // Assert
      expect(actual.eligibility.eligible).toBe(true);
      expect(actual.relaxationProfile).toBeDefined();
      expect(mockValidatorExecutionPort.executeWithProfile).not.toHaveBeenCalled();
    });
  });

  describe('異常系：エラー伝播', () => {
    // IT-UC-Execute-006
    it('judgeUseCaseがエラーを投げた場合、そのエラーが伝播する', async () => {
      // Arrange
      const mockJudgeUseCase = {
        execute: vi.fn().mockRejectedValue(new Error('judge failed')),
      };
      const mockBuildUseCase = {
        execute: vi.fn(),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
      });

      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined, dryRun: false }))
        .rejects.toThrow('judge failed');
    });

    // IT-UC-Execute-007
    it('buildUseCaseがエラーを投げた場合（eligible=true後）、そのエラーが伝播する', async () => {
      // Arrange
      const mockJudgeUseCase = {
        execute: vi.fn().mockResolvedValue({ eligible: true, reason: 'ok' }),
      };
      const mockBuildUseCase = {
        execute: vi.fn().mockRejectedValue(new Error('build failed')),
      };
      const usecase = new ExecuteQuickCiCheckUseCase({
        judgeUseCase: mockJudgeUseCase,
        buildUseCase: mockBuildUseCase,
      });

      // Act & Assert
      await expect(usecase.execute({ changedFiles: undefined, dryRun: false }))
        .rejects.toThrow('build failed');
    });
  });
});
```

---

## 4. Adapterテスト詳細ロジック

### 4.1 GitDiffChangedFilesAdapter（10件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/git-diff-changed-files-adapter.test.ts`
**インポートパス**: `../../helpers/test-helpers`（2段階）

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'child_process';
import { target, context } from '../../helpers/test-helpers';
import { GitDiffChangedFilesAdapter } from '../../../scripts/harness/quick-mode/infrastructure/adapters/git-diff-changed-files-adapter';

target('GitDiffChangedFilesAdapter', () => {

  let execSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    execSyncSpy = vi.spyOn(childProcess, 'execSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('git diffパース', () => {
    // IT-REPO-Git-001
    it('MODIFYファイルのパース（Mプレフィックス）が正しく行われる', () => {
      // Arrange
      execSyncSpy.mockReturnValue(
        'M\tscripts/harness/quick-mode/domain/value-objects/changed-file.ts\n',
      );
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toEqual([{
        filePath: 'scripts/harness/quick-mode/domain/value-objects/changed-file.ts',
        changeKind: 'MODIFY',
      }]);
    });

    // IT-REPO-Git-002
    it('ADDファイルのパース（Aプレフィックス）が正しく行われる', () => {
      // Arrange
      execSyncSpy.mockReturnValue('A\tsrc/new-feature.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toEqual([{ filePath: 'src/new-feature.ts', changeKind: 'CREATE' }]);
    });

    // IT-REPO-Git-003
    it('DELETEファイルのパース（Dプレフィックス）が正しく行われる', () => {
      // Arrange
      execSyncSpy.mockReturnValue('D\tsrc/old-feature.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toEqual([{ filePath: 'src/old-feature.ts', changeKind: 'DELETE' }]);
    });

    // IT-REPO-Git-004
    it('RENAMEファイルのパース（R100プレフィックス）で移動先をMODIFYとして扱う', () => {
      // Arrange
      execSyncSpy.mockReturnValue('R100\tsrc/old.ts\tsrc/new.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toEqual([{ filePath: 'src/new.ts', changeKind: 'MODIFY' }]);
    });

    // IT-REPO-Git-005
    it('複数ファイル混在のパースが正しく行われる', () => {
      // Arrange
      execSyncSpy.mockReturnValue('M\tsrc/a.ts\nA\tsrc/b.ts\nD\tsrc/c.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toHaveLength(3);
      expect(actual).toEqual([
        { filePath: 'src/a.ts', changeKind: 'MODIFY' },
        { filePath: 'src/b.ts', changeKind: 'CREATE' },
        { filePath: 'src/c.ts', changeKind: 'DELETE' },
      ]);
    });

    // IT-REPO-Git-006
    it('空の差分（staged変更なし）で空配列が返る', () => {
      // Arrange
      execSyncSpy.mockReturnValue('');
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toEqual([]);
    });

    // IT-REPO-Git-007
    it('ファイルパスの正規化（../ を含むパスが解決される）', () => {
      // Arrange
      execSyncSpy.mockReturnValue('M\t./scripts/../scripts/harness/foo.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();

      // Act
      const actual = adapter.getChangedFiles();

      // Assert
      expect(actual).toEqual([{ filePath: 'scripts/harness/foo.ts', changeKind: 'MODIFY' }]);
    });
  });

  describe('エラーハンドリング', () => {
    // IT-REPO-Git-008
    it('gitコマンドが失敗した場合にGitCommandErrorが投げられる', () => {
      // Arrange
      execSyncSpy.mockImplementation(() => {
        throw new Error('Command failed');
      });
      const adapter = new GitDiffChangedFilesAdapter();

      // Act & Assert
      expect(() => adapter.getChangedFiles()).toThrow();
    });

    // IT-REPO-Git-009
    it('git未インストール環境でGitNotAvailableErrorが投げられる', () => {
      // Arrange
      execSyncSpy.mockImplementation(() => {
        throw new Error('git: command not found');
      });
      const adapter = new GitDiffChangedFilesAdapter();

      // Act & Assert
      expect(() => adapter.getChangedFiles()).toThrow();
    });

    // IT-REPO-Git-010
    it('非gitディレクトリでGitNotAvailableErrorが投げられる', () => {
      // Arrange
      execSyncSpy.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      const adapter = new GitDiffChangedFilesAdapter();

      // Act & Assert
      expect(() => adapter.getChangedFiles()).toThrow();
    });
  });
});
```

---

### 4.2 HarnessConfigQuickModeConfigAdapter（7件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/harness-config-quick-mode-config-adapter.test.ts`
**インポートパス**: `../../helpers/test-helpers`（2段階）

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers';
import { HarnessConfigQuickModeConfigAdapter } from '../../../scripts/harness/quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter';

// fixture JSON 定数
const HARNESS_CONFIG_WITH_QUICKMODE = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
  quickMode: {
    allowedCategories: ['bugfix', 'docs'],
    maintainedLayers: ['L1', 'L2-002'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  },
});

const HARNESS_CONFIG_WITHOUT_QUICKMODE = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
});

const HARNESS_CONFIG_INVALID_DOMAIN = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
  quickMode: {
    allowedCategories: ['bugfix', 'domain'],
    maintainedLayers: ['L1'],
    relaxedGates: ['L4'],
  },
});

const HARNESS_CONFIG_EMPTY_CATEGORIES = JSON.stringify({
  project: { name: 'test', preset: 'standard' },
  layers: {},
  phaseDependencies: {},
  quickMode: {
    allowedCategories: [],
    maintainedLayers: ['L1'],
    relaxedGates: ['L4'],
  },
});

target('HarnessConfigQuickModeConfigAdapter', () => {

  let readFileSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    readFileSpy = vi.spyOn(fs, 'readFile');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('quickModeセクションの読み取り', () => {
    context('quickModeセクションが存在する場合', () => {
      // IT-REPO-Config-001
      it('quickModeセクションの値でQuickModeConfigが生成される', async () => {
        // Arrange
        readFileSpy.mockResolvedValue(HARNESS_CONFIG_WITH_QUICKMODE as any);
        const adapter = new HarnessConfigQuickModeConfigAdapter();

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.allowedCategories).toEqual(['bugfix', 'docs']);
        expect(actual.maintainedLayers).toEqual(['L1', 'L2-002']);
      });

      // IT-REPO-Config-003
      it('quickModeセクションのallowedCategoriesが有効値のとき正常に生成される', async () => {
        // Arrange
        readFileSpy.mockResolvedValue(JSON.stringify({
          project: { name: 'test', preset: 'standard' },
          layers: {},
          phaseDependencies: {},
          quickMode: {
            allowedCategories: ['bugfix', 'docs', 'test', 'config'],
            maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L3-001'],
            relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
          },
        }) as any);
        const adapter = new HarnessConfigQuickModeConfigAdapter();

        // Act & Assert
        await expect(adapter.getQuickModeConfig()).resolves.toBeDefined();
      });
    });

    context('quickModeセクションが存在しない場合', () => {
      // IT-REPO-Config-002
      it('デフォルト設定でQuickModeConfigが生成される', async () => {
        // Arrange
        readFileSpy.mockResolvedValue(HARNESS_CONFIG_WITHOUT_QUICKMODE as any);
        const adapter = new HarnessConfigQuickModeConfigAdapter();

        // Act
        const actual = await adapter.getQuickModeConfig();

        // Assert
        expect(actual.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
        expect(actual.maintainedLayers).toEqual(
          expect.arrayContaining(['L1', 'L2-002', 'L2-003', 'L3-001']),
        );
        expect(actual.relaxedGates).toEqual(
          expect.arrayContaining(['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4']),
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    // IT-REPO-Config-004
    it('ファイルが存在しないときHarnessConfigNotFoundErrorが投げられる', async () => {
      // Arrange
      const enoentError = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
      readFileSpy.mockRejectedValue(enoentError);
      const adapter = new HarnessConfigQuickModeConfigAdapter();

      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });

    // IT-REPO-Config-005
    it('JSONパースが失敗するときHarnessConfigParseErrorが投げられる', async () => {
      // Arrange
      readFileSpy.mockResolvedValue('invalid json {' as any);
      const adapter = new HarnessConfigQuickModeConfigAdapter();

      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });

    // IT-REPO-Config-006
    it('quickMode.allowedCategoriesに\'domain\'が含まれるとき、QuickModeConfigErrorが投げられる', async () => {
      // Arrange
      readFileSpy.mockResolvedValue(HARNESS_CONFIG_INVALID_DOMAIN as any);
      const adapter = new HarnessConfigQuickModeConfigAdapter();

      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });

    // IT-REPO-Config-007
    it('quickMode.allowedCategoriesが空配列のとき、QuickModeConfigErrorが投げられる', async () => {
      // Arrange
      readFileSpy.mockResolvedValue(HARNESS_CONFIG_EMPTY_CATEGORIES as any);
      const adapter = new HarnessConfigQuickModeConfigAdapter();

      // Act & Assert
      await expect(adapter.getQuickModeConfig()).rejects.toThrow();
    });
  });
});
```

---

### 4.3 ValidatorSystemValidatorIdRegistryAdapter（6件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/validator-system-validator-id-registry-adapter.test.ts`
**インポートパス**: `../../helpers/test-helpers`（2段階）

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers';
import { ValidatorSystemValidatorIdRegistryAdapter } from '../../../scripts/harness/quick-mode/infrastructure/adapters/validator-system-validator-id-registry-adapter';

target('ValidatorSystemValidatorIdRegistryAdapter', () => {

  describe('IDレジストリ検証', () => {
    // IT-REPO-Registry-001
    it('getAllValidatorIdsが全ID（L1-001〜L4-005）を返すこと', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();

      // Act
      const actual = adapter.getAllValidatorIds();

      // Assert
      const expected = [
        'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
        'L2-001', 'L2-002', 'L2-003',
        'L3-001', 'L3-002', 'L3-003', 'L3-004',
        'L4-001', 'L4-002', 'L4-003',
      ];
      expect(actual).toEqual(expect.arrayContaining(expected));
      expect(actual).toHaveLength(18);
    });

    // IT-REPO-Registry-002
    it('L1 IDが8件（L1-001〜L1-008）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();

      // Act
      const actual = adapter.getAllValidatorIds();

      // Assert
      expect(actual.filter((id: string) => id.startsWith('L1'))).toHaveLength(8);
    });

    // IT-REPO-Registry-003
    it('L2 IDが3件（L2-001〜L2-003）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();

      // Act
      const actual = adapter.getAllValidatorIds();

      // Assert
      expect(actual.filter((id: string) => id.startsWith('L2'))).toHaveLength(3);
    });

    // IT-REPO-Registry-004
    it('L3 IDが4件（L3-001〜L3-004）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();

      // Act
      const actual = adapter.getAllValidatorIds();

      // Assert
      expect(actual.filter((id: string) => id.startsWith('L3'))).toHaveLength(4);
    });

    // IT-REPO-Registry-005
    it('L4 IDが5件（L4-001〜L4-005）含まれること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();

      // Act
      const actual = adapter.getAllValidatorIds();

      // Assert
      expect(actual.filter((id: string) => id.startsWith('L4'))).toHaveLength(3);
    });

    // IT-REPO-Registry-006
    it('返却値がreadonly配列であること', () => {
      // Arrange
      const adapter = new ValidatorSystemValidatorIdRegistryAdapter();

      // Act
      const actual = adapter.getAllValidatorIds();

      // Assert
      // readonly 配列または Object.isFrozen のいずれかを確認する
      expect(() => {
        (actual as string[]).push('INVALID-ID');
      }).toThrow();
    });
  });
});
```

---

## 5. Handler/Formatterテスト詳細ロジック

### 5.1 CiCheckQuickModeHandler（12件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/presentation/ci-check-quick-mode-handler.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { CiCheckQuickModeHandler } from '../../../../scripts/harness/quick-mode/presentation/handlers/ci-check-quick-mode-handler';

target('CiCheckQuickModeHandler', () => {

  let mockUseCase: { execute: ReturnType<typeof vi.fn> };
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockUseCase = { execute: vi.fn() };
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('フラグ解釈・終了コードテスト', () => {
    context('--fail-on-reject未指定・eligible=falseの場合', () => {
      // IT-API-Handler-001
      it('終了コード0で正常終了する', async () => {
        // Arrange
        mockUseCase.execute.mockResolvedValue({
          eligibility: { eligible: false, reason: '拒否', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [] },
          relaxationProfile: undefined,
        });
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: false, dryRun: false }))
          .resolves.not.toThrow();
        expect(exitSpy).not.toHaveBeenCalledWith(1);
      });
    });

    context('--fail-on-reject指定・eligible=falseの場合', () => {
      // IT-API-Handler-002
      it('終了コード1で終了する', async () => {
        // Arrange
        mockUseCase.execute.mockResolvedValue({
          eligibility: { eligible: false, reason: '拒否', rejectionRule: 'MIXED_CHANGES', rejectedFiles: [] },
          relaxationProfile: undefined,
        });
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: true, dryRun: false }))
          .rejects.toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });

    context('--fail-on-reject指定・eligible=trueの場合', () => {
      // IT-API-Handler-003
      it('終了コード0で正常終了する', async () => {
        // Arrange
        mockUseCase.execute.mockResolvedValue(createApprovedDecision());
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: true, dryRun: false }))
          .resolves.not.toThrow();
        expect(exitSpy).not.toHaveBeenCalledWith(1);
      });
    });

    context('UseCaseが例外をスローした場合', () => {
      // IT-API-Handler-004
      it('終了コード2で終了する', async () => {
        // Arrange
        mockUseCase.execute.mockRejectedValue(new Error('unexpected'));
        const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

        // Act & Assert
        await expect(handler.handle({ quick: true, failOnReject: false, dryRun: false }))
          .rejects.toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('--dry-runフラグ', () => {
    // IT-API-Handler-005
    it('--dry-run指定時、usecase.executeが{ dryRun: true }で呼ばれる', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: true });

      // Assert
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true }),
      );
    });

    // IT-API-Handler-006
    it('--dry-run未指定時、usecase.executeが{ dryRun: false }または{ dryRun: undefined }で呼ばれる', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false });

      // Assert
      const callArgs = mockUseCase.execute.mock.calls[0][0];
      expect(callArgs.dryRun === false || callArgs.dryRun === undefined).toBe(true);
    });
  });

  describe('--filesフラグ', () => {
    // IT-API-Handler-007
    it('--files指定時、usecase.executeのchangedFilesに指定ファイルが渡される', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({
        quick: true,
        failOnReject: false,
        dryRun: false,
        files: 'src/a.ts,src/b.ts',
      });

      // Assert
      const callArgs = mockUseCase.execute.mock.calls[0][0];
      expect(callArgs.changedFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ filePath: 'src/a.ts' }),
          expect.objectContaining({ filePath: 'src/b.ts' }),
        ]),
      );
    });

    // IT-API-Handler-008
    it('--files未指定時、usecase.executeのchangedFilesがundefinedである', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false });

      // Assert
      const callArgs = mockUseCase.execute.mock.calls[0][0];
      expect(callArgs.changedFiles).toBeUndefined();
    });
  });

  describe('--formatフラグ', () => {
    // IT-API-Handler-009
    it('--format human指定時、stdoutが人間可読形式（"Quick Mode 判定: ✓ 承認"を含む）で出力される', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'human' });

      // Assert
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('Quick Mode 判定');
      expect(output).toContain('承認');
    });

    // IT-API-Handler-010
    it('--format json指定・eligible=false時、stdoutがJSONパース可能でeligible: falseを含む', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createRejectedDecision('MIXED_CHANGES'));
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'json' });

      // Assert
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.eligibility.eligible).toBe(false);
    });

    // IT-API-Handler-011
    it('--format agent指定時、stdoutにrejectedFilesの詳細が含まれる', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue({
        eligibility: {
          eligible: false,
          reason: '拒否',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/domain/vo.ts', changeKind: 'MODIFY' }],
        },
        relaxationProfile: undefined,
      });
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });

      // Act
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'agent' });

      // Assert
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('src/domain/vo.ts');
    });

    // IT-API-Handler-012
    it('--format未指定時、デフォルトのhuman形式でstdoutに出力される（--format humanと同等）', async () => {
      // Arrange
      mockUseCase.execute.mockResolvedValue(createApprovedDecision());
      const handler = new CiCheckQuickModeHandler({ useCase: mockUseCase });
      const stdoutCaptureDefault: string[] = [];
      const stdoutCaptureHuman: string[] = [];
      stdoutSpy.mockImplementation(((chunk: string) => {
        stdoutCaptureDefault.push(chunk);
        return true;
      }) as any);

      // Act (format未指定)
      await handler.handle({ quick: true, failOnReject: false, dryRun: false });
      stdoutSpy.mockReset();
      stdoutSpy.mockImplementation(((chunk: string) => {
        stdoutCaptureHuman.push(chunk);
        return true;
      }) as any);

      // Act (format=human)
      await handler.handle({ quick: true, failOnReject: false, dryRun: false, format: 'human' });

      // Assert
      expect(stdoutCaptureDefault.join('')).toEqual(stdoutCaptureHuman.join(''));
    });
  });
});
```

---

### 5.2 HumanQuickModeFormatter（5件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/presentation/human-quick-mode-formatter.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { HumanQuickModeFormatter } from '../../../../scripts/harness/quick-mode/presentation/formatters/human-quick-mode-formatter';

target('HumanQuickModeFormatter', () => {

  describe('eligible=trueの決定を人間可読形式にフォーマットする', () => {
    // IT-API-HumanFmt-001
    it('承認されたDecisionで"Quick Mode 判定: ✓ 承認"を含む文字列が返り、末尾に改行がある', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('Quick Mode 判定');
      expect(actual).toContain('承認');
      expect(actual).toContain('L2-002');
      expect(actual).toContain('L2-003');
      expect(actual).toContain('L2-001');
      expect(actual).toContain('L3-001');
      expect(actual.endsWith('\n')).toBe(true);
    });
  });

  describe('eligible=falseの決定を人間可読形式にフォーマットする', () => {
    // IT-API-HumanFmt-002
    it('MIXED_CHANGESで拒否されたDecisionで"Quick Mode 判定: ✗ 拒否"と拒否ファイルが表示される', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = {
        eligibility: {
          eligible: false,
          reason: 'MIXED_CHANGES ルールにより拒否されました',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/x.ts', changeKind: 'MODIFY' }],
        },
        relaxationProfile: undefined,
      };

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('拒否');
      expect(actual).toContain('MIXED_CHANGES');
      expect(actual).toContain('src/x.ts');
      expect(actual.endsWith('\n')).toBe(true);
    });

    // IT-API-HumanFmt-003
    it('NEW_DOMAINで拒否されたDecisionで"NEW_DOMAIN"が出力に含まれる', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createRejectedDecision('NEW_DOMAIN');

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('NEW_DOMAIN');
    });

    // IT-API-HumanFmt-004
    it('API_CONTRACTで拒否されたDecisionで"API_CONTRACT"が出力に含まれる', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createRejectedDecision('API_CONTRACT');

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('API_CONTRACT');
    });
  });

  describe('決定論的出力', () => {
    // IT-API-HumanFmt-005
    it('同一入力に対して複数回呼び出しても同一の出力が返る', () => {
      // Arrange
      const formatter = new HumanQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual1 = formatter.format(input);
      const actual2 = formatter.format(input);

      // Assert
      expect(actual1).toEqual(actual2);
    });
  });
});
```

---

### 5.3 AgentQuickModeFormatter（4件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/presentation/agent-quick-mode-formatter.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { AgentQuickModeFormatter } from '../../../../scripts/harness/quick-mode/presentation/formatters/agent-quick-mode-formatter';

target('AgentQuickModeFormatter', () => {

  describe('正常系', () => {
    // IT-API-AgentFmt-001
    it('rejected Decisionで拒否ファイルの詳細（filePath + changeKind）が出力に含まれる', () => {
      // Arrange
      const formatter = new AgentQuickModeFormatter();
      const input = {
        eligibility: {
          eligible: false,
          reason: '拒否',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'src/domain/vo.ts', changeKind: 'MODIFY' }],
        },
        relaxationProfile: undefined,
      };

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('src/domain/vo.ts');
      expect(actual).toContain('MODIFY');
      expect(actual.endsWith('\n')).toBe(true);
    });

    // IT-API-AgentFmt-002
    it('approved DecisionでスキップされたバリデータID（L2-001等）が出力に含まれる', () => {
      // Arrange
      const formatter = new AgentQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('L2-001');
      expect(actual).toContain('L3-002');
      expect(actual).toContain('L3-003');
      expect(actual).toContain('L3-004');
    });

    // IT-API-AgentFmt-003
    it('approved Decisionで維持されるバリデータID（L2-002、L2-003等）が出力に含まれる', () => {
      // Arrange
      const formatter = new AgentQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(actual).toContain('L2-002');
      expect(actual).toContain('L2-003');
      expect(actual).toContain('L3-001');
    });
  });

  describe('決定論的出力', () => {
    // IT-API-AgentFmt-004
    it('同一入力に対して複数回呼び出しても同一の出力が返る', () => {
      // Arrange
      const formatter = new AgentQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual1 = formatter.format(input);
      const actual2 = formatter.format(input);

      // Assert
      expect(actual1).toEqual(actual2);
    });
  });
});
```

---

### 5.4 JsonQuickModeFormatter（4件）

**ファイル**: `scripts/harness/__tests__/integration/quick-mode/presentation/json-quick-mode-formatter.test.ts`
**インポートパス**: `../../../helpers/test-helpers`（3段階）

```typescript
import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers';
import { JsonQuickModeFormatter } from '../../../../scripts/harness/quick-mode/presentation/formatters/json-quick-mode-formatter';

target('JsonQuickModeFormatter', () => {

  describe('正常系', () => {
    // IT-API-JsonFmt-001
    it('approved DecisionがJSONパース可能で、eligible: true・relaxationProfileを含む文字列が返る', () => {
      // Arrange
      const formatter = new JsonQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(() => JSON.parse(actual)).not.toThrow();
      const parsed = JSON.parse(actual);
      expect(parsed.eligibility.eligible).toBe(true);
      expect(parsed.relaxationProfile).toBeDefined();
      expect(actual.endsWith('\n')).toBe(true);
    });

    // IT-API-JsonFmt-002
    it('rejected DecisionがJSONパース可能で、eligible: false・rejectionRule・relaxationProfile: null or 省略を含む', () => {
      // Arrange
      const formatter = new JsonQuickModeFormatter();
      const input = createRejectedDecision('MIXED_CHANGES');

      // Act
      const actual = formatter.format(input);

      // Assert
      expect(() => JSON.parse(actual)).not.toThrow();
      const parsed = JSON.parse(actual);
      expect(parsed.eligibility.eligible).toBe(false);
      expect(parsed.eligibility.rejectionRule).toBe('MIXED_CHANGES');
      // relaxationProfile は null または省略（undefined→省略）のいずれか
      expect(parsed.relaxationProfile === null || parsed.relaxationProfile === undefined).toBe(true);
    });

    // IT-API-JsonFmt-003
    it('出力がJSON.parseで再現可能で、QuickModeDecisionContractの全フィールドを含むこと', () => {
      // Arrange
      const formatter = new JsonQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual = formatter.format(input);

      // Assert
      const parsed = JSON.parse(actual);
      expect(parsed).toHaveProperty('eligibility');
      expect(parsed).toHaveProperty('eligibility.eligible');
      expect(parsed).toHaveProperty('eligibility.reason');
      expect(parsed).toHaveProperty('relaxationProfile');
      expect(parsed).toHaveProperty('relaxationProfile.l1');
      expect(parsed).toHaveProperty('relaxationProfile.l2');
      expect(parsed).toHaveProperty('relaxationProfile.l3');
      expect(parsed).toHaveProperty('relaxationProfile.l4');
    });
  });

  describe('決定論的出力', () => {
    // IT-API-JsonFmt-004
    it('同一入力に対して複数回呼び出しても同一のJSON文字列が返る', () => {
      // Arrange
      const formatter = new JsonQuickModeFormatter();
      const input = createApprovedDecision();

      // Act
      const actual1 = formatter.format(input);
      const actual2 = formatter.format(input);

      // Assert
      expect(actual1).toEqual(actual2);
    });
  });
});
```

---

## 6. テスト実行コマンド

```bash
# integration テスト全体
pnpm test -- --testPathPattern="integration/quick-mode"

# UseCase ITテストのみ
pnpm test -- --testPathPattern="integration/quick-mode/usecases"

# Adapter ITテストのみ
pnpm test -- --testPathPattern="integration/quick-mode/.*adapter"

# Handler/Formatter ITテストのみ
pnpm test -- --testPathPattern="integration/quick-mode/presentation"

# 単一ファイル指定
pnpm test -- --testPathPattern="integration/quick-mode/usecases/judge-quick-mode-eligibility-usecase"
```
