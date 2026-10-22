import test from 'node:test';
import assert from 'node:assert/strict';
import { activeInWeek, mergeAdjustments, loadCourses } from '../src/course.js';
import { loadGrades, normalizeGrade } from '../src/grade.js';
import { groupTotal, readAllPages, requireGroup, postGroup } from '../src/api.js';
import { homeDirectory, safeSource, shanghaiDate } from '../src/config.js';
import { assertServiceAvailable, enterPortal } from '../src/browser.js';

const row = { KBID: 'schedule-a', WID: 'row-a', JXBID: 'class-a', KCH: 'TEST101', KCM: '合成课程', SKZC: '1111', ZCMC: '1-4周', SKXQ: 1, KSJC: 1, JSJC: 2, SKJS: '合成教师', JASMC: '测试教室', XXXQDM: 'test-campus' };
const change = { KBID: 'schedule-a', SKZC: '0100', XSKZC: '0010', XSKXQ: 3, XKSJC: 5, XJSJC: 6, TKLXDM: '01', XJASMC: '新测试教室', XZCMC: '3周' };

test('独立档案目录、日志 URL 脱敏和上海日期', () => {
  assert.equal(homeDirectory({ JNU_CLI_HOME: 'jnu-private', OTHER_HOME: 'unrelated' }), 'jnu-private');
  assert(homeDirectory({ OTHER_HOME: 'unrelated' }).endsWith('.jnu-cli'));
  assert.equal(safeSource('https://jw.jnu.edu.cn/app?t_s=secret&gid_=private#/course'), 'https://jw.jnu.edu.cn/app#/course');
  assert.equal(shanghaiDate(new Date('2026-10-21T17:00:00Z')), '2026-10-22');
});

test('教务网关错误立即停止，不能继续等待用户登录', async () => {
  const context = { pages: () => [{ goto: async () => ({ status: () => 502 }) }] };
  await assert.rejects(enterPortal(context), { code: 'NETWORK_REQUIRED' });
  assert.throws(() => assertServiceAvailable(200, '502 Bad Gateway\nnginx'), { code: 'NETWORK_REQUIRED' });
  assert.throws(() => assertServiceAvailable(200, '502\n源站收到无效响应\n浏览器\n防护节点\n源站'), { code: 'NETWORK_REQUIRED' });
  const cloudError = { pages: () => [{
    goto: async () => ({ status: () => 200 }),
    url: () => 'https://icas.jnu.edu.cn/cas/login',
    locator: () => ({ innerText: async () => '502\n源站收到无效响应\n浏览器\n防护节点\n源站' })
  }] };
  await assert.rejects(enterPortal(cloudError), { code: 'NETWORK_REQUIRED' });
  assert.throws(() => assertServiceAvailable(undefined, '504 Gateway Time-out'), { code: 'NETWORK_REQUIRED' });
  assert.throws(() => assertServiceAvailable(403), { code: 'PERMISSION_DENIED' });
  assert.throws(() => assertServiceAvailable(429), { code: 'RATE_LIMITED' });
  assert.doesNotThrow(() => assertServiceAvailable(200, '统一身份认证'));
  const disconnected = { pages: () => [{ goto: async () => { throw new Error('synthetic network failure'); } }] };
  await assert.rejects(enterPortal(disconnected), { code: 'NETWORK_REQUIRED' });
});

test('周次位图优先于中文描述并支持离散周', () => {
  assert.equal(activeInWeek({ SKZC: '1010', ZCMC: '1-4周' }, 2), false);
  assert.equal(activeInWeek({ SKZC: '1010' }, 3), true);
  assert.equal(activeInWeek({ SKZC: '1010' }, 9), false);
  assert.throws(() => activeInWeek({}, 2), { code: 'PAGE_CHANGED' });
});

test('跨周调课移除原周次并只添加新安排，不修改原始记录', () => {
  const rows = mergeAdjustments([row], [change]);
  assert.equal(rows[0].SKZC, '1011');
  assert.equal(rows[0].ZCMC, '1周,3-4周');
  assert.equal(rows[1].SKZC, '0010');
  assert.equal(rows[1].JASMC, '新测试教室');
  assert.equal(rows[1].SKXQ, 3);
  assert.equal(rows[1].XXXQDM, null);
  assert.equal(mergeAdjustments([row], [{ ...change, XSKJS: '', YSKJS: '合成原教师' }])[1].SKJS, '合成原教师');
  assert.equal(row.SKZC, '1111');
});

test('停课不生成新课程，多个调课累计删除原周次', () => {
  const rows = mergeAdjustments([row], [change, { KBID: 'schedule-a', SKZC: '1000', TKLXDM: '02' }]);
  assert.equal(rows[0].SKZC, '0011');
  assert.equal(rows.length, 2);
  assert.throws(() => mergeAdjustments([row], [{ ...change, XSKZC: null }]), { code: 'PAGE_CHANGED' });
});

function coursePost(week = 2) {
  const calls = [];
  const post = async (path, form, name) => {
    calls.push({ path, form, name });
    return { totalSize: name === 'xskcb' ? 1 : name === 'xsdkkc' || name === 'xswpkc' ? 0 : 1,
      rows: { dqxnxq: [{ DM: '2026-2027-1', MC: '合成学期' }], dqzc: [{ ZC: week }], xskcb: [row], xsdkkc: [], xswpkc: [] }[name] };
  };
  return { post, calls };
}

