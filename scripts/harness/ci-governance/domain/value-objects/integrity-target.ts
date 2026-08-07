// @unit ci-governance
// @layer domain
// @work-item-id WI-384

export interface IntegrityTargetProps {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

/**
 * 整合性 pin の対象ファイル集合を表す不変 VO（include / exclude glob）。
 * v1 固定の既定対象は ADR-030 §Decision.3.① の指示搭載ファイル群。
 */
export class IntegrityTarget {
  readonly include: readonly string[];
  readonly exclude: readonly string[];

  private constructor(props: IntegrityTargetProps) {
    this.include = Object.freeze([...props.include]);
    this.exclude = Object.freeze([...props.exclude]);
    Object.freeze(this);
  }

  static create(props: IntegrityTargetProps): IntegrityTarget {
    return new IntegrityTarget(props);
  }

  /** v1 固定の既定 pin 対象（指示搭載ファイル群） */
  static defaultTargets(): IntegrityTarget {
    return new IntegrityTarget({
      include: [
        "skills/*/SKILL.md",
        ".claude/settings.json",
        ".claude/scripts/*.sh",
        ".codex/hooks.json",
        ".husky/*",
        "docs/templates/agent-context/**",
      ],
      exclude: [],
    });
  }
}
