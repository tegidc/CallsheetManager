/* sample-data.js — the first-run sample project (OFTV) and the three data-shape
   converters it needs, moved out of index.html on 15 Aug 2026 (decisions D6/D7).

   Loaded ON DEMAND by initApp(), only when the database is completely empty and
   healthy — i.e. a genuine first-ever run. Ordinary loads never fetch this file.

   The three converters below (crew entries, shoot opt-in, phase members) used to
   run on every page load; the live data has been verified fully converted, so they
   now exist only to bring the freshly-seeded sample (which is written in the older
   crewIds shape) up to the current shape, exactly as they always did on first run.

   ⚠️ If a pre-BF backup row (backup_pre_BF_*, old crewIds shape) is ever restored
   into db:projects by hand, load this file and run migrateCrewEntries() +
   migrateOnShoot() + migratePhaseMembers() once — the app itself no longer does. */

/* ---- the migration ----
   Runs once from initApp(), before the first render, and is IDEMPOTENT: a project that
   already carries crewEntries is skipped, so re-running it (a reload, a second tab) can
   never re-migrate or duplicate. It writes its backup keys BEFORE any migration write,
   and only when there is actually something to migrate — a no-op load writes nothing at
   all. Returns a short report for the console.

   One entry per (project, person), carrying that person's role/department at migration
   time and their existing per-project rate override, so a person with one role is
   indistinguishable from how they looked before this ran. Positions and per-day crew
   overrides are rekeyed crewId→entryId in the same pass. Hotel, travel and catering are
   deliberately NOT touched. */
async function migrateCrewEntries(){
  const stale = projectsDB.filter(p=>!Array.isArray(p.crewEntries));
  if(!stale.length) return null;
  const stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const prefix = `backup_pre_BF_${stamp}`;
  // Backup first, always — three collections, because positions and crewOverrides move
  // too. If any backup write fails, stop: no migration write happens.
  for(const [key, val] of [['db:projects', projectsDB], ['db:shootdays', shootDaysDB], ['db:crew', crewDB]]){
    const res = await saveDB(`${prefix}:${key}`, val);
    if(res && res.ok===false){ console.error('[BF] backup failed, migration aborted:', key, res); return {aborted:key}; }
  }
  const report = { backupPrefix:prefix, projects:0, entries:0, positions:0, overrides:0, rates:0, orphanPositions:0 };
  stale.forEach(p=>{
    const map = {};   // crewId -> entryId, for rekeying this project's days
    p.crewEntries = (p.crewIds||[]).map(crewId=>{
      const c = crewById(crewId);
      const e = { id: uid(), crewId,
        role: (c&&c.role)||'', department: (c&&c.department)||'' };
      const ov = (p.crewRateOverrides||{})[crewId];
      if(ov!==undefined && ov!==null && !isNaN(Number(ov))){ e.rate = Number(ov); report.rates++; }
      map[crewId] = e.id;
      return e;
    });
    report.projects++; report.entries += p.crewEntries.length;
    shootDaysDB.filter(d=>d.projectId===p.id).forEach(d=>{
      if(Array.isArray(d.positions)){
        // An unmappable position has no entry to point at. Drop it rather than leave a
        // dangling id — it was already invisible (the roster is what every screen
        // renders from), and the count is reported rather than swallowed.
        const before = d.positions.length;
        d.positions = d.positions.map(pos=>{
          const eid = map[pos[0]];
          return eid ? [eid, ...pos.slice(1)] : null;
        }).filter(Boolean);
        report.positions += d.positions.length;
        report.orphanPositions += before - d.positions.length;
      }
      if(d.crewOverrides && Object.keys(d.crewOverrides).length){
        const next = {};
        Object.keys(d.crewOverrides).forEach(crewId=>{
          const eid = map[crewId];
          if(eid){ next[eid] = d.crewOverrides[crewId]; report.overrides++; }
        });
        d.crewOverrides = next;
      }
    });
    delete p.crewIds;
    delete p.crewRateOverrides;
  });
  await saveDB('db:projects', projectsDB);
  await saveDB('db:shootdays', shootDaysDB);
  console.info('[BF] crew entries migration:', report);
  return report;
}

/* Seed p.onShoot with EVERY entry on the project, once, so the list is complete and
   authoritative from then on.

   ⚠️ Everyone ON, not just those with day ticks. Today every person on a project appears
   in the Production grid; seeding only the ticked ones would silently hide anybody not
   yet scheduled — including the people you were about to schedule, leaving nowhere to
   tick them. Seeding everyone reproduces exactly the behaviour that was there the moment
   before, and unticking is then a thing you choose rather than something that happened
   to you on upgrade.

   Same contract as the migrations above: writes nothing once every project has a list,
   backs up db:projects before the first write, aborts on a failed backup. */
async function migrateOnShoot(){
  /* ⚠️ Gated on its own MARKER, not on the list being absent. c0e2270 shipped a version
     where entryOnShoot() fell back to "has a day ticked", so unticking anyone created an
     `onShoot: []` that meant "no explicit opt-ins yet" while everyone still read as on
     the shoot. Under the authoritative rule the same empty array means "nobody is on the
     shoot" — so seeding only when the key is MISSING would have silently blanked the
     entire shoot of any project upgraded from that build. A marker separates "never
     seeded" from "seeded, and you have since unticked everyone", which are different
     facts that an empty array cannot tell apart. */
  const stale = projectsDB.filter(pr=>!pr.onShootInit);
  if(!stale.length) return null;
  const stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const key = `backup_pre_ONSHOOT_${stamp}:db:projects`;
  const res = await saveDB(key, projectsDB);
  if(res && res.ok===false){ console.error('[ONSHOOT] backup failed, migration aborted:', res); return {aborted:key}; }
  const report = { backupKey:key, projects:0, entries:0 };
  stale.forEach(pr=>{
    pr.onShoot = (pr.crewEntries||[]).map(e=>e.id);
    pr.onShootInit = true;
    report.projects++; report.entries += pr.onShoot.length;
  });
  await saveDB('db:projects', projectsDB);
  console.info('[ONSHOOT] shoot opt-in seeded:', report);
  return report;
}

