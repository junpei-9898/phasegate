// @unit validator-system
// @layer infrastructure
// phasegate-ignore-performance: accepted migration script
import { readFileSync } from 'node:fs';

export const load = () => readFileSync('x', 'utf8');
