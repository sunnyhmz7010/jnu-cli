import test from 'node:test';
import assert from 'node:assert/strict';
import { formatResult } from '../src/format.js';

test('新增考试和方案表格使用各自字段，不落入课表的星期节次格式', () => {
  const exam = formatResult('exam list', { term: { id: '2026-2027-1' }, items: [{ date: '2026-12-01', timeDisplay: '09:00-11:00', courseName: '合成考试课程', room: null, seat: null }] });
  assert(exam.includes('冲突状态：未核验'));
  assert(exam.includes('考场 --'));
  assert(!exam.includes('undefined'));
  const plan = formatResult('program item', { plan: { code: 'plan-test', name: '合成方案', minimumCredits: 160 }, modules: [{}], guidance: [{}],
    items: [{ moduleCode: 'module-test', courseCode: 'TEST101', courseName: '合成课程', credit: 2, nature: '必修' }] });
  assert(plan.includes('1 条课程关系'));
  assert(plan.includes('module-test\tTEST101'));
  assert(!plan.includes('星期'));
});

test('扩展模块后仍保留原课表和成绩的普通输出', () => {
  const course = formatResult('course list', { term: { id: '2026-2027-1' }, filters: { week: 7 },
    items: [{ weekday: 3, startSection: 1, endSection: 2, courseName: '合成课程', location: '合成教室', adjusted: true }] });
  assert(course.startsWith('course list：1 条'));
  assert(course.includes('星期3\t1-2节'));
  assert(course.includes('（调课）'));
  const grade = formatResult('grade list', { items: [{ termId: '2025-2026-2', courseCode: 'TEST101', courseName: '合成课程', score: '0', credit: 2, gradePoint: 0 }] });
  assert(grade.startsWith('grade list：1 条'));
  assert(grade.includes('绩点 0'));
});
