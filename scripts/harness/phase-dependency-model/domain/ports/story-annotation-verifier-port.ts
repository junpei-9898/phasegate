// @unit phase-dependency-model
// @layer domain

export interface StoryAnnotationVerificationResult {
  readonly hasAnnotation: boolean;
  readonly storyId?: string;
}

export interface StoryAnnotationVerifierPort {
  verify(
    targetFilePath: string,
    tag: string,
  ): Promise<StoryAnnotationVerificationResult>;
}
