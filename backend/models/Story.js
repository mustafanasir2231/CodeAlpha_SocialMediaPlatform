const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    username: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Story type — text, image, or video
    type: { type: String, enum: ['text', 'image', 'video'], required: true },

    // Media URL for image/video story (will be empty for text story)
    mediaUrl: { type: String, default: "" },

    // Text story content, or caption for image/video story (optional)
    text: { type: String, default: "" },

    // Text story background color (like on Instagram)
    backgroundColor: { type: String, default: "#0095f6" },

    // Privacy: 'everyone' or 'followers'
    visibility: { type: String, enum: ['everyone', 'followers'], default: 'everyone' },

    // Who liked it (usernames)
    likes: { type: [String], default: [] },

    //  total comments count — incremented each time a comment is added,
    commentCount: { type: Number, default: 0 },

    // Who viewed it (username + when viewed) — for the "Seen by" list
    seenBy: {
        type: [{
            username: { type: String, required: true },
            seenAt: { type: Date, default: Date.now }
        }],
        default: []
    },

    // NEW: story automatically expires after 24 hours — MongoDB TTL index will auto-delete it
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        index: { expires: 0 } // TTL index — MongoDB will auto-delete the document once this date passes
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Story', storySchema);