(function () {
  'use strict';
  const routes = ['Meal Planner', 'Recipes', 'Packing Checklist'];
  const meals = ['Breakfast', 'Lunch', 'Dinner'];
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
    const grid = el('div', undefined, 'meal-week');
    const recipeNames = el('datalist');
    recipeNames.id = 'meal-recipe-names';
    for (const recipe of model().recipes) recipeNames.append(new Option(recipe.title));
    grid.append(recipeNames);
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(start);
      day.setDate(start.getDate() + offset);
      const key = localDate(day);
      const column = el('section', undefined, 'meal-day');
      column.append(el('h3', weekday.format(day)));
      for (const meal of meals) {
        const [label, input] = field(meal,'text',model().meals[key]?.[meal] || '');
        input.maxLength = 150;
        input.setAttribute('list', recipeNames.id);
        input.onchange = () => {
          const plan = model().meals;
          const value = input.value.trim();
          if (value) (plan[key] ??= {})[meal] = value;
          else if (plan[key]) {
            delete plan[key][meal];
            if (!Object.keys(plan[key]).length) delete plan[key];
          }
          save();
        };
        column.append(label);
      }
      grid.append(column);
    }
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
    panel.append(form,list);
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
          line.append(label,remove);
          checklist.append(line);
        });
      }
      row.append(summary,checklist,addForm,button('Delete checklist',()=>{
        if (!confirm('Permanently delete the checklist for '+trip.title+'?')) return;
        model().trips = model().trips.filter(item=>item.id!==trip.id);
        save(); row.remove();
      }));
      drawItems();
      return row;
    }
    for (const trip of model().trips) list.append(tripRow(trip,false));
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
    fold('Browse by date',library.querySelector('.journal-memory-box'));
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
