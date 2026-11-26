import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { rangerSightIds, rangerSightRules, type RangerSightCue, type RangerSightFitting } from '../src/shared/ranger-sight.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(fitting?: RangerSightFitting, transform?: 'crosswind') {
  const game = new Game({ mode:transform ? 'endless' : fitting ? 'raid' : 'short', difficulty:'normal', seed:41,
    openingArenaId:'gatehouse', arenaSelection:'fixed', maxPlayers:2 });
  if (transform) game.encounter = 9;
  const ranger = game.addPlayer('nela','Nela','ranger');
  const other = game.addPlayer('peer','Rue','ranger');
  function buy(item: string) {
    return game.transact(ranger.id, { id:item, kind:'skill', item });
  }
  assert(buy('ranger-bowcraft-1').ok && buy(rangerSightIds.entry).ok);
  if (fitting) {
    assert(buy(rangerSightIds[fitting]).ok);
    assert.equal(buy(rangerSightIds[fitting === 'roll' ? 'bearing' : 'roll']).reason, 'incompatibleItem');
  } else if (!transform) {
    assert.equal(ranger.totalSp, 3);
    assert(!buy(rangerSightIds.roll).ok && !buy(rangerSightIds.bearing).ok);
  }
  if (transform) {
    const path: string[] = [];
    for (let item = data.skills.find(skill => skill.classId === 'ranger' && skill.transform === transform); item;
      item = data.skills.find(skill => skill.id === item!.prerequisite)) path.unshift(item.id);
    for (const item of path) if (!ranger.skills.includes(item)) assert(buy(item).ok, item);
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game,'arena',{ get:() => arena });
  Object.assign(game.boss,{ x:1350,y:766,health:100000,maxHealth:100000,staggerUntil:9999,deadline:12000 });
  Object.assign(ranger,{ x:490,y:500,oldX:490,oldY:500 });
  Object.assign(other,{ x:410,y:750,oldX:410,oldY:750 });
  function step(input: Partial<InputFrame> = {}) {
    assert(game.submitInput(ranger.id,{ ...idleInput(), sequence:ranger.ack+1, clientTick:game.combatTick, aim:0, ...input }));
    game.step();
    return game.drainEvents();
  }
  const kit = () => game.kitStatus(ranger.id);
  const cue = () => game.classCues().find((c): c is RangerSightCue => c.kind === 'ranger-sight' && c.owner === ranger.id);
  const wait = (condition: () => boolean, input: Partial<InputFrame> = {}, max = 130) => {
    for (let i=0;i<max && !condition();i++) step(input);
    assert(condition());
  };
  return { game,ranger,other,arena,kit,cue,step,wait };
}

test('Sight Draw buys at three earned points and reserves a real arrow before either aim or release', () => {
  const f = fixture();
  const { ranger,game } = f, ammo = ranger.ammo, speed = game.movementSpeed(ranger);
  const target = game.minions.spawn(978231,{ kind:'ordinary',x:680,y:500,health:700,speed:0,radius:16,damage:1 },game.combatTick)!;
  assert(target);
  f.step({ technique1:true,fire:true });
  assert.equal(ranger.ammo,ammo-1);
  assert.equal(f.kit().rangerSight?.stage,'drawing');
  assert.equal(game.shots.size,0);
  const held = f.cue()!;
  assert.equal(held.until-held.at,rangerSightRules.duration);
  assert.equal(held.readyAt-held.at,rangerSightRules.readyTicks);
  assert.equal(game.movementSpeed(ranger),speed*rangerSightRules.movement);
  assert.deepEqual(viewOf(game,ranger.id).classCues,viewOf(game,f.other.id).classCues);
  assert(viewOf(game,ranger.id).players.find(p=>p.id===ranger.id)?.kit.rangerSight);
  assert.equal(viewOf(game,f.other.id).players.find(p=>p.id===ranger.id)?.kit.rangerSight,undefined);
  f.step({ technique1:true,q:true,fire:true });
  assert.equal(ranger.ammo,ammo-1);
  assert.equal(game.shots.size,0);
  f.wait(() => f.kit().rangerSight?.stage==='release');
  f.step({ technique1:true,aim:1 });
  assert.equal(f.kit().rangerSight?.stage,'outside');
  assert.equal(game.shots.size,0);
  f.step({ technique1:true,aim:0,fire:true });
  assert.equal(ranger.ammo,ammo-1);
  assert.equal(game.movementSpeed(ranger),speed);
  const arrow = [...game.shots.values()].find(shot=>shot.owner===ranger.id);
  assert(arrow && arrow.vy===0 && arrow.pierce===0);
  f.wait(() => target.health < 700);
  assert(Math.abs(ranger.damageDealt-700+target.health)<1e-6);
  assert.equal(f.kit().rangerSight?.stage,'recovery');
});

