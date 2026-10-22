import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { browserInstalled, getBrowserSelection, getBrowserStatus, selectBrowser } from '../src/browser-settings.js';

const root = mkdtempSync(join(tmpdir(), 'jnu-browser-test-'));
after(() => { assert(resolve(root).startsWith(resolve(tmpdir()) + sep + 'jnu-browser-test-')); rmSync(root, { recursive: true, force: true }); });

function fixture(name) {
  const directory = join(root, name);
  const binary = join(directory, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
  mkdirSync(join(binary, '..'), { recursive: true });
  writeFileSync(binary, 'synthetic browser availability fixture');
  return { platform: 'win32', env: { 'ProgramFiles(x86)': directory, JNU_CLI_HOME: join(directory, 'private') } };
}

test('仅检测本机浏览器，不因查询状态创建配置或登录档案', () => {
  const options = fixture('read-only');
  const status = getBrowserStatus(options);
  assert.equal(status.selected.id, 'edge');
  assert.equal(status.selected.channel, 'msedge');
  assert.equal(status.browsers.edge.installed, true);
  assert.equal(existsSync(options.env.JNU_CLI_HOME), false);
});

test('显式浏览器配置与独立档案路径保持一致', () => {
  const options = fixture('selection');
  const selected = selectBrowser('edge', options);
  assert.equal(selected.profilePath, join(options.env.JNU_CLI_HOME, 'browser-profiles', 'edge'));
  assert.deepEqual(JSON.parse(readFileSync(join(options.env.JNU_CLI_HOME, 'browser.json'), 'utf8')), { browser: 'edge' });
  assert.equal(getBrowserSelection(options).source, 'saved');
  const override = getBrowserSelection({ ...options, env: { ...options.env, JNU_BROWSER: 'chrome' } });
  assert.equal(override.id, 'chrome');
  assert.equal(override.source, 'environment');
  assert.notEqual(override.profilePath, selected.profilePath);
});

test('无效选择、损坏配置和未安装浏览器必须明确失败', () => {
  const options = fixture('invalid');
  assert.throws(() => selectBrowser('unknown', options), { code: 'BROWSER_SELECTION_INVALID' });
  assert.throws(() => selectBrowser('chrome', options), { code: 'BROWSER_UNAVAILABLE' });
  assert.equal(browserInstalled('chrome', options), false);
  mkdirSync(options.env.JNU_CLI_HOME, { recursive: true });
  writeFileSync(join(options.env.JNU_CLI_HOME, 'browser.json'), '{broken');
  assert.throws(() => getBrowserSelection(options), { code: 'BROWSER_CONFIG_INVALID' });
  // 显式选择可修复损坏配置，不应静默忽略后借用其他档案。
  selectBrowser('edge', options);
  assert.equal(getBrowserSelection(options).id, 'edge');
});
