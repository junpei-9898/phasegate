/**
 * @layer domain
 * @unit skill-quality
 */

export interface RequirementTestMatrix {
  readonly storyId: string;
  readonly total: number;
  readonly covered: number;
  readonly uncoveredIds: readonly string[];
}

export interface RequirementTestMatrixPort {
  read(storyId: string): Promise<RequirementTestMatrix>;
}
