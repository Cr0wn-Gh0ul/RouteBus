import type { Transport, EventHandler } from '../transport.js';

export interface BroadcastChannelTransportOptions {
  channelName?: string;
}

interface BroadcastMessage<TEventMap extends Record<string, any>> {
  event: keyof TEventMap;
  payload: TEventMap[keyof TEventMap];
}

/**
 * Cross-tab transport using BroadcastChannel API.
 * Only works in browsers. Events are synced across all tabs of the same origin.
 */
export function createBroadcastChannelTransport<TEventMap extends Record<string, any>>(
  options?: BroadcastChannelTransportOptions
): Transport<TEventMap> {
  const channelName = options?.channelName || 'routebus';

  if (typeof BroadcastChannel === 'undefined') {
    throw new Error('BroadcastChannel not available. Use createInMemoryTransport() instead.');
  }

  const channel = new BroadcastChannel(channelName);
  const listeners = new Map<keyof TEventMap, Set<EventHandler<any>>>();

  channel.onmessage = (event: MessageEvent) => {
    const { event: eventName, payload } = event.data as BroadcastMessage<TEventMap>;
    const handlers = listeners.get(eventName);
    
    if (handlers) {
      const handlersCopy = Array.from(handlers);
      for (const handler of handlersCopy) {
        handler(payload);
      }
    }
  };

  return {
    async publish<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): Promise<void> {
      channel.postMessage({ event, payload } as BroadcastMessage<TEventMap>);

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
      channel.close();
    }
  };
}
