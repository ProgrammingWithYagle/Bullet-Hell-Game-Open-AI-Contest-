# Mage Binding

Buy Marked Ground for 1 SP and Pivot Sigil for 2 SP. Stop, aim at clear ground and press Action 1. The floor mark sits about 102 pixels away and lasts 2.2 seconds. Stand within 158 pixels and in clear reach, then press Action 1 again to spend Binding Sigil recovery. An ordinary Q can still take priority while the mark is unpaid.

Aim to steer a narrow line for 0.7 seconds. Its reach is 148 pixels and masonry clips it. The line can contact each eligible target once. It gives 32 base ability damage and briefly slows ordinary minions to 53% of normal movement. Boss movement and casts follow their authored scripts. Walk while steering and keep a clear connection to the pivot. A primary attack, dodge or other active commitment breaks the guided line. Press the action once more after an actual turn to use an equipped fitting.

- **Fixed Angle.** Turn by roughly 23 degrees, stop and press Action 1. The line stays where it is for the remainder of its original time. You can move or fire while it remains active.
- **Reverse Face.** Turn by roughly 36 degrees, stop and aim the opposite way before pressing Action 1. The line moves to the other face once, retaining its original time, remaining turn allowance and prior contacts.

The fittings cost 2 SP at five earned points and exclude each other. Standard first offers that budget after one clear. Short supplies an earned 9-SP first shop. Together and Separate HUD layouts keep the existing remaps. The owner gets private readiness, follow-up prompts and five operation cues. Teammates share the floor mark and physical stroke. [Emblems](../assets/production/ui/mage-binding-2026-11-20/provenance.json) · [Audio checks](../reviews/mage-binding-2026-11-20/audio-checks.json).

## Run study

The staged Game ran four seeded openings per mode and cohort with ordinary purchases and visible-world inputs. Below are cleared routes. The banked and purchased-but-unused control trajectories matched in all 16 pairs. The three active policies registered 182 positive-contact intervals. Twelve selected runs exactly replayed their complete trajectories and purchases. [Study details](../reviews/mage-binding-2026-11-20/study-summary.json) · [Replays](../reviews/mage-binding-2026-11-20/practice-replays.json).

| Mode | Cohort | Banked | Bought and unused | Pivot | Fixed Angle | Reverse Face |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Short | Solo | 2 / 4 | 2 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Short | Two players | 3 / 4 | 3 / 4 | 3 / 4 | 4 / 4 | 3 / 4 |
| Standard | Solo | 2 / 4 | 2 / 4 | 3 / 4 | 3 / 4 | 3 / 4 |
| Standard | Two players | 3 / 4 | 3 / 4 | 3 / 4 | 1 / 4 | 3 / 4 |

The first Standard co-op Fixed Angle policy cleared 1 of 4 runs. Gatehouse ended at Bridge Ferryman, Sunken Chapel at City-Eater, and Ossuary Works at Wire Seamstress. The selective follow-up required two reachable foes before setting a fitted mark. It cleared 4 of 4 runs and locked the line once. The follow-up mainly measures when the policy continues with the regular kit. [Selective runs](../reviews/mage-binding-2026-11-20/standard-party-selective.json).

## Verification

Protocol 87 contains 98 specialization cards. The build census purchased 249 legal Binding configurations at 27 SP. 213 include an issued Mage transformation. It also rechecked all 9,277 previously enumerated configurations. The 540 issued protocol 86 ownership fixtures, both HUD layouts, all three remaps and the 15 issued dictionaries have deterministic preservation tests. [Census](../reviews/mage-binding-2026-11-20/build-census.json) · [Save bindings](../tests/fixtures/mage-issued86-bindings.json).

All six installed-source operations passed through the optimized Solo worker and an actual joined Mage. The first staging pass caught the missing owner-view registration on the room join path. The corrected join and rejoin registration passed with the stroke shared and the command state and sounds kept private. A room regression test now covers that registration. The exact local verification passed 2,748 tests and seven checks. Human play, rendered and physical-device checks, listening, native-language review and final balance remain open. [Runtime proof](../reviews/mage-binding-2026-11-20/source-verification.json) · [Transport proof](../reviews/mage-binding-2026-11-20/staged-transport-bindings.json).
