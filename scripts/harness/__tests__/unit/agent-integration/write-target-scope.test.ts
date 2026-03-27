// @unit agent-integration
// @layer domain

import { describe, expect, it } from 'vitest';
import { target, context, createProjectPaths, createWriteTargetScope } from '../../helpers/test-helpers.js';
import { WriteTargetScope } from '../../../agent-integration/domain/value-objects/write-target-scope.js';
import { WriteTargetScopeInvariantError } from '../../../agent-integration/domain/errors/write-target-scope-invariant-error.js';

target('WriteTargetScope', () => {
  target('fromPath()', () => {
    describe('書き込み先パスからスコープを推定する', () => {
      context('__tests__/ を含むパスの場合', () => {
        // UT-WTS-001
        it('nullを返すこと', () => {
          // Arrange
          const filePath = 'scripts/harness/__tests__/unit/agent-integration/write-target-scope.test.ts';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toBeNull();
        });
      });

      context('source配下のUnitファイルの場合', () => {
        // UT-WTS-002
        it('level=3 かつ unitId付きで返すこと', () => {
          // Arrange
          const filePath = 'scripts/harness/validator-system/domain/value-objects/validator-id.ts';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: 'validator-system' }));
        });
      });

      context('複数source設定の2件目に一致する場合', () => {
        // UT-WTS-003
        it('一致したsourceからlevel=3を推定すること', () => {
          // Arrange
          const filePath = 'src/quick-mode/domain/value-objects/quick-mode-config.ts';
          const projectPaths = createProjectPaths({ source: ['scripts/harness', 'src'] });

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: 'quick-mode' }));
        });
      });

      context('docs.inception 配下で storyId パターンに一致する場合', () => {
        // UT-WTS-004
        it('level=3 かつ unitId と storyId 付きで返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/agent-integration/H11-01/scenario_test_plan.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(
            createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H11-01' }),
          );
        });
      });

      context('docs.inception 配下で storyId ディレクトリの下層ファイルの場合', () => {
        // UT-WTS-005
        it('ネストしたファイルでも level=3 を返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/validator-system/HF1-01/designs/domain/model.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(
            createWriteTargetScope({ level: 3, unitId: 'validator-system', storyId: 'HF1-01' }),
          );
        });
      });

      context('docs.inception/_shared 配下の場合', () => {
        // UT-WTS-006
        it('level=1 を返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/_shared/product_overview_plan.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context('docs.construction 配下のUnit文書の場合', () => {
        // UT-WTS-007
        it('level=2 かつ unitId付きで返すこと', () => {
          // Arrange
          const filePath = 'docs/product/construction/agent-integration/logical_design.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: 'agent-integration' }));
        });
      });

      context('docs.inception 配下で storyId を持たないUnit文書の場合', () => {
        // UT-WTS-008
        it('level=2 かつ unitId付きで返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/agent-integration/domain_model_plan.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: 'agent-integration' }));
        });
      });

      context('docs.inception 配下で storyId パターンに一致しない下位ディレクトリの場合', () => {
        // UT-WTS-009
        it('R5 として level=2 を返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/agent-integration/reference/design_notes.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: 'agent-integration' }));
        });
      });

      context('docs/product 直下のファイルの場合', () => {
        // UT-WTS-010
        it('level=1 を返すこと', () => {
          // Arrange
          const filePath = 'docs/product/product_overview.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context('docs/product 直下の別ファイルの場合', () => {
        // UT-WTS-011
        it('level=1 を返すこと', () => {
          // Arrange
          const filePath = 'docs/product/user_stories.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context('どのルールにも一致しない場合', () => {
        // UT-WTS-012
        it('nullを返すこと', () => {
          // Arrange
          const filePath = 'README.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toBeNull();
        });
      });

      context('source配下でも __tests__/ を含む場合', () => {
        // UT-WTS-013
        it('R2より先にR1が評価され nullを返すこと', () => {
          // Arrange
          const filePath = 'scripts/harness/validator-system/__tests__/unit/foo.test.ts';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toBeNull();
        });
      });

      context('docs.inception/_shared 配下がUnit文書判定とも競合しうる場合', () => {
        // UT-WTS-014
        it('R6が優先され level=1 を返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/_shared/US-999/cross_cutting.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context('storyId候補がパターンに一致しない場合', () => {
        // UT-WTS-015
        it('R3ではなくR5が適用され level=2 を返すこと', () => {
          // Arrange
          const filePath = 'docs/inception/agent-integration/story-001/scenario_test_plan.md';
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: 'agent-integration' }));
        });
      });
    });
  });

  target('create()', () => {
    describe('正常な入力でWriteTargetScopeを生成する', () => {
      context('level=1 の場合', () => {
        // UT-WTS-020
        it('unitId と storyId なしで生成されること', () => {
          // Arrange
          const props = { level: 1 as const };

          // Act
          const actual = WriteTargetScope.create(props);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context('level=2 の場合', () => {
        // UT-WTS-021
        it('unitId付きで生成されること', () => {
          // Arrange
          const props = { level: 2 as const, unitId: 'agent-integration' };

          // Act
          const actual = WriteTargetScope.create(props);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: 'agent-integration' }));
        });
      });

      context('level=3 で storyId がある場合', () => {
        // UT-WTS-022
        it('unitId と storyId 付きで生成されること', () => {
          // Arrange
          const props = { level: 3 as const, unitId: 'agent-integration', storyId: 'H11-01' };

          // Act
          const actual = WriteTargetScope.create(props);

          // Assert
          expect(actual).toEqual(
            createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H11-01' }),
          );
        });
      });
    });

    describe('不変条件を検証する', () => {
      context('level が 1,2,3 以外の場合', () => {
        // UT-WTS-023
        it('WriteTargetScopeInvariantErrorがthrowされること', () => {
          // Arrange
          const props = { level: 0 as 1, unitId: 'agent-integration' };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context('level=1 で unitId が指定された場合', () => {
        // UT-WTS-024
        it('WriteTargetScopeInvariantErrorがthrowされること', () => {
          // Arrange
          const props = { level: 1 as const, unitId: 'agent-integration' };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context('level=1 で storyId が指定された場合', () => {
        // UT-WTS-025
        it('WriteTargetScopeInvariantErrorがthrowされること', () => {
          // Arrange
          const props = { level: 1 as const, storyId: 'H11-01' };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context('level=2 で unitId がない場合', () => {
        // UT-WTS-026
        it('WriteTargetScopeInvariantErrorがthrowされること', () => {
          // Arrange
          const props = { level: 2 as const };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context('level=2 で storyId が指定された場合', () => {
        // UT-WTS-027
        it('WriteTargetScopeInvariantErrorがthrowされること', () => {
          // Arrange
          const props = { level: 2 as const, unitId: 'agent-integration', storyId: 'H11-01' };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context('level=3 で unitId がない場合', () => {
        // UT-WTS-028
        it('WriteTargetScopeInvariantErrorがthrowされること', () => {
          // Arrange
          const props = { level: 3 as const, storyId: 'H11-01' };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });
    });
  });

  target('equals()', () => {
    describe('等値性を判定する', () => {
      context('同一フィールドを持つ2つのWriteTargetScopeを比較する場合', () => {
        // UT-WTS-030
        it('等値であること', () => {
          // Arrange
          const left = createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H11-01' });
          const right = createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H11-01' });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(true);
        });
      });

      context('level が異なる2つのWriteTargetScopeを比較する場合', () => {
        // UT-WTS-031
        it('非等値であること', () => {
          // Arrange
          const left = createWriteTargetScope({ level: 2, unitId: 'agent-integration' });
          const right = createWriteTargetScope({ level: 3, unitId: 'agent-integration' });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(false);
        });
      });

      context('storyId が異なる2つのWriteTargetScopeを比較する場合', () => {
        // UT-WTS-032
        it('非等値であること', () => {
          // Arrange
          const left = createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H11-01' });
          const right = createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H11-02' });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(false);
        });
      });
    });
  });

  describe('境界値を検証する', () => {
    context('filePath が空文字の場合', () => {
      // UT-BV-015
      it('nullを返すこと', () => {
        // Arrange
        const filePath = '';
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toBeNull();
      });
    });

    context('storyId 候補が小文字を含む場合', () => {
      // UT-BV-016
      it('storyIdとしては採用されず level=2 を返すこと', () => {
        // Arrange
        const filePath = 'docs/inception/agent-integration/h11-01/scenario_test_plan.md';
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: 'agent-integration' }));
      });
    });

    context('docs.construction 配下だが unitId が存在しない場合', () => {
      // UT-BV-017
      it('nullを返すこと', () => {
        // Arrange
        const filePath = 'docs/product/construction';
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toBeNull();
      });
    });

    context('docs.inception/_shared 直下のファイルの場合', () => {
      // UT-BV-018
      it('level=1 を返すこと', () => {
        // Arrange
        const filePath = 'docs/inception/_shared/overview.md';
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
      });
    });

    context('最小の storyId パターンに一致する場合', () => {
      // UT-BV-022
      it('level=3 として扱うこと', () => {
        // Arrange
        const filePath = 'docs/inception/agent-integration/H1-1/scenario_test_plan.md';
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(
          createWriteTargetScope({ level: 3, unitId: 'agent-integration', storyId: 'H1-1' }),
        );
      });
    });
  });
});
