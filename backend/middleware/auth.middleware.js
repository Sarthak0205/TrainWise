const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * Authentication middleware that intercepts JWT tokens in the Authorization header.
 * Attaches the authenticated user model to req.user.
 */
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No authentication token provided."
            });
        }

        const token = authHeader.split(" ")[1];
        const jwtSecret = process.env.JWT_SECRET || "default_super_secret_key_workout_ai";

        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (jwtErr) {
            const msg = jwtErr.name === "TokenExpiredError" 
                ? "Session expired. Please log in again." 
                : "Invalid token. Access denied.";
            return res.status(401).json({
                success: false,
                message: msg
            });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication failed. User account not found."
            });
        }

        // Attach user context for down-stream controller handlers
        req.user = user;
        next();
    } catch (err) {
        next(err); // Pass down to Express global error handler
    }
}

module.exports = authMiddleware;
