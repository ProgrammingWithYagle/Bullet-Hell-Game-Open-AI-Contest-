# Phase feedback, Brutal identity and musical intensity

Build `2026.10.25-brutal-signals`, protocol 14. Human feedback found Hollow Constable slightly harder, which suits one of the easiest bosses, but phase changes and Brutal identity remained too subtle. This pass preserves Normal's early-boss role while distinguishing the form and explaining phase behavior.

| Phase | Normal | Additional Brutal response |
| --- | --- | --- |
| Patrol | Two locked volleys | Two delayed flank fans form a pincer |
| Cordon | Crossing fans; lateral flanking between casts | An open-ring follow-up changes the required response |
| Lockdown | Two gapped rings and pursuit | A third ring narrows the shared opening |
| Curfew | Absent | Three rings followed by a delayed flank pincer |

The runtime pattern planner is `src/shared/constable-signature.ts`. New warnings lock at cast creation, visible throughout the tell. The boss remains planted through the last delayed release plus recovery. Shared ring openings stay larger than 45 degrees in these authored patterns. Normal keeps its existing first volley count, speed, damage and tell. Fixed grade remains **1+**, or **1+ B** for Brutal. Successful Accords and phase transitions still interrupt outgoing attacks.

A static four-second edge treatment highlights real phase entry without flashing or a center-screen banner. A persistent short hint below the boss health bar explains each response, including distinct Brutal text, in all fifteen locales. Cordon uses lateral flanking rather than the original Patrol goal. Living Brutal sprites receive a muted red tint and four broken ground arcs; the text B marker is still present. Normal and settled defeat presentation clear the tint. Existing sprite/native pixels remain unchanged.

## Difficulty policy

Boss identity determines recognizable mechanics and fixed threat grade. Brutal is the explicit form that introduces extra sequences and its fourth phase. Global difficulty primarily changes speed, damage, density and available resources through the existing difficulty data. It does not silently replace the boss's mechanics with unrelated attacks. Telegraphs, navigable escape spaces and consistent classification remain readable across that scale. This is the adopted design direction, not a claim that all sixty bosses have completed the requested quality pass.

## Music

The existing sixty original themes and their WAV/MP3 bytes remain unchanged. A quiet live percussion layer follows each score's actual BPM and meter. Phase zero adds a restrained downbeat; later phases add midpoint and rim accents, while Brutal adds a syncopated pickup. It increases rhythmic activity rather than raising the user's selected music volume.

Deterministic original drum synthesis uses short envelopes, not external samples. The scheduler has an eight-voice bound and 180 ms lookahead; hidden, suspended or muted states cannot trigger a catch-up burst. The layer follows music volume and warning ducking and stops with the music. A four-section local WAV compares original, Patrol, Lockdown and Brutal Lockdown; its measured peak is below clipping. Objective checks do not establish human listening approval.

## Progress and verification

[Current progress](DEVELOPMENT_PROGRESS.md) is generated from the same structured ledger as the Wiki and in-game journal. It tracks implemented work and human acceptance separately. Three new original references are concept-only production; all sixty current boss identities remain playable, and the 91-new-ordinary-boss deficit is unchanged.

The full pipeline passes 382 tests, authored-content/localization validation, TypeScript and production build. Ten new regressions exercise actual Brutal warnings and projectile emissions, Curfew's common ring gap, phase-entry timing, localized instructions, persistent variant/reset rules, all sixty tempo bindings, deterministic bounded synthesis/scheduling, exact progress synchronization and concept/native/request hashes. Source and evidence are preserved under `reviews/phase-feedback-2026-10-25/`.

No new browser-rendered, physical-device, native-language, human listening or human difficulty acceptance is claimed. The previous 5177 frozen Practice build remains unchanged. Latest human feedback is recorded in the ledger rather than being treated as approval of changes made afterwards.
