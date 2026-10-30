# Changelog

Development build **2026.10.30-profile-navigation**, protocol 43. These entries describe the feature-branch source; the public playtest remains an earlier protocol-4 deployment.

## 2026-10-30 — Keep profile and language changes on the right page

### Profile imports you can leave safely

- Leaving Profile while a file is being read cancels that import before it changes saved progress. Old buttons and finished requests cannot redraw another page or place messages in a newer profile. Applying a profile blocks conflicting changes while Back and Export remain available.
- Valid profile files now report storage problems as saving failures, keeping the earlier bytes and a usable retry. Existing validation, exact backups, progression and unlock rules remain. Successful imports keep their notice and return focus to the current import control.

### Choose a language without losing your place

- The latest language choice wins, including switching back to English while another language loads. Leaving a page cancels its pending selection. Failed or obsolete downloads cannot replace the active catalog, reverse text direction or save an older preference.
- Language changes keep typed fields, cursor selection and focus. Loading and retry notices are translated in all fifteen languages. If the saved language cannot load at startup, the English menu stays usable with a clear notice. A failed preference save still leaves the displayed menu consistent.
- Cosmetic choices update appearance only and leave pending language choices active, including after a saved-language download failed at startup. Imported profiles explicitly apply their preferences. The real main menu, Profile controls and catalog loader run together in both regression cases.

## 2026-10-30 — Keep local-network setup responsive

### Move between pages without surprises

- Leaving Local network now ends that page’s controls and ignores its delayed responses. A slow initial status cannot replace a newer successful Host or Stop action, or redraw a page you have left.
- Your typed host address, port and cursor position survive status updates. Failed hosting requests leave the controls available to retry; pending requests prevent conflicting Host, Stop, New run and Join actions while Back stays available.

### Keep the accepted presentation

- The existing manual home gallery remains in place. The intended later idea is alternate illustrated covers like the first image; the current gallery is accepted for now. Camera clearance, pit-only lava art and the accepted corner controls remain.
- Six compiled native menu regressions reproduce the earlier failures, including the actual setup lifecycle. Local network protocols, scoring, gameplay rules and room authority are unchanged. Software checks remain separate from human multiplayer, rendered, device and second-computer LAN acceptance.

## 2026-10-29 — Browse the home-screen artwork

### Three pictures, simple controls

- Use the left and right arrows on the home screen to see the full cover, meet the seven survivors, or view the six map paintings. Page buttons jump directly to an image. The gallery changes only when you choose; it does not rotate automatically.
- Keyboard arrows, Home and End work while the gallery has focus. Arrow direction follows right-to-left languages, button names and image counts are translated in all fifteen languages, and changing pictures keeps focus and setup choices. Returning from setup remembers the selected image for that menu session. Existing cover artwork stays fully visible.

### Keep first-time play straightforward

- The main cover loads first; other existing artwork uses lazy loading. Gallery controls are removed when their menu closes, so an old page cannot change the new one. Public and testing have the same presentation. These are actual existing game illustrations, not claimed gameplay screenshots.
- Testing5244feedback says the lava looks better and characters did not get stuck near the top in that trial. This is limited positive human feedback for camera clearance, separate from complete map/device/multiplayer acceptance. The human requested testing links for direct difficulty/boss checks. Bots/story and new gameplay content remain deferred.

## 2026-10-29 — Keep characters visible and routes open

### See full characters near the edges

- A fixed camera now leaves space around the floor for tall boss and survivor artwork, with the same framing on every map and through every phase. Cursor aim uses the same camera transform; names keep their screen size. The existing corner control group stays in place.
- Bosses use physical ground clearance so the upper passages remain reachable. The three previously measured Small Wakes bodies retain their established footprint limits. Full pose/reference bounds for all66bosses and172survivor clips are checked against the camera on all36map/difficulty combinations.

### Brass Toad gets around cover

- When cover blocks the target, Brass Toad takes short clear hops along a connected route and keeps the detour until the target is visible. Every landing still locks before its warning, each hop keeps its existing duration and maximum distance, and the boss never tunnels through cover. Actual encounters reach the upper floor on all36map/difficulty combinations, including Baby Ossuary Works.
- The orange outline and extra marker around lava pits are removed in the fight and map preview. The painted pit and existing activation timing/damage stay.

### Keep review evidence distinct

- 5243feedback accepts the stable Pause/Settings corner, while reporting survivor clipping and restricted Brass Toad access. This follow-up addresses those reports; new human comparison remains open. Ally bots stay on the after-contest ideas list.
- The older source6987362Windows review passes all1899files across original, deep ZIP extraction and an independent Windows copy, plus six native offline/LAN diagnostics. It remains an exact earlier review; these later camera/route changes need a new matching package. No release replacement or deployment is implied.

## 2026-10-29 — Keep bosses on the floor and controls in the corner

### Complete boss artwork stays inside the map

- Arena limits now include the complete artwork, ground anchor, defeat poses and loading reference for all66bosses. Their spawn, routes and scripted placements use the same floor limits across all six maps and six difficulties. Ordinary player and projectile walls keep their actual map geometry.
- Independent native-alpha checks cover152art sources and758frames. The software baseline exposed726starting combinations with artwork extending beyond the floor; regression checks cover all2376boss/map/difficulty starts and edges, plus actual movement and defeat positions. This does not establish rendered or human acceptance.

### Stable game controls

- Pause/Continue, Settings and the boss guide stay together at the top corner when the boss header disappears during the defeat scene. Both public and testing share the fix.
- Limited positive5241feedback accepts the basic host controls and password eyes; multiplayer human testing remains open. Optional ally bots are saved as an idea for after the contest and are not implemented. Earlier source, Wiki, frozen previews and native packages remain preserved.

## 2026-10-29 — Host passwords and explicit match controls

### See the password when you need it

- Password entry has an eye button to show or hide the exact text being typed. The host can also reveal the room password beside the code in the waiting room and during play. Reveal buttons have translated accessible names and never submit a form.
- A successful room join keeps the entered invitation password only in that Session’s private memory until leaving. Only the current host’s UI receives the value. A newly promoted host may reveal the password they already entered; ordinary participants do not see it in room details. Plaintext stays out of shared state, listings, metadata, saves, application browser storage and logs. Server verification remains independently salted scrypt.

### Pause the match deliberately

- Online settings, chat and guides keep the match running. Only the current host has explicit Pause match and Continue match buttons. The authority rejects guest pause commands. An actual pause freezes simulation ticks, combat time, warnings, effects and intermission countdowns, and clears queued inputs. Chat and connections still work; journal leases can renew without advancing the game.
- If a paused host leaves or disconnects, play resumes automatically and host controls pass to a connected teammate. A returning former host does not take control back automatically. Solo keeps its existing menu pause behavior.

### Choose whether to leave or end for everyone

- Leaving a room keeps remaining teammates playing. The host may instead choose End game for everyone and confirm it. All connected players receive an explicit host-ended results screen, the pause is cleared and new joins are closed. No boss clear or campaign victory is invented; only already-earned results can qualify.
- Protocol43 requires matching clients and server. Known issued protocol42 local Practice saves retain map/build/economy identity through the complete restore validator; authoritative server checkpoints stay version-strict. Prior frozen previews, packages and raw reports remain preserved. Software/transport checks are separate from human/rendered, device, listening, native-language and WAN acceptance.

## 2026-10-29 — Clear connection progress and a working Cancel action

### Leave loading without getting stuck

- Loading offers Cancel, and Esc returns home. Keyboard focus stays with the loading dialog. Cancelling stops asset/audio waiting, worker startup, server-health retries, room searches, queued admission and pending SDK join HTTP/socket work. An old connection or asset callback cannot replace or update a newer screen.
- The server-waking notice uses plain progress text instead of directing players to a covered Pause menu. Search and code lookup show their current step. Version mismatch, request throttling, wrong server addresses, expired codes and full/closed rooms retain useful guidance. New notices are source-backed in all fifteen languages.

### Keep room and records requests with their screen

- Leaving Join Room closes its temporary searches and code lookups. Retry preserves name/class choices. A correct empty room list is distinct from a failed search; no error claims the server has zero rooms.
- Leaving the online records tab, changing filters or leaving setup cancels pending board/roster requests. Loading another board page keeps earlier rows usable. Repeated opens cannot issue simultaneous duplicate roster pages. Scoring, server record storage and gameplay rules are unchanged.

### Compatibility and review limits

- The client remains protocol42; this pass does not change gameplay, save format, server rules or chat receipts. Existing frozen builds keep their exact source and remain available separately.
- Actual delayed HTTP, stalled WebSocket, admission cleanup, closed-room and reconnect fixtures plus compiled native menu/controller checks verify software behavior. They are separate from rendered/human, listening, native-language, device, WAN and final balance acceptance.

## 2026-10-29 — Keep chat drafts until delivery is confirmed

### Know whether a message was sent

- The chat box keeps its text until the room server confirms the message. Sending, sent, short cooldown, unavailable/offline, invalid text and uncertain delivery have plain notices in all fifteen languages. Rejected or unconfirmed drafts stay editable. A confirmation never erases edits made while sending, even when the player edits back to the original wording.
- Unfinished IME composition cannot submit the form, and Esc during composition leaves chat open. The native field no longer cuts Unicode text off at160UTF-16 code units; the existing160-grapheme/512-byte server policy still applies. Combat/menu placement, C toggle, Enter-to-type, Esc-to-close and custom gameplay bindings remain.

### Retry without a second post

- Each submitted message has one request identity. The room authority confirms success or gives an explicit rejection. Repeating the most recent unconfirmed request after a timeout or reserved reconnect returns its original confirmation without another broadcast. There is no automatic message resend.
- The server keeps up to16accepted request receipts per participant alongside the existing50-message ephemeral room history and1.5-second sender limit. They are memory-only, removed when that participant leaves and never added to game saves or durable records. One client request may be awaiting confirmation at a time.
- Turning room chat off and back on quickly now refreshes recent history once the existing five-second history limit permits it. One bounded retry is cancelled on disable, disconnect or leave; another player no longer has to post to make history return.

### Compatibility and review limits

- Protocol42 requires a matching backend. Known issued protocol41 local Practice saves pass the complete existing restore validator and retain map policy, equipment, economy and identity. Prior local migrations and strict server-checkpoint compatibility remain.
- This pass is verified through native controller/rule and actual local transport fixtures, including deliberately dropping the confirmation for an already accepted message and retrying after reconnect. It is separate from human/browser, listening, native-language, device and WAN acceptance. Earlier previews and failed evidence remain preserved.

## 2026-10-29 — Clear player status, room invitations and password-protected rooms

### Know what happens after a boss falls

- The five-second Boss defeated beat now says Preparing the next encounter with a visible countdown. The final fight says Preparing your results, and an optional extra-fight decision says Preparing the next choice. The existing fall, sound cue, reward timing and full vote duration remain.
- Cobble Crab and the two other Small Wakes bosses now deploy and move within bounds derived from every painted animation frame. Their existing collision radius remains unchanged, and the defeat pose keeps the actual final position. This addresses Crab artwork crossing Triage Yard’s floor edge while its collision anchor was still inside.

### Read the team and your character at a glance

- The lower-left player card uses actual character headshots, independent health and shield bars, separate coins/skill-points/ammo counts and wrapping name/class/build text. Combat chat sits above the measured card height. Waiting-room setting labels and roster colors receive stronger contrast; the accepted Waiting room / Prepare equipment distinction stays.
- Room-code controls move into normal menu flow during equipment, threat/mutation choices, the shop and Settings, keeping countdowns and action buttons separate. The random-map options use a filled six-map picture collage in both the option and large preview.

### Choose an optional room password

- Hosts can set a case-sensitive 4–64-character password when creating a public or private room. Protected public rooms show a lock, and entering by listing or code prompts for the password. Wrong-password retry preserves the chosen name/class and asks again without retaining the old secret. Public rooms can still be open; private rooms require their code as well as any configured password.
- The authority enforces passwords with independent salted scrypt verifiers. Only the protected/open flag appears in listings and welcome messages; plaintext and verifiers stay out of game state, metadata, saves and the application’s browser storage. A reserved reconnect uses its existing identity without asking again.

### Review boundaries

- Protocol41 requires a matching backend. Exact known protocol40 local Practice saves preserve equipment, economy, map policy and run identity; signed server checkpoints remain strict. Both public and testing builds share these changes.
- Software, transport and native-asset checks are separate from rendered/human, physical-device, listening and native-language acceptance. Earlier previews, original artwork and failed evidence remain preserved. Future shield-cap branches and selective blocking remain notes only.

## 2026-10-29 — Distinct Medic revivals and clear difficulty recovery rules

### Medic has a recovery role in Solo and teams

- Revival health depends on the rescuer. Medic returns players at full health plus a non-stacking shield worth 20% of the revived player’s maximum health on Baby, 75% health on Easy, 45% on Normal, 30% on Hard and exactly 1 HP on Insane. Other classes retain Baby 100%, Easy 50% and Normal 25%, with no revives on Hard or Insane. Hellish forbids every combat revival, including Medic abilities and injected old supplies.
- Medic can spend a self-revival charge in a team as well as Solo. The base allowance is one per encounter; purchased extra-charge effects still apply. Self-revival needs a complete two-second channel, resets when released and consumes one charge on success. An all-downed team stays in the fight only while someone actually has an eligible recovery. Ordinary classes keep Solo-only self-revival. The next fight resets the allowance.

### Difficulty reduces passive regeneration for every class

- Hard reduces passive HP regeneration by 25%; Insane by 50%; Hellish disables it. Baby, Easy and Normal retain their existing rates. Deliberate healing abilities and consumables remain separate and retain their existing difficulty healing modifiers. Medic does not receive a special exemption from regeneration penalties.
- Difficulty cards state the ordinary and Medic revival values and regeneration penalty. Downed players receive an accurate self-recovery or wait-for-a-teammate/Medic message, with remaining self-revival charges synchronized to both peers. Revive-kit availability and descriptions match the current class and difficulty, including literal 1 HP on Insane.

### One personal shield limit

- Personal shields now share one combined capacity across starting shields, ability shields and armor plates: Baby/Easy/Normal 100% of maximum health, Hard 75%, Insane 50%, Hellish 0, rounded down. Excess shield cannot absorb damage. Hellish cannot buy or consume shield items; deployed walls remain physical cover. The HUD shows current shield/capacity. Future Tank/Heavy cap upgrades and selective attack blocking are recorded separately and are not implemented.
- Base starting shield is recalculated each fight from the difficulty-adjusted capacity: Heavy 50%, Tank 100%, Soldier 15%, all other classes 0. Hellish gives everyone0. Existing starting-shield mutation bonuses can fill remaining capacity, and all sources respect the same cap. This adds no new branch or maximum-shield upgrade.

### Current review boundaries

- Protocol40 requires a matching backend. Exact known protocol39 local Practice saves keep their map choice and progress; trusted online checkpoints remain strict. The preceding 0feaf34 map/lobby checkpoint passed 795 software checks. Its map artwork, stable map choice, five-second defeat moment and waiting-room changes are included in this build.
- These are starting balance values under the player’s requested policy. Automated rule/network checks do not establish final class balance, human combat readability, native-language quality, sound or physical-device acceptance. Earlier previews, original art and failed evidence are preserved.

## 2026-10-29 — Clear waiting rooms, stable map choices and painted arenas

### Give each boss clear time to finish

- The Boss defeated moment now lasts five seconds and plays a clear sound cue once. Fifteen authored falls and fifty-one final poses retain their existing coverage. Full voting time, combat scores and once-only rewards remain.
- The active map now stays in place through the fall and every intermission, until the next encounter actually begins. This fixes the floor changing underneath a fallen boss. The defeated boss keeps its authority position.

### Choose a map and know what happens next

- An explicitly selected map stays fixed for the whole run, including the optional extra fight. Random map for this run picks once; Random map each fight picks on deployment and may repeat. These choices survive saves and remain synchronized online.
- All thirty-six map/difficulty combinations receive painted cover matching their actual collision rectangles. Baby’s additional props no longer sit inside flat outlined blocks. Hellish lava uses stone-and-ember art with its existing warning and damage timing. Five maps gain themed painted surroundings; the original readable floors and all physical footprints remain.

### Meet the team before the run

