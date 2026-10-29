import { createServer as createPortHolder } from 'node:net';
import { randomUUID } from 'node:crypto';
import { Client } from '@colyseus/sdk';
import { WorldState } from '../shared/network-state.ts';
import { PROTOCOL, CONTENT_REVISION } from '../shared/protocol.ts';
import { BUILD_AUDIENCE } from '../client/build-audience.ts';
import {
  app,
  BrowserWindow,
  protocol,
  net,
  session,
  ipcMain,
  utilityProcess,
  shell,
} from 'electron';
import { join, dirname, relative, isAbsolute, resolve } from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { networkInterfaces } from 'node:os';
import {
  APP_ORIGIN,
  localDocument,
  staticPath,
  allowedExternal,
  contentSecurityPolicy,
} from './security.ts';
import { validLanPort, privateIPv4, type LanState } from '../shared/lan.ts';
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'grave',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      codeCache: true,
    },
  },
]);
app.enableSandbox();
const root = app.getAppPath();
const smokeArg = process.argv.find((a) => a.startsWith('--smoke-report='));
const smokePath = smokeArg ? resolve(smokeArg.slice('--smoke-report='.length)) : null;
const lanReportArg = process.argv.find((a) => a.startsWith('--lan-report='));
const lanReport = lanReportArg ? resolve(lanReportArg.slice('--lan-report='.length)) : null;
const profileArg = process.argv.find((a) => a.startsWith('--profile-dir='));
if (profileArg) {
  const p = resolve(profileArg.slice('--profile-dir='.length));
  mkdirSync(p, { recursive: true });
  app.setPath('userData', p);
} else if (app.isPackaged) {
  try {
    const p = join(dirname(process.execPath), 'GraveAccordData');
    mkdirSync(p, { recursive: true });
    app.setPath('userData', p);
  } catch {}
}
app.setAppUserModelId('org.graveaccord.game');
let main: BrowserWindow | undefined,
  lan: Electron.UtilityProcess | undefined,
  lanState: LanState = { active: false, port: null, endpoints: [] },
  starting: Promise<LanState> | undefined;
