# Third-party notices

The repository's original MIT license is retained in LICENSE. Original game code, authored design data, translation drafts, original generated artwork and deterministic audio sources are part of this project unless a file states another license.

The production PDF embeds subsets of Bitstream Vera. Its copyright and permission notice is preserved in docs/licenses/Bitstream-Vera.txt. ReportLab, Pillow, NumPy and pypdf are authoring dependencies supplied by the local runtime; they are not bundled game runtimes in the Stage 1 packet.

No sprites, maps, audio recordings, fonts or code were copied from the cited reference games. Reference links describe inspiration and technical research. Built-in OpenAI image generation supplied original illustrations; the tool did not expose its model identifier or quality control. Audio was synthesized from the included original note/event score without external samples.

The installed runtime dependency inventory is recorded in docs/licenses/runtime-inventory.json, with verbatim copyright notices under docs/licenses/runtime/. It covers the Phaser and Colyseus browser/server trees; eventual browser and Windows packages may bundle different subsets. The @better-auth/utils npm archive declares MIT but omits a license file; its verbatim upstream notice and immutable retrieval source are recorded in docs/licenses/extra-notice-sources.json. Build tools remain development dependencies.

The current source build self-hosts pinned Fontsource packages for IM Fell English SC and Noto Sans, Arabic, Bengali, Devanagari, Japanese, Korean, Simplified Chinese and Traditional Chinese. Their SIL Open Font License notices are preserved under docs/licenses/runtime/ and the installed inventory. The successful Vite build includes the font files; final glyph/layout/device review remains pending. Final browser/Windows packages must retain these notices with the bundled files.

Windows development packages retain Electron/Chromium LICENSE and LICENSES.chromium.html, the game license, this notice, and docs/licenses verbatim runtime/font notices. The desktop builder also inventories bundled Node packages from its bundler metadata and copies their installed license files; recorded upstream notices fill the documented package omission. Electron, esbuild and resedit versions are pinned. PE editing and audio encoding tools are development-only; no FFmpeg executable or repository credentials ship in the game.
