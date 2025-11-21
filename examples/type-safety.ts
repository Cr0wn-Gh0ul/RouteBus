/**
 * This file demonstrates the type safety features of routebus.
 * Uncomment the error examples to see TypeScript catch issues at compile time.
 */

import { createRouteBus, type EventMapOf, type RouteBus } from '../src/index.js';

// Define a strict event map
type StrictEvents = {
  "user:created": { id: string; name: string; email: string };
  "user:updated": { id: string; changes: Record<string, any> };
  "user:deleted": { id: string };
  "notification:sent": { to: string; subject: string; body: string };
};

const bus = createRouteBus<StrictEvents>();

// ✅ Type-safe event emission
bus.emit("user:created", {
  id: "123",
  name: "Alice",
  email: "alice@example.com"
});

// ✅ Type-safe event listening
bus.on("user:updated", (payload) => {
  // payload is correctly typed as { id: string; changes: Record<string, any> }
  console.log(`User ${payload.id} updated`, payload.changes);
});

// ✅ EventMapOf utility type
type ExtractedEventMap = EventMapOf<typeof bus>;
const handler: (payload: ExtractedEventMap["user:deleted"]) => void = (payload) => {
  console.log(`Deleting user ${payload.id}`);
};
bus.on("user:deleted", handler);

// ✅ Type inference with once
bus.once("notification:sent", (payload) => {
  // payload is automatically typed correctly
  console.log(`Notification to ${payload.to}: ${payload.subject}`);
});

// ============================================================================
// ERROR EXAMPLES - Uncomment to see TypeScript errors
// ============================================================================

// ❌ Error: Invalid event name
// bus.emit("user:invalid", { id: "123" });
// Argument of type '"user:invalid"' is not assignable to parameter of type 'keyof StrictEvents'

// ❌ Error: Wrong payload type
// bus.emit("user:created", { id: 123, name: "Bob", email: "bob@example.com" });
// Type 'number' is not assignable to type 'string'

// ❌ Error: Missing required fields
// bus.emit("user:created", { id: "123", name: "Carol" });
// Property 'email' is missing in type '{ id: string; name: string; }'

// ❌ Error: Extra fields (in strict mode)
// bus.emit("user:deleted", { id: "123", extra: "field" });
// Object literal may only specify known properties

// ❌ Error: Wrong handler signature
// bus.on("user:created", (payload: { id: number }) => {
//   console.log(payload.id);
// });
// Types of parameters 'payload' and 'payload' are incompatible

// ============================================================================
// Type Constraints
// ============================================================================

// You can use the RouteBus type to constrain function parameters
function setupUserHandlers(eventBus: RouteBus<StrictEvents>) {
  eventBus.on("user:created", (payload) => {
    console.log(`New user: ${payload.name}`);
  });

  eventBus.on("user:deleted", (payload) => {
    console.log(`Deleted user: ${payload.id}`);
  });
}

setupUserHandlers(bus);

// ============================================================================
// Queue Type Safety
// ============================================================================

bus.enqueue("user:created", {
  id: "456",
  name: "Bob",
  email: "bob@example.com"
});

// ❌ Error: Wrong payload in queue
// bus.enqueue("user:created", { id: "456" });
// Property 'name' is missing

// ============================================================================
// Generic Event Patterns
// ============================================================================

// You can create reusable event handlers with proper typing
function createLogger<TEventMap extends Record<string, any>>() {
  const logBus = createRouteBus<TEventMap>();
  
  return {
    bus: logBus,
    logAll: () => {
      // This would require runtime iteration over event keys
      // Here's how you'd set it up if you knew the keys:
      console.log("Logger initialized");
    }
  };
}

const logger = createLogger<StrictEvents>();
logger.bus.on("user:created", (payload) => {
  console.log("[LOG]", payload);
});

console.log("Type safety examples compiled successfully!");
