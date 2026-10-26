# Direct solo boss-form practice

Current continuation: [difficulty rules and phase pacing](DIFFICULTY_AND_PHASES.md), protocol 16. Historical build descriptions and frozen previews below retain their own issue state. Hellish now forces Brutal, including a selected Standard opener.

Build `2026.10.25-boss-practice`, protocol 14. The final solo review screen provides **Boss form → Standard form / Brutal**. Standard form is the normal boss version. The earlier frozen `2026.10.25-constable-patrol` build on port 5176 has no direct form selector.

For a clear Hollow Constable comparison:

1. Choose **New Run**, then **Soldier**.
2. Choose **Quarantine Run**, **Gatehouse** and **Normal** difficulty.
3. On the final review screen, choose **Hollow Constable** and **Solo**.
4. Set **Boss form** to **Standard form** or **Brutal**, then choose **Play**.

Any implemented class or map is valid. Keeping the class, map and global difficulty consistent makes the two boss forms easier to compare. The normal Constable displays **1+**; Brutal displays **1+ B**. Brutal's health, damage, deadline, bounty and extra phase use the actual shared authority rules. Global difficulty and intrinsic classification remain separate.

The choice applies only to the opening encounter. Later contracts retain normal campaign/Endless progression. The local setting is excluded from online creation options. Solo startup uses a validated boundary for Brutal, preserving class, map, name and run identity; resume uses the saved boundary's form.

Five new automated regressions pass within the full 372-test pipeline. Eighty-four actual starts cover two variants, seven classes and six maps. The real offline-worker module executes with Web Worker-style messaging in isolated Node threads, including invalid initialization. A real Session/server fixture confirms local Practice form does not override online authority. Fifteen localized accessible controls have explicit labels and scope hints.

These are source, shared-authority and worker/real-network checks. Browser rendering, human balance, native-language and physical-device acceptance remain separate.
