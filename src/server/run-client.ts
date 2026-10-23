import { signedRunHeaders, RUN_BODY_LIMIT, RunRequestError, readRunBody } from './run-auth.ts';
import type { LifecycleEvent, RunStore } from './run-store.ts';
export class RunServiceClient {
  constructor(
    private endpoint: string,
    private serverId: string,
    private key: Uint8Array,
    private serviceAccess?: { origin: string; token: string },
    private keyId = serverId,
  ) {
    const url = new URL(endpoint);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
    )
      throw Error('invalidRunServiceUrl');
    if (serviceAccess && url.origin !== serviceAccess.origin)
      throw Error('serviceAccessOriginMismatch');
    this.endpoint = endpoint.replace(/\/$/, '');
  }
  private async post(path: string, input: unknown) {
    const body = Buffer.from(JSON.stringify(input), 'utf8');
    if (body.byteLength > RUN_BODY_LIMIT) throw Error('runBodyTooLarge');
    const headers: Record<string, string> = signedRunHeaders(
      path,
      body,
      this.serverId,
      this.key,
      Date.now(),
      undefined,
      this.keyId,
    );
    if (this.serviceAccess)
      headers['OAI-Sites-Authorization'] = 'Bearer ' + this.serviceAccess.token;
    const response = await fetch(this.endpoint + path, {
      method: 'POST',
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    // Read through the same streaming bound as incoming service requests.
    const bytes = await readRunBody(
      new Request('https://local.invalid/response', {
        method: 'POST',
        body: response.body,
        duplex: 'half',
      } as RequestInit),
    );
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!response.ok)
      throw new RunRequestError(
        response.status,
        typeof value?.error === 'string' ? value.error : 'runServiceError',
      );
    return value;
  }
  register(input: Parameters<RunStore['register']>[0]) {
    return this.post('/v1/runs/register', input);
  }
  apply(input: LifecycleEvent) {
    return this.post('/v1/runs/event', input);
  }
  lookup(runId: string) {
    return this.post('/v1/runs/lookup', { runId });
  }
}
