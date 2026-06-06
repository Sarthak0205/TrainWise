const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

/**
 * Registers a new user with hashed passwords
 */
async function register(req, res, next) {
    try {
        const { email, password, name } = req.body;

        // 🛡️ 1. Basic validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: "Missing credentials. Name, email, and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 🛡️ 2. Duplicate validation
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email address is already in use by another account."
            });
        }

        // 🔄 3. Hash password and save
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await User.create({
            email: normalizedEmail,
            password: hashedPassword,
            name: name.trim(),
            goalType: "hypertrophy",
            experienceLevel: "intermediate",
            preferredUnits: "kg"
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully. Please proceed to log in."
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Log in a user and issue a JWT token
 */
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user and explicitly select password since select: false excludes it by default
        const user = await User.findOne({ email: normalizedEmail }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Sign JWT payload
        const jwtSecret = process.env.JWT_SECRET || "default_super_secret_key_workout_ai";
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

        const token = jwt.sign(
            { id: user._id },
            jwtSecret,
            { expiresIn: jwtExpiresIn }
        );

        return res.json({
            success: true,
            message: "Authentication successful",
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                goalType: user.goalType,
                experienceLevel: user.experienceLevel,
                preferredUnits: user.preferredUnits
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Gets authenticated user profile details from token context
 */
async function getMe(req, res, next) {
    try {
        // req.user has already been resolved in authMiddleware
        return res.json({
            success: true,
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                goalType: req.user.goalType,
                experienceLevel: req.user.experienceLevel,
                preferredUnits: req.user.preferredUnits
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Updates the personalization parameters for the authenticated user
 */
async function updateProfile(req, res, next) {
    try {
        const { goalType, experienceLevel, preferredUnits } = req.body;

        const validGoalTypes = ["hypertrophy", "strength", "endurance"];
        const validExperienceLevels = ["beginner", "intermediate", "advanced"];
        const validUnits = ["kg", "lbs"];

        if (goalType && !validGoalTypes.includes(goalType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid goalType: "${goalType}". Supported values are: ${validGoalTypes.join(", ")}`
            });
        }

        if (experienceLevel && !validExperienceLevels.includes(experienceLevel)) {
            return res.status(400).json({
                success: false,
                message: `Invalid experienceLevel: "${experienceLevel}". Supported values are: ${validExperienceLevels.join(", ")}`
            });
        }

        if (preferredUnits && !validUnits.includes(preferredUnits)) {
            return res.status(400).json({
                success: false,
                message: `Invalid preferredUnits: "${preferredUnits}". Supported values are: ${validUnits.join(", ")}`
            });
        }

        const user = req.user;
        if (goalType) user.goalType = goalType;
        if (experienceLevel) user.experienceLevel = experienceLevel;
        if (preferredUnits) user.preferredUnits = preferredUnits;

        await user.save();

        console.log(`👤 Updated profile properties for user: ${user.name}`);

        return res.json({
            success: true,
            message: "Profile updated successfully",
            data: {
                email: user.email,
                name: user.name,
                goalType: user.goalType,
                experienceLevel: user.experienceLevel,
                preferredUnits: user.preferredUnits
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    login,
    getMe,
    updateProfile
};
