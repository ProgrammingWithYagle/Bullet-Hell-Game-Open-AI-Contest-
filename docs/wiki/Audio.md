# Grave Accord — audio bible

Current local feature-branch source: 23 playable bosses and individual themes, seven classes, six different map footprints, Quarantine and the ten-fight Midnight Circuit, protocol 9. The remaining 37 identities, later routes and full release/visual/device acceptance are unfinished. Older checkpoint counts below are historical. The public Site remains its earlier protocol-4 deployment; source/Wiki pushes do not redeploy it.


> Current source continuation: nine playable bosses, six connected collision layouts and separate boss themes. Quarantine now ends with Chain Marshal, Gate Widow or Black Ambulance after its regular encounters. Protocol 7; 133 checks pass. Four further classes, full environment/action art, additional routes/bosses and final release acceptance remain open. See the repository document `docs/QUARANTINE_RUNTIME.md` for exact mechanics and evidence.


## Current runtime boss themes

Five playable bosses now each have a separately composed sixteen-bar theme: Hollow Muster, Last Light, Undelivered, Crooked Procession and Final Entry. They use different melodies, instruments and meters, automatic 0.75-second crossfades and warning ducking. [Current source and exact evidence](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/BOSS_ENCOUNTERS_ITEMS_AND_MUSIC.md); editable scores/masters and signal checks are in assets/production/audio/boss-themes and reviews/boss-themes-review.json. Human/device listening, final mix, adaptive stems and themes for future bosses remain open.

## Earlier Stage 1 proof library

Edition 0.1.0 · Stage 1 original composition and sound design · 2026-10-22

## Delivered audio and evidence

The delivered proof library contains **two composed eight-bar music loops, eight summable instrument stems, and 25 original sound effects**, including a distinct cast cue for every class ultimate. All 35 audio files are uncompressed **44,100 Hz, 16-bit, stereo PCM WAV** masters. There are no external samples, sound-font recordings, voices, commercial music loops, or paid music-service calls.

The authoring source is `tools/synthesize-audio.py`. The exact note/event score, gains, panning, timing offsets and fixed seed are preserved in `assets/audio/score.json`. `assets/audio/manifest.json` records every WAV path and SHA-256, the source hash, loop frames, playback defaults and sound roles. `assets/audio/preview.html` provides a local listening worksheet with native audio controls and no network dependencies or autoplay. It is an English asset-review worksheet, separate from the localized game UI.

Objective checks are recorded in `reviews/audio-proof-review.json`. They establish PCM format, inventory, hashes, non-silence, sample headroom, DC offset, endpoint behavior, mono fold-down, loop-boundary tolerance and stem summation. **No human listening session or native audio-device playback has been performed.** These checks do not establish perceptual approval, phone-speaker quality, in-game mix quality, LUFS or intersample true peak. Those remain explicit later acceptance gates.

| Proof | Role and composition | Timing | Measured sample peak / RMS |
| --- | --- | --- | --- |
| City Wake | Quiet hub, voting and shopping. D Aeolian, warm bowed harmony, widely spaced muted bells, plucked low strings and light clockwork. A brief A-major turn gives the final bar direction toward D. | 78 BPM, 4/4, 8 bars, 1,085,538 frames, 24.615374150 s | −3.34965 / −17.52659 dBFS |
| Vigil Engine | Combat pulse. D-minor foundation, Phrygian E-flat/D tension, syncopated low strings, short chamber ostinati, restrained rim and ratchet percussion. Bell phrases leave gaps for warnings. | 104 BPM, 4/4, 8 bars, 814,154 frames, 18.461541950 s | −3.34965 / −19.59372 dBFS |

Both sample counts are the nearest integer to 32 quarter-note beats at the stated tempo. The score is scaled to those exact sample counts. The resulting timing error is below half a sample; an audio engine must use the delivered frame endpoint rather than a rounded decimal duration.

The current proof assets are suitable for first-playable integration after listening review. The complete soundtrack and environmental library below are **specified future production**, not delivered recordings.

## Musical identity and score

Lorn sounds inhabited by machinery that has outlived its operators. The score combines dry chamber strings, warm low fundamentals, dark cast bells and sparse mechanical percussion. Avoid glossy orchestral fanfares, a constant high-frequency hiss, huge trailer impacts and dense foreground melodies. Combat should remain readable when music is audible and playable with music muted.

The living survivors share a rising **D–A–D** interval family. The hostile city introduces the close **E-flat/D** tension. These are short original interval motifs, not borrowed melodies. An Accord Break resolves tension with **D–A–D–F**; defeat falls downward; healing rises gently. Timbral identity and rhythm must support each meaning even when a player does not recognize pitches.