/* Phase BU — the same opt-in list for PREP and the EDIT, so all three phases are one
   shape and Roles' Stage mode has something authoritative to tick. See CREW_PHASES for
   why a derived "do they have days" is not good enough.

   ⚠️ SEEDED FROM THE DERIVATION, not from everyone — and that is the difference from
   migrateOnShoot() above, for the same underlying reason. Its rule is "reproduce exactly
   the behaviour of the moment before": every person on a project DID appear in the
   Production grid, so seeding everyone was what reproduced it. The phase tabs have never
   shown everyone — they list whoever has days or date marks — so here it is that same
   predicate that reproduces it. Seeding everyone would drop all 66 crew onto Pre-Prod and
   Post overnight; seeding nobody would hide real bookings. Neither is what was there.

   Same contract as every migration above: gated on its own MARKER rather than on the list
   being absent (an empty list means "you have unticked everyone", which is a different
   fact from "never seeded" and an array cannot tell them apart), backs up db:projects
   before the first write, aborts on a failed backup, writes nothing once seeded. */
async function migratePhaseMembers(){
  const phases = CREW_PHASES.filter(ph=>ph.view!=='days');   // production is migrateOnShoot's
  const stale = projectsDB.filter(pr=>phases.some(ph=>!pr[ph.init]));
  if(!stale.length) return null;
  const stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const key = `backup_pre_PHASEMEMBERS_${stamp}:db:projects`;
  const res = await saveDB(key, projectsDB);
  if(res && res.ok===false){ console.error('[PHASEMEMBERS] backup failed, migration aborted:', res); return {aborted:key}; }
  const report = { backupKey:key, projects:0, preprod:0, post:0 };
  stale.forEach(pr=>{
    phases.forEach(ph=>{
      if(pr[ph.init]) return;
      const sched = pr[PHASE_TABS[ph.view].store] || {};
      pr[ph.members] = (pr.crewEntries||[])
        .map(e=>e.id)
        .filter(id=>{ const r = sched[id]; return !!(r && (r.days!=null || (r.dates||[]).length)); });
      pr[ph.init] = true;
      report[ph.view==='preprod'?'preprod':'post'] += pr[ph.members].length;
    });
    report.projects++;
  });
  await saveDB('db:projects', projectsDB);
  console.info('[PHASEMEMBERS] prep/edit opt-in seeded:', report);
  return report;
}

