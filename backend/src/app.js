import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import { initializeSocketIO } from "./controllers/socketManager.js";
import UsersRoutes from "./routes/UsersRoutes.js";
import { openapiSpecification, renderSwaggerHTML } from "./docs/swaggerSpec.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = initializeSocketIO(server);

app.set("port", process.env.PORT || 8000);

// Configurable CORS for Production & Local Development
const rawOrigins = process.env.FRONTEND_URL || "*";
const allowedOrigins = rawOrigins.includes(",") ? rawOrigins.split(",").map(o => o.trim()) : rawOrigins;

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ limit: "50kb", extended: true }));

// Rate Limiter Middleware
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 200;

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
        return res.status(429).json({
            success: false,
            message: "Too many requests from this IP. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED"
        });
    }

    record.count += 1;
    next();
};

app.use(rateLimiter);

// Health Check Endpoint
app.get("/health", (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(200).json({
        status: isDbConnected ? "ok" : "degraded",
        uptime: Math.floor(process.uptime()),
        database: isDbConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

// Interactive Swagger / OpenAPI Documentation
app.get("/api/docs", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(renderSwaggerHTML(openapiSpecification));
});

app.get("/api/openapi.json", (req, res) => {
    res.json(openapiSpecification);
});

// API Routes
app.use("/api/v1/users", UsersRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "NovaCall API Service Active",
        docs: "/api/docs",
        health: "/health"
    });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
    logger.error("Unhandled Application Error", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        code: err.code || "INTERNAL_SERVER_ERROR"
    });
});

// Database Connection
const connectDB = async () => {
    const dbUrl = process.env.ATLASDB_URL;
    if (!dbUrl) {
        logger.warn("ATLASDB_URL environment variable is not defined.");
        return;
    }
    try {
        await mongoose.connect(dbUrl);
        logger.info("Connected to MongoDB Atlas successfully");
    } catch (error) {
        logger.error("Failed to connect to MongoDB:", error);
    }
};

connectDB();

const httpServer = server.listen(app.get("port"), () => {
    logger.info(`NovaCall server listening on port ${app.get("port")}`);
    logger.info(`OpenAPI Documentation available at http://localhost:${app.get("port")}/api/docs`);
    logger.info(`Health check endpoint at http://localhost:${app.get("port")}/health`);
});

// Graceful Shutdown Handler (SIGTERM & SIGINT)
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    httpServer.close(async () => {
        logger.info("HTTP & Socket.IO servers closed.");
        try {
            await mongoose.connection.close(false);
            logger.info("MongoDB connection closed cleanly.");
            process.exit(0);
        } catch (err) {
            logger.error("Error closing MongoDB connection:", err);
            process.exit(1);
        }
    });

    // Force exit if shutdown hangs beyond 10s
    setTimeout(() => {
        logger.error("Graceful shutdown timeout exceeded. Forcing process exit.");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));