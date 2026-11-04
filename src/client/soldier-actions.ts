import type { PlayerView } from "../shared/view.ts";
import {
  skirmisherIds as ids,
  skirmisherRules as rules,
} from "../shared/soldier-skirmisher.ts";
export function soldierActionId(p: Pick<PlayerView, "skills">) {
  return p.skills.includes(ids.advance)
    ? ids.advance
    : p.skills.includes(ids.rear)
      ? ids.rear
      : ids.entry;
}
export const soldierLoadId = (p: Pick<PlayerView, "skills">) =>
  p.skills.includes(ids.roving) ? ids.roving : ids.drill;
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
