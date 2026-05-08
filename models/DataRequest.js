const mongoose = require('mongoose');

const dataRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, required: true },
  college: { type: String },
  message: { type: String },
  status: { type: String, enum: ['Pending', 'Fulfilled', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DataRequest', dataRequestSchema);
