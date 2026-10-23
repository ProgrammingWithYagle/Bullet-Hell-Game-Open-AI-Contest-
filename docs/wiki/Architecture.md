# Architecture

TypeScript, Phaser, Vite, Colyseus and Electron. Shared authoritative simulation rules support online and offline play. 30 Hz simulation, initially 20 Hz state patches, independent rendering. Predict movement and reconcile; validate all economy and combat on the server.

| Interface | Contract |
| --- | --- |
| RoomSettings | mode, difficulty, visibility, seed, contentRevision, protocolVersion. Route is represented by the selected campaign mode. |
| PublicRoomSummary | public room ID, name, mode, difficulty, connected players, maximum players, phase and capacity state. Never a private code, checkpoint signature or reconnect token. |
| InputFrame | sequence, client tick, normalized movement, aim angle, fire, reload, dodge, Q/E, ultimate and interact actions. Reject non-finite, oversized, stale and rate-exceeding inputs. |
| ContentCatalog | Versioned definitions for classes, abilities, weapons, upgrades, supplies, skills, bosses, attacks, difficulties, mutations, modes and arenas. |
| ProfileV1 | Locale, controls, display/audio/accessibility settings, mastery, cosmetics, lore, difficulty unlocks and local best streaks. No purchased online power. |
| CheckpointV1 | Room ID, intermission sequence, seed, mode, difficulty, roster/builds, earned rewards, mutation lifetimes, recovery credentials, issue/expiry times, protocol/content revisions and HMAC signature. Never broadcast the signing key. |