const empty = (): LanState => ({ active: false, port: null, endpoints: [] });
const checkSender = (event: Electron.IpcMainInvokeEvent) => {
  const address = event.senderFrame?.url ?? '';
  if (
    !main ||
    event.sender !== main.webContents ||
    event.senderFrame !== main.webContents.mainFrame ||
    !(localDocument(address) || (smokePath && address === APP_ORIGIN + '/__test__/smoke.html'))
  )
    throw Error('Invalid IPC sender');
};
async function stopLan() {
  const child = lan;
  if (!child) {
    lanState = empty();
    return lanState;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill();
      resolve();
    }, 2500);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.postMessage({ type: 'stop' });
  });
  if (lan === child) lan = undefined;
  lanState = empty();
  return lanState;
}
async function startLan(port: number): Promise<LanState> {
  if (!validLanPort(port)) throw Error('ui.errorPort');
  if (lanState.active) {
    if (port === lanState.port) return structuredClone(lanState);
    throw Error('ui.errorPort');
  }
  if (starting) return starting;
  starting = new Promise<LanState>((resolve, reject) => {
    const child = utilityProcess.fork(join(root, 'lan.cjs'), [String(port)], {
      stdio: 'pipe',
      serviceName: 'Grave Accord LAN',
      env: {
        NODE_ENV: 'production',
        SYSTEMROOT: process.env.SYSTEMROOT ?? '',
        WINDIR: process.env.WINDIR ?? '',
        PATH: process.env.PATH ?? '',
        TEMP: process.env.TEMP ?? '',
        TMP: process.env.TMP ?? '',
      },
    });
    lan = child;
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
    const fail = (key: string) => {
      clearTimeout(timer);
      if (lan === child) {
        lan = undefined;
        lanState = empty();
      }
      child.kill();
      reject(Error(key));
    };
    const timer = setTimeout(() => fail('ui.errorServer'), 12000);
    child.once('exit', () => {
      if (lan === child) {
        lan = undefined;
        lanState = empty();
      }
      clearTimeout(timer);
      reject(Error('ui.errorServer'));
    });
    child.on('message', (message: { type?: string; key?: string }) => {
      if (message.type === 'error') {
        fail(message.key === 'ui.errorPort' ? 'ui.errorPort' : 'ui.errorServer');
        return;
      }
      if (message.type !== 'ready') return;
      clearTimeout(timer);
      const addresses = new Set<string>(['127.0.0.1']);
      for (const values of Object.values(networkInterfaces()))
        for (const value of values ?? [])
          if (value.family === 'IPv4' && !value.internal && privateIPv4(value.address))
            addresses.add(value.address);
      lanState = {
        active: true,
        port,
        endpoints: [...addresses].map((a) => 'http://' + a + ':' + port),
      };
      resolve(structuredClone(lanState));
    });
  }).finally(() => {
    starting = undefined;
  });
  return starting;
}
ipcMain.handle('grave:lan-status', (event) => {
  checkSender(event);
  return structuredClone(lanState);
});
ipcMain.handle('grave:lan-start', async (event, port: unknown) => {
  checkSender(event);
  if (!validLanPort(port)) return { ok: false, key: 'ui.errorPort' };
  try {
    return { ok: true, state: await startLan(port) };
  } catch (error) {
    return {
      ok: false,
      key:
        error instanceof Error && error.message === 'ui.errorPort'
          ? 'ui.errorPort'
          : 'ui.errorServer',
    };
  }
});
ipcMain.handle('grave:lan-stop', (event) => {
  checkSender(event);
  return stopLan();
});
app
  .whenReady()
  .then(async () => {
    if (lanReport) {
      const rooms: import('@colyseus/sdk').Room<WorldState>[] = [];
      let holder: ReturnType<typeof createPortHolder> | undefined;
      try {
        holder = createPortHolder();
        await new Promise<void>((r) => holder!.listen(0, '0.0.0.0', () => r()));
        const address = holder.address();
        if (!address || typeof address === 'string') throw Error('No fixture port');
        let occupied = false;
        try {
          await startLan(address.port);
        } catch (error) {
          occupied = error instanceof Error && error.message === 'ui.errorPort';
        }
        if (!occupied || !holder.listening) throw Error('Occupied port was not preserved');
        await new Promise<void>((r) => holder!.close(() => r()));
        holder = undefined;
        const state = await startLan(address.port),
          endpoint = 'http://127.0.0.1:' + address.port;
        const health = await (await fetch(endpoint + '/api/health')).json();
        if (health.protocolVersion !== PROTOCOL || health.contentRevision !== CONTENT_REVISION || health.audience !== BUILD_AUDIENCE)
          throw Error('LAN protocol, content or audience mismatch');
        const client = new Client(endpoint),
          settings = {
            protocolVersion: PROTOCOL,
            contentRevision: CONTENT_REVISION,
            createKey: randomUUID(),
            name: 'Native LAN tester',
            classId: 'soldier',
            mode: 'short',
            difficulty: 'hard',
            visibility: 'public',
          };
        const host = await client.create<WorldState>('grave', settings, WorldState);
        rooms.push(host);
        host.onMessage('*', () => {});
        host.reconnection.enabled = false;
        const guest = await client.joinById<WorldState>(
          host.roomId,
          { ...settings, classId: 'medic' },
          WorldState,
        );
        rooms.push(guest);
        guest.onMessage('*', () => {});
        guest.reconnection.enabled = false;
        host.send('start');
        const end = Date.now() + 5000;
        while (host.state.phase !== 'combat' || guest.state.phase !== 'combat') {
          if (Date.now() > end) throw Error('Native LAN combat timed out');
          await new Promise((r) => setTimeout(r, 20));
        }
        if (host.state.players.size !== 2 || host.state.bossHealth <= 0)
          throw Error('Native LAN roster');
        await Promise.all(rooms.map((r) => r.leave()));
        rooms.length = 0;
        await stopLan();
        let stopped = false;
        try {
          await fetch(endpoint + '/api/health');
        } catch {
          stopped = true;
        }
        if (!stopped) throw Error('LAN server did not stop');
        writeFileSync(
          lanReport,
          JSON.stringify(
            {
              passed: true,
              electron: process.versions.electron,
              node: process.versions.node,
              protocol: PROTOCOL,
              audience: BUILD_AUDIENCE,
              occupiedPortPreserved: true,
              bundledUtilityAuthority: true,
              realWebSocketClients: 2,
              combatReplicated: true,
              gracefulStop: true,
              addresses: state.endpoints,
              physicalLanReviewed: false,
              renderedReviewed: false,
            },
            null,
            2,
          ) + '\n',
        );
        app.exit(0);
      } catch (error) {
        for (const room of rooms) await room.leave().catch(() => {});
        if (holder) holder.close();
        await stopLan();
        writeFileSync(
          lanReport,
          JSON.stringify(
            {
              passed: false,
              error: String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            null,
            2,
          ) + '\n',
        );
        app.exit(1);
      }
      return;
    }

    const ses = session.defaultSession;
    ses.setPermissionRequestHandler((_wc, _permission, respond) => respond(false));
    const networkAttempts: string[] = [];
    if (smokePath)
      ses.webRequest.onBeforeRequest((details, done) => {
        if (/^(https?|wss?):/.test(details.url)) {
          networkAttempts.push(details.url);
          done({ cancel: true });
        } else done({});
      });
    protocol.handle('grave', async (request) => {
      if (!['GET', 'HEAD'].includes(request.method))
        return new Response('Method not allowed', { status: 405 });
      const client = join(root, 'client');
      let file = staticPath(client, request.url);
      if (smokePath && request.url.startsWith(APP_ORIGIN + '/__test__/'))
        file = staticPath(root, request.url);
      if (!file || !existsSync(file)) return new Response('Not found', { status: 404 });
      const real = realpathSync(file),
        part = relative(smokePath ? root : client, real);
      if (part.startsWith('..') || isAbsolute(part))
        return new Response('Not found', { status: 404 });
      const original = await net.fetch(pathToFileURL(real).href);
      const headers = new Headers(original.headers);
      headers.set('Content-Security-Policy', contentSecurityPolicy);
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(request.method === 'HEAD' ? null : original.body, {
        status: original.status,
        headers,
      });
    });
    main = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 440,
      minHeight: 560,
      show: !smokePath,
      title: 'Grave Accord',
      icon: join(root, 'icon.png'),
      backgroundColor: '#142b25',
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(root, 'preload.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        backgroundThrottling: false,
        additionalArguments: smokePath ? ['--grave-smoke'] : [],
      },
    });
    main.webContents.setWindowOpenHandler(({ url }) => {
      if (allowedExternal(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });
    main.webContents.on('will-navigate', (event, url) => {
      if (!localDocument(url)) event.preventDefault();
    });
    main.webContents.on('will-attach-webview', (event) => event.preventDefault());
    if (smokePath) {
      const timeout = setTimeout(() => {
        writeFileSync(
          smokePath,
          JSON.stringify(
            { passed: false, error: 'Desktop smoke timed out', networkAttempts },
            null,
            2,
          ),
        );
        app.exit(1);
      }, 90000);
      ipcMain.handle('grave:smoke', (event, result: unknown) => {
        checkSender(event);
        clearTimeout(timeout);
        const value = result && typeof result === 'object' ? result : { passed: false };
        writeFileSync(
          smokePath,
          JSON.stringify(
            {
              electron: process.versions.electron,
              node: process.versions.node,
              chrome: process.versions.chrome,
              ...value,
              networkAttempts,
              lanStarted: lanState.active,
            },
            null,
            2,
          ) + '\n',
        );
        setImmediate(() =>
          app.exit(
            (value as { passed?: boolean }).passed &&
              networkAttempts.length === 0 &&
              !lanState.active
              ? 0
              : 1,
          ),
        );
        return true;
      });
      await main.loadURL(APP_ORIGIN + '/__test__/smoke.html');
    } else await main.loadURL(APP_ORIGIN + '/index.html');
  })
  .catch((error) => {
    if (smokePath)
      writeFileSync(smokePath, JSON.stringify({ passed: false, error: String(error) }, null, 2));
    app.exit(1);
  });
let quitting = false;
app.on('before-quit', (event) => {
  if (lan && !quitting) {
    event.preventDefault();
    quitting = true;
    void stopLan().finally(() => app.quit());
  }
});
app.on('window-all-closed', () => app.quit());
