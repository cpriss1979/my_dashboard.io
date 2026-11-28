# My Dashboard — Master Redesign Brief

## 1. Global product rules

### Visual system

- Preserve the iridescent pastel glass-like aesthetic.
- Every page must respond completely to the selected theme.
- Never leave permanent yellow, lavender, peach, blue, or purple containers when another theme is selected.
- Theme changes must update backgrounds, containers, borders, buttons, inputs, text, icons, progress indicators, menus, modals, shadows, and highlights.
- Keep text readable with strong enough contrast in every theme.
- Use decorative sparkles lightly and never place them over important text, dates, controls, images, or form fields.
- Keep layouts compact, aligned, responsive, and easy to scan.

### Consistent controls

- Use one consistent button style, size, shape, border, font, and hover treatment for each control type.
- Use one primary action per page whenever possible.
- Put less-used actions inside a compact three-dot menu.
- Avoid repeated large Edit, Delete, Options, Archive, or Remove buttons.
- Use collapsible sections for secondary information and remember the user’s open/closed state.
- Require confirmation before destructive actions.

### Naming and navigation

- Use the exact page names requested below throughout titles, sidebar labels, Home cards, buttons, headings, and links.
- Preserve navigation context when opening related pages.
- Add clear back links when opening Recipes, Calorie Log, or other pages from Meal Planner.

### Home cards

- Use a clean, consistent grid of compact shortcut cards.
- Each card contains one same-sized identifying icon/image, title, short description, and one `Open →` link.
- Clicking anywhere on a card or its link opens the page.
- Use subtle hover effects without changing card size.
- Empty cards should explain what the page contains rather than looking broken.

## 2. Theme system redesign

Keep every existing theme, including all seasonal, character, custom, and Iridescent Dream themes.

When applying a theme, allow the user to choose any combination of:

- Sidebar
- Top bar
- Bottom bar
- Body
- Containers
- Text

Provide Select all, Clear all, live preview, Apply selected areas, and Apply to all. Unselected areas must remain unchanged so mixed-theme layouts are possible.

Keep sparkle and glitter settings separate from color themes:

- Intensity: Off, Subtle, Moderate, Full glitter
- Accent color
- Glitter color
- Animate sparkles
- Glitter pages

Replace repeated Save/Reset controls with one organized editor and one Save custom theme / Reset custom theme area. Preserve custom calendar colors separately.

## 3. Sidebar, household, and wishes

### Household

Order pages as:

1. Chores
2. Recipes
3. Grocery List

Rename Shopping List to Grocery List everywhere and move it under Household.

### Wishes & Gifts

Rename Shopping to Wishes & Gifts. Include:

- My Wish List — things Crystal wants for herself
- Gift Planner — gifts to buy for other people

### Grocery List

Replace All Items, Current, and Purchased with:

- To Buy — default tab; new items appear here
- In My Cart — checked items move here automatically

Unchecking an item in In My Cart moves it back to To Buy. An item may appear in only one tab at a time.

## 4. Finance

- Closed dropdowns remain closed until manually reopened.
- Every finance page needs an undo action for the last page action.
- Make Transactions & Planned Moves compact: one aligned row showing name, amount, date, account, and cleared status.
- Put Manage and Details in an opened-row menu.
- Keep cleared checkboxes visually separate.
- Use subtle row dividers instead of bulky cards.
- Use one tab bar: Summary, Transactions, Upcoming, Savings goals.
- Replace Record income, Record expense, and Record transfer with one `+ Add` menu.
- Use one compact forecast range selector.
- Put bill management, income management, purchase planning, and Settings & tools in collapsed Manage & tools.

## 5. Home page

Use compact shortcut cards with these descriptions and icons:

