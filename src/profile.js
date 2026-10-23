import { failure, text } from './config.js';
import { singleRow } from './api.js';

const path = '/jwapp/sys/xjxxbg/modules/xsxxbgsq/cxxsjbxx.do';

// 按已核对页面的顺序列出 39 个可见字段，不直接输出接口的整份档案。
const pageFields = [
  ['XH', '学号'], ['XM', '姓名'], ['XMPY', '姓名拼音（内招生）'], ['BY3', '英文名（外招生）'],
  ['XBDM', '性别'], ['MZDM', '民族'], ['SYDDM', '生源地'], ['CSRQ', '出生日期'], ['GJDQDM', '国家地区'],
  ['SFZJLXDM', '身份证件类型'], ['SFZJH', '身份证件号'], ['GATQDM', '港澳台侨'], ['CYM', '曾用名'], ['BZ', '备注'],
  ['YXDM', '院系'], ['ZYDM', '专业'], ['ZYFXDM', '专业方向'], ['XZNJ', '现在年级'], ['XXXQDM', '学校校区'], ['BJMC', '班级名称'],
  ['XSLBDM', '学生类别'], ['ZSJDDM', '招生季度'], ['PYCCDM', '培养层次'], ['RXNY', '入学日期'], ['XZ', '学制'],
  ['SFZJ', '是否在籍'], ['SFZX', '是否在校'], ['XJZTDM', '学籍状态'], ['FXXYDM', '辅修学院'], ['FXZYDM', '辅修专业'],
  ['TGXQ', '托管校区'], ['RXNJ', '入学年级'], ['RXZY', '入学专业'], ['KSH', '考生号'], ['YJBYRQ', '预计毕业日期'],
  ['DZXX', '电子信箱'], ['JTDH', '家庭电话'], ['LXDH', '联系电话'], ['JTDZ', '家庭地址']
];

function fieldValue(row, name) {
  const value = row[name] ?? null;
  if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
    throw failure('PAGE_CHANGED', `个人信息字段 ${name} 格式异常，未输出档案。`);
  }
  return value;
}

function visibleFields(row) {
  return pageFields.map(([name, label]) => {
    const value = fieldValue(row, name);
    // 有显示字段时保留其空值；无显示字段时才回退到原值，避免用编码冒充显示名称。
    const displayValue = Object.hasOwn(row, name + '_DISPLAY') ? fieldValue(row, name + '_DISPLAY') : value;
    return { name, label, value, displayValue };
  });
}

export function normalizeProfile(row) {
  const coded = (field) => ({ code: text(row[field]), name: text(row[field + '_DISPLAY']) });
  // 保留既有学籍摘要，完整页面字段仅在 show 时输出。
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
  return { profile: normalizeProfile(record), ...(options.action === 'show' ? { fields: visibleFields(record) } : {}), verified: true, sourceUrl };
}
