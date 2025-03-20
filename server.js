const express = require("express");
const Redis = require("ioredis");
const http = require("http");

const app = express();
const server = http.createServer(app);

// Load Railway environment variables
const REDIS_URL = process.env.REDIS_URL; // Railway Redis URL
const REDIS_PASSWORD = process.env.REDIS_PASSWORD; // Railway Redis password

if (!REDIS_URL) {
    console.error("❌ REDIS_URL is not set. Please configure it in Railway.");
    process.exit(1);
}

// Configure Redis connection
const redis = new Redis(REDIS_URL, {
    password: REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000), // Gradual retry
    reconnectOnError: () => 1, // Auto-reconnect on errors
    maxRetriesPerRequest: null, // Prevents unnecessary request failures
});

// Handle Redis events
redis.on("error", (err) => {
    console.error("❌ Redis error:", err);
});

redis.on("connect", () => {
    console.log("✅ Connected to Redis!");
});

// Sample route for testing
app.get("/", async (req, res) => {
    try {
        await redis.ping();
        res.send("✅ Redis is working!");
    } catch (err) {
        res.status(500).send("❌ Redis error: " + err);
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
