# Connection clarity

The issued0ae6eb1 source returned from Session.close while a real delayed health request and search remained pending after150ms. The baseline explicitly releases its own response after recording the witness. No existing preview or player room was modified.

The current client gives each Session an abortable request lifetime. Health/list/code/admission HTTP, retry waits, worker startup and SDK matchmaking HTTP share it. A small SDK subclass also closes not-yet-joined sockets and bounds the room handshake to15seconds. Known admission tickets are released independently of the cancelled request signal. Closing is idempotent; reconnect retains its reserved identity and uses the same lifetime. No gameplay or wire protocol changes are required.

Loading now has Cancel/Esc, one keyboard action in a modal dialog, and guards for asset/audio completion, status/view/event/purchase callbacks, resize/load progress and launch finalizers. An earlier attempt cannot destroy a new screen or reset its busy state. Chat/gameplay shortcuts and background pause handling stay outside loading. The existing Solo/online pause policy is preserved.

Join Room closes temporary Session queries on navigation/disposal. It shows server startup/search/code-lookup progress, preserves specific errors and name/class state, and distinguishes an empty list from a failed request. Plain source-backed notices cover incompatible addresses and full/closed rooms in all fifteen locales. No permanent new HUD is added.

Leaderboards return their request cleanup through setup. Leaving the online tab or changing filters cancels board/roster requests. Roster lifetime is separate from paging so earlier rows still open after loading more. Concurrent duplicate roster pages are blocked. Scoring, persistence, filters and shared ranks remain unchanged.

The focused05 run passes43checks including real SDK, delayed HTTP/stalled WebSocket, known-ticket cleanup, closed-room errors, reconnect, protected rooms, confirmed chat and persisted records, plus compiled native launch/setup/board handlers. Focused01–04 preserve narrower or failed fixture attempts. Initial menu failures came from the fixture's missing portrait URL and bundled CommonJS loader; the next loader correction passed. An attempted direct ws import was unavailable; the socket fixture now speaks the minimal HTTP WebSocket upgrade using Node built-ins, and observes actual SDK socket closure. These failures/corrections remain separate evidence.

Gate01 passed849tests. A final loading-shortcut/visibility guard then justified gate02, which binds the final source. Gate wrappers preserve eight issued global reports and bind art/locale/tool inputs before/after. Native menu fixtures have no browser, layout engine or rendering. Human/rendered, native-language, listening, physical-device, WAN/endurance/capacity and final balance acceptance remain open. The broad polish goal stays active.
