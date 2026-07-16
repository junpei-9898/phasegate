// @unit world-model
// @layer domain
// @work-item-id WI-287
export type CanonicalJsonPrimitive = null | boolean | number | string;
export type CanonicalJsonArray = readonly CanonicalJsonValue[];
export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}
export type CanonicalJsonValue = CanonicalJsonPrimitive | CanonicalJsonArray | CanonicalJsonObject;

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(`World canonicalization failed: ${message}`);
    this.name = "CanonicalizationError";
  }
}

const isPlainObject = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const stringifyValue = (value: unknown, ancestors: WeakSet<object>, path: string): string => {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new CanonicalizationError(`${path} contains a non-finite number`);
      }
      return JSON.stringify(value);
    case "undefined":
    case "bigint":
    case "function":
    case "symbol":
      throw new CanonicalizationError(`${path} contains unsupported ${typeof value}`);
    case "object":
      break;
    default:
      throw new CanonicalizationError(`${path} contains an unsupported value`);
  }

  if (ancestors.has(value)) {
    throw new CanonicalizationError(`${path} contains a cycle`);
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new CanonicalizationError(`${path} contains a symbol-keyed array property`);
      }
      const propertyNames = Object.getOwnPropertyNames(value);
      const allowedNames = new Set(["length", ...value.map((_, index) => String(index))]);
      if (propertyNames.some((name) => !allowedNames.has(name))) {
        throw new CanonicalizationError(`${path} contains a non-index array property`);
      }

      const entries: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          throw new CanonicalizationError(`${path}[${index}] is sparse`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor)) {
          throw new CanonicalizationError(`${path}[${index}] is an accessor property`);
        }
        entries.push(stringifyValue(value[index], ancestors, `${path}[${index}]`));
      }
      return `[${entries.join(",")}]`;
    }

    if (!isPlainObject(value)) {
      throw new CanonicalizationError(`${path} is not a plain object`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new CanonicalizationError(`${path} contains a symbol-keyed property`);
    }

    const propertyNames = Object.getOwnPropertyNames(value);
    const enumerableKeys = Object.keys(value);
    if (propertyNames.length !== enumerableKeys.length) {
      throw new CanonicalizationError(`${path} contains a non-enumerable property`);
    }

    const record = value as Record<string, unknown>;
    const entries = enumerableKeys.sort().map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new CanonicalizationError(`${path}.${key} is an accessor property`);
      }
      return `${JSON.stringify(key)}:${stringifyValue(record[key], ancestors, `${path}.${key}`)}`;
    });
    return `{${entries.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
};

export class CanonicalJsonSerializer {
  serialize(value: unknown): Uint8Array {
    return new TextEncoder().encode(this.stringify(value));
  }

  stringify(value: unknown): string {
    return stringifyValue(value, new WeakSet<object>(), "$");
  }
}
