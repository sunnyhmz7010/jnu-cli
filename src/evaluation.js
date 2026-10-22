import { failure, text } from './config.js';
import { countValue, readAllPages, singleRow } from './api.js';

const prefix = '/jwapp/sys/wspjyyapp/modules/xspj/';

export function evaluationProgress(row) {
  const pending = countValue(row.WPS, 'WPS');
  const completed = countValue(row.YPS, 'YPS');
  const total = countValue(row.ZS, 'ZS');
  if (pending + completed !== total) throw failure('INCOMPLETE_DATA', '评教待评、已评与总数不一致。');
  return { pending, completed, total, state: total === 0 ? 'no-tasks' : pending === 0 ? 'complete' : 'pending' };
}

export async function loadEvaluation(post, options = {}, sourceUrl) {
  const setting = [
    { name: 'CSDM', value: 'PJGLPJSJ', builder: 'equal', linkOpt: 'AND' },
    { name: 'ZCSDM', value: 'PJXNXQ', builder: 'm_value_equal', linkOpt: 'AND' }
  ];
  const configuration = singleRow(await post(prefix + 'cxxtcs.do', { setting: JSON.stringify(setting) }, 'cxxtcs'), 'cxxtcs');
  if (!configuration.CSZA) throw failure('PAGE_CHANGED', '未取得评教学期配置，未使用课表学期替代。');
  const id = options.term ?? String(configuration.CSZA);
  const term = { id, name: id === configuration.CSZA ? text(configuration.CSZB) : id, configuredId: text(configuration.CSZA) };
  const form = { XNXQDM: id };
  const counts = singleRow(await post(prefix + 'cxxspjwcqk.do', form, 'cxxspjwcqk'), 'cxxspjwcqk');
  const history = singleRow(await post(prefix + 'cxxslsjlsl.do', form, 'cxxslsjlsl'), 'cxxslsjlsl');
  const server = singleRow(await post(prefix + 'cxdqfwqsj.do', {}, 'cxdqfwqsj'), 'cxdqfwqsj');
  const result = { term, progress: evaluationProgress(counts), serverTime: text(server.CURRTIME),
    currentByType: { courseAssessment: countValue(counts.GCXPJSL, 'GCXPJSL'), endOfTerm: countValue(counts.XSPJSL, 'XSPJSL'), classroom: countValue(counts.STPJSL, 'STPJSL') },
    historyByType: { courseAssessment: countValue(history.GCXPJSL, 'GCXPJSL'), endOfTerm: countValue(history.XSPJSL, 'XSPJSL'), classroom: countValue(history.KTPJSL, 'KTPJSL') }, sourceUrl };
  if (options.action !== 'list') return result;
  const states = options.state === 'all' ? ['0', '1'] : options.state === 'completed' ? ['1'] : ['0'];
  const rows = [];
  let pages = 0;
  for (const state of states) {
    const list = await readAllPages((paging) => post(prefix + 'cxdwpj.do', { ...form, PGLXDM: '05', SFPG: state, SFKF: '1', SFFB: '1', ...paging }, 'cxdwpj'));
    if (list.rows.some((row) => String(row.SFPG) !== state || String(row.PGLXDM) !== '05')) throw failure('API_ERROR', '课程评估列表返回了不符合状态或类别条件的记录。');
    rows.push(...list.rows);
    pages += list.pages;
  }
  return { ...result, filters: { state: options.state ?? 'pending', assessmentType: '05' },
    items: rows.map((row) => ({ questionnaireCode: text(row.WJDM), batchCode: text(row.PCDM), questionnaireName: text(row.WJMC),
      courseCode: text(row.KCH), courseName: text(row.KCM), startTime: text(row.KSSJ), endTime: text(row.JSSJ), evaluated: String(row.SFPG) === '1' })),
    completeness: { complete: true, scope: 'course-assessment', records: rows.length, pages } };
}
