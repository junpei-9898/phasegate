// @unit nyquist-validation
// @layer application

export interface TestReferenceDto {
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
}

export interface AnalyzeImpactOutput {
  readonly storyId: string;
  readonly directTests: readonly TestReferenceDto[];
  readonly directMappingOnly: true;
  readonly found: boolean;
}
