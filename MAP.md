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

- `renderProjectOverview()` — renders the project overview tab body (client, title, dates, logline, description form) — [Overview]
- `saveProjectOverview()` — validates and persists overview fields (client/title/start date required), updates sidebar/header on save — [Overview]
- `bareMinimumWarningsHTML()` — builds the "bare minimums" warning pills (missing dates/locations/crew) with click-to-fix jumps — [Overview]
- `renderWelcome()` — renders the landing screen shown when no project is open — [Overview]
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
- `matchesCrewFilterState()` — shared match rules (depts, lead company, roles, exclude-Talent, exclude-other-companies) used by both this screen's filter and the Crew database's. Does NOT include the Days filter — the Crew database screen has no project/shoot-day context, so that's a separate check (`personMatchesProjectDayFilter`) only applied on the project screen — [Crew, Shared/utility functions]
- `personMatchesProjectDayFilter()` — the Days filter (Phase T item 3): matches if the person has a position on any (`daysMode:'or'`) or every (`daysMode:'and'`) of the selected shoot days. An OR/AND `<select>` appears next to the day checkboxes once 2+ days are picked — [Crew]
- `personMatchesProjectFilter()` / `personHasHotel()` / `sortProjectCrewGroup()` / `buildProjectCrewGroups()` — filter (`matchesCrewFilterState` + `personMatchesProjectDayFilter`), "has hotel" test, in-group sort and dept-or-hotel grouping for the assigned crew list — [Crew]
- `toggleProjectCrewFilterPanel()` / `toggleProjectFilterDept()` / `toggleProjectFilterRole()` / `toggleProjectFilterDay()` / `setProjectFilterField()` / `toggleProjectFilterFlag()` / `clearProjectCrewFilter()` / `projectCrewActiveFilterCount()` / `projectCrewFilterPanelHTML()` — collapsible filter panel state and rendering, including the Days filter-chips + OR/AND select (Phase T item 3) — [Crew]
- `projectCrewSelected` / `toggleCrewSelected()` / `toggleSelectAllFilteredCrew()` / `clearCrewSelection()` / `bulkRemoveSelectedFromProject()` / `bulkActionBarHTML()` — bulk-select (checkbox swapped in for the view/eye icon via `crewIdentityHTML`'s `bulkSelect` option) and the bulk "Remove from project" action. `toggleSelectAllFilteredCrew()` is the "Select all" checkbox next to Expand/Collapse all (Phase T item 2) — it's always handed exactly the currently-filtered/visible crew ids, never the full project roster, so it only ever selects what the active filter is showing — [Crew]
- `bulkEditOpen` / `toggleBulkEdit()` / `bulkEditPanelHTML()` / `applyBulkLeadCompany()` — bulk-edit panel opened from the bulk-action bar; currently just Lead Company, the field Phase R moved off the main Roles row — [Crew]
- `crewRolesRowHTML()` — renders one person's row in the Roles tab as a proper tidy grid (`.roles-grid`, Phase S), not a packed inline row: CONTROLS (checkbox + Edit pencil) | Name | Role (saved-roles taglist only — no add-role picker here any more) | Department (read-only, `deptLabelHTML`) | Show as. "Add a saved role" and Lead Company both live only in the Edit/pencil expansion (`crewFormHTML`) or the bulk-edit panel; phone is not shown on this row at all — [Crew]
- `showAsQuickEditHTML()` / `saveQuickShowAs()` — inline "Show as" quick-edit, used on the Roles row. Renders via the same `.icon-btn` pencil button as every other edit affordance in the row (Phase S item 2) rather than a separately-styled control — [Crew]
- `groupedCrewOptionsHTML()` — builds `<option>` groups (by department) for crew-picker selects — [Crew]
- `crewAssignRowHTML()` — renders one crew row in the "days on site"/"hotel" grid. Department badge and Lead Company pill are hidden (Phase S item 6) and role display falls back to Show-as (`showAsOrRole`, item 8) — this row no longer offers any role editing (the old per-row role quick-edit was removed; role/department/Show-as are only ever edited on the Roles tab) — [Crew]
- `toggleCrewOnDay()` — toggles a crew member's assignment to a given shoot day — [Crew]
- `crewCateringBlockHTML()` — renders one crew member's per-day breakfast/lunch/dinner checkbox rows in the catering grid. Department/Lead Company hidden, role display is Show-as-or-role, display-only (Phase S) — [Crew]
- `getCateringMeals()` / `toggleMeal()` — read/write which meals a crew member is down for on a given day — [Crew]
- `toggleAllMealForPerson()` — toggles one meal type on/off across every day for a person — [Crew]
- `buildCateringExport()` / `renderCateringExport()` / `copyCateringExport()` — build, render and copy a per-day catering headcount + dietary-notes list. Lives only in Preview & Export (T-6.5), left as-is by Phase P2 — [Crew, Preview & Export]
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
- `hotelSummaryOpen` / `toggleHotelSummaryBlock()` / `hotelSummaryHTML()` / `copyHotelSummary()` — the collapsible "Hotel summary" block: room-booking table (Room No./Name/Date from–to/Total nights) first, per-night table (Night/Rooms/Names) below it, no separate rooming list. Shared markup/state rendered in two places (Phase O + follow-up) — below the person × night matrix on the Hotel sub-tab (T-2.3), and again below the WhatsApp text block on Preview & Export (T-6.2b) — same `hsmb-summary`/`hsmc-summary` ids either way since only one tab body is ever in the DOM at once — [Crew, Preview & Export]
- `jumpToHotelSummary()` (Phase P3) — the "Summary" jump-link next to Expand all/Collapse all on the Hotel sub-tab: expands `hotelSummaryOpen` if collapsed, then scrolls `#hotelSummarySection` into view — [Crew]
- `toggleAllForPerson()` — toggles all day-assignment checkboxes for one person at once — [Crew]
- `addCrewToProject()` / `removeCrewFromProject()` — add/remove a crew member from the current project's roster — [Crew]
- `crewInfo()` — looks up a crew member's basic display info by id, with a fallback for removed crew — [Crew]
- `resolveCrewForDay()` / `hasOverride()` — resolve a crew member's effective role/dept for a specific day, accounting for per-day overrides — [Crew, Shoot Days]
- `dayOverrideFormHTML()` / `saveDayOverride()` / `clearDayOverride()` — render/save/clear a per-day override of a crew member's role/department/company — [Crew, Shoot Days]
- `OVERRIDABLE_FIELDS` — list of crew fields that can be overridden per shoot day — [Crew, Shoot Days]

## Locations

- `renderProjectLocations()` — renders the project Locations tab (assigned/unassigned lists, day grid) — [Locations]
- `locDayGridHTML()` — renders the per-location "which days is this used" checkbox grid — [Locations]
- `locRowHTML()` — renders one location row within a project — [Locations]
- `toggleLocOnDay()` — toggles a location's assignment to a given shoot day — [Locations]
- `addLocToProject()` / `removeLocFromProject()` — add/remove a location from the current project — [Locations]
- `renderLocationsDatabase()` / `renderLocationsList()` — render the standalone locations database screen and its list — [Locations]
- `locFormHTML()` / `toggleLocForm()` / `closeLocForm()` — render/open/close the add-or-edit location form — [Locations]
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
- `shootDayBuildHTML()` — builds the full shoot day editor form markup (general info, schedule, positions, tech) — [Shoot Days]
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

## Preview & Export

- `togglePreviewBlock()` / `setAllPreviewBlocksCollapsed()` / `pvBlockHTML()` — collapse/expand and render the Preview tab's collapsible export blocks — [Preview & Export]
- `renderProjectPreview()` — renders the Preview & Export tab body (call sheet, WhatsApp text, tech specs, hotel, catering, Excel blocks) — [Preview & Export]
- `buildFullData()` — assembles the complete RESOLVED data set for a shoot day (crew, locations, schedule, tech specs, weather) used by every export. Each position's `role` is `c.showAs||c.role` — the one place a crew member's "Show as" cosmetic override (Phase R item 3) actually reaches the call sheet/WhatsApp text/Excel output; `canonicalRole` (`c.role`, un-cosmeticised) rides alongside it purely so seniority ranking can look the role up in `ROLES_BY_DEPT`/`ROLE_SENIORITY`, since a free-text "Show as" usually won't match a saved role name. Splits the day's positions three ways (Phase N item 3): `positions` (crew, canonical department order, Client/Talent excluded), `clientPositions`, `talentPositions` — Client and Talent stand apart from the crew departments in every output instead of sorting in among them. `coProductionGroups` (by company) is untouched by that split. Returns `positions`/`clientPositions`/`talentPositions`/each `coProductionGroups[].people` all pre-sorted by `positionOutputCompare()` — [Preview & Export, Shared/utility functions]
  - tech specs go through `resolveTechSpecs()`, NOT the raw `day.techSpecs`: a day stores only what DIFFERS from the project defaults (`saveShootDay` deletes the key when nothing differs), so reading it raw exported blank tech specs for every day sitting on the defaults — fixed in Phase U
- `positionOutputCompare()` — the shared sort for every position list in the call sheet output: department (canonical order) → role seniority within it (`roleSeniorityRank()`, via `canonicalRole`) → role text → name — [Preview & Export]
- `generatePreview()` — regenerates and re-renders all preview/export blocks for the selected day — [Preview & Export]
- `renderTechSpecsSection()` / `copyTechSpecsText()` / `copyTechSpecs()` — render and copy the tech specs reference block, day-resolved (`resolveTechSpecs`/`resolveCameras` via `buildFullData`). Table markup comes from the shared `techSpecsRoundupBodyHTML()`/`cameraDesignationRows()` (Phase P1), also used by the Tech tab's project-level `renderTechSpecsRoundup()` (T-4.4) — [Preview & Export, Tech Specs]
- `renderPreviewCard()` / `positionsTableHTML()` — render the formatted call sheet preview card; `positionsTableHTML()` is the shared Dept/Position/Name/Call/Phone table markup behind the Client block (before Position assignments), the crew Position assignments block, the Talent block (after it), and each co-production group (Phase N item 3) — [Preview & Export]
- `buildWAText()` / `pushPeopleLines()` / `copyWA()` — build and copy the WhatsApp-formatted plain-text call sheet; `pushPeopleLines()` is the shared "*HEADING*" + per-person lines block behind CLIENT/POSITIONS/TALENT/each co-production group, same ordering as the preview card (Phase N item 3) — [Preview & Export]
- `downloadExcel()` / `pushPeopleRows()` — build and download the multi-sheet Excel call sheet (via SheetJS); `pushPeopleRows()` is the shared heading-row + table-row block behind CLIENT/POSITION ASSIGNMENTS/TALENT/each co-production group in the Call Sheet aoa, same ordering as the other two outputs (Phase N item 3) — [Preview & Export]

## Shared/utility functions

- `sb` (Supabase client) — the shared Supabase client instance used by every DB read/write — [Shared/utility functions]
- `loadDB()` / `saveDB()` — the single choke point for reading/writing any app data collection to/from Supabase, keyed by a `db:*` string — [Shared/utility functions]
- `initApp()` — bootstraps the app: loads all DB collections into memory and does the first render — [Shared/utility functions]
- `uid()` — generates a short random unique id — [Shared/utility functions]
- `esc()` — HTML-escapes a string for safe interpolation into templates — [Shared/utility functions]
- `val()` / `setv()` — get/set the trimmed value of a form input by element id — [Shared/utility functions]
- `icon()` / `ICONS` — look up and wrap an inline SVG icon by name — [Shared/utility functions]
- `flashStatus()` — the discreet "Saved" status flash shared by every save button and autosave — [Shared/utility functions]
- `copyText()` — the single clipboard path for every Copy button: async API with a textarea fallback, optional confirm message — [Shared/utility functions]
- `deptHeaderHTML()` — the one canonical collapsible group header (caret + optional code + label + count), shared by the project Crew tab, the crew database and Position Assignments — [Shared/utility functions]
- `expandCollapseAllHTML()` — the "Expand all · Collapse all" strip. Takes an optional third `extraLinkHTML` arg appended after Collapse all (Phase P3 uses this on the Tech tab for the "Summary" jump-link) — [Shared/utility functions]
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
- `renderSide()` — renders the left sidebar (project list, nav) — [Shared/utility functions]
- `toggleDrawer()` / `closeDrawer()` — open/close the mobile navigation drawer — [Shared/utility functions]
- `setTopbarTitle()` — updates the mobile top bar's title text — [Shared/utility functions]
- `goDatabase()` / `goNewProject()` / `openProject()` / `goProjectTab()` — top-level router functions that change `route`/`currentProjectId`/`currentProjectTab` and re-render — [Shared/utility functions]
- `renderMain()` — dispatches the main panel render based on the current route — [Shared/utility functions]
- `projCode()` — derives a project's short display code — [Shared/utility functions]
- `fmtDate()` — formats an ISO date string as a human-readable date — [Shared/utility functions]
- `renderCrewDatabase()` / `renderCrewList()` / `crewSearchBlob()` / `crewCardHTML()` — render the standalone crew database screen, its filtered list, and its search index/card markup. `crewSearchBlob()` includes `c.showAs` so the cosmetic override is searchable too — [Crew, Shared/utility functions]
- `toggleDeptCollapse()` / `setAllDeptsCollapsed()` — collapse/expand department groups in the crew database list — [Crew]
- `toggleProjectDeptCollapse()` / `setAllProjectDeptsCollapsed()` — the same, for the project Crew tab's groups — [Crew]
- `crewFormHTML()` / `toggleCarFields()` — render the add/edit crew form and react to "has car" toggling. No more free-text Role or manual Department field (Phase R item 1/follow-up): existing crew (`c.id` set) get the live saved-roles tag-list editor; a brand-new crew member gets `newCrewRolePickerHTML()` instead, required to save. Also has the new "Show as" text field — [Crew]
- `refreshCrewScreen()` / `toggleCrewForm()` / `closeCrewForm()` / `editCrew()` / `toggleCrewView()` / `crewViewHTML()` — manage opening/closing/viewing the crew form and read-only crew detail view. `toggleCrewForm()`/`closeCrewForm()` reset `pendingNewCrewRole` when the new-crew form opens/closes — [Crew]
- `saveCrew()` — persist a crew record. Refuses to create a brand-new crew member without `pendingNewCrewRole` set ("every crew member needs at least one saved role"); for a new record, role/department/`roles` are derived entirely from that pick. For an existing record, role/department/`roles` are left untouched (they're managed live by `addRoleToCrew`/`setActiveRole` elsewhere, not by this form) — [Crew]
- `deleteCrew()` — delete a crew record — [Crew]
- `renderDeptAdminPanel()` / `toggleDeptAdminPanel()` — collapsible "Departments & sub-departments" panel on the Crew database screen: one block per department showing its sub-departments (add/rename/remove), its "Role seniority order" reorder list (Phase N item 2 — up/down via `moveRoleSeniority()`), and its roster, Heads of Department pinned to the top — [Crew]
- `addSubDeptAdmin()` / `renameSubDeptAdmin()` / `removeSubDeptAdmin()` — add, rename (updates any crew already on it) and remove (clears it off any crew) a sub-department from the admin panel — [Crew]
- `toggleHoD()` — toggles a crew member's `isHoD` flag (Head of Department), used to pin them to the top of their department's roster in the admin panel and, via `crewRolesRowHTML`/roster sorts, elsewhere — [Crew]
- `crewDbFilter` / `crewDbFilterOpen` / `crewSearchQuery` — Crew database's filter-panel state (same shape as `projectCrewFilter`, no group-by since there's no hotel context) and the free-text search, kept outside the DOM so re-renders don't clear the search box — [Crew]
- `personMatchesCrewDbFilter()` / `sortCrewDbGroup()` / `toggleCrewDbFilterPanel()` / `toggleCrewDbFilterDept()` / `toggleCrewDbFilterRole()` / `setCrewDbFilterField()` / `toggleCrewDbFilterFlag()` / `clearCrewDbFilter()` / `crewDbActiveFilterCount()` / `crewDbFilterPanelHTML()` — Crew database's filter panel (multiselect departments, lead company, roles, exclude-Talent/exclude-other-companies, sort) — [Crew]

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
| T-1.4 | · Bare minimums | Click-to-fix warning pills for missing dates/locations/crew | `bareMinimumWarningsHTML()` |
| T-1.5 | · Danger zone | Delete project + its shoot days | `deleteProject()` |
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
| T-3.2 | · Add from locations database | Picker | `addLocToProject()` |
| T-3.3 | · Add a new location | Inline location form, scoped to this project | `toggleLocForm()` |
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
| **T-6** | **Preview & Export** | The finest-detail choices and the outputs | `renderProjectPreview()` |
| T-6.1 | · Call sheet preview | Formatted card — Client block, then crew Position assignments, then Talent block, then co-production groups (Phase N item 3) | `renderPreviewCard()` |
| T-6.2 | · WhatsApp text | Plain-text version for the full crew (no tech specs) — same Client/Positions/Talent/co-production ordering as T-6.1 | `buildWAText()` |
| T-6.2b | · Hotel summary | Same room-booking table + per-night table as T-2.3's Hotel summary, shown again here below the WhatsApp text | `hotelSummaryHTML()` |
| T-6.3 | · Tech specs | Camera/technical crew reference + camera designations, per the selected shoot day (resolved override vs. project default). Kept here as-is even after Phase P1 added the project-level version at T-4.4 — this one stays day-aware, T-4.4 doesn't | `renderTechSpecsSection()` |
| T-6.5 | · Catering order | Per-day headcounts + dietary requirements | `renderCateringExport()` |
| T-6.6 | · Excel export | Multi-sheet .xlsx (Call Sheet + Tech Specs) — same Client/Positions/Talent/co-production ordering as T-6.1 | `downloadExcel()` |

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

## G — Global chrome

| Code | Section | What it is | Entry point |
|---|---|---|---|
| **G-1** | Sidebar | Databases, project list, + New project | `renderSide()` |
| **G-2** | Mobile top bar & drawer | Burger, title, slide-out nav | `toggleDrawer()` / `setTopbarTitle()` |
| **G-3** | Welcome screen | Landing state when no project is open | `renderWelcome()` |
| **G-4** | Sample data reset | Wipe and reload the demo data set | `resetAndReseed()` |
| **G-5** | New project form | Create a project (auto-creates its first shoot day) | `renderNewProject()` |
| **G-6** | Grid keyboard navigation | Arrows / Home / End / Enter across checkbox grids | keydown handler, `GRID_ROW_SELECTOR` |

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

## The design system, as decided (Phase Style Review)

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
`expandCollapseAllHTML(fnName, arg, extraLinkHTML, allCollapsed)` renders "Expand all"
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
