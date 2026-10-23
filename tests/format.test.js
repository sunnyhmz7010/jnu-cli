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

test('完整个人信息展示页面字段名称及显示值，学籍摘要仍可单独使用', () => {
  const result = formatResult('profile show', { fields: [
    { name: 'XBDM', label: '性别', value: '1', displayValue: '合成性别' },
    { name: 'LXDH', label: '联系电话', value: 'SYNTHETIC_PHONE', displayValue: 'SYNTHETIC_PHONE' },
    { name: 'BY3', label: '英文名（外招生）', value: '', displayValue: '' },
    { name: 'ZYFXDM', label: '专业方向', value: null, displayValue: null },
    { name: 'XZ', label: '学制', value: 0, displayValue: 0 }
  ] });
  assert.equal(result, '性别\t合成性别\n联系电话\tSYNTHETIC_PHONE\n英文名（外招生）\t\n专业方向\t--\n学制\t0');
  const summary = formatResult('profile status', { profile: { studentId: 'student-test', name: '合成学生', department: {}, major: {},
    grade: { code: '2025' }, className: null, campus: {}, enrollmentStatus: {}, registered: {}, onCampus: {} } });
  assert(summary.includes('学号 student-test；姓名 合成学生'));
  assert(summary.includes('年级 2025'));
  assert(!summary.includes('undefined'));
});
