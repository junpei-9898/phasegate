// @layer domain
// @unit nyquist-validation
// @work-item-id WI-131
//
// RequirementIntentCoverageService が入出力に用いるドメイン層の型定義。
// 依存方向是正: これまで domain 層のサービスが application/dto から型を import しており
// domain → application の逆流（レイヤー依存違反）が発生していた。型の正準を domain 層へ
// 移し、application 層の DTO はここを参照する（domain ← application の正しい向き）。

export interface IntentCoverageTestReference {
  readonly filePath: string;
  readonly testType: 'unit' | 'it' | 'scenario';
  readonly testName?: string;
}

export interface IntentCoverageAcMapping {
  readonly acId: string;
  readonly testReferences: readonly IntentCoverageTestReference[];
}

export interface IntentCoverageStory {
  readonly storyId: string;
  readonly storyMappings: readonly IntentCoverageAcMapping[];
}

export type IntentCoverageStatus = 'observed' | 'weakly-observed' | 'unobserved';

export interface IntentCoverageItem {
  readonly storyId: string;
  readonly acId: string;
  readonly status: IntentCoverageStatus;
  readonly warnings: readonly string[];
}
