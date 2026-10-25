# Architecture

The shared deterministic simulation runs at 30 Hz. Phaser presents its state; menus and HUD use a DOM overlay. Offline play hosts the same authority in a worker. Online play uses Colyseus rooms and a server-owned simulation, with client movement prediction and reconciliation.

**Current runtime protocol: 13.** The immutable authored content revision is `b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241`. The content bible's historical protocol field is not the live transport protocol; `src/shared/protocol.ts` owns that value.

- Gameplay validates inputs, purchases, skill prerequisites, votes, rewards, collisions and boss transitions at the authority.
- Projectile batches reuse weak-point/solid geometry with immediate refresh after destructive hits. Construct broad phases preserve rotated-wall contact and shield order; live Walking District buildings receive friendly weapon damage and block hostile shots.
- Compact projectile waves and actor field patches retain exact gameplay values. Shared geometry handles swept shots and body contacts.
- Class kits, minions and the civic/service boss directors keep rules separate from presentation. Prediction shares map geometry and environmental forces.
- All six maps use one camera space with different traversable footprints. The same source feeds server collision, prediction and map previews.
- JSON boundary saves retain run state. Local protocol-4 through protocol-12 saves have explicitly bounded migrations. Online clients and signed saves require the current protocol.
- Original image returns, exact requests, references and superseded attempts remain preserved; technical normalization does not invent animation frames.
- Local ProfileV1 receipts record personal deployment/clears/rescues with opaque run IDs. Monotonic high-water counts prevent duplicate mastery across patches/restores; profile values never supply combat power. [Profiles](Profiles).
- One structured update history drives the in-game journal and both Markdown changelogs. Tests reject stale published source text or playable-content counts.

## Verification

`pnpm verify` checks authored content and fifteen locale catalogs, TypeScript, headless rules and real-network integration, then builds the production client. `reviews/runtime-verification.json` records the exact source snapshot hash and emitted build artifacts. Art/audio audits and Wiki publication evidence are separate reports.

Passing automated checks does not imply full rendered FPS, human playtest, device, WAN, restart recovery, native-language or release acceptance. [Hosting and Recovery](Hosting-and-Recovery) records operational limits.

[Shared authority](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/game.ts) · [Live protocol](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/protocol.ts) · [Latest full verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/runtime-verification.json)

[Latest balance, collision and local throughput evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BALANCE_AND_COLLISION_RUNTIME.md): 283 full-pipeline tests, 210 progression combinations and 1,740 health/deadline deployments. Longer local 50-client Moths/Walking District and 16-client City Eater probes keep stress p99 below 25 ms; occasional slower ticks remain. Zero rendered clients means this is not final capacity acceptance.
