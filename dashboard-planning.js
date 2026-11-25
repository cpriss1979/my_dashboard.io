(function () {
  'use strict';
  const routes = ['Meal Planner', 'Recipes', 'Packing Checklist'];
  const meals = ['Breakfast', 'Lunch', 'Dinner'];
  const ideas = {
    Breakfast: {
      Oats:['Berry yogurt oats','Oats, plain yogurt, berries, and nuts','Cook the oats. Top with yogurt, berries, and nuts.'],
      Eggs:['Egg and spinach toast','Eggs, spinach, whole-grain toast, and fruit','Cook the eggs and spinach. Serve with toast and fruit.'],
      Yogurt:['Yogurt and apple bowl','Plain yogurt, apple, oats, and pumpkin seeds','Chop the apple and layer with yogurt, oats, and seeds.'],
      Savory:['Black bean breakfast wrap','Black beans, salsa, spinach, whole-grain tortilla, and fruit','Warm the beans, fold into a tortilla with spinach and salsa, and serve with fruit.']
    },
    Lunch: {
      Salads:['Chickpea crunch salad','Chickpeas, cucumber, greens, whole-grain pita, and lemon','Toss vegetables and chickpeas with lemon and serve with pita.'],
      Wraps:['Turkey and hummus wrap','Turkey, hummus, lettuce, whole-grain tortilla, and fruit','Spread hummus on the tortilla, add turkey and lettuce, and roll. Serve with fruit.'],
      Soups:['White bean vegetable soup','White beans, carrots, greens, broth, and whole-grain bread','Simmer vegetables and beans in broth until tender. Serve with bread.'],
      Bowls:['Chicken and quinoa bowl','Cooked chicken, quinoa, peppers, spinach, and yogurt dressing','Combine cooked chicken and quinoa with vegetables and dressing.']
    },
    Dinner: {
      Chicken:['Lemon chicken and broccoli','Chicken, broccoli, brown rice, and lemon','Cook chicken through and serve with steamed broccoli, cooked brown rice, and lemon.'],
      Fish:['Salmon, potatoes, and green beans','Salmon, baby potatoes, green beans, and lemon','Cook the salmon and roast the potatoes. Serve with steamed green beans and lemon.'],
      Vegetarian:['Lentil and spinach bowl','Cooked lentils, brown rice, carrots, spinach, and lemon','Warm lentils and cooked rice. Serve with sautéed carrots and spinach and dress with lemon.'],
      Pasta:['Tomato and white bean pasta','Whole-grain pasta, white beans, tomatoes, and spinach','Toss cooked pasta with warmed beans, tomatoes, and spinach.']
    }
  };
  const weekday = new Intl.DateTimeFormat(undefined, {weekday:'short', month:'short', day:'numeric'});
  const presets = {
    short:['ID and wallet','Keys','Phone and charger','Medications','Toothbrush and toiletries','Underwear and socks','Outfits','Pajamas','Shoes'],
    long:['ID and wallet','Travel documents','Reservations','Phone and charger','Medications','Toiletries','Underwear and socks','Outfits','Pajamas','Walking shoes','Weather layers','Laundry bag','Snacks and water','First-aid kit','Adapters and chargers']
  };
  let weekOffset = 0;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function button(text, action) {
    const node = el('button', text, 'secondary');
    node.type = 'button';
    node.onclick = action;
    return node;
  }
  function field(name, type = 'text', value = '') {
    const label = el('label', name);
    const input = el(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.value = value;
    label.append(input);
    return [label, input];
  }
  function model() {
    const data = state.dashboardPlanning ??= {};
    data.recipes ??= [];
    data.meals ??= {};
    data.trips ??= [];
    data.mealTargets ??= {};
    data.mealCalories ??= {};
    data.mealCategories ??= {};
    data.mealItems ??= {};
    return data;
  }
  function section(title) {
    const panel = el('section', undefined, 'card planning-page');
    const bar = el('div', undefined, 'planning-toolbar');
    bar.append(el('h2', title));
    panel.append(bar);
    return [panel, bar];
  }
  function link(title, url) {
    const node = el('a', title);
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }
  function recipeEditor(recipe) {
    const owner = state;
    const dialog = el('dialog', undefined, 'priss-options-dialog recipe-editor');
    const form = el('form');
    const inputs = {};
    for (const [key, label, type] of [
      ['title','Recipe name','text'], ['servings','Servings','text'], ['source','Recipe link','url'],['image','Recipe image URL','url'],
      ['ingredients','Ingredients','textarea'], ['instructions','Directions','textarea']
    ]) {
      const [wrapper, input] = field(label, type, recipe?.[key]);
      input.required = key === 'title';
      input.maxLength = type === 'textarea' ? 16000 : 500;
      form.append(wrapper);
      inputs[key] = input;
    }
    const submit = el('button', 'Save recipe', 'primary');
    form.append(submit, button('Cancel', () => dialog.close()));
    form.onsubmit = event => {
      event.preventDefault();
      if (owner !== state || !inputs.title.value.trim()) return;
      const record = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value.trim()]));
      if (record.source && !/^https?:\/\//i.test(record.source)) {
        inputs.source.setCustomValidity('Enter an https or http link.');
        inputs.source.reportValidity();
        return;
      }
      if (recipe) Object.assign(recipe, record);
      else model().recipes.push({...record, id:crypto.randomUUID()});
      save();
      dialog.close();
      render();
    };
    inputs.source.oninput = () => inputs.source.setCustomValidity('');
    dialog.append(el('h2', recipe ? 'Edit recipe' : 'Add recipe'), form);
    dialog.onclose = () => dialog.remove();
    document.body.append(dialog);
    dialog.showModal();
  }
  function recipesPage() {
    const [panel, bar] = section('Recipe box');
    bar.append(button('Save recipe link',()=>{
      const value=prompt('Paste the recipe page URL');
      if(!value)return;
      let url;
      try{url=new URL(value);}catch{alert('Enter a valid recipe URL.');return;}
      if(!['http:','https:'].includes(url.protocol)){alert('Use an HTTP or HTTPS recipe link.');return;}
      if(model().recipes.some(recipe=>recipe.source===url.href)){alert('This link is already in the Recipe box.');return;}
      const part=url.pathname.split('/').filter(Boolean).at(-1)||url.hostname;
      let title=part;
      try{title=decodeURIComponent(part);}catch{}
      title=title.replace(/[-_]+/g,' ').trim().slice(0,150)||url.hostname;
      model().recipes.unshift({id:crypto.randomUUID(),title,source:url.href});
      save();render();
    }));
    bar.append(button('Add recipe', () => recipeEditor()), link('Browse free recipes ↗', 'https://www.budgetbytes.com/index/'), button('Meal Planner', () => go('Meal Planner')));
    const [label, search] = field('Find a recipe','search');
    const list = el('div', undefined, 'planning-records recipe-tile-grid');
    panel.append(label, list);
    function draw() {
      list.replaceChildren();
      const query = search.value.trim().toLowerCase();
      for (const recipe of model().recipes.filter(item => [item.title,item.ingredients].join(' ').toLowerCase().includes(query))) {
        const row = el('details');
        const summary=el('summary');if(/^https?:\/\//i.test(recipe.image||'')){const img=el('img');img.src=recipe.image;img.alt=recipe.title;img.loading='lazy';summary.append(img)}else summary.append(el('span','🍽️','recipe-placeholder'));summary.append(el('span',recipe.title));row.append(summary);
        if (recipe.servings) row.append(el('p', 'Serves ' + recipe.servings));
        for (const [key, title] of [['ingredients','Ingredients'],['instructions','Directions']]) {
          if (recipe[key]) row.append(el('h3', title), el('p', recipe[key], 'recipe-copy'));
        }
        const actions = el('div', undefined, 'planning-toolbar');
        if (/^https?:\/\//i.test(recipe.source || '')) actions.append(link('Open recipe source ↗', recipe.source));
        actions.append(button('Edit', () => recipeEditor(recipe)), button('Delete', () => {
          if (!confirm('Permanently delete ' + recipe.title + '?')) return;
          model().recipes = model().recipes.filter(item => item.id !== recipe.id);
          save();
          draw();
        }));
        row.append(actions);
        list.append(row);
      }
      if (!list.children.length) list.append(el('p', query ? 'No matching recipes.' : 'Add a recipe to start your recipe box.'));
    }
    search.oninput = draw;
    draw();
    return panel;
  }
  function plannerPage() {
    const [panel, bar] = section('Meal Planner');
    const start = new Date();
    start.setHours(12,0,0,0);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7 + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    bar.append(
      button('Previous week', () => { weekOffset--; render(); }),
      button('This week', () => { weekOffset = 0; render(); }),
      button('Next week', () => { weekOffset++; render(); }),
      button('Recipe box', () => go('Recipes')),button('Calorie log',()=>go('Calorie Log'))
    );
    panel.append(el('p', weekday.format(start) + ' – ' + weekday.format(end)));
    const setup=el('details');
    setup.append(el('summary','Plan meals by food preference'));
    const form=el('form');
    const prefs=model().mealPreferences||{};
    const [targetLabel,target]=field('Daily calorie target (optional)','number',prefs.target||'');
    target.min=1;target.max=10000;target.step=1;
    form.append(targetLabel,el('p','Use your own daily target. Meal numbers are portion targets. Use recipe nutrition or food labels to check actual servings.'));
    const pick={};
    for(const meal of meals){
      const group=el('fieldset');
      group.append(el('legend',meal));
      pick[meal]=Object.keys(ideas[meal]).map(category=>{
        const label=el('label',category),box=el('input');
        box.type='checkbox';box.value=category;box.checked=(prefs[meal]||Object.keys(ideas[meal])).includes(category);
        label.prepend(box);group.append(label);return box;
      });
      form.append(group);
    }
    form.append(el('button','Fill empty meals','primary'));
    const status=el('p');status.setAttribute('role','status');form.append(status);
    form.onsubmit=event=>{
      event.preventDefault();
      const data=model(),selected=Object.fromEntries(meals.map(meal=>[meal,pick[meal].filter(box=>box.checked).map(box=>box.value)]));
      if(meals.some(meal=>!selected[meal].length)){status.textContent='Choose at least one type of food for each meal.';return;}
      const daily=Number(target.value),breakfast=Math.round(daily*.25),lunch=Math.round(daily*.35);
      const portions=[breakfast,lunch,daily-breakfast-lunch];
      data.mealPreferences={...selected,target:target.value};
      let filled=0;
      for(let day=0;day<7;day++){
        const date=new Date(start);date.setDate(start.getDate()+day);
        const key=localDate(date);
        meals.forEach((meal,index)=>{
          if(data.meals[key]?.[meal]||data.mealItems?.[key]?.[meal]?.length)return;
          const categories=selected[meal];
          const category=categories[day%categories.length];
          (data.meals[key]??={})[meal]=ideas[meal][category][0];
          (data.mealCategories[key]??={})[meal]=category;
          if(daily)(data.mealTargets[key]??={})[meal]=portions[index];
          filled++;
        });
      }
      save();render();
      const refreshed=document.querySelector('.planning-page details');
      if(refreshed){refreshed.open=true;refreshed.querySelector('[role=status]').textContent=filled?filled+' meals added.':'This week already has a full plan.';}
    };
    setup.append(form);panel.append(setup);
    const grid=el('div',undefined,'meal-board');
    grid.setAttribute('role','region');grid.setAttribute('aria-label','Weekly meal plan');grid.tabIndex=0;
    const table=el('table');
    const dates=Array.from({length:7},(_,offset)=>{const d=new Date(start);d.setDate(d.getDate()+offset);return d});
    const weekdayHead=el('tr');weekdayHead.append(el('th','Meal'));
    for(const d of dates){const head=el('th',weekday.format(d));head.scope='col';weekdayHead.append(head)}
    const header=el('thead');header.append(weekdayHead);table.append(header);
    const body=el('tbody');
    const names=el('datalist');names.id='meal-recipe-names';
    for(const recipe of model().recipes)names.append(new Option(recipe.title));
    table.append(body);grid.append(names,table);
    const totals=new Map();
    function dailyTotal(key){
     const data=model(),values=Object.values(data.mealCalories[key]||{});
     const target=Object.values(data.mealTargets[key]||{}).reduce((sum,n)=>sum+n,0);
     totals.get(key).textContent=(values.length?'≈ '+values.reduce((sum,n)=>sum+n,0).toLocaleString()+' cal entered':'—')+
       (target?' · '+target.toLocaleString()+' target':'');
    }
    for(const meal of ['Breakfast','Morning snack','Lunch','Afternoon snack','Dinner']){
     const row=el('tr'),heading=el('th',meal);heading.scope='row';row.append(heading);
     for(const d of dates){
      const key=localDate(d),data=model(),cell=el('td'),named=weekday.format(d)+' '+meal;
      const items=(data.mealItems??={});const day=(items[key]??={});
      const entries=day[meal]??=(data.meals[key]?.[meal]||data.mealCalories[key]?.[meal]!=null?[{name:data.meals[key]?.[meal]||'',cal:data.mealCalories[key]?.[meal]??''}]:[]);
      const list=el('div',undefined,'meal-item-list');
      function persist(){const namedEntries=entries.filter(x=>x.name.trim());if(namedEntries.length)(data.meals[key]??={})[meal]=namedEntries.map(x=>x.name).join(', ');else if(data.meals[key])delete data.meals[key][meal];const counted=entries.filter(x=>x.cal!==''&&Number.isFinite(Number(x.cal)));if(counted.length)(data.mealCalories[key]??={})[meal]=counted.reduce((sum,x)=>sum+Number(x.cal),0);else if(data.mealCalories[key])delete data.mealCalories[key][meal];dailyTotal(key);save();}
      function drawItems(){list.replaceChildren();entries.forEach((item,i)=>{const wrap=el('div',undefined,'meal-item');const input=el('input');input.placeholder='Food or drink';input.value=item.name;input.setAttribute('list',names.id);input.setAttribute('aria-label',named+' item '+(i+1));input.onchange=()=>{item.name=input.value;persist()};const kcal=el('input');kcal.type='number';kcal.min=0;kcal.max=10000;kcal.placeholder='Approx. cal';kcal.value=item.cal;kcal.setAttribute('aria-label',named+' calories');kcal.onchange=()=>{if(kcal.reportValidity()){item.cal=kcal.value===''?'':kcal.valueAsNumber;persist()}};wrap.append(input,kcal,button('×',()=>{entries.splice(i,1);persist();drawItems()}));list.append(wrap)});}
      drawItems();cell.append(list,button('+ Food / drink',()=>{entries.push({name:'',cal:''});drawItems();list.lastElementChild?.querySelector('input')?.focus()}));row.append(cell);
     }
     body.append(row);
    }
    const totalRow=el('tr'),totalLabel=el('th','Daily calories');totalLabel.scope='row';totalRow.append(totalLabel);
    for(const d of dates){const key=localDate(d),total=el('td');totals.set(key,total);dailyTotal(key);totalRow.append(total)}
    const foot=el('tfoot');foot.append(totalRow);table.append(foot);
    panel.append(grid);
    return panel;
  }
  function packingPage() {
    const [panel] = section('Packing Checklist');
    const form = el('form', undefined, 'planning-toolbar');
    const [nameLabel, name] = field('Trip name');
    name.required = true;
    name.maxLength = 100;
    const type = el('select');
    type.setAttribute('aria-label','Trip template');
    for (const [key,label] of [['short','Short trip'],['long','Long trip'],['empty','Start blank']]) type.add(new Option(label,key));
    const create = el('button','Create checklist','primary');
    form.append(nameLabel,type,create);
    const list = el('div', undefined, 'planning-records');
    const archive=el('details');
    const archivedRows=el('div',undefined,'planning-records');
    archive.append(el('summary','Archived checklists'),button('Delete all archived checklists',()=>{
      if(!model().trips.some(trip=>trip.archived)||!confirm('Delete every archived checklist?'))return;
      model().trips=model().trips.filter(trip=>!trip.archived);
      save();render();
    }),archivedRows);
    panel.append(form,list,archive);
    form.onsubmit = event => {
      event.preventDefault();
      if (!name.value.trim()) return;
      const trip = {id:crypto.randomUUID(),title:name.value.trim(),items:(presets[type.value] || []).map(title=>({title,checked:false}))};
      model().trips.unshift(trip);
      save(); name.value = ''; list.prepend(tripRow(trip,true));
    };
    function tripRow(trip, open) {
      const row = el('details');
      row.open = open;
      const summary = el('summary');
      const checklist = el('div');
      const addForm = el('form',undefined,'planning-toolbar');
      const [inputLabel,input] = field('Add a packing item');
      input.required = true;
      input.maxLength = 120;
      addForm.append(inputLabel,el('button','Add item','primary'));
      addForm.onsubmit = event => {
        event.preventDefault();
        if (!input.value.trim()) return;
        trip.items.push({title:input.value.trim(),checked:false});
        save(); input.value = ''; drawItems();
      };
      function drawItems() {
        summary.textContent = trip.title + ' · ' + trip.items.filter(item=>item.checked).length + '/' + trip.items.length + ' packed';
        checklist.replaceChildren();
        trip.items.forEach((item,index)=>{
          const line = el('div',undefined,'packing-line');
          const label = el('label',item.title);
          const check = el('input');
          check.type = 'checkbox';
          check.checked = item.checked;
          check.onchange = () => {
            item.checked = check.checked;
            save();
            summary.textContent = trip.title + ' · ' + trip.items.filter(record=>record.checked).length + '/' + trip.items.length + ' packed';
          };
          label.prepend(check);
          const remove = button('Remove',()=>{trip.items.splice(index,1);save();drawItems();});
          remove.setAttribute('aria-label','Remove '+item.title);
          check.disabled=Boolean(trip.archived);
          line.append(label);if(!trip.archived)line.append(remove);
          checklist.append(line);
        });
      }
      row.append(summary,checklist);
      if(!trip.archived)row.append(addForm);
      row.append(button(trip.archived?'Restore checklist':'Archive checklist',()=>{
        trip.archived=!trip.archived;save();render();
        if(trip.archived)document.querySelector('.packing-archive-marker')?.closest('details')?.setAttribute('open','');
      }),button('Delete checklist',()=>{
        if (!confirm('Permanently delete the checklist for '+trip.title+'?')) return;
        model().trips = model().trips.filter(item=>item.id!==trip.id);
        save(); row.remove();
      }));
      drawItems();
      return row;
    }
    archivedRows.classList.add('packing-archive-marker');
    for (const trip of model().trips) (trip.archived?archivedRows:list).append(tripRow(trip,false));
    return panel;
  }
  const previousJournal = renderJournalPage;
  renderJournalPage = function () {
    previousJournal();
    const notebook = content.querySelector('.journal-layout');
    if (!notebook) return;
    notebook.classList.add('journal-notebook');
    const editor = notebook.querySelector('.journal-editor');
    const library = notebook.querySelector('.journal-library');
    function fold(title, ...nodes) {
      const first = nodes.find(Boolean);
      if (!first) return;
      const group = el('details');
      group.append(el('summary',title));
      first.before(group);
      group.append(...nodes.filter(Boolean));
    }
    const tools=editor.querySelector('.journal-pretty-tools'), colors=editor.querySelector('.journal-custom-paper'), prompt=editor.querySelector('.journal-prompt-box');
    if(tools){const group=el('details');group.append(el('summary','Writing options'));tools.before(group);if(prompt){const d=el('details');d.append(el('summary','Need a prompt?'),prompt);group.append(d)}const picker=tools.querySelector('label');if(picker){const d=el('details');d.append(el('summary','Page colors'),picker);group.append(d)}const ink=colors?.querySelectorAll('label')[1];if(ink){const d=el('details');d.append(el('summary','Text colors'),ink);group.append(d)}const fav=tools.querySelector('#journalFavoriteEntry');if(fav){const d=el('details');d.append(el('summary','Favorites'),fav);group.append(d)}tools.hidden=true;if(colors)colors.hidden=true;}
    const search=library.querySelector('label:has(#journalSearch)');
    fold('Search and favorites',search,library.querySelector('.journal-filter-tools'));
  };
  const previous = render;
  render = function () {
    const target = page;
    if (!routes.includes(target)) return previous();
    page = 'Quick notes';
    try { previous(); } finally { page = target; }
    document.body.dataset.glowPage = target;
    for (const id of ['title','appPageTitle','mobileCurrentPage']) {
      const heading = document.getElementById(id);
      if (heading) heading.textContent = target;
    }
    content.replaceChildren(target === 'Recipes' ? recipesPage() : target === 'Meal Planner' ? plannerPage() : packingPage());
    window.DashboardSidebar?.organize();
  };
  addEventListener('dashboard:account-changing', () => {
    weekOffset = 0;
    document.querySelector('.recipe-editor[open]')?.close();
  });
})();
