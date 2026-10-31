# Testing and public builds

Current source **2026.10.30-shared-network/protocol 43**: Equipment and skills show different painted images when no item is selected. The shop and player status use matching equipment-case, coin and field-manual artwork with written labels. Valid room-code lookups and admissions allow a full group sharing one connection to join and retry, while wrong-code guesses keep their separate limit. Opening your own result reuses its first roster page; loading more results keeps one own row, and a mismatched difficulty cannot inject a recent result. [Current review](../reviews/shared-network-2026-10-30/checkpoint-source-review.json). Testing5262/public5263 and the matching native review are separate from the older hosted releases.

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
