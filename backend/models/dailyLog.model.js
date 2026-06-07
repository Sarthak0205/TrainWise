const mongoose = require("mongoose");

const dailyLogSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    sleep: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    energy: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    soreness: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    stress: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    mood: { 
        type: Number, 
        required: true,
        min: 1,
        max: 5
    },
    bodyweight: { 
        type: Number 
    },
    trainingDay: { 
        type: Boolean, 
        required: true 
    },
    notes: { 
        type: String 
    },
    recoveryScore: {
        type: Number
    },
    recoveryContext: {
        type: String
    }
}, { timestamps: true });

// 📅 Prevent duplicate check-ins for the same user on the same date
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyLog", dailyLogSchema);
