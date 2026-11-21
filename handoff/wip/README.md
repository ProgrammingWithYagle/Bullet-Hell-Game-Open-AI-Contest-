# Unfinished Service Yard work

The user requested a new-chat handoff on 2026-11-02. Feature development stopped. The four candidate source/test files are preserved exactly in service-yard-2026-11-02.patch; they are **not active game code** and were not added to the verified 1,251-test release.

The JSON manifest binds every original file, the patch and the raw focused-test log by SHA-256. Five checks ran: four passed and one failed. The failed occupancy fixture currently supplies only 1,799 held ticks after an initial unoccupied setup tick, then expects 1,800 ticks of completion. Correct and rerun that fixture before drawing broader conclusions; this patch has no full type/build/network/Game integration verification.

Read ../../docs/SERVICE_YARD_WORKING.md and ../../docs/CLASS_SPECIALIZATION_PLAN.md before choosing the next slice. The proposed chapter remains unwritten and unregistered. Do not report Porch Watch as selectable or playable in Campaign or Free Play.

To resume, inspect Git status first and compare the manifest hashes. From the same game checkout, run:

```
git -c core.bare=false apply --check handoff/wip/service-yard-2026-11-02.patch
git -c core.bare=false apply handoff/wip/service-yard-2026-11-02.patch
```

Both reverse-check before preservation and forward-check on the restored baseline passed. Future changes can cause a legitimate conflict; never reset, force-apply or discard intervening user work. The base is 9c84f1cbf0c936074dce1516a59e7303f4f61b2e. There are no dependencies or private databases in this packet.
