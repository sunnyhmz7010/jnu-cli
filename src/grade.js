import { failure, number, text } from './config.js';
import { readAllPages } from './api.js';

const path = '/jwapp/sys/cjcx/modules/cjcx/xscjcx.do';
const order = '-XNXQDM,-KCH,-KXH';

export function normalizeGrade(row) {
  return { termId: text(row.XNXQDM), termName: text(row.XNXQDM_DISPLAY),
    courseCode: text(row.XSKCH) ?? text(row.KCH), courseName: text(row.XSKCM) ?? text(row.KCM),
    courseNatureCode: text(row.KCXZDM), courseNature: text(row.KCXZDM_DISPLAY),
    credit: number(row.XF), score: text(row.XSZCJMC) ?? text(row.DJCJMC) ?? text(row.ZCJ),
    numericScore: number(row.ZCJ), gradePoint: number(row.XFJD), earnedCredit: number(row.QDXF),
    section: text(row.KXH), examDate: text(row.SJKSRQ) ?? text(row.KSSJ),
    valid: row.SFYX === undefined ? null : String(row.SFYX) === '1', rawId: text(row.WID) ?? text(row.JXBID) };
}

export async function loadGrades(post, options = {}, sourceUrl) {
  const querySetting = [
    { name: 'SFYX', value: '1', linkOpt: 'AND', builder: 'm_value_equal' },
    { name: 'SHOWMAXCJ', value: 0, linkOpt: 'AND', builder: 'equal' },
    { name: '*order', value: order, linkOpt: 'AND', builder: 'm_value_equal' }
  ];
  const result = await readAllPages((paging) => post(path, { querySetting: JSON.stringify(querySetting), '*order': order, ...paging }, 'xscjcx'));
  if (result.rows.some((row) => row.SFYX !== undefined && String(row.SFYX) !== '1')) throw failure('API_ERROR', '成绩查询返回了不符合有效成绩条件的记录。');
  let items = result.rows.map(normalizeGrade);
  if (options.term) items = items.filter((item) => item.termId === options.term);
  const terms = new Map();
  for (const item of items) {
    if (!terms.has(item.termId)) terms.set(item.termId, { termId: item.termId, termName: item.termName, itemCount: 0 });
    terms.get(item.termId).itemCount += 1;
  }
  return { items, terms: [...terms.values()], filters: { term: options.term ?? null, validOnly: true, highestOnly: false },
    completeness: { complete: true, allTermRecords: result.total, pages: result.pages },
    gpa: null, gpaNote: '尚未核实累计或学期 GPA 规则，仅展示系统给出的单科绩点。', sourceUrl };
}
