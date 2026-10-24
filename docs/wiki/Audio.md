# Audio and boss themes

All sixty executable bosses have an individual original composition and synthesized PCM master. Melodies, harmonic routes, phrasing and arrangements vary. No sampled commercial music is used.

| Boss | Theme |
| --- | --- |
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

All sixty boss themes and City Wake have 192 kbps delivery copies: 64,351,596 bytes versus 472,276,236 PCM bytes. Original WAV masters and scores remain unchanged and bundled as fallback. The runtime checks decoded frame duration before looping and falls back on decode failure or unexpected padding. FFmpeg decode/frame/SNR/headroom/DC/seam checks pass for 61 copies; browser/device decoding and human listening remain unreviewed. The full pipeline now passes 272 tests. See the [delivery audit](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/audio-delivery-2026-10-24.json). Encoder details follow the [FFmpeg MP3 format documentation](https://ffmpeg.org/ffmpeg-formats.html#mp3). The encoder is a development tool and is not shipped with the game.
