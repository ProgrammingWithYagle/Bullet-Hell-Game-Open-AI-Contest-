import{sniperId,sniperIds}from'../shared/soldier-sniper.ts';
import{grenadierIds as gren}from'../shared/soldier-grenadier.ts';
import {
  marksmanId,
  marksmanIds,
  marksmanRules,
} from "../shared/soldier-marksman.ts";
import type { PlayerView } from "../shared/view.ts";
import {
  skirmisherIds as ids,
  skirmisherRules as rules,
} from "../shared/soldier-skirmisher.ts";
export function soldierActionId(p: Pick<PlayerView, "skills">) {
  if(p.skills.includes(sniperId))return sniperId;
  if(p.skills.includes(gren.entry))return gren.entry;
  if (p.skills.includes(marksmanId)) return marksmanId;
  return p.skills.includes(ids.advance)
    ? ids.advance
    : p.skills.includes(ids.rear)
      ? ids.rear
      : ids.entry;
}
export const soldierLoadId = (p: Pick<PlayerView, "skills">) =>
  p.skills.includes(gren.entry)?gren.pitch:p.skills.includes(ids.roving) ? ids.roving : ids.drill;
export function soldierPaidStepAvailable(p: PlayerView, now: number) {
  return (
    p.classId === "soldier" &&
    p.skills.includes(ids.ready) &&
    (p.kit.soldierReadyUntil ?? 0) > now &&
    p.ammo >= rules.loadedStepAmmo &&
    ((p.kit.technique1At ?? 0) <= now || p.skills.includes(ids.volley))
  );
}
export function soldierActions(p: PlayerView, now: number) {
  if(p.classId==='soldier'&&p.skills.includes(sniperId))return{command:false,qNameKey:null,qAt:p.qAt,qBlocked:false,extras:[{key:'technique1' as const,id:sniperId,at:p.kit.technique1At??0,blocked:p.kit.sniperBlocked??true},...(p.skills.includes(sniperIds.bore)?[{key:'technique2' as const,id:p.kit.sniperPrepared?sniperIds.bore:p.skills.includes(sniperIds.rest)?sniperIds.rest:sniperIds.bore,at:p.skills.includes(sniperIds.rest)?0:p.kit.sniperPrepared?0:p.kit.sniperRecoveryAt??0,blocked:p.kit.sniperPrepared?(p.kit.sniperBlocked??true):p.skills.includes(sniperIds.rest)?(p.kit.sniperRestBlocked??true):true}]:[])]};
  if(p.classId==='soldier'&&p.skills.includes(gren.entry))return{command:false,qNameKey:null,qAt:p.qAt,qBlocked:false,extras:[{key:'technique1' as const,id:gren.entry,at:p.kit.technique1At??0,blocked:p.kit.grenadierBlocked??true},...(p.skills.includes(gren.pitch)?[{key:'technique2' as const,id:gren.pitch,at:p.kit.technique2At??0,blocked:p.kit.grenadierShortBlocked??true}]:[])]};
  if (p.classId === "soldier" && p.skills.includes(marksmanId))
    return {
      command: false,
      qNameKey: null,
      qAt: p.qAt,
      qBlocked: false,
      extras: [
        {
          key: "technique1" as const,
          id: marksmanId,
          at:
            (p.kit.soldierRelayUntil ?? 0) > now
              ? 0
              : (p.kit.technique1At ?? 0),
          blocked:
            p.kit.soldierBankBlocked ??
            (p.status !== "active" ||
              p.ammo < marksmanRules.ammunition ||
              p.reloadAt > now ||
              p.dashUntil > now ||
              p.overdriveUntil > now),
        },
        ...(p.skills.includes(marksmanIds.pair)
          ? [
              {
                key: "technique2" as const,
                id: marksmanIds.pair,
                at:
                  (p.kit.soldierPairUntil ?? 0) > now
                    ? 0
                    : (p.kit.technique2At ?? 0),
                blocked:
                  p.kit.soldierPairBlocked ?? p.kit.soldierBankBlocked ?? true,
              },
            ]
          : []),
      ],
    };
  const extras: {
    key: "technique1" | "technique2";
    id: string;
    at: number;
    blocked: boolean;
  }[] = [];
  if (p.classId === "soldier" && p.skills.includes(ids.entry)) {
    const recovery = p.kit.technique1At ?? 0,
      normal = (p.kit.soldierFollowupUntil ?? 0) > now && recovery <= now,
      paid = soldierPaidStepAvailable(p, now);
    extras.push({
      key: "technique1",
      id: soldierActionId(p),
      at: paid && !normal ? 0 : recovery,
      blocked:
        p.status !== "active" ||
        p.dashUntil > now ||
        (p.kit.soldierStepUntil ?? 0) > now ||
        (!normal && !paid),
    });
  }
  if (p.classId === "soldier" && p.skills.includes(ids.drill)) {
    const loading = (p.kit.soldierLoadUntil ?? 0) > now;
    extras.push({
      key: "technique2",
      id: soldierLoadId(p),
      at: loading ? 0 : (p.kit.technique2At ?? 0),
      blocked:
        p.status !== "active" ||
        (!loading &&
          (p.dashUntil > now ||
            p.overdriveUntil > now ||
            p.ammo >= (p.kit.soldierMagazineCapacity ?? 0) ||
            ((p.kit.soldierStepUntil ?? 0) > now &&
              !p.skills.includes(ids.roving)))),
    });
  }
  return {
    command: false,
    qNameKey: null,
    qAt: p.qAt,
    qBlocked: false,
    extras,
  };
}
