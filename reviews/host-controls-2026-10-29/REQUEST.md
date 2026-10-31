# Host passwords and explicit match controls

The human reviewed public5239 and said moving between Join Room, a room and the main menu feels pretty clear. This accepts that flow only, not the whole game.

Requested follow-up:

- Show the room code and password to the host during play.
- Add an eye button to reveal passwords while entering them.
- Settings, chat and other menus must not pause an online match. Only the current host may explicitly pause/continue the match using actual buttons.
- A departing host leaves the game running. The host may instead choose to end the game for everyone.

Implement the full request with authoritative host checks, frozen simulation/timers during explicit pause, continued chat/connectivity, clean resume/input handling and safe host transfer. Resume when a paused host departs so the remaining players cannot be stranded. Keep the existing transfer to a connected participant; leaving alone never ends everyone else's game. Ending the match is a separate confirmed action and must not manufacture clears or victory records.

Keep entered room credentials only in the current Session's private memory until leaving. Only the current host's UI may reveal its retained invitation password; do not put plaintext in shared state, listings, saves, logs or application browser storage. Existing server salted verifiers remain. Promote a joined participant to host using the password they already entered, when available. A reserved reconnect retains the same Session memory.

Connection clarity was verified/published at49b3d5a, closure966ce89. Its849tests, both source/closure CI jobs, fresh public5239/testing5238 and Wiki064db30 remain preserved. The broad polish goal stays active. Ongoing source/review/Wiki synchronization is authorized; no main merge, hosted game deployment, release replacement, new checkout or delegation. Browser automation remains disabled.

One final Git remote read in the preceding pass was not executed because automatic approval review hit a usage limit. After its stated reset, the exact same read succeeded; local/remote966ce89match and main is unchanged. The issue was a review-service failure, not an unsafe-action determination. No approval check was bypassed.
