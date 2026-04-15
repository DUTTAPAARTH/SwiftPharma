import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const run = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Atlas connection successful — host: ${conn.connection.host}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
