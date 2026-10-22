import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfile, normalizeProfile } from '../src/profile.js';
import { currentStudentId } from '../src/browser.js';

test('本人档案先按当前学号查询，再使用返回的 WID 读取同一记录', async () => {
  const forms = [];
  const result = await loadProfile(async (path, form, name) => {
    assert.equal(name, 'cxxsjbxx');
    forms.push(form);
    return { rows: [{ WID: 'record-test', XH: 'student-test', XM: '合成学生', BJMC: '合成班级', YXDM: 'department-test', YXDM_DISPLAY: '合成院系',
      SFZJ: '1', SFZJ_DISPLAY: '是', SFZX: '0', SFZX_DISPLAY: '否', SFZJH: 'SENSITIVE_CERTIFICATE', JTDZ: 'SENSITIVE_ADDRESS', DZXX: 'SENSITIVE_MAIL' }] };
  }, { studentId: 'student-test' });
  assert.deepEqual(forms, [{ XH: 'student-test' }, { WID: 'record-test' }]);
  assert.equal(result.profile.className, '合成班级');
  assert.equal(result.profile.department.name, '合成院系');
  assert.equal(result.profile.registered.code, '1');
  assert.equal(result.profile.onCampus.code, '0');
  assert.equal(result.profile.direction.code, null);
  assert(!JSON.stringify(result).includes('SENSITIVE'));
});

test('身份或记录不匹配立即失败，不用学号代替记录 ID', async () => {
  await assert.rejects(loadProfile(async () => ({ rows: [{ WID: 'record', XH: 'other-student' }] }), { studentId: 'student-test' }), { code: 'PAGE_CHANGED' });
  await assert.rejects(loadProfile(async () => ({ rows: [{ XH: 'student-test' }] }), { studentId: 'student-test' }), { code: 'PAGE_CHANGED' });
  let call = 0;
  await assert.rejects(loadProfile(async () => ({ rows: [{ WID: ++call === 1 ? 'record-a' : 'record-b', XH: 'student-test' }] }), { studentId: 'student-test' }), { code: 'PAGE_CHANGED' });
  await assert.rejects(currentStudentId({ evaluate: async () => null }), { code: 'PAGE_CHANGED' });
  assert(!Object.hasOwn(normalizeProfile({ LXDH: 'SENSITIVE' }), 'LXDH'));
});
