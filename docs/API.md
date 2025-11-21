# routebus API Documentation

> **Version:** 1.0.0  
> **Auto-generated from JSDoc comments**

## Table of Contents

- [Types](#types)
  - [EventMap](#eventmap)
  - [EventHandler](#eventhandler)
  - [Unsubscribe](#unsubscribe)
  - [EventMapOf](#eventmapof)
- [Interfaces](#interfaces)
  - [RouteBus](#routebus)
- [Functions](#functions)
  - [createRouteBus](#createroutebus)

---

## Types

### EventMap

Type representing a map of event names to their payload types.

**Type:** `Record<string, any>`

**Example:**
```typescript
type MyEvents = {
  "user:login": { userId: string; timestamp: Date };
  "user:logout": { userId: string };
  "data:update": { id: string; data: any };
};
```

---

### EventHandler\<T\>

Handler function type for a specific event.

**Type:** `(payload: T) => void`

**Template Parameters:**
- `T` - The payload type for this event

**Parameters:**
- `payload` (`T`) - The event payload

**Returns:** `void`

**Example:**
```typescript
const handler: EventHandler<{ userId: string }> = (payload) => {
  console.log(`User ${payload.userId} logged in`);
};
```

---

### Unsubscribe

Unsubscribe function returned by `on()` and `once()` methods.
Call this function to remove the event listener.

**Type:** `() => void`

**Returns:** `void`

**Example:**
```typescript
const unsubscribe = bus.on("event", handler);
// Later...
unsubscribe(); // Removes the listener
```

---

### EventMapOf\<TBus\>

Utility type to extract the EventMap from a RouteBus instance.
Useful for deriving types from an existing bus.

**Template Parameters:**
- `TBus` - The RouteBus instance type

**Example:**
```typescript
const bus = createRouteBus<{ "event": { value: number } }>();
type Events = EventMapOf<typeof bus>; // { "event": { value: number } }

const handler: (payload: Events["event"]) => void = (payload) => {
  console.log(payload.value);
};
```

---

## Interfaces

### RouteBus\<TEventMap\>

RouteBus interface with all methods for event handling and queue management.

**Template Parameters:**
- `TEventMap` - The event map defining event names and their payload types

**Example:**
```typescript
type AppEvents = {
  "message": { text: string };
};

const bus: RouteBus<AppEvents> = createRouteBus<AppEvents>();
bus.on("message", (payload) => console.log(payload.text));
bus.emit("message", { text: "Hello" });
```

#### Methods

##### on\<K\>(event, handler)

Register an event listener that will be called whenever the event is emitted.

**Template Parameters:**
- `K` - The event name (must be a key of TEventMap)

**Parameters:**
- `event` (`K`) - The event name to listen for
- `handler` (`EventHandler<TEventMap[K]>`) - The handler function to call when the event is emitted

**Returns:** `Unsubscribe` - A function that when called, unsubscribes the handler

**Example:**
```typescript
const unsubscribe = bus.on("user:login", (payload) => {
  console.log(`User ${payload.userId} logged in`);
});

// Later, to unsubscribe:
unsubscribe();
```

---

##### once\<K\>(event, handler)

Register a one-time event listener that automatically unsubscribes after the first call.

**Template Parameters:**
- `K` - The event name (must be a key of TEventMap)

**Parameters:**
- `event` (`K`) - The event name to listen for
- `handler` (`EventHandler<TEventMap[K]>`) - The handler function to call once when the event is emitted

**Returns:** `Unsubscribe` - A function that when called, cancels the one-time listener (if not yet triggered)

**Example:**
```typescript
bus.once("config:loaded", (config) => {
  console.log("Config loaded:", config);
});

bus.emit("config:loaded", { theme: "dark" }); // Logs
bus.emit("config:loaded", { theme: "light" }); // Doesn't log
```

---

##### off\<K\>(event, handler)

Remove a specific event handler from an event.

**Template Parameters:**
- `K` - The event name (must be a key of TEventMap)

**Parameters:**
- `event` (`K`) - The event name
- `handler` (`EventHandler<TEventMap[K]>`) - The handler function to remove (must be the same reference)

**Returns:** `void`

**Example:**
```typescript
const handler = (payload) => console.log(payload);
bus.on("event", handler);
bus.off("event", handler); // Removes the specific handler
```

---

##### emit\<K\>(event, payload)

Emit an event to all registered listeners synchronously.
All handlers for this event will be called immediately in the order they were registered.

**Template Parameters:**
- `K` - The event name (must be a key of TEventMap)

**Parameters:**
- `event` (`K`) - The event name to emit
- `payload` (`TEventMap[K]`) - The event payload (must match the type defined in TEventMap)

**Returns:** `void`

**Example:**
```typescript
bus.emit("user:login", { userId: "alice123" });
bus.emit("chat:message", { id: "1", text: "Hello", from: "Alice" });
```

---

##### clear()

Remove all listeners for all events.
This clears the entire event bus.

**Returns:** `void`

**Example:**
```typescript
bus.clear(); // All listeners are removed
```

---

##### enqueue\<K\>(event, payload)

Add an event to the queue without emitting it immediately.
Events in the queue can be processed later using `drain()`.

**Template Parameters:**
- `K` - The event name (must be a key of TEventMap)

**Parameters:**
- `event` (`K`) - The event name
- `payload` (`TEventMap[K]`) - The event payload

**Returns:** `void`

**Example:**
```typescript
bus.enqueue("task:process", { id: 1 });
bus.enqueue("task:process", { id: 2 });
// Events are queued but not processed yet
bus.drain(); // Now both events are processed
```

---

##### drain([processor])

Process all queued events in FIFO (first-in-first-out) order.
By default, this emits each queued event. You can provide a custom processor function.

**Parameters:**
- `processor` (`Function`, optional) - Optional custom processor function. Defaults to emitting each event. The function receives `(event, payload)` for each queued item.

**Returns:** `void`

**Example:**
```typescript
// Default behavior (emits each event)
bus.drain();

// Custom processor
bus.drain((event, payload) => {
  console.log(`Processing ${String(event)}:`, payload);
  // Custom logic here
});
```

---

## Functions

### createRouteBus\<TEventMap\>()

Creates a type-safe event bus with queue management capabilities.

The event bus provides a publish-subscribe pattern with full TypeScript type safety.
Event names and their payload types are defined via a generic EventMap type parameter.

**Template Parameters:**
- `TEventMap` - A record type mapping event names to their payload types

**Returns:** `RouteBus<TEventMap>` - A new RouteBus instance with all event handling methods

**Examples:**

#### Basic Usage
```typescript
// Define your event types
type AppEvents = {
  "user:login": { userId: string; timestamp: Date };
  "user:logout": { userId: string };
  "chat:message": { id: string; text: string; from: string };
};

// Create a bus
const bus = createRouteBus<AppEvents>();

// Subscribe to events (with full type safety)
bus.on("user:login", (payload) => {
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

// Emit events (payload type is checked)
bus.emit("user:login", { 
  userId: "alice123", 
  timestamp: new Date() 
});
```

#### Using the Queue
```typescript
bus.enqueue("chat:message", { id: "1", text: "Hello", from: "Alice" });
bus.enqueue("chat:message", { id: "2", text: "Hi there", from: "Bob" });
bus.drain(); // Process all queued messages
```

#### One-time Listeners
```typescript
bus.once("user:logout", (payload) => {
  console.log(`${payload.userId} logged out`);
}); // Only fires once
```

#### Unsubscribing
```typescript
const unsubscribe = bus.on("chat:message", handler);
unsubscribe(); // Remove the listener
```

---

## Full Usage Example

```typescript
import { createRouteBus, type EventMapOf } from 'routebus';

// Define your application events
type AppEvents = {
  "user:login": { userId: string; timestamp: Date };
  "user:logout": { userId: string };
  "chat:message": { id: string; text: string; from: string };
  "notification": { type: string; message: string };
};

// Create the event bus
const bus = createRouteBus<AppEvents>();

// Register event listeners
bus.on("user:login", (payload) => {
  console.log(`User ${payload.userId} logged in`);
  
  // Send a welcome notification
  bus.emit("notification", {
    type: "info",
    message: `Welcome back, ${payload.userId}!`
  });
});

bus.on("chat:message", (payload) => {
  console.log(`[${payload.from}]: ${payload.text}`);
});

// One-time listener for initial setup
bus.once("user:login", (payload) => {
  console.log("First login detected, initializing user session...");
});

// Emit events
bus.emit("user:login", {
  userId: "alice123",
  timestamp: new Date()
});

bus.emit("chat:message", {
  id: "msg-1",
  text: "Hello everyone!",
  from: "Alice"
});

// Queue events for batch processing
bus.enqueue("chat:message", { id: "msg-2", text: "Message 1", from: "Bob" });
bus.enqueue("chat:message", { id: "msg-3", text: "Message 2", from: "Charlie" });

// Process all queued messages
bus.drain();

// Custom drain processor
bus.enqueue("notification", { type: "alert", message: "Alert 1" });
bus.enqueue("notification", { type: "alert", message: "Alert 2" });

bus.drain((event, payload) => {
  console.log(`[Batch] ${String(event)}:`, payload);
});

// Clean up when done
bus.clear();
```

---

## Type Safety

All methods are fully typed with TypeScript generics:

```typescript
type Events = {
  "save": { id: string };
};

const bus = createRouteBus<Events>();

bus.emit("save", { id: "123" }); // ✅ OK
bus.emit("save", { id: 123 });   // ❌ Error: id must be string
bus.emit("load", { id: "123" }); // ❌ Error: "load" is not a valid event
```

Event names are autocompleted and payload types are inferred, providing a fully type-safe event system.

---

*Generated from routebus v1.0.0*
