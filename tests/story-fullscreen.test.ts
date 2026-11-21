import test from "node:test";
import assert from "node:assert/strict";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";
import { PROFILE_KEY, freshProfile } from "../src/client/profile.ts";

test("Opening a chapter uses a native modal screen, returns focus, and preserves reading without touching progress", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.saved.set(PROFILE_KEY, JSON.stringify(freshProfile()));
  const before = env.saved.get(PROFILE_KEY);
  env.host.innerHTML = ui.storyReaderMarkup(
    { kind: "prologue", index: 0 },
    "en",
    "full-screen-first",
  );
  const dispose = ui.bindStoryReaders(env.host);
  context.after(dispose);
  const dialog = env.host.querySelector("dialog.story-reader")!,
    launch = env.host.querySelector("[data-vn-open]")!;
  assert(!dialog.open);
  assert(!ui.storyReaderOpen());
  launch.click();
  assert(dialog.open);
  assert(ui.storyReaderOpen());
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  assert.equal(
    env.document.activeElement,
    dialog.querySelector("[data-vn-close]"),
  );
  assert(env.document.documentElement.classList.contains("novel-reading"));
  dialog.querySelector('[data-vn-step="1"]')!.click();
  const second = dialog.querySelector("[data-vn-line]")!.textContent;
  dialog.querySelector("[data-vn-close]")!.click();
  assert(!dialog.open);
  assert.equal(env.document.activeElement, launch);
  assert(!env.document.documentElement.classList.contains("novel-reading"));
  launch.click();
  assert.equal(dialog.querySelector("[data-vn-line]")!.textContent, second);
  assert.equal(env.saved.get(PROFILE_KEY), before);
});
test("Keyboard reading works from focused controls, leaves transcript scrolling alone, and Escape returns without Ready", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.host.innerHTML = ui.storyReaderMarkup(
    { kind: "prologue", index: 0 },
    "ar",
    "keyboard-full",
  );
  const dispose = ui.bindStoryReaders(env.host);
  context.after(dispose);
  env.host.querySelector("[data-vn-open]")!.click();
  const dialog = env.host.querySelector("dialog.story-reader")!,
    first = dialog.querySelector("[data-vn-line]")!.textContent;
  dialog.dispatch("keydown", {
    key: "ArrowRight",
    target: dialog.querySelector("[data-vn-close]"),
  });
  const second = dialog.querySelector("[data-vn-line]")!.textContent;
  assert.notEqual(second, first);
  const transcript = dialog.querySelector(".vn-transcript")!;
  transcript.open = true;
  dialog.dispatch("keydown", { key: "PageDown" });
  assert.equal(dialog.querySelector("[data-vn-line]")!.textContent, second);
  dialog.dispatch("keydown", { key: "Escape" });
  assert(dialog.open);
  assert(!transcript.open);
  dialog.dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(dialog.querySelector("[data-vn-line]")!.textContent, first);
  dialog.dispatch("cancel");
  assert(!dialog.open);
  assert.deepEqual([...env.saved.keys()], ["ga-story-reading-v1"]);
});
test("An open aftermath survives a UI rebind, an explicit close stays closed, and the next report opens independently", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  const markup = (index: number) =>
    ui.storyReaderMarkup(
      { kind: "report", index },
      "en",
      "automatic-party",
      true,
    );
  env.host.innerHTML = markup(0);
  let dispose = ui.bindStoryReaders(env.host);
  assert(env.host.querySelector("dialog")!.open);
  env.host.querySelector('[data-vn-step="1"]')!.click();
  const text = env.host.querySelector("[data-vn-line]")!.textContent;
  dispose();
  env.host.innerHTML = markup(0);
  dispose = ui.bindStoryReaders(env.host);
  assert(env.host.querySelector("dialog")!.open);
  assert.equal(env.host.querySelector("[data-vn-line]")!.textContent, text);
  env.host.querySelector("[data-vn-close]")!.click();
  dispose();
  env.host.innerHTML = markup(0);
  dispose = ui.bindStoryReaders(env.host);
  assert(!env.host.querySelector("dialog")!.open);
  dispose();
  env.host.innerHTML = markup(1);
  dispose = ui.bindStoryReaders(env.host);
  assert(env.host.querySelector("dialog")!.open);
  context.after(dispose);
});
test("Disposal closes the reading screen, releases scroll ownership and makes detached controls harmless", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/ui/story-reader.ts");
  env.host.innerHTML = ui.storyReaderMarkup(
    { kind: "chapter", index: 0 },
    "en",
    "disposed-full",
  );
  const dispose = ui.bindStoryReaders(env.host);
  const launch = env.host.querySelector("[data-vn-open]")!;
  launch.click();
  const next = env.host.querySelector('[data-vn-step="1"]')!,
    before = JSON.stringify([...env.saved]);
  dispose();
  assert(!ui.storyReaderOpen());
  assert(!env.document.documentElement.classList.contains("novel-reading"));
  launch.click();
  next.click();
  assert(!ui.storyReaderOpen());
  assert.equal(JSON.stringify([...env.saved]), before);
});
test("The hub opens a full chapter screen only after an explicit allowed selection", async (context) => {
  const env = menuEnvironment(context),
    hub = await menuBundle(context, "src/client/ui/story-hub.ts");
  let starts = 0;
  const dispose = hub.bindStoryHub(
    env.host,
    () => starts++,
    () => {},
  );
  context.after(dispose);
  assert(!env.host.querySelector("dialog"));
  env.host.querySelector('[data-story-chapter="0"]')!.click();
  assert(env.host.querySelector("dialog")!.open);
  assert.equal(env.host.querySelector("dialog")!.dataset.vnKind, "chapter");
  env.host.querySelector("[data-vn-close]")!.click();
  assert(!env.host.querySelector("dialog")!.open);
  assert.equal(starts, 0);
});
