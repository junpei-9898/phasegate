/**
 * @layer application
 * @unit agent-integration
 * @story H11-02
 * @work-item-id WI-201
 * @work-item-id WI-202 / WI-204
 * @work-item-id WI-206
 * @work-item-id WI-214
 * @work-item-id WI-349
 * @work-item-id WI-354
 *
 * HandlePreToolUseUseCase
 * PreToolUse Hook処理のオーケストレーション
 */

import type {
  BaselineGrandfatherCheckResult,
  BaselineGrandfatherQueryPort,
} from "../../domain/ports/baseline-grandfather-query-port.js";
import type { ConfigQueryPort } from "../../domain/ports/config-query-port.js";
import type { ErrorGuidance, ErrorGuidanceQueryPort } from "../../domain/ports/error-guidance-query-port.js";
import type { FullModeRequirementQueryPort } from "../../domain/ports/full-mode-requirement-query-port.js";
import type {
  FullModeSessionQueryPort,
  FullModeSessionQueryResult,
} from "../../domain/ports/full-mode-session-query-port.js";
import type { PhaseGateQueryPort } from "../../domain/ports/phase-gate-query-port.js";
import type { StoryReflectionQueryPort } from "../../domain/ports/story-reflection-query-port.js";
import { AsyncHookToCliTranslator } from "../../domain/services/hook-to-cli-translator.js";
import { HookEvent } from "../../domain/value-objects/hook-event.js";
import type { BlockMetadata } from "../../domain/value-objects/hook-translation-result.js";
import { WriteTargetScope } from "../../domain/value-objects/write-target-scope.js";
import type { HandlePreToolUseInput, HandlePreToolUseOutput } from "../dto/handle-pre-tool-use-dto.js";

export interface HandlePreToolUseUseCasePorts {
  configQueryPort: ConfigQueryPort;
  phaseGateQueryPort: PhaseGateQueryPort;
  storyReflectionQueryPort?: StoryReflectionQueryPort;
  fullModeRequirementQueryPort?: FullModeRequirementQueryPort;
  baselineGrandfatherQueryPort?: BaselineGrandfatherQueryPort;
  grandfatherLogger?: (reason: string, targetFilePaths: readonly string[]) => void;
  errorGuidanceQueryPort?: ErrorGuidanceQueryPort;
  fullModeSessionQueryPort?: FullModeSessionQueryPort;
}

export class HandlePreToolUseInputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandlePreToolUseInputValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HandlePreToolUseUseCase {
  private static readonly WRITE_TOOLS: ReadonlySet<string> = new Set([
    "Write",
    "Edit",
    "NotebookEdit",
    "str_replace_editor",
  ]);

  private readonly translator: AsyncHookToCliTranslator;
  private readonly configQueryPort: ConfigQueryPort;
  private readonly phaseGateQueryPort: PhaseGateQueryPort;
  private readonly storyReflectionQueryPort?: StoryReflectionQueryPort;
  private readonly fullModeRequirementQueryPort?: FullModeRequirementQueryPort;
  private readonly baselineGrandfatherQueryPort?: BaselineGrandfatherQueryPort;
  private readonly errorGuidanceQueryPort?: ErrorGuidanceQueryPort;
  private readonly fullModeSessionQueryPort?: FullModeSessionQueryPort;
  private readonly grandfatherLogger: (reason: string, targetFilePaths: readonly string[]) => void;

  constructor(ports: HandlePreToolUseUseCasePorts) {
    this.configQueryPort = ports.configQueryPort;
    this.phaseGateQueryPort = ports.phaseGateQueryPort;
    this.storyReflectionQueryPort = ports.storyReflectionQueryPort;
    this.fullModeRequirementQueryPort = ports.fullModeRequirementQueryPort;
    this.baselineGrandfatherQueryPort = ports.baselineGrandfatherQueryPort;
    this.errorGuidanceQueryPort = ports.errorGuidanceQueryPort;
    this.fullModeSessionQueryPort = ports.fullModeSessionQueryPort;
    this.grandfatherLogger =
      ports.grandfatherLogger ??
      ((reason, paths) => process.stderr.write(`[baseline] grandfather skip (${reason}): ${paths.join(", ")}\n`));
    this.translator = new AsyncHookToCliTranslator({
      configQueryPort: ports.configQueryPort,
      reentryGuard: { isActive: () => false } as never,
      cliCommandRegistryPort: { hasCommand: async () => true },
      phaseGateQueryPort: ports.phaseGateQueryPort,
    });
  }

