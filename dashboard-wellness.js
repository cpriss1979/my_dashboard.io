(function () {
  'use strict';

  const guides = {
    strength: 'https://www.nhs.uk/live-well/exercise/strength-exercises/',
    seated: 'https://www.nhs.uk/live-well/exercise/sitting-exercises/',
    activity: 'https://www.cdc.gov/healthy-weight-growth/physical-activity/'
  };
  const workouts = [
    {id:'march', name:'Seated march', guide:'seated', image:'NHSC_hip-marching1', alt:'Seated person lifting one bent knee', steps:['Sit tall in a steady chair and hold its sides.', 'Lift one bent knee a comfortable distance, then lower your foot gently.', 'Alternate sides. Start with up to 5 lifts per leg.']},
    {id:'stretch', name:'Seated chest stretch', guide:'seated', image:'NHSC_0118_chest-stretch1', alt:'Seated person extending both arms to the sides', steps:['Sit upright and let your shoulders relax down.', 'Reach your arms out and lift your chest gently.', 'Hold for 5 to 10 seconds at a comfortable stretch, then release.']},
    {id:'chair', name:'Sit to stand', guide:'strength', image:'STRENGTH_EXERCISES-_Sit-to-stand', alt:'Three positions moving from sitting to standing', steps:['Use a stable chair and place both feet flat on the floor.', 'Lean forward slightly and rise slowly.', 'Lower back into the chair with control. Start with up to 5 repetitions.']},
    {id:'wall', name:'Wall push-up', guide:'strength', image:'STRENGTH_EXERCISES-_wall_press-up', alt:'Person performing a push-up against a wall', steps:['Place palms on the wall around shoulder height.', 'Bend your elbows and bring your chest toward the wall while keeping your body long.', 'Push back slowly. Shorten the range if that feels more comfortable.']},
    {id:'heel', name:'Supported calf raise', guide:'strength', image:'STRENGTH_EXERCISES-_calf-raises', alt:'Person holding a chair and lifting both heels', steps:['Hold a sturdy support and stand with feet flat.', 'Raise both heels a comfortable distance.', 'Lower slowly. Start with up to 5 repetitions.']},
    {id:'squat', name:'Supported mini-squat', guide:'strength', image:'STRENGTH_EXERCISES-_mini-squats', alt:'Person using a chair for support while bending their knees', steps:['Hold a sturdy chair or counter for balance.', 'Bend your knees slightly while keeping them pointed forward.', 'Rise slowly. Keep the movement small and comfortable.']}
  ];

  function el(tag, value, className) {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = 'secondary') {
    const node = el('button', text, className);
    node.type = 'button';
    node.onclick = action;
    return node;
  }
  function link(text, value) {
    const node = el('a', text);
    node.href = value;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }
  const actions = (...nodes) => {
    const row = el('div', undefined, 'dashboard-feature-actions');
    row.append(...nodes);
    return row;
  };
  function panel(title) {
    const node = el('section', undefined, 'card');
    node.append(el('h2', title));
    return node;
  }
  function field(form, name, label, type, value = '', attrs = {}) {
    const control = el('input');
    Object.assign(control, {name,type,value}, attrs);
    const wrapper = el('label', label);
    wrapper.append(control);
    form.append(wrapper);
    return control;
  }
  function choice(form, name, label, values, selected) {
    const control = el('select');
    control.name = name;
    values.forEach(value => control.add(new Option(value,value)));
    control.value = selected || values[0];
    const wrapper = el('label', label);
    wrapper.append(control);
    form.append(wrapper);
    return control;
  }
  function submit(form, name, handler, cancel) {
    const saveButton = el('button', name, 'primary');
    saveButton.type = 'submit';
    const row = actions(saveButton);
    if (cancel) row.append(button('Cancel', cancel));
    form.append(row);
    const owner = state;
    form.onsubmit = event => {
      event.preventDefault();
      if (owner === state && form.reportValidity()) handler();
    };
  }
  function drop(label, callback) {
    return button('Delete', () => { if (confirm('Delete ' + label + '?')) callback(); });
  }
  function updateList(key, next, repaint) {
    state[key] = next;
    save();
    repaint();
  }
  const day = () => localDate(new Date());
  const list = key => Array.isArray(state[key]) ? state[key] : [];
  const amount = value => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
  const usd = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
  function replaceItem(rows, record, existing) {
    return existing ? rows.map(item => item.id === existing.id ? record : item) : [...rows,record];
  }

  function gifts(root) {
    let editing;
    const key = 'giftPlanner';
    function draw() {
      const editor = panel(editing ? 'Edit gift' : 'Add a gift');
      const form = el('form');
      const title = field(form,'title','Gift idea','text',editing?.title,{required:true,maxLength:120});
      const recipient = field(form,'recipient','Recipient','text',editing?.recipient,{maxLength:100});
      const occasion = field(form,'occasion','Occasion','text',editing?.occasion,{maxLength:100});
      const due = field(form,'due','Occasion date','date',editing?.due);
      const budget = field(form,'budget','Budget ($)','number',editing?.budget,{min:0,step:'0.01'});
      const url = field(form,'url','Product link','url',editing?.url,{maxLength:600});
      const notes = field(form,'notes','Notes','text',editing?.notes,{maxLength:240});
      const status = choice(form,'status','Status',['Idea','Purchased','Wrapped','Given'],editing?.status);
      url.oninput = () => url.setCustomValidity('');
      submit(form,editing?'Save gift':'Add gift',()=>{
        if(!title.value.trim()){title.focus();return;}
        let product = '';
        if(url.value){
          const parsed = new URL(url.value);
          if(!['https:','http:'].includes(parsed.protocol)){
            url.setCustomValidity('Enter an HTTP or HTTPS link.');
            url.reportValidity();
            return;
          }
          product = parsed.href;
        }
        const record = {id:editing?.id||crypto.randomUUID(),title:title.value.trim(),recipient:recipient.value.trim(),
          occasion:occasion.value.trim(),due:due.value,budget:budget.value,url:product,notes:notes.value.trim(),status:status.value};
        const next = replaceItem(list(key),record,editing);
        editing = undefined;
        updateList(key,next,draw);
      },editing?()=>{editing=undefined;draw();}:undefined);
      editor.append(form);

      const saved = panel('Gift list');
      const catalog = el('div',undefined,'dashboard-feature-grid');
      const records = [...list(key)].sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
      if(!records.length) saved.append(el('p','No gifts saved yet.'));
      for(const record of records){
        const card = el('article',undefined,'card');
        card.append(el('h3',record.title),el('p',[record.recipient,record.occasion,record.due].filter(Boolean).join(' · '),'feature-meta'),
          el('p',record.status+(record.budget!==''?' · '+usd(Number(record.budget))+' budget':''),'feature-meta'));
        if(record.notes) card.append(el('p',record.notes));
        if(/^https?:\/\//i.test(record.url)) card.append(link('Open product',record.url));
        card.append(actions(button('Edit',()=>{editing=record;draw();root.querySelector('input[name=title]').focus();}),
          drop(record.title,()=>{if(editing?.id===record.id)editing=undefined;updateList(key,list(key).filter(item=>item.id!==record.id),draw);})));
        catalog.append(card);
      }
      saved.append(catalog);
      root.replaceChildren(editor,saved);
    }
    draw();
  }

  function calories(root) {
    const key = 'calorieLog';
    let date = day();
    let editing;
    function draw(){
      const editor = panel('Daily food log');
      const picker = el('form');
      const selected = field(picker,'day','View date','date',date,{required:true});
      picker.onsubmit = event => event.preventDefault();
      selected.onchange = ()=>{if(selected.value){date=selected.value;editing=undefined;draw();}};
      editor.append(picker);
      const form = el('form');
      const food = field(form,'food','Food or drink','text',editing?.food,{required:true,maxLength:120});
      const meal = choice(form,'meal','Meal',['Breakfast','Lunch','Dinner','Snack','Other'],editing?.meal);
      const kcal = field(form,'kcal','Calories per serving','number',editing?.kcal,{required:true,min:0,step:'0.01'});
      const servings = field(form,'servings','Servings','number',editing?.servings??1,{required:true,min:0.01,step:'0.01'});
      submit(form,editing?'Save entry':'Log food',()=>{
        if(!food.value.trim()||!Number.isFinite(kcal.valueAsNumber*servings.valueAsNumber)){food.focus();return;}
        const record = {id:editing?.id||crypto.randomUUID(),date,food:food.value.trim(),meal:meal.value,kcal:kcal.valueAsNumber,servings:servings.valueAsNumber};
        const next = replaceItem(list(key),record,editing);
        editing=undefined;
        updateList(key,next,draw);
      },editing?()=>{editing=undefined;draw();}:undefined);
      editor.append(form);
      const records = list(key).filter(item=>item.date===date);
      const total = records.reduce((sum,item)=>sum+item.kcal*item.servings,0);
      const summary = panel(amount(total)+' calories logged');
      const meals = el('div',undefined,'dashboard-feature-grid');
      if(!records.length) summary.append(el('p','No food logged on this date.'));
      for(const item of records){
        const card = el('article',undefined,'card');
        card.append(el('h3',item.food),el('p',item.meal+' · '+amount(item.servings)+' serving(s) · '+amount(item.kcal*item.servings)+' cal'),
          actions(button('Edit',()=>{editing=item;draw();root.querySelector('input[name=food]').focus();}),
            drop(item.food,()=>{if(editing?.id===item.id)editing=undefined;updateList(key,list(key).filter(record=>record.id!==item.id),draw);})));
        meals.append(card);
      }
      summary.append(meals);
      root.replaceChildren(editor,summary);
    }
    draw();
  }

  function exercise(root) {
    let tab = 'routine';
    function draw() {
      const data = state.exercisePlanner || {};
      const profile = panel('Weight check-in');
      const form = el('form');
      const current = field(form,'current','Current weight (lb)','number',data.current,{min:1,max:1500,step:'0.1'});
      const target = field(form,'target','Goal weight (lb)','number',data.target,{min:1,max:1500,step:'0.1'});
      const date = field(form,'date','Check-in date','date',day(),{required:true});
      submit(form,'Save check-in',()=>{
        const next = {...data,current:current.value,target:target.value};
        if(current.value){
          const checkIn = {date:date.value,weight:current.valueAsNumber};
          next.history = [...(data.history||[]).filter(item=>item.date!==checkIn.date),checkIn].sort((a,b)=>b.date.localeCompare(a.date));
          next.current = String(next.history[0].weight);
        }
        state.exercisePlanner=next;save();draw();
      });
      profile.append(form);
      if(data.current&&data.target){
        const delta = Number(data.target)-Number(data.current);
        const direction = delta===0?'Maintain your current weight':delta<0?'Work toward a lower weight':'Work toward a higher weight';
        const nextStep = delta===0?'Keep a movement routine you can repeat comfortably and review your trend over time.':
          delta<0?'Build a movement routine you can repeat comfortably. Review your trend over time and discuss nutrition changes with a clinician or dietitian.':
          'Choose manageable strength workouts and discuss ways to support adequate nutrition with a clinician or dietitian.';
        profile.append(el('h3',direction),el('p',nextStep));
      }else profile.append(el('p','Enter a current and goal weight to see a suggested next step.'));
      if(data.history?.length){
        const history = el('details');
        history.append(el('summary','Weight history'));
        const rows = el('ul');
        for(const item of data.history) rows.append(el('li',item.date+' · '+amount(item.weight)+' lb'));
        history.append(rows);
        profile.append(history);
      }
      const routine = panel(tab==='routine'?'My workout routine':'Workout library');
      const navigation = actions();
      for(const [id,label] of [['routine','My routine'],['library','Workout library']]){
        const control = button(label,()=>{tab=id;draw();root.querySelector('[data-workout-tab='+id+']').focus();});
        control.dataset.workoutTab=id;
        control.setAttribute('aria-pressed',String(tab===id));
        navigation.append(control);
      }
      routine.append(navigation);
      const selected = data.workouts || [];
      const display = tab==='routine'?selected.map(id=>workouts.find(item=>item.id===id)).filter(Boolean):workouts;
      if(!display.length) routine.append(el('p','Choose exercises in the Workout library to build your routine.'));
      const cards = el('div',undefined,'dashboard-feature-grid');
      for(const workout of display){
        const card = el('article',undefined,'card');
        card.append(el('h3',workout.name));
        const picture = el('img');picture.alt=workout.alt;picture.loading='lazy';
        picture.src='https://assets.nhs.uk/nhsuk-cms/images/'+workout.image+'.width-320.jpg';
        picture.referrerPolicy='no-referrer';
        card.append(picture);
        const steps = el('ol');
        workout.steps.forEach(step=>steps.append(el('li',step)));
        card.append(steps,link('NHS instructions and photos',guides[workout.guide]));
        const active = selected.includes(workout.id);
        card.append(actions(button(active?'Remove from routine':'Add to routine',()=>{
          state.exercisePlanner = {...data,workouts:active?selected.filter(id=>id!==workout.id):[...selected,workout.id]};
          save();draw();
        })));
        cards.append(card);
      }
      routine.append(cards);
      const general = panel('Build up at your pace');
      general.append(el('p','Start with activity that feels manageable and build up gradually. For a general adult benchmark, the CDC recommends 150 minutes of moderate activity per week and strength work on two days.'),
        el('p','Use a steady chair or counter when a move calls for support. If an exercise causes pain or makes you feel unwell, stop. Ask your care team about suitable options if you have a health condition or an injury.'),
        link('CDC physical activity guide',guides.activity));
      root.replaceChildren(profile,routine,general);
    }
    draw();
  }

  const pages = {'Gift Planner':gifts,'Calorie Log':calories,Exercise:exercise};
  const previous = render;
  render = function () {
    const target = page;
    if(!Object.hasOwn(pages,target)) return previous();
    page='Quick notes';
    try { previous(); } finally { page=target; }
    document.body.dataset.glowPage=target;
    for(const id of ['title','appPageTitle','mobileCurrentPage']){
      const heading=document.getElementById(id);
      if(heading)heading.textContent=target;
    }
    window.DashboardSidebar.organize();
    const root=el('section',undefined,'dashboard-feature');
    document.getElementById('content').replaceChildren(root);
    pages[target](root);
  };
})();
