import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadProfile, normalizeProfile } from '../src/profile.js';
import { currentStudentId } from '../src/browser.js';

test('本人学籍摘要先按当前学号查询，再使用返回的 WID 读取同一记录', async () => {
  const forms = [];
  const result = await loadProfile(async (path, form, name) => {
    assert.equal(name, 'cxxsjbxx');
    forms.push(form);
    return { rows: [{ WID: 'record-test', XH: 'student-test', XM: '合成学生', BJMC: '合成班级', YXDM: 'department-test', YXDM_DISPLAY: '合成院系',
      SFZJ: '1', SFZJ_DISPLAY: '是', SFZX: '0', SFZX_DISPLAY: '否', SFZJH: 'SENSITIVE_CERTIFICATE', JTDZ: 'SENSITIVE_ADDRESS', DZXX: 'SENSITIVE_MAIL' }] };
  }, { studentId: 'student-test', action: 'status' });
  assert.deepEqual(forms, [{ XH: 'student-test' }, { WID: 'record-test' }]);
  assert.equal(result.profile.className, '合成班级');
  assert.equal(result.profile.department.name, '合成院系');
  assert.equal(result.profile.registered.code, '1');
  assert.equal(result.profile.onCampus.code, '0');
  assert.equal(result.profile.direction.code, null);
  assert(!Object.hasOwn(result, 'fields'));
  assert(!JSON.stringify(result).includes('SENSITIVE'));
});

test('完整输出覆盖已核对页面的全部可见字段，仅使用本人详情中的值', async () => {
  const controls = JSON.parse(await readFile(new URL('./fixtures/profile-page-controls.json', import.meta.url), 'utf8'));
  const visible = controls.filter((field) => !field.hiddenInForm);
  const row = Object.fromEntries(visible.map((field) => [field.name, `synthetic-${field.name}`]));
  Object.assign(row, { WID: 'HIDDEN_RECORD', XH: 'student-test', XM: '合成学生', XBDM: '1', XBDM_DISPLAY: '合成性别',
    SFZJH: 'SYNTHETIC_CERTIFICATE', DZXX: 'student@example.invalid', JTDH: 'SYNTHETIC_HOME_PHONE', LXDH: 'SYNTHETIC_PHONE',
    JTDZ: '合成地址', YHKH: 'HIDDEN_BANK', INTERNAL_FIELD: 'HIDDEN_INTERNAL' });
  let call = 0;
  const result = await loadProfile(async () => ({ rows: [++call === 1 ? { WID: row.WID, XH: row.XH, XM: '首次查询名称' } : row] }),
    { studentId: 'student-test', action: 'show' }, 'https://jw.jnu.edu.cn/jwapp/sys/xjxxbg/');
  assert.equal(call, 2);
  assert.equal(result.verified, true);
  assert.equal(result.sourceUrl, 'https://jw.jnu.edu.cn/jwapp/sys/xjxxbg/');
  assert.equal(result.fields.length, 39);
  assert.deepEqual(result.fields.map(({ name, label }) => ({ name, caption: label })), visible.map(({ name, caption }) => ({ name, caption })));
  for (const field of result.fields) {
    assert.equal(field.value, row[field.name]);
    assert.equal(field.displayValue, row[field.name + '_DISPLAY'] ?? row[field.name]);
  }
  assert.equal(result.profile.name, '合成学生');
  assert(!JSON.stringify(result).includes('HIDDEN_'));
});

test('页面空字段仍输出，保留缺失、空字符串、零值和显示字段的区别', async () => {
  const row = { WID: 'record-test', XH: 'student-test', BY3: '', CYM: null, XZ: 0, SFZX: false,
    XBDM: '1', XBDM_DISPLAY: null, MZDM: 'test-ethnicity', MZDM_DISPLAY: '' };
  const result = await loadProfile(async () => ({ rows: [row] }), { studentId: 'student-test', action: 'show' });
  const fields = Object.fromEntries(result.fields.map((field) => [field.name, field]));
  assert.deepEqual([fields.BY3.value, fields.BY3.displayValue], ['', '']);
  assert.deepEqual([fields.CYM.value, fields.CYM.displayValue], [null, null]);
  assert.deepEqual([fields.ZYFXDM.value, fields.ZYFXDM.displayValue], [null, null]);
  assert.deepEqual([fields.XZ.value, fields.XZ.displayValue], [0, 0]);
  assert.deepEqual([fields.SFZX.value, fields.SFZX.displayValue], [false, false]);
  assert.deepEqual([fields.XBDM.value, fields.XBDM.displayValue], ['1', null]);
  assert.deepEqual([fields.MZDM.value, fields.MZDM.displayValue], ['test-ethnicity', '']);
});

test('页面字段类型异常时拒绝输出，不泄露嵌套原始档案', async () => {
  for (const malformed of [{ DZXX: { hidden: 'DO_NOT_LEAK' } }, { XBDM_DISPLAY: ['DO_NOT_LEAK'] }]) {
    await assert.rejects(loadProfile(async () => ({ rows: [{ WID: 'record-test', XH: 'student-test', ...malformed }] }),
      { studentId: 'student-test', action: 'show' }), (error) => {
      assert.equal(error.code, 'PAGE_CHANGED');
      assert(!error.message.includes('DO_NOT_LEAK'));
      return true;
    });
  }
});

test('身份或记录不匹配立即失败，不用学号代替记录 ID', async () => {
  await assert.rejects(loadProfile(async () => ({ rows: [{ WID: 'record', XH: 'other-student' }] }), { studentId: 'student-test' }), { code: 'PAGE_CHANGED' });
  await assert.rejects(loadProfile(async () => ({ rows: [{ XH: 'student-test' }] }), { studentId: 'student-test' }), { code: 'PAGE_CHANGED' });
  let call = 0;
  await assert.rejects(loadProfile(async () => ({ rows: [{ WID: ++call === 1 ? 'record-a' : 'record-b', XH: 'student-test' }] }), { studentId: 'student-test' }), { code: 'PAGE_CHANGED' });
  await assert.rejects(currentStudentId({ evaluate: async () => null }), { code: 'PAGE_CHANGED' });
  assert(!Object.hasOwn(normalizeProfile({ LXDH: 'SENSITIVE' }), 'LXDH'));
});

test('完整信息也必须先验证本人身份和唯一记录', async () => {
  const options = { studentId: 'student-test', action: 'show' };
  let calls = 0;
  await assert.rejects(loadProfile(async () => { calls += 1; return { rows: [] }; }, { action: 'show' }), { code: 'PAGE_CHANGED' });
  assert.equal(calls, 0);
  for (const rows of [[], [{ WID: 'a', XH: options.studentId }, { WID: 'b', XH: options.studentId }]]) {
    await assert.rejects(loadProfile(async () => ({ rows }), options), { code: 'PAGE_CHANGED' });
  }
  let call = 0;
  await assert.rejects(loadProfile(async () => ({ rows: [{ WID: 'record-test', XH: ++call === 1 ? options.studentId : 'other-student',
    SFZJH: 'DO_NOT_LEAK' }] }), options), { code: 'PAGE_CHANGED' });
});
