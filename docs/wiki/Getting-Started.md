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

Both public and private rooms have a six-character code; Enter submits the code. Hosts may set an optional case-sensitive password of 4–64 characters. A lock marks protected public rooms, and joining by listing or code asks for the password. Private rooms remain absent from public discovery. Room search loads automatically and identifies each host. All seven classes, Quarantine Run, Midnight Circuit, Black Bell Pilgrimage, Grand Raid and Endless Vigil are available. Public builds choose bosses from their authored random opening pools and ordinary route progression reserves finales for the final encounter. The testing build has a separate rehearsal opener/form selector. Public Baby has an optional, closed-by-default boss guide; opening it pauses Solo. Artwork loading shows progress before the lobby appears.

Home’s **Leaderboards** entry shows this device’s Practice records and **Team records** from the selected server. Server boards use actual public-authority results, filtered by mode, difficulty, team size and week. Names entered during setup survive returning to an earlier step, and selection keeps keyboard focus.

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

Current packaging supports explicit public/testing audiences and validates the source report before compiling a fresh client; the bundled LAN authority has the same audience. This does not replace the older download linked above. The separately verified a0c8c56 local Windows review passes all three package copies and native offline/LAN/storage fixtures, including deeper copied paths. It predates the newer chat, map, waiting-room and Medic changes; the old failed font-check evidence is preserved.

A portable Windows development app bundles Electron and the same offline worker, art, music and fonts. Extract the entire issued folder and run `Grave Accord.exe`; no separate Node or internet connection is needed for solo. Profiles use `GraveAccordData` beside the app when writable and can always be exported from Profile.

The desktop **Local network** menu offers explicit Host and Join controls. Choose a port, start hosting, then create a game through the ordinary class/mode/map/difficulty setup. Share the private IPv4 address with players on the same network and keep the host app open. Guests enter that address and port, then browse rooms or join by code. Stop hosting from the LAN menu. The game never changes firewall rules. Physical second-machine LAN and manual desktop acceptance remain open.

## Developer rehearsal: testing builds only

Local testing builds include a boss selector for encounter review. Public builds choose bosses normally and do not show this selector. In a testing build, choose **New Run → Soldier → Quarantine Run → Gatehouse → Normal difficulty**. On the final review screen choose **Hollow Constable** and **Solo**, then set **Boss form** to **Standard form** or **Brutal** and press **Play**. Keeping the class and map the same helps comparison. The Constable stays **1+**, with **B** added for Brutal. Global difficulty remains separate. This choice affects the opener; later contracts follow normal progression.

[Source behavior and exact verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOSS_PRACTICE.md).

## Difficulty, revival and cover

| Difficulty | Phase shield-break event | Revival by other classes | Interior cover | Extra arena / form rule |
| --- | --- | --- | --- | --- |
| Baby | Six circles, 2 s; Standard only | 100% health | Original plus two props | Selected boss form |
| Easy | Three circles, 3 s; Standard only | 50% health | Full | Selected boss form |
| Normal | Off | 25% health | Full | Selected boss form |
| Hard | Off | Disabled | Half, rounded down | Selected boss form |
| Insane | Off | Disabled | None | Every boss Brutal |
| Hellish | Off | Disabled | None | Marked lava; every boss Crazed |

Medic revivals restore **full health + a non-stacking 20% maximum-health shield on Baby, 75% on Easy, 45% on Normal, 30% on Hard and exactly 1 HP on Insane**. Hellish forbids every revival, including Medic abilities and items. Other classes use the health values in the table. Medic can spend a self-revival charge in a team as well as Solo; other classes can self-revive only in Solo. The base allowance is one per fight plus purchased extra-charge effects, with a full two-second channel.

Passive health regeneration is reduced for every class: **25% less on Hard, 50% less on Insane, disabled on Hellish**. Deliberate healing abilities/items remain separate. [Complete current revival rules and balance limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/MEDIC_RECOVERY.md).

Both Brutal and Crazed disable the phase shield event at every difficulty. Revival uses the rescuer’s class as described above; full recovery between encounters remains. Boundary walls and temporary boss mechanics remain. Difficulty cards and final review display these rules in all fifteen locales. Hellish pits have a three-second opening tell and deal 24 contact damage per second in half-second intervals. Hellish effective boss health is 2.4× Normal after its forced Crazed multiplier. [Exact rules and verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/DIFFICULTY_AND_PHASES.md).

