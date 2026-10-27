# Pauseable boss guide and Chain Marshal’s Shifting Writ

Build **2026.10.27-shifting-writ**, protocol **28**. This combines the requested manual hint/pause fix with the seventh individual original-roster quality implementation. Roster stays 66 identities;85 new ordinary identities and 53 original quality passes remain. All previous art/audio files remain.

## Reading without losing the fight

Latest frozen 5192 feedback says the automatic boss hint covers too much of the field. Both the phase paragraph and full signature instructions now live in a closed-by-default Boss guide dialog, opened from the combat HUD. The text remains available during current testing. Close controls and Escape return to combat; long text scrolls inside a bounded panel. Focus returns to the opener and stays within the dialog while reading. The ordinary phase-entry banner, health, grade and timer remain visible gameplay signals.

Solo pauses the actual worker and drawing scene while the guide is open. The worker clears held/pending input, resets its accumulator and acknowledges a frozen clock; resumption does not catch up elapsed time. Local controls/prediction clear too. Guide and manual-menu pause are independent reasons: closing the guide cannot resume a manually paused run. Backgrounding still establishes the existing manual Solo pause. Online combat continues with a clear notice and neutral local input; one player’s guide cannot stop their peers.

Five guide controls/notices are authored in all fifteen locales. Final availability is optional Baby-only, behind a tested explicit policy. The current unfinished build deliberately enables all-difficulty testing guides; coordinated final release must disable that testing switch. The previous instruction request is superseded by the new manual-display request, not by removing the text. Rendered, device and native-language acceptance remains open.

## Held Line and Shifting Writ

Chain Marshal keeps grade 2-,150-second Standard deadline, original base health/damage/attacks and 90/180 Standard/advanced anchor health. The baseline across 72 map/difficulty anchor samples found nine overlaps with masonry, seven fully inside. Bounded connected-grid placement now finds two clear, reachable, separated numbered anchors. It prefers clear shooting lanes around the boss; in a narrow boss/body sight wedge it retains masonry visibility and reachable floor without silently omitting the whole pair. An anchor behind the boss body may require moving sideways to shoot. Lava, boundaries and full footprints remain excluded.

Held Line stays planted and warns two opposite locked 80-degree sweeps for 1.4 seconds; each is active 2.5 seconds. At half health Shifting Writ marks a 168-pixel lateral move after 0.7 seconds, using actual 58-pixel body collision at 78 pixels/second. A new obstacle can stop it early. The subsequent pair still receives complete new tells. ArmII begins 17 ticks after armI. Each surviving anchor pauses 0.4 seconds, locks a new target and warns for a full 1.4 seconds before a reversed return. Position/aim remain locked within each warning.

The warning is a finite polygon of 76 radial vertices clipped by real bounds/masonry at half chain width. During active contact, the live arm is bounded by both that exact polygon and current masonry. Added cover shortens it; removed cover cannot grow it past the warning. Matched player/arm sub-tick samples detect crossings with one shared half-second target budget, retaining 9 base contact damage. RomanI/II, direction arrows and leg marks identify arms and returns. Recovery 0.8 seconds Standard/1.2 advanced plus a 1.5-second signature pause permits retained auxiliary attacks between sequences.

## Advanced barbs and earned cuts

Each advanced anchor warns two four-shot wings with a central gap. The shared rational budgets are applied once inside the owned controller: two opening anchors emit 40 Brutal/120 Crazed shots. Their 1.2-second warnings and locked trajectories remain separate from the moving chain, which can cross the projectile gap. Crazed retains the full Brutal sequence; later extra repeats add separately warned crossing angles. The late return adds another fully warned set.

Cutting one anchor cancels its arm, return and its own unreleased barb repeats immediately, while the other continues. Already flying shots remain. Anchor damage credits only actual remaining HP; repeated cuts cannot farm damage. Two anchors,76 vertices each, at most 32 owned barb groups/eight angles each and the existing 4,000 hostile cap keep queues finite. Phase/stagger/assistance/encounter cleanup removes geometry and pending owned repeats.

Existing casting poses, Iron Jurisdiction score and priority phase bell remain. New walking/action art and final listening/rendered/balance acceptance remain future work. Fifteen phase/name/help catalogs follow actual clocks. Protocol 28 migrates only known issued protocol 27 local Practice/profile content, retaining exact form/build/run history; online/signed state stays strict.

Evidence belongs under `reviews/shifting-writ-2026-10-27/`. Actual map-placement, damage, controlled-emission, cleanup, prediction, offline-worker and owner/observer tests are distinct from final human balance. Stationary invulnerable sequence samples do not prove rendered/device/FPS/WAN/capacity/full-progression acceptance. The full development goal remains active.
