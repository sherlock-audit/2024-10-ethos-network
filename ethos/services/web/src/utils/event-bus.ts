import EventEmitter from 'eventemitter3';

export type Event =
  | 'REVIEW_ADDED'
  | 'INVITATION_ADDED'
  | 'INVITATION_REVOKED'
  | 'PROFILE_CREATED'
  | 'ATTESTATIONS_UPDATED'
  | 'SCORE_UPDATED';

class EventBus {
  private readonly eventBus: EventEmitter;

  constructor() {
    this.eventBus = new EventEmitter();
  }

  // Emit an event with a payload
  emit(event: Event, payload?: any) {
    this.eventBus.emit(event, payload);
  }

  // Register a listener for an event
  on(event: Event, callback: EventEmitter.ListenerFn) {
    this.eventBus.on(event, callback);
  }

  // Remove a listener for an event
  off(event: Event, callback: EventEmitter.ListenerFn) {
    this.eventBus.off(event, callback);
  }
}

export const eventBus = new EventBus();
