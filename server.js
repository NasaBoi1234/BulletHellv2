const { WebSocketServer } = require('ws');
const Redis = require('ioredis');
const express = require('express');
const cors = require('cors');

// Connect to Upstash KeyDB
const db = new Redis(process.env.REDIS_URL, { password: process.env.REDIS_PASSWORD });

const app = express();
app.use(cors());

// Start the HTTP server
const server = app.listen(443, () => console.log("Server running on port 443"));

// Set up WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log("New client connected");

    ws.on('message', async (message) => {
        try {
            let data = JSON.parse(message);

            if (data.action === "set") {
                await db.set(data.variable, data.value);
                console.log(`Set ${data.variable} = ${data.value}`);
            } else if (data.action === "get") {
                let value = await db.get(data.variable);
                ws.send(JSON.stringify({ variable: data.variable, value }));
                console.log(`Get ${data.variable} = ${value}`);
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    ws.on('close', () => {
        console.log("Client disconnected");
    });
});

console.log("WebSocket server running on wss://yourserver.up.railway.app");
