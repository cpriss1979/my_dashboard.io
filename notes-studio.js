(function(){
  'use strict';
  const colors={rose:'Rose',lavender:'Lavender',mint:'Mint',butter:'Butter',sky:'Sky'};
  const templates=[
    ['Quick thought','rose',''],
    ['Brain dump','lavender','What’s on my mind?\n\nWhat can I do next?\n'],
    ['To-do note','mint','☐ \n☐ \n☐ ']
  ];
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
  const button=(text,action,cls='notes-secondary')=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node};
  function field(label,control){const wrap=el('label',label);wrap.append(control);return wrap}
  function tone(note,index){return Object.hasOwn(colors,note.noteColor)?note.noteColor:Object.keys(colors)[index%5]}
  function paint(root){
    const workspace=el('div',undefined,'notes-studio');
    const hero=el('section',undefined,'notes-hero');
    const copy=el('div');
    copy.append(el('h2','Notebook'),el('p','Save ideas, lists, and things you want to remember.'));
    hero.append(copy,button('＋ New note',()=>edit(null),'notes-primary'));
    const main=el('div',undefined,'notes-workspace');
    const library=el('section',undefined,'notes-library');
    const rail=el('div',undefined,'notes-rail');
    const header=el('div',undefined,'notes-tools');
    const search=el('input');search.type='search';search.placeholder='Search your notes';search.setAttribute('aria-label','Search notes');
    const filter=el('select');filter.setAttribute('aria-label','Filter notes');
    filter.add(new Option('All notes','all'));filter.add(new Option('Pinned','pinned'));
    header.append(search,filter);
    const stack=el('div',undefined,'notes-stack');
    const editorHost=el('div');
    const message=el('p',undefined,'notes-feedback');message.setAttribute('role','status');
    library.append(el('h3','Your notes'),header,editorHost,stack,message);
    const starters=el('section',undefined,'notes-starters');
    starters.append(el('h3','Start with a template'));
    for(const [title,color,text] of templates){
      const starter=button(title,()=>edit(null,{title,color,text}),'notes-template');
      starter.dataset.paper=color;
      starters.append(starter);
    }
    const scratch=el('textarea');scratch.rows=5;scratch.placeholder='Type a thought to keep it here…';
    scratch.value=state.scratch||'';
    scratch.oninput=()=>{if(state===owner){state.scratch=scratch.value;save()}}
    const scratchpad=el('section',undefined,'notes-scratch');
    scratchpad.append(field('Quick capture',scratch),el('p','Also appears on Home.'));
    rail.append(starters,scratchpad);
    main.append(library,rail);workspace.append(hero,main);
    root.replaceChildren(workspace);
    const owner=state;

    function draw(){
      const query=search.value.trim().toLowerCase();
      const entries=state.notes.map((note,index)=>({note,index})).filter(({note})=>
        (filter.value!=='pinned'||note.notePinned)&&[note.title,note.text].join(' ').toLowerCase().includes(query));
      entries.sort((a,b)=>Number(Boolean(b.note.notePinned))-Number(Boolean(a.note.notePinned))||
        String(b.note.noteUpdated||'').localeCompare(String(a.note.noteUpdated||''))||b.index-a.index);
      stack.replaceChildren();
      if(!entries.length){
        const empty=el('div',undefined,'notes-empty');
        empty.dataset.paper='butter';
        empty.append(el('strong',query?'No matching notes':filter.value==='pinned'?'No pinned notes yet':'A fresh page'),
          el('p',query?'Try a different search.':filter.value==='pinned'?'Pin a note to find it here.':'Create a note or pick one of the templates.'));
        stack.append(empty);
      }
      for(const {note,index} of entries){
        const card=el('article',undefined,'notes-card');card.dataset.paper=tone(note,index);
        const open=button('',()=>edit(note),'notes-open');
        open.append(el('h4',note.title||'Untitled note'),el('p',note.text||''));
        const actions=el('div',undefined,'notes-card-actions');
        const pin=button(note.notePinned?'Unpin':'Pin',()=>{
          note.notePinned=!note.notePinned;save();draw();
          [...stack.querySelectorAll('[data-note-pin]')].find(node=>node.dataset.notePin===note.id)?.focus();
        });
        pin.dataset.notePin=note.id;pin.setAttribute('aria-label',(note.notePinned?'Unpin ':'Pin ')+(note.title||'note'));
        actions.append(pin);card.append(open,actions);stack.append(card);
      }
    }
    function edit(note,template){
      if(editorHost.children.length&&!confirm('Replace the note you are editing? Unsaved changes will be discarded.'))return;
      const form=el('form',undefined,'notes-editor');
      const title=el('input');title.required=true;title.maxLength=200;title.value=note?.title||template?.title||'';
      const text=el('textarea');text.rows=8;text.value=note?.text||template?.text||'';
      const color=el('select');
      color.setAttribute('aria-label','Paper color');
      for(const [value,name] of Object.entries(colors))color.add(new Option(name,value));
      color.value=note?tone(note,state.notes.indexOf(note)):template?.color||Object.keys(colors)[state.notes.length%5];
      form.dataset.paper=color.value;color.onchange=()=>form.dataset.paper=color.value;
      const actions=el('div',undefined,'notes-tools');
      const submit=el('button','Save note','notes-primary');submit.type='submit';
      const close=()=>{editorHost.replaceChildren();workspace.querySelector('.notes-hero button').focus()};
      actions.append(submit,button('Cancel',close));
      if(note)actions.append(button('Delete note',()=>{
        if(!confirm('Delete '+(note.title||'this note')+'?'))return;
        state.notes=state.notes.filter(item=>item.id!==note.id);save();close();draw();message.textContent='Note deleted.';
      }));
      form.append(el('h3',note?'Edit note':'New note'),field('Title',title),field('Paper color',color),field('Note',text),actions);
      form.onsubmit=event=>{
        event.preventDefault();if(state!==owner)return;
        if(!title.value.trim()){title.setCustomValidity('Enter a note title.');title.reportValidity();return}
        const values={title:title.value.trim(),text:text.value,noteColor:color.value,noteUpdated:new Date().toISOString()};
        if(note)Object.assign(note,values);else state.notes.push({id:crypto.randomUUID(),...values});
        search.value='';filter.value='all';save();close();draw();message.textContent='Note saved.';
      };
      title.oninput=()=>title.setCustomValidity('');
      editorHost.replaceChildren(form);title.focus();
    }
    search.oninput=draw;filter.onchange=draw;draw();
  }
  window.DashboardNotebook={paint};
})();