async function seedSampleData(){
  // ---- crew (name, role, department, phone) ----
  const crewSeed = [
    ['Justin Schoenrock','Director/EP','Production',''],
    ['Olivia Arnold','OFTV - UK','Client',''],
    ['Julia Pomis','OFTV - US','Client',''],
    ['Paul Buscemi','EIC','Production','323-309-8088'],
    ["Michael O'Brien",'Executive Producer','Production','310-497-7294'],
    ['Alex Ovaida','Producer','Production','818-437-7943'],
    ['Taylor Hingtgen','Producer','Production','319-929-3939'],
    ['Nestor Ruesga','Technical Supervisor','Production','702-883-6811'],
    ['Tegid Cartwright','DP / UK Producer','Cinematography','07805 984910'],
    ['Sabrina Goreeba','Line Producer / Production Manager','Production','07956 442492'],
    ['Matt Wells','Field Producer','Production','07840 140940'],
    ['Karim D Clarke','Camera #3','Cinematography','07780 689853'],
    ['Alex Magill','Gaffer','Grip','07809 464496'],
    ['Richard Scott','Spark','Grip','07813622069'],
    ['Kevin W. Malbas','Spark','Grip','07944639094'],
    ['Daniel Kirwan-Baez','Spark','Grip','+44 7356 294924'],
    ['Callum Turnor','Spark','Grip','07769 822849'],
    ['Amrita Bisla','Set Designer','Set','7969689131'],
    ['Hana Koza','Set Assist #1','Set','07548235823'],
    ['Ishavishali Chandrakumar','Set Assist #2','Set','+44 7472 471108'],
    ['Sam Charlton','Driver / Runner','Production','07398 340789'],
    ['Hassan Al Rikhabi','Security','Other','07920397456'],
    ['Mario Prifti','Security','Other','07835790129'],
    ['Jamie Brindle','Rigger','Grip','+44 7908 538544'],
    ['Sid Ellisdon','Driver / Runner','Production','07555366533'],
    ['Alisha Shaw','PA #1','Production','07907 554089'],
    ['Stella Moss','PA #2','Production','07907 554089'],
    ['Heather Bradley','Runner / First Aid','Production','+44 7801 292503'],
    ['Patch Boshell','DJ / Tech','Audio','+44 7496 790121'],
    // --- added from Days 2-6 (Wedding 1, 90's Flat, Detective, Museum, Wedding 2) ---
    ['Nicole McClain','Post-Production Supervisor','Production','708-837-8646'],
    ['Mark Bricker','Strategic Media Team - Director','Production','702-461-9585'],
    ['Harrison Ferrante','Strategic Media Team - DP','Cinematography','706-910-4569'],
    ['Spenser Sease','Photographer','Cinematography','804-467 3762'],
    ['Emily Black','Host','Talent',''],
    ['Lewis Buchan','Emily Black BTS team','Production',''],
    ['Jessica Phillips','Emily Black BTS team','Production',''],
    ['George Pearton','Camera #1','Cinematography','07989 693522'],
    ['Charlie De La Hunt','Camera #2','Cinematography','+44 7753 279111'],
    ['Konrad Frost','Camera #4','Cinematography','00447968750351'],
    ['Meurig Marshall','AC #1','Cinematography','+44 07747547666'],
    ['Alina Kosolova','AC #2','Cinematography','44 7835 429152'],
    ['Mark Levien','Soundie Mixer','Audio','07765 443301'],
    ['Joe Worthy','Soundie','Audio','+44 7727 916392'],
    ['Jojo Copeman','HMU','Vanities','+44 7854 428315'],
    ['Eden Ward','HMU Assist','Vanities','07714303641'],
    ['Brian De Carvalho','Costume','Vanities','+44 7967 937316'],
    ['Angel Leatherwood','Costume Assist','Vanities','+44 7414 743836'],
    ['Kai','Security','Other','07458 317794'],
    ['Josh Bister','DIT','Post Production','07568 513038'],
    ['Billie Billington','PA #1','Production','07900 215943'],
    ['Freya Mallard','Guest / Show MC','Talent',''],
    ['Sarah Jayne Dunn','Team A - Guest','Talent',''],
    ['James Sutton','Team A - Guest','Talent',''],
    ['Scarlett Howard','Team A - Guest','Talent',''],
    ['Sophie Stonehouse','Team A - Guest','Talent',''],
    ['Hannah Elizabeth','Team B - Guest','Talent',''],
    ['Elizabeth Vasilenko','Team B - Guest','Talent',''],
    ['Keiran Lee','Team A - Guest','Talent',''],
    ['Danny D','Team A - Guest','Talent',''],
    ['Lauren Alexis','Team B - Guest','Talent',''],
    ['Kailah Bird','Team B - Guest','Talent',''],
    ['Rebecca Goodwin','Team A - Guest','Talent',''],
    ['Lena Polanski','Team A - Guest','Talent',''],
    ['Vanessa Neumann','Team B - Guest','Talent',''],
    ['Stefan Garlicki','Team B - Guest','Talent',''],
    ['Meg Prescott','Team A - Guest','Talent',''],
    // --- LMAOF (May 2, The Bill Murray) only ---
    ['Tomas Solt','Camera #1','Cinematography','07989 693522'],
    ['Jason Cleaver','AC #1','Cinematography','07543 062'],
    ['Steve Bugeja','Comic — Show 1','Talent',''],
    ['Michelle Shaugnessy','Comic — Show 1','Talent',''],
    ['Becky Umbers','Comic — Show 1','Talent',''],
    ['Patrick Spicer','Comic — Show 1','Talent',''],
    ['Kelly Ford','Comic — Show 1','Talent',''],
    ['Estfania Baha','Comic — Show 2','Talent',''],
    ['James Barr','Comic — Show 2','Talent',''],
    ['Kate Barron','Comic — Show 2','Talent',''],
    ['Cecily Hitchcock','Comic — Show 2','Talent',''],
  ];
  const nameToId = {};
  crewSeed.forEach(([name,role,dept,phone])=>{
    const rec={ id:uid(), name, role, department:dept, phone, email:'', skills:'',
      camera1:'', camera2:'', camera3:'', cameraExtras:'', dietary:'', shoeSize:'', clothingSize:'',
      vatRegistered:'', drives:'', carMakeModel:'', carReg:'', homeAddress:'', rate:'', notes:'' };
    // give the DP a couple of cameras + a tag so the equipment/skills fields have something to show
    if(name==='Tegid Cartwright'){ rec.camera1='Sony FX9'; rec.camera2='FX3'; rec.skills='DOP, drone, colourist'; rec.drives='Yes'; rec.carMakeModel='VW Transporter'; rec.carReg='LF21 XYZ'; rec.vatRegistered='Yes'; rec.rate='£600/day'; rec.coffeeOrder='Flat white, no sugar'; rec.previousProjects='ROW 2025, LMAOF S2'; rec.instagram='@tegidshoots'; }
    if(name==='Karim D Clarke'){ rec.camera1='Sony FX6'; rec.skills='Steadicam, gimbal'; rec.coffeeOrder='Americano, oat milk'; }
    // Strategic Media Team are an external outfit on this shoot — exercises the co-production grouping
    if(['Mark Bricker','Harrison Ferrante','Spenser Sease'].includes(name)){ rec.coProductionCompany='Strategic Media Team'; }
    if(name==='Emily Black'){ rec.dietaryGeneral='Vegetarian'; rec.coffeeOrder='Oat latte'; }
    if(name==='Sabrina Goreeba'){ rec.dietarySpecific='No nuts'; rec.coffeeOrder='Builders tea, one sugar'; }
    if(name==='Alex Magill'){ rec.drives='Yes'; rec.carMakeModel='Ford Transit'; rec.carReg='BD70 KLM'; rec.coffeeOrder='Black coffee'; }
    crewDB.push(rec); nameToId[name]=rec.id;
  });
  const P=(name,call,note,camera)=>[nameToId[name],call,note||'',camera||''];

  // ---- location: The Organ Factory (ROW studio, days 1-6) ----
  const loc={ id:uid(), name:'The Organ Factory (Hackney Studios)', address:"St Peter's Square, London, E2 7AF",
    lat:51.5292, lon:-0.0644,   // approximate — re-pin via address search for exact coords
    onsiteContactName:'Matt Peberdy', onsiteContactPhone:'07816 996325',
    accessInfo:'Load in via main yard. US crew based at Hart Shoreditch Hotel, ~10 mins away.',
    recceInfo:'', parkingInfo:'Sprinter/mini vans on site. Set drop-off & pick-up at main entrance.',
    hospital:{ name:'The Royal London Hospital', address:'Whitechapel Rd, London E1 1FR', phone:'020 7377 7000', distanceKm:'3.5' } };
  locationsDB.push(loc);

  // ---- ROW project (6 days, Apr 26 - May 1) ----
  const rowCrewNames = ['Justin Schoenrock','Olivia Arnold','Julia Pomis','Paul Buscemi',"Michael O'Brien",'Alex Ovaida',
    'Taylor Hingtgen','Nestor Ruesga','Tegid Cartwright','Sabrina Goreeba','Matt Wells','Karim D Clarke','Alex Magill',
    'Richard Scott','Kevin W. Malbas','Daniel Kirwan-Baez','Callum Turnor','Amrita Bisla','Hana Koza','Ishavishali Chandrakumar',
    'Sam Charlton','Hassan Al Rikhabi','Mario Prifti','Jamie Brindle','Sid Ellisdon','Alisha Shaw','Stella Moss','Heather Bradley',
    'Patch Boshell','Nicole McClain','Mark Bricker','Harrison Ferrante','Spenser Sease','Emily Black','Lewis Buchan','Jessica Phillips',
    'George Pearton','Charlie De La Hunt','Konrad Frost','Meurig Marshall','Alina Kosolova','Mark Levien','Joe Worthy','Jojo Copeman',
    'Eden Ward','Brian De Carvalho','Angel Leatherwood','Kai','Josh Bister','Billie Billington','Freya Mallard','Sarah Jayne Dunn',
    'James Sutton','Scarlett Howard','Sophie Stonehouse','Hannah Elizabeth','Elizabeth Vasilenko','Keiran Lee','Danny D','Lauren Alexis',
    'Kailah Bird','Rebecca Goodwin','Lena Polanski','Vanessa Neumann','Stefan Garlicki','Meg Prescott'];
  const proj={ id:uid(), client:'OFTV', title:'ROW 2026 London', startDate:'2026-04-26', company:COMPANY,
    logline:'Multi-day studio shoot across six themed builds.', description:'Six-day London studio shoot (load-in, Wedding 1, 90s Flat, Detective, Museum, Wedding 2) for OFTV.',
    crewIds: rowCrewNames.map(n=>nameToId[n]).filter(Boolean), locationIds:[loc.id], createdAt:new Date().toISOString(),
    techSpecs:{ frameRate:'25p', resolution:'4K UHD', delivery:'HD ProRes 422', colorProfile:'S-Log3', timecode:'Free run 08:00:00:00', codec:'XAVC' },
    cameras:{ assign:{
      [nameToId['Tegid Cartwright']]:{a:'A',b:''},
      [nameToId['George Pearton']]:{a:'B',b:''},
      [nameToId['Charlie De La Hunt']]:{a:'C',b:''},
      [nameToId['Karim D Clarke']]:{a:'D',b:''},
    }, unnamed:[] } };
  projectsDB.push(proj);

  // ---- Day 1 — Apr 26, Load-in ----
  const day1={ id:uid(), projectId:proj.id, dayNum:'1', date:'2026-04-26', allCrewCall:'08:00',
    locationId:loc.id, additionalLocationIds:[],
    weather:{ temp:'20°C', precip:'10%', cond:'Sunny / Cloudy', sun:'05:43 / 20:15', fetchedAt:'sample' },
    schedule:[
      ['08:00','','Crew call / Breakfast / Briefing / walk through'],
      ['08:00 - 12:00','4hrs','Gaffer & Riggers — in Host Room'],
      ['09:00 - 15:00','6hrs','Dress Wedding 1'],
      ['13:00 - 14:00','1hr','Lunch'],
      ['14:00 - 18:00','4hrs','Gaffer set up Wedding 1'],
      ['18:30','','Leave site'],
    ],
    positions:[
      P('Tegid Cartwright','08:00','DP','A'),
      P('Sabrina Goreeba','08:00','Line Producer / PM'),
      P('Matt Wells','08:00','Field Producer'),
      P('Alex Magill','08:00','Gaffer'),
      P('Richard Scott','08:00','Spark'),
      P('Amrita Bisla','08:00','Set Designer'),
      P('Jamie Brindle','08:00','Rigger'),
      P('Karim D Clarke','16:00','Camera #3','B'),
      P('Heather Bradley','08:00','Runner / First Aid'),
      P('Sam Charlton','07:00','Driver / Runner'),
    ],
    brief:['Load-in day','Load in Wedding 1 & 2','Dress Wedding 1','Set up Host / Green Room / Crew Base'],
    parking:'Sprinter/mini vans on site. Set drop-off & pick-up at main entrance.',
    notes:'Security on site from 17:00. US crew at Hart Shoreditch Hotel.' };
  shootDaysDB.push(day1);

  // ---- Day 2 — Apr 27, Wedding 1 ----
  const day2={ id:uid(), projectId:proj.id, dayNum:'2', date:'2026-04-27', allCrewCall:'07:45',
    locationId:loc.id, additionalLocationIds:[],
    weather:{ temp:'14°C', precip:'10%', cond:'Sunny / Cloudy', sun:'05:42 / 20:15', fetchedAt:'sample' },
    techSpecs:{},
    schedule:[
      ['08:00','','Crew call'],
      ['08:00 - 09:00','1hr','Breakfast and crew briefing'],
      ['09:00','','TEAM A call time'],
      ['09:00 - 10:00','1hr','TEAM A HMU / Briefing / Breakfast'],
      ['10:00 - 11:00','1hr','TEAM A shoot Host and mini game'],
      ['08:00 - 16:00','8hrs','Dress 90\'s Flat 1 and prep 2'],
      ['11:00 - 14:05','3hrs 5','TEAM A leave for London Hunt — Tower Bridge'],
      ['11:00 - 12:00','1hr','HOST into HMU & Costume'],
      ['13:00 - 15:00','2hrs','Lunch — staggered over 2 hrs'],
      ['14:45 - 16:45','2hrs','TEAM A into HMU/Costume, then shoot Wedding 1 Top Table'],
      ['16:45 - 17:45','1hr','TEAM A shoot Confession x2'],
      ['18:00','','Day 2 shoot wrap'],
    ],
    positions:[
      P('Justin Schoenrock','07:45','Executive Producer'),
      P('Olivia Arnold','07:45','OFTV - UK'),
      P('Julia Pomis','07:45','OFTV - US'),
      P("Michael O'Brien",'07:45','Executive Producer'),
      P('Paul Buscemi','07:45','EIC'),
      P('Nicole McClain','07:45','Post-Production Supervisor'),
      P('Mark Bricker','07:45','Strategic Media Team - Director'),
      P('Harrison Ferrante','07:45','Strategic Media Team - DP'),
      P('Spenser Sease','07:45','Photographer'),
      P('Tegid Cartwright','08:00','DP','A'),
      P('Sabrina Goreeba','08:00','Line Producer / PM'),
      P('Matt Wells','08:00','Field Producer'),
      P('Emily Black','09:00','Host'),
      P('Lewis Buchan','09:00','Emily Black BTS'),
      P('Jessica Phillips','09:00','Emily Black BTS'),
      P('Sarah Jayne Dunn','09:00','Team A - Guest'),
      P('James Sutton','09:00','Team A - Guest'),
      P('George Pearton','08:00','Camera #1','B'),
      P('Charlie De La Hunt','08:00','Camera #2','C'),
      P('Karim D Clarke','08:00','Camera #3','D'),
      P('Konrad Frost','08:00','Camera #4'),
      P('Meurig Marshall','08:00','AC #1'),
      P('Alina Kosolova','08:00','AC #2'),
      P('Mark Levien','08:00','Soundie Mixer'),
      P('Joe Worthy','08:00','Soundie'),
      P('Alex Magill','08:00','Gaffer'),
      P('Richard Scott','08:00','Spark'),
      P('Amrita Bisla','08:00','Set Designer'),
      P('Jojo Copeman','08:00','HMU'),
      P('Eden Ward','08:00','HMU Assist'),
      P('Brian De Carvalho','08:00','Costume'),
      P('Angel Leatherwood','08:00','Costume Assist'),
      P('Alisha Shaw','08:00','PA #1'),
      P('Stella Moss','08:00','PA #2'),
      P('Heather Bradley','08:00','Runner / First Aid'),
      P('Sam Charlton','07:45','Driver / Runner'),
      P('Sid Ellisdon','07:45','Driver / Runner'),
    ],
    brief:['Mini Game — Strip & Switch','London Game — Tower Bridge hunt (Team A)','House Game — Wedding #1 Top Table','No open-toed shoes on set'],
    parking:'Sprinter/mini vans on site. Black cabs for London Hunt.',
    notes:'First aider on site: Heather Bradley.' };
  shootDaysDB.push(day2);

  // ---- Day 3 — Apr 28, 90's Flat ----
  const day3={ id:uid(), projectId:proj.id, dayNum:'3', date:'2026-04-28', allCrewCall:'07:45',
    locationId:loc.id, additionalLocationIds:[],
    weather:{ temp:'15°C', precip:'20%', cond:'Sunny / Cloudy', sun:'05:40 / 20:17', fetchedAt:'sample' },
    techSpecs:{},
    schedule:[
      ['08:00','','Crew call'],
      ['08:00 - 09:00','1hr','Breakfast and crew briefing'],
      ['08:30','','TEAM A call time'],
      ['08:30 - 09:30','1hr','TEAM A HMU / Briefing / Breakfast'],
      ['09:30 - 10:30','1hr','TEAM A shoot Host and mini game'],
      ['08:00 - 14:00','6hrs','Dress Detective 1 and prep 2'],
      ['09:30','','TEAM B call time'],
      ['10:30 - 13:00','2hrs 30','TEAM A leave for London Hunt — Brick Lane'],
      ['11:00 - 12:00','1hr','TEAM B shoot Host room and mini game'],
      ['12:00 - 15:00','3hrs','TEAM B leave for London Hunt — Canary Wharf'],
      ['13:00 - 15:00','1-2hrs','Lunch'],
      ['15:00 - 16:00','1hr','TEAM A shoot 90\'s Flat 1 TV'],
      ['16:30 - 17:30','1hr','TEAM B shoot 90\'s Flat 2 Trolls'],
      ['16:00 - 17:00','1hr','TEAM A shoot Confession x2'],
      ['17:30 - 18:30','1hr','TEAM B shoot Confession x2'],
      ['19:00','','Day 3 shoot wrap'],
    ],
    positions:[
      P('Justin Schoenrock','07:45','Executive Producer'),
      P('Olivia Arnold','07:45','OFTV - UK'),
      P('Julia Pomis','07:45','OFTV - US'),
      P("Michael O'Brien",'07:45','Executive Producer'),
      P('Paul Buscemi','07:45','EIC'),
      P('Nicole McClain','07:45','Post-Production Supervisor'),
      P('Mark Bricker','07:45','Strategic Media Team - Director'),
      P('Harrison Ferrante','07:45','Strategic Media Team - DP'),
      P('Spenser Sease','07:45','Photographer'),
      P('Tegid Cartwright','08:00','DP','A'),
      P('Sabrina Goreeba','08:00','Line Producer / PM'),
      P('Matt Wells','08:00','Field Producer'),
      P('Emily Black','09:00','Host'),
      P('Scarlett Howard','08:30','Team A - Guest'),
      P('Sophie Stonehouse','08:30','Team A - Guest'),
      P('Hannah Elizabeth','09:30','Team B - Guest'),
      P('Elizabeth Vasilenko','09:30','Team B - Guest'),
      P('George Pearton','08:00','Camera #1','B'),
      P('Charlie De La Hunt','08:00','Camera #2','C'),
      P('Karim D Clarke','08:00','Camera #3','D'),
      P('Konrad Frost','08:00','Camera #4'),
      P('Meurig Marshall','08:00','AC #1'),
      P('Alina Kosolova','08:00','AC #2'),
      P('Mark Levien','08:00','Soundie Mixer'),
      P('Joe Worthy','08:00','Soundie'),
      P('Alex Magill','08:00','Gaffer'),
      P('Richard Scott','08:00','Spark'),
      P('Kevin W. Malbas','08:00','Spark'),
      P('Amrita Bisla','08:00','Set Designer'),
      P('Jojo Copeman','08:00','HMU'),
      P('Eden Ward','08:00','HMU Assist'),
      P('Brian De Carvalho','10:00','Costume'),
      P('Angel Leatherwood','10:00','Costume Assist'),
      P('Alisha Shaw','08:00','PA #1'),
      P('Stella Moss','08:00','PA #2'),
      P('Heather Bradley','08:00','Runner / First Aid'),
      P('Sam Charlton','07:45','Driver / Runner'),
      P('Sid Ellisdon','07:45','Driver / Runner'),
      P('Kai','18:00','Security'),
    ],
    brief:['Mini Game — Head Shots / Looking for Booty','London Game — Brick Lane (Team A), Canary Wharf (Team B)','House Game — 90\'s Flat TV #1 / Trolls #2'],
    parking:'Sprinter/mini vans on site. Black cabs for London Hunt.',
    notes:'First aider on site: Heather Bradley.' };
  shootDaysDB.push(day3);

  // ---- Day 4 — Apr 29, Detective ----
  const day4={ id:uid(), projectId:proj.id, dayNum:'4', date:'2026-04-29', allCrewCall:'07:45',
    locationId:loc.id, additionalLocationIds:[],
    weather:{ temp:'15°C', precip:'20%', cond:'Sunny / Cloudy', sun:'05:38 / 20:18', fetchedAt:'sample' },
    techSpecs:{},
    schedule:[
      ['08:00','','Crew call'],
      ['08:00 - 09:00','1hr','Breakfast and crew briefing'],
      ['08:00 - 10:00','2hrs','Game test — Detective 2 Typewriter (not in situ)'],
      ['08:30','','TEAM A call time'],
      ['08:30 - 10:30','2hrs','TEAM A HMU/Briefing, shoot Host and mini game'],
      ['08:00 - 14:00','6hrs','Dress Museum 1 and prep 2'],
      ['09:30','','TEAM B call time'],
      ['11:00 - 13:45','2hrs 45','TEAM A leave for London Hunt — Charles Dickens'],
      ['11:00 - 12:00','1hr','TEAM B shoot Host room and mini game'],
      ['12:00 - 14:30','2hrs 30','TEAM B leave for London Hunt — Shakespeare'],
      ['13:00 - 15:00','1-2hrs','Lunch'],
      ['14:15 - 16:15','2hrs','TEAM A into Costume/HMU, shoot Detective 1 Guess Who'],
      ['16:45 - 17:45','1hr','TEAM B shoot Detective Typewriter'],
      ['16:15 - 17:15','1hr','TEAM A shoot Confession x2'],
      ['17:45 - 18:45','1hr','TEAM B shoot Confession x2'],
      ['19:00','','Day 4 shoot wrap'],
    ],
    positions:[
      P('Justin Schoenrock','07:45','Executive Producer'),
      P('Olivia Arnold','07:45','OFTV - UK'),
      P('Julia Pomis','07:45','OFTV - US'),
      P("Michael O'Brien",'07:45','Executive Producer'),
      P('Paul Buscemi','07:45','EIC'),
      P('Nicole McClain','07:45','Post-Production Supervisor'),
      P('Mark Bricker','07:45','Strategic Media Team - Director'),
      P('Harrison Ferrante','07:45','Strategic Media Team - DP'),
      P('Spenser Sease','07:45','Photographer'),
      P('Tegid Cartwright','08:00','DP','A'),
      P('Sabrina Goreeba','08:00','Line Producer / PM'),
      P('Matt Wells','08:00','Field Producer'),
      P('Emily Black','09:00','Host'),
      P('Keiran Lee','08:30','Team A - Guest'),
      P('Danny D','08:30','Team A - Guest'),
      P('Lauren Alexis','09:30','Team B - Guest'),
      P('Kailah Bird','09:30','Team B - Guest'),
      P('George Pearton','08:00','Camera #1','B'),
      P('Charlie De La Hunt','08:00','Camera #2','C'),
      P('Karim D Clarke','08:00','Camera #3','D'),
      P('Konrad Frost','08:00','Camera #4'),
      P('Meurig Marshall','08:00','AC #1'),
      P('Alina Kosolova','08:00','AC #2'),
      P('Mark Levien','08:00','Soundie Mixer'),
      P('Joe Worthy','08:00','Soundie'),
      P('Alex Magill','08:00','Gaffer'),
      P('Richard Scott','08:00','Spark'),
      P('Kevin W. Malbas','08:00','Spark'),
      P('Amrita Bisla','08:00','Set Designer'),
      P('Jojo Copeman','08:00','HMU'),
      P('Eden Ward','08:00','HMU Assist'),
      P('Brian De Carvalho','08:00','Costume'),
      P('Angel Leatherwood','08:00','Costume Assist'),
      P('Alisha Shaw','08:00','PA #1'),
      P('Stella Moss','08:00','PA #2'),
      P('Heather Bradley','08:00','Runner / First Aid'),
      P('Sam Charlton','07:45','Driver / Runner'),
      P('Sid Ellisdon','07:45','Driver / Runner'),
    ],
    brief:['Mini Game — What\'s in the Box? / Mouth Stuff','London Game — Charles Dickens (Team A), Shakespeare (Team B)','House Game — Detective #1 Guess Who / #2 Typewriter'],
    parking:'Sprinter/mini vans on site. Black cabs for London Hunt.',
    notes:'First aider on site: Heather Bradley.' };
  shootDaysDB.push(day4);

  // ---- Day 5 — Apr 30, Museum ----
  const day5={ id:uid(), projectId:proj.id, dayNum:'5', date:'2026-04-30', allCrewCall:'07:45',
    locationId:loc.id, additionalLocationIds:[],
    weather:{ temp:'16°C', precip:'10%', cond:'Sunny / Cloudy', sun:'05:32 / 20:23', fetchedAt:'sample' },
    techSpecs:{},
    schedule:[
      ['08:00','','Crew call'],
      ['08:00 - 09:00','1hr','Breakfast and crew briefing'],
      ['08:00 - 10:00','2hrs','Game test — Museum Paintings (not in situ)'],
      ['08:30','','TEAM A call time'],
      ['08:30 - 10:30','2hrs','TEAM A HMU/Briefing, shoot Host and mini game'],
      ['08:00 - 14:00','6hrs','Dress Wedding 2 Cake Fridge; strike 90\'s & Detective'],
      ['09:30','','TEAM B call time'],
      ['10:30 - 12:35','2hrs 5','TEAM A leave for London Hunt — Bus'],
      ['11:00 - 12:00','1hr','TEAM B shoot Host room and mini game'],
      ['12:00 - 14:00','2hrs','TEAM B leave for London Hunt — The Gherkin'],
      ['13:00 - 15:00','1-2hrs','Lunch'],
      ['14:00 - 15:00','1hr','TEAM A into Costume/HMU Museum 1 Wall Twister'],
      ['15:00 - 16:00','1hr','TEAM A shoot Museum Wall Twister'],
      ['16:30 - 17:30','1hr','TEAM B shoot Museum Wall Paintings'],
      ['16:00 - 17:00','1hr','TEAM A shoot Confession x2'],
      ['17:30 - 18:30','1hr','TEAM B shoot Confession x2'],
      ['19:00','','Day 5 shoot wrap'],
    ],
    positions:[
      P('Justin Schoenrock','07:45','Executive Producer'),
      P('Olivia Arnold','07:45','OFTV - UK'),
      P('Julia Pomis','07:45','OFTV - US'),
      P("Michael O'Brien",'07:45','Executive Producer'),
      P('Paul Buscemi','07:45','EIC'),
      P('Nicole McClain','07:45','Post-Production Supervisor'),
      P('Mark Bricker','07:45','Strategic Media Team - Director'),
      P('Harrison Ferrante','07:45','Strategic Media Team - DP'),
      P('Spenser Sease','07:45','Photographer'),
      P('Tegid Cartwright','08:00','DP','A'),
      P('Sabrina Goreeba','08:00','Line Producer / PM'),
      P('Matt Wells','08:00','Field Producer'),
      P('Emily Black','07:45','Host'),
      P('Rebecca Goodwin','08:30','Team A - Guest'),
      P('Lena Polanski','08:30','Team A - Guest'),
      P('Vanessa Neumann','09:30','Team B - Guest'),
      P('Stefan Garlicki','09:30','Team B - Guest'),
      P('George Pearton','08:00','Camera #1','B'),
      P('Charlie De La Hunt','08:00','Camera #2','C'),
      P('Karim D Clarke','08:00','Camera #3','D'),
      P('Konrad Frost','08:00','Camera #4'),
      P('Meurig Marshall','08:00','AC #1'),
      P('Alina Kosolova','08:00','AC #2'),
      P('Mark Levien','08:00','Soundie Mixer'),
      P('Joe Worthy','08:00','Soundie'),
      P('Alex Magill','08:00','Gaffer'),
      P('Richard Scott','08:00','Spark'),
      P('Kevin W. Malbas','08:00','Spark'),
      P('Amrita Bisla','08:00','Set Designer'),
      P('Jojo Copeman','08:00','HMU'),
      P('Eden Ward','08:00','HMU Assist'),
      P('Brian De Carvalho','08:00','Costume'),
      P('Angel Leatherwood','08:00','Costume Assist'),
      P('Stella Moss','08:00','PA #2'),
      P('Heather Bradley','08:00','Runner / First Aid'),
      P('Sam Charlton','07:45','Driver / Runner'),
      P('Sid Ellisdon','07:45','Driver / Runner'),
      P('Jamie Brindle','10:00','Rigger'),
    ],
    brief:['Mini Game — All Caps / Stack \'Em Up','London Game — Bus (Team A), The Gherkin (Team B)','House Game — Museum #1 Wall Twister / #2 Paintings'],
    parking:'Sprinter/mini vans on site. Black cabs for London Hunt.',
    notes:'First aider on site: Heather Bradley.' };
  shootDaysDB.push(day5);

  // ---- Day 6 — May 1, Wedding 2 ----
  const day6={ id:uid(), projectId:proj.id, dayNum:'6', date:'2026-05-01', allCrewCall:'07:45',
    locationId:loc.id, additionalLocationIds:[],
    weather:{ temp:'17°C', precip:'20%', cond:'Sunny / Cloudy', sun:'06:05 / 20:01', fetchedAt:'sample' },
    techSpecs:{},
    schedule:[
      ['08:00','','Crew call'],
      ['08:00 - 09:00','1hr','Breakfast and crew briefing'],
      ['08:30','','TEAM A call time'],
      ['08:30 - 10:30','2hrs','TEAM A HMU/Briefing, shoot Host and mini game'],
      ['08:00 - 18:00','','Strike Detective, 90\'s & Museum; strike Host'],
      ['10:30 - 13:05','2hrs 35','TEAM A leave for London Hunt — Victoria Park'],
      ['11:00 - 13:00','2hrs','HOST into HMU & Costume, shoot game intros'],
      ['11:00 - 15:00','4hrs','Riggers take down softbox in Host room and towers'],
      ['13:00 - 15:00','2hrs','Lunch — staggered over 2 hrs'],
      ['14:05 - 16:05','2hrs','TEAM A into HMU/Costume, shoot Wedding 2 Cake Fridge'],
      ['16:05 - 17:05','1hr','TEAM A shoot Confession x2'],
      ['17:00 - 18:30','','Strike camera / lights'],
      ['18:30','','ROW 2026 WRAP'],
    ],
    positions:[
      P('Justin Schoenrock','07:45','Executive Producer'),
      P('Olivia Arnold','07:45','OFTV - UK'),
      P('Julia Pomis','07:45','OFTV - US'),
      P("Michael O'Brien",'07:45','Executive Producer'),
      P('Paul Buscemi','07:45','EIC'),
      P('Nicole McClain','07:45','Post-Production Supervisor'),
      P('Mark Bricker','07:45','Strategic Media Team - Director'),
      P('Harrison Ferrante','07:45','Strategic Media Team - DP'),
      P('Spenser Sease','07:45','Photographer'),
      P('Tegid Cartwright','08:00','DP','A'),
      P('Sabrina Goreeba','08:00','Line Producer / PM'),
      P('Matt Wells','08:00','Field Producer'),
      P('Emily Black','09:00','Host'),
      P('Meg Prescott','08:30','Team A - Guest'),
      P('Freya Mallard','08:30','Team A - Guest'),
      P('George Pearton','08:00','Camera #1','B'),
      P('Charlie De La Hunt','08:00','Camera #2','C'),
      P('Karim D Clarke','08:00','Camera #3','D'),
      P('Konrad Frost','08:00','Camera #4'),
      P('Meurig Marshall','08:00','AC #1'),
      P('Alina Kosolova','08:00','AC #2'),
      P('Mark Levien','08:00','Soundie Mixer'),
      P('Joe Worthy','08:00','Soundie'),
      P('Alex Magill','08:00','Gaffer'),
      P('Richard Scott','08:00','Spark'),
      P('Kevin W. Malbas','08:00','Spark'),
      P('Callum Turnor','08:00','Spark'),
      P('Jamie Brindle','10:30','Rigger'),
      P('Amrita Bisla','08:00','Set Designer'),
      P('Jojo Copeman','08:00','HMU'),
      P('Eden Ward','08:00','HMU Assist'),
      P('Brian De Carvalho','08:00','Costume'),
      P('Angel Leatherwood','08:00','Costume Assist'),
      P('Stella Moss','08:00 - 12:00','PA #2'),
      P('Billie Billington','08:00','PA #1'),
      P('Heather Bradley','08:00','Runner / First Aid'),
      P('Sam Charlton','07:45','Driver / Runner'),
      P('Sid Ellisdon','07:45','Driver / Runner'),
      P('Josh Bister','13:00','DIT'),
    ],
    brief:['Mini Game — Eggsistential Crisis','London Game — Victoria Park (Team A)','House Game — Wedding #2 Cake Fridge','Full strike of Detective, 90\'s Flat, Museum & Host sets'],
    parking:'Sprinter/mini vans on site. Black cabs for London Hunt.',
    notes:'Final shoot day of ROW 2026 — full wrap at 18:30.' };
  shootDaysDB.push(day6);

  // ---- location: The Bill Murray (LMAOF comedy club, May 2 only) ----
  const loc2={ id:uid(), name:'The Bill Murray', address:"39 Queen's Head St, London, N1 8NQ",
    lat:51.5378, lon:-0.1035,  // approximate — re-pin via address search for exact coords
    onsiteContactName:'James O\'Donnell', onsiteContactPhone:'07721 382 536',
    accessInfo:'Angel, Islington — comedy club venue, separate from the Organ Factory studio.',
    recceInfo:'', parkingInfo:'Sprinter/mini vans on site.',
    hospital:{ name:'The Whittington Hospital', address:'Magdala Ave, London N19 5NF', phone:'020 7272 3070', distanceKm:'2.8' } };
  locationsDB.push(loc2);

  // ---- LMAOF project (single day, May 2, The Bill Murray) ----
  const lmaofCrewNames = ['Justin Schoenrock','Julia Pomis',"Michael O'Brien",'Paul Buscemi','Nestor Ruesga','Mark Bricker',
    'Spenser Sease','Tegid Cartwright','Sabrina Goreeba','Matt Wells','Freya Mallard','Tomas Solt','Charlie De La Hunt',
    'Meurig Marshall','Jason Cleaver','Mark Levien','Joe Worthy','Alex Magill','Eden Ward','Stella Moss','Billie Billington',
    'Heather Bradley','Sam Charlton','Sid Ellisdon','Steve Bugeja','Michelle Shaugnessy','Becky Umbers','Patrick Spicer',
    'Kelly Ford','Estfania Baha','James Barr','Kate Barron','Cecily Hitchcock'];
  const lmaofProj={ id:uid(), client:'OFTV', title:'LMAOF London', startDate:'2026-05-02', company:COMPANY,
    logline:'Two live comedy shows filmed at The Bill Murray, Angel.', description:'Single-day comedy club shoot — two stand-up shows (19:00 and 21:00) with a rotating line-up of comics, separate from the ROW studio shoot.',
    crewIds: lmaofCrewNames.map(n=>nameToId[n]).filter(Boolean), locationIds:[loc2.id], createdAt:new Date().toISOString() };
  projectsDB.push(lmaofProj);

  const lmaofDay={ id:uid(), projectId:lmaofProj.id, dayNum:'1', date:'2026-05-02', allCrewCall:'14:00',
    locationId:loc2.id, additionalLocationIds:[],
    weather:{ temp:'22°C', precip:'60%', cond:'Sunny / Cloudy', sun:'05:31 / 20:25', fetchedAt:'sample' },
    techSpecs:{},
    schedule:[
      ['14:00','','Crew call at The Bill Murray Club'],
      ['14:00 - 17:00','3hrs','Pre-light club'],
      ['15:30','','Show #1 comics arrival/call time'],
      ['15:30 - 16:30','1hr','Shoot intros for group #1 of comics / promo photos / BTS'],
      ['16:00','','Show #2 comics arrival/call time'],
      ['16:00 - 17:00','1hr','Shoot intros for group #2 of comics / promo photos / BTS'],
      ['17:00 - 18:00','1hr','Crew meal'],
      ['18:00','','Doors open for Show #1'],
      ['19:00 - 20:30','1hr 30','Show #1'],
      ['20:00','','Crowd arrives for Show #2'],
      ['20:30','','Finish Show #1 and reset room for Show #2'],
      ['21:00 - 22:15','1hr 15','Show #2'],
      ['22:15 - 00:00','1hr 45','Wrap club'],
      ['00:00','','Wrap'],
    ],
    positions:[
      P('Justin Schoenrock','O/C','Executive Producer'),
      P('Julia Pomis','O/C','OFTV - US'),
      P("Michael O'Brien",'13:30','Executive Producer'),
      P('Paul Buscemi','13:30','EIC'),
      P('Nestor Ruesga','13:30','Technical Supervisor'),
      P('Mark Bricker','13:30','Strategic Media Team - Director'),
      P('Spenser Sease','13:30','Photographer'),
      P('Tegid Cartwright','14:00','DP','A'),
      P('Sabrina Goreeba','14:00','Line Producer / PM'),
      P('Matt Wells','10:00','Field Producer'),
      P('Freya Mallard','18:00','Show MC — both shows'),
      P('Steve Bugeja','15:30','Comic — Show 1'),
      P('Michelle Shaugnessy','15:30','Comic — Show 1'),
      P('Becky Umbers','15:30','Comic — Show 1'),
      P('Patrick Spicer','15:30','Comic — Show 1'),
      P('Kelly Ford','15:30','Comic — Show 1'),
      P('Estfania Baha','16:00','Comic — Show 2'),
      P('James Barr','17:00','Comic — Show 2'),
      P('Kate Barron','16:00','Comic — Show 2'),
      P('Cecily Hitchcock','16:00','Comic — Show 2'),
      P('Tomas Solt','14:00','Camera #1','B'),
      P('Charlie De La Hunt','14:00','Camera #2','C'),
      P('Meurig Marshall','14:00','Camera #3','D'),
      P('Jason Cleaver','14:00','AC #1'),
      P('Mark Levien','15:30','Soundie Mixer'),
      P('Joe Worthy','15:30','Soundie'),
      P('Alex Magill','14:00','Gaffer'),
      P('Eden Ward','14:30','HMU'),
      P('Stella Moss','14:00','PA #1'),
      P('Billie Billington','14:00','PA #2'),
      P('Heather Bradley','10:00','Runner / First Aid'),
      P('Sam Charlton','13:30','Driver / Runner'),
      P('Sid Ellisdon','10:00','Driver / Runner'),
    ],
    brief:['Two live comedy shows — 19:00 and 21:00','Separate line-up of 5 comics per show','Full BTS/promo coverage before doors'],
    parking:'Sprinter/mini van on site.',
    notes:'Different venue and crew subset from the ROW studio shoot — production company OFTV, first aider Heather Bradley.' };
  shootDaysDB.push(lmaofDay);

  await saveDB('db:crew',crewDB); await saveDB('db:locations',locationsDB);
  await saveDB('db:projects',projectsDB); await saveDB('db:shootdays',shootDaysDB);
  currentProjectId = proj.id; route = {screen:'project'}; currentProjectTab = 'overview';
}
