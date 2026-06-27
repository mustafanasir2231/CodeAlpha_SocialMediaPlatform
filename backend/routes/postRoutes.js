const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Post = require('../models/Post');
const User = require('../models/User');
const { createNotification } = require('../controllers/notificationController');
const { emitToAll } = require('../utils/socket');

// ===== Multer setup: post media (images/videos) disk pe store karne ke liye =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `post-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 10
    }
});

// NAYA: Content se hashtags nikalna — #Coding, #coding123, #coding_tips sab match honge
// Lowercase store karte hain taake #Coding aur #coding same hashtag count hon
const extractHashtags = (text) => {
    if (!text) return [];
    const matches = text.match(/#(\w+)/g) || [];
    const tags = matches.map(tag => tag.slice(1).toLowerCase());
    return [...new Set(tags)]; // duplicates hata do
};

// Create post — text + media
router.post('/create', upload.array('media', 10), async (req, res) => {
    try {
        const { username, content } = req.body;

        const hasMedia = req.files && req.files.length > 0;
        if (!content?.trim() && !hasMedia) {
            return res.status(400).json({ error: "Post must have text or media" });
        }

        const media = hasMedia
            ? req.files.map(file => ({
                url: `http://localhost:5000/uploads/${file.filename}`,
                type: file.mimetype.startsWith('video/') ? 'video' : 'image'
            }))
            : [];

        // NAYA: hashtags extract karke save karo
        const hashtags = extractHashtags(content);

        const newPost = new Post({ username, content: content || "", media, hashtags });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Delete post
router.delete('/delete/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) return res.status(404).json({ error: "Post not found" });

        if (post.username !== username) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own posts." });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Post successfully deleted" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting the post" });
    }
});

// Get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Static routes — hamesha /:id se UPAR

router.get('/my-posts', async (req, res) => {
    try {
        const { username } = req.query;
        const posts = await Post.find({ username }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// NAYA: Trending hashtags — sabse zyada use hone wale top 8 hashtags (count ke sath)
// Static route hai, /:id se UPAR hona ZAROORI hai
router.get('/trending-hashtags', async (req, res) => {
    try {
        const trending = await Post.aggregate([
            { $unwind: '$hashtags' },
            { $group: { _id: '$hashtags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);
        // _id ko "tag" naam de do — frontend ke liye cleaner
        res.json(trending.map(t => ({ tag: t._id, count: t.count })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch trending hashtags" });
    }
});

// NAYA: Kisi specific hashtag wali sab posts — static route, /:id se UPAR
router.get('/hashtag/:tag', async (req, res) => {
    try {
        const tag = req.params.tag.toLowerCase();
        const posts = await Post.find({ hashtags: tag }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch hashtag posts" });
    }
});

// Edit post — sirf text update, media same rahegi
router.put('/edit/:id', async (req, res) => {
    try {
        const { username, content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ error: "Content cannot be empty" });
        }

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        // Security: sirf apni post edit kar sako
        if (post.username !== username) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        post.content = content.trim();
        post.edited = true;
        // NAYA: edit ke baad hashtags dobara extract karo (naye add/remove ho sakte hain)
        post.hashtags = extractHashtags(content);
        await post.save();

        // Real-time: sabko batao
        emitToAll('post-edited', post);

        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to edit post" });
    }
});

// Like / Unlike post
router.put('/like/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) return res.status(404).json({ error: "Post not found" });

        const alreadyLiked = post.likes.includes(username);

        if (!alreadyLiked) {
            await post.updateOne({ $push: { likes: username } });

            try {
                const liker = await User.findOne({ username });
                const postOwner = await User.findOne({ username: post.username });
                if (liker && postOwner) {
                    await createNotification({
                        recipientId: postOwner._id,
                        senderId: liker._id,
                        senderUsername: liker.username,
                        type: 'like',
                        postId: post._id
                    });
                }
            } catch (notifErr) {
                console.error("Like notification error:", notifErr);
            }
        } else {
            await post.updateOne({ $pull: { likes: username } });
        }

        const updatedPost = await Post.findById(req.params.id);
        res.json(updatedPost);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get single post by ID — sab se neeche (wildcard)
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch post" });
    }
});

module.exports = router;