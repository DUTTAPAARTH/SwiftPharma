import Category from "../models/Category.js";
import Product from "../models/Product.js";

export const listCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat._id });
        return {
          ...cat.toObject(),
          productCount: count,
        };
      }),
    );

    return res.json(categoriesWithCount);
  } catch (error) {
    console.error("listCategories error", error);
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    return res.status(201).json(category);
  } catch (error) {
    console.error("createCategory error", error);
    return res.status(500).json({ message: "Failed to create category" });
  }
};

