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
import { formatResult } from './format.js';

const writeJson = (value) => process.stdout.write(JSON.stringify(value, null, 2) + '\n');
const commands = { auth: ['login', 'status'], browser: ['status', 'use'], course: ['status', 'list', 'today'], grade: ['status', 'list'],
  exam: ['status', 'list'], completion: ['status', 'summary', 'modules', 'courses'], program: ['status', 'list', 'item'],
  evaluation: ['status', 'summary', 'list'], profile: ['status', 'show'] };
const loaders = { course: loadCourses, grade: loadGrades, exam: loadExams, completion: loadCompletion, program: loadPrograms, evaluation: loadEvaluation, profile: loadProfile };

const help = `jnu-cli 暨南大学本科生版

用法：
  jnu-cli auth login [--timeout 秒] [--json]
  jnu-cli auth status [--headed] [--json]
  jnu-cli browser status [--json]
  jnu-cli browser use chrome|edge|chromium [--json]
  jnu-cli course status|list [--term 学期] [--week 周次|--all-weeks] [--weekday 1..7] [--headed] [--json]
  jnu-cli course today [--date YYYY-MM-DD] [--term 学期] [--headed] [--json]
  jnu-cli grade status|list [--term 学期] [--headed] [--json]
  jnu-cli exam status|list [--term 学期] [--json]
  jnu-cli completion status|summary|modules [--plan 个人方案代码] [--json]
  jnu-cli completion courses --module 模块代码 [--plan 个人方案代码] [--state all|failed|passed|unread|pending|selected] [--json]
  jnu-cli program status|list [--page 页码] [--page-size 条数] [--json]
  jnu-cli program item --code 方案代码 [--json]
  jnu-cli evaluation status|summary [--term 学期] [--json]
  jnu-cli evaluation list [--term 学期] [--state pending|completed|all] [--json]
  jnu-cli profile status|show [--json]

课表默认当前教学周；--all-weeks 或显式 --term（不带 --week）读取全学期。
日期使用 Asia/Shanghai。成绩默认全部学期的有效成绩，不计算累计 GPA。
首版登录、重启验证与查询均显示浏览器窗口；--headed 保留兼容。
教务命令可加 --network system|direct，默认 system；direct 仅让此次 CLI 浏览器直连。
独立档案：JNU_CLI_HOME 或 ~/.jnu-cli；浏览器可用 JNU_BROWSER 指定。
学业完成只读已有结果；评教列表为课程评估项，不提交问卷；个人信息只读常用学籍字段。
课程认定不适配。
`;

