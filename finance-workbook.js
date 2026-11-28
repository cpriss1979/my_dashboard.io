/* Apply workbook presentation to the active CashFlow renderer. */
(function(){
 const root=document.getElementById('content');
 function apply(){
  if(typeof page==='undefined'||page!=='Finances'){root.classList.remove('finance-workbook');return}
  const toolbar=root.querySelector('.cf-simple-toolbar');if(!toolbar)return;
  root.classList.add('finance-workbook');
  toolbar.classList.add('finance-workbook-top');
  const title=toolbar.querySelector('h2');if(title)title.textContent='Finance workbook';
  root.querySelectorAll('.cf-settings').forEach(d=>{if(!d.dataset.workbook){d.open=false;d.dataset.workbook='1'}});
  toolbar.querySelectorAll('button').forEach(b=>{if(/^(Rename budget|Loan tools)$/.test(b.textContent.trim()))b.hidden=true});
 }
 const observer=new MutationObserver(()=>{observer.disconnect();apply();observer.observe(root,{childList:true,subtree:true})});
 observer.observe(root,{childList:true,subtree:true});apply();
 const style=document.createElement('style');style.textContent=`
 html body.glow-redesign main #content.finance-workbook .cf-simple-toolbar{display:flex!important;flex-wrap:wrap!important;gap:8px!important;padding:14px!important;margin-bottom:12px!important}
 html body.glow-redesign main #content.finance-workbook .cf-card{padding:14px!important;margin-bottom:12px!important}
 html body.glow-redesign main #content.finance-workbook .cf-settings{width:100%;margin:0!important}
 html body.glow-redesign main #content.finance-workbook .cf-settings>summary{padding:5px 0!important}
 html body.glow-redesign main #content.finance-workbook .cf-record-grid{gap:5px!important}
 html body.glow-redesign main #content.finance-workbook .cf-record-grid>div{padding:8px!important;min-height:0!important}
 html body.glow-redesign main #content.finance-workbook .cf-payday-grid{gap:10px!important}
 html body.glow-redesign main #content.finance-workbook .cf-card h2{margin:0 0 10px!important;font-size:20px!important}
 html body.glow-redesign main #content.finance-workbook button[hidden]{display:none!important}
 html body.glow-redesign main #content.finance-workbook .cf-simple-tabs button{padding:7px 11px!important;min-height:38px!important}
 `;document.head.append(style);
})();