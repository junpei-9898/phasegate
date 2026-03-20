/**
 * @layer application
 * @unit quick-mode
 *
 * QuickModeEligibility の公開 DTO
 */

export interface QuickModeEligibilityContract {
  readonly eligible: boolean;
  readonly reason: string;
  readonly rejectionRule?: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly rejectedFiles?: readonly { filePath: string; changeKind: string }[];
}
