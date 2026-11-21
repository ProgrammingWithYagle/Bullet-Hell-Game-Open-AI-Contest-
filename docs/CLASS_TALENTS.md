# Class ability transformations

Build **2026.10.25-class-talents**, protocol **18**, adds **21 actual ability transformations: three per class**. These retrofit existing skill nodes; the roster stays at 378 skills / 63 paths. All previous numerical bonuses, node IDs, prerequisites and the single-capstone rule remain. The seven requested class-upgrade implementation passes are complete. Rendered, human balance, physical-device and native-language acceptance remain open.

Open the class's middle utility branch (Command, Suppression, Protection, Triage, Control, Constructs or Ambush). Each of its three paths gains a transformation at **depth three**, after the normal **1 + 2 + 3 = 6 SP** purchases. Foundation changes E; the middle specialization changes the ultimate; the third changes Q. The transformation is active once purchased and lasts for the run. Both classic and optional expanded shops show its localized name and behavior beside the existing numeric effects.

Quarantine/Midnight/Pilgrimage start with three SP, so a transformation becomes affordable as the run progresses. Grand Raid starts with twelve SP, allowing two six-SP transformation paths immediately. Its later budget supports all three. Buying a transformation is optional; the unpurchased base ability retains its earlier behavior.

| Class | Ability | Purchased transformation | Behavior and tradeoff |
| --- | --- | --- | --- |
| Soldier | Q | Marching Colors | Q follows you, with 25% less radius. |
| Soldier | E | Breach Cadence | E fires three locked-aim shots 0.12 s apart; total damage stays the same. |
| Soldier | Ultimate | Supply Line | Ultimate refills ammo again halfway through its field; its base damage bonus falls from 35% to 25%. |
| Heavy | Q | Split Suppression | Q divides the same fourteen pellets into two narrow cones with a gap in front. |
| Heavy | E | Shoulder Mantlet | E adds a moving 80-base-health front wall; base brace reduction falls from 45% to 25%. |
| Heavy | Ultimate | Furnace Vents | Ultimate vents eight short-range shots every two seconds after the first second; base fire-rate bonus falls from 70% to 40%. |
| Tank | Q | Cornerstone | Q splits its wall into two angled panels, each with half the original health and length. |
| Tank | E | Wake Guard | Charge leaves an 80-base-health wall for two seconds at departure. |
| Tank | Ultimate | Procession | Ultimate follows you and shields each entrant once for 90 base health instead of 120. |
| Medic | Q | Field Triage | Q follows the most injured nearby ally, with 25% less radius. |
| Medic | E | Serum Relay | E chains heals and cleansing to three distinct allies, within 140 per hop, instead of every nearby ally. |
| Medic | Ultimate | Second Breath | Ultimate trades 40 instant base healing for 24 plus three healing pulses of 6. Difficulty revival rules still apply. |
| Mage | Q | Twin Sigils | Q makes two separated smaller sigils, each dealing half damage. |
| Mage | E | Ward Echo | E splits its 65 base damage into 40 now and 25 at the same ground point after 0.75 s. |
| Mage | Ultimate | Orbit Requiem | Ultimate replaces its large fixed pulse with three smaller orbiting centers, each dealing one third of the pulse damage. |
| Engineer | Q | Crossfire Pair | Q makes two turrets with half health and damage each; the second prefers a farther target. |
| Engineer | E | Return Current | Barricade stores up to 120 absorbed damage; destruction or expiry releases 60% of it nearby. |
| Engineer | Ultimate | Foundry Relay | Siege follows at 160 pixels per second; base health falls from 200 to 160. |
| Assassin | Q | Decoy Veil | Q leaves a 60-health projectile-damageable decoy that attracts aim; base veil duration falls from 6 s to 4 s. |
| Assassin | E | Aftercut | Step deals 60% damage now and 40% along its locked path after 0.45 s. |
| Assassin | Ultimate | Unwritten Traps | Ultimate lasts 3.5 s with one fewer free step; empowered departures leave three damaging pulses. |

## Shared simulation and presentation

`AbilityTransforms` owns delayed effects, moving protection and their cues; `ClassKits` owns finite constructs, shields, walls and turrets. The server and offline worker execute the same fixed-step logic. Phaser displays the replicated state using restrained circles/links, actual wall lengths, existing construct sprites and a tinted copy of the owner's pose for the decoy. No new raster ability-art acceptance is claimed.

Anchored rally/heal fields share one position resolver with client prediction. Delayed strikes keep their original aim or ground path; moving abilities explicitly follow their owner or selected injured ally. Ordinary minions receive the authored slows; bosses retain their existing slow immunity. Real hits and healing use existing ownership credit.

Procession grants a finite shield once per entrant for that cast. Leaving and reentering cannot refill it; armor leaves shortly after the ally leaves the moving aura. Cornerstone preserves total wall health/length across two angled panels. Return Current stores only actual HP absorbed, caps storage at 120, releases at most 72 within radius 160, and cancels on replacement. The mobile siege moves at up to 160 pixels/s through shared collision, retains its existing DPS and has lower base health. A purchased extra-turret capstone supports two Crossfire pairs.

The decoy has 60 real construct HP, attracts eligible new aim locks and takes hostile projectiles/contact. It is a virtual aim target, never a player, extra squad member, profile entry or progression participant. Veiling still does not erase existing hostile projectiles or environmental damage. Delayed jobs are bounded to 64 per owner, cancel when the owner is inactive/disconnected, and all temporary state clears at encounter boundaries. Walls remain permeable to friendly survivor movement.

## Difficulty and local continuity

All latest user rules remain: Baby revival 100%, Easy 50%, Normal **25%**, Hard/Insane/Hellish disabled; Baby/Easy Standard phase shields only, six/three circles and two/three-second channels. All Brutal forms disable that event. Baby has two extra cover props per map; Hard half cover, Insane/Hellish none; Hellish adds warned lava and forces every encounter Brutal. Medic's healing pulses can heal living allies but cannot bypass the difficulty revival rule.

Known issued protocol-17 local Practice saves and profiles migrate while retaining node ownership, money, run identity and progress. Existing bounded migrations remain. Online/signed state requires the current protocol and content revision. Historical frozen previews and the public protocol-4 Site / immutable protocol-13 Windows development archive remain separate.

## Verification and limits

Dedicated authority fixtures legally purchase every transformation and exercise actual emission timing, fixed aim, split damage, healing/cleanse chains, shield entry limits, wall/projectile collision, moving fields and prediction, capstone compatibility, finite decoy targeting/contact, bounded jobs and cleanup. Actual owner/observer clients purchase the upgrades and receive their fields/constructs/cues for every class. Both real shop adapters show the behavioral descriptions and retain guarded purchasing. Fifteen locale contracts verify all names/help; their native review remains pending.

The current full-suite source, output hashes and failed attempts are recorded in `reviews/class-talents-2026-10-25/`. These are software checks. Browser control is disabled; no rendered, physical-device, native-language, listening or final balance acceptance is claimed. The game remains unfinished, including 88 new ordinary identities and 59 original-boss quality passes.
