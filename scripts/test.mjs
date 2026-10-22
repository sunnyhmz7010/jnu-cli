import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 浏览器档案可能包含扩展的 test.js，只运行项目 tests/ 下的测试。
const root = new URL('../tests/', import.meta.url);
const files = (await readdir(root)).filter((name) => name.endsWith('.test.js')).sort().map((name) => fileURLToPath(new URL(name, root)));
if (!files.length) throw new Error('tests/ 中没有找到项目测试。');
const child = spawn(process.execPath, ['--test', ...process.argv.slice(2), ...files], { stdio: 'inherit' });
child.on('error', (error) => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
