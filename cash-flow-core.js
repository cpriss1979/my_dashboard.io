(function(root){
'use strict';
const dayMs=86400000, day=s=>Date.parse(s+'T00:00:00Z')/dayMs, iso=n=>new Date(n*dayMs).toISOString().slice(0,10), add=(s,n)=>iso(day(s)+n);
const month=(s,n)=>{const d=new Date(s+'T00:00:00Z');return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1)).toISOString().slice(0,7)};
const monthEnd=m=>add(month(m+'-01',1)+'-01',-1);
const at=(m,n)=>m+'-'+String(Math.min(n,Number(monthEnd(m).slice(-2)))).padStart(2,'0');
function payday(m,rule,n){if(rule==='last')return monthEnd(m);if(rule==='rick'){const dow=new Date(m+'-01T00:00:00Z').getUTCDay();return at(m,17+(3-dow+7)%7)}return at(m,n)}
const steps={monthly:1,bimonthly:2,quarterly:3,annually:12};
function occurrences(r,end){
 if(!r.start||r.start>end)return [];
 if(r.frequency==='once')return [r.start];
 const out=[];
 if(r.frequency==='weekly'||r.frequency==='biweekly'){const step=r.frequency==='weekly'?7:14;for(let d=day(r.start),limit=day(end);d<=limit;d+=step)out.push(iso(d));return out}
 const step=steps[r.frequency]||1;
 for(let i=0;;i+=step){const m=month(r.start,i);if(m>end.slice(0,7))break;const d=payday(m,r.rule,Number(r.start.slice(-2)));if(d>=r.start&&d<=end)out.push(d)}
 return out
}
function init(today){return {schema:1,accounts:[{id:'crystal',name:'Crystal',opening:null,asOf:today,cushion:0},{id:'rick',name:'Rick',opening:null,asOf:today,cushion:0}],income:[{id:'crystal-pay',name:'Crystal payday',account:'crystal',amount:242700,frequency:'monthly',rule:'last',start:today},{id:'rick-pay',name:'Rick payday',account:'rick',amount:192000,frequency:'monthly',rule:'rick',start:today}],bills:[],transfers:[],overrides:{}}}
function events(m,end,{byDue=false}={}){
 const rows=[];
 const deletedAccounts = new Set(m.accounts.filter(a=>a.deleted).map(a=>a.id));
 for(const r of [...m.income,...m.bills]){
  const bill=m.bills.includes(r);
  if(r.deleted||deletedAccounts.has(r.account)||(r.archived&&(!bill||!r.archivedOn)))continue;
  const latest=!byDue&&bill&&r.offset<0?add(end,-r.offset):end;
  for(const scheduled of occurrences(r,latest)){
   if(r.stop&&scheduled>=r.stop||r.archived&&scheduled>r.archivedOn)continue;
   const id=r.id+'|'+scheduled;if(m.overrides[id])continue;
   const due=bill&&r.certainty!=='unknown'?scheduled:null;
   const date=bill?add(scheduled,r.offset||0):scheduled;
   // Reviewed monthly/one-time legacy series do not replay previously marked payments.
   if(bill&&r.legacyPaid?.[scheduled.slice(0,7)])continue;
   if((byDue&&bill?scheduled:date)<=end)rows.push({id,ruleId:r.id,scheduled,date,due,amount:r.amount,account:r.account,name:r.name,kind:bill?'bill':'income',status:'planned',certainty:r.certainty,estimatedAmount:!!r.estimatedAmount,notes:r.notes||''});
  }
 }
 for(const o of Object.values(m.overrides)){
  const rule=[...m.bills,...m.income].find(r=>r.id===o.ruleId);
  const cutoffDate=byDue&&o.kind==='bill'?(o.due||o.scheduled||o.date):o.date;
  const archivedFuture=rule?.archived&&(!rule.archivedOn||(o.scheduled||o.due||o.date)>rule.archivedOn);
  if(!byDue&&!o.date)continue;
  if((o.status==='planned'&&deletedAccounts.has(o.account))||o.deleted||o.skipped||cutoffDate>end||((archivedFuture||rule?.deleted)&&o.status==='planned'))continue;
  rows.push(o);
 }
 for(const a of m.ledger||[])if(!a.deleted&&a.date<=end)rows.push({...a,kind:a.direction==='in'?'money-in':'money-out',status:'cleared'});
 for(const t of m.transfers)if(!t.deleted&&t.date<=end)rows.push({...t,kind:'transfer',status:t.status==='completed'?'cleared':t.status});
 return rows;
}
function forecast(m,today,horizon){
 const deletedAccounts = new Set(m.accounts.filter(a=>a.deleted).map(a=>a.id));
 const included = row => row.status==='cleared' ||
  ![row.account,row.from,row.to].some(id=>deletedAccounts.has(id));
 const end=add(today,horizon);
 const rows=events(m,end).filter(included);
 const plannerRows=events(m,add(today,366)).filter(included);
 const allAccounts=m.accounts.filter(a=>!a.deleted).map(a=>{
  const configured=Number.isInteger(a.opening)&&a.asOf<=today;
  let current=configured?a.opening:null;
  const related=list=>list.flatMap(r=>r.kind==='transfer'?(r.from===a.id?[{...r,delta:-r.amount}]:r.to===a.id?[{...r,delta:a.type!=='savings'&&m.accounts.find(from=>from.id===r.from)?.type==='savings'&&r.status!=='cleared'?0:r.amount,unavailable:a.type!=='savings'&&m.accounts.find(from=>from.id===r.from)?.type==='savings'&&r.status!=='cleared'}]:[]):r.account===a.id?[{...r,delta:['bill','money-out'].includes(r.kind)?-r.amount:r.amount}]:[]);
  const relevant=related(rows);
  for(const r of relevant)if(configured&&r.status==='cleared'&&(r.date>a.asOf||r.date===a.asOf&&r.afterBalances?.[a.id]===balanceKey(a))&&r.date<=today)current+=r.delta;
  const upcoming=list=>list.filter(r=>r.status!=='cleared'&&!(r.kind==='income'&&r.status==='planned'&&(r.date<today||configured&&r.date<=a.asOf))).map(r=>({...r,originalDate:r.date,date:r.date<today?today:r.date})).sort((x,y)=>x.date.localeCompare(y.date)||priority(x)-priority(y));
  const future=upcoming(relevant),planning=upcoming(related(plannerRows)),nextDeposit=planning.find(r=>r.kind==='income');
  const dueBeforeDeposit=planning.filter(r=>r.kind==='bill'&&r.status==='planned'&&r.due&&(nextDeposit?r.due<nextDeposit.date:r.due<=end));
  const reserveRows=planning.map(r=>r.kind==='bill'&&r.status==='planned'&&r.due&&r.due<r.date?{...r,date:r.due<today?today:r.due}:r).filter(r=>nextDeposit?r.date<nextDeposit.date:r.date<=end).sort((x,y)=>x.date.localeCompare(y.date)||priority(x)-priority(y));
  let running=current,min=current,firstShort=configured&&current<0?today:null,nextReserve=0,net=0;
  // Same-day deposits are available; transfers fund the recipient before bills are paid.
  for(const r of reserveRows){net+=r.delta;nextReserve=Math.max(nextReserve,-net)}
  for(const r of future){if(configured){running+=r.delta;min=Math.min(min,running);if(!firstShort&&running<0)firstShort=r.date}r.balance=running}
  const pending=future.filter(r=>r.status==='pending').reduce((n,r)=>n+r.delta,0);
  return {...a,configured,current,pending,projected:running,reserved:nextReserve,safe:configured?Math.max(0,Math.min(current-nextReserve,min)-a.cushion):null,min,firstShort,nextDeposit,billsBeforeDeposit:reserveRows.filter(r=>r.kind==='bill'),dueBeforeDeposit,lowPeriods:periods(today,end,current,a.cushion,future),future};
 });
 const accounts=allAccounts.filter(a=>a.type!=='savings'),savings=allAccounts.filter(a=>a.type==='savings');
 const ready=accounts.every(a=>a.configured),sum=k=>accounts.reduce((n,a)=>n+(a[k]??0),0);
 const timeline=accounts.flatMap(a=>a.future.map(r=>({...r,accountId:a.id}))).sort((a,b)=>a.date.localeCompare(b.date)||priority(a)-priority(b));
 let combined=ready?sum('current'):null;const household=[];
 const seenTransfers=new Set();for(const r of timeline){if(r.kind==='transfer'){if(seenTransfers.has(r.id))continue;seenTransfers.add(r.id);const net=accounts.some(a=>a.id===r.from)&&accounts.some(a=>a.id===r.to)?0:r.delta;if(ready)combined+=net;household.push({...r,delta:net,balance:combined});continue}if(ready)combined+=r.delta;household.push({...r,balance:combined})}
 const uncertain=!ready||m.bills.some(b=>!b.archived&&!b.deleted&&!b.start);
 const recommendations=[];const remaining=new Map(accounts.map(a=>[a.id,a.safe??0]));
 for(const to of uncertain?[]:accounts.filter(a=>a.configured&&a.min<0)){
  let need=-to.min;
  for(const from of accounts.filter(a=>a.id!==to.id&&a.configured)){
   const amount=Math.min(need,remaining.get(from.id));if(amount<=0)continue;
   recommendations.push({from:from.id,to:to.id,amount,needBy:to.firstShort,date:today});remaining.set(from.id,remaining.get(from.id)-amount);need-=amount;
   if(!need)break;
  }
 }
 return {end,accounts,savings,timeline,household,combined:{current:ready?sum('current'):null,projected:ready?sum('projected'):null,reserved:sum('reserved'),safe:ready?sum('safe'):null},recommendations,income:household.filter(r=>['income','money-in'].includes(r.kind)).reduce((n,r)=>n+r.amount,0),expenses:household.filter(r=>['bill','money-out'].includes(r.kind)).reduce((n,r)=>n+r.amount,0)};
}
function periods(today,end,current,cushion,rows){
 if(current===null)return [];const last=new Map(rows.map(r=>[r.date,r.balance])),out=[];let balance=current;
 for(let d=day(today);d<=day(end);d++){const date=iso(d);if(last.has(date))balance=last.get(date);const status=balance<0?'overdraft':balance<cushion?'low balance':null;if(!status)continue;const prev=out.at(-1);if(prev?.status===status&&add(prev.end,1)===date)prev.end=date;else out.push({status,start:date,end:date})}
 return out
}
function priority(r){return ['income','money-in'].includes(r.kind)?0:r.kind==='transfer'?(r.delta<0?1:2):3}
function balanceKey(a){return a.balanceVersion||a.asOf+'|'+a.opening}
function billDate(r,today){if(!r.start||r.certainty==='unknown')return '';const dates=occurrences(r,add(today,370)).filter(d=>!r.stop||d<r.stop);return dates.find(d=>d>=today)||dates.at(-1)||r.start}
const api={balanceKey,billDate,add,day,at,payday,occurrences,init,events,forecast};root.CashFlowCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
