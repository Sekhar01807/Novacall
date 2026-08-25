import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import { initializeSocketIO } from "./controllers/socketManager.js";
import UsersRoutes from "./routes/UsersRoutes.js";
import { openapiSpecification, renderSwaggerHTML } from "./docs/swaggerSpec.js";
import { logger } from "./utils/logger.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { ERROR_CODES, formatErrorResponse } from "./utils/errorCodes.js";
import { validateJwtSecretAtStartup } from "./utils/jwt.js";

dotenv.config();

// 0. Validate Critical Environment Configurations on Startup
try {
    validateJwtSecretAtStartup();
} catch (err) {
    logger.error("Startup Configuration Error:", err);
    if (process.env.NODE_ENV === "production") {
        process.exit(1);
    }
}

const app = express();
const server = createServer(app);
const io = initializeSocketIO(server);

const API_VERSION = "1.0.0";
app.set("port", process.env.PORT || 8000);

// 1. Request ID & Correlation ID Middleware (applies to all incoming requests)
app.use(requestIdMiddleware);

// 2. HTTP Security Headers Middleware (Production-Grade Protection + CSP)
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    // Content-Security-Policy: Strict origin policy for React SPA, WebSockets, Google Fonts, and MUI styling
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'self' ws: wss:; base-uri 'self'; object-src 'none';"
    );
    next();
});

// 3. API Version Header Middleware
app.use((req, res, next) => {
    res.setHeader("X-API-Version", API_VERSION);
    next();
});

// 4. Configurable CORS for Production & Local Development
const DEFAULT_ALLOWED_ORIGINS = [
    "https://novacall-two.vercel.app",
    "https://novacall-backend.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000"
];

const configuredOrigins = process.env.FRONTEND_URL
    ? (process.env.FRONTEND_URL.includes(",")
        ? process.env.FRONTEND_URL.split(",").map(o => o.trim()).filter(Boolean)
        : [process.env.FRONTEND_URL.trim()])
    : DEFAULT_ALLOWED_ORIGINS;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server, health checks)
        if (!origin) return callback(null, true);
        // Allow in dev or if wildcard is explicitly configured
        if (configuredOrigins.includes("*") || process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }
        // Allow configured origins or Vercel preview deployments
        if (configuredOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
            return callback(null, true);
        }
        logger.warn(`CORS rejected request from origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Correlation-Id"],
    exposedHeaders: ["X-Request-Id", "X-Correlation-Id", "X-API-Version"]
}));

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ limit: "50kb", extended: true }));
app.use(cookieParser());

/**
 * Single-Instance In-Memory HTTP Rate Limiter
 * 
 * Architecture Note:
 * This rate limiter utilizes an in-process Map tracking sliding request counts per IP.
 * - Current deployment model: Single-instance container / Node process.
 * - Horizontal Scaling / Multi-Instance Migration: For multi-replica clustered deployments,
 *   replace this in-memory Map with a centralized Redis key-value store (e.g., rate-limit-redis)
 *   or an API Gateway / reverse proxy rate-limiting tier (e.g., Cloudflare, NGINX limit_req).
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 200; // 200 requests / 15 min per IP

// Periodic memory cleanup for stale IP rate limit records
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
            requestCounts.delete(ip);
        }
    }
}, RATE_LIMIT_WINDOW_MS).unref();

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
        return res.status(429).json(
            formatErrorResponse("Too many requests from this IP. Please try again later.", ERROR_CODES.RATE_LIMIT_EXCEEDED, req.id)
        );
    }

    record.count += 1;
    next();
};

app.use(rateLimiter);

// Health Check Endpoint with Version and DB State (Returns 503 if DB disconnected)
app.get("/health", (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json({
        status: isDbConnected ? "ok" : "degraded",
        version: API_VERSION,
        uptime: Math.floor(process.uptime()),
        database: isDbConnected ? "connected" : "disconnected",
        requestId: req.id,
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

// Versioned API Routes (v1)
app.use("/api/v1/users", UsersRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "NovaCall API Service Active",
        version: API_VERSION,
        docs: "/api/docs",
        health: "/health",
        requestId: req.id
    });
});

// 5. 404 Route Not Found Handler (catches unmatched API routes)
app.use(notFoundHandler);

// 6. Centralized Global Error Handler Middleware
app.use(errorHandler);

// Database Connection
const connectDB = async () => {
    const dbUrl = process.env.ATLASDB_URL;
    if (!dbUrl) {
        logger.warn("ATLASDB_URL environment variable is not defined.");
        return;
    }
    try {
        await mongoose.connect(dbUrl, {
            dbName: process.env.DB_NAME || "novacall"
        });
        logger.info(`Connected to MongoDB successfully (Database: "${mongoose.connection.name}")`);
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