# Getting started

The current feature-branch build supports seven classes, 66 bosses, six maps and five modes. The [public browser playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) is still its older two-class, one-boss protocol-4 deployment. These instructions distinguish that deployment from the current local source.

## Play the current source

Use Node.js 24 or newer and pnpm 11.25.0 in the existing checkout on `feat/first-playable-loop`:

```powershell
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

Open `http://127.0.0.1:5173/`. Offline solo runs its authority in a worker and needs no multiplayer server. For local online rooms, run `pnpm server` in a second terminal. The service normally binds loopback port 2567; health is at `http://127.0.0.1:2567/api/health`.

Under **New here?**, **Start gently** prepares Soldier, Quarantine Run, Gatehouse, Baby difficulty and Solo, then opens a confirmation screen. **New run** lets you choose a class, mode, opening arena and difficulty before creating a Solo, public or private session. Mode selection shows the number of boss fights and an estimated duration: five, ten, sixteen or three fights, or an endless run. The map preview appears on the separate map step and labels your start, the boss start, cover and any difficulty-specific lava. Each difficulty has a unique icon (sprout, feather, crossed swords, broken shield, fractured skull or flame). Difficulty cards explain the experience; the selected choice shows its exact assistance rules and multipliers. The Tutorial is available from Home and the header, marked by an open-book icon. Join Room uses a doorway and arrow. The home illustration is shown in full, and its headline explains the encounter loop.

Private rooms use a six-character code; Enter submits the code. All seven classes, Quarantine Run, Midnight Circuit, Black Bell Pilgrimage, Grand Raid and Endless Vigil are available. Public builds choose bosses from their authored random opening pools and ordinary route progression reserves finales for the final encounter. The testing build has a separate rehearsal opener/form selector. Public Baby has an optional, closed-by-default boss guide; opening it pauses Solo. Artwork loading shows progress before the lobby appears.

Home's **Local Practice records** entry shows validated runs saved on this device, filtered by mode and difficulty. The Online boards tab reports the unavailable verified-ranking service. Names entered during setup survive returning to an earlier step, and selection keeps keyboard focus.

The same presentation improvements apply to public and testing builds. Development-build details and rehearsal tools remain visible only in testing builds; public menus keep the ordinary play options.

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

These are defaults. **Settings → Controls** remaps keyboard/mouse actions and standard gamepad buttons, with two keyboard bindings per action and independent Hold/Toggle options for firing and interaction. Duplicate/reserved mappings are rejected; touch actions keep their own identity. HUD/tutorial hints follow the chosen keys. The HUD and touch buttons name the actual class abilities.

Gamepad uses left/right sticks for movement/aim, right trigger to fire, A to dodge, X to reload, bumpers for abilities, Y for ultimate, B for interaction, and D-pad for supplies. Touch uses twin sticks and action buttons. Physical controller/device acceptance remains open.

## Between encounters

Completed fights lead to a 15-second mutation vote, 15-second concealed boss vote, 25-second shop and five-second deployment. Currency and build choices are validated by the authority. Gear tiles show names and prices; the loadout summarizes coins and skill points and explains their roles. Purchased power resets each run. **Profile** preserves class mastery, rescues, discovered boss stories, cosmetic insignia and personal/squad Endless bests. Full participation in a Hard campaign unlocks Insane and Hellish. [Profiles](Profiles) covers portable JSON import/export and backups. Open **Changelog** in the main menu footer for the build identifier and dated updates.

Offline saves resume at encounter boundaries and retain the build, economy, votes and RNG state. Supported older local saves are migrated within explicit bounds; incompatible or malformed saves are rejected. Online reconnect reserves a slot for 60 seconds while the server process survives. Server-restart recovery is not yet live.

[Current implementation details](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MIDNIGHT_CIRCUIT_RUNTIME.md) · [Accessibility and Languages](Accessibility-and-Languages)

## At the end of a run

The result screen shows bosses defeated, your credited boss clears when different, rescues, time in combat and class experience from the run. It explains whether time ran out or the survivor/squad could no longer fight. Testing-modified runs show zero experience and do not count toward saved progress or records. A secured campaign result stays tied to its banked count/time when you leave the optional extension. Progress and local records are available from the main menu; a save failure remains a visible error. Lobby and result screens have no countdown. Votes, shop, deployment and the secret offer retain their actual timer under **Time left**.

## Windows and local network

[Download the portable Windows development playtest](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) (706.8 MiB, unsigned). The release includes its per-file manifest, SHA-256 checksums and verification report. The original folder, a fresh ZIP extraction and an ordinary Windows copy all match and pass their separate offline/LAN software fixtures.

