# Architecture

The shared deterministic simulation runs at 30 Hz. Phaser presents its state; menus and HUD use a DOM overlay. Offline play hosts the same authority in a worker. Online play uses Colyseus rooms and a server-owned simulation, with client movement prediction and reconciliation.

**Current runtime protocol: 14.** The immutable authored content revision is `43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb`. The content bible's historical protocol field is not the live transport protocol; `src/shared/protocol.ts` owns that value.

- Gameplay validates inputs, purchases, skill prerequisites, votes, rewards, collisions and boss transitions at the authority.
- Projectile batches reuse weak-point/solid geometry with immediate refresh after destructive hits. Construct broad phases preserve rotated-wall contact and shield order; live Walking District buildings receive friendly weapon damage and block hostile shots.
- Compact projectile waves and actor field patches retain exact gameplay values. Shared geometry handles swept shots and body contacts.
- Class kits, minions and the civic/service boss directors keep rules separate from presentation. Prediction shares map geometry and environmental forces.
- All six maps use one camera space with different traversable footprints. The same source feeds server collision, prediction and map previews.
- JSON boundary saves retain run state. Local protocol-4 through protocol-13 saves have explicitly bounded migrations. Online clients and signed saves require the current protocol.
- Original image returns, exact requests, references and superseded attempts remain preserved; technical normalization does not invent animation frames.
- Local ProfileV1 receipts record personal deployment/clears/rescues with opaque run IDs. Monotonic high-water counts prevent duplicate mastery across patches/restores; profile values never supply combat power. [Profiles](Profiles).
- One structured update history drives the in-game journal and both Markdown changelogs. Tests reject stale published source text or playable-content counts.

## Verification

`pnpm verify` checks authored content and fifteen locale catalogs, TypeScript, headless rules and real-network integration, then builds the production client. `reviews/runtime-verification.json` records the exact source snapshot hash and emitted build artifacts. Art/audio audits and Wiki publication evidence are separate reports.

Passing automated checks does not imply full rendered FPS, human playtest, device, WAN, restart recovery, native-language or release acceptance. [Hosting and Recovery](Hosting-and-Recovery) records operational limits.

[Shared authority](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/game.ts) · [Live protocol](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/protocol.ts) · [Latest full verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/runtime-verification.json)

[Latest balance, collision and local throughput evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BALANCE_AND_COLLISION_RUNTIME.md): 367 full-pipeline tests, 210 progression combinations and 1,740 health/deadline deployments. Longer local 50-client Moths/Walking District and 16-client City Eater probes keep stress p99 below 25 ms; occasional slower ticks remain. Zero rendered clients means this is not final capacity acceptance.

## One-hour local combat observation

![One hour of actual simulation tick and process heap measurements for fifty scripted clients](https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/images/endurance-50-clients.jpg)

Fifty active SDK clients and 4,000 maintained hostile projectiles: 21.41 ms p99, 112.11 ms worst, 236 ticks over 33.33 ms. The graph uses actual frozen-source measurements, with zero rendered clients and invulnerable fixture players. It is separate from hosted/WAN capacity, normal progression and rendered acceptance. [Exact scope, source and raw evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ONE_HOUR_ENDURANCE.md).

## Survivor animation between patches

Survivor runs and action frames use a drawing clock with at most 50 ms of lead beyond the latest authoritative snapshot. Duplicate patches do not restart it, missing patches hold at the bound, and run/encounter/phase or backward-clock boundaries reset it. It changes sprite frames only. Tank Rescue Charge uses its existing ten-tick duration; ordinary dodge retains its seven-tick interval. A sixty-Hz software fixture fed twenty-Hz authority patches reproduces all six dodge frames. [Regression evidence and scope](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/SURVIVOR_MOTION_TIMING.md).

## Survivor texture delivery

The 168 survivor action/run atlases use technical runtime-sized copies with the same 820 poses, speed, display size and foot origin. Two-times display density is retained wherever the original supplies it. Exact image dimensions imply 211.09 MiB decoded RGBA instead of 462.88 MiB, and PNG transfers fall from 30,042,299 to 15,225,408 bytes. Original production/natives stay intact; the four excluded Engineer north frames remain excluded. These are storage estimates, not measured GPU/driver memory or FPS. [Policy, reconstruction and comparisons](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/SURVIVOR_TEXTURE_DELIVERY.md).

## Boss texture lifecycle

Eight shared actor atlases stay preloaded. The other 57 bosses have exact first-frame identity references ready at startup, and their full animation atlases load only for the current replicated encounter. A two-entry cache reserves space before each load, coalesces rapid switches and releases stale completions. Failures use the same boss identity and retry after five seconds. Live sprites release an old texture before it is destroyed; scene shutdown cancels listeners and clears the cache. This encounter-set estimate falls from 292.5 MiB decoded RGBA to 68.06 MiB at startup or at most 77.06 MiB with two full atlases retained. It is separate from total scene/driver memory, network-delay/device and rendered-FPS acceptance. [Exact policy and tests](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOSS_TEXTURE_LOADING.md).

## Constable action states

Five motion states now use replicated cast, stagger, hurt and defeat clocks. The original eight-frame attack remains unchanged, but anticipation stretches until actual release instead of finishing early. Bounded drawing lead stays within that observed state. Hurt cannot replace a cast or stagger; defeat advances once on world time through rewards/votes and holds the settled pose. Reduced motion preserves readable authority states. Four new whole sheets add nineteen intact poses; independent RGBA reconstruction and real normal/Brutal/Accord/reward regressions remain separate from rendered acceptance. [Motion contract and scope](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/CONSTABLE_MOTION.md).

## Arena material layers

All six maps bind ground textures to their existing exact playable bounds. Five new opaque paintings replace plain fills/grid lines; the original Gatehouse stays intact. A backdrop at depth -2 sits below material images at -1, while actual cover props/outlines, hazards and actors stay above. Setup previews combine the same material with the existing geometry. Full native returns and exact requests are preserved, and independent reconstruction verifies every delivered pixel. The five new floors imply 24.39 MiB decoded RGBA, separate from actual GPU/device budgets. [Ground artwork and scope](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ARENA_GROUND_ART.md).

## Opening boss defeat frames

Seven current atlases retain their original eight live cells and append eight collapse cells. Authoritative defeat records select frames 8–15 once on world time, hold the final pose through reward/vote phases, and cannot create another reward. Reduced motion uses the settled pose. The cache remains two complete atlases with one load in flight; seven exact settled images supplement the 57 first-frame identities for load/retry and safe eviction. The current encounter-set estimate is 72.40625 MiB startup and at most 93.65625 MiB retained, separate from other textures, actual GPU memory and device/FPS acceptance. [Contract and current arithmetic](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/OPENING_BOSS_DEFEATS.md).

Survivor visual motion uses observed-position continuity with a 100-ms stop bound and ten-degree facing hysteresis; one-shot attack/hurt facing stays at onset. Input/authority are unchanged. Current encounter-only static crops plus shared/two full atlas subtotal is 76.81033 MiB by PNG dimensions; every crop reconstructs the old cell and preserves world geometry. Device FPS remains unverified.

Protocol 14 introduces explicit fixed boss classifications and subtier-bearing concealed cards; card-position risk is zero. Local protocol-13 Practice boundaries migrate while preserving progress/run identity. Boss grade drives health, pressure and bounty; base income remains separate from earned bounty premiums. Online signatures and version gates remain strict.
