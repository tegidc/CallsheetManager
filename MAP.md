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
- `projectCrew()` — a project's crew records, in the order they were added to it — [Shared/utility functions]
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

- `renderProjectCrew()` — renders the project Crew tab, including the grid-view switcher (Roles/Days/Hotel/Travel/Catering), the shared header row and the bulk-action bar — [Crew]
  - `crewGridView` switch renders one of: roles grid, days-on-site grid, hotel grid, travel grid, catering grid
  - Phase V: Select all/Filter/Expand-all/Summary were unified into one `.crew-header-row` (Select all + Filter left-aligned, Expand/Collapse-all toggle + Summary right-aligned, one shared font) built once in this function and reused identically across all five view-switcher tabs. The Filter *toggle* lives in this row; the Filter *panel* (`projectCrewFilterPanelHTML()`) still renders as its own block below the row, not inside it, so opening it can't distort the row's alignment
- `setCrewGridView()` — switches which crew matrix (days/hotel/travel/catering) is shown and re-renders — [Crew]
- `toggleAllProjectDeptsCollapsed()` (Phase V) — the single Expand-all/Collapse-all toggle used in the crew header row: flips based on current state (expand if every visible group is collapsed, otherwise collapse all) rather than offering two separate always-on links; delegates to `setAllProjectDeptsCollapsed()` — [Crew]
- `projectCrewFilter` / `projectCrewFilterOpen` — the ONE shared filter/sort/group-by state for "Crew on this project", global so it survives `setCrewGridView()` tab switches. Now also holds `days` (Set of shoot day ids) and `daysMode` ('or'/'and') — the multiselect Days filter (Phase T item 3) — [Crew]
- `matchesCrewFilterState()` — shared match rules (depts, lead company, roles, exclude-Talent, exclude-other-companies) used by both this screen's filter and the Crew database's. Does NOT include the Days filter — the Crew database screen has no project/shoot-day context, so that's a separate check (`personMatchesProjectDayFilter`) only applied on the project screen. Lead company match (Phase AC) treats the sentinel `'__blank__'` as "no lead company set" (`!c.coProductionCompany`), distinct from `''` which means "no company filter active, show all" — the project Filter panel's Lead Company `<select>` only offers a "Blank" option when at least one assigned crew member actually has no lead company (`hasBlankCompany`) — [Crew, Shared/utility functions]
- `personMatchesProjectDayFilter()` — the Days filter (Phase T item 3): matches if the person has a position on any (`daysMode:'or'`) or every (`daysMode:'and'`) of the selected shoot days. An OR/AND `<select>` appears next to the day checkboxes once 2+ days are picked — [Crew]
- `personMatchesProjectFilter()` / `personHasHotel()` / `sortProjectCrewGroup()` / `buildProjectCrewGroups()` — filter (`matchesCrewFilterState` + `personMatchesProjectDayFilter`), "has hotel" test, in-group sort and grouping for the assigned crew list. `personMatchesProjectFilter()` flips its own result when `projectCrewFilter.inverse` is set (Phase AE "Inverse" checkbox) — everyone who does NOT match the active criteria, rather than everyone who does; the day filter is included in what gets inverted — [Crew]
- `crewSeniorityBand()` (Phase Sort/Group A) — bands a crew member into "Department leads" / "Mid-level" / "Support / entry level" off the real per-department `roleSeniorityRank(dept, role)` (rank 0 = a department's first/most-senior listed role in `ROLES_BY_DEPT`, so low ranks band together sensibly across departments even though the underlying numbers aren't globally comparable) — not a separate flat seniority list. Used by both the Seniority Sort and Seniority Group by — [Crew]
- `sortProjectCrewGroup(list, p, days)` (Phase Sort/Group A) — switches on `projectCrewFilter.sort`: `dept` (default, `sortHoDFirst`) / `name` / `role` / `seniority` (via `crewSeniorityBand`'s underlying rank) / `company` (`c.coProductionCompany`) / `daysCount` (most shoot days on site first, via `d.positions`) / `added` (index in `p.crewIds` — the same add-order signal `projectCrew()` relies on elsewhere). Takes `p`/`days` now (not list-only) since `daysCount`/`added` need project context — only ever called from `buildProjectCrewGroups()` — [Crew]
- `buildProjectCrewGroups(list, p, days)` (Phase Sort/Group A) — switches on `projectCrewFilter.groupBy`, twelve options: `dept` (default) / `deptCompany` (flat composite bucket, e.g. "Cinematography — Creative Dynamic", not a true nested group — avoided touching every `crewGridView` row renderer for a two-level header) / `company` / `role` / `subDept` / `personType` (Crew/Talent/Client, derived off `deptBucketKey`) / `hotel` (existing, via `personHasHotel`) / `travel` (`p.travelMethods[c.id]`) / `vat` (`c.vatRegistered`, strictly `''`/`'Yes'`/`'No'` — same field Budget's VAT calc reads) / `catering` (`c.dietaryGeneral`) / `seniority` (via `crewSeniorityBand`) / `daysOnSite` (**multi-bucket** — a person on 3 shoot days appears in 3 groups, same `(d.positions||[]).some(pos=>pos[0]===c.id)` signal `buildTransportSummary()` uses) / `none` (single ungrouped bucket, still rendered with a header — "All crew" — no `crewGridView` branch currently supports a header-less group). Every non-`dept`/`hotel` bucket set sorts blank/"Not set" values last rather than alphabetically first — [Crew]
- `toggleProjectCrewFilterPanel()` / `toggleProjectFilterDept()` / `toggleProjectFilterRole()` / `toggleProjectFilterDay()` / `setProjectFilterField()` / `toggleProjectFilterFlag()` / `clearProjectCrewFilter()` / `projectCrewActiveFilterCount()` / `projectCrewFilterPanelHTML()` — collapsible filter panel state and rendering, including the Days filter-chips + OR/AND select (Phase T item 3), the Roles filter-chips sub-section (Phase AB — its own collapse toggle, `projectCrewFilterRolesOpen`/`toggleProjectFilterRolesSection()`, independent of the panel's own open/closed state) and the Inverse checkbox (Phase AE, `toggleProjectFilterFlag('inverse', …)` — no new setter needed, the existing generic flag setter covers it). Sort/Group by (Phase Sort/Group A) each carry a broad curated option list rather than the earlier two/one-option shell — see `sortProjectCrewGroup()`/`buildProjectCrewGroups()` above for what each value does. The panel's trailing row (the three exclusion checkboxes + hint + "Clear filters") is the shared `filterPanelFootHTML()` — see **The filter-panel foot** — and `projectCrewActiveFilterCount()` is what gates that row's "Clear filters" link; note it counts filters only, so choosing a Sort or Group by never makes the panel look filtered — [Crew]
- `projectCrewSelected` / `toggleCrewSelected()` / `toggleSelectAllFilteredCrew()` / `clearCrewSelection()` / `bulkRemoveSelectedFromProject()` / `bulkActionBarHTML()` — bulk-select (checkbox swapped in for the view/eye icon via `crewIdentityHTML`'s `bulkSelect` option) and the bulk "Remove from project" action. `toggleSelectAllFilteredCrew()` is the "Select all" checkbox next to Expand/Collapse all (Phase T item 2) — it's always handed exactly the currently-filtered/visible crew ids, never the full project roster, so it only ever selects what the active filter is showing — [Crew]
- `selectedEditTargets(crewId)` (Phase Bulk Edit) — **the selected-set bulk-edit pattern.** Every per-field editor on the Crew tab calls this first: if `crewId` is part of the current multi-select AND at least one other person is also selected, it returns every selected id; otherwise just `[crewId]`. The caller then loops its own field-specific mutation over the returned ids and does ONE `saveDB`/render at the end — this is the reusable "which ids does this edit apply to" decision, not a per-field bulk-edit implementation. Wired into `toggleCrewOnDay()` (Days on site), `toggleHotelNight()` / `toggleHotelPre()` (Hotel), `toggleMeal()` (Catering), `setTravelMethod()` (Travel), `saveQuickShowAs()` (Roles — Show as) and `setActiveRole()` (Roles — role/department; only on a direct user pick, i.e. `skipSave` falsy — the internal `skipSave:true` calls used to reactivate a replacement role after `removeRoleFromCrew()` do NOT fan out, since that's a single-person consistency fixup, not a user edit). `bulkActionBarHTML()` shows a one-line hint ("Editing a field for one selected person applies it to all N") whenever 2+ are selected. Deliberately NOT wired into `toggleAllForPerson()` / `toggleAllMealForPerson()` (the per-person "All" button) — that's a different axis (all days for one person), mixing it with cross-person propagation would be confusing — [Crew]
- `bulkEditOpen` / `toggleBulkEdit()` / `bulkEditPanelHTML()` / `applyBulkLeadCompany()` — bulk-edit panel opened from the bulk-action bar; currently just Lead Company, the field Phase R moved off the main Roles row — [Crew]
- `crewRolesRowHTML()` — renders one person's row in the Roles tab as a proper tidy grid (`.roles-grid`, Phase S), not a packed inline row: CONTROLS (checkbox + Edit pencil) | Name | Role (saved-roles taglist only — no add-role picker here any more) | Rate | Show as. Department column was dropped in Phase Z — redundant with the group/section headers already showing it; the freed slot became Rate, the same per-project day-rate override as Budget's Per Person view (`resolveCrewRate()`/`saveCrewRateOverride()`/`p.crewRateOverrides[crewId]` — reads/writes that exact field, not a second one), edited inline with the same `.budget-rate-input` control. Since Phase AG the Rate cell also carries the Day Rate Save-to-database icon (`crewRateSaveIconHTML()`, `.rate-with-save` wrap; `.roles-grid`'s Rate column widened 92px→118px to fit it). "Add a saved role" and Lead Company both live only in the Edit/pencil expansion (`crewFormHTML`) or the bulk-edit panel; phone is not shown on this row at all — [Crew, Budget]
- `showAsQuickEditHTML()` / `saveQuickShowAs()` — inline "Show as" quick-edit, used on the Roles row. Renders via the same `.icon-btn` pencil button as every other edit affordance in the row (Phase S item 2) rather than a separately-styled control — [Crew]
- `groupedCrewOptionsHTML()` — builds `<option>` groups (by department) for crew-picker selects — [Crew]
- `crewAssignRowHTML()` — renders one crew row in the "days on site"/"hotel" grid. Department badge and Lead Company pill are hidden (Phase S item 6) and role display falls back to Show-as (`showAsOrRole`, item 8) — this row no longer offers any role editing (the old per-row role quick-edit was removed; role/department/Show-as are only ever edited on the Roles tab) — [Crew]
- `toggleCrewOnDay()` — toggles a crew member's assignment to a given shoot day — [Crew]
- `crewCateringBlockHTML()` — renders one crew member's per-day breakfast/lunch/dinner checkbox rows in the catering grid. Department/Lead Company hidden, role display is Show-as-or-role, display-only (Phase S) — [Crew]
- `getCateringMeals()` / `toggleMeal()` — read/write which meals a crew member is down for on a given day — [Crew]
- `toggleAllMealForPerson()` — toggles one meal type on/off across every day for a person — [Crew]
- `buildCateringExport()` / `renderCateringExport()` / `copyCateringExport()` — build, render and copy a per-day catering headcount + dietary-notes list. Lives only in Preview & Export (T-7.5), left as-is by Phase P2 — [Crew, Preview & Export]
- `getCateringCosts()` / `saveCateringCosts()` — read/persist the project's per-meal costs (`p.cateringCosts.{b,l,d,delivery}`), Phase P2 — [Crew]
- `buildCateringSummaryGrid()` (Phase P2) — the Catering tab's own summary data: Breakfast/Lunch/Dinner counts per day plus a computed Daily cost (meal counts × their unit costs, plus a delivery fee charged once per meal type per day, only when that meal's count is >0 that day) — distinct from `buildCateringExport()`'s per-day list shape — [Crew]
- `cateringSummaryGridBodyHTML()` / `renderCateringSummaryGridSection()` (Phase P2) — render the grid (rows=meals+Daily cost, columns=days) into `#csmGridWrap`, re-rendered on cost-field input without touching the cost inputs themselves (same targeted-refresh pattern as `renderTechSpecsRoundup()`) — [Crew]
- `cateringSummaryOpen` / `toggleCateringSummaryBlock()` / `cateringSummaryHTML()` / `copyCateringSummaryGrid()` (Phase P2) — the collapsible "Catering summary" block on the Catering sub-tab (T-2.5): cost fields (Est. cost per Breakfast/Lunch/Dinner, Delivery cost) above the grid. Collapsed by default, positioned below "Crew on this project", same pattern as the Hotel summary block — [Crew]
- `jumpToCateringSummary()` (Phase P3) — the "Summary" jump-link next to Expand all/Collapse all on the Catering sub-tab: expands `cateringSummaryOpen` if collapsed, then scrolls `#cateringSummarySection` into view — [Crew]
- `crewTravelRowHTML()` / `setTravelMethod()` — render and update a crew member's travel method row. Department/Lead Company hidden, role display is Show-as-or-role, display-only (Phase S) — [Crew]
- `getTransportCosts()` / `saveTransportCosts()` (Phase W) — read/persist the project's transport cost inputs (`p.transportCosts.{publicPerDay,mileage}`): a flat daily rate for public transport and a single general mileage rate for people using their own car (one rate overall, not per-person) — [Crew]
- `buildTransportSummary()` (Phase W) — the Travel tab's own summary data: since travel method (`p.travelMethods`) is stored once per person per PROJECT, not per day, the per-day breakdown is derived by crossing each person's method with the days they're actually on site (has a position that day — same signal as the Days-on-site grid). Counts every method actually in use per day, plus a computed Daily cost (Own car count × mileage rate + Public transport count × daily rate — the only two methods that carry a cost; Train/Flying/Production transport/custom methods are counted but not costed) — [Crew]
- `transportSummaryGridBodyHTML()` / `renderTransportSummaryGridSection()` (Phase W) — render the grid (rows=methods in use+Daily cost, columns=days) into `#tsmGridWrap`, re-rendered on cost-field input without touching the cost inputs themselves (same targeted-refresh pattern as `renderCateringSummaryGridSection()`) — [Crew]
- `transportSummaryOpen` / `toggleTransportSummaryBlock()` / `transportSummaryHTML()` / `copyTransportSummary()` (Phase W) — the collapsible "Transport summary" block on the Travel sub-tab (T-2.4): cost fields (public transport cost/day, mileage rate) above the grid. Collapsed by default, positioned below "Crew on this project", same pattern as the Hotel/Catering summary blocks — [Crew]
- `jumpToTransportSummary()` (Phase W) — the "Summary" jump-link next to Expand all/Collapse all on the Travel sub-tab: expands `transportSummaryOpen` if collapsed, then scrolls `#transportSummarySection` into view — [Crew]
- `toggleHotelNight()` / `toggleHotelPre()` — toggle whether a crew member is booked a hotel room for a shoot night / the night before — [Crew]
- `abbreviateName()` — "first initial + last name" display form (e.g. "A. Shaw"), used by the per-night table's Names column — [Crew]
- `buildHotelSummary()` (Phase O, replaces the old Preview-tab `buildHotelExport`) — per-person hotel aggregation: resolves each person's actual booked-night dates (incl. "night before Day 1") into a check-in/check-out range and total-nights count, sorted earliest check-in first then most nights first (`orderIndex`), and reused by the per-night table's Names ordering so both views stay in the same person order — [Crew]
- `hotelSummaryOpen` / `toggleHotelSummaryBlock()` / `hotelSummaryHTML()` / `copyHotelSummary()` — the collapsible "Hotel summary" block: a cost field ("Est. cost per room/night", id `hcRoomNight`, Phase AD — moved here from Budget, same `getHotelCosts()`/`saveHotelCosts()` pair, same `field-inline` markup as Catering's cost fields) above room-booking table (Room No./Name/Date from–to/Total nights), then per-night table (Night/Rooms/Names) below it, no separate rooming list. Shared markup/state rendered in two places (Phase O + follow-up) — below the person × night matrix on the Hotel sub-tab (T-2.3), and again below the WhatsApp text block on Preview & Export (T-7.2b) — same `hsmb-summary`/`hsmc-summary` ids either way since only one tab body is ever in the DOM at once, which is also why the cost field shows up on both (same precedent as Travel's cost fields at T-7.4). Autosave for `hcRoomNight` is wired per-screen: `renderProjectCrew()`'s `body.oninput` when `crewGridView==='hotel'`, and `renderProjectPreview()`'s scoped `e.target.id==='hcRoomNight'` check (alongside the Travel fields, Phase AD) — [Crew, Budget, Preview & Export]
- `jumpToHotelSummary()` (Phase P3) — the "Summary" jump-link next to Expand all/Collapse all on the Hotel sub-tab: expands `hotelSummaryOpen` if collapsed, then scrolls `#hotelSummarySection` into view — [Crew]
- `toggleAllForPerson()` — toggles all day-assignment checkboxes for one person at once — [Crew]
- `addCrewToProject()` / `removeCrewFromProject()` — add/remove a crew member from the current project's roster. `addCrewToProject()` has **three** callers now: this tab's picker, AI Scan's `propose_crew` matched-accept, and Overview Quick Add's crew search — it also calls `resetQuickAdd()` so that box settles back after the third — [Crew, Overview]
  - ⚠️ **Phase AY-a: `removeCrewFromProject()` no longer removes anybody on its own.** It opens the two-option dialog (see **Removing a person from a project** below) and that does the work — a budget can be carrying lines for this person that Production knows nothing about, and silently keeping or silently deleting those are both wrong. This is also why the G14 render-first/save-after shape moved into `confirmRemovePerson()`: nothing is mutated until an option is picked — [Crew, Budget (B-1)]

### Removing a person from a project (Phase AY-a)

- `removePersonDialog` / `openRemovePersonDialog()` / `closeRemovePersonDialog()` /
  `removePersonProject()` / `removePersonScope()` / `removePersonDialogHTML()` /
  `confirmRemovePerson()` — **the one destructive-scope decision, shared by Production
  and Budget**, rendered into `#globalOverlay` alongside the add-role dialog.

⚠️ **DESTRUCTIVE SCOPE MATCHES WHERE THE USER IS STANDING.** From a PROJECT view —
Production or Budget — removing a person offers exactly two options:

1. **Remove from this view only** — Production-only, or the budget line only
2. **Remove from this project entirely** (both views)

and nothing else. **THE CREW RECORD IS NEVER TOUCHED FROM A PROJECT VIEW. It is not
offered and it is not mentioned** — a project is not where anyone reasons about the
shared database, and an option that deletes a person from every other project has no
business next to "take them off this job". Each option spells out its own consequence
with real counts (`removePersonScope()`), because "this view only" means something
different depending on which view you are standing in.

- ⚠️ `openRemovePersonDialog()` **awaits `bdmEnsureLoaded()` first, and that is not
  optional.** Opened from Production, `bdmRecords[p.id]` is normally absent (the
  `budget:<projectId>` key is loaded on demand by the Budget screen alone), so without
  it the dialog would say "their budget lines" instead of a count and the "entirely"
  branch would have nothing to delete from. **This is the one extra `bdmEnsureLoaded()`
  call site AY-a adds**, and it is safe for the reason AX's audit records: it goes
  through the promise-deduped loader, never around it.
- State is `{crewIds:[…], from, lineId}` — an **array**, so the Crew tab's bulk "Remove
  from project" is the SAME decision at scale rather than a second, quieter one that
  skips the choice. One click there can rewrite sixty people.
- ⚠️ **`bulkRemoveSelectedFromProject()` had a real gap this fixes**: it filtered
  `p.crewIds` but left the selected people in every shoot day's `positions`, so a
  bulk-removed person stayed on the call sheet. `confirmRemovePerson()`'s
  `dropFromProduction()` clears both, the way the single-person path always did.
- R17 undo covers it (`db:projects` + `db:shootdays`). A budget-only removal isn't
  snapshotted — `undoCollectionFor()` only knows the four top-level arrays — so it is
  covered by the same autosaved, re-addable line the rest of that screen is —
  [Crew, Budget (B-1), Shared/utility functions]
- `crewInfo()` — looks up a crew member's basic display info by id, with a fallback for removed crew — [Crew]
- `resolveCrewForDay()` / `hasOverride()` — resolve a crew member's effective role/dept for a specific day, accounting for per-day overrides — [Crew, Shoot Days]
- `dayOverrideFormHTML()` / `saveDayOverride()` / `clearDayOverride()` — render/save/clear a per-day override of a crew member's role/department/company — [Crew, Shoot Days]
- `OVERRIDABLE_FIELDS` — list of crew fields that can be overridden per shoot day — [Crew, Shoot Days]

## Locations

- `renderProjectLocations()` — renders the project Locations tab: the assigned-locations day grid, then the ONE "Add location" entry point — [Locations]
- `locAddOpen` / `locAddQuery` / `toggleLocAdd()` / `onLocAddInput()` / `locAddResultsHTML()` / `startNewLocationFromSearch()` (Phase Q) — **the unified add-location flow.** One button opens a search field over `locationsDB` (already-assigned locations filtered out, capped at 8 results), and the "create new location" option is the last row of that same result list, prefilled with whatever was typed. `onLocAddInput()` re-renders `#locAddResults` ONLY — re-rendering the tab would steal focus mid-word, the same reason `crewSearchQuery` lives outside the DOM. `startNewLocationFromSearch()` sets `locFormContext` to the project id itself, which is what makes `saveLocation()` attach the new record to `p.locationIds`. Replaces the old two-button arrangement (a database `<select>` + a separate "Add a new location" form). **Phase Quick Add renders this same widget — same functions, same `#locAddSearch`/`#locAddResults`/`#locFormWrap` ids — inside Overview's Quick add box**, so changing any of it changes both places; that's intended, and safe only because the two are on different tabs of the same body element and never coexist — [Locations, Overview]
- `locDayGridHTML()` — renders the per-location "which days is this used" checkbox grid — [Locations]
- `locRowHTML()` — renders one location row within a project — [Locations]
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
- `refreshAddPosnPick()` / `addPosnToDay()` / `removePosnRow()` — refresh the "add position" picker and add/remove a crew position on the day — [Shoot Days]
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

⚠️ **This is T-6, labelled COSTS in the UI since Gate 1 (Part One), not "Budget" any
more.** Every function/variable/DOM id/CSS class below still reads `budget*` — this was
a visible-text-only rename of the Production tab (`index.html` line ~2848), nothing
else. Reason: with the VIEWS switcher now in the project header offering a "Budget"
route (B-1, a completely different screen — see **Budget (B-1)** below), a tab called
"Budget" *inside* Production was ambiguous. Note the tab is now labelled COSTS while
one of its own four sub-views (`BUDGET_VIEW_LABELS`, T-6.5) is ALSO labelled "Costs" —
a pre-existing naming collision this rename makes more visible, left as-is per the
brief; don't try to fix it as part of a future tidy without checking first.

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
- `resolveCrewRate()` — **the per-project day-rate override mechanism.** Day rate
  needs to vary by job, so it follows the same shape as every other per-project
  per-crew-id map already in the app (`p.travelMethods`, `p.hotelNightBefore`,
  `day.crewOverrides`): `p.crewRateOverrides[crewId]`. Checked first; falls back to
  `parseRateNumber(c.rate)`; falls back to "no rate on file" (`hasRate:false`) rather
  than silently costing someone at 0 — [Budget]
- `saveCrewRateOverride()` — writes/clears one person's override (empty input clears
  it, reverting to the database rate); rejects a non-numeric entry by re-rendering
  without saving, so the field visibly reverts instead of holding invalid text —
  edited inline on the Per Person view, no separate edit affordance (matches the
  Phase Detail "Show as" decision — a plain input, not a pencil-and-save control) —
  [Budget]
- `crewRateSaveIconHTML()` / `saveCrewRateToDatabase()` (Phase AG) — the Day Rate
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
  Days worked = shoot days where `(d.positions||[]).some(pos=>pos[0]===crewId)`,
  the same on-day signal `buildTransportSummary()`/Days-on-site already use. Hotel
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

## Sidebar & navigation — VIEWS (Phase AX)

Phase AX made **project** and **view** independent axes. Before this phase the Budget
screen (B-1) carried its own project `<select>`, entirely separate from the sidebar's
project list — two competing ideas of "what project am I looking at" on one screen at
once. After AX the project is chosen exactly once, in the sidebar, and the view
(Production or Budget) is chosen separately; neither resets the other.

- **The sidebar's top section is now called VIEWS**, moved above Databases (previously
  a "Project" section sat between Projects and App, holding Budget alone). It holds
  two entries: **Production** — the project workspace and its tabs (T-1…T-7), and
  **Budget** — B-1, unchanged in every other respect. Order below VIEWS is unchanged:
  Databases, Projects, App.
- `goProduction()` / `goBudgetDemo()` — the two VIEW routes. **Neither touches
  `currentProjectId`** (Budget already worked this way — see below; AX made Production
  match it). Clicking a VIEW changes `route.screen` and re-renders; the project stays
  whatever it already was.
- `openProject(id)` — the PROJECT axis, the sidebar's project list. **Since AX it no
  longer unconditionally forces you into Production.** If a VIEW is already on screen
  (`route.screen==='project'` or `'budget'`), only `currentProjectId` changes — the open
  view keeps rendering, now for the newly-picked project. From a project-independent
  screen (a database, Settings, Welcome, New project) picking a project still lands in
  Production with the tab reset to Overview, exactly as before AX — that half of
  `openProject()`'s old behaviour wasn't part of what this phase was asked to change.
- **No empty state.** `initApp()` used to leave `route` at its `{screen:'welcome'}`
  default and require a click ("Recent" or "+ New") to get anywhere. Phase AX has it
  call `goProduction()` once loading finishes (when any project exists), which falls
  back through the existing `mostRecentProject()` (highest `lastOpenedAt`, ties keeping
  `projectsDB`'s own order — i.e. "the first project in the list" on a true first load)
  to reopen whichever project was last viewed. **No new persistence layer and nothing
  new written to Supabase**: `lastOpenedAt` already lived on the project record before
  this phase (Phase Y), already written by `openProject()` every time a project is
  actually picked; `goProduction()`'s fallback only *reads* it, and deliberately never
  stamps it itself, so viewing on load isn't treated as "opening" a project the way a
  sidebar click is.
- **Consequence, not a bug (at AX) — fixed at Gate 1: Proper Corn is reachable again.**
  Removing B-1's own project dropdown (see **Budget (B-1)** below) meant the screen only
  ever rendered `currentProjectId`, and Proper Corn was never a real project you could
  select from the sidebar — it only ever existed as an extra option in the dropdown
  that AX removed. AX left it there deliberately (see the AX addendum below), on the
  grounds that building a new way to reach a demo fixture would be a feature, not
  navigation. **Gate 1 is that fixed navigation**: Proper Corn is now a real
  `projectsDB` record (id `bdm-proper-corn-hot-sauce`, titled "Proper Corn Hot Sauce
  (demo)"), pushed by `seedSampleData()` alongside ROW/LMAOF, added to the sidebar's
  PROJECTS list like any other project, so `bdmCurrentProjectId()` resolves it the same
  way it resolves any other project — through `currentProjectId`, no special-casing.
  Its stored budget (`budget:bdm-proper-corn-hot-sauce`) was not touched or reseeded;
  only the missing click path was added. (`seedSampleData()` only ever runs against a
  completely empty database, so this line is for a fresh install — the live production
  Supabase project already carried this project record from before the seed function
  was fixed.) See **Budget (B-1)** below for what changed in `bdmProjectList()` as a
  direct consequence.

⚠️ **The VIEWS control itself moved out of the sidebar, into the project header, at
Gate 1.** Everything above this line still describes the *routing* correctly — project
and view are still independent axes, `goProduction()`/`goBudgetDemo()` are unchanged,
`openProject()` is unchanged, the no-empty-state boot sequence is unchanged. Only the
clickable control moved:
- The sidebar's **VIEWS** section (the `Production`/`Budget` `.side-item` pair, `Views`
  `.side-label`) is gone. The sidebar is back to its pre-AX shape: **Databases,
  Projects, App** — no top section.
- In its place, both `renderProject()` and `renderBudgetDemo()` now render a small
  `viewSwitcherHTML()` control top-right of their `.page-head`, level with the project
  title, above the tab row. It's the exact same two routes (`goProduction()` /
  `goBudgetDemo()`), rendered with the app's existing `.tabs`/`.tab`/`.tab.active`
  idiom — not a new control type, just relocated. `.page-head` is now a flex row
  (title block in a new `.page-head-titles` wrapper on the left, the switcher on the
  right) instead of a plain stacked block.
- Reason: with the Views/Databases/Projects/App stack gone, the sidebar reads as pure
  navigation again, and the view toggle sits next to the thing it's switching the view
  *of* (the project you're looking at) rather than in a separate panel.
- `renderSide()`'s active-item toggle no longer checks `data-side==='production'`/
  `'budget'` — those elements don't exist any more, so the two clauses were dead code
  and were removed. The project-list highlight (`route.screen==='project'||
  route.screen==='budget'`) is untouched — that logic was never about the VIEWS items.

## Budget (B-1) — the line-item budget

⚠️ **This is NOT the Budget tab (T-6).** T-6 is cost visibility only, rolled up from
data entered on other tabs. This is **B-1**, a real line-item budget: you type the
lines, and every figure on it is derived from them. Reached via the view switcher in
the project header (moved here from its own sidebar section at Gate 1 — see **Sidebar
& navigation — VIEWS** above). The two do not share a single function, constant or DOM
id — everything here is named `budgetDemo*` / `bdm*` precisely so it cannot collide
with T-6's `budget*` family. The one thing it *does* reuse is `budgetFmt()`, the app's
one money formatter.

⚠️ **The "Demo" in `budgetDemo*` is HISTORICAL.** Phase AU built this as a demo;
**Phase AV gave it real storage** and it is no longer one. The names were kept rather
than churned through forty call sites — the thing they protect against (a collision
with T-6) is unchanged. Do not read `budgetDemo` as "this is throwaway".

⚠️ **The AU note that this screen touches no database is SUPERSEDED.** It writes,
through the app's existing `loadDB`/`saveDB` choke point and the same `app_data`
key/value table `db:crew` uses. Do not reinstate "persistence is a separate
decision" — it was decided, in AV.

### The three keys (Phase AV)

| key | shape | what |
|---|---|---|
| `db:budget_settings` | object, ONE shared record | `codes` / `phaseSets` / `bbcRules` / `bbcCats` — not per project |
| `budget:<projectId>` | object, ONE per project | `{floatPercent, feePercent, sections[], lines[]}` |

- `BUDGET_KEY_PREFIX` / `isBudgetKey()` / `isObjDB()` — `budget:<projectId>` is the
  first key family whose members are **not known ahead of time**, so `isObjDB()` is no
  longer a flat `includes` on `DB_OBJECT_KEYS` alone; it also matches the prefix. Both
  new keys are object-shaped, so a missing/errored read falls back to `{}` not `[]` —
  [Shared/utility functions, Budget (B-1)]
- `dbKeyLabel()` (**replaces the inline `DB_KEY_LABELS[f.key] || f.key`** in
  `renderSaveFailureBanner()`) — there is one `budget:` key per project, so they can't
  be listed in `DB_KEY_LABELS`; this names the project instead of printing a raw key
  at the user — [Shared/utility functions]
- `applyMergedDB()` gained two branches. The budget keys live in their own caches
  (`bdmSettings`, `bdmRecords`) rather than one of the four top-level arrays, so
  without them an R18 merge would land in the database while this tab kept rendering
  the pre-merge copy — [Shared/utility functions]
- `initApp()` loads `db:budget_settings` ONLY, and seeds it from
  `BDM_SETTINGS_DEFAULTS` on first run — the same seed-if-empty idiom
  `travelMethodsList` already uses. ⚠️ **The per-project `budget:` records are
  deliberately NOT loaded here**: there is one per project and startup already makes
  ten sequential round trips. `bdmEnsureLoaded()` fetches the one the screen needs —
  [Shared/utility functions]

### SECTIONS vs CODES — the AV split, and the point of the phase

AU had one axis: a line's code was both where it displayed and what it counted under.
**AV splits them, because on a real budget they routinely disagree.**

- `section` — **where the line DISPLAYS.** A named bucket on the project record:
  `{id, name, expectedCode, phaseSet}`. `phaseSet` is `"shoot"` or `"post"` and names
  one of the sets in `db:budget_settings`.
- `code` — **what the line COUNTS UNDER** on the top sheet. Frequently differs from its
  section's `expectedCode`, **and that is intentional, not an error to be fixed.**

So in the Departments lens the **line detail groups by section** while the **top sheet
totals by code**, and the two need not match row-for-row: a camera operator carried in
the Travel section still counts as Cinematography. Both lenses still reach the same
subtotal, because every line is counted exactly once on whichever axis you read it.
⚠️ **Verified numerically on a deliberately-disagreeing dataset** — see the table below.

### COPY NOT LOOKUP — do not "fix" this into a live lookup

A line may carry `crewId`, a pointer at a crew record; most lines are suppliers or
locations and carry `null`.

⚠️ **Rate and VAT status are COPIED at the moment of linking and NEVER re-read into an
existing line**, automatically or otherwise. A crew member putting their day rate up
must not silently rewrite a budget that was signed off six months ago. Where a linked
line's stored rate no longer matches the crew record's current rate, the line shows a
small marker whose tooltip says what the crew rate is now — **no auto-update, no
prompt, no bulk action**. That comparison (`bdmRateDriftFlag()`) is the **only** read
of `crewDB` anywhere in this section, and nothing here writes to it.

⚠️ **Phase AY-a built the linking UI** — see **Crew linking, line types and overtime
(Phase AY-a)** below. The AV note that "there is no linking UI yet" and that `crewId`
only ever arrives from seed data is SUPERSEDED. The rule above is unchanged and is
exactly what `bdmLinkLineToCrew()` obeys: rate and VAT are copied at the moment of
linking and never re-read.

### THE OWNERSHIP MODEL (Phase AY-a) — the spine of the crew/production/budget split

Three stores, nothing owned twice:

| store | owns |
|---|---|
| **CREW** (`db:crew`) | the person — name, position, day rate, VAT status, contact |
| **PRODUCTION** (`db:projects` / `db:shootdays`) | the schedule — which days, which unit, call times |
| **BUDGET** (`budget:<projectId>`) | the money — code, section, float, overtime, buyouts |

Neither Production nor Budget keeps its own copy of a person's NAME. Both read it
from the crew record, and editing it in either view writes back to `db:crew`, so the
other view sees it because there is only ever one value.

⚠️ **THE ONE EXCEPTION, and it matters: a budget line also stores its own RATE**,
copied from the crew record at the moment of linking.

> **Crew rate** = what this person costs today.
> **Line rate** = what this job is budgeted at.

Never re-read the crew rate into an existing line automatically. Raising someone's
rate next year must not rewrite last year's budget. Where the two differ, show the
existing AV divergence marker (`bdmRateDriftFlag()`, ≠) with its "Crew rate is now £X"
tooltip and nothing more — no auto-update, no prompt, no bulk action. The line's own
field is labelled **Rate**; the comparison says **Crew rate is now £X**. They are
deliberately not the same label.

**DAYS follow the same rule for the same reason** — filled from Production once, then
editable, never re-synced on their own (`bdmDayDriftFlag()`, ↻).

**Two deliberate readings of the brief, recorded so they aren't re-litigated:**
- **`item` is the budget's own text, seeded from the person's position and NOT written
  back to `c.role`.** The brief says position copies "into item, editable"; since Phase
  R a role is a saved role path out of `ROLES_BY_DEPT`, set only through
  `setActiveRole()` and never typed as free text, so writing a free-text item into it
  would break that rule. The crew record's current role renders beside the picker as
  read-only context instead.
- **VAT stays a property of the LINE after the copy.** B-1 has always modelled VAT per
  line (`vatRate`, 0 or 0.2) because a line is what gets invoiced — see **Budget (B-1)
  — the decisions**. AY-a copies `c.vatRegistered` in at linking and stops there; it
  does not unify B-1's model with T-6's "VAT follows the person".

### Functions

- `goBudgetDemo()` — **one of the two sidebar VIEWS routes that do not clear
  `currentProjectId`** (Phase AX added `goProduction()` as its sibling — see
  **Sidebar & navigation — VIEWS**). `goDatabase()`/`goSettings()` still null it because
  they go to project-independent screens; this is a different view *of* a project, so
  the project you were in stays open behind it. `renderSide()` keeps the open project
  highlighted on `route.screen==='budget'` (and, since AX, `'project'`) for the same
  reason — [Shared/utility functions, Budget (B-1)]
- `renderBudgetDemo()` — the screen: `.page-head`, then (Phase AX) the Float %/Fee %
  settings strip + save-status flash — no project selector any more, see below — then
  the lens `.tabs`, the Top sheet section, then the Line detail sections and the
  add-section row. ⚠️ Paints a **loading shell** and re-renders when `bdmEnsureLoaded()`
  resolves, because the record arrives on demand — [Budget (B-1)]
- `BDM_SETTINGS_DEFAULTS` — the shared record's starting content: the ten codes, the
  two named phase sets, the ordered BBC rules table, the 17 A–Q categories. ⚠️ Seeded
  ONCE into `db:budget_settings`; from then on the **stored** record is the source of
  truth and these defaults are never consulted again, which is what makes editing them
  a later phase rather than a code change — [Budget (B-1)]
- `bdmNormalizeSettings()` / `bdmNormalizeRecord()` — everything downstream reads these
  shapes without defending itself, so a record off the wire (or out of
  `budget-seed-row.json`) is put into shape once, here. Phase AY-b added
  `dismissedCandidates` (line ids the candidate review screen has been told are not
  people) by the same "normalise on read, land on next save" route `lineType` uses —
  [Budget (B-1)]
- `BDM_DEFAULT_FLOAT_PERCENT` / `BDM_DEFAULT_FEE_PERCENT` / `bdmPercentOr()` — 5% and
  10% for a budget that has never been touched. ⚠️ **A fallback for ABSENT, not for
  zero**: Proper Corn's fee genuinely is 0% and must come back as 0%, so this tests
  `null`/`undefined`/`''` rather than falsiness. The same helper is what lets a LINE
  store a float of 0 without falling through to the project's — [Budget (B-1)]
- `bdmProjectList()` / `bdmProjectName()` / `bdmCurrentProjectId()` — ⚠️ **Phase AX
  removed this screen's own project selector; these no longer back one.**
  `bdmProjectList()` offers name lookups plus the last-resort fallback below, but
  nothing calls it to build a `<select>` any more. ⚠️ **Gate 1: it is now exactly
  `projectsDB`** — the `.concat([{id:BDM_PROPER_CORN_ID, ...}])` that used to stand in
  for Proper Corn while it had no project record of its own is gone, now that Proper
  Corn is a real `projectsDB` entry (see **Budget (B-1)** and the Sidebar &
  navigation — VIEWS section above); keeping both would have meant two list entries
  for the same id. Do not re-add a Proper Corn concat here. `bdmCurrentProjectId()`
  simply returns `currentProjectId`
  when it resolves to something in that list, falling back to the first entry only if
  it doesn't (e.g. every project was deleted while this screen was open) — the earlier
  `budgetDemoProjectId` override variable and its setter (`setBudgetDemoProject()`) are
  gone. The one caller that used to jump the screen to a specific project after an
  action — `seedRowBudget()`, after seeding — now sets `currentProjectId` directly
  instead, the same axis the sidebar uses — [Budget (B-1)]
- `bdmEnsureLoaded(projectId)` — the on-demand load, one key. ⚠️ **A second call while
  the first is in flight gets THE SAME PROMISE, never a null.** `renderBudgetDemo()`
  paints a loading shell and re-renders when this resolves, so returning an
  already-settled null to the second caller made it re-render immediately, re-enter
  with the record still absent, and spin — **a hard hang of the whole tab**, on nothing
  more exotic than a slow read plus any re-render landing in the same window (which
  `applyMergedDB()` does on its own after a merge). Caught in AV testing; do not
  "simplify" the in-flight promise back into a boolean — [Budget (B-1)]
  - ⚠️ **Phase AX audit.** This phase added several new ways to trigger a re-render on
    this exact path — switching VIEW (`goProduction()`/`goBudgetDemo()`), switching
    PROJECT (`openProject()` while already on Budget), and the no-empty-state boot
    sequence (`initApp()` → `goProduction()`). None of them call `bdmEnsureLoaded()`
    directly or bypass `renderBudgetDemo()` — every one of them only ever changes
    `route`/`currentProjectId` and calls `renderMain()`, so `renderBudgetDemo()` stays
    the single call site and the promise-dedup fix above still holds. Verified live:
    repeated rapid project/view switching, and switching project mid-read (cache
    cleared, ~30 rapid `openProject()`/`goBudgetDemo()`/`goProduction()` calls fired
    back-to-back against the real Supabase project) — the tab always settled on the
    correct final project/view with no stuck "Loading budget…" and no leaked
    `bdmLoading` entries. **Do not add a second `bdmEnsureLoaded()` call site** (e.g. to
    "prefetch" a budget when switching project while on Production) — the on-demand,
    Budget-screen-only load is deliberate (see the three-keys note above: startup
    already makes ten round trips) and a second call site would need its own dedup.
- `bdmTouch()` / `bdmSaveNow()` — autosave on edit, debounced through the app's
  existing `scheduleAutosave()` and reported through `flashSaveResult('bdmStatus', …)`,
  the same indicator every other autosaving field uses. ⚠️ **Keyed per project and it
  writes ONE key** — a budget edit must never rewrite every project's budget — [Budget (B-1)]
- `bdmPhaseSet()` / `bdmGroupPhases()` — **phase buckets are per SECTION, not global.**
  Shoot sections get PreProd/Shoot/Strike/Buyout; post gets PreProd/Assembly/PreV1/V1
  Feedback/PreV2/V2 Feedback/Delivery/Buyout. `bdmGroupPhases()` exists for the BBC
  lens, where a category can collect lines from sections with different sets — it
  unions them, first set wins on order — [Budget (B-1)]
- `bdmLineFloatPercent()` / `budgetDemoLineMath()` / `budgetDemoTotals()` — **every
  calculated field, in one place, never stored.** `daysTotal` = sum of the phase
  buckets, `net` = rate × daysTotal, `vat` = net × vatRate, `total` = net + vat when
  `bdmVatToggle` is on (Inc. VAT) or net alone when it's off (Ex. VAT), `float` =
  **the current `total`** × **the line's own** float %, `totalWithFloat` = total +
  float. ⚠️ **Float is per LINE** — a section or code total already includes it.
  ⚠️ **The production fee is calculated on the float-INCLUSIVE subtotal**,
  deliberately, on whichever basis is selected.
  ⚠️ **Phase AW correction — VAT sits INSIDE the total by default, not outside it.**
  AU and AV had this backwards: VAT was treated as a figure sitting outside every
  total, excluded from department percentages and the grand total. Little Film's
  budget sheets have always carried VAT INSIDE the line total, with the VAT column
  showing the VAT portion OF that total, and the 5% float calculated on the
  VAT-inclusive figure. AW fixed the formula and added the toggle below so both
  bases can still be viewed — [Budget (B-1)]
- `bdmVatToggle` / `toggleBdmVat()` (Phase AW) — **the Inc./Ex. VAT basis for the
  whole B-1 screen.** Same markup/styling/state-handling pattern as T-6's own
  `budgetVatToggle`/`toggleBudgetVat()` — a checkbox bound straight to the module
  flag, reusing the exact `.budget-summary`/`.budget-stat`/`.budget-vat-toggle`
  classes (safe: B-1 and T-6 are never on screen together) — labelled "Inc. VAT",
  checked by default. Unlike T-6's toggle, which only picks a DISPLAY split
  (itemized vs baked-in) over figures that don't change, this one changes the
  arithmetic itself: `budgetDemoLineMath()`'s `total` (and hence every float,
  department total, both lenses' top sheets, subtotal, fee and grand total) is
  computed differently depending on it. `toggleBdmVat()` does a full `renderMain()`
  for that reason — a targeted refresh wouldn't reach the line-detail tables.
  Session state only, exactly like T-6's own toggle — **not persisted** across a
  reload; a fresh load is always Inc. VAT, which is the basis Little Film's sheets
  are quoted in and the basis the seeded ROW figures reconcile against. The current
  basis is also spelled out in the top sheet itself (Subtotal/Grand total tile
  labels, the Total column header, and the hint line) so an exported or
  screenshotted total is never ambiguous about which one it is — [Budget (B-1)]
- `budgetDemoBbcCategory(rec, l)` — ⚠️ **now data-driven, not a `switch`.** It walks the
  ordered `bbcRules` table in `db:budget_settings` and the **first match wins**. A rule
  matches when its `code` equals the line's code, its `phase` is `any` or equals the
  **phaseSet of the section the line sits in**, and its `match` is empty or one of its
  comma-separated terms appears in the line's **ITEM text**.
  - ⚠️ **`match` is tested against the item ONLY, never the name.** Every term in the
    table is a job or a thing ("Producer", "Kit", "Crypt"); matching the name too would
    route "Hear More Audio Kit Ltd" on the strength of its company name.
  - ⚠️ **Insurance/Risk is now a PROD rule sitting BELOW the Producer/Exec/Director
    rule.** In AU it was a cross-cutting rule tested before everything. It is not that
    any more — this is the table as specified in AV, and first-match-wins is the whole
    contract. Do not re-promote it.
  - `bbcOverride` still beats the whole table — [Budget (B-1)]
- `bdmMiscodeFlag()` / `bdmRateDriftFlag()` / `bdmDayDriftFlag()` /
  `bdmUnmappedDaysFlag()` — **the four information-only markers** (AY-a added the last
  two). None changes a value and none excludes a line from any total; all four are
  computed on every read and never stored, so each clears itself the moment its
  condition stops holding.
  - ⚑ the line's code differs from its section's expectedCode — "Coded CIN, sits in Travel"
  - ≠ a crew-linked line whose stored rate differs — "Crew rate is now £X"
  - ↻ a crew-linked line whose SCHEDULED days differ from Production — "Production has
    this person on 6 shoot days; this line is budgeted at 5". ⚠️ It compares
    `m.scheduled`, never `m.daysTotal`: overtime is not a shoot day and must not make a
    correctly-scheduled line look divergent
  - ⚠ a crew-linked line whose section has no Shoot column to map Production's days
    onto (a post phaseSet) while the person does have shoot days — the buckets are
    left at zero and the LINE is flagged rather than guessed at
  — [Budget (B-1), Crew]

### Crew linking, line types and overtime (Phase AY-a)

⚠️ **This is the first phase in the AU→AY sequence that WRITES to `db:crew`.** It was
read-only and byte-identical through five passes. AY-a's write surface is deliberately
two actions and nothing else: **editing a linked line's NAME**, and **creating a person
from the Budget**. Linking, unlinking, day auto-fill, overtime and line-type changes
never touch `db:crew`.

- `bdmInferLineType()` / `bdmIsService()` / `bdmServiceQtyKey()` — **the two line types
  and the migration.** `lineType` is stored, `'crew'` or `'service'`.
  - **crew** — a person. Phase days, may link to a crew record, days may follow Production.
  - **service** — a buyout, supplier, venue or fee. Carries a QUANTITY, not days:
    nothing about it is scheduled, so it never syncs with Production and its phase
    columns collapse into one **Qty** cell.
  - Both can carry overtime.
  - ⚠️ **The migration.** A pre-AY-a line has no `lineType`, so one is inferred once in
    `bdmNormalizeRecord()` and lands on that budget's next save (the "normalise on read,
    write on next save" idiom G19 used for `dayTotal` — not a migration script). The
    rule: everything in the **Buyout** bucket, or nothing at all, is a service; anything
    carrying a PreProd/Shoot/Strike day is crew. That is what the Buyout column has
    always meant on these sheets — bought outright rather than worked. **Measured on
    ROW's real 82 lines: 32 service / 50 crew**, and all 32 read correctly as a
    supplier, venue, buyout or fee — including all four the brief names (Greenkit,
    Organ Factory, Travel Buyout, Per Diems). No person-day line is caught by it.
  - ⚠️ It is a DEFAULT, not a verdict — `lineType` is editable per line, and a kit
    rental billed by the day (ROW's "A Cam", "Sound Kit") legitimately lands on crew.
  - ⚠️ **Inference reads `days` and never writes it**, and `setBudgetDemoQty()` only
    rewrites the day map when the field is actually edited — which is why migrating
    ROW moved no figure. `bdmServiceQtyKey()` is likewise read-only: the sole occupied
    bucket when there is exactly one (true of every ROW service line), else `Buyout` —
    [Budget (B-1)]
- `overtime` / `setBudgetDemoOvertime()` — **a stored per-line field, in DAYS,
  fractions allowed** (0.5 = a half-day surcharge). ⚠️ Kept OUT of the phase buckets:
  it costs at the line's own rate through `daysTotal`, but it is not a scheduled day,
  never writes back to Production, and never implies a shoot day. `budgetDemoLineMath()`
  now returns `scheduled` and `overtime` alongside `daysTotal` (= scheduled + overtime)
  so the screen can show scheduled work and surcharge apart — the **Days / Qty** column
  is the total and carries a tooltip splitting it, **OT** is its own column. Every
  pre-AY-a line normalises to 0, so `daysTotal === scheduled` for all of them and no
  existing total moved. **Verified on ROW**: 0.5 days on a £700 line moved the subtotal
  by exactly £441.00 (0.5 × 700 × 1.2 VAT × 1.05 float), left `scheduled` at 6, left the
  day map untouched and created no shoot day — [Budget (B-1)]
- `bdmLineCrew()` / `bdmLineName()` — a linked line's name is **read through** to the
  crew record; `l.name` is kept in step on every write purely as the fallback for an
  unresolvable `crewId` (a person deleted from the database). It is never the authority
  while the link resolves, so it cannot go stale the way a stored `dayTotal` did —
  [Budget (B-1), Crew]
- `bdmLinkLineToCrew()` / `bdmUnlinkLine()` / `bdmOnCrewPick()` — linking copies name,
  position→item (only when the line hasn't been given one — it never overwrites typed
  text), rate and VAT, then fills days from Production, and sets `lineType:'crew'`.
  Unlinking keeps everything the line already holds — it is "stop tracking this person",
  not "throw the content away" — [Budget (B-1), Crew]
- ⚠️ **Phase AY-b split that function in two — `bdmAttachCrewToLine()` and
  `bdmCopyCrewToLine()`** — because AY-b needs the halves separately, and duplicating
  either is how two ideas of "linking" start to drift apart. There is now exactly one
  implementation of each, and three callers:

  | caller | attach | copy | why |
  |---|---|---|---|
  | `bdmLinkLineToCrew()` — the picker | ✓ | ✓ | AY-a's behaviour, unchanged |
  | `confirmBdmGenerate()` — bulk generation | ✓ | ✓ | a generated line IS a fresh copy |
  | `bdmFinishAcceptCandidate()` — candidate accept | ✓ | ✗ | the copy runs the OTHER way |

  - `bdmAttachCrewToLine(l, c)` — the POINTER only: `crewId`, the `name` mirror, and
    `lineType:'crew'`. **It touches no figure.**
  - `bdmCopyCrewToLine(rec, l, c, p)` — attach, then THE COPY: position→item, rate,
    VAT, and days from Production. Returns whether the days mapped.
  - ⚠️ **The accept path is why the attach half has to exist on its own.** Running the
    copy there would refill the days from a Production assignment a person created five
    seconds ago has not got, **silently zeroing a line budgeted at six days**. See
    **Accepting a candidate** below — [Budget (B-1), Crew]
- `bdmCrewPickerHTML()` / `bdmFillCrewPicker()` — the per-line picker over the whole
  crew database (not just this project's roster — a budget routinely books someone who
  isn't on the Production crew yet, and picking them is how they get there). Built on
  the app's existing `groupedCrewOptionsHTML()`, which gained an optional `selectedId`.
  - ⚠️ **THE LINK IS OPTIONAL AND MUST STAY SO.** Roughly half of ROW's 82 lines have
    nobody behind them; those keep `crewId` null forever and stay fully editable as
    free text. "— no crew link —" is the first option and the free-text Name field is
    still there.
  - ⚠️ **The options are filled on first mousedown/focus, not on render.** 82 lines ×
    88 records is 7,544 `<option>` nodes in one table. **Measured on the live ROW
    budget**: eager ~1,207ms median per `renderMain()` and 979KB of HTML, versus
    ~93ms/472KB lazy, on a screen that re-renders on every section collapse, lens
    switch, VAT toggle, code/section/BBC change and line add or delete. Caching the
    option *string* was tried and barely moved it — the cost is parsing the nodes. A
    resting picker holds exactly one option: whoever the line is linked to, which is
    all a closed `<select>` ever shows — [Budget (B-1), Crew]
- `bdmProductionDayCount()` / `bdmShootPhaseFor()` / `bdmFillDaysFromProduction()` /
  `bdmResyncLineDays()` — **auto-fill days from Production.** ⚠️ Production stores day
  assignments as `d.positions` on each shoot day, and "is this person on this day" is
  `(d.positions||[]).some(pos=>pos[0]===crewId)` — the app's ONE on-day signal, the same
  one `buildTransportSummary()`, Days-on-site and `buildBudgetData()` use. Don't invent
  a second.
  - Only the **Shoot** bucket is ever written. PreProd/Strike/Buyout are budget
    decisions Production knows nothing about and are left exactly as they are.
  - Where the mapping is not unambiguous — a section on the **post** phaseSet, which has
    no column meaning "a day on set" — nothing is filled and the line is flagged
    (`bdmUnmappedDaysFlag()`), per the brief: leave the buckets at zero rather than guess.
  - ⚠️ Days are then EDITABLE and do NOT re-sync on their own. `bdmResyncLineDays()` is
    a deliberate per-line click, next to the ↻ marker — [Budget (B-1), Crew, Shoot Days]
- `openBdmAddPersonDialog()` / `bdmAddPersonDialogHTML()` / `setBdmAddPersonField()` /
  `confirmBdmAddPerson()` / `bdmAddPerson` — **adding a person from the Budget.**
  ⚠️ **ADD SYNCS BOTH WAYS.** A person added here becomes a crew record AND joins this
  project's Production crew, through `addNewCrewFromProposal()` — the same commit path
  AI Scan's accept and Overview's Quick add already use, not a second one. The other
  direction needs no code: the picker reads `crewDB`, so anyone added in Production is
  already there.
  - ⚠️ **A NAME IS THE MINIMUM.** A line with no name stays budget-only and unlinked
    rather than creating a half-formed crew record — which is why this is a dialog and
    not an inline "type a name and we'll make one". Department and role are required for
    the same reason `saveCrew()` requires them (since Phase R every crew member has at
    least one saved role, and role IS department); a typed role is registered into
    `ROLES_BY_DEPT` first, exactly as `confirmAddRoleDialog()` does.
  - `bdmAddPerson` is held **outside the DOM** for the reason `aiScanDraftText`
    documents — changing department re-renders the dialog's role list.
  - ⚠️ `addNewCrewFromProposal()` gained an optional 4th argument, `proj`. Its two
    existing callers pass nothing and are unchanged; B-1 passes the record it is
    actually rendering, because `bdmCurrentProjectId()` can differ from
    `currentProjectId` in the one edge case that function exists to cover —
    [Budget (B-1), Crew, Overview]
- `deleteBudgetDemoLine()` — ⚠️ an UNLINKED line deletes exactly as it always did (one
  row, autosaved, no confirm). A LINKED line is removing a PERSON from something, so it
  opens the shared two-option dialog instead — see **Removing a person from a project**
  — [Budget (B-1)]
- `budgetDemoGroups()` — Departments lens groups by **section** and totals
  `totalWithFloat`; BBC lens groups by derived category and totals `total` **ex-float**,
  because in that lens the float is pooled into P and must not also be spread through
  the categories. A line whose section id doesn't resolve gets a "Not in a section"
  bucket rather than being invisible in the line detail while still counting on the top
  sheet — [Budget (B-1)]
- `budgetDemoTopSheetRows()` — ⚠️ **the Departments lens totals by CODE, not by
  section.** A code carried by a line but absent from the settings list still gets a
  row. BBC shows all 17 A–Q in order **including the empty ones at £0**, labelled
  "— no lines" rather than hidden. Q renders below the subtotal because that is both
  its ordered position and where the fee actually applies — [Budget (B-1)]
- `budgetDemoSectionHTML()` / `budgetDemoLinesTableHTML()` — top sheet and line detail.
  Sections collapse through `deptHeaderHTML()` + a re-render, the same idiom as the
  Crew list's department groups (**not** `applyBlockState`, whose keys are a fixed set
  and these are not), with the shared `expandCollapseAllHTML()` above them. AV added a
  **Section** column and a **Float %** column to the line row — [Budget (B-1), Shared/utility functions]
  - ⚠️ **Deliberately NOT Phase AT's `collapsibleSectionHTML()`**, nor the
    `applyBlockState`/`toggleBlock` plumbing under it. That idiom is built on a `state`
    object whose keys are a small FIXED set of section names, toggled by direct DOM
    updates instead of a re-render. These sections are neither: the key set is derived
    from the data, and it changes completely when you switch lens (sections ↔ BBC
    letters) or project — [Budget (B-1), Shared/utility functions]
- `setBudgetDemoRate()` / `setBudgetDemoDay()` / `setBudgetDemoLineFloat()` /
  `setBudgetDemoPercent()` / `refreshBudgetDemoNumbers()` — **the live-recalculation
  path.** These update the model on `oninput`, schedule the save, and then rewrite only
  the *derived* text through `refreshBudgetDemoNumbers()`, touching no input — the same
  targeted-refresh rule as `renderCateringSummaryGridSection()`, for the reason
  `aiScanDraftText` documents — [Budget (B-1)]
  - ⚠️ `setBudgetDemoLineFloat()`: an **empty** field means "follow the project"; a
    typed **0** means "no float on this line" and is stored as 0. Those are different
    and both are legitimate — real lines carry zero float — [Budget (B-1)]
- `setBudgetDemoLineText()` / `setBudgetDemoLineField()` — the other speed. Only an edit
  that can MOVE a line between groups re-renders: its **section**, its code, its BBC
  override, or the item text the BBC rules read. Text fields re-render on `onchange`
  (focus has left), never on `oninput` — [Budget (B-1)]
- `addBudgetDemoLine()` / `deleteBudgetDemoLine()` — add takes its section from the
  group it was pressed in and its code from that section's `expectedCode` (in the BBC
  lens it also sets `bbcOverride` to that category, so the new line stays where you
  added it). Delete has **no `confirm()`** — one row, autosaved, and the app's undo
  toast is not wired into this screen — [Budget (B-1)]
- `setBudgetDemoNewSection()` / `addBudgetDemoSection()` / `deleteBudgetDemoSection()` /
  `bdmNewSection` — **the minimum needed for a budget that starts empty to be usable at
  all.** With no sections there is no "+ Add line" anywhere, so LMAOF and Fashion Files
  would have had a budget that could never be started. Add, and remove-when-empty only;
  renaming and re-coding a section is a later phase, same as editing the settings
  tables. `bdmNewSection` is held **outside the DOM** for the reason `aiScanDraftText`
  documents — `renderMain()` would blank a half-typed name — [Budget (B-1)]
- `BDM_PROPER_CORN_SEED` / `BDM_PROPER_CORN_ID` — **Proper Corn is kept from AU
  deliberately**: ROW has no post work, so this is the only project on which the "post"
  phaseSet is visible at all. Its lines live inline purely as the starting content for
  its budget record; `bdmEnsureLoaded()` writes them to `budget:bdm-proper-corn-hot-sauce`
  the first time the record is found absent, and from then on storage is the source of
  truth and the constant is never read again. ⚠️ **Gate 1: it IS now a project in
  `projectsDB`** (same id, `BDM_PROPER_CORN_ID`, titled "Proper Corn Hot Sauce (demo)"),
  reachable from the sidebar's PROJECTS list like any other project — see the Sidebar &
  navigation — VIEWS section above. This constant still seeds only the budget's lines
  and sections; the project record itself lives in `projectsDB`, not here, and was not
  generated from this constant — [Budget (B-1)]
- ⚠️ **REMOVED in Phase AV — do not look for these**: `BUDGET_DEMO_DATA` and its
  **"IRL London 2026"** dataset (dropped entirely), `BUDGET_DEMO_CODE_LABELS`,
  `BUDGET_DEMO_CODES`, `BUDGET_DEMO_BBC_CATEGORIES`, `BUDGET_DEMO_BBC_LABELS`,
  `BUDGET_DEMO_SHOOT_PHASES`, `BUDGET_DEMO_POST_PHASES`, `budgetDemoProjects`,
  `budgetDemoInit()`, `budgetDemoPhases()`, `budgetDemoGroupPhases()`. The four
  constants became fields of `db:budget_settings`; the rest were replaced by the
  storage layer above — [Budget (B-1)]
- `BDM_ROW_SEED_FILE` / `seedRowBudget()` — **the ROW 2026 seed action (S-1.6).**
  ROW's budget lives in `budget-seed-row.json` **in the repo, not inline in the app
  source**: it is data, it is long, and once seeded the app is where it is edited. The
  action reads that file once, resolves the target project by `projectId` (falling back
  to `projectTitle`), **warns and requires a `confirm()` if that project's budget
  already has lines** — seeding REPLACES, it does not merge — and writes. After that
  the file is never read again. It refuses to seed a file with no lines in it —
  [Budget (B-1), Shared/utility functions]
- `bdmSettingsTablesHTML()` — **the codes, phase sets and BBC rules, READ ONLY, in
  Settings (S-1.5).** The point is that the rules can be seen rather than being buried
  in code. Editing them is a later phase — [Budget (B-1), Shared/utility functions]
- ⚠️ **Superseded at Gate 1 (Part One): the `.main:has(#bdmTopSheet){max-width:1320px}`
  one-off is GONE.** It existed because at the app's old 840px reading column the
  Total / Float / Total+float columns sat off the right edge. Gate 1 replaced the
  840px default with one landscape container for every screen (`.main{max-width:1188px}`
  — see **The wide-view exception** below, now retitled to record its removal), so
  this screen no longer needs its own exception — do not look for `:has(#bdmTopSheet)`.
  The line table (`min-width:1230px`/`1490px`, from AV's Section column) is still wider
  than 1188px, so it now scrolls inside its own `.tablewrap` at the SAME width every
  other screen uses, rather than the page growing to fit it — live-verified: `.main` is
  1188px on every screen checked (Production's seven tabs, both databases, Settings,
  B-1), no page-level horizontal overflow at any of them, down to 375px — [Budget (B-1)]
- Gate 1 (Part One) also: removed the rule between individual line rows
  (`.bdm-lines td{border-bottom:none}` — the field underlines already delineate each
  row; the header row's own rule, a `.section th`, is untouched), and widened the Item
  column (`.bdm-item-input`, 130px→220px min-width, since it was truncating real values
  like "Field Producer on Set" and "Production Coordinator") — funded by narrowing
  Notes (120px→90px) and this table's Section/Code/BBC pickers (`.bdm-lines
  select.pill-select`, scoped to this table only, 180px→120px max-width; the shared
  `select.pill-select` class elsewhere in the app is untouched) — [Budget (B-1)]
- ⚠️ **The field-width rules are qualified with their element on purpose** —
  `input.bdm-rate-input`, not `.bdm-rate-input`. `input[type=text]{width:100%}` is an
  attribute selector at specificity (0,1,1) and beats a bare class (0,1,0), so the
  unqualified version silently collapsed every field to its cell (measured: a £5,000
  rate rendering in 39px, clipped). Same reason `.ts-field input.fld-xs` is written the
  way it is. Don't "tidy" the element off the front — [Budget (B-1)]

### Verified (Phase AV), driven through the live page against the real Supabase

| check | result |
|---|---|
| `db:crew` untouched — count, every field, byte-for-byte | ✓ 88 records, md5 `8e1989…be28` identical before and after, `updated_at` unmoved |
| only the ONE project's key is written on a budget edit | ✓ only `budget:bdm-proper-corn-hot-sauce` appeared |
| Proper Corn survives the AU→AV rewrite unchanged | ✓ subtotal £21,711.90 / fee £0.00 / grand £21,711.90 / VAT £1,015.60 — AU's figures exactly |
| edit a rate → reload → still there | ✓ 668→700 persisted, subtotal £21,745.50, then restored |
| both lenses total identically | ✓ sections £21,711.90 = codes £21,711.90 = BBC cats+float £21,711.90 = BBC rows inc. P £21,711.90 |
| every line in exactly one group, both lenses | ✓ 15 / 15 |
| **sections and codes deliberately disagreeing still reconcile** | ✓ Camera section £5,985 vs CIN code £8,010, Travel section £9,600 vs CAT/TRA £6,000 — all four axes still £17,378.75 |
| POST section renders its own 8 phase columns | ✓ PreProd·Assembly·PreV1·V1 Feedback·PreV2·V2 Feedback·Delivery·Buyout |
| every row of the BBC rules table | ✓ all 15 rules + first-match order + `CIN`/post→L + override + item-only matching (a supplier "Kit House Ltd" does NOT route AUD→H) |
| miscode marker | ✓ "Coded CIN, sits in Catering & travel"; value, code and every total unchanged; clears when they match |
| crew rate-drift marker | ✓ absent when equal, "Crew rate is now £800.00" when not; the line's own rate never overwritten by a render |
| per-line float | ✓ blank follows project (5% → £46.25), stored **0** gives £0.00, stored 12 gives £111.00 |
| empty state (LMAOF, Fashion Files) | ✓ £0.00 throughout, 5%/10% defaults, add-section row so the budget can be started |
| seed action | ✓ refuses an empty file; writes; on a second run warns "already has a budget with N lines… will REPLACE", cancel changes nothing, confirm replaces |
| re-render during an in-flight load | ✓ survives (this is the hang described under `bdmEnsureLoaded()`) |
| every existing screen still loads | ✓ Welcome, Crew db, Locations db, Settings, T-1…T-7, T-6's four views + VAT toggle + filter, T-2's five grids + filter, B-1 × 4 projects × 2 lenses — no window errors |
| mobile 375px | ✓ no page-level horizontal overflow; the wide tables scroll inside their own `.tablewrap` |

### Verified (Phase AW), driven through the live page against the real Supabase

**The spec error this phase corrects:** AU and AV treated VAT as sitting OUTSIDE
every total — excluded from department percentages and the grand total, shown only
in its own column. That was wrong. Little Film's sheets carry VAT INSIDE the line
total, with the 5% float calculated on the VAT-inclusive figure. AW fixed
`budgetDemoLineMath()`/`budgetDemoTotals()` (see above) and added the `bdmVatToggle`
Inc./Ex. VAT toggle so both bases are still reachable.

| check | result |
|---|---|
| `budget-seed-row.json` filled in with the real ROW 2026 London data | ✓ 82 lines, 10 sections, floatPercent 5, feePercent 10, target `id_msc4nv2c0g178` |
| Settings' "Seed ROW 2026 budget" action, run against the real project | ✓ no existing budget on that project, so no replace-confirm; wrote `budget:id_msc4nv2c0g178` — 82 lines / 10 sections / 5 / 10, confirmed straight off the table |
| headline figures, Inc. VAT (default) basis | ✓ Subtotal £318,668.31 / Production fee £31,866.83 / Grand total £350,535.14 — exact match to the brief, itself ~£1 off the source sheet's own rounded display figures, not an error |
| all eight department totals, Inc. VAT basis | ✓ SET £96,996.90 / PROD £64,829.10 / CIN £45,355.35 / CAT/TRA £33,425.34 / GRIP £24,987.69 / EQUIP £23,520.42 / AUD £16,419.06 / HMU £13,134.45 |
| Ex. VAT basis, same data | ✓ Subtotal £291,178.58 / fee £29,117.86 / grand £320,296.44 — VAT reference figure unchanged at £26,354.20 either way, since `vat` itself is always net × vatRate regardless of the toggle |
| toggle round-trip, repeated | ✓ 4 consecutive flips returned exactly `£318,668.31 / £291,178.58 / £318,668.31 / £291,178.58` — no drift, because every figure is recomputed fresh from the stored rate/day/vatRate data on every read, never from the previous derived value |
| both lenses (Departments/BBC) total identically | ✓ on Inc. VAT: £318,668.31 = £318,668.31; on Ex. VAT: £291,178.58 = £291,178.58 |
| per-line worked example from the brief (£8,000 net, 20% VAT, 5% float) | ✓ reads £8,400 ex-VAT and £10,080 inc-VAT — both bases stay internally consistent per line |
| miscode flag (⚑), all 12 genuinely-miscoded lines including Premier Inn's "Hotel Crew" | ✓ raises "Coded CIN, sits in Travel"; 11 others also correctly flagged (4× Production coded SET, 4× Cinematography coded EQUIP, 3× Set/Venue coded EQUIP) |
| Hotel Additional's back-solved rate (£1,142.86 × 1 day, 0% VAT, 5% float) | ✓ reconciles to an exact £1,200.00 total-with-float |
| Proper Corn, Inc. VAT (the new default) | ✓ Subtotal £22,778.28 / fee £0.00 / grand £22,778.28 / VAT £1,015.60 — **changed from AU's £21,711.90**, because AU's figure assumed the old (wrong) VAT-outside model |
| Proper Corn, Ex. VAT | ✓ Subtotal £21,711.90 / fee £0.00 / grand £21,711.90 / VAT £1,015.60 — **exactly AU's original figures**, confirming the old model was equivalent to what is now the Ex. VAT basis |
| Proper Corn, both lenses, both bases | ✓ all four agree with the corresponding Departments/BBC figure above |
| refresh — seeded budget and toggle state | ✓ 82 lines / 10 sections survive; VAT toggle resets to checked (Inc. VAT default) — session state only, not persisted, exactly like T-6's own toggle |
| `db:crew` untouched throughout | ✓ 88 records, md5 `8e1989…be28`, `updated_at` unmoved, before and after seeding |
| every existing screen still loads | ✓ Welcome, Crew db, Locations db, Settings, T-1…T-7 (T-6's four views + its own VAT toggle + filter, unchanged), T-2's five grids, B-1 × 5 projects (4 real + Proper Corn) × 2 lenses × 2 VAT bases — no console errors |
| dead references to the removed VAT-outside handling | ✓ none — `grep` for "VAT is excluded"/"VAT sits outside"/"outside the arithmetic" in `index.html` returns nothing |

### Verified (Phase AX), driven through the live page against the real Supabase

| check | result |
|---|---|
| inline script extracts and parses | ✓ `node --check` clean |
| CSS brace balance | ✓ 463 open / 463 close |
| dead references to the removed B-1 project `<select>` / renamed sidebar handlers | ✓ none — `grep` for `bdmProject`/`setBudgetDemoProject`/`budgetDemoProjectId`/`bdm-proj-row`/the old `side-label">Project<` returns nothing |
| `db:crew` untouched | ✓ 88 records, md5 `8e1989859a1a5153ff03ba137e11be28` (matches AV/AW exactly), `updated_at` unmoved since before this session |
| ROW 2026, Inc. VAT basis, unchanged | ✓ Subtotal £318,668.31 / Production fee £31,866.83 / Grand total £350,535.14 / VAT £26,354.20 — 82 lines / 10 sections, exact match to AW |
| switch project with Budget open | ✓ project changes, `route.screen` stays `'budget'` (verified ROW → Fashion Files London: figures switch to Fashion Files' empty budget, VIEW does not reset) |
| switch view with a project open | ✓ Production → Budget → Production: `currentProjectId`/`currentProjectTab` unchanged throughout |
| rapid + concurrent stress (the `bdmEnsureLoaded()` risk, §4) | ✓ two rounds against the live Supabase project: (1) cache cleared for 3 projects, 9 back-to-back `goBudgetDemo()`/`openProject()`/`goProduction()` calls with no waits between them; (2) cache cleared, 30 rapid alternating view/project switches. Both rounds: tab settled on the correct final project + view, no stuck "Loading budget…", `bdmLoading` empty afterwards, zero thrown errors |
| no empty state on load | ✓ fresh page load opens straight into Production on the last-viewed project (ROW 2026 London), no Welcome screen |
| refresh — remembered project reopens | ✓ confirmed after the stress tests above, which changed which project was most-recently-opened; a subsequent fresh load followed it |
| empty-budget state, Fashion Files and LMAOF | ✓ both show £0.00 throughout, 5%/10% defaults, "+ Add section" reachable |
| every existing screen still loads | ✓ Welcome (via `goDatabase`), Crew db, Locations db, Settings, T-1…T-7 (T-6's four views + filter + VAT toggle unchanged), B-1 — no console errors from any of this phase's code |
| sidebar at 375px | ✓ VIEWS (Production, Budget) at top, then Databases/Projects/App, no layout breakage; page-level `scrollWidth===clientWidth` on the Budget screen (no horizontal overflow) |
| stray writes from testing | ✓ `budget:*` keys in storage still exactly the pre-existing two (`id_msc4nv2c0g178`, `bdm-proper-corn-hot-sauce`) — rapid switching never auto-created a budget record for LMAOF/Fashion Files |
| unrelated console noise seen during the heaviest stress round | "Supabase save gave up after repeated conflicts (db:projects)" — the app's pre-existing optimistic-concurrency retry/merge path (see `saveDB()`), exhausted by ~30 same-key writes fired faster than any real click stream plus a second live session on the same Supabase project; not a hang, not data loss (`db:projects` count and content verified intact after), and not code this phase touched |

### Verified (Gate 1), driven through the live page against the real Supabase

Light consistency pass following AU/AV/AW/AX — dead-code sweep, Proper Corn's
navigation fix, the 1320px width rule documented, a design-system light pass. No
behaviour changed except the one navigation fix (Proper Corn reachable again).

| check | result |
|---|---|
| inline script extracts and parses | ✓ `node --check` clean |
| CSS brace balance | ✓ 462 open / 462 close (one fewer pair than AX's 463 — `.bdm-sec-total` removed, see below) |
| genuinely dead code found and removed | ✓ one: the CSS selector `.bdm-sec-total` (line ~656) — defined but never referenced by any rendered markup; the section total it once styled is now the `.status`/`<strong id="bdm-secttl-…">` pair in `budgetDemoSectionHTML()`'s foot row |
| dead `bdm*`/`budgetDemo*` functions | ✓ none — every one of the ~48 functions in the B-1 block has at least one call site outside its own definition |
| `IRL London 2026` / `BUDGET_DEMO_DATA` and siblings | ✓ no surviving references (comment-only mentions saying they're gone) |
| the removed B-1 project `<select>` / old sidebar handlers | ✓ no surviving references |
| "VAT sits outside" wording or logic | ✓ none — `budgetDemoLineMath()`'s `total = net + (bdmVatToggle ? vat : 0)` is the AW-corrected formula, no dead branch beside it |
| commented-out code blocks from AU–AX | ✓ none found in the B-1 region |
| `db:crew` untouched | ✓ 88 records, md5 `8e1989859a1a5153ff03ba137e11be28` (matches AV/AW/AX exactly), `updated_at` unmoved |
| ROW 2026, Inc. VAT basis, unchanged | ✓ Subtotal £318,668.31 / Production fee £31,866.83 / Grand total £350,535.14 / VAT £26,354.20; all eight department totals unchanged (SET £96,996.90 / PROD £64,829.10 / CIN £45,355.35 / CAT/TRA £33,425.34 / GRIP £24,987.69 / EQUIP £23,520.42 / AUD £16,419.06 / HMU £13,134.45) |
| VAT toggle, ROW, both bases | ✓ Inc. VAT → Ex. VAT gives exactly £291,178.58 / £29,117.86 / £320,296.44, VAT reference unchanged at £26,354.20 |
| **Proper Corn added to `projectsDB`** (id `bdm-proper-corn-hot-sauce`, title "Proper Corn Hot Sauce (demo)") | ✓ one `db:projects` write, verified by direct read afterward: 3 → 4 records; the existing `budget:bdm-proper-corn-hot-sauce` record was not touched, reseeded or read from `BDM_PROPER_CORN_SEED` again (still 15 lines / 7 sections / 5% float / 0% fee, unchanged) |
| Proper Corn opens from the sidebar | ✓ appears in PROJECTS, sorted by `startDate` like any other project, opens Production (Overview) normally |
| Proper Corn's Budget renders its POST section | ✓ its own 8-column post phaseSet (PreProd/Assembly/PreV1/V1 Feedback/PreV2/V2 Feedback/Delivery/Buyout) — the only place in the app this renders; figures exactly match AW's table: Subtotal £22,778.28 / fee £0.00 / grand £22,778.28 / VAT £1,015.60, all seven department totals sum to the subtotal exactly |
| `.main:has(#bdmTopSheet)` still scoped to B-1 alone | ✓ `#bdmTopSheet` set nowhere but `renderBudgetDemo()`; live-measured `.main` max-width is 1320px on Budget and 840px on every other screen checked (Production/Overview) — ⚠️ **superseded at the next Gate 1 pass below: this rule and both figures are gone, replaced by one 1188px container everywhere** |
| other screens' tables vs. the 1320px rule | ✓ every table besides B-1's line table sits on `.tablewrap table`'s default 520px min-width, including T-6 Budget's three rollup tables — nothing else currently needs the exception — ⚠️ **the 1320px half of this is superseded too, see below** |
| Production tabs (Tech, Shoot Days, T-6 Budget's 4 views + Itemize VAT + filter, Preview & Export) | ✓ all load and render, no console errors |
| both databases (Crew, Locations) + their filter panels | ✓ load and render, no console errors |
| Settings (fonts, brand colours, preview, budget codes & rules, ROW seed action) | ✓ loads and renders, no console errors |
| project/view switching, all four projects × both views | ✓ no hangs, no stuck "Loading budget…", figures update correctly each time, including the newly-added Proper Corn |
| 375px, Production and Budget screens | ✓ `scrollWidth===clientWidth` (375===375) on both — no page-level horizontal overflow; B-1's line/summary tables scroll inside their own `.tablewrap` as designed |
| design-system light pass over Budget (B-1) | ✓ no drift found beyond the one dead CSS rule above — Pattern A headings, the Label family, ruled-line fields, `.ts-grid`/`.ts-field`, `.budget-summary`/`.budget-stat`/`.budget-total-row`, and the two-greens rule are all the same shared classes the rest of the app uses, not local reimplementations |

### Verified (Gate 1, Part One — cosmetic changes), driven through the live page against the real Supabase

A second Gate 1 pass, same threshold, combining the tidy items above with a set of
layout/labelling changes: the VIEWS control relocated from the sidebar into the
project header, T-6 relabelled COSTS, one 1188px landscape container everywhere
(superseding the 1320px exception above), B-1's line-detail row separators removed,
and its Item column widened. No budget figure, calculation or VAT logic touched.

| check | result |
|---|---|
| inline script extracts and parses | ✓ `node --check` clean |
| CSS brace balance | ✓ 466 open / 466 close |
| dead references: old `data-side="production"`/`"budget"`, `840px`, `1320` (as a live rule, not a comment) | ✓ none — sidebar VIEWS markup gone, `renderSide()`'s two dead active-toggle clauses removed, `.main:has(#bdmTopSheet)` rule deleted |
| `db:crew` untouched | ✓ 88 records, md5 `8e1989859a1a5153ff03ba137e11be28` (matches every prior phase), `updated_at` unmoved |
| ROW 2026, Inc. VAT basis, unchanged | ✓ Subtotal £318,668.31 / Production fee £31,866.83 / Grand total £350,535.14 / VAT £26,354.20; all eight department totals unchanged |
| VAT toggle, ROW, both bases | ✓ Inc. VAT → Ex. VAT gives exactly £291,178.58 / £29,117.86 / £320,296.44, VAT reference unchanged at £26,354.20 |
| Proper Corn, Inc. VAT | ✓ Subtotal £22,778.28 / fee £0.00 / grand £22,778.28 / VAT £1,015.60 — unchanged; budget record untouched (`updated_at` unmoved) |
| `.main` width, every screen | ✓ live-measured 1188px on all of: Production's seven tabs (Overview/Crew/Locations/Tech/Shoot Days/Costs/Preview & Export), T-6 Costs' four sub-views (Per Department/Per Day/Per Person/Costs), both databases, Settings, and B-1 Budget — no page-level horizontal overflow (`scrollWidth===clientWidth`) at 1280px, 1920px or 375px |
| B-1 line-detail table vs. the new 1188px container | ✓ does NOT fit at 1188px (table's own `min-width` is 1230px/1490px) — scrolls horizontally inside its own `.tablewrap`, page itself never overflows; this is the expected, by-design outcome, not a regression |
| Item column truncation | ✓ fixed without the container change — "Field Producer on Set" and "Production Coordinator" (previously clipped to ~20 characters) now render in full at 220px min-width |
| view switcher, both directions, project open throughout | ✓ clicked BUDGET → PRODUCTION → BUDGET on the same project (instant, no hang); clicked a different project (Proper Corn) while Budget was already open (the exact `bdmEnsureLoaded()` case AV flagged) — instant switch, correct data, no stuck "Loading budget…" |
| Proper Corn opens from the sidebar and renders its POST section | ✓ appears in PROJECTS; opens Production normally; Budget shows its own 8-column post phaseSet (PreProd/Assembly/PreV1/V1 Feedback/PreV2/V2 Feedback/Delivery/Buyout), figures unchanged |
| remembered project reopens on refresh | ✓ confirmed after the switching above |
| 375px | ✓ view switcher wraps below the title (`.page-head`'s `flex-wrap`) rather than overflowing; no page-level horizontal overflow on Production or Budget |
| design-system pass over the new/changed CSS | ✓ no new colours or fonts — `.page-head-titles`/`.view-switcher` are layout-only wrappers, the switcher reuses `.tabs`/`.tab`/`.tab.active` verbatim, the Item/Notes/pill-select width changes are the same "width or alignment" territory the rest of B-1's CSS already occupies |

### Verified (Phase AY-a), driven through the live page against the real Supabase

**The first phase in this sequence that writes to `db:crew`.** A backup was taken
before any other work: `db:crew_backup_pre_AY_2026-08-08`, 88 records, md5
`8e1989859a1a5153ff03ba137e11be28` — identical to the live row, whose `updated_at` was
unmoved by the backup. `budget:id_msc4nv2c0g178_backup_pre_AY` was taken too, before
the live linking tests.

| check | result |
|---|---|
| backup key exists, 88 records, before anything else | ✓ md5 identical to `db:crew`, source `updated_at` unmoved |
| inline script extracts and parses | ✓ `node --check` clean |
| CSS brace balance | ✓ 480 open / 480 close (was 466 at Gate 1; AY-a added 14 pairs) |
| orphan sweep over all 32 new identifiers | ✓ every one has a call site outside its own definition |
| new CSS classes | ✓ all 13 have both a rule and a render site; none defined-but-unused, none used-but-unstyled |
| **`db:crew` changed ONLY in these ways** | ✓ SQL-diffed backup vs live: **2 added** (both deliberately added by the tests below), **0 removed**, **0 existing records changed**, **37 distinct field names before and after** — no field added, removed or renamed |
| record count | 88 → 90 (two test people deliberately added) → **restored to 88**, md5 back to `8e1989859a1a5153ff03ba137e11be28`, the exact hash carried since AV |
| `db:projects` after testing | ✓ ROW back to 66 `crewIds`, **0 dangling crew references** across all four projects |
| ROW 2026 totals, Inc. VAT, before any linking | ✓ £318,668.31 / £31,866.83 / £350,535.14, VAT £26,354.20 |
| all eight department totals, before any linking | ✓ SET £96,996.90 / PROD £64,829.10 / CIN £45,355.35 / CAT/TRA £33,425.34 / GRIP £24,987.69 / EQUIP £23,520.42 / AUD £16,419.06 / HMU £13,134.45 — unchanged |
| Ex. VAT basis, and 4 consecutive toggle flips | ✓ £291,178.58 / £29,117.86 / £320,296.44, VAT £26,354.20; no drift across flips |
| both lenses still total identically | ✓ Departments £318,668.31 = BBC A–P £318,668.31 |
| **`lineType` migration on ROW** | ✓ 32 service / 50 crew; all 32 read correctly as supplier/venue/buyout/fee, including all four the brief names; **`days` preserved verbatim on all 82 lines** |
| overtime absent on every existing line | ✓ normalises to 0 on all 82, so `daysTotal === scheduled` throughout |
| **link one ROW line to its crew record** (row5 "Field Producer on Set" → Matt Wells) | ✓ rate copied **450 → 450, identical**; VAT copied **0.2 → 0.2, identical**; days auto-filled **Shoot 5 → 6** from his actual Production assignment; name reads through to the crew record |
| **the total does not change if the rates already match** | ✓ the whole £540.00 move was the day auto-fill alone (1 × £450 × 1.2 VAT, this line carries 0% float). Setting the day back to 5 returned the subtotal to **exactly £318,668.31** — the rate/VAT copy contributed £0.00 |
| **change that person's rate in the Crew database → the line must NOT move** | ✓ crew rate £450 → £700: line rate still 450, subtotal still £318,668.31, and ≠ appeared reading "Crew rate is now £700.00" |
| day divergence marker | ✓ "Production has this person on 6 shoot days; this line is budgeted at 5"; the explicit per-line resync cleared it |
| unmappable days (post phaseSet) | ✓ nothing guessed — buckets left `{}` and the line flagged ⚠ with both figures |
| **add a person in Budget → appears in Production and in Crew** | ✓ `db:crew` 88 → 89, ROW roster 66 → 67, line linked, person visible in the project crew list and in the picker |
| **add a person in Production → available in Budget** | ✓ created through the Production commit path, appears in the Budget picker immediately |
| **remove from a project view** | ✓ dialog offers **exactly two** options and never mentions database deletion; says the crew record survives. "Production only": record survives, off roster, off every shoot day, **budget line kept**. "This project entirely" from the Budget: record survives, off roster, **budget lines gone** |
| service line with no person and no days still totals | ✓ qty 0 → £0.00; qty 1 at £2,500 + 20% VAT + 5% float → £3,150.00, contributing exactly that to the subtotal |
| **overtime of 0.5 days costs correctly and creates no shoot day** | ✓ £700 line: net £4,200 → £4,550 (700 × 6.5), subtotal moved by exactly £441.00 (0.5 × 700 × 1.2 × 1.05); `scheduled` stayed 6, the day map was untouched, and the project still had 6 shoot days |
| every existing screen loads at 1188px with 64px margins | ✓ live-measured on all seven Production tabs, T-6's four sub-views, T-2's five grids, both databases, Settings and B-1 — `max-width:1188px`, `padding-left/right:64px`, **no page-level horizontal overflow anywhere**, zero window errors |
| B-1 across every project | ✓ ROW £318,668.31; **Proper Corn £22,778.28 / £0.00 / £22,778.28 / VAT £1,015.60 — exactly AW/Gate 1's figures**, rendering its own 8 post-phase columns plus the new Type and OT columns; LMAOF and Fashion Files £0.00 with 5%/10% defaults and "+ Add section" reachable |
| 375px | ✓ `scrollWidth === clientWidth` (375 === 375) on Budget, Overview and Crew — no page-level overflow; the wide line table scrolls inside its own `.tablewrap` (1636px table in a 926px wrap) |
| **render cost, measured like-for-like against HEAD on the same machine and session** | pre-AY-a **239ms** median / 378KB → AY-a **303ms** / 471KB. **+27%**, the genuine cost of two extra columns per row. The eager picker measured **~1,207ms / 979KB** in the same session — see `bdmFillCrewPicker()` for why it is lazy |

⚠️ **Not done in AY-a, deliberately:** bulk generation of budget lines from the
Production crew and the candidate review screen — **both are now built, in AY-b, below.**
Burn-in on database deletion, the Line Items / Top Sheets restructure, presentation
override layers, pre-production and post views, and any change to the VAT basis or to
an existing budget calculation were all out of scope and none was touched.

### Bulk generation and candidate review (Phase AY-b)

The two things AY-a left. Both sit on AY-a's functions rather than beside them — see
the attach/copy table under **Crew linking** above, which is the split that made it
possible for the accept path to link a line without moving a figure on it.

#### Defaulting section and code from a department

- `bdmMatchKey()` / `bdmMatchScore()` / `bdmBestMatch()` / `bdmCodeForDepartment()` /
  `bdmSectionForDepartment()` — ⚠️ **there is NO department→code table in this app and
  AY-b does not add one.** Both answers are derived by matching the person's DEPARTMENT
  against text that already exists and is already user-editable: the **label of a code**
  in `db:budget_settings` ("Cinematography", "Vanities", "Catering & travel") and the
  **name of a section** on this budget ("Grip", "Set / Venue", "Travel").
  - ⚠️ **Section and code are resolved INDEPENDENTLY and are allowed to disagree.** They
    routinely do on a real sheet — ROW carries a Production Coordinator in the
    Production section coded SET. AY-b makes no attempt to reconcile them; both are
    DEFAULTS, both are shown in the preview before anything is written, and recoding
    afterwards is the normal way this screen is used, not a correction.
  - The one place they meet is a FALLBACK, in each direction: a section that can't be
    found by name is looked up by the `expectedCode` the department resolved to, and a
    department that matches no code (Client, Other) takes the code its section declares
    — the same fallback `addBudgetDemoLine()` already uses. That is reading a section's
    own declared code, not inventing a mapping.
  - ⚠️ `bdmMatchScore()`'s prefix test is on **whole words**, and that is not fussiness:
    measured against ROW's real items, a character-prefix test read "Painters Ladder" as
    the role "PA" and offered a stepladder as a production assistant — [Budget (B-1)]

#### Part 1 — generate lines from the project's crew

- `bdmGen` / `bdmGeneratePlanRows()` / `openBdmGenerateDialog()` /
  `bdmGenerateDialogHTML()` / `toggleBdmGenRow()` / `setBdmGenAll()` /
  `bdmGenRefreshCount()` / `confirmBdmGenerate()` — one line per person on `p.crewIds`.
  - ⚠️ **NOTHING IS WRITTEN UNTIL THE PREVIEW IS CONFIRMED.** `confirmBdmGenerate()` is
    the only write in Part 1; everything before it is read-only and safe to cancel. A
    `confirm()` was not an option: it cannot say "these three have no rate on file and
    this one's days can't be mapped".
  - ⚠️ **NO DUPLICATES, EVER.** Anyone already carried by a line on this budget is
    absent from the plan, not unticked — and the guard is re-tested against the record
    as it stands at confirm time, in case the picker linked somebody while the dialog
    was open.
  - The two flagged cases are **shown, not fixed**: no rate on the crew record (the line
    is created at £0 and the rate is typed on it) and days that can't be mapped because
    the section is on the post phaseSet (buckets left at zero, line wears ⚠). Neither is
    silently zeroed and neither is excluded — the user decides with both figures visible.
  - Generated lines are **spliced in after the last line of their own section**, not
    pushed at the end of the record.
  - `bdmGen` is held **outside the DOM** for the reason `aiScanDraftText` documents; a
    tick must not be lost to a re-render — [Budget (B-1), Crew, Shoot Days]

#### Part 2 — the candidate review screen

- `bdmCanonicalRoles()` / `bdmRoleMatchFor()` / `BDM_COMPANY_TOKENS` /
  `bdmNameLooksPersonal()` / `bdmExistingCrewByName()` / `bdmCandidates()` — the scan.
  ⚠️ **It reads ALL 82 lines, not the 50 typed `crew`.** A freelancer invoicing through
  their own company sits on a service line, and that is the person most likely to be
  missing from the database. Already-linked lines are not candidates — there is nothing
  to suggest.
  - Three signals, combined, each reported on the row that fired it: the **item** is (or
    is close to) a saved canonical role; the **name** reads as a person; the line has
    **days and a rate** rather than a bare quantity.
  - ⚠️ **The name test is a GATE, not a third vote.** The brief's Ltd/Limited/LLP/&/
    Hire/Rentals/Services are decisive on real data, not suggestive: "Prevent Security"
    against the item "Security" scores a role match AND has a rate. Four rejections,
    all documented on `bdmNameLooksPersonal()`: a company token; the name IS the item
    ("ORGAN FACTORY"/"ORGAN FACTORY"); the name overlaps the item ("Greenkit"/"Greenkit
    Rental"); the name is a section or a code on this very budget ("SET", "Travel").
  - ⚠️ **Deliberately NOT tested: how many words the name has.** Sid, Sam, Jojo, Amrita,
    Hana, Isha and Brian are all one word and all real people on ROW; Beazley and
    Greenkit are one word and neither is. A word count cannot tell them apart.
  - ⚠️ **A crew line needs the gate plus one more signal; a SERVICE line needs the gate
    alone.** A service line carries a bare quantity by definition, so the DAYS signal
    can never fire on one — requiring two there would systematically exclude exactly the
    population Part 2 exists to find. Measured on ROW it is the difference between
    finding one such person and three. The price is a few suppliers in the list, which
    is why that group is **separate, collapsed and labelled less likely** rather than
    filtered harder.
- `bdmCandidatesOpen` / `bdmCandidateServiceOpen` / `toggleBdmCandidates()` /
  `toggleBdmCandidateService()` / `bdmCandidatesPanelHTML()` / `bdmCandidatesTableHTML()`
  / `bdmCandidateRowHTML()` — the panel, rendered into the Budget screen body rather
  than `#globalOverlay`: accepting a row opens a dialog, and a dialog on top of a dialog
  is not a review screen. ⚠️ **The SCAN runs on every render** (its count is the whole
  affordance) but the **panel only builds when open** — 5.3ms vs ~60ms.
- `dismissBdmCandidate()` / `restoreBdmCandidates()` — ⚠️ **dismissals PERSIST**, as
  `rec.dismissedCandidates` in `budget:<projectId>`, normalised in
  `bdmNormalizeRecord()` the same "normalise on read, land on next save" way `lineType`
  is. A suggestion that has been considered and rejected must not come back every visit.
  Stored as line ids, so a dismissed line that is later deleted stops matching anything.
  "Show them again" clears the list — [Budget (B-1)]

#### Accepting a candidate

- `bdmAcceptCandidate()` / `bdmFinishAcceptCandidate()` — ⚠️ **ACCEPTING MUST NOT MOVE A
  FIGURE ON THE LINE.** The copy runs the OPPOSITE way here: the LINE's rate becomes the
  new crew record's rate, and its VAT becomes their VAT status. Two endings:
  - **already in the database** (the name is exactly one existing record's) — LINK, and
    nothing else. ⚠️ This branch is not in the brief and is not optional: **27 of ROW's
    82 lines name somebody already in `db:crew`**, and by the brief's definition they
    are all candidates because none is linked. Creating from them would have made a
    second Matt Wells. No copy runs in either direction — the line keeps its rate, the
    person keeps theirs, and the ≠ marker says so if they differ, which is what that
    marker is for. Exact, trimmed, case-insensitive only; where two records share a name
    it deliberately falls back to the create flow rather than guessing.
  - **not in the database** — the add-person dialog in `'accept'` mode. ⚠️ **Phase R
    forbids free-text roles, so the line's `item` string is NEVER written to `c.role`.**
    An exact role match pre-selects the department and role; anything less leaves the
    picker empty and the record cannot be created until one is chosen.
  - ⚠️ Both endings finish through `bdmAttachCrewToLine()`, **not** `bdmCopyCrewToLine()`
    — see the attach/copy table above for what the copy would have destroyed.
- `bdmAddPerson` gained `mode` (`'link'` | `'accept'`) and `seed` — ⚠️ **a second MODE,
  not a second dialog**: both flows ask for exactly the same three things, and only the
  hint text, the button label and the last three lines of `confirmBdmAddPerson()`
  differ. `addNewCrewFromProposal()` gained an optional 5th argument, `extra`, so the
  record is still created in ONE write through AY-a's one commit path — the rate and VAT
  seeded from the line land with it, which is why the ≠ marker has nothing to report the
  moment the record exists. Its other three callers pass nothing and are unchanged —
  [Budget (B-1), Crew]

### Verified (Phase AY-b), driven through the live page against the real Supabase

**Backups taken before any write**: `db:crew_backup_pre_AYb_2026-08-08` (88 records),
`db:projects_backup_pre_AYb_2026-08-08` (4), `backup:budget_row_pre_AYb_2026-08-08` —
each verified byte-identical to its source with the source's `updated_at` unmoved.

⚠️ **Every write test ran on a SCRATCH PROJECT** (`ayb-scratch-project`), whose crew
were five **existing** `db:crew` records chosen to cover the awkward cases — a rate on
file and none, VAT registered and not, a Client department that matches no code, a Post
Production person on a shoot day so the ⚠ unmappable case was real. **ROW's budget key
was never written**; its `updated_at` is unmoved.

| check | result |
|---|---|
| inline script extracts and parses | ✓ `node --check` clean |
| CSS brace balance | ✓ 495 open / 495 close (was 480 at AY-a; AY-b added 15 pairs) |
| orphan sweep over all 33 new identifiers | ✓ every one has a call site outside its own definition |
| new CSS classes | ✓ all 13 have both a rule and a render site |
| **ROW 2026 totals, Inc. VAT** | ✓ **£318,668.31 / £31,866.83 / £350,535.14**, VAT £26,354.20 |
| all eight department codes | ✓ SET £96,996.90 / PROD £64,829.10 / CIN £45,355.35 / CAT/TRA £33,425.34 / GRIP £24,987.69 / EQUIP £23,520.42 / AUD £16,419.06 / HMU £13,134.45 — unchanged |
| Ex. VAT basis | ✓ £291,178.58 / £29,117.86 / £320,296.44, VAT £26,354.20 — exactly AY-a's figures |
| **Proper Corn** | ✓ **£22,778.28** / £0.00 / £22,778.28, VAT £1,015.60 — unchanged |
| LMAOF, Fashion Files | ✓ £0.00, no candidates, no errors |
| **`db:crew` at the end of the session** | ✓ **88 records, md5 `1bab00732d024117b36ca2d3134318ec`** — byte-identical to the pre-session backup AND to `db:crew_backup_pre_AY_2026-08-08`. 88 → 90 during the accept tests (two deliberate creations), then restored |
| `db:projects` / `db:shootdays` at the end | ✓ both byte-identical to their session-start values; scratch project and its 3 shoot days gone |
| **generation plan, all five fixture people** | ✓ Cinematography→Cinematography/CIN, Production→Production/PROD, **Client→Production/PROD (no code match, falls back to the section's own code)**, **Post Production→Post-production/POST flagged ⚠ 1 unmapped**, three flagged "no rate on file" |
| **nothing is written until confirm** | ✓ opening and cancelling the dialog left 0 lines; unticking one person created 4 of 5 |
| **the copy is AY-a's copy** | ✓ item←position, rate 800/700 via `resolveCrewRate()`, VAT 0.2 only for the registered person, days Shoot 3/3/1 from Production, `lineType:'crew'` |
| **unmappable days are not guessed** | ✓ the post-section line's `days` is `{}`, not `{Shoot:1}`, and the line wears ⚠ |
| **no duplicates** | ✓ reopening the dialog offered only the one person left unticked |
| lines land in their own section | ✓ array order `sc-cam, sc-shoot, sc-shoot, sc-post` |
| **candidate scan on ROW's real 82 lines** | ✓ 41 crew-typed + 10 service-typed; **31 lines rejected by the name gate**, each with its reason; the 4 the brief names (Greenkit, Organ Factory, Travel Buyout, Per Diems) all rejected or in the collapsed group |
| service group starts collapsed | ✓ "▸ ON SERVICE LINES — LESS LIKELY (10)" |
| **accept an existing person → figures must not move** | ✓ Heather Bradley: crew rate £250 vs line rate £300, 0 shoot days vs the line's 4. After Link: **rate still 300, days still `{Shoot:4}`, total still £1,260.00, subtotal still £18,874.80**, crew record untouched, roster untouched, count still 88 |
| **accept a new person, exact role match** | ✓ role picker pre-selected **Grip / Gaffer** from the item text; record created with `role:'Gaffer'`, `roles:['Grip/Gaffer']`, `rate:'668'`, `vatRegistered:'Yes'` — all seeded FROM the line; **line rate/days/VAT/total unchanged, subtotal unchanged**; no ≠ marker |
| **accept a new person, NO exact match** | ✓ nothing pre-selected; confirming refused ("Pick a department."), no record created; after choosing **Grip / Rigger** the record carries `role:'Rigger'` — **NOT the line's item text "Spark Load"**, and `ROLES_BY_DEPT` was not polluted with it |
| dismissal persists | ✓ stored as `dismissedCandidates` in `budget:<projectId>`, still dismissed after a full reload; "1 dismissed on this budget / Show them again" |
| **render cost, measured like-for-like against HEAD in the same session** | HEAD **216–238ms** median → AY-b **229ms**, panel closed. **Inside the noise.** The scan itself is **5.3ms**; opening the panel costs ~60ms and both groups ~110ms while on screen, which is opt-in |
| eager picker rule still held | ✓ neither new screen builds a `<select>` per row |
| 375px | ✓ `scrollWidth === clientWidth` (375 === 375) with the panel open, both groups expanded, and with the preview dialog open (343px box) |
| window errors | ✓ zero, across all four projects |

⚠️ **One artefact left behind, deliberately declared:** the key
`budget:ayb-scratch-project` still exists in `app_data` — the publishable key's policy
allows the DELETE statement but matches no rows, so it could not be removed from here.
It has been **blanked** (no sections, no lines) and is inert: `bdmEnsureLoaded()` is
only ever called with the id of a project that exists in `db:projects`, and that project
is gone. Delete it from the Supabase dashboard when convenient.

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
  - ⚠️ **Since Phase AV `isObjDB()` is no longer just `DB_OBJECT_KEYS.includes(key)`.**
    `budget:<projectId>` is the first key family whose members aren't known ahead of
    time (one per project), so it also matches `BUDGET_KEY_PREFIX`. `dbKeyLabel()`
    exists for the same reason — the save-failure banner can't look those keys up in
    `DB_KEY_LABELS`, so it names the project instead. See **Budget (B-1)** — [Shared/utility functions, Budget (B-1)]
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
- `rolesTagListHTML()` / `roleAddPickerHTML()` / `addRoleToCrew()` / `removeRoleFromCrew()` / `setActiveRole()` — render and manage a crew member's multiple assignable roles. `setActiveRole()` is the sole place a crew member's `department`/`subDepartment` are ever set — always derived from whichever saved role just became active, never typed directly. `removeRoleFromCrew()` refuses to remove a person's last remaining role, and re-activates a replacement if the removed one was active — [Shared/utility functions]
- `pendingNewCrewRole` / `newCrewRolePickerHTML()` / `onNewCrewRolePick()` — single-role picker for a brand-new, not-yet-saved crew member (no id yet to attach a saved role to) — stashed here until `saveCrew()` creates the record with it — [Shared/utility functions]
- `addRoleDialogFor` / `openAddRoleDialog()` / `closeAddRoleDialog()` / `addRoleDialogHTML()` / `confirmAddRoleDialog()` / `renderGlobalOverlay()` — the "Add new role" dialog (Phase R item 5): one in-page dialog (Department select + Role name) rendered into the persistent `#globalOverlay` div outside `#main`, replacing the old two-`prompt()` flow. Adds straight onto a crew id, or (when opened as `'__new__'`) feeds `pendingNewCrewRole` for the not-yet-saved crew form — [Shared/utility functions]
- `duplicateCrew()` — clones a crew record as a starting point for a new one — [Shared/utility functions]
- `coProPillSelect()` / `quickSetCoPro()` / `coProCompaniesList` — render and update a crew member's co-production company assignment — [Shared/utility functions]
- `crewIdentityHTML()` / `deptLabelHTML()` / `posnIdentityHTML()` / `crewExpansionHTML()` — shared rendering helpers for how a crew member's identity/role/department are displayed across tabs. `crewIdentityHTML()`'s department badge is always the read-only `deptLabelHTML()` now (no more editable department pill — see Phase R item 1). `opts.hideDept` / `opts.hideLeadPill` suppress the department badge / Lead Company pill (used by Days on site/Hotel/Travel/Catering — Phase S item 6; the Roles tab doesn't use this function at all any more, see `crewRolesRowHTML`). `opts.showAsOrRole` displays `c.showAs||c.role` instead of the raw role (Phase S item 8 — those same four tabs are display-only for role, editing only ever happens on the Roles tab) — [Shared/utility functions]
- `appSettings` / `SETTINGS_DEFAULTS` / `FONT_CHOICES` (**renamed from `HEADER_FONTS` in Phase R/R15** — it now feeds all three font roles, not just headings) / `TINT_ALPHAS` / `hexToRgbTriple()` / `applyAppSettings()` / `setSetting()` / `previewSetting()` / `saveAppSettings()` / `resetAppSettings()` (Phase Q) — the app's configurable header font and brand colours, plus (Phase Tasks) the three Overview auto-flag rule toggles (`flagNoLocation`/`flagNoCrew`/`flagNoDayRate`) — same object, same persistence, just not all of it is styling. Persisted to `db:settings` (an object key, so it's in `loadDB`'s `isObjKey` list alongside `db:subdepartments`/`db:roleseniority`). `applyAppSettings()` works by writing the SAME custom properties the stylesheet already declares in `:root` — `--disp`, `--tape`, `--tape-light` and all six `--tint-N`, the last derived from the brand hex — onto `documentElement`, so no CSS rule needs to know settings exist. `previewSetting()` applies without saving: the colour picker fires `oninput` continuously while dragging, and one Supabase write per hue is not a trade worth making — `onchange` calls `setSetting()` to persist. Only families already in the Google Fonts `<link>` (plus two system stacks) may be added to `HEADER_FONTS` — [Shared/utility functions]
- `renderSettings()` / `goSettings()` (Phase Q) — the Settings screen (S-1), reached from the sidebar. A full screen, not a floating cog panel: the app's one existing pattern for a project-independent thing you go and look at is the sidebar screen (Crew database, Locations database), and a modal would have been a second pattern for no gain — [Shared/utility functions]
- `renderSide()` — renders the left sidebar (VIEWS/Databases/Projects/App nav, project list) — [Shared/utility functions]
  - ⚠️ **Phase AX widened the active-item check to `route.screen==='project'&&el.dataset.side==='production'`**, alongside the existing `budget` check — Production and Budget are siblings now (see **Sidebar & navigation — VIEWS**), so both light up their own nav item while leaving the project list's own highlight (`route.screen==='project'||route.screen==='budget'`) exactly as it already was.
- `initApp()` (Phase AX addition) — after loading and any first-run seed, calls `goProduction()` instead of leaving `route` at its `{screen:'welcome'}` default, whenever `projectsDB.length` — see **No empty state** below — [Shared/utility functions]
- `toggleDrawer()` / `closeDrawer()` — open/close the mobile navigation drawer — [Shared/utility functions]
- `setTopbarTitle()` — updates the mobile top bar's title text — [Shared/utility functions]
- `goDatabase()` / `goNewProject()` / `openProject()` / `goProjectTab()` — top-level router functions that change `route`/`currentProjectId`/`currentProjectTab` and re-render. `openProject()` also stamps that project's `lastOpenedAt` (Phase Y, `Date.now()`) and saves it — the signal `mostRecentProject()` reads for the Welcome screen's "Recent" button and (Phase AX) the no-empty-state boot sequence. ⚠️ **Since Phase AX, `openProject()` no longer unconditionally forces `route={screen:'project'}`**: project and view are independent axes now, so if `route.screen==='budget'` when a project is picked from the sidebar list, the route (and `currentProjectTab`) are left alone — only `currentProjectId` changes, and the open Budget screen just starts rendering the newly-picked project. From anywhere else (a database, Settings, Welcome, New project) it still lands in Production with the tab reset to Overview, same as before — [Shared/utility functions, Overview, Budget (B-1)]
- `goProduction()` (Phase AX) — the sidebar's other VIEW, alongside `goBudgetDemo()`: switches to the project workspace (`route={screen:'project'}`) **without touching `currentProjectId`/`currentProjectTab`** when a valid project is already open — the direct counterpart to `openProject()` leaving `route` alone when already on Budget. Only touches `currentProjectId` as a fallback (via `mostRecentProject()`) when nothing valid is open yet, and even then never stamps `lastOpenedAt` — viewing isn't the same action as picking a project. See **Sidebar & navigation — VIEWS** above — [Shared/utility functions, Overview, Budget (B-1)]
- `renderMain()` — dispatches the main panel render based on the current route — [Shared/utility functions]
- `projCode()` — derives a project's short display code — [Shared/utility functions]
- `fmtDate()` — formats an ISO date string as a human-readable date — [Shared/utility functions]
- `renderCrewDatabase()` / `renderCrewList()` / `crewSearchBlob()` / `crewCardHTML()` — render the standalone crew database screen, its filtered list, and its search index/card markup. `crewSearchBlob()` includes `c.showAs` so the cosmetic override is searchable too — [Crew, Shared/utility functions]
- `toggleDeptCollapse()` / `setAllDeptsCollapsed()` — collapse/expand department groups in the crew database list — [Crew]
- `toggleProjectDeptCollapse()` / `setAllProjectDeptsCollapsed()` — the same, for the project Crew tab's groups — [Crew]
- `crewFormHTML()` / `toggleCarFields()` — render the add/edit crew form and react to "has car" toggling. No more free-text Role or manual Department field (Phase R item 1/follow-up): existing crew (`c.id` set) get the live saved-roles tag-list editor; a brand-new crew member gets `newCrewRolePickerHTML()` instead, required to save. Also has the new "Show as" text field. Since Phase AG, the Private section's Fee/rate row also carries a "Day rate (this project)" field next to it, when-and-only-when this form is opened from within a project for an existing crew member (`c.id` set AND `currentProject()` resolves — false on the standalone Crew database screen, which shares this same function but has no project) — same `p.crewRateOverrides`/`resolveCrewRate()`/`saveCrewRateOverride()` field as the Roles row and Budget's Per Person view, with its own `crewRateSaveIconHTML()` Save icon (context `'e'`), not a second copy of the override — [Crew]
- `refreshCrewScreen()` / `toggleCrewForm()` / `closeCrewForm()` / `editCrew()` / `toggleCrewView()` / `crewViewHTML()` — manage opening/closing/viewing the crew form and read-only crew detail view. `toggleCrewForm()`/`closeCrewForm()` reset `pendingNewCrewRole` when the new-crew form opens/closes. Since Phase AS (**G18**) `toggleCrewForm()` also scrolls `#crewFormWrap` into view on open — the form was never missing, it opened ~600px below the fold because the button is the last element on a 12,400px page. `#crewFormWrap` is shared by both render sites (crew database and the project Crew tab); only one is in the DOM at a time, same precedent as `#locFormWrap`. ⚠️ It picks `behavior` rather than hard-coding `'smooth'` like `editLocation()`/`startNewLocationFromSearch()` do: **under `prefers-reduced-motion: reduce` this browser does not scroll at all with `behavior:'smooth'`** (measured — scrollY never moved over 3.6s, while `'auto'` landed the form correctly). The two Locations call sites still hard-code `'smooth'` and carry the same latent hole — logged, not fixed here — [Crew]
- `saveCrew()` — persist a crew record. Refuses to create a brand-new crew member without `pendingNewCrewRole` set ("every crew member needs at least one saved role"); for a new record, role/department/`roles` are derived entirely from that pick. For an existing record, role/department/`roles` are left untouched (they're managed live by `addRoleToCrew`/`setActiveRole` elsewhere, not by this form) — [Crew]
- `deleteCrew()` / `crewUsageSummary()` (**Phase AY-a**) — delete a crew record. ⚠️ The
  warning now **states exactly what is affected, with counts** — "Alishia Shaw is used
  in 3 projects (…) and 4 budget lines" — before the confirm. This is the one place in
  the app that deletes a person from the shared database, and "this may affect budgets"
  is not something anybody can act on. `crewUsageSummary()` loads every project's budget
  record to count, because `budget:<projectId>` keys are on-demand and normally absent
  on this screen; that is a handful of reads at the moment of a deliberate destructive
  action, not on render. It builds ONE list so the count and the names it prints can't
  disagree — a project can hold someone in Production, in its budget, or both, and a
  Production-only count would miss a project that carries only budget lines for them.
  - ⚠️ **AY-a builds the WARNING ONLY.** What happens to those lines afterwards —
    burning the person's details into them so the figures survive — is a later phase and
    was explicitly out of scope. Today the lines keep their `crewId` and every reader
    already copes: `bdmLineName()` falls back to the line's stored name, and
    `bdmRateDriftFlag()`/`bdmDayDriftFlag()` return nothing when the record has gone. No
    figure changes — [Crew, Budget (B-1)]
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
| T-2.1 | · Roles | Name / Role / Department / Show as, one tidy row per person | `crewRolesRowHTML()` |
| T-2.2 | · Days on site | Person × day checkbox matrix | `crewAssignRowHTML()` |
| T-2.3 | · Hotel | Person × night matrix, incl. the night before Day 1, with a collapsible hotel summary (room-booking table, per-night table — Phase O) below it | `hotelSummaryHTML()` / `toggleHotelNight()` / `toggleHotelPre()` |
| T-2.4 | · Travel | One travel method per person per project, with a collapsible transport summary (cost fields + per-day method-count grid with a Daily cost row, derived by crossing travel method against days-on-site — Phase W) below it | `crewTravelRowHTML()` / `transportSummaryHTML()` |
| T-2.5 | · Catering | Breakfast / Lunch / Dinner per person per day, with a collapsible catering summary (cost fields + Breakfast/Lunch/Dinner-by-day grid with a Daily cost row — Phase P2) below it | `crewCateringBlockHTML()` / `cateringSummaryHTML()` |
| T-2.6 | · Filter panel | Departments, roles, lead company, days (OR/AND), exclusions, sort, group-by. Foot row shared with T-6.0/D-1.2 — see **The filter-panel foot** | `projectCrewFilterPanelHTML()` / `filterPanelFootHTML()` |
| T-2.7 | · Bulk select & actions | Select all (filtered), bulk remove, bulk edit lead company | `bulkActionBarHTML()` / `bulkEditPanelHTML()` |
| T-2.8 | · Add from crew database | Department-grouped picker | `addCrewToProject()` |
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
| **T-6** | **Budget** — labelled **COSTS** in the UI since Gate 1 (Part One); code/ids/section-code stay "Budget"/`budget*`, label-only rename | Cost visibility only, rolled up from data already entered on other tabs — not a working budget (Phase Budget) | `renderProjectBudget()` |
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

## B — Budget

A different thing from **T-6**. Reached from the VIEWS switcher in the project header
(Phase AX; moved from its own sidebar section into the header at Gate 1, Part One),
not the project tab strip, and it keeps the open project open behind it. **Phase AV
gave it real storage** — it is no longer a demo, despite the `budgetDemo*` function
names. **Phase AX removed its own project selector** — it now renders whichever
project the sidebar has selected. See the **Budget (B-1)** section above for the three
keys and for SECTIONS vs CODES, and **Sidebar & navigation — VIEWS** for the axis split.

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **B-1** | **Budget** | Line-item budget: you type the lines, every figure is derived, every edit is saved | `renderBudgetDemo()` |
| ~~B-1.1~~ | ~~· Project selector~~ | **Removed in Phase AX.** The screen reads `currentProjectId` directly — see B-1.2 below, which now sits first, right under the header | — |
| B-1.2 | · Project settings strip | Float % / Fee %, project-level, editable, live, autosaved — a line may carry its own float, including 0. Moved out of the content area in Phase AX so the Top sheet is the first thing under the header; VAT (B-1.4) stays a view control, not a project setting, and stays in the top sheet | `setBudgetDemoPercent()` |
| B-1.3 | · Lens toggle | Departments ↔ BBC. Same lines, different grouping and totalling | `setBudgetDemoLens()` |
| B-1.4 | · Top sheet | Rows + £ + % of subtotal + VAT, then Subtotal / Production fee / Grand total, plus the Inc./Ex. VAT toggle (Phase AW, `bdmVatToggle`) — same markup/pattern as T-6's own VAT toggle. ⚠️ Departments totals by CODE, while the line detail below groups by SECTION | `budgetDemoTopSheetHTML()` |
| B-1.5 | · Line detail | Collapsible section per group, one editable row per line, carrying all four information-only markers: ⚑ miscode, ≠ rate drift, ↻ day drift and ⚠ unmappable days. Phase AY-a added the **Type** (Crew/Service) and **OT** columns, renamed Days to **Days / Qty**, and put a crew picker in the Name cell | `budgetDemoSectionHTML()` / `budgetDemoLinesTableHTML()` |
| B-1.6 | · Add section | Phase AV — name + expected code + phase set. The minimum that stops an empty budget being a dead end | `addBudgetDemoSection()` |
| B-1.7 | · Crew link on a line | Phase AY-a — optional per-line picker over the whole crew database, plus "+ Add new person…". Linking copies name, position→item, rate and VAT and fills days from Production; the link stays optional forever for supplier/venue/buyout lines | `bdmCrewPickerHTML()` / `bdmLinkLineToCrew()` |
| B-1.8 | · Add a person from the Budget | Phase AY-a — Name / Department / Role dialog. Creates the crew record AND adds them to the project's Production crew, through the existing `addNewCrewFromProposal()` commit path. Phase AY-b gave it a second **mode** (`'accept'`) rather than a second dialog — same three fields, different ending | `bdmAddPersonDialogHTML()` / `confirmBdmAddPerson()` |
| B-1.9 | · Generate lines from crew | Phase AY-b — one line per person on the project's Production crew, through a **mandatory tick-able preview**: name, role, department, the section and code the line would take, rate and days, with "no rate on file" and "⚠ n unmapped" shown rather than silently zeroed. Anyone already carried by a line is absent from the plan. Nothing is written until confirm | `openBdmGenerateDialog()` / `confirmBdmGenerate()` |
| B-1.10 | · Suggested crew | Phase AY-b — unlinked lines across **all** 82 that read as a person, crew-typed expanded and service-typed in a separate collapsed "less likely" group, each row saying which signals fired. Per-row accept/dismiss, dismissals persisted in `budget:<projectId>`. Accepting links (or creates through the canonical role picker) and **never changes what the line costs** | `bdmCandidatesPanelHTML()` / `bdmAcceptCandidate()` |

## S — Settings

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **S-1** | **Settings** | App-wide font and brand colour, plus the budget codes/rules and the ROW seed action, reached from the sidebar | `renderSettings()` |
| S-1.1 | · Fonts | Phase R/R15 — one picker per role: display/headings, labels, body text | `FONT_CHOICES` |
| S-1.2 | · Brand colours | Brand colour (light backgrounds) + sidebar accent (dark), driving every tint | `applyAppSettings()` |
| S-1.3 | · Preview | A sample call sheet card, so a pick can be judged before it's used | `renderSettings()` |
| S-1.4 | · Company | Read-only `COMPANY`. Deliberately not editable — see the Phase Q section | `COMPANY` |
| S-1.5 | · Budget codes & rules | Phase AV — the codes, the named phase sets and the ordered BBC rules table from `db:budget_settings`, **read only**. Editing them is a later phase; the point is that the rules can be seen | `bdmSettingsTablesHTML()` |
| S-1.6 | · Budget seed data | Phase AV — the one "Seed ROW 2026 budget" action. Reads `budget-seed-row.json` once, warns and confirms if that budget already has lines, then writes | `seedRowBudget()` |

## G — Global chrome

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **G-1** | Sidebar | Databases, Projects (project list + New project), App (Settings). The VIEWS section Phase AX added at the top is gone since Gate 1 (Part One) — see **Sidebar & navigation — VIEWS** | `renderSide()` |
| G-1.1 | · Views (Production/Budget) — MOVED, no longer in the sidebar | Relocated to the project header at Gate 1 (Part One): a `.tabs`/`.tab` switcher, top-right of `.page-head`, rendered by `viewSwitcherHTML()` from both `renderProject()` and `renderBudgetDemo()` | `viewSwitcherHTML()` / `goProduction()` / `goBudgetDemo()` |
| **G-2** | Mobile top bar & drawer | Burger, title, slide-out nav | `toggleDrawer()` / `setTopbarTitle()` |
| **G-3** | Welcome screen | Landing state when no project is open — since Phase AX, only reachable with zero projects in `projectsDB` (no empty state otherwise skips straight to Production) | `renderWelcome()` |
| ~~**G-4**~~ | ~~Sample data reset~~ | **Removed in Phase AS (G12)** — the section and its button are gone; first-load auto-seeding survives in `initApp()` | — |
| **G-5** | New project form | Create a project (auto-creates its first shoot day) | `renderNewProject()` |
| **G-6** | Grid keyboard navigation | Arrows / Home / End / Enter across checkbox grids | keydown handler, `GRID_ROW_SELECTOR` |
| **G-7** | Undo toast | Phase R/R17 — ~10s "Undo" after a delete or bulk edit, restoring a pre-action snapshot | `finishUndo()` / `undoLastAction()` |
| **G-8** | Autosave & "Saved" flash | The debounced per-key autosave behind Overview/cost fields, and the status flash every save path shares | `scheduleAutosave()` / `flashStatus()` |
| **G-9** | Remove-from-project dialog | Phase AY-a — the two-option destructive-scope decision (this view only / this project entirely), shared by Production and Budget and rendered into `#globalOverlay`. **Never offers or mentions deleting the crew record** | `removePersonDialogHTML()` / `confirmRemovePerson()` |

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
itself stays — that is **G20 / Phase AV**.

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

## Budget (B-1) — the decisions

**It is no longer a demo.** Phase AU shipped it with the `.page-head` line
"DEMO · EDITS LAST FOR THIS SESSION ONLY"; **Phase AV removed that line and gave the
screen real storage**, because the honest statement is now the opposite one — every
edit saves itself. The `budgetDemo*`/`bdm*` names stayed; they exist to avoid a
collision with T-6, not to say "throwaway".

**Storage discipline was the whole point of AV.** Three keys, the app's existing
`saveDB`/`loadDB` choke point, the existing `app_data` table. `db:crew` was read-only
throughout and is byte-identical afterwards. A budget edit writes exactly one
`budget:<projectId>` key and never all of them.

**Sections and codes are two axes on purpose.** A line displays under a *section* and
counts under a *code*, and the two frequently disagree — a camera operator carried in
the Travel section still counts as Cinematography. The ⚑ marker says so and does
nothing else: it never changes a value and never moves a line out of a total. A future
session tempted to "fix" the disagreement by forcing `code = section.expectedCode`
would be deleting the information the phase was built to show.

**Copy, never look up.** A crew-linked line's rate is copied once and never re-read.
Where the crew record has since moved, the line shows ≠ and a tooltip — no
auto-update, no prompt, no bulk action. Re-reading crew rates into existing lines
would silently rewrite historic, signed-off budgets.

**Float per line, fee on the float-inclusive subtotal.** Both were specified and both
are unusual enough to be "fixed" by a well-meaning future session. They are not
mistakes. A section total already contains its float; the fee is a percentage of a
number that already contains float. AV added the per-line float %: **blank follows the
project, a typed 0 means this line carries no float**, and real lines do carry zero.

**Two Budgets, on purpose, for now.** T-6 rolls up costs the app already holds; B-1 is
a budget you build. They answer different questions and share no code. If B-1 is
adopted, that is the point at which somebody decides what happens to T-6 — this phase
deliberately does not decide it, and deliberately did not rename or touch T-6.

**Side panel, not a project tab.** The brief put it in the side panel, and the side
panel is also where it belongs: adding a second tab labelled BUDGET next to T-6's would
have been unreadable. The cost of a sidebar entry is that sidebar routes null
`currentProjectId`, so `goBudgetDemo()` is the one that doesn't, and `renderSide()`
keeps the open project lit while you're on it. Leave from Budget and you land back on
the tab you left.

**VAT sits INSIDE the arithmetic by default (Phase AW correction).** AU and AV had
this backwards — they excluded VAT from every percentage and the grand total, on the
theory that VAT was a figure sitting outside every total. It isn't: Little Film's
budget sheets have always carried VAT INSIDE the line total, with the VAT column
showing the VAT portion OF that total, and the 5% float calculated on the
VAT-inclusive figure. AW fixed the formula (`total = net + vat` on the Inc. VAT
basis) and added `bdmVatToggle` so the whole screen can still be viewed Ex. VAT
(`total = net`) when that's what's wanted — see `budgetDemoLineMath()` above. Note
this is still a *different* model from T-6's, where VAT follows the PERSON
(`c.vatRegistered`). Here VAT is a property of the LINE (`vatRate`, 0 or 0.2), because
a line is what gets invoiced. Don't unify them without deciding which model wins.

**The BBC lens shows its empty categories.** A, B, E, K, M, O at £0 with "— no lines"
is information — it says what wasn't spent — and a top sheet with categories missing
is a top sheet somebody has to cross-check by hand.

**The one styling deviation is `max-width`.** The app's 840px reading column was right
for a call sheet form and wrong for a budget: it pushed Total / Float / Total+float off
the right edge. `.main:has(#bdmTopSheet)` widened this screen alone to 1320px. Everything
else — headings, labels, greens, fields, tables, collapsibles, the tab switcher, the
money figures — was the app's existing rules, unmodified. ⚠️ **The `max-width` deviation
itself is gone as of Gate 1 (Part One) — see "The wide-view exception" below, now
retitled to record its removal.** Everything else in this paragraph still holds.

**The BBC rules moved out of code and into data.** AU had them as a `switch`; AV has
them as an ordered, first-match-wins table in `db:budget_settings`, shown read-only in
Settings so they can be read rather than reverse-engineered. Two things about that
table changed from AU and are deliberate: Insurance/Risk is now a PROD rule *below* the
Producer/Exec/Director rule rather than a cross-cutting rule tested first, and `match`
is tested against a line's **item** text only, never the supplier or person name.

**Adding a section was in scope; editing the rules was not.** With no sections there is
no "+ Add line" anywhere, so an empty budget could never be started — LMAOF and Fashion
Files would have had a screen that looked finished and did nothing. Add and
remove-when-empty is the minimum that fixes that. Renaming sections, and editing the
codes/phase sets/BBC rules, are a later phase.

**Explicitly not built, and not to be added without a decision:** per-person breakdown,
cost reporting, invoiced/paid tracking, markup, bank reconciliation, linking a line to
a crew record from the UI, and adding crew from within the budget view. The only read
of the crew database is the rate-drift comparison.

## Budget (B-1) — the decisions (Phase AX addendum)

**The sidebar restructure listed above as "not to be added without a decision" is that
decision.** AV deliberately left it alone; AX is the phase that did it, once both B-1
and the sidebar's own project list existed and had started disagreeing about "what
project is open." Nothing else in the "explicitly not built" list above changed — this
addendum is scoped to navigation only, same as the phase brief.

**Project chosen once; view chosen separately.** Before AX, B-1 carried its own
project `<select>`, defaulting to whatever the sidebar had open but able to diverge
from it the moment it was touched — two sources of truth for one piece of state, on
screen at the same time. AX deleted the dropdown. B-1 now reads `currentProjectId`
directly, the same variable the sidebar's project list and Production both read —
there is exactly one place "which project" lives, and B-1 stopped being an exception
to that.

**Float %/Fee % are project settings; VAT is a view control — and that's not a
distinction without a difference.** Float %/Fee % are stored per-project (`budget:
<projectId>`) and travel with the DATA; the VAT basis (`bdmVatToggle`) is session state
that changes how the same data is DISPLAYED and was never persisted (Phase AW). Moving
Float %/Fee % into a settings strip under the header — and deliberately leaving VAT
exactly where AW put it, inside the top sheet — keeps that line visible rather than
blurring "a property of this budget" and "a lens on this budget" into one strip because
they happen to both be a checkbox/input near the top of the screen.

**Proper Corn becomes unreachable, and that's accepted, not overlooked — at AX.** It
was never a real project — only ever an extra option in the dropdown this phase
deleted. Its stored budget is untouched and would still render correctly if something
pointed `currentProjectId` at it, but nothing in the app did or should: building a new
way to reach a fixture that only ever existed to give AU/AV/AW something with
post-phaseSet lines to test against would be a feature, not navigation. See **Sidebar &
navigation — VIEWS** for the exact fallback path this phase left it on.

⚠️ **Superseded at Gate 1.** The click path this addendum deliberately declined to
build turned out to be exactly what Gate 1 was asked for — see **Sidebar & navigation
— VIEWS** above and **Budget (B-1)**'s `BDM_PROPER_CORN_SEED` note. Nothing about AX's
reasoning above was wrong at the time; a later phase simply had a different brief.

**No new persistence layer for "remembered project," and nothing new in Supabase.**
The no-empty-state boot sequence reuses `lastOpenedAt` — already on every project
record since Phase Y, already stamped by `openProject()` every time a project is
actually picked. `goProduction()`'s own fallback to `mostRecentProject()` only reads
it. The alternative — a new `localStorage`/`sessionStorage` key for "last view/project"
— was avoided on purpose: the app has never used browser storage for anything, and
the existing Supabase-backed signal already says exactly what was needed.

## ⚠️ The wide-view exception — REMOVED at Gate 1 (Part One). Do not look for it.

**Historical record, kept for context — this pattern no longer exists in the code.**
Every screen in this app used to read at the same 840px column
(`.main{max-width:840px}`) except Budget (B-1), which opted out via
`.main:has(#bdmTopSheet){max-width:1320px}` (added in Phase AU, because at 840px the
Total / Float / Total+float columns — the exact figures a budget is read for — sat
off the right edge). The prior Gate 1 pass checked the `:has()` scoping still held and
documented the technique as a named, reusable pattern for a future dense screen.

**Gate 1 (Part One) superseded this.** The app now reads at one landscape container
everywhere — `.main{max-width:1188px}`, Production and Budget alike, no per-screen
opt-out — because having a page shape that changes screen to screen was the thing
under review, not just this one selector. There is no exception left to reuse: a
future dense screen that doesn't fit 1188px should scroll its own wide table inside
`.tablewrap` (the mechanism that already handles B-1's own line-detail table — see
**Budget (B-1)** above), not widen `.main`. `:has(#bdmTopSheet)` no longer appears
anywhere in `index.html`.

**One-line change (post-Gate 1): 64px horizontal margin.** `.main` now carries
`padding:20px 64px 90px` (was `20px 22px 90px`) — one value, applied globally,
Production and Budget alike, no per-view or per-component override. Usable content
width inside the 1188px container is ~1060px. B-1's line-detail table scrolls
horizontally inside its own `.tablewrap` slightly sooner as a result — expected,
not a regression; do not widen `.main` or shrink this margin to compensate. The
existing `@media(max-width:900px)` and `@media(max-width:420px)` rules already
collapse this padding to 13px and 11px respectively on narrow screens, so the
64px value only applies at the wider breakpoints — it was left untouched.

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
