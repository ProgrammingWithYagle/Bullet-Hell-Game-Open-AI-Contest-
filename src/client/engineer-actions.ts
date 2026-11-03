import type { PlayerView } from "../shared/view.ts";
import type { KitCue, Construct } from "../shared/class-kits.ts";
import { machineryIds as ids } from "../shared/engineer-machinery.ts";
import { trapIds } from "../shared/engineer-traps.ts";
import { engineerRules as r } from "../shared/engineer-pathways.ts";
import { distance } from "../shared/geometry.ts";
import { HZ } from "../shared/protocol.ts";
/** Presentation derives availability from the same owned, living public constructs. */
export function engineerActions(
  p: PlayerView,
  cues: readonly KitCue[],
  now: number,
) {
  if(p.classId==='engineer'&&p.skills.includes('engineer-traps-1')){
    const plates=cues.filter(c=>c.kind==='engineer-charge'&&c.owner===p.id&&c.state!=='spent'&&c.until>now);
    const ready=plates.filter(c=>c.kind==='engineer-charge'&&c.state==='ready');
    const command=p.skills.includes(trapIds.switch)&&plates.some(c=>c.kind==='engineer-charge'&&c.state!=='fuse')&&(p.qAt>now||plates.length>=r.chargeCapacity);
    return {
      command,qNameKey:command?(p.kit.trapHeld?'ui.engineer.releaseTraps':'ui.engineer.holdTraps'):null,
      qAt:command?(p.kit.trapCommandAt??0):p.qAt,qBlocked:!command&&plates.length>=r.chargeCapacity,
      extras:([
        ['technique1',trapIds.key,p.kit.technique1At??0,!ready.some(c=>c.until>now+Math.ceil(r.fuseSeconds*HZ))],
        ['technique2',trapIds.haul,p.kit.technique2At??0,!ready.some(c=>distance(p,c)<=r.haulReach&&c.until>now+Math.ceil((r.haulSeconds+r.armSeconds)*HZ))],
      ] as const).filter(([,id])=>p.skills.includes(id)).map(([key,id,at,blocked])=>({key,id:key==='technique1'&&p.skills.includes(trapIds.corridor)?trapIds.corridor:id,at,blocked})),
    };
  }
  const machines = cues.filter(
    (c): c is Construct =>
      c.kind === "turret" &&
      !!c.machinery &&
      c.owner === p.id &&
      c.health > 0 &&
      c.until > now,
  );
  const busy = (id: number) =>
    cues.some(
      (c) => c.kind === "engineer-coil" && c.id === id && c.until > now,
    );
  const control = p.skills.includes(ids.anchor)
    ? "anchor"
    : p.skills.includes(ids.survey)
      ? "survey"
      : null;
  const command = !!control && p.qAt > now && machines.length > 0;
  const anchored = machines.every((t) => t.order === "anchor");
  const prism =
      p.skills.includes(ids.prism) && !p.skills.includes(ids.convergence),
    lastAt =
      now +
      Math.ceil(r.coilChargeSeconds * HZ) +
      (prism ? 2 * Math.ceil(r.prismInterval * HZ) : 0);
  return {
    command,
    qNameKey: command
      ? "ui.engineer." +
        (control === "survey" ? "waypoint" : anchored ? "recall" : "anchor")
      : null,
    qAt: command
      ? Math.max(0, ...machines.map((t) => t.commandAt ?? 0))
      : p.qAt,
    qBlocked: command && machines.some((t) => busy(t.id)),
    extras: (
      [
        [
          "technique1",
          ids.coil,
          p.kit.technique1At ?? 0,
          !machines.some((t) => t.until > lastAt) ||
            machines.some((t) => busy(t.id)),
        ],
        [
          "technique2",
          ids.salvage,
          p.kit.technique2At ?? 0,
          p.qAt <= now ||
            !machines.some(
              (t) => distance(t, p) <= r.salvageReach && !busy(t.id),
            ),
        ],
      ] as const
    )
      .filter(([, id]) => p.classId === "engineer" && p.skills.includes(id))
      .map(([key, id, at, blocked]) => ({
        key,
        id:
          key === "technique1" && p.skills.includes(ids.convergence)
            ? ids.convergence
            : key === "technique1" && p.skills.includes(ids.prism)
              ? ids.prism
              : id,
        at,
        blocked,
      })),
  };
}
