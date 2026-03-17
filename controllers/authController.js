// import User from '../models/User.js';
// import generateToken from '../utils/generateToken.js';

// // @desc    Auth user & get token
// // @route   POST /api/auth/login
// // @access  Public
// const loginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });

//         if (user && (await user.matchPassword(password))) {
//             res.json({
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 isAdmin: user.isAdmin,
//                 token: generateToken(user._id),
//             });
//         } else {
//             res.status(401).json({ message: 'Invalid email or password' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Register a new user
// // @route   POST /api/auth/register
// // @access  Public
// const registerUser = async (req, res) => {
//     try {
//         const { name, email, password } = req.body;

//         const userExists = await User.findOne({ email });

//         if (userExists) {
//             res.status(400).json({ message: 'User already exists' });
//             return;
//         }

//         const user = await User.create({
//             name,
//             email,
//             password,
//         });

//         if (user) {
//             res.status(201).json({
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 isAdmin: user.isAdmin,
//                 token: generateToken(user._id),
//             });
//         } else {
//             res.status(400).json({ message: 'Invalid user data' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Get user profile
// // @route   GET /api/auth/profile
// // @access  Private
// const getUserProfile = async (req, res) => {
//     try {
//         const user = await User.findById(req.user._id);

//         if (user) {
//             res.json({
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 isAdmin: user.isAdmin,
//             });
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Update user profile
// // @route   PUT /api/auth/profile
// // @access  Private
// const updateUserProfile = async (req, res) => {
//     try {
//         const user = await User.findById(req.user._id);

//         if (user) {
//             user.name = req.body.name || user.name;
//             user.email = req.body.email || user.email;
//             if (req.body.password) {
//                 user.password = req.body.password;
//             }

//             const updatedUser = await user.save();

//             res.json({
//                 _id: updatedUser._id,
//                 name: updatedUser.name,
//                 email: updatedUser.email,
//                 isAdmin: updatedUser.isAdmin,
//                 token: generateToken(updatedUser._id),
//             });
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Get all users
// // @route   GET /api/auth
// // @access  Private/Admin
// const getUsers = async (req, res) => {
//     try {
//         const users = await User.find({});
//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Delete user
// // @route   DELETE /api/auth/:id
// // @access  Private/Admin
// const deleteUser = async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id);

//         if (user) {
//             await user.deleteOne();
//             res.json({ message: 'User removed' });
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Get user by ID
// // @route   GET /api/auth/:id
// // @access  Private/Admin
// const getUserById = async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id).select('-password');

//         if (user) {
//             res.json(user);
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Update user
// // @route   PUT /api/auth/:id
// // @access  Private/Admin
// const updateUser = async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id);

//         if (user) {
//             user.name = req.body.name || user.name;
//             user.email = req.body.email || user.email;
//             user.isAdmin = req.body.isAdmin;

//             const updatedUser = await user.save();

//             res.json({
//                 _id: updatedUser._id,
//                 name: updatedUser.name,
//                 email: updatedUser.email,
//                 isAdmin: updatedUser.isAdmin,
//             });
//         } else {
//             res.status(404).json({ message: 'User not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// export {
//     loginUser,
//     registerUser,
//     getUserProfile,
//     updateUserProfile,
//     getUsers,
//     deleteUser,
//     getUserById,
//     updateUser,
// };

import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    let { name, email, password, isAdmin } = req.body;
    isAdmin = isAdmin === true || isAdmin === "true"; // Default to false if not provided or not explicitly true

    // 1️⃣ Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name,  email and password are required gi",
      });
    }

    // 2️⃣ Normalize data
    name = name.trim();
    email = email.toLowerCase().trim();

    // 3️⃣ Check existing user
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // 4️⃣ Create user
    const user = await User.create({
      name,
      email,
      password,
      isAdmin,
    });

    // 5️⃣ Response
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
      },
      token: generateToken(user._id, user.isAdmin),
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2️⃣ Normalize email
    email = email.toLowerCase().trim();

    // 3️⃣ Find user
    const user = await User.findOne({ email });

    // 4️⃣ Validate credentials
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 5️⃣ Response
    return res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
      },
      token: generateToken(user._id, user.isAdmin),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get logged-in user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update logged-in user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name?.trim() || user.name;
    user.email = req.body.email?.toLowerCase().trim() || user.email;

    if (req.file) {
      // Normalizing the path for consistent front-end rendering
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        avatar: updatedUser.avatar,
      },
      token: generateToken(updatedUser._id, updatedUser.isAdmin),
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/auth
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    return res.status(200).json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/auth/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Get User By ID Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update user (Admin)
 * @route   PUT /api/auth/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name?.trim() || user.name;
    user.email = req.body.email?.toLowerCase().trim() || user.email;
    user.isAdmin =
      req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

    const updatedUser = await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } catch (error) {
    console.error("Admin Update Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/auth/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
