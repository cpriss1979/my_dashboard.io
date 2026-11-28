/* Keep the existing Finance rendering and data. Add a workbook-style summary and compact tools. */
(function(){
 let lastPage='';
 function install(){
  const root=document.getElementById('content');if(!root||page!=='Finances'){lastPage=page;return}
  const summary=root.querySelector('.finance-account-summary');
  /* The all-accounts view does not render the single-person summary. Keep retrying
     until Finance has finished painting, then attach the workbook shell to its
     actual first Finance panel instead of marking an incomplete install complete. */
  if(!summary){if(root.dataset.financeWorkbook==='1')delete root.dataset.financeWorkbook;return}
  if(root.dataset.financeWorkbook==='1')return;root.dataset.financeWorkbook='1';root.classList.add('finance-workbook');
  const name=summary.querySelector('.finance-account-name');
  const top=document.createElement('section');top.className='finance-workbook-top';top.innerHTML='<div><h2>Finance workbook</h2><small class="muted">Current month · Select a name or account below to see its details.</small></div><div class="finance-workbook-actions"></div>';
  const actions=top.querySelector('.finance-workbook-actions');
  const add=document.createElement('button');add.className='primary';add.textContent='＋ Add';add.onclick=()=>{const d=document.createElement('dialog');d.innerHTML='<h2>Add to Finance</h2><div class="finance-workbook-tools"></div><div class="actions"><button class="secondary">Close</button></div>';const box=d.querySelector('.finance-workbook-tools');[['Bill',()=>expenseModal()],['Income',()=>incomeModal()],['Savings',()=>savingsEntryModal('deposit')],['Transfer',()=>personTransferModal()]].forEach(([label,fn])=>{const b=document.createElement('button');b.className='secondary';b.textContent=label;b.onclick=()=>{d.close();d.remove();fn()};box.append(b)});d.querySelector('.actions button').onclick=()=>{d.close();d.remove()};document.body.append(d);d.showModal()};actions.append(add);
  const undo=document.createElement('button');undo.className='secondary';undo.textContent='Undo';undo.onclick=()=>notify('Use Change history to reverse the last saved finance action.');actions.append(undo);
  const tools=document.createElement('details');tools.innerHTML='<summary>Tools</summary><div></div>';const menu=tools.querySelector('div');
  [['Add account',()=>accountSettings()],['Export backup',()=>typeof exportDashboardBackup==='function'?exportDashboardBackup():document.getElementById('backupExportButton')?.click()],['Recurring schedules',()=>[...root.querySelectorAll('button')].find(b=>/recurring/i.test(b.textContent))?.click()],['Reconcile account',()=>[...root.querySelectorAll('button')].find(b=>/reconcile/i.test(b.textContent))?.click()],['Archive',()=>{const b=[...root.querySelectorAll('button')].find(b=>/archive/i.test(b.textContent));b?.click()}],['Plan a purchase',()=>purchasePlan()]].forEach(([label,fn])=>{const b=document.createElement('button');b.className='secondary';b.textContent=label;b.onclick=fn;menu.append(b)});actions.append(tools);
  summary.prepend(top);
  const nav=root.querySelector('.glow-finance-tabs');if(nav){const first=nav.querySelector('button');if(first)first.click()}
  root.querySelectorAll('.finance-collapsible').forEach(section=>{section.open=true});
  root.querySelectorAll('.finance-collapsible-body>p.muted').forEach(p=>{const d=document.createElement('details');d.className='finance-help-compact';d.innerHTML='<summary>Details</summary>';p.before(d);d.append(p)});
  if(name)name.setAttribute('aria-label',name.textContent.trim());
 }
 function purchasePlan(){const d=document.createElement('dialog');d.innerHTML='<form><h2>Plan a purchase</h2><p class="muted">Estimate a regular amount to set aside. This will not change your balances.</p><label>Purchase name<input name="name" required></label><label>Price<input name="price" type="number" min="0.01" step="0.01" required></label><label>Already saved<input name="saved" type="number" min="0" step="0.01" value="0"></label><label>Purchase date<input name="date" type="date" required></label><p aria-live="polite"></p><div class="actions"><button type="button" class="secondary">Cancel</button><button class="primary">Calculate</button></div></form>';const f=d.querySelector('form'),p=d.querySelector('p[aria-live]');f.querySelectorAll('input').forEach(x=>x.oninput=()=>{const price=Number(f.elements.price.value),saved=Number(f.elements.saved.value)||0,date=f.elements.date.value;if(!price||!date)return;const days=Math.max(1,Math.ceil((new Date(date+'T12:00:00')-new Date())/86400000)),months=Math.max(1,Math.ceil(days/30));p.textContent=`Set aside $${Math.max(0,price-saved).toFixed(2)} total, or $${(Math.max(0,price-saved)/months).toFixed(2)} per month.`});f.querySelector('button[type=button]').onclick=()=>{d.close();d.remove()};f.onsubmit=e=>{e.preventDefault();f.querySelector('button[type=submit]')?.setAttribute('type','button');notify(p.textContent||'Enter a purchase date to calculate.');};document.body.append(d);d.showModal()}
 const renderBase=window.render;window.render=function(){const result=renderBase.apply(this,arguments);requestAnimationFrame(()=>{if(rootReady())install()});return result};function rootReady(){return page==='Finances'}
})();
