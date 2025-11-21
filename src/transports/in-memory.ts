import type { Transport, EventHandler } from '../transport.js';

/**
 * In-memory transport. Events are delivered synchronously within the same process.
 */
export function createInMemoryTransport<TEventMap extends Record<string, any>>(): Transport<TEventMap> {
  const listeners = new Map<keyof TEventMap, Set<EventHandler<any>>>();

  return {
    async publish<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): Promise<void> {
      const handlers = listeners.get(event);
      if (handlers) {
        const handlersCopy = Array.from(handlers);
        for (const handler of handlersCopy) {
          handler(payload);
        }
      }
    },

    subscribe<K extends keyof TEventMap>(
      event: K,
      handler: EventHandler<TEventMap[K]>
    ): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);

      return () => {
        const handlers = listeners.get(event);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            listeners.delete(event);
          }
        }
      };
    },

    close(): void {
      listeners.clear();
    }
  };
}
