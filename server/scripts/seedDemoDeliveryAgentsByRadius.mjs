import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import AgentLocation from "../src/models/AgentLocation.js";

dotenv.config({ path: ".env" });

const CENTER = { lat: 22.5726, lng: 88.3639 };

const AGENTS = [
  {
    name: "Demo Agent Strict",
    email: "demo.agent.strict@swiftpharma.com",
    phone: "9000001001",
    radiusBand: "strict",
    targetDistanceKm: 4.5,
  },
  {
    name: "Demo Agent Default",
    email: "demo.agent.default@swiftpharma.com",
    phone: "9000001002",
    radiusBand: "default",
    targetDistanceKm: 10.8,
  },
  {
    name: "Demo Agent Emergency",
    email: "demo.agent.emergency@swiftpharma.com",
    phone: "9000001003",
    radiusBand: "emergency",
    targetDistanceKm: 14.2,
  },
];

const kmToLatitudeDelta = (km) => km / 111.32;

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const now = new Date();
  const seeded = [];

  for (const agent of AGENTS) {
    let user = await User.findOne({ email: agent.email });

    if (!user) {
      user = await User.create({
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        role: "delivery",
        // Demo-only placeholder hash-like value; login for these users is not required for assignment tests.
        passwordHash: "demo-delivery-placeholder-hash",
      });
    } else {
      user.name = agent.name;
      user.phone = agent.phone;
      user.role = "delivery";
      user.suspended = false;
      await user.save();
    }

    const lat = Number((CENTER.lat + kmToLatitudeDelta(agent.targetDistanceKm)).toFixed(6));
    const lng = CENTER.lng;

    await AgentLocation.findOneAndUpdate(
      { agentId: user._id },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
          updatedAt: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    seeded.push({
      userId: String(user._id),
      name: user.name,
      email: user.email,
      radiusBand: agent.radiusBand,
      targetDistanceKm: agent.targetDistanceKm,
      lat,
      lng,
    });
  }

  const near = await AgentLocation.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [CENTER.lng, CENTER.lat],
        },
        distanceField: "distanceMeters",
        spherical: true,
        maxDistance: 20000,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "agentId",
        foreignField: "_id",
        as: "agent",
      },
    },
    { $unwind: "$agent" },
    { $match: { "agent.email": { $regex: "^demo\.agent\.", $options: "i" } } },
    { $project: { _id: 0, name: "$agent.name", email: "$agent.email", distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] } } },
    { $sort: { distanceKm: 1 } },
  ]);

  console.log(
    JSON.stringify(
      {
        success: true,
        center: CENTER,
        seededCount: seeded.length,
        seeded,
        demoAgentsByDistance: near,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to seed demo delivery agents:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
