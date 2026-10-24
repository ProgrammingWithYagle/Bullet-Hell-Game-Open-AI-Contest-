# Getting started

[Open the development playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/). No game account is required. The first-visit field guide has Skip and can be replayed from the menu.

Choose New run, Soldier or Medic, Quarantine Run or Endless Vigil, Gatehouse, then a currently available difficulty. Other classes/maps/routes can be inspected but are marked In production. At Review, choose Offline solo, Public or Private, enter a display name and launch. The owner starts the encounter from the lobby. Join room supports public discovery or a private six-character code.

The Free multiplayer service currently reserves at most eight slots and one room. It can sleep while idle; warmup may take time. The source includes queue position/cancellation and a 75-second warmup window. The browser deployment may lag the feature branch; exact frontend/backend identities are in the repository deployment evidence.

## Current source build

The source branch offers three classes and five bosses, protocol 6. Choose any opening boss at Review; use the matching local server for online play. Source Practice completes five different identities; Endless only repeats after the pool, then marks the repeat Brutal with a + threat level. Shops/skill paths/supplies/mutations have illustrated items, and each current boss selects its own original music. [Current implementation and limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOSS_ENCOUNTERS_ITEMS_AND_MUSIC.md). The public Site remains the older protocol-4 build; four classes and the full roster/routes remain unfinished.

## Controls

| Action | Keyboard and mouse |
| --- | --- |
| Move | WASD or arrow keys |
| Aim/fire | Pointer / primary button |
| Dodge/reload | Space / R |
| Starting abilities | Q and E |
| Ultimate | X |
| Revive nearby teammate | Hold F |
| Use supply slots | 1, 2, 3 |

Standard gamepad bindings: sticks move/aim, RT fire, A dodge, X reload, LB/RB abilities, Y ultimate, B revive, D-pad up/down/left supplies. Touch adapters provide movement/aim drags and action buttons. Actual physical controller/phone validation remains pending.

After a non-final victory: fifteen-second mutation vote, fifteen-second concealed contract vote, twenty-five-second shop/skill window and five-second deployment. Shops enforce class, currency, prerequisites and the single-capstone rule. Three inventory slots carry up to two of each selected supply. Votes and purchases are authoritative online.

Any teammate can channel a two-second revive during a twenty-second downed window. Solo has one self-revive per encounter. Eliminated participants return at the next encounter. A whole incapacitated party or expired boss deadline ends the run. The published prototype's five-fight completion and Endless repetitions use Constable variants, not the complete sixty-boss roster.

Offline solo runs the shared simulation in a worker. Compatible lobby/intermission saves preserve the build and offered choices; interrupted offline combat resumes from the prior boundary. Online has sixty-second reconnect reservations while the process survives. Server-process restart recovery and global rankings are not live yet.

## Run from source

Install Node 24 and pnpm 11.25.0. In the existing source folder, run pnpm install --frozen-lockfile and pnpm verify. Run pnpm dev and pnpm server in separate terminals, then open http://localhost:5173/. The normal service binds loopback port 2567. Offline solo needs no multiplayer server. Portable Windows/offline/LAN packaging is still pending.
