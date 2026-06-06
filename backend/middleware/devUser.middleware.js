const User = require("../models/user.model");
const mongoose = require("mongoose");

async function devUserMiddleware(req, res, next) {
    const userIdVal = req.headers["x-user-id"] || req.query.userId;
    const goalType = req.headers["x-goal-type"] || req.query.goalType;
    const experienceLevel = req.headers["x-experience-level"] || req.query.experienceLevel;
    const preferredUnits = req.headers["x-preferred-units"] || req.query.preferredUnits;

    try {
        let user;
        if (userIdVal) {
            if (mongoose.Types.ObjectId.isValid(userIdVal)) {
                user = await User.findById(userIdVal);
            } else {
                const email = userIdVal.includes("@") ? userIdVal.trim() : `${userIdVal.trim()}@fitness.com`;
                user = await User.findOne({ email });
                if (!user) {
                    user = await User.create({
                        email,
                        name: userIdVal,
                        experienceLevel: experienceLevel || "intermediate",
                        goalType: goalType || "hypertrophy",
                        preferredUnits: preferredUnits || "kg"
                    });
                    console.log(`👤 Created new dev user: ${user.name}`);
                }
            }
        }

        if (!user) {
            // Fallback to demo athlete user
            const defaultEmail = "demo_athlete@fitness.com";
            user = await User.findOne({ email: defaultEmail });
            if (!user) {
                user = await User.create({
                    email: defaultEmail,
                    name: "Demo Athlete",
                    experienceLevel: "intermediate",
                    goalType: "hypertrophy",
                    preferredUnits: "kg"
                });
                console.log(`👤 Created demo athlete dev user`);
            }
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("❌ devUserMiddleware error:", error);
        res.status(500).json({ error: "Dev Auth Error", details: error.message });
    }
}

module.exports = devUserMiddleware;
