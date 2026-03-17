import Product from "../models/Product.js";
import { createNotification } from "../services/notificationService.js";

/**
 * GET /api/products
 * Query: keyword, category, brand, minPrice, maxPrice, isFeatured, sort, page, limit
 */
const getProducts = async (req, res) => {
  try {
    const query = {};

    if (req.query.keyword) {
      query.$or = [
        { name: { $regex: req.query.keyword.trim(), $options: "i" } },
        { description: { $regex: req.query.keyword.trim(), $options: "i" } },
        { brand: { $regex: req.query.keyword.trim(), $options: "i" } },
      ];
    }

    if (req.query.category) {
      query.category = { $regex: `^${req.query.category.trim()}$`, $options: "i" };
    }
    if (req.query.subcategory) {
      query.subcategory = { $regex: `^${req.query.subcategory.trim()}$`, $options: "i" };
    }

    if (req.query.brand) {
      query.brand = { $regex: `^${req.query.brand.trim()}$`, $options: "i" };
    }

    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    if (req.query.isFeatured !== undefined) {
      query.isFeatured = req.query.isFeatured === "true";
    }

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { rating: -1 },
      newest: { createdAt: -1 },
    };
    const sortOption = sortMap[req.query.sort] || { createdAt: -1 };

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 24);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({ products, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    console.error("Get Products Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** GET /api/products/categories */
const getCategories = async (req, res) => {
  try {
    const cats = await Product.distinct("category");
    return res.status(200).json(cats.filter(Boolean).sort());
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** GET /api/products/brands?category=Mobiles */
const getBrands = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = { $regex: `^${req.query.category.trim()}$`, $options: "i" };
    }
    const brands = await Product.distinct("brand", filter);
    return res.status(200).json(brands.filter(Boolean).sort());
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** GET /api/products/:id */
const getProductById = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.status(200).json(product);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** POST /api/products */
const createProduct = async (req, res) => {
  try {
    const product = new Product({
      name: "Sample name", price: 0, user: req.user._id,
      image: "/images/sample.jpg", brand: "Sample brand",
      category: "Sample category", subcategory: "Sample subcategory", countInStock: 0, numReviews: 0,
      description: "Sample description",
    });
    const created = await product.save();
    return res.status(201).json({ message: "Product created successfully", product: created });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** PUT /api/products/:id */
const updateProduct = async (req, res) => {
  try {
    const { name, price, description, image, brand, category, subcategory, countInStock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.name = name?.trim() || product.name;
    product.price = price ?? product.price;
    product.description = description || product.description;
    product.image = image || product.image;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    product.subcategory = subcategory || product.subcategory;
    product.countInStock = countInStock ?? product.countInStock;

    const updated = await product.save();

    if (updated.countInStock < 5) {
      await createNotification({
        type: "low_stock", title: "Low Stock Alert",
        message: `"${updated.name}" is low in stock (${updated.countInStock} left).`,
        meta: { productId: updated._id, countInStock: updated.countInStock },
      });
    }
    return res.status(200).json({ message: "Product updated successfully", product: updated });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** DELETE /api/products/:id */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await product.deleteOne();
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export { getProducts, getCategories, getBrands, getProductById, createProduct, updateProduct, deleteProduct };
