import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { assertBrowserAvailable, getBrowserSelection } from './browser-settings.js';
import { APPS, ORIGIN, PORTAL, failure, isLoginUrl, safeSource } from './config.js';
import { postGroup } from './api.js';

export function browserLaunchOptions(options = {}) {
  const args = ['--restore-last-session'];
  if (options.network === 'direct') args.push('--no-proxy-server');
  return { headless: options.headless ?? !options.login, args, timeout: 30000 };
}

export async function withBrowser(options, callback) {
  const selection = getBrowserSelection();
  if (!options.login && !existsSync(selection.profilePath)) throw failure('LOGIN_REQUIRED', '尚未建立暨大 CLI 的独立登录档案。', '运行 jnu-cli auth login；不会继承其他浏览器的登录态。');
  assertBrowserAvailable();
  if (options.login) await mkdir(selection.profilePath, { recursive: true });
  const { chromium } = await import('playwright');
  let context;
  try {
    // 教务会话包含会话型 Cookie。正常恢复上次会话，才能在关窗后继续使用，
    // 不导出 Cookie，也不把临时会话强改成长期 Cookie。
    context = await chromium.launchPersistentContext(selection.profilePath, { ...(selection.channel ? { channel: selection.channel } : {}), ...browserLaunchOptions(options) });
    const [, ...restored] = context.pages();
    for (const page of restored) await page.close();
  } catch {
    throw failure('BROWSER_UNAVAILABLE', '无法启动暨大 CLI 浏览器，可能已有命令占用此档案。', '关闭该 CLI 浏览器后重试；可用 jnu-cli browser status 检查浏览器。');
  }
  let timer;
  try {
    if (!options.completionTimeout) return await callback(context, selection);
    return await Promise.race([callback(context, selection), new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = failure('CALCULATION_TIMEOUT', '学业完成查询超时，未触发重新计算。');
        error.details = { timeoutSeconds: options.completionTimeout };
        reject(error);
      }, options.completionTimeout * 1000);
    })]);
  } finally { clearTimeout(timer); await context.close(); }
}

export function assertServiceAvailable(status, text = '') {
  if (status === 403) throw failure('PERMISSION_DENIED', '教务或认证服务拒绝当前访问。');
  if (status === 429) throw failure('RATE_LIMITED', '教务系统限制请求频率，请稍后手动重试。');
  // 登录后的跳转也可能落到网关错误页，不能继续当作等待用户登录。
  const gatewayPage = /^\s*(?:502\s+Bad Gateway|503\s+Service (?:Temporarily )?Unavailable|504\s+Gateway (?:Time-out|Timeout))\b/i.test(text)
    || /\b502\s*源站收到无效响应/.test(text);
  if (status >= 500 || gatewayPage) {
    throw failure('NETWORK_REQUIRED', `教务或认证请求未成功（${status >= 500 ? `HTTP ${status}` : '网关错误页'}）。`, '检查代理或网络路径后重试；无需清除登录档案。');
  }
}

async function navigatePortal(page, url = PORTAL) {
  let response;
  try { response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); }
  catch { throw failure('NETWORK_REQUIRED', '无法连接暨大教务入口。', '请检查网络或待教务入口恢复后重试。'); }
  assertServiceAvailable(response?.status());
}

async function readState(page) {
  const state = { url: page.url(), text: await page.locator('body').innerText({ timeout: 10000 }) };
  assertServiceAvailable(undefined, state.text);
  return state;
}

function portalReady(state) {
  const url = new URL(state.url);
  return url.origin === ORIGIN && url.pathname.startsWith('/new/') && state.text.includes('最近使用') && state.text.includes('任务中心');
}

export async function enterPortal(context, options = {}) {
  const page = context.pages()[0] ?? await context.newPage();
  await navigatePortal(page, options.url);
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const state = await readState(page);
    if (portalReady(state)) return page;
    if (isLoginUrl(state.url) && await page.locator('input[type=password]').count()) throw failure('LOGIN_REQUIRED', '暨大 CLI 尚未登录或会话已过期。', '运行 jnu-cli auth login。');
    await page.waitForTimeout(200);
  }
  if (isLoginUrl(page.url())) throw failure('LOGIN_REQUIRED', '需要完成暨大统一身份认证。', '运行 jnu-cli auth login。');
  throw failure('PAGE_CHANGED', '未识别到本科教务大厅，请用 --headed 检查页面。');
}

export async function openApp(context, portal, kind) {
  const app = APPS[kind];
  // 门户标题和搜索建议保留换行、缩进，匹配名称时允许两侧空白。
  const appName = new RegExp(`^\\s*${app.name}\\s*$`);
  const recent = portal.locator('.widget-title:visible').filter({ hasText: appName });
  if (await recent.count() === 1) {
    await recent.click();
  } else {
    await portal.getByText(/^\s*\d+\s*个多类型服务\s*$/).click();
    const search = portal.locator('#ampServiceSearchInput');
    await search.waitFor({ state: 'visible' });
    await search.fill(app.name);
    const suggestion = portal.locator('.amp-service-searchName-item').filter({ hasText: appName });
    await suggestion.waitFor({ state: 'visible' });
    await suggestion.click();
    const card = portal.locator('#ampServiceCenterSearchApps .amp-app-card-single').filter({ hasText: appName });
    await card.waitFor({ state: 'visible' });
    // 悬浮大卡片会覆盖原卡片，移动鼠标后直接等待大卡片标题，
    // 避免 hover 持续等待已被正常悬浮层挡住的原卡片接收事件。
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw failure('PAGE_CHANGED', `未能定位${app.name}服务卡片。`);
    await portal.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await portal.locator('.amp-app-card-hover-big:visible .amp-app-card-big-head span').filter({ hasText: appName }).click();
  }
  return waitForApp(context, portal, kind);
}

