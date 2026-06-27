const express = require('express');
const router = express.Router();
const {
  sendFollowRequest,
  getPendingRequests,
  acceptRequest,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getFollowCounts,
  unfollowUser
} = require('../controllers/followController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request', authMiddleware, sendFollowRequest);
router.get('/pending', authMiddleware, getPendingRequests);
router.put('/accept/:requestId', authMiddleware, acceptRequest);
router.get('/status/:username', authMiddleware, getFollowStatus);
router.get('/followers/:username', authMiddleware, getFollowers);
router.get('/following/:username', authMiddleware, getFollowing);
router.get('/counts/:username', authMiddleware, getFollowCounts);
router.delete('/unfollow/:username', authMiddleware, unfollowUser); // NAYA

module.exports = router;