City Wake harmony by bar: D minor add-nine; B-flat major-seven; F add-nine; C suspended/add-nine; G minor; D minor over A/F coloration; A dominant with C-sharp; D minor add-nine. Its lead first breathes across D5, A4, F5 and E5, then answers lower before returning home. Counter-viola appears only in six answer slots. Bell strikes are separated, rather than continuously arpeggiated.

Vigil Engine harmony by bar: D minor; E-flat major over the D tonal center; B-flat; A suspended; G minor; E-flat; A with C-sharp; D minor. The low-string line alternates root, fifth and octave with a 0 / 1.5 / 2.75 / 3.5 beat bass pattern. Six staccato chamber notes per bar provide propulsion. Rim accents are half-time; light offbeat ticks and two restrained tom fills mark the four-bar phrases.

Source synthesis uses inharmonic bell partials, three gently detuned bowed harmonic voices, muted plucked bass, pitched sine-body drums and frequency-shaped deterministic noise. Timbres are authored in code, not selected from an external preset pack. The fixed PCG64 seed is `221026`; render and SFX seeds are derived explicitly in source. Small bounded timing offsets give phrasing while preserving the exact looping grid.

## Looping, stems and transitions

Each music master has four stems: **bells, strings, bass, percussion**. All stems use the same frame count and the same linear master gain. At unity, their PCM sum matches the delivered master within **2 signed 16-bit steps**; the verifier allows 3 steps for independent rounding. Do not normalize individual stems before summing them.

Instrument decays and dark early reflections are deposited circularly into the loop buffer. Final-bar tails continue through the first bar. There is no global endpoint fade and no silence inserted at the seam. `loopStartFrame = 0`; `loopEndFrameExclusive` is defined in the manifest. Music has nonzero endpoints because a healthy continuous loop does not need to cross zero at its boundary.

Measured master boundary steps are 0.000244148 for City Wake and 0.006347850 for Vigil Engine. They are respectively 0.008368 and 0.153392 times the 99.9th-percentile interior sample step. All music stems pass the same boundary tolerance. The stronger energy immediately after Vigil Engine's seam is its intentional first-beat attack; low sample-step measurements must not be confused with equal before/after musical energy. Perceptual loop review remains pending.

First-playable transition defaults: use City Wake in menus, lobby and intermissions; use Vigil Engine during combat. Crossfade independent music states over 1.0 s. Start a combat cue at its first beat after the encounter countdown. Stop or duck the music immediately for a high-priority warning; never delay a warning to a musical beat. Returning to intermission can crossfade to City Wake after the victory reward accent. In solo pause, continue music at 12 dB below its current gain; combat simulation and ultimate cooldowns remain paused independently.

For final adaptive music, deliver four equal-length layers per combat track: bed, pulse, motif and tension. They share sample zero, frame length and one common gain. Bed and pulse support ordinary play; motif becomes eligible on a new four-bar phrase; tension enters on a phase boundary. Ramp adaptive layers over one beat at the next bar. Immediate warning ducking overrides this timing. Do not stack two full masters.

Browser/Electron audio must begin only after a user action that unlocks the audio context. Decode bundled data locally; do not require a music service. Stop and replace scheduled sources cleanly on scene changes. A muted or suspended device must not stop the encounter or cause queued warnings to burst on resume. Derive scheduling from the audio clock, not the rendering frame count.

## Original sound-effect inventory

Every cue is finite, includes its decay, has zero PCM endpoints and a measured sample peak of approximately −3.10 dBFS before runtime gain. Identical peak targets do not imply identical perceived loudness. Runtime category gain and listening review are required.

| IDs | Sound design and use |
| --- | --- |
| weapon-pistol | Soldier: short dry crack and rounded recoil; short enough for repeated fire. |
| weapon-heavy-lmg | Heavy: lower short mechanical report, distinct from a pistol. |
| weapon-shotgun | Tank: broader softened burst and low recoil. |
| weapon-injector | Medic: small pneumatic click with descending glass tone. |
| weapon-grave-wand | Mage: damped falling harmonic pulse. |
| weapon-rivet | Engineer: metal onset and short tool body. |
| weapon-needle | Assassin: narrow air hiss with a soft high falling tone. |
| impact-flesh / impact-armor | Muted low hit versus ceramic-metal tick. Armor communicates reduced damage; avoid excessive gore detail. |
| dodge | Brief cloth/air movement and a small downward tone; local action feedback. |
| warning | Distinct two-note descending danger cue; never depends on left/right hearing. |
| revive | Upward restoration chime only when the revive completes. Do not falsely signal channel completion at channel start. |
| accord-success | Low communal knock and D–A–D–F opening; signifies the boss vulnerability window. |
| ui-confirm / ui-back | Quiet upward taps for commit/purchase; downward taps for cancel/back. |
| downed | Local downward body and low string; accompanies the revive-window UI. |
| ultimate-ready | A single local upward chime on transition to ready. Do not repeat while ready. |
| boss-phase | Deep civic bell and a tense overtone; state change must also appear visually. |

