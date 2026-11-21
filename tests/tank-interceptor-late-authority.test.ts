import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interceptionFixture, point, wrap } from './helpers/tank-interceptor-fixture.ts';
import { interceptorIds } from '../src/shared/tank-interceptor.ts';
import { viewOf } from '../src/shared/view.ts';

const card = interceptorIds.returns;
const cue = (game: ReturnType<typeof interceptionFixture>['g']) =>
  game.classCues().find(item => item.kind === 'tank-intercept-screen');

for (const side of [-1, 1]) test('reversal retains one physical screen and its issued debit on side ' + side, () => {
  const f = interceptionFixture({ choice: 'crossing', extra: [card], ally: true });
  const aim = -.7, tangent = { x: -Math.sin(aim) * side, y: Math.cos(aim) * side };
  const origin = point(f.p), ammo = f.p.ammo, invulnerableUntil = f.p.invulnerableUntil;
  const issued = f.launch(aim, side), recovery = f.p.eAt;
  for (let n = 0; n < 5; n++) f.step();
  const before = point(f.p);
  assert(Math.abs((before.x - origin.x) * tangent.x + (before.y - origin.y) * tangent.y - 100) < .01);
  f.step({ technique3: true, aim: wrap(aim + 2), moveX: -tangent.x, moveY: -tangent.y });
  const returned = f.status();
  assert(returned?.phase === 'screen' && returned.returned);
  for (const field of ['id','at','until','expiresAt','normal','origin'] as const) assert.deepEqual(returned[field], issued[field], field);
  assert.deepEqual(returned.motion, { x: -tangent.x, y: -tangent.y });
  assert.equal(f.p.eAt, recovery);
  assert.equal(f.p.invulnerableUntil, invulnerableUntil);
  const other = viewOf(f.g, f.peer!.id);
  assert.equal(other.players.find(player => player.id === f.p.id)!.kit.interceptorPhase, undefined);
  assert.deepEqual(other.classCues.find(item => item.kind === 'tank-intercept-screen'), cue(f.g));
  assert.equal(cue(f.g)!.id, issued.id);
  while (f.g.combatTick < issued.until) f.step({ fire: true });
  assert(!f.status());
  const end = point(f.p), traveled = (end.x - origin.x) * tangent.x + (end.y - origin.y) * tangent.y;
  assert(Math.abs(traveled - 20) < .01);
  assert.equal(f.p.eAt, recovery);
  assert.equal(f.p.ammo, ammo - 1, 'The same first post-expiry frame allows the real paid weapon again');
});

test('the actual returned screen covers an ally missed by the ordinary outward crossing', () => {
  const outcomes = [];
  for (const tried of [false, true]) {
    const f = interceptionFixture({ choice: 'crossing', extra: tried ? [card] : [], ally: true });
    const ally = f.peer!, origin = point(f.p);
    ally.x = origin.x - 38;
    ally.y = origin.y;
    const hp = ally.health + ally.shield;
    const state = f.launch(0, 1);
    for (let n = 0; n < 5; n++) f.step();
    f.step(tried ? { technique3: true, moveY: -1 } : {});
    const round = f.shot({ x: origin.x + 120, y: origin.y }, Math.PI);
    const events = [];
    while (f.g.shots.has(round.id) && f.g.combatTick < state.until + 3) events.push(...f.step());
    outcomes.push({
      changed: hp - ally.health - ally.shield,
      contact: events.some(event => event.type === 'sound' && event.owner === f.p.id && event.id === 'tank-intercept-impact'),
    });
  }
  assert(outcomes[0].changed > 0);
  assert.deepEqual(outcomes[1], { changed: 0, contact: true });
  console.log(JSON.stringify({ outcomes }));
});

for (const caseName of ['unowned', 'early', 'too-late', 'blocked-return', 'second-return', 'hands-busy', 'forward-crossing'] as const) {
  test('the ordinary brake applies at ' + caseName, () => {
    const f = interceptionFixture({ choice: 'crossing', extra: caseName === 'unowned' ? [] : [card] });
    const origin = point(f.p), state = f.launch(0, caseName === 'forward-crossing' ? 0 : 1);
    const recovery = f.p.eAt;
    for (let n = 0; n < (caseName === 'early' ? 1 : caseName === 'too-late' ? 8 : 4); n++) f.step();
    if (caseName === 'blocked-return') f.arena.obstacles.push({ x: origin.x - 8, y: origin.y + 19, width: 15, height: 5 });
    if (caseName === 'second-return') {
      f.step({ technique3: true, moveY: -1 });
      assert(f.status()?.returned);
      f.step();
    }
    f.step({ technique3: true, moveY: caseName === 'second-return' ? 1 : -1, fire: caseName === 'hands-busy' });
    assert.equal(f.status(), undefined);
    assert.equal(f.p.eAt, recovery);
    assert.equal(recovery, state.at + 300);
    assert(!cue(f.g));
  });
}

