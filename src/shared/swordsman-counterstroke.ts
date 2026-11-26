import type { InputFrame, Vec } from './protocol.ts';

export const counterstrokeIds = {
  entry:'swordsman-drawn-reply-1',
  needle:'swordsman-counterstroke-needle-return-1',
  back:'swordsman-counterstroke-back-answer-1',
} as const;

const radians = (degrees: number) => degrees*Math.PI/180;
export const counterstrokeRules = {
  guardTicks:11,
  replyTicks:28,
  choiceAngle:radians(34),
  flankAngle:radians(45),
  front:{reach:142,arc:radians(88),damage:92,ordinaryTargets:3},
  rear:{reach:119,arc:radians(106),damage:90,ordinaryTargets:3},
  needleReach:188,
  needleSpeed:430,
  needleRadius:4,
} as const;

export type ReplyFighter = Vec & {
  id:string;
  aim:number;
  status:string;
  connected:boolean;
  dashUntil:number;
  reloadAt:number;
  skills:readonly string[];
};
type ReplyCut = typeof counterstrokeRules.front | typeof counterstrokeRules.rear;
export type CounterstrokeContext = {
  active:boolean;
  tick:number;
  nextId():number;
  canGuard(player:ReplyFighter):boolean;
  payRecovery(player:ReplyFighter):void;
  raiseGuard(player:ReplyFighter,id:number,aim:number,until:number):void;
  lowerGuard(id:string):void;
  cut(player:ReplyFighter,aim:number,shape:ReplyCut):void;
  needle(player:ReplyFighter,aim:number,damage:number):boolean;
  sound(id:string,player:ReplyFighter):void;
};
type Reply = {
  id:number;
  owner:string;
  aim:number;
  at:number;
  guardUntil:number;
  responseUntil:number;
  catchAt:number;
  reverse:number;
  damage:number;
  fitting:string|undefined;
};
export type CounterstrokeCue = Vec & {
  kind:'sword-drawn-reply';
  state:'guard'|'forward'|'needle'|'back'|'cut'|'return';
  id:number;
  owner:string;
  aim:number;
  radius:number;
  arc:number;
  at:number;
  until:number;
};

const eligible = (player:ReplyFighter, now:number) =>
  player.connected && player.status==='active' && now>=player.dashUntil && now>=player.reloadAt;
const difference = (a:number,b:number) => Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function replyAction(state:Reply,aim:number) {
  if (state.fitting===counterstrokeIds.needle) {
    return difference(aim,state.reverse)<=counterstrokeRules.choiceAngle?'needle':undefined;
  }
  const turn=difference(aim,state.aim);
  if (turn<=counterstrokeRules.choiceAngle) return 'front';
  if (state.fitting===counterstrokeIds.back&&turn>=counterstrokeRules.flankAngle) return 'back';
  return undefined;
}

export class Counterstroke {
  private readonly replies = new Map<string,Reply>();
  private cuts:CounterstrokeCue[] = [];

  get active() {
    return this.replies.size>0 || this.cuts.length>0;
  }

  clear() {
    this.replies.clear();
    this.cuts=[];
  }

  drop(id:string) {
    this.replies.delete(id);
    this.cuts = this.cuts.filter(cue=>cue.owner!==id);
  }

  engaged(id:string) {
    return this.replies.has(id);
  }

  private present(owner:ReplyFighter,state:Reply,now:number) {
    return eligible(owner,now) && owner.skills.includes(counterstrokeIds.entry) &&
      (!state.fitting || owner.skills.includes(state.fitting)) && now<(state.responseUntil || state.guardUntil);
  }

  status(player:ReplyFighter,context:CounterstrokeContext) {
    const state = this.replies.get(player.id);
    const current = context.active && state && this.present(player,state,context.tick) ? state : undefined;
    const response = current?.responseUntil ? current : undefined;
    const action=response&&context.tick>response.catchAt?replyAction(response,player.aim):undefined;
    return {
      canGuard:Boolean(context.active&&!current&&eligible(player,context.tick)&&context.canGuard(player)),
      guardUntil:current?.guardUntil??0,
      responseUntil:response?.responseUntil??0,
      canAnswer:Boolean(action),
      fitting:current?.fitting,
      action,
    };
  }

