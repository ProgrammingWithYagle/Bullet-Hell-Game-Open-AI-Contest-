import Phaser from "phaser";
import "./warden-rehearsal.css";
import arenaUrl from "../assets/proofs/arena-v1.png?url";
import soldierUrl from "../assets/proofs/animation/soldier-run-atlas.png?url";
import attackUrl from "../assets/production/motion/lantern-warden-attack-v2-atlas.png?url";
import idleUrl from "../assets/production/motion/lantern-warden-idle-v1-atlas.png?url";
import channelUrl from "../assets/production/motion/lantern-warden-channel-v1-atlas.png?url";
import {
  WardenRehearsal,
  WARDEN_FOOT,
  WARDEN_GROUND,
} from "../src/shared/warden-rehearsal.ts";
import type { Sector } from "../src/shared/warden-signature.ts";
import { HZ } from "../src/shared/protocol.ts";
import {
  wardenPose,
  lanternWorld,
  wardenArt,
} from "../src/client/warden-presentation.ts";

const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const model = new WardenRehearsal();
const held = new Set<string>();
let pad = { x: 0, y: 0 },
  running = false,
  prepared = false,
  anchors = false,
  contrast = false;
let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let accumulator = 0;
element<HTMLInputElement>("reduced").checked = reduced;
function setRunning(value: boolean, message?: string) {
  running = prepared && model.health > 0 && value;
  accumulator = 0;
  element("play").textContent = running ? "Pause" : "Run rehearsal";
  element("play").setAttribute("aria-pressed", String(running));
  element<HTMLButtonElement>("step").disabled =
    !prepared || running || model.health <= 0;
  element("status").textContent =
    message ??
    (running
      ? "Follow the outlined wedge."
      : "Paused. Step one simulation tick or resume.");
}
function movement() {
  return {
    x:
      Number(held.has("KeyD") || held.has("ArrowRight")) -
      Number(held.has("KeyA") || held.has("ArrowLeft")) +
      pad.x,
    y:
      Number(held.has("KeyS") || held.has("ArrowDown")) -
      Number(held.has("KeyW") || held.has("ArrowUp")) +
      pad.y,
  };
}
function advance() {
  model.step(movement());
  if (model.health <= 0)
    setRunning(false, "Rehearsal ended. Reset to try again.");
}
function reset() {
  model.reset();
  held.clear();
  pad = { x: 0, y: 0 };
  setRunning(false, "Reset. The first warning is paused.");
}

