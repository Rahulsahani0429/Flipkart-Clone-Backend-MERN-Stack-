import fs from 'fs';

const categories = [
  { name: 'Mobiles', brands: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Vivo', 'Oppo', 'Realme', 'Nothing', 'Motorola'], basePrice: 30000, variance: 100000 },
  { name: 'Electronics', brands: ['Sony', 'Dell', 'HP', 'Asus', 'Lenovo', 'LG', 'MSI', 'Acer', 'Microsoft', 'Razer'], basePrice: 20000, variance: 150000 },
  { name: 'Fashion', brands: ['Nike', 'Adidas', 'Puma', 'Levis', 'Zara', 'H&M', 'Raymond', 'Allen Solly', 'Biba', 'FabIndia'], basePrice: 500, variance: 10000 },
  { name: 'Home & Furniture', brands: ['IKEA', 'Urban Ladder', 'Pepperfry', 'Home Centre', 'Sleepwell', 'Duroflex', 'Nilkamal', 'Godrej Interio'], basePrice: 1000, variance: 50000 },
  { name: 'Appliances', brands: ['LG', 'Samsung', 'Whirlpool', 'Haier', 'Daikin', 'Philips', 'Bajaj', 'Prestige', 'Havells', 'Kent'], basePrice: 2000, variance: 60000 },
  { name: 'Grocery', brands: ['Tata', 'Amul', 'Nestle', 'Britannia', 'Hindustan Unilever', 'ITC', 'Dabur', 'Reliance', 'Happilo', 'Organic India'], basePrice: 50, variance: 5000 },
  { name: 'Beauty', brands: ['Lakme', 'L Oreoal', 'Maybelline', 'MAC', 'Clinique', 'Estee Lauder', 'Neutrogena', 'Mamaearth', 'The Body Shop'], basePrice: 100, variance: 5000 },
  { name: 'Wearables', brands: ['Apple', 'Samsung', 'Fitbit', 'Garmin', 'Fossil', 'Noise', 'boAt', 'Amazfit'], basePrice: 1500, variance: 40000 },
  { name: 'Travel', brands: ['Samsonite', 'American Tourister', 'Wildcraft', 'Skybags', 'VIP', 'Safari', 'Mocobara'], basePrice: 1000, variance: 20000 },
  { name: 'Sports', brands: ['Decathlon', 'Yonex', 'Wilson', 'Spalding', 'Nivea', 'Cosco', 'Speedo', 'Powermax'], basePrice: 200, variance: 40000 },
  { name: 'Books', brands: ['Penguin', 'HarperCollins', 'Scholastic', 'Oxford', 'Pearson', 'Rupa', 'Westland'], basePrice: 100, variance: 2000 }
];

const products = [];
let imgId = 10;

for (let i = 1; i <= 310; i++) {
  const cat = categories[i % categories.length];
  const brand = cat.brands[Math.floor(Math.random() * cat.brands.length)];
  const price = Math.floor(cat.basePrice + Math.random() * cat.variance);

  const productImages = [];
  for (let j = 0; j < 5; j++) {
    productImages.push(`https://picsum.photos/seed/${imgId++}/800/800`);
  }

  products.push({
    name: `${brand} ${cat.name} ${Math.floor(Math.random() * 1000)}`,
    image: productImages[0],
    images: productImages,
    description: `High-quality ${cat.name.toLowerCase()} from ${brand}. This product is designed to provide maximum ${['comfort', 'performance', 'utility', 'style'][Math.floor(Math.random() * 4)]} and durability for your daily needs.`,
    brand: brand,
    category: cat.name,
    price: price,
    countInStock: Math.floor(Math.random() * 100),
    isFeatured: Math.random() > 0.8,
    rating: Number((3 + Math.random() * 2).toFixed(1)),
    numReviews: Math.floor(Math.random() * 1000)
  });
}

const seederContent = `import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Product from "./models/Product.js";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const products = ${JSON.stringify(products, null, 2)};

const importData = async () => {
  try {
    await Product.deleteMany();
    await User.deleteMany();

    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      isAdmin: true,
    });

    const sampleProducts = products.map((product) => {
      return { ...product, user: adminUser._id };
    });

    await Product.insertMany(sampleProducts);

    console.log("Data Imported!");
    process.exit();
  } catch (error) {
    console.error(\`\${error}\`);
    process.exit(1);
  }
};

importData();`;

fs.writeFileSync('seeder.js', seederContent);
