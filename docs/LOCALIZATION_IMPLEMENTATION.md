# Stage 1 localization data and integration contract

The localization data is authored for all fifteen launch locales. This is a text-asset deliverable, not a claim that the game runtime, shaped-script layout, fonts or language switching have been implemented or visually tested. All translations are **AI-authored**. Native-speaker review and runtime layout review remain pending and are recorded in every catalog's metadata.

## Delivered data

- `locales/en.json`, `zh-Hans.json`, `zh-Hant.json`, `ja.json`, `es.json`, `fr.json`, `de.json`, `pt-BR.json`, `ru.json`, `hi.json`, `ar.json`, `bn.json`, `id.json`, `ur.json` and `ko.json` are independent UTF-8 runtime-ready data catalogs.
<!-- localization-counts:start -->
- Current content version: **0.2.0**. Every catalog has **959 flat message keys**, for **14,385 localized messages** across **15 locales**. The count includes three typed plural messages per locale; plural alternatives are additional strings within those messages.
- Coverage includes 234 menu, lobby, connection, HUD, vote, shop, skill-tree, ending, accessibility, settings, changelog and squad-leaderboard strings; all 5 modes and 6 difficulties; all 7 classes, 21 branches, 14 ordinary abilities and 7 unique ultimates; all 28 weapons, 126 skills, 24 mutations, **60 bosses**, 6 arenas, 8 supplies and 5 upgrades; 53 stat labels; and every attack kind used by the current content catalog.
<!-- localization-counts:end -->
- Source wording is editable in `locales/source/`. Its named groups and line order are defined by `source/en.mjs`. The builder rejects missing groups and incorrect line counts. `source/additional.mjs` contains later attack definitions, and `source/plurals.mjs` contains cardinal forms. Final JSON has fully named keys and does not depend on line order at runtime.
- `source/boss-expansion.mjs` adds 49 individually authored boss names and descriptions per locale. Each description teaches its signature mechanic and counterplay: reflecting coin wheels, rotating cones, rat-sack interrupts, erased stamp zones, chain anchors, rail signals, current control, frozen strips, temporary bridges, reflections, valve reversals, numbered weak points, symbol history, timed replays and the other authored encounters. These are boss-specific sentences, not a generic attack-primitives fallback. The original eleven boss translations are preserved.
- Traditional Chinese is a separate editable source and JSON catalog. Its initial script conversion used the Windows traditional-Chinese conversion API, followed by explicit traditional wording and terminology adjustments such as 遊戲, 設定, 伺服器, 螢幕, 網路, 載入, 儲存 and 連接埠. This is not native-speaker certification; review both Chinese variants independently.

Regenerate data with `node locales/build-catalogs.mjs`. This also refreshes the marked count summary above from the current content version and generated key counts. Run `node tools/verify-locales.mjs --self-test` after edits. These tools use Node built-ins and write no game code. The verifier is read-only and supports `--root <workspace>` for extracted-packet checks. It prints JSON and exits nonzero on failure.

## Catalog shape and minimal message format

Each catalog has a `meta` object and a `messages` object. Keys are stable identifiers, such as `ui.play`, `ability.medic-ultimate.description` and `skill.soldier-ballistics-1.name`. Save files, network messages and content definitions continue to use content IDs. Do not use translated names as identifiers.

A text message is a nonempty string with named placeholders, for example:

```json
"ui.revivePrompt": "Hold {binding} to revive {player}."
```

Only `{identifier}` substitution is supported by `grave-accord-messages-v1`. There are no positional arguments, embedded expressions, HTML, ICU expressions, escape macros or recursively evaluated placeholders. Substitute each token once from a parameter map. Insert user names, room codes and addresses as text, never HTML. A replacement containing braces is literal user text and must not trigger a second formatting pass.

A plural message has this shape:

```json
"count.players": {
  "plural": "count",
  "forms": { "one": "{count} player", "other": "{count} players" }
}
```

Select the form using `Intl.PluralRules(locale).select(rawCount)` before converting the count to text. Format the displayed count with `Intl.NumberFormat(locale)`. Each catalog includes every cardinal category reported for its locale, with an `other` form. Arabic contains zero/one/two/few/many/other; Russian includes one/few/many/other; French, Spanish and Brazilian Portuguese include the million-count `many` category. Chinese, Japanese, Korean and Indonesian use their single applicable form. Never construct a plural by appending an English suffix.

