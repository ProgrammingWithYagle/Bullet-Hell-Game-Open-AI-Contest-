import type { DesktopBridge } from '../shared/lan.ts';
declare global {
  interface Window {
    graveDesktop?: DesktopBridge;
  }
}
export function desktopBridge() {
  return typeof window === 'undefined' ? undefined : window.graveDesktop;
}
