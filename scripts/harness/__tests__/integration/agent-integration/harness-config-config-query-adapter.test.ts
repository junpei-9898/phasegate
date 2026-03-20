// @unit agent-integration
// @layer infrastructure
// @story H11-02

import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessConfigConfigQueryAdapter } from '../../../agent-integration/infrastructure/adapters/harness-config-config-query-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const ENABLED_CONFIG = path.join(FIXTURES_DIR, 'harness-config-enabled.json');
const DISABLED_CONFIG = path.join(FIXTURES_DIR, 'harness-config-disabled.json');

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
      it('harness.config.jsonが存在しない場合、エラーがthrowされること', async () => {
        // Arrange
        const adapter = new HarnessConfigConfigQueryAdapter('/nonexistent/path/harness.config.json');

        // Act & Assert
        await expect(adapter.isHookEnabled('post-tool-use')).rejects.toThrow();
      });
    });
  });
});
