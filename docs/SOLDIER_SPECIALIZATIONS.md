# Soldier specializations — Skirmisher development

**Current development:** source **d9abd98da876da7d5fb386e85e37f2ff232f9ff5**, build **2026.11.04-soldier-running-volley**, protocol **57**, passes **1,471 local tests**. All eleven remote steps per job succeeded and both decoded logs confirm 1,471 passes / 0 failures. The enclosing job/run conclusions remain pending in the captured API state; a completed CI pass is not claimed. See [exact-source push CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41861696260) / [PR CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41861726882). Fresh testing [5342](http://127.0.0.1:5342/)/2718 and public-interface [5343](http://127.0.0.1:5343/)/2719 each bind **2,018 files** and pass four native groups. Ready Round and Running Volley bring Soldier to seven early-to-late techniques in one Skirmisher region; other routes and whole-class assessment remain unfinished. The pathway roster has no fixed maximum for any class. Compare the expanded Soldier candidates next, starting with Marksman versus Sniper, and build one route at a time. Human/rendered/device/native-language/listening/motion/final-balance acceptance remains open. The shop and Campaign stay later.

Soldier remains the single Free Play class focus. Its seven techniques form one early-to-late Skirmisher region, not a finished Soldier class. The pathway roster has no fixed maximum. Foot Soldier, Marksman, Sniper and Hunter are active candidates alongside Officer/Command, Grenadier and Field Support/Logistics; their names and mechanics remain proposals. Compare mobile precision with prepared sniping next, then build one initial route at a time. See [SOLDIER_ROUTE_CANDIDATES.md](SOLDIER_ROUTE_CANDIDATES.md).

## Actual choices

| Technique | Access and cost | What changes |
| --- | --- | --- |
| Passing Shot | D-, 2 SP after issued 1-SP Clean Bore | A real Precision Burst opens 1.2 seconds for action 1. Hold movement to commit a legal 90-pixel step over 0.3 seconds, then fire a separate 15-base-damage piercing round along the committed aim. Base recovery: 6 seconds. |
| Crossing Advance | D, 2 SP, 5 earned SP, after Passing Shot | Commit forward along starting aim. Split the same follow-up damage between departure and arrival, aiming again for the arrival round. Excludes Rear Guard. |
| Rear Guard | D, 2 SP, 5 earned SP, after Passing Shot | Commit backward from starting aim. Fire halfway through and intercept at most one visible hostile projectile in a 96-pixel / radius-12 forward lane. Cover blocks interception. Excludes Crossing Advance. |
| Cartridge Drill | B-, 3 SP, 11 earned SP, after Passing Shot | Earn action 2: load up to four missing rounds individually while walking. Stop when enough rounds are ready and return to firing. Base recovery: 12 seconds. |
| Roving Chamber | A-, 3 SP, 17 earned SP, after Cartridge Drill | Keep the same finite drill running through a fresh burst and any owned step variant. Round count, loading times and recovery stay the same. |
| Ready Round | S-, 3 SP, 23 earned SP, after Roving Chamber | The first actual drill insertion opens 1.2 seconds to spend one magazine round on the owned step variant without E. Normal step recovery still applies. A ready normal burst follow-up takes priority and remains free. |
| Running Volley | SS+, 6 SP, 27 earned SP, after Ready Round; one capstone | A loaded step may use its opening during recovery. Finish the first paid step and actually insert three drill rounds, in either order, to earn one 0.8-second second paid leg. Each commitment costs one round and extends step recovery. |

The shared 27-SP budget and one-capstone limit remain. Route purchases compete with useful General support; more available pathways will not automatically grant everything in a run. In the recorded Short runs, Drill enters the third fight at 15 earned SP and Roving the fourth at 21; Ready/Volley enter the fifth at 27. Free Play grade gates create no Campaign learning, promotion or proof.

## Finite loading and causal movement

Action 2 defaults to B and remains remappable. The first round takes 35% of the current weapon's modified ordinary full-reload time; each later round takes 20%. Intervals are fixed when starting. At most four missing rounds can be inserted, without magazine overflow. Ordinary Reload remains the full-magazine operation. Drill's distinction is obtaining selected rounds sooner and stopping with completed work retained.

Held primary fire waits during Drill and resumes when work ends or the owner stops it. Press B again to stop even during recovery, without another charge or refund. Replacing an ordinary reload forfeits its unfinished work; elapsed reload time cannot become instant cartridges. Simultaneous Reload and B chooses the full reload. Walking remains available; sprint stays gated as during ordinary reloading.

A fresh E or successful C interrupts the base Drill; Roving Chamber permits both. Rejected C preserves loading. Dodge, ordinary Reload, positive health loss, weapon/ownership loss, disconnect, downing or phase exit still interrupts work. Fully absorbed shield hits do not. A full-magazine refill ends loading. Completed rounds and spent ability recovery remain; unfinished loading never restores at a safe boundary.

Ready Round requires an actual first insertion. Starting B, waiting without an insertion, ordinary Reload or an ultimate refill cannot create or renew an opening. A manually stopped Drill may retain an already earned short opening. S- paid use obeys the normal C recovery; Running Volley explicitly permits its paid alternative during recovery, extending recovery to at least one full scaled step recovery from the new commitment. There is no refund.

Running Volley's relay needs both the first paid step's actual arrival and three actual insertions from that same drill. Either event may happen first. Canceled travel cannot earn the relay, and an ultimate refill cannot stand in for the third insertion. The second paid leg cannot rearm it: at most two paid steps per drill. An independently legal normal E follow-up remains its original free operation. No extra hotbar input is added.

Readiness and finite drill proof clear on accepted dodge, manual Reload, positive health loss or owner/weapon loss. Health damage during committed movement removes relay proof while the issued vulnerable step may continue. All clocks freeze during pause, and Solo discards paused requests. Disconnect/downing clears unfinished work while retaining spent C/B recovery for rostered owners; phase cleanup remains explicit.

## Commitment and feedback

All variants test the whole body and swept path against bounds, cover and lava. Rejection spends no opening, cartridge or recovery. Brief ground/direction/ammunition feedback explains an actionable rejected request; a legal retry remains immediately available. The restrained route/footprint or cross lasts 0.35 seconds and is throttled to one per 0.4 seconds per owner. Negative visual identifiers do not allocate combat entities or alter their ordering.

The real body moves before projectile sweeps. Dodge, new cover, hostile slow/displacement or owner loss can cancel unfinished travel without a guaranteed arrival shot. Other projectiles, contact and fixed hazards remain dangerous. Rear Guard removes at most one visible projectile, not a volley or boss field. Neither free nor paid steps grant immunity, healing, shield, currency, SP, cartridges or extra dodge charges.

## Preserved identity and ownership

All 54 issued Soldier General nodes, four shared techniques, four Soldier weapons and their IDs/investment remain. Mara Rook remains the lead and Soldier a shared discipline. Q Rally Field, E Precision Burst and Last Roll Call keep their roles. Breach Cadence still delivers three E rounds at 0 / 0.12 / 0.24 seconds from the moving owner's actual position; Supply Line retains its bounded second magazine refill and 5/7 rally potency; Marching Colors retains its following Q field at 75% radius. These new purchases do not sell an owned operation again.

The catalog preserves all 648 issued class nodes, 36 transformations, 48 weapons, class/story definitions and 27 earlier specialization definitions. The dedicated total is 29: 22 Engineer and seven Soldier techniques. Engineer's three routes remain a scoped reference; three-route coverage is an initial milestone, not a ceiling or whole-class acceptance.

Protocol 57 / content d86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd admits exact issued56/833b5a88 local safe boundaries with their 27-technique whitelist before older guards. Issued55/da03a130 stays at25,54/d7aea7 at22,53/2bcf8d at14 and51/52 at8. Old ownership cannot invent Ready Round or Running Volley. Profiles retain twelve class labels, controls, both HUD layouts and history; Practice keeps its original protocol/content labels and never becomes online proof. Wrong editions, foreign/verified claims and forged ownership remain rejected. Server signatures/version/ownership stay strict. Unfinished action state does not restore.

The next content change must deliberately admit this exact issued57/d86d223b edition with its 29-technique/four-General whitelist, retaining every older bound.

## Tree, controls, art and sound

The authored map retains the early curved fork and extends the central loading path with two later positions. The General prerequisite, actual exclusions, arrow navigation, equivalent reading view, guarded purchase button and 20%–200% zoom/Fit remain. Inspecting never buys, and no proposed route is registered as an empty card. The initially closed owned-kit guide follows actual purchases and keyboard/alternate/gamepad remaps. The HUD distinguishes burst, loaded and relay openings while retaining the real authority recovery. Stop remains available during B recovery.

Public work/readiness cues follow the real owner and omit private weapon, interval, drill/payment and causal-proof bookkeeping. One/two small stationary chevrons distinguish loaded readiness and relay; there are no new full-screen effects. Painted cartridge-keeper and bandolier emblems match the five issued leather, walnut, iron and brass assets. Seven exact PNGs and prompts are in assets/production/ui/soldier-tree-2026-11-04/provenance.json. The five issued files/entries remain exact. Generated alpha sources were copied byte-for-byte and inspected natively at small sizes; no portrait or survivor sprite changed.

Two finite original readiness/rejection cues extend the unchanged footwork/loading samples. Thirteen new locale keys are explicit English pilot text, not completed translations. Local image and waveform checks do not establish rendered, native-language, listening or motion acceptance.

## Verification and limits

Final full-gate02 passes 1,471 tests and all seven configured checks: authored content/locales/story, TypeScript, 144 early-Campaign feasibility cases, headless/real-network rules, production client build and 71 encounter / 300 survivor / 60 companion atlas contracts. reviews/soldier-volley-2026-11-04/source-verification.json binds the exact runtime, source/test snapshot and raw log. Gate01 passed 1,469 tests before the rejection feedback; it retains that earlier runtime. Initial staging/type/fixture failures and all raw attempts remain labeled. No source changed while a full gate was running.

Each fresh review binds 2,018 files and passes four native groups: source-bound MenuDOM with ordinary Raid12SP/three real purchases/five owned inputs/remaps/seven served emblem hashes; full exact-served optimized Solo worker; mixed-class online peers; and HTTP/transport. Four worker cases exercise Ready without capstone and all three Running Volley variants, with actual primary/paid ammunition, movement, causal relay, pause and recovery. These late worker cases use controlled legal endless boundaries, not natural progression. The CI late peer fixture also explicitly supplies the legal late budget before real purchases. Fresh ordinary peers establish early loading/pause/non-host rejection/late observation/stop/host exit, not naturally acquired online capstone use. MenuDOM is a subset fixture, not full browser-main/render/layout acceptance.

| Normal / seed2209 / fixed Gatehouse policy | Result / clears | Seconds | Steps / paid / relay | Drills / inserted rounds | SP earned / spent | Matching safe restores |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| Ordinary full reload + General support | Victory / 5 | 130.300 | 13 / 0 / 0 | 0 / 0 | 27 / 27 | 18 |
| Ready Round + General support | Victory / 5 | 165.633 | 18 / 3 / 0 | 10 / 20 | 27 / 27 | 18 |
| Passing Shot + Running Volley | Victory / 5 | 167.600 | 24 / 10 / 4 | 11 / 32 | 27 / 27 | 18 |
| Crossing Advance + Running Volley | Defeat / 4 | 256.800 | 31 / 10 / 5 | 16 / 43 | 27 / 27 | 17 |
| Rear Guard + Running Volley | Defeat / 4 | 152.767 | 22 / 10 / 5 | 10 / 26 | 27 / 27 | 17 |

Twenty additional runs cover seeds3113/9027 on Gatehouse/Triage Yard. Both Advance and Rear win in some contexts; other trials lose, end before late unlock or perform no paid step. All losses remain. Final natural reports match all 25 measured rows from before the feedback, and the five restored pairs match all measured actions/timing/purchases/damage/outcomes. No resource/health injection, forced completion, deadline edit, invulnerability or score upload is used. The single autonomous policy conservatively estimates an18pixel body while the actual catalog player radius is9. Its decisions and differing General spending cannot rank routes or establish human fun/final balance. Broader twenty-scenario runs have no restored counterparts.

Both current frozen roots/backend and 25 older roots have verified hashes. Four current and 40 preceding exact live client/backend identities were checked; no cleanup or private upload occurred. Human enjoyment, rendered presentation, physical devices, native language, listening, motion, literary quality and final balance remain separate acceptance work.

## Continue this one class

Compare the expanded Soldier candidates before implementing the next route, starting with Marksman versus Sniper. Preserve useful solo/co-op decisions and issued rally/resupply transformations. Build distinct early identities, internal alternatives and qualitative late evolutions one route at a time, then compare whole legal Soldier builds and saves before Heavy. Add further fitting pathways; there is no fixed maximum for any class. Only the user decides when the full game is finished.

The per-weapon workshop, stars, sequential buying and shop redesign remain later. Every purchase needs a clear role beyond duplicate statistics. Campaign stays last: slow learned/proven/prepared progression, scarce resources, no SP/mutations and no rapid SS+ promotion. Service Yard stays its checked, unregistered 4-pass/1-fail WIP outside these 1,471 tests. Base-story prose remains 5,741 checked English words toward five million, excluding optional content/UI/translations; no complete personal arc exists.
