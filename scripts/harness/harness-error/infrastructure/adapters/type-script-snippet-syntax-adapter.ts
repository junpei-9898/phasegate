/**
 * @layer infrastructure
 * @unit harness-error
 */
import ts from 'typescript';

export interface TypeScriptSnippetSyntaxValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly string[];
}

export class TypeScriptSnippetSyntaxAdapter {
  validate(snippet: string): TypeScriptSnippetSyntaxValidationResult {
    if (snippet.length === 0) {
      return {
        valid: true,
        diagnostics: [],
      };
    }

    const transpileResult = ts.transpileModule(
      snippet,
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
        fileName: 'fix-example.ts',
        reportDiagnostics: true,
      }
    );

    const diagnostics = (transpileResult.diagnostics ?? []).map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      );

      if (diagnostic.start === undefined) {
        return message;
      }

      const sourceFile = diagnostic.file;
      if (!sourceFile) {
        return message;
      }

      const position = sourceFile.getLineAndCharacterOfPosition(
        diagnostic.start
      );
      return `${message} (${position.line + 1}:${position.character + 1})`;
    });

    return {
      valid: diagnostics.length === 0,
      diagnostics,
    };
  }
}
