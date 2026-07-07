const express = require('express');
const router = express.Router();
const { addComment, getComments, deleteComment, toggleCommentLike } = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware'); 
router.post('/', authMiddleware, addComment);
router.get('/:postId', getComments);
router.delete('/:commentId', authMiddleware, deleteComment);
router.put('/like/:commentId', authMiddleware, toggleCommentLike);
module.exports = router;