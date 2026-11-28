/* Master redesign: uses the existing per-login dashboard state and save pipeline. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s),
    all = (s) => [...document.querySelectorAll(s)];
  const node = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const button = (text, fn, primary = false) => {
    const b = node("button", text, primary ? "primary" : "secondary");
    b.type = "button";
    b.onclick = fn;
    return b;
  };
  const line = (...children) => {
    const d = node("div", undefined, "mr-line");
    d.append(...children.filter(Boolean));
    return d;
  };
  const id = () => crypto.randomUUID(),
    now = () => new Date().toISOString(),
    day = () => localDate(new Date());
  const data = (k) => (state[k] ??= []),
    planning = () =>
      (state.dashboardPlanning ??= {
        recipes: [],
        meals: {},
        trips: [],
        mealItems: {},
        mealCalories: {},
      });
  const titleOf = (x) => x.title || x.name || "Untitled",
    dateText = (d) =>
      d
        ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString()
        : "",
    preview = (t) => String(t || "").slice(0, 130);
  let query = "",
    view = "",
    opened = null,
    week = 0,
    journalDate = day(),
    journalView = "Calendar",
    selectedCollection = null,
    selectedTrip = null,
    lastPage = "",
    lastOwner = null;
  const aliases = {
    "Grocery List": "Shopping List",
    "Little Joys": "Time for You",
    Notes: "Quick notes",
    Tasks: "Daily priorities",
    "Packing Checklists": "Packing Checklist",
    Scripture: "Bible",
  };
  const names = {
    Overview: "Home",
    "Quick notes": "Notes",
    "Daily priorities": "Tasks",
    "Shopping List": "Grocery List",
    "Time for You": "Little Joys",
    "Packing Checklist": "Packing Checklists",
  };
  const undoByOwner = new WeakMap();
  function comparable(value) {
    const copy =
      typeof value === "string" ? JSON.parse(value) : structuredClone(value);
    delete copy.redesignFolds;
    return JSON.stringify(copy);
  }
  function change(label, fn) {
    const owner = state,
      before = JSON.stringify(owner);
    try {
      fn();
      save();
      undoByOwner.set(owner, { label, before, after: JSON.stringify(owner) });
      render();
    } catch (err) {
      Object.keys(owner).forEach((k) => delete owner[k]);
      Object.assign(owner, JSON.parse(before));
      alert(err.message);
    }
  }
  function undo() {
    const entry = undoByOwner.get(state);
    if (!entry) return;
    if (comparable(state) !== comparable(entry.after)) {
      alert(
        "A later change was saved. Use the record’s edit controls to correct it.",
      );
      return;
    }
    const folds = state.redesignFolds;
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, JSON.parse(entry.before));
    if (folds) state.redesignFolds = folds;
    undoByOwner.delete(state);
    save();
    render();
  }
  function removeItem(list, x, label = "item") {
    if (confirm("Delete this " + label + "?"))
      change("Delete " + label, () => list.splice(list.indexOf(x), 1));
  }
  function menu(actions, label = "Options") {
    const d = node("details", undefined, "mr-menu");
    const s = node("summary", "⋯");
    s.setAttribute("aria-label", label);
    d.append(s);
    const box = node("div", undefined, "mr-menu-items");
    actions.forEach(([text, fn]) =>
      box.append(
        button(text, () => {
          d.open = false;
          fn();
        }),
      ),
    );
    d.append(box);
    return d;
  }
  function disclosure(label, key, children = [], open = false) {
    const d = node("details", undefined, "mr-disclosure");
    d.dataset.mrFold = key;
    d.open = state.redesignFolds?.[key] ?? open;
    d.append(node("summary", label), ...children);
    d.addEventListener("toggle", () => {
      if (d.isConnected) {
        (state.redesignFolds ??= {})[key] = d.open;
        save();
      }
    });
    return d;
  }
  function panel(title, desc, action) {
    const p = node("section", undefined, "card mr-panel");
    const head = line(node("h2", title), action);
    head.classList.add("mr-heading");
    p.append(head);
    if (desc) p.append(node("p", desc, "mr-description"));
    return p;
  }
  function empty(text = "Nothing here yet.") {
    return node("p", text, "mr-empty");
  }
  function search(placeholder, refresh) {
    const q = node("input");
    q.type = "search";
    q.placeholder = placeholder;
    q.setAttribute("aria-label", placeholder);
    q.value = query;
    q.oninput = () => {
      query = q.value;
      refresh();
    };
    return q;
  }
  function tabs(options, chosen, fn) {
    const nav = node("div", undefined, "mr-segment");
    nav.setAttribute("role", "group");
    options.forEach((value) => {
      const [k, label] = Array.isArray(value) ? value : [value, value];
      const b = button(label, () => fn(k));
      b.setAttribute("aria-pressed", String(chosen === k));
      nav.append(b);
    });
    return nav;
  }
  function field(label, type, value, options) {
    const l = node("label", label),
      i = node(
        type === "textarea"
          ? "textarea"
          : type === "select"
            ? "select"
            : "input",
      );
    if (type === "select") {
      for (const opt of options || []) {
        const [v, t] = Array.isArray(opt) ? opt : [opt, opt];
        i.add(new Option(t, v));
      }
    } else if (type !== "textarea") i.type = type;
    i.value = value ?? "";
    if (type === "checkbox") i.checked = Boolean(value);
    l.append(i);
    return [l, i];
  }
  function editForm(title, defs, submit, saveLabel = "Save") {
    const owner = state,
      d = node("dialog", undefined, "mr-dialog"),
      f = node("form"),
      fields = {},
      grid = node("div", undefined, "mr-fields");
    d.setAttribute("aria-label", title);
    for (const [
      key,
      label,
      type = "text",
      value = "",
      opts,
      required = false,
    ] of defs) {
      const [l, i] = field(label, type, value, opts);
      i.name = key;
      i.required = required;
      if (type === "textarea") {
        i.rows = 5;
        l.classList.add("mr-wide");
      }
      if (type === "number") {
        i.step = "any";
      }
      fields[key] = i;
      grid.append(l);
    }
    const status = node("p", "", "mr-error");
    status.setAttribute("role", "alert");
    const saveButton = node("button", saveLabel, "primary");
    saveButton.type = "submit";
    f.append(
      grid,
      status,
      line(
        button("Cancel", () => d.close()),
        saveButton,
      ),
    );
    f.onsubmit = (ev) => {
      ev.preventDefault();
      if (owner !== state) {
        status.textContent =
          "Your signed-in dashboard changed. Reopen this form.";
        return;
      }
      const values = Object.fromEntries(
        Object.entries(fields).map(([k, i]) => [
          k,
          i.type === "checkbox"
            ? i.checked
            : i.type === "number"
              ? i.value === ""
                ? ""
                : Number(i.value)
              : i.value.trim(),
        ]),
      );
      try {
        submit(values);
        d.close();
      } catch (e) {
        status.textContent = e.message;
      }
    };
    d.append(node("h2", title), f);
    d.addEventListener("close", () => d.remove(), { once: true });
    document.body.append(d);
    d.showModal();
    return { dialog: d, fields, form: f };
  }
  function editRecord(list, x, title, defs, normalize = (v) => v) {
    return editForm(title, defs, (v) =>
      change(title, () => {
        const values = normalize(v);
        if (x) Object.assign(x, values, { updatedAt: now() });
        else list.push({ id: id(), ...values, createdAt: now() });
      }),
    );
  }
  function isArchived(x) {
    return Boolean(x.archived || x.noteArchived);
  }
  function isPinned(x) {
    return Boolean(x.pinned || x.notePinned);
  }
  function genericActions(list, x, edit, extra = []) {
    return menu(
      [
        ["Open", () => readRecord(x)],
        ["Edit", edit],
        ...extra,
        [
          isPinned(x) ? "Unpin" : "Pin",
          () =>
            change("Pin", () => {
              x.pinned = !isPinned(x);
              if (list === state.notes) x.notePinned = x.pinned;
            }),
        ],
        [
          isArchived(x) ? "Restore" : "Archive",
          () =>
            change("Archive", () => {
              x.archived = !isArchived(x);
              if (list === state.notes) x.noteArchived = x.archived;
            }),
        ],
        ["Delete", () => removeItem(list, x)],
      ],
      titleOf(x) + " options",
    );
  }
  function readRecord(x) {
    const d = node("dialog", undefined, "mr-dialog");
    d.append(
      node("h2", titleOf(x)),
      node("p", x.text || x.description || x.notes || ""),
      button("Close", () => d.close()),
    );
    d.onclose = () => d.remove();
    document.body.append(d);
    d.showModal();
  }
  function compact(x, detail, actions, check) {
    const r = node("article", undefined, "mr-row");
    if (check) r.append(check);
    const copy = node("div", undefined, "mr-copy");
    copy.append(node("strong", titleOf(x)));
    if (detail) copy.append(node("small", detail));
    r.append(copy);
    if (actions) r.append(actions);
    return r;
  }
  function archive(list, renderRow, label = "Archived") {
    const rows = list.filter(isArchived);
    return disclosure(label + " · " + rows.length, "archive:" + page, [
      ...rows.map(renderRow),
    ]);
  }
  function matched(x) {
    return (titleOf(x) + " " + (x.text || x.description || x.notes || ""))
      .toLowerCase()
      .includes(query.toLowerCase());
  }
  const arranging = new WeakMap();
  function arrange(grid, key, entries) {
    grid.classList.add("mr-canvas");
    const owner = state, layouts = state.redesignLayouts?.[key] || {};
    let editing = arranging.get(owner) === key;
    grid.classList.toggle("mr-arranging", editing);
    const toggle = button("Arrange " + (key === "home" ? "Home" : "posts"), () => {
      editing = !editing; arranging.set(owner, editing ? key : null); grid.classList.toggle("mr-arranging", editing);
      toggle.textContent = editing ? "Done arranging" : "Arrange " + (key === "home" ? "Home" : "posts");
    });
    if (editing) toggle.textContent = "Done arranging";
    grid.before(toggle);
    toggle.dataset.arrangeControl = key;
    const width = Math.max(1, grid.clientWidth || 900);
    const columns = Math.max(1, Math.floor(width / 290));
    function extent() {
      grid.style.height = Math.max(260, ...entries.map(([id, el]) => parseFloat(el.style.top) + parseFloat(el.style.height) + 20)) + "px";
    }
    const occupied = [];
    [...entries].sort((a,b)=>Number(Boolean(layouts[b[0]]))-Number(Boolean(layouts[a[0]]))).forEach(([id, el], i) => {
      const saved = layouts[id] || {};
      const w = Math.min(width, saved.w || Math.floor(width / columns) - 14), h = saved.h || (key === "home" ? 170 : 220);
      const x = Math.max(0, Math.min(saved.x ?? (i % columns) * (width / columns), width - w));
      let y = saved.y ?? Math.floor(i / columns) * 234;
      while (occupied.some(r => x < r.x+r.w+12 && x+w+12 > r.x && y < r.y+r.h+12 && y+h+12 > r.y)) {
        y = Math.max(...occupied.filter(r => x < r.x+r.w+12 && x+w+12 > r.x && y < r.y+r.h+12 && y+h+12 > r.y).map(r=>r.y+r.h+14));
      }
      occupied.push({x,y,w,h});
      Object.assign(el.style, {left:x+"px", top:y+"px", width:w+"px", height:h+"px"});
      const move = button("Move", () => {}), resize = button("Resize", () => {});
      move.className = "mr-move"; resize.className = "mr-resize";
      move.setAttribute("aria-label", "Move " + id); resize.setAttribute("aria-label", "Resize " + id);
      el.append(move, resize);
      function persist() {
        if (owner !== state) return;
        change("Arrange " + key, () => {
          state.redesignLayouts ??= {}; state.redesignLayouts[key] ??= {};
          for (const [entryId, item] of entries) state.redesignLayouts[key][entryId] = {x:parseFloat(item.style.left), y:parseFloat(item.style.top), w:parseFloat(item.style.width), h:parseFloat(item.style.height)};
        });
      }
      for (const [handle, sizing] of [[move,false],[resize,true]]) {
        handle.onclick = e => {e.preventDefault(); e.stopPropagation();};
        handle.onpointerdown = e => {
          if (!editing || e.button !== 0) return;
          e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
          const start = {x:e.clientX,y:e.clientY,left:parseFloat(el.style.left),top:parseFloat(el.style.top),w:parseFloat(el.style.width),h:parseFloat(el.style.height)};
          handle.onpointermove = ev => {
            if (owner !== state) return;
            const dx=ev.clientX-start.x, dy=ev.clientY-start.y;
            if (sizing) {el.style.width=Math.max(Math.min(180,width),Math.min(width-start.left,start.w+dx))+"px";el.style.height=Math.max(170,start.h+dy)+"px";}
            else {el.style.left=Math.max(0,Math.min(width-start.w,start.left+dx))+"px";el.style.top=Math.max(0,start.top+dy)+"px";}
            extent();
          };
          handle.onpointerup = () => {handle.onpointermove=null; handle.onpointerup=null; persist();};
          handle.onpointercancel = () => {handle.onpointermove=null; render();};
        };
        handle.onkeydown = e => {
          if (!editing || !["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) return;
          e.preventDefault(); e.stopPropagation();
          const dx=e.key==="ArrowLeft"?-20:e.key==="ArrowRight"?20:0, dy=e.key==="ArrowUp"?-20:e.key==="ArrowDown"?20:0;
          if(sizing){el.style.width=Math.max(Math.min(180,width),Math.min(width-parseFloat(el.style.left),parseFloat(el.style.width)+dx))+"px";el.style.height=Math.max(170,parseFloat(el.style.height)+dy)+"px";}
          else {el.style.left=Math.max(0,Math.min(width-parseFloat(el.style.width),parseFloat(el.style.left)+dx))+"px";el.style.top=Math.max(0,parseFloat(el.style.top)+dy)+"px";}
          persist();
        };
      }
    });
    extent();
  }
  function home(root) {
    const cards = [
      ["Shopping List", "Grocery List", "Items to buy for the house", "🧺"],
      ["Wish List", "Wish List", "Things I would like to get", "☆"],
      ["Time for You", "Little Joys", "Small things that brighten my day", "☀"],
      ["Habit Tracker", "Habit Tracker", "Routines I am keeping up with", "✓"],
      ["Games", "Games", "Games and activities", "🎮"],
      ["Badges", "Badges", "Achievements I have earned", "🏅"],
      [
        "Collections",
        "Collections",
        "Items and collections I am tracking",
        "▦",
      ],
      ["Journal", "Journal", "Personal thoughts and daily entries", "✎"],
      ["Projects", "Projects", "Larger tasks and ongoing plans", "▱"],
      ["Bible", "Scripture", "Bible reading and study", "📖"],
      ["Finances", "Finances", "Balances, bills, and money activity", "▣"],
      ["Daily priorities", "Tasks", "Important tasks and priorities", "☑"],
    ];
    for (const route of [...Object.keys(renderers), "Finances", "Bible", "Wish List", "Gift Planner", "Games", "Badges"]) {
      if (route !== "Overview" && !cards.some(c => c[0] === route)) cards.push([route, names[route] || route, "Open " + (names[route] || route), {Calendar:"▦", Chores:"✓", Blog:"✎"}[route] || "◇"]);
    }
    const p = panel("Home", "A little space for everything that matters.");
    const grid = node("div", undefined, "mr-home-grid");
    const chosen = state.redesignHomeSections || cards.map(c => c[0]);
    const picker = disclosure("Choose Home sections", "home-sections", [], false);
    for (const [route,title] of cards) {
      const label = node("label"), check = node("input"); check.type="checkbox"; check.checked=chosen.includes(route);
      check.onchange=()=>change("Choose Home sections",()=>{if(check.checked && state.redesignLayouts?.home) delete state.redesignLayouts.home[route];state.redesignHomeSections=check.checked?[...chosen,route]:chosen.filter(r=>r!==route);});
      label.append(check, document.createTextNode(title)); picker.append(label);
    }

    const entries = [];
    for (const [route, title, desc, icon] of cards.filter(c=>chosen.includes(c[0]))) {
      const a = node("article", undefined, "mr-shortcut");
      a.tabIndex = 0;
      a.setAttribute("role", "link");
      a.onkeydown = e => { if(e.target === a && e.key === "Enter" && !grid.classList.contains("mr-arranging")) go(route); };
      a.onclick = (e) => {
        e.preventDefault();
        if (!grid.classList.contains("mr-arranging")) go(route);
      };
      a.append(
        node("span", icon, "mr-icon"),
        node("h3", title),
        node("p", desc),
        node("span", "Open →", "mr-open"),
      );
      grid.append(a);
      entries.push([route,a]);
    }
    p.append(grid);
    root.append(p);
    arrange(grid, "home", entries);
    const controls = node("section", undefined, "mr-home-controls");
    const arrangeControl = p.querySelector('[data-arrange-control="home"]');
    controls.append(picker, disclosure("Arrange Home", "home-arrange", [arrangeControl]));
    const active = data("projects").filter(
      (x) => !x.archived && x.status !== "Complete",
    );
    const chores = data("chores"),
      trips = planning().trips || [];
    root.append(
      disclosure("At a glance", "home-preview", [
        node(
          "p",
          active.length +
            " active projects · " +
            chores.filter((x) => !x.archived && x.checked !== day()).length +
            " chores due · " +
            chores.filter((x) => x.checked === day()).length +
            " completed",
        ),
        node(
          "p",
          data("habits").filter((x) => !x.archived).length +
            " habits · " +
            trips.filter((x) => !x.archived).length +
            " packing checklists",
        ),
      ]),
    );
    root.append(controls);
  }
  function projects(root) {
    const list = data("projects"),
      categories = [
        "Work",
        "Church",
        "Technology",
        "Home",
        "Personal",
        "Learning",
        "Uncategorized",
      ];
    function editor(x) {
      editRecord(
        list,
        x,
        x ? "Edit project" : "Add project",
        [
          ["title", "Name", "text", x?.title, [], true],
          ["description", "Description", "textarea", x?.description],
          [
            "category",
            "Category",
            "select",
            x?.category || "Uncategorized",
            categories,
          ],
          [
            "status",
            "Status",
            "select",
            x?.status || "Planning",
            ["Planning", "In progress", "Paused", "Complete"],
          ],
          ["progress", "Progress", "number", x?.progress || 0],
          ["date", "Due date", "date", x?.date],
          ["notes", "Notes", "textarea", x?.notes],
        ],
        (v) => ({
          ...v,
          progress:
            v.status === "Complete"
              ? 100
              : Math.max(0, Math.min(100, v.progress)),
        }),
      );
    }
    const p = panel(
      "Projects",
      "Larger tasks and ongoing plans.",
      button("+ Add project", () => editor(), true),
    );
    const row = (x) => {
      const r = compact(
        x,
        (x.category || "Uncategorized") +
          " · " +
          (x.status || "Planning") +
          " · " +
          (x.progress || 0) +
          "%",
        genericActions(list, x, () => editor(x)),
      );
      const bar = node("progress");
      bar.max = 100;
      bar.value = x.status === "Complete" ? 100 : x.progress || 0;
      bar.setAttribute("aria-label", titleOf(x) + " progress");
      r.querySelector(".mr-copy").append(bar);
      return r;
    };
    for (const category of categories) {
      const items = list.filter(
        (x) =>
          !x.archived &&
          (categories.includes(x.category) ? x.category : "Uncategorized") ===
            category,
      );
      p.append(
        disclosure(
          category + " · " + items.length,
          "projects:" + category,
          items.map(row),
          true,
        ),
      );
    }
    p.append(archive(list, row));
    root.append(p);
  }
  function notes(root, brain = false) {
    const list = data("notes"),
      belongs = (x) => (x.noteSection === "brain-dump") === brain;
    const p = panel(
      brain ? "Brain Dump" : "Notes",
      brain
        ? "A place to clear your mind."
        : "Keep a thought, idea, or reminder.",
    );
    const editor = node("form", undefined, brain ? "mr-brain" : "mr-notepad"),
      title = node("input"),
      text = node("textarea"),
      status = node("p", "", "mr-save-status");
    status.setAttribute("role", "status");
    title.placeholder = "Title";
    title.setAttribute("aria-label", "Note title");
    text.placeholder = brain
      ? "Write whatever is on your mind…."
      : "Start writing…";
    text.setAttribute("aria-label", brain ? "Brain dump" : "Note");
    text.rows = 10;
    let editing = null;
    const owner = state;
    const draft = brain ? state.brainDumpDraft : null;
    text.value = draft?.text || "";
    function load(x) {
      editing = x;
      title.value = x?.title || "";
      text.value = x?.text || "";
      text.focus();
    }
    if (!brain) editor.append(title);
    editor.append(text, status);
    if (brain) {
      text.oninput = () => {
        if (owner !== state) return;
        status.textContent = "Saving…";
        state.brainDumpDraft = {
          ...(state.brainDumpDraft || {}),
          text: text.value,
        };
        save();
        status.textContent = "Draft saved";
      };
      editor.append(
        menu([
          [
            "Clear draft",
            () => {
              if (text.value && !confirm("Clear this unsaved draft?")) return;
              text.value = "";
              delete state.brainDumpDraft;
              save();
              status.textContent = "Draft cleared";
            },
          ],
        ]),
      );
    }
    const submit = node(
      "button",
      brain ? "Save brain dump" : "Save note",
      "primary",
    );
    submit.type = "submit";
    editor.append(submit);
    editor.onsubmit = (e) => {
      e.preventDefault();
      if (owner !== state || !text.value.trim()) return;
      change(brain ? "Save brain dump" : "Save note", () => {
        const values = {
          title: brain
            ? editing?.title || text.value.trim().slice(0, 45)
            : title.value.trim() || "Untitled note",
          text: text.value,
          updatedAt: now(),
        };
        if (editing) Object.assign(editing, values);
        else
          list.push({
            id: id(),
            ...values,
            ...(brain ? { noteSection: "brain-dump" } : {}),
          });
        if (brain) delete state.brainDumpDraft;
      });
    };
    p.append(editor);
    const area = node("div");
    function draw() {
      area.replaceChildren();
      const entries = list.filter(belongs).filter(matched);
      function row(x) {
        const extra = brain
          ? [
              [
                "Convert to Note",
                () =>
                  change("Convert to Note", () =>
                    list.push({
                      ...x,
                      id: id(),
                      noteSection: undefined,
                      archived: false,
                    }),
                  ),
              ],
              [
                "Convert to Task",
                () =>
                  change("Convert to Task", () =>
                    data("priorities").push({
                      id: id(),
                      title: preview(x.text),
                      date: day(),
                      done: false,
                    }),
                  ),
              ],
            ]
          : [];
        return compact(
          x,
          preview(x.text) +
            " · " +
            dateText(x.updatedAt || x.noteUpdated || x.date) +
            (isPinned(x) ? " · Pinned" : ""),
          genericActions(list, x, () => load(x), extra),
        );
      }
      area.append(node("h3", brain ? "Saved brain dumps" : "My notes"));
      area.append(
        disclosure(
          (brain ? "Pinned brain dumps" : "Pinned notes") +
            " · " +
            entries.filter((x) => isPinned(x) && !isArchived(x)).length,
          "notes-pinned:" + brain,
          entries.filter((x) => isPinned(x) && !isArchived(x)).map(row),
        ),
      );
      const normal = entries.filter((x) => !isArchived(x) && !isPinned(x));
      const pinned = area.querySelector('[data-mr-fold="notes-pinned:' + brain + '"]');
      const normalFold = disclosure("Other notes · " + normal.length, "notes-normal:" + brain,
        normal.length ? normal.map(row) : [empty("Your saved writing will appear here.")], !pinned.open);
      if (pinned.open) normalFold.open = false;
      pinned.addEventListener("toggle", () => { if (pinned.open) normalFold.open = false; });
      normalFold.addEventListener("toggle", () => { if (normalFold.open) pinned.open = false; });
      area.append(normalFold);
      area.append(
        disclosure(
          brain ? "Archived brain dumps" : "Archived notes",
          "notes-archive:" + brain,
          entries.filter((x) => isArchived(x)).map(row),
        ),
      );
    }
    p.append(search("Search " + (brain ? "brain dumps" : "notes"), draw), area);
    draw();
    root.append(p);
  }
  function grocery(root) {
    const list = data("shoppingList");
    const p = panel(
      "Grocery List",
      "Items to buy for the house",
      button("+ Add item", () => editor(), true),
    );
    function editor(x) {
      editRecord(
        list,
        x,
        x ? "Edit grocery item" : "Add grocery item",
        [
          ["title", "Item name", "text", x?.title, [], true],
          ["quantity", "Quantity", "number", x?.quantity || 1],
          ["store", "Store", "text", x?.store],
          ["notes", "Notes", "textarea", x?.notes],
        ],
        (v) => ({ ...v, quantity: Math.max(1, v.quantity) }),
      );
    }
    const current = view === "In My Cart" ? "In My Cart" : "To Buy";
    p.append(
      tabs(["To Buy", "In My Cart"], current, (v) => {
        view = v;
        render();
      }),
    );
    const entries = list.filter(
      (x) =>
        !x.archived &&
        Boolean(x.flagged || x.flag || x.purchased) ===
          (current === "In My Cart"),
    );
    for (const x of entries) {
      const c = node("input");
      c.type = "checkbox";
      c.checked = current === "In My Cart";
      c.setAttribute(
        "aria-label",
        (c.checked ? "Return to To Buy: " : "Move to In My Cart: ") + x.title,
      );
      c.onchange = () =>
        change("Move grocery item", () => {
          x.flagged = c.checked;
          x.flag = c.checked;
          x.purchased = c.checked;
        });
      p.append(
        compact(
          x,
          (x.quantity || 1) + " · " + (x.store || ""),
          menu([
            ["Edit", () => editor(x)],
            ["Delete", () => removeItem(list, x, "grocery item")],
          ]),
          c,
        ),
      );
    }
    if (!entries.length)
      p.append(
        empty(
          current === "To Buy"
            ? "Add the groceries you need."
            : "Checked items appear here.",
        ),
      );
    root.append(p);
  }
  function journal(root) {
    const list = data("journal");
    const p = panel(
      "Journal",
      dateText(journalDate) +
        " · " +
        list.filter((x) => !x.archived).length +
        " entries",
      button("+ New entry", () => editor(), true),
    );
    function editor(x) {
      const ed = editForm(
        "Journal entry",
        [
          ["date", "Date", "date", x?.date || journalDate, [], true],
          [
            "mood",
            "Feeling",
            "select",
            x?.mood || "",
            [
              "",
              "Happy",
              "Calm",
              "Grateful",
              "Hopeful",
              "Tired",
              "Sad",
              "Anxious",
              "Other",
            ],
          ],
          ["title", "Title", "text", x?.title],
          ["text", "Writing", "textarea", x?.text, [], true],
        ],
        (v) =>
          change("Save journal entry", () => {
            if (x) Object.assign(x, v, { updatedAt: now() });
            else list.push({ id: id(), ...v, updatedAt: now() });
          }),
        "Save entry",
      );
      const writing = ed.fields.text;
      const controls = line();
      for (const [label, opts, prop] of [
        ["Font", ["serif", "sans-serif", "cursive"], "fontFamily"],
        ["Size", ["16px", "18px", "20px", "24px"], "fontSize"],
        ["Spacing", ["1.5", "1.8", "2"], "lineHeight"],
      ]) {
        const [l, i] = field(
          label,
          "select",
          state.journalWriting?.[prop] || opts[0],
          opts,
        );
        i.onchange = () => {
          writing.style[prop] = i.value;
          (state.journalWriting ??= {})[prop] = i.value;
          save();
        };
        writing.style[prop] = i.value;
        controls.append(l);
      }
      const [cl, ci] = field(
        "Writing color",
        "color",
        state.journalWriting?.color || "#32234f",
      );
      ci.onchange = () => {
        writing.style.setProperty("color", ci.value, "important");
        (state.journalWriting ??= {}).color = ci.value;
        save();
      };
      controls.append(cl);
      ed.form.prepend(
        disclosure("Writing options", "journal-options", [controls]),
      );
    }
    p.append(
      tabs(["Calendar", "Entries"], journalView, (v) => {
        journalView = v;
        render();
      }),
    );
    if (journalView === "Calendar") {
      const base = new Date(journalDate + "T12:00:00");
      p.append(
        monthGrid(
          base,
          journalDate,
          (d) => {
            journalDate = d;
            render();
          },
          (d) => (list.some((x) => !x.archived && x.date === d) ? "•" : ""),
        ),
      );
    }
    const entries = list.filter(
      (x) =>
        !x.archived && (journalView === "Entries" || x.date === journalDate),
    );
    for (const x of entries)
      p.append(
        compact(
          { ...x, title: x.title || "Journal entry" },
          dateText(x.date) + " · " + (x.mood || "") + " · " + preview(x.text),
          genericActions(list, x, () => editor(x)),
        ),
      );
    if (!entries.length)
      p.append(
        empty(
          "No entries for this date. Start a Journal entry when you’re ready.",
        ),
      );
    p.append(
      archive(list, (x) =>
        compact(
          x,
          dateText(x.date),
          genericActions(list, x, () => editor(x)),
        ),
      ),
    );
    root.append(p);
  }
  function monthGrid(base, chosen, pick, extra) {
    const wrap = node("div");
    const prev = () => {
        base.setDate(1);
        base.setMonth(base.getMonth() - 1);
        pick(localDate(base));
      },
      next = () => {
        base.setDate(1);
        base.setMonth(base.getMonth() + 1);
        pick(localDate(base));
      };
    wrap.append(
      line(
        button("Previous month", prev),
        node(
          "strong",
          base.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          }),
        ),
        button("Next month", next),
      ),
    );
    const grid = node("div", undefined, "mr-month" + (extra ? " mr-month-events" : ""));
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) =>
      grid.append(node("small", d)),
    );
    const y = base.getFullYear(),
      m = base.getMonth();
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++)
      grid.append(node("span", undefined, "mr-date-blank"));
    for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
      const iso = localDate(new Date(y, m, d)),
        b = button(String(d), () => pick(iso));
      b.classList.add("mr-date");
      if (iso === chosen) b.classList.add("mr-selected");
      if (iso === day()) b.classList.add("mr-today");
      const x = extra?.(iso);
      if (x) b.append(typeof x === "string" ? node("span", x, "mr-dot") : x);
      grid.append(b);
    }
    while ((grid.children.length - 7) % 7) grid.append(node("span", undefined, "mr-date-blank"));
    wrap.append(grid);
    return wrap;
  }
  function calendar(root) {
    const p = panel(
      "Calendar",
      "",
      button("+ Add event", () => eventEditor(), true),
    );
    const mode = ["Day", "Month", "Week", "Year"].includes(view)
      ? view
      : "Month";
    p.append(
      tabs(["Day", "Month", "Week", "Year"], mode, (v) => {
        view = v;
        render();
      }),
    );
    p.append(
      line(
        button("Today", () => {
          selected = day();
          month = new Date();
          render();
        }),
        node("strong", dateText(selected)),
      ),
    );
    const eventsOn = (d) => data("events").filter((x) => repeatsOn(x, d));
    function eventButton(x) {
      const b = button(
        (x.allDay || !x.time ? "All day · " : x.time + " · ") + x.title,
        () => eventEditor(x),
      );
      b.className = "mr-event";
      if (x.color) b.style.setProperty("--event-color", x.color);
      return b;
    }
    function pick(d) {
      selected = d;
      month = new Date(d + "T12:00:00");
      render();
    }
    if (mode === "Month")
      p.append(
        monthGrid(new Date(selected + "T12:00:00"), selected, (d) => { view = "Day"; pick(d); }, (d) => {
          const list = node("span", undefined, "mr-events");
          eventsOn(d).forEach((x) => {
            const b = node("span", x.title, "mr-event-name");
            b.title = x.title;
            if (x.color) b.style.borderLeftColor = x.color;
            list.append(b);
          });
          const more = node("span", "", "mr-event-more"); list.append(more);
          requestAnimationFrame(() => {
            if (!list.isConnected) return;
            const fit = () => {
              const items = [...list.querySelectorAll(".mr-event-name")];
              items.forEach(el => el.hidden = false); more.hidden = true;
              const available = list.parentElement.clientHeight - 40;
              let count = Math.max(0, Math.floor((available - 24) / 25));
              if (items.length * 25 <= available) count = items.length;
              items.forEach((el,i) => el.hidden = i >= count);
              more.textContent = "+" + Math.max(0,items.length-count);
              more.hidden = items.length <= count;
            };
            fit();
            const observer = new ResizeObserver(() => { if (!list.isConnected) observer.disconnect(); else fit(); });
            observer.observe(list.parentElement);
          });
          return list;
        }),
      );
    else if (mode === "Year") {
      const year = new Date(selected + "T12:00:00").getFullYear();
      p.append(
        line(
          button("Previous year", () => pick(year - 1 + selected.slice(4))),
          node("strong", String(year)),
          button("Next year", () => pick(year + 1 + selected.slice(4))),
        ),
      );
      const grid = node("div", undefined, "mr-year");
      for (let m = 0; m < 12; m++)
        grid.append(
          monthGrid(
            new Date(year, m, 1),
            selected,
            (d) => {
              selected = d;
              view = "Day";
              render();
            },
            (d) => (eventsOn(d).length ? "•" : ""),
          ),
        );
      p.append(grid);
    } else {
      const start = new Date(selected + "T12:00:00");
      if (mode === "Week")
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      p.append(
        line(
          button("Previous " + mode.toLowerCase(), () =>
            pick(shift(selected, mode === "Week" ? -7 : -1)),
          ),
          button("Next " + mode.toLowerCase(), () =>
            pick(shift(selected, mode === "Week" ? 7 : 1)),
          ),
        ),
      );
      const grid = node("div", undefined, mode === "Week" ? "mr-week" : "");
      for (let i = 0; i < (mode === "Week" ? 7 : 1); i++) {
        const d = shift(localDate(start), i),
          box = node("section", undefined, "mr-day");
        box.append(node("h3", dateText(d)), node("h4", "All-day"));
        const events = eventsOn(d);
        const untimed = events.filter((x) => x.allDay || !x.time);
        box.append(
          ...(untimed.length
            ? untimed.map(eventButton)
            : [empty("No all-day events.")]),
        );
        box.append(node("h4", "Timed events"));
        box.append(
          ...events
            .filter((x) => !x.allDay && x.time)
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(eventButton),
        );
        grid.append(box);
      }
      p.append(grid);
    }
    const schedule = disclosure(
      "All entries",
      "calendar-entries",
      data("events").map((x) =>
        compact(
          x,
          dateText(x.date) + " · " + (x.time || "All day"),
          menu([
            ["Edit", () => eventEditor(x)],
            ["Delete", () => removeItem(data("events"), x, "event")],
          ]),
        ),
      ),
    );
    p.append(schedule);
    root.append(p);
  }
  function shift(date, n) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + n);
    return localDate(d);
  }
  function repeatsOn(x, d) {
    if (x.archived || !x.date || d < x.date) return false;
    const end = x.endDate || x.date,
      span = Math.max(
        0,
        Math.round((Date.parse(end) - Date.parse(x.date)) / 864e5),
      ),
      offset = Math.round((Date.parse(d) - Date.parse(x.date)) / 864e5),
      repeat = x.repeat || (x.repeatYearly ? "yearly" : "once");
    if (repeat === "daily") return true;
    if (repeat === "weekly") return offset % 7 <= span;
    if (repeat === "monthly" || repeat === "yearly") {
      const current = new Date(d + "T12:00:00"),
        original = new Date(x.date + "T12:00:00");
      for (let i = 0; i < 2; i++) {
        const y = current.getFullYear() - (repeat === "yearly" ? i : 0),
          m =
            repeat === "yearly" ? original.getMonth() : current.getMonth() - i;
        const last = new Date(y, m + 1, 0).getDate(),
          start = localDate(new Date(y, m, Math.min(original.getDate(), last)));
        if (start >= x.date && d >= start && d <= shift(start, span))
          return true;
      }
      return false;
    }
    return x.date <= d && end >= d;
  }
  function eventEditor(x) {
    const f = editForm(
      x ? "Edit event" : "Add event",
      [
        ["title", "Title", "text", x?.title, [], true],
        ["date", "Date from", "date", x?.date || selected || day(), [], true],
        [
          "endDate",
          "Date to",
          "date",
          x?.endDate || x?.date || selected || day(),
          [],
          true,
        ],
        ["allDay", "All-day", "checkbox", x?.allDay ?? !x?.time],
        ["time", "Time from", "time", x?.time],
        ["endTime", "Time to", "time", x?.endTime],
        ["location", "Location", "text", x?.location],
        ["notes", "Notes", "textarea", x?.notes],
        [
          "repeat",
          "Repeat",
          "select",
          x?.repeat || (x?.repeatYearly ? "yearly" : "once"),
          [
            ["once", "Does not repeat"],
            ["daily", "Daily"],
            ["weekly", "Weekly"],
            ["monthly", "Monthly"],
            ["yearly", "Yearly"],
          ],
        ],
        ["color", "Event color", "color", x?.color || "#8874b6"],
      ],
      (v) => {
        if (v.endDate < v.date)
          throw Error("Date to must be on or after Date from.");
        if (
          !v.allDay &&
          v.date === v.endDate &&
          v.time &&
          v.endTime &&
          v.endTime < v.time
        )
          throw Error("Time to must be after Time from.");
        change("Save event", () => {
          const values = {
            ...v,
            allDay: v.allDay || !v.time,
            repeatYearly: v.repeat === "yearly",
          };
          if (values.allDay) {
            values.time = "";
            values.endTime = "";
          }
          if (x) Object.assign(x, values);
          else data("events").push({ id: id(), ...values });
        });
      },
    );
    const timed = () => {
      for (const key of ["time", "endTime"])
        f.fields[key].disabled = f.fields.allDay.checked;
    };
    f.fields.allDay.onchange = timed;
    timed();
    if (x)
      f.form.append(
        button("Delete event", () => {
          f.dialog.close();
          removeItem(data("events"), x, "event");
        }),
      );
  }
  function blog(root) {
    const list = data("blogPosts"),
      p = panel(
        "My Blog",
        "Your stories, thoughts, and discoveries.",
        button("+ New post", () => editor(), true),
      );
    function editor(x) {
      const text =
        x?.blocks
          ?.filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n\n") ||
        x?.text ||
        "";
      const oldImage =
        x?.image || x?.blocks?.find((b) => b.type === "image")?.src || "";
      const f = editForm(
        x ? "Edit post" : "New post",
        [
          ["title", "Title", "text", x?.title, [], true],
          ["date", "Date", "date", x?.date?.slice(0, 10) || day()],
          ["article", "Article", "textarea", text, [], true],
          [
            "image",
            "Image URL",
            "url",
            oldImage.startsWith("data:") ? "" : oldImage,
          ],
          [
            "category",
            "Category",
            "select",
            x?.category || "Personal",
            ["Personal", "Faith", "Technology", "Family", "Other"],
          ],
          [
            "tags",
            "Tags",
            "text",
            Array.isArray(x?.tags) ? x.tags.join(", ") : x?.tags,
          ],
          ["draft", "Save as draft", "checkbox", x?.draft ?? true],
        ],
        (v) => {
          change(v.draft ? "Save draft" : "Publish post", () => {
            const values = {
              title: v.title,
              date: v.date,
              category: v.category,
              tags: v.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              draft: v.draft,
              image: v.image || oldImage,
              blocks: [
                { type: "text", text: v.article },
                ...(x?.blocks
                  ?.filter((b) => b.type !== "text")
                  .map((b, i) =>
                    i === 0 && b.type === "image" && v.image
                      ? { ...b, src: v.image }
                      : b,
                  ) ||
                  (v.image || oldImage
                    ? [{ type: "image", src: v.image || oldImage }]
                    : [])),
              ],
              updatedAt: now(),
            };
            if (x) {
              if (!x.redesignOriginalBlocks)
                x.redesignOriginalBlocks = structuredClone(x.blocks || []);
              Object.assign(x, values);
            } else list.push({ id: id(), ...values });
          });
        },
        "Save draft",
      );
      const publish = button("Publish", () => {
        f.fields.draft.checked = false;
        f.form.requestSubmit();
      });
      f.form.append(publish);
      f.fields.draft.onchange = () =>
        (f.form.querySelector("[type=submit]").textContent = f.fields.draft
          .checked
          ? "Save draft"
          : "Publish");
      addPhotoPicker(f, "image");
    }
    function read(x) {
      opened = x.id;
      render();
    }
    if (opened) {
      const x = list.find((x) => x.id === opened);
      if (x) {
        p.append(
          button("Back to blog", () => {
            opened = null;
            render();
          }),
          node("h2", x.title),
          node("small", dateText(x.date || x.createdAt)),
          button("Edit", () => editor(x)),
        );
        if (x.image) p.append(image(x.image, x.title));
        for (const b of x.blocks || []) {
          if (b.type === "text") p.append(node("p", b.text, "mr-article"));
          else if (b.type === "image")
            p.append(image(b.src, b.caption || x.title));
        }
        root.append(p);
        return;
      }
    }
    const current = view || "All posts";
    p.append(
      tabs(
        ["All posts", "Personal", "Faith", "Technology", "Family", "Other"],
        current,
        (v) => {
          view = v;
          render();
        },
      ),
    );
    const grid = node("div", undefined, "mr-blog-grid");
    const entries = [];
    for (const x of list.filter(
      (x) => !x.archived && (current === "All posts" || x.category === current),
    )) {
      const c = node("article", undefined, "mr-blog-card"),
        photo = x.image || x.blocks?.find((b) => b.type === "image")?.src;
      if (photo) c.append(image(photo, x.title));
      c.append(
        node(
          "small",
          dateText(x.date || x.createdAt) + (x.draft ? " · Draft" : ""),
        ),
        node("h3", x.title),
        node(
          "p",
          preview(
            x.blocks
              ?.filter((b) => b.type === "text")
              .map((b) => b.text)
              .join(" ") || x.text,
          ),
        ),
        button("Read post →", () => read(x)),
        genericActions(list, x, () => editor(x), [["Image", () => editor(x)]]),
      );
      grid.append(c);
      entries.push([x.id,c]);
    }
    p.append(
      grid,
      archive(list, (x) =>
        compact(
          x,
          dateText(x.date),
          genericActions(list, x, () => editor(x)),
        ),
      ),
    );
    root.append(p);
    arrange(grid, "blog", entries);
  }
  function image(src, alt) {
    const img = node("img");
    if (/^(https?:|data:image\/|\.\/)/.test(src || "")) img.src = src;
    img.alt = alt || "";
    img.loading = "lazy";
    return img;
  }
  function addPhotoPicker(editor, key) {
    const [l, i] = field("Upload image", "file");
    i.accept = "image/*";
    i.onchange = async () => {
      const file = i.files?.[0];
      if (!file) return;
      if (file.size > 3e6) {
        alert("Choose an image smaller than 3 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        editor.fields[key].type = "text";
        editor.fields[key].value = reader.result;
      };
      reader.readAsDataURL(file);
    };
    editor.form.querySelector(".mr-fields").append(l);
  }
  function habits(root) {
    const list = data("habits"),
      filter = view || "All habits",
      p = panel(
        "Habit Tracker",
        "Small steps, kept over time.",
        button("+ Add habit", () => editor(), true),
      );
    p.append(
      tabs(["All habits", "Building", "Breaking"], filter, (v) => {
        view = v;
        render();
      }),
    );
    function editor(x) {
      const f = editForm(
        x ? "Edit habit" : "Add habit",
        [
          ["name", "Name", "text", x?.name, [], true],
          [
            "mode",
            "Goal",
            "select",
            x?.mode || "build",
            [
              ["build", "Build"],
              ["stop", "Break"],
            ],
          ],
          [
            "type",
            "Category",
            "select",
            x?.type || "Personal",
            ["Health", "Faith", "Personal", "Home", "Work", "Finance", "Other"],
          ],
          ["start", "Start date", "date", x?.start?.slice(0, 10) || day()],
          ["cost", "Cost saved ($)", "number", x?.cost || 0],
          [
            "period",
            "Rate",
            "select",
            x?.period || "daily",
            ["daily", "weekly", "monthly"],
          ],
          ["notes", "Notes", "textarea", x?.notes],
        ],
        (v) =>
          change("Save habit", () => {
            const values = {
              ...v,
              start: v.start + "T00:00:00",
              cost: Math.max(0, v.cost),
            };
            if (x) Object.assign(x, values);
            else list.push({ id: id(), ...values, checks: [] });
          }),
      );
      function conditional() {
        for (const k of ["cost", "period"])
          f.fields[k].closest("label").hidden = f.fields.mode.value === "build";
      }
      f.fields.mode.onchange = conditional;
      conditional();
    }
    function row(x) {
      const checks = [
        ...new Set(x.checkIns || x.checks || x.checkins || []),
      ].sort();
      let streak = 0;
      let d = checks.includes(day()) ? day() : shift(day(), -1);
      while (checks.includes(d)) {
        streak++;
        d = shift(d, -1);
      }
      let best = 0,
        run = 0,
        prev = "";
      for (const d of checks) {
        run = prev && shift(prev, 1) === d ? run + 1 : 1;
        best = Math.max(best, run);
        prev = d;
      }
      const built = x.mode === "build",
        stats = window.HabitTrackerMath?.stats(x) || { saved: 0 };
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(x.start)) / 864e5),
      );
      const detail =
        (x.type || "Personal") +
        " · " +
        (built ? "Building" : "Breaking") +
        (x.paused ? " · Paused" : "") +
        " · " +
        (built
          ? "Streak " + streak + " · Best " + best
          : "Since " +
            dateText(x.start) +
            " · " +
            elapsed +
            " days · " +
            money(stats.saved) +
            " saved · " +
            money(Number(x.cost || 0)) +
            "/" +
            x.period);
      const checkToday = () =>
        change("Habit check-in", () => {
          const values = new Set(x.checkIns || x.checks || x.checkins || []);
          values.has(day()) ? values.delete(day()) : values.add(day());
          x.checkIns = [...values];
          x.checks = x.checkIns;
        });
      const r = compact(
        x,
        detail,
        menu([
          ["Open", () => readRecord({ ...x, title: x.name })],
          ["Edit", () => editor(x)],
          ["Check in / Undo", checkToday],
          [
            x.paused ? "Resume" : "Pause",
            () => change("Pause habit", () => (x.paused = !x.paused)),
          ],
          [
            "Restart",
            () => {
              if (
                confirm(
                  "Restart the streak from today? Previous check-ins will be retained in history.",
                )
              )
                change("Restart habit", () => {
                  (x.previousChecks ??= []).push(
                    ...(x.checkIns || x.checks || []),
                  );
                  x.checkIns = [];
                  x.checks = [];
                  x.start = now();
                });
            },
          ],
          [
            isArchived(x) ? "Restore" : "Archive",
            () => change("Archive habit", () => (x.archived = !x.archived)),
          ],
          ["Delete", () => removeItem(list, x, "habit")],
        ]),
      );
      if (built) {
        const todayButton = button(
          checks.includes(day())
            ? "Completed today · Undo check-in"
            : "Check in today",
          checkToday,
        );
        todayButton.disabled = Boolean(x.paused);
        r.append(todayButton);
        const dates = node("div", undefined, "mr-week-checks");
        for (let i = 6; i >= 0; i--) {
          const d = shift(day(), -i),
            b = button(dateText(d) + (checks.includes(d) ? " ✓" : ""), () =>
              change("Habit check-in", () => {
                const s = new Set(x.checkIns || x.checks || []);
                s.has(d) ? s.delete(d) : s.add(d);
                x.checkIns = [...s];
                x.checks = x.checkIns;
              }),
            );
          b.setAttribute("aria-pressed", String(checks.includes(d)));
          dates.append(b);
        }
        r.append(dates);
      }
      return r;
    }
    const visible = list.filter(
      (x) =>
        !x.archived &&
        (filter === "All habits" ||
          (filter === "Building" ? x.mode === "build" : x.mode !== "build")),
    );
    p.append(...visible.map(row));
    if (!visible.length) p.append(empty("Add a habit to begin tracking."));
    p.append(archive(list, row));
    root.append(p);
  }
  function chores(root) {
    const list = data("chores"),
      period = ["Daily", "Weekly", "Monthly", "Yearly"].includes(view)
        ? view
        : "Daily";
    const p = panel("Chores", "");
    p.append(
      tabs(["Daily", "Weekly", "Monthly", "Yearly"], period, (v) => {
        view = v;
        render();
      }),
    );
    function editor(x) {
      editRecord(list, x, x ? "Edit chore" : "Add chore", [
        ["title", "Name", "text", x?.title, [], true],
        [
          "period",
          "Frequency",
          "select",
          x?.period || period.toLowerCase(),
          ["daily", "weekly", "monthly", "yearly"],
        ],
        ["category", "Category", "text", x?.category],
        ["assigned", "Assigned person", "text", x?.assigned],
        ["due", "Due date", "date", x?.due],
        ["notes", "Notes", "textarea", x?.notes],
      ]);
    }
    const form = node("form", undefined, "mr-line"),
      input = node("input");
    input.placeholder = "Add a chore…";
    input.required = true;
    input.setAttribute("aria-label", "Add a chore");
    const b = node("button", "+ Add chore", "primary");
    form.append(
      input,
      b,
      disclosure("Optional settings", "chore-add-options", [
        button("Add with details", () => editor()),
      ]),
    );
    form.onsubmit = (e) => {
      e.preventDefault();
      if (input.value.trim())
        change("Add chore", () =>
          list.push({
            id: id(),
            title: input.value.trim(),
            period: period.toLowerCase(),
          }),
        );
    };
    p.append(form);
    function cycle(x) {
      if (x.period === "yearly") return day().slice(0, 4);
      if (x.period === "monthly") return day().slice(0, 7);
      if (x.period === "weekly") {
        const d = new Date();
        return shift(day(), -(d.getDay() + 6) % 7);
      }
      return day();
    }
    const visible = list.filter(
      (x) => !x.archived && x.period === period.toLowerCase(),
    );
    const completed = visible.filter((x) => x.checked === cycle(x)).length;
    const progress = node("progress");
    progress.max = visible.length || 1;
    progress.value = completed;
    p.append(
      node("p", completed + " of " + visible.length + " completed"),
      progress,
    );
    function row(x) {
      const check = node("input");
      check.type = "checkbox";
      check.checked = x.checked === cycle(x);
      check.setAttribute("aria-label", "Complete " + x.title);
      check.onchange = () =>
        change("Complete chore", () => {
          x.checked = check.checked ? cycle(x) : "";
          if (check.checked) {
            (x.history ??= []).push({ date: day(), done: true });
            let due = x.due || day();
            if (x.period === "daily") due = shift(due, 1);
            else if (x.period === "weekly") due = shift(due, 7);
            else {
              const d = new Date(due + "T12:00:00");
              d.setMonth(d.getMonth() + (x.period === "yearly" ? 12 : 1));
              due = localDate(d);
            }
            x.nextDue = due;
          }
        });
      const r = compact(
        x,
        [
          x.category,
          x.assigned,
          x.nextDue
            ? "Next " + dateText(x.nextDue)
            : x.due
              ? dateText(x.due)
              : "",
        ]
          .filter(Boolean)
          .join(" · "),
        menu([
          ["Edit / frequency / assignment", () => editor(x)],
          [
            "Skip this occurrence",
            () => change("Skip chore", () => (x.checked = cycle(x))),
          ],
          ["Move schedule", () => editor(x)],
          [
            isArchived(x) ? "Restore" : "Archive",
            () => change("Archive chore", () => (x.archived = !x.archived)),
          ],
          ["Delete", () => removeItem(list, x, "chore")],
        ]),
        check,
      );
      r.classList.toggle("mr-done", check.checked);
      return r;
    }
    p.append(...visible.map(row), archive(list, row));
    root.append(p);
  }
  function recipeEditor(x) {
    const list = (planning().recipes ??= []);
    const ed = editForm(
      x ? "Edit recipe" : "Add recipe",
      [
        ["title", "Name", "text", x?.title, [], true],
        ["image", "Image URL", "url", x?.image],
        ["description", "Description", "textarea", x?.description],
        [
          "ingredients",
          "Ingredients (one per line)",
          "textarea",
          Array.isArray(x?.ingredients)
            ? x.ingredients.join("\n")
            : x?.ingredients,
        ],
        [
          "instructions",
          "Instructions",
          "textarea",
          x?.instructions || x?.method,
        ],
        ["prep", "Prep (minutes)", "number", x?.prep],
        ["cook", "Cook (minutes)", "number", x?.cook],
        ["servings", "Servings", "number", x?.servings || 1],
        ["calories", "Calories per serving", "number", x?.calories],
        ["category", "Category", "text", x?.category],
        [
          "tags",
          "Tags",
          "text",
          Array.isArray(x?.tags) ? x.tags.join(", ") : x?.tags,
        ],
        ["source", "Source", "url", x?.source],
        ["favorite", "Favorite", "checkbox", x?.favorite],
        ["notes", "Notes", "textarea", x?.notes],
      ],
      (v) =>
        change("Save recipe", () => {
          if (x) Object.assign(x, v);
          else list.push({ id: id(), ...v });
        }),
      "Save recipe",
    );
    addPhotoPicker(ed, "image");
  }
  function groceryIngredients(recipe) {
    change("Add ingredients to Grocery List", () => {
      const list = data("shoppingList"),
        ingredients = Array.isArray(recipe.ingredients)
          ? recipe.ingredients
          : String(recipe.ingredients || "").split(/[\n;]/);
      for (const raw of ingredients) {
        const name = String(raw).trim();
        if (
          name &&
          !list.some(
            (x) =>
              !x.archived &&
              x.title.trim().toLowerCase() === name.toLowerCase(),
          )
        )
          list.push({ id: id(), title: name, quantity: 1, flag: false });
      }
    });
  }
  let mealReturn = false;
  function recipes(root) {
    const list = (planning().recipes ??= []),
      p = panel(
        "Recipes",
        "Keep favorite meals and new ideas together.",
        button("+ Add recipe", () => recipeEditor(), true),
      );
    if (mealReturn)
      p.append(button("Back to Meal Planner", () => go("Meal Planner")));
    p.append(
      menu(
        [
          ["Save recipe link", () => recipeEditor()],
          [
            "Browse free recipes",
            () =>
              window.open("https://www.budgetbytes.com/", "_blank", "noopener"),
          ],
          ["Meal Planner", () => go("Meal Planner")],
        ],
        "Recipe tools",
      ),
    );
    const area = node("div");
    const filter = view || "All recipes";
    p.append(
      search("Search recipes by name or ingredient", draw),
      tabs(
        ["All recipes", "Favorites", "Quick meals", "Saved links"],
        filter,
        (v) => {
          view = v;
          render();
        },
      ),
      area,
    );
    function draw() {
      area.replaceChildren();
      const entries = list.filter(
        (x) =>
          !x.archived &&
          (x.title + " " + x.ingredients)
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (filter !== "Favorites" || x.favorite) &&
          (filter !== "Quick meals" ||
            Number(x.prep || 0) + Number(x.cook || 0) <= 30) &&
          (filter !== "Saved links" || x.source),
      );
      const grid = node("div", undefined, "mr-recipe-grid");
      for (const x of entries) {
        const card = node("article", undefined, "mr-recipe");
        if (x.image) card.append(image(x.image, x.title));
        else
          card.append(
            node(
              "div",
              { Breakfast: "🥣", Lunch: "🥗", Dinner: "🍲", Dessert: "🍰" }[
                x.category
              ] || ["🍲", "🥗", "🍝", "🥘"][Math.abs(list.indexOf(x)) % 4],
              "mr-food-placeholder",
            ),
          );
        card.append(
          node("h3", x.title),
          node(
            "small",
            (x.category || "Recipe") +
              " · Prep " +
              (x.prep || "—") +
              " / Cook " +
              (x.cook || "—") +
              " min",
          ),
          button("View recipe →", () => read(x)),
          menu([
            ["Open", () => read(x)],
            ["Edit", () => recipeEditor(x)],
            ["Grocery List", () => groceryIngredients(x)],
            [
              "Meal Planner",
              () => {
                go("Meal Planner");
                mealEditor(null, x);
              },
            ],
            [
              "Favorite",
              () => change("Favorite recipe", () => (x.favorite = !x.favorite)),
            ],
            [
              "Archive",
              () => change("Archive recipe", () => (x.archived = true)),
            ],
            ["Delete", () => removeItem(list, x, "recipe")],
          ]),
        );
        grid.append(card);
      }
      area.append(grid);
      if (!entries.length)
        area.append(empty("Add your first recipe, or save a recipe link."));
    }
    function read(x) {
      const d = node("dialog", undefined, "mr-dialog");
      d.append(node("h2", x.title));
      if (x.image) d.append(image(x.image, x.title));
      d.append(
        node("p", x.description || ""),
        node("h3", "Ingredients"),
        node(
          "p",
          Array.isArray(x.ingredients)
            ? x.ingredients.join("\n")
            : x.ingredients,
          "mr-article",
        ),
        node("h3", "Instructions"),
        node("p", x.instructions || x.method || "", "mr-article"),
        line(
          button("Add ingredients to Grocery List", () =>
            groceryIngredients(x),
          ),
          button("Add to Meal Planner", () => {
            d.close();
            go("Meal Planner");
            mealEditor(null, x);
          }),
          button("Close", () => d.close()),
        ),
      );
      d.onclose = () => d.remove();
      document.body.append(d);
      d.showModal();
    }
    draw();
    p.append(
      archive(list, (x) =>
        compact(
          x,
          x.category,
          genericActions(list, x, () => recipeEditor(x)),
        ),
      ),
    );
    root.append(p);
  }
  const mealNames = [
    "Breakfast",
    "Morning snack",
    "Lunch",
    "Afternoon snack",
    "Dinner",
    "Evening snack",
    "Drinks",
  ];
  function weekStart() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + week * 7);
    return localDate(d);
  }
  function mealEditor(existing, recipe, date = weekStart(), meal = "Dinner") {
    const recipes = (planning().recipes ??= []);
    const ed = editForm(
      existing ? "Edit meal" : "Add meal",
      [
        [
          "recipe",
          "Recipe Box",
          "select",
          recipe?.id || "",
          [
            ["", "Manual food / drink"],
            ...recipes.filter((x) => !x.archived).map((x) => [x.id, x.title]),
          ],
        ],
        [
          "name",
          "Food or drink",
          "text",
          existing?.name || recipe?.title || "",
          [],
          true,
        ],
        ["date", "Day", "date", existing?.date || date, [], true],
        ["meal", "Meal", "select", existing?.meal || meal, mealNames],
        [
          "calories",
          "Calories per serving",
          "number",
          existing?.calories ?? existing?.cal ?? recipe?.calories ?? 0,
        ],
        ["servings", "Servings", "number", existing?.servings || 1],
        [
          "grocery",
          "Add recipe ingredients to Grocery List",
          "checkbox",
          false,
        ],
      ],
      (v) => {
        if (v.servings <= 0 || v.calories < 0)
          throw Error("Use positive servings and nonnegative calories.");
        change("Save meal", () => {
          const m = planning();
          m.mealItems ??= {};
          if (existing) {
            const old = m.mealItems[existing.date]?.[existing.meal] || [];
            m.mealItems[existing.date][existing.meal] = old.filter((x) =>
              existing.id
                ? x.id !== existing.id
                : !(
                    x.name === existing.name &&
                    (x.cal ?? x.calories) ===
                      (existing.cal ?? existing.calories)
                  ),
            );
          }
          if (existing && m.meals?.[existing.date])
            delete m.meals[existing.date][existing.meal];
          if (existing && m.mealCalories?.[existing.date])
            delete m.mealCalories[existing.date][existing.meal];
          const item = {
            id: existing?.id || id(),
            name: v.name,
            cal: v.calories,
            calories: v.calories,
            servings: v.servings,
            recipeId: v.recipe,
          };
          ((m.mealItems[v.date] ??= {})[v.meal] ??= []).push(item);
          if (v.grocery) {
            const r = recipes.find((x) => x.id === v.recipe);
            if (r) {
              const list = data("shoppingList");
              for (const raw of String(r.ingredients || "").split("\n"))
                if (
                  raw.trim() &&
                  !list.some(
                    (x) => x.title.toLowerCase() === raw.trim().toLowerCase(),
                  )
                )
                  list.push({ id: id(), title: raw.trim(), quantity: 1 });
            }
          }
        });
      },
    );
    ed.fields.recipe.onchange = () => {
      const x = recipes.find((x) => x.id === ed.fields.recipe.value);
      if (x) {
        ed.fields.name.value = x.title;
        ed.fields.calories.value = x.calories || 0;
      }
    };
    ed.form.append(
      button("Copy another day", () => {
        const from = prompt("Copy meals from date (YYYY-MM-DD)");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "")) return;
        change("Copy meal day", () => {
          const m = planning();
          (m.mealItems ??= {})[ed.fields.date.value] = structuredClone(
            m.mealItems[from] || {},
          );
          for (const items of Object.values(m.mealItems[ed.fields.date.value]))
            for (const x of items) x.id = id();
        });
        ed.dialog.close();
      }),
    );
  }
  function meals(root) {
    const m = planning(),
      start = weekStart(),
      p = panel("Meal Planner", "Week of " + dateText(start));
    p.append(
      line(
        button("Previous week", () => {
          week--;
          render();
        }),
        button("This week", () => {
          week = 0;
          render();
        }),
        button("Next week", () => {
          week++;
          render();
        }),
        menu(
          [
            [
              "Recipe Box",
              () => {
                mealReturn = true;
                go("Recipes");
              },
            ],
            [
              "Calorie Log",
              () => {
                mealReturn = true;
                go("Calorie Log");
              },
            ],
          ],
          "Meal Planner tools",
        ),
      ),
    );
    const wrap = node("div", undefined, "mr-table-scroll"),
      table = node("table", undefined, "mr-meals"),
      thead = node("thead"),
      tr = node("tr");
    tr.append(node("th", "Meal"));
    for (let i = 0; i < 7; i++) {
      const d = shift(start, i),
        th = node(
          "th",
          new Date(d + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        );
      if (d === day()) th.classList.add("mr-today");
      tr.append(th);
    }
    thead.append(tr);
    table.append(thead);
    const tbody = node("tbody");
    let count = 0,
      total = 0;
    for (const meal of mealNames) {
      const row = node("tr");
      row.append(node("th", meal));
      for (let i = 0; i < 7; i++) {
        const date = shift(start, i),
          td = node("td"),
          items = m.mealItems?.[date]?.[meal] || [],
          legacy = items.length ? "" : m.meals?.[date]?.[meal];
        if (legacy) {
          td.append(
            node("p", legacy),
            menu([
              [
                "Edit",
                () =>
                  editForm(
                    "Edit meal",
                    [["name", "Meal", "text", legacy, [], true]],
                    (v) =>
                      change("Edit meal", () => (m.meals[date][meal] = v.name)),
                  ),
              ],
              [
                "Remove",
                () => {
                  if (confirm("Remove this meal?"))
                    change("Remove meal", () => delete m.meals[date][meal]);
                },
              ],
            ]),
          );
          count++;
          total += Number(m.mealCalories?.[date]?.[meal] || 0);
        }
        for (const x of items) {
          count++;
          total += Number(x.calories ?? x.cal ?? 0) * Number(x.servings || 1);
          const item = { ...x, date, meal };
          td.append(
            line(
              node(
                "span",
                (x.name || x.title) +
                  " · " +
                  Number(x.calories ?? x.cal ?? 0) * Number(x.servings || 1) +
                  " cal",
              ),
              menu([
                ["Edit / move / servings / calories", () => mealEditor(item)],
                [
                  "Grocery List",
                  () => {
                    const r = m.recipes?.find((r) => r.id === x.recipeId);
                    if (r) groceryIngredients(r);
                    else go("Shopping List");
                  },
                ],
                [
                  "Copy",
                  () =>
                    mealEditor(
                      null,
                      { title: x.name, calories: x.calories },
                      date,
                      meal,
                    ),
                ],
                [
                  "Remove",
                  () => {
                    if (confirm("Remove this meal?"))
                      change("Remove meal", () => {
                        m.mealItems[date][meal] = items.filter((y) => y !== x);
                        if (m.meals?.[date]) delete m.meals[date][meal];
                        if (m.mealCalories?.[date])
                          delete m.mealCalories[date][meal];
                      });
                  },
                ],
              ]),
            ),
          );
        }
        td.append(
          button("+ Add meal", () => mealEditor(null, null, date, meal)),
        );
        row.append(td);
      }
      tbody.append(row);
    }
    table.append(tbody);
    wrap.append(table);
    p.append(
      wrap,
      node(
        "p",
        Math.round(total) +
          " planned calories · " +
          Math.round(total / 7) +
          " average per day · " +
          count +
          " meals planned",
      ),
    );
    root.append(p);
  }
  const fieldTypes = [
    "Text",
    "Number",
    "Currency",
    "Date",
    "Dropdown",
    "Checkbox",
    "Rating",
    "Photo",
    "URL",
    "Notes",
  ];
  function collections(root) {
    const list = data("customCollections");
    const p = panel(
      "Collections",
      "A home for whatever you collect.",
      button("+ New collection", () => collectionEditor(), true),
    );
    function collectionEditor(x) {
      editForm(
        x ? "Edit collection" : "New collection",
        [
          ["name", "Name", "text", x?.name, [], true],
          ["description", "Description", "textarea", x?.description],
          ["image", "Image / icon URL", "url", x?.image],
          [
            "type",
            "Type / optional template",
            "select",
            x?.type || "Blank",
            [
              "Blank",
              "Pokémon",
              "Books",
              "Perfume",
              "Beauty",
              "Shoes",
              "Decorations",
              "Coins",
              "Recipes",
              "Keepsakes",
            ],
          ],
          [
            "display",
            "Display style",
            "select",
            x?.display || "List",
            ["Photo grid", "List", "Table", "Gallery"],
          ],
        ],
        (v) =>
          change("Save collection", () => {
            if (x) Object.assign(x, v);
            else
              list.push({
                id: id(),
                ...v,
                fields:
                  v.type === "Pokémon"
                    ? [
                        { id: id(), name: "Set", type: "Text" },
                        { id: id(), name: "Card number", type: "Text" },
                        { id: id(), name: "Value", type: "Currency" },
                      ]
                    : [],
                items: [],
              });
          }),
      );
    }
    const collection = list.find((x) => x.id === selectedCollection);
    if (!collection) {
      if (!list.filter((x) => !x.archived).length)
        p.append(empty("Create your first collection to get started."));
      for (const x of list.filter((x) => !x.archived))
        p.append(
          compact(
            x,
            (x.items?.length || 0) + " items · " + x.type,
            menu([
              [
                "Open",
                () => {
                  selectedCollection = x.id;
                  render();
                },
              ],
              ["Edit", () => collectionEditor(x)],
              [
                "Archive",
                () => {
                  if (confirm("Archive this collection?"))
                    change("Archive collection", () => (x.archived = true));
                },
              ],
              ["Delete", () => removeItem(list, x, "collection")],
            ]),
          ),
        );
      const pokemon = data("pokemonCards");
      if (pokemon.length)
        p.append(
          disclosure(
            "Existing Pokémon cards · " + pokemon.length,
            "legacy-pokemon",
            [
              button("Open saved Pokémon collection", () => {
                const host = node("div");
                p.append(host);
                window.DashboardLegacyPokemon?.paint(host);
              }),
            ],
          ),
        );
      const legacy = data("collectibles");
      if (legacy.length)
        p.append(
          disclosure(
            "Existing collection items · " + legacy.length,
            "legacy-collection",
            [
              node(
                "p",
                "Your previous items are preserved. Import them into a named collection when ready.",
              ),
              button("Import existing items", () =>
                editForm(
                  "Name this collection",
                  [["name", "Name", "text", "My collection", [], true]],
                  (v) =>
                    change("Import existing collection", () => {
                      list.push({
                        id: id(),
                        name: v.name,
                        type: "Legacy",
                        fields: [{ id: "notes", name: "Notes", type: "Notes" }],
                        items: legacy.map((x) => ({
                          ...structuredClone(x),
                          name: x.title || x.name,
                          values: { notes: x.notes || "" },
                        })),
                      });
                    }),
                ),
              ),
            ],
          ),
        );
      p.append(
        archive(list, (x) =>
          compact(
            x,
            "",
            genericActions(list, x, () => collectionEditor(x)),
          ),
        ),
      );
      root.append(p);
      return;
    }
    p.append(
      button("Back to collections", () => {
        selectedCollection = null;
        render();
      }),
      node("h3", collection.name),
      node("p", collection.description || ""),
    );
    collection.fields ??= [];
    collection.items ??= [];
    function editField(x) {
      editForm(
        x ? "Edit field" : "Add custom field",
        [
          ["name", "Field name", "text", x?.name, [], true],
          ["type", "Field type", "select", x?.type || "Text", fieldTypes],
          [
            "options",
            "Dropdown choices (comma-separated)",
            "text",
            x?.options || "",
          ],
        ],
        (v) =>
          change("Save field", () => {
            if (x) Object.assign(x, v);
            else collection.fields.push({ id: id(), ...v });
          }),
      );
    }
    const fields = disclosure(
      "Manage custom fields",
      "collection-fields:" + collection.id,
      [button("+ Add field", () => editField())],
    );
    for (const x of collection.fields)
      fields.append(
        compact(
          x,
          x.type,
          menu([
            ["Rename / edit", () => editField(x)],
            [
              "Move up",
              () =>
                change("Reorder fields", () => {
                  const i = collection.fields.indexOf(x);
                  if (i > 0)
                    [collection.fields[i - 1], collection.fields[i]] = [
                      x,
                      collection.fields[i - 1],
                    ];
                }),
            ],
            [
              "Move down",
              () =>
                change("Reorder fields", () => {
                  const i = collection.fields.indexOf(x);
                  if (i < collection.fields.length - 1)
                    [collection.fields[i + 1], collection.fields[i]] = [
                      x,
                      collection.fields[i + 1],
                    ];
                }),
            ],
            [
              "Remove",
              () => {
                if (
                  confirm(
                    "Remove this field from the view? Stored values will be kept.",
                  )
                )
                  change(
                    "Remove field",
                    () =>
                      (collection.fields = collection.fields.filter(
                        (y) => y !== x,
                      )),
                  );
              },
            ],
          ]),
        ),
      );
    function itemEditor(x) {
      const defs = [
        ["name", "Name", "text", x?.name, [], true],
        ["image", "Photo URL", "url", x?.image],
      ];
      for (const f of collection.fields)
        defs.push([
          f.id,
          f.name,
          {
            Number: "number",
            Currency: "number",
            Rating: "number",
            Date: "date",
            Dropdown: "select",
            Checkbox: "checkbox",
            URL: "url",
            Photo: "url",
            Notes: "textarea",
          }[f.type] || "text",
          x?.values?.[f.id],
          f.options?.split(",").map((s) => s.trim()),
        ]);
      editForm(x ? "Edit item" : "Add item", defs, (v) =>
        change("Save collection item", () => {
          const values = { ...v };
          delete values.name;
          delete values.image;
          if (x) Object.assign(x, { name: v.name, image: v.image, values });
          else
            collection.items.push({
              id: id(),
              name: v.name,
              image: v.image,
              values,
            });
        }),
      );
    }
    const listHost = node("div");
    function draw() {
      listHost.replaceChildren();
      listHost.className = ["Photo grid", "Gallery"].includes(
        collection.display,
      )
        ? "mr-recipe-grid"
        : "";
      const shown = collection.items.filter(
        (x) =>
          !x.archived &&
          JSON.stringify(x).toLowerCase().includes(query.toLowerCase()),
      );
      const value = (x, f) => {
        const v = x.values?.[f.id];
        if (f.type === "Checkbox") return v ? "Yes" : "No";
        if (f.type === "Currency") return money(Number(v || 0));
        return String(v ?? "");
      };
      const table =
        collection.display === "Table"
          ? node("table", undefined, "mr-collection-table")
          : null;
      if (table) {
        const head = node("tr");
        head.append(
          node("th", "Name"),
          ...collection.fields.map((f) => node("th", f.name)),
          node("th", "Actions"),
        );
        table.append(head);
      }
      for (const x of shown) {
        const actions = genericActions(collection.items, x, () =>
          itemEditor(x),
        );
        if (table) {
          const row = node("tr");
          row.append(
            node("td", x.name),
            ...collection.fields.map((f) => node("td", value(x, f))),
          );
          const cell = node("td");
          cell.append(actions);
          row.append(cell);
          table.append(row);
        } else {
          const r = compact(
            x,
            collection.fields
              .map((f) => f.name + ": " + value(x, f))
              .join(" · "),
            actions,
          );
          if (x.image) r.prepend(image(x.image, x.name));
          for (const f of collection.fields.filter((f) => f.type === "Photo"))
            if (x.values?.[f.id]) r.prepend(image(x.values[f.id], f.name));
          listHost.append(r);
        }
      }
      if (table) {
        const scroll = node("div", undefined, "mr-table-scroll");
        scroll.append(table);
        listHost.append(scroll);
      }
      for (const f of collection.fields.filter((f) =>
        ["Currency", "Number"].includes(f.type),
      ))
        listHost.append(
          node(
            "p",
            f.name +
              " total: " +
              shown.reduce((n, x) => n + Number(x.values?.[f.id] || 0), 0),
          ),
        );
    }
    p.append(
      fields,
      button("+ Add item", () => itemEditor(), true),
      search("Filter this collection", draw),
      listHost,
      archive(collection.items, (x) =>
        compact(
          x,
          "",
          genericActions(collection.items, x, () => itemEditor(x)),
        ),
      ),
    );
    draw();
    root.append(p);
  }
  function packing(root) {
    const list = (planning().trips ??= []),
      p = panel(
        "Packing Checklists",
        "Pack a little at a time.",
        button("+ New checklist", () => editor(), true),
      );
    function editor(x) {
      editForm(
        x ? "Trip details" : "New checklist",
        [
          ["title", "Trip name", "text", x?.title, [], true],
          [
            "template",
            "Trip type / template",
            "select",
            x?.template || "Blank",
            [
              "Blank",
              "Weekend",
              "Long trip",
              ...data("packingTemplates").map((x) => x.title),
            ],
          ],
          ["start", "Start date", "date", x?.start],
          ["end", "End date", "date", x?.end],
        ],
        (v) => {
          if (v.start && v.end && v.end < v.start)
            throw Error("End date must be after start date.");
          change("Save checklist", () => {
            if (x) Object.assign(x, v);
            else {
              const template = data("packingTemplates").find(
                (x) => x.title === v.template,
              );
              const items =
                template?.items ||
                (["Weekend", "Long trip"].includes(v.template)
                  ? [
                      "ID and wallet",
                      "Keys",
                      "Phone and charger",
                      "Medications",
                      "Toiletries",
                      "Clothing",
                    ]
                  : []);
              list.push({
                id: id(),
                ...v,
                items: items.map((x) =>
                  typeof x === "string"
                    ? {
                        id: id(),
                        title: x,
                        category: "Essentials",
                        checked: false,
                      }
                    : { ...x, id: id(), checked: false },
                ),
              });
            }
          });
        },
      );
    }
    function tripRow(x) {
      const done = x.items.filter((x) => x.checked).length;
      return compact(
        x,
        done + " of " + x.items.length + " packed",
        menu([
          [
            "Open",
            () => {
              selectedTrip = x.id;
              render();
            },
          ],
          ["Rename / trip details", () => editor(x)],
          [
            "Duplicate",
            () =>
              change("Duplicate checklist", () =>
                list.push({
                  ...structuredClone(x),
                  id: id(),
                  title: x.title + " copy",
                }),
              ),
          ],
          [
            "Save as custom template",
            () =>
              change("Save packing template", () =>
                data("packingTemplates").push({
                  title: x.title,
                  items: structuredClone(x.items),
                }),
              ),
          ],
          [
            isArchived(x) ? "Restore" : "Archive",
            () => {
              if (confirm("Archive or restore this checklist?"))
                change("Archive checklist", () => (x.archived = !x.archived));
            },
          ],
          ["Delete", () => removeItem(list, x, "checklist")],
        ]),
      );
    }
    const trip = list.find((x) => x.id === selectedTrip);
    if (trip) {
      p.append(
        button("Back to checklists", () => {
          selectedTrip = null;
          render();
        }),
        tripRow(trip),
      );
      const progress = node("progress");
      progress.max = trip.items.length || 1;
      progress.value = trip.items.filter((x) => x.checked).length;
      p.append(progress);
      const categories = [
        "Essentials",
        "Clothing",
        "Toiletries",
        "Medications",
        "Electronics",
        "Travel documents",
        "Food and drinks",
        "Custom",
        ...new Set(trip.items.map((x) => x.category).filter(Boolean)),
      ];
      for (const category of new Set(categories)) {
        const items = trip.items.filter(
          (x) => (x.category || "Essentials") === category,
        );
        const form = node("form", undefined, "mr-line"),
          input = node("input");
        input.placeholder = "Add item…";
        input.required = true;
        input.setAttribute("aria-label", "Add item to " + category);
        form.append(input, node("button", "+ Add item"));
        form.onsubmit = (e) => {
          e.preventDefault();
          change("Add packing item", () =>
            trip.items.push({
              id: id(),
              title: input.value.trim(),
              category,
              checked: false,
            }),
          );
        };
        const section = disclosure(
          category + " · " + items.length,
          "pack:" + trip.id + ":" + category,
          [form],
          true,
        );
        for (const x of items) {
          const c = node("input");
          c.type = "checkbox";
          c.checked = x.checked;
          c.setAttribute("aria-label", "Packed " + x.title);
          c.onchange = () => change("Pack item", () => (x.checked = c.checked));
          const r = compact(
            x,
            "",
            menu([
              [
                "Edit",
                () =>
                  editRecord(trip.items, x, "Edit packing item", [
                    ["title", "Name", "text", x.title, [], true],
                    [
                      "category",
                      "Category",
                      "select",
                      category,
                      [...new Set(categories)],
                    ],
                  ]),
              ],
              ["Delete", () => removeItem(trip.items, x, "packing item")],
            ]),
            c,
          );
          r.classList.toggle("mr-done", c.checked);
          section.append(r);
        }
        p.append(section);
      }
      p.append(
        button("Clear completed", () => {
          if (confirm("Remove completed packing items?"))
            change(
              "Clear packed items",
              () => (trip.items = trip.items.filter((x) => !x.checked)),
            );
        }),
      );
      if (trip.items.length && trip.items.every((x) => x.checked))
        p.append(
          node("strong", "Fully packed"),
          button("Archive", () => {
            if (confirm("Archive this fully packed checklist?"))
              change("Archive checklist", () => {
                trip.archived = true;
                selectedTrip = null;
              });
          }),
        );
    } else {
      p.append(
        ...list.filter((x) => !x.archived).map(tripRow),
        archive(list, tripRow),
      );
      if (!list.length)
        p.append(empty("Create a checklist for your next trip."));
    }
    root.append(p);
  }
  function timerModel() {
    if (!state.masterFocus) {
      const old = state.pomodoro || {};
      state.masterFocus = {
        mode: old.mode || "focus",
        minutes: { focus: 25, short: 5, long: 15, custom: 20, ...old.minutes },
        remaining: old.remaining ?? 25 * 60000,
        end: old.end || 0,
        sessions: [],
        cycles: old.sessions || 0,
        settings: {
          sound: false,
          notifications: false,
          flash: false,
          vibration: false,
          autoStart: false,
          continuePages: true,
          mini: true,
        },
      };
    }
    return state.masterFocus;
  }
  function timer(root) {
    const t = timerModel(),
      p = panel("Focus Timer", "One thing at a time.");
    p.classList.add("mr-focus");
    const modes = [
      ["focus", "Focus"],
      ["short", "Short break"],
      ["long", "Long break"],
      ["custom", "Custom"],
    ];
    p.append(
      tabs(modes, t.mode, (v) =>
        change("Timer mode", () => {
          t.mode = v;
          t.end = 0;
          t.remaining = t.minutes[v] * 60000;
        }),
      ),
    );
    const ring = node("div", undefined, "mr-timer-ring"),
      output = node("output", "", "mr-clock");
    output.dataset.focusClock = "";
    output.setAttribute("aria-label", "Time remaining");
    ring.append(output);
    p.append(ring);
    const task = node("select");
    task.setAttribute("aria-label", "Choose something to focus on");
    task.add(new Option("Choose a task (optional)", ""));
    for (const [key, label] of [
      ["priorities", "Task"],
      ["projects", "Project"],
      ["chores", "Chore"],
      ["notes", "Brain Dump"],
    ])
      for (const x of data(key).filter(
        (x) =>
          !x.archived &&
          !x.done &&
          (key !== "notes" || x.noteSection === "brain-dump"),
      ))
        task.add(new Option(label + " · " + titleOf(x), key + ":" + x.id));
    task.value = t.task || "";
    task.onchange = () => {
      t.task = task.value;
      save();
    };
    const quick = node("input");
    quick.placeholder = "Or enter a quick task";
    quick.setAttribute("aria-label", "Quick focus task");
    quick.value = t.quick || "";
    quick.onchange = () => {
      t.quick = quick.value;
      save();
    };
    p.append(line(task, quick));
    const controls = line(
      button(
        t.end
          ? "Pause"
          : t.remaining === t.minutes[t.mode] * 60000
            ? "Start"
            : "Resume",
        () =>
          change("Timer", () => {
            if (t.end) {
              t.remaining = Math.max(0, t.end - Date.now());
              t.end = 0;
            } else {
              t.remaining = t.remaining || t.minutes[t.mode] * 60000;
              t.end = Date.now() + t.remaining;
              t.started = now();
              t.sessionDuration = t.remaining;
            }
          }),
        true,
      ),
      button("Reset", () =>
        change("Reset timer", () => {
          t.end = 0;
          t.remaining = t.minutes[t.mode] * 60000;
        }),
      ),
      button("Skip", () =>
        change("Skip timer", () => {
          t.end = 0;
          t.mode =
            t.mode === "focus"
              ? t.cycles % 4 === 0 && t.cycles
                ? "long"
                : "short"
              : "focus";
          t.remaining = t.minutes[t.mode] * 60000;
        }),
      ),
    );
    p.append(controls);
    const sessions = t.sessions.filter((x) => x.date === day()),
      dates = [
        ...new Set(
          t.sessions.filter((x) => x.mode === "focus").map((x) => x.date),
        ),
      ];
    let streak = 0,
      d = dates.includes(day()) ? day() : shift(day(), -1);
    while (dates.includes(d)) {
      streak++;
      d = shift(d, -1);
    }
    p.append(
      node(
        "p",
        sessions.filter((x) => x.mode === "focus").length +
          " sessions today · " +
          Math.round(
            sessions
              .filter((x) => x.mode === "focus")
              .reduce((n, x) => n + x.duration / 60000, 0),
          ) +
          " minutes focused · " +
          streak +
          " day streak",
      ),
    );
    const settings = disclosure("Timer settings", "focus-settings");
    for (const [key, label] of modes) {
      const [l, i] = field(label + " minutes", "number", t.minutes[key]);
      i.min = 1;
      i.max = 240;
      i.onchange = () => {
        if (!i.checkValidity()) return;
        t.minutes[key] = Number(i.value);
        if (t.mode === key && !t.end) t.remaining = t.minutes[key] * 60000;
        save();
        tickTimer();
      };
      settings.append(l);
    }
    for (const [key, label] of [
      ["sound", "Sounds"],
      ["notifications", "Browser notification"],
      ["flash", "Flash"],
      ["vibration", "Vibration"],
      ["autoStart", "Auto-start cycles"],
      ["continuePages", "Continue across pages"],
      ["mini", "Mini timer"],
    ]) {
      const [l, i] = field(label, "checkbox", t.settings[key]);
      i.onchange = async () => {
        if (key === "notifications" && i.checked && "Notification" in window) {
          const permission = await Notification.requestPermission();
          i.checked = permission === "granted";
        }
        t.settings[key] = i.checked;
        save();
        tickTimer();
      };
      settings.append(l);
    }
    p.append(
      settings,
      disclosure(
        "Session history · " + t.sessions.length,
        "focus-history",
        t.sessions
          .slice()
          .reverse()
          .map((x) =>
            compact(
              { title: x.task || "Focus session" },
              dateText(x.at) +
                " · " +
                Math.round(x.duration / 60000) +
                " min · " +
                x.mode,
            ),
          ),
      ),
    );
    root.append(p);
    tickTimer();
  }
  function tickTimer() {
    if (document.body.classList.contains("fb-account-locked")) return;
    const t = state.masterFocus;
    if (!t) return;
    let left = t.end ? Math.max(0, t.end - Date.now()) : t.remaining;
    if (t.end && left === 0) {
      const finished = t.mode;
      const [taskKey, taskId] = (t.task || "").split(":");
      const task =
        t.quick ||
        (state[taskKey] || []).find((x) => x.id === taskId)?.title ||
        "";
      t.sessions.push({
        id: id(),
        date: day(),
        at: now(),
        mode: finished,
        duration: t.sessionDuration || t.minutes[finished] * 60000,
        task,
      });
      if (finished === "focus") t.cycles++;
      t.mode =
        finished === "focus"
          ? t.cycles % 4 === 0
            ? "long"
            : "short"
          : "focus";
      t.remaining = t.minutes[t.mode] * 60000;
      t.end = t.settings.autoStart ? Date.now() + t.remaining : 0;
      if (t.end) {
        t.started = now();
        t.sessionDuration = t.remaining;
      }
      if (
        t.settings.notifications &&
        "Notification" in window &&
        Notification.permission === "granted"
      )
        new Notification("Focus Timer", {
          body:
            finished === "focus"
              ? "Focus session complete. Time for a break."
              : "Break complete.",
        });
      if (t.settings.vibration) navigator.vibrate?.([150, 80, 150]);
      if (t.settings.flash) {
        document.body.classList.add("mr-timer-flash");
        setTimeout(
          () => document.body.classList.remove("mr-timer-flash"),
          1000,
        );
      }
      if (t.settings.sound) {
        try {
          const Audio = window.AudioContext || window.webkitAudioContext,
            ctx = new Audio(),
            osc = ctx.createOscillator(),
            gain = ctx.createGain();
          gain.gain.value = 0.05;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          osc.onended = () => ctx.close();
        } catch {}
      }
      save();
      if (page === "Focus timer") render();
      left = t.remaining;
    }
    const seconds = Math.ceil(left / 1000),
      label =
        String(Math.floor(seconds / 60)).padStart(2, "0") +
        ":" +
        String(seconds % 60).padStart(2, "0");
    all("[data-focus-clock]").forEach((n) => (n.textContent = label));
    all(".mr-timer-ring").forEach((n) =>
      n.style.setProperty(
        "--timer-progress",
        (1 - left / (t.minutes[t.mode] * 60000)) * 360 + "deg",
      ),
    );
    let mini = $("#masterMiniTimer");
    if (
      t.settings.mini &&
      (t.end || t.remaining !== t.minutes[t.mode] * 60000) &&
      page !== "Focus timer"
    ) {
      if (!mini) {
        mini = button("", () => go("Focus timer"));
        mini.id = "masterMiniTimer";
        document.body.append(mini);
      }
      mini.textContent =
        (t.mode === "focus" ? "Focus" : "Break") + " · " + label;
    } else mini?.remove();
  }
  setInterval(tickTimer, 500);
  function normalizeLabels() {
    const map = {
      "Shopping List": "Grocery List",
      Shopping: "Wishes & Gifts",
      "Packing Checklist": "Packing Checklists",
      "Your projects": "Projects",
      "Your Bible bookshelf": "Bible bookshelf",
      "Recipe box": "Recipes",
      "Edit entry": "Journal entry",
    };
    const elements = all(
      "aside :is(button,summary,span),#content :is(h1,h2,h3,summary),#appPageTitle,#title",
    );
    for (const n of elements)
      for (const child of [...n.childNodes])
        if (child.nodeType === 3 && map[child.textContent.trim()])
          child.textContent = map[child.textContent.trim()];
  }
  function polishOriginal() {
    normalizeLabels();
    if (page === "Exercise") {
      all("#content .card").forEach((p, i) => {
        if (p.dataset.mrDone) return;
        p.dataset.mrDone = "1";
        const h = p.querySelector("h2");
        if (!h) return;
        const title = h.textContent;
        const d = disclosure(title, "exercise:" + i);
        h.remove();
        d.append(...p.childNodes);
        p.append(d);
      });
      all("#content p").forEach((n) => {
        if (/Work toward a (lower|higher) weight/.test(n.textContent))
          n.textContent = n.textContent.replace(
            /Work toward a (lower|higher) weight/,
            "Progress toward goal",
          );
      });
    }
    if (page === "Time for You") {
      const browse = all("#content details").find((x) =>
        /Browse ideas/.test(x.querySelector("summary")?.textContent || ""),
      );
      if (browse && !browse.dataset.mrFold) {
        browse.dataset.mrFold = "joy-browse";
        browse.open = state.redesignFolds?.["joy-browse"] ?? false;
      }
      all(".joy-tile").forEach((tile) => {
        if (tile.dataset.mrMenu) return;
        const actions = [...tile.querySelectorAll("button")].filter(
          (b) => !/Choose/.test(b.textContent),
        );
        if (actions.length) {
          const d = menu(actions.map((b) => [b.textContent, () => b.click()]));
          tile.append(d);
          actions.forEach((b) => (b.hidden = true));
        }
        tile.dataset.mrMenu = "1";
      });
    }
    if (mealReturn && page === "Calorie Log" && !$("#mrMealBack")) {
      const b = button("Back to Meal Planner", () => go("Meal Planner"));
      b.id = "mrMealBack";
      $("#content").prepend(b);
    }
  }
  // Theme-independent disclosure persistence also covers existing Finance and Bible sections.
  document.addEventListener(
    "toggle",
    (event) => {
      const d = event.target;
      if (
        !(d instanceof HTMLDetailsElement) ||
        !d.isConnected ||
        d.closest(".mr-menu,.cf-row-menu,.cf-add-menu") ||
        d.dataset.mrFold
      )
        return;
      if (d.closest("#content") && d.querySelector(":scope > summary")) {
        const key =
          "legacy:" +
          page +
          ":" +
          (d.id ||
            d.querySelector("summary").textContent.replace(/\s*·.*$/, ""));
        (state.redesignFolds ??= {})[key] = d.open;
        save();
      }
    },
    true,
  );
  function restoreFolds() {
    all(
      "#content details:not(.mr-menu):not(.cf-row-menu):not(.cf-add-menu)",
    ).forEach((d) => {
      if (d.dataset.mrFold) return;
      const s = d.querySelector(":scope > summary");
      if (!s) return;
      const key =
        "legacy:" + page + ":" + (d.id || s.textContent.replace(/\s*·.*$/, ""));
      if (Object.hasOwn(state.redesignFolds || {}, key))
        d.open = state.redesignFolds[key];
    });
  }
  function exercise(root) {
    const m = (state.exercisePlanner ??= {}),
      library = window.DashboardWorkoutLibrary?.workouts || [],
      p = panel("Exercise", "Movement and progress at your pace.");
    const weight = disclosure("Weight check-in", "weight-checkin", [], true),
      f = node("form", undefined, "mr-line");
    const inputs = {};
    for (const [key, label, type, value] of [
      ["current", "Current weight", "number", m.current],
      ["target", "Goal weight", "number", m.target],
      ["date", "Date", "date", day()],
    ]) {
      const [l, i] = field(label, type, value);
      i.required = true;
      if (type === "number") {
        i.min = 0.1;
        i.step = 0.1;
      }
      f.append(l);
      inputs[key] = i;
    }
    const submit = node("button", "Save", "primary");
    f.append(submit);
    f.onsubmit = (e) => {
      e.preventDefault();
      change("Save weight check-in", () => {
        m.history ??= [];
        const v = {
          date: inputs.date.value,
          weight: Number(inputs.current.value),
        };
        m.history = m.history.filter((x) => x.date !== v.date);
        m.history.push(v);
        m.history.sort((a, b) => b.date.localeCompare(a.date));
        m.current = String(m.history[0].weight);
        m.target = inputs.target.value;
      });
    };
    weight.append(f);
    const history = [...(m.history || [])].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (m.current && m.target) {
      const first = history[0]?.weight || Number(m.current),
        current = Number(m.current),
        goal = Number(m.target),
        progress = Math.abs(goal - first)
          ? Math.min(
              100,
              Math.max(
                0,
                100 * (1 - Math.abs(goal - current) / Math.abs(goal - first)),
              ),
            )
          : 100;
      weight.append(
        node(
          "p",
          "Current " +
            current +
            " · Goal " +
            goal +
            " · Change since first check-in " +
            (current - first).toFixed(1) +
            " · Remaining difference " +
            Math.abs(goal - current).toFixed(1),
        ),
      );
      const bar = node("progress");
      bar.max = 100;
      bar.value = progress;
      bar.setAttribute("aria-label", "Progress toward goal");
      weight.append(bar);
    }
    weight.append(
      disclosure(
        "Weight history · " + history.length,
        "weight-history",
        history
          .slice()
          .reverse()
          .map((x) =>
            compact(
              { title: dateText(x.date) },
              x.weight + " lb",
              menu([
                [
                  "Edit",
                  () =>
                    editForm(
                      "Edit weight check-in",
                      [
                        ["date", "Date", "date", x.date, [], true],
                        ["weight", "Weight", "number", x.weight, [], true],
                      ],
                      (v) => {
                        if (v.weight <= 0)
                          throw Error("Enter a positive weight.");
                        change("Edit weight check-in", () => {
                          Object.assign(x, v);
                          m.history.sort((a, b) =>
                            b.date.localeCompare(a.date),
                          );
                          m.current = String(m.history[0]?.weight || "");
                        });
                      },
                    ),
                ],
                [
                  "Delete",
                  () => {
                    if (confirm("Delete this weight check-in?"))
                      change("Delete check-in", () => {
                        m.history = m.history.filter((y) => y !== x);
                        m.current = String(m.history[0]?.weight || "");
                      });
                  },
                ],
              ]),
            ),
          ),
      ),
    );
    p.append(weight);
    const currentView =
        view === "Workout library" ? "Workout library" : "My routine",
      routine = disclosure(currentView, "exercise-routine", [], true);
    routine.append(
      tabs(["My routine", "Workout library"], currentView, (v) => {
        view = v;
        render();
      }),
    );
    const categories = [
      "All",
      "Yoga",
      "Stretching",
      "Legs",
      "Arms and shoulders",
      "Core and stomach",
      "Cardio",
      "Back",
      "Glutes and thighs",
      "Balance",
      "Full body",
    ];
    const [cl, category] = field(
      "Category",
      "select",
      state.exerciseCategory || "All",
      categories,
    );
    category.onchange = () => {
      state.exerciseCategory = category.value;
      save();
      draw();
    };
    const host = node("div", undefined, "mr-recipe-grid");
    routine.append(cl, search("Search workouts and exercises", draw), host);
    function draw() {
      host.replaceChildren();
      const selected = m.workouts || [];
      const matches = (w) =>
        category.value === "All" ||
        (w.categories || []).some(
          (c) =>
            c.replace("&", "and").toLowerCase() ===
            category.value.toLowerCase(),
        );
      const list = library.filter(
        (w) =>
          (currentView === "Workout library" || selected.includes(w.id)) &&
          matches(w) &&
          (w.name + " " + w.steps.join(" "))
            .toLowerCase()
            .includes(query.toLowerCase()),
      );
      for (const w of list) {
        const c = node("article", undefined, "mr-recipe");
        if (w.image)
          c.append(
            image(
              "https://assets.nhs.uk/nhsuk-cms/images/" +
                w.image +
                ".width-320.jpg",
              w.alt || w.name,
            ),
          );
        else c.append(node("div", "◌", "mr-food-placeholder"));
        c.append(
          node("h3", w.name),
          node("small", (w.categories || []).join(" · ")),
          node("p", w.steps.join(" ")),
          button(
            selected.includes(w.id) ? "In my routine" : "Add to routine",
            () =>
              change("Update routine", () => {
                m.workouts = selected.includes(w.id)
                  ? selected.filter((x) => x !== w.id)
                  : [...selected, w.id];
              }),
          ),
          menu([
            [
              "Completed today",
              () =>
                editForm(
                  "Record workout",
                  [["minutes", "Minutes", "number", 10, [], true]],
                  (v) => {
                    if (v.minutes <= 0)
                      throw Error("Enter minutes greater than zero.");
                    change("Record workout", () => {
                      (m.activity ??= []).push({
                        id: id(),
                        name: w.name,
                        date: day(),
                        minutes: v.minutes,
                      });
                    });
                  },
                ),
            ],
            [
              "Remove from routine",
              () => {
                if (confirm("Remove this workout from your routine?"))
                  change(
                    "Remove workout",
                    () => (m.workouts = selected.filter((x) => x !== w.id)),
                  );
              },
            ],
          ]),
        );
        host.append(c);
      }
      if (!list.length)
        host.append(
          empty(
            "Choose exercises in the Workout library to build your routine.",
          ),
        );
    }
    draw();
    p.append(
      routine,
      disclosure("Exercise guidance", "exercise-guidance", [
        node(
          "p",
          "Build up at your pace. Choose movement you enjoy and can repeat comfortably.",
        ),
      ]),
    );
    const recent = m.activity || [],
      week = shift(day(), -6);
    p.append(
      disclosure("Recent activity", "workout-activity", [
        node(
          "p",
          recent
            .filter((x) => x.date >= week)
            .reduce((n, x) => n + x.minutes, 0) + " minutes this week",
        ),
        ...recent
          .slice()
          .reverse()
          .map((x) =>
            compact(
              x,
              dateText(x.date) + " · " + x.minutes + " minutes,",
              menu([["Delete", () => removeItem(recent, x, "workout record")]]),
            ),
          ),
      ]),
    );
    root.append(p);
  }
  function joys(root) {
    const api = window.DashboardJoy;
    if (!api) { root.append(empty("Reopen Little Joys to load your ideas.")); return; }
    const m = api.model();
    const categories = ["Beauty and style", "Cozy", "Creative", "Music", "Outdoors", "Relaxation", "Social", "Spiritual", "Personal", "Play"];
    const categoryName = x => ({beauty:"Beauty and style",rest:"Relaxation",faith:"Spiritual",outside:"Outdoors",outdoors:"Outdoors",creative:"Creative",music:"Music",social:"Social",play:"Play",cozy:"Cozy",personal:"Personal",spiritual:"Spiritual"}[String(x.category).toLowerCase()] || x.category || "Personal");
    const minutes = x => x.minutes || (x.kind === "short" ? 10 : 30);
    const metadata = x => categoryName(x) + " · " + minutes(x) + " minutes";
    const active = () => m.activities.filter(x => x.enabled !== false && !x.hidden);
    const p = panel("Little Joys", "Choose something small that could make today feel better.");
    p.classList.add("mr-joy-page");
    const feature = node("article", undefined, "mr-joy-feature"), host = node("div", undefined, "mr-joy-grid");
    let featured = active().find(x=>x.id===m.featuredIdea) || active()[0];
    function editor(x) {
      editForm(x ? "Edit idea" : "Add an idea", [
        ["name","Idea title","text",x?.name,[],true],
        ["description","Description","textarea",x?.description],
        ["category","Category","select",x ? categoryName(x) : "Personal",categories],
        ["minutes","Time length","select",String(x ? minutes(x) : 10),[["5","Quick break"],["10","10 minutes"],["30","30 minutes"],["60","Longer"]]],
        ["image","Optional image or icon","text",x?.image]
      ], v => change("Save idea",()=>{
        const values={...v,minutes:Number(v.minutes),kind:Number(v.minutes)<=10?"short":"long"};
        if(x) Object.assign(x,values); else m.activities.push({id:id(),...values,enabled:true,custom:true});
      }), "Save idea");
    }
    function choose(x) {
      change("Choose idea",()=>{
        m.featuredIdea=x.id;
        m.pending={activityId:x.id,name:x.name,kind:x.kind,category:x.category,before:null,startedAt:now()};
        (m.history ??= []).push({id:id(),at:now(),type:"chosen",activity:x.name,activityId:x.id,category:x.category,kind:x.kind});
      });
    }
    function actions(x) { return menu([
      ["Choose",()=>choose(x)],
      ["Choose with optional check-in",()=>api.choose(x)],
      [x.favorite?"Unfavorite":"Add to favorites",()=>change("Favorite idea",()=>x.favorite=!x.favorite)],
      ["Edit",()=>editor(x)],
      ["Duplicate",()=>change("Duplicate idea",()=>m.activities.push({...structuredClone(x),id:id(),name:x.name+" copy",custom:true,hidden:false}))],
      [x.custom?"Delete":"Hide idea",()=>{if(x.custom){if(confirm("Delete this custom idea?"))change("Delete idea",()=>m.activities.splice(m.activities.indexOf(x),1));}else change("Hide idea",()=>x.hidden=true);}]
    ],"Options for "+x.name); }
    function card(x) {
      const c=node("article",undefined,"mr-joy-card");
      c.append(actions(x),node("h3",x.name),node("small",metadata(x)));
      if(x.description)c.append(node("p",x.description));
      c.append(button("Choose",()=>choose(x)));return c;
    }
    function show(x) {
      feature.replaceChildren();featured=x;
      if(!x){feature.append(empty("Add an idea to get started."));return;}
      const chosen=m.pending?.activityId===x.id;
      feature.append(actions(x),node("small",metadata(x)),node("h3",x.name));
      if(x.description)feature.append(node("p",x.description));
      if(chosen){const status=node("p","Chosen — added to Activity history.","mr-save-status");status.setAttribute("role","status");feature.append(status);}
      feature.append(line(button(chosen?"Do it again":"Choose this idea",()=>choose(x),true),
        chosen?button("Choose another",surprise):null,
        chosen?button(x.favorite?"Unfavorite":"Mark as favorite",()=>change("Favorite idea",()=>x.favorite=!x.favorite)):null,
        chosen?button("I did this",()=>api.completePending()):null,
        chosen?button("Let this one go",()=>change("Cancel chosen idea",()=>m.pending=null)):null));
      if(m.pending && !chosen) feature.append(line(node("small","In progress: "+m.pending.name),button("Complete activity",()=>api.completePending())));
    }
    function surprise(){const list=active().filter(x=>x!==featured);const x=list[Math.floor(Math.random()*list.length)]||active()[0];if(x){m.featuredIdea=x.id;save();}show(x);}
    const favoritesList=m.activities.filter(x=>x.favorite&&!x.hidden);
    const favorites=disclosure("Favorites · "+favoritesList.length,"joy-favorites",favoritesList.length?favoritesList.map(x=>compact({...x,title:"♡ "+x.name},metadata(x),actions(x))):[empty("No favorite ideas yet.")]);
    p.querySelector(".mr-heading").append(line(button("Surprise me",surprise,true),button("Favorites",()=>{favorites.open=true;favorites.scrollIntoView({behavior:"smooth",block:"nearest"});}),button("Add an idea",()=>editor())));
    const browse=disclosure("Browse ideas","joy-browse",[],false);
    const [fl,filter]=field("Time","select","",[["","Any time"],["5","Quick break"],["10","10 minutes"],["30","30 minutes"],["60","Longer"]]);
    const [cl,cat]=field("Category","select","",[["","All categories"],...new Set([...categories,...m.activities.map(categoryName)])]);
    function draw(){host.replaceChildren();const list=active().filter(x=>[x.name,x.description,categoryName(x)].join(" ").toLowerCase().includes(query.toLowerCase())&&(!cat.value||categoryName(x)===cat.value)&&(!filter.value||(filter.value==="5"?minutes(x)<=5:filter.value==="60"?minutes(x)>30:minutes(x)===Number(filter.value))));host.append(...(list.length?list.map(card):[empty("No ideas match your filters.")]));}
    filter.onchange=draw;cat.onchange=draw;
    const searchLabel=node("label","Search ideas");searchLabel.append(search("Search ideas",draw));
    browse.append(searchLabel,line(fl,cl),host);
    const hidden=m.activities.filter(x=>x.hidden);
    if(hidden.length)browse.append(disclosure("Hidden ideas · "+hidden.length,"joy-hidden",hidden.map(x=>compact(x,"",button("Restore",()=>change("Restore idea",()=>x.hidden=false))))));
    const records=[...m.completed.map(x=>({...x,displayDate:x.completedAt,status:"Completed"})),...m.history.filter(x=>x.type==="chosen").map(x=>({...x,name:x.activity,displayDate:x.at,status:"Chosen"}))].sort((a,b)=>String(b.displayDate).localeCompare(String(a.displayDate)));
    const history=disclosure("Activity history · "+records.length,"joy-history",records.length?records.map(x=>compact(x,dateText(x.displayDate)+" · "+categoryName(x)+" · "+x.status,menu([["View activity",()=>{const idea=m.activities.find(a=>a.id===x.activityId||a.name===x.name);if(idea){show(idea);feature.scrollIntoView({behavior:"smooth"});}}]]))):[empty("Choose an idea and it will appear here.")]);
    p.append(feature,browse,favorites,history);show(featured);draw();root.append(p);
  }
  const renderers = {
    Overview: home,
    Projects: projects,
    "Quick notes": (r) => notes(r),
    "Brain Dump": (r) => notes(r, true),
    "Shopping List": grocery,
    Journal: journal,
    Calendar: calendar,
    Blog: blog,
    "Habit Tracker": habits,
    Chores: chores,
    Recipes: recipes,
    "Meal Planner": meals,
    Collections: collections,
    "Packing Checklist": packing,
    "Focus timer": timer,
    Exercise: exercise,
    "Time for You": joys,
  };
  const previousGo = go;
  go = function (p) {
    p = aliases[p] || p;
    return previousGo(p);
  };
  const previousRender = render;
  render = function () {
    const target = page,
      changed = lastPage !== target || lastOwner !== state;
    if (changed) {
      if (lastOwner !== state) {
        selectedCollection = null;
        selectedTrip = null;
        week = 0;
        journalDate = day();
        mealReturn = false;
      }
      if (
        lastPage === "Focus timer" &&
        state.masterFocus &&
        !state.masterFocus.settings.continuePages &&
        state.masterFocus.end
      ) {
        state.masterFocus.remaining = Math.max(
          0,
          state.masterFocus.end - Date.now(),
        );
        state.masterFocus.end = 0;
        save();
      }
      query = "";
      view = "";
      opened = null;
      lastPage = target;
      lastOwner = state;
    }
    const managed = renderers[target];
    if (managed) page = "Quick notes";
    try {
      previousRender();
    } finally {
      page = target;
    }
    if (managed) {
      const root = $("#content");
      root.replaceChildren();
      root.classList.add("mr-content");
      managed(root);
      const action = undoByOwner.get(state);
      if (action) {
        const undoButton = button("Undo " + action.label, undo);
        undoButton.classList.add("mr-page-undo");
        root.append(target === "Overview" ? disclosure("Undo Arrange Home", "home-undo", [undoButton]) : undoButton);
      }
    } else $("#content")?.classList.remove("mr-content");
    document.body.dataset.glowPage = target;
    const label = names[target] || target;
    for (const selector of ["#appPageTitle", "#title"]) {
      const n = $(selector);
      if (n) n.textContent = label;
    }
    if ($("#description")) $("#description").textContent = "";
    window.DashboardSidebar?.organize();
    all("aside [data-page]").forEach((b) => {
      b.classList.toggle("active", b.dataset.page === target);
    });
    polishOriginal();
    restoreFolds();
    applyRegions();
    tickTimer();
    return undefined;
  };
  window.MasterRedesign = {
    render,
    change,
    undo,
    eventEditor,
    version: "2026-11-27",
  };
  window.addEventListener("dashboard:account-changing", () => {
    all("dialog.mr-dialog[open]").forEach((d) => d.close());
    $("#masterMiniTimer")?.remove();
  });
  window.addEventListener("dashboard:data-applied", () => {
    lastOwner = null;
    render();
  });
  const regionNames = [
    "Sidebar",
    "Top bar",
    "Bottom bar",
    "Body",
    "Containers",
    "Text",
  ];
  const regionSheet = node("style");
  regionSheet.id = "masterRegionStyles";
  document.head.append(regionSheet);
  function captureTheme() {
    const b = getComputedStyle(document.body),
      main = $("body > main"),
      bar = $("#appMobileHeader"),
      side = $("body > aside");
    const prop = (name, fallback) =>
      b.getPropertyValue(name).trim() || fallback;
    const panel = prop(
        "--theme-page-panel",
        prop("--panel-color", prop("--card-bg", "#f4edff")),
      ),
      ink = prop("--theme-panel-text", prop("--ink", "#302344")),
      accent = prop("--theme-active-start", prop("--accent", "#7362ac"));
    const read = (n) => {
      const c = getComputedStyle(n || document.body);
      return {
        background: c.background,
        color: c.color,
        border: c.borderColor,
      };
    };
    return {
      Sidebar: read(side),
      "Top bar": read(bar),
      "Bottom bar": read($(".glow-bottom-nav") || bar),
      Body: { background: prop("--theme-background", "#f4edff"), color: ink },
      Containers: {
        background: panel,
        color: readable(panel),
        border: prop("--line", "#ada0c4"),
        accent,
      },
      Text: { color: readable(panel) },
      theme: document.body.dataset.dashboardTheme,
    };
  }
  function sampleTheme(theme, custom) {
    const old = regionSheet.textContent;
    regionSheet.textContent = "";
    const result = window.DashboardThemeCatalog.preview(
      theme,
      custom,
      captureTheme,
    );
    regionSheet.textContent = old;
    return result;
  }
  function readable(background) {
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4edff";
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1, 1);
    const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0,3).map(v => {
      v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    const l = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    return l > .179 ? "#161822" : "#ffffff";
  }
  function applyRegions() {
    const selectedTheme = state.redesignAppearance?.selectedTheme;
    if (selectedTheme && window.DashboardThemeCatalog.get().theme !== selectedTheme)
      window.DashboardThemeCatalog.setSparkles({theme: selectedTheme, custom: state.redesignAppearance.custom});
    const saved = state.redesignAppearance?.regions;
    if (!saved) {
      const bg = getComputedStyle(document.body).getPropertyValue("--theme-page-panel").trim() || "#f4edff";
      document.body.style.setProperty("--mr-ink", readable(bg));
      return;
    }
    const rule = (selector, p) => {
      if (!p) return "";
      return (
        selector +
        "{" +
        (p.background ? "background:" + p.background + "!important;" : "") +
        (p.color ? "color:" + p.color + "!important;" : "") +
        (p.border ? "border-color:" + p.border + "!important;" : "") +
        "}"
      );
    };
    const colors = saved.Containers || {},
      ink = saved.Text?.color || colors.color;
    const safeColor = (v, fallback) =>
      CSS.supports("color", v || "") ? v : fallback;
    document.body.style.setProperty(
      "--mr-panel",
      safeColor(colors.background, "#f4edff"),
    );
    document.body.style.setProperty("--mr-ink", readable(safeColor(colors.background, "#f4edff")));
    document.body.style.setProperty(
      "--mr-line",
      safeColor(colors.border, "#ada0c4"),
    );
    document.body.style.setProperty(
      "--mr-accent",
      safeColor(colors.accent, "#7362ac"),
    );
    document.body.style.setProperty("--mr-action-ink", readable(safeColor(colors.accent, "#7362ac")));
    regionSheet.textContent =
      rule(
        "html body.glow-redesign:is(body,#masterTheme):is(body,#masterColors):is(body,#masterAreas)>aside",
        saved.Sidebar,
      ) +
      rule(
        "html body.glow-redesign:is(body,#masterTheme):is(body,#masterColors):is(body,#masterAreas) #appMobileHeader",
        saved["Top bar"],
      ) +
      rule(
        "html body.glow-redesign:is(body,#masterTheme):is(body,#masterColors):is(body,#masterAreas) .glow-bottom-nav,html body.glow-redesign .app-bottom-nav",
        saved["Bottom bar"],
      ) +
      rule(
        "html body.glow-redesign:is(body,#masterTheme):is(body,#masterColors):is(body,#masterAreas)>main",
        saved.Body,
      );
  }
  function openThemes() {
    const owner = state;
    const catalog = window.DashboardThemeCatalog;
    if (!catalog) return;
    const current = catalog.get(),
      stored = state.redesignAppearance || {},
      original = structuredClone(stored);
    const d = node("dialog", undefined, "mr-dialog mr-theme-editor");
    d.setAttribute("aria-label", "Theme editor");
    const heading = line(
      node("h2", "Themes"),
      button("Close", () => d.close()),
    );
    const [tl, theme] = field(
      "Theme",
      "select",
      stored.selectedTheme || current.theme,
      catalog.themes,
    );
    const areas = line();
    const checks = new Map();
    for (const name of regionNames) {
      const [l, c] = field(name, "checkbox", true);
      checks.set(name, c);
      areas.append(l);
    }
    const previewBox = node("div", undefined, "mr-theme-preview");
    previewBox.append(
      node("h3", "Live preview"),
      node("p", "Your cards, text, and controls."),
      button("Sample button", () => {}),
    );
    let custom = { ...current.custom, ...stored.custom };
    const customPanel = disclosure(
      "Custom theme colors",
      "custom-theme-editor",
    );
    const colorFields = {};
    for (const [key, label] of [
      ["background", "Body"],
      ["sidebar", "Sidebar"],
      ["header", "Top bar"],
      ["page-panel", "Containers"],
      ["panel-text", "Text"],
      ["accent", "Accent"],
      ["accent-end", "Accent end"],
      ["light-text", "Shell text"],
      ["clock", "Clock"],
    ]) {
      const [l, i] = field(label, "color", custom[key] || "#8874b5");
      i.oninput = () => {
        custom[key] = i.value;
        drawPreview();
      };
      customPanel.append(l);
      colorFields[key] = i;
    }
    customPanel.append(
      line(
        button("Save custom theme", () => {
          change("Save custom theme", () => {
            (state.redesignAppearance ??= {}).custom = custom;
          });
          theme.value = "custom";
          drawPreview();
        }),
        button("Reset custom theme", () => {
          if (
            !confirm(
              "Reset your custom theme colors? Calendar colors will stay as they are.",
            )
          )
            return;
          custom = catalog.defaults();
          change("Reset custom theme", () => {
            (state.redesignAppearance ??= {}).custom = { ...custom };
          });
          Object.entries(colorFields).forEach(
            ([k, i]) => (i.value = custom[k]),
          );
          drawPreview();
        }),
      ),
    );
    function drawPreview() {
      const palette = sampleTheme(theme.value, custom),
        c = palette.Containers;
      previewBox.style.background = c.background;
      previewBox.style.color = c.color;
      previewBox.style.borderColor = c.border;
      previewBox.querySelector("button").style.background = c.accent;
      previewBox.querySelector("button").style.color = "white";
    }
    theme.onchange = drawPreview;
    const status = node("p");
    status.setAttribute("role", "status");
    function apply(allAreas) {
      if (owner !== state) {
        status.textContent = "Your signed-in dashboard changed. Reopen Themes.";
        return;
      }
      const palette = sampleTheme(theme.value, custom);
      if (!allAreas && ![...checks.values()].some((c) => c.checked)) {
        status.textContent = "Choose at least one area.";
        return;
      }
      const before = state.redesignAppearance?.regions || captureTheme();
      change("Apply theme areas", () => {
        state.redesignAppearance = {
          ...state.redesignAppearance,
          selectedTheme: theme.value,
          custom,
          regions: {
            ...before,
            ...Object.fromEntries(
              regionNames
                .filter((n) => allAreas || checks.get(n).checked)
                .map((n) => [n, palette[n]]),
            ),
          },
        };
      });
      status.textContent =
        "Selected areas applied. Your calendar colors are unchanged.";
    }
    const sparkle = disclosure("Sparkle & glitter", "sparkle-editor");
    const [il, intensity] = field("Intensity", "select", current.intensity, [
      ["off", "Off"],
      ["subtle", "Subtle"],
      ["dreamy", "Moderate"],
      ["full", "Full glitter"],
    ]);
    const [al, accent] = field("Accent color", "select", current.accent, [
      "lavender",
      "pink",
      "ice",
      "mint",
      "peach",
    ]);
    const [gl, glitter] = field(
      "Glitter color",
      "select",
      current.glitterColor,
      ["rainbow", "rose", "gold", "cyan", "lime", "violet", "silver", "coral"],
    );
    const [ml, motion] = field("Animate sparkles", "checkbox", current.motion);
    const pages = [
      "Overview",
      "Calendar",
      "Projects",
      "Quick notes",
      "Finances",
      "Journal",
      "Blog",
      "Brain Dump",
      "Habit Tracker",
      "Chores",
      "Recipes",
      "Exercise",
      "Meal Planner",
      "Collections",
      "Time for You",
      "Packing Checklist",
    ];
    const pageChecks = new Map();
    const pageSelect = disclosure("Glitter pages", "glitter-pages");
    for (const p of pages) {
      const [l, c] = field(
        names[p] || p,
        "checkbox",
        current.pages === "all" || current.pages?.includes(p),
      );
      pageChecks.set(p, c);
      pageSelect.append(l);
    }
    sparkle.append(
      il,
      al,
      gl,
      ml,
      pageSelect,
      button("Save sparkle settings", () => {
        if (owner !== state) return;
        catalog.setSparkles({
          intensity: intensity.value,
          accent: accent.value,
          glitterColor: glitter.value,
          motion: motion.checked,
          pages: [...pageChecks].filter(([, c]) => c.checked).map(([p]) => p),
        });
        status.textContent = "Sparkle settings saved.";
      }),
    );
    d.append(
      heading,
      tl,
      line(
        button("Select all", () => checks.forEach((c) => (c.checked = true))),
        button("Clear all", () => checks.forEach((c) => (c.checked = false))),
      ),
      areas,
      previewBox,
      line(
        button("Apply selected areas", () => apply(false), true),
        button("Apply to all", () => apply(true)),
      ),
      customPanel,
      sparkle,
      status,
    );
    d.onclose = () => d.remove();
    document.body.append(d);
    d.showModal();
    drawPreview();
  }
  if (window.DashboardThemes) window.DashboardThemes.open = openThemes;
  // Keep shell theme controls pointing at the unified editor.
  document.addEventListener(
    "click",
    (event) => {
      const b = event.target.closest("button");
      if (
        b &&
        (/^(Themes|Theme Studio)$/.test(b.textContent.trim()) ||
          b.getAttribute("aria-label") === "Themes")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openThemes();
      }
    },
    true,
  );
  render();
})();
