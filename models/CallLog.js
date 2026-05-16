const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, required: true }, // The status selected during the call
  remark: { type: String },
  duration: { type: String, default: '00:00' },
  createdAt: { type: Date, default: Date.now }
});

// Optimization: Indexes for faster search and filtering
callLogSchema.index({ leadId: 1 });
callLogSchema.index({ employeeId: 1 });
callLogSchema.index({ status: 1 });
callLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
