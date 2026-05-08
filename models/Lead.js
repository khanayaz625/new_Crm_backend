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

module.exports = mongoose.model('Lead', leadSchema);
