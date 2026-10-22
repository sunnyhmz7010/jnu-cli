import { homedir } from 'node:os';
import { join } from 'node:path';

export const ORIGIN = 'https://jw.jnu.edu.cn';
export const PORTAL = `${ORIGIN}/new/index.html`;
export const APPS = {
  course: { name: '我的课表', path: '/jwapp/sys/wdkb/' },
  grade: { name: '成绩查询', path: '/jwapp/sys/cjcx/' }
};

export function homeDirectory(env = process.env) {
  return env.JNU_CLI_HOME || join(homedir(), '.jnu-cli');
}

export function failure(code, message, hint) {
  return Object.assign(new Error(message), { code, ...(hint ? { hint } : {}) });
}

export function safeSource(value) {
  const url = new URL(value);
  return `${url.origin}${url.pathname}${url.hash}`;
}

export function isLoginUrl(value) {
  return ['icas.jnu.edu.cn', 'auth4.jnu.edu.cn'].includes(new URL(value).hostname);
}

export function shanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name) => parts.find((item) => item.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export const text = (value) => value === null || value === undefined || value === '' ? null : String(value);
export const number = (value) => text(value) !== null && Number.isFinite(Number(value)) ? Number(value) : null;
