// A room's own player limit is separate from the process-wide reserved-slot limit.
import { randomUUID } from 'node:crypto';
type Admission = {
  id: string;
  kind: 'create' | 'join';
  state: 'waiting' | 'ready';
  expiresAt: number;
};
export class Capacity {
  readonly slots = new Set<string>();
  readonly rooms = new Set<string>();
  private admissions = new Map<string, Admission>();
  constructor(
    readonly limit = 50,
    readonly roomLimit = 4,
    readonly now = Date.now,
  ) {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 10000 ||
      !Number.isSafeInteger(roomLimit) ||
      roomLimit < 1 ||
      roomLimit > 1000
    )
      throw Error('Invalid instance capacity');
  }
  private pump(now = this.now()) {
    for (const [id, ticket] of this.admissions)
      if (ticket.expiresAt <= now) this.admissions.delete(id);
    let slots = this.slots.size,
      rooms = this.rooms.size;
    for (const ticket of this.admissions.values())
      if (ticket.state === 'ready') {
        slots++;
        if (ticket.kind === 'create') rooms++;
      }
    for (const ticket of this.admissions.values()) {
      if (ticket.state === 'ready') continue;
      if (slots >= this.limit) break;
      if (ticket.kind === 'create' && rooms >= this.roomLimit) continue;
      ticket.state = 'ready';
      ticket.expiresAt = now + 15000;
      slots++;
      if (ticket.kind === 'create') rooms++;
    }
  }
  enqueue(kind: 'create' | 'join', now = this.now()) {
    this.pump(now);
    if (this.admissions.size >= 128) throw Error('queueFull');
    const ticket: Admission = { id: randomUUID(), kind, state: 'waiting', expiresAt: now + 30000 };
    this.admissions.set(ticket.id, ticket);
    this.pump(now);
    return this.admission(ticket.id, now)!;
  }
  admission(id: string, now = this.now()) {
    this.pump(now);
    const ticket = this.admissions.get(id);
    if (!ticket) return null;
    if (ticket.state === 'waiting') ticket.expiresAt = now + 30000;
    const position =
      ticket.state === 'ready'
        ? 0
        : [...this.admissions.values()]
            .filter((t) => t.state === 'waiting')
            .findIndex((t) => t.id === id) + 1;
    return { ...ticket, position, retryAfterSeconds: 1 };
  }
  cancelAdmission(id: string) {
    this.admissions.delete(id);
    this.pump();
  }
  private permit(id?: string) {
    this.pump();
    const ticket = id ? this.admissions.get(id) : undefined;
    if (id && (!ticket || ticket.state !== 'ready')) throw Error('capacity');
    return ticket;
  }
  addRoom(id: string, admissionId?: string) {
    const own = this.permit(admissionId);
    if (own && own.kind !== 'create') throw Error('capacity');
    const held = [...this.admissions.values()].filter(
      (t) => t.state === 'ready' && t.kind === 'create' && t !== own,
    ).length;
    if (this.rooms.size + held >= this.roomLimit) throw Error('capacity');
    this.rooms.add(id);
  }
  reserve(id: string, admissionId?: string) {
    if (this.slots.has(id)) return;
    const own = this.permit(admissionId);
    const held = [...this.admissions.values()].filter(
      (t) => t.state === 'ready' && t !== own,
    ).length;
    if (this.slots.size + held >= this.limit) throw Error('capacity');
    this.slots.add(id);
    if (own) this.admissions.delete(own.id);
    this.pump();
  }
  release(id: string) {
    this.slots.delete(id);
    this.pump();
  }
  removeRoom(id: string) {
    this.rooms.delete(id);
    this.pump();
  }
  summary() {
    this.pump();
    const held = [...this.admissions.values()].filter((t) => t.state === 'ready');
    const canJoin = this.slots.size + held.length < this.limit;
    const canCreate =
      canJoin && this.rooms.size + held.filter((t) => t.kind === 'create').length < this.roomLimit;
    return {
      reservedSlots: this.slots.size,
      instanceLimit: this.limit,
      rooms: this.rooms.size,
      roomLimit: this.roomLimit,
      available: canCreate,
      canJoin,
      canCreate,
      queued: this.admissions.size - held.length,
      offeredSlots: held.length,
    };
  }
}
export const capacity = new Capacity(
  Number(process.env.INSTANCE_PLAYER_LIMIT ?? 50),
  Number(process.env.INSTANCE_ROOM_LIMIT ?? 4),
);