| Page | Description | Icon idea |
|---|---|---|
| Grocery List | Items to buy for the house | Grocery basket |
| Wish List | Things I would like to get | Star or gift |
| Little Joys | Small things that brighten my day | Sunshine or heart |
| Habit Tracker | Routines I am keeping up with | Checkmark calendar |
| Games | Games and activities | Game controller |
| Badges | Achievements I have earned | Medal or ribbon |
| Collections | Items and collections I am tracking | Display shelf |
| Journal | Personal thoughts and daily entries | Notebook and pen |
| Projects | Larger tasks and ongoing plans | Folder or clipboard |
| Scripture | Bible reading and study | Open Bible |
| Finances | Balances, bills, and money activity | Wallet or chart |
| Tasks | Important tasks and priorities | Checkmark list |

## 6. Calendar

- Page is called Calendar; remove “Add to your day.”
- Remove the Area dropdown and duplicate Schedule card.
- Use one `+ Add event` button.
- Use a connected segmented selector: Day | Month | Week | Year.
- Show full event names; wrap them naturally and never use `+1 more`.
- Let cells grow or expand when multiple events exist.
- Use one clear current-day treatment and a separate selected-date treatment.
- Add an All-day section above timed events.
- Events without times automatically become all-day events.
- Add event form fields: Title, Date from, Date to, All-day, Time from, Time to, Location, Notes, Repeat, Event color, Cancel, Save.
- Put date fields on one row and time fields on one row when space allows.
- Apply themes to the entire calendar, event form, date cells, events, inputs, buttons, borders, and modal.

## 7. Bible

Rename the large book grid section to Bible bookshelf.

- Closed by default and remembers open/closed state.
- Header shows total progress, such as `0 of 1,189 chapters read`.
- Group books into Old Testament and New Testament.
- Use compact rows with book name and progress on the same line.
- Highlight only the selected book or books with progress.
- Apply the selected theme to the bookshelf.

## 8. Projects

- Rename Your projects to Projects.
- Use one `+ Add project` button.
- Categories: Work, Church, Technology, Home, Personal, Learning, Uncategorized.
- Categories collapse and expand.
- Use compact rows showing project name, category, status, progress, and a thin progress bar.
- Statuses: Planning, In progress, Paused, Complete.
- Complete automatically sets progress to 100%.
- Put Edit, category, status, notes, Archive, and Delete in a three-dot menu.
- Archived projects are collapsed, muted, and use the same row style.
- Add/edit fields: Name, Description, Category, Status, Progress, Due date, Notes.
- Home shows only a compact preview of active projects.

## 9. Notes

- Keep the lined editor, margin line, clean writing surface, title, and Save note.
- Rename the list section to My notes.
- Add search directly above notes.
- Use compact rows showing title, preview, date, and pin status.
- Add a separate collapsed Pinned notes section.
- Move Open, Edit, Pin, Archive, and Delete into a three-dot menu.
- Add a collapsed Archived notes section with Restore and Delete.
- Keep the editor theme-responsive while preserving visible writing lines.

## 10. Journal

- Rename Edit entry to Journal entry when creating an entry.
- Header shows Journal, selected date, and entry count.
- Use Calendar and Entries tabs.
- Open to the current date by default.
- Calendar dates with entries show a theme-colored dot.
- Keep Date and Feeling on one row, followed by compact Title and expandable writing area.
- Writing options remain collapsed: font, size, spacing, writing color.
- Show existing entries as compact previews with date, title, feeling, and short preview.
- Put Edit, Archive, and Delete in a three-dot menu.
- Apply themes to the entire journal and writing area.

## 11. Blog

- Heading: My Blog.
- One primary action: `+ New post`.
- Use an aligned grid or list, not masonry.
- Cards show optional featured image, date, title, preview, and `Read post →`.
- Keep image ratios consistent with `object-fit: cover`.
- Put Open, Edit, Image, Pin, Archive, and Delete in a three-dot menu.
- Full post view includes title, date, image, article, Edit, and Back to blog.
- New post fields: Title, Date, Article, Image, Category, Tags, Save draft, Publish, Cancel.
- Optional filter bar: All posts, Personal, Faith, Technology, Family, Other.

## 12. Brain Dump

