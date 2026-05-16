const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  course: { type: String },
  college: { type: String },
  status: { 
    type: String, 
    enum: [
      'New', 'Contacted', 'Interested', 'Not Interested', 'Busy', 
      'Callback', 'Wrong Number', 'Switch Off', 'Not Reachable', 
      'Missed', 'Follow Up', 'Meeting Scheduled', 'Qualified', 'Lost', 'Won', 'Archive'
    ], 
    default: 'New' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: [{
    text: String,
    date: { type: Date, default: Date.now }
  }],
  source: { type: String, default: 'Imported' },
  createdAt: { type: Date, default: Date.now }
});

// Optimization: Indexes for faster search and filtering
leadSchema.index({ name: 'text', phone: 'text' }); // Text index for search
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ course: 1 });
leadSchema.index({ college: 1 });

module.exports = mongoose.model('Lead', leadSchema);
