import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseOptions } from '../src/main.js';
import { browserLaunchOptions } from '../src/browser.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const home = mkdtempSync(join(tmpdir(), 'jnu-cli-test-'));
after(() => { assert(resolve(home).startsWith(resolve(tmpdir()) + '\\jnu-cli-test-') || resolve(home).startsWith(resolve(tmpdir()) + '/jnu-cli-test-')); rmSync(home, { recursive: true, force: true }); });
const run = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, JNU_CLI_HOME: home } });

test('暨大入口保留帮助，未知命令按契约返回 UNSUPPORTED_ACTION', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert(result.stdout.includes('jnu-cli course'));
  assert(result.stdout.includes('jnu-cli grade'));
  assert(result.stdout.includes('暨南大学本科生版'));
  for (const command of [['recognition', 'list'], ['profile', 'edit'], ['evaluation', 'submit'], ['completion', 'recalculate']]) {
    const rejected = run(command);
    assert.equal(rejected.status, 2);
    assert.equal(JSON.parse(rejected.stdout).error.code, 'UNSUPPORTED_ACTION');
  }
});

test('不存在独立档案时状态为未登录，查询给出 LOGIN_REQUIRED', () => {
  const direct = JSON.parse(run(['auth', 'status', '--network', 'direct']).stdout);
  assert.equal(direct.data.loggedIn, false);
  assert.equal(direct.meta.network, 'direct');
  const defaultOutput = run(['auth', 'status']);
  assert.equal(defaultOutput.stderr, '');
  assert.equal(JSON.parse(defaultOutput.stdout).ok, true);
  assert.equal(JSON.parse(defaultOutput.stdout).data.loggedIn, false);
  assert.equal(JSON.parse(defaultOutput.stdout).data.reason, 'profile-missing');
  assert.equal(JSON.parse(defaultOutput.stdout).data.profileExists, false);
  for (const domain of ['course', 'grade', 'exam', 'program', 'evaluation']) {
    const result = run([domain, 'list']);
    assert.equal(result.status, 11);
    assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
    assert.equal(JSON.parse(result.stdout).meta.school, 'jnu');
  }
  for (const args of [['completion', 'summary'], ['profile', 'show']]) assert.equal(run(args).status, 11);
});

test('非法参数在打开浏览器前返回 JSON，按上游实际行为使用 UNKNOWN_ERROR 和退出码 1', () => {
  for (const args of [['auth', 'status', '--json'], ['browser', 'status', '--json'], ['program', 'item', 'plan-a', '--json'], ['course', 'list', '--week', '0'], ['course', 'list', '--week', '1.5'], ['course', 'list', '--all-weeks'], ['course', 'today', '--date', '2026-02-30'], ['course', 'today', '--date', '2026-99-01'], ['grade', 'list', '--term', '2026-2026-1'], ['grade', 'list', '--week', '2'], ['auth', 'status', '--url', 'file:///private'], ['auth', 'login', '--network', 'invalid'], ['course', 'list', '--network'], ['browser', 'status', '--network', 'direct'],
    ['program', 'item'], ['program', 'item', '--code', 'plan-a'], ['program', 'item', 'plan-a', 'extra'], ['program', 'list', '--page', '0'], ['program', 'list', '--limit', '0'], ['program', 'list', '--page-size', '10'], ['completion', 'courses'], ['completion', 'courses', '--module', 'module-a', '--state', 'invalid'], ['evaluation', 'list', '--state', 'selected'], ['profile', 'show', '--student-id', 'OTHER']]) {
    const result = run(args);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.equal(result.stderr, '');
    assert.equal(JSON.parse(result.stdout).error.code, 'UNKNOWN_ERROR');
    assert.notEqual(JSON.parse(result.stdout).error.message, '查询未完成，请检查网络和浏览器状态。');
  }
});

test('共同参数使用上游契约，方案详情接受位置参数', () => {
  assert.equal(parseOptions('program', 'item', ['plan-a']).target, 'plan-a');
  const options = parseOptions('program', 'list', ['--limit', '5', '--page', '2', '--keyword', '计算机', '--grade', '2025级', '--department', '学院', '--major', '专业']);
  assert.equal(options.limit, 5);
  assert.equal(options.page, 2);
  assert.equal(options.grade, '2025级');
  assert.equal(options.keyword, '计算机');
  assert.equal(options.department, '学院');
  assert.equal(options.major, '专业');
  assert.equal(parseOptions('program', 'list', ['--limit', '101']).limit, 101);
  assert.equal(parseOptions('completion', 'summary', ['--timeout', '3600']).completionTimeout, 3600);
  assert.equal(parseOptions('grade', 'list', ['--url', 'https://jw.jnu.edu.cn/entry']).url, 'https://jw.jnu.edu.cn/entry');
  assert.equal(parseOptions('completion', 'summary', ['--timeout', '30']).completionTimeout, 30);
  assert.equal(parseOptions('completion', 'summary', []).completionTimeout, 180);
  assert.equal(parseOptions('course', 'list', ['--date', '2026-10-22']).weekday, 4);
});

test('默认查询无界面，登录与 --headed 明确控制窗口且保留独立会话恢复', () => {
  assert.equal(browserLaunchOptions(parseOptions('course', 'list', [])).headless, true);
  assert.equal(browserLaunchOptions(parseOptions('course', 'list', ['--headed'])).headless, false);
  assert.equal(browserLaunchOptions(parseOptions('auth', 'login', [])).headless, false);
  assert.equal(browserLaunchOptions(parseOptions('auth', 'login', ['--headless'])).headless, true);
  assert(browserLaunchOptions().args.includes('--restore-last-session'));
  assert(browserLaunchOptions({ network: 'direct' }).args.includes('--no-proxy-server'));
});

test('方案新命令通过参数检查，未登录时仍返回真实 LOGIN_REQUIRED', () => {
  for (const args of [['program', 'item', 'plan-test'], ['program', 'list', '--limit', '5', '--keyword', '合成方案'], ['completion', 'summary', '--timeout', '30']]) {
    const result = run(args);
    assert.equal(result.status, 11, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).error.code, 'LOGIN_REQUIRED');
  }
});
