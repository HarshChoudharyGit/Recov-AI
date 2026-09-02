import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import config from "./src/config/env.js";
import { dbOperations } from "./src/db/index.js";
import { syncActivePaymentLinks } from "./src/services/razorpay.js";
import { createApiRouter } from "./src/routes/api.js";
import { createDemoRouter } from "./src/routes/demo.js";
import {
    notFoundHandler,
    globalErrorHandler,
    registerProcessHandlers,
} from "./src/middleware/errorHandler.js";

// Register process-level crash handlers
registerProcessHandlers();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── SSE (Server-Sent Events) ───────────────────────────
const sseClients = new Set();

const broadcastSSE = (eventType, data) => {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try {
            client.write(payload);
        } catch {
            sseClients.delete(client);
        }
    }
};

app.get("/api/v1/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.add(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ message: "SSE connected" })}\n\n`);

    req.on("close", () => {
        sseClients.delete(res);
    });
});

// ─── Mount Route Modules ────────────────────────────────
app.use("/api/v1", createApiRouter(broadcastSSE));
app.use("/api/v1/demo", createDemoRouter(broadcastSSE));

// ─── Error Handling ─────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Background Sync ────────────────────────────────────
setInterval(() => syncActivePaymentLinks(dbOperations, broadcastSSE), 4000);

// ─── Start Server ───────────────────────────────────────
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` ⚡ RecovAI Dashboard running at http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});