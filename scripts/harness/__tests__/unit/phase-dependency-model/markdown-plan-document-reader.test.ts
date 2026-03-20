import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MarkdownPlanDocumentReader } from '../../../phase-dependency-model/infrastructure/filesystem/markdown-plan-document-reader.js';
import { PhaseNode } from '../../../phase-dependency-model/domain/values/phase-node.js';
import { PhaseLevel } from '../../../phase-dependency-model/domain/values/phase-level.js';
import { Artifact } from '../../../phase-dependency-model/domain/values/artifact.js';
import { PlanningMode } from '../../../phase-dependency-model/domain/values/planning-mode.js';

let tmpDir: string;

function createTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdm-plan-reader-'));
  return tmpDir;
}

function writeFile(rootDir: string, relativePath: string, content: string): void {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function createNodeWithPlan(): PhaseNode {
  return PhaseNode.create({
    skillName: 'unit-design',
    level: PhaseLevel.create(2),
    artifacts: [
      Artifact.create({
        name: 'unit-plan',
        path: 'docs/units/{unit}/unit_plan.md',
        required: true,
      }),
    ],
  });
}

function createNodeWithoutPlan(): PhaseNode {
  return PhaseNode.create({
    skillName: 'unit-design',
    level: PhaseLevel.create(2),
    artifacts: [
      Artifact.create({
        name: 'design-doc',
        path: 'docs/units/{unit}/design.md',
        required: true,
      }),
    ],
  });
}

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

target('MarkdownPlanDocumentReader.readEvidence', () => {
  describe('Plan文書からエビデンスを読み取る', () => {
    context('plan文書が存在しQAセクションにQ:/A:ペアが揃っている場合(embedded-qa)', () => {
      it('exists=true, qaComplete=true, planningModeMatch=trueのPlanEvidenceが返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = [
          '# Unit Plan',
          '',
          '## QA',
          'Q: 質問1',
          'A: 回答1',
          'Q: 質問2',
          'A: 回答2',
        ].join('\n');
        writeFile(rootDir, 'docs/units/my-unit/unit_plan.md', content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create('embedded-qa');

        // Act
        const actual = await sut.readEvidence(node, { unitId: 'my-unit' }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(true);
        expect(actual.planningModeMatch).toBe(true);
      });
    });

    context('plan文書が存在するがQAセクションがない場合(embedded-qa)', () => {
      it('exists=true, qaComplete=false, planningModeMatch=falseのPlanEvidenceが返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'docs/units/my-unit/unit_plan.md', '# Unit Plan\n\nSome content');
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create('embedded-qa');

        // Act
        const actual = await sut.readEvidence(node, { unitId: 'my-unit' }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context('plan文書が存在しQAセクションがある場合(interactive)', () => {
      it('exists=true, qaComplete=true, planningModeMatch=trueのPlanEvidenceが返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = '# Unit Plan\n\n## QA\nQ: 質問\n';
        writeFile(rootDir, 'docs/units/my-unit/unit_plan.md', content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create('interactive');

        // Act
        const actual = await sut.readEvidence(node, { unitId: 'my-unit' }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(true);
        expect(actual.planningModeMatch).toBe(true);
      });
    });

    context('plan文書が存在しない場合', () => {
      it('exists=false, qaComplete=false, planningModeMatch=falseのPlanEvidenceが返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create('interactive');

        // Act
        const actual = await sut.readEvidence(node, { unitId: 'my-unit' }, mode);

        // Assert
        expect(actual.exists).toBe(false);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context('PhaseNodeにplanArtifactがない場合', () => {
      it('exists=false, qaComplete=false, planningModeMatch=falseのPlanEvidenceが返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithoutPlan();
        const mode = PlanningMode.create('interactive');

        // Act
        const actual = await sut.readEvidence(node, { unitId: 'my-unit' }, mode);

        // Assert
        expect(actual.exists).toBe(false);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });

    context('Q:の数とA:の数が一致しない場合(embedded-qa)', () => {
      it('qaComplete=falseが返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const content = [
          '# Unit Plan',
          '',
          '## QA',
          'Q: 質問1',
          'A: 回答1',
          'Q: 質問2',
        ].join('\n');
        writeFile(rootDir, 'docs/units/my-unit/unit_plan.md', content);
        const sut = new MarkdownPlanDocumentReader({ rootDir });
        const node = createNodeWithPlan();
        const mode = PlanningMode.create('embedded-qa');

        // Act
        const actual = await sut.readEvidence(node, { unitId: 'my-unit' }, mode);

        // Assert
        expect(actual.exists).toBe(true);
        expect(actual.qaComplete).toBe(false);
        expect(actual.planningModeMatch).toBe(false);
      });
    });
  });
});
