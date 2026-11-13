# Original Corner Guide verification attempt

Source `a9a2a0394aae0c3141ae16cfa30e385996cae0f5` passed all 2,330 local tests and seven checks. Its push workflow recorded 2,329 passes and one failed route-walk check. Its draft pull-request workflow recorded 2,330 passes. The testing audience passed seven native cases. The public audience passed six cases and failed its motor-arrival check. [Original CI report](ci-source-failed-1794521393446.json), [failed job artifact](ci-source-push-failed-artifact.json), [exact raw evidence](raw-evidence-binding.json).

The motor-arrival failure reproduced a body 4.99 px from the guide being replicated at 5.10 px. The server enabled redirect while the original helper waited on rounded distance. The original B label also displayed Engage haul at that boundary. The correction uses the authoritative readiness flag. The later route-walk correction bounds movement messages to one per observed combat tick and records each walk's timing.

Source `21f490af74c2a05c59fa94e1bf3ce6f8614c9279` passed all 2,331 local tests, both exact-source workflows and seven fresh native cases per audience. The original attempt's logs, own failed artifact and execution receipts retain their original source and outcomes. [Corrected frozen verification](../heavy-corner-guide-r2-2026-11-12/frozen-verification.json).
