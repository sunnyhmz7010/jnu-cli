import { failure, text } from './config.js';
import { singleRow } from './api.js';

const path = '/jwapp/sys/xjxxbg/modules/xsxxbgsq/cxxsjbxx.do';

export function normalizeProfile(row) {
  const coded = (field) => ({ code: text(row[field]), name: text(row[field + '_DISPLAY']) });
  // 明确列出常用学籍字段，原始档案中的证件、联系地址等不进入结果。
  return { studentId: text(row.XH), name: text(row.XM), department: coded('YXDM'), major: coded('ZYDM'), direction: coded('ZYFXDM'),
    grade: coded('XZNJ'), admissionGrade: coded('RXNJ'), campus: coded('XXXQDM'), className: text(row.BJMC),
    studentCategory: coded('XSLBDM'), trainingLevel: coded('PYCCDM'), registered: coded('SFZJ'), onCampus: coded('SFZX'), enrollmentStatus: coded('XJZTDM') };
}

export async function loadProfile(post, options = {}, sourceUrl) {
  if (!options.studentId) throw failure('PAGE_CHANGED', '缺少当前学生上下文，未发起个人信息查询。');
  const first = singleRow(await post(path, { XH: options.studentId }, 'cxxsjbxx'), 'cxxsjbxx');
  if (!first.WID || text(first.XH) !== options.studentId) throw failure('PAGE_CHANGED', '个人信息记录与当前登录学生不一致。');
  const record = singleRow(await post(path, { WID: String(first.WID) }, 'cxxsjbxx'), 'cxxsjbxx');
  if (record.WID !== first.WID || text(record.XH) !== options.studentId) throw failure('PAGE_CHANGED', '个人信息详情与本人记录不一致。');
  return { profile: normalizeProfile(record), verified: true, sourceUrl };
}
