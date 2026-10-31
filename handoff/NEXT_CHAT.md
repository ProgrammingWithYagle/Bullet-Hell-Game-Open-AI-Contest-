# Grave Accord — next chat

Use this same checkout on feat/first-playable-loop. Public Site: https://grave-accord.yigallin0423.chatgpt.site . Version2 currently uses game source8c75bb8 and protocol43; a final HUD alignment pass and authorized cleanup are in progress. Final publication details will replace this paragraph before handoff.

Keep history as feature notes in the canonical in-game history and generated changelogs. Keep this one compact handoff. Link existing source and verification records; do not add copied artwork, whole build snapshots or resources already in the repository. The user explicitly authorized deletion of obsolete generated builds and old handoff copies on2026-10-31. Earlier copies remain retrievable from Git history; this instruction supersedes prior preserve-all-output guidance.

Accepted gameplay rules: Medic revive is Baby full health plus nonstacking20%max-health shield, Easy75%, Normal45%, Hard30%, Insane1HP and Hellish none. Other classes revive at100/50/25%on lower difficulties and cannot revive on Hard or above. Revive channels are finite and consume their charge on success; solo Medic has self-revive value. Passive regeneration is75%on Hard,50%on Insane and0on Hellish. Shield caps are100/75/50/0%of max health on lower/Hard/Insane/Hellish; Tank starts with100%of the cap, Heavy50%, Soldier15%, others0.

Fixed maps stay fixed. Random-per-run chooses once; random-per-encounter may repeat. Boss defeat waits five seconds with its existing fall/final pose and preparation text. Online personal menus/chat do not pause; only explicit host Pause/Continue changes the match. Host departure lets the game continue; End for everyone is separately confirmed. Passwords stay private to the host, with eye controls. C toggles chat unless rebound. Typed names never translate; automatic names change at a fresh setup boundary and stay fixed during setup.

Seven classes,378skills,28weapons,66bosses,six maps,five modes. Do not undo complete-art border clearance, aiming inversion, upper routes, Toad detours or pit-only lava. Existing story-like slogans should not replace plain menu wording.

User feedback: Firefox on a full-screen laptop confirms the boss name/health alignment is fixed and says equipment-to-boss music seems fixed. The arena improved; extra border is a minor concern. The user prioritizes cleaner overall HUD alignment. API/controller/geometry checks do not certify every browser, device or listening condition. Browser automation remains disabled.

The live backend https://grave-accord-contest.onrender.com remains compatible source71fc34c: eight total slots, one room. Mode caps are campaigns8, Raid16, Endless50. Raising hosted limits requires explicit configuration, deployment and load testing. Free SQLite scores are ephemeral on sleep/restart/redeploy. Native Windows downloads/reviews remain separate from browser publication. No main merge, old-Site deletion, capacity increase or paid provisioning was authorized.

Deferred until a fresh post-contest direction: story/lore, companion bots, class branches that increase shield caps, attack blocking, larger General mobility rework, durable global storage and further major content.

Lessons: feature-detect browser audio methods; fit the arena once and share its inverse with aiming; center HUD tracks independently of side content. Regenerate changelogs from src/shared/update-history.json before checking them. Generated development-progress pages also have a canonical generator. Use one current build per audience; clean temporary copies after verification. Keep concise source/CI/publication and cleanup receipts, not repeated asset inventories or copied resources.
