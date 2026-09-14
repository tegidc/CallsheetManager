/**
 * Call Sheet App ↔ Google Sheet — crew database mirror
 * =====================================================
 * This script lives INSIDE the Google Sheet and is what the app talks to.
 * It is deliberately tiny: read the "Crew" tab, replace the "Crew" tab,
 * write ids back into new rows, and copy Google Form submissions in.
 *
 * ONE-TIME SETUP (about five minutes)
 *   1. Open (or create) the Google Sheet you want to use as the mirror.
 *   2. Extensions ▸ Apps Script. Delete whatever is in the editor, paste this whole
 *      file, and press Save (the disk icon). Name the project anything, e.g. "Crew sync".
 *   3. Deploy ▸ New deployment ▸ (gear icon) Web app.
 *        Description:     Crew sync
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Press Deploy, authorise when asked (it only needs access to this spreadsheet),
 *      then copy the "Web app URL" — it ends in /exec.
 *   4. In the app: Crew database ▸ Settings ▸ Google Sheet. Paste the URL, press
 *      "Test connection". Then press "Send to sheet" once to write the columns.
 *   5. Reload the spreadsheet: a "Crew sync" menu appears next to Help. Its
 *      "Apply dropdowns & formatting" item gives the Department / Dietary / Yes-No
 *      columns their dropdowns, bolds and freezes the header, and forces text
 *      format. "Send to sheet" does the same thing automatically every time.
 *
 * VIEWS (like Notion's)
 *   Crew sync ▸ View: All / Essential / Additional / Kit. A view hides every column
 *   not in its list — same rows, still editable, nothing is copied anywhere. Edit
 *   the VIEWS table below to change what each one shows. Hidden columns are still
 *   read and written by the app, so a view never affects the sync.
 *
 * AFTER EDITING THIS SCRIPT
 *   Deploy ▸ Manage deployments ▸ (pencil) ▸ Version: New version ▸ Deploy.
 *   The URL stays the same. (A plain Save does NOT update the live web app.)
 *
 * OPTIONAL — a Google Form for new crew
 *   Create a Google Form whose question titles match the Crew tab's column
 *   headers exactly (e.g. "Name", "Department", "Role", "Phone", "Email",
 *   "Dietary (general)", …). In the form: Responses ▸ Link to Sheets ▸ pick THIS
 *   spreadsheet. Then, back in Apps Script: Triggers (alarm-clock icon) ▸ Add trigger:
 *        Function: onFormSubmit · Event source: From spreadsheet · Event type: On form submit
 *   Each submission is copied onto the end of the Crew tab; press "Load from sheet"
 *   in the app to bring the new people in.
 *
 * SAFETY
 *   Anyone who has this URL can read and rewrite the Crew tab, so treat it like a
 *   password: it lives in the app's settings, nowhere public. To revoke it, delete the
 *   deployment (Deploy ▸ Manage deployments ▸ archive) and make a new one.
 */

const SHEET_NAME = 'Crew';   // the tab the app mirrors — rename here if you prefer another
const ID_HEADER  = 'id';     // the app's record id; the app writes it, please don't edit it

// Dropdowns, by column header. Keep the two lists in step with the app
// (DEPARTMENTS / DIETARY_OPTIONS in index.html) — the app treats anything else as "Other".
const DROPDOWNS = {
  'Department':        ['Production','Client','Talent','Cinematography','Audio','Grip','Equipment','Set','Vanities','Catering & Travel','Post Production','Other'],
  'Dietary (general)': ['Meat & Fish','Vegetarian','Vegan','Pescatarian'],
  'VAT registered':    ['Yes','No'],
  'Drives':            ['Yes','No'],
  'Head of Dept':      ['Yes','No'],
};
const MAX_ROWS = 2000;   // how far down the dropdowns and text format reach

// Column views, by header. null = show everything. Name is always kept visible.
const VIEWS = {
  'All':        null,
  'Essential':  ['Name','Phone','Email','Department','Role','Saved roles','Fee / rate'],
  'Additional': ['Name','Department','Role','Show as','Company','Home address','Shoe size','Clothing size',
                 'Dietary (general)','Dietary (specific)','Coffee / tea order','Drives','Car make / model','Registration',
                 'VAT registered','Invoices as','Head of Dept','Instagram','YouTube','LinkedIn','Previous projects','Notes','Private notes'],
  'Kit':        ['Name','Department','Role','Main camera 1','Main camera 2','Main camera 3','Other equipment','Skills'],
};

/* ---------- menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Crew sync')
    .addItem('View: All', 'viewAll')
    .addItem('View: Essential', 'viewEssential')
    .addItem('View: Additional', 'viewAdditional')
    .addItem('View: Kit', 'viewKit')
    .addSeparator()
    .addItem('Apply dropdowns & formatting', 'applyCrewFormatting')
    .addToUi();
}
function viewAll()        { showView_('All'); }
function viewEssential()  { showView_('Essential'); }
function viewAdditional() { showView_('Additional'); }
function viewKit()        { showView_('Kit'); }
/* Show every column, then hide the ones the view leaves out. Column order is
   untouched, so switching back to All restores the sheet exactly. */
function showView_(name) {
  const sh = sheet_();
  const headers = headers_(sh);
  if (!headers.length) return;
  sh.showColumns(1, sh.getMaxColumns());
  const keep = VIEWS[name];
  if (!keep) return;
  headers.forEach((h, i) => {
    if (h === 'Name' || keep.includes(h)) return;
    sh.hideColumns(i + 1);
  });
  sh.setActiveSelection('A1');
}
/* Dropdowns on the columns above, bold frozen header, plain-text format on every
   cell so phone numbers and shoe sizes are never reinterpreted. Safe to run any
   time; "Send to sheet" runs it too. */
