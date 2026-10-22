import { failure, text } from './config.js';
import { groupTotal, singleRow } from './api.js';

const prefix = '/jwapp/sys/studentWdksapApp/';

export function normalizeExam(row) {
  return { examCode: text(row.KSDM), examName: text(row.KSMC), courseCode: text(row.KCH), courseName: text(row.KCM),
    termId: text(row.XNXQDM), date: text(row.KSRQ), timeDisplay: text(row.KSSJMS), room: text(row.JASMC), seat: text(row.ZWH),
    needsArrangement: text(row.SFXYAPKS), timeArranged: text(row.SFAPSJ), taskState: text(row.KSRWZT), timePublished: text(row.SFFBSJ) };
}

export async function loadExams(post, options = {}, sourceUrl) {
  const current = singleRow(await post(prefix + 'modules/wdksap/dqxnxq.do', {}, 'dqxnxq'), 'dqxnxq');
  if (!current.DM) throw failure('PAGE_CHANGED', '考试应用没有返回当前学期。');
  const term = { id: options.term ?? current.DM, name: options.term && options.term !== current.DM ? options.term : text(current.MC) };
  const group = await post(prefix + 'WdksapController/cxxsksap.do', {
    requestParamStr: JSON.stringify({ XNXQDM: term.id, '*order': '-KSRQ,-KSSJMS' })
  }, 'cxxsksap');
  // 此接口按学期一次返回数组，已核对的 totalSize=-1 不是分页总数。
  if (group.totalSize !== -1 && group.totalSize !== '-1' && groupTotal(group) !== group.rows.length) throw failure('INCOMPLETE_DATA', '考试安排记录数与接口返回总数不一致。');
  const server = singleRow(await post(prefix + 'modules/wdksap/cxdqfwqsj.do', {}, 'cxdqfwqsj'), 'cxdqfwqsj');
  return { term, serverTime: text(server.CURRTIME), items: group.rows.map(normalizeExam),
    conflictCheck: { status: 'not-checked', hasConflicts: null },
    completeness: { complete: true, scope: 'term', records: group.rows.length }, sourceUrl };
}
