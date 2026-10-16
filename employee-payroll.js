'use strict';

window.createEmployeePayroll = ({ app, esc, icon, money, stamp, toast, openDialog, pageShell, bindFilters, paginate, pagination, bindPagination, emptyState, getOfferSigningBonus }) => {
  const storageKey = 'hongen-employee-payroll-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const dialog = $('#employee-payroll-dialog');
  const form = $('#employee-payroll-form');
  const body = $('#employee-payroll-body');
  const filter = { search: '', page: 1, pageSize: 10 };
  const bonusTypes = [['quarterly', '季度绩效'], ['halfYear', '半年度绩效'], ['annual', '年终奖']];
  const payItems = [['monthly', '月薪'], ['bonus', '绩效奖金'], ['signing', '签约金'], ['long-term', '长期激励']];
  let viewOnly = false;
  let editorOptions = {};
  let editableKeys = [];
  const signingKeys = new Set(['signingEnabled', 'signingByPolicy', 'signingTotal', 'signingCount', 'signingSchedule', 'policySchedule', 'policySnapshot']);
  const emptySettings = () => ({
    monthlySalary: '', monthlySplit: 'no', monthlySplitMode: 'ratio', fixedRatio: '', performanceRatio: '', fixedAmount: '', performanceAmount: '',
    quarterlyEnabled: 'no', quarterlyMode: 'amount', quarterlyAmount: '', quarterlyMonths: '',
    halfYearEnabled: 'no', halfYearMode: 'amount', halfYearAmount: '', halfYearMonths: '',
    annualEnabled: 'no', annualMode: 'amount', annualAmount: '', annualMonths: '',
    signingEnabled: false, signingByPolicy: 'no', signingTotal: '', signingCount: '2', signingSchedule: [], policySnapshot: null,
    longTermEnabled: false, longTermShares: ''
  });
  const seed = [
    ['810001', '林晓雨', '洪恩>识字项目部>产品部', '产品经理', '2025-10-12', '20000'],
    ['810002', '陈嘉言', '洪恩>英语项目部>教研部', '课程教研专家', '2025-09-09', '22000'],
    ['810003', '周予安', '洪恩>识字项目部>市场部', '品牌营销经理', '2025-08-12', '25000'],
    ['810004', '许知远', '洪恩>识字项目部>前端程序部', '前端开发工程师', '2025-10-08', '28000'],
    ['810005', '苏念', '洪恩>职能管理项目部>人力资源部', '招聘专员', '2025-09-28', '15000'],
    ['810006', '程一帆', '洪恩>编程项目部>测试程序部', '测试工程师', '2025-09-28', '18000'],
    ['810007', '顾思琪', '洪恩>职能管理项目部>财务部', '财务分析师', '2025-09-25', '21000'],
    ['810008', '陆星河', '洪恩>英语项目部>内容部', '内容策划', '2025-09-21', '19000'],
    ['810009', '温予宁', '洪恩>识字项目部>设计部', '视觉设计师', '2025-09-21', '23000'],
    ['810010', '宋奕辰', '洪恩>编程项目部>运营部', '用户运营', '2025-09-18', '18000']
  ].map(([employeeNo, name, department, job, hireDate, monthlySalary]) => ({
    id: `employee-${employeeNo}`, employeeNo, name, department, job, hireDate, updatedAt: '', demo: true,
    compensation: { ...emptySettings(), monthlySalary }
  }));
  const legacyDemoDepartments = {
    '810001': '产品研发部', '810002': '内容教研部', '810003': '市场营销部',
    '810004': '产品研发部', '810005': '人力资源部', '810006': '产品研发部',
    '810007': '财务管理部', '810008': '内容教研部', '810009': '产品研发部', '810010': '市场营销部'
  };
  const demoHistoryPlans = {
    '810003': { bonuses: ['2000', '3000', '4000'], shares: ['1000', '2000', '3000'], signingBonus: { enabled: false } },
    '810007': { bonuses: ['1500', '2000', '3000'], shares: ['800', '1500', '2000'], signingBonus: {
      enabled: true, source: 'offer', processNo: '68680', total: '12000', count: 3, complete: true,
      rows: [{ month: '2026-09', offsetMonths: '0', ratio: '30', amount: '3600' }, { month: '2027-03', offsetMonths: '6', ratio: '30', amount: '3600' }, { month: '2027-09', offsetMonths: '12', ratio: '40', amount: '4800' }]
    } },
    '810009': { bonuses: ['2000', '2500', '3500'], shares: ['1200', '2000', '2500'], signingBonus: {
      enabled: true, source: 'offer', processNo: '68678', total: '30000', count: 1, complete: true,
      rows: [{ month: '2027-03', offsetMonths: '6', ratio: '100', amount: '30000' }]
    } }
  };
  let loadError = false;
  let employees = [];
  let editing = null;
  let draft = null;
  let dirty = false;
  let returnFocus = null;

  function withDemoHistory(row) {
    const sample = seed.find(item => item.id === row.id && item.employeeNo === row.employeeNo && item.name === row.name);
    const plan = demoHistoryPlans[row.employeeNo];
    if (!plan || !sample || row.demo !== true || row.updatedAt || row.history != null && (!Array.isArray(row.history) || row.history.length) || JSON.stringify({ ...emptySettings(), ...row.compensation }) !== JSON.stringify(sample.compensation)) return row;
    const dates = ['2026-07-01 09:00:00', '2026-09-01 10:30:00', '2026-10-15 15:00:00'];
    let previous = { ...emptySettings(), monthlySalary: String(Number(sample.compensation.monthlySalary) - 3000) };
    const history = dates.map((changedAt, index) => {
      const after = {
        ...emptySettings(), monthlySalary: String(Number(sample.compensation.monthlySalary) - 2000 + index * 1000),
        monthlySplit: 'yes', monthlySplitMode: 'ratio', fixedRatio: '80', performanceRatio: '20',
        quarterlyEnabled: 'yes', quarterlyMode: 'amount', quarterlyAmount: plan.bonuses[index],
        halfYearEnabled: index === 0 ? 'no' : 'yes', halfYearMode: 'months', halfYearMonths: index === 0 ? '' : index === 1 ? '0.5' : '1',
        annualEnabled: 'yes', annualMode: 'months', annualMonths: index === 0 ? '1' : '2',
        longTermEnabled: true, longTermShares: plan.shares[index]
      };
      const record = { id: `demo-history-${row.employeeNo}-${index + 1}`, demo: true, changedAt, before: structuredClone(previous), after: structuredClone(after), changes: compensationChanges(previous, after), signingBonus: structuredClone(plan.signingBonus) };
      previous = after;
      return record;
    });
    return { ...row, compensation: structuredClone(previous), updatedAt: dates[dates.length - 1], history };
  }
  function loadEmployees() {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : seed;
      if (!Array.isArray(parsed) || parsed.some(row => !row || !['id', 'employeeNo', 'name', 'department', 'job'].every(key => typeof row[key] === 'string') || !row.id || !row.employeeNo || !row.compensation || typeof row.compensation !== 'object')) throw new Error('Invalid employee payroll records');
      return parsed.map(row => {
        const sample = seed.find(item => item.id === row.id && item.employeeNo === row.employeeNo);
        const employee = row.demo === true && sample && row.department === legacyDemoDepartments[row.employeeNo]
          ? { ...row, department: sample.department } : row;
        return withDemoHistory(employee);
      });
    } catch { loadError = true; return []; }
  }
  function render() {
    loadError = false;
    employees = loadEmployees();
    pageShell('薪酬结构管理', 'payroll-projects-page', '', filter, '搜索工号、姓名、部门或职位', []);
    bindFilters(filter, renderRows);
    renderRows();
    if (loadError) toast('员工发薪信息未能读取，请刷新后重试。', true);
  }
  function renderRows() {
    const query = filter.search.trim().toLowerCase();
    const rows = employees.filter(row => !query || [row.employeeNo, row.name, row.department, row.job].some(value => value.toLowerCase().includes(query)));
    const { slice, pages } = paginate(rows, filter);
    $('#payroll-results', app).innerHTML = `<div class="table-scroll"><table class="payroll-table employee-payroll-table"><colgroup><col class="employee-number-col"><col class="employee-name-col"><col class="employee-department-col"><col class="employee-job-col">${payItems.map(() => '<col class="employee-item-col">').join('')}<col class="employee-updated-col"><col class="employee-actions-col"></colgroup><thead><tr>${['工号', '姓名', '部门', '职位', ...payItems.map(([, label]) => label), '更新时间', '操作'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${slice.map(row => `<tr><td>${esc(row.employeeNo)}</td><td>${esc(row.name)}</td><td>${esc(row.department)}</td><td>${esc(row.job)}</td>${paySummary(row.compensation, row).map(value => `<td class="employee-pay-summary">${esc(value)}</td>`).join('')}<td>${esc(row.updatedAt?.slice(0, 16) || '—')}</td><td><div class="payroll-row-actions"><button class="link-button" data-employee-edit="${esc(row.id)}">编辑</button><button class="link-button" data-employee-view="${esc(row.id)}">查看</button><button class="link-button" data-employee-history="${esc(row.id)}">变更记录${row.history?.length ? `（${row.history.length}）` : ''}</button></div></td></tr>`).join('')}</tbody></table></div>${slice.length ? '' : emptyState('暂无符合条件的员工', '请调整搜索条件。')}${pagination(rows.length, pages, filter)}`;
    $$('[data-employee-edit]', app).forEach(button => button.addEventListener('click', () => openEditor(employees.find(row => row.id === button.dataset.employeeEdit), true)));
    $$('[data-employee-view]', app).forEach(button => button.addEventListener('click', () => openEditor(employees.find(row => row.id === button.dataset.employeeView))));
    $$('[data-employee-history]', app).forEach(button => button.addEventListener('click', () => openHistory(employees.find(row => row.id === button.dataset.employeeHistory))));
    bindPagination(filter, renderRows);
  }
  function numeric(key, label, unit = '', { min = 0, max = 999999999, step = '0.01', required = true } = {}) {
    return `<div class="field"><label for="ep-${key}">${required ? '<span class="required">*</span>' : ''}${label}</label><div class="employee-control"><input id="ep-${key}" name="${key}" type="number" min="${min}" max="${max}" step="${step}" ${required ? 'required' : ''} value="${esc(draft[key])}">${unit ? `<span>${unit}</span>` : ''}</div></div>`;
  }
  function paySummary(compensation, employee) {
    const c = { ...emptySettings(), ...compensation };
    const bonuses = bonusTypes.filter(([key]) => c[`${key}Enabled`] === 'yes').map(([, label]) => label);
    const signing = employee ? getSigningBonus(employee) : legacySigningBonus(c);
    return [c.monthlySalary === '' ? '—' : money(c.monthlySalary), bonuses.join('、') || '无', signing.enabled ? money(signing.total) : '无', c.longTermEnabled ? `${c.longTermShares} ADS / 四年` : '无'];
  }
  function legacySigningBonus(compensation = {}) {
    const enabled = compensation.signingEnabled === true || compensation.signingEnabled === 'yes' || (compensation.signingEnabled == null && Number(compensation.signingTotal) > 0);
    const schedule = compensation.signingByPolicy === 'yes' ? compensation.policySchedule : compensation.signingSchedule;
    const rows = (Array.isArray(schedule) ? schedule : []).map(row => ({ month: row.month || '', amount: row.amount ?? '', offsetMonths: '', ratio: '' }));
    return { enabled, source: 'saved', total: compensation.signingTotal || '', count: compensation.signingByPolicy === 'yes' ? rows.length || null : Number(compensation.signingCount) || rows.length || null, rows, complete: rows.length > 0 && rows.every(row => row.month && row.amount !== ''), policyName: compensation.signingByPolicy === 'yes' ? compensation.policySnapshot?.name || '' : '' };
  }
  function getSigningBonus(employee) {
    return structuredClone(getOfferSigningBonus?.(employee) || legacySigningBonus(employee.compensation));
  }
  function signingBonusSection(employee, options) {
    if (options.noEmployee) return '';
    const signing = Object.hasOwn(options, 'signingSnapshot') ? options.signingSnapshot : getSigningBonus(employee);
    if (!signing?.enabled) return options.historySnapshot ? `<section class="employee-pay-section employee-signing-readonly" data-pay-section="signing" aria-labelledby="ep-signing-title"><h3 id="ep-signing-title">签约金 <span class="employee-readonly-badge">只读</span></h3><p class="employee-signing-note">${options.signingHistoryKnown ? '无签约金' : '该次变更未保存签约金信息。'}</p></section>` : '';
    const amount = value => value !== '' && value != null && Number.isFinite(Number(value)) ? money(value) : '—';
    const rows = Array.isArray(signing.rows) ? signing.rows : [];
    return `<section class="employee-pay-section employee-signing-readonly" data-pay-section="signing" aria-labelledby="ep-signing-title"><h3 id="ep-signing-title">签约金 <span class="employee-readonly-badge">${signing.source === 'offer' ? '来自Offer · ' : ''}只读</span></h3><dl class="employee-signing-summary"><div><dt>签约金总金额</dt><dd>${amount(signing.total)}</dd></div><div><dt>发放期数</dt><dd>${signing.count ? `${esc(signing.count)} 期` : '—'}</dd></div>${signing.processNo ? `<div><dt>来源Offer</dt><dd>${esc(signing.processNo)}</dd></div>` : ''}${signing.policyName ? `<div><dt>发放政策</dt><dd>${esc(signing.policyName)}</dd></div>` : ''}</dl>${rows.length ? `<div class="employee-payment-scroll"><table class="employee-payment-table employee-signing-table"><thead><tr><th scope="col">期次</th><th scope="col">发放月份</th><th scope="col">入职满月数</th><th scope="col">发放比例</th><th scope="col">发放金额</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td>第 ${index + 1} 期</td><td>${esc(row.month || '—')}</td><td>${row.offsetMonths !== '' && row.offsetMonths != null ? `${esc(row.offsetMonths)} 个月` : '—'}</td><td>${row.ratio !== '' && row.ratio != null ? `${esc(row.ratio)}%` : '—'}</td><td>${amount(row.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row" colspan="4">约定总金额</th><td>${amount(signing.total)}</td></tr></tfoot></table></div>` : ''}${signing.complete ? '' : '<p class="employee-signing-note">已有签约金的发放安排待完善。</p>'}</section>`;
  }
  const changeFields = [
    ['monthlySalary', '月薪', 'money'], ['monthlySplit', '月薪是否拆分', 'choice'], ['monthlySplitMode', '拆分方式', 'choice'],
    ['fixedRatio', '固定工资比例', '%'], ['performanceRatio', '绩效工资比例', '%'], ['fixedAmount', '固定工资金额', 'money'], ['performanceAmount', '绩效工资金额', 'money'],
    ...bonusTypes.flatMap(([key, label]) => [[`${key}Enabled`, `是否有${label}`, 'choice'], [`${key}Mode`, `${label}目标填写方式`, 'choice'], [`${key}Amount`, `${label}目标金额`, 'money'], [`${key}Months`, `${label}目标月数`, '个月']]),
    ['longTermEnabled', '是否有长期激励', 'choice'], ['longTermShares', '长期激励目标股数', 'ADS / 四年']
  ];
  function changeValue(c, key, type) {
    const value = c[key];
    if (type === 'schedule') return (Array.isArray(value) ? value : []).filter(row => row.month || row.amount !== '' && row.amount != null).map((row, index) => `第${index + 1}笔：${row.month || '—'} / ${row.amount === '' || row.amount == null ? '—' : money(row.amount)}`).join('\n') || '—';
    if (value === '' || value == null) return '—';
    if (type === 'choice') return ({ yes: '是', no: '否', true: '是', false: '否', ratio: '按比例拆分', amount: key === 'monthlySplitMode' ? '按金额拆分' : '目标金额', months: '目标月数' })[value] || String(value);
    if (type === 'money') return money(value);
    return `${Number(value)} ${type}`;
  }
  function compensationChanges(before, after) {
    const previous = { ...emptySettings(), ...before };
    const current = { ...emptySettings(), ...after };
    return changeFields.map(([key, label, type]) => ({ key, label, before: changeValue(previous, key, type), after: changeValue(current, key, type) })).filter(change => change.before !== change.after);
  }
  function openHistory(employee, selectedSequence = null) {
    if (!employee) return;
    const history = (employee.history || []).map((record, index) => ({ record, sequence: index + 1 }))
      .sort((a, b) => String(b.record.changedAt || '').localeCompare(String(a.record.changedAt || '')) || b.sequence - a.sequence);
    if (history.length) {
      const { record, sequence } = history.find(entry => entry.sequence === selectedSequence) || history[0];
      const hasSnapshot = record.after && typeof record.after === 'object' && !Array.isArray(record.after);
      const legacySigning = legacySigningBonus(record.after || {});
      const changes = Array.isArray(record.changes) ? record.changes : [];
      openEditor({ ...employee, compensation: hasSnapshot ? record.after : emptySettings() }, false, {
        title: '薪酬变更记录', returnFocus: `[data-employee-history="${employee.id}"]`, focusTarget: '#employee-history-date',
        historySnapshot: true, hideCompensation: !hasSnapshot,
        signingSnapshot: Object.hasOwn(record, 'signingBonus') ? record.signingBonus : legacySigning,
        signingHistoryKnown: Object.hasOwn(record, 'signingBonus') || legacySigning.enabled,
        headerHTML: `<section class="employee-history-filter" aria-label="变更日期选择"><div class="field"><label for="employee-history-date">变更日期</label><select id="employee-history-date">${history.map(entry => `<option value="${entry.sequence}" ${entry.sequence === sequence ? 'selected' : ''}>${esc(entry.record.changedAt || '日期未记录')}（第 ${entry.sequence} 次变更）${entry.record.demo === true ? ' · 示例' : ''}</option>`).join('')}</select></div><p class="employee-history-count">共 ${history.length} 条变更记录${history.some(entry => entry.record.demo === true) ? '（含示例）' : ''}</p></section><p class="employee-history-heading">${hasSnapshot ? '变更后的完整薪酬信息' : '该次变更未保存完整薪酬信息。'}</p>`,
        footerHTML: `<details class="employee-history-record" open><summary><strong>第 ${sequence} 次变更</strong><time>${esc(record.changedAt || '日期未记录')}</time><span>${changes.length} 项变化</span></summary><div class="employee-history-scroll"><table class="employee-history-table"><thead><tr><th scope="col">变更项目</th><th scope="col">变更前</th><th scope="col">变更后</th></tr></thead><tbody>${changes.map(change => `<tr><th scope="row">${esc(change.label)}</th><td>${esc(change.before)}</td><td>${esc(change.after)}</td></tr>`).join('')}</tbody></table></div></details>`,
        onOpen: () => $('#employee-history-date').addEventListener('change', event => openHistory(employee, Number(event.target.value)))
      });
      return;
    }
    editorOptions = {};
    editing = employee; draft = null; dirty = false; viewOnly = true;
    returnFocus = `[data-employee-history="${employee.id}"]`;
    $('#employee-payroll-title').textContent = '薪酬变更记录';
    $('.dialog-heading [data-close-employee-payroll]', form).setAttribute('aria-label', '关闭薪酬变更记录');
    $('#save-employee-payroll').hidden = true;
    $('#save-employee-payroll').disabled = true;
    $('.dialog-footer [data-close-employee-payroll]', form).textContent = '关闭';
    body.innerHTML = `<dl class="employee-identity">${[['工号', employee.employeeNo], ['姓名', employee.name], ['部门', employee.department], ['职位', employee.job]].map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="employee-history-count">共 0 条变更记录</p><div class="employee-history-empty">暂无薪酬变更记录</div>`;
    dialog.showModal();
    document.documentElement.classList.add('employee-payroll-open');
    body.scrollTop = 0;
    $('.dialog-footer [data-close-employee-payroll]', form).focus({ preventScroll: true });
  }
  function select(key, label, options) {
    return `<div class="field"><label for="ep-${key}"><span class="required">*</span>${label}</label><select id="ep-${key}" name="${key}" required>${options.map(([value, text]) => `<option value="${value}" ${draft[key] === value ? 'selected' : ''}>${text}</option>`).join('')}</select></div>`;
  }
  const yesNo = [['no', '否'], ['yes', '是']];
  function check(key, label) {
    return `<label class="check-label"><input id="ep-${key}" name="${key}" type="checkbox" ${draft[key] ? 'checked' : ''}>${label}</label>`;
  }
  function openEditor(employee, canEdit = false, options = {}) {
    if (!employee) return;
    editorOptions = options;
    editing = employee;
    viewOnly = !canEdit;
    returnFocus = options.returnFocus || (canEdit ? `[data-employee-edit="${employee.id}"]` : `[data-employee-view="${employee.id}"]`);
    draft = { ...emptySettings(), ...structuredClone(employee.compensation) };
    dirty = false;
    $('#employee-payroll-title').textContent = options.title || (viewOnly ? '查看发薪项目' : '修改薪酬信息');
    $('.dialog-heading [data-close-employee-payroll]', form).setAttribute('aria-label', options.title ? `关闭${options.title}` : '关闭发薪项目编辑');
    $('#save-employee-payroll').textContent = options.saveLabel || '保存';
    $('#save-employee-payroll').hidden = viewOnly;
    $('#save-employee-payroll').disabled = viewOnly;
    $('.dialog-footer [data-close-employee-payroll]', form).textContent = viewOnly ? '关闭' : '取消';
    body.innerHTML = `${options.headerHTML || ''}<dl class="employee-identity" ${options.noEmployee ? 'hidden' : ''}>${[['工号', employee.employeeNo], ['姓名', employee.name], ['部门', employee.department], ['职位', employee.job]].map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      <div id="employee-payroll-error" class="form-error-summary" role="alert" hidden></div>
      <section class="employee-pay-section" data-pay-section="monthly" aria-labelledby="ep-monthly-title"><h3 id="ep-monthly-title">月薪</h3>
        <div class="employee-monthly-row">${numeric('monthlySalary', '月薪', '元', { min: 0.01 })}${select('monthlySplit', '月薪是否拆分', yesNo)}<fieldset id="ep-split-details" class="employee-fields-inline">${select('monthlySplitMode', '拆分方式', [['ratio', '按比例拆分'], ['amount', '按金额拆分']])}<fieldset id="ep-split-ratio" class="employee-fields-inline">${numeric('fixedRatio', '固定工资比例', '%', { max: 100 })}${numeric('performanceRatio', '绩效工资比例', '%', { max: 100 })}</fieldset><fieldset id="ep-split-amount" class="employee-fields-inline">${numeric('fixedAmount', '固定工资金额', '元')}${numeric('performanceAmount', '绩效工资金额', '元')}</fieldset></fieldset></div>
        <div class="employee-split-result" id="ep-split-result" hidden></div>
      </section>
      <section class="employee-pay-section" data-pay-section="bonus" aria-labelledby="ep-bonus-title"><h3 id="ep-bonus-title">绩效与奖金目标</h3>${bonusTypes.map(([key, label]) => `<div class="employee-bonus-row">${select(`${key}Enabled`, `是否有${label}`, yesNo)}<fieldset class="employee-fields-inline" id="ep-${key}-details">${select(`${key}Mode`, '目标填写方式', [['amount', '目标金额'], ['months', '目标月数']])}<fieldset class="employee-fields-inline" id="ep-${key}-amount">${numeric(`${key}Amount`, '目标金额', '元', { min: 0.01 })}</fieldset><fieldset class="employee-fields-inline" id="ep-${key}-months">${numeric(`${key}Months`, '目标月数', '个月', { min: 0.01, max: 120 })}</fieldset></fieldset></div>`).join('')}</section>
      ${signingBonusSection(employee, options)}
      <section class="employee-pay-section" data-pay-section="long-term" aria-labelledby="ep-long-term-title"><h3 id="ep-long-term-title">长期激励</h3>${check('longTermEnabled', '是否有长期激励')}<fieldset id="ep-long-term-details" class="employee-conditional employee-long-term-fields">${numeric('longTermShares', '目标股数', 'ADS / 四年', { min: 1, step: '1' })}</fieldset></section>${options.footerHTML || ''}`;
    $('#ep-monthlySalary').readOnly = viewOnly || !options.monthlyEditable;
    $$('.employee-pay-section', body).forEach(section => {
      section.hidden = !!options.noEmployee || !!options.hideCompensation;
    });
    editableKeys = viewOnly ? [] : $$('[name]', body).map(control => control.name).filter(key => !signingKeys.has(key) && (options.monthlyEditable || key !== 'monthlySalary'));
    $$('[name]', body).forEach(control => control.addEventListener(control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'input', () => {
      if (viewOnly || !editableKeys.includes(control.name)) return;
      draft[control.name] = control.type === 'checkbox' ? control.checked : control.value;
      control.setCustomValidity('');
      dirty = true;
      $('#employee-payroll-error').hidden = true;
      syncFields(control.name);
    }));
    syncFields('open');
    options.onOpen?.();
    dialog.showModal();
    document.documentElement.classList.add('employee-payroll-open');
    body.scrollTop = 0;
    (options.focusTarget ? $(options.focusTarget, body) : viewOnly ? $('.dialog-footer [data-close-employee-payroll]', form) : $('.employee-pay-section:not([hidden]) input:not(:disabled), .employee-pay-section:not([hidden]) select:not(:disabled)', body))?.focus({ preventScroll: true });
  }
  function showGroup(id, visible) {
    const element = $(`#${id}`);
    element.hidden = !visible;
    if (element.tagName === 'FIELDSET') element.disabled = !visible;
  }
  function syncFields(changed) {
    const split = draft.monthlySplit === 'yes';
    showGroup('ep-split-details', split);
    showGroup('ep-split-ratio', split && draft.monthlySplitMode === 'ratio');
    showGroup('ep-split-amount', split && draft.monthlySplitMode === 'amount');
    for (const [key] of bonusTypes) {
      const enabled = draft[`${key}Enabled`] === 'yes';
      showGroup(`ep-${key}-details`, enabled);
      showGroup(`ep-${key}-amount`, enabled && draft[`${key}Mode`] === 'amount');
      showGroup(`ep-${key}-months`, enabled && draft[`${key}Mode`] === 'months');
    }
    showGroup('ep-long-term-details', draft.longTermEnabled);
    const result = $('#ep-split-result');
    result.hidden = !split || !!splitIssue();
    if (!result.hidden) {
      const total = cents(draft.monthlySalary);
      const fixed = draft.monthlySplitMode === 'ratio' ? Math.round(total * Number(draft.fixedRatio) / 100) : cents(draft.fixedAmount);
      result.textContent = `固定工资 ${money(fixed / 100)}　绩效工资 ${money((total - fixed) / 100)}`;
    }
    $$('.employee-pay-section', body).forEach(section => {
      $$('input, select', section).forEach(control => { control.disabled = viewOnly || section.hidden; });
    });
    editorOptions.onChange?.(getDraftCompensation());
  }
  const cents = value => Math.round(Number(value) * 100);
  const validNumber = (value, min = 0, max = 999999999) => String(value ?? '').trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max && Math.abs(Number(value) * 100 - cents(value)) < 0.00001;
  function splitIssue() {
    if (!validNumber(draft.monthlySalary, 0.01)) return '请填写有效的月薪。';
    if (draft.monthlySplit !== 'yes') return '';
    if (draft.monthlySplitMode === 'ratio') {
      if (!validNumber(draft.fixedRatio, 0, 100) || !validNumber(draft.performanceRatio, 0, 100) || cents(draft.fixedRatio) + cents(draft.performanceRatio) !== 10000) return '固定工资和绩效工资比例合计须为 100%。';
    } else if (!validNumber(draft.fixedAmount) || !validNumber(draft.performanceAmount) || cents(draft.fixedAmount) + cents(draft.performanceAmount) !== cents(draft.monthlySalary)) return '固定工资和绩效工资金额合计须等于月薪。';
    return '';
  }
  function validationIssue() {
    const split = splitIssue();
    if (split) return { message: split, target: draft.monthlySplit === 'yes' ? '#ep-monthlySplit' : '#ep-monthlySalary' };
    return null;
  }
  function save() {
    if (!editing || !draft || viewOnly) return;
    const externalIssue = editorOptions.beforeValidate?.();
    if (externalIssue) { showError(externalIssue.message, externalIssue.target); return; }
    if (!dirty) { closeEditor(); toast('薪酬未发生变化'); return; }
    const invalid = $$('input, select, textarea', form).find(control => !control.disabled && !control.closest('fieldset:disabled') && !control.validity.valid);
    if (invalid) { invalid.focus(); invalid.reportValidity(); return; }
    const issue = validationIssue();
    if (issue) { const message = $('#employee-payroll-error'); message.hidden = false; message.textContent = issue.message; $(issue.target).focus(); message.scrollIntoView({ block: 'nearest' }); return; }
    const compensation = structuredClone(editing.compensation);
    editableKeys.forEach(key => { compensation[key] = structuredClone(draft[key]); });
    if (editorOptions.onSave) { editorOptions.onSave(compensation); return; }
    const changes = compensationChanges(editing.compensation, compensation);
    if (!changes.length) { closeEditor(); toast('薪酬未发生变化'); return; }
    const changedAt = stamp();
    const record = { id: crypto.randomUUID(), changedAt, before: structuredClone(editing.compensation), after: structuredClone(compensation), changes, signingBonus: getSigningBonus(editing) };
    const latest = loadEmployees();
    if (loadError) { toast('读取最新薪酬信息失败，请刷新后重试。', true); return; }
    const current = latest.find(row => row.id === editing.id);
    if (!current || JSON.stringify(current.compensation) !== JSON.stringify(editing.compensation) || JSON.stringify(current.history || []) !== JSON.stringify(editing.history || [])) {
      toast('该员工薪酬已在其他页面更新，请刷新后重新编辑。', true); return;
    }
    const next = latest.map(row => row.id === editing.id ? { ...row, compensation, updatedAt: changedAt, history: [...(row.history || []), record] } : row);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { toast('保存失败，请检查浏览器本地存储后重试。', true); return; }
    employees = next; dirty = false; renderRows(); closeEditor(); toast('薪酬已更新，已生成一条变更记录');
  }
  function closeEditor(restoreFocus = true) {
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('employee-payroll-open');
    editing = null; draft = null; dirty = false;
    editorOptions = {};
    body.replaceChildren();
    if (restoreFocus && returnFocus) $(returnFocus, app)?.focus({ preventScroll: true });
  }
  function requestClose() {
    if (dirty) openDialog(editorOptions.closeTitle || '放弃发薪项目修改？', '<p>当前有尚未保存的修改。</p>', () => { closeEditor(); }, '放弃修改', true);
    else closeEditor();
  }
  form.addEventListener('submit', event => { event.preventDefault(); save(); });
  $$('[data-close-employee-payroll]').forEach(button => button.addEventListener('click', requestClose));
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  function getDraftCompensation() {
    if (!draft) return null;
    const compensation = structuredClone(draft);
    return compensation;
  }
  function showError(message, target) {
    const error = $('#employee-payroll-error');
    error.textContent = message; error.hidden = false;
    if (target) $(target, body)?.focus();
    error.scrollIntoView({ block: 'nearest' });
  }
  return {
    render, closeEditor, openEditor, emptySettings, compensationChanges, getDraftCompensation, getSigningBonus, legacySigningBonus, showError,
    markDirty: () => { dirty = true; },
    getEmployees: () => {
      loadError = false;
      const latest = loadEmployees();
      if (loadError) throw new Error('员工薪酬信息读取失败');
      return structuredClone(latest);
    },
    unsavedTitle: () => editorOptions.closeTitle || '放弃发薪项目修改？',
    hasUnsavedChanges: () => dialog.open && dirty
  };
};