test('masonry stops a Sight Draw arrow before it reaches the enemy', () => {
  const f = fixture();
  const target = f.game.minions.spawn(978232,{ kind:'ordinary',x:682,y:500,health:700,speed:0,radius:16,damage:1 },f.game.combatTick)!;
  f.arena.obstacles = [{ x:562,y:435,width:24,height:130 }];
  f.step({ technique1:true });
  f.wait(() => f.kit().rangerSight?.stage==='release');
  f.step({ technique1:true });
  assert([...f.game.shots.values()].some(shot=>shot.owner===f.ranger.id));
  f.wait(() => ![...f.game.shots.values()].some(shot=>shot.owner===f.ranger.id));
  assert.equal(target.health,700);
  assert.equal(f.ranger.damageDealt,0);
});

test('Rolling Nock retains one paid, fully-set arrow through a real dodge and releases after landing', () => {
  const f=fixture('roll');
  const ammo=f.ranger.ammo;
  f.step({ technique1:true });
  f.wait(() => f.kit().rangerSight?.stage==='release');
  const before=f.cue()!, x=f.ranger.x;
  f.step({ dodge:true,moveX:1 });
  assert(f.ranger.x > x && f.kit().rangerSight?.stage==='rolling');
  f.step({ technique1:true });
  assert.equal(f.game.shots.size,0);
  f.wait(() => f.kit().rangerSight?.stage==='release');
  assert.equal(f.cue()?.id,before.id);
  assert.equal(f.cue()?.until,before.until);
  assert.equal(f.kit().rangerSight?.rollAvailable,false);
  assert(f.step({ technique1:true }).some(event=>event.type==='sound' && event.id==='ranger-sight-release'));
  assert.equal(f.ranger.ammo,ammo-1);
  const ordinary=fixture();
  ordinary.step({technique1:true});
  ordinary.wait(()=>ordinary.kit().rangerSight?.stage==='release');
  ordinary.step({dodge:true,moveX:1});
  assert(!ordinary.cue());
  assert(ordinary.kit().rangerSight!.recoveryAt > ordinary.game.combatTick);
});

test('Change Bearing replaces the guides once, with the same paid arrow and deadline', () => {
  const f=fixture('bearing');
  const ammo=f.ranger.ammo;
  f.step({ technique1:true });
  f.wait(() => f.kit().rangerSight?.stage==='release');
  const before=f.cue()!;
  f.step({ technique1:true,aim:Math.PI/2 });
  assert.equal(f.kit().rangerSight?.stage,'adjust');
  assert.equal(f.cue()?.aim,Math.PI/2);
  assert.equal(f.cue()?.id,before.id);
  assert.equal(f.cue()?.until,before.until);
  f.wait(() => f.kit().rangerSight?.stage==='outside',{ aim:0 });
  f.step({ technique1:true,aim:0 });
  assert.equal(f.cue()?.aim,Math.PI/2);
  assert.equal(f.ranger.ammo,ammo-1);
  f.step({ technique1:true,aim:Math.PI/2 });
  assert([...f.game.shots.values()].some(shot=>shot.owner===f.ranger.id && shot.vy>0 && Math.abs(shot.vx)<1e-6));
});

test('the reserved arrow leaves issued Survey charges and Crosswind’s three-arrow cost intact', () => {
  const f=fixture(undefined,'crosswind');
  f.step({ ultimate:true });
  const survey=f.game.classCues().find(c=>c.kind==='ranger-survey' && c.owner===f.ranger.id)!;
  assert(survey?.kind==='ranger-survey');
  Object.assign(f.ranger,{ x:survey.x,y:survey.y,oldX:survey.x,oldY:survey.y });
  const ammo=f.ranger.ammo, charges=f.kit().rangerSurveyCharges;
  f.step({ technique1:true });
  f.wait(() => f.kit().rangerSight?.stage==='release');
  f.step({ technique1:true });
  assert.equal(f.kit().rangerSurveyCharges,charges);
  assert.equal(f.ranger.ammo,ammo-1);
  f.step({ q:true });
  assert.equal(f.ranger.ammo,ammo-4);
  assert.equal(f.kit().rangerSurveyCharges,charges);
});
