# Accessibility and languages

The runtime includes fifteen language catalogs: English, Simplified Chinese, Traditional Chinese, Japanese, Spanish, French, German, Brazilian Portuguese, Russian, Hindi, Arabic, Bengali, Indonesian, Urdu and Korean. Arabic and Urdu mirror menu layout. Bundled Noto families cover the required scripts. Translation drafts are AI-authored; native-speaker review remains open.

Language, audio and display preferences are separate from run difficulty. Keyboard/mouse, standard gamepad buttons and touch controls are implemented. Settings supports two keyboard/mouse bindings per action, gamepad button remapping, and separate Hold/Toggle firing and interaction. Duplicate or reserved bindings are rejected. Blur/pause clears toggled input, and a held controller button must be released before rearming. Bindings and preferences persist in [ProfileV1](Profiles). Reduced-motion handling, numerical cooldowns, named actions, focus indicators and accessible item names support the menus and HUD. Signature warnings use outlines, geometry and safe gaps as well as color/audio; sound or color alone must not be the only danger cue.

The in-game changelog keeps navigation in the selected language. Editorial development notes are currently English and explicitly marked `lang="en"` with left-to-right text, including inside Arabic/Urdu menus. This avoids presenting untranslated prose as localized content. Newly discovered boss background histories use the same explicit English marking pending translation; mechanic descriptions and profile/control messages cover all fifteen catalogs.

Automated catalog, layout, collision and source checks are evidence for specific behavior. They do not replace final rendered game review, physical-device/controller testing, photosensitivity/comfort review, native-language review or human accessibility testing. [Getting Started](Getting-Started) lists actual bindings.

[English runtime strings](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/locales/en.json) · [Font and dependency notices](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/THIRD_PARTY_NOTICES.md)

## Optional expanded skill map

Enable **Expanded skill map** in Settings to see all 54 existing skills for the chosen class: three branches and nine paths. Classic remains the default. Native scrolling, 65–140% zoom, arrow keys and Home/End navigate the map; Enter or click inspects a node. Purchasing still requires the existing Buy control and valid points/prerequisites. The setting survives local profile import/export, including bounded migration from issued settings. All fifteen locales have map/zoom instructions. Rendered, physical-device, native-language and human acceptance remain open.

## Phase and form clarity

Boss name, threat/form, phase/name and timer occupy separate slots with wrapping and RTL-isolated grade codes. A static phase banner and bar dividers remain; a short bar engraving is disabled by either the game reduced-motion option or system preference. Purple Crazed also has a C code and six perimeter marks; red Brutal has B/four marks. New form/help/difficulty messages cover all fifteen locales. Native-language, rendered layout and device acceptance remain open.