Seven ultimate cast cues are **separate authored sounds** with unique hashes and content IDs validated against `content/classes.json`:

| Class / ultimate | Cue | Identity |
| --- | --- | --- |
| Soldier / Last Roll Call | ultimate-soldier | Three clear D–A–D calls with a final reload latch. |
| Heavy / Foundry Overture | ultimate-heavy | Accelerating eight-tooth feed motor with a low foundry string. |
| Tank / The City Holds | ultimate-tank | Low gate slam with stable reinforcing D/A overtones. |
| Medic / Names Returned | ultimate-medic | D–F–A–D glass ascent and a breath of bowed harmonics, with delayed resolution. |
| Mage / Silent Twelfth | ultimate-mage | Reverse bell intake followed by three bounded pulses. Cast cue timing is illustrative; combat pulses remain server-owned. |
| Engineer / Impossible Machine | ultimate-engineer | Ratchet sequence, ascending D–A–C–D gears and a low locking knock. |
| Assassin / Unwritten Passage | ultimate-assassin | Inward air and narrow falling harmonic slash that rapidly leaves room for combat. |

Ultimate cues play on an accepted cast event. A rejected cast cannot play the success cue. The seven manifest `ultimateId` values match the seven content definitions. Long active effects and capstone upgrades may change the visual state and duration; they must not stretch or loop a finite cast cue. Reuse the ready cue when the server reports the cooldown becoming ready.

## Runtime mix and multiplayer budget

All gain values below are initial design values, pending in-game/device listening. Persist independent master, music, effects and ambience sliders with immediate feedback. Zero means mute. No dialogue or spoken localization is required for the delivered cues.

- Initial music gain 0.25, effects gain 0.70 and ambience gain 0.18; master default 0.80. Sliders operate on perceptual curves. Expose a reduced-dynamics option for small speakers and late-night play.
- Category trims before the effects slider: local weapon −10 dB; remote weapon −16 dB; impact −16 dB; dodge −12 dB; UI −14 dB; ordinary ultimate cast −8 dB; revive/Accord −8 dB; urgent warning −6 dB. These values preserve headroom but are not a mastering certification.
- Warning priority 100; Accord 95; revive/downed 90; ultimates/phase 85; ready 70; UI 55–60; local motion 45; shots/impacts 18–25. Steal the oldest lowest-priority eligible voice. Never steal an urgent local warning for a remote shot.
- Maximum 32 simultaneous one-shots. Shared caps: eight weapon voices, six impact voices, four remote ultimate voices, four environmental voices, four local ability/motion voices, two UI voices, two warning voices and two team-state voices. Unused reserved warning/team slots can remain silent; they are not filled by extra gunfire.
- The local weapon has first claim within the weapon cap. Select remote shots by proximity and recent audibility. Do not sonify all 50 players at full density. Coalesce identical remote impacts within 50 ms and 120 world px. SFX suppression is cosmetic and never changes simulation or hides visual hazards.
- Duplicate warnings are rate-limited to one per 0.6 s. Different lethal threats may use their visual markers while sharing a short danger cue. Mix multiple cues through a gain stage with a soft safety compressor; objective final-bus tests must prove that bursts remain below full scale.
- Warning duck: music −6 dB, attack 35 ms, release 300 ms. Downed-state UI remains clear; do not apply audio muffling that hides external warnings.
- Spatialize only world effects. Local warnings, UI, ultimate-ready and essential team-state feedback remain centered. Clamp panning to ±0.75, use distance attenuation and mono-compatible cues. Do not make stereo location the only source of danger information.

Required visual equivalents: Incoming marked attack; Ally revived; Accord Break: boss vulnerable; You are downed; Ultimate ready; Boss phase changed; and each localized ultimate name plus active/cast state. Keep those runtime strings in the 15 launch catalogs. The audio assets contain no language-specific words; audio captions must follow the selected locale and RTL layout rules.

## Full soundtrack and ambience production map

These are exact later production targets. No row marked planned should appear as a completed soundtrack asset in a changelog, release or evidence report. Expand the proof motifs into longer phrases instead of simply duplicating the eight-bar file four times.