`count.players`, `count.encounters` and `count.seconds` are complete noun phrases, suitable for standalone counters and duration parameters. Other messages use count-safe label forms, fixed authored rules, or whole translated sentences. Do not append sentence fragments around a translated message. If a new sentence needs another plural, add a complete typed message rather than combining fragments.

The verifier checks full key and placeholder parity, value types, valid placeholder syntax, nonempty NFC text, forbidden replacement/control characters, unfinished markers, all locale metadata, required content coverage, and every locale's full plural category set. It rejects verbatim English copies except an explicit small allowlist of legitimate cognates, brand text and unit templates. Every plural branch must retain `{count}`. It also verifies English against its source key specification, so deleting a key from every JSON catalog cannot silently pass parity checks. Boss IDs must match the content roster; expanded text must match its editable source, and no two bosses may share a name or mechanic description within a locale.

## Content and formatting bindings

Use these bindings instead of the English `name` or `description` fields in `content/catalog.json`:

| Content | Name | Description or additional text |
| --- | --- | --- |
| Class | `class.<id>.name` | `class.<id>.role`, `class.<id>.lore` |
| Branch | `branch.<branchId>` | skill-node cards provide effects |
| Q, E, ultimate | `ability.<id>.name` | `ability.<id>.description` |
| Weapon | `weapon.<id>.name` | `weapon.<id>.description` |
| Skill | `skill.<id>.name` | `skill.<id>.description` |
| Mutation | `mutation.<id>.name` | `mutation.<id>.description` |
| Boss | `boss.<id>.name` | `boss.<id>.description` |
| Arena | `arena.<id>.name` | `arena.<id>.description` |
| Supply | `supply.<id>.name` | `supply.<id>.description` |
| Upgrade | `upgrade.<id>.name` | `upgrade.<id>.description` |
| Mode | `mode.<id>.name` | `mode.<id>.description` |
| Difficulty | `difficulty.<id>` | difficulty mechanics come from numerical content |
| Threat | `threat.<number>` | includes secret classification 11 |
| Boss attack | `attack.<kind>.name` | `attack.<kind>.description` |

Survivor proper names and the Grave Accord brand may remain unchanged. Key bindings Q/E, protocol names and grade symbols D− through SS+ remain identifiers or symbols. Never expose effect IDs such as `ultimateCooldownReduction` to players; map them to `stat.<effect>`.

Weapon descriptions receive already formatted `damage`, `fireRate`, `magazine`, `reloadTime`, `pellets` and `pierce` values from the weapon data. Supply descriptions receive `amount`, `duration` and `maximum` as applicable. Upgrade descriptions receive `effects`, `maximum` and `price`. Skill and mutation descriptions receive a complete localized effect-list parameter `effects`; mutation descriptions also receive the authored encounter count `encounters` (currently always three). The current fixed three-encounter wording is translated for that rule. If mutation durations become variable, replace this with a typed plural sentence before exposing another count.

Build numerical descriptions from labeled stat rows, using `template.effect`, `template.effectFlat`, `template.effectPercent` or `template.effectMultiplier` and locale-aware units. These are label/value records, not grammatical sentence fragments. Format a set of records with `Intl.ListFormat(locale)` or show them as separate accessible rows, then supply the resulting list to the complete description. Values must come from numerical content and computed purchases, not be re-parsed from translated descriptions.

Effect formatting depends on context:

