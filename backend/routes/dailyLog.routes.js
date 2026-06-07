const express = require("express");
const dailyLogController = require("../controllers/dailyLog.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to protect all daily log routes
router.use(authMiddleware);

// Define endpoints
router.post("/", dailyLogController.createOrUpdate);
router.get("/today", dailyLogController.getToday);
router.get("/recent", dailyLogController.getRecent);
router.get("/range", dailyLogController.getRange);

module.exports = router;
