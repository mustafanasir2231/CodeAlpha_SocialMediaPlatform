const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  sendFollowRequest,
  getPendingRequests,
  acceptRequest,
  declineRequest,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getFollowCounts,
  unfollowUser
} = require('../controllers/followController');

router.post('/request', authMiddleware, sendFollowRequest);
router.get('/pending', authMiddleware, getPendingRequests);
router.put('/accept/:requestId', authMiddleware, acceptRequest);
// NAYA: decline/delete route
router.delete('/decline/:requestId', authMiddleware, declineRequest);
router.get('/status/:username', authMiddleware, getFollowStatus);
router.get('/followers/:username', authMiddleware, getFollowers);
router.get('/following/:username', authMiddleware, getFollowing);
router.get('/counts/:username', authMiddleware, getFollowCounts);
router.delete('/unfollow/:username', authMiddleware, unfollowUser);

module.exports = router;