  private async isFullModeBypassedByDesignDocs(targetFilePaths: readonly string[]): Promise<boolean> {
    const unitId = this.deriveUnitIdFromPaths(targetFilePaths);
    if (unitId === undefined || unitId === "") {
      return false;
    }
    if (typeof this.phaseGateQueryPort.checkDesignDocsExist !== "function") {
      return false;
    }

    try {
      return await this.phaseGateQueryPort.checkDesignDocsExist(unitId);
    } catch {
      return false;
    }
  }

  async execute(input: HandlePreToolUseInput): Promise<HandlePreToolUseOutput> {
    if (!input.toolName || input.toolName.trim() === "") {
      throw new HandlePreToolUseInputValidationError("toolNameは必須です（空文字不可）");
    }

    const grandfather = await this.checkGrandfather(input.targetFilePaths);

    const hookEvent = HookEvent.createPreToolUse(input.toolName, input.targetFilePaths);
    const result = await this.translator.translate(hookEvent);

    if (result.shouldBlock) {
      const metadata = result.blockMetadata;
      const blockedFilePath = metadata?.blockedFilePath ?? input.targetFilePaths[0];

      if (metadata?.reason === "PROTECTED_FILE") {
        return this.buildProtectedFileBlockOutput(blockedFilePath);
      }

      if (metadata?.reason === "PHASE_GATE") {
        if (grandfather.allGrandfathered) {
          this.grandfatherLogger("phase-gate", input.targetFilePaths);
          // fallthrough: continue to full-mode / story-reflection checks (which may also grandfather)
        } else {
          const guidance = await this.resolveGuidance("L2-001");
          const unitIdForGuidance = metadata?.unitId ?? this.deriveUnitIdFromPaths(input.targetFilePaths);
          return HandlePreToolUseUseCase.buildPhaseGateBlockOutput(
            blockedFilePath,
            metadata,
            guidance,
            unitIdForGuidance,
          );
        }
      } else {
        return {
          shouldBlock: true,
          blockedFilePath,
          error: {
            message: `ブロックされました: ${blockedFilePath ?? "不明なファイル"}`,
          },
        };
      }
    }

    let quickModeAllowed: HandlePreToolUseOutput["quickModeAllowed"];
    if (
      HandlePreToolUseUseCase.WRITE_TOOLS.has(input.toolName) &&
      this.fullModeRequirementQueryPort !== undefined &&
      input.targetFilePaths.length > 0
    ) {
      if (grandfather.allGrandfathered) {
        this.grandfatherLogger("full-mode", input.targetFilePaths);
      } else {
        const fullModeResult = await this.fullModeRequirementQueryPort.check(
          input.targetFilePaths,
          input.targetChanges,
        );
        if (fullModeResult.requiresFullMode) {
          const unitIdForGuidance = this.deriveUnitIdFromPaths(input.targetFilePaths);
          const sessionResult = await this.checkFullModeSession(
            input.targetFilePaths,
            unitIdForGuidance,
            fullModeResult.dominantCategory,
          );
          if (sessionResult.allowed) {
            return {
              shouldBlock: false,
              fullModeSessionAllowed: {
                workItemId: sessionResult.workItemId,
                unit: sessionResult.unit,
                expiresAt: sessionResult.expiresAt,
              },
            };
          }
          // ISSUE-021: 当該Unitの必須設計文書が揃っている場合は full mode block を bypass
          //（hook がスキルコンテキストを参照できない構造的ギャップへの対処）
          const bypassedByDesignDocs = await this.isFullModeBypassedByDesignDocs(input.targetFilePaths);
          if (!bypassedByDesignDocs) {
            const guidance = await this.resolveGuidance("L2-001");
            return HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput(
              input.targetFilePaths[0],
              fullModeResult,
              guidance,
              unitIdForGuidance,
              input.callerSkill,
              sessionResult,
            );
          }
        } else {
          quickModeAllowed = { dominantCategory: fullModeResult.dominantCategory };
        }
      }
    }

    const scope = this.resolveStoryReflectionScope(input);
    if (scope === null || this.storyReflectionQueryPort === undefined) {
      return { shouldBlock: false, quickModeAllowed };
    }

    if (grandfather.allGrandfathered) {
      this.grandfatherLogger("story-reflection", input.targetFilePaths);
      return { shouldBlock: false, quickModeAllowed };
    }

    const unitId = scope.unitId;
    if (unitId === undefined) {
      return { shouldBlock: false, quickModeAllowed };
    }

    const reflectionResult = await this.storyReflectionQueryPort.checkReflection(unitId);

    if (reflectionResult.skipped || reflectionResult.passed) {
      return { shouldBlock: false, quickModeAllowed };
    }

    return HandlePreToolUseUseCase.buildStoryReflectionBlockOutput(
      input.targetFilePaths[0],
      reflectionResult.blockers,
      reflectionResult.warnings,
    );
  }

