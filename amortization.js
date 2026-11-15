(function (root) {
  'use strict';

  function schedule({ principal, annualRate, months, extra = 0, start }) {
    if (!Number.isSafeInteger(principal) || principal < 1 || principal > 1e11 ||
        !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100 ||
        !Number.isInteger(months) || months < 1 || months > 600 ||
        !Number.isSafeInteger(extra) || extra < 0 || extra > 1e11 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(start || '')) throw Error('Check the amount, rate, term, and first payment date.');

    const first = new Date(start+'T00:00:00Z');
    if (!Number.isFinite(first.valueOf()) || first.toISOString().slice(0,10) !== start) {
      throw Error('Enter a valid first payment date.');
    }
    const rate = annualRate / 1200;
    const regular = rate ? principal * rate / -Math.expm1(-months * Math.log1p(rate)) : principal / months;
    const payment = Math.max(1, Math.round(regular));
    let balance = principal;
    let totalInterest = 0;
    let totalPaid = 0;
    const payments = [];
    for (let i=0; i<months && balance>0; i++) {
      const interest = Math.round(balance * rate);
      const amount = i===months-1 ? balance+interest : Math.min(balance+interest,payment+extra);
      const applied = amount-interest;
      balance -= applied;
      totalInterest += interest;
      totalPaid += amount;
      const date = new Date(first);
      date.setUTCDate(1);
      date.setUTCMonth(first.getUTCMonth()+i);
      const end = new Date(date);
      end.setUTCMonth(end.getUTCMonth()+1,0);
      date.setUTCDate(Math.min(first.getUTCDate(), end.getUTCDate()));
      payments.push({ number:i+1, date:date.toISOString().slice(0,10), amount, principal:applied, interest, balance });
    }
    return {payment,totalInterest,totalPaid,payments};
  }

  root.DashboardAmortization = { schedule };
  if (!root.document) return;

  function element(tag,text,className) {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(className)node.className=className;
    return node;
  }

  function paint() {
    const panel=element('section',undefined,'card amortization-panel');
    const entry=element('form',undefined,'amortization-fields');
    const stored=state.amortization;
    const defaults={amount:'',rate:'',months:'360',extra:'0',start:localDate(new Date())};
    for(const field of [
      {key:'amount',title:'Loan amount ($)',min:.01,max:1e9,step:.01},
      {key:'rate',title:'Annual interest rate (%)',min:0,max:100,step:.001},
      {key:'months',title:'Term in months',min:1,max:600,step:1},
      {key:'extra',title:'Extra principal each month ($)',min:0,max:1e9,step:.01},
      {key:'start',title:'First payment date',type:'date'}
    ]) {
      const label=element('label',field.title);
      const input=element('input');
      input.name=field.key;
      input.type=field.type||'number';
      if(field.min!==undefined){
        input.min=String(field.min);input.max=String(field.max);input.step=String(field.step);
      }
      input.required=true;
      input.value=stored?.[field.key]??defaults[field.key];
      label.append(input);
      entry.append(label);
    }
    const controls=element('div',undefined,'amortization-controls');
    const calculate=element('button','Calculate schedule','primary');
    calculate.type='submit';
    const reset=element('button','Clear schedule','secondary');
    reset.type='button';
    reset.onclick=()=>{
      delete state.amortization;
      save();
      render();
    };
    controls.append(calculate,reset);
    entry.append(controls);
    const result=element('div',undefined,'amortization-result');
    result.setAttribute('aria-live','polite');

    function display(values) {
      const output=schedule({
        principal:Math.round(Number(values.amount)*100),annualRate:Number(values.rate),
        months:Number(values.months),extra:Math.round(Number(values.extra)*100),start:values.start
      });
      const summary=element('dl',undefined,'amortization-summary');
      const last=output.payments.at(-1);
      for(const [label,value] of [
        ['Regular principal & interest',money(output.payment/100)],
        ['Total interest',money(output.totalInterest/100)],
        ['Total paid',money(output.totalPaid/100)],
        ['Payoff',displayUSDate(last.date)]
      ]) {
        const card=element('div');
        card.append(element('dt',label),element('dd',value));
        summary.append(card);
      }
      result.replaceChildren(summary);
      const years=new Map();
      for(const payment of output.payments){
        const year=payment.date.slice(0,4);
        if(!years.has(year))years.set(year,[]);
        years.get(year).push(payment);
      }
      let first=true;
      for(const [year,items] of years){
        const details=element('details');
        details.open=first;
        first=false;
        details.append(element('summary',year+' · '+items.length+(items.length===1?' payment':' payments')));
        const scroll=element('div',undefined,'table-scroll');
        const table=element('table');
        const header=element('thead');
        const headerRow=element('tr');
        for(const heading of ['Payment','Date','Amount','Principal','Interest','Balance']){
          const cell=element('th',heading);cell.scope='col';headerRow.append(cell);
        }
        header.append(headerRow);
        const rows=element('tbody');
        for(const item of items){
          const row=element('tr');
          row.append(...[item.number,displayUSDate(item.date),...[item.amount,item.principal,item.interest,item.balance].map(cents=>money(cents/100))].map(value=>element('td',String(value))));
          rows.append(row);
        }
        table.append(header,rows);scroll.append(table);details.append(scroll);result.append(details);
      }
    }
    entry.onsubmit=event=>{
      event.preventDefault();
      const values=Object.fromEntries(new FormData(entry));
      try{display(values);state.amortization=values;save()}
      catch(error){result.replaceChildren(element('p',error.message))}
    };
    panel.append(element('h2','Loan payment schedule'),
      element('p','Fixed-rate estimate with monthly payments. Taxes, insurance, and fees are excluded.'),entry,result);
    if(stored)try{display(stored)}catch(error){result.append(element('p',error.message))}
    document.getElementById('content').replaceChildren(panel);
  }

  const previous=render;
  render=function(){
    if(page!=='Amortization'){previous();return}
    page='Quick notes';
    try{previous()}finally{page='Amortization'}
    document.body.dataset.glowPage=page;
    for(const id of ['appPageTitle','title']){
      const title=document.getElementById(id);
      if(title)title.textContent=page;
    }
    document.querySelectorAll('aside nav [data-page]').forEach(button=>{
      const active=button.dataset.page===page;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    paint();
  };
})(globalThis);
