# Deeper restructure — proposal (not yet done)

*Written 15 Aug 2026. This is the "how I would do it" log requested alongside the safe cleanup. Nothing in here has been applied.*

## The situation in plain terms

The whole app lives in one file, `index.html` — about 13,800 lines. Roughly:

- **Lines 13–1854** — all the styling (colours, fonts, layout rules)
- **Lines 1856–1882** — the page skeleton (very small; almost everything on screen is built by the code below)
- **Lines 1891–13803** — all the app logic: 488 functions covering every tab, export, and the database connection

One file has real advantages for how we work: I can always see everything, there's no build step, and GitHub Pages serves it directly. But at this size it has three growing costs:

1. **Risk of accidental breakage.** Every change, however small, edits the same file that contains everything else. A stray character in a Budget change can break Roles.
2. **Slower editing sessions.** Reading and searching 13,800 lines takes more of every session's effort before any real work starts.
3. **First-load size.** Visitors download ~900KB of page before anything appears. On set with poor signal, that's noticeable.

## What I would do, in order of bang-for-buck

### Step 1 — Split the styling out (low risk)
Move the 1,840 lines of CSS into a separate `styles.css` file. The browser treats this almost identically; the app looks and behaves the same. Benefit: style changes can never break app logic again, and the main file shrinks by ~13%.

### Step 2 — Split the code into one file per tab (medium risk, biggest win)
The code already thinks in tabs — Overview, Crew, Shoot Days, Locations, Budget, Roles, Call Sheet export — and MAP.md already documents which functions belong to which. I'd cut along those seams: one file per tab plus one "shared" file for the lookups every tab uses. `index.html` would become a short skeleton that loads them.

Why medium risk: functions currently share one big room; after the split they'd need explicit doorways between files. Most of that is mechanical, but a missed doorway = a broken button, so it needs a full click-through test of every tab afterwards. I'd do it one tab at a time, testing between each, starting with the tab you use least.

### Step 3 — A tiny build step (optional, only if 1–2 go well)
A one-command bundler that stitches the files back into one for publishing. Keeps GitHub Pages working exactly as now and lets us minify (squeeze) the shipped code — first load could drop by half or more. Cost: publishing becomes "run one command, then push" instead of just "push". I'd only suggest this once the split has proven stable.

### What I would NOT do
- No framework (React etc.). The app's plain-JavaScript approach works, and a framework rewrite would be months of risk for little visible gain.
- No database schema changes as part of this. Restructure is about code layout only.

## Effort and testing burden on you

- Step 1: you'd re-check the site loads and looks right — 10 minutes.
- Step 2: a proper click-through of every tab after each tab is split — a few sessions, best done tab by tab so any breakage is easy to trace.
- Step 3: nothing visible; you'd learn one new publish step.

## Recommendation

If the app is going to keep growing (more tabs, more phases), Steps 1–2 pay for themselves quickly and make every future session cheaper and safer. If the app is close to feature-complete, Step 1 alone is still worth it and Steps 2–3 can wait indefinitely.
