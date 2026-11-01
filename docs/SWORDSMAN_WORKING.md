# Swordsman development notes

The sections below preserve the initial continuation state. Subsequent work added all28selected run/action clips,18icons, actual cue selection, EN/ES/AR opening/English continuation, owned proofs, migration and real-peer transport. Live contracts are now in [SWORDSMAN](SWORDSMAN.md); the handoff records the latest verified/frozen state when available. A final gate is currently running. Whole-game completion remains unproven.

This is an uncommitted continuation of verified Bard source `61141f9a1c1cee3e2d0258d47308f2593121f6e9` / metadata `519cb40dd3e87155a9200b6f2bb3b39a9ff973d3`. The stable frozen Bard reviews remain at testing5304/backend2680 and public5305/backend2681. They still contain eight classes. No Swordsman release, final acceptance or whole-game completion is claimed.

The current working catalog/protocol class roster includes a **ninth candidate**, Swordsman / Dara Flint, with54nodes and four melee weapons. The former roster counts, progress metadata and verifier constants still need their final update. Do not publish the candidate as verified until the remaining integration and full gates pass.

## Implemented candidate core

- `src/shared/sword-rules.json`, `sword-geometry.ts`, `swordsman-kit.ts` and Game integration: finite covered blade sectors, a three-tick primary commitment, Q windup/advance, physical frontal projectile interception with a three-shot quota, one earned counter opening, bounded empowered primary cuts, Return Step, Open Circle and Second Watch. Cuts lock aim; dodging cancels them without refund; old warnings/fields remain. One boss body/weak part per cut, plus bounded ordinary cleave.
- Shared status/cues, authoritative movement slowdown and nearest collision ordering. Cleanup follows inactive owners and encounter/end boundaries. No general invulnerability, ranged sword projectile or automatic ultimate damage.
- GUI Breath/recovery labels, melee weapon stats, class-specific supply/upgrade names, vector blade/guard cues and bounded original steel/cloth synthesis. Some class-specific item images and action presentation remain pending. Reload currently has no new recovery sound hook.
- One English Story lesson and an optional English Dara letter. The actual chapter proof uses Q's successful ordinary damage. Opening/continuation introduction and all-role chapter tests still need completion.
- Fifteen-language candidate class/ability/talent/resource/gear copy in `locales/source/swordsman.mjs`. `swordsman-locales02.log` passes all15catalog checks. Native-language review remains open. The old21talent rows now exclude both Bard and Swordsman before adding their separate messages, preserving original mappings.
- The last focused run passes25checks (13Bard,12Swordsman), including real Game cuts/parries, cover/barrier priority, counters, transformations and cleanup. `swordsman-tsc03.log` passes TypeScript. These are **not** a full release gate. The cover fixtures now own their custom obstacle arrays, preserving cached map data across tests.

## Art candidate

Built-in imagegen produced `assets/production/generated/swordsman-2026-11-01/dara-selection-v1.png`, `dara-four-view-v1.png`, and edited `dara-four-view-v2.png`; exact prompts are beside them. V1's west view omitted the sword; V2 restores a visible candidate sword. Both issued originals remain preserved. `tools/build-swordsman-art.py` records whole-image crop/scale/translation. Portrait body anchor585keeps the sword extent from shifting the face; directional boot anchors keep the blade from shifting the body. Delivered selection portrait and four normalized idle seeds/reference are integrated. None has rendered/human acceptance.

## Remaining before a playable verified checkpoint

1. Produce/inspect independent run, attack, hurt, dodge, downed and frontal-guard poses, thirteen core weapon/path icons and any class-specific gear/supply icons. Register every clip/delivery contract and actual action selection, including Q and guard. Preserve source prompts/inputs and all old art entries.
2. Finish Breath/canteen/equipment presentation and recovery cue; align all UI/tooltips with the actual melee rules. No gun projectile statistics should masquerade as blade reach. Add a clear class help string if needed.
3. Add Dara to the actual ensemble opening/continuation, update continuity/cast records and recalculate fresh/legacy English counts. All leads remain recent entrants to shared disciplines. Complete arcs remain open.
4. Preserve issued85c266d3Bard local saves/profiles without minting new Story proof; online authority remains exact. Verify negative cases and owned Swordsman practice/proofs. Add real peer transport and a frozen class-entry probe.
5. Update source catalog verifier for nine classes/486nodes/36weapons and real zero-speed melee weapons. Make analytical uptime assumptions explicit for melee. Update old roster/clip/journal counts without dropping behavioral assertions. Existing all-class network tests must respect Short/Story's8-player limit: Raid admits16 and Endless50; do not raise gameplay caps merely to fit the expanded roster into a test.
6. Update all live metadata once before the final gate: build/history, ledger items and `classExpansion`, narrative word counts/source, derived progress/changelog, README/wiki pages, class plan and handoff. Avoid stale duplicated current word-count fields; the checked report is the authority.
7. Full verify, exact source commit/push/CI, fresh frozen testing/public previews and all probes, draft PR14body, handoff/output guide and metadata push. Next unused planned review pair is5306/2682and5307/2683; check availability first. Standing approval covers verified branch pushes and PR14metadata. No production/main/Windows deployment or browser automation is authorized here.

The full development goal remains active. After this class, Summoner, Ranger and Alchemist remain required; further bosses, long story, persistent character advancement, optional arcs, voices/expressions and final review remain unfinished. Only the user decides completion.
