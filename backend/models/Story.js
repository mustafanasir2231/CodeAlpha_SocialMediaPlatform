const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    username: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Story ki type — text, image, ya video
    type: { type: String, enum: ['text', 'image', 'video'], required: true },

    // Image/video story ke liye media URL (text story mein khali rahega)
    mediaUrl: { type: String, default: "" },

    // Text story ka content, ya image/video story pe caption (optional)
    text: { type: String, default: "" },

    // Text story ka background color (jaise Instagram mein hota hai)
    backgroundColor: { type: String, default: "#0095f6" },

    // Privacy: 'everyone' ya 'followers'
    visibility: { type: String, enum: ['everyone', 'followers'], default: 'everyone' },

    // Kisne like ki (usernames)
    likes: { type: [String], default: [] },

    // NAYA: total comments count — har comment add hone par increment hota hai,
    // taake viewer ko sirf story object se count mil jaye, alag query na karni pade
    commentCount: { type: Number, default: 0 },

    // Kisne dekh li (username + kab dekhi) — "Seen by" list ke liye
    seenBy: {
        type: [{
            username: { type: String, required: true },
            seenAt: { type: Date, default: Date.now }
        }],
        default: []
    },

    // NAYA: 24hr baad story khud expire ho jaye — MongoDB TTL index isay automatically delete kar dega
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // abhi se 24 ghante baad
        index: { expires: 0 } // TTL index — jab Date guzar jaye, MongoDB khud document delete kar dega
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Story', storySchema);