# Grave Accord continuation checkpoint

Current build: **2026.10.27-visible-shelter / protocol 25**. Read this page, [single-ledger progress](DEVELOPMENT_PROGRESS.md) and [implementation state](IMPLEMENTATION_STATE.md) first, then inspect actual Git/status/origin/PR #14 and exact current receipts. The previous [Appeal Circuit checkpoint](history/CHECKPOINT_APPEAL_CIRCUIT_2026_10_26.md) is archived byte for byte. The full goal remains active and the game is unfinished.

## Same existing checkout

Continue only in `C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)`, branch `feat/first-playable-loop`, origin `https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-.git`. Preserve all working tree/history and frozen roots/processes. No clone, worktree, delegation, main switch/merge, paid provisioning, replacement Site, mismatched backend deployment or contest submission. PR #14 remains open/draft; main stays protected at `c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1`. The GitHub connector has a transport error; scoped repository tooling supplies its missing capabilities without exposing credentials.

## Current content and human steering

- **66 playable identities: 65 ordinary plus one secret; 85 new ordinary identities remain.** Individual original-roster quality implementations remain **5/60**, Constable/Warden/Courier/Ratcatcher/Clerk; **55 remain and human accepted 0**.
- Seven classes, 378 skills/63 paths, 28 weapons, six maps, five modes, 21 purchased ability transformations and the optional default-off all-54 skill map are implemented. Profiles/mastery/cosmetics/remaps and the consented bank-safe secret remain implemented.
- Selected motion remains 1,542 poses; 66 boss themes plus City Wake, 67 MP3 deliveries. All existing assets and the other 65 boss definitions are preserved.
- Human review of frozen 5189 found the Clerk order and later safe III clear enough, but its benefit was undiscoverable. The previous fan waited until shelter expired. The new [Visible Shelter follow-up](CLERK_SHELTER.md) fires from the two red seals while the green seal is open, with complete fixed warnings, a shield glyph, countdown rim and actual interception marks. Human comparison remains open.
- **Latest explicit instruction: KEEP the current boss instruction paragraphs visible for development testing.** Before the finished product remove automatic fight instructions except for an optional default-off Baby-only setting. Record this as a release gate; do not hide instructions now or claim the future toggle implemented. Mechanics must also teach through visible behavior.
- Protocol 25 carries forward only the known protocol 24 local Practice/profile revision; older bounded migrations remain. Unknown and online/signed states stay strict.

## User difficulty and presentation rules


- Combat revival: Baby 100%, Easy 50%, Normal 25%; Hard/Insane/Hellish disabled through every source. Between-encounter recovery remains. Hard+ cannot buy or consume kits.
- Phase-circle assistance: Baby/Easy **Standard only**, six/three circles and two/three-second holds, at most three simultaneous occupants. Normal+ and every advanced form have none. Intrinsic earned boss weak points are separate.
- Baby adds two real cover props per map; Hard keeps half, rounded down; Insane/Hellish have no interior cover. Bounds and boss structures remain. Hellish lava has a three-second opening warning and deals 24 damage per second in half-second hits.
- Insane forces Brutal; Hellish forces Crazed across openings, offers, repeats and the secret. Lower-difficulty Practice permits all three forms. Fixed grades use -- / - / no sign / + / ++; B/C markers are separate; secret >10.
- Brutal ordinary emissions use a 2.5x budget; Crazed uses 7.5x Standard. Warned repeats retain trajectories and gaps. Controlled clock/drone shots retain pause/resume/source cancellation. Pending work is bounded to 3,072 shots/128 groups; the live hostile cap is 4,000. Cancellation and safety can reduce actual totals.
- Brutal adds warned pursuit marks/crosscuts; Crazed adds faster marks and delayed perpendicular weaves. No instant kills are implemented. Crazed inherits the full Brutal signature and its 2x health/damage, 1.5x deadline and 1.75x bounty. Warden active cones retain their clear trailing space.
- Entry threats 1–2 have two half-health phases; higher threats have three Standard/four advanced phases. Gatehouse is 1344x840, Triage 1376x774, Chapel 1260x828 and Foundry 1350x765. Ossuary 1300x1000 and Crown 1240x880 retain their routes. Paint/collision/spawns share transforms; survivor speed, dash and hitboxes remain unchanged.
- Separate boss name/grade/form/phase/timer, segmented health, a distinct priority phase bell and reduced-motion-aware entry animation are implemented. Effects volume and warning ducking remain. Insane global health is 1.25x, Hellish 1.2x; Normal health is unchanged.

## Verification and publication

Current follow-up receipts belong under `reviews/clerk-shelter-2026-10-27/`; read their exact source/HEAD and local/CI evidence. Earlier 539-test source `85e7a49` passed both jobs. Its later metadata HEAD `ffbef29` had a direct-CI LAN readiness race (538/539 pass), while its PR job passed. The test now waits for the initial authoritative player patch; no production Session behavior changes. Preserve the old failure receipt and evaluate new evidence independently.

`docs/development-work-ledger.json` remains the single progress authority. `tools/sync-development-progress.mjs` derives local/Wiki/in-game progress; `src/shared/update-history.json` drives synchronized changelogs. Publish exact 18 committed canonical pages and 34 images through the existing `.wiki-checkout`, then verify all Markdown/image blobs and public image hashes using `tools/verify-wiki-publication.mjs <sourceSHA>`.

Use bundled Node 24/pnpm 11.25.0 and Python/Pillow 12.3.0; `pnpm verify` is the full software gate. Node: `C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`. Use `python -X utf8`, `git -c core.bare=false` and authorized elevated writes/build/network in this OneDrive checkout.

## Preserve frozen previews

Preserve every earlier root/process, including 5174–5189. Frozen 5189 remains source `85e7a498ceb0138b3b7c59cd479fbc2caf333dd0`, PID 42724, in `work/playtest-appeal-circuit-85e7a49` beneath the existing task workspace. A new preview must use an unused port and copied exact production bytes. Static previews use Solo; no matching permanent backend is deployed. Exact new-source preview receipts are recorded separately after verification.

Browser control remains disabled: do not retry or bypass it with CUA/CDP or another route. Raw HTTP/hash/software checks do not establish rendered, physical-device, native-language, listening or final human balance acceptance.

## Remaining goal and release gates


- Create 85 new ordinary identities with distinct mechanics, art, individual original music and fifteen-locale help; complete 55 remaining individual quality passes.
- Complete special/action art, actual walking/transformation/ability presentation, and final human balance/listening/native-language/physical-device acceptance. Review and tune the 21 implemented transformations and optional tree.
- Verify active mixed-progression 8/16/50-player, WAN/full progression endurance and 49-scripted-plus-one-rendered hostile-load gates. Historical one-hour 50-client evidence is frozen-source local continuous combat with zero rendered clients.
- Durable hosted recovery still needs participant credentials, maximum-entropy histories/paging, departures, storage/owner acceptance and deployed rankings. Normal recovery writing remains disabled; read its detailed handoff before enabling it.
- A coordinated Windows/browser release needs a new tag/name and full validation. The public Site remains protocol 4. Immutable `dev-windows-20261024-1` remains protocol 13/source `52552c0d4465b918d7cde2ab3c2aa7f1d7eb045e`. Source/Wiki pushes do not redeploy either. No final release, merge or submission is claimed.
