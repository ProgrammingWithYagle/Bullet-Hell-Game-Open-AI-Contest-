import {soldierKitMarkup}from'./soldier-controls.ts';
import {
  combatReviveAllowed,
} from '../../shared/recovery-policy.ts';
import {chapterTrainingMarkup} from './chapter.ts';
import {chapterText} from '../chapter-text.ts';
import type {ChapterStage} from '../../shared/story-chapter.ts';
import {
  skillMapLayout,
  prepareSkillMap,
  clampMapZoom,
  fitMapZoom,
  mapZoomScroll,
} from './skill-map.ts';
import {foundationTreeMarkup} from './foundation-tree.ts';
import {specializationMapLayout,specializationRoutes,specializationMapMarkup,prepareSpecializationMap,highlightSpecialization} from './specialization-map.ts';
import {specializationSpRequired} from '../../shared/engineer-pathways.ts';
import { conflictingSkill } from '../../shared/skill-conflicts.ts';
import {allSkills} from '../../shared/mobility.ts';
import { data } from '../../shared/game.ts';
import type { Command } from '../../shared/protocol.ts';
import type { PlayerView } from '../../shared/view.ts';
import { t, number } from '../i18n.ts';
import { effectText, supplyText, skillBehavior, supplyName, upgradeName, upgradeEffects } from '../content-text.ts';
import { escape as e } from './html.ts';
import { icon, effectIcon } from './icons.ts';
import { assets } from '../assets.ts';
import { resourceArt } from './resource-art.ts';
import { expeditionText } from '../expedition-text.ts';
import { locale } from '../i18n.ts';
import { defaultControls, type ControlOptions } from '../input-bindings.ts';
import { engineerKitMarkup, techniqueControlsMarkup, techniqueControlSlots, techniqueSlotLabel } from './engineer-controls.ts';
let engineerControlsOpen = false;
type Kind = Command['kind'];
let mapZoom = 1;
let foundationMode:'map'|'list'='map';
let specializationMode:'map'|'list'='map',specializationZoom=1,specializationZoomChosen=false;
let specializationRoute='all';
let specializationScroll={top:0,left:0};
let shopDifficulty = 'normal';
let shopSpecializationsAllowed = true;
let shopContext = '';
let generalScroll = {top:0,left:0};
const summonGear:Record<string,string>={damage:'clear-beacon','fire-rate':'quick-loop',magazine:'deep-spool',reload:'ready-ties'};
const swordGear: Record<string,string> = {damage:'honed-edge','fire-rate':'balanced-hilt',magazine:'wrapped-grip',reload:'easy-harness'};
function itemArt(kind: Kind,id: string,glyph: string,classId: string) {
  const sword = classId==='swordsman';
  const special = classId==='alchemist'&&kind==='upgrade'&&['damage','fire-rate','magazine','reload'].includes(id)?assets.items['upgrade/alchemist-'+id]:classId==='alchemist'&&kind==='supply'&&id==='ammo-pouch'?assets.items['supply/alchemist-sample-case']:classId==='ranger'&&kind==='upgrade'&&['damage','fire-rate','magazine','reload'].includes(id)?assets.items['upgrade/ranger-'+id]:classId==='ranger'&&kind==='supply'&&id==='ammo-pouch'?assets.items['supply/ranger-arrow-bundle']:sword && kind==='upgrade' && swordGear[id] ? assets.items['upgrade/swordsman-'+swordGear[id]]
    : sword && kind==='supply' && id==='ammo-pouch' ? assets.items['supply/swordsman-canteen'] : classId==='summoner'&&kind==='upgrade'&&summonGear[id]?assets.items['upgrade/summoner-'+summonGear[id]]:classId==='summoner'&&kind==='supply'&&id==='ammo-pouch'?assets.items['supply/summoner-thread-spool']:undefined;
  const url = (kind==='skill'?assets.specializationIcons?.[id]:undefined) ?? special ?? (kind==='upgrade' ? assets.upgrades[id] : assets.items[kind+'/'+(kind==='skill' ? allSkills.find(s=>s.id===id)?.subbranchId : id)]);
  return url ? `<img class="item-art" src="${url}" alt="" aria-hidden="true">` : icon(glyph);
}
let tab: 'gear' | 'tree' | 'general' | 'specializations' = 'general',
  branchId = '',
  chosen: { kind: Kind; id: string } | null = null;
