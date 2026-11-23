import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { idleInput, type InputFrame, type Shot } from '../src/shared/protocol.ts';
import { counterstrokeIds, counterstrokeRules } from '../src/shared/swordsman-counterstroke.ts';
import { measuredIds } from '../src/shared/swordsman-measured.ts';
import { viewOf } from '../src/shared/view.ts';

const reply = { technique2:true };
const origin = { x:500,y:500 };
function setup(fitting?:'needle'|'back',hybrid=false) {
  const game = new Game({mode:'endless',seed:41,difficulty:'normal',arenaSelection:'fixed',openingArenaId:'gatehouse',maxPlayers:2});
  if (fitting||hybrid) game.encounter=9;
  const player=game.addPlayer('dara','Dara','swordsman'), ally=game.addPlayer('ally','Lane','soldier');
  const buy=(id:string)=>game.transact(player.id,{id,item:id,kind:'skill'});
  assert(buy('swordsman-edgework-1').ok&&buy(counterstrokeIds.entry).ok);
  if (fitting) {
    assert(buy(counterstrokeIds[fitting]).ok);
    assert.equal(buy(counterstrokeIds[fitting==='needle'?'back':'needle']).reason,'incompatibleItem');
  } else if (!hybrid) assert(!buy(counterstrokeIds.needle).ok);
  if (hybrid) assert(buy('swordsman-measure-1').ok&&buy(measuredIds.entry).ok);
  assert(game.start());
  const arena=structuredClone(game.arena);
  arena.obstacles=[];arena.lavaPits=[];
  Object.defineProperty(game,'arena',{get:()=>arena});
  Object.assign(player,{...origin,oldX:origin.x,oldY:origin.y});
  Object.assign(ally,{x:1200,y:700});
  Object.assign(game.boss,{x:1290,y:720,staggerUntil:9000,deadline:9000});
  const status=()=>game.kitStatus(player.id).counterstroke!;
  function tick(input:Partial<InputFrame>={}){
    assert(game.submitInput(player.id,{...idleInput(),aim:0,clientTick:game.combatTick,sequence:player.ack+1,...input}));
    game.step();
    return game.drainEvents().flatMap(event=>event.type==='sound'&&event.owner===player.id?[event.id]:[]);
  }
  function wait(count:number){
    for(let now=0;now<count;now++)tick();
  }
  function incoming(x=544,y=500,direction=Math.PI) {
    const shot=(Reflect.get(game,'emitShot') as Function).call(game,'hostile',x,y,direction,900,15,3) as Shot;
    assert(shot);
    return shot;
  }
  function victim(id:number,x:number,y:number) {
    const target=game.minions.spawn(id,{kind:'ordinary',x,y,health:500,speed:0,radius:14,damage:1},game.combatTick);
    assert(target);
    return target;
  }
  return {game,player,ally,arena,status,tick,wait,incoming,victim};
}

test('Drawn Reply trades Frontal Guard recovery for one genuine stop and one manually timed front cut',()=>{
  const f=setup();
  const target=f.victim(83001,620,500);
  const first=f.incoming(), second=f.incoming(563);
  const ammo=f.player.ammo;
  const sounds=f.tick({...reply,fire:true});
  assert(sounds.includes('sword-drawn-reply-guard')&&sounds.includes('sword-drawn-reply-catch'));
  const paid=f.player.eAt;
  assert(paid>f.game.combatTick+150);
  assert(!f.game.shots.has(first.id)&&f.game.shots.has(second.id));
  assert.equal(f.status().responseUntil,f.game.combatTick+counterstrokeRules.replyTicks);
  assert.equal(f.game.kitStatus(f.player.id).counterUntil,0);
  assert.equal(f.player.ammo,ammo);
  assert(f.tick({...reply,fire:true}).includes('sword-drawn-reply-cut'));
  assert(target.health<500);
  assert.equal(f.player.eAt,paid);
  assert.equal(f.player.ammo,ammo);
  assert(!f.status().responseUntil);
  assert(!f.tick(reply).includes('sword-drawn-reply-cut'));
});

