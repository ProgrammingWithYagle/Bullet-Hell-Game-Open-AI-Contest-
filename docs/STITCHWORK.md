# The Stitchwright — sewing room encounter

Development build **2026.10.31-stitchwork**, protocol **44**. This is the thirteenth implemented original-boss quality pass. The roster remains 66 encounters. Public Site version 4 and its protocol-43 backend are separate, unchanged releases.

The Stitchwright now fights through sewing techniques. A short, harmless approach moves the existing character toward the survivors before a new attack warning locks. This reuses the eight existing action poses and original theme; it does not add or claim a new drawn walk cycle.

| Phase | Technique | Response |
| --- | --- | --- |
| Basting Line | Two shootable needles lay a locked thread; the dashed warning becomes a damaging solid stitch. | Step away or destroy either needle. |
| Backstitch | Surviving needles repeat the stitch after a fresh 1.4-second warning. The original rescue tether also appears. | A cut needle stays cut for the return. Shoot the tether or hold Interact beside it for one second. |
| Closing Hem | Four moving needles pull three sides of a hem inward. The fourth side stays open, with an arrow leading to clear floor. | Leave through the opening or destroy a needle to remove its connected edges. |
| Last Alteration | The fourth advanced-form phase adds a second, separately warned hem after the first ends. | Read the next opening and keep moving. |

Normal has three phases; Brutal and Crazed have four. Brutal introduces backstitches in its opening phase. Crazed adds an independently warned crossing stitch, selecting another visible survivor where possible. A crossing follow-up waits until the whole hem sequence ends, preserving its open escape route. Needles have 36 / 45 / 54 health in Normal / Brutal / Crazed. Thread contact deals 14 base damage, then the existing difficulty, threat and form scaling; each stroke has a single contact budget per survivor. Dodge invulnerability and armor remain authoritative.

Warnings lock positions when created. Destroying a needle immediately disables every connected live or pending thread. Full clear-patch placement, including a clear exit, respects actual map walls, bounds and lava; wall-edge placement handles narrow pockets that a regular grid misses. Moving seams use swept collision, and moving needles use relative projectile collision. Phase entry retains committed work; successful Accord interruption and defeat clear it. All cues, health and timing replicate through the existing world snapshot.

Elian Vey’s recovered history replaces the encounter’s one-line lore in the existing profile discovery. It follows the button jar, evacuation tags and a yellow sleeve from the infirmary to the gate. This adds story without introducing power rewards or changing the discovery requirement.

New phase names and help cover all fifteen catalogs. Their canonical provider is `locales/source/stitchwork.mjs`; the content source is `content/source/stitchwork.mjs`. `tools/update-stitchwork.mjs` updates the catalog, revision and small runtime help file; `locales/build-catalogs.mjs` rebuilds the complete catalogs. The tuning lives in `src/shared/stitchwork-rules.json`.

Known issued public-v4 local Practice boundaries and profiles migrate to the current revision without losing builds, names, controls or preferences. Historical local campaign records retain their original revision and remain unverified. Online checkpoints stay strict; new online clients require a matching protocol-44 backend. No production backend redeploy, public Site publication, paid capacity, Windows replacement or main merge is part of this checkpoint.

The targeted suite covers warning locks, one-hit strokes, needle severing, return warnings, changing hem geometry, open exits, fast sweeps, advanced forms, all 108 map/difficulty/form combinations, phase continuity, cleanup, localization and migration. A real host and observer verify identical moving geometry, needle cuts, host pause/resume and defeat cleanup. The full project gate also runs. These checks are software evidence; rendered gameplay, listening, native-speaker review, physical-device performance and final balance remain open. Browser automation remains disabled.

To try the encounter, open the current **testing** preview, choose a new Solo run and select **Stitchwright** as the opening boss. The Solo form selector can compare all three forms; equipment still works normally. Public builds retain their existing random-opener and guide restrictions.
