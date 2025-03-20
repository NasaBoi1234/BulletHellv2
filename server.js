const WebSocket = require('ws');
const Redis = require('ioredis');

// Get the Redis connection URL and password from environment variables (set in Railway)
const REDIS_URL = process.env.REDIS_URL; // The URL for Redis without password
const REDIS_PASSWORD = process.env.REDIS_PASSWORD; // The password for Redis
const WSS_URL = 'wss://bullethellv2-production.up.railway.app'; // WebSocket URL, replace with your own if different

if (!REDIS_URL || !REDIS_PASSWORD) {
    console.error('❌ REDIS_URL or REDIS_PASSWORD is not set! Please check your environment variables.');
    process.exit(1);  // Exit if Redis URL or password is not set
}

// Combine the REDIS_URL and REDIS_PASSWORD to form the full Redis connection string
const redisConfig = {
    host: REDIS_URL.split(':')[0], // Get the host part of the URL
    port: 6379, // Default Redis port
    password: REDIS_PASSWORD, // Password set in Railway environment variables
    tls: {} // Add TLS if required by the service
};

// Initialize Redis client with the connection URL and password
const redis = new Redis(redisConfig);

// Redis event listeners
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

// WebSocket server setup (on Railway's PORT)
const WSS_PORT = process.env.PORT || 8080; // Default to 8080 if no environment variable is set
const wss = new WebSocket.Server({ port: WSS_PORT });

wss.on('connection', (ws) => {
    console.log('✅ New WebSocket connection established.');

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

    ws.on('close', () => {
        console.log('❌ WebSocket connection closed.');
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

console.log(`✅ WebSocket server listening on wss://${WSS_URL}:${WSS_PORT}`);
