import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/swiftpharma";
  await mongoose.connect(uri);
  return mongoose.connection;
};

export default connectDB;
