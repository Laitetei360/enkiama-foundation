const mongoose = require('mongoose');
const storySchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { name: String, email: String, location: String },
    category: { type: String, enum: ['education', 'technology', 'heritage', 'women', 'community'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    views: { type: Number, default: 0 }, likes: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Story', storySchema);
