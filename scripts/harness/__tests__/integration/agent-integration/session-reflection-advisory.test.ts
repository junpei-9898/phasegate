// @story H11-02
// @unit agent-integration
// @layer infrastructure
// @work-item-id WI-220
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { FileSystemStoryReflectionQueryAdapter } from '../../../agent-integration/infrastructure/adapters/file-system-story-reflection-query-adapter.js';

let rootDir: string;
let configPath: string;
async function put(path: string, content: string) {
  const absolute = join(rootDir, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}
const reflection = { enabled: true, mappings: [{
  inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
  product: 'docs/product/construction/{unit}/logical_design.md', required: true,
}] };
async function configure(extra = {}) {
  await put('phasegate.config.json', JSON.stringify({ phaseDependencies: { preset: 'default', override: false, customRules: [], storyReflection: reflection }, ...extra }));
}
async function wi(unit: string, id: string, dependencyLine: string) {
  await put(`docs/inception/${unit}/${id}/description.md`, `---\nid: ${id}\ntype: refactor\nseverity: normal\nstatus: drafted\n${dependencyLine}\n---\n`);
  await put(`docs/inception/${unit}/${id}/logical_design.md`, '# Design');
}
function adapter() { return new FileSystemStoryReflectionQueryAdapter({ rootDir, configPath }); }
function cli(args: string[], payload?: unknown): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const main = fileURLToPath(new URL('../../../main.ts', import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', createRequire(import.meta.url).resolve('tsx'), main, ...args], { cwd: rootDir });
    let stdout = ''; let stderr = '';
    const timeout = setTimeout(() => { child.kill('SIGKILL'); }, 30000);
    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', code => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
    child.stdin.end(payload ? JSON.stringify(payload) : '');
  });
}
beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'wi220-session-advice-'));
  configPath = join(rootDir, 'phasegate.config.json');
  await configure();
});
afterEach(async () => { await rm(rootDir, { recursive: true, force: true }); });

