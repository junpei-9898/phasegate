/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

const escapeRegexChar = (value: string): string =>
  value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

export const isValidGlob = (pattern: string): boolean =>
  typeof pattern === 'string' && pattern.trim() !== '';

export const globToRegExp = (pattern: string): RegExp => {
  let source = '';
  let index = 0;

  while (index < pattern.length) {
    if (pattern.slice(index, index + 3) === '**/') {
      source += '(?:.*/)?';
      index += 3;
      continue;
    }

    if (pattern.slice(index, index + 2) === '**') {
      source += '.*';
      index += 2;
      continue;
    }

    if (pattern[index] === '*') {
      source += '[^/]*';
      index += 1;
      continue;
    }

    source += escapeRegexChar(pattern[index]);
    index += 1;
  }

  return new RegExp(`^${source}$`);
};

export const matchesGlob = (pattern: string, value: string): boolean =>
  globToRegExp(pattern).test(value);
