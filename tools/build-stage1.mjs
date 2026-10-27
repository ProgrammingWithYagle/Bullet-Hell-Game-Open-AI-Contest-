import {applyAmbulanceRoute} from '../content/source/ambulance-route.mjs';
import {applyWidowGates} from '../content/source/widow-gates.mjs';
import {applyMarshalChains} from '../content/source/marshal-chains.mjs';
import {applyTollkeeperReturn} from '../content/source/tollkeeper-return.mjs';
import {applyClerkAppeal} from '../content/source/clerk-appeal.mjs';
import {applyRatcatcherMuster} from '../content/source/ratcatcher-muster.mjs';
import {applyCourierRoute} from '../content/source/courier-route.mjs';
import {applyCrazedHorizon} from '../content/source/crazed-horizon.mjs';
import {addSmallWakes} from '../content/source/small-wakes.mjs';
import {applyWardenPatrol} from '../content/source/warden-patrol.mjs';
import {addClassTalents} from '../content/source/class-talents.mjs';
import { applyEncounterPacing } from '../content/source/encounter-pacing.mjs';
import { addEarlyWatch } from '../content/source/early-watch.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { expandBosses, bossPools } from '../content/source/boss-expansion.mjs';
import { expandSkills } from '../content/source/skill-expansion.mjs';
import { gatehouseObstacles } from '../content/source/arena-geometry.mjs';
import { reviseConstable } from '../content/source/constable-encounter.mjs';
import { addBossVariants, brutalRules } from '../content/source/boss-variants.mjs';

// Authored design data and document production only. No gameplay implementation.
const root = path.resolve(import.meta.dirname, '..');
const write = (file, value) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const table = (headers, rows) => [ '| ' + headers.join(' | ') + ' |', '| ' + headers.map(() => '---').join(' | ') + ' |', ...rows.map(row => '| ' + row.map(value => String(value).replaceAll('|', '/').replaceAll('\n', ' ')).join(' | ') + ' |') ].join('\n');
const csv = (headers, rows) => [headers, ...rows].map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';

const rules = {
  schemaVersion: 1, contentVersion: '0.3.0', protocolVersion: 3,
  simulationHz: 30, patchHz: 20, worldWidth: 1600, worldHeight: 1000,
  playerRadius: 9, bossRadius: 58, bulletRadius: 5,
  dodgeDuration: 0.22, dodgeInvulnerability: 0.16, dodgeSpeed: 800, dodgeCooldown: 3.5,
  reviveSeconds: 2, downedSeconds: 20, revivedHealthFraction: 0.5,
  soloSelfRevives: 1, reconnectSeconds: 60, checkpointLifetimeHours: 24,
  mutationVoteSeconds: 15, bossVoteSeconds: 15, shopSeconds: 25, deploymentSeconds: 5,
  mutationDurationEncounters: 3, mutationMaximumActive: 3,
  initialSkillPoints: 3, additionalCampaignSkillPoints: 24,
  skillDepthCosts: [1,2,3,4,5,6], maximumActiveCapstones: 1,
  ultimate: { startsReady:true, combatTimeOnly:true, maximumCooldownReduction:0.4, focusTonicAffectsUltimate:false, strongestIdenticalAuraOnly:true },
  initialCoins: 120, nominalIncomeBeforeFinal: 2400,
  bossHealthBase: 1800, bossHealthThreatGrowth: 1.22, bossHealthAdditionalPlayer: 0.7,
  bossHealthTimerBaseline: 120, maximumHostileProjectiles: 4000, maximumMinions: 60,
  friendlyFire: false, playerCollision: false, healingAtEncounterStart: true,
  modifierLimits: { damage: [0.35,4], maxHealth: [0.3,2.5], fireRate: [0.35,2.5], moveSpeed: [0.55,1.65], reloadTime: [0.4,2], cooldown: [0.4,1.6], healing: [0.3,2], armor: [0,0.65], bossBulletCount: [0.7,2], bossSpeed: [0.65,1.6], bossHealth:[0.6,2.5], bossDamage:[0.5,2.5], coins:[0.5,4], timer:[0.75,1.25], barrierHealth:[0.4,2], spread:[0.3,1.75], magazine:[0.5,2], dodgeCooldown:[0.4,1.6], reviveTime:[0.4,1.6], abilityPotency:[0.5,2], extraShots:[0,3], startShield:[0,100] },
  buildRating: { weights: { offense:0.5, survival:0.25, support:0.25 }, gradeGrowth:1.1, scope:'Equipment and purchased build power, not player skill. Normalize each role against its own baseline.' },
  brutal: brutalRules,
  endless: { finalEncounter:null, fullBuildByEncounter:10, cycleEncounters:10, healthGrowthPerCycle:0.15, damageGrowthPerCycle:0.12, speedGrowthPerCycle:0.025, maximumSpeedGrowth:0.5, cappedPlayerPower:true, rewards:'Completed-encounter mastery, cosmetics and local streak records. Power purchases stop at their normal caps.' },
  secret: { minimumDifficulty:'normal', minimumAccordBreaks:3, requireCampaignVictory:true, maximumTimeouts:0, bankVictoryBeforeOffer:true },
};

const locales = [
  ['en','English','ltr'],['zh-Hans','简体中文','ltr'],['zh-Hant','繁體中文','ltr'],['ja','日本語','ltr'],
  ['es','Español','ltr'],['fr','Français','ltr'],['de','Deutsch','ltr'],['pt-BR','Português (Brasil)','ltr'],
  ['ru','Русский','ltr'],['hi','हिन्दी','ltr'],['ar','العربية','rtl'],['bn','বাংলা','ltr'],['id','Bahasa Indonesia','ltr'],['ur','اردو','rtl'],['ko','한국어','ltr'],
].map(([id,name,direction]) => ({id,name,direction}));

const difficulties = [
  ['baby','Baby',0.6,0.45,0.72,0,1.25,1.4,false],
  ['easy','Easy',0.8,0.7,0.86,0,1.1,1.2,false],
  ['normal','Normal',1,1,1,0,1,1,false],
  ['hard','Hard',1.15,1.25,1.1,1,0.95,0.95,false],
  ['insane','Insane',1.3,1.5,1.18,2,0.9,0.9,true],
  ['hellish','Hellish',1.45,1.8,1.25,3,0.85,0.85,true],
].map(([id,name,health,damage,speed,extraPatterns,coins,healing,locked]) => ({id,name,health,damage,speed,extraPatterns,coins,healing,locked,unlock:locked?'Complete any full campaign route on Hard.':'Available immediately.'}));

const modes = [
  {id:'short',name:'Quarantine Run',kind:'campaign',maxPlayers:8,encounters:5,targetMinutes:[10,20],threats:[1,3,5,8,10],arenas:['gatehouse','triage-yard','sunken-chapel','bell-foundry','crown-crypt'],description:'A five-contract passage from the breached gate to the drowned seat of government.'},
  {id:'standard',name:'Midnight Circuit',kind:'campaign',maxPlayers:8,encounters:10,targetMinutes:[25,35],threats:[1,2,3,4,5,6,7,8,9,10],arenas:['gatehouse','triage-yard','ossuary-works','sunken-chapel','gatehouse','bell-foundry','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'],description:'The full city circuit, balancing build development with a compact evening session.'},
  {id:'long',name:'Black Bell Pilgrimage',kind:'campaign',maxPlayers:8,encounters:16,targetMinutes:[45,60],threats:[1,1,2,2,3,3,4,4,5,6,7,8,9,9,10,10],arenas:['gatehouse','triage-yard','gatehouse','ossuary-works','triage-yard','sunken-chapel','ossuary-works','bell-foundry','sunken-chapel','gatehouse','bell-foundry','crown-crypt','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'],description:'A longer rescue pilgrimage through all districts, with champions and additional survivor testimony.'},
  {id:'raid',name:'Grand Raid',kind:'raid',maxPlayers:16,encounters:3,targetMinutes:[10,20],threats:[4,7,10],arenas:['ossuary-works','bell-foundry','crown-crypt'],skillBudgets:[12,20,27],coinIncomeBudgets:[600,1400,2400],bossHealthMultiplier:1.25,description:'Three extended encounters with an accelerated starting build and larger cooperative objectives.'},
  {id:'endless',name:'Endless Vigil',kind:'endless',maxPlayers:50,encounters:null,targetMinutes:null,threats:[1,2,3,4,5,6,7,8,9,10],arenas:['gatehouse','triage-yard','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'],description:'No final round. Survive successive bosses indefinitely, vote on mutations, shop between encounters, and pursue a personal and squad streak. Solo, private and public play.'},
].map(mode => ({...mode,minPlayers:1,public:true,private:true,offlineSolo:true}));

