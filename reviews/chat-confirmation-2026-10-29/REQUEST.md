# Confirmed chat delivery

The broad active goal remains ordinary-player polish of existing content. The preceding goal turn made progress: sourceac3a393, metadata b312782 and passing818-test local gate, frozen public5235/testing5234 with33served hashes and real locked-room/code/chat checks each. Automatic approval review rejected two source pushes. The pending direct permission question remains unanswered; do not retry or bypass it. Wiki publication is already authorized, with six canonical changes prepared after source upload. No CI for the unpublished source is claimed.

Current evidence shows a silent-loss defect: the existing UI clears text as soon as Session writes to a socket, while the server silently rejects messages sent inside its1.5-second interval. The existing testing-social check even verifies a second socket send returns true while only one message is delivered. This pass addresses that defect and uncertain reconnect delivery, preserving accepted layout, C toggle and footer separation.

Requirements: keep the draft until server confirmation; show useful sending/sent/rejection/uncertainty notices; preserve edits made while waiting; safely retry the most recent unconfirmed message without duplicate posts; retain bounded in-memory room history/receipt state and server-owned sender identity; keep IME composition usable; apply both audiences and all fifteen locales. Protocol42 requires a matching backend and a bounded41local Practice migration; online checkpoints stay strict.

Use the same checkout and branch. No delegation, new checkout, new content roster/branches, main merge, paid provisioning, hosted deployment or contest submission. Future shield-cap branches/selective blocking remain notes only. Preserve all frozen roots, backends, packages and raw evidence. Browser automation stays disabled; native software/art/transport is separate from rendered/human/device/language/listening/WAN acceptance.

New review ports: testing5236/backend2610 and public5237/backend2611. These must use fresh roots/listeners; do not replace or restart any earlier preview. The goal stays active.