- Public and private rooms open a Waiting room with player names, classes, connection status, host marking, chosen rules and a copyable room code. Prepare equipment is a separate tab. The host alone presses Start run; guests can prepare while waiting. Solo preparation has a clear equipment heading.
- Both public and private room codes work during play. Room code opens a small disclosure with copy support and a manual-copy fallback. Opening it blocks gameplay input; online simulation keeps running under the existing notice.

### Compatibility and review

- Protocol39 requires a matching backend. Exact known protocol38 local Practice saves migrate with the originally chosen map, while online checkpoints remain strict. Existing controls, chat placement and toggle, and Pause labels remain.
- Native art, alpha, packing and geometry checks and a thirty-six-layout static composition review are separate from browser, human, device, language and listening acceptance. Earlier candidates and their evidence remain preserved. Chat delivery confirmation is a separate follow-up.

## 2026-10-29 — Let each boss defeat finish before the next choices

### A clear ending to each fight

- A shared two-second ending beat now keeps the boss visible before votes, the optional extra-fight offer or final results appear. The top banner says Boss defeated and names the defeated boss in the selected language. The current boss music continues through the beat.
- The fifteen existing falling sequences complete within the beat; the other fifty-one bosses show their existing final defeat pose. No new fall artwork is claimed. Reduced motion keeps the settled pose and static banner.
- Combat stops and rewards bank once at the real clear. The ending beat does not add to combat score time, and the next voting or offer window still receives its full duration. Both multiplayer peers follow the same server clock. Offline pause continues to freeze that clock.
- Saving during a fall preserves its remaining time and position in Solo saves and trusted room checkpoints. Existing saves still load.

### Preserve accepted polish

- The player confirmed that C opens and closes chat and that Start run and Leave room stay clear of upgrades. Enter starts typing, Esc closes, and saved custom bindings, drafts and scroll position remain. The old rankings notice stays removed. Pause labels and behavior remain unchanged.
- Current fall/pose coverage, final result banking and real two-peer timing have focused software checks. Full local/source-CI/frozen-preview/Wiki evidence remains scoped separately from human/rendered/device/language/listening acceptance. The older a0c8c56 Windows review remains separate.

## 2026-10-29 — Toggle chat and keep lobby actions clear

### Keep upgrades above Start and Leave

- The lobby now has a separate action row outside the scrolling upgrade area. Upgrade content is clipped to its own scroll region, and its scroll position survives purchases. Start run and Leave room keep their own space. The menu still uses the remaining screen height.
- Very short windows allow outer scrolling instead of forcing the game controls beneath an overflowing upgrade area. The accepted fight chat placement remains unchanged.

### C opens and closes the panel

- C now toggles room chat. Opening it with C focuses the panel, so pressing C again closes it. Enter puts the cursor in the message field; Esc closes chat while typing. Clicking the chat button still focuses the message field directly. A short keyboard hint is translated in all fifteen languages.
- Typed C, copy shortcuts, IME composition, repeated keydown and existing custom C gameplay bindings keep their normal behavior. Drafts, history and focus stay in the same chat instance across phase changes. Pause labels and behavior stay unchanged at the player’s request; the old rankings-unavailable message stays removed.

### Evidence and scope

- The preceding db9172c chat-space source passed782local tests, both exact-source CI runs, two frozen preview transport checks and the exact Wiki18page/34image verification. Human feedback accepted the expanded space but found overlap with the lobby actions and requested C close as well as open; this follow-up addresses both.
- This follow-up has separate local/source-CI/preview/Wiki receipts under reviews/chat-toggle-2026-10-29. Rendered/human/device/native-language acceptance remains separate. The sealed a0c8c56 Windows review predates these later chat fixes. No hosted deployment, global-ranking acceptance, main merge or contest submission is claimed.

## 2026-10-29 — Open chat with C and give upgrades the available space

### Chat and upgrade space

- Press C to open and focus room chat during multiplayer play or between fights. A small C hint appears on the chat button. Typing in fields, copy shortcuts, repeated keydown and IME input are left alone. An existing custom gameplay binding to C keeps its assigned action.
- When chat opens above the upgrade menu on a narrow screen, the menu now fills the actual remaining window height. The upgrade and skill areas can grow with it instead of using a fixed fraction that left unused space. Wider screens retain chat beside the menu and fights retain the accepted chat position.

### Remove the old rankings message

- The old message saying verified online rankings are unavailable is removed from the active menu flow. The records page explains that team results belong to the selected game server; local records say they are saved on this device. Testing-only details use the existing testing-build label.
- The multiplayer pause report was clarified with the player: shared matches continue while menus are open, as the notice says. At the player’s request, Pause/Paused labels and multiplayer pause behavior remain unchanged. Actual public and testing Solo workers freeze their clocks/state and resume without catchup in focused checks.

### Keep the reviewed checkpoint separate

- The preceding a0c8c56 smooth-rooms source passes780local tests and both exact-source CI runs, with Wiki18pages/34images/public hashes verified. All three Windows package copies and six actual native offline/LAN/storage fixtures pass, including273/270character copied font paths. Its ZIP is preserved and does not contain this newer C/layout/notice follow-up.
- Current follow-up source needs its own full gate, exact-source CI, frozen public/testing previews and Wiki receipt. Rendered/human/device/native-language/listening, shared hosted global rankings/recovery and coordinated release acceptance remain open.

## 2026-10-29 — Clear chat placement and working team records

### Keep chat out of the menus

- During fights, chat keeps its established position. During upgrades, voting, deployment, results, settings and the boss guide, chat has its own space beside the menu on wider screens and above it on smaller screens.
- The same chat form moves between views, preserving its draft, message history and keyboard focus across purchases, settings and phase changes. Disabling chat or playing offline cannot leave movement blocked.

### Replace the empty online-board page

- Team records now come from the game server, with one shared team rank, filters for all five modes, difficulty, peak squad size and week, expandable participant history, and bounded pages. Records use a persistent SQLite file; room IDs, private codes, reconnect tokens and session IDs never enter public records.
- Only the public game authority can write results. Solo practice, testing servers, modified runs, zero-duration clears and deadline violations cannot enter these boards. Scoring uses exact integer arithmetic and competition ties. Departed participants retain credit; survival is measured before victory healing. The normal campaign result freezes before the optional secret fight.
- Endless results rank completed bosses, last-clear combat time and the exact last-clear damage ratio. Failed-fight duration remains visible without improving rank. During a break the host can choose End this run; guests and combat-time requests cannot end it.
- A failed save leaves the game playable and retries the same frozen result while the room stays open. The results screen links directly to the matching team board; loading failures offer Retry. Expanding a record or loading more keeps existing details in place. Desktop LAN hosting uses its own local persistent records file.

### Verification and publication boundaries

- Focused scoring, persistence, deep-path, history paging, chat DOM and real two-peer/restart checks pass, as do the broader joining/reconnecting/authority/purchase/chat regression checks. The full local gate and exact-source CI remain separate recorded checks.
- The corrected c0a6d9b Windows review package now passes all original/fresh-deep-extraction/ordinary-deep-copy member hashes and six native offline/LAN fixtures, at277/274character copied font paths. Its earlier failed portable-review archive remains preserved and unaccepted.
- Team boards are scoped to the selected game server. Shared hosted global rankings, hosted recovery, WAN/endurance/capacity and rendered/human/device/native-language/listening acceptance remain open. The existing protocol4Site and immutable protocol13Windows download are unchanged. No main merge or contest submission is claimed.

## 2026-10-28 — Load portable files from deeper folders

### Keep copied Windows builds usable

- The first current Windows review package matched every file after ZIP extraction and ordinary copying, but its native offline test could not load a font at the deeper paths. The original passed, and all three LAN checks passed. That package remains preserved and is not accepted as portable.
- Packaged local files now stream from Node filesystem reads through the existing secure protocol. This avoids the failing Chromium file-URL path while retaining resolved-path containment, method restrictions, content security policy, correct module/font/media MIME types and nosniff. HEAD responses keep their byte count and have no body.
- Tests read exact font bytes past260characters and check module/style/JSON MIME, security headers and HEAD. The replacement still needs its own native original/extraction/copy checks; software checks do not establish rendered, listening, physical-device or human acceptance. Gameplay, controls, rewards, economy, saves, art and music remain.

## 2026-10-28 — Matching Windows client and LAN builds

### Build from the verified source

- Windows packaging requires a passing report that matches the current runtime and source/test snapshot. It refuses a dirty checkout, builds a fresh public or testing client, verifies its menu/worker audience and records the exact source and client reports inside the new package. Older packages remain preserved.
- The package verifier checks every client member against its own embedded report, separately from the original source gate. The default package audience is public; testing packages must be chosen explicitly. This prepares review artifacts and does not replace the existing Windows download or hosted browser game.

### Keep local network play consistent

- The bundled LAN authority uses the same public/testing audience as the client. Public LAN rooms reject direct rehearsal-opener requests, while testing LAN retains its selector. Existing input, combat, save, economic and admission rules remain.
- The portable read-me uses plain first-run, shop and local-network instructions. Native package, archive/extraction/copy and actual utility-process fixtures are separate evidence from manual rendered, human, listening, language, device and physical second-computer LAN acceptance.

## 2026-10-28 — A readable recap and named abilities

### Understand how the run ended

- The end screen separates bosses defeated, personally credited clears when they differ, rescues, combat time and class experience from this run. It explains a timeout or a solo/squad defeat in plain words and identifies the mode, difficulty and class.
- Testing-modified runs show zero class experience and explain that they do not count toward saved progress or records. A survivor who banks a campaign and leaves the optional extension sees the secured campaign count/time. Existing rewards, saving, eligible participation and secret-extension rules remain.

### Show the right hint at the right time

- Countdowns appear only on automatic timed votes, shop, deployment and the secret offer, with a Time left label. Lobby and end screens no longer show a misleading 0:00.
- Keyboard HUD hints name the actual class abilities beside saved bindings and cooldowns. Touch actions show those same names instead of Q/E letters. Existing input actions, ability timing and charge counts remain. New recap copy covers all fifteen locales, and shared presentation applies to public and testing builds. Rendered, human, native-language and physical-device review remains open.

## 2026-10-28 — Plain words and clearer choices

### Know what to choose

- The first-run prompt now says New here? and explains the ready-made gentle Solo settings in plain words. Tutorial uses an open book, Join room uses a doorway and arrow, and Profile, records, resume and local network use matching familiar icons. The small header now says Play solo or with friends; the old motto remains in the language files for possible later story use.
- Choosing a mode shows the actual five, ten, sixteen or three boss fights, or an endless loop, with the authored estimated duration. Fight counts mark the mode buttons; the map preview stays on the map step. Mode descriptions explain run length and starting coins/skill points directly in all fifteen locales.

### Keep the menu clear

- Baby, Easy, Normal, Hard, Insane and Hellish each have a distinct drawn icon alongside their names and existing assistance descriptions. Earned difficulty unlocks and all combat rules remain.
- The public setup footer no longer shows development-build details, and the public mode screen omits its development notice. Testing builds keep their build information and tools. Both builds share the same presentation improvements. No new boss, map, mode, weapon, skill, bitmap or music is added.

## 2026-10-28 — A full cover, a clear Tutorial and readable gear

### Explain the first run

- The home page now says what players do: dodge attacks, defeat bosses and grow stronger, solo or with friends. Hold the line. Remember their names. remains a small atmospheric brand line, with no name-memory mechanic or new story mode implied.
- The complete original 1672-by-941 cover is framed at its natural ratio on desktop and compact screens. Fixed-height cropping and the fading overlay are removed; the illustration itself is unchanged. The home entry and manual tutorial are consistently named Tutorial in all fifteen locales.
- Reading the Tutorial keeps the gentle preset available until a validated local run exists. This uses the existing profile records and adds no progress flag or profile schema change.

### Read the existing loadout before spending

- The loadout has clearer coin and skill-point summaries and a short explanation of what each currency buys. Weapon, upgrade and supply tiles expose their names and actual prices, while the equipped weapon is labeled. Skill node geometry, the default classic tree, balances, purchase guards and earned progression remain.
- Tutorial control captions have readable dark text on the parchment panel. No control scheme, shop economy, combat authority, damage, skill, boss, map, mode, music or bitmap was added or changed. Native-language, rendered and physical-device review remain open; automated checks have their own exact source identities.

## 2026-10-28 — First Watch: a clearer public welcome

### A gentle way into the existing game

- The home screen introduces the encounter loop and offers an optional Start gently preset: Soldier, Quarantine Run, Gatehouse and Baby in Solo, with a separate confirmation before play. The full New run setup remains available. The four-page controls guide is now manual instead of opening over the first visit. Local Practice records are named directly on Home and labeled as stored on this device.
- Class, route, map, difficulty and room-choice buttons retain keyboard focus after selection. Setup headings receive focus on navigation, typed names survive returning to an earlier step, and room codes can be submitted with Enter. Existing remapped controls, earned unlocks, profiles, saves, public random boss progression and optional Baby-only boss guides retain their roles.

### Read the arena and choose a pace

- All six opening arenas use their existing paintings with a fitted playable footprint, distinct survivor/boss markers, cover and lava outlines, a translated legend and painted thumbnails. The preview uses actual selected-difficulty geometry. Map selection explains that later arenas follow the chosen route.
- Difficulty cards explain the experience in plain language; the selected difficulty exposes its exact cover, revive, shield and forced-form rules plus health/damage/speed multipliers. New welcome, map, difficulty and loading copy covers all fifteen supported locales; native-language and rendered review remain open. First-load artwork progress is visible, with a specific retry message if artwork fails to load.

### Existing chemistry reads as an eruption

- Mold Alchemist catalytic reactions keep their original radius, lifetime and damage. The violet warning has an angular center, followed by a local shock ring and bounded starburst. Reduced motion uses a static boundary and burst shape. No new attack, projectile, mechanic, bitmap, soundtrack or authority rule was added.
- This is a presentation checkpoint. Roster 66, ordinary additions remaining 85, original quality 12 of 60 with 48 remaining, General mobility 0 of 1 and whole-boss human acceptance zero are unchanged. Double Dash/Sprint and content expansion are deferred during public polish. Automated and static component evidence remain separate from browser, human, listening, native-language and physical-device acceptance.

## 2026-10-28 — Mold Alchemist: Crazed distillation and reflux

### Chemical apparatus changes the Crazed fight

- Crazed adds conical distillation columns while its original acid/alkali/catalyst and vapor recipes continue. PhaseI sends two clouds down a fixed lane; phaseII re-aims three times. PhaseIII has two staggered columns with two clouds each. PhaseIV sends three each and draws the last cloud back toward its column as reflux. Each complete route receives a fresh1.8-second warning.
- Aerosols pass above masonry, hurt a survivor at most once per cloud and apply a shared0.7movement multiplier while inside. Their analytic locked route drives authority, prediction and hostile drawing. Counts are bounded chemical structures, with no generic bullet/laser duplication, extra boss health, base damage increase or new instant-kill attack.

### Mix coolant to control the apparatus

- Actual acid/alkali neutralization beside a column cools it and stops future or still-pending releases. Already emitted clouds keep their own paths until natural expiry or coolant contact. Contact condenses a cloud, spending the coolant after0.9seconds of grace; repeated puffs make that shelter a finite resource. Columns are chemical apparatus and cannot be shot.
- Existing warnings, original phase ownership and cleanup remain. Normal/Brutal chemistry, all base combat/phase orders, fixed grade3--, selected walking/action art and individual music remain. The closed manual guide includes all four Crazed stages and counterplay in fifteen authored locales, with native-language/rendered review open.

### Evidence and next work

- An issued/current owner comparison found identical Normal/Brutal movement, cue timing, recovery and damage over240legal non-Crazed cases/216000ticks. The first408-case actual-Game candidate sample completed734400ticks with1008columns/2252aerosols/235refluxclouds/723condensations/41cooledcolumns and73352recipe-overlap ticks; peak4aerosols and zero generic hostile shots. Exact current-runtime final probes and full local/CI evidence are recorded with the checkpoint. Controlled samples do not establish human clears, every route or final balance.
- Known issued protocol37/content6bf9b3f3 local Practice/profile state migrates strictly to38. Roster66/ordinary deficit85 and original quality12of60/48remaining stay unchanged. The earned-SP General mobility branch with Double Dash/Sprint remains next work, alongside broader roster/quality, hosted recovery/rankings, WAN/endurance/device and coordinated release gates.

