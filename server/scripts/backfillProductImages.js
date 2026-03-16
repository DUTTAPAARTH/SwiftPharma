import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../src/models/Product.js";

dotenv.config({
  path: new URL("../.env", import.meta.url).pathname.replace(
    /^\/([A-Z]:)/,
    "$1",
  ),
});

const PRODUCT_PLACEHOLDER_URL =
  "https://via.placeholder.com/200x200/0a0f1e/00bcd4?text=%F0%9F%92%8A";

const getPrimaryImage = (product) => {
  if (product.image) {
    return product.image;
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }

  return PRODUCT_PLACEHOLDER_URL;
};

async function backfillProductImages() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/swiftpharma",
  );
  console.log("Connected to MongoDB");

  const cursor = Product.find(
    {
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: "" },
        { images: { $exists: false } },
        { images: { $size: 0 } },
      ],
    },
    { _id: 1, image: 1, images: 1 },
  ).cursor();

  const operations = [];
  let inspected = 0;

  for await (const product of cursor) {
    inspected += 1;
    const primaryImage = getPrimaryImage(product);
    operations.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            image: primaryImage,
            images:
              Array.isArray(product.images) && product.images.length > 0
                ? product.images
                : [primaryImage],
          },
        },
      },
    });

    if (operations.length >= 1000) {
      await Product.bulkWrite(operations, { ordered: false });
      console.log(`Processed ${inspected} products`);
      operations.length = 0;
    }
  }

  if (operations.length > 0) {
    await Product.bulkWrite(operations, { ordered: false });
  }

  console.log(`Backfill complete. Updated ${inspected} products.`);
  await mongoose.disconnect();
}

backfillProductImages().catch((error) => {
  console.error("Failed to backfill product images", error);
  process.exit(1);
});
