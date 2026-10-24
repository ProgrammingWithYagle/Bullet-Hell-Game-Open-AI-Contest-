# Audio

Every one of the 43 playable bosses has an individual original theme. These are separate editable compositions and synthesized PCM masters, with different motifs, phrasing and arrangements. They are not merely the same track transposed to another key. No sampled commercial music is used.

| Boss | Theme | Tempo | Meter |
| --- | --- | --- | --- |
| Hollow Constable | Hollow Muster | 108 BPM | 4/4 |
| Lantern Warden | Last Light | 72 BPM | 3/4 |
| Carrion Courier | Undelivered | 144 BPM | 4/4 |
| Ratcatcher | Crooked Procession | 126 BPM | 7/8 |
| Quarantine Clerk | Final Entry | 100 BPM | 5/4 |
| The Tollkeeper | Copper Debt | 94 BPM | 4/4 |
| Chain Marshal | Iron Jurisdiction | 88 BPM | 6/4 |
| Gate Widow | Third Latch | 66 BPM | 3/4 |
| Black Ambulance | Last Carriage | 156 BPM | 6/8 |
| Cradle Matron | Cradle Ledger | 62 BPM | 3/4 |
| Mold Alchemist | Glasshouse Rot | 114 BPM | 5/8 |
| Bellringer | The Late Warning | 58 BPM | 4/4 |
| Stitchwright | Needle Debt | 128 BPM | 7/8 |
| Glass Surgeon | Aperture | 92 BPM | 5/4 |
| Ash Baker | Oven at Dawn | 104 BPM | 4/4 |
| Sluice Keeper | Watermark | 78 BPM | 6/8 |
| Last Stationmaster | Last Departure | 132 BPM | 4/4 |
| The Lamplighter | Unlit Wick | 68 BPM | 3/4 |
| The Anatomist | Lecture in Bone | 112 BPM | 5/4 |
| Plague Gardener | Green Afterlife | 86 BPM | 6/8 |
| Grave Choir | Three Names | 64 BPM | 5/4 |
| Red Abbess | Scarlet Vespers | 72 BPM | 5/4 |
| Vesper Judge | The Open Half | 96 BPM | 4/4 |
| Pallbearer | Shoulders of Wood | 76 BPM | 4/4 |
| Cinder Foreman | Last Shift | 118 BPM | 7/8 |
| Canal Diver | Under the Lock | 64 BPM | 6/8 |
| Clockmender | Borrowed Second | 112 BPM | 5/4 |
| Seamstress of Wires | Hem of Silence | 104 BPM | 3/4 |
| Gravedigger | One More Yard | 82 BPM | 4/4 |
| Ink Notary | The Unclosed Line | 96 BPM | 5/4 |
| Spore Beekeeper | Hive Without Sun | 108 BPM | 7/8 |
| Ice Custodian | White Corridor | 74 BPM | 4/4 |
| Bridge Ferryman | Two Crossings | 90 BPM | 6/8 |
| Porcelain Mourner | First Hairline | 68 BPM | 3/4 |
| Boiler Tender | Pressure Gauge | 122 BPM | 4/4 |
| Mirror Undertaker | The Other Room | 80 BPM | 5/4 |
| Chalk Magistrate | Erased Corner | 100 BPM | 4/4 |
| Wire Harpist | Three Tensions | 116 BPM | 3/4 |
| Crow Shepherd | Black Wing Count | 138 BPM | 7/8 |
| Ledger Leech | Unpaid Name | 92 BPM | 5/4 |
| Mortuary Engine | Mortuary Drive | 126 BPM | 4/4 |
| Drowned Regent | The Water Remembers | 72 BPM | 5/4 |
| Salt Patriarch | Three White Steps | 84 BPM | 3/4 |

The audio bus switches boss themes, crossfades over 0.75 seconds, ducks music for warnings, caps live SFX voices at twelve and retains at most three decoded music buffers. Original menu/combat proofs and the representative SFX bank are separate assets. The earlier nine boss PCM masters were preserved when Midnight was added; all 23 earlier masters were preserved unchanged when the twenty Pilgrimage themes were added.

## Production and verification

[Deterministic score/synthesis source](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/tools/compose-boss-themes.py) · [Theme manifest](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/assets/production/audio/boss-themes/library.json) · [Objective audio audit](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/boss-themes-review.json)

The audit checks all 43 masters for format, clipping, DC offset, mono compatibility and loop continuity. Objective file checks do not establish subjective listening approval or a finished device mix. Native headphone, speaker, phone, muted-device and crowded online listening remain acceptance work.

Arena ambience, full-length menu/results development and complete per-action/per-boss SFX coverage remain in production. New bosses must receive their own composition rather than silently reusing an earlier boss identity's theme.
