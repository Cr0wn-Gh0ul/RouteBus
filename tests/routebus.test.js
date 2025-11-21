import { test } from 'node:test';
import assert from 'node:assert';
import { createRouteBus } from '../src/index.js';
test('createRouteBus creates a bus instance', () => {
    const bus = createRouteBus();
    assert.ok(bus);
    assert.strictEqual(typeof bus.on, 'function');
    assert.strictEqual(typeof bus.once, 'function');
    assert.strictEqual(typeof bus.off, 'function');
    assert.strictEqual(typeof bus.emit, 'function');
    assert.strictEqual(typeof bus.clear, 'function');
    assert.strictEqual(typeof bus.enqueue, 'function');
    assert.strictEqual(typeof bus.drain, 'function');
});
test('on: registers a handler and receives events', () => {
    const bus = createRouteBus();
    let callCount = 0;
    let receivedValue = 0;
    bus.on("test:event", (payload) => {
        callCount++;
        receivedValue = payload.value;
    });
    bus.emit("test:event", { value: 42 });
    assert.strictEqual(callCount, 1);
    assert.strictEqual(receivedValue, 42);
});
test('on: returns an unsubscribe function', () => {
    const bus = createRouteBus();
    let callCount = 0;
    const unsubscribe = bus.on("test:event", () => {
        callCount++;
    });
    bus.emit("test:event", { value: 1 });
    assert.strictEqual(callCount, 1);
    unsubscribe();
    bus.emit("test:event", { value: 2 });
    assert.strictEqual(callCount, 1); // Should not increase
});
test('on: multiple handlers for the same event', () => {
    const bus = createRouteBus();
    const calls = [];
    bus.on("test:event", () => calls.push(1));
    bus.on("test:event", () => calls.push(2));
    bus.on("test:event", () => calls.push(3));
    bus.emit("test:event", { value: 0 });
    assert.deepStrictEqual(calls, [1, 2, 3]);
});
test('once: handler is called only once', () => {
    const bus = createRouteBus();
    let callCount = 0;
    bus.once("test:event", () => {
        callCount++;
    });
    bus.emit("test:event", { value: 1 });
    bus.emit("test:event", { value: 2 });
    bus.emit("test:event", { value: 3 });
    assert.strictEqual(callCount, 1);
});
test('once: returns an unsubscribe function', () => {
    const bus = createRouteBus();
    let callCount = 0;
    const unsubscribe = bus.once("test:event", () => {
        callCount++;
    });
    unsubscribe(); // Unsubscribe before emitting
    bus.emit("test:event", { value: 1 });
    assert.strictEqual(callCount, 0);
});
test('off: removes a specific handler', () => {
    const bus = createRouteBus();
    let count1 = 0;
    let count2 = 0;
    const handler1 = () => count1++;
    const handler2 = () => count2++;
    bus.on("test:event", handler1);
    bus.on("test:event", handler2);
    bus.emit("test:event", { value: 1 });
    assert.strictEqual(count1, 1);
    assert.strictEqual(count2, 1);
    bus.off("test:event", handler1);
    bus.emit("test:event", { value: 2 });
    assert.strictEqual(count1, 1); // Should not increase
    assert.strictEqual(count2, 2); // Should increase
});
test('off: handles non-existent handler gracefully', () => {
    const bus = createRouteBus();
    const handler = () => { };
    // Should not throw
    assert.doesNotThrow(() => {
        bus.off("test:event", handler);
    });
});
test('emit: calls all registered handlers', () => {
    const bus = createRouteBus();
    const results = [];
    bus.on("test:event", (payload) => results.push(payload.value * 1));
    bus.on("test:event", (payload) => results.push(payload.value * 2));
    bus.on("test:event", (payload) => results.push(payload.value * 3));
    bus.emit("test:event", { value: 10 });
    assert.deepStrictEqual(results, [10, 20, 30]);
});
test('emit: handles no listeners gracefully', () => {
    const bus = createRouteBus();
    // Should not throw
    assert.doesNotThrow(() => {
        bus.emit("test:event", { value: 1 });
    });
});
test('emit: passes correct payload to handlers', () => {
    const bus = createRouteBus();
    let receivedPayload = null;
    bus.on("user:action", (payload) => {
        receivedPayload = payload;
    });
    const expectedPayload = { userId: "user123", action: "click" };
    bus.emit("user:action", expectedPayload);
    assert.deepStrictEqual(receivedPayload, expectedPayload);
});
test('clear: removes all listeners', () => {
    const bus = createRouteBus();
    let count = 0;
    bus.on("test:event", () => count++);
    bus.on("user:action", () => count++);
    bus.on("data:update", () => count++);
    bus.emit("test:event", { value: 1 });
    bus.emit("user:action", { userId: "u1", action: "a1" });
    assert.strictEqual(count, 2);
    bus.clear();
    bus.emit("test:event", { value: 2 });
    bus.emit("user:action", { userId: "u2", action: "a2" });
    bus.emit("data:update", { id: "1", data: {} });
    assert.strictEqual(count, 2); // Should not increase
});
test('enqueue: adds events to queue', () => {
    const bus = createRouteBus();
    const results = [];
    bus.on("test:event", (payload) => results.push(payload.value));
    bus.enqueue("test:event", { value: 1 });
    bus.enqueue("test:event", { value: 2 });
    bus.enqueue("test:event", { value: 3 });
    // No events should be emitted yet
    assert.strictEqual(results.length, 0);
});
test('drain: processes all queued events in FIFO order', () => {
    const bus = createRouteBus();
    const results = [];
    bus.on("test:event", (payload) => results.push(payload.value));
    bus.enqueue("test:event", { value: 1 });
    bus.enqueue("test:event", { value: 2 });
    bus.enqueue("test:event", { value: 3 });
    bus.drain();
    assert.deepStrictEqual(results, [1, 2, 3]);
});
test('drain: with custom processor', () => {
    const bus = createRouteBus();
    const results = [];
    bus.enqueue("test:event", { value: 1 });
    bus.enqueue("user:action", { userId: "u1", action: "a1" });
    bus.enqueue("test:event", { value: 2 });
    bus.drain((event, payload) => {
        results.push({ event, payload });
    });
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[0].event, "test:event");
    assert.deepStrictEqual(results[0].payload, { value: 1 });
    assert.strictEqual(results[1].event, "user:action");
    assert.deepStrictEqual(results[1].payload, { userId: "u1", action: "a1" });
    assert.strictEqual(results[2].event, "test:event");
    assert.deepStrictEqual(results[2].payload, { value: 2 });
});
test('drain: empties the queue', () => {
    const bus = createRouteBus();
    const results = [];
    bus.on("test:event", (payload) => results.push(payload.value));
    bus.enqueue("test:event", { value: 1 });
    bus.enqueue("test:event", { value: 2 });
    bus.drain();
    assert.deepStrictEqual(results, [1, 2]);
    // Queue should be empty now
    results.length = 0;
    bus.drain();
    assert.deepStrictEqual(results, []);
});
test('drain: handles empty queue gracefully', () => {
    const bus = createRouteBus();
    // Should not throw
    assert.doesNotThrow(() => {
        bus.drain();
    });
});
test('complex scenario: mix of on, once, emit, and queue', () => {
    const bus = createRouteBus();
    const log = [];
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
    assert.deepStrictEqual(log, [
        "on:1",
        "once:1",
        "on:2",
        "on:3",
        "on:4"
    ]);
});
test('handler can safely modify listeners during emit', () => {
    const bus = createRouteBus();
    let callCount = 0;
    const handler = () => {
        callCount++;
        // Remove self during execution
        bus.off("test:event", handler);
    };
    bus.on("test:event", handler);
    bus.on("test:event", () => callCount++);
    bus.emit("test:event", { value: 1 });
    assert.strictEqual(callCount, 2);
    bus.emit("test:event", { value: 2 });
    // First handler should not be called again
    assert.strictEqual(callCount, 3);
});
test('supports different event types', () => {
    const bus = createRouteBus();
    const log = [];
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
    assert.deepStrictEqual(log, [
        "test:42",
        "user:alice:login",
        "data:doc1"
    ]);
});
test('queue and drain with multiple event types', () => {
    const bus = createRouteBus();
    const log = [];
    bus.on("test:event", (payload) => log.push(`test:${payload.value}`));
    bus.on("user:action", (payload) => log.push(`user:${payload.action}`));
    bus.enqueue("test:event", { value: 1 });
    bus.enqueue("user:action", { userId: "u1", action: "login" });
    bus.enqueue("test:event", { value: 2 });
    bus.enqueue("user:action", { userId: "u2", action: "logout" });
    bus.drain();
    assert.deepStrictEqual(log, [
        "test:1",
        "user:login",
        "test:2",
        "user:logout"
    ]);
});
//# sourceMappingURL=routebus.test.js.map