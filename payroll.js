/* Payroll pages share the existing shell and locally saved Offer records. */
'use strict';
window.createPayrollManagement = ({ app, escapeHTML: esc, icon, money, stamp, toast, openDialog, navigate, getOffers, statuses, signingPayments }) => {
  const $ = (selector, root = app) => root.querySelector(selector);
  const $$ = (selector, root = app) => [...root.querySelectorAll(selector)];
  const agreementURL = 'https://docs.oa.wanmei.net/weboffice/l/sd17qyPSFI2rJ';
  const ledgerFilter = { search: '', status: '', page: 1, pageSize: 10 };
  let expandedOffer = null;

  function pageShell(title, id, actions, filter, placeholder, options, group = '薪酬管理') {
    app.innerHTML = `<div class="breadcrumb">首页 <span>/</span> ${group} <span>/</span> <span class="current">${title}</span></div>
      <section class="list-panel payroll-page" id="${id}" aria-label="${title}">
        <div class="payroll-page-heading"><h1>${title}</h1>${actions}</div>
        <div class="payroll-filters"><div class="search-field">${icon('search')}<input type="search" id="payroll-search" value="${esc(filter.search)}" placeholder="${placeholder}" aria-label="${placeholder}"></div>
          ${options.length ? `<label class="payroll-filter">状态<select id="payroll-status">${options.map(([value, label]) => `<option value="${esc(value)}" ${filter.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}
        </div><div id="payroll-results"></div>
      </section>`;
  }
  function bindFilters(filter, renderRows) {
    $('#payroll-search').addEventListener('input', event => { filter.search = event.target.value; filter.page = 1; renderRows(); });
    $('#payroll-status')?.addEventListener('change', event => { filter.status = event.target.value; filter.page = 1; renderRows(); });
  }
  function paginate(rows, filter) {
    const pages = Math.max(1, Math.ceil(rows.length / filter.pageSize));
    filter.page = Math.min(filter.page, pages);
    return { slice: rows.slice((filter.page - 1) * filter.pageSize, filter.page * filter.pageSize), pages };
  }
  function pagination(count, pages, filter) {
    return `<div class="pagination"><span role="status">共 ${count} 条</span><select id="payroll-page-size" aria-label="每页条数">${[10, 20, 50].map(n => `<option value="${n}" ${filter.pageSize === n ? 'selected' : ''}>${n} 条 / 页</option>`).join('')}</select><button class="icon-button" id="payroll-prev" aria-label="上一页" ${filter.page === 1 ? 'disabled' : ''}>${icon('chevron-left')}</button><span class="page-number">${filter.page}</span><span>/ ${pages}</span><button class="icon-button" id="payroll-next" aria-label="下一页" ${filter.page >= pages ? 'disabled' : ''}>${icon('chevron-right')}</button></div>`;
  }
  function bindPagination(filter, renderRows) {
    $('#payroll-page-size').addEventListener('change', event => { filter.pageSize = Number(event.target.value); filter.page = 1; renderRows(); });
    $('#payroll-prev').addEventListener('click', () => { filter.page--; renderRows(); });
    $('#payroll-next').addEventListener('click', () => { filter.page++; renderRows(); });
  }
  const emptyState = (title, description) => `<div class="empty-state">${icon('inbox')}<strong>${title}</strong><p>${description}</p></div>`;
  const employeePayroll = window.createEmployeePayroll({ app, esc, icon, money, stamp, toast, openDialog, pageShell, bindFilters, paginate, pagination, bindPagination, emptyState, getOfferSigningBonus });
  const renderProjects = employeePayroll.render;
  const salaryChange = window.createSalaryChange({ app, esc, icon, money, stamp, toast, openDialog, employeePayroll, pageShell, bindFilters, paginate, pagination, bindPagination, emptyState });

  function signingPlan(record) {
    const raw = Array.isArray(record.signingSchedule) ? record.signingSchedule : [];
    const count = Number(record.signingPeriods ?? (raw.length || 2));
    const validCount = Number.isInteger(count) && count >= 1 && count <= 60;
    const schedule = Array.from({ length: validCount ? count : 0 }, (_, index) => ({ months: String(raw[index]?.months ?? ''), ratio: String(raw[index]?.ratio ?? '') }));
    const validAmount = Number.isFinite(Number(record.signingBonus)) && Number(record.signingBonus) > 0 && Number(record.signingBonus) <= 999999999;
    const validRows = schedule.every(row => row.months !== '' && Number.isSafeInteger(Number(row.months)) && Number(row.months) >= 0 && row.ratio !== '' && Number.isFinite(Number(row.ratio)) && Number(row.ratio) >= 0.01 && Number(row.ratio) <= 100 && Math.abs(Number(row.ratio) * 100 - Math.round(Number(row.ratio) * 100)) < 0.000001);
    const complete = validCount && validAmount && validRows && schedule.reduce((sum, row) => sum + Math.round(Number(row.ratio) * 100), 0) === 10000;
    return { count: validCount ? count : null, schedule, complete, validAmount, payments: signingPayments(record.signingBonus, schedule) };
  }
  function paymentMonth(startDate, offset) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '') || offset === '' || !Number.isSafeInteger(Number(offset)) || Number(offset) < 0) return '待完善';
    const [year, month, day] = startDate.split('-').map(Number);
    if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return '待完善';
    const index = year * 12 + month - 1 + Number(offset);
    if (!Number.isSafeInteger(index)) return '待完善';
    return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  }
  function getOfferSigningBonus(employee) {
    if (!employee?.id) return null;
    const offers = getOffers();
    const offerId = employee.sourceOfferId || employee.offerId;
    let candidates;
    if (offerId) candidates = offers.filter(offer => offer.id === offerId);
    else {
      candidates = offers.filter(offer => offer.employeeId === employee.id || offer.employeeNo && offer.employeeNo === employee.employeeNo);
      // The ten existing demonstration employees correspond to the ten seeded Offers.
      if (!candidates.length && employee.demo === true && /^employee-81000[1-9]$|^employee-810010$/.test(employee.id) && employee.id === `employee-${employee.employeeNo}`) {
        const demoOfferId = `demo-${68687 - (Number(employee.employeeNo) - 810000)}`;
        candidates = offers.filter(offer => offer.id === demoOfferId && offer.demo === true);
      }
    }
    if (candidates.length !== 1) return null;
    const offer = candidates[0];
    const enabled = offer.signingBonusEnabled === true || offer.signingBonusEnabled === 'yes' || (offer.signingBonusEnabled == null && Number(offer.signingBonus) > 0);
    if (!enabled) return { enabled: false, source: 'offer', offerId: offer.id, processNo: offer.processNo };
    if (offer.signingPeriods == null && !offer.signingSchedule?.length) return { enabled: true, source: 'offer', offerId: offer.id, processNo: offer.processNo, total: offer.signingBonus || '', count: null, rows: [], complete: false };
    const plan = signingPlan(offer);
    return {
      enabled: true, source: 'offer', offerId: offer.id, processNo: offer.processNo, total: offer.signingBonus || '', count: plan.count, complete: plan.complete,
      rows: plan.schedule.map((row, index) => ({ offsetMonths: row.months, month: paymentMonth(offer.startDate, row.months), ratio: row.ratio, amount: plan.complete ? (plan.payments[index] / 100).toFixed(2) : '' }))
    };
  }
  function ledgerRecords() {
    return getOffers().filter(record => record.signingBonusEnabled === true || record.signingBonusEnabled === 'yes' || (record.signingBonusEnabled == null && Number(record.signingBonus) > 0));
  }
  function renderLedger() {
    pageShell('签约金台账', 'signing-ledger-page', `<a class="button" href="${agreementURL}" target="_blank" rel="noopener noreferrer">签约金协议</a>`, ledgerFilter, '搜索姓名、部门或流程号', [['', '全部审批状态'], ...['draft', 'pending', 'approved', 'rejected', 'closed'].map(key => [key, statuses[key]])]);
    bindFilters(ledgerFilter, renderLedgerRows);
    renderLedgerRows();
  }
  function renderLedgerRows() {
    const query = ledgerFilter.search.trim().toLowerCase();
    const rows = ledgerRecords().filter(record => (!ledgerFilter.status || record.status === ledgerFilter.status) && (!query || [record.name, record.department, record.processNo].some(value => String(value || '').toLowerCase().includes(query))));
    const { slice, pages } = paginate(rows, ledgerFilter);
    $('#payroll-results').innerHTML = `<div class="table-scroll"><table class="payroll-table signing-ledger-table"><thead><tr>${['流程号', '姓名', '直属部门', '计划入职时间', '签约金总金额', '发放期数', '操作'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${slice.map(record => {
      const plan = signingPlan(record);
      const expanded = expandedOffer === record.id;
      return `<tr class="ledger-record"><td>${esc(record.processNo)}</td><td>${esc(record.name || '未填写')}</td><td>${esc(record.department || '—')}</td><td>${esc(record.startDate || '—')}</td><td>${plan.validAmount ? money(record.signingBonus) : '待填写'}</td><td>${plan.count ? `${plan.count} 期` : '待填写'}</td><td><div class="payroll-row-actions"><button class="link-button" data-ledger-expand="${esc(record.id)}" aria-expanded="${expanded}" aria-controls="schedule-${esc(record.id)}">${expanded ? '收起明细' : '发放明细'}</button><button class="link-button" data-offer-record="${esc(record.id)}">查看签约金协议</button></div></td></tr>
        <tr id="schedule-${esc(record.id)}" class="ledger-detail-row" ${expanded ? '' : 'hidden'}><td colspan="7">${scheduleDetail(record, plan)}</td></tr>`;
    }).join('')}</tbody></table></div>${slice.length ? '' : emptyState('暂无签约金记录', ledgerFilter.search || ledgerFilter.status ? '请调整搜索条件或审批状态。' : '在 Offer 表单勾选「是否有签约金」并保存后，可在此查看发放计划。')}${pagination(rows.length, pages, ledgerFilter)}`;
    $$('[data-ledger-expand]').forEach(button => button.addEventListener('click', () => {
      expandedOffer = expandedOffer === button.dataset.ledgerExpand ? null : button.dataset.ledgerExpand;
      const id = button.dataset.ledgerExpand;
      renderLedgerRows();
      $$('[data-ledger-expand]').find(item => item.dataset.ledgerExpand === id)?.focus({ preventScroll: true });
    }));
    $$('[data-offer-record]').forEach(button => button.addEventListener('click', () => navigate(`#/offers/${encodeURIComponent(button.dataset.offerRecord)}`)));
    bindPagination(ledgerFilter, renderLedgerRows);
  }
  function scheduleDetail(record, plan) {
    return `<div class="ledger-schedule"><div class="ledger-schedule-heading"><strong>${esc(record.name || '候选人')} · 签约金发放计划</strong><span>合同签署公司：${esc(record.company || '—')}</span></div>
      <table class="ledger-schedule-table"><thead><tr><th scope="col">期次</th><th scope="col">发放月份</th><th scope="col">预计发薪月份</th><th scope="col">发放比例</th><th scope="col">计划发放金额</th></tr></thead><tbody>${plan.schedule.map((row, index) => {
        const validMonth = row.months !== '' && Number.isSafeInteger(Number(row.months)) && Number(row.months) >= 0;
        return `<tr><td>第 ${index + 1} 期</td><td>${validMonth ? Number(row.months) === 0 ? '入职当月' : `入职满 ${Number(row.months)} 个月` : '待填写'}</td><td>${paymentMonth(record.startDate, row.months)}</td><td>${row.ratio !== '' ? `${esc(row.ratio)}%` : '待填写'}</td><td>${plan.complete ? money(plan.payments[index] / 100) : '待完善'}</td></tr>`;
      }).join('')}</tbody><tfoot><tr><th scope="row" colspan="3">合计</th><td>${plan.complete ? '100%' : '待完善'}</td><td>${plan.complete ? money(plan.payments.reduce((sum, value) => sum + value, 0) / 100) : '待完善'}</td></tr></tfoot></table>
      ${plan.complete ? '' : '<p class="ledger-plan-note">请在 Offer 表单完善签约金总金额、发放期数和各期安排。</p>'}</div>`;
  }
  return { renderProjects, renderLedger, renderApplications: salaryChange.render, hasUnsavedChanges: employeePayroll.hasUnsavedChanges, unsavedTitle: employeePayroll.unsavedTitle, closeEditor: employeePayroll.closeEditor };
};
