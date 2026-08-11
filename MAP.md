# Code Map — index.html

Update this map whenever a function is added, renamed, or moved — as part of the existing phase verification checklist.

Entries are anchored to function/variable names (not line numbers, which go stale). Grouped by the app's tabs, with a shared section for cross-tab utilities.

Module-level UI state variables (`crewDB`, `editingCrewId`, `collapsedDepts`, filter-open flags, …) are deliberately not listed — this map covers functions and the canonical constants.

See also the **Section codes** table at the bottom: short handles (T-1, T-2.2, D-1, …) for the tabs/sections/tools themselves, for naming a screen without describing it in prose.

## Canonical lookups — use these, don't re-derive

Every screen needs the same handful of records. These are the single place that knows how to find each; reaching past them with an inline `.find`/`.filter`/`.sort` is what lets sort order and fallbacks drift between screens (and is how the tech-specs export bug went unnoticed).

- `projById()` / `currentProject()` — a project by id / the currently open one — [Shared/utility functions]
- `crewById()` / `dayById()` / `locById()` — a crew member / shoot day / location by id, `null` if missing — [Shared/utility functions]
- `currentDay()` — the shoot day currently being edited or previewed — [Shared/utility functions]
- `projectDays()` — a project's shoot days, always in day order (defaults to the open project) — [Shared/utility functions]
- `projectEntries()` / `entryById()` / `entriesForCrew()` / `entryView()` / `projectEntryViews()` — **Phase BF, the crew-entry layer.** A project's roster is `p.crewEntries` (entries, not people); `entryView()` returns the crew record with that entry's id/role/department layered on, which is why almost every existing sort/group/filter/identity helper kept working unchanged — [Crew, Shared/utility functions]
- `projectCrew()` — the DISTINCT PEOPLE on a project, deduplicated by `crewId`, in roster order. ⚠️ Since Phase BF this is no longer "the roster" — the roster is `projectEntries()`. ⚠️ Since **Phase BK** the Crew tab does NOT use it at all — every sub-tab builds person BLOCKS off `projectEntryViews()` instead (`buildPersonBlocks()`), because a block needs the person's entries, not just the person. Its two remaining callers are `buildTransportSummary()` and `cinematographyCrew()`. Use this one for any "how many humans" question; its `.id` is a CREW id, and role/department come from that person's first entry — [Shared/utility functions]
- `entryOnDay()` / `entryDayCount()` / `crewOnDay()` / `crewDayCount()` — days on site, at the two grains. ⚠️ The `crew*` pair folds a person's entries together and is what every PERSON-level count must use; the `entry*` pair is per row on Roles/Days on site. Mixing them up is the Phase AO double-count — [Crew, Shared/utility functions]
- `projectOf()` — the project a given shoot day belongs to — [Shared/utility functions]
- `selectedDayLocation()` — the location currently picked in the Shoot Day form's primary-location select — [Shoot Days]
- `refreshCrewDatabase()` — full re-render of the Crew Database screen (its filter/sort/admin controls live outside `#crewList`, so `renderCrewList()` alone isn't enough) — [Crew]

## Overview

- `renderProjectOverview()` — renders the project overview tab body: Project details (with the Quick add button row at the bottom of that same card), then Tasks, then Danger zone (Phase Overview Reorder — Tasks/AI Scan used to render above Project details; Phase Quick Add inserted quick-add controls after details; **Phase Quick Add follow-up folded AI Scan into that same row as a fourth button and removed the Quick add divider**, so AI Scan is no longer its own section at all). Project details has no manual Save button — autosave (`body.oninput` → `scheduleAutosave('overview', …)` → `saveProjectOverview(true)`) is the only save path; the `#ovStatus` "Saved" flash span stays — [Overview]
- `saveProjectOverview(silent)` — validates and persists overview fields (client/title/start date required), updates sidebar/header on save. Only ever called from the autosave path now (`silent=true`) — the non-silent `alert()` branch is unreachable dead code kept for signature safety, not wired to any button — [Overview]
- `quickAddSectionHTML()` (Phase Quick Add; restyled in the follow-up below) — **four buttons, one row, no header or collapse of its own** — Shoot date / Location / Crew / AI Chat — rendered directly at the bottom of the Project details card's own `.section`, inside its toolbar. One control open at a time (`quickAddMode`, now `null | 'day' | 'loc' | 'crew' | 'ai'`), each button opening the minimum UI for that job below the row. **Add-only and deliberately shallow** for the first three — a shortcut into data that has full editing on its own tab, not a second place to manage it. AI Chat is the odd one out: a full chat interface, not a small form, but it opens into the same slot and is styled identically to the other three — [Overview]
  - ⚠️ **Originally this was a collapsible "Quick add" box** (its own `.section`, `sd-block-head`/`dept-caret` toggle, `quickAddOpen` state) sitting between Project details and Tasks, with AI Scan as a *separate* collapsible box below Tasks. Both the divider and the separate AI Scan section were removed on request — the four controls now read as one toolbar belonging to Project details, not a feature of their own. `quickAddOpen`/`toggleQuickAddSection()`/`aiScanOpen`/`toggleAiScanBlock()` no longer exist; do not look for them.
- `setQuickAddMode()` / `resetQuickAdd()` — mode switching and the return-to-rest reset. Clicking the already-open control closes it, so the row never needs a Cancel button. Switching **into** `'ai'` calls `checkAiScanConfigured()` — the same call the old standalone toggle made on open. `resetQuickAdd()` is also called from `addLocToProject()`, `addCrewToProject()` and `saveLocation()`'s project branch, so the row settles back to four plain buttons whichever shared function the user actually finished through. `resetQuickAdd()` never touches AI Scan's own state (`aiScanMessages` etc.) — switching away from and back to AI Chat resumes the same conversation, exactly like the old standalone box did — [Overview, Crew, Locations]
- **Quick add reuses, it does not reimplement** (the point of the phase — a divergent second implementation of any of these three would be a bug):
  - shoot day → `addShootDayRecord()` (via `quickAddShootDay()`) — the shared commit path AI Scan's `propose_shoot_date` accept also reaches, through its `addShootDayFromProposal()` wrapper; both start from `makeShootDayRecord()`
  - location, existing → `addLocToProject()`; location, new → `startNewLocationFromSearch()` → `locFormHTML()`/`saveLocation()`. The location control reuses the **Locations tab's actual search widget** — `locAddQuery`, `onLocAddInput()`, `locAddResultsHTML()`, and the `#locAddSearch`/`#locAddResults`/`#locFormWrap` ids — rather than a lookalike. Safe because the two live on different tabs of the same body element and are never on screen together
  - crew, existing → `addCrewToProject()`; crew, new → `addNewCrewFromProposal()` (via `quickAddNewCrew()`) — both the same functions AI Scan's `propose_crew` accept path calls
  - AI Chat renders `aiScanChatBodyHTML()` — the actual AI Scan chat markup, unchanged; only its container moved
- `quickCrewQuery` / `onQuickCrewInput()` / `quickCrewResultsHTML()` / `startNewCrewFromSearch()` / `quickCrewNewOpen` — the crew search-then-create widget, a line-for-line mirror of `locAddResultsHTML()` and friends (search `crewDB` by name/role/department, "create new" as the last row of the same result list, prefilled with the typed text). Written as a mirror rather than a new idea because Crew has no unified add widget of its own yet — if one is ever built for the Crew tab, this is the thing to generalise, the same way Phase Q collapsed Locations' two add buttons into one — [Overview, Crew]
- **Quick add's shoot-day form is the Shoot Days tab's "Day details" + "Production brief" (T-5.2), same field set, labels, classes and widths** — Day # / of (total) / Shoot date / All-crew call in a `.ts-grid`, then the one-per-line brief textarea. Not a reduced invention: the only things left out are the parts that need a day to already exist (locations, schedule, crew, tech specs, parking, notes). `quickDayDraft`'s keys are the shoot-day **record** field names (`dayNum`/`dayTotal`/`date`/`allCrewCall`/`brief`) so there's no second vocabulary to keep in step. Day # and the total prefill to `projectDays().length + 1` when the control opens, so the count climbs on its own.
  - ⚠️ **The DOM ids are `quickDay*`, not the form's `sd*` ids** — the one place Quick add deliberately does NOT share with the tab it mirrors. `sdDayNum`/`sdDate`/`sdBrief` etc. are read by `saveShootDay()`/`fillShootDayForm()` against the *currently selected* day, and `sdDate` carries an `onchange="onDayChanged()"`; sharing those ids would mean sharing behaviour that makes no sense with no day selected. Contrast the location control, which shares ids freely because it shares the whole widget — [Overview, Shoot Days]
- `parseBriefLines()` — "textarea text → `brief` array" (trim, drop blanks), one definition shared by `saveShootDay()` and `quickAddShootDay()`. `brief` is stored as an array of lines everywhere and the call sheet outputs join it back up, so the two entry points must not drift on whitespace handling — [Shoot Days, Overview]
- `quickDayDraft` / `quickCrewDraft` / `quickCrewQuery` / `quickAddError` — draft state held **outside the DOM**, for exactly the reason `aiScanDraftText` documents: `renderProjectBody()` replaces the whole tab body on every state change and would otherwise wipe half-typed input. (Overview's `body.oninput` autosave is safe here — `saveProjectOverview()` updates the sidebar and header but never re-renders the body.) — [Overview]
- `tasksSectionOpen` / `toggleTasksSection()` (Phase Overview Reorder) — Tasks is collapsible, same `sd-block-head`/`dept-caret` idiom used elsewhere in the app (Tech blocks, the old standalone AI Scan box before it was folded into Quick add), collapsed by default. Header shows a combined count (open flags + open manual tasks) — [Overview]
- `renderTasksSection()` (Phase Tasks) — the merged Tasks box on Overview: auto-flags (formerly the standalone "Bare minimums" box — those three checks now live inside `buildTaskFlags()` alongside the three new rules below) plus manual persisted tasks, one `.section`, replacing the old separate box entirely — [Overview]
- `buildTaskFlags()` / `taskFlagPillsHTML()` — computes and renders the flag pills, shown directly under the Tasks header with no toggle/disclosure above them (Phase Overview Reorder removed the "Flags" show/hide control and its rule on/off checkboxes — see below). Dumb rule-checks against current `days`/`p` state, run fresh on every render — never persisted, never manually dismissed; a flag just stops appearing once its condition no longer holds. Six rules: the three original bare-minimums (missing dates/locations/crew, always on) plus three more gated on `appSettings.flagNoLocation`/`flagNoCrew`/`flagNoDayRate` (default/permanently on now — see below) — a shoot day with no location (one pill per day, via `shootDayLabel()`), a shoot day with no crew (one pill per day — "no crew" here means nobody has a position that day, the same signal `buildTransportSummary()`/Days-on-site use, NOT the project-wide "no crew assigned" bare-minimum), and crew with no day rate set (guarded by `typeof resolveCrewRate==='function'` so it degrades to a no-op rather than erroring if Budget isn't present; grouped into ONE pill with a count rather than one-per-person — unlike the two day-based rules, a project can carry 60+ crew, and one pill per no-rate person would flood the box; clicking jumps to Budget's Per Person view where every no-rate person is already listed together) — [Overview, Budget]
  - REMOVED in Phase Overview Reorder (do not look for these): `taskFlagsSettingsOpen`, `toggleTaskFlagsSettings()`, `taskFlagsSettingsHTML()`, `toggleTaskFlagRule()` — the "Flags" disclosure toggle and its three rule on/off checkboxes. `appSettings.flagNoLocation`/`flagNoCrew`/`flagNoDayRate` still exist and still gate `buildTaskFlags()` (kept rather than inlined, in case a UI to toggle them returns) but default `true` with no remaining UI path to turn them off — [Overview]
- `flagNoLocation` / `flagNoCrew` / `flagNoDayRate` — the three rule toggles, stored in `appSettings` (`db:settings`) alongside the header font/brand colour — site-wide, not per-project, so silencing a noisy rule sticks everywhere — [Overview, Shared/utility functions]
- `addProjectTask()` / `toggleProjectTask()` / `deleteProjectTask()` / `taskListItemHTML()` / `tasksListHTML()` — manual tasks, persisted as `project.tasks[]` (`{id, title, note, completed, createdAt}`), same per-project-array pattern as everything else on a project record. Rendered with the app's standard `.list-card` (matches the Locations database list). Completed tasks hide by default behind a `showCompletedTasks` count toggle rather than sitting struck-through in the main list — a reasonable default, not a hard requirement. `deleteProjectTask()`'s trash-icon button wasn't explicitly requested in the brief but was added to match every other list in the app (crew, locations) having one — a task list with no way to ever remove an item would only accumulate — [Overview]
- `aiScanChatBodyHTML()` (Phase AI Scan; **moved into the Quick add row in the Phase Quick Add follow-up, no longer a section of its own**) — a real chat interface (not a one-shot extractor) backed by the `ai-scan` Supabase Edge Function, which proxies the Anthropic API so the API key never reaches the client. Rendered as the panel body when `quickAddMode==='ai'` (the "+ AI Chat" button, same row and style as Shoot date/Location/Crew) — everything about the chat itself (state, send lifecycle, proposal cards) is unchanged from when this was `aiScanSectionHTML()`'s own `.section`; only the header/collapse/wrapper around it went away. Chat history (`aiScanMessages`) is frontend-memory only, reset whenever the open project changes (`aiScanProjectId`) — **not persisted across page reloads**, deliberately, per the build brief; flag back if that turns out to be an unwanted limitation once used for real — [Overview]
- `AI_SCAN_ENDPOINT` / `AI_SCAN_ANON_KEY` — the Edge Function URL and the same publishable/anon key the `sb` client already uses (not a new exposure, just reused as the function's bearer token; `verify_jwt:true` on the function requires *some* valid Supabase token, and a single-user no-auth app has no other one to send) — [Overview]
- `sendAiScanMessage()` — the whole turn lifecycle: reads the typed text + any attached files, prepends `pendingAiToolResultBlocks()` (**required** by the Anthropic API — every `tool_use` block in the assistant's last turn needs a matching `tool_result` before the conversation can continue, reflecting whatever the user has/hasn't actioned on each card), POSTs the full history + `crewSummary`/`locationSummary` to the Edge Function, and on success appends both the user and assistant turns to `aiScanMessages` and registers any new `tool_use` blocks in `aiScanProposals`. On failure, leaves the typed text/attachments untouched so Send retries cleanly — [Overview]
- `aiScanDraftText` — **exists because of a bug caught in testing**: this app's `renderProjectBody()` fully replaces `body.innerHTML` on every state change (its pattern everywhere), which silently wipes any input whose value isn't sourced from state — including `sendAiScanMessage()`'s own busy-state render, on literally every send. The chat text input's `value=` is bound to this variable (kept in sync via `oninput`) specifically so a failed send doesn't lose what was typed. Nothing else in the app has this problem as visibly, since most other inputs happen to redisplay a last-*saved* value after a stray re-render rather than going blank — [Overview]
- `pendingAiToolResultBlocks()` — builds those required `tool_result` blocks from `aiScanProposals` state: "added as new" / "matches existing X, assigned" / "declined, don't re-propose" / "not reviewed yet" (the fallback, so an ignored card doesn't break the next turn) — [Overview]
- `aiScanProposals` / `acceptAiProposal()` / `discardAiProposal()` / `proposalCardHTML()` — the proposal cards. Ticking commits the **current field values** (editable inline, no separate edit mode) via matched-record functions when a `match_id` checkbox is ticked, or new-record functions otherwise; discarding changes nothing. Cards stay visible after resolving (per the brief), fields disabled, with a status line — [Overview]
- `addShootDayRecord(fields)` — **the one commit path for "create a shoot day from plain field values"**, shared by AI Scan's accept and Overview Quick add. Starts from the real `makeShootDayRecord()` (so a day made either way is indistinguishable from one made with + New day — starter schedule, empty positions, catering object) and overlays only the non-empty fields the caller has, so a caller that knows nothing about e.g. `allCrewCall` keeps the record default rather than blanking it — [Overview, Shoot Days]
- `addShootDayFromProposal()` / `addNewLocationFromProposal()` / `addNewCrewFromProposal()` — the "new record" commit paths. `addShootDayFromProposal()` is now a thin wrapper over `addShootDayRecord()` (AI Scan proposes a single-line label, which is a one-line production brief); kept as a named wrapper so the accept path reads the same as its two siblings. The other two **can't** call `saveCrew()`/`saveLocation()` directly — those read ~25 fields via `val('nc...')`/`val('nl...')` off their own database forms, not parameters — so these mirror their record shape exactly (every field `saveCrew()`'s `rec` object sets) rather than faking a whole form. Matched proposals instead call the real existing `addCrewToProject(id)` / `addLocToProject(id)`. **Despite the `…FromProposal` names, these are no longer AI-only** — Phase Quick Add made Overview's Quick add box a second caller of `addShootDayFromProposal()` and `addNewCrewFromProposal()`. Kept the names rather than renaming, since the AI Scan accept path is still the primary caller and a rename would have churned that code for nothing; treat them as "commit a record from plain field values" — [Overview, Crew, Locations]
  - `addCrewToProject()` gained an optional `id` parameter for this (`id = id || val('addCrewPick')`) — its own call site, unchanged, still works with no argument — [Crew]
- `buildCrewSummary()` / `buildLocationSummary()` — compact `{id, name, role}`/`{id, name}` projections of the FULL `crewDB`/`locationsDB` (not just this project's roster) sent with every request, so Claude can propose a `match_id` against anyone already in either database — [Overview]
- `handleAiScanFileInput()` — the attach-files handler. Since Phase AS (**G17**) it collects **every** failure into an array and joins them one per line, rather than assigning `aiScanError` per file and keeping only the last; `.ai-error` carries `white-space:pre-line` for that. Picking four files with two oversize used to report one of them while silently dropping the other — [Overview]
- `fileToContentBlock()` / `fileToBase64()` / `fileToText()` — turn an attached file into an Anthropic content block client-side. PDF → base64 `document` block (Claude reads PDFs natively, no extraction needed). `.docx` → plain text via `mammoth.js` (the API has no native docx support). `.txt`/anything else → read as plain text. 15MB cap per file — [Overview]
- `stripAiScanDisplayFields()` — strips the display-only `_filename` property (stashed on file blocks purely so `aiScanMessageHTML()` can show an attachment's name) before any message array reaches the actual API request — [Overview]
- `renderWelcome()` — renders the landing screen shown when no project is open. Above the existing "Get started" section (Phase Y) sits a two-button toolbar: "Recent" (`goRecentProject()`, disabled when there's no project to jump to, labelled with that project's name) and "+ New" (`goNewProject()`, the same entry point the sidebar's "+ New project" and this screen's own "+ New project" button already use — no second code path) — [Overview]
- `mostRecentProject()` / `goRecentProject()` (Phase Y) — `mostRecentProject()` sorts `projectsDB` by `lastOpenedAt` (falls back to `0`, so a never-opened project sorts last, not first) and returns the top one, or `null`; `goRecentProject()` opens it via the normal `openProject()`. `lastOpenedAt` is a plain epoch-ms timestamp, stamped by `openProject()` itself on every open — no separate "mark as viewed" call needed — [Overview]
- ⚠️ **REMOVED in Phase AS (G12): `resetAndReseed()` and the Welcome screen's whole "Sample data" section.** It wiped all four collections and reseeded over the top, one `confirm()` from the landing screen, with no undo — and R18's merge couldn't help, since it was a write of empty-then-seed rather than a delete. Deleted rather than guarded, per the user. **The auto-seed path is untouched**: `seedSampleData()` still has its independent caller in `initApp()` (`if(!crewDB.length && !locationsDB.length && !projectsDB.length)`), which is the "loads automatically the first time the app opens with nothing saved" behaviour. Do not look for `resetAndReseed()` — [Overview]
- `seedSampleData()` — populates the databases with sample crew/locations/projects/days for demo purposes — [Overview]
- `renderNewProject()` — renders the "create new project" form — [Overview]
- `previewProjCode()` — live-previews the generated project code while filling in the new-project form — [Overview]
- `createProject()` — validates and saves a new project record, then opens it — [Overview]
- `renderProject()` — top-level render for an open project (header + tab body) — [Overview]
- `renderProjectBody()` — dispatches to the correct tab renderer based on `currentProjectTab` — [Overview]
- `deleteProject()` — deletes a project and its shoot days after confirmation — [Overview]

## Crew

- `renderProjectCrew()` — renders the project Crew tab, including the grid-view switcher (Roles/Pre-production/Days on site/Hotel/Travel/Catering), the shared header row and the bulk-action bar — [Crew]
  - `crewGridView` switch renders one of: roles grid, pre-production grid (Phase BJ), days-on-site grid, hotel grid, travel grid, catering grid. The `viewLabels` object's key order (`{roles, preprod, days, hotel, travel, catering}`) IS the on-screen tab order — Pre-production's key sits second, between `roles` and `days`, because `Object.keys()` iteration order is what the switcher renders
  - Phase V: Select all/Filter/Expand-all/Summary were unified into one `.crew-header-row` (Select all + Filter left-aligned, Expand/Collapse-all toggle + Summary right-aligned, one shared font) built once in this function and reused identically across all six view-switcher tabs (five at Phase V; Pre-production joined at Phase BJ). The Filter *toggle* lives in this row; the Filter *panel* (`projectCrewFilterPanelHTML()`) still renders as its own block below the row, not inside it, so opening it can't distort the row's alignment
  - ⚠️ **REMOVED in Phase BK: `entryLevel`** (was `crewGridView==='roles' || 'days' || 'preprod'`, picking `projectEntryViews()` vs. the deduplicated `projectCrew()` and driving how "Select all" expanded its ids). Do not look for it. **Every view is built the same way now**: filter at ENTRY grain (`projectEntryViews(p).filter(personMatchesProjectFilter)` — the grain the roster actually has, and the grain every filter criterion is really about), then group the survivors into ONE BLOCK PER PERSON via `buildPersonBlocks()`. Hotel/Travel/Catering stopped needing the deduplicated list because the block IS the deduplication and it carries the person's entries with it instead of throwing them away. "Select all" is simply every visible block's entries — [Crew]
  - **Phase BK — one card per person, on all six sub-tabs.** Name line carries the PERSON-level facts, role rows carry the ENTRY-level ones, split exactly as the data is keyed (see the six row renderers below). Each row inside a block is still the tab's own grid class with explicit `grid-column` placement, so the columns still read straight down the page. ⚠️ **No per-person total, anywhere** — no rate × days, no roll-up, no aggregation; that slot is deliberately empty, same standing rule as Pre-production's — [Crew]
  - **Phase BL — the stack collapses.** A block with 2+ visible entries shows ONE REAL ENTRY (the fronted one, see `frontedEntryOfBlock()`) plus a muted "+N" and a chevron. One visible entry — a genuine single-role person, OR a multi-role person a filter has reduced to one — gets no chevron at all — [Crew]
- `setCrewGridView()` — switches which crew matrix (roles/preprod/days/hotel/travel/catering) is shown and re-renders. ⚠️ **Also calls `resetFrontedEntryCache()` (Phase BL)** — the tab switch is one of only two moments the fronted entry may be recomputed (the other is a fresh load) — [Crew]
- `toggleAllProjectDeptsCollapsed()` (Phase V) — the single Expand-all/Collapse-all toggle used in the crew header row: flips based on current state (expand if every visible group is collapsed, otherwise collapse all) rather than offering two separate always-on links; delegates to `setAllProjectDeptsCollapsed()` — [Crew]
- `projectCrewFilter` / `projectCrewFilterOpen` — the ONE shared filter/sort/group-by state for "Crew on this project", global so it survives `setCrewGridView()` tab switches. Now also holds `days` (Set of shoot day ids) and `daysMode` ('or'/'and') — the multiselect Days filter (Phase T item 3) — [Crew]
- `matchesCrewFilterState()` — shared match rules (depts, lead company, roles, exclude-Talent, exclude-other-companies) used by both this screen's filter and the Crew database's. Does NOT include the Days filter — the Crew database screen has no project/shoot-day context, so that's a separate check (`personMatchesProjectDayFilter`) only applied on the project screen. Lead company match (Phase AC) treats the sentinel `'__blank__'` as "no lead company set" (`!c.coProductionCompany`), distinct from `''` which means "no company filter active, show all" — the project Filter panel's Lead Company `<select>` only offers a "Blank" option when at least one assigned crew member actually has no lead company (`hasBlankCompany`) — [Crew, Shared/utility functions]
- `personMatchesProjectDayFilter()` — the Days filter (Phase T item 3): matches if the person has a position on any (`daysMode:'or'`) or every (`daysMode:'and'`) of the selected shoot days. An OR/AND `<select>` appears next to the day checkboxes once 2+ days are picked — [Crew]
- `personMatchesProjectFilter()` / `personHasHotel()` / `sortProjectCrewGroup()` / `buildProjectCrewGroups()` — (Phase BF: all four now take either an entry view or a person view and branch on `c.crewId`; `personHasHotel()` and the `travel` grouper read `personIdOf(c)` because hotel and travel are person-level) — filter (`matchesCrewFilterState` + `personMatchesProjectDayFilter`), "has hotel" test, in-group sort and grouping for the assigned crew list. `personMatchesProjectFilter()` flips its own result when `projectCrewFilter.inverse` is set (Phase AE "Inverse" checkbox) — everyone who does NOT match the active criteria, rather than everyone who does; the day filter is included in what gets inverted — [Crew]
- `crewSeniorityBand()` (Phase Sort/Group A) — bands a crew member into "Department leads" / "Mid-level" / "Support / entry level" off the real per-department `roleSeniorityRank(dept, role)` (rank 0 = a department's first/most-senior listed role in `ROLES_BY_DEPT`, so low ranks band together sensibly across departments even though the underlying numbers aren't globally comparable) — not a separate flat seniority list. Used by both the Seniority Sort and Seniority Group by — [Crew]
- `sortProjectCrewGroup(list, p, days)` (Phase Sort/Group A) — switches on `projectCrewFilter.sort`: `dept` (default, `sortHoDFirst`) / `name` / `role` / `seniority` (via `crewSeniorityBand`'s underlying rank) / `company` (`c.coProductionCompany`) / `daysCount` (most shoot days on site first, via `d.positions`) / `added` (index in `p.crewIds` — the same add-order signal `projectCrew()` relies on elsewhere). Takes `p`/`days` now (not list-only) since `daysCount`/`added` need project context — only ever called from `buildProjectCrewGroups()`. ⚠️ **Phase BK — the list is PERSON BLOCKS now** (`c.isPersonBlock`), so a person is ranked by their HIGHEST-SENIORITY role (the block wears that entry's role/department), via the EXISTING `roleSeniorityRank()` — no second seniority concept. Two branches had to become person-grain with it: `daysCount` uses `crewDayCount()` (the deduplicated union), never `entryDayCount()`, which would double a two-role person working both roles on one day (the Phase AO grain trap); `added` ranks a block on its EARLIEST entry, because a person joined the project when their first entry did, not when their most senior one did — [Crew]
- `buildProjectCrewGroups(list, p, days)` (Phase Sort/Group A) — switches on `projectCrewFilter.groupBy`, twelve options: `dept` (default) / `deptCompany` (flat composite bucket, e.g. "Cinematography — Creative Dynamic", not a true nested group — avoided touching every `crewGridView` row renderer for a two-level header) / `company` / `role` / `subDept` / `personType` (Crew/Talent/Client, derived off `deptBucketKey`) / `hotel` (existing, via `personHasHotel`) / `travel` (`p.travelMethods[c.id]`) / `vat` (`c.vatRegistered`, strictly `''`/`'Yes'`/`'No'` — same field Budget's VAT calc reads) / `catering` (`c.dietaryGeneral`) / `seniority` (via `crewSeniorityBand`) / `daysOnSite` (**multi-bucket** — a person on 3 shoot days appears in 3 groups; ⚠️ **Phase BK** it tests `crewOnDay()` for a person block, so a two-role person lands in a day's bucket ONCE, not once per entry) / `none` (single ungrouped bucket, still rendered with a header — "All crew" — no `crewGridView` branch currently supports a header-less group). Every non-`dept`/`hotel` bucket set sorts blank/"Not set" values last rather than alphabetically first. ⚠️ **Phase BK — takes person BLOCKS.** Every key function (`c.role`, `c.department`, `c.subDepartment`, `crewSeniorityBand`) reads the block's own role/department, which is its HIGHEST-SENIORITY entry's — that is what "group a person by their top role" means here, and it needed no change to those key functions because the block is entry-view-shaped — [Crew]
- `toggleProjectCrewFilterPanel()` / `toggleProjectFilterDept()` / `toggleProjectFilterRole()` / `toggleProjectFilterDay()` / `setProjectFilterField()` / `toggleProjectFilterFlag()` / `clearProjectCrewFilter()` / `projectCrewActiveFilterCount()` / `projectCrewFilterPanelHTML()` — collapsible filter panel state and rendering, including the Days filter-chips + OR/AND select (Phase T item 3), the Roles filter-chips sub-section (Phase AB — its own collapse toggle, `projectCrewFilterRolesOpen`/`toggleProjectFilterRolesSection()`, independent of the panel's own open/closed state) and the Inverse checkbox (Phase AE, `toggleProjectFilterFlag('inverse', …)` — no new setter needed, the existing generic flag setter covers it). Sort/Group by (Phase Sort/Group A) each carry a broad curated option list rather than the earlier two/one-option shell — see `sortProjectCrewGroup()`/`buildProjectCrewGroups()` above for what each value does. The panel's trailing row (the three exclusion checkboxes + hint + "Clear filters") is the shared `filterPanelFootHTML()` — see **The filter-panel foot** — and `projectCrewActiveFilterCount()` is what gates that row's "Clear filters" link; note it counts filters only, so choosing a Sort or Group by never makes the panel look filtered — [Crew]
- `projectCrewSelected` / `toggleSelectAllFilteredCrew()` / `clearCrewSelection()` / `bulkRemoveSelectedFromProject()` / `bulkActionBarHTML()` — bulk-select (checkbox swapped in for the view/eye icon via `crewIdentityHTML`'s `selectCbHTML` option) and the bulk "Remove from project" action. ⚠️ **REMOVED in Phase BK: `toggleCrewSelected(entryId, checked)`**, the single-ENTRY select toggle, and `crewIdentityHTML`'s `opts.bulkSelect` branch that built its checkbox. Do not look for either. Every Crew list is one person BLOCK per person now, so there is no single-entry checkbox left in the UI — `toggleCrewPersonSelected()` (handed the block's VISIBLE entry ids) and `toggleSelectAllFilteredCrew()` are the only two ways into `projectCrewSelected`. `toggleSelectAllFilteredCrew()` is the "Select all" checkbox next to Expand/Collapse all (Phase T item 2) — it's always handed exactly the currently-filtered/visible crew ids, never the full project roster, so it only ever selects what the active filter is showing — [Crew]
  - ⚠️ **`bulkRemoveSelectedFromProject()` clears BOTH `p.crewIds` and every shoot day's `positions`** — the same two places `removeCrewFromProject()` has always cleared. It used to filter `crewIds` only, which left a bulk-removed person holding their position on the days they'd been assigned to, so they stayed on the call sheet after being taken off the project. Its undo snapshot covers `db:shootdays` as well as `db:projects` for the same reason. This fix originally arrived inside Phase AY-a and was **re-applied on its own** when Budget View V1 was reverted — it is the one thing from that workstream that was kept. Do not "simplify" the second filter away — [Crew, Shoot Days]
- `selectedEditTargets(entryId)` / `selectedCrewTargets(crewId)` / `crewIsSelected()` / `toggleCrewPersonSelected(crewId, checked, entryIdsCSV)` / `personIdOf()` (Phase Bulk Edit; **split by Phase BF**; **`selectedEditTargets()` narrowed and `toggleCrewPersonSelected()` given its third argument by Phase BK/BL** — see the two ⚠️ bullets below) — **the selected-set bulk-edit pattern.** ⚠️ `projectCrewSelected` now always holds ENTRY ids (it is module-level and survives `setCrewGridView()`, so it has to mean one thing, and the entry is the finer grain). Entry-level fields fan out through `selectedEditTargets()`; the person-level ones (hotel, travel, catering, Show as) go through `selectedCrewTargets()`, which maps the selection back to DISTINCT people so a two-entry person is written once. The person-level views render their select-all/checkbox state through `crewIsSelected()`/`toggleCrewPersonSelected()`, which cover all of that person's entries together. The original description: Every per-field editor on the Crew tab calls this first: if `crewId` is part of the current multi-select AND at least one other person is also selected, it returns every selected id; otherwise just `[crewId]`. The caller then loops its own field-specific mutation over the returned ids and does ONE `saveDB`/render at the end — this is the reusable "which ids does this edit apply to" decision, not a per-field bulk-edit implementation. Wired into `toggleCrewOnDay()` (Days on site), `toggleHotelNight()` / `toggleHotelPre()` (Hotel), `toggleMeal()` (Catering), `setTravelMethod()` (Travel), `saveQuickShowAs()` (Roles — Show as) and `setActiveRole()` (Roles — role/department; only on a direct user pick, i.e. `skipSave` falsy — the internal `skipSave:true` calls used to reactivate a replacement role after `removeRoleFromCrew()` do NOT fan out, since that's a single-person consistency fixup, not a user edit). `bulkActionBarHTML()` shows a one-line hint ("Editing a field for one selected person applies it to all N") whenever 2+ are selected.
  - ⚠️ **Phase BL narrowed `selectedEditTargets()`.** It used to return EVERY selected entry id; it now returns the edited entry plus ONE entry per other selected PERSON — the one actually on screen, resolved by `bulkTargetEntryId()`. A collapsed multi-role person shows one line, and a bulk rate/day edit must never silently rewrite a role the user cannot see. Deliberately NARROWER than BK's person-level rule: the person-level fields (hotel, travel, catering, Show as) still go through `selectedCrewTargets()` and still cover the whole person, completely unchanged
  - ⚠️ **Phase BK gave `toggleCrewPersonSelected()` an optional `entryIdsCSV`.** The person-block checkbox passes that person's VISIBLE entry ids, so under a partial-match filter selecting a block selects exactly the rows the block is showing. Called with no third argument (every pre-BK caller) it still covers all of that person's entries Deliberately NOT wired into `toggleAllForPerson()` / `toggleAllMealForPerson()` (the per-person "All" button) — that's a different axis (all days for one person), mixing it with cross-person propagation would be confusing — [Crew]
- `bulkEditOpen` / `toggleBulkEdit()` / `bulkEditPanelHTML()` / `applyBulkLeadCompany()` — bulk-edit panel opened from the bulk-action bar; currently just Lead Company, the field Phase R moved off the main Roles row — [Crew]
- **The person block (Phase BK/BL)** — the shared machinery every one of the six Crew sub-tabs' renderers is built on. Display layer ONLY: nothing is written, no schema changes, `p.crewEntries`/`p.prepSchedule` untouched, and every consumer outside these six renderers still sees every entry — [Crew]
  - `buildPersonBlocks(entryViews)` / `topSeniorityEntry()` / `seniorityRankOf()` — groups already-filtered entry views by `crewId` into ONE BLOCK PER PERSON, in roster order. ⚠️ **A block is itself shaped like the entry view of the person's HIGHEST-SENIORITY role**, with the entry list hung off it as `.entries` and an `isPersonBlock` marker. That is `entryView()`'s own trick one level up: every existing sort, group and identity helper keeps reading `.id`/`.name`/`.role`/`.department` unchanged and simply ranks the person by their top role, via the EXISTING `roleSeniorityRank()`. `seniorityRankOf()` exists only to map `roleSeniorityRank()`'s `Infinity` to `MAX_SAFE_INTEGER`, because `Infinity-Infinity` is `NaN` and would break the comparator. `.crewId` is the person, so `personIdOf()` still returns the crew id; `.id` is the primary ENTRY's id, which is what the Edit pencil and `crewExpansionHTML()` use on every tab now (Hotel/Travel/Catering used to pass a crew id there) — [Crew]
  - `frontedEntryCache` / `frontedCacheMap()` / `resetFrontedEntryCache()` / `phaseDaysOfEntry()` / `pickFrontedEntry()` / `frontedEntryOfBlock()` (Phase BL) — **which single entry a collapsed stack shows.** Most days IN THE CURRENT PHASE (the active `crewGridView`), ties broken by `roleSeniorityRank()`, remaining ties by roster order (`Array#sort` is stable). `'preprod'` → `prepDaysOf(entryId)`; **everything else, Roles included → `entryDayCount()`**, the shoot-day-worked signal. ⚠️ Roles resolves there because the Roles grid is Name/Role/Rate/Show as and carries NO day dimension of its own — outside `p.prepSchedule` a shoot-day position is the only per-entry "days" that exists anywhere in the app. ⚠️ `entryDayCount()`, never `crewDayCount()`: fronting is a choice BETWEEN one person's entries, so the person-level union would rank them all equal — the Phase AO grain trap in the direction that silently does nothing — [Crew]
  - ⚠️ **RECOMPUTED ON LOAD AND TAB-SWITCH ONLY, NEVER ON AN EDIT.** Almost every field on these tabs re-renders the whole tab body on save (`setPrepDays()`, `saveEntryRate()`, `toggleCrewOnDay()`, `toggleMeal()`…), so computing this inline would re-front — and visibly re-order — the row the user just typed into. The choice is memoised per person for as long as (`crewGridView`, project) hold; `setCrewGridView()` drops the cache and a fresh load starts with none. A cached choice no longer among the person's VISIBLE entries is re-picked, which is what makes a partial-match filter front the right row — [Crew]
  - `visibleEntriesForPerson()` / `bulkTargetEntryId()` (Phase BL) — the entry a bulk edit may write to for a person who is NOT the row being edited. ⚠️ **Picked from the entries that are BOTH selected AND currently matching the filter, never from the cache alone.** Caught in testing: `projectCrewSelected` and the fronted cache both survive a filter change, so a person selected while unfiltered — or simply rendered earlier under a different filter — could otherwise have a bulk edit land on an entry no longer on screen, which is exactly what BL forbids. The cached choice is honoured only when it is still in that pool, so the on-screen row and the edit target are the same thing by construction — [Crew]
  - `personBlockSelectCbHTML()` / `personBlockDomId()` / `personBlockToggleHTML()` / `togglePersonBlockStack()` / `personBlockWrapHTML()` — the block's shared chrome. The checkbox is "bulk select means the person" expressed in the ONE currency `projectCrewSelected` has ever held (entry ids), routed through the existing `toggleCrewPersonSelected()` — no second selection model. `personBlockToggleHTML()` renders the chevron + muted "+N" and renders NOTHING when nothing is hidden. `personBlockWrapHTML()` takes the crew Edit/View expansion as a parameter rather than deriving it, so Pre-production can keep having no crew-record edit path of its own — [Crew]
  - ⚠️ **`togglePersonBlockStack()` is DOM-only, deliberately. BL keeps NO open/closed state anywhere** — not persisted, not on a record, not even a module-level Set — so every block opens closed on every render and this flips the rows in place rather than re-rendering. Same direct-DOM-instead-of-re-render idiom as `applyBlockState()`/`prepDragApply()`. **The one derived exception**: a Pre-production block renders open when `prepCalendarFor` points at a stacked-away entry, so an open calendar can't be hidden by its own re-render — derived from state that already exists, not new state. ⚠️ **Known consequence, flagged not worked around**: because nearly every field save re-renders the tab body, expanding a stack and editing a stacked-away entry collapses the block again. The edit saves and the fronting correctly does not move; the row just goes back behind the chevron. A module-level open-set would be exactly the "open/closed state anywhere" the brief rules out, so it was left — [Crew]
  - ⚠️ **REMOVED in Phase BM: `roleChipHTML()`** — BK's second, menu-less chip renderer for Days on site / Hotel / Travel / Catering. Do not look for it. Those four tabs now open the roles menu from their chip exactly as Roles and Pre-production always have, so **all six sub-tabs go through the ONE `roleBannerHTML()`** and there is no second chip renderer left to drift. See **Phase BM** — [Crew]
- `crewRolesRowHTML()` — ⚠️ **takes a PERSON BLOCK since Phase BK, not an entry view** (the name is kept: it is still the Roles tab's row renderer). Renders one card per person in the same tidy `.roles-grid` columns (Phase S/Z): CONTROLS (block checkbox + Edit pencil) | Name | Show as, PLUS — ⚠️ **since Phase BN** — the FRONTED entry's Role (`roleBannerHTML()`, Phase AZ — one chip, which since Phase BM IS the roles-menu trigger; no separate "+" marker) | Rate, all rendered onto the SAME `.roles-grid.pb-head` div as the name — genuinely one row, not two divs each independently `display:grid` (see **Phase BN**). A stacked-away entry (2+ roles) still gets its own `.roles-grid.pb-role-row.pb-role-extra` div below, sharing the `roleCellsHTML()` helper the head cells are built from. Explicit `grid-column` placement throughout, so the Rate column reads straight down the page whether it's on the head row or a stacked-away one. Department column was dropped in Phase Z — redundant with the group/section headers already showing it; the freed slot became Rate, the same per-project day-rate override as Budget's Per Person view (`resolveCrewRate()`/`saveCrewRateOverride()`/`p.crewRateOverrides[crewId]` — reads/writes that exact field, not a second one), edited inline with the same `.budget-rate-input` control. Since Phase AG the Rate cell also carries the Day Rate Save-to-database icon (`crewRateSaveIconHTML()`, `.rate-with-save` wrap; `.roles-grid`'s Rate column widened 92px→118px to fit it). Lead Company lives only in the Edit/pencil expansion (`crewFormHTML`) or the bulk-edit panel; phone is not shown on this row at all. "Add a saved role" itself is no longer *only* there — Phase BB put a second surface on this exact row, behind the "+" marker's roles menu (see **Phase BA — the roles menu** / **Phase BB**) — but that surface reuses the identical canonical picker (`newRolePickerOptionsHTML()`), not a second implementation. ⚠️ **Phase BO** widened Controls 56px→`var(--pb-controls-w)` and fixed Name/Role to `var(--pb-name-w)`/`var(--pb-role-w)` (were flexible) — same tokens now shared by `.crewgrid` and `.prep-grid`, so Controls/Name/Role start at the same x on all six Crew sub-tabs, not just this one — [Crew, Budget]
- `roleBannerHTML()` (Phase AZ; restyled Phase BE; marker wired Phase BA; **marker REMOVED and the chip made the trigger in Phase BM**) — ⚠️ **the ONE role-chip renderer for all six Crew sub-tabs.** Renders exactly one chip — the role this row is currently using (`c.role`) — and **the chip itself is the roles-menu trigger**: `onclick="event.stopPropagation();openRolesMenu(c.id)"`. `c.id` is the ENTRY id in every caller, so a collapsed block opens the menu for its fronted entry and an expanded one for that specific row's entry, with no extra lookup. Called from all six row renderers — `crewRolesRowHTML()` (T-2.1), `prepRowHTML()` (T-2.9.1), `crewAssignRowHTML()` (T-2.2 + T-2.3), `crewCateringBlockHTML()` (T-2.5), `crewTravelRowHTML()` (T-2.4) — so every tab gets the menu from this one function, with none of those five renderers carrying chip logic of its own.
  - ⚠️ **Phase BM deleted AZ's separate `.role-add-marker` "+" and the `hasOtherRoles` weighting that fed it, and did NOT replace the signal.** That weighting said "this person has other saved roles worth checking"; BK/BL's chevron + muted "+N" on the block already says it, one level up. Adding a weighting back onto the chip would be the same signal twice — don't. See **Phase BM**
  - ⚠️ **An entry with no role renders a clickable muted "—" chip, not nothing.** `entry.role` is `''` when the crew record had no role (`addCrewEntry()`), and with the marker gone the chip is the ONLY way into the menu — so the degenerate case has to stay clickable. This is `roleChipHTML()`'s old `—` placeholder kept rather than a new idea; the Roles/Pre-production rows rendered nothing there before BM. Phase R makes a role required for new crew, so this should not occur in practice
  - Replaces a direct call to `rolesTagListHTML()` in this one spot — that function used to render **every** saved role as a clickable-to-activate, ×-to-delete chip directly in the row, which was a live path from the project Crew tab to `removeRoleFromCrew()` (a shared crew-database mutation) with no confirmation. `rolesTagListHTML()` itself is unchanged and still the multi-role editor, now reached only through the Edit-pencil expansion (`crewFormHTML()`, alongside `roleAddPickerHTML()`) — [Crew]
  - Phase BE gave the chip its own class, `.role-chip` (`active` modifier for the currently-active one) — see **The design system, as decided (Phase Detail)** below for why this is a new class rather than a restyled `.pill.dept`
  - ⚠️ **Known gap, narrowed by Phase BF, made safer (not closed) by Phase BH.** The Edit-pencil expansion (`crewExpansionHTML()`→`crewFormHTML()`) is shared, unscoped state (`editingCrewId`) reachable from **every** project Crew tab view (Roles, Days/Hotel, Catering, Travel) as well as the standalone Crew Database screen. **BF closed the role-SWITCHING half of it** — clicking a chip from a project screen now calls `setEntryRole()` and touches only that project (verified: the crew record and the same person's entry on another project both unchanged). **The × still calls `removeRoleFromCrew()`, a shared crew-database mutation, from any project crew view — so "no path from any project screen deletes a saved role" is still NOT true.** What BH changed: that shared mutation is now behind an in-use warning dialog with an undoable cascade option, fired identically (same function, same one call site — see `rolesTagListHTML()`) whether reached from D-1 or from a project screen. It is safer than before, not scoped away — a project screen can still trigger a crew-database-wide role deletion, deliberately left open since separating it would be a new behaviour change, not this phase's job. See **Phase BH** — [Crew]
- `showAsQuickEditHTML()` / `saveQuickShowAs()` — inline "Show as" quick-edit, used on the Roles row. Renders via the same `.icon-btn` pencil button as every other edit affordance in the row (Phase S item 2) rather than a separately-styled control — [Crew]
- `groupedCrewOptionsHTML()` — builds `<option>` groups (by department) for crew-picker selects — [Crew]
- **Pre-production (T-2.9)** — prep days and optional date marks per crew ENTRY, plus the
  entry's shared rate. Built as a sibling project tab in Phase BD (then **T-8**); Phase BJ
  moved it into Crew's own view-switcher, between Roles and Days on site, as `crewGridView`
  value `'preprod'` — see `renderProjectCrew()` above. Not a view inside Crew that happens
  to look similar: it has a different scheduling model to a shoot-day roster (prep work is a
  number of days, optionally spread over a non-contiguous set of dates, rather than a person
  × shoot-day grid), it just now inherits Crew's chrome (toolbar, filter, sort/group-by,
  expand/collapse, bulk-select) instead of carrying its own. ⚠️ **THERE ARE NO TOTALS ON
  THIS SCREEN, AND NONE MAY BE ADDED.** No rate × days, no aggregation, no rollup, no
  section total, no totals column. Rate and days are data on rows and nothing here adds
  anything up. The only number on the screen that isn't a row's own is the department
  heading's roster count, which `deptHeaderHTML()` renders on every crew screen in the app
  and which counts rows, not prep data — [Crew]
  - ⚠️ **REMOVED in Phase BJ (do not look for these): `renderProjectPreproduction()`**
    (the tab's old standalone render function — its row content now renders through
    `renderProjectCrew()`'s `crewGridView==='preprod'` branch instead), **and
    `collapsedPrepDepts` / `toggleProjectPrepDeptCollapse()` /
    `toggleAllPrepDeptsCollapsed()`** (its own department-collapse state, deliberately
    separate from Crew's while Pre-production was a sibling tab — now that it's a Crew
    sub-tab like Hotel/Travel/Catering, it shares `collapsedProjectDepts` /
    `toggleProjectDeptCollapse()` / `toggleAllProjectDeptsCollapsed()` with them, same as
    the brief required ("same Expand/Collapse-all mechanism"). Collapsing a department on
    Pre-production now also collapses it on Roles, and vice versa — a deliberate behaviour
    change from the sibling-tab era, verified working in both directions
  - `prepRowHTML()` — ⚠️ **takes a PERSON BLOCK since Phase BK** (name kept). This tab has
    no person-level fact of its own — prep days, the entry rate and the date marks are ALL
    entry-level (`p.prepSchedule` is keyed by entry id): Role | the two bare number fields |
    the marks indicator, per entry. ⚠️ **Since Phase BN the FRONTED entry's cells render
    straight onto the SAME `.prep-grid.pb-head` div as the block checkbox + Name**, built
    from the shared `entryCellsHTML()` helper, rather than a second, independently-
    `display:grid` `.pb-role-row` — that second grid context is what let a single-role
    person's name and prep fields land on two separate lines regardless of role count. A
    stacked-away entry (2+ roles) still gets its own `.prep-grid.pb-role-row.pb-role-extra`
    row below, from the same helper. Reuses `roleBannerHTML()` exactly as `crewRolesRowHTML()`
    has it — since **Phase BM** that is one chip which IS the roles-menu trigger;
    `.role-add-marker` is gone. ⚠️ **Phase BO** widened Controls 32px→`var(--pb-controls-w)`
    (56px, matching the other five sub-tabs, since Pre-production's checkbox-only Controls
    used to be narrower) and fixed Name/Role to the same shared `var(--pb-name-w)`/
    `var(--pb-role-w)` tokens `.roles-grid`/`.crewgrid` use — no JS change needed here, since
    Pre-production's column count/order was already Controls|Name|Role|fields|calendar|
    trailing, just narrower. ⚠️ It deliberately does NOT render `crewRateSaveIconHTML()`:
    that icon is the app's one project→database write, and this tab makes no write to
    `db:crew`. ⚠️ Phase BL: a block here renders OPEN when `prepCalendarFor` points at one of
    its stacked-away entries, so an open calendar survives its own re-render — [Crew]
  - ⚠️ **FIELD LABELLING: rate and days are two bare number fields with NO column headers
    and NO inline labels** — the decision was that magnitude alone distinguishes them. There
    is no header row on this grid at all (unlike Roles', which Phase BJ's shared chrome does
    NOT add here — the toolbar row above the grid is shared, the grid's own column headers
    are not). Do not add them back — [Crew]
  - `p.prepSchedule` — the storage. A **PARALLEL** per-project structure **keyed by ENTRY
    id**: `{ [entryId]: {days, dates[]} }`. ⚠️ Deliberately NOT a field on `p.crewEntries` —
    Phase BF settled that shape and this is a parallel, not an extension. The cost of that
    choice is pruning; see `prunePrepSchedule()`. An emptied record, and an emptied
    `prepSchedule`, are **deleted** rather than left as husks, so a project nobody has used
    this tab on carries no key at all. Phase BJ moved where this tab lives and confirmed
    `p.prepSchedule` still agrees with `p.crewEntries` about what a row is — no migration,
    no restructuring, no data touched — [Crew]
  - `prepScheduleOf()` / `prepRecordOf()` / `prepDaysOf()` / `prepDatesOf()` — read-only
    accessors. None of them creates a record — [Crew]
  - `prepWrite(p, entryId, mutate)` — the ONE write path into `p.prepSchedule`. Normalises on
    the way out (dates deduplicated and sorted) and does the delete-rather-than-husk cleanup
    — [Crew]
  - `prunePrepSchedule(p, entryIds)` — **the pruning hook.** Called from
    `removeCrewEntries()` (which both `removeCrewFromProject()` and
    `bulkRemoveSelectedFromProject()` route through) and from `deleteCrew()` (which does
    not). Without it, prep data outlives the entry it belongs to — invisibly, since nothing
    renders an orphan — [Crew]
  - `setPrepDays()` — **DAYS is a plain editable number and the AUTHORITATIVE figure**: not
    derived, not computed from anything, not reconciled against the date marks or against
    shoot days. Writes on `onchange`; garbage reverts by re-rendering without saving, the
    same idiom as `saveEntryRate()`; empty clears it — [Crew]
  - ⚠️ **RATE IS NOT STORED HERE.** The Rate field is the entry's existing `rate`, read
    through `resolveEntryRate()` and written through `saveEntryRate()` — the same field the
    Roles view (`crewRolesRowHTML()`) and Budget's Per Person view read. **There is
    deliberately ONE rate**: editing it on this tab changes the same value everywhere.
    Do not create, shadow or copy a prep-specific rate; if something seems to need one, that
    is a separate decision and a later phase — [Crew, Budget]
  - `prepCalendarHTML()` / `togglePrepCalendar()` / `prepCalAnchorMonth()` /
    `shiftPrepCalMonth()` / `commitPrepDates()` / `clearPrepDates()` — the per-entry
    calendar, one open at a time (`prepCalendarFor` / `prepCalMonth`). **DATE MARKS are
    stored as a FLAT ARRAY of `'YYYY-MM-DD'`** — not range objects, not start/end pairs.
    Their purpose is showing NON-CONTIGUOUS patterns (one day, gap, three days, gap, two).
    It opens on the project's first shoot day, else `p.startDate`, else this month — a
    read-only glance; this tab never touches shoot day selection — [Crew]
  - `prepDrag` / `prepDayDown()` / `prepDayEnter()` / `prepDragApply()` — click-and-drag
    selection. ⚠️ **The drag is a UI affordance for picking several dates quickly and is NOT
    a storage format** — what lands is still the flat array. It works off a local Set and
    direct `classList` updates rather than re-rendering per cell, because a re-render
    mid-drag would destroy the element the pointer is over; ONE save and ONE render happen on
    a document-level `mouseup`. The first cell decides direction (from an unmarked day it
    marks, from a marked day it unmarks), so a drag can clear a run as easily as make one. A
    plain click is a one-cell drag — [Crew]
  - `prepCounterText()` — the soft counter under the fields: "5 days booked · 6 dates
    marked". ⚠️ **Muted only.** Marks are INDICATIVE and NOT bound to the days number —
    "booked 5, marked 7" is a VALID state (someone spreading five days' work across seven).
    There is deliberately **no warning, no validation, no reconciliation, no colour change
    and no badge** for a mismatch, in either direction. Do not add one. Renders empty rather
    than "0 days booked" when there is nothing to say — [Crew]
  - `.prep-cal-btn` / `.prep-cal-btn.has-marks` — the calendar icon doubles as the marks
    indicator, carrying its state as **weight**: `--muted` when nothing is marked, `--text`
    when something is. This was AZ's `.role-add-marker` convention reused rather than a second
    visual language for the same idea; **Phase BM deleted that element**, but the convention
    it set still governs here and on `.pb-toggle` — [Crew]
- `crewAssignRowHTML()` — ⚠️ **takes a PERSON BLOCK since Phase BK.** Renders the Days on site (T-2.2) and Hotel (T-2.3) blocks. **The split between person-level and entry-level facts is exactly the split in the data**: HOTEL nights are keyed to `crewId` (`p.hotelNightBefore`/`d.hotelNights`, BF's "two roles is still one bed"), so the Pre + per-night checkboxes and the row "All" sit on the name line unconditionally. DAYS ON SITE positions are keyed to an ENTRY id (`d.positions[i][0]`), so the day checkboxes, the row "All" (`toggleAllForPerson(entryId,'days')`) and the remove trash belong to whichever entry they're rendered for. ⚠️ **Since Phase BN, the FRONTED entry's role chip AND its day checkboxes/remove render onto the SAME `.crewgrid.pb-head` div as the name** (the chip via `crewIdentityHTML()`'s `extraLine`, alongside the identity), not a second, independently-`display:grid` `.pb-role-row` — that second grid context is what let a single-role person's name and day cells land on two separate lines. A stacked-away entry (2+ roles) still gets its own `.crewgrid.pb-role-row.pb-role-extra` div below, built from the same `entryCellsHTML()`/`entryRightHTML()` helpers the head uses. Department badge and Lead Company pill still hidden (Phase S item 6); role is still display-only here (editing only ever happens on Roles, though Phase BM did put the roles-MENU on the chip everywhere — see **Phase BM**).
  - ⚠️ **Phase BO superseded the `extraLine` role-chip placement above.** `.crewgrid` gained explicit Controls (`crewControlsHTML()`, via `crewIdentityHTML()`'s `opts.hideButtons`) and Role (`grid-column:3`) columns, shared with Roles/Pre-production via `--pb-controls-w`/`--pb-name-w`/`--pb-role-w`. The role chip is a real grid cell now, not text riding inside the identity block's flex row — do not look for `extraLine` carrying the chip on this renderer any more. `crewgrid-remove`'s column shifted `colCount+2`→`colCount+4` to make room for the two new leading columns — [Crew]
- `toggleCrewOnDay()` — toggles a crew member's assignment to a given shoot day — [Crew]
- `crewCateringBlockHTML()` — ⚠️ **takes a PERSON BLOCK since Phase BK.** Name line — ⚠️ **since Phase BN carrying the FRONTED entry's role chip too, via `crewIdentityHTML()`'s `extraLine`, on the SAME `.crewgrid.pb-head` div** rather than a second `.pb-role-row` — then any stacked-away entries as genuine separate `.pb-role-row.pb-role-extra` rows, then the three stacked per-day Breakfast/Lunch/Dinner checkbox rows (unaffected by BN/BO — always their own `.crewgrid.meal-subrow` rows, never merged into the head; their label now spans `grid-column:1/4` to clear the new Controls+Name+Role columns above them). Meals are stored per PERSON per day (`d.cateringMeals[crewId]`) — two roles is still one lunch — so all three meal rows are person-level. Department/Lead Company hidden, role display-only (Phase S).
  - ⚠️ **Phase BO superseded the `extraLine` role-chip placement above**, exactly as it did for `crewAssignRowHTML()` — the chip is now a real `grid-column:3` cell (Controls via `crewControlsHTML()`), not text inside the identity block's flex row — [Crew]
- `getCateringMeals()` / `toggleMeal()` — read/write which meals a crew member is down for on a given day — [Crew]
- `toggleAllMealForPerson()` — toggles one meal type on/off across every day for a person — [Crew]
- `buildCateringExport()` / `renderCateringExport()` / `copyCateringExport()` — build, render and copy a per-day catering headcount + dietary-notes list. Lives only in Preview & Export (T-7.5), left as-is by Phase P2 — [Crew, Preview & Export]
- `getCateringCosts()` / `saveCateringCosts()` — read/persist the project's per-meal costs (`p.cateringCosts.{b,l,d,delivery}`), Phase P2 — [Crew]
- `buildCateringSummaryGrid()` (Phase P2) — the Catering tab's own summary data: Breakfast/Lunch/Dinner counts per day plus a computed Daily cost (meal counts × their unit costs, plus a delivery fee charged once per meal type per day, only when that meal's count is >0 that day) — distinct from `buildCateringExport()`'s per-day list shape — [Crew]
- `cateringSummaryGridBodyHTML()` / `renderCateringSummaryGridSection()` (Phase P2) — render the grid (rows=meals+Daily cost, columns=days) into `#csmGridWrap`, re-rendered on cost-field input without touching the cost inputs themselves (same targeted-refresh pattern as `renderTechSpecsRoundup()`) — [Crew]
- `cateringSummaryOpen` / `toggleCateringSummaryBlock()` / `cateringSummaryHTML()` / `copyCateringSummaryGrid()` (Phase P2) — the collapsible "Catering summary" block on the Catering sub-tab (T-2.5): cost fields (Est. cost per Breakfast/Lunch/Dinner, Delivery cost) above the grid. Collapsed by default, positioned below "Crew on this project", same pattern as the Hotel summary block — [Crew]
- `jumpToCateringSummary()` (Phase P3) — the "Summary" jump-link next to Expand all/Collapse all on the Catering sub-tab: expands `cateringSummaryOpen` if collapsed, then scrolls `#cateringSummarySection` into view — [Crew]
- `crewTravelRowHTML()` / `setTravelMethod()` — ⚠️ **`crewTravelRowHTML()` takes a PERSON BLOCK since Phase BK.** Travel method is one choice per person per project (`p.travelMethods[crewId]`) — not per role, not per day — so the `<select>` and the car-details hint sit on the name line. ⚠️ **Since Phase BN the FRONTED entry's role chip joins them there too** (`crewIdentityHTML()`'s `extraLine`, concatenated with the existing car-info hint — both are plain flex items in the same `nowrap` identity row), on the SAME `.crewgrid.pb-head` div rather than a second `.pb-role-row`. A stacked-away entry (2+ roles) still gets its own `.crewgrid.pb-role-row.pb-role-extra` row below. Department/Lead Company hidden, role display-only (Phase S).
  - ⚠️ **Phase BO** moved the role chip out of `extraLine` into its own `grid-column:3` cell (Controls via `crewControlsHTML()`, `opts.hideButtons`) — `extraLine` now carries `carInfo` alone, same slot Travel always used, just no longer sharing it with the chip — [Crew]
- `getTransportCosts()` / `saveTransportCosts()` (Phase W) — read/persist the project's transport cost inputs (`p.transportCosts.{publicPerDay,mileage}`): a flat daily rate for public transport and a single general mileage rate for people using their own car (one rate overall, not per-person) — [Crew]
- `buildTransportSummary()` (Phase W; **deduplicated by Phase BF**) — the Travel tab's own summary data: since travel method (`p.travelMethods`) is stored once per person per PROJECT, not per day, the per-day breakdown is derived by crossing each person's method with the days they're actually on site. ⚠️ **It now iterates `projectCrew()` (distinct people) and tests `crewOnDay()`, not the roster × positions.** This is the exact function Phase AO flagged: it asks "is anyone on site that day", and a person holding two entries that both cover Day 3 would satisfy that twice. Counts every method actually in use per day, plus a computed Daily cost (Own car count × mileage rate + Public transport count × daily rate — the only two methods that carry a cost; Train/Flying/Production transport/custom methods are counted but not costed) — [Crew]
- `transportSummaryGridBodyHTML()` / `renderTransportSummaryGridSection()` (Phase W) — render the grid (rows=methods in use+Daily cost, columns=days) into `#tsmGridWrap`, re-rendered on cost-field input without touching the cost inputs themselves (same targeted-refresh pattern as `renderCateringSummaryGridSection()`) — [Crew]
- `transportSummaryOpen` / `toggleTransportSummaryBlock()` / `transportSummaryHTML()` / `copyTransportSummary()` (Phase W) — the collapsible "Transport summary" block on the Travel sub-tab (T-2.4): cost fields (public transport cost/day, mileage rate) above the grid. Collapsed by default, positioned below "Crew on this project", same pattern as the Hotel/Catering summary blocks — [Crew]
- `jumpToTransportSummary()` (Phase W) — the "Summary" jump-link next to Expand all/Collapse all on the Travel sub-tab: expands `transportSummaryOpen` if collapsed, then scrolls `#transportSummarySection` into view — [Crew]
- `toggleHotelNight()` / `toggleHotelPre()` — toggle whether a crew member is booked a hotel room for a shoot night / the night before — [Crew]
- `abbreviateName()` — "first initial + last name" display form (e.g. "A. Shaw"), used by the per-night table's Names column — [Crew]
- `buildHotelSummary()` (Phase O, replaces the old Preview-tab `buildHotelExport`) — per-person hotel aggregation: resolves each person's actual booked-night dates (incl. "night before Day 1") into a check-in/check-out range and total-nights count, sorted earliest check-in first then most nights first (`orderIndex`), and reused by the per-night table's Names ordering so both views stay in the same person order — [Crew]
- `hotelSummaryOpen` / `toggleHotelSummaryBlock()` / `hotelSummaryHTML()` / `copyHotelSummary()` — the collapsible "Hotel summary" block: a cost field ("Est. cost per room/night", id `hcRoomNight`, Phase AD — moved here from Budget, same `getHotelCosts()`/`saveHotelCosts()` pair, same `field-inline` markup as Catering's cost fields) above room-booking table (Room No./Name/Date from–to/Total nights), then per-night table (Night/Rooms/Names) below it, no separate rooming list. Shared markup/state rendered in two places (Phase O + follow-up) — below the person × night matrix on the Hotel sub-tab (T-2.3), and again below the WhatsApp text block on Preview & Export (T-7.2b) — same `hsmb-summary`/`hsmc-summary` ids either way since only one tab body is ever in the DOM at once, which is also why the cost field shows up on both (same precedent as Travel's cost fields at T-7.4). Autosave for `hcRoomNight` is wired per-screen: `renderProjectCrew()`'s `body.oninput` when `crewGridView==='hotel'`, and `renderProjectPreview()`'s scoped `e.target.id==='hcRoomNight'` check (alongside the Travel fields, Phase AD) — [Crew, Budget, Preview & Export]
- `jumpToHotelSummary()` (Phase P3) — the "Summary" jump-link next to Expand all/Collapse all on the Hotel sub-tab: expands `hotelSummaryOpen` if collapsed, then scrolls `#hotelSummarySection` into view — [Crew]
- `toggleAllForPerson()` — toggles all day-assignment checkboxes for one person at once — [Crew]
- `addCrewEntry()` / `removeCrewEntries()` (Phase BF) — the one place an entry is created, and the one place entries + their positions + their day overrides are removed together. ⚠️ `removeCrewEntries()` deliberately does NOT clear travel/hotel/catering: removing someone from a project never did, and BF has no behaviour changes. It also happens to be right for the entry model — two roles is one bed. **Phase BD added one more thing it clears: `prunePrepSchedule()`**, because `p.prepSchedule` is a parallel structure keyed by entry id and so — unlike `entry.rate` — does not vanish when the entry does. This is where the single and bulk removals meet, so hooking it here covers both; `deleteCrew()` is the third entry-dropping path and does not come through here, so it prunes for itself. **Phase BA added an optional `force` parameter** (`addCrewEntry(p, crewId, force)`): every existing caller passes nothing and keeps the pre-BF dedup-by-crewId no-op-on-re-add unchanged; only `applyRoleToEntryByMode()`'s "Add again as" path passes `force=true`, to get a genuinely second entry instead of the existing one back — [Crew]
- `addCrewToProject()` / `removeCrewFromProject(entryId)` — add a crew member to / remove an ENTRY from the current project's roster. `addCrewToProject()` has **three** callers now: this tab's picker, AI Scan's `propose_crew` matched-accept, and Overview Quick Add's crew search — it also calls `resetQuickAdd()` so that box settles back after the third — [Crew, Overview]
- `crewInfo()` — looks up a crew member's basic display info by id, with a fallback for removed crew — [Crew]
- `resolveCrewForDay(entryId, day)` / `hasOverride(entryId, day)` — resolve an ENTRY's effective role/dept for a specific day (Phase BF — was keyed by crew id). The base is the entry view, so a person holding two entries resolves to their AC role on one position and their operator role on the other. An id that no longer resolves still falls back to `(removed crew)` — [Crew, Shoot Days]
- `dayOverrideFormHTML()` / `saveDayOverride()` / `clearDayOverride()` — render/save/clear a per-day override of an ENTRY's role/department/company. ⚠️ `d.crewOverrides` is keyed by ENTRY id since Phase BF (it overrides role, which is entry-level). It was empty on all ten live shoot days at migration time, so this rekey moved no data — [Crew, Shoot Days]
- `OVERRIDABLE_FIELDS` — list of crew fields that can be overridden per shoot day — [Crew, Shoot Days]

## Locations

- `renderProjectLocations()` — renders the project Locations tab: the assigned-locations day grid, then the ONE "Add location" entry point — [Locations]
- `locAddOpen` / `locAddQuery` / `toggleLocAdd()` / `onLocAddInput()` / `locAddResultsHTML()` / `startNewLocationFromSearch()` (Phase Q) — **the unified add-location flow.** One button opens a search field over `locationsDB` (already-assigned locations filtered out, capped at 8 results), and the "create new location" option is the last row of that same result list, prefilled with whatever was typed. `onLocAddInput()` re-renders `#locAddResults` ONLY — re-rendering the tab would steal focus mid-word, the same reason `crewSearchQuery` lives outside the DOM. `startNewLocationFromSearch()` sets `locFormContext` to the project id itself, which is what makes `saveLocation()` attach the new record to `p.locationIds`. Replaces the old two-button arrangement (a database `<select>` + a separate "Add a new location" form). **Phase Quick Add renders this same widget — same functions, same `#locAddSearch`/`#locAddResults`/`#locFormWrap` ids — inside Overview's Quick add box**, so changing any of it changes both places; that's intended, and safe only because the two are on different tabs of the same body element and never coexist — [Locations, Overview]
- `locDayGridHTML()` — renders the per-location "which days is this used" checkbox grid — [Locations]
- `locRowHTML()` — renders one location row within a project. ⚠️ **Shares `.crewgrid` with the Crew tab's Days on site/Hotel/Travel/Catering** — Phase BO's shared Controls/Name/Role leading columns landed on this class too, so both this row's name cell and `locDayGridHTML()`'s header corner cell now explicitly span `grid-column:1/4` (there's no checkbox or role here, so the name just spans all three leading tracks) rather than relying on auto-placement into what used to be a single wide Name column — [Locations]
- `toggleLocOnDay()` — toggles a location's assignment to a given shoot day — [Locations]
- `addLocToProject(id)` / `removeLocFromProject()` — add/remove a location from the current project. Takes the id as an argument since Phase Q; the old no-arg form read a `#addLocPick` `<select>` that no longer exists. Three callers since Phase Quick Add (Locations tab search, AI Scan matched-accept, Overview Quick add), and it calls `resetQuickAdd()` for the third — [Locations, Overview]
- `renderLocationsDatabase()` / `renderLocationsList()` — render the standalone locations database screen and its list — [Locations]
- `locFormHTML()` / `toggleLocForm()` / `closeLocForm()` — render/open/close the add-or-edit location form. `toggleLocForm()` is now the **Locations database screen only** and takes no project id (it always clears `locFormContext`) — the project tab's way in is `startNewLocationFromSearch()`, which sets the context itself — [Locations]
- `editLocation()` / `saveLocation()` / `deleteLocation()` — edit, persist, and delete a location record — [Locations]
- `debouncedAddressSearch()` / `runAddressSearch()` / `pickAddress()` — debounce and run address geocoding search, and select a result — [Locations]
- `updateMapPreview()` — refreshes the embedded map preview for the currently selected location coordinates — [Locations]
- `haversine()` — great-circle distance helper between two lat/lon points — [Locations, Shared/utility functions]
- `AMENITY_SEARCH` — per-kind config (OSM tag, search radii, noun, form element id) for the nearest-amenity lookups — [Locations]
- `findNearestAmenity()` — nearest hospital OR parking via the OSM Overpass API, widening through `AMENITY_SEARCH[kind].radii` until something is found — [Locations]
- `lookupAmenityForForm()` — the "Find nearest hospital / parking" buttons on the location form; stores the result on `locFormState` — [Locations]
  - REMOVED in Phase U (do not look for these): findNearestHospital, findNearestParking, lookupHospitalForForm, lookupParkingForForm — four near-identical functions now covered by the two above
- `amenityLine()` — formats a `{name, address, distanceKm}` amenity as one display line, everywhere one is shown — [Locations, Shoot Days]
- `findLocationByName()` — looks up a location record by its name — [Locations, Shared/utility functions]
- `locSelectOptionsHTML()` / `refreshLocationDropdowns()` — build and refresh `<option>` lists of locations for pickers — [Locations]

## Tech Specs (Camera Designations, shot numbering)

- `renderProjectTech()` — renders the project Tech Specs tab: project-default tech fields, shot-numbering mode, camera designations list, and (Phase P1) the Tech specs roundup, each wrapped in `techBlockHTML()` so every section on this tab is collapsible — [Tech Specs]
- `techBlocks` / `toggleTechBlock()` / `setAllTechBlocksCollapsed()` / `techBlockHTML()` (Phase P1) — collapsible-block state and rendering for the Tech tab's three sections (`defaults`, `cameras`, `roundup`), same shared plumbing (`applyBlockState`/`toggleBlock`/`setAllBlocksCollapsed`) as Preview & Export's `pv` blocks and the Shoot Day editor's `sd` blocks. `roundup` starts collapsed (`techBlocks.roundup = false`); `defaults`/`cameras` start open — matches the Hotel summary block's collapsed-by-default pattern — [Tech Specs]
- `saveProjectTechSpecs()` — persists the project-level tech spec defaults and continuous/reset numbering choice — [Tech Specs]
- `cameraDesignationRows()` (Phase P1) — flattens a normalized `cams` object into the `{letter,name,shorthand,tag}` rows used by every camera-designations table; shared by `buildFullData()` (per-day, Preview & Export) and `projectTechRoundupData()` (project-level, Tech tab) — [Tech Specs, Preview & Export]
- `techSpecsRoundupBodyHTML()` (Phase P1) — renders the tech-spec-rows table + camera-designations table shared by the Tech tab's roundup and Preview & Export's Tech specs block — [Tech Specs, Preview & Export]
- `projectTechRoundupData()` / `renderTechSpecsRoundup()` / `copyProjectTechSpecsText()` / `copyProjectTechSpecs()` (Phase P1) — the Tech tab's own "Tech specs roundup" section (T-4.4): project-defaults tech specs + project-scope camera designations, resolved without any day context (the Tech tab has no selected shoot day), with its own Copy button. Re-rendered on every tech-field/camera edit (`body.oninput` in `renderProjectTech()`, and from the non-day branch of `commitCameras()`) so it stays live without a full tab re-render — [Tech Specs]
- `jumpToTechRoundup()` (Phase P3) — the "Summary" jump-link next to the Tech tab's Expand all/Collapse all: expands `techBlocks.roundup` if collapsed, then scrolls `#techBlock-roundup` (the `techBlockHTML('roundup', …)` wrapper) into view — [Tech Specs]
- `resolveTechSpecs()` / `techSpecsOverridden()` — resolve a shoot day's effective tech specs (day override vs. project default) — [Tech Specs]
- `resetDayTechSpecs()` — clears a day's tech spec override, reverting it to the project default — [Tech Specs]
- `refreshTechSpecsBanner()` — updates the "using project default / overridden" banner shown on a shoot day — [Tech Specs]
- `TECHSPEC_FIELDS` / `TECHSPEC_DEFAULTS` / `TECHSPEC_LABELS` / `TECHSPEC_HINTS` — the tech spec keys, their default values, their human labels, and each field's placeholder + box width — [Tech Specs]
- `techSpecFieldsHTML()` — the six tech-spec inputs, rendered once for both the project defaults (prefix `pj`) and a day's override (prefix `ts`) — [Tech Specs]
- `techSpecFieldId()` / `setTechSpecFields()` / `readTechSpecFields()` — build a field's DOM id, and fill/read a whole tech-spec form — [Tech Specs]
- `techSpecRows()` — `[label, value]` pairs for the fields that have a value; shared by the Preview table, the copyable text and the Excel sheet — [Tech Specs, Preview & Export]
- `CAMERA_LETTERS` — the A–Z pool used to assign camera designation letters — [Tech Specs]
- `letterForIndex()` — maps a camera's position index to its designation letter — [Tech Specs]
- `cinematographyCrew()` — returns the crew on a project who belong to the Cinematography department — [Tech Specs]
- `normalizeCameras()` — reconciles a project's/day's camera list against current cinematography crew (adds/removes/reorders entries) — [Tech Specs]
- `resolveCameras()` / `camerasOverridden()` — resolve a shoot day's effective camera list (day override vs. project) — [Tech Specs]
- `nameInitials()` — derives initials from a crew member's name for camera tagging — [Tech Specs]
- `shortenCameraModel()` — abbreviates a camera model name by stripping known brand prefixes — [Tech Specs]
- `CAMERA_BRAND_PREFIXES` — brand name prefixes stripped by `shortenCameraModel()` — [Tech Specs]
- `cameraFileTag()` — builds the camera's file-naming tag from letter, model and operator name — [Tech Specs]
- `renderCameraDesignations()` — renders the camera designation list/editor for either the project defaults or a specific day — [Tech Specs]
- `camerasForEdit()` — returns the camera list currently being edited for a given scope (project/day) — [Tech Specs]
- `moveOperator()` / `addOperatorCamera()` / `removeOperatorCamera()` / `setOperatorCameraField()` — reorder, add, remove and edit an operator-assigned camera entry — [Tech Specs]
- `addUnnamedCamera()` / `removeUnnamedCamera()` / `setUnnamedCameraField()` / `moveUnnamedCamera()` — add, remove, edit and reorder a camera with no assigned operator — [Tech Specs]
- `commitCameras()` — the shared tail of every camera edit: persist, re-render the list, and (day scope only) refresh the overridden-vs-default banner — [Tech Specs]

## Shoot Days

- `dayTabsBarHTML()` — renders the row of day-number tabs used to switch between shoot days — [Shoot Days]
- `renderProjectDays()` — renders the Shoot Days tab body (day tabs + selected day's editor) — [Shoot Days]
- `selectShootDay()` — sets the active shoot day and re-renders the project body — [Shoot Days]
- `makeShootDayRecord()` / `STARTER_SCHEDULE` — constructs a new blank shoot day record, seeded with the starter CALL/LUNCH/WRAP schedule. Since Phase AS (**G19**) it does **not** set `dayTotal` — see `shootDayTotal()` — [Shoot Days]
- `shootDayTotal(d)` (**G19**, Phase AS) — `projectDays(d.projectId).length`. ⚠️ **The total number of shoot days is derived, never stored.** It used to be a persisted `dayTotal` per record that nothing resynced, so adding a 7th day left days 1–6 printing "Day 1 of 6" on the call sheet, the WhatsApp text and the .xlsx while day 7 printed "Day 7 of 7"; deleting had the mirror problem. `buildFullData()` is the single place it is derived, which is why all four output consumers were fixed by one change. Don't reintroduce a stored total — [Shoot Days]
- `addShootDay()` / `deleteShootDay()` — create and remove a shoot day — [Shoot Days]
- `syncShootDayCount()` — grows the shoot day count immediately (blank new days), or (when shrinking) expands an inline checkbox picker instead of deciding for the user — [Shoot Days]
- `shootDayReductionPending` / `shootDayLabel()` / `toggleShootDayReductionPick()` / `cancelShootDayReduction()` / `confirmShootDayReduction()` / `shootDayReductionPanelHTML()` — the inline "select N days to remove" picker (Phase T item 1) shown on the Overview tab under the Shoot days count field when shrinking it, replacing the old sequence of native `prompt()` popups. Confirm is disabled until exactly the required number of days is ticked — [Shoot Days]
- `toggleShootDayBlock()` / `setAllShootDayBlocksCollapsed()` / `sdBlock()` — collapse/expand and render the shoot day editor's collapsible sub-sections — [Shoot Days]
- `shootDayBuildHTML()` — builds the full shoot day editor form markup (general info, schedule, positions, tech). The Production Brief textarea (`#sdBrief`) auto-grows to fit its content as typed (Phase X, `autoGrowTextarea()`) instead of staying a fixed height behind a manual drag-resize handle — [Shoot Days]
- `projectCrewOptions()` — builds crew `<option>` list scoped to the current project, for shoot-day pickers — [Shoot Days]
- `addSdLocRow()` / `onSdLocationChange()` / `onSdAddLocChange()` — add and react to changes in a shoot day's primary/additional location pickers — [Shoot Days]
- `quickAddLocationForDay()` — quick-creates a new location record directly from the shoot day form — [Shoot Days]
- `togglePosnCompany()` / `togglePosnDept()` — collapse/expand a company/department group within the position assignments list — [Shoot Days]
- `captureInProgressPositions()` — snapshots in-progress position edits before a re-render so they aren't lost — [Shoot Days]
- `renderPositionAssignments()` — renders the position (crew call time) assignment list for a shoot day, grouped by company/department, roles within a department ordered by `roleSeniorityRank()` (Phase N item 2) — [Shoot Days]
- `refreshAddPosnPick()` / `addPosnToDay()` / `removePosnRow()` — refresh the "add position" picker and add/remove a position on the day. ⚠️ **`d.positions[i][0]` is an ENTRY id since Phase BF**, so the picker offers entries ("Meurig — AC" and "Meurig — operator" are two selectable things, which is exactly why the shoot day stores entry ids). `projectCrewOptions()` returns entry views — [Shoot Days]
- `addSchedRow()` / `insertSchedRowBefore()` — add a new schedule row, optionally inserted before another row — [Shoot Days]
- `parseTimeStrToMins()` / `parseTimeRangeToMins()` / `parseDurationToMins()` / `formatMinsAsDuration()` / `formatMinsAsTime()` — parse and format time/duration strings for the schedule table — [Shoot Days]
- `onScheduleTimeInput()` / `onScheduleDurationInput()` — recompute dependent schedule fields as the user types times/durations — [Shoot Days]
- `moveSchedRow()` / `shiftSelected()` / `toggleSelectAllSched()` / `shiftScheduleTimes()` — reorder schedule rows and bulk-shift selected rows' times — [Shoot Days]
- `rowsOf()` — collects DOM rows matching a container/class selector, used by the schedule table logic — [Shoot Days, Shared/utility functions]
- `populateShootDay()` — fills the shoot day form fields from a day record when switching days — [Shoot Days]
- `onDayChanged()` — refreshes location/hospital/parking summaries after the selected day changes — [Shoot Days]
- `updateLocationSummary()` — refreshes the read-only primary-location summary on the day form — [Shoot Days]
- `updateAmenityDisplay()` / `updateHospitalDisplay()` / `updateParkingLookupDisplay()` — refresh the day form's saved-hospital and saved-parking lines; both are the same lookup with a different field and noun — [Shoot Days]
- `fetchWeatherForDay()` / `weatherFetchedLabel()` — fetches forecast weather for the day's date/location from Open-Meteo. ⚠️ **This is the only place `weather.fetchedAt` is ever written** (Phase AR, **G16**) — `saveShootDay()` preserves whatever the record already holds. The stamp exists to say how stale a forecast is, so a save that isn't a fetch must not move it. Written as an ISO timestamp (comparable/sortable); `weatherFetchedLabel()` formats it for display and passes anything non-ISO through verbatim, because records written before AR carry a localised date string and the sample data carries the literal `'sample'` — running those through `Date.parse()` would read `07/08/2026` as month-first and silently redate them — [Shoot Days]
- `WMO` — lookup table mapping Open-Meteo weather codes to human-readable conditions — [Shoot Days]
- `saveShootDay()` — validates and persists the current shoot day's form data — [Shoot Days]

## Budget

Cost visibility only (Phase Budget) — not a working budget. Rolls up cost data already
entered elsewhere in the app rather than owning any of its own — including hotel cost
per room/night (`getHotelCosts()`/`saveHotelCosts()`, Phase Budget originally, moved to
the Hotel tab in Phase AD so Budget's relationship to it now matches Catering/Travel:
read-only). Location fees were originally excluded for exactly the reason that made them awkward
(one fee can span several shoot days); **R2 added them**, apportioned per day — see
`locationFeeForDays()` below. Budget also gained its own Copy/Export in R1, so
Preview & Export is no longer the only export surface. Since **Phase AP** those two
export surfaces wear the SAME trigger — see **The output menu** below, and the
matching cross-reference in **Preview & Export**.

- `VAT_RATE` — fixed at 0.20 (UK standard). Not project-configurable — a real rate
  input is out of scope for a cost-visibility phase — [Budget]
- `parseRateNumber()` — best-effort numeric extraction from the crew database's
  free-text Fee/rate field ("£450/day" → 450); returns `null` (not 0) when nothing
  numeric is found, so "no rate on file" stays distinguishable from "costs nothing" —
  [Budget]
- `resolveEntryRate(entryId, p)` — **the per-entry day rate** (Phase BF; ⚠️ **renamed
  from `resolveCrewRate(c, p)`, and `p.crewRateOverrides` no longer exists** — the rate
  moved onto the entry as `entry.rate`, because rate is one of the three things that
  vary per role: the same person can be an AC at one rate and an operator at another on
  one project). Checked first; falls back to `parseRateNumber(c.rate)` on the crew
  record; falls back to "no rate on file" (`hasRate:false`) rather than silently costing
  someone at 0. The rename was deliberate rather than re-pointing the old name: the
  argument changed from a crew record to an entry id, and a silent signature change on a
  money field reads fine and computes wrong. Do not look for `resolveCrewRate` — [Budget]
- `saveEntryRate(entryId, rawValue)` (**renamed from `saveCrewRateOverride`**) — writes/
  clears one entry's rate (empty input deletes the key, reverting to the database rate);
  rejects a non-numeric entry by re-rendering
  without saving, so the field visibly reverts instead of holding invalid text —
  edited inline on the Per Person view, no separate edit affordance (matches the
  Phase Detail "Show as" decision — a plain input, not a pencil-and-save control) —
  [Budget]
- `crewRateSaveIconHTML(entryId, context)` / `saveCrewRateToDatabase(entryId, context)` (Phase AG; entry-keyed since Phase BF — the write still lands on the PERSON each entry points at, so two entries for one person resolve to one crew record and the last one wins) — the Day Rate
  "Save to database" icon, the first thing in the app that writes from a project back
  onto the shared crew database itself (everything else is the reverse: database →
  per-project override). A deliberately separate, explicit action from the project's
  own autosave — `p.crewRateOverrides`/`resolveCrewRate()`/`saveCrewRateOverride()`
  keep behaving exactly as before; this only pushes the currently-resolved rate onto
  `c.rate` (formatted `£${rate}/day`, matching the crew database's own free-text
  convention). Reused verbatim in the three places the Day Rate field appears — the
  Roles tab's Rate column (`crewRolesRowHTML()`), Budget's Per Person view
  (`budgetPersonViewHTML()`), and the crew Edit expansion (`crewFormHTML()`, project
  context only — see below) — via a shared `context` tag ('r'/'b'/'e') that keeps
  their status-flash element ids from colliding when the Roles row and its own Edit
  expansion are both on screen at once. Fans out through the same
  `selectedEditTargets()` bulk pattern as every other Crew-tab field, but — because
  this is the one field that can silently rewrite someone else's standing database
  record — a 2+ selection gets an explicit `confirm()` first ("This will change all
  these entries in the database — is that ok?"); cancelling changes nothing, no
  `saveDB` call happens. Does not touch `c.vatRegistered` itself — see
  `toggleBudgetVatRegistered()` below for why it doesn't need to — [Crew, Budget]
- `toggleBudgetVatRegistered()` (Phase AH) — Budget Per Person's VAT checkbox, the
  editable front-end for `c.vatRegistered` (the same field the crew database's own
  "VAT registered" select and `buildBudgetData()`'s VAT calc already read — not a
  second flag). Mutates the live `crewDB` record immediately on tick (so Budget's own
  VAT totals update in this same render) but does **not** call `saveDB` — per the
  brief this checkbox has no save icon of its own. It only reaches the database when
  the adjacent Day Rate Save icon (`saveCrewRateToDatabase()`) is next clicked, which
  persists the whole `crewDB` array and so picks up whatever's currently sitting in
  memory here for free — "one action, both fields" without either function needing to
  know about the other — [Budget]
- `getHotelCosts()` / `saveHotelCosts()` (Phase AD, moved from Budget to the Hotel
  tab) — read/persist `p.hotelCosts.perRoomNight`, same `{field: Number(val)||0}` shape
  as `getCateringCosts()`/`getTransportCosts()`. The field itself now lives in
  `hotelSummaryHTML()` (id `hcRoomNight`) — same place Catering/Travel keep theirs.
  Budget calls `getHotelCosts()` to read it project-wide, and (Phase AF) also renders
  the same `hcRoomNight` field itself on the Costs tab — see `budgetCostsViewHTML()`
  below — [Crew, Budget]
- `budgetCostsViewHTML()` (Phase AF) — Budget's own "Costs" tab (T-6.5, after Per
  Department/Per Day/Per Person): lets the Hotel/Catering/Travel cost inputs be
  adjusted from inside Budget too. Holds no state and no fields of its own — every
  input reuses the **exact same DOM id** as its home tab (`ccCostB`/`ccCostL`/
  `ccCostD`/`ccCostDelivery`, `tsCostPublic`/`tsCostMileage`, `hcRoomNight`) and reads/
  writes through the exact same `getCateringCosts()`/`saveCateringCosts()`,
  `getTransportCosts()`/`saveTransportCosts()`, `getHotelCosts()`/`saveHotelCosts()`
  pairs the Catering/Travel/Hotel tabs under Crew already use — there is nowhere else
  these values live, so a change made in either place is the same underlying
  `p.cateringCosts`/`p.transportCosts`/`p.hotelCosts` record; the other screen's next
  render just reads it fresh. Reusing the ids is safe because only one tab body is
  ever in the DOM at once — same precedent as `hcRoomNight` being reused between the
  Hotel tab and Preview & Export. `renderProjectBudget()`'s `body.oninput` (scoped to
  `budgetView==='costs'`) autosaves each field via `scheduleAutosave()`, then calls
  `renderBudgetSummaryBar()` — a targeted refresh of just `#budgetSummaryBarWrap`, not
  a full re-render, so the field the user is typing in doesn't lose focus (same rule
  as `renderCateringSummaryGridSection()`/`renderTransportSummaryGridSection()`) —
  [Budget]
- `budgetDayFilter` / `budgetDeptFilter` / `budgetSort` / `budgetFilterOpen` /
  `toggleBudgetFilterPanel()` / `toggleBudgetFilterDay()` /
  `toggleBudgetFilterDept()` / `setBudgetSort()` / `clearBudgetFilter()` /
  `budgetSelectedDays()` / `budgetDayFilterCount()` /
  `budgetActiveFilterCount()` / `budgetFilteredDays()` /
  `budgetFilterPanelHTML()` (Phase Refinement; department scope + sort added
  R16/R4) — **the Budget filter.** ONE panel carrying two scopes and a sort:
  a Set of shoot-day ids and a Set of department names (both empty = whole
  project, so the default is exactly the project-wide budget that was there
  before), plus `budgetSort` for Per Person. Deliberately a filter on the data
  rather than a fifth view — "which days/departments am I costing" scopes all
  four views at once, so it sits above the view switcher, not inside it.
  `buildBudgetData()` reads `budgetFilteredDays()` in place of `projectDays()`,
  which is the single line that scopes crew day rates, `daysWorked`, the per-day
  rows and the hotel room-night count together; the department scope is applied
  to the people list in that same function, so the summary bar and all four
  views can't disagree about what's being costed. Built in the Crew tab's Filter
  idiom (a `crewToolbarHTML()` row whose `.filter-panel` renders BELOW it, never
  inside it) with the same day-chip markup as `projectCrewFilter`'s Days
  sub-section, and it ends with the shared `filterPanelFootHTML()` row — see
  **The filter-panel foot** below. No OR/AND mode on days: they're being
  *summed*, not matched against a person, so "or" is the only meaning the
  selection can carry — [Budget]
  - ⚠️ `clearBudgetFilter()` clears **both** scopes (days and departments). It
    was called `clearBudgetDayFilter()` while it did only days; R16 grew it to
    cover departments but left the name, and a second day-only definition of
    that name sat above it as dead code (the later one silently won). Renamed
    and the dead one deleted — do not look for `clearBudgetDayFilter` — [Budget]
  - `budgetActiveFilterCount()` = live days + departments. Counts **filters
    only** — `budgetSort` is not in it, because choosing a sort narrows nothing
    and so must not make the panel look filtered. It's what gates the panel's
    "Clear filters" link — [Budget]
  - Ticked ids are re-checked against the project's current days on every read
    (`budgetSelectedDays()`), so a deleted shoot day — or switching project,
    since this state is global like `crewGridView`/`budgetView` — can't leave the
    filter selecting nothing and silently show a £0.00 budget. Nothing live
    ticked falls back to all days — [Budget]
  - Catering and Travel extras are scoped by summing `cateringGrid.cols` /
    `transportSummary.cols` for the days in scope rather than reading their
    `.totalCost`, which is always the whole shoot (those grids are the
    Catering/Travel tabs' own project-wide summaries). The night before Day 1
    only counts when Day 1 is itself in scope. **Verified**: on ROW 2026 (6
    days) each day costed alone sums to exactly the unfiltered project total,
    so nothing is double-counted or dropped — [Budget]
- `renderBudgetSummaryBar()` (Phase AF) — the targeted refresh behind
  `budgetCostsViewHTML()`'s autosave; re-renders `budgetSummaryBarHTML()` into
  `#budgetSummaryBarWrap` only — [Budget]
- `budgetView` / `setBudgetView()` — which of the four views (`department` /
  `person` / `day` / `costs`) is showing, same pattern as `crewGridView`. Displayed in
  the tab switcher as Per Department / Per Day / Per Person / Costs (Phase AA, `costs`
  added Phase AF) — the labels are `BUDGET_VIEW_LABELS` (Phase AP promoted the
  switcher's own local `viewLabels` to a const so the output menu names the four
  views identically instead of keeping a second list), not `budgetView`'s internal
  naming. ⚠️ Phase AP also made `setBudgetView()` reset `budgetExportView` — see
  **The output menu** — [Budget]
- `budgetVatToggle` / `toggleBudgetVat()` — itemized (every figure ex-VAT, VAT broken
  out as its own line in the summary bar) vs baked in (VAT folded silently into every
  figure everywhere, one Total). VAT is a property of the PERSON, never of a cost
  type: it attaches only where `c.vatRegistered` says so. Since **Phase AO** that
  covers a person's day rate AND their travel — see **VAT follows the person** below,
  which also records why Catering/Hotel/Locations are deliberately left out.
  ⚠️ Since **Phase AP** this ONE flag is also what the output menu's VAT choice reads
  and writes — there is no export-only VAT flag, deliberately. See **The output
  menu** — [Budget]
- `budgetPersonDisplay()` — the one function that applies the VAT toggle to a
  person's cost; every rollup (department, day, person-view Subtotal) is built by
  summing this, not the raw subtotal, so the toggle can never go stale in one view
  and not another. The `vat` handed to it is whatever `buildBudgetData()` attributed
  to that PERSON (day rate + travel since AO) — [Budget]
- `budgetOutputOpen` / `toggleBudgetOutputPanel()` / `budgetExportView` /
  `budgetExportViewEff()` / `setBudgetExportView()` / `budgetOutputPanelHTML()`
  (Phase AP) — **Budget's output menu**, behind the shared `outputMenuRowHTML()`
  trigger. Replaces R1's two direct-fire toolbar controls; ⚠️ Budget's Copy/Export no
  longer fire on click, they open this. Offers view (all four), VAT footing and
  copy-vs-.xlsx. `budgetExportView` is `null` by default meaning "the view I'm
  looking at", so the default is exactly R1's behaviour and the picker isn't a
  silently-diverging second copy of the view switcher sitting right below it;
  `setBudgetView()` resets it, so a deliberate override doesn't outlive the
  deliberation. The trigger is no longer hidden on the Costs tab — the menu can
  export any view from any view, so hiding it there would hide the way to the other
  three. See **The output menu** — [Budget]

### VAT follows the person (Phase AO)

**The model, from the user — do not re-derive it.** VAT is a property of the PERSON,
not of a cost type. If a crew member is VAT-registered, everything they invoice
carries VAT. `c.vatRegistered` is the correct and only mechanism; there is no
per-category or per-cost-field VAT flag anywhere and one must not be added.

- **Travel inherits it.** Travel is charged back through the crew member, so a
  VAT-registered person's travel attracts VAT too. `buildBudgetData()`'s
  `travelRateFor(id)` resolves the existing per-person attribution
  (`p.travelMethods[crewId]`, the same one `buildTransportSummary()` uses) down to a
  per-person figure rather than inventing a second one: only `'Own car'` (the
  mileage rate) and `'Public transport'` (the flat per-day rate) carry a cost, both
  landing on each day the person is on site, so **per-person travel = that rate ×
  `daysWorked`**. Summed over everyone this gives back exactly the `travelTotal` the
  Travel extras row shows — verified on ROW 2026: £1,660 either way.
  - The person's `vat` is therefore `(subtotal + travelCost) * VAT_RATE`. `travelCost`
    is deliberately **not** added to their `subtotal`/`display` — it is already
    counted once in the Travel extras row, and adding it here would double it. So
    travel appears ex-VAT in the Travel row and its VAT in the person's (and hence
    their department's) figures. That split is what keeps every view reconciling.
- ⚠️ **Catering, Hotel and Locations are DELIBERATELY excluded — this is not an
  oversight, do not "fix" it.** They are paid direct to a supplier (caterer, hotel,
  location owner), never invoiced back through a crew member, so there is no person
  whose `vatRegistered` status could attach to them. Travel is the sole exception
  precisely because it *is* charged back through the crew member. Their rows show
  £0.00 in the itemized VAT column on purpose.
- **Per Department gained a real VAT breakdown.** With Itemize VAT on, every
  department row shows ex-VAT / VAT / inc-VAT summed from the actual mix of
  registered and unregistered people in it — explicitly **not** a flat 20% of the
  department total. Verified on ROW 2026: Cinematography, 3 of 7 registered, shows
  £26,400.00 / £2,965.00 / £29,365.00 — VAT is 11.2% of the department, not 20%; a
  department with nobody registered (Grip, £3,900.00) shows £0.00 VAT. A department's
  VAT is not 20% of its own ex-VAT column either, because it also covers its people's
  travel, which is itemised ex-VAT in the Travel row — the table carries a `hint`
  saying so rather than leaving it to be rediscovered.
- **The reconciliation is the whole point** and is why all of this lives in
  `buildBudgetData()` alone, never per view. Verified numerically on ROW 2026 (6 days,
  66 crew, 5 registered): Per Department's VAT column, Per Person's VAT figures and
  Per Day summed all equal the summary bar's £3,517.00, and still do under a day
  filter (Day 1 alone: £432.00), a department filter (Cinematography: £2,965.00), both
  together (£865.00), with VAT baked in, and with each of the six days costed alone
  and re-summed (£51,290.00 / £3,517.00 / £54,807.00). The Copy/.xlsx export was
  compared cell-for-cell against the rendered DOM in all three views — identical.
- ⚠️ **Known, pre-existing, left alone:** the department filter narrows the *people*
  but not the *extras* rows (they are the Catering/Travel tabs' own project-wide
  summaries). So under a department filter the Travel row still reads project-wide
  (£1,660.00) while the VAT attributed covers only the in-scope people's travel
  (£700.00 of it). Every view still agrees with every other — the invariants above all
  hold — but the Travel line and the VAT beside it are answering slightly different
  questions. Scoping extras by department is a separate decision, not this phase's —
  [Budget]
- `budgetDayBlocks` / `syncBudgetDayBlocks()` / `toggleBudgetDayBlock()` /
  `setAllBudgetDayBlocksCollapsed()` / `toggleAllBudgetDayBlocks()` — Per Day's
  collapsible rows, same shared plumbing (`toggleBlock`/`setAllBlocksCollapsed`/
  `applyBlockState`, prefix `bd`) as the `sd`/`tt`/`pv` blocks. Unlike those, this
  state is keyed by shoot-day id rather than a small fixed set of section names, so
  `syncBudgetDayBlocks()` must run before every use to add/prune keys for the
  project's current days — `setAllBlocksCollapsed`/`allBlocksCollapsed` only ever see
  `Object.keys(state)`, so a day that was never individually toggled would otherwise
  be silently skipped by Expand/Collapse-all — [Budget]
- `buildBudgetData()` — the one aggregator behind all three views and the summary
  bar. ⚠️ **Catering and Travel columns join to a shoot day on `d.id`, never on
  `dayNum`** (Phase AR, **G15** — `dayIdsInScope`, and `cols.find(c=>c.dayId===d.id)`).
  `dayNum` is free text the user types: non-unique, routinely blank, and mixed-type
  across records. It is a column *heading*, not an identity. Don't reintroduce it as
  a join key.
  ⚠️ **Phase BF — one row per ENTRY, not per person** (day rate and days worked are both
  entry-level now), **but travel is charged ONCE PER PERSON** over the deduplicated union
  of their days. `travelClaimed` attributes it to whichever of a person's entries is in
  scope first, and `perDay`'s `travelClaimedToday` does the same per day. Charging it per
  entry would double a two-role person's travel AND the VAT on it, since AO's VAT base is
  (day rate + travel). Verified on ROW 2026: every AO invariant still holds exactly —
  VAT £3,517.00 across summary/departments/people/perDay, travel £1,660.00 across the
  people-sum, the Travel extras row and `buildTransportSummary()`.
  Days worked = shoot days where that ENTRY holds a position (`entryDayCount()`);
  person-level counts use `crewDayCount()`. Hotel
  room-nights are counted directly off `d.hotelNights`/`p.hotelNightBefore` rather
  than via `buildHotelSummary()`, which filters to "active" nights only and would
  need label-matching to recover one specific day's figure — this way project-wide
  and per-day hotel costs share one calculation. The night before Day 1 has no
  shoot-day row of its own, so its rooms fold into Day 1. Department rollups (both
  project-wide and per-day) are filtered by **presence** (someone's actually in that
  department), not by a truthy total — a department with people but no rate set
  shows as £0.00 rather than vanishing, which is the whole point of a cost-visibility
  screen. Phase AO added `travelRateFor()`/per-person `travelRate`/`travelCost`, the
  per-department `exVat`/`vat`/`incVat` fields, and the same three on each `perDay`
  row — all of it here, in the one aggregator, so no view computes VAT for itself; see
  **VAT follows the person** above — [Budget]
- `budgetSummaryBarHTML()` — the three-line/one-line summary bar, driven by
  `budgetVatToggle`. Its `.num` figures are Oswald (Phase AN), not Fraunces — a
  deliberate exception to Phase Fonts' "every Oswald label is 11px" rule; see
  `.budget-stat .num` below — [Budget]
- `budgetFmt()` (Phase AN) — the one money formatter for every Budget figure: the
  summary bar, all four views and the Copy/Excel export (`budgetExportRows()`).
  Adds thousands separators (`toLocaleString('en-GB', …)`), still 2dp — formatting
  only, never the number itself, so it can't put a view, the export or a filtered
  subtotal out of step with another. The five local `fmt` consts across
  `budgetSummaryBarHTML()`/`budgetDeptExtrasTableHTML()`/`budgetPersonViewHTML()`/
  `budgetDayViewHTML()`/`budgetExportRows()` now alias it rather than each
  redefining `n => '£'+(n||0).toFixed(2)` — [Budget]
- `budgetDeptExtrasTableHTML()` — the department-rows + Catering/Travel/Hotels
  extras + Total table, shared verbatim by the project-wide Per Department view and
  each Per Day row's own expanded breakdown ("same structure … just scoped to that
  single day" per the brief) — [Budget]
  - ⚠️ Phase AO changed it from **seven positional args to ONE options object**
    (`{departments, catering, travel, hotel, location, extrasLabel, total, exVat, vat,
    incVat}`) — the itemized breakdown needed three more figures and ten positional
    args across two call sites is a bug waiting to happen. Do not look for the old
    `(departments, catering, travel, hotel, total, extrasLabel, location)` signature;
    both call sites (`budgetDepartmentViewHTML()`, `budgetDayViewHTML()`) were
    converted. It now renders two shapes off `budgetVatToggle`: the original
    Department/Cost pair when VAT is baked in, and Department/Ex-VAT/VAT/Inc-VAT when
    itemized — [Budget]
- `budgetDepartmentViewHTML()` / `budgetPersonViewHTML()` / `budgetDayViewHTML()` —
  the three rollup views (Costs, the fourth tab, is `budgetCostsViewHTML()` above —
  it's not a rollup, so it lives with the cost-input machinery instead). Per Person's
  row order is canonical department order then `sortHoDFirst()` within it — there's no
  existing sortable-table (click-a-column) pattern anywhere in this app to extend, so
  this is a fixed, sensible order rather than a new UI paradigm built for one screen.
  Per Person's "Days worked" column is labelled "Days" and centered (Phase AA); its
  Day rate `.budget-rate-input` field is left-aligned and 64px (Phase AA, was
  right-aligned/84px) — same class/input reused verbatim by `crewRolesRowHTML()`'s
  Rate column (Phase Z). Both Day rate fields now sit inside a `.rate-with-save` wrap
  next to their `crewRateSaveIconHTML()` Save icon (Phase AG); Per Person also gained
  a VAT checkbox column between Day rate and Days (Phase AH,
  `toggleBudgetVatRegistered()`) — relabelled "VAT reg." in Phase AO, which added a
  second, **amount** column headed "VAT" that appears only while Itemize VAT is on.
  That column had to exist once travel started carrying VAT: a registered person's VAT
  is no longer simply 20% of the Subtotal sitting beside it, and the cell's `title`
  spells out how much of it is travel. Per Department is the view AO extended Itemize
  VAT into (see **VAT follows the person** above) — [Budget, Crew]

## Preview & Export

- `togglePreviewBlock()` / `setAllPreviewBlocksCollapsed()` / `pvBlockHTML()` — collapse/expand and render the Preview tab's collapsible export blocks — [Preview & Export]
- `exportFormat` / `exportSections` / `EXPORT_SECTION_LABELS` / `setExportFormat()` / `toggleExportSection()` (Phase Q) — **the two independent export choices.** `exportFormat` ('printable' | 'whatsapp') picks the output SHAPE; `exportSections` ({tech, catering, hotels, travel}, all true by default) picks WHICH optional content areas that shape carries. Session state, not persisted — same rule as `previewBlocks`/`crewGridView`: this is "what am I sending right now", not a project property. Excel is deliberately **not** a third format — see the Phase Q section at the bottom of this file — [Preview & Export]
- `exportPanelOpen` / `toggleExportPanel()` / `exportHiddenSectionCount()` / `exportOptionsHTML()` / `exportPanelBodyHTML()` (Phase Q follow-up; **renamed from `exportPanelHTML()` in Phase AP** — do not look for the old name) — **the Format panel**. Originally built in the Crew tab's Filter idiom with its own `.crew-header-filter` toggle; **Phase AP replaced that toggle with the shared `outputMenuRowHTML()`**, so this tab and Budget now wear one identical Copy/Export trigger — see **The output menu** below, and the matching cross-reference in the **Budget** section. The `.filter-panel` wrapper moved into the shared component, which is why this function now returns the panel's CONTENTS only. The panel's contents themselves are untouched by AP: Format tabs, four Include checkboxes as plain `.filter-chips` labels (so it inherits the Crew filter's chip styling instead of a bespoke rule set), both output actions (Copy, Download .xlsx), and the format hint. It still starts **open**, unlike the Crew Filter, because it holds the actions you came here to press. The state the old text label carried ("Format: Printable", "(N sections hidden)") is now the trigger's `title` tooltip — the panel is normally open, so it's on screen anyway — [Preview & Export]
- `exportOutputText()` / `copyExportOutput()` (Phase Q follow-up) — the single Copy path for the whole tab, replacing the old per-block `copyWA()`. Built from data via `buildWAText(buildFullData(d))`, **not** scraped off the preview card: a collapsed block is `display:none` and `innerText` silently skips it, so a DOM-scraped copy would quietly depend on which blocks happened to be open. Both formats copy the same plain-text call sheet honouring the Include checkboxes; only the button label differs ("Copy for WhatsApp" / "Copy as text") — [Preview & Export]
  - REMOVED in the Phase Q follow-up (do not look for it): `copyWA()` — the WhatsApp block's own Copy button, now redundant with the panel's
- `renderProjectPreview()` — renders the Preview & Export tab body for the current `exportFormat`: printable = call sheet card + the ticked section blocks + Excel; WhatsApp = the text block alone (the sections are inside the text). Only one shape is in the DOM at a time, so `generatePreview()`/`renderPreviewCard()` both guard for a missing element rather than assuming it. Also wires the Travel block's cost-field autosave, scoped by target id — a bare `body.oninput` would fire on the Include checkboxes too, and `saveTransportCosts()` reading fields no longer in the DOM would write both rates back as 0 — [Preview & Export]
- `buildFullData()` — assembles the complete RESOLVED data set for a shoot day (crew, locations, schedule, tech specs, weather) used by every export. Each position's `role` is `c.showAs||c.role` — the one place a crew member's "Show as" cosmetic override (Phase R item 3) actually reaches the call sheet/WhatsApp text/Excel output; `canonicalRole` (`c.role`, un-cosmeticised) rides alongside it purely so seniority ranking can look the role up in `ROLES_BY_DEPT`/`ROLE_SENIORITY`, since a free-text "Show as" usually won't match a saved role name. Splits the day's positions three ways (Phase N item 3): `positions` (crew, canonical department order, Client/Talent excluded), `clientPositions`, `talentPositions` — Client and Talent stand apart from the crew departments in every output instead of sorting in among them. `coProductionGroups` (by company) is untouched by that split. Returns `positions`/`clientPositions`/`talentPositions`/each `coProductionGroups[].people` all pre-sorted by `positionOutputCompare()` — [Preview & Export, Shared/utility functions]
  - tech specs go through `resolveTechSpecs()`, NOT the raw `day.techSpecs`: a day stores only what DIFFERS from the project defaults (`saveShootDay` deletes the key when nothing differs), so reading it raw exported blank tech specs for every day sitting on the defaults — fixed in Phase U
- `positionOutputCompare()` — the shared sort for every position list in the call sheet output: department (canonical order) → role seniority within it (`roleSeniorityRank()`, via `canonicalRole`) → role text → name — [Preview & Export]
- `generatePreview()` — regenerates and re-renders all preview/export blocks for the selected day — [Preview & Export]
- `renderTechSpecsSection()` / `copyTechSpecsText()` / `copyTechSpecs()` — render and copy the tech specs reference block, day-resolved (`resolveTechSpecs`/`resolveCameras` via `buildFullData`). Table markup comes from the shared `techSpecsRoundupBodyHTML()`/`cameraDesignationRows()` (Phase P1), also used by the Tech tab's project-level `renderTechSpecsRoundup()` (T-4.4) — [Preview & Export, Tech Specs]
- `renderPreviewCard()` / `positionsTableHTML()` — render the formatted call sheet preview card; `positionsTableHTML()` is the shared Dept/Position/Name/Call/Phone table markup behind the Client block (before Position assignments), the crew Position assignments block, the Talent block (after it), and each co-production group (Phase N item 3) — [Preview & Export]
- `buildWAText()` / `pushPeopleLines()` — build the WhatsApp-formatted plain-text call sheet (copying is `copyExportOutput()`'s job now); `pushPeopleLines()` is the shared "*HEADING*" + per-person lines block behind CLIENT/POSITIONS/TALENT/each co-production group, same ordering as the preview card (Phase N item 3) — [Preview & Export]
- `downloadExcel()` / `pushPeopleRows()` — build and download the multi-sheet Excel call sheet (via SheetJS); `pushPeopleRows()` is the shared heading-row + table-row block behind CLIENT/POSITION ASSIGNMENTS/TALENT/each co-production group in the Call Sheet aoa, same ordering as the other two outputs (Phase N item 3). Since Phase Q it emits one sheet per **ticked** section (Tech Specs / Hotel / Catering / Travel) on top of the always-present Call Sheet — a section with no data produces no sheet whether ticked or not, since an empty tab is worse than a missing one — [Preview & Export]
- `techSpecsLines()` / `hotelSummaryLines()` / `cateringOrderLines()` / `transportSummaryLines()` (Phase Q) — the four sections as arrays of text lines, each returning `null` when there's nothing to say. Extracted from the bodies of the four Copy buttons so the WhatsApp export appends **exactly** the text those buttons produce rather than a second rendering of the same data. `techSpecsLines()` takes resolved `buildFullData()` output, not a raw day, so it can't reintroduce the raw-`day.techSpecs` bug Phase U fixed — [Preview & Export]

## Shared/utility functions

- `sb` (Supabase client) — the shared Supabase client instance used by every DB read/write — [Shared/utility functions]
- `loadDB()` / `saveDB()` — the single choke point for reading/writing any app data collection to/from Supabase, keyed by a `db:*` string. **Since Phase AR (G11) `saveDB()` returns a result — `{ok:true}` or `{ok:false, kind, detail}` — and raises the failure banner itself.** The ~80 call sites that ignore the return are still correct; don't add per-call-site error handling (same rule R18 set) — [Shared/utility functions]
- `DB_OBJECT_KEYS` / `isObjDB()` — which collections are object-shaped rather than arrays of records. Governs exactly ONE thing: the empty value `loadDB()` falls back to on a missing or errored row (`{}` vs `[]`). It does **not** gate merging — `mergeDB()` branches on the runtime shape of what it's handed and `applyMergedDB()` switches on the key by name. `db:roles` was missing from it until Phase AR (**G13**) — [Shared/utility functions]
- `saveFailure` / `DB_KEY_LABELS` / `reportSaveFailure()` / `clearSaveFailure()` / `dismissSaveFailure()` / `retrySaveFailure()` / `renderSaveFailureBanner()` (**G11**) — the save-failure surface. See the Phase AR section for the two kinds and why they're two — [Shared/utility functions]
- `saveInBackground(key, value)` (**G14**, Phase AS) — the render-first save path used by the eleven grid interactions. Calls `saveDB()` WITHOUT awaiting it before the render, and re-renders if the result comes back `{ok:false}`. ⚠️ **This is only safe because G11 exists** — see the Phase AS Commit B section. Never roll back a failed save here — [Shared/utility functions]
- `initApp()` — bootstraps the app: loads all DB collections into memory and does the first render — [Shared/utility functions]
- `uid()` — generates a short random unique id — [Shared/utility functions]
- `esc()` — HTML-escapes a string for safe interpolation into templates — [Shared/utility functions]
- `val()` / `setv()` — get/set the trimmed value of a form input by element id — [Shared/utility functions]
- `autoGrowTextarea()` (Phase X) — resizes a textarea's height to fit its content (`scrollHeight`); wired via `oninput` where a textarea needs to auto-grow, and called once after any programmatic `setv()` fill (setting `.value` directly doesn't fire `input`) — first user: the Production Brief textarea (`#sdBrief`, T-5.2) — [Shared/utility functions, Shoot Days]
- `icon()` / `ICONS` — look up and wrap an inline SVG icon by name — [Shared/utility functions]
- `flashStatus()` / `flashSaveResult()` — the discreet "Saved" status flash shared by every save button and autosave, and (Phase AR, **G11**) its honest wrapper. **Call `flashSaveResult(elId, await saveDB(…))`, not `flashStatus(elId)`, anywhere a status follows a save** — `flashStatus()` says "Saved" unconditionally and is now only reached via the success branch. On failure `flashSaveResult()` shows "Not saved" (or "Not saved — change lost") in `.status-failed` and deliberately does NOT fade after two seconds — [Shared/utility functions]
- `copyText()` — the single clipboard path for every Copy button: async API with a textarea fallback, optional confirm message — [Shared/utility functions]
- `deptHeaderHTML()` — the one canonical collapsible group header (caret + optional code + label + count), shared by the project Crew tab, the crew database and Position Assignments — [Shared/utility functions]
- `expandCollapseAllHTML(onclickExpr, extraLinkHTML, allCollapsed, groupId)` — the "Expand all · Collapse all" strip. `extraLinkHTML` is the **second** argument, appended after the toggle (Phase P3 uses it on the Tech tab for the "Summary" jump-link); `groupId` gives the toggle its `eca-<id>` id so `refreshExpandCollapseAll()` can keep the label honest. Every caller that wants no extra link passes `undefined` in that second slot — [Shared/utility functions]
  - ⚠️ Corrected in Phase Refinement: this entry (and the Phase Detail section near the bottom) previously documented the arg order as `(fnName, arg, extraLinkHTML, allCollapsed)`, which no call site has ever used — [Shared/utility functions]
- `applyBlockState()` / `toggleBlock()` / `setAllBlocksCollapsed()` — collapsible-block plumbing shared by Preview & Export (`pv` prefix) and the Shoot Day editor (`sd` prefix) — [Shared/utility functions]
- `refreshTabScrollCues()` — wraps any horizontally-overflowing `.tabs` strip so it shows an edge-fade scroll cue, and clears the cue at the end of the scroll (mobile) — [Shared/utility functions]
- `GRID_ROW_SELECTOR` / `checkboxesIn()` — the row selector and per-row day/meal checkbox list used by the grid keyboard navigation handler. `checkboxesIn` is scoped to `.crewgrid-check` so the row's bulk-select checkbox is excluded — [Shared/utility functions]
- `sortHoDFirst()` — sorts a crew list with Heads of Department first, then by name — [Shared/utility functions]
- `scheduleAutosave()` — debounces a save callback per key so rapid edits coalesce into one autosave — [Shared/utility functions]
- `DEPARTMENTS` / `DEPARTMENT_CODES` — canonical department list and their short codes used across Crew/Tech/exports — [Shared/utility functions]
- `deptBucketKey()` / `deptRank()` — normalize a crew member's department to a known bucket and rank it for sort order — [Shared/utility functions]
- `subDeptsFor()` / `SUBDEPARTMENTS_BY_DEPT` — look up the allowed sub-departments for a department — [Shared/utility functions]
- `ROLES_BY_DEPT` / `rolesFor()` — canonical role list per department; each entry declaratively belongs to a department (Phase R item 1) — a saved role IS a department, there's no separate mapping to keep in sync — [Shared/utility functions]
- `ROLE_SENIORITY` / `roleSeniorityRank()` / `moveRoleSeniority()` — per-role seniority rank within a department (Phase N item 2, e.g. DOP outranks 1st AC outranks Camera Operator), keyed by "Department/Role" path, persisted to `db:roleseniority`. Falls back to the role's position in `ROLES_BY_DEPT[dept]` when no explicit rank is set, so canonical roles sort sensibly with zero admin action; unmatched/custom-typed roles rank last. `moveRoleSeniority()` swaps a role up/down and renumbers its department densely (0,10,20…); edited via the "Role seniority order" reorder list in `renderDeptAdminPanel()` — [Shared/utility functions]
- `departmentForRolePath()` — extracts the department from a "Department/Role" saved-role path string; the one place department is ever read off a role — [Shared/utility functions]
- `rolesTagListHTML(c, entryId)` / `roleAddPickerHTML()` / `newRolePickerOptionsHTML()` / `addRoleToCrew()` / `removeRoleFromCrew()` / `setActiveRole()` / `setEntryRole()` — render and manage a crew member's multiple assignable roles. `newRolePickerOptionsHTML(c)` (Phase BB) is `roleAddPickerHTML()`'s option-list generation pulled out into its own function — same source (`ROLES_BY_DEPT`/`rolesFor()`), same exclusion against `c.roles`, same "+ Add new role…" trailing option — so it could be reused by the roles menu's footer item (`rolesMenuAddRolePickerHTML()`, see **Phase BA — the roles menu** / **Phase BB**) without a second, divergent copy of "what counts as already held." `roleAddPickerHTML()` itself is unchanged in behaviour, only its body shortened. ⚠️ **Phase BF split the setter in two, and which one a chip calls is decided by `rolesTagListHTML()`'s `entryId` argument:**
  - `setEntryRole(entryId, rolePath)` — writes role/department onto the ENTRY, saves `db:projects`. **Every project screen routes here.** Nothing outside that project changes. Keeps the `selectedEditTargets()` fan-out (over entry ids). This is what BA's "Change to" consumes, via `applyRoleToEntryByMode()` — see **Phase BA — the roles menu**
  - `setActiveRole(crewId, rolePath, skipSave)` — writes the PERSON's database default (`c.role`/`c.department`) and saves `db:crew`. **Reachable only from the Crew Database screen (D-1)** — `goDatabase()` nulls `currentProjectId`, which is what makes `crewExpansionHTML()` pass no `entryId` there. Do not wire a project screen back to it. Still the sole place `department`/`subDepartment` are derived rather than typed, and still what `addRoleToCrew()`/`removeRoleFromCrew()`/`confirmAddRoleDialog()` call internally for their first-role and replacement-role fixups
  - `removeRoleFromCrew()` refuses to remove a person's last remaining role (guard unchanged, runs first) and re-activates a replacement if the removed one was active — still a shared crew-database mutation reachable from any project crew view (the AZ × gap; unchanged by Phase BH, see the ⚠️ above `roleBannerHTML()`). **Since Phase BH**, if the role being removed is in use anywhere it no longer removes silently: it opens `removeRoleDialogHTML()` (`removeRoleDialogFor` state, rendered into the same `#globalOverlay` as the add-role dialog above) offering "Leave in old call sheets" (default — drops the role from `c.roles` only, existing entries untouched since role is copied onto the entry, not referenced live) or "Delete from all projects" (also cascades: every matching entry, across every project including finished ones, removed via `removeCrewEntries()` one project at a time, wrapped in R17's `beginUndo()`/`finishUndo()`). A role with zero usage skips the dialog and deletes directly, as before. `roleUsageProjectIds(crewId, roleName)` is the usage check — a full `projectsDB` scan via `entriesForCrew()`, cheap at ~88 crew/low-dozens of projects. `commitRoleRemoval()` is the one write path both dialog choices (and the no-usage skip) funnel through — [Shared/utility functions, Crew]
- `pendingNewCrewRole` / `newCrewRolePickerHTML()` / `onNewCrewRolePick()` — single-role picker for a brand-new, not-yet-saved crew member (no id yet to attach a saved role to) — stashed here until `saveCrew()` creates the record with it — [Shared/utility functions]
- `addRoleDialogFor` / `addRoleDialogThen` / `openAddRoleDialog()` / `closeAddRoleDialog()` / `addRoleDialogHTML()` / `confirmAddRoleDialog()` / `renderGlobalOverlay()` — the "Add new role" dialog (Phase R item 5): one in-page dialog (Department select + Role name) rendered into the persistent `#globalOverlay` div outside `#main`, replacing the old two-`prompt()` flow. Adds straight onto a crew id, or (when opened as `'__new__'`) feeds `pendingNewCrewRole` for the not-yet-saved crew form. `addRoleDialogThen` (Phase BB) is an optional continuation — `openAddRoleDialog(forId, onAdded)` — called with the resulting `"Department/Role"` path once it actually lands on `c.roles`; only the roles menu's footer item passes one, to then apply the new role to an entry via `applyRoleToEntryByMode()`. Every pre-existing caller (`roleAddPickerHTML()`'s own `<select>`, via `addRoleToCrew()`) passes nothing and is unaffected — confirmed by exercising that exact path after this phase landed: the dialog still adds the role to the database only, with no entry touched — [Shared/utility functions]
- `useCrewAsTemplate()` / `duplicateCrew()` (Phase BG renamed the control and added the first of these) — **"Use as template"**, the D-1 crew-card action that clones a record as the starting point for a DIFFERENT PERSON (same company, agent and rate; new name). Never a second role for the same person — that's BA's "Add again as" once it ships. `useCrewAsTemplate()` is a confirm step and nothing else; `duplicateCrew()` below it is unchanged and still does the actual clone (new `uid()`, `_copyOriginalRole` stamp, `saveDB('db:crew')`). ⚠️ **The guard sits BEFORE the write, not at save**: `duplicateCrew()` writes to `db:crew` on click, so there is no pending record and no save step to gate — cancelling has to mean "don't create it", which only exists as a choice up front. Cancel writes nothing at all. Uses native `confirm()`, matching `deleteCrew()`/`removeSubDeptAdmin()` on this same screen; D-1.5's `addRoleDialogHTML()` is a picker, not a confirmation, so it isn't the pattern to copy — [Crew, Shared/utility functions]
  - The control was labelled **"Duplicate"** before Phase BG (never "Duplicate crew member", despite how it gets referred to). Its `title` and both `copy`-badge tooltips were reworded off "duplicate" at the same time; the badges themselves and `_copyOriginalRole` keep their existing purpose, since the copy really does exist and they still describe something true — [Crew]
- `coProPillSelect()` / `quickSetCoPro()` / `coProCompaniesList` — render and update a crew member's co-production company assignment — [Shared/utility functions]
- `crewIdentityHTML()` / `crewControlsHTML()` / `deptLabelHTML()` / `posnIdentityHTML()` / `crewExpansionHTML()` — shared rendering helpers for how a crew member's identity/role/department are displayed across tabs. `crewIdentityHTML()`'s department badge is always the read-only `deptLabelHTML()` now (no more editable department pill — see Phase R item 1). `opts.hideDept` / `opts.hideLeadPill` suppress the department badge / Lead Company pill (used by Days on site/Hotel/Travel/Catering — Phase S item 6; the Roles tab doesn't use this function at all any more, see `crewRolesRowHTML`). ⚠️ **`opts.selectCbHTML` (Phase BK) REPLACED `opts.bulkSelect`** — do not look for the old one: every Crew list is one person BLOCK per person now, and the ids a block's checkbox must toggle are that person's currently VISIBLE entries, which only the block knows (a partial-match filter can hide some). The old branch built the checkbox from `c` alone and had no way to express that. `opts.showAsOrRole` displays `c.showAs||c.role` instead of the raw role (Phase S item 8 — those same four tabs are display-only for role, editing only ever happens on the Roles tab).
  - ⚠️ **Phase BO split the checkbox+Edit-pencil pair out into `crewControlsHTML(c, opts)`.** `crewIdentityHTML()` still calls it internally and renders the pair inline by default (unchanged for its one other caller, the Crew database's `crewCardHTML()`) — but `opts.hideButtons:true` suppresses that inline rendering so a caller can render `crewControlsHTML()` itself in a separate grid cell instead. Days on site/Hotel/Travel/Catering do exactly this now: their Controls column is explicit (`--pb-controls-w`, shared with Roles/Pre-production), not embedded inside the identity block's own flex row, which is what makes the checkbox/pencil start at the same x on every one of the six Crew sub-tabs. The checkbox+pencil markup/behaviour itself is byte-for-byte what it always was — only where it renders moved — [Shared/utility functions]
- `appSettings` / `SETTINGS_DEFAULTS` / `FONT_CHOICES` (**renamed from `HEADER_FONTS` in Phase R/R15** — it now feeds all three font roles, not just headings) / `TINT_ALPHAS` / `hexToRgbTriple()` / `applyAppSettings()` / `setSetting()` / `previewSetting()` / `saveAppSettings()` / `resetAppSettings()` (Phase Q) — the app's configurable header font and brand colours, plus (Phase Tasks) the three Overview auto-flag rule toggles (`flagNoLocation`/`flagNoCrew`/`flagNoDayRate`) — same object, same persistence, just not all of it is styling. Persisted to `db:settings` (an object key, so it's in `loadDB`'s `isObjKey` list alongside `db:subdepartments`/`db:roleseniority`). `applyAppSettings()` works by writing the SAME custom properties the stylesheet already declares in `:root` — `--disp`, `--tape`, `--tape-light` and all six `--tint-N`, the last derived from the brand hex — onto `documentElement`, so no CSS rule needs to know settings exist. `previewSetting()` applies without saving: the colour picker fires `oninput` continuously while dragging, and one Supabase write per hue is not a trade worth making — `onchange` calls `setSetting()` to persist. Only families already in the Google Fonts `<link>` (plus two system stacks) may be added to `HEADER_FONTS` — [Shared/utility functions]
- `renderSettings()` / `goSettings()` (Phase Q) — the Settings screen (S-1), reached from the sidebar. A full screen, not a floating cog panel: the app's one existing pattern for a project-independent thing you go and look at is the sidebar screen (Crew database, Locations database), and a modal would have been a second pattern for no gain — [Shared/utility functions]
- `renderSide()` — renders the left sidebar (project list, nav) — [Shared/utility functions]
- `toggleDrawer()` / `closeDrawer()` — open/close the mobile navigation drawer — [Shared/utility functions]
- `setTopbarTitle()` — updates the mobile top bar's title text — [Shared/utility functions]
- `goDatabase()` / `goNewProject()` / `openProject()` / `goProjectTab()` — top-level router functions that change `route`/`currentProjectId`/`currentProjectTab` and re-render. `openProject()` also stamps that project's `lastOpenedAt` (Phase Y, `Date.now()`) and saves it — the signal `mostRecentProject()` reads for the Welcome screen's "Recent" button — [Shared/utility functions, Overview]
- `renderMain()` — dispatches the main panel render based on the current route — [Shared/utility functions]
- `projCode()` — derives a project's short display code — [Shared/utility functions]
- `fmtDate()` — formats an ISO date string as a human-readable date — [Shared/utility functions]
- `renderCrewDatabase()` / `renderCrewList()` / `crewSearchBlob()` / `crewCardHTML()` — render the standalone crew database screen, its filtered list, and its search index/card markup. `crewSearchBlob()` includes `c.showAs` so the cosmetic override is searchable too. `crewCardHTML()` is the **only** render site for the "Use as template" and Delete actions — [Crew, Shared/utility functions]
- `toggleDeptCollapse()` / `setAllDeptsCollapsed()` — collapse/expand department groups in the crew database list — [Crew]
- `toggleProjectDeptCollapse()` / `setAllProjectDeptsCollapsed()` — the same, for the project Crew tab's groups — [Crew]
- `crewFormHTML()` / `toggleCarFields()` — render the add/edit crew form and react to "has car" toggling. No more free-text Role or manual Department field (Phase R item 1/follow-up): existing crew (`c.id` set) get the live saved-roles tag-list editor; a brand-new crew member gets `newCrewRolePickerHTML()` instead, required to save. Also has the new "Show as" text field. Since Phase AG, the Private section's Fee/rate row also carries a "Day rate (this project)" field next to it, when-and-only-when this form is opened from within a project for an existing crew member (`c.id` set AND `currentProject()` resolves — false on the standalone Crew database screen, which shares this same function but has no project) — same `p.crewRateOverrides`/`resolveCrewRate()`/`saveCrewRateOverride()` field as the Roles row and Budget's Per Person view, with its own `crewRateSaveIconHTML()` Save icon (context `'e'`), not a second copy of the override — [Crew]
- `refreshCrewScreen()` / `toggleCrewForm()` / `closeCrewForm()` / `editCrew()` / `toggleCrewView()` / `crewViewHTML()` — manage opening/closing/viewing the crew form and read-only crew detail view. `toggleCrewForm()`/`closeCrewForm()` reset `pendingNewCrewRole` when the new-crew form opens/closes. Since Phase AS (**G18**) `toggleCrewForm()` also scrolls `#crewFormWrap` into view on open — the form was never missing, it opened ~600px below the fold because the button is the last element on a 12,400px page. `#crewFormWrap` is shared by both render sites (crew database and the project Crew tab); only one is in the DOM at a time, same precedent as `#locFormWrap`. ⚠️ It picks `behavior` rather than hard-coding `'smooth'` like `editLocation()`/`startNewLocationFromSearch()` do: **under `prefers-reduced-motion: reduce` this browser does not scroll at all with `behavior:'smooth'`** (measured — scrollY never moved over 3.6s, while `'auto'` landed the form correctly). The two Locations call sites still hard-code `'smooth'` and carry the same latent hole — logged, not fixed here — [Crew]
- `saveCrew()` — persist a crew record. Refuses to create a brand-new crew member without `pendingNewCrewRole` set ("every crew member needs at least one saved role"); for a new record, role/department/`roles` are derived entirely from that pick. For an existing record, role/department/`roles` are left untouched (they're managed live by `addRoleToCrew`/`setActiveRole` elsewhere, not by this form) — [Crew]
  - **Duplicate-name warning (Phase BG)** — a `confirm()` between the role check and the first mutation, so cancelling returns cleanly with nothing written and nothing renamed. Matches on the **name alone**, normalised (`trim()` + `toLowerCase()`), against every other record in `crewDB`. ⚠️ **Never name + role**: under BF one record holds several saved roles, so one person with two roles is one CORRECT record and two records sharing a name are wrong whatever roles they carry — building role into the comparison breaks the moment BF lands. It is a **warning, not a block** (two different people genuinely can share a name), and it only fires when the name is new or actually changed, so re-saving an unchanged record never nags. Covers the hand-entry paths — "+ Add crew member" and renaming in the Edit expansion — which are the ones that pass through this function; the template flow doesn't reach here at all and carries its own guard in `useCrewAsTemplate()` — [Crew]
  - ⚠️ **Not a duplicate finder, and it must not be sold as one.** Exact-string matching is weak against years of hand entry: normalising catches trailing spaces and casing, and nothing else — "M. Marshall" vs "Marshall, M" vs "Mike Marshall" all slip through. It also says nothing about pairs **already** in the database; it only guards new entry. Reconciling the existing ~88 records is BF's job — [Crew]
- `deleteCrew()` — delete a crew record, and drop every roster ENTRY that points at them on every project. ⚠️ **Deliberately leaves their shoot-day positions behind**, because that is exactly what it did before Phase BF (it filtered `p.crewIds` and touched nothing else); an unresolvable position has always rendered as `(removed crew)` via `crewInfo()`, and still does. Cleaning those up is a real improvement and a real behaviour change, so it was not BF's to make. ⚠️ **It is the THIRD path that drops entries from a project and the one that does NOT route through `removeCrewEntries()`** — so Phase BD calls `prunePrepSchedule()` here too, per project. That is not the same decision as the dangling positions above: a dangling position is visible as "(removed crew)" and always has been, whereas an orphaned prep record is invisible and would simply accumulate in the project row forever. Undo is unaffected — prep data lives in `db:projects`, which `beginUndo()` already snapshots on this path — [Crew]
- `renderDeptAdminPanel()` / `toggleDeptAdminPanel()` — collapsible "Departments & sub-departments" panel on the Crew database screen: one block per department showing its sub-departments (add/rename/remove), its "Role seniority order" reorder list (Phase N item 2 — up/down via `moveRoleSeniority()`), and its roster, Heads of Department pinned to the top — [Crew]
- `addSubDeptAdmin()` / `renameSubDeptAdmin()` / `removeSubDeptAdmin()` — add, rename (updates any crew already on it) and remove (clears it off any crew) a sub-department from the admin panel — [Crew]
- `toggleHoD()` — toggles a crew member's `isHoD` flag (Head of Department), used to pin them to the top of their department's roster in the admin panel and, via `crewRolesRowHTML`/roster sorts, elsewhere — [Crew]
- `crewDbFilter` / `crewDbFilterOpen` / `crewSearchQuery` — Crew database's filter-panel state (same shape as `projectCrewFilter`, no group-by since there's no hotel context) and the free-text search, kept outside the DOM so re-renders don't clear the search box — [Crew]
- `personMatchesCrewDbFilter()` / `sortCrewDbGroup()` / `toggleCrewDbFilterPanel()` / `toggleCrewDbFilterDept()` / `toggleCrewDbFilterRole()` / `setCrewDbFilterField()` / `toggleCrewDbFilterFlag()` / `clearCrewDbFilter()` / `crewDbActiveFilterCount()` / `crewDbFilterPanelHTML()` — Crew database's filter panel (multiselect departments, lead company, roles, exclude-Talent/exclude-other-companies, sort). Its trailing row is the shared `filterPanelFootHTML()` — see **The filter-panel foot** — and `crewDbActiveFilterCount()` is what gates that row's "Clear filters" link — [Crew]
- `filterPanelFootHTML()` — **the one trailing row every filter panel ends with**, shared by Crew database (D-1.2), Crew on this project (T-2.6) and Budget (T-6.0). Renders `.filter-panel-foot`: the panel's own exclusion checkboxes, a hint describing the current scope, and a "Clear filters" link **shown only when a filter is actually narrowing what you're looking at**. Only the markup and that visibility rule are shared — each panel passes its own active-filter signal and its own clear action. See **The filter-panel foot** for the full rule and why it isn't more shared than that — [Shared/utility functions, Crew, Budget]
- `outputMenuRowHTML()` (Phase AP) — **the one Copy/Export trigger + collapsible-panel shell**, shared by Budget (T-6) and Preview & Export (T-7). Same trigger, same shell, deliberately DIFFERENT menu contents: each tab passes its own open flag, its own toggle and its own panel body (`budgetOutputPanelHTML()` / `exportPanelBodyHTML()`). Same split as `filterPanelFootHTML()` — markup and placement shared, state and action not. See **The output menu** for the full rule, the collapse-idiom choice and the VAT decision — [Shared/utility functions, Budget, Preview & Export]

## Server-side: Supabase Edge Functions (Phase AI Scan)

The first piece of server-side logic this project has ever needed — everything else
is static/client-side, reading and writing Supabase directly from the browser via the
`sb` client. This exists solely because the Anthropic API key can't go in a public
static site.

- `supabase/functions/ai-scan/index.ts` — a thin proxy, nothing more. Accepts
  `{messages, crewSummary, locationSummary}` from the frontend, builds the system
  prompt (matching instructions + the two summaries embedded directly in it), calls
  the Anthropic Messages API with the three tool definitions below, and returns the
  raw `content`/`stop_reason` back untouched — no business logic, no persistence, the
  frontend owns all of that. Reads `ANTHROPIC_API_KEY` via `Deno.env.get()` — set as a
  Supabase secret (`supabase secrets set ANTHROPIC_API_KEY=...`), never in code.
  Deployed via the Supabase MCP `deploy_edge_function` tool, project
  `ioueoaasqnseuhrtzhbz`, `verify_jwt:true`. CORS locked to
  `https://tegidc.github.io` only.
  - ⚠️ **This repo has no tool/CLI access to set Supabase secrets, and shouldn't be
    given the actual key value even if it did** — that's a credential, handled outside
    chat. The Edge Function deploys and runs correctly without it (it returns a clean
    `"AI Scan isn't configured yet"` error rather than crashing).
  - ✅ **The key HAS since been set** (confirmed in Phase R by probing the live
    function — it now answers `"Invalid JSON body"` to a malformed POST rather than
    the config error, which means it got past the `Deno.env.get` check). The earlier
    note here said AI Scan "can't actually talk to Claude until a human runs
    `supabase secrets set …`"; that is **no longer true** and was stale. The frontend
    check added in Phase R (`checkAiScanConfigured()`) reads exactly this signal.
  - `propose_shoot_date` (date, label, notes) / `propose_location` (name,
    address_or_notes, optional match_id) / `propose_crew` (name, department — enum of
    `DEPARTMENTS` — role, optional match_id) — the three tools. `match_id` is
    deliberately a *property Claude omits* rather than an explicit null for "no
    match" — cleaner for the model, and the frontend already treats a missing/unknown
    id as "no match" defensively (`crewById(match_id)`/`locById(match_id)` returning
    falsy). No `propose_task` / `propose_schedule_item` — see the Overview Tasks
    section above for why the former is a parked, planned follow-up once a Tasks-style
    bucket exists for uncertain info, and MAP.md's own history for why the latter is
    parked indefinitely, not planned.
  - Model is `claude-sonnet-5`, matching the build brief's "Sonnet-tier, check the
    current recommended string rather than assuming one" — this was Anthropic's
    current Sonnet model ID at build time. If this ever needs bumping, it's the one
    constant to change, in one file.

---

# Section codes

Short handles for the app's tabs, sections and tools, so a request can name a screen
instead of describing it ("tighten up T-2.2" rather than "the days-on-site checkbox
grid on the Crew tab"). A convenience aid, not something every request has to use.
It pairs with the function map above: MAP.md codes the *code*, this codes the *UI*.

The `T-` numbers follow the tab order left to right, which is also the working order —
coarse information first, finest detail last.

## T — Project tabs

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **T-1** | **Overview** | The project itself | `renderProjectOverview()` |
| T-1.1 | · Project details | Client, title, initial shoot date, log line, description | `saveProjectOverview()` |
| T-1.2 | · Shoot day count | Day-count field, two-way synced with T-5 | `syncShootDayCount()` |
| T-1.3 | · Shoot day reduction | Picker for which day(s) to lose when reducing the count | `shootDayReductionPanelHTML()` |
| T-1.8 | · Quick add | Four-button row (Shoot date / Location / Crew / AI Chat) at the bottom of the Project details card, no header or collapse of its own, reusing AI Scan's and Add Location's own commit functions (Phase Quick Add; AI Chat folded in and the divider removed in the follow-up). The shoot-day form mirrors T-5.2's Day details + Production brief field-for-field. Sits here on screen but numbered .8 — codes are stable handles, allocated when a section is built, so existing references keep pointing at the same thing | `quickAddSectionHTML()` |
| T-1.4 | · Tasks — Flags | Live, computed, click-to-fix warning pills — the original three (missing dates/locations/crew) plus three toggle-able rules (Phase Tasks) | `buildTaskFlags()` |
| T-1.5 | · Tasks — Manual tasks | Title/note/tick, persisted per project | `addProjectTask()` |
| T-1.6 | · AI Scan (AI Chat) | Chat + document attachments, proposes shoot dates/locations/crew as tool-use cards (Phase AI Scan). **No longer its own section** — since the Phase Quick Add follow-up it's the "+ AI Chat" fourth button in T-1.8's row; code kept for the chat mechanics themselves | `aiScanChatBodyHTML()` |
| T-1.7 | · Danger zone | Delete project + its shoot days | `deleteProject()` |
| **T-2** | **Crew** | Who's on the project, and on which days | `renderProjectCrew()` |
| T-2.1 | · Roles | ONE CARD PER PERSON (Phase BK): checkbox / Edit / Name / Show as PLUS the fronted entry's Role / Rate, all on one shared row since Phase BN; a stacked-away entry (2+ roles) gets its own Role/Rate row below | `crewRolesRowHTML()` |
| **T-2.0.2** | · · Role chip | Phase AZ/BE, folded to ONE renderer in Phase BM. `roleBannerHTML()` draws the role chip on every one of the six sub-tabs, and the chip IS the roles-menu trigger — AZ's separate "+" marker is gone and its has-other-saved-roles weighting is not replaced (T-2.0's chevron/"+N" already carries it) | `roleBannerHTML()` → `openRolesMenu()` |
| **T-2.0** | · Person block | Phase BK/BL — the shared card every one of the six sub-tabs renders: person-level facts and — since **Phase BN** — the FRONTED entry's own cells all render onto ONE shared row (`.pb-head`), columns aligned across every block; a stacked-away entry still gets a genuine separate row (`.pb-role-row.pb-role-extra`) below. Collapses to the fronted entry + a muted "+N"; no chevron when one entry is visible. Nothing persists — no open/closed state anywhere, no per-person total ever | `buildPersonBlocks()` / `personBlockWrapHTML()` |
| T-2.0.1 | · · Fronted entry | Phase BL — the one real entry a collapsed stack shows: most days in the CURRENT PHASE (`prepDaysOf()` on T-2.9, the shoot-day signal everywhere else INCLUDING T-2.1), ties by `roleSeniorityRank()`. Recomputed on load and tab-switch only, never on an edit | `frontedEntryOfBlock()` |
| T-2.2 | · Days on site | Person block; day checkboxes + row All + remove belong to whichever entry they're on — the fronted entry's render on the shared head row since Phase BN, a stacked-away entry's on its own row (a position is keyed to an entry) | `crewAssignRowHTML()` |
| T-2.3 | · Hotel | Person block; the night checkboxes (incl. the night before Day 1) and All sit on the shared head row unconditionally — hotel is keyed to crewId. Collapsible hotel summary (room-booking table, per-night table — Phase O) below it | `hotelSummaryHTML()` / `toggleHotelNight()` / `toggleHotelPre()` |
| T-2.4 | · Travel | Person block; the one travel method per person per project sits on the shared head row. Collapsible transport summary (cost fields + per-day method-count grid with a Daily cost row, derived by crossing travel method against days-on-site — Phase W) below it | `crewTravelRowHTML()` / `transportSummaryHTML()` |
| T-2.5 | · Catering | Person block; the three Breakfast/Lunch/Dinner rows are person-level and always their own rows below the head. Collapsible catering summary (cost fields + Breakfast/Lunch/Dinner-by-day grid with a Daily cost row — Phase P2) below it | `crewCateringBlockHTML()` / `cateringSummaryHTML()` |
| T-2.6 | · Filter panel | Departments, roles, lead company, days (OR/AND), exclusions, sort, group-by. Foot row shared with T-6.0/D-1.2 — see **The filter-panel foot** | `projectCrewFilterPanelHTML()` / `filterPanelFootHTML()` |
| T-2.7 | · Bulk select & actions | Select all (filtered), bulk remove, bulk edit lead company. Phase BK: a block's checkbox selects the PERSON (its visible entry ids). Phase BL: entry-level bulk fields (rate, days, role) hit only the fronted/visible entry; person-level ones (hotel, travel, catering, Show as) still cover the whole person | `bulkActionBarHTML()` / `bulkEditPanelHTML()` |
| T-2.8 | · Add from crew database | Department-grouped picker | `addCrewToProject()` |
| **T-2.9** | · Pre-production | Prep days and optional date marks per crew ENTRY, plus the entry's shared rate, positioned between Roles and Days on site in the view-switcher (Phase BJ moved it here from the retired **T-8**; codes are stable handles allocated when a section is built, not tied to on-screen position, so this is a NEW code rather than a renumbered T-8). Inherits Crew's shared toolbar, filter/sort/group-by, expand/collapse and bulk-select — no chrome of its own. ⚠️ No totals of any kind | `renderProjectCrew()` (`crewGridView==='preprod'`) |
| T-2.9.1 | · · Entry row | Role (`roleBannerHTML()`; since Phase BM the chip itself opens the roles menu) / two bare number fields — rate and days, no column headers, no inline labels / the marks indicator. Since Phase BN the FRONTED entry's cells render on the SAME row as the block checkbox and Name, not a second `.pb-role-row`; a stacked-away entry (2+ roles) still gets its own row | `prepRowHTML()` |
| T-2.9.2 | · · Date marks calendar | Per-entry, one open at a time; click or drag to mark. Stored as a flat array of dates — the drag is selection only, never a stored range | `prepCalendarHTML()` |
| T-2.9.3 | · · Soft counter | "5 days booked · 6 dates marked", muted, no emphasis when the two differ — a mismatch is valid and is never flagged | `prepCounterText()` |
| **T-3** | **Locations** | Where the project shoots | `renderProjectLocations()` |
| T-3.1 | · Location × day grid | Which days each location is used | `locDayGridHTML()` |
| T-3.2 | · Add location | ONE button → search the Locations database as you type, with "create new location" as the last row of the same result list (Phase Q) | `toggleLocAdd()` / `locAddResultsHTML()` |
| ~~T-3.3~~ | ~~· Add a new location~~ | Merged into T-3.2 by Phase Q — there is no second add button | — |
| **T-4** | **Tech** | Project-wide technical defaults | `renderProjectTech()` |
| T-4.1 | · Tech specs — project defaults | Frame rate, resolution, delivery, colour, timecode, codec | `techSpecFieldsHTML('pj')` |
| T-4.2 | · Shot numbering | Continuous vs reset-each-day | `saveProjectTechSpecs()` |
| T-4.3 | · Camera designations (project) | Operator order → letters; unmanned cameras | `renderCameraDesignations('project')` |
| T-4.4 | · Tech specs roundup | Collapsed-by-default summary (rows + camera designations table) of the project defaults, with its own Copy button — same table markup as T-6.3, which keeps its own copy of this block (Phase P1) | `renderTechSpecsRoundup()` |
| **T-5** | **Shoot Days** | The per-day detail | `renderProjectDays()` |
| T-5.1 | · Day tabs | Day switcher + New day | `dayTabsBarHTML()` |
| T-5.2 | · General information | Day #/date/call, brief, parking, notes, locations, weather, hospital, parking lookup — one bound card, `.subhead`-divided (Phase N item 1), matching T-1.1 | `sdBlock('general', …)` |
| T-5.3 | · Schedule | Time/duration rows, insert, reorder, bulk time shift | `addSchedRow()` / `shiftScheduleTimes()` |
| T-5.4 | · Position assignments | Call times, grouped by company → department → role seniority (Phase N item 2) | `renderPositionAssignments()` |
| T-5.5 | · Tech specs & cameras (day) | Day-level override of T-4.1 / T-4.3 | `sdBlock('tech', …)` |
| T-5.6 | · Per-day crew override | Role/dept/company for this day only | `dayOverrideFormHTML()` |
| **T-6** | **Budget** | Cost visibility only, rolled up from data already entered on other tabs — not a working budget (Phase Budget) | `renderProjectBudget()` |
| T-6.0 | · Filter & output | Phase Refinement/R16 — tick shoot days and/or departments to cost part of the shoot, plus the Per Person sort (R4) and the Copy/Export controls (R1). Scopes all four views at once, so it sits above the switcher, not in it. Nothing ticked = whole project. Foot row shared with T-2.6/D-1.2 — see **The filter-panel foot** | `budgetFilterPanelHTML()` / `filterPanelFootHTML()` / `copyBudget()` |
| T-6.1 | · Summary bar | Total (ex-VAT) / VAT / Total (inc-VAT) when itemized, or a single VAT-inclusive Total when not — always visible above the view switcher | `budgetSummaryBarHTML()` |
| T-6.2 | · Per Department | Crew day-rate cost by canonical department, plus three project-wide extras rows (Catering/Travel/Hotels) below it | `budgetDepartmentViewHTML()` |
| T-6.3 | · Per Person | Flat list — Name, Role, editable Day rate (per-project override) with its Save-to-database icon (Phase AG), VAT checkbox (Phase AH), Days worked, Subtotal | `budgetPersonViewHTML()` |
| T-6.4 | · Per Day | One collapsed row per shoot day (day number + short location label + total), expanding to that day's own department + extras breakdown | `budgetDayViewHTML()` |
| T-6.5 | · Costs | Phase AF — the Hotel/Catering/Travel cost fields, editable from inside Budget too (same underlying fields as their home tabs, not a copy) | `budgetCostsViewHTML()` |
| **T-7** | **Preview & Export** | The finest-detail choices and the outputs | `renderProjectPreview()` |
| T-7.0 | · Format panel | Collapsible Filter-style panel: Printable/WhatsApp selector, the four section checkboxes that gate all three outputs, and both output actions (Copy, Download .xlsx) | `exportPanelHTML()` |
| T-7.1 | · Call sheet preview | Formatted card — Client block, then crew Position assignments, then Talent block, then co-production groups (Phase N item 3) | `renderPreviewCard()` |
| T-7.2 | · WhatsApp text | Plain-text version for the full crew (no tech specs) — same Client/Positions/Talent/co-production ordering as T-7.1 | `buildWAText()` |
| T-7.2b | · Hotel summary | Same room-booking table + per-night table as T-2.3's Hotel summary, shown again here below the WhatsApp text | `hotelSummaryHTML()` |
| T-7.3 | · Tech specs | Camera/technical crew reference + camera designations, per the selected shoot day (resolved override vs. project default). Kept here as-is even after Phase P1 added the project-level version at T-4.4 — this one stays day-aware, T-4.4 doesn't | `renderTechSpecsSection()` |
| T-7.4 | · Transport summary | Same cost fields + per-day method-count grid as T-2.4, shown here too when Travel is ticked (Phase Q) | `transportSummaryHTML()` |
| T-7.5 | · Catering order | Per-day headcounts + dietary requirements | `renderCateringExport()` |
| T-7.6 | · Excel export | Multi-sheet .xlsx — Call Sheet plus one sheet per ticked section (Phase Q) — same Client/Positions/Talent/co-production ordering as T-7.1. No longer a block of its own: it's the Download .xlsx button in T-7.0 | `downloadExcel()` |
| ~~**T-8**~~ | ~~**Pre-production**~~ | **Retired by Phase BJ — Pre-production is no longer a top-level project tab.** See **T-2.9**, under Crew, for the same screen (unchanged content, new home). Historical: Phase BD built it as a sibling tab between Crew and Locations, numbered .8 despite its screen position because codes are allocated when a section is built | → **T-2.9** |
| ~~T-8.1~~ | ~~· Entry row~~ | Retired alongside T-8 | → **T-2.9.1** |
| ~~T-8.2~~ | ~~· Date marks calendar~~ | Retired alongside T-8 | → **T-2.9.2** |
| ~~T-8.3~~ | ~~· Soft counter~~ | Retired alongside T-8 | → **T-2.9.3** |

## D — Databases (project-independent, the source of truth)

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **D-1** | **Crew database** | Every crew member, searchable, grouped by department | `renderCrewDatabase()` |
| D-1.1 | · Departments & sub-departments | Admin panel: structure + Heads of Department | `renderDeptAdminPanel()` |
| D-1.2 | · Filter panel | Departments, roles, lead company, exclusions, sort. Foot row shared with T-2.6/T-6.0 — see **The filter-panel foot** | `crewDbFilterPanelHTML()` / `filterPanelFootHTML()` |
| D-1.3 | · Crew record form | Basics / Camera & equipment / Logistics & sizing / About & extras / Private | `crewFormHTML()` |
| D-1.4 | · Crew read-only view | Everything on file, one table | `crewViewHTML()` |
| D-1.5 | · Add saved role dialog | Pick or create a role for a person | `addRoleDialogHTML()` |
| **D-2** | **Locations database** | Every location, with address, contacts, access | `renderLocationsDatabase()` |
| D-2.1 | · Location form | Address search, map preview, access/recce/parking notes | `locFormHTML()` |
| D-2.2 | · Nearest hospital / parking | OpenStreetMap Overpass lookup, saved onto the location | `lookupAmenityForForm()` |

## S — Settings

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **S-1** | **Settings** | App-wide font and brand colour, reached from the sidebar | `renderSettings()` |
| S-1.1 | · Fonts | Phase R/R15 — one picker per role: display/headings, labels, body text | `FONT_CHOICES` |
| S-1.2 | · Brand colours | Brand colour (light backgrounds) + sidebar accent (dark), driving every tint | `applyAppSettings()` |
| S-1.3 | · Preview | A sample call sheet card, so a pick can be judged before it's used | `renderSettings()` |
| S-1.4 | · Company | Read-only `COMPANY`. Deliberately not editable — see the Phase Q section | `COMPANY` |

## G — Global chrome

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **G-1** | Sidebar | Databases, project list, + New project, Settings | `renderSide()` |
| **G-2** | Mobile top bar & drawer | Burger, title, slide-out nav | `toggleDrawer()` / `setTopbarTitle()` |
| **G-3** | Welcome screen | Landing state when no project is open | `renderWelcome()` |
| ~~**G-4**~~ | ~~Sample data reset~~ | **Removed in Phase AS (G12)** — the section and its button are gone; first-load auto-seeding survives in `initApp()` | — |
| **G-5** | New project form | Create a project (auto-creates its first shoot day) | `renderNewProject()` |
| **G-6** | Grid keyboard navigation | Arrows / Home / End / Enter across checkbox grids | keydown handler, `GRID_ROW_SELECTOR` |
| **G-7** | Undo toast | Phase R/R17 — ~10s "Undo" after a delete or bulk edit, restoring a pre-action snapshot | `finishUndo()` / `undoLastAction()` |
| **G-8** | Autosave & "Saved" flash | The debounced per-key autosave behind Overview/cost fields, and the status flash every save path shares | `scheduleAutosave()` / `flashStatus()` |

## X — Server-side

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **X-1** | AI Scan Edge Function | The only server-side code in the project: a thin Supabase Edge Function proxying the Anthropic API so the key never reaches the browser | `supabase/functions/ai-scan/index.ts` |

## Style audit — pattern names (Phase Style Review)

`style-audit.html` is a standalone interactive decision tool at the repo root (not
linked from `index.html`'s nav — open it directly). It copies the app's real CSS
verbatim from `index.html` so every example is styled by the app's actual rules, not
a re-implementation. For each flagged inconsistency (heading styles, eyebrow labels,
box styles, dividers, expand/collapse patterns, dead icons, etc.) it lets you
click-to-pick a preferred option and/or add a notes field, then an "Export all
decisions" button (`exportDecisions()`) compiles the picks/notes into a single block
of text to paste back for follow-up phases. Sections: Typography, Colors, Spacing,
Component behaviors, Icons (existing), Icons (candidates). Purely diagnostic — makes
no changes to `index.html` or app styling itself.

## Fonts & Icons review page (Phase Fonts)

`style-audit-fonts.html` — second review page, same click-to-pick + notes + "Export all
decisions" system as `style-audit.html`, also standalone at the repo root and not
linked from `index.html`. Copies the app's CSS and its `ICONS` object verbatim so every
example and every icon is the real thing. Eleven sections: font families, size ladder,
weights vs what's actually loaded, sizing/alignment, input boxes & dropdowns,
checkboxes, general section rules, dividing lines, the Crew "All" controls, icons, and
secondary colour. 18 decisions.

The dividing-lines section counts only **lines drawn on to divide** — a rule added
under each item in a list that is already grouped. It deliberately excludes the row
structure of things that genuinely function as a table, column-header rules, the
reorderable schedule rows, and form-control borders; the user drew that distinction
explicitly and it changes the conclusion. Measured on the ROW 2026 sample project
(66 crew, 11 departments, 6 days):

| Screen | Drawn dividers | Heading rules |
|---|---|---|
| Overview | 0 | 2 |
| Preview & Export | 0 | 8 |
| Shoot Days | 8 (`.cam-row`) | 21 |
| Tech | 8 (`.cam-row`) | 4 |
| Crew — Roles | 55 (`.roles-grid-row`) | 13 |
| Crew — Days on site | 55 (`.crewgrid-row`) | 13 |
| Crew — Catering | 121 | 14 |

So drawn-on dividers are almost entirely a **Crew tab** problem. Preview & Export draws
none — its 165 lines are all real table structure on a document that gets printed.
Shoot Days reads well because it runs 21 heading rules against 8 drawn lines; Crew
inverts that ratio and repeats grouping the department heading already states.
Catering doubles up: each person gets a `.crewgrid-catering-person` rule *and* sits
inside `.crewgrid-row`. Re-measure rather than assuming these numbers still hold.

Two defects it documents, both checkable against the font request on line 8 of
`index.html`:
- **Fraunces 500 is loaded but never used** — every `--disp` rule renders at 700.
- **Jost 700 is used but not loaded** — `.dept-code` and the mobile checkbox tick ask
  for it, so the browser synthesises a fake bold. Jost is requested at 400/500/600.

## The decisions (Phase Q)

**Format and Include are two questions, not one list.** *Format* is the SHAPE of the
output — a formatted call sheet you print, or plain text you paste into a chat.
*Include* is WHICH of the four optional content areas that shape carries. Rolling
them into one list of five options would have forced a choice between "WhatsApp" and
"WhatsApp with hotels", which is not a choice anybody has.

**The Format panel is the Filter component, reused.** Same construction as the Crew
tab's Filter: a `.crew-header-filter` toggle in a `crewToolbarHTML()` row, with the
`.filter-panel` below the row rather than inside it, and Include rendered as plain
`.filter-chips` labels so it inherits the chip styling instead of a bespoke rule set
(the first cut had its own `.export-include*` rules — those are gone). The toggle
summarises state the way the Filter's `(N)` count does: current format, plus
"(N sections hidden)" when any are unticked.
⚠️ It starts **open**, unlike the Crew Filter. It holds the tab's two output ACTIONS,
and hiding the button you came to press behind a caret is the same mistake
`pvBlockHTML()` already avoids by keeping Copy buttons visible in collapsed headers.

**One Copy button for the whole tab.** The WhatsApp block's own Copy moved into the
panel and `copyWA()` is gone — two buttons doing one job is how things drift.
`exportOutputText()` builds from data rather than scraping the preview card, because
a collapsed block is `display:none` and `innerText` skips it: a DOM-scraped copy
would quietly depend on which blocks happened to be open. Both formats copy the same
plain-text call sheet honouring the Include checkboxes; only the label differs.

**Excel is not a third format.** It is the printable content in a spreadsheet
container: same call sheet, same sections, same order, just a different file to hand
to an accountant or a caterer. So it's a download button in the Format panel rather
than a third radio option, and it obeys the same four checkboxes — one sheet per
ticked section on top of the always-present Call Sheet. A section with no
data produces no sheet whether ticked or not; an empty tab is worse than a missing
one. If Excel ever needs a genuinely different content shape it earns a third format
then, not before.

**Tech specs is now a checkbox, not a hardcode.** The WhatsApp text used to exclude
tech specs unconditionally, explained only by a hint under the box ("the version for
the full crew"). That rule is now the Tech specs checkbox, so the crew-wide message
is one untick away and the choice is visible. Hotels, Catering and Travel are
appended to the text the same way — each is exactly the text its own Copy button
produces, via the shared `*Lines()` builders, so the two can't drift.

**Settings is a sidebar screen, not a cog panel.** The app has one existing pattern
for a project-independent thing you go and look at, and it's the sidebar screen
(Crew database, Locations database). A floating cog panel would have been a second
pattern for no gain.

**Settings works entirely through tokens the stylesheet already had.**
`applyAppSettings()` writes `--disp`, `--tape`, `--tape-light` and the six `--tint-N`
onto `documentElement`; no CSS rule knows settings exist. That only works if every
brand-coloured surface actually reads a token, which is why the two "deliberate
one-offs" the Style Review left inline — the sidebar active gradient and the
selected-role/HoD pill — became `--tint-5` and `--tint-6`. A token that isn't a
token can't follow the brand colour.
⚠️ Only add a family to `FONT_CHOICES` (was `HEADER_FONTS`) if it's in the Google Fonts `<link>` on line 8
(or a system stack). Anything else silently renders as the fallback.

**No multi-tenancy.** Single hardcoded `COMPANY`, shown read-only on the Settings
screen. Per-company logo and detail upload is explicitly parked until the app is used
by someone outside Little Film Productions — only font and colour are configurable.

**One way to add a location.** The Locations tab used to carry two buttons that
overlapped: a database dropdown and a separate "add a new location" form. Which one
you needed depended on something you could only learn by opening the dropdown and
reading it, and picking wrong meant backing out and starting again in the other. Now
one button opens a search field, and "create new location" is the last row of the
same result list, prefilled with what you typed — so the answer to "is it already
saved?" arrives as you type and either outcome continues from where you already are.
Both paths still end where they always did (`addLocToProject()` / `saveLocation()`
with `locFormContext` set). The Shoot Day form's `quickAddLocationForDay()` is a
different entry point on a different screen and was left alone.

## Phase R — the accepted recommendations (R1–R18)

Built from the `refinement-review.html` answers. Items marked **not wanted** (R3, R5,
R7, R9, R12) were explicitly declined and should not be re-proposed.

- `dbStamp` / `dbBase` / `dbClone()` / `mergeDB()` / `applyMergedDB()` (**R18**) —
  **the fix for two tabs silently overwriting each other.** `saveDB()` writes a whole
  collection back on every save, so with a plain upsert the second writer won
  outright and the first one's edit vanished with no error. Saves are now a *guarded*
  write — conditional on the row's `updated_at` still matching `dbStamp[key]` — and on
  a failed guard the remote value is fetched and three-way merged against
  `dbBase[key]` (the snapshot matching that stamp) before retrying, up to 3 attempts.
  Per record: whichever side actually changed it wins (ours on a tie), additions from
  both sides are kept, and a deletion is only honoured against a side still matching
  base. Works because every record carries a stable `id`; arrays of bare strings
  (`db:travelmethods`, `db:coprocompanies`) have no identity to merge on, so ours
  simply wins — they're short config lists, not records — [Shared/utility functions]
  - `applyMergedDB()` writes the merged result back into the live arrays **in place**
    (`splice`, never reassign): other code holds references to `crewDB`/`projectsDB`
    etc., so reassigning would leave half the app rendering the pre-merge copy —
    [Shared/utility functions]
  - Stamps store the value **as Postgres returns it**, not the JS string sent. The two
    differ textually (`…123Z` vs `…123000+00:00`) and only compared equal because
    Postgres casts them; round-tripping the canonical value removes that reliance —
    [Shared/utility functions]
  - ⚠️ Nothing outside `loadDB`/`saveDB` changed. `saveDB(key, value)` is called
    identically from every call site — don't "help" by adding conflict handling at a
    call site — [Shared/utility functions]
- `taskDraftTitle` / `taskDraftNote` (**R6**) — the Tasks Title/Note draft, held
  outside the DOM for exactly the reason `aiScanDraftText` documents: a re-render
  replaces the whole tab body and blanks any input not sourced from state, so
  collapsing the Tasks box or ticking another task used to wipe a half-typed task.
  Cleared only once a task is actually added — [Overview]
- `aiScanConfigState` / `checkAiScanConfigured()` (**R14**) — says up front when the
  server has no Anthropic key, instead of letting the feature look normal and fail at
  the moment somebody presses Send. **The probe is free**: the Edge Function checks for
  the key *before* it parses the body and long before it calls Anthropic, so a
  deliberately malformed POST returns either the config error (no key) or
  `"Invalid JSON body"` (key set) with no model call. A network/CORS failure leaves the
  state `'unknown'` and shows nothing — the function's CORS is locked to the live
  github.io origin, so opening `index.html` off disk can't reach it and a warning there
  would be crying wolf. Rendered as `.ai-notconfigured` (amber, informational —
  deliberately not `.ai-error` red: nothing has gone wrong and the user didn't cause
  it) — [Overview]
- `.filter-inverted` (**R13**) — an active Inverse now says so on the Crew Filter
  toggle itself. It flips what the entire list means, and it was previously only
  visible as a tick buried inside the open panel — [Crew]
- **R8 — the three orphaned flag settings are deleted.** `flagNoLocation` /
  `flagNoCrew` / `flagNoDayRate` were removed from `SETTINGS_DEFAULTS` and their
  `!==false` guards dropped from `buildTaskFlags()`; those three rules are now
  unconditional. Phase Overview Reorder had already removed every UI path to them, so
  they had been permanently `true` with no way to reach them — kept then "in case a UI
  returns", declined now. Do not re-add without a UI — [Overview]

- `budgetDeptFilter` / `toggleBudgetFilterDept()` / `budgetActiveFilterCount()`
  (**R16**) — a department scope, living in the SAME panel as the day filter rather
  than becoming a per-view control. Applied to the people list inside
  `buildBudgetData()`, so the summary bar, Per Department, Per Day and Per Person
  can't disagree about what's being costed. `clearBudgetFilter()` clears both
  (renamed from `clearBudgetDayFilter()` once it stopped being day-only — see the
  Budget section).
  **Verified**: filtering to Cinematography produces £26,400, exactly the figure that
  department's row shows in the unfiltered Per Department view — [Budget]
- `budgetSort` / `setBudgetSort()` / `budgetOrderedPeople()` (**R4**) — Per Person is
  sortable: department (default, HoD-first — the order every other crew list uses when
  nothing is chosen), name, cost, day rate, days worked, or missing-a-rate-first (a
  to-do list, so those come first). Ties fall back to name so the order is stable
  rather than depending on however the array arrived. The ordering lives in ONE
  function used by both the screen and the export, so they can't drift — [Budget]
- `budgetExportRows()` / `budgetExportTitle()` / `copyBudget()` /
  `downloadBudgetExcel()` (**R1**) — Budget was the only summary screen in the app
  with no way to get the numbers out. Built from the same `buildBudgetData()` the
  screen renders from, and honouring the active filter (a budget sent while filtered
  should say so — the export leads with a "Filtered to" line rather than quietly
  emitting the whole project). Rows mirror the visible view. ⚠️ **Phase AP changed
  `budgetExportRows(data, view)` and `budgetExportTitle(view)` to take the view as an
  argument** instead of reading the global `budgetView` — the output menu can export
  a view you aren't standing on. Still one data path: every figure comes from the
  `buildBudgetData()` handed in. AP also gave Costs a shape of its own — R1 quietly
  exported the Per Department shape for it; it now emits the per-unit RATES (through
  the very same `getCateringCosts()`/`getTransportCosts()`/`getHotelCosts()` getters
  `budgetCostsViewHTML()` renders from, not a second copy) followed by the extras
  totals those rates produce, which still come from `buildBudgetData()`. No VAT split
  on it: per AO's "VAT follows the person" these supplier costs carry none. The .xlsx
  filename now carries the view too, so exporting all four doesn't leave four files
  fighting over one name. Since Phase AO each view has **two** row
  shapes, switched on `budgetVatToggle` exactly as the screen does — Per Department
  and Per Day gain Ex-VAT/VAT/Inc-VAT columns and Per Person a VAT amount when
  itemized — so the export still mirrors what's on screen rather than a second
  rendering of the same data; verified cell-for-cell against the rendered DOM in all
  three views — [Budget]
- `budgetCostBlocks` / `toggleBudgetCostBlock()` / `toggleAllBudgetCostBlocks()`
  (**R16**) — the Costs tab's three groups collapse, on the shared
  `toggleBlock`/`applyBlockState` plumbing (prefix `bc`) rather than a fourth
  hand-rolled toggle. Open by default: unlike a summary block you glance at, this tab
  exists to be typed into — [Budget]

- `UNDO_WINDOW_MS` / `undoPending` / `beginUndo()` / `finishUndo()` / `dismissUndo()` /
  `undoLastAction()` / `renderUndoToast()` / `undoCollectionFor()` /
  `undoRestoreCollection()` (**R17**) — **undo for destructive actions only**, per the
  brief: the four deletes (project, crew, location, shoot day), the bulk
  remove-from-project, and the bulk Lead Company edit. Not a general edit history.
  Those are the actions that lose work with no way back, and bulk edit sharpened that
  considerably since one click can rewrite 60 people at once — [Shared/utility functions]
  - It snapshots whole collections before the action and restores them on Undo. Crude
    on paper, but exactly right for this app's shape: every mutation already ends in
    "saveDB the whole collection", so a snapshot IS the unit of change and a restore
    can't half-apply — [Shared/utility functions]
  - ⚠️ `undoRestoreCollection()` **reassigns** (`crewDB = data`) rather than splicing,
    because `deleteCrew()`/`deleteLocation()`/`deleteProject()` reassign too — the
    snapshot has to become the live array, not be poured into whatever array happens
    to be there. This is the opposite of `applyMergedDB()` (R18), which splices *because*
    it must keep the existing array identity for held references. Don't unify them —
    [Shared/utility functions]
  - `beginUndo(keys)` is called AFTER the `confirm()` passes but BEFORE any mutation;
    `finishUndo(label, snaps)` after the save. A cancelled confirm never reaches either,
    so no toast appears for an action that didn't happen — [Shared/utility functions]
  - `undoLastAction()` bounces to the welcome screen if the currently-open project no
    longer exists, rather than leaving the UI pointed at a record that just came back —
    [Shared/utility functions]
  - `.undo-toast` is bottom-left so it never covers the primary actions on the right;
    the Undo link uses `--tape-light`, the AA-compliant green for dark backgrounds —
    [Shared/utility functions]

- `FONT_CHOICES` / `labelFont` / `bodyFont` / `settingsBlocks` /
  `toggleSettingsBlock()` / `toggleAllSettingsBlocks()` / `settingsBlockHTML()`
  (**R15**) — Settings gained **one font picker per role** and collapsible sections.
  The three roles are the three the design system has always had (Fraunces display →
  `--disp`, Oswald label → `--label`, Jost body → `--body`); settings just makes each
  choosable instead of only the first. Same mechanism as before, three times: write
  the token the stylesheet already declares, so no CSS rule needs to know settings
  exist. `headerFont` **keeps its original key** so settings saved before R15 still
  load; `resetAppSettings()` needed no change because it copies `SETTINGS_DEFAULTS`
  wholesale. Sections collapse on the shared plumbing (prefix `st`), open by default —
  it's a short screen you visit in order to change something — [Shared/utility functions]
  - `HEADER_FONTS` was renamed to `FONT_CHOICES`: once all three roles read the same
    pool the old name was actively misleading. Do not look for `HEADER_FONTS` —
    [Shared/utility functions]

- `locationFeeForDays()` / `locationTotal` / `loc.fee` (**R2**) — **location fees, the
  one cost Budget used to exclude.** Entered once on the location record (`nlFee`,
  free text read by the same `parseRateNumber()` as the crew rate field) and spread
  **evenly across the shoot days that location is actually used on**, so Per Day and
  the day filter stay honest instead of a lump landing arbitrarily on Day 1: £900 over
  3 days contributes £300 to each — [Budget, Locations]
  - ⚠️ The per-day share is divided by the days used across the **whole project**, not
    the days currently in scope. The share is a property of the deal and must not
    change size depending on what the filter happens to be showing — [Budget]
  - A location used on a day via `d.locationId` **or** `d.additionalLocationIds` counts
    (`usesLocation()`). A location with no day assigned can't be apportioned, so it's
    charged whole against the project-wide figure only — visible beats silently
    dropped — [Budget]
  - Adds a **Locations** row to `budgetDeptExtrasTableHTML()` (shared by the
    project-wide Per Department view and each Per Day breakdown) and to the export.
    Budget's own description no longer says location fees aren't included, and the
    "nothing to cost" empty states now test `locationTotal` too, so a project with only
    a location fee doesn't render as empty — [Budget]
  - **Verified**: a £900 fee on a location used across all 6 ROW 2026 days produced
    £150 per day, summed back to exactly £900, raised the project total by exactly
    £900, and filtering to one of those days showed £150 rather than the whole fee —
    [Budget]

### Sort / Group-by audit (Phase R, R16 follow-up)

All **7 sort** options and all **13 group-by** options were exercised against the real
ROW 2026 project (66 crew, 6 days). **Every one runs without error and preserves the
full roster** — no option silently drops anybody. `daysOnSite` returns 208 rows across
7 buckets, which is correct and intended: it is the one deliberately multi-bucket
grouping (a person on 3 days appears in 3 groups).

Two options are **inert on real data — not broken, but currently pointless**, because
the fields they read have never been filled in:

| Option | State | Why |
|---|---|---|
| Group by → Sub-department | One bucket, "No sub-department" | **0 of 66** crew have `subDepartment` set |
| Sort → "By department (HoD first)" | Identical to "By name" | **0 of 66** crew have `isHoD` set, so the HoD tiebreak does nothing |

⚠️ The second is the more interesting one: **the Heads-of-Department mechanism is
currently having no effect anywhere in the app.** `sortHoDFirst()` is the default
ordering for the project crew list, Position Assignments, the crew-database roster and
Budget's Per Person view — but with no `isHoD` flag set on anyone it degenerates to a
plain name sort in all four. The control to set it exists (`toggleHoD()`, in the
Departments & sub-departments admin panel on D-1) and simply hasn't been used. Nothing
to fix in code; worth knowing before anyone concludes HoD ordering is broken.

Also confirmed sensible rather than suspicious: `vat` yields 2 buckets because the
roster holds 3 "Yes" and 0 "No" (the rest blank), and `catering` yields 2 because
"Vegetarian" is the only dietary value in use.

## Phase Quick Add — the decisions

**What it is.** A collapsible "Quick add" box on Overview (T-1.8) with three controls
— shoot date, location, crew — for jotting one record at a time while setting a
project up, without navigating to the Shoot Days / Locations / Crew tabs. Not an AI
feature and not related to AI Scan beyond sharing its commit functions.

**Add-only, on purpose.** No bulk add, no editing of existing records, no AI. It's a
shortcut into data that already has full editing on its own tab, not a second place to
manage any of it. If it ever starts growing edit affordances, that's the signal it has
outgrown Overview and the work belongs on the relevant tab instead.

**Reuse was the whole point.** Every one of the three commits calls the function that
was already there — `addShootDayFromProposal()`, `addLocToProject()` /
`startNewLocationFromSearch()`, `addCrewToProject()` / `addNewCrewFromProposal()` —
the same ones AI Scan's accept flow and the unified Add Location flow call. A second
implementation of any of the three would be a bug. The location control goes further
and renders the Locations tab's own search widget verbatim (same functions, same ids),
which is safe only because the two tabs share one body element and never coexist.

**Crew's search widget is a mirror, not a new pattern.** Crew has no unified add flow
of its own yet — its tab still has the old `#addCrewPick` `<select>`.
`quickCrewResultsHTML()` mirrors `locAddResultsHTML()` line for line rather than
inventing a different idiom. If the Crew tab ever gets the Phase Q treatment, generalise
these two into one widget rather than adding a third.

**Placement.** Project details → Quick add → Tasks → AI Scan → Danger zone. It sits
above Tasks and AI Scan because it's basic manual data entry rather than an assistance
feature; built and looked at, that order does read correctly — the box you'd use while
first filling a project in comes before the two that comment on a project that already
exists.

**Follow-up (same day): the shoot-day form now matches Shoot Day General.** It first
shipped with an invented Date/Label/Notes trio, which meant Quick add had its own
vocabulary for a record the app already has a form for. Replaced with T-5.2's actual
Day details + Production brief field set — Day #, of (total), Shoot date, All-crew
call, one-per-line brief — using the shoot-day **record** field names as the draft
keys, so nothing needs translating. Day # and the total prefill to the next number and
climb on their own. `addShootDayRecord()` was extracted so both callers still land on
one commit path, and `parseBriefLines()` so both parse the brief identically.

> ⚠️ **Pre-existing, not introduced here, but worth a decision:** `dayTotal` is a
> per-record field and **nothing in the app keeps the days in sync**. Add a 7th day —
> by Quick add, + New day, or the Overview day-count field, all three behave the same
> — and days 1–6 still say "of 6" while day 7 says "of 7", which shows up in the call
> sheet output (`Day 1 of 6`). Flagged rather than silently fixed, since normalising
> it would rewrite existing records across every project.

**Verified** by driving the live page with `saveDB()` stubbed (so nothing reached
Supabase — confirmed afterwards by querying `app_data` directly): all three add paths,
the existing-record and create-new branches of both search controls, both empty-field
guards, mode toggling, box collapse, and the Locations tab still working off the shared
widget.

**Follow-up — AI Scan folded into the row, divider removed.** User request: turn AI
Scan into a fourth "quick" button in the same row and style as Location/Crew (labelled
"+ AI Chat"), move the whole row to the bottom of Project details, and remove the
"Quick add" subsection header/divider entirely. Done — the box described above no
longer exists as a distinct thing:

- The four buttons (Shoot date / Location / Crew / AI Chat) render with no wrapping
  `.section`, no `sd-block-head`, no collapse of their own — just a `.toolbar` sitting
  inside Project details' own card, directly below its Saved-status line. `quickAddMode`
  gained a fourth value, `'ai'`; clicking "+ AI Chat" opens the AI Scan chat panel in
  the exact slot the other three panels use.
- **AI Scan's own standalone section is gone.** `aiScanSectionHTML()` — its `.section`,
  `sd-block-head`/`dept-caret` toggle, and `aiScanOpen`/`toggleAiScanBlock()` state —
  no longer exist. The chat markup itself was extracted unchanged into
  `aiScanChatBodyHTML()`, called from `quickAddSectionHTML()`'s `'ai'` branch. Every
  other AI Scan mechanic — `aiScanMessages`, `sendAiScanMessage()`, proposal cards,
  `checkAiScanConfigured()`, the per-project reset — is untouched; only the container
  moved.
- The "Placement" note above (Project details → Quick add → Tasks → AI Scan → Danger
  zone) is now stale — read as: **Project details (incl. the quick-add row) → Tasks →
  Danger zone.**

> Not extended to the location/crew search widgets' own styling — those still render
> inside the row exactly as before, just physically inside Project details' card
> rather than a separate one. Nothing about their behaviour changed.

**Verified**, `saveDB()` stubbed as before, confirmed clean against `app_data`
afterwards: all four buttons render in one row with matching style, no "Quick add" or
"AI Scan" heading appears anywhere in the rendered page, the AI Chat panel opens with
the exact same chat UI as before (input, send, attach, proposal cards), its draft text
and message history survive switching to another control and back, a project switch
still resets the chat per the existing rule, and Shoot date/Location/Crew all still
work unchanged.

## Refinement review page (Phase Refinement)

`refinement-review.html` — fourth review page, same click-to-pick + notes +
"Export my answers" system as `style-audit.html` / `-fonts` / `-detail`,
standalone at the repo root, not linked from `index.html`. Unlike those three it
is **not** a styling diagnostic: it records what Phase Refinement changed (Part
1), lists 18 recommended feature changes that were deliberately NOT made because
they'd alter behaviour (Part 2, R1–R18, each with an effort estimate), and
carries the staged multi-user proposal (Part 3, the AL groundwork).

⚠️ The single most important item on it is **R18 / Part 3 Stage 1**: `saveDB()`
writes an entire collection back on every save, so two browser tabs open on the
same data can silently erase each other's edits. That is a *today* risk, not a
multi-user one — it needs no accounts, no login and no second person to happen.

⚠️ **R10 is the one item on that page with no recorded answer** — "Remember the AI
Scan conversation" (size M). R3/R5/R7/R9/R12 were explicitly declined and
R1/R2/R4/R6/R8/R13–R18 were built; R11 is queued. R10 was simply never answered and
has no Build Log entry. Surfaced again by Phase AQ — see `gate1-review.html`.

## Gate 1 review page (Phase AQ)

`gate1-review.html` — fifth review page, same standalone / not-linked-from-`index.html`
convention as `style-audit.html` / `-fonts` / `-detail` / `refinement-review.html`, and
the same click-to-decide + notes + export system. Covers the whole app, not one area:
Part 1 style, Part 2 code, Part 3 efficiency/elegance and readiness for Views.

Triggered by the Gate 1 threshold — ~93.2 KB of changed code since the last whole-app
review (`7aa5af0`), against a 40–50 KB threshold. **21 findings: 10 [A]
behaviour-neutral, 9 [B] behaviour-affecting, 2 [C] architectural**, each tagged with
its bucket so a cosmetic pass can't carry a behaviour change along with it.

⚠️ **Stage 1 was audit only — nothing in `index.html` was changed, and this entry is
the only edit made to this file.** Do not treat any finding on that page as applied.
Stage 2 applies whatever the user accepts; the [B] and [C] items are explicitly not
batchable.

**Stage 2 progress.** All 21 findings were accepted. **Phase AR** landed G11, G13,
G16 and G15; **Phase AS** landed G12, G18, G19, G17 and G14; **Phase AT** landed
G6, G1, G2, G7, G8, G9 and G10 across three commits — see their sections.
Phases **AU / AV / AW** carry the rest.

⚠️ **R10 ("Remember the AI Scan conversation") was DECLINED and closed by the user on
7 Aug 2026.** `gate1-review.html` still lists it as unanswered — that page is stale on
this point. Do not implement or re-propose it.

Two things worth knowing without opening it: the two known open bugs were reproduced
and turn out to be more specific than described — "+ Add crew member" *does* render its
form, but ~104px of 602px lands on screen because the button is the last element on a
12,400px page and nothing scrolls to it (the Locations equivalents call
`scrollIntoView`; `toggleCrewForm()` doesn't); and `dayTotal`'s resync problem is
really a derived-value-that-got-stored problem, so the recommended shape is to delete
the field rather than sync it. Verified with `saveDB()`/`scheduleAutosave()` stubbed
and confirmed clean against `app_data`.

## Phase AR — Gate 1 Stage 2, part 1 of 5: save path & data correctness

Four Bucket B findings from `gate1-review.html`: **G11, G13, G16, G15**. The other 17
accepted findings belong to phases AS/AT/AU/AV/AW and were deliberately not pulled
forward. Verified against the live ROW 2026 London project with `saveDB()` /
`scheduleAutosave()` stubbed, confirmed clean against `app_data` afterwards (all nine
row timestamps and byte sizes unchanged).

### G11 — a save that failed must never say "Saved"

Every failure path in `saveDB()` was `console.error(…)` + a bare `return`, so it
returned `undefined` on failure exactly as on success and the callers flashed "Saved"
either way. `saveDB()` now returns `{ok:true}` or `{ok:false, kind, detail}`.

**Two kinds, deliberately not one** — conflating them was most of the harm:

| kind | what happened | is anything lost? | treatment |
|---|---|---|---|
| `'unsaved'` | the write never landed — network down, Supabase error, failed merge re-read | **No.** The edit is still in the live in-memory collection, and since every save writes the whole collection, the next successful save of that same collection carries it | amber banner, "Not saved yet", inline `Not saved` |
| `'discarded'` | three guarded writes in a row lost their guard (R18's give-up path) | **Yes.** The merged state exists only in this tab; reload and it is gone | red banner, "Your last change was not saved", inline `Not saved — change lost` |

**Why a banner and not just the inline status.** Only four call sites flash a status
at all; the other ~80 mutate, save and re-render, and a failure there was invisible
even in principle. `saveDB()` raises the banner itself so every call site is covered
without any of them having to remember to — the same "nothing outside `loadDB`/`saveDB`
changed" discipline R18 set. It persists until the same key saves successfully or the
user dismisses it; a 2-second flash is the wrong register for "this is not in the
database". It carries a **Retry save** button (retries the value that failed —
post-merge for the conflict case, which is the value that should land).

- `'discarded'` **outranks** `'unsaved'` for the same key, so a later network blip
  can't quietly demote "your change was not saved" to "not saved yet".
- `clearSaveFailure()` only clears on a success for the **same key** — `db:projects`
  saving fine says nothing about whether `db:shootdays` ever landed.
- `saveShootDay(thenGenerate)` no longer jumps to Preview & Export on a failed save:
  the call sheet it would generate is one the database has never seen.
- ⚠️ **The eleven grid interactions that `await saveDB()` before rendering were NOT
  touched** — that is **G14**, deliberately the next phase, and it is only safe now
  that this exists.

### G13 — `db:roles` was missing from `DB_OBJECT_KEYS`

**What the omission was actually causing:** nothing, but by luck rather than design.
`DB_OBJECT_KEYS` governs exactly one thing — the empty value `loadDB()` falls back to
when a row is missing or the read errors (`{}` vs `[]`). It does **not** gate merging:
`mergeDB()` branches on the runtime shape of the values it is handed, and
`applyMergedDB()` switches on the key by name, so **`db:roles` has always been merged
correctly and was never bypassing R18's three-way merge** — worth stating plainly,
since a key missing from the storage contract is exactly the shape of a quiet
data-loss bug. The real effect was that a missing/errored `db:roles` read returned
`[]` instead of `{}`, and three unrelated guards absorbed it: `initApp()`'s
`!Array.isArray(savedRoles)` check, `mergeDB()`'s tolerance of an array as base, and
the fact that a null stamp routes to a plain upsert rather than the merge path.
Behaviour after the fix is identical (verified: `ROLES_BY_DEPT` still an object, the
`db:roles` row exists and was last written 2026-08-03); the contract is now correct
rather than accidentally survivable.

### G16 — the weather "last fetched" stamp

`saveShootDay()` rebuilt `d.weather` unconditionally including
`fetchedAt: new Date().toLocaleDateString()`, and autosave fires on any input on that
tab — so editing a schedule row restamped the forecast as fetched today. Now written
**only** in `fetchWeatherForDay()`, as an ISO timestamp; `saveShootDay()` preserves
whatever the record holds. `weatherFetchedLabel()` formats ISO for display and passes
legacy localised strings (and the sample data's `'sample'`) through untouched.

> ⚠️ **Not retroactive.** Existing records keep whatever stamp they have, which is
> wrong until the next real fetch. Saying that out loud rather than implying the fix
> reaches backwards.

### G15 — Budget's Catering/Travel join key

`buildBudgetData()` matched columns with `cols.find(c=>c.dayNum===d.dayNum)` and
scoped extras with `new Set(days.map(d=>d.dayNum))`. `dayNum` is free text the user
types, non-unique, routinely blank (`d.dayNum||'?'` appears ~20 times, so blank is an
expected state) and mixed-type. `buildCateringSummaryGrid()` and
`buildTransportSummary()` now carry `dayId: d.id` and the join and scope use it.
`dayNum` stays on the column purely as its heading.

**Demonstrated on ROW 2026 with Day 4's `dayNum` typed as `"3"`** (in memory only):

| | old join (`dayNum`) | new join (`dayId`) |
|---|---|---|
| Day 4's catering cost | £114.00 — *Day 3's figure* | £126.00 |
| Day filter = Day 4 alone | £240.00 — *both days' costs* | £126.00 |

Not a crash; a wrong number in a budget. Every stated reconciliation invariant still
appeared to hold, because both sides read the same wrong figure.

**Phase AO reconciliation re-verified on ROW 2026 — identical before and after, which
is the point.** Read off the rendered screen, not the data object:

| scope | summary VAT | Per Dept VAT column | Per Person VAT column | Per Day VAT sum | Per Day ex-VAT sum |
|---|---|---|---|---|---|
| unfiltered | £3,517.00 | £3,517.00 | £3,517.00 | £3,517.00 | £59,890.00 = summary ex-VAT |
| day 3 only | £617.00 | £617.00 | £617.00 | £617.00 | £10,575.00 |
| dept = Cinematography | £2,965.00 | £2,965.00 | £2,965.00 | £2,965.00 | £30,440.00 |
| Cinematography + day 3 | £525.00 | £525.00 | £525.00 | £525.00 | £5,595.00 |

Copy/.xlsx export matches the screen in both Per Department (total row
£59,890.00 / £3,517.00 / £63,407.00) and Per Day (all six day rows identical to the
rendered per-day totals).

> ROW 2026's own catering rates are all £0.00, so its catering join is numerically
> inert — the £114/£126/£240 figures above come from temporarily setting a real lunch
> rate in memory. Travel (£1,660.00 project-wide) exercises the same join for real.

> ⚠️ The live figures moved between Phase AO and here (ex-VAT £51,290.00 → £59,890.00)
> because of writes from another session on 7 Aug. The baseline above was re-established
> immediately before the change, not carried over from AO.

**Still outstanding from Gate 1: phases AS / AT / AU / AV / AW.**

## Phase AS — Gate 1 Stage 2, part 2 of 5: behaviour fixes & bugs

Five Bucket B findings, deliberately split across **two commits** so the riskiest one
is revertable on its own:

- **Commit A** — G12, G18, G19, G17. Four independent fixes.
- **Commit B** — G14 alone. See its own section below.

Verified against the live ROW 2026 London project with `saveDB()`/`scheduleAutosave()`
stubbed, confirmed clean against `app_data` afterwards.

### G12 — `resetAndReseed()` deleted

Deleted rather than guarded, per the user: *"I don't use it and don't imagine I will at
this point."* The button, its `confirm()`, the handler and the Welcome screen's whole
"Sample data" section are gone.

**The auto-seed path was checked first and is independent** — `seedSampleData()` had
two callers and only one of them was the button; `initApp()`'s
`if(!crewDB.length && !locationsDB.length && !projectsDB.length)` branch is untouched.
Exercised end-to-end (emptied the collections in memory, ran the branch: 77 crew,
2 projects, 7 shoot days seeded, four `saveDB` calls attempted). `seedSampleData()`
itself stays — that is **G20**, which was never built. (It had been pencilled in for
"Phase AV"; that letter went to the abandoned Budget View V1 workstream instead and has
been reverted — see **Budget View V1 — abandoned and reverted** at the bottom of this
file. G20 is still open and unassigned.)

> The section's explanatory copy went with the button. Its remaining sentence described
> a first-run behaviour the user only ever experiences *before* they could read it, and
> a landing-screen section with a heading and no control is dead UI. Flagged as a
> judgement call rather than assumed.

### G18 — "+ Add crew member" opened below the fold

`toggleCrewForm()` now scrolls `#crewFormWrap` into view on open, matching
`editLocation()` / `startNewLocationFromSearch()`. Measured before and after on the
live 88-crew database:

| | before | after |
|---|---|---|
| scroll on click | 0px | 11,567px |
| form on screen | ~104px of 602px (17%) | **602px of 602px (100%)** |
| form top in viewport | y=11,685 (off-screen) | y=118 |

Confirmed by hit-testing `elementFromPoint()` at three viewport heights, not just by
rectangle maths.

> ⚠️ **Found while verifying, and it changed the fix:** with
> `prefers-reduced-motion: reduce` set, this browser does not merely skip the animation
> for `scrollIntoView({behavior:'smooth'})` — **it does not scroll at all.** Measured:
> scrollY stayed at 0 across 3.6 seconds of polling, while the identical call with
> `behavior:'auto'` landed the form at viewport y=118 immediately. So `toggleCrewForm()`
> picks its behaviour instead of hard-coding `'smooth'`. **The two Locations call sites
> still hard-code `'smooth'` and carry the same latent hole** — left alone as outside
> G18's scope, but it is a real defect and wants its own decision.

### G19 — `dayTotal` was stored per record and nothing resynced it

Now derived: `shootDayTotal(d)` = `projectDays(d.projectId).length`, resolved in
`buildFullData()`, which is the single point all four consumers (preview card, WhatsApp
text, tech-specs lines, .xlsx) read from — so one change fixed all four.

| | before | after |
|---|---|---|
| 6 days | Day 1–6 "of 6" | Day 1–6 "of 6" |
| add a 7th | days 1–6 stuck at **"of 6"**, day 7 "of 7" | **all seven "of 7"** |
| delete it again | mirror problem | **all six back to "of 6"** |

Also removed: the stored field from `makeShootDayRecord()`, the seven seed records, and
Quick add's `of (total)` input and its `quickDayDraft.dayTotal` key (there was nothing
left for it to write; the draft's keys still mirror the record's field names exactly,
which is the point of that object). The Shoot Day form's `of (total)` input is **kept
but `readonly`** — "Day 3 of 6" is the context that form is read in, so showing the
derived number is better than removing it, and read-only is more honest than accepting
a value that gets ignored.

**Stored-shape decision: strip on next write, not on read, and no migration.**
`saveShootDay()` does `delete d.dayTotal`, so a record sheds the stale field the next
time that day is saved for any reason.

- *Why not strip on read:* it is a migration in disguise, and it would put a new special
  case in `populateShootDay()` — right next to the `weather.fetchedAt` mixed-format
  handling Phase AR added. Explicitly kept clear of that. (Verified: `fetchedAt` still
  reads `03/08/2026` unchanged across a save that stripped `dayTotal`.)
- *Why not leave it inert:* nothing reads it, so correctness doesn't depend on when it
  goes — but a persisted field that looks authoritative and isn't is exactly what caused
  this finding.

### G17 — AI Scan kept only the last attachment error

`handleAiScanFileInput()` collects failures into an array and joins them one per line;
`.ai-error` gained `white-space:pre-line`. Verified with four files (two oversize, one
unreadable `.docx`, one good): **three separate error lines, and the good file still
attached.** Previously only the last of the three would have been shown, with the other
two silently dropped.

### Commit B — G14: render first, save after

The eleven highest-frequency interactions used to `await saveDB()` before repainting,
so every yes/no in a grid cost a network wait — and R18 made that potentially two
round-trips. The audit measured the full 66-crew × 6-day re-render at **4.2ms**, so
none of the delay was rendering. `renderProjectBody(); saveInBackground(…)` replaces
`await saveDB(…); renderProjectBody()` in all eleven:

`toggleCrewOnDay` · `toggleHotelNight` · `toggleHotelPre` · `toggleMeal` ·
`setTravelMethod` · `toggleAllForPerson` · `toggleAllMealForPerson` · `toggleLocOnDay` ·
`addCrewToProject` · `removeCrewFromProject` · `toggleProjectTask`

**Measured: 31ms to repaint against a 250ms simulated round-trip.**

#### ⚠️ The coupling to G11 — do not break this

This change is what the whole AR → AS sequence was ordered around. The `await` used to
be the only thing coupling the screen to the save actually succeeding. Removing it makes
the render optimistic, so **G11's failure banner is now the only thing standing between
the user and a fast, silently lossy grid.** If a future session "simplifies" G11's error
path, these eleven interactions become silently lossy — strictly worse than the slow
version this replaced. The two findings are one mechanism; don't decouple them.

**Verified before changing anything, and again after:** all eleven raise the banner on a
forced failure, because every one goes through `saveDB()` and `saveDB()` reports from the
choke point itself — no call site has to remember to.

| function | key reported | banner |
|---|---|---|
| `toggleCrewOnDay`, `toggleHotelNight`, `toggleMeal`, `toggleAllForPerson`, `toggleAllMealForPerson`, `toggleLocOnDay` | `db:shootdays` | ✓ |
| `toggleHotelPre`, `setTravelMethod`, `addCrewToProject`, `toggleProjectTask` | `db:projects` | ✓ |
| `removeCrewFromProject` | both (reports the later one) | ✓ |

#### What the user sees when an optimistic render is contradicted

**A failed save is never rolled back**, and that is deliberate — a future session must not
"fix" this by reverting the mutation:

- **`'unsaved'`** — the edit is still live in memory, and because every save writes the
  WHOLE collection, the next successful save of that collection carries it. The screen is
  therefore *correct*, not stale; the banner says "not saved yet". Rolling back would
  destroy a perfectly good edit.
- **`'discarded'`** — `applyMergedDB()` has already spliced the merged result into the
  live arrays and called `renderMain()`, so memory holds the resolved state and the screen
  already shows it. The banner says it isn't in the database.

On top of that, `saveInBackground()` re-renders on any failure, so the screen is
guaranteed to match memory at the moment the banner appears rather than still showing what
was painted optimistically before the round-trip.

#### Interaction with R18's merge and R17's undo — both checked

- **R18 merge:** simulated a guard failure followed by a successful retry (2 update
  attempts, remote holding another writer's edit). Both edits survived, and the **screen
  matched memory** for both checkboxes afterwards — `applyMergedDB()`'s own `renderMain()`
  supersedes the optimistic paint, so an optimistic render can't outlive a merge that
  resolved differently.
- **R17 undo:** untouched — none of the eleven call `beginUndo()`. Re-verified end to end
  anyway (delete a shoot day → 5 days + toast → Undo → 6 days restored, toast gone), and
  as a bonus it confirms G19 composes with it: the derived total followed 6 → 5 → 6.

#### Considered and deliberately NOT done: serialising saves per key

Rapid toggling now fires overlapping saves for the same key. That was examined rather than
assumed safe, and it is safe **because of the shape this app already has**: `saveDB()` is
handed the live array itself, not a snapshot, so an in-flight save's "mine" is always
current, and JS's single thread means no mutation can tear. A later save carries
everything an earlier one did. Adding a per-key promise queue would have changed
`saveDB()`'s concurrency semantics globally for a problem that isn't there.

**Phases AT / AU / AV / AW remain.**

## Phase AT — Gate 1 Stage 2, part 3 of 5: consolidation

Seven Bucket A findings — **G6; G1, G2; G7, G8, G9, G10** — split across three commits so
the two findings that are not actually behaviour-neutral (G7, G10) sit in their own
gated commit, separate from the genuine no-ops. Verified against the live ROW 2026
London project with `saveDB()`/`scheduleAutosave()` stubbed in a verification-only copy,
confirmed clean against `app_data` afterwards. AU/AV/AW were not pulled forward.

### Commit A — G6, dead code

`.grid.g4` was never applied by anything in the file — confirmed by grepping every
static `class="grid g…"` occurrence (20× `g2`, 11× `g3`, 0× `g4`) and confirming there is
no dynamic construction of a `g…` class anywhere in the script, so removing it and
simplifying the eight `:not(.g3):not(.g4)` guards to `:not(.g3)` cannot change which
elements match — a mathematically guaranteed no-op, not just an untested one. Also
removed the same dead `.g4` from the mobile `.grid.g2, .grid.g3, .grid.g4{grid-template-
columns:1fr}` rule and the stale `.g3/.g4` mention in the comment above the guards.

`.dept-admin-block` had no CSS rule and carried its box (border/radius/padding/margin)
as a duplicated inline `style=`. Promoted to a real class with the identical values —
checked with `getComputedStyle()` before and after, byte-identical.

⚠️ **`.sritem:hover` deliberately left untouched.** The audit's own suggested fix — give
it a real `--tint-3` fill, since it currently computes to a no-op against `.srlist`'s
existing background — is a visible UX addition, not a removal, and the audit itself
flagged it as "a small deliberate visual addition — flag it as such rather than slipping
it in." Left for a deliberate decision outside a no-op commit rather than folded in here.

Verified: `node --check` clean, `<style>` block brace-balanced (439/439), zero remaining
`g4` references, page loads with no console errors at desktop and mobile widths, the
Departments admin panel and a mobile add-crew form both render pixel-identical to
before. `app_data` unchanged (newest write still the pre-session state) — nothing written.

### Commit B — G1, G2: shared UI components

**G1 — `filterToggleHTML({open, count, onToggle, inverted})`**, next to
`filterPanelFootHTML()`, same split: markup and the "(N)" rule shared, each of the
three panels (Crew-on-project, Budget, Crew database) keeps its own open flag, its
own count and its own toggle function. `.crew-header-filter` (matched by zero CSS
rules — it only looked right because `.crew-header-row span` happened to reach it)
is gone; all three now render one real class, `.filter-toggle`.

The two properties that actually differed, picked deliberately rather than
defaulted:
- **display** — not a real choice. `.filter-toggle` declares `inline-flex`
  throughout; Crew-on-project's and Budget's instances compute to `flex` because
  they're flex items inside `.crew-header-row` and get blockified — an automatic
  consequence of where they sit, not something the class controls. Confirmed with
  `getComputedStyle()`.
- **margin-bottom** — a real choice. Kept out of `.filter-toggle` itself and added
  as `.section > .filter-toggle{margin-bottom:8px}`, which only ever matches Crew
  database's standalone trigger (the other two sit inside `.crew-header-row`,
  which already supplies its own bottom margin — giving the trigger its own too
  would have doubled up and added uneven space when the row wraps). Verified with
  `getComputedStyle()` on all three: Crew-on-project/Budget both `0px` (unchanged),
  Crew database `8px` (unchanged).

**G2 — `collapsibleSectionHTML({state, prefix, key, title, inner, actions, id,
wrapClass, onToggle})`**, next to `applyBlockState()`/`toggleBlock()`. Converted
five of the eight builders (seven call sites): `settingsBlockHTML`,
`techBlockHTML`, `renderTasksSection`, `pvBlockHTML`, and the three summary blocks
(`hotelSummaryHTML`/`cateringSummaryHTML`/`transportSummaryHTML`). `onToggle` was
added to the audit's proposed param list — every caller needs its own toggle call
and the audit's shorthand didn't spell it out, but "each caller keeps its own
toggle function" requires it.

⚠️ **Three left out deliberately — eight builders were not eight instances of one
thing:**
- `sdBlock()` — the whole `.sd-block-head` is the click target, not a caret+title
  span, and its body carries `.sd-block-body` (the only one of the eight that
  does). A real structural difference, exactly as the audit flagged.
- `budgetDayViewHTML()`'s row — trailing `<strong>total</strong>` plus a bespoke
  inline margin (`margin:14px 0 0`), also flagged by the audit.
- **`budgetCostsViewHTML()`'s `group()` — not flagged by the audit, but found to
  have a real reason of its own.** Its inline margin-top
  (`key==='catering'?'0':'18px'`) stands in for the `.sd-block:first-child`
  auto-zero rule that already exists elsewhere in this file, using 18px instead of
  the default 26px for non-first blocks. Routing it through the shared component
  would have meant either a param only this one caller ever uses, or silently
  changing its spacing. Left for a second pass rather than guessed at — reported
  here since the audit's own "six near-identical" count implied this one should
  convert.

Verified: `node --check` clean, `<style>` brace-balanced, `renderPreviewCard()`'s
call-sheet header (a ninth, genuinely different builder — full two-line header,
no `.sd-block-head` at all, not in the audit's G2 list) confirmed untouched. Every
converted section exercised in the live app (Overview Tasks, Tech's two blocks,
all four Settings blocks, all four Preview & Export blocks, Hotel/Catering/
Transport summaries on both Crew and Preview & Export) — correct title, correct
caret state, toggles independently, collapses/expands correctly. The three left-out
builders (Shoot Days' `sdBlock`, Budget's Day view, Budget's Costs view) re-checked
after the change and confirmed byte-identical to before. `app_data` unchanged —
nothing written.

### Commit C — G7, G8, G9, G10: logic consolidation

The two findings that are not behaviour-neutral, isolated in their own commit as
planned. Both output changes are cosmetic (formatting/wording), not calculation —
demonstrated below with real numbers, temporarily set in memory only (same
technique as G15's verification), never saved.

**G7 — the four stray formatters now point at `budgetFmt()`**
(`const fmt = budgetFmt;` at each of the four sites — declaration hoisting makes
`budgetFmt` being defined later in the file a non-issue). Every underlying number
is unchanged; only the string representation changes.

⚠️ **The audit's own blast note over-stated the surface — corrected here.** It said
"the Hotels/Catering/Travel sections of the WhatsApp export" all pick up the
change. Traced each: the WhatsApp *TRAVEL* section calls `transportSummaryLines()`
(affected), but the WhatsApp *CATERING* section calls a **different, unaffected
function** — `cateringOrderLines()` (Breakfast/Lunch/Dinner counts and dietary
notes, no cost figures at all) — and the WhatsApp *HOTELS* section's
`hotelSummaryLines()` was never in G7's scope and also carries no cost figures.
Only Travel's WhatsApp section actually changes.

Demonstrated on ROW 2026 with a lunch rate of £12.50 and a dinner rate of £18 set
temporarily in memory (ROW 2026's real catering rates are all £0.00, per the AR
verification note — inert on this project):

| Surface | Before | After |
|---|---|---|
| Catering summary grid, Daily cost row (per day) | `662.50` / `685.50` / `680.50` ×2 / `662.50` ×2 | `£662.50` / `£685.50` / `£680.50` ×2 / `£662.50` ×2 |
| Catering summary grid, Total | `Total catering cost: 4034.00` | `Total catering cost: £4,034.00` |
| Catering Copy button | `— Daily cost 662.50` … `Total catering cost: 4034.00` | `— Daily cost £662.50` … `Total catering cost: £4,034.00` |
| Travel summary grid, Daily cost row | `115.00` / `305.00` ×4 / `325.00` | `£115.00` / `£305.00` ×4 / `£325.00` |
| Travel summary grid, Total | `Total transport cost: 1660.00` | `Total transport cost: £1,660.00` |
| Travel Copy button + WhatsApp *TRAVEL* section (`transportSummaryLines()`) | `— Daily cost 115.00` … `Total transport cost: 1660.00` | `— Daily cost £115.00` … `Total transport cost: £1,660.00` |
| WhatsApp *CATERING* section (`cateringOrderLines()`) | unaffected — no cost figures | unaffected |
| WhatsApp *HOTELS* section (`hotelSummaryLines()`) | unaffected — no cost figures | unaffected |

**Budget itself re-verified unmoved**, as it should be — G7 only touches
formatters *outside* Budget: `£59,890.00` ex-VAT / `£3,517.00` VAT / `£63,407.00`
inc-VAT, identical to the Phase AR baseline.

**G8 — `summaryBlockHTML(key, inner)` + `SUMMARY_BLOCKS` table + module-level
`costFieldHTML(id, label, value)`.** Hotel/Catering/Transport's nine
toggle/jump/wrapper functions collapsed to one `toggleSummaryBlock(key)` and one
`jumpToSummary(key)`, built on G2's `collapsibleSectionHTML()`. The three separate
open-state booleans became one `summaryBlocksOpen = {hotel, catering, transport}`
object — each was only ever read inside its own block, confirmed by grepping every
reference before merging them, so nothing outside these three blocks could have
been reading them individually. All four `costFieldHTML` copies (three
character-identical, Hotel's inline) are now the one module-level function; Hotel's
caller wraps it in the same `flex/gap:18px/margin-bottom:14px` container the other
two already used, replacing the margin that used to sit on the field itself —
`getComputedStyle()` confirmed the rendered gap is unchanged.

Verified: all three blocks open/close independently via `jumpToSummary()`, all
seven field ids (`hcRoomNight`, `ccCost{B,L,D,Delivery}`, `tsCost{Public,Mileage}`)
byte-identical and confirmed present in Budget's Costs tab output, which reuses
the shared `costFieldHTML` but was otherwise untouched.

**G9 — `groupAlpha(rawKeyFn, blankLabel)` / `groupFixed(keyFn, orderedKeys)` +
a `SIMPLE_GROUPERS` lookup**, covering 5 alpha-sorted options (company, role,
subDept, travel, catering) and 4 fixed-order options (hotel, personType, vat,
seniority) — nine of the thirteen `groupBy` branches. `deptCompany` (composite
key), `daysOnSite` (multi-bucket) and `dept` (canonical order + codes, the
default) stay as their own branches exactly as the audit specified.

**Verified by direct comparison, not spot-checked:** ran `buildProjectCrewGroups()`
for all 13 `groupBy` values against the live ROW 2026 crew list (66 assigned) in
both the pre-Commit-C code and the new code, serialised each result (group keys,
labels, codes, and item-id order) and compared — **byte-for-byte identical**
(same length, same hash). Repeated for a cross-section of all 7 `sort` options ×
4 of the newly table-driven `groupBy` values — also byte-for-byte identical.

**G10 — `budgetScopeParts()`**, covering only the "N of M day(s)" segment — the
part that was genuinely duplicated three times, pluralisation bug included. The
department segment was deliberately **not** folded in: `budgetFilterPanelHTML()`
shows a count ("2 departments") next to checkboxes that already show the names,
while the export/output panels show the actual department names, because that's
what the exported text needs to say on its own. That's a real content difference,
not a copy-paste one, so each caller still builds it itself.

Demonstrated by simulating a one-shoot-day project in memory (ROW 2026's `Day 1`
kept, the other five temporarily removed from `shootDaysDB`, day filter set to
that one day):

| Surface | Before | After |
|---|---|---|
| Filter panel hint (`budgetFilterPanelHTML`, already correct) | "Costing 1 of 1 day" | "Costing 1 of 1 day" (unchanged) |
| Export header (`budgetExportRows`) | "Filtered to: 1 of 1 **days**" | "Filtered to: 1 of 1 **day**" |
| Output-menu hint (`budgetOutputPanelHTML`) | "…scoped to your filter (1 of 1 **days**)" | "…scoped to your filter (1 of 1 **day**)" |

Multi-day case re-verified unchanged: ROW 2026's real 6-day project, filtered to
1 day, still reads "1 of 6 days" in all three places, before and after.

### Verification (Commit C)
- `node --check` clean, `<style>` block untouched (no CSS in this commit).
- Orphan sweep: zero remaining references to any of the nine old summary-block
  function/variable names; `budgetScopeParts()` and the G9 helpers used only
  where intended.
- All in-browser checks run against live ROW 2026 London data with
  `saveDB()`/`scheduleAutosave()` stubbed in a verification-only copy; confirmed
  clean against `app_data` afterwards — nothing written, including through the
  in-memory `shootDaysDB`/cost-rate simulations used to demonstrate G7 and G10.

**Phase AT complete. Phases AU / AV / AW remain — seedSampleData() (G20) and the
shoot-day location structures (G21) were not touched, as instructed.**

## The design system, as decided (Phase Refinement)

A consistency pass over everything built since Phase U (Budget, AI Scan, Overview
Tasks, Settings, Add Location, and the X–AE / AF–AH batches). No behaviour
changed; the one addition is Budget's day filter, which was asked for.

**A collapsible head that opens its own `.section` uses `.sd-block-head.flush`.**
Seven places had grown the identical inline `style="margin:0 0 12px;
font-size:15px"` on `.sd-block-head` — Tech blocks, Overview Tasks, AI Scan, the
Hotel/Catering/Transport summaries and Preview & Export's blocks. The
`font-size` was a **no-op** (`.sd-block-head` is already 15px), which is the tell
that nobody knew what the class already did. One modifier class now, same pixels.
Budget's Per Day rows keep their own `margin:14px 0 0` inline — those are rows in
a list, not section heads, and it's a single site.

**There is no `h4` rule, so a bare `<h4>` renders as browser default.** Only
`.ki-item h4` is styled. Six headings had drifted onto bare `<h4>` and were
rendering in the browser's default serif — Budget's Costs tab (Catering / Travel
/ Hotel), the Hotel summary's two table headings, and the catering export's
"Dietary requirements". Now `.subhead` outside a card, `<h3>` inside one
(`.card h3` and `.subhead` are deliberately identical — see the Label family).
⚠️ If a new sub-heading is needed, use one of those two. Don't reach for `h4`.

**`.filter-panel-foot`** — the trailing checkbox/hint/"Clear filters" row at the
bottom of a filter panel. Was inline on the Crew panel's closing `div`; Budget's
day filter needed the same row, so it's a class. All three panels now build it
through `filterPanelFootHTML()` — see **The filter-panel foot** below.
`.filter-clear` is the link itself (was the same inline
`cursor:pointer;color:var(--tape)` repeated on each panel).

**Vestigial ids removed.** Overview Tasks and AI Scan copied the
`${prefix}c-`/`${prefix}b-` id convention from the `applyBlockState` blocks
without the mechanism that reads them — both toggles call `renderProjectBody()`
instead. `tasks-block`, `tasksb-block` and `aisc-block` were looked up by
nothing and are gone. The summary blocks' `hsmc-`/`csmc-`/`tsmc-` ids are **not**
vestigial — those really do go through `applyBlockState()`.

## The filter-panel foot

This app has three filter panels — Crew database (**D-1.2**), Crew on this
project (**T-2.6**) and Budget (**T-6.0**) — and they are differently shaped:
different filter fields, different state objects, different clear functions, one
of them (Budget) with no exclusion checkboxes at all. What they share is the row
at the bottom, and one rule about it.

**The rule: a "Clear filters" link showing means a filter is currently narrowing
what you're looking at.** If nothing is filtered there is nothing to clear, and
a permanently-present link reads as a live control on a list nothing is doing
anything to.

Budget already worked this way (its link was gated on there being a live
day/department scope). The two Crew panels showed it unconditionally. Rather
than leave one panel right and two wrong — or write the gate a third time —
`filterPanelFootHTML()` now builds the row for all three, and the gating is the
shared behaviour rather than one panel's local detail.

```
filterPanelFootHTML({controls, hint, active, onClear})
  controls — the panel's own checkbox <label>s, already-built HTML ('' if none)
  hint     — one line of already-escaped text describing the current scope
  active   — truthy when a filter is live; the ONLY thing gating the link
  onClear  — the panel's own clear call, as an onclick string
```

⚠️ **What is deliberately NOT shared.** Only the markup and the visibility rule
live in the shared function. Each panel keeps supplying:

- **its own "is a filter active" signal** — `crewDbActiveFilterCount()`,
  `projectCrewActiveFilterCount()`, `budgetActiveFilterCount()`. All three
  already existed (they also drive the `Filter (N)` toggle label), so this
  reuses them rather than adding a fourth idea of "active". They deliberately
  count **filters only** — a Sort or Group by choice narrows nothing, so it must
  never light the link up. Verified: setting Sort/Group by alone on any of the
  three leaves the link hidden.
- **its own clear action** — `clearCrewDbFilter()`, `clearProjectCrewFilter()`,
  `clearBudgetFilter()`. Clearing means resetting *that panel's* state object,
  and each also re-renders through a different path (`refreshCrewDatabase()` vs
  `renderProjectBody()`). Folding these together would mean the shared component
  knowing about all three screens. Don't.

Styling: `.filter-panel-foot` for the row, `.filter-clear` for the link. Crew
database used to hand-roll the row with an inline `display:flex;gap:14px…`
instead of the class — that's gone; all three now sit on the same class and so
can't drift apart again.

**Behaviour change, intentional.** The two Crew panels' "Clear filters" links
used to always show and now don't. Budget is unchanged (`budgetActiveFilterCount()>0`
is exactly the `scope.length` it already gated on). If a future panel wants the
link always present, it wants a different rule — argue for it rather than
passing `active:true`.

## The output menu

Phase AP. Cross-referenced from both the **Budget** and **Preview & Export**
sections — it belongs to neither.

This app has two export surfaces, and they had two different affordances.
**Budget** (T-6) fired Copy and Export straight off the toolbar with no menu.
**Preview & Export** (T-7) hid its output actions inside a panel behind a
"Format: Printable" text caret. Same job, two idioms, one of them (Preview's)
the one the user likes.

**The decision, from the user — do not re-litigate it.** ONE trigger on both
tabs; deliberately DIFFERENT menu contents behind it, sharing one feel. Budget's
icon+label treatment is the trigger; Preview's collapsible submenu is the shell.

```
outputMenuRowHTML({open, onToggle, panelHTML, titleText, filterHTML, filterPanelHTML})
  open            — that tab's own open flag
  onToggle        — that tab's own toggle call, as an onclick string
  panelHTML       — that tab's own panel CONTENTS (the .filter-panel wrap is here)
  titleText       — optional tooltip, for state a collapsed trigger can't show
  filterHTML      — optional Filter toggle for the row's left slot (Budget only)
  filterPanelHTML — that Filter's own panel, so it lands above this one and the
                    two panels stack in the same order as their triggers
```

**Which collapse idiom, and why not a third one.** The app has two: the
`sd`/`pv`/`bd`/`bc` block-state objects driven by
`applyBlockState()`/`toggleBlock()`/`setAllBlocksCollapsed()`, and the
filter-panel idiom (a plain boolean + a `dept-caret` in a `crewToolbarHTML()`
row, panel rendered BELOW the row). Budget's filter panel and Preview's format
panel **both already used the second one**, and it's the one that generalises
here: `applyBlockState()` toggles a block's display in place, but this panel has
to render outside the flex row — a full-width panel inside `.crew-header-row`
distorts its alignment every time it opens, the note
`projectCrewFilterPanelHTML()` has carried since Phase Refinement. So the
filter-panel idiom is what got shared, `dept-caret` stays the caret, and nothing
new was invented.

⚠️ **What is deliberately NOT shared** — same split as `filterPanelFootHTML()`
(see **The filter-panel foot**). Only the markup and the placement rule live in
the shared function. Each tab keeps:

- **its own open flag and toggle** — `budgetOutputOpen`/`toggleBudgetOutputPanel()`
  and `exportPanelOpen`/`toggleExportPanel()`. They even differ in default:
  Preview's starts **open** (Phase Q's reasoning still stands — it holds the
  actions you came for), Budget's starts **closed**, because Budget's screen is
  the thing you came for and the menu is a departure from it.
- **its own panel contents** — `budgetOutputPanelHTML()` and
  `exportPanelBodyHTML()`. This is the point of the phase, not a compromise:
  Preview picks an output SHAPE (Printable/WhatsApp) and which sections ride
  along; Budget picks WHICH VIEW's figures and on which VAT footing. Folding
  those into one menu would mean inventing options neither tab wants.

**Styling:** `.output-menu` for the trigger wrap (renamed from `.budget-output`
— it is no longer Budget's; do not look for the old class), `.output-menu-sep`
for the dot between Copy and Export. The panel reuses `.filter-panel`.

### ⚠️ The VAT decision — flagged, per the brief

Budget's menu offers a VAT footing, and the summary bar already has an **Itemize
VAT** checkbox. Two controls silently disagreeing about VAT would be worse than
either alone, so:

**The menu READS AND WRITES the existing `budgetVatToggle`. There is no
export-only VAT flag, and one must not be added.** Picking a footing in the menu
flips the whole screen, visibly; ticking the summary bar's checkbox flips the
menu. One piece of state, so an export can never quietly disagree with the
figures the user was just reading — the exact failure mode a private export-only
flag would have introduced.

The cost of this choice: choosing an export footing changes what's on screen.
That's the honest trade, and the panel's hint says so out loud ("VAT here is the
same setting as *Itemize VAT* on the summary bar — changing it changes the
figures on screen too") rather than leaving it to be discovered.

Note the asymmetry with `budgetExportView`, which is deliberate and not an
inconsistency: the VIEW is export-only state (you can export Per Person while
looking at Per Day) because nothing on screen claims otherwise, whereas VAT is a
footing the screen is actively displaying, so a second one would be a lie.

## The design system, as decided (Phase Detail)

Applied from the `style-audit-detail.html` decisions. Supersedes the Phase Fonts
section where they disagree.

**The Crew toolbar is one component.** `crewToolbarHTML()` and
`crewToolbarSelectAll()` own the bar's markup and ordering — build it there, never
inline. It previously existed only as four loose string variables concatenated inside
`renderProjectCrew()`, which is exactly how its four controls drifted into four
different fonts and shapes. Order is **Select all / Filter … Summary /
Expand-Collapse all**: left is what you act *with*, right is what you act on the whole
list *with*, and the All-type action sits furthest right above the grid's own All
column. No rule under the bar.

⚠️ **`.crew-header-row label` must stay.** Select all is a `<label>`, so the global
`label{font-family:var(--label)}` rule was giving it Oswald 11px while its neighbours
were Jost 12px — the visible reason the bar looked unrelated. That override puts it
back in the toolbar's font. Remove it and the bug returns.

**Company headings are Oswald 700, ink, uppercase.** `.posn-company-header` was
Fraunces 700 15px green, identical to `.sd-block-head` directly above it, so Position
assignments stacked two indistinguishable heading levels. Now block (Fraunces green) /
company (Oswald bold ink) / department (Oswald 11px green) read as three distinct
levels. **Oswald 700 was added to the font request** for this.

**Preview & Export has no rule between people.** `.card td` carries no border;
`.card th` alone carries a 1.5px 35% rule under the column headings. The card stays
white. Phase Fonts kept the per-row borders by reading that table as functional
structure — that was wrong, and this reverses it.

**Short fields use the Tech Specs pattern.** Shoot Days' Day details and Weather rows
are `.ts-grid`/`.ts-field`, not `.grid.g4`. Width classes `fld-xs` 52px / `fld-sm`
78px / `fld-md` 132px / `fld-date` 150px size each box to the value it holds. Long
fields — brief, parking, notes — stay full-width stacked.

**"Show as" is just an input.** No pencil, no edit state, no save button; the
`quickEditShowAsId` flag is gone. `saveQuickShowAs(id, value)` fires on `onchange`,
so it writes only when the value actually changed and focus has left — tabbing through
66 rows saves nothing. It deliberately does **not** re-render, which would steal focus
from wherever you tabbed to next.

**Expand/Collapse-all must decide direction at click time.** `expandCollapseAllHTML()`
takes an `onclickExpr` that calls a *toggle* (`toggleAllShootDayBlocks()`,
`toggleAllTechBlocks()`, `toggleAllPreviewBlocks()`, `toggleAllCrewDbDepts(csv)`) —
never a setter with `true`/`false` baked in. Blocks collapse via direct DOM updates
in `applyBlockState()` rather than a re-render, so anything baked into that markup
goes stale immediately: the control kept saying "Collapse all" *and* kept passing
`true`, so a second click did nothing until another action re-rendered the page.
`toggleBlock()` and `setAllBlocksCollapsed()` both call
`refreshExpandCollapseAll(prefix, …)` to keep the label honest, which also covers
collapsing every block one at a time. Affected Shoot Days (`sd`), Tech (`tt`) and
Preview & Export (`pv`); the Crew database toggle was already correct because
`setAllDeptsCollapsed()` re-renders.

**The crew grid name column is capped.** `minmax(200px,340px)` with a trailing
`minmax(0,1fr)` so spare width lands after the row. It was `minmax(200px,1fr)`, which
swallowed everything — 342px at seven day-columns but **562px at two**, stranding the
checkboxes at the right edge on short projects. 340px is what a six-day project
already gave it, so wide projects are unchanged.

**Role chips are checkboxes, not pills (Phase BE).** `roleBannerHTML()`'s single
banner chip and `rolesTagListHTML()`'s tag-list-editor chips used to be `.pill.dept`
— a tinted-green capsule with no border, the app's one label shape built in a
different visual language from the rounded-rectangle-with-a-border look used
everywhere else. Given a dedicated `.role-chip` class (`.active` modifier for the
currently-active role) rather than restyling `.pill.dept` directly, because that
class is shared with `deptLabelHTML()`'s read-only department badge and the
department-admin panel's sub-department tags — neither of which this phase's brief
covered, and restyling the shared class would have silently changed both. `.role-chip`
reuses the checkbox's own border/radius literals verbatim (Phase Fonts below: `1.5px`
solid, `3px` radius, no fill) rather than a new nearby number, and `var(--text)` for
the chip's text/border colour on `.active` — the same variable the checkbox itself
switches to on `:checked` — with `var(--muted)` for the non-active state in the
tag-list editor (the banner chip is always `.active`, since it's the one role in use).
Deliberate consequence, not compensated for: this removes green from the crew row
entirely — brand presence on that row now falls back to buttons and headers.

⚠️ **Phase BM made the chip a control.** It now carries `cursor:pointer` and an
`onclick` opening the roles menu, on all six Crew sub-tabs. Deliberately **no new
hover/active rule was added** — `rolesTagListHTML()`'s chips have been clickable with
nothing but `cursor:pointer` since before BE, and matching that precedent was preferred
to inventing a hover treatment for one control. `.role-chip`/`.role-chip.active` are
otherwise untouched; the non-`.active` muted state now also does duty as the "no role
set" `—` placeholder.

## Detail review page (Phase Detail)

`style-audit-detail.html` — third review page, same click-to-pick + notes + export
system, standalone at the repo root, not linked from `index.html`. Six sections, 7
decisions: the Crew toolbar, short fields on Shoot Days, lines in Preview & Export,
company headings in Position assignments, the Roles "Show as" cell, and checkbox
column alignment.

Measurements it records, all taken from the live app:
- The Crew header row is `justify-content:space-between`, leaving **481px of empty
  space** at a 1000px viewport between Select all/Filter and Collapse all/Summary,
  growing with the window. Its four controls are four different constructions
  (`<label>`+checkbox, `<span>`+caret, bare `<span>` ×2), assembled inline in
  `renderProjectCrew()` as four separate string variables — nothing owns "the toolbar".
- The Preview & Export call sheet card carries **58 `td` bottom borders**, one under
  every person in Position assignments. `.card td, .card th` has had that rule since
  before any of these phases — it was not added, but Phase Fonts deliberately kept it
  and that was wrong.
- `.crewgrid` uses `minmax(200px,1fr)` for the name column, so it absorbs all slack:
  **342px wide at 7 day-columns, 562px at 2**, stranding the checkboxes at the right
  edge on projects with few days.
- `.posn-company-header` and `.sd-block-head` are typographically identical (Fraunces
  700 15px green), so Position assignments stacks two indistinguishable heading levels.

## The design system, as decided (Phase Fonts)

Applied from the `style-audit-fonts.html` decisions. **Where this contradicts the
Phase Style Review section below, this wins** — several things were deliberately
reversed. The direction is "a cleanly printed paper form, with deviations for
usability".

**Type scale.** Four tokens, one job each: `--fs-name` 14px (names, primary rows),
`--fs-field` 13px (form controls and table data), `--fs-meta` 12px (secondary text,
hints, header controls), `--fs-ctl` 11px (Oswald labels). Replaced eight Jost sizes
running 9–14px, several differing by half a pixel. Tiny caret/glyph sizes (9px) are
left alone — they aren't text.

**Fonts.** Three roles confirmed: Fraunces display headings, Oswald labels, Jost
everything else. **Every Oswald label is 11px / 1.2px tracking** — one size, one
tracking, no exceptions. Case is *not* forced: uppercasing field labels made them
~40% wider and wrapped them out of the label column, so `label`, `.pill` and
`.posn-dept-badge` keep their natural case.

⚠️ **Exception (Phase AN): `.budget-stat .num`, the Budget summary bar's three
totals, is Oswald 700 26px/0.4px tracking**, not a label at 11px. It was Fraunces
before Phase AN too — this isn't "every Oswald use is 11px" being broken, it's the
figure moving font entirely: Fraunces' serif numerals read badly at a glance, and
Oswald's are built for it. Sized up rather than kept at 22px because Oswald's
condensed forms read lighter than Fraunces bold did at the same pixel size; tracking
opened slightly (well under the 1.2px label tracking) for the same reason. The `.lbl`
caption underneath each figure is unchanged Oswald 11px/1.2px.

**Header controls are Jost, not Oswald.** Select all, Filter, Expand/Collapse all,
Summary and the row-level All are things you click, not captions — `--fs-meta`,
sentence case, no tracking. Oswald's uppercase tracking made them read as headings.

**Font loading.** Fraunces requests 700 only (500 was loaded and never used).
`.dept-code` dropped from Jost 700 — which was never in the request and rendered as
synthetic bold — to the 600 used everywhere else.

**Fields are ruled lines, not boxes.** No fill, no border, no radius: a single
`--field-line` rule under the writing area only. Because the label sits in its own
column the rule starts where the writing starts, which is what marks a field as
fillable. 13px text, 6px/8px padding. Focus turns the rule brand green via
`box-shadow` so nothing shifts as you tab. `select.pill-select` is now the same
control — same Jost, same size, same rule — instead of a green pill.

**Two line weights, and they are not interchangeable.** `--line` is
`rgba(17,10,8,.10)` for *drawn divisions* (heading rules, table cells). `--field-line`
is `rgba(17,10,8,.30)` for *form fields*. A 10% line is too faint to read as "fill this
in", so fields need their own weight — don't collapse these back together.

**Checkboxes are an X on a box that never changes fill.** `appearance:none` plus a
`::after` `\00D7`. `accent-color` is gone.

⚠️ **Superseded by Phase Bulk Edit for the mobile day-chips specifically** (`.crewgrid-check`
under `@media(max-width:900px)`, D1/D2/…/Pre on Days on site, Hotel and Catering): they
no longer match the checkbox pattern above. Showing both the X *and* a darker outline on
the same chip read as two signals for one state, so checked is now a single filled-dark
chip (`background:var(--text)`) with no `::after` mark at all, and the chip itself
shrank (`min-height:32px`, `padding:0 7px`, `border-radius:0` — square, not pill-shaped)
so up to 7 fit one row on a phone-width screen without wrapping. The plain-checkbox
pattern in this paragraph still holds everywhere else, including desktop's
`.crewgrid-check` (a real 16×16 checkbox, unstyled).

**Sections have no frame** (model C). No border, no fill, no padding — the Pattern A
heading rule divides, margin spaces. `.formgroup` likewise. Boxes are kept *only*
where one means something: `.card` (the call sheet preview — a sheet of paper, and it
carries a stronger 20% border so it reads as one), dialogs, transient panels
(`.filter-panel`, `.bulk-edit-panel`) and open editing states.

**No drawn line between rows.** `.crewgrid-row`, `.roles-grid-row`,
`.crewgrid-catering-person` and `.cam-row` have no bottom rule — the department
heading does the dividing. This took Crew from 55 drawn dividers to 0, and Catering
from 121 to 0. Table cells in Preview & Export keep theirs: that is functional row
structure on a document that gets printed, not decoration.

**The row-level "All" is one control in one place** — a Jost text link in the row's
final column, on Days/Hotel *and* Catering. Previously a bordered button on the right
for Days/Hotel and a left-hand Oswald text link for Catering.

**Two greens, one hue.** `--tape` `#017756` for light backgrounds, `--tape-light`
`#0FA47A` for dark. The sidebar uses `--tape-light`: 6.17:1 versus 3.52:1 for the
brand green, so active items clear AA. No warm secondary hue was added.
⚠️ Lightening the sidebar instead is *not* a middle option — brand green only reaches
4.5:1 against backgrounds lighter than about `#E8E8E8`, and it gets worse before it
gets better (1.24:1 against mid-grey `#777`). A lighter sidebar means a near-white
one, which also forces the sidebar text from ivory to ink.

**Left alone by decision.** Tech Specs still flows rather than aligning — the short
values justify it. The icon set is unchanged, including the three unused icons.

### Fixed here: the tint tokens were dead

Commit `50238c5` rewrote `rgba(1,119,86,…)` → `var(--tint-N)` with a `sed` that also
hit the `:root` declarations, leaving `--tint-1:var(--tint-1)` and so on. A
self-referential custom property is invalid at computed-value time, so **all four
tints resolved to transparent from `50238c5` until this phase** — every panel tint,
badge fill and editing-state highlight was silently absent. Restored to literals.
Lesson: never `sed` a token name across a file that also contains its definition.

## The design system, as decided (Phase Style Review)

> Superseded in places by the Phase Fonts section above — notably boxes (sections now
> have none), inputs (now ruled lines, not filled boxes), the sidebar green, and the
> row dividers. Read that section first.


The audit's exported decisions are now applied to `index.html`. This is the reference
for what the app's styling *should* be — check here before adding a new heading,
label or box, rather than copying whatever the nearest element happens to do.

**Pattern A — the one tab-entry heading.** Fraunces 700 15px, brand green, with a
thin grey rule that starts after the words and sits on their vertical centre. Green
at rest, **black on hover** (the inverse of the old behaviour). Used by `.section h2`,
`.sd-block-head` (shoot-day blocks and the Hotel/Catering/Transport/Tech summary
blocks) and `.posn-company-header`. The old 20px-black-with-thick-green-underline and
14px-black-with-black-underline variants are gone. Where a header carries a trailing
action (Preview & Export's Copy buttons), the rule lives on the inner
`.sd-block-head-toggle` so it sits *between* the title and the button.

**Page headline.** `.page-head h1` is Fraunces 700 22px **uppercase**, with the
company/client line beneath it in `--body`, upper-and-lower-case, muted — the
preview-card (`.card .line1` + `.sub`) pattern. The eyebrow moved *below* the h1 in
all five `.page-head` call sites; it is no longer an uppercase eyebrow above.

**Label family.** One look for every small uppercase label: Oswald 11px, 1.2px
tracking, uppercase, brand green, **no bottom border**. Block-level section labels
(`.subhead`, `.card h3`, `.modal-box h3`, `.formgroup > .fg-title`) also carry the
Pattern A trailing rule; column and table headers (`.crewgrid-header`,
`.roles-grid-header`, `.section th`, `.ki-item h4`, `.meal-row-label`) take the type
but no rule. Header *controls* (`.crew-header-row`, `.filter-toggle`,
`.dept-toggle-all`) stay muted grey — they're controls, not captions — but share the
same font, size and tracking, and go green on hover.

**Names.** Person names and record titles are `--body` (Jost) 600 **14px**
everywhere — `.list-card .meta strong`, `.crew-ident-top strong`,
`.crew-ident.one-line strong`, `.roles-grid-name`, `.cam-who strong`. Fraunces is now
reserved for display headings only. Note this also restyles location titles, since
they share `.list-card .meta strong`.

**Fields sit on a line, not stacked.** In `.grid` and `.grid.g2`, any `<div>` that
leads with a `<label>` becomes a two-column row: a fixed `--field-label-w` (104px)
label column so rows align down the page, then the control. Anything after the label
stacks inside the control column. Deliberately **not** applied to `.g3`/`.g4` — those
cells are already narrow and a 104px label column leaves ~55px for the control, which
clips dates and times; dense rows keep the label above. Bare labels outside a `.grid`
(log line, notes, descriptions) stay full-width stacked. Everything reverts to stacked
below 900px. `.ts-field` and `.field-inline` were duplicates and are now one rule set.

**Boxes.** White fill, `--box-radius` 8px, `--box-pad` 10px. `.card` (call sheet
preview, a document) and `.modal-box` (a dialog) keep 16px padding as deliberate
exceptions. `.list-card` lost its mint fill. Faint green panel tints stay on
`.filter-panel` / `.bulk-edit-panel` / `.formgroup` / `.day-override-form`.

**Green tints.** Nine hand-written `rgba(1,119,86,…)` values collapsed to four
tokens: `--tint-1` .03 (panels), `--tint-2` .05 (editing/overridden rows), `--tint-3`
.10 (badges, hover fills), `--tint-4` .14 (active controls — must stay distinct from
tint-3). Two deliberate one-offs remain inline: `.35` for the sidebar active gradient
and `.28` for selected role / HoD pills.

**Colour.** No drifted hexes — the mint `#5fd6ac` and sage `#e2ede8` are gone.
⚠️ The sidebar now uses brand green `#017756` on the near-black background, which
measures **~3.5:1** against the required 4.5:1 for 13px text (the mint it replaced
measured 10.9:1). This was flagged and chosen knowingly for brand purity; if active
sidebar items read too dim, the fix is a named `--tape-light` token rather than a
return to a stray hex.

**Expand/collapse.** One toggling text control, never two links side by side:
`expandCollapseAllHTML(onclickExpr, extraLinkHTML, allCollapsed, groupId)` renders "Expand all"
while everything is collapsed and "Collapse all" otherwise, so only the available
action shows. Callers pass current state. The Phase V rotating chevron is gone; the
`.expandall-caret` rule was removed with it.

**Left alone by decision.** Divider weights (schedule stays dashed — it's uniquely
alterable; crew/camera stay solid). Unused `crew`/`location`/`menu` icons and the
burger's hardcoded SVG stay as they are. `--mono` is now plain
`ui-monospace, monospace` — the never-loaded JetBrains Mono name was dropped rather
than the font being added.

**Open for the next round:** a fonts-only review. One thing to fold in — Fraunces is
loaded at weights 500 and 700 only (see the Google Fonts `<link>`), but every display
rule asks for 600 or 700; the 600s are being synthesised rather than using a real cut.

## Phase BD — Pre-production tab (9 Aug 2026)

Ships onto BF (`9ca9fdf`), alone. BC was deferred and is unrelated — shoot day selection
is untouched. Two commits: behaviour, then appearance.

See the **Pre-production** section above for the functions. What belongs here is the
reasoning that isn't obvious from them.

### The three things that are not negotiable

1. **No totals, in any form.** Not a gap to fill in later — a constraint. If a figure is
   ever wanted on this screen it is a deliberate decision, taken then.
2. **One rate.** The Rate field is `entry.rate` via `resolveEntryRate()`/`saveEntryRate()`,
   the same field the Roles view and Budget read and write. There is no prep-specific rate,
   no shadow copy and no second field. Verified in both directions: writing 425 here showed
   425 in the Roles view and Budget's Per Person; writing 515 in the Roles view showed 515
   here. Nothing diverges because there is only one value.
3. **Marks are indicative.** "Booked 5, marked 7" is valid and gets no warning, validation,
   reconciliation, colour change or badge — in either direction.

### Storage, and the bill that comes with it

`p.prepSchedule = { [entryId]: {days, dates[]} }` — parallel to `p.crewEntries`, not part
of it, because BF settled that shape deliberately.

⚠️ **The stated reason for pruning needs one correction, recorded so the next session
doesn't rely on the wrong mechanism.** The brief described the risk as "a
deleted-and-recreated entry for the same person inherits stale days". That specific failure
**cannot happen**: entry ids come from `uid()`, so a recreated entry gets a fresh id and can
never collide with a pruned record's key. The real consequence of not pruning is **silent
unbounded accumulation** — orphaned records nothing renders, growing the `db:projects` row
forever. Pruning is still exactly right; it is just fixing a different problem than the one
named.

**There are THREE paths that drop entries from a project, not two.** The brief warned the
removal paths were plural; they are, and one more than expected:

| Path | Routes through `removeCrewEntries()`? | Where pruning is hooked |
|---|---|---|
| `removeCrewFromProject(entryId)` — single | Yes | `removeCrewEntries()` |
| `bulkRemoveSelectedFromProject()` — bulk | Yes | `removeCrewEntries()` |
| `deleteCrew(crewId)` — database delete, every project | **No** — filters `p.crewEntries` itself | `deleteCrew()` directly |

The third is deliberate in BF (it leaves shoot-day positions dangling on purpose, so it
cannot share the function that clears them). Pruning there is **not** the same call as
leaving those positions: a dangling position renders visibly as "(removed crew)" and always
has; an orphaned prep record is invisible. Undo is unaffected — prep data lives in
`db:projects`, already in `beginUndo()`'s snapshot on that path.

All three verified: single removal pruned the removed entry and left its neighbour's record
byte-identical; bulk removal of two pruned both; `deleteCrew()` pruned that person's record
on ROW **and** their entry's record on LMAOF, cross-project.

### Judgement calls, flagged rather than buried

- **Placement**: between Crew and Locations. The brief named the siblings but not the
  order; it is a crew-roster-shaped screen and prep precedes the shoot.
- **Department grouping** with `deptHeaderHTML()`, which renders a roster count `(13)` in
  each heading. That is the only aggregate-shaped number on the screen. It counts rows, not
  prep data, and is what every crew screen in the app already shows — but it is the one
  thing worth a second look given constraint 1, so it is called out rather than assumed. A
  flat 66-row list with no headings was the alternative.
- **No `body.oninput` autosave.** Both fields commit on `onchange` through their own
  `saveDB('db:projects', …)`, exactly as the Roles view's Rate field does. The debounced
  `scheduleAutosave()` path is for fields that stream input (Overview, the cost fields);
  two discrete number fields are not that.

### Verification

- Inline `<script>` extracted (2 blocks) — `node --check` clean on both. `<style>`
  brace-balanced, **478/478**.
- Orphan sweep: all 27 new symbols referenced beyond their definition; no dead helpers.
- **Whole-output fingerprint, pre vs post.** The BF harness was an in-session artefact and
  is not on disk, so an equivalent was rebuilt: a 933,203-character / 686-line capture of
  every budget total under both VAT footings, all four export views' rows and titles, the
  WhatsApp call sheet and resolved `buildFullData()` for all 10 shoot days, both
  `exportOutputText()` formats, every summary and `*Lines()` builder, task flags,
  cinematography crew, and all 13 group-bys × 7 sorts on **both** list grains — across all
  3 projects. Captured from **pre-BD code** (`git show HEAD:index.html`) and from the final
  post-BD build, both reading the same live data. **Identical: `896c24c8-1a973800`.**
- Tab renders: 3 projects × 8 tabs including every Crew and Budget sub-view — 45 renders,
  **zero console errors**.
- Rendering cases all confirmed: an entry with no days and no marks (66 of 66 rows, empty
  counters, `prepSchedule` absent entirely); days but no marks ("5 days booked"); marks but
  no days ("1 date marked"); marks exceeding days ("5 days booked · 7 dates marked", in
  `rgb(111,106,99)` = `--muted`, the same colour as any other muted text — no warning
  treatment); and one person holding two entries rendering as two rows with independent
  role, rate, days and marks.
- Marks indicator weight confirmed by computed colour across all 66 rows: `--text` where
  marked, `--muted` where not.
- Drag verified with real `MouseEvent`s: a 3-day drag marked 3, a second drag made the set
  deliberately non-contiguous, and a drag starting on a marked day unmarked its run. Stored
  every time as a flat sorted array.
- **Zero writes to `db:crew`.** Across the whole session the only key any write path touched
  was `db:projects`.

### The test fixture — how "am I driving production?" was actually checked

The brief flagged a previous session where a local server dropped the path, served the real
`index.html`, and a migration ran against production. Guarded structurally rather than by
care:

- The fixture is a **separate file, `bd-fixture.html`, in a directory containing no
  `index.html` at all** — a dropped path there serves a directory listing, so it cannot fall
  through to the real file. Confirmed by `curl`ing `/`.
- `saveDB()` and `scheduleAutosave()` are replaced at build time; the real `saveDB` body
  survives only under `__fixture_unreachable_saveDB` and is never called.
- The page carries a **random per-session token** (`window.__BD_FIXTURE__`), and the token,
  the stubs and `location.href` were asserted **before any interaction** and re-asserted
  after every reload.
- ⚠️ Mid-session the fixture rebuild silently no-opped — `node -e` shifts `process.argv`
  differently from a script file, so a destructuring rebuild wrote to a junk path while
  reporting success, and two rounds of styling verification ran against a stale page. Caught
  by diffing the served CSS against the source. The rebuild is now a real script file
  (`build-fixture.js`) that refuses an already-stubbed source, requires each anchor to match
  exactly once, and prints the bytes it wrote.
- **Confirmed clean against `app_data` afterwards**: newest write `db:projects`
  `2026-08-09 15:30:36+00`, over an hour before this session began; `db:crew` untouched
  since 10:13; and `db:projects` contains **no `prepSchedule` string** — nothing this phase
  did reached the database.

### Left alone, as instructed
- BA's roles menu is not built and AZ's `.role-add-marker` is still inert and unwired.
- BC / shoot day selection — untouched.
- The AZ Edit-pencil chip-`×` database-wide role deletion — still open.
- `deleteCrew()` leaving positions dangling as "(removed crew)" — untouched (only its prep
  pruning was added).
- "+ Add crew member" form visibility, and `dayTotal` not resyncing — untouched.
- No filter, and no hook for one.
- Hotel/catering/travel do not derive from prep days.
- No code from `budget-v1-fail` was read or reused.

## Phase BG — crew database duplicate guard (9 Aug 2026)

Interface only. **No schema change, no data rewrite, no migration** — this phase stops
new duplicates being created; it does not touch the pairs already among the ~88 records.
That is BF's job, and BG deliberately runs **first**: reconciling the pile while the tap
is still running would let a fresh pair appear in the gap between the two phases.

Kept out of BF on purpose — BF is the one phase where a revert has to be clean, and
bundling a button rename with a data migration means backing out the rename drags the
migration with it.

### Two entry points, two guards — and why they're different shapes

The two ways a duplicate gets made do not share a code path, so they don't share a guard:

| Path | Reaches `saveCrew()`? | Guard | Shape |
|---|---|---|---|
| "Use as template" (D-1 crew card) | **No** — `duplicateCrew()` writes to `db:crew` on click | `useCrewAsTemplate()` confirm, before the write | Confirm-to-create |
| "+ Add crew member" / rename in the Edit expansion | Yes | duplicate-name `confirm()` inside `saveCrew()` | Warn-and-continue |

⚠️ **The original brief for this phase specified a hard block at save for the template
flow. That was impossible against the real code and was dropped** — `duplicateCrew()`
persists the clone on click, so there is no pending record to block and no moment at
which "proceed" is a choice. Blocking a later save would also have left the exact-name
pair sitting in `db:crew` in the meantime, which is precisely the artefact the phase
exists to prevent. The confirm moved in front of the write instead.

### Deferred, not rejected: the prefilled-form design ("solution B")

The correct end state is that **"Use as template" opens a prefilled crew form and writes
nothing until the name has been changed** — no clone exists until it has its own name, so
the failure mode ("click, walk away, leave a same-name pair") cannot happen at all rather
than being confirmed away.

It was considered in full and deferred until after the schema work, deliberately. Do not
re-derive it from scratch, and do not build toward it now. What it costs, so the next
session doesn't have to rediscover it:

- `saveCrew()` refuses to create a brand-new record without `pendingNewCrewRole` set, and
  `crewFormHTML()` branches on `c.id` to choose between the live tag-list editor and
  `newCrewRolePickerHTML()`. A template copy arrives already carrying the source's `roles`
  array, so it fits neither branch — that invariant has to be reworked first.
- `_copyOriginalRole` and its two `copy` badges (`crewIdentityHTML()`,
  `crewRolesRowHTML()`) describe a record that exists. Under the prefilled-form design
  nothing exists until it's named, so they need revisiting at the same time.

### Also considered and rejected: auto-suffixing the copy's name ("Alex Marshall (2)")

Raised during the phase, and it is worse than it looks. `c.name` is not display-only —
`buildFullData()` reads it straight into every position, so it reaches the call sheet
card, the WhatsApp text, the .xlsx, and two helpers that parse it on whitespace:
`abbreviateName()` renders `Alex Marshall (2)` as **`A. (2)`** in the hotel rooming list
(surname dropped), and `nameInitials()` → `cameraFileTag()` bakes it into a media
file-naming tag as **`A_FX9_AM(_`**. It would also defeat the normalised matcher above —
`alex marshall` and `alex marshall (2)` don't match — so the template flow would stop
producing the one duplicate shape the warning catches and start producing one it's blind
to, making BF's job harder rather than easier. Don't re-propose it.

### Verification

- Inline `<script>` extracted (2 blocks, 7,178 lines in the main one) — `node --check`
  clean on both. `<style>` brace-balanced, 444/444 (no CSS changed).
- Orphan sweep: `duplicateCrew()` has exactly one caller (`useCrewAsTemplate()`), which
  has exactly one caller (`crewCardHTML()`'s button). **Zero user-facing occurrences of
  "duplicate" remain** — every survivor is a code comment or the internal function name.
- **No new `db:crew` write path**: 16 `saveDB('db:crew')` call sites before and after,
  and the diff adds no `saveDB`/`crewDB.push`/`crewDB =` line. Both guards are early
  returns ahead of any mutation.
- Exercised in-browser against the live 88-record database with `saveDB()` and
  `scheduleAutosave()` stubbed. Ten cases, all correct: template cancel (88→88, **zero**
  writes) / template proceed (88→89, clone identical to before, `_copyOriginalRole`
  stamped); new record clashing exactly → warns, cancel creates nothing, proceed creates;
  padding + uppercase (`"   JUSTIN SCHOENROCK  "`) still matches, confirming trim +
  case-insensitivity; unique name → no prompt at all; existing record re-saved unchanged →
  **no prompt** (no self-match); rename into a clash → warns, and **cancelling leaves the
  record's old name intact**; rename to a unique name → no prompt. No console errors.
- Confirmed clean against `app_data` afterwards: `db:crew` still 88 records, last written
  4h before the session — nothing this phase did reached the database.

### Left alone, as instructed
- The AZ Edit-pencil deletion gap (see the ⚠️ under `roleBannerHTML()`) is still open.
- `dayTotal` not resyncing when a day is added — unrelated, untouched.
- "+ Add crew member" not visually showing its form: **could not reproduce as described**
  — MAP.md records this as fixed in Phase AS (G18), and `toggleCrewForm()`'s
  `scrollIntoView` is present and working. It did not block testing.
- Ordinary "+ Add crew member" creation **is** covered by the duplicate-name warning here,
  unlike the original brief's section 5, which scoped the warning to the template flow
  only. The spec correction moved it deliberately: hand entry is the path that actually
  passes through `saveCrew()`.

## Phase BF — crew entry ids (9 Aug 2026)

The schema migration the AZ–BG group was built around. Ships alone: a migration bundled
with feature work can't be reverted without taking the feature with it.

**The model — Option 2 of three.** An entry gets its OWN id plus a `crewId` pointer back
to the person. One person, many entries, each carrying its own role and rate. Option 1
(duplicate crew records — what "Duplicate crew member" does) was rejected because the two
records aren't linked. Option 3 (composite `crewId` + role) was rejected because it breaks
the moment someone holds the SAME role twice at different rates — so **nothing may assume
(`crewId`, role) is unique, and no uniqueness constraint was added.**

```
p.crewEntries = [{ id, crewId, role, department, subDepartment, rate? }, …]
```

Replaces `p.crewIds` AND `p.crewRateOverrides`, both deleted by the migration.
`d.positions[i][0]` and `d.crewOverrides` keys are ENTRY ids.

### The scope rule — what moved and what deliberately didn't

| Keyed to | What | Where |
|---|---|---|
| **Entry** | role, rate, days on site | `entry.role`/`entry.department`, `entry.rate`, `d.positions`, `d.crewOverrides` |
| **Person** | hotel, travel, catering | `p.travelMethods`, `p.hotelNightBefore`, `d.hotelNights`, `d.cateringMeals` — **untouched** |

Two roles is still one bed and one lunch. Days on site for the person-level tabs is the
UNION of that person's entries' days, deduplicated (`crewDayCount()`), which holds even
when both roles land on the same day. **Explicitly out of scope and not built:** whether
hotel/catering days can be ticked independently of the roster.

### Why `entryView()` made this a migration rather than a rewrite

`entryView(e)` returns the crew record with the entry's `id`/`role`/`department` layered
on top. Every existing sort, group, filter and identity helper reads `.id`/`.name`/
`.role`/`.department`, so they all kept working — they just receive an entry-shaped object
instead of a person-shaped one. `.crewId` is the marker that distinguishes the two, and
the handful of genuinely person-level call sites branch on it (`personIdOf()`).
`renderProjectCrew()` picks the list per view: **Roles and Days on site are entry-level;
Hotel, Travel and Catering render `projectCrew()`, the deduplicated people.**

### The migration — silent on load, not a supervised run

⚠️ **This reverses the trigger decision recorded on the phases page**, on the evidence
below and with explicit sign-off. `migrateCrewEntries()` runs in `initApp()` after the
loads and before the first render, so **no screen ever meets the old shape and there is no
dual-shape read path anywhere in the file** — the cost that got the split option rejected.

- **Idempotent**: a project already carrying `crewEntries` is skipped, so a reload or a
  second tab can't re-migrate. Verified: a second load performs **zero writes**.
- **Backup before any migration write**, and only when there is something to migrate.
  Three keys, because positions and overrides move too:
  **`backup_pre_BF_20260809:db:projects` / `:db:shootdays` / `:db:crew`**.
  If a backup write fails it aborts before touching anything.
  ⚠️ The repo had **three** incompatible backup-key conventions already; the `prefix:key`
  form was chosen because it is the only one that scales to a set.
- Reports to the console; drops (and counts) any position it cannot map rather than
  leaving a dangling id.

### The duplicate-crew check was DROPPED, on evidence

The phases page asserts same-name pairs "may well exist among the ~88 records" and calls
the check "necessary, not precautionary". **That premise is false against the real data.**
Scanned read-only before any change: **0 pairs** on exact normalised name (BG's own
`trim()`+`toLowerCase()` matcher), **0** on same surname, **0** on first-initial+surname,
and **0** records carrying `_copyOriginalRole` — the stamp `duplicateCrew()` writes and
never deletes. So no record in `db:crew` was ever made by the old Duplicate feature.
Identical across every crew snapshot back to 6 Aug (77 records then, 88 now).

Since the supervised trigger existed *because* pairs needed confirming, and there are
none, both were dropped together. **BG's two guards are untouched and still the defence
against new ones.** A future pass wanting reconciliation should re-scan first.

### `setActiveRole()` split in two

See the entry in **Shared/utility functions**. `setEntryRole()` is what every project
screen reaches; `setActiveRole()` survives for the Crew Database screen only. This closes
the role-SWITCHING half of the AZ Edit-pencil gap; the × that deletes a saved role is
still shared and still open.

### Summary builders audited — all 13, including the ones that were fine

Double-counted under the entry model and were fixed: **`buildTransportSummary()`** (the
one Phase AO named), **`buildBudgetData()`** (travel and its VAT — not previously flagged),
**`buildProjectCrewGroups('daysOnSite')`**, **`sortProjectCrewGroup('daysCount')`**,
`personMatchesProjectDayFilter()`, and `cinematographyCrew()` (one camera letter per
person, so it reads `projectCrew()`).
Unaffected, because they are person-keyed or map over positions on purpose:
`buildCateringSummaryGrid()`, `buildCateringExport()`/`cateringOrderLines()`,
`buildHotelSummary()`/`hotelSummaryLines()`, `buildBudgetData()`'s hotel room-nights,
`buildTaskFlags()`, `buildCrewSummary()`, and `buildFullData()`/`buildWAText()`/
`downloadExcel()` — one call-sheet line per position is *correct*; two roles legitimately
print twice.

### Verification

- Inline `<script>` extracted (2 blocks, 7,548 lines in the main one) — `node --check`
  clean. `<style>` brace-balanced, **444/444** (no CSS changed).
- Orphan sweep: zero live references to `p.crewIds`, `p.crewRateOverrides`,
  `resolveCrewRate` or `saveCrewRateOverride` (only the deliberate "do not look for these"
  note survives). No dead helpers left behind.
- **Migration output checked in SQL against the backups**: 66/33/3 entries for exactly the
  old 66/33/3 rosters, in the same order; 25/0/3 rates carried across matching the old
  override counts; **238/238 positions**, every one resolving to an entry on the right
  project and holding the same person in the same slot; every entry's role equal to its
  crew record's role; no duplicate entry ids; `crewIds`/`crewRateOverrides` gone.
  **Hotel nights, catering meals, travel methods, night-before and all three cost objects
  byte-identical across all 10 days and 3 projects. `db:crew` never written.**
- **Whole-output diff, pre vs post.** A 228,302-character fingerprint — every budget total,
  department/day/person row, all four export views, transport/catering/hotel summaries,
  the full WhatsApp call sheet for all 10 days, every position list, all 13 group-bys, all
  7 sorts, task flags and cinematography crew, across all 3 projects — captured from
  **pre-BF code reading the pre-BF backup** and from **post-BF code reading the migrated
  data**. **SHA-256 identical: `bca199fb0dfc70a7ce8c2aed5b82ec3624e2f0c2f481ba6fb047b23781838304`.**
- Mutation paths driven live: an entry role change leaves the crew record AND the same
  person's entry on another project untouched (and writes `db:projects`, not `db:crew`);
  rate is per entry and doesn't leak across projects; day toggles are per entry; hotel
  toggles stay keyed by crew id; the selection Set translates correctly between the two
  view kinds; the Crew Database screen still routes chips to `setActiveRole()` and shows
  no per-project rate field.
- **BG's two guards re-tested and unchanged**: the template confirm fires before any write
  and cancelling creates nothing (zero `db:crew` writes); the duplicate-name confirm still
  matches through padding and case (`"   JUSTIN SCHOENROCK  "`), and a unique name still
  prompts not at all.
- Zero console errors across 3 projects × 7 tabs × every sub-view × all 10 shoot days,
  plus both databases, Settings and Welcome. Roles view renders 66 rows identical to before.

### Left alone, as instructed
- The AZ Edit-pencil **deletion** gap (chip ×) is still open.
- `dayTotal` not resyncing when a day is added — untouched.
- "+ Add crew member" form visibility — untouched.
- BG's Solution B (prefilled form, block Save while the name matches) still deferred.
- No code from `budget-v1-fail` was reused. No rate × days totals, aggregations or
  rollups were added.

## Phase BC — shoot day entry selection audit (9 Aug 2026)

Ships onto BD (`1c56578`), which sits on BF/BG/BE/AZ. **Audit-only — no code in
`index.html` changed.** The brief asked for two things: (1) make every shoot-day/on-site
crew picker list entries separately by name+role, and (2) audit every reader of
`d.positions`/day-roster builder for double-counting since BF. Both were checked against
the running code before writing anything, per the brief's own instruction to stop rather
than re-derive if the premise didn't hold — and (1) didn't hold: it was already done.

### (1) The selection UI already lists entries separately — a side effect of BF, not built here

Two controls put a crew member into a day slot, on two different tabs:

- **The shoot day position-assignment picker** — `refreshAddPosnPick()` / `addPosnToDay()`
  / `removePosnRow()` (T-5.4, Shoot Days tab). `refreshAddPosnPick()` already sources its
  option list from `projectCrewOptions()` → `projectEntryViews(p)` (entry views, not
  people), filtered against already-assigned **entry** ids, rendered through
  `groupedCrewOptionsHTML()`, which labels every option `Name (Role)`. The code comment at
  the call site already says so: `// entry views — "Meurig — AC" and "Meurig — operator"
  are two selectable things`.
- **The on-site selection UI, a separate control from position assignment** — "Days on
  site" (T-2.2, Crew tab), a checkbox matrix rather than a picker: `crewAssignRowHTML()` /
  `toggleCrewOnDay()`. `renderProjectCrew()` already feeds this view `projectEntryViews(p)`
  (entry-level, not `projectCrew()`), so `crewAssignRowHTML()` renders one row per entry,
  each showing `crewIdentityHTML(c, {showAsOrRole:true, …})` — name, with role/Show-as as
  a hint line underneath. `toggleCrewOnDay(entryId, dayId, checked)` already writes/reads
  `d.positions` by entry id.

Verified live (see Verification below): a person given a second entry with a different
role immediately appears as two distinct, separately labelled, separately selectable rows
in both controls, with no code change. This is BF's `projectEntryViews()` wiring — it
already reached the picker and the on-site grid when it reached the Roles tab, because all
three read the same function. There was no separate "list entries, not people" step left
for this phase to do.

### (2) Every `d.positions` reader / day-roster builder, re-audited independently of BF's own table

Re-derived from a fresh `grep` of every `.positions` reference, not copied from BF's
table, then cross-checked against it — nothing found that BF missed, nothing regressed by
BD or BG (both left this code path untouched, confirmed by reading it, not just trusting
their own "left alone" notes).

| Builder / control | Reads | Category | Notes |
|---|---|---|---|
| `refreshAddPosnPick()` / `addPosnToDay()` / `removePosnRow()` (T-5.4 picker) | `d.positions`, entry id | (a) | Lists/adds/removes by entry id; two entries render as two options |
| `crewAssignRowHTML()` / `toggleCrewOnDay()` (T-2.2 on-site grid) | `d.positions`, entry id | (a) | One row per entry, entry-id keyed toggle |
| `renderPositionAssignments()` / `captureInProgressPositions()` / `saveShootDay()`'s positions rebuild | `d.positions`, entry id | (a) | Grouped by company/dept, one row per position; DOM `posn-crew` values are entry ids throughout |
| `entryOnDay()` / `entryDayCount()` | `d.positions`, entry id | (a) | The entry-grain half of the pair; used correctly wherever a specific entry's own days matter (Roles/Days-on-site sort, filter) |
| `crewOnDay()` / `crewDayCount()` | `d.positions`, folded via `entriesForCrew()` | (b) | The person-grain half; deduplicates a person's entries before testing presence |
| `removeCrewEntries()` | `d.positions`, entry id | (a) | Filters positions by the killed entry ids only — a person's other entry is untouched (re-verified live, see below) |
| `toggleAllForPerson('days', entryId)` | `d.positions`, entry id | (a) | Entry-scoped "All" toggle; the `'hotel'` branch of the same function is person-scoped by design (different id passed in by the caller) |
| `buildTaskFlags()` — "No crew — Day N" | `(d.positions||[]).length` | N/A | Presence-only boolean, not a headcount; entry-vs-person grain doesn't apply |
| `buildTaskFlags()` — "N crew with no day rate" | `projectEntries(p)` | (a) | Correct: rate is entry-level, so a no-rate *entry* is what needs fixing, not a no-rate *person* |
| `buildBudgetData()` — `people` / per-day `dayPeople` | `d.positions`, entry id via `onDayIds` | (a) | One row per entry (rate/days are entry-level); confirmed `pp.id` matches entry ids from `d.positions`, not crew ids |
| `buildBudgetData()` — `travelClaimed` / `travelClaimedToday` | `d.positions` via `crewDayCount()` | (b) | Travel charged once per person via a `Set` keyed by `crewId`, inside the same function that is (a) for rate — mixed correctly within one builder |
| `personMatchesProjectDayFilter()` | `entryOnDay` or `crewOnDay`, branches on `c.crewId` | (a)/(b) | Correctly dual-mode: entry grain for the entry-level views, person grain when handed a person view |
| `sortProjectCrewGroup('daysCount')` | same branch | (a)/(b) | Same dual-mode pattern |
| `buildProjectCrewGroups('daysOnSite')` | same branch | (a)/(b) | Multi-bucket per entry in entry-level views, deduplicated in person-level views |
| `cinematographyCrew()` | none directly (department, not day) — reads `projectCrew()` | (b) | Deduplicated on purpose: one camera letter per person, not per entry |
| `buildTransportSummary()` | `d.positions` via `crewOnDay()` | (b) | AO's originally-flagged function; still deduplicated via `projectCrew()`, unchanged since BF |
| `buildHotelSummary()` | `p.hotelNightBefore` / `d.hotelNights` (crewId-keyed) | (b) | No `d.positions` involvement at all; person-keyed by design, untouched |
| `buildCateringSummaryGrid()` / `buildCateringExport()` | `d.cateringMeals` (crewId-keyed) | (b) | Same — no `d.positions` involvement, person-keyed by design |
| `buildCrewSummary()` | `crewDB` directly (AI Scan payload) | N/A | Whole database projection, not a day roster |
| `buildFullData()` (positions/clientPositions/talentPositions) | `d.positions`, one row per position | (a) | Call sheet output — two roles legitimately print twice, unchanged |
| `positionsTableHTML()` / `pushPeopleLines()` (WhatsApp) / `pushPeopleRows()` (Excel) | `buildFullData()`'s resolved position lists | (a) | All three consume the same resolved list; one line/row per position, correctly not deduplicated |

**Day-level roster headcount check.** The brief specifically flagged "12 crew on Day 3"-style
displays as worth checking. Searched exhaustively (`grep` for count/headcount patterns
across the whole file): **no such display exists anywhere in the app.** Position
Assignments shows a per-company/department count next to each group header, but that is a
count of position rows in that group (correctly a row count, not advertised as a person
headcount), and Budget's Per Day view shows only cost totals, no headcount at all. Nothing
to fix because nothing exists yet that could get this wrong.

### Verification

- Inline `<script>` extracted (2 blocks, same convention as BF/BD/BG — a 6-line Supabase
  client init and the 7,847-line main block) — `node --check` clean on both. `<style>`
  brace-balanced, **478/478** (unchanged from BD, since no CSS touched).
- Orphan sweep: `resolveCrewRate`/`saveCrewRateOverride`/`crewRateOverrides`/
  `HEADER_FONTS`/`clearBudgetDayFilter`/`resetAndReseed`/`copyWA`/`exportPanelHTML`/the
  four removed amenity-lookup functions all confirmed still absent from live code — the
  only hits are "do not look for this" comments and (for `crewRateOverrides`) the
  migration function itself, which legitimately reads the old field once during
  migration.
- **Test fixture**, per the brief's requirement: `bc-fixture.html` built by a real script
  file (`build-fixture.js`, refuses an already-stubbed source, requires each anchor to
  match exactly once) into a directory containing no `index.html`. Confirmed the bare
  root served a directory listing before any interaction; confirmed `location.href`, a
  random per-session token (`window.__BC_FIXTURE__`), and that `saveDB`/`scheduleAutosave`
  were the stub functions (not the real ones, which survive only as
  `__fixture_unreachable_saveDB`) — all asserted before touching anything.
- **Two-entry-same-day, live**: gave an existing ROW 2026 crew member (Justin Schoenrock,
  previously one entry — Executive Producer) a second entry (Camera Operator,
  Cinematography) via direct state manipulation (BA's "Add again as" UI doesn't exist yet,
  so this is the only way to construct the scenario). Confirmed:
  - Both entries appeared in the `addPosnPick` dropdown as `Justin Schoenrock (Executive
    Producer)` under Production and `Justin Schoenrock (Camera Operator)` under
    Cinematography — two distinct, separately selectable options.
  - Both entries appeared as two separate rows on the Days on site grid, name + role hint
    each, both toggleable independently.
  - Added both to Day 1 via `addPosnToDay()`; both resolved with independent call times
    (06:00 / 05:30) after editing and `captureInProgressPositions()`.
  - Removed the Camera Operator entry's Day 1 position via `toggleCrewOnDay(…, false)`:
    the Executive Producer entry's position (call time, own row) was untouched;
    `crewOnDay()` (person-level) still correctly returned `true` for the person, since
    their other entry still holds the day.
  - Re-added, then removed the Executive Producer entry's position via `removePosnRow()`
    (the Shoot Days tab's own removal control, the other of the two removal paths):
    confirmed the Camera Operator entry's position was untouched.
  - Zero console errors across the whole sequence.
  - All 6 `saveDB()` calls the sequence triggered were intercepted by the fixture's stub
    (`db:projects` / `db:shootdays` only) — the real `saveDB` was never reachable, so
    production could not have been touched regardless of what was clicked.
- No `index.html` edits were made — nothing to diff against a pre/post fingerprint. The
  only file changes are this MAP.md entry.

### Left alone, as instructed
- No code changed in `index.html` — Section 1's UI change was already shipped by BF; there
  was nothing left to build.
- BA's roles menu and AZ's `.role-add-marker` remain unbuilt/unwired — not touched.
- The AZ Edit-pencil deletion gap (chip ×) — still open.
- `deleteCrew()` leaving positions dangling as "(removed crew)", `dayTotal` not
  resyncing, "+ Add crew member" form visibility — all untouched, per the brief.
- No rate × days totals, no aggregation, no rollup were added anywhere.
- No code from `budget-v1-fail` was read or reused.

---

---

# Budget View V1 — abandoned and reverted (9 Aug 2026)

⚠️ **The line-item budget (B-1, `bdm*`) no longer exists in this codebase. Do not go
looking for it, and do not treat its absence as a bug.** It was built across seven
phases, judged a wrong turn, and deliberately rolled back to be rebuilt from scratch in
smaller steps. This is a record so the next session doesn't rediscover it by accident.

**Reverted, not deleted.** Eleven `git revert` commits, one per original commit, on
`main`. Nothing was reset or force-pushed — every original commit is still in history and
still reachable, and the tag **`budget-v1-fail`** (pushed to `origin`) points at
`9ed1e34`, the last commit before the rollback. To read any of this work again, or to
mine it when the rebuild starts, check out that tag.

| Phase | Commit | What it was |
|---|---|---|
| AU | `85df536` | B-1, a line-item budget view (demo, no database) |
| — | `0c00592` | MAP.md note on B-1's collapse idiom |
| AV | `d188793` | Budget storage: three keys, sections vs codes, no more demo |
| AW | `a657006` | Correct VAT basis: VAT sits inside the total, Inc./Ex. toggle |
| AX | `e35528e` | Project and view as independent axes (sidebar VIEWS) |
| Gate 1 | `9fc428b` | Light tidy pass following AU–AX |
| Gate 1 Pt 1 | `61eb111` | View selector into header, Costs rename, 1188px container |
| — | `a629cf1` | 64px page margin on `.main` |
| AY-a | `76b5173` | Crew linking, line types and overtime |
| AY-b | `dc13822` | Bulk generation of budget lines from crew, candidate review |
| AY-b | `9ed1e34` | Styling for the generation preview and Suggested crew panel |

**Everything through Phase AT was kept**, including AQ's audit (`gate1-review.html`
stays) and AR/AS/AT's whole-app fixes — those were never Budget work and reverting them
would have re-introduced G11's silent failed saves, G12's one-click `resetAndReseed()`
wipe and G19's stale `dayTotal`. AN/AO/AP were kept too, so **T-6's VAT model is still
"VAT follows the person"** (AO) with `budgetFmt()` separators (AN) and the shared
`outputMenuRowHTML()` export menu (AP).

**Phase AM (Crew Sort/Group by) needed no action.** It landed at `91eaebc`, well below
the cut, and survives untouched — 7 sort options and 13 group-by options, all with real
logic. `sortProjectCrewGroup()` and `crewSeniorityBand()` are byte-identical to their
pre-rollback state; `buildProjectCrewGroups()` carries Phase AT's table-driven
refactor, which was kept along with the rest of AT.

**One thing was carried forward out of the reverted range**: AY-a's fix to
`bulkRemoveSelectedFromProject()`, re-applied as its own commit — see the ⚠️ under
`projectCrewSelected` in the **Crew** section above.

### What went with it, that you might notice
- The sidebar's **VIEWS** section (AX). Sidebar is back to Crew / Locations / Settings.
- The project tab reads **BUDGET** again, not COSTS (`61eb111` renamed it).
- `.main{max-width}` is back to **840px** from 1188px — that rule was app-wide, not
  Budget-scoped, so every screen narrows back.
- The **"Proper Corn Hot Sauce (demo)"** project. It existed only so B-1's `post`
  phaseSet had something to render; its record was removed from `db:projects` and its
  `seedSampleData()` entry went with the revert.
- `deleteCrew()`'s usage warning (AY-a's `crewUsageSummary()`) — back to the plain
  "Delete this crew member from the database?" confirm. Deliberate: the useful half of
  it counted budget lines.
- `budget-seed-row.json`, deleted with AV/AW.

### Storage — what was removed, and what was kept
Deleted from `app_data`: **`db:budget_settings`** and **all three `budget:<projectId>`
keys** (`budget:id_msc4nv2c0g178` — ROW, `budget:bdm-proper-corn-hot-sauce`,
`budget:ayb-scratch-project`).

⚠️ **`db:projects` needed no field surgery.** Budget V1 kept 100% of its state in its own
keys and never added a field to a project record — verified against all four live
records and against every `p.<field>` reference in `index.html`. The only change was
removing the whole Proper Corn project record. **`crewRateOverrides`, `hotelCosts`
(incl. `perRoomNight`), `cateringCosts`, `transportCosts` and `travelMethods` were never
Budget V1's and are all intact** — T-6 reads every one of them.

⚠️ **ROW's seed data is not lost.** It is kept at
**`backup:budget_row_pre_AYb_2026-08-08`** (82 lines), along with
`backup:budget_row_pre_AY_2026-08-08`. No backup key was deleted. `db:crew` was not
touched at any point — 88 records, md5 `8e1989859a1a5153ff03ba137e11be28`, identical to
the pre-session backup.

Full JSON exports of everything deleted are on disk at
`_exports/2026-08-09-pre-budget-v1-revert/` (untracked).

## Phase BH — crew role-deletion dialog (9 Aug 2026)

Ships on top of `e5a3048` (BC) / `1c56578` (BD) / `9ca9fdf` (BF) / `02d58c9` (BG) /
`4d6f0a3` (BE) / `bfac972` (AZ). Adds a warning + undoable cascade to the one place a
saved role could vanish off a crew record with zero confirmation.

### The premise the brief started with didn't match the code, and got corrected mid-phase

The original brief framed this as "a delete FROM the Crew Database screen", distinct
from the standing rule that a project screen may add to the crew database but never
delete from it. That framing doesn't hold: `rolesTagListHTML()`'s × has exactly **one**
call site (`removeRoleFromCrew(crewId, rolePath)`), reachable identically from the Crew
Database screen (D-1) and from **every** project Crew tab's Edit-pencil expansion — the
AZ/BF known gap MAP.md already documented (see the ⚠️ above `roleBannerHTML()`). There is
no code-level "D-1 only" version of this delete to attach a dialog to. Flagged and
stopped on rather than guessed at; the follow-up instruction confirmed **Option A — wrap
the shared function itself, universally**. The dialog now fires the same way regardless
of which screen's × triggered it, which makes the project-screen trigger point safer
(warned, and undoable on the cascade path) than it was. It does **not** newly scope or
disable that trigger point, and does not close the AZ/BF gap — a project screen can still
reach a crew-database-wide role deletion. That gap stays open, on purpose; separating it
would be a real behaviour change and wasn't this phase's brief.

### What changed

- `removeRoleFromCrew(crewId, rolePath)` — the "at least one saved role" guard is
  unchanged and still runs first, before anything else. Past the guard, it now computes
  `roleUsageProjectIds(crewId, roleName)` and either commits directly (zero usage — same
  as the old behaviour, no dialog) or opens the new dialog.
- `roleUsageProjectIds(crewId, roleName)` — new. A role is "in use" if any project's
  `p.crewEntries` holds an entry with this `crewId` and this exact role NAME (not path —
  entries store the plain name, same as `c.role`; `setEntryRole()`/`entryView()` already
  established that). Full scan of `projectsDB`, one `entriesForCrew()` call per project.
  At ~88 crew records and low dozens of projects this is trivially cheap — no index kept
  for it, and none is warranted at this volume. Returns distinct project ids, so two
  entries on the same project count once.
- `removeRoleDialogFor` / `removeRoleDialogHTML()` / `closeRemoveRoleDialog()` /
  `confirmRemoveRoleDialog(cascade)` — the dialog itself, rendered into the same
  persistent `#globalOverlay` div the "Add new role" dialog (`addRoleDialogHTML()`, Phase
  R item 5) already uses. `renderGlobalOverlay()` now concatenates both dialogs' HTML —
  safe because the two are never open together. States the affected DISTINCT project
  count before either button; "Leave in old call sheets" is `.primary` (filled,
  prominent, listed first — the default); "Delete from all projects — affects budgets" is
  `.danger` (red text only, not prominent) — deliberately not styled as the encouraged
  choice. A plain "Cancel" closes with zero mutation.
- `commitRoleRemoval(crewId, rolePath, roleName, cascade, projectIds)` — the one write
  path both dialog buttons (and the zero-usage skip-the-dialog case) funnel through.
  Always: drops the role from `c.roles`, and re-activates a replacement via
  `setActiveRole(crewId, c.roles[0], true)` if the removed role was the active one
  (`wasActive` check, unchanged from the old function body). Only when `cascade` is true:
  loops `projectIds`, and for each project filters that project's `entriesForCrew(crewId,
  p)` down to entries whose `role===roleName`, then removes them via `removeCrewEntries(p,
  ids)` **one project at a time** — the same hook `removeCrewFromProject()` and
  `bulkRemoveSelectedFromProject()` already route through, so positions, `crewOverrides`
  and `p.prepSchedule` (via `prunePrepSchedule()`) are pruned correctly rather than left
  dangling. Cascade wraps the whole thing in R17's existing undo —
  `beginUndo(['db:crew','db:projects','db:shootdays'])` before mutation,
  `finishUndo(label, snaps)` after — no new confirmation mechanism invented.
  ⚠️ **The no-cascade path ("Leave in old call sheets") is NOT undo-armed**, matching
  `removeRoleFromCrew()`'s pre-existing behaviour (it never had undo either) and R17's own
  scope ("destructive actions... not a general edit history") — it's a single-collection,
  non-cascading change with nothing further to accidentally lose.

### Verification

- `node --check` on the extracted inline script (both `<script>` blocks, in document
  order): clean.
- CSS brace balance: 478 open / 478 close — untouched by this phase, checked anyway.
- Every new identifier (`removeRoleFromCrew`, `roleUsageProjectIds`,
  `removeRoleDialogFor`, `closeRemoveRoleDialog`, `removeRoleDialogHTML`,
  `confirmRemoveRoleDialog`, `commitRoleRemoval`) greps to a definition plus at least one
  real call site — no orphans.
- **Fixture**: `bh-fixture.html`, built by a real script (`build-fixture.js`, refuses an
  already-stubbed source, requires each anchor — `saveDB`/`loadDB`/`scheduleAutosave` —
  to match exactly once, prints the bytes it wrote), served from a directory containing
  **no `index.html`** (confirmed: `/index.html` on that server 404s, so a dropped path
  cannot fall through to the real file). Carries a random per-session token
  (`window.__BH_FIXTURE__`); the token, both stubs (`saveDB`→`__BH_SAVES__`,
  `loadDB`→`window.__BH_SEED__`) and `location.href` were asserted before any interaction.
  `loadDB` never touches the network or the real Supabase project at all — it returns
  seed data (or the empty default) synchronously from memory.
- Dialog fires **identically** from both trigger screens: `crewFormHTML(c, null)` (D-1
  shape) and `crewFormHTML(c, entryId)` (project shape) produce byte-identical × onclick
  markup (`rolesTagListHTML()`'s × ignores `entryId`, as established). Confirmed further
  with two real DOM click-throughs via the actual router (`renderMain()` →
  `renderCrewDatabase()` / `renderMain()` → `renderProject()` → `renderProjectBody()` →
  `renderProjectCrew()`, Roles view, Edit-pencil open): same project count text, same
  three buttons in the same order and classes, from both screens.
- "Leave in old call sheets": role dropped from `c.roles`, active role reassigned when it
  was the one removed, and the existing project entry's role field verified
  **byte-identical** to its pre-deletion snapshot (`JSON.stringify` equality) — only
  `db:crew` saved, no undo armed.
- "Delete from all projects": built a fixture with Alice (role "Grip", in use on an
  active project P1 and a finished project P3) and Bob (also role "Grip", on P1, sharing
  the exact role name). Cascade removed Alice's two entries and left **Bob's identical-
  role-name entry, and an unrelated Carol entry on P1, provably byte-unchanged**. Both
  P1's and P3's shoot days had their `positions` and `crewOverrides` pruned for Alice's
  entry only (Bob's own `crewOverrides` entry on the same day survived); both projects'
  `prepSchedule` records were pruned per-entry, and P3's `prepSchedule` (Alice's entry was
  its only key) was deleted outright rather than left as an empty husk — matching Phase
  BD's documented "delete rather than husk" rule. `db:crew`/`db:projects`/`db:shootdays`
  all saved; `finishUndo()` armed with the expected label.
- **Undo**, exercised in a single script tick (a real two-round-trip test first false-
  failed by tripping R17's genuine 10-second window between separate tool calls — not a
  bug, a reminder that `UNDO_WINDOW_MS` is real): `undoLastAction()` restored
  `crewDB`/`projectsDB`/`shootDaysDB` to their pre-cascade state exactly — both roles
  back, active role back to "Grip", both entries back, both shoot days' positions/
  overrides back, both `prepSchedule` records back (including P3's, un-deleted).
- Affected-project-count scenarios, both required cases, via `roleUsageProjectIds()`
  directly: two entries on one project → `['x1']` (count 1); one entry each on two
  projects → `['x1','x2']` (count 2).
- A role with zero usage anywhere (`carol`/"Boom Operator") deleted with no dialog at
  all — `removeRoleDialogFor` stayed `null` throughout.
- The "at least one saved role" guard, re-tested through the new flow: fired its original
  alert text unchanged, left `c.roles` untouched, never opened the dialog, made zero
  writes — confirmed it still runs before any usage check or dialog logic.

### Left alone, as instructed
- AZ's `.role-add-marker` and the roles menu (BA/BB) — not built, not touched.
- `deleteCrew()` — unchanged; still the third entry-dropping path, still leaves shoot-day
  positions dangling as "(removed crew)", still does not route through
  `removeCrewEntries()`, still prunes `prepSchedule` for itself. This phase's dialog logic
  was not extended to it.
- The AZ/BF known gap itself (project screen → crew-database-wide role deletion) — made
  safer, deliberately not closed. See the ⚠️ above `roleBannerHTML()` for the corrected
  note.
- "+ Add crew member" form visibility, and a shoot day's `dayTotal` not resyncing —
  untouched, pre-existing, tracked separately.
- No code from `budget-v1-fail` was read or reused.

## Phase BA — the roles menu (9 Aug 2026)

Ships on top of `608affb` (BH, already landed) / `e5a3048` (BC) / `1c56578` (BD) /
`9ca9fdf` (BF) / `02d58c9` (BG) / `4d6f0a3` (BE) / `bfac972` (AZ). Wires AZ's "+" marker
(`roleBannerHTML()`) to a menu — the first half of Bundle 3; Phase BB (the menu's
"Add a new role…" footer item) ships as a separate, independently-revertable commit on
top of this one.

### Names confirmed against the real code before touching anything

- The Roles-view row renderer is still `crewRolesRowHTML()` — no post-BF rename.
- The canonical role picker from Phase R is `roleAddPickerHTML()` — a native
  `<select class="pill-select">` built from `ROLES_BY_DEPT`/`rolesFor(dept)`, already
  excluding roles the person has saved, reachable only from `crewFormHTML()`'s
  Edit-pencil expansion. (`newCrewRolePickerHTML()` is a *different* function — the
  single-role picker for a not-yet-saved crew member — also confirmed present, not
  touched by this phase.)
- The saved-roles array is `c.roles`, `"Department/Role"` path strings.
- Outside this phase, a role reaches `c.roles` only via `roleAddPickerHTML()`'s
  `<select>` → `addRoleToCrew()` (direct pick) or, via its own "+ Add new role…" option,
  `openAddRoleDialog()` → `addRoleDialogHTML()` → `confirmAddRoleDialog()` (typed
  department + typed role name, registered into `ROLES_BY_DEPT` first). Both paths were,
  before this phase, reachable only from that same Edit-pencil expansion — never from a
  project screen. (Phase BB reuses this exact machinery from the roles menu; see that
  phase's own MAP.md entry once it ships.)
- `addCrewEntry(p, crewId)` dedupes by `crewId` — a second call for someone already on
  the roster returned their existing entry, a no-op. Its own comment said this "stays
  [a no-op] until BA's 'Add again as' makes a second entry a deliberate act," which is
  exactly what this phase does — see below.

### What changed

- `roleBannerHTML()` — the "+" marker's `onclick` now calls `openRolesMenu(c.id)` (`c.id`
  is the ENTRY id in every caller — `crewRolesRowHTML()` and `prepRowHTML()` both hand
  this function an entry view). The marker's weight logic (solid when the person has
  other saved roles, faint otherwise) is unchanged. Because both T-2.1 and T-8.1 call
  this same function and neither has its own copy of the marker markup, wiring it here
  once means the roles menu opens identically from the Roles tab and the Pre-production
  tab — confirmed in the browser, not assumed.
- `addCrewEntry(p, crewId, force)` — gained an optional third parameter. Every existing
  call site (`addCrewToProject()`, AI Scan's matched-accept, Overview Quick add's
  `quickAddNewCrew()`) passes nothing and keeps the exact pre-BF dedup-on-re-add
  behaviour. Only `applyRoleToEntryByMode()`'s "Add again as" path passes `force=true`,
  skipping the dedup to get a genuinely second entry. Regression-checked directly: a
  no-force call against a person who already has an entry still returns that same entry
  and creates nothing.
- `rolesMenuFor` / `rolesMenuMode` / `openRolesMenu()` / `closeRolesMenu()` /
  `setRolesMenuMode()` / `rolesMenuExcludedNames()` / `rolesMenuListHTML()` /
  `applyRoleToEntryByMode()` / `pickRolesMenuRole()` / `rolesMenuHTML()` — new. The menu
  itself: a `.modal-overlay`/`.modal-box` dialog (the same idiom `addRoleDialogHTML()`
  and `removeRoleDialogHTML()` already use — no new UI pattern invented; the app had no
  anchored/inline popover idiom to reuse instead, only native `<select>` pickers and this
  centred-dialog shape) rendered into the persistent `#globalOverlay`, concatenated
  alongside the other two in `renderGlobalOverlay()` (never open together in practice —
  opening this menu happens from a row the other two dialogs' trigger points aren't
  reachable from while it's up).
  - The mode toggle at the top uses the same `.tab`/`.active` idiom as the existing view
    switchers (`crewGridView`, `budgetView`) — deliberately, per the brief: neither mode
    may be styled more prominently than the other on the grounds that "Add again as" is
    newer. `.tab.active` carries no inherent weight beyond "currently selected," which is
    exactly the constraint.
  - `rolesMenuMode` resets to `'change'` every time `openRolesMenu()`/`closeRolesMenu()`
    runs, so the default is never silently carried over from a previous open.
  - `rolesMenuListHTML()` draws from `c.roles` in BOTH modes — never `ROLES_BY_DEPT` —
    and excludes by role NAME (not path), matching how entries themselves store role
    (`entry.role` is a plain name, same as `setEntryRole()`/`entryView()` already
    established). "Change to" excludes only the entry's own current role
    (`entryById(entryId, p).role`); "Add again as" excludes every role held by ANY of
    `entriesForCrew(crewId, p)` — confirmed live, not stale: after changing one of a
    two-entry person's entries away from a role, "Add again as" immediately offered that
    role again on the very next open, since the exclusion set is recomputed from current
    entry state every render, not cached at menu-open time.
  - Picking a role calls `pickRolesMenuRole()`, which clears `rolesMenuFor` first and then
    calls `applyRoleToEntryByMode()` — "change" calls `setEntryRole(entryId, rolePath)`
    directly (one entry in, one entry out, nothing created); "add" calls
    `addCrewEntry(p, crewId, true)` then `setEntryRole()` on the NEW entry's id, so the
    entry's creation and its role both land in the one `saveDB('db:projects', …)` write
    `setEntryRole()` already makes — no extra save added.
  - Empty state (`c.roles` filtered down to nothing, or genuinely empty/undefined) renders
    "No other saved roles." via the same `.hint` class `rolesTagListHTML()` uses for its
    own empty state — no new class. Exercised for all three shapes named in the brief: a
    person with 1 saved role (their own current role excluded, list empty in "change"), 2
    saved roles held across 2 entries (list empty in "add" once both are held), and 0
    saved roles (renders cleanly, no crash — the marker itself has rendered for
    zero-saved-role people since Phase AZ).

### Confirmed in code (per the brief's instruction not to assume it)

**"Change to" needs no manual propagation step.** Every downstream reader of an entry's
role reads it fresh off the entry object on every render, never from a cache or a second
copy: `resolveCrewForDay()`/`dayOverrideFormHTML()` for shoot-day positions, and
Pre-production's `prepRowHTML()` (via the same `roleBannerHTML()` this phase wired).
Verified directly in the browser fixture: changed one of Bob's two entries from "1st AC"
to "2nd AC" via the menu, then — with no other action — `resolveCrewForDay()` for that
entry's shoot-day position returned the new role, and switching to the Pre-production tab
showed both of Bob's rows reading the new role immediately on that tab's normal render.

### Verification

- `node --check` on both extracted `<script>` blocks (the tiny Supabase-client one and
  the ~8,000-line main one, in document order): clean.
- CSS brace balance: 479 open / 479 close (478/478 before this phase's one added rule,
  `.role-add-marker:hover`).
- Orphan sweep: every new identifier (`openRolesMenu`, `closeRolesMenu`,
  `setRolesMenuMode`, `rolesMenuExcludedNames`, `rolesMenuListHTML`,
  `applyRoleToEntryByMode`, `pickRolesMenuRole`, `rolesMenuHTML`, `rolesMenuFor`,
  `rolesMenuMode`) greps to a definition plus at least one real call site. Every stale
  "AZ's inert marker" comment (Pre-production's CSS and `prepRowHTML()`'s doc comment)
  was found and corrected rather than left describing a state that no longer holds.
- No path in this phase removes anything from `c.roles` or calls `removeRoleFromCrew()` —
  grepped and confirmed; this phase only ever pushes/reads that array via functions that
  already existed before it (Phase BB is the one that adds a write path, and even that is
  additive per the standing rule).
- **Fixture**: `ba-fixture.html`, built by a real script (`build-fixture.js`, refuses an
  already-stubbed source, brace-counts each anchored function's body rather than
  searching for the next `{` — an early version of this script mismatched on
  `loadDB()`'s anchor already ending in `{`, which is exactly the kind of bug this
  discipline exists to catch — and prints the bytes it wrote), served from a directory
  containing **no `index.html`** (confirmed: `/index.html` on that server 404s; `/` on
  its own serves a directory listing, not the fixture). Carries a random per-session
  token (`window.__BA_FIXTURE__`), asserted before any interaction. `loadDB` is stubbed
  to return seed data (`window.__BA_SEED__`) synchronously from memory — no network, no
  real Supabase project touched, ever; `saveDB` is stubbed to record every write into
  `window.__BA_SAVES__` rather than persisting anything.
- Exercised in the browser against a seeded fixture (Alice: 1 saved role; Bob: 2 saved
  roles held across 2 separate entries on the one project; Carol: 0 saved roles) via both
  real DOM click-throughs (`renderMain()` → `renderProject()` → `renderProjectBody()` →
  `renderProjectCrew()`, Roles view, clicking the actual "+" marker and mode tabs) and
  direct function calls for the parts a screenshot can't show:
  - Alice's menu: "Change to" and "Add again as" both correctly show "No other saved
    roles." (her one saved role is her only entry's current role).
  - Bob's "1st AC" entry, "Change to": list shows exactly `["2nd AC"]`.
  - Bob's "1st AC" entry, "Add again as": list is empty (he already holds both his saved
    roles, across his two entries) — the multi-entry exclusion the brief specifically
    asked for.
  - Picked "2nd AC" in "Change to": entry count unchanged (4→4), that one entry's role
    updated, the person's OTHER entry untouched, exactly one `db:projects` save recorded,
    menu closed.
  - Added a third saved role ("Loader") to Bob directly (simulating what Phase BB will do
    through its own UI), then "Add again as" on his by-then-both-"2nd AC" entries offered
    `["1st AC","Loader"]` — proving the exclusion set is live, not a snapshot of the
    original seed. Picked "Loader": entry count 4→5, new entry carries `role:"Loader"`,
    resolves a rate via the normal crew-record fallback (no rate seeded on creation,
    matching every other entry), menu closed, no extra save beyond the one
    `setEntryRole()` already makes.
  - Regression: `addCrewEntry(p, 'bob')` with no `force` argument, called directly after
    Bob already had 3 entries, still returned his first existing entry and created
    nothing — the dedup every other caller relies on is intact.
  - Carol (0 saved roles): menu opens, title renders her name, both modes show "No other
    saved roles.", closes cleanly. No console errors at any point in the session
    (`read_console_messages` empty throughout).

### Left alone, as instructed

- Phase BB's "Add a new role…" footer item — not built in this commit; ships separately.
- The AZ/BF known gap (project screen → crew-database-wide role deletion via the
  Edit-pencil expansion's × ) — untouched, still open, see the ⚠️ above `roleBannerHTML()`.
- `deleteCrew()` leaving positions dangling as "(removed crew)"; "+ Add crew member" form
  visibility; a shoot day's `dayTotal` not resyncing — pre-existing, out of scope, not
  touched.
- No code from `budget-v1-fail` was read or reused.
- No rate × days totals, aggregation or rollup added anywhere.

## Phase BB — "Add a new role…" (9 Aug 2026)

Ships on top of Phase BA (this session's own prior commit) as a separate,
independently-revertable commit, per the bundle's own instruction. Adds the roles menu's
persistent footer item.

### What changed

- `newRolePickerOptionsHTML(c)` — new, extracted from `roleAddPickerHTML()`'s body with no
  behaviour change to that function (verified: its own `<select>` still generates
  byte-identical `<option>`/`<optgroup>` markup). The canonical role picker from Phase R,
  now shared rather than living only inside `roleAddPickerHTML()`.
- `rolesMenuAddRolePickerHTML(entryId, crewId, c)` — a second `<select class="pill-select">`
  built from the same `newRolePickerOptionsHTML(c)`, rendered as the roles menu's footer,
  present in BOTH modes (`rolesMenuHTML()` now renders it directly under the saved-roles
  list, above the Close button). Its `onchange` calls `pickRolesMenuNewRole()` instead of
  `addRoleToCrew()` — a different handler, same picker.
- `pickRolesMenuNewRole(entryId, crewId, selectEl)` — new. A direct canonical pick pushes
  onto `c.roles` (mirroring `addRoleToCrew()`'s own write, including the "first saved role
  becomes active" bootstrap via `setActiveRole(crewId, value, true)` when `c.roles.length`
  was 1 after the push), saves `db:crew`, closes the roles menu, then calls
  `applyRoleToEntryByMode()` with the mode captured at click time — so the exact same
  function BA's own list uses is what actually lands the role on an entry; this phase adds
  no second "apply to entry" implementation. Picking "+ Add new role…" instead closes the
  roles menu and opens the real `addRoleDialogHTML()` dialog via
  `openAddRoleDialog(crewId, onAdded)`, with `onAdded` bound to
  `applyRoleToEntryByMode(entryId, crewId, mode, path)` — so the typed-role escape hatch
  goes through `confirmAddRoleDialog()` unchanged (same `ROLES_BY_DEPT` registration, same
  `c.roles` push, same first-role bootstrap) and only its NEW optional continuation applies
  the result to the entry afterward.
- `openAddRoleDialog()` / `closeAddRoleDialog()` / `confirmAddRoleDialog()` — extended with
  the optional `addRoleDialogThen` continuation described above (see its entry in
  **Shared/utility functions**). No existing caller passes one.
- No schema change, no rate/days change, no new confirmation prompt (per the brief —
  adding to the crew database from a project screen is the explicitly-allowed direction).

### The exclusion question the brief asked to confirm, not resolve

**Confirmed: the canonical picker already excludes roles the person has saved, on both its
paths, so this phase cannot reopen the same-role-twice path BA's list deliberately closes.
No decision was needed from whoever scoped this bundle, and none was made unilaterally —
this is a report, not a judgement call.**

- The direct-pick path: `newRolePickerOptionsHTML(c)` builds its `has` set from `c.roles`
  and filters every `ROLES_BY_DEPT` role against it before the option ever renders — an
  already-saved role is never in the list to begin with.
- The typed "+ Add new role…" path: `confirmAddRoleDialog()` guards with
  `if(!c.roles.includes(path)) c.roles.push(path)` before ever touching the array — typing
  in the department/name of a role the person already holds is a silent no-op on `c.roles`
  (though it would still count as a valid "apply this role" pick for BB's continuation,
  since the path is well-formed either way; the guard only stops a *duplicate* array entry,
  it doesn't refuse the pick itself — worth naming plainly rather than leaving implicit).
- Verified directly in the browser fixture: reopening the picker on a person immediately
  after saving a new role never re-offered that same role, on either path.

### Verification

- `node --check` on both extracted `<script>` blocks: clean.
- CSS brace balance: 479 open / 479 close, unchanged from Phase BA — this phase added no
  CSS (`rolesMenuAddRolePickerHTML()` reuses `.pill-select` verbatim).
- Orphan sweep: `newRolePickerOptionsHTML`, `rolesMenuAddRolePickerHTML`,
  `pickRolesMenuNewRole`, `addRoleDialogThen` all grep to a definition plus at least one
  real call site.
- Regression: called `openAddRoleDialog('bob')` the old way (one argument, exactly as
  `addRoleToCrew()`'s own `__addrole__` branch still calls it) and drove it to completion —
  the role landed on `c.roles` and `ROLES_BY_DEPT`, and **no continuation fired, no entry
  was touched** — confirmed by diffing every one of that person's entries before and after.
- No path in this phase removes anything from `c.roles`, `ROLES_BY_DEPT`, or any entry —
  every write is a push or a field-set. Grepped to confirm.
- **Fixture**: rebuilt `bb-fixture.html` from the post-BA, post-BB source with the same
  `build-fixture.js`, same no-`index.html` directory convention, fresh random per-session
  token, `loadDB`/`saveDB` stubbed and asserted before interaction. (One fixture *data*
  mistake caught and fixed during this phase's own testing, logged so the pattern is
  named: the seed used the department string `'Camera'`, which isn't a real
  `ROLES_BY_DEPT` key — the real one is `'Cinematography'` — so the first exclusion test
  passed for the wrong reason. Caught by cross-checking `DEPARTMENTS`/`ROLES_BY_DEPT` in
  the live fixture rather than trusting the seed, re-seeded correctly, and every assertion
  below is against the corrected fixture.)
- Exercised in the browser: Alice (1 saved role) — picker excludes her held role, includes
  every other canonical Cinematography role plus every other department; picked "2nd AC" in
  "Change to" — `c.roles` gained it, her entry's role changed (one entry in, one entry out,
  count unchanged), her PERSON default (`c.role`) stayed "1st AC" (the length-1 bootstrap
  correctly did not fire, since she already had a saved role) — 3 saves total
  (`db:projects`/`db:crew`/`db:projects`), no extras.
- Bob (2 saved roles, already held across his two entries), "Add again as": picker offered
  every role except his two held ones; picked "Loader" — a genuinely third entry appeared
  (`addCrewEntry(force=true)` fired correctly through the new path too), his existing two
  entries untouched.
- Carol (0 saved roles): list area shows "No other saved roles.", footer picker still
  present and is the only actionable thing in the menu, in both modes — the empty state the
  brief specifically asked to confirm. Used her picker's "+ Add new role…" to type a
  genuinely novel role ("Playback Operator", not previously in `ROLES_BY_DEPT['Audio']`):
  registered into the canonical list, pushed onto `c.roles`, her person default bootstrapped
  correctly (length-1 case, this time DID fire), and her entry's role updated — all via one
  click-through of the real dialog, not a direct function call.
  - Correction mid-verification: an initial timing check read `p.crewEntries.length` and
    `rolesMenuFor` in the same synchronous script block as the `change` event dispatch, and
    saw no change — not a defect. Every `saveDB` stub call resolves an *already-settled*
    promise with no internal `await`, but `await`ing even a settled promise still defers
    the caller's continuation to a microtask; the click's own event dispatch returns before
    that microtask runs. Re-checked in a fresh script execution (a new task, so prior
    microtasks have long since flushed) and the state was correct throughout. Recorded so a
    future verification pass doesn't misread the same artefact as a bug.
- No console errors at any point in the session (`read_console_messages` empty throughout).

### Left alone, as instructed

- The AZ/BF known gap (project screen → crew-database-wide role deletion) — untouched,
  still open.
- `deleteCrew()` leaving positions dangling; "+ Add crew member" form visibility; a shoot
  day's `dayTotal` not resyncing — pre-existing, out of scope.
- No code from `budget-v1-fail` was read or reused.
- No rate × days totals, aggregation or rollup added anywhere.

## Gate 1 — style/consistency review, AZ–BH stream (10 Aug 2026)

**Audit only. Zero lines of `index.html` changed by this pass.** Scheduled Gate 1 check
(same shape as Phase U / `refinement-review.html`'s R1–R18 — small obvious
inconsistencies get fixed directly, anything implying a design decision gets written up
as a numbered finding rather than built) over the nine phases never style-reviewed as a
whole: `bfac972` (AZ) → `4d6f0a3` (BE) → `02d58c9` (BG) → `9ca9fdf` (BF) →
`cde4567`/`ebe0114`/`1c56578` (BD) → `e5a3048` (BC) → `608affb` (BH) → `36183d7` (BA) →
`8b635e4` (BB). Local `main` was one fast-forward behind origin (missing BA/BB) at the
start of this session; pulled to `8b635e4` before anything else.

**Result: no findings.** Every surface named in the brief was checked against the design
system decisions recorded above (Phase Detail/Fonts/Style Review/Refinement) both by
reading the code and by driving it live in a stubbed fixture, and all of it already
matches:

- **Role chip + "+" marker** (`roleBannerHTML()`, AZ+BE) — `.role-chip` reuses the
  checkbox's own `1.5px solid` / `3px radius` literals exactly as documented; the marker's
  weight (`--muted` faint / `--text` solid) was confirmed by computed style in a live
  render, not just read off the CSS — a person with one saved role renders
  `rgb(111,106,99)`, a person with two renders `rgb(17,10,8)`, matching
  `hasOtherRoles = c.roles.length>1` exactly.
- **The roles menu** (`openRolesMenu()`, BA+BB) — confirmed it reuses the existing
  `.modal-overlay`/`.modal-box` dialog shell verbatim (same shell `addRoleDialogHTML()`
  and `removeRoleDialogHTML()` use) rather than introducing a new popover pattern, and the
  "Change to"/"Add again as" mode toggle reuses the existing `.tab`/`.tab.active` idiom
  (`crewGridView`, `budgetView`) with no special-casing of either mode's weight. Exercised
  live: opened from a two-entry person, both modes render correctly ("Camera Operator"
  offered in "Change to", "No other saved roles." in "Add again as" since both saved
  roles were already held) — verified on both desktop and a 375px mobile viewport, where
  the dialog reflows to full-width cleanly.
- **The Pre-production tab** (BD) — row layout, the bare rate/days fields (no headers, no
  inline labels), and the date-mark calendar icon were all confirmed live rather than
  assumed: setting 5 days and marking 1 date rendered the counter as
  `"5 days booked · 1 date marked"` with **no warning styling** for the mismatch (per the
  documented rule), and the calendar icon's weight flipped from `--muted` to `--text` on
  marking a date, in the same computed-style check as the Roles-view marker. AZ's weight
  convention was in fact followed, not just claimed.
- **BH's role-deletion dialog** (`removeRoleDialogHTML()`) — confirmed it uses the same
  `#globalOverlay` custom-dialog pattern as `addRoleDialogHTML()`, not a native
  `confirm()` or a third shape. Triggered live against a role in use on 2 projects: the
  dialog's `.primary` (filled, encouraged) "Leave in old call sheets", `.danger`
  (text-only, not encouraged) "Delete from all projects", and plain "Cancel" all render
  with the same button classes used everywhere else destructive/primary actions appear in
  the app (`deleteProject()`, `deleteCrew()`, `confirmAddRoleDialog()`).
- **BG's confirms** (`useCrewAsTemplate()`, `saveCrew()`'s duplicate-name warning) — both
  read as plain `confirm(...)`, matching `deleteCrew()` and `removeSubDeptAdmin()`
  exactly. No dialog-shell divergence.
- **General drift** — no new bare `<h4>` (the six from Phase Refinement stayed fixed; the
  only `<h4>`s left are the pre-existing, correctly-styled `.ki-item h4` ones in Preview &
  Export's key-info blocks, untouched by this stream). The one inline `style=` override
  worth naming — BH's `.toolbar` flipped to `flex-direction:column` for its three stacked
  dialog buttons — is a genuine one-off (every other `.toolbar` inline style in the app
  only adjusts margin) rather than a repeated duplicate crying out for a class, so it was
  left as-is rather than "fixed" into a modifier nobody else needs yet. Diffed the full
  `bfac972^..8b635e4` range for every added `*HTML()` function against this checklist —
  nothing in scope was missed; the handful not covered above (`crewExpansionHTML()`,
  `crewRateSaveIconHTML()`, `crewFormHTML()`) are BF's entry-id plumbing with no styling
  changed, confirmed from the diff context rather than assumed.

### Verification

- `node --check` on both real inline `<script>` blocks (extracted from the unmodified
  `index.html`, document order): clean.
- CSS brace balance: 479/479 — unchanged from Phase BB, since no CSS was touched.
- Orphan sweep on every function this pass actually exercised (`roleBannerHTML`,
  `openRolesMenu`/`closeRolesMenu`/`rolesMenuHTML`/`rolesMenuListHTML`/
  `rolesMenuAddRolePickerHTML`, `removeRoleDialogHTML`/`confirmRemoveRoleDialog`/
  `commitRoleRemoval`/`roleUsageProjectIds`, `prepRowHTML`/`prepCalendarHTML`/
  `prepCounterText`, `useCrewAsTemplate`/`duplicateCrew`): every one resolves to a
  definition plus at least one real call site.
- **Fixture**: built by a real script (`build-fixture.js`, refuses an already-stubbed
  source, brace-counts each anchored function's body to find the true matching close
  rather than searching for the next `{`), serving from a scratch directory containing
  **no `index.html`** (confirmed: `/` on that server returns a directory listing).
  `loadDB`/`saveDB` stubbed to read/write an in-memory seed and record array — no network,
  no real Supabase project touched at any point. Exercised interactively: gave a seeded
  crew member (Justin Schoenrock) a second saved role and a second entry via direct state
  manipulation (the same technique BC's and BA's own verification used), then drove the
  roles menu, the Pre-production calendar, and the BH deletion dialog through real
  `computer`/`javascript_tool` interaction on both a desktop and a 375×812 mobile
  viewport. No console errors at any point.
- Confirmed via `git status`/`git diff --stat` that this pass made zero changes to
  `index.html` before writing this entry — there is nothing to fingerprint against
  production, because nothing changed.

### Left alone, as instructed
- No direct fixes were made — none were needed. No numbered findings list either: every
  named surface already matched the documented design system.
- All of AZ–BH's own "left alone" notes (the AZ/BF known gap, `deleteCrew()`'s dangling
  positions, "+ Add crew member" form visibility, `dayTotal` not resyncing, BG's deferred
  Solution B, BF's migrate-on-load divergence) — none of these are style issues and none
  were touched, per the brief.
- No code from `budget-v1-fail` was read or reused.

## Phase BJ — Pre-production becomes a Crew sub-tab (10 Aug 2026)

Ships onto `0098c05` (Gate 1, the AZ–BH stream). Phase BI (AI Scan propose tasks) may or
may not have landed by the time this ran; unrelated either way, and untouched here.

### The move

Pre-production stops being a top-level project tab (**T-8**) and becomes a `crewGridView`
value (`'preprod'`) inside Crew's existing view-switcher, positioned between Roles and
Days on site — **Roles → Pre-production → Days on site → Hotel → Travel → Catering**.
Concretely:

- Removed from the `.tabs` strip in `renderProject()` and from the
  `if(currentProjectTab==='…')` chain in `renderProjectBody()`.
- `renderProjectCrew()`'s `viewLabels` object gained a `preprod` key, inserted between
  `roles` and `days` — `Object.keys()` order is what the switcher renders, so insertion
  order alone gives the required tab order.
- `entryLevel` (which picks `projectEntryViews()` vs. the deduplicated `projectCrew()`,
  and which drives "Select all"'s id-expansion) gained `|| crewGridView==='preprod'` —
  Pre-production is entry-grain, same as Roles and Days on site.
- A new `else if(crewGridView==='preprod')` branch in the same `if/else` chain that
  already special-cases `roles`/`travel`, mirroring the `roles` branch exactly but
  calling `prepRowHTML()` instead of `crewRolesRowHTML()`, and reusing the same
  `groupHeaderHTML`/`collapsedProjectDepts` closures the `roles` branch already has in
  scope — no new grouping code.
- `renderProjectPreproduction()` (the old standalone tab-body function) is deleted
  outright, not left dead. Its content — the "no filtering, DEPARTMENTS-order grouping"
  logic — is GONE, not moved: Pre-production now filters/sorts/groups exactly like every
  other Crew sub-tab, through `buildProjectCrewGroups()`/`personMatchesProjectFilter()`,
  which was the actual point of this phase (see below). Only `prepRowHTML()` (the row
  renderer) and the calendar/counter/storage functions beneath it survive unchanged.

### Inheriting the shared chrome, not rebuilding it

This was the actual point of the phase. Pre-production's rows now render inside the
literal same `crewToolbarHTML()` row and `filterPanelFootHTML()` panel every other Crew
sub-tab uses — same Select all, same Filter toggle + panel, same Sort/Group by, same
Expand/Collapse-all, same bulk-select — because it reached the code that already builds
those for free, once `entryLevel` and the new render branch put it on the same code path.
No second toolbar was built.

- **Bespoke header/collapse audit, confirmed against the real code rather than assumed**:
  Pre-production's old standalone body had NO filter (BD's own spec said so, and the code
  confirmed it — it called neither `projectCrewFilter` nor `buildProjectCrewGroups()`),
  but it DID have its own Expand/Collapse-all wired to its own `collapsedPrepDepts` Set,
  and its own `crewToolbarHTML('', '', rightHeaderHTML)` call (blank Select-all and Filter
  slots, since it had neither). That toolbar call is gone along with the function; the
  new render branch reaches the ONE `crewToolbarHTML()` call `renderProjectCrew()` already
  makes for every view. `collapsedPrepDepts` / `toggleProjectPrepDeptCollapse()` /
  `toggleAllPrepDeptsCollapsed()` are deleted, not left orphaned — Pre-production now
  shares `collapsedProjectDepts` with Roles/Days on site/Hotel/Travel/Catering, per the
  brief's explicit "same Expand/Collapse-all mechanism" requirement. This is a real,
  deliberate behaviour change from the sibling-tab era (BD's own note said the separate
  Set was deliberate, "collapsing a department here is not a statement about the Crew
  tab") — now it is one, and that's what "becomes a Crew sub-tab" means. Verified both
  directions live: collapsing Cinematography on Pre-production collapses it on Roles, and
  the reverse.
- ⚠️ **REMOVED in Phase BQ follow-up (11 Aug 2026).** The one piece of Pre-production-
  specific copy that survived this phase — the hint line ("Prep days are not shoot days —
  nothing here reaches a call sheet or an export…"), rendered conditionally on
  `crewGridView==='preprod'` between the view-switcher and the shared toolbar row — is
  gone on request. The judgement here ("not chrome, it's content, so it stays") was
  overruled: it is a standing note about a tab you look at every day, and the tab now
  reads the same as its five siblings, with no conditional copy above the toolbar. Do not
  reinstate it; the facts it stated are still true and still recorded in this map.
- **Bulk-select is new on this tab** — the old standalone screen had no bulk-action bar to
  select into. `prepRowHTML()` gained a `.prep-controls` checkbox cell (identical pattern
  to `crewRolesRowHTML()`'s `selectCb`, writing into the same `projectCrewSelected` Set of
  entry ids), and `.prep-grid`'s `grid-template-columns` gained a leading `32px` column for
  it. No Edit-pencil was added alongside it — Pre-production has no crew-record edit path
  of its own and this phase didn't invent one; "Edit"/"Remove from project" on the bulk
  bar apply to the selection generically through `selectedEditTargets()`/
  `bulkRemoveSelectedFromProject()`, which don't need a per-row edit affordance to work.

### `p.prepSchedule` vs `p.crewEntries` — checked, not changed

Confirmed `p.prepSchedule` (parallel storage, keyed by entry id) still agrees with
`p.crewEntries` about what a row is: every entry that should carry a prep record can
still find one via the unchanged `prepScheduleOf()`/`prepRecordOf()` accessors, and
`prunePrepSchedule()` (called from `removeCrewEntries()` and `deleteCrew()`) is
untouched. Nothing about moving the tab requires prep records to migrate — the storage,
the accessors, the write path (`prepWrite()`) and the pruning hook are all byte-for-byte
what BD built. Not restructured, per the brief, even though the "PARALLEL, not a field on
`p.crewEntries`" shape now looks like it could be simplified now that both live under one
tab — that's a separate decision for a later phase, not this one's to make.

### Confirmed unchanged: exports, totals, everything downstream

Pre-production data was never read by `buildFullData()`, `buildWAText()`,
`downloadExcel()`, or any Budget calculation before this phase, and grepping the same
functions after confirms `prepSchedule` still appears nowhere in them. Verified live in
the fixture too: `buildFullData()`'s and `buildWAText()`'s output for a seeded day
contained no trace of `prepSchedule`/prep data, while `p.prepSchedule` itself remained
intact on the project object. The "no totals" rule (nothing on this tab sums or rolls
up) was never wired to any total elsewhere in the app, so there was nothing for the move
to disturb.

### Verification

- `node --check` on both real inline `<script>` blocks (extracted from the unmodified
  `index.html`, document order): clean.
- CSS brace balance: 480/480.
- Orphan sweep: `renderProjectPreproduction()`, `collapsedPrepDepts`,
  `toggleProjectPrepDeptCollapse()`, `toggleAllPrepDeptsCollapsed()`, and the
  `currentProjectTab==='preprod'` dispatch line all confirmed to have zero remaining
  references anywhere in `index.html` after removal.
- **Fixture**: `bj-fixture.html`, built by a real script (`build-fixture.js`, refuses an
  already-stubbed source, brace-counts each anchored function's body to find the true
  matching close), serving from a scratch directory containing **no `index.html`**
  (confirmed: `/` on that server returns a directory listing, `curl`'d). `loadDB`/
  `saveDB`/`scheduleAutosave` stubbed to an in-memory seed and three record arrays
  (`window.__BJ_LOADS__`/`__BJ_SAVES__`/`__BJ_AUTOSAVES__`) behind a random per-session
  token (`window.__BJ_FIXTURE__`) — token, stub identity and `location.href` asserted
  before any interaction. Exercised interactively against the auto-seeded ROW 2026
  London project: gave Justin Schoenrock a second saved role and a second entry via
  direct state manipulation (same technique BA/BH/Gate-1 used) with a seeded prep record
  (4 days, 3 marked dates) on the original entry, then drove the real UI —
  `computer`/`javascript_tool`/`form_input` — through: top-level tab strip (confirmed 7
  tabs, no Pre-production), the Crew sub-tab strip (confirmed 6 tabs in the required
  order), opening the Filter panel and filtering to a department (confirmed it persists
  identically switching to Days on site — same `projectCrewFilter`), Expand/Collapse-all
  cross-tab sharing (confirmed above), bulk-select cross-tab sharing (`projectCrewSelected`
  identical on Roles and Pre-production), editing the days field and switching tabs away
  and back (value held: 7 → "7 days booked · 3 dates marked"), and opening the date-marks
  calendar (marks matched the seed exactly). Re-checked at a 375×812 mobile viewport —
  clean stack, checkbox at the top of each card, no broken layout. No console errors at
  any point. Confirmed via Supabase (`app_data` table, project `ioueoaasqnseuhrtzhbz`)
  that `db:projects`' newest write predates this session and nothing this session did
  reached it — the fixture's `saveDB` stub never calls the real `sb` client.

### Left alone, as instructed
- No schema changes; `p.prepSchedule`'s shape is untouched (see above).
- BK/BL/BM's territory (grouped person blocks, collapsing beyond the existing
  expand/collapse mechanism, roles-menu relocation) — not touched.
- The known pre-existing issues this stream has carried since AZ–BH (`deleteCrew()`
  leaving positions dangling as "(removed crew)", the project-screen route to
  `removeRoleFromCrew()`, "+ Add crew member" not visually showing its form, a shoot
  day's `dayTotal` not resyncing when a new day is added) — none touched, none fixed.

## Phase BK + BL — grouped person blocks, collapsible stacks (10 Aug 2026)

Ships onto `87497dc` (BJ), which sits on `0098c05` (Gate 1). Phase BI (AI Scan propose
tasks) had NOT landed; unrelated either way, and untouched here. **One commit, not two**:
BL is not a layer on top of BK so much as the other half of the same rewrite — the six row
renderers are rewritten exactly once, and a BK-only commit would have had to ship a
person block that renders every role row expanded with no chevron, i.e. a state nobody
asked for and nobody would ever run. Splitting would have produced a bigger, more
tangled diff than shipping them together, not a smaller one.

### BK — one card per person, on all six sub-tabs

Every Crew sub-tab (Roles, Pre-production, Days on site, Hotel, Travel, Catering) renders
ONE CARD PER PERSON, with that person's role entries stacked beneath their name.

- **BF's `entryLevel` split is gone.** Every view is now built the same way: filter at
  ENTRY grain — the grain the roster actually has, and the grain every filter criterion
  (department, role, company, days) is really about — then group the survivors into one
  block per person via `buildPersonBlocks()`. Hotel/Travel/Catering stopped calling
  `projectCrew()` entirely: the block IS the deduplication, and it carries the person's
  entries with it instead of throwing them away, which is the whole reason those tabs
  could not show role rows before.
- **The block is entry-view-shaped.** It is a copy of the person's HIGHEST-SENIORITY
  entry view with `.entries` and `isPersonBlock` added. That is `entryView()`'s own trick
  one level up, and it is why `sortProjectCrewGroup()`/`buildProjectCrewGroups()` needed
  almost no change to "rank/group a person by their top role" — they already read
  `.role`/`.department`, and the block wears the right ones. Via the EXISTING
  `roleSeniorityRank()`; no second seniority concept was invented.
  - Three places did need the person grain spelled out: `sortProjectCrewGroup`'s
    `daysCount` (now `crewDayCount()`, the deduplicated union — `entryDayCount()` would
    double a two-role person working both roles on one day, the Phase AO trap),
    `sortProjectCrewGroup`'s `added` (a block ranks on its EARLIEST entry, because a
    person joined the project when their first entry did), and
    `buildProjectCrewGroups`'s `daysOnSite` multi-bucket (now `crewOnDay()`, so a
    two-role person lands in a day's bucket once).
- **Name line vs role rows follows the data, not taste.** Person-level facts sit on the
  name line because they are keyed to `crewId` and a flat per-entry list genuinely had
  nowhere to put them: hotel nights + Hotel's "All", the travel method + car details, the
  three catering meal rows, "Show as". Entry-level ones sit on the role rows because they
  are keyed to an entry id: the rate, prep days + date marks, Days-on-site checkboxes +
  that row's "All" + the remove trash.
- **Columns still line up.** Each row inside a block is still the tab's own grid class
  (`.roles-grid` / `.crewgrid` / `.prep-grid`) with explicit `grid-column` placement, so
  the Rate column reads straight down the page exactly as it did when the list was flat.
  Explicit placement rather than empty filler cells, because on mobile
  `.roles-grid-cell::before{content:attr(data-label)}` would have rendered a labelled
  empty row for every filler.
- **Single-role people keep the exact same structure** — name line plus one role row.
  Nothing collapses or changes shape based on role count; the block is uniform.
- **Bulk select means the person, through the existing mechanism.**
  `personBlockSelectCbHTML()` → `toggleCrewPersonSelected(crewId, checked, entryIdsCSV)`,
  the third argument being new. `projectCrewSelected` still holds only ENTRY ids — it is
  module-level and survives `setCrewGridView()`, so it still has to mean one thing.
- ⚠️ **No per-person total.** That slot is empty and stays empty: no rate × days, no
  roll-up, no aggregation, nothing summed. Same standing rule Pre-production carries, same
  cautionary precedent (`budget-v1-fail`). None of its code was read or reused.
- Removed as genuinely orphaned, not left dead: `toggleCrewSelected()`,
  `crewIdentityHTML`'s `opts.bulkSelect` branch, and the CSS rules `.roles-grid-row`,
  `.roles-grid-row-editing`, `.roles-grid-editform` (desktop + mobile),
  `.crewgrid-row-editing`, `.prep-grid-row`.

### BL — the stack collapses to one REAL entry

- Fronted = most days IN THE CURRENT PHASE, ties by `roleSeniorityRank()`, remaining ties
  by roster order (`Array#sort` is stable). `'preprod'` → `prepDaysOf()`; everything else
  → `entryDayCount()`. Whatever rate/days the collapsed line shows are that entry's own
  honest numbers — nothing is synthesised or summed.
- **What "current phase" resolves to on ROLES — the finding the brief asked for.**
  It resolves to the SAME shoot-day signal as Days on site,
  `(d.positions||[]).some(pos=>pos[0]===entryId)` via `entryDayCount()`. Determined from
  the code, not assumed: the Roles grid is Name / Role / Rate / Show as and carries **no
  day dimension of its own at all** (Phase Z dropped Department for Rate; nothing on that
  grid reads or writes any day data), and outside Pre-production's `p.prepSchedule` a
  shoot-day position is the ONLY per-entry "days" quantity that exists anywhere in the
  app. So it is not the best guess for Roles, it is the only one available. Verified live.
  ⚠️ `entryDayCount()`, never `crewDayCount()` — fronting chooses BETWEEN one person's
  entries, so the person-level union would rank them all equal.
- **Recomputed on load and tab-switch only, never on an edit.** Memoised per person for as
  long as (`crewGridView`, project) hold; `setCrewGridView()` drops the cache. Necessary,
  not defensive: `setPrepDays()`, `saveEntryRate()`, `toggleCrewOnDay()` and `toggleMeal()`
  all re-render the whole tab body on save, so an inline calculation would have re-fronted
  and visibly re-ordered the row the user had just typed into.
- **Nothing persists.** No open/closed state anywhere — not on a record, not module-level.
  `togglePersonBlockStack()` flips the rows in the DOM directly (the same
  direct-DOM-instead-of-re-render idiom as `applyBlockState()`/`prepDragApply()`), and
  every block opens closed on every render. One derived exception: a Pre-production block
  renders open when `prepCalendarFor` points at a stacked-away entry, so an open calendar
  cannot be hidden by its own re-render — derived from state that already exists.
- **Entry-level bulk edits hit the fronted entry only.** `selectedEditTargets()` used to
  return every selected entry id; it now returns the edited entry plus one entry per other
  selected PERSON. Person-level bulk fields are UNAFFECTED and still cover the whole
  person via `selectedCrewTargets()`.

### Partial-match filter — and the bug the composition actually had

A filter now reduces a block to only its matching entries; non-matching ones are genuinely
absent, not greyed out. A block reduced to one visible entry gets no chevron and reads as
a genuine single-role row. Person-level facts on the name line are unaffected, because
they are keyed to `crewId` and were never filtered by role.

⚠️ **The brief's working assumption held, but only after a real fix.** The first
implementation resolved each other selected person's bulk target through the memoised
fronted-entry cache. Both `projectCrewSelected` AND that cache deliberately survive a
filter change — so, reproduced in the fixture: front a person's Camera Operator entry
under a Cinematography filter, then filter to Production so only their Director entry is
on screen, select the block, and a bulk day-toggle from another selected person landed on
the Camera Operator entry — neither visible nor selected. Reproduced from the other
direction too: select a person while unfiltered (both entries selected), then apply a
filter that hides one; the stale selection alone was enough to reach the hidden entry.
`frontedEntryIdOfPerson()` was deleted and replaced by `bulkTargetEntryId()`, which picks
only from entries that are BOTH currently selected AND currently matching the filter
(`visibleEntriesForPerson()`, re-applying the same `personMatchesProjectFilter` the blocks
are built from), honouring the cached choice only when it is still in that pool. The
on-screen row and the edit target are now the same thing by construction.

### Behaviour changes worth knowing about

- **The days filter is now entry-grain on Hotel/Travel/Catering too.** Those tabs used to
  test `crewOnDay()` (a person's union) because they rendered person views; they now test
  `entryOnDay()` per entry and show the block if any entry matches. For OR mode the
  visible set is the same; under AND mode a person whose two entries cover the selected
  days between them but neither covers all of them will now drop out. A single uniform
  rule across all six tabs was preferred to a hybrid, exactly as BJ preferred one code
  path for Pre-production. Display only — no total, export or call sheet reads it.
- **The department/role filter now considers ALL of a person's entries** on
  Hotel/Travel/Catering, where it previously only saw their FIRST entry's role (that is
  what `projectCrew()` projects). Strictly an improvement, but it is a change.
- **Role on Days on site/Hotel/Travel/Catering is now a `.role-chip`**, not the
  `showAsOrRole` sub-line text Phase S item 8 put there. Those four tabs deliberately do
  NOT get AZ's "+" marker or the roles menu with it — that is BM's territory; only Roles
  and Pre-production keep `roleBannerHTML()`.
- ⚠️ **Known consequence, flagged rather than worked around.** Because nearly every field
  save re-renders the tab body and BL keeps no open/closed state, expanding a stack and
  editing a stacked-away entry's rate or day count collapses the block again. The edit
  saves correctly and the fronting correctly does not move, but the row goes back behind
  the chevron. A module-level open-set would be exactly the "no saved open/closed state
  anywhere / everything opens closed on every render" the brief rules out, so it was left.
  Worth a decision in a later phase.

### Verification

- `node --check` on both real inline `<script>` blocks (the 7-line Supabase-client one and
  the ~8,300-line main one, extracted from `index.html` in document order): clean.
- CSS brace balance: **488 / 488** (down from BJ's 480/480 + BK's new rules − the five
  orphaned rules removed).
- Orphan sweep: `entryLevel`, `toggleCrewSelected`, `opts.bulkSelect`,
  `frontedEntryIdOfPerson`, `.roles-grid-row`, `.roles-grid-editform`, `.prep-grid-row`,
  `.crewgrid-row-editing` all confirmed to have zero live references (only the deliberate
  "do not look for these" notes survive). Every new identifier greps to a definition plus
  at least one real call site.
- **Exports, totals and the call sheet UNCHANGED — traced, not asserted.** Two fixtures
  built by the same script with a deterministic `uid()`, one from `git show HEAD:index.html`
  (pre-BK) and one from the working tree, seeded identically and each given the same
  two-role person. A **194,374-character whole-output fingerprint** — `buildFullData()` for
  all 7 shoot days across both projects, `buildWAText()`, `exportOutputText()` in both
  formats, `techSpecsLines()`, `buildBudgetData()`, all four `budgetExportRows()` views,
  `buildHotelSummary()`/`hotelSummaryLines()`, `buildCateringSummaryGrid()`/
  `buildCateringExport()`/`cateringOrderLines()`, `buildTransportSummary()`/
  `transportSummaryLines()`, `buildTaskFlags()`, `cinematographyCrew()` — is **SHA-256
  identical**: `09c72b3c419a54e1844f6ca9449b5ab483cf12b0733ebe56da56e02da9ed4be7`.
  Separately confirmed a stacked-away entry is fully live in Budget: with Camera Operator
  fronted and Director hidden, Per Person still showed both rows
  (`Director:999:2`, `Camera Operator:150:4`).
- **All six sub-tabs**: 66 blocks for 67 entries / 66 people on every one. Single-role
  people render one role row and no chevron. **Tab-switch re-fronting exercised with data
  built for it** — a person prepping more as Director (8 days vs 1) and shooting more as
  Camera Operator (4 days vs 2) fronts Director on Pre-production and Camera Operator on
  Roles/Days/Hotel/Travel/Catering. Hotel's name line carries Pre + 6 night checkboxes and
  its role rows none; Days on site's role rows carry 6 day checkboxes each and its name
  line none; Catering renders exactly three meal rows of 6 cells.
- **No mid-edit re-fronting**: expanded the Pre-production stack, set the HIDDEN entry's
  prep days to 20 (which would make it the fronted one). After `setPrepDays()`'s re-render
  the block still fronted Director and the cache still held that entry; the 20 stored
  correctly. Only a tab switch away and back re-fronted it. Same on Roles for a rate edit.
- **Partial-match filter**: filtering to Cinematography reduced the two-role block to its
  one matching entry with no chevron; filtering to Production reduced it to the other.
  Person-level facts survived both (hotel Pre + Day 1 still ticked, travel still "Own car").
- **Bulk select/edit**: block checkbox selects the person's visible entries; an
  entry-level bulk day-toggle from another selected person hit only the fronted entry and
  never touched the hidden one, across both a tick and an untick; `selectedCrewTargets()`
  still returned both whole people. All four filter states re-verified after the fix above.
- Zero console errors driving all six sub-tabs, the Edit-pencil expansion, the roles menu,
  every other project tab, the Crew database and back. Re-checked at a 375×812 mobile
  viewport: the person block IS the card (the three grids inside it drop their own card
  treatment so cards do not nest), no horizontal overflow, 335px blocks in a 375px viewport.
- **Fixture**: `bk-fixture.html`, built by a real script (`build-fixture.js` — refuses an
  already-stubbed source, refuses a source that is not the real app, brace-counts each
  anchored function's body including template-literal `${}` nesting), served from a scratch
  directory containing **no `index.html`** (confirmed by `curl`: `/` returns a directory
  listing, `/index.html` 404s). Random per-session token (`window.__BK_FIXTURE__`),
  asserted alongside stub identity and `location.href` **before any interaction**.
  `loadDB`/`saveDB`/`saveInBackground`/`scheduleAutosave` all stubbed to in-memory arrays,
  the real `sb` client replaced with a Proxy that throws if touched, and the supabase-js
  CDN `<script src>` removed outright — the page has no network dependency at all and no
  real Supabase project was contacted at any point.

### Left alone, as instructed

- **Phase BM's territory** — no roles-menu relocation, and AZ's "+" marker
  (`.role-add-marker` → `openRolesMenu()`) is untouched on Roles and Pre-production and
  deliberately NOT added to the other four tabs.
- No schema changes. `p.crewEntries`, `p.prepSchedule`, `d.positions`, `d.hotelNights`,
  `d.cateringMeals`, `p.travelMethods` — none touched. Collapse state, the fronted-entry
  choice and the grouping are all derived at render time and never stored.
- The known pre-existing issues this stream carries (`deleteCrew()` leaving positions
  dangling as "(removed crew)", the project-screen route to `removeRoleFromCrew()`,
  "+ Add crew member" not visually showing its form, a shoot day's `dayTotal` not
  resyncing when a day is added) — none touched, none fixed.
- No code from `budget-v1-fail` was read or reused. No rate × days totals, aggregations or
  rollups added anywhere.

## Phase BM — the roles menu moves onto the chip, "+" removed (10 Aug 2026)

Ships onto `c35dade` (BK+BL), which sits on `87497dc` (BJ) on `0098c05` (Gate 1).

### ⚠️ The brief's premise was wrong, and the scope was widened on an explicit decision

The brief stated `roleBannerHTML()` was "the ONE shared renderer … reused UNCHANGED by
every sub-tab that shows a role chip", and instructed a STOP-AND-REPORT if any sub-tab
did not go through it. **Four of the six did not.** Phase BK had introduced a second
renderer, `roleChipHTML()`, for Days on site / Hotel / Travel / Catering — deliberately
menu-less, with its own comment saying so ("that is BM's territory"), matching BK's own
MAP.md note.

So the brief's §4 ("confirm the roles menu opens from the chip on all six sub-tabs")
could only be satisfied by *also* extending the menu to four tabs that had never had it —
a scope decision BK had explicitly deferred to this phase, and one §0 forbade resolving
unilaterally. **Work was stopped with `index.html` untouched, the mismatch reported, and
the decision taken by the user: all six.** Recorded here because the alternative reading
(two tabs only) was live and defensible, and a later session should know this was chosen,
not assumed.

⚠️ **Consequence worth naming: this reverses Phase S item 8 for Hotel/Travel/Catering.**
"Role is display-only on those four tabs; editing only ever happens on Roles" is no
longer true — a chip on any of the six now opens "Change to" / "Add again as" / "Add a
new role…". That is the point of the phase as scoped, not an oversight.

### What changed

Three functional edits. Nothing else in `index.html` was touched.

- `roleBannerHTML(c)` — rewritten. Was chip + a separate `.role-add-marker` "+" whose
  `onclick` opened the menu; is now ONE chip which carries the `onclick` itself
  (`event.stopPropagation();openRolesMenu('${c.id}')`). The `hasOtherRoles`
  (`c.roles.length>1`) solid/faint weighting that fed the marker is **deleted and not
  replaced** — BK/BL's chevron + muted "+N" already carries "this person has more going
  on than what's shown", one level up on the block, and duplicating it on the chip was
  explicitly ruled out. The chip's `title` absorbs the marker's ("Camera Operator —
  change or add a role"), keeping the full role name that `.prep-cell .role-chip`'s
  ellipsis truncation needs.
- `roleChipHTML()` — **deleted**, its three call sites (four tabs: `crewAssignRowHTML()`
  serves both Days on site and Hotel) repointed at `roleBannerHTML()`. A "do not look for
  this" note is left in its place. There is now exactly one chip renderer in the app.
- `.role-add-marker` / `.has-roles` / `:hover` — **deleted** from the stylesheet. No CSS
  was added: the chip reuses `.role-chip`/`.role-chip.active` verbatim plus an inline
  `cursor:pointer`, matching `rolesTagListHTML()`'s long-standing clickable-chip
  precedent rather than inventing a hover treatment.

**`openRolesMenu()` and everything under it is untouched.** "Change to", "Add again as",
the `c.roles`-sourced list, the exclusion sets, `applyRoleToEntryByMode()`, BB's footer
picker and its `addRoleDialogThen` continuation — not one line changed. Only the trigger
moved.

### Judgement call, flagged rather than buried: the no-role chip

`entry.role` is `''` when the crew record had no role (`addCrewEntry()`'s
`(c&&c.role)||''`). Before BM the two renderers disagreed about that case — `roleChipHTML()`
drew a muted `—`, `roleBannerHTML()` drew nothing at all (and relied on the marker, which
rendered for every row including zero-role people, to keep the menu reachable). With the
marker gone, drawing nothing would have left such a row with **no way into the menu at
all** — a capability regression on Roles/Pre-production.

So the unified renderer draws a clickable, muted, non-`.active` `—` chip. That keeps the
four tabs' existing placeholder exactly as it was and strictly improves the other two.
The brief asserted Phase R makes this case impossible ("every crew member must have at
least one saved role"), and for crew created through `saveCrew()` that holds — but the
`''` branch is real code in `addCrewEntry()`, so it was covered rather than assumed away.
This is the one place BM's output differs visually from either predecessor.

### Verification

- `node --check` on both real inline `<script>` blocks (the 7-line Supabase-client one and
  the ~8,330-line main one, extracted from `index.html` in document order): clean.
- CSS brace balance: **485 / 485** — exactly BK/BL's 488/488 minus the three deleted
  `.role-add-marker` rules. No CSS added.
- Orphan sweep: `roleChipHTML`, `.role-add-marker` and `hasOtherRoles` all have **zero
  live references** — only the deliberate "REMOVED / do not look for this" notes and the
  historical phase write-ups survive. Every stale comment that described the marker as
  present was found and corrected rather than left describing a state that no longer holds
  (`.prep-cell`'s wrapping note, `.prep-cal-btn`, `.pb-toggle`, the `calendar` icon, the
  Phase BA header comment, `prepRowHTML()`'s doc comment).
- **All six sub-tabs, in the live fixture**: zero `.role-add-marker` elements in the DOM,
  no `+` glyph on any chip, 68 chips per tab and **68 of 68 wired to `openRolesMenu`** on
  every one — Roles, Pre-production, Days on site, Hotel, Travel, Catering.
- **Collapsed vs expanded, on all six**: clicking the fronted (only visible) chip on a
  collapsed block opened the menu for the **fronted entry**; expanding via the chevron and
  clicking the previously-hidden row's chip opened it for **that row's own entry**. Correct
  on Pre-production too, where the fronting is inverted by design (Director fronts on
  prep days, Camera Operator everywhere else) — BL's fronting logic verified untouched.
- **The chip click does not toggle the block** — confirmed on all six, and again under a
  genuine pointer click (`computer left_click` on the chip's real screen coordinates, not
  a dispatched event): the menu opened for the fronted entry and `data-open` stayed `0`.
  `event.stopPropagation()` is doing its job at pointer level, not just in synthetic events.
- **Clicking elsewhere on the row behaves exactly as before**: the Rate field (no menu, no
  toggle), the Pre-production days field (no menu, no toggle), the chevron (no menu,
  toggles the block). Days-on-site day checkboxes still present and unaffected.
- **The three menu actions, driven through the real UI, all still work and none was
  touched**: "Change to" → entry count 2→2, edited entry's role changed, the person's other
  entry byte-identical, one `db:projects` save, menu closed. "Add again as" → 2→3, new entry
  carries the picked role, one `db:projects` save. BB's footer picker → role pushed onto
  `c.roles`, `db:crew` + `db:projects` saved, applied to the entry. BB's "+ Add new role…"
  escape hatch → real `addRoleDialogHTML()` opened with its continuation bound, a typed
  novel role registered into `ROLES_BY_DEPT`, saves `db:roles`/`db:crew`/`db:projects`,
  applied to the entry. **The last two were driven from the Catering sub-tab** — a tab with
  no roles menu whatsoever before this phase.
- **The no-role `—` chip**: renders muted (`rgb(111,106,99)` = `--muted`), not `.active`,
  wired, and opens the menu for its own entry.
- **Exports, budget and every summary UNCHANGED — traced, not asserted.** Two fixtures
  built by the same script with a **deterministic `uid()`** (a counter, so both builds
  auto-seed byte-identical data), one from `git show HEAD:index.html` (pre-BM) and one from
  the working tree, each then given the same seeded two-role person with a stacked-away
  entry. A **254,964-character whole-output fingerprint** — `buildFullData()` for all 7
  shoot days across both projects, `buildWAText()`, `techSpecsLines()`, `exportOutputText()`
  in both formats, `buildBudgetData()`, `budgetExportRows()` for all four views and under
  both VAT footings, `buildHotelSummary()`/`hotelSummaryLines()`,
  `buildCateringSummaryGrid()`/`buildCateringExport()`/`cateringOrderLines()`,
  `buildTransportSummary()`/`transportSummaryLines()`, `buildTaskFlags()`,
  `cinematographyCrew()`, `projectEntryViews()` and `buildPersonBlocks()` — is **SHA-256
  identical**: `a83e951b22db5f32bd623d165b7e6e543a9c76dcc7e3c435ef45186a792f5baa`. The two
  builds were confirmed genuinely different first (pre: `roleChipHTML` defined and the
  `.role-add-marker` rule present; post: both absent).
- 35 renders driven across both projects × every project tab × all six Crew sub-tabs × all
  four Budget views × the Crew database. **Zero console errors** throughout.
- Re-checked at a **375×812 mobile viewport**: chip sized and on-screen, menu opens and the
  dialog fits the viewport, no horizontal overflow — on all six sub-tabs.
- **Fixture**: `bm-fixture.html` (plus `bm-pre.html`/`bm-post.html` for the fingerprint),
  built by a real script file (`build-fixture.js` — refuses an already-stubbed source,
  refuses a source missing the real app's landmark functions, brace-counts each anchored
  function's body with template-literal `${}` nesting handled, requires each anchor to match
  exactly once, prints the bytes it wrote), served from a scratch directory containing **no
  `index.html`** — confirmed by `curl`: `/` returns a directory listing and `/index.html`
  **404s**. Random per-session token (`window.__BM_FIXTURE__`), asserted alongside stub
  identity and `location.href` **before any interaction**. `loadDB`/`saveDB`/
  `saveInBackground`/`scheduleAutosave` all stubbed to in-memory arrays (the real bodies
  parked under `__fixture_unreachable_*` and never called), the real `sb` client replaced
  with a Proxy that **throws** if touched, and the supabase-js CDN `<script src>` removed
  outright — the page has no network dependency at all.
- **Production database confirmed untouched.** `app_data`'s newest write is `db:projects` at
  `2026-08-10 15:23:42+00`, which is **three minutes before this session's first edit to
  `index.html`** (16:26:47 BST = 15:26:47 UTC) and four and a half minutes before any fixture
  existed — and is attributable to another session's dev server, flagged by the harness at
  the start of this one. Nothing this phase did reached it.

### Known limitation of the visual check, stated plainly

`computer{action:"screenshot"}` returned a blank white PNG for this page throughout the
session, at both viewports, including with a modal up. Everything visual above was
therefore verified through `read_page`'s rendered accessibility tree, computed styles read
off live elements, and geometry from real `getBoundingClientRect()` — not from a screenshot.
Real pointer clicks landed correctly on the elements those measurements identified, so the
page was rendering; only the capture failed. Worth knowing before trusting a screenshot as
evidence on this page next time. ⚠️ Note for the next session: `computer` coordinates are in
**screenshot-pixel** space (800×450 here), not CSS pixels (1280×720) — a click passed in CSS
pixels lands elsewhere and silently does nothing.

### Left alone, as instructed

- `openRolesMenu()` and the whole BA/BB menu — trigger moved, internals untouched.
- BK/BL's grouping, fronting and collapse logic — untouched; the fingerprint above covers
  `buildPersonBlocks()` and the fronting was re-verified live on all six tabs.
- No schema changes. `p.crewEntries`, `p.prepSchedule`, `d.positions`, `d.hotelNights`,
  `d.cateringMeals`, `p.travelMethods` — none touched. Display/interaction layer only.
- The AZ/BF known gap (project screen → crew-database-wide role deletion via the
  Edit-pencil expansion's chip `×`) — still open, untouched.
- The BL stacked-away-entry-collapses-on-save friction — accepted, not worked around.
- The known pre-existing issues this stream carries (`deleteCrew()` leaving positions
  dangling as "(removed crew)", the project-screen route to `removeRoleFromCrew()`,
  "+ Add crew member" not visually showing its form, a shoot day's `dayTotal` not resyncing
  when a day is added) — none touched, none fixed.
- No code from `budget-v1-fail` was read or reused. No rate × days totals, aggregations or
  rollups added anywhere.

## Phase BN — fix the person-block head/role line-split (10 Aug 2026)

Ships onto `05f8e87` (Phase BM), which sits on `c35dade` (BK+BL) on `87497dc` (BJ).

### The bug, confirmed exactly as diagnosed

Reported by the user via screenshots: on every Crew sub-tab, a person's name rendered on
its own line and their role/rate/days content rendered on the line BELOW, even for a
single-role person, who should read as one line exactly as before Phase BK.

Confirmed against the live code before touching anything: `.roles-grid`, `.crewgrid` and
`.prep-grid` are each independently `display:grid`, and every one of the six row renderers
built the name/head content as one `<div class="X-grid pb-head">` and the role content as
a SEPARATE `<div class="X-grid pb-role-row">` — two sibling divs, each starting its own
independent grid formatting context, so `pb-head` and the (single) `pb-role-row` could
never share a visual row regardless of how many roles the person had. A structural leftover
from BK's refactor, which needed a way for EXTRA role rows to stack below the name for
multi-role people, applied unconditionally and so broke the common single-role case for
everyone.

### The fix — merge the fronted entry into the head div, not a shared-grid CSS trick

The brief's own hint (`display:contents` on `.pb-head`/`.pb-role-row`, with `.person-block`
promoted to the real grid container) was tried on paper first and rejected: `.crewgrid`'s
name column (`.crewgrid-row-name`) has no dedicated "role" track of its own — Days on
site/Hotel/Travel/Catering render the role as a same-cell subline, not a same-row sibling
column, unlike Roles/Pre-production which genuinely have Role/Rate as their own explicit
`grid-column`s. Merging two DIFFERENT divs' auto-placed (no explicit `grid-column`) name/
role cells into one shared grid relies on CSS Grid's sparse auto-placement packing them into
the gaps left by the other div's cells — reliable for Roles/Pre-production (every role-row
cell is explicitly columned), genuinely ambiguous for the four `.crewgrid` tabs (both head's
identity cell and role-row's role cell are auto-placed, both wanting column 1).

**The actual fix: the FRONTED entry's cells now render directly onto the SAME div as
`.pb-head` — not a second, independently-gridded `.pb-role-row` — across all six
renderers.** A stacked-away (non-fronted) entry still gets its own genuine `.pb-role-row
.pb-role-extra` div below, unchanged from BK/BL, hidden by default and shown by the
existing chevron/`+N` (`personBlockToggleHTML()`/`togglePersonBlockStack()`, both
untouched). This required **zero CSS changes** — `.person-block`, `.pb-head`,
`.pb-role-row`, `.pb-role-cell`, `.pb-toggle` and the three mobile media-query blocks
(`.crewgrid`/`.roles-grid`/`.prep-grid` around what are now roughly L944/986/1003, and
`.person-block`'s own mobile card rules just below them) are byte-for-byte what BM left —
the fix is a JS/markup restructuring of the five row renderers only, not a layout-model
change, because "head absorbs the fronted entry's cells" needs no new grid mechanics: it's
the SAME `.roles-grid`/`.crewgrid`/`.prep-grid` div a head already was, just with more
cells in it.

- **`crewRolesRowHTML()` / `prepRowHTML()`** — Role/Rate (Roles) and Role/fields/calendar
  (Pre-production) are genuinely separate explicit-`grid-column` cells, so the fronted
  entry's cells were pulled out into a shared `roleCellsHTML()`/`entryCellsHTML()` helper
  and rendered straight into `head`'s template literal; a stacked-away entry calls the same
  helper inside its own `.pb-role-row.pb-role-extra` div.
- **`crewAssignRowHTML()` (Days on site/Hotel), `crewCateringBlockHTML()`,
  `crewTravelRowHTML()`** — the role chip has no dedicated column on `.crewgrid`, so it
  joins the identity block itself via `crewIdentityHTML()`'s existing `extraLine` slot (the
  same mechanism Travel already used for its car-info hint — confirmed live that a `nowrap`
  flex row already tolerated a second inline chunk before this phase touched anything). The
  fronted entry's day-checkboxes/remove (Days on site only; Hotel's are person-level and
  were already on the head) render via `entryCellsHTML()`/`entryRightHTML()` helpers shared
  with the stacked-away rows, straight into `head`'s own cells rather than a second div.
- **`crewCateringBlockHTML()`'s meal rows are untouched** — Breakfast/Lunch/Dinner are
  person-level facts and were always their own `.crewgrid.meal-subrow` divs below the
  role-row stack, never merged with the head; nothing about them needed to change.

⚠️ **`.pb-role-row` no longer ever appears without `.pb-role-extra` alongside it** — every
renderer's `stack` is now built purely from stacked-away entries. `GRID_ROW_SELECTOR`
(`.crewgrid-row, .meal-subrow, .pb-role-row`), `togglePersonBlockStack()`'s
`.pb-role-extra` query, and the CSS rules keyed to `.pb-role-row`/`.pb-role-cell` all still
match exactly what they always matched — nothing was renamed, the class just has one fewer
occasion to appear on its own.

### Why this, and not the CSS-only route — the tradeoff named

The CSS-only (`display:contents`) route would have been a smaller diff and DRYer in one
sense (one shared rule instead of five restructured functions), but it would have made
`.crewgrid`'s "the role is a subline of the name, not a column" convention an *emergent*
property of auto-placement order rather than something explicit in the markup — fragile to
a future reordering of cells within either div, and impossible to verify by inspection
without re-deriving CSS Grid's sparse-packing algorithm by hand (done once, in full, during
this phase, precisely to rule the approach out with evidence rather than a hunch). The
markup-restructuring route makes "the fronted entry's content is part of the head row" true
by construction — inspectable in the template literal, not an accident of layout order.

### Verification

- `node --check` on both real inline `<script>` blocks (the 7-line Supabase-client one and
  the ~9,000-line main one), extracted from the modified `index.html` in document order:
  clean.
- CSS brace balance: **485 / 485** — unchanged from Phase BM. Zero CSS edits this phase,
  confirmed by `git diff --stat` showing only `index.html`'s `<script>` region touched.
- Orphan sweep: every one of the five renderers' new helper names (`roleCellsHTML`,
  `entryCellsHTML`, `entryRightHTML`, `roleChipHTML`) greps to exactly one definition and
  at least one real call site; no old identifier was left dangling (the previous `roleRow`
  closures were renamed, not left as dead code beside the new ones).
- **Real screenshots worked this session** (unlike Phase BM's session, where they came back
  blank throughout) — used as primary visual evidence, cross-checked with
  `getBoundingClientRect()` rather than relying on either alone.
- **Single-role, all six sub-tabs, desktop (1280×900):** Alex Ovaida (Producer, one role)
  reads as one line on Roles, Days on site, Hotel, Travel and Catering, screenshotted on
  each. `getBoundingClientRect()` on the name and role-chip elements for a fresh single-role
  person (Roles tab) confirmed matching Y-coordinates within rounding.
- **Multi-role, all six sub-tabs, desktop:** a live crew member (Justin Schoenrock) given a
  second saved role and a second entry (`Director`, rate 999) via direct state
  manipulation, the same technique BA/BH/BJ/BK/BM used. On every one of the six sub-tabs the
  fronted entry's role/fields sat on the SAME row as the name (`getBoundingClientRect()`:
  name/chip/day-checkbox Y-coordinates within 1–3px on Days on site; Rate column X-coordinate
  identical — 849px — between the head row and the stacked-away row on Roles), with a "+1"
  toggle; expanding it via the real chevron (`.pb-toggle.click()`) revealed the second role
  ("Director", rate 999) as a genuinely separate `.pb-role-row` 24px below the head, still
  correctly column-aligned (Roles' Rate column X-coordinate identical on both rows).
- **Chip click still opens the roles menu and does not toggle the block** — re-confirmed
  post-fix on the Catering sub-tab specifically (a tab with no roles menu at all before
  Phase BM), driven through the actual chip-into-`crewIdentityHTML`-`extraLine` path this
  phase introduced: `data-open` unchanged after the click, "Change to"/"Add again as"/
  "+ Add a new role…" all present in the opened menu.
- **Mobile, 375×812, all six sub-tabs**: re-checked after the fix — `.person-block` is
  still the one card per person, the fronted entry's fields stack into it with the same
  `data-label` prefixes as before (NAME/ROLE/RATE/SHOW AS on Roles), and an expanded
  multi-role block shows both roles' labelled fields inside the same outer card border, no
  horizontal overflow. One minor, deliberately-accepted spacing nuance: the ~6px gap that
  used to separate `.pb-head`'s fields from `.pb-role-row`'s fields on mobile no longer
  exists for the FRONTED entry specifically (its fields are now literally inside the head),
  since that gap was `.pb-role-row{margin-top:6px}`, a rule that only ever applied to a
  *separate* div. A stacked-away entry's row still carries it. Confirmed this reads as
  slightly tighter grouping, not a broken layout.
- **Totals/exports/behaviour unaffected, by construction and confirmed live**: none of the
  five modified renderers is called from `buildFullData()`, `buildBudgetData()`,
  `buildWAText()`, `downloadExcel()`, or any Budget/Preview & Export code path — grepped to
  confirm their only call sites are the six `crewGridView` branches inside
  `renderProjectCrew()`. Ran `buildBudgetData()` live in the fixture with the seeded
  two-entry person: both entries appeared as separate rows (`Director/EP`, `Director`),
  department totals computed (£6,170.00 ex-VAT for Production after an in-fixture rate
  edit), `buildWAText()` ran clean and included the person by name. Budget (all four views)
  and Preview & Export both rendered with zero console errors driven live in the browser.
- **Filter/sort/group-by, bulk-select, edit expansion, rate editing — all re-driven live,
  not assumed**: filtering to a department correctly hid/showed blocks (Cinematography
  filter dropped the Production-department multi-role test person); all 13 group-by values
  and a cross-section of sort values ran with no error across the tab; clicking a block's
  own checkbox selected BOTH of a two-entry person's entries via the existing
  `entryIdsCSV` mechanism (confirmed by inspecting `projectCrewSelected` directly); the
  Edit pencil still opens `crewFormHTML()` in the `.pb-editform` expansion; editing the
  fronted entry's Rate field (`onchange`, now living on the merged head div) correctly
  wrote through `saveEntryRate()`. Toggling a Hotel checkbox and clicking "Select all"
  both round-tripped through the stubbed `saveDB`/`saveInBackground` with no errors.
- **Partial-match-filter, single-visible-entry case (BL's own rule)** — re-verified
  directly: handed a synthetic single-entry block (built via `buildPersonBlocks()` off one
  filtered `projectEntryViews()` result) to `crewRolesRowHTML()` and confirmed the output
  HTML contains neither `pb-toggle` nor `pb-role-extra` — a multi-role person reduced to one
  visible entry by a filter still gets no chevron, exactly as BL specified.
- Zero console errors across every interaction above, beyond the fixture's own deliberate,
  expected `sb`-Proxy-throw errors from the bootstrap window before the stub script block
  had run (see the fixture note below) — no genuine app error at any point.
- **TEST FIXTURE**: `build-fixture.js` — refuses a source already carrying a
  `__[A-Z]+_FIXTURE__` marker, refuses a source missing any of eight landmark strings
  (the six renderer functions, `buildPersonBlocks`, `personBlockWrapHTML`, the `sb` client
  construction), each required to match exactly once. Removes the supabase-js CDN
  `<script src>` outright, replaces `const sb = supabase.createClient(...)` with a `Proxy`
  that **throws** on any property access, and appends a stub-override `<script>` block
  (after the real one — function declarations are simple reassignable global bindings in a
  classic script, so the later block wins) replacing `loadDB`/`saveDB`/`saveInBackground`/
  `scheduleAutosave` with in-memory-array versions behind a random per-session token
  (`window.__BN_FIXTURE__`), asserted alongside stub identity and `location.href` **before
  any interaction**. Served from a scratch directory containing **no `index.html`**
  (confirmed via `curl`: `/` returns a directory listing, `/index.html` 404s) — only
  `fixture.html`. `read_network_requests` confirmed **zero** requests to `supabase.co` for
  the entire session.
  - ⚠️ **One honestly-reported fixture wrinkle, not an app bug**: `initApp()` is called
    directly at the bottom of the real `<script>` block, BEFORE the stub-override block
    (appended near `</body>`) has run — so the app's own first-load `loadDB`/`saveDB` calls
    (including `migrateCrewEntries()`'s crewIds→crewEntries migration) hit the real,
    already-Proxied `sb` and correctly failed via G11's `{ok:false}` contract, which is
    exactly why the migration's own "if any backup write fails, stop" rule aborted it
    on first load. `migrateCrewEntries()` was re-invoked directly once the stub was in
    place, and it then completed and saved cleanly through the fixture's in-memory `saveDB`
    stub — confirmed by `window.__BN_SAVES__` and the resulting `p.crewEntries` populating.
    Every interaction used for actual verification happened after this point.
  - Production database (`ioueoaasqnseuhrtzhbz`, `app_data` table) queried directly via the
    Supabase MCP tool at the end of the session: newest write is `db:projects` — not
    attributable to this session, since every save this session went through the fixture's
    in-memory stub (confirmed by the growing `window.__BN_SAVES__` array) or the throwing
    `sb` Proxy, never the real client. No wall-clock reference was available to timestamp
    "session start" precisely, so this is reported as a corroborating check, not the
    primary safety guarantee — the Proxy-throw plus zero recorded `supabase.co` network
    requests is the actual guarantee.

### Left alone, as instructed

- No pencil was added to Pre-production/Days on site/Hotel/Travel/Catering — the five
  renderers gained more cells on their EXISTING head/role-row divs, nothing structurally
  new. Roles keeps its `editBtn`; the other five still have none, per the long-standing
  Phase S design this phase was told not to revisit.
- No data shown on any sub-tab changed, only how it's laid out — confirmed via the
  `buildBudgetData()`/`buildWAText()` live checks above.
- BK/BL's collapse/expand and fronting logic — `frontedEntryOfBlock()`,
  `pickFrontedEntry()`, `togglePersonBlockStack()` — untouched. Re-verified live that
  fronting still resolves per BL's rule (Pre-production's inverted fronting was not
  specifically re-tested this phase since it wasn't touched, and BM already re-verified it
  post-BM).
- The three mobile media queries (`.crewgrid`/`.roles-grid`/`.prep-grid` block) — byte-for-
  byte unchanged; the fix needed no CSS at all.
- No change to totals, exports, or the call sheet output — see the buildBudgetData/
  buildWAText verification above.
- The known pre-existing issues this stream carries (`deleteCrew()` leaving positions
  dangling as "(removed crew)", the project-screen route to `removeRoleFromCrew()`,
  "+ Add crew member" not visually showing its form, a shoot day's `dayTotal` not
  resyncing when a new day is added, the BL stacked-away-entry-collapses-on-save friction)
  — none touched, none fixed.

## Phase BO — shared Controls/Name/Role columns + row-height rhythm (10 Aug 2026)

Ships onto `1c0098d` (Phase BN), which sits on `05f8e87` (BM) on `c35dade` (BK+BL).

### The ask

User feedback on Phase BN's screenshots: "Placement of names and roles and line height
is still different between Roles, [Pre-]Production & Days on site. Selector, Edit, Name
and Role at least should all sit in tidy columns. And there should be an agreed median
height to the rows."

### Diagnosis

`.roles-grid` had a 56px Controls column (checkbox + Edit pencil); `.prep-grid` had a
32px Controls column (checkbox only, no pencil by design); `.crewgrid` (Days on
site/Hotel/Travel/Catering) had **no separate Controls column at all** — the checkbox
(and, after Phase BN, the role chip too) were embedded inside `crewIdentityHTML()`'s own
flex row, so their x-position depended on that row's content width rather than a fixed
column. Three different starting points for "Name" — nothing could line up. Row height
was likewise whatever each tab's content happened to need: Travel's `<select>` made it
the tallest (33px) of the five single-line tabs, Catering's bare head (23px, no day
cells on the head row) the shortest.

Two decisions were confirmed with the user before landing anything, since both change
how invasive the fix is: **(1)** give the four `.crewgrid` tabs a real, explicit Role
column too (not just Controls/Name), so the chip aligns everywhere, not only the
checkbox — accepted, more invasive but genuinely correct; **(2)** "median row height"
means normalising the five single-line tabs to one height among themselves, leaving
Pre-production's genuinely taller rows (rate + days fields + a counter line) alone
rather than forcing everything to match it — accepted.

### The fix

**Three shared tokens**, declared once in `:root` and referenced by all three grids:
`--pb-controls-w` (56px), `--pb-name-w` (⚠️ **170px as of the same-day follow-up below —
originally shipped at 220px**, fixed either way, not flexible — a flexible Name column is
what let Role drift depending on name length), `--pb-role-w` (150px, fixed; long role
names ellipsis-truncate, full text still in the chip's `title`).

- `.roles-grid` / `.prep-grid` — grid-template-columns swapped their old
  literal/flexible Controls/Name/Role widths for the three tokens. **No JS changed for
  either** — both already had Controls/Name/Role as genuine, separately-columned cells
  (Roles since Phase Z, Pre-production since Phase BD); only the CSS widths moved.
- `.crewgrid` — gained TWO new explicit leading columns it never had (Controls, Role),
  ahead of the day-checkbox columns. This needed real restructuring in
  `crewAssignRowHTML()`, `crewCateringBlockHTML()`, `crewTravelRowHTML()`:
  - **Controls**: `crewIdentityHTML()`'s checkbox+Edit-pencil pair (which, per the live
    code — NOT per Phase BN's brief, which believed these four tabs had no pencil — was
    already rendering unconditionally; Phase BO didn't add or remove that capability,
    only relocated it) was split out into `crewControlsHTML(c, opts)`, called directly by
    each renderer into its own new `.crewgrid-controls` cell. `crewIdentityHTML()` keeps
    calling it internally by default (`opts.hideButtons` opts out) — its one other
    caller, the Crew database's `crewCardHTML()`, is untouched.
  - **Role**: the chip Phase BN had put into `crewIdentityHTML()`'s `extraLine` slot
    moved into a genuine `grid-column:3` cell instead — `extraLine` on Travel now carries
    only the pre-existing car-info hint, as it did before BN touched it.
  - `crewgrid-remove`'s explicit column shifted `colCount+2` → `colCount+4` to make room;
    the day-checkbox cells themselves stayed auto-placed and correctly continue from
    column 4 (verified — see below), no explicit column needed on them.
  - The header rows (`dayHeaderRow`, `travelHeaderRow` in `renderProjectCrew()`) and
    Catering's `meal-subrow` label all gained `grid-column:1/4` on their leading cell so
    they span the new three-column width instead of landing in just the first (56px)
    track.
- **`column-gap` unified to 10px.** `.crewgrid` had used 6px; after the leading columns
  landed exactly right, Role (and everything after it) was still 4–8px off across tabs
  purely from that gap difference. Matching Roles'/Pre-production's 10px closed it
  completely — verified pixel-exact below.
- **Row height**: `.pb-head, .pb-role-row{min-height:33px}` — 33px is Travel's own
  pre-existing natural height, so Travel is visually unchanged and the others grow
  enough to meet it. ⚠️ **Originally `:not(.prep-grid)` — Pre-production was deliberately
  excluded here, per the confirmed decision at the time.** Superseded the same day — see
  the follow-up below. Do not re-add the exclusion; the selector today is unqualified.
- **`.pb-role-cell`'s old 20px indent was dropped.** It made sense when Role was inside a
  wide, flexible cell (BK/BL era); now that Role is a fixed, explicitly-columned track
  shared across all six tabs, the padding just ate into an already-tight 150px budget for
  no remaining purpose — a stacked-away row already reads as "belonging to the block
  above" from its blank Controls/Name cells.
- **⚠️ A real overflow bug found and fixed while wiring this up, not part of the
  original ask**: `.roles-inline` (the flex wrapper around a chip + the `pb-toggle`
  chevron/"+N") is `display:inline-flex` and shrink-wraps its content by default. Once
  Role became a fixed 150px column, a long role name's chip (up to ~191px natural width)
  overflowed straight past the column edge into the day-checkbox area, because nothing
  told `.roles-inline` itself to respect the column's width — `max-width:100%` on the
  chip alone did nothing, since the chip's *containing block* (`.roles-inline`) hadn't
  been constrained either. Fixed with `.pb-role-cell .roles-inline{flex-wrap:nowrap;
  min-width:0; max-width:100%;}` plus `min-width:0` added to the chip's own truncation
  rule — consolidated from the old Pre-production-only `.prep-cell .role-chip{…}`/
  `.prep-cell .roles-inline{flex-wrap:nowrap;}` pair into one shared `.pb-role-cell`
  rule, since the same fix is now needed on all six tabs, not just Pre-production.
- **⚠️ `.crewgrid` is also the Locations tab's day-checkbox grid** (`locRowHTML()` /
  `locDayGridHTML()`, unrelated to Crew person blocks) — caught before it broke:
  Locations has no checkbox or role concept, so its name cell and header corner cell
  both got `grid-column:1/4` to span the three new leading tracks as one block, rather
  than the location name silently landing in the narrow 56px Controls track while day
  checkboxes and the remove button drifted into the wrong columns.

### Verification

- `node --check` on both extracted script blocks: clean. CSS brace balance: **487/487**
  (up from BN's 485 — the new `.crewgrid-controls`/`.crewgrid-role-cell`/consolidated
  `.pb-role-cell` rules, net of the removed `.prep-cell`-specific ones).
- Orphan sweep: `crewControlsHTML` — 1 definition + 4 call sites + 2 doc-comment
  mentions, all accounted for; no leftover reference to the old `.prep-cell .role-chip`/
  `.prep-cell .roles-inline` pair.
- **Pixel-exact alignment, all six sub-tabs, desktop (1280×900), measured live via
  `getBoundingClientRect()` on a real multi-role person (the same Justin Schoenrock
  seed BN used)**: Controls-checkbox x = **355px** on Roles, Pre-production, Days on
  site, Hotel, Travel and Catering — identical across every one. Name x = **421px** on
  all six. Role-chip x = **651px** on all six. (Before the column-gap fix these last two
  were 417/643 on the four `.crewgrid` tabs — a 4–8px drift — confirming the gap, not the
  column widths, was the remaining cause.)
- **Truncation, re-verified after the `.roles-inline` fix**: "Strategic Media Team -
  Director" and "Line Producer / Production Manager" (both real roles in the seed data)
  now ellipsis-truncate cleanly inside the 150px Role column on Days on site — screenshot
  confirmed no overflow into the day-checkbox columns, where before the fix they visibly
  spilled across 2–3 day columns.
- **Row height, measured live**: Roles/Days on site/Hotel/Travel/Catering all render
  their `.pb-head` at exactly **33px** — Pre-production's stayed at **49px** at the time
  (the deliberate exclusion). ⚠️ **This is what the user's same-day follow-up asked to
  change — see below; Pre-production now also lands on 33px by default.**
- **Locations tab re-checked live** (not just reasoned about) after the shared-class
  discovery: name + address render correctly, D1–D6 checkboxes align under their header
  columns, remove button in the right place — screenshot confirmed clean, no regression
  from sharing `.crewgrid` with Crew.
- **Regressions re-driven live, not assumed**: roles-menu chip click still opens the
  menu and does not toggle the block (re-checked on Catering, a tab with no roles menu
  before Phase BM); a person block's own checkbox still selects both of a two-entry
  person's entries via the existing `entryIdsCSV` mechanism; the Edit pencil (now in the
  new Controls cell) still opens `crewFormHTML()` in the `.pb-editform` expansion;
  editing the fronted entry's Rate field on the merged head row still writes through
  `saveEntryRate()`; the Crew database's own `crewCardHTML()` (the other
  `crewIdentityHTML()` caller, untouched by the `hideButtons` option) still renders its
  View/Edit buttons correctly. All 5 group-by values × all six sub-tabs re-rendered with
  no error.
- **Totals/exports unaffected, by construction and confirmed live**: none of the touched
  renderers is called from any Budget/export function (unchanged from BN's finding —
  Phase BO only restructured cells *within* those same five renderers, no new call
  sites). `buildBudgetData()` ran live against the seeded two-entry person: both roles
  present as separate rows, correct rates.
- **Mobile, 375×812, re-checked after every structural change**: `.pb-head`/
  `.pb-role-row`'s desktop `min-height` has no visible effect once they're `display:block`
  stacked cards (mobile content already exceeds 33px easily); the new `.crewgrid-controls`/
  `.crewgrid-role-cell` cells stack cleanly with the rest, no `data-label` needed since
  Days on site/Hotel/Travel/Catering never used that convention (only Roles/Pre-production
  do); long role names show in full on mobile (fixed-width truncation is a desktop-grid-
  only concern, correctly inert once `.crewgrid` reverts to block layout).
- Zero console errors throughout beyond the fixture's own deliberate, expected
  `sb`-Proxy-throw bootstrap errors (same pattern documented in Phase BN's fixture note).
- **TEST FIXTURE**: same `build-fixture.js` and conventions as Phase BN (refuses an
  already-stubbed or non-landmark source, no CDN script, `sb` replaced with a throwing
  Proxy, `loadDB`/`saveDB`/`saveInBackground`/`scheduleAutosave` stubbed to in-memory
  arrays behind a random per-session token, served from a directory with no
  `index.html`, confirmed via curl). Rebuilt fresh three times over the course of this
  phase as fixes landed (role-chip overflow, column-gap), each time re-verifying from a
  clean reload rather than trusting the previous in-memory state.

### Same-day follow-up — Pre-production included after all, Name column narrowed

Two more rounds of feedback landed the same day, both refinements to what's above rather
than new territory:

**"Pre-production should be the same height and only extend out when [there's something
to show]."** The original decision (Pre-production excluded from the shared 33px floor)
turned out to be solving the wrong problem — the row wasn't taller because it genuinely
needed to be, it was taller because `.prep-counter` **always reserved its line's height**
(`min-height:15px`), even when `prepCounterText()` returned an empty string (nothing
booked or marked). A `.prep-counter:empty{min-height:0; margin-top:0;}` rule already
existed — but **only inside the mobile media query**, so desktop never got the benefit.
Promoting it to the shared/desktop rule (and deleting the now-redundant mobile copy) means
an entry with nothing on it collapses to the same 33px everyone else gets, and the
`:not(.prep-grid)` exclusion on the row-height rule came out entirely — `.pb-head,
.pb-role-row{min-height:33px}` now applies unqualified. A row only grows past 33px when
`prepCounterText()` actually has something to say (rate+days set, or dates marked) **or**
the chevron reveals a stacked-away second role — both genuine content-driven reasons, not
a blanket per-tab reservation. Verified live: a fresh entry (no prep days/marks) renders
at 33px on Pre-production, identically to the other five tabs; the same entry after
`setPrepDays(id,'5')` grows to 49px with "5 days booked" visible — confirmed this is
content pushing the row taller, not a leftover bug, by checking the row height moved
`33→49` in lockstep with the counter text appearing.

**"Less distance between name and role column."** `--pb-name-w` dropped 220px→170px.
Comfortably fits every name in the sample data (`Justin Schoenrock`, the longest, at 14px
Jost 600); a genuinely longer name just sits closer to the chip rather than leaving a
visibly empty stretch of column — same overflow handling (`white-space:nowrap`) as
before, nothing new to break. Re-verified the full column-alignment measurement afterward:
Controls/Name/Role still land at identical x-coordinates across all six sub-tabs, just at
tighter absolute values (Role now starts 60px earlier than it did right after the
original Phase BO landed).

Re-verified after both changes, live: all six sub-tabs' `.pb-head` at 33px for an
unremarkable entry; the roles-menu chip, bulk-select, and rate-editing regressions
re-checked exactly as in the original Phase BO pass; mobile 375×812 re-screenshotted (the
`:empty` collapse behaves identically there — it already worked on mobile before this
follow-up, just not on desktop); zero new console errors beyond the fixture's own
expected bootstrap noise. `node --check` clean, CSS still balanced (487/487 — the two
`:empty` rules net to the same count, one promoted out of the media query, one deleted
from it).

### Left alone, as instructed

- BK/BL/BN's fronting, collapse and merged-head logic — untouched; this phase only moved
  *where* cells render (which grid column), never *which* entry's cells render or when.
- No data shown on any sub-tab changed, only how it's laid out.
- The known pre-existing issues this stream carries (`deleteCrew()` leaving positions
  dangling as "(removed crew)", the project-screen route to `removeRoleFromCrew()`,
  "+ Add crew member" not visually showing its form, a shoot day's `dayTotal` not
  resyncing when a new day is added, the BL stacked-away-entry-collapses-on-save
  friction) — none touched, none fixed.

## Phase BP — mobile stops stacking: every row stays a row (11 Aug 2026)

**"Currently all the mobile views are stacked rather than single rows. Make them single
rows. Ability to scroll horizontally to get to information off screen. E.g. in Budget
view."**

Every list in the app that is a ROW on desktop was being rebuilt as a stacked CARD under
`@media(max-width:900px)` — the six Crew sub-tabs (`.crewgrid` / `.roles-grid` /
`.prep-grid` inside `.person-block`), the Locations day grid, the shoot day's schedule
rows, additional-location rows and position-assignment rows. The Crew cards even reflowed
the day matrix into a wrapping row of labelled D1/D2/… chips and switched
`.tablewrap`'s `overflow-x` off, on the reasoning that horizontal scrolling on a phone was
worse than a long vertical one. Reversed on request: the cards broke the one thing the
Crew tab is for (reading down a column to compare people), and a 13-person department
became a very long scroll. **The Budget tables were the model** — they were already the
one place that kept its columns and scrolled sideways, and they were the example given.

### What changed — all CSS inside the existing `@media(max-width:900px)` block

- **The stacked-card rules are gone**, not disabled: `.crewgrid`/`.roles-grid`/`.prep-grid`
  no longer flip to `display:block` with a border/fill, `.person-block` no longer becomes
  the card, the `.crewgrid-header-row.crewgrid-header-row{display:none}` and
  `.roles-grid.roles-grid-header-row{display:none}` header suppressions are gone (with
  their two specificity-tie comments — the tie they were solving no longer exists), and the
  three `.tablewrap:has(…){overflow-x:visible}` overrides are gone so `.tablewrap` scrolls
  at every width like it always did on desktop. The `.crewgrid-check` labelled-chip
  treatment (`::before{content:attr(data-day)}`, solid-fill checked state, wrapping
  margins) is gone too — the restored header row carries the day label once.
- **`width:max-content; min-width:100%`** on the grids, `.person-block` and `.dept-group`
  inside `.tablewrap`. Without it a row's box stops at the viewport edge while its fixed
  columns overflow past it, so borders and the editing tint end mid-row. The trailing
  `minmax(0,1fr)` column collapsing to 0 under `max-content` is wanted, not a side effect.
- **Pinned leading columns.** Controls + Name are `position:sticky` (`left:0` and
  `left:60px`), so you always know whose row you are ticking. Role is deliberately not
  pinned. `--pb-pin-w:186px` is the shared right edge of that strip, used by the three
  places that have no Controls/Name cell of their own and would otherwise leak content
  into it: the crewgrid header's `.crewgrid-corner` and Catering's `.meal-row-label-wrap`
  (both SPAN the three leading columns, so they get an explicit width instead of their
  natural 326px), and a stacked extra-role row, which grows a mask from `.pb-role-row::before`
  — a grid container's pseudo-element is a grid item like any other.
  - ⚠️ Pinned cells need `align-self:stretch` and an opaque `background`. Centred grid
    items are only as tall as their content, so the fill left day cells showing through
    above and below it. `.crewgrid-controls` is also widened to 60px — 10px past its own
    50px track — so the column gap behind it is covered rather than leaving a slot of
    scrolling content between the two pinned cells.
  - The `.person-block-editing` tint is re-composited over that opaque fill with
    `background-image:linear-gradient(var(--tint-2),var(--tint-2))`, or an open row would
    punch a white hole in itself.
- **`--pb-controls-w`/`--pb-name-w`/`--pb-role-w` are re-declared inside the media query**
  (50/126/104 vs the desktop 56/170/150). Same three Phase BO tokens, so Controls/Name/Role
  still land at identical x across all six sub-tabs — just tighter. ⚠️ The values are not
  arbitrary: they sum (with gaps) to **310px**, so on a 375px phone the first day column
  pokes ~25px into view at rest. That partial cell IS the scroll cue. Push the total to 335
  or beyond and a Days-on-site row looks like it simply has no day columns at all.
- **The day cell IS the checkbox now** (`.crewgrid-check input{width:100%; height:34px}`),
  a ~38x34 touch target instead of desktop's 16px box. Deliberately still the app's own
  checkbox language (bordered box, "×" when ticked), NOT the solid-fill chip the stacked
  layout invented — six days across thirteen people is a wall of filled blocks and much
  harder to read down a column than a wall of ×s.
- **`.pb-editform`/`.crewgrid-editform` are the one thing that must NOT inherit the row
  width** — they are forms, not rows, and at ~700px every field would scroll sideways.
  `.tablewrap` gets `container-type:inline-size` and the form gets `width:100cqw` +
  `position:sticky; left:0`, so it is exactly the scrollport's width and stays in view
  wherever the rows are scrolled to.
- **`.crewgrid-name-span`** — new class, added in `locRowHTML()` (the only JS/markup change
  in this phase). The Locations day grid's name cell has no Controls cell beside it and
  spans all three leading columns; left alone it pinned 326px wide and swallowed the
  screen. It pins from 0 at the same `--pb-pin-w` edge, stays `display:block` (it stacks a
  name over an address rather than holding one flex line) and clips its address to one
  ellipsised line.
- **Shoot Days**: `.rows-sched`, `.rows-add` and `#rows-posn` each become their own
  `overflow-x:auto` scrollport, rows keep desktop's columns at touch-sized widths, and the
  schedule's label row (Time/Duration/Description) is shown again rather than hidden. The
  reorder arrows go back to a stacked pair at 30x21 rather than a 44x44 side-by-side strip.
  `.sched-insert-hint` stays permanently visible (touch has no hover, same reasoning as
  before) but moved to the far left, centred on the dashed divider it acts on — always-on
  in its desktop position, it sat on top of every Time field.
- **`input.budget-rate-input`, not `.budget-rate-input`** — the global `input[type=text]`
  rule outranks a bare class (0,1,1 vs 0,1,0), which is why the rate fields were rendering
  at `width:100%` of whatever cell held them and clipping "450" to "45" in the Budget
  tables. Pre-existing; fixed here because this phase needed those fields to hold a fixed
  width in a scrolling row.

### Deliberately left stacked

**Forms.** `.grid.g2`/`.grid.g3` collapsing to one column, and the inline label columns
going back to label-above-control, are unchanged. A form has no "information off screen" to
scroll to — one column per field is the right answer on a phone, and turning a form into a
horizontally-scrolling row would be a regression, not the requested change. The same goes
for `.list-card` lists (Crew/Locations databases), which are cards on desktop too.

### Verified

- Live at 375x812 on all six Crew sub-tabs (Roles / Pre-production / Days on site / Hotel /
  Travel / Catering), the Locations day grid, Shoot Days (schedule, additional locations,
  position assignments), all four Budget views, and both databases. Header labels measured
  against their cells (at `scrollLeft:300`, `D1..D6` at 30/78/126/174/222/270 in both the
  header row and the data row — identical), pinned strip confirmed masking correctly,
  a day checkbox confirmed to toggle and revert through the enlarged cell, and the edit form
  confirmed at 335px (scrollport width) inside a 724px-wide block.
- `document.documentElement.scrollWidth === innerWidth` on every tab — the rows scroll
  inside their own scrollports, the page itself never does.
- Desktop 1280x900 re-checked: `.crewgrid`/`.rows-sched` computed columns byte-identical to
  before (`24px 30px 100px 90px 478px 34px`, insert hint still `absolute / -10px / 50px /
  opacity 0`), Crew matrix and Shoot Days form unchanged. Everything in this phase is inside
  the media query except the one added class name.
- Zero console errors; `node --check` clean; CSS braces balanced 474/474.

## Phase BQ — Pre-production gets the Edit pencil; one row height on mobile (11 Aug 2026)

**"Add the 'edit' pencil option to Pre-production (same as Roles and Days on site) and
match the style height of text across Roles, Pre and Days on site."**

### 1. The pencil

Pre-production was the one Crew sub-tab whose Controls column held a bulk-select checkbox
and nothing else — Phase BJ's original line was "no crew-record edit path of its own", so
the pencil was never added. In practice that read as a missing control, not a deliberate
one: the column is the same width on all six tabs (`--pb-controls-w`), so Pre-production
just showed a gap where every sibling tab has a pencil.

`prepRowHTML()` now uses the **same pair every other sub-tab uses** —
`crewControlsHTML(block, {selectCbHTML:personBlockSelectCbHTML(block)})` for the controls
cell and `crewExpansionHTML(block, 'pb-editform')` for the expansion, with
`editing:editingCrewId===block.id` on the wrapper. No new edit path, no second form: it
opens the same `crewFormHTML()` against the same crew RECORD that Roles and Days on site
open. ⚠️ Nothing about prep days or date marks goes through it — `setPrepDays()` /
`togglePrepCalendar()` are untouched, and the pencil does not reach them, exactly as on
the other tabs where the pencil doesn't reach the day checkboxes.

- Removed: the `// no expansion: Pre-production has no crew-record edit path of its own
  (Phase BJ)` comment and the `{ editing:false, open }` wrapper opts. Do not reinstate them.
- Re-checked afterwards: bulk-select still raises the bulk action bar, the date-marks
  calendar still opens and closes, and the pencil toggles Edit → Close like its siblings.

### 2. One row height on mobile

Phase BO settled all six sub-tabs onto a shared **33px** row on desktop. Phase BP
reinstated real rows on mobile but let each tab's own tallest control set the height, so
they drifted apart again — measured at 375x812 before this phase:

| tab | height | what was driving it |
|---|---|---|
| Roles | 46px | the "Show as" field taking the generic 46px mobile form-control height |
| Travel | 48px | its `<select>`, same rule |
| Days on site / Hotel | 44px | the "All" button picking up `button.small`'s 44px floor |
| Pre-production / Catering | 40px | a 40px `.icon-btn` |

Now **40px on every one of the six**, via `.pb-head, .pb-role-row{min-height:40px}` inside
the media query plus three caps on the overshooting controls.

- ⚠️ **40px, not desktop's 33px.** The 40px `.icon-btn` is the one thing in these rows
  that must not shrink — it is the tap target for the pencil, the trash and the calendar
  button. So the icon button sets the floor and everything that was overshooting it comes
  back to 34px (still a comfortable touch height for a field).
- ⚠️ All three caps are written to out-specify a **type or attribute** selector, not just
  a bare class — the same specificity trap Phase BP hit with `.budget-rate-input`:
  `.roles-grid-showas input[type=text]`, `.crewgrid select, .prep-grid select,
  .roles-grid select`, and `button.small.all-toggle-btn`.
- It is a **floor, not a cap**: a row still grows past 40px for genuine content — a
  `.prep-counter` with something to say, or a chevron-revealed second role — exactly as
  Phase BO's follow-up decided. Verified: the first three rows of every sub-tab measure
  40px, and a Pre-production row with "15 days booked" still grows.
- The name text itself was already identical everywhere and was not touched — 14px Jost
  600 on `.roles-grid-name`, `.prep-name` and Days on site's `.crew-ident.one-line strong`
  alike (confirmed by computed style, all three: `14px / 600 / Jost`). The mismatch was
  purely the row box around it.

### Verified

- 375x812: all six sub-tabs measure 40px for their first three rows; Pre-production's
  pencil opens the shared crew form at 335px (the scrollport width, per Phase BP's
  `100cqw` rule) and closes again.
- 1280x900: all six still 33px, and Controls/Name/Role still start at identical x across
  Roles / Pre-production / Days on site (355 / 421 / 601) — Phase BO's alignment intact.
  Everything in part 2 is inside the media query; part 1's pencil is the only change
  visible on desktop.
- Zero console errors; `node --check` clean; CSS braces balanced 478/478.
