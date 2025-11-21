import { createRouteBus } from '../src/index.js';

// Define test event types
type TestEvents = {
  "test:event": { value: number };
  "user:action": { userId: string; action: string };
  "data:update": { id: string; data: any };
};

describe('RouteBus', () => {
  describe('createRouteBus', () => {
    it('creates a bus instance with all methods', () => {
      const bus = createRouteBus<TestEvents>();
      expect(bus).toBeDefined();
      expect(typeof bus.on).toBe('function');
      expect(typeof bus.once).toBe('function');
      expect(typeof bus.off).toBe('function');
      expect(typeof bus.emit).toBe('function');
      expect(typeof bus.clear).toBe('function');
      expect(typeof bus.enqueue).toBe('function');
      expect(typeof bus.drain).toBe('function');
    });
  });

  describe('on', () => {
    it('registers a handler and receives events', () => {
      const bus = createRouteBus<TestEvents>();
      let callCount = 0;
      let receivedValue = 0;

      bus.on("test:event", (payload) => {
        callCount++;
        receivedValue = payload.value;
      });

      bus.emit("test:event", { value: 42 });
      
      expect(callCount).toBe(1);
      expect(receivedValue).toBe(42);
    });

    it('returns an unsubscribe function', () => {
      const bus = createRouteBus<TestEvents>();
      let callCount = 0;

      const unsubscribe = bus.on("test:event", () => {
        callCount++;
      });

      bus.emit("test:event", { value: 1 });
      expect(callCount).toBe(1);

      unsubscribe();
      bus.emit("test:event", { value: 2 });
      expect(callCount).toBe(1); // Should not increase
    });

    it('supports multiple handlers for the same event', () => {
      const bus = createRouteBus<TestEvents>();
      const calls: number[] = [];

      bus.on("test:event", () => calls.push(1));
      bus.on("test:event", () => calls.push(2));
      bus.on("test:event", () => calls.push(3));

      bus.emit("test:event", { value: 0 });
      
      expect(calls).toEqual([1, 2, 3]);
    });
  });

  describe('once', () => {
    it('handler is called only once', () => {
      const bus = createRouteBus<TestEvents>();
      let callCount = 0;

      bus.once("test:event", () => {
        callCount++;
      });

      bus.emit("test:event", { value: 1 });
      bus.emit("test:event", { value: 2 });
      bus.emit("test:event", { value: 3 });
      
      expect(callCount).toBe(1);
    });

    it('returns an unsubscribe function', () => {
      const bus = createRouteBus<TestEvents>();
      let callCount = 0;

      const unsubscribe = bus.once("test:event", () => {
        callCount++;
      });

      unsubscribe(); // Unsubscribe before emitting
      bus.emit("test:event", { value: 1 });
      
      expect(callCount).toBe(0);
    });
  });

  describe('off', () => {
    it('removes a specific handler', () => {
      const bus = createRouteBus<TestEvents>();
      let count1 = 0;
      let count2 = 0;

      const handler1 = () => count1++;
      const handler2 = () => count2++;

      bus.on("test:event", handler1);
      bus.on("test:event", handler2);

      bus.emit("test:event", { value: 1 });
      expect(count1).toBe(1);
      expect(count2).toBe(1);

      bus.off("test:event", handler1);
      bus.emit("test:event", { value: 2 });
      
      expect(count1).toBe(1); // Should not increase
      expect(count2).toBe(2); // Should increase
    });

    it('handles non-existent handler gracefully', () => {
      const bus = createRouteBus<TestEvents>();
      const handler = () => {};

      // Should not throw
      expect(() => {
        bus.off("test:event", handler);
      }).not.toThrow();
    });
  });

  describe('emit', () => {
    it('calls all registered handlers', () => {
      const bus = createRouteBus<TestEvents>();
      const results: number[] = [];

      bus.on("test:event", (payload) => results.push(payload.value * 1));
      bus.on("test:event", (payload) => results.push(payload.value * 2));
      bus.on("test:event", (payload) => results.push(payload.value * 3));

      bus.emit("test:event", { value: 10 });
      
      expect(results).toEqual([10, 20, 30]);
    });

    it('handles no listeners gracefully', () => {
      const bus = createRouteBus<TestEvents>();

      // Should not throw
      expect(() => {
        bus.emit("test:event", { value: 1 });
      }).not.toThrow();
    });

    it('passes correct payload to handlers', () => {
      const bus = createRouteBus<TestEvents>();
      let receivedPayload: any = null;

      bus.on("user:action", (payload) => {
        receivedPayload = payload;
      });

      const expectedPayload = { userId: "user123", action: "click" };
      bus.emit("user:action", expectedPayload);
      
      expect(receivedPayload).toEqual(expectedPayload);
    });
  });

  describe('clear', () => {
    it('removes all listeners', () => {
      const bus = createRouteBus<TestEvents>();
      let count = 0;

      bus.on("test:event", () => count++);
      bus.on("user:action", () => count++);
      bus.on("data:update", () => count++);

      bus.emit("test:event", { value: 1 });
      bus.emit("user:action", { userId: "u1", action: "a1" });
      expect(count).toBe(2);

      bus.clear();
      bus.emit("test:event", { value: 2 });
      bus.emit("user:action", { userId: "u2", action: "a2" });
      bus.emit("data:update", { id: "1", data: {} });
      
      expect(count).toBe(2); // Should not increase
    });
  });

  describe('enqueue', () => {
    it('adds events to queue without emitting', () => {
      const bus = createRouteBus<TestEvents>();
      const results: number[] = [];

      bus.on("test:event", (payload) => results.push(payload.value));

      bus.enqueue("test:event", { value: 1 });
      bus.enqueue("test:event", { value: 2 });
      bus.enqueue("test:event", { value: 3 });

      // No events should be emitted yet
      expect(results).toHaveLength(0);
    });
  });

  describe('drain', () => {
    it('processes all queued events in FIFO order', () => {
      const bus = createRouteBus<TestEvents>();
      const results: number[] = [];

      bus.on("test:event", (payload) => results.push(payload.value));

      bus.enqueue("test:event", { value: 1 });
      bus.enqueue("test:event", { value: 2 });
      bus.enqueue("test:event", { value: 3 });

      bus.drain();
      
      expect(results).toEqual([1, 2, 3]);
    });

    it('works with custom processor', () => {
      const bus = createRouteBus<TestEvents>();
      const results: any[] = [];

      bus.enqueue("test:event", { value: 1 });
      bus.enqueue("user:action", { userId: "u1", action: "a1" });
      bus.enqueue("test:event", { value: 2 });

      bus.drain((event, payload) => {
        results.push({ event, payload });
      });
      
      expect(results).toHaveLength(3);
      expect(results[0].event).toBe("test:event");
      expect(results[0].payload).toEqual({ value: 1 });
      expect(results[1].event).toBe("user:action");
      expect(results[1].payload).toEqual({ userId: "u1", action: "a1" });
      expect(results[2].event).toBe("test:event");
      expect(results[2].payload).toEqual({ value: 2 });
    });

    it('empties the queue', () => {
      const bus = createRouteBus<TestEvents>();
      const results: number[] = [];

      bus.on("test:event", (payload) => results.push(payload.value));

      bus.enqueue("test:event", { value: 1 });
      bus.enqueue("test:event", { value: 2 });
      bus.drain();
      
      expect(results).toEqual([1, 2]);

      // Queue should be empty now
      results.length = 0;
      bus.drain();
      
      expect(results).toEqual([]);
    });

    it('handles empty queue gracefully', () => {
      const bus = createRouteBus<TestEvents>();

      // Should not throw
      expect(() => {
        bus.drain();
      }).not.toThrow();
    });
  });

  describe('complex scenarios', () => {
    it('handles mix of on, once, emit, and queue', () => {
      const bus = createRouteBus<TestEvents>();
      const log: string[] = [];

      bus.on("test:event", (payload) => {
        log.push(`on:${payload.value}`);
      });

      bus.once("test:event", (payload) => {
        log.push(`once:${payload.value}`);
      });

      bus.emit("test:event", { value: 1 });
      bus.emit("test:event", { value: 2 });

      bus.enqueue("test:event", { value: 3 });
      bus.enqueue("test:event", { value: 4 });
      bus.drain();

      expect(log).toEqual([
        "on:1",
        "once:1",
        "on:2",
        "on:3",
        "on:4"
      ]);
    });

    it('allows handler to safely modify listeners during emit', () => {
      const bus = createRouteBus<TestEvents>();
      let callCount = 0;

      const handler = () => {
        callCount++;
        // Remove self during execution
        bus.off("test:event", handler);
      };

      bus.on("test:event", handler);
      bus.on("test:event", () => callCount++);

      bus.emit("test:event", { value: 1 });
      
      expect(callCount).toBe(2);

      bus.emit("test:event", { value: 2 });
      
      // First handler should not be called again
      expect(callCount).toBe(3);
    });

    it('supports different event types', () => {
      const bus = createRouteBus<TestEvents>();
      const log: string[] = [];

      bus.on("test:event", (payload) => {
        log.push(`test:${payload.value}`);
      });

      bus.on("user:action", (payload) => {
        log.push(`user:${payload.userId}:${payload.action}`);
      });

      bus.on("data:update", (payload) => {
        log.push(`data:${payload.id}`);
      });

      bus.emit("test:event", { value: 42 });
      bus.emit("user:action", { userId: "alice", action: "login" });
      bus.emit("data:update", { id: "doc1", data: { name: "Test" } });

      expect(log).toEqual([
        "test:42",
        "user:alice:login",
        "data:doc1"
      ]);
    });

    it('handles queue with multiple event types', () => {
      const bus = createRouteBus<TestEvents>();
      const log: string[] = [];

      bus.on("test:event", (payload) => log.push(`test:${payload.value}`));
      bus.on("user:action", (payload) => log.push(`user:${payload.action}`));

      bus.enqueue("test:event", { value: 1 });
      bus.enqueue("user:action", { userId: "u1", action: "login" });
      bus.enqueue("test:event", { value: 2 });
      bus.enqueue("user:action", { userId: "u2", action: "logout" });

      bus.drain();

      expect(log).toEqual([
        "test:1",
        "user:login",
        "test:2",
        "user:logout"
      ]);
    });
  });
});
