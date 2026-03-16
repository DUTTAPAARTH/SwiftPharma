import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dotenv.config({ path: ".env" });

const [, , emailArg, roleArg] = process.argv;
const email = String(emailArg || "")
  .trim()
  .toLowerCase();
const role = String(roleArg || "admin")
  .trim()
  .toLowerCase();
const ALLOWED_ROLES = ["admin", "pharmacist"];

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in server/.env");
    process.exit(1);
  }

  if (!email) {
    console.error(
      "Usage: node scripts/makeAdmin.js <email> [admin|pharmacist]",
    );
    process.exit(1);
  }

  if (!ALLOWED_ROLES.includes(role)) {
    console.error(`Role must be one of: ${ALLOWED_ROLES.join(", ")}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    console.log(`Role updated for ${email}: ${previousRole} -> ${role}`);
  } catch (error) {
    console.error("Failed to update user role:", error.message || error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
