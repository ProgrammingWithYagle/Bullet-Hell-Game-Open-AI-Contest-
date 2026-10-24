# Economy, shops and mutations

Completion rewards are personal and authoritative; last hits do not steal a teammate's completion income. Weapons must match the current class. Skill purchases require their prerequisites, available SP and the single-capstone rule. Invalid or duplicate purchase commands cannot create free power.

Campaigns start with 3 SP and 120 coins. Before encounter index `j` (zero-based) in an `N`-fight campaign, the total SP allowance is `3 + floor(24*j/(N-1))`; nominal cumulative base income is `120 + floor(2280*j/(N-1))`. Quarantine, Midnight and Pilgrimage therefore reach **27 SP and 2,400 base coins before the finale**. Bounties, mutations and spending affect the actual purse.

## Supplies

There are three carried slots, at most two charges per slot, and a shared supply cooldown in addition to item timing. Supplies are purchased during the shop and used with 1/2/3, gamepad D-pad or touch. All eight supplies and all 28 class weapons have their own item illustrations.

| Supply | Price |
| --- | --- |
| Medkit | 90 |
| Adrenaline | 100 |
| Armor Plate | 110 |
| Antidote | 65 |
| Revive Kit | 140 |
| Barrier Charge | 120 |
| Ammo Pouch | 70 |
| Focus Tonic | 110 |

## Voting and mutation lifetime

An encounter win leads to mutation voting (15 seconds), concealed boss voting (15), shopping (25) and deployment (5). Mutations last three upcoming encounters, with at most three active at once. Exclusions and combined modifier bounds are validated by the authority. The 24 mutation options have distinct artwork, as do all 63 specialization paths.

| Mutation | Tradeoff |
| --- | --- |
| Glass Pact | Half maximum health; triple weapon damage. |
| Borrowed Day | Boss health +30%; bounty doubled. |
| Rationed Mercy | Healing -40%; bounty +40%. |
| Hot Iron | Weapon damage +35%; reloads take 30% longer. |
| Open Veins | Maximum health -25%; fire rate +25%. |
| Heavy Oath | Move speed -18%; gain 22 percentage points of armor. |
| Dead Calm | Hostile projectiles are 20% slower; weapon fire rate -15%. |
| Quick Blood | Move speed +20%; maximum health -20%. |
| Storm Tax | Boss bullet counts +30%; bounty +60%. |
| Long Night | Boss deadlines 10% shorter; bounty +40%. |
| Lifeline | Healing +50%; weapon damage -20%. |
| Thin Walls | Barrier health -40%; weapon fire rate +20%. |
| Steady Hands | Weapon spread -35%; move speed -10%. |
| Deep Pockets | Magazine capacity +40%; reloads take 25% longer. |
| Panic Drill | Dodge cooldown -35%; hostile projectiles 10% faster. |
| Iron Rain | One additional weapon projectile; weapon damage -30%. |
| Salt Circle | Gain 15 percentage points of armor; maximum health -20%. |
| Grave Interest | Bounty +75%; boss damage +20%. |
| Bitter Medicine | Healing -25%; weapon damage +25%. |
| Brass Halo | Start each boss with 30 shield; hostile projectiles 10% faster. |
| Last Rites | Revive channel time -30%; boss health +15%. |
| Mercury Hour | Fire rate +25%; reloads take 15% longer. |
| Spare Parts | Ability potency +25%; weapon fire rate -10%. |
| Ash Tithe | Bounty +30% and weapon damage +10%; maximum health -20%. |

Purchased power resets each run. Persistent mastery, cosmetics and cross-device profiles remain unfinished. [Classes and Skills](Classes-and-Skills) · [Numerical supply rules](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/supplies.json) · [Numerical mutation rules](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/mutations.json)
