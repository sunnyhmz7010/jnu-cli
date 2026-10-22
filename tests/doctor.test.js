import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = mkdtempSync(join(tmpdir(), 'jnu-doctor-test-'));
after(() => { assert(resolve(root).startsWith(resolve(tmpdir()) + sep + 'jnu-doctor-test-')); rmSync(root, { recursive: true, force: true }); });
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const manifest = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

function diagnose(entry, home) {
  const result = spawnSync(process.execPath, [entry, 'doctor'], { encoding: 'utf8', env: {
    ...process.env, JNU_CLI_HOME: home, JNU_BROWSER: 'chromium', PLAYWRIGHT_BROWSERS_PATH: join(root, 'missing-browsers')
  } });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.meta.command, 'doctor');
  assert.equal(report.meta.gateway, 'auto');
  assert.equal(existsSync(home), false);
  return report.data;
}

test('doctor 使用上游诊断字段，浏览器缺失时仍返回报告且不创建档案', () => {
  const home = join(root, 'read-only-home');
  const report = diagnose(cli, home);
  const packageInfo = JSON.parse(manifest);
  assert.deepEqual(report.cli, { name: packageInfo.name, version: packageInfo.version });
  assert.deepEqual(report.node, { version: process.versions.node, ok: true, minimumMajor: 20 });
  assert.deepEqual(report.platform, { os: process.platform, arch: process.arch });
  assert.equal(report.home.path, home);
  assert.equal(report.profile.path, join(home, 'browser-profiles', 'chromium'));
  assert.equal(report.playwright.installed, true);
  assert.equal(report.browser.channel, 'chromium');
  assert.equal(report.browser.profileMode, 'persistent');
  assert.equal(report.browser.browsers.chromium.installed, false);
});

test('Playwright 无法加载时 doctor 仍返回 installed=false', () => {
  const app = join(root, 'without-playwright');
  mkdirSync(app);
  cpSync(fileURLToPath(new URL('../src/', import.meta.url)), join(app, 'src'), { recursive: true });
  writeFileSync(join(app, 'package.json'), manifest);
  // 无效入口模拟依赖未完整安装，避免改动项目自身的 node_modules。
  const dependency = join(app, 'node_modules', 'playwright');
  mkdirSync(dependency, { recursive: true });
  writeFileSync(join(dependency, 'package.json'), '{"name":"playwright","main":"missing.cjs"}\n');
  const report = diagnose(join(app, 'src', 'cli.js'), join(app, 'private'));
  assert.equal(report.playwright.installed, false);
  assert.equal(report.browser.browsers.chromium.installed, false);
});