  private async checkGrandfather(targetFilePaths: readonly string[]): Promise<BaselineGrandfatherCheckResult> {
    if (this.baselineGrandfatherQueryPort === undefined) {
      return {
        allGrandfathered: false,
        baselineEnabled: false,
        grandfatheredPaths: [],
      };
    }
    try {
      return await this.baselineGrandfatherQueryPort.check(targetFilePaths);
    } catch {
      return {
        allGrandfathered: false,
        baselineEnabled: false,
        grandfatheredPaths: [],
      };
    }
  }

  private async resolveGuidance(errorCode: string): Promise<ErrorGuidance | null> {
    if (this.errorGuidanceQueryPort === undefined) {
      return null;
    }
    try {
      return await this.errorGuidanceQueryPort.getGuidance(errorCode);
    } catch {
      return null;
    }
  }

  private async checkFullModeSession(
    targetFilePaths: readonly string[],
    unitId: string | undefined,
    dominantCategory: string | undefined,
  ): Promise<FullModeSessionQueryResult> {
    if (this.fullModeSessionQueryPort === undefined) {
      return { active: false, allowed: false };
    }
    try {
      return await this.fullModeSessionQueryPort.check({
        targetFilePaths,
        unitId,
        dominantCategory,
      });
    } catch {
      return { active: false, allowed: false };
    }
  }

