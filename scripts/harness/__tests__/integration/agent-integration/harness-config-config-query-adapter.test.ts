// @unit agent-integration
// @layer infrastructure
// @story H11-02

import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { target, context } from '../../helpers/test-helpers.js';
import { ProjectPaths } from '../../../agent-integration/domain/value-objects/project-paths.js';
import { HarnessConfigConfigQueryAdapter } from '../../../agent-integration/infrastructure/adapters/harness-config-config-query-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const ENABLED_CONFIG = path.join(FIXTURES_DIR, 'harness-config-enabled.json');
const DISABLED_CONFIG = path.join(FIXTURES_DIR, 'harness-config-disabled.json');
const WITH_PROJECT_PATHS_CONFIG = path.join(FIXTURES_DIR, 'harness-config-with-project-paths.json');
const CUSTOM_PATHS_CONFIG = path.join(FIXTURES_DIR, 'harness-config-custom-paths.json');

target('HarnessConfigConfigQueryAdapter', () => {
  describe('設定読み取り', () => {
    context('cascadeUpdate=trueのfixture使用時', () => {
      // IT-REPO-ConfigQueryAdapter-001
      it('isHookEnabled("post-tool-use")（cascadeUpdate=true）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled('post-tool-use');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('cascadeUpdate=falseのfixture使用時', () => {
      // IT-REPO-ConfigQueryAdapter-002
      it('isHookEnabled("post-tool-use")（cascadeUpdate=false）がfalseを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(DISABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled('post-tool-use');

        // Assert
        expect(actual).toBe(false);
      });
    });

    context('agentLessonCollection=trueのfixture使用時', () => {
      // IT-REPO-ConfigQueryAdapter-003
      it('isHookEnabled("pre-tool-use")（agentLessonCollection=true）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled('pre-tool-use');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('getProtectedFilePatterns呼び出し時（Wave 2暫定実装）', () => {
      // IT-REPO-ConfigQueryAdapter-004
      it('getProtectedFilePatterns()が空配列を返すこと（Wave 2では追加パターンなし）', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.getProtectedFilePatterns();

        // Assert
        expect(actual).toEqual([]);
      });
    });

    context('Stopフックのデフォルト有効設定', () => {
      // IT-REPO-ConfigQueryAdapter-005
      it('isHookEnabled("stop")（Stopはデフォルト有効）がtrueを返すこと', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);

        // Act
        const actual = await adapter.isHookEnabled('stop');

        // Assert
        expect(actual).toBe(true);
      });
    });

    context('存在しないconfigファイルが指定された場合', () => {
      // IT-REPO-ConfigQueryAdapter-006
      it('phasegate.config.jsonが存在しない場合、エラーがthrowされること', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter('/nonexistent/path/phasegate.config.json');

        // Act & Assert
        await expect(adapter.isHookEnabled('post-tool-use')).rejects.toThrow();
      });
    });

    context('project.pathsセクションが存在する場合', () => {
      // IT-REPO-ConfigQueryAdapter-007
      it('project.pathsセクションありの設定の場合、ProjectPaths VOを返すこと', () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(WITH_PROJECT_PATHS_CONFIG);
        const expected = ProjectPaths.create(
          ['scripts/harness'],
          {
            inception: 'docs/inception',
            construction: 'docs/product/construction',
          },
        );

        // Act
        const actual = adapter.getProjectPaths();

        // Assert
        expect(actual.equals(expected)).toBe(true);
      });
    });

    context('project.pathsセクションが存在しない場合', () => {
      // IT-REPO-ConfigQueryAdapter-008
      it('project.pathsセクションなしの場合、デフォルト値にフォールバックすること', () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(ENABLED_CONFIG);
        const expected = ProjectPaths.create(
          ['scripts/harness'],
          {
            inception: 'docs/inception',
            construction: 'docs/product/construction',
          },
        );

        // Act
        const actual = adapter.getProjectPaths();

        // Assert
        expect(actual.equals(expected)).toBe(true);
      });
    });

    context('project.pathsにカスタム設定がある場合', () => {
      // IT-REPO-ConfigQueryAdapter-009
      it('カスタムパス設定の場合、その設定値をそのまま返すこと', () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter(CUSTOM_PATHS_CONFIG);
        const expected = ProjectPaths.create(
          ['src', 'lib'],
          {
            inception: 'design/inception',
            construction: 'design/construction',
          },
        );

        // Act
        const actual = adapter.getProjectPaths();

        // Assert
        expect(actual.equals(expected)).toBe(true);
      });
    });
  });
});
