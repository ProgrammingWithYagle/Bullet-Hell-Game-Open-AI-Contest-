# First-visit language choice and stable setup names

The human requests an explicit language choice for first-time players and generated names that follow the language before a fresh setup, then remain stable within that setup. Native-named buttons preview a cancellable catalog without storing an automatic suggestion; Continue saves the choice and focuses first-time play. Valid existing profile/language preferences skip the screen. Failed loads can retry; failed saves still allow play. Startup detection computes first-visit state before any suggested language loads.

SetupDisplayName tracks explicit edits separately from automatic names. Only fresh New run/Start gently/Join and local-network setup boundaries reseed an automatic name. Language changes, back steps and visibility changes retain its fallback; explicitly typed values are never inferred from equality. Clearing returns to the current setup fallback, with a future fresh setup eligible for translation.

Nine new cases cover first-visit policy, actual startup/component lifecycle, failed/late loading and save failures, exact setup/visibility/join name boundaries and source parity/game-safe names in all15languages. Focused01passes37/37 with prior profile/language/loading/presentation checks. No browser/rendered/human/device/listening/native-language/WAN acceptance is claimed for the new component. Existing897-check artifacts and human feedback remain source-bound.

Gate01passed authored content but stopped at TypeScript because the locale-source parity test used a direct.mjsimport without a declaration. It now loads the exact source via file URL, matching existing catalog-source tests. Gate02checks the final runtime/test snapshot. No gameplay behavior changed for that correction.

Gate02passes906/906/0and the production/artifact checks. A final CSS review found native labels inherited only the current page language font; the chooser now explicitly selects each script’s existing bundled font before a language is chosen. This adds no font or artwork. Gate03binds that final stylesheet and the same906checks. Native/rendered acceptance is still separate.
