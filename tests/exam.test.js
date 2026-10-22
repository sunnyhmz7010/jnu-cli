import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExams, normalizeExam } from '../src/exam.js';

test('考试请求使用 JSON 包装，负一总数按学期数组处理，保留空考场与安排标志', async () => {
  const calls = [];
  const result = await loadExams(async (path, form, name) => {
    calls.push({ path, form, name });
    if (name === 'dqxnxq') return { rows: [{ DM: '2026-2027-1', MC: '合成学期' }] };
    if (name === 'cxdqfwqsj') return { rows: [{ CURRTIME: '2026-10-22 12:00:00' }] };
    assert.equal(name, 'cxxsksap');
    return { totalSize: -1, rows: [{ KSDM: 'exam-test', KCM: '合成课程', KSRQ: '2026-12-01', KSSJMS: '09:00-11:00', JASMC: null, ZWH: null,
      KSRWZT: '0', SFFBSJ: null, XH: 'DO_NOT_OUTPUT_ID' }] };
  }, { term: '2025-2026-2' });
  assert.deepEqual(JSON.parse(calls.find((call) => call.name === 'cxxsksap').form.requestParamStr), { XNXQDM: '2025-2026-2', '*order': '-KSRQ,-KSSJMS' });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].room, null);
  assert.equal(result.items[0].seat, null);
  assert.equal(result.conflictCheck.hasConflicts, null);
  assert(!JSON.stringify(result).includes('DO_NOT_OUTPUT'));
  assert(!calls.some((call) => call.path.includes('cxkssjct')));
});

test('考试记录归一化不因任务或发布标志丢弃记录', () => {
  assert.equal(normalizeExam({ KSDM: 'test', KSRWZT: '0', SFAPSJ: '1', SFFBSJ: null }).timeArranged, '1');
});

test('考试接口声明了非负总数时仍校验完整性，缺失总数不是零', async () => {
  const post = (totalSize) => async (path, form, name) => name === 'dqxnxq' ? { rows: [{ DM: '2026-2027-1' }] } : { totalSize, rows: [] };
  await assert.rejects(loadExams(post(2)), { code: 'INCOMPLETE_DATA' });
  await assert.rejects(loadExams(post(null)), { code: 'INCOMPLETE_DATA' });
});
