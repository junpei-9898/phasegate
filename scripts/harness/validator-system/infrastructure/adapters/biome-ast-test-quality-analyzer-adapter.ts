/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-129
 * @work-item-id WI-130
 *
 * BiomeAstTestQualityAnalyzerAdapter — TestQualityAnalyzerPort implementation.
 */
import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import type { TestQualityAnalyzerPort } from '../../domain/ports/test-quality-analyzer-port.js';
import type {
  AssertionStrength,
  AssertionTarget,
  SemanticAssertion,
  TestCaseKind,
  TestCaseStructure,
  TestDoubleReplacement,
  TestStep,
} from '../../domain/value-objects/test-quality-semantics.js';
import type { HarnessErrorLike } from '../../domain/value-objects/validation-result.js';

const JAPANESE_CHAR = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
const TEST_FUNCTION_NAMES = new Set(['it', 'test']);
const WEAK_ASSERTION_STRENGTHS = new Set<AssertionStrength>([
  'weak-truthiness',
  'snapshot-only',
  'interaction-only',
  'length-only',
]);

export interface TestQualityAnalyzerOptions {
  readonly weakAssertionStrengths?: readonly AssertionStrength[];
}

function createViolation(message: string, suggestion: string): HarnessErrorLike {
  return {
    code: { value: 'L2-003', toString: () => 'L2-003' },
    severity: { value: 'warning', toString: () => 'warning' },
    message,
    suggestion,
  };
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function textOf(sourceFile: ts.SourceFile, node: ts.Node): string {
  return node.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function unwrapAwait(expression: ts.Expression): ts.Expression {
  return ts.isAwaitExpression(expression) ? expression.expression : expression;
}

function isCallLikeAct(expression: ts.Expression): boolean {
  const unwrapped = unwrapAwait(expression);
  if (!ts.isCallExpression(unwrapped) && !ts.isNewExpression(unwrapped)) {
    return false;
  }
  const text = unwrapped.getText();
  return !/^expect\s*\(/.test(text);
}

function isDerivedFromObservedName(sourceFile: ts.SourceFile, expression: ts.Expression, observedNames: ReadonlySet<string>): boolean {
  const expressionText = textOf(sourceFile, unwrapAwait(expression));
  return [...observedNames].some((name) => (
    expressionText === name || expressionText.startsWith(`${name}.`) || expressionText.startsWith(`${name}[`)
  ));
}

function isTestCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) {
    return TEST_FUNCTION_NAMES.has(expression.text);
  }
  if (ts.isPropertyAccessExpression(expression)) {
    if (expression.name.text === 'each') {
      return isTestCallee(expression.expression);
    }
    return false;
  }
  if (ts.isCallExpression(expression)) {
    return isTestCallee(expression.expression);
  }
  return false;
}

function findCallback(args: ts.NodeArray<ts.Expression>): ts.ArrowFunction | ts.FunctionExpression | undefined {
  return args.find((arg): arg is ts.ArrowFunction | ts.FunctionExpression => (
    ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)
  ));
}

function extractTestName(args: ts.NodeArray<ts.Expression>): string | undefined {
  const nameArg = args.find((arg) => ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg));
  return nameArg && (ts.isStringLiteral(nameArg) || ts.isNoSubstitutionTemplateLiteral(nameArg))
    ? nameArg.text
    : undefined;
}

function isExpectCall(expression: ts.Expression): expression is ts.CallExpression {
  return ts.isCallExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === 'expect';
}

function extractExpectCall(expression: ts.Expression): {
  expectCall: ts.CallExpression;
  matcher: string;
} | undefined {
  const unwrapped = unwrapAwait(expression);
  if (!ts.isCallExpression(unwrapped)) {
    return undefined;
  }

  let cursor: ts.Expression = unwrapped.expression;
  let matcher = '';
  while (ts.isPropertyAccessExpression(cursor)) {
    if (!matcher) {
      matcher = cursor.name.text;
    }
    cursor = cursor.expression;
  }

  if (ts.isCallExpression(cursor) && isExpectCall(cursor)) {
    return { expectCall: cursor, matcher };
  }
  return undefined;
}