## 2026-10-28 — Bellringer: a thrown clapper and a warned return

### Standard has more room to respond

- Standard retains its two/three/four-front phase scores. The fixed opening widens from35to46degrees, beat spacing increases from0.8to1.05seconds and its primary clapper reach falls from340to260units. Standard clapper spacing increases from1.7to2.05seconds. Fixed grade3-, base health/damage/deadline, attack identities, music and selected art remain.

### Advanced forms gain a physical decision

- Brutal adds one chained-clapper throw during each primary score. Its real cover-clipped lane locks for a full1.3-second warning. Only the moving head hurts; the thin chain is harmless. After landing it rests, then gives a fresh1.2-second return warning. Shoot the white cracked head during that warning to break the return, or leave its returning path. Each travel leg hits a survivor at most once.
- Crazed inherits the throw with65head health instead of45 and keeps its concurrent responding bell, reply fronts and separate clapper source. Already committed throws and returns keep their original geometry, damage and deadlines across phase entry. Genuine weak-point breaks, stagger, natural expiry and encounter cleanup retain their roles.

### Evidence and remaining work

- Complete-score samples cover all408map/difficulty/requested-form/legal-phase cases, with336advanced throws and10350return/peal overlap ticks. Shared contact/render geometry, actual Soldier projectile breaks, real two-peer head/return replication, strict local migration and all-boss phase carryover have separate checks. These are software evidence, with rendered/human balance acceptance still open.
- Known issued protocol36/content6f97c9a4 local Practice/profile state migrates to37; foreign/online state remains strict. No new roster or quality credit:66identities,85ordinary additions and48original quality passes remain. Stronger themed Alchemist Crazed and the requested earned-SP General mobility branch (Double Dash/Sprint) are next work. Hosted recovery/rankings, WAN/endurance/device and coordinated release gates remain open.

## 2026-10-28 — Committed boss attacks survive phase changes

### The warning still means what it showed

- Changing phase keeps already warned and released attacks alive on every difficulty. Generic fans/zones, in-flight shots, queued advanced repeats, common pressure, custom scores, live weak points, terrain and summons finish through their existing authority. Visible phase cues still appear immediately, while new casts wait through the shared1.5-second grace.
- Mold, Bellringer and Matron retain the phase that issued each committed score, including child reactions, peals and brood speeds. Warden finishes its existing lantern clock; deferred rest cannot wrap into a hidden attack while walking. Temporary glass needles, roots and entry-boss cues expire individually instead of a later cast erasing their dependencies.
- Baby/Easy phase assistance blocks new casts while old attacks finish. Completing the shield channel still earns its actual interruption/reward; breakable weak points and normal expiry still work. Boss defeat and encounter exit clear all owned work. This pass adds no health, damage or projectile multiplier.

### Evidence and next work

- Paired actual-Game phase tests cover all66 identities, global difficulties, effective forms and legal boundaries at warning/release/travel times. Focused regressions cover child effects, real health loss, weak-point hits, movement prediction, minions, shield rewards and actual owner/observer replication. Current full-suite and exact-source evidence are recorded with the checkpoint; simulations do not establish human clears or final balance.
- Known issued protocol35/content7266df25 local Practice/profile state migrates strictly to36. Foreign/online state remains strict. Roster66, ordinary deficit85 and quality12/60 with48remaining are unchanged. All existing art and music remain.
- Latest5206 feedback finds Bellringer pressure sufficient, possibly too high for Standard; a separate calibration and distinct Brutal mechanic are pending. Mold Alchemist Crazed tuning and the newly requested shared General mobility branch (Double Dash/Sprint) remain pending. Broader roster, quality, hosted recovery/rankings, WAN/endurance/device and coordinated release work remains open.

## 2026-10-28 — Bellringer: overlapping peals and aimed clapper counterpoint

### Pressure at the right range

- Bellringer now approaches a marked survivor instead of taking a lateral wandering route. The body-clear path is harmless and warns before walking. After arrival, Paired Knell uses two overlapping outward fronts and a separately warned aimed clapper sector. Procession uses three peals and two clappers; Counterstroke interleaves outward and inward fronts. Base grade3-, health, damage, deadline, individual theme and all existing art remain.
- Clapper sectors lock their source, angle and reach for a full1.2-second tell, then swing for0.3seconds. Each swing and travelling ring hits once. Step out of the marked sector or dash; ring openings stay fixed. Newly aimed later clappers require movement rather than standing in one opening for the whole score.

### Advanced forms play together

- Brutal layers four to six peals with two or three clapper swings. The old exclusive silent hold is replaced by concurrent fronts. Crazed keeps that primary score and adds three or four reply fronts plus its own clapper from a deployed bell while the main boss continues attacking. Both sources receive full warnings and share a real clear-floor opening. This is a new interaction and timing burden, not a health increase.
- Actual toll, reply and clapper activations now emit three distinct bounded metallic cues through the existing effects-volume/audio-unlock gate. The sixty-six existing boss themes remain unchanged. Native listening and rendered review are open.

### Evidence and pending feedback

- The actual-Game matrix completes408 scores/145894ticks across all maps/difficulties/forms/phases:3684full path vertices,21177active walk ticks/zero sampled stalls,2400body-clear opening witnesses,66088multi-front ticks,27692primary/reply overlap ticks and9396clapper/front overlap ticks. Peak10fronts/12cues andzero generic hostile projectiles. These stationary invulnerable samples do not prove personal clears, every human route, final balance, performance or device acceptance.
- Known issued protocol34/content94552a80 local Practice/profile state migrates strictly to35. Other known migrations and strict online/signed boundaries remain. Roster66/ordinarydeficit85 and quality12/60 with48remaining are unchanged. The interrupted Stitchwright walk candidate is preserved in the workspace without integration or quality credit.
- New human follow-ups remain pending: let already warned/released attacks finish across phase boundaries on every difficulty, and give Mold Alchemist a stronger themed Crazed step. The user praised Alchemist as the first truly unique encounter; Counterpoint leaves its current laboratory unchanged. This pass does not claim either follow-up is implemented.

## 2026-10-27 — Bellringer: procession, counterstrokes and responding bells

### Acoustic techniques define the phases

- Single Toll sends one outward gapped sound front. Procession walks a connected body-clear route before tolling from a new locked origin. Counterstroke begins inward, then answers outward after a fresh tell. Advanced Carillon uses outward, inward and outward. Every travelling front locks its origin and 35-degree opening; each hits once. Base grade 3-, combat, 120-second deadline, authored attack definitions and individual theme remain.
- The pale procession line is harmless. Read inward arrows, the opening marker and actual source. Keep enough distance for your whole body to fit, or dash across the front. Ring warnings are 1.1 seconds outward and 1.5 inward. Generic Bellringer spirals and common variant bullet/laser pressure are replaced by the owned acoustic sequence.

### Advanced forms change resonance

- Brutal adds counterstrokes and pauses outward waves in a harmless silent hold. The marked opening retunes by sixty degrees during silence; a fresh 1.2-second release warning precedes resumed motion. Cross during silence or follow the newly announced opening. Contact state and first-release timing remain authoritative.
- Crazed retains that hold and adds a separately marked responding bell. Its origin and opening lock before a 1.6-second tell. The primary remains harmless until the response completes and its own fresh release warning expires; at most one front is dangerous at a time. This adds a source/response relationship rather than another generic projectile spray.

### Drawn walking and verification

- Eight newly drawn walking poses join the pixel-exact original eight action frames in a sibling atlas. The actual metadata-driven URL registry loads that sixteen-frame image. One scale and fixed row anchors preserve within-row gait shifts. Exact built-in imagegen request, native return, bindings and independent full-RGBA reconstruction are retained. Full directional, rendered and human gait acceptance remains open.
- The actual-Game matrix completes 408 acoustic scores across every map/difficulty/requested form/effective phase, checking 2,073 full path vertices and 1,482 body-clear local opening crossings. It observes one dangerous front at a time, no generic hostile projectiles and no sampled walk stalls. Controlled/invulnerable samples and real-network tests remain separate from personally played clears and final balance.
- Fifteen locales contain four phase names, response hints and advanced help. Exact known issued protocol-33/content-0d8d0df4 local Practice/profile state migrates strictly to34; older known migrations remain and online/signed boundaries stay strict. Roster stays66, ordinary deficit85. This is original quality implementation12/60, with48 remaining and whole-boss human acceptance open.

## 2026-10-27 — Alchemist laboratory: aim, mix, cool and quench

### Chemistry shapes the fight

- Human comparison at frozen 5200 found the old reactions too weak and the green cleared vials purposeless; phase/form differences mostly looked like more bullets and lasers. Alchemist now targets survivors with fully marked acid/alkali flask landings while walking. Titration teaches mixing, Distillation adds a vapor bank, Thermal Runaway adds pressure vessels, and advanced Fractionation sends two independently warned vapor banks.
- Acid amber triangles and alkali blue squares both harm and slow. Bait an opposite throw near an existing pool, then leave: mixing clears reagents into pale coolant. Coolant visibly opens a real gap in vapor and cools nearby pressure vessels before rupture. It is a reaction product rather than a pickup. Landings warn 1.4 seconds, vapor 2 seconds, and rupture has a separate 1.5-second tell. Shared pool damage remains one hit per half-second.

### Brutal and Crazed change the reactions

- Brutal matching-reagent pools couple into two timed eruptions. Neutralizing either endpoint before the first eruption cancels the pair. Crazed adds a violet catalyst: coolant quenches it and is spent after a short grace; unmixed reagents create a fresh warned eruption, while bare ground receives a catalyst pool. Advanced forms also have more pressure vessels, retaining the shared core techniques.
- Alchemist no longer runs generic bullet fans, vial-needle sprays or shared Crazed laser pressure. Its danger comes from aimed chemical placement, vapor, pressure and reagent interactions. Projectile multipliers still apply to the game’s projectile-bearing techniques; every boss does not need to fire bullets. Future boss quality passes follow this theme-first principle.

### Drawn walking and precise evidence

- Eight actual walking poses are newly drawn from the existing Alchemist identity. A sibling sixteen-frame atlas preserves the original eight action frames pixel-for-pixel and adds the walk. One scale and fixed row anchors preserve gait offsets. Exact request, native return, portable bindings and an independent full-RGBA reconstruction verifier are included. Full directional, rendered and human gait acceptance remain open.
- A full actual-Game matrix found an Ossuary/Baby vessel too far from the first neutralization because small-body cover placement and reagent placement differed. Vessels now reserve reagent-sized working clearance, with an actual-Game cooling regression. A separate stationary catalyst assumption was corrected: explicit baiting witnesses verify both quenching and eruption rather than expecting an automatic benefit. Failed and corrected evidence is preserved.
- Fifteen-locale names/help, shared prediction and strict known issued protocol-32 local Practice/profile migration to33 are implemented. This revises quality implementation eleven, with no roster or extra quality credit: 66 identities, 85 ordinary additions and 49 original quality implementations remain. Human/device/native-language/listening/final balance and hosted/release gates stay open.

## 2026-10-27 — Mold Alchemist: cultures, catalysts and decanting returns

### Three distinct Standard reactions

- Mold Alchemist now walks a connected body-clear mixing road and grows up to three numbered cultures. Pure Culture uses pools; Catalyst adds one moving reaction; Decant sends a separately warned return that drains reached cultures. Each reaction locks its full connected path and warns for 1.5 seconds. Drained circles stop damage and slow. Base grade 3--, health, damage, timer, authored attack definitions, existing art and individual theme remain.
- Culture pools warn for 1.3 seconds and share one floor hit per survivor per half-second. Active mold keeps its 0.65 movement scale. Early pools last five seconds; Decant/Reflux pools persist up to twelve, allowing the returning catalyst to actually drain them. Body/pool width, real offset bounds, cover and conservative Hellish lava footprints constrain the road and culture placement. Pale walking lines are harmless; reaction orbs are dangerous.

### Advanced Reflux and vial sprays

- Brutal adds 30 actual controlled vial needles after each reaction sequence. Crazed retains the exact first 30 and extends the spray to 90 with extra crossing repeats. Every distinct heading is shown before release and remaining-wave marks count down. Advanced Reflux has three separately warned reaction legs; Crazed adds a fourth. Existing global caps and cancellation may reduce later releases.
- Shared authority owns movement, swept relative reaction contact, pool damage/slow, draining and cancellation. First activation ignores earlier player movement; corner sweeps divide player movement by the actual substep. Phase/stagger/assistance/exit clears pending work. The generic summon/pool signature slot is excluded, keeping repeated cycles advancing. Existing eight-pose service art follows clocks, with a static reduced-motion pose; new walking art remains separate.

### Continuity and verification scope

- Fifteen locales contain all four phase names, response hints and advanced help in the closed manual guide. Exact known issued protocol-31/content-90c1bd18 local Practice/profile state migrates strictly to 32, preserving builds, form history, preferences and controls. Older known local migrations remain; foreign revisions and online/signed state stay strict. Testing/public guide/tools/record policies remain.
- A full actual-Game probe caught rich boss metadata overwriting reaction numeric IDs. Position copies now take only x/y, and a dedicated regression checks numeric IDs and coordinate-only paths with actual rich actor data. Exact first-failure and corrected logs are retained. Scripted mechanics samples remain separate from played clears, rendered, final balance and device/listening/native-language review.
- Roster stays 66, with 85 new ordinary identities still needed. This is original quality implementation eleven of sixty; 49 remain and full human acceptance is open. Preserve all frozen clients and pinned backends. The old public protocol-4 Site and immutable protocol-13 Windows development release remain separate.

## 2026-10-27 — Cradle Matron: Hushed Ward and Cradle Relay

### A moving ward and distinct second phase

- Cradle Matron now follows a connected body-clear escort route to a marked new nest. Hushed Ward calls one gapped lullaby from that nest. At half health Cradle Relay changes flank and calls numbered lullabies in turn from surviving nests. Each wave warns for at least 1.6 seconds and locks its 86-degree gap before release. With no surviving nest the Matron calls alone. Base grade 2++, health, damage, deadline, authored attack definitions, selected art and individual theme remain.
- Up to three nests call two early or four late minions after a full 1.2-second warning. The live cap stays eighteen. Matron brood explicitly uses obstacle navigation; other ordinary-enemy movement remains unchanged. Destroying a nest stops its future brood and unreleased needles; launched rings continue. Real map offsets, cover, body width and conservative Hellish lava footprints constrain escort and nest placement.

### Advanced needle stitches

- Brutal adds thirty actual controlled needles per calling nest from alternating ports. Crazed retains that exact thirty-shot prefix and extends each volley to ninety with extra crossing repeats. All distinct future rays are marked before release, alongside remaining-wave marks. The central opening remains inside the marked lullaby gap. Existing hostile limits and cancellation can reduce later releases.
- Phase, pause, stagger, assistance and encounter exits clear pending owned work. A phase entry also clears the old brood before its replacement. Generic summon-slot exclusion keeps the owned sequence advancing after assistance. Existing service action poses follow authoritative clocks, with a static reduced-motion pose; dedicated walking art remains separate.

### Continuity and remaining work

- Fifteen locales include phase names, response hints and advanced help in the closed manual guide. Only exact known issued protocol-30 local Practice/profile content migrates to protocol 31; builds, form history, preferences and controls remain. Older known local migrations remain. Foreign revisions and online/signed boundaries stay strict. Testing/public choices and guide/tool/record policies remain.
- This is original quality implementation ten of sixty; fifty remain and whole-boss human acceptance is open. Roster stays 66, with 85 new ordinary identities still needed. All earlier frozen clients and pinned backends remain separate. Browser access is disabled in Work settings; no new rendered, personal-clear, physical-device, native-language, listening or final balance acceptance is claimed.

## 2026-10-27 — Black Ambulance: Last Call and Second Dispatch

### Connected patrols and fresh roads

- Black Ambulance replaces fixed global stations with a bounded body-clear connected route on the actual offset arena. Gold patrol marks are harmless. Last Call warns one charge; Second Dispatch reverses patrol direction and gives two distinct headings, each freshly warned from the real stop. Cover, real borders and Hellish lava constrain both the marked road and actual moving body. Base health, damage, attack definitions, deadline, grade 2+, existing art and individual theme remain.
- Driver exposure remains exactly three seconds after the last dispatch, with the existing 25% boss-damage bonus. A shared authority controller owns patrol, warnings, contact and cleanup; relative swept contact hits once per leg, the first active frame does not hit pre-warning player movement, and new cover interrupts travel safely. Generic empty charge casts cannot block the next cycle or recovery after Baby/Easy assistance.

