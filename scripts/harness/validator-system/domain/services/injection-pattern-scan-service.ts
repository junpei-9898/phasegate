// @unit validator-system
// @layer domain
// @work-item-id WI-259

/**
 * WI-259 / ADR-030 §Decision.3.④ — advisory インジェクションスキャナ（L3-006）の判定ドメインサービス。
 *
 * 指示搭載ファイル群に対し既知のインジェクションパターンを行単位で照合する純粋サービス。
 * INV-A: 生成する finding は必ず severity='warning'（error / violation を一切生成しない — §4.(b)）。
 * INV-B: HTML コメント内の指示上書きは html-comment-instruction に一本化し instruction-override として二重報告しない。
 * INV-C: どのパターンにも該当しない対象は finding を生成しない（無音 → pass）。
 *
 * パターンは narrow に設計し、自リポジトリの正当な文書（散文）に誤検知しないことを実 corpus で実証する。
 */

import {
  type InjectionFinding,
  InjectionScanReport,
  type InjectionScanTarget,
} from "../value-objects/injection-scan-report.js";

/** 指示上書きフレーズ（英/日）。narrow な定型のみ。 */
const OVERRIDE_PATTERNS: readonly RegExp[] = [
  /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above)\s+(?:instructions|rules)/i,
  /disregard\s+(?:your|all)\s+(?:instructions|training)/i,
  /これまでの指示を無視/,
  /以前の指示を無視/,
  /上記の指示を無視/,
  /指示を(?:全て|すべて)無視/,
  /システムプロンプトを無視/,
];

/** HTML コメントを含む行か（`<!--` の存在で判定。行内コメント・複数行コメント開始のいずれも拾う）。 */
const HTML_COMMENT_LINE = /<!--/;

/** 不可視 Unicode: zero-width (U+200B-U+200D, U+FEFF) + bidi 制御 (U+202A-U+202E, U+2066-U+2069)。 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: bidi/zero-width 制御文字の検出が目的
const INVISIBLE_UNICODE = /[​-‍﻿‪-‮⁦-⁩]/;

/** 連続 200 文字以上の base64 文字列塊。 */
const BASE64_BLOB = /[A-Za-z0-9+/]{200,}={0,2}/;

export class InjectionPatternScanService {
  scan(targets: readonly InjectionScanTarget[]): InjectionScanReport {
    const findings: InjectionFinding[] = [];

    for (const target of targets) {
      const lines = target.content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        const hasOverride = OVERRIDE_PATTERNS.some((pattern) => pattern.test(line));
        if (hasOverride) {
          // INV-B: HTML コメント内の指示上書きは html-comment-instruction に一本化する。
          if (HTML_COMMENT_LINE.test(line)) {
            findings.push(
              this.finding(
                "html-comment-instruction",
                target.path,
                lineNumber,
                "HTML コメント内にエージェント宛ての指示上書きフレーズが埋め込まれています。",
                "隠蔽された指示の可能性があります。人間レビューで意図を確認してください（advisory）。",
              ),
            );
          } else {
            findings.push(
              this.finding(
                "instruction-override",
                target.path,
                lineNumber,
                "指示上書きフレーズ（例: ignore previous instructions / これまでの指示を無視）を検出しました。",
                "インジェクションの可能性があります。人間レビューで意図を確認してください（advisory）。",
              ),
            );
          }
        }

        if (INVISIBLE_UNICODE.test(line)) {
          findings.push(
            this.finding(
              "invisible-unicode",
              target.path,
              lineNumber,
              "不可視 Unicode 文字（zero-width / bidi 制御）を検出しました。",
              "見えない文字で指示を隠蔽している可能性があります。人間レビューで確認してください（advisory）。",
            ),
          );
        }

        if (BASE64_BLOB.test(line)) {
          findings.push(
            this.finding(
              "base64-blob",
              target.path,
              lineNumber,
              "連続 200 文字以上の base64 らしき塊を検出しました。",
              "エンコードされた指示・ペイロードの可能性があります。人間レビューで確認してください（advisory）。",
            ),
          );
        }
      }
    }

    return InjectionScanReport.create(findings);
  }

  private finding(
    kind: InjectionFinding["kind"],
    sourcePath: string,
    lineNumber: number,
    message: string,
    suggestion: string,
  ): InjectionFinding {
    // INV-A: severity は必ず 'warning'。
    return { kind, severity: "warning", sourcePath, lineNumber, message, suggestion };
  }
}
