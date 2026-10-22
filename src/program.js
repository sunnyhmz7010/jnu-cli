import { failure, number, text } from './config.js';
import { groupTotal, readAllPages } from './api.js';
import { moduleTree } from './module-tree.js';

const listPath = '/jwapp/sys/qxfacx/modules/pyfacxepg/qxpyfacxzl.do';
const detailPrefix = '/jwapp/sys/jwpubapp/modules/pyfa/';

export function normalizePlan(row) {
  return { id: text(row.WID), planCode: text(row.PYFADM), title: text(row.PYFAMC), code: text(row.PYFADM), name: text(row.PYFAMC), grade: text(row.NJDM),
    departmentCode: text(row.DWDM), department: text(row.DWDM_DISPLAY), majorCode: text(row.ZYDM), major: text(row.ZYDM_DISPLAY),
    direction: text(row.ZYFXDM_DISPLAY), minimumCredits: number(row.ZSYQXF), durationYears: number(row.XZNX), degree: text(row.XWDM_DISPLAY),
    startYear: text(row.KSXNDM_DISPLAY), startSemester: text(row.KSXQDM_DISPLAY), status: text(row.FAZTDM),
    published: text(row.SFFB) === null ? null : ['1', '是', 'true'].includes(String(row.SFFB)) };
}

export async function loadPrograms(post, options = {}, sourceUrl) {
  if (options.action !== 'item') {
    const page = options.page ?? 1;
    const pageSize = options.limit ?? 10;
    const querySetting = [{ name: 'FAZTDM', caption: '', builder: 'equal', linkOpt: 'AND', value: '99' }];
    for (const [key, name, builder] of [['keyword', 'PYFAMC', 'include'], ['grade', 'NJDM', 'equal'], ['department', 'DWDM_DISPLAY', 'include'], ['major', 'ZYDM_DISPLAY', 'include']]) {
      if (options[key]) querySetting.push({ name, caption: '', builder, linkOpt: 'AND', value: key === 'grade' ? options[key].replace(/级$/, '') : options[key] });
    }
    const group = await post(listPath, { querySetting: JSON.stringify(querySetting), '*order': '-NJDM,+DWDM,+ZYDM', pageSize: String(pageSize), pageNumber: String(page) }, 'qxpyfacxzl');
    const total = groupTotal(group);
    const expected = Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize));
    if (group.rows.length !== expected || (group.pageNumber != null && Number(group.pageNumber) !== page)) throw failure('INCOMPLETE_DATA', '培养方案分页与返回总数不一致。');
    if (options.action === 'status') return { loggedIn: true, reason: 'ehall-program-page', total, sourceUrl };
    const filters = Object.fromEntries(['keyword', 'grade', 'department', 'major'].filter((key) => options[key]).map((key) => [key, options[key]]));
    return { total, page, pageSize, filters, items: group.rows.map(normalizePlan), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total },
      completeness: { complete: true, scope: 'page' }, sourceUrl };
  }
  const form = { PYFADM: options.target };
  let summary = await post(detailPrefix + 'qxpyfacx.do', form, 'qxpyfacx');
  if (!summary.rows.length) {
    // 列表的 WID 与方案代码不同；先核实记录身份，再用真实方案代码访问共享详情。
    const lookup = await post(listPath, { querySetting: JSON.stringify([
      { name: 'FAZTDM', caption: '', builder: 'equal', linkOpt: 'AND', value: '99' },
      { name: 'WID', caption: '', builder: 'equal', linkOpt: 'AND', value: options.target }
    ]), pageSize: '2', pageNumber: '1' }, 'qxpyfacxzl');
    const total = groupTotal(lookup);
    if (total === 0 && lookup.rows.length === 0) throw failure('PROGRAM_NOT_FOUND', '未找到该培养方案，请从 program list 取得 id 或 planCode。');
    if (total !== 1 || lookup.rows.length !== 1 || text(lookup.rows[0].WID) !== options.target || !text(lookup.rows[0].PYFADM)) throw failure('PAGE_CHANGED', '培养方案记录与所选 id 不一致。');
    form.PYFADM = text(lookup.rows[0].PYFADM);
    summary = await post(detailPrefix + 'qxpyfacx.do', form, 'qxpyfacx');
  }
  if (summary.rows.length !== 1 || String(summary.rows[0].PYFADM) !== form.PYFADM) throw failure('PAGE_CHANGED', '培养方案详情与所选方案不一致。');
  const modules = await readAllPages((paging) => post(detailPrefix + 'kzcx.do', { ...form, ...paging }, 'kzcx'));
  const courses = await readAllPages((paging) => post(detailPrefix + 'kzkccx.do', { ...form, ...paging }, 'kzkccx'));
  const guidance = await readAllPages((paging) => post(detailPrefix + 'faxqcx.do', { ...form, '*order': '+JHXNDM,+JHXQDM', ...paging }, 'faxqcx'));
  const normalizedModules = modules.rows.map((row) => ({ id: text(row.WID), groupCode: text(row.KZH), parentGroupCode: text(row.FKZH),
    code: text(row.KZH), parentCode: text(row.FKZH), name: text(row.KZM), type: text(row.KZLXDM_DISPLAY), category: text(row.KCLBDM_DISPLAY), courseNature: text(row.KCXZDM_DISPLAY),
    requiredCredits: number(row.ZSXDXF), totalCredits: number(row.KCZXF), totalHours: number(row.KCZXS), courseCount: number(row.KCZMS), order: number(row.PX) }));
  const tree = moduleTree(normalizedModules);
  const knownModules = new Set(normalizedModules.map((row) => row.code));
  if (courses.rows.some((row) => !knownModules.has(text(row.KZH)))) throw failure('INCOMPLETE_DATA', '方案课程含有未返回的模块关系。');
  const items = courses.rows.map((row) => ({ id: text(row.WID), moduleCode: text(row.KZH), groupCode: text(row.KZH), courseCode: text(row.KCH), courseName: text(row.KCM), credits: number(row.XF), termId: text(row.XNXQ),
      credit: number(row.XF), hours: number(row.XS), recommendedSemester: number(row.XDXQ), plannedTerm: text(row.XNXQ), termName: text(row.XNXQ_DISPLAY),
      courseNature: text(row.KCXZDM_DISPLAY), nature: text(row.KCXZDM_DISPLAY), examType: text(row.KSLXDM_DISPLAY), order: number(row.PX) })),
    plan = normalizePlan(summary.rows[0]);
  const row = summary.rows[0];
  const split = (value) => String(value ?? '').split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
  const detail = { trainingObjectives: text(row.PYMB), graduationRequirements: text(row.XDYQ), mainSubjects: split(row.ZGXK), coreCourses: split(row.ZGKC),
    notes: [row.KZZD1, row.KZZD2, row.KZZD3, row.KZZD4, row.KZZD5].map(text).filter(Boolean), features: text(row.FATS) };
  return { summary: plan, detail, plan, modules: normalizedModules, tree, courses: items, items,
    guidance: guidance.rows.map((row) => ({ yearCode: text(row.JHXNDM), yearName: text(row.JHXNDM_DISPLAY), semesterCode: text(row.JHXQDM),
      semesterName: text(row.JHXQDM_DISPLAY), semesterNumber: number(row.XDXNXQ), minimumCredits: number(row.ZSXDXF), note: text(row.BZ) })),
    completeness: { complete: true, modules: modules.total, courses: courses.total, guidance: guidance.total }, sourceUrl };
}
