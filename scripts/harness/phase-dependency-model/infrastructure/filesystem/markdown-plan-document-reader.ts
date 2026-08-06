/**
 * @layer infrastructure
 * @unit phase-dependency-model
 * @work-item-id WI-369
 */

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { PlanDocumentReaderPort } from "../../domain/ports/plan-document-reader-port.js";
import { DEFAULT_PATH_ROOTS, type PathRoots } from "../../domain/values/artifact.js";
import type { PhaseNode } from "../../domain/values/phase-node.js";
import { PlanEvidence } from "../../domain/values/plan-evidence.js";
import type { PlanningMode } from "../../domain/values/planning-mode.js";

export interface MarkdownPlanDocumentReaderDeps {
  readonly rootDir: string;
}

/**
 * WI-358 (issue #29): 見出しの表記ゆれで Planning Mode の evidence 判定が落ちる罠を潰す。
 *
 * 旧パターンは "QA" 綴りしか受け付けず、エージェントが自然に書く `## Q&A` /
 * 全角の `## Q＆A` を弾いていた。中身は同一なのに phase gate だけが落ち、
 * 原因が見出しの綴りだと気付けないまま止まる。
 *
 * 緩和方向のみの変更であり、既存の `## QA` / `## 4. QA（不明点・確認事項）` は
 * すべて従来どおりマッチする。
 */
const QA_SECTION_PATTERN = /^##+\s*(?:\d+[.．]\s*)?Q[&＆]?A\b/m;
const QUESTION_PATTERN = /^(?:Q:|###\s*\[Question\])/gm;
const LEGACY_ANSWER_PATTERN = /^A:/gm;
const STRUCTURED_ANSWER_PATTERN = /^\[Answer\][ \t]*$/gm;
const ANSWER_BODY_BOUNDARY_PATTERN = /^(?:###\s*\[Question\]|#{1,6}\s+)/m;

export class MarkdownPlanDocumentReader implements PlanDocumentReaderPort {
  private readonly rootDir: string;

  constructor(deps: MarkdownPlanDocumentReaderDeps) {
    this.rootDir = deps.rootDir;
  }

  async readEvidence(
    node: PhaseNode,
    scope: { unitId?: string; storyId?: string },
    expectedMode: PlanningMode,
    pathRoots: PathRoots = DEFAULT_PATH_ROOTS,
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
    let resolvedPath: string;
    try {
      resolvedPath = artifact.resolve(scope, pathRoots);
    } catch {
      return PlanEvidence.create({
        exists: false,
        qaComplete: false,
        planningModeMatch: false,
      });
    }
    const absolutePath = path.join(this.rootDir, resolvedPath);

    let content: string;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      return PlanEvidence.create({
        exists: false,
        qaComplete: false,
        planningModeMatch: false,
      });
    }

    const hasQaSection = QA_SECTION_PATTERN.test(content);
    const qaComplete = this.isQaComplete(content, hasQaSection, expectedMode);
    const planningModeMatch = this.detectPlanningModeMatch(content, hasQaSection, expectedMode);

    return PlanEvidence.create({
      exists: true,
      qaComplete,
      planningModeMatch,
    });
  }

  private isQaComplete(content: string, hasQaSection: boolean, expectedMode: PlanningMode): boolean {
    if (expectedMode.requiresAnsweredQa()) {
      if (!hasQaSection) return false;
      const qaSection = this.extractQaSection(content);
      const questionCount = (qaSection.match(QUESTION_PATTERN) ?? []).length;
      const answerCount = this.countAnswers(qaSection);
      return questionCount > 0 && questionCount === answerCount;
    }

    if (expectedMode.requiresQaSection()) {
      return hasQaSection;
    }

    return true;
  }

  private detectPlanningModeMatch(content: string, hasQaSection: boolean, expectedMode: PlanningMode): boolean {
    if (expectedMode.requiresAnsweredQa()) {
      if (!hasQaSection) return false;
      const qaSection = this.extractQaSection(content);
      const questionCount = (qaSection.match(QUESTION_PATTERN) ?? []).length;
      const answerCount = this.countAnswers(qaSection);
      return questionCount > 0 && answerCount === questionCount;
    }

    if (expectedMode.requiresQaSection()) {
      return hasQaSection;
    }

    return true;
  }

  private extractQaSection(content: string): string {
    const match = content.match(QA_SECTION_PATTERN);
    if (!match || match.index === undefined) return "";

    const start = match.index;
    const sectionContentStart = start + match[0].length;
    const sectionContent = content.slice(sectionContentStart);
    const headingMarker = match[0].match(/^##+/)?.[0];
    if (!headingMarker) return "";

    const sameLevelHeadingPattern = new RegExp(`^${headingMarker}(?!#)[ \\t]+(.+)$`, "gm");
    let end = content.length;
    for (const headingMatch of sectionContent.matchAll(sameLevelHeadingPattern)) {
      if (/^\[Question\](?:\s|$)/.test(headingMatch[1].trimStart())) continue;
      if (headingMatch.index !== undefined) {
        end = sectionContentStart + headingMatch.index;
        break;
      }
    }

    return content.slice(start, end);
  }

  private countAnswers(qaSection: string): number {
    const legacyAnswerCount = (qaSection.match(LEGACY_ANSWER_PATTERN) ?? []).length;
    let structuredAnswerCount = 0;

    for (const answerMatch of qaSection.matchAll(STRUCTURED_ANSWER_PATTERN)) {
      if (answerMatch.index === undefined) continue;
      const bodyStart = answerMatch.index + answerMatch[0].length;
      const followingContent = qaSection.slice(bodyStart);
      const boundaryMatch = followingContent.match(ANSWER_BODY_BOUNDARY_PATTERN);
      const answerBody =
        boundaryMatch?.index === undefined ? followingContent : followingContent.slice(0, boundaryMatch.index);
      const hasBody = answerBody.split(/\r?\n/).some((line) => line.trim().length > 0);
      if (hasBody) structuredAnswerCount += 1;
    }

    return legacyAnswerCount + structuredAnswerCount;
  }
}