const classSpecs = [
  {id:'soldier',name:'Soldier',survivor:'Mara Rook',health:110,speed:225,color:'#7799a5',weapon:'soldier-0',role:'Reliable ranged damage and squad leadership.',lore:'A former night-watch officer who refused the order to bar the infirmary doors. Mara counts everyone before she moves.',q:['rally','Rally Field',16,6,170,0,'Allies in the field gain 20% weapon damage and 10% movement speed.'],e:['burst','Precision Burst',9,0,0,45,'Fire three accurate piercing rounds toward the aim point.'],
    branches:[['Ballistics',['Clean Bore','Measured Pair','Copper Jackets','Crossfire Drill','Long Watch','Last Word']],['Command',['Clear Signal','Steady Orders','Shared Bearings','Fire Discipline','Unbroken Line','Citywide Rally']],['Survival',['Field Dressing','Low Profile','Hardened Coat','Second Wind','Hold Fast','Nobody Left']]],
  },
  {id:'heavy',name:'Heavy',survivor:'Hux Bell',health:140,speed:190,color:'#c3964c',weapon:'heavy-0',role:'Sustained fire and suppression.',lore:'Hux once kept the foundry running through winter. He now carries its last functioning feed motor into the streets.',q:['suppress','Suppressing Cone',12,3,220,45,'Fire fourteen rounds in a cone and slow ordinary enemies by 40%.'],e:['brace','Braced Firing',18,5,0,0,'Gain 45% damage resistance and 30% fire rate; move at 60% speed.'],
    branches:[['Ordnance',['Fresh Belt','Hot Chamber','Hard Rounds','Feed Motor','Iron Torrent','Foundry Roar']],['Suppression',['Wide Sweep','Pinned Shadows','Heavy Rhythm','Clearing Fire','Wall of Lead','Quiet the Street']],['Endurance',['Padded Harness','Deep Breath','Steel Shoulders','Unshaken','Long Haul','Still Standing']]],
  },
  {id:'tank',name:'Tank',survivor:'Bram Voss',health:170,speed:180,color:'#b3654b',weapon:'tank-0',role:'Protection, interruption and rescue.',lore:'A gate engineer carrying a door that outlived its building. Bram insists a shield is only useful with someone behind it.',q:['wall','Protective Wall',16,5,150,0,'Place a 150-health bullet-blocking wall that allies can walk through.'],e:['charge','Rescue Charge',10,0.3,180,50,'Charge toward the aim point, gain brief invulnerability and damage nearby enemies.'],
    branches:[['Breaching',['Close Quarters','Buckshot Proof','Door Knocker','Breach Pattern','Forward Pressure','Open the Way']],['Protection',['Broad Guard','Safe Passage','Reinforced Face','Linked Shelter','Rescue Habit','The Last Door']],['Bastion',['Riveted Coat','Grounded Stance','Impact Bracing','Deep Reserve','Stone Resolve','Unfallen']]],
  },
  {id:'medic',name:'Medic',survivor:'Iona Vale',health:100,speed:225,color:'#dfd3b4',weapon:'medic-0',role:'Healing, cleansing and rapid recovery.',lore:'Iona wrote names on bandages when the city ran out of paper. She refuses to let the bells make those names meaningless.',q:['heal','Healing Field',16,6,140,0,'Restore 8 health per second to allies inside the field.'],e:['cleanse','Cleansing Serum',12,0,160,0,'Heal nearby allies for 20 health and remove poison and slow effects.'],
    branches:[['Chemistry',['Sharp Dose','Pressure Injector','Stable Mixture','Surgical Volley','Last Formula','Mercy with Teeth']],['Triage',['Clean Hands','Quick Assessment','Wide Ward','Measured Serum','Rescue Protocol','Nobody Forgotten']],['Recovery',['Padded Satchel','Stubborn Pulse','Safe Footing','Fresh Bandage','Living Memory','A Name Returned']]],
  },
  {id:'mage',name:'Mage',survivor:'Sable Quill',health:85,speed:225,color:'#8e82b4',weapon:'mage-0',role:'Area control and magical burst damage.',lore:'Sable catalogued forbidden bell harmonics before the quarantine. The cure and the curse now share the same notebook.',q:['bind','Binding Sigil',12,4,120,35,'Damage enemies and slow ordinary enemies by 55% within a sigil.'],e:['ward','Ward Detonation',18,6,145,65,'Detonate a ward around the aim point and grant nearby allies a 35-health shield.'],
    branches:[['Hexcraft',['Ash Script','Resonant Ink','Split Glyph','Grave Arithmetic','Forbidden Meter','The Silent Chord']],['Control',['Marked Ground','Patient Circle','Deep Binding','Echoing Ward','Bell Geometry','Name the Storm']],['Warding',['Paper Seal','Bone Charm','Quiet Mantle','Stolen Breath','Salted Hem','A Circle Remains']]],
  },
  {id:'engineer',name:'Engineer',survivor:'Tamsin Reed',health:105,speed:215,color:'#5eafa0',weapon:'engineer-0',role:'Deployables, repair and controlled ground.',lore:'Tamsin repairs tools with parts that were never meant to fit. She believes the city can be repaired by the same method.',q:['turret','Rivet Turret',18,12,0,25,'Deploy an 80-health turret with 25 base damage per second.'],e:['barricade','Deployable Barricade',16,8,160,0,'Deploy a 120-health bullet barrier; teammates can pass through it.'],
    branches:[['Demolitions',['Fine Teeth','Charged Rivets','Spare Barrel','Impact Fuse','Overclock','Turn the Key']],['Constructs',['Level Footing','Fast Assembly','Spare Motor','Linked Repairs','Long Service','Two Hands More']],['Repair',['Work Gloves','Reinforced Apron','Patch Plate','Safe Ground','Measured Steps','A Thing Rebuilt']]],
  },
  {id:'assassin',name:'Assassin',survivor:'Vale Ash',health:90,speed:255,color:'#b67e8a',weapon:'assassin-0',role:'Precision, mobility and safe rescue openings.',lore:'Vale used to carry letters through streets the watch had abandoned. They still know which alleys lead home.',q:['veil','Invisibility',16,6,0,0,'Become untargetable by newly aimed attacks. Existing hazards still hurt.'],e:['step','Shadow Step',10,0.18,180,50,'Blink toward the aim point, briefly evade damage and strike nearby enemies.'],
    branches:[['Precision',['Fine Needle','Soft Trigger','True Line','Through the Seam','Last Aperture','A Single Thread']],['Ambush',['Quiet Hem','Hidden Route','Long Veil','Borrowed Shadow','Safe Return','No Witness']],['Evasion',['Light Soles','Loose Shoulders','Narrow Escape','Steady Pulse','Afterimage','Another Way Home']]],
  },
];
const ultimateSpecs = {
  soldier:{name:'Last Roll Call',kind:'roll-call',cooldown:80,duration:8,radius:260,damage:0,effects:{allyWeaponDamage:0.35,instantReload:true,clearProjectilesOnCast:true},description:'Reload allies instantly, clear nearby hostile projectiles once and grant 35% weapon damage in the rally field for 8 seconds.'},
  heavy:{name:'Foundry Overture',kind:'overdrive',cooldown:90,duration:6,radius:0,damage:0,effects:{fireRate:0.7,pierce:2,unlimitedMagazine:true,moveSpeed:0.65},description:'Overdrive the weapon for 6 seconds with 70% additional fire rate, two extra pierces and no magazine consumption; movement is reduced.'},
  tank:{name:'The City Holds',kind:'citadel',cooldown:95,duration:8,radius:230,damage:0,effects:{allyShield:120,allyArmor:0.35},description:'Grant nearby allies 120 shield and 35 percentage points of armor for 8 seconds. Armor respects the global cap; identical fields do not stack.'},
  medic:{name:'Names Returned',kind:'resurrection',cooldown:100,duration:1,radius:240,damage:35,effects:{reviveFraction:0.6,heal:40,cleanse:true,soloShield:40},description:'After a one-second channel, revive nearby downed or eliminated allies at 60% health, heal living allies for 40, cleanse effects and strike nearby enemies for 35. Solo also gains 40 shield.'},
  mage:{name:'Silent Twelfth',kind:'requiem',cooldown:90,duration:3,radius:300,damage:120,effects:{pulses:3,clearProjectilesOnCast:true,ordinaryEnemySlow:0.7},description:'Release three 120-damage pulses over 3 seconds, erase hostile projectiles in range on the first pulse and strongly slow ordinary enemies.'},
  engineer:{name:'Impossible Machine',kind:'siege-construct',cooldown:100,duration:14,radius:0,damage:90,effects:{constructHealth:200,damagePerSecond:90,turretFireRate:0.5},description:'Deploy a 200-health siege construct dealing 90 base damage per second for 14 seconds and overclock owned turrets by 50%.'},
  assassin:{name:'Unwritten Passage',kind:'passage',cooldown:85,duration:5,radius:180,damage:100,effects:{stepCharges:3,criticalChance:1,untargetable:true},description:'For 5 seconds gain three free empowered Shadow Steps, 100% critical chance and untargetability to new aimed attacks. Existing hazards remain dangerous outside dodge invulnerability.'},
};
const grades = ['D-','D','D+','C-','C','C+','B-','B','B+','A-','A','A+','S-','S','S+','SS-','SS','SS+'];
const classes = classSpecs.map(({q,e,branches,...value}) => ({...value,branches:branches.map(([name])=>({id:slug(name),name})),abilities:[q,e].map(([kind,name,cooldown,duration,radius,damage],i)=>({id:value.id+'-'+(i?'e':'q'),slot:i?'e':'q',kind,name,cooldown,duration,radius,damage,description:(i?e:q)[6]})),ultimate:{id:value.id+'-ultimate',slot:'ultimate',...ultimateSpecs[value.id]}}));
const baseSkills = [];
const capstoneExtras = {
  soldier:[{extraShots:1},{rallyRadius:0.5},{selfRevives:1}],
  heavy:[{pierce:2},{suppressionDuration:0.5},{selfRevives:1}],
  tank:[{extraShots:2},{barrierHealth:0.6},{selfRevives:1}],
  medic:[{healOnHit:2},{reviveRate:0.5},{selfRevives:1}],
  mage:[{pierce:2},{sigilRadius:0.5},{selfRevives:1}],
  engineer:[{turretDamage:0.5},{extraTurrets:1},{selfRevives:1}],
  assassin:[{criticalChance:0.2},{veilDuration:0.5},{selfRevives:1}],
};
classSpecs.forEach((klass,classIndex) => klass.branches.forEach(([branch,names],branchIndex) => names.forEach((name,index) => {
  const depth=index+1;
  const effects = branchIndex===0
    ? {weaponDamage:[0.08,0.1,0.12,0.15,0.2,0.35][index],fireRate:[0,0.04,0.06,0.08,0.12,0.16][index]}
    : branchIndex===1
    ? {cooldownReduction:[0.025,0.025,0.04,0.05,0.06,0.1][index],abilityPotency:[0.05,0.05,0.08,0.1,0.12,0.2][index]}
    : {maxHealth:[10,12,15,20,25,30][index],armor:[0,0.03,0.04,0.05,0.06,0.1][index],regeneration:[0,0.1,0.15,0.2,0.25,0.5][index]};
  if(depth===6) Object.assign(effects,capstoneExtras[klass.id][branchIndex]);
  if(branchIndex===1 && depth===3) effects.ultimateCooldownReduction=0.1;
  if(branchIndex===1 && depth===5) Object.assign(effects,{ultimateCooldownReduction:0.1,ultimatePotency:0.25});
  if(branchIndex===1 && depth===6) Object.assign(effects,{
    soldier:{ultimateShield:30},heavy:{ultimateDuration:2},tank:{ultimatePotency:0.25},
    medic:{ultimateRadius:80},mage:{ultimatePulses:1},engineer:{ultimateDuration:6},assassin:{ultimateCharges:1},
  }[klass.id]);
  const formatEffects = Object.entries(effects).map(([key,amount]) => key+': +'+amount+(key==='maxHealth'||key==='healOnHit'?' HP':key==='regeneration'?' HP/s':'')).join('; ');
  baseSkills.push({id:klass.id+'-'+slug(branch)+'-'+depth,classId:klass.id,branchId:slug(branch),branchName:branch,name,depth,cost:depth,grade:grades[index*3+(classIndex+branchIndex)%3],prerequisite:depth===1?null:klass.id+'-'+slug(branch)+'-'+index,capstone:depth===6,effects,description:formatEffects+'. Effects add to the purchased build; global modifier limits apply.'});
})));
const skills=expandSkills(baseSkills,classes,grades);

