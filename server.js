const WebSocket = require('ws');
const redis = require('redis');
const { WebSocketServer } = WebSocket;

// Connect to Redis using the provided URL and password from environment variables
const REDIS_URL = process.env.REDIS_URL;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const redisClient = redis.createClient({
    url: REDIS_URL,
    password: REDIS_PASSWORD,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 5000),
    },
});

redisClient.connect().then(() => console.log('Connected to Redis'));

const wss = new WebSocketServer({ port: 8080 });

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
        console.log(`Received action: ${action}, variable: ${variable}, value: ${value}`);

        switch (action) {
            case 'set':
                if (variable && value !== undefined) {
                    await redisClient.set(variable, value);
                    console.log(`✅ Set ${variable} to ${value}`);
                    const storedValue = await redisClient.get(variable);
                    console.log(`Redis store for ${variable}: ${storedValue}`);
                    ws.send(JSON.stringify({ variable, value: storedValue }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key or value' }));
                }
                break;

            case 'get':
                if (variable) {
                    const storedValue = await redisClient.get(variable);
                    console.log(`✅ Retrieved ${variable}: ${storedValue}`);
                    ws.send(JSON.stringify({ variable, value: storedValue }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key' }));
                }
                break;

            case 'delete':
                if (variable) {
                    await redisClient.del(variable);
                    console.log(`✅ Deleted ${variable}`);
                    ws.send(JSON.stringify({ variable, value: null }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid key' }));
                }
                break;

            default:
                console.error('❌ Unknown action:', action);
                ws.send(JSON.stringify({ error: 'Unknown action' }));
        }
    });

    ws.on('close', () => {
        console.log('❌ WebSocket connection closed.');
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

console.log('✅ WebSocket server started on ws://localhost:8080');
