# Profiles and mastery

Open **Profile** from the main menu in build `2026.10.24-profile` or later. Profiles belong to the local browser/device and contain Practice records. They need no account and grant no health, damage, coins, weapons or skills.

## What persists

- Each completed encounter awards 100 XP to the class you played. Teammate rescues have a separate counter; self-revival does not count as a teammate rescue.
- Seven class records show watch ranks at 0, 5, 15, 30 and 60 clears. Five profile insignia unlock at those total-clear thresholds across classes. A sixth requires an earned Uncounted memorial. The equipped ink insignia appears beside your local survivor name.
- The boss codex opens stories for identities you actually defeat. Mechanic descriptions and survivor lore are localized; boss background histories are explicitly marked English while their translations are unfinished.
- Endless records show personal clears and the squad's completed count, separately for each difficulty. Completed-encounter progress survives a later defeat or voluntary departure.
- Locale, audio, display, accessibility, control bindings and Hold/Toggle choices travel with the profile.

## Difficulty unlocks

Complete any full timed campaign on **Hard** to unlock **Insane** and **Hellish** in setup. The authority records when you first deployed and your personal participation. Joining partway through a campaign and defeating its secret boss cannot replace a missed campaign encounter. Aim assistance, reduced effects and other accessibility preferences do not affect the unlock.

Every run starts with its own class stats and nominal build budget. The server computes all difficulty coefficients and combat rules. The local unlock is a progression preference; it is not a verified account or ranked entitlement. Current online sessions remain unverified Practice.

## Saves, import and export

The profile saves after each completed encounter. Repeated state updates, reconnects and stale restored boundaries do not duplicate mastery or erase an earned memorial. Campaign victory is banked before the optional secret; losing or declining that extension keeps the clear.

Use **Export profile** for a portable JSON copy. **Import profile** validates the complete document before replacing the current profile and keeps its exact prior bytes as a local backup. **Restore previous profile** restores a valid backup. Invalid or unsupported files do not replace the current data. Profiles are bounded to 2 MiB and 10,000 run receipts; a write failure reports an error and preserves the previous primary value.

Older campaign records are retained separately. They lack personal participation data, so the game does not invent mastery or a full-Hard unlock from them. Supported older solo boundary saves migrate within explicit bounds. Offline/LAN and current online Practice records remain separate from future verified global rankings.

See [Getting Started](Getting-Started) for default controls, [Accessibility and Languages](Accessibility-and-Languages) for remapping, and the [implementation and validation details](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/PROFILE_V1.md). New rendered/device/controller and native-language acceptance remains open.

## Applying and importing safely

Applying a profile blocks conflicting imports and cosmetic changes until it finishes. Back and Export remain available. If you leave while the selected file is still being read, it is not imported. A finished response from an old Profile page cannot replace a newer page or put a notice into another profile view.

Invalid files and saving failures have different messages. Saving failures keep the previous profile bytes and a usable retry; the existing exact backup and validation rules remain. A successful import keeps its confirmation and places keyboard focus on the current import control, including when it changes the menu language.

Cosmetic changes leave an unrelated pending language choice active.

Cosmetic choices update appearance only. Importing a profile applies its preferences, so an appearance change cannot restore an older saved language after a startup download failed.
