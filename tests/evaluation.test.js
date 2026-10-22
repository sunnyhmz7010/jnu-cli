import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationProgress, loadEvaluation } from '../src/evaluation.js';
import { formatResult } from '../src/format.js';

function fixture() {
  const calls = [];
  const post = async (path, form, name) => {
    calls.push({ path, form, name });
    if (name === 'cxxtcs') return { rows: [{ CSZA: '2025-2026-2', CSZB: '合成评教学期' }] };
    if (name === 'cxxspjwcqk') return { rows: [{ WPS: '0', YPS: '1', ZS: '1', GCXPJSL: '0', XSPJSL: '0', STPJSL: '0' }] };
    if (name === 'cxxslsjlsl') return { rows: [{ GCXPJSL: '1', XSPJSL: '0', KTPJSL: '0', YPS: '1' }] };
    if (name === 'cxdqfwqsj') return { rows: [{ CURRTIME: '2026-10-22 12:00:00' }] };
    assert.equal(name, 'cxdwpj');
    assert.equal(form.PGLXDM, '05');
    assert.equal(form.SFKF, '1');
    assert.equal(form.SFFB, '1');
    return form.SFPG === '0' ? { totalSize: 0, rows: [] } : { totalSize: 1, rows: [{ WJDM: 'questionnaire-test', PCDM: 'batch-test', WJMC: '合成问卷', SFPG: '1', PGLXDM: '05', KCH: null, KCM: null }] };
  };
  return { post, calls };
}

test('评教使用独立配置学期，分别保留当前与历史分类统计', async () => {
  const { post, calls } = fixture();
  const result = await loadEvaluation(post, { action: 'summary' });
  assert.equal(result.term.id, '2025-2026-2');
  assert.equal(result.progress.state, 'complete');
  assert.equal(result.currentByType.courseAssessment, 0);
  assert.equal(result.historyByType.courseAssessment, 1);
  assert(calls.filter((call) => call.form.XNXQDM).every((call) => call.form.XNXQDM === result.term.id));
  assert.equal(JSON.parse(calls[0].form.setting)[1].value, 'PJXNXQ');
});

test('课程评估保留课程号为空的问卷记录，已评与待评使用各自筛选', async () => {
  const { post, calls } = fixture();
  const result = await loadEvaluation(post, { action: 'list', state: 'all', term: '2026-2027-1' });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].courseCode, null);
  assert.equal(result.items[0].evaluated, true);
  assert.equal(result.completeness.scope, 'course-assessment');
  assert.equal(result.term.id, '2026-2027-1');
  assert.deepEqual(calls.filter((call) => call.name === 'cxdwpj').map((call) => call.form.SFPG), ['0', '1']);
  assert(formatResult('evaluation list', result).includes('课程评估：1 项'));
});

test('没有任务不等于全部完成，缺失、负数、布尔统计不能补为零', () => {
  const progress = evaluationProgress({ WPS: '0', YPS: '0', ZS: '0' });
  assert.equal(progress.state, 'no-tasks');
  assert(formatResult('evaluation summary', { term: { id: '2026-2027-1' }, progress }).includes('暂无评教任务'));
  for (const value of [undefined, null, '', false, -1]) assert.throws(() => evaluationProgress({ WPS: value, YPS: 0, ZS: 0 }), { code: 'PAGE_CHANGED' });
  assert.throws(() => evaluationProgress({ WPS: '1', YPS: '1', ZS: '1' }), { code: 'INCOMPLETE_DATA' });
});