const offsetCue = (f: ReturnType<typeof interceptionFixture>) =>
  f.g.classCues().find(item => item.kind === 'tank-intercept-screen');

for (const direction of [-1, 1]) test('offset launch is planted, directional and time-bounded on side ' + direction, () => {
  const f = interceptionFixture({choice:'standfast',extra:[interceptorIds.offset],ally:true});
  const body=point(f.p), hp=f.p.health+f.p.shield, before=f.p.invulnerableUntil;
  f.peer!.y=body.y-170;
  const state=f.launch(0,direction), recovery=f.p.eAt, panel=offsetCue(f);
  assert(panel?.kind === 'tank-intercept-screen');
  assert.equal(panel.x,body.x+24);
  assert.equal(panel.y,body.y+direction*56);
  assert.equal(panel.halfSpan,44);
  assert.equal(panel.until,state.until);
  assert.deepEqual(viewOf(f.g,f.peer!.id).classCues.find(item=>item.kind==='tank-intercept-screen'),panel);

  // A held launch chord must not make the stationary panel blink out on its first interval.
  const shot=f.shot({x:body.x+85,y:body.y+direction*90},Math.PI);
  const events=f.step({technique3:true,moveY:direction});
  assert(!f.g.shots.has(shot.id));
  assert(events.some(event=>event.type==='sound'&&event.id==='tank-intercept-impact'));
  assert.equal(f.p.health+f.p.shield,hp);
  assert.deepEqual(point(f.p),body);
  assert.equal(offsetCue(f)?.id,panel.id);
  assert.equal(f.p.eAt,recovery);
  assert.equal(f.p.invulnerableUntil,before);

  f.step();
  const front=f.shot({x:body.x+40,y:body.y},Math.PI);
  f.step();
  assert(!f.g.shots.has(front.id));
  assert(f.p.health+f.p.shield<hp,'Offset leaves the central shot lane exposed');
  const y=f.p.y;
  f.step({moveY:direction});
  assert(!offsetCue(f));
  assert((f.p.y-y)*direction>0);
  assert.equal(f.p.eAt,recovery);
});

test('offset cover fits beside real simulated masonry where the full centered screen cannot form', () => {
  const f=interceptionFixture({choice:'standfast',extra:[interceptorIds.offset]});
  const body=point(f.p);
  f.arena.obstacles.push({x:body.x+24,y:body.y-64,width:10,height:25});
  assert(f.g.kitStatus(f.p.id).interceptorCanArm);
  f.arm();
  f.step({technique3:true});
  assert.equal(f.status()?.phase,'ready');
  assert.equal(f.p.eAt,0);
  f.step();
  f.step({technique3:true,moveY:1});
  assert.equal(offsetCue(f)?.y,body.y+56);
  assert.deepEqual(point(f.p),body);
});

test('the widened side saves an ally on a lane a centered Standfast misses', () => {
  const outcomes=[];
  for(const useOffset of [false,true]){
    const f=interceptionFixture({choice:'standfast',extra:useOffset?[interceptorIds.offset]:[],ally:true});
    const body=point(f.p),ally=f.peer!;
    ally.x=body.x-32;ally.y=body.y+89;
    const hp=ally.health+ally.shield;
    f.launch(0,useOffset?1:0);
    const shot=f.shot({x:body.x+110,y:ally.y},Math.PI);
    for(let n=0;n<4&&f.g.shots.has(shot.id);n++) f.step();
    outcomes.push(hp-ally.health-ally.shield);
  }
  assert(outcomes[0]>0);
  assert.equal(outcomes[1],0);
  console.log(JSON.stringify({allyDamage:outcomes}));
});

test('the unowned movement chord stays an ordinary interruption', () => {
  const f=interceptionFixture({choice:'standfast'});
  f.arm();
  f.step({technique3:true,moveY:-1});
  assert(!f.status()&&!offsetCue(f));
  assert.equal(f.p.eAt,0);
});