async function waitForApp(context, portal, kind) {
  const app = APPS[kind];
  const deadline = Date.now() + 30000;
  let entered = false;
  const selectedRoles = new Set();
  while (Date.now() < deadline) {
    for (const page of context.pages()) {
      await readState(page);
      const role = page.getByText('本科-学生-在籍', { exact: true });
      if (!selectedRoles.has(page) && await role.count() === 1 && await role.isVisible()) {
        // 只选已核对的本科在籍身份，不切换到教师或管理角色。
        const body = await page.locator('body').innerText();
        if (body.includes('选择') || body.includes('学生组')) { await role.click(); selectedRoles.add(page); }
      }
      const url = new URL(page.url());
      if (url.origin === ORIGIN && url.pathname.startsWith(app.path)) {
        await page.waitForLoadState('domcontentloaded');
        // 等待应用正常加载完成后再做查询，避免抢在角色与应用初始化之前。
        await page.waitForFunction(() => typeof WIS_EMAP_SERV !== 'undefined', undefined, { timeout: 20000 });
        return page;
      }
      if (isLoginUrl(page.url()) && await page.locator('input[type=password]').count()) throw failure('LOGIN_REQUIRED', '业务应用需要重新登录。', '运行 jnu-cli auth login。');
    }
    const enter = portal.getByText('进入服务', { exact: true });
    if (!entered && await enter.count() === 1 && await enter.isVisible()) { await enter.click(); entered = true; }
    await portal.waitForTimeout(200);
  }
  throw failure('PAGE_CHANGED', `未能通过正常门户打开${app.name}。`);
}

export async function servicePage(context, kind, options) {
  if (!options.url) return openApp(context, await enterPortal(context), kind);
  const entry = new URL(options.url);
  if ((entry.origin === ORIGIN && entry.pathname.startsWith('/new/')) || isLoginUrl(options.url)) {
    return openApp(context, await enterPortal(context, options), kind);
  }
  const page = context.pages()[0] ?? await context.newPage();
  await navigatePortal(page, options.url);
  if (portalReady(await readState(page))) return openApp(context, page, kind);
  return waitForApp(context, page, kind);
}

async function probe(context, options = {}) {
  const page = await servicePage(context, 'course', options);
  const group = await postGroup(page, '/jwapp/sys/wdkb/modules/jshkcb/dqxnxq.do', {}, 'dqxnxq');
  if (!group.rows[0]?.DM) throw failure('PAGE_CHANGED', '业务页没有返回有效学期，不能确认登录。');
  return { loggedIn: true, reason: 'undergraduate-business-verified', sourceUrl: safeSource(page.url()) };
}

export async function authStatus(options = {}) {
  const selection = getBrowserSelection();
  const profileExists = existsSync(selection.profilePath);
  const profile = { profileExists, profilePath: selection.profilePath };
  if (!profileExists) return { loggedIn: false, reason: 'profile-missing', ...profile, hint: '运行 jnu-cli auth login。' };
  try { return { ...await withBrowser(options, async (context) => probe(context, options)), ...profile }; }
  catch (error) {
    if (error.code !== 'LOGIN_REQUIRED') throw error;
    return { loggedIn: false, reason: 'login-required', ...profile, hint: error.hint };
  }
}

export async function login(options = {}) {
  const result = await withBrowser({ ...options, login: true }, async (context) => {
    const page = context.pages()[0] ?? await context.newPage();
    await navigatePortal(page, options.url);
    await readState(page);
    process.stderr.write('请在打开的独立浏览器窗口完成暨大登录；验证本科课表访问成功后会自动关闭窗口。\n');
    const deadline = Date.now() + (options.timeout ?? 300) * 1000;
    while (Date.now() < deadline) {
      if (page.isClosed()) throw failure('LOGIN_REQUIRED', '登录窗口已关闭，尚未完成业务验证。');
      const state = await readState(page);
      if (portalReady(state)) return probe(context);
      if (new URL(state.url).origin === ORIGIN && new URL(state.url).pathname.startsWith(APPS.course.path)) return probe(context, { url: state.url });
      await page.waitForTimeout(500);
    }
    throw failure('AUTH_LOGIN_TIMEOUT', '等待正常登录超时，请重新运行 auth login。');
  });
  // 关闭登录窗口后重新打开同一档案，业务仍可访问才宣告持久化成功。
  const restored = await authStatus({ ...options, headless: true });
  if (!restored.loggedIn) throw failure('LOGIN_REQUIRED', '登录窗口内验证成功，但重启浏览器后会话不可用。', '请重新运行 jnu-cli auth login；无需删除档案。');
  return { ...result, opened: true, closed: true, url: safeSource(options.url ?? PORTAL), profilePath: getBrowserSelection().profilePath, backend: 'playwright', persisted: true };
}

export async function query(kind, options, callback) {
  return withBrowser(options, async (context) => {
    const page = await servicePage(context, kind, options);
    return callback((path, form, name) => postGroup(page, path, form, name), safeSource(page.url()), page);
  });
}

export async function currentStudentId(page) {
  const id = await page.evaluate(() => typeof pageMeta === 'undefined' ? null : pageMeta.params?.USERID);
  if (typeof id !== 'string' || !id.trim()) throw failure('PAGE_CHANGED', '业务页面没有提供当前学生身份，未尝试查询其他学生。');
  return id;
}