- Keep one large plain writing area with placeholder `Write whatever is on your mind…`.
- No required title, category, mood, or formatting.
- Auto-save while typing and show Saving, Draft saved, or Saved just now.
- Use one main action: Save brain dump.
- Put Clear draft in a small menu and confirm before clearing unsaved text.
- Saved entries section is called Saved brain dumps.
- Add collapsed Pinned brain dumps and Archived brain dumps sections.
- Each saved item shows preview, saved date/time, and pin status.
- Menu actions: Open, Edit, Pin, Convert to Note, Convert to Task, Archive, Delete.

## 13. Habit Tracker

- Compact selector: All habits | Building | Breaking.
- One primary action: `+ Add habit`.
- Use compact habit rows/cards showing name, category, type, current streak, best streak, today’s status, and savings/progress.
- Show the week as one compact dated check-in row.
- Check in today changes to Completed today or Undo check-in.
- Breaking habits show start date, streak, elapsed time, savings, rate, and optional notes.
- Replace six oversized elapsed-time boxes with one compact summary.
- Use three-dot menus for Open, Edit, Check in, Pause, Restart, Archive, Delete.
- Add habit fields conditionally based on Build or Break goal.
- Categories: Health, Faith, Personal, Home, Work, Finance, Other.
- Archived habits are collapsed and excluded from the main list.
- Home shows a small streak preview only.

## 14. Chores

- Connected selector: Daily | Weekly | Monthly | Yearly.
- One input: Add a chore… and one small + Add chore button; Enter also adds.
- Optional settings: frequency, category, due date, assigned person.
- Show count and thin progress bar, such as `0 of 8 completed`.
- Use compact rows with checkbox and three-dot menu.
- Completed rows show checkmark, strikethrough, and softer text.
- Menu: Edit, frequency, category, assignment, skip, move schedule, Archive, Delete.
- Add/edit fields: Name, Frequency, Category, Assigned person, Due date, Notes.
- Recurring chores create their next occurrence when completed.
- Archived chores are collapsed and excluded from regular lists.
- Home shows due and completed counts only.

## 15. Recipes

- Heading: Recipes with description and one `+ Add recipe` button.
- Put Save recipe link, Browse free recipes, and Meal Planner in a Tools menu.
- Search recipes by name or ingredient.
- Filters: All recipes, Favorites, Quick meals, Saved links, plus optional categories.
- Consistent recipe cards with image, name, category, prep/cook time, and View recipe →.
- Add a real image or a theme-matching food placeholder; do not reuse the same plate image.
- Recipe data: Name, Image, Description, Ingredients, Instructions, Prep, Cook, Servings, Calories, Category, Tags, Source, Favorite, Notes.
- Full view includes Add ingredients to Grocery List and Add to Meal Planner.
- Three-dot menu: Open, Edit, Grocery List, Meal Planner, Favorite, Archive, Delete.
- Do not duplicate grocery ingredients already on the list.
- Archived recipes are collapsed.

## 16. Exercise

Organize into collapsible sections:

1. Weight check-in
2. My routine
3. Workout library

Weight check-in:

- One compact row: Current weight, Goal weight, Date, Save.
- Show current, goal, change since first check-in, remaining difference, and progress bar/chart.
- Weight history is collapsed and allows edit/delete.
- Use neutral wording such as Weight goal or Progress toward goal.

Routine/library:

- Connected selector: My routine | Workout library.
- Search workouts and exercises.
- Categories: All, Yoga, Stretching, Legs, Arms and shoulders, Core and stomach, Cardio, Back, Glutes and thighs, Balance, Full body.
- Consistent exercise cards with name, image/video, category, instructions, duration/reps, and Add to routine.
- Keep image sizes consistent.
- Put less-used actions in a three-dot menu.
- Optional compact tracking: completed today, minutes this week, recent activity.
- Put Build up at your pace inside collapsed Exercise guidance.

## 17. Meal Planner

