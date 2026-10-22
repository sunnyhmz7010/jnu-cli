import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPrograms } from '../src/program.js';
import { moduleTree } from '../src/module-tree.js';

test('培养方案按页读取且标明页面范围，不默认扫描全校方案', async () => {
  const result = await loadPrograms(async (path, form, name) => {
    assert(path.includes('/qxfacx/modules/pyfacxepg/'));
    assert.equal(name, 'qxpyfacxzl');
    assert.equal(form.pageNumber, '2');
    assert.equal(form.pageSize, '10');
    assert.equal(JSON.parse(form.querySetting)[0].value, '99');
    return { totalSize: 12, pageNumber: 2, rows: [{ PYFADM: 'plan-a', PYFAMC: '合成方案 A', ZSYQXF: '160' }, { PYFADM: 'plan-b', PYFAMC: '合成方案 B' }] };
  }, { action: 'list', page: 2 });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].minimumCredits, 160);
  assert.equal(result.pagination.total, 12);
  assert.equal(result.total, 12);
  assert.equal(result.pageSize, 10);
  assert.equal(result.items[0].planCode, 'plan-a');
  assert.equal(result.items[0].title, '合成方案 A');
  assert.equal(result.pagination.hasMore, false);
  assert.equal(result.completeness.scope, 'page');
});

test('方案详情使用共享服务并完整读取课程分页和指导计划', async () => {
  const courses = Array.from({ length: 51 }, (_, index) => ({ WID: `relation-${index}`, KZH: 'leaf', KCH: `TEST${index}`, KCM: '合成课程', XF: '2', XS: null }));
  const requests = [];
  const result = await loadPrograms(async (path, form, name) => {
    assert(path.startsWith('/jwapp/sys/jwpubapp/modules/pyfa/'));
    assert.equal(form.PYFADM, 'plan-test');
    requests.push({ form, name });
    if (name === 'qxpyfacx') return { rows: [{ PYFADM: 'plan-test', PYFAMC: '合成方案', ZSYQXF: '160' }] };
    if (name === 'kzcx') return { totalSize: 2, rows: [{ KZH: 'root', FKZH: null, KZM: '合成根模块' }, { KZH: 'leaf', FKZH: 'root', KZM: '合成叶模块' }] };
    if (name === 'faxqcx') return { totalSize: 1, rows: [{ JHXNDM: '1', JHXQDM: '2', XDXNXQ: '2', BZ: '合成指导计划' }] };
    const start = (Number(form.pageNumber) - 1) * Number(form.pageSize);
    return { totalSize: courses.length, rows: courses.slice(start, start + Number(form.pageSize)) };
  }, { action: 'item', target: 'plan-test' });
  assert.equal(result.items.length, 51);
  assert.equal(result.items[0].hours, null);
  assert.equal(result.tree[0].children[0].code, 'leaf');
  assert.equal(result.guidance[0].semesterNumber, 2);
  assert.equal(result.summary.planCode, 'plan-test');
  assert.equal(result.courses[0].groupCode, 'leaf');
  assert.equal(result.courses[0].credits, 2);
  assert.equal(requests.filter((call) => call.name === 'kzkccx').length, 2);
});

test('分页截断、错配方案和损坏模块树不能输出完整标记', async () => {
  await assert.rejects(loadPrograms(async () => ({ totalSize: 20, rows: [] }), { action: 'list' }), { code: 'INCOMPLETE_DATA' });
  await assert.rejects(loadPrograms(async () => ({ totalSize: 0, rows: [] }), { action: 'item', target: 'missing' }), { code: 'PROGRAM_NOT_FOUND' });
  await assert.rejects(loadPrograms(async () => ({ rows: [{ PYFADM: 'other' }] }), { action: 'item', target: 'test' }), { code: 'PAGE_CHANGED' });
  assert.throws(() => moduleTree([{ code: 'a', parentCode: 'b' }, { code: 'b', parentCode: 'a' }]), { code: 'INCOMPLETE_DATA' });
  assert.throws(() => moduleTree([{ code: 'a' }, { code: 'a' }]), { code: 'INCOMPLETE_DATA' });
});

test('培养方案筛选与 --limit 按契约传给同一已发布列表接口', async () => {
  const result = await loadPrograms(async (path, form) => {
    const conditions = Object.fromEntries(JSON.parse(form.querySetting).map((item) => [item.name, { builder: item.builder, value: item.value }]));
    assert.equal(form.pageSize, '5');
    assert.deepEqual(conditions, {
      FAZTDM: { builder: 'equal', value: '99' }, PYFAMC: { builder: 'include', value: '合成' }, NJDM: { builder: 'equal', value: '2025' },
      DWDM_DISPLAY: { builder: 'include', value: '合成学院' }, ZYDM_DISPLAY: { builder: 'include', value: '合成专业' }
    });
    return { totalSize: 0, rows: [] };
  }, { action: 'list', limit: 5, keyword: '合成', grade: '2025级', department: '合成学院', major: '合成专业' });
  assert.deepEqual(result.filters, { keyword: '合成', grade: '2025级', department: '合成学院', major: '合成专业' });
  assert.equal(result.page, 1);
  assert.equal(result.total, 0);
});

test('方案详情接受列表 id，核对身份后转换为方案代码', async () => {
  const result = await loadPrograms(async (path, form, name) => {
    if (name === 'qxpyfacx') return { rows: form.PYFADM === 'record-id' ? [] : [{ WID: 'record-id', PYFADM: 'plan-code', PYFAMC: '合成方案' }] };
    if (name === 'qxpyfacxzl') {
      assert.equal(JSON.parse(form.querySetting)[1].value, 'record-id');
      return { totalSize: 1, rows: [{ WID: 'record-id', PYFADM: 'plan-code' }] };
    }
    assert.equal(form.PYFADM, 'plan-code');
    return { totalSize: 0, rows: [] };
  }, { action: 'item', target: 'record-id' });
  assert.equal(result.summary.id, 'record-id');
  assert.equal(result.summary.planCode, 'plan-code');
  assert.deepEqual(result.courses, []);
  await assert.rejects(loadPrograms(async (path, form, name) => name === 'qxpyfacx' ? { rows: [] } : { totalSize: 1, rows: [{ WID: 'other', PYFADM: 'plan-code' }] },
    { action: 'item', target: 'record-id' }), { code: 'PAGE_CHANGED' });
});
