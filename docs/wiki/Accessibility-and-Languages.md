# Accessibility and languages


## Launch locales

English (en), Simplified Chinese (zh-Hans), Traditional Chinese (zh-Hant), Japanese (ja), Spanish (es), French (fr), German (de), Brazilian Portuguese (pt-BR), Russian (ru), Hindi (hi), Arabic (ar), Bengali (bn), Indonesian (id), Urdu (ur), and Korean (ko).

These are the selected global-coverage launch locales, not a claim about one definitive ranking of languages. Chinese script variants are independent catalogs.

## Player experience

- Language selection is available before joining and in settings, persists locally in the current runtime (the full ProfileV1 system is pending), and changes without restarting the application.
- Match browser locale on first launch; use zh-TW, zh-HK and zh-MO as Traditional Chinese, zh-CN and zh-SG as Simplified Chinese. Fall back to English for unsupported locales.
- Localize menus, errors, tutorials, class and skill descriptions, weapons, supplies, mutations, boss mechanics, accessibility labels, endings, and release highlights.
- Keep identifiers, protocol fields, saved content IDs, and the Grave Accord brand independent of display language.
- Use locale-aware numbers and plural forms, parameterized messages, and no concatenated sentence fragments.
- Arabic and Urdu menus use right-to-left text and layout. Do not mirror the game world, aiming, movement, or control bindings.
- Preserve font coverage with bundled licensed font subsets. Never require a font CDN for offline play.
- Keep player-facing interface words out of raster artwork. Cover wordmarks may retain the brand.
- Allow text wrapping and a minimum 40 percent expansion allowance in cards, buttons, and tooltips.

## Verification

- Every catalog must contain the canonical key set, matching placeholders and expected value types.
- Test each locale at desktop, phone landscape, and portrait-menu sizes.
- Verify Chinese variants independently; use shaped-script and RTL screenshots for Arabic, Urdu, Hindi, and Bengali.
- Reject missing glyphs, clipped buttons, misplaced numbers, untranslated gameplay descriptions, and hidden language settings.
- Describe translations as AI-authored and identify whether native-speaker review has occurred.
- Changelog and Wiki remain canonical Markdown; in-game release highlights have localized summaries.

## Current state

All fifteen AI-authored catalogs are bundled, with 1,491 keys each and 22,365 messages. Language selection/persistence, Intl formatting, RTL menus and self-hosted licensed Fontsource families are implemented. Earlier class-menu layouts were assistant-reviewed in all locales; complete current-font/scene shaping and physical-device checks remain open. No native-speaker certification is claimed.


Additional options: remappable controls, touch/gamepad support, optional aim assistance and auto-fire, reduced effects and motion, text scaling, independent audio volume, and shape-based danger cues.