const weaponSpecs = {
  soldier:[['Service Pistol',16,3.3,10,1.3,760,1,3,0,0],['Watch Carbine',13,5.5,24,1.6,850,1,4,0,240],['Threefold Rifle',12,8,24,1.8,900,1,2,1,460],['Last Watch',38,3.2,12,1.6,1150,1,0.5,2,720]],
  heavy:[['Belt Gun',10,7.5,45,2.4,700,1,9,0,0],['Drum Repeater',13,8,60,2.6,760,1,8,0,240],['Foundry Rotary',10,14,90,3,800,1,11,1,460],['Iron Choir',24,8,48,2.7,900,1,5,2,720]],
  tank:[['Riot Shotgun',8,1.7,6,1.8,600,5,24,0,0],['Gate Breacher',10,2,8,1.9,640,5,20,0,240],['Slug Driver',38,2.3,8,1.8,850,1,2,2,460],['Scatter Bastion',12,2.2,10,2,680,7,28,1,720]],
  medic:[['Injector Carbine',14,3.5,14,1.5,780,1,3,0,0],['Suture Repeater',12,6,24,1.6,820,1,4,0,240],['Serum Sprayer',7,5,30,1.8,620,3,16,0,460],['Lifeline Rifle',27,4.5,18,1.7,1000,1,1,2,720]],
  mage:[['Grave Wand',24,2.5,8,1.5,600,1,1,0,0],['Ash Scepter',18,4,12,1.6,640,1,2,1,240],['Bell Staff',15,3.5,12,1.8,650,3,20,0,460],['Ossuary Rod',44,3.2,10,1.7,760,1,1,3,720]],
  engineer:[['Rivet Pistol',15,3.5,12,1.4,740,1,4,0,0],['Nail Repeater',11,6.5,28,1.7,800,1,6,0,240],['Arc Riveter',23,4,18,1.7,840,1,3,2,460],['Siege Tool',34,4.5,20,2,900,1,2,2,720]],
  assassin:[['Needle Launcher',19,3.2,10,1.3,980,1,1,1,0],['Whisper Pistol',15,5.5,18,1.4,1000,1,2,1,240],['Spine Thrower',12,4,16,1.6,900,3,18,1,460],['Veil Crossbow',46,3,12,1.5,1200,1,0.5,3,720]],
};
const weapons = Object.entries(weaponSpecs).flatMap(([classId,rows])=>rows.map(([name,damage,fireRate,magazine,reloadTime,speed,pellets,spread,pierce,price],tier)=>({id:classId+'-'+tier,classId,name,tier,damage,fireRate,magazine,reloadTime,projectileSpeed:speed,pellets,spreadDegrees:spread,pierce,price,reserveAmmo:'infinite',rangeSeconds:1.6,baselineSustainedDps:Number((damage*pellets*magazine/(magazine/fireRate+reloadTime)).toFixed(2))})));
const upgrades = [
  {id:'damage',name:'Tempered Chamber',effect:'weaponDamage',amount:0.14,maximum:5,basePrice:90,priceStep:60},
  {id:'fire-rate',name:'Feed Tuning',effect:'fireRate',amount:0.07,maximum:5,basePrice:80,priceStep:50},
  {id:'magazine',name:'Reserve Clip',effect:'magazine',amount:2,maximum:4,basePrice:70,priceStep:45},
  {id:'reload',name:'Quick Hands',effect:'reloadReduction',amount:0.08,maximum:4,basePrice:80,priceStep:55},
  {id:'health',name:'Lined Coat',effect:'maxHealth',amount:10,maximum:3,basePrice:100,priceStep:70},
];
const supplies = [
  {id:'medkit',name:'Medkit',price:90,cooldown:3,effect:'heal',amount:45,duration:0},
  {id:'adrenaline',name:'Adrenaline',price:100,cooldown:6,effect:'moveSpeed',amount:0.25,duration:6},
  {id:'armor-plate',name:'Armor Plate',price:110,cooldown:5,effect:'shield',amount:45,duration:20},
  {id:'antidote',name:'Antidote',price:65,cooldown:3,effect:'cleanse',amount:20,duration:0},
  {id:'revive-kit',name:'Revive Kit',price:140,cooldown:8,effect:'revive',amount:0.65,duration:0},
  {id:'barrier-charge',name:'Barrier Charge',price:120,cooldown:8,effect:'barrier',amount:100,duration:5},
  {id:'ammo-pouch',name:'Ammo Pouch',price:70,cooldown:4,effect:'reload',amount:1,duration:0},
  {id:'focus-tonic',name:'Focus Tonic',price:110,cooldown:8,effect:'abilityCooldown',amount:0.5,duration:0},
].map(value=>({...value,maximumStack:2,inventorySlots:3}));

const attack = (kind,count,speed,damage,interval,telegraph,extra={}) => ({kind,count,speed,damage,interval,telegraph,...extra});
const bossSpecs = [
  ['constable','Hollow Constable','A dead watch captain remembers every order except whom it was meant to protect.',1,120,1,['gatehouse','crown-crypt'],[attack('fan',7,160,12,3.2,0.85,{arc:90}),attack('zone',2,0,10,7,1.2,{radius:75,duration:3,slow:0.35})]],
  ['courier','Carrion Courier','A messenger runs the same route after the streets and their names have disappeared.',1,90,0.75,['gatehouse','triage-yard'],[attack('charge',1,420,18,5,1),attack('cross',20,160,11,4,0.9)]],
  ['pallbearer','Pallbearer','The coffin is empty. Its bearer keeps making room.',1,150,1.05,['gatehouse','ossuary-works'],[attack('charge',1,330,22,7,1.1),attack('fan',9,140,13,4.5,1,{arc:130}),attack('armor',1,0,0,13,1,{duration:3,resistance:0.5})]],
  ['matron','Cradle Matron','An infirmary keeper shelters the dead beneath a dress sewn from bed linen.',2,150,1,['triage-yard','sunken-chapel'],[attack('summon',4,80,9,8,1.2,{health:45,maximum:18}),attack('ring',20,120,11,6,1)]],
  ['alchemist','Mold Alchemist','A municipal chemist carries a garden that learned to grow without sunlight.',3,150,0.95,['triage-yard','ossuary-works'],[attack('pool',3,0,10,6,1.3,{radius:65,duration:5}),attack('fan',11,145,12,4,0.9,{arc:110})]],
  ['bellringer','Bellringer','Every note is a warning delivered too late.',3,120,0.9,['sunken-chapel','bell-foundry'],[attack('pulse',24,130,14,5.5,1.1,{gap:35}),attack('spiral',12,150,11,4,0.8)]],
  ['stitchwright','Stitchwright','A surgeon of uniforms now mends the people who wore them.',4,120,0.9,['triage-yard','ossuary-works'],[attack('hook',3,230,15,5,1,{slow:0.5,duration:2}),attack('lanes',18,170,13,6,1.1)]],
  ['choir','Grave Choir','The singers are separate corpses. The voice beneath them is singular.',5,150,1,['sunken-chapel','bell-foundry'],[attack('beam',3,0,20,6,1.3,{duration:0.6,width:26}),attack('spiral',20,145,13,4,0.9)]],
  ['engine','Mortuary Engine','A foundry foreman is buried inside the machine that will not let him clock out.',6,180,1.15,['ossuary-works','bell-foundry'],[attack('armor',1,0,0,15,1,{duration:4,resistance:0.6}),attack('lanes',26,170,15,6,1.2),attack('fan',13,170,14,4.5,1,{arc:150})]],
  ['regent','Drowned Regent','The mayor opens the floodgates for a city that no longer breathes.',7,180,1.1,['sunken-chapel','crown-crypt'],[attack('warp',1,0,0,10,1.3),attack('ring',30,150,16,5,1.1),attack('pool',4,0,12,7,1.4,{radius:70,duration:5})]],
  ['uncounted','The Uncounted','The bells remember the names the city refused to record.',11,210,1.2,['crown-crypt'],[attack('spiral',28,165,17,4,1),attack('beam',4,0,22,7,1.4,{duration:0.6,width:28}),attack('warp',1,0,0,12,1.3),attack('summon',5,90,10,10,1.3,{health:60,maximum:20})]],
];
const bossMechanics={
  constable:{arrestZoneSlow:0.35,zoneDuration:3},courier:{chargeTrailWidth:32,chargeTrailDuration:3,chargeTrailDamagePerSecond:10},
  pallbearer:{movingCoverHealth:180,movingCoverSpeed:75,coffinFrontResistance:0.5},
  matron:{nestHealth:100,nestSpawnInterval:6,nestMaximum:3,minionsPerNest:2},
  bellringer:{ringGapDegrees:35,gapRotationDegreesPerAttack:30},alchemist:{poolSafeWindow:1.3,poolDuration:5},
  stitchwright:{tetherHealth:45,tetherDuration:4,tetherRange:350,rescueChannelSeconds:1},
  choir:{casterCount:3,casterRadius:24,casterHealthFraction:0.34,beamOffsetSeconds:0.45},
  engine:{weakPointRadius:26,weakPointDamageMultiplier:1.6,armorSeconds:4,armorResistance:0.6},
  regent:{waterShiftInterval:12,waterSlow:0.2,decoyDuration:2,decoyMaximum:2},
  uncounted:{ledgerEchoInterval:10,echoMaximum:4,finalRingGapDegrees:40},
};
const originalBosses = bossSpecs.map(([id,name,lore,minThreat,timer,healthFactor,arenaIds,attacks]) => ({
  id,name,lore,minThreat,timer,healthFactor,arenaIds,
  mechanics:bossMechanics[id],
  secret:id==='uncounted',
  radius:id==='engine'?76:58,
  phases:[1,0.75,0.4].map((healthThreshold,phase) => ({
    healthThreshold,
    accordBreak:phase>0,
    attacks:attacks.map(value => ({
      ...value,
      count:value.count>1?value.count+phase*2:value.count,
      speed:Math.round(value.speed*(1+phase*0.08)),
      interval:Number((value.interval*(1-phase*0.1)).toFixed(2)),
    })),
  })),
}));
const bosses=expandBosses(originalBosses,modes);
addBossVariants(bosses);
reviseConstable(bosses);
addEarlyWatch(bosses,bossPools);
addSmallWakes(bosses,bossPools);

