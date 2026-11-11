// Bus d'événements minimal : les systèmes communiquent sans se connaître.
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) fn(data);
  }
}

export const bus = new EventBus();
