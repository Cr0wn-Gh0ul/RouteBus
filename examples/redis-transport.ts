// Distributed events with Redis pub/sub
// Run this in multiple processes to see events synced across them
//
// Prerequisites:
// - Redis server: docker run -p 6379:6379 redis
// - Redis client: npm install ioredis

// Uncomment these imports when you have a Redis client installed
// import { createRouteBus, createRedisTransport } from '../src/index.js';
// import Redis from 'ioredis';
// or
// import { createClient } from 'redis';

// @ts-ignore - Used for documentation purposes
type AppEvents = {
  'task:created': { id: string; name: string; priority: number };
  'task:completed': { id: string; completedAt: Date };
  'task:failed': { id: string; error: string };
  'user:action': { userId: string; action: string; data: unknown };
};

// Example with ioredis
/*
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const bus = createRouteBus<AppEvents>({
  transport: createRedisTransport<AppEvents>({
    redisClient: redis,
    channelPrefix: 'myapp:', // Optional prefix for all channels
  }),
});
*/

// Example with node-redis
/*
const redisClient = createClient({
  url: 'redis://localhost:6379'
});

await redisClient.connect();

const bus = createRouteBus<AppEvents>({
  transport: createRedisTransport<AppEvents>({
    redisClient: redisClient,
    channelPrefix: 'myapp:',
  }),
});
*/

// Placeholder for demonstration purposes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bus = null as any; // Replace with actual bus creation above

// Listen for task events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
bus?.on('task:created', (payload: any) => {
  console.log(`New task created: ${payload.name} (ID: ${payload.id}, Priority: ${payload.priority})`);
  // Process the task...
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
bus?.on('task:completed', (payload: any) => {
  console.log(`Task ${payload.id} completed at ${payload.completedAt}`);
  // Update database, send notifications, etc.
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
bus?.on('task:failed', (payload: any) => {
  console.log(`Task ${payload.id} failed: ${payload.error}`);
  // Handle failure, retry, etc.
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
bus?.on('user:action', (payload: any) => {
  console.log(`User ${payload.userId} performed action: ${payload.action}`);
  console.log('Data:', payload.data);
});

// Example: Emit events that will be distributed across all connected processes
function createTask(name: string, priority: number) {
  const taskId = `task-${Date.now()}`;
  bus?.emit('task:created', {
    id: taskId,
    name,
    priority,
  });
  return taskId;
}

function completeTask(taskId: string) {
  bus?.emit('task:completed', {
    id: taskId,
    completedAt: new Date(),
  });
}

function failTask(taskId: string, error: string) {
  bus?.emit('task:failed', {
    id: taskId,
    error,
  });
}

function logUserAction(userId: string, action: string, data: unknown) {
  bus?.emit('user:action', {
    userId,
    action,
    data,
  });
}

// Simulated workflow (uncomment when using real Redis client)
/*
console.log('Starting Redis transport example...');
console.log('Run this file in multiple terminals to see distributed events!');

setTimeout(() => {
  const taskId = createTask('Process data', 1);
  console.log(`Created task: ${taskId}`);
}, 1000);

setTimeout(() => {
  logUserAction('user123', 'login', { ip: '192.168.1.1', timestamp: new Date() });
}, 2000);

setTimeout(() => {
  const taskId = createTask('Send emails', 2);
  setTimeout(() => completeTask(taskId), 2000);
}, 3000);

setTimeout(() => {
  const taskId = createTask('Backup database', 3);
  setTimeout(() => failTask(taskId, 'Disk space full'), 2000);
}, 5000);

// Clean up
setTimeout(async () => {
  console.log('Cleaning up...');
  bus.clear();
  await redis.quit();
  process.exit(0);
}, 15000);
*/

// Export functions for testing
export { createTask, completeTask, failTask, logUserAction };

console.log(`
Redis Transport Example
=======================

To use this example:

1. Start a Redis server:
   docker run -p 6379:6379 redis

2. Install a Redis client:
   npm install ioredis
   or
   npm install redis

3. Uncomment the Redis client code above and the example workflow

4. Build and run:
   npm run build
   node dist/examples/redis-transport.js

5. Open multiple terminals and run the same command to see
   events synchronized across processes!
`);
