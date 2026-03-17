import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * protect – Verify JWT and attach req.user.
 * Returns 401 JSON on any failure; never throws.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1].trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    return next();
  } catch (error) {
    console.error(`[Auth] Token verification failed – ${error.message}`);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * admin – Allow only admin users through.
 */
const admin = (req, res, next) => {
  if (req.user?.isAdmin) return next();
  return res.status(403).json({ message: "Not authorized as an admin" });
};

export { protect, admin };