test('a nearer wall and a missed guard offer no manual reply and keep the paid recovery',()=>{
  const f=setup();
  f.arena.obstacles.push({x:536,y:450,width:10,height:100});
  const shot=f.incoming(550);
  assert(f.tick(reply).includes('sword-drawn-reply-guard'));
  assert(!f.game.shots.has(shot.id));
  const paid=f.player.eAt;
  f.wait(counterstrokeRules.guardTicks+2);
  assert(!f.status().guardUntil);
  assert(!f.status().responseUntil);
  assert.equal(f.player.eAt,paid);
  assert(!f.tick(reply).includes('sword-drawn-reply-cut'));
});

test('Needle Return uses the captured flight direction and only its first reachable target',()=>{
  const f=setup('needle');
  const first=f.victim(83001,598,500), second=f.victim(83002,660,500);
  f.incoming();
  f.tick(reply);
  assert(f.status().responseUntil);
  assert(!f.tick({...reply,aim:Math.PI/2}).includes('sword-drawn-reply-needle'));
  assert(f.tick(reply).includes('sword-drawn-reply-needle'));
  f.wait(18);
  assert(first.health<500);
  assert.equal(second.health,500);
  assert(!f.status().responseUntil);
});

test('Back Answer offers one frontal or flank reply after a genuine stop',()=>{
  const f=setup('back');
  const front=f.victim(83001,590,500), rear=f.victim(83002,410,500);
  f.incoming();
  f.tick(reply);
  assert(f.status().responseUntil);
  f.tick();
  assert.equal(f.status().action,'front');
  assert(f.tick({...reply,aim:Math.PI}).includes('sword-drawn-reply-back'));
  assert(rear.health<500);
  assert.equal(front.health,500);
  const flank=setup('back');
  const side=flank.victim(83003,500,594), facing=flank.victim(83004,590,500);
  flank.incoming();
  flank.tick(reply);
  assert(flank.tick({...reply,aim:Math.PI/2}).includes('sword-drawn-reply-back'));
  assert(side.health<500);
  assert.equal(facing.health,500);
  const ordinary=setup('back');
  const point=ordinary.victim(83005,590,500);
  ordinary.incoming();
  ordinary.tick(reply);
  assert(ordinary.tick(reply).includes('sword-drawn-reply-cut'));
  assert(point.health<500);
});

test('ordinary E retains its multi-shot guard and separate primary counter',()=>{
  const f=setup();
  const shots=[f.incoming(543,489),f.incoming(543,500),f.incoming(543,511)];
  f.tick({e:true});
  assert(shots.every(shot=>!f.game.shots.has(shot.id)));
  assert((f.game.kitStatus(f.player.id).counterUntil??0)>f.game.combatTick);
  assert.equal(f.status().responseUntil,0);
});

test('a legal hybrid cannot start both sword techniques at once and peers see only the public guard',()=>{
  const f=setup(undefined,true);
  f.tick({technique1:true,technique2:true});
  assert.equal(f.player.qAt,0);
  assert.equal(f.player.eAt,0);
  f.incoming();
  f.tick(reply);
  const owner=viewOf(f.game,f.player.id), peer=viewOf(f.game,f.ally.id);
  assert(owner.players.find(player=>player.id===f.player.id)?.kit.counterstroke?.responseUntil);
  assert.equal(peer.players.find(player=>player.id===f.player.id)?.kit.counterstroke,undefined);
  assert(peer.classCues.some(cue=>cue.kind==='sword-drawn-reply'&&cue.owner===f.player.id));
  const paid=f.player.eAt;
  f.game.setConnected(f.player.id,false);
  assert(!f.game.classCues().some(cue=>cue.kind==='sword-drawn-reply'&&cue.owner===f.player.id));
  f.game.setConnected(f.player.id,true);
  assert.equal(f.player.eAt,paid);
  assert.equal(f.status().responseUntil,0);
});