function parse(domain, action, args) {
  const options = {};
  const allowed = { auth: action === 'login' ? ['--timeout'] : [], course: action === 'today' ? ['--term', '--date'] : ['--term', '--week', '--weekday'],
    grade: ['--term'], browser: [], exam: ['--term'], profile: [],
    completion: action === 'courses' ? ['--plan', '--module', '--state'] : ['--plan'],
    program: action === 'item' ? ['--code'] : ['--page', '--page-size'],
    evaluation: action === 'list' ? ['--term', '--state'] : ['--term'] }[domain];
  if (domain !== 'browser') allowed.push('--network');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') continue;
    if (arg === '--headed' && domain !== 'browser' && !(domain === 'auth' && action === 'login')) { options.headed = true; continue; }
    if (arg === '--all-weeks' && domain === 'course' && action !== 'today') { options.allWeeks = true; continue; }
    if (!allowed?.includes(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw failure('INVALID_ARGUMENT', `不支持的参数或缺少参数值：${arg}`);
    options[arg === '--page-size' ? 'pageSize' : arg.slice(2)] = args[++index];
  }
  if (options.term) {
    const match = options.term.match(/^(\d{4})-(\d{4})-([12])$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) throw failure('INVALID_ARGUMENT', '学期格式应为 2026-2027-1 或 2026-2027-2。');
  }
  for (const [key, max] of [['week', 60], ['weekday', 7], ['timeout', 1800], ['page', 100000], ['pageSize', 100]]) {
    if (options[key] !== undefined) {
      if (!/^\d+$/.test(options[key]) || Number(options[key]) < 1 || Number(options[key]) > max) throw failure('INVALID_ARGUMENT', `${key} 应为 1..${max} 的整数。`);
      options[key] = Number(options[key]);
    }
  }
  if (options.week && options.allWeeks) throw failure('INVALID_ARGUMENT', '--week 与 --all-weeks 不能同时使用。');
  if (options.network && !['system', 'direct'].includes(options.network)) throw failure('INVALID_ARGUMENT', 'network 应为 system 或 direct。');
  const states = { completion: ['all', 'failed', 'passed', 'unread', 'pending', 'selected'], evaluation: ['pending', 'completed', 'all'] };
  if (options.state && !states[domain]?.includes(options.state)) throw failure('INVALID_ARGUMENT', 'state 不是当前命令支持的状态。');
  for (const key of ['code', 'plan', 'module']) {
    if (options[key] !== undefined && (!options[key].trim() || options[key].length > 128 || /[\x00-\x1f\x7f]/.test(options[key]))) throw failure('INVALID_ARGUMENT', `${key} 格式无效。`);
  }
  if (domain === 'program' && action === 'item' && !options.code) throw failure('INVALID_ARGUMENT', 'program item 需要 --code 方案代码。');
  if (domain === 'completion' && action === 'courses' && !options.module) throw failure('INVALID_ARGUMENT', 'completion courses 需要 --module 模块代码。');
  if (options.date) {
    const date = new Date(options.date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== options.date) throw failure('INVALID_ARGUMENT', '日期应为真实存在的 YYYY-MM-DD。');
  }
  return options;
}

export async function run(argv) {
  if (argv.includes('--help') || !argv.length || argv[0] === 'help') { process.stdout.write(help); return; }
  if (argv.includes('--version') || argv.includes('-v')) { process.stdout.write(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version + '\n'); return; }
  const [domain, action, ...rest] = argv;
  const command = `${domain} ${action ?? ''}`.trim();
  const json = argv.includes('--json');
  const meta = { command, gateway: 'direct', backend: 'playwright', school: 'jnu', audience: 'undergraduate' };
  try {
    if (!commands[domain]?.includes(action)) throw failure('INVALID_ARGUMENT', '该命令尚未适配，请运行 jnu-cli --help。');
    const browser = domain === 'browser' && action === 'use' ? rest.shift() : null;
    const options = parse(domain, action, rest);
    if (domain !== 'browser') meta.network = options.network ?? 'system';
    let data;
    if (domain === 'browser') data = action === 'use' ? selectBrowser(browser) : getBrowserStatus();
    else if (domain === 'auth') data = action === 'login' ? await login(options) : await authStatus(options);
    else data = await query(domain, options, async (post, sourceUrl, page) => {
      const studentId = domain === 'completion' || domain === 'profile' ? await currentStudentId(page) : undefined;
      return loaders[domain](post, { ...options, action, today: domain === 'course' && action === 'today', ...(studentId ? { studentId } : {}) }, sourceUrl);
    });
    if (data.sourceUrl) meta.sourceUrl = data.sourceUrl;
    if (json) writeJson({ ok: true, data, meta }); else process.stdout.write(formatResult(command, data) + '\n');
  } catch (error) {
    const code = error.code ?? (error.name === 'TimeoutError' ? 'PAGE_CHANGED' : 'UNKNOWN_ERROR');
    const known = { INVALID_ARGUMENT: 2, LOGIN_REQUIRED: 11, NETWORK_REQUIRED: 12, PERMISSION_DENIED: 13, BROWSER_UNAVAILABLE: 15, BROWSER_SELECTION_INVALID: 19, BROWSER_CONFIG_INVALID: 20, PAGE_CHANGED: 20, API_ERROR: 20, INCOMPLETE_DATA: 20, PLAN_NOT_FOUND: 20, MODULE_NOT_FOUND: 20, RATE_LIMITED: 30, AUTH_LOGIN_TIMEOUT: 39 };
    const message = code === 'UNKNOWN_ERROR' ? '查询未完成，请检查网络和浏览器状态。' : error.message;
    const hint = code === 'BROWSER_UNAVAILABLE' ? '确认本机已安装 Edge 或 Chrome，再运行 jnu-cli browser use edge 或 jnu-cli browser use chrome。' : error.hint;
    const payload = { code, message, ...(hint ? { hint } : {}), ...(error.details && code === 'API_ERROR' ? { details: error.details } : {}) };
    if (json) writeJson({ ok: false, error: payload, meta }); else process.stderr.write(`${payload.code}: ${payload.message}${payload.hint ? '\n' + payload.hint : ''}\n`);
    process.exitCode = known[code] ?? 1;
  }
}
