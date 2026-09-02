/**
 * Global error-handling middleware for Express.
 * Catches unhandled route errors and returns structured JSON responses.
 */

// 404 handler — called when no route matches
export function notFoundHandler(req, res, _next) {
    res.status(404).json({
        success: false,
        error: "Not Found",
        message: `No route matches ${req.method} ${req.originalUrl}`,
    });
}

// Global error handler — must have 4 arguments for Express to recognize it
export function globalErrorHandler(err, req, res, _next) {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`\n❌ [ERROR] ${req.method} ${req.originalUrl}`);
    console.error(`   Status: ${statusCode}`);
    console.error(`   Message: ${message}`);
    if (process.env.NODE_ENV !== "production") {
        console.error(`   Stack: ${err.stack}\n`);
    }

    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? "Internal Server Error" : message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
}

/**
 * Wraps an async route handler so rejected promises are forwarded
 * to Express error handling instead of crashing the process.
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Registers process-level handlers for uncaught exceptions and
 * unhandled promise rejections. Call once at startup.
 */
export function registerProcessHandlers() {
    process.on("uncaughtException", (err) => {
        console.error("\n💥 [FATAL] Uncaught Exception:", err.message);
        console.error(err.stack);
        // Give time for logs to flush, then exit
        setTimeout(() => process.exit(1), 1000);
    });

    process.on("unhandledRejection", (reason) => {
        console.error("\n⚠️  [WARN] Unhandled Promise Rejection:", reason);
    });

    process.on("SIGTERM", () => {
        console.log("\n🛑 [SHUTDOWN] SIGTERM received. Shutting down gracefully...");
        process.exit(0);
    });

    process.on("SIGINT", () => {
        console.log("\n🛑 [SHUTDOWN] SIGINT received. Shutting down gracefully...");
        process.exit(0);
    });
}
