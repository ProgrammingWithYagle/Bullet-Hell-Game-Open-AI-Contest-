# Crazed Horizon implementation

Updated October 26, 2026 for **2026.10.26-crazed-horizon**, protocol **21**. Global difficulty, intrinsic threat grade and boss form are separate. These are implemented rules; human balance/rendered/device acceptance remains open.

| Global difficulty | Phase shield event | Combat revival | Interior cover | Encounter form |
| --- | --- | --- | --- | --- |
| Baby | Six circles, two-second hold; Standard only | 100% maximum health | Original plus two props | Selected opening form |
| Easy | Three circles, three-second hold; Standard only | 50% | Original | Selected opening form |
| Normal | Off | 25% | Original | Selected opening form |
| Hard | Off | Disabled | Half, rounded down | Selected opening form |
| Insane | Off | Disabled | None | Every boss Brutal |
| Hellish | Off | Disabled | None; warned lava | Every boss Crazed |

The form override applies to all openings, future offers, repeats and the consented Uncounted extension. Insane/Hellish retain their existing Hard-campaign unlock. Local Practice can choose any of the three forms on lower difficulties. Individual boss weak points remain separate from the global shield-circle event.

Revival fractions cover teammate channels, solo recovery, Medic resurrection and kits. Hard+ cannot buy or consume revival kits. Between-encounter recovery remains. Shield channels require one occupant solo, two through eight players, or three for larger squads; the event lasts eight seconds. Every Brutal/Crazed form disables it even on Baby/Easy. Unassisted transitions preserve existing hostile shots/fields and cancel obsolete future casts.

## Forms and phases

| Form | Marker / treatment | Health / damage | Deadline / bounty | Projectile budget |
| --- | --- | --- | --- | --- |
| Standard | Fixed intrinsic grade | 1x / 1x | 1x / 1x | 1x |
| Brutal | B / red | 2x / 2x | 1.5x / 1.75x | 2.5x |
| Crazed | C / purple | 2x / 2x | 1.5x / 1.75x | 7.5x Standard = 3x Brutal |

Projectile budgets multiply each form's ordinary projectile emissions; authored signature differences and additional attacks make encounter totals vary. Delayed repeats retain the locked origin, aim, speed, damage and escape gaps. Brutal adds one full repeat and an alternating half-wave; Crazed adds six full repeats and an alternating half-wave. The first repeat is warned for 1.05 seconds; successive releases are 0.35 seconds apart. Even base-shot totals yield exact 2.5x/7.5x counts; odd totals carry their half-shot forward. Repeats never recurse. Pending work is capped at 3,072 projectiles/128 origin-time groups, each group at 200 angles, and live hostile projectiles at 4,000. Caps, cancellation and Warden safety can reduce actual releases.

Controlled Clockmender and drone-linked shots scale inside their own controllers: full 24-shot rings become 60/180 before their authored gaps. Stops, restarts and source cancellation remain. Contact, beam and minion signatures retain their authored behavior; the added form pressure below also applies.

Threats 1–2 retain two half-health phases in every form. Higher threats use three Standard/four Brutal or Crazed phases. Crazed inherits each identity's complete Brutal signature. A separate boss nameplate, threat/form seal, phase subtitle, segmented bar and four-second entry cue identify changes. A dedicated original phase sound follows effects volume, briefly ducks music and has playback priority. A brief bar engraving respects both reduced-motion settings. Bespoke per-boss transformation animation remains future art work.

## Added form pressure

Brutal alternates locked pursuit circles and full-board crosscuts. Crazed uses more frequent pursuit marks, wider cuts and a delayed perpendicular weave. Every extra strike has at least 1.8 seconds of warning and lasts 0.55 seconds. Only two/three separated targets are marked at once; targets rotate through the actual squad/decoy list. Marks freeze when announced. Crossing during the harmless tell, leaving a marked position or timing dash invulnerability supplies counterplay. Relative swept contact catches fast crossings. Phase reset, stagger, victory, deadline and wipe clear the pressure. Warden warning/active sweeps cancel auxiliary pressure to preserve their safe trailing sector. This pass introduces no instant-kill attacks.

## Arenas and progression

Four spacious footprints are uniformly reduced in world space: Gatehouse 1344x840, Triage Yard 1376x774, Sunken Chapel 1260x828, Bell Foundry 1350x765. Ossuary Works 1300x1000 and Crown Crypt 1240x880 retain their existing chicanes/circuits. Paint, masonry, cover and spawns use the same transform, while player speed, body sizes and dash distance remain. The fixed 1600x1000 camera still frames the board. Original ground/native pixels and their issued reconstruction contracts remain unchanged; this is runtime placement scaling.

