import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../shared/lan.ts';
const api: DesktopBridge = {
  platform: 'windows',
  lanStatus: () => ipcRenderer.invoke('grave:lan-status'),
  startLan: (port: number) => ipcRenderer.invoke('grave:lan-start', port),
  stopLan: () => ipcRenderer.invoke('grave:lan-stop'),
};
contextBridge.exposeInMainWorld('graveDesktop', Object.freeze(api));
if (process.argv.includes('--grave-smoke'))
  contextBridge.exposeInMainWorld('graveSmoke', {
    finish: (result: unknown) => ipcRenderer.invoke('grave:smoke', result),
  });
