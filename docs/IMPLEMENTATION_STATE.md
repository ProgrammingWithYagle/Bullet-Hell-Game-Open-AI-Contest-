# Current implementation state

Current development build **2026.10.31-general-mobility / protocol 45** includes [Stitchwright's sewing room](STITCHWORK.md), [the Field Journal](FIELD_JOURNAL.md), [Heavy/Tank shield paths](SHIELD_SPECIALIZATIONS.md) and [General Sprint/Double Dash](GENERAL_MOBILITY.md). Sprint costs 3 earned SP and Double Dash 6; both share the existing budget. The 378 class nodes remain, with two shared General purchases. Original-boss quality passes remain 13/60, with 47 left.

Game source `55cc82da4b67448cdb3f3385ac2e59638055398f` passes **999 tests, 0 failures**, TypeScript, all 15 catalogs, artwork, production build and 71 atlas contracts. [Exact-source CI also passed](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41239591587). Current local review is testing **http://127.0.0.1:5278/** (backend 2654) and public **http://127.0.0.1:5279/** (backend 2655). Each passes 52 served-file/catalog checks and real two-peer room/password/chat/host flows. Read [the current handoff](../handoff/NEXT_CHAT.md) and `reviews/general-mobility-2026-10-31/` for identities and restart inputs. The earlier 5276 user preview remains available.

Published Site **version 4 / protocol 43** and its older backend are unchanged. Development online clients need matching protocol 45 and content revision `5a4ffd871d1880ccb681aee1faa5e51a664385752977fa7a136b50d44c7c6927`. The user decides full-game completion; boss expansion, story and other features/polish remain open. Rendered/human/device/native-language acceptance and final balance remain open. The contest sections below retain their earlier release facts.


Public Site **version4** is live at [Grave Accord](https://grave-accord.yigallin0423.chatgpt.site/), from game source366c12d0830b53d03b0e5f3b302803ad863c65fc. Build2026.10.30-shared-network / protocol43. The full local gate and [exact-source CI](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/41228803719) pass956 tests. [Publication and archive identity](../reviews/hud-alignment-2026-10-31/publication.json) records the saved native version and unchanged compatible backend.

Settings can keep equipment and abilities together or in separate panels; the choice persists without losing existing profiles. The user confirmed both choices work at their resolution. The HUD shares aligned edges and fixed corner controls. Boss information stays centered; the browser audio fallback switches from equipment to boss music. Per-map camera fitting preserves complete art and inverse aiming through resize events.

Testing is http://127.0.0.1:5272/ and matching local public review is http://127.0.0.1:5273/ while their servers run. Both pass52 served-file checks and actual two-client room/chat/host controls. The deployed public Site passes35 HTTP/hash/MIME checks. These checks do not certify every rendered browser/device, WAN, listening condition or balance scenario.

The narrow portrait preview still makes landscape maps look small. The user explicitly deferred that issue and requested wrap-up; no further map redesign is in scope. Read [the one current handoff](../handoff/NEXT_CHAT.md) for feedback, accepted rules, deferred ideas, publication tools and cleanup evidence.

The compatible Free server remains source71fc34c with eight total slots, one room and ephemeral SQLite records. Public Windows downloads and the retained native review are separate older artifacts. Source/Wiki updates do not merge main or replace those artifacts.
