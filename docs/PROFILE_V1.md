# Persistent profiles and controls

Build `2026.10.24-profile`, protocol 13. The profile is local Practice data. It carries no trusted combat values and never enters the ranking service.

## Earned progress

The shared authority records each survivor's first deployed encounter, personal completed encounters, teammate rescues, campaign participation at the victory bank, and unique defeated boss identities. Waiting arrivals receive no clear. Channel rescues, the revive supply and Medic resurrection credit their actual rescuer; a solo self-revive does not credit cooperation.

Each completed encounter awards 100 class mastery XP. Rescue counts are separate. Class watch ranks use 0/5/15/30/60 clears. Profile insignia use total clears across classes at those same thresholds; a sixth insignia requires an earned Uncounted memorial. All six insignia are authored SVG ink marks. The selected mark appears beside the local survivor name and changes no combat geometry or attributes.

Any full timed campaign on Hard unlocks Insane and Hellish in local setup. Full participation requires deployment from encounter zero and the entire route's personal clear count at the campaign bank. A late join followed by the secret cannot replace a missed encounter. Accessibility choices do not change eligibility. The room always computes its own difficulty, health, currency, skills and inventory. These local unlocks are not an online identity or anti-cheat system; current online sessions remain unverified Practice.

Mastery is saved after each clear, including Endless clears before a later defeat or voluntary departure. Personal and squad Endless bests are grouped by difficulty. Squad best describes the team's completed count witnessed in the session; personal best counts only that survivor's clears. Campaign banking and individual secret entry preserve earned progress even when the optional extension fails. Only eligible secret entrants can earn its memorial.

## ProfileV1 and replacement

`ga-profile-v1` stores schema/content version, Practice/unverified markers, locale, display/audio/accessibility preferences, keyboard/mouse and gamepad bindings, hold/toggle preferences, selected insignia, per-run receipts and retained legacy campaign records. Opaque room/solo run IDs identify receipts without exposing an online seed or future contract schedule.

Receipts use a `(runId, playerId)` key and monotonic high-water counts. Repeated patches, reconnects and older restored boundaries do not double-award completed-encounter XP or remove a memorial. A replayed branch may discover a different boss story without duplicating already counted mastery. New runs begin with their own normal class stats and budget, irrespective of the profile.

Import parses and validates the entire document before writing. Unknown power fields, impossible participation, duplicate receipt keys, invalid cosmetics, conflicting bindings, unsupported versions and oversized input are rejected. The limit is 2 MiB of UTF-8 and 10,000 run receipts; exhaustion reports a save error and preserves the old profile. Export produces portable JSON. There is no silent pruning of earned progress.

Before replacing an existing primary value, storage preserves its exact bytes under `ga-profile-v1-backup`. A failed backup or primary write leaves the primary unchanged. The profile menu can restore a valid backup, including when the primary is corrupt. Importing a valid replacement preserves even corrupt prior bytes for diagnosis. Automatic progress/settings writes never silently replace an unreadable profile.

Existing language/settings values migrate. Earlier campaign-only records remain portable and visible as legacy history; their missing personal participation data is not invented, and they do not infer mastery or a Hard unlock. Local solo protocol-4 through protocol-12 checkpoints migrate under bounded validation. Protocol-12 secret offers, consent and Endless history survive migration. Signed online checkpoints require protocol 13 and are never migrated as local Practice saves.

## Controls and language

Settings supports two keyboard/mouse bindings per action, standard gamepad button remapping, and separate Hold/Toggle modes for fire and interaction. Keyboard conflicts, repeated aliases and reserved navigation keys are rejected. Gamepad sticks retain their movement/aim roles; standard buttons 0–16 can be reassigned without duplicates. Physical codes and button numbers are displayed directly.

Touch/gamepad events dispatch canonical actions, so changing keyboard Q to another action does not change a touch Q button or gamepad ability. Toggles reset on blur, pause and blocked input. A held controller button must be released before rearming after a clear. HUD ability/supply hints and tutorial bindings follow the selected mapping. Toggle revival has its own localized instruction.

Profile/control messages cover all fifteen locales with key/placeholder parity. Existing mechanic descriptions and survivor lore remain localized. Newly surfaced boss background histories are explicitly English with `lang=en`/`dir=ltr` pending translation; translation coverage and native-speaker acceptance remain separate.

## Evidence and limits

`tests/profile.test.ts` covers participation, conservative legacy handling, migration, stale saves, replay branches, Hard unlocks, cosmetic constraints, import/export, oversized data and write failures. `tests/profile-network.test.ts` exercises all six difficulties and progress replication over real WebSockets and verifies that profile-authored power/seeded schedules do not enter authority/view state. `tests/controls.test.ts` routes mocked EventTarget keyboard/mouse/touch/gamepad inputs; it is a unit fixture, not a browser playtest.

The complete pipeline and exact source/build hashes are recorded in `reviews/runtime-verification.json`. Browser control remains disabled in Work settings; no new rendered acceptance is claimed. Native/controller/device, human accessibility and language review, final balance, full art, verified deployed rankings/recovery and desktop release work remain open.