function skillsOf(p: PlayerView) {
  return allSkills.filter((s) => s.classId === p.classId||s.classId==='general');
}
function canBuy(
  p: PlayerView,
  kind: Kind,
  id: string,
): { allowed: boolean; reason: string; price: number } {
  if (kind === 'skill') {
    if(p.training)return {allowed:false,reason:chapterText(locale).training,price:0};
    const node = skillsOf(p).find((s) => s.id === id)!;
    if(!shopSpecializationsAllowed&&data.specializationSkills.some(s=>s.id===id))return {allowed:false,reason:t('ui.pathwayHelp'),price:node.cost};
    const conflict=conflictingSkill(p.skills,id);
    if(conflict)return {allowed:false,reason:t('ui.pathwayConflict',{name:t('skill.'+conflict+'.name')}),price:node.cost};
    if (p.skills.includes(id))
      return { allowed: false, reason: t('ui.owned'), price: node.cost };
    const earned=p.sp+p.skills.reduce((sum,id)=>sum+(allSkills.find(s=>s.id===id)?.cost??0),0),required=specializationSpRequired(id);
    if(earned<required)return {allowed:false,reason:t('ui.pathwayEarned',{count:required,earned}),price:node.cost};
    if (node.prerequisite && !p.skills.includes(node.prerequisite))
      return {
        allowed: false,
        reason: t('ui.prerequisite', {
          name: t('skill.' + node.prerequisite + '.name'),
        }),
        price: node.cost,
      };
    if (
      node.capstone &&
      p.skills.some((id) => allSkills.find((s) => s.id === id)?.capstone)
    )
      return {
        allowed: false,
        reason: t('ui.capstoneLimit'),
        price: node.cost,
      };
    return {
      allowed: p.sp >= node.cost,
      reason:
        p.sp < node.cost
          ? t('ui.skillPoints') +
            ': ' +
            number(p.sp) +
            ' / ' +
            number(node.cost)
          : '',
      price: node.cost,
    };
  }
  if (kind === 'weapon') {
    const w = data.weapons.find((w) => w.id === id)!;
    return {
      allowed: p.weapon !== id && p.coins >= w.price,
      reason:
        p.weapon === id
          ? t('ui.equipped')
          : p.coins < w.price
            ? t('ui.notEnoughCoins')
            : '',
      price: w.price,
    };
  }
  if (kind === 'supply') {
    const item = data.supplies.find((s) => s.id === id)!;
    if (
      item.effect === 'revive' &&
      !combatReviveAllowed(shopDifficulty, p.classId)
    )
      return {
        allowed: false,
        reason: t(
          shopDifficulty === 'hellish'
            ? 'ui.reviveNobody'
            : 'ui.reviveMedicOnly',
        ),
        price: item.price,
      };
    if (
      item.effect === 'shield' &&
      !p.maxShield
    )
      return {
        allowed: false,
        reason: t('ui.shieldsDisabled'),
        price: item.price,
      };
    const slot =
      p.supplies.find((s) => s.id === id) ?? p.supplies.find((s) => !s.count);
    const full = !slot || slot.count >= item.maximumStack;
    return {
      allowed: !full && p.coins >= item.price,
      reason: full
        ? t('ui.inventoryFull')
        : p.coins < item.price
          ? t('ui.notEnoughCoins')
          : '',
      price: item.price,
    };
  }
  const u = data.upgrades.find((u) => u.id === id)!,
    level = p.upgrades[id] ?? 0,
    price = u.basePrice + level * u.priceStep;
  return {
    allowed: level < u.maximum && p.coins >= price,
    reason:
      level >= u.maximum
        ? t('ui.maximum')
        : p.coins < price
          ? t('ui.notEnoughCoins')
          : '',
    price,
  };
}
function nodeButton(
  p: PlayerView,
  kind: Kind,
  id: string,
  glyph: string,
  name: string,
  grade = '',
) {
  const state = canBuy(p, kind, id),
    owned =
      kind === 'skill'
        ? p.skills.includes(id)
        : kind === 'weapon'
          ? p.weapon === id
          : false;
  const cost = owned
    ? t(kind === 'weapon' ? 'ui.equipped' : 'ui.owned')
    : number(state.price) +
      ' ' +
      t(kind === 'skill' ? 'ui.skillPoints' : 'ui.coins');
  const label = name + (grade ? ' · ' + grade : '') + ' · ' + cost;
  const caption =
    kind === 'skill'
      ? ''
      : `<span class="gear-name">${e(name)}</span><span class="gear-cost">${e(cost)}</span>`;
  return `<button type="button" class="item-node ${kind === 'skill' ? 'skill-node' : ''} ${owned ? 'owned' : ''} ${state.allowed ? 'available' : 'unavailable'} ${chosen?.kind === kind && chosen.id === id ? 'inspected' : ''}" data-inspect="${id}" data-item-kind="${kind}" aria-label="${e(label)}" aria-pressed="${chosen?.kind === kind && chosen.id === id}" title="${e(label + (state.reason && !owned ? ' · ' + state.reason : ''))}">${itemArt(kind, id, glyph, p.classId)}${caption}${grade ? `<span class="node-grade" aria-hidden="true">${e(grade)}</span>` : ''}${owned ? `<span class="node-status">${icon('check')}</span>` : ''}</button>`;
}
export function shopMarkup(
  p: PlayerView,
  supplyBindings: readonly string[] = ['1', '2', '3'],
  expanded = false,
  difficulty = 'normal',
  chapterStage?:ChapterStage,
  allowSpecializations = true,
  controls: ControlOptions = defaultControls(),
) {
  shopDifficulty = difficulty;
  shopSpecializationsAllowed = allowSpecializations;
  const cl = data.classes.find((c) => c.id === p.classId)!;
  const hasSpecializations = !p.training && allowSpecializations && !!specializationMapLayout(p.classId,specializationRoute);
  const context = [p.classId,!!p.training,allowSpecializations,expanded].join(':');
  if(shopContext!==context){shopContext=context;tab=p.training?'tree':'general';chosen=null;engineerControlsOpen=false;specializationRoute='all';generalScroll={top:0,left:0};specializationScroll={top:0,left:0};branchId=expanded?'all':cl.branches[0].id;}
  if(tab==='specializations'&&!hasSpecializations)tab=p.training?'tree':'general';
  if(tab==='tree'&&!p.training)tab='general';
  if(p.training&&chosen?.kind==='skill')chosen=null;
  if (branchId!=='general'&&!(expanded&&branchId==='all')&&!cl.branches.some((b) => b.id === branchId)) branchId = cl.branches[0].id;
  if (
    (chosen?.kind === 'skill' &&
      !skillsOf(p).some((s) => s.id === chosen?.id)) ||
    (chosen?.kind === 'weapon' &&
      !data.weapons.some((w) => w.id === chosen?.id && w.classId === p.classId))
  )
    chosen = null;
  return `<p data-shop-status class="shop-purchase-status" role="status" aria-live="polite" hidden></p><p class="shop-introduction">${e(p.training?chapterText(locale).readyHelp:expeditionText(locale, 'shopHelp'))}</p><div class="loadout-summary"><span>${resourceArt('coins', assets.resourceIcons)}<b>${number(p.coins)}</b> ${e(t('ui.coins'))}</span>${p.training?'':`<span>${resourceArt('skills', assets.resourceIcons)}<b>${number(p.sp)}</b> ${e(t('ui.skillPoints'))}</span><small>${e(t('ui.capstoneLimit'))}</small>`}</div><div class="loadout-tabs" role="tablist" aria-label="${e(t('ui.shop'))}"><button data-shop-tab="gear" role="tab" aria-selected="${tab === 'gear'}">${resourceArt('equipment', assets.resourceIcons)}${e(t('ui.equip'))} / ${e(t('ui.upgrade'))}</button>${p.training?`<button data-shop-tab="tree" role="tab" aria-selected="${tab === 'tree'}">${resourceArt('skills', assets.resourceIcons)}${e(chapterText(locale).training)}</button>`:''}<button data-shop-tab="general" role="tab" aria-selected="${tab === 'general'}">${resourceArt('skills', assets.resourceIcons)}${e(t('branch.general'))}</button>${hasSpecializations?`<button data-shop-tab="specializations" role="tab" aria-selected="${tab === 'specializations'}">${icon('engineer')}${e(t('ui.specializations'))}</button>`:''}</div><div class="loadout-workspace"><div class="loadout-board">${
    tab === 'specializations' ? specializationMarkup(p,allowSpecializations,controls) : tab === 'general'&&p.training ? `<p lang="en">${e(chapterText(locale).general)}</p>` : tab === 'tree'&&p.training?chapterTrainingMarkup(p,chapterStage):tab === 'gear'
      ? `<section class="armory"><h3>${e(t('ui.equip'))}</h3><div class="gear-icons">${data.weapons
          .filter((w) => w.classId === p.classId)
          .map((w) =>
            nodeButton(
              p,
              'weapon',
              w.id,
              w.tier === 0
                ? 'weapon'
                : w.tier === 1
                  ? 'rate'
                  : w.tier === 2
                    ? 'extra'
                    : 'pierce',
              t('weapon.' + w.id + '.name'),
            ),
          )
          .join(
            '',
          )}</div><h3>${e(t('ui.upgrade'))}</h3><div class="gear-icons">${data.upgrades.map((u) => nodeButton(p, 'upgrade', u.id, effectIcon({ [u.effect]: u.amount }), upgradeName(u.id,p.classId))).join('')}</div><h3>${e(t('ui.supplies'))} · ${e(supplyBindings.join(' / '))}</h3><p>${e(t('ui.supplyHelp', { bindings: supplyBindings.join(' / ') }))}</p><div class="gear-icons">${data.supplies.map((s) => nodeButton(p, 'supply', s.id, supplyGlyph(s.effect), supplyName(s.id,p.classId))).join('')}</div><p>${p.supplies.map((s, i) => `${e(supplyBindings[i])}: ${s.count ? e(supplyName(s.id,p.classId)) + ' ×' + number(s.count) : '—'}`).join(' · ')}</p></section>`
      : generalTreeMarkup(p,expanded)}</div><aside id="item-details" class="item-details" aria-live="polite">${details(p,controls)}</aside></div>`;
}

