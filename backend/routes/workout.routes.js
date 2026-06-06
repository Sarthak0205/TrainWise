const express = require("express");
const multer = require("multer");
const workoutController = require("../controllers/workout.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to protect all workout routes
router.use(authMiddleware);

// Multer setup with strict size limits and MIME-type/extension validation
const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 10 * 1024 * 1024 // Strict 10MB file limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel"];
        const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);
        const isExtensionValid = file.originalname.toLowerCase().endsWith(".csv");
        
        if (!isMimeTypeValid || !isExtensionValid) {
            return cb(new Error("Invalid file type. Only CSV files (.csv) are accepted."), false);
        }
        cb(null, true);
    }
});

// Helper route wrapper to intercept and format Multer parsing exceptions
const handleUploadParsing = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            let message = err.message || "CSV upload failed";
            if (err.code === "LIMIT_FILE_SIZE") {
                message = "File size limit exceeded. Maximum upload size allowed is 10MB.";
            }
            return res.status(400).json({
                success: false,
                message: message
            });
        }
        next();
    });
};

// 📤 Ingest CSV history (handles validation, deduplication, and immediate cleanup)
router.post("/upload", handleUploadParsing, workoutController.uploadCSV);

// 📊 Analyze current session fatigue and movement volume redundant checks
router.get("/analyze", workoutController.getWorkoutAnalysis);

// 🏋️ Get dynamic progressive overload set recommendations
router.get("/recommendations", workoutController.getWorkoutRecommendations);

// 📊 Dashboard overall summary metrics
router.get("/dashboard/summary", workoutController.getDashboardSummary);

// 📅 Paginated session history
router.get("/dashboard/sessions", workoutController.getSessionHistory);

// 📈 Specific exercise trends and stats
router.get("/analytics/exercise/:exercise", workoutController.getExerciseAnalytics);

module.exports = router;