function applyCrewFormatting() {
  const sh = sheet_();
  const headers = headers_(sh);
  if (!headers.length) return;
  if (sh.getMaxRows() < MAX_ROWS) sh.insertRowsAfter(sh.getMaxRows(), MAX_ROWS - sh.getMaxRows());
  const width = headers.length;
  sh.getRange(1, 1, MAX_ROWS, width).setNumberFormat('@');
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#017756').setFontColor('#FFFFF5');
  sh.setFrozenRows(1);
  headers.forEach((h, i) => {
    const list = DROPDOWNS[h];
    if (!list) return;
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true)
      .setHelpText(h + ': pick one, or leave blank.').build();
    sh.getRange(2, i + 1, MAX_ROWS - 1, 1).setDataValidation(rule);
  });
  const idCol = headers.indexOf(ID_HEADER) + 1;
  if (idCol) sh.getRange(2, idCol, MAX_ROWS - 1, 1).setFontColor('#999999');
}

/* ---------- helpers ---------- */
function sheet_() {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function headers_(sh) {
  const lastCol = sh.getLastColumn();
  if (!lastCol) return [];
  return sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(h => String(h).trim());
}
/* Every non-empty row as {header: text}, plus _row (its 1-based sheet row) so the
   app can write an id back into exactly that row. Display values, so a phone
   number typed as 07700 900123 comes back as typed rather than as a number. */
function readAll_() {
  const sh = sheet_();
  const values = sh.getDataRange().getDisplayValues();
  if (!values.length) return { headers: [], rows: [] };
  const headers = values[0].map(h => String(h).trim());
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const line = values[r];
    if (line.every(v => String(v).trim() === '')) continue;
    const obj = { _row: r + 1 };
    headers.forEach((h, i) => { if (h) obj[h] = String(line[i] == null ? '' : line[i]).trim(); });
    rows.push(obj);
  }
  return { headers, rows };
}

/* ---------- GET: the app reads the sheet ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const ss = SpreadsheetApp.getActive();
  if (p.ping) {
    return json_({ ok: true, ping: true, spreadsheet: ss.getName(), url: ss.getUrl(),
                   sheet: SHEET_NAME, rows: Math.max(0, sheet_().getLastRow() - 1) });
  }
  const data = readAll_();
  return json_({ ok: true, headers: data.headers, rows: data.rows, url: ss.getUrl() });
}

/* ---------- POST: the app writes to the sheet ---------- */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'The request was not valid JSON.' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'replace')  return json_(replaceAll_(body.headers || [], body.rows || []));
    if (body.action === 'writeIds') return json_(writeIds_(body.ids || []));
    return json_({ ok: false, error: 'Unknown action: ' + body.action });
  } finally {
    lock.releaseLock();
  }
}

/* "Send to sheet": the whole Crew tab is rewritten from the app. */
function replaceAll_(headers, rows) {
  const sh = sheet_();
  const width = headers.length;
  if (!width) return { ok: false, error: 'No columns supplied.' };
  sh.clearContents();
  const grid = [headers].concat(rows.map(r => {
    const out = (r || []).slice(0, width).map(v => v == null ? '' : v);
    while (out.length < width) out.push('');
    return out;
  }));
  // Force text so the sheet never "helpfully" turns a phone number into 7700900123
  // or a shoe size like 9.5 into a date.
  sh.getRange(1, 1, grid.length, width).setNumberFormat('@').setValues(grid);
  applyCrewFormatting();
  return { ok: true, written: rows.length };
}

/* "Load from sheet": after the app creates records for rows that had no id, it
   writes each new id into that row — only if the row still has no id and still
   carries the same name, so a row that moved or changed underneath us is skipped
   rather than mislabelled. */
function writeIds_(ids) {
  const sh = sheet_();
  let headers = headers_(sh);
  if (headers.indexOf(ID_HEADER) === -1) {
    sh.insertColumnBefore(1);
    sh.getRange(1, 1).setValue(ID_HEADER).setFontWeight('bold');
    headers = headers_(sh);
  }
  const idCol   = headers.indexOf(ID_HEADER) + 1;
  const nameCol = headers.findIndex(h => h.toLowerCase() === 'name') + 1;
  let written = 0; const skipped = [];
  ids.forEach(item => {
    const row = Number(item.row);
    if (!row || row < 2) { skipped.push(item.row); return; }
    const cur = String(sh.getRange(row, idCol).getDisplayValue()).trim();
    const curName = nameCol ? String(sh.getRange(row, nameCol).getDisplayValue()).trim() : String(item.name || '').trim();
    if (cur !== '' || curName !== String(item.name || '').trim()) { skipped.push(row); return; }
    sh.getRange(row, idCol).setNumberFormat('@').setValue(item.id);
    written++;
  });
  return { ok: true, written, skipped };
}

/* ---------- Optional: Google Form submissions ---------- */
/* Installable trigger (see the header). Copies a response onto the end of the Crew
   tab, matching form question titles to Crew column headers, case-insensitively.
   Questions that don't match a column are ignored; columns with no question stay blank. */
function onFormSubmit(e) {
  const sh = sheet_();
  const headers = headers_(sh);
  if (!headers.length) return;
  const nv = (e && e.namedValues) || {};
  const norm = s => String(s).trim().toLowerCase();
  const keys = Object.keys(nv);
  const row = headers.map(h => {
    if (!h || h === ID_HEADER) return '';
    const k = keys.find(q => norm(q) === norm(h));
    return k ? (nv[k] || []).filter(Boolean).join(', ') : '';
  });
  if (!row.some(v => String(v).trim() !== '')) return;
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), 1, 1, headers.length).setNumberFormat('@');
}
