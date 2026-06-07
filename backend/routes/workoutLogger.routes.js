const express = require("express");
const workoutLoggerController = require("../controllers/workoutLogger.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to protect all workout logger routes
router.use(authMiddleware);

// Define endpoints
router.post("/", workoutLoggerController.saveWorkoutSession);
router.get("/exercises", workoutLoggerController.getExercises);
router.get("/reference", workoutLoggerController.getExerciseReference);

module.exports = router;
