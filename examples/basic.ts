import { createRouteBus, type EventMapOf } from '../src/index.js';

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

type AppEvents = {
  "chat:message": { id: string; text: string; from: string };
  "user:login": { userId: string };
  "user:logout": { userId: string };
};

console.log("=== Example 1: Basic Usage ===\n");

const bus = createRouteBus<AppEvents>();

// Subscribe to chat messages
const unsubscribe = bus.on("chat:message", (payload) => {
  console.log(`[CHAT] ${payload.from}: ${payload.text}`);
});

// Subscribe to user login
bus.on("user:login", (payload) => {
  console.log(`[LOGIN] User ${payload.userId} logged in`);
});

// Emit events
bus.emit("user:login", { userId: "alice123" });
bus.emit("chat:message", { id: "1", text: "Hello everyone!", from: "Alice" });
bus.emit("chat:message", { id: "2", text: "Hi Alice!", from: "Bob" });

// Unsubscribe from chat
unsubscribe();
console.log("\n[INFO] Unsubscribed from chat:message\n");

// This won't be logged anymore
bus.emit("chat:message", { id: "3", text: "Anyone there?", from: "Charlie" });

// ============================================================================
// Example 2: Once Handler
// ============================================================================

console.log("\n=== Example 2: Once Handler ===\n");

const bus2 = createRouteBus<AppEvents>();

bus2.once("user:login", (payload) => {
  console.log(`[ONCE] First login detected: ${payload.userId}`);
});

bus2.emit("user:login", { userId: "user1" }); // Will log
bus2.emit("user:login", { userId: "user2" }); // Won't log (handler removed)

// ============================================================================
// Example 3: Queue Management
// ============================================================================

console.log("\n=== Example 3: Queue Management ===\n");

const bus3 = createRouteBus<AppEvents>();

bus3.on("chat:message", (payload) => {
  console.log(`[QUEUE] Processing: ${payload.text}`);
});

// Queue events instead of emitting immediately
bus3.enqueue("chat:message", { id: "1", text: "Queued message 1", from: "Alice" });
bus3.enqueue("chat:message", { id: "2", text: "Queued message 2", from: "Bob" });
bus3.enqueue("chat:message", { id: "3", text: "Queued message 3", from: "Charlie" });

console.log("[INFO] 3 messages queued\n");

// Process all queued events
console.log("[INFO] Draining queue...\n");
bus3.drain();

// ============================================================================
// Example 4: Custom Drain Processor
// ============================================================================

console.log("\n=== Example 4: Custom Drain Processor ===\n");

const bus4 = createRouteBus<AppEvents>();

bus4.enqueue("user:login", { userId: "user1" });
bus4.enqueue("user:logout", { userId: "user1" });
bus4.enqueue("user:login", { userId: "user2" });

console.log("[INFO] Custom processor - logging events without emitting\n");

bus4.drain((event, payload) => {
  console.log(`[CUSTOM] Event: ${String(event)}, Payload:`, payload);
});

// ============================================================================
// Example 5: Multiple Handlers
// ============================================================================

console.log("\n=== Example 5: Multiple Handlers ===\n");

const bus5 = createRouteBus<AppEvents>();

// Add multiple handlers for the same event
bus5.on("user:login", (payload) => {
  console.log(`[HANDLER 1] Welcome ${payload.userId}!`);
});

bus5.on("user:login", (payload) => {
  console.log(`[HANDLER 2] Logging in user: ${payload.userId}`);
});

bus5.on("user:login", (payload) => {
  console.log(`[HANDLER 3] Sending notification to ${payload.userId}`);
});

bus5.emit("user:login", { userId: "alice123" });

// ============================================================================
// Example 6: Clear All Listeners
// ============================================================================

console.log("\n=== Example 6: Clear All Listeners ===\n");

const bus6 = createRouteBus<AppEvents>();

bus6.on("chat:message", () => console.log("[CHAT] Message received"));
bus6.on("user:login", () => console.log("[LOGIN] User logged in"));
bus6.on("user:logout", () => console.log("[LOGOUT] User logged out"));

console.log("[INFO] Emitting events before clear:\n");
bus6.emit("chat:message", { id: "1", text: "Test", from: "Alice" });
bus6.emit("user:login", { userId: "alice123" });

console.log("\n[INFO] Clearing all listeners...\n");
bus6.clear();

console.log("[INFO] Emitting events after clear (no output expected):\n");
bus6.emit("chat:message", { id: "2", text: "Test", from: "Bob" });
bus6.emit("user:logout", { userId: "alice123" });

// ============================================================================
// Example 7: EventMapOf Type Utility
// ============================================================================

console.log("\n=== Example 7: EventMapOf Type Utility ===\n");

const bus7 = createRouteBus<AppEvents>();

// Extract the event map type from the bus
type ExtractedEvents = EventMapOf<typeof bus7>;

// This would be typed as AppEvents
const handler: (payload: ExtractedEvents["user:login"]) => void = (payload) => {
  console.log(`[TYPED] User ${payload.userId} logged in with extracted type`);
};

bus7.on("user:login", handler);
bus7.emit("user:login", { userId: "typed-user" });

// ============================================================================
// Example 8: Off Method
// ============================================================================

console.log("\n=== Example 8: Off Method ===\n");

const bus8 = createRouteBus<AppEvents>();

const messageHandler = (payload: AppEvents["chat:message"]) => {
  console.log(`[HANDLER] ${payload.text}`);
};

bus8.on("chat:message", messageHandler);

console.log("[INFO] Handler registered\n");
bus8.emit("chat:message", { id: "1", text: "First message", from: "Alice" });

console.log("\n[INFO] Removing handler with off()\n");
bus8.off("chat:message", messageHandler);

console.log("[INFO] Handler removed (no output expected)\n");
bus8.emit("chat:message", { id: "2", text: "Second message", from: "Bob" });

console.log("\n=== All Examples Complete ===");
