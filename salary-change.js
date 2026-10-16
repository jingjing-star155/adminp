'use strict';

window.createSalaryChange = ({ app, esc, icon, money, stamp, toast, openDialog, employeePayroll, pageShell, bindFilters, paginate, pagination, bindPagination, emptyState }) => {
  const storageKey = 'hongen-salary-change-applications-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const filter = { search: '', status: '', page: 1, pageSize: 10 };
  const statuses = { pending: '审批中', approved: '已通过', rejected: '已退回' };
  let applications = [];
  let loadFailed = false;
  let employees = [];
  let request = null;

  function loadApplications() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.some(row => !row || !['id', 'processNo', 'employeeId', 'employeeNo', 'name', 'department', 'effectiveDate', 'reason', 'submittedAt'].every(key => typeof row[key] === 'string') || !statuses[row.status] || !row.before || !row.after || !Array.isArray(row.changes))) throw new Error('Invalid salary change applications');
    return rows;
  }
  function render() {
    loadFailed = false;
    try { applications = loadApplications(); } catch { applications = []; loadFailed = true; }
    pageShell('薪酬变更申请', 'salary-change-page', `<button type="button" class="button primary" id="new-salary-change" ${loadFailed ? 'disabled' : ''}>${icon('plus')}发起变更申请</button>`, filter, '搜索申请编号、工号、姓名或部门', [['', '全部申请状态'], ...Object.entries(statuses)], 'HRG自助');
    bindFilters(filter, renderRows);
    $('#new-salary-change').addEventListener('click', startApplication);
    renderRows();
    if (loadFailed) toast('薪酬变更申请读取失败，请刷新后重试。', true);
  }
  function renderRows() {
    const query = filter.search.trim().toLowerCase();
    const rows = applications.filter(row => (!filter.status || row.status === filter.status) && (!query || [row.processNo, row.employeeNo, row.name, row.department].some(value => value.toLowerCase().includes(query))));
    const { slice, pages } = paginate(rows, filter);
    $('#payroll-results', app).innerHTML = `<div class="table-scroll"><table class="payroll-table salary-change-table"><colgroup><col style="width:145px"><col style="width:70px"><col style="width:65px"><col style="width:180px"><col style="width:94px"><col style="width:96px"><col style="width:96px"><col style="width:136px"><col style="width:125px"><col style="width:85px"><col style="width:58px"></colgroup><thead><tr>${['申请编号', '工号', '姓名', '部门', '生效日期', '变更前月薪', '变更后月薪', '变更项目', '提交时间', '申请状态', '操作'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${slice.map(row => `<tr><td>${esc(row.processNo)}</td><td>${esc(row.employeeNo)}</td><td>${esc(row.name)}</td><td class="salary-change-department">${esc(row.department)}</td><td>${esc(row.effectiveDate)}</td><td>${money(row.before.monthlySalary)}</td><td>${money(row.after.monthlySalary)}</td><td class="salary-change-items" title="${esc(row.changes.map(change => change.label).join('、'))}">${esc(changeSummary(row.changes))}</td><td>${esc(row.submittedAt.slice(0, 16))}</td><td><span class="status ${esc(row.status)}">${statuses[row.status]}</span></td><td><button type="button" class="link-button" data-salary-change-view="${esc(row.id)}">查看</button></td></tr>`).join('')}</tbody></table></div>${slice.length ? '' : emptyState(loadFailed ? '申请记录暂时无法读取' : applications.length ? '暂无符合条件的申请' : '暂无薪酬变更申请', loadFailed ? '请刷新后重试。' : applications.length ? '请调整搜索或状态筛选条件。' : '点击「发起变更申请」开始填写。')}${pagination(rows.length, pages, filter)}`;
    $$('[data-salary-change-view]', app).forEach(button => button.addEventListener('click', () => viewApplication(applications.find(row => row.id === button.dataset.salaryChangeView))));
    bindPagination(filter, renderRows);
  }
  function changeSummary(changes) {
    const group = key => /^(monthly|fixed|performance)/.test(key) ? '月薪' : /^(quarterly|halfYear|annual)/.test(key) ? '绩效奖金' : /^(signing|policy)/.test(key) ? '签约金' : key.startsWith('longTerm') ? '长期激励' : '其他薪酬';
    return [...new Set(changes.map(change => group(change.key || '')))].join('、');
  }
  // Only active salary branches represent proposed compensation changes.
  function activeCompensation(source) {
    const c = { ...employeePayroll.emptySettings(), ...source };
    const active = employeePayroll.emptySettings();
    for (const key of ['monthlySalary', 'monthlySplit', 'quarterlyEnabled', 'halfYearEnabled', 'annualEnabled', 'signingEnabled', 'longTermEnabled']) active[key] = c[key];
    if (c.monthlySplit === 'yes') {
      active.monthlySplitMode = c.monthlySplitMode;
      for (const key of c.monthlySplitMode === 'ratio' ? ['fixedRatio', 'performanceRatio'] : ['fixedAmount', 'performanceAmount']) active[key] = c[key];
    }
    for (const key of ['quarterly', 'halfYear', 'annual']) {
      if (c[`${key}Enabled`] !== 'yes') continue;
      active[`${key}Mode`] = c[`${key}Mode`];
      active[`${key}${c[`${key}Mode`] === 'months' ? 'Months' : 'Amount'}`] = c[`${key}${c[`${key}Mode`] === 'months' ? 'Months' : 'Amount'}`];
    }
    if (c.longTermEnabled) active.longTermShares = c.longTermShares;
    return active;
  }
  const changesBetween = (before, after) => employeePayroll.compensationChanges(activeCompensation(before), activeCompensation(after));
  const comparisonTable = changes => `<div class="employee-history-scroll"><table class="employee-history-table"><thead><tr><th scope="col">变更项目</th><th scope="col">变更前</th><th scope="col">变更后</th></tr></thead><tbody>${changes.map(change => `<tr><th scope="row">${esc(change.label)}</th><td>${esc(change.before)}</td><td>${esc(change.after)}</td></tr>`).join('')}</tbody></table></div>`;
  function startApplication() {
    try { employees = employeePayroll.getEmployees(); } catch { toast('员工薪酬信息读取失败，请刷新后重试。', true); return; }
    if (!employees.length) { toast('暂无可选择的员工，请先完善发薪项目。', true); return; }
    request = { employee: null, effectiveDate: '', reason: '', signingBonus: null };
    openApplication();
  }
  function metadataHTML() {
    return `<section class="salary-change-metadata" aria-labelledby="sc-request-title"><h3 id="sc-request-title">申请信息</h3><div class="salary-change-fields"><div class="field full-width"><label for="sc-employee"><span class="required">*</span>变更员工</label><select id="sc-employee" required><option value="">请选择员工</option>${employees.map(employee => `<option value="${esc(employee.id)}" ${request.employee?.id === employee.id ? 'selected' : ''}>${esc(employee.employeeNo)} · ${esc(employee.name)} · ${esc(employee.department)}</option>`).join('')}</select></div><div class="field"><label for="sc-effective-date"><span class="required">*</span>生效日期</label><input id="sc-effective-date" type="date" min="1900-01-01" max="9999-12-31" required value="${esc(request.effectiveDate)}"></div><div class="field full-width"><label for="sc-reason"><span class="required">*</span>变更原因</label><textarea id="sc-reason" required maxlength="1000" placeholder="请说明薪酬变更原因">${esc(request.reason)}</textarea></div></div><p class="salary-change-hint">选择员工后将带入当前薪酬，请填写拟变更的薪酬和生效日期。</p></section>${request.employee ? '' : '<div class="salary-change-placeholder">请选择变更员工，查看当前薪酬并填写变更内容。</div>'}`;
  }
  function readMetadata() {
    request.effectiveDate = $('#sc-effective-date').value;
    request.reason = $('#sc-reason').value;
  }
  function openApplication(markDirty = false) {
    const employee = request.employee || { id: '', employeeNo: '', name: '', department: '', job: '', hireDate: '', compensation: employeePayroll.emptySettings() };
    employeePayroll.openEditor(employee, true, {
      title: '发起薪酬变更申请', saveLabel: '提交申请', closeTitle: '放弃薪酬变更申请？', returnFocus: '#new-salary-change',
      monthlyEditable: true, noEmployee: !request.employee, focusTarget: '#sc-employee',
      signingSnapshot: request.signingBonus,
      headerHTML: metadataHTML(),
      footerHTML: '<section class="salary-change-comparison" aria-labelledby="sc-comparison-title"><h3 id="sc-comparison-title">变更前后对比</h3><div id="sc-comparison" aria-live="polite"></div></section>',
      onOpen: () => {
        $('#sc-employee').addEventListener('change', event => {
          readMetadata();
          const next = employees.find(row => row.id === event.target.value) || null;
          const current = request.employee;
          event.target.value = current?.id || '';
          const choose = () => { request.employee = next; request.signingBonus = next ? employeePayroll.getSigningBonus(next) : null; openApplication(true); };
          const compensation = employeePayroll.getDraftCompensation();
          if (current && JSON.stringify(compensation) !== JSON.stringify({ ...employeePayroll.emptySettings(), ...current.compensation })) openDialog('切换变更员工？', '<p>切换后将重新带入所选员工的薪酬，当前薪酬修改会被清空。生效日期和变更原因将保留。</p>', choose, '确认切换');
          else choose();
        });
        for (const id of ['sc-effective-date', 'sc-reason']) $('#'+id).addEventListener('input', () => {
          readMetadata(); employeePayroll.markDirty(); $('#employee-payroll-error').hidden = true;
        });
        if (markDirty || request.effectiveDate || request.reason) employeePayroll.markDirty();
      },
      onChange: updateComparison,
      beforeValidate: () => {
        readMetadata();
        if (!request.employee) return { message: '请选择变更员工。', target: '#sc-employee' };
        if (!request.effectiveDate || !$('#sc-effective-date').validity.valid) return { message: '请选择有效的生效日期。', target: '#sc-effective-date' };
        if (!request.reason.trim()) return { message: '请填写变更原因。', target: '#sc-reason' };
        return null;
      },
      onSave: confirmApplication
    });
  }
  function updateComparison(after) {
    const target = $('#sc-comparison');
    if (!target) return;
    if (!request.employee) { target.innerHTML = '<p class="salary-change-hint">选择员工后展示变更前后对比。</p>'; return; }
    const before = request.employee.compensation;
    const changes = changesBetween(before, after);
    const delta = Number(after.monthlySalary) - Number(before.monthlySalary);
    target.innerHTML = `<div class="salary-change-summary"><div><span>当前月薪</span><strong>${money(before.monthlySalary)}<small>元 / 月</small></strong></div><div><span>申请月薪</span><strong>${after.monthlySalary === '' ? '—' : money(after.monthlySalary)}<small>元 / 月</small></strong></div><div><span>月薪调整金额</span><strong>${Number.isFinite(delta) && after.monthlySalary !== '' ? `${delta > 0 ? '+' : ''}${money(delta)}` : '—'}<small>元 / 月</small></strong></div></div>${changes.length ? comparisonTable(changes) : '<p class="salary-change-hint">薪酬尚未变更，请至少调整一项薪酬内容。</p>'}`;
  }
  function confirmApplication(after) {
    const employee = request.employee;
    const changes = changesBetween(employee.compensation, after);
    if (!changes.length) { employeePayroll.showError('薪酬未发生变化，请至少调整一项薪酬内容。', '#ep-monthlySalary'); return; }
    const proposal = { employee: structuredClone(employee), after: structuredClone(after), changes, effectiveDate: request.effectiveDate, reason: request.reason.trim(), signingBonus: structuredClone(request.signingBonus) };
    openDialog('确认提交薪酬变更申请', `<p>员工：<strong>${esc(employee.name)}</strong>（${esc(employee.employeeNo)}）<br>生效日期：${esc(proposal.effectiveDate)}<br>变更薪酬项：${changes.length} 项<br>月薪：${money(employee.compensation.monthlySalary)} → ${money(after.monthlySalary)}</p>`, () => persistApplication(proposal), '确认提交');
  }
  function persistApplication(proposal) {
    let latest, current;
    try {
      latest = loadApplications();
      current = employeePayroll.getEmployees().find(employee => employee.id === proposal.employee.id);
    } catch { toast('读取最新申请或员工薪酬失败，请刷新后重试。', true); return false; }
    if (!current || JSON.stringify(current.compensation) !== JSON.stringify(proposal.employee.compensation)) { toast('该员工薪酬已更新，请重新发起申请。', true); return false; }
    if (JSON.stringify(employeePayroll.getSigningBonus(current)) !== JSON.stringify(proposal.signingBonus)) { toast('该员工的Offer签约金信息已更新，请重新发起申请。', true); return false; }
    const submittedAt = stamp();
    const prefix = `XC${submittedAt.slice(0, 10).replace(/-/g, '')}-`;
    const sequence = Math.max(0, ...latest.filter(row => row.processNo.startsWith(prefix)).map(row => Number(row.processNo.slice(prefix.length)) || 0)) + 1;
    const record = {
      id: crypto.randomUUID(), processNo: `${prefix}${String(sequence).padStart(4, '0')}`, employeeId: current.id,
      employeeNo: current.employeeNo, name: current.name, department: current.department, job: current.job, hireDate: current.hireDate,
      effectiveDate: proposal.effectiveDate, reason: proposal.reason, status: 'pending', submittedAt,
      before: structuredClone(proposal.employee.compensation), after: proposal.after, changes: proposal.changes, signingBonus: proposal.signingBonus
    };
    const next = [record, ...latest];
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { toast('申请提交失败，请检查浏览器本地存储后重试。', true); return false; }
    applications = next; filter.search = ''; filter.status = ''; filter.page = 1;
    $('#payroll-search', app).value = ''; $('#payroll-status', app).value = '';
    employeePayroll.closeEditor(false); request = null; renderRows();
    $('#new-salary-change').focus({ preventScroll: true });
    toast('薪酬变更申请已提交，可在列表查看详情');
    return true;
  }
  function viewApplication(record) {
    if (!record) return;
    const employee = { id: record.employeeId, employeeNo: record.employeeNo, name: record.name, department: record.department, job: record.job || '—', hireDate: record.hireDate, compensation: record.after };
    employeePayroll.openEditor(employee, false, {
      title: '查看薪酬变更申请', closeTitle: '关闭薪酬变更申请', returnFocus: `[data-salary-change-view="${record.id}"]`,
      signingSnapshot: Object.hasOwn(record, 'signingBonus') ? record.signingBonus : employeePayroll.legacySigningBonus(record.after),
      headerHTML: `<section class="salary-change-metadata"><h3>申请信息</h3><dl class="salary-change-detail"><div><dt>变更员工</dt><dd>${esc(record.name)}（${esc(record.employeeNo)}）</dd></div><div><dt>所属部门</dt><dd>${esc(record.department)}</dd></div><div><dt>申请编号</dt><dd>${esc(record.processNo)}</dd></div><div><dt>申请状态</dt><dd><span class="status ${esc(record.status)}">${statuses[record.status]}</span></dd></div><div><dt>生效日期</dt><dd>${esc(record.effectiveDate)}</dd></div><div><dt>提交时间</dt><dd>${esc(record.submittedAt)}</dd></div><div class="full-width"><dt>变更原因</dt><dd>${esc(record.reason)}</dd></div></dl></section><section class="salary-change-comparison"><h3>变更前后对比</h3>${comparisonTable(record.changes)}</section><p class="salary-change-structure-title">申请变更后的薪酬结构</p>`
    });
  }
  window.addEventListener('storage', event => {
    if (event.key === storageKey && $('#salary-change-page', app) && !$('#employee-payroll-dialog').open) render();
  });
  return { render };
};