- **Skill additive ratios:** `weaponDamage`, `fireRate`, `cooldownReduction`, `abilityPotency`, `ultimateCooldownReduction`, `ultimatePotency`, `rallyRadius`, `barrierHealth`, `reviveRate`, `sigilRadius`, `turretDamage` and `criticalChance` are signed percentages. An effect of `0.1` is `+10%`, not `+0.1%`.
- **Skill flat quantities:** `maxHealth`, `ultimateShield`, `healOnHit`, `extraShots`, `selfRevives`, `pierce`, `ultimatePulses`, `extraTurrets` and `ultimateCharges` are signed amounts/counts. `regeneration` is health per second. `suppressionDuration`, `ultimateDuration` and `veilDuration` are added seconds. `ultimateRadius` is added world units.
- **Armor:** fractional additive armor is shown in percentage points using `template.points`; `0.1` is `+10` percentage points, not a 10% multiplier.
- **Mutation multipliers:** every current modifier except `armor`, `startShield` and `extraShots` is displayed with `template.effectMultiplier`, preserving the factor, for example maximum health ×0.5. Armor is additive percentage points; starting shield and extra shots are additive amounts.
- **Shop upgrades:** weapon damage, fire rate and reload reduction are additive ratios. Extra magazine capacity and maximum health are flat amounts. `maxHealth` therefore has different units for upgrades and mutations.
- **Supply amounts:** medkit/antidote are flat health; adrenaline is a percentage increase; armor plate is flat shield; revive kit is a health fraction shown as percent; barrier charge is flat barrier health; focus tonic is a fraction of remaining ordinary-ability cooldown. Ammo pouch has no amount parameter.
- `template.seconds`, `template.percent`, `template.points`, `template.perSecond` and `template.pixels` provide unit presentation. For standalone duration phrases use `count.seconds`. HUD `{seconds}` parameters include their localized unit; never append a second unit. `{progress}` is a localized percentage, `{time}` a localized time/date, and `{position}`, `{number}`, `{cycle}`, `{count}`, `{coins}` are localized numbers. `{binding}`, `{player}`, `{name}`, `{action}`, `{address}` and `{version}` are text values.

Ability descriptions currently reflect the fixed Stage 1 numerical design. If an ability balance number changes, update and review all fifteen descriptions, or convert the complete sentence to named numerical placeholders. Do not mix updated stats with stale translated prose.

## Runtime requirements retained for Stage 2

- Match supported browser locale on first launch and persist the selection in the versioned profile. Resolve zh-TW, zh-HK and zh-MO to zh-Hant; zh-CN and zh-SG to zh-Hans. Use English for unsupported languages. Resolve a generic `zh` preference to zh-Hans. Use pt-BR for supported Portuguese preferences.
- Show native language names from catalog metadata before a player joins. Changing language must refresh visible UI immediately without reloading the match or changing controls.
- Arabic and Urdu set text and menu layout direction to RTL. Isolate user names, room codes, addresses, key bindings and version strings with bidirectional isolation (`bdi`/`dir=auto` or the equivalent text-layout API). Never mirror the game world, aiming, movement, or Q/E bindings.
- Bundle licensed fonts with CJK, Arabic shaping, Urdu, Devanagari, Bengali and Korean coverage. Use a shaping-capable UI text layer for complex scripts. Do not assume a canvas text renderer has acceptable shaping until measured and visually inspected. Offline play must not depend on a font CDN.
- Allow wrapping and at least 40% expansion. Keep interface words out of raster art. Use translated accessible names for touch controls and all icon-only buttons.
- Missing keys are development errors. Verify catalogs before release and log a diagnostic; do not silently display an English raw catalog description in a selected non-English locale. Unsupported-locale fallback is separate from missing-key handling.

## Verification evidence and remaining review

The Stage 1 data checker reports current locale, message, boss and required-content counts directly from the files; the generated summary above tracks the content version. Self-tests prove rejection of removed keys, wrong tokens, malformed placeholders, wrong message types, missing Arabic dual forms, wrong RTL metadata, copied English text, missing expanded bosses, duplicated generic boss descriptions and changed expansion-source text. Another 150 selections cover representative integer, fractional and million-count plurals.

`locales/verification/boss-expansion-preservation.json` records a before/after equality check of all 22 original boss name/description keys in all fifteen locales during the 0.2.0 expansion, with a SHA-256 digest for each unchanged subset. Expanded bosses add unique signature-counterplay descriptions while those existing translations remain unchanged.

This establishes structural data coverage. It does **not** establish naturalness, accessibility conformance, rendered layout, missing-glyph absence, Arabic/Urdu shaping, controller focus order, audio-caption correctness or native-speaker acceptance. Those checks belong to the playable UI gate and must use desktop, phone landscape and portrait-menu screenshots for every locale. Native review should pay particular attention to genre vocabulary, class voice, both Chinese variants, and complex-script typography. Update `nativeSpeakerReview` and `uiLayoutReview` only when evidence exists.
