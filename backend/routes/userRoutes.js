const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

// Multer config for profile pics
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile-${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Search users
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);
    try {
        const users = await User.find({
            username: { $regex: q.trim(), $options: 'i' }
        }).select('username profilePic').limit(10);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

// Upload profile picture
router.post('/profile-pic', authMiddleware, upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user.id, { profilePic: imageUrl });
        res.json({ profilePic: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// Update bio
router.put('/bio', authMiddleware, async (req, res) => {
    const { bio } = req.body;
    if (bio?.length > 150) return res.status(400).json({ error: "Bio max 150 characters" });
    try {
        const user = await User.findByIdAndUpdate(req.user.id, { bio }, { new: true });
        res.json({ bio: user.bio });
    } catch (err) {
        res.status(500).json({ error: "Failed to update bio" });
    }
});

// NEW: Save / Unsave post (toggle) — STATIC route, must be placed above /:username
router.put('/save/:postId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const postId = req.params.postId;

        const alreadySaved = user.savedPosts.some(id => id.toString() === postId);

        if (alreadySaved) {
            await User.findByIdAndUpdate(req.user.id, { $pull: { savedPosts: postId } });
            return res.json({ saved: false, message: "Post unsaved" });
        } else {
            await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedPosts: postId } });
            return res.json({ saved: true, message: "Post saved" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save post" });
    }
});

// NEW: Get all saved posts of logged-in user — STATIC route, place above /:username
router.get('/saved-posts', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'savedPosts',
            options: { sort: { createdAt: -1 } }
        });
        res.json(user.savedPosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch saved posts" });
    }
});

// NEW: Check save status of a specific post — STATIC route, place above /:username
router.get('/save-status/:postId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const saved = user.savedPosts.some(id => id.toString() === req.params.postId);
        res.json({ saved });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});


router.get('/:username', async (req, res) => {
    try {
        // NEW: also select _id — needed by frontend for online status check
        const user = await User.findOne({ username: req.params.username }).select('username profilePic bio _id');
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;