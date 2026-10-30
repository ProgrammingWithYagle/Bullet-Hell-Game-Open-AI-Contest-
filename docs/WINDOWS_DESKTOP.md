# Windows portable development app

The current source build is **2026.10.29-camera-clearance / protocol43**. It includes connection cleanup, host password visibility and explicit Pause/Continue, plus complete boss floor bounds and stable corner controls. [The current source review](../reviews/arena-edge-2026-10-29) records its exact verification. The matching local Windows ZIP now passes its original/extraction/copy byte checks and six native diagnostics; see the exact current review below.

The [published Windows download](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1) remains the immutable October24 protocol13 build. Source, Wiki and local package work do not replace it. Its741136155-byte archive has SHA256 **b2a87f08f002e35a23558ab9b4bcca3e997309fd5a567c7e014498a54fe7ae3c**, source52552c0d4465b918d7cde2ab3c2aa7f1d7eb045e. [Exact public-byte evidence](../reviews/windows-prerelease-public-download.json) remains separate.

## Run and host

Extract the entire portable folder and open **Grave Accord.exe**. For an easy first run choose **New here? → Start gently → Play**. Offline Solo needs no Node installation, internet or multiplayer server. Profile/settings use GraveAccordData beside the executable when writable, with a per-user fallback and JSON import/export in Profile.

For friends on the same network, choose **Local network → Host**, then **New run** inside that same page. Guests enter the host's private IPv4 address and port, then browse or join by code/password. Keep the hosting application open. Internet rooms require a matching deployed server. The app does not change firewall rules or install a service/updater. An occupied port leaves its existing owner alone. LAN team records belong to that host and remain separate from device Practice records and shared hosted global rankings.

## Build and verify

The desktop builder requires a clean committed checkout, pinned dependencies and a passing report whose runtime/test fingerprints match the current files. It compiles a fresh client, binds its audience and bundles Electron, the offline worker, LAN authority, art/fonts/music and verbatim dependency notices. Choose a new output path; existing packages are never replaced.

Use the current scoped gate report shown in [the source checkpoint](CHECKPOINT_2026_10_25.md), rather than overwriting an older issued generic report. SOURCE-VERIFICATION.json, CLIENT-VERIFICATION.json and BUILD-MANIFEST.json bind exact source, tools, client members and package hashes. The executable is an unsigned development build. A manifest alone is not successful runtime verification.

The renderer uses context isolation, sandboxing and no Node integration. Preload exposes only checked LAN controls. A secure custom protocol serves contained local files through filesystem streams, with MIME/CSP/nosniff/method/path checks and long-path support. LAN utility processes receive a minimal environment without repository credentials or cloud signing keys. No updater or cloud service is installed.

## Native software diagnostics

The explicit **--smoke-report** and **--profile-dir** flags run an isolated packaged fixture using the real worker. It checks210class/mode/difficulty starts and starting shields, boundary restore, movement/shots, profile round trip, a bundled font and all67compressed music decodes at the device sample rate. It verifies that renderer Node APIs, outside network attempts and the LAN authority are absent. This is separate from human gameplay, listening or rendered review.

The explicit **--lan-report** flag runs the actual bundled utility authority. It checks occupied-port ownership, host startup, wrong-password rejection, code joining, two actual SDK clients, host-only Start, confirmed/deduplicated chat, combat replication and shutdown. This is a localhost software fixture, not a physical second-computer LAN test. Native multi-peer source/frozen-preview host-control checks are recorded separately.

A completed review compares every file, byte size and SHA256 on the original package, fresh ZIP extraction and an independent ordinary PowerShell Copy-Item copy, including deep/Japanese paths. Both native fixtures must pass on all three copies. Rehash each package after diagnostics. Keep reports and profiles outside sealed package roots.

## Preserved local reviews

The separately verified **Grave_Accord_2026.10.29_Chat_Confirmation_Public_Review.zip** is source **fe82c7e38c8fa73804678b6637815b23aceb0ce5**, protocol42. It has842864638bytes and SHA256 **f58cc4acb3c7b60c4c3606987cd88b169b67c5c7c9bbc415a8529eb8ae9cc30e**. [Its exact package evidence](../reviews/windows-current-2026-10-29/package-status.json) verifies1899files,1697client members,80license packages and six native offline/LAN fixtures on three copies, with210starting-shield cases and67music decodes on each. Font paths233/281/282characters pass. That source is published with both827-test CI jobs; its sealing-time pending-publication notes are historical. Later connection, host-control and arena-edge changes make it an earlier review.

The **b108b5f host-controls folder** is an unsealed intermediate: its original offline fixture passes, then human5241feedback prompted the arena-edge/control fixes before ZIP/copy verification. [Intermediate status](../reviews/windows-host-controls-2026-10-29/STATUS.md) preserves the folder, log and result without claiming a complete portable review.

Earlier portable-review, portable-paths and smooth-rooms packages and their exact accepted/unaccepted states remain preserved. The initial protocol38 deep-font failures and their corrected long-path follow-up remain in their own scopes. No prior ZIP, sidecar or raw report is altered.

## Remaining acceptance

The human authorized ongoing verified source, draft PR, Wiki and local-file updates. Packaging does not merge main, deploy the game, replace the hosted release or submit the contest. Browser automation remains disabled. Human/rendered gameplay, final balance/action art, listening, native-language, physical-device/second-machine LAN, WAN/endurance/capacity and shared hosted rankings/recovery remain separate acceptance work.

## Verified earlier arena-edge package

Source6987362f4169eefadca357841fea8a8c8809b705, build2026.10.29-arena-edge-polish/protocol43 has a separately verified local ZIP, **Grave_Accord_2026.10.29_Arena_Edge_Public_Review.zip**,842941181bytes,SHA256 **611b83af60f391b1dad8abeb2963936ec081d80e3bc850b6846bfe630c2c8cbf**. [Its package receipt](../reviews/windows-arena-edge-2026-10-29/package-status.json) covers all1899files on original, fresh deep extraction and an independent Japanese-path Windows copy, with six actual native diagnostics passing. It predates the camera/survivor/Toad/lava follow-up; human feedback did not accept it as visually final. The ZIP and sidecars remain immutable. Prepare a fresh matching camera package after current source closure.

## Matching camera-clearance review

**Grave_Accord_2026.10.29_Camera_Clearance_Public_Review.zip**, source6f397a5173c69d1b710d7c02d8772f3a5f5e19b7,842941714bytes,SHA256 **d00c2db1ee7859aea9aa49fe362d7325f39f4692fc53864f3a76cbd5b0c23f04**. [Exact current package status](../reviews/windows-camera-clearance-2026-10-29/package-status.json) and [delivery guide](../reviews/windows-camera-clearance-2026-10-29/DELIVERY.md) verify all1899files across original, fresh ZIP extraction and an independent Japanese-path Windows copy, six actual native diagnostics and post-native rehashes. This is the matching camera/survivor/Toad/lava build. Human comparison is pending in testing5244; current public5245has the same fixes. The older archives and published download remain unchanged.
