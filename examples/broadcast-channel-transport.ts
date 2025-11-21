// Cross-tab sync with BroadcastChannel
// Open this in multiple browser tabs to see events synced across them

import { createRouteBus, createBroadcastChannelTransport } from '../src/index.js';

type AppEvents = {
  'counter:increment': { value: number };
  'counter:decrement': { value: number };
  'message:new': { text: string; from: string; timestamp: Date };
};

const bus = createRouteBus<AppEvents>({
  transport: createBroadcastChannelTransport<AppEvents>({
    channelName: 'my-app-events',
  }),
});

let counter = 0;

bus.on('counter:increment', (payload) => {
  counter = payload.value;
  console.log(`Counter incremented to: ${counter}`);
  updateUI();
});

bus.on('counter:decrement', (payload) => {
  counter = payload.value;
  console.log(`Counter decremented to: ${counter}`);
  updateUI();
});

bus.on('message:new', (payload) => {
  console.log(`[${payload.timestamp.toISOString()}] ${payload.from}: ${payload.text}`);
  addMessageToUI(payload);
});

function updateUI() {
  console.log(`UI updated: Counter is ${counter}`);
  // In a real app: document.getElementById('counter').textContent = counter.toString();
}

function addMessageToUI(message: { text: string; from: string; timestamp: Date }) {
  console.log(`Adding message to UI: ${message.text}`);
  // In a real app: append to message list in DOM
}

// Example actions
function incrementCounter() {
  counter++;
  bus.emit('counter:increment', { value: counter });
}

function decrementCounter() {
  counter--;
  bus.emit('counter:decrement', { value: counter });
}

function sendMessage(text: string, from: string) {
  bus.emit('message:new', { text, from, timestamp: new Date() });
}

// Simulate some actions
console.log('Starting BroadcastChannel transport example...');
console.log('Open this in multiple browser tabs to see synchronization!');

// Example usage
setTimeout(() => {
  incrementCounter(); // Will be synced to all tabs
}, 1000);

setTimeout(() => {
  sendMessage('Hello from tab!', 'User'); // Will appear in all tabs
}, 2000);

setTimeout(() => {
  incrementCounter();
}, 3000);

setTimeout(() => {
  decrementCounter();
}, 4000);

// Clean up when done
setTimeout(() => {
  console.log('Cleaning up...');
  bus.clear();
}, 10000);

// Export functions for use in browser console
if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
  const w = globalThis as typeof globalThis & { 
    window: Record<string, unknown> & { 
      incrementCounter?: () => void; 
      decrementCounter?: () => void; 
      sendMessage?: (text: string, from: string) => void;
    } 
  };
  w.window.incrementCounter = incrementCounter;
  w.window.decrementCounter = decrementCounter;
  w.window.sendMessage = sendMessage;
  
  console.log('Available functions:');
  console.log('  incrementCounter()');
  console.log('  decrementCounter()');
  console.log('  sendMessage(text, from)');
}