const mutationSpecs = [
  ['glass-pact','Glass Pact','Half maximum health; triple weapon damage.',{maxHealth:0.5,damage:3},['salt-circle']],
  ['borrowed-day','Borrowed Day','Boss health +30%; bounty doubled.',{bossHealth:1.3,coins:2},[]],
  ['rationed-mercy','Rationed Mercy','Healing -40%; bounty +40%.',{healing:0.6,coins:1.4},['lifeline']],
  ['hot-iron','Hot Iron','Weapon damage +35%; reloads take 30% longer.',{damage:1.35,reloadTime:1.3},[]],
  ['open-veins','Open Veins','Maximum health -25%; fire rate +25%.',{maxHealth:0.75,fireRate:1.25},[]],
  ['heavy-oath','Heavy Oath','Move speed -18%; gain 22 percentage points of armor.',{moveSpeed:0.82,armor:0.22},[]],
  ['dead-calm','Dead Calm','Hostile projectiles are 20% slower; weapon fire rate -15%.',{bossSpeed:0.8,fireRate:0.85},['mercury-hour']],
  ['quick-blood','Quick Blood','Move speed +20%; maximum health -20%.',{moveSpeed:1.2,maxHealth:0.8},[]],
  ['storm-tax','Storm Tax','Boss bullet counts +30%; bounty +60%.',{bossBulletCount:1.3,coins:1.6},[]],
  ['long-night','Long Night','Boss deadlines 10% shorter; bounty +40%.',{timer:0.9,coins:1.4},[]],
  ['lifeline','Lifeline','Healing +50%; weapon damage -20%.',{healing:1.5,damage:0.8},['rationed-mercy']],
  ['thin-walls','Thin Walls','Barrier health -40%; weapon fire rate +20%.',{barrierHealth:0.6,fireRate:1.2},[]],
  ['steady-hands','Steady Hands','Weapon spread -35%; move speed -10%.',{spread:0.65,moveSpeed:0.9},[]],
  ['deep-pockets','Deep Pockets','Magazine capacity +40%; reloads take 25% longer.',{magazine:1.4,reloadTime:1.25},[]],
  ['panic-drill','Panic Drill','Dodge cooldown -35%; hostile projectiles 10% faster.',{dodgeCooldown:0.65,bossSpeed:1.1},[]],
  ['iron-rain','Iron Rain','One additional weapon projectile; weapon damage -30%.',{extraShots:1,damage:0.7},[]],
  ['salt-circle','Salt Circle','Gain 15 percentage points of armor; maximum health -20%.',{armor:0.15,maxHealth:0.8},['glass-pact']],
  ['grave-interest','Grave Interest','Bounty +75%; boss damage +20%.',{coins:1.75,bossDamage:1.2},[]],
  ['bitter-medicine','Bitter Medicine','Healing -25%; weapon damage +25%.',{healing:0.75,damage:1.25},[]],
  ['brass-halo','Brass Halo','Start each boss with 30 shield; hostile projectiles 10% faster.',{startShield:30,bossSpeed:1.1},[]],
  ['last-rites','Last Rites','Revive channel time -30%; boss health +15%.',{reviveTime:0.7,bossHealth:1.15},[]],
  ['mercury-hour','Mercury Hour','Fire rate +25%; reloads take 15% longer.',{fireRate:1.25,reloadTime:1.15},['dead-calm']],
  ['spare-parts','Spare Parts','Ability potency +25%; weapon fire rate -10%.',{abilityPotency:1.25,fireRate:0.9},[]],
  ['ash-tithe','Ash Tithe','Bounty +30% and weapon damage +10%; maximum health -20%.',{coins:1.3,damage:1.1,maxHealth:0.8},[]],
];
const mutations = mutationSpecs.map(([id,name,description,modifiers,excludes])=>({id,name,description,modifiers,excludes,durationEncounters:3}));
const arenas = [
  ['gatehouse','Gatehouse','#5e7269','#172b29','Broken civic gates and an empty fountain.',['Fountain cover','Outer-wall lanes']],
  ['triage-yard','Triage Yard','#8f8772','#34372f','Abandoned hospital canvas and quiet rows of cots.',['Central triage island','Wide rescue paths']],
  ['ossuary-works','Ossuary Works','#6b6e67','#252d2a','Mortuary machinery, bone crates and dry industrial channels.',['Two machine islands','Diagonal fire corridors']],
  ['sunken-chapel','Sunken Chapel','#667b78','#223331','A flooded chapel with exposed stone walks and a cracked altar.',['Altar cover','Clearly marked water margins']],
  ['bell-foundry','Bell Foundry','#8b735b','#342a24','Cold brass bells and immense foundry molds.',['Mold islands','Four broad exits']],
  ['crown-crypt','Crown Crypt','#75758a','#242936','The drowned council chamber under a hollow crown of bells.',['Council dais','Open outer ring']],
].map(([id,name,floor,shadow,description,features],index)=>({id,name,floor,shadow,description,features,width:1600,height:1000,playerSpawn:{x:800,y:800},bossSpawn:{x:800,y:300},obstacles:id==='gatehouse'?gatehouseObstacles:[{x:390+(index%2)*60,y:440,width:110,height:85},{x:1100-(index%2)*60,y:440,width:110,height:85}],minimumClearLane:170}));

const leaderboards=JSON.parse(fs.readFileSync(path.join(root,'content/leaderboards.json'),'utf8'));
const manifest = {rules,locales,difficulties,modes,classes,skills,weapons,upgrades,supplies,bosses,bossPools,mutations,arenas,grades,leaderboards,threats:['Normal','Aberrant','Predator','Brute','Scourge','Dread','Disaster','Catastrophe','Cataclysm','Calamity','The Uncounted']};
applyEncounterPacing(manifest);addClassTalents(manifest);
applyWardenPatrol(manifest);applyCrazedHorizon(manifest);applyCourierRoute(manifest);applyRatcatcherMuster(manifest);applyClerkAppeal(manifest);applyTollkeeperReturn(manifest);applyMarshalChains(manifest);applyWidowGates(manifest);applyAmbulanceRoute(manifest);
for(const [key,value] of Object.entries(manifest)) json('content/'+key+'.json',value);
json('content/catalog.json',manifest);
write('docs/balance/skills.csv',csv(['id','class','branch','subbranch','name','depth','cost','grade','prerequisite','capstone','effects'],skills.map(s=>[s.id,s.classId,s.branchName,s.subbranchName,s.name,s.depth,s.cost,s.grade,s.prerequisite??'',s.capstone,JSON.stringify(s.effects)])));
write('docs/balance/weapons.csv',csv(['id','class','name','damageHP','shotsPerSecond','magazine','reloadSeconds','projectilePixelsPerSecond','pellets','spreadDegrees','pierce','priceCoins','baselineDPS'],weapons.map(w=>[w.id,w.classId,w.name,w.damage,w.fireRate,w.magazine,w.reloadTime,w.projectileSpeed,w.pellets,w.spreadDegrees,w.pierce,w.price,w.baselineSustainedDps])));
write('docs/balance/difficulties.csv',csv(['id','health','damage','speed','extraPatterns','coins','healing','locked'],difficulties.map(d=>[d.id,d.health,d.damage,d.speed,d.extraPatterns,d.coins,d.healing,d.locked])));
write('docs/balance/mutations.csv',csv(['id','name','durationEncounters','description','modifiers','excludes'],mutations.map(m=>[m.id,m.name,m.durationEncounters,m.description,JSON.stringify(m.modifiers),m.excludes.join(';')])));
const rewardRows=[];
for(const mode of modes.filter(m=>m.kind==='campaign')) for(let j=0;j<mode.encounters;j++) rewardRows.push([mode.id,j+1,mode.threats[j],3+Math.floor(24*j/(mode.encounters-1)),120+Math.floor(2280*j/(mode.encounters-1)),mode.arenas[j]]);
write('docs/balance/route-budgets.csv',csv(['route','fight','nominalThreat','cumulativeSP','nominalCumulativeCoinIncome','arena'],rewardRows));

