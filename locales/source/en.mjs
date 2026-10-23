const rows = text => Object.fromEntries(text.trim().split('\n').map(line => { const p=line.indexOf('|'); return [line.slice(0,p),line.slice(p+1)]; }));
export const english = {
ui: rows(`
brand|Grave Accord
tagline|Hold the line. Remember their names.
play|Play
solo|Offline solo
online|Play online
continue|Continue run
newRun|New run
settings|Settings
language|Language
leaderboards|Leaderboards
changelog|What's new
credits|Credits
quit|Quit
back|Back
confirm|Confirm
cancel|Cancel
close|Close
apply|Apply
reset|Reset
save|Save
loading|Loading…
retry|Retry
yes|Yes
no|No
on|On
off|Off
search|Search
filter|Filter
publicRooms|Public rooms
privateRoom|Private room
createRoom|Create room
joinRoom|Join room
roomCode|Room code
enterCode|Enter the room code
copyCode|Copy code
copied|Copied
displayName|Display name
chooseClass|Choose your class
chooseMode|Choose a mode
chooseDifficulty|Choose difficulty
ready|Ready
notReady|Not ready
start|Start run
leaveRoom|Leave room
host|Host
players|Players
ping|Latency
region|Region
roomFull|Room is full
noRooms|No rooms found. Create a room to begin.
roomHidden|Private rooms do not appear in public discovery.
joining|Joining the room…
connecting|Connecting to the server…
serverWaking|Starting the server. This may take a moment.
queue|Waiting for server capacity. Position: {position}.
reconnecting|Reconnecting… Your slot is reserved for {seconds}.
reconnected|Connection restored.
lateJoin|You will enter at the next encounter.
roomSettings|Room settings
extendBreaks|Extended intermissions
resumeCheckpoint|Resume checkpoint
checkpointAge|Checkpoint saved {time}.
checkpointExpires|This checkpoint expires {time}.
health|Health
shield|Shield
ammo|Magazine
reload|Reload
reloading|Reloading…
boss|Boss
bossDeadline|Boss deadline
encounter|Encounter {number}
phase|Phase {number}
coins|Coins
skillPoints|Skill points
abilityQ|Ability Q
abilityE|Ability E
ultimate|Ultimate
dodge|Dodge
revive|Revive
interact|Interact
readyUltimate|Ultimate ready
cooldown|Ready in {seconds}
downed|Downed
eliminated|Eliminated
revivePrompt|Hold {binding} to revive {player}.
reviveProgress|Reviving {player}: {progress}
bleedout|Rescue window: {seconds}
selfRevive|Use self-revive
spectating|Watching {player}
accordBreak|Accord Break
accordInstruction|Stand in marked zones together to break the boss's guard.
accordSuccess|Accord Break achieved!
accordMissed|The opening passed. Keep fighting.
mutationVote|Choose the next mutation
bossVote|Choose the next contract
vote|Vote
yourVote|Your vote
abstain|Abstain
voteTime|Voting ends in {seconds}.
voteTie|Ties use the run's fixed selection order.
bossConcealed|Identity concealed
threat|Threat
bounty|Bounty
recommended|Recommended squad strength
activeMutations|Active mutations
durationEncounters|Remaining encounters: {count}
incompatible|Incompatible with {name}.
shop|Class shop
buy|Buy
equip|Equip
equipped|Equipped
owned|Owned
upgrade|Upgrade
maximum|Maximum reached
notEnoughCoins|Not enough coins.
inventoryFull|Inventory is full.
respec|Reset skill allocation
respecCost|Reset cost: {coins} coins.
skillTree|Skill tree
unlock|Unlock
prerequisite|Requires {name}.
capstone|Capstone
capstoneLimit|Only one capstone can be active.
buildRating|Build strength
ratingExplanation|Measures purchased power against your class baseline, not player skill.
shopTime|Deployment in {seconds}.
deploying|Deploying…
victory|Campaign complete
defeat|Squad defeated
timeout|The contract deadline expired.
victoryBanked|Campaign victory and rewards are secured.
secretOffer|The Uncounted waits. Accept an optional final encounter?
secretAccept|Face The Uncounted
secretDecline|Return with your victory
secretLocked|Complete a campaign on Normal or higher with three Accord Breaks and no timeouts.
endlessSummary|Survive without a final round. Power has limits; the night does not.
endlessCycle|Vigil cycle {cycle}
endlessExit|Leave after this encounter and keep earned rewards.
rewards|Rewards
mastery|Mastery
unlocked|Unlocked: {name}
hardUnlock|Complete a full campaign on Hard to unlock this difficulty.
playAgain|Play again
mainMenu|Main menu
returnLobby|Return to lobby
leaderboardMode|Mode or route
leaderboardDifficulty|Difficulty
leaderboardSeason|Season
leaderboardSquad|Squad
leaderboardRank|Rank
leaderboardScore|Score
leaderboardTime|Clear time
leaderboardSurvivors|Survivors
leaderboardDamage|Damage received
leaderboardSurvival|Survival time
leaderboardEncounters|Encounters cleared
leaderboardNoEntries|No verified runs yet.
leaderboardSharedRank|Everyone in the squad shares this rank.
leaderboardVerified|Server verified
leaderboardLocal|Local record
leaderboardPending|Verification pending
leaderboardUnranked|Unranked run
leaderboardDetails|Run details
leaderboardFilters|Rankings compare the same mode, difficulty and squad size.
leaderboardSubmit|Publish this squad result
leaderboardPrivacy|Display names are public. Do not enter personal information.
audio|Audio
masterVolume|Master volume
musicVolume|Music volume
effectsVolume|Sound effects volume
muteUnfocused|Mute in background
graphics|Graphics
effectsQuality|Effects quality
friendlyEffects|Friendly effects
screenShake|Screen shake
flashIntensity|Flash intensity
hitboxes|Show hitboxes
highContrast|High contrast hazards
colorblind|Color vision palette
textSize|Text size
reduceMotion|Reduce motion
controls|Controls
aimAssist|Aim assist
autoFire|Auto-fire
rebind|Change binding
pressBinding|Press a key or button.
bindingConflict|This binding is already used by {action}.
touchScale|Touch control size
gamepad|Gamepad
vibration|Vibration
subtitles|Subtitles and visual sound cues
fullscreen|Full screen
languageNotice|Language changes immediately; your choice is saved on this device.
profile|Profile
exportProfile|Export profile
importProfile|Import profile
deleteProfile|Delete local profile
deleteConfirm|Delete mastery, discoveries and local records on this device?
offlineNotice|Offline runs save locally and do not enter verified online rankings.
pause|Pause
paused|Paused
onlinePause|Online matches continue while menus are open.
howToPlay|How to play
tutorialMove|Move with {binding}; aim toward the pointer or aim stick.
tutorialDodge|Use {binding} to dodge through danger briefly.
tutorialTeam|Stay close enough to rescue allies; hostile hazards remain dangerous while invisible.
tutorialUltimate|Use {binding} for your ultimate. Its cooldown and upgrades appear in the skill tree.
portraitHint|Rotate your phone for landscape combat.
leaveConfirm|Leave this run? Completed encounter rewards are kept.
newsTitle|Release highlights
newsStage1|Design update: seven classes, unique ultimates, true endless play, squad rankings and fifteen languages are specified.
newsEvidence|Release notes distinguish planned features from implemented and verified features.
translationNotice|AI-authored translations. Native-speaker review is pending.
errorNetwork|Connection failed. Check your connection and try again.
errorCode|Room code was not found or has expired.
errorVersion|Game and server versions differ. Update and try again.
errorName|Choose a display name between 2 and 20 characters.
errorCheckpoint|Checkpoint is invalid, expired or from another version.
errorProfile|This profile file is invalid or unsupported.
errorPort|This hosting port is occupied. Choose another port.
errorServer|The server could not complete this action. Try again.
errorRate|Too many requests. Wait a moment and try again.
errorPurchase|Purchase rejected. Your coins were not spent.
errorLocked|This option is locked.
errorSave|Saving failed. Export your profile before leaving.
errorAudio|Audio could not start. Tap the audio button to enable it.
errorCapacity|The server has reached its player limit. You can wait or play solo.
lanHost|Host on local network
lanAddress|Share this address with players on your local network: {address}
hostingWarning|Keep the host application open while others are playing.
viewChangelog|View full changelog
version|Version {version}
accessibility|Accessibility
support|Help and troubleshooting
`),
stat: rows(`
weaponDamage|Weapon damage
damage|Damage
fireRate|Fire rate
extraShots|Extra projectiles
cooldownReduction|Ability cooldown reduction
abilityPotency|Ability potency
ultimateCooldownReduction|Ultimate cooldown reduction
ultimatePotency|Ultimate potency
rallyRadius|Rally radius
ultimateShield|Ultimate shield
maxHealth|Maximum health
armor|Armor
regeneration|Health regeneration
selfRevives|Self-revives
pierce|Pierces
suppressionDuration|Suppression duration
ultimateDuration|Ultimate duration
barrierHealth|Barrier health
healOnHit|Healing on hit
reviveRate|Revive rate
ultimateRadius|Ultimate radius
sigilRadius|Sigil radius
ultimatePulses|Ultimate pulses
turretDamage|Turret damage
extraTurrets|Extra turrets
criticalChance|Critical chance
veilDuration|Invisibility duration
ultimateCharges|Ultimate charges
moveSpeed|Movement speed
reloadTime|Reload time
magazine|Magazine capacity
projectileSpeed|Projectile speed
spread|Spread
range|Range
cooldown|Cooldown
duration|Duration
radius|Radius
price|Price
healing|Healing
bossHealth|Boss health
bossDamage|Boss damage
bossSpeed|Hostile projectile speed
bossBulletCount|Boss projectile count
coins|Bounty
timer|Boss deadline
dodgeCooldown|Dodge cooldown
startShield|Starting shield
reviveTime|Revive channel time
reloadReduction|Reload time reduction
health|Health
shield|Shield
stack|Inventory limit
grade|Grade
`),
template: rows(`
weapon|Damage: {damage}. Fire rate: {fireRate}. Magazine: {magazine}. Reload: {reloadTime}. Projectiles per shot: {pellets}. Pierces: {pierce}.
skill|{effects}. Bonuses add to your purchased build and respect the global modifier limits.
mutation|{effects}. Lasts for {encounters} encounters; incompatible mutations cannot be active together.
upgrade|{effects} per level. Maximum level: {maximum}. Next price: {price}.
effect|{label}: {value}
effectPercent|{label}: {value}
effectMultiplier|{label}: ×{value}
effectFlat|{label}: {value}
seconds|{value} s
percent|{value}%
points|{value} percentage points
perSecond|{value}/s
pixels|{value} world units
weaponRole|A class-compatible weapon. Reserve ammunition is unlimited; magazine reloads still apply.
`),
mode: rows(`
short.name|Quarantine Run
short.description|Five contracts from the breached gate to the drowned council chamber. A compact complete campaign.
standard.name|Midnight Circuit
standard.description|Ten contracts around the quarantined city, with a full build and a final confrontation.
long.name|Black Bell Pilgrimage
long.description|Sixteen encounters across every district, with champions and additional survivor testimony.
raid.name|Grand Raid
raid.description|Three extended boss encounters for up to sixteen players, with accelerated builds and larger cooperative objectives.
endless.name|Endless Vigil
endless.description|Survive successive bosses with no final round. Vote, shop and reinforce between encounters while danger keeps escalating. Supports solo play and groups of up to fifty.
`),
difficulty: rows(`
baby|Baby
easy|Easy
normal|Normal
hard|Hard
insane|Insane
hellish|Hellish
`),
class: rows(`
soldier.name|Soldier
soldier.role|Reliable ranged damage and squad leadership.
soldier.lore|Mara refused to bar the infirmary doors. She counts everyone before she moves.
heavy.name|Heavy
heavy.role|Sustained fire and suppression.
heavy.lore|Hux carries the foundry's last functioning feed motor into the streets.
tank.name|Tank
tank.role|Protection, interruption and rescue.
tank.lore|Bram carries a door that outlived its building. A shield needs someone behind it.
medic.name|Medic
medic.role|Healing, cleansing and rapid recovery.
medic.lore|Iona wrote names on bandages when paper ran out. The bells will not erase them.
mage.name|Mage
mage.role|Area control and magical burst damage.
mage.lore|Sable studied forbidden bell harmonics. The cure and curse share a notebook.
engineer.name|Engineer
engineer.role|Deployables, repair and controlled ground.
engineer.lore|Tamsin repairs tools with mismatched parts. She believes the city can be repaired too.
assassin.name|Assassin
assassin.role|Precision damage, mobility and evasion.
assassin.lore|Vale carried letters through streets the watch had abandoned. They still know the alleys that lead home.
`),
branch: rows(`
ballistics|Ballistics
command|Command
survival|Survival
ordnance|Ordnance
suppression|Suppression
endurance|Endurance
breaching|Breaching
protection|Protection
bastion|Bastion
chemistry|Chemistry
triage|Triage
recovery|Recovery
hexcraft|Hexcraft
control|Control
warding|Warding
demolitions|Demolitions
constructs|Constructs
repair|Repair
precision|Precision
ambush|Ambush
evasion|Evasion
`),
ability: rows(`
soldier-q.name|Rally Field
soldier-q.description|Allies in the field gain 20% weapon damage and 10% movement speed.
soldier-e.name|Precision Burst
soldier-e.description|Fire three accurate piercing rounds toward the aim point.
soldier-ultimate.name|Last Roll Call
soldier-ultimate.description|Instantly reload allies, clear nearby hostile projectiles once, and grant 35% weapon damage in the field for 8 seconds.
heavy-q.name|Suppressing Cone
heavy-q.description|Fire fourteen rounds in a cone and slow ordinary enemies by 40%.
heavy-e.name|Braced Firing
heavy-e.description|Gain 45% damage resistance and 30% fire rate for 5 seconds; move at 60% speed.
heavy-ultimate.name|Foundry Overture
heavy-ultimate.description|For 6 seconds, gain 70% fire rate and two extra pierces without consuming the magazine. Movement is reduced.
tank-q.name|Protective Wall
tank-q.description|Place a 150-health wall that blocks hostile bullets. Allies can walk through it.
tank-e.name|Rescue Charge
tank-e.description|Charge toward the aim point, briefly evade damage and strike nearby enemies.
tank-ultimate.name|The City Holds
tank-ultimate.description|Nearby allies gain 120 shield and 35 percentage points of armor for 8 seconds. Armor respects the global cap; identical fields do not stack.
medic-q.name|Healing Field
medic-q.description|Restore 8 health per second to allies inside the field.
medic-e.name|Cleansing Serum
medic-e.description|Heal nearby allies for 20 health and remove poison and slow effects.
medic-ultimate.name|Names Returned
medic-ultimate.description|After a one-second channel, revive nearby downed or eliminated allies at 60% health. Heal living allies for 40, cleanse effects and deal 35 damage to nearby enemies. Solo also gains 40 shield.
mage-q.name|Binding Sigil
mage-q.description|Damage enemies within a sigil and slow ordinary enemies by 55%.
mage-e.name|Ward Detonation
mage-e.description|Detonate a ward at the aim point and grant nearby allies 35 shield.
mage-ultimate.name|Silent Twelfth
mage-ultimate.description|Release three 120-damage pulses over 3 seconds. The first clears hostile projectiles in range; ordinary enemies are strongly slowed.
engineer-q.name|Rivet Turret
engineer-q.description|Deploy an 80-health turret with 25 base damage per second.
engineer-e.name|Deployable Barricade
engineer-e.description|Deploy a 120-health barrier that blocks hostile bullets. Teammates can pass through it.
engineer-ultimate.name|Impossible Machine
engineer-ultimate.description|Deploy a 200-health siege construct with 90 base damage per second for 14 seconds. Your turrets gain 50% output.
assassin-q.name|Invisibility
assassin-q.description|New aimed attacks cannot target you. Existing hazards still hurt.
assassin-e.name|Shadow Step
assassin-e.description|Blink toward the aim point, briefly evade damage and strike nearby enemies.
assassin-ultimate.name|Unwritten Passage
assassin-ultimate.description|For 5 seconds, gain three free empowered Shadow Steps, 100% critical chance and protection from new aimed attacks. Existing hazards remain dangerous outside dodge invulnerability.
`),
weapon: rows(`
soldier-0.name|Service Pistol
soldier-1.name|Watch Carbine
soldier-2.name|Threefold Rifle
soldier-3.name|Last Watch
heavy-0.name|Belt Gun
heavy-1.name|Drum Repeater
heavy-2.name|Foundry Rotary
heavy-3.name|Iron Choir
tank-0.name|Riot Shotgun
tank-1.name|Gate Breacher
tank-2.name|Slug Driver
tank-3.name|Scatter Bastion
medic-0.name|Injector Carbine
medic-1.name|Suture Repeater
medic-2.name|Serum Sprayer
medic-3.name|Lifeline Rifle
mage-0.name|Grave Wand
mage-1.name|Ash Scepter
mage-2.name|Bell Staff
mage-3.name|Ossuary Rod
engineer-0.name|Rivet Pistol
engineer-1.name|Nail Repeater
engineer-2.name|Arc Riveter
engineer-3.name|Siege Tool
assassin-0.name|Needle Launcher
assassin-1.name|Whisper Pistol
assassin-2.name|Spine Thrower
assassin-3.name|Veil Crossbow
`),
skill: rows(`
soldier-ballistics-1.name|Clean Bore
soldier-ballistics-2.name|Measured Pair
soldier-ballistics-3.name|Copper Jackets
soldier-ballistics-4.name|Crossfire Drill
soldier-ballistics-5.name|Long Watch
soldier-ballistics-6.name|Last Word
soldier-command-1.name|Clear Signal
soldier-command-2.name|Steady Orders
soldier-command-3.name|Shared Bearings
soldier-command-4.name|Fire Discipline
soldier-command-5.name|Unbroken Line
soldier-command-6.name|Citywide Rally
soldier-survival-1.name|Field Dressing
soldier-survival-2.name|Low Profile
soldier-survival-3.name|Hardened Coat
soldier-survival-4.name|Second Wind
soldier-survival-5.name|Hold Fast
soldier-survival-6.name|Nobody Left
heavy-ordnance-1.name|Fresh Belt
heavy-ordnance-2.name|Hot Chamber
heavy-ordnance-3.name|Hard Rounds
heavy-ordnance-4.name|Feed Motor
heavy-ordnance-5.name|Iron Torrent
heavy-ordnance-6.name|Foundry Roar
heavy-suppression-1.name|Wide Sweep
heavy-suppression-2.name|Pinned Shadows
heavy-suppression-3.name|Heavy Rhythm
heavy-suppression-4.name|Clearing Fire
heavy-suppression-5.name|Wall of Lead
heavy-suppression-6.name|Quiet the Street
heavy-endurance-1.name|Padded Harness
heavy-endurance-2.name|Deep Breath
heavy-endurance-3.name|Steel Shoulders
heavy-endurance-4.name|Unshaken
heavy-endurance-5.name|Long Haul
heavy-endurance-6.name|Still Standing
tank-breaching-1.name|Close Quarters
tank-breaching-2.name|Buckshot Proof
tank-breaching-3.name|Door Knocker
tank-breaching-4.name|Breach Pattern
tank-breaching-5.name|Forward Pressure
tank-breaching-6.name|Open the Way
tank-protection-1.name|Broad Guard
tank-protection-2.name|Safe Passage
tank-protection-3.name|Reinforced Face
tank-protection-4.name|Linked Shelter
tank-protection-5.name|Rescue Habit
tank-protection-6.name|The Last Door
tank-bastion-1.name|Riveted Coat
tank-bastion-2.name|Grounded Stance
tank-bastion-3.name|Impact Bracing
tank-bastion-4.name|Deep Reserve
tank-bastion-5.name|Stone Resolve
tank-bastion-6.name|Unfallen
medic-chemistry-1.name|Sharp Dose
medic-chemistry-2.name|Pressure Injector
medic-chemistry-3.name|Stable Mixture
medic-chemistry-4.name|Surgical Volley
medic-chemistry-5.name|Last Formula
medic-chemistry-6.name|Mercy with Teeth
medic-triage-1.name|Clean Hands
medic-triage-2.name|Quick Assessment
medic-triage-3.name|Wide Ward
medic-triage-4.name|Measured Serum
medic-triage-5.name|Rescue Protocol
medic-triage-6.name|Nobody Forgotten
medic-recovery-1.name|Padded Satchel
medic-recovery-2.name|Stubborn Pulse
medic-recovery-3.name|Safe Footing
medic-recovery-4.name|Fresh Bandage
medic-recovery-5.name|Living Memory
medic-recovery-6.name|A Name Returned
mage-hexcraft-1.name|Ash Script
mage-hexcraft-2.name|Resonant Ink
mage-hexcraft-3.name|Split Glyph
mage-hexcraft-4.name|Grave Arithmetic
mage-hexcraft-5.name|Forbidden Meter
mage-hexcraft-6.name|The Silent Chord
mage-control-1.name|Marked Ground
mage-control-2.name|Patient Circle
mage-control-3.name|Deep Binding
mage-control-4.name|Echoing Ward
mage-control-5.name|Bell Geometry
mage-control-6.name|Name the Storm
mage-warding-1.name|Paper Seal
mage-warding-2.name|Bone Charm
mage-warding-3.name|Quiet Mantle
mage-warding-4.name|Stolen Breath
mage-warding-5.name|Salted Hem
mage-warding-6.name|A Circle Remains
engineer-demolitions-1.name|Fine Teeth
engineer-demolitions-2.name|Charged Rivets
engineer-demolitions-3.name|Spare Barrel
engineer-demolitions-4.name|Impact Fuse
engineer-demolitions-5.name|Overclock
engineer-demolitions-6.name|Turn the Key
engineer-constructs-1.name|Level Footing
engineer-constructs-2.name|Fast Assembly
engineer-constructs-3.name|Spare Motor
engineer-constructs-4.name|Linked Repairs
engineer-constructs-5.name|Long Service
engineer-constructs-6.name|Two Hands More
engineer-repair-1.name|Work Gloves
engineer-repair-2.name|Reinforced Apron
engineer-repair-3.name|Patch Plate
engineer-repair-4.name|Safe Ground
engineer-repair-5.name|Measured Steps
engineer-repair-6.name|A Thing Rebuilt
assassin-precision-1.name|Fine Needle
assassin-precision-2.name|Soft Trigger
assassin-precision-3.name|True Line
assassin-precision-4.name|Through the Seam
assassin-precision-5.name|Last Aperture
assassin-precision-6.name|A Single Thread
assassin-ambush-1.name|Quiet Hem
assassin-ambush-2.name|Hidden Route
assassin-ambush-3.name|Long Veil
assassin-ambush-4.name|Borrowed Shadow
assassin-ambush-5.name|Safe Return
assassin-ambush-6.name|No Witness
assassin-evasion-1.name|Light Soles
assassin-evasion-2.name|Loose Shoulders
assassin-evasion-3.name|Narrow Escape
assassin-evasion-4.name|Steady Pulse
assassin-evasion-5.name|Afterimage
assassin-evasion-6.name|Another Way Home
`),
mutation: rows(`
glass-pact.name|Glass Pact
borrowed-day.name|Borrowed Day
rationed-mercy.name|Rationed Mercy
hot-iron.name|Hot Iron
open-veins.name|Open Veins
heavy-oath.name|Heavy Oath
dead-calm.name|Dead Calm
quick-blood.name|Quick Blood
storm-tax.name|Storm Tax
long-night.name|Long Night
lifeline.name|Lifeline
thin-walls.name|Thin Walls
steady-hands.name|Steady Hands
deep-pockets.name|Deep Pockets
panic-drill.name|Panic Drill
iron-rain.name|Iron Rain
salt-circle.name|Salt Circle
grave-interest.name|Grave Interest
bitter-medicine.name|Bitter Medicine
brass-halo.name|Brass Halo
last-rites.name|Last Rites
mercury-hour.name|Mercury Hour
spare-parts.name|Spare Parts
ash-tithe.name|Ash Tithe
`),
boss: rows(`
constable.name|Hollow Constable
constable.description|A dead watch captain fires aimed volleys and enclosing rings. Watch for marked arrest zones.
courier.name|Carrion Courier
courier.description|A tireless messenger charges along marked paths, then sends crossing trails through the arena.
pallbearer.name|Pallbearer
pallbearer.description|A coffin-bearing brute advances behind armor, then charges. Use the moving cover and strike during openings.
matron.name|Cradle Matron
matron.description|A guardian of empty cradles summons undead and nests. Clear the summons before they surround rescuers.
alchemist.name|Mold Alchemist
alchemist.description|A plague-maker contaminates the ground with lingering pools. Keep a route to safe ground.
bellringer.name|Bellringer
bellringer.description|Expanding rings follow the bell's rhythm. Read the safe gaps and avoid converging patterns.
stitchwright.name|Stitchwright
stitchwright.description|Hooks and tethers turn isolated survivors into targets. Keep a rescue route open.
choir.name|Grave Choir
choir.description|Undead singers coordinate beams and intersecting attacks. Move before the marked notes become hazards.
engine.name|Mortuary Engine
engine.description|An armored machine seals its weak points between barrages. Reserve damage for exposed phases.
regent.name|Drowned Regent
regent.description|The dead ruler shifts position and floods the arena. Read the transformation warnings before committing.
uncounted.name|The Uncounted
uncounted.description|The bells remember erased names. Survive spirals, beams, summons and warps in a secret final test.
`),
arena: rows(`
gatehouse.name|Gatehouse
gatehouse.description|Broken civic gates and an empty fountain, with broad outer-wall lanes.
triage-yard.name|Triage Yard
triage-yard.description|Abandoned hospital tents and quiet cots, with wide rescue paths.
ossuary-works.name|Ossuary Works
ossuary-works.description|Mortuary machines and bone crates divide diagonal fire corridors.
sunken-chapel.name|Sunken Chapel
sunken-chapel.description|Floodwater surrounds stone walks and a cracked altar. Water margins are clearly marked.
bell-foundry.name|Bell Foundry
bell-foundry.description|Cold brass bells and enormous molds create cover islands and four broad exits.
crown-crypt.name|Crown Crypt
crown-crypt.description|A drowned council chamber beneath hollow bells, with an open outer ring.
`),
supply: rows(`
medkit.name|Medkit
medkit.description|Restore {amount} health. Maximum carried: {maximum}.
adrenaline.name|Adrenaline
adrenaline.description|Increase movement speed by {amount} for {duration}. Maximum carried: {maximum}.
armor-plate.name|Armor Plate
armor-plate.description|Gain {amount} shield for {duration}. Maximum carried: {maximum}.
antidote.name|Antidote
antidote.description|Remove poison and slow effects, and restore {amount} health. Maximum carried: {maximum}.
revive-kit.name|Revive Kit
revive-kit.description|Revive a downed ally at {amount} health. Maximum carried: {maximum}.
barrier-charge.name|Barrier Charge
barrier-charge.description|Deploy a {amount}-health barrier for {duration}. Maximum carried: {maximum}.
ammo-pouch.name|Ammo Pouch
ammo-pouch.description|Instantly reload your weapon. Maximum carried: {maximum}.
focus-tonic.name|Focus Tonic
focus-tonic.description|Reduce remaining ability cooldowns by {amount}. Maximum carried: {maximum}.
`),
upgrade: rows(`
damage.name|Tempered Chamber
fire-rate.name|Feed Tuning
magazine.name|Reserve Clip
reload.name|Quick Hands
health.name|Lined Coat
`),
threat: rows(`
1|Normal
2|Aberrant
3|Predator
4|Brute
5|Scourge
6|Dread
7|Disaster
8|Catastrophe
9|Cataclysm
10|Calamity
11|The Uncounted
`),
attack: rows(`
fan.name|Fan volley
fan.description|A spread of aimed projectiles. Leave the marked cone before it fires.
ring.name|Expanding ring
ring.description|Projectiles expand from the boss. Use the visible gap or dodge at the right moment.
charge.name|Charge
charge.description|The boss rushes along a marked path after a warning.
cross.name|Crossing trails
cross.description|Intersecting projectile lanes sweep across the arena.
summon.name|Summon
summon.description|Additional enemies appear after a marked warning.
pool.name|Contaminated pool
pool.description|A marked patch becomes a lingering damage zone.
spiral.name|Spiral
spiral.description|Rotating projectile streams leave moving escape lanes.
beam.name|Beam
beam.description|A marked line becomes a damaging beam after the warning.
hook.name|Hook
hook.description|A targeted hook threatens isolated survivors. Avoid its marked path.
tether.name|Tether
tether.description|A binding link pressures the squad to move together and help trapped allies.
armor.name|Armored stance
armor.description|Damage resistance rises briefly. Save burst attacks for the opening afterward.
lanes.name|Barrage lanes
lanes.description|Parallel projectile lanes leave alternating safe passages.
warp.name|Warp
warp.description|The boss changes position after a warning. Watch the destination.
`)
};
