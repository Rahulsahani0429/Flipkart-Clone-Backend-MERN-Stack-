import Cart from '../models/Cart.js';

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        res.json(cart.items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update/Sync user's cart
 * @route   POST /api/cart
 * @access  Private
 */
export const syncCart = async (req, res) => {
    try {
        const { items } = req.body;
        let cart = await Cart.findOne({ user: req.user._id });

        if (cart) {
            cart.items = items;
            await cart.save();
        } else {
            cart = await Cart.create({
                user: req.user._id,
                items,
            });
        }

        res.json(cart.items);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Clear user's cart
 * @route   DELETE /api/cart
 * @access  Private
 */
export const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });

        if (cart) {
            cart.items = [];
            await cart.save();
        }

        res.json({ message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
