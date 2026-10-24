# Acceptance ledger

The implementation plan is approved. Status entries below report observed completion. Full runtime and release gates remain in IMPLEMENTATION_BACKLOG.md.

Latest art/UI checkpoint: five native portraits are integrated with class locks preserved; 29 static poses are normalized; an eight-frame Warden attack study and local art room have structural and assistant browser evidence. Full animation/encounter/in-engine approval remains pending. Browser review includes desktop and phone viewport emulation, followed by a later disabled-control interruption; no new completed match/device/performance pass is inferred. See [ART_NORMALIZATION_AND_MOTION.md](ART_NORMALIZATION_AND_MOTION.md).

| Area | Target | Observed state |
| --- | --- | --- |
| Design content | 7 classes / 378 skills / 28 weapons / 24 mutations / 6 arenas / 60 bosses / 7 ultimates | Authored and strict source checks pass |
| Balance | Finite economy and prerequisites, legal mutations, analytical timer feasibility | 2,255 legal mutation sets and 16,716 analytical campaign/raid boss/build rows pass; actual combat tuning remains pending |
| Gauntlets | Distinct route pools, no campaign repeats, regular Endless exclusives | 4,000 seeded timed runs and 40,000 Endless encounters pass the design acceptance model; live voting integration remains pending |
| Endless | No final round; solo/private/public to 50; ongoing votes/shop | Uncapped two-class Constable prototype with exact ten-encounter power normalization; expanded boss/modifier integration remains pending |
| Localization | 15 locales with complete UI and content text | 1,491 keys per locale and 1,200 required content keys pass; runtime language menus and Fontsource bundling implemented. Earlier 15-locale phone class layouts reviewed; current desktop Latin typography reviewed, shaped scripts/full scenes/native review pending |
| Art | Eight proof sets and motion inspection, cleaner finish references | Assistant visual review passed; two original eight-frame atlases retain their browser motion evidence. New seven-survivor and six-boss finish references pass native and static gameplay-scale inspection; new production animation and live hazard review remain pending |
| Audio | Two loops and original sound bank | 2 arranged loops, 8 stems and 25 SFX; 35 WAVs pass objective and deterministic regeneration checks; human listening/runtime mix pending |
| PDF and packet | Illustrated full bible and portable source packet | Historical v0.1 and v0.2 artifacts remain sealed. Stage 1 v0.2 has 72-page PDF and verified archive/source/fresh extraction/normal-copy evidence. Current v0.3 source has not been issued as a new sealed packet |
| Playable loop | Two-class complete offline/networked loop | Soldier/Medic, Gatehouse/Constable, votes/shop/skills/revives and local recovery implemented; 74 tests, TypeScript and production build pass. Eight supplies and capacity queue implemented; desktop assistant UI/phase/wall/sprite/supply review exists. Signed serializer/authenticated HTTP/SQL/journal tested locally, including actual process restart; participant binding and deployed recovery pending |
| 50-player gate | Active gameplay and rendered client with measured traffic/performance | Historical 49+1 lifecycle/server metrics and rendered baseline exist. A protocol-3 pooled 4,000-hostile foreground render sample passed locally; protocol-4 server repeat passes p99 at 19.772 ms; current foreground FPS, phone and free-host gates remain open; full gate not passed |
| Full game | All content/routes/difficulties/modes | Pending |
| Human tests | Pacing, feel, teamwork, device and native-language review | Not performed |
| GitHub | Source, Wiki, Project, protection, releases | Fifteen runtime-updated Wiki pages verified against canonical Git blobs; Stage 1 release published; active main ruleset and passing verify checks recorded. One Project and 12 issues exist. Runtime PR 14 is draft; per-item Project field verification remains pending |
| Delivery | Windows, public URL and matching final release | Anonymous two-class Practice URL published and assistant-reviewed; portable Windows and matching full-game release pending |

## Art production completed this round

Five four-direction survivor references and three new individual boss pose studies are saved: 20 views/nine poses, selected from seventeen preserved generated natives. Heavy/Tank/Mage/Engineer/Assassin and Lantern Warden/Ratcatcher/Quarantine Clerk have assistant native and 1x/2x static readability review on quiet ground and an explicitly illustrative hazard overlay. Exact prompts, generated originals, revision decisions, workspace copies and hashes are recorded. These are static references, not completed animation, implemented gameplay, browser/device evidence or human approval. See [ART_PRODUCTION_PROGRESS.md](ART_PRODUCTION_PROGRESS.md) and reviews/art-production-2026-10-23/inventory.json.

The user prioritized this work and asked to stop browser troubleshooting. Continue art/animation and content work in the same folder; keep unverified first-loop/device/recovery gates open. No new playable class or boss is claimed from these sheets. The runtime checkpoint f194746 passed both GitHub verify checks and local 74-test verification; newer art-only changes do not alter runtime source.
