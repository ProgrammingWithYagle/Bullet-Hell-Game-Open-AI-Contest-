# Contributing

Use the existing repository and its current development context. The playable continuation is on `feat/first-playable-loop` in [draft PR #14](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/pull/14). Keep `main` protected and do not merge, deploy or change external release state without the applicable authorization.

## Validate a change

Use Node 24+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile` and `pnpm verify`. Choose focused checks for the changed rules, and complete the full content/type/network/build pipeline before a publishable checkpoint. Record evidence against the exact committed source. Browser screenshots, headless tests and human/device acceptance establish different things.

Gameplay belongs in shared simulation modules. Keep Phaser and DOM presentation outside authoritative rules. Share environmental collision/movement with prediction, bound enemy/voice/projectile counts, validate network commands and preserve deterministic saves. New bosses need distinct signatures, counterplay, phases, normal/Brutal behavior, art and an individual theme.

## Update the history and Wiki

Add concrete dated changes to `src/shared/update-history.json`, newest first. Update its playable snapshot when content changes. That file drives the in-game journal. Run `node tools/sync-changelog.mjs` to regenerate `CHANGELOG.md` and `docs/wiki/Changelog.md`; `--check` detects drift. Editorial notes are explicitly English; navigation follows the selected language.

Keep all fifteen canonical Wiki pages in `docs/wiki/` consistent with the actual source. Mark planned systems clearly and preserve the older public playtest's deployment distinction. The native Wiki is a separate Git repository; publication must copy the reviewed canonical pages, push the authorized Wiki branch and verify committed text against all published blobs. A source PR alone does not publish the Wiki.

Preserve exact image/audio provenance, originals, rejected versions and license notices. Avoid rewriting sealed production history or representing technical normalization as newly drawn art. Document remaining acceptance work candidly.

[Acceptance backlog](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/IMPLEMENTATION_BACKLOG.md) · [Architecture](Architecture) · [Credits](Credits)
