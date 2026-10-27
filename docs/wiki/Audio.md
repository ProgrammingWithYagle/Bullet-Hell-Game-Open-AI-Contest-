# Audio and boss themes

All sixty-six executable bosses have an individual original composition and synthesized PCM master. Melodies, harmonic routes, phrasing and arrangements vary. No sampled commercial music is used.

| Boss | Theme |
| --- | --- |
| Ashen Usher | Empty Balcony |
| Brass Toad | Rain in Bronze |
| Ragpicker's Kite | Thread Above the Street |
| Candle Snail | Slow Wick |
| Cobble Crab | Stones Remember |
| Mourning Kettle | Tea for the Absent |
| Hollow Constable | Hollow Muster |
| Lantern Warden | Last Light |
| Carrion Courier | Undelivered |
| Ratcatcher | Crooked Procession |
| Quarantine Clerk | Final Entry |
| The Tollkeeper | Copper Debt |
| Chain Marshal | Iron Jurisdiction |
| Gate Widow | Third Latch |
| Black Ambulance | Last Carriage |
| Cradle Matron | Cradle Ledger |
| Mold Alchemist | Glasshouse Rot |
| Bellringer | The Late Warning |
| Stitchwright | Needle Debt |
| Glass Surgeon | Aperture |
| Ash Baker | Oven at Dawn |
| Sluice Keeper | Watermark |
| Last Stationmaster | Last Departure |
| The Lamplighter | Unlit Wick |
| The Anatomist | Lecture in Bone |
| Plague Gardener | Green Afterlife |
| Grave Choir | Three Names |
| Red Abbess | Scarlet Vespers |
| Vesper Judge | The Open Half |
| Pallbearer | Shoulders of Wood |
| Cinder Foreman | Last Shift |
| Canal Diver | Under the Lock |
| Clockmender | Borrowed Second |
| Seamstress of Wires | Hem of Silence |
| Gravedigger | One More Yard |
| Ink Notary | The Unclosed Line |
| Spore Beekeeper | Hive Without Sun |
| Ice Custodian | White Corridor |
| Bridge Ferryman | Two Crossings |
| Porcelain Mourner | First Hairline |
| Boiler Tender | Pressure Gauge |
| Mirror Undertaker | The Other Room |
| Chalk Magistrate | Erased Corner |
| Wire Harpist | Three Tensions |
| Crow Shepherd | Black Wing Count |
| Ledger Leech | Unpaid Name |
| Mortuary Engine | Mortuary Drive |
| Drowned Regent | The Water Remembers |
| Salt Patriarch | Three White Steps |
| Chain Colossus | City Under Tension |
| Ossuary Leviathan | Ribs of the Road |
| Bell Triplets | Third Toll |
| Quarantine Heart | Municipal Pulse |
| Crown Procession | Borrowed Crown |
| City Eater | Arch Without Door |
| Saint of the Last Breath | Last Exhalation |
| Hourglass Widow | Sand Twice |
| Unlit Astronomer | Dark Meridian |
| Folded Man | Paper Angle |
| Red Comet | Three Arrivals |
| Memory Taxer | Empty Portrait |
| Choir of Moths | Ivory Night |
| Zero-Hour Conductor | Four Empty Beats |
| Walking District | Streets on Shoulders |
| The Last Knocker | One Door Left |
| The Uncounted | Names Beyond the Bell |

Editable scores, PCM and machine audits remain in the repository. Adding ten Endless/secret tracks preserved the previous fifty masters. Music crossfades, warning ducking and bounded decoded audio caches are connected. Objective checks cover clipping, DC offset, mono compatibility and loop continuity. Human listening and headphone, speaker, phone and crowded online mix acceptance remain open. [Audio sources](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/tree/feat/first-playable-loop/assets/production/audio/boss-themes).

## Compressed delivery, 2026-10-24

The earlier protocol-13 delivery checkpoint: all sixty boss themes and City Wake have 192 kbps delivery copies: 64,351,596 bytes versus 472,276,236 PCM bytes. Original WAV masters and scores remain unchanged and bundled as fallback. The runtime checks decoded frame duration before looping and falls back on decode failure or unexpected padding. FFmpeg decode/frame/SNR/headroom/DC/seam checks pass for 61 copies; browser/device decoding and human listening remain unreviewed. The compressed-delivery checkpoint passed 272 tests; current full-suite totals are recorded in [Development Progress](Development-Progress) and the source verification receipt. See the [delivery audit](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/audio-delivery-2026-10-24.json). Encoder details follow the [FFmpeg MP3 format documentation](https://ffmpeg.org/ffmpeg-formats.html#mp3). The encoder is a development tool and is not shipped with the game.

Current source adds a quiet original synthesized percussion layer aligned to each of the sixty-three boss scores. Later phases and Brutal add rhythmic accents. Music volume, warning ducking and lifecycle cleanup still apply; all original masters and compressed deliveries stay unchanged. Human listening review of the new layer remains open.

## Early Watch expansion

Three new editable original scores use a theatre waltz, a 7/8 bronze hop and a suspended 5/4 cloth-reed phrase. The existing sixty PCM masters remain unchanged. There are now 64 verified compressed tracks including City Wake: 67,527,796 delivery bytes and 495,586,368 PCM bytes. All pass objective frame, SNR, clipping/DC and loop-seam checks; listening and browser/device decoding remain open. [Current audio audit](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/early-watch-integration-2026-10-25/audio-delivery.json).

## Small Wakes original scores

Slow Wick is a G-minor 9/8 plucked-droplet phrase at 88 BPM; Stones Remember is D-minor 5/4 struck keys with a low reed response at 104 BPM; Tea for the Absent is F-sharp-minor 6/8 descending reed/soft metal at 92 BPM. All 63 previous boss masters and score events stay unchanged. The current 66 boss themes plus City Wake have 67 MP3 deliveries: 70,569,830 bytes against 517,909,764 PCM bytes. Independent frame/SNR/headroom/DC/seam decode checks pass. The original masters remain bundled fallback. Listening, rendered/device playback and final mix acceptance stay open. [Exact delivery audit](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/small-wakes-2026-10-26/audio-delivery.json).

## Phase-turn cue

The current phase event uses a new original 1.36-second two-strike bell and short low impact. Effects volume controls it, priority reserves playback space and music briefly ducks. The earlier cue/master files remain unchanged. Exact synthesis/PCM/headroom/DC verification is separate from listening acceptance. Individual themes remain 66 boss themes plus City Wake.
