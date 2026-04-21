/**
 * @layer application
 * @unit quick-mode
 * @story H10-05
 *
 * ChangeCategoryClassification の公開 DTO
 */

export interface ChangeCategoryPerFile {
  readonly path: string;
  readonly category: string;
}

export interface ChangeCategoryClassificationContract {
  readonly dominantCategory: string | null;
  readonly perFile: readonly ChangeCategoryPerFile[];
  readonly fullModeRequired: boolean;
  readonly rejectionRule?: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly rejectionReason?: string;
}