  capture(player:ReplyFighter,id:number,velocity:Vec,incomingDamage:number,context:CounterstrokeContext) {
    const state = this.replies.get(player.id);
    if (!state || state.id!==id || state.responseUntil || !this.present(player,state,context.tick)) return false;
    if (!Number.isFinite(incomingDamage) || !(Math.hypot(velocity.x,velocity.y)>0)) return false;
    state.catchAt = context.tick;
    state.responseUntil = context.tick+counterstrokeRules.replyTicks;
    state.reverse = Math.atan2(-velocity.y,-velocity.x);
    state.damage = Math.max(40,Math.min(86,32+incomingDamage*0.65));
    context.sound('sword-drawn-reply-catch',player);
    return true;
  }

  command(player:ReplyFighter,input:InputFrame,context:CounterstrokeContext) {
    const {tick} = context;
    const current = this.replies.get(player.id);
    const interrupted = !context.active||!eligible(player,tick) || input.dodge || input.sprint ||
      input.q || input.e || input.ultimate || input.reload || input.supply>=0 || input.technique1 || input.technique3;
    if (interrupted || current&&!this.present(player,current,tick)) {
      if (current) {
        this.replies.delete(player.id);
        context.lowerGuard(player.id);
      }
      return false;
    }
    if (!input.technique2) return Boolean(current);
    if (!current) {
      if (!player.skills.includes(counterstrokeIds.entry) || !context.canGuard(player)) return false;
      const fitting = player.skills.includes(counterstrokeIds.needle)?counterstrokeIds.needle :
        player.skills.includes(counterstrokeIds.back)?counterstrokeIds.back:undefined;
      const id=context.nextId(), guardUntil=tick+counterstrokeRules.guardTicks;
      this.replies.set(player.id,{id,owner:player.id,aim:player.aim,at:tick,guardUntil,responseUntil:0,catchAt:0,reverse:0,damage:0,fitting});
      context.payRecovery(player);
      context.raiseGuard(player,id,player.aim,guardUntil);
      context.sound('sword-drawn-reply-guard',player);
      return true;
    }
    if (!current.responseUntil || tick<=current.catchAt) return true;
    const action=replyAction(current,player.aim);
    if (!action) return true;
    const needle=action==='needle', rear=action==='back';
    const shape=rear?counterstrokeRules.rear:counterstrokeRules.front;
    const aim=needle?current.reverse:player.aim;
    if (needle) {
      if (!context.needle(player,aim,current.damage)) return true;
    } else context.cut(player,aim,shape);
    this.replies.delete(player.id);
    this.cuts.push({kind:'sword-drawn-reply',state:needle?'return':'cut',id:context.nextId(),owner:player.id,x:player.x,y:player.y,
      aim,radius:needle?counterstrokeRules.needleReach:shape.reach,arc:needle?0:shape.arc,at:tick,until:tick+7});
    context.sound(needle?'sword-drawn-reply-needle':rear?'sword-drawn-reply-back':'sword-drawn-reply-cut',player);
    return true;
  }

  cues(players:ReadonlyMap<string,ReplyFighter>,now:number):CounterstrokeCue[] {
    const cues = [...this.cuts];
    for (const state of this.replies.values()) {
      const owner=players.get(state.owner);
      if (!owner||!this.present(owner,state,now)) continue;
      const ready=state.responseUntil>now;
      const rear=state.fitting===counterstrokeIds.back, needle=state.fitting===counterstrokeIds.needle;
      const aim=ready&&needle?state.reverse:ready&&rear?state.aim+Math.PI:state.aim;
      const arc=rear?2*(Math.PI-counterstrokeRules.flankAngle):counterstrokeRules.choiceAngle*2;
      cues.push({kind:'sword-drawn-reply',id:state.id,owner:state.owner,x:owner.x,y:owner.y,
        state:ready?needle?'needle':rear?'back':'forward':'guard',
        aim,radius:ready?needle?counterstrokeRules.needleReach:
          (rear?counterstrokeRules.rear:counterstrokeRules.front).reach:30,
        arc:ready?arc:0,at:state.at,until:state.responseUntil||state.guardUntil});
    }
    return cues;
  }

  advance(players:ReadonlyMap<string,ReplyFighter>,context:CounterstrokeContext) {
    for (const [id,state] of this.replies) {
      const player=players.get(id);
      if (!player||!this.present(player,state,context.tick)) {
        this.replies.delete(id);
        context.lowerGuard(id);
      }
    }
    this.cuts=this.cuts.filter(cue=>cue.until>context.tick&&players.get(cue.owner)?.status==='active'&&players.get(cue.owner)?.connected);
  }
}

export type CounterstrokeStatus = ReturnType<Counterstroke['status']>;
