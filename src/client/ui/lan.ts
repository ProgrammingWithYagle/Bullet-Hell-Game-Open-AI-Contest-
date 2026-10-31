import { desktopBridge } from '../desktop.ts';
import { DEFAULT_LAN_PORT, normalizeLanEndpoint, type LanState } from '../../shared/lan.ts';
import { t, locale } from '../i18n.ts';
import messages from '../desktop-messages.json';
import { escape as e } from './html.ts';
export const desktopText = (key: keyof typeof messages.en) =>
  (messages[locale as keyof typeof messages] ?? messages.en)[key];
export function mountLan(
  host: HTMLElement,
  create: (endpoint: string) => void,
  join: (endpoint: string) => void,
  back: () => void,
) {
  const bridge = desktopBridge();
  if (!bridge) {
    back();
    return () => {};
  }
  let state: LanState = { active: false, port: null, endpoints: [] },
    pending = false;
  let disposed = false, revision = 0;
  let portDraft = String(DEFAULT_LAN_PORT), addressDraft = '';
  const alive = () => !disposed && host.isConnected;
  const dispose = () => { disposed = true; revision++; };
  const notice = (value: string) => {
    if (!alive()) return;
    const p = host.querySelector<HTMLElement>('[data-lan-status]');
    if (p) p.textContent = value;
  };
  const busy = () => {
    if (!alive()) return;
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-lan-host],[data-lan-stop],[data-lan-create],[data-lan-join]'))
      button.disabled = pending;
  };
  function render() {
    if (!alive()) return;
    const previousPort = host.querySelector<HTMLInputElement>('[data-lan-port]');
    const previousAddress = host.querySelector<HTMLInputElement>('[data-lan-address]');
    if (previousPort) portDraft = previousPort.value;
    if (previousAddress) addressDraft = previousAddress.value;
    const focus = previousAddress && document.activeElement === previousAddress
      ? { selector: '[data-lan-address]', start: previousAddress.selectionStart, end: previousAddress.selectionEnd }
      : previousPort && document.activeElement === previousPort ? { selector: '[data-lan-port]', start: null, end: null } : null;
    host.innerHTML = `<section class="lan-page settings-page"><div class="section-heading"><h1>${e(desktopText('title'))}</h1><button data-lan-back>${e(t('ui.back'))}</button></div><p>${e(desktopText('localOnly'))}</p><div class="lan-panels"><section><h2>${e(t('ui.lanHost'))}</h2><p>${e(t('ui.hostingWarning'))}</p>${state.active ? `<div class="lan-addresses">${state.endpoints.map((address) => `<p>${e(t('ui.lanAddress', { address }))}</p>`).join('')}</div><div class="actions"><button class="primary" data-lan-create>${e(t('ui.newRun'))}</button><button data-lan-stop>${e(desktopText('stop'))}</button></div>` : `<label>${e(desktopText('port'))}<input data-lan-port type="number" min="1024" max="65535" value="${e(portDraft)}"></label><button data-lan-host>${e(t('ui.host'))}</button>`}</section><section><h2>${e(desktopText('join'))}</h2><label>${e(desktopText('address'))}<input data-lan-address type="text" dir="ltr" inputmode="url" maxlength="200" value="${e(addressDraft)}" placeholder="192.168.1.20:${DEFAULT_LAN_PORT}"></label><p class="muted">${e(desktopText('addressHelp'))}</p><button data-lan-join>${e(t('ui.joinRoom'))}</button></section></div><p data-lan-status role="status" aria-live="polite"></p></section>`;
    host.querySelector<HTMLButtonElement>('[data-lan-back]')!.onclick = () => { if (alive()) { dispose(); back(); } };
    const start = host.querySelector<HTMLButtonElement>('[data-lan-host]');
    if (start)
      start.onclick = () =>
        void (async () => {
          if (!alive() || pending) return;
          pending = true;
          revision++;
          busy();
          try {
            const result = await bridge!.startLan(
              Number(host.querySelector<HTMLInputElement>('[data-lan-port]')!.value),
            );
            if (!alive()) return;
            if (result.ok) {
              state = result.state;
              render();
            } else notice(t(result.key));
          } catch {
            notice(t('ui.errorServer'));
          } finally {
            pending = false;
            busy();
          }
        })();
    const stop = host.querySelector<HTMLButtonElement>('[data-lan-stop]');
    if (stop)
      stop.onclick = () =>
        void (async () => {
          if (!alive() || pending) return;
          pending = true;
          revision++;
          busy();
          try {
            const value = await bridge!.stopLan();
            if (!alive()) return;
            state = value;
            render();
          } catch {
            notice(t('ui.errorServer'));
          } finally {
            pending = false;
            busy();
          }
        })();
    const make = host.querySelector<HTMLButtonElement>('[data-lan-create]');
    if (make) make.onclick = () => { if (alive() && !pending) { dispose(); create('http://127.0.0.1:' + state.port); } };
    host.querySelector<HTMLButtonElement>('[data-lan-join]')!.onclick = () => {
      if (!alive() || pending) return;
      const endpoint = normalizeLanEndpoint(
        host.querySelector<HTMLInputElement>('[data-lan-address]')!.value,
      );
      if (!endpoint) {
        notice(desktopText('addressHelp'));
        return;
      }
      dispose();
      join(endpoint);
    };
    busy();
    if (focus) {
      const input = host.querySelector<HTMLInputElement>(focus.selector);
      input?.focus();
      if (input && focus.start !== null && focus.end !== null) input.setSelectionRange(focus.start, focus.end);
    }
  }
  render();
  const statusRevision = revision;
  void bridge
    .lanStatus()
    .then((value) => {
      if (!alive() || revision !== statusRevision) return;
      state = value;
      render();
    })
    .catch(() => { if (revision === statusRevision) notice(t('ui.errorServer')); });
  return dispose;
}