Current packaging supports explicit public/testing audiences and validates the source report before compiling a fresh client; the bundled LAN authority has the same audience. This does not replace the older download linked above. The first new review archive passed file matching but failed its native font check in deeper copied folders; it is unaccepted while the file-loading fix is verified.

A portable Windows development app bundles Electron and the same offline worker, art, music and fonts. Extract the entire issued folder and run `Grave Accord.exe`; no separate Node or internet connection is needed for solo. Profiles use `GraveAccordData` beside the app when writable and can always be exported from Profile.

The desktop **Local network** menu offers explicit Host and Join controls. Choose a port, start hosting, then create a game through the ordinary class/mode/map/difficulty setup. Share the private IPv4 address with players on the same network and keep the host app open. Guests enter that address and port, then browse rooms or join by code. Stop hosting from the LAN menu. The game never changes firewall rules. Physical second-machine LAN and manual desktop acceptance remain open.

## Developer rehearsal: testing builds only

Local testing builds include a boss selector for encounter review. Public builds choose bosses normally and do not show this selector. In a testing build, choose **New Run → Soldier → Quarantine Run → Gatehouse → Normal difficulty**. On the final review screen choose **Hollow Constable** and **Solo**, then set **Boss form** to **Standard form** or **Brutal** and press **Play**. Keeping the class and map the same helps comparison. The Constable stays **1+**, with **B** added for Brutal. Global difficulty remains separate. This choice affects the opener; later contracts follow normal progression.

[Source behavior and exact verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOSS_PRACTICE.md).

## Difficulty, revival and cover

| Difficulty | Phase shield-break event | Combat revival | Interior cover | Extra arena / form rule |
| --- | --- | --- | --- | --- |
| Baby | Six circles, 2 s; Standard only | 100% health | Original plus two props | Selected boss form |
| Easy | Three circles, 3 s; Standard only | 50% health | Full | Selected boss form |
| Normal | Off | 25% health | Full | Selected boss form |
| Hard | Off | Disabled | Half, rounded down | Selected boss form |
| Insane | Off | Disabled | None | Every boss Brutal |
| Hellish | Off | Disabled | None | Marked lava; every boss Crazed |

Both Brutal and Crazed disable the phase shield event at every difficulty. Revival includes solo, teammates, Medic and supplies; full recovery between encounters remains. Boundary walls and temporary boss mechanics remain. Difficulty cards and final review display these rules in all fifteen locales. Hellish pits have a three-second opening tell and deal 24 contact damage per second in half-second intervals. Hellish effective boss health is 2.4× Normal after its forced Crazed multiplier. [Exact rules and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/DIFFICULTY_AND_PHASES.md).

Insane fixes the form selector to Brutal; Hellish fixes Crazed. Lower global difficulties retain the selected opener form for rehearsal.

[Latest Baby/Easy assistance follow-up](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ASSIST_LIMITS.md): Normal revival is 25%; Baby/Easy circles are six/three, channels two/three seconds, and Baby has two extra actual cover props on every map. Source/prediction/prop geometry agree; human/rendered balance review remains open.

## Class ability transformations

The seven requested class-upgrade implementation passes now add 21 behavior changes at existing utility-path depth-three nodes (six cumulative SP each). Costs, prerequisites, node IDs and the single-capstone rule remain. Both skill views show fifteen-locale help. Shared authority, finite constructs, delayed attacks and moving fields replicate to offline/online clients. [Class behavior and tradeoffs](Classes-and-Skills#purchased-ability-transformations). Protocol 18 migrates known issued protocol-17 local saves/profiles; online remains strict. Latest Baby/Easy/Normal assistance and Hellish rules remain intact. Human/rendered/device/native-language acceptance remains open.

## Three encounter forms

Local setup offers Standard, Brutal and Crazed on lower difficulties. Insane fixes Brutal; Hellish fixes Crazed. Purple/C identifies Crazed, red/B Brutal. Difficulty cards state revival, shield, cover and forced-form rules. Normal revival remains 25%, Easy 50%, Baby 100%, Hard+ disabled. [Current rules](Modes#crazed-horizon-follow-up).

## Testing and public editions

The testing target offers opening-boss/form selection, all-difficulty manual guides, a Solo paused coin/SP panel and tab-only difficulty unlock. The public target randomizes new openings, omits tools and offers optional guides only on Baby. Modified runs disable boundary saving and local records. These local build targets do not replace the old public Site. Settings toggle overhead names and room chat. Home Leaderboards shows actual local Practice records and an explicit unconnected Online boards status. [Build policy](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/TESTING_AND_PUBLIC_BUILDS.md).

Reading the Tutorial keeps the gentle first-run preset available until the profile has a local run record.
