const mongoose = require('mongoose');
const applicationSchema = new mongoose.Schema({
    type: { type: String, enum: ['volunteer', 'partnership', 'program'], required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    motivation: String, organization: String, partnershipType: String,
    status: { type: String, enum: ['pending', 'reviewed', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('Application', applicationSchema);
