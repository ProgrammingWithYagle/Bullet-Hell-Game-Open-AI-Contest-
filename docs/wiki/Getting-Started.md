# Getting started

The current feature-branch build supports seven classes, 60 bosses, six maps and five modes. The [public browser playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) is still its older two-class, one-boss protocol-4 deployment. These instructions distinguish that deployment from the current local source.

## Play the current source

Use Node.js 24 or newer and pnpm 11.25.0 in the existing checkout on `feat/first-playable-loop`:

```powershell
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

Open `http://127.0.0.1:5173/`. Offline solo runs its authority in a worker and needs no multiplayer server. For local online rooms, run `pnpm server` in a second terminal. The service normally binds loopback port 2567; health is at `http://127.0.0.1:2567/api/health`.

Choose a class, mode, map and difficulty, review the setup, then start offline or create a public/private room. Private rooms use a six-character code. All seven classes, Quarantine Run, Midnight Circuit, Black Bell Pilgrimage, Grand Raid and Endless Vigil are available. The opening-boss selector is an explicit rehearsal override; ordinary route progression reserves finales for the final encounter.

## Controls

| Action | Keyboard/mouse |
| --- | --- |
| Move | WASD or arrow keys |
| Aim / fire | Mouse / primary mouse button |
| Dodge | Space |
| Reload | R |
| Class abilities | Q and E |
| Ultimate | X |
| Revive, Accord or neutral interaction | Hold F in range |
| Use carried supply | 1, 2 or 3 |

These are defaults. **Settings → Controls** remaps keyboard/mouse actions and standard gamepad buttons, with two keyboard bindings per action and independent Hold/Toggle options for firing and interaction. Duplicate/reserved mappings are rejected; touch actions keep their own identity. HUD/tutorial hints follow the chosen keys.

Gamepad uses left/right sticks for movement/aim, right trigger to fire, A to dodge, X to reload, bumpers for abilities, Y for ultimate, B for interaction, and D-pad for supplies. Touch uses twin sticks and action buttons. Physical controller/device acceptance remains open.

## Between encounters

Completed fights lead to a 15-second mutation vote, 15-second concealed boss vote, 25-second shop and five-second deployment. Currency and build choices are validated by the authority. Purchased power resets each run. **Profile** preserves class mastery, rescues, discovered boss stories, cosmetic insignia and personal/squad Endless bests. Full participation in a Hard campaign unlocks Insane and Hellish. [Profiles](Profiles) covers portable JSON import/export and backups. Open **Changelog** in the main menu footer for the build identifier and dated updates.

Offline saves resume at encounter boundaries and retain the build, economy, votes and RNG state. Supported older local saves are migrated within explicit bounds; incompatible or malformed saves are rejected. Online reconnect reserves a slot for 60 seconds while the server process survives. Server-restart recovery is not yet live.

[Current implementation details](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md) · [Accessibility and Languages](Accessibility-and-Languages)

## Windows and local network

[Download the portable Windows development playtest](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) (706.8 MiB, unsigned). The release includes its per-file manifest, SHA-256 checksums and verification report. The original folder, a fresh ZIP extraction and an ordinary Windows copy all match and pass their separate offline/LAN software fixtures.

A portable Windows development app bundles Electron and the same offline worker, art, music and fonts. Extract the entire issued folder and run `Grave Accord.exe`; no separate Node or internet connection is needed for solo. Profiles use `GraveAccordData` beside the app when writable and can always be exported from Profile.

The desktop **Local network** menu offers explicit Host and Join controls. Choose a port, start hosting, then create a game through the ordinary class/mode/map/difficulty setup. Share the private IPv4 address with players on the same network and keep the host app open. Guests enter that address and port, then browse rooms or join by code. Stop hosting from the LAN menu. The game never changes firewall rules. Physical second-machine LAN and manual desktop acceptance remain open.
