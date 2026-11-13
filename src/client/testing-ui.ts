import { t } from "./i18n.ts";
import { escape as e } from "./ui/html.ts";
const unlockKey = "ga-testing-difficulties";
export function testingDifficultiesUnlocked() {
  try {
    return sessionStorage.getItem(unlockKey) === "1";
  } catch {
    return false;
  }
}
export function unlockTestingDifficulties() {
  try {
    sessionStorage.setItem(unlockKey, "1");
    return true;
  } catch {
    return false;
  }
}
export function testingToolsMarkup(online: boolean) {
  return (
    '<details class="testing-tools" id="testing-tools-panel"><summary>' +
    e(t("ui.testingTools")) +
    "</summary><p>" +
    e(t(online ? "ui.testingSoloOnly" : "ui.testingNoRecords")) +
    '</p><div class="testing-fields"><label>' +
    e(t("ui.coins")) +
    '<input id="testing-coins" type="number" min="0" max="1000000" value="5000" ' +
    (online ? "disabled" : "") +
    "></label><label>" +
    e(t("ui.skillPoints")) +
    '<input id="testing-sp" type="number" min="0" max="1000" value="100" ' +
    (online ? "disabled" : "") +
    '></label><button id="testing-apply" ' +
    (online ? "disabled" : "") +
    ">" +
    e(t("ui.testingApply")) +
    '</button></div><button id="testing-unlock">' +
    e(t("ui.testingUnlock")) +
    '</button><p id="testing-status" role="status"></p></details>'
  );
}
