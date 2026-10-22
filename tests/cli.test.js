import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const home = mkdtempSync(join(tmpdir(), 'jnu-cli-test-'));
after(() => { assert(resolve(home).startsWith(resolve(tmpdir()) + '\\jnu-cli-test-') || resolve(home).startsWith(resolve(tmpdir()) + '/jnu-cli-test-')); rmSync(home, { recursive: true, force: true }); });
const run = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, JNU_CLI_HOME: home } });

test('暨大入口仅开放本批功能，JSON 与普通帮助可用', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert(result.stdout.includes('jnu-cli course'));
  assert(result.stdout.includes('jnu-cli grade'));
  assert(result.stdout.includes('暨南大学本科生版'));
  for (const command of [['recognition', 'list'], ['profile', 'edit'], ['evaluation', 'submit'], ['completion', 'recalculate']]) {
    const rejected = run([...command, '--json']);
    assert.equal(rejected.status, 2);
    assert.equal(JSON.parse(rejected.stdout).error.code, 'INVALID_ARGUMENT');
  }
});

test('不存在独立档案时状态为未登录，查询给出 LOGIN_REQUIRED', () => {
  assert.equal(JSON.parse(run(['auth', 'status', '--json']).stdout).data.loggedIn, false);
  const direct = JSON.parse(run(['auth', 'status', '--network', 'direct', '--json']).stdout);
  assert.equal(direct.data.loggedIn, false);
  assert.equal(direct.meta.network, 'direct');
  const human = run(['auth', 'status']);
  assert(human.stdout.includes('未登录'));
  for (const domain of ['course', 'grade', 'exam', 'program', 'evaluation']) {
    const result = run([domain, 'list', '--json']);
    assert.equal(result.status, 11);
    assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
    assert.equal(JSON.parse(result.stdout).meta.school, 'jnu');
  }
  for (const args of [['completion', 'summary'], ['profile', 'show']]) assert.equal(run([...args, '--json']).status, 11);
});

test('先检查非法参数，避免错误参数触发浏览器操作', () => {
  for (const args of [['course', 'list', '--week', '0'], ['course', 'list', '--week', '1.5'], ['course', 'list', '--week', '2', '--all-weeks'], ['course', 'today', '--date', '2026-02-30'], ['course', 'today', '--date', '2026-99-01'], ['grade', 'list', '--term', '2026-2026-1'], ['grade', 'list', '--week', '2'], ['auth', 'login', '--headless'], ['auth', 'status', '--url', 'https://example.com'], ['auth', 'login', '--network', 'invalid'], ['course', 'list', '--network'], ['browser', 'status', '--network', 'direct'],
    ['program', 'item'], ['program', 'list', '--page', '0'], ['program', 'list', '--page-size', '101'], ['completion', 'courses'], ['completion', 'courses', '--module', 'module-a', '--state', 'invalid'], ['evaluation', 'list', '--state', 'selected'], ['profile', 'show', '--student-id', 'OTHER']]) {
    const result = run([...args, '--json']);
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_ARGUMENT');
  }
});
