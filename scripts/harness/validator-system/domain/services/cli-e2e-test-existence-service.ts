/**
 * @layer domain
 * @unit validator-system
 *
 * CliE2eTestExistenceService — H08-09: CLIコマンドE2Eテスト存在チェックドメインサービス
 * CLIハンドラー定義とE2Eテストファイルの突合検証を行う。
 */
import { CliE2eTestCoverageReport, type CliCommandCoverageEntry } from '../value-objects/cli-e2e-test-coverage-report.js';

export class CliE2eTestExistenceService {
  /**
   * 登録済みCLIコマンドとE2Eテストファイル一覧を突合し、カバレッジレポートを生成する。
   * E2Eテストファイルのパスまたは内容にコマンド名が含まれていればカバー済みとみなす。
   */
  check(commands: readonly string[], e2eTestFiles: readonly string[]): CliE2eTestCoverageReport {
    const e2eContent = e2eTestFiles.join('\n').toLowerCase();

    const entries: CliCommandCoverageEntry[] = commands.map((commandName) => ({
      commandName,
      hasE2eTest: e2eContent.includes(commandName.toLowerCase()),
    }));

    return CliE2eTestCoverageReport.create(entries);
  }
}

// @story-id H08-07