(function(){
'use strict';
const C=window.CashFlowCore,frequencies={once:'One time',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',bimonthly:'Every two months',quarterly:'Quarterly',annually:'Annually'},tabs=['Overview','Accounts','Income','Bills','Transfers','Forecast'];
let tab='Overview',horizon=30,m=null,filters={account:'',status:'',frequency:'',due:''},scope='';
const today=()=>localDate(new Date()), dollars=n=>n===null||n===undefined?'Not set':money(n/100), name=id=>m.accounts.find(a=>a.id===id)?.name||'Unassigned', uid=()=>crypto.randomUUID();
const minDate='1900-01-01',maxDate='2199-12-31';
function e(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function b(label,fn,cls='secondary'){const n=e('button',label,cls);n.type='button';n.onclick=fn;return n}
function card(title){const p=e('section',undefined,'card cf-card');p.append(e('h2',title));return p}
function row(...nodes){const d=e('div',undefined,'cf-actions');d.append(...nodes);return d}
function field(label,node){const l=e('label',label);l.append(node);return l}
function input(key,type,value='',required=true){const n=e('input');n.name=key;n.type=type;n.value=value??'';n.required=required;if(type==='date'){n.min=minDate;n.max=maxDate}if(type==='text')n.maxLength=180;return n}
function number(key,value='',min=0,required=true){const n=input(key,'number',value,required);n.step='0.01';n.min=min;n.max=1e9;return n}
function select(key,choices,value){const n=e('select');n.name=key;for(const [v,label] of choices)n.add(new Option(label,v));n.value=value;return n}
const acct=(value,blank=false)=>select('account',[...(blank?[['','Choose an account']]:[]),...m.accounts.map(a=>[a.id,a.name])],value);
function check(key,value){const n=input(key,'checkbox','',false);n.checked=!!value;return n}
function note(key,value=''){const n=e('textarea');n.name=key;n.value=value;n.rows=3;n.maxLength=2000;return n}
function cents(v){return Math.round(Number(v)*100)}
function commit(){state.cashFlow=m;save();render()}
function form(title,fields,submit){const owner=state,model=m,d=e('dialog',undefined,'app-action-dialog cf-dialog'),f=e('form'),error=e('p',undefined,'cf-error');error.setAttribute('role','alert');const grid=e('div',undefined,'cf-fields');grid.append(...fields);const s=e('button','Save','primary');s.type='submit';f.append(grid,error,row(s,b('Cancel',()=>d.close())));d.append(e('h2',title),f);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();f.onsubmit=ev=>{ev.preventDefault();if(owner!==state||model!==m){error.textContent='The dashboard changed. Close this form and reopen it.';return}try{submit(f.elements);d.close();commit()}catch(err){error.textContent=err.message}};return f}
function value(f,key){return f[key].value.trim()}
function reqName(f){const v=value(f,'name');if(!v)throw Error('Enter a name.');return v}
function accountForm(a){form(a?'Edit account':'Add bank account',[
 field('Account name',input('name','text',a?.name)),field('Cleared starting balance ($)',number('opening',a?.opening==null?'':a.opening/100,-1e9)),field('Balance as of (end of day)',input('asOf','date',a?.asOf||today())),field('Minimum balance cushion ($)',number('cushion',(a?.cushion||0)/100))
 ],f=>{if(value(f,'asOf')>today())throw Error('Use today or a past date.');const next={id:a?.id||uid(),name:reqName(f),opening:cents(f.opening.value),asOf:value(f,'asOf'),cushion:cents(f.cushion.value)};if(a)Object.assign(a,next);else m.accounts.push(next)})}
function incomeForm(r){form(r?'Edit income rule':'Add income rule',[
 field('Name',input('name','text',r?.name)),field('Account',acct(r?.account||m.accounts[0].id)),field('Deposit amount ($)',number('amount',r?r.amount/100:'',.01)),field('First eligible date',input('start','date',r?.start||today())),field('Frequency',select('frequency',Object.entries(frequencies),r?.frequency||'monthly')),field('Monthly calendar rule',select('rule',[['fixed','Same day number (clamp to month end)'],['last','Last calendar day'],['rick','Friday before the fourth Wednesday']],r?.rule||'fixed'))
 ],f=>{if(f.rule.value!=='fixed'&&f.frequency.value!=='monthly')throw Error('The last-day and fourth-Wednesday rules require Monthly.');updateRule(m.income,r,{name:reqName(f),account:f.account.value,amount:cents(f.amount.value),frequency:f.frequency.value,rule:f.rule.value,start:f.start.value})})}
function updateRule(list,r,next){
 if(!r){list.push({id:uid(),...next});return}
 // Keep recorded occurrences linked to their original rule. Schedule changes replace only future generation.
 const changed=['start','frequency','rule'].some(k=>r[k]!==next[k]);
 const saved=Object.values(m.overrides).filter(o=>o.ruleId===r.id);
 if(changed&&saved.length){
  if(r.frequency==='once'&&next.frequency==='once')throw Error('Edit the saved occurrence to move this one-time transaction.');
  if(!next.start||next.start<today())throw Error('This rule has saved occurrences. Use today or a future date to start its replacement.');
  if(saved.some(o=>o.scheduled>=next.start))throw Error('Start the replacement after the last saved occurrence. Edit existing occurrences individually.');
  const replacement={...r,...next,id:uid(),stop:null,archived:!!r.archived,deleted:false};
  r.stop=next.start;list.push(replacement);
 }else Object.assign(r,next)
}
function billForm(r){
 const certainty=r?.certainty||'unknown',start=r?.start||'',preferred=start?C.add(start,r.offset||0):'';
 const a=acct(r?.account||m.accounts[0].id,true);a.required=true;
 form(r?'Edit bill rule':'Add bill',[
 field('Bill name',input('name','text',r?.name)),field('Responsible account',a),field('Amount ($)',number('amount',r?r.amount/100:'',.01)),field('Frequency',select('frequency',Object.entries(frequencies),r?.frequency||'monthly')),field('Due-date confidence',select('certainty',[['verified','Verified'],['estimated','Estimated'],['unknown','Unknown']],certainty)),field('Actual / estimated first due date',input('due','date',certainty==='unknown'?'':start,false)),field('First preferred payment / planning date',input('preferred','date',preferred,false)),field('Autopay',check('autopay',r?.autopay)),field('Notes',note('notes',r?.notes))
 ],f=>{
 const due=f.due.value,preferredDate=f.preferred.value,confidence=f.certainty.value;
 if(confidence!=='unknown'&&!due)throw Error('Enter a due date or select Unknown.');
 if(confidence==='unknown'&&due)throw Error('Choose Verified or Estimated for a due date, or clear the due date.');
 const anchor=due||preferredDate,offset=due&&preferredDate?C.day(preferredDate)-C.day(due):0;
 if(Math.abs(offset)>366)throw Error('Preferred payment date must be within one year of the due date.');
 const next={name:reqName(f),account:f.account.value,amount:cents(f.amount.value),frequency:f.frequency.value,start:anchor,offset,certainty:confidence,autopay:f.autopay.checked,notes:value(f,'notes')};
 updateRule(m.bills,r,next)
 })
}
function transferForm(r,preset){const t=r||preset||{},choices=m.accounts.map(a=>[a.id,a.name]);form(r?'Edit transfer':'Record a transfer',[
 field('Description',input('name','text',t.name||'Account transfer')),field('From account',select('from',choices,t.from||choices[0]?.[0])),field('To account',select('to',choices,t.to||choices[1]?.[0])),field('Amount ($)',number('amount',t.amount?t.amount/100:'',.01)),field('Transfer date / posted date',input('date','date',t.date||today())),field('Status',select('status',[['planned','Planned'],['pending','Pending'],['completed','Completed / cleared']],t.status||'planned'))
 ],f=>{if(!f.from.value||!f.to.value||f.from.value===f.to.value)throw Error('Choose two different accounts.');if(f.status.value==='completed'&&f.date.value>today())throw Error('A completed transfer cannot have a future posting date.');const next={id:r?.id||uid(),name:reqName(f),from:f.from.value,to:f.to.value,amount:cents(f.amount.value),date:f.date.value,status:f.status.value};if(r)Object.assign(r,next);else m.transfers.push(next)})}
function occurrenceForm(o){const bill=o.kind==='bill',fields=[
 field('Name',input('name','text',o.name)),field('Amount ($)',number('amount',o.amount/100,.01)),field('Account',acct(o.account)),...(bill?[field('Due date',input('due','date',o.due,false)),field('Due-date confidence',select('certainty',[['verified','Verified'],['estimated','Estimated'],['unknown','Unknown']],o.certainty||'unknown'))]:[]),
 field(bill?'Preferred payment date':'Deposit date',input('preferred','date',o.preferred||o.date)),field('Actual payment / posting date',input('posted','date',o.posted||'',false)),...(bill?[field('Paid / sent',check('paid',o.paid||o.status==='pending')),field('Cleared at bank',check('cleared',o.cleared||o.status==='cleared'))]:[field('Deposit status',select('status',[['planned','Planned'],['pending','Pending'],['cleared','Cleared']],o.status))]),
 field('Notes',note('notes',o.notes||''))];
 form('Edit this occurrence only',fields,f=>{
 const status=bill?(f.cleared.checked?'cleared':f.paid.checked?'pending':'planned'):f.status.value;
 if(status!=='planned'&&(!f.posted.value||f.posted.value>today()))throw Error('Enter the actual payment or posting date (today or earlier).');
 if(bill&&f.certainty.value!=='unknown'&&!f.due.value)throw Error('Enter the due date or mark it unknown.');
 if(bill&&f.certainty.value==='unknown'&&f.due.value)throw Error('Clear the due date or set its confidence.');
 m.overrides[o.id]={...o,name:reqName(f),account:f.account.value,amount:cents(f.amount.value),preferred:f.preferred.value,posted:f.posted.value,date:status==='planned'?f.preferred.value:f.posted.value,due:bill?f.due.value||null:null,certainty:bill?f.certainty.value:null,paid:bill&&f.paid.checked,cleared:bill&&f.cleared.checked,status,notes:value(f,'notes')};
 })
}
function removeRule(r){if(!confirm('Remove this rule from active planning? Saved occurrences will remain in history.'))return;r.deleted=true;r.archived=true;commit()}
function toggleArchive(r){r.archived=!r.archived;commit()}
function badge(s){const n=e('span',s,'cf-status');n.dataset.status=s;return n}
function record(title,description,...actions){const n=e('article',undefined,'cf-record');const copy=e('div');copy.append(e('h3',title),e('p',description));n.append(copy,row(...actions));return n}
function banner(){const p=card('Household cash flow');p.append(e('p','Plan deposits, bills and transfers against each bank account.'),row(b('Export dashboard backup',()=>backup())));const t=row();t.classList.add('cf-tabs');for(const x of tabs){const btn=b(x,()=>{tab=x;render()});btn.setAttribute('aria-pressed',String(tab===x));t.append(btn)}p.append(t);return p}
function overview(root,report){const p=card('Money available');if(report.accounts.some(a=>!a.configured))p.append(e('p','Start here: enter a cleared balance and as-of date for each account. No opening balance is assumed.','cf-warning'));p.append(e('p','Enter a cleared balance through the end of its as-of date. Record later bank activity once. Pending items are included in projections but not in cleared balances. Safe to spend uses the lowest projected balance and your cushion. These estimates use only the accounts and transactions you enter.'),horizonChoice());const grid=e('div',undefined,'cf-account-grid');for(const a of report.accounts){
 const q=e('article',undefined,'cf-record');q.append(e('h3',a.name));const values=e('dl',undefined,'cf-metrics');
 for(const [label,val] of [['Current cleared',a.current],['Pending net',a.pending],['Projected at '+report.end,a.projected],['Reserve before payday',a.reserved],['Safe to spend',a.safe]])values.append(e('dt',label),e('dd',dollars(val)));
 q.append(values,e('p',a.configured?(a.nextDeposit?'Next deposit: '+a.nextDeposit.date+' · '+dollars(a.nextDeposit.amount):'No upcoming deposit found in the next year.'): 'Set a cleared starting balance before using this forecast.'));
 if(a.configured&&a.min<a.cushion&&a.min>=0)q.append(badge('low balance'),e('p','Lowest projected balance: '+dollars(a.min)));if(a.firstShort)q.append(badge('overdraft'),e('p','First projected shortfall: '+a.firstShort));q.append(b('Edit balance',()=>accountForm(m.accounts.find(x=>x.id===a.id))));grid.append(q)
 }p.append(grid,e('p','Combined cleared: '+dollars(report.combined.current)+' · projected: '+dollars(report.combined.projected)+' · reserved: '+dollars(report.combined.reserved)+' · safe to spend: '+dollars(report.combined.safe)));root.append(p);
 const planner=card('Paycheck planner');for(const a of report.accounts){const list=a.billsBeforeDeposit,due=a.dueBeforeDeposit;planner.append(e('h3',a.name+' · before the next deposit'),e('p','Due before payday: '+(due.length?due.map(x=>x.name+' ('+dueLabel(x)+')').join(' · '):'None with a known due date.')),e('p','Bills in reserve: '+(list.length?list.map(x=>x.name+' ('+dollars(x.amount)+', '+x.date+')').join(' · '):'None scheduled.')));if(due.some(x=>x.originalDate>x.due))planner.append(e('p','Some preferred payments are after the due date. Reserves use the earlier date; the forecast keeps your preferred payment dates.','cf-warning'))}
 for(const t of report.recommendations)planner.append(record('Suggested transfer · '+dollars(t.amount),name(t.from)+' → '+name(t.to)+' · needed by '+t.needBy+'. Sender retains its forecast cushion.',b('Review transfer',()=>transferForm(null,t))));
 if(!report.recommendations.length)planner.append(e('p','No transfer recommendation from the entered balances and schedule.'));
 if(m.bills.some(b=>!b.archived&&!b.deleted&&!b.start))planner.append(e('p','Some bills are unscheduled. Their amounts are not included in projections.','cf-warning'));
 root.append(planner);const up=card('Upcoming bills');const rows=C.events(m,C.add(today(),30)).filter(x=>x.kind==='bill'&&x.status!=='cleared').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);for(const x of rows)up.append(record(x.name,name(x.account)+' · '+dollars(x.amount)+' · payment '+x.date+' · due '+dueLabel(x),b('Edit occurrence',()=>occurrenceForm(x))));if(!rows.length)up.append(e('p','No scheduled bills within 30 days.'));root.append(up)
}
function accounts(root){const p=card('Bank accounts');p.append(e('p','Starting balance is the amount already cleared through the as-of date. Do not enter historical cleared transactions again if included in that balance.'),b('Add account',()=>accountForm(),'primary'));for(const a of m.accounts)p.append(record(a.name,'Starting balance '+dollars(a.opening)+' · as of '+a.asOf+' · cushion '+dollars(a.cushion),b('Edit account',()=>accountForm(a))));root.append(p)}
function income(root){const p=card('Income schedules');p.append(b('Add income',()=>incomeForm(),'primary'),e('p','Scheduled deposits are available on payday. Mark a deposit cleared when you see it at the bank.'));for(const r of m.income.filter(x=>!x.deleted))p.append(record(r.name,name(r.account)+' · '+dollars(r.amount)+' · '+frequencies[r.frequency]+(r.rule==='rick'?' · Friday before fourth Wednesday':r.rule==='last'?' · Last calendar day':'')+(r.archived?' · Archived':''),...(r.stop?[]:[b('Edit rule',()=>incomeForm(r))]),b(r.archived?'Restore':'Archive',()=>toggleArchive(r))));
 for(const x of C.events(m,C.add(today(),90)).filter(x=>x.kind==='income').sort((a,b)=>a.date.localeCompare(b.date)))p.append(record(x.name+' · '+x.date,name(x.account)+' · '+dollars(x.amount),badge(x.status),b('Edit deposit',()=>occurrenceForm(x))));root.append(p)}
function dueLabel(x){return x.due?(x.certainty==='estimated'?'Estimated ':'')+x.due:'Unknown'}
function bills(root){const p=card('Bill rules');p.append(b('Add bill',()=>billForm(),'primary'),e('p','A rule generates upcoming occurrences. Edit one occurrence to reschedule or mark it Paid or Cleared. Unknown dates need a preferred planning date to appear in forecasts.'));
 const filter=row();const defs=[['account','Account',[['','All accounts'],...m.accounts.map(a=>[a.id,a.name])]],['status','Status',[['','All statuses'],['planned','Planned'],['pending','Paid / pending'],['cleared','Cleared']]],['frequency','Frequency',[['','All frequencies'],...Object.entries(frequencies)]],['due','Due date',[['','Any date'],['week','Next 7 days'],['month','Next 30 days'],['overdue','Past due'],['unknown','Unknown']]]];for(const [k,label,opts] of defs){const selectEl=select(k,opts,filters[k]);selectEl.onchange=()=>{filters[k]=selectEl.value;render()};filter.append(field(label,selectEl))}p.append(filter);
 const relevant=r=>(!filters.account||r.account===filters.account)&&(!filters.frequency||r.frequency===filters.frequency);
 for(const r of m.bills.filter(r=>!r.deleted&&relevant(r)))p.append(record(r.name,[name(r.account),dollars(r.amount),frequencies[r.frequency],r.certainty==='unknown'?'Due unknown':r.certainty==='estimated'?'Estimated due '+r.start:'Verified due '+r.start,r.start?'First payment '+C.add(r.start,r.offset||0):'Unscheduled',r.autopay?'Autopay':'Manual pay',r.archived?'Archived':'',r.stop?'Replaced from '+r.stop:'',r.notes||''].filter(Boolean).join(' · '),...(r.stop?[]:[b('Edit rule',()=>billForm(r))]),b(r.archived?'Restore':'Archive',()=>toggleArchive(r)),b('Delete',()=>removeRule(r),'link')));
 root.append(p);const list=card('Bill occurrences · next 90 days and unpaid carryovers');let rows=C.events(m,C.add(today(),90)).filter(x=>x.kind==='bill'&&(!filters.account||x.account===filters.account)&&(!filters.status||x.status===filters.status)&&(!filters.frequency||m.bills.find(r=>r.id===x.ruleId)?.frequency===filters.frequency));rows=rows.filter(x=>!filters.due||filters.due==='unknown'&&!x.due||x.due&&(filters.due==='overdue'?x.due<today()&&x.status==='planned':x.due>=today()&&x.due<=C.add(today(),filters.due==='week'?7:30))).sort((a,b)=>a.date.localeCompare(b.date));
 for(const x of rows)list.append(record(x.name,name(x.account)+' · '+dollars(x.amount)+' · due '+dueLabel(x)+' · payment '+(x.preferred||x.date)+(x.posted?' · posted '+x.posted:'')+' · Paid: '+(x.paid?'yes':'no')+' · Cleared: '+(x.cleared?'yes':'no')+(x.notes?' · '+x.notes:''),badge(x.status),b('Edit occurrence',()=>occurrenceForm(x)),...(x.status==='planned'?[b('Skip this one',()=>{if(confirm('Skip just this occurrence?')){m.overrides[x.id]={...x,skipped:true};commit()}},'link')]:[])));
 if(!rows.length)list.append(e('p','No matching bill occurrences.'));root.append(list)
}
function transfers(root){const p=card('Between-account transfers');p.append(b('Add transfer',()=>transferForm(),'primary'),e('p','Moves money between accounts without changing household income or expenses. Mark completed using the date posted at the bank.'));for(const t of [...m.transfers].filter(t=>!t.deleted).sort((a,b)=>b.date.localeCompare(a.date)))p.append(record(t.name,name(t.from)+' → '+name(t.to)+' · '+dollars(t.amount)+' · '+t.date,badge(t.status),b('Edit transfer',()=>transferForm(t)),b('Delete',()=>{if(confirm('Remove this transfer from planner balances?')){t.deleted=true;commit()}},'link')));root.append(p)}
function horizonChoice(){const h=select('horizon',[['30','30 days'],['60','60 days'],['90','90 days']],String(horizon));h.onchange=()=>{horizon=Number(h.value);render()};return field('Forecast window',h)}
function timeline(root,report){const p=card('Cash-flow forecast');const view=select('scope',[['','Combined household'],...m.accounts.map(a=>[a.id,a.name])],scope);view.onchange=()=>{scope=view.value;render()};p.append(row(horizonChoice(),field('View',view)),e('p','Through '+report.end+' · household deposits '+dollars(report.income)+' · household bills '+dollars(report.expenses)+'. Combined view shows internal transfers with zero net effect. Overdue bills and pending items are projected today. Past unconfirmed paydays are excluded until you record them.'));
 const current=scope?report.accounts.find(a=>a.id===scope)?.current:report.combined.current;
 p.append(e('p','Starting cleared balance: '+dollars(current)));
 for(const a of report.accounts.filter(a=>!scope||a.id===scope))for(const period of a.lowPeriods)p.append(record(a.name+' · '+period.status,period.start+(period.end!==period.start?' through '+period.end:''),badge(period.status)));
 const rows=scope?report.timeline.filter(r=>r.accountId===scope):report.household;const cushion=scope?report.accounts.find(a=>a.id===scope)?.cushion??0:report.accounts.reduce((n,a)=>n+a.cushion,0);
 for(const x of rows){const low=x.balance!==null&&x.balance<cushion;const status=x.balance!==null&&x.balance<0?'overdraft':low?'low balance':x.status;p.append(record(x.date+' · '+x.name,(x.kind==='transfer'?name(x.from)+' → '+name(x.to):name(x.account))+' · '+(x.kind==='transfer'&&!scope?'$0.00 net':(x.delta<0?'−':'+')+dollars(Math.abs(x.delta)))+' · after '+dollars(x.balance)+(x.originalDate!==x.date?' · originally '+x.originalDate:'')+(x.certainty==='estimated'?' · estimated due':x.certainty==='unknown'?' · due unknown':''),badge(status)))}
 if(!rows.length)p.append(e('p','No transactions in this forecast window.'));root.append(p)
}
function paint(){const content=document.getElementById('content');m=state.cashFlow||C.init(today());content.replaceChildren(banner());const report=['Overview','Forecast'].includes(tab)?C.forecast(m,today(),horizon):null;
 if(tab==='Accounts')accounts(content);else if(tab==='Income')income(content);else if(tab==='Bills')bills(content);else if(tab==='Transfers')transfers(content);else if(tab==='Forecast')timeline(content,report);else overview(content,report)}
const prior=render;render=function(){prior();if(page==='Finances')paint()};render();
})();
