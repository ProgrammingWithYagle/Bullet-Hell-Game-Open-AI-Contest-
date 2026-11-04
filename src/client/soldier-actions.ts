import type { PlayerView } from "../shared/view.ts";
import { skirmisherIds as ids } from "../shared/soldier-skirmisher.ts";
export function soldierActionId(p: Pick<PlayerView, "skills">) {
  return p.skills.includes(ids.advance)
    ? ids.advance
    : p.skills.includes(ids.rear)
      ? ids.rear
      : ids.entry;
}
export function soldierActions(p: PlayerView, now: number) {
  return {
    command: false,
    qNameKey: null,
    qAt: p.qAt,
    qBlocked: false,
    extras:
      p.classId === "soldier" && p.skills.includes(ids.entry)
        ? [
            {
              key: "technique1" as const,
              id: soldierActionId(p),
              at: p.kit.technique1At ?? 0,
              blocked:
                p.status !== "active" ||
                (p.kit.soldierFollowupUntil ?? 0) <= now ||
                (p.kit.soldierStepUntil ?? 0) > now,
            },
          ]
        : [],
  };
}
