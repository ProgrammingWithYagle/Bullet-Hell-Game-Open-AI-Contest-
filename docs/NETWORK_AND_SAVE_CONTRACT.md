# Multiplayer, save behavior and interface contracts

`content/contracts.schema.json` contains versioned structural definitions; `content/leaderboards.json` contains ranked service schemas. The authoritative simulation must enforce the additional semantic rules. A valid JSON message is not a trusted purchase or combat result.

| Event | Required behavior |
| --- | --- |
| Client loses input packets | Keep latest bounded input; after 250 ms with no valid input, movement and held fire become zero. No teleport or invulnerability. |
| Connection drops | Preserve the avatar and 60-second reserved slot. The room clock and hostile hazards continue. Show reconnect status and continue downing/elimination normally. |
| Valid reconnect | Reclaim original participant identity and build using the server-issued secret reconnection token. Reconcile latest acknowledgement; do not re-award rewards or reset cooldowns. |
| Reconnect expires | Mark departed. Remove the slot and recompute group scaling at the next phase boundary, preserving current boss-health fraction. Do not reset the timer. Historical leaderboard membership remains. |
| Late arrival | Wait in a clear spectator/loading state. Admit at the next encounter start with the route's nominal earned SP/coin budget, then validate class choices and spend on the server. Do not award the previous fight's reward. |
| Lobby creator leaves | Public server continues under server ownership. Promote the oldest connected lobby member for readiness/settings controls. Private access and room code remain private. |
| Explicit LAN host closes | Show host loss, retain last complete local checkpoint and allow restart. LAN is practice. Closing a player renderer must not silently open a LAN port. |
| Entire party downed | Consume an eligible solo self-revive where applicable; otherwise defeat. Never wait twenty seconds for a revive no living participant can channel. |
| Party splits after banked victory | Departing members keep campaign success. Continuing willing members may attempt the optional secret. Secret results cannot replace or revoke the base clear. |
| Player exits Endless | Bank completed personal progress and keep the remaining room active. Finalize the shared global record once at run termination; historical players share that row. |
| Vote changes | Accept one current choice per eligible connected participant until the phase closes. Replacement changes the choice, never adds a second vote. Ties use the seeded choice order. |
| Duplicate purchase | Return the original result for the same transaction ID. A second distinct ID still requires sufficient current coins and legal stack limits. |
| Restart during an intermission | Verify the signed checkpoint and compatible revision; claim the latest registered sequence atomically before resuming a ranked run. |
| Restart during combat | Resume the previous completed checkpoint as practice. Do not replay an interrupted ranked fight for a better official score. |
| Signing key changes | Existing online checkpoints fail verification with an explicit localized explanation; offline compatible saves remain playable. Never accept unsigned fallback combat results. |
| Global record service fails | Continue gameplay and latch this run unverified if required lifecycle registration is not acknowledged. Never invent a global rank or discard earned local mastery. |
| Profile file corrupts | Validate before use; retain the unreadable source for export, offer the last valid backup or defaults, and never overwrite the only backup until replacement passes validation. |
| Profile import | Maximum 256 KiB; parse version/schema, finite bounded values, known IDs and normalized strings. Import settings/mastery/cosmetics, never server secrets or trusted online inventory. |
| Offline save | Write only at a completed intermission with version, content hash, seed, mode, roster/build, mutation durations and earned rewards. Replace atomically after a temporary write validates. |
| Protocol/content mismatch | Reject online join before admission and show both revisions and an update action. Never join incompatible simulations. |

Public discovery returns only public rooms. Codes are six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, generated from cryptographic random bytes. Compare normalized codes on the server and rate-limit guesses. The public client requires no account; display names are untrusted plain text and never a durable identity claim.

Instance capacity is distinct from a mode's allowed roster. The measured active-room/player/projectile budget gates room creation and joining; queued players receive their position and can cancel. A room's advertised 50-player maximum does not establish that a free service can host several such rooms simultaneously. Capacity acceptance must record the actual tested hosting instance and usage allowance.
