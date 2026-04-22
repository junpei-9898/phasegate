// @unit validator-system
// @layer domain

export interface TextScanMatch {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly lineContent: string;
}

export interface SourceFileTextScannerPort {
  scanForPattern(pattern: RegExp, targetPaths?: readonly string[]): Promise<readonly TextScanMatch[]>;
}

// @story-id H08-07