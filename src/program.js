import { failure, number, text } from './config.js';
import { groupTotal, readAllPages } from './api.js';
import { moduleTree } from './module-tree.js';

const listPath = '/jwapp/sys/qxfacx/modules/pyfacxepg/qxpyfacxzl.do';
const detailPrefix = '/jwapp/sys/jwpubapp/modules/pyfa/';

export function normalizePlan(row) {
  return { code: text(row.PYFADM), name: text(row.PYFAMC), grade: text(row.NJDM),
    departmentCode: text(row.DWDM), department: text(row.DWDM_DISPLAY), majorCode: text(row.ZYDM), major: text(row.ZYDM_DISPLAY),
    minimumCredits: number(row.ZSYQXF), durationYears: number(row.XZNX), degree: text(row.XWDM_DISPLAY) };
}

export async function loadPrograms(post, options = {}, sourceUrl) {
  if (options.action !== 'item') {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 12;
    const querySetting = [{ name: 'FAZTDM', caption: '', builder: 'equal', linkOpt: 'AND', value: '99' }];
    const group = await post(listPath, { querySetting: JSON.stringify(querySetting), '*order': '-NJDM,+DWDM,+ZYDM', pageSize: String(pageSize), pageNumber: String(page) }, 'qxpyfacxzl');
    const total = groupTotal(group);
    const expected = Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize));
    if (group.rows.length !== expected || (group.pageNumber != null && Number(group.pageNumber) !== page)) throw failure('INCOMPLETE_DATA', '培养方案分页与返回总数不一致。');
    return { items: group.rows.map(normalizePlan), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total },
      completeness: { complete: true, scope: 'page' }, sourceUrl };
  }
  const form = { PYFADM: options.code };
  const summary = await post(detailPrefix + 'qxpyfacx.do', form, 'qxpyfacx');
  if (!summary.rows.length) throw failure('PLAN_NOT_FOUND', '未找到该培养方案，请从 program list 取得方案代码。');
  if (summary.rows.length !== 1 || String(summary.rows[0].PYFADM) !== options.code) throw failure('PAGE_CHANGED', '培养方案详情与所选方案不一致。');
  const modules = await readAllPages((paging) => post(detailPrefix + 'kzcx.do', { ...form, ...paging }, 'kzcx'));
  const courses = await readAllPages((paging) => post(detailPrefix + 'kzkccx.do', { ...form, ...paging }, 'kzkccx'));
  const guidance = await readAllPages((paging) => post(detailPrefix + 'faxqcx.do', { ...form, '*order': '+JHXNDM,+JHXQDM', ...paging }, 'faxqcx'));
  const normalizedModules = modules.rows.map((row) => ({ code: text(row.KZH), parentCode: text(row.FKZH), name: text(row.KZM), requiredCredits: number(row.ZSXDXF), courseCount: number(row.KCZMS) }));
  const tree = moduleTree(normalizedModules);
  const knownModules = new Set(normalizedModules.map((row) => row.code));
  if (courses.rows.some((row) => !knownModules.has(text(row.KZH)))) throw failure('INCOMPLETE_DATA', '方案课程含有未返回的模块关系。');
  return { plan: normalizePlan(summary.rows[0]), modules: normalizedModules, tree,
    items: courses.rows.map((row) => ({ id: text(row.WID), moduleCode: text(row.KZH), courseCode: text(row.KCH), courseName: text(row.KCM),
      credit: number(row.XF), hours: number(row.XS), recommendedSemester: text(row.XDXQ), plannedTerm: text(row.XNXQ), nature: text(row.KCXZDM_DISPLAY) })),
    guidance: guidance.rows.map((row) => ({ yearCode: text(row.JHXNDM), yearName: text(row.JHXNDM_DISPLAY), semesterCode: text(row.JHXQDM),
      semesterName: text(row.JHXQDM_DISPLAY), semesterNumber: number(row.XDXNXQ), minimumCredits: number(row.ZSXDXF), note: text(row.BZ) })),
    completeness: { complete: true, modules: modules.total, courses: courses.total, guidance: guidance.total }, sourceUrl };
}
