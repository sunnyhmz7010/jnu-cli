import { failure } from './config.js';

export function moduleTree(items) {
  const nodes = new Map();
  for (const item of items) {
    if (!item.code || nodes.has(item.code)) throw failure('INCOMPLETE_DATA', '模块代码缺失或重复，无法保留模块层级。');
    nodes.set(item.code, { ...item, children: [] });
  }
  const visited = new Set();
  const active = new Set();
  function check(code) {
    if (active.has(code)) throw failure('INCOMPLETE_DATA', '模块父子关系包含循环。');
    if (visited.has(code)) return;
    active.add(code);
    const parent = nodes.get(code).parentCode;
    if (nodes.has(parent)) check(parent);
    active.delete(code);
    visited.add(code);
  }
  const roots = [];
  for (const [code, node] of nodes) {
    check(code);
    if (nodes.has(node.parentCode)) nodes.get(node.parentCode).children.push(node);
    else roots.push(node);
  }
  return roots;
}
