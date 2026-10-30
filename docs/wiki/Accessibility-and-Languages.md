# Accessibility and languages

The runtime includes fifteen language catalogs: English, Simplified Chinese, Traditional Chinese, Japanese, Spanish, French, German, Brazilian Portuguese, Russian, Hindi, Arabic, Bengali, Indonesian, Urdu and Korean. Arabic and Urdu mirror menu layout. Bundled Noto families cover the required scripts. Translation drafts are AI-authored; native-speaker review remains open.

Language, audio and display preferences are separate from run difficulty. Keyboard/mouse, standard gamepad buttons and touch controls are implemented. Settings supports two keyboard/mouse bindings per action, gamepad button remapping, and separate Hold/Toggle firing and interaction. Duplicate or reserved bindings are rejected. Blur/pause clears toggled input, and a held controller button must be released before rearming. Bindings and preferences persist in [ProfileV1](Profiles). Reduced-motion handling, numerical cooldowns, named actions, focus indicators and accessible item names support the menus and HUD. Signature warnings use outlines, geometry and safe gaps as well as color/audio; sound or color alone must not be the only danger cue.

The first-run prompt and mode descriptions use plain words. Mode diagrams show the authored fight count and estimated duration; map geometry appears on the map step. Familiar menu icons accompany action labels, and each difficulty has a different shape as well as a written name and explanation. Both public and testing builds share these improvements.

The in-game changelog keeps navigation in the selected language. Editorial development notes are currently English and explicitly marked `lang="en"` with left-to-right text, including inside Arabic/Urdu menus. This avoids presenting untranslated prose as localized content. Newly discovered boss background histories use the same explicit English marking pending translation; mechanic descriptions and profile/control messages cover all fifteen catalogs.

Automated catalog, layout, collision and source checks are evidence for specific behavior. They do not replace final rendered game review, physical-device/controller testing, photosensitivity/comfort review, native-language review or human accessibility testing. [Getting Started](Getting-Started) lists actual bindings.

[English runtime strings](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/locales/en.json) · [Font and dependency notices](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/THIRD_PARTY_NOTICES.md)

## Optional expanded skill map

Enable **Expanded skill map** in Settings to see all 54 existing skills for the chosen class: three branches and nine paths. Classic remains the default. Native scrolling, 65–140% zoom, arrow keys and Home/End navigate the map; Enter or click inspects a node. Purchasing still requires the existing Buy control and valid points/prerequisites. The setting survives local profile import/export, including bounded migration from issued settings. All fifteen locales have map/zoom instructions. Rendered, physical-device, native-language and human acceptance remain open.

## Phase and form clarity

Boss name, threat/form, phase/name and timer occupy separate slots with wrapping and RTL-isolated grade codes. A static phase banner and bar dividers remain; a short bar engraving is disabled by either the game reduced-motion option or system preference. Purple Crazed also has a C code and six perimeter marks; red Brutal has B/four marks. New form/help/difficulty messages cover all fifteen locales. Native-language, rendered layout and device acceptance remain open.

## Development instructions and finished-product policy

Latest 5192 feedback moves boss instruction paragraphs out of the live HUD into a closed-by-default manual Boss guide. Solo pauses simulation and drawing while it is open, then resumes without catchup/held input; a separate manual pause remains. The dialog has close controls, Escape handling, focus containment and bounded scrolling. Online combat continues with a notice. Testing builds keep guides available on all difficulties; the separate public build permits only optional Baby guides. Overhead survivor names and room chat have independent settings toggles. Chat starts closed and uses plain text with server identity and bounded in-memory history. Guide illustrations are deferred polish. Fifteen authored control/phase catalogs remain subject to native-language/rendered/device acceptance.

## Language loading and navigation

A loading notice explains a pending language choice. The latest selection takes priority even if an older download finishes later. Leaving the page cancels that selection; an old failure cannot replace a newer choice or reverse the text direction. A completed change keeps typed fields, focus and cursor selection.

A failed download leaves the current language selected and shows a retry notice. If a saved language cannot load when the app starts, the English menu remains usable. Saving preferences can fail separately: the translated menu stays consistent and the notice explains that saving failed. The notices are authored in all fifteen languages; human language and layout review remain ongoing.

Choosing a cosmetic while a language is loading keeps that language request active.

Cosmetic choices update appearance only. Importing a profile applies its preferences, so an appearance change cannot restore an older saved language after a startup download failed.

## First visit and automatic names

The first visit offers all fifteen languages by their native names. Choose one, then press **Continue**. Previewing does not save an automatic suggestion; Continue saves the choice. Returning players with a valid saved preference go straight to the menu. A failed download can be retried, and a saving failure still allows play with a notice.

A fresh New run, Start gently or Join room setup gives an automatic display name in the current language. Once setup has started, changing language keeps that established name. Going back through setup and switching Solo/public/private also keep it. An empty name uses the same setup’s original automatic fallback. Names you type are never translated. Returning home and starting a fresh setup updates only an automatic name to the new language.
