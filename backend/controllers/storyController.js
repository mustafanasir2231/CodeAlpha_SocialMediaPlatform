const Story = require('../models/Story');
const StoryComment = require('../models/StoryComment');
const FollowRequest = require('../models/FollowRequest');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { emitToUser } = require('../utils/socket');

// Helper: checks whether viewerId is a follower of ownerId (accepted status)
const isFollowerOf = async (viewerId, ownerId) => {
    if (viewerId.toString() === ownerId.toString()) return true; // own story
    const rel = await FollowRequest.findOne({
        requester: viewerId,
        recipient: ownerId,
        status: 'accepted'
    });
    return !!rel;
};

// 1. Create story (text / image / video)
exports.createStory = async (req, res) => {
    try {
        const { type, text, backgroundColor, visibility } = req.body;

        if (!type || !['text', 'image', 'video'].includes(type)) {
            return res.status(400).json({ error: "Valid story type required (text, image, video)" });
        }

        let mediaUrl = "";
        if (type === 'image' || type === 'video') {
            if (!req.file) return res.status(400).json({ error: "Media file required for image/video story" });
            mediaUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        } else {
            // Text story — text content is required
            if (!text?.trim()) return res.status(400).json({ error: "Text content required for text story" });
        }

        const newStory = new Story({
            username: req.user.username,
            userId: req.user.id,
            type,
            mediaUrl,
            text: text || "",
            backgroundColor: backgroundColor || "#0095f6",
            visibility: visibility === 'followers' ? 'followers' : 'everyone'
        });

        await newStory.save();
        res.status(201).json(newStory);
    } catch (err) {
        console.error("Create Story Error:", err);
        res.status(500).json({ error: "Failed to create story" });
    }
};

// 2. For feed — all active (non-expired, TTL handles itself) stories,

exports.getStoriesFeed = async (req, res) => {
    try {
        const myId = req.user.id;
        const allStories = await Story.find().sort({ createdAt: -1 });

        // Privacy filter — check for each story whether I can view it
        const visibleStories = [];
        for (const story of allStories) {
            if (story.visibility === 'everyone') {
                visibleStories.push(story);
            } else {
                // 'followers' visibility — only the owner's followers (or the owner themselves) can view
                const allowed = await isFollowerOf(myId, story.userId);
                if (allowed) visibleStories.push(story);
            }
        }

        const grouped = {};
        visibleStories.forEach(story => {
            if (!grouped[story.username]) {
                grouped[story.username] = {
                    username: story.username,
                    userId: story.userId,
                    stories: []
                };
            }
            grouped[story.username].stories.push(story);
        });

        // Sort stories in each group from oldest to newest (for viewer sequence)
        const result = Object.values(grouped).map(g => ({
            ...g,
            stories: g.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        }));

        res.json(result);
    } catch (err) {
        console.error("Get Stories Feed Error:", err);
        res.status(500).json({ error: "Failed to fetch stories" });
    }
};

// 3. My stories — for ProfilePage or 'My Story'
exports.getMyStories = async (req, res) => {
    try {
        const stories = await Story.find({ userId: req.user.id }).sort({ createdAt: 1 });
        res.json(stories);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your stories" });
    }
};

// 4. View a single story — also mark it as 'seen' (if viewer is not the owner)
exports.viewStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found (may have expired)" });

        // Privacy check
        if (story.visibility === 'followers') {
            const allowed = await isFollowerOf(req.user.id, story.userId);
            if (!allowed) return res.status(403).json({ error: "This story is only visible to followers" });
        }

        // Mark as seen — only if viewer is not the owner and not already in the list
        const myUsername = req.user.username;
        const alreadySeen = story.seenBy.some(s => s.username === myUsername);
        if (story.username !== myUsername && !alreadySeen) {
            story.seenBy.push({ username: myUsername, seenAt: new Date() });
            await story.save();

            // Real-time: notify the owner that someone viewed it 
            emitToUser(story.userId.toString(), 'story-seen', {
                storyId: story._id.toString(),
                viewerUsername: myUsername
            });
        }

        res.json(story);
    } catch (err) {
        console.error("View Story Error:", err);
        res.status(500).json({ error: "Failed to load story" });
    }
};

