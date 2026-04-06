// @layer domain
// exit-code-spec.ts — ExitCodeSpec Value Object

export class ExitCodeSpec {
  readonly pass: 0;
  readonly fail: number;
  readonly error: number;

  private constructor(pass: 0, fail: number, error: number) {
    this.pass = pass;
    this.fail = fail;
    this.error = error;
    Object.freeze(this);
  }

  static create(props: { pass: number; fail: number; error: number }): ExitCodeSpec {
    if (props.pass !== 0) {
      throw new Error('ExitCodeSpec: pass must be 0');
    }
    const values = [props.pass, props.fail, props.error];
    if (new Set(values).size !== values.length) {
      throw new Error('ExitCodeSpec: exit code values must be unique');
    }
    return new ExitCodeSpec(0, props.fail, props.error);
  }

  static standard(): ExitCodeSpec {
    return new ExitCodeSpec(0, 1, 2);
  }
}
