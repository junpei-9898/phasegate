/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { PlanDocumentReaderPort } from '../../domain/ports/plan-document-reader-port.js';
import type { PhaseNode } from '../../domain/values/phase-node.js';
import type { PlanningMode } from '../../domain/values/planning-mode.js';
import { PlanEvidence } from '../../domain/values/plan-evidence.js';

export interface MarkdownPlanDocumentReaderDeps {
  readonly rootDir: string;
}

const QA_SECTION_PATTERN = /^## QA\b/m;
const QUESTION_PATTERN = /^Q:/gm;
const ANSWER_PATTERN = /^A:/gm;

export class MarkdownPlanDocumentReader implements PlanDocumentReaderPort {
  private readonly rootDir: string;

  constructor(deps: MarkdownPlanDocumentReaderDeps) {
    this.rootDir = deps.rootDir;
  }

  async readEvidence(
    node: PhaseNode,
    scope: { unitId?: string; storyId?: string },
    expectedMode: PlanningMode,
  ): Promise<PlanEvidence> {
    const planArtifacts = node.planArtifacts();

    if (planArtifacts.length === 0) {
      return PlanEvidence.create({
        exists: false,
        qaComplete: false,
        planningModeMatch: false,
      });
    }

    const artifact = planArtifacts[0];
    const resolvedPath = artifact.resolve(scope);
    const absolutePath = path.join(this.rootDir, resolvedPath);

    let content: string;
    try {
      content = await readFile(absolutePath, 'utf8');
    } catch {
      return PlanEvidence.create({
        exists: false,
        qaComplete: false,
        planningModeMatch: false,
      });
    }

    const hasQaSection = QA_SECTION_PATTERN.test(content);
    const qaComplete = this.isQaComplete(content, hasQaSection, expectedMode);
    const planningModeMatch = this.detectPlanningModeMatch(
      content,
      hasQaSection,
      expectedMode,
    );

    return PlanEvidence.create({
      exists: true,
      qaComplete,
      planningModeMatch,
    });
  }

  private isQaComplete(
    content: string,
    hasQaSection: boolean,
    expectedMode: PlanningMode,
  ): boolean {
    if (expectedMode.requiresAnsweredQa()) {
      if (!hasQaSection) return false;
      const qaSection = this.extractQaSection(content);
      const questionCount = (qaSection.match(QUESTION_PATTERN) ?? []).length;
      const answerCount = (qaSection.match(ANSWER_PATTERN) ?? []).length;
      return questionCount > 0 && questionCount === answerCount;
    }

    if (expectedMode.requiresQaSection()) {
      return hasQaSection;
    }

    return true;
  }

  private detectPlanningModeMatch(
    content: string,
    hasQaSection: boolean,
    expectedMode: PlanningMode,
  ): boolean {
    if (expectedMode.requiresAnsweredQa()) {
      if (!hasQaSection) return false;
      const qaSection = this.extractQaSection(content);
      const questionCount = (qaSection.match(QUESTION_PATTERN) ?? []).length;
      const answerCount = (qaSection.match(ANSWER_PATTERN) ?? []).length;
      return questionCount > 0 && answerCount === questionCount;
    }

    if (expectedMode.requiresQaSection()) {
      return hasQaSection;
    }

    return true;
  }

  private extractQaSection(content: string): string {
    const match = content.match(QA_SECTION_PATTERN);
    if (!match || match.index === undefined) return '';

    const start = match.index;
    const nextSectionMatch = content.slice(start + match[0].length).match(/^## /m);
    const end = nextSectionMatch?.index
      ? start + match[0].length + nextSectionMatch.index
      : content.length;

    return content.slice(start, end);
  }
}
