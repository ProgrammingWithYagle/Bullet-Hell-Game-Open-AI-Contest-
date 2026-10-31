# Records

## Public contest version

[Play Grave Accord](https://grave-accord.yigallin0423.chatgpt.site/). Published October30,2026 as public Site version1, build2026.10.30-shared-network/protocol43. The game source is71fc34c; its matching server at https://grave-accord-contest.onrender.com supports public/private rooms, codes/passwords, chat, host controls and server records. The Free-host cap is eight players and one room. Its local SQLite data is lost on sleep/restart/redeploy; durable global records remain future work. Testing tools are not published. The older Site and Windows download remain separate.

The source passes943local tests and both exact-source CI jobs. Actual hosted room/password/chat/host/record smoke passes. Current rendered, device, native-language, listening, balance and full endurance acceptance remain open. [Handoff and exact evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/handoff/contest-checkpoint-2026-10-30).

Open **Leaderboards** from the home menu. **Local Practice records** lists runs saved on this device. **Team records** loads results from the selected game server. Choose a mode, difficulty and peak team size; all-time and weekly views stay separate. Expand a row to see everyone who joined combat. **Show more** loads another page; connection errors offer **Retry**.

A completed public-authority run receives one shared team rank. Leaving or disconnecting does not remove earlier combat credit. Solo practice, testing-server runs and modified runs do not enter team boards. Private room codes, connection IDs and reconnect credentials are never public record fields. Display names appear in the team history.

For a timed mode, only a completed base campaign qualifies. Its score combines speed, surviving teammates and health preserved, with one exact final rounding. Equal score/time/damage results share a rank. The base result freezes before the optional extra boss.

Endless boards compare bosses cleared, then time through the last clear, then damage through that clear. The eventual failed fight cannot improve rank by lasting longer. During a break, the host can choose **End this run** to finish and save. Guests cannot end the run. A run with no completed boss stays a local recap.

Records are written by the game authority to its SQLite file and survive process restarts when that file is retained. Desktop LAN hosts store their own records in the app data folder. A failed write leaves play running and retries the same final result while the room remains open.

These are **server records**. A shared deployed global board and durable deployed match recovery still require coordinated hosting and independent acceptance. Current local previews do not replace the older public Site or published Windows download.

[Scoring and storage details](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/LEADERBOARDS.md) · [Hosting and recovery](Hosting-and-Recovery)

## Larger-team software checks

Current local checks use real SDK clients with all seven classes: a full campaign with eight players, a private Raid with sixteen, and a three-clear Endless sample with fifty. They exercise earned purchases, equal-count votes, input, host pause/departure, replacement players, reconnect, shared results and persistence after restart. A fifty-player result retains fifty-one historical participants after turnover and loads its roster in two pages. These are isolated QA results with protected players and accelerated clears/deadlines, not legitimate public scores. There are no rendered clients. One earlier fifty-client join timeout remains preserved; standalone and sixteen-then-fifty instrumented repeats pass without changing timeouts or game code, and its cause is unproven. [Exact evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/multiplayer-progression-2026-10-30). Human, device, ordinary balance, full endurance and WAN/hosted acceptance remain separate.


Records tabs keep their separate choices while you compare device and server results. The online tab remembers mode, difficulty, peak team size and All time or This week. Tab changes and device-filter changes keep keyboard focus. Back ends unfinished requests.

## Groups sharing one connection

Current source gives valid room-code lookups and join attempts separate shared-IP budgets from wrong-code guesses. A full fifty-person group can join by code and retry without the previous thirty-lookup block. Wrong-code guesses remain limited to30 per minute; valid lookups and admissions allow120 each, and results reads allow360. These limits use the connection address rather than a submitted forwarding header.

Your own result reuses its first downloaded team-history page. Loading more results keeps it listed once, and changing filters clears that temporary reuse. A result from a different difficulty cannot appear through the recent-run shortcut. [Current software evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/reviews/shared-network-2026-10-30) keeps actual loopback SDK/HTTP tests and the fresh full progression check separate from physical Wi-Fi, WAN, hosted capacity or human acceptance. The historical fifty-client timeout still has no proven cause.
