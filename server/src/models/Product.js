import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    brand: String,
    manufacturer: String,
    composition: String,
    strength: String,
    packSize: String,
    substitutes: [String],
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    prescriptionRequired: { type: Boolean, default: false },
    isRx: { type: Boolean, default: false },
    altGenerics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    stock: { type: Number, default: 0 },
    images: [String],
    sku: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

export default mongoose.model("Product", productSchema);
