# Boss-defeated moment

The player accepts the chat toggle/action row for now and requests a less abrupt end to boss fights: play the existing falling animation, announce Boss defeated at the top, then show the next choices. The assumption that all bosses have full falls was checked: fifteen have multiframe sequences (maximum1second) and fifty-one have final poses. Keep this distinction explicit. Do not generate or overwrite native art.

The new shared two-second beat preserves actual combat metrics/rewards and full next-choice durations; use existing defeatedAt/tick fields so multiplayer peers stay synchronized. Human/rendered acceptance is pending.