### Advanced dispatches and door volleys

- Brutal dispatches twice early and three times late. Every stop warns a gapped door volley, with 40 actual projectiles under the 2.5x budget. Crazed keeps the full Brutal sequence, adds a fourth late dispatch and fires 120 per stop under the 7.5x budget, with extra crossing repeats. All distinct repeat headings are marked before release and remaining-wave marks count down. Controlled emissions avoid double amplification; existing global hostile limits still apply.
- Phase/stagger/assistance/encounter exit clears unreleased owned cues; flying projectiles remain under normal cleanup policy. Existing casting/charge/driver poses follow authoritative state. Reduced motion retains a static pose. No new walking animation, artwork, music or identity is claimed.

### Continuity and evidence

- All fifteen locales include phase names, responses and advanced-form help in the closed manual guide. Known issued protocol 29 local Practice/profile state migrates to 30, preserving builds, form history, controls and optional name/chat settings; foreign hashes and online/signed state remain strict. The existing testing/public split and modified-run record isolation remain.
- An initial patrol assessment compared width/height without the arena origin and falsely reported 99 out-of-bounds cases. That result is explicitly rejected and retained. The corrected 216-case/388800-tick baseline has zero actual boundary/masonry violations; it records patrol stalls up to 168 ticks. The redesign addresses those stalls and phase behavior. Headless probes are not played clears or final balance acceptance.
- Roster remains 66:65 ordinary plus one secret, with 85 new ordinary identities remaining. This is the ninth original quality implementation;51 remain, with full human acceptance open. All frozen clients and pinned backends remain separate. Browser access is currently disabled in Work settings; rendered, physical-device, native-language, listening and final balance acceptance remain open.

## 2026-10-27 — Crossed Threshold, lasting verdicts and testing tools

### Gate Widow: an opening worth crossing

- Three Latches warns one gate with a numbered open lane. At half health, Crossed Threshold marks a real lateral move and turns the gate sequence through both axes. A floor pall sweeps the two closed lanes; use the opening or a timed dash. Only one gate closes at a time, with an exit interval before the next. Clear connected layouts replace fixed sockets that buried passages in cover.
- Brutal adds separately warned gapped needles from the posts. Crazed keeps that full sequence, adds one serial gate and later crossing repeats. Actual opening emissions are 30/90 Brutal/Crazed projectiles. Warning and damage geometry share clocks and collision-resolved placements. Phase, stagger and encounter cleanup cancel unreleased work. Existing grade 2, base health/damage/deadline, selected art and Third Latch music remain. This is the eighth original quality implementation; human balance review stays open.

### Clerk: shelter power and lasting domains

- Following frozen 5193 feedback, Brutal chooses one random green number I–V at phase-one entry and holds it through that phase. Phase two rerolls each batch; Crazed rerolls throughout. Active green shelter grants boss damage bonuses of 50%/35% Standard, 40%/20% Brutal and 25%/5% Crazed by phase. A compact live bonus label appears while the survivor is fully inside.
- Crazed phase two leaves two amber infinity-marked domains per batch. Each warns for two seconds, lasts through the fight, and removes 10% maximum health on contact under one shared one-second survivor budget, so overlapping domains cannot stack instant hits. Green shelter and invulnerability prevent the loss; armor and shield capacity do not absorb it. Activated domains survive stagger and clear at encounter exit. Existing purple venom/slow, black current-health curse and extended green timing remain.

### Explicit testing and public builds

- Testing builds retain the chosen opening boss/form, all-difficulty manual guides, a Solo-only paused coin/SP panel and a tab-scoped Insane/Hellish unlock. Changing coin/SP marks that run modified, removes its local record and disables boundary saves. The room server exposes no currency command.
- A separate public build removes the testing menu and command branch, selects new openings from the authored random pool, and offers the optional guide only on Baby. The public server rejects opening-boss injection. These are local source/build targets; the old public Site and immutable Windows development release are separate and unchanged.

### Names, room chat and visible records

- Settings can toggle survivor overhead names and room chat. Chat starts closed, uses server-assigned identity, bounded plain text, rate limits and opt-in delivery, and keeps only a bounded in-memory history. Opening chat blocks local combat input while online combat continues.
- Leaderboards is now visible from the home menu. Local Practice records can be filtered by mode and difficulty; the Online boards tab states that verified rankings are not connected. No cheated, local or design-fixture score is presented as a verified public team rank. The hosted ranking finalizer and acceptance remain unfinished.

### Review scope

- The user confirmed the manual guide at frozen 5193 works and authorized browser testing. Prettier guide images remain a later polish task. Automated checks, actual browser play, human acceptance, listening, native-language and physical-device evidence are recorded separately.
- Roster remains 66: 65 ordinary and one secret. At least 85 new ordinary identities and 52 original quality passes remain, alongside art, final balance, hosted recovery/rankings, WAN/capacity, device and coordinated-release gates. PR #14 stays draft and main protected.

## 2026-10-27 — Pauseable boss guides and Chain Marshal’s Shifting Writ

### A manual guide keeps the live field clear

- Following frozen 5192 feedback, boss phase instructions and signature paragraphs move out of the live HUD into a closed-by-default Boss guide dialog. An in-game button and two close controls show/hide it; Escape closes it, focus returns to the opener, and long text scrolls within a bounded panel. All existing guide text remains available for current testing.
- Solo freezes both the actual simulation worker and the drawing scene while the guide is open. Closing resumes without elapsed-time catchup or held movement/fire; pending input/prediction is cleared. Guide and manual-menu pause are independent, so closing one cannot resume the other. Online play continues with an explicit notice and neutral local input. Five controls/notices are authored in all fifteen locales.
- The final optional Baby-only availability policy is encoded and tested, while the explicit all-difficulty testing switch remains enabled for the unfinished development build. Disable that switch only as part of the coordinated final release. Rendered, physical-device and native-language acceptance remains open.

### Held Line and Shifting Writ

- The existing Chain Marshal keeps fixed grade 2-, original base health/damage/deadline, 90/180 Standard/advanced anchor health, current art and Iron Jurisdiction score. Held Line plants two numbered reachable anchors and warns opposite locked 80-degree sweeps for 1.4 seconds. Bounded connected placement replaces fixed sockets; the baseline found nine cover overlaps, seven fully inside cover.
- At half health, Shifting Writ marks a collision-resolved 168-pixel lateral move before a new pair. Arms begin 17 ticks apart. Each surviving anchor stops, locks a new target and gives a full 1.4-second reversed-return warning. A cut cancels only that arm, its return and its unreleased barbs; already flying shots remain. Explicit recovery separates signatures and retained auxiliary attacks.
- Warning polygons and physical chains use real board bounds/masonry. A live wall can shorten a chain; removing cover cannot extend it beyond its locked warning. Matching sub-tick player/arm samples share one half-second target hit budget. Roman I/II, leg marks and static direction arrows identify the two anchors and new headings. Existing casting poses remain; new walking/action art is future work.

### Advanced barbs and continuity

- Brutal/Crazed add owned, independently warned gapped barb volleys. Opening pairs actually emit 40/120 shots, with 2.5x/7.5x Standard budgets applied once, not recaptured into the global queue. Later Crazed repeats add freshly warned crossing angles while retaining the Brutal sequence. Two anchors, 76 vertices per warning and at most 32 owned barb groups keep the state bounded; the shared 4,000-hostile cap remains.
- Phase/stagger/assistance/encounter cleanup removes anchors, patrol paths and owned repeats. Fifteen authored phase guides and protocol 28 preserve known issued protocol 27 local Practice/profile form/build history; online/signed state stays strict. Other 65 complete boss definitions, all class/weapon/map definitions and every previous art/audio asset remain.
- Roster stays 66 identities, 65 ordinary plus one secret, leaving 85 new ordinary identities. This is the seventh individual original-roster quality implementation, leaving 53; full human accepted remains zero. The full art/human/hosted/recovery/WAN/endurance/capacity/device/release gates stay open.

## 2026-10-27 — Clerk: lasting shelter, random safe numbers and purple venom

### A shelter that covers its volley

- Human comparison at frozen 5191 found the graded fields promising, but the Crazed shelter closed too soon to be useful. The former 2.5-second window could end before the final echo even launched. Brutal now opens for at least 3.5 seconds and Crazed at least five seconds, extending for longer routes until half a second after the final possible marked echo reaches the shield rim. Standard keeps its existing 2.5-second window.
- Standard still reopens I in phase one and III in phase two. Brutal retains I in phase one and chooses a random numbered seal in phase two. Crazed chooses a random number in both phases and every fresh field. The server seed chooses once per field; the notch, full warning and fan directions reveal and lock that choice before any strike. Late fresh fields wait for the old green shelter to close, keeping the five/ten cap. Other hazard durations and projectile budgets remain.

### Purple now poisons and slows

- Purple triangles retain double red impact damage. First successful contact per survivor per purple seal also removes 15% of current health through armor/shield capacity and applies three seconds of poison plus 35% walking slow. Poison deals two base damage per half-second, with ordinary difficulty/form scaling and armor/shield mitigation. Reentering the same seal cannot repeat the percentage hit or refresh the affliction; a different seal can refresh it without stacking damage rates.
- Green shelter and existing invulnerability prevent application and poison damage. Skipped poison ticks never catch up and do not grant new hit invulnerability. Dash speed remains unchanged. Antidote supplies, ordinary Medic cleansing abilities and Serum Relay remove poison and its slow. Downing and encounter exits clear all poison clocks.
- Shared authority, local prediction, owner/observer player state, a static purple status triangle/countdown and fifteen authored locale catalogs use the same status. Black remains a once-per-seal 75%-current-health curse with a 1 HP floor. All three/five/ten footprints, original health/damage/deadlines/grades and existing art/audio remain.

### Continuity and remaining development

- Protocol 27 migrates only the known issued protocol 26 local Practice/profile revision, preserving exact forms, builds and history; earlier bounded migrations remain. Unknown and online/signed state stays strict. All previous frozen preview files and any live processes are preserved.
- The roster remains 66 identities, 65 ordinary plus one secret. This feedback follow-up adds no identity or quality credit: 85 new ordinary identities and 54 original quality passes remain. Instructions stay visible during development testing; optional default-off Baby-only instructions remain a finished-product gate. Rendered/device/native-language/listening/final balance, hosted/WAN/endurance/capacity/release acceptance remain open.

## 2026-10-27 — Banked wheel returns and graded Clerk seals

### Tollkeeper: Exact Fare and Closing Booth

- Tollkeeper retains fixed threat 1++, original base health/damage, 105-second Standard deadline, existing art and Copper Debt score. Exact Fare still warns a complete one-reflection wheel route. At half health, Closing Booth marks a lateral move before a new throw; the wheel stops at its bank and gives a full 1.2-second newly aimed return warning. Targets lock for every new heading.
- Advanced forms warn gapped side coin sprays at bank stops and add a third late leg. Actual bank spray emissions retain 2.5x Brutal/7.5x Crazed budgets. One live wheel uses body-radius rays against real arena bounds/masonry, relative swept player contact, a shared half-second hit budget, dynamic-cover interruption and explicit recovery. Auxiliary casts occur between routes.
- Stopped wheel visibility, bank countdowns, booth route marks, existing casting poses and fifteen-locale phase help share authoritative clocks. Phase/stagger/assistance/encounter exits clear routes, banks and delayed echoes. New walking/action art and final human balance remain open.

### Clerk: 3/5/10 simultaneous stamps

- Following positive limited shelter/rim feedback at frozen 5190, Standard keeps three seals with its existing 82-pixel footprints and timing. Brutal uses five at radius 72; Crazed ten at radius 58. Full warnings last at least 1.3/1.5/1.8 seconds. The connected placement search avoids cover, bounds and Hellish lava; spacing leaves movement gaps. Later appeals replace expired fields at shifted positions, keeping live caps five/ten.
- Purple triangles hit for twice red base damage, under the same half-second target budget. Crazed adds two black skull seals per field. Each removes 75% of current health once per player per activation, bypassing armor/shield capacity while respecting invulnerability and green shelter, with a nonlethal 1 HP floor. A different black seal has a separate hit. No instant-kill attack is added.
- Notched I reopens in Intake. After the late patrol, the final seal reopens after its strike: III/V/X by form. Roman I-X, purple triangles and pale outlined black skulls distinguish order/severity without relying on color alone. The approved green shield/rim effect remains.
- Two/three/four marked origins warn seven-shot fans toward the open shelter. Release follows reopening by 0.5 seconds with a full 1.2-second warning; the existing 2.5x/7.5x projectile budgets apply. Black seals do not emit these fans. Actual rim interceptions remain bounded to 48 cues. Fifteen-locale form-specific help describes V/X and the percent-health curse.

### Continuity and remaining development

- Protocol 26 migrates only known issued protocol 25 local Practice/profile state, preserving exact forms/build/run history. Earlier bounded migrations remain; unknown and online/signed state stays strict. Every previous asset blob is preserved.
- The sixth original-roster quality implementation leaves 54 remaining, with full human acceptance zero. Roster remains 65 ordinary plus one secret; 85 new ordinary identities are still required. The seven classes, 21 purchased ability transformations, optional skill map, modes and existing profiles remain implemented.
- Boss instruction text stays visible during development testing as explicitly requested. Before the finished product it must be removed except for an optional default-off Baby-only setting. That future toggle, plus art/human/device/language/listening/hosted/recovery/WAN/capacity/release gates, remains open.

## 2026-10-27 — Clerk shelter now stops a volley while it is open

### A visible reason to enter the green seal

- Each Clerk reopening is followed 0.5 seconds later by two locked seven-shot fans from the other red seals. Every fan has a 1.2-second warning with fixed origins and trajectories. Shelter is already open before release, and center shots reach its rim before it closes. Open-ground dodging remains possible; no offensive reward or health increase is added.
- A shield outline marks active protection, an outer countdown rim shows its remaining time, and actual swept projectile interceptions produce bounded static broken-bullet marks. Earlier walls, class barriers, constructs and players retain collision priority. Warning and impact cues replicate to owner and observer; reduced-motion/flash settings need no added shake, flashing or particles.
- Brutal/Crazed fans use the existing 2.5x/7.5x emission budgets and bounded warned echoes. Each later appeal warns its own pair. Phase changes, assistance, stagger and encounter exits clear queued seal volleys and impact cues. All prior art/audio and the other 65 complete boss definitions are preserved.

### Testing instructions and continuity

- Boss instructions remain visible for development testing, following the latest explicit human request. Fifteen help catalogs now explain the shelter benefit. The finished product must remove automatic fight instructions except for an optional default-off Baby-only setting; that option is a recorded future gate and is not claimed as implemented.
- Protocol 25 migrates only the known issued protocol 24 local Practice/profile revision, preserving exact form/build/run history. Earlier bounded migrations remain; online/signed and unknown states stay strict.
- A LAN integration-test race now waits for the first authoritative player patch after joining before reading class state. The previous metadata commit had one failed direct CI job and one passing PR job; the new checkpoint records fresh evidence instead of treating that failure as a gameplay pass.
- Roster and individual-quality counts remain 66 identities (65 ordinary plus one secret), five of sixty original quality implementations, human accepted zero. Another 85 ordinary identities and 55 quality passes, plus the hosted/recovery/WAN/art/device/release gates, remain.

## 2026-10-26 — Clerk: reachable seals and a fresh appeal sequence

### Three stamps on reachable clear ground

- Clerk no longer silently loses casts on the secondary maps. Arena-relative connected floor candidates replace the fixed fallback grid; complete seal footprints avoid masonry, boundaries and Hellish lava. All 289 previously sampled valid target positions now support three seals plus a distinct advanced appeal, fixing 61 failed placement cases.
- Intake Queue retains stamps I, II, III and reopens seal I when III lands. At half health, Appeal Circuit marks a short collision-resolved patrol before a complete new warning. Seal III then reopens 0.4 seconds after its own strike. A notch identifies the future-safe seal before it turns green; the whole survivor must fit inside.
- Advanced late phases warn three fresh appeal positions after the first sequence reaches III. Every new mark receives the full 1.3-second tell and its own strike/safety clocks; the old safe seal expires. Existing 2.5x/7.5x projectile budgets and warned form pressure remain. Standard health, damage, deadline, threat grade and all previous artwork/music are unchanged.
- Stamp contact uses swept movement and one shared half-second hit budget. Protection absorbs hostile shots only while its visible whole-body interior is active. Explicit recovery preserves the retained fan between sequences. Phase changes, assistance, stagger and encounter exits cancel pending seals, paths, protection and delayed echoes.
- Phase names, persistent response hints and full help share fifteen locale sources. Existing casting poses, priority phase bell and reduced-motion-aware entry animation remain. New walking/transformation art and rendered/native-language/device/listening/final balance acceptance remain open.

