import type { Game } from "../shared/game.ts";
export type TestingCommand = { coins: number; sp: number };
export function validTestingCommand(value: unknown): value is TestingCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as TestingCommand;
  return (
    Object.keys(v).length === 2 &&
    Number.isInteger(v.coins) &&
    v.coins >= 0 &&
    v.coins <= 1000000 &&
    Number.isInteger(v.sp) &&
    v.sp >= 0 &&
    v.sp <= 1000
  );
}
/** Only the testing Solo worker imports this; no room message exposes it. */
export function applyTestingCommand(game: Game, value: unknown) {
  const p = game.players.get("solo");
  if (
    !validTestingCommand(value) ||
    !p ||
    game.players.size !== 1 ||
    game.settings.maxPlayers !== 1 ||
    !["lobby", "shop", "combat"].includes(game.phase)
  )
    return false;
  const spent = p.skills.reduce((sum, id) => sum + game.skillCost(id), 0);
  p.coins = value.coins;
  p.totalSp = spent + value.sp;
  game.testingModified = true;
  return true;
}
