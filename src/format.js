const shown = (value) => value ?? '--';

export function formatResult(command, data) {
  const [domain, action] = command.split(' ');
  if (domain === 'auth') return data.loggedIn ? '已登录，已验证本科课表访问。' : `未登录。${data.hint ?? '运行 jnu-cli auth login。'}`;
  if (domain === 'exam') return [`${command}：${data.items.length} 条；学期 ${data.term.id}`, '考试冲突状态：未核验',
    ...data.items.map((item) => `${shown(item.date)}\t${shown(item.timeDisplay)}\t${shown(item.courseName)}\t考场 ${shown(item.room)}\t座位 ${shown(item.seat)}`)].join('\n');
  if (domain === 'program') {
    if (action !== 'item') return [`${command}：第 ${data.pagination.page} 页，本页 ${data.items.length} 条，共 ${data.pagination.total} 个方案`,
      ...data.items.map((item) => `${item.code}\t${item.name}\t${shown(item.department)}\t${shown(item.major)}\t最低学分 ${shown(item.minimumCredits)}`)].join('\n');
    return [`${data.plan.code} ${data.plan.name}`, `最低学分 ${shown(data.plan.minimumCredits)}；${data.modules.length} 个模块，${data.items.length} 条课程关系，${data.guidance.length} 条指导计划`,
      ...data.items.map((item) => `${item.moduleCode}\t${item.courseCode}\t${item.courseName}\t学分 ${shown(item.credit)}\t${shown(item.nature)}`)].join('\n');
  }
  if (domain === 'completion') {
    if (data.calculation.state === 'not-calculated') return `${shown(data.plan?.name)}：暂无已有计算结果。`;
    const heading = [`${data.plan.name}；结果计算时间 ${shown(data.calculation.calculatedAt)}`,
      `要求学分 ${shown(data.summary.requiredCredits)}；已完成 ${shown(data.summary.completedCredits)}；当前选课学分 ${shown(data.summary.currentSelectedCredits)}`];
    if (action === 'modules') return [...heading, ...data.items.map((item) => `${item.code}\t${item.name}\t要求 ${shown(item.requiredCredits)}\t完成 ${shown(item.completedCredits)}\t${item.passed === null ? '状态未提供' : item.passed ? '达标' : '未达标'}`)].join('\n');
    if (action === 'courses') return [...heading, `模块 ${data.module.name}：${data.items.length} 条`, ...data.items.map((item) => `${item.courseCode}\t${item.courseName}\t${shown(item.status)}\t成绩 ${shown(item.score)}\t学分 ${shown(item.credit)}`)].join('\n');
    return heading.join('\n');
  }
  if (domain === 'evaluation') {
    const progress = data.progress;
    const message = progress.state === 'no-tasks' ? '暂无评教任务' : `已评 ${progress.completed}，待评 ${progress.pending}，共 ${progress.total} 项`;
    const heading = [`评教学期 ${data.term.id}：${message}`];
    if (data.items) return [...heading, `课程评估：${data.items.length} 项`, ...data.items.map((item) => `${shown(item.questionnaireName)}\t${item.evaluated ? '已评' : '待评'}\t${shown(item.startTime)} 至 ${shown(item.endTime)}`)].join('\n');
    return heading.join('\n');
  }
  if (domain === 'profile') {
    const person = data.profile;
    return [`学号 ${shown(person.studentId)}；姓名 ${shown(person.name)}`, `院系 ${shown(person.department.name)}；专业 ${shown(person.major.name)}`,
      `年级 ${shown(person.grade.name ?? person.grade.code)}；班级 ${shown(person.className)}`,
      `校区 ${shown(person.campus.name)}；学籍状态 ${shown(person.enrollmentStatus.name)}`,
      `在籍 ${shown(person.registered.name)}；在校 ${shown(person.onCampus.name)}`].join('\n');
  }
  if (data.items) return [`${command}：${data.items.length} 条`, ...(data.term ? [`学期 ${data.term.id}；查询周次 ${data.filters.week ?? '全学期'}`] : []), ...data.items.map((item) => item.score !== undefined
    ? `${item.termId}\t${item.courseCode}\t${item.courseName}\t${item.score ?? '--'}\t学分 ${item.credit ?? '--'}\t绩点 ${item.gradePoint ?? '--'}`
    : `星期${item.weekday}\t${item.startSection}-${item.endSection}节\t${item.courseName}\t${item.location ?? '--'}${item.adjusted ? '（调课）' : ''}`)].join('\n');
  return JSON.stringify(data, null, 2);
}
