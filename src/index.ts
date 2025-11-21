import type { Transport } from './transport.js';
import { createInMemoryTransport } from './transports/in-memory.js';

// Transport exports
export type { Transport, EventHandler as TransportEventHandler } from './transport.js';
export { createInMemoryTransport } from './transports/in-memory.js';
export { createBroadcastChannelTransport, type BroadcastChannelTransportOptions } from './transports/broadcast-channel.js';
export { createRedisTransport, type RedisLike, type RedisTransportOptions } from './transports/redis.js';

// Maps event names to their payload types
export type EventMap = Record<string, any>;

export type EventHandler<T> = (payload: T) => void;

export type Unsubscribe = () => void;

interface QueuedEvent<TEventMap extends EventMap> {
  event: keyof TEventMap;
  payload: TEventMap[keyof TEventMap];
}

export interface RouteBus<TEventMap extends EventMap> {
  on<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): Unsubscribe;

  once<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): Unsubscribe;

  off<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): void;

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void;

  clear(): void;

  enqueue<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void;

  drain(
    processor?: (
      event: keyof TEventMap,
      payload: TEventMap[keyof TEventMap]
    ) => void
  ): void;
}

// Extract EventMap type from a RouteBus instance
export type EventMapOf<TBus> = TBus extends RouteBus<infer TEventMap>
  ? TEventMap
  : never;

export interface RouteBusOptions<TEventMap extends EventMap> {
  transport?: Transport<TEventMap>;
}

/**
 * Creates a type-safe event bus.
 * 
 * @example
 * type AppEvents = {
 *   "user:login": { userId: string };
 * };
 * 
 * const bus = createRouteBus<AppEvents>();
 * bus.on("user:login", ({ userId }) => console.log(userId));
 * bus.emit("user:login", { userId: "alice" });
 */
export function createRouteBus<TEventMap extends EventMap>(
  options?: RouteBusOptions<TEventMap>
): RouteBus<TEventMap> {
  const transport = options?.transport ?? createInMemoryTransport<TEventMap>();
  const queue: QueuedEvent<TEventMap>[] = [];
  
  // Track unsubscribe functions to support off() with any transport
  const unsubscribeFunctions = new Map<string, Map<EventHandler<any>, () => void>>();
  const getEventKey = (event: keyof TEventMap): string => String(event);

  const on = <K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): Unsubscribe => {
    const unsubscribe = transport.subscribe(event, handler);
    
    const eventKey = getEventKey(event);
    if (!unsubscribeFunctions.has(eventKey)) {
      unsubscribeFunctions.set(eventKey, new Map());
    }
    unsubscribeFunctions.get(eventKey)!.set(handler, unsubscribe);
    
    return () => {
      unsubscribe();
      const eventHandlers = unsubscribeFunctions.get(eventKey);
      if (eventHandlers) {
        eventHandlers.delete(handler);
        if (eventHandlers.size === 0) {
          unsubscribeFunctions.delete(eventKey);
        }
      }
    };
  };

  const once = <K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): Unsubscribe => {
    let unsubscribe: Unsubscribe | null = null;
    
    const wrappedHandler = (payload: TEventMap[K]) => {
      handler(payload);
      if (unsubscribe) {
        unsubscribe();
      }
    };

    unsubscribe = on(event, wrappedHandler as EventHandler<TEventMap[K]>);
    return unsubscribe;
  };

  const off = <K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): void => {
    const eventKey = getEventKey(event);
    const eventHandlers = unsubscribeFunctions.get(eventKey);
    
    if (eventHandlers) {
      const unsubscribe = eventHandlers.get(handler);
      if (unsubscribe) {
        unsubscribe();
        eventHandlers.delete(handler);
        if (eventHandlers.size === 0) {
          unsubscribeFunctions.delete(eventKey);
        }
      }
    }
  };

  const emit = <K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K]
  ): void => {
    transport.publish(event, payload).catch((error) => {
      console.error('Error publishing event:', error);
    });
  };

  const clear = (): void => {
    queue.length = 0;
    
    for (const eventHandlers of unsubscribeFunctions.values()) {
      for (const unsubscribe of eventHandlers.values()) {
        unsubscribe();
      }
    }
    unsubscribeFunctions.clear();
    
    if (transport.close) {
      const result = transport.close();
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('Error closing transport:', error);
        });
      }
    }
  };

  const enqueue = <K extends keyof TEventMap>(
    event: K,
    payload: TEventMap[K]
  ): void => {
    queue.push({ event, payload });
  };

  const drain = (
    processor?: (
      event: keyof TEventMap,
      payload: TEventMap[keyof TEventMap]
    ) => void
  ): void => {
    const defaultProcessor = (
      event: keyof TEventMap,
      payload: TEventMap[keyof TEventMap]
    ) => {
      emit(event as any, payload as any);
    };

    const proc = processor || defaultProcessor;

    while (queue.length > 0) {
      const item = queue.shift()!;
      proc(item.event, item.payload);
    }
  };

  return {
    on,
    once,
    off,
    emit,
    clear,
    enqueue,
    drain,
  };
}