function classifyAssertion(
  sourceFile: ts.SourceFile,
  statement: ts.Statement,
  expression: ts.Expression,
): SemanticAssertion | undefined {
  const expectInfo = extractExpectCall(expression);
  if (!expectInfo) {
    return undefined;
  }

  const subject = expectInfo.expectCall.arguments[0]
    ? textOf(sourceFile, expectInfo.expectCall.arguments[0])
    : '';
  const matcher = expectInfo.matcher;
  const target = classifyAssertionTarget(subject, matcher);
  const strength = classifyAssertionStrength(matcher, subject, expression);

  return {
    target,
    strength,
    subject,
    line: lineOf(sourceFile, statement),
  };
}

function classifyAssertionTarget(subject: string, matcher: string): AssertionTarget {
  if (/toHaveBeenCalled|toBeCalled|toHaveReturned/.test(matcher) || /\.mock\b/.test(subject)) {
    return 'interaction';
  }
  if (/throw/i.test(matcher) || /^\(\s*\)\s*=>/.test(subject)) {
    return 'error-contract';
  }
  if (/event|emit|dispatch/i.test(subject)) {
    return 'emitted-event';
  }
  if (/repository|store|db|database|persist/i.test(subject)) {
    return 'persisted-effect';
  }
  if (/state|status|enabled|visible/i.test(subject)) {
    return 'state';
  }
  return 'observed-output';
}

function classifyAssertionStrength(matcher: string, subject: string, expression: ts.Expression): AssertionStrength {
  if (/toMatchSnapshot|toMatchInlineSnapshot/.test(matcher)) {
    return 'snapshot-only';
  }
  if (/toBeTruthy|toBeFalsy|toBeDefined|toBeUndefined|toBeNull/.test(matcher)) {
    return 'weak-truthiness';
  }
  if (/toHaveLength/.test(matcher) || /\.length$/.test(subject)) {
    return 'length-only';
  }
  if (/toHaveBeenCalled|toBeCalled/.test(matcher)) {
    return 'interaction-only';
  }
  if (/toThrow|toThrowError/.test(matcher) && ts.isCallExpression(unwrapAwait(expression))) {
    const matcherCall = unwrapAwait(expression) as ts.CallExpression;
    if (matcherCall.arguments.length === 0) {
      return 'weak-truthiness';
    }
  }
  if (/toMatchObject|toEqual|toContainEqual/.test(matcher)) {
    return 'shape';
  }
  if (/toBeGreaterThan|toBeGreaterThanOrEqual|toBeLessThan|toBeLessThanOrEqual/.test(matcher)) {
    return 'range';
  }
  if (/toContain|toSatisfy/.test(matcher)) {
    return 'invariant';
  }
  return 'exact-value';
}

function classifyTestKind(filePath: string, testName: string): TestCaseKind {
  const lower = `${filePath} ${testName}`.toLowerCase();
  if (/\be2e\b|lifecycle|ライフサイクル|一連/.test(lower)) {
    return 'e2e';
  }
  if (/\bintegration\b|\.it\.test|統合/.test(lower)) {
    return 'integration';
  }
  return 'unit';
}

function allowsMultipleActs(kind: TestCaseKind, testName: string): boolean {
  return kind === 'e2e' || kind === 'lifecycle' || /ライフサイクル|一連|flow|journey/i.test(testName);
}

