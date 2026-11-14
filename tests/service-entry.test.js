import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, resolveServiceEntry } from '../src/browser.js';
import { APPS, ORIGIN } from '../src/config.js';

const resolve = (urls, root = '/') => resolveServiceEntry({ root, urls }, APPS.course.path);

test('入口解析支持相对、绝对地址及重复节点', () => {
  assert.equal(resolve(['appShow?appId=123', '/appShow?appId=123']), `${ORIGIN}/appShow?appId=123`);
  assert.equal(resolve([`${ORIGIN}/jwapp/sys/wdkb/index.do`]), `${ORIGIN}/jwapp/sys/wdkb/index.do`);
  assert.equal(resolve(['index.do'], '/jwapp/sys/wdkb'), `${ORIGIN}/jwapp/sys/wdkb/index.do`);
});

test('缺失、冲突、非法协议、外域、凭据及错误应用入口不导航', () => {
  for (const urls of [[], [''], ['appShow?appId=1', 'appShow?appId=2'],
    ['javascript:alert(1)'], ['https://example.com/appShow?appId=1'],
    ['https://user@jw.jnu.edu.cn/appShow?appId=1'], ['/appShow'],
    ['/jwapp/sys/cjcx/index.do'], ['/jwapp/sys/wdkb-evil/index.do']]) {
    assert.equal(resolve(urls), null);
  }
});

function fixture(urls, status = 200) {
  const calls = [];
  let target = false;
  const locator = {
    innerText: async () => '', count: async () => 0,
    filter: () => ({ count: async () => 1, click: async () => { calls.push('click'); target = true; } })
  };
  const portal = {
    evaluate: async () => ({ root: '/', urls }),
    locator: () => locator, getByText: () => locator,
    url: () => target ? `${ORIGIN}${APPS.course.path}index.do` : `${ORIGIN}/new/index.html`,
    waitForLoadState: async () => {}, waitForFunction: async () => {}
  };
  let closed = false;
  const candidate = {
    ...portal,
    goto: async () => { calls.push('navigate'); target = true; return { status: () => status }; },
    close: async () => { calls.push('close'); closed = true; }
  };
  const context = { newPage: async () => candidate, pages: () => closed ? [portal] : [candidate] };
  return { calls, portal, context };
}

test('动态入口优先，成功时不点击门户', async () => {
  const f = fixture(['appShow?appId=123']);
  await openApp(f.context, f.portal, 'course');
  assert.deepEqual(f.calls, ['navigate']);
});

test('未发现入口时使用既有点击流程', async () => {
  const f = fixture([]);
  await openApp(f.context, f.portal, 'course');
  assert.deepEqual(f.calls, ['click']);
});

test('动态业务初始化超时后关闭候选页并点击兜底', async () => {
  const f = fixture(['appShow?appId=123']);
  const candidate = f.context.pages()[0];
  let attempts = 0;
  candidate.waitForFunction = async () => {
    if (attempts++ === 0) throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  };
  await openApp(f.context, f.portal, 'course');
  assert.deepEqual(f.calls, ['navigate', 'close', 'click']);
});

test('网络、权限和限流错误不触发点击重试', async () => {
  for (const [status, code] of [[503, 'NETWORK_REQUIRED'], [403, 'PERMISSION_DENIED'], [429, 'RATE_LIMITED']]) {
    const f = fixture(['appShow?appId=123'], status);
    await assert.rejects(openApp(f.context, f.portal, 'course'), { code });
    assert.deepEqual(f.calls, ['navigate', 'close']);
  }
});
