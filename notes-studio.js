(function(){
  'use strict';
  const colors={rose:'Rose',lavender:'Lavender',mint:'Mint',butter:'Butter',sky:'Sky'};
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
  const button=(text,action,cls='notes-secondary')=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node};
  function field(label,control){const wrap=el('label',label);wrap.append(control);return wrap}
  function tone(note,index){return Object.hasOwn(colors,note.noteColor)?note.noteColor:Object.keys(colors)[index%5]}
  function paint(root, brainDump=false){
    const workspace=el('div',undefined,'notes-studio '+(brainDump?'brain-dump-page':'lined-notebook'));
    const library=el('section',undefined,'notes-library');
    const header=el('div',undefined,'notes-tools');
    const search=el('input');search.type='search';
    search.placeholder=brainDump?'Search brain dumps':'Search your notes';
    search.setAttribute('aria-label',search.placeholder);
    const filter=el('select');filter.setAttribute('aria-label','View entries');
    filter.add(new Option(brainDump?'Current entries':'Current notes','all'));
    filter.add(new Option('Pinned','pinned'));filter.add(new Option('Archive','archive'));filter.hidden=true;const archiveLink=button('Archive',()=>{filter.value=filter.value==='archive'?'all':'archive';archiveLink.textContent=filter.value==='archive'?'Back to current notes':'Archive';draw()});
    header.append(search,filter);
    const stack=el('div',undefined,'notes-stack');
    const editorHost=el('div');
    const message=el('p',undefined,'notes-feedback');message.setAttribute('role','status');
    library.append(editorHost,header,stack,message,archiveLink);
    workspace.append(library);
    root.replaceChildren(workspace);
    const owner=state;
    const entries=()=>state.notes.filter(note=>(note.noteSection==='brain-dump')===brainDump);
    let editing=null;
    const archived=()=>entries().filter(note=>note.noteArchived);
    const clear=button('Delete all archived',()=>{
      if(state!==owner||!confirm('Permanently delete all archived entries in this section?'))return;
      const ids=new Set(archived().map(note=>note.id));
      state.notes=state.notes.filter(note=>!ids.has(note.id));
      if(editing&&ids.has(editing.id))edit(null,false);
      save();draw();
    });
    header.append(clear);

    function draw(){
      clear.hidden=filter.value!=='archive'||!archived().length;
      const query=search.value.trim().toLowerCase();
      const results=entries().map((note,index)=>({note,index})).filter(({note})=>
        Boolean(note.noteArchived)===(filter.value==='archive')&&(filter.value!=='pinned'||note.notePinned)&&[note.title,note.text].join(' ').toLowerCase().includes(query));
      results.sort((a,b)=>Number(Boolean(b.note.notePinned))-Number(Boolean(a.note.notePinned))||
        String(b.note.noteUpdated||'').localeCompare(String(a.note.noteUpdated||''))||b.index-a.index);
      stack.replaceChildren();
      if(!results.length){
        const empty=el('div',undefined,'notes-empty');
        empty.dataset.paper='butter';
        empty.append(el('p',query?'No matching entries.':filter.value==='archive'?'Nothing archived yet.':filter.value==='pinned'?'Nothing pinned yet.':brainDump?'No entries yet.':'No notes yet.'));
        stack.append(empty);
      }
      for(const {note,index} of results){
        const card=el('article',undefined,'notes-card');card.dataset.paper='lavender';
        const open=button('',()=>{
          const draft=editorHost.querySelector('form');
          const hasChanges=[...draft.querySelectorAll('input,textarea,select')].some(control=>control.value!==control.dataset.initial);
          if((brainDump&&!editing)||!hasChanges||confirm('Discard the unsaved changes in the editor?'))edit(note);
        },'notes-open');
        open.append(el('h4',note.title||'Untitled note'),el('p',note.text||''),el('small',note.noteUpdated?new Date(note.noteUpdated).toLocaleDateString():''));
        const actions=el('div',undefined,'notes-card-actions');
        const pin=button(note.notePinned?'Unpin':'Pin',()=>{
          note.notePinned=!note.notePinned;save();draw();
          [...stack.querySelectorAll('[data-note-pin]')].find(node=>node.dataset.notePin===note.id)?.focus();
        });
        pin.dataset.notePin=note.id;pin.setAttribute('aria-label',(note.notePinned?'Unpin ':'Pin ')+(note.title||'note'));
        if(!note.noteArchived)actions.append(pin);
        actions.append(button(note.noteArchived?'Restore':'Archive',()=>{
          note.noteArchived=!note.noteArchived;
          save();
          if(editing===note)edit(null,false);
          draw();
          message.textContent=note.noteArchived?'Moved to Archive.':'Restored.';
        }));
        actions.append(button('Delete',()=>{
          if(state!==owner||!confirm('Permanently delete this archived entry?'))return;
          state.notes=state.notes.filter(item=>item.id!==note.id);
          if(editing===note)edit(null,false);
          save();draw();
        }));
        card.append(open,actions);stack.append(card);
      }
    }
    function edit(note,focus=true){
      editing=note;
      const form=el('form',undefined,'notes-editor');
      const title=el('input');title.maxLength=200;title.value=note?.title||'';
      const text=el('textarea');text.rows=brainDump?8:4;text.value=note?.text||'';
      text.placeholder=brainDump?'Write whatever is on your mind…':'Write your note…';
      const draft=brainDump&&!note?state.brainDumpDraft:null;
      if(draft){title.value=draft.title||'';text.value=draft.text||'';}
      const color=el('select');
      color.setAttribute('aria-label','Paper color');
      for(const [value,name] of Object.entries(colors))color.add(new Option(name,value));
      color.value=note?tone(note,state.notes.indexOf(note)):Object.keys(colors)[entries().length%5];
      if(draft&&Object.hasOwn(colors,draft.color))color.value=draft.color;
      form.dataset.paper=color.value;
      const draftStatus=el('p',draft?'Draft restored':'Draft saves as you type');
      draftStatus.setAttribute('role','status');
      function persistDraft(){
        if(state!==owner||!brainDump||note)return;
        state.brainDumpDraft={title:title.value,text:text.value,color:color.value};
        save();
        draftStatus.textContent='Draft saved';
      }
      color.onchange=()=>{form.dataset.paper=color.value;persistDraft();};
      const actions=el('div',undefined,'notes-tools');
      const submit=el('button','Save note','notes-primary');submit.type='submit';
      const close=()=>edit(null,false);
      actions.append(submit);
      if(brainDump&&!note)actions.append(button('Delete draft',()=>{
        if(state!==owner||!confirm('Delete this draft?'))return;
        delete state.brainDumpDraft;save();edit(null,false);
      }));
      if(note)actions.append(button('Cancel',close));
      if(note)actions.append(button('Delete note',()=>{
        if(!confirm('Delete '+(note.title||'this note')+'?'))return;
        state.notes=state.notes.filter(item=>item.id!==note.id);save();close();draw();message.textContent='Note deleted.';
      }));
      if(brainDump){
        text.setAttribute('aria-label','Brain dump');
        form.append(text,actions);
      }else{
        form.append(el('h3','Notes'),field('Title (optional)',title),field('Note',text),actions);
      }
      if(brainDump&&!note)form.append(draftStatus);
      form.onsubmit=event=>{
        event.preventDefault();if(state!==owner)return;
        if((brainDump||!title.value.trim())&&!text.value.trim()){text.setCustomValidity('Write something before saving.');text.reportValidity();return}
        const values={title:(!brainDump&&title.value.trim())||text.value.trim().split('\n')[0].slice(0,60),text:text.value,noteColor:color.value,noteUpdated:new Date().toISOString()};
        if(note)Object.assign(note,values);else state.notes.push({id:crypto.randomUUID(),...values,...(brainDump?{noteSection:'brain-dump'}:{})});
        if(brainDump&&!note)delete state.brainDumpDraft;
        search.value='';filter.value=note?.noteArchived?'archive':'all';save();close();draw();message.textContent=brainDump?'Entry saved.':'Note saved.';
      };
      title.oninput=text.oninput=()=>{text.setCustomValidity('');persistDraft();};
      for(const control of [title,text,color])control.dataset.initial=control.value;
      editorHost.replaceChildren(form);if(focus)(brainDump?text:title).focus();
    }
    search.oninput=draw;filter.onchange=draw;edit(null,false);draw();
  }
  window.DashboardNotebook={paint};
})();
