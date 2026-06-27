const express = require('express');
const router = express.Router();
const { addComment, getComments, deleteComment, toggleCommentLike } = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware'); // Aapka existing auth middleware
router.post('/', authMiddleware, addComment);
router.get('/:postId', getComments);
router.delete('/:commentId', authMiddleware, deleteComment);
// NAYA: comment/reply like-unlike toggle
router.put('/like/:commentId', authMiddleware, toggleCommentLike);
module.exports = router;