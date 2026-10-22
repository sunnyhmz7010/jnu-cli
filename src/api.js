import { ORIGIN, failure, isLoginUrl } from './config.js';

export function requireGroup(data, name) {
  if (String(data?.code) !== '0') {
    const error = failure('API_ERROR', '教务接口返回业务错误，未生成查询结果。');
    error.details = { group: name, businessCode: typeof data?.code === 'string' || typeof data?.code === 'number' ? data.code : null };
    throw error;
  }
  const group = data.datas?.[name];
  if (!Array.isArray(group?.rows)) throw failure('PAGE_CHANGED', `接口 ${name} 未返回业务列表，可能是字段元数据或接口变化。`);
  if (group.extParams?.code !== undefined && String(group.extParams.code) !== '1') throw failure('API_ERROR', `接口 ${name} 的组内业务状态异常。`);
  return group;
}

export async function postGroup(page, path, form, name) {
  if (!path.startsWith('/jwapp/sys/')) throw failure('INVALID_ARGUMENT', '查询路径不属于教务应用。');
  let result;
  try {
    result = await page.evaluate(async ({ path, form }) => {
      const response = await fetch(path, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(form).toString(), signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      let data = null;
      try { data = JSON.parse(body); } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
      return { status: response.status, url: response.url, data };
    }, { path, form });
  } catch {
    throw failure('NETWORK_REQUIRED', '无法完成教务查询，请检查网络或重新确认登录状态。');
  }
  if (isLoginUrl(result.url) || [401, 302].includes(result.status)) throw failure('LOGIN_REQUIRED', '暨大登录已失效。', '运行 jnu-cli auth login 完成正常登录。');
  if (result.status === 403) throw failure('PERMISSION_DENIED', '当前本科身份无权访问该查询。');
  if (result.status === 429) throw failure('RATE_LIMITED', '教务系统限制请求频率，请稍后手动重试。');
  if (new URL(result.url).origin !== ORIGIN || result.status >= 500) throw failure('NETWORK_REQUIRED', '教务服务暂不可用。');
  if (result.status !== 200 || !result.data) throw failure('PAGE_CHANGED', '教务接口未返回预期的 JSON 数据。');
  return requireGroup(result.data, name);
}

export function groupTotal(group) {
  const total = typeof group.totalSize === 'number' || (typeof group.totalSize === 'string' && /^\d+$/.test(group.totalSize)) ? Number(group.totalSize) : NaN;
  if (!Number.isSafeInteger(total) || total < 0) throw failure('INCOMPLETE_DATA', '查询总条数缺失或格式异常。');
  return total;
}

export function singleRow(group, name) {
  if (group.rows.length !== 1) throw failure('PAGE_CHANGED', `接口 ${name} 未返回唯一记录。`);
  return group.rows[0];
}

export function countValue(value, name) {
  const result = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)) ? Number(value) : NaN;
  if (!Number.isSafeInteger(result) || result < 0) throw failure('PAGE_CHANGED', `统计字段 ${name} 缺失或格式异常。`);
  return result;
}

// 不使用学校偶尔返回 0 的 totalPage，也不把第一页或重复页当成完整结果。
export async function readAllPages(fetchPage, pageSize = 50) {
  const rows = [];
  const ids = new Set();
  let total = null;
  let previousPage = null;
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    const group = await fetchPage({ pageSize: String(pageSize), pageNumber: String(pageNumber) });
    const size = groupTotal(group);
    if (total !== null && size !== total) throw failure('INCOMPLETE_DATA', '查询总条数在翻页期间变化。');
    total = size;
    const signature = JSON.stringify(group.rows);
    if (pageNumber > 1 && signature === previousPage) throw failure('INCOMPLETE_DATA', '教务接口重复返回同一页。');
    previousPage = signature;
    for (const row of group.rows) {
      if (row.WID) {
        if (ids.has(row.WID)) throw failure('INCOMPLETE_DATA', '翻页结果中出现重复记录标识。');
        ids.add(row.WID);
      }
      rows.push(row);
    }
    if (rows.length === total) return { rows, total, pages: pageNumber };
    if (!group.rows.length || rows.length > total) throw failure('INCOMPLETE_DATA', '实际记录数与教务接口总数不一致。');
  }
  throw failure('INCOMPLETE_DATA', '分页超出上限，未输出不完整结果。');
}
