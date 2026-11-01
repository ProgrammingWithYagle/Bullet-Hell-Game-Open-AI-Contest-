# Visual novel presentation and production

The user requests a dedicated full-screen novel when opening a chapter, more natural individual voices, a narrator for descriptive detail, future emotion/action sprites and possible character audio. They also request a wider cast and clarify that the seven leads recently entered classes shared by many other people.

## What was studied

This pass studies primary engine documentation and applies it to this repository. It does not claim firsthand playthroughs of additional visual novels or that documentation alone establishes literary quality.

Ren’Py distinguishes named dialogue from unnamed narration and allows per-character presentation. Our scripts should identify who actually speaks rather than treating the class associated with an illustration as the speaker of every paragraph. A third-person page containing several quotations remains narration until its utterances are explicitly scripted. [Dialogue and narration](https://www.renpy.org/doc/html/dialogue.html).

Backgrounds, character images, layers, image attributes and transitions are separate parts of staging. Expressions and poses should respond to a written moment, and scene changes should preserve spatial continuity. Our neutral portraits are not an emotion/action set. Future cast assets need character IDs independent of class IDs so two Engineers can look and behave differently. [Displaying images](https://www.renpy.org/doc/html/displaying_images.html).

A backlog records what has already been displayed, including speaker and voice information. Our existing complete-scene transcript is an accessibility/readback tool, not a persistent seen-line history or branching rollback system. A later history system must distinguish reading from choosing or earning progress. [Dialogue history](https://www.renpy.org/doc/html/history.html).

Voice belongs to a dialogue identity, can stop or sustain when the reader advances, and can be replayed or muted per character. Language editions need explicit audio ownership. A small voiced pilot should establish voices and delivery before committing a very long manuscript to production. [Voice](https://www.renpy.org/doc/html/voice.html).

Text speed, unseen-text skipping, choice interruption, voice sustain and waiting for voice completion are reader preferences. These inform our future controls; they have not all been implemented. Never let auto-advance or skip press the party’s Ready control or choose a route. [Preferences](https://www.renpy.org/doc/html/preferences.html).

## Current presentation work

The candidate reader uses a native modal dialog filling the game viewport, with a large existing backdrop/portrait stage, paragraph-preserving text, previous/next, transcript and return controls. Hub chapter/report selections open the reading screen. Story aftermaths can open automatically; their local open/closed state survives UI rebinding without repeatedly reopening an explicitly closed scene. Keyboard navigation and Escape are supported. Reading positions remain local and revision/language-specific; no Ready vote or progress is granted by reading.

Focused native controller checks cover modal ownership, open/close, focus return, disposal, keyboard controls, transcript handling, rebind behavior and earned chapter entry. They do not establish rendered sizing, accessibility-tree quality, device layout or human comfort. Browser automation remains disabled. Full verification and a human preview are still required for the candidate.

No voiced clip or new expression/action sprite is delivered by this candidate. The available tool inventory did not expose a character-speech production tool in this pass. Voice production remains a separate task; app voice-chat controls are not character voice generation. Do not substitute a generic system voice and call it final character acting.

## Writing and cast direction

Use narration for physical layout, movement, time, sensory detail and explanatory context. Characters can explain things when they have a reason to do so, but they should also misunderstand, evade, joke, interrupt and leave a thought unfinished. Avoid giving everyone short moral slogans or turning every exchange into a mission briefing.

Mara tends to organize under stress and can correct herself reluctantly. Hux notices whether something works and uses practical humor. Bram states limits plainly and need not make every reassurance a speech. Iona can listen carefully while still overcommitting or misjudging another person. Sable can be curious, excited and wrong; uncertainty is not a requirement to speak cryptically. Tamsin has pride and impatience alongside her practical knowledge. Vale speaks plainly and can make mistakes about trust; preserve their they/them identity. These are starting distinctions, not catchphrase templates or completed personal arcs.

The playable leads are recent class entrants. Earlier occupations and relationships can explain their habits without making them veteran masters of that class. The world should include peers, teachers, veterans, rivals, civilians and human antagonists with independent goals. Senn, Renn, Evi and Jorren enter the revised opening; Miri, Olan and Dena remain working proposals. Their lives should continue beyond the party’s immediate need.

## Sprite and audio work still required

Create stable character/utterance IDs, a cast registry separate from classes, speaker and narration segments, stage positions, expression/pose cues and voice asset references. Existing portraits remain the honest fallback while new art is produced. Do not label a neutral face as a delivered emotion set or reuse one class portrait for every practitioner.

Prepare a short revised pilot with the leads and at least one supporting character. Plan the art actually needed by its beats, produce and inspect it, then integrate it. For audio, provide distinct original or appropriately licensed performances, a narrator decision, pronunciation guidance, volume controls, replay and a clear advance/auto policy. Preserve subtitles. Music, ambience, sound effects and voice need separate handling. Missing or muted audio must leave the story fully playable.

Story writing, illustrations, voices, timing and gameplay should be reviewed together at scene scale. A long story benefits from strong complete scenes and continuity; word count alone cannot provide that.