// 5. Toggle like/unlike on story
exports.toggleStoryLike = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found" });

        const username = req.user.username;
        const alreadyLiked = story.likes.includes(username);

        if (alreadyLiked) {
            await story.updateOne({ $pull: { likes: username } });
        } else {
            await story.updateOne({ $push: { likes: username } });

            try {
                await createNotification({
                    recipientId: story.userId,
                    senderId: req.user.id,
                    senderUsername: username,
                    type: 'story_like',
                    storyId: story._id
                });
            } catch (notifErr) {
                console.error("Story like notification error:", notifErr);
            }
        }

        const updated = await Story.findById(req.params.id);
        res.json(updated);
    } catch (err) {
        console.error("Toggle Story Like Error:", err);
        res.status(500).json({ error: "Failed to like/unlike story" });
    }
};

// 6. Edit story — ONLY text story 
exports.editStory = async (req, res) => {
    try {
        const { text, backgroundColor } = req.body;
        const story = await Story.findById(req.params.id);

        if (!story) return res.status(404).json({ error: "Story not found" });
        if (story.username !== req.user.username) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        if (story.type !== 'text') {
            return res.status(400).json({ error: "Only text stories can be edited" });
        }
        if (!text?.trim()) {
            return res.status(400).json({ error: "Text content required" });
        }

        story.text = text.trim();
        if (backgroundColor) story.backgroundColor = backgroundColor;
        await story.save();

        res.json(story);
    } catch (err) {
        console.error("Edit Story Error:", err);
        res.status(500).json({ error: "Failed to edit story" });
    }
};

// 7. Delete story
exports.deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found" });

        if (story.username !== req.user.username) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own story" });
        }

        await Story.findByIdAndDelete(req.params.id);
        // Also delete the story's comments
        await StoryComment.deleteMany({ storyId: req.params.id });

        res.json({ message: "Story deleted successfully" });
    } catch (err) {
        console.error("Delete Story Error:", err);
        res.status(500).json({ error: "Failed to delete story" });
    }
};

// 8. "Seen by" list — who viewed your story (only owner can see)
exports.getSeenBy = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found" });

        if (story.username !== req.user.username) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // FIX: seenBy is now an array of {username, seenAt} objects
        const usernames = story.seenBy.map(s => s.username);
        const users = await User.find({ username: { $in: usernames } }).select('username profilePic');

        // Attach each user's seenAt time
        const viewers = users.map(u => {
            const seenEntry = story.seenBy.find(s => s.username === u.username);
            return {
                _id: u._id,
                username: u.username,
                profilePic: u.profilePic,
                seenAt: seenEntry?.seenAt || null
            };
        });

        // Latest viewers first
        viewers.sort((a, b) => new Date(b.seenAt) - new Date(a.seenAt));

        res.json(viewers);
    } catch (err) {
        console.error("Get Seen By Error:", err);
        res.status(500).json({ error: "Failed to fetch viewers" });
    }
};

// ===== Story Comments =====

// 9. Add comment to story (public thread)
exports.addStoryComment = async (req, res) => {
    try {
        const { text } = req.body;
        const story = await Story.findById(req.params.id);

        if (!story) return res.status(404).json({ error: "Story not found" });
        if (!text?.trim()) return res.status(400).json({ error: "Comment text required" });

        // Privacy check — if story is followers-only, the commenter must also be a follower
        if (story.visibility === 'followers') {
            const allowed = await isFollowerOf(req.user.id, story.userId);
            if (!allowed) return res.status(403).json({ error: "You can't comment on this story" });
        }

        const comment = await StoryComment.create({
            storyId: story._id,
            userId: req.user.id,
            username: req.user.username,
            text: text.trim()
        });

        // NEW: increment comment count in story document — so frontend doesn't need a separate fetch
        await Story.findByIdAndUpdate(story._id, { $inc: { commentCount: 1 } });

        try {
            await createNotification({
                recipientId: story.userId,
                senderId: req.user.id,
                senderUsername: req.user.username,
                type: 'story_comment',
                storyId: story._id
            });
        } catch (notifErr) {
            console.error("Story comment notification error:", notifErr);
        }

        res.status(201).json({ comment, commentCount: story.commentCount + 1 });
    } catch (err) {
        console.error("Add Story Comment Error:", err);
        res.status(500).json({ error: "Failed to add comment" });
    }
};

// 10. Fetch comments for a story
exports.getStoryComments = async (req, res) => {
    try {
        const comments = await StoryComment.find({ storyId: req.params.id }).sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch comments" });
    }
};

module.exports = exports;