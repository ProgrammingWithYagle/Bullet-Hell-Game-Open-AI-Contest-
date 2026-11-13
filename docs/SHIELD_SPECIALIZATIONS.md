# Shield-cap specializations

Build **2026.10.31-shield-specializations** adds two defensive build choices without adding nodes or changing the seven-class / 378-skill / 63-path totals. The wire protocol remains44; the content revision changes, so online clients and servers must match both values.

Heavy’s **Reserve Plating** is the third Endurance path. Tank’s **Citadel Lining** is the third Bastion path. The existing node IDs, prices, prerequisites, six-node depth and previous health/regeneration/revive bonuses remain. These paths compete with weapon, ability and mobility investments for the existing27-point run budget.

| Total path investment | Heavy capacity bonus | Tank capacity bonus |
| --- | --- | --- |
| 0–3 SP, depths1–2 | None | None |
| 6 SP, depth3 | +15% | +25% |
| 15 SP, depth5 | +30% | +50% |
| 21 SP, depth6 | +50% | +75% |

The final personal capacity is `floor(maximum health × difficulty fraction × (1 + bounded class bonus))`. The difficulty fractions remain Baby/Easy/Normal1, Hard0.75, Insane0.5 and Hellish0. Other classes ignore capacity-bonus effects. Heavy’s maximum bonus is0.5 and Tank’s0.75; negative, non-finite or excessive values do not produce unbounded capacity. Health-changing mutations are applied before capacity is calculated.

Buying a capacity node raises the limit without adding shield. Existing sources must fill it. Starting shields are still Heavy50%, Tank100%, Soldier15% and other classes0% of their own current capacity at each encounter. All permanent, ability and temporary personal shield pools share that one capacity. Excess shield is removed before damage and cannot absorb a hit. Ability shields and armor plates can use the larger reserve; deployed physical cover remains separate.

Hellish remains at zero for every class and build. It rejects shield-item purchases and consumption, allows no personal shielding from abilities, and retains the original revive/regeneration restrictions. This change adds no selective attack-blocking ability.

Both skill views expose localized path names, numerical capacity effects and an explanation of limits/refill behavior in all fifteen catalogs. The HUD and multiplayer roster receive the authority’s actual cap. Existing profiles and local Practice boundaries from the prior protocol44 content revision migrate with the same identities, economy, skills and settings. Online restoration rejects old content revisions before constructing per-player local boundaries; it cannot use local migration to accept an old server checkpoint.

Canonical content lives in `content/source/shield-specializations.mjs`; labels live in `locales/source/shield-specializations.mjs`. `tools/update-shield-specializations.mjs` applies the content; rebuild catalogs with `locales/build-catalogs.mjs` and the analytical model with `tools/balance-stage1.mjs`. The analytical DPS/deadline model does not prove final survivability balance.

Software checks cover every difficulty and investment stage, earned costs/prerequisites, unchanged other-class caps, no free refill, combined pools, excess damage, Hellish denial, migration and actual Heavy/Tank peer replication. Rendered/human class-balance, device and native-language acceptance remain open. Current reviews are in `reviews/shield-specializations-2026-10-31/`. Public Site version4 and its older backend remain separate.