const research=[
  {title:'Handshake multiplayer game mission',url:'https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/',use:'Public URL, room codes, account-free phone and laptop play.'},
  {title:'Official multiplayer contest rules',url:'https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0',use:'October 30, 2026, 11:59 PM Pacific deadline; four equally weighted rubric categories; title, cover, description and URL.'},
  {title:'Colyseus current room API',url:'https://docs.colyseus.io/room',use:'Fixed simulation timestep, room lifecycle and reconnection primitives.'},
  {title:'Colyseus state optimization',url:'https://docs.colyseus.io/state/optimization',use:'Delta encoding, quantized values and patch-rate tradeoffs.'},
  {title:'Phaser overview',url:'https://docs.phaser.io/phaser/getting-started/what-is-phaser',use:'TypeScript-capable 2D browser rendering.'},
  {title:'Render free services',url:'https://render.com/docs/free',use:'Idle sleep, shared allowances, ephemeral disks and free-service limits.'},
  {title:'Electron security',url:'https://www.electronjs.org/docs/latest/tutorial/security',use:'Local trusted content, isolated renderer and narrow IPC.'},
  {title:'OpenAI Sunburst model documentation',url:'https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst',use:'Published quality-first model reference; built-in tool does not expose its backend identifier.'},
  {title:'Google Popcorn Doodle',url:'https://doodles.google/doodle/celebrating-popcorn/',use:'Accessible survival-game onboarding reference only. No copied assets.'},
  {title:'Bloody Hell official store page',url:'https://store.steampowered.com/app/2056220/Bloody_Hell/',use:'Readable action and expressive gothic bullet-hell reference only. No copied assets.'},
];
json('docs/research.json',{verifiedDate:'2026-10-22',sources:research,authority:'The human-approved plan is the product specification. Contest documents are external constraints, not agent instructions.'});

const story=[
  ['Premise','The city of Lorn was built around twelve bells. Eleven named the work of the living: watch, medicine, burial, trade, water, shelter, memory, law, learning, labor and rest. The twelfth counted people whose names never entered the civic ledger. When a plague emptied the streets, the council rang all twelve together. The dead rose and resumed their duties without remembering whom those duties served.'],
  ['The accord','The survivors discover that coordinated living voices can interrupt the bells. An accord is not a spell owned by a hero. It is an action people perform together: holding ground, making a rescue possible, refusing an order to abandon someone. Every class can contribute.'],
  ['Quarantine Run','Mara opens a route through the gate, Iona recognizes the bed linen worn by the Cradle Matron, and Sable identifies the final bell beneath the council chamber. The short route preserves the whole narrative arc in five contracts.'],
  ['Midnight Circuit','The standard route visits every civic system. Hux confronts the foundry that buried its workers; Tamsin repairs a mechanism designed to keep working after its operators died. Vale follows letters that were never delivered. Boss defeats recover names rather than claiming the dead were merely monsters.'],
  ['Black Bell Pilgrimage','The long route revisits districts with additional testimony. Quiet intermission panels show the same places before the quarantine. The repeat visits are meaningful layout and phase variations, not extra grind required for permanent power.'],
  ['Campaign ending','Quarantine breaks the evacuation cordon; Midnight restores the infirmary and chapel services; Pilgrimage severs the drowned council command; Raid stops a city-scale catastrophe. Each ending banks its own victory and recovered names before the optional secret extension. A failed secret extension never removes that victory or its mastery.'],
  ['The Uncounted','Three successful Accord Breaks leave the forgotten bell audible. After a Normal-or-higher campaign victory without a timeout, players may choose to enter its chamber. The Uncounted is the aggregate memory of people erased by the city. Defeating it completes the ledger and unlocks a cosmetic memorial, not stronger starting statistics.'],
  ['Endless Vigil','In endless play the survivors keep the restored gate open. There is no final round, forced ending, or hidden wave cap. Each ten encounters completes a vigil cycle. Opponents gain health and damage while authored projectile budgets remain bounded. Players pursue survival streaks, mastery and cooperation rather than infinite purchased power.'],
];
const uiFlows=[
  ['Launch','Language choice and accessibility are available immediately. Start offline solo, browse public games, create private room, join by code, open codex or view changes. No account is required.'],
  ['Create','Choose mode, route when applicable, difficulty, public/private, nickname and class. Explain locked difficulties and public capacity before starting.'],
  ['Lobby','Show connected party, classes, readiness, mode, difficulty and room code where appropriate. Public listing data excludes private codes and recovery tokens.'],
  ['Combat','Top: boss health, phase and timer. Bottom: own health, ammo, dodge and abilities. Side: concise party state and pings. Accord Break prompts have clear progress and deadline.'],
  ['Intermission','Personal rewards, three mutation cards, three anonymous boss contracts, then class shop and skill tree. Timers are server-owned. Solo can confirm early; multiplayer advances early only when every eligible participant has confirmed.'],
  ['Defeat','Show the reason, completed contracts, personal and squad streaks, and next actions. Preserve earned mastery. Offer retry, return to lobby or exit.'],
  ['Victory','Bank rewards, show chapter ending and unlocked content, then offer the optional secret encounter if eligible. Other players may extract while willing players continue.'],
  ['Recovery','Show reconnecting status without freezing the whole room. After a restart, restore an unexpired signed intermission checkpoint with compatible protocol and content revision.'],
];
const network=[
  ['RoomSettings','mode, difficulty, visibility, seed, contentRevision, protocolVersion. Route is represented by the selected campaign mode.'],
  ['PublicRoomSummary','public room ID, name, mode, difficulty, connected players, maximum players, phase and capacity state. Never a private code, checkpoint signature or reconnect token.'],
  ['InputFrame','sequence, client tick, normalized movement, aim angle, fire, reload, dodge, Q/E, ultimate and interact actions. Reject non-finite, oversized, stale and rate-exceeding inputs.'],
  ['ContentCatalog','Versioned definitions for classes, abilities, weapons, upgrades, supplies, skills, bosses, attacks, difficulties, mutations, modes and arenas.'],
  ['ProfileV1','Locale, controls, display/audio/accessibility settings, mastery, cosmetics, lore, difficulty unlocks and local best streaks. No purchased online power.'],
  ['CheckpointV1','Room ID, intermission sequence, seed, mode, difficulty, roster/builds, earned rewards, mutation lifetimes, recovery credentials, issue/expiry times, protocol/content revisions and HMAC signature. Never broadcast the signing key.'],
];
const stage1Artifacts=[
  ['Cover','assets/proofs/cover-v1.png','Wide finished original illustration with the Grave Accord wordmark.'],
  ['Survivors','assets/proofs/survivors-v3.png','Seven distinct full-body survivors, stable class identity and equipment, cleaner broad matte coat panels with focal face/hand/prop detail.'],
  ['Bosses','assets/proofs/bosses-v1.png','Eleven original boss identities with clear silhouettes and scale language.'],
  ['Arena','assets/proofs/arena-v1.png','Top-down Gatehouse composition with quiet floor and readable paths.'],
  ['Desktop HUD','assets/proofs/hud-desktop-v1.png','Illustrated UI composition with clear health, timer, ammo and ability hierarchy.'],
  ['Phone HUD','assets/proofs/hud-phone-v1.png','Landscape touch HUD with clear controls and safe areas.'],
  ['Survivor animation','assets/proofs/soldier-run-v1.png','Fixed-grid, same-facing eight-frame locomotion proof; inspect frame pivots and cycle in motion.'],
  ['Boss animation','assets/proofs/boss-attack-v1.png','Fixed-grid, same-facing eight-frame constable attack proof with anticipation, release and recovery.'],
];
json('docs/art-contracts.json',{
  style:'Dry black ink and matte opaque gouache; bone, moss teal, rust, ochre, indigo and charcoal. Restrained scenery and no particles that obscure play.',
  rasterTextPolicy:'Brand wordmark may be raster. Functional UI and gameplay text are runtime-localized.',
  survivor:{sourceCell:256,displayHeight:56,origin:[0.5,0.86],directions:['south','east','north','west'],animations:{idle:{frames:4,fps:5},run:{frames:8,fps:10},attack:{frames:4,fps:12},hurt:{frames:2,fps:8},dash:{frames:6,fps:20},downed:{frames:6,fps:6}}},
  boss:{sourceCell:512,displayHeight:150,origin:[0.5,0.84],animations:{idle:{frames:4,fps:5},attack:{frames:8,fps:10},hurt:{frames:3,fps:10},defeat:{frames:8,fps:8}}},
  proofAnimation:{gridColumns:4,gridRows:2,frameCount:8,fps:10,alphaRequired:true,footPivotTolerancePixels:8,review:'Review each frame at native resolution and loop at actual gameplay size. Reject shape morphs, missing limbs, ghosted weapon copies and moving cell boundaries.'},
  proofs:stage1Artifacts.map(([id,file,acceptance])=>({id,file,acceptance})),
  supplementalProofs:[{id:'Clean-detail boss finish',file:'assets/proofs/bosses-clean-detail-v2.png',acceptance:'Six representative boss identities with broad quiet painted surfaces; this finish proof does not constitute the full sixty-boss sprite library.'}],
  finishAuthority:'docs/ART_READABILITY_CONTRACT.json',
  noCopiedReferenceAssets:true,backendPolicy:'Built-in OpenAI image generation; record model identifier only if actually reported.',
});

