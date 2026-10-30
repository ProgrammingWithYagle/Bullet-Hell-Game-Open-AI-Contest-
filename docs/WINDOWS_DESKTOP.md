# Windows portable development app

The current source is **2026.10.30-equipment-navigation / protocol 43**, exact product source **9ae3bb92ef201dcc179379815b3bc6f650d24dc3**. Equipment and skill tabs retain keyboard focus after switching. Arrow keys, Home/End and mirrored horizontal direction select tabs. Prerequisite links focus the actual skill and preserve scrolling. Existing translated purchase errors remain visible inside the equipment panel. Controls belong to their live panel and stop when it closes. Prices, prerequisites, progression and multiplayer rules are unchanged. [Current source review](../reviews/equipment-navigation-2026-10-30/checkpoint-source-review.json) and [matching Windows review](../reviews/windows-equipment-navigation-2026-10-30/package-status.json) identify their separate evidence.

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

Source6987362f4169eefadca357841fea8a8c8809b705, build2026.10.29-arena-edge-polish/protocol43 has a separately verified local ZIP, **Grave_Accord_2026.10.29_Arena_Edge_Public_Review.zip**,842941181bytes,SHA256 **611b83af60f391b1dad8abeb2963936ec081d80e3bc850b6846bfe630c2c8cbf**. [Its package receipt](../reviews/windows-arena-edge-2026-10-29/package-status.json) covers all1899files on original, fresh deep extraction and an independent Japanese-path Windows copy, with six actual native diagnostics passing. It predates the camera/survivor/Toad/lava follow-up; human feedback did not accept it as visually final. The ZIP and sidecars remain immutable. That earlier archive stays preserved; the camera-clearance review below remains preserved.

## Preserved camera-clearance review

**Grave_Accord_2026.10.29_Camera_Clearance_Public_Review.zip**, source6f397a5173c69d1b710d7c02d8772f3a5f5e19b7,842941714bytes,SHA256 **d00c2db1ee7859aea9aa49fe362d7325f39f4692fc53864f3a76cbd5b0c23f04**. [Exact current package status](../reviews/windows-camera-clearance-2026-10-29/package-status.json) and [delivery guide](../reviews/windows-camera-clearance-2026-10-29/DELIVERY.md) verify all1899files across original, fresh ZIP extraction and an independent Japanese-path Windows copy, six actual native diagnostics and post-native rehashes. This is the matching camera/survivor/Toad/lava build. The human reported better lava appearance and no top sticking in a limited testing5244 trial. The older archives and published download remain unchanged.

## Verified home-gallery review

Source d46eb13c4c92cffa0bf4c9fcad2e3a89907c5af8, build2026.10.29-home-gallery/protocol43, has its own sealed local Windows archive: Grave_Accord_2026.10.29_Home_Gallery_Public_Review.zip,842930950bytes,SHA256 **af8e21deee9d4702dfe74310c61e72b2085b5e9779ca8554435c1ede5d0b0280**. [Exact review](../reviews/windows-home-gallery-2026-10-29/package-status.json) verifies all1899files before/after six native offline/LAN fixtures across original/extraction/independent Japanese-path Windows copy. Browser gallery feedback is accepted for now; it is not native rendered or whole-game acceptance.

## Preserved menu-reliability review

**Grave_Accord_2026.10.30_Menu_Reliability_Public_Review.zip**, source **c80974226cfc30ad466a4856ff651455eb97c02b**, 842947347bytes, SHA256 **acdb4cffa075de04acad2ba0aa40f374881c3016e20faa720f5163b8df27bd1a**. [Exact package status](../reviews/windows-menu-reliability-2026-10-30/package-status.json) and [delivery details](../reviews/windows-menu-reliability-2026-10-30/DELIVERY.md) bind all1899files on three copies, six actual native diagnostics and post-native rehashes. The six LAN-menu regressions, current gallery, camera/lava and host controls are included. Native human/rendered/device/physical-second-machine acceptance remains open.

