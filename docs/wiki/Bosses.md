# Bosses

Twenty-three bosses are playable in the current source. Each has its own signature, phases, normal/Brutal variant, presentation and music. A signature table describes practical counterplay; supplemental attacks still require ordinary bullet-hell movement.

**Threat is encounter danger, separate from selected difficulty.** The tables show the authored minimum threat for each identity. Actual contracts follow the route's threat progression. A Brutal contract appends **+** to that threat, retains the same boss identity and signature, and adds its stronger variant behavior.

Brutal uses twice the health and damage, a 1.5× deadline, 1.75× bounty and four phases instead of three. It does not lift the global projectile cap. Higher phase pressure still preserves the signature's counterplay.

## Quarantine Run

| Boss | Minimum threat | Signature and response |
| --- | --- | --- |
| Hollow Constable | 1 | Watch the fan tells and leave marked arrest zones; gaps and open lanes remain. |
| Lantern Warden | 1 | Follow the rotating safe gap behind the lantern sweep; leave warned zones. |
| Carrion Courier | 1 | Leave the locked charge line and its damaging trail; punish the recovery. |
| Ratcatcher | 1 | Shoot the breakable sack to stop replenishment; ordinary rat packs are bounded. |
| Quarantine Clerk | 1 | Read the ordered stamps, then use the reopened safe interior. |
| The Tollkeeper | 1 | Avoid the locked two-segment wheel route; it reflects once and uses swept contact. |
| Chain Marshal | 1 | Destroy either 90-HP chain anchor to remove its sweep; Brutal doubles anchor health. |
| Gate Widow | 1 | Use the one open shutter lane; the other two physically close and block shots. |
| Black Ambulance | 1 | Sidestep the locked charge; the driver is exposed for three seconds afterward and takes bonus damage. |

## Midnight Circuit

| Boss | Minimum threat | Signature and response |
| --- | --- | --- |
| Cradle Matron | 1 | Destroy 100-HP nests to stop patient production. At most three nests and eighteen patients remain active. |
| Mold Alchemist | 1 | Landing circles lock before the 1.3-second tell ends. Leave the five-second damaging, slowing mold. |
| Bellringer | 1 | Track the 35-degree opening in expanding rings; it rotates 30 degrees between casts. |
| Stitchwright | 1 | Shoot the 45-HP tether, rescue its target for one second, or leave its 350-pixel reach. Dodging still works. |
| Glass Surgeon | 1 | Use the missing polygon edge. Breaking a 35-HP needle removes only its adjacent sides. |
| Ash Baker | 1 | Loaves move slowly, stop on cover and split once after 1.5 seconds along announced directions. |
| Sluice Keeper | 1 | Move through dry strips to avoid the warned side currents. Currents move players without direct damage. |
| Last Stationmaster | 1 | Cross by the open-arrow track; the closed-cross track receives a real swept carriage. |
| The Lamplighter | 1 | Stand inside one of three outlined candle-shadow pockets during the outside pulse. |
| The Anatomist | 1 | Marks follow for 0.7 seconds, then freeze. Leave the fixed marks before the caliper snap. |
| Plague Gardener | 1 | Shoot roots to open their own vine strip early. Each cut strip heals a survivor once for 10 HP. |
| Grave Choir | 1 | Three independently drawn singers share boss health. Defeating a singer cancels its own staggered beams. |
| Red Abbess | 1 | Follow the moving sanctuary pockets or hold any neutral Accord pad for 1.2 seconds to cancel the inward wave. |
| Vesper Judge | 1 | Move into the other arena half before the alternating 1.7-second verdict tell resolves. |

## Accord breaks

At marked transitions, survivors have eight seconds to coordinate a two-second hold on distinct Accord pads. Required participation scales 1, 2, 3 or 5 with party size. Success staggers the boss for four seconds, increases incoming boss damage by 25% and restores 15% party health. These are neutral team interactions, not purchases or class-exclusive actions.

The remaining 37 identities are authored designs. Their presence in the catalog does not make them playable. [Full numerical roster](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/bosses.json) · [Current boss implementation and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md)