describe('sessionの依存反映診断', () => {
  it.each([undefined, 'advisory', 'invalid', true])('設定%sを明示強制化と誤認しないこと', async dependencyReflection => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection } } });
    await wi('order', 'WI-1', 'depends_on: []');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).not.toHaveProperty('sessionEnforced');
    expect(actual.blockers.join('\n')).toContain('WI-1');
  });

  it('強制化を設定していても反映検査OFFを優先すること', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } }, phaseDependencies: { storyReflection: { enabled: false } } });
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: true, skipped: true, blockers: [], warnings: [] });
    expect(actual).not.toHaveProperty('sessionEnforced');
  });

  it('移設先の依存不明では従来範囲を検査し、合格時も未検証警告を残すこと', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } }, paths: { inceptionDocs: 'design/proposals', designDocs: 'design/approved' } });
    await wi('order', 'WI-1', '');
    await mkdir(join(rootDir, 'design'));
    await rename(join(rootDir, 'docs/inception'), join(rootDir, 'design/proposals'));
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: false, sessionEnforced: true });
    expect(actual.blockers.join('\n')).toContain('design/approved/order/logical_design.md');
    await put('design/approved/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const resumed = await adapter().checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, blockers: [] });
    expect(resumed.warnings.join('\n')).toContain('UNDECLARED_DEPENDENCIES');
  });

  it('crossの軽微修正も全所属Unitで関係product反映を確認すること', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } } });
    await put('docs/inception/_cross/WI-1/description.md', '---\nid: WI-1\ntype: fix\naffects: [order, shared]\ndepends_on: []\n---\n');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: false, sessionEnforced: true });
    expect(actual.blockers.join('\n')).toContain('docs/product/construction/shared/logical_design.md');
    await put('docs/product/construction/shared/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const resumed = await adapter().checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, blockers: [] });
  });

  it.each([true, false])('標準ゲートで依存未反映を拒否し、設計編集と反映後に再開できること（既存product=%s）', async (existingProduct) => {
    await configure({ project: { name: 'enforcement', preset: 'standard' }, architecture: { preset: 'clean' }, layers: {},
      agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } },
      quickMode: { allowedCategories: ['bugfix', 'docs', 'test', 'config'], relaxedGates: [] },
      planningMode: { default: 'interactive', perPhase: {} }, harnesses: {}, reporting: { format: 'json', outputDir: 'reports' } });
    await wi('order', 'WI-1', 'depends_on: [WI-2]');
    await wi('shared', 'WI-2', 'depends_on: []');
    await wi('order', 'WI-9', 'depends_on: []');
    // Satisfy the standard upstream gates with fixture-specific plans, not gate relaxation.
    const plans = [
      ['_shared/product_overview_plan.md', '注文Unitが共有契約を参照する依存反映の復旧を提供する'],
      ['_shared/story_writer_plan.md', 'WI-1はWI-2へ依存し、無関係なWI-9は停止理由にしない'],
      ['_shared/story_mapping_plan.md', '先に共有設計を確定し注文実装へ反映する'],
      ['_shared/unit_design_plan.md', 'orderは注文、sharedは共有契約を所有する'],
    ];
    for (const [path, decision] of plans) await put(`docs/inception/${path}`, `# Plan\n${decision}\n## QA\nQ: このfixtureの方針は？\nA: ${decision}\n`);
    for (const name of ['product_overview', 'user_stories', 'user_story_mapping']) await put(`docs/product/${name}.md`, '# Dependency recovery\n注文は共有契約に従い、未反映時は設計を修正して再開する。');
    await put('docs/product/units/integration_contract.md', '# Integration\norder depends on shared contract WI-2.');
    for (const unit of ['order', 'shared']) {
      await put(`docs/product/units/${unit}_unit.md`, `# ${unit}\nOwns ${unit === 'order' ? 'order behavior' : 'shared contract'}.`);
      for (const category of ['domain_model', 'logical_design', 'it_test_design', 'unit_test_design', 'it_test_logic', 'unit_test_logic']) {
        await put(`docs/inception/${unit}/${category}_plan.md`, `# ${unit} ${category}\n## QA\nQ: 何を検証するか？\nA: 注文から共有契約の反映を検査し、設計修正後に再開できること。\n`);
        if (category !== 'logical_design') await put(`docs/product/construction/${unit}/${category}.md`, `# ${unit} ${category}\n依存未反映の検出と設計反映後の再開を検証する。`);
      }
    }
    await put('docs/product/construction/order/logical_design.md', '# Order\n<!-- @work-item-id WI-1 -->');
    await put('docs/product/construction/order/domain_model.md', '# Order entity\n<!-- @work-item-id WI-1 -->');
    if (existingProduct) await put('docs/product/construction/shared/logical_design.md', '# Shared contract\n既存の共有契約。WI-2の変更は未反映。');
    const started = await cli(['session', 'begin', '--mode', 'full', '--unit', 'order', '--work-item', 'WI-1', '--reason', 'enforcement recovery', '--json']);
    expect(started.code, started.stderr + started.stdout).toBe(0);
    const payload = { tool_name: 'Write', tool_input: { file_path: 'scripts/harness/order/domain/new.ts', content: 'export class Order {}' } };
    const actual = await cli(['hook', 'pre-tool-use'], payload);
    expect(actual.code, actual.stderr + actual.stdout).toBe(2);
    expect(actual.stderr + actual.stdout).toContain('明示設定による依存反映チェック');
    expect(actual.stderr + actual.stdout).toContain('WI-2');
    expect(actual.stderr + actual.stdout).not.toContain('WI-9');
    for (const file of ['docs/inception/shared/WI-2/logical_design.md', 'docs/product/construction/shared/logical_design.md']) {
      const repair = await cli(['hook', 'pre-tool-use'], { tool_name: 'Write', tool_input: { file_path: file, content: '# Shared contract\n<!-- @work-item-id WI-2 -->' } });
      expect(repair.code, repair.stderr + repair.stdout).toBe(0);
      await put(file, '# Shared contract\n<!-- @work-item-id WI-2 -->');
    }
    const resumed = await cli(['hook', 'pre-tool-use'], payload);
    expect(resumed.code, resumed.stderr + resumed.stdout).toBe(0);
    expect(resumed.stderr).toContain('Full Mode session');
    expect(resumed.stderr).not.toContain('dependency reflection warning');
  }, 60000);

  it('明示強制化だけが拒否根拠を返し、反映後に解消すること', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } } });
    await wi('order', 'WI-1', 'depends_on: []');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: false, sessionEnforced: true });
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const resumed = await adapter().checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, blockers: [] });
  });

  it('強制化で依存不明なら旧Unit範囲の未反映と不明理由を返すこと', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } } });
    await wi('order', 'WI-1', '');
    await wi('order', 'WI-9', 'depends_on: []');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: false, sessionEnforced: true });
    expect(actual.blockers.join('\n')).toContain('WI-9');
    expect(actual.warnings.join('\n')).toContain('UNDECLARED_DEPENDENCIES');
  });

  it('強制化の必要成果物不足は修正先を示し、成果物を整えると解消すること', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } } });
    await put('docs/inception/order/WI-1/description.md', '---\nid: WI-1\ntype: refactor\ndepends_on: []\n---\n');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: false, sessionEnforced: true });
    expect(actual.blockers.join('\n')).toContain('docs/inception/order/WI-1/logical_design.md');
    await put('docs/inception/order/WI-1/logical_design.md', '# Design');
    const resumed = await adapter().checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, blockers: [] });
  });

  it('軽微修正は関係productへの反映で解消し、不要なinception設計を要求しないこと', async () => {
    await configure({ agentIntegration: { preToolUse: { dependencyReflection: 'enforce' } } });
    await put('docs/inception/order/WI-1/description.md', '---\nid: WI-1\ntype: fix\ndepends_on: []\n---\n');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: false, sessionEnforced: true });
    expect(actual.blockers.join('\n')).toContain('docs/product/construction/order/logical_design.md');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const resumed = await adapter().checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, blockers: [] });
  });

  it.each([
    ['refactor', 'logical_design.md'],
    ['story', 'logical_design.md'], ['story', 'domain_model.md'], ['story', 'unit_test_design.md'],
    ['issue', 'logical_design.md'], ['issue', 'domain_model.md'], ['issue', 'unit_test_design.md'],
  ])('%sの必要成果物%sがディレクトリなら未検証とし、文書へ修正後に解消すること', async (type, artifact) => {
    // Arrange: reflection is present, but one required source artifact is not a file.
    await wi('order', 'WI-1', 'depends_on: []');
    await put('docs/inception/order/WI-1/description.md', `---\nid: WI-1\ntype: ${type}\ndepends_on: []\n---\n`);
    await put('docs/inception/order/WI-1/domain_model.md', '# Domain');
    await put('docs/inception/order/WI-1/unit_test_design.md', '# Tests');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const path = `docs/inception/order/WI-1/${artifact}`;
    await rename(join(rootDir, path), join(rootDir, `${path}.saved`));
    await mkdir(join(rootDir, path));
    const sut = adapter();

    const actual = await sut.checkSessionReflection('order', 'WI-1');

    expect(actual.skipped).toBe(true);
    expect(actual.warnings.join('\n')).toContain('WI-1');
    expect(actual.warnings.join('\n')).toContain('未検証');

    // Recovery: replace only this fixture's directory with the saved document.
    await rename(join(rootDir, path), join(rootDir, `${path}.directory`));
    await rename(join(rootDir, `${path}.saved`), join(rootDir, path));
    const resumed = await sut.checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, skipped: false, blockers: [], warnings: [] });
  });

  it('通常ファイルを参照する設計文書のsymlinkは従来同様に検査できること', async () => {
    await wi('order', 'WI-1', 'depends_on: []');
    const path = join(rootDir, 'docs/inception/order/WI-1/logical_design.md');
    await rename(path, `${path}.source`);
    await symlink('logical_design.md.source', path);
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: true, skipped: false, blockers: [], warnings: [] });
  });

  it('実hookは追加警告があっても許可し、反映後は警告を解消すること', async () => {
    // Phase-gate relaxation is explicit: this fixture isolates session advisory, not all gates.
    await configure({ project: { name: 'advice', preset: 'standard' }, architecture: { preset: 'clean' }, layers: {},
      quickMode: { allowedCategories: ['bugfix', 'docs', 'test', 'config'], relaxedGates: ['phase-gate', '2-phase-execution'] },
      planningMode: { default: 'interactive', perPhase: {} }, harnesses: {}, reporting: { format: 'json', outputDir: 'reports' } });
    await wi('order', 'WI-1', 'depends_on: [WI-2]');
    await wi('shared', 'WI-2', 'depends_on: []');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const started = await cli(['session', 'begin', '--mode', 'full', '--unit', 'order', '--work-item', 'WI-1', '--reason', 'advisory test', '--json']);
    expect(started.code, started.stderr + started.stdout).toBe(0);
    expect(JSON.parse(started.stdout).ok).toBe(true);
    const payload = { tool_name: 'Write', tool_input: { file_path: 'scripts/harness/order/domain/new.ts', content: 'export class Order {}' } };
    const actual = await cli(['hook', 'pre-tool-use'], payload);
    expect(actual.code, actual.stderr + actual.stdout).toBe(0);
    expect(actual.stdout).toBe('');
    expect(actual.stderr).toContain('Full Mode session');
    expect(actual.stderr).toContain('dependency reflection warning (advisory)');
    expect(actual.stderr).toContain('WI-2');
    await put('docs/product/construction/shared/logical_design.md', '<!-- @work-item-id WI-2 -->');
    const resumed = await cli(['hook', 'pre-tool-use'], payload);
    expect(resumed.code).toBe(0);
    expect(resumed.stderr).toContain('Full Mode session');
    expect(resumed.stderr).not.toContain('dependency reflection warning');
  }, 60000);

  it.each(['refactor', 'story', 'issue', 'fix'])('成果物不足または反映先不明の%sを検証成功にしないこと', async (type) => {
    await put('docs/inception/order/WI-1/description.md', `---\nid: WI-1\ntype: ${type}\ndepends_on: []\n---\n`);
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.skipped).toBe(true);
    expect(actual.warnings.join('\n')).toContain('未検証');
    expect(actual.warnings.join('\n')).toContain('WI-1');
  });

  it('非choreのmappingが空なら反映を確認済みとしないこと', async () => {
    await wi('order', 'WI-1', 'depends_on: []');
    await configure({ phaseDependencies: { storyReflection: { enabled: true, mappings: [] } } });
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.skipped).toBe(true);
    expect(actual.warnings.join('\n')).toContain('mapping');
  });

  it('無関係な下書きは除外し、依存先の未反映と解消を報告すること', async () => {
    await wi('order', 'WI-1', 'depends_on: [WI-2]');
    await wi('shared', 'WI-2', 'depends_on: []');
    await wi('order', 'WI-9', 'depends_on: []');
    await put('docs/product/construction/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    const sut = adapter();
    const actual = await sut.checkSessionReflection('order', 'WI-1');
    expect(actual.passed).toBe(false);
    expect(actual.blockers).toHaveLength(1);
    expect(actual.blockers[0]).toContain('WI-2');
    expect(actual.blockers[0]).toContain('docs/product/construction/shared/logical_design.md');
    await put('docs/product/construction/shared/logical_design.md', '<!-- @work-item-id WI-2 -->');
    const resumed = await sut.checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, skipped: false, blockers: [], warnings: [] });
  });

  it.each([
    ['', 'UNDECLARED_DEPENDENCIES'], ['depends_on: [WI-404]', 'MISSING_WORK_ITEM'],
    ['depends_on: [bad]', 'UNKNOWN_UNITS'],
  ])('依存宣言%sの不明を検証成功とは表示しないこと', async (declaration, reason) => {
    await wi('order', 'WI-1', declaration);
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.skipped).toBe(true);
    expect(actual.warnings.join('\n')).toContain(reason);
    expect(actual.warnings.join('\n')).toContain('WI-1');
  });

  it('明示OFFではWIがなくても警告を出さないこと', async () => {
    await configure({ phaseDependencies: { storyReflection: { enabled: false } } });
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: true, skipped: true, blockers: [], warnings: [] });
  });

  it('設定破損は未検証として理由を返すこと', async () => {
    await put('phasegate.config.json', '{');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.skipped).toBe(true);
    expect(actual.warnings.join('\n')).toContain('未検証');
  });

  it('移設先の推移cross依存を検出し、既定パスのタグでは合格せず移設先反映後に解消すること', async () => {
    await configure({ paths: { inceptionDocs: './design/proposals/', designDocs: 'design/approved/' } });
    await wi('order', 'WI-1', 'depends_on: [WI-2]');
    await wi('shared', 'WI-2', 'depends_on: [WI-3]');
    await wi('_cross', 'WI-3', 'depends_on: []\naffects: [shared, storage]');
    await mkdir(join(rootDir, 'design'));
    await rename(join(rootDir, 'docs/inception'), join(rootDir, 'design/proposals'));
    await put('design/approved/order/logical_design.md', '<!-- @work-item-id WI-1 -->');
    await put('design/approved/shared/logical_design.md', '<!-- @work-item-id WI-2, WI-3 -->');
    await put('docs/product/construction/storage/logical_design.md', '<!-- @work-item-id WI-3 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.skipped).toBe(false);
    expect(actual.blockers).toEqual([
      'design/approved/storage/logical_design.md に @work-item-id WI-3 が反映されていません (inception: design/proposals/_cross/WI-3/logical_design.md)',
    ]);
    await put('design/approved/storage/logical_design.md', '<!-- @work-item-id WI-3 -->');
    const resumed = await adapter().checkSessionReflection('order', 'WI-1');
    expect(resumed).toMatchObject({ passed: true, skipped: false, blockers: [], warnings: [] });
  });

  it.each(['../outside', '/absolute', '', 42])('不正ルート%sを既定パスへ置き換えず未検証とすること', async (inceptionDocs) => {
    await configure({ paths: { inceptionDocs } });
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.skipped).toBe(true);
    expect(actual.warnings.join('\n')).toContain('Invalid documentation root');
  });

  it('移設先でも別Unitの無関係なlegacy aliasで誤った曖昧判定をしないこと', async () => {
    await configure({ paths: { inceptionDocs: 'design/proposals', designDocs: 'design/approved' } });
    await wi('order', 'WI-1', 'depends_on: []\nlegacy_id: US-10');
    await wi('other', 'WI-9', 'depends_on: []\nlegacy_id: US-10');
    await mkdir(join(rootDir, 'design'));
    await rename(join(rootDir, 'docs/inception'), join(rootDir, 'design/proposals'));
    await put('design/approved/order/logical_design.md', '<!-- @story-id US-10 -->');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual).toMatchObject({ passed: true, skipped: false, blockers: [], warnings: [] });
  });

  it('任意mappingの警告を合格結果から落とさないこと', async () => {
    await configure({ phaseDependencies: { storyReflection: { ...reflection, mappings: [{ ...reflection.mappings[0], required: false }] } } });
    await wi('order', 'WI-1', 'depends_on: []');
    const actual = await adapter().checkSessionReflection('order', 'WI-1');
    expect(actual.passed).toBe(true);
    expect(actual.skipped).toBe(false);
    expect(actual.warnings.join('\n')).toContain('WI-1');
    expect(actual.blockers).toEqual([]);
  });
});
