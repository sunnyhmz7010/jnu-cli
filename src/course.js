import { failure, number, shanghaiDate, text } from './config.js';
import { groupTotal, readAllPages } from './api.js';

const prefix = '/jwapp/sys/wdkb/modules/';

export function activeInWeek(row, week) {
  if (week === null) return true;
  if (typeof row.SKZC !== 'string' || !/^[01]+$/.test(row.SKZC)) throw failure('PAGE_CHANGED', '课表缺少有效周次位图，未猜测周次。');
  return row.SKZC[week - 1] === '1';
}

export function mergeAdjustments(base, changes) {
  if (base.some((row) => typeof row.SKZC !== 'string' || !/^[01]+$/.test(row.SKZC))) throw failure('PAGE_CHANGED', '排课记录缺少有效周次位图。');
  const rows = base.map((row) => ({ ...row }));
  for (const change of changes) {
    if (!change.KBID || typeof change.SKZC !== 'string' || !/^[01]+$/.test(change.SKZC)) throw failure('PAGE_CHANGED', '调课记录缺少原排课标识或周次位图。');
    const original = base.find((row) => row.KBID === change.KBID);
    for (const row of rows.filter((item) => !item.adjusted && item.KBID === change.KBID)) {
      if (typeof row.SKZC !== 'string' || !/^[01]+$/.test(row.SKZC)) throw failure('PAGE_CHANGED', '原课表缺少周次位图。');
      row.SKZC = [...row.SKZC].map((bit, index) => change.SKZC[index] === '1' ? '0' : bit).join('');
    }
    if (String(change.TKLXDM) === '02') continue;
    if (!/^[01]+$/.test(change.XSKZC ?? '') || !change.XSKXQ || !change.XKSJC || !change.XJSJC) throw failure('PAGE_CHANGED', '调课记录缺少新安排，未输出不完整课表。');
    rows.push({ ...original, ...change, SKZC: change.XSKZC, ZCMC: change.XZCMC,
      SKXQ: change.XSKXQ, KSJC: change.XKSJC, JSJC: change.XJSJC,
      JASMC: change.XJASMC, SKJS: text(change.XSKJS) ?? text(change.YSKJS) ?? original?.SKJS,
      // 调课响应没有新校区字段，不能沿用原教室的校区。
      XXXQDM: null, XXXQDM_DISPLAY: null, adjusted: true });
  }
  return rows.filter((row) => !/^[0]+$/.test(row.SKZC)).map((row) => ({ ...row, ZCMC: maskDescription(row.SKZC) }));
}

function maskDescription(mask) {
  const ranges = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== '1') continue;
    const start = index + 1;
    while (mask[index + 1] === '1') index += 1;
    ranges.push(start === index + 1 ? `${start}周` : `${start}-${index + 1}周`);
  }
  return ranges.join(',');
}

export function normalizeCourse(row) {
  return { courseCode: text(row.KCH), courseName: text(row.KCM), section: text(row.KXH),
    teachers: String(row.SKJS ?? '').split(/[,，]/).map((item) => item.trim()).filter(Boolean),
    weeksText: text(row.ZCMC), weekMask: text(row.SKZC), weekday: number(row.SKXQ),
    startSection: number(row.KSJC), endSection: number(row.JSJC), location: text(row.JASMC),
    campus: text(row.XXXQDM), campusName: text(row.XXXQDM_DISPLAY), scheduleId: text(row.KBID),
    rawId: text(row.JXBID), adjusted: row.adjusted === true || String(row.ISTK) === '1' };
}

export async function loadCourses(post, options = {}, sourceUrl) {
  const current = (await post(prefix + 'jshkcb/dqxnxq.do', {}, 'dqxnxq')).rows[0];
  if (!current?.DM) throw failure('PAGE_CHANGED', '未取得当前学期。');
  const id = options.term ?? current.DM;
  const [start, end, semester] = id.split('-');
  const year = `${start}-${end}`;
  const date = options.date ?? shanghaiDate();
  const term = { id, name: id === current.DM ? current.MC : id, year, semester, currentWeek: null };
  const weekGroup = await post(prefix + 'jshkcb/dqzc.do', { XN: year, XQ: semester, RQ: date }, 'dqzc');
  term.currentWeek = number(weekGroup.rows[0]?.ZC);
  if (term.currentWeek !== null && term.currentWeek <= 0) term.currentWeek = null;
  if (options.action === 'status') return { loggedIn: true, reason: 'ehall-course-page', term, sourceUrl };
  const list = await readAllPages((paging) => post(prefix + 'xskcb/xskcb.do', { XNXQDM: id, ...paging }, 'xskcb'));
  const changes = await post(prefix + 'xskcb/xsdkkc.do', { XNXQDM: id }, 'xsdkkc');
  const unlisted = await post(prefix + 'xskcb/xswpkc.do', { XNXQDM: id }, 'xswpkc');
  for (const group of [changes, unlisted]) {
    if (groupTotal(group) !== group.rows.length) throw failure('INCOMPLETE_DATA', '调课或未排课列表不完整，未输出完整课表标记。');
  }
  const allRows = mergeAdjustments(list.rows, changes.rows);
  const week = options.week ?? term.currentWeek;
  const weekday = options.weekday ?? (options.today ? new Date(`${date}T00:00:00Z`).getUTCDay() || 7 : undefined);
  const noTeachingWeek = options.today && week === null;
  const items = noTeachingWeek ? [] : allRows.filter((row) => activeInWeek(row, week) && (!weekday || Number(row.SKXQ) === weekday)).map(normalizeCourse);
  items.sort((a, b) => a.weekday - b.weekday || a.startSection - b.startSection || String(a.courseCode).localeCompare(String(b.courseCode)));
  return { term, ...(options.today ? { date, weekday, currentWeek: term.currentWeek } : {}),
    filters: { ...(options.term ? { term: options.term } : {}), ...(options.week || (options.today && week !== null) ? { week } : {}), ...(weekday ? { weekday } : {}) },
    items, extraItems: { unlisted: unlisted.rows.map(normalizeCourse) },
    completeness: { complete: true, scheduledRows: list.total, pages: list.pages, adjustmentRows: changes.rows.length },
    ...(noTeachingWeek ? { reason: 'no-teaching-week' } : {}), sourceUrl };
}
