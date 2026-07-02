const mongoose = require('mongoose');
const donationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'KES', 'EUR', 'GBP'], default: 'USD' },
    paymentMethod: { type: String, enum: ['mpesa', 'paypal', 'wise', 'card', 'bank'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    anonymous: { type: Boolean, default: false },
    receiptNumber: String
}, { timestamps: true });
module.exports = mongoose.model('Donation', donationSchema);
