# routebus

[![npm version](https://badge.fury.io/js/routebus.svg)](https://www.npmjs.com/package/routebus)
[![CI](https://github.com/Cr0wn-Gh0ul/RouteBus/actions/workflows/ci.yml/badge.svg)](https://github.com/Cr0wn-Gh0ul/RouteBus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A type-safe event bus for TypeScript with pluggable transports.**

Start with in-memory events, scale to cross-tab sync, or go distributed with Redis—without rewriting your code.

## ✨ Features

- **Full TypeScript type safety** — Generic constraints ensure event names and payloads match
- **Pluggable transports** — In-memory, BroadcastChannel, Redis, or write your own
- **Event queue** — Batch processing with custom drain logic
- **Zero runtime dependencies** — Keep your bundle small
- **Universal** — Works in browsers and Node.js
- **Tree-shakeable** — Import only what you need


## 📦 Installation

```bash
npm install routebus
```


## 🚀 Quick Start

### In-Memory (Default)

```typescript
import { createRouteBus } from 'routebus';

type AppEvents = {
  "chat:message": { id: string; text: string; from: string };
  "user:login": { userId: string };
};

const bus = createRouteBus<AppEvents>();

// Subscribe to events
const unsubscribe = bus.on("chat:message", (payload) => {
  console.log(`${payload.from}: ${payload.text}`);
});

// Emit events
bus.emit("chat:message", {
  id: "1",
  text: "Hello!",
  from: "Alice"
});

unsubscribe();
```

> TypeScript autocompletes event names and validates payloads at compile time. Try to emit an event with the wrong payload type—you'll get a compile error.

### Cross-Tab Sync

Need to sync state across browser tabs? Use the BroadcastChannel transport:

```typescript
import { createRouteBus, createBroadcastChannelTransport } from 'routebus';

const bus = createRouteBus<AppEvents>({
  transport: createBroadcastChannelTransport<AppEvents>({
    channelName: 'my-app-events',
  }),
});

// Now when one tab emits an event, all tabs receive it
bus.on("counter:update", (payload) => {
  updateUICounter(payload.value);
});

bus.emit("counter:update", { value: 42 });
```

Events emitted in one tab are received by all other tabs automatically.

### Distributed with Redis

For microservices or multi-server setups, the Redis transport syncs events across processes:

```typescript
import { createRouteBus, createRedisTransport } from 'routebus';
import Redis from 'ioredis';

const redis = new Redis();

const bus = createRouteBus<AppEvents>({
  transport: createRedisTransport<AppEvents>({
    redisClient: redis,
    channelPrefix: 'myapp:',
  }),
});

// Events now work across all connected processes
bus.on("task:created", (payload) => {
  processTask(payload);
});
```

Events now propagate across all connected processes.

## 📚 API

<details>
<summary><strong>Core Methods</strong></summary>

### `createRouteBus<EventMap>(options?)`

Creates a new event bus.

```typescript
type MyEvents = {
  "data:update": { id: string; value: number };
};

const bus = createRouteBus<MyEvents>();

// Or with a custom transport
const bus = createRouteBus<MyEvents>({
  transport: createBroadcastChannelTransport({ channelName: 'my-channel' }),
});
```

### `on(event, handler) => unsubscribe`

Registers a listener. Returns a function to unsubscribe.

```typescript
const unsubscribe = bus.on("data:update", (payload) => {
  console.log(payload.id, payload.value);
});

unsubscribe(); // Remove the listener
```

### `once(event, handler) => unsubscribe`

Like `on()`, but automatically unsubscribes after the first call.

```typescript
bus.once("user:login", (payload) => {
  console.log("First login:", payload.userId);
});
```

### `off(event, handler)`

Removes a specific handler. The handler must be the same reference you passed to `on()`.

```typescript
const handler = (payload) => console.log(payload);

bus.on("event", handler);
bus.off("event", handler);
```

### `emit(event, payload)`

Calls all registered listeners synchronously.

```typescript
bus.emit("data:update", { id: "123", value: 42 });
```

### `enqueue(event, payload)`

Adds an event to the queue without emitting it.

```typescript
bus.enqueue("task:process", { id: 1 });
bus.enqueue("task:process", { id: 2 });
```

### `drain(processor?)`

Processes all queued events. By default, calls `emit()` for each queued event. You can pass a custom processor function.

```typescript
bus.drain(); // Emits all queued events

// Or with custom processing
bus.drain((event, payload) => {
  logger.log(event, payload);
  bus.emit(event, payload);
});
```

### `clear()`

Removes all listeners and closes the transport.

```typescript
bus.clear();
```

</details>


## 🔌 Transports

Choose how events flow through your system.

| Transport | Use Case | Scope |
|-----------|----------|-------|
| **In-Memory** | Single process apps | Local |
| **BroadcastChannel** | Browser tabs sync | Same origin |
| **Redis** | Microservices | Distributed |

### 💾 In-Memory

Default transport. Events stay in the current process.

```typescript
const bus = createRouteBus<AppEvents>();
// or explicitly:
const bus = createRouteBus<AppEvents>({
  transport: createInMemoryTransport<AppEvents>(),
});
```

### 📡 BroadcastChannel

Cross-tab sync in browsers. Events propagate to all tabs of the same origin.

```typescript
const bus = createRouteBus<AppEvents>({
  transport: createBroadcastChannelTransport<AppEvents>({
    channelName: 'my-app-events',
  }),
});
```

### 🗄️ Redis

Distributed pub/sub for microservices and multi-server setups.

```typescript
import Redis from 'ioredis';

const redis = new Redis();

const bus = createRouteBus<AppEvents>({
  transport: createRedisTransport<AppEvents>({
    redisClient: redis,
    channelPrefix: 'myapp:', // optional
  }),
});
```

Compatible with `ioredis` and `redis` (v4+).

### ⚙️ Custom

Implement the `Transport` interface:

```typescript
import type { Transport, EventHandler } from 'routebus';

function createMyTransport<T extends Record<string, any>>(): Transport<T> {
  return {
    async publish<K extends keyof T>(event: K, payload: T[K]) {
      // Send the event somewhere
    },
    
    subscribe<K extends keyof T>(event: K, handler: EventHandler<T[K]>) {
      // Listen for events
      // Return an unsubscribe function
      return () => {
        // Cleanup
      };
    },
    
    close() {
      // Optional cleanup
    },
  };
}
```

---

## 💡 Usage Patterns

### Multiple Handlers

```typescript
bus.on("user:login", (p) => auditLog.record(p));
bus.on("user:login", (p) => analytics.track(p));
bus.on("user:login", (p) => sendWelcomeEmail(p));

bus.emit("user:login", { userId: "alice" }); // All three handlers fire
```

### Batch Processing

```typescript
for (const item of largeDataset) {
  bus.enqueue("data:process", item);
}

// Process in batches
bus.drain((event, payload) => {
  database.insert(payload);
});
```

### Custom Drain Logic

```typescript
bus.drain((event, payload) => {
  // Log everything
  logger.info(`Processing ${String(event)}`, payload);
  
  // Then emit normally
  bus.emit(event as any, payload);
});
```

### Self-Unsubscribing Handlers

```typescript
const handler = (payload) => {
  if (payload.shouldStop) {
    bus.off("event", handler);
  }
};

bus.on("event", handler);
```

## 🔒 Type Safety

TypeScript enforces event names and payload types at compile time:

```typescript
type Events = {
  "save": { id: string };
};

const bus = createRouteBus<Events>();

bus.emit("save", { id: "123" }); // ✓
bus.emit("save", { id: 123 });   // ✗ Error: id must be string
bus.emit("load", { id: "123" }); // ✗ Error: "load" is not a valid event
```

Event names autocomplete in your editor. Invalid payloads fail at compile time, not runtime.

## 📖 Examples

Check out `examples/` for runnable code:

- `simple.ts` - Basic usage
- `basic.ts` - All features
- `type-safety.ts` - TypeScript examples
- `in-memory-transport.ts` - Game simulation
- `broadcast-channel-transport.ts` - Cross-tab sync
- `redis-transport.ts` - Distributed setup

```bash
npm run build
npm run build:examples
node dist-examples/examples/in-memory-transport.js
```

## 🛠️ Development

```bash
npm install
npm run build
npm test
```

## License

MIT
