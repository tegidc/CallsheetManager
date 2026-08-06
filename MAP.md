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

- `renderProjectOverview()` — renders the project overview tab body: Project details, then Tasks, then AI Scan, then Danger zone (Phase Overview Reorder — Tasks/AI Scan used to render above Project details). Project details has no manual Save button — autosave (`body.oninput` → `scheduleAutosave('overview', …)` → `saveProjectOverview(true)`) is the only save path; the `#ovStatus` "Saved" flash span stays — [Overview]
- `saveProjectOverview(silent)` — validates and persists overview fields (client/title/start date required), updates sidebar/header on save. Only ever called from the autosave path now (`silent=true`) — the non-silent `alert()` branch is unreachable dead code kept for signature safety, not wired to any button — [Overview]
- `tasksSectionOpen` / `toggleTasksSection()` (Phase Overview Reorder) — Tasks is now collapsible, same `sd-block-head`/`dept-caret` idiom as `aiScanOpen`/`toggleAiScanBlock()`, collapsed by default. Header shows a combined count (open flags + open manual tasks) — [Overview]
- `renderTasksSection()` (Phase Tasks) — the merged Tasks box on Overview: auto-flags (formerly the standalone "Bare minimums" box — those three checks now live inside `buildTaskFlags()` alongside the three new rules below) plus manual persisted tasks, one `.section`, replacing the old separate box entirely — [Overview]
- `buildTaskFlags()` / `taskFlagPillsHTML()` — computes and renders the flag pills, shown directly under the Tasks header with no toggle/disclosure above them (Phase Overview Reorder removed the "Flags" show/hide control and its rule on/off checkboxes — see below). Dumb rule-checks against current `days`/`p` state, run fresh on every render — never persisted, never manually dismissed; a flag just stops appearing once its condition no longer holds. Six rules: the three original bare-minimums (missing dates/locations/crew, always on) plus three more gated on `appSettings.flagNoLocation`/`flagNoCrew`/`flagNoDayRate` (default/permanently on now — see below) — a shoot day with no location (one pill per day, via `shootDayLabel()`), a shoot day with no crew (one pill per day — "no crew" here means nobody has a position that day, the same signal `buildTransportSummary()`/Days-on-site use, NOT the project-wide "no crew assigned" bare-minimum), and crew with no day rate set (guarded by `typeof resolveCrewRate==='function'` so it degrades to a no-op rather than erroring if Budget isn't present; grouped into ONE pill with a count rather than one-per-person — unlike the two day-based rules, a project can carry 60+ crew, and one pill per no-rate person would flood the box; clicking jumps to Budget's Per Person view where every no-rate person is already listed together) — [Overview, Budget]
  - REMOVED in Phase Overview Reorder (do not look for these): `taskFlagsSettingsOpen`, `toggleTaskFlagsSettings()`, `taskFlagsSettingsHTML()`, `toggleTaskFlagRule()` — the "Flags" disclosure toggle and its three rule on/off checkboxes. `appSettings.flagNoLocation`/`flagNoCrew`/`flagNoDayRate` still exist and still gate `buildTaskFlags()` (kept rather than inlined, in case a UI to toggle them returns) but default `true` with no remaining UI path to turn them off — [Overview]
