/**
 * @layer infrastructure
 * @unit phase2-extensions
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface PlaywrightTemplateConfig {
  projectName: string;
  baseUrl: string;
}

export interface PlaywrightTemplateResult {
  generatedFiles: string[];
  errors: string[];
}

export class PlaywrightTemplateGeneratorAdapter {
  constructor(private readonly config: PlaywrightTemplateConfig) {}

  async generate(outputDir: string): Promise<PlaywrightTemplateResult> {
    const generatedFiles: string[] = [];
    const errors: string[] = [];

    const files: { relativePath: string; content: string }[] = [
      { relativePath: 'playwright.config.ts', content: this.generateConfig() },
      { relativePath: path.join('pages', 'base-page.ts'), content: this.generateBasePage() },
      { relativePath: path.join('fixtures', 'seed-data.ts'), content: this.generateSeedData() },
      { relativePath: path.join('tests', 'example.spec.ts'), content: this.generateExampleSpec() },
    ];

    for (const file of files) {
      const fullPath = path.join(outputDir, file.relativePath);
      try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, file.content, 'utf8');
        generatedFiles.push(file.relativePath);
      } catch (err) {
        errors.push(`Failed to write ${file.relativePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { generatedFiles, errors };
  }

  private generateConfig(): string {
    return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: '${this.config.baseUrl}',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
`;
  }

  private generateBasePage(): string {
    return `import { type Page, type Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }
}
`;
  }

  private generateSeedData(): string {
    return `/**
 * SeedData — E2Eテスト用シードデータ管理
 * プロジェクト: ${this.config.projectName}
 */

export interface SeedData {
  readonly id: string;
  readonly name: string;
  readonly data: Record<string, unknown>;
}

export const defaultSeeds: readonly SeedData[] = [
  {
    id: 'seed-001',
    name: 'デフォルトユーザー',
    data: {
      email: 'test@example.com',
      role: 'admin',
    },
  },
];

export async function loadSeeds(): Promise<readonly SeedData[]> {
  return defaultSeeds;
}

export async function clearSeeds(): Promise<void> {
  // テスト後のクリーンアップ処理をここに実装
}
`;
  }

  private generateExampleSpec(): string {
    return `import { test, expect } from '@playwright/test';

test.describe('${this.config.projectName} E2E', () => {
  test('トップページが表示されること', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
  });

  test('ナビゲーションが動作すること', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // TODO: プロジェクト固有のナビゲーションテストを追加
  });
});
`;
  }
}
