import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import bcrypt from "bcryptjs";

dotenv.config();

const seedUsers = async () => {
  try {
    await connectDB();
    console.log("🔄 Seeding test users...");

    // Clear existing users (optional - comment out to preserve)
    // await User.deleteMany({});

    const testUsers = [
      {
        name: "Test User",
        email: "test@swiftpharma.com",
        password: "Test@123",
        phone: "9876543210",
        role: "customer",
      },
      {
        name: "Demo User",
        email: "demo@swiftpharma.com",
        password: "Demo@123",
        phone: "9876543211",
        role: "customer",
      },
    ];

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          passwordHash: hashedPassword,
        });
        await user.save();
        console.log(`✅ Created user: ${userData.email}`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
    }

    console.log("✅ User seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
