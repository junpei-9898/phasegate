// @unit phase-dependency-model
// @layer application

import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ResolveGateUseCase } from '../../../phase-dependency-model/application/usecases/resolve-gate-usecase.js';
import { GateDefinition } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { GateName } from '../../../phase-dependency-model/domain/values/gate-name.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { InMemoryGlobMatcher } from '../../../phase-dependency-model/infrastructure/adapters/in-memory-glob-matcher.js';

const createGate = (args: {
  name: string;
  level: 1 | 2 | 3;
  requires?: ReadonlyArray<{ path: string; required: boolean }>;
  blocks?: readonly string[];
  dependsOn?: readonly string[];
}): GateDefinition =>
  GateDefinition.create({
    name: GateName.create(args.name),
    level: PhaseLevel.create(args.level),
    requires: Object.freeze([...(args.requires ?? [])]),
    blocks: Object.freeze([...(args.blocks ?? [])]),
    dependsOn: Object.freeze((args.dependsOn ?? []).map((name) => GateName.create(name))),
  });

target('ResolveGateUseCase', () => {
  describe('execute', () => {
    context('単一の blocks glob が一致する場合', () => {
      it('一致したゲート名を返し必須成果物を blocker にしないこと', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn().mockResolvedValue(
            new Map([['docs/product/construction/example/domain_model.md', true]]),
          ),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker,
        });
        const gates = [
          createGate({
            name: 'domain-designer',
            level: 2,
            blocks: ['scripts/harness/example/**'],
            requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
          }),
        ];

        // Act
        const actual = await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example' },
        });

        // Assert
        expect(actual.matchedGates).toEqual(['domain-designer']);
        expect(actual.blockers).toEqual([]);
        expect(actual.warnings).toEqual([]);
      });
    });

    context('複数の blocks glob が一致する場合', () => {
      it('一致した全ゲートを返すこと', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn().mockResolvedValue(
            new Map([
              ['docs/product/construction/example/domain_model.md', true],
              ['docs/product/construction/example/logical_design.md', true],
            ]),
          ),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker,
        });
        const gates = [
          createGate({
            name: 'domain-designer',
            level: 2,
            blocks: ['scripts/harness/example/**/*.ts'],
            requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
          }),
          createGate({
            name: 'logical-designer',
            level: 2,
            blocks: ['scripts/harness/example/**/*.ts'],
            requires: [{ path: 'docs/product/construction/example/logical_design.md', required: true }],
          }),
        ];

        // Act
        const actual = await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example' },
        });

        // Assert
        expect(actual.matchedGates).toEqual(['domain-designer', 'logical-designer']);
      });
    });

    context('blocks glob に一致しない場合', () => {
      it('matchedGates と blocker warning が空で返ること', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn(),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker: artifactExistenceChecker as never,
        });
        const gates = [
          createGate({
            name: 'domain-designer',
            level: 2,
            blocks: ['docs/product/**'],
            requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
          }),
        ];

        // Act
        const actual = await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example' },
        });

        // Assert
        expect(actual).toEqual({
          matchedGates: [],
          blockers: [],
          warnings: [],
        });
        expect(artifactExistenceChecker.checkAll).not.toHaveBeenCalled();
      });
    });

    context('dependsOn を持つゲートが一致する場合', () => {
      it('先行ゲートの requires もトポロジカル順で評価すること', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn().mockResolvedValue(
            new Map([
              ['docs/product/product_overview.md', true],
              ['docs/product/construction/example/domain_model.md', true],
              ['docs/product/construction/example/logical_design.md', true],
            ]),
          ),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker,
        });
        const gates = [
          createGate({
            name: 'product-architect',
            level: 1,
            requires: [{ path: 'docs/product/product_overview.md', required: true }],
          }),
          createGate({
            name: 'domain-designer',
            level: 2,
            requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
            dependsOn: ['product-architect'],
          }),
          createGate({
            name: 'logical-designer',
            level: 2,
            blocks: ['scripts/harness/example/**/*.ts'],
            requires: [{ path: 'docs/product/construction/example/logical_design.md', required: true }],
            dependsOn: ['domain-designer'],
          }),
        ];

        // Act
        await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example' },
        });

        // Assert
        const actualArtifacts = artifactExistenceChecker.checkAll.mock.calls[0]?.[0];
        expect(actualArtifacts.map((artifact: { path: string }) => artifact.path)).toEqual([
          'docs/product/product_overview.md',
          'docs/product/construction/example/domain_model.md',
          'docs/product/construction/example/logical_design.md',
        ]);
      });
    });

    context('requires に required true と false が混在する場合', () => {
      it('必須欠損は blocker、推奨欠損は warning として返すこと', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn().mockResolvedValue(
            new Map([
              ['docs/product/construction/example/domain_model.md', false],
              ['docs/product/construction/example/logical_design.md', false],
            ]),
          ),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker,
        });
        const gates = [
          createGate({
            name: 'logical-designer',
            level: 2,
            blocks: ['scripts/harness/example/**'],
            requires: [
              { path: 'docs/product/construction/example/domain_model.md', required: true },
              { path: 'docs/product/construction/example/logical_design.md', required: false },
            ],
          }),
        ];

        // Act
        const actual = await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example' },
        });

        // Assert
        expect(actual.blockers).toEqual([
          {
            gateName: 'logical-designer',
            path: 'docs/product/construction/example/domain_model.md',
            reason: '必須アーティファクトが不足しています',
          },
        ]);
        expect(actual.warnings).toEqual([
          {
            gateName: 'logical-designer',
            path: 'docs/product/construction/example/logical_design.md',
            reason: '推奨アーティファクトが不足しています',
          },
        ]);
      });
    });

    context('requires.path にプレースホルダが含まれる場合', () => {
      it('scope の unit と storyId を展開して評価すること', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn().mockResolvedValue(
            new Map([['docs/inception/example/H01-01/tdd_implementation_plan.md', true]]),
          ),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker,
        });
        const gates = [
          createGate({
            name: 'story-implementor',
            level: 3,
            blocks: ['scripts/harness/example/**'],
            requires: [{ path: 'docs/inception/{unit}/{storyId}/tdd_implementation_plan.md', required: true }],
          }),
        ];

        // Act
        await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example', storyId: 'H01-01' },
        });

        // Assert
        const actualArtifacts = artifactExistenceChecker.checkAll.mock.calls[0]?.[0];
        expect(actualArtifacts[0].path).toBe('docs/inception/example/H01-01/tdd_implementation_plan.md');
      });
    });

    context('passive gate が先行ゲートとして参照される場合', () => {
      it('blocks が空でも dependsOn 経由で検査対象に含めること', async () => {
        // Arrange
        const artifactExistenceChecker = {
          checkAll: vi.fn().mockResolvedValue(
            new Map([
              ['docs/product/construction/example/domain_model.md', false],
              ['docs/product/construction/example/logical_design.md', true],
            ]),
          ),
        };
        const sut = new ResolveGateUseCase({
          globMatcher: new InMemoryGlobMatcher(),
          artifactExistenceChecker,
        });
        const gates = [
          createGate({
            name: 'domain-designer',
            level: 2,
            blocks: [],
            requires: [{ path: 'docs/product/construction/example/domain_model.md', required: true }],
          }),
          createGate({
            name: 'logical-designer',
            level: 2,
            blocks: ['scripts/harness/example/**'],
            requires: [{ path: 'docs/product/construction/example/logical_design.md', required: true }],
            dependsOn: ['domain-designer'],
          }),
        ];

        // Act
        const actual = await sut.execute({
          targetFilePath: 'scripts/harness/example/domain/model.ts',
          gates,
          scope: { unitId: 'example' },
        });

        // Assert
        expect(actual.blockers).toEqual([
          {
            gateName: 'domain-designer',
            path: 'docs/product/construction/example/domain_model.md',
            reason: '必須アーティファクトが不足しています',
          },
        ]);
      });
    });
  });
});