const parts=[
  '# Grave Accord - Stage 1 production bible',
  'Edition 0.2.0 | 2026-10-22 | Expanded 60-boss design | Original cooperative gothic zombie bullet hell',
  'Status: design and preproduction. Balance values are explicit starting hypotheses. Gameplay, performance and human playtesting are not yet verified.',
  '## Product promise',
  'A group joins with a room code or public discovery, chooses distinct survivor roles, dodges readable zombie attacks and votes on shared risks. An offline solo game and a Windows portable build use the same rules. Endless Vigil has no final round. The complete roadmap includes every mode and class below.',
  '## Setting and narrative',
  ...story.flatMap(([heading,text])=>['### '+heading,text]),
  '## Modes, routes and pacing',
  table(['Mode','Players','Encounters','Target minutes','Purpose'],modes.map(m=>[m.name,'1-'+m.maxPlayers,m.encounters??'Unlimited',m.targetMinutes?.join('-')??'Until defeat',m.description])),
  'Target pacing assumes roughly 110, 120 and 145 seconds of combat per short, standard and long encounter, plus 60 seconds per full intermission. These give approximately 13.2, 29.0 and 53.7 minutes. Faster skilled groups can finish sooner. Raid encounters have extended authored phases. There is no forced waiting to meet a duration claim.',
  'Nominal campaign threat paths: Short 1,3,5,8,10; Standard 1 through 10; Long 1,1,2,2,3,3,4,4,5,6,7,8,9,9,10,10. Boss votes offer three distinct unused identities from the route-specific pool, with concealed identities and visible risk/bounty/build recommendations. Reserve three finale identities for the last vote. Short has six regular plus three finale bosses; Standard eleven plus three; Long seventeen plus three; Raid four plus three. These counts leave at least three unused candidates at every vote without repeating a boss in one timed run. Contract threat scales mechanics and never reveals identity. Never reveal boss ID or illustration in contract cards.',
  '## Controls and combat rules',
  'Mouse and keyboard: WASD move, pointer aim, left button fire, R reload, Space dodge, Q/E abilities, X ultimate, F interact/revive, 1/2/3 supplies, Escape pause or menu. Gamepad: left stick move, right stick aim, right trigger fire, south face dodge, shoulder buttons abilities, west face reload, north face interact, east face ultimate. Touch: left movement stick, right aim/fire stick, independent dodge/Q/E/ultimate/interact buttons. Bindings are remappable.',
  'Manual aiming is the baseline. Aim assist and auto-fire are optional and available on every difficulty. Solo pause stops simulation. Online menus do not pause the room. Reduce friendly effects without hiding hostile hazards. Do not mirror movement, world geometry or aiming in RTL locales.',
  'Player radius 9 px; ordinary hostile projectile radius 5 px; arena 1600 x 1000 world px. Dodge lasts 0.22 s at 800 px/s, grants 0.16 s invulnerability and has a 3.5 s cooldown. Use relative swept collision for fast moving circles and segment/rectangle checks for beams. Friendly fire and player collision are disabled. Friendly structures do not block teammate movement.',
  'At zero health, a player is downed for 20 s. Any living teammate can channel a 2 s revive, returning the target at 50% health; damage interrupts the channel. An eliminated player returns next encounter. Solo has one self-revive per boss. A fully incapacitated party or expired deadline loses the encounter. All living entrants start each boss fully healed and reloaded.',
  '## Classes and abilities',
  table(['Class','Survivor','HP','Speed px/s','Role'],classes.map(c=>[c.name,c.survivor,c.health,c.speed,c.role])),
  ...classes.flatMap(c=>['### '+c.name+' - '+c.survivor,c.lore,...c.abilities.map(a=>a.name+' ['+a.slot.toUpperCase()+']: '+a.description+' Cooldown '+a.cooldown+' s; duration '+a.duration+' s; radius/range '+a.radius+' px; base damage '+a.damage+' HP.'),'Ultimate '+c.ultimate.name+' [X]: '+c.ultimate.description+' Cooldown '+c.ultimate.cooldown+' s; duration '+c.ultimate.duration+' s; range '+c.ultimate.radius+' px.']),
  'Ultimates begin ready and advance cooldown only during active combat. Intermissions and solo pause do not recharge them. The utility branch upgrades ultimate cooldown at depths 3 and 5, potency at depth 5, and a unique ultimate mechanic at its capstone. Ultimate cooldown reduction is capped at 40%; Focus Tonic affects Q/E only. Identical ally auras use the strongest magnitude and longest remaining duration rather than multiplying. Keyboard X and gamepad east face button activate the ultimate; a separate labeled touch control displays ready state and remaining cooldown.',
  '## Skill tree and build budget',
  'Every class has three parent branches, each with three six-node specialization paths: 54 nodes per class and 378 overall. Every parent branch covers all eighteen grades from D- through SS+. Grades describe investment bands and specialization complexity; same-cost alternatives provide different benefits rather than strict dominance. Depth costs are 1,2,3,4,5,6 SP; one full specialization costs 21 SP. Paths may be mixed, but prerequisites stay within their path and only one capstone can be active. Start campaigns at 3 SP and award 24 more before the final boss. Before fight j+1 of R fights, cumulative SP = 3 + floor(24*j/(R-1)). All campaigns arrive at 27 SP, allowing a capstone and six complementary points. A free pre-encounter respec is available in the first shop; later respec costs 90 coins and cannot occur during combat.',
  'Grand Raid pre-fight skill budgets are 12,20,27. Endless follows the standard ten-encounter ramp and caps purchased skill power at 27; later rewards are mastery and streak progress. Do not award unspendable infinite skill points.',
  'Effect units: weaponDamage, fireRate, cooldownReduction, ultimateCooldownReduction, abilityPotency, ultimatePotency, armor, criticalChance and named ability modifiers are additive fractions; maxHealth/healOnHit/ultimateShield are HP; regeneration is HP/s; ultimateDuration is seconds; ultimateRadius is pixels; pierce, extraShots, selfRevives, extraTurrets, ultimatePulses and ultimateCharges are integers. Apply modifier limits after combining purchased effects. Armor cannot exceed 65%; weapon cooldown and reload duration remain positive.',
  table(['Class','Branch','Specialization','Node','SP','Grade','Effects'],skills.map(s=>[s.classId,s.branchName,s.subbranchName,s.name,s.cost,s.grade,Object.entries(s.effects).map(([k,v])=>k+' '+v).join('; ')])),
  '## Weapons and class shops',
  'All classes begin with their tier-zero weapon. Reserve ammunition is infinite; magazines and timed reload/refocus cycles preserve meaningful fire rhythm without hard ammunition soft locks. Pellets are individual projectiles. Spread is total cone width in degrees, speed is world px/s, damage is HP per hit, and pierce is additional targets after the first.',
  table(['Class / weapon','Price','Damage x pellets','Rate /s','Magazine','Reload s'],weapons.map(w=>[w.classId+' / '+w.name,w.price,w.damage+' x '+w.pellets,w.fireRate,w.magazine,w.reloadTime])),
  table(['Upgrade','Effect per level','Maximum','Initial / increase coins'],upgrades.map(u=>[u.name,u.effect+' +'+u.amount,u.maximum,u.basePrice+' / '+u.priceStep])),
  table(['Supply','Coins','Effect','Cooldown s'],supplies.map(s=>[s.name,s.price,s.effect+' '+s.amount+'; duration '+s.duration+' s',s.cooldown])),
  'Three supply slots; maximum stack two. Purchases are atomic server transactions and deduct only after class compatibility, currency, quantity and phase checks pass. Coins and equipment reset at run end. No support player loses a completion payout because another player landed the final hit.',
  '## Economy and recommendations',
  'Campaign nominal cumulative coin income before fight j+1 is 120 + floor(2280*j/(R-1)); actual wallet balance subtracts purchases. Contract risk and active bounty mutations alter future rewards. The base route income is normalized so short routes do not become underpowered. Raid cumulative income budgets are 600,1400,2400. Deadlines and discounts never accept client-authored values.',
  'Build rating = 50% normalized sustained offense + 25% normalized survival + 25% normalized support. Normalize each class against its own baseline, not against Soldier damage. Grade capacities increase by factor 1.1 across the 18 D- through SS+ grades. Use the same capacity lookup to generate equivalent squad-count recommendations and validate them; recommendations describe purchased builds, not human skill.',
  'Published capacity formula: O = current weapon sustained DPS / starting weapon sustained DPS (including purchased weapon damage, fire rate, magazine and reload, excluding temporary buffs). V = (maxHP / baseHP) / (1 - permanentArmor), with armor capped at 0.65. S = (1 + purchased abilityPotency) / (1 - purchased Q/E cooldownReduction), with cooldown reduction capped at 0.60. Rating = 0.50*O + 0.25*V + 0.25*S. A baseline class rates 1. Grade g has capacity 1.1^g for g=0..17, D- to SS+. Display the greatest grade capacity no greater than rating, clamped at endpoints. Recommended total squad capacity = bossHP / (class-baseline reference DPS * 0.65 * deadlineSeconds), using the roster-independent HP coefficient and reference DPS equal to the median seven starting-weapon sustained DPS. For any selected grade, equivalent players = ceil(recommendedCapacity / gradeCapacity). The UI can show two equivalent examples generated from this same formula. Ratings inform choices; they do not gate joining or claim that support should outperform damage roles.',
  '## Boss threat, timers and phases',
  'Expanded roster: 60 distinct identities, comprising fifty route-specific bosses (9 Quarantine, 14 Midnight, 20 Pilgrimage, 7 Raid), nine Endless-only bosses and the optional secret Uncounted. The eleven-boss proof sheet is an early style sample, not the complete production roster. Each identity requires its own silhouette, signature mechanic, counterplay and phase presentation; recolors and threat variants do not increase the boss count. Full reference-sheet and animation production follows the first playable and 50-player feasibility gate.',
  'Threat labels: 1 Normal; 2 Aberrant; 3 Predator; 4 Brute; 5 Scourge; 6 Dread; 7 Disaster; 8 Catastrophe; 9 Cataclysm; 10 Calamity; 11 The Uncounted (secret classification above ten). Threat and selected difficulty are independent.',
  'Initial health formula: 1800 * 1.22^(threat-1) * (timer/120) * archetypeHealthFactor * (1 + 0.7*(roster-1)) * difficultyHealth * activeMutationHealth. Secret uses threat 10 health growth plus its authored health factor. Raid multiplies health by 1.25. This couples health to the encounter time budget without making longer timers synonymous with greater threat. Check all role builds against actual damage uptime before accepting the tuning.',
  'The editable uptime-model.csv is an analytical feasibility check across every campaign/class/difficulty/fight/legal boss combination. It assumes 65% movement-and-aim uptime, 70% pellet hits for multi-pellet weapons, worst-phase armor duty cycle and affordable legal offensive builds. It excludes Q/E damage, ultimates, mutations and Accord Break bonuses. Passing this model is a preproduction calculation, not observed combat balance; measured attack uptime and human pacing remain gameplay gates.',
  'Phases begin at 100%, 75% and 40% health. Phase transitions trigger optional Accord Breaks at 75% and 40%. Bosses telegraph before release; difficulty cannot reduce a telegraph below 0.45 s. Ordinary slow effects do not hard-stun bosses; accumulated control can create one 2 s stagger followed by 10 s resistance. Never permit an indefinite stun lock.',
  ...bosses.flatMap(b=>['### '+b.name,b.lore+' Home route '+b.route+'; minimum threat '+b.minThreat+'; deadline '+b.timer+' s; health coefficient '+b.healthFactor+'; radius '+b.radius+' px; estimated attackable fraction '+b.damageWindowFraction+'. Signature: '+b.signature.behavior+' Counterplay: '+b.signature.counterplay+' Mechanics: '+Object.entries(b.mechanics).map(([key,value])=>key+'='+JSON.stringify(value)).join('; ')+'. Field names encode units: Px is world pixels; PxPerSecond is speed; Seconds/Duration/Interval are seconds; HP is health; Fraction/Slow/Resistance/Opacity are fractions; Degrees is an angle; Count/Maximum and unqualified counts are integers.',table(['Phase / HP threshold','Attack','Count','Speed px/s','Damage HP','Interval / telegraph s'],b.phases.flatMap((p,i)=>p.attacks.map(a=>[String(i+1)+' / '+p.healthThreshold,a.kind,a.count,a.speed,a.damage,a.interval+' / '+a.telegraph])))]),
  '## Accord Break',
  'At a marked phase transition, create one pad for solo, two for 2-8 players, three for 9-16 players and up to five for larger groups. Give 8 s to activate pads by occupying them for 2 s; simultaneous activation is required for multiplayer. Pads spawn in reachable visible ground. Success staggers the boss for 4 s, increases received damage by 25% during that opening and grants a recovery pulse of 15 HP. Failure resumes the normal phase without an unavoidable punishment attack. All classes qualify. Track successful breaks for the secret ending.',
  '## Mutations and two votes',
  'Each mutation lasts three upcoming encounters. Expire old mutations before offering the next three cards; never offer an already active or incompatible mutation. At most three remain active. Every eligible connected participant has one vote, including downed teammates. Disconnected players abstain; tied counts use a seeded tie-break. Solo can confirm immediately. Multiplayer can finish early only after all eligible voters submit.',
  table(['Mutation','Effect','Excludes'],mutations.map(m=>[m.name,m.description,m.excludes.join(', ')||'None'])),
  '## Difficulties',
  table(['Difficulty','Boss HP','Damage','Speed','Extra patterns','Coins / healing'],difficulties.map(d=>[d.name,d.health,d.damage,d.speed,d.extraPatterns,d.coins+' / '+d.healing])),
  'All six use the complete skill-point budget. Insane and Hellish unlock after any full campaign route completed on Hard. Profile unlocks do not grant online combat power. Font size, color alternatives, aiming assistance and reduced effects never alter unlock eligibility.',
  '## Endless Vigil',
  'Endless Vigil has no terminal encounter or finite campaign completion screen. Threat ramps from one to ten and remains at ten while vigil cycles add 15% health and 12% damage per ten encounters. Speed grows 2.5% per cycle, capped at +50%; hostile projectile counts remain bounded by authored pattern budgets. Keep mutation votes, boss votes, shops and revives after every victory. Save the last completed intermission. Bank completed-encounter mastery even when the next boss defeats the party. Voluntary extraction banks the personal streak while remaining players continue.',
  'New public entrants join the next encounter with the same nominal skill/coin budget appropriate to the run stage; permanent profiles never supply trusted power values. Departures trigger a roster update at phase boundaries after their reconnect window expires, preserving remaining health fraction. New players cannot join at reward time to farm an already completed fight.',
  'Endless draws from all fifty route bosses plus nine exclusive identities. From encounter four, every fourth encounter offers three exclusive candidates so every voting outcome produces an exclusive boss; the others use a seeded fifty-boss shuffle bag. Do not repeat an identity within twelve completed encounters. The Uncounted remains a consent-based campaign extension rather than an unannounced random Endless encounter. A new vigil cycle changes bounded pattern variations; these variants are never counted as extra bosses.',
  '## Team leaderboards',
  'One completed team run occupies one row and one rank, with an expandable roster containing every combat participant. The four timed experiences score at most 1,000,000: 500,000 for a clear, up to 250,000 for speed against accumulated combat deadlines, 150,000 for the final surviving fraction, and 100,000 for avoiding actual HP damage. Menus, shops and loading never count as combat time. Departures remain in the eligible roster and cannot improve the survival fraction. Endless ranks completed bosses first, then combat time through the last completed clear, then normalized damage; total active survival is prominently shown but stalling cannot improve rank. Separate mode, difficulty, peak squad-size band and content/rules season. Public ranked is on by default; private ranked requires an explicit lobby choice. Offline and LAN records are local practice.',
  'The durable global store is a Sites D1 HTTP service, while Colyseus owns realtime combat on Render. Only authenticated authoritative servers register/finalize run metrics. Stable run IDs, sequence numbers, exact integer scoring, idempotence, terminal state and single-owner restore claims prevent duplicate or stale-checkpoint ranking. Registration interruption latches a run unverified while gameplay continues. Full schemas, indexed storage and race/score fixtures are in docs/LEADERBOARDS.md and content/leaderboards.json.',
  '## Arenas',
  table(['Arena','Layout and mood','Readability'],arenas.map(a=>[a.name,a.description,a.features.join('; ')])),
  'Use obstacle geometry from the content definitions. Static obstacles block movement and shots; friendly deployed structures block hostile shots while allowing teammates through. Maintain at least 170 px clear routes and readable spawn/escape ground. Group cosmetic pings into squad cells in 50-player games without changing shared boss state.',
  '## Player interface flows',
  table(['Flow','Behavior'],uiFlows),
  '## Localization and accessibility',
  'Launch catalogs: '+locales.map(l=>l.id).join(', ')+'. Arabic and Urdu use RTL menus; never mirror gameplay. Chinese script variants are independent catalogs. Localize all UI, errors, mechanics, descriptions, tutorials, endings and release highlights. Keep runtime words out of artwork. Persist selection, match browser locale on first launch, use Intl number/plural formatting, validate placeholders and retain 40% text expansion space. Bundle licensed font subsets for offline play. Translation coverage is distinct from native-speaker review.',
  'Provide remapping, hold/toggle options, optional aim assistance and auto-fire, independent music/effects volume, reduced motion/flashes, high-contrast hostile shapes, readable text scaling, subtitles for nonverbal warning meaning, and touch safe areas. Color is never the only danger cue.',
  '## Architecture and interfaces',
  'Stack: TypeScript, Phaser, Vite, Colyseus, Electron. Share a headless fixed-step simulation between Node online server and offline client worker. Simulate at 30 Hz, patch at 20 Hz, render independently. Predict local movement and reconcile acknowledgements. The server owns collision, damage, timers, votes, inventory and economy.',
  table(['Interface','Contract'],network),
  'Use pattern/spawn messages plus periodic corrections instead of continuous full bullet-state broadcasts. Pool projectiles, use spatial collision searches, quantize player position updates and encode shared patches once where feasible. Enforce per-room and instance-wide capacity separately. Queue additional games rather than oversubscribe the free instance.',
  'Desktop renderer: local bundled files, nodeIntegration false, contextIsolation true, sandbox true and minimal validated preload IPC. Start an embedded local server only for explicit LAN hosting. Offline solo uses the shared simulation without network access. Never ship signing secrets, access tokens or credentials in the application.',
  '## Persistence and recovery',
  'Persist versioned ProfileV1 locally with safe replacement and import validation. Store solo checkpoints only between encounters. Online checkpoints are server-signed, expire after 24 h and are distributed to participants; recovery restores the last completed intermission rather than trusting client-authored damage. Reconnect slots last 60 s. Preserve compatible signed checkpoints across free-host restart using a stable server-only environment signing key. Reject incompatible protocol/content and explain recovery choices.',
  '## Art, animation and audio',
  'Use dry ink outlines and matte gouache with original survivor and undead silhouettes. Keep floors quiet, effects restrained and enemy bullets highly legible. Detail is concentrated in faces, hands and one signature prop; use broad low-contrast clothing surfaces and three major value masses, without dense all-over cracks or filigree. No copied reference-game sprites. Existing proofs establish identity and palette; the updated clean-detail art contract is the finish authority for production. Preserve generated originals, prompts and hashes; do not claim an unreported model.',
  table(['Proof','File','Acceptance'],stage1Artifacts),
  'Survivor source cells are 256 px, displayed about 56 px high, foot origin (0.5,0.86). Four drawn facings; idle 4 frames at 5 fps, run 8 at 10 fps, attack 4 at 12 fps, hurt 2 at 8 fps, dash 6 at 20 fps, downed 6 at 6 fps. Boss source cells are 512 px, displayed about 150 px high with origin (0.5,0.84); idle 4 at 5 fps, attack 8 at 10 fps, hurt 3 at 10 fps, defeat 8 at 8 fps. Atlas metadata defines every cell and pivot. Reject identity drift, moving baselines and broken loops.',
  'Audio proofs: City Wake (78 BPM, eight bars, quiet hub loop) and Vigil Engine (104 BPM, eight bars, combat loop). Use original synthesized modal bells, warm bass and restrained percussion. Deliver 44.1 kHz PCM WAV masters, synthesis source, timing metadata, peak/RMS and seam measurements. SFX distinguish shots, impacts, dodge, warning, revive, Accord success and UI confirmation. Bundle all audio; no service API is needed during play.',
  'The delivered proof bank includes seven weapon families and seven unique ultimate cues, with 25 SFX total and eight summable stems. docs/AUDIO_BIBLE.md defines the complete ten-track score, six ambient beds, warning priorities, gain/ducking rules and future production. Signal verification is distinct from human listening and runtime mix approval.',
  '## Repository, changelog and delivery',
  'Preserve MIT licensing and include third-party notices. Branch changes through pull requests. One GitHub Project uses Stage 1, Stage 2, Stage 2.5 and Stage 3 milestones, subsystem, priority, status and evidence fields. Canonical Wiki content lives under docs/wiki and is published to the repository Wiki. CHANGELOG.md records implemented changes; in-game localized release highlights summarize released changes.',
  'Main ruleset: require PR, successful verify check, up-to-date branch, resolved conversations, linear history; block force pushes and deletion; zero reviewer approvals and no bypass actors. Register a successful verify before making it required. Stage 1 verify checks content and artifacts; add game checks as implementation appears. Publish Windows binaries and portable archives through GitHub Releases, not as committed executables.',
  'Free hosting starts with a Render gameplay service and a static browser client. Inspect shared usage and bandwidth before tests or deployment. Free services sleep, can restart, and have shared allowances. No paid provisioning or overage exposure without a concrete approved proposal. Keep cold-start connection progress understandable. Do not present free hosting as an always-on production guarantee.',
  '## Gates and evidence',
  table(['Gate','Required evidence'],[
    ['Stage 1','Complete definitions; 378 specialization skills, 28 weapons, 24 mutations, 6 arenas, 60 bosses; eight visually reviewed art proof sets; animation previews; measured audio proofs; rendered PDF; verified packet and hashes.'],
    ['First playable','Soldier/Medic, one arena/boss, combat/revive, both votes, shops, offline and public/private networking; 49 active scripted clients plus one rendered client; 4000-hostile-projectile stress case.'],
    ['Performance','99th percentile server tick below 25 ms; documented desktop target 60 FPS, phone target 30 FPS; memory and encoded traffic measured; free-host capacity verified separately.'],
    ['Full implementation','All specified content, routes, difficulties, endless loop, localization and recovery implemented; no roadmap items silently presented as released features.'],
    ['Stage 2.5','126 class/route/difficulty combinations; legal mutation combinations; invalid inputs and purchase races; 8/16/50-player active matches; 60-minute endurance; clearly separated human playtesting.'],
    ['Release','Fresh extraction and normal copy hashes; Windows offline/online/occupied-port startup; public browser and locale layout checks; version identity; Wiki/Project/main ruleset; matching GitHub release and source.'],
    ['Contest','Title, cover, description, playable URL, controls, credits and verification evidence. Actual Handshake entry status recorded separately from artifact/GitHub completion.'],
  ]),
  '## Research and provenance',
  ...research.map(r=>'- '+r.title+': '+r.url+' - '+r.use),
  'The supplied current official rules are an external requirement source. They do not authorize accepting terms or making eligibility declarations. The approved human plan authorizes the game, repository, Wiki, Project and branch protection. Art generation uses the available built-in OpenAI tool; backend names are recorded only if reported. Audio is authored by deterministic local synthesis with no sampled third-party material.',
];
write('docs/GAME_BIBLE.md',parts.join('\n\n')+'\n');
write('docs/wiki/Home.md','# Grave Accord\n\nOriginal cooperative zombie bullet hell. Current state: preproduction; no playable release is claimed.\n\n## Player guide\n\n- [Getting started](Getting-Started)\n- [Modes and endless play](Modes)\n- [Classes and skills](Classes-and-Skills)\n- [Bosses](Bosses)\n- [Sixty-boss gauntlets](Gauntlets)\n- [Economy and mutations](Economy-and-Mutations)\n- [Team leaderboards](Leaderboards)\n- [Audio](Audio)\n- [Accessibility and localization](Accessibility-and-Languages)\n- [Hosting and recovery](Hosting-and-Recovery)\n- [Architecture](Architecture)\n- [Changelog](Changelog)\n- [Credits](Credits)\n\nThe full authored bible is maintained in docs/GAME_BIBLE.md in the source repository.\n');
write('docs/wiki/Gauntlets.md',fs.readFileSync(path.join(root,'docs/BOSS_ROSTER_EXPANSION.md'),'utf8'));
write('docs/wiki/Getting-Started.md','# Getting started\n\nStatus: preproduction. Playable download and hosted URL will be added only after release verification.\n\n'+table(['Flow','Behavior'],uiFlows)+'\n');
write('docs/wiki/Modes.md','# Modes and endless play\n\n'+table(['Mode','Players','Encounters','Minutes'],modes.map(m=>[m.name,'1-'+m.maxPlayers,m.encounters??'No final round',m.targetMinutes?.join('-')??'Until defeat']))+'\n\nEndless Vigil continues indefinitely. Every boss victory is followed by rewards, mutation voting, boss voting and shopping. Player purchases cap at their normal limits; bosses grow per vigil cycle. Bank completed progress on extraction or defeat.\n');
write('docs/wiki/Classes-and-Skills.md','# Classes and skills\n\n'+table(['Class','Survivor','Role'],classes.map(c=>[c.name,c.survivor,c.role]))+'\n\nEvery class has 54 nodes across three parent branches and nine specialization paths. Every parent branch includes all 18 grades. Campaigns reach 27 SP before the final boss; a complete specialization costs 21. Purchased power resets between runs. Mastery and cosmetics persist. All seven classes are available immediately.\n\n'+table(['Class','Branch','Skill','Cost','Grade'],skills.map(s=>[s.classId,s.branchName,s.name,s.cost,s.grade]))+'\n');
write('docs/wiki/Bosses.md','# Bosses\n\nSixty identities are authored: fifty in separate timed-route pools, nine exclusive to Endless and The Uncounted. The original eleven-boss sheet is an early identity proof. See [Gauntlets](Gauntlets) for route ownership and production gates. Gameplay implementation is pending.\n\nContract cards show threat, bounty and recommended build strength, never the next boss identity.\n\n'+table(['Boss','Route','Deadline seconds','Counterplay'],bosses.map(b=>[b.name,b.route,b.timer,b.signature.counterplay]))+'\n');
write('docs/wiki/Economy-and-Mutations.md','# Economy and mutations\n\nPersonal completion rewards prevent kill stealing. Class-compatible shops use server-owned purchase validation. Power resets per run. Every mutation lasts three upcoming encounters; at most three are active.\n\n'+table(['Mutation','Effect'],mutations.map(m=>[m.name,m.description]))+'\n');
write('docs/wiki/Accessibility-and-Languages.md','# Accessibility and languages\n\n'+fs.readFileSync(path.join(root,'docs/LOCALIZATION.md'),'utf8').replace(/^# Localization contract\n/,'')+'\n\nAdditional options: remappable controls, touch/gamepad support, optional aim assistance and auto-fire, reduced effects and motion, text scaling, independent audio volume, and shape-based danger cues.\n');
write('docs/wiki/Architecture.md','# Architecture\n\nTypeScript, Phaser, Vite, Colyseus and Electron. Shared authoritative simulation rules support online and offline play. 30 Hz simulation, initially 20 Hz state patches, independent rendering. Predict movement and reconcile; validate all economy and combat on the server.\n\n'+table(['Interface','Contract'],network)+'\n');
write('docs/wiki/Hosting-and-Recovery.md','# Hosting and recovery\n\nCurrent state: no server has been provisioned. Free hosting is the initial constraint.\n\nUse a static browser client and Render gameplay service. Verify quota and capacity before deployment. Public games appear in discovery; private codes do not. A 60 s reconnect window reserves a seat. Signed intermission checkpoints expire after 24 h and allow compatible restart recovery. LAN hosting starts only when selected. Offline solo must not require internet access.\n\nHosting commands and verified download links are published when those artifacts exist. No paid provisioning is authorized.\n');
write('docs/wiki/Changelog.md',fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8'));
write('docs/wiki/Leaderboards.md',fs.readFileSync(path.join(root,'docs/LEADERBOARDS.md'),'utf8'));
write('docs/wiki/Audio.md',fs.readFileSync(path.join(root,'docs/AUDIO_BIBLE.md'),'utf8'));
write('docs/wiki/Credits.md','# Credits and provenance\n\nGame direction: ProgrammingWithYagle. Code, production tools, documentation and translation drafting: OpenAI coding assistant. Original visual art: built-in OpenAI image generation; backend identifier is unreported unless tool metadata says otherwise. Music and sounds: original deterministic local synthesis. No copied sprites, music or maps from reference games.\n\nMIT source license is preserved. Third-party runtime and font notices will accompany the game build. Native-speaker review and human playtesting are separate, explicitly recorded verification steps.\n');
write('docs/wiki/Contributing.md','# Contributing\n\nWork on feature branches and open a pull request. Keep CHANGELOG.md current for player-visible changes. Maintain catalog keys and placeholder parity for all launch locales. Run npm run verify. Required game checks will be added as runtime code is introduced. Do not commit secrets, node_modules, executables or unverified release claims.\n');
if(!fs.existsSync(path.join(root,'docs/ACCEPTANCE.md')))write('docs/ACCEPTANCE.md','# Acceptance ledger\n\nThe implementation plan is approved. Status entries represent observed completion only.\n\n'+table(['Area','Target','State'],[
  ['Design content','7 classes / 378 skills / 28 weapons / 24 mutations / 6 arenas / 60 bosses','Authored; validation pending'],
  ['Endless','No final round; solo/private/public to 50; ongoing votes/shop','Specified; runtime pending'],
  ['Localization','15 locales, complete text, RTL, fonts, layout checks','Specified; runtime and catalogs pending'],
  ['Art','Eight proof sets and animation inspection','In progress'],
  ['Audio','Two loops and original sound bank with measurements','Pending'],
  ['PDF and packet','Rendered full bible, manifests and fresh extraction','Pending'],
  ['Playable loop','Two-class complete offline/networked loop','Pending'],
  ['50-player gate','Active gameplay, rendered client and measured network/performance','Pending'],
  ['Full game','All content/routes/difficulties/modes','Pending'],
  ['Human tests','Pacing, feel, teamwork and language review','Not performed'],
  ['Delivery','Windows + public URL + GitHub release + Wiki + Project + ruleset','Pending'],
])+'\n');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
json('content/revision.json',{version:rules.contentVersion,sha256:fingerprint,authoredDate:'2026-10-23'});
console.log(JSON.stringify({classes:classes.length,skills:skills.length,weapons:weapons.length,bosses:bosses.length,mutations:mutations.length,arenas:arenas.length,locales:locales.length,revision:fingerprint}));
