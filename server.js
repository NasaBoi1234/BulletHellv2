const WebSocket = require('ws');
const Redis = require('ioredis');

// Set up Redis connection (using the environment variables set in Railway)
const REDIS_URL = process.env.REDIS_URL;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const redis = new Redis({
    host: REDIS_URL.split(':')[0], // Redis host (excluding password part)
    port: 6379, // Default Redis port
    password: REDIS_PASSWORD,
    tls: {} // Add TLS if required by the service
});

redis.on('connect', () => {
    console.log('✅ Connected to Redis server.');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});

redis.on('close', () => {
    console.warn('❌ Redis connection closed unexpectedly.');
});

// Set up WebSocket server
const WSS_PORT = process.env.PORT || 8080;
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
            case 'set':
                if (variable && value !== undefined) {
                    await redis.set(variable, value);
                    console.log(`✅ Set ${variable} to ${value}`);
                    ws.send(JSON.stringify({ variable, value }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key or value' }));
                }
                break;

            case 'get':
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

            case 'add':
                if (variable && value !== undefined) {
                    const currentValue = await redis.get(variable);
                    let newValue = (parseInt(currentValue) || 0) + parseInt(value);
                    await redis.set(variable, newValue);
                    console.log(`✅ Added ${value} to ${variable}, new value: ${newValue}`);
                    ws.send(JSON.stringify({ variable, value: newValue }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key or value for addition' }));
                }
                break;

            case 'delete':
                if (variable) {
                    await redis.del(variable);
                    console.log(`✅ Deleted ${variable}`);
                    ws.send(JSON.stringify({ variable, value: null }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key' }));
                }
                break;

            case 'searchByScore':
                if (variable === 'score') {
                    const keys = await redis.keys('*'); // Get all keys in Redis
                    const results = [];

                    for (const key of keys) {
                        const value = await redis.get(key);
                        if (value) {
                            results.push({ key, value });
                        }
                    }

                    console.log(`✅ Search results for score:`, results);
                    ws.send(JSON.stringify({ searchResults: results }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid search query' }));
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

console.log(`✅ WebSocket server listening on wss://yourserver.com:${WSS_PORT}`);