- Header shows Meal Planner and current week.
- Compact navigation: Previous week | This week | Next week.
- Put Recipe Box and Calorie Log in a Tools menu.
- Keep seven-day grid on desktop and allow horizontal scrolling on small screens.
- Highlight today once, without competing date treatments.
- Meal rows: Breakfast, Morning snack, Lunch, Afternoon snack, Dinner, optional Evening snack and Drinks.
- Empty cells use small `+ Add meal`; filled cells show meal name and calories with a menu.
- Add meal options: Recipe Box, manual food/drink, copy another day, Grocery List, calories, servings.
- Add clear back links from Recipe Box and Calorie Log to Meal Planner while preserving the selected week.
- Weekly summary: planned calories, average per day, meals planned.
- Three-dot menu: Edit, move day, move meal, servings, Grocery List, calories, Copy, Remove.

## 18. Collections

Collections must be user-created. Do not automatically create, open, or preload Pokémon.

- Main page is a collection dashboard with `+ New collection`.
- Empty state: Create your first collection to get started.
- New collection fields: Name, Description, Image/icon, Type, Custom fields, Display style.
- Field types: Text, Number, Currency, Date, Dropdown, Checkbox, Rating, Photo, URL, Notes.
- Users can add, rename, reorder, and remove fields later.
- Optional templates may include Pokémon, Books, Perfume, Beauty, Shoes, Decorations, Coins, Recipes, or Keepsakes.
- Pokémon fields appear only when the user creates a Pokémon collection or selects that optional template.
- Collection views may be Photo grid, List, Table, or Gallery.
- Filters and totals must be based on the current collection’s fields.
- Item actions belong in a three-dot menu.
- Archive and delete collections/items with confirmation.

## 19. Little Joys

- Compact header: Little Joys with a short encouraging description.
- Primary action: Surprise me.
- Secondary actions: Favorites and Add an idea.
- Featured idea appears in a calm compact card with Choose this idea.
- Browse ideas is collapsed by default or remembers its state.
- Filters: Search, Quick break, 10 minutes, 30 minutes, Longer, category, Favorites.
- Categories: Beauty and style, Cozy, Creative, Music, Outside, Relaxation, Social, Spiritual, Personal.
- Use consistent compact idea cards with one visible Choose action.
- Put Favorite, Edit, Duplicate, Delete, and other actions in a menu.
- Add idea fields: Title, Description, Category, Time length, Image/icon.
- Add collapsed Favorites and Activity history sections.
- Built-in ideas should be protected or hidden rather than permanently deleted.

## 20. Packing Checklists

- Page heading: Packing Checklists with `+ New checklist`.
- Active checklists show trip name and progress.
- Archived checklists are collapsed and counted.
- New checklist fields: Trip name, optional trip type/template, start date, end date.
- Templates are optional and editable; allow blank lists and saved custom templates.
- Open checklist shows progress bar and collapsible categories: Essentials, Clothing, Toiletries, Medications, Electronics, Travel documents, Food and drinks, Custom.
- Rows use checkboxes and three-dot menus; completed items are checked, struck through, and softened.
- Add item inline with Enter support and remembered category.
- Checklist menu: Rename, trip details, Add item, Clear completed, Duplicate, Archive, Delete.
- When all items are checked, show Fully packed and offer Archive.
- Home shows only a compact checklist preview.

## 21. Focus Timer / Pomodoro

- Use a focused, centered layout instead of a wide empty yellow panel.
- Modes: Focus, Short break, Long break, Custom.
- Show a large timer with a circular progress ring.
- Controls should change based on state: Start, Pause, Resume, Reset, Skip.
- Let the user select a task, project, chore, Brain Dump item, or quick task.
- Show today’s sessions, minutes focused, and streak.
- Support automatic cycles, including long break after four focus sessions.
- Timer settings: focus, short break, long break, custom duration, sounds, browser notification, flash, vibration, auto-start, continue across pages, mini timer.
- Keep a persistent mini timer visible while navigating elsewhere.
- Session history shows date, duration, task, and session type.
- Keep settings collapsed by default.

## 22. Required delivery format

- Provide only replacement updated files when implementing changes.
- Preserve existing data and existing themes.
- Do not remove user-created content.
- Test theme changes, responsive layouts, navigation, empty states, menus, confirmations, and undo behavior before delivering replacement files.
