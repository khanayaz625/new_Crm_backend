const express = require('express');
const router = express.Router();
const DataRequest = require('../models/DataRequest');
const { auth, admin } = require('../middleware/auth');

// Create a request
router.post('/', auth, async (req, res) => {
  try {
    const { quantity, message } = req.body;
    const request = new DataRequest({
      employeeId: req.user.id,
      quantity,
      college: req.body.college,
      message
    });
    await request.save();

    // Notify Admins
    const User = require('../models/User');
    const createNotification = require('../utils/notify');
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(admin._id, 'New Data Request', `${req.user.name} requested ${quantity} leads for ${req.body.college || 'any college'}.`);
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all requests (Admin) or my requests (Employee)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') query.employeeId = req.user.id;
    const requests = await DataRequest.find(query)
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update request status (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { status } = req.body;
    const request = await DataRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });

    // Notify Employee
    const createNotification = require('../utils/notify');
    await createNotification(
      request.employeeId,
      `Request ${status}`,
      `Your request for ${request.quantity} leads has been ${status.toLowerCase()}.`
    );

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
