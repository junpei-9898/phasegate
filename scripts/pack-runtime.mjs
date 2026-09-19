// @unit harness-api
// @layer infrastructure
// @work-item-id WI-220
// Build in disposable staging: never leave stale generated JS beside checkout TS.
import { spawnSync } from 'node:child_process';
import { constants, copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}

function pack(cwd, destination) {
  const args = ['pack', '--ignore-scripts', '--pack-destination', destination, '--json'];
  const output = process.env.npm_execpath?.replaceAll('\\', '/').endsWith('/npm-cli.js')
    ? run(process.execPath, [process.env.npm_execpath, ...args], cwd)
    : run('npm', args, cwd);
  return JSON.parse(output)[0];
}

function compile(directory) {
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += compile(path);
    else if (entry.isFile() && path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const result = ts.transpileModule(readFileSync(path, 'utf8'), {
        fileName: path,
        reportDiagnostics: true,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, esModuleInterop: true, sourceMap: true },
      });
      const errors = result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [];
      if (errors.length) throw new Error(`TypeScript ${path}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n')}`);
      writeFileSync(path.replace(/\.ts$/, '.js'), result.outputText, { flag: 'wx' });
      writeFileSync(path.replace(/\.ts$/, '.js.map'), result.sourceMapText, { flag: 'wx' });
      count++;
    }
  }
  return count;
}

let staging;
try {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--pack-destination')) {
    throw new Error('Usage: node scripts/pack-runtime.mjs [--pack-destination <existing-directory>]');
  }
  const destination = realpathSync(resolve(args[1] ?? process.cwd()));
  staging = realpathSync(mkdtempSync(join(tmpdir(), 'phasegate-runtime-pack-')));
  const sourceArchive = pack(process.cwd(), staging);
  const packageRoot = join(staging, 'package');
  mkdirSync(packageRoot);
  run('tar', ['-xzf', join(staging, sourceArchive.filename), '-C', packageRoot, '--strip-components=1'], staging);
  const count = compile(join(packageRoot, 'scripts/harness'));
  if (!count) throw new Error('No runtime TypeScript sources found');
  const metadataPath = join(packageRoot, 'package.json');
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (!Array.isArray(metadata.files)) throw new Error('Explicit package files are required');
  metadata.files.push('scripts/harness/**/*.js', 'scripts/harness/**/*.js.map', '!scripts/harness/__tests__/**');
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  const built = join(staging, 'built');
  mkdirSync(built);
  const archive = pack(packageRoot, built);
  try {
    copyFileSync(join(built, archive.filename), join(destination, archive.filename), constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Output archive already exists: ${join(destination, archive.filename)}`);
    throw error;
  }
  console.log(JSON.stringify([archive], null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (staging) rmSync(staging, { recursive: true, force: true });
}
