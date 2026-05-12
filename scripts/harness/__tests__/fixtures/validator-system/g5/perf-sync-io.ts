// @unit validator-system
// @layer infrastructure
import { readFileSync } from 'node:fs';

export const load = () => readFileSync('x', 'utf8');
