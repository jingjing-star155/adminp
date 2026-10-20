/* Job salary standards are maintained locally, separately from employee compensation history. */
'use strict';
window.createJobData = ({ app, esc, money, stamp, toast, openDialog, pageShell, bindFilters, paginate, pagination, bindPagination, emptyState }) => {
  const storageKey = 'hongen-job-salary-standards-v1';
  const names = ['产品经理', '前端开发工程师', '后端开发工程师', '测试工程师', '视觉设计师', '课程教研专家', '品牌营销经理', '内容策划', '招聘专员', '财务分析师'];
  const defaults = names.map((name, index) => ({ id: `job-${index + 1}`, code: `JOB${String(index + 1).padStart(3, '0')}`, name, fixedSalaryAmount: '', performanceSalaryAmount: '', updatedAt: '' }));
  const filter = { search: '', page: 1, pageSize: 10 };
  const dialog = document.querySelector('#job-data-dialog');
  const form = document.querySelector('#job-data-form');
  const field = key => form.elements.namedItem(key);
  let editing = null, original = '', dirty = false, returnFocus = null;

  function read() {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(stored) || stored.some(row => !row || typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.code !== 'string') || new Set(stored.map(row => row.id)).size !== stored.length) throw new Error('Invalid job data');
    const rows = new Map(defaults.map(row => [row.id, { ...row }]));
    for (const row of stored) rows.set(row.id, row);
    return [...rows.values()];
  }
  function options() {
    try { return read(); }
    catch { toast('职务数据读取失败，请检查浏览器存储后重试。', true); return defaults.map(row => ({ ...row })); }
  }
  function standard(row) {
    if(row.salaryStandard!==undefined&&row.salaryStandard!=='')return Number(row.salaryStandard);
    if (row.fixedSalaryAmount === '' || row.performanceSalaryAmount === '') return null;
    return (Math.round(Number(row.fixedSalaryAmount) * 100) + Math.round(Number(row.performanceSalaryAmount) * 100)) / 100;
  }
  function render() {
    pageShell('职务数据维护', 'job-data-page', '<button type="button" class="button primary" id="add-job">新增职务</button>', filter, '搜索职务名称或编码', []);
    app.querySelector('#add-job').addEventListener('click', () => openEditor());
    bindFilters(filter, renderRows);
    renderRows();
  }
  function renderRows() {
    let rows;
    try { rows = read(); }
    catch { app.querySelector('#payroll-results').innerHTML = emptyState('职务数据读取失败', '请检查浏览器存储后重试，原有记录不会被覆盖。'); return; }
    const query = filter.search.trim().toLowerCase();
    rows = rows.filter(row => !query || [row.name, row.code].some(value => value.toLowerCase().includes(query)));
    const { slice, pages } = paginate(rows, filter);
    app.querySelector('#payroll-results').innerHTML = `<p class="job-data-note">绩效工资 = 薪资标准 − 固定工资。维护后，Offer 选择对应职务可带出金额；已保存的 Offer 保留原金额。</p>
      <div class="table-scroll"><table class="payroll-table job-data-table"><thead><tr>${['职务编码', '职务名称', '固定工资', '绩效工资', '薪资标准', '更新时间', '操作'].map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${slice.map(row => `<tr><td>${esc(row.code)}</td><td>${esc(row.name)}</td><td>${row.fixedSalaryAmount === '' ? '未维护' : money(row.fixedSalaryAmount)}</td><td>${row.performanceSalaryAmount === '' ? '未维护' : money(row.performanceSalaryAmount)}</td><td>${standard(row) === null ? '—' : money(standard(row))}</td><td>${esc(row.updatedAt || '—')}</td><td><button type="button" class="link-button" data-edit-job="${esc(row.id)}">编辑</button></td></tr>`).join('')}</tbody></table></div>
      ${slice.length ? '' : emptyState('暂无匹配职务', '请调整搜索条件或新增职务。')}${pagination(rows.length, pages, filter)}`;
    app.querySelectorAll('[data-edit-job]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.editJob)));
    bindPagination(filter, renderRows);
  }
  function openEditor(id) {
    let rows;
    try { rows = read(); } catch { toast('职务数据读取失败，无法编辑。', true); return; }
    const row = rows.find(item => item.id === id);
    if (id && !row) { toast('该职务已变更，请刷新列表。', true); return; }
    editing = row ? { ...row, salaryStandard: standard(row) ?? '' } : { id: crypto.randomUUID(), code: '', name: '', salaryStandard: '', fixedSalaryAmount: '', performanceSalaryAmount: '' };
    original = row ? JSON.stringify(row) : '';
    dirty = false; returnFocus = document.activeElement;
    document.querySelector('#job-data-title').textContent = row ? '编辑职务' : '新增职务';
    const input = (key, label, type = 'text', readonly = false) => `<div class="field"><label for="job-${key}">${readonly ? '' : '<span class="required">*</span>'}${label}</label><input id="job-${key}" name="${key}" type="${type}" value="${esc(editing[key] ?? '')}" ${readonly ? 'readonly' : 'required'} ${type === 'number' ? 'min="0" max="999999999" step="0.01" inputmode="decimal"' : 'maxlength="100"'}></div>`;
    document.querySelector('#job-data-body').innerHTML = `<div class="fields">${input('code', '职务编码', 'text', !!row)}${input('name', '职务名称')}${input('salaryStandard', '薪资标准（元）', 'number')}${input('fixedSalaryAmount', '固定工资（元）', 'number')}${input('performanceSalaryAmount', '绩效工资（元）', 'number', true)}</div><p class="job-data-note">绩效工资 = 薪资标准 − 固定工资，自动计算。不拆分绩效时，固定工资填写薪资标准的全额。</p>`;
    updateStandard(); dialog.showModal();
    field(row ? 'salaryStandard' : 'code').focus();
  }
  function updateStandard() {
    const salary=field('salaryStandard').value,fixed=field('fixedSalaryAmount').value;
    field('performanceSalaryAmount').value=salary===''||fixed===''?'':((Math.round(Number(salary)*100)-Math.round(Number(fixed)*100))/100).toFixed(2);
  }
  function closeEditor(confirm = true) {
    if (!dialog.open) return;
    if (confirm && dirty) { openDialog('放弃职务数据修改？', '<p>当前有尚未保存的修改。</p>', () => closeEditor(false), '放弃修改', true); return; }
    dialog.close(); editing = null; dirty = false;
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  form.addEventListener('input', event => { dirty = true; event.target.setCustomValidity?.(''); field('fixedSalaryAmount').setCustomValidity(''); field('salaryStandard').setCustomValidity(''); updateStandard(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!editing || !form.reportValidity()) return;
    const data = { ...editing, code: field('code').value.trim(), name: field('name').value.trim(), salaryStandard: field('salaryStandard').value, fixedSalaryAmount: field('fixedSalaryAmount').value, performanceSalaryAmount: field('performanceSalaryAmount').value };
    for (const key of ['code', 'name']) if (!data[key]) { field(key).setCustomValidity('请填写有效内容'); field(key).reportValidity(); return; }
    const total = standard(data);
    if (!Number.isFinite(total) || total <= 0 || total > 999999999) { field('salaryStandard').setCustomValidity('薪资标准须大于 0，且不超过 999999999 元'); field('salaryStandard').reportValidity(); return; }
    if(Math.round(Number(data.fixedSalaryAmount)*100)>Math.round(total*100)){field('fixedSalaryAmount').setCustomValidity('固定工资不能超过薪资标准');field('fixedSalaryAmount').reportValidity();return;}
    try {
      const rows = read(), latest = rows.find(row => row.id === data.id);
      if ((latest ? JSON.stringify(latest) : '') !== original) { toast('此职务已被其他页面修改，请关闭后重新编辑。', true); return; }
      for (const key of ['code', 'name']) if (rows.some(row => row.id !== data.id && row[key].trim().toLowerCase() === data[key].toLowerCase())) { field(key).setCustomValidity('该职务' + (key === 'code' ? '编码' : '名称') + '已存在'); field(key).reportValidity(); return; }
      const updated = { ...data, salaryStandard: total, updatedAt: stamp() };
      const next = latest ? rows.map(row => row.id === data.id ? updated : row) : [...rows, updated];
      localStorage.setItem(storageKey, JSON.stringify(next));
      closeEditor(false); renderRows(); toast('职务数据已保存');
    } catch { toast('职务数据保存失败，请检查浏览器存储后重试。', true); }
  });
  form.querySelectorAll('[data-close-job]').forEach(button => button.addEventListener('click', () => closeEditor()));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  return { render, options, closeEditor, hasUnsavedChanges: () => dialog.open && dirty };
};
