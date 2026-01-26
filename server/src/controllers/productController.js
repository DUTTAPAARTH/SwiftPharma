import Product from "../models/Product.js";
import Category from "../models/Category.js";

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

    return res.json(products);
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
    return res.json(product);
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

    return res.json(products);
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

    return res.json(products);
  } catch (error) {
    console.error("searchProducts error", error);
    return res.status(500).json({ message: "Failed to search products" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (error) {
    console.error("createProduct error", error);
    return res.status(500).json({ message: "Failed to create product" });
  }
};
