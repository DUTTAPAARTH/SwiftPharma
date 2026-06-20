import { v2 as cloudinary } from "cloudinary";

const readEnv = (key) => String(process.env[key] || "").trim();

cloudinary.config({
  cloud_name: readEnv("CLOUDINARY_CLOUD_NAME"),
  api_key: readEnv("CLOUDINARY_API_KEY"),
  api_secret: readEnv("CLOUDINARY_API_SECRET"),
});

export default cloudinary;

