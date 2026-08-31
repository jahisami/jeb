class EventBus {
  constructor() {
    this.events = {};
  }

  // Subscribe to an event
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return an unsubscribe function
    return () => this.off(event, callback);
  }

  // Unsubscribe from an event
  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  // Emit an event with optional data
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => callback(data));
  }
}

export const eventBus = new EventBus();
