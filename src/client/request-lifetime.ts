/** Settle a pending operation when its owner is closed, including non-fetch work. */
export function untilAborted<T>(value: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    const cleanup = () => signal.removeEventListener('abort', cancel);
    Promise.resolve(value).then(
      result => { cleanup(); signal.aborted ? reject(signal.reason) : resolve(result); },
      error => { cleanup(); reject(error); },
    );
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, {once: true});
  });
}

/** Fetches and retry delays belong to the screen/session that started them. */
export class RequestLifetime {
  private readonly controller = new AbortController();
  get signal() { return this.controller.signal; }
  cancel() { this.controller.abort(new DOMException('ui.errorNetwork', 'AbortError')); }
  fetch(input: RequestInfo | URL, init: RequestInit = {}, timeout = 10000) {
    this.signal.throwIfAborted();
    const signals = [this.signal, AbortSignal.timeout(timeout)];
    if (init.signal) signals.push(init.signal);
    return fetch(input, {...init, signal: AbortSignal.any(signals)});
  }
  wait(ms: number): Promise<void> {
    this.signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const cancel = () => { clearTimeout(timer); reject(this.signal.reason); };
      const timer = setTimeout(() => { this.signal.removeEventListener('abort', cancel); resolve(); }, ms);
      this.signal.addEventListener('abort', cancel, {once: true});
    });
  }
}
