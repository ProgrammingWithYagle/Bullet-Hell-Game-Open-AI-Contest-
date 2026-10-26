# Difficulty rules and phase pacing

Current build **2026.10.25-difficulty-pressure**, protocol **16**. This pass responds to the user's manual observations of the separate frozen Early Watch preview on port 5179. It is implemented development content; human acceptance of the response remains open.

| Global difficulty | Phase shield-break event | All combat revives | Static interior cover | Arena pressure / boss form |
| --- | --- | --- | --- | --- |
| Baby | Standard only | 100% maximum health | Full | Selected form |
| Easy | Standard only | 50% maximum health | Full | Selected form |
| Normal | Off | 50% maximum health | Full | Selected form |
| Hard | Off | Disabled | Half, rounded down | Selected form |
| Insane | Off | Disabled | None | Selected form |
| Hellish | Off | Disabled | None | Lava; every boss is Brutal |

Every Brutal form disables the phase shield-break event even on Baby/Easy. The rule covers the Accord channel event, heal, stagger and vulnerability; individual encounter weak points retain their authored counterplay. Unassisted phase changes preserve already-emitted hostile projectiles and active fields, while cancelling obsolete pending casts. The Warden separately clears auxiliary attacks at sweep release to keep its announced safe trailing space valid.

Revival health and availability apply to teammate channels, solo self-recovery, the Medic ultimate and revive kits. Hard+ cannot buy a revive kit; an older carried kit cannot be consumed there. Medic healing, cleansing and other ultimate effects remain. Full between-encounter recovery is unchanged. Difficulty cards and final setup review state the revive, shield and cover rules in all fifteen locales; descriptions no longer promise the old Medic 60% or kit 65% fractions.

## Two longer entry phases

Intrinsic threat levels 1–2 have two phases divided at 50% health, in Standard and Brutal forms. The final visible phase maps to the old final authored pattern: Standard pattern 2, Brutal pattern 3. This preserves the final signature mechanics while removing short intermediate phases. Later threats keep their existing three/four-phase schedules. Boss identity grades, Normal maximum health and attack damage are unchanged.

The single boss health bar has a visible divider at every transition, displays phase number/total, and announces the new phase with an independent four-second banner and existing sound. Repeated patches do not restart the entry cue. Reduced motion does not remove its static text or bar markers. Constable/Early Watch names and hints use the retained authored pattern, while the visible ordinal matches the shorter schedule. Phase-dependent music intensity follows the retained pattern.

## Warned Brutal repeat volleys

Ordinary boss projectile emissions retain locked origins, angles, speed, damage and gaps. Brutal schedules a second wave after 1.05 seconds; fixed threat 5+ also receives a third after 2.10 seconds. The warning cue is replicated before each repeat and shows its origin/rays. Repeats use the original aim and never recursively create more repeats. The queue is bounded to 768 pending projectiles and 64 origin/time groups, and the unchanged global 4,000-hostile limit still applies. Controlled/recalled projectiles retain their authored control sequence, and contact-only signatures retain their explicit extra mechanics. Defeat, deadline, successful eligible Accord and phase reset clear future repeats.

## Cover and Hellish lava

Difficulty selection changes only static interior cover: Hard keeps an alternating half, rounded down; Insane/Hellish remove it. Boundary walls still define the playable footprint. Boss gates and other temporary signature structures remain encounter mechanics. The authority and client prediction call the same cached difficulty layout. Secondary cover art and setup geometry use that exact result. Gatehouse uses separate half/open floor natives so removed fountains are absent visually as well as physically; the original painted floor remains unchanged for Baby/Easy/Normal.

Hellish pits are fixed, edged and hatched circles, with a three-second harmless opening warning. They deal 12 contact damage per half-second (24 per second), respect existing defensive invulnerability and do not multiply with boss damage. Swept body contact prevents crossing a pit between steps from bypassing collision. Pits leave the central crossing lanes open and avoid boss and survivor deployment regions. Their state disappears between encounters. Final rendered/readability and human balance review remain open.

Hellish forces Brutal at the authority for all opening identities, future contracts, repeats and the optional secret; choosing Standard cannot bypass it. Global Hellish health is 1.2×, then the Brutal 2× multiplier makes the effective health 2.4× Normal. The 1.5× Brutal deadline remains. The analytical model explicitly includes the forced variant and declares its aim/uptime/build assumptions; it is not a human balance verdict.

## Secret offer and continuity

The optional Uncounted offer follows a timeout-free Normal-or-higher campaign with at least three completed encounters. Requiring three Accord breaks would make it unreachable after disabling that event on Normal+, so that obsolete gate is removed. Victory is banked before the offer and every player still independently chooses whether to enter. Losing/declining preserves the campaign clear. Hellish also forces this secret into Brutal.

Protocol 16 changes online compatibility. Bounded local migration recognizes the issued protocol-15 content revision `cbb6b8e68c9fb6f3191a3f0ef4a6411c8a3d3e41e3aeca783c122b07ab73d546`, retaining run identity, purchases, progress, discoveries and preferences. Existing earlier migrations remain. Unknown revisions and online/server envelopes are strict. Hellish saved contracts adopt the new forced form.

The source still has 63 bosses (62 ordinary plus one secret), seven playable kits and the optional complete skill map. There are 88 new ordinary identities, 59 original quality passes and seven ability-changing class revamps left. Multiple simultaneous bosses are a future curated encounter option, not implemented by this pass. All prior frozen preview processes/roots, the public protocol-4 Site, protected main and immutable protocol-13 Windows archive remain separate. Browser control is disabled; no browser/device/listening/native-language or final balance acceptance is claimed.

Verification receipts are under `reviews/difficulty-pressure-2026-10-25/`. The new two-client regression verifies forced Brutal, replicated echo/lava warnings, blocked revives and defeat cleanup; headless tests also cover all six difficulty rules, every opening identity, all map cover variants, prediction parity, actual lava damage, queue budgets and local save/profile continuity. Source verification and human review remain separate.
