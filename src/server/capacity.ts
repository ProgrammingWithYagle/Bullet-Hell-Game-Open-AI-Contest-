// A room's own player limit is separate from the process-wide reserved-slot limit.
export class Capacity {
  readonly slots = new Set<string>();
  readonly rooms = new Set<string>();
  constructor(
    readonly limit = 50,
    readonly roomLimit = 4,
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
  addRoom(id: string) {
    if (this.rooms.size >= this.roomLimit) throw Error('capacity');
    this.rooms.add(id);
  }
  reserve(id: string) {
    if (this.slots.has(id)) return;
    if (this.slots.size >= this.limit) throw Error('capacity');
    this.slots.add(id);
  }
  release(id: string) {
    this.slots.delete(id);
  }
  removeRoom(id: string) {
    this.rooms.delete(id);
  }
  summary() {
    return {
      reservedSlots: this.slots.size,
      instanceLimit: this.limit,
      rooms: this.rooms.size,
      roomLimit: this.roomLimit,
      available: this.slots.size < this.limit && this.rooms.size < this.roomLimit,
    };
  }
}
export const capacity = new Capacity(
  Number(process.env.INSTANCE_PLAYER_LIMIT ?? 50),
  Number(process.env.INSTANCE_ROOM_LIMIT ?? 4),
);
