// @unit phase-dependency-model
// @layer infrastructure

import { expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { ResolveGateUseCase } from '../../../phase-dependency-model/application/usecases/resolve-gate-usecase.js';
import { GateDefinition } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { GateName } from '../../../phase-dependency-model/domain/values/gate-name.js';
import { GateStoryAnnotation } from '../../../phase-dependency-model/domain/values/gate-story-annotation.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PicomatchGlobMatcher } from '../../../phase-dependency-model/infrastructure/adapters/picomatch-glob-matcher.js';

const createStoryGate = (required: boolean): GateDefinition =>
  GateDefinition.create({
    name: GateName.create('story-implementor'),
    level: PhaseLevel.create(3),
    requires: Object.freeze([]),
    blocks: Object.freeze(['scripts/harness/example/**']),
    dependsOn: Object.freeze([]),
    storyAnnotation: GateStoryAnnotation.create({
      required,
      tag: '@story-id',
    }),
  });

target('ResolveGateUseCase story annotation integration', () => {
  it('storyAnnotation.required=true で注釈が欠落している場合は blocker を返すこと', async () => {
    // Arrange
    const storyAnnotationVerifier = {
      verify: vi.fn().mockResolvedValue({
        hasAnnotation: false,
      }),
    };
    const sut = new ResolveGateUseCase({
      globMatcher: new PicomatchGlobMatcher(),
      artifactExistenceChecker: {
        checkAll: vi.fn().mockResolvedValue(new Map()),
      },
      storyAnnotationVerifier,
    });

    // Act
    const actual = await sut.execute({
      targetFilePath: 'scripts/harness/example/application/usecase.ts',
      gates: [createStoryGate(true)],
      scope: { unitId: 'example', storyId: 'H01-01' },
    });

    // Assert
    expect(actual.blockers).toEqual([
      {
        gateName: 'story-implementor',
        path: 'scripts/harness/example/application/usecase.ts',
        reason: '@story-id 注釈が必要です',
      },
    ]);
    expect(actual.warnings).toEqual([]);
  });

  it('storyAnnotation.required=false で注釈が欠落している場合は warning を返すこと', async () => {
    // Arrange
    const storyAnnotationVerifier = {
      verify: vi.fn().mockResolvedValue({
        hasAnnotation: false,
      }),
    };
    const sut = new ResolveGateUseCase({
      globMatcher: new PicomatchGlobMatcher(),
      artifactExistenceChecker: {
        checkAll: vi.fn().mockResolvedValue(new Map()),
      },
      storyAnnotationVerifier,
    });

    // Act
    const actual = await sut.execute({
      targetFilePath: 'scripts/harness/example/application/usecase.ts',
      gates: [createStoryGate(false)],
      scope: { unitId: 'example', storyId: 'H01-01' },
    });

    // Assert
    expect(actual.blockers).toEqual([]);
    expect(actual.warnings).toEqual([
      {
        gateName: 'story-implementor',
        path: 'scripts/harness/example/application/usecase.ts',
        reason: '@story-id 注釈を推奨します',
      },
    ]);
  });

  it('@story-id 注釈が存在する場合は通過すること', async () => {
    // Arrange
    const storyAnnotationVerifier = {
      verify: vi.fn().mockResolvedValue({
        hasAnnotation: true,
        storyId: 'H01-01',
      }),
    };
    const sut = new ResolveGateUseCase({
      globMatcher: new PicomatchGlobMatcher(),
      artifactExistenceChecker: {
        checkAll: vi.fn().mockResolvedValue(new Map()),
      },
      storyAnnotationVerifier,
    });

    // Act
    const actual = await sut.execute({
      targetFilePath: 'scripts/harness/example/application/usecase.ts',
      gates: [createStoryGate(true)],
      scope: { unitId: 'example', storyId: 'H01-01' },
    });

    // Assert
    expect(actual.blockers).toEqual([]);
    expect(actual.warnings).toEqual([]);
  });
});
