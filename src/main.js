import { readFile } from 'node:fs/promises';
import { getBrowserStatus, selectBrowser } from './browser-settings.js';
import { failure } from './config.js';
import { authStatus, currentStudentId, login, query } from './browser.js';
import { loadCourses } from './course.js';
import { loadGrades } from './grade.js';
import { loadExams } from './exam.js';
import { loadCompletion } from './completion.js';
import { loadPrograms } from './program.js';
import { loadEvaluation } from './evaluation.js';
import { loadProfile } from './profile.js';

const writeJson = (value) => process.stdout.write(JSON.stringify(value, null, 2) + '\n');
const commands = { auth: ['login', 'status'], browser: ['status', 'use'], course: ['status', 'list', 'today'], grade: ['status', 'list'],
  exam: ['status', 'list'], completion: ['status', 'summary', 'modules', 'courses'], program: ['status', 'list', 'item'],
  evaluation: ['status', 'summary', 'list'], profile: ['status', 'show'] };
const loaders = { course: loadCourses, grade: loadGrades, exam: loadExams, completion: loadCompletion, program: loadPrograms, evaluation: loadEvaluation, profile: loadProfile };

const help = `jnu-cli 暨南大学本科生版

用法：
  jnu-cli auth login [--url 入口] [--headless] [--timeout 秒]
  jnu-cli auth status [--headed]
  jnu-cli browser status
  jnu-cli browser use chrome|edge|chromium
  jnu-cli course status|list [--term 学期] [--week 周次] [--weekday 1..7] [--headed]
  jnu-cli course today [--date YYYY-MM-DD] [--term 学期] [--headed]
  jnu-cli grade status|list [--term 学期] [--headed]
  jnu-cli exam status|list [--term 学期]
  jnu-cli completion status|summary|modules [--plan 个人方案代码]
  jnu-cli completion courses --module 模块代码 [--plan 个人方案代码] [--state all|failed|passed|unread|pending|selected]
  jnu-cli program status|list [--keyword 关键词] [--grade 年级] [--department 院系] [--major 专业] [--page 页码] [--limit 条数]
  jnu-cli program item <id-or-planCode>
  jnu-cli evaluation status|summary [--term 学期]
  jnu-cli evaluation list [--term 学期] [--state pending|completed|all]
  jnu-cli profile status|show

命令默认输出 JSON。--help 和 --version 输出文字。
课表默认当前教学周；--week 与 --weekday 可筛选周次和星期。
日期使用 Asia/Shanghai。成绩默认全部学期的有效成绩，不计算累计 GPA。
登录默认显示浏览器；查询默认无界面，可用 --headed 显示浏览器。
教务查询支持 --url 覆盖业务入口；completion 支持 --timeout 秒，默认 180 秒。
教务命令可加 --network system|direct，默认 system；direct 仅让此次 CLI 浏览器直连。
独立档案：JNU_CLI_HOME 或 ~/.jnu-cli；浏览器可用 JNU_BROWSER 指定。
学业完成只读已有结果；评教列表为课程评估项，不提交问卷；个人信息只读常用学籍字段。
课程认定不适配。
`;

