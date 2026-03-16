import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const PRODUCT_PLACEHOLDER_URL =
  "https://via.placeholder.com/200x200/0a0f1e/00bcd4?text=%F0%9F%92%8A";

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return value.toLowerCase() === "true";
};

const normalizeProduct = (product) => {
  const data =
    typeof product.toObject === "function" ? product.toObject() : product;
  const primaryImage =
    data.image || data.images?.[0] || PRODUCT_PLACEHOLDER_URL;

  return {
    ...data,
    image: primaryImage,
    images: data.images?.length ? data.images : [primaryImage],
  };
};

const resolveCategoryId = async (categoryValue) => {
  if (!categoryValue) return undefined;

  const categoryMatchers = [
    { slug: categoryValue },
    { name: { $regex: `^${categoryValue}$`, $options: "i" } },
  ];

  if (mongoose.Types.ObjectId.isValid(categoryValue)) {
    categoryMatchers.unshift({ _id: categoryValue });
  }

  const categoryDoc = await Category.findOne({
    $or: categoryMatchers,
  });

  return categoryDoc?._id;
};

export const listProducts = async (req, res) => {
  try {
    const { limit = 20, skip = 0, category, search } = req.query;

    let query = {};

    if (category) {
      // Find category by name or ID
      const categoryDoc = await Category.findOne({
        $or: [{ name: { $regex: category, $options: "i" } }, { _id: category }],
      });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { composition: { $regex: search, $options: "i" } },
        { manufacturer: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(query)
      .populate("category")
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    return res.json(products.map(normalizeProduct));
  } catch (error) {
    console.error("listProducts error", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("altGenerics")
      .populate("category");
    if (!product) return res.status(404).json({ message: "Not found" });
    return res.json(normalizeProduct(product));
  } catch (error) {
    console.error("getProduct error", error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Find category by slug or name (case-insensitive)
    const category = await Category.findOne({
      $or: [
        { slug: categoryName },
        { slug: { $regex: categoryName, $options: "i" } },
        { name: { $regex: categoryName, $options: "i" } },
      ],
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const products = await Product.find({ category: category._id })
      .populate("category")
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    return res.json(products.map(normalizeProduct));
  } catch (error) {
    console.error("getProductsByCategory error", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q = "", limit = 20, skip = 0 } = req.query;

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { composition: { $regex: q, $options: "i" } },
        { manufacturer: { $regex: q, $options: "i" } },
      ],
    })
      .populate("category")
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    return res.json(products.map(normalizeProduct));
  } catch (error) {
    console.error("searchProducts error", error);
    return res.status(500).json({ message: "Failed to search products" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const categoryId = await resolveCategoryId(req.body.category);
    const imagePath = req.file
      ? `/uploads/products/${req.file.filename}`
      : undefined;

    const payload = {
      name: req.body.name,
      description: req.body.description,
      brand: req.body.brand,
      manufacturer: req.body.manufacturer,
      composition: req.body.composition,
      strength: req.body.strength,
      packSize: req.body.packSize,
      price: Number(req.body.price || 0),
      category: categoryId,
      prescriptionRequired: parseBoolean(
        req.body.requiresRx || req.body.prescriptionRequired,
      ),
      isRx: parseBoolean(
        req.body.requiresRx || req.body.prescriptionRequired || req.body.isRx,
      ),
      stock: Number(req.body.stock || 0),
    };

    const primaryImage = imagePath || req.body.image || PRODUCT_PLACEHOLDER_URL;
    payload.image = primaryImage;
    payload.images = [primaryImage];

    const product = await Product.create(payload);
    return res.status(201).json(normalizeProduct(product));
  } catch (error) {
    console.error("createProduct error", error);
    return res.status(500).json({ message: "Failed to create product" });
  }
};