### Continuity and remaining work

- Protocol 24 migrates only the known issued protocol 23 local Practice/profile revision, retaining exact completed form history, builds and run identity. Earlier bounded migrations remain; unknown and online/signed state stays strict.
- This is the fifth individual original-roster quality implementation. Fifty-five remain, with human accepted zero. The roster stays 65 ordinary plus one secret, with 85 new ordinary identities still needed. The implemented classes/modes, 21 ability transformations and optional all-54 skill map remain; hosted/recovery/WAN/capacity/art/device/release gates remain open.

## 2026-10-26 — Ratcatcher: a moving muster and rats that route around cover

### A different late-phase position

- Ratcatcher keeps fixed threat 1-, original Standard health/damage, two half-health phases, its 120-second deadline, sixteen selected poses and individual theme. Open Sack warns three fixed scent lanes. At half health, Roving Muster marks a short patrol, moves at 80 pixels per second, then locks a fresh 1.2-second pack warning from its actual stop.
- Both boss and attached sack resolve against bounds/masonry. Pack spawns use locked lane origins. The moving sack uses relative swept contact and retains 65/130 health, next-pack cancellation and restoration three seconds after the cancelled release. Intrinsic sack counterplay stays separate from Baby/Easy phase circles.
- Rats find bounded paths around cover after their fixed scent leg. Only rats use the cached 64-corner visibility graph; ordinary actors keep their movement. Routes refresh for changed targets/obstacles, close corners must be reached before turning, and death/expiry/clear removes navigation state. Rat health, damage, speed scaling and the twelve-live cap remain.
- Advanced forms add one/two fully warned gapped whistle rings across the two phases. The late second gap turns. Breaking the sack cancels rats, not whistles. Projectiles use existing 2.5x/7.5x budgets, bounded repeats and the live cap. Unassisted phase changes cancel pending routes/rings/echoes while existing rats persist; successful assistance and encounter exits retain full cleanup.
- Patrol marks, locked ring/gap geometry, existing warning/release poses, phase names and persistent response hints share the authority and fifteen locale catalogs. The phase bell and reduced-motion-aware entry animation remain. New walking/whistle art or audio recordings and rendered/native-language/device/listening/final balance acceptance remain open.

### Preserved history and remaining work

- Protocol 23 preserves known issued protocol 22 local Practice/profile state, including exact completed forms, builds and run identity. Protocol 21 and earlier bounded migrations remain; unknown and online/signed state stays strict.
- This is the fourth individual original-roster quality implementation: 56 remain and human accepted 0. The roster stays 65 ordinary plus one secret. Another 85 ordinary identities and the documented hosted/recovery/WAN/capacity/art/device/release gates remain. Profiles, five modes, seven class kits, 21 ability transformations and the optional all-54 skill map are implemented.

## 2026-10-26 — Carrion Courier: a warned return delivery

### Different decisions at half health

- Carrion Courier remains an entry boss at fixed threat 1-- with its existing health, damage, ninety-second Standard deadline, 28 selected poses and individual Undelivered score. Its first phase makes one delivery; at half health it makes two. Every return is planned from the actual previous stop, then locks for a full 1.1-second warning. Masonry still blocks charges; a blocked departure selects a clear fixed heading before warning it.
- Brutal and Crazed add one delivery to each phase, making two then three. After the last stop they warn a split dispatch fan for 1.2 seconds. The fan has a marked central gap and uses the existing 2.5x Brutal / 7.5x Crazed projectile budgets. Shared pursuit/crosscut/weave pressure remains separate. No instant-kill attacks are added.
- Narrow three-second trails follow actual collision-resolved movement and retire from the oldest end. Overlapping trails share a half-second contact budget; fast crossing movement uses swept collision. Explicit recovery and a separate between-route pause retain the existing cross volley between routes. Phase changes, successful stagger and encounter exits clear route geometry and delayed repeats.
- Small geometric delivery marks, the current action poses, named phases and persistent response hints communicate the sequence. All fifteen locales share the new encounter help. The existing priority phase bell and reduced-motion-aware entry animation remain; new rendered, native-language, listening and final balance acceptance remain open.

### Continuity and remaining work

- Protocol 22 migrates only the known issued protocol21 local Practice revision, preserving its recorded Standard/Brutal/Crazed completion history, identity, money and build. Older bounded migrations remain. Unknown revisions and online/signed envelopes stay strict.
- Courier is the third individual original-roster phase/mobility/advanced-form implementation pass, after Constable and Warden. Fifty-seven quality assessments/redesigns and 85 additional ordinary identities remain. The roster stays 65 ordinary plus one secret; all hosted recovery/rankings, WAN/capacity/device/rendered/human acceptance and coordinated release gates remain open.

## 2026-10-26 — Crazed forms, closer arenas and a clearer boss nameplate

### Three distinct encounter forms

- Every one of the 66 existing identities now has a Crazed form with a persistent purple treatment and a separate C threat suffix. Insane forces Brutal; Hellish forces Crazed for opening encounters, future contracts and the consented secret. Difficulty unlocks and intrinsic grades remain separate.
- Brutal ordinary projectile emissions use a 2.5x rational budget; Crazed uses 7.5x Standard, three times the Brutal budget. Complete warned repeat waves plus alternating half-waves keep the original aim/gaps. Controlled clock and drone shots increase inside their actual controller, preserving pause/resume and source cancellation. Queues remain finite and the 4,000-hostile cap stays in force.
- Brutal adds locked pursuit marks and crosscuts. Crazed adds more frequent marks and a delayed perpendicular crossing weave. Every extra strike has a 1.8-second tell, bounded geometry, actual swept contact and cleanup; no instant-kill attack is introduced. Warden active cones retain their clear trailing space.
- Endless records the highest actually cleared form of each identity. A Standard clear leads to Brutal, then a Brutal clear to Crazed. Seeded bags, twelve-identity repeat protection, exact offline/authoritative boundary restore and class purchases remain. Known issued protocol20 local saves/profiles migrate to protocol21; unknown/online envelopes stay strict.

### Arena reach, phase sound and HUD

- Gatehouse, Triage Yard, Sunken Chapel and Bell Foundry now have smaller real footprints: 1344x840, 1376x774, 1260x828 and 1350x765. Every painted floor, collider and spawn uses the same uniform world transform. Ossuary Works and Crown Crypt retain their existing footprints and narrow routes. Survivor speed, dash distance and hitboxes stay unchanged.
- The boss name now has a dedicated heading. A separate threat/form seal, phase/name subtitle, segmented health bar and timer create a clear hierarchy, including purple Crazed styling, RTL-safe grade text and responsive wrapping. Phase entry adds a brief health-track engraving animation, disabled by either reduced-motion setting.
- An original two-strike phase bell replaces the subtle phase playback delivery while preserving the old audio file. The cue has priority within the voice limit, follows effects volume and briefly ducks music. Objective PCM reconstruction and measurements remain separate from human listening acceptance.
- Baby/Easy shield circles remain six/three with two/three-second holds and Standard-only eligibility. Combat revival stays Baby 100%, Easy 50%, Normal 25%, Hard+ disabled. Baby adds two cover props, Hard half cover, Insane/Hellish none; Hellish retains warned lava. Insane global health is 1.25x to keep a conservative Tank opening feasible after forced Brutal; Normal health remains unchanged.
- This pass adds variants rather than new identities or individual original-roster quality credits. The roster remains 65 ordinary plus one secret: 85 new ordinary identities and 58 original quality passes remain. Human 5185 feedback confirms clearer phases and a harder Brutal comparison while identifying excessive retreat space; new balance, header, animation and listening review remains open.

## 2026-10-26 — Candle Snail, Cobble Crab and Mourning Kettle join the ordinary roster

### Three individual two-phase encounters

- Candle Snail 1-- lays warned wax rails while gliding; half-health Twin Wick leaves a quiet center between two rails. Brutal adds a delayed cross-cut and follow-up fan. Cobble Crab 1- physically closes warned jaws, scuttles sideways and alternates double closures after half health; a finite anchor cancels its linked clamps. Brutal adds an independent anchor and extra closure. Mourning Kettle 1 pours warned steam before crossing beads; Last Service staggers two cold-center lanes. Brutal adds a delayed rear pour.
- Shared authority owns locked warnings, swept capsule/moving-jaw contact, real collision-resolved body movement and finite linked counterplay. Masonry stops wax/steam; complete jaws remain inside the board. The boss respects live prop footprints. Real weapon hits earn credit and cancel only their linked source. Defeat, timeout, wipe, phase change and stagger clear pressure. Existing bounded Brutal replays create real second waves under the 4,000-hostile cap.
- Each new identity has two half-health phases, bar markers, a separate transition cue and persistent fifteen-locale response text. All 63 earlier boss definitions, health, damage, deadlines and fixed grades remain unchanged. The roster is now 66: 65 ordinary plus one secret; 85 additional ordinary identities remain toward 150 ordinary plus secrets.

### Whole-pose motion, individual scores and continuity

- Ten exact built-in ImageGen natives/requests preserve nine selected four-pose sheets and the superseded Kettle idle. Thirty-six selected idle/attack/defeat poses use complete alpha-bearing RGBA ownership, measured foot anchors and one scale per identity. The faint Kettle attack bridge and initial metadata failure remain recorded. Independent reconstruction checks every source pixel, atlas transform, preserved hash and complete fallback crop. Total selected runtime motion is 1,542 poses.
- Slow Wick (G minor, 9/8, 88 BPM), Stones Remember (D minor, 5/4, 104 BPM) and Tea for the Absent (F-sharp minor, 6/8, 92 BPM) have original individual melodies, arrangements and scores. All 63 earlier boss masters and score events remain unchanged. All 67 music deliveries pass frame-count/SNR/headroom/DC/loop-seam decode checks; listening and browser/device decoding remain open.
- Loading version 5 adds exact live/settled references and three lazy atlases while preserving every previous crop/master. The two-atlas cache bound remains. Protocol 20 carries only known issued protocol 19 local Practice/profile revisions forward with run identity, money, progress and purchases; online/signed state stays strict.
- The focused suite covers all twelve phase/form combinations, all maps/difficulties, actual contact/emissions, real Soldier weak-point hits, linked cancellation, cleanup, language responses, motion/fallbacks, independent RGBA reconstruction, preserved scores, local migration and owner/observer replication of all three Brutal encounters. Current full-suite/CI/source hashes are recorded separately in the checkpoint; automated evidence does not establish rendered or human acceptance.

### Latest human difficulty rules remain

- Combat revival remains Baby 100%, Easy 50%, Normal 25%, Hard+ disabled through every source. Phase shield circles remain Baby/Easy Standard only: six/three circles and two/three-second channels, absent on Normal+ and all Brutal forms. Baby adds two cover props per map; Hard half, Insane/Hellish none. Hellish retains warned lava and forces every encounter Brutal.
- The seven class revamps /21 transformations and optional skill map remain implemented. Original-roster quality remains two passes complete, 58 remaining, zero human acceptances. All frozen preview roots/processes, protected main, draft PR, older public Site and immutable Windows archive remain separate. Art, rendered animation, native-language, listening, physical-device, final balance, hosted recovery/rankings, active mixed-progression/WAN/full endurance and coordinated release gates remain open.

## 2026-10-26 — Lantern Warden patrols and warned Brutal return sweeps

### Two visible phases and a moving recovery

- Still Watch retains the stationary 1.2-second warning, four-second sweep and four-second rest. At half health, Roving Vigil adds a marked 0.6-second patrol tell and grounded movement up to 144 pixels at 72 pixels/s before its first sweep and during recovery. The actual boss resolves movement against map collision; its lantern ground origin locks before every warning and stays fixed throughout danger.
- Brutal alternates sweep direction between cycles. Its final phase replaces overlapping cones with a sequential reverse return sweep after a 0.6-second pause and a fresh full 1.2-second warning. Only one dangerous cone is active at a time. Existing warned projectile replays make recovery fans fire two locked-origin waves. Auxiliary hazards clear at sweep release, preserving the marked trailing interior.
- Four new independently drawn patrol poses retain the Warden identity and physical-left lantern. The exact built-in ImageGen native, prompt, portable references, initial failed packing assumption and independently verified RGBA transforms are preserved. An unequal lower-row ownership boundary keeps the complete third-pose lantern. All alpha-bearing margins remain; compensated display scale retains the existing 150-pixel world body height. Earlier Warden natives/contracts/atlases are unchanged. Total selected motion poses rise to 1,506.

### Readable response and continuity

- Fifteen-locale phase names, persistent response hints and Brutal return help accompany static travel/sweep arrows. Reduced motion retains route and direction information while holding the patrol pose. Last Light remains the Warden's individual original 72-BPM theme, with the existing tempo-aligned phase/Brutal percussion response.
- Normal Warden health, damage, sweep radius/width/rotation, warning, rest and deadline are unchanged. Fixed identity remains 2--, with B separate. All latest difficulty assistance, cover/lava and Hellish forced-Brutal rules remain. Protocol 19 migrates known issued protocol-18 local Practice saves/profiles and keeps online revisions strict.
- Authority regressions cover all six maps and five cover rules, live safe-space damage, locked routes/origins/aim, two full Brutal warnings, real second projectile waves, cleanup, movement pose selection, fifteen-locale help and local migration. Real clients reject protocol 18 and replicate patrol/sweep state and defeat cleanup. The independent pixel verifier reconstructs the complete native and normalized atlas.
- The roster remains 63 (62 ordinary plus one secret); 88 new ordinary identities remain. Two original-boss quality implementation passes are complete and 58 remain, with zero human acceptances. The 21 class transformations and optional skill map remain implemented. All frozen previews, protected main, draft PR and older public/Windows builds stay separate; rendered, physical-device, native-language, listening, final balance and release acceptance remain open.

## 2026-10-25 — Twenty-one ability-changing skill upgrades across all seven classes

### Changed abilities within existing skill paths

- Each class gains three actual ability transformations at depth three of its utility branch: E, ultimate and Q across its three paths. They require the same ordered 1+2+3 SP purchases. All 378 node IDs, 63 paths, prerequisites, numerical bonuses and the single-capstone rule remain. Classic and expanded shops display localized behavioral names and tradeoffs in all fifteen locales.
- Soldier gains a locked-aim staggered burst, a midpoint supply refill and a moving rally. Heavy gains a finite moving front wall, short-range vent rings and split suppression cones. Tank gains a charge-departure wall, a moving once-per-entrant shield aura and angled half-length panels.
- Medic gains chained cleansing, delayed healing pulses and a field following an injured ally. Mage gains a locked delayed ward echo, smaller orbiting pulse centers and twin sigils. Engineer gains an absorbed-damage barricade burst, a mobile siege body and paired near/far turrets. Assassin gains a delayed fixed-path slash, departure traps and a finite target-attracting decoy.
- Transformations include explicit tradeoffs: lower fire-rate or brace reduction, reduced radius or duration, smaller finite health pools, fewer free steps, or divided damage. They execute in shared authority with collision, credit, target selection and encounter cleanup; visual cues use existing assets and restrained geometry. New special-ability raster art and rendered/human balance acceptance remain open.

### Continuity, difficulty rules and verification

