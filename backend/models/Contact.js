const mongoose = require('mongoose');
const contactSchema = new mongoose.Schema({
    firstName: String, lastName: String, email: { type: String, required: true },
    phone: String, subject: String, message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' }
}, { timestamps: true });
module.exports = mongoose.model('Contact', contactSchema);
