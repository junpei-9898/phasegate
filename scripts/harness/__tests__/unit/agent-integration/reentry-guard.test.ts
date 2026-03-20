// @unit agent-integration
// @layer domain
// @story H11-04

import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ReentryGuard, ReentryGuardAlreadyActiveError } from '../../../agent-integration/domain/entities/reentry-guard.js';

target('ReentryGuard', () => {
  describe('初期状態を取得する', () => {
    // UT-RG-001
    it('新規インスタンスのisActive()がfalseであること', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('activate()が呼ばれた場合', () => {
    // UT-RG-010
    it('isActive()がtrueに変わること', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      sut.activate();
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('active状態でdeactivate()が呼ばれた場合', () => {
    // UT-RG-011
    it('isActive()がfalseに戻ること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      sut.deactivate();
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('inactive状態でdeactivate()が呼ばれた場合', () => {
    // UT-RG-012
    it('isActive()がfalseのままであること（冪等性）', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      sut.deactivate(); // 例外なし
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('active状態でisActive()が呼ばれた場合', () => {
    // UT-RG-013
    it('trueを返すこと', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('inactive状態でisActive()が呼ばれた場合', () => {
    // UT-RG-014
    it('falseを返すこと', () => {
      // Arrange
      const sut = new ReentryGuard();
      // Act
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(false);
    });
  });

  context('active状態でactivate()が呼ばれた場合（INV-1違反）', () => {
    // UT-RG-020
    it('ReentryGuardAlreadyActiveErrorがthrowされること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      const actual = () => sut.activate();
      // Assert
      expect(actual).toThrow(ReentryGuardAlreadyActiveError);
    });

    // UT-RG-021
    it('エラーメッセージに「二重activate」または「ReentryGuard」等の識別情報が含まれること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      let caughtError: Error | undefined;
      // Act
      try {
        sut.activate();
      } catch (e) {
        caughtError = e as Error;
      }
      const actual = caughtError?.message ?? '';
      // Assert
      expect(actual).toMatch(/二重activate|ReentryGuard/);
    });
  });

  context('activate → deactivate → activate のシーケンスの場合', () => {
    // UT-RG-030
    it('2回目のactivate()が成功しisActive()がtrueになること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      sut.deactivate();
      // Act
      sut.activate();
      const actual = sut.isActive();
      // Assert
      expect(actual).toBe(true);
    });
  });

  context('activate → activate のシーケンスの場合', () => {
    // UT-RG-031
    it('2回目のactivate()でReentryGuardAlreadyActiveErrorがthrowされること', () => {
      // Arrange
      const sut = new ReentryGuard();
      sut.activate();
      // Act
      const actual = () => sut.activate();
      // Assert
      expect(actual).toThrow(ReentryGuardAlreadyActiveError);
    });
  });
});