- Normal combat revival remains 25%, Easy 50%, Baby 100%, Hard+ disabled. Medic transformation healing cannot revive on Hard. Baby/Easy Standard shield events remain six/three circles with two/three-second channels; all Brutal events remain off. Baby additional cover, Hard half-cover, Insane/Hellish no-cover, Hellish lava and forced Brutal are preserved.
- Protocol 18 carries the known issued protocol-17 local save/profile revision forward while preserving existing skills, run identity, receipts and progression. Online state stays strict. Delayed jobs cancel when their owner is inactive or disconnected; reflection is capped, finite shields cannot refill through repeated entry, and decoys never enter the real player roster or progression scaling.
- Dedicated authority fixtures exercise all 21 purchased behaviors, including actual timing, damage/healing, projectile and contact collision, prediction, capstone compatibility, bounded work and cleanup. Real owner/observer clients buy the upgrades and receive their replicated constructs/fields/cues for every class. Both shop views exercise actual help and guarded purchase handlers. Full validation and exact artifacts are recorded separately from human/device/rendered acceptance.
- Seven requested class-upgrade implementation passes are complete with human acceptance still open. The roster remains 63: 62 ordinary plus one secret. Eighty-eight new ordinary identities and 59 original-boss quality passes remain; the optional full skill map is already implemented. Preserve every frozen preview, protected main, draft PR, public protocol-4 Site and immutable protocol-13 Windows development archive.

## 2026-10-25 — Quarter-health Normal revival and distinct Baby/Easy assistance

### Revival and phase shield channels

- Normal now restores 25% maximum health through every combat revival route: teammate channels, solo self-recovery, Medic resurrection and revive kits. Baby stays at 100%, Easy at 50%, and Hard/Insane/Hellish keep combat revival disabled.
- Baby has six phase shield-break circles and a two-second channel. Easy has exactly three circles and a three-second channel, 1.5 times Baby. Only Baby/Easy Standard offer the event; every Brutal form keeps it disabled. Circle placement avoids colliders and large groups require at most three simultaneous occupants, so Easy remains completable.
- The HUD, progress arcs, difficulty cards and final review use the actual circle counts and channel duration. Quarter-health wording, additional-cover labels and circle/channel details cover all fifteen locales.

### Additional Baby cover and continuity

- Baby adds two genuine 100×65 cover props on every map. Existing non-bed prop art, scene placement, setup diagrams, authority collision and client prediction share the same rectangles. The original Gatehouse floor stays unchanged; the extra props draw separately.
- Placement preserves fifty survivor deployments, reachable phase-circle centers and large-boss engagement routes. Candidate positions that choke a route are rejected. New tests exercise actual projectile blocking and prediction against the new props.
- Protocol 17 keeps online matching strict and migrates the known issued protocol-16 local content revision without losing run identity, money, purchases or progress. Frozen previews through 5181 remain unchanged. No new boss or class revamp is counted; the roster remains 63, with 88 new ordinary bosses and seven class ability-upgrade revamps still to implement.

## 2026-10-25 — Difficulty rules, clearer phases and Hellish arenas

### Distinct assistance rules

- The phase shield-break (Accord) event is offered only on Baby/Easy Standard. Every Brutal form and Normal or higher remove the event and its heal/stagger/vulnerability. Existing hostile projectiles and fields stay live through unassisted phase changes; pending outgoing casts reset.
- All combat revival routes use one rule: Baby restores 100% health, Easy/Normal 50%, Hard/Insane/Hellish disable revival. This includes solo recovery, teammate channels, Medic resurrection and supplies. Disabled revive kits cannot be bought or consumed; recovery between encounters remains. Difficulty selection and final review display these distinctions in all fifteen locales.
- A timeout-free Normal-or-higher campaign with at least three completed encounters can offer the consented secret challenge without requiring the now-removed Accord event. Campaign victory remains banked before the offer.

### Phase pacing and Brutal pressure

- Threat levels 1–2 now use two half-health phases in both forms. The final phase retains the late authored signature, including the former final Brutal combinations. Higher threats retain three Standard or four Brutal phases. A segmented boss health bar, current/total phase labels and a separate transition banner make changes visible without the shield event. Normal health is unchanged.
- Brutal boss projectile volleys repeat locked origins and trajectories after 1.05 seconds: two total waves at lower threat, three from threat 5. Additional signature mechanics remain. Repeats have authoritative warnings and bounded queues, never recursively repeat, and preserve the 4,000-hostile cap. Controlled projectiles retain their authored control sequence; the Warden retains its safe sweep geometry.

### Difficulty changes arena play

- Hard retains half the static interior cover (rounded down); Insane and Hellish remove interior cover. Arena boundary walls and temporary boss mechanics remain. Authority, prediction, cover art and previews share the same selected geometry. Two original built-in ImageGen Gatehouse floor edits remove the corresponding painted fountains; the original floor is preserved.
- Hellish adds marked contact-damaging lava pits with a three-second opening warning, safe spawns and 24 damage per second in half-second intervals. Every Hellish boss is forcibly Brutal, including fresh openers, future contracts and the secret. The difficulty menu and Solo selector make this automatic rule explicit.
- Hellish global health is rebased to 1.2× before the forced 2× Brutal multiplier (2.4× overall); Brutal keeps its 1.5× deadline. The variant-aware analytical model has no deadline misses under its declared assumptions. Actual human balance, rendering, device and native-language acceptance remain open.

### Continuity and remaining work

- Protocol 16 keeps online revisions strict and migrates the known issued protocol-15 local Practice/profile revision without losing progress, run identity or purchases. Hellish contracts adopt the new forced-Brutal rule. The roster remains 63; 88 new ordinary identities, 59 original quality passes and seven ability-changing class revamps remain.
- The optional complete skill map is already implemented. All frozen previews through 5180, protected main, the public protocol-4 Site and immutable protocol-13 Windows release remain separate. Simultaneous boss pairs are a future encounter design option; this pass does not add them.

## 2026-10-25 — Optional expanded skill map

### One connected view of every class path

- A new Expanded skill map setting shows all 54 existing skills for the chosen class: three parent branches, nine specialization paths and their actual prerequisites. The classic 18-node branch view remains the default. No extra skill, cost or power is invented.
- The map has bounded 65–140% zoom, native two-axis scrolling, arrow-key path navigation, Home/End and one roving skill tab stop. Inspecting or moving focus never purchases. The existing detail panel, prerequisite checks, point budget and one-capstone rule remain authoritative.
- Zoom preserves the visible center; horizontal/vertical position and selected-item focus survive shop updates. Automatic text direction retains localized labels within a stable dependency diagram. The map is confined to lobby/shop surfaces.

### Preferences and continuity

- The opt-in setting persists through the existing profile/settings path. Issued eight-field settings gain only the default-off toggle before full validation. Known issued local profile revisions migrate without losing run receipts, discoveries or controls; unknown revisions and corrupt values are rejected.
- Names, map instructions and zoom controls cover all fifteen launch locales. Source-level shop/keyboard/layout/profile checks remain separate from browser rendering, physical-device and native-language acceptance.
- The roster stays 63 (62 ordinary plus one secret); 88 ordinary identities, 59 original-boss quality passes and seven ability-changing class revamps remain. Frozen Constable 5178 and Early Watch 5179 stay unchanged.

## 2026-10-25 — Three original Early Watch encounters

### Encounter expansion

- Ashen Usher 1-- uses breakable ticket stands, staggered aisle volleys and crossing rows. Brass Toad 1- makes warned physical hops and gapped ripple shots; its drain plug cancels the tongue jet. Ragpicker's Kite 1 orbits above opposing wind corridors; breaking a pin removes its wind.
- Each has three distinct ordinary phases and additional Brutal mechanics, including a fourth phase. Wind uses shared bounded authority/prediction logic; dodge suppresses it. Every delayed attack is warned and phase/Accord cancellation clears pending cues.
- The playable roster is 63: 62 ordinary and one secret. Eighty-eight additional ordinary identities remain toward the minimum 150 ordinary plus secrets.

### Motion, music and help

- Thirty-six selected complete poses use proportional whole-pose extraction and explicit four-frame defeat timing. A successor loading manifest preserves every version-3 reference byte. Native returns, requests, alpha ownership and portable bindings are retained.
- Empty Balcony, Rain in Bronze and Thread Above the Street are individual original synthesized scores with editable events, preserved PCM masters and compressed delivery. New names, signature help and phase labels cover all fifteen launch locales.

### Development and review

- Protocol 15 separates this source from the frozen protocol-14 previews. Bounded offline Practice migration carries issued protocol-14 saves forward while preserving fixed-grade cards, progress and run identity; online revision checks stay strict.
- Frozen preview ports 5174–5178, the public protocol-4 Site and issued protocol-13 Windows archive remain separate. Browser, device, native-language, listening and final human balance acceptance remain open. The game is unfinished.

## 2026-10-25 — Art-only Toad motion checkpoint and current continuation guides

### Production and provenance

- Preserved four exact Brass Toad motion returns, selecting twelve complete idle/hop/defeat candidates. The first hop was rejected for tight padding; actual clipping was not established. No new encounter or theme is playable yet.
- One upright-calibrated scale per clip and a shared readable anchor retain all faint edge pixels. An independent verifier reconstructs connected figure ownership, all alpha-bearing RGBA and the final candidate atlas. Wider art-only cells are outside the runtime index.
- Six Ashen Usher/Kite requests remain prepared and unexecuted. The playable roster stays 60 and the ordinary-boss deficit stays 91; the twelve candidates do not increase the 1,466 runtime pose total.

### Current documentation and handoff

- Replaced stale protocol-6/five-boss continuation instructions and old implementation/acceptance pages with the current checkpoint. Exact old copies and partial packing evidence remain in dated history.
- Updated the 150-ordinary-boss target, class upgrade/tree work and historical guide labels. The shared progress ledger now also records the Toad art-only candidate set, with Usher/Kite motion and all three encounters still open.
- Added a twenty-seventh Wiki image and prepared an exact local/GitHub continuation handoff. The game, rendered/device acceptance and coordinated release remain unfinished.

## 2026-10-25 — Distinct Brutal sequences, clearer phases and a shared progress ledger

### Phase and variant identity

- Brutal Constable now adds a delayed flank pincer in Patrol, a ring after Cordon crossing fans, a third Lockdown ring, and a closing pincer after Curfew rings. All new attacks have locked visible warnings and preserve the cast/recovery clock.
- Cordon movement now flanks laterally instead of merely speeding up the Patrol route. Normal keeps its early-boss role and existing primary volleys.
- A four-second static edge cue highlights actual phase entry, while a short persistent HUD hint explains the current response in fifteen languages. It leaves the center of the playfield clear.
- Living Brutal boss sprites have a muted red treatment and broken red ground mark. The B label remains explicit, and switching to Normal or a settled corpse clears the treatment.

### Music, progress and new concepts

- A quiet synthesized drum layer follows each original boss theme tempo. Later phases and Brutal add bounded accents. Volume controls, warning ducking, hidden-tab checks and stop cleanup apply; original music masters remain intact.
- One structured ledger now drives the local progress page, Wiki progress page and in-game journal summary: 91 new ordinary bosses, 59 other existing-boss quality assessments/redesigns, seven class ability-upgrade revamps and one optional branching-tree view remain.
- Five secondary-map topology revamps are implemented; human acceptance remains separate. Limited earlier bullet/warning readability feedback is recorded precisely.
- Three exact original concept returns for Ashen Usher, Brass Toad and Ragpicker’s Kite are preserved and illustrated as art-only work. The playable roster remains 60; concepts do not reduce the 91-boss deficit.
- Ten new regressions cover actual Brutal geometry/emissions, phase cues, visual reset, all sixty tempo bindings, bounded synthesis/scheduling, progress synchronization and immutable concept provenance. Human rendered/listening/balance review remains open.

## 2026-10-25 — Choose Standard or Brutal for the first solo boss

### Direct boss testing

- The final solo setup review now has a Boss form selector: Standard form or Brutal. The opening-boss list shows the matching fixed grade and B marker.
- Global difficulty remains a separate selection. Boss form applies to the first encounter; later contracts follow their usual progression. Any implemented class or map can be used.
- A useful comparison is Soldier, Quarantine Run, Gatehouse and Normal difficulty, with Hollow Constable selected on the review screen. Compare Standard form against Brutal while keeping those other choices the same.

### Authority and verification

- Offline startup uses the existing validated boundary path for the chosen variant. Saved boundaries preserve the selected form. Online room creation excludes this local Practice option.
- Five new regressions cover all seven classes across all six maps, actual offline-worker message startup, invalid options, boundary restore, subsequent contracts, real online room creation and fifteen-locale accessible controls.
- Rendered controls, physical devices, native-language review and human Normal/Brutal balance comparison remain open.

## 2026-10-25 — Hollow Constable patrol, crossing cordons and moving lockdown

### Different phases and counterplay

- Patrol shuffles between two locked aimed volleys. Cordon fires crossing fans from two flanks. Lockdown pursues between staggered gapped rings, with a shared escape wedge. Brutal adds a third ring in Curfew.
- Warnings lock origin and aim when created. Each delayed volley is warned from the start; casting plants the feet through the final release and recovery. Spaced arrest stamps replace overlapping random disks.
- Phase changes clear outgoing volleys, arrest fields and stale cast poses. Successful Accords interrupt pending attacks and keep their full stagger window. The HUD names all four Constable phases in fifteen languages.
- The Constable keeps his fixed 1+ rating, with B reserved for Brutal. This is a quality pass on an existing identity; the roster remains 60.

### Motion and evidence

- Four complete shuffling poses use one upright-calibrated scale and the original world anchor. All 27 earlier Constable poses and their native sources remain intact. Movement observation holds between position updates rather than flashing idle.
- Eleven new regressions cover actual phase emissions, escape geometry, real arrest damage, map collision, warning locks, phase cleanup, motion timing, exact art reconstruction locale coverage and bounded save migration. Rendered and human balance review remain open.
- The Wiki removes an older contradictory variable-rating/Brutal-plus introduction and shows current fixed grades throughout the boss tables.
- Local boundaries from the issued pre-patrol content revision migrate without losing run identity, coins, upgrades or history. Current-version threat cards still receive strict validation; unknown revisions and online records are rejected.

## 2026-10-25 — Fixed boss ratings, five subtiers and a separate Brutal marker

### Stable classifications

- Every one of the 60 existing identities now has an explicit fixed level and subtier. Hollow Constable is 1+; Bell Triplets are 3--; Brutal uses B and the above-Calamity secret category displays >10.
- Contracts derive health, projectile pressure and bounty from the identity. Hidden card-position risk is removed; global difficulty, party size and Endless pressure remain separate.
- Ordinary campaigns choose suitable fixed grades across primary route affinities while retaining regular/finale roles. Endless keeps its repeat/exclusive rules and an age slot prevents older identities being starved by grade preference.

### Saves, budgets and remaining work

- Protocol-13 local Practice saves migrate to protocol 14 without losing money, run identity, personal progress or extension history. New boundaries reject forged grades and positional risk; concealed cards still omit boss IDs.
- Base coin/SP budgets stay normalized, while earned classified bounties add premiums. Existing purchases are preserved and late arrivals receive only base catch-up.
- Three distinct bosses in each of fifty ordinary subtiers needs 150 ordinary bosses. Current coverage is 59 ordinary plus one secret, with 91 additional ordinary identities still required. This stage adds no new identities.
- Clearer phase changes, more movement and distinct attack pressure, ability-changing upgrades and an optional branching skill tree remain active work. Final human balance and rendered review remain open.

## 2026-10-25 — More distinct map routes and consistent class portraits

### Five revised layouts

- Secondary maps now use a diagonal crate promenade, alternating factory chicanes, a horizontal chapel nave, twin furnace loops and a hooked crypt court. Their starting axes differ as well as cover.
- Bed props are removed from secondary-map cover. Server, prediction and art use the same rectangle plan. Original Gatehouse layout and all six painted ground footprints stay unchanged.
- Fifty-player formations, boss spawns and every Accord objective pass reachability checks; predicted dodges and authority agree on each map.

### Seven matching portrait scales

- Soldier and Medic gain complete three-quarter resting portraits, preserving their existing identities. All seven menu portraits now have the same body-height target and ground anchor.
- Five original poses and all gameplay sprites remain unchanged. Complete source/PNG reconstruction verifies the two new natives and seven deliveries. New rendered menu and map-layout review remains open.
- Fixed threat ratings, separate Brutal labels, harder unique boss phases, ability-changing upgrades and an optional branching skill tree remain active work.

## 2026-10-25 — Steadier survivor motion and complete Courier reactions

### Survivor continuity

- Running now stays active between movement updates instead of flashing to idle on intervening draw frames. A bounded 100-ms stop grace also covers ordinary remote patch cadence.
- Small aim changes near diagonals no longer flip directional sheets; deliberate turns stay immediate. Attack and hurt clips keep their onset facing. Movement, aim, hit tests and input are unchanged.

