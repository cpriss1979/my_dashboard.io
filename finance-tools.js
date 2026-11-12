/* Presentation and reversible record tools. CashFlowCore remains the balance authority. */
(function(root){'use strict';
const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function monthEnd(month){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)}
function compareBillDue(a,b){
 return (a.due||"9999").localeCompare(b.due||"9999") || a.name.localeCompare(b.name);
}
function groups(rows,today,month){const end=monthEnd(month),week=new Date(Date.parse(today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10),out={soon:[],later:[],paid:[],upcoming:[],unknown:[]};for(const x of rows){const paid=x.paid||x.status==='pending'||x.status==='cleared',date=x.due||x.scheduled||x.date;if(paid){if(date?.slice(0,7)===month)out.paid.push(x);continue}if(!x.due){out.unknown.push(x);continue}if(x.due<=week)out.soon.push(x);else if(x.due>=month+'-01'&&x.due<=end)out.later.push(x);else out.upcoming.push(x)}for(const list of Object.values(out))list.sort(compareBillDue);return out}
function billMonthRows(events,month){
 return events.filter(item=>item.kind==='bill'&&item.due?.slice(0,7)===month).sort(compareBillDue);
}
function billTotals(rows){
 const totals={total:0,cleared:0,pending:0,planned:0};
 for(const row of rows){
  totals.total+=row.amount;
  totals[row.status]+=row.amount;
 }
 return totals;
}
function billPayment(model,core,bill,{date,paymentDate=date,status,ledgerId}){
 const account=model.accounts.find(a=>a.id===bill.account&&!a.deleted);
 if(!account)throw Error('Choose an active paying account before recording payment.');
 const matching=ledgerId?(model.ledger||[]).find(row=>row.id===ledgerId&&!row.deleted&&row.direction==='out'&&row.account===bill.account&&row.amount===bill.amount&&row.date===date):null;
 if(ledgerId&&(!matching||status!=='cleared'))throw Error('Choose a cleared transaction with the same account, amount and date.');
 const afterBalances=matching?matching.afterBalances:{[account.id]:core.balanceKey(account)};
 model.overrides[bill.id]={...bill,paid:true,cleared:status==='cleared',status,posted:date,paymentDate,date,
  preferred:bill.preferred||bill.date,afterBalances,...(matching?{linkedTransactionId:matching.id}:{})};
 if(matching){matching.deleted=true;matching.linkedBillId=bill.id}
}
function splitBillRule(model,core,rule,original,next,newRuleId){
 const start=next.due||next.preferred;
 const previous=core.occurrences(rule,core.add(original.scheduled,-1)).at(-1);
 if(previous&&start<=previous)throw Error('Choose a date after the previous occurrence, or edit this bill only.');
 if(rule.stop&&start>=rule.stop)throw Error('This schedule already has a later replacement. Edit this bill only or adjust the later rule.');
 const later=Object.values(model.overrides).some(item=>item.ruleId===rule.id&&item.id!==original.id&&item.scheduled>=original.scheduled);
 if(later)throw Error('Later occurrences already have saved changes. Edit this bill only to preserve those records.');
 if(!start)throw Error('Enter a due or preferred date before changing the repeating schedule.');
 const offset=core.day(next.preferred||start)-core.day(start);
 if(Math.abs(offset)>366)throw Error('Choose a preferred date within one year of the due date.');
 const replacement={...rule,id:newRuleId,start,offset,account:next.account,name:next.name,amount:next.amount,
  certainty:next.certainty,estimatedAmount:next.estimatedAmount,notes:next.notes};
 delete replacement.legacyPaid;
 const id=newRuleId+'|'+start;
 rule.stop=original.scheduled;
 model.bills.push(replacement);
 model.overrides[original.id]={...original,skipped:true};
 model.overrides[id]={...next,id,ruleId:newRuleId,scheduled:start};
}
function paydayPlan(account,today,fallbackEnd){
 const hasPayday=!!account.nextDeposit;
 const cutoff=account.nextDeposit?.date||fallbackEnd;
 const items=account.future.map(item=>{
  const date=item.kind==='bill'&&item.status==='planned'&&item.due&&item.due<item.date
   ? (item.due<today?today:item.due) : item.date;
  return {...item,date};
 }).filter(item=>item.date<=cutoff).sort((a,b)=>a.date.localeCompare(b.date));
 const before=items.filter(item=>!hasPayday||item.date<cutoff);
 const onDay=hasPayday?items.filter(item=>item.date===cutoff):[];
 const bills=onDay.filter(item=>item.kind==='bill'&&item.delta<0);
 const knownBefore=bills.filter(item=>item.paydayTiming==='before');
 const unknown=bills.filter(item=>item.paydayTiming!=='before'&&item.paydayTiming!=='after');
 const knownIds=new Set(knownBefore.map(item=>item.id));
 const orderedPayday=[...knownBefore,...onDay.filter(item=>!knownIds.has(item.id)).sort((a,b)=>b.delta-a.delta)];
 let available=account.current,lowest=account.current,firstShort=account.current<0?today:null,firstShortBalance=account.current<0?account.current:null;
 for(const item of before){
  if(available===null)break;
  available+=item.delta;
  lowest=Math.min(lowest,available);
  if(!firstShort&&available<0){firstShort=item.date;firstShortBalance=available}
 }
 const net=rows=>rows.reduce((sum,item)=>sum+item.delta,0);
 const preDeposit=available===null?null:available+net(knownBefore);
 const conditionalShortfall=preDeposit===null||!unknown.length?0:Math.max(0,-(preDeposit+net(unknown)));
 const after=available===null||!hasPayday?null:available+net(onDay);
 return {cutoff,items:[...before,...orderedPayday],before,onDay,bills,unknown,available,after,
  lowest,firstShort,firstShortBalance,preDeposit,conditionalShortfall,hasPayday};
}
const arrays=['accounts','income','bills','transfers','ledger','goals','reconciliations'];
function changes(before,after){const out=[];for(const key of [...arrays,'overrides']){const a=key==='overrides'?before[key]||{}:Object.fromEntries((before[key]||[]).map(x=>[x.id,x])),b=key==='overrides'?after[key]||{}:Object.fromEntries((after[key]||[]).map(x=>[x.id,x]));for(const id of new Set([...Object.keys(a),...Object.keys(b)])){if(JSON.stringify(a[id])===JSON.stringify(b[id]))continue;out.push({key,id,hadBefore:a[id]!==undefined,hadAfter:b[id]!==undefined,before:copy(a[id])??null,after:copy(b[id])??null})}}return out}
function undo(model,entry){if(entry.undone)throw Error('This change has already been undone.');for(const op of entry.changes){const now=op.key==='overrides'?model.overrides?.[op.id]:(model[op.key]||[]).find(x=>x.id===op.id);if(JSON.stringify(now)!==JSON.stringify(op.hadAfter?op.after:undefined))throw Error('This record has changed since then. Use Edit to correct it safely.');}for(const op of entry.changes){if(op.key==='overrides'){if(op.hadBefore)model.overrides[op.id]=copy(op.before);else delete model.overrides[op.id]}else{model[op.key]??=[];const i=model[op.key].findIndex(x=>x.id===op.id);if(i>=0)model[op.key].splice(i,1);if(op.hadBefore)model[op.key].splice(i<0?model[op.key].length:i,0,copy(op.before))}}entry.undone=true}
const api={splitBillRule,billMonthRows,billTotals,billPayment,paydayPlan,compareBillDue,monthEnd,groups,changes,undo,copy};root.FinanceTools=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
