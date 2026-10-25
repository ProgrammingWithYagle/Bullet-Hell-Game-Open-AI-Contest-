# Seven classes and six distinct arenas

All seven survivor classes are playable in local Practice and authoritative Colyseus rooms. This continuation adds Tank, Mage, Engineer and Assassin, bringing the connected roster to 378 nodes, 63 specialization paths and 28 weapons. Each class retains the established stat/weapon tree and all six steps of its paths. Local protocol-7 boundaries migrate only with the previous three-class/nine-boss roster; network clients and signed online saves require protocol 8.

Tank deploys a finite-health bullet wall, charges through enemies with swept contact and invulnerability, and grants nearby allies temporary Citadel shield and armor. Mage places a slowing damage sigil, bursts a ward that shields allies inside it, and casts a three-pulse Requiem with local bullet clearing. Engineer builds finite-health shooting turrets and barricades; the Siege Engine shoots independently and accelerates its owner's turrets. Assassin veils against newly aimed attacks, blinks through enemies while respecting cover, and receives guaranteed primary critical hits plus three free empowered steps during Last Passage. Existing bullets, contact and environmental hazards still threaten veiled players. Construct ownership, damage credit, shields, cooldowns and free charges remain authoritative and replicate to clients. Temporary kit state clears at encounter boundaries.

Maps now have different obstacle arrangements and actual playable sizes. A common 1600 by 1000 camera contains each footprint; outside margins are solid collision boundaries. Server simulation, local worker, setup preview and client prediction use the same layout source.

| Arena | Playable size | Layout |
| --- | --- | --- |
| Gatehouse | 1600 × 1000 | Original walled courtyard, fountain cover and outer lanes |
| Triage Yard | 1600 × 900 | Wide bed promenade with four staggered islands |
| Ossuary Works | 1300 × 1000 | Tall S-shaped route around offset machinery |
| Sunken Chapel | 1400 × 920 | Central altar, side chapels and an open nave |
| Bell Foundry | 1500 × 850 | Broad forge floor and diagonal corridors |
| Crown Crypt | 1240 × 880 | Compact asymmetric tomb court |

All fifty survivor spawn positions, all five possible Accord pads and each boss spawn remain reachable on every layout. Tests also compare authoritative movement with client prediction over ninety ticks, including dodges and outer boundaries. Widow shutters divide the actual map width, leaving the same physically open passage on both server and client. Selection changes the real opening map; route progression rotates subsequent maps.

The class art package preserves original PNGs, exact built-in imagegen requests, portable references and rejected/superseded attempts. Selected sprites use independently drawn facings, never horizontal reflection. The packer only crops, uniformly resizes and pads RGBA. Art source and packing checks do not establish final rendered or human acceptance. Remaining boss identities, Standard/Long/Raid routes, final action/environment art, durable profiles/rankings, release packaging and device/WAN/endurance acceptance remain open. This is continued development, not a complete-game claim.

Selected art: sixteen directional run clips contain 124 approved poses. Engineer north intentionally uses four poses because the remaining four exchange weapon hands. Fifty-two new weapon/path illustrations bring the item library to 123 unique images, plus sixteen painted construct/cover props. Independent reconstruction checks every shipped pixel, source hash and atlas hash. Native motion and size proofs were inspected by the assistant; no browser-rendered, human or physical-device acceptance is implied.
