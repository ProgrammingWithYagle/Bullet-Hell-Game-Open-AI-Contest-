import { distance, segmentRect, type Rect } from "./geometry.ts";
import type { Vec } from "./protocol.ts";
type Graph = {
  stamp: string;
  nodes: Vec[];
  links: { to: number; cost: number }[][];
};
type Route = { next: number; target: Vec; points: Vec[] };
const clear = (a: Vec, b: Vec, obstacles: Rect[], radius: number) =>
  !obstacles.some((o) => segmentRect(a, b, o, radius) !== null);
/** Rats after their fixed scent leg, plus the explicit Matron brood option; at most 64 corners. */
export class RatNavigator {
  private graph?: Graph;
  private routes = new Map<number, Route>();
  clear() {
    this.graph = undefined;
    this.routes.clear();
  }
  remove(id: number) {
    this.routes.delete(id);
  }
  waypoint(
    id: number,
    from: Vec,
    target: Vec,
    obstacles: Rect[],
    radius: number,
    tick: number,
  ): Vec {
    if (clear(from, target, obstacles, radius)) {
      this.routes.delete(id);
      return target;
    }
    const stamp =
      radius +
      ":" +
      obstacles.map((o) => [o.x, o.y, o.width, o.height].join(",")).join(";");
    if (this.graph?.stamp !== stamp) {
      this.graph = this.build(stamp, obstacles, radius);
      this.routes.clear();
    }
    let route = this.routes.get(id);
    if (!route || tick >= route.next || distance(route.target, target) > 48) {
      route = {
        next: tick + 15,
        target: { ...target },
        points: this.find(from, target, this.graph, obstacles, radius),
      };
      this.routes.set(id, route);
    }
    while (route.points.length && distance(from, route.points[0]) < 0.25)
      route.points.shift();
    return route.points[0] ?? from;
  }
  private build(stamp: string, obstacles: Rect[], radius: number): Graph {
    const nodes: Vec[] = [],
      pad = radius + 1;
    for (const o of obstacles)
      for (const x of [o.x - pad, o.x + o.width + pad])
        for (const y of [o.y - pad, o.y + o.height + pad]) {
          const p = { x, y };
          if (
            nodes.length >= 64 ||
            x < radius ||
            x > 1600 - radius ||
            y < radius ||
            y > 1000 - radius ||
            !clear(p, p, obstacles, radius) ||
            nodes.some((n) => distance(n, p) < 0.5)
          )
            continue;
          nodes.push(p);
        }
    const links = nodes.map(() => [] as { to: number; cost: number }[]);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (clear(nodes[i], nodes[j], obstacles, radius)) {
          const cost = distance(nodes[i], nodes[j]);
          links[i].push({ to: j, cost });
          links[j].push({ to: i, cost });
        }
    return { stamp, nodes, links };
  }
  private find(
    from: Vec,
    target: Vec,
    g: Graph,
    obstacles: Rect[],
    radius: number,
  ) {
    const n = g.nodes.length,
      dist = Array(n).fill(Infinity),
      prev = Array(n).fill(-1),
      done = Array(n).fill(false),
      last = g.nodes.map((p) => clear(p, target, obstacles, radius));
    for (let i = 0; i < n; i++)
      if (clear(from, g.nodes[i], obstacles, radius))
        dist[i] = distance(from, g.nodes[i]);
    let best = -1,
      cost = Infinity;
    for (let count = 0; count < n; count++) {
      let at = -1;
      for (let i = 0; i < n; i++)
        if (!done[i] && (at < 0 || dist[i] < dist[at])) at = i;
      if (at < 0 || !Number.isFinite(dist[at]) || dist[at] >= cost) break;
      done[at] = true;
      if (last[at] && dist[at] + distance(g.nodes[at], target) < cost) {
        cost = dist[at] + distance(g.nodes[at], target);
        best = at;
      }
      for (const link of g.links[at]) {
        const candidate = dist[at] + link.cost;
        if (candidate < dist[link.to]) {
          dist[link.to] = candidate;
          prev[link.to] = at;
        }
      }
    }
    if (best < 0) return [];
    const path: Vec[] = [];
    for (let i = best; i >= 0; i = prev[i]) path.push(g.nodes[i]);
    return path.reverse();
  }
}
