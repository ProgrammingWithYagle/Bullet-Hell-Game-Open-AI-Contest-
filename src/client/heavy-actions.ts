import{lineworkIds}from'../shared/heavy-linework.ts';
import {
  lanyardId,
  traverseIds,
  clutchId,
  keyedId,
  openId,
} from "../shared/heavy-traverse.ts";
import { seamId } from "../shared/heavy-seam.ts";
import { flakIds } from "../shared/heavy-flak.ts";
import type { PlayerView } from "../shared/view.ts";
export function heavyActions(p: PlayerView, now: number) {
  if (p.classId === 'heavy' && p.skills.includes(lineworkIds.entry)) {
    const active = (p.kit.lineworkFlight ?? 0) > 0 || (p.kit.lineworkUntil ?? 0) > now;
    const fitting = p.skills.includes(lineworkIds.yoke)
      ? lineworkIds.yoke
      : p.skills.includes(lineworkIds.sheave) ? lineworkIds.sheave : lineworkIds.entry;
    return {
      command: false, qNameKey: null, qAt: p.qAt, qBlocked: false,
      extras: [
        { key: 'technique1' as const, id: lineworkIds.entry, at: active ? 0 : p.kit.lineworkRecovery ?? 0, blocked: p.kit.lineworkBlocked ?? true },
        { key: 'technique2' as const, id: fitting, at: 0, blocked: p.kit.lineworkCommandBlocked ?? true },
        ...(p.skills.includes(lineworkIds.reserve)
          ? [{ key: 'technique3' as const, id: lineworkIds.reserve, at: 0, blocked: p.kit.lineworkReserveBlocked ?? true }]
          : p.skills.includes(lineworkIds.guide)
            ? [{ key: 'technique3' as const, id: lineworkIds.guide, at: 0, blocked: p.kit.lineworkGuideBlocked ?? true }]
            : []),
      ],
    };
  }
  if (p.classId === "heavy" && p.skills.includes(traverseIds.entry))
    return {
      command: false,
      qNameKey: null,
      qAt: p.qAt,
      qBlocked: false,
      extras: [
        {
          key: "technique1" as const,
          id: traverseIds.entry,
          at:
            (p.kit.heavyTraverseUntil ?? 0) > now
              ? 0
              : (p.kit.technique1At ?? 0),
          blocked: p.kit.heavyTraverseBlocked ?? true,
        },
        ...(p.skills.includes(clutchId)
          ? [
              {
                key: "technique2" as const,
                id: p.skills.includes(lanyardId)
                  ? lanyardId
                  : p.skills.includes(keyedId)
                  ? keyedId
                  : p.skills.includes(openId)
                    ? openId
                    : clutchId,
                at: 0,
                blocked:
                  (p.kit.heavyTraverseUntil ?? 0) <= now ||
                  (p.kit.heavyClutchBlocked ?? true),
              },
            ]
          : []),
      ],
    };
  const cutting =
    p.skills.includes(seamId) && (p.kit.heavyFlakUntil ?? 0) > now;
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
              id: cutting ? seamId : flakIds.entry,
              at: cutting ? 0 : (p.kit.technique1At ?? 0),
              blocked: cutting
                ? !p.kit.heavyFlakSeamReady
                : (p.kit.heavyFlakBlocked ?? true),
            },
            ...(p.skills.includes(flakIds.command)
              ? [
                  {
                    key: "technique2" as const,
                    id: p.skills.includes(flakIds.running)
                      ? flakIds.running
                      : p.skills.includes(flakIds.hanging)
                        ? flakIds.hanging
                        : flakIds.command,
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
