const mongoose = require("mongoose");

const workoutSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    exercise: { type: String, required: true },
    weight: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    setIndex: { type: Number, required: true },
    date: { type: Date, required: true }
});

// 🛡️ Compound index for absolute duplicate prevention per user
workoutSchema.index({ userId: 1, exercise: 1, date: 1, setIndex: 1 }, { unique: true });

// 📊 Index for date sorting and fast latest-session isolation per user
workoutSchema.index({ userId: 1, date: -1 });

// 🏋️ Index for exercise history tracking and analytics per user
workoutSchema.index({ userId: 1, exercise: 1, date: -1 });

// 📅 Index for session-based queries
workoutSchema.index({ sessionId: 1 });

module.exports = mongoose.model("Workout", workoutSchema);