const WebSocket = require('ws');
const Redis = require('ioredis');

// Environment variables for Redis and WebSocket
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';  // The Redis host (e.g., 'localhost' or Railway URL)
const REDIS_PORT = 6379; // Redis default port (6379)
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';  // Redis password if required
const WSS_PORT = process.env.PORT || 8080;  // WebSocket server port (defaults to 8080)

// Initialize Redis client
const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff for retries
    reconnectOnError: () => 1, // Auto-reconnect on errors
    maxRetriesPerRequest: null, // Retry indefinitely
    connectTimeout: 10000, // Timeout in 10 seconds
});

// Event listeners for Redis connection
redis.on('connect', () => {
    console.log('✅ Connected to Redis server.');
});
redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});
redis.on('close', () => {
    console.warn('❌ Redis connection closed unexpectedly.');
});
redis.on('reconnecting', () => {
    console.log('🔄 Reconnecting to Redis...');
});

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: WSS_PORT });

wss.on('connection', (ws) => {
    console.log('✅ New WebSocket connection established.');

    // Handle incoming messages
    ws.on('message', async (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (err) {
            console.error('❌ Error parsing message:', err);
            return;
        }

        const { action, variable, value } = data;

        switch (action) {
            case 'set': // Set data in Redis
                if (variable && value !== undefined) {
                    await redis.set(variable, value);
                    console.log(`✅ Set ${variable} to ${value}`);
                    ws.send(JSON.stringify({ variable, value }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key or value' }));
                }
                break;

            case 'get': // Get data from Redis
                if (variable) {
                    const storedValue = await redis.get(variable);
                    if (storedValue !== null) {
                        console.log(`✅ Retrieved ${variable}: ${storedValue}`);
                        ws.send(JSON.stringify({ variable, value: storedValue }));
                    } else {
                        ws.send(JSON.stringify({ error: 'Key not found' }));
                    }
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key' }));
                }
                break;

            case 'delete': // Delete data from Redis
                if (variable) {
                    await redis.del(variable);
                    console.log(`✅ Deleted ${variable}`);
                    ws.send(JSON.stringify({ variable, value: null }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key' }));
                }
                break;

            default:
                console.error('❌ Unknown action:', action);
                ws.send(JSON.stringify({ error: 'Unknown action' }));
                break;
        }
    });

    // Handle WebSocket connection closure
    ws.on('close', () => {
        console.log('❌ WebSocket connection closed.');
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Log when WebSocket server starts
console.log(`✅ WebSocket server listening on ws://localhost:${WSS_PORT}`);
