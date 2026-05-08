const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, admin } = require('../middleware/auth');

// Get all employees (Admins only)
router.get('/employees', [auth, admin], async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).select('-password');
    console.log('Found employees:', employees.length);
    res.json(employees);
  } catch (err) {
    console.error('FETCH EMPLOYEES ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get employee productivity stats (Admin only)
router.get('/productivity', [auth, admin], async (req, res) => {
  try {
    const CallLog = require('../models/CallLog');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await CallLog.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { 
        $group: { 
          _id: "$employeeId", 
          followUps: { $sum: 1 },
          lastInteraction: { $max: "$createdAt" }
        } 
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "employee"
        }
      },
      { $unwind: "$employee" },
      {
        $project: {
          name: "$employee.name",
          followUps: 1,
          lastInteraction: 1
        }
      }
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a user (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Safety: Don't allow deleting admins via this route
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin accounts' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