function techniqueRole(id:string){const s=data.specializationSkills.find(s=>s.id===id);return s&&'role' in s?String(s.role):'entry';}
function techniqueRoleName(id:string){return t('ui.pathway'+({active:'NewAction',evolution:'Evolution',control:'Control',capstone:'Capstone',entry:'Entry'} as Record<string,string>)[techniqueRole(id)]);}
export function specializationMarkup(p:PlayerView,allowed=true,controls:ControlOptions=defaultControls()){
  const map=allowed&&!p.training?specializationMapLayout(p.classId,specializationRoute):null;if(!map)return '';
  const render=(id:string,reference:boolean)=>{
    const skill=allSkills.find(s=>s.id===id)!;
    if(reference)return '<button type="button" class="pathway-foundation" data-prerequisite="'+e(id)+'" data-graph-focus="'+e(id)+'" lang="'+e(locale)+'" dir="auto"><small>'+e(t('branch.general'))+'</small><strong>'+e(t('skill.'+id+'.name'))+'</strong><span>'+e(p.skills.includes(id)?t('ui.owned'):number(skill.cost)+' '+t('ui.skillPoints'))+'</span></button>';
    const state=canBuy(p,'skill',id),owned=p.skills.includes(id),role=techniqueRole(id),slots=techniqueControlSlots(id);
    const button=nodeButton(p,'skill',id,id==='engineer-machinery-1'?'engineer':'ability',t('skill.'+id+'.name'),skill.grade).replace('data-inspect=','data-graph-focus="'+e(id)+'" aria-describedby="pathway-summary-'+e(id)+'" data-inspect=');
    return '<article class="pathway-technique role-'+e(role)+'"><span class="technique-role">'+e(techniqueRoleName(id))+'</span>'+button+'<strong>'+e(t('skill.'+id+'.name'))+'</strong><p class="pathway-state">'+e(owned?t('ui.owned'):number(skill.cost)+' '+t('ui.skillPoints'))+' <span class="pathway-slot">'+e(slots.map(techniqueSlotLabel).join(' / '))+'</span></p><p class="pathway-summary" id="pathway-summary-'+e(id)+'">'+e(t('pathway.'+id+'.summary'))+' '+e(!owned&&!state.allowed?state.reason:'')+'</p><p class="pathway-parent">'+e(t('ui.prerequisite',{name:t('skill.'+skill.prerequisite+'.name')}))+'</p></article>';
  };
  const art=assets.specializationIcons?.[p.classId==='soldier'?'soldier-skirmisher-1':'engineer-machinery-1'];
  const routes=specializationRoutes(p.classId).length>1?'<nav class="pathway-route-picker" aria-label="'+e(t('ui.pathwayRoutes'))+'">'+[{id:'all',nameKey:'ui.pathwayOverview'},...specializationRoutes(p.classId)].map(route=>'<button type="button" data-specialization-route="'+e(route.id)+'" aria-pressed="'+(route.id===specializationRoute)+'">'+e(t(route.nameKey))+'</button>').join('')+'<p>'+e(t('ui.pathwayRouteHelp'))+'</p></nav>':'';
  return '<section class="pathway-choices" lang="en" dir="ltr" aria-label="'+e(t('ui.pathways'))+'"><header class="pathway-manual-heading"><div class="manual-emblem" aria-hidden="true">'+(art?'<img src="'+e(art)+'" alt="">':icon('engineer'))+'</div><div><p class="eyebrow">'+e(t('ui.pathways'))+'</p><h3>'+e(t(p.classId==='soldier'?'ui.soldier.fieldManual':'ui.pathwayFieldManual'))+'</h3><p>'+e(t(p.classId==='soldier'?'ui.soldier.manualHelp':'ui.pathwayManualHelp'))+'</p></div></header>'+(p.classId==='soldier'?soldierKitMarkup(p,controls,engineerControlsOpen):engineerKitMarkup(p,controls,engineerControlsOpen))+routes+'<div class="pathway-toolbar"><small>'+e(t('ui.pathwayControls'))+'</small><button type="button" data-specialization-mode="map" aria-pressed="'+(specializationMode==='map')+'">'+e(t('ui.pathwayMap'))+'</button><button type="button" data-specialization-mode="list" aria-pressed="'+(specializationMode==='list')+'">'+e(t('ui.pathwayList'))+'</button><button type="button" data-specialization-zoom="fit" lang="en" dir="ltr" '+(specializationMode==='list'?'disabled':'')+'>'+e(t('ui.treeFit'))+'</button><button type="button" data-specialization-zoom="out" aria-label="'+e(t('ui.zoomOut'))+'" '+(specializationZoom<=.2||specializationMode==='list'?'disabled':'')+'>−</button><button type="button" data-specialization-zoom="reset" aria-label="'+e(t('ui.resetZoom'))+'" '+(specializationMode==='list'?'disabled':'')+'>'+number(Math.round(specializationZoom*100))+'%</button><button type="button" data-specialization-zoom="in" aria-label="'+e(t('ui.zoomIn'))+'" '+(specializationZoom>=2||specializationMode==='list'?'disabled':'')+'>+</button></div>'+specializationMapMarkup(map,p.skills,render,{mode:specializationMode,zoom:specializationZoom,selected:chosen?.id})+'<div class="pathway-legend" aria-hidden="true"><span><i class="active-key"></i>'+e(t('ui.pathwayNewAction'))+'</span><span><i class="evolution-key"></i>'+e(t('ui.pathwayEvolution'))+'</span><span><i class="exclusive-key"></i>'+e(t('ui.pathwayExclusive'))+'</span></div></section>';
}
function foundationGlyph(id:string,fallback:string){return id==='general-brake-step'?'brake':id==='general-course-correction'?'course':fallback;}
function generalTreeMarkup(p:PlayerView,expanded:boolean){
 return foundationTreeMarkup({classId:p.classId,skills:p.skills,branch:branchId,expanded,mode:foundationMode,zoom:mapZoom,label:t,symbol:icon(p.classId),behavior:skillBehavior,render:id=>{const s=allSkills.find(s=>s.id===id)!;return nodeButton(p,'skill',id,foundationGlyph(id,s.classId==='general'?'speed':effectIcon(s.effects)),t('skill.'+id+'.name'),s.grade);}});
}
function details(p: PlayerView,controls:ControlOptions) {
  if (!chosen)
    return `<div class="inspect-empty">${resourceArt(tab === 'gear' ? 'equipment' : 'skills', assets.resourceIcons)}<p>${e(t('ui.selectItem'))}</p></div>`;
  const { kind, id } = chosen,
    state = canBuy(p, kind, id);
  let name = '',
    body = '',
    glyph = 'weapon',
    grade = '';
  if (kind === 'skill') {
    const node = skillsOf(p).find((s) => s.id === id)!;
    name = t('skill.' + id + '.name');
    glyph = foundationGlyph(id,effectIcon(node.effects));
    grade = node.classId==='general'?'':node.grade;
    body = `<p class="eyebrow">${e(t('branch.' + node.branchId))} · ${e(t(node.subbranchNameKey))}</p><p class="effect-list">${e(effectText(node.effects))}</p>${skillBehavior(node.id) ? `<p class="skill-behavior" ${data.specializationSkills.some(s=>s.id===id)?'lang="en" dir="ltr"':''}>${e(skillBehavior(node.id))}</p>` : ''}<p class="muted">${e(t('ui.ratingExplanation'))}</p>${node.prerequisite ? `<button class="prerequisite-link" data-prerequisite="${node.prerequisite}">${e(t('ui.prerequisite', { name: t('skill.' + node.prerequisite + '.name') }))}</button>` : ''}${node.capstone ? `<p class="capstone-note">${icon('ultimate')}${e(t('ui.capstone'))} · ${e(t('ui.capstoneLimit'))}</p>` : ''}`;
    if(data.specializationSkills.some(s=>s.id===id))body='<div class="pathway-detail" lang="en" dir="ltr"><p class="technique-role">'+e(techniqueRoleName(id))+'</p>'+techniqueControlsMarkup(id,controls)+'<p class="skill-behavior">'+e(skillBehavior(id))+'</p>'+('<p>'+e(t('ui.pathwayLate'))+'</p>')+(specializationSpRequired(id)?'<p>'+e(t('ui.pathwayEarned',{count:specializationSpRequired(id),earned:p.sp+p.skills.reduce((n,id)=>n+(allSkills.find(s=>s.id===id)?.cost??0),0)}))+'</p>':'')+(node.prerequisite?'<button class="prerequisite-link" data-prerequisite="'+e(node.prerequisite)+'">'+e(t('ui.prerequisite',{name:t('skill.'+node.prerequisite+'.name')}))+'</button>':'')+(node.capstone?'<p class="capstone-note">'+e(t('ui.capstoneLimit'))+'</p>':'')+'</div>';
    if(node.classId==='general')body=`<p>${e(t('ui.foundationSharedHelp'))}</p><p class="skill-behavior" ${['general-brake-step','general-course-correction'].includes(id)?'lang="en" dir="ltr"':''}>${e(skillBehavior(node.id))}</p>${node.prerequisite?`<button type="button" class="prerequisite-link" data-prerequisite="${e(node.prerequisite)}">${e(t('ui.prerequisite',{name:t('skill.'+node.prerequisite+'.name')}))}</button>`:''}`;
  } else if (kind === 'weapon') {
    const w = data.weapons.find((w) => w.id === id)!;
    name = t('weapon.' + id + '.name');
    body = `<dl class="item-stats">${[
      ['stat.damage', w.damage],
      ['stat.fireRate', w.fireRate],
      [p.classId==='swordsman'?'ui.swordBreath':p.classId==='summoner'?'ui.summonerFocus':p.classId==='ranger'?'ui.rangerQuiver':p.classId==='alchemist'?'ui.alchemySamples':'stat.magazine', w.magazine],
      [p.classId==='swordsman'?'ui.swordRecovery':p.classId==='summoner'?'ui.summonerRebind':p.classId==='ranger'?'ui.rangerReplenish':p.classId==='alchemist'?'ui.alchemyRefill':'stat.reloadTime', w.reloadTime],
      ...(p.classId==='swordsman'&&'meleeReach'in w?([['stat.bladeReach',w.meleeReach],['stat.bladeArc',w.meleeArcDegrees]] as const):p.classId==='ranger'?[['stat.range',Math.round(w.projectileSpeed*w.rangeSeconds)]]:[['stat.extraShots', w.pellets]]),
      [p.classId==='swordsman'?'stat.swordCleave':'stat.pierce', w.pierce],
    ]
      .map(
        ([key, value]) =>
          `<div><dt>${e(t(String(key)))}</dt><dd>${number(Number(value), 2)}</dd></div>`,
      )
      .join('')}</dl>${p.classId==='swordsman'||p.classId==='summoner'||p.classId==='ranger'||p.classId==='alchemist'?`<p>${e(t('weapon.'+id+'.description'))}</p>`:''}`;
  } else if (kind === 'supply') {
    const item = data.supplies.find((s) => s.id === id)!;
    name = supplyName(id,p.classId);
    glyph = supplyGlyph(item.effect);
    body = `<p>${e(supplyText(id, shopDifficulty, p.classId))}</p><p>${e(t('ui.cooldown', { seconds: t('template.seconds', { value: number(item.cooldown) }) }))}</p><p>${number(p.supplies.find((s) => s.id === id)?.count ?? 0)} / ${number(item.maximumStack)}</p>`;
  } else {
    const u = data.upgrades.find((u) => u.id === id)!;
    name = upgradeName(id,p.classId);
    glyph = effectIcon({ [u.effect]: u.amount });
    body = `<p class="effect-list">${e(effectText(upgradeEffects(id,p.classId)))}</p><p>${e(t('ui.upgrade'))} ${number(p.upgrades[id] ?? 0)} / ${number(u.maximum)}</p>`;
  }
  return `<div class="detail-symbol">${itemArt(kind, id, glyph, p.classId)}${grade ? `<b>${e(grade)}</b>` : ''}</div><h3${['general-brake-step','general-course-correction'].includes(id)?' lang="en" dir="ltr"':''}>${e(name)}</h3>${body}<div class="detail-purchase"><p class="price">${number(state.price)} ${e(t(kind === 'skill' ? 'ui.skillPoints' : 'ui.coins'))}</p><button id="buy-selected" class="primary" ${state.allowed ? '' : 'disabled'}>${e(t('ui.buy'))}</button>${state.reason ? `<p class="purchase-reason">${e(state.reason)}</p>` : ''}</div>`;
}
export const supplyGlyph = (effect: string) =>
  ({
    heal: 'health',
    moveSpeed: 'move',
    shield: 'armor',
    cleanse: 'heal',
    revive: 'rescue',
    barrier: 'tank',
    reload: 'reload',
    abilityCooldown: 'ability',
  })[effect] ?? 'ability';
