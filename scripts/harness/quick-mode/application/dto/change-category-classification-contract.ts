// @unit quick-mode
// @layer application
// @story H10-05
// @work-item-id WI-220

import type { ChangeRiskAdvice } from '../ports/change-risk-advisory-port.js';

export interface ChangeCategoryPerFile {
  readonly path: string;
  readonly category: string;
}

export interface ChangeCategoryClassificationContract {
  readonly riskAdvice?: readonly ChangeRiskAdvice[];
  readonly dominantCategory: string | null;
  readonly perFile: readonly ChangeCategoryPerFile[];
  readonly fullModeRequired: boolean;
  readonly rejectionRule?: 'CATEGORY_NOT_ALLOWED' | 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly rejectionReason?: string;
}
