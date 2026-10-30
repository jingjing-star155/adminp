/* Standalone Offer workflow prototype. All records and attachments stay in this browser. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const storageKey = 'hongen-offer-records-v1';
  // Paused until the user provides detailed job maintenance requirements.
  const jobDataEnabled = false;
  const defaultJobNames = ['产品经理','前端开发工程师','后端开发工程师','测试工程师','视觉设计师','课程教研专家','品牌营销经理','内容策划','招聘专员','财务分析师'];
  const statuses = {unsaved:'未保存',draft:'已保存',pending:'审批中',approved:'已完成',rejected:'已退回',closed:'已关闭'};
  const sectionNames = ['候选人基本信息','组织架构信息','编制与招聘信息','职务信息','薪资信息','薪资对比','入职附件'];
  const icons = {
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    'chevron-down':'<path d="m6 9 6 6 6-6"/>','chevron-right':'<path d="m9 6 6 6-6 6"/>','chevron-left':'<path d="m15 6-6 6 6 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',flow:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M15 6h3v6M6 12v6h6M15 9l3 3 3-3"/>',
    check:'<path d="m5 12 4 4L19 6"/>','check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    files:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',
    back:'<path d="m12 5-7 7 7 7M5 12h14"/>',save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 16V3m-5 5 5-5 5 5"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v13m-5-5 5 5 5-5"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    inbox:'<path d="m4 4-2 10v6h20v-6L20 4ZM2 14h6l2 3h4l2-3h6"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.files}</svg>`;
  const paintIcons = () => $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const money = value => `¥ ${Number(value || 0).toLocaleString('zh-CN', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const number = value => Number(value) || 0;
  const stamp = () => new Date().toLocaleString('sv-SE').replace('T',' ');
  const departments = {
    '产品研发部':{code:'RD-010',path:'洪恩 / 研发中心 / 产品研发部',manager:'张经理',business:'教育产品事业部',budget:32,active:27,joining:2,internBudget:6,internActive:3,internJoining:1},
    '内容教研部':{code:'ED-020',path:'洪恩 / 内容中心 / 内容教研部',manager:'李经理',business:'数字内容事业部',budget:24,active:21,joining:1,internBudget:4,internActive:2,internJoining:0},
    '市场营销部':{code:'MK-030',path:'洪恩 / 商业中心 / 市场营销部',manager:'王经理',business:'教育产品事业部',budget:18,active:15,joining:1,internBudget:4,internActive:2,internJoining:1},
    '人力资源部':{code:'HR-040',path:'洪恩 / 职能中心 / 人力资源部',manager:'陈经理',business:'集团职能',budget:12,active:10,joining:1,internBudget:2,internActive:1,internJoining:0},
    '财务管理部':{code:'FN-050',path:'洪恩 / 职能中心 / 财务管理部',manager:'赵经理',business:'集团职能',budget:10,active:8,joining:0,internBudget:2,internActive:1,internJoining:0}
  };
  const fileTypes = [{key:'resume',label:'个人简历',required:true},{key:'salaryProof',label:'薪资证明',required:true},{key:'background',label:'背调报告'},{key:'other',label:'其他附件'}];
  const seedRows = [
    ['68686','林晓雨','产品研发部','产品经理','2026-10-12','draft','女'],
    ['68685','陈嘉言','内容教研部','课程教研专家','2026-10-09','rejected','女'],
    ['68684','周予安','市场营销部','品牌营销经理','2026-10-12','draft','男'],
    ['68683','许知远','产品研发部','前端开发工程师','2026-10-08','draft','男'],
    ['68682','苏念','人力资源部','招聘专员','2026-09-28','pending','女'],
    ['68681','程一帆','产品研发部','测试工程师','2026-09-28','pending','男'],
    ['68680','顾思琪','财务管理部','财务分析师','2026-09-25','pending','女'],
    ['68679','陆星河','内容教研部','内容策划','2026-09-21','pending','男'],
    ['68678','温予宁','产品研发部','视觉设计师','2026-09-21','approved','女'],
    ['68677','宋奕辰','市场营销部','用户运营','2026-09-18','closed','男']
  ];
  const bonusItems = [
    {key:'quarterlyBonus',label:'季度绩效',period:'季度',times:4,monthsKey:'quarterlyBonusMonths',output:'quarterlyAnnual'},
    {key:'halfYearBonus',label:'半年度绩效',period:'半年',times:2,monthsKey:'halfYearBonusMonths',output:'halfYearAnnual'},
    {key:'annualBonus',label:'年终奖',period:'年度',times:1,monthsKey:'bonusMonths',output:'offerBonus'}
  ];
  const blankData = () => ({approvalLevel:'普通员工',monthlySplit:'no',monthlySplitMode:'amount',quarterlyBonusEnabled:'',halfYearBonusEnabled:'',annualBonusEnabled:'',attachments:{},interviewResult:'',rehire:false,superiorReferral:false,signingBonusEnabled:false,signingPeriods:2,signingSchedule:[],equityEnabled:false,equityContent:''});
  const demoSigningBonuses = {
    'demo-68686': { signingBonusEnabled: true, signingBonus: '20000', signingPeriods: 2, signingSchedule: [{ months: '6', ratio: '50' }, { months: '12', ratio: '50' }] },
    'demo-68680': { signingBonusEnabled: true, signingBonus: '12000', signingPeriods: 3, signingSchedule: [{ months: '0', ratio: '30' }, { months: '6', ratio: '30' }, { months: '12', ratio: '40' }] },
    'demo-68678': { signingBonusEnabled: true, signingBonus: '30000', signingPeriods: 1, signingSchedule: [{ months: '6', ratio: '100' }] }
  };
  const initialRecords = () => seedRows.map(([id,name,department,job,startDate,status,gender],i) => ({
    ...blankData(),id:`demo-${id}`,processNo:id,name,department,job,title:job,startDate,status,gender,demo:true,
    submittedAt:['draft','rejected'].includes(status)?'':`2026-09-${String(14-i%5).padStart(2,'0')} 10:30:00`,
    updatedAt:'2026-09-14 10:30:00',operator:status==='pending'?'用人部门负责人':status==='approved'?'流程结束':'HR 管理员',
    email:`candidate${i+1}@example.com`,idNumber:'',education:'本科',workYears:3+i,previousCompany:'示例科技有限公司',leaveReason:'职业发展',
    departmentCode:departments[department].code,departmentPath:departments[department].path,manager:departments[department].manager,business:departments[department].business,
    company:'洪恩（北京）教育科技有限公司',city:'北京',office:'北京办公区',recruitReason:'新增编制',source:'社会招聘',employeeType:'正式员工',probation:'6个月',role:'9-非管理',family:'技术群',payrollGroup:'北京月薪组',career:'专业序列',attendance:'洪恩10:00',grade:'12',
    probationSalary:18000+i*500,regularSalary:20000+i*500,monthlySplit:'yes',monthlySplitMode:'ratio',fixedSalaryRatio:80,performanceSalaryRatio:20,quarterlyBonusEnabled:'no',halfYearBonusEnabled:'no',annualBonusEnabled:'yes',annualBonusType:'months',bonusMonths:2,offerBonus:(20000+i*500)*2,meal:350,transport:0,communication:100,previousSalary:18000,previousBonus:36000,interviewResult:'通过',
    rejectReason:status==='rejected'?'请补充完整薪资证明后重新提交。':'',notes:status==='closed'?'候选人因个人安排放弃入职。':'',
    ...structuredClone(demoSigningBonuses[`demo-${id}`] || {})
  }));
  let storageAvailable = true;
  let storageLoadIssue = false;
  function loadRecords() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialRecords();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some(r => !r || !r.id || !r.processNo || !r.status)) throw new Error('Invalid records');
      // Supplement only untouched older demonstration Offers in memory; saved records stay intact.
      return parsed.map(record => {
        const signing = demoSigningBonuses[record.id];
        const untouched = record.demo === true && record.updatedAt === '2026-09-14 10:30:00';
        if (!signing || !untouched || record.signingBonusEnabled === true || record.signingBonusEnabled === 'yes' || Number(record.signingBonus) > 0 || record.signingSchedule?.length) return record;
        return { ...record, ...structuredClone(signing) };
      });
    } catch { storageLoadIssue = true; return initialRecords(); }
  }
  let records = loadRecords();
  let filter = {tab:'todo',search:'',page:1,pageSize:6};
  let currentRecord = null;
  let readOnly = false;
  let dirty = false;
  let activeRoute = location.hash || '#/offers';
  let dialogAction = null;
  let attachmentBusy = 0;
  let toastTimer;
  let dbPromise;
  const app = $('#app');
  const offerDialog = $('#offer-dialog');
  const formHost = $('#offer-modal-body');
  let modalReturnFocus = '#add-candidate';
  let modalReturnScroll = 0;
  let offerReturnRoute = '#/offers';
  let signingScheduleDraft = [];
  const payrollManagement = window.createPayrollManagement({ app, escapeHTML, icon, money, stamp, toast, openDialog, navigate, getOffers: () => loadRecords(), statuses, signingPayments });
  function toast(message, error = false) {
    clearTimeout(toastTimer);
    const el = $('#toast'); el.textContent = message; el.classList.toggle('error',error); el.hidden = false;
    if(el.matches(':popover-open'))el.hidePopover();
    el.showPopover();
    toastTimer = setTimeout(() => { if(el.matches(':popover-open'))el.hidePopover();el.hidden = true; },4500);
  }
  function commitRecords(nextRecords) {
    try {localStorage.setItem(storageKey, JSON.stringify(nextRecords));records=nextRecords;storageAvailable=true;return true;}
    catch {storageAvailable=false;toast('保存失败：浏览器本地存储不可用或空间不足，请保留当前页面。',true);return false;}
  }
  function nextProcessNo() { return String(Math.max(68686,...records.map(r => number(r.processNo)))+1); }
  const badge = status => `<span class="status ${escapeHTML(status)}">${escapeHTML(statuses[status] || status)}</span>`;
  const inTab = (record, tab) => tab === 'all' || (tab === 'todo' && ['draft','rejected'].includes(record.status)) || (tab === 'ongoing' && record.status === 'pending') || (tab === 'done' && ['approved','closed'].includes(record.status));
  function filteredRecords() { const query=filter.search.trim().toLowerCase();return records.filter(r => inTab(r,filter.tab) && (!query || [r.name,r.processNo,r.job,r.department].some(v=>String(v||'').toLowerCase().includes(query)))); }
  function closeOfferForm() {
    const closingModal = offerDialog.open;
    if(closingModal){
      offerDialog.close();document.documentElement.classList.remove('offer-modal-open');
      $('#offer-modal-header').replaceChildren();formHost.replaceChildren();$('#offer-modal-footer').replaceChildren();
    }
    currentRecord=null;readOnly=false;dirty=false;
    return closingModal;
  }
  function renderList() {
    const closingModal = closeOfferForm();
    app.innerHTML = `<div class="breadcrumb">首页 <span>/</span> 招聘自助 <span>/</span> <span class="current">Offer管理</span></div>
      <section class="list-panel" aria-label="Offer流程列表"><div class="list-panel-header"><div class="tab-bar" role="tablist" aria-label="流程分类">${[['todo','待操作'],['ongoing','进行中'],['done','已完成'],['all','全部']].map(([key,label])=>`<button class="tab ${filter.tab===key?'active':''}" role="tab" id="tab-${key}" aria-selected="${filter.tab===key}" aria-controls="list-results" data-tab="${key}">${label}<span class="tab-count">${records.filter(r=>inTab(r,key)).length}</span></button>`).join('')}</div><button class="button primary" id="add-candidate">${icon('plus')}添加候选人</button></div>
      <div class="filters"><div class="search-field">${icon('search')}<input id="search" type="search" value="${escapeHTML(filter.search)}" placeholder="搜索候选人、职位或流程号" aria-label="搜索候选人、职位或流程号"></div><div class="filters-note"><span></span>含示例数据 · 记录保存在当前浏览器</div></div><div id="list-results" role="tabpanel" aria-labelledby="tab-${filter.tab}"></div></section>`;
    $('#add-candidate').addEventListener('click',()=>navigate('#/offers/new'));
    $$('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{filter.tab=btn.dataset.tab;filter.page=1;renderList();}));
    $('.tab-bar').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('[data-tab]');let index=tabs.indexOf(document.activeElement);index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;const key=tabs[index].dataset.tab;filter.tab=key;filter.page=1;renderList();$(`[data-tab="${key}"]`).focus();});
    $('#search').addEventListener('input',event=>{filter.search=event.target.value;filter.page=1;renderRows();});
    renderRows();
    if(closingModal){window.scrollTo(0,modalReturnScroll);$(modalReturnFocus)?.focus({preventScroll:true});}
  }
  function renderRows() {
    const rows=filteredRecords();const pages=Math.max(1,Math.ceil(rows.length/filter.pageSize));filter.page=Math.min(filter.page,pages);
    const slice=rows.slice((filter.page-1)*filter.pageSize,filter.page*filter.pageSize);
    $('#list-results').innerHTML=`<div class="table-scroll"><table class="offer-table"><thead><tr>
      <th scope="col">流程号</th><th scope="col">直属部门</th><th scope="col">招聘职位</th><th scope="col">姓名</th><th scope="col">计划入职时间</th><th scope="col">提交时间</th><th scope="col">当前操作人</th><th scope="col">审批单状态</th><th scope="col">下一步操作</th><th scope="col">Reject</th><th scope="col">调整报到时间</th><th scope="col">详情</th>
    </tr></thead><tbody>${slice.map(r=>{
      const editable=['draft','rejected'].includes(r.status);
      const actionable=['draft','rejected','pending'].includes(r.status);
      return `<tr>
        <td>${escapeHTML(r.processNo)}</td>
        <td>${escapeHTML(r.department)}</td>
        <td>${escapeHTML(r.job)}</td>
        <td>${escapeHTML(r.name)}</td>
        <td>${escapeHTML((r.startDate||'').replace(/-/g,'/'))}</td>
        <td>${escapeHTML(r.submittedAt?.slice(0,10))}${r.submittedAt?`<span class="submission-time">${escapeHTML(r.submittedAt.slice(11,16))}</span>`:''}</td>
        <td>${escapeHTML(r.operator)}</td>
        <td>${escapeHTML(statuses[r.status]||r.status)}</td>
        <td><div class="next-step-actions">${actionable?`<button class="link-button" data-record-action="close" data-record-id="${escapeHTML(r.id)}">流程关闭</button>`:''}${editable?`<button class="link-button" data-edit="${escapeHTML(r.id)}">重新提交</button>`:''}</div></td>
        <td>${actionable?`<button class="link-button" data-record-action="reject" data-record-id="${escapeHTML(r.id)}">Reject</button>`:''}</td>
        <td><button class="link-button" data-record-action="date" data-record-id="${escapeHTML(r.id)}" aria-label="调整${escapeHTML(r.name||'候选人')}的报到时间，${escapeHTML(r.startDate||'未设置')}">${escapeHTML(r.startDate||'设置日期')}</button></td>
        <td><button class="link-button" data-detail="${escapeHTML(r.id)}">详情</button></td>
      </tr>`;
    }).join('')}</tbody></table></div>${slice.length?'':`<div class="empty-state">${icon('inbox')}<strong>暂无符合条件的流程</strong><p>调整筛选条件，或点击「添加候选人」发起新的 Offer</p></div>`}<div class="pagination"><span role="status">共 ${rows.length} 条${rows.length?`，第 ${(filter.page-1)*filter.pageSize+1}–${Math.min(filter.page*filter.pageSize,rows.length)} 条`:''}</span><select id="page-size" aria-label="每页条数">${[6,10,20].map(n=>`<option value="${n}" ${filter.pageSize===n?'selected':''}>${n} 条 / 页</option>`).join('')}</select><button class="icon-button" id="prev-page" aria-label="上一页" ${filter.page===1?'disabled':''}>${icon('chevron-left')}</button><span class="page-number">${filter.page}</span><span>/ ${pages}</span><button class="icon-button" id="next-page" aria-label="下一页" ${filter.page>=pages?'disabled':''}>${icon('chevron-right')}</button></div>`;
    $$('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>navigate(`#/offers/${btn.dataset.edit}/edit`)));
    $$('[data-detail]').forEach(btn=>btn.addEventListener('click',()=>navigate(`#/offers/${btn.dataset.detail}`)));
    $$('[data-record-action]').forEach(btn=>btn.addEventListener('click',()=>{
      const record=records.find(r=>r.id===btn.dataset.recordId);
      if(record)openRecordAction(record,btn.dataset.recordAction);
    }));
    $('#page-size').addEventListener('change',e=>{filter.pageSize=number(e.target.value);filter.page=1;renderRows();});
    $('#prev-page').addEventListener('click',()=>{filter.page--;renderRows();});
    $('#next-page').addEventListener('click',()=>{filter.page++;renderRows();});
  }
  function openDialog(title, html, callback, label='确认', danger=false) {
    $('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;$('#dialog-confirm').textContent=label;$('#dialog-confirm').className=`button ${danger?'danger':'primary'}`;dialogAction=callback;$('#action-dialog').showModal();
  }
  $$('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>$('#action-dialog').close()));
  $('#dialog-form').addEventListener('submit',async event=>{event.preventDefault();if(!event.target.reportValidity())return;const result=await dialogAction?.();if(result!==false)$('#action-dialog').close();});
  function openRecordAction(record,action) {
    if(['reject','close'].includes(action)&&!['draft','rejected','pending'].includes(record.status))return;
    if(action==='date')openDialog('调整报到时间',`<p>候选人：${escapeHTML(record.name)} · 流程 ${escapeHTML(record.processNo)}</p><div class="field"><label for="new-start-date"><span class="required">*</span>新的报到日期</label><input type="date" id="new-start-date" value="${escapeHTML(record.startDate)}" required></div>`,()=>updateListRecord(record,{startDate:$('#new-start-date').value},'报到时间已更新'),'保存');
    if(action==='reject')openDialog('退回流程（Reject）',`<p>退回后，该流程将进入「待操作」，可补充资料后重新提交。</p><div class="field"><label for="action-reason"><span class="required">*</span>退回原因</label><textarea id="action-reason" required maxlength="500" placeholder="请输入需要补充或调整的内容"></textarea></div>`,()=>{const reason=$('#action-reason').value.trim();if(!reason){$('#action-reason').setCustomValidity('请填写退回原因');$('#action-reason').reportValidity();$('#action-reason').oninput=()=>$('#action-reason').setCustomValidity('');return false;}return updateListRecord(record,{status:'rejected',rejectReason:reason,operator:'HR 管理员'},'流程已退回');},'确认退回');
    if(action==='close')openDialog('关闭Offer流程',`<p>确认关闭「${escapeHTML(record.name)}」的录用流程？关闭后可在「已完成」中查看。</p><div class="field"><label for="action-reason"><span class="required">*</span>关闭原因</label><textarea id="action-reason" required maxlength="500" placeholder="请输入关闭原因"></textarea></div>`,()=>{const reason=$('#action-reason').value.trim();if(!reason){toast('请填写关闭原因',true);return false;}return updateListRecord(record,{status:'closed',closeReason:reason,operator:'流程结束'},'流程已关闭');},'确认关闭',true);
  }
  function updateListRecord(record,patch,message) {if(!commitRecords(records.map(r=>r.id===record.id?{...r,...patch,updatedAt:stamp()}:r)))return false;renderList();toast(message);return true;}

  function field(key,label,config={}) {
    const {type='text',required=false,options=null,placeholder='',readonly=false,suffix='',hint='',full=false,list='',crKey='',min=0,max=999999999,step=0.01,preserveValue=false}=config;
    const val=currentRecord[key]??'';const attrs=`id="f-${key}" name="${key}" ${required?'required':''} ${readonly?'readonly':''} ${list?`list="${list}"`:''}`;
    let control;
    if(options){
      const legacyOption=preserveValue&&val!==''&&!options.some(item=>String(Array.isArray(item)?item[0]:item)===String(val))?`<option value="${escapeHTML(val)}" selected hidden>${escapeHTML(val)}</option>`:'';
      control=`<select ${attrs}>${readonly?'':'<option value="">请选择</option>'}${options.map(item=>{const [value,text]=Array.isArray(item)?item:[item,item];return `<option value="${escapeHTML(value)}" ${String(val)===String(value)?'selected':''}>${escapeHTML(text)}</option>`;}).join('')}${legacyOption}</select>`;
    }
    else if(type==='textarea')control=`<textarea ${attrs} maxlength="3000" placeholder="${escapeHTML(placeholder)}">${escapeHTML(val)}</textarea>`;
    else control=`<input ${attrs} type="${type}" value="${escapeHTML(val)}" placeholder="${escapeHTML(placeholder|| (readonly?'自动带出':`请输入${label}`))}" ${type==='number'?`min="${min}" max="${max}" step="${step}" inputmode="decimal"`:''} ${type==='text'?'maxlength="100"':''}>`;
    let controlMarkup=suffix?`<div class="control-wrap">${control}<span class="control-suffix">${suffix}</span></div>`:control;
    if(crKey)controlMarkup=`<div class="salary-with-cr">${controlMarkup}<div class="salary-cr"><label for="f-${crKey}">CR值</label><div class="control-wrap"><input id="f-${crKey}" name="${crKey}" type="text" value="${escapeHTML(currentRecord[crKey]??'')}" readonly aria-label="${escapeHTML(label)} CR 值" placeholder="—"></div></div></div>`;
    return `<div class="field ${full?'full-width':''}" data-field="${key}"><label for="f-${key}">${required?'<span class="required">*</span>':''}${label}</label>${controlMarkup}${hint?`<span class="hint">${hint}</span>`:''}</div>`;
  }
  const f=field;
  const selectField=(key,label,options,required=false,extra={})=>f(key,label,{options,required,...extra});
  const amountField=(key,label,extra={})=>f(key,label,{type:'number',suffix:'元',...extra});
  const check=(key,label)=>`<label class="check-label"><input type="checkbox" id="f-${key}" name="${key}" ${currentRecord[key]?'checked':''}>${label}</label>`;
  const section=(id,title,body,subtitle='')=>`<section class="form-card" id="section-${id}"><div class="section-heading"><span class="section-mark"></span><h2>${title}</h2>${subtitle?`<span class="section-subtitle">${subtitle}</span>`:''}</div>${body}</section>`;
  function normalizeSalaryRules(data) {
    // Convert a copy on open; persisted drafts are untouched until the user saves.
    const oldBase=number(data.employeeType==='实习生'&&data.internSalary!==undefined?data.internSalary:(data.salaryStandard??data.regularSalary));
    data.regularSalary=data.salaryStandard=oldBase||data.salaryStandard||data.regularSalary||'';
    const ratios=String(data.salaryRatio||'100:0').split(':');
    if(data.monthlySplit===undefined)data.monthlySplit=number(ratios[1])>0?'yes':'no';
    if(!data.monthlySplit)data.monthlySplit='no';
    if(data.monthlySplit==='yes'&&data.monthlySplitMode!=='amount'){
      const fixedRatio=number(data.fixedSalaryRatio??ratios[0]);
      data.fixedSalaryAmount=(Math.round(oldBase*fixedRatio)/100).toFixed(2);
      data.performanceSalaryAmount=((Math.round(oldBase*100)-Math.round(oldBase*fixedRatio))/100).toFixed(2);
    }else if(data.fixedSalaryAmount===undefined||(data.monthlySplit==='no'&&data.salaryRulesVersion!==2)){
      data.fixedSalaryAmount=oldBase?String(oldBase):'';
    }
    data.monthlySplitMode='amount';
    if(data.monthlySplit==='no')data.performanceSalaryAmount='0';
    for(const item of bonusItems){
      if(data[item.key+'Enabled']===undefined){
        if(item.key!=='annualBonus')data[item.key+'Enabled']='no';
        else {
          const hasAmount=data.offerBonus!==undefined&&data.offerBonus!=='';
          const months=number(data.bonusMonths);
          data.annualBonusEnabled=(hasAmount?number(data.offerBonus)>0:months>0)?'yes':'no';
          data.annualBonusType=months>0&&(!hasAmount||Math.round(oldBase*months*100)===Math.round(number(data.offerBonus)*100))?'months':'amount';
          data.annualBonusAmount=hasAmount?data.offerBonus:'';
        }
      }
      if(item.key!=='annualBonus'){
        if(data[item.key+'Type']==='months')data[item.key+'Amount']=oldBase>0?(Math.round(oldBase*number(data[item.monthsKey])*100)/100).toFixed(2):'';
        data[item.key+'Type']='amount';
      }
    }
  }
  function monthlySalaryModule() {
    return `<section class="salary-submodule" id="monthly-salary-module" aria-labelledby="monthly-salary-title">
      <div class="salary-subheading"><h3 id="monthly-salary-title">月薪结构</h3></div>
      <div class="monthly-rule-controls amount-only-controls">${selectField('monthlySplit','月薪是否拆分',[['no','否'],['yes','是']],true)}
        ${amountField('fixedSalaryAmount','固定工资金额',{required:true,placeholder:'请输入固定工资金额'})}
        <fieldset id="monthly-split-details" class="salary-rule-details">${amountField('performanceSalaryAmount','绩效工资金额',{readonly:true,placeholder:'自动计算'})}</fieldset>
      </div>
      <p class="salary-rule-hint" id="monthly-split-basis">绩效工资 = 薪资标准 − 固定工资；不拆分时全部计入固定工资。</p>
      <p class="salary-rule-hint" id="job-salary-source" hidden></p>
      <div id="monthly-split-error" class="salary-rule-error" role="alert" hidden></div>
      <div class="salary-breakdown" id="monthly-split-summary" aria-live="polite"></div>
    </section>`;
  }
  function performanceBonusModule() {
    return `<section class="salary-submodule" id="performance-bonus-module" aria-labelledby="performance-bonus-title">
      <div class="salary-subheading"><h3 id="performance-bonus-title">绩效与奖金目标</h3></div>
      ${bonusItems.map(item=>`<div class="bonus-rule" id="${item.key}-rule">
        <div class="bonus-rule-controls">${selectField(item.key+'Enabled','是否有'+item.label,[['no','否'],['yes','是']],true)}
        <fieldset id="${item.key}-details" class="bonus-rule-details">
          ${item.key==='annualBonus'?selectField('annualBonusType','年终奖填写方式',[['amount','金额'],['months','月数']]):''}
          ${amountField(item.key+'Amount',item.label+'目标金额',{min:0.01,placeholder:'请输入金额',hint:item.key==='annualBonus'?'填写全年年终奖目标金额。':'填写每'+item.period+'的发放金额，年度按 '+item.times+' 次计算。'})}
          ${item.key==='annualBonus'?f('bonusMonths','年终奖目标月数',{type:'number',min:0.01,suffix:'个月',placeholder:'请输入月数',hint:'年终奖金额 = 薪资标准 × 目标月数。'}):''}
        </fieldset></div>
        <div class="bonus-target-summary" id="${item.key}-summary" aria-live="polite"></div>
      </div>`).join('')}
    </section>`;
  }
  function signingBonusModule() {
    return `<section class="signing-bonus-module" id="signing-bonus-module" aria-labelledby="signing-bonus-title"><h3 id="signing-bonus-title">签约金</h3><div class="signing-toggle">${check('signingBonusEnabled','是否有签约金')}</div><fieldset id="signing-bonus-details" class="signing-bonus-details"><div class="signing-settings"><div class="signing-amount-row">${amountField('signingBonus','签约金总金额',{placeholder:'请输入'})}<a class="link-button" id="preview-signing-agreement" href="https://docs.oa.wanmei.net/weboffice/l/sd17qyPSFI2rJ" target="_blank" rel="noopener noreferrer" title="在新标签页打开签约金协议">签约金协议预览</a></div>${f('signingPeriods','发放期数',{type:'number',placeholder:'请输入',suffix:'期'})}</div><p class="signing-rhythm"><strong>发放节奏：</strong><span>*各期签约金计入下表中所列对应月份工资，随该月工资发放。</span></p><div class="signing-table-wrap"><table class="signing-table"><thead><tr><th scope="col">发放月份</th><th scope="col">发放比例（%）</th><th scope="col">发放金额</th></tr></thead><tbody id="signing-schedule-rows"></tbody><tfoot><tr><th scope="row">合计</th><td><output id="signing-ratio-total">—</output></td><td><output id="signing-amount-total">—</output></td></tr></tfoot></table></div><div class="signing-schedule-error" id="signing-schedule-error" role="alert" hidden></div></fieldset></section>`;
  }
  function equityModule() {
    return `<section class="signing-bonus-module equity-module" id="equity-module" aria-labelledby="equity-title"><h3 id="equity-title">期权</h3><div class="signing-toggle">${check('equityEnabled','是否有期权')}</div><div class="signing-settings equity-settings"><fieldset id="equity-details" class="signing-bonus-details equity-details">${f('equityContent','期权内容',{type:'textarea',placeholder:'请输入期权内容'})}</fieldset></div></section>`;
  }
  function renderForm(record,detail=false) {
    if(!offerDialog.open){
      const fromLedger=!!$('#signing-ledger-page',app);
      offerReturnRoute=fromLedger?'#/payroll/signing-bonus':'#/offers';
      if(!fromLedger&&!$('.list-panel[aria-label="Offer流程列表"]',app))renderList();
      modalReturnScroll=window.scrollY;
      const trigger=document.activeElement;
      modalReturnFocus=trigger?.dataset.offerRecord?`[data-offer-record="${CSS.escape(trigger.dataset.offerRecord)}"]`:trigger?.dataset.edit?`[data-edit="${CSS.escape(trigger.dataset.edit)}"]`:trigger?.dataset.detail?`[data-detail="${CSS.escape(trigger.dataset.detail)}"]`:'#add-candidate';
    }
    currentRecord=structuredClone(record);normalizeSalaryRules(currentRecord);readOnly=detail;dirty=false;
    currentRecord.signingBonusEnabled=record.signingBonusEnabled??number(record.signingBonus)>0;
    currentRecord.signingPeriods=record.signingPeriods??(record.signingSchedule?.length||2);
    currentRecord.equityContent=String(record.equityContent??(number(record.equity)>0?`${record.equity} 份`:''));
    currentRecord.equityEnabled=record.equityEnabled==null?!!currentRecord.equityContent.trim():record.equityEnabled===true||record.equityEnabled==='yes';
    signingScheduleDraft=Array.isArray(record.signingSchedule)?record.signingSchedule.map(row=>({months:String(row?.months??''),ratio:String(row?.ratio??'')})):[];
    const editing=records.some(r=>r.id===record.id);const title=detail?'Offer流程详情':editing?'编辑Offer':'发起Offer';
    const basic=`<div class="fields">${f('name','姓名',{required:true})}${selectField('gender','性别',['男','女'],true)}${f('startDate','计划到岗时间',{type:'date',required:true})}${f('email','电子邮件',{type:'email',required:true,placeholder:'用于接收 Offer 的电子邮箱'})}${f('idNumber','证件号码',{required:true,placeholder:'身份证或其他有效证件号码'})}${f('previousCompany','上家公司名称')}${f('workYears','工作年限',{type:'number',suffix:'年'})}${f('lastTitle','最后职称')}${selectField('leaveReason','离职原因',['职业发展','薪酬福利','工作地点','组织调整','个人原因','应届毕业 / 首次就业','其他'],true)}${selectField('education','最高教育程度',['博士','硕士','本科','大专','高中及以下'])}<div class="checks-row full-width">${check('rehire','Rehire 员工（重新雇佣）')}</div></div>`;
    const org=`<div class="fields">${selectField('department','直属部门',Object.keys(departments),true)}${f('departmentCode','部门编码',{readonly:true})}${selectField('business','业务单位',['教育产品事业部','数字内容事业部','集团职能'],true)}${f('departmentPath','各级部门',{readonly:true})}${selectField('company','合同签署公司',['洪恩（北京）教育科技有限公司','洪恩教育科技有限公司'],true)}${selectField('city','地点',['北京','天津','上海','成都','深圳'],true)}${selectField('office','办公地点',currentRecord.city?[`${currentRecord.city}办公区`,'远程办公']:['北京办公区','天津办公区','上海办公区','成都办公区','深圳办公区','远程办公'],true)}</div>`;
    const headcount=`<div class="headcount-grid">${[['budget','正式预算编制'],['active','在职人数'],['joining','待入职人数'],['vacancy','空余编制'],['internBudget','实习生预算编制'],['internActive','在职实习生'],['internJoining','实习生待入职人数'],['internVacancy','实习生空余编制']].map(([key,label])=>`<div class="headcount-item ${key.toLowerCase().includes('vacan')?'vacant':''}"><span>${label}</span><output id="hc-${key}">0</output></div>`).join('')}</div><div class="headcount-caption">编制信息随直属部门带出；当前使用演示编制数据。</div><div class="fields">${selectField('recruitReason','招聘理由',['新增编制','人员替换','业务扩张','实习生招聘','其他'],true)}${f('benchmark','对标人',{placeholder:'请输入对标员工姓名'})}${f('replacement','替换人员',{placeholder:'请输入被替换员工姓名'})}${f('replacementDate','替换人员离职日期',{type:'date'})}${selectField('source','录用途径',['社会招聘','校园招聘','内部推荐','猎头推荐','人才库','其他'],true)}<div class="field"><label>推荐信息</label>${check('superiorReferral','上级推荐')}</div></div>`;
    const position=`<div class="fields">${f('manager','直属上级',{readonly:true})}${f('landingManager','登陆计划主管',{placeholder:'请输入主管姓名'})}${selectField('employeeType','员工类别',['正式员工','实习生','劳务人员'],true)}${selectField('probation','试用期',['无试用期','1个月','2个月','3个月','6个月'],true)}${selectField('role','角色类别',['0-实习生','1-管理','9-非管理'],true,{preserveValue:true})}${selectField('payrollGroup','薪资组',['北京月薪组','天津月薪组','上海月薪组','成都月薪组','深圳月薪组','实习生薪资组'],true)}${selectField('family','职务族群',['业务管理类','产品群','商务市场与品牌群','战略投资群','技术群','服务群','综合管理群','设计群'],true,{preserveValue:true})}${selectField('career','职业路径',['专业序列','管理序列','支持序列'],true)}${selectField('approvalLevel','审批级别',['普通员工','部门负责人','高级管理人员'],true)}${f('job','职务',{required:true,list:'jobs',placeholder:'选择或输入招聘职位'})}${f('title','业务头衔',{required:true,placeholder:'将在 Offer 及合同中显示'})}${selectField('attendance','考勤类型',['14综合10:15','不参与考勤','客服/综合工时','洪恩01 10:00','洪恩10:00','洪恩10:30','洪恩10:30B','销售班主任不打卡'],true,{preserveValue:true})}</div>`;
    let mealField=selectField('meal','餐补',[200,300,350,400,450,[0,'无']]);
    // Preserve saved amounts from the previous option list until a new option is chosen.
    if([500,800,1000].includes(number(currentRecord.meal)))mealField=mealField.replace('</select>',`<option value="${escapeHTML(currentRecord.meal)}" selected hidden>${escapeHTML(currentRecord.meal)}</option></select>`);
    const salary=`<div class="fields">${selectField('grade','职级',Array.from({length:12},(_,index)=>index+8),true,{preserveValue:true})}${amountField('regularSalary','薪资标准',{required:true,hint:'填写固定工资与绩效工资的合计金额',crKey:'regularCR'})}</div>
      ${monthlySalaryModule()}${performanceBonusModule()}${signingBonusModule()}${equityModule()}
      <div class="fields">${mealField}${amountField('relocation','搬家费')}${amountField('communication','通讯补贴')}${amountField('housing','住房补贴')}${amountField('transport','交通补助')}</div>`;
    const compareRows=[
      ['固定工资','月薪','previousSalary','monthly'],
      ['年终奖','年终奖','previousBonus','offerBonus'],
      ['TTC','TTC','previousTTC','offerTTC','total'],
      ['餐补','餐补','previousMeal','meal'],
      ['交通补助','交通补助','previousTransport','transport'],
      ['通信补助','通信补助','previousCommunication','communication'],
      ['搬家费','搬家费','previousRelocation','relocation'],
      ['签约金','签约金','previousSigning','signingBonus'],
      ['总计年薪','Offer年薪','previousAnnual','offerAnnual','total']
    ];
    const comparison=`<div class="comparison-wrap"><div class="comparison-scroll"><table class="comparison-table reference-comparison"><colgroup><col class="comparison-label-col"><col class="comparison-value-col"><col class="comparison-label-col"><col class="comparison-value-col"></colgroup><thead><tr><th colspan="2" scope="colgroup">上家公司薪资信息</th><th colspan="2" scope="colgroup">Offer薪资信息</th></tr></thead><tbody>${compareRows.map(([prevLabel,nextLabel,prev,next,total])=>`<tr class="${total?'total-row':''}"><td class="comparison-label">${prevLabel}</td><td>${total?`<output class="money-output" id="calc-${prev}">—</output>`:`<input type="number" name="${prev}" id="f-${prev}" value="${escapeHTML(currentRecord[prev]??'')}" aria-label="上家公司${prevLabel}" min="0" max="999999999" step="0.01" placeholder="0.00">`}</td><td class="comparison-label">${nextLabel}</td><td><output class="money-output" id="calc-${next}">—</output>${next==='offerTTC'?'<span class="growth" id="ttc-growth">TTC 涨幅 —</span>':next==='offerAnnual'?'<span class="growth" id="annual-growth">年薪涨幅 —</span>':''}</td></tr>`).join('')}</tbody></table></div></div>`;
    const attachments=`<div class="upload-intro">${icon('info')}<span>每个文件不大于 2MB，支持 PDF、Word（.doc / .docx）和 Excel 97–2003（.xls）。Excel 请另存为对应格式，不要仅修改后缀名。提交前请上传个人简历和薪资证明。</span></div><div class="attachment-list">${fileTypes.map(({key,label,required})=>`<div class="attachment-row" data-file-row="${key}"><div class="attachment-type">${icon('files')}<span>${required?'<span class="required">*</span>':''}${label}</span></div><div class="file-info" id="file-info-${key}">未上传附件</div><div class="attachment-actions"><input class="file-input" type="file" id="file-${key}" data-upload="${key}" accept=".pdf,.doc,.docx,.xls" aria-label="上传${label}"><button type="button" class="button" data-upload-button="${key}">${icon('upload')}上传文件</button><button type="button" class="icon-button" data-download="${key}" aria-label="下载${label}" hidden>${icon('download')}</button><button type="button" class="icon-button" data-remove-file="${key}" aria-label="删除${label}" hidden>${icon('trash')}</button></div></div>`).join('')}</div>`;
    $('#offer-modal-header').replaceChildren();$('#offer-modal-footer').replaceChildren();
    formHost.innerHTML=`<div class="page-heading form-heading"><div class="heading-left"><div><h1 id="offer-dialog-title">${title}</h1><p>流程编号：${escapeHTML(record.processNo)}<span style="margin:0 10px;color:#d9dde4">|</span>审批状态：${badge(editing?record.status:'unsaved')}</p></div></div><div class="heading-actions">${detail && ['draft','rejected'].includes(record.status)?'<button class="button primary" id="edit-detail">编辑表单</button>':''}</div><button type="button" class="icon-button offer-modal-close" data-back aria-label="关闭Offer弹窗">${icon('x')}</button></div>
      <div class="form-layout"><div class="form-stack">${record.rejectReason?`<div class="detail-banner"><span>退回原因：${escapeHTML(record.rejectReason)}</span></div>`:record.closeReason?`<div class="detail-banner"><span>关闭原因：${escapeHTML(record.closeReason)}</span></div>`:''}${detail?`<div class="detail-banner"><span>${record.status==='pending'?'当前流程等待审批，操作人：'+escapeHTML(record.operator):'正在查看已保存的流程信息。'}${record.demo?' 该记录为示例数据。':''}</span></div>`:''}<div id="form-errors" role="alert" class="form-error-summary" hidden></div><form id="offer-form" class="${detail?'detail-mode':''}" novalidate>${section('basic',sectionNames[0],basic,'录用信息')}${section('organization',sectionNames[1],org)}${section('headcount',sectionNames[2],headcount)}${section('position',sectionNames[3],position)}${section('salary',sectionNames[4],salary,'人民币 · CNY')}${section('comparison',sectionNames[5],comparison,'自动计算')}${section('attachments',sectionNames[6],attachments)}<datalist id="jobs">${(jobDataEnabled?payrollManagement.jobOptions().map(job=>job.name):defaultJobNames).map(job=>`<option value="${escapeHTML(job)}">`).join('')}</datalist></form><div class="form-footer"><span class="save-state" id="save-state">${icon('save')}${detail?'最后更新：'+escapeHTML(record.updatedAt||'—'):'填写后可保存草稿，稍后继续'}</span><div class="actions"><button class="button" data-back>${detail?'返回列表':'取消'}</button>${detail?'':'<button class="button" id="save-draft">保存草稿</button><button class="button primary" id="submit-offer">提交Offer</button>'}</div></div></div></div>`;
    $('#offer-modal-header').append($('.form-heading',formHost));
    $('#offer-modal-footer').append($('.form-footer',formHost));
    bindForm();updateHeadcount();calculate();fileTypes.forEach(t=>renderAttachment(t.key));
    if(detail){$$('#offer-form input,#offer-form select,#offer-form textarea').forEach(el=>{if(el.type==='checkbox'||el.tagName==='SELECT')el.disabled=true;else el.readOnly=true;});$$('[data-upload-button],[data-remove-file]').forEach(el=>el.hidden=true);}
    document.documentElement.classList.add('offer-modal-open');
    if(!offerDialog.open)offerDialog.showModal();
    formHost.scrollTop=0;
    (detail?$('.offer-modal-close'):$('#f-name')).focus({preventScroll:true});
  }
  function scrollFormTo(element,center=false) {
    const top=element.getBoundingClientRect().top-formHost.getBoundingClientRect().top+formHost.scrollTop;
    formHost.scrollTo({top:Math.max(0,top-(center?(formHost.clientHeight-element.offsetHeight)/2:16)),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function collectForm() {
    const data={...currentRecord};
    for(const [key,value] of new FormData($('#offer-form'))) { if(typeof value==='string')data[key]=value.trim(); }
    ['rehire','superiorReferral','signingBonusEnabled'].forEach(key=>data[key]=$(`[name="${key}"]`).checked);
    data.signingBonus=$('#f-signingBonus').value;
    data.signingPeriods=$('#f-signingPeriods').value;
    data.signingSchedule=readSigningSchedule();
    data.equityEnabled=$('#f-equityEnabled').checked;
    data.equityContent=$('#f-equityContent').value.trim();
    // Keep inactive branch inputs so switching modes or reopening a draft restores them.
    $$('#monthly-salary-module [name],#performance-bonus-module [name]').forEach(input=>{
      data[input.name]=input.type==='checkbox'?input.checked:input.value.trim();
    });
    data.monthlySplitMode='amount';data.salaryRulesVersion=2;
    data.salaryStandard=data.regularSalary=salaryMonthly();
    data.quarterlyBonusType=data.halfYearBonusType='amount';
    for(const key of ['noProbationSplit','probationSalary','internSalary','probationCR','salaryRatio','fixedSalaryRatio','performanceSalaryRatio','quarterlyBonusMonths','halfYearBonusMonths'])delete data[key];
    Object.assign(data,bonusTotals());
    data.attachments={...currentRecord.attachments};return data;
  }
  function markDirty() {
    dirty=true;$('#save-state').innerHTML=`${icon('save')}有未保存的修改`;
  }
  function setEquityEnabled() {
    const enabled=$('#f-equityEnabled').checked;
    $('#equity-details').disabled=!enabled;
    $('#equity-details').hidden=!enabled;
    $('#equity-module').classList.toggle('is-disabled',!enabled);
    setRequired('equityContent',enabled);
    if(!enabled){
      const input=$('#f-equityContent');const wrapper=input.closest('.field');
      wrapper.classList.remove('invalid');$('.field-error',wrapper)?.remove();
      input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');
    }
  }
  function salaryMonthly() {
    return number($('#f-regularSalary').value);
  }
  function syncSalaryFields() {
    const split=$('#f-monthlySplit').value==='yes';
    const group=(id,active)=>{const el=$('#'+id);el.hidden=!active;el.disabled=!active;};
    group('monthly-split-details',split);setRequired('fixedSalaryAmount',split);
    const fixed=$('#f-fixedSalaryAmount'),performance=$('#f-performanceSalaryAmount'),standard=$('#f-regularSalary');
    fixed.readOnly=readOnly||!split;
    if(!split)fixed.value=standard.value;
    performance.value=!split?'0':standard.value!==''&&fixed.value!==''?((Math.round(number(standard.value)*100)-Math.round(number(fixed.value)*100))/100).toFixed(2):'';
    for(const item of bonusItems){
      const enabled=$('#f-'+item.key+'Enabled').value==='yes';
      const annual=item.key==='annualBonus';
      const type=annual?$('#f-annualBonusType').value:'amount';
      group(item.key+'-details',enabled);
      if(annual)setRequired('annualBonusType',enabled);
      const fields=annual?[[item.key+'Amount','amount'],[item.monthsKey,'months']]:[[item.key+'Amount','amount']];
      for(const [key,kind] of fields){
        const active=enabled&&type===kind;const input=$('#f-'+key);
        input.closest('.field').hidden=!active;input.disabled=readOnly||!active;setRequired(key,active);
      }
    }
    $$('#monthly-salary-module :disabled,#performance-bonus-module :disabled').forEach(input=>{
      input.closest('.field')?.classList.remove('invalid');input.closest('.field')?.querySelector('.field-error')?.remove();
      input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');
    });
  }
  function monthlySplitIssue() {
    const inputs=[$('#f-regularSalary'),$('#f-fixedSalaryAmount')];
    if(inputs.some(input=>input.value===''||!input.validity.valid))return null;
    if(salaryMonthly()<=0||salaryMonthly()>999999999)return {el:inputs[0],message:'薪资标准须大于 0，且不超过 999999999 元'};
    if(Math.round(number(inputs[1].value)*100)>Math.round(salaryMonthly()*100))return {el:inputs[1],message:'固定工资不能超过薪资标准，绩效工资须大于或等于 0'};
    return null;
  }
  function updateMonthlySplit() {
    const issue=monthlySplitIssue();const error=$('#monthly-split-error');
    error.hidden=!issue;error.textContent=issue?.message||'';
    if(!issue)$$('[aria-describedby="monthly-split-error"]').forEach(input=>{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');});
    const fixed=number($('#f-fixedSalaryAmount').value);
    const base=salaryMonthly();
    const ready=$('#f-fixedSalaryAmount').value!==''&&($('#f-monthlySplit').value!=='yes'||$('#f-performanceSalaryAmount').value!=='');
    $('#monthly-split-summary').textContent=ready&&!issue?'固定 '+money(fixed)+' + 绩效 '+money((Math.round(base*100)-Math.round(fixed*100))/100)+' = 薪资标准 '+money(base):'';
    $('#monthly-split-summary').hidden=!$('#monthly-split-summary').textContent;
  }
  function bonusTarget(item) {
    const enabled=$(`#f-${item.key}Enabled`).value;
    if(enabled==='no')return 0;
    if(enabled!=='yes')return null;
    const type=item.key==='annualBonus'?$('#f-annualBonusType').value:'amount';
    const input=type==='amount'?$(`#f-${item.key}Amount`):type==='months'?$(`#f-${item.monthsKey}`):null;
    if(!input||!input.value||!input.validity.valid||(type==='months'&&salaryMonthly()<=0))return null;
    return Math.round(number(input.value)*(type==='months'?salaryMonthly():1)*100)/100;
  }
  function bonusTotals() {
    return Object.fromEntries(bonusItems.map(item=>{const target=bonusTarget(item);return [item.output,target===null?null:Math.round(target*100)*item.times/100];}));
  }
  function readSigningSchedule() {
    const rows=$$('#signing-schedule-rows tr').map(row=>({months:$('[data-signing-month]',row).value.trim(),ratio:$('[data-signing-ratio]',row).value.trim()}));
    rows.forEach((row,index)=>{signingScheduleDraft[index]={...row};});
    return rows;
  }
  function renderSigningRows() {
    readSigningSchedule();
    const inputCount=Number($('#f-signingPeriods').value);
    const validCount=Number.isInteger(inputCount)&&inputCount>=1&&inputCount<=60;
    if(!validCount&&$('#signing-schedule-rows').children.length)return;
    const count=validCount?inputCount:Math.min(60,Math.max(2,signingScheduleDraft.length));
    $('#signing-schedule-rows').innerHTML=Array.from({length:count},(_,index)=>{
      const row=signingScheduleDraft[index]||{months:'',ratio:''};
      return `<tr><td><div class="field"><input id="signing-month-${index}" data-signing-month="${index}" type="number" min="0" step="1" required ${readOnly?'readonly':''} value="${escapeHTML(row.months)}" placeholder="请填写入职满x个月" aria-label="第${index+1}期发放月份（入职满月数）"></div></td><td><div class="field"><input id="signing-ratio-${index}" data-signing-ratio="${index}" type="number" min="0.01" max="100" step="0.01" required ${readOnly?'readonly':''} value="${escapeHTML(row.ratio)}" placeholder="请填写发放比例" aria-label="第${index+1}期发放比例（%）"></div></td><td><output data-signing-amount="${index}" class="signing-calculated">根据总金额和比例计算</output></td></tr>`;
    }).join('');
  }
  function setSigningEnabled() {
    const enabled=$('#f-signingBonusEnabled').checked;
    $('#signing-bonus-details').disabled=!enabled;
    $('#signing-bonus-details').hidden=!enabled;
    $('#signing-bonus-module').classList.toggle('is-disabled',!enabled);
    setRequired('signingBonus',enabled);setRequired('signingPeriods',enabled);
    if(!enabled){
      $$('#signing-bonus-module .field-error').forEach(el=>el.remove());
      $$('#signing-bonus-module .invalid').forEach(el=>el.classList.remove('invalid'));
      $$('#signing-bonus-module [aria-invalid]').forEach(el=>{el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});
      $('#signing-schedule-error').hidden=true;
    }
  }
  function signingPayments(total,schedule) {
    const amount=Number(total);
    if(total===''||!Number.isFinite(amount)||amount<=0||amount>999999999)return schedule.map(()=>null);
    const cents=Math.round(amount*100);
    const weights=schedule.map(row=>{
      const ratio=Number(row.ratio);
      return row.ratio!==''&&Number.isFinite(ratio)&&ratio>0&&ratio<=100?Math.round(ratio*100):null;
    });
    if(weights.every(weight=>weight!==null)&&weights.reduce((sum,weight)=>sum+weight,0)===10000){
      const payments=weights.map(weight=>Math.floor(cents*weight/10000));
      const remaining=cents-payments.reduce((sum,payment)=>sum+payment,0);
      const remainders=weights.map((weight,index)=>({index,remainder:(cents*weight)%10000})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
      for(let i=0;i<remaining;i++)payments[remainders[i].index]++;
      return payments;
    }
    return weights.map(weight=>weight===null?null:Math.round(cents*weight/10000));
  }
  function updateSigningAmounts() {
    const enabled=$('#f-signingBonusEnabled').checked;
    const schedule=readSigningSchedule();
    const payments=signingPayments($('#f-signingBonus').value,schedule);
    payments.forEach((cents,index)=>{
      const output=$(`[data-signing-amount="${index}"]`);const hasAmount=enabled&&cents!==null;
      output.textContent=hasAmount?money(cents/100):'根据总金额和比例计算';output.classList.toggle('has-value',hasAmount);
    });
    const hasRatio=enabled&&schedule.some(row=>row.ratio!=='');
    const ratioTotal=schedule.reduce((sum,row)=>sum+Math.round(number(row.ratio)*100),0);
    $('#signing-ratio-total').textContent=hasRatio?`${(ratioTotal/100).toFixed(2)}%`:'—';
    $('#signing-ratio-total').classList.toggle('incomplete',hasRatio&&ratioTotal!==10000);
    $('#signing-amount-total').textContent=enabled&&payments.some(cents=>cents!==null)?money(payments.reduce((sum,cents)=>sum+(cents??0),0)/100):'—';
  }
  function bindForm() {
    $$('[data-back]').forEach(btn=>btn.addEventListener('click',event=>{event.preventDefault();navigate(offerReturnRoute);}));
    $('#edit-detail')?.addEventListener('click',()=>navigate(`#/offers/${currentRecord.id}/edit`));
    const signingPeriods=$('#f-signingPeriods');signingPeriods.min='1';signingPeriods.max='60';signingPeriods.step='1';
    renderSigningRows();setSigningEnabled();setEquityEnabled();syncSalaryFields();
    if(readOnly)return;
    $('#offer-form').addEventListener('submit',event=>event.preventDefault());
    $('#offer-form').addEventListener('input',event=>{
      if(event.target.type==='file')return;
      markDirty();const wrapper=event.target.closest('.field');wrapper?.classList.remove('invalid');wrapper?.querySelector('.field-error')?.remove();event.target.removeAttribute('aria-invalid');event.target.removeAttribute('aria-describedby');
      if(event.target.closest('#monthly-salary-module,#performance-bonus-module')||['regularSalary','employeeType','probation'].includes(event.target.name))syncSalaryFields();
      if(event.target.name==='signingPeriods')renderSigningRows();
      if(event.target.name==='signingBonusEnabled')setSigningEnabled();
      if(event.target.name==='equityEnabled')setEquityEnabled();
      if(event.target.closest('#signing-bonus-module'))$('#signing-schedule-error').hidden=true;
      calculate();
    });
    $('#f-job').addEventListener('change',()=>{
      if(!jobDataEnabled)return;
      const job=payrollManagement.jobOptions().find(item=>item.name===$('#f-job').value.trim());
      const hint=$('#job-salary-source');
      if(!job||job.fixedSalaryAmount===''||job.performanceSalaryAmount===''){hint.hidden=true;return;}
      $('#f-fixedSalaryAmount').value=job.fixedSalaryAmount;
      $('#f-regularSalary').value=job.salaryStandard??((Math.round(number(job.fixedSalaryAmount)*100)+Math.round(number(job.performanceSalaryAmount)*100))/100);
      $('#f-performanceSalaryAmount').value=job.performanceSalaryAmount;
      $('#f-monthlySplit').value=number(job.performanceSalaryAmount)>0?'yes':'no';
      hint.textContent='已带出「'+job.name+'」维护的工资金额，可按本次 Offer 调整。';hint.hidden=false;
      markDirty();syncSalaryFields();calculate();
    });
    $('#f-department').addEventListener('change',()=>{
      const dept=departments[$('#f-department').value];$('#f-departmentCode').value=dept?.code||'';$('#f-departmentPath').value=dept?.path||'';$('#f-manager').value=dept?.manager||'';$('#f-business').value=dept?.business||'';updateHeadcount();
    });
    $('#f-city').addEventListener('change',()=>{const city=$('#f-city').value;$('#f-office').innerHTML=`<option value="">请选择</option>${city?`<option>${escapeHTML(city)}办公区</option>`:''}<option>远程办公</option>`;});
    $('#f-employeeType').addEventListener('change',()=>{const intern=$('#f-employeeType').value==='实习生';if(intern){$('#f-probation').value='无试用期';$('#f-payrollGroup').value='实习生薪资组';}setConditionalFields();calculate();});
    $('#f-probation').addEventListener('change',()=>{setConditionalFields();calculate();});
    $('#f-recruitReason').addEventListener('change',setConditionalFields);
    $('#save-draft').addEventListener('click',()=>saveForm(false));
    $('#submit-offer').addEventListener('click',()=>saveForm(true));
    $$('[data-upload-button]').forEach(btn=>btn.addEventListener('click',()=>$(`#file-${btn.dataset.uploadButton}`).click()));
    $$('[data-upload]').forEach(input=>input.addEventListener('change',()=>uploadFile(input)));
    $$('[data-remove-file]').forEach(btn=>btn.addEventListener('click',()=>{delete currentRecord.attachments[btn.dataset.removeFile];renderAttachment(btn.dataset.removeFile);markDirty();}));
    setConditionalFields();
  }
  function setRequired(key,required) {
    const input=$(`#f-${key}`);input.required=required;const label=$(`label[for="f-${key}"]`);
    if(required && !$('.required',label))label.insertAdjacentHTML('afterbegin','<span class="required">*</span>');
    if(!required)$('.required',label)?.remove();
  }
  function setConditionalFields() {
    const replacing=$('#f-recruitReason').value==='人员替换';setRequired('replacement',replacing);setRequired('replacementDate',replacing);
    syncSalaryFields();
  }
  function updateHeadcount() {
    const dept=departments[$('#f-department').value]||{};
    ['budget','active','joining','internBudget','internActive','internJoining'].forEach(key=>$(`#hc-${key}`).textContent=dept[key]||0);
    $('#hc-vacancy').textContent=Math.max(0,number(dept.budget)-number(dept.active)-number(dept.joining));
    $('#hc-internVacancy').textContent=Math.max(0,number(dept.internBudget)-number(dept.internActive)-number(dept.internJoining));
  }
  function calculate() {
    const get=key=>number($(`#f-${key}`)?.value);
    const monthly=salaryMonthly();const bonuses=bonusTotals();
    const ttc=Object.values(bonuses).some(value=>value===null)?null:Math.round((monthly*12+Object.values(bonuses).reduce((sum,value)=>sum+value,0))*100)/100;
    const previousTTC=get('previousSalary')*12+get('previousBonus');
    const signingBonus=$('#f-signingBonusEnabled').checked?get('signingBonus'):0;
    const annual=ttc===null?null:ttc+(get('meal')+get('transport')+get('communication')+get('housing'))*12+get('relocation')+signingBonus;
    const previousAnnual=previousTTC+(get('previousMeal')+get('previousTransport')+get('previousCommunication'))*12+get('previousRelocation')+get('previousSigning');
    const outputs={monthly,...bonuses,previousTTC,offerTTC:ttc,previousAnnual,offerAnnual:annual,meal:get('meal'),transport:get('transport'),communication:get('communication'),housing:get('housing'),relocation:get('relocation'),signingBonus};
    Object.entries(outputs).forEach(([key,val])=>{const el=$(`#calc-${key}`);if(el)el.textContent=val===null?'—':money(val);});
    const growth=(next,prev)=>next!==null&&prev>0?`${next>=prev?'+':''}${((next-prev)/prev*100).toFixed(1)}%`:'—';
    $('#ttc-growth').textContent=`TTC 涨幅 ${growth(ttc,previousTTC)}`;$('#annual-growth').textContent=`年薪涨幅 ${growth(annual,previousAnnual)}`;
    const median={P1:6000,P2:9000,P3:12000,P4:16000,P5:22000,P6:30000,P7:40000,P8:55000,M1:28000,M2:42000,M3:60000}[$('#f-grade').value];
    $('#f-regularCR').value=median&&monthly?(monthly/median*100).toFixed(1):'';
    for(const item of bonusItems){
      const target=bonusTarget(item);const enabled=$(`#f-${item.key}Enabled`).value;
      const summary=$(`#${item.key}-summary`);
      summary.textContent=enabled==='no'||target===null?'':`每${item.period}目标 ${money(target)} × ${item.times} 次 / 年 = 年度目标 ${money(bonuses[item.output])}`;
      summary.hidden=!summary.textContent;
    }
    updateMonthlySplit();
    updateSigningAmounts();
  }
  function validateForm() {
    $$('.field-error').forEach(el=>el.remove());$$('.invalid').forEach(el=>el.classList.remove('invalid'));$$('[aria-invalid]').forEach(el=>{el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});
    const errors=[];const data=collectForm();
    $$('#offer-form input:not([type=file]),#offer-form select,#offer-form textarea').forEach(input=>{
      if(input.readOnly||input.disabled||input.closest('fieldset:disabled')||input.type==='checkbox')return;
      let message='';const label=$(`label[for="${input.id}"]`)?.textContent.replace('*','') || input.getAttribute('aria-label') || '该字段';
      if(input.required&&!input.value.trim())message=`请填写${label}`;
      else if(input.validity.typeMismatch)message='请输入有效的电子邮件地址';
      else if(!input.validity.valid)message=`请填写有效的${label}${input.type==='number'&&input.min!==''&&input.max!==''?`（${input.min}–${input.max}）`:''}`;
      if(input.required&&['regularSalary','signingBonus'].includes(input.name)&&number(input.value)<=0)message=`${label}须大于 0`;
      if(message){errors.push({el:input,message});const errorId=`error-${input.id||input.name}`;input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',errorId);const wrapper=input.closest('.field')||input.parentElement;wrapper.classList.add('invalid');const hint=document.createElement('span');hint.className='field-error';hint.id=errorId;hint.textContent=message;wrapper.append(hint);}
    });
    const splitIssue=monthlySplitIssue();
    if(splitIssue){errors.push(splitIssue);$('#monthly-split-error').textContent=splitIssue.message;$('#monthly-split-error').hidden=false;splitIssue.el.setAttribute('aria-invalid','true');splitIssue.el.setAttribute('aria-describedby','monthly-split-error');}
    const scheduleError=$('#signing-schedule-error');scheduleError.hidden=true;
    if(data.signingBonusEnabled&&$('#f-signingPeriods').validity.valid&&$$('#signing-schedule-rows input').every(input=>input.validity.valid)){
      const totalRatio=data.signingSchedule.reduce((sum,row)=>sum+Math.round(number(row.ratio)*100),0);
      if(totalRatio!==10000){const message='签约金各期发放比例合计须为 100%';scheduleError.textContent=message;scheduleError.hidden=false;errors.push({el:$('[data-signing-ratio]'),message});}
    }
    fileTypes.filter(type=>type.required&&!data.attachments[type.key]).forEach(type=>{const row=$(`[data-file-row="${type.key}"]`);row.classList.add('invalid');row.insertAdjacentHTML('beforeend',`<span class="field-error">请上传${type.label}</span>`);errors.push({el:$(`[data-upload-button="${type.key}"]`),message:`请上传${type.label}`});});
    const summary=$('#form-errors');summary.hidden=!errors.length;
    if(errors.length){summary.textContent=`还有 ${errors.length} 项信息需要完善：${errors.slice(0,3).map(e=>e.message).join('；')}${errors.length>3?'……':''}。已填写的内容会保留，也可先保存草稿。`;errors[0].el.focus({preventScroll:true});scrollFormTo(errors[0].el,true);toast(`请完善 ${errors.length} 项信息后再提交`,true);return false;}
    return true;
  }
  function saveForm(submit) {
    if(attachmentBusy){toast('附件正在保存，请稍候再操作。',true);return;}
    if(submit&&!validateForm())return;
    const data=collectForm();
    if(submit) {
      openDialog('确认提交Offer',`<p>即将为 <strong>${escapeHTML(data.name)}</strong> 发起录用流程。</p><p style="margin-top:10px">招聘职位：${escapeHTML(data.job)}<br>计划到岗：${escapeHTML(data.startDate)}<br>薪资标准：${money(data.regularSalary)}</p><p style="margin-top:12px;color:#98a1ae;font-size:11px">提交后将进入「进行中」。本地演示仅更新流程状态，不会发送邮件或启动真实审批。</p>`,()=>persistForm(data,true),'确认提交');
    } else persistForm(data,false);
  }
  function persistForm(data,submit) {
    data.status=submit?'pending':'draft';data.updatedAt=stamp();data.operator=submit?'用人部门负责人':'HR 管理员';
    if(submit){data.submittedAt=stamp();data.rejectReason='';}
    const index=records.findIndex(r=>r.id===data.id);const next=[...records];if(index>=0)next[index]=data;else next.unshift(data);
    if(!commitRecords(next))return false;
    dirty=false;currentRecord=structuredClone(data);
    if(submit){filter={...filter,tab:'ongoing',search:'',department:'',page:1};navigate('#/offers',true);toast('Offer 已提交，已进入「进行中」。');}
    else{
      activeRoute=`#/offers/${data.id}/edit`;history.replaceState(null,'',activeRoute);$('.form-heading h1').textContent='编辑Offer';$('.form-heading .status').outerHTML=badge('draft');
      $('#save-state').innerHTML=`${icon('check-circle')}草稿已保存 · ${escapeHTML(data.updatedAt.slice(11,16))}`;toast('草稿已保存，可稍后继续填写。');
    }
    return true;
  }
  function fileDatabase() {
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error('IndexedDB unavailable'));return;}
      const request=indexedDB.open('hongen-offer-files-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });return dbPromise;
  }
  async function storeFile(key,file) {
    const db=await fileDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  }
  async function readFile(key) {
    const db=await fileDatabase();return new Promise((resolve,reject)=>{const req=db.transaction('files','readonly').objectStore('files').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }
  async function uploadFile(input) {
    const file=input.files[0];const key=input.dataset.upload;input.value='';if(!file)return;
    if(!/\.(pdf|doc|docx|xls)$/i.test(file.name)){toast('文件格式不支持，请上传 PDF、Word 或 .xls 文件。',true);return;}
    if(!file.size||file.size>2*1024*1024){toast(file.size?'文件超过 2MB，请压缩后重新上传。':'不能上传空文件。',true);return;}
    const recordId=currentRecord.id;const button=$(`[data-upload-button="${key}"]`);button.disabled=true;button.textContent='上传中…';attachmentBusy++;
    try {
      const fileId=`${recordId}/${key}/${crypto.randomUUID()}`;await storeFile(fileId,file);
      if(currentRecord?.id!==recordId)return;
      currentRecord.attachments[key]={id:fileId,name:file.name,size:file.size,type:file.type};renderAttachment(key);markDirty();$(`[data-file-row="${key}"]`).classList.remove('invalid');$(`[data-file-row="${key}"] .field-error`)?.remove();toast(`${fileTypes.find(t=>t.key===key).label}已上传，保存表单后生效。`);
    }catch{toast('附件保存失败，请检查浏览器是否允许本地存储后重试。',true);}
    finally{attachmentBusy--;if(currentRecord?.id===recordId){button.disabled=false;button.innerHTML=`${icon('upload')}${currentRecord.attachments[key]?'重新上传':'上传文件'}`;}}
  }
  function renderAttachment(key) {
    const file=currentRecord.attachments?.[key];const info=$(`#file-info-${key}`);
    info.innerHTML=file?`<span class="file-name">${escapeHTML(file.name)}</span><span class="file-size">${(file.size/1024).toFixed(1)} KB · 已上传</span>`:'未上传附件';
    const upload=$(`[data-upload-button="${key}"]`);upload.hidden=readOnly;upload.innerHTML=`${icon('upload')}${file?'重新上传':'上传文件'}`;
    const download=$(`[data-download="${key}"]`);download.hidden=!file;download.onclick=()=>downloadFile(key);
    $(`[data-remove-file="${key}"]`).hidden=!file||readOnly;
  }
  async function downloadFile(key) {
    try{const meta=currentRecord.attachments[key];const file=await readFile(meta.id);if(!file)throw new Error('Missing file');const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=meta.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    catch{toast('未找到附件内容，请在编辑表单中重新上传。',true);}
  }
  function navigate(hash,force=false) {
    if(attachmentBusy){toast('附件正在保存，请稍候再离开页面。',true);return;}
    if(payrollManagement.hasUnsavedChanges()&&!force){openDialog(payrollManagement.unsavedTitle(),'<p>当前有尚未保存的修改。</p>',()=>{payrollManagement.closeEditor(false);navigate(hash,true);},'放弃修改',true);return;}
    if(dirty&&!force){openDialog('离开当前表单？','<p>当前有尚未保存的修改。离开后这些修改将不会保留。</p>',()=>{dirty=false;location.hash=hash;},'放弃修改',true);return;}
    if(location.hash===hash){activeRoute=hash;route();}else location.hash=hash;
  }
  function route() {
    if($('#action-dialog').open)$('#action-dialog').close();
    payrollManagement.closeEditor(false);
    const hash=location.hash||'#/offers';activeRoute=hash;
    const parts=hash.replace(/^#\//,'').split('/');
    document.body.classList.toggle('salary-maintenance-page',parts[0]==='payroll'&&parts[1]==='maintenance');
    if(parts[0]==='payroll'&&parts[1]==='jobs'&&!jobDataEnabled){
      history.replaceState(null,'','#/payroll/projects');route();return;
    }
    if(parts[0]==='hrg'&&parts[1]==='salary-change'){
      closeOfferForm();
      payrollManagement.renderApplications();
      syncShellNavigation('#/hrg/salary-change');
      document.title='薪酬变更申请 · HR便捷工作台';
      window.scrollTo(0,0);
      return;
    }
    if(parts[0]==='payroll'&&['projects','signing-bonus','jobs','maintenance'].includes(parts[1])){
      const closingModal=closeOfferForm();
      const projectsPage=parts[1]==='projects';
      if(projectsPage)payrollManagement.renderProjects();else if(parts[1]==='maintenance')payrollManagement.renderMaintenance();else if(parts[1]==='jobs')payrollManagement.renderJobs();else payrollManagement.renderLedger();
      syncShellNavigation(`#/payroll/${parts[1]}`);
      document.title=`${projectsPage?'薪酬结构管理':parts[1]==='maintenance'?'薪酬信息维护':parts[1]==='jobs'?'职务数据维护':'签约金台账'} · HR便捷工作台`;
      if(closingModal){window.scrollTo(0,modalReturnScroll);$(modalReturnFocus)?.focus({preventScroll:true});}else window.scrollTo(0,0);
      return;
    }
    if(parts[0]==='offers'&&parts[1]==='new')renderForm({...blankData(),id:crypto.randomUUID(),processNo:nextProcessNo(),status:'draft',demo:false});
    else if(parts[0]==='offers'&&parts[1]){
      const record=records.find(r=>r.id===parts[1]||encodeURIComponent(r.id)===parts[1]);
      if(record){const editing=parts[2]==='edit'&&['draft','rejected'].includes(record.status);renderForm(record,!editing);}
      else{history.replaceState(null,'','#/offers');activeRoute='#/offers';renderList();toast('未找到该流程，已返回列表。',true);}
    }else{const closingModal=offerDialog.open;renderList();if(!closingModal)window.scrollTo(0,0);}
    syncShellNavigation(offerDialog.open?offerReturnRoute:'#/offers');
    document.title=`${currentRecord?(readOnly?'Offer流程详情':'发起Offer'):'Offer流程管理'} · HR便捷工作台`;
  }
  function syncShellNavigation(hash) {
    const payrollPage=hash.startsWith('#/payroll/');
    const hrgPage=hash.startsWith('#/hrg/');
    $('#recruitment-toggle').classList.toggle('selected',!payrollPage&&!hrgPage);
    $('#payroll-toggle').classList.toggle('selected',payrollPage);
    $('#hrg-toggle').classList.toggle('selected',hrgPage);
    $$('.reference-sidebar a').forEach(link=>{
      const selected=link.getAttribute('href')===hash;
      link.classList.toggle('selected',selected);
      if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    const group=hrgPage?'hrg':payrollPage?'payroll':'recruitment';
    $(`#${group}-toggle`).setAttribute('aria-expanded','true');$(`#${group}-submenu`).hidden=false;
  }
  window.addEventListener('hashchange',()=>{
    if(dirty||attachmentBusy||payrollManagement.hasUnsavedChanges()){const destination=location.hash;history.replaceState(null,'',activeRoute);navigate(destination);return;}
    route();
  });
  window.addEventListener('beforeunload',event=>{if(dirty||attachmentBusy||payrollManagement.hasUnsavedChanges()){event.preventDefault();event.returnValue='';}});
  offerDialog.addEventListener('cancel',event=>{event.preventDefault();navigate(offerReturnRoute);});
  $$('[data-offer-home]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigate('#/offers');}));
  $$('[data-payroll-page]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigate(link.getAttribute('href'));}));
  $$('[data-hrg-page]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigate(link.getAttribute('href'));}));
  $$('[data-shell-entry]').forEach(button=>button.addEventListener('click',()=>toast(`${button.dataset.shellEntry}入口暂未开放。`)));
  $('#recruitment-toggle').addEventListener('click',()=>{
    const toggle=$('#recruitment-toggle');const expanded=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!expanded));$('#recruitment-submenu').hidden=expanded;
  });
  $('#payroll-toggle').addEventListener('click',()=>{
    const toggle=$('#payroll-toggle');const expanded=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!expanded));$('#payroll-submenu').hidden=expanded;
  });
  $('#hrg-toggle').addEventListener('click',()=>{
    const toggle=$('#hrg-toggle');const expanded=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!expanded));$('#hrg-submenu').hidden=expanded;
  });
  paintIcons();route();
  if(storageLoadIssue)toast('未能读取本地记录，当前显示示例数据。请检查浏览器存储设置。',true);
})();
