# Field Journal — replay goals and survivor letters

The Story expansion brings the journal to **22 personal goals and 66 cosmetic stamps**. Alongside the original nineteen goals, Story campaign clears use 1/3/7 completed personal runs; Story acts use the best personally started run's 5/10/15 clears; recovered endings use 1/2/3 distinct first-banked endings. Old views, partial fragments and late joins cannot manufacture earlier act or ending credit. All fifteen languages have the new guidance. Story goal preparation opens canonical setup review and waits for launch without writing a profile or granting combat power.

The original nineteen-goal implementation is described below; its 57 stamps and seven letters remain part of the expanded total.


Development build **2026.10.31-field-journal**, protocol **44**. Open **Field Journal** from Home. It is a menu page; no journal panel covers combat.

Nineteen personal goals offer three cosmetic stamps each, for 57 stamps. They give reasons to change class, finish another route, recover new boss identities, help teammates or extend an Endless run. None changes starting health, weapons, skills, currency, difficulty unlocks or verified online rank.

| Goals | First / second / third stamp | What counts |
| --- | --- | --- |
| Seven class field records | 5 / 15 / 30 clears | Personally completed encounters as that class, including clears banked before a defeat |
| Four campaign/Raid route records | 1 / 3 / 7 completions | Full participation from the opening encounter |
| Five ordinary-boss collections | One third / two thirds / complete | Distinct recovered ordinary identities from each existing route family, encountered in any mode |
| Keep the vigil | 10 / 20 / 40 clears | Best personally completed Endless run; late joiners receive no credit for earlier team clears |
| Leave no one behind | 5 / 20 / 50 rescues | Existing teammate-rescue credit; self-recovery does not count |
| Seven voices | 3 / 5 / 7 classes | Different classes used for a full campaign or Raid from its beginning |

The first class stamp recovers one original survivor letter. Seven letters show the survivors rebuilding parts of Lorn: Mara sets places at a table, Iona receives an ordinary supper invitation, Hux repairs a wooden horse, Bram hangs a door that opens from inside, Sable makes room for a pupil's name, Tamsin shares a pump repair and Vale finds a return address. Each letter stays behind an optional disclosure. The original stories are English editorial text, explicitly marked `lang="en" dir="ltr"`; the notice, goal descriptions and controls cover all fifteen languages. Native-speaker and rendered RTL review remain pending.

**Prepare expedition** opens the existing setup confirmation. It selects the relevant class or a less-played class, the relevant route, and random-per-encounter maps. A new profile gets Baby; profiles with completed encounters get Normal, visibly shown for review. The player can change settings before starting. Rescue goals prepare a private team room because Solo recovery does not satisfy that goal. No room is created and no network request is sent merely by opening or preparing a journal goal.

The suggested goal prioritizes nearby unfinished stamps. All other goals remain selectable. There is no daily expiry, streak reset, paid unlock or stronger starting build. The public audience retains random-opening boss selection and Baby-only optional guides; journal preparation does not bypass these rules.

Progress is derived from existing validated personal profile receipts. It has no new storage key or schema. The reader merges repeated copies of the same run/player monotonically, leaves the profile unchanged, and ignores legacy campaign claims. Existing profile observation retains banked progress across stale views and removes testing-modified runs; the journal follows those same records. Profile export/import carries the receipts and therefore the goals and letters. These records are local and unverified.

`src/client/field-journal.ts` owns accounting and suggested plans. `src/client/ui/field-journal.ts` owns disposable DOM controls. `locales/source/field-journal.mjs` is the canonical label provider; run `tools/update-field-journal.mjs` and `locales/build-catalogs.mjs` after changing it. `src/client/survivor-letters.json` contains the stories. The original complete-art, map and aiming rules remain intact.

Native controller and rule checks cover all goals, achievable completion, import round trips, no double credit, late joins, old claims, modified-run removal, safe preparation, private rescue setup, focus, disposal and catalog parity. The full project gate also runs. No browser automation or rendered/human/device/balance acceptance is claimed. Current local testing/public review identities live in `reviews/field-journal-2026-10-31/`; the published public Site remains version4/protocol43.

Unreadable profiles receive an explicit error and a route to the existing Profile import/backup controls. Reading or preparing a goal never replaces corrupt bytes with a fresh profile. Controls detached by filtering cannot trigger a later preparation.
