# Chat confirmation and draft preservation

The old socket-write boolean meant only that data had been handed to a connection. It did not mean that the room accepted the message. The server silently rejected requests inside its existing1.5-second limit, while the UI immediately erased their text. Separately, a quick chat opt-out/opt-in could miss its history response because of the five-second history-refresh guard and remain blank indefinitely. The latter has an actual two-peer failing baseline preserved in this scope.

## Behavior

Each message carries a UUID request identity and normalized text. Server-owned sender identity, existing160-grapheme/512-byte text validation,50-message in-memory history and1.5-second sender interval remain. The server replies with a strictly validated success or rejection receipt. Its per-participant cache retains the latest16accepted requests and is removed on leave; a reserved reconnect keeps it. Duplicate requests with the same text return the original receipt without another broadcast. Reusing an accepted request identity for different text is rejected.

The client has one pending request and a six-second confirmation timeout. A disconnect or timeout retains the last request identity and draft as uncertain. An explicit retry of the same normalized text reuses that identity. There is no automatic message replay. A new message gets a new identity. Success is accepted only for the active request, the local sender and the submitted normalized text. Late success can still confirm an uncertain request. All timers and memory are released when the session closes.

The chat form keeps its text until success and erases it only when the input has not been edited since submission. Editing back to identical wording still counts as an edit. Sending/cooldown disable duplicate submits; failures and uncertainty keep the editable draft and show plain notices in all fifteen catalogs. The accepted C toggle, Enter-to-type, Esc-to-close, custom bindings, combat/menu placement and action-footer separation stay. IME composition neither submits an unfinished message nor closes chat when Esc cancels a candidate. The native field supports the existing Unicode server policy rather than prematurely limiting160UTF-16units.

When history is temporarily limited after opt-in, the server returns a bounded delay. The client has one retry timer, cancelled on disable/drop/leave and refreshed on reconnect. It requests history after the existing limit rather than requiring another participant to post. Disabled chat still clears locally and receives no live messages.

## Verification and boundaries

Focused tests cover actual authority receipts, bounded caches, changed-payload request reuse, late/malformed receipts, timeout/drop/send exceptions, edited drafts, IME events, complete issued41local migration and15locale notices. A real two-peer test drops the success receipt only after the server has accepted and broadcast the message, reconnects the sender and verifies exactly one post after retry. Another actual room reproduces and corrects the rapid history-toggle defect. These are native fixtures, not browser/human acceptance.

Protocol42 requires a matching backend; bounded known41Practice migration keeps map/build/economy identity and authoritative checkpoints stay strict. Earlier518x–5235roots/listeners and all issued assets/reports remain untouched. The broad goal stays active. Public GitHub source upload still awaits the already-pending direct permission question; do not bypass the rejected action. Wiki synchronization remains authorized after source publication. No new roster, skill branches, checkout, delegation, main merge, paid service, hosted game deployment or contest submission.
