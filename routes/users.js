const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, admin } = require('../middleware/auth');

// Delete a user (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    console.log(`DELETE REQUEST: Admin ${req.user.id} trying to delete User ${req.params.id}`);
    
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log('Delete Failed: User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Safety: Don't allow deleting admins via this route
    if (user.role === 'admin') {
      console.log('Delete Failed: Cannot delete admin');
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }

    user.isActive = false;
    await user.save();
    console.log('Delete (Deactivate) Success');
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    console.error('DELETE ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all employees (Admins only)
router.get('/employees', [auth, admin], async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee', isActive: true }).select('-password');
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

// Update an employee (Admin only)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase().trim();
    if (password) user.password = password;

    await user.save();
    res.json({ message: 'Profile updated successfully', user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