export function parseOptions(domain, action, args) {
  const options = { headless: !(domain === 'auth' && action === 'login') };
  const allowed = { auth: action === 'login' ? ['--timeout'] : [], course: ['--term', '--date', '--week', '--weekday'],
    grade: ['--term'], browser: [], exam: ['--term'], profile: [],
    completion: action === 'courses' ? ['--plan', '--module', '--state', '--timeout'] : ['--plan', '--timeout'],
    program: action === 'item' ? [] : ['--keyword', '--grade', '--department', '--major', '--page', '--limit'],
    evaluation: action === 'list' ? ['--term', '--state'] : ['--term'] }[domain];
  if (domain !== 'browser') allowed.push('--network', '--url');
  if (domain === 'program' && action === 'item') {
    if (!args[0] || args[0].startsWith('--')) throw failure('UNKNOWN_ERROR', 'program item 需要 id 或 planCode。');
    options.target = args[0];
    args = args.slice(1);
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--headed' && domain !== 'browser' && !(domain === 'auth' && action === 'login')) { options.headless = false; continue; }
    if (arg === '--headless' && domain === 'auth' && action === 'login') { options.headless = true; continue; }
    if (!allowed?.includes(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw failure('UNKNOWN_ERROR', `不支持的参数或缺少参数值：${arg}`);
    options[arg.slice(2)] = args[++index];
  }
  if (options.term) {
    const match = options.term.match(/^(\d{4})-(\d{4})-([12])$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) throw failure('UNKNOWN_ERROR', '学期格式应为 2026-2027-1 或 2026-2027-2。');
  }
  for (const [key, max] of [['week', 60], ['weekday', 7], ['timeout', domain === 'completion' ? 2147483 : 1800], ['page', Number.MAX_SAFE_INTEGER], ['limit', Number.MAX_SAFE_INTEGER]]) {
    if (options[key] !== undefined) {
      if (!/^\d+$/.test(options[key]) || Number(options[key]) < 1 || Number(options[key]) > max) throw failure('UNKNOWN_ERROR', `${key} 应为 1..${max} 的整数。`);
      options[key] = Number(options[key]);
    }
  }
  if (options.network && !['system', 'direct'].includes(options.network)) throw failure('UNKNOWN_ERROR', 'network 应为 system 或 direct。');
  if (options.url) {
    let url;
    try { url = new URL(options.url); } catch { throw failure('UNKNOWN_ERROR', 'url 应为有效的 HTTP 或 HTTPS 地址。'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw failure('UNKNOWN_ERROR', 'url 应为有效的 HTTP 或 HTTPS 地址。');
  }
  const states = { completion: ['all', 'failed', 'passed', 'unread', 'pending', 'selected'], evaluation: ['pending', 'completed', 'all'] };
  if (options.state && !states[domain]?.includes(options.state)) throw failure('UNKNOWN_ERROR', 'state 不是当前命令支持的状态。');
  for (const key of ['target', 'plan', 'module']) {
    if (options[key] !== undefined && (!options[key].trim() || options[key].length > 128 || /[\x00-\x1f\x7f]/.test(options[key]))) throw failure('UNKNOWN_ERROR', `${key} 格式无效。`);
  }
  if (domain === 'completion' && action === 'courses' && !options.module) throw failure('UNKNOWN_ERROR', 'completion courses 需要 --module 模块代码。');
  if (options.date) {
    const date = new Date(options.date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== options.date) throw failure('UNKNOWN_ERROR', '日期应为真实存在的 YYYY-MM-DD。');
    if (domain === 'course' && options.weekday === undefined) options.weekday = date.getUTCDay() || 7;
  }
  if (domain === 'completion') {
    options.completionTimeout = options.timeout ?? 180;
    delete options.timeout;
  }
  return options;
}

export async function run(argv) {
  if (argv.includes('--help') || !argv.length || argv[0] === 'help') { process.stdout.write(help); return; }
  if (argv.includes('--version') || argv.includes('-v')) { process.stdout.write(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version + '\n'); return; }
  const [domain, action, ...rest] = argv;
  const command = `${domain} ${action ?? ''}`.trim();
  const meta = { command, gateway: domain === 'auth' || domain === 'browser' ? 'auto' : 'direct', backend: 'playwright', school: 'jnu', audience: 'undergraduate' };
  try {
    if (!commands[domain]?.includes(action)) throw failure('UNSUPPORTED_ACTION', '该命令尚未适配，请运行 jnu-cli --help。');
    const browser = domain === 'browser' && action === 'use' ? rest.shift() : null;
    if (domain === 'browser' && action === 'use' && !browser) throw failure('UNKNOWN_ERROR', 'browser use 需要 chrome、edge 或 chromium。');
    const options = parseOptions(domain, action, rest);
    if (domain !== 'browser') meta.network = options.network ?? 'system';
    let data;
    if (domain === 'browser') data = action === 'use' ? selectBrowser(browser) : getBrowserStatus();
    else if (domain === 'auth') data = action === 'login' ? await login(options) : await authStatus(options);
    else data = await query(domain, options, async (post, sourceUrl, page) => {
      const studentId = domain === 'completion' || domain === 'profile' ? await currentStudentId(page) : undefined;
      return loaders[domain](post, { ...options, action, today: domain === 'course' && action === 'today', ...(studentId ? { studentId } : {}) }, sourceUrl);
    });
    if (data.sourceUrl) meta.sourceUrl = data.sourceUrl;
    writeJson({ ok: true, data, meta });
  } catch (error) {
    meta.gateway = 'auto';
    const code = error.code ?? (error.name === 'TimeoutError' ? 'PAGE_CHANGED' : 'UNKNOWN_ERROR');
    const known = { UNSUPPORTED_ACTION: 2, BACKEND_UNAVAILABLE: 10, LOGIN_REQUIRED: 11, NETWORK_REQUIRED: 12, PERMISSION_DENIED: 13, BROWSER_UNAVAILABLE: 15, BROWSER_SELECTION_INVALID: 19, BROWSER_CONFIG_INVALID: 20, PAGE_CHANGED: 20, API_ERROR: 20, INCOMPLETE_DATA: 20, PROGRAM_NOT_FOUND: 23, CALCULATION_TIMEOUT: 24, MODULE_NOT_FOUND: 25, RATE_LIMITED: 30, AUTH_LOGIN_TIMEOUT: 39 };
    const message = error.code || error.name === 'TimeoutError' ? error.message : '查询未完成，请检查网络和浏览器状态。';
    const hint = code === 'BROWSER_UNAVAILABLE' ? '确认本机已安装 Edge 或 Chrome，再运行 jnu-cli browser use edge 或 jnu-cli browser use chrome。' : error.hint;
    const payload = { code, message, ...(hint ? { hint } : {}), ...(error.details && ['API_ERROR', 'CALCULATION_TIMEOUT'].includes(code) ? { details: error.details } : {}) };
    writeJson({ ok: false, error: payload, meta });
    process.exitCode = known[code] ?? 1;
  }
}
