# Current implementation state

Public Site **version4** is live at [Grave Accord](https://grave-accord.yigallin0423.chatgpt.site/), from game source366c12d0830b53d03b0e5f3b302803ad863c65fc. Build2026.10.30-shared-network / protocol43. The full local gate and [exact-source CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41228803719) pass956 tests. [Publication and archive identity](../reviews/hud-alignment-2026-10-31/publication.json) records the saved native version and unchanged compatible backend.

Settings can keep equipment and abilities together or in separate panels; the choice persists without losing existing profiles. The user confirmed both choices work at their resolution. The HUD shares aligned edges and fixed corner controls. Boss information stays centered; the browser audio fallback switches from equipment to boss music. Per-map camera fitting preserves complete art and inverse aiming through resize events.

Testing is http://127.0.0.1:5272/ and matching local public review is http://127.0.0.1:5273/ while their servers run. Both pass52 served-file checks and actual two-client room/chat/host controls. The deployed public Site passes35 HTTP/hash/MIME checks. These checks do not certify every rendered browser/device, WAN, listening condition or balance scenario.

The narrow portrait preview still makes landscape maps look small. The user explicitly deferred that issue and requested wrap-up; no further map redesign is in scope. Read [the one current handoff](../handoff/NEXT_CHAT.md) for feedback, accepted rules, deferred ideas, publication tools and cleanup evidence.

The compatible Free server remains source71fc34c with eight total slots, one room and ephemeral SQLite records. Public Windows downloads and the retained native review are separate older artifacts. Source/Wiki updates do not merge main or replace those artifacts.
