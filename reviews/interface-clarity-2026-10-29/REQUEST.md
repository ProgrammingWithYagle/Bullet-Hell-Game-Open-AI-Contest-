# Player feedback from public preview 5233

The player likes the Waiting room / Prepare equipment distinction. Basic map appearance is acceptable, while layouts are not strongly endorsed and current rendered coverage remains limited. Requested work:

1. Increase contrast for setup step labels and headings for mode, map and difficulty.
2. Keep room-code controls clear of Time left during mutation/threat votes and the shop; place them sensibly in Settings. Expanded code controls must participate in menu layout rather than cover it.
3. Investigate Cobble Crab leaving the second map (Triage Yard). Test authority positions and the complete rendered sprite footprint, not only its anchor/collision circle.
4. Replace or enlarge the undersized random-map option icon with substantial actual map imagery.
5. Redesign the lower-left status card with separate health and shield bars, clear coins/SP/ammo, actual character headshots and no overflowing text.
6. Give the waiting room a coherent visual pass without losing the accepted equipment distinction or host-only manual Start.
7. Implement optional host passwords. Public rooms requiring one show a lock; joining prompts for the password. Keep secrets out of room listings, state, logs, checkpoints and browser storage.
8. During the five-second Boss defeated beat, show a preparation message and countdown so it does not look frozen. Use a results message after the last fight rather than promising another encounter.

Current verified source is fe13d84c570f0eb91f67c5af07e4034943af2142 (808 tests and both source CI jobs passed), with metadata HEAD 851dfd5. Fresh work uses this same checkout and branch. Preserve public5233/backend2607/session44033 and testing5232/backend2606/session21157, their frozen roots, all older services, raw receipts and packages. Browser automation remains disabled; static source-asset compositions and native software checks are distinct from browser/human acceptance.

The prior goal turn was progress: Medic/shield/map/lobby source, verified frozen previews, Wiki4919fc4 and CI were saved and pushed. The broad polish goal remains active. Future maximum-shield branches and selective attack blocking remain notes only. No delegation, new checkout, merge, hosted game deployment, paid provisioning or contest submission.

Chat reliability was inspected before this feedback, with no chat code changes. Existing send clears the draft after a socket write, while the server can silently reject on its1.5second limit. A later pass should preserve drafts until confirmation, report failed/uncertain delivery and handle reconnect without duplicate messages. This follow-up is deferred behind the player’s current feedback, not claimed implemented.

Planned new review ports: testing5234/backend2608, public5235/backend2609. Do not reuse or replace any issued root or listener. Wiki synchronization remains authorized; publish only exact committed pages and verify public bytes.
