import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const files = ['README.md', 'SECURITY.md', 'package.json', 'package-lock.json', '.gitignore', '.gitattributes'];
async function collect(directory) {
  for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
    const path = directory + entry.name;
    if (entry.isDirectory()) await collect(path + '/');
    else files.push(path);
  }
}
for (const directory of ['src/', 'tests/', 'scripts/', 'docs/', '.github/']) await collect(directory);

for (const path of files) {
  const bytes = await readFile(new URL(path, root));
  const contents = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assert(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${path} 包含 BOM`);
  assert(!contents.includes('\r'), `${path} 应使用 LF`);
  if (path.startsWith('src/')) assert(!/szu-cli|SZU_|深圳大学|深大|AwesomeHou/.test(contents), `${path} 包含无关项目残留`);
  assert(!/C:[\\/]Users[\\/]/i.test(contents), `${path} 包含本机绝对目录`);
  if (/\.(?:js|mjs)$/.test(path)) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(path, root))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  if (path.endsWith('.md')) {
    for (const match of contents.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (target && !/^(?:https?:|mailto:)/.test(target)) await access(new URL(target, new URL(path, root)));
    }
  }
}
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert.equal(manifest.name, 'jnu-cli');
assert.deepEqual(manifest.bin, { 'jnu-cli': 'src/cli.js' });
assert.notEqual(manifest.private, true, 'npm 包必须允许发布');
console.log(`检查通过：${files.length} 个项目文件，语法、格式、文档链接与独立入口一致。`);
