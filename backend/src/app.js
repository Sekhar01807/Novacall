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