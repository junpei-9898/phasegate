// @unit phase-dependency-model
// @layer infrastructure

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ResolveGateUseCase } from '../../../phase-dependency-model/application/usecases/resolve-gate-usecase.js';
import { GateDefinition } from '../../../phase-dependency-model/domain/values/gate-definition.js';
import { GateName } from '../../../phase-dependency-model/domain/values/gate-name.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { PicomatchGlobMatcher } from '../../../phase-dependency-model/infrastructure/adapters/picomatch-glob-matcher.js';
import { FileSystemArtifactExistenceChecker } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-artifact-existence-checker.js';

const tempDirs: string[] = [];

const createGate = (args: {
  name: string;
  level: 1 | 2 | 3;
  requires: ReadonlyArray<{ path: string; required: boolean }>;
  blocks: readonly string[];
}): GateDefinition =>
  GateDefinition.create({
    name: GateName.create(args.name),
    level: PhaseLevel.create(args.level),
    requires: Object.freeze([...args.requires]),
    blocks: Object.freeze([...args.blocks]),
    dependsOn: Object.freeze([]),
  });

async function createTempRoot(): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'resolve-gate-usecase-'));
  tempDirs.push(rootDir);
  return rootDir;
}

async function ensureFile(rootDir: string, relativePath: string): Promise<void> {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, '# test\n', 'utf8');
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

target('ResolveGateUseCase integration', () => {
  describe('execute', () => {
    context('実ファイルシステム上に必須成果物が存在する場合', () => {
      it('blocker なしで通過すること', async () => {
        // Arrange
        const rootDir = await createTempRoot();
        await ensureFile(rootDir, 'docs/product/construction/example/domain_model.md');
        const sut = new ResolveGateUseCase({
          globMatcher: new PicomatchGlobMatcher(),
          artifactExistenceChecker: new FileSystemArtifactExistenceChecker({ rootDir }),
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
        expect(actual.blockers).toEqual([]);
      });
    });

    context('実ファイルシステム上に必須成果物が存在しない場合', () => {
      it('missing artifact を blocker として返すこと', async () => {
        // Arrange
        const rootDir = await createTempRoot();
        const sut = new ResolveGateUseCase({
          globMatcher: new PicomatchGlobMatcher(),
          artifactExistenceChecker: new FileSystemArtifactExistenceChecker({ rootDir }),
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
