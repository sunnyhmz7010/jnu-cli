import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCompletion, mergeCompletionCourses, normalizeCompletionCourse } from '../src/completion.js';
import { formatResult } from '../src/format.js';

function fixture({ cached = true } = {}) {
  const calls = [];
  const post = async (path, form, name) => {
    calls.push({ path, form, name });
    const rows = {
      grpyfacx: [{ PYFADM: 'plan-test', PYFAMC: '合成个人方案' }],
      cxxsscfa: cached ? [{ PYFADM: 'plan-test', BYNJDM: '-', CZSJ: '2026-10-01 12:00:00' }] : [],
      cxdqxnxq: [{ DM: '2026-2027-1', MC: '合成当前学期' }],
      cxxkxnxq: [{ DM: '2026-2027-2', MC: '合成选课学期' }],
      cxscfa: [{ PYFADM: 'plan-test', YQXF: '160', WCXF: '8', XKXF: '2' }],
      cxfakzyxxfgj: [{ XKXF: form.KZH ? '6' : '4' }],
      cxscfakz: [{ KZH: 'module-test', KZM: '合成模块', KZLXDM: '01', FKZH: null, YQXF: '8', WCXF: '2', XKXF: '2', SFTG: '0' }],
      cxscfakzkc: [{ KCH: 'A', KCM: '合成 A', CJ: '80', SFTG: '1' }, { KCH: 'B', KCM: '合成 B', SFTG: '2' }, { KCH: 'C', KCM: '合成 C', SFTG: '2' }],
      cxsxkqk: [{ KCH: 'A', KCM: '合成 A', SFTG: '3', CJ: '待选', PYFADM: null, KZH: null }, { KCH: 'A', KCM: '合成 A', SFTG: '4', CJ: '已选课', PYFADM: null, KZH: null }]
    }[name];
    assert(rows, `Unexpected endpoint ${name}`);
    return { totalSize: name === 'cxfakzyxxfgj' ? -1 : rows.length, rows };
  };
  return { post, calls };
}

test('读取已有学业结果，不触发重算，当前学期与选课学期分别读取', async () => {
  const { post, calls } = fixture();
  const result = await loadCompletion(post, { studentId: 'student-test', action: 'summary' });
  assert.equal(result.calculation.state, 'completed');
  assert.equal(result.calculation.source, 'stored-result');
  assert.equal(result.plan.planCode, 'plan-test');
  assert.equal(result.plan.requiredCredits, 160);
  assert.equal(result.plan.remainingCredits, 152);
  assert.equal(result.summary.requiredCredits, 160);
  assert.equal(result.summary.storedSelectedCredits, 2);
  assert.equal(result.summary.currentSelectedCredits, 4);
  assert.notEqual(result.currentTerm.id, result.selectionTerm.id);
  assert(!calls.some((call) => /bysc|calculate/i.test(call.path)));
  assert(!JSON.stringify(result).includes('student-test'));
});

test('按当前课程号排除缓存侧重合，保留当前选课多行及其请求上下文', async () => {
  const { post, calls } = fixture();
  const result = await loadCompletion(post, { studentId: 'student-test', action: 'courses', module: 'module-test' });
  assert.equal(result.items.length, 4);
  const current = result.items.filter((row) => row.source === 'current-selection');
  assert.equal(current.length, 2);
  assert(current.every((row) => row.planCode === 'plan-test' && row.moduleCode === 'module-test'));
  assert(current.every((row) => row.numericScore === null));
  assert.equal(current.filter((row) => row.selected).length, 1);
  assert.equal(current.find((row) => row.selected).status, 'selected');
  assert.equal(result.module.moduleCode, 'module-test');
  assert.equal(result.module.currentSelectedCredits, 6);
  assert.equal(result.module.storedSelectedCredits, 2);
  assert.equal(calls.filter((call) => call.name === 'cxfakzyxxfgj' && call.form.KZH).length, 1);
  assert.equal(result.items.find((row) => row.courseCode === 'B').status, 'not-taken');
  assert.equal(calls.find((call) => call.name === 'cxsxkqk').form.XNXQDM, '2026-2027-2');
  assert.equal(result.completeness.mergedRows, 4);
  const selected = await loadCompletion(fixture().post, { studentId: 'student-test', action: 'courses', module: 'module-test', state: 'selected' });
  assert.equal(selected.items.length, 1);
  assert.equal(selected.items[0].statusCode, '4');
});

