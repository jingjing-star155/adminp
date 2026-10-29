'use strict';

window.createSalaryMaintenance = ({ app, esc, money, stamp, toast, openDialog, employeePayroll }) => {
  const $ = selector => app.querySelector(selector);
  const $$ = selector => [...app.querySelectorAll(selector)];
  const tabs = [['monthly', '月薪结构'], ['quarterly', '季度绩效'], ['halfYear', '半年度绩效'], ['annual', '年终奖'], ['equity', '期权']];
  let employees = [], employee = null, draft = null, initial = '', date = '', initialDate = '', active = 'monthly', dirty = false;
  const cents = value => Math.round(Number(value) * 100);
  const number = (key, label, unit = '元', min = 0, max = 999999999) => `<div class="field"><label for="sm-${key}"><span class="required">*</span>${label}</label><div class="sm-input-unit"><input id="sm-${key}" name="${key}" type="number" value="${esc(draft[key] ?? '')}" min="${min}" max="${max}" step="0.01" required><span>${unit}</span></div></div>`;
  const select = (key, label, options) => `<div class="field"><label for="sm-${key}">${label}</label><select id="sm-${key}" name="${key}">${options.map(([value, text]) => `<option value="${value}" ${draft[key] === value ? 'selected' : ''}>${text}</option>`).join('')}</select></div>`;
  const info = (label, value) => `<div><dt>${label}</dt><dd>${esc(value || '—')}</dd></div>`;
  function render() {
    dirty = false;
    try { employees = employeePayroll.getEmployees(); }
    catch (error) {
      app.innerHTML = `<div class="breadcrumb">首页 / 薪酬管理 / 薪酬信息维护</div><section class="sm-page"><h1>薪酬信息维护</h1><p role="alert">${esc(error.message)}</p><button class="button" id="sm-retry">重新载入</button></section>`;
      $('#sm-retry').onclick = render; return;
    }
    employee = employees.find(row => row.id === employee?.id) || employees[0] || null;
    if (!employee) { app.innerHTML = '<section class="sm-page"><h1>薪酬信息维护</h1><p>暂无员工薪酬数据，请先补充员工信息。</p></section>'; return; }
    loadEmployee(employee);
  }
  function loadEmployee(row) {
    employee = structuredClone(row);
    draft = { ...employeePayroll.emptySettings(), ...structuredClone(row.compensation) };
    initial = JSON.stringify(draft); date = row.effectiveDate || stamp().slice(0, 10); initialDate = date; dirty = false;
    app.innerHTML = `<div class="breadcrumb">首页 <span>/</span> 薪酬管理 <span>/</span><span class="current">薪酬信息维护</span></div>
      <section class="sm-page" aria-labelledby="sm-title">
        <header class="sm-heading"><div><h1 id="sm-title">薪酬信息维护</h1><p>维护员工薪酬组成与激励方案</p></div><span class="sm-tag">${employee.demo ? '演示员工' : '员工薪酬'}</span></header>
        <div class="sm-employee-picker"><label for="sm-search">查找员工</label><input type="search" id="sm-search" placeholder="搜索工号、姓名、部门或职位"><select id="sm-employee" aria-label="选择员工"></select><span id="sm-search-count"></span></div>
        <div class="sm-identity"><div class="sm-person"><span class="sm-avatar" aria-hidden="true">${esc(row.name.slice(0, 1))}</span><div><strong>${esc(row.name)}</strong><span>${esc(row.job)}</span></div></div><dl>${info('员工 ID', row.employeeNo)}${info('所属部门', row.department)}${info('入职日期', row.hireDate)}</dl></div>
        <form id="sm-form" novalidate>
          <section class="sm-details" aria-labelledby="sm-details-title"><div class="sm-section-heading"><h2 id="sm-details-title">薪酬详细信息</h2><button type="button" class="sm-text-button" id="sm-history">变更记录（${row.history?.length || 0}）</button></div>
            <div class="sm-metadata"><div class="field"><label for="sm-effectiveDate"><span class="required">*</span>生效日期</label><input id="sm-effectiveDate" type="date" required min="1900-01-01" max="9999-12-31" value="${esc(date)}"></div><dl>${info('币种', 'CNY · 人民币')}${info('月薪频率', 'M · 每月')}${info('最近维护', row.updatedAt || '尚未维护')}</dl></div>
            <p class="sm-note">生效日期用于记录本次变更；保存后立即更新当前薪酬。</p>
          </section>
          <div class="sm-components"><div class="sm-section-heading"><h2>薪酬组成</h2><span>金额单位：人民币元</span></div>
            <div class="sm-tabs" role="tablist" aria-label="薪酬维护项目">${tabs.map(([key, label], index) => `<button type="button" role="tab" id="sm-tab-${key}" data-sm-tab="${key}" aria-controls="sm-panel-${key}" aria-selected="false" tabindex="-1"><span class="sm-tab-index">0${index + 1}</span>${label}<small id="sm-tab-summary-${key}"></small></button>`).join('')}</div>
            <div id="sm-error" class="sm-error" role="alert" hidden></div>
            <section class="sm-panel" id="sm-panel-monthly" role="tabpanel" aria-labelledby="sm-tab-monthly">
              <div class="sm-panel-title"><h3>月薪结构</h3><p>设置月薪总额及固定工资、绩效工资的组成。</p></div>
              <div class="sm-fields">${number('monthlySalary', '月薪总额', '元 / 月', 0.01)}${select('monthlySplit', '是否拆分月薪', [['no', '不拆分'], ['yes', '拆分为固定工资与绩效工资']])}<fieldset id="sm-split-fields">${select('monthlySplitMode', '拆分方式', [['ratio', '按比例拆分'], ['amount', '按金额拆分']])}</fieldset></div>
              <fieldset id="sm-ratios" class="sm-fields sm-split-inputs">${number('fixedRatio', '固定工资比例', '%', 0, 100)}${number('performanceRatio', '绩效工资比例', '%', 0, 100)}</fieldset>
              <fieldset id="sm-amounts" class="sm-fields sm-split-inputs">${number('fixedAmount', '固定工资金额')}${number('performanceAmount', '绩效工资金额')}</fieldset>
              <div class="sm-table-wrap"><table class="sm-structure-table"><thead><tr><th scope="col">薪酬项目</th><th scope="col">金额</th><th scope="col">占月薪比例</th><th scope="col">币种</th><th scope="col">频率</th></tr></thead><tbody><tr><th scope="row">固定工资</th><td id="sm-fixed-value"></td><td id="sm-fixed-percent"></td><td>CNY</td><td>每月</td></tr><tr><th scope="row">绩效工资</th><td id="sm-performance-value"></td><td id="sm-performance-percent"></td><td>CNY</td><td>每月</td></tr></tbody><tfoot><tr><th scope="row">月薪合计</th><td id="sm-monthly-total"></td><td id="sm-total-percent"></td><td>CNY</td><td>每月</td></tr></tfoot></table></div><p class="sm-note" id="sm-split-note"></p>
            </section>
            ${tabs.slice(1, 4).map(([key, label]) => `<section class="sm-panel" id="sm-panel-${key}" role="tabpanel" aria-labelledby="sm-tab-${key}" hidden><div class="sm-panel-title"><h3>${label}</h3><p>维护每${key === 'quarterly' ? '季度' : key === 'halfYear' ? '半年度' : '年'}的奖金目标；实际发放以绩效结果及公司政策为准。</p></div><div class="sm-fields">${select(`${key}Enabled`, `是否有${label}`, [['no', '无'], ['yes', '有']])}<fieldset id="sm-${key}-details">${select(`${key}Mode`, '目标填写方式', [['amount', '目标金额'], ['months', '目标月数']])}<fieldset id="sm-${key}-amount">${number(`${key}Amount`, '目标金额', '元', 0.01)}</fieldset><fieldset id="sm-${key}-months">${number(`${key}Months`, '目标月数', '个月', 0.01, 120)}</fieldset></fieldset></div><div class="sm-bonus-preview"><span>${label}目标金额</span><strong id="sm-${key}-preview"></strong><p id="sm-${key}-formula"></p></div></section>`).join('')}
            <section class="sm-panel" id="sm-panel-equity" role="tabpanel" aria-labelledby="sm-tab-equity" hidden><div class="sm-panel-title"><h3>期权</h3><p>记录授予数量、归属安排及其他约定，期权不计入现金薪酬。</p></div><label class="sm-checkbox"><input type="checkbox" name="longTermEnabled" id="sm-longTermEnabled" ${draft.longTermEnabled ? 'checked' : ''}>是否有期权</label><fieldset id="sm-equity-details"><div class="field"><label for="sm-longTermShares"><span class="required">*</span>期权内容</label><textarea id="sm-longTermShares" name="longTermShares" required placeholder="请填写授予数量、归属周期及相关约定">${esc(draft.longTermShares || '')}</textarea></div></fieldset><p class="sm-note" id="sm-equity-empty">当前未设置期权。勾选后可维护期权内容。</p></section>
          </div>
          <footer class="sm-footer"><span id="sm-save-state" role="status"></span><div><button class="button" type="button" id="sm-reset">重新载入</button><button class="button primary" type="submit" id="sm-save">保存修改</button></div></footer>
        </form>
      </section>`;
    renderEmployeeOptions('');
    $('#sm-search').addEventListener('input', e => renderEmployeeOptions(e.target.value));
    $('#sm-employee').addEventListener('change', e => {
      const next = employees.find(item => item.id === e.target.value);
      e.target.value = employee.id;
      if (next) confirmDiscard(() => loadEmployee(next));
    });
    $('#sm-reset').onclick = () => confirmDiscard(render);
    $('#sm-history').onclick = () => employeePayroll.openHistory(employee);
    $('#sm-form').addEventListener('submit', e => { e.preventDefault(); save(); });
    $$('[name]').forEach(control => control.addEventListener(control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'input', () => {
      draft[control.name] = control.type === 'checkbox' ? control.checked : control.value;
      control.setCustomValidity(''); $('#sm-error').hidden = true; markDirty(); sync();
    }));
    $('#sm-effectiveDate').addEventListener('input', e => { date = e.target.value; $('#sm-error').hidden = true; markDirty(); });
    $$('[data-sm-tab]').forEach(button => {
      button.onclick = () => showTab(button.dataset.smTab);
      button.onkeydown = e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const index = tabs.findIndex(([key]) => key === active);
        showTab(tabs[e.key === 'Home' ? 0 : e.key === 'End' ? 4 : (index + (e.key === 'ArrowRight' ? 1 : 4)) % 5][0]);
        $(`#sm-tab-${active}`).focus();
      };
    });
    showTab(active); sync(); markDirty();
  }
  function renderEmployeeOptions(query) {
    const found = employees.filter(row => [row.employeeNo, row.name, row.department, row.job].some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
    const list = found.some(row => row.id === employee.id) ? found : [employee, ...found];
    $('#sm-employee').innerHTML = list.map(row => `<option value="${esc(row.id)}" ${row.id === employee.id ? 'selected' : ''}>${esc(row.employeeNo)} · ${esc(row.name)}${!found.includes(row) ? '（当前员工）' : ''}</option>`).join('');
    $('#sm-search-count').textContent = found.length ? `匹配 ${found.length} 位员工` : '未找到匹配员工';
  }
  function confirmDiscard(callback) {
    if (dirty) openDialog('放弃薪酬信息修改？', '<p>当前有尚未保存的修改，继续后将丢失这些内容。</p>', callback, '放弃修改', true);
    else callback();
  }
  function markDirty() {
    dirty = JSON.stringify(draft) !== initial || date !== initialDate;
    $('#sm-save-state').textContent = dirty ? '有未保存的修改' : employee.updatedAt ? '已载入当前薪酬信息' : '待维护 · 保存后生成变更记录';
    $('#sm-save-state').classList.toggle('is-dirty', dirty);
  }
  function showTab(key) {
    active = key;
    tabs.forEach(([id]) => {
      const selected = id === key;
      $(`#sm-tab-${id}`).setAttribute('aria-selected', String(selected));
      $(`#sm-tab-${id}`).tabIndex = selected ? 0 : -1;
      $(`#sm-panel-${id}`).hidden = !selected;
    });
  }
  function group(id, visible) { const el = $(`#sm-${id}`); el.hidden = !visible; el.disabled = !visible; }
  function splitIssue() {
    if (!draft.monthlySalary || !Number.isFinite(Number(draft.monthlySalary)) || Number(draft.monthlySalary) <= 0) return '请填写有效的月薪总额。';
    if (draft.monthlySplit !== 'yes') return '';
    if (draft.monthlySplitMode === 'ratio') {
      if (draft.fixedRatio === '' || draft.performanceRatio === '' || cents(draft.fixedRatio) + cents(draft.performanceRatio) !== 10000) return '固定工资与绩效工资比例合计须为 100%。';
    } else if (draft.fixedAmount === '' || draft.performanceAmount === '' || cents(draft.fixedAmount) + cents(draft.performanceAmount) !== cents(draft.monthlySalary)) return '固定工资与绩效工资金额合计须等于月薪总额。';
    return '';
  }
  function sync() {
    const split = draft.monthlySplit === 'yes', ratio = draft.monthlySplitMode === 'ratio';
    group('split-fields', split); group('ratios', split && ratio); group('amounts', split && !ratio);
    const total = cents(draft.monthlySalary), issue = splitIssue();
    const fixed = !split ? total : ratio ? Math.round(total * Number(draft.fixedRatio) / 100) : cents(draft.fixedAmount);
    const performance = !split ? 0 : ratio ? total - fixed : cents(draft.performanceAmount);
    $('#sm-fixed-value').textContent = issue ? '—' : money(fixed / 100);
    $('#sm-performance-value').textContent = issue ? '—' : money(performance / 100);
    $('#sm-fixed-percent').textContent = issue ? '—' : `${(fixed / total * 100).toFixed(2)}%`;
    $('#sm-performance-percent').textContent = issue ? '—' : `${(performance / total * 100).toFixed(2)}%`;
    $('#sm-monthly-total').textContent = Number.isFinite(total) && total > 0 ? money(total / 100) : '—';
    $('#sm-total-percent').textContent = issue ? '—' : '100.00%';
    $('#sm-split-note').textContent = issue || (split ? '固定工资 + 绩效工资 = 月薪总额。' : '不拆分时，月薪全额计入固定工资。');
    $('#sm-split-note').classList.toggle('sm-warning', !!issue);
    $('#sm-tab-summary-monthly').textContent = Number.isFinite(total) && total > 0 ? `${money(total / 100)} / 月` : '待填写';
    for (const [key] of tabs.slice(1, 4)) {
      const enabled = draft[`${key}Enabled`] === 'yes', months = draft[`${key}Mode`] === 'months';
      group(`${key}-details`, enabled); group(`${key}-amount`, enabled && !months); group(`${key}-months`, enabled && months);
      const value = draft[`${key}${months ? 'Months' : 'Amount'}`];
      const amount = months ? Math.round(total * Number(value)) / 100 : Number(value);
      const ready = value !== '' && Number.isFinite(amount) && amount > 0;
      const formatted = !enabled ? '未设置' : ready ? money(amount) : '待填写';
      $(`#sm-${key}-preview`).textContent = formatted; $(`#sm-tab-summary-${key}`).textContent = formatted;
      $(`#sm-${key}-formula`).textContent = !enabled ? '选择“有”后填写奖金目标。' : months ? `月薪 ${money(Number(draft.monthlySalary) || 0)} × ${value || '—'} 个月` : '按所填目标金额记录。';
    }
    group('equity-details', !!draft.longTermEnabled);
    $('#sm-equity-empty').hidden = !!draft.longTermEnabled;
    $('#sm-tab-summary-equity').textContent = draft.longTermEnabled ? '已启用' : '未设置';
  }
  function error(message, target) {
    $('#sm-error').textContent = message; $('#sm-error').hidden = false;
    if (target) {
      const control = $(target), panel = control.closest('[role="tabpanel"]');
      if (panel) showTab(panel.id.replace('sm-panel-', ''));
      control.focus();
    }
    $('#sm-error').scrollIntoView({ block: 'nearest' });
  }
  function save() {
    const invalid = $$('#sm-form input, #sm-form select, #sm-form textarea').find(control => !control.disabled && !control.closest('fieldset:disabled') && !control.validity.valid);
    if (invalid) { error('请检查必填项和数值范围；金额、比例及月数最多保留两位小数。', `#${invalid.id}`); invalid.reportValidity(); return; }
    const issue = splitIssue();
    if (issue) { error(issue, '#sm-monthlySalary'); return; }
    if (draft.longTermEnabled && !String(draft.longTermShares).trim()) { error('请填写期权内容。', '#sm-longTermShares'); return; }
    if (!dirty && employee.effectiveDate) { toast('薪酬信息未发生变化'); return; }
    try {
      const saved = employeePayroll.saveMaintenance(employee, draft, date);
      render(); toast(saved ? '薪酬信息已保存，已生成一条变更记录' : '薪酬信息未发生变化');
    } catch (err) { error(err.message); }
  }
  return { render, hasUnsavedChanges: () => !!$('#sm-form') && dirty, close: () => { dirty = false; } };
};