### Courier motion and texture delivery

- Twelve complete new Courier poses add breathing, hit recoil and an Accord stagger with one upright entry then a weak loop. Original eight charge and eight defeat poses stay unchanged.
- Sixty-four cropped boss identities preserve exact complete RGBA cells and world anchors through loading and eviction. Reference decoded area is 64.8128% smaller; the encounter-only cache subtotal is at most 76.81033 MiB despite the larger Courier atlas.
- Independent pixel/anchor reconstruction and ten new regressions accompany the change. Human perception, rendered transitions and device FPS still need review. Map layouts, unwanted beds, class portraits and threat/boss/skill-tree feedback remain active work.

## 2026-10-25 — Seven opening bosses gain complete defeat sequences

### Fifty-six new poses

- Courier, Ratcatcher, Quarantine Clerk, Tollkeeper, Chain Marshal, Gate Widow and Black Ambulance each gain an eight-pose defeat clip. All nine opening-route identities now have settled defeats alongside Constable and Warden.
- Original live action pixels and world scale are retained. One scale per new strip keeps fallen poses naturally short and wide, with equipment and complete silhouettes preserved.
- Defeat begins only after the server records it, plays once on world time and holds the final pose through rewards and votes. Reduced motion holds the settled pose; stagger fading applies only to living bosses.

### Loading and verification

- Seven exact settled images are available during loading/retry. The current/recent atlas cache still retains at most two full boss atlases, with one load in flight and safe sprite release before eviction.
- The expanded encounter set implies 72.40625 MiB at startup or at most 93.65625 MiB retained, versus 327.25 MiB without its cache. These dimension estimates exclude other textures, driver allocation and device FPS.
- Independent native/atlas reconstruction preserves all 56 original live poses and verifies all 56 new poses. Five new regressions cover normal/Brutal kills, one-time rewards, paused combat/world clocks, stale cues, reduced motion, identity fallbacks and eviction.
- Eight actual native returns are preserved, including the rejected first Ambulance layout. The Wiki adds a representative motion image. Final rendered/device/human transition review remains open.

## 2026-10-25 — Every map gains its own painted ground material

### Five new arena surfaces

- Triage Yard gains worn grey-green flagstones; Ossuary Works combines limestone and flush iron plates; Sunken Chapel uses damp slate and faded mosaic; Bell Foundry has warmer oxidized plates; Crown Crypt has dark slabs and faint tarnished inlay.
- The original Gatehouse artwork stays intact. All six floors use their existing playable footprints and dimensions. Cover props, collision outlines and spawns are unchanged.
- Setup map previews use the new materials with actual layout geometry. In combat, a separate ground layer keeps the painting below cover and hazard cues.

### Production and verification

- Five complete opaque native paintings and exact prompts are preserved. One geometric aspect crop and proportional resize retains at least 98.0954% of each source area; independent reconstruction verifies every delivered pixel.
- The five new grounds imply 24.39 MiB decoded RGBA by dimensions. This is separate from other textures, driver allocation and device FPS.
- Three regressions cover committed geometry/native bindings, all map switches, unchanged collision/spawns and missing texture handling. The Wiki gains a six-map material/geometry reference; final rendered/device/human readability review remains open.

## 2026-10-25 — Hollow Constable gains idle, hurt, stagger and a complete collapse

### Nineteen new drawn poses

- Four whole sheets add four idle, three hurt, four stagger and eight defeat poses. The original eight attack frames stay unchanged.
- A successful Accord now shows the stooped stagger loop. On defeat the Constable collapses once using world time, then holds the settled pose while rewards and votes continue.
- One scale per clip preserves complete hands, coat, cap and chains. The stagger stays naturally stooped and the fallen poses stay naturally low and wide.

### Cast timing and verification

- Attack anticipation now holds until the replicated release tick. The former warning-start animation showed the first fan release fourteen ticks early; zone casts were also omitted by its filter.
- Hurt cannot interrupt casts, stagger or defeat. Bounded drawing lead cannot release before authority; reduced motion keeps readable held states. Boss damage, telegraphs, rewards and encounter rules are unchanged.
- Independent pixel reconstruction verifies all nineteen new poses and original attack hashes. Eight regressions cover normal/Brutal timing, actual Accord, one-time rewards, world-clock defeat and reduced motion. The Wiki gains a complete twenty-seven-pose motion reference; rendered/device/human acceptance remains open.
- Cross-platform provenance explicitly binds the historical Windows metadata and Git LF bytes. The first Ubuntu hash-check failure and issued receipts remain preserved; metadata values and artwork are unchanged.

## 2026-10-25 — Boss animations load by encounter with a bounded texture cache

### Smaller encounter startup

- Boss startup now keeps eight shared actor atlases and exact first-frame references for 57 bosses. Full animations load for the current replicated boss instead of decoding the entire encounter atlas roster.
- A maximum of two full boss atlases are retained, with one load in flight. Repeated requests coalesce, superseded completions are released, failures retry after five seconds, and scene shutdown cleans up pending/cached resources.
- A boss keeps its own correct reference pose during loading or retries. Origins, displayed size, authoritative telegraphs, damage and encounter rules stay the same. Shared voices, keepers, attendants, moths, crows and minions remain available.

### Verification and resource scope

- The 65-atlas encounter set previously implied 292.5 MiB decoded RGBA. The new startup estimate is 68.06 MiB and the maximum retained-cache estimate 77.06 MiB. These dimension-based totals exclude other scene textures, driver allocations and device FPS.
- Independent pixel checks verify all 57 reference crops against their original frame zero. Eight lifecycle tests cover initial preload, identity fallback, all-boss cache bounds, rapid switching, retry timing, shutdown and safe texture eviction.
- Original production artwork, seventeen Wiki images, the issued Windows archive and frozen endurance source retain their separate identities. Rendered/network-delay/device/human acceptance remains open.

## 2026-10-25 — Smaller survivor texture loads with original artwork retained

### Runtime art delivery

- Added runtime-sized copies for all 168 survivor action/run atlases and 820 selected poses. They retain frame order, animation speed, world size and foot origins, with at least two texture pixels per displayed pixel whenever the original provides it.
- The survivor set now requires 211.09 MiB of decoded RGBA instead of 462.88 MiB by image dimensions, a 54.40 percent reduction. Preferred PNG bytes fall from 30,042,299 to 15,225,408. These estimates are separate from actual GPU/driver memory or device FPS.
- Full production atlases, native returns and their hashes stay intact. Four excluded Engineer north poses remain absent from delivery. Removed obsolete mirrored/static survivor texture preloads and matched Soldier/Medic menu portraits to their approved identities.

### Verification and review

- Independent reconstruction checks every delivery RGBA cell against its original complete-frame resampling. Tests verify all live selectors, pixel-density bounds, original contract hashes and the decoded-storage budget.
- Comparison sheets show production and delivery poses at 56/112-pixel body sizes for all seven classes. The local art room retains original-resolution review and includes Soldier/Medic runs. Final rendered/device/human review remains open.

## 2026-10-25 — Smoother survivor motion between network patches and complete Rescue Charge timing

### Presentation timing corrections

- Survivor actions and runs now use a bounded drawing clock between authority updates. A sixty-Hz fixture supplied twenty-Hz patches and now displays all six short-dodge poses; the previous source skipped two.
- Drawing can lead its latest snapshot by at most fifty milliseconds, holds during a stalled connection, ignores duplicate snapshots and resets at run, encounter, phase or backward-clock boundaries. Reduced motion stays stable.
- Tank Rescue Charge now spreads its six poses over its actual ten-tick interval. It previously used the shorter ordinary dodge duration and held the opening pose too long. The existing combat duration and game rules stay the same.

### Evidence

- Preserved both failing pre-change regressions and passing tests for actual charge input, patch interpolation, bounds, revival and authority-state preservation.
- The seventeen-image Wiki and in-game changelog document the same source. This software timing evidence does not establish rendered frame rate, human/device or hosted acceptance.

## 2026-10-25 — Soldier and Medic actions complete the seven-survivor basic motion set

### Drawn actions and independent runs

- Added twenty Soldier and twenty Medic clips: 176 new idle, primary-fire, hurt, dodge and downed poses across four independent directions. All seven survivors now have those five actions alongside directional runs.
- Added four independently drawn side runs with 32 new poses, replacing mirrored Soldier running and static Medic side views. The sixteen approved north/south poses retain their original native pixels and are repacked at the same 56-pixel body scale as other directions and actions.
- Preserved all 45 new native returns and exact prompts. A connected Medic fall was replaced whole. A separate movement request returned no image; its error/request remain recorded, and the replacement succeeds without inventing a native return.

### Verification and illustrated Wiki

- Independent reconstruction covers all 140 action clips, 616 action poses and eight Soldier/Medic run clips. Authority-fired primary shots, authored run timing, stable reduced motion and retained north/south sources have regression coverage.
- Added Soldier and Medic action references to the Wiki, for seventeen images. The in-game and repository changelogs describe the same source stage.
- Native/contact-sheet and software checks remain separate from rendered, human and device acceptance. Special-ability animations, many boss action sets and final game/release work remain unfinished. The issued Windows archive retains its earlier exact source.

## 2026-10-24 — Heavy and Assassin actions, illustrated Wiki and one-hour local combat probe

### Forty drawn action clips

- Heavy and Assassin each gain twenty independently drawn directional clips and 88 poses for idle, primary fire, hurt, dodge and downed. Existing runs remain separate; all 43 native attempts and exact prompts are retained.
- Transparent clip padding expands where needed without changing character scale or erasing native alpha. Three touching Assassin sheets were replaced whole. Independent reconstruction now covers 100 action atlases and 440 new poses across five classes.
- Corrected the Engineer count to 28 accepted run poses plus 88 action poses, or 116 total. Four excluded north frames stay excluded; historical issued reports remain preserved.

### Measured local endurance and Wiki images

- Completed one hour with fifty active scripted clients and 4,000 maintained hostile projectiles: 108,001 ticks, 21.41 ms p99, 112.11 ms worst and 236 ticks above 33.33 ms. All raw timings and failed setup attempts remain available.
- The probe accepted 4,286,000 inputs and encoded 15.53 GB outbound. It uses frozen Engineer-era source, invulnerable players and zero rendered clients; hosted/rendered capacity and normal progression remain separate gates.
- The Wiki adds Heavy and Assassin action references and an actual-measurement chart, for fifteen images. Soldier/Medic action libraries, many boss action sets and rendered/device/human acceptance remain unfinished. The issued Windows archive keeps its original source.

## 2026-10-24 — Mage idle, casting, hurt, dodge and downed motion

### Drawn Mage actions

- Added twenty Mage clips and 88 new poses across four directions, preserving the left-hand sun-wheel staff, right-hip book, indigo robe and independent existing runs.
- Retained all 25 native attempts and exact prompts. Five whole-sheet replacements correct ambiguous casting swings, a mirrored haircut, a sideways south dodge and a west fall beginning in the wrong direction.
- Five staggered sheets use lossless whole-figure ownership masks. Every original visible source pixel is conserved and connected figures remain intact; no mirrored directions, source alpha erasure or creative limb repairs are used.

### Runtime and illustrated documentation

- Real Mage primary shots select the correct cast clip in all four aim directions; reduced motion stays stable and movement uses the existing run strips.
- Independent reconstruction now covers sixty action atlases, 264 new poses and 73 preserved native attempts across Tank, Engineer and Mage. The Wiki adds a Mage action reference.
- Native/contact-sheet and software checks remain separate from rendered, human and device acceptance. Four survivor action libraries and many boss action sets remain unfinished; the issued Windows download retains its earlier source.

## 2026-10-24 — Engineer idle, firing, hurt, dodge and downed motion

### Drawn action library

- Added twenty Engineer clips with 88 new independently drawn poses across four directions. Her existing runs, teal coat, bun/goggles, backpack and right-hand brass firearm retain their identities.
- Preserved all 23 exact returns and prompts, including three rejected falls that changed the weapon hand or facing. Corrected whole sheets keep the weapon arm consistent; no mirrored poses, painted limb corrections or alpha removal are used.
- The shared presentation clock now selects Engineer actions from existing authority state. Separate participants keep independent firing, hurt and downed cues; reduced motion remains stable.

### Verification and Wiki

- Independent native reconstruction now covers 40 Tank/Engineer atlases and 176 new action poses. The Wiki adds an Engineer action reference and the in-game changelog records this stage.
- Software tests cover Engineer/Tank cue isolation and class changes. Native and 56/112-pixel contact review are separate from rendered Phaser/device/human acceptance, which remains open. Other survivor and boss action libraries remain unfinished.

## 2026-10-24 — Tank idle, firing, hurt, dodge and downed motion

### Drawn action library

- Added twenty Tank clips in four independent directions: 88 new idle, firearm attack, hurt, dodge and downed poses. Existing runs remain unchanged. The shield and firearm retain their physical arms, with no horizontal mirroring or painted limb corrections.
- Dodge follows actual movement, falls hold their resting pose and revives return to standing. Real ammo/health changes drive firing and hurt; repeated snapshots cannot restart every firing frame. Reduced motion uses stable representative poses.
- Preserved all 25 native returns and exact requests, including a rejected sideways north attack and superseded edits. Independent reconstruction verifies every packed RGBA pixel, shared strip scales, reference hashes and transparent padding.

### Documentation and validation

- Added a Tank action reference image to the illustrated Wiki and clips to the local frame-step art room. Contact sheets show 56/112-pixel scale; they are not gameplay screenshots.
- State tests cover actual firing/dodge, hit interruption, resting holds, revival, late observers and reset isolation. Rendered transitions, human/device acceptance and the remaining survivor/boss action libraries stay open. The issued Windows archive retains its earlier source.

## 2026-10-24 — Bounded fifty-player checkpoint transfer

### Recovery foundation

- Large signed squad checkpoints now use authenticated bounded compression while keeping the existing HTTP message limit. Builds, inventory, votes, RNG and every retained purchase reply remain intact; small legacy checkpoints stay compatible.
- A real file-backed HTTP restart fixture restores fifty developed builds across all seven classes, races two owners, rejects the stale owner and retries successful/failed purchases without double-spending. Ten forced clears and shortened intermissions are persistence fixtures, not human combat wins.
- Expansion bombs, malformed/trailing streams, encoding changes, invalid clocks and maximum message headroom are checked. A state that cannot fit still latches recovery unavailable; no receipts are silently dropped.

### Scope

- The normal runtime remains Practice with no configured recovery writer. Participant credentials, paged worst-case transfers, durable departed-player history and hosted rankings/recovery remain unfinished. The published Windows development download retains its earlier exact source and verification record.

## 2026-10-24 — Windows portable app and opt-in LAN hosting

### Desktop runtime

- Added an Electron 45 Windows shell with a sandboxed isolated renderer, bundled fonts/art/music, the shared offline worker and native bell branding. Offline play starts no server and requires no separately installed Node or internet connection.
- The desktop LAN menu explicitly starts/stops a separate bundled authority, shares private IPv4 addresses and accepts local host addresses. All seven classes and five modes retain their server-owned rules. Occupied ports return an error without replacing the existing listener.
- The preload exposes only validated LAN commands to the main frame. Local assets use a restricted custom protocol, external navigation is bounded, and profile/preferences remain portable through existing JSON import/export.

### Validation and delivery

- The automated packaged renderer checks all 210 class/mode/difficulty starts, checkpoint restore, movement, firing, profile storage, bundled fonts and native decoding of all 61 compressed tracks. It reports zero external network attempts and no LAN authority on offline startup.
- A separate native utility-process fixture exercises occupied-port preservation, two real WebSocket clients, combat replication and graceful shutdown. A physical second-computer LAN playtest and manual rendered/audio acceptance remain open.
- Portable build tooling retains runtime license files and produces a per-file hash manifest. Fresh ZIP extraction, an ordinary Windows copy and exact build/source identity are verified separately for each issued package. The Windows build is an unsigned development playtest; final animation, tuning, online rankings/recovery and human/device/language release gates remain open.

## 2026-10-24 — Illustrated game Wiki

### Player documentation

