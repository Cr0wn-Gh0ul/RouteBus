import { createRouteBus } from '../src/index.js';

// Simple example demonstrating core features
type AppEvents = {
  "chat:message": { id: string; text: string; from: string };
  "user:login": { userId: string };
};

const bus = createRouteBus<AppEvents>();

// Subscribe to events
bus.on("chat:message", (payload) => {
  console.log(`${payload.from}: ${payload.text}`);
});

bus.on("user:login", (payload) => {
  console.log(`User ${payload.userId} logged in`);
});

// Emit events
bus.emit("user:login", { userId: "alice123" });
bus.emit("chat:message", { id: "1", text: "Hello!", from: "Alice" });

// Use once for one-time listeners
bus.once("user:login", (payload) => {
  console.log(`First login: ${payload.userId}`);
});

// Queue events for later processing
bus.enqueue("chat:message", { id: "2", text: "Queued message", from: "Bob" });
bus.drain(); // Process all queued events
