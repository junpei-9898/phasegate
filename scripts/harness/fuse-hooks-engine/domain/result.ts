/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export type Result<T, E> = OkResult<T, E> | ErrResult<T, E>;

class OkResult<T, E> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is OkResult<T, E> {
    return true;
  }

  isErr(): this is ErrResult<T, E> {
    return false;
  }

  _unsafeUnwrap(): T {
    return this.value;
  }

  _unsafeUnwrapErr(): E {
    throw new Error('OkResult has no error');
  }
}

class ErrResult<T, E> {
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is OkResult<T, E> {
    return false;
  }

  isErr(): this is ErrResult<T, E> {
    return true;
  }

  _unsafeUnwrap(): T {
    throw new Error('ErrResult has no value');
  }

  _unsafeUnwrapErr(): E {
    return this.error;
  }
}

export const Result = {
  ok<T, E = never>(value: T): Result<T, E> {
    return new OkResult<T, E>(value);
  },
  err<T = never, E = unknown>(error: E): Result<T, E> {
    return new ErrResult<T, E>(error);
  },
};
