const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, getUnreadMessageCount } = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/conversations', authMiddleware, getConversations);
router.get('/unread-count', authMiddleware, getUnreadMessageCount);
router.get('/:username', authMiddleware, getMessages);
router.post('/:username', authMiddleware, sendMessage);

module.exports = router;