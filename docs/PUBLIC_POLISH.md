# Public polish

Make the existing game clear and enjoyable for someone playing for the first time. Prefer plain words and familiar controls. Keep the first-run preset, optional Tutorial, named shop items, readable setup choices and the same presentation in public/testing builds. Testing alone retains rehearsal tools.

## Current implementation

Build **2026.10.29-host-controls / protocol 43** includes character headshots, separate health/shield bars and resources, stronger waiting-room labels, room codes within menu flow, optional enforced passwords, confirmed chat with retained drafts, filled random-map pictures and full-art Small Wakes floor bounds. The accepted C toggle and scrolling upgrade footer remain. A five-second boss-defeat moment retains the actual position/floor and explains preparation with a countdown. Fifteen bosses have complete falling sequences; fifty-one have final defeat poses.

Hosts wait with their players and start manually. A chosen map remains fixed; the two random options choose once per run or before each encounter. Medic recovery, difficulty penalties and class starting shields follow [the current rules](MEDIC_RECOVERY.md). Online matches continue with menus open; Solo pauses. Current team records are server-scoped and authority-written; shared deployed global rankings remain release work.

The human authorized ongoing verified source, draft-PR and Wiki updates and asked that local files stay current. [Publication evidence](../reviews/publication-sync-2026-10-29) and [the checkpoint](CHECKPOINT_2026_10_25.md) record exact source/CI/Wiki identities. The current source passes 859 local checks, TypeScript, authored content, fifteen locales, native artwork, production build and 71 atlas contracts. The fe82c7e Windows review separately passes native checks on three verified copies. Frozen public 5237/testing 5236 retain exact gameplay source 5dfc6a8; subsequent fe82c7e strengthens native diagnostics, and the publication follow-up refreshes guide/journal text.

## Continue reviewing

Review the full first visit: home, Tutorial, setup, room discovery, waiting/equipment, purchases, controls, loading/errors/reconnect, combat status, phase cues and results/records. Connection loading/cancellation is implemented and separately verified. The current pass implements explicit host controls and password visibility; its source, CI, preview and publication receipts remain separate. Continue first-time combat/equipment/results polish after this closure.

Desktop/compact layouts, enlarged text, RTL, reduced motion and real input devices need rendered/human review. Software fixtures, static geometry/color samples, native decodes and queued browser tabs are separate evidence. Browser automation remains disabled and must not be retried or bypassed. Human balance, listening, native-language, physical-device, WAN/endurance/full-capacity and coordinated release acceptance remain open.

Before sharing a new review URL, bind the actual client root/hash, source/build/protocol/content/audience and matching backend health/CORS. Use fresh roots/ports and preserve earlier owners, manifests and running rooms. Keep exact source CI logs. Publish canonical Wiki pages from their committed source and verify all eighteen pages, thirty-four images and public responses. Preserve issued reports and failed iterations; do not overwrite sealed archives or their sealing-time status.

The broad polish goal remains active. Expansion, new bosses/maps/modes/weapons/class paths, General mobility skills and future shield-cap/blocking abilities stay deferred. Main merge, paid provisioning, hosted game deployment, release replacement and contest submission remain separate. The older protocol-4 Site and immutable protocol-13 public Windows download remain distinct from local reviews.

[Earlier polish notes](history/2026-10-29-publication-sync/docs/PUBLIC_POLISH.md) preserve the exact chronological passes and evidence paths. Their then-pending work is historical; the checkpoint and publication review provide current status.

Connection clarity adds loading Cancel/Esc, keyboard focus and late-callback guards, abortable HTTP/SDK/worker lifetimes, plain room errors and menu-owned board/roster requests. [Earlier connection evidence](../reviews/connection-clarity-2026-10-29) includes the reproduced baseline and849-test full gate. Existing packages/frozen previews retain their exact issued source; new connection-clarity previews are recorded separately.

Explicit host-only Pause/Continue freezes the authority while chat/connections stay live. Settings/chat alone do not pause online play. A departing host resumes play and transfers controls; End game for everyone is a separate confirmed action. Host invitation/password reveal and entry eye buttons are session-only. [Current host-control evidence](../reviews/host-controls-2026-10-29) records859 local checks and the remaining review limits.
