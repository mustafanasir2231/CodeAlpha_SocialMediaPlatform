const Story = require('../models/Story');
const StoryComment = require('../models/StoryComment');
const FollowRequest = require('../models/FollowRequest');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { emitToUser } = require('../utils/socket');

// Helper: check karta hai ke viewerId, ownerId ka follower hai ya nahi (accepted status)
const isFollowerOf = async (viewerId, ownerId) => {
    if (viewerId.toString() === ownerId.toString()) return true; // apni hi story
    const rel = await FollowRequest.findOne({
        requester: viewerId,
        recipient: ownerId,
        status: 'accepted'
    });
    return !!rel;
};

// 1. Story create karna (text / image / video)
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
            // Text story — text content zaroori hai
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

// 2. Feed ke liye — sab active (non-expired, TTL khud handle karta hai) stories,
// grouped by user, sirf jo dekhne ka haq rakhta ho (privacy check)
exports.getStoriesFeed = async (req, res) => {
    try {
        const myId = req.user.id;
        const allStories = await Story.find().sort({ createdAt: -1 });

        // Privacy filter — har story ke liye check karo ke main dekh sakta hoon ya nahi
        const visibleStories = [];
        for (const story of allStories) {
            if (story.visibility === 'everyone') {
                visibleStories.push(story);
            } else {
                // 'followers' visibility — sirf owner ke followers (ya khud owner) dekh sakte hain
                const allowed = await isFollowerOf(myId, story.userId);
                if (allowed) visibleStories.push(story);
            }
        }

        // Username ke hisab se group karo — taake frontend ek avatar circle ke peeche
        // us user ki saari stories rakh sake
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

        // Har group mein stories ko purani→nayi order mein rakho (viewer sequence ke liye)
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

// 3. Apni stories — ProfilePage ya "My Story" ke liye
exports.getMyStories = async (req, res) => {
    try {
        const stories = await Story.find({ userId: req.user.id }).sort({ createdAt: 1 });
        res.json(stories);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your stories" });
    }
};

// 4. Single story dekhna — saath mein "seen" mark karna (agar owner khud nahi hai)
exports.viewStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found (may have expired)" });

        // Privacy check
        if (story.visibility === 'followers') {
            const allowed = await isFollowerOf(req.user.id, story.userId);
            if (!allowed) return res.status(403).json({ error: "This story is only visible to followers" });
        }

        // Seen mark karo — sirf jab dekhne wala owner na ho, aur pehle se list mein na ho
        const myUsername = req.user.username;
        const alreadySeen = story.seenBy.some(s => s.username === myUsername);
        if (story.username !== myUsername && !alreadySeen) {
            story.seenBy.push({ username: myUsername, seenAt: new Date() });
            await story.save();

            // Real-time: owner ko batao ke kisi ne dekh li (uska "seen by" list refresh ho sake)
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

// 5. Story ko Like/Unlike karna (toggle)
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

// 6. Story ko Edit karna — SIRF text story (caption/background change)
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

// 7. Story Delete karna
exports.deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found" });

        if (story.username !== req.user.username) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own story" });
        }

        await Story.findByIdAndDelete(req.params.id);
        // Saath mein us story ke comments bhi clean kar do
        await StoryComment.deleteMany({ storyId: req.params.id });

        res.json({ message: "Story deleted successfully" });
    } catch (err) {
        console.error("Delete Story Error:", err);
        res.status(500).json({ error: "Failed to delete story" });
    }
};

// 8. "Seen by" list — apni story pe kisne dekha (sirf owner dekh sakta hai)
exports.getSeenBy = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ error: "Story not found" });

        if (story.username !== req.user.username) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // FIX: seenBy ab {username, seenAt} objects ka array hai (pehle sirf strings the,
        // isliye seen time track nahi ho raha tha)
        const usernames = story.seenBy.map(s => s.username);
        const users = await User.find({ username: { $in: usernames } }).select('username profilePic');

        // Har user ke sath uska seenAt time jod do
        const viewers = users.map(u => {
            const seenEntry = story.seenBy.find(s => s.username === u.username);
            return {
                _id: u._id,
                username: u.username,
                profilePic: u.profilePic,
                seenAt: seenEntry?.seenAt || null
            };
        });

        // Latest dekhne walay pehle
        viewers.sort((a, b) => new Date(b.seenAt) - new Date(a.seenAt));

        res.json(viewers);
    } catch (err) {
        console.error("Get Seen By Error:", err);
        res.status(500).json({ error: "Failed to fetch viewers" });
    }
};

// ===== Story Comments =====

// 9. Story pe comment add karna (public thread)
exports.addStoryComment = async (req, res) => {
    try {
        const { text } = req.body;
        const story = await Story.findById(req.params.id);

        if (!story) return res.status(404).json({ error: "Story not found" });
        if (!text?.trim()) return res.status(400).json({ error: "Comment text required" });

        // Privacy check — agar followers-only story hai to comment karne walay ko bhi follower hona chahiye
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

        // NAYA: story document mein comment count badhao — frontend ko alag fetch nahi karna padega
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

// 10. Story ke comments fetch karna
exports.getStoryComments = async (req, res) => {
    try {
        const comments = await StoryComment.find({ storyId: req.params.id }).sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch comments" });
    }
};

module.exports = exports;