Insane fixes the form selector to Brutal; Hellish fixes Crazed. Lower global difficulties retain the selected opener form for rehearsal.

[Earlier Baby/Easy assistance work](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/ASSIST_LIMITS.md): ordinary Normal revival is 25%; Baby/Easy circles are six/three, channels two/three seconds, and Baby has two extra actual cover props on every map. Source/prediction/prop geometry agree; human/rendered balance review remains open.

## Class ability transformations

The seven requested class-upgrade implementation passes now add 21 behavior changes at existing utility-path depth-three nodes (six cumulative SP each). Costs, prerequisites, node IDs and the single-capstone rule remain. Both skill views show fifteen-locale help. Shared authority, finite constructs, delayed attacks and moving fields replicate to offline/online clients. [Class behavior and tradeoffs](Classes-and-Skills#purchased-ability-transformations). Current protocol 43 retains bounded older local Practice/profile migrations, including protocol 40 equipment, economy and map choices; online checkpoints remain strict. Latest Baby/Easy/Normal assistance and Hellish rules remain intact. Human/rendered/device/native-language acceptance remains open.

## Three encounter forms

Local setup offers Standard, Brutal and Crazed on lower difficulties. Insane fixes Brutal; Hellish fixes Crazed. Purple/C identifies Crazed, red/B Brutal. Difficulty cards state revival, shield, cover and forced-form rules. Ordinary revivals restore Normal 25%, Easy 50% and Baby 100%; only Medic can revive on Hard and Insane. Hellish blocks everyone. [Current rules](Modes#crazed-horizon-follow-up).

## Testing and public editions

The testing target offers opening-boss/form selection, all-difficulty manual guides, a Solo paused coin/SP panel and tab-only difficulty unlock. The public target randomizes new openings, omits tools and offers optional guides only on Baby. Modified runs disable boundary saving and local records. These local build targets do not replace the old public Site. Settings toggle overhead names and room chat. Home Leaderboards shows actual local Practice records and Team records from the selected server. [Build policy](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/TESTING_AND_PUBLIC_BUILDS.md).

Reading the Tutorial keeps the gentle first-run preset available until the profile has a local run record.

## Chat and team results

Room chat keeps its usual position while fighting. During upgrades, breaks and settings it sits beside the menu on wider screens and above it on smaller screens. Your draft stays in the same input as phases change. You can disable room chat in Settings. Sending waits for server confirmation, preserves edits and shows a clear notice for cooldowns or uncertain delivery. Retry the most recent unconfirmed message after reconnect without posting it twice. Quickly hiding/showing chat restores recent history automatically.

Open **Leaderboards** for this device’s practice records or **Team records** from the selected server. Online public-authority runs share one team result; test runs do not enter the board. After a qualifying result, the Team records button opens the matching mode, difficulty and team size. During an Endless break, the host can expand **End this run** to finish and save.

Press **C** to open room chat when you are not typing in a field. If you already assigned C to a gameplay action in your saved controls, that action keeps the key. The chat button remains available. Menus use the remaining window height when chat is open. Multiplayer keeps running behind menus; Solo pauses.

**C** now opens and closes the chat panel. Press **Enter** to start typing, or click the message field. **Esc** closes chat while typing. The lobby’s **Start run** and **Leave room** buttons occupy a separate row beneath the scrolling upgrades.

After a clear, **Boss defeated** appears while the boss’s falling sequence or final defeat pose stays visible for five seconds. A preparation message and countdown show that the next encounter is being prepared; the final fight says results are being prepared, and an optional extra-fight decision prepares the next choice. Then the next choices appear, with their full voting time. This short ending does not count as combat time. Fifteen bosses currently have full falling sequences; the other fifty-one use their existing final poses.

## Waiting for players

Choose Public or Private and press **Create room**. The waiting room shows the code and each player’s name, class and connection status. Share the code, prepare equipment in its own tab, and let the host press **Start run** when the group is ready. Guests cannot start the room. Both kinds of room have a code, and private rooms stay out of public discovery. During play, **Room code** opens the code and a copy button; online matches continue while it is open. In equipment, votes, shop and Settings, the code control sits inside the menu below its heading, clear of the countdown and action buttons. Share any password separately.

## Map choices

Choose one of the six named maps to keep it for the whole run. **Random map for this run** chooses once; **Random map each fight** chooses before each deployment and may repeat. Maps stay still while a boss falls and through the between-fight choices. The selected rule survives a boundary save.


Personal shields now share one combined capacity across starting shields, ability shields and armor plates: Baby/Easy/Normal 100% of maximum health, Hard 75%, Insane 50%, Hellish 0, rounded down. Excess shield cannot absorb damage. Hellish cannot buy or consume shield items; deployed walls remain physical cover. The HUD shows current shield/capacity. Future Tank/Heavy cap upgrades and selective attack blocking are recorded separately and are not implemented.


Base starting shield is recalculated each fight from the difficulty-adjusted capacity: Heavy 50%, Tank 100%, Soldier 15%, all other classes 0. Hellish gives everyone0. Existing starting-shield mutation bonuses can fill remaining capacity, and all sources respect the same cap. This adds no new branch or maximum-shield upgrade.

## Latest local Windows review

The earlier verified local Windows review includes the map, waiting-room, Medic/shield, player-status, password and confirmed-chat updates. Source **fe82c7e38c8fa73804678b6637815b23aceb0ce5**, build **2026.10.29-chat-confirmation**, protocol 42, passes 827 local source checks. All 1899package files match on original, fresh deep extraction and an independent Windows copy, with six actual native offline/LAN diagnostics passing, including a Japanese deep folder. It has not replaced the older published download. [Current package evidence and acceptance limits](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/windows-current-2026-10-29/package-status.json).

## Connection progress and cancellation

Loading offers **Cancel**; **Esc** also returns home. Tab keeps keyboard focus on the loading action. Room search and code lookup show what is happening, with specific version, busy-server, wrong-address, expired-code and full/closed-room errors. Back cancels pending searches. Returning to another screen cannot let an old connection overwrite it. Leaving online records or changing filters cancels its requests, while paging keeps earlier rows usable. Protocol42 and gameplay/record rules remain. [Current source evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/connection-clarity-2026-10-29) separates software and transport checks from rendered/human review.

## Host controls and passwords

The host can reveal the room password beside the code, both in the waiting room and from **Room code** during play. Eye buttons show or hide passwords while entering them. The current Session retains its entered password privately until leaving; ordinary guests do not receive it in room details.

Opening settings, chat or a guide does not pause an online match. Only the current host can press **Pause match** or **Continue match**. The pause freezes the simulation and countdowns while chat remains available. If a paused host leaves or disconnects, play resumes and a connected teammate becomes host. Returning does not automatically reclaim host controls.

**Leave room** keeps remaining teammates playing. **End game for everyone** is a separate host action in Settings and requires confirmation. Everyone sees that the host ended the match; only already-completed encounters count. Protocol43 needs a matching backend, with a bounded local Practice migration from42. [Exact source and review evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/host-controls-2026-10-29).


## Clear edges and open routes

The view leaves space for full bosses and survivors near the map edges, with the same framing between fights and during defeat. Aiming follows the displayed position. Bosses can use the upper passages again; Brass Toad takes clear hops around cover when it cannot see the target. The painted lava pit keeps its normal activation, with the extra circle removed. [Current verification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/camera-clearance-2026-10-29) separates software checks from human review.

## Current local Windows review

Local Windows reviews are bound to their exact source commit. [The Windows guide](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/WINDOWS_DESKTOP.md) identifies the latest completed package and preserves earlier reviews. Completed reviews compare every file across the original, fresh ZIP extraction and an independent Japanese-path Windows copy, then run offline and LAN diagnostics on all three. The published download remains the older October24 version. These software checks remain separate from human, rendered, device, listening, native-language and physical second-computer LAN acceptance.

## Browse the artwork

Use the left and right arrows on the home screen to switch between the main cover, the seven survivors and six map paintings. The small page buttons jump to an image. Keyboard arrows, Home and End work while the gallery has focus. Pictures switch only when you choose, and returning from setup remembers your image for that menu session. The same gallery appears in public and testing builds.

## Local-network setup stays on your current page

While Host or Stop hosting is in progress, wait for it to finish or use Back. Conflicting actions are disabled during that request. Errors leave the controls available to retry. A delayed status keeps your typed address, port and editing position. Leaving the page keeps it from changing the next screen; it does not automatically stop a local server you chose to host.
