import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Port   : ${conn.connection.port}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

// import mongoose from "mongoose";

// const connectDB = async () => {
//     try {
//         const conn = await mongoose.connect(process.env.MONGO_URI);

//         const { host, port, name } = conn.connection;
//         const rs = conn.connection?.client?.options?.replicaSet;
//         const isAtlas = process.env.MONGO_URI.includes("mongodb+srv");

//         console.log("✅ MongoDB Connected");
//         console.log(`   Host      : ${host}`);
//         console.log(`   Port      : ${port || "SRV (default 27017)"}`);
//         console.log(`   Database  : ${name}`);
//         console.log(`   Replica   : ${rs || "No replica set"}`);
//         console.log(`   Type      : ${isAtlas ? "MongoDB Atlas (Cloud)" : "Local / Self-hosted"}`);

//     } catch (error) {
//         console.error("❌ MongoDB connection failed");
//         console.error(error.message);
//         process.exit(1);
//     }
// };

// export default connectDB;
