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
    return data;
  }
  const mealSlots=['Breakfast','Morning snack','Lunch','Afternoon snack','Dinner'];
  function itemsFor(data,date,meal){
    const saved=data.mealItems?.[date]?.[meal];
    if(Array.isArray(saved))return saved;
    const name=data.meals?.[date]?.[meal]||'';
    const calories=data.mealCalories?.[date]?.[meal];
    return name||Number.isFinite(calories)?[{name,calories:Number.isFinite(calories)?calories:null}]:[];
  }
  function saveItems(data,date,meal,entries){
    ((data.mealItems??={})[date]??={})[meal]=entries
      .filter(item=>item.name||Number.isFinite(item.calories))
      .map(item=>({...item}));
  }
  window.DashboardMealPlanner={
    calorieEntries(date){
      const data=state.dashboardPlanning||{};
      return mealSlots.flatMap(meal=>itemsFor(data,date,meal)
        .filter(item=>Number.isFinite(item.calories)&&item.calories>=0)
        .map(item=>({meal,name:item.name||meal,calories:item.calories})));
    }
  };
  let foodLibrary;
  function loadFoodLibrary(){
    return foodLibrary??=fetch('https://raw.githubusercontent.com/tempolife-app/tempo-food-db/c9c558a82dd7acd20ade373c2a63762503e4d19e/data/tempolife-foods.json')
      .then(response=>{if(!response.ok)throw Error('Food library unavailable');return response.json()})
      .then(rows=>{
        const foods=rows.map(food=>({name:food.name,kcal_per_100g:food.kcal_per_100g??food.calories}))
          .filter(food=>typeof food.name==='string'&&Number.isFinite(food.kcal_per_100g)&&food.kcal_per_100g>=0);
        if(!foods.length)throw Error('No foods returned');
        return foods;
      })
      .catch(error=>{foodLibrary=undefined;throw error});
  }
  function foodCalculator(onUse){
    const owner=state;
    const dialog=el('dialog',undefined,'priss-options-dialog recipe-editor');
    dialog.setAttribute('aria-label','Food calorie calculator');
    const [searchLabel,search]=field('Search foods','search');
    search.placeholder='Try banana, eggs, or cooked rice';
    const [portionLabel,portion]=field('Portion weight','number','100');
    portion.min='.01';portion.max='100000';portion.step='any';
    const unit=el('select');unit.setAttribute('aria-label','Portion weight unit');
    unit.add(new Option('Grams','g'));unit.add(new Option('Ounces','oz'));
    const result=el('select');result.size=6;result.setAttribute('aria-label','Matching foods');
    const status=el('p','Loading food library…');status.setAttribute('role','status');
    let foods=[],matches=[];
    const use=button('Use this food',()=>{
      const food=selected();
      const kcal=calculate();
      if(owner!==state||!food||kcal===null)return;
      onUse({name:food.name,calories:Math.round(kcal)});
      dialog.close();
    });
    function selected(){return result.value===''?undefined:matches[Number(result.value)]}
    function calculate(){
      const food=selected(),weight=portion.valueAsNumber;
      if(!food||!portion.validity.valid||!Number.isFinite(weight)||weight<=0)return null;
      return food.kcal_per_100g*weight*(unit.value==='oz'?28.349523125:1)/100;
    }
    function update(){
      const food=selected(),kcal=calculate();
      use.disabled=kcal===null;
      if(food)status.textContent=food.kcal_per_100g+' cal per 100 g'+(kcal===null?' · Enter a valid portion weight.':' · ≈ '+Math.round(kcal).toLocaleString()+' cal for this portion');
      else status.textContent=foods.length?(search.value.trim()?'No matching foods. Try a simpler search.':'Search '+foods.length.toLocaleString()+' foods and drinks.'):'Loading food library…';
    }
    function filter(){
      const query=search.value.trim().toLowerCase();
      const words=query.split(/\s+/).filter(Boolean);
      matches=words.length?foods.filter(food=>words.every(word=>food.name.toLowerCase().includes(word)))
        .sort((a,b)=>Number(!a.name.toLowerCase().startsWith(query))-Number(!b.name.toLowerCase().startsWith(query))||a.name.length-b.name.length)
        .slice(0,80):[];
      result.replaceChildren();
      matches.forEach((food,index)=>result.add(new Option(food.name+' · '+food.kcal_per_100g+' cal / 100 g',String(index))));
      result.value=matches.length?'0':'';
      update();
    }
    search.oninput=filter;result.onchange=unit.onchange=portion.oninput=update;
    use.disabled=true;
    const attribution=el('small','Food nutrition data from TempoLife (tempolife.app), CC-BY-4.0. Portions and preparation affect estimates. ');
    attribution.append(link('Dataset', 'https://github.com/tempolife-app/tempo-food-db'),document.createTextNode(' · '),link('License','https://creativecommons.org/licenses/by/4.0/'));
    dialog.append(el('h2','Food calorie calculator'),searchLabel,result,portionLabel,unit,status,use,button('Close',()=>dialog.close()),attribution);
    dialog.classList.add('food-calculator');
    dialog.onclose=()=>dialog.remove();
    document.body.append(dialog);dialog.showModal();search.focus();
    void loadFoodLibrary().then(rows=>{if(dialog.open&&owner===state){foods=rows;filter()}})
      .catch(()=>{if(dialog.open){status.textContent='The food library could not load. Close and retry, or enter calories manually.';search.oninput=null}});
  }
  window.DashboardMealPlanner.openCalculator=foodCalculator;
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
      ['title','Recipe name','text'], ['servings','Servings','text'], ['source','Recipe link','url'],
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
    const list = el('div', undefined, 'planning-records');
    panel.append(label, list);
    function draw() {
      list.replaceChildren();
      const query = search.value.trim().toLowerCase();
      for (const recipe of model().recipes.filter(item => [item.title,item.ingredients].join(' ').toLowerCase().includes(query))) {
        const row = el('details');
        row.append(el('summary', recipe.title));
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
      button('Recipe box', () => go('Recipes'))
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
          if(itemsFor(data,key,meal).length)return;
          const categories=selected[meal];
          const category=categories[day%categories.length];
          saveItems(data,key,meal,[{name:ideas[meal][category][0],calories:null}]);
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
     const data=model(),values=window.DashboardMealPlanner.calorieEntries(key).map(item=>item.calories);
     const target=Object.values(data.mealTargets[key]||{}).reduce((sum,n)=>sum+n,0);
     totals.get(key).textContent=(values.length?'≈ '+values.reduce((sum,n)=>sum+n,0).toLocaleString()+' cal entered':'—')+
       (target?' · '+target.toLocaleString()+' target':'');
    }
    for(const meal of mealSlots){
     const row=el('tr'),heading=el('th',meal);heading.scope='row';row.append(heading);
     for(const d of dates){
      const key=localDate(d),data=model(),cell=el('td'),named=weekday.format(d)+' '+meal;
      const entries=itemsFor(data,key,meal).map(item=>({...item}));
      const list=el('div',undefined,'meal-food-list');
      const target=el('small');
      const portion=data.mealTargets[key]?.[meal];
      target.hidden=!Number.isFinite(portion);
      target.textContent=target.hidden?'':'Target '+portion+' cal';
      function persist(){
       saveItems(data,key,meal,entries);dailyTotal(key);save();
      }
      function addRow(item,focus=false){
       const fields=el('div',undefined,'meal-food-item');
       const input=el('input');
       input.type='text';input.maxLength=150;input.placeholder='Food or drink';input.value=item.name;
       input.setAttribute('aria-label',named+' food');input.setAttribute('list',names.id);
       const kcal=el('input');
       kcal.type='number';kcal.min=0;kcal.max=10000;kcal.step=1;kcal.placeholder='Approx. cal';
       kcal.value=item.calories??'';kcal.setAttribute('aria-label',named+' approximate calories');
       const remove=button('×',()=>{
        entries.splice(entries.indexOf(item),1);fields.remove();persist();add.focus();
       });
       remove.setAttribute('aria-label','Remove food from '+named);
       const recipe=button('Save recipe',()=>{
        const idea=Object.values(ideas[meal]||{}).find(entry=>entry[0]===item.name);
        if(!idea)return;
        if(!data.recipes.some(record=>record.title===idea[0])){
         data.recipes.unshift({id:crypto.randomUUID(),title:idea[0],ingredients:idea[1],instructions:idea[2]});
         names.append(new Option(idea[0]));save();
        }
        updateRecipe();
       });
       function updateRecipe(){
        recipe.hidden=!Object.values(ideas[meal]||{}).some(entry=>entry[0]===item.name);
        recipe.textContent=data.recipes.some(record=>record.title===item.name)?'In Recipe box':'Save recipe';
       }
       input.onchange=()=>{item.name=input.value.trim();updateRecipe();persist()};
       kcal.onchange=()=>{if(kcal.reportValidity()){item.calories=kcal.value===''?null:kcal.valueAsNumber;persist()}};
       const bottom=el('div',undefined,'meal-food-calories');bottom.append(kcal,remove);
       updateRecipe();fields.append(input,bottom,recipe);list.append(fields);
       if(focus)input.focus();
      }
      const add=button('+',()=>{
       const item={name:'',calories:null};entries.push(item);addRow(item,true);
      });
      add.classList.add('meal-food-add');
      add.setAttribute('aria-label','Add food to '+named);
      entries.forEach(item=>addRow(item));
      const lookup=button('Find food',()=>foodCalculator(item=>{
       const existing=entries.find(entry=>!entry.name&&!Number.isFinite(entry.calories));
       if(existing){entries.splice(entries.indexOf(existing),1,item);list.replaceChildren();entries.forEach(entry=>addRow(entry));}
       else{entries.push(item);addRow(item);}
       persist();
      }));
      const tools=el('div',undefined,'meal-food-tools');tools.append(add,lookup);
      cell.append(list,tools,target);row.append(cell);
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
    fold('Writing options',editor.querySelector('.journal-pretty-tools'),editor.querySelector('.journal-custom-paper'));
    fold('Need a prompt?',editor.querySelector('.journal-prompt-box'));
    const search=library.querySelector('label:has(#journalSearch)');
    fold('Search and favorites',search,library.querySelector('.journal-filter-tools'));
  };
  const previous = render;
  render = function () {
    const target = page;
    if(target==='Projects'){
      previous();
      const archived=state.projects.filter(project=>project.archived);
      if(!archived.length)return;
      const archive=content.querySelector('.glow-project-archive');
      archive?.append(button('Delete all archived projects',()=>{
        if(!confirm('Permanently delete all archived projects?'))return;
        state.projects=state.projects.filter(project=>!project.archived);
        save();render();
      }));
      return;
    }
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
    document.querySelectorAll('.recipe-editor[open]').forEach(dialog=>dialog.close());
  });
})();
