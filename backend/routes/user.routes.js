const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// 🔓 Public Authentication Routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// 🔒 Protected User Domain Routes (Protected by JWT validation middleware)
router.get("/me", authMiddleware, userController.getMe);
router.put("/profile", authMiddleware, userController.updateProfile);

module.exports = router;
