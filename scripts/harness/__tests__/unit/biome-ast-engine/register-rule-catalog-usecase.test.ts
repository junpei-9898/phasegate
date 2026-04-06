// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { RuleDefinitionRegistry } from '../../../biome-ast-engine/domain/services/rule-definition-registry.js';
import { RegisterRuleCatalogUseCase } from '../../../biome-ast-engine/application/usecases/register-rule-catalog-usecase.ts';

target('RegisterRuleCatalogUseCase.execute', () => {
  describe('ルールカタログを取得する', () => {
    context('標準レジストリを使う場合', () => {
      it('8件の正規ルール定義が返される', async () => {
        // Arrange
        const sut = new RegisterRuleCatalogUseCase({
          ruleDefinitionRegistry: new RuleDefinitionRegistry(),
        });

        // Act
        const actual = await sut.execute();

        // Assert
        expect(actual.rules).toHaveLength(8);
        expect(actual.rules.map((rule) => rule.name.toString())).toEqual([
          'enforce-folder-structure',
          'no-any-abuse',
          'no-code-duplication',
          'no-comment-flood',
          'no-ghost-file',
          'no-layer-violation',
          'require-layer-comment',
          'require-unit-comment',
        ]);
      });
    });
  });
});
