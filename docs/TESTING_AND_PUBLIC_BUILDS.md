# Testing and public builds

Current development build **2026.10.31-glass-surgery / protocol 45** adds [Glass Surgeon's refraction theatre](GLASS_SURGERY.md) and the shared [General Sprint/Double Dash branch](GENERAL_MOBILITY.md), alongside [Stitchwright](STITCHWORK.md), [the Field Journal](FIELD_JOURNAL.md) and [Heavy/Tank shield paths](SHIELD_SPECIALIZATIONS.md). Original-boss quality passes are **14/60**, with **46** left. Boss/class counts remain 66/seven; the 378 class nodes remain plus two shared General purchases.

Game source `517472b3e1efda13500d35e0351b3a7fdb565b92` passes **1,010 tests, 0 failures**, TypeScript, all 15 catalogs, artwork, production build and 71 atlas contracts. [Exact-source CI passed](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41242002286). Current local review: testing **http://127.0.0.1:5280/** (backend 2656), public **http://127.0.0.1:5281/** (backend 2657). Each passes 52 served-file/catalog checks and real two-peer room/password/chat/host flows. [The current handoff](../handoff/NEXT_CHAT.md) and `reviews/glass-surgery-2026-10-31/` record exact identities and restart inputs. Earlier user previews remain available.

Published Site **version 4 / protocol 43** and its older backend are unchanged. Development clients need protocol 45 and matching content revision `fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b`. The user decides full-game completion; story, boss expansion and other features/polish remain open. Rendered/human/device/native-language acceptance and final balance remain open. The contest sections below retain their earlier release facts.


Earlier contest source **2026.10.30-shared-network/protocol 43**: Equipment and skills show different painted images when no item is selected. The shop and player status use matching equipment-case, coin and field-manual artwork with written labels. Valid room-code lookups and admissions allow a full group sharing one connection to join and retry, while wrong-code guesses keep their separate limit. Opening your own result reuses its first roster page; loading more results keeps one own row, and a mismatched difficulty cannot inject a recent result. [Current review](../reviews/shared-network-2026-10-30/checkpoint-source-review.json). Testing5262/public5263 and the matching native review are separate from the older hosted releases.

Both are development build targets. This distinction does not publish a new Site, change the immutable Windows build, or establish final release acceptance. Use `pnpm build:testing` for `dist/`; use `pnpm build:public` for `dist-public/`. The ordinary `pnpm build`/verification target defaults to testing. `VITE_GAME_AUDIENCE` accepts only `testing` or `public`; the compile-time constant reaches the main client and Solo worker. Build a matching room backend for online testing, with `GRAVE_TESTING_SERVER=1` only for local testing servers. The server defaults to public. The form selector is hidden for online rooms, where encounter/difficulty policy controls forms. Private lobby codes stay visible inside the lobby on compact views.

| Behavior | Testing | Public |
| --- | --- | --- |
| New opening boss/form | Explicit boss selection; form selector in Solo only | Authored random opening pool; difficulty forces advanced forms |
| Optional manual guide | Every difficulty | Baby only |
| Coin/SP tools | Solo pause menu only | Menu and command branch omitted |
| Instant Insane/Hellish unlock | Current tab's new runs | Normal earned profile unlocks |
| Name labels / room chat | Optional settings | Optional settings |
| Home Local Practice records | Actual local Practice records; Online boards status | Same honest records/status surface |

Testing tools set coins (0–1,000,000) and available SP (0–1,000), keeping already spent SP. Applying them marks the run modified, removes any local receipt for that run/player and disables the boundary checkpoint. A tab-only difficulty unlock does not forge profile clears. No room protocol exposes coin/SP editing, and a malicious testing-command room message is rejected. Tools do not create verified ranks. Unmodified local Practice records are still unverified.

Public workers ignore explicit opener/form injection. Public room creation/auth rejects a supplied opening boss; the client omits it after reading public server health. Existing saved boundary migration is separate from new-run selection. Real compiled-worker and real-network tests cover audience separation; inspect the final Vite public main/worker artifacts before release. Retained locale strings do not constitute an exposed menu.

Room chat is closed by default and can be disabled. The server assigns sender/name, limits plain text to 160 graphemes/512 UTF-8 bytes, rejects control/bidi formatting/markup, enforces a 1.5-second sender interval, and retains up to 50 messages in memory. Only subscribers receive messages; leaving cleans subscriptions/rate state. The panel uses text nodes, blocks local combat input while open and does not pause online peers. It is not a persistent message archive or an external messaging service.

Overhead display names are optional and use plain rendered text. Local Practice records is visible from Home, labeled as stored on this device, and filters actual validated receipts by mode/difficulty. The Online boards tab explicitly states verified boards are not connected. The authoritative hosted team-ranking finalizer, recovery and acceptance remain unfinished; see [leaderboard specification](LEADERBOARDS.md) and [hosting capacity](HOSTING_CAPACITY.md).

The First Watch presentation pass offers an optional gentle preset on Home. It prepares the existing Soldier/short/Gatehouse/Baby/Solo choices, stops at confirmation and spends no progression currency. New run retains full setup. The controls tutorial opens manually. Map previews follow selected-difficulty geometry; difficulty cards explain the experience and expose exact selected rules. Public boss selection and guide restrictions remain enforced by the compiled worker and room authority. See [Public polish](PUBLIC_POLISH.md).

The user confirmed the manual guide at 5193 works and has authorized browser testing. Guide illustrations remain future polish. Keep rendered/browser, headless, human, listening, native-language, physical-device and final balance evidence separate. Existing public protocol-4 Site and immutable protocol-13 Windows development release remain separate and unchanged.


## Contest checkpoint and next chat

The public-only contest version is live at https://grave-accord.yigallin0423.chatgpt.site (Site version 1, deployment appgdep_6ae53e3b91b481918641a344774aea2d). Its matching Free service is https://grave-accord-contest.onrender.com, with eight slots and one room. See the new-chat packet at [handoff/contest-checkpoint-2026-10-30](../handoff/contest-checkpoint-2026-10-30/README.md). Only the browser public audience was published; testing and the Windows public download were not published/replaced. The old Site under the other account remains separate.

This final request is a checkpoint boundary. Stop contest feature work after sealing the handoff. Start post-contest story, bots, classes or other major work only when the user gives the next chat a fresh direction. Preserve all original art, failed receipts, frozen services and packages. Browser automation remains disabled; recorded rendered/human/device/listening/native-language, balance, endurance and durable global storage limits remain explicit.
