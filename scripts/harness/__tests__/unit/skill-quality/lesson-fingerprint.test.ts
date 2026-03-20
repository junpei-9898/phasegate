import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LessonFingerprint } from '../../../skill-quality/domain/value-objects/lesson-fingerprint.js';

target('LessonFingerprint', () => {

  describe('fromContent: value が 64 文字の 16 進数文字列になること', () => {
    context("content='教訓テキスト' の場合", () => {
      it('value が 64 文字の hex 文字列である', () => {
        const actual = LessonFingerprint.fromContent('教訓テキスト');
        expect(actual.value).toMatch(/^[0-9a-f]{64}$/);
      });
    });
  });

  describe('fromContent: 同一 content から同一 value が生成されること', () => {
    context('同一 content で 2 回呼ぶ場合', () => {
      it('同一 value が返される', () => {
        const a = LessonFingerprint.fromContent('同じ内容');
        const b = LessonFingerprint.fromContent('同じ内容');
        expect(a.value).toBe(b.value);
      });
    });
  });

  describe('fromContent: 異なる content から異なる value が生成されること', () => {
    context('異なる content で呼ぶ場合', () => {
      it('異なる value が返される', () => {
        const a = LessonFingerprint.fromContent('内容A');
        const b = LessonFingerprint.fromContent('内容B');
        expect(a.value).not.toBe(b.value);
      });
    });
  });

  describe('fromContent: 空白正規化後に同一 content は同一 value', () => {
    context('連続空白と単一空白の場合', () => {
      it('同一 value が返される', () => {
        const a = LessonFingerprint.fromContent('教訓 テキスト');
        const b = LessonFingerprint.fromContent('教訓  テキスト');
        expect(a.value).toBe(b.value);
      });
    });
  });

  describe('equals: 同一 value を持つ 2 つは等値', () => {
    context('同一 content から生成した 2 つの LessonFingerprint の場合', () => {
      it('equals() が true を返す', () => {
        const a = LessonFingerprint.fromContent('同じ教訓');
        const b = LessonFingerprint.fromContent('同じ教訓');
        expect(a.equals(b)).toBe(true);
      });
    });
  });

  describe('equals: 異なる value を持つ 2 つは非等値', () => {
    context('異なる content から生成した 2 つの LessonFingerprint の場合', () => {
      it('equals() が false を返す', () => {
        const a = LessonFingerprint.fromContent('教訓A');
        const b = LessonFingerprint.fromContent('教訓B');
        expect(a.equals(b)).toBe(false);
      });
    });
  });

});
