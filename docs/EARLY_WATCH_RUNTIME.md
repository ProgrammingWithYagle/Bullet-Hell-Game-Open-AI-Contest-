# Early Watch implementation

This page records the original Early Watch integration and its older frozen preview. Its later difficulty-pressure checkpoint was protocol16; current counts/rules/evidence are in [the continuation checkpoint](CHECKPOINT_2026_10_25.md). Build `2026.10.25-difficulty-pressure` used protocol16. The original integration checkpoint was protocol 15. Ashen Usher **1--**, Brass Toad **1-** and Ragpicker's Kite **1** are original playable identities. The roster is **63 (62 ordinary, one secret)**; **88** new ordinary identities remain. Existing-boss quality work remains 59; the seven class revamps /21 ability transformations and optional branching view are implemented with rendered/human review open. Counts come from the shared development ledger.

| Identity | Ordinary phases and counterplay | Extra Brutal mechanics |
| --- | --- | --- |
| Ashen Usher | Seating alternates two ticket-stand volleys; the final half-health phase combines crossed rows and repeated sweeps. The usher walks between calls. Destroying a stand cancels every delayed volley from it. | Third stand behind the target, delayed closing volley and final gapped-ring follow-up |
| Brass Toad | Drizzle has one locked hop and a wide-gap projectile ripple; the final half-health phase adds separated hops and a locked tongue lane. Landing circles deal actual damage. Destroying the drain plug cancels the tongue. | A delayed second ripple after each landing, tongue from the opener and three hops in the final phase |
| Ragpicker's Kite | Draft has one wind corridor; the final half-health phase has opposing corridors, a quiet center and staggered wing fans. The kite orbits between casts. Break a cloth pin to cancel its corridor. | Delayed diagonal wind corridor and a final gapped-ring volley |

Warnings lock origins, landing positions and directions before release. Props are placed clear of masonry, the boss body and each other, so the body cannot absorb shots aimed at an overlapped weak point. Phase changes and successful Accords reset the director, clearing outgoing cues. The existing global hostile-projectile cap still applies. Global difficulty scales pressure/resources; identity grades stay fixed.

Wind uses `earlyWatchMovement` on both authority and prediction, sums once, caps at 65 px/s and resolves movement through the normal collision path. Wind contributes zero during dodge and during a corridor's tell. Each corridor retains arrows and edges under reduced motion. Breaking a pin removes only its own force. The quiet central lane is 170 pixels between the ordinary opposing corridors.

## Motion and preservation

Thirty-six complete selected poses span nine four-pose clips. Six new version-2 Usher/Kite requests use portable repository references; their exact native returns, requests, component ownership and scaling records are under `assets/production/generated/early-watch-integration-2026-10-25/`. The original version-1 unexecuted requests, four Toad returns, rejected hop and partial packing history remain unchanged.

One scale per native is calibrated from its initial stance. Whole connected figures and every alpha-bearing source pixel are retained. Three new 512-cell atlases have twelve frames each. Four-frame defeats explicitly use frames 8–11 at five fps, hold the final pose and advance on world time. Toad lift follows the authoritative hop interval and translates the drawing clock to combat time; it does not alter collision. There are **1,502 selected runtime poses**, including eight retained proof-atlas poses.

Loading version 4 retains every version-3 reference and adds three exact live crops and three settled crops. Only the current/recent full boss atlases load; the two-atlas cache bound is preserved. `tools/verify-early-watch-integration.py` independently reconstructs native RGBA, source component ownership, resampling, atlas placement and every current fallback crop. This is file/math verification, not rendered animation acceptance.

## Music and language

Empty Balcony is an E-flat theatre waltz at 96 BPM; Rain in Bronze is a D-flat 7/8 hop phrase at 112 BPM; Thread Above the Street is an A-minor cloth-reed phrase in 5/4 at 84 BPM. Scores, phrasing, instruments and note events are editable in `tools/compose-boss-themes.py`. All earlier master WAVs remain byte-identical. The runtime has 63 individual boss themes plus City Wake. All 64 MP3 deliveries pass independent frame-count, SNR, DC, clipping and seam checks; human listening and browser/device decoding remain open.

All fifteen launch locales have individual names, complete signature/Brutal help and three named phases. Authorship remains AI-authored; native-speaker and layout review remain pending.

## Compatibility and validation

Protocol 15 keeps signed/online state strict. Local Practice can migrate only issued revisions, including the protocol-14 `43b7b284...` revision. Existing fixed-grade cards, player progress and run IDs survive unchanged. Unknown revisions, online payloads and newly invented old-version boss claims are rejected. Discovery bounds in saved progress and profile receipts follow the actual roster, preventing rejection after more than sixty discoveries.

Focused tests exercise all ordinary/Brutal phases, actual emissions and landing damage, weapon hits against all three weak-point roles, cancellation, all six map collisions, prediction parity, four-frame defeats, issued-save migration, real two-client replication and defeat cleanup. The full current pipeline and exact source/artifact hashes are in `reviews/early-watch-integration-2026-10-25/runtime.json` and `full-current.log`. Failed attempts remain in the same review directory. Automated evidence does not establish final balance.

Frozen preview ports 5174–5178 remain separate. The protocol-14 Constable response at 5178 still awaits human review. The protocol-4 public Site and immutable protocol-13 Windows development release have not been redeployed or replaced. Browser control stays disabled. Hosted recovery/rankings, WAN, mixed-progression load/endurance, physical devices, native-language, listening and final release gates remain open.

## Early Watch frozen development preview

The separate preview at **http://127.0.0.1:5179/** serves exact runtime source `bbf909ade44e595f025956783a4babd868b1840c`, protocol 15/build `2026.10.25-early-watch`. Its 1,666 files / 684,857,534 bytes match the verified production artifacts. Seventeen raw HTTP asset checks pass; the older 5178 index hash remains unchanged. Root: `C:\Users\yigal\Documents\Codex\2026-10-25\continue-grave-accord-in-this-same\work\playtest-early-watch-bbf909a`. Process receipt is `reviews/early-watch-integration-2026-10-25/preview-process.json`; inspect actual port ownership before touching it. Preserve this preview alongside 5174–5178. No rendered or human acceptance is recorded.

Choose New Run, any class/map, Solo and one Early Watch boss; keep global difficulty Normal and compare Standard/Brutal with equal choices. The 5178 Constable comparison remains independent.

Current two-phase pacing, difficulty assistance restrictions, warned repeats and arena rules are specified in [Difficulty and phases](DIFFICULTY_AND_PHASES.md). Limited manual 5179 feedback informed this response; its rendered/human balance acceptance remains open.
