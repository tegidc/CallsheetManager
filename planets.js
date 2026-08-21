// Warchest sidecar — TI4 planet database (base game + Prophecy of Kings).
// k: tech specialty (B/G/Y/R) · sys: planets sharing a system (drives "also add?") · leg: legendary
window.WARCHEST_PLANETS=[
 {n:'Mecatol Rex',r:1,i:6},
 // blue-backed tiles — base
 {n:'Abyz',r:3,i:0,sys:'abyz'},{n:'Fria',r:2,i:0,sys:'abyz'},
 {n:'Arinam',r:1,i:2,sys:'arinam'},{n:'Meer',r:0,i:4,k:'R',sys:'arinam'},
 {n:'Arnor',r:2,i:1,sys:'arnor'},{n:'Lor',r:1,i:2,sys:'arnor'},
 {n:'Bereg',r:3,i:1,sys:'bereg'},{n:'Lirta IV',r:2,i:3,sys:'bereg'},
 {n:'Centauri',r:1,i:3,sys:'centauri'},{n:'Gral',r:1,i:1,k:'B',sys:'centauri'},
 {n:'Corneeq',r:1,i:2,sys:'corneeq'},{n:'Resculon',r:2,i:0,sys:'corneeq'},
 {n:'Dal Bootha',r:0,i:2,sys:'dal'},{n:'Xxehan',r:1,i:1,sys:'dal'},
 {n:'Lazar',r:1,i:0,k:'Y',sys:'lazar'},{n:'Sakulag',r:2,i:1,sys:'lazar'},
 {n:'Lodor',r:3,i:1},
 {n:'Mehar Xull',r:1,i:3,k:'R'},
 {n:'Mellon',r:0,i:2,sys:'mellon'},{n:'Zohbat',r:3,i:1,sys:'mellon'},
 {n:'New Albion',r:1,i:1,k:'G',sys:'albion'},{n:'Starpoint',r:3,i:1,sys:'albion'},
 {n:'Quann',r:2,i:1},
 {n:"Qucen'n",r:1,i:2,sys:'qucenn'},{n:'Rarron',r:0,i:3,sys:'qucenn'},
 {n:'Saudor',r:2,i:2},
 {n:"Tar'mann",r:1,i:1,k:'G'},
 {n:"Tequ'ran",r:2,i:0,sys:'tequran'},{n:'Torkan',r:0,i:3,sys:'tequran'},
 {n:'Thibah',r:1,i:1,k:'B'},
 {n:'Vefut II',r:2,i:2},
 {n:'Wellon',r:1,i:2,k:'Y'},
 // blue/red-backed tiles — Prophecy of Kings
 {n:'Archon Vail',r:1,i:3,k:'B'},
 {n:'Perimeter',r:2,i:1},
 {n:'Ang',r:2,i:0,k:'R'},
 {n:'Sem-Lore',r:3,i:2,k:'Y'},
 {n:'Vega Major',r:2,i:1,sys:'vega'},{n:'Vega Minor',r:1,i:2,k:'B',sys:'vega'},
 {n:'Abaddon',r:1,i:0,sys:'loki'},{n:'Ashtroth',r:2,i:0,sys:'loki'},{n:'Loki',r:1,i:2,sys:'loki'},
 {n:'Rigel I',r:0,i:1,sys:'rigel'},{n:'Rigel II',r:1,i:2,sys:'rigel'},{n:'Rigel III',r:1,i:1,k:'G',sys:'rigel'},
 {n:'Cormund',r:2,i:0},
 {n:'Everra',r:3,i:1},
 {n:'Primor',r:2,i:1,leg:1},
 {n:"Hope's End",r:3,i:0,leg:1},
 {n:'Mirage',r:1,i:2,leg:1},
 {n:'Mallice',r:0,i:3,leg:1},
 // home systems — base
 {n:'Jord',r:4,i:2},{n:'Moll Primus',r:4,i:1},{n:'Darien',r:4,i:4},{n:'Muaat',r:4,i:1},
 {n:'Nestphar',r:3,i:2},{n:'[0.0.0]',r:5,i:0},{n:'Creuss',r:4,i:2},{n:'Mordai II',r:4,i:0},
 {n:'Winnu',r:3,i:4},
 {n:'Wren Terra',r:2,i:1,sys:'letnev'},{n:'Arc Prime',r:4,i:0,sys:'letnev'},
 {n:'Lisis II',r:1,i:0,sys:'saar'},{n:'Ragh',r:2,i:1,sys:'saar'},
 {n:'Nar',r:2,i:3,sys:'jolnar'},{n:'Jol',r:1,i:2,sys:'jolnar'},
 {n:"Tren'lak",r:1,i:0,sys:'norr'},{n:'Quinarra',r:3,i:1,sys:'norr'},
 {n:'Archon Ren',r:2,i:3,sys:'xxcha'},{n:'Archon Tau',r:1,i:1,sys:'xxcha'},
 {n:'Retillion',r:2,i:3,sys:'yssaril'},{n:'Shalloq',r:1,i:2,sys:'yssaril'},
 {n:'Arretze',r:2,i:0,sys:'hacan'},{n:'Hercant',r:1,i:1,sys:'hacan'},{n:'Kamdorn',r:0,i:1,sys:'hacan'},
 {n:'Maaluuk',r:0,i:2,sys:'naalu'},{n:'Druaa',r:3,i:1,sys:'naalu'},
 // home systems — Prophecy of Kings
 {n:'Valk',r:2,i:0,sys:'argent'},{n:'Avar',r:1,i:1,sys:'argent'},{n:'Ylir',r:0,i:2,sys:'argent'},
 {n:'The Dark',r:3,i:4},{n:'Ixth',r:3,i:5},
 {n:'Naazir',r:2,i:1,sys:'nra'},{n:'Rokha',r:1,i:2,sys:'nra'},
 {n:'Arcturus',r:4,i:4},{n:'Elysium',r:4,i:1},{n:'Acheron',r:4,i:0}
];
// Explore attachments and oddities. dr/di: bonus resources/influence.
// k: research facility — grants that tech specialty, or +1R +1I if the planet already has one.
window.WARCHEST_ATTACH=[
 {id:'dyson',n:'Dyson Sphere',dr:2,di:1},
 {id:'mining',n:'Mining World',dr:2,di:0},
 {id:'lazax',n:'Lazax Survivors',dr:1,di:2},
 {id:'para',n:'Paradise World',dr:0,di:2},
 {id:'terra',n:'Terraforming Initiative',dr:1,di:1},
 {id:'rich',n:'Rich World',dr:1,di:0},
 {id:'tomb',n:'Tomb of Emphidia',dr:0,di:1},
 {id:'nano',n:'Nano-Forge',dr:2,di:2},
 {id:'dmz',n:'Demilitarized Zone',dr:0,di:0},
 {id:'rfb',n:'Propulsion Research Facility',k:'B'},
 {id:'rfg',n:'Biotic Research Facility',k:'G'},
 {id:'rfy',n:'Cybernetic Research Facility',k:'Y'},
 {id:'rfr',n:'Warfare Research Facility',k:'R'}
];
