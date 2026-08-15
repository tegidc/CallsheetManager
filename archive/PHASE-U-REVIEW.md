# Phase U — code quality & elegance pass: review sheet

For a human review pass. Rollback point: tag `phase-u2-start` (commit `d96f2ca`, the
Phase T head this pass started from).

Commits, in order:

| Commit | What |
|---|---|
| `f2a84ee` | Tech-specs export bug fix |
| `86a01cc` | The two known-open items from the Phase T notes |
| `7e4112d` | Shared data accessors and helpers (~104 call sites) |
| `c201198` | Amenity lookups, block toggles, group headers |
| `dfe875d` | Visual polish + keyboard navigation |
| `0c1642f` | Mobile responsiveness pass |

Verification standard applied at every step: extracted inline `<script>` blocks and ran
`node --check`, confirmed CSS brace balance, grepped for orphaned references, validated
MAP.md in both directions, plus live render/behaviour checks driven in a real browser
against **synthetic in-memory data only** — `saveDB` stubbed and `fetch` blocked
throughout, so the live Supabase records were never written to.

> **Note on history:** an earlier attempt at this pass was built on a checkout that was
> five phases stale. It was never merged; it lives on branch `phase-u-on-stale-base` and
> can be deleted once this pass is accepted. This sheet describes the work that actually
> landed on `main`.

---

## 1. Bugs found and fixed

| # | Severity | Bug | Cause | Fix |
|---|---|---|---|---|
| B-1 | **High** | Days sitting on the project tech-spec defaults exported **blank tech specs** to the Preview block (T-6.3), the "Copy tech specs" text, and the Excel Tech Specs sheet | `buildFullData()` read the raw `day.techSpecs`. By design `saveShootDay()` stores *only what differs* from the project defaults and deletes the key outright when nothing differs — so the common case was an empty object | `buildFullData()` now uses `resolveTechSpecs(d)`, the function that already existed for exactly this |
| B-2 | Medium | **Known-open item:** Crew Database "+ Add crew member" flipped its label to "− Cancel" but never showed a form | `toggleCrewForm()` → `refreshCrewScreen()` fell through to `renderCrewList()` for the `db-crew` route, and that only replaces `#crewList`. The form markup lives *outside* that div | `refreshCrewScreen()` now re-renders the whole crew database screen for that route |
| B-3 | Medium | **Known-open item:** stray vertical stack of D1/D2/D3… chips floating above the crew cards on mobile | The header strip carries both `.crewgrid` and `.crewgrid-header-row`; the hide rule tied on specificity with `.crewgrid{display:block}` and lost on source order | Doubled the class (`.crewgrid-header-row.crewgrid-header-row`) to win the tie without `!important` |
| B-4 | Medium | Keyboard grid navigation counted **every** checkbox in a row — including the bulk-select box Phase T added to the name cell. `Home` landed on that instead of the first day, `ArrowLeft` escaped into it, and every column index was off by one so up/down drifted a column left each time | `checkboxesIn()` used `row.querySelectorAll('input[type=checkbox]')` | Scoped to `.crewgrid-check input[type=checkbox]` — the cells the navigation is actually about |
| B-5 | Medium | Keyboard navigation **stranded focus**: arrowing down from a catering meal row hit the label-only name row, found no checkbox, and stopped dead | The handler took the immediately adjacent row and gave up if it had none | Now walks in the direction of travel until it finds a row that has checkboxes |
| B-6 | Medium | Schedule reorder arrows were **14px tall** on touch — effectively unusable | Desktop's cramped `20x14` stacked pair inherited straight into the stacked mobile card | Mobile schedule row is now an explicit grid: one compact control strip of 44px targets above the three fields |
| B-7 | Low | Every Shoot Day block header pushed its own title to the far right, away from its caret | `.sd-block-head` used `justify-content:space-between`, which only makes sense when there's a trailing action (Preview blocks have one; Shoot Day blocks don't) | `flex-start`, with any trailing action using `margin-left:auto` |
| B-8 | Low | `.ts-field` input width was silently ignored | Specificity tie with the global `input[type=text]{width:100%}`, which came later in the sheet | Qualified to `.ts-field input[type=text]` |
| B-9 | Low | Tech-spec labels had already drifted between outputs — the copyable text said "Delivery" where the table and Excel sheet said "Delivery format" | Three separate hand-written row lists | One `techSpecRows()` + `TECHSPEC_LABELS` |

B-2 and B-3 were both carried as open items in the Phase T continuation notes.

---

## 2. Removed

Nothing was removed without a replacement covering it.

| Removed | Replaced by | Notes |
|---|---|---|
| `findNearestHospital()`, `findNearestParking()` | `findNearestAmenity(kind, …)` | Identical Overpass queries differing only in tag + radii, now in `AMENITY_SEARCH` |
| `lookupHospitalForForm()`, `lookupParkingForForm()` | `lookupAmenityForForm(kind)` | Identical flows differing only in noun + target field |
| 4 hand-rolled clipboard implementations | `copyText()` | Two had a textarea fallback, two had none at all |
| 3 hand-rolled "Saved" status flashes | `flashStatus()` | |
| 3 duplicated tech-spec `[label, value]` row lists | `techSpecRows()` + `TECHSPEC_LABELS` | See B-9 |
| 3 hand-built tech-spec id-casing loops | `techSpecFieldId()` | |
| The six tech-spec inputs, written out twice | `techSpecFieldsHTML(prefix)` | |
| Stale copy referring to a "Build tab" that no longer exists | Correct tab names | |

---

## 3. Consolidated (behaviour-preserving)

