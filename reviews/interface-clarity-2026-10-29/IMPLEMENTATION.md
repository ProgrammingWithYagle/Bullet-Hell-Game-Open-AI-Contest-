# Interface clarity follow-up

This pass follows the public5233 feedback and the request for a visible preparation message during Boss defeated. It preserves the accepted waiting-room/equipment distinction, chat C toggle, independent footer actions, online menu behavior, five-second defeat beat, Medic recovery and shield policy.

## Player-facing changes

- Setup steps, waiting-room setting labels, connected/disconnected status and the selected lobby tab use stronger contrast on their actual dark or paper backgrounds.
- The player-status card has independent health and shield bars, current/maximum values, distinct coins/skill-points/ammo cells and wrapping name/class/build text. All seven headshots crop the existing480×640 character portraits. The second native crop sheet is the selected framing; both source-only inspections are preserved. Combat chat sits above the measured card height; existing menu chat remains in its own column.
- Room-code controls move into normal menu flow under the heading during upgrades, votes, shop, Settings and the optional boss guide. The same details element survives purchases/menu rebuilding and retains its open state and focus. The Waiting room uses its existing full code card, while Prepare equipment keeps the collapsible code control. Countdown and footer rows remain independent.
- Both random-map options use all six actual map images in a filled collage, including the large preview.
- Boss defeated says Preparing the next encounter with a remaining-time count. Victory/defeat prepares results, and the optional extra-fight offer prepares a choice. Countdown digits are excluded from repeated screen-reader announcements. The duration, real fall, single sound and full vote time remain unchanged.
- Hosts may set an optional case-sensitive4–64-code-point password on public or private rooms. Protected public listings show a labeled lock. Joining by listing/code prompts before launching; wrong-password retry retains name/class but clears the secret. Private rooms still require their code. The server keeps independent salted scrypt verifiers; only a boolean is published. Secrets are not added to ConnectionOptions, application browser storage, game state, metadata or checkpoints. Existing reserved reconnects keep their identity without another password.

## Crab edge defect

The baseline actual Game reproduction shows Cobble Crab’s visible pixels crossing Triage Yard’s floor at tick17 while its45-pixel collision anchor is still inside. The painted frame extends much farther above/left than that circle. The native-alpha derivation records every visible frame of all three Small Wakes actors, their origin and display scale, with source/tool hashes. Authority deployment and movement use the union plus4pixels of margin. The existing damage/contact radius is unchanged. A one-pixel interior deployment margin prevents a boundary-tangent movement deadlock. Falling retains the final authority position.

## Compatibility and evidence limits

Protocol41 requires a matching backend. Exact known protocol40 local Practice saves migrate through the existing complete restore validator and keep their map policy, equipment, economy and identity. Server checkpoint compatibility stays strict. Both audiences share the presentation changes; testing-only controls remain isolated.

Native software, real local transports, source alpha and static portrait crops are distinct from browser rendering, human balance/readability/listening, native-language quality, physical-device and WAN acceptance. Browser automation remains disabled. Prior roots/listeners, original artwork, raw failed results and issued packages remain untouched. This source pass is not a game deployment or a replacement Windows release. Future shield-cap branches and selective blocking remain notes only.
