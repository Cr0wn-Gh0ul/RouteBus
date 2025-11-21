// In-memory transport example - simple game simulation

import { createRouteBus } from '../src/index.js';

type GameEvents = {
  'game:start': { gameId: string; players: string[] };
  'game:end': { gameId: string; winner: string; score: number };
  'player:move': { playerId: string; position: { x: number; y: number } };
  'player:attack': { playerId: string; targetId: string; damage: number };
  'item:collected': { playerId: string; itemId: string; itemType: string };
};

const bus = createRouteBus<GameEvents>();

const gameState = {
  gameId: '',
  players: new Map<string, { position: { x: number; y: number }; health: number }>(),
  items: new Set<string>(),
};

bus.on('game:start', (payload) => {
  gameState.gameId = payload.gameId;
  console.log(`Game ${payload.gameId} started with players: ${payload.players.join(', ')}`);
  
  payload.players.forEach((playerId, index) => {
    gameState.players.set(playerId, {
      position: { x: index * 10, y: 0 },
      health: 100,
    });
  });
});

bus.on('game:end', (payload) => {
  console.log(`Game ${payload.gameId} ended. Winner: ${payload.winner} with score ${payload.score}`);
  gameState.players.clear();
  gameState.items.clear();
});

bus.on('player:move', (payload) => {
  const player = gameState.players.get(payload.playerId);
  if (player) {
    player.position = payload.position;
    console.log(`Player ${payload.playerId} moved to (${payload.position.x}, ${payload.position.y})`);
  }
});

bus.on('player:attack', (payload) => {
  const target = gameState.players.get(payload.targetId);
  if (target) {
    target.health -= payload.damage;
    console.log(
      `Player ${payload.playerId} attacked ${payload.targetId} for ${payload.damage} damage. ` +
      `Target health: ${target.health}`
    );
    
    if (target.health <= 0) {
      console.log(`Player ${payload.targetId} has been eliminated!`);
    }
  }
});

bus.on('item:collected', (payload) => {
  gameState.items.add(payload.itemId);
  console.log(`Player ${payload.playerId} collected ${payload.itemType} (${payload.itemId})`);
});

// Simulate a game
bus.emit('game:start', {
  gameId: 'game-001',
  players: ['alice', 'bob', 'charlie'],
});

console.log('');

// Player moves
setTimeout(() => {
  bus.emit('player:move', {
    playerId: 'alice',
    position: { x: 15, y: 20 },
  });
}, 100);

setTimeout(() => {
  bus.emit('player:move', {
    playerId: 'bob',
    position: { x: 25, y: 15 },
  });
}, 200);

// Item collection
setTimeout(() => {
  bus.emit('item:collected', {
    playerId: 'alice',
    itemId: 'sword-001',
    itemType: 'weapon',
  });
}, 300);

// Combat
setTimeout(() => {
  console.log('');
  bus.emit('player:attack', {
    playerId: 'alice',
    targetId: 'bob',
    damage: 30,
  });
}, 400);

setTimeout(() => {
  bus.emit('player:attack', {
    playerId: 'alice',
    targetId: 'bob',
    damage: 40,
  });
}, 500);

setTimeout(() => {
  bus.emit('player:attack', {
    playerId: 'charlie',
    targetId: 'alice',
    damage: 25,
  });
}, 600);

// More attacks
setTimeout(() => {
  bus.emit('player:attack', {
    playerId: 'alice',
    targetId: 'bob',
    damage: 35,
  });
}, 700);

// End game
setTimeout(() => {
  console.log('');
  bus.emit('game:end', {
    gameId: 'game-001',
    winner: 'alice',
    score: 1250,
  });
}, 1000);

// Queue demonstration
setTimeout(() => {
  console.log('\n=== Queue Demonstration ===\n');
  
  // Queue up some events
  bus.enqueue('player:move', {
    playerId: 'alice',
    position: { x: 100, y: 100 },
  });
  
  bus.enqueue('item:collected', {
    playerId: 'bob',
    itemId: 'potion-001',
    itemType: 'consumable',
  });
  
  bus.enqueue('player:attack', {
    playerId: 'charlie',
    targetId: 'alice',
    damage: 10,
  });
  
  console.log('Events queued (not yet processed)...');
  
  setTimeout(() => {
    console.log('\nDraining queue with custom processor:\n');
    bus.drain((event, payload) => {
      console.log(`[Queue Processor] Event: ${String(event)}`);
      console.log(`[Queue Processor] Payload:`, payload);
      console.log('---');
    });
  }, 500);
}, 1500);

// Clean up
setTimeout(() => {
  console.log('\n=== Cleaning up ===');
  bus.clear();
  console.log('Game simulation complete!');
}, 3000);