Baby still adds two real cover props/map. Boundary walls and boss-created mechanisms remain on all difficulties. Hellish lava retains a three-second opening tell and 24 damage/second in half-second hits, with clear deployments. Insane global health is 1.25x before Brutal, avoiding a conservative Tank opening deadline miss; Hellish remains 1.2x before Crazed. Normal health is unchanged. Analytical feasibility is separate from gameplay balance acceptance.

Endless tracks each identity's highest actually cleared form: Standard, then Brutal, then Crazed thereafter. Seeded bags, twelve-identity repeat protection, exclusive slots and capped build progression remain. Known issued protocol 20 local Practice/profile revision 86ace798... migrates to protocol21, retaining identity, money, purchases and progress. Older bounded migrations remain; unproven old form history is conservatively Standard. Current form history is validated and retained by offline and authoritative boundary restore. Online/signed compatibility stays strict.

The optional secret still requires a timeout-free Normal-or-higher completed campaign with at least three clears, banks victory before independent consent, and remains excluded from random Endless offers. The roster remains 66 (65 ordinary/one secret), with 85 ordinary identities and 58 original quality passes remaining. Multiple simultaneous bosses, bespoke transformation art and final acceptance remain open. Existing previews through 5185, protected main, draft PR14, public protocol4 Site and immutable protocol13 Windows development archive remain separate.

Current pass evidence belongs to reviews/crazed-horizon-2026-10-26/. Earlier difficulty-pressure/assist checkpoints remain historical evidence. See [current checkpoint](CHECKPOINT_2026_10_25.md), [single-ledger progress](DEVELOPMENT_PROGRESS.md) and [Crazed implementation](CRAZED_HORIZON.md).

Exact source/CI/production/preview receipts follow below. No rendered, physical-device, native-language, listening or final human balance acceptance is claimed.

## Completed Crazed checkpoint evidence

The complete gameplay source is **`6b28eb3ff6af39b4ecbcdb22a014ac9833190685`**, build **2026.10.26-crazed-horizon / protocol 21**. Both exact GitHub checks succeeded: jobs 121962939189 (direct branch source) and 121962988880 (PR merge candidate with unchanged protected main). Both downloaded logs show **497 tests / 497 pass / 0 fail**, pinned Node 24 / Pillow 12.3.0 and successful production verification. Runtime inputs remain identical in the later documentation checkpoints. Inspect actual latest HEAD and its own checks; the full goal remains active.

Canonical snapshot `b1e93308b063ce721f8a5cc52e97616d53a8b75cea35a32bfbd0aae95fb849d0`; local snapshot `a1729f860be4a1790f5bd1238fd156cfc2559a08b23e9895739a53964e821d3e`. The difference is only the pre-existing CRLF/LF byte in unchanged `pnpm-workspace.yaml` (143 local / 142 committed bytes). Runtime source matches committed bytes exactly: `e48a9909c96b36954cffd1b7a4ae5ecce24b544115d5b3b9d3b4fa12cbb57fd4`. Content revision 312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006. All previous asset blobs, all 66 Standard/previous Brutal definitions and all 34 Wiki image blobs remain unchanged. The sole new asset is the original phase WAV. All 13 raw local logs match their complete-source blobs. The earlier 6145931 push omitted the WAV and its two CI jobs were cancelled; the following complete commit fixed admission without rewriting history. Only complete source was frozen/published.

Latest frozen Solo preview: **http://127.0.0.1:5186/**, runtime source 6b28eb3, PID **5196**, root `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-crazed-horizon-6b28eb3`. All **1,685 files /721,046,341 bytes** match production and **30 raw HTTP checks** pass. All eight earlier 5178–5185 frozen roots were verified unchanged: **13,340 files /5,512,592,258 bytes**; prior index responses and listener PIDs remain. No previous listener was stopped, replaced or restarted. Preserve all 5174–5186 roots/processes. Browser control remains disabled.

The current Wiki is published from exact committed **documentation source `87f945aeeb2e97233974f33c72266e5df39e9ee0`**, at Wiki commit **`0c206ec9db7904fb6dd9db14520ebb2869571490`**. All 18 Markdown blobs,34 image blobs and34 public image SHA256 responses match, with four anonymous HTML responses passing. This follow-up corrects the current hosting label to protocol 21 and the backlog deficit to 85; it retains the issued Windows archive at protocol 13. Runtime inputs match 6b28eb3; canonical Wiki bytes match 87f945a. Later metadata changes must preserve those respective boundaries. Historical 6b28eb3/afe23ae publication evidence remains in `wiki-publication.json`; the current exact publication is `wiki-publication-final.json`.

Exact local/CI/production/geometry/phase-audio/preservation/preview/process/HTTP/Wiki/guard receipts and failed attempts live under `reviews/crazed-horizon-2026-10-26/`. No public Site or Windows deployment occurred. Rendered, physical-device, native-language, listening and final human balance acceptance remain open; no new roster or individual quality credit is counted. The remaining 85 ordinary identities, 58 individual quality passes and all hosted/recovery/WAN/device/release gates stay active.
