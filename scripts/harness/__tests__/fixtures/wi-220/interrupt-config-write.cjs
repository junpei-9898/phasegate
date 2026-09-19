// Test-only abrupt exit at a selected config write boundary in an isolated root.
const fs = require('node:fs');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');
const root = process.env.PHASEGATE_FAULT_ROOT;
const point = process.env.PHASEGATE_FAULT_POINT;
const when = process.env.PHASEGATE_FAULT_WHEN;
for (const operation of ['writeFile', 'rename']) {
  const original = fs.promises[operation];
  fs.promises[operation] = async function (...args) {
    const file = typeof args[0] === 'string' ? args[0] : '';
    const selected = root && (
      point === 'backup' && operation === 'writeFile' && file.startsWith(path.join(root, '.phasegate', 'backups') + path.sep) ||
      point === 'temporary' && operation === 'writeFile' && file.startsWith(path.join(root, 'phasegate.config.json.tmp-')) ||
      point === 'rename' && operation === 'rename' && args[1] === path.join(root, 'phasegate.config.json')
    );
    if (selected && when === 'before') process.exit(86);
    const result = await original.apply(this, args);
    if (selected && when === 'after') process.exit(86);
    return result;
  };
}
syncBuiltinESMExports();
