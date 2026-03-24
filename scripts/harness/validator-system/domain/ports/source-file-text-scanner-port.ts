/**
 * @layer domain
 * @unit validator-system
 *
 * SourceFileTextScannerPort — ソースファイルテキストスキャンポート
 */

export interface TextScanMatch {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly lineContent: string;
}

export interface SourceFileTextScannerPort {
  /**
   * 指定ファイル群のソースファイルをスキャンし、パターンに一致する行を返す。
   */
  scanForPattern(pattern: RegExp, targetPaths?: readonly string[]): Promise<readonly TextScanMatch[]>;
}

// @story-id H08-07