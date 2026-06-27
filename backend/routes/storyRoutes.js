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

// Multer setup — story media (images/videos), same uploads folder jo posts use karta hai
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
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB, posts jaisa
});

// ===== Static routes — hamesha /:id wale routes se UPAR =====

// Create story (text/image/video) — multer.single optional hai (text story ke liye file nahi aati)
router.post('/create', authMiddleware, upload.single('media'), createStory);

// Sab visible stories, grouped by user (feed ke liye)
router.get('/feed', authMiddleware, getStoriesFeed);

// Apni stories (My Story section ke liye)
router.get('/my-stories', authMiddleware, getMyStories);

// ===== Dynamic /:id routes =====

router.get('/:id', authMiddleware, viewStory); // view + seen mark
router.put('/like/:id', authMiddleware, toggleStoryLike);
router.put('/edit/:id', authMiddleware, editStory);
router.delete('/:id', authMiddleware, deleteStory);
router.get('/:id/seen-by', authMiddleware, getSeenBy);

router.post('/:id/comment', authMiddleware, addStoryComment);
router.get('/:id/comments', authMiddleware, getStoryComments);

module.exports = router;