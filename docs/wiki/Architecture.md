# Architecture

The shared deterministic simulation runs at 30 Hz. Phaser presents its state; menus and HUD use a DOM overlay. Offline play hosts the same authority in a worker. Online play uses Colyseus rooms and a server-owned simulation, with client movement prediction and reconciliation.

**Current runtime protocol: 10.** The immutable authored content revision is `b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241`. The content bible's historical protocol field is not the live transport protocol; `src/shared/protocol.ts` owns that value.

- Gameplay validates inputs, purchases, skill prerequisites, votes, rewards, collisions and boss transitions at the authority.
- Compact projectile waves and actor field patches retain exact gameplay values. Shared geometry handles swept shots and body contacts.
- Class kits, minions and the civic/service boss directors keep rules separate from presentation. Prediction shares map geometry and environmental forces.
- All six maps use one camera space with different traversable footprints. The same source feeds server collision, prediction and map previews.
- JSON boundary saves retain run state. Local protocol-4 through protocol-9 saves have explicitly bounded migrations. Online clients and signed saves require the current protocol.
- Original image returns, exact requests, references and superseded attempts remain preserved; technical normalization does not invent animation frames.
- One structured update history drives the in-game journal and both Markdown changelogs. Tests reject stale published source text or playable-content counts.

## Verification

`pnpm verify` checks authored content and fifteen locale catalogs, TypeScript, headless rules and real-network integration, then builds the production client. `reviews/runtime-verification.json` records the exact source snapshot hash and emitted build artifacts. Art/audio audits and Wiki publication evidence are separate reports.

Passing automated checks does not imply full rendered FPS, human playtest, device, WAN, restart recovery, native-language or release acceptance. [Hosting and Recovery](Hosting-and-Recovery) records operational limits.

[Shared authority](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/game.ts) · [Live protocol](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/src/shared/protocol.ts) · [Latest full verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/runtime-verification.json)