## Verified preceding profile/navigation review

Source8368410eee06efeee698ee3c1360060b4db5bc0f/build2026.10.30-profile-navigation/protocol43 has a sealed local Windows review, **Grave_Accord_2026.10.30_Profile_Navigation_Public_Review.zip**,842973204bytes,SHA256 **3646208a9fd768209e60a274a29b516fe623b7b11227e8267bb117d85f5e63d8**. [Exact review](../reviews/windows-profile-navigation-2026-10-30-r02/package-status.json) verifies all1899files before/after6native offline/LAN diagnostics on3copies, including Japanese paths beyond280characters. It precedes the first-visit/name follow-up.

## Preserved first-language review

**Grave_Accord_2026.10.30_First_Language_Public_Review.zip**, source **402727baaf854a3dce67baadcc0d90f5e0a780e3**, **842946128bytes**, SHA256 **18c91ea04604be068c46be7efca4b1eb1ac67369bed54d26adbfe07947d48c36**. [Exact native status](../reviews/windows-first-language-2026-10-30/package-status.json) and [delivery guide](../reviews/windows-first-language-2026-10-30/DELIVERY.md) verify1899files on original, fresh verified extraction-r02 and independent Japanese-path copy, plus6native diagnostics and post-native rehashes. First-visit choice and setup-bound automatic names are included. The failed first extraction is preserved and excluded from acceptance. This remains an unsigned local review; the published download is unchanged.

## Preserved controls-settings review

The matching local Windows review verifies all **1899 files** before and after six native offline/LAN diagnostics across the original folder, fresh verified ZIP extraction and an independent Japanese-path Windows copy. Its **842956715-byte ZIP** has SHA-256 **04b7af0e994ead2ec703fe61a6a9e654e725dd158176aa985be37314e5dcd31e**. Font paths of 223, 280 and 281 characters pass. This is software portability evidence; rendered, human, listening, native-language and physical-device acceptance remain separate. Exact source **cb0ca6d3c27d32c0930381334d0dedbb14d4cc7f**. [Package status](../reviews/windows-control-settings-2026-10-30/package-status.json) and [delivery guide](../reviews/windows-control-settings-2026-10-30/DELIVERY.md) identify the local archive and sidecars. Older archives and the published download remain unchanged.

## Current welcome-finish review

The matching local Windows review passes all 1899 files on original, fresh verified extraction and independent Japanese-path Windows copy before/after six packaged offline/LAN diagnostics. Its **842949729-byte ZIP** has SHA-256 **92ae18e057860f1d90f289a3087910b9cc69a5d7e968be26cff507435138d148**. Font paths of 221, 276 and 277 characters pass. [Package status](../reviews/windows-welcome-finish-2026-10-30/package-status.json) and [delivery guide](../reviews/windows-welcome-finish-2026-10-30/DELIVERY.md) bind the local archive and sidecars. This does not establish native rendered, human, physical-device, listening or native-language acceptance. Human browser feedback confirms the strip fix only; packaged native rendered/device acceptance remains separate. The published download is unchanged.

## Verified equipment-navigation package

The matching local Windows review verifies all 1,899 files on the original, fresh complete ZIP extraction and independent Japanese-path Windows copy, before and after six packaged offline/LAN diagnostics. Its **842973815-byte ZIP** has SHA256 **412313533ae68c02ab8df986610f81cf29aa17f197be615634a99cdfe6f8ca73**. Font paths 227/288/289 characters pass. [Package status](../reviews/windows-equipment-navigation-2026-10-30/package-status.json) and [delivery guide](../reviews/windows-equipment-navigation-2026-10-30/DELIVERY.md) bind the local archive and sidecars. These software checks do not establish rendered, human, physical-device, listening or native-language acceptance.

Earlier native packages remain immutable. The public download is unchanged.
