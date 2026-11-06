import {Client, type SeatReservation, type Room} from '@colyseus/sdk';
import {RequestLifetime, untilAborted} from './request-lifetime.ts';
type StateConstructor<T> = new (...args: any[]) => T;

/** The SDK's HTTP and not-yet-joined sockets share the Session's lifetime. */
export class SessionClient extends Client {
  private readonly pending = new Set<Room>();
  constructor(endpoint: string, private readonly requests: RequestLifetime) {
    super(endpoint, {fetchFn: (input, init) => requests.fetch(input, init)});
  }
  protected override createRoom<T>(name: string, state?: StateConstructor<T>) {
    const room = super.createRoom<T>(name, state);
    this.pending.add(room);
    return room;
  }
  override async consumeSeatReservation<T>(response: SeatReservation, state?: StateConstructor<T>) {
    this.requests.signal.throwIfAborted();
    const signal = AbortSignal.any([this.requests.signal, AbortSignal.timeout(15000)]);
    const joining = super.consumeSeatReservation<T>(response, state);
    const room = [...this.pending].find(room => room.sessionId === response.sessionId);
    const cancel = () => {
      if (!room) return;
      room.reconnection.enabled = false;
      try { room.connection?.close(4000); } catch { /* Already closed or still initializing. */ }
    };
    signal.addEventListener('abort', cancel, {once: true});
    try { return await untilAborted(joining, signal); }
    finally {
      signal.removeEventListener('abort', cancel);
      if (room) this.pending.delete(room);
    }
  }
}