class WardenScene extends Phaser.Scene {
  private paint!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private boss!: Phaser.GameObjects.Sprite;
  private survivor!: Phaser.GameObjects.Sprite;
  private phaseLabel!: Phaser.GameObjects.Text;
  private safeLabel!: Phaser.GameObjects.Text;
  constructor() {
    super("warden-rehearsal");
  }
  preload() {
    this.load.image("floor", arenaUrl);
    this.load.spritesheet("soldier", soldierUrl, {
      frameWidth: 256,
      frameHeight: 256,
    });
    for (const [clip, url] of Object.entries({
      idle: idleUrl,
      attack: attackUrl,
      channel: channelUrl,
    }))
      this.load.spritesheet("warden-" + clip, url, {
        frameWidth: 512,
        frameHeight: 512,
      });
    this.load.once("loaderror", (file: { key: string }) => {
      element("phase").textContent = "Artwork could not load";
      element("status").textContent =
        "Missing asset: " +
        file.key +
        ". Reload after checking the local files.";
    });
  }
  create() {
    const keys = [
      "floor",
      "soldier",
      "warden-idle",
      "warden-attack",
      "warden-channel",
    ];
    if (keys.some((key) => !this.textures.exists(key))) return;
    this.add.image(800, 500, "floor").setDisplaySize(1600, 1000).setAlpha(0.62);
    this.add.rectangle(800, 500, 1600, 1000, 0x132b29, 0.35);
    this.paint = this.add.graphics().setDepth(2);
    this.boss = this.add
      .sprite(WARDEN_FOOT.x, WARDEN_FOOT.y, "warden-attack", 0)
      .setOrigin(wardenArt.origin[0], wardenArt.origin[1])
      .setDisplaySize(wardenArt.displayCell, wardenArt.displayCell)
      .setDepth(5);
    this.survivor = this.add
      .sprite(model.player.x, model.player.y, "soldier", 0)
      .setOrigin(0.5, 0.86)
      .setDisplaySize(83, 83)
      .setDepth(6);
    this.marks = this.add.graphics().setDepth(20);
    const style = {
      fontFamily: "sans-serif",
      fontSize: "21px",
      color: "#f1e4bd",
      backgroundColor: "#142b29",
      padding: { x: 10, y: 6 },
    };
    this.phaseLabel = this.add
      .text(800, 140, "", style)
      .setOrigin(0.5)
      .setDepth(25);
    this.safeLabel = this.add
      .text(0, 0, "TRAILING WEDGE", {
        ...style,
        fontSize: "16px",
        color: "#bfe2d1",
      })
      .setOrigin(0.5)
      .setDepth(25);
    prepared = true;
    for (const id of ["play", "step", "reset"])
      element<HTMLButtonElement>(id).disabled = false;
    setRunning(
      false,
      "Ready. Run the rehearsal or step through the first warning.",
    );
    this.renderState();
  }
  private sector(sector: Sector, color: number, alpha: number, width = 3) {
    const points = [new Phaser.Math.Vector2(sector.x, sector.y)];
    for (let index = 0; index <= 48; index++) {
      const angle = sector.aim - sector.arc / 2 + (sector.arc * index) / 48;
      points.push(
        new Phaser.Math.Vector2(
          sector.x + Math.cos(angle) * sector.radius,
          sector.y + Math.sin(angle) * sector.radius,
        ),
      );
    }
    this.paint.fillStyle(color, alpha).fillPoints(points, true);
    this.paint.lineStyle(width, color, 1).strokePoints(points, true);
  }
  private cross(x: number, y: number, color: number) {
    this.marks
      .lineStyle(2, color)
      .lineBetween(x - 7, y, x + 7, y)
      .lineBetween(x, y - 7, x, y + 7);
  }
  private renderState() {
    const sample = model.sample(),
      pose = wardenPose(sample, reduced);
    const color = contrast ? 0xffcc4d : 0xe7a063;
    this.paint.clear();
    this.marks.clear();
    if (sample.phase !== "rest") {
      this.sector(
        sample.cone,
        color,
        sample.phase === "active" ? 0.28 : 0.08,
        sample.phase === "active" ? 5 : 3,
      );
      this.sector(sample.trailingSafe, 0x9dd3bd, 0.07, 2);
      const center = sample.trailingSafe.aim;
      this.safeLabel
        .setPosition(
          WARDEN_GROUND.x + Math.cos(center) * 290,
          WARDEN_GROUND.y + Math.sin(center) * 290,
        )
        .setVisible(true);
    } else this.safeLabel.setVisible(false);
    this.paint
      .lineStyle(3, 0xe6d4a0)
      .strokeCircle(WARDEN_GROUND.x, WARDEN_GROUND.y, 10);
    this.paint
      .fillStyle(0x0b1c1a, 0.5)
      .fillEllipse(WARDEN_FOOT.x, WARDEN_FOOT.y, 95, 22);
    this.boss
      .setTexture("warden-" + pose.clip, pose.frame)
      .setDisplaySize(wardenArt.displayCell, wardenArt.displayCell);
    const input = movement(),
      moving = Math.hypot(input.x, input.y) > 0 && running;
    this.survivor
      .setPosition(model.player.x, model.player.y)
      .setFrame(moving && !reduced ? Math.floor(sample.tick / 3) % 8 : 0);
    if (input.x) this.survivor.setFlipX(input.x < 0);
    this.survivor.setTint(model.health < 35 ? 0xe1a28b : 0xffffff);
    this.marks
      .lineStyle(2, 0xe8e4bd)
      .strokeCircle(model.player.x, model.player.y, model.playerRadius);
    if (anchors) {
      const lamp = lanternWorld(pose, WARDEN_FOOT);
      this.cross(WARDEN_FOOT.x, WARDEN_FOOT.y, 0xffffff);
      this.cross(lamp.x, lamp.y, 0xffce6e);
      this.marks
        .lineStyle(1, 0xe6d4a0, 0.8)
        .lineBetween(lamp.x, lamp.y, WARDEN_GROUND.x, WARDEN_GROUND.y);
    }
    const titles = {
      warning: "LANTERN RISING · WARNING",
      active: "ROTATING CONE · ACTIVE",
      rest: "LANTERN LOWERED · REST",
    };
    this.phaseLabel.setText(titles[sample.phase]);
    element("phase").textContent = titles[sample.phase];
    element("clock").textContent =
      `${(sample.remainingTicks / HZ).toFixed(2)}s remaining · cycle ${sample.cycle + 1} · tick ${sample.tick}`;
    element("health").textContent =
      `Health ${model.health} / 100 · ${model.hits} contacts`;
    element("pose").textContent =
      `${pose.clip} · frame ${pose.frame + 1} / ${wardenArt.clips[pose.clip].frames}`;
  }
  update(_time: number, delta: number) {
    if (!prepared) return;
    if (running) {
      // A throttled/hidden tab pauses explicitly instead of slowing the authored tell.
      if (document.hidden || delta > 250) {
        setRunning(
          false,
          "Paused after a visibility or timing interruption. Resume when ready.",
        );
      } else {
        accumulator += delta;
        while (accumulator >= 1000 / HZ && running) {
          accumulator -= 1000 / HZ;
          advance();
        }
      }
    }
    this.renderState();
  }
}

element("play").addEventListener("click", () => {
  setRunning(!running);
  if (running) element("stage").focus();
});
element("step").addEventListener("click", () => {
  if (prepared && !running) advance();
});
element("reset").addEventListener("click", reset);
for (const id of ["contrast", "reduced", "anchors"])
  element(id).addEventListener("change", () => {
    contrast = element<HTMLInputElement>("contrast").checked;
    reduced = element<HTMLInputElement>("reduced").checked;
    anchors = element<HTMLInputElement>("anchors").checked;
  });
window.addEventListener("keydown", (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest("input,button,a,select,textarea")
  )
    return;
  if (!prepared) return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(event.code)
  ) {
    event.preventDefault();
    held.add(event.code);
  } else if (!event.repeat && event.code === "Space") {
    event.preventDefault();
    setRunning(!running);
  } else if (!event.repeat && event.code === "KeyR") reset();
});
window.addEventListener("keyup", (event) => held.delete(event.code));
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-move]",
)) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const [x, y] = button.dataset.move!.split(",").map(Number);
    pad = { x, y };
  });
  const release = () => {
    pad = { x: 0, y: 0 };
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
window.addEventListener("blur", () => {
  held.clear();
  pad = { x: 0, y: 0 };
  setRunning(false, "Paused when the window lost focus.");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    held.clear();
    pad = { x: 0, y: 0 };
    setRunning(false, "Paused while the page was hidden.");
  }
});
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "stage",
  width: 1600,
  height: 1000,
  backgroundColor: "#142b29",
  scene: WardenScene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: false },
});