  private static buildFullModeRequiredBlockOutput(
    blockedFilePath: string | undefined,
    result: {
      requiresFullMode: boolean;
      rejectionRule?: "MIXED_CHANGES" | "NEW_DOMAIN" | "API_CONTRACT";
      rejectionReason?: string;
      dominantCategory?: string;
    },
    guidance: ErrorGuidance | null,
    unitId: string | undefined,
    callerSkill?: string,
    sessionResult?: FullModeSessionQueryResult,
  ): HandlePreToolUseOutput {
    const fp = blockedFilePath ?? "不明なファイル";
    if (result.dominantCategory === "config" && /(?:^|\/)phasegate\.config\.json$/.test(fp)) {
      const dryRunCommand = "phasegate config:plan --intent quick-mode-relax --dry-run --json";
      const applyCommand = "phasegate config:plan --intent quick-mode-relax --apply --json";
      const lines = [`Full mode 必須変更が検出されました: ${fp}`, "カテゴリ: config"];
      if (result.rejectionRule) {
        lines.push(`判定ルール: ${result.rejectionRule}`);
      }
      if (result.rejectionReason) {
        lines.push(`理由: ${result.rejectionReason}`);
      }
      HandlePreToolUseUseCase.appendJudgmentContextLines(lines, sessionResult);
      lines.push(`次のアクション: ${dryRunCommand} で差分を確認し、承認後に ${applyCommand} を実行してください。`);

      return {
        shouldBlock: true,
        blockedFilePath,
        blockReason: "FULL_MODE_REQUIRED",
        error: { message: lines.join("\n") },
        fullModeRejectionRule: result.rejectionRule,
        fullModeDominantCategory: result.dominantCategory,
        nextAction: `${dryRunCommand} && ${applyCommand}`,
      };
    }
    if (HandlePreToolUseUseCase.shouldGuideQuickModeRelax(result.dominantCategory, callerSkill)) {
      const dryRunCommand = "phasegate config:plan --intent quick-mode-relax --dry-run --json";
      const applyCommand = "phasegate config:plan --intent quick-mode-relax --apply --json";
      const lines: string[] = [`Full mode 必須変更が検出されました: ${fp}`];
      if (result.dominantCategory) {
        lines.push(`カテゴリ: ${result.dominantCategory}`);
      }
      if (result.rejectionRule) {
        lines.push(`判定ルール: ${result.rejectionRule}`);
      }
      if (result.rejectionReason) {
        lines.push(`理由: ${result.rejectionReason}`);
      }
      HandlePreToolUseUseCase.appendJudgmentContextLines(lines, sessionResult);
      lines.push(
        `次のアクション: Quick Mode の許可カテゴリを確認してください。緩和する場合は ${dryRunCommand} で差分を確認し、承認後に ${applyCommand} を実行してください。`,
      );
      lines.push(`  分類の確認: npx phasegate check-change-category --paths ${fp}`);

      return {
        shouldBlock: true,
        blockedFilePath,
        blockReason: "FULL_MODE_REQUIRED",
        error: { message: lines.join("\n") },
        fullModeRejectionRule: result.rejectionRule,
        fullModeDominantCategory: result.dominantCategory,
        nextAction: `${dryRunCommand} && ${applyCommand}`,
      };
    }
    const lines: string[] = [`Full mode 必須変更が検出されました: ${fp}`];
    if (result.dominantCategory) {
      lines.push(`カテゴリ: ${result.dominantCategory}`);
    }
    if (result.rejectionRule) {
      lines.push(`判定ルール: ${result.rejectionRule}`);
    }
    if (result.rejectionReason) {
      lines.push(`理由: ${result.rejectionReason}`);
    }
    HandlePreToolUseUseCase.appendJudgmentContextLines(lines, sessionResult);
    const suggestedSkill = guidance?.suggestedSkill ?? "/story-implementor";
    lines.push(`次のアクション: ${suggestedSkill} スキルを使用して設計フェーズから開始してください。`);
    if (unitId !== undefined && unitId !== "") {
      if (HandlePreToolUseUseCase.isSessionActiveButRejected(sessionResult)) {
        lines.push(
          `  既存 session は上記理由で今回の書き込みに使えません。張り直す場合: phasegate session end --work-item ${sessionResult?.workItemId ?? "<WI-XXX>"} を実行してから下記を実行してください。`,
        );
      }
      lines.push(
        `  実装フェーズ開始時: phasegate session begin --mode full --unit ${unitId} --work-item <WI-XXX> --reason "<reason>" --duration 1h`,
      );
      lines.push("  実装完了時: phasegate session end --work-item <WI-XXX>");
    }
    HandlePreToolUseUseCase.appendGuidanceLines(lines, guidance, unitId);

    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: "FULL_MODE_REQUIRED",
      error: { message: lines.join("\n") },
      fullModeRejectionRule: result.rejectionRule,
      fullModeDominantCategory: result.dominantCategory,
      nextAction: suggestedSkill,
    };
  }

  /**
   * Quick Mode スコープのカテゴリ（bugfix / docs / test / config）は quick-implementor で
   * 完遂できる変更であり、遮断の実体は「allowedCategories が絞られている」ことである。
   * ここで /story-implementor を案内すると、設計フェーズからやり直せという誤った指示になる。
   *
   * WI-354: 従来は callerSkill === "quick-implementor" を条件にしていたが、
   * callerSkill を供給する producer（hook input の caller_skill / PHASEGATE_CALLER_SKILL）は
   * 実運用で設定されず、この分岐は到達不能だった。カテゴリを一次条件にして
   * skill context なしでも実用的な復旧手順を出す。
   * feature / domain / api は従来どおり /story-implementor 誘導を維持する。
   */
  private static readonly QUICK_MODE_SCOPE_CATEGORIES: readonly string[] = ["bugfix", "docs", "test", "config"];

  private static shouldGuideQuickModeRelax(dominantCategory: string | undefined, callerSkill?: string): boolean {
    if (dominantCategory !== undefined) {
      return HandlePreToolUseUseCase.QUICK_MODE_SCOPE_CATEGORIES.includes(dominantCategory);
    }
    // カテゴリ不明時は skill context だけが手掛かり
    return callerSkill === "quick-implementor";
  }

  /**
   * WI-349: ブロック理由に判定根拠を明示する。
   *
   * - 判定対象は「今回の書き込み対象パス」だけであり、ワークツリー上の未コミット変更は
   *   一切含まれない。この誤解が「無関係な変更のせいでブロックされている」という
   *   誤った原因究明を招いていた（issue #41 症状②）。
   * - アクティブな Full Mode session がありながら不許可だった場合は、その理由
   *   （unit 不一致 / category 不一致 / 期限切れ 等）を提示する。これがないと
   *   「session begin せよ」と案内されながら session は既に有効、という最悪の混乱になる。
   */
  private static appendJudgmentContextLines(
    lines: string[],
    sessionResult: FullModeSessionQueryResult | undefined,
  ): void {
    lines.push("判定対象: 今回の書き込み対象パスのみです（ワークツリー上の他の未コミット変更は判定に含まれません）。");
    if (!HandlePreToolUseUseCase.isSessionActiveButRejected(sessionResult)) {
      return;
    }
    const workItemId = sessionResult?.workItemId ?? "<unknown>";
    const unit = sessionResult?.unit ?? "<unknown>";
    const expiresAt = sessionResult?.expiresAt ?? "<unknown>";
    lines.push(`アクティブな Full Mode session: ${workItemId} (unit=${unit}, expiresAt=${expiresAt})`);
    lines.push(`session が書き込みを許可しなかった理由: ${sessionResult?.reason ?? "<unknown>"}`);
  }

  private static isSessionActiveButRejected(sessionResult: FullModeSessionQueryResult | undefined): boolean {
    return sessionResult !== undefined && sessionResult.active && !sessionResult.allowed;
  }

  private static appendGuidanceLines(lines: string[], guidance: ErrorGuidance | null, unitId?: string): void {
    if (guidance === null) return;
    if (guidance.scaffoldCommand !== null) {
      const command =
        unitId !== undefined && unitId !== ""
          ? guidance.scaffoldCommand.replaceAll("<unit-id>", unitId)
          : guidance.scaffoldCommand;
      lines.push(`  scaffold: ${command}`);
    }
    if (guidance.templatePath !== null) {
      lines.push(`  構成リファレンス: ${HandlePreToolUseUseCase.describeStructureReference(guidance.templatePath)}`);
    }
  }

  /**
   * WI-356 (issue #29): 参照先が skill 定義（skills/<name>/SKILL.md）の場合、
   * skills/ をユーザー repo に配置しない personal install 経路でも読めるよう
   * stdout 経路（phasegate skills info）を併記する。
   */
  private static readonly SKILL_REFERENCE_PATTERN = /^skills\/([^/]+)\/SKILL\.md$/;

  private static describeStructureReference(templatePath: string): string {
    const skillMatch = HandlePreToolUseUseCase.SKILL_REFERENCE_PATTERN.exec(templatePath);
    if (skillMatch === null) {
      return templatePath;
    }
    return `${templatePath}（未配置なら: npx phasegate skills info ${skillMatch[1]}）`;
  }

  private deriveUnitIdFromPaths(targetFilePaths: readonly string[]): string | undefined {
    const projectPaths = this.configQueryPort.getProjectPaths();
    for (const targetFilePath of targetFilePaths) {
      const scope = WriteTargetScope.fromPath(targetFilePath, projectPaths);
      if (scope?.unitId !== undefined) {
        return scope.unitId;
      }
    }
    return undefined;
  }

  private resolveStoryReflectionScope(input: HandlePreToolUseInput): WriteTargetScope | null {
    if (!HandlePreToolUseUseCase.WRITE_TOOLS.has(input.toolName)) {
      return null;
    }

    const projectPaths = this.configQueryPort.getProjectPaths();
    const inceptionPath = projectPaths.getDocsInception();

    for (const targetFilePath of input.targetFilePaths) {
      // WI-026 G1: inception 配下の書込は Phase 1 work であり Phase 3 reflection 対象外。
      // 仕様上 Phase 3 = scripts/harness/{unit}/(domain|application|infrastructure|presentation)/*.ts
      // のみが reflection check の対象。inception 編集を含めると _cross/{WI-XXX}/ 編集が
      // 仮想パス docs/product/construction/_cross/ への反映を要求し常時 block される。
      if (HandlePreToolUseUseCase.isUnderInception(targetFilePath, inceptionPath)) {
        continue;
      }

      const scope = WriteTargetScope.fromPath(targetFilePath, projectPaths);
      if (scope?.level === 3 && scope.unitId !== undefined) {
        return scope;
      }
    }

    return null;
  }

  private static isUnderInception(targetFilePath: string, inceptionPath: string): boolean {
    const normalizedTarget = targetFilePath
      .replaceAll("\\", "/")
      .replace(/^\.\/+/, "")
      .replace(/\/+/g, "/");
    const normalizedBase = inceptionPath
      .replaceAll("\\", "/")
      .replace(/^\.\/+/, "")
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");
    return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}/`);
  }

  private static readonly LEVEL_LABELS: Record<number, string> = {
    1: "プロダクト設計",
    2: "構築設計",
    3: "実装",
  };

  private static buildPhaseGateBlockOutput(
    blockedFilePath: string | undefined,
    metadata: BlockMetadata,
    guidance: ErrorGuidance | null,
    unitId: string | undefined,
  ): HandlePreToolUseOutput {
    const levelLabel = metadata.scopeLevel
      ? (HandlePreToolUseUseCase.LEVEL_LABELS[metadata.scopeLevel] ?? `Level ${metadata.scopeLevel}`)
      : "不明";
    const blockers = metadata.phaseGateBlockers ?? [];
    const lines: string[] = [
      `フェーズゲート違反: ${blockedFilePath ?? "不明なファイル"}`,
      `対象スコープ: Level ${metadata.scopeLevel ?? "?"} (${levelLabel})${metadata.unitId ? `, Unit: ${metadata.unitId}` : ""}`,
    ];

    if (blockers.length > 0) {
      lines.push("ブロック理由:");
      for (const b of blockers) {
        lines.push(`  - ${b}`);
      }
    }

    const suggestedSkill = guidance?.suggestedSkill ?? "/story-implementor";
    lines.push(`次のアクション: ${suggestedSkill} スキルを使用して設計フェーズから開始してください。`);
    if (metadata.unitId) {
      lines.push(`  実行例: ${suggestedSkill} --unit ${metadata.unitId}`);
    }
    HandlePreToolUseUseCase.appendGuidanceLines(lines, guidance, unitId);

    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: "PHASE_GATE",
      error: { message: lines.join("\n") },
      phaseGateBlockers: [...blockers],
      nextAction: metadata.unitId ? `${suggestedSkill} --unit ${metadata.unitId}` : suggestedSkill,
    };
  }

  private static readonly PROTECTED_FILE_GUIDANCE: ReadonlyArray<{
    pattern: RegExp;
    message: (filePath: string) => string;
  }> = [
    {
      pattern: /(?:^|\/)package\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nバージョン変更を含む package.json の更新は /quick-implementor スキルを使用してください。`,
    },
    {
      pattern: /(?:^|\/)phasegate\.config\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nQuick Mode 設定の復旧は CLI 経由で計画・適用してください: phasegate config:plan --intent quick-mode-relax --dry-run --json / phasegate config:plan --intent quick-mode-relax --apply --json`,
    },
    {
      pattern: /(?:^|\/)harness\.config\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nハーネス設定は CLI 経由で変更してください: npx phasegate config ...`,
    },
    {
      pattern: /(?:^|\/)\.claude\/settings\.json$/,
      message: (fp) =>
        `保護ファイルへの書き込みがブロックされました: ${fp}\nClaude Code の設定変更は /update-config スキルを使用してください。`,
    },
  ];

  private async buildProtectedFileBlockOutput(blockedFilePath: string | undefined): Promise<HandlePreToolUseOutput> {
    const fp = blockedFilePath ?? "不明なファイル";
    const dynamicPrinciplesPattern = await this.findMatchingDynamicProtectedPattern(fp, "principles");
    if (dynamicPrinciplesPattern !== null) {
      return {
        shouldBlock: true,
        blockedFilePath,
        blockReason: "PROTECTED_FILE",
        error: {
          message: `保護ファイルへの書き込みがブロックされました: ${fp}\n原則ドキュメントは immutable です。変更はできません。対象パターン: ${dynamicPrinciplesPattern}`,
        },
      };
    }

    const matched = HandlePreToolUseUseCase.PROTECTED_FILE_GUIDANCE.find(({ pattern }) => pattern.test(fp));
    const message = matched
      ? matched.message(fp)
      : `保護ファイルへの書き込みがブロックされました: ${fp}\nこのファイルは保護されています。/quick-implementor スキルで変更可能か確認してください。`;

    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: "PROTECTED_FILE",
      error: { message },
    };
  }

  private async findMatchingDynamicProtectedPattern(filePath: string, kind: "principles"): Promise<string | null> {
    const patterns = await this.configQueryPort.getProtectedFilePatterns();
    for (const pattern of patterns) {
      if (kind === "principles" && !pattern.endsWith("/**")) {
        continue;
      }
      const prefix = pattern.slice(0, -"/**".length);
      if (filePath === prefix || filePath.startsWith(`${prefix}/`)) {
        return pattern;
      }
    }
    return null;
  }

  private static buildStoryReflectionBlockOutput(
    blockedFilePath: string | undefined,
    blockers: readonly string[],
    warnings: readonly string[],
  ): HandlePreToolUseOutput {
    return {
      shouldBlock: true,
      blockedFilePath,
      blockReason: "STORY_REFLECTION",
      error: {
        message: HandlePreToolUseUseCase.buildStoryReflectionErrorMessage(blockers),
      },
      storyReflectionBlockers: [...blockers],
      storyReflectionWarnings: [...warnings],
    };
  }

  private static buildStoryReflectionErrorMessage(blockers: readonly string[]): string {
    const firstBlocker = blockers[0];
    const details =
      firstBlocker === undefined ? null : HandlePreToolUseUseCase.extractStoryReflectionDetails(firstBlocker);
    const lines: string[] = [];

    const annotationKey = HandlePreToolUseUseCase.annotationKeyFor(details?.storyId);

    if (details !== null) {
      lines.push(`[L2-STORY-REFLECTION] ${details.productPath} に`);
      lines.push(`@${annotationKey} ${details.storyId} が反映されていません。`);
      lines.push("");
    } else {
      lines.push(`[L2-STORY-REFLECTION] product 文書に @${annotationKey} が反映されていません。`);
      lines.push("");
    }

    for (const blocker of blockers) {
      lines.push(`- ${blocker}`);
    }

    lines.push("");
    lines.push("修正方法:");
    lines.push("  1. cascade-updater を実行して product 文書を更新");
    lines.push(`  2. または手動で該当 product 文書に @${annotationKey} ${details?.storyId ?? "<WORK-ITEM-ID>"} を追加`);
    lines.push("");
    lines.push("参照: ADR-XXX");

    return lines.join("\n");
  }

  private static annotationKeyFor(storyId: string | undefined): "work-item-id" | "story-id" {
    return storyId !== undefined && /^WI-\d+$/.test(storyId) ? "work-item-id" : "story-id";
  }

  private static extractStoryReflectionDetails(blocker: string): { productPath: string; storyId: string } | null {
    const productPathMatch = blocker.match(/docs\/product\/construction\/[^\s]+\.md/);
    const storyIdMatch = blocker.match(/@story-id\s+([A-Z][\w-]*-\d+)|\b([A-Z][\w-]*-\d+)\b/);
    const storyId = storyIdMatch?.[1] ?? storyIdMatch?.[2];

    if (productPathMatch === null || storyId === undefined) {
      return null;
    }

    return {
      productPath: productPathMatch[0],
      storyId,
    };
  }
}