function extractMockReplacements(sourceFile: ts.SourceFile): TestDoubleReplacement[] {
  const replacements: TestDoubleReplacement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const api = `${node.expression.expression.getText(sourceFile)}.${node.expression.name.text}`;
      if ((api === 'vi.mock' || api === 'jest.mock') && node.arguments[0]) {
        const target = textOf(sourceFile, node.arguments[0]).replace(/^['"`]|['"`]$/g, '');
        replacements.push({
          target,
          line: lineOf(sourceFile, node),
          dependencyKind: isDomainInternalReplacement(target) ? 'domain-internal' : 'external',
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return replacements;
}

function isDomainInternalReplacement(target: string): boolean {
  return /(^|\/)(domain|domains|entities|entity|value-objects|aggregates|aggregate|services)(\/|$)/i.test(target);
}

function extractSteps(sourceFile: ts.SourceFile, body: ts.ConciseBody): TestStep[] {
  if (!ts.isBlock(body)) {
    const assertion = classifyAssertion(sourceFile, body as unknown as ts.Statement, body);
    return [{
      kind: assertion ? 'assert' : 'act',
      expression: textOf(sourceFile, body),
      line: lineOf(sourceFile, body),
      assertion,
    }];
  }

  const steps: TestStep[] = [];
  const observedNames = new Set<string>();
  for (const statement of body.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = declaration.name.getText(sourceFile);
        const initializer = declaration.initializer;
        const expression = initializer ? textOf(sourceFile, initializer) : textOf(sourceFile, declaration);
        const isAct = Boolean(initializer) && (
          name === 'actual'
          || (
            observedNames.size > 0
            && initializer !== undefined
            && isCallLikeAct(initializer)
            && !isDerivedFromObservedName(sourceFile, initializer, observedNames)
          )
        );
        if (isAct) {
          observedNames.add(name);
        }
        steps.push({
          kind: isAct ? 'act' : 'arrange',
          expression,
          line: lineOf(sourceFile, declaration),
          observedName: isAct ? name : undefined,
        });
      }
      continue;
    }

    if (ts.isExpressionStatement(statement)) {
      const assertion = classifyAssertion(sourceFile, statement, statement.expression);
      if (assertion) {
        steps.push({
          kind: 'assert',
          expression: textOf(sourceFile, statement.expression),
          line: lineOf(sourceFile, statement),
          assertion,
        });
      } else if (isCallLikeAct(statement.expression)) {
        steps.push({
          kind: 'act',
          expression: textOf(sourceFile, statement.expression),
          line: lineOf(sourceFile, statement),
        });
      } else {
        steps.push({
          kind: 'arrange',
          expression: textOf(sourceFile, statement),
          line: lineOf(sourceFile, statement),
        });
      }
      continue;
    }

    steps.push({
      kind: 'arrange',
      expression: textOf(sourceFile, statement),
      line: lineOf(sourceFile, statement),
    });
  }

  return steps;
}

function extractTestCases(filePath: string, sourceFile: ts.SourceFile): TestCaseStructure[] {
  const mocks = extractMockReplacements(sourceFile);
  const testCases: TestCaseStructure[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
      const name = extractTestName(node.arguments);
      const callback = findCallback(node.arguments);
      if (name && callback) {
        const kind = classifyTestKind(filePath, name);
        const steps = extractSteps(sourceFile, callback.body);
        const assertions = steps
          .map((step) => step.assertion)
          .filter((assertion): assertion is SemanticAssertion => assertion !== undefined);
        testCases.push({
          filePath,
          name,
          line: lineOf(sourceFile, node),
          kind,
          steps,
          assertions,
          mocks,
          allowsMultipleActs: allowsMultipleActs(kind, name),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return testCases;
}

function analyzeTestCase(
  testCase: TestCaseStructure,
  weakAssertionStrengths: ReadonlySet<AssertionStrength>,
): HarnessErrorLike[] {
  const violations: HarnessErrorLike[] = [];
  const acts = testCase.steps.filter((step) => step.kind === 'act');
  const asserts = testCase.steps.filter((step) => step.kind === 'assert');
  const firstActIndex = testCase.steps.findIndex((step) => step.kind === 'act');
  const firstAssertIndex = testCase.steps.findIndex((step) => step.kind === 'assert');

  if (!JAPANESE_CHAR.test(testCase.name)) {
    violations.push(createViolation(
      `テスト名が日本語ではありません: "${testCase.name}" at ${testCase.filePath}:${testCase.line}`,
      'テスト名は日本語で仕様を表してください。',
    ));
  }

  if (acts.length === 0) {
    violations.push(createViolation(
      `Act が見つかりません: "${testCase.name}" at ${testCase.filePath}:${testCase.line}`,
      'ふるまいの実行を Act として名前付きの観測値に保持してください。',
    ));
  }

  if (asserts.length === 0) {
    violations.push(createViolation(
      `Assert が見つかりません: "${testCase.name}" at ${testCase.filePath}:${testCase.line}`,
      'Act の観測結果を Assert してください。',
    ));
  }

  if (!testCase.allowsMultipleActs && acts.length > 1) {
    violations.push(createViolation(
      `Act が複数あります: "${testCase.name}" at ${testCase.filePath}:${acts[1].line}`,
      'Unit/Integration テストでは 1 テスト 1 Act に分割してください。',
    ));
  }

  if (firstActIndex >= 0 && firstAssertIndex >= 0 && firstAssertIndex < firstActIndex) {
    violations.push(createViolation(
      `Assert が Act より前にあります: "${testCase.name}" at ${testCase.filePath}:${testCase.steps[firstAssertIndex].line}`,
      'Arrange / Act / Assert の順序に整理してください。',
    ));
  }

  const observedNames = new Set(acts.map((step) => step.observedName).filter((name): name is string => Boolean(name)));
  if (acts.length > 0 && observedNames.size === 0) {
    violations.push(createViolation(
      `Act の観測結果が名前付き値として保持されていません: "${testCase.name}" at ${testCase.filePath}:${acts[0].line}`,
      'Act の戻り値を const actual = ... のような名前付き値に保持してください。',
    ));
  }

  for (const name of observedNames) {
    if (!testCase.allowsMultipleActs && name !== 'actual') {
      violations.push(createViolation(
        `Act の観測値名が actual ではありません: "${name}" at ${testCase.filePath}:${acts.find((step) => step.observedName === name)?.line ?? testCase.line}`,
        'TypeScript テストでは const actual = ... を使用してください。',
      ));
    }
  }

  const observesAct = testCase.assertions.some((assertion) => (
    [...observedNames].some((name) => assertion.subject === name || assertion.subject.startsWith(`${name}.`))
  ));
  const observesExternalEffect = testCase.assertions.some((assertion) => assertion.target !== 'observed-output');
  if (acts.length > 0 && testCase.assertions.length > 0 && !observesAct && !observesExternalEffect) {
    violations.push(createViolation(
      `Assert が Act の観測結果を検証していません: "${testCase.name}" at ${testCase.filePath}:${testCase.assertions[0].line}`,
      'Assert は Act の戻り値、状態変化、イベント、永続化結果、error contract、interaction のいずれかを検証してください。',
    ));
  }

  for (const assertion of testCase.assertions) {
    if (weakAssertionStrengths.has(assertion.strength)) {
      violations.push(createViolation(
        `弱い assertion です (${assertion.strength}): "${testCase.name}" at ${testCase.filePath}:${assertion.line}`,
        'exact value、shape、invariant、range、または error contract を観測してください。',
      ));
    }
    if (assertion.target === 'error-contract' && assertion.strength === 'weak-truthiness') {
      violations.push(createViolation(
        `error contract の詳細が検証されていません: "${testCase.name}" at ${testCase.filePath}:${assertion.line}`,
        'error type、code、message、recovery hint などを検証してください。',
      ));
    }
  }

  for (const replacement of testCase.mocks) {
    if (replacement.dependencyKind === 'domain-internal') {
      violations.push(createViolation(
        `domain/internal dependency を mock しています: ${replacement.target} at ${testCase.filePath}:${replacement.line}`,
        'Domain object や内部 module は実体を使い、外部I/O・時刻・乱数・Port実装のみを置き換えてください。',
      ));
    }
  }

  return violations;
}

function analyzeContent(
  filePath: string,
  content: string,
  weakAssertionStrengths: ReadonlySet<AssertionStrength>,
): HarnessErrorLike[] {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return extractTestCases(filePath, sourceFile).flatMap((testCase) => analyzeTestCase(testCase, weakAssertionStrengths));
}

export class BiomeAstTestQualityAnalyzerAdapter implements TestQualityAnalyzerPort {
  private readonly weakAssertionStrengths: ReadonlySet<AssertionStrength>;

  constructor(options: TestQualityAnalyzerOptions = {}) {
    this.weakAssertionStrengths = new Set(options.weakAssertionStrengths ?? WEAK_ASSERTION_STRENGTHS);
  }

  async analyzeTestFiles(targetPaths: readonly string[]): Promise<{
    results: readonly { filePath: string; passed: boolean; violations: readonly HarnessErrorLike[] }[];
  }> {
    const results = await Promise.all(
      targetPaths.map(async (filePath) => {
        try {
          const content = await readFile(filePath, 'utf-8');
          const violations = analyzeContent(filePath, content, this.weakAssertionStrengths);
          return { filePath, passed: violations.length === 0, violations };
        } catch {
          return { filePath, passed: true, violations: [] as HarnessErrorLike[] };
        }
      }),
    );
    return { results };
  }
}
