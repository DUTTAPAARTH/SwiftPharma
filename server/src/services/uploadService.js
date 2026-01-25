import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = async (filePath) => {
  return cloudinary.uploader.upload(filePath, {
    folder: "swiftpharma-prescriptions",
  });
};

// Stream upload from in-memory buffer to avoid temp files
export const uploadBufferToCloudinary = (buffer, filename = "rx") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "swiftpharma-prescriptions", public_id: filename },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });
