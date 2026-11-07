import { flakIds } from "../shared/heavy-flak.ts";
import type { PlayerView } from "../shared/view.ts";
export function heavyActions(p: PlayerView, now: number) {
  return {
    command: false,
    qNameKey: null,
    qAt: p.qAt,
    qBlocked: false,
    extras:
      p.classId === "heavy" && p.skills.includes(flakIds.entry)
        ? [
            {
              key: "technique1" as const,
              id: flakIds.entry,
              at: p.kit.technique1At ?? 0,
              blocked: p.kit.heavyFlakBlocked ?? true,
            },
            ...(p.skills.includes(flakIds.command)
              ? [
                  {
                    key: "technique2" as const,
                    id: flakIds.command,
                    at: 0,
                    blocked:
                      (p.kit.heavyFlakCommandBlocked ?? true) ||
                      (p.kit.heavyFlakUntil ?? 0) <= now,
                  },
                ]
              : []),
          ]
        : [],
  };
}