- Added a cover, seven-survivor reference, five labelled boss galleries covering all sixty identities, a comparison of all six runtime map layouts, and the twenty-eight weapon/eight supply icon sheet.
- The images appear alongside the Home, Classes, Bosses, Modes and Economy guides, with a dedicated Art Gallery. Source artwork and its hashes remain preserved; contact sheets and collision diagrams are explicitly distinguished from gameplay captures.
- Wiki publication verifies every Markdown/image Git blob and all nine public image responses. Documentation images do not establish new rendered game or animation acceptance.

## 2026-10-24 — Smaller music downloads with original PCM fallback

### Audio delivery

- Added audited 192 kbps music delivery copies for all sixty boss themes and City Wake. Preferred transfers total 64,351,596 bytes instead of 472,276,236 PCM bytes; original compositions, scores and WAV hashes remain unchanged.
- The audio engine checks decoded duration before looping. Unsupported compressed decoding or unexpected padding uses the original WAV, retains warning ducking and keeps the three-buffer music cache bound. Original masters remain bundled for fallback, so this reduces preferred transfers rather than the total offline package.
- Independent FFmpeg decoding verifies exact frame counts, signal fidelity, levels, clipping and loop sample-step bounds across all 61 copies. Browser/device decoding and human listening remain open; signal checks are not perceptual approval.

## 2026-10-24 — Boss health correction, destructible buildings and collision performance

### Combat fixes

- Restored the authored encounter-duration factor in boss health. A solo Normal Courier now has 1,012.5 HP for its 90-second fight, correcting 1,350 HP; the 120-second Constable remains at 1,800. Brutal still doubles health and extends the deadline separately by 50%. Raid and secret coefficients remain independent.
- Weapon projectiles now damage active Walking District buildings. Their solid geometry previously discarded a friendly shot before its damage could reach the destructible target. Hostile bullets still stop at live buildings, and destroyed buildings cease shielding later projectiles within the same tick.
- Reduced repeated projectile geometry and allocation work. Large construct groups use a spatial broad phase, grid queries use numeric coordinates, and weak-point/solid batches refresh immediately after hits. Rotated wall corners, shield precedence and sack destruction retain exact collision behavior.

### Validation and evidence

- Added progression smoke coverage for all 168 timed class/mode/difficulty combinations and 42 Endless combinations: 2,436 deliberate fixture clears and 2,226 restored boundaries. Legal purchases, power caps, profile participation and Hard unlocks are checked; these fixtures do not claim human combat wins.
- An actual-deployment audit checks all sixty identities in 1,740 legal difficulty/roster/variant combinations against authored health and deadline rules. Full-loop damage uptime and final human balance remain open.
- Expanded isolated-process throughput fixtures to all seven classes and 8/16/50 clients, with preserved failing samples, optional Node CPU diagnostics and longer stress measurements. These localhost fixtures have zero rendered clients and do not establish hosted, WAN, device, endurance or final capacity acceptance.

## 2026-10-24 — Persistent profiles, mastery and remappable controls

### Progress that survives a run

- Added a local ProfileV1 menu with seven class mastery records, 100 XP per completed encounter, separate teammate rescue counts, discovered boss codex entries and personal/squad Endless bests by difficulty. Progress banks after each clear and remains after defeat or voluntary departure.
- Six clean ink insignia unlock through completed encounters or an earned Uncounted memorial. They appear beside the local survivor name and never change health, damage, coins, weapons or skills.
- Completing any full timed campaign on Hard unlocks Insane and Hellish in setup. Personal participation is recorded from deployment; a late join plus the optional secret cannot substitute for a missed campaign encounter. All six difficulties now execute online with server-owned coefficients.
- Profiles export/import as bounded, validated JSON and retain exact previous bytes before replacement. Repeated views and stale restored boundaries cannot double-award mastery or remove a memorial. Older campaign-only records are retained separately because they lack personal participation evidence.

### Input, accessibility and compatibility

- Keyboard/mouse actions and standard gamepad buttons can be remapped. Duplicate and reserved bindings are rejected; movement retains two optional keyboard bindings. Fire and interaction each offer Hold or Toggle, and blur/pause clears latched input. Touch and gamepad actions remain independent of keyboard key codes.
- The profile also carries locale, audio, display and accessibility settings. Profile navigation and control messages cover all fifteen locales. Existing boss mechanic descriptions remain localized; the newly surfaced background histories are explicitly marked English pending translation and native review.
- Protocol 13 adds opaque run IDs and personal progress to replicated state and saved boundaries. Local Practice saves from protocols 4 through 12 migrate with bounded validation; protocol-12 secret offers and Endless history are preserved. Signed online checkpoints stay strict. Seeded future schedules remain concealed.

## 2026-10-24 — Nine Endless exclusives and The Uncounted

### Playable content

- Added Hourglass Widow, Unlit Astronomer, Folded Man, Red Comet, Memory Taxer, Choir of Moths, Zero-Hour Conductor, Walking District and The Last Knocker, plus the optional Uncounted finale. All sixty authored identities now execute; fifty-nine participate in ordinary Endless selection.
- Endless guarantees three exclusive candidates before every fourth fight, uses readable opening candidates for its first three fights and keeps twelve completed encounters of identity repeat protection. Seeded bags retain unchosen candidates; previous clears become Brutal when selected again. The Uncounted never appears as a surprise Endless draw.
- New signatures use exact delayed fan replays, two dangerous orbits and a hollow safe orbit, one actual projectile reflection, three ordered dash trails, persistent numbered symbol history, curved physical moth ribbons, four visible beat-marked lane pulses, moving solid buildings with an exposed core, and a three-knock door sweep.
- A Normal-or-higher campaign with three Accord Breaks and no timeout records its victory before offering The Uncounted. Each survivor chooses individually; only those who accept enter, while others may bank and leave. Declining, waiting or losing the extension keeps that victory. Local Practice records preserve the clear and optional memorial; rehearsal launches and reward-time arrivals cannot claim the memorial.

### Art, audio and compatibility

- Connected 88 drawn boss/moth poses and eight props, including cleaner blank paper for The Uncounted and consistent empty hands for Folded Man. All nineteen native returns and exact requests remain preserved, including seven superseded whole sheets. Independent audits reconstruct the shipped pixels and verify transparent padding.
- Composed ten additional original themes, bringing the individual boss-theme library to sixty. All fifty previous music masters remain unchanged. Final human listening and physical-device mix approval remain open.
- Protocol 12 serializes seeded selection history, campaign banks, secret consent and participation. It shares analytical moving-block collision with prediction, publishes reflected projectile velocity under the same identity and migrates bounded local protocol-11 saves. Secret consent and visible symbol/beat instructions cover all fifteen locales; native-speaker review remains open.

## 2026-10-24 — Seven more bosses and Grand Raid

### Playable content

- Grand Raid is a three-fight route for one to sixteen survivors: two different regular bosses, then a reserved finale. Threat rises through 4, 7 and 10; skill budgets are 12, 20 and 27; nominal income budgets are 600, 1,400 and 2,400. Ossuary Works, Bell Foundry and Crown Crypt provide the three layouts.
- Added Chain Colossus, Ossuary Leviathan, Bell Triplets, Quarantine Heart, Crown Procession, City Eater and Last Breath Saint. The executable roster reaches 50 bosses across five modes, with an individual original theme for each.
- Counterplay includes breakable anchor pylons, three sequential rib openings, three independently visible interruptible keepers, neutral F-operated pump valves, four separate throne attendants, a 240-pixel bite escape lane, destructible core covers and shelters against inhalation. These objectives work with a solo class as well as a party.

### Art, music and rules

- Connected 72 drawn boss/keeper/attendant poses and eight props. All twelve returned natives and exact requests remain preserved, including the two superseded sheets. Independent audits reconstruct all selected sprites and verify their transparent padding.
- Composed seven additional original themes. The prior 43 music masters remain unchanged. Final human listening, full rendered motion, device mix and balance acceptance remain open.
- Protocol 11 shares Raid pull movement with client prediction and migrates bounded local protocol-10 saves. Online and signed recovery require an exact current version. Rib and core hits transfer one boosted hit without also crediting the body.
- The Leviathan checks its whole broad body against cover; interrupting a highlighted keeper disables that keeper beam. Defeating a throne attendant opens a five-second stop, and a neutral valve reverses one hose only once.

## 2026-10-24 — Twenty more bosses and Black Bell Pilgrimage

### Playable content

- Black Bell Pilgrimage now runs sixteen different fights from its own twenty-boss pool: fifteen regular encounters and one of three reserved finales. The playable roster reaches 43 identities, each with an individual original music theme.
- Added Pallbearer, Cinder Foreman, Canal Diver, Clockmender, Seamstress of Wires, Gravedigger, Ink Notary, Spore Beekeeper, Ice Custodian, Bridge Ferryman, Porcelain Mourner, Boiler Tender, Mirror Undertaker, Chalk Magistrate, Wire Harpist, Crow Shepherd and Ledger Leech, plus Mortuary Engine, Drowned Regent and Salt Patriarch finales.
- New counterplay includes destructible moving cover, stopped and restarted projectiles, removable fence anchors and swarm wedges, bounded ice drift, alternate bridge crossings, porcelain cover that splits, neutral pressure valves, harmless ghost copies, erased chalk walls, timed strings, actual crow flocks, cleansing circles and open salt gates.

### Art, audio and fixes

- Connected 168 drawn boss/crow poses and sixteen signature props. Thirteen clipped first sheets were replaced by complete smaller-scale sheets; all 36 native returns and exact requests remain preserved. Independent audits reconstruct every shipped pixel and verify atlas padding.
- Composed twenty new original themes with separate melodies, harmonic routes and phrasing. All earlier 23 music masters remain unchanged. Objective checks cover all 43 themes; final listening and device mix approval are still open.
- Protocol 10 shares ice drift and seal cleansing with prediction, preserves bounded local protocol-9 saves, and replicates frozen/restarted projectile velocities using the same identities. Fixed a route-income rounding error that could lose one coin.
- A guarded core transfers one boosted boss hit rather than double-counting the body. Warps reset the collision origin, moving cover stops at masonry, neutral salt holds delay the real next cast, and network signature cues copy coordinates without overwriting their numeric IDs.
- Fixed health-reducing mutations at the voting boundary: current health and maximum health now agree immediately, so authoritative recovery accepts the same valid state the player sees. The local service health endpoint now reports actual playable-content counts automatically.

## 2026-10-24 — An in-game development journal

### Added

- Open Changelog from the main menu footer to read dated updates without leaving the game. The build identifier stays visible in the menu and the journal.
- The game, repository changelog and GitHub Wiki changelog now read one history file. Older production records remain available in the source archive.

### Documentation corrected

- Rewrote the fifteen Wiki reference pages around the playable source build, removing contradictory checkpoint counts. Each page distinguishes working systems from planned features.
- The public playtest still serves its older two-class build. Updating the source and Wiki does not update that deployment.

## 2026-10-24 — Fourteen new bosses and Midnight Circuit

### Playable content

- Added Cradle Matron, Mold Alchemist, Bellringer, Stitchwright, Glass Surgeon, Ash Baker, Sluice Keeper, Last Stationmaster, The Lamplighter, The Anatomist, Plague Gardener, Grave Choir, Red Abbess and Vesper Judge. The playable roster is now 23 bosses.
- Midnight Circuit is a ten-fight run: nine different regular bosses followed by one of three reserved finales. Skill points reach 27 and nominal base income reaches 2,400 before the finale.
- Each encounter has its own counterplay: break nests or needles, rescue tethered allies, use ring gaps and lit pockets, avoid signaled trains, cut healing vines, silence individual Choir singers, neutralize the Abbess wave, or move to the safe arena half.

### Art, music and fixes

- Added fourteen original boss themes, 128 drawn boss/part/minion poses and eight signature props. The earlier nine boss music masters remain unchanged.
- Choir singers now have separate visible bodies and shared boss health; defeated singers stop their own attacks. Infirmary patients have their own sprites. Bakery loaves stop at cover before splitting.
- Protocol 9 shares current, pool and tether movement between prediction and the server. All fourteen new identities have real WebSocket encounter coverage; the full verification passed 171 tests, content checks, TypeScript and a production build.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/9db2c6e81823451c165466a7da1c2f2133c17374).

## 2026-10-24 — All seven classes and six different maps

### Playable content

- Added Tank, Mage, Engineer and Assassin alongside Soldier, Medic and Heavy. All seven kits execute their two abilities and ultimate, with 378 skill nodes, 63 specialization paths and 28 class weapons.
- Added six distinct traversable layouts: Gatehouse 1,600 Ãƒâ€” 1,000; Triage Yard 1,600 Ãƒâ€” 900; Ossuary Works 1,300 Ãƒâ€” 1,000; Sunken Chapel 1,400 Ãƒâ€” 920; Bell Foundry 1,500 Ãƒâ€” 850; Crown Crypt 1,240 Ãƒâ€” 880. Cover and spawn positions change with each map.
- Connected 52 additional item illustrations, 124 approved class motion poses and sixteen environment/construct props. Weapons, supplies, all specialization paths and mutations now have individual item artwork.

### Rules and verification

- Protocol 8 carries authoritative class kit state. Turrets, barricades, rescue charges, wards, stealth and shadow movement work offline and online. Arena selection, route rotation and prediction use the same geometry.
- Verified reachability for fifty spawn positions and five Accord pads on every map. The full pipeline passed 150 tests at this checkpoint.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/d51e6072649b4566263f7adddea6f66e2c504581).

## 2026-10-23 — A complete Quarantine boss pool

### Added

- Added Tollkeeper, Chain Marshal, Gate Widow and Black Ambulance. Their signatures use a reflected wheel, breakable chain anchors, rotating open shutters and an exposed driver after a charge.
- Quarantine Run now draws four different regular bosses and one reserved finale from its nine-boss pool. Added four themes and 32 drawn boss poses.
- Connected map selection and rotation, Brutal finale contracts and protocol-7 save compatibility. The full pipeline passed 133 tests at this checkpoint.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/0cc5b1b77d8670e8d40595b77dcf28b4983e6387).

## 2026-10-23 — More bosses, illustrated items and individual themes

### Added and fixed

- Added Carrion Courier, Ratcatcher and Quarantine Clerk with charge trails, bounded rat packs and a breakable sack, and ordered stamps that reopen a safe interior.
- Added 71 item illustrations, 32 boss/minion poses and five distinct original boss themes. Boss music crossfades and warning ducking are connected to combat.
- Endless uses every implemented identity before Brutal repeats and avoids immediate repeats. Brutal threat labels append +. Fixed fractional weapon cadence and reused collision query buffers. Protocol 6; 124 tests passed.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/9a2ed8a).

## 2026-10-23 — Lantern Warden and Heavy

### Added

- Connected the Lantern Warden signature, rotating safe gap, phases, Accord breaks and Brutal variant to actual encounters. Added 27 Warden motion frames.
- Made Heavy playable with Suppressing Cone, Braced Firing and Foundry Overture, four weapons, 54 skills and 32 drawn run frames.
- Added compact projectile waves and compatible local boundary-save migration. Protocol 5; 108 tests passed.

[Source checkpoint](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/commit/d107454).

## 2026-10-23 — First playable expedition

### Foundation

- Implemented the shared 30 Hz offline/online combat loop, Soldier and Medic, Hollow Constable, revives, Accord, concealed contracts, mutations, prerequisite-aware skills and authoritative purchases.
- Added public rooms, private codes, sixty-second reconnect reservations, offline boundary saves, keyboard/mouse, gamepad and touch controls, fifteen language catalogs and original synthesized audio.
- Published the earlier anonymous protocol-4 playtest. Its two-class content is an older deployment and does not represent the current local build.

## Still in development

- All sixty-six boss identities execute in Standard, Brutal and Crazed forms. Seven survivors have complete selected basic motion and 21 ability transformations. Bespoke special-ability/boss action production, transformation animation, final encounter tuning and rendered/device acceptance remain unfinished.
- Local mastery, cosmetics, profiles and remappable controls are implemented. Native-language, physical-device, human listening/gameplay, full-progression endurance and full capacity acceptance remain open.
- An unsigned Windows/offline/LAN development download is published with exact artifact evidence. Physical second-machine LAN and final coordinated browser/Windows release acceptance remain open.
- Verified public rankings and durable deployed recovery remain unfinished. Bounded compressed transfer passes a fifty-build local HTTP/restart fixture; maximum-entropy histories still require paging.

[Earlier production history](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/history/CHANGELOG-2026-10-24.md). Historical counts describe their own checkpoints.
