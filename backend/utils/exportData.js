require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Workout = require("../models/workout.model");

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
}

async function exportData() {
    try {
        await connectDB();

        const workouts = await Workout.find();

        // ✅ Clean flat structure
        const cleanData = workouts.map(w => ({
            exercise: w.exercise,
            weight: w.weight,
            reps: w.reps,
            setIndex: w.setIndex,
            date: w.date
        }));

        const filePath = path.join(
            __dirname,
            "../ml-service/data/raw/workouts.json"
        );

        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2));

        console.log(`✅ Exported ${cleanData.length} sets`);

        await mongoose.disconnect();

    } catch (error) {
        console.error("❌ Export failed:", error);
    }
}

exportData();