test('日期查询向学校传目标日期并取得对应教学周', async () => {
  const { post, calls } = coursePost(2);
  const result = await loadCourses(post, { today: true, date: '2026-10-19' });
  assert.equal(result.items.length, 1);
  assert.equal(result.weekday, 1);
  assert.equal(result.filters.week, 2);
  assert.equal(calls.find((item) => item.name === 'dqzc').form.RQ, '2026-10-19');
});

test('显式历史学期读取全学期，校历无教学周时当天结果为空', async () => {
  const fixture = coursePost(null);
  assert.equal((await loadCourses(fixture.post, { term: '2025-2026-2' })).items.length, 1);
  const today = await loadCourses(fixture.post, { today: true, date: '2026-10-19' });
  assert.equal(today.items.length, 0);
  assert.equal(today.reason, 'no-teaching-week');
});

test('元数据与业务错误不能当作空数组', () => {
  assert.throws(() => requireGroup({ code: '0', models: [] }, 'xscjcx'), { code: 'PAGE_CHANGED' });
  assert.throws(() => requireGroup({ code: '#ERR' }, 'xscjcx'), { code: 'API_ERROR' });
  assert.deepEqual(requireGroup({ code: '0', datas: { xscjcx: { rows: [] } } }, 'xscjcx').rows, []);
});

test('空 totalSize 不能伪装成零条完整结果', async () => {
  await assert.rejects(readAllPages(async () => ({ totalSize: null, rows: [] })), { code: 'INCOMPLETE_DATA' });
  for (const totalSize of [undefined, null, '', false, -1]) assert.throws(() => groupTotal({ totalSize }), { code: 'INCOMPLETE_DATA' });
  assert.equal(groupTotal({ totalSize: '0' }), 0);
  assert.throws(() => mergeAdjustments([{ ...row, SKZC: null }], []), { code: 'PAGE_CHANGED' });
});

test('totalPage=0 时仍按 totalSize 翻页', async () => {
  const calls = [];
  const result = await readAllPages(async ({ pageNumber }) => {
    calls.push(pageNumber);
    return { totalSize: 3, rows: pageNumber === '1' ? [{ WID: 'a' }, { WID: 'b' }] : [{ WID: 'c' }], extParams: { totalPage: 0 } };
  }, 2);
  assert.equal(result.total, 3);
  assert.deepEqual(calls, ['1', '2']);
});

test('重复页、重复记录、截断或变化中的总数均拒绝伪完整结果', async () => {
  await assert.rejects(readAllPages(async () => ({ totalSize: 2, rows: [{ WID: 'a' }] }), 1), { code: 'INCOMPLETE_DATA' });
  await assert.rejects(readAllPages(async ({ pageNumber }) => ({ totalSize: 3, rows: pageNumber === '1' ? [{ WID: 'a' }, { WID: 'b' }] : [{ WID: 'b' }] }), 2), { code: 'INCOMPLETE_DATA' });
  await assert.rejects(readAllPages(async ({ pageNumber }) => ({ totalSize: 3, rows: pageNumber === '1' ? [{ WID: 'a' }] : [] }), 1), { code: 'INCOMPLETE_DATA' });
  await assert.rejects(readAllPages(async ({ pageNumber }) => ({ totalSize: Number(pageNumber) + 2, rows: [{ WID: pageNumber }] }), 1), { code: 'INCOMPLETE_DATA' });
});

test('成绩展示、数值、等级及零分分别保留，不把缺失积点补成零', () => {
  const numeric = normalizeGrade({ XSZCJMC: '0', ZCJ: 0, XFJD: 0, XF: '2', XH: 'PRIVATE_ID', XM: 'PRIVATE_NAME' });
  assert.equal(numeric.score, '0');
  assert.equal(numeric.numericScore, 0);
  assert.equal(numeric.gradePoint, 0);
  assert.equal(numeric.earnedCredit, null);
  assert.equal(normalizeGrade({ DJCJMC: '优秀' }).score, '优秀');
  assert(!JSON.stringify(numeric).includes('PRIVATE'));
});

test('成绩查询不继承最近两学期限制，先完整采集再按学期筛选', async () => {
  const forms = [];
  const result = await loadGrades(async (path, form) => {
    forms.push(form);
    assert(path.endsWith('/xscjcx.do'));
    return { totalSize: 2, rows: [{ WID: 'g1', XNXQDM: '2025-2026-1', XSZCJMC: '90', ZCJ: 90, XFJD: 4, SFYX: '1' }, { WID: 'g2', XNXQDM: '2025-2026-2', DJCJMC: '合格', SFYX: '1' }] };
  }, { term: '2025-2026-2' });
  assert.equal(result.items.length, 1);
  assert.equal(result.completeness.allTermRecords, 2);
  assert.equal(result.gpa, null);
  assert(!JSON.parse(forms[0].querySetting).some((item) => item.name === 'XNXQDM'));
});

test('HTTP 200 登录 HTML、无权限和限流均不是空结果', async () => {
  const page = (result) => ({ evaluate: async () => result });
  await assert.rejects(postGroup(page({ status: 200, url: 'https://icas.jnu.edu.cn/cas/login', data: null }), '/jwapp/sys/test', {}, 'test'), { code: 'LOGIN_REQUIRED' });
  await assert.rejects(postGroup(page({ status: 403, url: 'https://jw.jnu.edu.cn/test' }), '/jwapp/sys/test', {}, 'test'), { code: 'PERMISSION_DENIED' });
  await assert.rejects(postGroup(page({ status: 429, url: 'https://jw.jnu.edu.cn/test' }), '/jwapp/sys/test', {}, 'test'), { code: 'RATE_LIMITED' });
});