| Was | Now | Call sites collapsed |
|---|---|---|
| Inline `.find`/`.filter`/`.sort` for the same records, everywhere | `projById` `currentProject` `crewById` `dayById` `locById` `currentDay` `projectDays` `projectCrew` `selectedDayLocation` `refreshCrewDatabase` | **~104** |
| 4 copies of the collapsible group header | `deptHeaderHTML()` | 4 |
| 4 copies of the "Expand all · Collapse all" strip | `expandCollapseAllHTML()` | 4 |
| 2 identical collapsible-block toggle pairs (Preview `pv`, Shoot Day `sd`) | `toggleBlock()` / `setAllBlocksCollapsed()` / `applyBlockState()` | 4 functions → 3 |
| 8 camera-edit functions ending in the same 3 lines | `commitCameras()` | 8 |
| 2 near-identical day-form amenity summaries | `updateAmenityDisplay()` + `amenityLine()` | 2 |

Breakdown of the ~104: 22 `currentProject()`, 15 `currentDay()`, 9 `projectDays()`,
14 `crewById()`, 7 `projById()`, 6 `locById()`, 5 `dayById()`, 4 `selectedDayLocation()`,
12 `refreshCrewDatabase()` (accumulated across the new filter/sort/admin controls),
plus the clipboard, status-flash and camera-tail collapses.

**Data-model note:** this is the change most aligned with the stated philosophy.
`projectDays()` in particular now guarantees day-order sorting everywhere; previously
each screen re-sorted for itself, which is exactly how B-1-style drift starts.

**Deliberately left alone:** filter-by-day, delete-by-project, `findIndex` and
find-by-name calls — genuinely different operations, not duplication.

---

## 4. Visual / UX changes

| Change | Rationale |
|---|---|
| Tech-spec labels sit **beside** boxes sized to their content (62px for "25p", 156px for "S-Log3 CineGamut3") instead of six identical full-width boxes under their labels; fields flow and wrap rather than a rigid 3-up grid | The named "right-sized inputs" item |
| "Shot numbering" select + hint onto one row via a reusable `.field-inline` | Same principle, applied to the one-off field with the same problem |
| "Remove" word buttons → trash icons (new `ICONS.trash`), keeping `title` + `aria-label`, with the label naming the specific person/location | "Icons over words"; the named example |
| `+ Add camera` no longer stretches its column | Noticed in review |
| Keyboard: **Enter toggles**, Home/End jump to row ends | Enter-to-toggle was the one genuinely missing piece; arrow navigation already existed and was kept (and fixed — B-4, B-5) |

**Not changed, deliberately:** Catering's three-row Breakfast/Lunch/Dinner layout —
flagged as an accepted exception, so it was left alone.

---

## 5. Mobile

| Change | Rationale |
|---|---|
| Day chips: the **whole chip is the toggle** — native checkbox stretched invisibly across it (`inset:-1px` so the border ring is tappable), state read from chip fill + tick | Removes the redundant box-beside-label; fits more chips per row; full 44px target. Keyboard focus, change events and a11y verified intact, plus a `focus-visible` ring |
| Schedule row → explicit grid areas: one control strip, then three fields | Rows were nearly a full screen tall each (B-6) |
| Hover-only "insert row here" becomes a permanently visible button on touch | Touch can't hover; the alternative was silently losing mid-schedule insertion on mobile |
| Schedule delete no longer a full-width bar | It was stretching across the card |
| Per-person actions move below the day chips with a divider; empty action rows collapse | They were floating right in an otherwise empty row |
| Overflowing tab strips get an edge-fade cue that clears at the end of the scroll | A cut-off tab previously just looked clipped (the scrollbar is hidden) |
| `icon-btn` touch targets 34px → 40px | Below comfortable minimum |

Desktop was re-verified after the mobile work: real checkboxes, visible header strip,
compact arrows, hover-only insert hint, and the mobile schedule grid confirmed **not**
leaking outside its `@media(max-width:900px)` block. 25/25 desktop checks pass.

---

## 6. What to spot-check by hand

These were exercised programmatically against synthetic data, but they touch saved
records, so they're worth a human eye against the real Supabase data:

1. **T-6.3 / Excel export** — open a day that has *not* overridden tech specs and confirm the Preview tech specs block and the Excel "Tech Specs" sheet now show the project defaults rather than being empty. This is B-1, the highest-value fix.
2. **T-5.5** — override a tech spec on one day; confirm the "differs from project defaults" banner still appears and "Reset to project defaults" still clears it.
3. **D-1** — "+ Add crew member" on the Crew Database now opens the form (B-2). Confirm saving a new person from there still works and still lands in the right department.
4. **T-2.2** — the trash icon now removes a crew member from the project. Confirm it behaves as expected and the tooltip names the right person.
5. **T-2.2 on a phone** — confirm the stray D1/D2/D3 block is gone (B-3) and tapping a day chip toggles it.
6. **T-4.1 / T-5.5** — confirm tech spec values still save and reload correctly in both forms, since both now share one markup generator and one read/write path.

---

## 7. Not done / open

- **Two places still write `crew.role`-adjacent data**: T-2.1 (Roles) is now the only place role/department/Show-as are edited — Phase S already removed the per-row quick-edit from T-2.2, so the overlap I would have flagged has *already been resolved upstream*. No action needed.
- `shiftScheduleTimes(delta, onlySelected)` is only ever called with `onlySelected = true`; the parameter is vestigial. Harmless, left in place.
- The legacy `cameras.assign` migration path in `normalizeCameras()` was left untouched — still needed for existing saved data.
- Crew records still carry a legacy `dietary` field read as a fallback beside `dietarySpecific`. Left in place for the same reason.
- Branch `phase-u-on-stale-base` can be deleted once this pass is accepted.