- `flagNoLocation` / `flagNoCrew` / `flagNoDayRate` — the three rule toggles, stored in `appSettings` (`db:settings`) alongside the header font/brand colour — site-wide, not per-project, so silencing a noisy rule sticks everywhere — [Overview, Shared/utility functions]
- `addProjectTask()` / `toggleProjectTask()` / `deleteProjectTask()` / `taskListItemHTML()` / `tasksListHTML()` — manual tasks, persisted as `project.tasks[]` (`{id, title, note, completed, createdAt}`), same per-project-array pattern as everything else on a project record. Rendered with the app's standard `.list-card` (matches the Locations database list). Completed tasks hide by default behind a `showCompletedTasks` count toggle rather than sitting struck-through in the main list — a reasonable default, not a hard requirement. `deleteProjectTask()`'s trash-icon button wasn't explicitly requested in the brief but was added to match every other list in the app (crew, locations) having one — a task list with no way to ever remove an item would only accumulate — [Overview]
- `aiScanSectionHTML()` (Phase AI Scan) — the collapsible "AI Scan" box on Overview, below Tasks: a real chat interface (not a one-shot extractor) backed by the `ai-scan` Supabase Edge Function, which proxies the Anthropic API so the API key never reaches the client. Chat history (`aiScanMessages`) is frontend-memory only, reset whenever the open project changes (`aiScanProjectId`) — **not persisted across page reloads**, deliberately, per the build brief; flag back if that turns out to be an unwanted limitation once used for real — [Overview]
- `AI_SCAN_ENDPOINT` / `AI_SCAN_ANON_KEY` — the Edge Function URL and the same publishable/anon key the `sb` client already uses (not a new exposure, just reused as the function's bearer token; `verify_jwt:true` on the function requires *some* valid Supabase token, and a single-user no-auth app has no other one to send) — [Overview]
- `sendAiScanMessage()` — the whole turn lifecycle: reads the typed text + any attached files, prepends `pendingAiToolResultBlocks()` (**required** by the Anthropic API — every `tool_use` block in the assistant's last turn needs a matching `tool_result` before the conversation can continue, reflecting whatever the user has/hasn't actioned on each card), POSTs the full history + `crewSummary`/`locationSummary` to the Edge Function, and on success appends both the user and assistant turns to `aiScanMessages` and registers any new `tool_use` blocks in `aiScanProposals`. On failure, leaves the typed text/attachments untouched so Send retries cleanly — [Overview]
- `aiScanDraftText` — **exists because of a bug caught in testing**: this app's `renderProjectBody()` fully replaces `body.innerHTML` on every state change (its pattern everywhere), which silently wipes any input whose value isn't sourced from state — including `sendAiScanMessage()`'s own busy-state render, on literally every send. The chat text input's `value=` is bound to this variable (kept in sync via `oninput`) specifically so a failed send doesn't lose what was typed. Nothing else in the app has this problem as visibly, since most other inputs happen to redisplay a last-*saved* value after a stray re-render rather than going blank — [Overview]
- `pendingAiToolResultBlocks()` — builds those required `tool_result` blocks from `aiScanProposals` state: "added as new" / "matches existing X, assigned" / "declined, don't re-propose" / "not reviewed yet" (the fallback, so an ignored card doesn't break the next turn) — [Overview]
- `aiScanProposals` / `acceptAiProposal()` / `discardAiProposal()` / `proposalCardHTML()` — the proposal cards. Ticking commits the **current field values** (editable inline, no separate edit mode) via matched-record functions when a `match_id` checkbox is ticked, or new-record functions otherwise; discarding changes nothing. Cards stay visible after resolving (per the brief), fields disabled, with a status line — [Overview]
- `addShootDayFromProposal()` / `addNewLocationFromProposal()` / `addNewCrewFromProposal()` — the "new record" commit paths. `addShootDayFromProposal()` reuses the actual shared `makeShootDayRecord()`. The other two **can't** call `saveCrew()`/`saveLocation()` directly — those read ~25 fields via `val('nc...')`/`val('nl...')` off their own database forms, not parameters — so these mirror their record shape exactly (every field `saveCrew()`'s `rec` object sets) rather than faking a whole form. Matched proposals instead call the real existing `addCrewToProject(id)` / `addLocToProject(id)` — [Overview, Crew, Locations]
  - `addCrewToProject()` gained an optional `id` parameter for this (`id = id || val('addCrewPick')`) — its own call site, unchanged, still works with no argument — [Crew]
- `buildCrewSummary()` / `buildLocationSummary()` — compact `{id, name, role}`/`{id, name}` projections of the FULL `crewDB`/`locationsDB` (not just this project's roster) sent with every request, so Claude can propose a `match_id` against anyone already in either database — [Overview]
- `fileToContentBlock()` / `fileToBase64()` / `fileToText()` — turn an attached file into an Anthropic content block client-side. PDF → base64 `document` block (Claude reads PDFs natively, no extraction needed). `.docx` → plain text via `mammoth.js` (the API has no native docx support). `.txt`/anything else → read as plain text. 15MB cap per file — [Overview]
- `stripAiScanDisplayFields()` — strips the display-only `_filename` property (stashed on file blocks purely so `aiScanMessageHTML()` can show an attachment's name) before any message array reaches the actual API request — [Overview]
- `renderWelcome()` — renders the landing screen shown when no project is open. Above the existing "Get started" section (Phase Y) sits a two-button toolbar: "Recent" (`goRecentProject()`, disabled when there's no project to jump to, labelled with that project's name) and "+ New" (`goNewProject()`, the same entry point the sidebar's "+ New project" and this screen's own "+ New project" button already use — no second code path) — [Overview]
- `mostRecentProject()` / `goRecentProject()` (Phase Y) — `mostRecentProject()` sorts `projectsDB` by `lastOpenedAt` (falls back to `0`, so a never-opened project sorts last, not first) and returns the top one, or `null`; `goRecentProject()` opens it via the normal `openProject()`. `lastOpenedAt` is a plain epoch-ms timestamp, stamped by `openProject()` itself on every open — no separate "mark as viewed" call needed — [Overview]
- `resetAndReseed()` — wipes and reloads sample data for a fresh demo state — [Overview]
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
- `toggleProjectCrewFilterPanel()` / `toggleProjectFilterDept()` / `toggleProjectFilterRole()` / `toggleProjectFilterDay()` / `setProjectFilterField()` / `toggleProjectFilterFlag()` / `clearProjectCrewFilter()` / `projectCrewActiveFilterCount()` / `projectCrewFilterPanelHTML()` — collapsible filter panel state and rendering, including the Days filter-chips + OR/AND select (Phase T item 3), the Roles filter-chips sub-section (Phase AB — its own collapse toggle, `projectCrewFilterRolesOpen`/`toggleProjectFilterRolesSection()`, independent of the panel's own open/closed state) and the Inverse checkbox (Phase AE, `toggleProjectFilterFlag('inverse', …)` — no new setter needed, the existing generic flag setter covers it). Sort/Group by (Phase Sort/Group A) each carry a broad curated option list rather than the earlier two/one-option shell — see `sortProjectCrewGroup()`/`buildProjectCrewGroups()` above for what each value does — [Crew]
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
- `addCrewToProject()` / `removeCrewFromProject()` — add/remove a crew member from the current project's roster — [Crew]
- `crewInfo()` — looks up a crew member's basic display info by id, with a fallback for removed crew — [Crew]
- `resolveCrewForDay()` / `hasOverride()` — resolve a crew member's effective role/dept for a specific day, accounting for per-day overrides — [Crew, Shoot Days]
- `dayOverrideFormHTML()` / `saveDayOverride()` / `clearDayOverride()` — render/save/clear a per-day override of a crew member's role/department/company — [Crew, Shoot Days]
- `OVERRIDABLE_FIELDS` — list of crew fields that can be overridden per shoot day — [Crew, Shoot Days]

## Locations

- `renderProjectLocations()` — renders the project Locations tab: the assigned-locations day grid, then the ONE "Add location" entry point — [Locations]
- `locAddOpen` / `locAddQuery` / `toggleLocAdd()` / `onLocAddInput()` / `locAddResultsHTML()` / `startNewLocationFromSearch()` (Phase Q) — **the unified add-location flow.** One button opens a search field over `locationsDB` (already-assigned locations filtered out, capped at 8 results), and the "create new location" option is the last row of that same result list, prefilled with whatever was typed. `onLocAddInput()` re-renders `#locAddResults` ONLY — re-rendering the tab would steal focus mid-word, the same reason `crewSearchQuery` lives outside the DOM. `startNewLocationFromSearch()` sets `locFormContext` to the project id itself, which is what makes `saveLocation()` attach the new record to `p.locationIds`. Replaces the old two-button arrangement (a database `<select>` + a separate "Add a new location" form) — [Locations]
- `locDayGridHTML()` — renders the per-location "which days is this used" checkbox grid — [Locations]
- `locRowHTML()` — renders one location row within a project — [Locations]
- `toggleLocOnDay()` — toggles a location's assignment to a given shoot day — [Locations]
- `addLocToProject(id)` / `removeLocFromProject()` — add/remove a location from the current project. Takes the id as an argument since Phase Q; the old no-arg form read a `#addLocPick` `<select>` that no longer exists — [Locations]
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
- `makeShootDayRecord()` / `STARTER_SCHEDULE` — constructs a new blank shoot day record, seeded with the starter CALL/LUNCH/WRAP schedule — [Shoot Days]
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
- `fetchWeatherForDay()` — fetches forecast weather for the day's date/location from Open-Meteo — [Shoot Days]
- `WMO` — lookup table mapping Open-Meteo weather codes to human-readable conditions — [Shoot Days]
- `saveShootDay()` — validates and persists the current shoot day's form data — [Shoot Days]

## Budget

Cost visibility only (Phase Budget) — not a working budget. Rolls up cost data already
entered elsewhere in the app rather than owning any of its own — including hotel cost
per room/night (`getHotelCosts()`/`saveHotelCosts()`, Phase Budget originally, moved to
the Hotel tab in Phase AD so Budget's relationship to it now matches Catering/Travel:
read-only). Deliberately excludes location fees (one fee can span several shoot days,
not handled here) and offers no editable line-item budget or export of its own —
Preview & Export stays the export surface.

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
- `budgetDayFilter` / `budgetFilterOpen` / `toggleBudgetFilterPanel()` /
  `toggleBudgetFilterDay()` / `clearBudgetDayFilter()` / `budgetSelectedDays()` /
  `budgetDayFilterCount()` / `budgetFilteredDays()` / `budgetFilterPanelHTML()`
  (Phase Refinement) — **the Budget day filter.** A Set of shoot-day ids; empty
  means every day, so the default is exactly the project-wide budget that was
  there before. Deliberately a filter on the data rather than a fifth view —
  "which days am I costing" scopes all four views at once, so it sits above the
  view switcher, not inside it. `buildBudgetData()` reads `budgetFilteredDays()`
  in place of `projectDays()`, which is the single line that scopes crew day
  rates, `daysWorked`, the per-day rows and the hotel room-night count together.
  Built in the Crew tab's Filter idiom (a `crewToolbarHTML()` row whose
  `.filter-panel` renders BELOW it, never inside it) with the same day-chip
  markup as `projectCrewFilter`'s Days sub-section. No OR/AND mode: days are
  being *summed*, not matched against a person, so "or" is the only meaning the
  selection can carry — [Budget]
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
  added Phase AF) — the switcher's own key order, `viewLabels`, not `budgetView`'s
  internal naming — [Budget]
- `budgetVatToggle` / `toggleBudgetVat()` — itemized (every figure ex-VAT, VAT broken
  out as its own line in the summary bar) vs baked in (VAT folded silently into every
  figure everywhere, one Total). Extras (catering/travel/hotel) never carry VAT in
  either state — only a crew member's own rate does, gated on `c.vatRegistered` —
  [Budget]
- `budgetPersonDisplay()` — the one function that applies the VAT toggle to a
  person's cost; every rollup (department, day, person-view Subtotal) is built by
  summing this, not the raw subtotal, so the toggle can never go stale in one view
  and not another — [Budget]
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
  bar. Days worked = shoot days where `(d.positions||[]).some(pos=>pos[0]===crewId)`,
  the same on-day signal `buildTransportSummary()`/Days-on-site already use. Hotel
  room-nights are counted directly off `d.hotelNights`/`p.hotelNightBefore` rather
  than via `buildHotelSummary()`, which filters to "active" nights only and would
  need label-matching to recover one specific day's figure — this way project-wide
  and per-day hotel costs share one calculation. The night before Day 1 has no
  shoot-day row of its own, so its rooms fold into Day 1. Department rollups (both
  project-wide and per-day) are filtered by **presence** (someone's actually in that
  department), not by a truthy total — a department with people but no rate set
  shows as £0.00 rather than vanishing, which is the whole point of a cost-visibility
  screen — [Budget]
- `budgetSummaryBarHTML()` — the three-line/one-line summary bar, driven by
  `budgetVatToggle` — [Budget]
- `budgetDeptExtrasTableHTML()` — the department-rows + Catering/Travel/Hotels
  extras + Total table, shared verbatim by the project-wide Per Department view and
  each Per Day row's own expanded breakdown ("same structure … just scoped to that
  single day" per the brief) — [Budget]
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
  `toggleBudgetVatRegistered()`) — [Budget, Crew]

## Preview & Export

- `togglePreviewBlock()` / `setAllPreviewBlocksCollapsed()` / `pvBlockHTML()` — collapse/expand and render the Preview tab's collapsible export blocks — [Preview & Export]
- `exportFormat` / `exportSections` / `EXPORT_SECTION_LABELS` / `setExportFormat()` / `toggleExportSection()` (Phase Q) — **the two independent export choices.** `exportFormat` ('printable' | 'whatsapp') picks the output SHAPE; `exportSections` ({tech, catering, hotels, travel}, all true by default) picks WHICH optional content areas that shape carries. Session state, not persisted — same rule as `previewBlocks`/`crewGridView`: this is "what am I sending right now", not a project property. Excel is deliberately **not** a third format — see the Phase Q section at the bottom of this file — [Preview & Export]
- `exportPanelOpen` / `toggleExportPanel()` / `exportHiddenSectionCount()` / `exportOptionsHTML()` / `exportPanelHTML()` (Phase Q follow-up) — **the Format panel, built in the Crew tab's Filter idiom**: a `crewToolbarHTML()` row carrying one `.crew-header-filter` toggle (caret + "Format: Printable/WhatsApp" + "(N sections hidden)" when any are unticked), with a `.filter-panel` rendered BELOW the row, never inside it — a full-width panel in a flex row distorts its alignment every time it opens, the same note `projectCrewFilterPanelHTML()` carries. Include uses plain `.filter-chips` labels, so it inherits the Crew filter's chip styling instead of a bespoke rule set. The panel holds both output actions (Copy, Download .xlsx) and so starts **open**, unlike the Crew Filter — [Preview & Export]
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
- `loadDB()` / `saveDB()` — the single choke point for reading/writing any app data collection to/from Supabase, keyed by a `db:*` string — [Shared/utility functions]
- `initApp()` — bootstraps the app: loads all DB collections into memory and does the first render — [Shared/utility functions]
- `uid()` — generates a short random unique id — [Shared/utility functions]
- `esc()` — HTML-escapes a string for safe interpolation into templates — [Shared/utility functions]
- `val()` / `setv()` — get/set the trimmed value of a form input by element id — [Shared/utility functions]
- `autoGrowTextarea()` (Phase X) — resizes a textarea's height to fit its content (`scrollHeight`); wired via `oninput` where a textarea needs to auto-grow, and called once after any programmatic `setv()` fill (setting `.value` directly doesn't fire `input`) — first user: the Production Brief textarea (`#sdBrief`, T-5.2) — [Shared/utility functions, Shoot Days]
- `icon()` / `ICONS` — look up and wrap an inline SVG icon by name — [Shared/utility functions]
- `flashStatus()` — the discreet "Saved" status flash shared by every save button and autosave — [Shared/utility functions]
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
- `appSettings` / `SETTINGS_DEFAULTS` / `HEADER_FONTS` / `TINT_ALPHAS` / `hexToRgbTriple()` / `applyAppSettings()` / `setSetting()` / `previewSetting()` / `saveAppSettings()` / `resetAppSettings()` (Phase Q) — the app's configurable header font and brand colours, plus (Phase Tasks) the three Overview auto-flag rule toggles (`flagNoLocation`/`flagNoCrew`/`flagNoDayRate`) — same object, same persistence, just not all of it is styling. Persisted to `db:settings` (an object key, so it's in `loadDB`'s `isObjKey` list alongside `db:subdepartments`/`db:roleseniority`). `applyAppSettings()` works by writing the SAME custom properties the stylesheet already declares in `:root` — `--disp`, `--tape`, `--tape-light` and all six `--tint-N`, the last derived from the brand hex — onto `documentElement`, so no CSS rule needs to know settings exist. `previewSetting()` applies without saving: the colour picker fires `oninput` continuously while dragging, and one Supabase write per hue is not a trade worth making — `onchange` calls `setSetting()` to persist. Only families already in the Google Fonts `<link>` (plus two system stacks) may be added to `HEADER_FONTS` — [Shared/utility functions]
- `renderSettings()` / `goSettings()` (Phase Q) — the Settings screen (S-1), reached from the sidebar. A full screen, not a floating cog panel: the app's one existing pattern for a project-independent thing you go and look at is the sidebar screen (Crew database, Locations database), and a modal would have been a second pattern for no gain — [Shared/utility functions]
- `renderSide()` — renders the left sidebar (project list, nav) — [Shared/utility functions]
- `toggleDrawer()` / `closeDrawer()` — open/close the mobile navigation drawer — [Shared/utility functions]
- `setTopbarTitle()` — updates the mobile top bar's title text — [Shared/utility functions]
- `goDatabase()` / `goNewProject()` / `openProject()` / `goProjectTab()` — top-level router functions that change `route`/`currentProjectId`/`currentProjectTab` and re-render. `openProject()` also stamps that project's `lastOpenedAt` (Phase Y, `Date.now()`) and saves it — the signal `mostRecentProject()` reads for the Welcome screen's "Recent" button — [Shared/utility functions, Overview]
- `renderMain()` — dispatches the main panel render based on the current route — [Shared/utility functions]
- `projCode()` — derives a project's short display code — [Shared/utility functions]
- `fmtDate()` — formats an ISO date string as a human-readable date — [Shared/utility functions]
- `renderCrewDatabase()` / `renderCrewList()` / `crewSearchBlob()` / `crewCardHTML()` — render the standalone crew database screen, its filtered list, and its search index/card markup. `crewSearchBlob()` includes `c.showAs` so the cosmetic override is searchable too — [Crew, Shared/utility functions]
- `toggleDeptCollapse()` / `setAllDeptsCollapsed()` — collapse/expand department groups in the crew database list — [Crew]
- `toggleProjectDeptCollapse()` / `setAllProjectDeptsCollapsed()` — the same, for the project Crew tab's groups — [Crew]
- `crewFormHTML()` / `toggleCarFields()` — render the add/edit crew form and react to "has car" toggling. No more free-text Role or manual Department field (Phase R item 1/follow-up): existing crew (`c.id` set) get the live saved-roles tag-list editor; a brand-new crew member gets `newCrewRolePickerHTML()` instead, required to save. Also has the new "Show as" text field. Since Phase AG, the Private section's Fee/rate row also carries a "Day rate (this project)" field next to it, when-and-only-when this form is opened from within a project for an existing crew member (`c.id` set AND `currentProject()` resolves — false on the standalone Crew database screen, which shares this same function but has no project) — same `p.crewRateOverrides`/`resolveCrewRate()`/`saveCrewRateOverride()` field as the Roles row and Budget's Per Person view, with its own `crewRateSaveIconHTML()` Save icon (context `'e'`), not a second copy of the override — [Crew]
- `refreshCrewScreen()` / `toggleCrewForm()` / `closeCrewForm()` / `editCrew()` / `toggleCrewView()` / `crewViewHTML()` — manage opening/closing/viewing the crew form and read-only crew detail view. `toggleCrewForm()`/`closeCrewForm()` reset `pendingNewCrewRole` when the new-crew form opens/closes — [Crew]
- `saveCrew()` — persist a crew record. Refuses to create a brand-new crew member without `pendingNewCrewRole` set ("every crew member needs at least one saved role"); for a new record, role/department/`roles` are derived entirely from that pick. For an existing record, role/department/`roles` are left untouched (they're managed live by `addRoleToCrew`/`setActiveRole` elsewhere, not by this form) — [Crew]
- `deleteCrew()` — delete a crew record — [Crew]
- `renderDeptAdminPanel()` / `toggleDeptAdminPanel()` — collapsible "Departments & sub-departments" panel on the Crew database screen: one block per department showing its sub-departments (add/rename/remove), its "Role seniority order" reorder list (Phase N item 2 — up/down via `moveRoleSeniority()`), and its roster, Heads of Department pinned to the top — [Crew]
- `addSubDeptAdmin()` / `renameSubDeptAdmin()` / `removeSubDeptAdmin()` — add, rename (updates any crew already on it) and remove (clears it off any crew) a sub-department from the admin panel — [Crew]
- `toggleHoD()` — toggles a crew member's `isHoD` flag (Head of Department), used to pin them to the top of their department's roster in the admin panel and, via `crewRolesRowHTML`/roster sorts, elsewhere — [Crew]
- `crewDbFilter` / `crewDbFilterOpen` / `crewSearchQuery` — Crew database's filter-panel state (same shape as `projectCrewFilter`, no group-by since there's no hotel context) and the free-text search, kept outside the DOM so re-renders don't clear the search box — [Crew]
- `personMatchesCrewDbFilter()` / `sortCrewDbGroup()` / `toggleCrewDbFilterPanel()` / `toggleCrewDbFilterDept()` / `toggleCrewDbFilterRole()` / `setCrewDbFilterField()` / `toggleCrewDbFilterFlag()` / `clearCrewDbFilter()` / `crewDbActiveFilterCount()` / `crewDbFilterPanelHTML()` — Crew database's filter panel (multiselect departments, lead company, roles, exclude-Talent/exclude-other-companies, sort) — [Crew]

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
| T-1.4 | · Tasks — Flags | Live, computed, click-to-fix warning pills — the original three (missing dates/locations/crew) plus three toggle-able rules (Phase Tasks) | `buildTaskFlags()` |
| T-1.5 | · Tasks — Manual tasks | Title/note/tick, persisted per project | `addProjectTask()` |
| T-1.6 | · AI Scan | Chat + document attachments, proposes shoot dates/locations/crew as tool-use cards (Phase AI Scan) | `aiScanSectionHTML()` |
| T-1.7 | · Danger zone | Delete project + its shoot days | `deleteProject()` |
| **T-2** | **Crew** | Who's on the project, and on which days | `renderProjectCrew()` |
| T-2.1 | · Roles | Name / Role / Department / Show as, one tidy row per person | `crewRolesRowHTML()` |
| T-2.2 | · Days on site | Person × day checkbox matrix | `crewAssignRowHTML()` |
| T-2.3 | · Hotel | Person × night matrix, incl. the night before Day 1, with a collapsible hotel summary (room-booking table, per-night table — Phase O) below it | `hotelSummaryHTML()` / `toggleHotelNight()` / `toggleHotelPre()` |
| T-2.4 | · Travel | One travel method per person per project, with a collapsible transport summary (cost fields + per-day method-count grid with a Daily cost row, derived by crossing travel method against days-on-site — Phase W) below it | `crewTravelRowHTML()` / `transportSummaryHTML()` |
| T-2.5 | · Catering | Breakfast / Lunch / Dinner per person per day, with a collapsible catering summary (cost fields + Breakfast/Lunch/Dinner-by-day grid with a Daily cost row — Phase P2) below it | `crewCateringBlockHTML()` / `cateringSummaryHTML()` |
| T-2.6 | · Filter panel | Departments, roles, lead company, days (OR/AND), exclusions, sort, group-by | `projectCrewFilterPanelHTML()` |
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
| **T-6** | **Budget** | Cost visibility only, rolled up from data already entered on other tabs — not a working budget (Phase Budget) | `renderProjectBudget()` |
| T-6.0 | · Filter & output | Phase Refinement/R16 — tick shoot days and/or departments to cost part of the shoot, plus the Per Person sort (R4) and the Copy/Export controls (R1). Scopes all four views at once, so it sits above the switcher, not in it. Nothing ticked = whole project | `budgetFilterPanelHTML()` / `copyBudget()` |
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
| D-1.2 | · Filter panel | Departments, roles, lead company, exclusions, sort | `crewDbFilterPanelHTML()` |
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
| S-1.1 | · Call sheet headers | Header font for every display heading | `HEADER_FONTS` |
| S-1.2 | · Brand colours | Brand colour (light backgrounds) + sidebar accent (dark), driving every tint | `applyAppSettings()` |
| S-1.3 | · Preview | A sample call sheet card, so a pick can be judged before it's used | `renderSettings()` |
| S-1.4 | · Company | Read-only `COMPANY`. Deliberately not editable — see the Phase Q section | `COMPANY` |

