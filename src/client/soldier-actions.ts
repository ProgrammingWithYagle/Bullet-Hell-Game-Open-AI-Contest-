import type { PlayerView } from "../shared/view.ts";
import { skirmisherIds as ids } from "../shared/soldier-skirmisher.ts";
export function soldierActionId(p: Pick<PlayerView, "skills">) {
  return p.skills.includes(ids.advance)
    ? ids.advance
    : p.skills.includes(ids.rear)
      ? ids.rear
      : ids.entry;
}
export const soldierLoadId = (p: Pick<PlayerView, "skills">) =>
  p.skills.includes(ids.roving) ? ids.roving : ids.drill;
export function soldierActions(p: PlayerView, now: number) {
  const extras: {
    key: "technique1" | "technique2";
    id: string;
    at: number;
    blocked: boolean;
  }[] = [];
  if (p.classId === "soldier" && p.skills.includes(ids.entry))
    extras.push({
      key: "technique1",
      id: soldierActionId(p),
      at: p.kit.technique1At ?? 0,
      blocked:
        p.status !== "active" ||
        (p.kit.soldierFollowupUntil ?? 0) <= now ||
        (p.kit.soldierStepUntil ?? 0) > now,
    });
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
