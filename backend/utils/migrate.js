require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Workout = require("../models/workout.model");
const User = require("../models/user.model");
const Session = require("../models/session.model");

async function runMigration() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected successfully");

        // 1. Ensure Default User exists
        const hashedPassword = await bcrypt.hash("password123", 10);
        const defaultEmail = "default@fitness.com";
        let defaultUser = await User.findOne({ email: defaultEmail }).select("+password");
        if (!defaultUser) {
            defaultUser = await User.create({
                email: defaultEmail,
                password: hashedPassword,
                name: "Default User",
                experienceLevel: "intermediate",
                goalType: "hypertrophy",
                preferredUnits: "kg"
            });
            console.log("👤 Created default dev user:", defaultUser.email);
        } else {
            if (!defaultUser.password) {
                defaultUser.password = hashedPassword;
                await defaultUser.save();
                console.log("🔑 Updated default dev user password");
            }
            console.log("👤 Default dev user already exists:", defaultUser.email);
        }

        // 2. Identify and group orphaned workouts (lacking userId or sessionId) by date
        console.log("🔍 Scanning for unlinked workout sets...");
        const orphanedWorkouts = await Workout.find({
            $or: [
                { userId: { $exists: false } },
                { sessionId: { $exists: false } }
            ]
        });

        console.log(`📊 Found ${orphanedWorkouts.length} unlinked sets`);

        if (orphanedWorkouts.length > 0) {
            // Group by date (only dates)
            const datesMap = {};
            orphanedWorkouts.forEach(w => {
                const dateISO = w.date.toISOString();
                if (!datesMap[dateISO]) {
                    datesMap[dateISO] = [];
                }
                datesMap[dateISO].push(w);
            });

            console.log(`📅 Found ${Object.keys(datesMap).length} unique session dates to migrate`);

            let updatedCount = 0;
            for (const [dateStr, workouts] of Object.entries(datesMap)) {
                const date = new Date(dateStr);
                
                // Find or create session for default user on this date
                let session = await Session.findOne({ userId: defaultUser._id, date });
                if (!session) {
                    const dateOnlyStr = dateStr.split("T")[0];
                    session = await Session.create({
                        userId: defaultUser._id,
                        date,
                        name: `Workout Session on ${dateOnlyStr}`
                    });
                    console.log(`📅 Created session for date: ${dateOnlyStr}`);
                }

                // Update all workouts for this date to link to defaultUser and session
                const result = await Workout.updateMany(
                    {
                        _id: { $in: workouts.map(w => w._id) }
                    },
                    {
                        $set: {
                            userId: defaultUser._id,
                            sessionId: session._id
                        }
                    }
                );
                updatedCount += result.modifiedCount;
            }
            console.log(`✅ Successfully backfilled ${updatedCount} workouts with default user and session.`);
        } else {
            console.log("✨ All workout sets are already linked to users and sessions.");
        }

        // 3. Clean duplicates for the new compound index to prevent errors
        console.log("🔍 Scanning for duplicate workout sets under the new user-scoped schema...");
        const duplicates = await Workout.aggregate([
            {
                $group: {
                    _id: {
                        userId: "$userId",
                        exercise: "$exercise",
                        date: "$date",
                        setIndex: "$setIndex"
                    },
                    docs: { $push: "$_id" },
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`📊 Found ${duplicates.length} duplicate groups under new schema`);

        let prunedCount = 0;
        for (const group of duplicates) {
            const keepId = group.docs[0];
            const deleteIds = group.docs.slice(1);
            const result = await Workout.deleteMany({ _id: { $in: deleteIds } });
            prunedCount += result.deletedCount;
        }

        if (prunedCount > 0) {
            console.log(`🗑️ Pruned ${prunedCount} duplicate set entries under new schema.`);
        }

        // 3.5. Ensure demo_athlete exists and seed data if missing
        const demoEmail = "demo_athlete@fitness.com";
        let demoUser = await User.findOne({ email: demoEmail }).select("+password");
        if (!demoUser) {
            demoUser = await User.create({
                email: demoEmail,
                password: hashedPassword,
                name: "Demo Athlete",
                experienceLevel: "intermediate",
                goalType: "hypertrophy",
                preferredUnits: "kg"
            });
            console.log("👤 Created demo athlete user:", demoUser.email);
        } else {
            if (!demoUser.password) {
                demoUser.password = hashedPassword;
                await demoUser.save();
                console.log("🔑 Updated demo athlete user password");
            }
            console.log("👤 Demo athlete user already exists:", demoUser.email);
        }

        const demoWorkoutsCount = await Workout.countDocuments({ userId: demoUser._id });
        if (demoWorkoutsCount === 0) {
            console.log("🌱 Seeding demo_athlete with copied data from default user...");
            const defaultSessions = await Session.find({ userId: defaultUser._id });
            console.log(`📅 Found ${defaultSessions.length} sessions to clone`);
            
            for (const session of defaultSessions) {
                // Create session for demo athlete
                const newSession = await Session.create({
                    userId: demoUser._id,
                    date: session.date,
                    name: session.name
                });
                
                // Find all workouts for this session
                const sessionWorkouts = await Workout.find({ userId: defaultUser._id, sessionId: session._id });
                if (sessionWorkouts.length > 0) {
                    const clonedWorkouts = sessionWorkouts.map(w => ({
                        userId: demoUser._id,
                        sessionId: newSession._id,
                        exercise: w.exercise,
                        weight: w.weight,
                        reps: w.reps,
                        setIndex: w.setIndex,
                        date: w.date
                    }));
                    await Workout.insertMany(clonedWorkouts);
                }
            }
            console.log("✅ Demo athlete seeded successfully with cloned sessions and workouts.");
        } else {
            console.log("✨ Demo athlete is already seeded with data.");
        }

        // 4. Drop obsolete indexes and rebuild
        console.log("⚡ Dropping obsolete indexes to prevent collisions...");
        try {
            await Workout.collection.dropIndexes();
            console.log("✅ Obsolete indexes dropped");
        } catch (e) {
            console.log("⚠️ Index dropping skipped or failed:", e.message);
        }

        console.log("🏗️ Synchronizing new user-scoped Mongoose indexes...");
        await User.syncIndexes();
        await Session.syncIndexes();
        await Workout.syncIndexes();
        console.log("✅ All indexes built successfully");

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

runMigration();
