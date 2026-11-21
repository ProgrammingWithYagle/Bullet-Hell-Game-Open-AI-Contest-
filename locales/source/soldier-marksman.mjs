import{marksmanLateMessages}from'./marksman-late.mjs';
import {marksmanDepthMessages}from'./marksman-depth.mjs';
export const soldierMarksmanMessages=()=>({
 ...marksmanLateMessages(),
 ...marksmanDepthMessages(),
 'pathway.soldier-marksman-1.name':'Marksman',
 'pathway.soldier-marksman-1.summary':'Read the cover, choose an angle and spend a cartridge on one deliberate bank.',
 'skill.soldier-marksman-1.name':'Bank Shot',
 'skill.soldier-marksman-1.description':'Use action 1 to spend one magazine round on a 30-base-damage shot that reflects from one masonry face or closed gate. Read the angle: real bodies can stop the first leg and a further wall stops the bank. The projectile travels at 900 pixels per second for at most 1.6 seconds, with 8-second base recovery. No burst opening is needed. Ordinary Reload, dodge or channeling prevents a fresh shot. No auto-aim, immunity, free ammunition or boss-core bypass. Choose this firing discipline instead of Skirmisher; your issued rally, burst and Last Roll Call remain.',
 'ui.soldier.marksmanHelp':'Bank Shot spends one magazine round on action 1. Aim into a masonry face to reflect once, or take a direct shot. Plan around real bodies and further cover. Ordinary Reload and dodge prevent a fresh cast; a rejected request spends no round or recovery. The shot adds no movement or immunity. Your rally, burst and Last Roll Call keep their own jobs.',
 'ui.soldier.bankReady':'one cover bank',
});