export function bindShop(
  host: HTMLElement,
  p: PlayerView,
  purchase: (request: Omit<Command, 'id'>) => void,
  supplyBindings: readonly string[] = ['1', '2', '3'],
  expanded = false,
  difficulty = 'normal',
  chapterStage?:ChapterStage,
  allowSpecializations = true,
  controls: ControlOptions = defaultControls(),
) {
  shopDifficulty = difficulty;
  shopSpecializationsAllowed = allowSpecializations;
  const workspace = host.querySelector<HTMLElement>('.loadout-editor');
  let disposed = false,
    message = '';
  const active = (element: HTMLElement = workspace!) => {
    if (
      disposed ||
      !workspace?.isConnected ||
      !element.isConnected ||
      !workspace.contains(element)
    )
      return false;
    for (
      let node: HTMLElement | null = workspace;
      node;
      node = node.parentElement
    )
      if (node.hidden || node.inert) return false;
    return true;
  };
  const status = (value: string) => {
    message = value;
    const target = workspace?.querySelector<HTMLElement>('[data-shop-status]');
    if (target && active()) {
      target.textContent = value;
      target.hidden = !value;
    }
  };
  const redraw = (focus: string) => {
    if (!active()) return;
    const oldKit=workspace!.querySelector<HTMLDetailsElement>('[data-class-kit]');if(oldKit)engineerControlsOpen=oldKit.open;
    const oldSpecial=workspace!.querySelector<HTMLElement>('.specialization-viewport');if(oldSpecial)specializationScroll={top:oldSpecial.scrollTop,left:oldSpecial.scrollLeft};
    const oldScroll = workspace!.querySelector<HTMLElement>('.skill-scroll');
    if(oldScroll)generalScroll={top:oldScroll.scrollTop,left:oldScroll.scrollLeft};
    workspace!.innerHTML = shopMarkup(p, supplyBindings, expanded, difficulty,chapterStage,allowSpecializations,controls);
    bindActions();
    const scroller = workspace!.querySelector<HTMLElement>('.skill-scroll');
    if (scroller) {
      scroller.scrollTop = generalScroll.top;
      scroller.scrollLeft = generalScroll.left;
    }
    const special=workspace!.querySelector<HTMLElement>('.specialization-viewport');if(special){special.scrollTop=specializationScroll.top;special.scrollLeft=specializationScroll.left;}
    const focused=workspace!.querySelector<HTMLElement>(focus);
    focused?.focus({preventScroll:true});
    if(focus.startsWith('[data-inspect='))focused?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});
    status(message);
  };
  const bindDetails = () => {
    const kit=workspace!.querySelector<HTMLDetailsElement>('[data-class-kit]');if(kit)kit.ontoggle=()=>{if(active(kit))engineerControlsOpen=kit.open;};
    const buy = workspace!.querySelector<HTMLButtonElement>('#buy-selected');
    if (buy)
      buy.onclick = () => {
        if (
          active(buy) &&
          !buy.disabled &&
          chosen &&
          canBuy(p, chosen.kind, chosen.id).allowed
        )
          purchase({ kind: chosen.kind, item: chosen.id });
      };
    workspace!.querySelectorAll<HTMLButtonElement>('[data-prerequisite]').forEach(prerequisite=>{
      prerequisite.onclick = () => {
        if (!active(prerequisite)||p.training) return;
        const id=prerequisite.dataset.prerequisite!,skill=skillsOf(p).find(s=>s.id===id);if(!skill)return;
        status('');
        chosen = { kind: 'skill', id };
        tab=data.specializationSkills.some(s=>s.id===id)?'specializations':'general';
        if(tab==='specializations'&&specializationRoute!=='all')specializationRoute=skill.subbranchId;
        branchId=skill.classId==='general'?'general':skill.branchId;
        redraw('[data-inspect="' + CSS.escape(id) + '"]');
      };
    });
  };
  function bindActions() {
    workspace!.querySelectorAll<HTMLButtonElement>('[data-training]').forEach(button=>{
      button.onclick=()=>{if(active(button)&&!button.disabled&&p.training)purchase({kind:button.dataset.training as 'study'|'prepare',item:button.dataset.technique!});};
    });
    workspace!
      .querySelectorAll<HTMLButtonElement>('[data-inspect]')
      .forEach((button) => {
        button.onclick = () => {
          if (!active(button)) return;
          status('');
          chosen = {
            kind: button.dataset.itemKind as Kind,
            id: button.dataset.inspect!,
          };
          workspace!.querySelectorAll('[data-inspect]').forEach((node) => {
            const active = (node as HTMLElement).dataset.inspect === chosen!.id;
            node.classList.toggle('inspected', active);
            node.setAttribute('aria-pressed', String(active));
          });
          workspace!.querySelector('#item-details')!.innerHTML = details(p,controls);
          bindDetails();
          if(tab==='specializations'){const map=specializationMapLayout(p.classId,specializationRoute);if(map)highlightSpecialization(workspace!,map,chosen.id);}
        };
      });
    workspace!.querySelectorAll<HTMLButtonElement>('[data-shop-tab]').forEach(
      (button) =>
        (button.onclick = () => {
          if (!active(button)) return;
          status('');
          tab = button.dataset.shopTab as typeof tab;
          chosen=null;
          redraw('[data-shop-tab="' + tab + '"]');
        }),
    );
    workspace!.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(
      (button) =>
        (button.onclick = () => {
          if (!active(button)) return;
          status('');
          branchId = button.dataset.branch!;
          chosen = null;
          redraw('[data-branch="' + CSS.escape(branchId) + '"]');
        }),
    );
    workspace!.querySelectorAll<HTMLButtonElement>('[data-specialization-route]').forEach(button=>button.onclick=()=>{
      if(!active(button))return;const route=button.dataset.specializationRoute!;
      if(route!=='all'&&!specializationRoutes(p.classId).some(r=>r.id===route))return;
      specializationRoute=route;chosen=null;specializationZoomChosen=false;specializationScroll={left:0,top:0};
      redraw('[data-specialization-route="'+route+'"]');
    });
    workspace!.querySelectorAll<HTMLButtonElement>('[data-specialization-mode]').forEach(button=>button.onclick=()=>{if(!active(button))return;specializationMode=button.dataset.specializationMode as 'map'|'list';redraw('[data-specialization-mode="'+specializationMode+'"]');});
    workspace!.querySelectorAll<HTMLButtonElement>('[data-specialization-zoom]').forEach(button=>button.onclick=()=>{
      if(!active(button)||button.disabled)return;
      const action=button.dataset.specializationZoom,viewport=workspace!.querySelector<HTMLElement>('.specialization-viewport'),map=specializationMapLayout(p.classId,specializationRoute);if(!viewport||!map)return;
      specializationZoomChosen=true;
      const before=specializationZoom,left=viewport.scrollLeft,top=viewport.scrollTop,width=viewport.clientWidth,height=viewport.clientHeight;
      specializationZoom=action==='fit'?fitMapZoom(width,height,map.width,map.height,.2):action==='reset'?1:clampMapZoom(specializationZoom+(action==='in'?.1:-.1),.2);
      redraw('[data-specialization-zoom="'+action+'"]');
      const next=workspace!.querySelector<HTMLElement>('.specialization-viewport');if(next){next.scrollLeft=mapZoomScroll(left,width,before,specializationZoom,.2);next.scrollTop=mapZoomScroll(top,height,before,specializationZoom,.2);specializationScroll={left:next.scrollLeft,top:next.scrollTop};}
    });
    if(tab==='specializations'){
      const map=specializationMapLayout(p.classId,specializationRoute),viewport=workspace!.querySelector<HTMLElement>('.specialization-viewport');
      if(map&&viewport&&specializationMode==='map'&&!specializationZoomChosen&&viewport.clientWidth>0&&viewport.clientHeight>0){
        specializationZoomChosen=true;
        specializationZoom=fitMapZoom(viewport.clientWidth,viewport.clientHeight,map.width,map.height,.2);
        redraw('[data-shop-tab="specializations"]');return;
      }
      if(map)prepareSpecializationMap(workspace!,map);
    }
    workspace!.querySelectorAll<HTMLButtonElement>('[data-foundation-mode]').forEach(button=>button.onclick=()=>{if(!active(button))return;foundationMode=button.dataset.foundationMode as 'map'|'list';redraw('[data-foundation-mode="'+foundationMode+'"]');});
    if (tab==='general'&&!p.training&&branchId!=='general') {
      const layout = skillMapLayout(p.classId,branchId==='all'?undefined:branchId);
      prepareSkillMap(workspace!, layout);
      const viewport = workspace!.querySelector<HTMLElement>(
        '.skill-map-viewport',
      );
      if (viewport && !chosen)
        viewport.scrollLeft = Math.max(
          0,
          (layout.width * mapZoom - viewport.clientWidth) / 2,
        );
      workspace!.querySelectorAll<HTMLButtonElement>('[data-map-zoom]').forEach(
        (button) =>
          (button.onclick = () => {
            if (!active(button)) return;
            const viewport = workspace!.querySelector<HTMLElement>(
                '.skill-map-viewport',
              ),
              sheet = workspace!.querySelector<HTMLElement>('.skill-map-sheet'),
              canvas =
                workspace!.querySelector<HTMLElement>('.skill-map-canvas');
            if (!viewport || !sheet || !canvas) return;
            const before = mapZoom;
            mapZoom =
              button.dataset.mapZoom === 'fit'
                ? fitMapZoom(viewport.clientWidth,viewport.clientHeight,layout.width,layout.height)
                : button.dataset.mapZoom === 'reset'
                ? 1
                : clampMapZoom(
                    mapZoom + (button.dataset.mapZoom === 'in' ? 0.1 : -0.1),
                  );
            const left = mapZoomScroll(
                viewport.scrollLeft,
                viewport.clientWidth,
                before,
                mapZoom,
              ),
              top = mapZoomScroll(
                viewport.scrollTop,
                viewport.clientHeight,
                before,
                mapZoom,
              );
            sheet.style.width = layout.width * mapZoom + 'px';
            sheet.style.height = layout.height * mapZoom + 'px';
            canvas.style.transform = `scale(${mapZoom})`;
            viewport.scrollLeft = left;
            viewport.scrollTop = top;
            const reset = workspace!.querySelector<HTMLElement>(
              '[data-map-zoom="reset"]',
            );
            if (reset)
              reset.textContent = number(Math.round(mapZoom * 100)) + '%';
            workspace!
              .querySelectorAll<HTMLButtonElement>('[data-map-zoom]')
              .forEach(
                (b) =>
                  (b.disabled =
                    b.dataset.mapZoom === 'out'
                      ? mapZoom <= 0.35
                      : b.dataset.mapZoom === 'in'
                        ? mapZoom >= 2
                        : false),
              );
          }),
      );
    }
    for (const selector of ['[data-shop-tab]', '[data-branch]']) {
      const tabs = [
        ...workspace!.querySelectorAll<HTMLButtonElement>(selector),
      ];
      for (const button of tabs) {
        button.tabIndex =
          button.getAttribute('aria-selected') === 'true' ? 0 : -1;
        button.onkeydown = (event) => {
          if (
            !active(button) ||
            event.isComposing ||
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
          )
            return;
          event.preventDefault();
          const rtl = document.documentElement.getAttribute('dir') === 'rtl',
            index = tabs.indexOf(button);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : (index +
                    (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1) +
                    tabs.length) %
                  tabs.length;
          tabs[next].click();
        };
      }
    }
    bindDetails();
  }
  if (workspace) bindActions();
  return {
    dispose() {
      const kit=workspace?.querySelector<HTMLDetailsElement>('[data-class-kit]');if(kit)engineerControlsOpen=kit.open;
      disposed = true;
    },
    reportPurchase(result: { ok: boolean; reason?: string }) {
      if (!active()) return;
      const key =
        result.reason === 'matchPaused'
          ? 'ui.matchPaused'
          : result.reason === 'checkpointPending'
            ? 'ui.checkpointSaving'
            : result.reason === 'insufficientCoins'
              ? 'ui.notEnoughCoins'
              : result.reason === 'inventoryFull'
                ? 'ui.inventoryFull'
                : 'ui.errorPurchase';
      status(result.ok ? '' : t(key));
    },
  };
}
