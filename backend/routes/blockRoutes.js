const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    blockUser,
    unblockUser,
    getBlockStatus,
    getBlockedList
} = require('../controllers/blockController');

router.get('/my-list', authMiddleware, getBlockedList);
router.get('/status/:username', authMiddleware, getBlockStatus);
router.post('/:username', authMiddleware, blockUser);
router.delete('/:username', authMiddleware, unblockUser);

module.exports = router;