# Windows portable development app

The issued download remains `2026.10.24-windows-lan`, protocol 13. Current source is preparing `2026.10.28-portable-review`, protocol 38. These are separate development artifacts; no replacement release is published by packaging work.

## Issued development download

[Windows portable playtest, 2026-10-24](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/releases/tag/dev-windows-20261024-1). The ZIP is 741,136,155 bytes; SHA-256 `b2a87f08f002e35a23558ab9b4bcca3e997309fd5a567c7e014498a54fe7ae3c`. Its exact source is `52552c0d4465b918d7cde2ab3c2aa7f1d7eb045e`, with 276 passing source tests. All 1,633 package members match after fresh ZIP extraction and an independent ordinary Windows copy. All three copies passed the offline renderer/worker/codec fixture and separate bundled-authority LAN fixture. Companion manifest, checksums and verification JSON are attached to the release.

The source package remains bound to that commit even as documentation and subsequent development advance. Public download-byte verification is recorded in `reviews/windows-prerelease-public-download.json`; native/copy evidence is in `reviews/windows-desktop-2026-10-24.json`.

## Run and host

Extract the entire issued portable folder and run **Grave Accord.exe**. Electron, the shared offline worker, art, fonts and all music are bundled. Offline solo uses no multiplayer process or network. `GraveAccordData` beside the executable stores the local profile/settings when that location is writable; otherwise Electron uses its normal per-user location. Profile JSON export/import remains available.

The desktop **Local network** menu starts an authority only after the user selects Host. It binds the requested port on the local interfaces, then provides loopback and private IPv4 addresses. Create a game through the normal setup and share the private address with the other players. Guests enter a canonical private IPv4 address/port, browse rooms or join by code. The app does not change firewall rules, register a service or install an updater. Keep the host open; Stop hosting and app exit shut down its child authority.

An occupied port produces the existing localized error. It never terminates or replaces the listener that owns the port. All LAN sessions are unverified Practice. The seven classes, five modes, server-owned inventory/economy/difficulty, process-live reconnect and personal progress use the same simulation as online/offline source.

## Build

Use the pinned Node/package-manager versions. The desktop builder requires a clean committed checkout and a passing verification report whose runtime and source/test fingerprints match the actual files. It compiles a fresh client instead of trusting an existing dist folder. The default audience is public; the optional fourth argument chooses testing.

For an ordinary local workflow, run `pnpm verify`, commit the verified changes, then `pnpm desktop:build`. If the generic receipt was preserved as an older issued record, pass the current scoped report explicitly:

```powershell
node tools/build-desktop.mjs release/Grave-Accord-current-public-win32-x64 reviews/portable-review-2026-10-28/gate-01/runtime-verification.json public
```

Choose a new output directory; the builder refuses to replace an existing one. It produces separate embedded `SOURCE-VERIFICATION.json` and `CLIENT-VERIFICATION.json` receipts. The manifest records source commit, source/runtime fingerprints, audience, build tools and every package member's size/hash. The package verifier checks all client members against the embedded client report, while retaining compatibility with earlier manifests. The bundled LAN authority and diagnostic code receive the same audience definition as the client.

The source contains the pinned Electron distribution, main/preload/LAN bundles, all art/fonts/music and verbatim dependency/Chromium/game notices. The native executable keeps the existing bell emblem and product metadata. Customizing the binary produces an unsigned development executable; no signing approval is claimed. Source/client identity is checked again after compilation and packaging. Native fixture, fresh ZIP extraction and independent ordinary Windows copy verification remain required before describing a new package as verified. The current preparation has focused source/audience checks; a new package has not yet been issued.

The desktop renderer has Node integration disabled, context isolation and Chromium sandbox enabled. Its small preload exposes only LAN status/start/stop. Main-frame identity and origin are validated for IPC. A standard secure custom protocol serves only the bundled client root; decoded traversal and symlinks outside the root are rejected. CSP, navigation and permission handling remain active. External links are restricted to the game repository on GitHub. The LAN utility receives a minimal environment and no cloud signing keys or repository credentials.

## Automated native fixtures

`--smoke-report=ABSOLUTE.json --profile-dir=ABSOLUTE_FOLDER` loads a packaged diagnostic page with external network requests blocked. It uses the actual bundled worker for all 210 class/mode/difficulty starts, validates boundary restore, fixed-step movement and a weapon event, round-trips a profile, loads a bundled font and decodes all 61 compressed music copies at the machine's native audio sample rate. It asserts no Node API in the renderer, zero external network attempts and no LAN authority. This is a software fixture, not a rendered game review or listening approval.

`--lan-report=ABSOLUTE.json --profile-dir=ABSOLUTE_FOLDER` tests the actual bundled utility authority. It holds a port, checks the occupied-port error without disturbing that listener, releases it, starts hosting, joins two real SDK clients, observes combat replication, leaves and verifies shutdown. The test never substitutes a separately installed Node process for the bundled authority. It is a localhost fixture, not a physical second-computer LAN test.

The profile-directory override isolates diagnostic data from the user's real profile. Diagnostic modes require explicit command-line flags; default startup opens the game and creates no authority. Final packages are checked after fresh ZIP extraction and an independent ordinary Windows folder copy. Evidence includes per-member size/SHA-256 comparisons and the native fixtures on each copy. A manifest by itself is not a successful launch.

## Remaining acceptance

The shared pipeline, native package fixtures and per-artifact evidence establish only their measured behavior. Manual rendered gameplay, human listening/accessibility, native-language/device checks, a physical second-machine LAN session, final tuning/full action/facing animation, verified hosted rankings/recovery, public browser rollout and final coordinated release remain open. The current public Site still serves its earlier protocol-4 build.

Implementation follows the official [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [custom protocol](https://www.electronjs.org/docs/latest/api/protocol), [utility process](https://www.electronjs.org/docs/latest/api/utility-process) and [application distribution](https://www.electronjs.org/docs/latest/tutorial/application-distribution) interfaces. Windows resource editing uses [resedit-js](https://github.com/jet2jet/resedit-js); the bundled Electron release is pinned to 45.0.0.