| Track | Delivery status | Role | Tempo / full form | Musical direction |
| --- | --- | --- | --- | --- |
| City Wake | Eight-bar proof delivered; full form planned | Main menu, lobby, votes, shop | 78 BPM, 4/4, 32 bars, 98.461538 s nominal | Four eight-bar developments; sparse bells and warm strings. |
| Vigil Engine | Eight-bar proof delivered; full form planned | Gatehouse, default combat and initial Endless cycle | 104 BPM, 4/4, 32 bars, 73.846154 s nominal | Four varied ostinato phrases; leave warning space. |
| Wardlight | Planned | Triage Yard and restoration encounters | 88 BPM, 4/4, 32 bars, 87.272727 s nominal | Bowed glass, muted viola, restrained heartbeat pulse. |
| Boneworks | Planned | Ossuary Works | 110 BPM, 4/4, 32 bars, 69.818182 s nominal | Wood/metal work rhythm, low cellos, thin bell answers. |
| Drowned Steps | Planned | Sunken Chapel | 92 BPM, 4/4, 32 bars, 83.478261 s nominal | Low suspended harmony, damp bells, irregular sparse percussion. |
| Brass and Cinders | Planned | Bell Foundry | 116 BPM, 4/4, 32 bars, 66.206897 s nominal | Deeper mechanical pulse and minor brass-like harmonics; keep upper register quiet. |
| Names Below | Planned | Crown Crypt, Drowned Regent, campaign finale | 96 BPM, 4/4, 32 bars, 80.000000 s nominal | Living D–A–D motif against the E-flat city tension; warm final return. |
| The Missing Bell | Planned | The Uncounted extension | 108 BPM, 4/4, 24 bars, 53.333333 s nominal | Sparse inharmonic choir-like synthesis, missing downbeats, clear pulse layer. |
| Quiet Ledger | Planned | Victory, recovered names, optional-extension choice | 78 BPM, 4/4, 16 bars, 49.230769 s nominal | Resolved strings, no percussion, melodic memorial answer. |
| Last Window | Planned | Defeat and retry screen | 78 BPM, 4/4, 8 bars, 24.615385 s nominal | Restrained descending viola; leave room for the retry decision. |

Four timed experiences inherit music from the active arena. Grand Raid adds the final tension layer in phase three. Endless rotates the six arena track families according to the arena, with no artificial final-cue trigger. Cycle ten changes musical development or adds one tension layer; it must not endlessly accumulate layers or loudness. The leaderboard and post-run results use City Wake or Quiet Ledger as appropriate, not a second competing track.

Deliver six **60-second circular stereo ambient beds**, one per arena: Gatehouse wind/loose hinge; Triage canvas/low building air; Ossuary distant drive train/wood creak; Chapel water/lower stone air; Foundry cold brass resonance/soft chain; Crypt low room tone/distant water. No nearby combat tells, footsteps implying a player, language-specific speech, or startling transient should be baked into a bed. Use original synthesis/recording with documented rights; retain sources. Supply a mono fold-down and mark safe playback level.

Later full SFX coverage must add: reload start/complete; empty magazine; all fourteen Q/E abilities; turret creation/shot/destruction; barricade creation/break; each boss's anticipation/release/phase/defeat family; enemy death; shield hit/break; heal/cleanse; revive start/cancel; pickup/coin/respec; voting state; room join/leave; countdown; victory/defeat stingers. Reuse sonic families where consistent, and never claim an implemented bank from the representative proof count alone.

## Verification and acceptance

Rebuild with the bundled Python or another Python environment containing numpy:

```powershell
python tools/synthesize-audio.py
python tools/synthesize-audio.py --verify-only
```

The generator writes only its audio artifacts and `reviews/audio-proof-review.json`; it does not touch game content, Git state or deployment settings. The score is deterministic for the documented source and numerical environment. Current verification used Python's WAV writer and numpy 2.3.5. Byte hashes, rather than a promise about every possible numerical library/platform, are the provenance authority.

Stage 1 objective acceptance:

1. Two music masters, four same-length stems per master, and 25 cue WAVs exist exactly once in the manifest.
2. Every file is non-silent stereo PCM at 44.1 kHz/16-bit, has no clipped samples, peak below 0.72, absolute DC below 0.0001 and mono loss better than −6 dB.
3. Each music seam is at most 1.5 times its own 99.9th-percentile interior sample step plus two PCM steps. Every one-shot starts and ends at zero within one PCM step.
4. Unity stems match the master within three PCM steps, all hashes match the manifest and the source hash matches the generator. All seven ultimate IDs match content definitions, and all SFX hashes differ.
5. Render twice and compare delivered WAV hashes; run byte-only verification afterward. Preserve the actual evidence separately from subjective approval.

Later listening acceptance is separate: loop each music file for at least six cycles; check phrase continuity, fatigue, masking, tonal balance, clicks and noise. Test headphones, stereo speakers, a mono phone speaker and low volume. Listen to a crowded 50-player mix with the game sound count caps, warning ducking and master safety stage active. Verify warnings with music on/off, caption meaning in all locales, muted-device behavior, scene cleanup and unlock-on-interaction behavior. Test adaptive layers and compressed release transcodes after export; do not infer gapless compressed playback from WAV results.

Human/native-device listening and final runtime mixing remain pending. No such approval is asserted by the objective proof report.
