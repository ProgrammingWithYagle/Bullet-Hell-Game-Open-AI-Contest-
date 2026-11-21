import type { RunReceipt } from "./profile.ts";
export function localRecordOrder(a: RunReceipt, b: RunReceipt) {
  return (
    Number(b.fullCampaign) - Number(a.fullCampaign) ||
    b.clears - a.clears ||
    (a.mode === "endless"
      ? b.combatTicks - a.combatTicks
      : a.combatTicks - b.combatTicks) ||
    a.runId.localeCompare(b.runId)
  );
}
export function localRecords(
  records: RunReceipt[],
  mode: string,
  difficulty: string,
) {
  return records
    .filter((r) => r.mode === mode && r.difficulty === difficulty)
    .toSorted(localRecordOrder)
    .slice(0, 100);
}
