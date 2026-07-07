const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const {
    createStory,
    getStoriesFeed,
    getMyStories,
    viewStory,
    toggleStoryLike,
    editStory,
    deleteStory,
    getSeenBy,
    addStoryComment,
    getStoryComments
} = require('../controllers/storyController');

// Multer setup — story media (images/videos), using the same uploads folder as posts
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `story-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
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
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB, same as posts
});

// ===== Static routes — always place above /:id routes =====

// Create story (text/image/video) — multer.single is optional (no file for text story)
router.post('/create', authMiddleware, upload.single('media'), createStory);

// All visible stories, grouped by user (for the feed)
router.get('/feed', authMiddleware, getStoriesFeed);

// My stories (for the My Story section)
router.get('/my-stories', authMiddleware, getMyStories);

// ===== Dynamic /:id routes =====

router.get('/:id', authMiddleware, viewStory); // view + mark as seen
router.put('/like/:id', authMiddleware, toggleStoryLike);
router.put('/edit/:id', authMiddleware, editStory);
router.delete('/:id', authMiddleware, deleteStory);
router.get('/:id/seen-by', authMiddleware, getSeenBy);

router.post('/:id/comment', authMiddleware, addStoryComment);
router.get('/:id/comments', authMiddleware, getStoryComments);

module.exports = router;