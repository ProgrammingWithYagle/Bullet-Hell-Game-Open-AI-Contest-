import type { View } from "../shared/view.ts";
import { retinueOrders, type RetinueOrder } from "../shared/summoner-kit.ts";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Owned, accessible commands. The server decides legality and reports the actual order. */
export class RetinueControls {
  private buttons = new Map<RetinueOrder, HTMLButtonElement>();
  private summary: HTMLElement;
  private health: HTMLElement;
  private activeOrder: RetinueOrder = "escort";
  private disposed = false;
  private healthKey = "";
  constructor(
    readonly root: HTMLElement,
    private t: Translate,
    send: (order: RetinueOrder) => void,
    private format: (value: number) => string = String,
  ) {
    root.className = "retinue-controls";
    root.hidden = true;
    root.setAttribute("aria-label", t("ui.retinueOrders"));
    this.summary = document.createElement("small");
    root.append(this.summary);
    const orders = document.createElement("div");
    orders.className = "retinue-order-buttons";
    root.append(orders);
    for (const order of retinueOrders) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-retinue-order", order);
      button.textContent = t("ui.retinue." + order);
      button.title = t("ui.retinue." + order + "Hint");
      button.disabled = true;
      button.onclick = () => {
        if (!this.disposed && !root.hidden && !button.disabled) send(order);
      };
      orders.append(button);
      this.buttons.set(order, button);
    }
    const details = document.createElement("details"),
      label = document.createElement("summary");
    label.textContent = t("ui.retinueHealth");
    this.health = document.createElement("ul");
    details.append(label, this.health);
    root.append(details);
  }
  update(view: View, owner: string, blocked: boolean, binding: string) {
    if (this.disposed) return;
    const p = view.players.find((p) => p.id === owner);
    this.root.hidden = p?.classId !== "summoner";
    const live = (view.retinue ?? []).filter(
      (e) => e.owner === owner && e.health > 0,
    );
    const available =
      !this.root.hidden &&
      !blocked &&
      !view.matchPaused &&
      view.phase === "combat" &&
      p?.status === "active";
    this.activeOrder = (p?.kit.retinueOrder ?? "escort") as RetinueOrder;
    this.summary.textContent = this.t("ui.retinueSummary", {
      permanent: this.format(p?.kit.retinuePermanent ?? 0),
      capacity: this.format(p?.kit.retinueCapacity ?? 4),
      temporary: this.format(live.filter((e) => e.temporary).length),
    });
    this.summary.title = this.t("ui.retinueCycleHint", { binding });
    for (const [order, button] of this.buttons) {
      button.disabled =
        !available ||
        !live.length ||
        (order === "focus" &&
          (p?.kit.retinueMarkUntil ?? 0) <= view.combatTick);
      button.setAttribute("aria-pressed", String(order === this.activeOrder));
    }
    const key = live
      .map((e) =>
        [e.id, e.kind, Math.ceil(e.health), Math.ceil(e.maxHealth)].join(":"),
      )
      .join("|");
    if (key !== this.healthKey) {
      this.healthKey = key;
      this.health.replaceChildren();
      for (const e of live) {
        const row = document.createElement("li");
        row.textContent = this.t("ui.retinueHealthRow", {
          name: this.t("ui.retinue." + e.kind),
          health: this.format(Math.ceil(e.health)),
          maximum: this.format(Math.ceil(e.maxHealth)),
        });
        this.health.append(row);
      }
    }
  }
  cycle() {
    if (this.disposed || this.root.hidden) return;
    const start = retinueOrders.indexOf(this.activeOrder);
    for (let step = 1; step <= retinueOrders.length; step++) {
      const button = this.buttons.get(
        retinueOrders[(start + step) % retinueOrders.length],
      )!;
      if (!button.disabled) {
        button.click();
        return;
      }
    }
  }
  dispose() {
    this.disposed = true;
    for (const button of this.buttons.values()) button.onclick = null;
    this.root.remove();
  }
}
