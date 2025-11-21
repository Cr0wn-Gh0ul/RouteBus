/**
 * Transport interface for event delivery.
 * Implementations can use different backends (in-memory, Redis, BroadcastChannel, etc.)
 */
export interface Transport<TEventMap extends Record<string, any>> {
  publish<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): Promise<void>;

  subscribe<K extends keyof TEventMap>(
    event: K,
    handler: (payload: TEventMap[K]) => void
  ): () => void;

  close?(): Promise<void> | void;
}

export type EventHandler<T> = (payload: T) => void;
