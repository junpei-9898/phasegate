// @unit installation
// @layer application
// @story H11-01
// @work-item-id WI-390

import { describe, expect, it, vi } from 'vitest';
import { HuskyRuntimeInactiveCheck } from '../../../../installation/application/checks/husky-runtime-inactive-check.js';
import { HuskyRuntimeState } from '../../../../installation/domain/husky-runtime-state.js';
import type { GitHooksRuntimeProbe } from '../../../../installation/domain/ports/git-hooks-runtime-probe.js';
import { createInspector } from './check-test-helpers.js';

describe('HuskyRuntimeInactiveCheck', () => {
  it('core.hooksPath と Husky v9 shim が有効なら finding を返さないこと', async () => {
    const probe: GitHooksRuntimeProbe = {
      probe: vi.fn().mockResolvedValue(HuskyRuntimeState.active('.husky/_')),
    };

    const actual = await new HuskyRuntimeInactiveCheck(probe).run('/tmp/project', createInspector());

    expect(actual).toBeNull();
  });

  it.each([
    HuskyRuntimeState.inactive('hooks-path-unset', null),
    HuskyRuntimeState.inactive('hooks-path-unsupported', '.git/hooks'),
    HuskyRuntimeState.inactive('shim-missing', '.husky/_'),
  ])('Husky runtime が inactive の場合は red finding を返すこと', async (state) => {
    const probe: GitHooksRuntimeProbe = { probe: vi.fn().mockResolvedValue(state) };

    const actual = await new HuskyRuntimeInactiveCheck(probe).run('/tmp/project', createInspector());

    expect(actual).toMatchObject({
      checkId: 'husky-runtime-inactive',
      severity: 'red',
      target: 'core.hooksPath',
      repairMode: 'mechanical',
    });
  });
});
