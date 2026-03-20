/**
 * @layer domain
 * @unit ci-governance
 *
 * Result型 - 成功/失敗を表現する型
 */

export type Result<T, E> = OkResult<T> | FailResult<E>;

export class OkResult<T> {
  readonly _tag = 'ok' as const;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is OkResult<T> {
    return true;
  }

  isFail(): this is never {
    return false;
  }

  get error(): never {
    throw new Error('OkResult has no error');
  }
}

export class FailResult<E> {
  readonly _tag = 'fail' as const;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is never {
    return false;
  }

  isFail(): this is FailResult<E> {
    return true;
  }

  get value(): never {
    throw new Error('FailResult has no value');
  }
}

export function ok<T>(value: T): OkResult<T> {
  return new OkResult(value);
}

export function fail<E>(error: E): FailResult<E> {
  return new FailResult(error);
}
