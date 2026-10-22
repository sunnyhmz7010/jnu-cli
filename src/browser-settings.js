import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { failure, homeDirectory } from './config.js';

const definitions = {
  edge: { label: 'Microsoft Edge', channel: 'msedge' },
  chrome: { label: 'Google Chrome', channel: 'chrome' },
  chromium: { label: 'Playwright Chromium', channel: null }
};

function validateBrowser(value) {
  if (!Object.hasOwn(definitions, value)) throw failure('BROWSER_SELECTION_INVALID', '浏览器应为 chrome、edge 或 chromium。');
  return value;
}

function savedBrowser(env) {
  let contents;
  try { contents = readFileSync(join(homeDirectory(env), 'browser.json'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let settings;
  try { settings = JSON.parse(contents); }
  catch { throw failure('BROWSER_CONFIG_INVALID', '浏览器配置不是有效 JSON。', '可用 JNU_BROWSER=edge 临时指定浏览器，再运行 jnu-cli browser use edge 重写配置。'); }
  return validateBrowser(settings?.browser);
}

export function browserInstalled(id, { env = process.env, platform = process.platform } = {}) {
  validateBrowser(id);
  if (id === 'chromium') return existsSync(chromium.executablePath());
  // Windows 环境变量名不区分大小写，测试或调用方传入普通对象时保留同样语义。
  const variable = (name) => env[Object.keys(env).find((key) => key.toUpperCase() === name)];
  let candidates;
  if (platform === 'win32') {
    const relative = id === 'edge' ? ['Microsoft', 'Edge', 'Application', 'msedge.exe'] : ['Google', 'Chrome', 'Application', 'chrome.exe'];
    candidates = ['LOCALAPPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)'].map(variable).filter(Boolean).map((root) => join(root, ...relative));
  } else if (platform === 'darwin') {
    const application = id === 'edge' ? 'Microsoft Edge' : 'Google Chrome';
    candidates = ['/Applications', join(homedir(), 'Applications')].map((root) => join(root, `${application}.app`, 'Contents', 'MacOS', application));
  } else {
    const binaries = id === 'edge' ? ['microsoft-edge', 'microsoft-edge-stable'] : ['google-chrome', 'google-chrome-stable'];
    candidates = ['/usr/bin', '/opt/google/chrome'].flatMap((root) => binaries.map((binary) => join(root, binary)));
  }
  return candidates.some((candidate) => existsSync(candidate));
}

export function getBrowserSelection({ env = process.env, platform = process.platform } = {}) {
  const explicit = env.JNU_BROWSER?.trim().toLowerCase();
  const saved = explicit ? null : savedBrowser(env);
  const preferred = platform === 'win32' ? ['edge', 'chrome', 'chromium'] : ['chrome', 'edge', 'chromium'];
  const id = explicit ? validateBrowser(explicit) : saved ?? preferred.find((browser) => browserInstalled(browser, { env, platform })) ?? preferred[0];
  return { id, ...definitions[id], source: explicit ? 'environment' : saved ? 'saved' : 'detected', profilePath: join(homeDirectory(env), 'browser-profiles', id) };
}

export function assertBrowserAvailable(options = {}) {
  const selection = getBrowserSelection(options);
  if (!browserInstalled(selection.id, options)) throw failure('BROWSER_UNAVAILABLE', `未找到可用的 ${selection.label}。`, '安装 Edge 或 Chrome 后运行 jnu-cli browser use edge 或 jnu-cli browser use chrome。');
  return selection;
}

export function getBrowserStatus(options = {}) {
  const env = options.env ?? process.env;
  return { selected: getBrowserSelection(options), browsers: Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, {
    id, ...definition, installed: browserInstalled(id, options), profilePath: join(homeDirectory(env), 'browser-profiles', id)
  }])) };
}

export function selectBrowser(id, options = {}) {
  validateBrowser(id);
  const env = { ...(options.env ?? process.env), JNU_BROWSER: id };
  const selection = assertBrowserAvailable({ ...options, env });
  const directory = homeDirectory(env);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(join(directory, 'browser.json'), JSON.stringify({ browser: id }, null, 2) + '\n', { mode: 0o600 });
  return { ...selection, source: 'saved' };
}
