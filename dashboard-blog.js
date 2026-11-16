(function () {
  'use strict';

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, action, className = 'secondary') {
    const node = element('button', text, className);
    node.type = 'button';
    node.onclick = action;
    return node;
  }

  function field(label, control) {
    const node = element('label', label);
    node.append(control);
    return node;
  }

  function posts() {
    return Array.isArray(state.blogPosts) ? state.blogPosts : [];
  }

  function photo(block) {
    const img = element('img');
    if (typeof block.src === 'string' && /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(block.src)) {
      img.src = block.src;
    }
    img.alt = block.caption || 'Blog photo';
    img.loading = 'lazy';
    return img;
  }

  function commit(next, { deleting = false } = {}) {
    const bundle = window.DashboardSyncBridge.snapshot();
    bundle.state.blogPosts = next;
    if (!deleting) window.DashboardSyncCore.encode(bundle);
    const previous = state.blogPosts;
    state.blogPosts = next;
    const serialized = JSON.stringify(state);
    try {
      save();
      if (dashboardStorage.getItem('myday-v1') !== serialized) {
        throw Error('The post could not be saved on this device. Your draft is still open.');
      }
    } catch (error) {
      if (previous === undefined) delete state.blogPosts;
      else state.blogPosts = previous;
      throw error;
    }
  }

  function edit(existing) {
    const owner = state;
    const dialog = element('dialog', undefined, 'priss-options-dialog dashboard-blog-editor');
    const heading = existing ? 'Edit post' : 'New post';
    dialog.setAttribute('aria-label', heading);
    dialog.onclose = () => dialog.remove();
    const form = element('form');
    const title = element('input');
    title.required = true;
    title.maxLength = 120;
    title.value = existing?.title || '';
    const blocks = existing ? existing.blocks.map(block => ({...block})) : [{type:'text', text:''}];
    const list = element('div', undefined, 'dashboard-blog-blocks');
    const status = element('p', '', 'dashboard-blog-status');
    status.setAttribute('role', 'status');
    const picker = element('input');
    picker.type = 'file';
    picker.accept = 'image/jpeg,image/png,image/webp';
    picker.multiple = true;
    picker.hidden = true;
    const submit = element('button', 'Save post', 'primary');
    submit.type = 'submit';
    let busy = false;
    let dirty = false;
    form.addEventListener('input', () => { dirty = true; });

    function draw(focusIndex) {
      list.replaceChildren();
      blocks.forEach((block, index) => {
        const panel = element('section', undefined, 'dashboard-blog-block');
        const control = element(block.type === 'photo' ? 'input' : 'textarea');
        if (block.type === 'photo') {
          panel.append(photo(block));
          control.value = block.caption || '';
          control.maxLength = 200;
          control.oninput = () => { block.caption = control.value; };
          panel.append(field('Photo caption (optional)', control));
        } else {
          control.rows = 4;
          control.maxLength = 10000;
          control.value = block.text;
          control.oninput = () => { block.text = control.value; };
          panel.append(field('Text', control));
        }
        const actions = element('div', undefined, 'dashboard-blog-actions');
        function move(offset) {
          const destination = index + offset;
          [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]];
          dirty = true;
          draw(destination);
        }
        const up = button('Move up', () => move(-1));
        const down = button('Move down', () => move(1));
        up.disabled = index === 0;
        down.disabled = index === blocks.length - 1;
        actions.append(up, down, button('Remove block', () => {
          blocks.splice(index, 1);
          dirty = true;
          draw(Math.min(index, blocks.length - 1));
        }));
        panel.append(actions);
        list.append(panel);
        if (focusIndex === index) control.focus();
      });
    }

    const addPhoto = button('Add photos', () => picker.click());
    picker.onchange = async () => {
      const files = [...picker.files];
      picker.value = '';
      if (!files.length || busy) return;
      busy = addPhoto.disabled = submit.disabled = true;
      status.textContent = 'Preparing photos…';
      const failures = [];
      try {
        for (const file of files) {
          try {
            const src = await window.DashboardPhotos.prepare(file);
            if (!dialog.open || state !== owner) return;
            blocks.push({type:'photo', src, caption:''});
            dirty = true;
          } catch (error) {
            failures.push(file.name + ' · ' + error.message);
          }
        }
        draw();
        status.textContent = failures.join(' ');
      } finally {
        busy = addPhoto.disabled = submit.disabled = false;
      }
    };

    const close = () => {
      if (busy || (dirty && !confirm('Discard unsaved changes to this post?'))) return;
      dialog.close();
    };
    dialog.oncancel = event => {
      event.preventDefault();
      close();
    };
    const toolbar = element('div', undefined, 'dashboard-blog-actions');
    toolbar.append(button('Add text', () => {
      blocks.push({type:'text', text:''});
      dirty = true;
      draw(blocks.length - 1);
    }), addPhoto);
    const actions = element('div', undefined, 'dashboard-blog-actions');
    actions.append(submit, button('Cancel', close));
    form.append(element('h2', heading), field('Title', title), list, toolbar, picker, status, actions);
    form.onsubmit = event => {
      event.preventDefault();
      if (busy || state !== owner) return;
      const clean = blocks.filter(block => block.type === 'photo' || block.text.trim());
      if (!title.value.trim() || !clean.length) {
        status.textContent = 'Add a title and some text or a photo before saving.';
        return;
      }
      const record = {
        id: existing?.id || crypto.randomUUID(),
        date: existing?.date || new Date().toISOString(),
        title: title.value.trim(),
        width: existing?.width,
        blocks: clean
      };
      const current = posts();
      if (existing && !current.some(post => post.id === record.id)) {
        status.textContent = 'This post was removed while you were editing.';
        return;
      }
      try {
        commit(existing ? current.map(post => post.id === record.id ? record : post) : [record, ...current]);
      } catch (error) {
        status.textContent = error.message;
        return;
      }
      dialog.close();
      render();
    };
    dialog.append(form);
    document.body.append(dialog);
    draw();
    dialog.showModal();
  }

  let arranging = false;
  function paint() {
    const blog = element('section', undefined, 'dashboard-blog');
    const toolbar = element('div', undefined, 'dashboard-blog-actions');
    toolbar.append(button('New post', () => edit(), 'primary'));
    const status = element('p', '', 'dashboard-blog-status');
    status.setAttribute('role', 'status');
    blog.append(toolbar, status);
    const ordered = posts().filter(post => post && Array.isArray(post.blocks));
    const grid = element('div', undefined, 'dashboard-post-grid');
    const arrange = button(arranging ? 'Done arranging' : 'Arrange posts', () => {
      arranging = !arranging;
      paint();
      document.querySelector('.dashboard-blog-arrange')?.focus();
    }, 'dashboard-control dashboard-blog-arrange');
    arrange.setAttribute('aria-pressed', String(arranging));
    toolbar.append(arrange);
    function change(next) {
      try {
        commit(next);
        paint();
      } catch (error) {
        status.textContent = error.message;
      }
    }
    function move(id, target, after) {
      if (id === target || !ordered.some(post => post.id === id)) return;
      const next = ordered.filter(post => post.id !== id);
      const index = next.findIndex(post => post.id === target);
      if (index < 0) return;
      next.splice(index + Number(after), 0, ordered.find(post => post.id === id));
      change(next);
    }
    if (!ordered.length) blog.append(element('p', 'Your posts will appear here.', 'card'));
    for (const [index, post] of ordered.entries()) {
      const article = element('article', undefined, 'card dashboard-blog-post');
      article.dataset.postWidth = [2,3,4,6].includes(post.width) ? post.width : 6;
      if (arranging) {
        const controls = element('div', undefined, 'dashboard-layout-actions');
        const width = element('select');
        width.setAttribute('aria-label', 'Width of ' + post.title);
        for (const [label,value] of [['One third',2],['Half',3],['Two thirds',4],['Full width',6]]) {
          width.add(new Option(label,value));
        }
        width.value = article.dataset.postWidth;
        width.onchange = () => change(ordered.map(item => item.id === post.id ? {...item,width:Number(width.value)} : item));
        const grip = button('⠿ Drag', () => {});
        grip.draggable = true;
        grip.setAttribute('aria-label', 'Drag ' + post.title);
        grip.ondragstart = event => {
          event.dataTransfer.setData('application/x-dashboard-post', post.id);
          event.dataTransfer.effectAllowed = 'move';
        };
        article.ondragover = event => {
          if (event.dataTransfer.types.includes('application/x-dashboard-post')) event.preventDefault();
        };
        article.ondrop = event => {
          event.preventDefault();
          const bounds = article.getBoundingClientRect();
          const after = event.clientY > bounds.top + bounds.height * .7 ||
            (event.clientY > bounds.top + bounds.height * .3 && event.clientX > bounds.left + bounds.width / 2);
          move(event.dataTransfer.getData('application/x-dashboard-post'), post.id, after);
        };
        const earlier = button('Earlier', () => move(post.id, ordered[index-1]?.id, false));
        const later = button('Later', () => move(post.id, ordered[index+1]?.id, true));
        earlier.disabled = index === 0;
        later.disabled = index === ordered.length-1;
        controls.append(grip, width, earlier, later);
        article.append(controls);
      }
      const date = new Date(post.date);
      const time = element('time', date.toLocaleDateString(undefined, {dateStyle:'long'}));
      time.dateTime = post.date;
      article.append(time, element('h2', post.title));
      for (const block of post.blocks) {
        if (block.type === 'text') article.append(element('p', block.text, 'dashboard-blog-text'));
        if (block.type === 'photo') {
          const figure = element('figure');
          figure.append(photo(block));
          if (block.caption) figure.append(element('figcaption', block.caption));
          article.append(figure);
        }
      }
      const actions = element('div', undefined, 'dashboard-blog-actions');
      actions.append(button('Edit', () => edit(post)), button('Delete', () => {
        if (!confirm('Delete “' + post.title + '”?')) return;
        try {
          commit(posts().filter(item => item.id !== post.id), {deleting:true});
        } catch (error) {
          status.textContent = error.message;
          return;
        }
        render();
      }));
      article.append(actions);
      grid.append(article);
    }
    blog.append(grid);
    document.getElementById('content').replaceChildren(blog);
  }

  addEventListener('dashboard:account-changing', () => {
    arranging = false;
    document.querySelector('.dashboard-blog-editor[open]')?.close();
  });
  const previous = render;
  render = function () {
    const target = page;
    if (target !== 'Blog' && target !== 'Brain Dump') {
      previous();
      return;
    }
    page = 'Quick notes';
    try { previous(); } finally { page = target; }
    document.body.dataset.glowPage = page;
    for (const id of ['title', 'appPageTitle', 'mobileCurrentPage']) {
      const heading = document.getElementById(id);
      if (heading) heading.textContent = target;
    }
    window.DashboardSidebar.organize();
    if (target === 'Blog') paint();
    else window.DashboardNotebook.paint(document.getElementById('content'), true);
  };
})();
