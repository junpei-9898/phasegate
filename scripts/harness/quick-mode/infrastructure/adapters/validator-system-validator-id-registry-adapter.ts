/**
 * @layer infrastructure
 * @unit quick-mode
 * @work-item-id WI-140 / WI-156
 *
 * integration_contract.md §9 の確定ID一覧を静的定義で保持する ValidatorIdRegistry Adapter
 */

const STATIC_VALIDATOR_IDS: readonly string[] = Object.freeze([
  'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
  'L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005', 'L4-006',
]);

export class ValidatorSystemValidatorIdRegistryAdapter {
  getAllValidatorIds(): readonly string[] {
    return STATIC_VALIDATOR_IDS;
  }

  async getAllIds(): Promise<readonly string[]> {
    return STATIC_VALIDATOR_IDS;
  }
}
