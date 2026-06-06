const express = require("express");
const coachingController = require("../controllers/coaching.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to protect all coaching routes
router.use(authMiddleware);

// Endpoint definitions
router.get("/readiness", coachingController.getReadiness);
router.get("/consistency", coachingController.getConsistency);
router.get("/plateaus", coachingController.getPlateaus);
router.get("/recovery", coachingController.getRecovery);
router.get("/summary", coachingController.getSummary);

module.exports = router;
