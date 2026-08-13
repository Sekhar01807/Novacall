import express from "express";
import { createServer } from "node:http";

import { initializeSocketIO } from "./controllers/socketManager.js";

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();


import cors from "cors";

import UsersRoutes from "./routes/UsersRoutes.js";

const app = express();
const server = createServer(app);
const io = initializeSocketIO(server);

app.set("port", process.env.PORT || 8000);
const ATLASDB_URL = process.env.ATLASDB_URL;
app.use(cors());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ limit: "50kb", extended: true }));

// Rate Limiter Middleware (Item 28)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 150;

const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, startTime: now });
        return next();
    }

    const record = requestCounts.get(ip);

    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
        requestCounts.set(ip, { count: 1, startTime: now });
        return next();
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ message: "Too many requests from this IP. Please try again later." });
    }

    record.count += 1;
    next();
};

app.use(rateLimiter);

app.use("/api/v1/users", UsersRoutes);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

server.listen(app.get("port"), () => {
    console.log("Server is running on port ", app.get("port"));
});

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.ATLASDB_URL);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};

connectDB();