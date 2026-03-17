import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Product from "./models/Product.js";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const megaMenuData = [
  {
    title: "Fashion",
    subs: [
      { name: "MEN", items: ["General", "T-Shirts", "Casual Shirts", "Formal Shirts", "Sweatshirts", "Jackets", "Blazers & Coats", "Suits", "Rain Jackets"] },
      { name: "WOMEN", items: ["General", "Kurtas & Suits", "Kurtis", "Sarees", "Ethnic Wear", "Leggings & Salwars", "Dresses", "Tops", "Tshirts", "Jeans", "Trousers & Capris", "Shorts & Skirts"] },
      { name: "KIDS", items: ["General", "Boys Clothing", "Girls Clothing", "Toys"] }
    ]
  },
  {
    title: "Home & Furniture",
    subs: [
      { name: "Bed Linen", items: ["Bedspreads", "Bedsheets", "Blankets", "Pillow Covers"] },
      { name: "Bath", items: ["Towels", "Bath Rugs", "Hand Towels", "Laundry Bags"] },
      { name: "Decor", items: ["Plants", "Wall Decor", "Clocks", "Vases", "Mirrors"] }
    ]
  },
  {
    title: "Beauty",
    subs: [
      { name: "Makeup", items: ["Lipstick", "Lip Gloss", "Lip Liner", "Mascara", "Eyeliner"] },
      { name: "Skincare", items: ["Face Wash", "Cleanser", "Face Moisturizer", "Sunscreen"] }
    ]
  },
  {
    title: "Mobiles",
    subs: [
      { name: "Smartphones", items: ["iPhone", "Samsung Galaxy", "Google Pixel", "OnePlus", "Xiaomi"] },
      { name: "Accessories", items: ["Cases & Covers", "Screen Protectors", "Chargers", "Power Banks"] }
    ]
  },
  {
    title: "Electronics",
    subs: [
      { name: "Laptops", items: ["MacBook", "Dell XPS", "HP Spectre", "Lenovo ThinkPad", "Gaming Laptops"] },
      { name: "Audio", items: ["Headphones", "Earbuds", "Bluetooth Speakers", "Soundbars"] }
    ]
  },
  {
    title: "Appliances",
    subs: [
      { name: "Kitchen", items: ["Microwaves", "Refrigerators", "Juicers", "Toasters"] },
      { name: "Home", items: ["Vacuum Cleaners", "Air Purifiers", "Washing Machines"] }
    ]
  },
  { title: "GENZ", subs: [{ name: "General", items: ["Streetwear", "Oversized", "Graphic Tees", "Y2K Fashion"] }] },
  { title: "STUDIO", subs: [{ name: "General", items: ["Premium", "Designer", "Limited Edition"] }] },
  { title: "Grocery", subs: [{ name: "General", items: ["Essentials", "Snacks", "Beverages"] }] },
  { title: "Sports", subs: [{ name: "General", items: ["Fitness", "Outdoor", "Shoes"] }] },
  { title: "Wearables", subs: [{ name: "General", items: ["Smartwatches", "Fitness Bands"] }] },
  { title: "Travel", subs: [{ name: "General", items: ["Luggage", "Backpacks"] }] },
  { title: "Books", subs: [{ name: "General", items: ["Fiction", "Non-Fiction", "Self-Help"] }] }
];

const generateProducts = () => {
  let generated = [];
  megaMenuData.forEach(menu => {
    menu.subs.forEach(sub => {
      // Create products for the subcategory name itself (e.g., subcategory: "MEN")
      // Only for Fashion so that ?category=Fashion&subcategory=MEN works
      if (menu.title === "Fashion") {
        for (let i = 1; i <= 10; i++) {
          generated.push({
            name: `${sub.name} Premium Item ${i}`,
            brand: "Fashion Hub",
            category: menu.title,
            subcategory: sub.name,
            price: Math.floor(Math.random() * 10000) + 999,
            image: `https://picsum.photos/seed/Fashion-${sub.name}-${i}/800/800`,
            countInStock: Math.floor(Math.random() * 100),
            description: `High-quality ${sub.name} product from our exclusive collection.`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            numReviews: Math.floor(Math.random() * 500)
          });
        }
      }

      sub.items.forEach(item => {
        if (item === "General") return; // Skip "General" as we handled it or it's just a placeholder
        for (let i = 1; i <= 10; i++) {
          generated.push({
            name: `${sub.name === 'General' ? '' : sub.name} ${item} ${i}`,
            brand: "BrandX",
            category: menu.title,
            subcategory: item,
            price: Math.floor(Math.random() * 50000) + 499,
            image: `https://picsum.photos/seed/${menu.title}-${item}-${i}/800/800`,
            countInStock: Math.floor(Math.random() * 100),
            description: `Premium ${item} in ${menu.title} category. High quality product from BrandX.`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            numReviews: Math.floor(Math.random() * 1000)
          });
        }
      });
    });
  });
  return generated;
};

const products = [
  ...generateProducts(),
  {
    name: "Men Casual T-Shirt Black",
    brand: "Nike",
    category: "MEN",
    subcategory: "T-Shirts",
    price: 999,
    image: "https://picsum.photos/seed/tshirt1/800/800",
    countInStock: 20,
    description: "Comfortable and stylish casual t-shirt for men.",
    numReviews: 12,
    rating: 4.5
  },
  {
    name: "Men Slim Fit Jeans",
    brand: "Levis",
    category: "MEN",
    subcategory: "Jeans",
    price: 2499,
    image: "https://picsum.photos/seed/jeans1/800/800",
    countInStock: 15,
    description: "Premium slim fit jeans for a modern look.",
    numReviews: 8,
    rating: 4.2
  },
  {
    name: "Women Floral Dress",
    brand: "Zara",
    category: "WOMEN",
    subcategory: "Dresses",
    price: 1999,
    image: "https://picsum.photos/seed/dress1/800/800",
    countInStock: 10,
    description: "Elegant floral dress for any occasion.",
    numReviews: 15,
    rating: 4.8
  }
];

const importData = async () => {
  try {
    await Product.deleteMany();

    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) {
      console.error("No admin user found. Create an admin user first.");
      process.exit(1);
    }

    const sampleProducts = products.map((product) => {
      return {
        ...product,
        user: adminUser._id,
      };
    });

    await Product.insertMany(sampleProducts);

    console.log(`${sampleProducts.length} products seeded successfully!`);
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

importData();
