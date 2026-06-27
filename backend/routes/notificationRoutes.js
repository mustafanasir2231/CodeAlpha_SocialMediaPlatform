const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markAllRead } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.put('/mark-read', authMiddleware, markAllRead);

module.exports = router;