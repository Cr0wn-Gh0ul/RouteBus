import type { Transport, EventHandler } from '../transport.js';

/**
 * Minimal Redis client interface. Compatible with ioredis and node-redis.
 */
export interface RedisLike {
  publish(channel: string, message: string): Promise<number> | number;
  subscribe(channel: string): Promise<void> | void;
  on(event: 'message', handler: (channel: string, message: string) => void): void;
  unsubscribe?(channel: string): Promise<void> | void;
  quit?(): Promise<void> | void;
}

export interface RedisTransportOptions {
  prefix?: string;
}

interface RedisMessage<TEventMap extends Record<string, any>> {
  event: keyof TEventMap;
  payload: TEventMap[keyof TEventMap];
}

/**
 * Distributed transport using Redis pub/sub.
 * Syncs events across processes or servers.
 */
export function createRedisTransport<TEventMap extends Record<string, any>>(
  redis: RedisLike,
  options?: RedisTransportOptions
): Transport<TEventMap> {
  const prefix = options?.prefix || 'routebus';
  const listeners = new Map<keyof TEventMap, Set<EventHandler<any>>>();
  const subscribedChannels = new Set<string>();

  const getChannelName = (event: keyof TEventMap): string => {
    return `${prefix}:${String(event)}`;
  };

  redis.on('message', (_channel: string, message: string) => {
    try {
      const data = JSON.parse(message) as RedisMessage<TEventMap>;
      const handlers = listeners.get(data.event);

      if (handlers) {
        const handlersCopy = Array.from(handlers);
        for (const handler of handlersCopy) {
          handler(data.payload);
        }
      }
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  });

  return {
    async publish<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): Promise<void> {
      const channel = getChannelName(event);
      const message: RedisMessage<TEventMap> = { event, payload };
      const json = JSON.stringify(message);

      await Promise.resolve(redis.publish(channel, json));
    },

    subscribe<K extends keyof TEventMap>(
      event: K,
      handler: EventHandler<TEventMap[K]>
    ): () => void {
      const channel = getChannelName(event);

      if (!subscribedChannels.has(channel)) {
        Promise.resolve(redis.subscribe(channel));
        subscribedChannels.add(channel);
      }

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
            
            if (redis.unsubscribe) {
              Promise.resolve(redis.unsubscribe(channel));
            }
            subscribedChannels.delete(channel);
          }
        }
      };
    },

    async close(): Promise<void> {
      listeners.clear();
      subscribedChannels.clear();
      
      if (redis.quit) {
        await Promise.resolve(redis.quit());
      }
    }
  };
}
