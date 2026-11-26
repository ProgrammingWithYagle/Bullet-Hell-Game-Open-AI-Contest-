# Controls and settings review

This pass keeps the requested first-visit language chooser and setup-bound automatic names, and improves existing controls. Key changes retain focus in the same owning panel; save errors restore the stored values and allow retry. Key capture cancels on disclosure close, window blur, pause/menu close or page teardown. Old detached actions are ignored. Held repeats and IME composition do not choose a key. Tab and Escape cancel; conflicts retain current bindings. Mouse buttons, Space and the left stick have source-backed labels in all fifteen catalogs.

The initial native reproduction recorded six failing cases. The disclosure test originally moved its parent after the binder was created, unlike the actual settings page; it now mounts the disclosure before binding. That correction and all original failure logs are retained. Nine final regressions plus nine first-language checks pass18/18, and TypeScript passes. The full source gate, exact remote CI, audience previews, Wiki and portable native review require their separate receipts.

No protocol, scoring, gameplay content, revive/shield/host policy or published deployment changes. Compiled native controller evidence is separate from rendered, human, language, device, controller and physical-second-machine LAN acceptance.

Full gate01 retained restricted-network transport timeouts. Its own test subprocess tree was stopped after the isolated chat diagnostic passed5/5 outside the sandbox. All eight generic issued reports were restored. Gate02 repeats the full checks with loopback access. Clicking other menu controls now cancels key capture without swallowing navigation or interpreting that click as a mouse binding.