## G — Global chrome

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **G-1** | Sidebar | Databases, project list, + New project, Settings | `renderSide()` |
| **G-2** | Mobile top bar & drawer | Burger, title, slide-out nav | `toggleDrawer()` / `setTopbarTitle()` |
| **G-3** | Welcome screen | Landing state when no project is open | `renderWelcome()` |
| **G-4** | Sample data reset | Wipe and reload the demo data set | `resetAndReseed()` |
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
⚠️ Only add a family to `HEADER_FONTS` if it's in the Google Fonts `<link>` on line 8
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
  can't disagree about what's being costed. `clearBudgetDayFilter()` clears both.
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
  emitting the whole project). Rows mirror the visible view. Hidden on the Costs tab,
  which is inputs rather than figures — [Budget]
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

**`.filter-panel-foot`** — the trailing checkbox/"Clear filters" row at the
bottom of a filter panel. Was inline on the Crew panel's closing `div`; Budget's
day filter needed the same row, so it's a class.

**Vestigial ids removed.** Overview Tasks and AI Scan copied the
`${prefix}c-`/`${prefix}b-` id convention from the `applyBlockState` blocks
without the mechanism that reads them — both toggles call `renderProjectBody()`
instead. `tasks-block`, `tasksb-block` and `aisc-block` were looked up by
nothing and are gone. The summary blocks' `hsmc-`/`csmc-`/`tsmc-` ids are **not**
vestigial — those really do go through `applyBlockState()`.

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
