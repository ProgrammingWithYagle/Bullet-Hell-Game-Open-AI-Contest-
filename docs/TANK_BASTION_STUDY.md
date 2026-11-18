# Tank Bastion study

Gate Signal is a proposed remappable Action 2 for Tank. It pays The City Holds recovery to leave guard at a retreat point. An ally claims it by walking across the marked face from the exposed side. Split Watch divides the guard between two independent halves. Corner Post offers two perpendicular ways to reach one reserve. Every claim expires at the original cast deadline. The ordinary Ultimate keeps priority on simultaneous input.

The study used a copied Game built from Interceptor source `911966ddefe65a2ff757b580c47197fa0518fd7e`. Interceptor, protocol 78, is the playable checkpoint. The [Bastion controller candidate](../handoff/wip/tank-bastion-gate-signal.ts) stays in the handoff.

## Simultaneous crossings

The previous controller resolved stations in planting order. An actual walking input moved a runner west from x 805 to x 797.5 in one combat tick. The runner crossed the station at x 802 before the station at x 800. The previous controller granted guard from x 800 when that station was planted first.

The candidate orders eligible crossings by when the runner intersects the face during that tick. Equal crossing times use player ID, then station owner ID, then the face index. A runner receives at most one reserve in the tick. A second runner can still take another station's reserve in the same tick, and a runner with a stronger existing guard leaves the reserve available.

The previous controller passed 9 of 12 synchronized cases. The candidate passed all 12 with actual acknowledged walks, including both station orders, exact ties, independent Split Watch halves and perpendicular Corner Post crossings. The fitting cases bought their cards after the first actual Short clear. The crossing encounters used a controlled boss stagger. All 11 earlier ownership cases also reproduced their archived outcomes with the candidate, including Action 2 at 3 SP, fitting purchases at 9 SP and ordinary Ultimate priority.

## Triage Yard timing

The historical plain, split and corner pilot rows reproduced exactly. The second cast occurred at tick 2968 for plain and split and at 3957 for corner. In the 989 ticks from 2968 through 3956, the Corner Post policy had 97 ticks with recovery or motion blocking an attempt, 885 without a cast request, two blocked retreat paths and five rejected placement footprints.

At tick 2968, two sweeps for Corner Post's extra face intersected the nearby crate screen. The face the Tank planned to walk through still had room. Both faces were blocked at the other four footprint rejections. Rotating tested bearings in 15 degree increments through 45 degrees in either direction recovered zero earlier casts in this replay.

The follow-up kept the clearance rules and bought the actual study cards through Short. Four matched groups covered Gatehouse and Triage Yard on Normal with seeds 41 and 73. Each group reserved its ultimate through the same opener and compared the three fittings under reactive and projectile forecast policies, with an ordinary Ultimate control. The forecast estimated whether an observed projectile would reach the Tank after there was time to walk to the marked retreat.

| Policy | Wins | Defeats | Bastion claims |
| --- | ---: | ---: | ---: |
| Ordinary Ultimate | 3 | 1 | 0 |
| Reactive | 10 | 2 | 20 |
| Projectile forecast | 12 | 0 | 16 |

Triage Yard seed 73 gave Corner Post a distinct use. The forecast policy placed at tick 2793, claimed the perpendicular face at 2803 and cleared five encounters. The reactive policy placed at 2807, claimed the forward face and cleared four. All 36 Bastion placements yielded a claim. These are scripted local outcomes from two arenas and two seeds. Presentation, peer transport and broader balance still need verification.

## Before admission

Use the owned action and the final terrain check to drive the available placement and show each exposed face and unclaimed reserve. Keep the carried-wall Action 2, shared Ultimate recovery, one-capstone rule, 27 SP, General roster, saved HUD layouts and remaps. Verify the shared physical signal and private action state over authoritative Solo and non-host room transports. The next content edition must admit exact protocol 78, content `6472614e137114fdb043bdbdff2952997932aba352e449a70508adfe3f5b4647`, catalog 75 and four General techniques before 77 for ownership and all twelve profile and history rosters. The issued 78 capture and its 20 actual budget denials remain in the original Bastion stage.

The study archive contains the candidate, replay and test drivers, the original failed and corrected crossing results, and the results of all 28 Short runs.
