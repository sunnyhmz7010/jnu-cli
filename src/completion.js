import { failure, number, text } from './config.js';
import { readAllPages, singleRow } from './api.js';
import { moduleTree } from './module-tree.js';

const prefix = '/jwapp/sys/xywccx/modules/xywccx/';
const states = { '0': 'failed', '1': 'passed', '2': 'unread', '3': 'pending', '4': 'selected' };
const labels = { '0': '未通过', '1': '通过', '2': '未修读', '3': '未修读待选', '4': '已选课' };

export function mergeCompletionCourses(stored, current) {
  // 只从已计算结果侧排除同课程号；当前选课中同课程号的多行必须保留。
  const currentCodes = new Set(current.map((row) => text(row.KCH)).filter(Boolean));
  return [...stored.filter((row) => !currentCodes.has(text(row.KCH))).map((row) => ({ ...row, source: 'stored-result' })),
    ...current.map((row) => ({ ...row, source: 'current-selection' }))];
}

export function normalizeCompletionCourse(row, context) {
  const statusCode = text(row.SFTG);
  const score = text(row.CJ);
  return { planCode: context.planCode, moduleCode: context.moduleCode, source: row.source,
    courseCode: text(row.KCH), courseName: text(row.KCM), credit: number(row.XF), hours: number(row.XS),
    statusCode, state: states[statusCode] ?? 'unknown', status: text(row.SFTG_DISPLAY) ?? labels[statusCode] ?? null,
    selected: statusCode === '4', score, numericScore: score !== null && /^-?\d+(?:\.\d+)?$/.test(score) ? Number(score) : null,
    termId: text(row.XNXQDM), nature: text(row.KCXZDM_DISPLAY) };
}

export async function loadCompletion(post, options = {}, sourceUrl) {
  if (!options.studentId) throw failure('PAGE_CHANGED', '缺少当前学生上下文，未发起学业完成查询。');
  const own = { XH: options.studentId };
  const plans = await readAllPages((paging) => post(prefix + 'grpyfacx.do', { ...own, ...paging }, 'grpyfacx'));
  const cached = await readAllPages((paging) => post(prefix + 'cxxsscfa.do', { ...own, SCLBDM: '04', '*order': '-CZSJ', ...paging }, 'cxxsscfa'));
  const knownPlans = new Set(plans.rows.map((row) => text(row.PYFADM)).filter(Boolean));
  if (options.plan && !knownPlans.has(options.plan)) throw failure('PLAN_NOT_FOUND', '该方案不属于当前学生的个人方案。');
  const latest = cached.rows.find((row) => knownPlans.has(text(row.PYFADM)) && (!options.plan || text(row.PYFADM) === options.plan));
  const plan = plans.rows.find((row) => text(row.PYFADM) === (options.plan ?? text(latest?.PYFADM))) ?? plans.rows[0];
  const base = { plan: plan ? { code: text(plan.PYFADM), name: text(plan.PYFAMC) } : null,
    plans: plans.rows.map((row) => ({ code: text(row.PYFADM), name: text(row.PYFAMC) })), sourceUrl };
  if (!latest) return { ...base, calculation: { state: 'not-calculated', calculatedAt: null }, summary: null,
    ...(options.action === 'modules' || options.action === 'courses' ? { items: [] } : {}), reason: plan ? 'no-stored-result' : 'no-personal-plan' };
  const context = { ...own, PYFADM: text(plan.PYFADM), BYNJDM: text(latest.BYNJDM) ?? '-', SCLBDM: '04' };
  const currentTerm = singleRow(await post(prefix + 'cxdqxnxq.do', {}, 'cxdqxnxq'), 'cxdqxnxq');
  const selectionTerm = singleRow(await post(prefix + 'cxxkxnxq.do', {}, 'cxxkxnxq'), 'cxxkxnxq');
  if (!currentTerm.DM || !selectionTerm.DM) throw failure('PAGE_CHANGED', '学业完成应用未返回当前学期或选课学期。');
  const summary = singleRow(await post(prefix + 'cxscfa.do', context, 'cxscfa'), 'cxscfa');
  if (text(summary.PYFADM) !== context.PYFADM) throw failure('PAGE_CHANGED', '学业完成摘要与个人方案不一致。');
  const termContext = { ...context, XNXQDM: String(currentTerm.DM) };
  const selected = singleRow(await post(prefix + 'cxfakzyxxfgj.do', termContext, 'cxfakzyxxfgj'), 'cxfakzyxxfgj');
  const result = { ...base, calculation: { state: 'stored-result', calculatedAt: text(summary.CZSJ) ?? text(latest.CZSJ) },
    currentTerm: { id: text(currentTerm.DM), name: text(currentTerm.MC) }, selectionTerm: { id: text(selectionTerm.DM), name: text(selectionTerm.MC) },
    summary: { requiredCredits: number(summary.YQXF), completedCredits: number(summary.WCXF),
      storedSelectedCredits: number(summary.XKXF), currentSelectedCredits: number(selected.XKXF) } };
  if (options.action !== 'modules' && options.action !== 'courses') return result;
  const modules = await readAllPages((paging) => post(prefix + 'cxscfakz.do', { ...termContext, ...paging }, 'cxscfakz'));
  const items = modules.rows.map((row) => ({ code: text(row.KZH), parentCode: text(row.FKZH), name: text(row.KZM), typeCode: text(row.KZLXDM),
    requiredCredits: number(row.YQXF), completedCredits: number(row.WCXF), storedSelectedCredits: number(row.XKXF),
    statusCode: text(row.SFTG), passed: String(row.SFTG) === '1' ? true : String(row.SFTG) === '0' ? false : null }));
  const tree = moduleTree(items);
  if (options.action === 'modules') return { ...result, items, tree, completeness: { complete: true, modules: modules.total, pages: modules.pages } };
  const module = items.find((row) => row.code === options.module);
  if (!module) throw failure('MODULE_NOT_FOUND', '未找到所选个人方案中的模块。');
  const courseContext = { ...context, KZH: module.code };
  const stored = await readAllPages((paging) => post(prefix + 'cxscfakzkc.do', { ...courseContext, '*order': '+SFTG,+KCH', ...paging }, 'cxscfakzkc'));
  const current = await readAllPages((paging) => post(prefix + 'cxsxkqk.do', { ...courseContext, XNXQDM: String(selectionTerm.DM), ...paging }, 'cxsxkqk'));
  const merged = mergeCompletionCourses(stored.rows, current.rows).map((row) => normalizeCompletionCourse(row, { planCode: context.PYFADM, moduleCode: module.code }));
  const filtered = options.state && options.state !== 'all' ? merged.filter((row) => row.state === options.state) : merged;
  return { ...result, module, items: filtered, filters: { module: module.code, state: options.state ?? 'all' },
    completeness: { complete: true, storedRows: stored.total, currentRows: current.total, mergedRows: merged.length, returnedRows: filtered.length,
      storedPages: stored.pages, currentPages: current.pages } };
}
