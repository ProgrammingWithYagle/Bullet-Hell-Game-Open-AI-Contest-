# Current playable development build

Build **2026.10.25-brutal-signals**, protocol **14**. The feature branch implements sixty distinct bosses, seven classes, 378 skills, 28 weapons, six maps and five modes. Every current boss has its own original theme. [Current state and limitations](IMPLEMENTATION_STATE.md) and [continuation checkpoint](CHECKPOINT_2026_10_25.md) replace the earlier two-class/one-boss first-loop instructions.

Use Node 24 and pnpm 11.25.0: `pnpm install --frozen-lockfile`, `pnpm verify`, then `pnpm dev`. Offline Solo runs in the local worker; matching online development needs `pnpm server`. Check exact protocol/source before pairing front/backends. The preserved manual comparison build is http://127.0.0.1:5178/; keep its existing files/process unchanged.

Solo review offers a direct Standard/Brutal opener selector. [Playtest instructions](BOSS_PRACTICE.md). Fixed grades, extra Constable Brutal sequences, phase hints, red presentation and quiet responsive percussion are in current source. [Phase response](PHASE_AND_BRUTAL_FEEDBACK.md).

The full source suite passes 382 tests, content/fifteen locales, TypeScript and production build; exact checkpoint receipts remain source-bound. Browser control is disabled, and new rendered/device/native-language/listening/human acceptance remains open. Three Early Watch concepts and twelve Toad motion candidates are art-only and do not increase the playable count.

The [public Site](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) still hosts the older protocol-4 two-class/one-boss deployment. The issued Windows development download is also an earlier immutable build. Current source/Wiki publication does not redeploy them. PR #14 remains draft; protected main and final release are separate. Earlier first-loop evidence is preserved in dated history.
