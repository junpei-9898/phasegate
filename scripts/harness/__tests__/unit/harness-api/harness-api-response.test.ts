// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { HarnessApiResponse } from '../../../harness-api/domain/value-objects/harness-api-response.js';
import type { HarnessError } from '../../../harness-api/domain/value-objects/harness-api-response.js';

function buildHarnessError(): HarnessError {
  return { code: 'TEST_ERROR', severity: 'error', message: 'テスト用エラー' };
}

target('HarnessApiResponse', () => {
  describe('正常系: 有効な引数でHarnessApiResponseを生成する', () => {
    // UT-HAR-001
    it('status=passでHarnessApiResponseが生成されること', () => {
      // Arrange
      const input = { status: 'pass' as const, errors: [], summary: 'チェック完了', data: { count: 1 } };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.status).toBe('pass');
      expect(actual.errors).toHaveLength(0);
    });

    // UT-HAR-002
    it('status=failかつerrorsに1件以上でHarnessApiResponseが生成されること', () => {
      // Arrange
      const error = buildHarnessError();
      const input = { status: 'fail' as const, errors: [error], summary: '検証失敗' };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.status).toBe('fail');
      expect(actual.errors).toHaveLength(1);
    });

    // UT-HAR-003
    it('status=errorかつerrorsに1件以上でHarnessApiResponseが生成されること', () => {
      // Arrange
      const error = buildHarnessError();
      const input = { status: 'error' as const, errors: [error], summary: '実行時エラー' };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.status).toBe('error');
    });

    // UT-HAR-004
    it('status=passでdata省略（undefined）のHarnessApiResponseが生成されること', () => {
      // Arrange
      const input = { status: 'pass' as const, errors: [], summary: 'チェック完了' };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.data).toBeUndefined();
    });
  });

  describe('不変条件テスト', () => {
    // UT-HAR-005 (INV-3: passのときerrorsは空配列)
    it('status=passかつerrorsに1件でエラーをthrowすること', () => {
      // Arrange
      const error = buildHarnessError();
      const input = { status: 'pass' as const, errors: [error], summary: 'チェック完了' };
      // Act
      const actual = () => HarnessApiResponse.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HAR-006 (INV-4: failのときerrorsは1件以上)
    it('status=failかつerrors=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { status: 'fail' as const, errors: [], summary: '検証失敗' };
      // Act
      const actual = () => HarnessApiResponse.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HAR-007 (INV-4: errorのときerrorsは1件以上)
    it('status=errorかつerrors=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { status: 'error' as const, errors: [], summary: '実行時エラー' };
      // Act
      const actual = () => HarnessApiResponse.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('等値性テスト', () => {
    // UT-HAR-008
    it('同一内容を持つ2つのHarnessApiResponseが等価であること', () => {
      // Arrange
      const a = HarnessApiResponse.pass('テスト');
      const b = HarnessApiResponse.pass('テスト');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });
  });

  // UT-BND-003
  it('UT-BND-003: toExitCode()がstatus=passで0を返すこと', () => {
    // Arrange
    const response = HarnessApiResponse.pass('テスト');
    // Act
    const actual = response.toExitCode();
    // Assert
    expect(actual).toBe(0);
  });
});
