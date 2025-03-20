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

        const { action, variable, value, score } = data;
        console.log(`Received action: ${action}, variable: ${variable}, value: ${value}, score: ${score}`);

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

            case 'search':
                if (score) {
                    const keys = await redisClient.keys('*');  // Search for all keys
                    let matchingKeys = [];
                    for (const key of keys) {
                        const value = await redisClient.get(key);
                        if (value === score) {
                            matchingKeys.push(key);
                        }
                    }
                    console.log(`✅ Search result for score ${score}:`, matchingKeys);
                    ws.send(JSON.stringify({ score, keys: matchingKeys }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid score' }));
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