test('逐模块补查当前选课学分，模块行和树都保留新旧值及完整查询上下文', async () => {
  const { post, calls } = fixture();
  const result = await loadCompletion(post, { studentId: 'student-test', action: 'modules' });
  assert.equal(result.summary.currentSelectedCredits, 4);
  assert.equal(result.items[0].currentSelectedCredits, 6);
  assert.equal(result.items[0].selectedCredits, 2);
  assert.equal(result.items[0].storedSelectedCredits, 2);
  assert.equal(result.tree[0].currentSelectedCredits, 6);
  const supplement = calls.find((call) => call.name === 'cxfakzyxxfgj' && call.form.KZH);
  assert.deepEqual(supplement.form, { XH: 'student-test', PYFADM: 'plan-test', BYNJDM: '-', SCLBDM: '04', XNXQDM: '2026-2027-1', KZH: 'module-test', KZLXDM: '01' });
});

test('模块补查保留零和空值，查询失败时不伪造为缓存值', async () => {
  for (const value of ['0', null]) {
    const { post } = fixture();
    const result = await loadCompletion((path, form, name) => name === 'cxfakzyxxfgj' && form.KZH ? { rows: [{ XKXF: value }] } : post(path, form, name), { studentId: 'student-test', action: 'modules' });
    assert.equal(result.items[0].currentSelectedCredits, value === null ? null : 0);
    assert.equal(result.items[0].selectedCredits, 2);
    assert.equal(result.items[0].storedSelectedCredits, 2);
  }
  const { post } = fixture();
  await assert.rejects(loadCompletion((path, form, name) => {
    if (name === 'cxfakzyxxfgj' && form.KZH) throw Object.assign(new Error('合成接口失败'), { code: 'API_ERROR' });
    return post(path, form, name);
  }, { studentId: 'student-test', action: 'modules' }), { code: 'API_ERROR' });
  await assert.rejects(loadCompletion((path, form, name) => name === 'cxscfakz' ? { rows: [{ KZH: 'module-test' }], totalSize: 1 } : post(path, form, name), { studentId: 'student-test', action: 'modules' }), { code: 'PAGE_CHANGED' });
});

test('无已有结果返回未计算，不误报计算中或自动发起新计算', async () => {
  const { post, calls } = fixture({ cached: false });
  const result = await loadCompletion(post, { studentId: 'student-test', action: 'summary' });
  assert.equal(result.calculation.state, 'not-calculated');
  assert.equal(result.summary, null);
  assert.equal(calls.length, 2);
  assert(formatResult('completion summary', result).includes('暂无已有计算结果'));
  const status = await loadCompletion(fixture({ cached: false }).post, { studentId: 'student-test', action: 'status' });
  assert.equal(status.loggedIn, true);
  assert.equal(status.calculation.state, 'not-calculated');
});

test('只能选择本人方案和已返回模块，课程状态不依赖 SFXK', async () => {
  await assert.rejects(loadCompletion(fixture().post, { studentId: 'student-test', plan: 'foreign-plan' }), { code: 'PROGRAM_NOT_FOUND' });
  await assert.rejects(loadCompletion(fixture().post, { studentId: 'student-test', action: 'courses', module: 'missing' }), { code: 'MODULE_NOT_FOUND' });
  const course = normalizeCompletionCourse({ SFTG: '4', SFXK: null, CJ: '0' }, { planCode: 'plan-test', moduleCode: 'module-test' });
  assert.equal(course.state, 'selected');
  assert.equal(course.numericScore, 0);
  assert.equal(mergeCompletionCourses([{ KCH: 'A' }, { KCH: 'B' }], [{ KCH: 'A' }, { KCH: 'A' }]).length, 3);
});
