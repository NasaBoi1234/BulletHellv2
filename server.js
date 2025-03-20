import { WebSocketServer } from 'ws';
import { createClient } from 'ioredis';
import express from 'express';
import cors from 'cors';

env.REDIS_URL = process.env.REDIS_URL || "finer-meerkat-38166.upstash.io";
env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || "AZUWAAIjcDFhZWUzZGVjYTk4NTY0Mjg0YmRkNGI2MWQ1ZjIwNzM1MnAxMA";

const db = new createClient(env.REDIS_URL, { password: env.REDIS_PASSWORD });

const app = express();
app.use(cors());
const server = app.listen(443, () => console.log("Server running on port 443"));
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        let data = JSON.parse(message);
        if (data.action === "set") {
            await db.set(data.variable, data.value);
        } else if (data.action === "get") {
            let value = await db.get(data.variable);
            ws.send(JSON.stringify({ variable: data.variable, value }));
        }
    });
});

console.log("WebSocket server running on wss://yourserver.up.railway.app");
