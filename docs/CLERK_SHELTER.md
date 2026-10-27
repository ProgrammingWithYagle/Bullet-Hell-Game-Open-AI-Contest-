# Clerk — Visible Shelter

Build **2026.10.27-visible-shelter**, runtime protocol **25**. This follows the preserved [Appeal Circuit](CLERK_APPEAL.md) implementation and the human comparison on frozen 5189. The human could distinguish the seal order and later safe III, but had no reason to enter a safe seal. The previous auxiliary fan waited until the seal expired, so its projectile protection rarely mattered.

## A concrete reason to use protection

Each reopened seal now precedes two seven-projectile fans from the other red seals. The origins, angles and destination lock with the stamp set. Each fan warns for 1.2 seconds and releases 0.5 seconds after green protection begins. Seven evenly spaced angles span 1.15 radians, including one exact center shot per origin. Speed follows distance / 1.05 seconds, bounded to 180–500 pixels/second; base hit damage is eight and radius five. Tests check both seal choices and both placement sets at all 289 valid target samples: the central trajectory reaches the open rim before closure. Masonry can stop it earlier.

Protection lasts 2.5 seconds from reopening, requires the whole survivor body and absorbs actual hostile shots at its boundary. Players can keep firing from shelter or dodge in open ground. This adds no damage buff, bounty or offensive reward. Original base health, deadline, threat grade, stamp damage and all asset bytes remain. Normal stays an introductory encounter; final human balance is open.

The first phase still reopens I when III strikes. The late phase still patrols then reopens III after 0.4 seconds. Each advanced appeal gets its own pair of warned fans. Shared 2.5x Brutal / 7.5x Crazed budgets, finite delayed echoes and live caps remain; some later echoes can outlast the first shelter and retain their separate warnings.

## Visible cause and effect

The reopened seal has a shield outline and a retiring outer ring tied to its actual expiration. At an actual swept projectile interception, the authority emits a short static broken-bullet mark on the visible rim. Walls, barriers, constructs or exposed players encountered earlier prevent a false rim impact. The cue lasts 0.3 seconds and is capped at 48; it uses no particles, flashing or screen shake. Owner and observer clients receive the same warning and impact geometry. Phase/stagger/assistance/encounter exits clear queued fans and impact cues, while existing encounter cleanup handles live shots.

These are implemented drawing instructions and tested authority cues. Browser control is disabled, so no rendered readability or final visual/human acceptance is claimed.

## Instructions during development and in the finished product

**Keep current boss instruction text visible now**, as explicitly requested, so the user can inspect each encounter. Main HUD instruction logic is preserved. Fifteen source catalogs now explain how shelter blocks the follow-up volley and how its rim closes; native-language acceptance remains open.

Before the finished product, remove automatic fight instruction paragraphs except for an optional default-off Baby-only setting. This is recorded in the single progress ledger and Wiki as a release gate. No such toggle is claimed as implemented. The final encounter must teach through warnings, action and visible consequences, with phase/name/grade/health/timer cues retained.

## Continuity and verification

Known issued protocol 24 local Practice/profile state migrates to protocol 25, preserving exact player/build/form/run history. Earlier bounded migrations remain; unknown and online/signed state stay strict. A pre-existing LAN readiness test now waits for its initial authoritative player patch before reading class state; production Session behavior does not change.

Current receipts belong under `reviews/clerk-shelter-2026-10-27/`. Eight additional shelter regressions and the extended real owner/observer test cover timing, lock geometry, all sampled arrival windows, real protection/exposure, wall priority, cue bounds/expiry/cancellation, wire equality and exact migration. Roster and quality counts do not change. Software checks do not establish rendered/device/native-language/listening/final human balance acceptance. Preserve all prior frozen previews.
