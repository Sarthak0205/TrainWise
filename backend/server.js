const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// 1. Configure restricted CORS based on environment configuration
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const allowedOrigins = [
    clientUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());

// 2. Startup uploads folder cleanup and recreation
const uploadsDir = path.join(__dirname, "uploads");
try {
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            // Ensure we only delete files, not nested folders (just in case)
            if (fs.lstatSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
        console.log("🗑️ Cleaned up orphaned temporary files in uploads/");
    } else {
        fs.mkdirSync(uploadsDir);
        console.log("📁 Created uploads/ directory");
    }
} catch (err) {
    console.error("⚠️ Startup uploads folder cleanup/creation failed:", err.message);
    // Never fail startup due to filesystem cleanup errors
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    });

// Test Routes
app.get("/", (req, res) => {
    res.send("Workout AI Backend Running 🚀");
});

app.post("/test", (req, res) => {
    console.log("TEST HIT");
    res.send("POST working ✅");
});

// Dedicated route to test the global error-handling middleware
app.get("/api/test-error", (req, res, next) => {
    next(new Error("Test global error catcher"));
});

// Main Routes
const workoutRoutes = require("./routes/workout.routes");
const userRoutes = require("./routes/user.routes");
const coachingRoutes = require("./routes/coaching.routes");
const dailyLogRoutes = require("./routes/dailyLog.routes");

app.use("/api/workouts", workoutRoutes);
app.use("/api/users", userRoutes); // Mounted user domain routes
app.use("/api/coaching", coachingRoutes);
app.use("/api/daily-log", dailyLogRoutes);

// ML Insights Routes (Objective 5)
const authMiddleware = require("./middleware/auth.middleware");

app.get("/api/analytics/ml/feature-importance", authMiddleware, async (req, res, next) => {
    try {
        const mlBaseUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8080";
        const response = await fetch(`${mlBaseUrl}/ml/feature-importance`);
        if (!response.ok) {
            return res.status(503).json({ success: false, message: "ML service feature-importance endpoint unavailable." });
        }
        const data = await response.json();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

app.get("/api/analytics/ml/performance", authMiddleware, async (req, res, next) => {
    try {
        const mlBaseUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8080";
        const response = await fetch(`${mlBaseUrl}/ml/performance`);
        if (!response.ok) {
            return res.status(503).json({ success: false, message: "ML service performance endpoint unavailable." });
        }
        const data = await response.json();
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// 3. Global Express Error-handling Middleware
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    console.error("💥 Unhandled Express Error:", err.stack || err);
    
    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

// Server Start
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});